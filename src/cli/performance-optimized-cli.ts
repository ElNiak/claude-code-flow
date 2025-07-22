#!/usr/bin/env node
/**
 * Performance-Optimized CLI Entry Point
 * Implements all identified performance improvements for maximum speed
 */

// CRITICAL: Only essential imports at startup for maximum performance
import type { ParsedArgs } from "../types/cli-types.js";

export const VERSION = "2.0.0-alpha.50";

interface CommandContext {
	args: string[];
	flags: Record<string, unknown>;
	config?: Record<string, unknown> | undefined;
}

interface Command {
	name: string;
	description: string;
	aliases?: string[];
	handler: (ctx: CommandContext) => Promise<void> | void;
	options?: Option[];
}

interface Option {
	name: string;
	short?: string;
	description: string;
	type?: "string" | "boolean" | "number";
	default?: unknown;
	required?: boolean;
}

// Ultra-fast cache for loaded modules
const moduleCache = new Map<string, any>();
const configCache = new Map<string, any>();

// Lazy-load all heavy dependencies
async function loadModule(name: string, modulePath: string) {
	if (moduleCache.has(name)) {
		return moduleCache.get(name);
	}

	const module = await import(modulePath);
	const loaded = module.default || module;
	moduleCache.set(name, loaded);
	return loaded;
}

// Ultra-optimized CLI class
class PerformanceOptimizedCLI {
	private commands: Map<string, Command> = new Map();
	private initialized = false;

	constructor(
		private name: string,
		private description: string
	) {}

	// Deferred command registration - only load when needed
	async initializeCommands() {
		if (this.initialized) return;

		// Critical commands only - rest loaded on demand
		const criticalCommands = {
			help: {
				handler: async () => this.showHelp(),
				description: "Show help information",
			},
			version: {
				handler: async () => console.log(`${this.name} v${VERSION}`),
				description: "Show version information",
			},
		};

		// Register critical commands immediately
		for (const [name, cmd] of Object.entries(criticalCommands)) {
			this.commands.set(name, {
				name,
				description: cmd.description,
				handler: cmd.handler,
			});
		}

		this.initialized = true;
	}

	// Ultra-fast command loader with caching
	async loadCommand(commandName: string): Promise<Command | null> {
		// Check if already loaded
		if (this.commands.has(commandName)) {
			return this.commands.get(commandName)!;
		}

		// Command definitions with lazy loading
		const commandModules: Record<string, string> = {
			init: "./simple-commands/init/index.js",
			start: "./simple-commands/start.js",
			memory: "./simple-commands/memory.js",
			agent: "./simple-commands/agent.js",
			task: "./simple-commands/task.js",
			config: "./simple-commands/config.js",
			status: "./simple-commands/status.js",
			mcp: "./simple-commands/mcp.js",
			monitor: "./simple-commands/monitor.js",
			swarm: "./simple-commands/swarm.js",
			github: "./simple-commands/github.js",
			hooks: "./simple-commands/hooks.js",
			sparc: "./simple-commands/sparc.js",
		};

		const modulePath = commandModules[commandName];
		if (!modulePath) {
			return null;
		}

		try {
			// Dynamic import with caching
			const module = await loadModule(commandName, modulePath);
			const handler =
				module[`${commandName}Command`] || module.default || module;

			const command: Command = {
				name: commandName,
				description: `${commandName.charAt(0).toUpperCase() + commandName.slice(1)} command`,
				handler: async (ctx: CommandContext) => {
					if (typeof handler === "function") {
						await handler(ctx);
					} else {
						console.error(`Invalid handler for command: ${commandName}`);
					}
				},
			};

			this.commands.set(commandName, command);
			return command;
		} catch (error) {
			console.error(
				`Failed to load command '${commandName}':`,
				(error as Error).message
			);
			return null;
		}
	}

	// Ultra-fast argument parsing (minimal allocations)
	private parseArgs(args: string[]): Record<string, any> {
		const result: Record<string, any> = { _: [] };

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];

