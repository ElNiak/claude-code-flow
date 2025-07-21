#!/usr/bin/env node
/**
 * CLI Test Migration Script
 * Converts Deno tests to Jest format for CLI testing
 */

const fs = require('fs');
const path = require('path');

/**
 * Migration patterns for converting Deno to Jest
 */
const MIGRATION_PATTERNS = [
  // Deno.test to Jest
  {
    name: 'Convert Deno.test to describe/it',
    pattern: /Deno\.test\s*\(\s*["']([^"']+)["']\s*,\s*(async\s*)?\(\s*\)\s*=>\s*{/g,
    replacement: 'describe(\'$1\', () => {\n  it(\'should work\', $2() => {'
  },
  {
    name: 'Convert Deno.test with object syntax',
    pattern: /Deno\.test\s*\(\s*{\s*name:\s*["']([^"']+)["']\s*,\s*fn:\s*(async\s*)?\(\s*\)\s*=>\s*{/g,
    replacement: 'describe(\'$1\', () => {\n  it(\'should work\', $2() => {'
  },

  // Assertions
  {
    name: 'Convert assertEquals to expect',
    pattern: /assertEquals\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toEqual($2)'
  },
  {
    name: 'Convert assertStrictEquals to expect',
    pattern: /assertStrictEquals\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toBe($2)'
  },
  {
    name: 'Convert assert to expect',
    pattern: /assert\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'expect($1).toBeTruthy()'
  },
  {
    name: 'Convert assertThrows to expect',
    pattern: /assertThrows\s*\(\s*\(\s*\)\s*=>\s*{([^}]+)}\s*,\s*([^)]+)\s*\)/g,
    replacement: 'expect(() => {$1}).toThrow($2)'
  },
  {
    name: 'Convert assertRejects to expect',
    pattern: /assertRejects\s*\(\s*async\s*\(\s*\)\s*=>\s*{([^}]+)}\s*,\s*([^)]+)\s*\)/g,
    replacement: 'await expect(async () => {$1}).rejects.toThrow($2)'
  },

  // Command execution
  {
    name: 'Convert Deno.Command to spawn',
    pattern: /new\s+Deno\.Command\s*\(\s*["']([^"']+)["']\s*,\s*{([^}]+)}\s*\)/g,
    replacement: 'spawn(\'$1\', $2)'
  },
  {
    name: 'Convert command.output() to promise',
    pattern: /\.output\s*\(\s*\)/g,
    replacement: ''
  },

  // File operations
  {
    name: 'Convert Deno.readTextFile',
    pattern: /await\s+Deno\.readTextFile\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'await fs.promises.readFile($1, \'utf8\')'
  },
  {
    name: 'Convert Deno.writeTextFile',
    pattern: /await\s+Deno\.writeTextFile\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: 'await fs.promises.writeFile($1, $2)'
  },

  // Environment
  {
    name: 'Convert Deno.env.get',
    pattern: /Deno\.env\.get\s*\(\s*["']([^"']+)["']\s*\)/g,
    replacement: 'process.env[\'$1\']'
  },
  {
    name: 'Convert Deno.cwd',
    pattern: /Deno\.cwd\s*\(\s*\)/g,
    replacement: 'process.cwd()'
  }
];

/**
 * Add Jest imports to the test file
 */
function addJestImports(content) {
  const imports = [
    "import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';",
    "import { spawn } from 'child_process';",
    "import { promises as fs } from 'fs';",
    "import path from 'path';"
  ];

  // Remove Deno imports
  content = content.replace(/import\s+{[^}]+}\s+from\s+["']https:\/\/deno\.land[^"']+["'];?\s*/g, '');
  content = content.replace(/import\s+{[^}]+}\s+from\s+["']std\/(testing|assert)[^"']+["'];?\s*/g, '');

  // Add Jest imports at the top
  return imports.join('\n') + '\n\n' + content;
}

/**
 * Apply migration patterns to content
 */
function applyMigrationPatterns(content) {
  let migratedContent = content;

  MIGRATION_PATTERNS.forEach(({ name, pattern, replacement }) => {
    const before = migratedContent;
    migratedContent = migratedContent.replace(pattern, replacement);

    if (before !== migratedContent) {
      console.log(`   ✓ Applied: ${name}`);
    }
  });

  return migratedContent;
}

/**
 * Fix async/await patterns
 */
