import * as esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: './dist/bundle.js',
  target: 'node18',
  external: ['path', 'url', '@modelcontextprotocol/sdk', 'fastmcp', 'zod'], // Treat these modules as external
});
