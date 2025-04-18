import { FastMCP, ContentResult } from 'fastmcp';
import { z } from 'zod';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from './types';

interface StartMcpServerOptions {
  name: string;
  version: string;
  port: number;
  transport: 'stdio' | 'sse';
}

// Global agent store
const agents: Record<string, Agent> = {};

export async function startMcpServer(options: StartMcpServerOptions) {
  // Create a FastMCP server
  const server = new FastMCP({
    name: options.name,
    version: '1.0.0', // Fixed semver format version
  });

  // Add spawn_agent tool
  server.addTool({
    name: 'spawn_agent',
    description: 'Spawn a new agent to perform a specific task',
    parameters: z.object({
      modelId: z.string().describe('Model ID to use (e.g., "anthropic.claude-3-opus")'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .default(0.7)
        .describe('Temperature for model generation'),
      maxTokens: z.number().default(4096).describe('Maximum tokens for model response'),
      task: z.object({
        description: z.string().describe('Task description for the agent'),
        context: z.string().optional().describe('Additional context for the task'),
        expectedOutput: z.string().optional().describe('Format or type of output expected'),
      }),
      mcpTools: z.array(z.string()).optional().describe('Available tool IDs for the agent'),
      timeoutSeconds: z.number().default(300).describe('Maximum execution time in seconds'),
    }),
    execute: async (args, { log }) => {
      const agentId = uuidv4();
      log.info(`Creating agent ${agentId} with model ${args.modelId}`);

      // Create new agent record
      agents[agentId] = {
        agentId,
        status: 'initializing',
        progress: 0,
        runningTime: 0,
        childAgents: [],
        startTime: Date.now(),
        lastUpdated: new Date().toISOString(),
        modelId: args.modelId,
        task: args.task,
      };

      // Simulate agent initialization
      setTimeout(() => {
        if (agents[agentId]) {
          agents[agentId].status = 'running';
          agents[agentId].lastUpdated = new Date().toISOString();
        }
      }, 1000);

      return agentId;
    },
  });

  // Add get_agent_status tool
  server.addTool({
    name: 'get_agent_status',
    description: 'Get the current status of an agent',
    parameters: z.object({
      agentId: z.string().describe('ID of the agent to get status for'),
    }),
    execute: async (args, { log }) => {
      const agent = agents[args.agentId];

      if (!agent) {
        log.error(`Agent ${args.agentId} not found`);
        throw new Error(`Agent ${args.agentId} not found`);
      }

      // Update running time
      if (agent.status === 'running' || agent.status === 'initializing') {
        agent.runningTime = Math.floor((Date.now() - agent.startTime) / 1000);
      }

      return JSON.stringify({
        agentId: agent.agentId,
        status: agent.status,
        progress: agent.progress,
        runningTime: agent.runningTime,
        childAgents: agent.childAgents,
        lastUpdated: agent.lastUpdated,
      });
    },
  });

  // Add get_agent_result tool
  server.addTool({
    name: 'get_agent_result',
    description: 'Get the result of a completed agent task',
    parameters: z.object({
      agentId: z.string().describe('ID of the agent to get result for'),
    }),
    execute: async (args, { log }) => {
      const agent = agents[args.agentId];

      if (!agent) {
        log.error(`Agent ${args.agentId} not found`);
        throw new Error(`Agent ${args.agentId} not found`);
      }

      if (agent.status !== 'completed') {
        log.warn(`Agent ${args.agentId} is not completed yet (status: ${agent.status})`);
        return JSON.stringify({
          agentId: agent.agentId,
          status: agent.status,
          message: 'Agent has not completed its task yet',
        });
      }

      return JSON.stringify({
        agentId: agent.agentId,
        result: agent.result,
        runningTime: agent.runningTime,
      });
    },
  });

  // Add terminate_agent tool
  server.addTool({
    name: 'terminate_agent',
    description: 'Terminate a running agent',
    parameters: z.object({
      agentId: z.string().describe('ID of the agent to terminate'),
    }),
    execute: async (args, { log }) => {
      const agent = agents[args.agentId];

      if (!agent) {
        log.error(`Agent ${args.agentId} not found`);
        throw new Error(`Agent ${args.agentId} not found`);
      }

      if (agent.status !== 'running' && agent.status !== 'initializing') {
        log.warn(`Agent ${args.agentId} is already in ${agent.status} state, cannot terminate`);
        return JSON.stringify({
          agentId: agent.agentId,
          status: agent.status,
          message: `Agent is already in ${agent.status} state`,
        });
      }

      // Update agent status
      agent.status = 'failed';
      agent.error = 'Agent was terminated by user request';
      agent.lastUpdated = new Date().toISOString();
      agent.runningTime = Math.floor((Date.now() - agent.startTime) / 1000);

      log.info(`Agent ${args.agentId} terminated successfully`);

      return JSON.stringify({
        agentId: agent.agentId,
        status: agent.status,
        message: 'Agent terminated successfully',
      });
    },
  });

  // Add token usage tracking resource
  server.addResource({
    uri: 'data://token-usage',
    name: 'Token Usage Statistics',
    description: 'Returns token usage statistics for agents',
    mimeType: 'application/json',
    async load() {
      // In a real implementation, this would track actual token usage
      const usageData = Object.values(agents).map((agent) => ({
        agentId: agent.agentId,
        modelId: agent.modelId,
        promptTokens: Math.floor(Math.random() * 1000) + 500,
        completionTokens: Math.floor(Math.random() * 2000) + 500,
        totalTokens: Math.floor(Math.random() * 3000) + 1000,
        timestamp: agent.lastUpdated,
      }));

      return {
        text: JSON.stringify(usageData),
      };
    },
  });

  // Start the server with the specified transport
  if (options.transport === 'stdio') {
    server.start({
      transportType: 'stdio',
    });
    return { httpServer: null };
  } else {
    // SSE transport
    const httpServer = createServer();

    // Start the server
    server.start({
      transportType: 'sse',
      sse: {
        endpoint: '/sse',
        port: options.port,
      },
    });

    return { httpServer };
  }
}
