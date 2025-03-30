import * as esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: './dist/bundle.js',
  target: 'node18',
  external: ['path', 'url'], // Treat 'path' and 'url' as external
  banner: {
    // Keep only the require shim. __filename/__dirname should be defined in source files where needed.
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
  },
});
