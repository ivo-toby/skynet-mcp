#!/usr/bin/env node
/* eslint-disable no-undef */

async function main() {
  // Get port from environment variable or command line
  const portArg = process.argv.findIndex((arg) => arg === "--port");
  if (portArg !== -1 && process.argv[portArg + 1]) {
    process.env.PORT = process.argv[portArg + 1];
  }

  // Import the HTTP server module from the bundle
  const { startHttpServer } = await import('../dist/bundle.js');
  
  // Start the HTTP server with MCP capabilities
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await startHttpServer(port);
  
  console.log(`Skynet-MCP server is running on port ${port}`);
  console.log('Press Ctrl+C to stop the server');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
