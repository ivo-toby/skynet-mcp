import { createServer, IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';

export type Tool = {
  name: string;
  description: string;
  handler: (params: any) => Promise<any>;
};

export type Resource = {
  name: string;
  description: string;
  fetch: () => Promise<any>;
};

export type Prompt = {
  name: string;
  description: string;
  template: string;
};

export interface FastMCPOptions {
  port?: number;
  tools?: Tool[];
  resources?: Resource[];
  prompts?: Prompt[];
  mode?: 'stdio' | 'sse';
}

export class FastMCP extends EventEmitter {
  private tools: Map<string, Tool> = new Map();
  private resources: Map<string, Resource> = new Map();
  private prompts: Map<string, Prompt> = new Map();
  private server?: ReturnType<typeof createServer>;
  private mode: 'stdio' | 'sse';

  constructor(options: FastMCPOptions = {}) {
    super();
    this.mode = options.mode || 'sse';
    (options.tools || []).forEach(tool => this.registerTool(tool));
    (options.resources || []).forEach(resource => this.registerResource(resource));
    (options.prompts || []).forEach(prompt => this.registerPrompt(prompt));
  }

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  registerResource(resource: Resource) {
    this.resources.set(resource.name, resource);
  }

  registerPrompt(prompt: Prompt) {
    this.prompts.set(prompt.name, prompt);
  }

  listTools() {
    return Array.from(this.tools.values()).map(({ name, description }) => ({ name, description }));
  }

  listResources() {
    return Array.from(this.resources.values()).map(({ name, description }) => ({ name, description }));
  }

  listPrompts() {
    return Array.from(this.prompts.values()).map(({ name, description }) => ({ name, description }));
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse) {
    if (req.method === 'GET' && req.url === '/tools') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.listTools()));
      return;
    }
    if (req.method === 'GET' && req.url === '/resources') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.listResources()));
      return;
    }
    if (req.method === 'GET' && req.url === '/prompts') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.listPrompts()));
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/tool/')) {
      const toolName = req.url.split('/').pop()!;
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', async () => {
        try {
          const params = JSON.parse(body);
          const tool = this.tools.get(toolName);
          if (!tool) throw new Error('Tool not found');
          const result = await tool.handler(params);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  listen(port: number = 8080) {
    if (this.mode === 'sse') {
      this.server = createServer(this.handleRequest.bind(this));
      this.server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`FastMCP server listening on http://localhost:${port}`);
      });
    } else if (this.mode === 'stdio') {
      // Minimal stdio mode: read JSON lines from stdin, write responses to stdout
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', async (data) => {
        try {
          const req = JSON.parse(data);
          if (req.type === 'listTools') {
            process.stdout.write(JSON.stringify(this.listTools()) + '\n');
          } else if (req.type === 'listResources') {
            process.stdout.write(JSON.stringify(this.listResources()) + '\n');
          } else if (req.type === 'listPrompts') {
            process.stdout.write(JSON.stringify(this.listPrompts()) + '\n');
          } else if (req.type === 'invokeTool') {
            const tool = this.tools.get(req.name);
            if (!tool) throw new Error('Tool not found');
            const result = await tool.handler(req.params);
            process.stdout.write(JSON.stringify({ result }) + '\n');
          } else {
            process.stdout.write(JSON.stringify({ error: 'Unknown request' }) + '\n');
          }
        } catch (err: any) {
          process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
        }
      });
    }
  }
}
