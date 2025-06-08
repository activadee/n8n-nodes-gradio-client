// Node Operations - Business Logic

import { IExecuteFunctions, INodeExecutionData, NodeOperationError, IDataObject } from 'n8n-workflow';
import { GradioClient as GradioApiClient } from './client';
import { GradioError } from './errors';
import { convertToGradioFile, cleanUrl } from './utils';

export async function executeGetSpaceInfo(
	executeFunctions: IExecuteFunctions,
	i: number,
	cleanedUrl: string,
	headers: IDataObject
): Promise<INodeExecutionData> {
	try {
		// Try to get config endpoint
		const configUrl = `${cleanedUrl}/gradio_api/config`;
		console.log('Getting space info from:', configUrl);
		
		const configResponse = await executeFunctions.helpers.httpRequest({
			method: 'GET',
			url: configUrl,
			headers,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});
		
		console.log('Config response status:', configResponse.statusCode);

		if (configResponse.statusCode === 200) {
			return {
				json: {
					spaceUrl: cleanedUrl,
					config: configResponse.body,
					available: true,
				},
				pairedItem: { item: i },
			};
		} else {
			return {
				json: {
					spaceUrl: cleanedUrl,
					available: false,
					error: `HTTP ${configResponse.statusCode}: ${configResponse.body}`,
				},
				pairedItem: { item: i },
			};
		}
	} catch (error) {
		return {
			json: {
				spaceUrl: cleanedUrl,
				available: false,
				error: error instanceof Error ? error.message : String(error),
			},
			pairedItem: { item: i },
		};
	}
}

export async function executeCallFunction(
	executeFunctions: IExecuteFunctions,
	i: number,
	cleanedUrl: string,
	headers: IDataObject
): Promise<INodeExecutionData> {
	const items = executeFunctions.getInputData();
	
	const apiSelection = executeFunctions.getNodeParameter('apiSelection', i) as string;
	const apiName = apiSelection === 'manual' 
		? executeFunctions.getNodeParameter('apiNameManual', i) as string
		: executeFunctions.getNodeParameter('apiName', i) as string;
	const inputParametersRaw = executeFunctions.getNodeParameter('inputParameters', i) as string;
	const advancedOptions = executeFunctions.getNodeParameter('advancedOptions', i) as IDataObject;
	const fileOptions = executeFunctions.getNodeParameter('fileOptions', i) as IDataObject;
	
	// Parse input parameters - must be array format
	let inputParameters: any[];
	try {
		const parsedData = JSON.parse(inputParametersRaw);
		if (!Array.isArray(parsedData)) {
			throw new Error('Input parameters must be a JSON array (e.g., ["param1", "param2"])');
		}
		inputParameters = parsedData;
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Invalid input parameters: ${error instanceof Error ? error.message : String(error)}`,
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
				executeFunctions,
				filePropertyName,
				filename,
			);
			
			// Replace parameter at specified index with file data
			if (parameterIndex >= 0 && parameterIndex < inputParameters.length) {
				inputParameters[parameterIndex] = fileData;
			}
		}
	}

	// Enhanced configuration with adaptive settings
	const timeout = (advancedOptions.timeout as number) || 120;
	const returnFullResponse = advancedOptions.returnFullResponse as boolean || false;
	const retryAttempts = Math.min((advancedOptions.retryAttempts as number) || 3, 5); // Max 5 retries
	const debugMode = advancedOptions.debugMode as boolean || false;
	const startTime = Date.now();
	
	if (debugMode) {
		console.log('🔍 Debug Mode: Enhanced Gradio Client Configuration', {
			spaceUrl: cleanedUrl,
			apiName,
			inputParameters,
			timeout,
			retryAttempts,
			headers: Object.keys(headers)
		});
	}

	// Use the new predict() method with enhanced error handling
	let resultData: any;
	try {
		resultData = await GradioApiClient.predict(
			executeFunctions,
			cleanedUrl,
			apiName,
			inputParameters,
			headers,
			timeout,
			retryAttempts
		);
	} catch (error) {
		// Enhanced error handling with specific messages
		if (error instanceof GradioError) {
			const contextualMessage = `${error.message} (Space: ${cleanedUrl}, API: ${apiName})`;
			throw new NodeOperationError(executeFunctions.getNode(), contextualMessage);
		} else {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(executeFunctions.getNode(), `Unexpected error: ${errorMessage}`);
		}
	}

	const duration = Date.now() - startTime;

	if (returnFullResponse) {
		return {
			json: {
				data: resultData,
				success: true,
				duration,
				apiName,
				spaceUrl: cleanedUrl,
			},
			pairedItem: { item: i },
		};
	} else {
		// Return just the data
		return {
			json: resultData,
			pairedItem: { item: i },
		};
	}
}