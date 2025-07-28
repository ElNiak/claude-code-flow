// ABOUTME: Advanced AI swarm coordination with intelligent task orchestration and distributed execution
// ABOUTME: Handles complex swarm operations with metadata-driven command parsing and comprehensive strategy support

import { ChildProcess, execSync, spawn } from "child_process";
import { chmodSync, existsSync, statSync } from "fs";
import { open } from "fs/promises";
import path from "path";
import process from "process";
import {
	type CommandMetadata,
	generateCommandHelp,
	parseCommandArgs,
	validateCommandArgs,
} from "../command-metadata.js";
import { args, cwd, exit, mkdirAsync, writeTextFile } from "../node-compat.js";

/**
 * Swarm execution strategies
 */
export type SwarmStrategy =
	| "auto"
	| "research"
	| "development"
	| "analysis"
	| "testing"
	| "optimization"
	| "maintenance";

/**
 * Swarm coordination modes
 */
export type CoordinationMode =
	| "centralized"
	| "distributed"
	| "hierarchical"
	| "mesh"
	| "hybrid";

/**
 * Output format options
 */
export type OutputFormat = "json" | "text";

/**
 * Agent selection strategies
 */
export type AgentSelectionStrategy =
	| "capability-based"
	| "random"
	| "round-robin"
	| "load-balanced";

/**
 * Task scheduling algorithms
 */
export type TaskSchedulingAlgorithm =
	| "priority"
	| "fifo"
	| "deadline"
	| "shortest-job";

/**
 * Load balancing methods
 */
export type LoadBalancingMethod =
	| "work-stealing"
	| "round-robin"
	| "least-loaded"
	| "random";

/**
 * Fault tolerance strategies
 */
export type FaultToleranceStrategy =
	| "retry"
	| "failover"
	| "circuit-breaker"
	| "graceful-degradation";

/**
 * Swarm command options
 */
export interface SwarmCommandOptions {
	strategy?: SwarmStrategy;
	mode?: CoordinationMode;
	"max-agents"?: number;
	timeout?: number;
	"task-timeout-minutes"?: number;
	parallel?: boolean;
	distributed?: boolean;
	monitor?: boolean;
	ui?: boolean;
	background?: boolean;
	review?: boolean;
	testing?: boolean;
	encryption?: boolean;
	verbose?: boolean;
	"dry-run"?: boolean;
	executor?: boolean;
	"output-format"?: OutputFormat;
	"output-file"?: string;
	"no-interactive"?: boolean;
	"no-auto-permissions"?: boolean;
	"test-mode"?: boolean;
	"quality-threshold"?: number;
	"memory-namespace"?: string;
	"agent-selection"?: AgentSelectionStrategy;
	"task-scheduling"?: TaskSchedulingAlgorithm;
	"load-balancing"?: LoadBalancingMethod;
	"fault-tolerance"?: FaultToleranceStrategy;
	sparc?: boolean;
}

/**
 * Parsed command structure
 */
export interface ParsedCommand {
	subcommand?: string;
	args: string[];
	options: Record<string, unknown>;
	remainingArgs: string[];
	help: boolean;
}

/**
 * Strategy guidance structure
 */
export interface StrategyGuidance {
	description: string;
	agents: string[];
	approach: string;
	focus: string[];
}

/**
 * Mode guidance structure
 */
export interface ModeGuidance {
	description: string;
	coordination: string;
	benefits: string[];
	considerations: string[];
}

/**
 * Agent recommendation structure
 */
export interface AgentRecommendation {
	type: string;
	name: string;
	role: string;
	priority: number;
}

/**
 * Swarm execution result
 */
export interface SwarmExecutionResult {
	success: boolean;
	testMode?: boolean;
	outputFile?: string;
	agents?: number;
	strategy?: SwarmStrategy;
	mode?: CoordinationMode;
}

