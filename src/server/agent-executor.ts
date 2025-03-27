/**
 * Agent execution functionality for the MCP Server
 */
import { LlmConfig, TaskResult } from './types.js';
import { executeMastraAgent } from './mastra-integration.js';

/**
 * Executes an agent task with the given configuration
 *
 * @param mcpConfig MCP server configuration
 * @param llmConfig LLM configuration
 * @param prompt Task instructions
 * @returns Agent execution result
 */
export async function executeAgentTask(
  mcpConfig: Record<string, unknown>,
  llmConfig: LlmConfig,
  prompt: string,
): Promise<TaskResult> {
  try {
    // Use our Mastra implementation to handle the agent execution
    return await executeMastraAgent(mcpConfig, llmConfig, prompt);
  } catch (error) {
    console.error('Error in executeAgentTask:', error);

    // Provide a fallback response in case of errors
    return {
      agentResponse: `Error processing agent task: ${error instanceof Error ? error.message : String(error)}`,
      provider: llmConfig.provider,
      model: llmConfig.model,
      timestamp: new Date().toISOString(),
      error: true,
    };
  }
}

/**
 * Processes an agent task asynchronously and updates its status in the task store
 *
 * @param taskId Unique task identifier
 * @param mcpConfig MCP server configuration
 * @param llmConfig LLM configuration
 * @param prompt Task instructions
 * @param onComplete Callback for task completion
 * @param onError Callback for task errors
 */
export async function processAgentTask(
  taskId: string,
  mcpConfig: Record<string, unknown>,
  llmConfig: LlmConfig,
  prompt: string,
  onComplete: (taskId: string, result: unknown) => void,
  onError: (taskId: string, error: string) => void,
): Promise<void> {
  try {
    const result = await executeAgentTask(mcpConfig, llmConfig, prompt);
    onComplete(taskId, result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    onError(taskId, errorMessage);
  }
}
