import chalk from "chalk/index.js";
import inquirer from "inquirer";
import { isInteractive } from "../../../utils/interactive-detector.js";
import {
	type HiveMindFlags,
	showConsensus,
	showMetrics,
	showStatus,
	spawnSwarm,
} from "../index.js";

/**
 * Interactive wizard for hive mind operations
 */
// Wrapped wizard function that handles non-interactive environments
export const hiveMindWizard = async (flags = {}) => {
	if (isInteractive()) {
		// Interactive version
		console.log(chalk.yellow("\n🧙 Hive Mind Interactive Wizard\n"));

		const { action } = await inquirer.prompt([
			{
				type: "list",
				name: "action",
				message: "What would you like to do?",
				choices: [
					{ name: "🐝 Create new swarm", value: "spawn" },
					{ name: "📊 View swarm status", value: "status" },
					{ name: "🧠 Manage collective memory", value: "memory" },
					{ name: "🤝 View consensus decisions", value: "consensus" },
					{ name: "📈 Performance metrics", value: "metrics" },
					{ name: "🔧 Configure hive mind", value: "config" },
					{ name: "❌ Exit", value: "exit" },
				],
			},
		]);

		switch (action) {
			case "spawn":
				await spawnSwarmWizard();
				break;
			case "status":
				await showStatus({});
				break;
			case "memory":
				await manageMemoryWizard();
				break;
			case "consensus":
				await showConsensus({});
				break;
			case "metrics":
				await showMetrics({});
				break;
			case "config":
				await configureWizard();
				break;
			case "exit":
				console.log(chalk.gray("Exiting wizard..."));
				break;
		}
	} else {
		// Non-interactive fallback
		console.log(chalk.yellow("\n🧙 Hive Mind - Non-Interactive Mode\n"));

		// Default to creating a swarm with sensible defaults
		console.log(chalk.cyan("Creating new swarm with default settings..."));
		console.log(chalk.gray("Use command-line flags to customize:"));
		console.log(chalk.gray('  --objective "Your task"    Set swarm objective'));
		console.log(chalk.gray("  --queen-type strategic     Set queen type"));
		console.log(chalk.gray("  --max-workers 8            Set worker count"));
		console.log(
			chalk.gray("  --agents 8                 Set worker count (alias)"),
		);
		console.log(
			chalk.gray("  --consensus majority       Set consensus algorithm"),
		);
		console.log();

		const objective =
			(flags as HiveMindFlags).objective || "General task coordination";

		// Validate and parse maxWorkers with all supported aliases
		function validateMaxWorkers(flags: HiveMindFlags): number {
			const value = flags.maxWorkers || flags["max-workers"] || flags.agents;
			console.log(
				chalk.gray(
					`🔍 [DEBUG] Parameter parsing: maxWorkers=${flags.maxWorkers}, max-workers=${flags["max-workers"]}, agents=${flags.agents}`,
				),
			);
			console.log(chalk.gray(`🔍 [DEBUG] Resolved value: ${value}`));

			if (value !== undefined && value !== null && String(value) !== "") {
				const parsed = parseInt(String(value), 10);
				if (isNaN(parsed) || parsed < 1 || parsed > 100) {
					throw new Error(
						`Invalid agent count: ${value}. Must be between 1 and 100.`,
					);
				}
				console.log(
					chalk.green(`✅ [DEBUG] maxWorkers validated and set to: ${parsed}`),
				);
				return parsed;
			}
			console.log(
				chalk.yellow(
					`⚠️ [DEBUG] No maxWorkers parameter provided, using default: 8`,
				),
			);
			return 8; // Default when no value provided
		}

		const config = {
			name: (flags as HiveMindFlags).name || `swarm-${Date.now()}`,
			queenType:
				(flags as HiveMindFlags).queenType ||
				(flags as HiveMindFlags)["queen-type"] ||
				"strategic",
			maxWorkers: validateMaxWorkers(flags),
			consensusAlgorithm: (flags as HiveMindFlags).consensus || "majority",
			autoScale:
				(flags as HiveMindFlags).autoScale ||
				(flags as HiveMindFlags)["auto-scale"] ||
				false,
			encryption: (flags as HiveMindFlags).encryption || false,
		};

		await spawnSwarm([objective], {
			...flags,
			name: config.name,
			queenType: config.queenType,
			maxWorkers: config.maxWorkers,
			consensusAlgorithm: config.consensusAlgorithm,
			autoScale: config.autoScale,
			encryption: config.encryption,
			nonInteractive: true,
		});
	}
};

