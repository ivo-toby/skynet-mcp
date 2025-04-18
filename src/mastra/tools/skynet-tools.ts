/**
 * Skynet MCP tools for Mastra agents
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for simulating agents and their status
const agents: Record<string, any> = {};

/**
 * Create Agent tool - simulates spawning a new agent
 */
export const createAgentTool = createTool({
  id: 'create-agent',
  description: 'Create a new agent to perform a task',
  inputSchema: z.object({
    task: z.string().describe('Task description for the agent'),
    modelType: z.enum(['openai', 'anthropic']).describe('Model provider to use'),
    modelId: z.string().optional().describe('Specific model ID (optional)'),
  }),
  outputSchema: z.object({
    agentId: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { task, modelType, modelId } = context;

    // Generate a unique ID for the agent
    const agentId = uuidv4();

    // Simulate agent creation
    agents[agentId] = {
      agentId,
      task,
      modelType,
      modelId,
      status: 'initializing',
      createdAt: new Date().toISOString(),
      progress: 0,
    };

    // Simulate agent starting to work
    setTimeout(() => {
      if (agents[agentId]) {
        agents[agentId].status = 'running';
        agents[agentId].progress = 0.1;
      }
    }, 500);

    return {
      agentId,
      status: 'initializing',
      message: `Agent created successfully. Task: ${task}`,
    };
  },
});

/**
 * Get Agent Status tool - retrieves the current status of an agent
 */
export const getAgentStatusTool = createTool({
  id: 'get-agent-status',
  description: 'Get the current status of an agent',
  inputSchema: z.object({
    agentId: z.string().describe('ID of the agent to check status'),
  }),
  outputSchema: z.object({
    agentId: z.string(),
    status: z.string(),
    progress: z.number(),
    message: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { agentId } = context;

    // Check if agent exists
    if (!agents[agentId]) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Simulate progress
    if (agents[agentId].status === 'running') {
      // Increment progress by 20% each time status is checked
      agents[agentId].progress = Math.min(0.9, agents[agentId].progress + 0.2);

      // If progress is at 90%, complete the task
      if (agents[agentId].progress >= 0.9) {
        agents[agentId].status = 'completed';
        agents[agentId].progress = 1.0;
        agents[agentId].result = `Completed task: ${agents[agentId].task}`;
      }
    }

    return {
      agentId,
      status: agents[agentId].status,
      progress: agents[agentId].progress,
      message:
        agents[agentId].status === 'completed'
          ? 'Task completed successfully'
          : `Agent is ${agents[agentId].status}`,
    };
  },
});

/**
 * Get Agent Result tool - retrieves the result of a completed agent
 */
export const getAgentResultTool = createTool({
  id: 'get-agent-result',
  description: 'Get the result from a completed agent',
  inputSchema: z.object({
    agentId: z.string().describe('ID of the agent to get result from'),
  }),
  outputSchema: z.object({
    agentId: z.string(),
    status: z.string(),
    result: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { agentId } = context;

    // Check if agent exists
    if (!agents[agentId]) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Check if agent has completed
    if (agents[agentId].status !== 'completed' && agents[agentId].status !== 'failed') {
      return {
        agentId,
        status: agents[agentId].status,
        error: 'Agent has not completed its task yet',
      };
    }

    return {
      agentId,
      status: agents[agentId].status,
      result: agents[agentId].result,
      error: agents[agentId].error,
    };
  },
});
