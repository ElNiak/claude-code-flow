/**
 * Graceful Exit Handler - Improved exit process based on Hive Mind patterns
 * Provides proper cleanup, signal handling, and resource management
 */

import chalk from "chalk";
import type { Logger } from "../core/logger.js";

// Exit codes for structured error handling
export enum ExitCode {
	SUCCESS = 0,
	GENERAL_ERROR = 1,
	INVALID_ARGS = 2,
	RESOURCE_ERROR = 3,
	TIMEOUT_ERROR = 4,
	CONSENSUS_FAILED = 5,
	NETWORK_ERROR = 6,
	CONFIGURATION_ERROR = 7,
}

// Resource cleanup interface
export interface CleanupResource {
	name: string;
	cleanup: () => Promise<void>;
}

// Global registry for cleanup resources
const cleanupResources: CleanupResource[] = [];
let isShuttingDown = false;
let logger: Logger | null = null;

/**
 * Register a resource for cleanup during shutdown
 */
export function registerCleanupResource(resource: CleanupResource): void {
	cleanupResources.push(resource);
}

/**
 * Unregister a cleanup resource
 */
export function unregisterCleanupResource(name: string): void {
	const index = cleanupResources.findIndex((r) => r.name === name);
	if (index !== -1) {
		cleanupResources.splice(index, 1);
	}
}

/**
 * Set the logger for exit messages
 */
export function setExitLogger(loggerInstance: Logger): void {
	logger = loggerInstance;
}

/**
 * Graceful shutdown function with proper cleanup
 */
