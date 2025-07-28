import { spawn } from "child_process";
import { Logger } from "../../core/logger.js";
import type {
	HookCommandOptions,
	MemorySyncOptions,
	NotificationOptions,
	PerformanceOptions,
	PostCommandOptions,
	PostEditOptions,
	PostTaskOptions,
	PreCommandOptions,
	PreEditOptions,
	PreSearchOptions,
	PreTaskOptions,
	SessionEndOptions,
	SessionRestoreOptions,
	SessionStartOptions,
	TelemetryOptions,
} from "./hook-types.js";

const logger = new Logger(
	{
		level: "info",
		format: "text",
		destination: "console",
	},
	{ prefix: "Hook" },
);

// Helper function to build command arguments
function buildArgs(hookType: string, options: Record<string, any>): string[] {
	const args = [hookType];

	Object.entries(options).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			const flagName = key.replace(/([A-Z])/g, "-$1").toLowerCase();

			if (typeof value === "boolean") {
				if (value) {
					args.push(`--${flagName}`);
				} else {
					args.push(`--no-${flagName}`);
				}
			} else {
				args.push(`--${flagName}`, String(value));
			}
		}
	});

	return args;
}

// Hook category mapping
const getHookCategory = (hookType: string): string => {
	if (
		[
			"pre-task",
			"post-task",
			"session-start",
			"session-end",
			"session-restore",
		].includes(hookType)
	) {
		return "lifecycle";
	} else if (
		[
			"pre-edit",
			"post-edit",
			"pre-command",
			"post-command",
			"pre-search",
		].includes(hookType)
	) {
		return "operation";
	} else if (
		["notification", "performance", "memory-sync", "telemetry"].includes(
			hookType,
		)
	) {
		return "utility";
	} else {
		return "operation"; // default fallback
	}
};

// Shared parameter validation
function validateCommonParams(
	hookType: string,
	options: Record<string, any>,
): void {
	const validationRules: Record<string, string[]> = {
		"post-task": ["taskId"],
		"pre-edit": ["file"],
		"post-edit": ["file"],
		"pre-command": ["command"],
		"post-command": ["command"],
		"session-restore": ["sessionId"],
		"pre-search": ["query"],
		notification: ["message"],
		telemetry: ["event"],
	};

	const required = validationRules[hookType] || [];

	for (const param of required) {
		if (!options[param]) {
			throw new Error(
				`--${param.replace(/([A-Z])/g, "-$1").toLowerCase()} is required for ${hookType} hook`,
			);
		}
	}
}

// Consolidated hook handlers with proper signature
const createCategoryHandler = (category: string) => {
	return async (hookType: string, args: string[]) => {
		const options = parseArgs(args);
		validateCommonParams(hookType, options);
		await executeHook(hookType, options);
	};
};

const lifecycleHandler = createCategoryHandler("lifecycle");
const operationHandler = createCategoryHandler("operation");
const utilityHandler = createCategoryHandler("utility");

// Individual hook handlers (consolidated into categories)
const individualHookHandlers: Record<
	string,
	(args: string[]) => Promise<void>
> = {
	"pre-task": async (args: string[]) =>
		await lifecycleHandler("pre-task", args),
	"post-task": async (args: string[]) =>
		await lifecycleHandler("post-task", args),
	"pre-edit": async (args: string[]) =>
		await operationHandler("pre-edit", args),
	"post-edit": async (args: string[]) =>
		await operationHandler("post-edit", args),
	"pre-command": async (args: string[]) =>
		await operationHandler("pre-command", args),
	"post-command": async (args: string[]) =>
		await operationHandler("post-command", args),
	"session-start": async (args: string[]) =>
		await lifecycleHandler("session-start", args),
	"session-end": async (args: string[]) =>
		await lifecycleHandler("session-end", args),
	"session-restore": async (args: string[]) =>
		await lifecycleHandler("session-restore", args),
	"pre-search": async (args: string[]) =>
		await operationHandler("pre-search", args),
	notification: async (args: string[]) =>
		await utilityHandler("notification", args),
	performance: async (args: string[]) =>
		await utilityHandler("performance", args),
	"memory-sync": async (args: string[]) =>
		await utilityHandler("memory-sync", args),
	telemetry: async (args: string[]) => await utilityHandler("telemetry", args),
};

// Parse command line arguments
function parseArgs<T extends Record<string, any>>(args: string[]): T {
	const options: Record<string, any> = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg.startsWith("--")) {
			const key = arg
				.slice(2)
				.replace(/-([a-z])/g, (_: string, letter: string) =>
					letter.toUpperCase(),
				);
			const nextArg = args[i + 1];

			if (!nextArg || nextArg.startsWith("--")) {
				// Boolean flag
				options[key] = !arg.startsWith("--no-");
			} else {
				// Value flag
				options[key] = nextArg;
				i++; // Skip next arg
			}
		}
	}

	return options as T;
}

