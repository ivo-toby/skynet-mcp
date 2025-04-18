import { z } from 'zod';

// Basic MCP message structure
export const MCPMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  sender: z.string(), // Could be 'user', 'agent', 'system', etc.
  // Content type will vary, define specific schemas later
  content: z.unknown(),
});

export type MCPMessage = z.infer<typeof MCPMessageSchema>;

// Tool Call content
export const MCPToolCallContentSchema = z.object({
  toolName: z.string(),
  toolArguments: z.record(z.unknown()), // Arguments are tool-specific
});

export type MCPToolCallContent = z.infer<typeof MCPToolCallContentSchema>;

// Tool Result content
export const MCPToolResultContentSchema = z.object({
  toolName: z.string(),
  result: z.unknown(), // Result structure is tool-specific
  isError: z.boolean().optional(),
});

export type MCPToolResultContent = z.infer<typeof MCPToolResultContentSchema>;

// Basic Agent Configuration
export const AgentConfigSchema = z.object({
  agentId: z.string().uuid(),
  model: z.string(), // e.g., 'openai/gpt-4', 'anthropic/claude-3'
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).optional(), // List of enabled tool names
  maxTokens: z.number().int().positive().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Basic Tool Interface Definition (more specific schemas needed per tool)
export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()), // Zod schema for input validation
  // Function to execute the tool
  execute: z.function().args(z.unknown()).returns(z.promise(z.unknown())),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// Request/Response types for API (example: Create Agent)
export const CreateAgentRequestSchema = z.object({
  config: AgentConfigSchema,
  initialMessage: z.string().optional(),
});

export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;

export const CreateAgentResponseSchema = z.object({
  agentId: z.string().uuid(),
  status: z.enum(['creating', 'running', 'completed', 'failed']),
});

export type CreateAgentResponse = z.infer<typeof CreateAgentResponseSchema>;
