/**
 * Agent configuration for creating a new agent
 */
export interface AgentConfig {
  modelId: string; // e.g., "anthropic.claude-3-opus"
  temperature: number; // e.g., 0.7
  maxTokens: number; // e.g., 4096
  task: {
    description: string;
    context?: string;
    expectedOutput?: string;
  };
  mcpTools?: string[]; // Available tool IDs
  timeoutSeconds: number; // Maximum execution time
}

/**
 * Agent status representation
 */
export interface AgentStatus {
  agentId: string;
  status: 'initializing' | 'running' | 'completed' | 'failed';
  progress: number; // 0.0 to 1.0
  runningTime: number; // Seconds
  childAgents: {
    agentId: string;
    status: string;
    task: string;
  }[];
  lastUpdated: string; // ISO timestamp
}

/**
 * Complete Agent data structure for internal use
 */
export interface Agent {
  agentId: string;
  status: 'initializing' | 'running' | 'completed' | 'failed';
  progress: number;
  runningTime: number;
  childAgents: {
    agentId: string;
    status: string;
    task: string;
  }[];
  result?: any;
  error?: string;
  startTime: number;
  lastUpdated: string;
  modelId: string;
  task: {
    description: string;
    context?: string;
    expectedOutput?: string;
  };
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  agentId: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string; // ISO timestamp
}

/**
 * Agent result response
 */
export interface AgentResult {
  agentId: string;
  result: any;
  runningTime: number;
}
