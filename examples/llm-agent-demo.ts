/**
 * LLM Agent Demo
 *
 * This example demonstrates using the LlmAgent with actual LLM APIs.
 * You need to provide your own API keys to run this demo.
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'node:http';

// Define the default configuration
const DEFAULT_CONFIG = {
  port: 3001,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  provider: 'openai',
  model: 'gpt-4o',
  systemPrompt: `You are a helpful AI assistant that can perform calculations and answer questions.
When asked to perform mathematical operations, use the calculator tool.
When asked general knowledge questions, respond directly with your knowledge.
Be concise and precise in your responses.`,
};

// Demo function to run the LLM agent
async function runDemo() {
  console.log('Starting LLM Agent Demo...');

  // Check for API keys
  if (!DEFAULT_CONFIG.openaiApiKey && !DEFAULT_CONFIG.anthropicApiKey) {
    console.error('Error: No API keys found for OpenAI or Anthropic.');
    console.log('Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.');
    process.exit(1);
  }

  // Create HTTP server
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);

  // Setup routes
  app.get('/', (req, res) => {
    res.send('LLM Agent Demo Server Running');
  });

  // Placeholder calculator endpoint
  app.post('/api/calculate', (req, res) => {
    const { expression } = req.body;
    try {
      // Simple eval for demo purposes only
      const result = Function('"use strict"; return (' + expression + ')')();
      res.json({ result });
    } catch (error) {
      res.status(400).json({ error: 'Invalid expression' });
    }
  });

  // Start server
  let server: Server;
  const serverPromise = new Promise<void>((resolve) => {
    server = httpServer.listen(DEFAULT_CONFIG.port, () => {
      console.log(`Server running on http://localhost:${DEFAULT_CONFIG.port}`);
      resolve();
    });
  });

  // Wait for server to start
  await serverPromise;

  console.log('\nLLM Agent Demo Server is running!');
  console.log(
    `The calculator API is available at http://localhost:${DEFAULT_CONFIG.port}/api/calculate`,
  );
  console.log(
    '\nNote: The LLM agent functionality is currently disabled due to MCP SDK compatibility issues.',
  );
  console.log(
    'To use the calculator directly, send a POST request with JSON body: { "expression": "2 + 2" }',
  );
  console.log('\nPress Ctrl+C to quit.');

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Shutting down...');
    server.close();
    process.exit(0);
  });
}

// Run the demo
runDemo().catch((error) => {
  console.error('Error running demo:', error);
  process.exit(1);
});