export async function gracefulShutdown(
	exitCode: ExitCode = ExitCode.SUCCESS,
	reason?: string
): Promise<void> {
	// Prevent multiple shutdown attempts
	if (isShuttingDown) {
		return;
	}
	isShuttingDown = true;

	try {
		// Log shutdown initiation
		const message = reason
			? `Graceful shutdown initiated: ${reason}`
			: "Graceful shutdown initiated";

		if (logger) {
			logger.info(chalk.yellow(`⚠️  ${message}`));
		} else {
			console.log(chalk.yellow(`⚠️  ${message}`));
		}

		// Cleanup resources in reverse order (LIFO)
		for (let i = cleanupResources.length - 1; i >= 0; i--) {
			const resource = cleanupResources[i];
			try {
				if (logger) {
					logger.info(chalk.gray(`🧹 Cleaning up: ${resource.name}`));
				} else {
					console.log(chalk.gray(`🧹 Cleaning up: ${resource.name}`));
				}

				await resource.cleanup();

				if (logger) {
					logger.info(chalk.green(`✅ ${resource.name} cleaned up`));
				} else {
					console.log(chalk.green(`✅ ${resource.name} cleaned up`));
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				if (logger) {
					logger.error(
						chalk.red(`❌ Failed to cleanup ${resource.name}: ${errorMessage}`)
					);
				} else {
					console.error(
						chalk.red(`❌ Failed to cleanup ${resource.name}: ${errorMessage}`)
					);
				}
			}
		}

		// Final success message
		const successMessage =
			exitCode === ExitCode.SUCCESS
				? "🛑 Shutdown completed successfully"
				: `🛑 Shutdown completed with exit code ${exitCode}`;

		if (logger) {
			logger.info(chalk.green(successMessage));
		} else {
			console.log(chalk.green(successMessage));
		}

		// Exit with appropriate code
		process.exit(exitCode);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(chalk.red(`💥 Shutdown error: ${errorMessage}`));
		process.exit(ExitCode.GENERAL_ERROR);
	}
}

/**
 * Enhanced error handler with cleanup
 */
export async function handleError(
	error: Error | string,
	context?: string,
	debug?: boolean
): Promise<void> {
	const errorMessage = error instanceof Error ? error.message : String(error);
	const fullContext = context ? `${context}: ${errorMessage}` : errorMessage;

	if (logger) {
		logger.error(chalk.red.bold("❌ Error occurred:"));
		logger.error(chalk.red(fullContext));
	} else {
		console.error(chalk.red.bold("❌ Error occurred:"));
		console.error(chalk.red(fullContext));
	}

	// Show stack trace in debug mode
	if (debug && error instanceof Error) {
		console.error(chalk.gray("Stack trace:"));
		console.error(error.stack);
	}

	// Determine appropriate exit code
	let exitCode = ExitCode.GENERAL_ERROR;
	if (errorMessage.includes("timeout")) {
		exitCode = ExitCode.TIMEOUT_ERROR;
	} else if (errorMessage.includes("consensus")) {
		exitCode = ExitCode.CONSENSUS_FAILED;
	} else if (errorMessage.includes("resource")) {
		exitCode = ExitCode.RESOURCE_ERROR;
	} else if (errorMessage.includes("network")) {
		exitCode = ExitCode.NETWORK_ERROR;
	} else if (errorMessage.includes("config")) {
		exitCode = ExitCode.CONFIGURATION_ERROR;
	}

	// Cleanup and exit
	await gracefulShutdown(exitCode, fullContext);
}

/**
 * Setup signal handlers for graceful shutdown
 */
export function setupSignalHandlers(): void {
	// SIGINT (Ctrl+C)
	process.on("SIGINT", async () => {
		console.log(chalk.yellow("\n⚠️  Interrupted by user (SIGINT)..."));
		await gracefulShutdown(ExitCode.SUCCESS, "User interrupt");
	});

	// SIGTERM (Termination signal)
	process.on("SIGTERM", async () => {
		console.log(chalk.yellow("\n⚠️  Termination signal received (SIGTERM)..."));
		await gracefulShutdown(ExitCode.SUCCESS, "System termination");
	});

	// SIGHUP (Terminal closed)
	process.on("SIGHUP", async () => {
		console.log(chalk.yellow("\n⚠️  Terminal closed (SIGHUP)..."));
		await gracefulShutdown(ExitCode.SUCCESS, "Terminal closed");
	});

	// Uncaught exceptions
	process.on("uncaughtException", async (error) => {
		console.error(chalk.red.bold("💥 Uncaught Exception:"));
		console.error(error);
		await gracefulShutdown(ExitCode.GENERAL_ERROR, "Uncaught exception");
	});

	// Unhandled promise rejections
	process.on("unhandledRejection", async (reason, promise) => {
		console.error(chalk.red.bold("💥 Unhandled Promise Rejection:"));
		console.error("Promise:", promise);
		console.error("Reason:", reason);
		await gracefulShutdown(
			ExitCode.GENERAL_ERROR,
			"Unhandled promise rejection"
		);
	});
}

/**
 * Timeout handler for long-running operations
 */
export function createTimeoutHandler(
	timeoutMs: number,
	operation: string
): NodeJS.Timeout {
	return setTimeout(async () => {
		await handleError(`Operation timed out after ${timeoutMs}ms`, operation);
	}, timeoutMs);
}

/**
 * Safe async wrapper with automatic error handling
 */
export async function safeAsyncWrapper<T>(
	operation: () => Promise<T>,
	context: string,
	debug: boolean = false
): Promise<T | null> {
	try {
		return await operation();
	} catch (error) {
		await handleError(error as Error, context, debug);
		return null;
	}
}

/**
 * Enhanced process.exit replacement with validation
 */
export function safeExit(
	code: ExitCode = ExitCode.SUCCESS,
	reason?: string
): void {
	// Validate exit code
	if (!Object.values(ExitCode).includes(code)) {
		console.warn(
			chalk.yellow(`⚠️  Invalid exit code ${code}, using GENERAL_ERROR`)
		);
		code = ExitCode.GENERAL_ERROR;
	}

	// Use graceful shutdown
	gracefulShutdown(code, reason);
}

// Export commonly used patterns
export const exitPatterns = {
	/**
	 * Standard success exit
	 */
	success: (reason?: string) => safeExit(ExitCode.SUCCESS, reason),

	/**
	 * Standard error exit
	 */
	error: (reason?: string) => safeExit(ExitCode.GENERAL_ERROR, reason),

	/**
	 * Invalid arguments exit
	 */
	invalidArgs: (reason?: string) => safeExit(ExitCode.INVALID_ARGS, reason),

	/**
	 * Resource error exit
	 */
	resourceError: (reason?: string) => safeExit(ExitCode.RESOURCE_ERROR, reason),

	/**
	 * Timeout error exit
	 */
	timeout: (reason?: string) => safeExit(ExitCode.TIMEOUT_ERROR, reason),
};