/**
 * Spawn swarm wizard
 */
export async function spawnSwarmWizard() {
	const answers = await inquirer.prompt([
		{
			type: "input",
			name: "objective",
			message: "What is the swarm objective?",
			validate: (input) =>
				input.trim().length > 0 || "Please enter an objective",
		},
		{
			type: "input",
			name: "name",
			message: "Swarm name (optional):",
			default: (answers: any) => `swarm-${Date.now()}`,
		},
		{
			type: "list",
			name: "queenType",
			message: "Select queen coordinator type:",
			choices: [
				{
					name: "Strategic - High-level planning and coordination",
					value: "strategic",
				},
				{ name: "Tactical - Detailed task management", value: "tactical" },
				{ name: "Adaptive - Learns and adapts strategies", value: "adaptive" },
			],
			default: "strategic",
		},
		{
			type: "number",
			name: "maxWorkers",
			message: "Maximum number of worker agents:",
			default: 8,
			validate: (input) =>
				(input > 0 && input <= 20) || "Please enter a number between 1 and 20",
		},
		{
			type: "checkbox",
			name: "workerTypes",
			message: "Select worker agent types:",
			choices: [
				{ name: "Researcher", value: "researcher", checked: true },
				{ name: "Coder", value: "coder", checked: true },
				{ name: "Analyst", value: "analyst", checked: true },
				{ name: "Tester", value: "tester", checked: true },
				{ name: "Architect", value: "architect" },
				{ name: "Reviewer", value: "reviewer" },
				{ name: "Optimizer", value: "optimizer" },
				{ name: "Documenter", value: "documenter" },
			],
		},
		{
			type: "list",
			name: "consensusAlgorithm",
			message: "Consensus algorithm for decisions:",
			choices: [
				{ name: "Majority - Simple majority voting", value: "majority" },
				{ name: "Weighted - Expertise-weighted voting", value: "weighted" },
				{ name: "Byzantine - Fault-tolerant consensus", value: "byzantine" },
			],
			default: "majority",
		},
		{
			type: "confirm",
			name: "autoScale",
			message: "Enable auto-scaling?",
			default: true,
		},
		{
			type: "confirm",
			name: "monitor",
			message: "Launch monitoring dashboard?",
			default: true,
		},
	]);

	// Spawn the swarm with collected parameters
	await spawnSwarm([answers.objective], {
		name: answers.name,
		queenType: answers.queenType,
		maxWorkers: answers.maxWorkers,
		workerTypes: answers.workerTypes.join(","),
		consensus: answers.consensusAlgorithm,
		autoScale: answers.autoScale,
		monitor: answers.monitor,
	});
}

/**
 * Manage collective memory wizard
 */
export async function manageMemoryWizard() {
	console.log(chalk.blue("\n🧠 Collective Memory Management\n"));

	const { action } = await inquirer.prompt([
		{
			type: "list",
			name: "action",
			message: "What would you like to do with collective memory?",
			choices: [
				{ name: "📋 View all memories", value: "list" },
				{ name: "🔍 Search memories", value: "search" },
				{ name: "💾 Store new memory", value: "store" },
				{ name: "📊 Memory statistics", value: "stats" },
				{ name: "🗑️ Clean old memories", value: "clean" },
				{ name: "📤 Export memory backup", value: "export" },
				{ name: "⬅️ Back to main menu", value: "back" },
			],
		},
	]);

	switch (action) {
		case "list":
			await listMemories();
			break;
		case "search":
			await searchMemories();
			break;
		case "store":
			await storeMemoryWizard();
			break;
		case "stats":
			await showMemoryStats();
			break;
		case "clean":
			await cleanMemories();
			break;
		case "export":
			await exportMemoryBackup();
			break;
		case "back":
			await hiveMindWizard();
			return;
	}

	// Ask if user wants to continue
	const { continue: continueAction } = await inquirer.prompt([
		{
			type: "confirm",
			name: "continue",
			message: "Would you like to perform another memory operation?",
			default: true,
		},
	]);

	if (continueAction) {
		await manageMemoryWizard();
	}
}

/**
 * Configure hive mind wizard
 */
export async function configureWizard() {
	// TODO: Implement configuration wizard
	console.log(chalk.yellow("Configuration wizard coming soon..."));
}
