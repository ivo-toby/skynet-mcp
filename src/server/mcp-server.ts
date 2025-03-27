/**
 * Implementation of the MCP Server Layer for Skynet-MCP using FastMCP
 *
 * This file implements an MCP server using the FastMCP framework to handle
 * agent-based operations, allowing for both STDIO and SSE transport.
 */
import { FastMCP } from 'fastmcp';
import { McpServerOptions, ServerInstance } from './types.js';
import { addInvokeTool } from './tools/invoke-tool.js';
import { addDelayedResponseTool } from './tools/delayed-response-tool.js';

/**
 * Creates and configures a FastMCP server instance
 *
 * @param name Server name
 * @param version Server version
 * @returns Configured FastMCP instance
 */
export function createMcpServer(name: string, version: `${number}.${number}.${number}`): FastMCP {
  // Create the server
  const server = new FastMCP({
    name,
    version,
  });

  // Add tools to the server
  addInvokeTool(server);
  addDelayedResponseTool(server);

  return server;
}

/**
 * Starts the MCP server with the specified transport
 *
 * @param options Server configuration options
 * @returns Started server instance and stop function
 */
export async function startMcpServer(options: McpServerOptions): Promise<ServerInstance> {
  const { name, version, port = 8080, transport = 'sse' } = options;

  // Create the MCP server
  const server = createMcpServer(name, version);

  // Start the server with the specified transport
  if (transport === 'stdio') {
    // Use STDIO transport
    await server.start({ transportType: 'stdio' });
  } else {
    // Use SSE transport
    await server.start({
      transportType: 'sse',
      sse: { endpoint: '/sse', port },
    });
  }

  return {
    server,
    stop: async () => {
      await server.stop();
    },
  };
}
