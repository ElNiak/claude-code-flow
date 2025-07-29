/**
 * ABOUTME: Centralized error handling utilities for Claude Flow CLI
 * ABOUTME: Provides consistent error formatting, logging, and graceful degradation
 */

import chalk from "chalk";
import process from "process";

/**
 * Enhanced error class with additional context
 */
export class ClaudeFlowError extends Error {
	constructor(message, code = "UNKNOWN_ERROR", context = {}) {
		super(message);
		this.name = "ClaudeFlowError";
		this.code = code;
		this.context = context;
		this.timestamp = new Date().toISOString();
	}
}

/**
 * Error handler configuration
 */
const config = {
	verbose: process.env.DEBUG === "true" || process.env.VERBOSE === "true",
	exitOnError: true,
	logFile: null,
};

/**
 * Configure error handler behavior
 */
export function configureErrorHandler(options = {}) {
	Object.assign(config, options);
}

/**
 * Get standardized error message from unknown error types
 */
export function getErrorMessage(error) {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	if (error && typeof error === "object" && error.message) {
		return String(error.message);
	}
	return "Unknown error occurred";
}

/**
 * Format error for display with consistent styling
 */
export function formatError(error, context = "") {
	const message = getErrorMessage(error);
	const timestamp = new Date().toISOString();

	let formatted = chalk.red("❌ Error");
	if (context) {
		formatted += chalk.gray(` [${context}]`);
	}
	formatted += chalk.red(`: ${message}`);

	if (config.verbose && error instanceof Error && error.stack) {
		formatted += "\n" + chalk.gray(error.stack);
	}

	return formatted;
}

/**
 * Handle error with consistent logging and optional exit
 */
export function handleError(error, context = "", shouldExit = null) {
	const shouldActuallyExit =
		shouldExit !== null ? shouldExit : config.exitOnError;

	console.error(formatError(error, context));

	if (config.logFile) {
		try {
			const fs = require("fs");
			const logEntry = `[${new Date().toISOString()}] ERROR [${context}]: ${getErrorMessage(error)}\n`;
			fs.appendFileSync(config.logFile, logEntry);
		} catch (logError) {
			console.warn(
				chalk.yellow("⚠️  Failed to write to log file:"),
				logError.message,
			);
		}
	}

	if (shouldActuallyExit) {
		process.exit(1);
	}
}

/**
 * Wrapper for async operations with error handling
 */
export async function safeAsync(operation, context = "", fallback = null) {
	try {
		return await operation();
	} catch (error) {
		handleError(error, context, false);
		return fallback;
	}
}

/**
 * Wrapper for sync operations with error handling
 */
export function safeSync(operation, context = "", fallback = null) {
	try {
		return operation();
	} catch (error) {
		handleError(error, context, false);
		return fallback;
	}
}

/**
 * Validate required parameters and throw descriptive errors
 */
export function validateRequired(params, requiredFields) {
	const missing = [];

	for (const field of requiredFields) {
		if (params[field] === undefined || params[field] === null) {
			missing.push(field);
		}
	}

	if (missing.length > 0) {
		throw new ClaudeFlowError(
			`Missing required parameters: ${missing.join(", ")}`,
			"MISSING_PARAMS",
			{ missing, provided: Object.keys(params) },
		);
	}
}

/**
 * Warning handler for non-fatal issues
 */
export function handleWarning(message, context = "") {
	const formatted = chalk.yellow("⚠️  Warning");
	if (context) {
		formatted += chalk.gray(` [${context}]`);
	}
	console.warn(formatted + chalk.yellow(`: ${message}`));
}

/**
 * Success message handler
 */
export function handleSuccess(message, context = "") {
	let formatted = chalk.green("✅ Success");
	if (context) {
		formatted += chalk.gray(` [${context}]`);
	}
	console.log(formatted + chalk.green(`: ${message}`));
}

/**
 * Progress message handler
 */
export function handleProgress(message, context = "") {
	let formatted = chalk.blue("🔄 Progress");
	if (context) {
		formatted += chalk.gray(` [${context}]`);
	}
	console.log(formatted + chalk.blue(`: ${message}`));
}

/**
 * Debug message handler (only shown in verbose mode)
 */
export function handleDebug(message, context = "") {
	if (!config.verbose) return;

	let formatted = chalk.gray("🔍 Debug");
	if (context) {
		formatted += chalk.gray(` [${context}]`);
	}
	console.log(formatted + chalk.gray(`: ${message}`));
}

// Default export for backward compatibility
export default {
	ClaudeFlowError,
	configureErrorHandler,
	getErrorMessage,
	formatError,
	handleError,
	safeAsync,
	safeSync,
	validateRequired,
	handleWarning,
	handleSuccess,
	handleProgress,
	handleDebug,
};
