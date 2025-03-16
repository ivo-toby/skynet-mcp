import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('Project Setup', () => {
  it('should have the correct directory structure', () => {
    const requiredDirs = [
      'src',
      'src/server',
      'src/client',
      'src/orchestrator',
      'src/tools',
      'src/persistence',
      'src/utils',
      'test',
      'test/unit',
      'test/integration',
      'examples',
      'config',
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.resolve(process.cwd(), dir);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    }
  });

  it('should have proper TypeScript configuration', () => {
    const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.target).toBeDefined();
    expect(tsconfig.compilerOptions.module).toBeDefined();
    expect(tsconfig.compilerOptions.outDir).toBeDefined();
  });

  it('should have proper ESLint and Prettier configuration', () => {
    const eslintPath = path.resolve(process.cwd(), '.eslintrc.js');
    const prettierPath = path.resolve(process.cwd(), '.prettierrc');

    expect(fs.existsSync(eslintPath)).toBe(true);
    expect(fs.existsSync(prettierPath)).toBe(true);

    // Check if ESLint config exists
    expect(fs.existsSync(eslintPath)).toBe(true);
    // We can't directly import the ESLint config in ES modules without dynamic import
    // Just check that the file exists and contains the TypeScript parser
    const eslintContent = fs.readFileSync(eslintPath, 'utf-8');
    expect(eslintContent).toContain('@typescript-eslint/parser');

    // Check if Prettier config exists and is valid JSON
    const prettierConfig = JSON.parse(fs.readFileSync(prettierPath, 'utf-8'));
    expect(prettierConfig).toBeDefined();
  });
});
