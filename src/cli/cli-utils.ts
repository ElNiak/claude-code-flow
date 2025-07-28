/**
 * ABOUTME: CLI utility functions for logging and error handling in commands
 * ABOUTME: Provides common CLI functions that were previously in optimized-cli-core.js
 */

import chalk from "chalk";

/**
 * Log an info message to console
 */
export function info(message: string, ...args: any[]): void {
	console.log(chalk.blue("ℹ"), message, ...args);
}

/**
 * Log a success message to console
 */
export function success(message: string, ...args: any[]): void {
	console.log(chalk.green("✅"), message, ...args);
}

/**
 * Log a warning message to console
 */
export function warning(message: string, ...args: any[]): void {
	console.log(chalk.yellow("⚠️"), message, ...args);
}

/**
 * Log an error message to console
 */
export function _error(message: string, ...args: any[]): void {
	console.error(chalk.red("❌"), message, ...args);
}

/**
 * Version constant
 */
export const VERSION = "2.0.0-alpha.50";
