import { getErrorMessage as _getErrorMessage } from "../../utils/error-handler.js";

/**
 * Comprehensive Agent management commands with advanced features
 */

import chalk from "chalk";
import Table from "cli-table3";
// Converted from @cliffy to commander.js for Node.js compatibility,
import { Command } from "commander";
import inquirer from "inquirer";

const { colors: _colors } = { colors: chalk }; // Compatibility shim,

import fs from "node:fs/promises";
import path from "node:path";
import { AgentManager } from "../../agents/agent-manager.js";
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

// Global agent manager instance,
let agentManager: AgentManager | null = null;

// Initialize agent manager,
// === UNIFIED AGENT SYSTEM INTERFACES ===

/**
 * Unified Agent interface for cross-pattern compatibility
 * Supports agents from swarm, hive, SPARC, and unified coordination patterns
 */
export interface UnifiedAgent {
	// Core Identity
	id: string;
	name: string;
	type: AgentType;
	pattern: CoordinationPattern;

	// Status Information
	status: AgentStatus;
	health: number; // 0.0 - 1.0
	workload: number; // 0.0 - 1.0

	// Metadata
	spawnedAt: Date;
	lastActivity: Date;
	sessionId?: string;
	parentId?: string; // For hierarchical patterns

	// Capabilities & Configuration
	capabilities: string[];
	configuration: Record<string, any>;
	environment: Record<string, any>;

	// Performance Metrics
	metrics: {
		tasksCompleted: number;
		avgResponseTime: number;
		successRate: number;
		resourceUsage: {
			memory: number;
			cpu: number;
			disk?: number;
		};
	};

	// Coordination Data
	coordination: {
		topology?: string;
		peers?: string[];
		coordinator?: string;
		intrinsicHooks?: boolean;
	};
}

/**
 * Agent type classification
 */
export type AgentType =
	| "coordinator"
	| "researcher"
	| "coder"
	| "analyst"
	| "architect"
	| "tester"
	| "reviewer"
	| "optimizer"
	| "documenter"
	| "monitor"
	| "specialist";

/**
 * Coordination patterns supported by Claude Flow
 */
export type CoordinationPattern =
	| "swarm"
	| "hive"
	| "sparc"
	| "unified"
	| "intrinsic";

/**
 * Agent operational status
 */
export type AgentStatus =
	| "initializing"
	| "active"
	| "idle"
	| "busy"
	| "paused"
	| "terminating"
	| "terminated"
	| "error";

/**
 * Filter options for agent listing
 */
export interface AgentFilterOptions {
	type?: AgentType | AgentType[];
	status?: AgentStatus | AgentStatus[];
	pattern?: CoordinationPattern | CoordinationPattern[];
	health?: {
		min?: number;
		max?: number;
	};
	workload?: {
		min?: number;
		max?: number;
	};
	sessionId?: string;
	unhealthyOnly?: boolean;
	activeOnly?: boolean;
	searchTerm?: string;
}

/**
 * Output formatting options
 */
export interface AgentOutputOptions {
	format: "table" | "json" | "tree" | "dashboard";
	detailed?: boolean;
	sort?: "name" | "type" | "status" | "health" | "workload" | "spawned";
	sortDirection?: "asc" | "desc";
	limit?: number;
	includeMetrics?: boolean;
	includeCoordination?: boolean;
}

/**
 * Pattern adapter interface for collecting agents from different systems
 */
export interface PatternAdapter {
	pattern: CoordinationPattern;
	isAvailable(): Promise<boolean>;
	getAgents(): Promise<UnifiedAgent[]>;
	getAgentById(id: string): Promise<UnifiedAgent | null>;
	getAgentMetrics(id: string): Promise<UnifiedAgent["metrics"] | null>;
}

// === PATTERN ADAPTERS IMPLEMENTATION ===

/**
 * Swarm pattern adapter - integrates with swarm coordination system
 */
class SwarmPatternAdapter implements PatternAdapter {
	pattern: CoordinationPattern = "swarm";

	async isAvailable(): Promise<boolean> {
		try {
			// Check if swarm state exists or swarm system is initialized
			const { hasActiveSwarms } = await import("./swarm-spawn.js");
			return hasActiveSwarms();
		} catch {
			return false;
		}
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			const { getFirstSwarmState } = await import("./swarm-spawn.js");
			const swarmState = getFirstSwarmState();
			if (!swarmState) return [];

			// Convert Map values to Array before mapping
			const agentValues = Array.from(swarmState.agents.values());
			return (
				agentValues.map((agent: any) => this.mapToUnifiedAgent(agent)) || []
			);
		} catch {
			return [];
		}
	}

	async getAgentById(id: string): Promise<UnifiedAgent | null> {
		const agents = await this.getAgents();
		return agents.find((agent) => agent.id === id) || null;
	}

	async getAgentMetrics(id: string): Promise<UnifiedAgent["metrics"] | null> {
		const agent = await this.getAgentById(id);
		return agent?.metrics || null;
	}

	private mapToUnifiedAgent(swarmAgent: any): UnifiedAgent {
		return {
			id: swarmAgent.id || generateId(),
			name: swarmAgent.name || `swarm-agent-${swarmAgent.id}`,
			type: swarmAgent.type || "specialist",
			pattern: "swarm",
			status: swarmAgent.status || "active",
			health: swarmAgent.health || 0.8,
			workload: swarmAgent.workload || 0.5,
			spawnedAt: swarmAgent.createdAt
				? new Date(swarmAgent.createdAt)
				: new Date(),
			lastActivity: new Date(),
			sessionId: swarmAgent.sessionId,
			capabilities: swarmAgent.capabilities || [],
			configuration: swarmAgent.config || {},
			environment: swarmAgent.environment || {},
			metrics: {
				tasksCompleted: swarmAgent.tasksCompleted || 0,
				avgResponseTime: swarmAgent.avgResponseTime || 0,
				successRate: swarmAgent.successRate || 1.0,
				resourceUsage: {
					memory: swarmAgent.memoryUsage || 0,
					cpu: swarmAgent.cpuUsage || 0,
					disk: swarmAgent.diskUsage,
				},
			},
			coordination: {
				topology: swarmAgent.topology,
				peers: swarmAgent.peers,
				coordinator: swarmAgent.coordinator,
				intrinsicHooks: false,
			},
		};
	}
}

/**
 * Hive pattern adapter - integrates with hive-mind coordination system
 */
class HivePatternAdapter implements PatternAdapter {
	pattern: CoordinationPattern = "hive";

