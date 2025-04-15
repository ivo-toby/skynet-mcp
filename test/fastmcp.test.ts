import { describe, beforeEach, it, expect, vi } from 'vitest';
import { FastMCP, Tool, Resource, Prompt, MCPClientConfig } from '../src/fastmcp';

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
      handler: async ({ a, b }) => a + b,
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
        end: (data: string) => { response = JSON.parse(data); },
      } as any;
      const req = {
        method: 'POST',
        url: '/tool/remoteTool',
        on: (event: string, cb: (chunk: string) => void) => {
          if (event === 'data') cb(JSON.stringify(params));
          if (event === 'end') cb('');
        },
      } as any;

      // Patch req.on to call both 'data' and 'end' in order
      let dataCb: ((chunk: string) => void) | undefined;
      let endCb: ((chunk: string) => void) | undefined;
      req.on = (event: string, cb: (chunk: string) => void) => {
        if (event === 'data') dataCb = cb;
        if (event === 'end') endCb = cb;
      };
      // Actually trigger the callbacks as the real server would
      await new Promise<void>(resolve => {
        dataCb && dataCb(JSON.stringify(params));
        endCb && endCb('');
        resolve();
      });

      await server.handleRequest(req, res);
      expect(response.result).toEqual(remoteResult.result);
      delete (globalThis as any).fetch;
    });
  });
});
