// ABOUTME: Agent management commands with hierarchical coordination and ecosystem orchestration
// ABOUTME: Handles comprehensive AI agent lifecycle management with metadata-driven command parsing

import { debugLogger } from "../../../cli/utils/utils-debug-logger.js";
import {
	type CommandMetadata,
	generateCommandHelp,
	parseCommandArgs,
	validateCommandArgs,
} from "../../core/metadata.js";
import { printError, printSuccess } from "../../core/utils.js";
import type { AgentType } from "../../shared/types.js";
import { agentCommands } from "./agentCommands.js";

/**
 * Agent status states during lifecycle
 */
export type AgentStatus = "active" | "idle" | "terminated" | "unhealthy";

/**
 * Agent health status levels
 */
export type AgentHealth = "excellent" | "good" | "degraded" | "critical";

/**
 * System load levels for monitoring
 */
export type SystemLoad = "low" | "medium" | "high" | "critical";

/**
 * Command line options for agent operations
 */
export interface AgentCommandOptions {
	type?: AgentType;
	name?: string;
	detailed?: boolean;
	json?: boolean;
	pattern?: string;
	status?: AgentStatus;
	session?: string;
	force?: boolean;
	verbose?: boolean;
}

/**
 * Agent information structure
 */
export interface AgentInfo {
	id: string;
	type: AgentType;
	status: AgentStatus;
	capabilities: string[];
	created: string;
	tasks_completed: number;
	current_task: string | null;
	health: AgentHealth;
}

/**
 * Agent spawn result data
 */
export interface AgentSpawnResult {
	id: string;
	type: AgentType;
	status: string;
	timestamp: string;
	capabilities: string[];
}

/**
 * Agent termination result
 */
export interface AgentTerminationResult {
	agent_id: string;
	termination_type: "force" | "graceful";
	status: string;
	timestamp: string;
}

/**
 * System health data structure
 */
export interface SystemHealthData {
	overall_status: string;
	active_agents: number;
	total_agents: number;
	system_load: SystemLoad;
	memory_usage: string;
	last_check: string;
}

/**
 * Unified agent listing options
 */
export interface UnifiedAgentListOptions {
	detailed?: boolean;
	json?: boolean;
	pattern?: string;
	type?: AgentType;
	status?: AgentStatus;
	sessionId?: string;
	verbose?: boolean;
}

/**
 * Parsed command arguments
 */
export interface ParsedCommand {
	subcommand?: string;
	args: string[];
	options: Record<string, unknown>;
	remainingArgs: string[];
	help: boolean;
}

// Agent command metadata
export const agentCommandMetadata: CommandMetadata = {
	category: "core",
	helpDescription:
		"Comprehensive AI agent lifecycle management with hierarchical coordination and ecosystem orchestration",
	priority: "high",
	subcommands: [
		"spawn",
		"list",
		"terminate",
		"info",
		"health",
		"hierarchy",
		"network",
		"ecosystem",
		"provision",
	],
	options: [
		{
			name: "type",
			short: "t",
			type: "string",
			description: "Agent type for spawn/filtering operations",
			choices: [
				"researcher",
				"coder",
				"analyst",
				"coordinator",
				"tester",
				"architect",
				"reviewer",
				"optimizer",
				"documenter",
			],
		},
		{
			name: "name",
			short: "n",
			type: "string",
			description: "Custom name for the agent",
		},
		{
			name: "detailed",
			short: "d",
			type: "boolean",
			description:
				"Show detailed information including capabilities and metrics",
			default: false,
		},
		{
			name: "json",
			short: "j",
			type: "boolean",
			description: "Output results in JSON format for programmatic use",
			default: false,
		},
		{
			name: "pattern",
			short: "p",
			type: "string",
			description: "Filter agents by name pattern (supports wildcards)",
		},
		{
			name: "status",
			short: "s",
			type: "string",
			description: "Filter agents by status",
			choices: ["active", "idle", "terminated", "unhealthy"],
		},
		{
			name: "session",
			type: "string",
			description: "Filter agents by session ID",
		},
		{
			name: "force",
			short: "f",
			type: "boolean",
			description: "Force operation without confirmation prompts",
			default: false,
		},
		{
			name: "verbose",
			short: "v",
			type: "boolean",
			description:
				"Enable verbose output with additional diagnostic information",
			default: false,
		},
	],
	examples: [
		"claude-flow agent spawn researcher              # Create researcher agent",
		'claude-flow agent spawn coder --name "APIBot"   # Create named coder agent',
		"claude-flow agent list                          # List all active agents",
		"claude-flow agent list --detailed               # List with full details",
		"claude-flow agent list --status active         # Filter by status",
		"claude-flow agent list --type researcher        # Filter by type",
		"claude-flow agent info agent-123                # Show agent details",
		"claude-flow agent terminate agent-123           # Safely terminate agent",
		"claude-flow agent terminate agent-123 --force   # Force termination",
		"claude-flow agent health                        # System health check",
		"claude-flow agent hierarchy create enterprise   # Create hierarchy",
		"claude-flow agent network create mesh           # Setup network",
		"claude-flow agent ecosystem init                # Initialize ecosystem",
	],
	details: `
Agent Management System provides comprehensive lifecycle management for AI agents:

Core Operations:
  • spawn: Create specialized agents (researcher, coder, analyst, etc.)
  • list: Display active agents with filtering and detailed views
  • info: Show comprehensive agent information and metrics
  • terminate: Safely shutdown agents with optional force mode
  • health: Monitor system-wide agent health and performance

Advanced Features:
  • hierarchy: Multi-level agent organization with management chains
  • network: Peer-to-peer agent communication and coordination
  • ecosystem: Shared resource pools and distributed task management
  • provision: Dynamic resource allocation and capability assignment

Agent Types:
  • researcher: Information gathering and analysis
  • coder: Code generation and software development
  • analyst: Data analysis and pattern recognition
  • coordinator: Multi-agent orchestration and task delegation
  • tester: Quality assurance and validation
  • architect: System design and planning
  • reviewer: Code review and quality control
  • optimizer: Performance tuning and resource optimization
  • documenter: Documentation generation and maintenance

Filtering and Output:
  • Use --detailed for comprehensive agent information
  • Use --json for programmatic integration
  • Filter by type, status, pattern, or session
  • Support for wildcards in pattern matching`,
};

