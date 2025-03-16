/**
 * Example MCP client implementation
 */
import { Client } from '@modelcontextprotocol/sdk';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ToolCallResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * A simple example MCP client that connects to a server and calls tools
 */
export class ExampleClient {
  private client: Client;
  private connected: boolean = false;

  /**
   * Create a new example client
   */
  constructor() {
    // Initialize the client with metadata
    this.client = new Client(
      {
        name: 'example-calculator-client',
        version: '0.1.0',
      },
      {
        capabilities: {},
      },
    );

    // Set up error handling
    this.client.onerror = (error) => console.error('[MCP Client Error]', error);
  }

  /**
   * Connect to an MCP server using SSE transport
   * @param serverUrl The URL of the MCP server
   */
  async connect(serverUrl: string): Promise<void> {
    try {
      const transport = new SSEClientTransport(serverUrl);
      await this.client.connect(transport);
      this.connected = true;
      console.log(`Connected to MCP server at ${serverUrl}`);
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
      console.log('Disconnected from MCP server');
    }
  }

  /**
   * List all available tools from the connected server
   */
  async listTools(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Client is not connected to a server');
    }

    try {
      const response = await this.client.listTools();
      return response.tools.map((tool) => tool.name);
    } catch (error) {
      console.error('Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Call the add tool on the server
   * @param a First number
   * @param b Second number
   * @returns The result of the addition
   */
  async add(a: number, b: number): Promise<number> {
    return this.parseNumericResult(await this.callTool('add', { a, b }));
  }

  /**
   * Call the subtract tool on the server
   * @param a First number
   * @param b Second number
   * @returns The result of the subtraction
   */
  async subtract(a: number, b: number): Promise<number> {
    return this.parseNumericResult(await this.callTool('subtract', { a, b }));
  }

  /**
   * Call a tool on the connected server
   * @param toolName The name of the tool to call
   * @param args The arguments to pass to the tool
   * @returns The result of the tool call
   */
  private async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    if (!this.connected) {
      throw new Error('Client is not connected to a server');
    }

    try {
      return await this.client.callTool(toolName, args);
    } catch (error) {
      console.error(`Failed to call tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Parse a numeric result from a tool call
   * @param result The tool call result
   * @returns The parsed numeric value
   */
  private parseNumericResult(result: ToolCallResult): number {
    // Extract the result text from the response
    const resultText = result.content.find((item) => item.type === 'text')?.text;

    if (!resultText) {
      throw new Error('No text result found in tool response');
    }

    // Extract the number from the result text (assuming format "Result: X")
    const match = resultText.match(/Result: (-?\d+(\.\d+)?)/);
    if (!match) {
      throw new Error(`Could not parse numeric result from: ${resultText}`);
    }

    return parseFloat(match[1]);
  }
}

// Example usage
async function runExample() {
  const client = new ExampleClient();

  try {
    // Connect to a local MCP server
    await client.connect('http://localhost:3000/mcp');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools);

    // Call the add tool
    const sum = await client.add(5, 3);
    console.log('5 + 3 =', sum);

    // Call the subtract tool
    const difference = await client.subtract(10, 4);
    console.log('10 - 4 =', difference);

    // Disconnect from the server
    await client.disconnect();
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}
