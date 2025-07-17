#!/usr/bin/env node
/**
 * Documentation Completeness Checker for Phase 3
 * Ensures all code has proper documentation
 */

import fs from "node:fs";
import path from "node:path";

const REQUIRED_DOCS = [
	"README.md",
	"docs/API.md",
	"docs/ARCHITECTURE.md",
	"docs/GETTING_STARTED.md",
	"docs/DEPLOYMENT.md",
];

function checkDocumentationCompleteness() {
	const missing = [];
	const warnings = [];

	// Check required documentation files
	REQUIRED_DOCS.forEach((doc) => {
		if (!fs.existsSync(doc)) {
			missing.push(doc);
		}
	});

	// Check for undocumented TypeScript files
	const tsFiles = require("glob").sync("src/**/*.ts");
	tsFiles.forEach((file) => {
		const content = fs.readFileSync(file, "utf8");

		// Check for missing function documentation
		const functionMatches = content.match(
			/export\s+(function|class|interface|type)\s+\w+/g,
		);
		if (functionMatches) {
			functionMatches.forEach((match) => {
				const lines = content.split("\\n");
				const matchLine = lines.findIndex((line) => line.includes(match));

				// Check for JSDoc comment above
				if (matchLine > 0 && !lines[matchLine - 1].includes("/**")) {
					warnings.push({
						file,
						issue: `Missing documentation for: ${match}`,
						line: matchLine + 1,
					});
				}
			});
		}
	});

	if (missing.length > 0) {
		console.log("❌ Missing required documentation files:\\n");
		missing.forEach((doc) => {
			console.log(`   ${doc}`);
		});
		console.log("");
		process.exit(1);
	}

	if (warnings.length > 0) {
		console.log("⚠️  Documentation warnings:\\n");
		warnings.forEach((warning) => {
			console.log(`   ${warning.file}:${warning.line}: ${warning.issue}`);
		});
		console.log("");
		console.log("💡 Phase 3 requires comprehensive documentation");
		console.log("   Add JSDoc comments to all exported functions/classes");
	}

	console.log("✅ Documentation completeness check passed");
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	checkDocumentationCompleteness();
}

export { checkDocumentationCompleteness };
