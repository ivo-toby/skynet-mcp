/**
 * Simple HTTP Server for exposing the MCP Server
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { McpServer } from './mcp-server.js';

// Define the default port
const DEFAULT_PORT = 3000;

/**
 * Start an HTTP server with MCP capabilities
 */
export async function startHttpServer(port = DEFAULT_PORT) {
  // Create the Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Create HTTP server
  const httpServer = createServer(app);

  // Create the MCP server with agent orchestration tools
  const mcpServer = new McpServer({
    name: 'skynet-mcp',
    version: '1.0.0',
    capabilities: {
      description: 'Skynet-MCP Agent Orchestration Server',
      tools: true,  // Enable tools capability
    },
  });

  // Register agent tools
  mcpServer.registerTool(
    'spawnAgent',
    'Create a new agent instance to perform a task',
    {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
        temperature: { type: 'number' },
        maxTokens: { type: 'number' },
        task: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            context: { type: 'string' },
            expectedOutput: { type: 'string' },
          },
          required: ['description'],
        },
        mcpTools: {
          type: 'array',
          items: { type: 'string' },
        },
        timeoutSeconds: { type: 'number' },
      },
      required: ['modelId', 'task'],
    },
    async (args) => {
      console.log('Spawning agent with args:', JSON.stringify(args, null, 2));
      
      // For now, just return a mock response with the agent ID
      const agentId = `agent-${Math.floor(Math.random() * 1000000).toString(16)}`;
      
      return {
        content: [
          {
            type: 'text',
            text: `Agent ${agentId} spawned successfully. Task: ${args.task.description}`,
          },
        ],
        _meta: {
          agentId,
        },
      };
    }
  );

  mcpServer.registerTool(
    'getAgentStatus',
    'Check the status of a running agent',
    {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
      },
      required: ['agentId'],
    },
    async (args) => {
      console.log('Getting status for agent:', args.agentId);
      
      // Mock response
      return {
        content: [
          {
            type: 'text',
            text: `Agent ${args.agentId} is running`,
          },
        ],
        _meta: {
          status: 'running',
          progress: 0.5,
          runningTime: 10.5,
        },
      };
    }
  );

  mcpServer.registerTool(
    'getAgentResult',
    'Get results from a completed agent',
    {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
      },
      required: ['agentId'],
    },
    async (args) => {
      console.log('Getting results for agent:', args.agentId);
      
      // Mock response
      return {
        content: [
          {
            type: 'text',
            text: `Agent ${args.agentId} completed its task. Here are the results: Lorem ipsum dolor sit amet...`,
          },
        ],
      };
    }
  );

  // Set up endpoint for /mcp as SSE connection
  app.get('/mcp', (req, res) => {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Function to send SSE events
    const sseSend = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Set up SSE transport for MCP server
    mcpServer.setupHttpSSE(sseSend);

    // Send initial handshake (this is already done in setupHttpSSE)
    
    // Handle client disconnect
    req.on('close', () => {
      console.log('Client disconnected from SSE');
    });
  });

  // Handle JSON-RPC requests to /mcp
  app.post('/mcp', async (req, res) => {
    try {
      console.log('Received MCP request:', JSON.stringify(req.body));
      
      // Process the message
      await mcpServer.handleClientMessage(req.body);
      
      // We don't respond directly here because responses are sent via SSE
      res.status(202).end();
    } catch (error) {
      console.error('Error handling MCP request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Setup basic routes
  app.get('/', (req, res) => {
    res.send('Skynet-MCP Server is running. Connect to /mcp for MCP SSE connection.');
  });

  // Start the server
  return new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      console.log(`Skynet-MCP server running on http://localhost:${port}/mcp`);
      resolve();
    });
  });
}

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  // Get port from environment or command line
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
  startHttpServer(port).catch((error) => {
    console.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
}