function fixAsyncPatterns(content) {
  // Ensure async tests have proper async/await
  content = content.replace(/it\s*\(\s*'([^']+)'\s*,\s*\(\s*\)\s*=>\s*{\s*await/g,
    'it(\'$1\', async () => {\n    await');

  // Fix command execution patterns
  content = content.replace(/const\s+(\w+)\s*=\s*spawn\(/g,
    'const $1 = await new Promise((resolve, reject) => {\n    const child = spawn(');

  return content;
}

/**
 * Create test runner utility
 */
function createTestUtils() {
  return `/**
 * Test utilities for CLI testing
 */

export async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });
  });
}

export async function testCLICommand(args) {
  const cliPath = path.resolve(__dirname, '../../bin/claude-flow');
  return runCommand(cliPath, args);
}
`;
}

/**
 * Migrate a single test file
 */
function migrateTestFile(inputPath, outputPath) {
  console.log(`\n📄 Migrating: ${inputPath}`);

  let content = fs.readFileSync(inputPath, 'utf8');

  // Apply migrations
  content = addJestImports(content);
  content = applyMigrationPatterns(content);
  content = fixAsyncPatterns(content);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write migrated file
  fs.writeFileSync(outputPath, content);
  console.log(`   ✅ Migrated to: ${outputPath}`);

  return outputPath;
}

/**
 * Find CLI test files
 */
function findCliTests() {
  const testDirs = ['tests', 'test'];
  const testFiles = [];

  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      findTestsRecursive(dir, testFiles);
    }
  });

  return testFiles.filter(file =>
    file.includes('cli') &&
    (file.endsWith('.test.js') || file.endsWith('.test.ts') ||
     file.endsWith('.spec.js') || file.endsWith('.spec.ts'))
  );
}

/**
 * Recursively find test files
 */
function findTestsRecursive(dir, testFiles) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findTestsRecursive(fullPath, testFiles);
    } else if (stat.isFile()) {
      testFiles.push(fullPath);
    }
  });
}

/**
 * Generate test runner configuration
 */
function generateTestConfig() {
  const config = `// Jest configuration for migrated CLI tests
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/migrated/cli/**/*.test.{js,ts}',
    '<rootDir>/tests/migrated/cli/**/*.spec.{js,ts}'
  ],
  transform: {
    '^.+\\\\.(ts|tsx)$': 'ts-jest',
    '^.+\\\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/cli/**/*.{js,ts}',
    '!src/cli/**/*.d.ts',
    '!src/cli/**/*.test.{js,ts}'
  ],
  coverageDirectory: 'coverage/cli',
  testTimeout: 30000
};`;

  fs.writeFileSync('tests/migrated/cli/jest.config.js', config);
}

// Main execution
if (require.main === module) {
  console.log('🔄 Starting CLI Test Migration...\n');

  // Create test utilities
  const utilsPath = 'tests/migrated/cli/utils/test-utils.js';
  const utilsDir = path.dirname(utilsPath);
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }
  fs.writeFileSync(utilsPath, createTestUtils());
  console.log('✅ Created test utilities');

  // Find and migrate tests
  const testFiles = findCliTests();
  console.log(`\n📋 Found ${testFiles.length} CLI test files to migrate`);

  const migratedFiles = [];
  testFiles.forEach(testFile => {
    const relativePath = path.relative('.', testFile);
    const outputPath = path.join('tests/migrated/cli', path.basename(testFile));

    try {
      const migrated = migrateTestFile(testFile, outputPath);
      migratedFiles.push(migrated);
    } catch (error) {
      console.error(`   ❌ Error migrating ${testFile}: ${error.message}`);
    }
  });

  // Generate test configuration
  generateTestConfig();
  console.log('\n✅ Generated Jest configuration for migrated tests');

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`   Total files found: ${testFiles.length}`);
  console.log(`   Successfully migrated: ${migratedFiles.length}`);
  console.log(`   Test utils created: ${utilsPath}`);
  console.log(`   Config created: tests/migrated/cli/jest.config.js`);

  // Save migration report
  const report = {
    timestamp: new Date().toISOString(),
    originalFiles: testFiles,
    migratedFiles: migratedFiles,
    utilsCreated: utilsPath,
    configCreated: 'tests/migrated/cli/jest.config.js'
  };

  fs.writeFileSync(
    'CLI_TEST_MIGRATION_REPORT.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Migration complete! Report saved to CLI_TEST_MIGRATION_REPORT.json');
}

module.exports = {
  migrateTestFile,
  findCliTests,
  applyMigrationPatterns
};
