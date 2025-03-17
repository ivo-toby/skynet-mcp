import fs from 'fs';
import path from 'path';

/**
 * Configuration interface defining all available configuration options
 */
export interface Config {
  server: {
    port: number;
    host: string;
  };
  client: {
    defaultTimeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
  agent: {
    maxConcurrent: number;
    maxExecutionTime: number;
    defaultModel: string;
  };
  security: {
    enableAuth: boolean;
    tokenExpiry: number;
  };
  persistence: {
    type: 'memory' | 'redis';
    redis?: {
      url: string;
      prefix: string;
    };
  };
}

/**
 * Default configuration values
 */
const defaultConfig: Config = {
  server: {
    port: 3000,
    host: 'localhost',
  },
  client: {
    defaultTimeout: 30000,
  },
  logging: {
    level: 'info',
    format: 'json',
  },
  agent: {
    maxConcurrent: 10,
    maxExecutionTime: 300000, // 5 minutes
    defaultModel: 'anthropic.claude-3-opus',
  },
  security: {
    enableAuth: false,
    tokenExpiry: 86400, // 24 hours
  },
  persistence: {
    type: 'memory',
    redis: {
      url: 'redis://localhost:6379',
      prefix: 'skynet-mcp:',
    },
  },
};

/**
 * Load configuration from environment variables
 */
const loadFromEnv = (config: Config): Config => {
  const newConfig = { ...config };

  // Server
  if (process.env.SERVER_PORT) {
    newConfig.server.port = parseInt(process.env.SERVER_PORT, 10);
  }
  if (process.env.SERVER_HOST) {
    newConfig.server.host = process.env.SERVER_HOST;
  }

  // Client
  if (process.env.CLIENT_DEFAULT_TIMEOUT) {
    newConfig.client.defaultTimeout = parseInt(process.env.CLIENT_DEFAULT_TIMEOUT, 10);
  }

  // Logging
  if (process.env.LOG_LEVEL && ['debug', 'info', 'warn', 'error'].includes(process.env.LOG_LEVEL)) {
    newConfig.logging.level = process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
  }
  if (process.env.LOG_FORMAT && ['json', 'text'].includes(process.env.LOG_FORMAT)) {
    newConfig.logging.format = process.env.LOG_FORMAT as 'json' | 'text';
  }

  // Agent
  if (process.env.AGENT_MAX_CONCURRENT) {
    newConfig.agent.maxConcurrent = parseInt(process.env.AGENT_MAX_CONCURRENT, 10);
  }
  if (process.env.AGENT_MAX_EXECUTION_TIME) {
    newConfig.agent.maxExecutionTime = parseInt(process.env.AGENT_MAX_EXECUTION_TIME, 10);
  }
  if (process.env.AGENT_DEFAULT_MODEL) {
    newConfig.agent.defaultModel = process.env.AGENT_DEFAULT_MODEL;
  }

  // Security
  if (process.env.SECURITY_ENABLE_AUTH) {
    newConfig.security.enableAuth = process.env.SECURITY_ENABLE_AUTH === 'true';
  }
  if (process.env.SECURITY_TOKEN_EXPIRY) {
    newConfig.security.tokenExpiry = parseInt(process.env.SECURITY_TOKEN_EXPIRY, 10);
  }

  // Persistence
  if (process.env.PERSISTENCE_TYPE && ['memory', 'redis'].includes(process.env.PERSISTENCE_TYPE)) {
    newConfig.persistence.type = process.env.PERSISTENCE_TYPE as 'memory' | 'redis';
  }
  if (process.env.REDIS_URL) {
    newConfig.persistence.redis = newConfig.persistence.redis || { url: '', prefix: '' };
    newConfig.persistence.redis.url = process.env.REDIS_URL;
  }
  if (process.env.REDIS_PREFIX) {
    newConfig.persistence.redis = newConfig.persistence.redis || { url: '', prefix: '' };
    newConfig.persistence.redis.prefix = process.env.REDIS_PREFIX;
  }

  return newConfig;
};

/**
 * Load configuration from a JSON file
 */
const loadFromFile = (configPath: string, config: Config): Config => {
  try {
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return deepMerge(config, fileConfig);
    }
  } catch (error) {
    console.error(`Error loading config from ${configPath}:`, error);
  }
  return config;
};

/**
 * Deep merge two objects
 */
const deepMerge = (target: any, source: any): any => {
  const result = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
};

/**
 * Load and return the complete configuration
 */
export const loadConfig = (): Config => {
  const env = process.env.NODE_ENV || 'development';

  // Start with default config
  let config = { ...defaultConfig };

  // Load environment-specific config file if exists
  const configDir = path.resolve(process.cwd(), 'config');
  const configPath = path.join(configDir, `${env}.json`);

  config = loadFromFile(configPath, config);

  // Override with environment variables
  config = loadFromEnv(config);

  return config;
};

// Export a singleton config instance
export const config = loadConfig();

// Export default for testing
export default { loadConfig, config };
