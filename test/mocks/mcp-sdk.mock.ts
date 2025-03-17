/**
 * Mock implementation of the MCP SDK for testing
 */

import { vi } from 'vitest';

// Mock Transport interface
export class MockTransport {
  start = vi.fn().mockResolvedValue(undefined);
  send = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  type: string;

  constructor(type = 'sse') {
    this.type = type;
  }
}

// Mock Server class
export class MockServer {
  identity: any;
  options: any;
  connect = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  useTransport = vi.fn();
  transport = null;

  constructor(identity: any, options: any) {
    this.identity = identity;
    this.options = options;
  }

  // Add any other methods needed
}

// Mock Client class
export class MockClient {
  identity: any;
  options: any;
  connect = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  useTransport = vi.fn();
  transport = null;
  isConnected = vi.fn().mockReturnValue(true);

  constructor(identity: any, options: any) {
    this.identity = identity;
    this.options = options;
  }

  // Add any other methods needed
}

// Mock the Transport type
vi.mock('@modelcontextprotocol/sdk/shared/transport.js', () => {
  return {
    Transport: MockTransport,
  };
});

// Mock modules
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: MockServer,
  };
});

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: MockClient,
  };
});

// Mock SSE Transport
export class MockSSETransport extends MockTransport {
  mount = vi.fn();
  constructor() {
    super('sse');
  }
}

vi.mock('@modelcontextprotocol/sdk/transport/sse/index.js', () => {
  return {
    SSETransport: MockSSETransport,
  };
});

export default {
  MockServer,
  MockClient,
  MockSSETransport,
  MockTransport,
};

// Mock error codes
export enum ErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

// Mock error class
export class McpError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'McpError';
  }
}

// Mock request schemas
export const ListToolsRequestSchema = { name: 'list_tools' };
export const CallToolRequestSchema = { name: 'call_tool' };

// Mock transports
export class StdioServerTransport {
  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }
}

export class SSEClientTransport {
  constructor(public url: string) {}

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }
}
