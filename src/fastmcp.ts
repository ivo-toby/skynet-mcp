import { createServer, IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';
// Global fetch type is defined in types/global.d.ts

export interface ToolParams {
  [key: string]: unknown;
}

export interface ToolResult {
  [key: string]: unknown;
}

// --- New types for SSE reporting ---
export interface ProgressReport {
  progress?: number; // Current progress units
  total?: number; // Total units for completion
  message?: string; // Optional progress message
}

export interface ToolReporter {
  reportProgress: (report: ProgressReport) => void;
  sendPartialResult: (result: Partial<ToolResult>) => void;
  // Maybe add sendError later
}

// --- Updated Tool type ---
export type ToolHandler = (
  params: ToolParams,
  reporter?: ToolReporter, // Make reporter optional
) => Promise<ToolResult>;

export type Tool = {
  name: string;
  description: string;
  // handler: (params: ToolParams) => Promise<ToolResult>; // Old signature
  handler: ToolHandler; // New signature
};

export interface ResourceResult {
  [key: string]: unknown;
}

export type Resource = {
  name: string;
  description: string;
  fetch: () => Promise<ResourceResult>;
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
  private sseClients: Map<string, ServerResponse> = new Map();
  private nextClientId = 0;

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
        // Use global fetch to ensure it can be mocked in tests
        const resp = await fetch(`${client.url}/tools`);
        if (!resp.ok) continue;
        const tools = await resp.json();
        for (const t of tools) {
          all.push({ ...t, source: client.name });
        }
      } catch (err) {
        console.error(`Error fetching remote tools from ${client.name}:`, err);
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
        // Use global fetch to ensure it can be mocked in tests
        const resp = await fetch(`${client.url}/resources`);
        if (!resp.ok) continue;
        const resources = await resp.json();
        for (const r of resources) {
          all.push({ ...r, source: client.name });
        }
      } catch (err) {
        console.error(`Error fetching remote resources from ${client.name}:`, err);
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
        // Use global fetch to ensure it can be mocked in tests
        const resp = await fetch(`${client.url}/prompts`);
        if (!resp.ok) continue;
        const prompts = await resp.json();
        for (const p of prompts) {
          all.push({ ...p, source: client.name });
        }
      } catch (err) {
        console.error(`Error fetching remote prompts from ${client.name}:`, err);
        // ignore unreachable client
      }
    }
    return all;
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // --- SSE Connection Handling ---
    if (req.headers.accept === 'text/event-stream') {
      // Check if SSE mode is enabled (although the check is already in listen)
      if (this.mode !== 'sse') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'SSE mode not enabled on server' }));
        return;
      }

      const clientId = (this.nextClientId++).toString();
      console.log(`SSE client connected: ${clientId}`);

      // Send SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        // Optional: Add CORS headers if needed
        // 'Access-Control-Allow-Origin': '*'
      });

      // Store the client response object for later use
      this.sseClients.set(clientId, res);

      // Send an initial connection confirmation event (optional)
      this.sendSSEEvent(clientId, 'connected', { clientId });

      // Handle client disconnection
      req.on('close', () => {
        console.log(`SSE client disconnected: ${clientId}`);
        this.sseClients.delete(clientId);
        // Optional: Emit a disconnect event if needed
        // this.emit('clientDisconnect', clientId);
      });

      // Keep the connection open, don't end the response here for SSE
      return;
    }

    // --- Regular HTTP Request Handling ---
    if (!req.url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing URL' }));
      return;
    }
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
      const clientId = req.headers['x-mcp-client-id'] as string | undefined;

      let body = '';
      req.on('data', (chunk: Buffer | string) => (body += chunk.toString()));
      req.on('end', async () => {
        let params: ToolParams;
        try {
          params = JSON.parse(body);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const tool = this.tools.get(toolName);
        const sseClientExists = clientId && this.sseClients.has(clientId);

        // --- SSE Invocation Path ---
        if (tool && clientId && sseClientExists) {
          console.log(`Invoking tool '${toolName}' for SSE client ${clientId}`);
          // Send 202 Accepted for the HTTP POST request
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'accepted', tool: toolName }));

          // Create reporter for this specific client
          const reporter: ToolReporter = {
            reportProgress: (report) => {
              this.sendSSEEvent(clientId, 'toolProgress', { toolName, ...report });
            },
            sendPartialResult: (result) => {
              this.sendSSEEvent(clientId, 'toolPartialResult', { toolName, result });
            },
          };

          try {
            // Invoke tool handler with reporter
            const finalResult = await tool.handler(params, reporter);
            // Send final result via SSE
            this.sendSSEEvent(clientId, 'toolResult', { toolName, result: finalResult });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`Error during SSE tool execution for ${clientId}:`, err);
            // Send error via SSE
            this.sendSSEEvent(clientId, 'toolError', { toolName, error: errorMessage });
          }
          return; // Handled via SSE
        }

        // --- Fallback/Standard HTTP Invocation Path ---
        console.log(`Invoking tool '${toolName}' via standard HTTP`);
        if (tool) {
          try {
            // Invoke handler without reporter
            const result = await tool.handler(params);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result }));
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: errorMessage }));
          }
          return;
        }

        // --- Try Remote Tools (HTTP Only for now) ---
        console.log(`Tool '${toolName}' not found locally, trying remote...`);
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
          } catch (err) {
            console.error(`Error invoking remote tool ${toolName} from ${client.name}:`, err);
          }
        }

        // --- Tool Not Found (Local & Remote) ---
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Tool not found: ${toolName}` }));
      }); // End of req.on('end')
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  // --- Helper to send SSE events ---
  private sendSSEEvent(clientId: string, event: string, data: any) {
    const clientRes = this.sseClients.get(clientId);
    if (clientRes) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      clientRes.write(message);
    } else {
      console.warn(`Attempted to send SSE event to non-existent client: ${clientId}`);
    }
  }

  // --- Public method to broadcast to all SSE clients (example) ---
  public broadcastSSEEvent(event: string, data: any) {
    console.log(`Broadcasting SSE event '${event}' to ${this.sseClients.size} clients`);
    this.sseClients.forEach((_res, clientId) => {
      this.sendSSEEvent(clientId, event, data);
    });
  }

  listen(port = 8080): void {
    if (this.mode === 'sse') {
      this.server = createServer(this.handleRequest.bind(this));
      this.server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`FastMCP server listening on http://localhost:${port}`);
      });
    } else if (this.mode === 'stdio') {
      // Minimal stdio mode: read JSON lines from stdin, write responses to stdout
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', async (data: Buffer | string) => {
        try {
          // Original simple StdioRequest interface assumption
          interface StdioRequest {
            type: string;
            name?: string; // Make name optional based on usage
            params?: ToolParams;
          }

          const req: StdioRequest = JSON.parse(data.toString());

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
            // Fix 1: Check if req.name exists before using it
            if (!req.name) {
              throw new Error('Missing tool name in invokeTool request');
            }
            const tool = this.tools.get(req.name);
            if (tool) {
              // Fix 2: Check if req.params exists before passing to handler
              if (req.params === undefined) {
                throw new Error(`Missing params for tool ${req.name}`);
              }
              const result = await tool.handler(req.params);
              process.stdout.write(JSON.stringify({ result }) + '\n');
            } else {
              // Try remote tools (assuming remote invocation doesn't have same strict checks)
              let found = false;
              for (const client of this.clients) {
                try {
                  // Use global fetch
                  const resp = await fetch(`${client.url}/tool/${req.name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req.params), // Pass params even if undefined? Remote might handle it.
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    process.stdout.write(
                      JSON.stringify({ result: data.result, remote: client.name }) + '\n',
                    );
                    found = true;
                    break;
                  }
                } catch (err) {
                  console.error(`Error invoking remote tool ${req.name} from ${client.name}:`, err);
                  // ignore and try next
                }
              }
              if (!found) {
                // Only throw if tool not found locally AND remotely
                process.stdout.write(
                  JSON.stringify({ error: `Tool not found: ${req.name}` }) + '\n',
                );
              }
            }
          } else {
            process.stdout.write(JSON.stringify({ error: 'Unknown request type' }) + '\n');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          // Send error back over stdout for STDIO mode
          process.stdout.write(JSON.stringify({ error: errorMessage }) + '\n');
        }
      });
    }
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            console.error('Error stopping FastMCP server:', err);
            return reject(err);
          }
          console.log('FastMCP server stopped.');
          this.server = undefined;
          resolve();
        });
        // Close any open SSE connections
        this.sseClients.forEach((res) => res.end());
        this.sseClients.clear();
      } else {
        resolve(); // Already stopped
      }
    });
  }
}
