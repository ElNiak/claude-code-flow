#!/usr/bin/env node
/**
 * Enforce docs/ Structure for Phase 2+
 * Blocks new markdown files from being added to root
 */

import fs from "node:fs";
import path from "node:path";

function enforceDocsStructure(files) {
	const violations = [];

	files.forEach((file) => {
		// Check if it's a markdown file in root
		if (
			file.match(/^[^/]+\.md$/) &&
			!file.startsWith("README") &&
			!file.startsWith("CHANGELOG")
		) {
			violations.push({
				file,
				issue: "Markdown file in root directory",
				suggestion: `Move to docs/ directory: mv ${file} docs/`,
			});
		}
	});

	if (violations.length > 0) {
		console.log("❌ Documentation structure violations detected:\\n");
		violations.forEach((violation) => {
			console.log(`   ${violation.file}: ${violation.issue}`);
			console.log(`   Suggestion: ${violation.suggestion}\\n`);
		});

		console.log("💡 Phase 2+ requires all documentation in docs/ directory");
		console.log(
			"   Run: node scripts/file-organization-helper.js --create-dirs",
		);

		process.exit(1);
	}

	console.log("✅ Documentation structure compliant");
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	const files = process.argv.slice(2);
	enforceDocsStructure(files);
}

export { enforceDocsStructure };
