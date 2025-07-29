/**
 * Hive Mind Database Optimization Command
 *
 * Safe optimization of existing hive mind databases without breaking compatibility
 */

import chalk from "chalk";
import { existsSync } from "fs";
import inquirer from "inquirer";
import path from "path";
import process from "process";
import {
	generateOptimizationReport,
	optimizeHiveMindDatabase,
	performMaintenance,
} from "./db-optimizer.js";

/**
 * Show help for hive-mind-optimize command
 */
function showOptimizeHelp() {
	console.log(`
🔧 Hive Mind Database Optimization

USAGE:
  claude-flow hive-mind-optimize [options]

OPTIONS:
  --auto              Run optimization without prompts
  --vacuum            Vacuum database (requires exclusive access)
  --clean-memory      Clean old memory entries
  --archive-tasks     Archive completed tasks
  --check-integrity   Run integrity check
  --report            Generate optimization report only
  --memory-days <n>   Memory retention days (default: 30)
  --task-days <n>     Task retention days (default: 7)
  --verbose           Show detailed output

EXAMPLES:
  # Interactive optimization
  claude-flow hive-mind-optimize

  # Auto-optimize with all features
  claude-flow hive-mind-optimize --auto --vacuum --clean-memory --archive-tasks

  # Generate report only
  claude-flow hive-mind-optimize --report

  # Custom retention periods
  claude-flow hive-mind-optimize --clean-memory --memory-days 60 --task-days 14

FEATURES:
  🚀 Performance indexes for faster queries
  📊 Query optimization and statistics
  🧹 Memory cleanup and archiving
  📈 Performance tracking tables
  🔍 Behavioral pattern analysis
  💾 Backward-compatible upgrades

SAFETY:
  • All changes are backward-compatible
  • Existing data is preserved
  • Automatic backups before major operations
  • Rollback capability on errors
`);
}

/**
 * Main optimization command handler
 */
export async function hiveMindOptimizeCommand(
	args: string[],
	flags: Record<string, any>,
) {
	// Show help if requested
	if (flags.help || flags.h) {
		showOptimizeHelp();
		return;
	}

	// Check if hive mind is initialized
	const hiveMindDir = path.join(process.cwd(), ".hive-mind");
	const dbPath = path.join(hiveMindDir, "hive.db");

	if (!existsSync(dbPath)) {
		console.error("Error: Hive Mind database not found");
		console.log('Run "claude-flow hive-mind init" first');
		process.exit(1);
	}

	// Generate report only
	if (flags.report) {
		await generateReport(dbPath);
		return;
	}

	// Auto mode or interactive
	if (flags.auto) {
		await runOptimization(dbPath, {
			vacuum: flags.vacuum || false,
			cleanMemory: flags["clean-memory"] || false,
			archiveTasks: flags["archive-tasks"] || false,
			checkIntegrity: flags["check-integrity"] || false,
			memoryRetentionDays: flags["memory-days"] || 30,
			taskRetentionDays: flags["task-days"] || 7,
			verbose: flags.verbose || false,
		});
	} else {
		await interactiveOptimization(dbPath, flags);
	}
}

/**
 * Interactive optimization wizard
 */
