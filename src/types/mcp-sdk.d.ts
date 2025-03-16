/**
 * Type declarations for the Model Context Protocol (MCP) SDK
 */

declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(
      metadata: { name: string; version: string },
      options: { capabilities: Record<string, unknown> },
    );

    connect(transport: ServerTransport): Promise<void>;
    close(): Promise<void>;
    setRequestHandler<T>(schema: any, handler: (request: any) => Promise<T>): void;

    onerror: (error: Error) => void;
  }

  export class Client {
    constructor(
      metadata: { name: string; version: string },
      options: { capabilities: Record<string, unknown> },
    );

    connect(transport: ClientTransport): Promise<void>;
    close(): Promise<void>;
    listTools(): Promise<{ tools: Array<{ name: string; description?: string }> }>;
    callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;

    onerror: (error: Error) => void;
  }

  export interface ServerTransport {
    connect(): Promise<void>;
    close(): Promise<void>;
  }

  export interface ClientTransport {
    connect(): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  import { ServerTransport } from '@modelcontextprotocol/sdk';

  export class StdioServerTransport implements ServerTransport {
    constructor();
    connect(): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/client/sse.js' {
  import { ClientTransport } from '@modelcontextprotocol/sdk';

  export class SSEClientTransport implements ClientTransport {
    constructor(url: string);
    connect(): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export enum ErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
  }

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
    code: ErrorCode;
  }

  export interface ToolCallResult {
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  }

  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;

  export interface ServerOptions {
    capabilities: {
      tools?: Record<string, unknown>;
      resources?: Record<string, unknown>;
    };
  }

  export interface ClientOptions {
    capabilities: Record<string, unknown>;
  }
}
