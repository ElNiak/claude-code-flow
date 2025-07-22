/**
 * Unified CLI Core - Bridges CLI class pattern with command registry pattern
 */

import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";
import { commandRegistry } from "./command-registry.js";
import { VERSION } from "./optimized-cli-core.js";

export interface UnifiedCommandContext {
	args: string[];
	flags: Record<string, unknown>;
	config?: Record<string, unknown> | undefined;
}

export interface UnifiedCommand {
	name: string;
	description: string;
	aliases?: string[];
	handler?: (
		args: string[],
		flags: Record<string, any>
	) => Promise<void> | void;
	action?: (ctx: UnifiedCommandContext) => Promise<void> | void;
	options?: Array<{
		name: string;
		short?: string;
		description: string;
		type?: "string" | "boolean" | "number";
		default?: unknown;
		required?: boolean;
	}>;
	usage?: string;
	examples?: string[];
	details?: string;
}

/**
 * Unified CLI class that can work with both patterns
 */
export class UnifiedCLI {
	private commands: Map<string, UnifiedCommand> = new Map();

	constructor(
		private name: string,
		private description: string
	) {
		// Import commands from command registry
		this.importFromRegistry();
	}

	/**
	 * Import commands from the command registry
	 */
	private importFromRegistry(): void {
		for (const [name, config] of commandRegistry.entries()) {
			this.commands.set(name, {
				name,
				description: config.description || "",
				handler: config.handler,
				usage: config.usage,
				examples: config.examples,
				details: config.details,
			});
		}
	}

	/**
	 * Add a command using CLI class pattern
	 */
	command(cmd: UnifiedCommand): this {
		this.commands.set(cmd.name, cmd);
		if (cmd.aliases) {
			for (const alias of cmd.aliases) {
				this.commands.set(alias, cmd);
			}
		}
		return this;
	}

	/**
	 * Execute a command
	 */
	async executeCommand(
		commandName: string,
		args: string[],
		flags: Record<string, any>
	): Promise<void> {
		const command = this.commands.get(commandName);
		if (!command) {
			throw new Error(`Unknown command: ${commandName}`);
		}

		// Handle both patterns
		if (command.handler) {
			// Command registry pattern
			await command.handler(args, flags);
		} else if (command.action) {
			// CLI class pattern
			const ctx: UnifiedCommandContext = {
				args,
				flags,
				config: undefined, // Would load config here if needed
			};
			await command.action(ctx);
		} else {
			throw new Error(`Command '${commandName}' has no handler or action`);
		}
	}

	/**
	 * Check if a command exists
	 */
	hasCommand(name: string): boolean {
		return this.commands.has(name);
	}

	/**
	 * Get all commands
	 */
	getAllCommands(): Map<string, UnifiedCommand> {
		return this.commands;
	}

	/**
	 * Get command by name
	 */
	getCommand(name: string): UnifiedCommand | undefined {
		return this.commands.get(name);
	}
}

// Export singleton instance
let unifiedCLI: UnifiedCLI | null = null;

export function getUnifiedCLI(): UnifiedCLI {
	if (!unifiedCLI) {
		unifiedCLI = new UnifiedCLI(
			"claude-flow",
			"Advanced AI Agent Orchestration System"
		);
	}
	return unifiedCLI;
}

// Export adapter functions for backward compatibility
export function hasCommand(name: string): boolean {
	return getUnifiedCLI().hasCommand(name);
}

export async function executeCommand(
	command: string,
	args: string[],
	flags: Record<string, any>
): Promise<void> {
	return getUnifiedCLI().executeCommand(command, args, flags);
}

export function listCommands(): string[] {
	return Array.from(getUnifiedCLI().getAllCommands().keys());
}
