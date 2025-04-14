/**
 * Mock MCP client for Skynet-MCP
 * 
 * This module provides a mock client for simulating MCP server connections
 * when the real implementation is not available or during development.
 */

/**
 * Mock client for interacting with MCP servers
 */
export class MockClient {
  serverUrl: string;
  serverName: string;
  
  constructor(serverUrl: string, serverName: string) {
    this.serverUrl = serverUrl;
    this.serverName = serverName;
  }
  
  /**
   * Describes the tools available on the MCP server
   * 
   * @returns A list of tool descriptions
   */
  async describeTools() {
    console.log(`[MOCK] Describing tools for server: ${this.serverName}`);
    
    // Return mock tools based on the server name
    switch (this.serverName) {
      case 'tavily':
        return [
          {
            name: 'tavily_search',
            description: 'Search the web using Tavily',
            parameters: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            }
          }
        ];
      
      case 'brave-search':
        return [
          {
            name: 'brave_web_search',
            description: 'Search the web using Brave',
            parameters: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            }
          },
          {
            name: 'brave_local_search',
            description: 'Search for local businesses and places',
            parameters: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            }
          }
        ];
        
      case 'fetch':
        return [
          {
            name: 'fetch',
            description: 'Fetch a web page',
            parameters: {
              url: {
                type: 'string',
                description: 'The URL to fetch'
              }
            }
          }
        ];
        
      case 'memory':
        return [
          {
            name: 'read_graph',
            description: 'Read the entire knowledge graph',
            parameters: {}
          },
          {
            name: 'search_nodes',
            description: 'Search for nodes in the knowledge graph',
            parameters: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            }
          }
        ];
        
      case 'filesystem':
        return [
          {
            name: 'read_file',
            description: 'Read a file from the filesystem',
            parameters: {
              path: {
                type: 'string',
                description: 'The path to the file'
              }
            }
          },
          {
            name: 'list_directory',
            description: 'List the contents of a directory',
            parameters: {
              path: {
                type: 'string',
                description: 'The path to the directory'
              }
            }
          }
        ];
        
      default:
        return [
          {
            name: 'web_search',
            description: 'Search the web for information',
            parameters: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            }
          },
          {
            name: 'summarize',
            description: 'Summarize a text',
            parameters: {
              text: {
                type: 'string',
                description: 'The text to summarize'
              }
            }
          }
        ];
    }
  }
  
  /**
   * Executes a tool on the MCP server
   * 
   * @param toolName The name of the tool to execute
   * @param args The arguments for the tool
   * @returns The result of the tool execution
   */
  async executeTool(toolName: string, args: Record<string, any>) {
    console.log(`[MOCK] Executing tool ${toolName} on server ${this.serverName} with args:`, args);
    
    // Simulate tool execution based on the tool name
    switch (toolName) {
      case 'tavily_search':
      case 'brave_web_search':
      case 'web_search':
        return `Search results for "${args.query}" from ${this.serverName}:\n` +
          `- Result 1: Sample information about ${args.query}\n` +
          `- Result 2: More details about ${args.query}\n` +
          `- Result 3: Additional information about ${args.query}`;
        
      case 'brave_local_search':
        return `Local search results for "${args.query}" from ${this.serverName}:\n` +
          `- Business 1: Sample local business related to ${args.query}\n` +
          `- Business 2: Another local business related to ${args.query}`;
        
      case 'fetch':
        return `Content of ${args.url}:\n` +
          `Sample content that would be fetched from ${args.url}`;
        
      case 'read_graph':
        return `Knowledge graph data from ${this.serverName}:\n` +
          `Sample knowledge graph data`;
        
      case 'search_nodes':
        return `Node search results for "${args.query}" from ${this.serverName}:\n` +
          `- Node 1: Sample node related to ${args.query}\n` +
          `- Node 2: Another node related to ${args.query}`;
        
      case 'read_file':
        return `Content of file ${args.path}:\n` +
          `Sample content of file ${args.path}`;
        
      case 'list_directory':
        return `Contents of directory ${args.path}:\n` +
          `- file1.txt\n` +
          `- file2.txt\n` +
          `- subdirectory1/\n` +
          `- subdirectory2/`;
        
      case 'summarize':
        return `Summary of text: ${args.text ? args.text.substring(0, 50) : 'No text provided'}...`;
        
      default:
        return `Unknown tool: ${toolName}`;
    }
  }
}

