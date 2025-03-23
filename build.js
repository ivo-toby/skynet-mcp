import * as esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: './dist/bundle.js',
  target: 'node18',
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);import { fileURLToPath } from 'url';import path from 'path';const __filename = fileURLToPath(import.meta.url);const __dirname = path.dirname(__filename);`,
  },
});
