/**
 * Implementation of the MCP Server Layer for Skynet-MCP
 * 
 * This class provides a complete implementation of the Model Context Protocol server
 * interface, handling tool registration/discovery, authentication, and SSE transport.
 */
import { Server } from '@modelcontextprotocol/sdk/dist/esm/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/dist/esm/types.js';

/**
 * Type for SSE send function
 */
type SseSendFunction = (event: string, data: unknown) => void;

/**
 * Type for tool handler function
 */
type ToolHandler = (args: Record<string, any>) => Promise<ToolResponse>;

/**
 * Type for authentication handler function
 */
type AuthenticationHandler = (token: string) => boolean;

/**
 * Type for authorization handler function
 */
type AuthorizationHandler = (token: string, toolName: string) => boolean;

/**
 * Interface for tool definition
 */
interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: ToolHandler;
}

/**
 * Interface for tool response
 */
interface ToolResponse {
  content: Array<{
    type: string;
    text?: string;
    blob?: string;
    resource?: any;
  }>;
  isError?: boolean;
}

/**
 * Interface for server configuration
 */
interface McpServerConfig {
  name: string;
  version: string;
  capabilities?: Record<string, any>;
}

/**
 * MCP Server implementation for Skynet-MCP
 * 
 * Provides a complete implementation of the Model Context Protocol server
 * interface with support for tool registration, authentication, and SSE transport.
 */
export class McpServer {
  private server: Server;
  private tools: Map<string, Tool> = new Map();
  private sseSend: SseSendFunction | null = null;
  private authenticationHandler: AuthenticationHandler | null = null;
  private authorizationHandler: AuthorizationHandler | null = null;

