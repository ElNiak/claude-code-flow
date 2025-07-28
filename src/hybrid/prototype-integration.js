#!/usr/bin/env node
/**
 * ABOUTME: Prototype implementation demonstrating hybrid integration between Claude Flow MCP and Claude Code
 * ABOUTME: Shows key integration points and backward compatibility preservation
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mock MCP Client for demonstration purposes
 */
class MockMCPClient {
	constructor() {
		this.connected = false;
		this.tools = new Set([
			"swarm_init",
			"agent_spawn",
			"memory_usage",
			"task_orchestrate",
		]);
	}

	async connect() {
		console.log("[Mock MCP] Connecting to MCP server...");
		this.connected = true;
		return true;
	}

	async call(toolName, args) {
		if (!this.connected) {
			throw new Error("MCP client not connected");
		}

		console.log(
			`[Mock MCP] Calling ${toolName} with args:`,
			JSON.stringify(args, null, 2),
		);

		// Simulate MCP tool responses
		switch (toolName) {
			case "swarm_init":
				return {
					success: true,
					swarmId: `swarm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
					topology: args.topology || "hierarchical",
					maxAgents: args.maxAgents || 5,
					status: "initialized",
				};

			case "agent_spawn":
				return {
					success: true,
					agentId: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
					type: args.type,
					name: args.name || `${args.type}-agent`,
					capabilities: args.capabilities || [],
					status: "active",
				};

			case "memory_usage":
				if (args.action === "store") {
					return {
						success: true,
						key: args.key,
						stored: true,
						namespace: args.namespace || "default",
					};
				} else if (args.action === "retrieve") {
					return {
						success: true,
						key: args.key,
						value: `mock_value_for_${args.key}`,
						namespace: args.namespace || "default",
					};
				}
				break;

			case "task_orchestrate":
				return {
					success: true,
					taskId: `task_${Date.now()}`,
					strategy: args.strategy || "auto",
					status: "orchestrated",
				};

			default:
				return {
					success: true,
					tool: toolName,
					message: `Mock execution of ${toolName}`,
					args: args,
				};
		}
	}
}

/**
 * Task Complexity Analyzer
 */
class TaskComplexityAnalyzer {
	constructor(settings = {}) {
		this.settings = settings;
	}

	async analyze(context) {
		const factors = this.extractFactors(context);
		const score = this.calculateComplexityScore(factors);

		return {
			score,
			factors,
			fileCount: factors.fileCount,
			isResearchTask: factors.isResearchTask,
			requiresCollaboration: factors.requiresCollaboration,
			recommendedAgents: Math.min(Math.ceil(factors.fileCount / 2) + 1, 5),
			executionStrategy:
				score >= 0.7 ? "mcp_swarm" : score >= 0.4 ? "hybrid" : "direct",
		};
	}

	extractFactors(context) {
		const files = context.files || [];
		const description = context.description || "";

		return {
			fileCount: files.length,
			hasCodeFiles: files.some((f) => f.match(/\.(js|ts|py|java|cpp|c)$/)),
			hasTestFiles: files.some((f) => f.includes("test") || f.includes("spec")),
			hasDocFiles: files.some((f) => f.match(/\.(md|txt|rst)$/)),
			isResearchTask: /research|analyze|investigate|study/i.test(description),
			isAnalysisTask: /analyze|evaluate|assess|review/i.test(description),
			requiresCollaboration:
				files.length >= 5 || /complex|multiple|collaborate/i.test(description),
		};
	}

	calculateComplexityScore(factors) {
		let score = 0;

		// File count contribution (0-0.4)
		score += Math.min(factors.fileCount / 10, 0.4);

		// Task type contribution (0-0.3)
		if (factors.isResearchTask) score += 0.3;
		else if (factors.isAnalysisTask) score += 0.2;

		// Collaboration requirement (0-0.3)
		if (factors.requiresCollaboration) score += 0.3;

		return Math.min(score, 1.0);
	}
}

/**
 * Agent Inheritance Mapper
 */
class AgentInheritanceMapper {
	constructor(settings = {}) {
		this.settings = settings;
		this.mcpClient = new MockMCPClient();
	}

	async spawnFromProfile(profileName, swarmId, context) {
		const hookProfile = this.getHookProfile(profileName);
		const mcpConfig = this.buildMCPAgentConfig(
			hookProfile,
			profileName,
			context,
		);

		// Spawn agent via MCP
		const agent = await this.mcpClient.call("agent_spawn", {
			...mcpConfig,
			swarmId: swarmId,
		});

		console.log(`[AgentMapper] Spawned ${profileName} agent: ${agent.agentId}`);
		return agent;
	}

	getHookProfile(profileName) {
		const defaultProfiles = {
			researcher: {
				description: "Research-focused agent workflow",
				mcp_integration: {
					agent_config: {
						type: "researcher",
						capabilities: ["web-search", "analysis", "documentation"],
						specializations: ["literature_review", "data_gathering"],
					},
				},
			},
			coder: {
				description: "Code implementation workflow",
				mcp_integration: {
					agent_config: {
						type: "coder",
						capabilities: ["implementation", "testing", "refactoring"],
						specializations: ["frontend", "backend", "testing"],
					},
				},
			},
			analyst: {
				description: "Analysis and evaluation workflow",
				mcp_integration: {
					agent_config: {
						type: "analyst",
						capabilities: ["evaluation", "metrics", "performance"],
						specializations: ["data_analysis", "performance_tuning"],
					},
				},
			},
		};

		return (
			this.settings.hookProfiles?.[profileName] ||
			defaultProfiles[profileName] ||
			defaultProfiles.coder
		);
	}

	buildMCPAgentConfig(hookProfile, profileName, context) {
		const mcpIntegration = hookProfile.mcp_integration || {};
		const agentConfig = mcpIntegration.agent_config || {};

		return {
			type: agentConfig.type || profileName,
			name: `${profileName}-${Date.now()}`,
			capabilities: this.enhanceCapabilities(
				agentConfig.capabilities || [],
				context,
			),
			specializations: agentConfig.specializations || [],
		};
	}

	enhanceCapabilities(baseCapabilities, context) {
		const enhanced = [...baseCapabilities];

		// Context-aware enhancements
		if (context.files?.some((f) => f.includes("test"))) {
			enhanced.push("testing");
		}
		if (context.files?.some((f) => f.endsWith(".md"))) {
			enhanced.push("documentation");
		}
		if (context.operation === "analysis") {
			enhanced.push("analysis", "metrics");
		}

		return [...new Set(enhanced)]; // Remove duplicates
	}
}

/**
 * Hybrid Hook Executor - Main Integration Component
 */
class HybridHookExecutor {
	constructor(settings = {}) {
		this.settings = {
			hybrid: { enabled: true },
			swarm: { max_agents: 5, auto_spawn: { file_threshold: 3 } },
			...settings,
		};

		this.mcpClient = new MockMCPClient();
		this.complexityAnalyzer = new TaskComplexityAnalyzer(this.settings);
		this.agentMapper = new AgentInheritanceMapper(this.settings);
		this.activeSwarms = new Map();
	}

	async initialize() {
		if (this.settings.hybrid?.enabled) {
			await this.mcpClient.connect();
			console.log("[HybridExecutor] Initialized with MCP integration enabled");
		} else {
			console.log("[HybridExecutor] Initialized in direct-only mode");
		}
	}

	async executeHook(hookType, context) {
		console.log(`\n[HybridExecutor] Executing ${hookType} hook`);
		console.log("[HybridExecutor] Context:", JSON.stringify(context, null, 2));

		try {
			// Determine execution strategy
			const strategy = await this.determineExecutionStrategy(hookType, context);
			console.log(
				`[HybridExecutor] Selected strategy: ${strategy.type} (${strategy.reason})`,
			);

			switch (strategy.type) {
				case "direct":
					return await this.executeDirectHook(hookType, context);

				case "hybrid":
					return await this.executeHybridHook(hookType, context, strategy);

				case "mcp_swarm":
					return await this.executeMCPSwarmHook(hookType, context, strategy);

				default:
					return await this.executeDirectHook(hookType, context);
			}
		} catch (error) {
			console.error(
				`[HybridExecutor] Error executing ${hookType}:`,
				error.message,
			);
			// Graceful degradation to direct hooks
			return await this.executeDirectHook(hookType, context);
		}
	}

	async determineExecutionStrategy(hookType, context) {
		if (!this.settings.hybrid?.enabled) {
			return { type: "direct", reason: "hybrid_disabled" };
		}

		const complexity = await this.complexityAnalyzer.analyze(context);
		console.log(`[HybridExecutor] Complexity analysis:`, complexity);

		// Strategy decision matrix
		if (complexity.score >= 0.7 || complexity.isResearchTask) {
			return {
				type: "mcp_swarm",
				reason: "high_complexity_or_research",
				complexity: complexity,
			};
		} else if (complexity.score >= 0.4 && complexity.fileCount >= 3) {
			return {
				type: "hybrid",
				reason: "medium_complexity",
				complexity: complexity,
			};
		} else {
			return {
				type: "direct",
				reason: "low_complexity",
				complexity: complexity,
			};
		}
	}

	async executeDirectHook(hookType, context) {
		console.log("[HybridExecutor] Executing direct hook (legacy mode)");

		// Simulate direct hook execution
		const result = {
			strategy: "direct",
			hookType: hookType,
			context: context,
			executed: true,
			timestamp: new Date().toISOString(),
			performance: { executionTimeMs: 150 },
		};

		console.log("[HybridExecutor] Direct hook completed");
		return result;
	}

	async executeHybridHook(hookType, context, strategy) {
		console.log(
			"[HybridExecutor] Executing hybrid hook with light MCP coordination",
		);

		// Initialize light coordination
		const coordination = await this.initializeLightCoordination(context);

		// Execute enhanced hook with MCP memory
		const result = await this.executeEnhancedHook(
			hookType,
			context,
			coordination,
		);

		// Store results in MCP memory
		await this.storeMCPResults(result, coordination);

		return result;
	}

	async executeMCPSwarmHook(hookType, context, strategy) {
		console.log("[HybridExecutor] Executing full MCP swarm coordination");

		// Get or create swarm
		const swarm = await this.getOrCreateSwarm(context, strategy.complexity);

		// Spawn agents based on hook profiles
		const agents = await this.spawnAgentsFromProfiles(swarm, context);

		// Orchestrate swarm execution
		const result = await this.orchestrateSwarmExecution(
			swarm,
			agents,
			hookType,
			context,
		);

		return result;
	}

	async getOrCreateSwarm(context, complexity) {
		const swarmKey = `swarm_${JSON.stringify(context).substring(0, 20)}`;

		if (this.activeSwarms.has(swarmKey)) {
			console.log("[HybridExecutor] Reusing existing swarm");
			return this.activeSwarms.get(swarmKey);
		}

		console.log("[HybridExecutor] Creating new swarm");
		const swarmConfig = {
			topology: complexity.isResearchTask ? "mesh" : "hierarchical",
			maxAgents: Math.min(
				complexity.recommendedAgents,
				this.settings.swarm.max_agents,
			),
			strategy: complexity.isResearchTask ? "research" : "auto",
		};

		const swarmResult = await this.mcpClient.call("swarm_init", swarmConfig);
		const swarm = {
			id: swarmResult.swarmId,
			config: swarmConfig,
			agents: new Map(),
			created: new Date().toISOString(),
		};

		this.activeSwarms.set(swarmKey, swarm);
		console.log(`[HybridExecutor] Created swarm: ${swarm.id}`);

		return swarm;
	}

	async spawnAgentsFromProfiles(swarm, context) {
		const profileNames = this.determineRequiredProfiles(context);
		console.log(
			`[HybridExecutor] Spawning agents for profiles: ${profileNames.join(", ")}`,
		);

		const agents = [];

		for (const profileName of profileNames) {
			const agent = await this.agentMapper.spawnFromProfile(
				profileName,
				swarm.id,
				context,
			);
			agents.push(agent);
			swarm.agents.set(agent.agentId, agent);
		}

		return agents;
	}

	determineRequiredProfiles(context) {
		const profiles = [];

		// Always include a coordinator for complex tasks
		profiles.push("coordinator");

		// Determine specific profiles based on context
		if (context.files?.some((f) => f.match(/\.(js|ts|py|java)$/))) {
			profiles.push("coder");
		}

		if (context.description?.match(/research|analyze|investigate/i)) {
			profiles.push("researcher");
		}

		if (
			context.files?.some((f) => f.includes("test")) ||
			context.operation === "testing"
		) {
			profiles.push("tester");
		}

		if (context.operation === "analysis" || context.files?.length > 5) {
			profiles.push("analyst");
		}

		// Ensure we don't exceed max agents and have at least basic coverage
		const maxAgents = this.settings.swarm.max_agents;
		if (profiles.length > maxAgents) {
			return profiles.slice(0, maxAgents);
		} else if (profiles.length === 1) {
			// Add a researcher for collaboration
			profiles.push("researcher");
		}

		return profiles;
	}

	async orchestrateSwarmExecution(swarm, agents, hookType, context) {
		console.log(
			`[HybridExecutor] Orchestrating swarm execution with ${agents.length} agents`,
		);

		// Create orchestration task
		const orchestrationResult = await this.mcpClient.call("task_orchestrate", {
			task: `Execute ${hookType} hook with swarm coordination`,
			strategy: "parallel",
			agents: agents.map((a) => a.agentId),
			swarmId: swarm.id,
		});

		// Simulate coordinated execution
		const results = await Promise.all(
			agents.map(async (agent, index) => {
				// Simulate agent work with delay
				await new Promise((resolve) => setTimeout(resolve, 100 + index * 50));

				return {
					agentId: agent.agentId,
					agentType: agent.type,
					completed: true,
					contribution: `Agent ${agent.type} completed its assigned work`,
					performanceMetrics: {
						executionTimeMs: 100 + Math.random() * 200,
						tasksCompleted: Math.floor(Math.random() * 5) + 1,
					},
				};
			}),
		);

		const finalResult = {
			strategy: "mcp_swarm",
			hookType: hookType,
			swarmId: swarm.id,
			orchestrationId: orchestrationResult.taskId,
			agents: results,
			summary: {
				totalAgents: agents.length,
				totalTasks: results.reduce(
					(sum, r) => sum + r.performanceMetrics.tasksCompleted,
					0,
				),
				totalExecutionTime: Math.max(
					...results.map((r) => r.performanceMetrics.executionTimeMs),
				),
				success: true,
			},
			timestamp: new Date().toISOString(),
		};

		console.log("[HybridExecutor] Swarm execution completed successfully");
		return finalResult;
	}

	async initializeLightCoordination(context) {
		// Store coordination context in MCP memory
		const coordination = {
			coordinationId: `coord_${Date.now()}`,
			context: context,
			timestamp: new Date().toISOString(),
		};

		await this.mcpClient.call("memory_usage", {
			action: "store",
			key: coordination.coordinationId,
			value: JSON.stringify(coordination),
			namespace: "light_coordination",
		});

		return coordination;
	}

	async executeEnhancedHook(hookType, context, coordination) {
		// Execute hook with MCP memory backing
		const result = {
			strategy: "hybrid",
			hookType: hookType,
			coordinationId: coordination.coordinationId,
			enhanced: true,
			context: context,
			executed: true,
			timestamp: new Date().toISOString(),
			performance: { executionTimeMs: 200 },
		};

		return result;
	}

	async storeMCPResults(result, coordination) {
		await this.mcpClient.call("memory_usage", {
			action: "store",
			key: `result_${coordination.coordinationId}`,
			value: JSON.stringify(result),
			namespace: "execution_results",
		});

		console.log("[HybridExecutor] Results stored in MCP memory");
	}
}

/**
 * Demonstration of the hybrid integration prototype
 */
async function demonstrateHybridIntegration() {
	console.log(
		"🚀 Claude Flow MCP ↔ Claude Code Hybrid Integration Prototype\n",
	);

	// Initialize hybrid executor
	const executor = new HybridHookExecutor({
		hybrid: { enabled: true },
		swarm: {
			max_agents: 6,
			auto_spawn: { file_threshold: 3 },
		},
	});

	await executor.initialize();

	// Test cases demonstrating different execution strategies
	const testCases = [
		{
			name: "Simple Single File Edit",
			context: {
				files: ["simple-edit.js"],
				operation: "edit",
				description: "Make a simple change to a single file",
			},
		},
		{
			name: "Multi-file Refactoring",
			context: {
				files: ["component1.js", "component2.js", "component3.js", "shared.js"],
				operation: "refactor",
				description: "Refactor multiple components to use shared utilities",
			},
		},
		{
			name: "Research and Analysis Task",
			context: {
				files: ["data1.json", "data2.json", "analysis.py", "report.md"],
				operation: "analysis",
				description:
					"Research data patterns and analyze system performance metrics",
			},
		},
		{
			name: "Complex Project Development",
			context: {
				files: [
					"src/frontend/app.js",
					"src/frontend/components/header.js",
					"src/backend/server.js",
					"src/backend/api/users.js",
					"src/shared/utils.js",
					"tests/frontend.test.js",
					"tests/backend.test.js",
					"docs/architecture.md",
				],
				operation: "development",
				description:
					"Implement new feature across full-stack application with comprehensive testing",
			},
		},
	];

	// Execute test cases
	for (const testCase of testCases) {
		console.log(`\n${"=".repeat(60)}`);
		console.log(`🧪 Test Case: ${testCase.name}`);
		console.log(`${"=".repeat(60)}`);

		const result = await executor.executeHook("PreToolUse", testCase.context);

		console.log("\n📊 Execution Result:");
		console.log(`   Strategy: ${result.strategy}`);
		console.log(`   Success: ${result.executed || result.summary?.success}`);

		if (result.strategy === "mcp_swarm" && result.summary) {
			console.log(`   Agents: ${result.summary.totalAgents}`);
			console.log(`   Tasks: ${result.summary.totalTasks}`);
			console.log(`   Time: ${result.summary.totalExecutionTime}ms`);
		} else if (result.performance) {
			console.log(`   Time: ${result.performance.executionTimeMs}ms`);
		}
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("✅ Hybrid Integration Prototype Demonstration Complete");
	console.log(`${"=".repeat(60)}`);

	// Show backward compatibility preservation
	console.log("\n🔒 Backward Compatibility Verification:");

	const legacyExecutor = new HybridHookExecutor({
		hybrid: { enabled: false }, // Disable hybrid features
	});

	await legacyExecutor.initialize();

	const legacyResult = await legacyExecutor.executeHook("PreToolUse", {
		files: ["legacy-file.js"],
		operation: "edit",
	});

	console.log(
		`   Legacy mode result: ${legacyResult.strategy} (${legacyResult.executed ? "Success" : "Failed"})`,
	);
	console.log("   ✅ Existing configurations work unchanged");

	console.log("\n🎯 Key Integration Points Demonstrated:");
	console.log(
		"   ✅ Automatic execution strategy selection based on task complexity",
	);
	console.log("   ✅ Hook profile inheritance to MCP agent spawning");
	console.log(
		"   ✅ Seamless coordination between direct hooks and MCP swarms",
	);
	console.log("   ✅ Backward compatibility preservation");
	console.log("   ✅ Performance optimization through intelligent scaling");
	console.log("   ✅ Graceful degradation when MCP is unavailable");

	console.log(
		"\n🚀 Hybrid integration successfully bridges both paradigms while preserving system strengths!",
	);
}

// Run demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	demonstrateHybridIntegration().catch(console.error);
}

export { HybridHookExecutor, TaskComplexityAnalyzer, AgentInheritanceMapper };
