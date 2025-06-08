// Gradio Client Types and Interfaces

export interface GradioFileData {
	path: string;
	meta: { _type: string };
	orig_name: string;
	size: number;
	mime_type: string;
}

export interface GradioApiResponse {
	event_id: string;
}

export interface GradioEventData {
	data?: any[];
	error?: string;
	is_generating?: boolean;
}

// Enhanced error handling with specific error types
export enum GradioErrorType {
	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
	SPACE_NOT_FOUND = 'SPACE_NOT_FOUND',
	API_ENDPOINT_ERROR = 'API_ENDPOINT_ERROR',
	STREAMING_ERROR = 'STREAMING_ERROR',
	TIMEOUT_ERROR = 'TIMEOUT_ERROR',
	RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	NETWORK_ERROR = 'NETWORK_ERROR'
}

export interface GradioClientConfig {
	retryAttempts: number;
	timeout: number;
	debugMode: boolean;
	headers: { [key: string]: string };
}