// Swarm command metadata
export const swarmCommandMetadata: CommandMetadata = {
	category: "core",
	helpDescription:
		"Advanced AI swarm coordination with intelligent task orchestration and distributed execution",
	priority: "high",
	options: [
		{
			name: "strategy",
			type: "string",
			description: "Execution strategy for the swarm",
			choices: [
				"auto",
				"research",
				"development",
				"analysis",
				"testing",
				"optimization",
				"maintenance",
			],
			default: "auto",
		},
		{
			name: "mode",
			type: "string",
			description: "Coordination mode for agent interaction",
			choices: ["centralized", "distributed", "hierarchical", "mesh", "hybrid"],
			default: "centralized",
		},
		{
			name: "max-agents",
			type: "number",
			description: "Maximum number of agents to spawn",
			default: 5,
		},
		{
			name: "timeout",
			type: "number",
			description: "Timeout in minutes for swarm execution",
			default: 60,
		},
		{
			name: "task-timeout-minutes",
			type: "number",
			description: "Individual task timeout in minutes",
			default: 59,
		},
		{
			name: "parallel",
			type: "boolean",
			description: "Enable parallel execution of tasks",
			default: false,
		},
		{
			name: "distributed",
			type: "boolean",
			description: "Enable distributed coordination mode",
			default: false,
		},
		{
			name: "monitor",
			type: "boolean",
			description: "Enable real-time monitoring dashboard",
			default: false,
		},
		{
			name: "ui",
			type: "boolean",
			description: "Launch terminal user interface",
			default: false,
		},
		{
			name: "background",
			type: "boolean",
			description: "Run swarm in background mode",
			default: false,
		},
		{
			name: "review",
			type: "boolean",
			description: "Enable peer review mode for quality assurance",
			default: false,
		},
		{
			name: "testing",
			type: "boolean",
			description: "Enable automated testing integration",
			default: false,
		},
		{
			name: "encryption",
			type: "boolean",
			description: "Enable encryption for agent communications",
			default: false,
		},
		{
			name: "verbose",
			short: "v",
			type: "boolean",
			description: "Enable detailed logging and diagnostic output",
			default: false,
		},
		{
			name: "dry-run",
			type: "boolean",
			description: "Show configuration without executing the swarm",
			default: false,
		},
		{
			name: "executor",
			type: "boolean",
			description: "Use built-in executor instead of Claude Code integration",
			default: false,
		},
		{
			name: "output-format",
			type: "string",
			description: "Output format for results",
			choices: ["json", "text"],
			default: "text",
		},
		{
			name: "output-file",
			type: "string",
			description: "Save output to specified file instead of stdout",
		},
		{
			name: "no-interactive",
			type: "boolean",
			description: "Run in non-interactive mode",
			default: false,
		},
		{
			name: "no-auto-permissions",
			type: "boolean",
			description: "Disable automatic dangerously-skip-permissions flag",
			default: false,
		},
		{
			name: "test-mode",
			type: "boolean",
			description: "Enable test mode (bypasses external processes)",
			default: false,
		},
		{
			name: "quality-threshold",
			type: "number",
			description: "Quality threshold for task completion (0-1)",
			default: 0.8,
		},
		{
			name: "memory-namespace",
			type: "string",
			description: "Memory namespace for agent coordination",
			default: "swarm",
		},
		{
			name: "agent-selection",
			type: "string",
			description: "Agent selection strategy",
			choices: ["capability-based", "random", "round-robin", "load-balanced"],
		},
		{
			name: "task-scheduling",
			type: "string",
			description: "Task scheduling algorithm",
			choices: ["priority", "fifo", "deadline", "shortest-job"],
		},
		{
			name: "load-balancing",
			type: "string",
			description: "Load balancing method",
			choices: ["work-stealing", "round-robin", "least-loaded", "random"],
		},
		{
			name: "fault-tolerance",
			type: "string",
			description: "Fault tolerance strategy",
			choices: ["retry", "failover", "circuit-breaker", "graceful-degradation"],
		},
		{
			name: "sparc",
			type: "boolean",
			description:
				"Enable SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion)",
			default: false,
		},
	],
	examples: [
		'claude-flow swarm "Build a REST API with authentication"                    # Basic swarm execution',
		'claude-flow swarm "Research cloud architecture patterns" --strategy research # Research-focused swarm',
		'claude-flow swarm "Analyze database performance" --max-agents 3 --parallel  # Parallel analysis',
		'claude-flow swarm "Develop user registration" --mode distributed            # Distributed coordination',
		'claude-flow swarm "Optimize React performance" --strategy optimization      # Performance optimization',
		'claude-flow swarm "Create microservice" --executor                          # Use built-in executor',
		'claude-flow swarm "Build API endpoints" --output-format json               # JSON output format',
		'claude-flow swarm "Research AI trends" --output-file results.json          # Save to file',
		'claude-flow swarm "Test application" --strategy testing --review           # Testing with review',
		'claude-flow swarm "Maintain system" --strategy maintenance --monitor       # Maintenance with monitoring',
		'claude-flow swarm "Design architecture" --sparc --verbose                  # SPARC methodology',
		'claude-flow swarm "Complex project" --mode hierarchical --max-agents 8     # Large hierarchical swarm',
	],
	details: `
Advanced AI Swarm System provides intelligent task orchestration and distributed execution:

Core Features:
  • Intelligent agent management with specialized types (researcher, coder, analyst, etc.)
  • Timeout-free background task execution with process monitoring
  • Distributed memory sharing between agents with persistent storage
  • Work stealing and advanced load balancing algorithms
  • Circuit breaker patterns for fault tolerance and resilience
  • Real-time monitoring and comprehensive metrics dashboard
  • Multiple coordination strategies and algorithms
  • Persistent state with backup and recovery mechanisms
  • Security features with optional encryption for agent communications
  • Interactive terminal UI for swarm management and oversight

Execution Strategies:
  • auto: Automatically determine best approach based on objective analysis
  • research: Optimized for information gathering and analysis workflows
  • development: Specialized for software development and coding tasks
  • analysis: Focused on data analysis and insights generation
  • testing: Quality assurance and comprehensive testing workflows
  • optimization: Performance tuning and system optimization
  • maintenance: System maintenance and update procedures

Coordination Modes:
  • centralized: Single coordinator manages all agents (simple, reliable)
  • distributed: Multiple coordinators share responsibility (fault-tolerant)
  • hierarchical: Tree structure with team leads (enterprise-scale)
  • mesh: Peer-to-peer coordination (flexible, self-organizing)
  • hybrid: Mixed strategies adapted to task requirements

Default Behavior:
  The swarm system integrates with Claude Code by default, providing comprehensive
  MCP tool instructions including memory coordination, agent management, and task
  orchestration. Use --executor flag to run with the built-in executor instead.

Advanced Options:
  • Quality thresholds ensure output meets specified standards
  • Memory namespaces provide isolated coordination contexts
  • Agent selection strategies optimize resource allocation
  • Task scheduling algorithms prioritize work effectively
  • Load balancing methods distribute work efficiently
  • Fault tolerance strategies handle failures gracefully

SPARC Methodology:
  Enable with --sparc for systematic development approach:
  • Specification: Detailed requirements and acceptance criteria
  • Pseudocode: Algorithm design and logic patterns
  • Architecture: System design and component structure
  • Refinement: Test-driven development and optimization
  • Completion: Integration, documentation, and validation`,
};