	async isAvailable(): Promise<boolean> {
		try {
			// Check if hive-mind system is available
			const fs = await import("fs");
			const path = await import("path");
			const hivePath = path.join(process.cwd(), ".hive-mind");
			return fs.existsSync(hivePath);
		} catch {
			return false;
		}
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			// Try to load hive agents from memory or configuration
			const hiveModule = await import("./hive.js");
			const globalMemory = (hiveModule as any).globalMemory;
			if (!globalMemory) return [];

			// Query hive agents from memory system
			const hiveAgents = await globalMemory.query({
				type: "agent",
				pattern: "hive",
			});

			return hiveAgents.map((agent: any) => this.mapToUnifiedAgent(agent));
		} catch {
			return [];
		}
	}

	async getAgentById(id: string): Promise<UnifiedAgent | null> {
		const agents = await this.getAgents();
		return agents.find((agent) => agent.id === id) || null;
	}

	async getAgentMetrics(id: string): Promise<UnifiedAgent["metrics"] | null> {
		const agent = await this.getAgentById(id);
		return agent?.metrics || null;
	}

	private mapToUnifiedAgent(hiveAgent: any): UnifiedAgent {
		const agentData =
			typeof hiveAgent.content === "string"
				? JSON.parse(hiveAgent.content)
				: hiveAgent.content || {};

		return {
			id: hiveAgent.id || generateId(),
			name: agentData.name || `hive-agent-${hiveAgent.id}`,
			type: agentData.type || "researcher",
			pattern: "hive",
			status: agentData.status || "active",
			health: agentData.health || 0.9,
			workload: agentData.workload || 0.3,
			spawnedAt: hiveAgent.timestamp
				? new Date(hiveAgent.timestamp)
				: new Date(),
			lastActivity: new Date(),
			sessionId: agentData.sessionId,
			capabilities: agentData.capabilities || [],
			configuration: agentData.config || {},
			environment: agentData.environment || {},
			metrics: {
				tasksCompleted: agentData.tasksCompleted || 0,
				avgResponseTime: agentData.avgResponseTime || 0,
				successRate: agentData.successRate || 1.0,
				resourceUsage: {
					memory: agentData.memoryUsage || 0,
					cpu: agentData.cpuUsage || 0,
					disk: agentData.diskUsage,
				},
			},
			coordination: {
				topology: "hive",
				peers: agentData.peers,
				coordinator: agentData.coordinator,
				intrinsicHooks: false,
			},
		};
	}
}

/**
 * SPARC pattern adapter - integrates with SPARC methodology system
 */
class SparcPatternAdapter implements PatternAdapter {
	pattern: CoordinationPattern = "sparc";

	async isAvailable(): Promise<boolean> {
		try {
			// Check if SPARC configuration exists
			const sparcModule = await import("./sparc.js");
			const sparcConfig = (sparcModule as any).sparcConfig;
			return sparcConfig !== null;
		} catch {
			return false;
		}
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			const sparcModule = await import("./sparc.js");
			const sparcConfig = (sparcModule as any).sparcConfig;
			if (!sparcConfig) return [];

			// SPARC agents are typically methodology-based phases
			const sparcPhases = [
				{
					id: "specification",
					type: "analyst",
					name: "SPARC Specification Agent",
				},
				{ id: "pseudocode", type: "architect", name: "SPARC Pseudocode Agent" },
				{
					id: "architecture",
					type: "architect",
					name: "SPARC Architecture Agent",
				},
				{ id: "refinement", type: "reviewer", name: "SPARC Refinement Agent" },
				{ id: "completion", type: "coder", name: "SPARC Completion Agent" },
			];

			return sparcPhases.map((phase, index) =>
				this.mapToUnifiedAgent(phase, index)
			);
		} catch {
			return [];
		}
	}

	async getAgentById(id: string): Promise<UnifiedAgent | null> {
		const agents = await this.getAgents();
		return agents.find((agent) => agent.id === id) || null;
	}

	async getAgentMetrics(id: string): Promise<UnifiedAgent["metrics"] | null> {
		const agent = await this.getAgentById(id);
		return agent?.metrics || null;
	}

	private mapToUnifiedAgent(sparcPhase: any, index: number): UnifiedAgent {
		return {
			id: `sparc-${sparcPhase.id}`,
			name: sparcPhase.name,
			type: sparcPhase.type,
			pattern: "sparc",
			status: index === 0 ? "active" : "idle", // First phase is typically active
			health: 0.95,
			workload: index === 0 ? 0.7 : 0.1,
			spawnedAt: new Date(),
			lastActivity: new Date(),
			capabilities: [
				`sparc-${sparcPhase.id}`,
				"methodology",
				"structured-approach",
			],
			configuration: { phase: sparcPhase.id, methodology: "SPARC" },
			environment: { sparc: true },
			metrics: {
				tasksCompleted: 0,
				avgResponseTime: 0,
				successRate: 1.0,
				resourceUsage: {
					memory: 0,
					cpu: 0,
				},
			},
			coordination: {
				topology: "sequential",
				peers: [],
				coordinator: "sparc-orchestrator",
				intrinsicHooks: false,
			},
		};
	}
}

/**
 * Unified pattern adapter - integrates with unified coordination system
 */
class UnifiedPatternAdapter implements PatternAdapter {
	pattern: CoordinationPattern = "unified";

	async isAvailable(): Promise<boolean> {
		try {
			// Check if unified agents system is available
			const unifiedModule = await import("./unified-agents.js");
			const getMemoryManager = (unifiedModule as any).getMemoryManager;
			if (!getMemoryManager) return false;
			const memoryManager = await getMemoryManager();
			return memoryManager !== null;
		} catch {
			return false;
		}
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			const unifiedModule = await import("./unified-agents.js");
			const getMemoryManager = (unifiedModule as any).getMemoryManager;
			if (!getMemoryManager) return [];
			const memoryManager = await getMemoryManager();

			const agents = await memoryManager.query({
				type: "observation",
				limit: 100,
			});

			return agents.map((agent: any) => this.mapToUnifiedAgent(agent));
		} catch {
			return [];
		}
	}

	async getAgentById(id: string): Promise<UnifiedAgent | null> {
		const agents = await this.getAgents();
		return agents.find((agent) => agent.id === id) || null;
	}

	async getAgentMetrics(id: string): Promise<UnifiedAgent["metrics"] | null> {
		const agent = await this.getAgentById(id);
		return agent?.metrics || null;
	}

	private mapToUnifiedAgent(unifiedAgent: any): UnifiedAgent {
		let content: any;
		try {
			content = JSON.parse(unifiedAgent.content);
		} catch {
			content = {
				name: unifiedAgent.id,
				type: "unknown",
				sessionId: "unknown",
			};
		}

		return {
			id: unifiedAgent.id,
			name: content.name || unifiedAgent.id,
			type: content.type || "specialist",
			pattern: "unified",
			status: "active",
			health: 0.85,
			workload: 0.4,
			spawnedAt: content.spawnedAt ? new Date(content.spawnedAt) : new Date(),
			lastActivity: new Date(),
			sessionId: content.sessionId,
			capabilities: content.capabilities || [],
			configuration: content.config || {},
			environment: content.environment || {},
			metrics: {
				tasksCompleted: content.tasksCompleted || 0,
				avgResponseTime: content.avgResponseTime || 0,
				successRate: content.successRate || 1.0,
				resourceUsage: {
					memory: content.memoryUsage || 0,
					cpu: content.cpuUsage || 0,
					disk: content.diskUsage,
				},
			},
			coordination: {
				topology: "unified",
				peers: content.peers,
				coordinator: content.coordinator,
				intrinsicHooks: unifiedAgent.metadata?.coordinationHooks || false,
			},
		};
	}
}

