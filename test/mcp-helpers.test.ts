import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createServer,
  createClient,
  getSdkVersion,
  checkSdkVersionCompatibility,
  connectServer,
  connectClient,
  closeServer,
  closeClient,
} from '../src/utils/mcp-helpers.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Define mock types to help TypeScript understand the mocks
type MockFn = ReturnType<typeof vi.fn>;
interface MockServer {
  connect: MockFn;
  close: MockFn;
  onerror: MockFn;
}

interface MockClient {
  connect: MockFn;
  close: MockFn;
  onerror: MockFn;
}

// Mock the SDK modules
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      onerror: vi.fn(),
    })),
  };
});

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      onerror: vi.fn(),
    })),
  };
});

describe('MCP Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createServer', () => {
    it('should create a server instance with the provided options', () => {
      const server = createServer('test-server', '1.0.0', {
        capabilities: { tools: {} },
      });

      expect(Server).toHaveBeenCalledWith(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: { tools: {} } },
      );
      expect(server).toBeDefined();
    });

    it('should create a server with default capabilities if not provided', () => {
      const server = createServer('test-server', '1.0.0');

      expect(Server).toHaveBeenCalledWith(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: {} },
      );
      expect(server).toBeDefined();
    });
  });

  describe('createClient', () => {
    it('should create a client instance with the provided options', () => {
      const client = createClient('test-client', '1.0.0', {
        capabilities: { tools: {} },
      });

      expect(Client).toHaveBeenCalledWith(
        { name: 'test-client', version: '1.0.0' },
        { capabilities: { tools: {} } },
      );
      expect(client).toBeDefined();
    });

    it('should create a client with default capabilities if not provided', () => {
      const client = createClient('test-client', '1.0.0');

      expect(Client).toHaveBeenCalledWith(
        { name: 'test-client', version: '1.0.0' },
        { capabilities: {} },
      );
      expect(client).toBeDefined();
    });
  });

  describe('getSdkVersion', () => {
    it('should return the current SDK version', () => {
      const version = getSdkVersion();
      expect(version).toBe('1.7.0');
    });
  });

  describe('checkSdkVersionCompatibility', () => {
    it('should return true for compatible versions', () => {
      expect(checkSdkVersionCompatibility('1.0.0')).toBe(true);
      expect(checkSdkVersionCompatibility('1.7.0')).toBe(true);
      expect(checkSdkVersionCompatibility('0.9.0')).toBe(true);
    });

    it('should return false for incompatible versions', () => {
      expect(checkSdkVersionCompatibility('2.0.0')).toBe(false);
    });

    it('should return false for invalid version strings', () => {
      expect(checkSdkVersionCompatibility('invalid')).toBe(false);
      expect(checkSdkVersionCompatibility('1.0')).toBe(false);
      expect(checkSdkVersionCompatibility('')).toBe(false);
    });
  });

  describe('connectServer', () => {
    it('should connect a server to a transport', async () => {
      const server = createServer('test-server', '1.0.0');
      const transport = { connect: vi.fn().mockResolvedValue(undefined) };

      await connectServer(server, transport as any);

      expect(server.connect).toHaveBeenCalledWith(transport);
    });

    it('should retry connection on failure if retryOptions are provided', async () => {
      const server = createServer('test-server', '1.0.0');
      const transport = { connect: vi.fn() };

      // Mock the server.connect to fail once then succeed
      const mockConnect = server.connect as unknown as MockFn;
      mockConnect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      // Mock setTimeout to execute immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      await connectServer(server, transport as any, { maxRetries: 1, retryDelay: 100 });

      expect(mockConnect).toHaveBeenCalledTimes(2);
      expect(mockConnect).toHaveBeenCalledWith(transport);
    });

    it('should throw an error after max retries', async () => {
      const server = createServer('test-server', '1.0.0');
      const transport = { connect: vi.fn() };

      // Mock the server.connect to always fail
      const mockConnect = server.connect as unknown as MockFn;
      mockConnect.mockRejectedValue(new Error('Connection failed'));

      // Mock setTimeout to execute immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      await expect(
        connectServer(server, transport as any, { maxRetries: 2, retryDelay: 100 }),
      ).rejects.toThrow('Failed to connect server after 2 retries');

      expect(mockConnect).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
    });
  });

  describe('connectClient', () => {
    it('should connect a client to a transport', async () => {
      const client = createClient('test-client', '1.0.0');
      const transport = { connect: vi.fn().mockResolvedValue(undefined) };

      await connectClient(client, transport as any);

      expect(client.connect).toHaveBeenCalledWith(transport);
    });

    it('should retry connection on failure if retryOptions are provided', async () => {
      const client = createClient('test-client', '1.0.0');
      const transport = { connect: vi.fn() };

      // Mock the client.connect to fail once then succeed
      const mockConnect = client.connect as unknown as MockFn;
      mockConnect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      // Mock setTimeout to execute immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      await connectClient(client, transport as any, { maxRetries: 1, retryDelay: 100 });

      expect(mockConnect).toHaveBeenCalledTimes(2);
      expect(mockConnect).toHaveBeenCalledWith(transport);
    });
  });

  describe('closeServer and closeClient', () => {
    it('should close a server connection', async () => {
      const server = createServer('test-server', '1.0.0');
      await closeServer(server);
      expect(server.close).toHaveBeenCalled();
    });

    it('should close a client connection', async () => {
      const client = createClient('test-client', '1.0.0');
      await closeClient(client);
      expect(client.close).toHaveBeenCalled();
    });

    it('should handle errors when closing a server', async () => {
      const server = createServer('test-server', '1.0.0');
      const mockClose = server.close as unknown as MockFn;
      mockClose.mockRejectedValue(new Error('Close failed'));

      await expect(closeServer(server)).rejects.toThrow('Failed to close server');
    });

    it('should handle errors when closing a client', async () => {
      const client = createClient('test-client', '1.0.0');
      const mockClose = client.close as unknown as MockFn;
      mockClose.mockRejectedValue(new Error('Close failed'));

      await expect(closeClient(client)).rejects.toThrow('Failed to close client');
    });
  });
});
