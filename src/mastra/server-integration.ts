/**
 * Integration between the Mastra dynamic workflow system and the MCP server
 *
 * This module handles integration between the dynamic workflow system and the MCP server,
 * allowing the agent to be invoked through the MCP protocol.
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { DynamicAgent } from './dynamic-agent.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { LanguageModel } from './llm-interface.js';

/**
 * LLM provider types supported by the agent
 */
export enum LlmProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

/**
 * Configuration for an LLM model
 */
export interface LlmModelConfig {
  provider: LlmProviderType;
  modelName: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Creates an LLM instance based on the provider and model configuration
 *
 * @param config LLM model configuration
 * @returns Initialized LLM instance
 */
export function createLlm(config: LlmModelConfig): LanguageModel {
  const { provider, modelName, apiKey, temperature = 0.7, maxTokens = 1500 } = config;

  // Set the environment API key
  process.env.OPENAI_API_KEY =
    provider === LlmProviderType.OPENAI ? apiKey : process.env.OPENAI_API_KEY;
  process.env.ANTHROPIC_API_KEY =
    provider === LlmProviderType.ANTHROPIC ? apiKey : process.env.ANTHROPIC_API_KEY;

  switch (provider) {
    case LlmProviderType.OPENAI: {
      return openai(modelName) as unknown as LanguageModel;
    }
    case LlmProviderType.ANTHROPIC: {
      return anthropic(modelName) as unknown as LanguageModel;
    }
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Loads MCP server configurations from the config file
 *
 * @returns Array of server configurations
 */
export async function loadMcpServerConfigs(): Promise<Array<{ name: string; url: string }>> {
  try {
    // Get the directory of the current module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Calculate the path to the config file (two directories up from this file)
    const configPath = path.resolve(__dirname, '../../mcp-servers.json');

    // Read and parse the config file
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Return the server configurations
    return config.servers.map((server: { name: string; url: string }) => ({
      name: server.name,
      url: server.url,
    }));
  } catch (error) {
    console.error('Error loading MCP server configs:', error);
    return [];
  }
}

/**
 * Executes a task using a dynamic agent
 *
 * @param llmConfig LLM configuration
 * @param prompt Task prompt
 * @returns Result of the task execution
 */
export async function executeDynamicAgent(
  llmConfig: LlmModelConfig,
  prompt: string,
): Promise<unknown> {
  try {
    // Create the LLM instance
    const llm = createLlm(llmConfig);

    // Load MCP server configurations
    const mcpServers = await loadMcpServerConfigs();

    // Create and initialize the dynamic agent
    const agent = new DynamicAgent({
      llm,
      toolServers: mcpServers,
      maxToolCalls: 10,
      maxWorkflowSteps: 10,
      workflowTimeout: 300000, // 5 minutes
      maxChildAgents: 3,
    });

    await agent.initialize();

    try {
      // Process the prompt
      const result = await agent.processPrompt(prompt);

      return {
        agentResponse: result,
        timestamp: new Date().toISOString(),
      };
    } finally {
      // Make sure to shut down the agent properly
      await agent.shutdown();
    }
  } catch (error) {
    console.error('Error executing dynamic agent:', error);
    throw error;
  }
}
