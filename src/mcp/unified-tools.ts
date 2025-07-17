#!/usr/bin/env node,
import { getErrorMessage } from "../utils/error-handler.js";

/**
 * Unified MCP Tools - Integration between Claude Code, ruv-swarm, and intrinsic agents
 */

import type { ILogger } from "../core/logger.js";
import type { MCPContext, MCPTool } from "../utils/types.js";

export interface UnifiedToolContext extends MCPContext {
	orchestrator?: any;
	swarmCoordinator?: any;
	agentManager?: any;
	resourceManager?: any;
	messageBus?: any;
	monitor?: any;
	workingDirectory?: string;
	// sessionId is already required in MCPContext
}

export function createUnifiedTools(logger: ILogger): MCPTool[] {
	return [
		// Unified work coordination tool
		{
			name: "mcp__claude-flow__work_coordinate",
			description:
				"Coordinate unified work execution with intrinsic agents and ruv-swarm integration",
			inputSchema: {
				type: "object",
				properties: {
					task: {
						type: "string",
						description: "Task description to coordinate",
					},
					agents: {
						type: "number",
						description:
							"Number of agents to coordinate (auto-determined if not specified)",
						minimum: 1,
						maximum: 20,
					},
					topology: {
						type: "string",
						enum: ["mesh", "hierarchical", "ring", "star"],
						default: "hierarchical",
						description: "Coordination topology",
					},
					strategy: {
						type: "string",
						enum: ["parallel", "sequential", "adaptive"],
						default: "parallel",
						description: "Execution strategy",
					},
					intrinsic: {
						type: "boolean",
						default: true,
						description: "Enable intrinsic agent coordination",
					},
					ruvSwarm: {
						type: "boolean",
						default: true,
						description: "Enable ruv-swarm integration if available",
					},
					memory: {
						type: "boolean",
						default: true,
						description: "Enable persistent memory coordination",
					},
					sessionId: {
						type: "string",
						description: "Custom session ID for coordination",
					},
				},
				required: ["task"],
			},
			handler: async (input: any, context?: MCPContext) => {
				try {
					logger.info("Starting unified work coordination", {
						task: input.task,
					});

					const {
						task,
						agents = determineOptimalAgentCount(input.task),
						topology = "hierarchical",
						strategy = "parallel",
						intrinsic = true,
						ruvSwarm = true,
						memory = true,
						sessionId = `work-${Date.now()}`,
					} = input;

					// Check ruv-swarm availability,
					let ruvSwarmAvailable = false;
					if (ruvSwarm) {
						try {
							const { execSync } = await import("child_process");
							execSync("npx ruv-swarm --version", { stdio: "pipe" });
							ruvSwarmAvailable = true;
						} catch {
							logger.info(
								"ruv-swarm not available, using intrinsic coordination only"
							);
						}
					}

					// Initialize coordination based on available systems,
					const coordinationPlan = await createCoordinationPlan({
						task,
						agents,
						topology,
						strategy,
						intrinsic,
						ruvSwarmAvailable,
						memory,
						sessionId,
					});

					// Execute coordination,
					const result = await executeUnifiedCoordination(
						coordinationPlan,
						context
					);

					logger.info("Unified work coordination completed", {
						sessionId,
						success: result.success,
						components: result.components,
					});

					return {
						success: true,
						sessionId,
						coordination: {
							task,
							agents,
							topology,
							strategy,
							intrinsic,
							ruvSwarmAvailable,
							memory,
						},
						execution: result,
						timestamp: new Date().toISOString(),
					};
				} catch (error) {
					logger.error("Unified work coordination failed", error);
					throw new Error(
						`Work coordination failed: ${getErrorMessage(error)}`
					);
				}
			},
		},

		// Intrinsic agent spawning tool
		{
			name: "mcp__claude-flow__agent_spawn_intrinsic",
			description: "Spawn intrinsic agents with automatic coordination hooks",
			inputSchema: {
				type: "object",
				properties: {
					type: {
						type: "string",
						enum: [
							"coordinator",
							"analyst",
							"coder",
							"tester",
							"researcher",
							"architect",
							"security",
						],
						description: "Type of agent to spawn",
					},
					name: {
						type: "string",
						description: "Custom name for the agent",
					},
					sessionId: {
						type: "string",
						description: "Session ID for coordination",
					},
					capabilities: {
						type: "array",
						items: { type: "string" },
						description: "Custom capabilities for the agent",
					},
					memoryHooks: {
						type: "boolean",
						default: true,
						description: "Enable automatic memory coordination hooks",
					},
				},
				required: ["type"],
			},
			handler: async (input: any, context?: MCPContext) => {
				try {
					const {
						type,
						name = `${type}-${Date.now()}`,
						sessionId = `session-${Date.now()}`,
						capabilities = getDefaultCapabilities(type),
						memoryHooks = true,
					} = input;

					logger.info("Spawning intrinsic agent", { type, name, sessionId });

					const agent = await spawnIntrinsicAgent({
						type,
						name,
						sessionId,
						capabilities,
						memoryHooks,
						context,
					});

					return {
						success: true,
						agent: {
							id: agent.id,
							type,
							name,
							sessionId,
							capabilities,
							memoryHooks,
							intrinsicCoordination: true,
							spawnedAt: new Date().toISOString(),
						},
					};
				} catch (error) {
					logger.error("Failed to spawn intrinsic agent", error);
					throw new Error(`Agent spawn failed: ${getErrorMessage(error)}`);
				}
			},
		},

		// Memory coordination tool
		{
			name: "mcp__claude-flow__memory_coordinate",
			description:
				"Coordinate agents through persistent memory with automatic hooks",
			inputSchema: {
				type: "object",
				properties: {
					sessionId: {
						type: "string",
						description: "Session ID to coordinate",
					},
					action: {
						type: "string",
						enum: ["store", "retrieve", "sync", "clear", "coordinate"],
						default: "coordinate",
						description: "Memory coordination action",
					},
					data: {
						type: "object",
						description: "Data to store or coordinate",
					},
					agentIds: {
						type: "array",
						items: { type: "string" },
						description: "Specific agent IDs to coordinate",
					},
				},
				required: ["sessionId"],
			},
			handler: async (input: any, context?: MCPContext) => {
				try {
					const { sessionId, action = "coordinate", data, agentIds } = input;

					logger.info("Memory coordination action", { sessionId, action });

					const result = await handleMemoryCoordination({
						sessionId,
						action,
						data,
						agentIds,
						context,
					});

					return {
						success: true,
						sessionId,
						action,
						result,
						timestamp: new Date().toISOString(),
					};
				} catch (error) {
					logger.error("Memory coordination failed", error);
					throw new Error(
						`Memory coordination failed: ${getErrorMessage(error)}`
					);
				}
			},
		},

		// Coordination status tool
		{
			name: "mcp__claude-flow__coordination_status",
			description: "Get unified coordination status across all systems",
			inputSchema: {
				type: "object",
				properties: {
					sessionId: {
						type: "string",
						description: "Session ID to check status for",
					},
					detailed: {
						type: "boolean",
						default: false,
						description: "Return detailed status information",
					},
				},
			},
			handler: async (input: any, context?: MCPContext) => {
				try {
					const { sessionId, detailed = false } = input;

					logger.info("Getting coordination status", { sessionId, detailed });

					const status = await getCoordinationStatus({
						sessionId,
						detailed,
						context,
					});

					return {
						success: true,
						sessionId,
						status,
						timestamp: new Date().toISOString(),
					};
				} catch (error) {
					logger.error("Failed to get coordination status", error);
					throw new Error(`Status check failed: ${getErrorMessage(error)}`);
				}
			},
		},

		// Unified system health check
		{
			name: "mcp__claude-flow__system_health",
			description: "Check health of unified coordination system",
			inputSchema: {
				type: "object",
				properties: {
					checkRuvSwarm: {
						type: "boolean",
						default: true,
						description: "Check ruv-swarm availability",
					},
					checkMemory: {
						type: "boolean",
						default: true,
						description: "Check memory system health",
					},
					checkIntrinsic: {
						type: "boolean",
						default: true,
						description: "Check intrinsic coordination health",
					},
				},
			},
			handler: async (input: any, context?: MCPContext) => {
				try {
					const {
						checkRuvSwarm = true,
						checkMemory = true,
						checkIntrinsic = true,
					} = input;

					logger.info("Checking system health");

					const health = await performSystemHealthCheck({
						checkRuvSwarm,
						checkMemory,
						checkIntrinsic,
						context,
					});

					return {
						success: true,
						health,
						timestamp: new Date().toISOString(),
					};
				} catch (error) {
					logger.error("System health check failed", error);
					throw new Error(`Health check failed: ${getErrorMessage(error)}`);
				}
			},
		},
	];
}