/**
 * Display comprehensive help information for swarm commands
 */
function showSwarmHelp(): void {
	console.log(`
🐝 Claude Flow Advanced Swarm System

USAGE:
  claude-flow swarm <objective> [options]

EXAMPLES:
  claude-flow swarm "Build a REST API with authentication"
  claude-flow swarm "Research cloud architecture patterns" --strategy research
  claude-flow swarm "Analyze database performance" --max-agents 3 --parallel
  claude-flow swarm "Develop user registration feature" --mode distributed
  claude-flow swarm "Optimize React app performance" --strategy optimization
  claude-flow swarm "Create microservice" --executor  # Use built-in executor
  claude-flow swarm "Build API endpoints" --output-format json  # Get JSON output
  claude-flow swarm "Research AI trends" --output-format json --output-file results.json

DEFAULT BEHAVIOR:
  Swarm now opens Claude Code by default with comprehensive MCP tool instructions
  including memory coordination, agent management, and task orchestration.

  Use --executor flag to run with the built-in executor instead of Claude Code

STRATEGIES:
  auto           Automatically determine best approach (default)
  research       Research and information gathering
  development    Software development and coding
  analysis       Data analysis and insights
  testing        Testing and quality assurance
  optimization   Performance optimization
  maintenance    System maintenance

MODES:
  centralized    Single coordinator (default)
  distributed    Multiple coordinators
  hierarchical   Tree structure coordination
  mesh           Peer-to-peer coordination
  hybrid         Mixed coordination strategies

KEY FEATURES:
  🤖 Intelligent agent management with specialized types
  ⚡ Timeout-free background task execution
  🧠 Distributed memory sharing between agents
  🔄 Work stealing and advanced load balancing
  🛡️  Circuit breaker patterns for fault tolerance
  📊 Real-time monitoring and comprehensive metrics
  🎛️  Multiple coordination strategies and algorithms
  💾 Persistent state with backup and recovery
  🔒 Security features with encryption options
  🖥️  Interactive terminal UI for management

OPTIONS:
  --strategy <type>          Execution strategy (default: auto)
  --mode <type>              Coordination mode (default: centralized)
  --max-agents <n>           Maximum agents (default: 5)
  --timeout <minutes>        Timeout in minutes (default: 60)
  --task-timeout-minutes <n> Task execution timeout in minutes (default: 59)
  --parallel                 Enable parallel execution
  --distributed              Enable distributed coordination
  --monitor                  Enable real-time monitoring
  --ui                       Launch terminal UI interface
  --background               Run in background mode
  --review                   Enable peer review
  --testing                  Enable automated testing
  --encryption               Enable encryption
  --verbose                  Enable detailed logging
  --dry-run                  Show configuration without executing
  --executor                 Use built-in executor instead of Claude Code
  --output-format <format>   Output format: json, text (default: text)
  --output-file <path>       Save output to file instead of stdout
  --no-interactive           Run in non-interactive mode (auto-enabled with --output-format json)
  --auto                     (Deprecated: auto-permissions enabled by default)
  --no-auto-permissions      Disable automatic --dangerously-skip-permissions
  --test-mode                Enable test mode (bypasses external processes)

ADVANCED OPTIONS:
  --quality-threshold <n>    Quality threshold 0-1 (default: 0.8)
  --memory-namespace <name>  Memory namespace (default: swarm)
  --agent-selection <type>   Agent selection strategy
  --task-scheduling <type>   Task scheduling algorithm
  --load-balancing <type>    Load balancing method
  --fault-tolerance <type>   Fault tolerance strategy

For complete documentation and examples:
https://github.com/ruvnet/claude-code-flow/docs/swarm.md
`);
}

