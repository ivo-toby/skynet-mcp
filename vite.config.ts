import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: [
      {
        find: '@modelcontextprotocol/sdk',
        replacement: './node_modules/@modelcontextprotocol/sdk/dist/esm'
      },
      {
        find: /^@modelcontextprotocol\/sdk\/(.*)$/,
        replacement: './node_modules/@modelcontextprotocol/sdk/dist/esm/$1'
      }
    ]
  }
});