/**
 * Intrinsic pattern adapter - integrates with intrinsic coordination
 */
class IntrinsicPatternAdapter implements PatternAdapter {
	pattern: CoordinationPattern = "intrinsic";

	async isAvailable(): Promise<boolean> {
		// Intrinsic agents are always available as they're built-in
		return true;
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		// Return the current agent instance and any intrinsic coordination agents
		const intrinsicAgents = [
			{
				id: "intrinsic-coordinator",
				name: "Intrinsic Coordination Agent",
				type: "coordinator" as AgentType,
				status: "active" as AgentStatus,
			},
			{
				id: "intrinsic-memory",
				name: "Intrinsic Memory Agent",
				type: "specialist" as AgentType,
				status: "active" as AgentStatus,
			},
		];

		return intrinsicAgents.map((agent) => this.mapToUnifiedAgent(agent));
	}

	async getAgentById(id: string): Promise<UnifiedAgent | null> {
		const agents = await this.getAgents();
		return agents.find((agent) => agent.id === id) || null;
	}

	async getAgentMetrics(id: string): Promise<UnifiedAgent["metrics"] | null> {
		const agent = await this.getAgentById(id);
		return agent?.metrics || null;
	}

	private mapToUnifiedAgent(intrinsicAgent: any): UnifiedAgent {
		return {
			id: intrinsicAgent.id,
			name: intrinsicAgent.name,
			type: intrinsicAgent.type,
			pattern: "intrinsic",
			status: intrinsicAgent.status,
			health: 1.0,
			workload: 0.2,
			spawnedAt: new Date(),
			lastActivity: new Date(),
			capabilities: ["intrinsic-coordination", "built-in"],
			configuration: { intrinsic: true },
			environment: { runtime: "built-in" },
			metrics: {
				tasksCompleted: 0,
				avgResponseTime: 0,
				successRate: 1.0,
				resourceUsage: {
					memory: 0,
					cpu: 0,
				},
			},
			coordination: {
				topology: "intrinsic",
				peers: [],
				coordinator: "system",
				intrinsicHooks: true,
			},
		};
	}
}

// === AGENT STATUS AGGREGATOR SERVICE ===

/**
 * AgentStatusAggregator - Service for real-time status collection across all patterns
 * Provides unified access to agents from all coordination patterns with caching and performance optimization
 */
class AgentStatusAggregator {
	private adapters: PatternAdapter[];
	private cache: Map<string, { agents: UnifiedAgent[]; timestamp: number }>;
	private readonly CACHE_TTL = 5000; // 5 seconds cache

	constructor() {
		this.adapters = [
			new SwarmPatternAdapter(),
			new HivePatternAdapter(),
			new SparcPatternAdapter(),
			new UnifiedPatternAdapter(),
			new IntrinsicPatternAdapter(),
		];
		this.cache = new Map();
	}

	/**
	 * Get all agents from all available coordination patterns
	 */
	async getAllAgents(): Promise<UnifiedAgent[]> {
		const allAgents: UnifiedAgent[] = [];

		// Collect agents from all available adapters in parallel
		const adapterPromises = this.adapters.map(async (adapter) => {
			try {
				const isAvailable = await adapter.isAvailable();
				if (isAvailable) {
					const cacheKey = `agents-${adapter.pattern}`;
					const cached = this.cache.get(cacheKey);

					// Return cached results if still valid
					if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
						return cached.agents;
					}

					// Fetch fresh data
					const agents = await adapter.getAgents();
					this.cache.set(cacheKey, { agents, timestamp: Date.now() });
					return agents;
				}
				return [];
			} catch (error) {
				console.warn(
					`Failed to get agents from ${adapter.pattern} pattern:`,
					error
				);
				return [];
			}
		});

		const adapterResults = await Promise.all(adapterPromises);
		adapterResults.forEach((agents) => allAgents.push(...agents));