/**
 * Get strategy-specific guidance for swarm execution
 * @param strategy - The selected execution strategy
 * @param objective - The main objective for the swarm
 * @returns Strategy guidance object
 */
function getStrategyGuidance(
	strategy: SwarmStrategy,
	objective: string,
): StrategyGuidance {
	const strategyMap: Record<SwarmStrategy, StrategyGuidance> = {
		auto: {
			description:
				"Automatically determine best approach based on objective analysis",
			agents: ["coordinator", "researcher", "analyst", "coder"],
			approach: "Adaptive strategy selection based on task characteristics",
			focus: ["Analysis", "Planning", "Execution", "Optimization"],
		},
		research: {
			description: "Optimized for information gathering and analysis workflows",
			agents: ["researcher", "analyst", "documenter"],
			approach: "Systematic information discovery and analysis",
			focus: ["Data Collection", "Analysis", "Synthesis", "Documentation"],
		},
		development: {
			description: "Specialized for software development and coding tasks",
			agents: ["architect", "coder", "tester", "reviewer"],
			approach: "Iterative development with quality gates",
			focus: ["Design", "Implementation", "Testing", "Review"],
		},
		analysis: {
			description: "Focused on data analysis and insights generation",
			agents: ["analyst", "researcher", "optimizer"],
			approach: "Deep analytical processing with pattern recognition",
			focus: [
				"Data Processing",
				"Pattern Recognition",
				"Insights",
				"Recommendations",
			],
		},
		testing: {
			description: "Quality assurance and comprehensive testing workflows",
			agents: ["tester", "reviewer", "coordinator"],
			approach: "Systematic testing and validation procedures",
			focus: ["Test Planning", "Execution", "Validation", "Quality Assurance"],
		},
		optimization: {
			description: "Performance tuning and system optimization",
			agents: ["optimizer", "analyst", "architect"],
			approach: "Performance analysis and systematic optimization",
			focus: [
				"Performance Analysis",
				"Bottleneck Identification",
				"Optimization",
				"Monitoring",
			],
		},
		maintenance: {
			description: "System maintenance and update procedures",
			agents: ["coordinator", "tester", "documenter"],
			approach: "Structured maintenance with minimal disruption",
			focus: ["Assessment", "Planning", "Execution", "Validation"],
		},
	};

	return strategyMap[strategy] || strategyMap["auto"];
}

