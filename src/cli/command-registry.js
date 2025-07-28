// command-registry.js - Extensible command registration system
import process from "process";
import { debugLogger } from "../utils/debug-logger.js";
import { agentCommand } from "./simple-commands/agent.js";
import { analysisAction } from "./simple-commands/analysis.js";
import { automationAction } from "./simple-commands/automation.js";
import { batchManagerCommand } from "./simple-commands/batch-manager.js";
import { configCommand } from "./simple-commands/config.js";
import { coordinationAction } from "./simple-commands/coordination.js";
import { githubCommand } from "./simple-commands/github.js";
import { hiveMindCommand } from "./simple-commands/hive-mind.js";
import hiveMindOptimizeCommand from "./simple-commands/hive-mind-optimize.js";
import { hookSafetyCommand } from "./simple-commands/hook-safety.js";
import { hooksCommand } from "./simple-commands/hooks.js";
import { initCommand } from "./simple-commands/init/index.js";
import { initCommandMetadataDriven } from "./simple-commands/init-metadata.js";
import { mcpCommand } from "./simple-commands/mcp.js";
import { memoryCommand } from "./simple-commands/memory.js";
import { monitorCommand } from "./simple-commands/monitor.js";
import { sparcCommand } from "./simple-commands/sparc.js";
import { startCommand } from "./simple-commands/start.js";
import { statusCommand } from "./simple-commands/status.js";
import { swarmCommand } from "./simple-commands/swarm.js";
import {
	fixTaskAttribution,
	showUnifiedMetrics,
} from "./simple-commands/swarm-metrics-integration.js";
import { taskCommand } from "./simple-commands/task.js";
import { trainingAction } from "./simple-commands/training.js";
// Note: TypeScript imports commented out for Node.js compatibility
// import { ruvSwarmAction } from './commands/ruv-swarm.ts';
// import { configIntegrationAction } from './commands/config-integration.ts';

// Command registry for extensible CLI
export const commandRegistry = new Map();

