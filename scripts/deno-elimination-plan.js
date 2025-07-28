#!/usr/bin/env node
/**
 * Comprehensive Deno Elimination Plan
 * Systematic migration from Deno APIs to Node.js equivalents
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Deno to Node.js API mapping
const DENO_TO_NODE_MAPPING = {
	// File System Operations
	"Deno.readTextFile": {
		nodeEquivalent: "fs.readFile",
		import: "import { readFile } from 'node:fs/promises';",
		usage: "await readFile(path, 'utf8')",
		async: true,
	},
	"Deno.writeTextFile": {
		nodeEquivalent: "fs.writeFile",
		import: "import { writeFile } from 'node:fs/promises';",
		usage: "await writeFile(path, content, 'utf8')",
		async: true,
	},
	"Deno.stat": {
		nodeEquivalent: "fs.stat",
		import: "import { stat } from 'node:fs/promises';",
		usage: "await stat(path)",
		async: true,
	},
	"Deno.readDir": {
		nodeEquivalent: "fs.readdir",
		import: "import { readdir } from 'node:fs/promises';",
		usage: "await readdir(path, { withFileTypes: true })",
		async: true,
	},
	"Deno.mkdir": {
		nodeEquivalent: "fs.mkdir",
		import: "import { mkdir } from 'node:fs/promises';",
		usage: "await mkdir(path, { recursive: true })",
		async: true,
	},

	// Process & Environment
	"Deno.env.get": {
		nodeEquivalent: "process.env",
		import: null,
		usage: "process.env['KEY']",
		async: false,
	},
	"Deno.args": {
		nodeEquivalent: "process.argv",
		import: null,
		usage: "process.argv.slice(2)",
		async: false,
	},
	"Deno.exit": {
		nodeEquivalent: "process.exit",
		import: null,
		usage: "process.exit(code)",
		async: false,
	},

	// System Information
	"Deno.memoryUsage": {
		nodeEquivalent: "process.memoryUsage",
		import: null,
		usage: "process.memoryUsage()",
		async: false,
	},
	"Deno.osType": {
		nodeEquivalent: "process.platform",
		import: null,
		usage: "process.platform",
		async: false,
	},

	// Command Execution
	"new Deno.Command": {
		nodeEquivalent: "spawn",
		import: "import { spawn } from 'node:child_process';",
		usage: "spawn(command, args, options)",
		async: false,
	},

	// I/O Streams
	"Deno.stdout": {
		nodeEquivalent: "process.stdout",
		import: null,
		usage: "process.stdout",
		async: false,
	},
	"Deno.stdin": {
		nodeEquivalent: "process.stdin",
		import: null,
		usage: "process.stdin",
		async: false,
	},
	"Deno.stderr": {
		nodeEquivalent: "process.stderr",
		import: null,
		usage: "process.stderr",
		async: false,
	},
};

/**
 * Scan directory for files containing Deno references
 */
async function scanForDenoReferences(directory = "src") {
	const denoFiles = [];

	async function scanDir(dir) {
		const entries = await fs.promises.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				await scanDir(fullPath);
			} else if (
				entry.isFile() &&
				(entry.name.endsWith(".js") || entry.name.endsWith(".ts"))
			) {
				try {
					const content = await fs.promises.readFile(fullPath, "utf8");

					// Check for Deno references
					const denoReferences = [];
					for (const [denoApi, nodeInfo] of Object.entries(
						DENO_TO_NODE_MAPPING,
					)) {
						if (content.includes(denoApi)) {
							denoReferences.push({
								denoApi,
								nodeEquivalent: nodeInfo.nodeEquivalent,
								import: nodeInfo.import,
								usage: nodeInfo.usage,
								async: nodeInfo.async,
							});
						}
					}

					if (denoReferences.length > 0) {
						denoFiles.push({
							file: fullPath,
							references: denoReferences,
							content: content,
						});
					}
				} catch (error) {
					console.warn(`Error reading ${fullPath}: ${error.message}`);
				}
			}
		}
	}

	await scanDir(directory);
	return denoFiles;
}

