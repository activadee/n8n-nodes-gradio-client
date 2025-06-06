import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	NodeConnectionType,
} from 'n8n-workflow';

interface GradioFileData {
	path: string;
	meta: { _type: string };
	orig_name: string;
	size: number;
	mime_type: string;
}

interface GradioApiResponse {
	event_id: string;
}

interface GradioEventData {
	data?: any[];
	error?: string;
	is_generating?: boolean;
}

// Helper functions (static)
function generateSessionHash(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let hash = '';
	for (let i = 0; i < 11; i++) {
		hash += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return hash;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanUrl(url: string): string {
	url = url.trim();
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = 'https://' + url;
	}
	// Remove trailing slash
	return url.replace(/\/$/, '');
}

async function convertToGradioFile(
	executeFunctions: IExecuteFunctions,
	propertyName: string,
	filename: string,
): Promise<GradioFileData> {
	const buffer = await executeFunctions.helpers.getBinaryDataBuffer(0, propertyName);
	
	return {
		path: filename,
		meta: { _type: 'gradio.FileData' },
		orig_name: filename,
		size: buffer.length,
		mime_type: 'application/octet-stream',
	};
}

async function pollForResults(
	executeFunctions: IExecuteFunctions,
	url: string,
	eventId: string,
	timeout: number,
	headers: IDataObject,
): Promise<any> {
	const startTime = Date.now();
	let pollInterval = 1000; // Start with 1 second
	const maxPollInterval = 5000; // Max 5 seconds
	
	while ((Date.now() - startTime) < timeout * 1000) {
		try {
			console.log('Polling GET request to:', `${url}/${eventId}`);
			console.log('Polling headers:', JSON.stringify(headers));
			
			const response = await executeFunctions.helpers.httpRequest({
				method: 'GET',
				url: `${url}/${eventId}`,
				headers,
				returnFullResponse: true,
			});

			if (response.statusCode === 200 && response.body) {
				// Parse streaming response
				const lines = response.body.split('\n').filter((line: string) => line.trim());
				
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6)) as GradioEventData;
							
							if (data.error) {
								throw new NodeOperationError(executeFunctions.getNode(), data.error);
							}
							
							if (data.data !== undefined && !data.is_generating) {
								return data.data;
							}
						} catch (parseError) {
							// Continue to next line if parse fails
						}
					}
				}
			}
		} catch (error) {
			// Continue polling on error
		}
		
		await sleep(pollInterval);
		// Exponential backoff
		pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
	}
	
	throw new NodeOperationError(
		executeFunctions.getNode(),
		`Timeout waiting for Gradio response after ${timeout} seconds`,
	);
}

