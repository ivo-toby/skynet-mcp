/**
 * MCP Server Manager for Skynet-MCP
 * 
 * This module provides functionality for managing MCP server connections,
 * including detection, health checking, and connection management.
 */

import { isMcpServerAvailable } from './mcp-client.js';

/**
 * Configuration for an MCP server
 */
export interface McpServerConfig {
  url: string;
  name: string;
  enabled: boolean;
}

/**
 * Status of an MCP server
 */
export interface McpServerStatus {
  url: string;
  name: string;
  available: boolean;
  lastChecked: number;
}

/**
 * Manager for MCP server connections
 */
export class McpServerManager {
  private servers: Map<string, McpServerConfig> = new Map();
  private serverStatus: Map<string, McpServerStatus> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  
  /**
   * Creates a new MCP server manager
   * 
   * @param config Configuration options
   */
  constructor(private config: {
    checkIntervalMs?: number; // How often to check server health
    timeoutMs?: number; // Timeout for server health checks
  } = {}) {
    // Set default values
    this.config.checkIntervalMs = config.checkIntervalMs ?? 60000; // Default 1 minute
    this.config.timeoutMs = config.timeoutMs ?? 5000; // Default 5 seconds
  }
  
  /**
   * Register an MCP server with the manager
   * 
   * @param server Server configuration
   */
  registerServer(server: McpServerConfig): void {
    this.servers.set(server.url, server);
    
    // Initialize server status
    this.serverStatus.set(server.url, {
      url: server.url,
      name: server.name,
      available: false,
      lastChecked: 0
    });
    
    // Check server health immediately
    this.checkServerHealth(server.url).catch(error => {
      console.error(`Error checking health of server ${server.name} (${server.url}):`, error);
    });
  }
  
  /**
   * Register multiple MCP servers with the manager
   * 
   * @param servers Server configurations
   */
  registerServers(servers: McpServerConfig[]): void {
    for (const server of servers) {
      this.registerServer(server);
    }
  }
  
  /**
   * Get the status of an MCP server
   * 
   * @param url Server URL
   * @returns Server status
   */
  getServerStatus(url: string): McpServerStatus | undefined {
    return this.serverStatus.get(url);
  }
  
  /**
   * Get the status of all registered MCP servers
   * 
   * @returns Array of server statuses
   */
  getAllServerStatus(): McpServerStatus[] {
    return Array.from(this.serverStatus.values());
  }
  
  /**
   * Check the health of an MCP server
   * 
   * @param url Server URL
   * @returns Whether the server is available
   */
  async checkServerHealth(url: string): Promise<boolean> {
    const server = this.servers.get(url);
    if (!server || !server.enabled) {
      // Server is not registered or is disabled
      const status = this.serverStatus.get(url);
      if (status) {
        status.available = false;
        status.lastChecked = Date.now();
      }
      return false;
    }
    
    try {
      // Check if the server is available
      const available = await isMcpServerAvailable(url);
      
      // Update server status
      const status = this.serverStatus.get(url);
      if (status) {
        status.available = available;
        status.lastChecked = Date.now();
      }
      
      console.log(`MCP server ${server.name} (${url}) is ${available ? 'available' : 'unavailable'}`);
      
      return available;
    } catch (error) {
      console.error(`Error checking health of MCP server ${server.name} (${url}):`, error);
      
      // Update server status
      const status = this.serverStatus.get(url);
      if (status) {
        status.available = false;
        status.lastChecked = Date.now();
      }
      
      return false;
    }
  }
  
  /**
   * Check the health of all registered MCP servers
   */
  async checkAllServerHealth(): Promise<void> {
    console.log('Checking health of all MCP servers...');
    
    // Check each server in parallel
    const checkPromises = Array.from(this.servers.keys()).map(url => 
      this.checkServerHealth(url)
    );
    
    await Promise.all(checkPromises);
    
    console.log('MCP server health check completed');
  }
  
  /**
   * Start periodic health checks for MCP servers
   */
  startHealthChecks(): void {
    if (this.checkInterval) {
      // Health checks are already running
      return;
    }
    
    console.log(`Starting MCP server health checks (interval: ${this.config.checkIntervalMs}ms)`);
    
    // Start the health check interval
    this.checkInterval = setInterval(() => {
      this.checkAllServerHealth().catch(error => {
        console.error('Error checking MCP server health:', error);
      });
    }, this.config.checkIntervalMs);
    
    // Run an initial health check
    this.checkAllServerHealth().catch(error => {
      console.error('Error running initial MCP server health check:', error);
    });
  }
  
  /**
   * Stop periodic health checks for MCP servers
   */
  stopHealthChecks(): void {
    if (this.checkInterval) {
      console.log('Stopping MCP server health checks');
      
      // Clear the health check interval
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  /**
   * Get all available MCP servers
   * 
   * @returns Array of available server configurations
   */
  getAvailableServers(): McpServerConfig[] {
    return Array.from(this.servers.values())
      .filter(server => {
        const status = this.serverStatus.get(server.url);
        return status?.available && server.enabled;
      });
  }
}

/**
 * Create a singleton instance of the MCP server manager
 */
let mcpServerManager: McpServerManager | null = null;

/**
 * Get the MCP server manager instance
 * 
 * @param config Configuration options for the manager
 * @returns The MCP server manager instance
 */
export function getMcpServerManager(config?: {
  checkIntervalMs?: number;
  timeoutMs?: number;
}): McpServerManager {
  if (!mcpServerManager) {
    mcpServerManager = new McpServerManager(config);
  }
  return mcpServerManager;
}