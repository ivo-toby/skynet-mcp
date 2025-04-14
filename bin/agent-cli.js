#!/usr/bin/env node
/* eslint-disable no-undef */
import { LLMFactory, createModelConfig, CompleteAdapter, DynamicWorkflow } from '../dist/bundle.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Load environment variables from .env file if available
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (error) {
  console.log('dotenv not available, skipping .env loading');
}

// Define __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to get user prompt
function getUserPrompt() {
  return new Promise((resolve) => {
    rl.question('Enter your query (or type "exit" to quit): ', (prompt) => {
      resolve(prompt);
    });
  });
}

async function main() {
  try {
    // Load MCP server configuration from the root directory
    const configPath = path.resolve(__dirname, '../mcp-servers.json');
    const mcpConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Error: OPENAI_API_KEY environment variable is not set.');
      process.exit(1);
    }

    // Set up LLM
    // Determine which model to use
    let provider = process.env.DEFAULT_LLM_MODEL || 'gpt-4o';
    
    // Check if model was specified as an argument
    const modelArg = process.argv.findIndex((arg) => arg === '--model');
    if (modelArg !== -1 && process.argv[modelArg + 1]) {
      provider = process.argv[modelArg + 1];
    }
    
    console.log(`Using model: ${provider}`);
    const llmConfig = createModelConfig(provider, apiKey);
    const llm = LLMFactory.create(llmConfig);
    const llmAdapter = new CompleteAdapter(llm);

    // Check if real tools should be enabled
    const enableRealTools = process.argv.includes('--real-tools') || process.env.ENABLE_REAL_TOOLS === 'true';
    console.log(`Real tools ${enableRealTools ? 'enabled' : 'disabled'}`);
    
    // Create dynamic workflow
    const workflow = new DynamicWorkflow({
      llm: llmAdapter,
      toolServers: Object.values(mcpConfig.servers),
      enableRealTools,
    });

    console.log('Skynet-MCP Agent CLI');
    console.log('--------------------');
    console.log('Type your query or "exit" to quit.');

    let shouldExit = false;
    while (!shouldExit) {
      // Get user prompt
      const userPrompt = await getUserPrompt();
      
      if (userPrompt.toLowerCase() === 'exit') {
        shouldExit = true;
        continue;
      }

      console.log('Processing prompt...');
      try {
        // Execute workflow
        const result = await workflow.execute(userPrompt);
        
        console.log('\n--- Agent Response ---');
        try {
          const resultObj = JSON.parse(result.output);
          console.log(JSON.stringify(resultObj, null, 2));
        } catch (error) {
          console.log(result.output);
        }
        console.log('--- End of Response ---\n');
      } catch (error) {
        console.error('\n--- Error during processing ---');
        console.error(error);
        console.log('--- End of Error ---\n');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error('\n--- Unhandled Error in main ---');
  console.error(error);
  console.log('--- End of Unhandled Error ---');
  process.exit(1);
});