/**
 * Creates a mock MCP client
 * 
 * @param options Options for the client
 * @returns A mock MCP client
 */
export function createMockClient(
  options: { url: string, name?: string }
): MockClient {
  return new MockClient(options.url, options.name || 'unknown');
}

// Export types and interfaces that match the MCP SDK interface
export type Client = MockClient;

// Mock createClient function
export async function createClient(
  options: { url: string, name?: string }
): Promise<Client> {
  console.log(`[MOCK] Creating client for server: ${options.url}`);
  return createMockClient(options);
}

/**
 * Structure of a tool description
 */
export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

/**
 * Structure of a discovered tool from an MCP server
 */
export interface DiscoveredTool extends McpTool {
  serverUrl: string;
  serverName: string;
}

/**
 * Cache of MCP clients to avoid recreating them for each tool call
 */
const mcpClientCache: Record<string, { client: Client; timestamp: number }> = {};

// Cache expiry time (30 minutes)
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

/**
 * Creates or retrieves a mock MCP client for a server URL
 * 
 * @param serverUrl The URL of the MCP server
 * @param serverName The name of the MCP server
 * @returns A mock MCP client
 */
export async function getMcpClient(serverUrl: string, serverName: string = 'unknown'): Promise<Client> {
  const now = Date.now();
  
  // Check if we have a cached client
  if (mcpClientCache[serverUrl]) {
    const { client, timestamp } = mcpClientCache[serverUrl];
    
    // Check if the cache has expired
    if (now - timestamp < CACHE_EXPIRY_MS) {
      return client;
    }
    
    // If expired, delete the cache entry
    delete mcpClientCache[serverUrl];
  }
  
  // Create a new client
  try {
    console.log(`Creating new mock MCP client for server: ${serverUrl}`);
    const client = createMockClient({ url: serverUrl, name: serverName });
    
    // Cache the client
    mcpClientCache[serverUrl] = {
      client,
      timestamp: now,
    };
    
    return client;
  } catch (error) {
    console.error(`Error creating mock MCP client for server ${serverUrl}:`, error);
    throw new Error(`Failed to connect to MCP server at ${serverUrl}`);
  }
}

/**
 * Cleans up expired MCP clients
 */
export function cleanupMcpClients(): void {
  const now = Date.now();
  
  for (const [serverUrl, { timestamp }] of Object.entries(mcpClientCache)) {
    if (now - timestamp > CACHE_EXPIRY_MS) {
      delete mcpClientCache[serverUrl];
    }
  }
}

/**
 * Retrieves all available tools from an MCP server
 * 
 * @param serverUrl The URL of the MCP server
 * @param serverName The name of the MCP server
 * @returns A list of discovered tools
 */
export async function discoverToolsFromServer(
  serverUrl: string,
  serverName: string,
): Promise<DiscoveredTool[]> {
  try {
    // Get or create the MCP client
    const client = await getMcpClient(serverUrl, serverName);
    
    // Get the tool descriptions
    const tools = await client.describeTools();
    
    // Convert to our DiscoveredTool format
    return tools.map(tool => ({
      ...tool,
      serverUrl,
      serverName,
    }));
  } catch (error) {
    console.error(`Error discovering tools from server ${serverName} (${serverUrl}):`, error);
    return [];
  }
}

/**
 * Executes a tool on an MCP server
 * 
 * @param tool The tool to execute
 * @param args The arguments for the tool
 * @returns The result of the tool execution
 */
export async function executeToolOnServer(
  tool: DiscoveredTool,
  args: Record<string, any>,
): Promise<any> {
  try {
    // Get or create the MCP client
    const client = await getMcpClient(tool.serverUrl, tool.serverName);
    
    console.log(`Executing tool ${tool.name} on server ${tool.serverName} with args:`, args);
    
    // Execute the tool
    const result = await client.executeTool(tool.name, args);
    
    return result;
  } catch (error) {
    console.error(`Error executing tool ${tool.name} on server ${tool.serverName}:`, error);
    throw new Error(`Failed to execute tool ${tool.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}