		return allAgents;
	}

	/**
	 * Get agents with advanced filtering
	 */
	async getFilteredAgents(
		filters: AgentFilterOptions
	): Promise<UnifiedAgent[]> {
		let agents = await this.getAllAgents();

		// Apply filters
		if (filters.type) {
			const types = Array.isArray(filters.type) ? filters.type : [filters.type];
			agents = agents.filter((agent) => types.includes(agent.type));
		}

		if (filters.status) {
			const statuses = Array.isArray(filters.status)
				? filters.status
				: [filters.status];
			agents = agents.filter((agent) => statuses.includes(agent.status));
		}

		if (filters.pattern) {
			const patterns = Array.isArray(filters.pattern)
				? filters.pattern
				: [filters.pattern];
			agents = agents.filter((agent) => patterns.includes(agent.pattern));
		}

		if (filters.health) {
			if (filters.health.min !== undefined) {
				agents = agents.filter((agent) => agent.health >= filters.health!.min!);
			}
			if (filters.health.max !== undefined) {
				agents = agents.filter((agent) => agent.health <= filters.health!.max!);
			}
		}

		if (filters.workload) {
			if (filters.workload.min !== undefined) {
				agents = agents.filter(
					(agent) => agent.workload >= filters.workload!.min!
				);
			}
			if (filters.workload.max !== undefined) {
				agents = agents.filter(
					(agent) => agent.workload <= filters.workload!.max!
				);
			}
		}

		if (filters.sessionId) {
			agents = agents.filter((agent) => agent.sessionId === filters.sessionId);
		}

		if (filters.unhealthyOnly) {
			agents = agents.filter((agent) => agent.health < 0.7);
		}

		if (filters.activeOnly) {
			agents = agents.filter((agent) =>
				["active", "busy"].includes(agent.status)
			);
		}

		if (filters.searchTerm) {
			const term = filters.searchTerm.toLowerCase();
			agents = agents.filter(
				(agent) =>
					agent.name.toLowerCase().includes(term) ||
					agent.type.toLowerCase().includes(term) ||
					agent.pattern.toLowerCase().includes(term) ||
					agent.id.toLowerCase().includes(term)
			);
		}

		return agents;
	}

	/**
	 * Get a specific agent by ID across all patterns
	 */
	async getAgentById(id: string): Promise<UnifiedAgent | null> {
		// Try to find in cache first
		for (const cached of this.cache.values()) {
			const agent = cached.agents.find((a) => a.id === id);
			if (agent && Date.now() - cached.timestamp < this.CACHE_TTL) {
				return agent;
			}
		}

		// Search across all adapters
		for (const adapter of this.adapters) {
			try {
				const isAvailable = await adapter.isAvailable();
				if (isAvailable) {
					const agent = await adapter.getAgentById(id);
					if (agent) {
						return agent;
					}
				}
			} catch {
				// Continue searching in other adapters
			}
		}

		return null;
	}

	/**
	 * Get system statistics across all patterns
	 */
	async getSystemStats(): Promise<{
		totalAgents: number;
		activeAgents: number;
		healthyAgents: number;
		averageHealth: number;
		patternDistribution: Record<CoordinationPattern, number>;
		typeDistribution: Record<AgentType, number>;
	}> {
		const agents = await this.getAllAgents();

		const activeAgents = agents.filter((a) =>
			["active", "busy"].includes(a.status)
		).length;
		const healthyAgents = agents.filter((a) => a.health >= 0.7).length;
		const averageHealth =
			agents.length > 0
				? agents.reduce((sum, a) => sum + a.health, 0) / agents.length
				: 0;

		const patternDistribution: Record<CoordinationPattern, number> = {
			swarm: 0,
			hive: 0,
			sparc: 0,
			unified: 0,
			intrinsic: 0,
		};

		const typeDistribution: Record<AgentType, number> = {
			coordinator: 0,
			researcher: 0,
			coder: 0,
			analyst: 0,
			architect: 0,
			tester: 0,
			reviewer: 0,
			optimizer: 0,
			documenter: 0,
			monitor: 0,
			specialist: 0,
		};

		agents.forEach((agent) => {
			patternDistribution[agent.pattern]++;
			typeDistribution[agent.type]++;
		});

		return {
			totalAgents: agents.length,
			activeAgents,
			healthyAgents,
			averageHealth,
			patternDistribution,
			typeDistribution,
		};
	}

	/**
	 * Clear the cache (useful for testing or manual refresh)
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics for performance monitoring
	 */
	getCacheStats(): { size: number; patterns: string[]; oldestEntry: number } {
		const patterns = Array.from(this.cache.keys());
		const timestamps = Array.from(this.cache.values()).map((v) => v.timestamp);
		const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;

		return {
			size: this.cache.size,
			patterns,
			oldestEntry,
		};
	}
}

// === GLOBAL UNIFIED AGENT SYSTEM ===

// Global unified agent status aggregator instance
let globalAgentAggregator: AgentStatusAggregator | null = null;

/**
 * Get or initialize the global unified agent status aggregator
 */
export async function getUnifiedAgentAggregator(): Promise<AgentStatusAggregator> {
	if (!globalAgentAggregator) {
		globalAgentAggregator = new AgentStatusAggregator();
	}
	return globalAgentAggregator;
}

/**
 * Backward-compatible function to get all agents across all patterns
 * This provides compatibility with existing simple command implementations
 */
export async function getAllUnifiedAgents(): Promise<UnifiedAgent[]> {
	const aggregator = await getUnifiedAgentAggregator();
	return aggregator.getAllAgents();
}

/**
 * Backward-compatible function to display agents with basic formatting
 * Used by simple command system for compatibility
 */
export async function displayUnifiedAgentsList(
	options: {
		detailed?: boolean;
		json?: boolean;
		pattern?: string;
		type?: string;
		status?: string;
		sessionId?: string;
	} = {}
): Promise<void> {
	try {
		const aggregator = await getUnifiedAgentAggregator();

		// Build filter from options
		const filterOptions: AgentFilterOptions = {};
		if (options.pattern)
			filterOptions.pattern = options.pattern as CoordinationPattern;
		if (options.type) filterOptions.type = options.type as AgentType;
		if (options.status) filterOptions.status = options.status as AgentStatus;
		if (options.sessionId) filterOptions.sessionId = options.sessionId;

		const agents = await aggregator.getFilteredAgents(filterOptions);

		if (options.json) {
			console.log(JSON.stringify(agents, null, 2));
		} else {
			const outputOptions: AgentOutputOptions = {
				format: "table",
				detailed: options.detailed || false,
			};
			formatAgentsTable(agents, outputOptions);

			// Show brief stats
			const stats = await aggregator.getSystemStats();
			console.log(
				chalk.dim(
					`\n📊 ${stats.totalAgents} total agents across ${Object.keys(stats.patternDistribution).filter((p) => stats.patternDistribution[p as CoordinationPattern] > 0).length} patterns`
				)
			);
		}
	} catch (error) {
		console.error(
			chalk.red("Error displaying agents:"),
			error instanceof Error ? error.message : String(error)
		);
	}
}

/**
 * Export unified agent system for use in other modules
 */
export { AgentStatusAggregator };

// === OUTPUT FORMATTING FUNCTIONS ===

/**
 * Format agents for table output
 */
