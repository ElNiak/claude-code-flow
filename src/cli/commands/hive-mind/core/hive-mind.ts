/**
 * Hive Mind command for Claude-Flow v2.0.0
 * Advanced swarm intelligence with collective decision-making
 */

// Import SQLite for persistence
import Database from "better-sqlite3";
import chalk from "chalk";
import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import inquirer from "inquirer";
import ora from "ora";
import path from "path";
import readline from "readline";
import {
	args,
	cwd,
	exit,
	mkdirAsync,
	readTextFile,
	writeTextFile,
} from "../node-compat.js";
import {
	checkNonInteractiveAuth,
	isInteractive,
	isRawModeSupported,
	warnNonInteractive,
} from "../utils/interactive-detector.js";
import {
	nonInteractiveProgress,
	nonInteractiveSelect,
	safeInteractive,
} from "../utils/safe-interactive.js";
import { SwarmCommunication } from "./hive-mind/communication.js";
import { HiveMindCore } from "./hive-mind/core.js";
// Import MCP tool wrappers
import { MCPToolWrapper } from "./hive-mind/mcp-wrapper.js";
import { CollectiveMemory } from "./hive-mind/memory.js";
import { QueenCoordinator } from "./hive-mind/queen.js";

function showHiveMindHelp() {
	console.log(`
${chalk.yellow("🧠 Claude Flow Hive Mind System")}

${chalk.bold("USAGE:")}
  claude-flow hive-mind [subcommand] [options]

${chalk.bold("SUBCOMMANDS:")}
  ${chalk.green("init")}         Initialize hive mind system
  ${chalk.green("spawn")}        Spawn hive mind swarm with intelligent agent auto-selection
  ${chalk.green("status")}       Show hive mind status
  ${chalk.green("consensus")}    View consensus decisions or trigger manual consensus
  ${chalk.green("memory")}       Manage collective memory
  ${chalk.green("metrics")}      View performance metrics
  ${chalk.green("wizard")}       Interactive hive mind wizard

${chalk.bold("CONSENSUS COMMANDS:")}
  ${chalk.cyan("# View recent consensus decisions")}
  claude-flow hive-mind consensus

  ${chalk.cyan("# Manual consensus decision")}
  claude-flow hive-mind consensus --decide "Should we use REST or GraphQL?" --options "REST,GraphQL,Both"

  ${chalk.cyan("# Quick team vote")}
  claude-flow hive-mind consensus --topic "Deploy now?" --options "yes,no,wait" --quick

  ${chalk.cyan("# Strategic consensus with specific queen type")}
  claude-flow hive-mind consensus --decide "Architecture approach" --options "microservices,monolith,hybrid" --queen-type strategic --agents 8

${chalk.bold("EXAMPLES:")}
  ${chalk.gray("# Initialize hive mind")}
  claude-flow hive-mind init

  ${chalk.gray("# Spawn swarm with interactive wizard")}
  claude-flow hive-mind spawn

  ${chalk.gray("# Intelligent auto-selection based on objective")}
  claude-flow hive-mind spawn "Build microservices architecture"

  ${chalk.gray("# Manual worker type specification")}
  claude-flow hive-mind spawn "Build API" --worker-types "researcher,coder,architect,tester"

  ${chalk.gray("# View current status")}
  claude-flow hive-mind status

  ${chalk.gray("# Interactive wizard")}
  claude-flow hive-mind wizard

  ${chalk.gray("# Spawn with Claude Code coordination")}
  claude-flow hive-mind spawn "Build REST API" --claude

  ${chalk.gray("# Auto-spawn coordinated Claude Code instances")}
  claude-flow hive-mind spawn "Research AI trends" --auto-spawn --verbose

${chalk.bold("KEY FEATURES:")}
  ${chalk.cyan("🐝")} Queen-led coordination with worker specialization
  ${chalk.cyan("🧠")} Collective memory and knowledge sharing
  ${chalk.cyan("🤝")} Consensus building for critical decisions
  ${chalk.cyan("⚡")} Parallel task execution with auto-scaling
  ${chalk.cyan("🔄")} Work stealing and load balancing
  ${chalk.cyan("📊")} Real-time metrics and performance tracking
  ${chalk.cyan("🛡️")} Fault tolerance and self-healing
  ${chalk.cyan("🔒")} Secure communication between agents

${chalk.bold("OPTIONS:")}
  --queen-type <type>    Queen coordinator type (strategic, tactical, adaptive)
  --max-workers <n>      Maximum worker agents (default: 8)
  --consensus <type>     Consensus algorithm (majority, weighted, byzantine)
  --memory-size <mb>     Collective memory size in MB (default: 100)
  --auto-scale           Enable auto-scaling based on workload
  --encryption           Enable encrypted communication
  --monitor              Real-time monitoring dashboard
  --verbose              Detailed logging
  --claude               Generate Claude Code spawn commands with coordination
  --spawn                Alias for --claude
  --auto-spawn           Automatically spawn Claude Code instances
  --execute              Execute Claude Code spawn commands immediately
  --auto                 (Deprecated: auto-permissions enabled by default)
  --no-auto-permissions  Disable automatic --dangerously-skip-permissions

${chalk.bold("For more information:")}
${chalk.blue("https://github.com/ruvnet/claude-flow/tree/main/docs/hive-mind")}
`);
}

/**
 * Initialize hive mind system
 */
async function initHiveMind(flags) {
	const spinner = ora("Initializing Hive Mind system...").start();

	try {
		// Create hive mind directory structure
		const hiveMindDir = path.join(cwd(), ".hive-mind");
		if (!existsSync(hiveMindDir)) {
			mkdirSync(hiveMindDir, { recursive: true });
		}

		// Initialize SQLite database
		const dbPath = path.join(hiveMindDir, "hive.db");
		const db = new Database(dbPath);

		// Create tables
		db.exec(`
      CREATE TABLE IF NOT EXISTS swarms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        objective TEXT,
        status TEXT DEFAULT 'active',
        queen_type TEXT DEFAULT 'strategic',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        role TEXT,
        status TEXT DEFAULT 'idle',
        capabilities TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        agent_id TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );

      CREATE TABLE IF NOT EXISTS collective_memory (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        key TEXT NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'knowledge',
        confidence REAL DEFAULT 1.0,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_at DATETIME,
        access_count INTEGER DEFAULT 0,
        compressed INTEGER DEFAULT 0,
        size INTEGER DEFAULT 0,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );

      CREATE TABLE IF NOT EXISTS consensus_decisions (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        topic TEXT NOT NULL,
        decision TEXT,
        votes TEXT,
        algorithm TEXT DEFAULT 'majority',
        confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );
    `);

		db.close();

		// Create configuration file
		const config = {
			version: "2.0.0",
			initialized: new Date().toISOString(),
			defaults: {
				queenType: "strategic",
				maxWorkers: 8,
				consensusAlgorithm: "majority",
				memorySize: 100,
				autoScale: true,
				encryption: false,
			},
			mcpTools: {
				enabled: true,
				parallel: true,
				timeout: 60000,
			},
		};

		await writeFile(
			path.join(hiveMindDir, "config.json"),
			JSON.stringify(config, null, 2),
		);

		spinner.succeed("Hive Mind system initialized successfully!");

		console.log("\n" + chalk.green("✓") + " Created .hive-mind directory");
		console.log(chalk.green("✓") + " Initialized SQLite database");
		console.log(chalk.green("✓") + " Created configuration file");
		console.log("\n" + chalk.yellow("Next steps:"));
		console.log(
			"  1. Run " +
				chalk.cyan("claude-flow hive-mind spawn") +
				" to create your first swarm",
		);
		console.log(
			"  2. Use " +
				chalk.cyan("claude-flow hive-mind wizard") +
				" for interactive setup",
		);
	} catch (error) {
		spinner.fail("Failed to initialize Hive Mind system");
		console.error(chalk.red("Error:"), error.message);
		exit(1);
	}
}

/**
 * Interactive wizard for hive mind operations
 */