export class GradioClient implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gradio Client',
		name: 'gradioClient',
		icon: 'file:gradio.svg',
		group: ['transform'],
		version: 1,
		description: 'Connect to Gradio Spaces and call their API functions',
		defaults: {
			name: 'Gradio Client',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'huggingFaceApi',
				required: false,
				displayOptions: {
					show: {
						authentication: ['huggingface'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Call Function',
						value: 'callFunction',
						description: 'Call a Gradio Space API function',
					},
					{
						name: 'Get Space Info',
						value: 'getSpaceInfo',
						description: 'Get information about a Gradio Space',
					},
				],
				default: 'callFunction',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'Public space - no authentication needed',
					},
					{
						name: 'HuggingFace API',
						value: 'huggingface',
						description: 'Private space - requires HuggingFace authentication',
					},
				],
				default: 'none',
				required: true,
				noDataExpression: true,
				description: 'Choose authentication method',
			},
			{
				displayName: 'Space URL',
				name: 'spaceUrl',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://username-spacename.hf.space',
				description: 'Full URL of the Gradio Space',
			},
			{
				displayName: 'API Name',
				name: 'apiName',
				type: 'string',
				default: '/predict',
				required: true,
				displayOptions: {
					show: {
						operation: ['callFunction'],
					},
				},
				placeholder: '/predict',
				description: 'The function endpoint to call (e.g., /predict, /generate_speech)',
			},
			{
				displayName: 'Input Parameters',
				name: 'inputParameters',
				type: 'json',
				default: '[]',
				required: true,
				displayOptions: {
					show: {
						operation: ['callFunction'],
					},
				},
				placeholder: '["Hello world", 42, true] or {"text": "Hello", "value": 42}',
				description: 'JSON array of parameters or JSON object to pass to the function',
			},
			{
				displayName: 'File Upload Options',
				name: 'fileOptions',
				type: 'collection',
				placeholder: 'Add File Upload',
				default: {},
				displayOptions: {
					show: {
						operation: ['callFunction'],
					},
				},
				options: [
					{
						displayName: 'Enable File Upload',
						name: 'enableFileUpload',
						type: 'boolean',
						default: false,
						description: 'Whether to upload a file as one of the parameters',
					},
					{
						displayName: 'Parameter Index',
						name: 'parameterIndex',
						type: 'number',
						default: 0,
						displayOptions: {
							show: {
								enableFileUpload: [true],
							},
						},
						description: 'Which parameter index should be replaced with the file (0-based)',
					},
					{
						displayName: 'File Property Name',
						name: 'filePropertyName',
						type: 'string',
						default: 'data',
						displayOptions: {
							show: {
								enableFileUpload: [true],
							},
						},
						description: 'Name of the binary property containing the file',
					},
					{
						displayName: 'Filename',
						name: 'filename',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								enableFileUpload: [true],
							},
						},
						placeholder: 'Leave empty to use original filename',
						description: 'Name to use when uploading the file',
					},
				],
			},
			{
				displayName: 'Advanced Options',
				name: 'advancedOptions',
				type: 'collection',
				placeholder: 'Add Advanced Option',
				default: {},
				options: [
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 120,
						description: 'Maximum wait time in seconds',
					},
					{
						displayName: 'Session Hash',
						name: 'sessionHash',
						type: 'string',
						default: '',
						placeholder: 'Leave empty to generate automatically',
						description: 'Session identifier for the API call',
					},
					{
						displayName: 'Return Full Response',
						name: 'returnFullResponse',
						type: 'boolean',
						default: false,
						description: 'Whether to return the complete response or just the data',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const spaceUrl = this.getNodeParameter('spaceUrl', i) as string;
				const authentication = this.getNodeParameter('authentication', i) as string;
				const requiresAuth = authentication === 'huggingface';
				const cleanedUrl = cleanUrl(spaceUrl);

				// Set up headers
				const headers: IDataObject = {
					'Content-Type': 'application/json',
				};

				if (requiresAuth) {
					const credentials = await this.getCredentials('huggingFaceApi');
					if (!credentials || !credentials.apiKey) {
						throw new NodeOperationError(
							this.getNode(),
							'HuggingFace API credentials not found or invalid',
						);
					}
					const apiKey = credentials.apiKey as string;
					console.log('HuggingFace API Key present:', !!apiKey);
					console.log('API Key starts with:', apiKey.substring(0, 7) + '...');
					console.log('API Key length:', apiKey.length);
					headers['Authorization'] = `Bearer ${apiKey}`;
				}

				if (operation === 'getSpaceInfo') {
					try {
						// Try to get config endpoint
						const configUrl = `${cleanedUrl}/gradio_api/config`;
						console.log('Getting space info from:', configUrl);
						console.log('Config request headers:', JSON.stringify(headers));
						
						const configResponse = await this.helpers.httpRequest({
							method: 'GET',
							url: configUrl,
							headers,
							returnFullResponse: true,
							ignoreHttpStatusErrors: true,
						});
						
						console.log('Config response status:', configResponse.statusCode);
						if (configResponse.statusCode === 401) {
							console.log('401 Unauthorized - Response body:', configResponse.body);
						}

						if (configResponse.statusCode === 200) {
							returnData.push({
								json: {
									spaceUrl: cleanedUrl,
									config: configResponse.body,
									available: true,
								},
								pairedItem: { item: i },
							});
						} else {
							returnData.push({
								json: {
									spaceUrl: cleanedUrl,
									available: false,
									error: `HTTP ${configResponse.statusCode}: ${configResponse.body}`,
								},
								pairedItem: { item: i },
							});
						}
					} catch (error) {
						returnData.push({
							json: {
								spaceUrl: cleanedUrl,
								available: false,
								error: error instanceof Error ? error.message : String(error),
							},
							pairedItem: { item: i },
						});
					}
				} else if (operation === 'callFunction') {
					const apiName = this.getNodeParameter('apiName', i) as string;
					const inputParametersRaw = this.getNodeParameter('inputParameters', i) as string;
					const advancedOptions = this.getNodeParameter('advancedOptions', i) as IDataObject;
					const fileOptions = this.getNodeParameter('fileOptions', i) as IDataObject;
					
					// Parse input parameters - accept both array and object
					let inputParameters: any[];
					try {
						const parsedData = JSON.parse(inputParametersRaw);
						
						if (Array.isArray(parsedData)) {
							// Direct array format: [123, "www"]
							inputParameters = parsedData;
						} else if (typeof parsedData === 'object' && parsedData !== null) {
							// Object format: {"p1": 123, "p2": "www"} -> [{"p1": 123, "p2": "www"}]
							inputParameters = [parsedData];
						} else {
							throw new Error('Input parameters must be a JSON array or object');
						}
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid JSON in input parameters: ${error instanceof Error ? error.message : String(error)}`,
						);
					}

					// Handle file upload if enabled
					if (fileOptions.enableFileUpload) {
						const parameterIndex = fileOptions.parameterIndex as number;
						const filePropertyName = fileOptions.filePropertyName as string || 'data';
						const customFilename = fileOptions.filename as string;
						
						if (items[i].binary && items[i].binary![filePropertyName]) {
							const binaryData = items[i].binary![filePropertyName];
							const filename = customFilename || binaryData.fileName || 'file.bin';
							
							const fileData = await convertToGradioFile(
								this,
								filePropertyName,
								filename,
							);
							
							// Replace parameter at specified index with file data
							if (parameterIndex >= 0 && parameterIndex < inputParameters.length) {
								inputParameters[parameterIndex] = fileData;
							}
						}
					}

					// Generate session hash if not provided
					const sessionHash = (advancedOptions.sessionHash as string) || generateSessionHash();
					const timeout = (advancedOptions.timeout as number) || 120;
					const returnFullResponse = advancedOptions.returnFullResponse as boolean || false;

					// Step 1: Make initial API call
					const apiUrl = `${cleanedUrl}/gradio_api/call${apiName}`;
					const startTime = Date.now();

					console.log('Making POST request to:', apiUrl);
					console.log('Headers:', JSON.stringify(headers));
					console.log('Body:', JSON.stringify({
						data: inputParameters,
						session_hash: sessionHash,
					}));

					const initialResponse = await this.helpers.httpRequest({
						method: 'POST',
						url: apiUrl,
						headers,
						body: {
							data: inputParameters,
							session_hash: sessionHash,
						},
						returnFullResponse: true,
					});

					if (initialResponse.statusCode !== 200) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to call Gradio API: ${initialResponse.statusMessage}`,
						);
					}

					const apiResponse = initialResponse.body as GradioApiResponse;
					const eventId = apiResponse.event_id;

					if (!eventId) {
						throw new NodeOperationError(
							this.getNode(),
							'No event_id received from Gradio API',
						);
					}

					// Step 2: Wait a bit for processing to start
					await sleep(2000);

					// Step 3: Poll for results
					const resultData = await pollForResults(
						this,
						apiUrl,
						eventId,
						timeout,
						headers,
					);

					const duration = Date.now() - startTime;

					if (returnFullResponse) {
						returnData.push({
							json: {
								data: resultData,
								success: true,
								eventId,
								duration,
								sessionHash,
							},
							pairedItem: { item: i },
						});
					} else {
						// Return just the data
						returnData.push({
							json: resultData,
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
							success: false,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}