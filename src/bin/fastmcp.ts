#!/usr/bin/env node
import { FastMCP, imageContent } from 'fastmcp';
import { z } from 'zod';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Create a FastMCP server with name and version
const server = new FastMCP({
  name: 'Skynet MCP',
  version: '1.0.0',
});

// Add an echo tool
server.addTool({
  name: 'echo',
  description: 'Echoes the input parameters',
  parameters: z.object({
    message: z.string(),
  }),
  execute: async (args) => {
    return args.message;
  },
});

// Add a time resource
server.addResource({
  uri: 'data://time',
  name: 'Current Time',
  description: 'Returns the current server time',
  mimeType: 'application/json',
  async load() {
    return {
      text: JSON.stringify({ time: new Date().toISOString() }),
    };
  },
});

// Add a hello prompt
server.addPrompt({
  name: 'hello',
  description: 'A hello world prompt',
  arguments: [
    {
      name: 'name',
      description: 'Your name',
      required: false,
    },
  ],
  load: async (args) => {
    const name = args.name || 'world';
    return `Hello, ${name}!`;
  },
});

// Start the server with SSE transport
server.start({
  transportType: 'sse',
  sse: {
    endpoint: '/sse',
    port,
  },
});

console.log(`FastMCP server listening on http://localhost:${port}/sse`);
