#!/usr/bin/env node

/**
 * Hive Mind Agent Spawn Command
 *
 * Spawns specialized agents into the Hive Mind swarm
 * with automatic capability assignment and coordination.
 */

import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import ora from "ora";
import { HiveMind } from "../../../hive-mind/core/HiveMind.js";
import type { AgentCapability, AgentType } from "../../../hive-mind/types.js";
import {
	formatError,
	formatInfo,
	formatSuccess,
	formatWarning,
} from "../../formatter.js";

const AGENT_TYPES: AgentType[] = [
	"coordinator",
	"researcher",
	"coder",
	"analyst",
	"architect",
	"tester",
	"reviewer",
	"optimizer",
	"documenter",
	"monitor",
	"specialist",
];

const CAPABILITY_MAP: Record<AgentType, AgentCapability[]> = {
	coordinator: ["task_management", "resource_allocation", "consensus_building"],
	researcher: [
		"information_gathering",
		"pattern_recognition",
		"knowledge_synthesis",
	],
	coder: ["code_generation", "refactoring", "debugging"],
	analyst: ["data_analysis", "performance_metrics", "bottleneck_detection"],
	architect: ["system_design", "architecture_patterns", "integration_planning"],
	tester: ["test_generation", "quality_assurance", "edge_case_detection"],
	reviewer: ["code_review", "standards_enforcement", "best_practices"],
	optimizer: [
		"performance_optimization",
		"resource_optimization",
		"algorithm_improvement",
	],
	documenter: ["documentation_generation", "api_docs", "user_guides"],
	monitor: ["system_monitoring", "health_checks", "alerting"],
	specialist: ["domain_expertise", "custom_capabilities", "problem_solving"],
};

export const spawnCommand = new Command("spawn")
	.description("Spawn specialized agents into the Hive Mind")
	.argument("[type]", "Agent type to spawn")
	.option("-n, --name <string>", "Custom agent name")
	.option(
		"-c, --capabilities <items>",
		"Additional capabilities (comma-separated)"
	)
	.option("-s, --swarm-id <id>", "Target swarm ID")
	.option("-i, --interactive", "Interactive spawn mode", false)
	.option("-b, --batch <number>", "Spawn multiple agents of same type", "1")
	.option("--auto-assign", "Automatically assign to available tasks", false)
	.action(async (type, _options) => {
		const spinner = ora("Spawning agent...").start();

		try {
			// Get or prompt for swarm ID,
			const swarmId = _options.swarmId || (await getActiveSwarmId());
			if (!swarmId) {
				throw new Error("No active swarm found. Initialize a Hive Mind first.");
			}

			// Interactive mode,
			if (_options.interactive || !type) {
				const answers = await inquirer.prompt([
					{
						type: "list",
						name: "type",
						message: "Select agent type:",
						choices: AGENT_TYPES,
						when: !type,
					},
					{
						type: "checkbox",
						name: "additionalCapabilities",
						message: "Select additional capabilities:",
						choices: getAllCapabilities(),
						when: (answers) => {
							const agentType = type || answers.type;
							return agentType === "specialist";
						},
					},
					{
						type: "input",
						name: "customName",
						message: "Enter custom agent name (optional):",
						when: !_options.name,
					},
				]);

				type = type || answers.type;
				_options.name = _options.name || answers.customName;
				if (answers.additionalCapabilities) {
					_options.capabilities = answers.additionalCapabilities.join(",");
				}
			}

			// Validate agent type,
			if (!AGENT_TYPES.includes(type as AgentType)) {
				throw new Error(`Invalid agent type: ${type}`);
			}

			// Load Hive Mind,
			const hiveMind = await HiveMind.load(swarmId);

			// Determine capabilities,
			const baseCapabilities = CAPABILITY_MAP[type as AgentType] || [];
			const additionalCapabilities = _options.capabilities
				? _options.capabilities.split(",").map((c: string) => c.trim())
				: [];
			const capabilities = [...baseCapabilities, ...additionalCapabilities];

			// Spawn agents,
			const batchSize = parseInt(_options.batch, 10);
			const spawnedAgents = [];

			for (let i = 0; i < batchSize; i++) {
				const agentName = _options.name || `${type}-${Date.now()}-${i}`;
				const agent = await hiveMind.spawnAgent({
					type: type as AgentType,
					name: agentName,
					capabilities,
					autoAssign: _options.autoAssign,
				});

				spawnedAgents.push(agent);

				if (batchSize > 1) {
					spinner.text = `Spawning agents... (${i + 1}/${batchSize})`;
				}
			}

			spinner.succeed(
				formatSuccess(`Successfully spawned ${batchSize} ${type} agent(s)!`)
			);

			// Display spawned agents,
			console.log("\n" + chalk.bold("🤖 Spawned Agents:"));
			spawnedAgents.forEach((agent) => {
				console.log(formatInfo(`${agent.name} (${agent.id})`));
				console.log(
					chalk.gray(`  Capabilities: ${agent.capabilities.join(", ")}`)
				);
				if (agent.currentTask) {
					console.log(chalk.yellow(`  Assigned to: ${agent.currentTask}`));
				}
			});

			// Show swarm stats,
			const stats = await hiveMind.getStats();
			console.log("\n" + chalk.bold("📊 Swarm Statistics:"));
			console.log(formatInfo(`Total Agents: ${stats.totalAgents}`));
			console.log(formatInfo(`Active Agents: ${stats.activeAgents}`));
			console.log(
				formatInfo(`Available Capacity: ${stats.availableCapacity}%`)
			);

			if (_options.autoAssign && stats.pendingTasks > 0) {
				console.log(
					formatWarning(
						`Auto-assigned to ${stats.pendingTasks} pending task(s)`
					)
				);
			}
		} catch (error) {
			spinner.fail(formatError("Failed to spawn agent"));
			console.error(formatError((error as Error).message));
			process.exit(1);
		}
	});

async function getActiveSwarmId(): Promise<string | null> {
	const { DatabaseManager } = await import(
		"../../../hive-mind/core/DatabaseManager.js"
	);
	const db = await DatabaseManager.getInstance();
	return db.getActiveSwarmId();
}

function getAllCapabilities(): string[] {
	const allCapabilities = new Set<string>();
	Object.values(CAPABILITY_MAP).forEach((caps) => {
		caps.forEach((cap) => allCapabilities.add(cap));
	});
	return Array.from(allCapabilities);
}
