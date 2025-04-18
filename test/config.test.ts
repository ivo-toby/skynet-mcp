import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Mock dependencies before importing the config module
vi.mock('node:fs');
vi.mock('dotenv', () => ({
  config: vi.fn(), // Mock dotenv.config()
}));

describe('Configuration System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Reset mocks and environment variables before each test
    vi.resetModules(); // Important to re-evaluate the config module
    vi.clearAllMocks();
    originalEnv = { ...process.env }; // Backup original env
  });

  afterEach(() => {
    process.env = originalEnv; // Restore original env
  });

  it('should load default configuration values', async () => {
    // Mock fs to simulate no config files existing
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Import config *after* mocks are set up
    const { config } = await import('../src/config');

    expect(config.server?.port).toBe(3000);
    expect(config.server?.logLevel).toBe('info');
    expect(config.server?.transport).toBe('sse');
    expect(config.llmProviders).toEqual({});
    expect(config.mcpClients).toEqual([]);
  });

  it('should load configuration from environment variables', async () => {
    process.env.SKYNET_SERVER_PORT = '8080';
    process.env.SKYNET_LOG_LEVEL = 'debug';
    process.env.SKYNET_TRANSPORT_TYPE = 'stdio';
    process.env.OPENAI_API_KEY = 'sk-env-openai';
    process.env.ANTHROPIC_API_KEY = 'sk-env-anthropic';

    vi.mocked(fs.existsSync).mockReturnValue(false);
    const { config } = await import('../src/config');

    expect(config.server?.port).toBe(8080);
    expect(config.server?.logLevel).toBe('debug');
    expect(config.server?.transport).toBe('stdio');
    expect(config.llmProviders?.openai?.apiKey).toBe('sk-env-openai');
    expect(config.llmProviders?.anthropic?.apiKey).toBe('sk-env-anthropic');
    expect(config.llmProviders?.google?.apiKey).toBeUndefined();
  });

  it('should load configuration from JSON files', async () => {
    const mockAppConfig = {
      server: {
        port: 5000,
      },
      llmProviders: {
        openai: {
          apiKey: 'sk-json-openai',
        },
        google: {
          apiKey: 'sk-json-google',
          baseURL: 'https://google.example.com',
        },
      },
    };
    const mockMcpClientsConfig = {
      mcpClients: [
        {
          name: 'TestClient',
          url: 'http://localhost:9000',
          apiKey: 'client-key',
        },
      ],
    };

    const appConfigPath = path.resolve(process.cwd(), 'config.json');
    const mcpClientsPath = path.resolve(process.cwd(), 'mcp-clients.json');
    const mcpServersPath = path.resolve(process.cwd(), 'mcp-servers.json');

    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === appConfigPath) return true;
      if (p === mcpClientsPath) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === appConfigPath) return JSON.stringify(mockAppConfig);
      if (p === mcpClientsPath) return JSON.stringify(mockMcpClientsConfig);
      throw new Error('File not found');
    });

    const { config } = await import('../src/config');

    expect(config.server?.port).toBe(5000); // From JSON
    expect(config.server?.logLevel).toBe('info'); // Default
    expect(config.llmProviders?.openai?.apiKey).toBe('sk-json-openai');
    expect(config.llmProviders?.google?.apiKey).toBe('sk-json-google');
    expect(config.llmProviders?.google?.baseURL).toBe('https://google.example.com');
    expect(config.mcpClients).toHaveLength(1);
    expect(config.mcpClients?.[0].name).toBe('TestClient');
    expect(config.mcpClients?.[0].url).toBe('http://localhost:9000');
    expect(config.mcpClients?.[0].apiKey).toBe('client-key');
  });

  it('should override JSON config with environment variables', async () => {
    process.env.SKYNET_SERVER_PORT = '8080'; // Env var override
    process.env.OPENAI_API_KEY = 'sk-env-openai'; // Env var override
    process.env.ANTHROPIC_API_KEY = 'sk-env-anthropic'; // Env var only

    const mockAppConfig = {
      server: {
        port: 5000, // Will be overridden
        logLevel: 'warn', // Will persist
      },
      llmProviders: {
        openai: {
          apiKey: 'sk-json-openai', // Will be overridden
        },
      },
    };
    const mockMcpClientsConfig = {
      mcpClients: [
        {
          name: 'TestClientJson',
          url: 'http://json.example.com',
        },
      ],
    };

    const appConfigPath = path.resolve(process.cwd(), 'config.json');
    const mcpClientsPath = path.resolve(process.cwd(), 'mcp-clients.json');

    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === appConfigPath) return true;
      if (p === mcpClientsPath) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === appConfigPath) return JSON.stringify(mockAppConfig);
      if (p === mcpClientsPath) return JSON.stringify(mockMcpClientsConfig);
      throw new Error('File not found');
    });

    const { config } = await import('../src/config');

    expect(config.server?.port).toBe(8080); // Overridden by env
    expect(config.server?.logLevel).toBe('warn'); // From JSON (not overridden)
    expect(config.llmProviders?.openai?.apiKey).toBe('sk-env-openai'); // Overridden by env
    expect(config.llmProviders?.anthropic?.apiKey).toBe('sk-env-anthropic'); // From env only
    expect(config.mcpClients).toHaveLength(1);
    expect(config.mcpClients?.[0].name).toBe('TestClientJson'); // From JSON
  });

  it('should exit if validation fails', async () => {
    process.env.SKYNET_SERVER_PORT = 'invalid-port'; // Invalid value

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(false);

    // We expect the module evaluation itself to trigger the exit
    await import('../src/config');

    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });
});
