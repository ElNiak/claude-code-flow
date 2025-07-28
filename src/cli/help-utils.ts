/**
 * Simple Help Utilities - Clean methods for dynamic help generation
 */

import type { CommandOption } from "./command-metadata.js";

export interface CommandWithMetadata {
	name: string;
	description: string;
	category?: string;
	helpDescription?: string;
	priority?: string;
	examples?: string[];
	usage?: string;
	details?: string;
	options?: CommandOption[];
	subcommands?: string[];
}

export interface CategorizedCommands {
	core: CommandWithMetadata[];
	advanced: CommandWithMetadata[];
	tools: CommandWithMetadata[];
	specialized: CommandWithMetadata[];
}

/**
 * Print a clean banner
 */
export function printBanner(version: string): void {
	console.log(`🌊 Claude-Flow v${version} - AI Agent Orchestration`);
}

/**
 * Print usage information
 */
export function printUsage(): void {
	console.log("\nUSAGE:\n  claude-flow <command> [options]");
}

/**
 * Print footer with help information
 */
export function printFooter(): void {
	console.log('\nUse "claude-flow help <command>" for detailed information');
}

/**
 * Categorize commands based on their metadata
 */
export function categorizeCommands(
	commands: CommandWithMetadata[],
): CategorizedCommands {
	const categorized: CategorizedCommands = {
		core: [],
		advanced: [],
		tools: [],
		specialized: [],
	};

	commands.forEach((cmd) => {
		switch (cmd.category) {
			case "core":
				categorized.core.push(cmd);
				break;
			case "advanced":
				categorized.advanced.push(cmd);
				break;
			case "tools":
				categorized.tools.push(cmd);
				break;
			case "specialized":
				categorized.specialized.push(cmd);
				break;
			default:
				// Default categorization based on command name/description
				if (issCoreCommand(cmd.name)) {
					categorized.core.push(cmd);
				} else if (isAdvancedCommand(cmd.name)) {
					categorized.advanced.push(cmd);
				} else if (isToolCommand(cmd.name)) {
					categorized.tools.push(cmd);
				} else {
					categorized.specialized.push(cmd);
				}
		}
	});

	// Sort each category alphabetically
	Object.keys(categorized).forEach((key) => {
		categorized[key as keyof CategorizedCommands].sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	});

	return categorized;
}

/**
 * Print a section of commands
 */
export function printCommandSection(
	title: string,
	commands: CommandWithMetadata[],
): void {
	if (commands.length === 0) return;

	console.log(`\n${title}:`);
	commands.forEach((cmd) => {
		const description = cmd.helpDescription || cmd.description;
		console.log(`  ${cmd.name.padEnd(15)} ${description}`);
	});
}

/**
 * Simple core command detection
 */
function issCoreCommand(name: string): boolean {
	const coreCommands = ["init", "start", "status", "config", "help"];
	return coreCommands.includes(name);
}

/**
 * Simple advanced command detection
 */
function isAdvancedCommand(name: string): boolean {
	const advancedCommands = [
		"hive-mind",
		"hive",
		"swarm",
		"agent",
		"hooks",
		"coordination",
		"automation",
	];
	return advancedCommands.includes(name);
}

/**
 * Simple tool command detection
 */
function isToolCommand(name: string): boolean {
	const toolCommands = [
		"memory",
		"github",
		"analysis",
		"monitor",
		"training",
		"batch",
	];
	return toolCommands.includes(name);
}

/**
 * Generate dynamic usage string from command metadata
 */
export function generateUsage(
	commandName: string,
	command: CommandWithMetadata,
): string {
	let usage = `claude-flow ${commandName}`;

	// Add subcommands if they exist
	if (command.subcommands && command.subcommands.length > 0) {
		usage += ` <${command.subcommands.join("|")}>`;
	}

	// Add options if they exist
	if (command.options && command.options.length > 0) {
		const requiredOptions = command.options.filter((opt) => opt.required);
		const optionalOptions = command.options.filter((opt) => !opt.required);

		// Add required options
		requiredOptions.forEach((opt) => {
			if (opt.type === "boolean") {
				usage += ` --${opt.name}`;
			} else {
				usage += ` --${opt.name} <${opt.type || "value"}>`;
			}
		});

		// Add optional options
		if (optionalOptions.length > 0) {
			usage += " [options]";
		}
	} else {
		// Default fallback for commands without explicit options
		usage += " [options]";
	}

	return usage;
}

