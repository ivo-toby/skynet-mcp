/**
 * Example MCP server implementation
 */
import { Server } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Type for SSE send function
type SseSendFunction = (event: string, data: unknown) => void;

/**
 * A simple example MCP server that provides a basic calculator tool
 */
export class ExampleServer {
  private server: Server;
  private sseSend: SseSendFunction | null = null;

  constructor() {
    // Initialize the server with metadata
    this.server = new Server(
      {
        name: 'example-calculator-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Set up request handlers
    this.setupRequestHandlers();

    // Set up error handling
    this.server.onerror = (error) => console.error('[MCP Server Error]', error);
  }

  /**
   * Set up the request handlers for the server
   */
  private setupRequestHandlers(): void {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      const response = {
        tools: [
          {
            name: 'add',
            description: 'Add two numbers',
            inputSchema: {
              type: 'object',
              properties: {
                a: {
                  type: 'number',
                  description: 'First number',
                },
                b: {
                  type: 'number',
                  description: 'Second number',
                },
              },
              required: ['a', 'b'],
            },
          },
          {
            name: 'subtract',
            description: 'Subtract second number from first number',
            inputSchema: {
              type: 'object',
              properties: {
                a: {
                  type: 'number',
                  description: 'First number',
                },
                b: {
                  type: 'number',
                  description: 'Second number',
                },
              },
              required: ['a', 'b'],
            },
          },
        ],
      };

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
      const { name, arguments: args } = request.params;

      // Validate arguments
      if (
        typeof args !== 'object' ||
        args === null ||
        typeof args.a !== 'number' ||
        typeof args.b !== 'number'
      ) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters');
      }

      let response;
      // Handle different tools
      switch (name) {
        case 'add':
          response = {
            content: [
              {
                type: 'text',
                text: `Result: ${args.a + args.b}`,
              },
            ],
          };
          break;

        case 'subtract':
          response = {
            content: [
              {
                type: 'text',
                text: `Result: ${args.a - args.b}`,
              },
            ],
          };
          break;

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

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
  }

  /**
   * Connect the server with a transport
   * @param transport The transport to use
   */
  async connectWithTransport(transport: any): Promise<void> {
    await this.server.connect(transport);
    console.log('Example MCP server connected with transport');
  }

  /**
   * Set up HTTP SSE transport for the server
   * @param send Function to send SSE events to the client
   */
  async setupHttpSSE(send: SseSendFunction): Promise<void> {
    this.sseSend = send;

    // Send initial handshake
    send('handshake', {
      name: 'example-calculator-server',
      version: '0.1.0',
      capabilities: {
        tools: {},
      },
    });
  }

  /**
   * Handle a message from the client
   * @param message The message received from the client
   */
  async handleClientMessage(message: unknown): Promise<void> {
    try {
      // We can't use this.server.handleMessage directly as it's not exposed
      // Instead we need to handle the cases we care about
      if (
        typeof message === 'object' &&
        message !== null &&
        'method' in message &&
        'id' in message
      ) {
        const typedMessage = message as { method: string; id: string | number; params: unknown };

        if (typedMessage.method === 'listTools') {
          // We'll just respond directly for this demo
          if (this.sseSend) {
            const tools = [
              {
                name: 'add',
                description: 'Add two numbers',
                inputSchema: {
                  type: 'object',
                  properties: {
                    a: {
                      type: 'number',
                      description: 'First number',
                    },
                    b: {
                      type: 'number',
                      description: 'Second number',
                    },
                  },
                  required: ['a', 'b'],
                },
              },
              {
                name: 'subtract',
                description: 'Subtract second number from first number',
                inputSchema: {
                  type: 'object',
                  properties: {
                    a: {
                      type: 'number',
                      description: 'First number',
                    },
                    b: {
                      type: 'number',
                      description: 'Second number',
                    },
                  },
                  required: ['a', 'b'],
                },
              },
            ];

            this.sseSend('response', {
              jsonrpc: '2.0',
              id: typedMessage.id,
              result: { tools },
            });
          }
        } else if (typedMessage.method === 'callTool') {
          // Handle call tool manually
          const params = typedMessage.params as {
            name: string;
            arguments: { a: number; b: number };
          };

          if (params && params.name && params.arguments) {
            let result;

            if (params.name === 'add') {
              result = {
                content: [
                  {
                    type: 'text',
                    text: `Result: ${params.arguments.a + params.arguments.b}`,
                  },
                ],
              };
            } else if (params.name === 'subtract') {
              result = {
                content: [
                  {
                    type: 'text',
                    text: `Result: ${params.arguments.a - params.arguments.b}`,
                  },
                ],
              };
            }

            if (result && this.sseSend) {
              this.sseSend('response', {
                jsonrpc: '2.0',
                id: typedMessage.id,
                result,
              });
            }
          }
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
   * Start the server with the specified transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Example MCP server running on stdio');
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.server.close();
    this.sseSend = null;
    console.log('Example MCP server stopped');
  }
}

// Example usage
if (require.main === module) {
  const server = new ExampleServer();
  server.start().catch(console.error);

  // Handle process termination
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}
