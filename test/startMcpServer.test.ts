import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { startMcpServer } from '../src/startMcpServer';
import { createServer } from 'http';
import * as fastmcp from 'fastmcp';

// Mock HTTP server
vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn(),
    close: vi.fn(),
  })),
  Server: vi.fn(),
}));

// Mock FastMCP
vi.mock('fastmcp', async () => {
  const actual = await vi.importActual('fastmcp');
  return {
    ...actual,
    FastMCP: vi.fn(() => ({
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn(),
    })),
  };
});

// Helper function to get random port
async function getRandomPort(): Promise<number> {
  return Math.floor(Math.random() * 10000) + 50000; // Random port between 50000-60000
}

describe('startMcpServer', () => {
  let consoleSpy: { error: any; log: any; warn: any };
  let port: number;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Spy on console methods
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };

    port = await getRandomPort();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a FastMCP server with the correct options', async () => {
    await startMcpServer({
      name: 'Test Server',
      version: '1.0.0',
      port,
      transport: 'stdio',
    });

    expect(fastmcp.FastMCP).toHaveBeenCalledWith({
      name: 'Test Server',
      version: '1.0.0',
    });
  });

  it('should add error handler to the server', async () => {
    const mockServer = {
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn(),
    };

    (fastmcp.FastMCP as any).mockImplementation(() => mockServer);

    await startMcpServer({
      name: 'Test Server',
      version: '1.0.0',
      port,
      transport: 'stdio',
    });

    expect(mockServer.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should configure server with stdio transport', async () => {
    const mockServer = {
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn(),
    };

    (fastmcp.FastMCP as any).mockImplementation(() => mockServer);

    await startMcpServer({
      name: 'Test Server',
      version: '1.0.0',
      port,
      transport: 'stdio',
    });

    expect(mockServer.start).toHaveBeenCalledWith(
      expect.objectContaining({
        transportType: 'stdio',
        onError: expect.any(Function),
      }),
    );
    expect(createServer).not.toHaveBeenCalled();
  });

  it('should configure server with SSE transport and create HTTP server', async () => {
    const mockServer = {
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn(),
    };

    (fastmcp.FastMCP as any).mockImplementation(() => mockServer);

    const result = await startMcpServer({
      name: 'Test Server',
      version: '1.0.0',
      port,
      transport: 'sse',
    });

    expect(createServer).toHaveBeenCalled();
    expect(mockServer.start).toHaveBeenCalledWith(
      expect.objectContaining({
        transportType: 'sse',
        sse: {
          endpoint: '/sse',
          port,
        },
        onError: expect.any(Function),
      }),
    );
    expect(result.httpServer).not.toBeNull();
  });

  it('should register all required tools', async () => {
    const mockServer = {
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn(),
    };

    (fastmcp.FastMCP as any).mockImplementation(() => mockServer);

    await startMcpServer({
      name: 'Test Server',
      version: '1.0.0',
      port,
      transport: 'stdio',
    });

    // Should add 4 tools
    expect(mockServer.addTool).toHaveBeenCalledTimes(4);

    // Verify each tool is registered
    expect(mockServer.addTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'spawn_agent',
      }),
    );
    expect(mockServer.addTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'get_agent_status',
      }),
    );
    expect(mockServer.addTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'get_agent_result',
      }),
    );
    expect(mockServer.addTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'terminate_agent',
      }),
    );
  });

  it('should register the token usage resource', async () => {
    const mockServer = {
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn(),
    };

    (fastmcp.FastMCP as any).mockImplementation(() => mockServer);

    await startMcpServer({
      name: 'Test Server',
      version: '1.0.0',
      port,
      transport: 'stdio',
    });

    expect(mockServer.addResource).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'data://token-usage',
        name: 'Token Usage Statistics',
      }),
    );
  });

  it('should handle "Not connected" errors without crashing', async () => {
    const mockServer = {
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn(),
    };

    (fastmcp.FastMCP as any).mockImplementation(() => mockServer);

    await startMcpServer({
      name: 'Test Server',
      version: '1.0.0',
      port,
      transport: 'stdio',
    });

    // Extract the onError handler from the call to start
    const startCall = mockServer.start.mock.calls[0][0];
    const onErrorHandler = startCall.onError;

    // Test that "Not connected" errors are handled specially
    onErrorHandler(new Error('Not connected'));
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      expect.stringContaining('Client connection error detected'),
    );

    // Test that other errors are logged but not specially handled
    onErrorHandler(new Error('Some other error'));
    expect(consoleSpy.error).toHaveBeenCalledWith('Connection error:', 'Some other error');
  });

  it('should handle server start failures', async () => {
    const mockServer = {
      on: vi.fn(),
      addTool: vi.fn(),
      addResource: vi.fn(),
      start: vi.fn().mockImplementation(() => {
        throw new Error('Failed to start server');
      }),
    };

    (fastmcp.FastMCP as any).mockImplementation(() => mockServer);

    await expect(
      startMcpServer({
        name: 'Test Server',
        version: '1.0.0',
        port,
        transport: 'stdio',
      }),
    ).rejects.toThrow('Failed to start server');

    expect(consoleSpy.error).toHaveBeenCalledWith('Failed to start MCP server:', expect.any(Error));
  });
});
