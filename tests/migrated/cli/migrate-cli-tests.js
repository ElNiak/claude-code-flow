#!/usr/bin/env node

/**
 * CLI Test Migration Script
 * Converts Deno tests to Jest format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration patterns for converting Deno.test to Jest
 */
const migrationPatterns = [
  // Convert Deno.test to it/test
  {
    pattern: /Deno\.test\s*\(\s*"([^"]+)"\s*,\s*async\s*\(\)\s*=>\s*\{/g,
    replacement: 'it("$1", async () => {'
  },
  {
    pattern: /Deno\.test\s*\(\s*'([^']+)'\s*,\s*async\s*\(\)\s*=>\s*\{/g,
    replacement: 'it("$1", async () => {'
  },
  {
    pattern: /Deno\.test\s*\(\s*`([^`]+)`\s*,\s*async\s*\(\)\s*=>\s*\{/g,
    replacement: 'it("$1", async () => {'
  },
  {
    pattern: /Deno\.test\s*\(\s*"([^"]+)"\s*,\s*\(\)\s*=>\s*\{/g,
    replacement: 'it("$1", () => {'
  },

  // Convert Deno assertions to Jest expect
  {
    pattern: /assertEquals\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toBe($2)'
  },
  {
    pattern: /assertNotEquals\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).not.toBe($2)'
  },
  {
    pattern: /assertStrictEquals\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toBe($2)'
  },
  {
    pattern: /assertExists\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toBeDefined()'
  },
  {
    pattern: /assertStringIncludes\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toContain($2)'
  },
  {
    pattern: /assertArrayIncludes\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toEqual(expect.arrayContaining($2))'
  },
  {
    pattern: /assertMatch\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toMatch($2)'
  },
  {
    pattern: /assertThrows\s*\(\s*\(\)\s*=>\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect(() => $1).toThrow($2)'
  },
  {
    pattern: /assertRejects\s*\(\s*async\s*\(\)\s*=>\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    replacement: 'await expect($1).rejects.toThrow($2)'
  },

  // Convert Deno file operations
  {
    pattern: /Deno\.readTextFile\s*\(/g,
    replacement: 'fs.promises.readFile('
  },
  {
    pattern: /Deno\.writeTextFile\s*\(/g,
    replacement: 'fs.promises.writeFile('
  },
  {
    pattern: /Deno\.makeTempDir\s*\(/g,
    replacement: 'fs.promises.mkdtemp(path.join(os.tmpdir(), '
  },
  {
    pattern: /Deno\.remove\s*\(/g,
    replacement: 'fs.promises.rm('
  },
  {
    pattern: /Deno\.stat\s*\(/g,
    replacement: 'fs.promises.stat('
  },
  {
    pattern: /Deno\.cwd\s*\(\)/g,
    replacement: 'process.cwd()'
  },

  // Convert Deno.Command to child_process
  {
    pattern: /new\s+Deno\.Command\s*\(\s*Deno\.execPath\(\)\s*,\s*\{/g,
    replacement: 'spawn(process.execPath, {'
  },
  {
    pattern: /new\s+Deno\.Command\s*\(\s*"([^"]+)"\s*,\s*\{/g,
    replacement: 'spawn("$1", {'
  },

  // Import conversions
  {
    pattern: /import\s*\{[^}]+\}\s*from\s*"\.\.\/test\.utils\.ts"/g,
    replacement: 'import { describe, it, expect, beforeEach, afterEach } from "@jest/globals"'
  },
  {
    pattern: /import\s*\{[^}]+\}\s*from\s*"\.\.\/\.\.\/test\.utils\.ts"/g,
    replacement: 'import { describe, it, expect, beforeEach, afterEach } from "@jest/globals"'
  },

  // Remove .ts extensions from imports
  {
    pattern: /from\s*"([^"]+)\.ts"/g,
    replacement: 'from "$1"'
  },

  // Convert FakeTime to Jest timers
  {
    pattern: /FakeTime/g,
    replacement: 'jest.useFakeTimers'
  },
  {
    pattern: /fakeTime\.restore\(\)/g,
    replacement: 'jest.useRealTimers()'
  },

  // Fix expect calls that were incorrectly converted
  {
    pattern: /expect\(([^)]+)\)\.toBe\(([^)]+)\)/g,
    replacement: function(match, p1, p2) {
      // Check if it's already a proper expect call
      if (match.includes('expect(')) {
        return match;
      }
      return `expect(${p1}).toBe(${p2})`;
    }
  }
];

/**
 * Additional Jest-specific setup code
 */
const jestSetupCode = `
// Jest-specific imports
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock utilities for Jest
const AsyncTestUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  withTimeout: (promise, timeout) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
  ])
};

