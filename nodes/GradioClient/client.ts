// Gradio Client Core Logic

import { IExecuteFunctions, IDataObject, NodeOperationError } from 'n8n-workflow';
import { GradioApiResponse, GradioEventData, GradioErrorType } from './types';
import { GradioError } from './errors';
import { cleanUrl, sleep } from './utils';

export class GradioClient {
	
	// Advanced retry logic with exponential backoff
	static async executeWithRetry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000
	): Promise<T> {
		let lastError: Error;
		
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error as Error;
				
				// Don't retry on certain error types
				if (error instanceof GradioError && !error.retryable) {
					throw error;
				}
				
				if (attempt === maxRetries) {
					throw lastError;
				}
				
				// Exponential backoff with jitter
				const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
				console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms delay`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		throw lastError!;
	}

	// Configuration validation and API discovery
	static async validateApiEndpoint(
		executeFunctions: IExecuteFunctions,
		spaceUrl: string,
		apiName: string,
		headers: IDataObject
	): Promise<{ isValid: boolean; error?: string }> {
		try {
			const cleanedUrl = cleanUrl(spaceUrl);
			const configUrl = `${cleanedUrl}/gradio_api/config`;
			
			const configResponse = await executeFunctions.helpers.httpRequest({
				method: 'GET',
				url: configUrl,
				headers,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});

			if (configResponse.statusCode !== 200) {
				return { 
					isValid: false, 
					error: `Unable to access space configuration (HTTP ${configResponse.statusCode})` 
				};
			}

			const config = configResponse.body;
			
			// Check if endpoint exists in config
			if (config.named_endpoints && config.named_endpoints[apiName]) {
				return { isValid: true };
			}
			
			// Check unnamed endpoints
			if (config.unnamed_endpoints && Array.isArray(config.unnamed_endpoints)) {
				const endpointIndex = parseInt(apiName.replace('/api/predict_', ''));
				if (!isNaN(endpointIndex) && endpointIndex < config.unnamed_endpoints.length) {
					return { isValid: true };
				}
			}
			
			return { 
				isValid: false, 
				error: `API endpoint '${apiName}' not found in space configuration` 
			};
		} catch (error) {
			return { 
				isValid: false, 
				error: `Failed to validate API endpoint: ${error instanceof Error ? error.message : String(error)}` 
			};
		}
	}

	// Official Gradio Client methods implementation with retry logic
	static async predict(
		executeFunctions: IExecuteFunctions,
		spaceUrl: string,
		apiName: string,
		inputParameters: any[],
		headers: IDataObject,
		timeout: number = 120,
		retryAttempts: number = 3
	): Promise<any> {
		return GradioClient.executeWithRetry(async () => {
			const cleanedUrl = cleanUrl(spaceUrl);
			const apiUrl = `${cleanedUrl}/gradio_api/call${apiName}`;
			
			console.log('Gradio.predict() called:', { apiUrl, inputParameters });
			
			// Step 1: Submit request with retry logic
			const initialResponse = await executeFunctions.helpers.httpRequest({
				method: 'POST',
				url: apiUrl,
				headers,
				body: { data: inputParameters },
				returnFullResponse: true,
			});

			if (initialResponse.statusCode !== 200) {
				throw GradioError.fromHttpError(initialResponse.statusCode, initialResponse.statusMessage);
			}

			const apiResponse = initialResponse.body as GradioApiResponse;
			const eventId = apiResponse.event_id;

			if (!eventId) {
				throw new GradioError(
					'No event_id received from Gradio API',
					GradioErrorType.API_ENDPOINT_ERROR,
					undefined,
					false
				);
			}

			// Step 2: Get result via streaming with adaptive timeout
			const streamUrl = `${apiUrl}/${eventId}`;
			const adaptiveTimeout = Math.max(timeout * 1000, 30000); // Minimum 30s for streaming
			
			console.log(`Streaming from: ${streamUrl} (timeout: ${adaptiveTimeout}ms)`);
			
			const streamResponse = await executeFunctions.helpers.httpRequest({
				method: 'GET',
				url: streamUrl,
				headers,
				timeout: adaptiveTimeout,
				returnFullResponse: true,
			});

			if (streamResponse.statusCode !== 200) {
				throw GradioError.fromHttpError(streamResponse.statusCode, streamResponse.statusMessage);
			}

			return GradioClient.parseServerSentEvents(streamResponse.body);
		}, retryAttempts);
	}
	
	static parseServerSentEvents(responseBody: string): any {
		const lines = responseBody.split('\n').filter((line: string) => line.trim());
		let eventType = '';
		let resultData = null;
		let hasCompleteEvent = false;
		
		for (const line of lines) {
			console.log('Processing SSE line:', line);
			
			// Parse event type
			if (line.startsWith('event: ')) {
				eventType = line.slice(7).trim();
				console.log('Event type:', eventType);
				
				if (eventType === 'complete') {
					hasCompleteEvent = true;
				}
				continue;
			}
			
			// Parse data content
			if (line.startsWith('data: ')) {
				try {
					const dataContent = line.slice(6).trim();
					
					// Skip null data (heartbeat)
					if (dataContent === 'null') {
						console.log('Skipping heartbeat data');
						continue;
					}
					
					// Enhanced error detection in streaming data
					if (dataContent.includes('Session not found')) {
						throw new GradioError(
							'Session expired or not found',
							GradioErrorType.STREAMING_ERROR,
							undefined,
							true
						);
					}
					
					if (dataContent.includes('Rate limit exceeded')) {
						throw new GradioError(
							'Rate limit exceeded on streaming endpoint',
							GradioErrorType.RATE_LIMIT_ERROR,
							429,
							true
						);
					}
					
					const data = JSON.parse(dataContent);
					
					// Handle different event types
					if (eventType === 'complete' && Array.isArray(data)) {
						console.log('Found complete event with data:', data);
						return data;
					} else if (eventType === 'error') {
						throw new GradioError(
							`Gradio API Error: ${JSON.stringify(data)}`,
							GradioErrorType.STREAMING_ERROR,
							undefined,
							false
						);
					} else if (Array.isArray(data) && hasCompleteEvent) {
						// Fallback: array data after seeing complete event
						console.log('Found array data after complete event:', data);
						resultData = data;
					}
				} catch (parseError) {
					console.error('Failed to parse SSE data line:', line, 'Error:', parseError);
					// Re-throw if it's our custom error
					if (parseError instanceof GradioError) {
						throw parseError;
					}
				}
			}
		}
		
		// Return result if we found complete event and data
		if (hasCompleteEvent && resultData) {
			console.log('Returning result data:', resultData);
			return resultData;
		}
		
		throw new GradioError(
			'No valid result found in server-sent events stream',
			GradioErrorType.STREAMING_ERROR,
			undefined,
			false
		);
	}
}