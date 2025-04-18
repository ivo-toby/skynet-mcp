import dotenv from 'dotenv';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

// Load .env file first
dotenv.config();

// --- Define Configuration Schemas ---

// Example: Server configuration schema
const ServerConfigSchema = z.object({
  port: z.coerce.number().int().positive().optional().default(3000),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),
  transport: z.enum(['sse', 'stdio']).optional().default('sse'),
  // Add other server-specific settings
});

// Example: LLM Provider configuration
const LLMProviderSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
});

// Example: External MCP Client configuration
const MCPClientEntrySchema = z.object({
  name: z.string(),
  url: z.string().url(),
  apiKey: z.string().optional(),
});

// Main Configuration Schema
const ConfigSchema = z.object({
  server: ServerConfigSchema.optional().default({}),
  llmProviders: z
    .object({
      openai: LLMProviderSchema.optional(),
      anthropic: LLMProviderSchema.optional(),
      google: LLMProviderSchema.optional(),
      ollama: LLMProviderSchema.optional(),
      // Add other providers as needed
    })
    .optional()
    .default({}),
  mcpClients: z.array(MCPClientEntrySchema).optional().default([]),
  // Add other configuration sections as needed
});

export type Config = z.infer<typeof ConfigSchema>;

// --- Configuration Loading Logic ---

function loadJsonConfig(filePath: string): Record<string, unknown> {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not load or parse JSON config ${filePath}`, error);
  }
  return {};
}

// 1. Load from Environment Variables (Mapping)
// Environment variables are typically strings, so we map them.
// Prefixes can help organize env vars, e.g., SKYNET_SERVER_PORT
const envConfig: Partial<Record<keyof Config, any>> = {
  server: {
    port: process.env.SKYNET_SERVER_PORT,
    logLevel: process.env.SKYNET_LOG_LEVEL,
    transport: process.env.SKYNET_TRANSPORT_TYPE,
  },
  llmProviders: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL,
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
      baseURL: process.env.GOOGLE_BASE_URL,
    },
    ollama: {
      apiKey: process.env.OLLAMA_API_KEY, // May not be needed
      baseURL: process.env.OLLAMA_BASE_URL,
    },
  },
  // mcpClients are typically better defined in JSON
};

// Helper to remove undefined values recursively
function removeUndefined(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter((v) => v !== undefined);
  }
  return Object.fromEntries(
    Object.entries(obj)
      .map(([key, value]) => [key, removeUndefined(value)])
      .filter(([, value]) => value !== undefined),
  );
}

const cleanedEnvConfig = removeUndefined(envConfig);

// 2. Load from JSON files
const mcpClientsConfigPath = path.resolve(
  process.cwd(),
  process.env.MCP_CLIENTS_CONFIG_PATH || 'mcp-clients.json',
);
const mcpServersConfigPath = path.resolve(
  process.cwd(),
  process.env.MCP_SERVERS_CONFIG_PATH || 'mcp-servers.json',
);
// We might want a general config file too
const appConfigPath = path.resolve(process.cwd(), process.env.APP_CONFIG_PATH || 'config.json');

const jsonMcpClients = loadJsonConfig(mcpClientsConfigPath);
const jsonMcpServers = loadJsonConfig(mcpServersConfigPath);
const jsonAppConfig = loadJsonConfig(appConfigPath);

// 3. Merge Configurations (Override Order: Env > JSON)
// Perform a deeper merge for nested objects like llmProviders
const deepMerge = (target: any, source: any): any => {
  if (
    typeof target !== 'object' ||
    target === null ||
    typeof source !== 'object' ||
    source === null
  ) {
    return source !== undefined ? source : target;
  }

  const output = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (typeof targetValue === 'object' && typeof sourceValue === 'object') {
        output[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        output[key] = sourceValue;
      }
    }
  }
  return output;
};

const mergedConfig = {
  ...jsonAppConfig, // Base JSON config
  // Merge server config
  server: deepMerge(jsonAppConfig.server || {}, cleanedEnvConfig.server || {}),
  // Merge llmProviders config
  llmProviders: deepMerge(jsonAppConfig.llmProviders || {}, cleanedEnvConfig.llmProviders || {}),
  // Merge specific JSON file arrays (env vars don't typically set arrays)
  mcpClients: jsonMcpClients.mcpClients || [],
  mcpServers: jsonMcpServers.mcpServers || [],
};

// 4. Validate the final configuration
let validatedConfig: Config;
try {
  validatedConfig = ConfigSchema.parse(mergedConfig);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Configuration validation failed:', error.errors);
  } else {
    console.error('An unexpected error occurred during config validation:', error);
  }
  // Decide whether to throw or exit. Exiting might be safer.
  process.exit(1);
}

// Export the validated configuration
export const config: Config = validatedConfig;

// Log the loaded configuration (optional, consider redacting secrets)
// console.log('Loaded configuration:', JSON.stringify(config, null, 2));
