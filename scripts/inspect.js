#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = resolve(__dirname, '../bin/mcp-server.js');

const args = ['npx', '@modelcontextprotocol/inspector', 'node', serverPath];

// Execute the command
import { spawn } from 'child_process';
const inspect = spawn(args[0], args.slice(1), { stdio: 'inherit' });

inspect.on('error', (err) => {
  console.error('Failed to start inspector:', err);
  process.exit(1);
});

inspect.on('exit', (code) => {
  process.exit(code || 0);
});
