import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { createServer } from 'http';

interface StartMcpServerOptions {
  name: string;
  version: string;
  port: number;
  transport: 'stdio' | 'sse';
}

export async function startMcpServer(options: StartMcpServerOptions) {
  // Create a FastMCP server
  const server = new FastMCP({
    name: options.name,
    version: '1.0.0', // Fixed semver format version
  });

  // Add a basic echo tool
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

  // Start the server with the specified transport
  if (options.transport === 'stdio') {
    server.start({
      transportType: 'stdio',
    });
    return { httpServer: null };
  } else {
    // SSE transport
    const httpServer = createServer();

    // Start the server
    server.start({
      transportType: 'sse',
      sse: {
        endpoint: '/sse',
        port: options.port,
      },
    });

    return { httpServer };
  }
}
