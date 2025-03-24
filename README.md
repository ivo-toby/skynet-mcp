# Skynet-MCP (WORK IN PROGRESS)

A hierarchical network of AI agents using the Model Context Protocol (MCP). The AI Agents in this network can spawn new agents to have them do work, each agent also includes all the tools that the initiating agent has.
The network of agents are capable of working through complex tasks, ranging from research, reporting, to coding.

By leveraging the growing collection of MCP-servers available each of the agents potentially have a large set of tools at their disposal to do all kinds of tasks.

## Current Development Status

As of March 2025, Skynet-MCP is in active development with the following components completed:

- ✅ Basic project structure and build system
- ✅ MCP server implementation using FastMCP
- ✅ Simple agent orchestration framework
- ✅ Support for both SSE and STDIO transport
- ✅ Basic Docker containerization
- ✅ Asynchronous task management

Currently evaluating [Mastra](https://mastra.ai) for implementing dynamic agent workflows.

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

## Current Project Structure

```
skynet-mcp/
├── src/
│   ├── server/       # MCP server implementation
│   ├── client/       # MCP client implementation
│   ├── orchestrator/ # Agent orchestration
│   └── utils/        # Shared utilities
├── bin/              # Executable scripts
├── scripts/          # Development utilities
├── dist/             # Compiled code
├── docs/             # Documentation
└── config/           # Configuration files (future use)
```

## Development Roadmap

### Current Phase: Core System Development

- Implementing dynamic agent workflows using Mastra
- Enhancing agent orchestration capabilities
- Developing more sophisticated task decomposition

### Next Steps

- Implementing persistence layer for agent state
- Enhancing security features
- Building advanced monitoring and telemetry

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
3. Build the project:
   ```
   npm run build
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
- `npm run inspect` - Start the MCP server with the inspector
- `npm run inspect-watch` - Watch for changes and restart the inspector

#### Docker Commands

- `npm run docker:build` - Build the Docker image
- `npm run docker:up` - Start the application with Docker Compose
- `npm run docker:down` - Stop Docker Compose services
- `npm run docker:test` - Run tests inside the Docker container
- `npm run test:docker` - Run Docker-specific tests (requires Docker running)

## Docker Support

Skynet-MCP includes Docker support for containerized development and deployment.

The project includes a Dockerfile and docker-compose.yml file that:

- Uses Node.js 20 Alpine as the base image
- Sets up the application environment
- Installs dependencies
- Builds the TypeScript code
- Exposes port for the server

To start the full environment:

```bash
npm run docker:up
```

## Configuration

Skynet-MCP uses a flexible configuration system that can load settings from:

- Default values
- Environment variables
- Environment-specific JSON configuration files (future use)

### Key Environment Variables

- `SERVER_PORT` - Port the server listens on
- `SERVER_HOST` - Host the server binds to
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `OPENAI_API_KEY` - OpenAI API key (for LLM-powered agents)
- `ANTHROPIC_API_KEY` - Anthropic API key (for LLM-powered agents)

## Contribution

Contributions are welcome! If you're interested in helping with this project and are proficient in TypeScript, please reach out.

Current areas where help is needed:

- Implementation of dynamic agent workflows
- Building the state management system
- Creating more sophisticated task decomposition mechanisms
- Writing tests and documentation

## License

ISC
