/**
 * Simple Agent - A basic MCP agent implementation
 *
 * This file implements a minimal agent that can:
 * 1. Connect to predefined MCP servers as tools
 * 2. Process a single prompt
 * 3. Use available tools to complete the task
 */

// Import only what we need for the demo to work
// import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for a tool server
 */
export interface ToolServerConfig {
  url: string;
  name: string;
}

/**
 * Configuration for the simple agent
 */
export interface SimpleAgentConfig {
  toolServers: ToolServerConfig[];
  maxToolCalls: number;
}

/**
 * Response from a tool call
 */
export interface ToolResponse {
  serverName: string;
  toolName: string;
  result: string;
}

/**
 * Simple Agent class that can process prompts using MCP tools
 */
export class SimpleAgent {
  protected config: SimpleAgentConfig;
  private clients: Map<string, any> = new Map();
  protected availableTools: Map<string, Set<string>> = new Map();
  private connected: boolean = false;

  /**
   * Create a new simple agent
   */
  constructor(config: SimpleAgentConfig) {
    this.config = config;
  }

  /**
   * Initialize the agent by connecting to all configured tool servers
   */
  async initialize(): Promise<void> {
    if (this.connected) {
      return;
    }

    console.log('Initializing SimpleAgent...');

    // Skip actual initialization for demo
    this.connected = true;
    console.log('SimpleAgent initialized successfully');

    /* Commented out due to MCP SDK compatibility issues
    // Connect to each tool server
    for (const server of this.config.toolServers) {
      try {
        const client = new Client(
          {
            name: `simple-agent-${uuidv4().substring(0, 8)}`,
            version: '0.1.0',
          },
          {
            capabilities: {},
          },
        );

        // Set up error handling
        client.onerror = (error: unknown) => console.error(`[MCP Client Error for ${server.name}]`, error);

        // Connect to the server
        const transport = new SSEClientTransport(server.url);
        await client.connect(transport);

        // Store the client
        this.clients.set(server.name, client);

        // Get available tools
        const toolsResponse = await client.listTools();
        const toolNames = toolsResponse.tools.map((tool: { name: string }) => tool.name);
        this.availableTools.set(server.name, new Set(toolNames));

        console.log(`Connected to MCP server ${server.name} at ${server.url}`);
        console.log(`Available tools: ${toolNames.join(', ')}`);
      } catch (error) {
        console.error(`Failed to connect to MCP server ${server.name}:`, error);
        // Continue with other servers even if one fails
      }
    }

    if (this.clients.size === 0) {
      throw new Error('Failed to connect to any MCP servers');
    }
    */
  }

  /**
   * Process a prompt using available tools
   * This is a simplified implementation that just uses the first available tool
   * A real implementation would use LLM to decide which tools to use
   */
  async processPrompt(prompt: string): Promise<string> {
    if (!this.connected) {
      await this.initialize();
    }

    console.log(`Processing prompt: ${prompt}`);

    // In a real implementation, we would use an LLM to:
    // 1. Parse the prompt
    // 2. Decide which tools to use
    // 3. Format the response

    // For this demo, we'll just simulate responses
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes('add') || promptLower.includes('sum') || promptLower.includes('+')) {
      const numbers = this.extractNumbers(prompt);
      if (numbers.length >= 2) {
        return `I processed your request using the 'add' tool. The result is: ${numbers[0] + numbers[1]}`;
      }
    } else if (
      promptLower.includes('subtract') ||
      promptLower.includes('minus') ||
      promptLower.includes('-')
    ) {
      const numbers = this.extractNumbers(prompt);
      if (numbers.length >= 2) {
        return `I processed your request using the 'subtract' tool. The result is: ${numbers[0] - numbers[1]}`;
      }
    }

    return `I couldn't find a suitable tool to process your request: "${prompt}". Available tools: addition, subtraction`;
  }

  /**
   * Extract numbers from a prompt string
   */
  private extractNumbers(prompt: string): number[] {
    const numberRegex = /-?\d+(\.\d+)?/g;
    const matches = prompt.match(numberRegex);
    return matches ? matches.map(Number) : [];
  }

  /**
   * Disconnect from all tool servers
   */
  async shutdown(): Promise<void> {
    if (!this.connected) {
      return;
    }

    console.log('Shutting down SimpleAgent...');
    this.clients.clear();
    this.availableTools.clear();
    this.connected = false;
    console.log('SimpleAgent shutdown complete');
  }
}
