/**
 * Skynet-MCP: A hierarchical network of AI agents using the Model Context Protocol
 *
 * This is the main entry point for the Skynet-MCP application.
 */

// Export key components
export * from './mastra/index.js';
export * from './server/mcp-server.js';
export * from './lib/mastra/llm/index.js';
export * from './mastra/dynamic-workflow.js';

// Export version info
export const version = '0.1.0';

import { LLMFactory, createModelConfig } from './lib/mastra/llm';
import { CompleteAdapter } from './lib/mastra/llm/complete-adapter';
import { DynamicWorkflow } from './mastra/dynamic-workflow.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url); // Added definition
const __dirname = path.dirname(__filename); // Added definition

async function main() {
  // Load MCP server configuration from the root directory
  const configPath = path.resolve(__dirname, '../mcp-servers.json');
  const mcpConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Set up LLM (using environment variable for API key)
  // Ensure you have OPENAI_API_KEY set in your environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  // Set up LLM
  const llmConfig = createModelConfig('gpt-4', apiKey);
  const llm = LLMFactory.create(llmConfig);
  const llmAdapter = new CompleteAdapter(llm);

  // Test prompt
  const testPrompt = `
    Please analyze the following topics and provide a summary:
    1. Current weather in New York
    2. Latest news about artificial intelligence
  `;

  console.log('Creating workflow...');
  // Create dynamic workflow
  const workflow = new DynamicWorkflow({
    llm: llmAdapter,
    toolServers: Object.values(mcpConfig.servers),
  });

  console.log(`Processing prompt: "${testPrompt.trim()}"`);
  try {
    // Generate and execute the workflow
    console.log('Executing workflow...');
    const result = await workflow.execute(testPrompt);
    
    console.log('\n--- Workflow Result ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('--- End of Result ---');
  } catch (error) {
    console.error('\n--- Error during processing ---');
    console.error(error);
    console.log('--- End of Error ---');
  }
}

main().catch((error) => {
  console.error('\n--- Unhandled Error in main ---');
  console.error(error);
  console.log('--- End of Unhandled Error ---');
});