const FileSystemTestUtils = {
  createTempDir: async (prefix) => {
    return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  },
  cleanup: async (paths) => {
    for (const p of paths) {
      try {
        await fs.remove(p);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
};

const TestAssertions = {
  assertInRange: (value, min, max) => {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  },
  assertThrowsAsync: async (fn, error, message) => {
    await expect(fn()).rejects.toThrow(message);
  }
};

const PerformanceTestUtils = {
  measureTime: async (fn) => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },
  benchmark: async (fn, options = {}) => {
    const times = [];
    for (let i = 0; i < (options.iterations || 10); i++) {
      const start = Date.now();
      await fn();
      times.push(Date.now() - start);
    }
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    return { stats: { mean } };
  }
};

// Test configuration helpers
const setupTestEnv = () => {
  process.env.NODE_ENV = 'test';
};

const cleanupTestEnv = async () => {
  // Cleanup any test resources
};

const TEST_CONFIG = {
  env: {
    testMode: true,
    logLevel: 'error'
  }
};
`;

/**
 * Migrate a single test file
 */
function migrateTestFile(inputPath, outputPath) {
  console.log(`Migrating: ${inputPath} -> ${outputPath}`);

  let content = fs.readFileSync(inputPath, 'utf8');

  // Apply all migration patterns
  migrationPatterns.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });

  // Check if we need to add Jest setup code
  if (content.includes('AsyncTestUtils') || content.includes('FileSystemTestUtils')) {
    // Find the first import statement
    const firstImportIndex = content.indexOf('import');
    if (firstImportIndex !== -1) {
      // Insert setup code after imports
      const lines = content.split('\n');
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() && !lines[i].startsWith('import') && !lines[i].startsWith('/**')) {
          insertIndex = i;
          break;
        }
      }
      lines.splice(insertIndex, 0, jestSetupCode);
      content = lines.join('\n');
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write migrated content
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Migrated: ${path.basename(outputPath)}`);
}

/**
 * Main migration function
 */
function migrateCliTests() {
  console.log('🚀 Starting CLI test migration to Jest...\n');

  const testFiles = [
    {
      input: 'tests/unit/cli/cli-commands.test.ts',
      output: 'tests/migrated/cli/cli-commands.test.js'
    },
    {
      input: 'tests/e2e/cli-commands.test.ts',
      output: 'tests/migrated/cli/cli-commands-e2e.test.js'
    }
  ];

  // Note: The other two files are already in Jest format, so we'll just copy them
  const jestFiles = [
    {
      input: 'tests/integration/cli-integration.test.js',
      output: 'tests/migrated/cli/cli-integration.test.js'
    },
    {
      input: 'tests/hive-mind/unit/hive-mind-cli.test.js',
      output: 'tests/migrated/cli/hive-mind-cli.test.js'
    }
  ];

  // Migrate Deno tests
  testFiles.forEach(({ input, output }) => {
    if (fs.existsSync(input)) {
      migrateTestFile(input, output);
    } else {
      console.log(`⚠️  File not found: ${input}`);
    }
  });

  // Copy Jest tests (they're already in the right format)
  jestFiles.forEach(({ input, output }) => {
    if (fs.existsSync(input)) {
      const outputDir = path.dirname(output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.copyFileSync(input, output);
      console.log(`📋 Copied: ${path.basename(output)}`);
    } else {
      console.log(`⚠️  File not found: ${input}`);
    }
  });

  console.log('\n✨ Migration complete!');
  console.log('\nTo run the migrated tests:');
  console.log('  npm test tests/migrated/cli/');
}

// Run migration if called directly
migrateCliTests();

export { migrateTestFile, migrationPatterns };
