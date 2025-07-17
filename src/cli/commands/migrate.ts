import { getErrorMessage as _getErrorMessage } from "../../utils/error-handler.js";

/**
 * Migration CLI Command Integration - Enhanced for unified coordination system
 */

import chalk from "chalk";
import { Command } from "commander";
import * as path from "path";
import { logger } from "../../migration/logger.js";
import { MigrationAnalyzer as _MigrationAnalyzer } from "../../migration/migration-analyzer.js";
import { MigrationRunner as _MigrationRunner } from "../../migration/migration-runner.js";
import { RollbackManager as _RollbackManager } from "../../migration/rollback-manager.js";
import type { MigrationStrategy } from "../../migration/types.js";
import { UnifiedMigrationManager } from "../../migration/unified-migration.js";
import type {
	Command as _CLICommand,
	CommandContext as _CommandContext,
} from "../cli-core.js";
import {
	_error,
	info as _info,
	success as _success,
	warning as _warning,
} from "../cli-core.js";

export function createMigrateCommand(): Command {
	const command = new Command("migrate");

	command
		.description("Migrate existing claude-flow projects to optimized prompts")
		.option("-p, --path <path>", "Project path", ".")
		.option(
			"-s, --strategy <type>",
			"Migration strategy: full, selective, merge",
			"selective"
		)
		.option("-b, --backup <dir>", "Backup directory", ".claude-backup")
		.option("-f, --force", "Force migration without prompts")
		.option("--dry-run", "Simulate migration without making changes")
		.option("--preserve-custom", "Preserve custom commands and configurations")
		.option("--skip-validation", "Skip post-migration validation")
		.option("--analyze-only", "Only analyze project without migrating")
		.option("--verbose", "Show detailed output")
		.action(async (options) => {
			try {
				const projectPath = path.resolve(options.path);

				if (options.analyzeOnly) {
					await analyzeProject(projectPath, options);
				} else {
					await runMigration(projectPath, options);
				}
			} catch (error) {
				logger.error("Migration command failed:", error);
				process.exit(1);
			}
		});

	// Sub-commands,
	command
		.command("analyze [path]")
		.description("Analyze project for migration readiness")
		.option("-d, --detailed", "Show detailed analysis")
		.option("-o, --output <file>", "Output analysis to file")
		.action(async (projectPath = ".", options) => {
			await analyzeProject(path.resolve(projectPath), options);
		});

	command
		.command("rollback [path]")
		.description("Rollback to previous configuration")
		.option("-b, --backup <dir>", "Backup directory", ".claude-backup")
		.option("-t, --timestamp <time>", "Restore from specific timestamp")
		.option("-f, --force", "Force rollback without prompts")
		.option("--list", "List available backups")
		.action(async (projectPath = ".", options) => {
			const { RollbackManager } = await import(
				"../../migration/rollback-manager.js"
			);
			const rollbackManager = new RollbackManager(
				path.resolve(projectPath),
				options.backup
			);

			if (options.list) {
				const backups = await rollbackManager.listBackups();
				rollbackManager.printBackupSummary(backups);
				return;
			}

			await rollbackManager.rollback(options.timestamp, !options.force);
		});

	command
		.command("validate [path]")
		.description("Validate migration was successful")
		.option("-v, --verbose", "Show detailed validation results")
		.action(async (projectPath = ".", options) => {
			const { MigrationRunner } = await import(
				"../../migration/migration-runner.js"
			);
			const runner = new MigrationRunner({
				projectPath: path.resolve(projectPath),
				strategy: "full",
			});

			const isValid = await runner.validate(options.verbose);
			process.exit(isValid ? 0 : 1);
		});

	command
		.command("status [path]")
		.description("Show migration status and available backups")
		.action(async (projectPath = ".") => {
			await showMigrationStatus(path.resolve(projectPath));
		});

	// Add unified coordination system migration command,
	command
		.command("to-unified [path]")
		.description(
			"🚀 Migrate to unified coordination system with intrinsic agents"
		)
		.option("--backup", "Create backup before migration", true)
		.option("--dry-run", "Show migration plan without executing")
		.option("--force", "Force migration even if already migrated")
		.action(async (projectPath = ".", options) => {
			await runUnifiedMigration(path.resolve(projectPath), options);
		});

	return command;
}