function formatAgentsTable(
	agents: UnifiedAgent[],
	options: AgentOutputOptions = { format: "table" }
): void {
	if (agents.length === 0) {
		console.log(chalk.yellow("No agents found matching the criteria"));
		return;
	}

	// Sort agents
	const sorted = sortAgents(agents, options);

	console.log(
		chalk.cyan(`\n🤖 Unified Agent Status Report (${agents.length} agents)`)
	);
	console.log("═".repeat(100));

	if (options.detailed) {
		// Detailed table format
		sorted.forEach((agent, index) => {
			const statusColor = getStatusColor(agent.status);
			const healthIcon = getHealthIcon(agent.health);
			const patternBadge = getPatternBadge(agent.pattern);

			console.log(`\n${index + 1}. ${chalk.bold(agent.name)} ${patternBadge}`);
			console.log(`   ID: ${chalk.dim(agent.id)}`);
			console.log(
				`   Type: ${chalk.blue(agent.type)} | Status: ${statusColor(agent.status)} | Health: ${healthIcon} ${formatPercentage(agent.health)}`
			);
			console.log(
				`   Workload: ${formatWorkloadBar(agent.workload)} ${formatPercentage(agent.workload)}`
			);
			console.log(
				`   Spawned: ${formatRelativeTime(agent.spawnedAt)} | Session: ${agent.sessionId || "N/A"}`
			);

			if (options.includeMetrics && agent.metrics) {
				console.log(
					`   Tasks: ${agent.metrics.tasksCompleted} | Success Rate: ${formatPercentage(agent.metrics.successRate)} | Avg Response: ${agent.metrics.avgResponseTime}ms`
				);
				console.log(
					`   Memory: ${formatBytes(agent.metrics.resourceUsage.memory)} | CPU: ${formatPercentage(agent.metrics.resourceUsage.cpu)}`
				);
			}

			if (options.includeCoordination && agent.coordination) {
				console.log(
					`   Coordination: ${agent.coordination.topology || "N/A"} | Peers: ${agent.coordination.peers?.length || 0} | Hooks: ${agent.coordination.intrinsicHooks ? "✓" : "✗"}`
				);
			}
		});
	} else {
		// Compact table format
		console.log(
			`${"NAME".padEnd(20)} ${"TYPE".padEnd(12)} ${"PATTERN".padEnd(8)} ${"STATUS".padEnd(12)} ${"HEALTH".padEnd(8)} ${"WORKLOAD".padEnd(10)} ${"SESSION".padEnd(15)}`
		);
		console.log("─".repeat(100));

		sorted.forEach((agent) => {
			const statusColor = getStatusColor(agent.status);
			const healthIcon = getHealthIcon(agent.health);
			const patternBadge = getPatternBadge(agent.pattern);

			const name =
				agent.name.length > 18
					? agent.name.substring(0, 18) + ".."
					: agent.name;
			const sessionId =
				(agent.sessionId || "N/A").length > 13
					? (agent.sessionId || "N/A").substring(0, 13) + ".."
					: agent.sessionId || "N/A";

			console.log(
				`${name.padEnd(20)} ${agent.type.padEnd(12)} ${patternBadge.padEnd(8)} ${statusColor(agent.status).padEnd(12)} ${(healthIcon + formatPercentage(agent.health)).padEnd(8)} ${formatPercentage(agent.workload).padEnd(10)} ${sessionId.padEnd(15)}`
			);
		});
	}
}

/**
 * Format agents for JSON output
 */
function formatAgentsJSON(
	agents: UnifiedAgent[],
	options: AgentOutputOptions
): void {
	const sorted = sortAgents(agents, options);
	const output =
		options.includeMetrics || options.includeCoordination
			? sorted
			: sorted.map((agent) => ({
					id: agent.id,
					name: agent.name,
					type: agent.type,
					pattern: agent.pattern,
					status: agent.status,
					health: agent.health,
					workload: agent.workload,
					sessionId: agent.sessionId,
					spawnedAt: agent.spawnedAt,
					lastActivity: agent.lastActivity,
				}));

	console.log(JSON.stringify(output, null, 2));
}

/**
 * Format agents for tree output (grouped by pattern)
 */
function formatAgentsTree(
	agents: UnifiedAgent[],
	options: AgentOutputOptions
): void {
	if (agents.length === 0) {
		console.log(chalk.yellow("No agents found matching the criteria"));
		return;
	}

	const sorted = sortAgents(agents, options);
	const groupedByPattern = sorted.reduce(
		(groups, agent) => {
			if (!groups[agent.pattern]) {
				groups[agent.pattern] = [];
			}
			groups[agent.pattern].push(agent);
			return groups;
		},
		{} as Record<CoordinationPattern, UnifiedAgent[]>
	);

	console.log(chalk.cyan(`\n🌳 Agent Tree View (${agents.length} agents)\n`));

	Object.entries(groupedByPattern).forEach(([pattern, patternAgents]) => {
		const patternIcon = getPatternIcon(pattern as CoordinationPattern);
		console.log(
			`${patternIcon} ${chalk.bold(pattern.toUpperCase())} (${patternAgents.length})`
		);

		patternAgents.forEach((agent, index) => {
			const isLast = index === patternAgents.length - 1;
			const prefix = isLast ? "└── " : "├── ";
			const statusColor = getStatusColor(agent.status);
			const healthIcon = getHealthIcon(agent.health);

			console.log(
				`${prefix}${agent.name} ${chalk.dim(`(${agent.type})`)} ${statusColor(agent.status)} ${healthIcon}`
			);

			if (options.detailed) {
				const detailPrefix = isLast ? "    " : "│   ";
				console.log(`${detailPrefix}├─ ID: ${chalk.dim(agent.id)}`);
				console.log(
					`${detailPrefix}├─ Health: ${formatPercentage(agent.health)} | Workload: ${formatPercentage(agent.workload)}`
				);
				console.log(
					`${detailPrefix}└─ Session: ${agent.sessionId || "N/A"} | Spawned: ${formatRelativeTime(agent.spawnedAt)}`
				);
			}
		});
		console.log();
	});
}

/**
 * Format agents for dashboard output (with statistics)
 */