// Register core commands
export function registerCoreCommands() {
	const correlationId = debugLogger.logFunctionEntry(
		"CLI",
		"command-registry.registerCoreCommands",
		arguments,
		"cli-init",
	);
	try {
		commandRegistry.set("init", {
			handler: initCommand,
			description:
				"Initialize Claude Code integration files and SPARC development environment",
			// Metadata-driven example (will be loaded dynamically)
			loadMetadata: async () => {
				const { initCommandMetadata } = await import(
					"./simple-commands/init-metadata.js"
				);
				return initCommandMetadata;
			},
			examples: [
				"npx claude-flow@latest init --sparc  # Recommended: Full SPARC setup",
				"init --sparc                         # Initialize with SPARC modes",
				"init --force --minimal               # Minimal setup, overwrite existing",
				"init --sparc --force                 # Force SPARC setup",
			],
			details: `
The --sparc flag creates a complete development environment:
  • .roomodes file containing 17 specialized SPARC modes
  • CLAUDE.md for AI-readable project instructions
  • Pre-configured modes: architect, code, tdd, debug, security, and more
  • Ready for TDD workflows and automated code generation

First-time users should run: npx claude-flow@latest init --sparc`,
		});

		commandRegistry.set("start", {
			handler: startCommand,
			description: "Start the Claude-Flow orchestration system",
			loadMetadata: async () => {
				const { startCommandMetadata } = await import(
					"./simple-commands/start-wrapper.js"
				);
				return startCommandMetadata;
			},
		});

		// Add start-ui as a convenient alias for launching the UI
		commandRegistry.set("start-ui", {
			handler: async (args, flags) => {
				// Import and use the direct UI launcher
				const { launchUI } = await import("./simple-commands/start-ui.js");
				// Pass the full raw arguments from process.argv
				const fullArgs = process.argv.slice(3); // Skip node, script, and command
				return launchUI(fullArgs);
			},
			description: "Start the UI interface (web UI by default)",
			category: "specialized",
			helpDescription: "Quick launcher for web-based or terminal UI interface",
			priority: "medium",
			usage: "start-ui [--port <port>] [--terminal]",
			examples: [
				"start-ui                 # Launch web-based UI (default)",
				"start-ui --port 3000     # Use custom port",
				"start-ui --terminal      # Launch terminal-based UI instead",
			],
		});

		commandRegistry.set("memory", {
			handler: memoryCommand,
			description: "Advanced memory management with namespaces and persistence",
			usage: "memory <subcommand> [options]",
			loadMetadata: async () => {
				const { memoryCommandMetadata } = await import(
					"./simple-commands/memory-metadata.js"
				);
				return memoryCommandMetadata;
			},
			examples: [
				'memory store "api_key" "sk-1234..." --namespace project',
				'memory query "API" --search-type semantic --limit 5',
				"memory stats --verbose",
				"memory export backup.json --compress",
				"memory optimize --vacuum --reindex",
			],
		});

		commandRegistry.set("sparc", {
			handler: sparcCommand,
			description: "SPARC development mode operations",
			usage: "sparc [subcommand] [options]",
			examples: [
				'sparc "orchestrate full app development"  # Default: sparc orchestrator',
				"sparc modes                               # List available modes",
				'sparc run code "implement feature"        # Run specific mode',
				'sparc tdd "feature description"           # TDD workflow',
				"sparc info architect                      # Mode details",
			],
		});

		commandRegistry.set("agent", {
			handler: agentCommand,
			description: "Manage AI agents and hierarchies",
			usage: "agent <subcommand> [options]",
			loadMetadata: async () => {
				const { agentCommandMetadata } = await import(
					"./simple-commands/agent.js"
				);
				return agentCommandMetadata;
			},
			examples: [
				'agent spawn researcher --name "DataBot"',
				"agent list --verbose",
				"agent hierarchy create enterprise",
				"agent ecosystem status",
			],
		});

		commandRegistry.set("task", {
			handler: taskCommand,
			description: "Manage tasks and workflows",
			usage: "task <subcommand> [options]",
			examples: [
				'task create research "Market analysis"',
				"task list --filter running",
				"task workflow examples/dev-flow.json",
				"task coordination status",
			],
		});

		commandRegistry.set("config", {
			handler: configCommand,
			description: "Manage system configuration",
			usage: "config <subcommand> [options]",
			examples: [
				"config init",
				"config set terminal.poolSize 15",
				"config get orchestrator.maxConcurrentTasks",
				"config validate",
			],
		});

		commandRegistry.set("status", {
			handler: statusCommand,
			description: "Show system status and health",
			usage: "status [--verbose] [--json]",
			loadMetadata: async () => {
				const { statusCommandMetadata } = await import(
					"./simple-commands/status.js"
				);
				return statusCommandMetadata;
			},
			examples: ["status", "status --verbose", "status --json"],
		});

		commandRegistry.set("mcp", {
			handler: mcpCommand,
			description: "Manage MCP server and tools",
			usage: "mcp <subcommand> [options]",
			examples: [
				"mcp status",
				"mcp start --port 8080",
				"mcp tools --verbose",
				"mcp auth setup",
			],
		});

		commandRegistry.set("monitor", {
			handler: monitorCommand,
			description: "Real-time system monitoring",
			usage: "monitor [--watch] [--interval <ms>]",
			examples: [
				"monitor",
				"monitor --watch",
				"monitor --interval 1000 --watch",
				"monitor --format json",
			],
		});

		commandRegistry.set("swarm", {
			handler: swarmCommand,
			description: "Swarm-based AI agent coordination",
			usage: "swarm <objective> [options]",
			loadMetadata: async () => {
				const { swarmCommandMetadata } = await import(
					"./simple-commands/swarm.js"
				);
				return swarmCommandMetadata;
			},
			examples: [
				'swarm "Build a REST API"',
				'swarm "Research cloud architecture" --strategy research',
				'swarm "Analyze data" --max-agents 3 --parallel',
				'swarm "Development task" --ui --monitor --background',
			],
		});

		commandRegistry.set("hive-mind", {
			handler: hiveMindCommand,
			description:
				"Advanced Hive Mind swarm intelligence with collective decision-making",
			usage: "hive-mind <subcommand> [options]",
			loadMetadata: async () => {
				const { hiveMindCommandMetadata } = await import(
					"./simple-commands/hive-mind-metadata.js"
				);
				return hiveMindCommandMetadata;
			},
			examples: [
				"hive-mind init                          # Initialize hive mind system",
				'hive-mind spawn "Build microservices"   # Create swarm with objective',
				"hive-mind wizard                        # Interactive setup wizard",
				"hive-mind status                        # View active swarms",
				"hive-mind consensus                     # View consensus decisions",
				"hive-mind metrics                       # Performance analytics",
			],
			details: `
Hive Mind System Features:
  • Queen-led coordination with specialized worker agents
  • Collective memory and knowledge sharing
  • Consensus building for critical decisions
  • Auto-scaling based on workload
  • Parallel task execution with work stealing
  • Real-time monitoring and metrics
  • SQLite-backed persistence
  • MCP tool integration for 87+ operations

Queen Types:
  • Strategic - Long-term planning and optimization
  • Tactical - Task prioritization and rapid response
  • Adaptive - Learning and strategy evolution

Worker Types:
  • Researcher, Coder, Analyst, Tester
  • Architect, Reviewer, Optimizer, Documenter

Use 'hive-mind wizard' for interactive setup or 'hive-mind help' for full documentation.`,
		});

		commandRegistry.set("hive-mind-optimize", {
			handler: hiveMindOptimizeCommand,
			description: "🔧 Optimize hive mind database for better performance",
			usage: "hive-mind-optimize [options]",
			examples: [
				"hive-mind-optimize                      # Interactive optimization wizard",
				"hive-mind-optimize --auto               # Auto-optimize with defaults",
				"hive-mind-optimize --report             # Generate optimization report",
				"hive-mind-optimize --clean-memory --memory-days 60",
				"hive-mind-optimize --auto --vacuum --archive-tasks",
			],
			details: `
Hive Mind Database Optimization Features:
  • Safe, backward-compatible optimizations
  • Performance indexes for 50% faster queries
  • Memory cleanup and archiving
  • Task archival for space management
  • Behavioral pattern tracking
  • Database integrity checking

Optimization Levels:
  • v1.0 → v1.1: Basic performance indexes
  • v1.1 → v1.2: Advanced query optimization
  • v1.2 → v1.3: Performance tracking tables
  • v1.3 → v1.4: Memory optimization features
  • v1.4 → v1.5: Behavioral analysis tracking

Safety Features:
  • Automatic backups before major operations
  • All changes are backward-compatible
  • Existing data is always preserved
  • Rollback capability on errors`,
		});

		commandRegistry.set("swarm-metrics", {
			handler: async (args, flags) => {
				const subcommand = args[0];
				if (subcommand === "fix") {
					return await fixTaskAttribution();
				} else {
					return await showUnifiedMetrics();
				}
			},
			description: "Unified swarm metrics and task attribution diagnostics",
			usage: "swarm-metrics [fix] [options]",
			examples: [
				"swarm-metrics                    # Show unified metrics from all swarm systems",
				"swarm-metrics fix                # Fix task attribution issues between systems",
			],
			details: `
Swarm Metrics Integration Features:
  • Unified view of hive-mind and ruv-swarm metrics
  • Task attribution diagnosis and repair
  • Cross-system swarm performance comparison
  • Database integration status checking
  • Automatic sample task creation for empty swarms

This command helps resolve issues where:
  • Overall task statistics show correctly but per-swarm shows 0/0
  • Multiple swarm systems are not properly integrated
  • Task assignments are missing or incorrectly attributed

Use 'swarm-metrics fix' to automatically repair attribution issues.`,
		});

		commandRegistry.set("batch", {
			handler: batchManagerCommand,
			description: "Batch operation management and configuration utilities",
			usage: "batch <command> [options]",
			examples: [
				"batch create-config my-batch.json",
				"batch create-config --interactive",
				"batch validate-config my-batch.json",
				"batch estimate my-batch.json",
				"batch list-templates",
				"batch list-environments",
			],
			details: `
Batch operations support:
  • Multiple project initialization with templates
  • Environment-specific configurations (dev, staging, prod)
  • Parallel processing with resource management
  • Progress tracking and detailed reporting
  • Configuration validation and estimation tools

Use with init command:
  claude-flow init --batch-init project1,project2,project3
  claude-flow init --config batch-config.json --parallel`,
		});

		commandRegistry.set("github", {
			handler: githubCommand,
			description: "GitHub workflow automation with 6 specialized modes",
			usage: "github <mode> <objective> [options]",
			examples: [
				'github pr-manager "create feature PR with automated testing"',
				'github gh-coordinator "setup CI/CD pipeline" --auto-approve',
				'github release-manager "prepare v2.0.0 release"',
				'github repo-architect "optimize repository structure"',
				'github issue-tracker "analyze project roadmap issues"',
				'github sync-coordinator "sync package versions across repos"',
			],
			details: `
GitHub automation modes:
  • gh-coordinator: GitHub workflow orchestration and coordination
  • pr-manager: Pull request management with multi-reviewer coordination
  • issue-tracker: Issue management and project coordination
  • release-manager: Release coordination and deployment pipelines
  • repo-architect: Repository structure optimization
  • sync-coordinator: Multi-package synchronization and version alignment

Advanced features:
  • Multi-reviewer coordination with automated scheduling
  • Intelligent issue categorization and assignment
  • Automated testing integration and quality gates
  • Release pipeline orchestration with rollback capabilities`,
		});

		commandRegistry.set("training", {
			handler: trainingAction,
			description: "Neural pattern learning and model updates",
			usage: "training <command> [options]",
			examples: [
				"training neural-train --data recent --model task-predictor",
				'training pattern-learn --operation "file-creation" --outcome "success"',
				'training model-update --agent-type coordinator --operation-result "efficient"',
			],
			details: `
Neural training commands:
  • neural-train: Train neural patterns from operations
  • pattern-learn: Learn from specific operation outcomes
  • model-update: Update agent models with new insights

Improves task selection accuracy, agent performance prediction, and coordination efficiency.`,
		});

		commandRegistry.set("analysis", {
			handler: analysisAction,
			description: "Performance and usage analytics",
			usage: "analysis <command> [options]",
			examples: [
				"analysis bottleneck-detect --scope system",
				"analysis performance-report --timeframe 7d --format detailed",
				"analysis token-usage --breakdown --cost-analysis",
			],
			details: `
Analysis commands:
  • bottleneck-detect: Detect performance bottlenecks in the system
  • performance-report: Generate comprehensive performance reports
  • token-usage: Analyze token consumption and costs

Helps with performance optimization, cost management, and resource allocation.`,
		});

		commandRegistry.set("automation", {
			handler: automationAction,
			description: "Intelligent agent and workflow management",
			usage: "automation <command> [options]",
			examples: [
				"automation auto-agent --task-complexity enterprise --swarm-id swarm-123",
				'automation smart-spawn --requirement "web-development" --max-agents 8',
				"automation workflow-select --project-type api --priority speed",
			],
			details: `
Automation commands:
  • auto-agent: Automatically spawn optimal agents based on task complexity
  • smart-spawn: Intelligently spawn agents based on specific requirements
  • workflow-select: Select and configure optimal workflows for project types

Provides optimal resource allocation and intelligent agent selection.`,
		});

		commandRegistry.set("coordination", {
			handler: coordinationAction,
			description: "Swarm and agent orchestration",
			usage: "coordination <command> [options]",
			examples: [
				"coordination swarm-init --topology hierarchical --max-agents 8",
				'coordination agent-spawn --type developer --name "api-dev" --swarm-id swarm-123',
				'coordination task-orchestrate --task "Build REST API" --strategy parallel',
			],
			details: `
Coordination commands:
  • swarm-init: Initialize swarm coordination infrastructure
  • agent-spawn: Spawn and coordinate new agents
  • task-orchestrate: Orchestrate task execution across agents

Enables intelligent task distribution, agent synchronization, and shared memory coordination.`,
		});

		commandRegistry.set("hooks", {
			handler: async (args, flags) => {
				// Import the hooks implementation directly
				const { hooksCommand } = await import("./simple-commands/hooks.js");
				await hooksCommand(args);
			},
			description:
				"Advanced lifecycle event management with coordination and automation",
			usage: "hooks <command> [options]",
			loadMetadata: async () => {
				const { hooksCommandMetadata } = await import(
					"./simple-commands/hooks-metadata.js"
				);
				return hooksCommandMetadata;
			},
			examples: [
				'hooks start --description "Build REST API" --task-id api-123',
				'hooks post-edit --file "src/api.js" --memory-key "api/progress"',
				"hooks session-end --generate-summary --export-metrics",
				"hooks performance-checkpoint --analyze-performance --telemetry",
				"hooks workflow-transition --from planning --to execution",
				"hooks security-audit --level critical --generate-summary",
			],
			details: `
Advanced Lifecycle Event Management:
  • 🚀 Quick shortcuts: start, update, complete, save, notify
  • 📋 Pre-operation hooks: task, edit, bash, search preparation
  • 📊 Post-operation hooks: cleanup, analysis, metrics collection
  • 🔌 MCP integration: agent spawning, task orchestration, neural training
  • 💾 Session management: state persistence, context restoration
  • 🚨 Advanced hooks: workflow transitions, performance monitoring, security audits

Features: SQLite persistence, cross-session memory, intelligent coordination, ruv-swarm integration.`,
		});

		commandRegistry.set("hook-safety", {
			handler: hookSafetyCommand,
			description:
				"🚨 Critical hook safety system - Prevent infinite loops & financial damage",
			usage: "hook-safety <command> [options]",
			examples: [
				"hook-safety validate                           # Check for dangerous hook configurations",
				"hook-safety validate --config ~/.claude/settings.json",
				"hook-safety status                             # View safety status and context",
				"hook-safety reset                              # Reset circuit breakers",
				"hook-safety safe-mode                          # Enable safe mode (skip all hooks)",
			],
			details: `
🚨 CRITICAL: Stop hooks calling 'claude' commands create INFINITE LOOPS that can:
  • Bypass API rate limits
  • Cost thousands of dollars per day
  • Make your system unresponsive

Hook Safety commands:
  • validate: Check Claude Code settings for dangerous patterns
  • status: Show current safety status and execution context
  • reset: Reset circuit breakers and execution counters
  • safe-mode: Enable/disable safe mode (skips all hooks)

SAFE ALTERNATIVES:
  • Use PostToolUse hooks instead of Stop hooks
  • Implement flag-based update patterns
  • Use 'claude --skip-hooks' for manual updates
  • Create conditional execution scripts

For more information: https://github.com/ruvnet/claude-flow/issues/166`,
		});

		commandRegistry.set("hive", {
			handler: async (args, flags) => {
				try {
					// Try to load the hive command module
					const { hiveAction } = await import("./commands/hive.js");
					return hiveAction({ args, flags, command: "hive" });
				} catch (error) {
					// Fallback to simple implementation if module not found
					console.log("🐝 Hive Mind - Advanced Multi-Agent Coordination");
					console.log("");
					console.log("The Hive Mind system provides:");
					console.log("  • Consensus-based decision making");
					console.log("  • Distributed task orchestration");
					console.log("  • Quality-driven execution");
					console.log("  • Real-time swarm monitoring");
					console.log("");
					console.log("Usage: hive <objective> [options]");
					console.log("");
					console.log(
						"For full functionality, ensure the hive module is properly built.",
					);
				}
			},
			description: "Hive Mind - Advanced multi-agent swarm with consensus",
			usage: "hive <objective> [options]",
			examples: [
				'hive "Build microservices architecture"',
				'hive "Optimize database performance" --consensus unanimous',
				'hive "Develop ML pipeline" --topology mesh --monitor',
				'hive "Create REST API" --sparc --max-agents 8',
				'hive "Research cloud patterns" --background --quality-threshold 0.9',
			],
			details: `
Hive Mind features:
  • 👑 Queen-led orchestration with specialized agents
  • 🗳️ Consensus mechanisms (quorum, unanimous, weighted, leader)
  • 🏗️ Multiple topologies (hierarchical, mesh, ring, star)
  • 📊 Real-time monitoring dashboard
  • 🧪 SPARC methodology integration
  • 💾 Distributed memory and knowledge sharing

Agent types:
  • Queen: Orchestrator and decision maker
  • Architect: System design and planning
  • Worker: Implementation and execution
  • Scout: Research and exploration
  • Guardian: Quality and validation

Options:
  --topology <type>         Swarm topology (default: hierarchical)
  --consensus <type>        Decision mechanism (default: quorum)
  --max-agents <n>          Maximum agents (default: 8)
  --quality-threshold <n>   Min quality 0-1 (default: 0.8)
  --sparc                   Use SPARC methodology
  --monitor                 Real-time monitoring
  --background              Run in background`,
		});

		// Metadata-driven command example
		commandRegistry.set("init-meta", {
			handler: initCommandMetadataDriven,
			description: "Metadata-driven init command (demo)",
			category: "core",
			loadMetadata: async () => {
				const { initCommandMetadata } = await import(
					"./simple-commands/init-metadata.js"
				);
				return initCommandMetadata;
			},
		});

		debugLogger.logFunctionExit(
			correlationId,
			`registered ${commandRegistry.size} core commands`,
			"cli-init",
		);
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "cli-init");
		throw error;
	}
}

