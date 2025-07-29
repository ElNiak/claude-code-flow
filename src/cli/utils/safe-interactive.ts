/**
 * Safe Interactive Wrapper - Handles interactive commands in non-interactive environments
 */

import chalk from "chalk";
import inquirer from "inquirer";
import {
	getEnvironmentType,
	isInteractive,
	isRawModeSupported,
} from "./interactive-detector.js";

/**
 * Wraps an interactive function with safety checks
 * @param {Function} interactiveFn - The interactive function to wrap
 * @param {Function} fallbackFn - The non-interactive fallback function
 * @param {Object} options - Options for the wrapper
 * @returns {Function} The wrapped function
 */
export function safeInteractive(interactiveFn, fallbackFn, options = {}) {
	return async (...args) => {
		const flags = args[args.length - 1] || {};

		// Check if user explicitly requested non-interactive mode
		if (flags.nonInteractive || flags["no-interactive"]) {
			if (fallbackFn) {
				return fallbackFn(...args);
			} else {
				console.log(
					chalk.yellow(
						"⚠️  Non-interactive mode requested but no fallback available",
					),
				);
				console.log(
					chalk.gray(
						"This command requires interactive mode to function properly",
					),
				);
				process.exit(1);
			}
		}

		// Auto-detect if we should use non-interactive mode
		if (!isInteractive() || !isRawModeSupported()) {
			const envType = getEnvironmentType();

			if (!options.silent) {
				console.log(chalk.yellow("\n⚠️  Interactive mode not available"));
				console.log(chalk.gray(`Detected environment: ${envType}`));

				// Provide specific message based on environment
				if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
					console.log(
						chalk.gray("WSL detected - raw mode may cause process hangs"),
					);
					console.log(
						chalk.cyan(
							"💡 Tip: Use --no-interactive flag or run in native Linux",
						),
					);
				} else if (process.platform === "win32") {
					console.log(
						chalk.gray("Windows detected - terminal compatibility issues"),
					);
					console.log(
						chalk.cyan(
							"💡 Tip: Use Windows Terminal or WSL2 for better experience",
						),
					);
				} else if (process.env.TERM_PROGRAM === "vscode") {
					console.log(
						chalk.gray(
							"VS Code terminal detected - limited interactive support",
						),
					);
					console.log(
						chalk.cyan("💡 Tip: Use external terminal for full functionality"),
					);
				} else if (!isRawModeSupported()) {
					console.log(chalk.gray("Terminal does not support raw mode"));
				}

				console.log();
			}

			if (fallbackFn) {
				return fallbackFn(...args);
			} else {
				console.log(chalk.red("❌ This command requires interactive mode"));
				console.log(
					chalk.gray("Please run in a compatible terminal environment"),
				);
				process.exit(1);
			}
		}

		// Try to run the interactive function
		try {
			return await interactiveFn(...args);
		} catch (error) {
			// Check if it's a raw mode error
			if (
				error.message &&
				(error.message.includes("setRawMode") ||
					error.message.includes("raw mode") ||
					error.message.includes("stdin") ||
					error.message.includes("TTY"))
			) {
				console.log(chalk.yellow("\n⚠️  Interactive mode failed"));
				console.log(chalk.gray(error.message));

				if (fallbackFn) {
					console.log(chalk.cyan("Falling back to non-interactive mode..."));
					return fallbackFn(...args);
				} else {
					console.log(chalk.red("❌ No non-interactive fallback available"));
					process.exit(1);
				}
			}

			// Re-throw other errors
			throw error;
		}
	};
}

/**
 * Create a non-interactive version of a prompt
 * @param {string} message - The prompt message
 * @param {*} defaultValue - The default value to use
 * @returns {*} The default value
 */
export function nonInteractivePrompt(message, defaultValue) {
	console.log(chalk.gray(`📝 ${message}`));
	console.log(chalk.cyan(`   Using default: ${defaultValue}`));
	return defaultValue;
}

/**
 * Create a non-interactive version of a selection
 * @param {string} message - The selection message
 * @param {Array} choices - The available choices
 * @param {*} defaultChoice - The default choice
 * @returns {*} The default choice
 */
export function nonInteractiveSelect(message, choices, defaultChoice) {
	console.log(chalk.gray(`📋 ${message}`));
	console.log(chalk.gray("   Available choices:"));
	choices.forEach((choice) => {
		const isDefault =
			choice === defaultChoice || choice.value === defaultChoice;
		console.log(
			chalk.gray(`   ${isDefault ? "▶" : " "} ${choice.name || choice}`),
		);
	});
	console.log(chalk.cyan(`   Using default: ${defaultChoice}`));
	return defaultChoice;
}

/**
 * Show a non-interactive progress indicator
 * @param {string} message - The progress message
 * @returns {Object} Progress control object
 */
export function nonInteractiveProgress(message) {
	console.log(chalk.gray(`⏳ ${message}...`));

	return {
		update: (newMessage) => {
			console.log(chalk.gray(`   ${newMessage}`));
		},
		succeed: (finalMessage) => {
			console.log(chalk.green(`✅ ${finalMessage || message}`));
		},
		fail: (errorMessage) => {
			console.log(chalk.red(`❌ ${errorMessage || "Failed"}`));
		},
	};
}

/**
 * Safe prompt function with fallback to non-interactive mode
 */
export async function safePrompt(message: string, defaultValue?: any) {
	if (!isInteractive() || !isRawModeSupported()) {
		return nonInteractivePrompt(message, defaultValue);
	}

	try {
		const { answer } = await inquirer.prompt([
			{
				type: "input",
				name: "answer",
				message,
				default: defaultValue,
			},
		]);
		return answer;
	} catch (error) {
		console.log(chalk.yellow("⚠️  Interactive prompt failed, using default"));
		return defaultValue;
	}
}

/**
 * Safe confirm function with fallback to non-interactive mode
 */
export async function safeConfirm(
	message: string,
	defaultValue: boolean = false,
) {
	if (!isInteractive() || !isRawModeSupported()) {
		console.log(chalk.gray(`❓ ${message}`));
		console.log(chalk.cyan(`   Using default: ${defaultValue ? "Yes" : "No"}`));
		return defaultValue;
	}

	try {
		const { confirmed } = await inquirer.prompt([
			{
				type: "confirm",
				name: "confirmed",
				message,
				default: defaultValue,
			},
		]);
		return confirmed;
	} catch (error) {
		console.log(chalk.yellow("⚠️  Interactive confirm failed, using default"));
		return defaultValue;
	}
}

/**
 * Safe input function (alias for safePrompt)
 */
export async function safeInput(message: string, defaultValue?: any) {
	return safePrompt(message, defaultValue);
}

/**
 * Safe select function with fallback to non-interactive mode
 */
export async function safeSelect(
	message: string,
	choices: any[],
	defaultChoice?: any,
) {
	if (!isInteractive() || !isRawModeSupported()) {
		return nonInteractiveSelect(message, choices, defaultChoice || choices[0]);
	}

	try {
		const { selected } = await inquirer.prompt([
			{
				type: "list",
				name: "selected",
				message,
				choices,
				default: defaultChoice,
			},
		]);
		return selected;
	} catch (error) {
		console.log(chalk.yellow("⚠️  Interactive select failed, using default"));
		return defaultChoice || choices[0];
	}
}