/**
 * Generate migration plan for each file
 */
function generateMigrationPlan(denoFiles) {
	const migrationPlan = {
		totalFiles: denoFiles.length,
		totalReferences: denoFiles.reduce(
			(acc, file) => acc + file.references.length,
			0,
		),
		files: [],
		summary: {
			fileOperations: 0,
			processOperations: 0,
			systemOperations: 0,
			commandOperations: 0,
			ioOperations: 0,
		},
	};

	for (const fileInfo of denoFiles) {
		const filePlan = {
			file: fileInfo.file,
			priority: calculatePriority(fileInfo.file),
			references: fileInfo.references,
			requiredImports: [],
			transformations: [],
		};

		// Generate required imports
		const imports = new Set();
		for (const ref of fileInfo.references) {
			if (ref.import) {
				imports.add(ref.import);
			}

			// Update summary
			if (
				ref.denoApi.includes("File") ||
				ref.denoApi.includes("Dir") ||
				ref.denoApi.includes("stat")
			) {
				migrationPlan.summary.fileOperations++;
			} else if (
				ref.denoApi.includes("env") ||
				ref.denoApi.includes("args") ||
				ref.denoApi.includes("exit")
			) {
				migrationPlan.summary.processOperations++;
			} else if (
				ref.denoApi.includes("memory") ||
				ref.denoApi.includes("osType")
			) {
				migrationPlan.summary.systemOperations++;
			} else if (ref.denoApi.includes("Command")) {
				migrationPlan.summary.commandOperations++;
			} else if (
				ref.denoApi.includes("stdout") ||
				ref.denoApi.includes("stdin")
			) {
				migrationPlan.summary.ioOperations++;
			}
		}

		filePlan.requiredImports = Array.from(imports);

		// Generate transformations
		for (const ref of fileInfo.references) {
			filePlan.transformations.push({
				from: ref.denoApi,
				to: ref.usage,
				pattern: new RegExp(
					ref.denoApi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
					"g",
				),
			});
		}

		migrationPlan.files.push(filePlan);
	}

	// Sort files by priority
	migrationPlan.files.sort((a, b) => b.priority - a.priority);

	return migrationPlan;
}

/**
 * Calculate migration priority based on file path and importance
 */
function calculatePriority(filePath) {
	let priority = 1;

	// CLI core files get highest priority
	if (filePath.includes("simple-cli") || filePath.includes("cli-core"))
		priority += 10;

	// Commands get high priority
	if (filePath.includes("commands/")) priority += 5;

	// Validation files get medium priority
	if (filePath.includes("validation/")) priority += 3;

	// Performance files get medium priority
	if (filePath.includes("performance")) priority += 3;

	// UI files get lower priority
	if (filePath.includes("ui") || filePath.includes("start-ui")) priority += 1;

	return priority;
}

/**
 * Execute migration for a single file
 */
async function migrateFile(fileInfo, migrationPlan) {
	const filePath = fileInfo.file;
	const backupPath = filePath + ".deno-backup";

	console.log(`\n🔄 Migrating: ${filePath}`);

	try {
		// Create backup
		await fs.promises.copyFile(filePath, backupPath);

		// Read current content
		let content = await fs.promises.readFile(filePath, "utf8");

		// Add required imports at the top
		const imports = fileInfo.requiredImports;
		if (imports.length > 0) {
			const importSection = imports.join("\n") + "\n";

			// Find the position to insert imports (after existing imports or at the top)
			const lines = content.split("\n");
			let insertIndex = 0;

			// Find last import line
			for (let i = 0; i < lines.length; i++) {
				if (
					lines[i].trim().startsWith("import ") ||
					lines[i].trim().startsWith("const ")
				) {
					insertIndex = i + 1;
				}
			}

			lines.splice(insertIndex, 0, importSection);
			content = lines.join("\n");
		}

		// Apply transformations
		let changeCount = 0;
		for (const transform of fileInfo.transformations) {
			const before = content;
			content = content.replace(transform.pattern, transform.to);
			if (content !== before) {
				changeCount++;
				console.log(`  ✅ ${transform.from} → ${transform.to}`);
			}
		}

		// Write updated content
		await fs.promises.writeFile(filePath, content, "utf8");

		console.log(`  📊 Applied ${changeCount} transformations`);

		return {
			file: filePath,
			success: true,
			changes: changeCount,
			backup: backupPath,
		};
	} catch (error) {
		console.error(`  ❌ Error migrating ${filePath}: ${error.message}`);

		return {
			file: filePath,
			success: false,
			error: error.message,
			backup: backupPath,
		};
	}
}

