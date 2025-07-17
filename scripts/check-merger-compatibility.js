#!/usr/bin/env node
/**
 * Merger Compatibility Checker
 * Validates code compatibility with the STEP_BY_STEP_MERGER_IMPLEMENTATION_PLAN.md
 */

import fs from "node:fs";
import path from "node:path";

// Compatibility rules for the merger implementation
const COMPATIBILITY_RULES = {
	// Phase 1: CLI System Unification
	phase1: {
		deprecated: [
			/import.*from.*deno/i,
			/Deno\./,
			/\/\*.*deno.*\*\//i,
			/process\.deno/i,
		],
		required: [
			/import.*from.*node:/, // Node.js imports
			/process\.env/, // Environment variables
			/process\.argv/, // Command line arguments
		],
		warnings: [/function.*duplicate/i, /class.*Duplicate/i, /\.d\.ts.*deno/i],
	},

	// Phase 2: MCP Server Unification
	phase2: {
		deprecated: [
			/mcp.*server.*complete/i,
			/mcp.*server.*basic/i,
			/stdio.*server.*backup/i,
		],
		required: [/mcp.*server\.ts/, /tools.*registry/i, /protocol.*unified/i],
		warnings: [/export.*default.*mcp/i, /multiple.*mcp.*servers/i],
	},

	// Phase 3: Memory & Template Unification
	phase3: {
		deprecated: [
			/memory.*enhanced/i,
			/template.*optimized/i,
			/sqlite.*multiple/i,
		],
		required: [
			/memory.*unified/i,
			/template.*single/i,
			/sqlite.*consolidated/i,
		],
		warnings: [/memory.*backend.*dual/i, /template.*system.*duplicate/i],
	},

	// Phase 4: Build System & Final Cleanup
	phase4: {
		deprecated: [
			/build.*legacy/i,
			/tsconfig.*cjs/i,
			/dist.*cjs/i,
			/build.*system.*multiple/i,
		],
		required: [/build.*unified/i, /tsconfig\.json$/, /dist\/.*\.js$/],
		warnings: [/build.*script.*duplicate/i, /output.*directory.*multiple/i],
	},
};

/**
 * Check file for compatibility issues
 */
function checkFileCompatibility(filePath) {
	if (!fs.existsSync(filePath)) {
		return { error: `File not found: ${filePath}` };
	}

	try {
		const content = fs.readFileSync(filePath, "utf8");
		const issues = {
			deprecated: [],
			missing: [],
			warnings: [],
			phase: determinePhase(filePath),
		};

		// Get rules for current phase
		const rules =
			COMPATIBILITY_RULES[issues.phase] || COMPATIBILITY_RULES.phase1;

		// Check for deprecated patterns
		rules.deprecated.forEach((pattern) => {
			const matches = content.match(
				new RegExp(pattern.source, pattern.flags + "g"),
			);
			if (matches) {
				issues.deprecated.push({
					pattern: pattern.source,
					matches: matches.length,
					examples: matches.slice(0, 3), // Show first 3 examples
				});
			}
		});

		// Check for warning patterns
		if (rules.warnings) {
			rules.warnings.forEach((pattern) => {
				const matches = content.match(
					new RegExp(pattern.source, pattern.flags + "g"),
				);
				if (matches) {
					issues.warnings.push({
						pattern: pattern.source,
						matches: matches.length,
						examples: matches.slice(0, 3),
					});
				}
			});
		}

		// Check for required patterns (context-dependent)
		if (shouldHaveRequiredPatterns(filePath, content)) {
			rules.required.forEach((pattern) => {
				if (!pattern.test(content)) {
					issues.missing.push({
						pattern: pattern.source,
						suggestion: getRequiredPatternSuggestion(pattern),
					});
				}
			});
		}

		return {
			file: filePath,
			phase: issues.phase,
			deprecated: issues.deprecated,
			warnings: issues.warnings,
			missing: issues.missing,
			compatible: issues.deprecated.length === 0 && issues.missing.length === 0,
		};
	} catch (error) {
		return { error: `Error reading file: ${error.message}` };
	}
}

/**
 * Determine which merger phase this file is relevant to
 */
function determinePhase(filePath) {
	if (filePath.includes("cli") || filePath.includes("simple-cli")) {
		return "phase1";
	}
	if (filePath.includes("mcp") || filePath.includes("server")) {
		return "phase2";
	}
	if (filePath.includes("memory") || filePath.includes("template")) {
		return "phase3";
	}
	if (filePath.includes("build") || filePath.includes("tsconfig")) {
		return "phase4";
	}
	return "phase1"; // Default
}

/**
 * Check if file should have required patterns
 */
function shouldHaveRequiredPatterns(filePath, content) {
	// Only check for required patterns in active implementation files
	return (
		content.includes("export") ||
		content.includes("import") ||
		content.includes("function") ||
		content.includes("class")
	);
}

