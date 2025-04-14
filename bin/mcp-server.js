#!/usr/bin/env node
/* eslint-disable no-undef */

async function main() {
  // Load environment variables from .env file if available
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (error) {
    console.log('dotenv not available, skipping .env loading');
  }

  // Get port from environment variable or command line
  const portArg = process.argv.findIndex((arg) => arg === '--port');
  if (portArg !== -1 && process.argv[portArg + 1]) {
    process.env.PORT = process.argv[portArg + 1];
  }

  // Check for transport type argument
  const transportArg = process.argv.findIndex((arg) => arg === '--transport');
  const transport =
    transportArg !== -1 && process.argv[transportArg + 1] ? process.argv[transportArg + 1] : 'sse';
    
  // Check for log level
  const logLevel = process.env.LOG_LEVEL || 'info';
  console.log(`Log level: ${logLevel}`);

  // Import the MCP server module from the bundle
  const { startMcpServer } = await import('../dist/bundle.js');

  // Start the MCP server with the selected transport
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  const { httpServer } = await startMcpServer({
    name: 'Skynet-MCP',
    version: '1.0.0',
    port,
    transport: transport === 'stdio' ? 'stdio' : 'sse',
  });

  if (transport === 'sse') {
    console.log(`Skynet-MCP server is running on port ${port}`);
    console.log(`SSE endpoint available at http://localhost:${port}/sse`);
    console.log('Press Ctrl+C to stop the server');
  }

  // Handle graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}, shutting down...`);

      if (httpServer) {
        await new Promise((resolve) => {
          httpServer.close(() => resolve());
        });
      }

      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