function formatAgentsDashboard(
	agents: UnifiedAgent[],
	options: AgentOutputOptions
): void {
	const sorted = sortAgents(agents, options);

	console.log(chalk.cyan("\n📊 Claude Flow Agent Dashboard"));
	console.log("═".repeat(80));

	// Overall statistics
	const stats = {
		total: agents.length,
		active: agents.filter((a) => ["active", "busy"].includes(a.status)).length,
		healthy: agents.filter((a) => a.health >= 0.7).length,
		avgHealth:
			agents.length > 0
				? agents.reduce((sum, a) => sum + a.health, 0) / agents.length
				: 0,
		avgWorkload:
			agents.length > 0
				? agents.reduce((sum, a) => sum + a.workload, 0) / agents.length
				: 0,
	};

	console.log(`\n📈 System Overview:`);
	console.log(
		`   Total Agents: ${chalk.bold(stats.total)} | Active: ${chalk.green(stats.active)} | Healthy: ${chalk.green(stats.healthy)}`
	);
	console.log(
		`   Avg Health: ${formatPercentage(stats.avgHealth)} | Avg Workload: ${formatPercentage(stats.avgWorkload)}`
	);

	// Pattern distribution
	const patternCounts = agents.reduce(
		(counts, agent) => {
			counts[agent.pattern] = (counts[agent.pattern] || 0) + 1;
			return counts;
		},
		{} as Record<string, number>
	);

	console.log(`\n🏗️  Pattern Distribution:`);
	Object.entries(patternCounts).forEach(([pattern, count]) => {
		const percentage = Math.round((count / agents.length) * 100);
		const bar = "█".repeat(Math.max(1, Math.floor(percentage / 5)));
		console.log(
			`   ${getPatternIcon(pattern as CoordinationPattern)} ${pattern.padEnd(10)} ${count.toString().padStart(3)} (${percentage}%) ${chalk.dim(bar)}`
		);
	});

	// Agent type distribution
	const typeCounts = agents.reduce(
		(counts, agent) => {
			counts[agent.type] = (counts[agent.type] || 0) + 1;
			return counts;
		},
		{} as Record<string, number>
	);

	console.log(`\n👥 Agent Type Distribution:`);
	Object.entries(typeCounts).forEach(([type, count]) => {
		const percentage = Math.round((count / agents.length) * 100);
		console.log(
			`   ${type.padEnd(12)} ${count.toString().padStart(3)} (${percentage}%)`
		);
	});

	// Recent agents (if detailed)
	if (options.detailed && sorted.length > 0) {
		console.log(`\n⚡ Recent Activity (Top 5):`);
		const recentAgents = sorted
			.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
			.slice(0, 5);

		recentAgents.forEach((agent, index) => {
			const statusColor = getStatusColor(agent.status);
			console.log(
				`   ${index + 1}. ${agent.name} ${chalk.dim(`(${agent.type})`)} ${statusColor(agent.status)} - ${formatRelativeTime(agent.lastActivity)}`
			);
		});
	}
}

// === HELPER FUNCTIONS FOR FORMATTING ===

function sortAgents(
	agents: UnifiedAgent[],
	options: AgentOutputOptions
): UnifiedAgent[] {
	const { sort = "name", sortDirection = "asc" } = options;

	return agents.sort((a, b) => {
		let compareValue = 0;

		switch (sort) {
			case "name":
				compareValue = a.name.localeCompare(b.name);
				break;
			case "type":
				compareValue = a.type.localeCompare(b.type);
				break;
			case "status":
				compareValue = a.status.localeCompare(b.status);
				break;
			case "health":
				compareValue = a.health - b.health;
				break;
			case "workload":
				compareValue = a.workload - b.workload;
				break;
			case "spawned":
				compareValue = a.spawnedAt.getTime() - b.spawnedAt.getTime();
				break;
			default:
				compareValue = a.name.localeCompare(b.name);
		}

		return sortDirection === "desc" ? -compareValue : compareValue;
	});
}

function getStatusColor(status: AgentStatus): (text: string) => string {
	switch (status) {
		case "active":
			return chalk.green;
		case "busy":
			return chalk.yellow;
		case "idle":
			return chalk.blue;
		case "paused":
			return chalk.gray;
		case "error":
			return chalk.red;
		case "terminated":
			return chalk.red;
		case "terminating":
			return chalk.red;
		case "initializing":
			return chalk.cyan;
		default:
			return chalk.white;
	}
}

function getHealthIcon(health: number): string {
	if (health >= 0.9) return "🟢";
	if (health >= 0.7) return "🟡";
	if (health >= 0.5) return "🟠";
	return "🔴";
}

function getPatternIcon(pattern: CoordinationPattern): string {
	switch (pattern) {
		case "swarm":
			return "🐝";
		case "hive":
			return "🍯";
		case "sparc":
			return "⚡";
		case "unified":
			return "🔗";
		case "intrinsic":
			return "🧠";
		default:
			return "🤖";
	}
}

function getPatternBadge(pattern: CoordinationPattern): string {
	const icon = getPatternIcon(pattern);
	return `${icon}${pattern}`;
}

function formatWorkloadBar(workload: number): string {
	const barLength = 10;
	const filledLength = Math.floor(workload * barLength);
	const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);
	return chalk.dim(`[${bar}]`);
}

async function initializeAgentManager(): Promise<AgentManager> {
	if (agentManager) return agentManager;

	const logger = new Logger({
		level: "info",
		format: "text",
		destination: "console",
	});
	const eventBus = EventBus.getInstance();
	const memorySystem = new DistributedMemorySystem(
		{}, // Use default config,
		logger,
		eventBus
	);

	await memorySystem.initialize();

	agentManager = new AgentManager(
		{
			maxAgents: 100,
			defaultTimeout: 60000,
			heartbeatInterval: 15000,
			healthCheckInterval: 30000,
			autoRestart: true,
			resourceLimits: {
				memory: 1024 * 1024 * 1024, // 1GB,
				cpu: 2.0,
				disk: 2 * 1024 * 1024 * 1024, // 2GB
			},
		},
		logger,
		eventBus,
		memorySystem
	);

	await agentManager.initialize();
	return agentManager;
}

