/**
 * MCP Agent Factory for Skynet-MCP
 *
 * This module provides functions to create Mastra agents that integrate with MCP servers
 * for advanced capabilities like agent hierarchies and tool use.
 */
import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core';
import { createMcpConfig } from '../config/mcp-config';
import { getModelFromConfig, ModelConfig } from '../utils/model-config';
import {
  createTaskDecompositionWorkflow,
  createAgentExecutionWorkflow,
} from '../workflows/mcp-workflow';

/**
 * Options for creating an agent that can spawn other agents
 */
export interface AgentFactoryOptions {
  name?: string;
  instructions?: string;
  modelConfig: ModelConfig;
  port: number;
}

/**
 * Default instructions for a coordinator agent
 */
const DEFAULT_COORDINATOR_INSTRUCTIONS = `You are a Coordinator Agent that can break down complex tasks into subtasks and assign them to specialized Worker Agents.

Your capabilities:
1. Analyze tasks to determine the best decomposition strategy
2. Create child agents with appropriate models and tools for each subtask
3. Monitor the progress of child agents
4. Aggregate results from multiple agents into a coherent response

When handling a task:
- First analyze the task complexity and requirements
- Break it down into logical subtasks
- Assign appropriate AI models to each subtask based on complexity
- Monitor execution and collect results
- Provide a coherent final response that incorporates all agent contributions

Be efficient, thorough, and focused on delivering high-quality results.`;

/**
 * Create a Mastra instance configured with MCP-capable agents
 */
export function createMastraWithMcp(options: { port: number }) {
  // Create the Mastra instance
  const mastra = new Mastra();

  // Initialize MCP configuration
  const mcpConfig = createMcpConfig({ port: options.port });

  return { mastra, mcpConfig };
}

/**
 * Create a coordinator agent capable of spawning child agents
 */
export async function createCoordinatorAgent(options: AgentFactoryOptions) {
  // Initialize Mastra and MCP
  const { mastra, mcpConfig } = createMastraWithMcp({ port: options.port });

  // Get MCP tools for agent
  const mcpTools = await mcpConfig.getTools();

  // Create the coordinator agent
  const agent = new Agent({
    name: options.name || 'Coordinator Agent',
    instructions: options.instructions || DEFAULT_COORDINATOR_INSTRUCTIONS,
    model: getModelFromConfig(options.modelConfig),
    tools: {
      ...mcpTools,
      spawnAgent: {
        description: 'Spawn a new agent to work on a subtask',
        schema: {
          type: 'object',
          required: ['task', 'modelType'],
          properties: {
            task: {
              type: 'string',
              description: 'Task description for the agent',
            },
            modelType: {
              type: 'string',
              enum: ['basic', 'standard', 'advanced'],
              description: 'Type of model to use (basic, standard, advanced)',
            },
            tools: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of tool IDs to provide to the agent',
            },
          },
        },
        execute: async (args) => {
          console.log(`Spawning agent for task: ${args.task}`);

          // Map model types to actual models
          const modelMap = {
            basic:
              options.modelConfig.provider === 'openai'
                ? 'gpt-3.5-turbo'
                : 'claude-3-haiku-20240307',
            standard:
              options.modelConfig.provider === 'openai'
                ? 'gpt-4o-mini'
                : 'claude-3-sonnet-20240229',
            advanced:
              options.modelConfig.provider === 'openai' ? 'gpt-4o' : 'claude-3-opus-20240229',
          };

          // Create a workflow to execute the child agent
          const workflow = createAgentExecutionWorkflow(mastra, {
            port: options.port,
            agentConfig: {
              modelId: modelMap[args.modelType as 'basic' | 'standard' | 'advanced'],
              temperature: 0.7,
              maxTokens: 4096,
              task: {
                description: args.task,
              },
              mcpTools: args.tools,
              timeoutSeconds: 300,
            },
          });

          // Run the workflow
          const { runId, start } = workflow.createRun();
          const result = await start({
            triggerData: {
              agentConfig: {
                modelId: modelMap[args.modelType as 'basic' | 'standard' | 'advanced'],
                temperature: 0.7,
                maxTokens: 4096,
                task: {
                  description: args.task,
                },
                mcpTools: args.tools,
                timeoutSeconds: 300,
              },
              runId,
            },
          });

          // Return the result
          return {
            agentId: runId,
            status: 'completed',
            result: result.results.executeTask.result,
          };
        },
      },

      decomposeTask: {
        description: 'Break down a complex task into subtasks',
        schema: {
          type: 'object',
          required: ['task'],
          properties: {
            task: {
              type: 'string',
              description: 'The complex task to decompose',
            },
            additionalContext: {
              type: 'string',
              description: 'Additional context to help with decomposition',
            },
          },
        },
        execute: async (args) => {
          console.log(`Decomposing task: ${args.task}`);

          // Create a workflow to decompose the task
          const workflow = createTaskDecompositionWorkflow(mastra, {
            port: options.port,
            taskDescription: args.task,
            provider: options.modelConfig.provider,
          });

          // Run the workflow
          const { runId, start } = workflow.createRun();
          const result = await start({
            triggerData: {
              taskDescription: args.task,
              additionalContext: args.additionalContext,
            },
          });

          // Return the decomposition plan
          return {
            decompositionId: runId,
            status: 'completed',
            plan: result.results.analyzeTask.decompositionPlan,
            summary: `Task decomposed into ${result.results.analyzeTask.decompositionPlan.subtasks.length} subtasks`,
          };
        },
      },
    },
  });

  return { agent, mastra };
}

/**
 * Create a worker agent that focuses on a specific task
 */
export async function createWorkerAgent(
  options: AgentFactoryOptions & {
    taskDescription: string;
    specificTools?: string[];
  },
) {
  // Initialize Mastra and MCP
  const { mastra, mcpConfig } = createMastraWithMcp({ port: options.port });

  // Get MCP tools for agent, limiting to specific tools if provided
  const allTools = await mcpConfig.getTools();

  // Filter tools if specificTools is provided
  const toolNames = options.specificTools || Object.keys(allTools);
  const tools = Object.fromEntries(
    Object.entries(allTools).filter(([name]) => toolNames.includes(name)),
  );

  // Create worker agent instructions
  const instructions =
    options.instructions ||
    `You are a Worker Agent focused on completing the following task:

    TASK: ${options.taskDescription}

    Focus solely on this task and produce a clear, complete result. Use the tools available to you to gather information, analyze data, and generate high-quality outputs. Work efficiently and thoroughly.`;

  // Create the worker agent
  const agent = new Agent({
    name: options.name || `Worker Agent for ${options.taskDescription.slice(0, 30)}...`,
    instructions,
    model: getModelFromConfig(options.modelConfig),
    tools,
  });

  return { agent, mastra };
}