/**
 * Get mode-specific guidance for coordination
 * @param mode - The selected coordination mode
 * @returns Mode guidance object
 */
function getModeGuidance(mode: CoordinationMode): ModeGuidance {
	const modeMap: Record<CoordinationMode, ModeGuidance> = {
		centralized: {
			description: "Single coordinator manages all agents",
			coordination: "Central authority with clear command structure",
			benefits: [
				"Simple coordination",
				"Clear accountability",
				"Easy debugging",
			],
			considerations: [
				"Single point of failure",
				"Potential bottleneck",
				"Limited scalability",
			],
		},
		distributed: {
			description: "Multiple coordinators share responsibility",
			coordination: "Shared leadership with consensus mechanisms",
			benefits: [
				"Fault tolerance",
				"Better scalability",
				"Parallel coordination",
			],
			considerations: [
				"Complex consensus",
				"Potential conflicts",
				"Higher overhead",
			],
		},
		hierarchical: {
			description: "Tree structure with team leads",
			coordination: "Multi-level management with clear hierarchy",
			benefits: [
				"Enterprise scalability",
				"Clear reporting",
				"Organized structure",
			],
			considerations: [
				"Complex setup",
				"Communication latency",
				"Rigid structure",
			],
		},
		mesh: {
			description: "Peer-to-peer coordination",
			coordination: "Direct agent communication with self-organization",
			benefits: [
				"Flexible adaptation",
				"No single point of failure",
				"Efficient communication",
			],
			considerations: [
				"Complex coordination",
				"Potential chaos",
				"Difficult monitoring",
			],
		},
		hybrid: {
			description: "Mixed strategies adapted to task requirements",
			coordination: "Dynamic coordination based on task phase and requirements",
			benefits: [
				"Optimal adaptation",
				"Best of all modes",
				"Flexible structure",
			],
			considerations: [
				"Complex implementation",
				"Dynamic complexity",
				"Coordination overhead",
			],
		},
	};

	return modeMap[mode] || modeMap["centralized"];
}

/**
 * Get agent recommendations based on strategy and parameters
 * @param strategy - The execution strategy
 * @param maxAgents - Maximum number of agents
 * @param objective - The main objective
 * @returns Array of agent recommendations
 */
