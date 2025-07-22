#!/usr/bin/env node,
import { getErrorMessage as _getErrorMessage } from "../../utils/error-handler.js";
/**
 * Unified Work Command - Intelligent command that replaces 50+ existing commands
 * Uses smart task analysis and optimal coordination strategies
 */

import chalk from "chalk";
import type { WorkOptions } from "../../unified/work/types.js";
import { WorkCommand } from "../../unified/work/work-command.js";
import {
	ExitCode,
	exitPatterns,
	handleError,
} from "../../utils/graceful-exit.js";
import type { Command, CommandContext } from "../optimized-cli-core.js";
import { _error, info, success, warning } from "../optimized-cli-core.js";

// Initialize the unified work command instance,
let workCommandInstance: WorkCommand | null = null;

async function getWorkCommandInstance(): Promise<WorkCommand> {
	if (!workCommandInstance) {
		workCommandInstance = new WorkCommand();
	}
	return workCommandInstance;
}

export const workCommand: Command = {
	name: "work",
	description:
		"🚀 Unified intelligent work command - replaces 50+ commands with smart task analysis",
	aliases: ["w"],
	options: [
		{
			name: "verbose",
			short: "v",
			description: "Enable verbose output",
			type: "boolean",
			default: false,
		},
		{
			name: "debug",
			description: "Enable debug mode",
			type: "boolean",
			default: false,
		},
		{
			name: "dry-run",
			description: "Show what would be executed without running",
			type: "boolean",
			default: false,
		},
		{
			name: "config",
			description: "Path to configuration file",
			type: "string",
		},
		{
			name: "preset",
			description: "Use predefined workflow preset",
			type: "string",
		},
		{
			name: "agents",
			short: "a",
			description: "Number of agents to spawn (auto-detected if not specified)",
			type: "number",
		},
		{
			name: "topology",
			description:
				"Coordination topology: mesh, hierarchical, ring, star, auto",
			type: "string",
			default: "auto",
		},
		{
			name: "strategy",
			description: "Execution strategy: parallel, sequential, adaptive",
			type: "string",
			default: "adaptive",
		},
		{
			name: "output",
			description: "Output format: text, json, yaml",
			type: "string",
			default: "text",
		},
		{
			name: "memory",
			short: "m",
			description: "Enable persistent memory across sessions",
			type: "boolean",
			default: true,
		},
		{
			name: "hooks",
			description: "Enable coordination hooks",
			type: "boolean",
			default: true,
		},
		{
			name: "auto-optimize",
			description: "Enable automatic optimization",
			type: "boolean",
			default: true,
		},
		{
			name: "tmux",
			description:
				"Enable tmux session with screen splitting (2/3 top for stdout, 1/3 bottom for debug)",
			type: "boolean",
			default: false,
		},
		{
			name: "tmux-session",
			description: "Custom tmux session name",
			type: "string",
		},
	],
	action: async (ctx: CommandContext) => {
		try {
			// Get task from args - first argument is the task description,
			const task = ctx.args[0] as string;
			const params = ctx.args.slice(1) as string[];

			if (!task) {
				_error("Task description is required as the first argument");
				console.log(
					'Example: npx claude-flow work "Build a REST API with authentication"'
				);
				console.log(
					'         npx claude-flow work "research neural architectures" --preset research'
				);
				console.log(
					'         npx claude-flow work "deploy to production" --agents 3 --topology hierarchical'
				);
				exitPatterns.invalidArgs("Task description is required");
				return;
			}

			// Convert CLI context to WorkOptions,
			const options: WorkOptions = {
				verbose: ctx.flags.verbose as boolean,
				debug: ctx.flags.debug as boolean,
				dryRun: ctx.flags["dry-run"] as boolean,
				config: ctx.flags.config as string,
				preset: ctx.flags.preset as string,
				agents: ctx.flags.agents
					? parseInt(ctx.flags.agents as string, 10)
					: undefined,
				topology: ctx.flags.topology as string,
				strategy: ctx.flags.strategy as string,
				output: ctx.flags.output as string,
				memory: ctx.flags.memory as boolean,
				hooks: ctx.flags.hooks as boolean,
				autoOptimize: ctx.flags["auto-optimize"] as boolean,
				tmux: ctx.flags.tmux as boolean,
				tmuxSession: ctx.flags["tmux-session"] as string,
			};

			// Get the work command instance and execute,
			const workCommandInstance = await getWorkCommandInstance();
			const command = workCommandInstance.createCommand();

			// Execute the unified work command directly
			await workCommandInstance.execute(task, params, options);
		} catch (err) {
			// Use enhanced error handling with cleanup
			await handleError(
				err as Error,
				"Failed to execute unified work command",
				ctx.flags.debug as boolean
			);
		}
	},
};

// All the intelligence and coordination logic is now handled by the WorkCommand class
// This CLI wrapper just converts the CLI context to the unified work command format
