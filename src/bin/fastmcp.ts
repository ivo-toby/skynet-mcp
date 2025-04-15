#!/usr/bin/env node
import { FastMCP, Tool, Resource, Prompt } from '../fastmcp.js';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const mode = (process.env.FASTMCP_MODE as 'stdio' | 'sse') || 'sse';

// Example tool
const echoTool: Tool = {
  name: 'echo',
  description: 'Echoes the input parameters',
  handler: async (params) => params,
};

// Example resource
const timeResource: Resource = {
  name: 'time',
  description: 'Returns the current server time',
  fetch: async () => ({ time: new Date().toISOString() }),
};

// Example prompt
const helloPrompt: Prompt = {
  name: 'hello',
  description: 'A hello world prompt',
  template: 'Hello, world!',
};

const server = new FastMCP({
  port,
  mode,
  tools: [echoTool],
  resources: [timeResource],
  prompts: [helloPrompt],
});

server.listen(port);
