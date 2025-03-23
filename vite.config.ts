import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@modelcontextprotocol/sdk': '@modelcontextprotocol/sdk/dist/esm'
    }
  }
});
