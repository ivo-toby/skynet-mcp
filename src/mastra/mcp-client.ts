/**
 * Real MCP client implementation for Skynet-MCP
 * 
 * This module provides a client for connecting to and interacting with MCP servers,
 * enabling the discovery of tools and their execution for agent workflows.
 */

import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';

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
 * Structure for a real MCP client implementation
 */
export interface Client {
  describeTools(): Promise<McpTool[]>;
  executeTool(toolName: string, args: Record<string, any>): Promise<any>;
  close(): Promise<void>;
}

/**
 * Cache of MCP clients to avoid recreating them for each tool call
 */
const mcpClientCache: Record<string, { 
  client: Client; 
  timestamp: number;
  connected: boolean; 
}> = {};

// Cache expiry time (30 minutes)
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

/**
 * Real client implementation that wraps the MCP SDK
 */
class RealMcpClient implements Client {
  private mcpClient: McpClient;
  private isConnected: boolean = false;
  private serverName: string;
  private serverUrl: string;

  constructor(mcpClient: McpClient, serverName: string, serverUrl: string) {
    this.mcpClient = mcpClient;
    this.serverName = serverName;
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to the MCP server if not already connected
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.mcpClient.connect();
      this.isConnected = true;
      console.log(`Connected to MCP server: ${this.serverName} (${this.serverUrl})`);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${this.serverName} (${this.serverUrl}):`, error);
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List the tools available on the MCP server
   * 
   * @returns List of tool descriptions
   */
  async describeTools(): Promise<McpTool[]> {
    await this.connect();

    try {
      const response = await this.mcpClient.request('list_tools', {});
      
      // Validate the response
      if (!response || !response.tools || !Array.isArray(response.tools)) {
        throw new Error('Invalid response from MCP server list_tools');
      }

      // Process and return the tools
      return response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || `Tool: ${tool.name}`,
        parameters: tool.parameters || {}
      }));
    } catch (error) {
      console.error(`Failed to list tools from MCP server ${this.serverName}:`, error);
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a tool on the MCP server
   * 
   * @param toolName Name of the tool to execute
   * @param args Arguments for the tool
   * @returns Result of the tool execution
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    await this.connect();

    try {
      const response = await this.mcpClient.request('call_tool', {
        name: toolName,
        parameters: args
      });

      // Validate the response
      if (!response) {
        throw new Error('Invalid response from MCP server call_tool');
      }

      return response.result;
    } catch (error) {
      console.error(`Failed to execute tool ${toolName} on MCP server ${this.serverName}:`, error);
      throw new Error(`Failed to execute tool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close the connection to the MCP server
   */
  async close(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.mcpClient.close();
      this.isConnected = false;
      console.log(`Closed connection to MCP server: ${this.serverName}`);
    } catch (error) {
      console.error(`Error closing connection to MCP server ${this.serverName}:`, error);
    }
  }
}

/**
 * Creates a real MCP client
 * 
 * @param options Options for creating the client
 * @returns A real MCP client
 */
export async function createClient(
  options: { url: string; name?: string }
): Promise<Client> {
  const { url, name = 'unknown' } = options;

  console.log(`Creating MCP client for server: ${url} (${name})`);

  try {
    // Create the MCP client from the SDK
    const client = new McpClient(
      {
        name: 'skynet-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Use SSE transport for the client
    client.useTransport({
      type: 'sse',
      url,
    });

    // Create our wrapper client
    return new RealMcpClient(client, name, url);
  } catch (error) {
    console.error(`Error creating MCP client for ${url}:`, error);
    throw new Error(`Failed to create MCP client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create or retrieve an MCP client for a server URL
 * 
 * @param serverUrl URL of the MCP server
 * @param serverName Name of the MCP server
 * @returns An MCP client
 */
export async function getMcpClient(serverUrl: string, serverName: string = 'unknown'): Promise<Client> {
  const now = Date.now();
  
  // Check if we have a cached client
  if (mcpClientCache[serverUrl]) {
    const { client, timestamp, connected } = mcpClientCache[serverUrl];
    
    // Check if the cache has expired
    if (now - timestamp < CACHE_EXPIRY_MS && connected) {
      return client;
    }
    
    // If expired or disconnected, remove from cache
    if (connected) {
      await client.close();
    }
    delete mcpClientCache[serverUrl];
  }
  
  // Create a new client
  try {
    console.log(`Creating new MCP client for server: ${serverUrl} (${serverName})`);
    const client = await createClient({ url: serverUrl, name: serverName });
    
    // Cache the client
    mcpClientCache[serverUrl] = {
      client,
      timestamp: now,
      connected: true
    };
    
    return client;
  } catch (error) {
    console.error(`Error creating MCP client for server ${serverUrl}:`, error);
    throw new Error(`Failed to connect to MCP server at ${serverUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clean up expired MCP clients
 */
export function cleanupMcpClients(): void {
  const now = Date.now();
  
  for (const [serverUrl, { client, timestamp, connected }] of Object.entries(mcpClientCache)) {
    if (now - timestamp > CACHE_EXPIRY_MS) {
      if (connected) {
        client.close().catch(error => {
          console.error(`Error closing MCP client for ${serverUrl}:`, error);
        });
      }
      delete mcpClientCache[serverUrl];
    }
  }
}

/**
 * Discover tools from an MCP server
 * 
 * @param serverUrl URL of the MCP server
 * @param serverName Name of the MCP server
 * @returns List of discovered tools
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
 * Execute a tool on an MCP server
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

/**
 * Check if an MCP server is available
 * 
 * @param serverUrl URL of the MCP server
 * @returns Whether the server is available
 */
export async function isMcpServerAvailable(serverUrl: string): Promise<boolean> {
  try {
    const client = await createClient({ url: serverUrl });
    await client.describeTools();
    await client.close();
    return true;
  } catch (error) {
    console.warn(`MCP server at ${serverUrl} is not available:`, error);
    return false;
  }
}