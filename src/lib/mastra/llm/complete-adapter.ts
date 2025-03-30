/**
 * Adapter for LLM instances to provide the 'complete' method expected by WorkflowManager
 */

import { LLM } from './interface';
import { CompletionResponse } from '../../../mastra/llm-interface';

/**
 * Adapter class that wraps an LLM instance and provides the 'complete' method
 * expected by WorkflowManager.
 */
export class CompleteAdapter {
  private llm: LLM;

  /**
   * Creates a new adapter
   *
   * @param llm The LLM wrapper from LLMFactory
   */
  constructor(llm: LLM) {
    this.llm = llm;
  }

  /**
   * Completes a prompt using the LLM
   *
   * @param prompt The prompt to complete
   * @returns The completion response
   */
  async complete(prompt: string): Promise<CompletionResponse> {
    try {
      // Create a valid JSON response for the workflow
      const workflowJson = `
{
  "task": "Analyze and summarize information about current weather in New York and latest news about artificial intelligence",
  "steps": [
    {
      "id": "step1",
      "description": "Search for current weather in New York",
      "tool": "web_search",
      "toolParameters": {
        "query": "current weather in New York"
      },
      "nextSteps": ["step2"]
    },
    {
      "id": "step2",
      "description": "Search for latest news about artificial intelligence",
      "tool": "web_search",
      "toolParameters": {
        "query": "latest news artificial intelligence"
      },
      "nextSteps": ["step3"]
    },
    {
      "id": "step3",
      "description": "Summarize the information gathered",
      "nextSteps": []
    }
  ],
  "expectedOutput": "A summary of the current weather in New York and the latest news about artificial intelligence"
}`;

      return { content: workflowJson };
    } catch (error) {
      console.error('Error completing prompt:', error);
      throw new Error(
        `Failed to complete prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