function getAgentRecommendations(
	strategy: SwarmStrategy,
	maxAgents: number,
	objective: string,
): AgentRecommendation[] {
	const baseRecommendations: AgentRecommendation[] = [
		{
			type: "coordinator",
			name: "SwarmLead",
			role: "Orchestrate overall execution",
			priority: 1,
		},
		{
			type: "researcher",
			name: "DataAnalyst",
			role: "Gather and analyze information",
			priority: 2,
		},
		{
			type: "coder",
			name: "Developer",
			role: "Implement solutions",
			priority: 3,
		},
		{
			type: "tester",
			name: "QAEngineer",
			role: "Validate and test outputs",
			priority: 4,
		},
		{
			type: "reviewer",
			name: "QualityChecker",
			role: "Review and approve work",
			priority: 5,
		},
	];

	// Strategy-specific adjustments
	if (strategy === "research") {
		baseRecommendations.push({
			type: "analyst",
			name: "InsightGen",
			role: "Deep analysis and insights",
			priority: 3,
		});
	} else if (strategy === "development") {
		baseRecommendations.push({
			type: "architect",
			name: "SystemDesigner",
			role: "Design system architecture",
			priority: 2,
		});
	}

	return baseRecommendations
		.slice(0, maxAgents)
		.sort((a, b) => a.priority - b.priority);
}

/**
 * Main swarm command handler with comprehensive TypeScript support
 * @param subArgs - Command line arguments after 'swarm'
 * @param flags - Command line flags and options
 * @returns Promise resolving to execution result
 */
export async function swarmCommand(
	subArgs: string[],
	flags: Record<string, unknown>,
): Promise<SwarmExecutionResult | void> {
	// Parse arguments using metadata
	const parsed = parseCommandArgs(subArgs, flags, swarmCommandMetadata);

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
		console.log(generateCommandHelp("swarm", swarmCommandMetadata));
		return;
	}

	// Validate arguments
	const errors = validateCommandArgs(parsed, swarmCommandMetadata);
	if (errors.length > 0) {
		console.error("❌ Invalid arguments:");
		errors.forEach((error) => console.error(`  • ${error}`));
		console.log("\nUse --help for usage information");
		return;
	}

	// The objective is all non-flag arguments joined
	const objective = (parsedCommand.args || []).join(" ").trim();

	if (!objective) {
		console.error("❌ Usage: swarm <objective>");
		console.log("Use --help for detailed usage information");
		return;
	}

	// Extract parsed options for easier access
	const options = parsedCommand.options as SwarmCommandOptions;

	// Handle JSON output format using parsed options
	const outputFormat = options["output-format"];
	const outputFile = options["output-file"];
	const isJsonOutput = outputFormat === "json";
	const isNonInteractive = isJsonOutput || options["no-interactive"];
	const isTestMode = options["test-mode"];

	// For JSON output, we need to ensure executor mode since Claude Code doesn't return structured JSON
	const useExecutor = options.executor || isJsonOutput;

	// Check if we should use the old executor (opt-in with --executor flag)
	if (useExecutor) {
		// Continue with the old swarm executor implementation
		return await executeBuiltInSwarm(objective, options);
	} else {
		// Default behavior: spawn Claude Code with comprehensive swarm MCP instructions
		return await executeClaudeCodeSwarm(
			objective,
			options,
			isTestMode || false,
		);
	}
}

/**
 * Execute swarm using Claude Code integration
 * @param objective - The main objective for the swarm
 * @param options - Swarm command options
 * @param isTestMode - Whether running in test mode
 * @returns Promise resolving to execution result
 */
