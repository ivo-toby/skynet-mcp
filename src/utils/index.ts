/**
 * Utility functions for the Skynet-MCP project
 */

/**
 * Validates if the provided port is valid
 * 
 * @param port Port number to validate
 * @returns Boolean indicating if the port is valid
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port < 65536;
}

/**
 * Formats a response for the MCP tools
 * 
 * @param data The data to format
 * @param isError Whether the response is an error
 * @returns Formatted response object
 */
export function formatMcpResponse(data: any, isError = false): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data),
      },
    ],
    ...(isError ? { isError: true } : {}),
  };
}

/**
 * Parses command-line arguments for the MCP server
 * 
 * @param args Command-line arguments
 * @returns Parsed arguments
 */
export function parseArgs(args: string[]): {
  port?: number;
  transport?: 'stdio' | 'sse';
} {
  const result: { port?: number; transport?: 'stdio' | 'sse' } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
      const port = parseInt(args[i + 1], 10);
      if (isValidPort(port)) {
        result.port = port;
      }
      i++;
    } else if (args[i] === '--transport' && i + 1 < args.length) {
      const transport = args[i + 1].toLowerCase();
      if (transport === 'stdio' || transport === 'sse') {
        result.transport = transport;
      }
      i++;
    }
  }
  
  return result;
}
