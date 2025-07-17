#!/usr/bin/env node

/**
 * Script to fix parsing errors in TypeScript files
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToFix = [
	"src/unified/work/workflows/dependency-resolver.ts",
	"src/unified/work/workflows/parallel-executor.ts",
	"src/unified/work/workflows/pipeline-manager.ts",
	"src/unified/work/workflows/preset-executor.ts",
	"src/unified/work/workflows/workflow-composer.ts",
	"src/utils/cli-instrumentation.ts",
	"src/utils/debug-logger.ts",
];

const fixes = [
	// Fix missing commas in object literals
	{
		pattern:
			/(\s+)([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,\n]+)(\n\s+)([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,\n]+)/g,
		replacement: "$1$2,$3$4",
	},
	// Fix missing commas in method parameters
	{
		pattern:
			/(\([^)]*)(:\s*[^,\n)]+)(\n\s+)([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,\n)]+)/g,
		replacement: "$1$2,$3$4",
	},
	// Fix missing commas in array literals
	{
		pattern: /(\[\s*[^,\n\]]+)(\n\s+)([^,\n\]]+)/g,
		replacement: "$1,$2$3",
	},
];

function fixFile(filePath: string) {
	const fullPath = path.join(__dirname, "..", filePath);

	if (!fs.existsSync(fullPath)) {
		console.log(`File not found: ${fullPath}`);
		return;
	}

	let content = fs.readFileSync(fullPath, "utf8");
	const originalContent = content;

	// Apply fixes
	for (const fix of fixes) {
		content = content.replace(fix.pattern, fix.replacement);
	}

	// Apply additional specific fixes
	content = content.replace(
		/(\s+)([a-zA-Z_][a-zA-Z0-9_]*:\s*"[^"]*")(\n\s+)([a-zA-Z_][a-zA-Z0-9_]*:\s*"[^"]*")/g,
		"$1$2,$3$4",
	);

	// Apply common Logger config fix
	content = content.replace(
		/Logger\(\{\s*_level:\s*"info"\s*_format:\s*"text"\s*_destination:\s*"console"\s*\}\)/g,
		'Logger({ _level: "info", _format: "text", _destination: "console" })',
	);

	if (content !== originalContent) {
		fs.writeFileSync(fullPath, content, "utf8");
		console.log(`Fixed: ${filePath}`);
	} else {
		console.log(`No changes needed: ${filePath}`);
	}
}

// Process all files
for (const filePath of filesToFix) {
	fixFile(filePath);
}

console.log("Parsing error fixes completed!");
