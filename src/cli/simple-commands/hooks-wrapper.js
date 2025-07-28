// hooks.js - Hooks command wrapper for metadata-driven implementation

import {
	generateCommandHelp,
	parseCommandArgs,
	validateCommandArgs,
} from "../command-metadata.js";
import { printError, printSuccess, printWarning } from "../utils.js";

// Export metadata for command registry
export { hooksCommandMetadata } from "./hooks-metadata.js";

/**
 * Main hooks command function with metadata-driven enhancements
 */
export async function hooksCommand(subArgs, flags) {
	// Parse arguments using metadata
	console.debug(
		`[HOOKS WRAPPER COMMAND] Parsing arguments: ${JSON.stringify(subArgs)}, flags: ${JSON.stringify(flags)}`,
	);
	const parsed = parseCommandArgs(
		subArgs,
		flags,
		(await import("./hooks-metadata.js")).hooksCommandMetadata,
	);

	// Show help if requested
	if (parsed.help) {
		console.log(
			generateCommandHelp(
				"hooks",
				(await import("./hooks-metadata.js")).hooksCommandMetadata,
			),
		);
		return;
	}

	// Validate arguments
	const errors = validateCommandArgs(
		parsed,
		(await import("./hooks-metadata.js")).hooksCommandMetadata,
	);
	if (errors.length > 0) {
		printError("Invalid arguments:");
		errors.forEach((error) => console.error(`  • ${error}`));
		console.log("\nUse --help for usage information");
		return;
	}

	// Check if using advanced metadata features
	const hasAdvancedOptions = Object.keys(parsed.options).some((key) =>
		["telemetry", "cache-results", "load-memory", "export-metrics"].includes(
			key,
		),
	);

	const isAdvancedSubcommand = [
		"workflow-transition",
		"performance-checkpoint",
		"security-audit",
	].includes(parsed.subcommand);

	// Route to metadata-driven implementation for advanced features
	if (hasAdvancedOptions || isAdvancedSubcommand || !parsed.subcommand) {
		const { hooksCommandMetadataDriven } = await import("./hooks-metadata.js");
		return await hooksCommandMetadataDriven(subArgs, flags);
	}

	// Route to original TypeScript implementation for standard hooks
	const { hooksCommand } = await import("./hooks.js");
	return await hooksCommand(subArgs);
}

// Export the main function as hooksAction for backward compatibility
export const hooksAction = hooksCommand;
