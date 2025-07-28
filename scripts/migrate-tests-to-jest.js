#!/usr/bin/env node
/**
 * Test Migration to Jest
 * Converts Deno tests to Jest format with proper setup
 */

import fs from "node:fs/promises";
import path from "node:path";

const DENO_TEST_PATTERNS = {
	// Test function definitions
	"Deno.test": {
		pattern: /Deno\.test\(['"]([^'"]+)['"],\s*async\s*\(\)\s*=>\s*{/g,
		replacement: "describe('$1', () => {\n  it('should work', async () => {",
	},

	// Assertions
	assertEquals: {
		pattern: /assertEquals\(([^,]+),\s*([^)]+)\)/g,
		replacement: "expect($1).toEqual($2)",
	},

	assert: {
		pattern: /assert\(([^)]+)\)/g,
		replacement: "expect($1).toBeTruthy()",
	},

	assertThrows: {
		pattern: /assertThrows\(\(\)\s*=>\s*([^}]+)\)/g,
		replacement: "expect(() => $1).toThrow()",
	},

	// Command execution
	"Deno.Command": {
		pattern: /new Deno\.Command\((['"][^'"]+['"])/g,
		replacement: "spawn($1, []",
	},

	// File operations
	"Deno.readTextFile": {
		pattern: /await Deno\.readTextFile\(([^)]+)\)/g,
		replacement: "await readFile($1, 'utf8')",
	},
};

/**
 * Find all test files that need migration
 */
async function findTestFiles() {
	const testFiles = [];

	async function scanDirectory(dir) {
		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					await scanDirectory(fullPath);
				} else if (entry.isFile() && entry.name.endsWith(".test.js")) {
					const content = await fs.readFile(fullPath, "utf8");
					if (content.includes("Deno.test") || content.includes("Deno.")) {
						testFiles.push({
							path: fullPath,
							content: content,
							needsMigration: true,
						});
					}
				}
			}
		} catch (_error) {
			// Directory may not exist, ignore
		}
	}

	// Scan common test directories
	const testDirs = ["tests", "src", "test"];
	for (const dir of testDirs) {
		await scanDirectory(dir);
	}

	return testFiles;
}

/**
 * Migrate a single test file from Deno to Jest
 */
function migrateTestFile(content) {
	let migratedContent = content;

	// Add required imports at the top
	const imports = [
		"import { readFile, writeFile, stat, readdir, mkdir } from 'node:fs/promises';",
		"import { spawn } from 'node:child_process';",
	];

	// Apply pattern replacements
	for (const [name, config] of Object.entries(DENO_TEST_PATTERNS)) {
		migratedContent = migratedContent.replace(
			config.pattern,
			config.replacement,
		);
	}

	// Add imports if Deno functions were found and replaced
	const needsImports = content.includes("Deno.");
	if (needsImports) {
		const importSection = `${imports.join("\n")}\n\n`;
		migratedContent = importSection + migratedContent;
	}

	// Fix test structure (ensure proper closing)
	migratedContent = migratedContent.replace(/\n\s*}\);?\s*$/gm, "\n  });\n});");

	// Add Jest-specific setup if needed
	if (content.includes("cleanup") || content.includes("globalThis")) {
		migratedContent = migratedContent.replace(
			/global\.cleanupMigrationTest\s*=.*?};/s,
			`afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});`,
		);
	}

	return migratedContent;
}

/**
 * Create Jest-compatible test files
 */
