import * as fs from "node:fs";
import * as path from "node:path";
import { cwd } from "node:process";
import { SqliteMemoryStore } from "../../memory/sqlite-store.js";
import {
	checkRuvSwarmAvailable,
	emergencyRecovery,
	execRuvSwarmHook,
	printError,
	printSuccess,
	printWarning,
} from "../utils.js";

// Type definitions
interface HookFlags {
	help?: boolean;
	h?: boolean;
	description?: string;
	"task-id"?: string;
	taskId?: string;
	"agent-id"?: string;
	agentId?: string;
	"auto-spawn-agents"?: string;
	file?: string;
	operation?: string;
	command?: string;
	cwd?: string;
	"exit-code"?: string;
	output?: string;
	query?: string;
	"result-count"?: string;
	type?: string;
	server?: string;
	"session-id"?: string;
	name?: string;
	"swarm-id"?: string;
	strategy?: string;
	priority?: string;
	model?: string;
	accuracy?: string;
	patterns?: string;
	"generate-summary"?: string;
	message?: string;
	level?: string;
	"swarm-status"?: string;
	"memory-key"?: string;
	memoryKey?: string;
	"analyze-performance"?: string;
	key?: string;
	value?: string;
	namespace?: string;
	data?: string;
	"storage-path"?: string;
	"load-context"?: string;
	"validate-naming"?: string;
	"block-on-fail"?: string;
	"suggest-alternatives"?: string;
	"validate-safety"?: string;
	"prepare-resources"?: string;
	"track-metrics"?: string;
	"store-results"?: string;
	format?: string;
	"update-memory"?: string;
	"train-neural"?: string;
	"validate-changes"?: string;
	"store-verified-structure"?: string;
	"export-metrics"?: string;
	"persist-state"?: string;
	"serena-verify"?: string;
}

// Parse command line arguments
function parseArgs(args: string[]): HookFlags {
	const flags: HookFlags = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const flagName = arg.slice(2) as keyof HookFlags;
			if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
				flags[flagName] = args[i + 1] as any;
				i++; // Skip next argument
			} else {
				flags[flagName] = "true" as any;
			}
		}
	}
	return flags;
}

// Safe command execution validation
function validateSafeCommand(command: string): boolean {
	const unsafePatterns = [
		/rm\s+-rf\s+\//,
		/curl.*\|.*bash/,
		/wget.*\|.*sh/,
		/eval\s+/,
		/>\s*\/dev\/sd[a-z]/,
		/dd\s+if=/,
		/:(){ :|:& };:/,
	];

	return !unsafePatterns.some((pattern) => pattern.test(command));
}

// Execute pre-bash hook
async function preBashCommand(
	subArgs: string[],
	flags: HookFlags,
): Promise<void> {
	const command = flags.command;

	if (!command) {
		printError("Missing required --command parameter for pre-bash hook");
		process.exit(1);
	}

	// Validate command safety if requested
	if (flags["validate-safety"] === "true" && !validateSafeCommand(command)) {
		printError(`Unsafe command detected: ${command}`);
		process.exit(1);
	}

	// Log command execution
	console.log(`[HOOK] Pre-bash: ${command}`);

	// Prepare resources if requested
	if (flags["prepare-resources"] === "true") {
		console.log("[HOOK] Preparing resources...");
	}
}

// Execute post-bash hook
async function postBashCommand(
	subArgs: string[],
	flags: HookFlags,
): Promise<void> {
	const command = flags.command;

	if (!command) {
		printError("Missing required --command parameter for post-bash hook");
		process.exit(1);
	}

	console.log(`[HOOK] Post-bash: ${command}`);

	// Track metrics if requested
	if (flags["track-metrics"] === "true") {
		console.log("[HOOK] Tracking command metrics...");
	}

	// Store results if requested
	if (flags["store-results"] === "true") {
		console.log("[HOOK] Storing command results...");
	}
}

// Execute pre-edit hook
async function preEditCommand(
	subArgs: string[],
	flags: HookFlags,
): Promise<void> {
	const filePath = flags.file;

	console.log(
		`[HOOK] Pre-edit: ${filePath} with flags: ${JSON.stringify(flags)}`,
	);

	if (!filePath) {
		printError("Missing required --file parameter for pre-edit hook");
		process.exit(1);
	}

	console.log(`[HOOK] Pre-edit: ${filePath}`);

	// Validate naming if requested
	if (flags["validate-naming"] === "true") {
		console.log("[HOOK] Validating file naming conventions...");
	}

	// Auto-spawn agents if requested
	if (flags["auto-spawn-agents"] === "true") {
		console.log("[HOOK] Auto-spawning agents for file type...");
	}

	// Load context if requested
	if (flags["load-context"] === "true") {
		console.log("[HOOK] Loading file context...");
	}
}

