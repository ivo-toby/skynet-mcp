/**
 * DelayedResponse tool implementation for the MCP Server
 */
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { DelayedTask } from '../types.js';
import { taskStore } from '../task-store.js';

/**
 * Adds the DelayedResponse tool to the server
 * 
 * @param server FastMCP server instance
 */
export function addDelayedResponseTool(server: FastMCP): void {
  server.addTool({
    name: 'DelayedResponse',
    description: 'Check the status of a delayed agent task or retrieve its result',
    parameters: z.object({
      taskId: z.string().describe('The ID of the task to check'),
    }),
    execute: async (args) => {
      const { taskId } = args;

      // Check if the task exists
      const task = taskStore.getTask(taskId);
      if (!task) {
        throw new UserError(`Task with ID ${taskId} not found`);
      }

      // Return the appropriate response based on task status
      return createTaskStatusResponse(task);
    },
  });
}

/**
 * Creates a response object based on the task status
 * 
 * @param task The delayed task
 * @returns Response object for the DelayedResponse tool
 */
function createTaskStatusResponse(task: DelayedTask) {
  if (task.status === 'in-progress') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ taskId: task.taskId, status: 'in-progress' }),
        },
      ],
    };
  } else if (task.status === 'error') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            taskId: task.taskId,
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
            taskId: task.taskId,
            status: 'completed',
            result: task.response,
          }),
        },
      ],
    };
  }
}