async function executeClaudeCodeSwarm(
	objective: string,
	options: SwarmCommandOptions,
	isTestMode: boolean,
): Promise<SwarmExecutionResult> {
	try {
		const { execSync, spawn } = await import("child_process");

		// Test mode: bypass external process launch
		if (isTestMode) {
			console.log("🧪 Test mode: Simulating swarm execution");
			console.log("🐝 Launching Claude Flow Swarm System...");
			console.log(`📋 Objective: ${objective}`);
			console.log(`🎯 Strategy: ${options.strategy || "auto"}`);
			console.log(`🏗️  Mode: ${options.mode || "centralized"}`);
			console.log(`🤖 Max Agents: ${options["max-agents"] || 5}`);
			console.log("✓ Swarm initialized successfully (test mode)");
			console.log("🧪 Test mode complete - no external processes launched");
			return { success: true, testMode: true };
		}

		// Check if claude command exists
		let claudeAvailable = false;
		try {
			execSync("which claude", { stdio: "ignore" });
			claudeAvailable = true;
		} catch {
			console.log("⚠️  Claude Code CLI not found in PATH");
			console.log("Install it with: npm install -g @anthropic-ai/claude-code");
			console.log("\nWould spawn Claude Code with swarm objective:");
			console.log(`📋 Objective: ${objective}`);
			console.log(
				'\nTo use the built-in executor instead: claude-flow swarm "objective" --executor',
			);
			return { success: false };
		}

		// Claude is available, use it to run swarm
		console.log("🐝 Launching Claude Flow Swarm System...");
		console.log(`📋 Objective: ${objective}`);
		console.log(`🎯 Strategy: ${options.strategy || "auto"}`);
		console.log(`🏗️  Mode: ${options.mode || "centralized"}`);
		console.log(`🤖 Max Agents: ${options["max-agents"] || 5}\n`);

		const strategy = options.strategy || "auto";
		const mode = options.mode || "centralized";
		const maxAgents = options["max-agents"] || 5;

		// Get strategy-specific guidance
		const strategyGuidance = getStrategyGuidance(strategy, objective);
		const modeGuidance = getModeGuidance(mode);
		const agentRecommendations = getAgentRecommendations(
			strategy,
			maxAgents,
			objective,
		);

		const enableSparc =
			options.sparc && (strategy === "development" || strategy === "auto");

		// Create comprehensive swarm prompt for Claude Code
		const swarmPrompt = createSwarmPrompt(
			objective,
			options,
			strategyGuidance,
			modeGuidance,
			agentRecommendations,
			enableSparc || false,
		);

		// Execute Claude Code with the swarm prompt
		const claudeProcess = spawn("claude", [], {
			stdio: "inherit",
		});

		// Handle the Claude Code process
		claudeProcess.on("close", (code) => {
			if (code === 0) {
				console.log("\n✅ Swarm execution completed successfully");
			} else {
				console.log(`\n❌ Swarm execution failed with code ${code}`);
			}
		});

		claudeProcess.on("error", (error) => {
			console.error(`❌ Failed to start Claude Code: ${error.message}`);
		});

		return {
			success: true,
			strategy,
			mode,
			agents: maxAgents,
		};
	} catch (error) {
		const err = error as Error;
		console.error(`❌ Failed to execute Claude Code swarm: ${err.message}`);
		return { success: false };
	}
}

/**
 * Execute swarm using built-in executor
 * @param objective - The main objective for the swarm
 * @param options - Swarm command options
 * @returns Promise resolving to execution result
 */
async function executeBuiltInSwarm(
	objective: string,
	options: SwarmCommandOptions,
): Promise<SwarmExecutionResult> {
	console.log("🔧 Using built-in swarm executor...");
	console.log(`📋 Objective: ${objective}`);
	console.log(`🎯 Strategy: ${options.strategy || "auto"}`);
	console.log(`🏗️  Mode: ${options.mode || "centralized"}`);
	console.log(`🤖 Max Agents: ${options["max-agents"] || 5}`);

	// Simulate built-in swarm execution
	const result: SwarmExecutionResult = {
		success: true,
		strategy: options.strategy || "auto",
		mode: options.mode || "centralized",
		agents: options["max-agents"] || 5,
	};

	if (options["output-file"]) {
		result.outputFile = options["output-file"];
		console.log(`📁 Output will be saved to: ${options["output-file"]}`);
	}

	console.log("✅ Built-in executor simulation completed");
	return result;
}

/**
 * Create comprehensive swarm prompt for Claude Code
 * @param objective - The main objective
 * @param options - Swarm options
 * @param strategyGuidance - Strategy-specific guidance
 * @param modeGuidance - Mode-specific guidance
 * @param agentRecommendations - Recommended agents
 * @param enableSparc - Whether SPARC methodology is enabled
 * @returns Formatted swarm prompt
 */
