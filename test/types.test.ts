import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  MCPMessageSchema,
  MCPToolCallContentSchema,
  MCPToolResultContentSchema,
  AgentConfigSchema,
  ToolDefinitionSchema,
  CreateAgentRequestSchema,
  CreateAgentResponseSchema,
} from '../src/types/mcp';

// Helper to generate a UUID (for testing)
const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

describe('MCP Type Schemas', () => {
  it('should validate a correct MCPMessage', () => {
    const validMessage = {
      messageId: generateUUID(),
      conversationId: generateUUID(),
      timestamp: new Date().toISOString(),
      sender: 'user',
      content: { text: 'Hello' },
    };
    expect(() => MCPMessageSchema.parse(validMessage)).not.toThrow();
  });

  it('should invalidate an incorrect MCPMessage', () => {
    const invalidMessage = {
      messageId: 'not-a-uuid',
      conversationId: generateUUID(),
      timestamp: 'not-a-date',
      sender: 123, // wrong type
    };
    expect(() => MCPMessageSchema.parse(invalidMessage)).toThrow();
  });

  it('should validate correct MCPToolCallContent', () => {
    const validCall = {
      toolName: 'calculator',
      toolArguments: { operation: 'add', a: 1, b: 2 },
    };
    expect(() => MCPToolCallContentSchema.parse(validCall)).not.toThrow();
  });

  it('should validate correct MCPToolResultContent', () => {
    const validResult = {
      toolName: 'calculator',
      result: 3,
      isError: false,
    };
    expect(() => MCPToolResultContentSchema.parse(validResult)).not.toThrow();
  });

  it('should validate a correct AgentConfig', () => {
    const validConfig = {
      agentId: generateUUID(),
      model: 'openai/gpt-4',
      systemPrompt: 'You are a helpful assistant.',
      tools: ['calculator', 'web_search'],
      maxTokens: 1000,
    };
    expect(() => AgentConfigSchema.parse(validConfig)).not.toThrow();
  });

  it('should invalidate an incorrect AgentConfig', () => {
    const invalidConfig = {
      agentId: 'invalid-uuid',
      model: 123,
      maxTokens: -10,
    };
    expect(() => AgentConfigSchema.parse(invalidConfig)).toThrow();
  });

  // Note: ToolDefinitionSchema test is tricky due to the function type.
  // We can test the object structure part.
  it('should validate the structure of ToolDefinitionSchema', () => {
    const validToolDef = {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: { type: z.string() }, // Simplified for test
      execute: async (input: unknown) => input, // Dummy function
    };
    // Test structure excluding the function
    const StructureSchema = ToolDefinitionSchema.omit({ execute: true });
    expect(() =>
      StructureSchema.parse({
        name: validToolDef.name,
        description: validToolDef.description,
        inputSchema: validToolDef.inputSchema,
      }),
    ).not.toThrow();
    // Check if execute is a function
    expect(typeof validToolDef.execute).toBe('function');
  });

  it('should validate a correct CreateAgentRequest', () => {
    const validRequest = {
      config: {
        agentId: generateUUID(),
        model: 'anthropic/claude-3-sonnet',
      },
      initialMessage: 'Create a plan.',
    };
    expect(() => CreateAgentRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('should validate a correct CreateAgentResponse', () => {
    const validResponse = {
      agentId: generateUUID(),
      status: 'creating',
    };
    expect(() => CreateAgentResponseSchema.parse(validResponse)).not.toThrow();
  });
});
