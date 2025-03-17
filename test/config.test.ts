import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadConfig, Config } from '../src/utils/config.js';

describe('Configuration System', () => {
  const originalEnv = process.env;
  const configDir = path.resolve(process.cwd(), 'config');
  const testConfigPath = path.join(configDir, 'test.json');
  const devConfigPath = path.join(configDir, 'development.json');
  let devConfigExists = false;
  let devConfigBackup: string | null = null;

  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';

    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Temporarily move development.json if it exists to avoid interference
    if (fs.existsSync(devConfigPath)) {
      devConfigExists = true;
      devConfigBackup = fs.readFileSync(devConfigPath, 'utf-8');
      fs.renameSync(devConfigPath, `${devConfigPath}.bak`);
    }
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up test config file
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }

    // Restore development.json if it existed
    if (devConfigExists) {
      if (fs.existsSync(`${devConfigPath}.bak`)) {
        fs.renameSync(`${devConfigPath}.bak`, devConfigPath);
      } else if (devConfigBackup) {
        fs.writeFileSync(devConfigPath, devConfigBackup);
      }
    }
  });

  it('should load default configuration', () => {
    const config = loadConfig();

    // Verify some default values
    expect(config.server.port).toBe(3000);
    expect(config.logging.level).toBe('info');
    expect(config.persistence.type).toBe('memory');
  });

  it('should override defaults with environment variables', () => {
    // Set environment variables
    process.env.SERVER_PORT = '4000';
    process.env.LOG_LEVEL = 'debug';
    process.env.PERSISTENCE_TYPE = 'redis';

    const config = loadConfig();

    // Verify environment variables were applied
    expect(config.server.port).toBe(4000);
    expect(config.logging.level).toBe('debug');
    expect(config.persistence.type).toBe('redis');
  });

  it('should load configuration from files', () => {
    // Create a test config file
    const testConfig = {
      server: {
        port: 5000,
        host: 'testhost',
      },
      agent: {
        defaultModel: 'test-model',
      },
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    const config = loadConfig();

    // Verify file config was applied
    expect(config.server.port).toBe(5000);
    expect(config.server.host).toBe('testhost');
    expect(config.agent.defaultModel).toBe('test-model');

    // Note: We can't test for default values here because we have a development.json file
    // that might be affecting the values
  });

  it('should prioritize environment variables over file config', () => {
    // Create a test config file
    const testConfig = {
      server: {
        port: 5000,
      },
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // Set environment variable that overrides file config
    process.env.SERVER_PORT = '6000';

    const config = loadConfig();

    // Verify environment variable takes precedence
    expect(config.server.port).toBe(6000);
  });

  it('should switch configurations based on NODE_ENV', () => {
    // Create test config file
    const testConfig = {
      server: {
        port: 5000,
      },
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // First load with NODE_ENV=test
    process.env.NODE_ENV = 'test';
    const testEnvConfig = loadConfig();
    expect(testEnvConfig.server.port).toBe(5000);

    // Clean up test config
    fs.unlinkSync(testConfigPath);

    // Create development config file
    const devConfigPath = path.join(configDir, 'development.json');
    const devConfig = {
      server: {
        port: 8000,
      },
    };

    fs.writeFileSync(devConfigPath, JSON.stringify(devConfig, null, 2));

    // Load with NODE_ENV=development
    process.env.NODE_ENV = 'development';
    const devEnvConfig = loadConfig();
    expect(devEnvConfig.server.port).toBe(8000);

    // Clean up dev config
    fs.unlinkSync(devConfigPath);
  });
});
