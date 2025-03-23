# Skynet-MCP (THIS PROJECT IS A WORK IN PROGRESS)

A hierarchical network of AI agents using the Model Context Protocol (MCP).

## Overview

Skynet-MCP is an advanced architecture that implements the Model Context Protocol (MCP) to create a hierarchical network of AI agents. Each Skynet-MCP instance acts as both an MCP server and MCP client, allowing it to provide tools to parent agents while also spawning and managing child agents.

This architecture enables recursive agent networks capable of decomposing complex tasks, parallelizing work, and integrating specialized capabilities across multiple models and services.

## Features

- **Dual-Mode Operation**: Acts as both MCP server and client
- **LLM Integration**: Connect to OpenAI or Anthropic models for intelligent decision-making
- **Tool Discovery**: Automatically discover and use tools from connected MCP servers
- **Hierarchical Agent Management**: Create and manage child agents
- **Configurable**: Flexible configuration system supporting multiple environments
- **FastMCP Integration**: Built on the efficient FastMCP framework for robust MCP server implementations
- **Multiple Transport Options**: Supports both STDIO and SSE (Server-Sent Events) transport
- **Delayed Execution**: Run tasks asynchronously and poll for results later

## MCP Tools

Skynet-MCP provides the following MCP tools through its FastMCP implementation:

1. **Invoke**: Creates and manages agent tasks

   - Parameters:
     - `mcpConfig`: MCP server configuration (available tools for the agent)
     - `llmConfig`: LLM configuration (provider and model to use)
     - `prompt`: Instructions for the agent task
     - `delayedExecution`: Boolean indicating if the task should be run asynchronously

2. **DelayedResponse**: Retrieves the result of asynchronous tasks
   - Parameters:
     - `taskId`: The ID of the task to check
   - Returns: Task status and result (if completed)

## Agent

The agent framework still needs to be implemented.

## Project Structure

```
skynet-mcp/
├── src/
│   ├── server/       # MCP server implementation
│   ├── client/       # MCP client implementation
│   ├── orchestrator/ # Agent orchestration
│   ├── tools/        # Agent tools
│   ├── persistence/  # State management
│   └── utils/        # Shared utilities
├── test/
│   ├── unit/         # Unit tests
│   └── integration/  # Integration tests
├── examples/         # Example implementations
└── config/           # Configuration files
```

## Development

### Prerequisites

- Node.js (v20+)
- npm
- Docker and Docker Compose (optional, for containerized development)
- API keys for OpenAI or Anthropic (for LLM-powered agents)

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Available Scripts

#### Basic Development Commands

- `npm run build` - Build the project
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint the code
- `npm run lint:fix` - Lint and fix the code
- `npm run format` - Format the code
- `npm run dev` - Run TypeScript in watch mode
- `npm start` - Start the application

#### Docker Commands

- `npm run docker:build` - Build the Docker image
- `npm run docker:up` - Start the application with Docker Compose
- `npm run docker:down` - Stop Docker Compose services
- `npm run docker:test` - Run tests inside the Docker container
- `npm run test:docker` - Run Docker-specific tests (requires Docker running)

## Docker Support

Skynet-MCP includes Docker support for containerized development and deployment.

### Dockerfile

The project includes a Dockerfile that:

- Uses Node.js 20 Alpine as the base image
- Sets up the application environment
- Installs dependencies
- Builds the TypeScript code
- Exposes port 3000 for the server

### Docker Compose

The docker-compose.yml file provides a complete development environment with:

- The Skynet-MCP application container
- Redis for state management and persistence
- Volume mounts for local development
- Environment variable configuration

To start the full environment:

```bash
npm run docker:up
```

## Configuration System

Skynet-MCP uses a flexible configuration system that can load settings from:

- Default values
- Environment variables
- Environment-specific JSON configuration files

Configuration files are stored in the `config/` directory and loaded based on the `NODE_ENV` environment variable.

### Environment Variables

Key environment variables include:

- `SERVER_PORT` - Port the server listens on
- `SERVER_HOST` - Host the server binds to
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `PERSISTENCE_TYPE` - Storage type (memory or redis)
- `REDIS_URL` - Redis connection URL (when using Redis)
- `OPENAI_API_KEY` - OpenAI API key (for LLM-powered agents)
- `ANTHROPIC_API_KEY` - Anthropic API key (for LLM-powered agents)

## CI/CD

Skynet-MCP uses GitHub Actions for continuous integration and delivery.

The workflow:

1. Runs on pushes to the main branch and pull requests
2. Sets up the Node.js environment
3. Installs dependencies
4. Runs linting and formatting checks
5. Builds the project
6. Runs all tests
7. Builds and verifies the Docker image

The CI/CD pipeline helps ensure code quality and stability by automatically testing changes before they're merged.

## License

ISC
