# Skynet-MCP: Autonomous Agent Prompts

This document contains structured prompts for autonomous agents (like Cline, Aider, Claude Code, and Cursor) to help implement the Skynet-MCP project using Test-Driven Development (TDD). Each prompt follows a consistent pattern to maximize the effectiveness of AI coding assistants.

## General Instructions

### Development Approach

We're building Skynet-MCP using a Test-Driven Development (TDD) approach:

1. **First, write tests** that define the expected behavior of the component we're creating
2. **Then implement** the necessary code to make those tests pass
3. **Finally, refactor** the code while ensuring tests continue to pass

### Technical Environment

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js (v20+)
- **Test Framework**: Vitest with MSW for mocking
- **Transport Protocol**: Server-Sent Events (SSE)
- **Linting/Formatting**: ESLint and Prettier
- **Package Manager**: npm
- **CI**: GitHub Actions

### Project Structure

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

### Prompt Template Structure

Each prompt in this document follows this structure:

```
## [Task Name]

### Objective
[Clear description of what we're trying to accomplish]

### Integration Tests to Create
[Specific test scenarios to implement first]

### Implementation Requirements
[Specific requirements, constraints, and acceptance criteria]

### Related Components
[Dependencies and components this will interact with]

### References
[Links to documentation, specifications, or examples]
```

---

# Phase 1 Prompts: Project Setup and Infrastructure

## 1. Project Repository Initialization

### Objective

Set up the initial project structure, TypeScript configuration, and development environment for Skynet-MCP.

### Integration Tests to Create

Create a simple smoke test that verifies:

1. The project structure is correctly set up
2. TypeScript compilation works
3. Vitest can run tests
4. ESLint and Prettier are properly configured

```typescript
// test/setup.test.ts
import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('Project Setup', () => {
  it('should have the correct directory structure', () => {
    // Test various directories exist
  });

  it('should have proper TypeScript configuration', () => {
    // Test tsconfig.json exists and has correct settings
  });

  it('should have proper ESLint and Prettier configuration', () => {
    // Test config files exist and have correct settings
  });
});
```

### Implementation Requirements

1. Initialize a new npm project with `package.json`
2. Configure TypeScript with strict mode enabled
3. Set up ESLint with TypeScript support
4. Configure Prettier for code formatting
5. Set up Vitest for testing
6. Create the basic directory structure described above
7. Configure npm scripts for:
   - Building the project
   - Running tests
   - Linting and formatting code
   - Starting the development server
8. Set up `.gitignore` and other standard project files

### Related Components

None - this is the initial setup.

### References

- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [Vitest Documentation](https://vitest.dev/guide/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## 2. MCP SDK Integration

### Objective

Install and integrate the Model Context Protocol (MCP) TypeScript SDK into the project.

### Integration Tests to Create

Create tests that verify:

1. The MCP SDK can be imported
2. Basic SDK functionality works
3. SDK version compatibility

```typescript
// test/mcp-sdk.test.ts
import { describe, it, expect } from 'vitest';
import { Server, Client } from '@modelcontextprotocol/sdk';

describe('MCP SDK Integration', () => {
  it('should be able to import the MCP SDK', () => {
    expect(Server).toBeDefined();
    expect(Client).toBeDefined();
  });

  it('should be able to create a basic server instance', () => {
    const server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    );
    expect(server).toBeDefined();
  });

  it('should be able to create a basic client instance', () => {
    const client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    );
    expect(client).toBeDefined();
  });
});
```

### Implementation Requirements

1. Install the MCP TypeScript SDK and its dependencies
2. Create utility functions for common MCP operations
3. Set up versioning compatibility checks
4. Add any necessary type declarations
5. Create example server and client instances to verify functionality

### Related Components

- Server implementation
- Client implementation

### References

- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io)

### Status

- ✅ MCP SDK installed (version 1.7.0)
- ✅ Basic utility functions created for server/client creation
- ✅ Version compatibility check implemented
- ✅ Type declarations added
- ✅ Example server and client instances exist
- ❌ Connection and close function tests need fixing

**Note:** The core MCP SDK integration is complete and the basic tests are passing. However, there are still issues with the more advanced tests for connection and close functions. These tests need to be fixed in Phase 2 by improving the mocking approach for the Server and Client classes.

## 3. Docker Configuration

### Objective

Create a Dockerfile and docker-compose setup for local development and testing.

### Integration Tests to Create

Create tests that verify:

1. The Docker image can be built
2. The container can start up correctly
3. The application can run inside the container