async function createJestTests() {
	console.log("🧪 JEST TEST MIGRATION");
	console.log("=====================\n");

	try {
		// Find all test files
		console.log("📁 Step 1: Finding test files...");
		const testFiles = await findTestFiles();

		console.log(`📋 Found ${testFiles.length} test files to migrate`);

		if (testFiles.length === 0) {
			console.log("✅ No test files need migration");
			return;
		}

		// Create migrated tests directory
		await fs.mkdir("tests/migrated-jest", { recursive: true });

		// Migrate each test file
		console.log("\n🔄 Step 2: Migrating test files...");
		const results = [];

		for (const testFile of testFiles) {
			try {
				console.log(`  📝 Migrating: ${testFile.path}`);

				const migratedContent = migrateTestFile(testFile.content);

				// Create output path
				const relativePath = path.relative(".", testFile.path);
				const outputPath = path.join(
					"tests/migrated-jest",
					path.basename(relativePath),
				);

				// Write migrated file
				await fs.writeFile(outputPath, migratedContent);

				console.log(`    ✅ Created: ${outputPath}`);

				results.push({
					original: testFile.path,
					migrated: outputPath,
					success: true,
				});
			} catch (error) {
				console.log(`    ❌ Failed: ${error.message}`);
				results.push({
					original: testFile.path,
					success: false,
					error: error.message,
				});
			}
		}

		// Create comprehensive test suite
		console.log("\n🧪 Step 3: Creating comprehensive test suite...");

		const comprehensiveTest = `/**
 * Comprehensive Jest Test Suite
 * Validates all core functionality
 */

describe('Claude Flow Core Functionality', () => {
  describe('CLI Operations', () => {
    test('CLI help command', async () => {
      const { spawn } = require('node:child_process');

      const result = await new Promise((resolve) => {
        const child = spawn('./bin/claude-flow', ['--help'], { stdio: 'pipe' });
        let stdout = '';

        child.stdout.on('data', (data) => stdout += data);
        child.on('close', (code) => resolve({ code, stdout }));
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('claude-flow');
    });

    test('CLI version command', async () => {
      const { spawn } = require('node:child_process');

      const result = await new Promise((resolve) => {
        const child = spawn('./bin/claude-flow', ['--version'], { stdio: 'pipe' });
        let stdout = '';

        child.stdout.on('data', (data) => stdout += data);
        child.on('close', (code) => resolve({ code, stdout }));
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2.0.0');
    });
  });

  describe('Build System', () => {
    test('TypeScript compilation', () => {
      const { execSync } = require('node:child_process');

      expect(() => {
        execSync('npm run typecheck', { stdio: 'pipe' });
      }).not.toThrow();
    });

    test('Build process', () => {
      const { execSync } = require('node:child_process');

      expect(() => {
        execSync('npm run build', { stdio: 'pipe' });
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    test('Package.json validity', async () => {
      const { readFile } = require('node:fs/promises');

      const packageContent = await readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);

      expect(packageJson.name).toBe('claude-flow');
      expect(packageJson.version).toMatch(/\\d+\\.\\d+\\.\\d+/);
      expect(packageJson.main).toBeDefined();
    });
  });
});`;

		await fs.writeFile(
			"tests/migrated-jest/comprehensive.test.js",
			comprehensiveTest,
		);
		console.log("  ✅ Created: tests/migrated-jest/comprehensive.test.js");

		// Summary
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);

		console.log(`\n📊 Migration Summary:`);
		console.log(`  ✅ Successful: ${successful.length}`);
		console.log(`  ❌ Failed: ${failed.length}`);
		console.log(`  📁 Output directory: tests/migrated-jest/`);

		if (failed.length > 0) {
			console.log("\n❌ Failed migrations:");
			failed.forEach((f) => console.log(`  - ${f.original}: ${f.error}`));
		}

		// Save migration results
		const migrationResults = {
			timestamp: new Date().toISOString(),
			successful,
			failed,
			summary: {
				total: results.length,
				successful: successful.length,
				failed: failed.length,
			},
		};

		await fs.writeFile(
			"jest-migration-results.json",
			JSON.stringify(migrationResults, null, 2),
		);
		console.log("\n💾 Results saved to: jest-migration-results.json");

		console.log("\n🎯 Next steps:");
		console.log("1. Run: npm test -- --testPathPattern=migrated-jest");
		console.log("2. Review and fix any failing tests manually");
		console.log("3. Move working tests to main test directory");
		console.log("4. Remove old Deno test files");
	} catch (error) {
		console.error("💥 Test migration failed:", error);
		throw error;
	}
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	createJestTests().catch((error) => {
		console.error("Script failed:", error);
		process.exit(1);
	});
}

export { createJestTests, migrateTestFile };
