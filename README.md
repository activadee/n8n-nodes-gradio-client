# n8n-nodes-gradio-client

This is an n8n community node that allows you to connect to Gradio Spaces and call their API functions.

## Features

- Call any Gradio Space API function
- Support for HuggingFace authentication
- File upload support
- Intelligent polling with configurable timeouts
- Get Space info to check availability

## Installation

```bash
npm install n8n-nodes-gradio-client
```

## Usage

### Basic Function Call

1. Add the Gradio Client node to your workflow
2. Enter the Space URL (e.g., `https://username-spacename.hf.space`)
3. Set the API name (e.g., `/predict`)
4. Provide input parameters as a JSON array

### File Uploads

To upload files:
1. Enable file upload in the File Upload Options
2. Specify the parameter index where the file should go
3. Set the binary property name containing your file
4. Optionally set a custom filename

### Authentication

For private spaces:
1. Toggle "Requires Authentication" to true
2. Add HuggingFace credentials to n8n
3. The node will automatically use the Bearer token

## Example Use Cases

- **Text-to-Speech**: Connect to Chatterbox TTS or similar models
- **Image Generation**: Call DALL-E, Stable Diffusion spaces
- **LLM Inference**: Connect to Llama, Mistral, or other language models
- **Any Gradio API**: Works with any properly configured Gradio Space

## Development

```bash
# Install dependencies
npm install

# Build the node
npm run build

# Development mode with watch
npm run dev
```

## License

MIT