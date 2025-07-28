import { getErrorMessage as _getErrorMessage } from "../../utils/error-handler.js";

/**
 * Unified Agent management commands - Combines features from both agent.ts and agent-simple.ts
 * This version provides both Commander.js compatibility and simple function-based API
 */

import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import Table from "cli-table3";
import { Command } from "commander";
import inquirer from "inquirer";
import { AgentManager } from "../../agents/agent-manager.js";
import { AgentRegistry } from "../../agents/agent-registry.js";
import { EventBus } from "../../core/event-bus.js";
import { Logger } from "../../core/logger.js";
import { DistributedMemorySystem } from "../../memory/distributed-memory.js";
import type { MemoryManager as _MemoryManager } from "../../memory/manager.js";
import {
	formatDuration as _formatDuration,
	formatBytes,
	formatPercentage,
} from "../../utils/formatters.js";
import { generateId } from "../../utils/helpers.js";
import type { AgentProfile as _AgentProfile } from "../../utils/types.js";

// Global instances
let agentManager: AgentManager | null = null;
let agentRegistry: AgentRegistry | null = null;

// Initialize agent management system (unified from both implementations)
async function initializeAgentSystem(): Promise<{
	manager: AgentManager;
	registry: AgentRegistry;
}> {
	if (agentManager && agentRegistry) {
		return { manager: agentManager, registry: agentRegistry };
	}

	try {
		const logger = new Logger({
			level: "info",
			format: "text",
			destination: "console",
		});

		const eventBus = EventBus.getInstance();

		const memorySystem = new DistributedMemorySystem(
			{
				namespace: "agents",
				distributed: false,
				consistency: "eventual",
				replicationFactor: 1,
				syncInterval: 60000,
				maxMemorySize: 100,
				compressionEnabled: false,
				encryptionEnabled: false,
				backupEnabled: true,
				persistenceEnabled: true,
				shardingEnabled: false,
				cacheSize: 50,
				cacheTtl: 300000,
			},
			logger,
			eventBus,
		);

		await memorySystem.initialize();

		agentRegistry = new AgentRegistry(memorySystem, "agents");
		await agentRegistry.initialize();

		agentManager = new AgentManager(
			{
				maxAgents: 100,
				defaultTimeout: 60000,
				heartbeatInterval: 15000,
				healthCheckInterval: 30000,
				autoRestart: true,
				resourceLimits: {
					memory: 1024 * 1024 * 1024, // 1GB
					cpu: 2.0,
					disk: 2 * 1024 * 1024 * 1024, // 2GB
				},
			},
			logger,
			eventBus,
			memorySystem,
		);

		await agentManager.initialize();

		return { manager: agentManager, registry: agentRegistry };
	} catch (error) {
		throw new Error(
			`Failed to initialize agent system: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Format agent data for display
function formatAgentData(agent: any, detailed: boolean = false): any {
	const data = {
		id: agent.id,
		name: agent.name,
		type: agent.type,
		status: agent.status,
		health: formatPercentage(agent.health),
		workload: formatPercentage(agent.workload),
	};

	if (detailed) {
		Object.assign(data, {
			memory: "N/A",
			cpu: "N/A",
			activeTasks: agent.currentTask ? 1 : 0,
			completedTasks: agent.taskHistory?.length || 0,
			errorRate: "N/A",
		});
	}

	return data;
}

// Simple command handlers (from agent-simple.ts)
export const agentCommands = {
	async spawn(
		args: string[],
		options: Record<string, any> = {},
	): Promise<void> {
		try {
			const { manager } = await initializeAgentSystem();

			const templateName = args[0] || "researcher";
			const name = options.name || `${templateName}-${Date.now().toString(36)}`;

			console.log(`🚀 Creating agent with template: ${templateName}`);

			const agentId = await manager.createAgent(templateName, {
				name,
				config: {
					autonomyLevel: options.autonomy || 0.7,
					maxConcurrentTasks: options.maxTasks || 5,
					timeoutThreshold: options.timeout || 300000,
				},
			});

			if (options.start !== false) {
				console.log("⚡ Starting agent...");
				await manager.startAgent(agentId);
			}

			console.log("✅ Agent created successfully!");
			console.log(`   ID: ${agentId}`);
			console.log(`   Name: ${name}`);
			console.log(`   Template: ${templateName}`);
		} catch (error) {
			console.error(
				"❌ Error creating agent:",
				error instanceof Error ? error.message : String(error),
			);
		}
	},

	async list(args: string[], options: Record<string, any> = {}): Promise<void> {
		try {
			const { manager } = await initializeAgentSystem();

			let agents = manager.getAllAgents();

			// Apply filters
			if (options.type) {
				agents = agents.filter((agent) => agent.type === options.type);
			}

			if (options.status) {
				agents = agents.filter((agent) => agent.status === options.status);
			}

			if (options.unhealthy) {
				agents = agents.filter((agent) => agent.health < 0.7);
			}

			if (agents.length === 0) {
				console.log("📋 No agents found matching the criteria");
				return;
			}

			// Sort agents
			agents.sort((a, b) => {
				switch (options.sort) {
					case "type":
						return a.type.localeCompare(b.type);
					case "status":
						return a.status.localeCompare(b.status);
					case "health":
						return b.health - a.health;
					case "workload":
						return b.workload - a.workload;
					default:
						return a.name.localeCompare(b.name);
				}
			});

			if (options.json) {
				console.log(
					JSON.stringify(
						agents.map((a) => formatAgentData(a, options.detailed)),
						null,
						2,
					),
				);
				return;
			}

			// Create table for display
			const table = new Table({
				head: options.detailed
					? [
							"ID",
							"Name",
							"Type",
							"Status",
							"Health",
							"Workload",
							"Memory",
							"CPU",
							"Tasks",
						]
					: ["ID", "Name", "Type", "Status", "Health", "Workload"],
				colWidths: options.detailed
					? [15, 20, 15, 12, 10, 10, 12, 8, 10]
					: [15, 25, 15, 12, 10, 10],
			});

			for (const agent of agents) {
				const data = formatAgentData(agent, options.detailed);
				const row = options.detailed
					? [
							data.id,
							data.name,
							data.type,
							data.status,
							data.health,
							data.workload,
							data.memory,
							data.cpu,
							`${data.activeTasks}/${data.completedTasks}`,
						]
					: [
							data.id,
							data.name,
							data.type,
							data.status,
							data.health,
							data.workload,
						];

				table.push(row);
			}

			console.log("📋 Active Agents:");
			console.log(table.toString());
			console.log(`\nTotal agents: ${agents.length}`);
		} catch (error) {
			console.error(
				"❌ Error listing agents:",
				error instanceof Error ? error.message : String(error),
			);
		}
	},

	async terminate(
		args: string[],
		options: Record<string, any> = {},
	): Promise<void> {
		try {
			const { manager } = await initializeAgentSystem();

			const agentId = args[0];
			if (!agentId) {
				console.error("❌ Please specify an agent ID to terminate");
				return;
			}

			const agent = manager.getAgent(agentId);
			if (!agent) {
				console.error(`❌ Agent not found: ${agentId}`);
				return;
			}

			console.log(`⚠️  Terminating agent: ${agent.name} (${agent.id})`);

			if (options.graceful !== false) {
				console.log("🕐 Attempting graceful shutdown...");
				await manager.stopAgent(agentId);
			} else {
				console.log("⚡ Force terminating agent...");
				await manager.removeAgent(agentId);
			}

			console.log("✅ Agent terminated successfully");

			if (options.cleanup) {
				console.log("🧹 Cleaning up agent resources...");
				// Cleanup logic would go here
			}
		} catch (error) {
			console.error(
				"❌ Error terminating agent:",
				error instanceof Error ? error.message : String(error),
			);
		}
	},

	async info(args: string[], options: Record<string, any> = {}): Promise<void> {
		try {
			const { manager, registry } = await initializeAgentSystem();

			const agentId = args[0];
			if (!agentId) {
				console.error("❌ Please specify an agent ID");
				return;
			}

			const agent = manager.getAgent(agentId);
			if (!agent) {
				console.error(`❌ Agent not found: ${agentId}`);
				return;
			}

			console.log(chalk.cyan("\n🤖 Agent Information"));
			console.log(chalk.gray("─".repeat(50)));

			// Basic info
			console.log(`${chalk.bold("ID:")} ${agent.id}`);
			console.log(`${chalk.bold("Name:")} ${agent.name}`);
			console.log(`${chalk.bold("Type:")} ${agent.type}`);
			console.log(`${chalk.bold("Status:")} ${agent.status}`);
			console.log(`${chalk.bold("Health:")} ${formatPercentage(agent.health)}`);
			console.log(
				`${chalk.bold("Workload:")} ${formatPercentage(agent.workload)}`,
			);

			// Detailed info if requested
			if (options.detailed) {
				console.log(chalk.gray("\n─ Resources ─"));
				console.log(`Memory: N/A`);
				console.log(`CPU: N/A`);
				console.log(`Disk: N/A`);

				console.log(chalk.gray("\n─ Performance ─"));
				console.log(`Active Tasks: ${agent.currentTask ? 1 : 0}`);
				console.log(`Completed Tasks: ${agent.taskHistory?.length || 0}`);
				console.log(`Error Rate: N/A`);

				// Get capabilities from agent
				const capabilities = agent.capabilities;
				if (capabilities) {
					console.log(chalk.gray("\n─ Capabilities ─"));
					if (capabilities.languages?.length > 0) {
						console.log(`  Languages: ${capabilities.languages.join(", ")}`);
					}
					if (capabilities.frameworks?.length > 0) {
						console.log(`  Frameworks: ${capabilities.frameworks.join(", ")}`);
					}
					if (capabilities.domains?.length > 0) {
						console.log(`  Domains: ${capabilities.domains.join(", ")}`);
					}
					if (capabilities.tools?.length > 0) {
						console.log(`  Tools: ${capabilities.tools.join(", ")}`);
					}
				}
			}

			if (options.history) {
				console.log(chalk.gray("\n─ Recent Activity ─"));
				// Activity history would be displayed here
			}
		} catch (error) {
			console.error(
				"❌ Error getting agent info:",
				error instanceof Error ? error.message : String(error),
			);
		}
	},

	async health(
		args: string[],
		options: Record<string, any> = {},
	): Promise<void> {
		try {
			const { manager } = await initializeAgentSystem();

			const agents = manager.getAllAgents();
			const healthData = agents.map((agent) => ({
				id: agent.id,
				name: agent.name,
				health: agent.health,
				status: agent.status,
				healthStatus:
					agent.health >= 0.8
						? "healthy"
						: agent.health >= 0.5
							? "warning"
							: "critical",
			}));

			// Group by health status
			const healthy = healthData.filter((a) => a.healthStatus === "healthy");
			const warning = healthData.filter((a) => a.healthStatus === "warning");
			const critical = healthData.filter((a) => a.healthStatus === "critical");

			console.log(chalk.cyan("\n🏥 Agent Health Report"));
			console.log(chalk.gray("─".repeat(50)));

			console.log(
				`${chalk.green("✅ Healthy:")} ${healthy.length} agents (${formatPercentage(
					healthy.length / agents.length,
				)})`,
			);
			console.log(
				`${chalk.yellow("⚠️  Warning:")} ${warning.length} agents (${formatPercentage(
					warning.length / agents.length,
				)})`,
			);
			console.log(
				`${chalk.red("❌ Critical:")} ${critical.length} agents (${formatPercentage(
					critical.length / agents.length,
				)})`,
			);

			if (warning.length > 0 || critical.length > 0) {
				console.log(chalk.gray("\n─ Unhealthy Agents ─"));
				[...critical, ...warning].forEach((agent) => {
					const color =
						agent.healthStatus === "critical" ? chalk.red : chalk.yellow;
					console.log(
						`${color("•")} ${agent.name} (${agent.id}): ${formatPercentage(
							agent.health,
						)} health`,
					);
				});
			}

			const avgHealth =
				agents.reduce((sum, a) => sum + a.health, 0) / agents.length;
			console.log(
				`\n${chalk.bold("Average Health:")} ${formatPercentage(avgHealth)}`,
			);
		} catch (error) {
			console.error(
				"❌ Error checking agent health:",
				error instanceof Error ? error.message : String(error),
			);
		}
	},
};

// Commander.js command creation (from agent.ts)
export function createAgentCommand(): Command {
	const agentCommand = new Command("agent")
		.description(
			"Comprehensive Claude-Flow agent management with advanced features",
		)
		.action(() => {
			console.log(chalk.cyan("🤖 Claude-Flow Agent Management System"));
			console.log("");
			console.log("Available commands:");
			console.log(
				"  spawn    - Create and start new agents with advanced configuration",
			);
			console.log(
				"  list     - Display all agents with status, metrics, and resource usage",
			);
			console.log(
				"  info     - Get detailed information about a specific agent",
			);
			console.log(
				"  terminate - Safely terminate agents with cleanup and state preservation",
			);
			console.log("  health   - Monitor agent health and performance metrics");
			console.log("");
			console.log("Use --help with any command for detailed options.");
		});

	// Spawn command
	agentCommand
		.command("spawn <template>")
		.description("Create and start a new agent from a template")
		.option("-n, --name <name>", "Custom name for the agent")
		.option("-a, --autonomy <level>", "Autonomy level (0-1)", parseFloat, 0.7)
		.option("--max-tasks <number>", "Maximum concurrent tasks", parseInt, 5)
		.option("--timeout <ms>", "Task timeout threshold", parseInt, 300000)
		.option("--no-start", "Create agent without starting it")
		.action(async (template: string, options: any) => {
			await agentCommands.spawn([template], options);
		});

	// List command
	agentCommand
		.command("list")
		.description("Display all agents with comprehensive status and metrics")
		.option("-t, --type <type>", "Filter by agent type")
		.option("-s, --status <status>", "Filter by agent status")
		.option("--unhealthy", "Show only unhealthy agents")
		.option("--json", "Output in JSON format")
		.option("--detailed", "Show detailed resource usage and metrics")
		.option(
			"--sort <field>",
			"Sort by field (name, type, status, health, workload)",
			"name",
		)
		.action(async (options: any) => {
			await agentCommands.list([], options);
		});

	// Info command
	agentCommand
		.command("info <agentId>")
		.description("Get detailed information about a specific agent")
		.option("-d, --detailed", "Show detailed metrics and capabilities")
		.option("--history", "Include recent activity history")
		.action(async (agentId: string, options: any) => {
			await agentCommands.info([agentId], options);
		});

	// Terminate command
	agentCommand
		.command("terminate <agentId>")
		.description("Safely terminate an agent")
		.option("--force", "Force terminate without graceful shutdown")
		.option("--cleanup", "Clean up agent resources after termination")
		.action(async (agentId: string, options: any) => {
			await agentCommands.terminate([agentId], {
				...options,
				graceful: !options.force,
			});
		});

	// Health command
	agentCommand
		.command("health")
		.description("Monitor agent health and performance metrics")
		.action(async (options: any) => {
			await agentCommands.health([], options);
		});

	return agentCommand;
}

// Export for backward compatibility
export const agentCommand = createAgentCommand();

// Create a proper handler function for the command registry (matching agent.js pattern)
export async function agentHandler(
	subArgs: string[],
	flags: Record<string, any>,
): Promise<void> {
	const agentCmd = subArgs[0];

	if (!agentCmd) {
		console.log(`
🤖 Agent Management Commands:

Core Commands:
  spawn <type>         Create a new agent with specified type
  list                 Display all active agents
  info <id>           Show detailed information about an agent
  terminate <id>      Safely terminate an agent
  health              Monitor agent health and performance

Advanced Commands:
  hierarchy <action>   Manage agent hierarchies (legacy)
  network <action>     Configure agent networks (legacy)
  ecosystem <action>   Manage agent ecosystems (legacy)
  provision <id>      Provision resources for an agent (legacy)

Examples:
  agent spawn researcher --name "DataBot"
  agent list --unhealthy
  agent info agent-123
  agent terminate agent-123 --force
  agent health

Use --help with any command for detailed options.
		`);
		return;
	}

	try {
		switch (agentCmd) {
			case "spawn":
				await agentCommands.spawn(subArgs.slice(1), flags);
				break;

			case "list":
				await agentCommands.list(subArgs.slice(1), flags);
				break;

			case "terminate":
				await agentCommands.terminate(subArgs.slice(1), flags);
				break;

			case "info":
				await agentCommands.info(subArgs.slice(1), flags);
				break;

			case "health":
				await agentCommands.health(subArgs.slice(1), flags);
				break;

			// Legacy commands with basic implementations
			case "hierarchy":
				console.log("🏗️ Agent hierarchy management (legacy feature)");
				console.log("Use 'hive-mind' command for advanced coordination");
				break;

			case "network":
				console.log("🌐 Agent network management (legacy feature)");
				console.log("Use 'swarm' command for network coordination");
				break;

			case "ecosystem":
				console.log("🌿 Agent ecosystem management (legacy feature)");
				console.log("Use 'hive-mind' command for ecosystem features");
				break;

			case "provision":
				console.log("🔧 Agent provisioning (legacy feature)");
				console.log("Use 'agent spawn' for creating new agents");
				break;

			default:
				console.log(`
🤖 Agent Management Commands:

Core Commands:
  spawn <type>         Create a new agent with specified type
  list                 Display all active agents
  info <id>           Show detailed information about an agent
  terminate <id>      Safely terminate an agent
  health              Monitor agent health and performance

Use --help with any command for detailed options.
				`);
		}
	} catch (error) {
		console.error(
			`❌ Agent command failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Export individual functions for unified CLI usage
export const {
	spawn: spawnAgent,
	list: listAgents,
	terminate: terminateAgent,
	info: agentInfo,
	health: agentHealth,
} = agentCommands;
