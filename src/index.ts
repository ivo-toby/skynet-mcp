// This file re-exports functionality from the 'fastmcp' npm package
export * from 'fastmcp';

// Export the startMcpServer function
export { startMcpServer } from './startMcpServer';

// Export Skynet-MCP specific types
export type { Agent, AgentStatus, AgentConfig, TokenUsage } from './types';

// Export tool names as constants
export const SKYNET_MCP_TOOLS = {
  SPAWN_AGENT: 'spawn_agent',
  GET_AGENT_STATUS: 'get_agent_status',
  GET_AGENT_RESULT: 'get_agent_result',
  TERMINATE_AGENT: 'terminate_agent',
};

// Export resource URIs as constants
export const SKYNET_MCP_RESOURCES = {
  TOKEN_USAGE: 'data://token-usage',
};

// Export any additional functionality specific to this project
// Examples:
// export { customTool } from './customTools';
// export { customResource } from './customResources';