/**
 * Main agent command handler - routes to specific agent operations using metadata
 * @param subArgs - Command line arguments after 'agent'
 * @param flags - Command line flags and options
 */
export async function agentCommand(
	subArgs: string[],
	flags: Record<string, unknown>,
): Promise<void> {
	const correlationId = debugLogger.logFunctionEntry(
		"CLI",
		"simple-commands.agent.agentCommand",
		[subArgs, flags],
		"cli-command",
	);
	try {
		// Parse arguments using metadata
		const parsed = parseCommandArgs(subArgs, flags, agentCommandMetadata);

		// Map ParsedCommandArgs to ParsedCommand for backward compatibility
		const parsedCommand: ParsedCommand = {
			subcommand: parsed.subcommand,
			args: parsed.remainingArgs,
			options: parsed.options,
			remainingArgs: parsed.remainingArgs,
			help: parsed.help,
		};

		// Show help if requested
		if (parsedCommand.help) {
			console.log(generateCommandHelp("agent", agentCommandMetadata));
			debugLogger.logFunctionExit(
				correlationId,
				"help displayed",
				"cli-command",
			);
			return;
		}

		// Validate arguments
		const errors = validateCommandArgs(parsed, agentCommandMetadata);
		if (errors.length > 0) {
			printError("Invalid arguments:");
			errors.forEach((error) => console.error(`  • ${error}`));
			console.log("\nUse --help for usage information");
			debugLogger.logFunctionExit(
				correlationId,
				`validation errors: ${errors.length}`,
				"cli-command",
			);
			return;
		}

		// Extract subcommand and options
		const agentCmd = parsedCommand.subcommand || subArgs[0];
		const {
			type,
			name,
			detailed,
			json,
			pattern,
			status,
			session,
			force,
			verbose,
		} = parsedCommand.options;

		const commandOptions: AgentCommandOptions = {
			type: type as AgentType,
			name: name as string,
			detailed: detailed as boolean,
			json: json as boolean,
			pattern: pattern as string,
			status: status as AgentStatus,
			session: session as string,
			force: force as boolean,
			verbose: verbose as boolean,
			...flags,
		};

		switch (agentCmd) {
			case "spawn":
				await agentCommands.spawn(parsedCommand.args, commandOptions);
				break;

			case "list":
				await agentCommands.list(parsedCommand.args, commandOptions);
				break;

			case "terminate":
				await agentCommands.terminate(parsedCommand.args, commandOptions);
				break;

			case "info":
				await agentCommands.info(parsedCommand.args, commandOptions);
				break;

			case "health":
				await agentCommands.health(parsedCommand.args, commandOptions);
				break;

			case "hierarchy":
				await manageHierarchy(subArgs, commandOptions);
				break;

			case "network":
				await manageNetwork(subArgs, commandOptions);
				break;

			case "ecosystem":
				await manageEcosystem(subArgs, commandOptions);
				break;

			case "provision":
				await provisionAgent(subArgs, commandOptions);
				break;

			default:
				if (!agentCmd) {
					console.log(generateCommandHelp("agent", agentCommandMetadata));
				} else {
					printError(`Unknown agent subcommand: ${agentCmd}`);
					console.log("\nUse --help for available commands");
				}
		}

		debugLogger.logFunctionExit(
			correlationId,
			`agent command '${agentCmd}' completed successfully`,
			"cli-command",
		);
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "cli-command");
		printError(
			`Agent command failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		if ((flags as any).verbose) {
			console.error(error instanceof Error ? error.stack : error);
		}
	}
}

/**
 * Manage agent hierarchy operations
 * @param subArgs - Command arguments including hierarchy action
 * @param flags - Command flags with options
 */
async function manageHierarchy(
	subArgs: string[],
	flags: AgentCommandOptions,
): Promise<void> {
	const action = subArgs[1];
	switch (action) {
		case "create":
			printSuccess("Creating agent hierarchy...");
			console.log("🏗️  Hierarchy structure would be created");
			console.log("   • Manager agents");
			console.log("   • Worker agents");
			console.log("   • Specialist agents");
			break;
		case "list":
			printSuccess("Agent Hierarchies:");
			console.log("📊 No hierarchies defined");
			break;
		default:
			console.log("Usage: agent hierarchy <create|list|update|delete>");
	}
}

/**
 * Manage agent network operations
 * @param subArgs - Command arguments including network action
 * @param flags - Command flags with options
 */
async function manageNetwork(
	subArgs: string[],
	flags: AgentCommandOptions,
): Promise<void> {
	const action = subArgs[1];
	switch (action) {
		case "create":
			printSuccess("Creating agent network...");
			console.log("🌐 Network would be established");
			console.log("   • Peer-to-peer connections");
			console.log("   • Message routing");
			console.log("   • Resource sharing");
			break;
		case "status":
			printSuccess("Network Status:");
			console.log("🟢 Network: Not configured");
			break;
		default:
			console.log("Usage: agent network <create|status|update|disconnect>");
	}
}

/**
 * Manage agent ecosystem operations
 * @param subArgs - Command arguments including ecosystem action
 * @param flags - Command flags with options
 */
async function manageEcosystem(
	subArgs: string[],
	flags: AgentCommandOptions,
): Promise<void> {
	const action = subArgs[1];
	switch (action) {
		case "init":
			printSuccess("Initializing agent ecosystem...");
			console.log("🌿 Ecosystem would include:");
			console.log("   • Shared memory pools");
			console.log("   • Resource allocation");
			console.log("   • Task distribution");
			console.log("   • Performance monitoring");
			break;
		case "stats":
			printSuccess("Ecosystem Statistics:");
			console.log("📊 No ecosystem initialized");
			break;
		default:
			console.log("Usage: agent ecosystem <init|stats|optimize|reset>");
	}
}

/**
 * Provision resources for a specific agent
 * @param subArgs - Command arguments including agent ID
 * @param flags - Command flags with options
 */
async function provisionAgent(
	subArgs: string[],
	flags: AgentCommandOptions,
): Promise<void> {
	const agentId = subArgs[1];
	if (!agentId) {
		printError("Please specify an agent ID to provision");
		return;
	}

	printSuccess(`Provisioning agent ${agentId}...`);
	console.log("🔧 Agent would be provisioned with:");
	console.log("   • Compute resources");
	console.log("   • Memory allocation");
	console.log("   • Task permissions");
	console.log("   • Network access");
}

/**
 * Legacy agent termination (routes to unified implementation)
 * @param subArgs - Command arguments
 * @param flags - Command flags
 */
async function terminateAgent(
	subArgs: string[],
	flags: AgentCommandOptions,
): Promise<void> {
	await agentCommands.terminate(subArgs.slice(1), flags);
}

/**
 * Legacy agent info (routes to unified implementation)
 * @param subArgs - Command arguments
 * @param flags - Command flags
 */
async function showAgentInfo(
	subArgs: string[],
	flags: AgentCommandOptions,
): Promise<void> {
	await agentCommands.info(subArgs.slice(1), flags);
}

/**
 * Display help information for agent commands
 */
function showAgentHelp(): void {
	console.log(`
🤖 Agent Management Commands:

Core Commands:
  spawn <type>         Create a new agent with specified type
  list                 Display all active agents
  info <id>           Show detailed information about an agent
  terminate <id>      Safely terminate an agent
  health              Monitor agent health and performance

Advanced Commands:
  hierarchy <action>   Manage agent hierarchies
  network <action>     Configure agent networks
  ecosystem <action>   Manage agent ecosystems
  provision <id>      Provision resources for an agent

Examples:
  agent spawn researcher --name "DataBot"
  agent list --unhealthy
  agent info agent-123
  agent terminate agent-123 --force
  agent health
  agent hierarchy create enterprise
  agent network create mesh
  agent ecosystem init

Use --help with any command for detailed options.
	`);
}

/**
 * Extract flag value from command line arguments
 * @param args - Command line arguments array
 * @param flagName - Name of the flag to extract
 * @returns Flag value or null if not found
 */
function getFlag(args: string[], flagName: string): string | null {
	const index = args.indexOf(flagName);
	return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}