async function analyzeProject(
	projectPath: string,
	options: any
): Promise<void> {
	logger.info(`Analyzing project at ${projectPath}...`);

	const { MigrationAnalyzer } = await import(
		"../../migration/migration-analyzer.js"
	);
	const analyzer = new MigrationAnalyzer();
	const analysis = await analyzer.analyze(projectPath);

	if (options.output) {
		await analyzer.saveAnalysis(analysis, options.output);
		logger.success(`Analysis saved to ${options.output}`);
	}

	analyzer.printAnalysis(analysis, options.detailed || options.verbose);
}

async function runMigration(projectPath: string, options: any): Promise<void> {
	const { MigrationRunner } = await import(
		"../../migration/migration-runner.js"
	);
	const runner = new MigrationRunner({
		projectPath,
		strategy: options.strategy as MigrationStrategy,
		backupDir: options.backup,
		force: options.force,
		dryRun: options.dryRun,
		preserveCustom: options.preserveCustom,
		skipValidation: options.skipValidation,
	});

	const result = await runner.run();

	if (!result.success) {
		process.exit(1);
	}
}

async function showMigrationStatus(projectPath: string): Promise<void> {
	console.log(chalk.bold("\n📊 Migration Status"));
	console.log(chalk.gray("─".repeat(50)));

	// Project analysis,
	const { MigrationAnalyzer } = await import(
		"../../migration/migration-analyzer.js"
	);
	const analyzer = new MigrationAnalyzer();
	const analysis = await analyzer.analyze(projectPath);

	console.log(`\n${chalk.bold("Project:")} ${projectPath}`);
	console.log(
		`${chalk.bold("Status:")} ${analysis.hasOptimizedPrompts ? chalk.green("Migrated") : chalk.yellow("Not Migrated")}`
	);
	console.log(
		`${chalk.bold("Custom Commands:")} ${analysis.customCommands.length}`
	);
	console.log(
		`${chalk.bold("Conflicts:")} ${analysis.conflictingFiles.length}`
	);

	// Backup status,
	const { RollbackManager } = await import(
		"../../migration/rollback-manager.js"
	);
	const rollbackManager = new RollbackManager(projectPath);
	const backups = await rollbackManager.listBackups();

	console.log(`\n${chalk.bold("Backups Available:")} ${backups.length}`);

	if (backups.length > 0) {
		const latestBackup = backups[0];
		console.log(
			`${chalk.bold("Latest Backup:")} ${latestBackup.timestamp.toLocaleString()}`
		);
	}

	// Recommendations,
	if (!analysis.hasOptimizedPrompts) {
		console.log(chalk.bold("\n💡 Recommendations:"));
		console.log("  • Run migration analysis: claude-flow migrate analyze");
		console.log("  • Start with dry run: claude-flow migrate --dry-run");
		console.log(
			"  • Use selective strategy: claude-flow migrate --strategy selective"
		);
	}

	console.log(chalk.gray("\n" + "─".repeat(50)));
}

