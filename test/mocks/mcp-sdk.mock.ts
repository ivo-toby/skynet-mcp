/**
 * Mock implementation of the MCP SDK for testing
 */

// Mock Server class
export class Server {
  private handlers: Map<string, (request: any) => Promise<any>> = new Map();
  public onerror: (error: Error) => void = () => {};

  constructor(
    public metadata: { name: string; version: string },
    public options: { capabilities: Record<string, unknown> },
  ) {}

  async connect(transport: any): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }

  async close(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }

  setRequestHandler<T>(schema: any, handler: (request: any) => Promise<T>): void {
    this.handlers.set(schema.name || 'unknown', handler);
  }
}

// Mock Client class
export class Client {
  public onerror: (error: Error) => void = () => {};
  private connected = false;

  constructor(
    public metadata: { name: string; version: string },
    public options: { capabilities: Record<string, unknown> },
  ) {}

  async connect(transport: any): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  async close(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  async listTools(): Promise<{ tools: Array<{ name: string; description?: string }> }> {
    return {
      tools: [
        { name: 'mock-tool-1', description: 'A mock tool for testing' },
        { name: 'mock-tool-2', description: 'Another mock tool for testing' },
      ],
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    return {
      content: [
        {
          type: 'text',
          text: 'Mock tool result',
        },
      ],
    };
  }
}

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