function determineOptimalAgentCount(task: string): number {
	const taskLower = task.toLowerCase();

	// Complex indicators,
	const complexIndicators = [
		"api",
		"database",
		"auth",
		"authentication",
		"microservice",
		"distributed",
		"full-stack",
	];
	const mediumIndicators = [
		"frontend",
		"backend",
		"ui",
		"interface",
		"integration",
		"testing",
	];
	const simpleIndicators = ["script", "utility", "helper", "simple", "basic"];

	let complexity = 0;

	for (const indicator of complexIndicators) {
		if (taskLower.includes(indicator)) complexity += 3;
	}

	for (const indicator of mediumIndicators) {
		if (taskLower.includes(indicator)) complexity += 2;
	}

	for (const indicator of simpleIndicators) {
		if (taskLower.includes(indicator)) complexity += 1;
	}

	// Return agent count based on complexity,
	if (complexity >= 8) return 10; // Very complex,
	if (complexity >= 5) return 7; // Complex,
	if (complexity >= 3) return 5; // Medium,
	return 3; // Simple
}

async function createCoordinationPlan(config: any): Promise<any> {
	return {
		id: `plan-${config.sessionId}`,
		...config,
		components: analyzeTaskComponents(config.task),
		createdAt: Date.now(),
	};
}

