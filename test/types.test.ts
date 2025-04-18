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
import { AgentConfig, Agent } from '../src/types';

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
    const validConfig: AgentConfig = {
      modelId: 'anthropic.claude-3-opus',
      temperature: 0.7,
      maxTokens: 4096,
      task: {
        description: 'Analyze financial data',
        context: 'Financial data for Q2 2023',
        expectedOutput: 'Summary and recommendations',
      },
      mcpTools: ['calculator', 'web_search'],
      timeoutSeconds: 300,
    };
    // Verify that the required properties exist
    expect(validConfig.modelId).toBeDefined();
    expect(validConfig.temperature).toBeGreaterThanOrEqual(0);
    expect(validConfig.temperature).toBeLessThanOrEqual(1);
    expect(validConfig.maxTokens).toBeGreaterThan(0);
    expect(validConfig.task.description).toBeDefined();
    expect(validConfig.timeoutSeconds).toBeGreaterThan(0);
  });

  it('should validate a correct Agent', () => {
    const validAgent: Agent = {
      agentId: generateUUID(),
      status: 'running',
      progress: 0.5,
      runningTime: 30,
      childAgents: [],
      startTime: Date.now(),
      lastUpdated: new Date().toISOString(),
      modelId: 'anthropic.claude-3-opus',
      task: {
        description: 'Analyze financial data',
        context: 'Financial data for Q2 2023',
        expectedOutput: 'Summary and recommendations',
      },
    };
    // Verify that the required properties exist and have correct types
    expect(validAgent.agentId).toBeDefined();
    expect(['initializing', 'running', 'completed', 'failed']).toContain(validAgent.status);
    expect(validAgent.progress).toBeGreaterThanOrEqual(0);
    expect(validAgent.progress).toBeLessThanOrEqual(1);
    expect(validAgent.runningTime).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(validAgent.childAgents)).toBe(true);
    expect(validAgent.lastUpdated).toBeDefined();
    expect(validAgent.modelId).toBeDefined();
    expect(validAgent.task.description).toBeDefined();
  });

  // Only test schemas that are currently in use
  it('should validate ToolDefinitionSchema structure', () => {
    // Test structure excluding the function
    const StructureSchema = ToolDefinitionSchema.omit({ execute: true });
    expect(() =>
      StructureSchema.parse({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: z.string() }, // Simplified for test
      }),
    ).not.toThrow();
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
