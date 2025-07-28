/**
 * Unified Command Metadata System
 * Single source of truth for command options, help, and implementation
 */

export interface CommandOption {
	name: string;
	short?: string;
	type: "boolean" | "string" | "number";
	description: string;
	required?: boolean;
	default?: any;
	choices?: string[];
}

export interface CommandMetadata {
	category: "core" | "advanced" | "tools" | "specialized";
	helpDescription: string;
	priority: "high" | "medium" | "low";
	subcommands?: string[];
	options?: CommandOption[];
	examples?: string[];
	details?: string;
}

export interface ParsedCommandArgs {
	subcommand?: string;
	options: Record<string, any>;
	remainingArgs: string[];
	help: boolean;
}

/**
 * Parse command arguments using metadata
 */
export function parseCommandArgs(
	args: string[],
	flags: Record<string, any>,
	metadata: CommandMetadata,
): ParsedCommandArgs {
	// Check for help first
	const help =
		flags.help || flags.h || args.includes("--help") || args.includes("-h");

	// Extract subcommand
	let subcommand: string | undefined;
	let remainingArgs = [...args];

	if (metadata.subcommands && args.length > 0) {
		const firstArg = args[0];
		if (metadata.subcommands.includes(firstArg)) {
			subcommand = firstArg;
			remainingArgs = args.slice(1);
		}
	}

	// Parse options using metadata
	const options: Record<string, any> = {};

	if (metadata.options) {
		for (const option of metadata.options) {
			// Get value from flags first (parsed by flag parser)
			let value = flags[option.name];

			// Fallback to short flag
			if (value === undefined && option.short) {
				value = flags[option.short];
			}

			// Fallback to checking raw args for backward compatibility
			if (value === undefined) {
				const longFlag = `--${option.name}`;
				const shortFlag = option.short ? `-${option.short}` : null;

				if (
					args.includes(longFlag) ||
					(shortFlag && args.includes(shortFlag))
				) {
					if (option.type === "boolean") {
						value = true;
					} else {
						// Find the value after the flag
						const flagIndex = args.findIndex(
							(arg) => arg === longFlag || arg === shortFlag,
						);
						if (
							flagIndex !== -1 &&
							args[flagIndex + 1] &&
							!args[flagIndex + 1].startsWith("-")
						) {
							value = args[flagIndex + 1];
							if (option.type === "number") {
								value = Number(value);
							}
						}
					}
				}
			}

			// Apply default if no value found
			if (value === undefined && option.default !== undefined) {
				value = option.default;
			}

			// Store the final value
			if (value !== undefined) {
				options[option.name] = value;
			}
		}
	}

	return {
		subcommand,
		options,
		remainingArgs,
		help,
	};
}

/**
 * Validate parsed options against metadata
 */
export function validateCommandArgs(
	parsed: ParsedCommandArgs,
	metadata: CommandMetadata,
): string[] {
	const errors: string[] = [];

	if (!metadata.options) return errors;

	for (const option of metadata.options) {
		const value = parsed.options[option.name];

		// Check required options
		if (option.required && (value === undefined || value === null)) {
			errors.push(`Required option --${option.name} is missing`);
			continue;
		}

		// Type validation
		if (value !== undefined) {
			if (option.type === "number" && isNaN(Number(value))) {
				errors.push(`Option --${option.name} must be a number`);
			}

			// Choices validation
			if (option.choices && !option.choices.includes(String(value))) {
				errors.push(
					`Option --${option.name} must be one of: ${option.choices.join(", ")}`,
				);
			}
		}
	}

	// Validate subcommand
	if (
		parsed.subcommand &&
		metadata.subcommands &&
		!metadata.subcommands.includes(parsed.subcommand)
	) {
		errors.push(
			`Unknown subcommand: ${parsed.subcommand}. Available: ${metadata.subcommands.join(", ")}`,
		);
	}

	return errors;
}

/**
 * Generate usage string from metadata
 */
export function generateUsageFromMetadata(
	commandName: string,
	metadata: CommandMetadata,
): string {
	let usage = `claude-flow ${commandName}`;

	// Add subcommands
	if (metadata.subcommands && metadata.subcommands.length > 0) {
		usage += ` <${metadata.subcommands.join("|")}>`;
	}

	// Add required options
	const requiredOptions = metadata.options?.filter((opt) => opt.required) || [];
	for (const opt of requiredOptions) {
		if (opt.type === "boolean") {
			usage += ` --${opt.name}`;
		} else {
			usage += ` --${opt.name} <${opt.type}>`;
		}
	}

	// Add optional options indicator
	const optionalOptions =
		metadata.options?.filter((opt) => !opt.required) || [];
	if (optionalOptions.length > 0) {
		usage += " [options]";
	}

	return usage;
}

/**
 * Generate options help text from metadata
 */
export function generateOptionsHelp(metadata: CommandMetadata): string {
	if (!metadata.options || metadata.options.length === 0) {
		return "";
	}

	let help = "\nOptions:\n";

	for (const option of metadata.options) {
		const short = option.short ? `-${option.short}, ` : "    ";
		const long = `--${option.name}`;
		const type = option.type !== "boolean" ? ` <${option.type}>` : "";
		const required = option.required ? " (required)" : "";
		const defaultValue =
			option.default !== undefined ? ` (default: ${option.default})` : "";
		const choices = option.choices ? ` [${option.choices.join("|")}]` : "";

		help += `  ${short}${long}${type}${choices}${required}${defaultValue}\n`;
		help += `      ${option.description}\n`;
	}

	return help;
}

/**
 * Generate command help from metadata
 */
export function generateCommandHelp(
	commandName: string,
	metadata: CommandMetadata,
): string {
	let help = `Command: ${commandName}\n`;
	help += `Description: ${metadata.helpDescription}\n`;
	help += `Usage: ${generateUsageFromMetadata(commandName, metadata)}\n`;

	if (metadata.details) {
		help += `\n${metadata.details}\n`;
	}

	help += generateOptionsHelp(metadata);

	if (metadata.examples && metadata.examples.length > 0) {
		help += "\nExamples:\n";
		for (const example of metadata.examples) {
			help += `  ${example}\n`;
		}
	}

	return help;
}
