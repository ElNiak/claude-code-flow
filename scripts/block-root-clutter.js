#!/usr/bin/env node
/**
 * Block Root Clutter for Phase 2+
 * Prevents new files from cluttering the root directory
 */

const fs = require("fs");
const path = require("path");

// Files allowed in root directory
const ALLOWED_ROOT_FILES = [
	"package.json",
	"package-lock.json",
	"tsconfig.json",
	"README.md",
	"CHANGELOG.md",
	"LICENSE",
	"CLAUDE.md",
	"STEP_BY_STEP_MERGER_IMPLEMENTATION_PLAN.md",
	".gitignore",
	".pre-commit-config.yaml",
	".pre-commit-config-progressive.yaml",
	".pre-commit-config-improved.yaml",
	".secrets.baseline",
	".hadolint.yaml",
	"PRE_COMMIT_IMPROVEMENT_PLAN.md",
];

function blockRootClutter(files) {
	const violations = [];

	files.forEach((file) => {
		// Check if it's a root-level file
		if (!file.includes("/") && !ALLOWED_ROOT_FILES.includes(file)) {
			const ext = path.extname(file);

			if (ext === ".md") {
				violations.push({
					file,
					issue: "Documentation file in root directory",
					suggestion: `Move to docs/: mv ${file} docs/`,
				});
			} else if (ext === ".json") {
				violations.push({
					file,
					issue: "JSON file in root directory",
					suggestion: `Move to appropriate directory: mv ${file} analysis/ or config/`,
				});
			} else if ([".yml", ".yaml"].includes(ext)) {
				violations.push({
					file,
					issue: "YAML file in root directory",
					suggestion: `Move to config/: mv ${file} config/`,
				});
			} else {
				violations.push({
					file,
					issue: "Unexpected file in root directory",
					suggestion: `Move to appropriate subdirectory or add to ALLOWED_ROOT_FILES if necessary`,
				});
			}
		}
	});

	if (violations.length > 0) {
		console.log("❌ Root directory clutter violations detected:\\n");
		violations.forEach((violation) => {
			console.log(`   ${violation.file}: ${violation.issue}`);
			console.log(`   Suggestion: ${violation.suggestion}\\n`);
		});

		console.log("💡 Phase 2+ enforces clean root directory structure");
		console.log("   Only essential files should be in root directory");
		console.log(
			"   Run: node scripts/file-organization-helper.js --create-dirs",
		);

		process.exit(1);
	}

	console.log("✅ Root directory structure compliant");
}

// CLI interface
if (require.main === module) {
	const files = process.argv.slice(2);
	blockRootClutter(files);
}

module.exports = { blockRootClutter };
