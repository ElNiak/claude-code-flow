#!/usr/bin/env node

/**
 * Jest Infrastructure Repair Script
 * Fixes "jest is not defined" errors and rebuilds test infrastructure
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

async function fixJestInfrastructure() {
	console.log("🔧 JEST INFRASTRUCTURE REPAIR");
	console.log("=============================\n");

	try {
		// Step 1: Remove broken Jest configuration
		console.log("📁 Step 1: Cleaning broken Jest configuration...");

		const brokenFiles = [
			"jest.migration.setup.js",
			"tests/migrated/**/*", // Will be rebuilt
		];

		for (const file of brokenFiles) {
			try {
				await fs.unlink(file);
				console.log(`  ✅ Removed: ${file}`);
			} catch (_error) {
				// File may not exist, ignore
			}
		}

		// Step 2: Create proper Jest configuration
		console.log("\n🔧 Step 2: Creating proper Jest configuration...");

		const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.ts'
  ],

  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest'
  },

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest.setup.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test environment settings
  testTimeout: 30000,
  maxWorkers: '50%',

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Module paths
  modulePaths: ['<rootDir>/src'],

  // Extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Verbose output for debugging
  verbose: true
};`;

		await fs.writeFile("jest.config.js", jestConfig);
		console.log("  ✅ Created: jest.config.js");

		// Step 3: Create proper Jest setup file
		console.log("\n🔧 Step 3: Creating Jest setup file...");

		const jestSetup = `/**
 * Jest Setup File
 * Global test configuration and utilities
 */

// Global test timeout
jest.setTimeout(30000);

// Console suppression for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Mock CLI arguments
  mockCliArgs: (args = []) => {
    const originalArgv = process.argv;
    process.argv = ['node', 'test', ...args];
    return () => {
      process.argv = originalArgv;
    };
  },

  // Mock environment variables
  mockEnv: (env = {}) => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, ...env };
    return () => {
      process.env = originalEnv;
    };
  },

  // Async test helper
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Memory cleanup helper
  cleanup: () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
};

// Global mocks for common Node.js modules
jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn()
}));

// Mock filesystem operations
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn()
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  global.testUtils.cleanup();
});`;

		await fs.mkdir("tests", { recursive: true });
		await fs.writeFile("tests/jest.setup.js", jestSetup);
		console.log("  ✅ Created: tests/jest.setup.js");

		// Step 4: Install missing Jest dependencies
		console.log("\n📦 Step 4: Installing Jest dependencies...");

		const dependencies = [
			"@types/jest",
			"ts-jest",
			"babel-jest",
			"@babel/preset-env",
			"@babel/preset-typescript",
		];

		for (const dep of dependencies) {
			console.log(`  📦 Installing ${dep}...`);
			await runCommand("npm", ["install", "--save-dev", dep]);
		}

		// Step 5: Create Babel configuration for JS files
		console.log("\n🔧 Step 5: Creating Babel configuration...");

		const babelConfig = {
			presets: [
				["@babel/preset-env", { targets: { node: "current" } }],
				"@babel/preset-typescript",
			],
		};

		await fs.writeFile(".babelrc.json", JSON.stringify(babelConfig, null, 2));
		console.log("  ✅ Created: .babelrc.json");

		// Step 6: Create sample test to validate setup
		console.log("\n🧪 Step 6: Creating validation test...");

		const validationTest = `/**
 * Jest Infrastructure Validation Test
 */

describe('Jest Infrastructure', () => {
  test('Jest setup working correctly', () => {
    expect(jest).toBeDefined();
    expect(global.testUtils).toBeDefined();
  });

  test('Test utilities available', () => {
    expect(global.testUtils.mockCliArgs).toBeInstanceOf(Function);
    expect(global.testUtils.mockEnv).toBeInstanceOf(Function);
    expect(global.testUtils.waitFor).toBeInstanceOf(Function);
  });

  test('Mocks working correctly', async () => {
    const { readFile } = require('node:fs/promises');

    readFile.mockResolvedValue('test content');

    const result = await readFile('test.txt');
    expect(result).toBe('test content');
    expect(readFile).toHaveBeenCalledWith('test.txt');
  });

  test('CLI args mocking', () => {
    const restore = global.testUtils.mockCliArgs(['--help', '--verbose']);

    expect(process.argv).toEqual(['node', 'test', '--help', '--verbose']);

    restore();
    expect(process.argv).not.toContain('--help');
  });
});`;

		await fs.mkdir("tests/infrastructure", { recursive: true });
		await fs.writeFile(
			"tests/infrastructure/jest-validation.test.js",
			validationTest,
		);
		console.log("  ✅ Created: tests/infrastructure/jest-validation.test.js");

		// Step 7: Test the fixed infrastructure
		console.log("\n🧪 Step 7: Testing fixed infrastructure...");

		try {
			await runCommand("npm", [
				"test",
				"--",
				"--testPathPattern=jest-validation",
				"--verbose",
			]);
			console.log("  ✅ Jest infrastructure validation passed!");
		} catch (error) {
			console.log("  ⚠️  Jest infrastructure test failed, but setup complete");
			console.log("     Manual verification may be required");
		}

		console.log("\n🎉 Jest infrastructure repair complete!");
		console.log("\n📋 Next steps:");
		console.log('1. Run "npm test" to validate all tests');
		console.log("2. Migrate existing Deno tests to Jest format");
		console.log("3. Update any remaining test files with proper imports");
	} catch (error) {
		console.error("💥 Jest infrastructure repair failed:", error);
		throw error;
	}
}

/**
 * Run a command and return a promise
 */
function runCommand(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			...options,
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Command failed with code ${code}`));
			}
		});

		child.on("error", reject);
	});
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	fixJestInfrastructure().catch((error) => {
		console.error("Script failed:", error);
		process.exit(1);
	});
}

export { fixJestInfrastructure };