async function interactiveOptimization(
	dbPath: string,
	flags: Record<string, any>,
) {
	console.log("\n🔧 Hive Mind Database Optimization Wizard\n");

	// Generate current report
	const report = await generateOptimizationReport(dbPath);

	if (report) {
		console.log("Current Database Status:");
		console.log(`  Schema Version: ${report.schemaVersion}`);
		console.log(`  Tables: ${Object.keys(report.tables).length}`);
		console.log(`  Indexes: ${report.indexes.length}`);

		let totalSize = 0;
		let totalRows = 0;
		Object.entries(report.tables).forEach(([name, stats]) => {
			totalSize += (stats as any).sizeBytes;
			totalRows += (stats as any).rowCount;
		});

		console.log(`  Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
		console.log(`  Total Rows: ${totalRows.toLocaleString()}`);
		console.log("");
	}

	// Check what optimizations are needed
	const schemaVersion = report?.schemaVersion || 1.0;
	const needsOptimization = schemaVersion < 1.5;

	if (!needsOptimization) {
		console.log("✓ Database is already fully optimized!\n");

		// Skip interactive prompt - default to running maintenance
		const maintenance = true;

		if (!maintenance) {
			console.log("No changes made.");
			return;
		}
	} else {
		console.log(
			`⚠ Database can be optimized from version ${schemaVersion} to 1.5\n`,
		);
	}

	// Ask for optimization options
	const answers = await inquirer.prompt([
		{
			type: "checkbox",
			name: "operations",
			message: "Select operations to perform:",
			choices: [
				{
					name: "Apply performance optimizations",
					value: "optimize",
					checked: needsOptimization,
					disabled: !needsOptimization,
				},
				{
					name: "Clean old memory entries",
					value: "cleanMemory",
					checked: true,
				},
				{
					name: "Archive completed tasks",
					value: "archiveTasks",
					checked: true,
				},
				{
					name: "Vacuum database (requires exclusive access)",
					value: "vacuum",
					checked: false,
				},
				{
					name: "Check database integrity",
					value: "checkIntegrity",
					checked: true,
				},
			],
		},
		{
			type: "number",
			name: "memoryDays",
			message: "Memory retention days:",
			default: 30,
			when: (answers) => answers.operations.includes("cleanMemory"),
		},
		{
			type: "number",
			name: "taskDays",
			message: "Task retention days:",
			default: 7,
			when: (answers) => answers.operations.includes("archiveTasks"),
		},
		{
			type: "confirm",
			name: "confirm",
			message: "Proceed with optimization?",
			default: true,
		},
	]);

	if (!answers.confirm) {
		console.log("Optimization cancelled.");
		return;
	}

	// Create backup if doing major operations
	if (
		answers.operations.includes("optimize") ||
		answers.operations.includes("vacuum")
	) {
		console.log("\n📦 Creating backup...");
		await createBackup(dbPath);
	}

	// Run optimization
	const options = {
		vacuum: answers.operations.includes("vacuum"),
		cleanMemory: answers.operations.includes("cleanMemory"),
		archiveTasks: answers.operations.includes("archiveTasks"),
		checkIntegrity: answers.operations.includes("checkIntegrity"),
		memoryRetentionDays: answers.memoryDays || 30,
		taskRetentionDays: answers.taskDays || 7,
		verbose: flags.verbose || false,
	};

	await runOptimization(dbPath, options);
}

/**
 * Run database optimization
 */
async function runOptimization(dbPath: string, options: Record<string, any>) {
	console.log("\n🚀 Starting optimization...\n");

	// Run schema optimization
	const result = await optimizeHiveMindDatabase(dbPath, options);

	if (!result.success) {
		console.error("\n❌ Optimization failed:", result.error);
		process.exit(1);
	}

	// Run maintenance tasks
	if (options.cleanMemory || options.archiveTasks || options.checkIntegrity) {
		console.log("\n🧹 Running maintenance tasks...\n");
		await performMaintenance(dbPath, options);
	}

	// Generate final report
	console.log("\n📊 Generating optimization report...\n");
	await generateReport(dbPath);

	console.log("\n✅ Optimization complete!\n");

	// Show tips
	console.log("💡 Tips:");
	console.log("  • Monitor performance with: claude-flow hive-mind metrics");
	console.log(
		"  • Schedule regular maintenance: claude-flow hive-mind-optimize --auto",
	);
	console.log("  • Check swarm status: claude-flow hive-mind status");
}

/**
 * Generate and display optimization report
 */
async function generateReport(dbPath: string) {
	const report = await generateOptimizationReport(dbPath);

	if (!report) {
		console.error("Failed to generate report");
		return;
	}

	console.log("\n📊 Database Optimization Report\n");
	console.log("Schema Version:", report.schemaVersion);
	console.log("Indexes:", report.indexes.length);

	console.log("\nTable Statistics:");
	Object.entries(report.tables).forEach(([name, stats]) => {
		const sizeMB = ((stats as any).sizeBytes / 1024 / 1024).toFixed(2);
		console.log(
			`  ${name}: ${(stats as any).rowCount.toLocaleString()} rows (${sizeMB} MB)`,
		);
	});

	if (report.performance.avgTaskCompletionMinutes > 0) {
		console.log("\nPerformance Metrics:");
		console.log(
			`  Avg Task Completion: ${report.performance.avgTaskCompletionMinutes.toFixed(1)} minutes`,
		);
	}

	// Optimization suggestions
	console.log("\nOptimization Status:");
	if (report.schemaVersion >= 1.5) {
		console.log("  ✓ Database is fully optimized");
	} else {
		console.log(`  ⚠ Can be upgraded from v${report.schemaVersion} to v1.5`);
		console.log("    Run: claude-flow hive-mind-optimize");
	}

	// Check for large tables
	const largeMemoryTable = report.tables.collective_memory?.rowCount > 10000;
	const largeTaskTable = report.tables.tasks?.rowCount > 50000;

	if (largeMemoryTable || largeTaskTable) {
		console.log("\nMaintenance Recommendations:");
		if (largeMemoryTable) {
			console.log("  • Consider cleaning old memory entries");
		}
		if (largeTaskTable) {
			console.log("  • Consider archiving completed tasks");
		}
	}
}

/**
 * Create database backup
 */
async function createBackup(dbPath) {
	try {
		const { execSync } = await import("child_process");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupPath = dbPath.replace(".db", `-backup-${timestamp}.db`);

		execSync(`cp "${dbPath}" "${backupPath}"`);
		console.log(`✓ Backup created: ${path.basename(backupPath)}`);

		return backupPath;
	} catch (error) {
		console.error("⚠ Backup failed:", error.message);
		const { proceed } = await inquirer.prompt([
			{
				type: "confirm",
				name: "proceed",
				message: "Continue without backup?",
				default: false,
			},
		]);

		if (!proceed) {
			process.exit(1);
		}
	}
}

// Export for CLI
export default hiveMindOptimizeCommand;
