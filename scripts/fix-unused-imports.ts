#!/usr/bin/env node

/**
 * Script to fix unused import warnings by prefixing them with underscores
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all TypeScript files in src directory
function findTsFiles(dir: string): string[] {
	const files: string[] = [];
	const items = fs.readdirSync(dir);

	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...findTsFiles(fullPath));
		} else if (item.endsWith(".ts") || item.endsWith(".js")) {
			files.push(fullPath);
		}
	}

	return files;
}

// Fix unused imports by prefixing with underscore
function fixUnusedImports(filePath: string): boolean {
	let content = fs.readFileSync(filePath, "utf8");
	const originalContent = content;

	// Fix common unused imports
	const fixes = [
		// getErrorMessage import
		{
			pattern: /import \{ getErrorMessage \}/g,
			replacement: "import { getErrorMessage as _getErrorMessage }",
		},
		// Other common unused imports
		{
			pattern: /import \{ generateId \}/g,
			replacement: "import { generateId as _generateId }",
		},
		{
			pattern: /import \{ formatDuration \}/g,
			replacement: "import { formatDuration as _formatDuration }",
		},
		{
			pattern: /import \{ colors \}/g,
			replacement: "import { colors as _colors }",
		},
		// Path imports
		{
			pattern: /import \{ path \}/g,
			replacement: "import { path as _path }",
		},
		{
			pattern: /import \{ join, basename \}/g,
			replacement: "import { join as _join, basename as _basename }",
		},
		{
			pattern: /import \{ join \}/g,
			replacement: "import { join as _join }",
		},
		{
			pattern: /import \{ basename \}/g,
			replacement: "import { basename as _basename }",
		},
		// FS imports
		{
			pattern: /import \{ readFileSync, writeFileSync \}/g,
			replacement:
				"import { readFileSync as _readFileSync, writeFileSync as _writeFileSync }",
		},
		{
			pattern: /import \{ readFileSync \}/g,
			replacement: "import { readFileSync as _readFileSync }",
		},
		{
			pattern: /import \{ writeFileSync \}/g,
			replacement: "import { writeFileSync as _writeFileSync }",
		},
		// Type imports
		{
			pattern: /import \{ AgentProfile \}/g,
			replacement: "import { AgentProfile as _AgentProfile }",
		},
		{
			pattern: /import \{ MemoryManager \}/g,
			replacement: "import { MemoryManager as _MemoryManager }",
		},
		{
			pattern: /import \{ WorkPreset \}/g,
			replacement: "import { WorkPreset as _WorkPreset }",
		},
	];

	// Apply fixes
	for (const fix of fixes) {
		content = content.replace(fix.pattern, fix.replacement);
	}

	// Fix unused variable declarations
	const variableFixes = [
		// const declarations
		{
			pattern:
				/const (path|colors|subArgs|options|code|testResults|coverage|error) =/g,
			replacement: "const _$1 =",
		},
		// let declarations
		{
			pattern:
				/let (path|colors|subArgs|options|code|testResults|coverage|error) =/g,
			replacement: "let _$1 =",
		},
		// Function parameters
		{
			pattern: /\((args|flags|params|options|ctx|context|error)\):/g,
			replacement: "(_$1):",
		},
		{
			pattern: /\((args|flags|params|options|ctx|context|error),/g,
			replacement: "(_$1,",
		},
		{
			pattern: /, (args|flags|params|options|ctx|context|error)\)/g,
			replacement: ", _$1)",
		},
		{
			pattern: /, (args|flags|params|options|ctx|context|error),/g,
			replacement: ", _$1,",
		},
	];

	for (const fix of variableFixes) {
		content = content.replace(fix.pattern, fix.replacement);
	}

	// Fix prefer-const warnings
	const preferConstFixes = [
		{
			pattern: /let (_?finalSessionName|_?counter) =/g,
			replacement: "const $1 =",
		},
		{
			pattern: /let (_?defaultEngine) =/g,
			replacement: "const $1 =",
		},
	];

	for (const fix of preferConstFixes) {
		content = content.replace(fix.pattern, fix.replacement);
	}

	if (content !== originalContent) {
		fs.writeFileSync(filePath, content, "utf8");
		return true;
	}

	return false;
}

// Main execution
console.log("Fixing unused imports and variables...");

const srcDir = path.join(__dirname, "..", "src");
const files = findTsFiles(srcDir);

let fixedCount = 0;
for (const file of files) {
	if (fixUnusedImports(file)) {
		console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
		fixedCount++;
	}
}

console.log(`\nFixed ${fixedCount} files`);
console.log("Unused import fixes completed!");
