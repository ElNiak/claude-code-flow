#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	type CallToolResult,
	EmbeddedResource,
	ImageContent,
	ListToolsRequestSchema,
	TextContent,
	type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { getErrorMessage as _getErrorMessage } from "../cli/shared/errors/error-handler.js";
import { loadSparcModes, type SparcMode } from "./sparc-modes.js";

// Simple ID generation,
function generateId(): string {
	return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SparcContext {
	memoryKey?: string;
	parallel?: boolean;
	timeout?: number;
	workingDirectory?: string;
}

interface SwarmAgent {
	id: string;
	mode: string;
	task: string;
	status: "pending" | "active" | "completed" | "failed";
	result?: any;
}

interface SwarmExecution {
	id: string;
	objective: string;
	strategy: string;
	mode: string;
	agents: SwarmAgent[];
	startTime: Date;
	endTime?: Date;
	status: "active" | "completed" | "failed";
}

export class ClaudeCodeMCPWrapper {
	private server: Server;
	private sparcModes: Map<string, SparcMode> = new Map();
	private swarmExecutions: Map<string, SwarmExecution> = new Map();
	private claudeCodePath: string; // Path to Claude Code executable
	private memoryStore: Map<string, any> = new Map(); // Simple memory store

	constructor() {
		this.server = new Server(
			{
				name: "claude-flow-wrapper",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		// Initialize Claude Code path with validation
		this.claudeCodePath = this.validateClaudeCodePath();

		this.setupHandlers();
		this.loadSparcModes();
		this.setupErrorHandling();
	}

	/**
	 * Validate and setup Claude Code executable path
	 */
	private validateClaudeCodePath(): string {
		const envPath = process.env.CLAUDE_CODE_PATH;
		const defaultPaths = [
			"claude",
			"claude-code",
			"npx claude-code",
			"./bin/claude-code",
		];

		if (envPath) {
			console.error(`Using Claude Code path from environment: ${envPath}`);
			return envPath;
		}

		// Default to 'claude' but log the choice
		console.error(
			`Using default Claude Code path: claude (set CLAUDE_CODE_PATH to override)`,
		);
		return "claude";
	}

	/**
	 * Setup global error handling for the wrapper
	 */
	private setupErrorHandling(): void {
		process.on("uncaughtException", (error) => {
			console.error("Uncaught Exception in Claude Flow MCP Wrapper:", error);
			// Don't exit, log and continue
		});

		process.on("unhandledRejection", (reason, promise) => {
			console.error("Unhandled Rejection in Claude Flow MCP Wrapper:", reason);
			// Log the promise for debugging
			console.error("Promise:", promise);
		});
	}

	private async loadSparcModes() {
		try {
			const modes = await loadSparcModes();
			modes.forEach((mode) => {
				this.sparcModes.set(mode.name, mode);
			});
		} catch (error) {
			console.error("Failed to load SPARC modes:", error);
		}
	}

	private setupHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: await this.getTools(),
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
			this.handleToolCall(request.params.name, request.params.arguments || {}),
		);
	}

	private async getTools(): Promise<Tool[]> {
		const tools: Tool[] = [];

		// Add SPARC mode tools,
		for (const [name, mode] of this.sparcModes) {
			tools.push({
				name: `sparc_${name}`,
				description: `Execute SPARC ${name} mode: ${mode.description}`,
				inputSchema: {
					type: "object",
					properties: {
						task: {
							type: "string",
							description: "The task description for the SPARC mode to execute",
						},
						context: {
							type: "object",
							description: "Optional context or parameters for the task",
							properties: {
								memoryKey: {
									type: "string",
									description: "Memory key to store results",
								},
								parallel: {
									type: "boolean",
									description: "Enable parallel execution",
								},
							},
						},
					},
					required: ["task"],
				},
			});
		}

		// Add meta tools,
		tools.push(
			{
				name: "sparc_list",
				description: "List all available SPARC modes",
				inputSchema: {
					type: "object",
					properties: {
						verbose: {
							type: "boolean",
							description: "Include detailed information",
						},
					},
				},
			},
			{
				name: "sparc_swarm",
				description: "Coordinate multiple SPARC agents in a swarm",
				inputSchema: {
					type: "object",
					properties: {
						objective: {
							type: "string",
							description: "The swarm objective",
						},
						strategy: {
							type: "string",
							enum: [
								"research",
								"development",
								"analysis",
								"testing",
								"optimization",
								"maintenance",
							],
							description: "Swarm execution strategy",
						},
						mode: {
							type: "string",
							enum: [
								"centralized",
								"distributed",
								"hierarchical",
								"mesh",
								"hybrid",
							],
							description: "Coordination mode",
						},
						maxAgents: {
							type: "number",
							description: "Maximum number of agents",
							default: 5,
						},
					},
					required: ["objective", "strategy"],
				},
			},
			{
				name: "sparc_swarm_status",
				description: "Check status of running swarms and list created files",
				inputSchema: {
					type: "object",
					properties: {
						swarmId: {
							type: "string",
							description: "Optional swarm ID to check specific swarm",
						},
					},
				},
			},
		);

		return tools;
	}

	private async handleToolCall(
		toolName: string,
		args: any,
	): Promise<CallToolResult> {
		// Input validation
		if (!toolName || typeof toolName !== "string") {
			return {
				content: [
					{
						type: "text",
						text: "Error: Invalid tool name provided",
					},
				],
				isError: true,
			};
		}

		if (!args) {
			args = {}; // Ensure args is defined
		}

		try {
			console.error(`Handling tool call: ${toolName}`);

			if (toolName.startsWith("sparc_")) {
				return await this.handleSparcTool(toolName, args);
			}

			// Pass through to Claude Code MCP
			return this.forwardToClaudeCode(toolName, args);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`Tool call failed for ${toolName}:`, errorMessage);

			return {
				content: [
					{
						type: "text",
						text: `Error executing ${toolName}: ${errorMessage}`,
					},
				],
				isError: true,
			};
		}
	}

	private async handleSparcTool(
		toolName: string,
		args: any,
	): Promise<CallToolResult> {
		const mode = toolName.replace("sparc_", "");

		// Handle special tools,
		if (mode === "list") {
			return this.listModes(args.verbose);
		}
		if (mode === "swarm") {
			return this.handleSwarm(args);
		}
		if (mode === "swarm_status") {
			return this.getSwarmStatus(args.swarmId);
		}

		// Standard SPARC mode execution,
		const sparcMode = this.sparcModes.get(mode);
		if (!sparcMode) {
			throw new Error(`Unknown SPARC mode: ${mode}`);
		}

		// Execute the SPARC mode with Claude Code integration
		try {
			// Generate enhanced prompt with SPARC methodology
			const enhancedPrompt = this.buildEnhancedPrompt(
				sparcMode,
				args.task,
				args.context,
			);

			// Execute via Claude Code with enhanced prompt
			const result = await this.executeWithClaudeCode(
				enhancedPrompt,
				args.context,
			);

			// Store result in memory if context provided
			if (args.context?.memoryKey) {
				this.memoryStore.set(args.context.memoryKey, {
					mode: mode,
					task: args.task,
					result: result,
					timestamp: new Date().toISOString(),
				});
			}

			// Return formatted result
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								mode: mode,
								task: args.task,
								status: "completed",
								result: result,
								memoryKey: args.context?.memoryKey,
							},
							null,
							2,
						),
					},
				],
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Error executing SPARC ${mode}: ${error instanceof Error ? error.message : String(error)}`,
					},
				],
				isError: true,
			};
		}
	}

	/**
	 * Execute enhanced prompt with Claude Code
	 */
	private async executeWithClaudeCode(
		prompt: string,
		context?: SparcContext,
	): Promise<any> {
		// Input validation
		if (!prompt || typeof prompt !== "string") {
			throw new Error("Invalid prompt: must be a non-empty string");
		}

		if (prompt.length > 50000) {
			console.warn("Warning: Large prompt detected, may impact performance");
		}

		const timeout = context?.timeout || 60000; // Default 60 seconds
		const workingDir = context?.workingDirectory || process.cwd();

		return new Promise((resolve, reject) => {
			const args = ["--prompt", JSON.stringify(prompt)];

			// Add context parameters if provided
			if (context?.workingDirectory) {
				args.push("--cwd", context.workingDirectory);
			}

			if (context?.timeout) {
				args.push("--timeout", context.timeout.toString());
			}

			console.error(`Executing Claude Code with ${args.length} arguments`);

			const claudeProcess = spawn(this.claudeCodePath, args, {
				stdio: ["pipe", "pipe", "pipe"],
				cwd: workingDir,
				env: { ...process.env, CLAUDE_FLOW_WRAPPER: "true" },
			});

			let stdout = "";
			let stderr = "";
			let isTimedOut = false;

			// Set up timeout
			const timeoutHandle = setTimeout(() => {
				isTimedOut = true;
				claudeProcess.kill("SIGTERM");
				reject(new Error(`Claude Code execution timed out after ${timeout}ms`));
			}, timeout);

			claudeProcess.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			claudeProcess.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			claudeProcess.on("close", (code) => {
				clearTimeout(timeoutHandle);

				if (isTimedOut) {
					return; // Already handled by timeout
				}

				if (code === 0) {
					try {
						// Try to parse JSON response
						const result = JSON.parse(stdout);
						resolve(result);
					} catch (parseError) {
						// Return raw output if not JSON
						console.warn(
							"Claude Code output is not valid JSON, returning raw output",
						);
						resolve({
							output: stdout,
							raw: true,
							stderr: stderr || undefined,
						});
					}
				} else {
					const errorMessage = stderr || stdout || "Unknown error";
					reject(
						new Error(
							`Claude Code execution failed (exit code ${code}): ${errorMessage}`,
						),
					);
				}
			});

			claudeProcess.on("error", (error) => {
				clearTimeout(timeoutHandle);
				if (!isTimedOut) {
					reject(new Error(`Failed to start Claude Code: ${error.message}`));
				}
			});

			// Handle process termination signals
			const cleanup = () => {
				if (!isTimedOut && !claudeProcess.killed) {
					claudeProcess.kill("SIGTERM");
				}
			};

			process.on("SIGINT", cleanup);
			process.on("SIGTERM", cleanup);
		});
	}

	private buildEnhancedPrompt(
		mode: SparcMode,
		task: string,
		context?: SparcContext,
	): string {
		const parts: string[] = [];

		// Add SPARC mode header,
		parts.push(`SPARC: ${mode.name}\n`);
		parts.push(`## Mode Description\n${mode.description}\n`);

		// Add available tools,
		if (mode.tools && mode.tools.length > 0) {
			parts.push(`## Available Tools`);
			mode.tools.forEach((tool) => {
				parts.push(`- **${tool}**: ${this.getToolDescription(tool)}`);
			});
			parts.push("");
		}

		// Add usage pattern,
		if (mode.usagePattern) {
			parts.push(
				`## Usage Pattern\n\`\`\`javascript\n${mode.usagePattern}\n\`\`\`\n`,
			);
		}

		// Add best practices,
		if (mode.bestPractices) {
			parts.push(`## Best Practices`);
			mode.bestPractices.forEach((practice) => {
				parts.push(`- ${practice}`);
			});
			parts.push("");
		}

		// Add integration capabilities,
		if (mode.integrationCapabilities) {
			parts.push(`## Integration Capabilities\nThis mode integrates with:`);
			mode.integrationCapabilities.forEach((capability) => {
				parts.push(`- ${capability}`);
			});
			parts.push("");
		}

		// Add instructions,
		if (mode.instructions) {
			parts.push(`## Instructions\n${mode.instructions}\n`);
		}

		// Add the actual task,
		parts.push(`## TASK: ${task}\n`);

		// Add SPARC methodology,
		parts.push(this.getSparcMethodology(mode.name, task, context));

		// Add context if provided,
		if (context) {
			if (context.memoryKey) {
				parts.push(`**Memory Key:** \`${context.memoryKey}\``);
			}
			if (context.parallel) {
				parts.push(`**Parallel Execution:** Enabled`);
			}
			if (context.workingDirectory) {
				parts.push(`**Working Directory:** ${context.workingDirectory}`);
			}
		}

		return parts.join("\n");
	}

	private getToolDescription(tool: string): string {
		const descriptions: Record<string, string> = {
			TodoWrite: "Create and manage task coordination",
			TodoRead: "Monitor task progress and status",
			Task: "Spawn and manage specialized agents",
			Memory: "Store and retrieve coordination data",
			Bash: "Execute system commands",
			Read: "Read file contents",
			Write: "Write files",
			Edit: "Edit existing files",
			MultiEdit: "Make multiple edits to a file",
			Glob: "Search for files by pattern",
			Grep: "Search file contents",
			WebSearch: "Search the web",
			WebFetch: "Fetch web content",
		};
		return descriptions[tool] || `${tool} tool`;
	}

	private getSparcMethodology(
		mode: string,
		task: string,
		context?: SparcContext,
	): string {
		return `
# 🎯 SPARC METHODOLOGY EXECUTION FRAMEWORK,

You are operating in **SPARC ${mode} mode**. Follow the SPARC Workflow precisely:

## SPARC Workflow Steps

### 1️⃣ SPECIFICATION - Clarify goals, scope, constraints
**Your Task:** ${task}

**Analysis Required:**
- Break down into clear, measurable objectives
- Identify all requirements and constraints
- Define acceptance criteria
- Never hard-code environment variables

**Use TodoWrite to capture specifications:**
\`\`\`javascript,
TodoWrite([
  {
    id: "specification",
    content: "Clarify goals, scope, and constraints for: ${task}",
    status: "pending",
    priority: "high"
  },
  {
    id: "acceptance_criteria",
    content: "Define clear acceptance criteria and success metrics",
    status: "pending",
    priority: "high"
  }
]);
\`\`\`

### 2️⃣ PSEUDOCODE - High-level logic with TDD anchors
**Design Approach:**
- Identify core functions and data structures
- Create TDD test anchors before implementation
- Map out component interactions

### 3️⃣ ARCHITECTURE - Design extensible systems
**Architecture Requirements:**
- Clear service boundaries
- Define interfaces between components
- Design for extensibility and maintainability
- Mode-specific architecture: ${this.getModeSpecificArchitecture(mode)}

### 4️⃣ REFINEMENT - Iterate with TDD and security
**Refinement Process:**
- TDD implementation cycles
- Security vulnerability checks (injection, XSS, CSRF)
- Performance optimization
- Code review and refactoring
- All files must be ≤ 500 lines

### 5️⃣ COMPLETION - Integrate and verify
**Completion Checklist:**
- [ ] All acceptance criteria met
- [ ] Tests passing (comprehensive test suite)
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Results stored in Memory: \`sparc_${mode}_${Date.now()}\`
- [ ] No hard-coded secrets or env vars
- [ ] Proper error handling in all code paths

## 🚀 Execution Configuration

**Mode:** ${mode}
**Strategy:** ${this.getModeStrategy(mode)}
**Memory Key:** \`sparc_${mode}_${Date.now()}\`
**Batch Operations:** ${context?.parallel ? "Enabled" : "Standard operations"}
**Primary Tools:** ${this.sparcModes.get(mode)?.tools?.join(", ") || "Standard tools"}

## 📋 Must Block (Non-negotiable)
- Every file ≤ 500 lines
- No hard-coded secrets or env vars
- All user inputs validated
- No security vulnerabilities
- Proper error handling in all paths
- Each subtask ends with completion check

## 🎯 IMMEDIATE ACTION REQUIRED

**START NOW with SPARC Step 1 - SPECIFICATION:**

1. Create comprehensive TodoWrite task breakdown following SPARC workflow,
2. Set "specification" task to "in_progress"
3. Analyze requirements and define acceptance criteria,
4. Store initial analysis in Memory: \`sparc_${mode}_${Date.now()}\`

**Remember:** You're in **${mode}** mode. Follow the SPARC workflow systematically:
Specification → Pseudocode → Architecture → Refinement → Completion,

Use the appropriate tools for each phase and maintain progress in TodoWrite.`;
	}

	private getModeSpecificArchitecture(mode: string): string {
		const architectures: Record<string, string> = {
			orchestrator:
				"Design for parallel agent coordination with clear task boundaries",
			coder: "Focus on clean code architecture with proper abstractions",
			researcher: "Structure for data collection and analysis pipelines",
			tdd: "Test-first design with comprehensive test coverage",
			architect: "System-wide design patterns and component interactions",
			reviewer: "Code quality gates and review checkpoints",
			debugger: "Diagnostic and monitoring integration points",
			tester: "Test framework integration and coverage analysis",
		};
		return architectures[mode] || "Design for the specific mode requirements";
	}

	private getModeStrategy(mode: string): string {
		const strategies: Record<string, string> = {
			orchestrator: "Parallel coordination",
			coder: "Iterative development",
			researcher: "Deep analysis",
			tdd: "Test-driven cycles",
			architect: "System design",
			reviewer: "Quality assurance",
			debugger: "Systematic debugging",
			tester: "Comprehensive validation",
		};
		return strategies[mode] || "Mode-specific execution";
	}

	private listModes(verbose: boolean): CallToolResult {
		const modes = Array.from(this.sparcModes.values());

		if (verbose) {
			const content = modes.map((mode) => ({
				name: mode.name,
				description: mode.description,
				tools: mode.tools,
				bestPractices: mode.bestPractices,
			}));

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(content, null, 2),
					},
				],
			};
		}

		const list = modes
			.map((m) => `- **${m.name}**: ${m.description}`)
			.join("\n");
		return {
			content: [
				{
					type: "text",
					text: `Available SPARC modes:\n\n${list}`,
				},
			],
		};
	}

	private async handleSwarm(args: any): Promise<CallToolResult> {
		const { objective, strategy, mode = "distributed", maxAgents = 5 } = args;
		const swarmId = generateId();

		// Plan swarm agents,
		const agents = this.planSwarmAgents(objective, strategy, maxAgents);

		// Create swarm execution record,
		const execution: SwarmExecution = {
			id: swarmId,
			objective,
			strategy,
			mode,
			agents,
			startTime: new Date(),
			status: "active",
		};

		this.swarmExecutions.set(swarmId, execution);

		// Launch agents based on coordination mode,
		if (mode === "distributed" || mode === "mesh") {
			// Parallel execution,
			await Promise.all(
				agents.map((agent) => this.launchSwarmAgent(agent, execution)),
			);
		} else {
			// Sequential execution,
			for (const agent of agents) {
				await this.launchSwarmAgent(agent, execution);
			}
		}

		execution.status = "completed";
		execution.endTime = new Date();

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							swarmId,
							objective,
							strategy,
							mode,
							agentCount: agents.length,
							status: "launched",
							message: "Swarm coordination initiated",
						},
						null,
						2,
					),
				},
			],
		};
	}

	private planSwarmAgents(
		objective: string,
		strategy: string,
		maxAgents: number,
	): SwarmAgent[] {
		const agents: SwarmAgent[] = [];

		// Strategy-based agent planning,
		switch (strategy) {
			case "research":
				agents.push(
					{
						id: generateId(),
						mode: "researcher",
						task: `Research: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "analyst",
						task: `Analyze findings for: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "documenter",
						task: `Document research results: ${objective}`,
						status: "pending",
					},
				);
				break;

			case "development":
				agents.push(
					{
						id: generateId(),
						mode: "architect",
						task: `Design architecture: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "coder",
						task: `Implement: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "tester",
						task: `Test implementation: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "reviewer",
						task: `Review code: ${objective}`,
						status: "pending",
					},
				);
				break;

			case "analysis":
				agents.push(
					{
						id: generateId(),
						mode: "analyst",
						task: `Analyze: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "optimizer",
						task: `Optimize based on analysis: ${objective}`,
						status: "pending",
					},
				);
				break;

			case "testing":
				agents.push(
					{
						id: generateId(),
						mode: "tester",
						task: `Create test suite: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "debugger",
						task: `Debug issues: ${objective}`,
						status: "pending",
					},
				);
				break;

			case "optimization":
				agents.push(
					{
						id: generateId(),
						mode: "analyst",
						task: `Performance analysis: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "optimizer",
						task: `Optimize: ${objective}`,
						status: "pending",
					},
				);
				break;

			case "maintenance":
				agents.push(
					{
						id: generateId(),
						mode: "reviewer",
						task: `Code review: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "debugger",
						task: `Fix issues: ${objective}`,
						status: "pending",
					},
					{
						id: generateId(),
						mode: "documenter",
						task: `Update documentation: ${objective}`,
						status: "pending",
					},
				);
				break;
		}

		// Limit to maxAgents,
		return agents.slice(0, maxAgents);
	}

	private async launchSwarmAgent(
		agent: SwarmAgent,
		execution: SwarmExecution,
	): Promise<void> {
		agent.status = "active";
		const startTime = Date.now();

		try {
			console.error(
				`Launching swarm agent ${agent.id} with mode ${agent.mode}`,
			);

			// Enhanced task prompt with swarm coordination context
			const enhancedTask = this.buildSwarmAgentPrompt(agent, execution);

			// Execute via SPARC mode with enhanced coordination
			const result = await this.executeWithClaudeCode(enhancedTask, {
				memoryKey: `swarm_${execution.id}_${agent.id}`,
				parallel: execution.mode === "distributed" || execution.mode === "mesh",
				timeout: 120000, // 2 minutes for swarm agents
				workingDirectory: process.cwd(),
			});

			// Store detailed result in memory
			this.memoryStore.set(`swarm_${execution.id}_${agent.id}_result`, {
				agentId: agent.id,
				mode: agent.mode,
				task: agent.task,
				result: result,
				executionTime: Date.now() - startTime,
				swarmId: execution.id,
				timestamp: new Date().toISOString(),
			});

			agent.status = "completed";
			agent.result = result;

			console.error(
				`Swarm agent ${agent.id} completed successfully in ${Date.now() - startTime}ms`,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`Swarm agent ${agent.id} failed:`, errorMessage);

			// Store error details
			this.memoryStore.set(`swarm_${execution.id}_${agent.id}_error`, {
				agentId: agent.id,
				mode: agent.mode,
				task: agent.task,
				error: errorMessage,
				executionTime: Date.now() - startTime,
				swarmId: execution.id,
				timestamp: new Date().toISOString(),
			});

			agent.status = "failed";
			agent.result = {
				error: errorMessage,
				executionTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Build enhanced prompt for swarm agent execution
	 */
	private buildSwarmAgentPrompt(
		agent: SwarmAgent,
		execution: SwarmExecution,
	): string {
		const sparcMode = this.sparcModes.get(agent.mode);
		const parts: string[] = [];

		// Add swarm coordination header
		parts.push(`# 🐝 SWARM AGENT EXECUTION - ${agent.mode.toUpperCase()}`);
		parts.push("");
		parts.push(`**Swarm ID:** ${execution.id}`);
		parts.push(`**Agent ID:** ${agent.id}`);
		parts.push(`**Coordination Mode:** ${execution.mode}`);
		parts.push(`**Strategy:** ${execution.strategy}`);
		parts.push(`**Objective:** ${execution.objective}`);
		parts.push("");

		// Add SPARC mode context if available
		if (sparcMode) {
			parts.push(`## SPARC Mode: ${sparcMode.name}`);
			parts.push(`**Description:** ${sparcMode.description}`);
			if (sparcMode.tools && sparcMode.tools.length > 0) {
				parts.push(`**Available Tools:** ${sparcMode.tools.join(", ")}`);
			}
			parts.push("");
		}

		// Add agent-specific task
		parts.push(`## Agent Task`);
		parts.push(agent.task);
		parts.push("");

		// Add swarm coordination instructions
		parts.push(`## Swarm Coordination Instructions`);
		parts.push(
			`- You are part of a ${execution.mode} swarm working on: ${execution.objective}`,
		);
		parts.push(`- Your specific role is: ${agent.mode}`);
		parts.push(`- Coordinate with other agents through shared memory`);
		parts.push(
			`- Store results in memory key: swarm_${execution.id}_${agent.id}`,
		);

		if (execution.mode === "distributed" || execution.mode === "mesh") {
			parts.push(`- Execute in parallel with other agents`);
			parts.push(`- Share findings and coordinate to avoid duplication`);
		} else {
			parts.push(`- Execute in sequence, building on previous agent results`);
			parts.push(`- Check memory for previous agent outputs before starting`);
		}

		// Add SPARC methodology if mode exists
		if (sparcMode) {
			parts.push("");
			parts.push(
				this.getSparcMethodology(sparcMode.name, agent.task, {
					memoryKey: `swarm_${execution.id}_${agent.id}`,
					parallel: execution.mode === "distributed",
				}),
			);
		}

		return parts.join("\n");
	}

	private getSwarmStatus(swarmId?: string): CallToolResult {
		if (swarmId) {
			const execution = this.swarmExecutions.get(swarmId);
			if (!execution) {
				return {
					content: [
						{
							type: "text",
							text: `No swarm found with ID: ${swarmId}`,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(execution, null, 2),
					},
				],
			};
		}

		// Return all swarms,
		const swarms = Array.from(this.swarmExecutions.values()).map((e) => ({
			id: e.id,
			objective: e.objective,
			status: e.status,
			agentCount: e.agents.length,
			startTime: e.startTime,
			endTime: e.endTime,
		}));

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(swarms, null, 2),
				},
			],
		};
	}

	private async forwardToClaudeCode(
		toolName: string,
		args: any,
	): Promise<CallToolResult> {
		// Forward non-SPARC tools to Claude Code's native MCP server
		// This enables full Claude Code tool compatibility through the wrapper

		try {
			// Create a tool execution prompt for Claude Code
			const toolPrompt = this.buildToolExecutionPrompt(toolName, args);

			// Execute the tool via Claude Code
			const result = await this.executeWithClaudeCode(toolPrompt, {
				memoryKey: `tool_execution_${toolName}_${Date.now()}`,
				workingDirectory: args.workingDirectory || process.cwd(),
				timeout: args.timeout || 30000,
			});

			// Store tool execution result in memory
			this.memoryStore.set(`tool_${toolName}_${Date.now()}`, {
				tool: toolName,
				args: args,
				result: result,
				timestamp: new Date().toISOString(),
				success: true,
			});

			// Return formatted result
			return {
				content: [
					{
						type: "text",
						text:
							typeof result === "string"
								? result
								: JSON.stringify(result, null, 2),
					},
				],
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// Store error in memory for debugging
			this.memoryStore.set(`tool_error_${toolName}_${Date.now()}`, {
				tool: toolName,
				args: args,
				error: errorMessage,
				timestamp: new Date().toISOString(),
				success: false,
			});

			return {
				content: [
					{
						type: "text",
						text: `Tool execution failed for ${toolName}: ${errorMessage}`,
					},
				],
				isError: true,
			};
		}
	}

	/**
	 * Build tool execution prompt for Claude Code
	 */
	private buildToolExecutionPrompt(toolName: string, args: any): string {
		const parts: string[] = [];

		// Add tool execution header
		parts.push(`# Tool Execution Request: ${toolName}`);
		parts.push("");

		// Add tool description
		const toolDescriptions: Record<string, string> = {
			TodoWrite: "Create and manage task coordination and todo lists",
			TodoRead: "Read and monitor task progress and status",
			Task: "Spawn and manage specialized agents for complex workflows",
			Memory: "Store and retrieve coordination data and context",
			Bash: "Execute system commands and shell operations",
			Read: "Read file contents from the filesystem",
			Write: "Write new files or overwrite existing files",
			Edit: "Edit existing files with find-and-replace operations",
			MultiEdit: "Make multiple edits to a single file in one operation",
			Glob: "Search for files using glob patterns",
			Grep: "Search file contents using regular expressions",
			WebSearch: "Search the web for information",
			WebFetch: "Fetch and analyze web content",
			NotebookRead: "Read Jupyter notebook files",
			NotebookEdit: "Edit Jupyter notebook cells",
		};

		parts.push(`## Tool: ${toolName}`);
		parts.push(
			`**Description:** ${toolDescriptions[toolName] || `Execute ${toolName} tool operation`}`,
		);
		parts.push("");

		// Add arguments section
		if (args && Object.keys(args).length > 0) {
			parts.push("## Arguments:");
			for (const [key, value] of Object.entries(args)) {
				const formattedValue =
					typeof value === "string" ? value : JSON.stringify(value, null, 2);
				parts.push(`**${key}:** ${formattedValue}`);
			}
			parts.push("");
		}

		// Add execution instructions
		parts.push("## Execution Instructions:");
		parts.push(
			`Please execute the ${toolName} tool with the provided arguments.`,
		);
		parts.push("Return the result in a structured format.");

		if (toolName === "Task") {
			parts.push("");
			parts.push("**Special Instructions for Task tool:**");
			parts.push("- Spawn the specified agent with the given prompt");
			parts.push("- Use the subagent_type parameter for agent classification");
			parts.push("- Ensure proper coordination and communication setup");
		}

		if (toolName === "TodoWrite") {
			parts.push("");
			parts.push("**Special Instructions for TodoWrite:**");
			parts.push(
				"- Create comprehensive task lists with proper status tracking",
			);
			parts.push("- Use appropriate priority levels (high, medium, low)");
			parts.push("- Include clear, actionable task descriptions");
		}

		if (["Read", "Write", "Edit", "MultiEdit"].includes(toolName)) {
			parts.push("");
			parts.push("**File Operation Guidelines:**");
			parts.push("- Use absolute file paths when possible");
			parts.push("- Preserve existing code style and formatting");
			parts.push("- Follow best practices for the target language");
		}

		if (["Bash"].includes(toolName)) {
			parts.push("");
			parts.push("**Command Execution Guidelines:**");
			parts.push("- Execute commands safely and securely");
			parts.push("- Provide clear output and error handling");
			parts.push("- Use appropriate working directory context");
		}

		parts.push("");
		parts.push("## Expected Output:");
		parts.push("Please provide the tool execution result in JSON format with:");
		parts.push("- `success`: boolean indicating if operation succeeded");
		parts.push("- `result`: the actual tool output or result data");
		parts.push("- `error`: error message if operation failed");
		parts.push("- `metadata`: any additional context or information");

		return parts.join("\n");
	}

	async run() {
		const transport = new StdioServerTransport();

		// Log startup message,
		console.error("🚀 Claude-Flow MCP Server (Wrapper Mode)");
		console.error(
			"📦 Using Claude Code MCP pass-through with SPARC prompt injection",
		);
		console.error("🔧 All SPARC tools available with enhanced AI capabilities");
		console.error("ℹ️  To use legacy mode, set CLAUDE_FLOW_LEGACY_MCP=true");
		console.error("");

		await this.server.connect(transport);
	}
}

// Run the server if this is the main module,
if (import.meta.url === `file://${process.argv[1]}`) {
	const wrapper = new ClaudeCodeMCPWrapper();
	wrapper.run().catch(console.error);
}
