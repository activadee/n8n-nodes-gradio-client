// Gradio Client Utility Functions

import { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { GradioFileData } from './types';

// Helper functions
export function generateSessionHash(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let hash = '';
	for (let i = 0; i < 11; i++) {
		hash += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return hash;
}

export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function cleanUrl(url: string): string {
	url = url.trim();
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = 'https://' + url;
	}
	// Remove trailing slash
	return url.replace(/\/$/, '');
}

// Enhanced file handling following Gradio patterns
export async function handleGradioFile(
	executeFunctions: IExecuteFunctions,
	propertyName: string,
	filename: string,
): Promise<GradioFileData> {
	const buffer = await executeFunctions.helpers.getBinaryDataBuffer(0, propertyName);
	const binaryData = executeFunctions.getInputData()[0].binary![propertyName];
	
	return {
		path: filename,
		meta: { _type: 'gradio.FileData' },
		orig_name: filename,
		size: buffer.length,
		mime_type: binaryData.mimeType || 'application/octet-stream',
	};
}

// Legacy function for backward compatibility
export async function convertToGradioFile(
	executeFunctions: IExecuteFunctions,
	propertyName: string,
	filename: string,
): Promise<GradioFileData> {
	return handleGradioFile(executeFunctions, propertyName, filename);
}

