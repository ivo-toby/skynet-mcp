/**
 * Shared types for MCP server
 */
import { FastMCP } from 'fastmcp';

/**
 * Configuration for the language model
 */
export interface LlmConfig {
  provider: string;
  model: string;
}

/**
 * Result of an agent task execution
 */
export interface TaskResult {
  agentResponse: string;
  provider: string;
  model: string;
  timestamp: string;
  error?: boolean;
}

/**
 * Represents a task for delayed execution
 */
export interface DelayedTask {
  taskId: string;
  status: 'in-progress' | 'completed' | 'error';
  response?: unknown;
  error?: string;
}

/**
 * Options for configuring and starting the MCP server
 */
export interface McpServerOptions {
  name: string;
  version: `${number}.${number}.${number}`;
  port?: number;
  transport?: 'stdio' | 'sse';
}

/**
 * Server instance and stop function
 */
export interface ServerInstance {
  server: FastMCP;
  stop: () => Promise<void>;
}