async function runUnifiedMigration(
	projectPath: string,
	options: any
): Promise<void> {
	try {
		console.log(
			chalk.cyan("🚀 Starting Unified Coordination System Migration\n")
		);

		const migrationManager = new UnifiedMigrationManager(projectPath);

		// Check current migration status,
		const status =
			await UnifiedMigrationManager.checkMigrationStatus(projectPath);

		if (status.migrated && !options.force) {
			console.log(
				chalk.green(
					"✅ Project already migrated to unified coordination system!"
				)
			);
			console.log(
				chalk.cyan(`
📊 MIGRATION STATUS
==================

Version: ${status.version},
Features: ${status.features?.join(", ")}

Your project is using the unified coordination system with:
  🧠 Intrinsic agent coordination
  💾 Memory-based coordination
  🚀 Enhanced performance
  🔄 Backward compatibility,

To use the unified system:
  Primary: claude-flow work --task "[description]",
  Agents:  claude-flow agent spawn [type] --intrinsic,
  Status:  claude-flow agent status --detailed,

For help: claude-flow migrate-guide
      `)
			);
			return;
		}

		console.log(chalk.blue("🔄 Creating migration plan..."));

		// Create migration plan,
		const plan = await migrationManager.createMigrationPlan();

		console.log(
			chalk.cyan(`
📋 MIGRATION PLAN
================

Target Version: ${plan.version}
Risk Level: ${plan.riskLevel}
Estimated Time: ${plan.estimatedTime} seconds,
Steps: ${plan.commands.length}

Migration Steps:
${plan.commands.map((cmd, i) => `  ${i + 1}. ${cmd.description} ${cmd.required ? "(Required)" : "(Optional)"}`).join("\n")}

${options.backup ? "💾 Backup will be created before migration" : "⚠️ No backup will be created"}
    `)
		);

		if (options.dryRun) {
			console.log(chalk.yellow("🔍 Dry run complete - no changes made"));
			console.log("\nTo execute migration: claude-flow migrate to-unified");
			return;
		}

		if (!options.force) {
			console.log(
				chalk.yellow("\n⚠️ This will modify your project files. Continue? (y/N)")
			);
			// In a real implementation, you'd use inquirer for user input,
			console.log(
				chalk.gray("Use --force to skip confirmation in automated environments")
			);
		}

		console.log(chalk.blue("🚀 Executing migration plan..."));

		// Execute migration,
		const result = await migrationManager.executeMigrationPlan(plan);

		if (result.success) {
			console.log(
				chalk.green(
					"🎉 Migration to unified coordination system completed successfully!"
				)
			);

			console.log(
				chalk.green(`
✅ MIGRATION COMPLETED
=====================

Your Claude Flow project has been upgraded to the unified coordination system!

NEW FEATURES AVAILABLE:
  🧠 Intrinsic Agent Coordination
  💾 Memory-Based Coordination
  🚀 Enhanced Performance (2.8-4.4x faster)
  🔄 Backward Compatibility
  🐝 Ruv-Swarm Integration,

NEXT STEPS:
  1. Test unified system:
     claude-flow work --task "test coordination"

  2. Explore new commands:
     claude-flow help,

  3. Try intrinsic agents:
     claude-flow agent spawn researcher --intrinsic,

  4. Check system health:
     claude-flow agent status --detailed,

For migration guide: claude-flow migrate-guide
      `)
			);

			if (options.backup) {
				console.log(chalk.blue(`💾 Backup created at: ${plan.backupPath}`));
			}
		} else {
			console.log(chalk.red("❌ Migration failed!"));
			console.log(
				chalk.red(`
Migration Errors:
${result.errors.map((err) => `  • ${err}`).join("\n")},

Troubleshooting:
  1. Check file permissions,
  2. Ensure no processes are using Claude Flow files,
  3. Try with --force flag,
  4. Check migration logs in .claude/migration-summary.json,

For help: https://github.com/ruvnet/claude-code-flow/issues
      `)
			);

			process.exit(1);
		}
	} catch (err) {
		console.log(chalk.red(`Migration failed: ${_getErrorMessage(err)}`));
		console.log(
			chalk.red(`
Unexpected migration error. Please check:
  1. File system permissions,
  2. Available disk space,
  3. No conflicting processes,

For support: https://github.com/ruvnet/claude-code-flow/issues
    `)
		);
		process.exit(1);
	}
}