  /**
   * Create a new MCP Server
   * 
   * @param config Server configuration
   */
  constructor(config: McpServerConfig) {
    // Initialize the server with metadata
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: config.capabilities || {
          tools: {},
        },
      }
    );

    // Set up error handling
    this.server.onerror = (error) => this.handleError(error);

    // Set up request handlers
    this.setupRequestHandlers();
  }

  /**
   * Set up the request handlers for the server
   */
  setupRequestHandlers(): void {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      // Check authentication if handler is set
      if (this.authenticationHandler && !this.authenticateRequest(request.auth)) {
        throw new McpError(ErrorCode.InvalidRequest, 'Authentication failed');
      }

      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      const response = { tools };

      // If we're using SSE, manually send the response
      if (this.sseSend) {
        this.sseSend('response', {
          jsonrpc: '2.0',
          id: request.id,
          result: response,
        });
      }

      return response;
    });

    // Handler for calling tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Check authentication if handler is set
      if (this.authenticationHandler && !this.authenticateRequest(request.auth)) {
        throw new McpError(ErrorCode.InvalidRequest, 'Authentication failed');
      }

      // Check authorization if handler is set
      if (
        this.authorizationHandler && 
        !this.authorizeToolAccess(request.auth, request.params.name)
      ) {
        throw new McpError(
          ErrorCode.InvalidRequest, 
          `Not authorized to access tool: ${request.params.name}`
        );
      }

      const result = await this.executeToolHandler(request.params);

      // If we're using SSE, manually send the response
      if (this.sseSend) {
        this.sseSend('response', {
          jsonrpc: '2.0',
          id: request.id,
          result,
        });
      }

      return result;
    });
  }

  /**
   * Register a tool with the server
   * 
   * @param name Tool name
   * @param description Tool description
   * @param inputSchema JSON Schema for the tool's parameters
   * @param handler Function to execute when the tool is called
   */
  registerTool(
    name: string,
    description: string,
    inputSchema: Record<string, any>,
    handler: ToolHandler
  ): void {
    // Check if tool already exists
    if (this.tools.has(name)) {
      throw new Error(`Tool with name ${name} already exists`);
    }

    // Register the tool
    this.tools.set(name, {
      name,
      description,
      inputSchema,
      handler,
    });
  }

  /**
   * Set the authentication handler
   * 
   * @param handler Function to authenticate requests
   */
  setAuthenticationHandler(handler: AuthenticationHandler): void {
    this.authenticationHandler = handler;
  }

  /**
   * Set the authorization handler
   * 
   * @param handler Function to authorize tool access
   */
  setAuthorizationHandler(handler: AuthorizationHandler): void {
    this.authorizationHandler = handler;
  }

  /**
   * Connect the server with a transport
   * 
   * @param transport The transport to use
   */
  async connectWithTransport(transport: any): Promise<void> {
    await this.server.connect(transport);
    console.log('MCP server connected with transport');
  }

  /**
   * Set up HTTP SSE transport for the server
   * 
   * @param send Function to send SSE events to the client
   */
  setupHttpSSE(send: SseSendFunction): void {
    this.sseSend = send;

    // Send initial handshake
    send('handshake', {
      name: this.server['identity'].name,
      version: this.server['identity'].version,
      capabilities: this.server['options'].capabilities,
    });
  }

  /**
   * Handle a message from the client
   * 
   * @param message The message received from the client
   */
  async handleClientMessage(message: unknown): Promise<void> {
    try {
      if (
        typeof message === 'object' &&
        message !== null &&
        'method' in message &&
        'id' in message
      ) {
        const typedMessage = message as { 
          method: string; 
          id: string | number; 
          params?: unknown;
          auth?: string;
        };

        if (typedMessage.method === 'listTools') {
          // Check authentication if handler is set
          if (this.authenticationHandler && !this.authenticateRequest(typedMessage.auth)) {
            this.sendErrorResponse(typedMessage.id, ErrorCode.InvalidRequest, 'Authentication failed');
            return;
          }

          const tools = Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          }));

          if (this.sseSend) {
            this.sseSend('response', {
              jsonrpc: '2.0',
              id: typedMessage.id,
              result: { tools },
            });
          }
        } else if (typedMessage.method === 'callTool') {
          const params = typedMessage.params as {
            name: string;
            arguments: Record<string, any>;
          };

          // Check authentication if handler is set
          if (this.authenticationHandler && !this.authenticateRequest(typedMessage.auth)) {
            this.sendErrorResponse(typedMessage.id, ErrorCode.InvalidRequest, 'Authentication failed');
            return;
          }

          // Check authorization if handler is set
          if (
            this.authorizationHandler && 
            !this.authorizeToolAccess(typedMessage.auth, params.name)
          ) {
            this.sendErrorResponse(
              typedMessage.id, 
              ErrorCode.InvalidRequest, 
              `Not authorized to access tool: ${params.name}`
            );
            return;
          }

          try {
            const result = await this.executeToolHandler(params);

            if (this.sseSend) {
              this.sseSend('response', {
                jsonrpc: '2.0',
                id: typedMessage.id,
                result,
              });
            }
          } catch (error) {
            if (error instanceof McpError) {
              this.sendErrorResponse(typedMessage.id, error.code, error.message);
            } else {
              this.sendErrorResponse(
                typedMessage.id, 
                ErrorCode.InternalError, 
                `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }
        } else {
          // Unknown method
          this.sendErrorResponse(
            typedMessage.id, 
            ErrorCode.MethodNotFound, 
            `Method not found: ${typedMessage.method}`
          );
        }
      }
    } catch (error) {
      console.error('Error handling client message:', error);

      if (this.sseSend) {
        this.sseSend('error', {
          message: 'Failed to process request',
          error: String(error),
        });
      }
    }
  }

  /**
   * Send an error response to the client
   * 
   * @param id Request ID
   * @param code Error code
   * @param message Error message
   */
  private sendErrorResponse(id: string | number, code: number, message: string): void {
    if (this.sseSend) {
      this.sseSend('response', {
        jsonrpc: '2.0',
        id,
        error: {
          code,
          message,
        },
      });
    }
  }

  /**
   * Execute a tool handler
   * 
   * @param params Tool parameters
   * @returns Tool execution result
   */
  private async executeToolHandler(params: { name: string; arguments: Record<string, any> }): Promise<ToolResponse> {
    const { name, arguments: args } = params;
    
    // Check if tool exists
    const tool = this.tools.get(name);
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
    }
    
    try {
      // Execute the tool handler
      return await tool.handler(args);
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      
      // Return error response
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * Authenticate a request
   * 
   * @param token Authentication token
   * @returns Whether the request is authenticated
   */
  private authenticateRequest(token?: string): boolean {
    if (!this.authenticationHandler) {
      return true;
    }
    
    return this.authenticationHandler(token || '');
  }

  /**
   * Authorize tool access
   * 
   * @param token Authentication token
   * @param toolName Tool name
   * @returns Whether access is authorized
   */
  private authorizeToolAccess(token?: string, toolName?: string): boolean {
    if (!this.authorizationHandler) {
      return true;
    }
    
    return this.authorizationHandler(token || '', toolName || '');
  }

  /**
   * Handle server errors
   * 
   * @param error The error to handle
   */
  private handleError(error: unknown): void {
    console.error('[MCP Server Error]', error);
    
    if (this.sseSend) {
      this.sseSend('error', {
        message: 'Server error',
        error: String(error),
      });
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.server.close();
    this.sseSend = null;
    console.log('MCP server stopped');
  }
}
