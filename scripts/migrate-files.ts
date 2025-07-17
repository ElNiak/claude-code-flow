#!/usr/bin/env tsx
/**
 * Migration execution script for centralized file generation
 */

import { DirectoryStructure } from "../src/file-generation/DirectoryStructure.js";
import { FileMigrationScript } from "../src/file-generation/MigrationScript.js";

async function executeMigration() {
	console.log("🚀 Starting file migration to centralized structure...");

	const directoryStructure = new DirectoryStructure("./.generated");
	const migrationScript = new FileMigrationScript(directoryStructure);

	try {
		// Validate migration requirements
		const validation = await migrationScript.validateMigrationRequirements();

		if (!validation.valid) {
			console.error("❌ Migration validation failed:", validation.issues);
			process.exit(1);
		}

		if (validation.warnings.length > 0) {
			console.warn("⚠️ Migration warnings:", validation.warnings);
		}

		// Show migration summary
		const summary = migrationScript.getMigrationSummary();
		console.log("📊 Migration Summary:");
		console.log(`  - Root-level files: ${summary.rootLevelFiles}`);
		console.log(`  - Directories: ${summary.directories}`);
		console.log(`  - Total items: ${summary.totalItems}`);
		console.log(
			`  - Estimated size reduction: ${summary.estimatedSizeReduction}`,
		);

		// Execute migration
		const result = await migrationScript.executeMigration({
			dryRun: process.argv.includes("--dry-run"),
			backupFirst: true,
			verbose: true,
		});

		console.log("\n📈 Migration Results:");
		console.log(`  - Files moved: ${result.moved.length}`);
		console.log(`  - Errors: ${result.errors.length}`);
		console.log(
			`  - Size reduced: ${Math.round(result.totalSizeReduced / 1024 / 1024)}MB`,
		);
		console.log(`  - Time elapsed: ${result.timeElapsed}ms`);

		if (result.errors.length > 0) {
			console.log("\n❌ Errors encountered:");
			result.errors.forEach((error) => {
				console.log(`  - ${error.file}: ${error.error}`);
			});
		}

		if (result.moved.length > 0) {
			console.log("\n✅ Files successfully moved:");
			result.moved.slice(0, 10).forEach((move) => {
				console.log(`  - ${move.from} → ${move.to}`);
			});
			if (result.moved.length > 10) {
				console.log(`  ... and ${result.moved.length - 10} more files`);
			}
		}

		console.log("\n🎉 Migration completed successfully!");
	} catch (error) {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	}
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	executeMigration().catch(console.error);
}

export { executeMigration };