```typescript
// test/docker.test.ts - Note: This may be implemented as a shell script instead
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Docker Configuration', () => {
  it('should be able to build the Docker image', () => {
    // This can be implemented as a shell script that runs docker build
    // Or use a Docker API client
  });

  it('should be able to start the container', () => {
    // Start container and check exit code
  });

  it('should be able to run tests inside the container', () => {
    // Run test command inside container and check results
  });
});
```

### Implementation Requirements

1. Create a Dockerfile that:
   - Uses Node.js v20 or latest LTS
   - Installs all dependencies
   - Sets up the development environment
   - Configures appropriate entry points
2. Create a docker-compose.yml file that:
   - Sets up the application container
   - Configures volume mounts for local development
   - Sets environment variables
   - Includes Redis for state management (optional at this stage)
3. Add npm scripts for Docker operations

### Related Components

- Main application
- Test runner
- CI/CD pipeline

### References

- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 4. CI/CD Pipeline Setup

### Objective

Set up a GitHub Actions workflow for continuous integration and delivery.

### Integration Tests to Create

Create a GitHub Actions workflow file that:

1. Runs on push to main and pull requests
2. Executes all tests
3. Performs linting and formatting checks
4. Builds the project

The tests here will be implicit in the GitHub Actions workflow itself.

### Implementation Requirements

1. Create a GitHub Actions workflow file at `.github/workflows/ci.yml`
2. Configure the workflow to:
   - Install dependencies
   - Run linting and formatting checks
   - Run unit and integration tests
   - Build the project
   - Cache dependencies for faster runs
3. Set up appropriate failure notifications
4. Configure branch protection rules (if applicable)

### Related Components

- Test suite
- Build process

### References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest GitHub Actions Setup](https://vitest.dev/guide/ci.html)

## 5. Basic Server/Client Transport Test

### Objective

Create a simple proof-of-concept test that demonstrates the MCP server and client can communicate over SSE transport.

### Integration Tests to Create

Create an end-to-end test that:

1. Starts a minimal MCP server with SSE transport
2. Connects a client to the server
3. Exchanges basic messages
4. Verifies the connection lifecycle (initialization, message exchange, termination)

```typescript
// test/integration/sse-transport.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server, Client } from '@modelcontextprotocol/sdk';
import { SSEServerTransport, SSEClientTransport } from '@modelcontextprotocol/sdk/transport';
import express from 'express';

describe('SSE Transport', () => {
  let app;
  let server;
  let serverUrl;

  beforeAll(async () => {
    // Set up express server with SSE endpoints
    // Start the server on a test port
  });

  afterAll(async () => {
    // Clean up server
  });

  it('should complete the MCP initialization handshake', async () => {
    // Initialize server and client
    // Verify initialization completes successfully
  });

  it('should exchange messages correctly', async () => {
    // Send test messages between client and server
    // Verify message receipt
  });

  it('should handle connection termination properly', async () => {
    // Test clean shutdown
  });
});
```

### Implementation Requirements

1. Create minimal implementations of:
   - A basic MCP server with SSE transport
   - A basic MCP client with SSE transport
   - Express server to host the SSE endpoints
2. Implement basic request and notification handling
3. Create utility functions for testing SSE communication
4. Set up proper cleanup procedures for tests

### Related Components

- Server implementation
- Client implementation
- Express server setup

### References

- [MCP SSE Transport Specification](https://spec.modelcontextprotocol.io)
- [Express.js Documentation](https://expressjs.com/)
- [Server-Sent Events (SSE) Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## 6. Configuration System

### Objective

Create a flexible configuration system that can load settings from environment variables, files, and code.

### Integration Tests to Create

Create tests that verify:

1. Configurations can be loaded from environment variables
2. Configurations can be loaded from files
3. Configurations can be merged with defaults
4. Different environments (dev, test, prod) can be selected

```typescript
// test/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, Config } from '../src/utils/config';

describe('Configuration System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment variables
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load default configuration', () => {
    // Test default config is loaded
  });

  it('should override defaults with environment variables', () => {
    // Set env vars and verify they override defaults
  });

  it('should load configuration from files', () => {
    // Test loading from config file
  });

  it('should switch configurations based on NODE_ENV', () => {
    // Test different environments
  });
});
```

### Implementation Requirements

1. Create a configuration system that:
   - Has sensible defaults
   - Can load from environment variables
   - Can load from JSON/YAML configuration files
   - Supports different environments (development, testing, production)
   - Validates configuration values
2. Include configurations for:
   - Server settings (port, host, etc.)
   - Client connection details
   - Logging levels
   - Security settings
   - Agent execution parameters
3. Implement a clean API for accessing configuration values

### Related Components

- Server setup
- Client setup
- Test infrastructure

### References

- [Node.js Configuration Best Practices](https://12factor.net/config)
- [TypeScript Config Pattern](https://basarat.gitbook.io/typescript/nodejs#configuration)
