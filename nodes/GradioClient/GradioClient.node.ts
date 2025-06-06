// Minimal n8n Node Definition - Entry Point Only

import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	NodeOperationError,
	IDataObject,
} from 'n8n-workflow';

import { nodeDescription } from './nodeDefinition';
import { loadOptionsMethods } from './loadOptions';
import { executeGetSpaceInfo, executeCallFunction } from './operations';
import { cleanUrl } from './utils';

export class GradioClient implements INodeType {
	description = nodeDescription;
	methods = { loadOptions: loadOptionsMethods };

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
					headers['Authorization'] = `Bearer ${apiKey}`;
				}

				let result: INodeExecutionData;

				if (operation === 'getSpaceInfo') {
					result = await executeGetSpaceInfo(this, i, cleanedUrl, headers);
				} else if (operation === 'callFunction') {
					result = await executeCallFunction(this, i, cleanedUrl, headers);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				returnData.push(result);
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