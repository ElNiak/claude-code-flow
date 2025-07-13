#!/usr/bin/env node
import { getErrorMessage } from '../../utils/error-handler.js';
/**
 * Unified Work Command - Intelligent command that replaces 50+ existing commands
 * Uses smart task analysis and optimal coordination strategies
 */

import chalk from 'chalk';
import type { Command, CommandContext } from "../cli-core.js";
import { success, error, warning, info } from "../cli-core.js";
import { WorkCommand } from "../../unified/work/work-command.js";
import type { WorkOptions } from "../../unified/work/types.js";

// Initialize the unified work command instance
let workCommandInstance: WorkCommand | null = null;

async function getWorkCommandInstance(): Promise<WorkCommand> {
  if (!workCommandInstance) {
    workCommandInstance = new WorkCommand();
  }
  return workCommandInstance;
}

export const workCommand: Command = {
  name: "work",
  description: "🚀 Unified intelligent work command - replaces 50+ commands with smart task analysis",
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
      description: "Coordination topology: mesh, hierarchical, ring, star, auto",
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
  ],
  action: async (ctx: CommandContext) => {
    try {
      // Get task from args - first argument is the task description
      const task = ctx.args[0] as string;
      const params = ctx.args.slice(1) as string[];
      
      if (!task) {
        error("Task description is required as the first argument");
        console.log("Example: npx claude-flow work \"Build a REST API with authentication\"");
        console.log("         npx claude-flow work \"research neural architectures\" --preset research");
        console.log("         npx claude-flow work \"deploy to production\" --agents 3 --topology hierarchical");
        return;
      }

      // Convert CLI context to WorkOptions
      const options: WorkOptions = {
        verbose: ctx.flags.verbose as boolean,
        debug: ctx.flags.debug as boolean,
        dryRun: ctx.flags['dry-run'] as boolean,
        config: ctx.flags.config as string,
        preset: ctx.flags.preset as string,
        agents: ctx.flags.agents as number,
        topology: ctx.flags.topology as string,
        strategy: ctx.flags.strategy as string,
        output: ctx.flags.output as string,
        memory: ctx.flags.memory as boolean,
        hooks: ctx.flags.hooks as boolean,
        autoOptimize: ctx.flags['auto-optimize'] as boolean,
      };

      // Get the work command instance and execute
      const workCommandInstance = await getWorkCommandInstance();
      const command = workCommandInstance.createCommand();

      // Execute the unified work command
      await command.action(options, task, ...params);

    } catch (err) {
      error(`Failed to execute unified work command: ${getErrorMessage(err)}`);
      process.exit(1);
    }
  }
};

// All the intelligence and coordination logic is now handled by the WorkCommand class
// This CLI wrapper just converts the CLI context to the unified work command format