// Register a new command
function registerCommand(name, command) {
	const correlationId = debugLogger.logFunctionEntry(
		"CLI",
		"command-registry.registerCommand",
		[name, command],
		"cli-init",
	);
	try {
		if (commandRegistry.has(name)) {
			console.warn(`Command '${name}' already exists and will be overwritten`);
		}

		commandRegistry.set(name, {
			handler: command.handler,
			description: command.description || "No description available",
			usage: command.usage || `${name} [options]`,
			examples: command.examples || [],
			hidden: command.hidden || false,
		});

		debugLogger.logFunctionExit(
			correlationId,
			`command '${name}' registered successfully`,
			"cli-init",
		);
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "cli-init");
		throw error;
	}
}

// Get command handler
export function getCommand(name) {
	return commandRegistry.get(name);
}

// List all registered commands
export function listCommands(includeHidden = false) {
	const correlationId = debugLogger.logFunctionEntry(
		"CLI",
		"command-registry.listCommands",
		[includeHidden],
		"cli-util",
	);
	try {
		const commands = [];
		for (const [name, command] of commandRegistry.entries()) {
			if (includeHidden || !command.hidden) {
				commands.push({
					name,
					...command,
				});
			}
		}
		const sortedCommands = commands.sort((a, b) =>
			a.name.localeCompare(b.name),
		);
		debugLogger.logFunctionExit(
			correlationId,
			`listed ${sortedCommands.length} commands (includeHidden: ${includeHidden})`,
			"cli-util",
		);
		return sortedCommands;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "cli-util");
		throw error;
	}
}