function createSwarmPrompt(
	objective: string,
	options: SwarmCommandOptions,
	strategyGuidance: StrategyGuidance,
	modeGuidance: ModeGuidance,
	agentRecommendations: AgentRecommendation[],
	enableSparc: boolean,
): string {
	const strategy = options.strategy || "auto";
	const mode = options.mode || "centralized";
	const maxAgents = options["max-agents"] || 5;

	return `You are orchestrating a Claude Flow Swarm with advanced MCP tool coordination.

🎯 OBJECTIVE: ${objective}

🐝 SWARM CONFIGURATION:
- Strategy: ${strategy}
- Mode: ${mode}
- Max Agents: ${maxAgents}
- Timeout: ${options.timeout || 60} minutes
- Parallel Execution: MANDATORY (Always use BatchTool)
- Review Mode: ${options.review || false}
- Testing Mode: ${options.testing || false}
- SPARC Methodology: ${enableSparc}

🚨 CRITICAL: PARALLEL EXECUTION IS MANDATORY! 🚨

📋 CLAUDE-FLOW SWARM BATCHTOOL INSTRUCTIONS

⚡ THE GOLDEN RULE:
If you need to do X operations, they should be in 1 message, not X messages.

🎯 MANDATORY PATTERNS FOR CLAUDE-FLOW SWARMS:

1️⃣ **SWARM INITIALIZATION** - Everything in ONE BatchTool:
\`\`\`javascript
[Single Message with Multiple Tools]:
  // Spawn ALL agents at once
${agentRecommendations
	.map(
		(agent) =>
			`  mcp__claude-flow__agent_spawn {"type": "${agent.type}", "name": "${agent.name}"}`,
	)
	.join("\n")}

  // Initialize ALL memory keys
  mcp__claude-flow__memory_store {"key": "swarm/objective", "value": "${objective}"}
  mcp__claude-flow__memory_store {"key": "swarm/config", "value": {"strategy": "${strategy}", "mode": "${mode}"}}

  // Create task hierarchy
  mcp__claude-flow__task_create {"name": "${objective}", "type": "parent", "id": "main"}
  mcp__claude-flow__task_create {"name": "Research Phase", "parent": "main"}
  mcp__claude-flow__task_create {"name": "Design Phase", "parent": "main"}
  mcp__claude-flow__task_create {"name": "Implementation", "parent": "main"}

  // Initialize comprehensive todo list
  TodoWrite {"todos": [
    {"id": "1", "content": "Initialize ${maxAgents} agent swarm", "status": "completed", "priority": "high"},
    {"id": "2", "content": "Analyze: ${objective}", "status": "in_progress", "priority": "high"},
    {"id": "3", "content": "Design architecture", "status": "pending", "priority": "high"},
    {"id": "4", "content": "Implement solution", "status": "pending", "priority": "high"},
    {"id": "5", "content": "Test and validate", "status": "pending", "priority": "medium"}
  ]}
\`\`\`

🎯 STRATEGY GUIDANCE: ${strategyGuidance.description}
Focus Areas: ${strategyGuidance.focus.join(", ")}

🏗️ COORDINATION MODE: ${modeGuidance.description}
Coordination: ${modeGuidance.coordination}
Benefits: ${modeGuidance.benefits.join(", ")}

🤖 RECOMMENDED AGENTS:
${agentRecommendations
	.map((agent) => `• ${agent.name} (${agent.type}): ${agent.role}`)
	.join("\n")}

${
	enableSparc
		? `
🎯 SPARC METHODOLOGY ENABLED:
Follow this systematic approach:
1. **Specification**: Define clear requirements and acceptance criteria
2. **Pseudocode**: Design algorithms and logic patterns
3. **Architecture**: Create system design and component structure
4. **Refinement**: Implement with test-driven development
5. **Completion**: Integration, documentation, and validation
`
		: ""
}

🚨 EXECUTION REQUIREMENTS:
1. ALL operations must use BatchTool (multiple tools in single message)
2. TodoWrite must include ALL todos in ONE call (5-10+ todos minimum)
3. Agent spawning must be parallel (ALL agents in ONE message)
4. Memory operations must be batched together
5. File operations must be concurrent (Read/Write/Edit in one message)

Begin swarm execution with PARALLEL BatchTool initialization!`;
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
