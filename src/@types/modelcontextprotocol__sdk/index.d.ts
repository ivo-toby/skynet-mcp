declare module '@modelcontextprotocol/sdk/dist/esm/client/index.js' {
  export class Client {
    constructor(
      clientInfo: { name: string; version: string },
      options: { capabilities: Record<string, any> },
    );
    onerror: (error: unknown) => void;
    connect(transport: any): Promise<void>;
    listTools(): Promise<{ tools: Array<{ name: string }> }>;
    callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/client/sse.js' {
  export class SSEClientTransport {
    constructor(url: string);
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/shared/transport.js' {
  export interface Transport {
    start(): Promise<void>;
    send(message: any): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/sse.js' {
  export class SSEServerTransport {
    constructor(client: any);
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/index.js' {
  export class Server {
    constructor(
      serverInfo: { name: string; version: string },
      options: { capabilities: Record<string, any> },
    );
    onerror: (error: unknown) => void;
    setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/types.js' {
  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;

  export enum ErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    ServerError = -32000,
  }

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
    code: ErrorCode;
  }
}

declare module 'sse' {
  export class Server {
    constructor(options: { path: string });
    attach(server: any): void;
    on(event: string, callback: (client: any) => void): void;
  }
}
