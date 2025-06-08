// Load Options Methods - API Discovery

import { ILoadOptionsFunctions, INodePropertyOptions, IDataObject } from 'n8n-workflow';
import { cleanUrl } from './utils';

export const loadOptionsMethods = {
	async getApiFunctions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const spaceUrl = this.getNodeParameter('spaceUrl') as string;
			const authentication = this.getNodeParameter('authentication') as string;
			const requiresAuth = authentication === 'huggingface';
			
			if (!spaceUrl) {
				return [{ name: '/predict (default)', value: '/predict' }];
			}
			
			const cleanedUrl = cleanUrl(spaceUrl);
			const headers: IDataObject = {
				'Content-Type': 'application/json',
			};
			
			if (requiresAuth) {
				try {
					const credentials = await this.getCredentials('huggingFaceApi');
					if (credentials && credentials.apiKey) {
						headers['Authorization'] = `Bearer ${credentials.apiKey}`;
					}
				} catch (error) {
					// Continue without auth if credentials are not available
				}
			}
			
			// Try OpenAPI endpoint first (more standardized)
			try {
				const openApiResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: `${cleanedUrl}/gradio_api/openapi.json`,
					headers,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				});
				
				if (openApiResponse.statusCode === 200 && openApiResponse.body) {
					const openApiSpec = openApiResponse.body;
					const paths = openApiSpec.paths || {};
					const options = [];
					
					for (const path in paths) {
						const pathInfo = paths[path].post || {};
						if (!pathInfo) continue; // Skip if no POST method
						
						let endpoint = path;
						let displayName = path;
						
						// Handle different endpoint patterns
						if (path.startsWith('/gradio_api/call/')) {
							// Traditional Gradio API pattern
							endpoint = path.replace('/gradio_api/call', '');
							displayName = endpoint;
						} else if (path.startsWith('/run/')) {
							// Extract function name from /run/ endpoints
							endpoint = path.replace('/run', ''); // Remove /run/ prefix
							displayName = endpoint; // Show only the function name
						} else if (path.startsWith('/api/') || path.startsWith('/predict')) {
							// Direct API endpoints (/api/, /predict)
							endpoint = path;
							displayName = path;
						} else if (path.startsWith('/')) {
							// Any other root-level endpoint
							endpoint = path;
							displayName = path;
						} else {
							continue; // Skip non-standard paths
						}
						
						const summary = pathInfo.summary || pathInfo.operationId || displayName;
						options.push({
							name: `${displayName} - ${summary}`,
							value: endpoint,
						});
					}
					
					if (options.length > 0) {
						return options;
					}
				}
			} catch (openApiError) {
				console.error('OpenAPI endpoint failed:', openApiError);
				// If OpenAPI fails, try the config endpoint
				// Continue to config endpoint fallback
			}
			
			// Fallback to config endpoint
			const configResponse = await this.helpers.httpRequest({
				method: 'GET',
				url: `${cleanedUrl}/gradio_api/config`,
				headers,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
			
			if (configResponse.statusCode === 200 && configResponse.body) {
				const config = configResponse.body;
				const options = [];
				
				// Extract named endpoints
				if (config.named_endpoints) {
					for (const endpoint in config.named_endpoints) {
						options.push({
							name: `${endpoint} (named)`,
							value: endpoint,
						});
					}
				}
				
				// Extract unnamed endpoints
				if (config.unnamed_endpoints && Array.isArray(config.unnamed_endpoints)) {
					config.unnamed_endpoints.forEach((endpoint: any, index: number) => {
						const endpointName = `/api/predict_${index}`;
						options.push({
							name: `${endpointName} (unnamed #${index})`,
							value: endpointName,
						});
					});
				}
				
				if (options.length > 0) {
					return options;
				}
			}
		} catch (error) {
			// If all fails, return default options
			console.error('Failed to load API functions:', error);
		}
		
		// Default fallback
		console.warn('Auto-detection failed, returning default options');
		// Return default options if nothing was found
		return [
			{ name: '/predict (default)', value: '/predict' },
			{ name: '/generate (common)', value: '/generate' },
			{ name: '/transcribe (common)', value: '/transcribe' },
			{ name: '⚠️ Auto-detection failed - use Manual Entry', value: '/predict' },
		];
	},
};