// Wrapped wizard function that handles non-interactive environments
const hiveMindWizard = safeInteractive(
	// Interactive version
	async (flags = {}) => {
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
	},
	// Non-interactive fallback
	async (flags = {}) => {
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

		const objective = flags.objective || "General task coordination";

		// Validate and parse maxWorkers with all supported aliases
		function validateMaxWorkers(flags) {
			const value = flags.maxWorkers || flags["max-workers"] || flags.agents;
			console.log(
				chalk.gray(
					`🔍 [DEBUG] Parameter parsing: maxWorkers=${flags.maxWorkers}, max-workers=${flags["max-workers"]}, agents=${flags.agents}`,
				),
			);
			console.log(chalk.gray(`🔍 [DEBUG] Resolved value: ${value}`));

			if (value !== undefined && value !== null && value !== "") {
				const parsed = parseInt(value, 10);
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
			name: flags.name || `swarm-${Date.now()}`,
			queenType: flags.queenType || flags["queen-type"] || "strategic",
			maxWorkers: validateMaxWorkers(flags),
			consensusAlgorithm: flags.consensus || "majority",
			autoScale: flags.autoScale || flags["auto-scale"] || false,
			encryption: flags.encryption || false,
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
	},
);

/**
 * Spawn swarm wizard
 */
async function spawnSwarmWizard() {
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
			default: (answers) => `swarm-${Date.now()}`,
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
 * Spawn a hive mind swarm
 */
async function spawnSwarm(args, flags) {
	const objective = args.join(" ").trim();

	if (!objective && !flags.wizard) {
		console.error(
			chalk.red("Error: Please provide an objective or use --wizard flag"),
		);
		console.log('Example: claude-flow hive-mind spawn "Build REST API"');
		return;
	}

	const spinner = ora("Spawning Hive Mind swarm...").start();

	try {
		// Initialize hive mind core with error handling
		let hiveMind;
		try {
			spinner.text = "Initializing Hive Mind Core...";
			// Validate and parse parameters with all supported aliases
			function validateHiveMindParams(flags) {
				console.log(chalk.gray(`🔍 [DEBUG] HiveMindCore parameter parsing:`));
				console.log(chalk.gray(`  - maxWorkers: ${flags.maxWorkers}`));
				console.log(chalk.gray(`  - max-workers: ${flags["max-workers"]}`));
				console.log(chalk.gray(`  - agents: ${flags.agents}`));
				console.log(chalk.gray(`  - queenType: ${flags.queenType}`));
				console.log(chalk.gray(`  - queen-type: ${flags["queen-type"]}`));
				console.log(chalk.gray(`  - consensus: ${flags.consensus}`));
				console.log(
					chalk.gray(`  - consensusAlgorithm: ${flags.consensusAlgorithm}`),
				);

				const maxWorkers =
					flags.maxWorkers || flags["max-workers"] || flags.agents;
				let parsedMaxWorkers = 8; // default

				if (
					maxWorkers !== undefined &&
					maxWorkers !== null &&
					maxWorkers !== ""
				) {
					parsedMaxWorkers = parseInt(maxWorkers, 10);
					if (
						isNaN(parsedMaxWorkers) ||
						parsedMaxWorkers < 1 ||
						parsedMaxWorkers > 100
					) {
						throw new Error(
							`Invalid agent count: ${maxWorkers}. Must be between 1 and 100.`,
						);
					}
				}

				const result = {
					queenType: flags.queenType || flags["queen-type"] || "strategic",
					maxWorkers: parsedMaxWorkers,
					consensusAlgorithm:
						flags.consensus || flags.consensusAlgorithm || "majority",
				};

				console.log(
					chalk.green(`✅ [DEBUG] HiveMindCore parameters resolved:`),
				);
				console.log(chalk.green(`  - queenType: ${result.queenType}`));
				console.log(chalk.green(`  - maxWorkers: ${result.maxWorkers}`));
				console.log(
					chalk.green(`  - consensusAlgorithm: ${result.consensusAlgorithm}`),
				);

				return result;
			}

			const params = validateHiveMindParams(flags);

			hiveMind = new HiveMindCore({
				objective,
				name: flags.name || `hive-${Date.now()}`,
				queenType: params.queenType,
				maxWorkers: params.maxWorkers,
				consensusAlgorithm: params.consensusAlgorithm,
				autoScale: flags.autoScale !== false,
				encryption: flags.encryption || false,
			});
		} catch (error) {
			console.error("HiveMindCore initialization failed:", error);
			throw new Error(`Failed to initialize HiveMindCore: ${error.message}`);
		}

		spinner.text = "Setting up database connection...";
		// Initialize database connection
		const dbDir = path.join(cwd(), ".hive-mind");
		const dbPath = path.join(dbDir, "hive.db");

		// Ensure .hive-mind directory exists
		if (!existsSync(dbDir)) {
			mkdirSync(dbDir, { recursive: true });
		}

		// Check if database file exists and try to create a clean one if needed
		let db;
		try {
			spinner.text = "Creating database connection...";
			db = new Database(dbPath);
			// Test the database with a simple query
			db.prepare("SELECT 1").get();
			spinner.text = "Database connection established";
		} catch (error) {
			console.warn("Database issue detected, recreating...", error.message);
			spinner.text = "Recreating database...";
			// Remove corrupted database
			if (existsSync(dbPath)) {
				try {
					const fs = await import("fs");
					fs.unlinkSync(dbPath);
				} catch (e) {
					console.warn("Could not remove corrupted database:", e.message);
				}
			}
			// Create new database
			db = new Database(dbPath);
		}

		// Initialize database schema if not exists
		spinner.text = "Creating database schema...";
		try {
			db.exec(`
      CREATE TABLE IF NOT EXISTS swarms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        objective TEXT,
        queen_type TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        swarm_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'idle',
        capabilities TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        swarm_id TEXT NOT NULL,
        agent_id TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );

      CREATE TABLE IF NOT EXISTS collective_memory (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        key TEXT NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'knowledge',
        confidence REAL DEFAULT 1.0,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_at DATETIME,
        access_count INTEGER DEFAULT 0,
        compressed INTEGER DEFAULT 0,
        size INTEGER DEFAULT 0,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );

      CREATE TABLE IF NOT EXISTS consensus_decisions (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        topic TEXT NOT NULL,
        decision TEXT,
        votes TEXT,
        algorithm TEXT DEFAULT 'majority',
        confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );
    `);
			spinner.text = "Database schema created successfully";
		} catch (error) {
			console.error("Database schema creation failed:", error);
			throw new Error(`Failed to create database schema: ${error.message}`);
		}

		// Create swarm record with safe ID generation
		spinner.text = "Creating swarm record...";
		const timestamp = Date.now();
		const randomPart = Math.random().toString(36).substring(2, 11); // Use substring instead of substr
		const swarmId = `swarm-${timestamp}-${randomPart}`;
		try {
			db.prepare(`
        INSERT INTO swarms (id, name, objective, queen_type)
        VALUES (?, ?, ?, ?)
      `).run(
				swarmId,
				hiveMind.config.name,
				objective,
				hiveMind.config.queenType,
			);
		} catch (error) {
			console.error("Failed to create swarm record:", error);
			throw new Error(`Failed to create swarm record: ${error.message}`);
		}

		spinner.text = "Initializing Queen coordinator...";

		// Initialize Queen
		const queen = new QueenCoordinator({
			swarmId,
			type: hiveMind.config.queenType,
			objective,
		});

		// Spawn Queen agent
		const queenAgent = {
			id: `queen-${swarmId}`,
			swarmId,
			name: "Queen Coordinator",
			type: "coordinator",
			role: "queen",
			status: "active",
			capabilities: JSON.stringify([
				"coordination",
				"planning",
				"decision-making",
			]),
		};

		db.prepare(`
      INSERT INTO agents (id, swarm_id, name, type, role, status, capabilities)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(...Object.values(queenAgent));

		spinner.text = "Spawning worker agents...";

		// 🧠 INTELLIGENT AGENT AUTO-SELECTION
		const workerTypes = await determineOptimalWorkerTypes(
			flags,
			objective,
			queen,
		);

		// Spawn worker agents
		console.log(chalk.gray(`🔍 [DEBUG] Worker spawning configuration:`));
		console.log(
			chalk.gray(
				`  - hiveMind.config.maxWorkers: ${hiveMind.config.maxWorkers}`,
			),
		);
		console.log(
			chalk.gray(`  - Available workerTypes: [${workerTypes.join(", ")}]`),
		);
		console.log(
			chalk.gray(`  - Will spawn ${hiveMind.config.maxWorkers} workers total`),
		);

		const workers = [];
		for (let i = 0; i < hiveMind.config.maxWorkers; i++) {
			const workerType = workerTypes[i % workerTypes.length];
			console.log(
				chalk.gray(
					`🔍 [DEBUG] Spawning worker ${i + 1}/${hiveMind.config.maxWorkers}: type="${workerType}"`,
				),
			);
			const workerId = `worker-${swarmId}-${i}`;

			const worker = {
				id: workerId,
				swarmId,
				name: `${workerType.charAt(0).toUpperCase() + workerType.slice(1)} Worker ${i + 1}`,
				type: workerType,
				role: "worker",
				status: "idle",
				capabilities: JSON.stringify(getAgentCapabilities(workerType)),
			};

			console.log(
				chalk.cyan(`📋 [DEEP DEBUG] Worker ${i + 1} created in memory:`),
			);
			console.log(chalk.gray(`  - ID: ${worker.id}`));
			console.log(chalk.gray(`  - Name: ${worker.name}`));
			console.log(chalk.gray(`  - Type: ${worker.type}`));
			console.log(chalk.gray(`  - Status: ${worker.status}`));

			workers.push(worker);
			console.log(
				chalk.green(
					`✅ [DEEP DEBUG] Worker ${i + 1} added to workers array. Array length: ${workers.length}`,
				),
			);

			db.prepare(`
        INSERT INTO agents (id, swarm_id, name, type, role, status, capabilities)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(...Object.values(worker));
		}

		spinner.text = "Initializing collective memory...";

		// Initialize collective memory
		const memory = new CollectiveMemory({
			swarmId,
			maxSize: flags.memorySize || 100,
		});

		// Store initial context
		console.log(
			chalk.blue(`💾 [DEEP DEBUG] Storing context in collective memory:`),
		);
		console.log(chalk.gray(`  - objective: ${objective}`));
		console.log(chalk.gray(`  - queen_type: ${hiveMind.config.queenType}`));
		console.log(chalk.gray(`  - worker_count: ${workers.length}`));

		memory.store("objective", objective, "context");
		memory.store("queen_type", hiveMind.config.queenType, "config");
		memory.store("worker_count", workers.length, "metrics");

		console.log(chalk.green(`✅ [DEEP DEBUG] Context stored successfully`));

		spinner.text = "Establishing communication channels...";

		// Initialize communication system
		const communication = new SwarmCommunication({
			swarmId,
			encryption: hiveMind.config.encryption,
		});

		db.close();

		spinner.succeed("Hive Mind swarm spawned successfully!");

		// Display swarm summary
		console.log("\n" + chalk.bold("🐝 Swarm Summary:"));
		console.log(chalk.gray("─".repeat(50)));
		console.log(chalk.cyan("Swarm ID:"), swarmId);
		console.log(chalk.cyan("Name:"), hiveMind.config.name);
		console.log(chalk.cyan("Objective:"), objective);
		console.log(chalk.cyan("Queen Type:"), hiveMind.config.queenType);
		console.log(chalk.cyan("Workers:"), workers.length);
		console.log(chalk.cyan("Worker Types:"), workerTypes.join(", "));
		console.log(chalk.cyan("Consensus:"), hiveMind.config.consensusAlgorithm);
		console.log(
			chalk.cyan("Auto-scaling:"),
			hiveMind.config.autoScale ? "Enabled" : "Disabled",
		);
		console.log(chalk.gray("─".repeat(50)));

		// Launch monitoring if requested
		if (flags.monitor) {
			console.log("\n" + chalk.yellow("Launching monitoring dashboard..."));
			// TODO: Implement monitoring dashboard
		}

		// Enhanced coordination instructions with MCP tools
		console.log("\n" + chalk.green("✓") + " Swarm is ready for coordination");
		console.log(
			chalk.gray('Use "claude-flow hive-mind status" to view swarm activity'),
		);

		// Offer to spawn Claude Code instances with coordination instructions
		if (flags.claude || flags.spawn) {
			await spawnClaudeCodeInstances(
				swarmId,
				hiveMind.config.name,
				objective,
				workers,
				flags,
			);
		} else {
			console.log(
				"\n" +
					chalk.blue("💡 Pro Tip:") +
					" Add --claude to spawn coordinated Claude Code instances",
			);
			console.log(
				chalk.gray('   claude-flow hive-mind spawn "objective" --claude'),
			);
		}
	} catch (error) {
		spinner.fail("Failed to spawn Hive Mind swarm");
		console.error(chalk.red("Error:"), error.message);

		// If error contains "sha3", provide specific guidance
		if (error.message.includes("sha3") || error.message.includes("SHA3")) {
			console.error("\n🔍 SHA3 Function Error Detected");
			console.error(
				"This appears to be a SQLite extension or better-sqlite3 configuration issue.",
			);
			console.error("\nPossible solutions:");
			console.error(
				"1. Try removing the corrupted database: rm -rf .hive-mind/",
			);
			console.error(
				"2. Reinstall better-sqlite3: npm reinstall better-sqlite3",
			);
			console.error("3. Check if any SQLite extensions are conflicting");
			console.error("\n🚨 Detailed error:");
			console.error(error.stack || error.message);
		}

		exit(1);
	}
}

/**
 * 🧠 Intelligent Agent Auto-Selection
 * Determines optimal worker types based on objective and queen analysis
 */
async function determineOptimalWorkerTypes(flags, objective, queen) {
	// If user explicitly specified worker types, respect their choice
	if (flags.workerTypes) {
		const userTypes = flags.workerTypes.split(",").map((t) => t.trim());
		console.log(
			chalk.blue("🎯 Using user-specified worker types:"),
			chalk.bold(userTypes.join(", ")),
		);
		return userTypes;
	}

	// Use Queen intelligence to analyze objective and recommend worker types
	console.log(
		chalk.blue("🧠 Analyzing objective for optimal agent selection..."),
	);

	try {
		// Get Queen's analysis of the objective
		const analysis = await queen.analyzeObjective(objective);
		const requiredCapabilities = analysis.requiredCapabilities;
		const complexity = analysis.complexity;

		console.log(chalk.cyan("📊 Queen Analysis Results:"));
		console.log(chalk.gray(`  - Complexity: ${complexity}`));
		console.log(
			chalk.gray(`  - Components: ${analysis.requiredCapabilities.join(", ")}`),
		);
		console.log(chalk.gray(`  - Strategy: ${analysis.recommendedStrategy}`));

		// Start with queen-recommended capabilities
		const recommendedTypes = new Set(requiredCapabilities);

		// Add strategic worker types based on complexity and objective content
		const objectiveLower = objective.toLowerCase();

		// High complexity projects need architects and optimizers
		if (complexity === "high" || complexity === "very_high") {
			recommendedTypes.add("architect");
			recommendedTypes.add("optimizer");
		}

		// Documentation keywords suggest documenter
		if (
			objectiveLower.includes("document") ||
			objectiveLower.includes("guide") ||
			objectiveLower.includes("readme") ||
			objectiveLower.includes("docs")
		) {
			recommendedTypes.add("documenter");
		}

		// Quality/review keywords suggest reviewer
		if (
			objectiveLower.includes("review") ||
			objectiveLower.includes("audit") ||
			objectiveLower.includes("refactor") ||
			complexity !== "low"
		) {
			recommendedTypes.add("reviewer");
		}

		// Enterprise/production keywords suggest additional specialists
		if (
			objectiveLower.includes("enterprise") ||
			objectiveLower.includes("production") ||
			objectiveLower.includes("scale") ||
			objectiveLower.includes("security")
		) {
			recommendedTypes.add("architect");
			recommendedTypes.add("optimizer");
			recommendedTypes.add("tester");
		}

		// API/backend keywords suggest coders and testers
		if (
			objectiveLower.includes("api") ||
			objectiveLower.includes("backend") ||
			objectiveLower.includes("service") ||
			objectiveLower.includes("endpoint")
		) {
			recommendedTypes.add("coder");
			recommendedTypes.add("tester");
		}

		// Frontend/UI keywords suggest coders and reviewers
		if (
			objectiveLower.includes("frontend") ||
			objectiveLower.includes("ui") ||
			objectiveLower.includes("interface") ||
			objectiveLower.includes("web")
		) {
			recommendedTypes.add("coder");
			recommendedTypes.add("reviewer");
		}

		// Database/data keywords suggest analysts and architects
		if (
			objectiveLower.includes("database") ||
			objectiveLower.includes("data") ||
			objectiveLower.includes("storage") ||
			objectiveLower.includes("analytics")
		) {
			recommendedTypes.add("analyst");
			recommendedTypes.add("architect");
		}

		// Always include researcher for initial analysis unless explicitly removed
		recommendedTypes.add("researcher");

		// Convert to array and ensure we have valid types
		const allWorkerTypes = [
			"researcher",
			"coder",
			"architect",
			"analyst",
			"tester",
			"optimizer",
			"documenter",
			"reviewer",
		];
		const finalTypes = Array.from(recommendedTypes).filter((type) =>
			allWorkerTypes.includes(type),
		);

		// Ensure we have at least 3 and at most 8 worker types
		const minTypes = 3;
		const maxTypes = 8;

		if (finalTypes.length < minTypes) {
			// Add essential types if we're under minimum
			const essentialTypes = ["researcher", "coder", "tester"];
			essentialTypes.forEach((type) => {
				if (!finalTypes.includes(type)) {
					finalTypes.push(type);
				}
			});
		}

		if (finalTypes.length > maxTypes) {
			// Prioritize types based on objective analysis
			const priorityOrder = [
				...requiredCapabilities, // Queen's recommendations come first
				"researcher",
				"coder",
				"architect",
				"tester",
				"analyst",
				"optimizer",
				"reviewer",
				"documenter",
			];

			const prioritizedTypes = [];
			priorityOrder.forEach((type) => {
				if (finalTypes.includes(type) && prioritizedTypes.length < maxTypes) {
					prioritizedTypes.push(type);
				}
			});

			finalTypes.splice(0, finalTypes.length, ...prioritizedTypes);
		}

		// Display intelligent selection results
		console.log(chalk.green("✨ Intelligent Agent Selection:"));
		console.log(
			chalk.cyan("🎯 Selected Types:"),
			chalk.bold(finalTypes.join(", ")),
		);

		// Show reasoning
		const reasoning = [];
		if (requiredCapabilities.length > 0) {
			reasoning.push(`Components analysis: ${requiredCapabilities.join(", ")}`);
		}
		if (complexity === "high" || complexity === "very_high") {
			reasoning.push("High complexity: added architect, optimizer");
		}
		if (objectiveLower.includes("document")) {
			reasoning.push("Documentation needs: added documenter");
		}
		if (objectiveLower.includes("api") || objectiveLower.includes("backend")) {
			reasoning.push("Backend/API project: added coder, tester");
		}

		if (reasoning.length > 0) {
			console.log(chalk.gray("📝 Selection Reasoning:"));
			reasoning.forEach((reason) => {
				console.log(chalk.gray(`  - ${reason}`));
			});
		}

		return finalTypes;
	} catch (error) {
		console.warn(
			chalk.yellow("⚠️ Queen analysis failed, using enhanced defaults:"),
			error.message,
		);

		// Fallback: Enhanced default selection based on objective keywords
		const objectiveLower = objective.toLowerCase();
		const enhancedDefaults = new Set(["researcher", "coder"]);

		// Add types based on objective keywords
		if (
			objectiveLower.includes("api") ||
			objectiveLower.includes("backend") ||
			objectiveLower.includes("microservice") ||
			objectiveLower.includes("system")
		) {
			enhancedDefaults.add("architect");
			enhancedDefaults.add("tester");
		}

		if (
			objectiveLower.includes("frontend") ||
			objectiveLower.includes("ui") ||
			objectiveLower.includes("web")
		) {
			enhancedDefaults.add("reviewer");
			enhancedDefaults.add("tester");
		}

		if (
			objectiveLower.includes("data") ||
			objectiveLower.includes("analytics") ||
			objectiveLower.includes("database")
		) {
			enhancedDefaults.add("analyst");
			enhancedDefaults.add("architect");
		}

		if (
			objectiveLower.includes("performance") ||
			objectiveLower.includes("optimize") ||
			objectiveLower.includes("scale")
		) {
			enhancedDefaults.add("optimizer");
		}

		if (
			objectiveLower.includes("document") ||
			objectiveLower.includes("guide")
		) {
			enhancedDefaults.add("documenter");
		}

		// Always include tester for quality
		enhancedDefaults.add("tester");

		const fallbackTypes = Array.from(enhancedDefaults);
		console.log(
			chalk.blue("🔄 Using enhanced keyword-based selection:"),
			chalk.bold(fallbackTypes.join(", ")),
		);

		return fallbackTypes;
	}
}

/**
 * Get agent capabilities based on type
 */
function getAgentCapabilities(type) {
	const capabilities = {
		researcher: ["web-search", "data-gathering", "analysis", "synthesis"],
		coder: ["code-generation", "implementation", "refactoring", "debugging"],
		analyst: [
			"data-analysis",
			"pattern-recognition",
			"reporting",
			"visualization",
		],
		tester: [
			"test-generation",
			"quality-assurance",
			"bug-detection",
			"validation",
		],
		architect: ["system-design", "architecture", "planning", "documentation"],
		reviewer: ["code-review", "quality-check", "feedback", "improvement"],
		optimizer: [
			"performance-tuning",
			"optimization",
			"profiling",
			"enhancement",
		],
		documenter: [
			"documentation",
			"explanation",
			"tutorial-creation",
			"knowledge-base",
		],
	};

	return capabilities[type] || ["general"];
}

/**
 * Show hive mind status
 */
async function showStatus(flags) {
	try {
		const dbPath = path.join(cwd(), ".hive-mind", "hive.db");

		if (!existsSync(dbPath)) {
			console.error(chalk.red("Error: Hive Mind not initialized"));
			console.log('Run "claude-flow hive-mind init" first');
			return;
		}

		const db = new Database(dbPath);

		// Get active swarms
		const swarms = db
			.prepare(`
      SELECT * FROM swarms
      WHERE status = 'active'
      ORDER BY created_at DESC
    `)
			.all();

		if (swarms.length === 0) {
			console.log(chalk.gray("No active swarms found"));
			db.close();
			return;
		}

		console.log(chalk.bold("\n🐝 Active Hive Mind Swarms\n"));

		for (const swarm of swarms) {
			console.log(chalk.yellow("═".repeat(60)));
			console.log(chalk.cyan("Swarm:"), swarm.name);
			console.log(chalk.cyan("ID:"), swarm.id);
			console.log(chalk.cyan("Objective:"), swarm.objective);
			console.log(chalk.cyan("Queen Type:"), swarm.queen_type);
			console.log(chalk.cyan("Status:"), chalk.green(swarm.status));
			console.log(
				chalk.cyan("Created:"),
				new Date(swarm.created_at).toLocaleString(),
			);

			// Get agents
			const agents = db
				.prepare(`
        SELECT * FROM agents
        WHERE swarm_id = ?
      `)
				.all(swarm.id);

			console.log("\n" + chalk.bold("Agents:"));

			// Group by role
			const queen = agents.find((a) => a.role === "queen");
			const workers = agents.filter((a) => a.role === "worker");

			if (queen) {
				console.log(
					"  " + chalk.magenta("👑 Queen:"),
					queen.name,
					chalk.gray(`(${queen.status})`),
				);
			}

			console.log("  " + chalk.blue("🐝 Workers:"));
			workers.forEach((worker) => {
				const statusColor =
					worker.status === "active"
						? "green"
						: worker.status === "busy"
							? "yellow"
							: "gray";
				console.log(
					`    - ${worker.name} (${worker.type}) ${chalk[statusColor](worker.status)}`,
				);
			});

			// Get task statistics
			const taskStats = db
				.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM tasks
        WHERE swarm_id = ?
      `)
				.get(swarm.id);

			console.log("\n" + chalk.bold("Tasks:"));
			console.log(`  Total: ${taskStats.total}`);
			console.log(`  Completed: ${chalk.green(taskStats.completed)}`);
			console.log(`  In Progress: ${chalk.yellow(taskStats.in_progress)}`);
			console.log(`  Pending: ${chalk.gray(taskStats.pending)}`);

			// Get memory stats
			const memoryCount = db
				.prepare(`
        SELECT COUNT(*) as count FROM collective_memory
        WHERE swarm_id = ?
      `)
				.get(swarm.id);

			console.log("\n" + chalk.bold("Collective Memory:"));
			console.log(`  Entries: ${memoryCount.count}`);

			// Get consensus stats
			const consensusCount = db
				.prepare(`
        SELECT COUNT(*) as count FROM consensus_decisions
        WHERE swarm_id = ?
      `)
				.get(swarm.id);

			console.log("\n" + chalk.bold("Consensus Decisions:"));
			console.log(`  Total: ${consensusCount.count}`);
		}

		console.log(chalk.yellow("═".repeat(60)) + "\n");

		db.close();
	} catch (error) {
		console.error(chalk.red("Error:"), error.message);
		exit(1);
	}
}

/**
 * Show consensus decisions
 */
async function showConsensus(flags) {
	try {
		// 🤝 NEW: Manual consensus commands
		if (flags.decide || flags.topic) {
			return await manualConsensus(flags);
		}

		const dbPath = path.join(cwd(), ".hive-mind", "hive.db");
		const db = new Database(dbPath);

		const decisions = db
			.prepare(`
      SELECT cd.*, s.name as swarm_name
      FROM consensus_decisions cd
      JOIN swarms s ON cd.swarm_id = s.id
      ORDER BY cd.created_at DESC
      LIMIT 20
    `)
			.all();

		if (decisions.length === 0) {
			console.log(chalk.gray("No consensus decisions found"));

			// Show manual consensus help
			console.log(chalk.cyan("\n💡 Manual Consensus Commands:"));
			console.log(
				chalk.gray(
					'  claude-flow hive-mind consensus --decide "Should we use REST or GraphQL?" --options "REST,GraphQL,Both"',
				),
			);
			console.log(
				chalk.gray(
					'  claude-flow hive-mind consensus --topic "Architecture decision" --options "microservices,monolith,hybrid"',
				),
			);
			console.log(
				chalk.gray(
					'  claude-flow hive-mind consensus --quick --topic "Deploy now?" --options "yes,no,wait"',
				),
			);

			db.close();
			return;
		}

		console.log(chalk.bold("\n🤝 Recent Consensus Decisions\n"));

		decisions.forEach((decision) => {
			console.log(chalk.yellow("─".repeat(50)));
			console.log(chalk.cyan("Swarm:"), decision.swarm_name);
			console.log(chalk.cyan("Topic:"), decision.topic);
			console.log(chalk.cyan("Decision:"), decision.decision);
			console.log(chalk.cyan("Algorithm:"), decision.algorithm);
			console.log(
				chalk.cyan("Confidence:"),
				`${(decision.confidence * 100).toFixed(1)}%`,
			);
			console.log(
				chalk.cyan("Time:"),
				new Date(decision.created_at).toLocaleString(),
			);

			if (decision.votes) {
				const votes = JSON.parse(decision.votes);
				console.log(chalk.cyan("Votes:"));

				// Handle vote summary format (for/against/abstain/details)
				if (
					votes.for !== undefined ||
					votes.against !== undefined ||
					votes.abstain !== undefined
				) {
					console.log(`  - for: ${votes.for || 0}`);
					console.log(`  - against: ${votes.against || 0}`);
					console.log(`  - abstain: ${votes.abstain || 0}`);

					// Display vote details properly if they exist
					if (votes.details && Array.isArray(votes.details)) {
						console.log("  - details:");
						votes.details.forEach((detail, index) => {
							if (typeof detail === "object") {
								// Extract available fields
								const agent =
									detail.agentId ||
									detail.agent ||
									detail.id ||
									detail.name ||
									`agent-${index + 1}`;
								const vote =
									detail.vote || detail.choice || detail.decision || "unknown";
								const reason =
									detail.reason || detail.justification || detail.rationale;

								// Build display string
								let displayString = `    ${index + 1}. Agent: ${agent}, Vote: ${vote}`;

								// Add reason if available
								if (reason && reason !== "N/A" && reason !== "") {
									displayString += `, Reason: ${reason}`;
								}

								console.log(displayString);
							} else {
								console.log(`    ${index + 1}. ${detail}`);
							}
						});
					}
				} else {
					// Handle individual agent votes format
					Object.entries(votes).forEach(([agent, vote]) => {
						console.log(`  - ${agent}: ${vote}`);
					});
				}
			}
		});

		console.log(chalk.yellow("─".repeat(50)) + "\n");

		// Show manual consensus help
		console.log(chalk.cyan("💡 Manual Consensus Commands:"));
		console.log(
			chalk.gray(
				'  claude-flow hive-mind consensus --decide "Should we use REST or GraphQL?" --options "REST,GraphQL,Both"',
			),
		);
		console.log(
			chalk.gray(
				'  claude-flow hive-mind consensus --topic "Architecture decision" --options "microservices,monolith,hybrid"',
			),
		);
		console.log(
			chalk.gray(
				'  claude-flow hive-mind consensus --quick --topic "Deploy now?" --options "yes,no,wait"',
			),
		);

		db.close();
	} catch (error) {
		console.error(chalk.red("Error:"), error.message);
		exit(1);
	}
}

/**
 * 🤝 Manual consensus decision-making
 */
async function manualConsensus(flags) {
	try {
		console.log(chalk.blue("\n🤝 Manual Consensus Decision\n"));

		// Parse topic and options
		const topic = flags.decide || flags.topic;
		let options = [];

		if (flags.options) {
			options = flags.options.split(",").map((opt) => opt.trim());
		}

		if (!topic) {
			console.error(
				chalk.red("Error: Topic is required. Use --topic or --decide"),
			);
			console.log(
				chalk.gray(
					'Example: claude-flow hive-mind consensus --decide "Use TypeScript?" --options "yes,no,later"',
				),
			);
			return;
		}

		if (options.length === 0) {
			console.error(chalk.red("Error: Options are required. Use --options"));
			console.log(chalk.gray('Example: --options "option1,option2,option3"'));
			return;
		}

		console.log(chalk.cyan("Topic:"), topic);
		console.log(chalk.cyan("Options:"), options.join(", "));

		// Get or create hive mind core
		const mcpWrapper = await getMcpWrapper();
		const hiveMindCore = new HiveMindCore({
			objective: `Manual consensus: ${topic}`,
			queenType: flags["queen-type"] || "strategic",
			maxWorkers: parseInt(flags.agents) || 5,
			consensusAlgorithm: flags.algorithm || "majority",
		});

		// Initialize with temporary swarm
		await hiveMindCore.initialize();

		// Spawn workers for consensus
		const workerTypes = [
			"researcher",
			"coder",
			"architect",
			"analyst",
			"tester",
		];
		const workerCount = Math.min(
			parseInt(flags.agents) || 5,
			workerTypes.length,
		);
		const selectedWorkers = workerTypes.slice(0, workerCount);

		console.log(
			chalk.blue(`\n🐝 Spawning ${workerCount} workers for consensus...`),
		);
		await hiveMindCore.spawnWorkers(selectedWorkers);

		// Build consensus
		const spinner = ora("Building consensus...").start();

		try {
			const consensus = await hiveMindCore.buildConsensus(topic, options);

			spinner.succeed("Consensus reached!");

			console.log(chalk.green("\n✅ Consensus Result:"));
			console.log(chalk.cyan("Decision:"), chalk.bold(consensus.result));
			console.log(
				chalk.cyan("Confidence:"),
				`${Math.round(consensus.confidence * 100)}%`,
			);
			console.log(chalk.cyan("Algorithm:"), consensus.algorithm);

			// Show vote breakdown
			if (consensus.votes && consensus.votes.size > 0) {
				console.log(chalk.cyan("\n📊 Vote Breakdown:"));
				for (const [voterId, vote] of consensus.votes.entries()) {
					const voterType = voterId === "queen" ? "👑 Queen" : `🤖 ${voterId}`;
					console.log(`  ${voterType}: ${vote}`);
				}
			}

			// Store decision if we have a valid swarm
			if (hiveMindCore.state.swarmId) {
				await mcpWrapper.storeMemory(
					hiveMindCore.state.swarmId,
					`manual-consensus-${Date.now()}`,
					{
						topic,
						options,
						result: consensus.result,
						confidence: consensus.confidence,
						algorithm: consensus.algorithm,
						timestamp: new Date().toISOString(),
						manual: true,
					},
					"consensus",
				);

				console.log(chalk.gray("\n💾 Consensus stored in memory"));
			}
		} catch (consensusError) {
			spinner.fail("Consensus failed");
			console.error(chalk.red("Consensus error:"), consensusError.message);
		}

		// Cleanup
		await hiveMindCore.shutdown();
	} catch (error) {
		console.error(chalk.red("Manual consensus error:"), error.message);
		exit(1);
	}
}

/**
 * Show performance metrics
 */
async function showMetrics(flags) {
	try {
		const dbPath = path.join(cwd(), ".hive-mind", "hive.db");
		const db = new Database(dbPath);

		// Get overall metrics
		const overallStats = db
			.prepare(`
      SELECT
        (SELECT COUNT(*) FROM swarms) as total_swarms,
        (SELECT COUNT(*) FROM agents) as total_agents,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks
    `)
			.get();

		console.log(chalk.bold("\n📊 Hive Mind Performance Metrics\n"));

		// Get task status breakdown
		const taskBreakdown = db
			.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM tasks
      GROUP BY status
      ORDER BY count DESC
    `)
			.all();

		console.log(chalk.cyan("Overall Statistics:"));
		console.log(`  Total Swarms: ${overallStats.total_swarms}`);
		console.log(`  Total Agents: ${overallStats.total_agents}`);
		console.log(`  Total Tasks: ${overallStats.total_tasks}`);
		console.log(`  Completed Tasks: ${overallStats.completed_tasks}`);
		console.log(
			`  Success Rate: ${
				overallStats.total_tasks > 0
					? (
							(overallStats.completed_tasks / overallStats.total_tasks) *
							100
						).toFixed(1) + "%"
					: "N/A"
			}`,
		);

		if (taskBreakdown.length > 0) {
			console.log("\n" + chalk.cyan("Task Status Breakdown:"));
			taskBreakdown.forEach((status) => {
				const percentage =
					overallStats.total_tasks > 0
						? ((status.count / overallStats.total_tasks) * 100).toFixed(1)
						: "0";
				const statusColor =
					status.status === "completed"
						? "green"
						: status.status === "in_progress"
							? "yellow"
							: status.status === "failed"
								? "red"
								: "gray";
				console.log(
					`  ${chalk[statusColor](status.status.charAt(0).toUpperCase() + status.status.slice(1))}: ${status.count} (${percentage}%)`,
				);
			});
		}

		// Get agent performance (check for completed_at column)
		let agentPerf = [];
		try {
			// Check if completed_at exists
			const hasCompletedAt = db
				.prepare(`
        SELECT COUNT(*) as count FROM pragma_table_info('tasks')
        WHERE name = 'completed_at'
      `)
				.get();

			if (hasCompletedAt && hasCompletedAt.count > 0) {
				agentPerf = db
					.prepare(`
          SELECT
            a.name,
            a.type,
            COUNT(t.id) as tasks_assigned,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed,
            AVG(CASE WHEN t.completed_at IS NOT NULL
              THEN (julianday(t.completed_at) - julianday(t.created_at)) * 24 * 60
              ELSE NULL END) as avg_completion_minutes
          FROM agents a
          LEFT JOIN tasks t ON a.id = t.agent_id
          GROUP BY a.id
          HAVING tasks_assigned > 0
          ORDER BY tasks_completed DESC
          LIMIT 10
        `)
					.all();
			} else {
				// Simpler query without completed_at
				agentPerf = db
					.prepare(`
          SELECT
            a.name,
            a.type,
            COUNT(t.id) as tasks_assigned,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed,
            NULL as avg_completion_minutes
          FROM agents a
          LEFT JOIN tasks t ON a.id = t.agent_id
          GROUP BY a.id
          HAVING tasks_assigned > 0
          ORDER BY tasks_completed DESC
          LIMIT 10
        `)
					.all();
			}
		} catch (error) {
			console.warn("Could not get agent performance:", error.message);
		}

		if (agentPerf.length > 0) {
			console.log("\n" + chalk.cyan("Top Performing Agents:"));
			agentPerf.forEach((agent, index) => {
				const successRate =
					agent.tasks_assigned > 0
						? ((agent.tasks_completed / agent.tasks_assigned) * 100).toFixed(1)
						: "0";
				console.log(`  ${index + 1}. ${agent.name} (${agent.type})`);
				console.log(
					`     Tasks: ${agent.tasks_completed}/${agent.tasks_assigned} (${successRate}%)`,
				);
				if (agent.avg_completion_minutes) {
					console.log(
						`     Avg Time: ${agent.avg_completion_minutes.toFixed(1)} minutes`,
					);
				}
			});
		}

		// Get swarm performance
		const swarmPerf = db
			.prepare(`
      SELECT
        s.name,
        s.objective,
        (SELECT COUNT(*) FROM agents a WHERE a.swarm_id = s.id) as agent_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.swarm_id = s.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.swarm_id = s.id AND t.status = 'completed') as completed_count,
        (SELECT COUNT(*) FROM collective_memory cm WHERE cm.swarm_id = s.id) as memory_entries,
        (SELECT COUNT(*) FROM consensus_decisions cd WHERE cd.swarm_id = s.id) as consensus_count
      FROM swarms s
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 5
    `)
			.all();

		if (swarmPerf.length > 0) {
			console.log("\n" + chalk.cyan("Active Swarm Performance:"));
			swarmPerf.forEach((swarm) => {
				const successRate =
					swarm.task_count > 0
						? ((swarm.completed_count / swarm.task_count) * 100).toFixed(1)
						: "0";
				console.log(`\n  ${chalk.yellow(swarm.name)}`);
				console.log(`  Objective: ${swarm.objective.substring(0, 50)}...`);
				console.log(
					`  Agents: ${swarm.agent_count}, Tasks: ${swarm.completed_count}/${swarm.task_count} (${successRate}%)`,
				);
				console.log(
					`  Memory: ${swarm.memory_entries} entries, Consensus: ${swarm.consensus_count} decisions`,
				);
			});
		}

		// Get performance insights
		let avgTaskTime = { avg_minutes: null };
		try {
			// Check if completed_at exists
			const hasCompletedAt = db
				.prepare(`
        SELECT COUNT(*) as count FROM pragma_table_info('tasks')
        WHERE name = 'completed_at'
      `)
				.get();

			if (hasCompletedAt && hasCompletedAt.count > 0) {
				avgTaskTime = db
					.prepare(`
          SELECT
            AVG(CASE WHEN completed_at IS NOT NULL
              THEN (julianday(completed_at) - julianday(created_at)) * 24 * 60
              ELSE NULL END) as avg_minutes
          FROM tasks
          WHERE status = 'completed'
        `)
					.get();
			}
		} catch (error) {
			console.warn("Could not calculate average task time:", error.message);
		}

		// Get agent type performance
		let agentTypePerf = [];
		try {
			// Check if completed_at exists
			const hasCompletedAt = db
				.prepare(`
        SELECT COUNT(*) as count FROM pragma_table_info('tasks')
        WHERE name = 'completed_at'
      `)
				.get();

			if (hasCompletedAt && hasCompletedAt.count > 0) {
				agentTypePerf = db
					.prepare(`
          SELECT
            a.type,
            COUNT(t.id) as total_tasks,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            AVG(CASE WHEN t.completed_at IS NOT NULL
              THEN (julianday(t.completed_at) - julianday(t.created_at)) * 24 * 60
              ELSE NULL END) as avg_completion_minutes
          FROM agents a
          LEFT JOIN tasks t ON a.id = t.agent_id
          GROUP BY a.type
          HAVING total_tasks > 0
          ORDER BY completed_tasks DESC
        `)
					.all();
			} else {
				// Simpler query without completed_at
				agentTypePerf = db
					.prepare(`
          SELECT
            a.type,
            COUNT(t.id) as total_tasks,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            NULL as avg_completion_minutes
          FROM agents a
          LEFT JOIN tasks t ON a.id = t.agent_id
          GROUP BY a.type
          HAVING total_tasks > 0
          ORDER BY completed_tasks DESC
        `)
					.all();
			}
		} catch (error) {
			console.warn("Could not get agent type performance:", error.message);
		}

		if (avgTaskTime.avg_minutes) {
			console.log("\n" + chalk.cyan("Performance Insights:"));
			console.log(
				`  Average Task Completion Time: ${avgTaskTime.avg_minutes.toFixed(1)} minutes`,
			);

			if (agentTypePerf.length > 0) {
				console.log("\n" + chalk.cyan("Agent Type Performance:"));
				agentTypePerf.forEach((type) => {
					const successRate =
						type.total_tasks > 0
							? ((type.completed_tasks / type.total_tasks) * 100).toFixed(1)
							: "0";
					console.log(
						`  ${type.type.charAt(0).toUpperCase() + type.type.slice(1)}: ${type.completed_tasks}/${type.total_tasks} (${successRate}%)`,
					);
					if (type.avg_completion_minutes) {
						console.log(
							`    Average time: ${type.avg_completion_minutes.toFixed(1)} minutes`,
						);
					}
				});
			}
		}

		console.log("\n");
		db.close();
	} catch (error) {
		console.error(chalk.red("Error:"), error.message);
		exit(1);
	}
}

/**
 * Manage collective memory wizard
 */
async function manageMemoryWizard() {
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
async function configureWizard() {
	// TODO: Implement configuration wizard
	console.log(chalk.yellow("Configuration wizard coming soon..."));
}

/**
 * Main hive mind command handler
 */
export async function hiveMindCommand(args, flags) {
	const subcommand = args[0];
	const subArgs = args.slice(1);

	// If no subcommand, show help
	if (!subcommand) {
		showHiveMindHelp();
		return;
	}

	// Warn about non-interactive environments for certain commands
	if (
		(subcommand === "spawn" && (flags.claude || flags.spawn)) ||
		subcommand === "wizard"
	) {
		warnNonInteractive("hive-mind " + subcommand);
	}

	switch (subcommand) {
		case "init":
			await initHiveMind(flags);
			break;

		case "spawn":
			if (flags.wizard || subArgs.length === 0) {
				await spawnSwarmWizard();
			} else {
				await spawnSwarm(subArgs, flags);
			}
			break;

		case "status":
			await showStatus(flags);
			break;

		case "consensus":
			await showConsensus(flags);
			break;

		case "memory":
			await manageMemoryWizard();
			break;

		case "metrics":
			await showMetrics(flags);
			break;

		case "wizard":
			await hiveMindWizard(flags);
			break;

		case "help":
		case "--help":
		case "-h":
			showHiveMindHelp();
			break;

		default:
			console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
			console.log('Run "claude-flow hive-mind help" for usage information');
			exit(1);
	}
}

/**
 * List all memories in the collective memory store
 */
async function listMemories() {
	try {
		console.log(chalk.blue("\n📋 Collective Memory Store\n"));

		// Use MCP wrapper to search for all memories (empty pattern matches all)
		const mcpWrapper = await getMcpWrapper();
		const searchResult = await mcpWrapper.searchMemory("hive-mind", "");

		// Handle different possible response structures
		let memories = [];
		if (searchResult && Array.isArray(searchResult.results)) {
			memories = searchResult.results;
		} else if (searchResult && Array.isArray(searchResult)) {
			memories = searchResult;
		} else if (
			searchResult &&
			searchResult.data &&
			Array.isArray(searchResult.data)
		) {
			memories = searchResult.data;
		}

		if (!memories || memories.length === 0) {
			console.log(chalk.yellow("No memories found in the collective store."));
			console.log(
				chalk.gray(
					'Try storing some memories first using the "💾 Store new memory" option.',
				),
			);
			return;
		}

		memories.forEach((memory, index) => {
			console.log(
				chalk.cyan(`${index + 1}. ${memory.key || `memory-${index}`}`),
			);
			console.log(`   Category: ${memory.type || "general"}`);
			console.log(
				`   Created: ${new Date(memory.timestamp || Date.now()).toLocaleString()}`,
			);
			if (memory.value && typeof memory.value === "object") {
				console.log(
					`   Preview: ${JSON.stringify(memory.value).substring(0, 100)}...`,
				);
			} else {
				console.log(
					`   Value: ${String(memory.value || memory).substring(0, 100)}...`,
				);
			}
			console.log("");
		});
	} catch (error) {
		console.error(chalk.red("Error listing memories:"), error.message);
		console.log(
			chalk.gray("This might be because no memories have been stored yet."),
		);
	}
}

/**
 * Search memories by keyword
 */
async function searchMemories() {
	try {
		const { searchTerm } = await inquirer.prompt([
			{
				type: "input",
				name: "searchTerm",
				message: "Enter search term:",
				validate: (input) => input.length > 0,
			},
		]);

		console.log(chalk.blue(`\n🔍 Searching for: "${searchTerm}"\n`));

		const mcpWrapper = await getMcpWrapper();
		const searchResult = await mcpWrapper.searchMemory("hive-mind", searchTerm);

		// Handle different possible response structures
		let memories = [];
		if (searchResult && Array.isArray(searchResult.results)) {
			memories = searchResult.results;
		} else if (searchResult && Array.isArray(searchResult)) {
			memories = searchResult;
		} else if (
			searchResult &&
			searchResult.data &&
			Array.isArray(searchResult.data)
		) {
			memories = searchResult.data;
		}

		if (!memories || memories.length === 0) {
			console.log(chalk.yellow("No memories found matching your search."));
			return;
		}

		memories.forEach((memory, index) => {
			console.log(
				chalk.green(`${index + 1}. ${memory.key || `result-${index}`}`),
			);
			console.log(`   Category: ${memory.type || "general"}`);
			console.log(
				`   Created: ${new Date(memory.timestamp || Date.now()).toLocaleString()}`,
			);
			console.log(
				`   Value: ${JSON.stringify(memory.value || memory, null, 2)}`,
			);
			console.log("");
		});
	} catch (error) {
		console.error(chalk.red("Error searching memories:"), error.message);
	}
}

/**
 * Store new memory wizard
 */
async function storeMemoryWizard() {
	try {
		const answers = await inquirer.prompt([
			{
				type: "input",
				name: "key",
				message: "Memory key (identifier):",
				validate: (input) => input.length > 0,
			},
			{
				type: "list",
				name: "category",
				message: "Memory category:",
				choices: [
					"consensus",
					"decision",
					"pattern",
					"learning",
					"coordination",
					"performance",
					"configuration",
					"general",
				],
			},
			{
				type: "editor",
				name: "value",
				message: "Memory content (JSON or text):",
			},
		]);

		const mcpWrapper = await getMcpWrapper();
		let memoryValue;

		// Try to parse as JSON, fall back to string
		try {
			memoryValue = JSON.parse(answers.value);
		} catch {
			memoryValue = answers.value;
		}

		await mcpWrapper.storeMemory(
			"hive-mind",
			answers.key,
			memoryValue,
			answers.category,
		);

		console.log(chalk.green(`\n✅ Memory stored successfully!`));
		console.log(`Key: ${answers.key}`);
		console.log(`Category: ${answers.category}`);
	} catch (error) {
		console.error(chalk.red("Error storing memory:"), error.message);
	}
}

/**
 * Show memory statistics
 */
async function showMemoryStats() {
	try {
		console.log(chalk.blue("\n📊 Memory Statistics\n"));

		const mcpWrapper = await getMcpWrapper();

		// Search for all memories with an empty pattern to get everything
		const searchResult = await mcpWrapper.searchMemory("hive-mind", "");

		// Handle different possible response structures
		let memories = [];
		if (searchResult && Array.isArray(searchResult.results)) {
			memories = searchResult.results;
		} else if (searchResult && Array.isArray(searchResult)) {
			memories = searchResult;
		} else if (
			searchResult &&
			searchResult.data &&
			Array.isArray(searchResult.data)
		) {
			memories = searchResult.data;
		}

		if (!memories || memories.length === 0) {
			console.log(chalk.yellow("No memories found."));
			console.log(
				chalk.gray('Use "Store new memory" to create your first memory.'),
			);
			return;
		}

		// Calculate statistics
		const stats = {
			total: memories.length,
			categories: {},
			oldestDate: null,
			newestDate: null,
			totalSize: 0,
		};

		memories.forEach((memory) => {
			// Count by category
			const category = memory.category || memory.type || "general";
			stats.categories[category] = (stats.categories[category] || 0) + 1;

			// Track dates
			const date = new Date(memory.timestamp || Date.now());
			if (!stats.oldestDate || date < stats.oldestDate) {
				stats.oldestDate = date;
			}
			if (!stats.newestDate || date > stats.newestDate) {
				stats.newestDate = date;
			}

			// Estimate size
			stats.totalSize += JSON.stringify(memory).length;
		});

		console.log(chalk.cyan("Total memories:"), stats.total);
		console.log(
			chalk.cyan("Estimated size:"),
			`${(stats.totalSize / 1024).toFixed(2)} KB`,
		);
		console.log(
			chalk.cyan("Date range:"),
			`${stats.oldestDate?.toLocaleDateString()} - ${stats.newestDate?.toLocaleDateString()}`,
		);

		console.log(chalk.cyan("\nBy category:"));
		Object.entries(stats.categories).forEach(([category, count]) => {
			console.log(`  ${category}: ${count}`);
		});
	} catch (error) {
		console.error(chalk.red("Error getting memory stats:"), error.message);
	}
}

/**
 * Clean old memories
 */
async function cleanMemories() {
	try {
		const { days } = await inquirer.prompt([
			{
				type: "number",
				name: "days",
				message: "Remove memories older than how many days?",
				default: 30,
				validate: (input) => input > 0,
			},
		]);

		const { confirm } = await inquirer.prompt([
			{
				type: "confirm",
				name: "confirm",
				message: `Are you sure you want to delete memories older than ${days} days?`,
				default: false,
			},
		]);

		if (!confirm) {
			console.log(chalk.yellow("Operation cancelled."));
			return;
		}

		const mcpWrapper = await getMcpWrapper();

		// Get all memories first
		const searchResult = await mcpWrapper.searchMemory("hive-mind", "");

		// Handle different possible response structures
		let memories = [];
		if (searchResult && Array.isArray(searchResult.results)) {
			memories = searchResult.results;
		} else if (searchResult && Array.isArray(searchResult)) {
			memories = searchResult;
		} else if (
			searchResult &&
			searchResult.data &&
			Array.isArray(searchResult.data)
		) {
			memories = searchResult.data;
		}

		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		// Filter memories older than cutoff date
		const oldMemories = memories.filter((memory) => {
			const memoryDate = new Date(memory.timestamp || 0);
			return memoryDate < cutoffDate;
		});

		if (oldMemories.length === 0) {
			console.log(chalk.yellow("\n🎉 No old memories found to clean."));
			return;
		}

		console.log(
			chalk.green(`\n✅ Found ${oldMemories.length} old memories to clean.`),
		);
		console.log(
			chalk.gray(
				"Note: Individual memory deletion not yet implemented in MCPWrapper.",
			),
		);
		console.log(
			chalk.gray(
				"Consider implementing batch deletion or memory lifecycle management.",
			),
		);
	} catch (error) {
		console.error(chalk.red("Error cleaning memories:"), error.message);
	}
}

/**
 * Export memory backup
 */
async function exportMemoryBackup() {
	try {
		const { filename } = await inquirer.prompt([
			{
				type: "input",
				name: "filename",
				message: "Export filename:",
				default: `hive-mind-memory-backup-${new Date().toISOString().split("T")[0]}.json`,
			},
		]);

		const mcpWrapper = await getMcpWrapper();

		// Get all memories using search
		const searchResult = await mcpWrapper.searchMemory("hive-mind", "");

		// Handle different possible response structures
		let memories = [];
		if (searchResult && Array.isArray(searchResult.results)) {
			memories = searchResult.results;
		} else if (searchResult && Array.isArray(searchResult)) {
			memories = searchResult;
		} else if (
			searchResult &&
			searchResult.data &&
			Array.isArray(searchResult.data)
		) {
			memories = searchResult.data;
		}

		const backup = {
			exportDate: new Date().toISOString(),
			version: "1.0",
			totalMemories: memories.length,
			namespace: "hive-mind",
			memories: memories,
		};

		const fs = await import("fs");
		fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

		console.log(chalk.green(`\n✅ Memory backup exported to: ${filename}`));
		console.log(chalk.cyan(`Exported ${memories.length} memories`));
	} catch (error) {
		console.error(chalk.red("Error exporting memory backup:"), error.message);
	}
}

/**
 * Spawn Claude Code with Hive Mind coordination instructions
 */
async function spawnClaudeCodeInstances(
	swarmId,
	swarmName,
	objective,
	workers,
	flags,
) {
	console.log(
		"\n" + chalk.bold("🚀 Launching Claude Code with Hive Mind Coordination"),
	);
	console.log(chalk.gray("─".repeat(60)));

	const spinner = ora("Preparing Hive Mind coordination prompt...").start();

	try {
		// Generate comprehensive Hive Mind prompt
		const workerGroups = groupWorkersByType(workers);
		const hiveMindPrompt = generateHiveMindPrompt(
			swarmId,
			swarmName,
			objective,
			workers,
			workerGroups,
			flags,
		);

		spinner.succeed("Hive Mind coordination prompt ready!");

		// Display coordination summary
		console.log("\n" + chalk.bold("🧠 Hive Mind Configuration"));
		console.log(chalk.gray("─".repeat(60)));
		console.log(chalk.cyan("Swarm ID:"), swarmId);
		console.log(chalk.cyan("Objective:"), objective);
		console.log(chalk.cyan("Queen Type:"), flags.queenType || "strategic");
		console.log(chalk.cyan("Worker Count:"), workers.length);
		console.log(
			chalk.cyan("Worker Types:"),
			Object.keys(workerGroups).join(", "),
		);
		console.log(
			chalk.cyan("Consensus Algorithm:"),
			flags.consensus || "majority",
		);
		console.log(
			chalk.cyan("MCP Tools:"),
			"Full Claude-Flow integration enabled",
		);

		try {
			// Check if claude command exists
			const { spawn: childSpawn, execSync } = await import("child_process");
			let claudeAvailable = false;

			try {
				execSync("which claude", { stdio: "ignore" });
				claudeAvailable = true;
			} catch {
				console.log(chalk.yellow("\n⚠️  Claude Code CLI not found in PATH"));
				console.log(
					chalk.gray(
						"Install it with: npm install -g @anthropic-ai/claude-code",
					),
				);
				console.log(chalk.gray("\nFalling back to displaying instructions..."));
			}

			if (claudeAvailable && !flags.dryRun) {
				// Pass the prompt directly as an argument to claude
				const claudeArgs = [hiveMindPrompt];

				// Add auto-permission flag by default for hive-mind mode (unless explicitly disabled)
				if (
					flags["dangerously-skip-permissions"] !== false &&
					!flags["no-auto-permissions"]
				) {
					claudeArgs.push("--dangerously-skip-permissions");
					console.log(
						chalk.yellow(
							"🔓 Using --dangerously-skip-permissions by default for seamless hive-mind execution",
						),
					);
				}

				// Spawn claude with the prompt as the first argument
				const claudeProcess = childSpawn("claude", claudeArgs, {
					stdio: "inherit",
					shell: false,
				});

				console.log(
					chalk.green("\n✓ Claude Code launched with Hive Mind coordination"),
				);
				console.log(
					chalk.blue(
						"  The Queen coordinator will orchestrate all worker agents",
					),
				);
				console.log(
					chalk.blue(
						"  Use MCP tools for collective intelligence and task distribution",
					),
				);
			} else if (flags.dryRun) {
				console.log(
					chalk.blue("\nDry run - would execute Claude Code with prompt:"),
				);
				console.log(
					chalk.gray("Prompt length:"),
					hiveMindPrompt.length,
					"characters",
				);
				console.log(chalk.gray("\nFirst 500 characters of prompt:"));
				console.log(chalk.yellow(hiveMindPrompt.substring(0, 500) + "..."));

				// Save prompt to file for inspection
				const promptFile = `hive-mind-prompt-${swarmId}.txt`;
				await writeFile(promptFile, hiveMindPrompt, "utf8");
				console.log(chalk.green(`\n✓ Full prompt saved to: ${promptFile}`));
			} else {
				// Claude not available - save prompt and show instructions
				const promptFile = `hive-mind-prompt-${swarmId}.txt`;
				await writeFile(promptFile, hiveMindPrompt, "utf8");

				console.log(chalk.yellow("\n📋 Manual Execution Instructions:"));
				console.log(chalk.gray("─".repeat(50)));
				console.log(chalk.gray("1. Install Claude Code:"));
				console.log(chalk.green("   npm install -g @anthropic-ai/claude-code"));
				console.log(chalk.gray("\n2. Run with the saved prompt:"));
				console.log(chalk.green(`   claude < ${promptFile}`));
				console.log(chalk.gray("\n3. Or copy the prompt manually:"));
				console.log(chalk.green(`   cat ${promptFile} | claude`));
				console.log(chalk.gray("\n4. With auto-permissions:"));
				console.log(
					chalk.green(
						`   claude --dangerously-skip-permissions < ${promptFile}`,
					),
				);
			}
		} catch (error) {
			console.error(
				chalk.red("\nFailed to launch Claude Code:"),
				error.message,
			);

			// Save prompt as fallback
			const promptFile = `hive-mind-prompt-${swarmId}-fallback.txt`;
			await writeFile(promptFile, hiveMindPrompt, "utf8");
			console.log(chalk.green(`\n✓ Prompt saved to: ${promptFile}`));
			console.log(
				chalk.yellow(
					"\nYou can run Claude Code manually with the saved prompt",
				),
			);
		}

		console.log("\n" + chalk.bold("💡 Pro Tips:"));
		console.log(chalk.gray("─".repeat(30)));
		console.log("• Use --auto-spawn to launch instances automatically");
		console.log("• Add --verbose for detailed coordination context");
		console.log("• Monitor with: claude-flow hive-mind status");
		console.log("• Share memories: mcp__ruv-swarm__memory_usage");
	} catch (error) {
		spinner.fail("Failed to prepare Claude Code coordination");
		console.error(chalk.red("Error:"), error.message);
	}
}

/**
 * Generate comprehensive Hive Mind prompt for Claude Code
 */
function generateHiveMindPrompt(
	swarmId,
	swarmName,
	objective,
	workers,
	workerGroups,
	flags,
) {
	const currentTime = new Date().toISOString();
	const workerTypes = Object.keys(workerGroups);
	const queenType = flags.queenType || "strategic";
	const consensusAlgorithm = flags.consensus || "majority";

	return `🧠 HIVE MIND COLLECTIVE INTELLIGENCE SYSTEM
═══════════════════════════════════════════════

You are the Queen coordinator of a Hive Mind swarm with collective intelligence capabilities.

HIVE MIND CONFIGURATION:
📌 Swarm ID: ${swarmId}
📌 Swarm Name: ${swarmName}
🎯 Objective: ${objective}
👑 Queen Type: ${queenType}
🐝 Worker Count: ${workers.length}
🤝 Consensus Algorithm: ${consensusAlgorithm}
⏰ Initialized: ${currentTime}

WORKER DISTRIBUTION:
${workerTypes.map((type) => `• ${type}: ${workerGroups[type].length} agents`).join("\n")}

🔧 AVAILABLE MCP TOOLS FOR HIVE MIND COORDINATION:

1️⃣ **COLLECTIVE INTELLIGENCE**
   mcp__claude-flow__consensus_vote    - Democratic decision making
   mcp__claude-flow__memory_share      - Share knowledge across the hive
   mcp__claude-flow__neural_sync       - Synchronize neural patterns
   mcp__claude-flow__swarm_think       - Collective problem solving

2️⃣ **QUEEN COORDINATION**
   mcp__claude-flow__queen_command     - Issue directives to workers
   mcp__claude-flow__queen_monitor     - Monitor swarm health
   mcp__claude-flow__queen_delegate    - Delegate complex tasks
   mcp__claude-flow__queen_aggregate   - Aggregate worker results

3️⃣ **WORKER MANAGEMENT**
   mcp__claude-flow__agent_spawn       - Create specialized workers
   mcp__claude-flow__agent_assign      - Assign tasks to workers
   mcp__claude-flow__agent_communicate - Inter-agent communication
   mcp__claude-flow__agent_metrics     - Track worker performance

4️⃣ **TASK ORCHESTRATION**
   mcp__claude-flow__task_create       - Create hierarchical tasks
   mcp__claude-flow__task_distribute   - Distribute work efficiently
   mcp__claude-flow__task_monitor      - Track task progress
   mcp__claude-flow__task_aggregate    - Combine task results

5️⃣ **MEMORY & LEARNING**
   mcp__claude-flow__memory_store      - Store collective knowledge
   mcp__claude-flow__memory_retrieve   - Access shared memory
   mcp__claude-flow__neural_train      - Learn from experiences
   mcp__claude-flow__pattern_recognize - Identify patterns

📋 HIVE MIND EXECUTION PROTOCOL:

As the Queen coordinator, you must:

1. **INITIALIZE THE HIVE** (Single BatchTool Message):
   [BatchTool]:
   ${workerTypes.map((type) => `   mcp__claude-flow__agent_spawn { "type": "${type}", "count": ${workerGroups[type].length} }`).join("\n")}
   mcp__claude-flow__memory_store { "key": "hive/objective", "value": "${objective}" }
   mcp__claude-flow__memory_store { "key": "hive/queen", "value": "${queenType}" }
   mcp__claude-flow__swarm_think { "topic": "initial_strategy" }
   TodoWrite { "todos": [/* Create 5-10 high-level tasks */] }

2. **ESTABLISH COLLECTIVE INTELLIGENCE**:
   - Use consensus_vote for major decisions
   - Share all discoveries via memory_share
   - Synchronize learning with neural_sync
   - Coordinate strategy with swarm_think

3. **QUEEN LEADERSHIP PATTERNS**:
   ${
			queenType === "strategic"
				? `
   - Focus on high-level planning and coordination
   - Delegate implementation details to workers
   - Monitor overall progress and adjust strategy
   - Make executive decisions when consensus fails`
				: ""
		}
   ${
			queenType === "tactical"
				? `
   - Manage detailed task breakdowns and assignments
   - Closely monitor worker progress and efficiency
   - Optimize resource allocation and load balancing
   - Intervene directly when workers need guidance`
				: ""
		}
   ${
			queenType === "adaptive"
				? `
   - Learn from swarm performance and adapt strategies
   - Experiment with different coordination patterns
   - Use neural training to improve over time
   - Balance between strategic and tactical approaches`
				: ""
		}

4. **WORKER COORDINATION**:
   - Spawn workers based on task requirements
   - Assign tasks according to worker specializations
   - Enable peer-to-peer communication for collaboration
   - Monitor and rebalance workloads as needed

5. **CONSENSUS MECHANISMS**:
   ${consensusAlgorithm === "majority" ? "- Decisions require >50% worker agreement" : ""}
   ${consensusAlgorithm === "unanimous" ? "- All workers must agree for major decisions" : ""}
   ${consensusAlgorithm === "weighted" ? "- Worker votes weighted by expertise and performance" : ""}
   ${consensusAlgorithm === "quorum" ? "- Decisions require 2/3 worker participation" : ""}

6. **COLLECTIVE MEMORY**:
   - Store all important decisions in shared memory
   - Tag memories with worker IDs and timestamps
   - Use memory namespaces: hive/, queen/, workers/, tasks/
   - Implement memory consensus for critical data

7. **PERFORMANCE OPTIMIZATION**:
   - Monitor swarm metrics continuously
   - Identify and resolve bottlenecks
   - Train neural networks on successful patterns
   - Scale worker count based on workload

💡 HIVE MIND BEST PRACTICES:

✅ ALWAYS use BatchTool for parallel operations
✅ Store decisions in collective memory immediately
✅ Use consensus for critical path decisions
✅ Monitor worker health and reassign if needed
✅ Learn from failures and adapt strategies
✅ Maintain constant inter-agent communication
✅ Aggregate results before final delivery

❌ NEVER make unilateral decisions without consensus
❌ NEVER let workers operate in isolation
❌ NEVER ignore performance metrics
❌ NEVER skip memory synchronization
❌ NEVER abandon failing workers

🎯 OBJECTIVE EXECUTION STRATEGY:

For the objective: "${objective}"

1. Break down into major phases using swarm_think
2. Create specialized worker teams for each phase
3. Establish success criteria and checkpoints
4. Implement feedback loops and adaptation
5. Aggregate and synthesize all worker outputs
6. Deliver comprehensive solution with consensus

⚡ PARALLEL EXECUTION REMINDER:
The Hive Mind operates with massive parallelism. Always batch operations:
- Spawn ALL workers in one message
- Create ALL initial tasks together
- Store multiple memories simultaneously
- Check all statuses in parallel

🚀 BEGIN HIVE MIND EXECUTION:

Initialize the swarm now with the configuration above. Use your collective intelligence to solve the objective efficiently. The Queen must coordinate, workers must collaborate, and the hive must think as one.

Remember: You are not just coordinating agents - you are orchestrating a collective intelligence that is greater than the sum of its parts.`;
}

/**
 * Generate comprehensive coordination instructions for Claude Code instances
 */
function generateCoordinationInstructions(
	swarmId,
	swarmName,
	objective,
	workers,
) {
	return {
		swarmId,
		swarmName,
		objective,
		hiveMindEndpoint: "ws://localhost:3000/hive-mind",
		mcpTools: [
			"mcp__ruv-swarm__memory_usage",
			"mcp__ruv-swarm__swarm_monitor",
			"mcp__ruv-swarm__task_orchestrate",
			"mcp__ruv-swarm__neural_train",
			"mcp__ruv-swarm__consensus_vote",
			"mcp__ruv-swarm__agent_spawn",
			"mcp__ruv-swarm__swarm_status",
		],
		coordinationProtocol: {
			memoryNamespace: `hive-mind-${swarmId}`,
			consensusThreshold: 0.7,
			taskUpdateInterval: 30000,
			healthCheckInterval: 60000,
		},
		workerCapabilities: workers.map((w) => ({
			id: w.id,
			type: w.type,
			capabilities: JSON.parse(w.capabilities),
		})),
	};
}

/**
 * Group workers by type for specialized spawning
 */
function groupWorkersByType(workers) {
	return workers.reduce((groups, worker) => {
		if (!groups[worker.type]) {
			groups[worker.type] = [];
		}
		groups[worker.type].push(worker);
		return groups;
	}, {});
}

/**
 * Create Claude Code spawn command with coordination context
 */
function createClaudeCodeSpawnCommand(
	swarmId,
	swarmName,
	objective,
	workerType,
	typeWorkers,
	instructions,
) {
	const context = `You are a ${workerType} agent in the "${swarmName}" Hive Mind swarm.

🎯 MISSION: ${objective}

🐝 SWARM COORDINATION:
- Swarm ID: ${swarmId}
- Your Role: ${workerType.toUpperCase()} specialist
- Team Size: ${typeWorkers.length} ${workerType}(s)
- Coordination: Hive Mind collective intelligence

🧠 MANDATORY COORDINATION PROTOCOL:
1. BEFORE starting work:
   mcp__ruv-swarm__memory_usage {"action": "retrieve", "key": "hive-mind-${swarmId}/status"}
   mcp__ruv-swarm__swarm_status {"swarmId": "${swarmId}"}

2. DURING work (after each major step):
   mcp__ruv-swarm__memory_usage {"action": "store", "key": "hive-mind-${swarmId}/${workerType}/progress", "value": {"step": "X", "status": "Y", "findings": "Z"}}
   mcp__ruv-swarm__task_orchestrate {"swarmId": "${swarmId}", "update": {"agentId": "your-id", "progress": "details"}}

3. FOR decisions requiring consensus:
   mcp__ruv-swarm__consensus_vote {"swarmId": "${swarmId}", "topic": "decision topic", "vote": "your choice", "rationale": "reasoning"}

4. WHEN sharing insights:
   mcp__ruv-swarm__memory_usage {"action": "store", "key": "hive-mind-${swarmId}/insights/${workerType}", "value": {"insight": "your discovery", "impact": "significance"}}

5. BEFORE completing work:
   mcp__ruv-swarm__neural_train {"swarmId": "${swarmId}", "experience": {"what": "learned", "outcome": "result"}}

🔧 SPECIALIZED CAPABILITIES:
${getWorkerTypeInstructions(workerType)}

🤝 COORDINATION RULES:
- Share ALL discoveries via memory_usage
- Vote on critical decisions using consensus_vote
- Update progress every 15 minutes via task_orchestrate
- Monitor other agents via swarm_status
- Learn from patterns via neural_train

Remember: You are part of a COLLECTIVE INTELLIGENCE. Your individual success depends on swarm coordination!`;

	const command = `claude code --context "${context.replace(/"/g, '\\"')}"`;

	return {
		title: `${workerType.toUpperCase()} Agent (${typeWorkers.length} instance${typeWorkers.length > 1 ? "s" : ""})`,
		command,
		context,
		workerType,
		count: typeWorkers.length,
	};
}

/**
 * Get specialized instructions for each worker type
 */
function getWorkerTypeInstructions(workerType) {
	const instructions = {
		researcher: `- Conduct thorough research using WebSearch and WebFetch
- Document findings in structured formats
- Validate source credibility and relevance
- Synthesize insights from multiple sources
- Share research methodology and results`,

		coder: `- Write clean, maintainable, well-documented code
- Follow project conventions and best practices
- Test implementations thoroughly
- Document code changes and decisions
- Review and optimize existing code`,

		analyst: `- Analyze data patterns and trends
- Create comprehensive reports and visualizations
- Identify key insights and recommendations
- Validate analytical methodologies
- Correlate findings across data sources`,

		tester: `- Design comprehensive test strategies
- Execute functional, integration, and performance tests
- Document test results and issues
- Verify bug fixes and improvements
- Ensure quality standards and coverage`,

		coordinator: `- Monitor overall progress and coordination
- Facilitate communication between agents
- Resolve conflicts and blockers
- Optimize resource allocation
- Ensure alignment with objectives`,

		architect: `- Design system architecture and components
- Define technical standards and patterns
- Create implementation guidelines
- Review and approve design decisions
- Ensure scalability and maintainability`,
	};

	return (
		instructions[workerType] ||
		`- Execute tasks according to ${workerType} best practices
- Collaborate effectively with team members
- Document work and share insights
- Maintain quality standards
- Contribute to collective objectives`
	);
}

/**
 * Get MCP wrapper instance
 */
async function getMcpWrapper() {
	const { MCPToolWrapper } = await import("./hive-mind/mcp-wrapper.js");
	return new MCPToolWrapper();
}

// Export for testing
export { showHiveMindHelp, initHiveMind, spawnSwarm, showStatus };