// Check if command exists
export function hasCommand(name) {
	return commandRegistry.has(name);
}

// Execute a command
export async function executeCommand(name, subArgs, flags) {
	const correlationId = debugLogger.logFunctionEntry(
		"CLI",
		"command-registry.executeCommand",
		[name, subArgs, flags],
		"cli-command",
	);
	try {
		const command = commandRegistry.get(name);
		if (!command) {
			const error = new Error(`Unknown command: ${name}`);
			debugLogger.logFunctionError(correlationId, error, "cli-command");
			throw error;
		}

		await command.handler(subArgs, flags);
		debugLogger.logFunctionExit(
			correlationId,
			`command '${name}' executed successfully`,
			"cli-command",
		);
	} catch (err) {
		const wrappedError = new Error(`Command '${name}' failed: ${err.message}`);
		debugLogger.logFunctionError(correlationId, wrappedError, "cli-command");
		throw wrappedError;
	}
}

// Helper to show command help
export async function showCommandHelp(name) {
	const correlationId = debugLogger.logFunctionEntry(
		"CLI",
		"command-registry.showCommandHelp",
		[name],
		"cli-util",
	);
	try {
		const command = commandRegistry.get(name);
		if (!command) {
			console.log(`Unknown command: ${name}`);
			debugLogger.logFunctionExit(
				correlationId,
				`unknown command: ${name}`,
				"cli-util",
			);
			return;
		}

		console.log(`Command: ${name}`);
		console.log(`Description: ${command.description}`);

		// Try to load metadata for enhanced help
		let metadata = null;
		try {
			if (command.loadMetadata && typeof command.loadMetadata === "function") {
				metadata = await command.loadMetadata();
			}
		} catch (error) {
			// Fallback to basic help
		}

		// Generate usage
		if (metadata) {
			// Import metadata utilities
			const { generateUsageFromMetadata, generateOptionsHelp } = await import(
				"./command-metadata.js"
			);
			console.log(`Usage: ${generateUsageFromMetadata(name, metadata)}`);

			if (metadata.details) {
				console.log(metadata.details);
			}

			// Show options help
			const optionsHelp = generateOptionsHelp(metadata);
			if (optionsHelp) {
				console.log(optionsHelp);
			}

			// Show examples
			if (metadata.examples && metadata.examples.length > 0) {
				console.log("\nExamples:");
				for (const example of metadata.examples) {
					console.log(`  ${example}`);
				}
			}
		} else {
			// Fallback to original help format
			console.log(`Usage: claude-flow ${command.usage || `${name} [options]`}`);

			if (command.details) {
				console.log(command.details);
			}

			if (command.examples && command.examples.length > 0) {
				console.log("\nExamples:");
				for (const example of command.examples) {
					if (example.startsWith("npx")) {
						console.log(`  ${example}`);
					} else {
						console.log(`  claude-flow ${example}`);
					}
				}
			}
		}

		debugLogger.logFunctionExit(
			correlationId,
			`help shown for command: ${name}`,
			"cli-util",
		);
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "cli-util");
		throw error;
	}
}

// Helper to show all commands
export function showAllCommands() {
	const commands = listCommands();

	console.log("Available commands:");
	console.log();

	for (const command of commands) {
		console.log(`  ${command.name.padEnd(12)} ${command.description}`);
	}

	console.log();
	console.log(
		'Use "claude-flow help <command>" for detailed usage information',
	);
}

// Initialize the command registry
registerCoreCommands();