/**
 * Get suggestion for missing required pattern
 */
function getRequiredPatternSuggestion(pattern) {
	const suggestions = {
		"import.*from.*node:":
			'Use Node.js built-in imports (e.g., import { readFile } from "node:fs")',
		"process\\.env":
			"Use process.env for environment variables instead of Deno.env",
		"process\\.argv":
			"Use process.argv for command line arguments instead of Deno.args",
	};

	return (
		suggestions[pattern.source] ||
		"Consider implementing this pattern for merger compatibility"
	);
}

/**
 * Analyze multiple files for compatibility
 */
function analyzeCompatibility(files) {
	const results = {
		totalFiles: files.length,
		compatibleFiles: 0,
		incompatibleFiles: 0,
		filesWithWarnings: 0,
		issues: [],
		summary: {
			deprecated: 0,
			warnings: 0,
			missing: 0,
		},
	};

	files.forEach((file) => {
		const analysis = checkFileCompatibility(file);

		if (analysis.error) {
			results.issues.push({
				file,
				error: analysis.error,
			});
			return;
		}

		if (analysis.compatible) {
			results.compatibleFiles++;
		} else {
			results.incompatibleFiles++;
		}

		if (analysis.warnings.length > 0) {
			results.filesWithWarnings++;
		}

		// Aggregate statistics
		results.summary.deprecated += analysis.deprecated.length;
		results.summary.warnings += analysis.warnings.length;
		results.summary.missing += analysis.missing.length;

		// Store detailed results
		if (!analysis.compatible || analysis.warnings.length > 0) {
			results.issues.push(analysis);
		}
	});

	return results;
}

/**
 * Generate compatibility report
 */
function generateReport(results) {
	console.log("🔄 Merger Compatibility Report\\n");

	// Summary statistics
	console.log("📊 Summary:");
	console.log(`   Total files checked: ${results.totalFiles}`);
	console.log(`   Compatible files: ${results.compatibleFiles}`);
	console.log(`   Incompatible files: ${results.incompatibleFiles}`);
	console.log(`   Files with warnings: ${results.filesWithWarnings}`);
	console.log(`   Total deprecated patterns: ${results.summary.deprecated}`);
	console.log(`   Total warnings: ${results.summary.warnings}`);
	console.log(`   Total missing patterns: ${results.summary.missing}\\n`);

	// Detailed issues
	if (results.issues.length > 0) {
		console.log("🔍 Detailed Issues:\\n");

		results.issues.forEach((issue) => {
			if (issue.error) {
				console.log(`❌ ${issue.file}: ${issue.error}`);
				return;
			}

			console.log(`📁 ${issue.file} (${issue.phase}):`);

			// Deprecated patterns
			if (issue.deprecated.length > 0) {
				console.log("   ❌ Deprecated patterns:");
				issue.deprecated.forEach((dep) => {
					console.log(`      - ${dep.pattern} (${dep.matches} matches)`);
					dep.examples.forEach((example) => {
						console.log(`        Example: ${example.trim()}`);
					});
				});
			}

			// Warnings
			if (issue.warnings.length > 0) {
				console.log("   ⚠️  Warnings:");
				issue.warnings.forEach((warn) => {
					console.log(`      - ${warn.pattern} (${warn.matches} matches)`);
				});
			}

			// Missing patterns
			if (issue.missing.length > 0) {
				console.log("   📝 Missing patterns:");
				issue.missing.forEach((missing) => {
					console.log(`      - ${missing.pattern}`);
					console.log(`        Suggestion: ${missing.suggestion}`);
				});
			}

			console.log("");
		});
	}

	// Overall assessment
	const overallGrade = results.incompatibleFiles === 0 ? "PASS" : "NEEDS_WORK";
	console.log(`🎯 Overall Compatibility: ${overallGrade}`);

	if (overallGrade === "NEEDS_WORK") {
		console.log("\\n💡 Recommendations:");
		console.log("   1. Remove Deno dependencies (Phase 1 priority)");
		console.log("   2. Consolidate duplicate implementations");
		console.log("   3. Use Node.js built-in modules where possible");
		console.log("   4. Follow the STEP_BY_STEP_MERGER_IMPLEMENTATION_PLAN.md");
	}

	return overallGrade === "PASS";
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log("Usage: node check-merger-compatibility.js [files...]");
		console.log("       node check-merger-compatibility.js --all");
		process.exit(1);
	}

	let files = args;

	if (args[0] === "--all") {
		// Check all TypeScript/JavaScript files in src/
		const { glob } = await import("glob");
		files = glob.sync("src/**/*.{ts,js}");
	}

	console.log(
		`🔍 Checking ${files.length} files for merger compatibility...\\n`,
	);

	const results = analyzeCompatibility(files);
	const passed = generateReport(results);

	// Exit with appropriate code
	process.exit(passed ? 0 : 1);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { checkFileCompatibility, analyzeCompatibility, generateReport };
