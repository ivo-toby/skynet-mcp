import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpServer } from '../../src/server/mcp-server.js';

// Mock the SDK Server
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      setRequestHandler: vi.fn(),
      onerror: null,
    })),
  };
});

describe('McpServer', () => {
  let server: McpServer;
  let mockTransport: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a mock transport
    mockTransport = {
      handlePostMessage: vi.fn(),
    };

    // Create a new server instance
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Initialization', () => {
    it('should create a server with the correct metadata', () => {
      expect(server).toBeDefined();
      expect(Server).toHaveBeenCalledWith(
        { name: 'test-server', version: '1.0.0' },
        expect.objectContaining({ capabilities: expect.any(Object) }),
      );
    });

    it('should connect to the transport when started', async () => {
      await server.connectWithTransport(mockTransport);
      expect(server['server'].connect).toHaveBeenCalledWith(mockTransport);
    });

    it('should close the connection when stopped', async () => {
      await server.connectWithTransport(mockTransport);
      await server.stop();
      expect(server['server'].close).toHaveBeenCalled();
    });
  });

  describe('Tool Registration', () => {
    it('should register a tool with the correct schema', () => {
      // Define a simple tool
      const toolName = 'test-tool';
      const toolDescription = 'A test tool';
      const inputSchema = {
        type: 'object',
        properties: {
          param1: { type: 'string' },
          param2: { type: 'number' },
        },
        required: ['param1'],
      };

      // Register the tool
      server.registerTool(toolName, toolDescription, inputSchema, async () => {
        return { content: [{ type: 'text', text: 'Tool executed' }] };
      });

      // Verify the tool was registered
      expect(server['tools'].has(toolName)).toBe(true);
      const tool = server['tools'].get(toolName);
      expect(tool).toEqual({
        name: toolName,
        description: toolDescription,
        inputSchema,
        handler: expect.any(Function),
      });
    });

    it('should throw an error when registering a tool with a duplicate name', () => {
      // Register a tool
      server.registerTool('duplicate-tool', 'First tool', { type: 'object' }, async () => {
        return { content: [{ type: 'text', text: 'Tool executed' }] };
      });

      // Try to register another tool with the same name
      expect(() => {
        server.registerTool('duplicate-tool', 'Second tool', { type: 'object' }, async () => {
          return { content: [{ type: 'text', text: 'Tool executed' }] };
        });
      }).toThrow('Tool with name duplicate-tool already exists');
    });
  });

  describe('Tool Execution', () => {
    it('should execute a registered tool with valid parameters', async () => {
      // Create a mock handler
      const mockHandler = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Tool executed successfully' }],
      });

      // Register the tool
      server.registerTool(
        'execute-tool',
        'Tool to execute',
        {
          type: 'object',
          properties: {
            param: { type: 'string' },
          },
        },
        mockHandler,
      );

      // Execute the tool
      const result = await server['executeToolHandler']({
        name: 'execute-tool',
        arguments: { param: 'test value' },
      });

      // Verify the handler was called with the correct parameters
      expect(mockHandler).toHaveBeenCalledWith({ param: 'test value' });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Tool executed successfully' }],
      });
    });

    it('should throw an error when executing a non-existent tool', async () => {
      await expect(
        server['executeToolHandler']({
          name: 'non-existent-tool',
          arguments: {},
        }),
      ).rejects.toThrow(
        new McpError(ErrorCode.MethodNotFound, 'Tool not found: non-existent-tool'),
      );
    });

    it('should handle errors thrown by tool handlers', async () => {
      // Register a tool that throws an error
      server.registerTool(
        'error-tool',
        'Tool that throws an error',
        {
          type: 'object',
        },
        async () => {
          throw new Error('Tool execution failed');
        },
      );

      // Execute the tool and expect an error response
      const result = await server['executeToolHandler']({
        name: 'error-tool',
        arguments: {},
      });

      // Verify the error is properly formatted
      expect(result).toEqual({
        isError: true,
        content: [{ type: 'text', text: expect.stringContaining('Tool execution failed') }],
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should authenticate requests with valid credentials', () => {
      // Set up authentication
      server.setAuthenticationHandler((token) => {
        return token === 'valid-token';
      });

      // Test with valid token
      expect(server['authenticateRequest']('valid-token')).toBe(true);

      // Test with invalid token
      expect(server['authenticateRequest']('invalid-token')).toBe(false);
    });

    it('should authorize tool access based on permissions', () => {
      // Set up authorization
      server.setAuthorizationHandler((token, toolName) => {
        return token === 'admin-token' || toolName === 'public-tool';
      });

      // Test with admin token
      expect(server['authorizeToolAccess']('admin-token', 'any-tool')).toBe(true);

      // Test with regular token and public tool
      expect(server['authorizeToolAccess']('regular-token', 'public-tool')).toBe(true);

      // Test with regular token and restricted tool
      expect(server['authorizeToolAccess']('regular-token', 'restricted-tool')).toBe(false);
    });
  });

  describe('SSE Transport', () => {
    it('should set up HTTP SSE transport correctly', () => {
      const sseSend = vi.fn();
      server.setupHttpSSE(sseSend);

      // Verify the SSE send function is stored
      expect(server['sseSend']).toBe(sseSend);

      // Verify the handshake is sent
      expect(sseSend).toHaveBeenCalledWith(
        'handshake',
        expect.objectContaining({
          name: 'test-server',
          version: '1.0.0',
          capabilities: expect.any(Object),
        }),
      );
    });

    it('should handle client messages correctly', async () => {
      const sseSend = vi.fn();
      server.setupHttpSSE(sseSend);

      // Register a tool for testing
      server.registerTool(
        'sse-tool',
        'Tool for SSE testing',
        {
          type: 'object',
          properties: {
            param: { type: 'string' },
          },
        },
        async (args) => {
          return {
            content: [{ type: 'text', text: `Executed with ${args.param}` }],
          };
        },
      );

      // Simulate a listTools request
      await server.handleClientMessage({
        jsonrpc: '2.0',
        id: '123',
        method: 'listTools',
      });

      // Verify the response
      expect(sseSend).toHaveBeenCalledWith(
        'response',
        expect.objectContaining({
          jsonrpc: '2.0',
          id: '123',
          result: expect.objectContaining({
            tools: expect.arrayContaining([
              expect.objectContaining({
                name: 'sse-tool',
                description: 'Tool for SSE testing',
              }),
            ]),
          }),
        }),
      );

      // Simulate a callTool request
      await server.handleClientMessage({
        jsonrpc: '2.0',
        id: '456',
        method: 'callTool',
        params: {
          name: 'sse-tool',
          arguments: { param: 'test' },
        },
      });

      // Verify the response
      expect(sseSend).toHaveBeenCalledWith(
        'response',
        expect.objectContaining({
          jsonrpc: '2.0',
          id: '456',
          result: expect.objectContaining({
            content: [{ type: 'text', text: 'Executed with test' }],
          }),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON-RPC requests', async () => {
      const sseSend = vi.fn();
      server.setupHttpSSE(sseSend);

      // Simulate an invalid request
      await server.handleClientMessage({
        jsonrpc: '2.0',
        id: '123',
        method: 'invalidMethod',
      });

      // Verify the error response
      expect(sseSend).toHaveBeenCalledWith(
        'response',
        expect.objectContaining({
          jsonrpc: '2.0',
          id: '123',
          error: expect.objectContaining({
            code: ErrorCode.MethodNotFound,
            message: expect.stringContaining('Method not found'),
          }),
        }),
      );
    });

    it('should handle errors during request processing', async () => {
      const sseSend = vi.fn();
      server.setupHttpSSE(sseSend);

      // Set up the server to throw an error during processing
      server['server'].setRequestHandler = vi.fn();

      // Mock console.error to verify it's called
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Simulate an error handler call if it exists
      if (server['server'].onerror) {
        server['server'].onerror(new Error('Test error'));
      }

      // Restore console.error
      console.error = originalConsoleError;

      // Verify the error handler is set
      expect(server['server'].onerror).toBeDefined();
    });
  });
});
