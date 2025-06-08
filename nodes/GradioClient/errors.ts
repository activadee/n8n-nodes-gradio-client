// Gradio Client Error Classes

import { GradioErrorType } from './types';

export class GradioError extends Error {
	public readonly type: GradioErrorType;
	public readonly statusCode?: number;
	public readonly retryable: boolean;
	
	constructor(
		message: string, 
		type: GradioErrorType, 
		statusCode?: number, 
		retryable: boolean = false
	) {
		super(message);
		this.name = 'GradioError';
		this.type = type;
		this.statusCode = statusCode;
		this.retryable = retryable;
	}
	
	static fromHttpError(statusCode: number, statusMessage: string): GradioError {
		switch (statusCode) {
			case 401:
				return new GradioError(
					'Authentication failed - check your HuggingFace token',
					GradioErrorType.AUTHENTICATION_ERROR,
					statusCode,
					false
				);
			case 404:
				return new GradioError(
					'Gradio API endpoint not found or space not accessible',
					GradioErrorType.SPACE_NOT_FOUND,
					statusCode,
					false
				);
			case 429:
				return new GradioError(
					'Rate limit exceeded - consider duplicating the space or waiting',
					GradioErrorType.RATE_LIMIT_ERROR,
					statusCode,
					true
				);
			case 500:
			case 502:
			case 503:
			case 504:
				return new GradioError(
					`Server error: ${statusMessage}`,
					GradioErrorType.NETWORK_ERROR,
					statusCode,
					true
				);
			default:
				return new GradioError(
					`HTTP ${statusCode}: ${statusMessage}`,
					GradioErrorType.NETWORK_ERROR,
					statusCode,
					statusCode >= 500
				);
		}
	}
}