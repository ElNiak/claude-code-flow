#!/usr/bin/env -S npx tsx

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

interface FixPattern {
	pattern: RegExp;
	replacement: string;
	description: string;
}

// Comprehensive patterns to fix parsing errors
const fixPatterns: FixPattern[] = [
	// Fix missing commas in object literals
	{
		pattern: /(\w+:\s*[^,}\n]+)(\s*\n\s*)(\w+\s*:)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma after object property",
	},

	// Fix missing commas in interface/type definitions
	{
		pattern: /(\w+:\s*[^,;\n]+)(\s*\n\s*)(\w+\s*:)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma in interface definition",
	},

	// Fix missing commas in function parameters
	{
		pattern: /(\w+:\s*[^,)\n]+)(\s*\n\s*)(\w+\s*:)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma in function parameters",
	},

	// Fix missing commas in array elements
	{
		pattern: /(\w+)(\s*\n\s*)(\w+)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma in array elements",
	},

	// Fix specific patterns found in the codebase
	{
		pattern: /(\w+:\s*"[^"]*")(\s*\n\s*)(\w+\s*:)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma after string property",
	},

	{
		pattern: /(\w+:\s*\d+)(\s*\n\s*)(\w+\s*:)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma after number property",
	},

	{
		pattern: /(\w+:\s*true|false)(\s*\n\s*)(\w+\s*:)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma after boolean property",
	},

	// Fix missing commas in union types
	{
		pattern: /(\|\s*"[^"]*")(\s*\n\s*)(\|\s*"[^"]*")/g,
		replacement: "$1$2$3",
		description: "Fix union type formatting",
	},

	// Fix missing commas in enum-like objects
	{
		pattern: /(\w+\s*=\s*"[^"]*")(\s*\n\s*)(\w+\s*=)/g,
		replacement: "$1,$2$3",
		description: "Add missing comma in enum-like object",
	},
];

// Specific file patterns that need targeted fixes
const specificFixes: Record<string, FixPattern[]> = {
	"workflow-composer.ts": [
		{
			pattern: /(\w+:\s*string)(;\s*\n\s*)(\w+\s*:)/g,
			replacement: "$1,$2$3",
			description: "Fix interface property separators",
		},
		{
			pattern: /(\w+:\s*\w+\[\])(;\s*\n\s*)(\w+\s*:)/g,
			replacement: "$1,$2$3",
			description: "Fix array type property separators",
		},
	],
	"work-command-integrated.ts": [
		{
			pattern: /(\w+:\s*any)(;\s*\n\s*)(\w+\s*:)/g,
			replacement: "$1,$2$3",
			description: "Fix any type property separators",
		},
	],
};

async function fixFile(
	filePath: string,
): Promise<{ fixed: boolean; changes: number }> {
	try {
		const content = readFileSync(filePath, "utf-8");
		let fixedContent = content;
		let changes = 0;

		// Apply general patterns
		for (const pattern of fixPatterns) {
			const before = fixedContent;
			fixedContent = fixedContent.replace(pattern.pattern, pattern.replacement);
			if (fixedContent !== before) {
				changes++;
				console.log(`Applied ${pattern.description} to ${filePath}`);
			}
		}

		// Apply specific patterns for this file
		const fileName = filePath.split("/").pop() || "";
		const specificPatterns = specificFixes[fileName];
		if (specificPatterns) {
			for (const pattern of specificPatterns) {
				const before = fixedContent;
				fixedContent = fixedContent.replace(
					pattern.pattern,
					pattern.replacement,
				);
				if (fixedContent !== before) {
					changes++;
					console.log(`Applied specific ${pattern.description} to ${filePath}`);
				}
			}
		}

		// Additional targeted fixes for common patterns

		// Fix missing commas in object literals with specific patterns
		fixedContent = fixedContent.replace(
			/(\w+:\s*Record<string,\s*\w+>)(\s*\n\s*)(\w+\s*:)/g,
			"$1,$2$3",
		);

		// Fix missing commas in generic type parameters
		fixedContent = fixedContent.replace(
			/(\w+:\s*Map<[^>]+>)(\s*\n\s*)(\w+\s*:)/g,
			"$1,$2$3",
		);

		// Fix missing commas in function return types
		fixedContent = fixedContent.replace(
			/(\w+:\s*\([^)]*\)\s*=>\s*\w+\[\])(\s*\n\s*)(\w+\s*:)/g,
			"$1,$2$3",
		);

		// Fix missing commas after complex types
		fixedContent = fixedContent.replace(
			/(\w+:\s*\{[^}]*\})(\s*\n\s*)(\w+\s*:)/g,
			"$1,$2$3",
		);

		// Fix missing commas in array of objects
		fixedContent = fixedContent.replace(
			/(\w+:\s*\[[^\]]*\])(\s*\n\s*)(\w+\s*:)/g,
			"$1,$2$3",
		);

		if (fixedContent !== content) {
			writeFileSync(filePath, fixedContent);
			return { fixed: true, changes };
		}

		return { fixed: false, changes: 0 };
	} catch (error) {
		console.error(`Error fixing ${filePath}:`, error);
		return { fixed: false, changes: 0 };
	}
}

async function main() {
	console.log("🔧 Fixing remaining parsing errors...");

	// Get all TypeScript files with parsing errors
	const files = await glob("src/**/*.ts", {
		ignore: ["node_modules/**", "dist/**"],
	});

	let totalFixed = 0;
	let totalChanges = 0;

	for (const file of files) {
		const result = await fixFile(file);
		if (result.fixed) {
			totalFixed++;
			totalChanges += result.changes;
		}
	}

	console.log(
		`\n✅ Fixed ${totalFixed} files with ${totalChanges} total changes`,
	);

	// Run a test to see if we reduced the errors
	console.log("\n🧪 Running lint test...");
	const { spawn } = require("child_process");

	const lintProcess = spawn("npm", ["run", "lint"], {
		stdio: "inherit",
		shell: true,
	});

	lintProcess.on("close", (code) => {
		if (code === 0) {
			console.log("✅ No linting errors remaining!");
		} else {
			console.log(`⚠️  ${code} linting issues remain - may need manual review`);
		}
	});
}

main().catch(console.error);
