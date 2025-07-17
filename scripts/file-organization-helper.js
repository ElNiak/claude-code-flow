#!/usr/bin/env node
/**
 * File Organization Helper for Pre-commit
 * Suggests better file locations without blocking commits
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for file organization
const ORGANIZATION_RULES = {
	// Documentation files
	docs: {
		extensions: [".md"],
		rootPatterns: [
			/^[A-Z_]+\.md$/, // ALL_CAPS.md files
			/ARCHITECTURE/i,
			/IMPLEMENTATION/i,
			/ANALYSIS/i,
			/REPORT/i,
			/SUMMARY/i,
			/GUIDE/i,
			/STRATEGY/i,
			/PLAN/i,
		],
		targetDir: "docs",
		subdirs: {
			"docs/architecture": [/ARCHITECTURE/i, /DESIGN/i],
			"docs/analysis": [/ANALYSIS/i, /REPORT/i],
			"docs/implementation": [/IMPLEMENTATION/i, /PLAN/i],
			"docs/completed": [/COMPLETE/i, /FINAL/i, /MISSION/i],
		},
	},

	// Analysis and data files
	analysis: {
		extensions: [".json"],
		rootPatterns: [
			/_analysis/i,
			/_report/i,
			/_integration/i,
			/_comparison/i,
			/_assessment/i,
			/system_/i,
			/coordination_/i,
			/workflow_/i,
		],
		targetDir: "analysis",
		subdirs: {
			"analysis/system": [/system_/i, /architecture_/i],
			"analysis/coordination": [/coordination_/i, /swarm_/i, /agent_/i],
			"analysis/workflow": [/workflow_/i, /execution_/i],
		},
	},

	// Configuration files
	config: {
		extensions: [".json", ".yaml", ".yml"],
		rootPatterns: [/config/i, /settings/i, /tsconfig/i],
		targetDir: "config",
		exclude: ["package.json", "package-lock.json", "tsconfig.json"], // Keep these at root
	},
};

/**
 * Check if file should be organized
 */
function shouldOrganizeFile(filePath) {
	const fileName = path.basename(filePath);
	const ext = path.extname(fileName);

	// Skip if in subdirectory already
	if (filePath.includes("/")) {
		return null;
	}

	// Check each organization rule
	for (const [category, rule] of Object.entries(ORGANIZATION_RULES)) {
		// Check if file extension matches
		if (!rule.extensions.includes(ext)) {
			continue;
		}

		// Check if file is excluded
		if (rule.exclude && rule.exclude.includes(fileName)) {
			continue;
		}

		// Check if file matches patterns
		const matches = rule.rootPatterns.some((pattern) => pattern.test(fileName));
		if (matches) {
			// Find best subdirectory
			let bestSubdir = rule.targetDir;
			if (rule.subdirs) {
				for (const [subdir, patterns] of Object.entries(rule.subdirs)) {
					if (patterns.some((pattern) => pattern.test(fileName))) {
						bestSubdir = subdir;
						break;
					}
				}
			}

			return {
				category,
				currentPath: filePath,
				suggestedPath: path.join(bestSubdir, fileName),
				reason: `${category} file should be in ${bestSubdir}/`,
			};
		}
	}

	return null;
}

/**
 * Analyze repository structure
 */
function analyzeRepositoryStructure() {
	const results = {
		suggestions: [],
		stats: {
			totalFiles: 0,
			rootFiles: 0,
			misplacedFiles: 0,
			organizationOpportunities: 0,
		},
	};

	try {
		// Get all files in root directory
		const files = fs.readdirSync(".", { withFileTypes: true });

		files.forEach((file) => {
			if (file.isFile()) {
				results.stats.totalFiles++;
				results.stats.rootFiles++;

				const suggestion = shouldOrganizeFile(file.name);
				if (suggestion) {
					results.suggestions.push(suggestion);
					results.stats.misplacedFiles++;
				}
			}
		});

		results.stats.organizationOpportunities = results.suggestions.length;
	} catch (error) {
		console.error("Error analyzing repository structure:", error.message);
		return null;
	}

	return results;
}

/**
 * Generate organization suggestions
 */
function generateSuggestions(results) {
	console.log("🗂️  File Organization Suggestions\\n");

	if (results.suggestions.length === 0) {
		console.log("✅ No organization suggestions - structure looks good!");
		return;
	}

	console.log(
		`📊 Found ${results.suggestions.length} organization opportunities:\\n`,
	);

	// Group suggestions by category
	const grouped = {};
	results.suggestions.forEach((suggestion) => {
		if (!grouped[suggestion.category]) {
			grouped[suggestion.category] = [];
		}
		grouped[suggestion.category].push(suggestion);
	});

	// Display grouped suggestions
	Object.entries(grouped).forEach(([category, suggestions]) => {
		console.log(`📁 ${category.toUpperCase()} FILES:`);
		suggestions.forEach((suggestion) => {
			console.log(`   ${suggestion.currentPath} → ${suggestion.suggestedPath}`);
			console.log(`   Reason: ${suggestion.reason}\\n`);
		});
	});

	// Show helpful commands
	console.log("🛠️  Helpful Commands:");
	console.log(
		"   Create directories: mkdir -p docs/{architecture,analysis,implementation,completed} analysis/{system,coordination,workflow}",
	);
	console.log(
		"   Move files safely: node scripts/analyze-file-dependencies.js <file> && mv <file> <target>",
	);
	console.log(
		"   Validate structure: node scripts/validate-cleanup.js --comprehensive\\n",
	);
}

/**
 * Create directory structure if needed
 */
function createDirectoryStructure() {
	const directories = [
		"docs",
		"docs/architecture",
		"docs/analysis",
		"docs/implementation",
		"docs/completed",
		"analysis",
		"analysis/system",
		"analysis/coordination",
		"analysis/workflow",
	];

	directories.forEach((dir) => {
		if (!fs.existsSync(dir)) {
			try {
				fs.mkdirSync(dir, { recursive: true });
				console.log(`📁 Created directory: ${dir}`);
			} catch (error) {
				console.error(`❌ Failed to create directory ${dir}:`, error.message);
			}
		}
	});
}

/**
 * Main function
 */
function main() {
	console.log("🔍 Analyzing file organization...\\n");

	const results = analyzeRepositoryStructure();
	if (!results) {
		console.error("❌ Failed to analyze repository structure");
		process.exit(1);
	}

	// Show statistics
	console.log("📊 Repository Structure Statistics:");
	console.log(`   Total files: ${results.stats.totalFiles}`);
	console.log(`   Root-level files: ${results.stats.rootFiles}`);
	console.log(
		`   Organization opportunities: ${results.stats.organizationOpportunities}\\n`,
	);

	// Generate suggestions
	generateSuggestions(results);

	// Offer to create directory structure
	if (results.suggestions.length > 0) {
		console.log(
			"💡 Tip: Run with --create-dirs to create the directory structure automatically\\n",
		);
	}

	// Create directories if requested
	if (process.argv.includes("--create-dirs")) {
		createDirectoryStructure();
	}

	// Exit with appropriate code
	// Don't fail pre-commit, just provide suggestions
	console.log(
		"ℹ️  This is a suggestion tool - your commit will proceed normally",
	);
	process.exit(0);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { shouldOrganizeFile, analyzeRepositoryStructure, generateSuggestions };