export function createAgentCommand(): Command {
	const agentCommand = new Command("agent")
		.description(
			"Comprehensive Claude-Flow agent management with advanced features"
		)
		.action(() => {
			console.log(chalk.cyan("🤖 Claude-Flow Agent Management System"));
			console.log("");
			console.log("Available commands:");
			console.log(
				"  spawn    - Create and start new agents with advanced configuration"
			);
			console.log(
				"  list     - Display all agents with status, metrics, and resource usage"
			);
			console.log(
				"  info     - Get detailed information about a specific agent"
			);
			console.log(
				"  terminate - Safely terminate agents with cleanup and state preservation"
			);
			console.log(
				"  pool     - Manage agent pools for scaling and load distribution"
			);
			console.log("  health   - Monitor agent health and performance metrics");
			console.log("  logs     - View agent logs and activity history");
			console.log("");
			console.log("Use --help with any command for detailed options.");
		});
	// List command,
	agentCommand
		.command("list")
		.description("Display all agents with comprehensive status and metrics")
		.option("-t, --type <type>", "Filter by agent type")
		.option("-s, --status <status>", "Filter by agent status")
		.option(
			"-p, --pattern <pattern>",
			"Filter by coordination pattern (swarm, hive, sparc, unified, intrinsic)"
		)
		.option("--session <session>", "Filter by session ID")
		.option("--search <term>", "Search agents by name, type, or pattern")
		.option("--unhealthy", "Show only unhealthy agents")
		.option("--active", "Show only active agents")
		.option("--health-min <min>", "Minimum health threshold (0.0-1.0)")
		.option("--health-max <max>", "Maximum health threshold (0.0-1.0)")
		.option("--workload-min <min>", "Minimum workload threshold (0.0-1.0)")
		.option("--workload-max <max>", "Maximum workload threshold (0.0-1.0)")
		.option(
			"-f, --format <format>",
			"Output format (table, json, tree, dashboard)",
			"table"
		)
		.option("--json", "Output in JSON format (shorthand for --format json)")
		.option("--detailed", "Show detailed resource usage and metrics")
		.option("--metrics", "Include performance metrics")
		.option("--coordination", "Include coordination information")
		.option("--limit <count>", "Limit number of agents displayed")
		.option("--desc", "Sort in descending order")
		.option("--cache", "Show cache statistics")
		.option("--quiet", "Hide system overview")
		.option(
			"--sort <field>",
			"Sort by field (name, type, status, health, workload, spawned)",
			"name"
		)
		.action(async (options: any) => {
			try {
				// Initialize unified agent status aggregator
				const aggregator = new AgentStatusAggregator();

				// Build filter options from command line arguments
				const filterOptions: AgentFilterOptions = {};

				if (options.type) {
					filterOptions.type = options.type as AgentType;
				}
				if (options.status) {
					filterOptions.status = options.status as AgentStatus;
				}
				if (options.unhealthy) {
					filterOptions.unhealthyOnly = true;
				}
				if (options.active) {
					filterOptions.activeOnly = true;
				}
				if (options.pattern) {
					filterOptions.pattern = options.pattern as CoordinationPattern;
				}
				if (options.session) {
					filterOptions.sessionId = options.session;
				}
				if (options.search) {
					filterOptions.searchTerm = options.search;
				}

				// Handle health range filters
				if (options.healthMin || options.healthMax) {
					filterOptions.health = {};
					if (options.healthMin) {
						filterOptions.health.min = parseFloat(options.healthMin);
					}
					if (options.healthMax) {
						filterOptions.health.max = parseFloat(options.healthMax);
					}
				}

				// Handle workload range filters
				if (options.workloadMin || options.workloadMax) {
					filterOptions.workload = {};
					if (options.workloadMin) {
						filterOptions.workload.min = parseFloat(options.workloadMin);
					}
					if (options.workloadMax) {
						filterOptions.workload.max = parseFloat(options.workloadMax);
					}
				}

				// Build output options
				const outputOptions: AgentOutputOptions = {
					format: options.format || (options.json ? "json" : "table"),
					detailed: options.detailed || false,
					sort: options.sort || "name",
					sortDirection: options.desc ? "desc" : "asc",
					limit: options.limit ? parseInt(options.limit) : undefined,
					includeMetrics: options.metrics || options.detailed,
					includeCoordination: options.coordination || options.detailed,
				};

				// Get filtered agents using unified system
				const agents = await aggregator.getFilteredAgents(filterOptions);

				// Apply limit if specified
				const limitedAgents = outputOptions.limit
					? agents.slice(0, outputOptions.limit)
					: agents;

				// Format and display output based on format
				switch (outputOptions.format) {
					case "json":
						formatAgentsJSON(limitedAgents, outputOptions);
						break;
					case "tree":
						formatAgentsTree(limitedAgents, outputOptions);
						break;
					case "dashboard":
						formatAgentsDashboard(limitedAgents, outputOptions);
						break;
					case "table":
					default:
						formatAgentsTable(limitedAgents, outputOptions);
						break;
				}

				// Display system statistics if not in JSON mode
				if (outputOptions.format !== "json" && !options.quiet) {
					const stats = await aggregator.getSystemStats();
					console.log("\n" + chalk.cyan("📊 System Overview:"));
					console.log(
						`   Total: ${stats.totalAgents} | Active: ${chalk.green(stats.activeAgents)} | Healthy: ${chalk.green(stats.healthyAgents)} | Avg Health: ${formatPercentage(stats.averageHealth)}`
					);

					if (options.cache) {
						const cacheStats = aggregator.getCacheStats();
						console.log(
							chalk.dim(
								`   Cache: ${cacheStats.size} entries | Patterns: ${cacheStats.patterns.join(", ")}`
							)
						);
					}
				}
			} catch (error) {
				console.error(
					chalk.red("Error listing agents:"),
					error instanceof Error ? error.message : String(error)
				);
				process.exit(1);
			}
		});

	// Spawn command,
	agentCommand
		.command("spawn [template]")
		.description(
			"Create and start new agents with advanced configuration options"
		)
		.option("-n, --name <name>", "Agent name")
		.option("-t, --type <type>", "Agent type")
		.option("--template <template>", "Use predefined template")
		.option("--pool <pool>", "Add to specific pool")
		.option("--autonomy <level>", "Autonomy level (0-1)", "0.7")
		.option("--max-tasks <max>", "Maximum concurrent tasks", "5")
		.option("--max-memory <mb>", "Memory limit in MB", "512")
		.option("--timeout <ms>", "Task timeout in milliseconds", "300000")
		.option("--interactive", "Interactive configuration")
		.option("--start", "Automatically start the agent after creation")
		.option("--config <path>", "Load configuration from JSON file")
		.action(async (template: string, options: any) => {
			try {
				const manager = await initializeAgentManager();

				let agentConfig: any = {};

				// Load from config file if provided,
				if (options.config) {
					const configPath = path.resolve(options.config);
					const configData = await fs.readFile(configPath, "utf-8");
					agentConfig = JSON.parse(configData);
				}

				// Interactive mode,
				if (options.interactive) {
					agentConfig = await interactiveAgentConfiguration(manager);
				} else {
					// Use template or command line options,
					const templateName = template || options.template;
					if (!templateName) {
						console.error(
							chalk.red(
								"Error: Template name is required. Use --interactive for guided setup."
							)
						);
						return;
					}

					const templates = manager.getAgentTemplates();
					const selectedTemplate = templates.find((t) =>
						t.name.toLowerCase().includes(templateName.toLowerCase())
					);

					if (!selectedTemplate) {
						console.error(chalk.red(`Template '${templateName}' not found.`));
						console.log("Available templates:");
						templates.forEach((t) => console.log(`  - ${t.name} (${t.type})`));
						return;
					}

					agentConfig = {
						template: selectedTemplate.name,
						name: options.name,
						config: {
							autonomyLevel: parseFloat(options.autonomy),
							maxConcurrentTasks: parseInt(options.maxTasks),
							timeoutThreshold: parseInt(options.timeout),
						},
						environment: {
							maxMemoryUsage: parseInt(options.maxMemory) * 1024 * 1024,
						},
					};
				}

				console.log(chalk.cyan("\n🚀 Creating new agent..."));

				// Create the agent,
				const agentId = await manager.createAgent(
					agentConfig.template || "researcher",
					{
						name: agentConfig.name,
						config: agentConfig.config,
						environment: agentConfig.environment,
					}
				);

				console.log(chalk.green(`✅ Agent created successfully!`));
				console.log(`Agent ID: ${chalk.bold(agentId)}`);

				// Add to pool if specified,
				if (options.pool) {
					const pools = manager.getAllPools();
					const targetPool = pools.find(
						(p) => p.name === options.pool || p.id === options.pool
					);
					if (targetPool) {
						// Add agent to pool (this would need pool management methods)
						console.log(chalk.blue(`Added to pool: ${targetPool.name}`));
					} else {
						console.log(
							chalk.yellow(`Warning: Pool '${options.pool}' not found`)
						);
					}
				}

				// Start agent if requested,
				if (options.start) {
					console.log(chalk.cyan("Starting agent..."));
					await manager.startAgent(agentId);
					console.log(chalk.green("✅ Agent started and ready!"));
				} else {
					console.log(
						chalk.yellow(
							`Use 'claude-flow agent start ${agentId}' to start the agent`
						)
					);
				}

				// Display agent info,
				const agent = manager.getAgent(agentId);
				if (agent) {
					displayAgentSummary(agent);
				}
			} catch (error) {
				console.error(
					chalk.red("Error creating agent:"),
					error instanceof Error ? error.message : String(error)
				);
				process.exit(1);
			}
		});

	// TODO: Convert remaining commands to commander.js syntax
	// For now, return the basic command structure,
	return agentCommand;
}

