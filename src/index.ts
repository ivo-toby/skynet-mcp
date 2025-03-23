/**
 * Skynet-MCP: A hierarchical network of AI agents using the Model Context Protocol
 *
 * This is the main entry point for the Skynet-MCP application.
 */

// Export key components
export * from './orchestrator/index.js';
export * from './server/mcp-server.js';

// Export version info
export const version = '0.1.0';

// Log initialization message when imported directly
if (require.main === module) {
  console.log('Skynet-MCP initialized');
  console.log(`Version: ${version}`);
  console.log('Use the SimpleAgent class to create an agent that can use MCP tools.');
}
