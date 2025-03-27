/**
 * Integration between the Mastra dynamic workflow system and the MCP server
 *
 * This module handles integration between the dynamic workflow system and the MCP server,
 * allowing the agent to be invoked through the MCP protocol.
 */

import { OpenAI } from '@ai-sdk/openai';
import { Anthropic } from '@ai-sdk/anthropic';
import { DynamicWorkflow } from './dynamic-workflow.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
    return config.servers.map((server: any) => ({
      name: server.name,
      url: server.url,
    }));
  } catch (error) {
    console.error('Error loading MCP server configs:', error);
    return [];
  }
}

/**
 * Executes a task using a dynamic workflow
 *
 * @param llmConfig LLM configuration
 * @param prompt Task prompt
 * @returns Result of the workflow execution
 */
export async function executeDynamicAgent(
  llmConfig: LlmModelConfig,
  prompt: string,
): Promise<unknown> {
  try {
    // Set the environment API key
    process.env.OPENAI_API_KEY = llmConfig.provider === LlmProviderType.OPENAI ? llmConfig.apiKey : process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = llmConfig.provider === LlmProviderType.ANTHROPIC ? llmConfig.apiKey : process.env.ANTHROPIC_API_KEY;

    // Initialize the LLM based on provider
    let llm;
    if (llmConfig.provider === LlmProviderType.OPENAI) {
      const openai = new OpenAI({ apiKey: llmConfig.apiKey });
      llm = openai.chat({
        model: llmConfig.modelName,
        temperature: llmConfig.temperature || 0.7,
      });
    } else if (llmConfig.provider === LlmProviderType.ANTHROPIC) {
      const anthropic = new Anthropic({ apiKey: llmConfig.apiKey });
      llm = anthropic.messages({
        model: llmConfig.modelName,
        temperature: llmConfig.temperature || 0.7,
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${llmConfig.provider}`);
    }

    // Load MCP server configurations
    const mcpServers = await loadMcpServerConfigs();

    // Create and execute the dynamic workflow
    const workflow = new DynamicWorkflow({
      llm,
      toolServers: mcpServers,
    });

    // Execute the workflow with the prompt
    const result = await workflow.execute(prompt);

    return {
      agentResponse: result.output,
      workflowSteps: result.steps,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error executing dynamic workflow:', error);
    throw error;
  }
}
