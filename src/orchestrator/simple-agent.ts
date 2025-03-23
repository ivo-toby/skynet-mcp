/**
 * Simple Agent - A basic MCP agent implementation
 *
 * This file implements a minimal agent that can:
 * 1. Connect to predefined MCP servers as tools
 * 2. Process a single prompt
 * 3. Use available tools to complete the task
 */

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
 * This is a simplified implementation that simulates the behavior without using the MCP SDK directly
 */
export class SimpleAgent {
  protected config: SimpleAgentConfig;
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

    // For demo purposes, we'll just set connected to true
    this.connected = true;
    console.log('SimpleAgent initialized successfully');
  }

  /**
   * Process a prompt using available tools
   * This is a simplified implementation that just simulates responses
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

    // For this simple example, we'll just simulate tool usage
    const promptLower = prompt.toLowerCase();

    const serverName =
      this.config.toolServers.length > 0 ? this.config.toolServers[0].name : 'mock-server';

    // Try to match add/sum operation
    if (promptLower.includes('add') || promptLower.includes('sum') || promptLower.includes('+')) {
      const numbers = this.extractNumbers(prompt);
      if (numbers.length >= 2) {
        return `I processed your request "${prompt}" using add from ${serverName} server.\n\nResult: ${numbers[0] + numbers[1]}`;
      }
    }

    // Try to match subtract/difference operation
    if (
      promptLower.includes('subtract') ||
      promptLower.includes('minus') ||
      promptLower.includes('-')
    ) {
      const numbers = this.extractNumbers(prompt);
      if (numbers.length >= 2) {
        return `I processed your request "${prompt}" using subtract from ${serverName} server.\n\nResult: ${numbers[0] - numbers[1]}`;
      }
    }

    return `I couldn't find a suitable tool to process your request: "${prompt}".`;
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
    this.connected = false;
    console.log('SimpleAgent shutdown complete');
  }
}