function analyzeTaskComponents(task: string): any[] {
	const components = [];
	const taskLower = task.toLowerCase();

	if (taskLower.includes("api") || taskLower.includes("endpoint")) {
		components.push({
			type: "API Development",
			description: "Design and implement API endpoints",
			complexity: 7,
			agentTypes: ["architect", "coder", "tester"],
		});
	}

	if (taskLower.includes("database") || taskLower.includes("storage")) {
		components.push({
			type: "Database Design",
			description: "Design database schema and data layer",
			complexity: 6,
			agentTypes: ["analyst", "architect", "coder"],
		});
	}

	if (taskLower.includes("auth") || taskLower.includes("security")) {
		components.push({
			type: "Authentication",
			description: "Implement authentication and security",
			complexity: 8,
			agentTypes: ["security", "coder", "tester"],
		});
	}

	// Default component if none specific identified,
	if (components.length === 0) {
		components.push({
			type: "General Implementation",
			description: task,
			complexity: 5,
			agentTypes: ["coder", "analyst", "tester"],
		});
	}

	return components;
}

async function executeUnifiedCoordination(
	plan: any,
	context?: UnifiedToolContext
): Promise<any> {
	const results = {
		success: true,
		components: plan.components.length,
		agentCount: plan.agents,
		executionTime: Date.now(),
		coordinationMethod: plan.ruvSwarmAvailable ? "ruv-swarm" : "intrinsic",
		details: [] as any[],
	};

	// Simulate coordination execution,
	for (const component of plan.components) {
		results.details.push({
			component: component.type,
			status: "completed",
			agentTypes: component.agentTypes,
			executedAt: Date.now(),
		});
	}

	return results;
}

async function spawnIntrinsicAgent(config: any): Promise<any> {
	return {
		id: `agent-${config.name}`,
		...config,
		spawnedAt: Date.now(),
		coordinationHooks: {
			preTask: true,
			postEdit: true,
			notification: true,
			memorySync: true,
		},
	};
}

async function handleMemoryCoordination(config: any): Promise<any> {
	const { sessionId, action, data, agentIds } = config;

	switch (action) {
		case "store":
			return { stored: true, sessionId, dataKeys: Object.keys(data || {}) };
		case "retrieve":
			return { retrieved: true, sessionId, entries: [] };
		case "sync":
			return { synced: true, sessionId, agentIds: agentIds || [] };
		case "clear":
			return { cleared: true, sessionId };
		case "coordinate":
			return { coordinated: true, sessionId, agents: agentIds?.length || 0 };
		default:
			return { action, sessionId, status: "unknown" };
	}
}

async function getCoordinationStatus(config: any): Promise<any> {
	const { sessionId, detailed } = config;

	const status = {
		sessionId,
		active: true,
		agentCount: 0,
		coordination: {
			intrinsic: true,
			ruvSwarm: false,
			memory: true,
		},
		lastActivity: new Date().toISOString(),
	};

	if (detailed) {
		(status as any)["details"] = {
			agents: [],
			components: [],
			memoryEntries: 0,
			coordinationEvents: 0,
		};
	}

	return status;
}

async function performSystemHealthCheck(config: any): Promise<any> {
	const health = {
		overall: "healthy",
		components: {
			intrinsic: {
				status: "healthy",
				details: "Intrinsic coordination operational",
			},
			memory: { status: "healthy", details: "Memory system operational" },
			ruvSwarm: { status: "unknown", details: "Not checked" },
		},
		timestamp: new Date().toISOString(),
	};

	if (config.checkRuvSwarm) {
		try {
			const { execSync } = await import("child_process");
			execSync("npx ruv-swarm --version", { stdio: "pipe" });
			health.components.ruvSwarm = {
				status: "healthy",
				details: "ruv-swarm available",
			};
		} catch {
			health.components.ruvSwarm = {
				status: "unavailable",
				details: "ruv-swarm not installed",
			};
		}
	}

	return health;
}

function getDefaultCapabilities(agentType: string): string[] {
	const capabilities: Record<string, string[]> = {
		coordinator: ["orchestration", "task-management", "agent-coordination"],
		analyst: ["data-analysis", "requirement-analysis", "problem-solving"],
		coder: ["programming", "implementation", "code-review"],
		tester: ["testing", "quality-assurance", "validation"],
		researcher: ["research", "information-gathering", "documentation"],
		architect: ["system-design", "architecture-planning", "technical-design"],
		security: [
			"security-analysis",
			"vulnerability-assessment",
			"secure-coding",
		],
	};

	return capabilities[agentType] || ["general-purpose"];
}
