/**
 * MCP Configuration for Skynet-MCP
 *
 * This file configures Mastra to connect to various MCP servers
 * including our own Skynet-MCP server that can spawn agents.
 */
import { MCPConfiguration } from '@mastra/mcp';
import path from 'path';

/**
 * Helper for constructing the local MCP server command
 */
const getLocalMcpCommand = (serverName: string, configPath?: string) => {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // For development, run from source
    return {
      command: 'npx',
      args: ['tsx', `src/mcp-servers/${serverName}.ts`, configPath || ''].filter(Boolean),
    };
  } else {
    // For production, run the compiled version
    return {
      command: 'node',
      args: [path.join('dist', 'mcp-servers', `${serverName}.js`), configPath || ''].filter(
        Boolean,
      ),
    };
  }
};

/**
 * Create an MCP configuration that connects to all required MCP servers
 */
export const createMcpConfig = (options?: { port?: number; memoryServerUrl?: string }) => {
  const port = options?.port || 3000;
  const memoryServerUrl = options?.memoryServerUrl || `http://localhost:${port + 1}/sse`;

  return new MCPConfiguration({
    servers: {
      // Our own Skynet-MCP server running locally
      skynet: {
        url: new URL(`http://localhost:${port}/sse`),
      },

      // Memory MCP server for persistence
      memory: {
        url: new URL(memoryServerUrl),
      },

      // Sequential thinking for complex reasoning
      sequential: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      },

      // Additional tool servers that can be useful
      fetch: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-fetch'],
      },
    },
  });
};

/**
 * Create an MCP configuration for internal use
 * This is used when creating workflows that need to connect to MCP servers
 */
export const createInternalMcpConfig = () => {
  return new MCPConfiguration({
    servers: {
      // Internal agent orchestration server
      agentOrchestrator: getLocalMcpCommand('agent-orchestrator'),

      // In-memory state management
      memoryManager: getLocalMcpCommand('memory-manager'),
    },
  });
};

/**
 * Create an MCP configuration for spawned child agents
 */
export const createChildAgentMcpConfig = (parentPort: number, agentId: string) => {
  return new MCPConfiguration({
    servers: {
      // Connection back to parent
      parent: {
        url: new URL(`http://localhost:${parentPort}/agent/${agentId}/sse`),
      },

      // Connection to memory
      memory: {
        url: new URL(`http://localhost:${parentPort + 1}/sse`),
      },

      // Additional tools the child agent might need
      sequential: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      },
    },
  });
};
