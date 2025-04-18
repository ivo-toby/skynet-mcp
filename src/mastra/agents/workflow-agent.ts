/**
 * Workflow Agent for Mastra
 */
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { getModelFromConfig } from '../utils/model-config';
import { createAgentTool, getAgentStatusTool, getAgentResultTool } from '../tools/skynet-tools';

/**
 * Workflow agent capable of creating and executing dynamic workflows
 */
export const workflowAgent = new Agent({
  name: 'Workflow Agent',
  instructions: `You are an AI agent that specializes in creating and managing workflows.

You can help users with the following tasks:
1. Create new agents to perform specific tasks
2. Check on the status of running agents
3. Retrieve results from completed agents
4. Create dynamic workflows for complex tasks

When creating an agent or workflow:
- Ask clarifying questions to understand the task requirements
- Choose the appropriate model based on task complexity
- Break down complex tasks into manageable steps
- Provide status updates when requested

Be professional, efficient, and focused on delivering accurate results.`,
  model: getModelFromConfig({
    provider: 'anthropic',
    modelId: 'claude-3-sonnet-20240229',
  }),
  tools: {
    createAgentTool,
    getAgentStatusTool,
    getAgentResultTool,
  },
});

/**
 * Creates a customized workflow agent with specific configuration
 */
export const createWorkflowAgent = (config: {
  provider: 'openai' | 'anthropic';
  modelId?: string;
  temperature?: number;
  maxSteps?: number;
}) => {
  return new Agent({
    name: `Workflow Agent (${config.provider}/${config.modelId || 'default'})`,
    instructions: `You are an AI agent that specializes in creating and managing workflows.

You can help users with the following tasks:
1. Create new agents to perform specific tasks
2. Check on the status of running agents
3. Retrieve results from completed agents
4. Create dynamic workflows for complex tasks

When creating an agent or workflow:
- Ask clarifying questions to understand the task requirements
- Choose the appropriate model based on task complexity
- Break down complex tasks into manageable steps
- Provide status updates when requested

Be professional, efficient, and focused on delivering accurate results.`,
    model: getModelFromConfig({
      provider: config.provider,
      modelId: config.modelId,
      temperature: config.temperature,
    }),
    tools: {
      createAgentTool,
      getAgentStatusTool,
      getAgentResultTool,
    },
  });
};
