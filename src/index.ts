/**
 * Skynet-MCP: A hierarchical network of AI agents using the Model Context Protocol
 *
 * This is the main entry point for the Skynet-MCP application.
 */

// Export key components
// export * from './mastra/index.js';
// export * from './server/mcp-server.js';
//
// // Export version info
// export const version = '0.1.0';
//
// // Log initialization message when imported directly
// // Use ESM style detection for main module (when run directly)
// const isMainModule = import.meta.url === `file://${process.argv[1]}`;
// if (isMainModule) {
//   console.log('Skynet-MCP initialized');
//   console.log(`Version: ${version}`);
//   console.log('Use the SimpleAgent class to create an agent that can use MCP tools.');
// }
import { LLMFactory, createModelConfig } from './lib/mastra/llm';
import { CompleteAdapter } from './lib/mastra/llm/complete-adapter';
import { DynamicAgent } from './mastra/dynamic-agent';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Added import

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
  const llmConfig = createModelConfig('gpt-4', apiKey); // Using gpt-4 as an example
  const llm = LLMFactory.create(llmConfig);

  // Create an adapter that provides the 'complete' method expected by WorkflowManager
  const llmAdapter = new CompleteAdapter(llm);

  // Create dynamic agent, passing the adapter with the 'complete' method
  // Use type assertion to tell TypeScript that our adapter can be used as a LanguageModelV1
  const agent = new DynamicAgent({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    llm: llmAdapter as any, // Use type assertion to bypass type checking
    toolServers: Object.values(mcpConfig.servers), // Pass server configs as an array
    maxWorkflowSteps: 10,
    workflowTimeout: 300000, // 5 minutes
  });

  // Initialize agent
  console.log('Initializing agent...');
  await agent.initialize();
  console.log('Agent initialized.');

  // Test prompt
  const testPrompt = `
    Please analyze the following topics and provide a summary:
    1. Current weather in New York
    2. Latest news about artificial intelligence
  `;

  console.log(`Processing prompt: "${testPrompt.trim()}"`);
  try {
    const result = await agent.processPrompt(testPrompt);
    console.log('\n--- Agent Response ---');
    console.log(result);
    console.log('--- End of Response ---');
  } catch (error) {
    console.error('\n--- Error during processing ---');
    console.error(error);
    console.log('--- End of Error ---');
  } finally {
    await agent.shutdown();
  }
}

main().catch((error) => {
  console.error('\n--- Unhandled Error in main ---');
  console.error(error);
  console.log('--- End of Unhandled Error ---');
});
