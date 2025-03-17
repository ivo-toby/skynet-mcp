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
import { Server as SSEServer } from 'sse';
import { ExampleServer } from '../src/server/example-server.js';
import { LlmAgent, LlmProviderType } from '../src/orchestrator/index.js';

// Define the default configuration
const DEFAULT_CONFIG = {
  port: 3001,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  provider: LlmProviderType.OPENAI,
  model: 'gpt-4o',
  systemPrompt: `You are a helpful AI assistant that can perform calculations and answer questions.
When asked to perform mathematical operations, use the calculator tool.
When asked general knowledge questions, respond directly with your knowledge.
Be concise and precise in your responses.`
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

  // Create HTTP server and SSE server
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const sseServer = new SSEServer({ path: '/mcp' });
  sseServer.attach(httpServer);

  // Create and start the MCP server with calculator tools
  const mcpServer = new ExampleServer();

  // Set up SSE connections
  sseServer.on('connection', (client) => {
    console.log('Client connected to SSE');

    // Set up SSE transport
    mcpServer.setupHttpSSE((event, data) => {
      client.send(event, data);
    });

    // Handle events from client
    client.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message);
        mcpServer.handleClientMessage(parsed).catch(console.error);
      } catch (error) {
        console.error('Error parsing message from client:', error);
      }
    });

    client.on('close', () => {
      console.log('Client disconnected from SSE');
    });
  });

  // Setup routes
  app.get('/', (req, res) => {
    res.send('LLM Agent Demo Server Running');
  });

  // Start server
  let server: Server;
  const serverPromise = new Promise<void>((resolve) => {
    server = httpServer.listen(DEFAULT_CONFIG.port, () => {
      console.log(`Server running on http://localhost:${DEFAULT_CONFIG.port}/mcp`);
      resolve();
    });
  });

  // Wait for server to start
  await serverPromise;

  // Wait a bit for the server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Initialize the LLM agent
  const agent = new LlmAgent({
    toolServers: [
      {
        name: 'calculator',
        url: `http://localhost:${DEFAULT_CONFIG.port}/mcp`,
      },
    ],
    maxToolCalls: 5,
    model: {
      provider: DEFAULT_CONFIG.provider,
      modelName: DEFAULT_CONFIG.model,
      apiKey: DEFAULT_CONFIG.provider === LlmProviderType.OPENAI ?
        DEFAULT_CONFIG.openaiApiKey :
        DEFAULT_CONFIG.anthropicApiKey,
      temperature: 0.7,
    },
    systemPrompt: DEFAULT_CONFIG.systemPrompt,
    verbose: true,
  });

  // Initialize the agent
  await agent.initialize();

  console.log(`\nLLM Agent initialized with ${DEFAULT_CONFIG.provider} model: ${DEFAULT_CONFIG.model}`);
  console.log('Available tools:');
  console.log('- calculator.calculate: Calculate mathematical expressions');
  console.log('\nType a prompt and press Enter. Type "exit" to quit.\n');

  // Handle user input
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (data: Buffer) => {
    const input = data.toString().trim();

    if (input.toLowerCase() === 'exit') {
      console.log('Shutting down demo...');
      await agent.shutdown();
      server.close();
      process.exit(0);
    }

    console.log(`\nProcessing: "${input}"`);
    try {
      const result = await agent.processPrompt(input);
      console.log('\nResult:');
      console.log(result);
      console.log('\nEnter a new prompt or type "exit" to quit:');
    } catch (error) {
      console.error('Error processing prompt:', error);
    }
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Shutting down...');
    await agent.shutdown();
    server.close();
    process.exit(0);
  });
}

// Run the demo
runDemo().catch((error) => {
  console.error('Error running demo:', error);
  process.exit(1);
});