/**
 * Load command metadata dynamically
 */
export async function loadCommandMetadata(
	commandName: string,
	commandData: any,
): Promise<CommandWithMetadata | null> {
	try {
		// Try to load metadata if available
		if (
			commandData.loadMetadata &&
			typeof commandData.loadMetadata === "function"
		) {
			const metadata = await commandData.loadMetadata();
			return {
				name: commandName,
				description: commandData.description,
				...metadata,
			};
		}
	} catch (error) {
		console.warn(
			`Failed to load metadata for ${commandName}:`,
			(error as Error).message,
		);
	}

	// Fallback to existing command data
	return {
		name: commandName,
		description: commandData.description,
		category: commandData.category,
		helpDescription: commandData.helpDescription,
		priority: commandData.priority,
		usage: commandData.usage,
		examples: commandData.examples,
		details: commandData.details,
		options: commandData.options,
	};
}

/**
 * Extract option descriptions from command handler comments/docstrings
 */
function extractOptionDescriptionsFromSource(
	handlerSource: string,
): Record<string, string> {
	const descriptions: Record<string, string> = {};

	// Look for JSDoc-style option descriptions
	const jsdocPattern = /@option\s+--(\w+)\s+(.+)/g;
	let match;
	while ((match = jsdocPattern.exec(handlerSource)) !== null) {
		descriptions[match[1]] = match[2].trim();
	}

	// Look for inline comments describing flags
	const commentPattern = /--(\w+)[\s\S]*?\/\/\s*(.+)/g;
	while ((match = commentPattern.exec(handlerSource)) !== null) {
		if (!descriptions[match[1]]) {
			descriptions[match[1]] = match[2].trim();
		}
	}

	return descriptions;
}

/**
 * Generate option description - fallback only if not found in source
 */
function generateOptionDescription(
	flagName: string,
	handlerSource?: string,
): string {
	// First try to extract from source
	if (handlerSource) {
		const sourceDescriptions =
			extractOptionDescriptionsFromSource(handlerSource);
		if (sourceDescriptions[flagName]) {
			return sourceDescriptions[flagName];
		}
	}

	// Minimal fallback - just format the flag name nicely
	return flagName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Generate dynamic usage string from command metadata with auto-discovery
 */
export function generateDynamicUsage(
	commandName: string,
	command: CommandWithMetadata,
	handler?: Function,
): string {
	let usage = `claude-flow ${commandName}`;

	// Use options from command metadata
	const options = command.options || [];

	// Add subcommands if they exist
	if (command.subcommands && command.subcommands.length > 0) {
		usage += ` <${command.subcommands.join("|")}>`;
	}

	// Add options
	const requiredOptions = options.filter((opt) => opt.required);
	const optionalOptions = options.filter((opt) => !opt.required);

	// Add required options
	requiredOptions.forEach((opt) => {
		if (opt.type === "boolean") {
			usage += ` --${opt.name}`;
		} else {
			usage += ` --${opt.name} <${opt.type || "value"}>`;
		}
	});

	// Add optional options indicator
	if (optionalOptions.length > 0) {
		usage += " [options]";
	}

	return usage;
}

/**
 * Generate options help text
 */
export function generateOptionsHelp(options: CommandOption[]): string {
	if (!options || options.length === 0) return "";

	let help = "\nOptions:\n";
	options.forEach((opt) => {
		const shortFlag = opt.short ? `-${opt.short}, ` : "";
		const longFlag = `--${opt.name}`;
		const typeInfo = opt.type && opt.type !== "boolean" ? ` <${opt.type}>` : "";
		const required = opt.required ? " (required)" : "";
		const defaultValue = opt.default ? ` (default: ${opt.default})` : "";

		help += `  ${shortFlag}${longFlag}${typeInfo}${required}${defaultValue}\n`;
		help += `      ${opt.description}\n`;
	});

	return help;
}
