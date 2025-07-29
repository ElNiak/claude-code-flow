#!/usr/bin/env node

/**
 * ABOUTME: Unified Claude Flow CLI - Single entry point consolidating all CLI variants
 * ABOUTME: Combines performance optimizations, command registry, and clean TypeScript architecture
 */

import process from "node:process";
import { getErrorMessage } from "../../shared/errors/error-handler.js";
import { debugLogger } from "../../utils/utils-debug-logger.js";
import {
	executeCommand,
	hasCommand,
	listCommands,
	registerCoreCommands,
	showCommandHelp,
} from "./command-registry.js";
import {
	type CommandWithMetadata,
	categorizeCommands,
	printBanner,
	printCommandSection,
	printFooter,
	printUsage,
} from "./help-utils.js";
import { parseFlags } from "./utils.js";

const VERSION = "2.0.0-alpha.50";

/**
 * Unified CLI Class - Consolidates all CLI variants
 */
class ClaudeFlowCLI {
	private initialized = false;

	constructor() {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.constructor",
			arguments,
			"cli-init",
		);
		try {
			this.applyPerformanceOptimizations();
			this.setupErrorHandlers();
			debugLogger.logFunctionExit(
				correlationId,
				"constructor completed",
				"cli-init",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-init");
			throw error;
		}
	}

