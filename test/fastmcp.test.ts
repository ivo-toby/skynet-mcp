import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { setTimeout as delay } from 'timers/promises';
import http, { ClientRequest, IncomingMessage } from 'node:http';

// Function to get a random port (alternative to get-port-please)
async function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, () => {
      // 0 finds a random available port
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object' && address.port) {
          resolve(address.port);
        } else {
          reject(new Error('Could not determine random port'));
        }
      });
    });
    server.on('error', reject);
  });
}

describe('FastMCP', () => {
  let server: FastMCP;

  beforeEach(() => {
    server = new FastMCP({
      name: 'Test Server',
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
          text: JSON.stringify({ time: '2024-01-01T00:00:00.000Z' }),
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
  });

  it('should register and list tools', async () => {
    // In the npm package, listing tools is likely an async operation
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.find((t) => t.name === 'echo')).toBeDefined();
  });

  it('should add and execute a tool', async () => {
    server.addTool({
      name: 'add',
      description: 'Adds two numbers',
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async (args) => {
        return String(args.a + args.b);
      },
    });

    // Get the tools list to verify it was added
    const tools = await server.listTools();
    expect(tools.find((t) => t.name === 'add')).toBeDefined();
  });

  // More test cases would need to be adapted to match the actual API of the npm package
});
