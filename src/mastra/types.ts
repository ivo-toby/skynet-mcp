/**
 * Common types for the Mastra implementation
 */

/**
 * Configuration for a tool server
 */
export interface ToolServerConfig {
  url: string;
  name: string;
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
 * Base configuration for agents
 */
export interface AgentConfig {
  toolServers: ToolServerConfig[];
  maxToolCalls?: number;
}

/**
 * Simplified LanguageModelV1 interface to avoid dependency conflicts
 */
export interface LanguageModelResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