/**
 * Main execution function
 */
async function executeMigration() {
	console.log("🚀 Starting Deno Elimination Plan...\n");

	try {
		// Step 1: Scan for Deno references
		console.log("📊 Step 1: Scanning for Deno references...");
		const denoFiles = await scanForDenoReferences();

		if (denoFiles.length === 0) {
			console.log("✅ No Deno references found!");
			return;
		}

		console.log(`📋 Found ${denoFiles.length} files with Deno references`);

		// Step 2: Generate migration plan
		console.log("\n📝 Step 2: Generating migration plan...");
		const migrationPlan = generateMigrationPlan(denoFiles);

		console.log(`📊 Migration Summary:
    Files to migrate: ${migrationPlan.totalFiles}
    Total references: ${migrationPlan.totalReferences}
    File operations: ${migrationPlan.summary.fileOperations}
    Process operations: ${migrationPlan.summary.processOperations}
    System operations: ${migrationPlan.summary.systemOperations}
    Command operations: ${migrationPlan.summary.commandOperations}
    I/O operations: ${migrationPlan.summary.ioOperations}`);

		// Save migration plan
		await fs.promises.writeFile(
			"deno-migration-plan.json",
			JSON.stringify(migrationPlan, null, 2),
		);

		console.log("\n💾 Migration plan saved to: deno-migration-plan.json");

		// Step 3: Execute migration
		console.log("\n🔄 Step 3: Executing migrations...");
		const results = [];

		for (const fileInfo of migrationPlan.files) {
			const result = await migrateFile(fileInfo, migrationPlan);
			results.push(result);

			// Small delay to prevent overwhelming the system
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Step 4: Summary
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);

		console.log(`\n📊 Migration Complete:
    ✅ Successful: ${successful.length}
    ❌ Failed: ${failed.length}
    📁 Backups created: ${results.length}`);

		if (failed.length > 0) {
			console.log("\n❌ Failed migrations:");
			failed.forEach((f) => console.log(`  - ${f.file}: ${f.error}`));
		}

		// Save results
		await fs.promises.writeFile(
			"deno-migration-results.json",
			JSON.stringify(
				{
					successful,
					failed,
					summary: { successful: successful.length, failed: failed.length },
				},
				null,
				2,
			),
		);

		console.log("\n💾 Results saved to: deno-migration-results.json");

		// Step 5: Validation
		console.log("\n🔍 Step 5: Validating migration...");
		const remainingDeno = await scanForDenoReferences();

		if (remainingDeno.length === 0) {
			console.log("🎉 SUCCESS: All Deno references eliminated!");
		} else {
			console.log(
				`⚠️ ${remainingDeno.length} files still contain Deno references:`,
			);
			remainingDeno.forEach((f) =>
				console.log(`  - ${f.file} (${f.references.length} refs)`),
			);
		}
	} catch (error) {
		console.error("💥 Migration failed:", error);
		process.exit(1);
	}
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	executeMigration();
}

export { scanForDenoReferences, generateMigrationPlan, migrateFile };
