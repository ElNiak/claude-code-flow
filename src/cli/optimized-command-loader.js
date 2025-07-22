/**
 * Optimized Command Loader with Lazy Loading
 * Reduces startup time by deferring command imports until needed
 */

// Core command definitions without imports
const commandDefinitions = {
	init: {
		module: "./simple-commands/init/index.js",
		export: "initCommand",
		description:
			"Initialize Claude Code integration files and SPARC development environment",
		usage: "init [--force] [--minimal] [--sparc]",
	},
	start: {
		module: "./simple-commands/start.js",
		export: "startCommand",
		description: "Start the Claude-Flow orchestration system",
		usage: "start [--daemon] [--port <port>] [--verbose] [--ui] [--web]",
	},
	memory: {
		module: "./simple-commands/memory.js",
		export: "memoryCommand",
		description: "Memory management operations",
		usage: "memory <subcommand> [options]",
	},
	sparc: {
		module: "./simple-commands/sparc.js",
		export: "sparcCommand",
		description: "SPARC development mode operations",
		usage: "sparc [subcommand] [options]",
	},
	agent: {
		module: "./simple-commands/agent.js",
		export: "agentCommand",
		description: "Manage AI agents and hierarchies",
		usage: "agent <subcommand> [options]",
	},
	task: {
		module: "./simple-commands/task.js",
		export: "taskCommand",
		description: "Manage tasks and workflows",
		usage: "task <subcommand> [options]",
	},
	config: {
		module: "./simple-commands/config.js",
		export: "configCommand",
		description: "Manage system configuration",
		usage: "config <subcommand> [options]",
	},
	status: {
		module: "./simple-commands/status.js",
		export: "statusCommand",
		description: "Show system status and health",
		usage: "status [--verbose] [--json]",
	},
	mcp: {
		module: "./simple-commands/mcp.js",
		export: "mcpCommand",
		description: "Manage MCP server and tools",
		usage: "mcp <subcommand> [options]",
	},
	monitor: {
		module: "./simple-commands/monitor.js",
		export: "monitorCommand",
		description: "Real-time system monitoring",
		usage: "monitor [--watch] [--interval <ms>]",
	},
	swarm: {
		module: "./simple-commands/swarm.js",
		export: "swarmCommand",
		description: "Swarm-based AI agent coordination",
		usage: "swarm <objective> [options]",
	},
	github: {
		module: "./simple-commands/github.js",
		export: "githubCommand",
		description: "GitHub integration and automation",
		usage: "github <subcommand> [options]",
	},
	hooks: {
		module: "./simple-commands/hooks.js",
		export: "hooksAction",
		description: "Manage hooks and event handlers",
		usage: "hooks <subcommand> [options]",
	},
};

// Command loader cache
const loadedCommands = new Map();

/**
 * Lazy load a command handler
 * @param {string} commandName
 * @returns {Promise<Function>}
 */
async function loadCommand(commandName) {
	// Check cache first
	if (loadedCommands.has(commandName)) {
		return loadedCommands.get(commandName);
	}

	const definition = commandDefinitions[commandName];
	if (!definition) {
		throw new Error(`Unknown command: ${commandName}`);
	}

	try {
		// Dynamic import
		const module = await import(definition.module);
		const handler = module[definition.export] || module.default;

		if (!handler) {
			throw new Error(
				`No export '${definition.export}' found in ${definition.module}`
			);
		}

		// Cache the loaded handler
		loadedCommands.set(commandName, handler);
		return handler;
	} catch (error) {
		console.error(`Failed to load command '${commandName}':`, error.message);
		throw error;
	}
}

/**
 * Get command metadata without loading the handler
 * @param {string} commandName
 * @returns {Object}
 */
function getCommandMetadata(commandName) {
	const definition = commandDefinitions[commandName];
	if (!definition) {
		return null;
	}

	return {
		name: commandName,
		description: definition.description,
		usage: definition.usage,
		examples: definition.examples || [],
	};
}

/**
 * List all available commands without loading them
 * @returns {Array<Object>}
 */
function listAvailableCommands() {
	return Object.keys(commandDefinitions).map((name) => ({
		name,
		description: commandDefinitions[name].description,
	}));
}

/**
 * Create a proxy command that loads on demand
 * @param {string} commandName
 * @returns {Object}
 */
function createLazyCommand(commandName) {
	const metadata = getCommandMetadata(commandName);
	if (!metadata) {
		return null;
	}

	return {
		...metadata,
		handler: async (...args) => {
			const actualHandler = await loadCommand(commandName);
			return actualHandler(...args);
		},
	};
}

/**
 * Register optimized commands with lazy loading
 * @param {Map} commandRegistry
 */
export function registerOptimizedCommands(commandRegistry) {
	for (const commandName of Object.keys(commandDefinitions)) {
		const lazyCommand = createLazyCommand(commandName);
		if (lazyCommand) {
			commandRegistry.set(commandName, lazyCommand);
		}
	}
}

/**
 * Preload critical commands for better UX
 * @param {Array<string>} criticalCommands
 */
export async function preloadCriticalCommands(
	criticalCommands = ["help", "version"]
) {
	const promises = criticalCommands.map((cmd) =>
		loadCommand(cmd).catch((err) =>
			console.warn(`Failed to preload ${cmd}:`, err.message)
		)
	);

	await Promise.all(promises);
}

export {
	loadCommand,
	getCommandMetadata,
	listAvailableCommands,
	createLazyCommand,
};
