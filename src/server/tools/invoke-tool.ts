/**
 * Invoke tool implementation for the MCP Server
 */
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { LlmConfig } from '../types.js';
import { taskStore } from '../task-store.js';
import { executeAgentTask, processAgentTask } from '../agent-executor.js';

/**
 * Adds the Invoke tool to the server
 * 
 * @param server FastMCP server instance
 */
export function addInvokeTool(server: FastMCP): void {
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
        return handleDelayedExecution(mcpConfig, llmConfig, prompt);
      }

      // For synchronous execution, process the task and wait for the result
      return handleSynchronousExecution(mcpConfig, llmConfig, prompt);
    },
  });
}

/**
 * Handles delayed execution requests
 */
function handleDelayedExecution(
  mcpConfig: Record<string, unknown>,
  llmConfig: LlmConfig,
  prompt: string,
) {
  const taskId = uuidv4();
  
  // Create the task
  taskStore.createTask(taskId);

  // Process the agent task asynchronously
  processAgentTask(
    taskId, 
    mcpConfig, 
    llmConfig, 
    prompt,
    // Success callback
    (id, result) => taskStore.completeTask(id, result),
    // Error callback
    (id, error) => taskStore.failTask(id, error)
  ).catch((error) => {
    console.error(`Error processing agent task ${taskId}:`, error);
    taskStore.failTask(
      taskId, 
      error instanceof Error ? error.message : String(error)
    );
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

/**
 * Handles synchronous execution requests
 */
async function handleSynchronousExecution(
  mcpConfig: Record<string, unknown>,
  llmConfig: LlmConfig,
  prompt: string,
) {
  try {
    const result = await executeAgentTask(mcpConfig, llmConfig, prompt);
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
}
