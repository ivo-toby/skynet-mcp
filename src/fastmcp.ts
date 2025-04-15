import { createServer, IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';
import fetch from 'node-fetch';

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

export interface MCPClientConfig {
  name: string;
  url: string;
  enabled?: boolean;
}

export interface FastMCPOptions {
  port?: number;
  tools?: Tool[];
  resources?: Resource[];
  prompts?: Prompt[];
  mode?: 'stdio' | 'sse';
  clients?: MCPClientConfig[];
}

export class FastMCP extends EventEmitter {
  private tools: Map<string, Tool> = new Map();
  private resources: Map<string, Resource> = new Map();
  private prompts: Map<string, Prompt> = new Map();
  private server?: ReturnType<typeof createServer>;
  private mode: 'stdio' | 'sse';
  private clients: MCPClientConfig[] = [];

  constructor(options: FastMCPOptions = {}) {
    super();
    this.mode = options.mode || 'sse';
    (options.tools || []).forEach((tool) => this.registerTool(tool));
    (options.resources || []).forEach((resource) => this.registerResource(resource));
    (options.prompts || []).forEach((prompt) => this.registerPrompt(prompt));
    this.clients = (options.clients || []).filter((c) => c.enabled !== false);
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

  async listRemoteTools() {
    const all: { name: string; description: string; source: string }[] = [];
    for (const client of this.clients) {
      try {
        const resp = await fetch(`${client.url}/tools`);
        if (!resp.ok) continue;
        const tools = await resp.json();
        for (const t of tools) {
          all.push({ ...t, source: client.name });
        }
      } catch {
        // ignore unreachable client
      }
    }
    return all;
  }

  listResources() {
    return Array.from(this.resources.values()).map(({ name, description }) => ({
      name,
      description,
    }));
  }

  async listRemoteResources() {
    const all: { name: string; description: string; source: string }[] = [];
    for (const client of this.clients) {
      try {
        const resp = await fetch(`${client.url}/resources`);
        if (!resp.ok) continue;
        const resources = await resp.json();
        for (const r of resources) {
          all.push({ ...r, source: client.name });
        }
      } catch {
        // ignore unreachable client
      }
    }
    return all;
  }

  listPrompts() {
    return Array.from(this.prompts.values()).map(({ name, description }) => ({
      name,
      description,
    }));
  }

  async listRemotePrompts() {
    const all: { name: string; description: string; source: string }[] = [];
    for (const client of this.clients) {
      try {
        const resp = await fetch(`${client.url}/prompts`);
        if (!resp.ok) continue;
        const prompts = await resp.json();
        for (const p of prompts) {
          all.push({ ...p, source: client.name });
        }
      } catch {
        // ignore unreachable client
      }
    }
    return all;
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse) {
    if (req.method === 'GET' && req.url === '/tools') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.listTools()));
      return;
    }
    if (req.method === 'GET' && req.url === '/tools/remote') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(await this.listRemoteTools()));
      return;
    }
    if (req.method === 'GET' && req.url === '/resources') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.listResources()));
      return;
    }
    if (req.method === 'GET' && req.url === '/resources/remote') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(await this.listRemoteResources()));
      return;
    }
    if (req.method === 'GET' && req.url === '/prompts') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.listPrompts()));
      return;
    }
    if (req.method === 'GET' && req.url === '/prompts/remote') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(await this.listRemotePrompts()));
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/tool/')) {
      const toolName = req.url.split('/').pop()!;
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const params = JSON.parse(body);
          const tool = this.tools.get(toolName);
          if (tool) {
            const result = await tool.handler(params);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result }));
            return;
          }
          // Try remote tools
          for (const client of this.clients) {
            try {
              const resp = await fetch(`${client.url}/tool/${toolName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
              });
              if (resp.ok) {
                const data = await resp.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ result: data.result, remote: client.name }));
                return;
              }
            } catch {
              // ignore and try next
            }
          }
          throw new Error('Tool not found');
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
          } else if (req.type === 'listRemoteTools') {
            process.stdout.write(JSON.stringify(await this.listRemoteTools()) + '\n');
          } else if (req.type === 'listResources') {
            process.stdout.write(JSON.stringify(this.listResources()) + '\n');
          } else if (req.type === 'listRemoteResources') {
            process.stdout.write(JSON.stringify(await this.listRemoteResources()) + '\n');
          } else if (req.type === 'listPrompts') {
            process.stdout.write(JSON.stringify(this.listPrompts()) + '\n');
          } else if (req.type === 'listRemotePrompts') {
            process.stdout.write(JSON.stringify(await this.listRemotePrompts()) + '\n');
          } else if (req.type === 'invokeTool') {
            const tool = this.tools.get(req.name);
            if (tool) {
              const result = await tool.handler(req.params);
              process.stdout.write(JSON.stringify({ result }) + '\n');
            } else {
              // Try remote tools
              let found = false;
              for (const client of this.clients) {
                try {
                  const resp = await fetch(`${client.url}/tool/${req.name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req.params),
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    process.stdout.write(
                      JSON.stringify({ result: data.result, remote: client.name }) + '\n',
                    );
                    found = true;
                    break;
                  }
                } catch {
                  // ignore and try next
                }
              }
              if (!found) {
                throw new Error('Tool not found');
              }
            }
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
