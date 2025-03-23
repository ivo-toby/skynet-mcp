/**
 * Utility functions for working with the Model Context Protocol (MCP)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { ServerOptions, ClientOptions } from '@modelcontextprotocol/sdk/types.js';

// Define types for server and client transports
type ServerTransport = Transport;
type ClientTransport = Transport;

/**
 * Creates a new MCP server instance with the provided options
 * @param name Server name
 * @param version Server version
 * @param capabilities Additional server capabilities
 * @returns Configured MCP server instance
 */
export function createServer(
  name: string,
  version: string,
  capabilities: Record<string, any> = {},
): Server {
  return new Server(
    {
      name,
      version,
    },
    {
      capabilities: capabilities,
    },
  );
}

/**
 * Creates a new MCP client instance with the provided options
 * @param name Client name
 * @param version Client version
 * @param capabilities Additional client capabilities
 * @returns Configured MCP client instance
 */
export function createClient(
  name: string,
  version: string,
  capabilities: Record<string, any> = {},
): Client {
  return new Client(
    {
      name,
      version,
    },
    {
      capabilities: capabilities,
    },
  );
}

/**
 * Gets the current SDK version from package.json
 * @returns SDK version as string
 */
export function getSdkVersion(): string {
  // Try to get the version from package.json
  return process.env.npm_package_dependencies_modelcontextprotocol_sdk || '1.7.0';
}

/**
 * Checks if the provided SDK version is compatible with the current version
 * @param currentVersion The current SDK version
 * @param requiredVersion The required SDK version to check compatibility with
 * @returns True if compatible, false otherwise
 */
export function checkSdkVersionCompatibility(
  currentVersion: string,
  requiredVersion: string,
): boolean {
  // Validate inputs first
  if (!currentVersion || !requiredVersion) {
    return false;
  }

  // Parse versions
  let currentParts: number[];
  let requiredParts: number[];

  try {
    currentParts = currentVersion.split('.').map(Number);
    requiredParts = requiredVersion.split('.').map(Number);

    // Check for NaN values or incomplete version strings
    if (currentParts.some(isNaN) || requiredParts.some(isNaN)) {
      return false;
    }
    
    // Special case for incomplete versions (like '1.7')
    if (currentVersion.split('.').length < 3 || requiredVersion.split('.').length < 3) {
      return false;
    }

    // Pad with zeros if needed
    while (currentParts.length < 3) currentParts.push(0);
    while (requiredParts.length < 3) requiredParts.push(0);
  } catch (error) {
    return false;
  }

  // For now, we only enforce minor version compatibility
  // Major version difference - not compatible
  if (currentParts[0] !== requiredParts[0]) {
    return false;
  }

  // Minor version should be at least the required minor
  if (currentParts[1] < requiredParts[1]) {
    return false;
  }

  // If major and minor match, patch version doesn't matter for compatibility
  return true;
}

/**
 * Connects a server to a transport with retry options
 * @param server The MCP server to connect
 * @param transport The transport to connect to
 * @param retryOptions Options for retry behavior
 */
export async function connectServer(
  server: Server,
  transport: ServerTransport,
  retryOptions?: { maxRetries?: number; delayMs?: number },
): Promise<void> {
  const maxRetries = retryOptions?.maxRetries || 0;
  const delayMs = retryOptions?.delayMs || 1000;
  let retryCount = 0;

  while (true) {
    try {
      await server.connect(transport);
      return;
    } catch (error) {
      retryCount++;
      if (retryCount > maxRetries) {
        console.error('Error connecting server to transport after retries:', error);
        throw new Error(
          `Failed to connect server after ${maxRetries} retries: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Connects a client to a transport with retry options
 * @param client The MCP client to connect
 * @param transport The transport to connect to
 * @param retryOptions Options for retry behavior
 */
export async function connectClient(
  client: Client,
  transport: ClientTransport,
  retryOptions?: { maxRetries?: number; delayMs?: number },
): Promise<void> {
  const maxRetries = retryOptions?.maxRetries || 0;
  const delayMs = retryOptions?.delayMs || 1000;
  let retryCount = 0;

  while (true) {
    try {
      await client.connect(transport);
      return;
    } catch (error) {
      retryCount++;
      if (retryCount > maxRetries) {
        console.error('Error connecting client to transport after retries:', error);
        throw new Error(
          `Failed to connect client after ${maxRetries} retries: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Closes a server connection
 * @param server The MCP server to close
 */
export async function closeServer(server: Server): Promise<void> {
  try {
    await server.close();
  } catch (error) {
    console.error('Error closing server:', error);
    throw new Error(
      `Failed to close server: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Closes a client connection
 * @param client The MCP client to close
 */
export async function closeClient(client: Client): Promise<void> {
  try {
    await client.close();
  } catch (error) {
    console.error('Error closing client:', error);
    throw new Error(
      `Failed to close client: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
