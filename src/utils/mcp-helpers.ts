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
 * @param options Additional server options
 * @returns Configured MCP server instance
 */
export function createServer(
  name: string,
  version: string,
  options: Partial<ServerOptions> = {},
): Server {
  return new Server(
    {
      name,
      version,
    },
    {
      capabilities: options.capabilities || {},
      ...options,
    },
  );
}

/**
 * Creates a new MCP client instance with the provided options
 * @param name Client name
 * @param version Client version
 * @param options Additional client options
 * @returns Configured MCP client instance
 */
export function createClient(
  name: string,
  version: string,
  options: Partial<ClientOptions> = {},
): Client {
  return new Client(
    {
      name,
      version,
    },
    {
      capabilities: options.capabilities || {},
      ...options,
    },
  );
}

/**
 * Gets the current MCP SDK version
 * @returns The current SDK version string
 */
export function getSdkVersion(): string {
  try {
    // In a real implementation, we would dynamically import the package.json
    // or use a method provided by the SDK to get its version
    // For now, we'll use the version from our package.json
    return '1.7.0';
  } catch (error) {
    console.error('Error getting SDK version:', error);
    return '0.0.0';
  }
}

/**
 * Checks if the SDK version is compatible with the required version
 * @param requiredVersion The minimum required version
 * @returns True if the SDK version is compatible, false otherwise
 */
export function checkSdkVersionCompatibility(requiredVersion: string): boolean {
  try {
    const sdkVersion = getSdkVersion();

    // Validate version strings
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(requiredVersion) || !versionRegex.test(sdkVersion)) {
      console.error('Invalid version format. Expected format: x.y.z');
      return false;
    }

    // Simple version comparison
    const [reqMajor, reqMinor, reqPatch] = requiredVersion.split('.').map(Number);
    const [sdkMajor, sdkMinor, sdkPatch] = sdkVersion.split('.').map(Number);

    if (sdkMajor > reqMajor) return true;
    if (sdkMajor < reqMajor) return false;

    if (sdkMinor > reqMinor) return true;
    if (sdkMinor < reqMinor) return false;

    return sdkPatch >= reqPatch;
  } catch (error) {
    console.error('Error checking SDK version compatibility:', error);
    return false;
  }
}

/**
 * Connects a server to a transport with enhanced error handling
 * @param server The MCP server instance
 * @param transport The server transport to connect to
 * @param retryOptions Options for connection retry (optional)
 * @returns A promise that resolves when the connection is established
 */
export async function connectServer(
  server: Server,
  transport: ServerTransport,
  retryOptions?: { maxRetries?: number; retryDelay?: number },
): Promise<void> {
  const maxRetries = retryOptions?.maxRetries || 0;
  const retryDelay = retryOptions?.retryDelay || 1000;
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
          `Failed to connect server after ${maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      console.warn(`Connection attempt ${retryCount} failed, retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Connects a client to a transport with enhanced error handling
 * @param client The MCP client instance
 * @param transport The client transport to connect to
 * @param retryOptions Options for connection retry (optional)
 * @returns A promise that resolves when the connection is established
 */
export async function connectClient(
  client: Client,
  transport: ClientTransport,
  retryOptions?: { maxRetries?: number; retryDelay?: number },
): Promise<void> {
  const maxRetries = retryOptions?.maxRetries || 0;
  const retryDelay = retryOptions?.retryDelay || 1000;
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
          `Failed to connect client after ${maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      console.warn(`Connection attempt ${retryCount} failed, retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Safely closes a server connection with error handling
 * @param server The MCP server instance to close
 * @returns A promise that resolves when the server is closed
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
 * Safely closes a client connection with error handling
 * @param client The MCP client instance to close
 * @returns A promise that resolves when the client is closed
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
