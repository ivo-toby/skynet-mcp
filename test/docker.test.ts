import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// These tests will be skipped by default as they require Docker to be running
// Run with DOCKER_TEST=true to enable them
const runDockerTests = process.env.DOCKER_TEST === 'true';

describe('Docker Configuration', () => {
  it('should have a valid Dockerfile', () => {
    const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile');
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
    expect(dockerfileContent).toContain('FROM node:20');
    expect(dockerfileContent).toContain('WORKDIR /app');
    expect(dockerfileContent).toContain('RUN npm ci');
    expect(dockerfileContent).toContain('RUN npm run build');
  });

  it('should have a valid docker-compose.yml', () => {
    const dockerComposePath = path.resolve(process.cwd(), 'docker-compose.yml');
    expect(fs.existsSync(dockerComposePath)).toBe(true);

    const composeContent = fs.readFileSync(dockerComposePath, 'utf-8');
    expect(composeContent).toContain('redis:alpine');
    expect(composeContent).toContain('ports:');
    expect(composeContent).toContain('volumes:');
  });

  // Skip Docker-dependent tests unless explicitly enabled
  it.runIf(runDockerTests)('should be able to build the Docker image', () => {
    try {
      execSync('docker build -t skynet-mcp-test .', { stdio: 'pipe' });
      expect(true).toBe(true); // If we get here, build succeeded
    } catch (error) {
      console.error(error);
      expect(error).toBeUndefined();
    }
  });

  it.runIf(runDockerTests)('should be able to start the container', () => {
    try {
      // Start the container and run a simple command
      execSync('docker run --rm skynet-mcp-test npm test', { stdio: 'pipe' });
      expect(true).toBe(true); // If we get here, container started and tests ran
    } catch (error) {
      console.error(error);
      expect(error).toBeUndefined();
    }
  });
});