			if (arg.startsWith("--")) {
				const key = arg.slice(2);
				const nextArg = args[i + 1];

				if (nextArg && !nextArg.startsWith("-")) {
					result[key] = nextArg;
					i++; // Skip next arg
				} else {
					result[key] = true;
				}
			} else if (arg.startsWith("-")) {
				const key = arg.slice(1);
				const nextArg = args[i + 1];

				if (nextArg && !nextArg.startsWith("-")) {
					result[key] = nextArg;
					i++; // Skip next arg
				} else {
					result[key] = true;
				}
			} else {
				result._.push(arg);
			}
		}

		return result;
	}

	// Cached config loading
	private async loadConfig(
		configPath?: string
	): Promise<Record<string, unknown> | undefined> {
		const cacheKey = configPath || "default";

		if (configCache.has(cacheKey)) {
			return configCache.get(cacheKey);
		}

		const configFile = configPath || "claude-flow.config.json";
		try {
			const fs = await loadModule("fs", "fs-extra");
			const content = await fs.readFile(configFile, "utf8");
			const config = JSON.parse(content);
			configCache.set(cacheKey, config);
			return config;
		} catch {
			configCache.set(cacheKey, undefined);
			return undefined;
		}
	}

	// Main execution entry - optimized for speed
	async run(args = process.argv.slice(2)): Promise<void> {
		// Ultra-fast version check (no imports needed)
		if (args.includes("--version") || args.includes("-v")) {
			console.log(`${this.name} v${VERSION}`);
			return;
		}

		const flags = this.parseArgs(args);
		const commandName = flags._[0]?.toString() || "";

		// Fast help path
		if (!commandName || flags.help || flags.h) {
			await this.initializeCommands();
			await this.showHelp();
			return;
		}

		// Load command on demand
		const command = await this.loadCommand(commandName);
		if (!command) {
			const chalk = await loadModule("chalk", "chalk");
			console.error(chalk.red(`Unknown command: ${commandName}`));
			console.log(`Run "${this.name} help" for available commands`);
			process.exit(1);
		}

		const ctx: CommandContext = {
			args: flags._.slice(1).map(String),
			flags: flags as Record<string, unknown>,
			config: await this.loadConfig(flags.config as string),
		};

		try {
			await command.handler(ctx);
		} catch (error) {
			const chalk = await loadModule("chalk", "chalk");
			console.error(
				chalk.red(`Error executing command '${commandName}':`),
				(error as Error).message
			);
			if (flags.verbose) {
				console.error(error);
			}
			process.exit(1);
		}
	}

	private async showHelp(): Promise<void> {
		const chalk = await loadModule("chalk", "chalk");

		console.log(`
${chalk.bold(chalk.blue(`🧠 ${this.name} v${VERSION}`))} - ${this.description}

${chalk.bold("USAGE:")}
  ${this.name} [COMMAND] [OPTIONS]

${chalk.bold("COMMANDS:")}
  init                         Initialize Claude Code integration
  start                        Start orchestration system
  agent <subcommand>           Manage AI agents
  task <subcommand>            Manage tasks and workflows
  config <subcommand>          Manage system configuration
  status                       Show system status
  memory <subcommand>          Memory management
  mcp <subcommand>             MCP server management
  monitor                      Real-time monitoring
  swarm <objective>            Swarm coordination
  github <subcommand>          GitHub integration
  hooks <subcommand>           Manage hooks
  sparc                        SPARC development mode

${chalk.bold("GLOBAL OPTIONS:")}
  -h, --help                   Show help
  -v, --version                Show version
  -c, --config <path>          Configuration file path
  --verbose                    Enable verbose logging

${chalk.bold("EXAMPLES:")}
  ${this.name} start                     # Start orchestrator
  ${this.name} agent spawn researcher    # Spawn research agent
  ${this.name} swarm "Build API"         # Run swarm task

Documentation: https://github.com/ruvnet/claude-code-flow
`);
	}
}

// Performance-optimized helper functions
let _chalk: any;
async function getChalk() {
	if (!_chalk) {
		_chalk = await loadModule("chalk", "chalk");
	}
	return _chalk;
}

export async function success(message: string): Promise<void> {
	const chalk = await getChalk();
	console.log(chalk.green(`✅ ${message}`));
}

export async function error(message: string): Promise<void> {
	const chalk = await getChalk();
	console.error(chalk.red(`❌ ${message}`));
}

export async function warning(message: string): Promise<void> {
	const chalk = await getChalk();
	console.warn(chalk.yellow(`⚠️  ${message}`));
}

export async function info(message: string): Promise<void> {
	const chalk = await getChalk();
	console.log(chalk.blue(`ℹ️  ${message}`));
}

// Export optimized CLI
export { PerformanceOptimizedCLI as CLI };
export type { Command, CommandContext, Option };

// Ultra-fast main function for direct execution
export async function main() {
	const cli = new PerformanceOptimizedCLI(
		"claude-flow",
		"Advanced AI coordination and intelligent task orchestration"
	);

	await cli.run();
}

// Auto-run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}
