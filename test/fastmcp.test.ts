import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { FastMCP, Tool, Resource, Prompt, MCPClientConfig, ToolParams } from '../src/fastmcp';
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

  const echoTool: Tool = {
    name: 'echo',
    description: 'Echoes the input parameters',
    handler: async (params) => params,
  };

  const timeResource: Resource = {
    name: 'time',
    description: 'Returns the current server time',
    fetch: async () => ({ time: '2024-01-01T00:00:00.000Z' }),
  };

  const helloPrompt: Prompt = {
    name: 'hello',
    description: 'A hello world prompt',
    template: 'Hello, world!',
  };

  beforeEach(() => {
    server = new FastMCP({
      tools: [echoTool],
      resources: [timeResource],
      prompts: [helloPrompt],
      mode: 'sse',
    });
  });

  it('should register and list tools', () => {
    const tools = server.listTools();
    expect(tools).toEqual([{ name: 'echo', description: 'Echoes the input parameters' }]);
  });

  it('should register and list resources', () => {
    const resources = server.listResources();
    expect(resources).toEqual([{ name: 'time', description: 'Returns the current server time' }]);
  });

  it('should register and list prompts', () => {
    const prompts = server.listPrompts();
    expect(prompts).toEqual([{ name: 'hello', description: 'A hello world prompt' }]);
  });

  it('should invoke a tool handler', async () => {
    const tool = server['tools'].get('echo');
    const result = await tool!.handler({ foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should fetch a resource', async () => {
    const resource = server['resources'].get('time');
    const result = await resource!.fetch();
    expect(result).toEqual({ time: '2024-01-01T00:00:00.000Z' });
  });

  it('should register tools, resources, and prompts dynamically', () => {
    const newTool: Tool = {
      name: 'add',
      description: 'Adds two numbers',
      handler: async (params) => {
        const { a, b } = params as { a: number; b: number };
        return { sum: a + b };
      },
    };
    server.registerTool(newTool);
    expect(server.listTools().length).toBe(2);

    const newResource: Resource = {
      name: 'date',
      description: 'Returns the current date',
      fetch: async () => ({ date: '2024-01-01' }),
    };
    server.registerResource(newResource);
    expect(server.listResources().length).toBe(2);

    const newPrompt: Prompt = {
      name: 'bye',
      description: 'A goodbye prompt',
      template: 'Goodbye!',
    };
    server.registerPrompt(newPrompt);
    expect(server.listPrompts().length).toBe(2);
  });

  describe('Remote MCP client integration', () => {
    const remoteClientConfig: MCPClientConfig = {
      name: 'remote1',
      url: 'http://remote-server',
      enabled: true,
    };

    beforeEach(() => {
      // Re-initialize server with a remote client
      server = new FastMCP({
        tools: [],
        resources: [],
        prompts: [],
        mode: 'sse',
        clients: [remoteClientConfig],
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should list remote tools', async () => {
      const mockTools = [{ name: 'remoteTool', description: 'Remote tool desc' }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTools,
      });
      // Patch globalThis.fetch for node-fetch import
      (globalThis as any).fetch = fetchMock;

      const remoteTools = await server.listRemoteTools();
      expect(fetchMock).toHaveBeenCalledWith('http://remote-server/tools');
      expect(remoteTools).toEqual([
        { name: 'remoteTool', description: 'Remote tool desc', source: 'remote1' },
      ]);
      delete (globalThis as any).fetch;
    });

    it('should list remote resources', async () => {
      const mockResources = [{ name: 'remoteRes', description: 'Remote resource desc' }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResources,
      });
      (globalThis as any).fetch = fetchMock;

      const remoteResources = await server.listRemoteResources();
      expect(fetchMock).toHaveBeenCalledWith('http://remote-server/resources');
      expect(remoteResources).toEqual([
        { name: 'remoteRes', description: 'Remote resource desc', source: 'remote1' },
      ]);
      delete (globalThis as any).fetch;
    });

    it('should list remote prompts', async () => {
      const mockPrompts = [{ name: 'remotePrompt', description: 'Remote prompt desc' }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPrompts,
      });
      (globalThis as any).fetch = fetchMock;

      const remotePrompts = await server.listRemotePrompts();
      expect(fetchMock).toHaveBeenCalledWith('http://remote-server/prompts');
      expect(remotePrompts).toEqual([
        { name: 'remotePrompt', description: 'Remote prompt desc', source: 'remote1' },
      ]);
      delete (globalThis as any).fetch;
    });

    it('should delegate tool invocation to remote MCP server if not found locally', async () => {
      const params = { foo: 'bar' };
      const remoteResult = { result: { remote: true } };
      const fetchMock = vi.fn().mockImplementation((url, opts) => {
        if (url === 'http://remote-server/tool/remoteTool' && opts.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => remoteResult,
          });
        }
        return Promise.resolve({ ok: false });
      });
      (globalThis as any).fetch = fetchMock;

      // Simulate HTTP POST handler logic
      // (directly call the handler for simplicity)
      let response: any;
      const res = {
        writeHead: vi.fn(),
        end: (data: string) => {
          response = JSON.parse(data);
        },
      } as any;

      // Simulate a real IncomingMessage for req
      let dataHandler: ((chunk: string) => void) | undefined;
      let endHandler: (() => void) | undefined;
      const req = {
        method: 'POST',
        url: '/tool/remoteTool',
        headers: {},
        on: (event: string, cb: (chunk: string) => void) => {
          if (event === 'data') dataHandler = cb;
          if (event === 'end') endHandler = cb as any;
        },
      } as any;

      // Call handleRequest, then manually trigger the data/end events
      const handlePromise = server.handleRequest(req, res);

      // Wait a bit to ensure the request handler has registered the event handlers
      await new Promise((resolve) => setTimeout(resolve, 10));

      if (dataHandler) dataHandler(JSON.stringify(params));
      if (endHandler) endHandler();

      // Wait for the promise to resolve
      await handlePromise;

      // Wait a bit more to ensure async operations complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(fetchMock).toHaveBeenCalledWith(
        'http://remote-server/tool/remoteTool',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }),
      );

      expect(response).toBeDefined();
      expect(response.result).toEqual(remoteResult.result);
      delete (globalThis as any).fetch;
    });
  });

  describe('SSE Transport', () => {
    let port: number;
    let sseConnection: ClientRequest | null = null;
    let receivedEvents: any[] = [];
    let testServer: FastMCP;
    let clientId: string | null = null;

    // Define a tool that uses the reporter
    const streamingTool: Tool = {
      name: 'streamer',
      description: 'Streams progress and partial results',
      handler: async (params, reporter) => {
        // If reporter exists (SSE mode), use it
        if (reporter) {
          reporter.reportProgress({ progress: 0, total: 3, message: 'Starting' });
          await delay(10);
          reporter.sendPartialResult({ step: 1, data: params.input });
          reporter.reportProgress({ progress: 1, total: 3 });
          await delay(10);
          reporter.sendPartialResult({ step: 2, status: 'Processing' });
          reporter.reportProgress({ progress: 2, total: 3 });
          await delay(10);
          reporter.reportProgress({ progress: 3, total: 3, message: 'Finishing' });
        } else {
          // Simulate work for standard HTTP fallback
          await delay(30);
        }
        // Always return the final result
        return { final: 'complete', inputReceived: params.input };
      },
    };

    const errorTool: Tool = {
      name: 'errorThrower',
      description: 'Throws an error during execution',
      handler: async (params, reporter) => {
        reporter?.reportProgress({ progress: 0, message: 'About to throw' });
        await delay(5);
        throw new Error('Intentional tool error');
      },
    };

    beforeEach(async () => {
      port = await getRandomPort();
      receivedEvents = [];
      clientId = null;
      sseConnection = null;

      testServer = new FastMCP({
        mode: 'sse',
        tools: [streamingTool, errorTool],
      });

      // Start server and wait for it to be ready
      await new Promise<void>((resolve, reject) => {
        testServer.listen(port);
        const checkInterval = setInterval(async () => {
          try {
            // Simple check if port is connectable
            const conn = http.request({ port, host: 'localhost', method: 'HEAD' }, (res) => {
              conn.destroy(); // Close the check connection immediately
              clearInterval(checkInterval);
              resolve();
            });
            conn.on('error', (err) => {
              // Server not ready yet, ignore error and interval will retry
            });
            conn.end();
          } catch (e) {
            /* ignore */
          }
        }, 50); // Check every 50ms
        // Timeout for server start
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Server did not start in time'));
        }, 2000);
      });

      // Connect SSE client using http.request
      await new Promise<void>((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: port,
          path: '/',
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            Connection: 'keep-alive',
            'Cache-Control': 'no-cache',
          },
        };

        sseConnection = http.request(options, (res: IncomingMessage) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-type']).toContain('text/event-stream');

          let buffer = '';
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
              const message = buffer.substring(0, boundary);
              buffer = buffer.substring(boundary + 2);
              boundary = buffer.indexOf('\n\n');

              const lines = message.split('\n');
              let event = 'message';
              let data = '';
              lines.forEach((line) => {
                if (line.startsWith('event:')) {
                  event = line.substring(6).trim();
                } else if (line.startsWith('data:')) {
                  data += line.substring(5).trim();
                }
              });

              try {
                const parsedData = JSON.parse(data);
                receivedEvents.push({ event, data: parsedData });
                if (event === 'connected' && parsedData.clientId) {
                  clientId = parsedData.clientId;
                  console.log(`Test SSE client received clientId: ${clientId}`);
                  resolve();
                }
              } catch (e) {
                console.error('Error parsing SSE event data:', e, 'Raw data:', data);
              }
            }
          });

          res.on('end', () => {
            console.log('Test SSE connection ended by server.');
            if (!clientId) reject(new Error('SSE connection ended before clientId received'));
          });
        });

        sseConnection.on('error', (err) => {
          console.error('Test SSE connection error:', err);
          // Reject only if clientId hasn't been received yet
          if (!clientId) {
            reject(new Error('SSE connection error'));
          }
        });

        sseConnection.end();

        setTimeout(() => {
          if (!clientId) {
            sseConnection?.destroy();
            reject(new Error('SSE client did not receive clientId in time'));
          }
        }, 2500);
      });
      await delay(20);
    });

    afterEach(async () => {
      sseConnection?.destroy();
      await testServer?.stop();
    });

    it('should establish SSE connection and receive connected event', () => {
      expect(clientId).not.toBeNull();
      expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
      expect(receivedEvents[0]).toEqual({
        event: 'connected',
        data: { clientId: clientId },
      });
    });

    it('should accept POST request and stream tool results via SSE', async () => {
      expect(clientId).not.toBeNull();

      const toolParams = { input: 'test-data' };
      const postRes = await postRequest(port, '/tool/streamer', toolParams, {
        'X-MCP-Client-ID': clientId!,
      });

      expect(postRes.statusCode).toBe(202);
      expect(JSON.parse(postRes.body)).toEqual({ status: 'accepted', tool: 'streamer' });

      // Wait for all events to arrive (adjust delay if needed)
      await delay(50);

      // Filter out the initial 'connected' event for clarity
      const toolEvents = receivedEvents.filter((e) => e.event !== 'connected');

      expect(toolEvents).toEqual([
        {
          event: 'toolProgress',
          data: { toolName: 'streamer', progress: 0, total: 3, message: 'Starting' },
        },
        {
          event: 'toolPartialResult',
          data: { toolName: 'streamer', result: { step: 1, data: 'test-data' } },
        },
        { event: 'toolProgress', data: { toolName: 'streamer', progress: 1, total: 3 } },
        {
          event: 'toolPartialResult',
          data: { toolName: 'streamer', result: { step: 2, status: 'Processing' } },
        },
        { event: 'toolProgress', data: { toolName: 'streamer', progress: 2, total: 3 } },
        {
          event: 'toolProgress',
          data: { toolName: 'streamer', progress: 3, total: 3, message: 'Finishing' },
        },
        {
          event: 'toolResult',
          data: { toolName: 'streamer', result: { final: 'complete', inputReceived: 'test-data' } },
        },
      ]);
    });

    it('should send toolError event via SSE if handler throws', async () => {
      expect(clientId).not.toBeNull();

      const toolParams = { some: 'input' };
      const postRes = await postRequest(port, '/tool/errorThrower', toolParams, {
        'X-MCP-Client-ID': clientId!,
      });

      expect(postRes.statusCode).toBe(202);

      // Wait for events
      await delay(50);

      const toolEvents = receivedEvents.filter((e) => e.event !== 'connected');

      expect(toolEvents).toContainEqual({
        event: 'toolProgress',
        data: { toolName: 'errorThrower', progress: 0, message: 'About to throw' },
      });
      expect(toolEvents).toContainEqual({
        event: 'toolError',
        data: { toolName: 'errorThrower', error: 'Intentional tool error' },
      });
    });

    it('should handle standard HTTP tool invocation if X-MCP-Client-ID is missing', async () => {
      const toolParams = { input: 'non-sse' };
      // Make a POST request *without* the X-MCP-Client-ID header
      const postRes = await postRequest(
        port,
        '/tool/streamer',
        toolParams,
        // No headers
      );

      expect(postRes.statusCode).toBe(200);
      // Expect the final result directly in the HTTP response
      expect(JSON.parse(postRes.body)).toEqual({
        result: { final: 'complete', inputReceived: 'non-sse' },
      });

      // Ensure no tool events were sent over SSE (only 'connected')
      await delay(20); // Wait briefly just in case
      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].event).toBe('connected');
    });
  }); // End describe SSE Transport
});

// Helper function to make HTTP requests for testing POST
const postRequest = (
  port: number,
  path: string,
  body: any,
  headers: Record<string, string> = {},
): Promise<{ statusCode: number; body: string }> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode || 500, body: data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
};
