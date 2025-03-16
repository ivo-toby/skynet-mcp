# Skynet-MCP

A hierarchical network of AI agents using the Model Context Protocol (MCP).

## Overview

Skynet-MCP is an advanced architecture that implements the Model Context Protocol (MCP) to create a hierarchical network of AI agents. Each Skynet-MCP instance acts as both an MCP server and MCP client, allowing it to provide tools to parent agents while also spawning and managing child agents.

This architecture enables recursive agent networks capable of decomposing complex tasks, parallelizing work, and integrating specialized capabilities across multiple models and services.

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

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Available Scripts

- `npm run build` - Build the project
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint the code
- `npm run lint:fix` - Lint and fix the code
- `npm run format` - Format the code
- `npm run dev` - Run TypeScript in watch mode

## License

ISC