	/**
	 * Apply performance optimizations from performance-optimized-cli.ts
	 */
	private applyPerformanceOptimizations(): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.applyPerformanceOptimizations",
			arguments,
			"cli-init",
		);
		try {
			// Memory optimization
			if (!process.env.NODE_OPTIONS) {
				process.env.NODE_OPTIONS = "--max-old-space-size=12288 --expose-gc";
			}

			// Enable garbage collection hints if available
			if (
				typeof global !== "undefined" &&
				global.gc &&
				typeof global.gc === "function"
			) {
				setInterval(() => {
					if (process.memoryUsage().heapUsed > 512 * 1024 * 1024) {
						// 512MB threshold
						global.gc!();
					}
				}, 30000);
			}
			debugLogger.logFunctionExit(
				correlationId,
				"performance optimizations applied",
				"cli-init",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-init");
			throw error;
		}
	}

	/**
	 * Setup error handlers from all CLI variants
	 */
	private setupErrorHandlers(): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.setupErrorHandlers",
			arguments,
			"cli-init",
		);
		try {
			process.on("uncaughtException", this.handleError.bind(this));
			process.on("unhandledRejection", this.handleError.bind(this));

			// Graceful shutdown handling
			process.on("SIGINT", this.handleShutdown.bind(this));
			process.on("SIGTERM", this.handleShutdown.bind(this));
			debugLogger.logFunctionExit(
				correlationId,
				"error handlers setup complete",
				"cli-init",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-init");
			throw error;
		}
	}

	/**
	 * Initialize CLI system
	 */
	private async initialize(): Promise<void> {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.initialize",
			arguments,
			"cli-init",
		);
		if (this.initialized) {
			debugLogger.logFunctionExit(
				correlationId,
				"already initialized",
				"cli-init",
			);
			return;
		}

		try {
			// Register core commands from command-registry.js
			registerCoreCommands();

			this.initialized = true;
			debugLogger.logFunctionExit(
				correlationId,
				"CLI initialization complete",
				"cli-init",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-init");
			this.handleError(error);
		}
	}

	/**
	 * Handle errors with comprehensive logging
	 */
	private handleError(error: unknown): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.handleError",
			arguments,
			"cli-util",
		);
		try {
			const errorMessage = getErrorMessage(error);
			console.error("❌ Error:", errorMessage);

			// Enhanced error context for debugging
			if (process.env.DEBUG === "true") {
				console.error("Stack trace:", error);
				console.error("Process info:", {
					version: process.version,
					platform: process.platform,
					arch: process.arch,
					memoryUsage: process.memoryUsage(),
				});
			}

			debugLogger.logFunctionExit(
				correlationId,
				`error handled: ${errorMessage}`,
				"cli-util",
			);
			process.exit(1);
		} catch (handlerError) {
			debugLogger.logFunctionError(
				correlationId,
				String(handlerError),
				"cli-util",
			);
			process.exit(1);
		}
	}

	/**
	 * Handle graceful shutdown
	 */
	private handleShutdown(signal: string): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.handleShutdown",
			[signal],
			"cli-util",
		);
		try {
			console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);

			// Cleanup operations
			if (
				typeof global !== "undefined" &&
				global.gc &&
				typeof global.gc === "function"
			) {
				global.gc!();
			}

			debugLogger.logFunctionExit(
				correlationId,
				`shutdown complete for signal: ${signal}`,
				"cli-util",
			);
			process.exit(0);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-util");
			process.exit(1);
		}
	}

	/**
	 * Main CLI entry point
	 */
	public async run(args: string[] = process.argv.slice(2)): Promise<void> {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.run",
			[args],
			"cli-command",
		);
		try {
			await this.initialize();

			if (args.length === 0) {
				this.printHelp();
				debugLogger.logFunctionExit(
					correlationId,
					"help printed (no args)",
					"cli-command",
				);
				return;
			}

			const [command, ...subArgs] = args;
			const { flags } = parseFlags(subArgs);

			// Handle global flags
			if ((flags as any).version || command === "--version") {
				this.printVersion();
				debugLogger.logFunctionExit(
					correlationId,
					"version printed",
					"cli-command",
				);
				return;
			}

			if ((flags as any).help || command === "--help" || command === "help") {
				if (
					subArgs.length > 0 &&
					!subArgs[0].startsWith("-") &&
					hasCommand(subArgs[0])
				) {
					await showCommandHelp(subArgs[0]);
				} else {
					this.printHelp();
				}
				debugLogger.logFunctionExit(
					correlationId,
					"help printed",
					"cli-command",
				);
				return;
			}

			// Handle help for specific commands
			if (command === "help" && subArgs.length > 0) {
				const helpCommand = subArgs[0];
				if (hasCommand(helpCommand)) {
					await showCommandHelp(helpCommand);
				} else {
					console.error(`❌ Unknown command: ${helpCommand}`);
					this.showAvailableCommands();
					process.exit(1);
				}
				debugLogger.logFunctionExit(
					correlationId,
					`help printed for: ${helpCommand}`,
					"cli-command",
				);
				return;
			}

			// Execute command
			if (hasCommand(command)) {
				await executeCommand(command, subArgs, flags);
				debugLogger.logFunctionExit(
					correlationId,
					`command executed: ${command}`,
					"cli-command",
				);
			} else {
				console.error(`❌ Unknown command: ${command}`);
				console.log("\nDid you mean one of these?");
				this.showSimilarCommands(command);
				this.showAvailableCommands();
				debugLogger.logFunctionExit(
					correlationId,
					`unknown command: ${command}`,
					"cli-command",
				);
				process.exit(1);
			}
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-command");
			this.handleError(error);
		}
	}

	/**
	 * Print comprehensive help information
	 */
	private printHelp(): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.printHelp",
			arguments,
			"cli-util",
		);
		try {
			printBanner(VERSION);
			printUsage();
			this.showCommands();
			printFooter();
			debugLogger.logFunctionExit(
				correlationId,
				"help information printed",
				"cli-util",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-util");
			throw error;
		}
	}

	/**
	 * Print version information
	 */
	private printVersion(): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.printVersion",
			arguments,
			"cli-util",
		);
		try {
			console.log(`Claude-Flow v${VERSION}`);
			console.log(`Node.js ${process.version}`);
			console.log(`Platform: ${process.platform} ${process.arch}`);
			debugLogger.logFunctionExit(
				correlationId,
				"version information printed",
				"cli-util",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-util");
			throw error;
		}
	}

	/**
	 * Show categorized commands
	 */
	private showCommands(): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.showCommands",
			arguments,
			"cli-util",
		);
		try {
			const commands = listCommands();
			const categorized = categorizeCommands(commands);

			// Show commands by category
			printCommandSection("CORE COMMANDS", categorized.core);
			printCommandSection("ADVANCED COMMANDS", categorized.advanced);
			printCommandSection("TOOL COMMANDS", categorized.tools);
			printCommandSection("SPECIALIZED COMMANDS", categorized.specialized);
			debugLogger.logFunctionExit(
				correlationId,
				`categorized commands shown: ${commands.length} total`,
				"cli-util",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-util");
			throw error;
		}
	}

	/**
	 * Show available commands for error messages
	 */
	private showAvailableCommands(): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.showAvailableCommands",
			arguments,
			"cli-util",
		);
		try {
			console.log("\nAvailable commands:");
			const commands = listCommands();
			const commandNames = commands.map((cmd) => cmd.name).sort();

			// Display in columns
			const columns = 4;
			const itemsPerColumn = Math.ceil(commandNames.length / columns);

			for (let i = 0; i < itemsPerColumn; i++) {
				let line = "";
				for (let j = 0; j < columns; j++) {
					const index = j * itemsPerColumn + i;
					if (index < commandNames.length) {
						line += commandNames[index].padEnd(18);
					}
				}
				console.log(`  ${line}`);
			}
			debugLogger.logFunctionExit(
				correlationId,
				`available commands shown: ${commandNames.length} commands`,
				"cli-util",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-util");
			throw error;
		}
	}

	/**
	 * Show similar commands for typos
	 */
	private showSimilarCommands(input: string): void {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.showSimilarCommands",
			[input],
			"cli-util",
		);
		try {
			const commands = listCommands();
			const similar = commands
				.filter((cmd) => {
					// Simple similarity check
					const name = cmd.name.toLowerCase();
					const inputLower = input.toLowerCase();
					return (
						name.includes(inputLower) ||
						inputLower.includes(name) ||
						this.levenshteinDistance(name, inputLower) <= 2
					);
				})
				.slice(0, 3);

			if (similar.length > 0) {
				similar.forEach((cmd) => {
					console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
				});
			}
			debugLogger.logFunctionExit(
				correlationId,
				`similar commands shown: ${similar.length} suggestions for "${input}"`,
				"cli-util",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-util");
			throw error;
		}
	}

	/**
	 * Calculate Levenshtein distance for command suggestions
	 */
	private levenshteinDistance(str1: string, str2: string): number {
		const correlationId = debugLogger.logFunctionEntry(
			"CLI",
			"ClaudeFlowCLI.levenshteinDistance",
			[str1, str2],
			"cli-util",
		);
		try {
			const matrix = [];

			if (str1.length === 0) {
				debugLogger.logFunctionExit(
					correlationId,
					String(str2.length),
					"cli-util",
				);
				return str2.length;
			}
			if (str2.length === 0) {
				debugLogger.logFunctionExit(
					correlationId,
					String(str1.length),
					"cli-util",
				);
				return str1.length;
			}

			// Initialize matrix
			for (let i = 0; i <= str2.length; i++) {
				matrix[i] = [i];
			}

			for (let j = 0; j <= str1.length; j++) {
				matrix[0][j] = j;
			}

			// Fill matrix
			for (let i = 1; i <= str2.length; i++) {
				for (let j = 1; j <= str1.length; j++) {
					if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
						matrix[i][j] = matrix[i - 1][j - 1];
					} else {
						matrix[i][j] = Math.min(
							matrix[i - 1][j - 1] + 1, // substitution
							matrix[i][j - 1] + 1, // insertion
							matrix[i - 1][j] + 1, // deletion
						);
					}
				}
			}

			const distance = matrix[str2.length][str1.length];
			debugLogger.logFunctionExit(correlationId, String(distance), "cli-util");
			return distance;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, String(error), "cli-util");
			throw error;
		}
	}
}

// Main execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const cli = new ClaudeFlowCLI();
	cli.run().catch((error) => {
		console.error("❌ CLI execution failed:", getErrorMessage(error));
		process.exit(1);
	});
}

// Export for testing and programmatic usage
export { ClaudeFlowCLI };
export default ClaudeFlowCLI;
