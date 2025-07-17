#!/usr/bin/env node
/**
 * Enforce analysis/ Structure for Phase 2+
 * Blocks new analysis JSON files from being added to root
 */

import fs from "node:fs";
import path from "node:path";

function enforceAnalysisStructure(files) {
	const violations = [];

	files.forEach((file) => {
		// Check if it's an analysis JSON file in root
		if (
			file.match(/^[^/]+\.json$/) &&
			!file.match(/^(package|tsconfig|.*config).*\.json$/)
		) {
			// Check if it looks like analysis data
			const analysisPatterns = [
				/_analysis/i,
				/_report/i,
				/_integration/i,
				/_comparison/i,
				/_assessment/i,
				/system_/i,
				/coordination_/i,
				/workflow_/i,
				/swarm_/i,
				/agent_/i,
				/architecture_/i,
				/performance_/i,
				/dependency_/i,
			];

			if (analysisPatterns.some((pattern) => pattern.test(file))) {
				violations.push({
					file,
					issue: "Analysis file in root directory",
					suggestion: `Move to analysis/ directory: mv ${file} analysis/`,
				});
			}
		}
	});

	if (violations.length > 0) {
		console.log("❌ Analysis structure violations detected:\\n");
		violations.forEach((violation) => {
			console.log(`   ${violation.file}: ${violation.issue}`);
			console.log(`   Suggestion: ${violation.suggestion}\\n`);
		});

		console.log(
			"💡 Phase 2+ requires all analysis files in analysis/ directory",
		);
		console.log(
			"   Run: node scripts/file-organization-helper.js --create-dirs",
		);

		process.exit(1);
	}

	console.log("✅ Analysis structure compliant");
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	const files = process.argv.slice(2);
	enforceAnalysisStructure(files);
}

export { enforceAnalysisStructure };