// Execute hook with ruv-swarm
async function executeHook(
	hookType: string,
	options: Record<string, any>,
): Promise<void> {
	const args = buildArgs(hookType, options);
	const command = `ruv-swarm hook ${args.join(" ")}`;

	logger.debug(`Executing hook: npx ${command}`);

	const child = spawn("npx", ["ruv-swarm", "hook", ...args], {
		stdio: "inherit",
		shell: true,
	});

	await new Promise<void>((resolve, reject) => {
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Hook ${hookType} failed with exit code ${code}`));
			}
		});

		child.on("error", (error) => {
			logger.error(`Failed to execute hook ${hookType}:`, error);
			reject(error);
		});
	});
}

// Main hook command handler
export const hookCommand = {
	name: "hook",
	description: "Execute ruv-swarm hooks for agent coordination",
	action: async ({ args }: HookCommandOptions): Promise<void> => {
		try {
			if (args.length === 0) {
				showHookHelp();
				return;
			}

			const subcommand = args[0];
			const resolvedCommand = resolveHookCommand(subcommand);
			const handler = individualHookHandlers[resolvedCommand];

			if (!handler) {
				logger.error(`Unknown hook subcommand: ${subcommand}`);
				showHookHelp();
				throw new Error(`Unknown hook subcommand: ${subcommand}`);
			}

			await handler(args.slice(1));
		} catch (error: any) {
			logger.error("Hook command error:", error);
			throw error;
		}
	},
};

// Show help for hook commands
function showHookHelp(): void {
	console.log(`
Claude Flow Hook Commands
========================

Available hooks:

  pre-task      - Run before starting a task
    --description <desc>      Task description
    --auto-spawn-agents       Auto-spawn agents (default: true)
    --complexity <level>      Task complexity: low|medium|high
    --estimated-minutes <n>   Estimated duration
    --requires-research       Task requires research
    --requires-testing        Task requires testing

  post-task     - Run after completing a task
    --task-id <id>           Task ID (required)
    --analyze-performance    Analyze performance metrics
    --generate-report        Generate completion report

  pre-edit      - Run before editing a file
    --file <path>            File path (required)
    --operation <op>         Operation type: read|write|edit|delete
    --validate               Validate file before edit

  post-edit     - Run after editing a file
    --file <path>            File path (required)
    --memory-key <key>       Store in memory with key
    --format                 Auto-format code
    --analyze                Analyze changes

  pre-command   - Run before executing a command
    --command <cmd>          Command to execute (required)
    --validate               Validate command safety
    --sandbox                Run in sandbox mode

  post-command  - Run after executing a command
    --command <cmd>          Command executed (required)
    --exit-code <code>       Command exit code
    --duration <ms>          Execution duration

  session-start - Run at session start
    --session-id <id>        Session identifier
    --load-previous          Load previous session data
    --auto-restore           Auto-restore context

  session-end   - Run at session end
    --session-id <id>        Session identifier
    --export-metrics         Export performance metrics
    --generate-summary       Generate session summary
    --save-to <path>         Save session data to path

  session-restore - Restore a previous session
    --session-id <id>        Session ID to restore (required)
    --load-memory            Load memory state
    --load-agents            Load agent configuration
    --load-tasks             Load task list

  pre-search    - Run before searching
    --query <text>           Search query (required)
    --cache-results          Cache search results
    --max-results <n>        Maximum results to return

  notification  - Send a notification
    --message <text>         Notification message (required)
    --level <level>          Message level: info|warning|error
    --telemetry              Include in telemetry
    --persist                Persist notification

  performance   - Track performance metrics
    --operation <name>       Operation name
    --duration <ms>          Operation duration
    --metrics <json>         Performance metrics as JSON

  memory-sync   - Synchronize memory state
    --namespace <name>       Memory namespace
    --direction <dir>        Sync direction: push|pull|sync
    --target <location>      Target location for sync

  telemetry     - Send telemetry data
    --event <name>           Event name (required)
    --data <json>            Event data as JSON
    --tags <list>            Comma-separated tags

Common options:
  --verbose                  Show detailed output
  --metadata <json>          Additional metadata as JSON

Examples:
  claude hook pre-task --description "Build REST API" --complexity high
  claude hook post-edit --file src/index.js --memory-key "api/implementation"
  claude hook session-end --export-metrics --generate-summary
  claude hook performance --operation "api-build" --duration 1234
  claude hook memory-sync --namespace "project" --direction push
  claude hook telemetry --event "task-completed" --data '{"taskId":"123"}'
`);
}

// Hook shortcuts mapping
const hookShortcuts: Record<string, string> = {
	start: "pre-task",
	update: "post-edit",
	complete: "post-task",
	save: "memory-sync",
	notify: "notification",
};

// Resolve hook shortcuts
function resolveHookCommand(command: string): string {
	return hookShortcuts[command] || command;
}

// Export hook subcommands for better CLI integration
export const hookSubcommands = [
	"pre-task",
	"post-task",
	"pre-edit",
	"post-edit",
	"pre-command",
	"post-command",
	"session-start",
	"session-end",
	"session-restore",
	"pre-search",
	"notification",
	"performance",
	"memory-sync",
	"telemetry",
	// Add shortcuts
	"start",
	"update",
	"complete",
	"save",
	"notify",
];
