/**
 * Integration between the MCP server and the Mastra dynamic workflow system
 *
 * This module provides the implementation of the executeSkynetAgent function
 * which is called by the MCP server to handle agent tasks using Mastra.
 */

import { LlmProviderType, executeDynamicAgent } from '../mastra/server-integration.js';

/**
 * Executes a Skynet agent with the given configuration using Mastra
 *
 * @param mcpConfig MCP server configuration with available tools
 * @param llmConfig LLM configuration
 * @param prompt Task instructions
 * @returns Agent execution result
 */
export async function executeMastraAgent(
  mcpConfig: Record<string, unknown>,
  llmConfig: { provider: string; model: string; apiKey?: string },
  prompt: string
): Promise<unknown> {
  console.log(`Executing Mastra agent with provider: ${llmConfig.provider}, model: ${llmConfig.model}`);
  
  try {
    // Determine the provider type
    let providerType: LlmProviderType;
    switch (llmConfig.provider.toLowerCase()) {
      case 'openai':
        providerType = LlmProviderType.OPENAI;
        break;
      case 'anthropic':
        providerType = LlmProviderType.ANTHROPIC;
        break;
      default:
        throw new Error(`Unsupported provider: ${llmConfig.provider}`);
    }

    // Get API key from environment if not provided
    const apiKey = llmConfig.apiKey || 
      (providerType === LlmProviderType.OPENAI ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY);
    
    if (!apiKey) {
      throw new Error(`API key not provided for ${llmConfig.provider}`);
    }

    // Create LLM model configuration
    const llmModelConfig = {
      provider: providerType,
      modelName: llmConfig.model,
      apiKey,
      temperature: 0.7,
    };

    // Execute the dynamic workflow
    const result = await executeDynamicAgent(llmModelConfig, prompt);
    
    return result;
  } catch (error) {
    console.error('Error executing Mastra agent:', error);
    throw error;
  }
}