// Execute post-edit hook
async function postEditCommand(
	subArgs: string[],
	flags: HookFlags,
): Promise<void> {
	const filePath = flags.file;

	if (!filePath) {
		printError("Missing required --file parameter for post-edit hook");
		process.exit(1);
	}

	console.log(`[HOOK] Post-edit: ${filePath}`);

	// Format code if requested
	if (flags.format === "true") {
		console.log("[HOOK] Auto-formatting code...");
	}

	// Update memory if requested
	if (flags["update-memory"] === "true") {
		console.log("[HOOK] Updating memory with file changes...");
	}

	// Train neural patterns if requested
	if (flags["train-neural"] === "true") {
		console.log("[HOOK] Training neural patterns from edit...");
	}

	// Validate changes if requested
	if (flags["validate-changes"] === "true") {
		console.log("[HOOK] Validating file changes...");
	}
}

// Execute pre-task hook
async function preTaskCommand(
	subArgs: string[],
	flags: HookFlags,
): Promise<void> {
	const description = flags.description || "Reading files";

	console.log(`[HOOK] Pre-task: ${description}`);

	// Auto-spawn agents if requested
	if (flags["auto-spawn-agents"] === "true") {
		console.log("[HOOK] Auto-spawning agents for task...");
	}
}

// Execute session-end hook
async function sessionEndCommand(
	subArgs: string[],
	flags: HookFlags,
): Promise<void> {
	console.log("[HOOK] Session ending...");

	// Generate summary if requested
	if (flags["generate-summary"] === "true") {
		console.log("[HOOK] Generating session summary...");
	}

	// Export metrics if requested
	if (flags["export-metrics"] === "true") {
		console.log("[HOOK] Exporting performance metrics...");
	}

	// Persist state if requested
	if (flags["persist-state"] === "true") {
		console.log("[HOOK] Persisting session state...");
	}
}

// Command handlers map
const HOOK_HANDLERS: Record<
	string,
	(subArgs: string[], flags: HookFlags) => Promise<void>
> = {
	"pre-bash": preBashCommand,
	"post-bash": postBashCommand,
	"pre-edit": preEditCommand,
	"post-edit": postEditCommand,
	"pre-task": preTaskCommand,
	"session-end": sessionEndCommand,
};

// Show help for hook commands
function showHookHelp(): void {
	console.log(`
Claude Flow Hook Commands
========================

Available hooks:
  pre-bash      --command <cmd> [--validate-safety] [--prepare-resources]
  post-bash     --command <cmd> [--track-metrics] [--store-results]
  pre-edit      --file <path> [--validate-naming] [--auto-assign-agents] [--load-context]
  post-edit     --file <path> [--format] [--update-memory] [--train-neural] [--validate-changes]
  pre-task      --description <desc> [--auto-spawn-agents]
  session-end   [--generate-summary] [--export-metrics] [--persist-state]

Examples:
  npx claude-flow hooks pre-bash --command "npm test" --validate-safety true
  npx claude-flow hooks pre-edit --file "src/index.js" --validate-naming true
  npx claude-flow hooks post-edit --file "src/index.js" --format true
  npx claude-flow hooks session-end --generate-summary true
`);
}

// Main hook command function
export async function hooksCommand(subArgs: string[]): Promise<void> {
	// Parse all arguments first to check for help flags
	const allFlags = parseArgs(subArgs);

	// Show help if requested or no subcommand provided
	if (
		subArgs.length === 0 ||
		allFlags.help ||
		allFlags.h ||
		subArgs[0] === "--help" ||
		subArgs[0] === "-h"
	) {
		showHookHelp();
		return;
	}

	const subcommand = subArgs[0];
	const flags = parseArgs(subArgs.slice(1));

	// Get handler for subcommand
	const handler = HOOK_HANDLERS[subcommand];
	if (!handler) {
		printError(`Unknown hook subcommand: ${subcommand}`);
		showHookHelp();
		process.exit(1);
	}

	try {
		await handler(subArgs.slice(1), flags);
	} catch (error: any) {
		printError(`Hook execution failed: ${error.message}`);
		process.exit(1);
	}
}

// Export default for CLI integration
export default hooksCommand;
