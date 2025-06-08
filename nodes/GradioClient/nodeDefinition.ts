// Node Definition - UI Configuration Only

import { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

export const nodeDescription: INodeTypeDescription = {
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
			displayName: 'API Selection',
			name: 'apiSelection',
			type: 'options',
			options: [
				{
					name: 'Auto-detect from Space',
					value: 'autoDetect',
				},
				{
					name: 'Manual Entry',
					value: 'manual',
				},
			],
			default: 'autoDetect',
			displayOptions: {
				show: {
					operation: ['callFunction'],
				},
			},
			description: 'Choose how to select the API endpoint',
		},
		{
			displayName: 'API Name',
			name: 'apiName',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getApiFunctions',
			},
			default: '/predict',
			required: true,
			displayOptions: {
				show: {
					operation: ['callFunction'],
					apiSelection: ['autoDetect'],
				},
			},
			description: 'The function endpoint to call (automatically loaded from Space)',
		},
		{
			displayName: 'API Name (Manual)',
			name: 'apiNameManual',
			type: 'string',
			default: '/predict',
			required: true,
			displayOptions: {
				show: {
					operation: ['callFunction'],
					apiSelection: ['manual'],
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
			placeholder: '[\"Hello world\", 42, true]',
			description: 'JSON array of parameters to pass to the function (must be an array)',
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
				{
					displayName: 'Retry Attempts',
					name: 'retryAttempts',
					type: 'number',
					default: 3,
					typeOptions: {
						minValue: 1,
						maxValue: 5,
					},
					description: 'Number of retry attempts for failed requests (1-5)',
				},
				{
					displayName: 'Debug Mode',
					name: 'debugMode',
					type: 'boolean',
					default: false,
					description: 'Enable detailed logging for troubleshooting',
				},
			],
		},
	],
};