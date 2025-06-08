# n8n-nodes-gradio-client

[![npm version](https://img.shields.io/npm/v/@activadee/n8n-nodes-gradio-client.svg)](https://www.npmjs.com/package/@activadee/n8n-nodes-gradio-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive n8n community node that enables seamless integration with Gradio Spaces, allowing you to call AI models and APIs hosted on HuggingFace Spaces directly from your n8n workflows.

## Features

- 🚀 **Universal Gradio Support**: Call any Gradio Space API function
- 🔐 **HuggingFace Authentication**: Support for private spaces with API tokens
- 📁 **File Upload Handling**: Seamless file uploads with automatic processing
- ⏱️ **Smart Polling**: Intelligent polling with configurable timeouts for long-running operations
- 📊 **Space Information**: Get detailed space configuration and API endpoints
- 🛡️ **Error Handling**: Comprehensive error handling with detailed error types
- 🔄 **Retry Logic**: Built-in retry mechanisms for robust API interactions

## Installation

### For n8n Cloud/Self-hosted
```bash
npm install @activadee/n8n-nodes-gradio-client
```

### For Local Development
```bash
cd ~/.n8n/custom
npm install @activadee/n8n-nodes-gradio-client
```

## Usage

### Basic Function Call

1. **Add the Gradio Client node** to your workflow
2. **Configure the Space URL**: Enter the full URL (e.g., `https://username-spacename.hf.space`)
3. **Set the API endpoint**: Specify the function name (e.g., `/predict`, `/generate`)
4. **Provide input parameters**: Supply inputs as a JSON array matching the expected format

### File Uploads

For models that require file inputs:

1. **Enable file upload** in the File Upload Options
2. **Specify parameter index**: Set which parameter position expects the file
3. **Set binary property**: Configure the n8n binary property containing your file
4. **Optional filename**: Provide a custom filename if needed

### Authentication

For private HuggingFace Spaces:

1. **Toggle authentication**: Enable "Requires Authentication"
2. **Add HuggingFace credentials**: Configure your API token in n8n credentials
3. **Automatic token handling**: The node automatically adds Bearer token to requests

## Example Use Cases

- **🎵 Text-to-Speech**: Generate audio from text using Chatterbox TTS or similar models
- **🎨 Image Generation**: Create images with DALL-E, Stable Diffusion, or Midjourney spaces
- **💬 LLM Inference**: Chat with Llama, Mistral, Claude, or other language models
- **🔍 Document Analysis**: Process PDFs, images, or text with specialized AI models
- **🎥 Video Processing**: Generate or analyze video content with AI models
- **📝 Text Processing**: Summarization, translation, sentiment analysis, and more

## Development

### Prerequisites

- Node.js 16+ 
- npm or yarn
- n8n-workflow peer dependency

### Project Structure

```
nodes/gradio/
├── credentials/
│   └── HuggingFaceApi.credentials.ts  # HuggingFace API credentials
├── nodes/GradioClient/
│   ├── GradioClient.node.ts          # Main node entry point
│   ├── nodeDefinition.ts             # Node UI configuration
│   ├── operations.ts                 # Business logic for API calls
│   ├── client.ts                     # Gradio API client implementation
│   ├── types.ts                      # TypeScript interfaces
│   ├── utils.ts                      # Helper functions
│   ├── errors.ts                     # Error handling classes
│   ├── loadOptions.ts                # Dynamic option loading
│   └── gradio.svg                    # Node icon
├── package.json
├── tsconfig.json
└── README.md
```

### Development Commands

```bash
# Install dependencies
npm install

# Build the project (compiles TypeScript to dist/)
npm run build

# Development mode with file watching
npm run dev

# Run semantic release (automated via CI)
npm run semantic-release
```

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/activadee/n8n-nodes-gradio-client.git
   cd n8n-nodes-gradio-client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Link to your n8n installation**:
   ```bash
   # For global n8n installation
   npm link
   cd ~/.n8n/custom
   npm link @activadee/n8n-nodes-gradio-client

   # For local n8n development
   cd path/to/your/n8n
   npm link ../path/to/@activadee/n8n-nodes-gradio-client
   ```

5. **Start n8n** and the node will be available in the node palette

### Development Workflow

1. **Make changes** to TypeScript files in `nodes/GradioClient/`
2. **Run build** with `npm run build` or use watch mode `npm run dev`
3. **Test in n8n** by restarting your n8n instance
4. **Commit changes** using conventional commit format
5. **Create PR** - releases are automated via semantic-release

### Testing

Currently, the project uses manual testing through n8n workflows. To test:

1. **Build the project**: `npm run build`
2. **Create test workflows** in n8n with various Gradio spaces
3. **Test different scenarios**:
   - Public spaces without authentication
   - Private spaces with HuggingFace tokens
   - File uploads and downloads
   - Error handling and edge cases

### Code Architecture

#### Core Components

- **GradioClient.node.ts**: Main n8n node implementation that handles execution flow
- **nodeDefinition.ts**: Defines the node's UI properties and configuration options
- **operations.ts**: Contains business logic for different operations (get info, call function)
- **client.ts**: Low-level Gradio API client with polling and streaming support
- **types.ts**: TypeScript interfaces and enums for type safety
- **utils.ts**: Helper functions for URL cleaning, parameter normalization, etc.
- **errors.ts**: Custom error classes for better error handling

#### Key Features Implementation

- **Polling Logic**: Implements intelligent polling for long-running Gradio functions
- **File Handling**: Converts n8n binary data to Gradio-compatible file objects
- **Authentication**: Handles HuggingFace API token integration
- **Error Recovery**: Comprehensive error handling with retry mechanisms

## Release Process

This project uses automated semantic versioning and releasing:

- **Conventional Commits**: Use conventional commit format for automatic version bumping
- **Automated Releases**: GitHub Actions automatically publishes to npm on main branch pushes
- **Beta Releases**: Push to `beta` branch for pre-release versions
- **Changelog**: Automatically generated changelog based on commit messages

### Commit Message Format

```
type(scope): description

feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

## Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes** following the code style
4. **Test thoroughly** with different Gradio spaces
5. **Commit using conventional format**: `git commit -m "feat: add new feature"`
6. **Push and create a Pull Request**

## Troubleshooting

### Common Issues

**Authentication Errors**:
- Verify HuggingFace API token is correct
- Ensure the space requires authentication
- Check token permissions

**Timeout Errors**:
- Increase timeout values for long-running models
- Check if the Gradio space is responsive
- Verify space URL is correct

**File Upload Issues**:
- Ensure binary data property exists
- Check file parameter index matches the model's expected input
- Verify file types are supported by the space

**API Endpoint Not Found**:
- Use "Get Space Info" operation to discover available endpoints
- Check if the space is public and accessible
- Verify the API name format (should start with `/`)


## Workflow Testing

This version includes optimized semantic-release workflow for squash merges:
- Feature branches → beta via squash merge
- Beta → main via squash merge  
- Automated version management

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/activadee/n8n-nodes-gradio-client/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/activadee/n8n-nodes-gradio-client/discussions)
- 📖 **Documentation**: [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- 💬 **Community**: [n8n Discord](https://discord.gg/n8n)