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

/**
 * A simple example MCP server that provides a basic calculator tool
 */
export class ExampleServer {
  private server: Server;

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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
    }));

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

      // Handle different tools
      switch (name) {
        case 'add':
          return {
            content: [
              {
                type: 'text',
                text: `Result: ${args.a + args.b}`,
              },
            ],
          };

        case 'subtract':
          return {
            content: [
              {
                type: 'text',
                text: `Result: ${args.a - args.b}`,
              },
            ],
          };

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
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
