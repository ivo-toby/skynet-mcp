import { FastMCP, Tool, Resource, Prompt } from '../src/fastmcp';

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
    expect(tools).toEqual([
      { name: 'echo', description: 'Echoes the input parameters' },
    ]);
  });

  it('should register and list resources', () => {
    const resources = server.listResources();
    expect(resources).toEqual([
      { name: 'time', description: 'Returns the current server time' },
    ]);
  });

  it('should register and list prompts', () => {
    const prompts = server.listPrompts();
    expect(prompts).toEqual([
      { name: 'hello', description: 'A hello world prompt' },
    ]);
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
});
