#!/usr/bin/env node
/**
 * Optimized Claude-Flow CLI Core
 * Implements performance optimizations:
 * - Lazy loading of heavy dependencies
 * - Deferred command registration
 * - Minimal initial imports
 */

// Only essential imports at startup
import type { ParsedArgs } from "../types/cli-types.js";

export const VERSION = "2.0.0-alpha.50";

interface CommandContext {
	args: string[];
	flags: Record<string, unknown>;
	config?: Record<string, unknown> | undefined;
}

interface Command {
	name: string | (() => string);
	description: string;
	aliases?: string[];
	subcommands?: Command[];
	action?: (ctx: CommandContext) => Promise<void> | void;
	handler?: (ctx: CommandContext) => Promise<void> | void; // For lazy-loaded commands
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

// Lazy-load heavy dependencies
let chalk: any;
let fs: any;

async function loadChalk() {
	if (!chalk) {
		const module = await import("chalk");
		chalk = module.default;
	}
	return chalk;
}

async function loadFs() {
	if (!fs) {
		const module = await import("fs-extra");
		fs = module.default;
	}
	return fs;
}

class OptimizedCLI {
	private commands: Map<string, Command> = new Map();
	private globalOptions: Option[] = [
		{
			name: "help",
			short: "h",
			description: "Show help",
			type: "boolean",
		},
		{
			name: "version",
			short: "v",
			description: "Show version",
			type: "boolean",
		},
		{
			name: "config",
			short: "c",
			description: "Path to configuration file",
			type: "string",
		},
		{
			name: "verbose",
			description: "Enable verbose logging",
			type: "boolean",
		},
	];

	constructor(
		private name: string,
		private description: string
	) {}

	command(cmd: Command): this {
		const cmdName = typeof cmd.name === "function" ? cmd.name() : cmd.name;
		this.commands.set(cmdName, cmd);
		if (cmd.aliases && typeof cmd.aliases[Symbol.iterator] === "function") {
			for (const alias of cmd.aliases) {
				this.commands.set(alias, cmd);
			}
		}
		return this;
	}

	async run(args = process.argv.slice(2)): Promise<void> {
		const flags = this.parseArgs(args);

		// Handle version without loading anything
		if (flags.version || flags.v) {
			console.log(`${this.name} v${VERSION}`);
			return;
		}

		const commandName = flags._[0]?.toString() || "";

		// Handle help - minimal loading
		if (!commandName || flags.help || flags.h) {
			await this.showHelp();
			return;
		}

		const command = this.commands.get(commandName);
		if (!command) {
			const c = await loadChalk();
			console.error(c.red(`Unknown command: ${commandName}`));
			console.log(`Run "${this.name} help" for available commands`);
			process.exit(1);
		}

		const ctx: CommandContext = {
			args: flags._.slice(1).map(String),
			flags: flags as Record<string, unknown>,
			config: await this.loadConfig(flags.config as string),
		};

		try {
			// Use handler for lazy-loaded commands, action for direct ones
			const executor = command.handler || command.action;
			if (executor) {
				await executor(ctx);
			} else {
				const c = await loadChalk();
				console.log(c.yellow(`Command '${commandName}' has no action defined`));
			}
		} catch (error) {
			const c = await loadChalk();
			console.error(
				c.red(`Error executing command '${commandName}':`),
				(error as Error).message
			);
			if (flags.verbose) {
				console.error(error);
			}
			process.exit(1);
		}
	}

	private parseArgs(args: string[]): Record<string, any> {
		const result: Record<string, any> = { _: [] };
		let i = 0;

		while (i < args.length) {
			const arg = args[i];

			if (arg.startsWith("--")) {
				const key = arg.slice(2);
				if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
					result[key] = args[i + 1];
					i += 2;
				} else {
					result[key] = true;
					i++;
				}
			} else if (arg.startsWith("-")) {
				const key = arg.slice(1);
				if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
					result[key] = args[i + 1];
					i += 2;
				} else {
					result[key] = true;
					i++;
				}
			} else {
				result._.push(arg);
				i++;
			}
		}

		return result;
	}

	private async loadConfig(
		configPath?: string
	): Promise<Record<string, unknown> | undefined> {
		const configFile = configPath || "claude-flow.config.json";
		try {
			const fsModule = await loadFs();
			const content = await fsModule.readFile(configFile, "utf8");
			return JSON.parse(content);
		} catch {
			return undefined;
		}
	}

	private async showHelp(): Promise<void> {
		const c = await loadChalk();
		console.log(`
${c.bold(c.blue(`🧠 ${this.name} v${VERSION}`))} - ${this.description}

${c.bold("USAGE:")}
  ${this.name} [COMMAND] [OPTIONS]

${c.bold("COMMANDS:")}
${this.formatCommands()}

${c.bold("GLOBAL OPTIONS:")}
${this.formatOptions(this.globalOptions)}

${c.bold("EXAMPLES:")}
  ${this.name} start                                    # Start orchestrator
  ${this.name} agent spawn researcher --name "Bot"     # Spawn research agent
  ${this.name} swarm "Build API" --parallel            # Run swarm task
  ${this.name} status                                  # Show system status

Documentation: https://github.com/ruvnet/claude-code-flow
`);
	}

	private formatCommands(): string {
		const commands = Array.from(new Set(this.commands.values()));
		return commands
			.filter((cmd) => cmd && cmd.name)
			.map((cmd) => `  ${String(cmd.name).padEnd(20)} ${cmd.description || ""}`)
			.join("\n");
	}

	private formatOptions(options: Option[]): string {
		return options
			.map((opt) => {
				const flags = opt.short
					? `-${opt.short}, --${opt.name}`
					: `    --${opt.name}`;
				return `  ${flags.padEnd(25)} ${opt.description}`;
			})
			.join("\n");
	}
}

// Lazy-loaded helper functions
async function success(message: string): Promise<void> {
	const c = await loadChalk();
	console.log(c.green(`✅ ${message}`));
}

async function error(message: string): Promise<void> {
	const c = await loadChalk();
	console.error(c.red(`❌ ${message}`));
}

async function warning(message: string): Promise<void> {
	const c = await loadChalk();
	console.warn(c.yellow(`⚠️  ${message}`));
}

async function info(message: string): Promise<void> {
	const c = await loadChalk();
	console.log(c.blue(`ℹ️  ${message}`));
}

// Export optimized CLI
export { OptimizedCLI as CLI, success, error as _error, warning, info };
export type { Command, CommandContext, Option };
