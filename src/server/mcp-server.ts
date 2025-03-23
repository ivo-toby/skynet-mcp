/**
 * Implementation of the MCP Server Layer for Skynet-MCP using FastMCP
 *
 * This file implements an MCP server using the FastMCP framework to handle
 * agent-based operations, allowing for both STDIO and SSE transport.
 */
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';

// Store for delayed execution tasks
interface DelayedTask {
  taskId: string;
  status: 'in-progress' | 'completed' | 'error';
  response?: unknown;
  error?: string;
}

// Map to store delayed execution tasks
const delayedTasks = new Map<string, DelayedTask>();

/**
 * Creates and configures a FastMCP server instance
 *
 * @param name Server name
 * @param version Server version
 * @returns Configured FastMCP instance
 */
export function createMcpServer(name: string, version: `${number}.${number}.${number}`): FastMCP {
  // Create the server
  const server = new FastMCP({
    name,
    version,
  });

  // Add the Invoke tool for spawning agent tasks
  server.addTool({
    name: 'Invoke',
    description: "Invoke the MCP-server's Agent implementation to handle a task",
    parameters: z.object({
      mcpConfig: z.record(z.any()).describe('MCP-server config, tools for the agent to use'),
      llmConfig: z
        .object({
          provider: z.string().describe('The LLM provider to use'),
          model: z.string().describe('The specific model to use'),
        })
        .describe('Configuration for the LLM to use'),
      prompt: z.string().describe('Instructions for the agent'),
      delayedExecution: z
        .boolean()
        .optional()
        .describe('If true, returns a taskId and processes asynchronously'),
    }),
    execute: async (args) => {
      const { mcpConfig, llmConfig, prompt, delayedExecution = false } = args;

      // If delayed execution is requested, create a task and return the ID immediately
      if (delayedExecution) {
        const taskId = uuidv4();

        // Store the task
        delayedTasks.set(taskId, {
          taskId,
          status: 'in-progress',
        });

        // Process the agent task asynchronously
        processAgentTask(taskId, mcpConfig, llmConfig, prompt).catch((error) => {
          console.error(`Error processing agent task ${taskId}:`, error);
          delayedTasks.set(taskId, {
            taskId,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        });

        // Return the task ID immediately
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ taskId, status: 'in-progress' }),
            },
          ],
        };
      }

      // For synchronous execution, process the task and wait for the result
      try {
        const result = await executeSkynetAgent(mcpConfig, llmConfig, prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        console.error('Error executing agent task:', error);
        throw new UserError(
          `Failed to execute agent: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  });

  // Add the DelayedResponse tool for checking task status
  server.addTool({
    name: 'DelayedResponse',
    description: 'Check the status of a delayed agent task or retrieve its result',
    parameters: z.object({
      taskId: z.string().describe('The ID of the task to check'),
    }),
    execute: async (args) => {
      const { taskId } = args;

      // Check if the task exists
      const task = delayedTasks.get(taskId);
      if (!task) {
        throw new UserError(`Task with ID ${taskId} not found`);
      }

      // Return the current status
      if (task.status === 'in-progress') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ taskId, status: 'in-progress' }),
            },
          ],
        };
      } else if (task.status === 'error') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                taskId,
                status: 'error',
                error: task.error,
              }),
            },
          ],
          isError: true,
        };
      } else {
        // Task is completed, return the result
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                taskId,
                status: 'completed',
                result: task.response,
              }),
            },
          ],
        };
      }
    },
  });

  return server;
}

/**
 * Processes an agent task asynchronously
 *
 * @param taskId Unique task identifier
 * @param mcpConfig MCP server configuration
 * @param llmConfig LLM configuration
 * @param prompt Task instructions
 */
async function processAgentTask(
  taskId: string,
  mcpConfig: Record<string, unknown>,
  llmConfig: { provider: string; model: string },
  prompt: string,
): Promise<void> {
  try {
    const result = await executeSkynetAgent(mcpConfig, llmConfig, prompt);

    // Update task with completed status and result
    delayedTasks.set(taskId, {
      taskId,
      status: 'completed',
      response: result,
    });
  } catch (error) {
    // Update task with error status
    delayedTasks.set(taskId, {
      taskId,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Executes a Skynet agent with the given configuration
 *
 * @param mcpConfig MCP server configuration
 * @param llmConfig LLM configuration
 * @param prompt Task instructions
 * @returns Agent execution result
 */
async function executeSkynetAgent(
  mcpConfig: Record<string, unknown>,
  llmConfig: { provider: string; model: string },
  prompt: string,
): Promise<unknown> {
  // TODO: Implement the actual agent execution logic
  // This is a placeholder that simulates processing time
  // In a real implementation, this would create and run an agent with the provided tools and prompt

  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    agentResponse: `Processed agent task with prompt: ${prompt.substring(0, 50)}...`,
    provider: llmConfig.provider,
    model: llmConfig.model,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Starts the MCP server with the specified transport
 *
 * @param options Server configuration options
 * @returns Started server instance
 */
export async function startMcpServer(options: {
  name: string;
  version: `${number}.${number}.${number}`;
  port?: number;
  transport?: 'stdio' | 'sse';
}): Promise<{
  server: FastMCP;
  stop: () => Promise<void>;
}> {
  const { name, version, port = 8080, transport = 'sse' } = options;

  // Create the MCP server
  const server = createMcpServer(name, version);

  // Start the server with the specified transport
  if (transport === 'stdio') {
    // Use STDIO transport
    await server.start({ transportType: 'stdio' });

    return {
      server,
      stop: async () => {
        await server.stop();
      },
    };
  } else {
    // Use SSE transport
    // Create Express app and HTTP server
    await server.start({
      transportType: 'sse',
      sse: { endpoint: '/sse', port },
    });

    return {
      server,
      stop: async () => {
        await server.stop();
      },
    };
  }
}