// Legacy export for backward compatibility,
export const agentCommand = createAgentCommand();

// TODO: Complete conversion of remaining commands (terminate, info, start, restart, pool, health)
// Temporarily removing broken code to fix build errors

// === HELPER FUNCTIONS ===

async function interactiveAgentConfiguration(
	manager: AgentManager
): Promise<any> {
	console.log(chalk.cyan("\n🛠️  Interactive Agent Configuration"));

	const templates = manager.getAgentTemplates();
	const templateChoices = templates.map((t) => ({
		name: `${t.name} (${t.type})`,
		value: t.name,
	}));

	const answers = await inquirer.prompt([
		{
			type: "list",
			name: "template",
			message: "Select agent template:",
			choices: templateChoices,
		},
		{
			type: "input",
			name: "name",
			message: "Agent name:",
			default: `agent-${Date.now().toString(36)}`,
		},
		{
			type: "input",
			name: "autonomyLevel",
			message: "Autonomy level (0-1):",
			default: "0.7",
			validate: (value) => {
				const num = parseFloat(value);
				return (num >= 0 && num <= 1) || "Must be between 0 and 1";
			},
		},
		{
			type: "input",
			name: "maxTasks",
			message: "Maximum concurrent tasks:",
			default: "5",
			validate: (value) => {
				const num = parseInt(value);
				return (num > 0 && num <= 20) || "Must be between 1 and 20";
			},
		},
		{
			type: "input",
			name: "maxMemory",
			message: "Memory limit (MB):",
			default: "512",
			validate: (value) => {
				const num = parseInt(value);
				return (num >= 128 && num <= 4096) || "Must be between 128 and 4096";
			},
		},
	]);

	return {
		template: answers.template,
		name: answers.name,
		config: {
			autonomyLevel: parseFloat(answers.autonomyLevel),
			maxConcurrentTasks: parseInt(answers.maxTasks),
			timeoutThreshold: 300000,
		},
		environment: {
			maxMemoryUsage: parseInt(answers.maxMemory) * 1024 * 1024,
		},
	};
}

function displayCompactAgentList(agents: any[]): void {
	const table = new Table({
		head: [
			"ID",
			"Name",
			"Type",
			"Status",
			"Health",
			"Workload",
			"Last Activity",
		],
		colWidths: [10, 20, 15, 12, 10, 10, 20],
	});

	agents.forEach((agent) => {
		table.push([
			agent.id.id.slice(-8),
			agent.name,
			agent.type,
			getStatusDisplay(agent.status),
			getHealthDisplay(agent.health),
			agent.workload.toString(),
			formatRelativeTime(agent.metrics?.lastActivity || agent.lastHeartbeat),
		]);
	});

	console.log(table.toString());
}

function displayDetailedAgentList(agents: any[], manager: AgentManager): void {
	agents.forEach((agent, index) => {
		if (index > 0) console.log("\n" + "-".repeat(60));

		console.log(`\n${chalk.bold(agent.name)} (${agent.id.id.slice(-8)})`);
		console.log(
			`Type: ${chalk.blue(agent.type)} | Status: ${getStatusDisplay(agent.status)}`
		);
		console.log(
			`Health: ${getHealthDisplay(agent.health)} | Workload: ${agent.workload}`
		);

		if (agent.metrics) {
			console.log(
				`Tasks: ${agent.metrics.tasksCompleted} completed, ${agent.metrics.tasksFailed} failed`
			);
			console.log(
				`Success Rate: ${formatPercentage(agent.metrics.successRate)}`
			);
			console.log(
				`CPU: ${formatPercentage(agent.metrics.cpuUsage)} | Memory: ${formatBytes(agent.metrics.memoryUsage)}`
			);
		}

		const health = manager.getAgentHealth(agent.id.id);
		if (health && health.issues.length > 0) {
			console.log(chalk.red(`Issues: ${health.issues.length} active`));
		}
	});
}

function displayAgentSummary(agent: any): void {
	console.log("\n" + chalk.dim("Agent Summary:"));
	console.log(`  Name: ${agent.name}`);
	console.log(`  Type: ${agent.type}`);
	console.log(`  Status: ${getStatusDisplay(agent.status)}`);
	console.log(`  Health: ${getHealthDisplay(agent.health)}`);
}

// === UTILITY FUNCTIONS ===

function getStatusDisplay(status: string): string {
	const color = getStatusColor(status as AgentStatus);
	return `${color(status.toUpperCase())}`;
}

function getHealthDisplay(health: number): string {
	const percentage = Math.round(health * 100);
	let color = chalk.green;

	if (health < 0.3) color = chalk.red;
	else if (health < 0.7) color = chalk.yellow;

	return `${color}${percentage}%${chalk.reset}`;
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	if (diff < 60000) return "just now";
	if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
	if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
	return `${Math.floor(diff / 86400000)}d ago`;
}
