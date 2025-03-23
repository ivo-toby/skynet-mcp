#!/usr/bin/env node
/* eslint-disable no-undef */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { McpServer } from '../dist/bundle.js';

// Configuration
const PORT = process.env.PORT || 3002;

/**
 * Main function to start the server
 */
async function main() {
  console.log('Starting Skynet-MCP server for Claude Desktop...');

  // Create Express app and HTTP server
  const app = express();
  app.use(cors());
  app.use(express.json());
  const httpServer = createServer(app);

  // Create the MCP server
  const mcpServer = new McpServer({
    name: 'skynet-mcp',
    version: '1.0.0',
    capabilities: {
      tools: true,
    },
  });

  // Register agent tools with the server
  registerTools(mcpServer);

  // Basic health route
  app.get('/', (req, res) => {
    res.send('Skynet-MCP Server is running. Use JSON-RPC over HTTP for MCP communication.');
  });

  // Setup JSON-RPC endpoint for MCP
  app.post('/', async (req, res) => {
    try {
      console.log('Received request:', JSON.stringify(req.body, null, 2));
      
      // Client initialize message
      if (req.body.method === 'initialize') {
        console.log('Client initialized with protocol version:', req.body.params.protocolVersion);
        
        // Return server info and capabilities
        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            serverInfo: {
              name: 'skynet-mcp',
              version: '1.0.0'
            },
            capabilities: {
              tools: true
            }
          }
        });
        return;
      }
      
      // Handle tool-related messages
      if (req.body.method === 'tools/list') {
        const tools = Array.from(mcpServer['tools'].values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
        
        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: { tools }
        });
        return;
      }
      
      if (req.body.method === 'tools/invoke') {
        const { name, arguments: args } = req.body.params;
        
        try {
          const result = await mcpServer['executeToolHandler']({ name, arguments: args });
          res.json({
            jsonrpc: '2.0',
            id: req.body.id,
            result
          });
        } catch (error) {
          res.json({
            jsonrpc: '2.0',
            id: req.body.id,
            error: {
              code: -32603,
              message: `Error executing tool: ${error.message}`
            }
          });
        }
        return;
      }
      
      // Unknown method
      res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        error: {
          code: -32601,
          message: `Method not found: ${req.body.method}`
        }
      });
    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body.id || null,
        error: {
          code: -32603,
          message: 'Internal error'
        }
      });
    }
  });

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`Skynet-MCP server for Claude Desktop running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

/**
 * Register tools with the MCP server
 */
function registerTools(mcpServer) {
  // Tool 1: spawnAgent - Create a new agent to perform a task
  mcpServer.registerTool(
    'spawnAgent',
    'Create a new agent instance to perform a task',
    {
      type: 'object',
      properties: {
        modelId: { 
          type: 'string',
          description: 'The model to use for this agent (e.g. anthropic.claude-3-opus)' 
        },
        temperature: { 
          type: 'number',
          description: 'Temperature for model generation (0.0-1.0)'
        },
        maxTokens: { 
          type: 'number',
          description: 'Maximum number of output tokens'
        },
        task: {
          type: 'object',
          properties: {
            description: { 
              type: 'string',
              description: 'Description of the task to be performed'
            },
            context: { 
              type: 'string',
              description: 'Additional context for the task'
            },
            expectedOutput: { 
              type: 'string',
              description: 'Description of what output format is expected'
            },
          },
          required: ['description'],
        },
        mcpTools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of MCP tools to make available to the agent'
        },
        timeoutSeconds: { 
          type: 'number',
          description: 'Timeout in seconds after which the agent will be terminated'
        },
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

  // Tool 2: getAgentStatus - Check a running agent's status
  mcpServer.registerTool(
    'getAgentStatus',
    'Check the status of a running agent',
    {
      type: 'object',
      properties: {
        agentId: { 
          type: 'string',
          description: 'The ID of the agent to check status for'
        },
      },
      required: ['agentId'],
    },
    async (args) => {
      console.log('Getting status for agent:', args.agentId);
      
      // Mock response - in a real implementation, we would look up the agent
      return {
        content: [
          {
            type: 'text',
            text: `Agent ${args.agentId} is running (${Math.floor(Math.random() * 100)}% complete)`,
          },
        ],
        _meta: {
          status: 'running',
          progress: Math.random(),
          runningTime: Math.floor(Math.random() * 60),
        },
      };
    }
  );

  // Tool 3: getAgentResult - Get results from a completed agent
  mcpServer.registerTool(
    'getAgentResult',
    'Get results from a completed agent',
    {
      type: 'object',
      properties: {
        agentId: { 
          type: 'string', 
          description: 'The ID of the agent to get results from'
        },
      },
      required: ['agentId'],
    },
    async (args) => {
      console.log('Getting results for agent:', args.agentId);
      
      // Mock response - in a real implementation, we would retrieve the agent's output
      return {
        content: [
          {
            type: 'text',
            text: `Agent ${args.agentId} completed its task. Here are the results:\n\n` +
                 `Based on my research, I've found the following insights:\n\n` +
                 `1. Key finding one: Lorem ipsum dolor sit amet\n` +
                 `2. Key finding two: Consectetur adipiscing elit\n` +
                 `3. Key finding three: Sed do eiusmod tempor incididunt\n\n` +
                 `This information should help with your decision making.`,
          },
        ],
      };
    }
  );

  console.log('Registered 3 tools with the MCP server');
}

// Run the main function
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});