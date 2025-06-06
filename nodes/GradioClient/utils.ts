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

// Enhanced input parameter processing
export function normalizeInputParameters(parsedData: any): any[] {
	if (Array.isArray(parsedData)) {
		// Direct array format: [123, "www"]
		return parsedData;
	} else if (typeof parsedData === 'object' && parsedData !== null) {
		// Object format handling
		if ('text' in parsedData || 'voice_file' in parsedData) {
			// Gradio TTS/Chat format - convert to parameter array
			return [
				parsedData.text || '',
				parsedData.voice_file || null,
				parsedData.exaggeration !== undefined ? parsedData.exaggeration : 0.5,
				parsedData.cfg_weight !== undefined ? parsedData.cfg_weight : 0.5
			];
		} else if ('prompt' in parsedData || 'message' in parsedData) {
			// Chat/LLM format
			return [
				parsedData.prompt || parsedData.message || '',
				parsedData.system_prompt || '',
				parsedData.max_tokens || 1000,
				parsedData.temperature || 0.7,
				parsedData.top_p || 0.9
			];
		} else {
			// Generic object format: {"p1": 123, "p2": "www"} -> [{"p1": 123, "p2": "www"}]
			return [parsedData];
		}
	} else {
		throw new Error('Input parameters must be a JSON array or object');
	}
}