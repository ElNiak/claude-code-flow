/**
 * SwarmMemory - MCP-specific memory persistence extending SharedMemory
 * Provides swarm-specific features like agent coordination, task tracking, and neural patterns
 *
 * @module swarm-memory
 */

import path from "path";
import type { IEventBus, ILogger } from "../cli/shared/types/utils-types.js";
import type { AgentId } from "../swarm/types.js";
import { SharedMemory } from "./shared-memory.js";

/**
 * Swarm-specific namespaces
 */
const SWARM_NAMESPACES = {
	AGENTS: "swarm:agents",
	TASKS: "swarm:tasks",
	COMMUNICATIONS: "swarm:communications",
	CONSENSUS: "swarm:consensus",
	PATTERNS: "swarm:patterns",
	METRICS: "swarm:metrics",
	COORDINATION: "swarm:coordination",
};

/**
 * SwarmMemory class - Extends SharedMemory with MCP features
 */
export class SwarmMemory extends SharedMemory {
	public swarmId: string;
	public mcpMode: boolean;
	public agentCache: Map<string, any>;
	public taskCache: Map<string, any>;
	public patternCache: Map<string, any>;

	constructor(options: any = {}) {
		// Default to .swarm directory for MCP
		super({
			directory: options.directory || ".swarm",
			filename: options.filename || "swarm-memory.db",
			...options,
		});

		this.swarmId = options.swarmId || "default";
		this.mcpMode = options.mcpMode !== false;

		// Additional swarm-specific caches
		this.agentCache = new Map();
		this.taskCache = new Map();
		this.patternCache = new Map();
	}

	/**
	 * Initialize with swarm-specific setup
	 */
	override async initialize() {
		await super.initialize();

		// Initialize swarm-specific namespaces
		await this._initializeSwarmNamespaces();

		// Load active agents and tasks into cache
		await this._loadSwarmState();

		this.emit("swarm:initialized", { swarmId: this.swarmId });
	}

	/**
	 * Store agent information
	 */
	async storeAgent(agentId: string, agentData: any) {
		const key = `agent:${agentId}`;
		const enrichedData = {
			...agentData,
			swarmId: this.swarmId,
			lastUpdated: new Date().toISOString(),
		};

		await super.store(key, enrichedData, {
			namespace: SWARM_NAMESPACES.AGENTS,
			tags: ["agent", agentData.type, agentData.status],
			metadata: {
				swarmId: this.swarmId,
				agentType: agentData.type,
			},
		});

		// Update agent cache
		this.agentCache.set(agentId, enrichedData);

		this.emit("swarm:agentStored", { agentId, type: agentData.type });

		return { agentId, stored: true };
	}

	/**
	 * Retrieve agent information
	 */
	async getAgent(agentId: string) {
		// Check cache first
		if (this.agentCache.has(agentId)) {
			return this.agentCache.get(agentId);
		}

		const key = `agent:${agentId}`;
		const agent = await this.retrieve(key, SWARM_NAMESPACES.AGENTS);

		if (agent) {
			this.agentCache.set(agentId, agent);
		}

		return agent;
	}

	/**
	 * List all agents in swarm
	 */
	async listAgents(filter: any = {}) {
		const agents = await super.list(SWARM_NAMESPACES.AGENTS, {
			limit: filter.limit || 100,
		});

		return agents
			.map((entry: any) => entry.value)
			.filter((agent: any) => {
				if (filter.type && agent.type !== filter.type) return false;
				if (filter.status && agent.status !== filter.status) return false;
				if (filter.swarmId && agent.swarmId !== filter.swarmId) return false;
				return true;
			});
	}

	/**
	 * Store task information
	 */
	async storeTask(taskId: string, taskData: any) {
		const key = `task:${taskId}`;
		const enrichedData = {
			...taskData,
			swarmId: this.swarmId,
			createdAt: taskData.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await super.store(key, enrichedData, {
			namespace: SWARM_NAMESPACES.TASKS,
			tags: ["task", taskData.status, taskData.priority],
			metadata: {
				swarmId: this.swarmId,
				assignedAgents: taskData.assignedAgents || [],
			},
		});

		// Update task cache
		this.taskCache.set(taskId, enrichedData);

		this.emit("swarm:taskStored", { taskId, status: taskData.status });

		return { taskId, stored: true };
	}

	/**
	 * Update task status
	 */
	async updateTaskStatus(taskId: string, status: string, result: any = null) {
		const task = await this.getTask(taskId);
		if (!task) {
			throw new Error(`Task ${taskId} not found`);
		}

		task.status = status;
		task.updatedAt = new Date().toISOString();

		if (result) {
			task.result = result;
		}

		if (status === "completed") {
			task.completedAt = new Date().toISOString();
		}

		await this.storeTask(taskId, task);

		this.emit("swarm:taskStatusUpdated", { taskId, status });

		return { taskId, status, updated: true };
	}

	/**
	 * Get task information
	 */
	async getTask(taskId: string) {
		// Check cache first
		if (this.taskCache.has(taskId)) {
			return this.taskCache.get(taskId);
		}

		const key = `task:${taskId}`;
		const task = await this.retrieve(key, SWARM_NAMESPACES.TASKS);

		if (task) {
			this.taskCache.set(taskId, task);
		}

		return task;
	}

	/**
	 * Store inter-agent communication
	 */
	async storeCommunication(fromAgent: string, toAgent: string, message: any) {
		const commId = `comm:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const communication = {
			id: commId,
			fromAgent,
			toAgent,
			message,
			swarmId: this.swarmId,
			timestamp: new Date().toISOString(),
		};

		await super.store(commId, communication, {
			namespace: SWARM_NAMESPACES.COMMUNICATIONS,
			ttl: 86400, // 24 hours
			tags: ["communication", message.type],
			metadata: {
				fromAgent,
				toAgent,
				messageType: message.type,
			},
		});

		this.emit("swarm:communication", {
			fromAgent,
			toAgent,
			type: message.type,
		});

		return { id: commId, stored: true };
	}

	/**
	 * Store consensus decision
	 */
	async storeConsensus(consensusId: string, decision: any) {
		const key = `consensus:${consensusId}`;
		const consensusData = {
			...decision,
			swarmId: this.swarmId,
			timestamp: new Date().toISOString(),
		};

		await super.store(key, consensusData, {
			namespace: SWARM_NAMESPACES.CONSENSUS,
			tags: ["consensus", decision.status],
			metadata: {
				swarmId: this.swarmId,
				taskId: decision.taskId,
				threshold: decision.threshold,
			},
		});

		this.emit("swarm:consensus", { consensusId, status: decision.status });

		return { consensusId, stored: true };
	}

	/**
	 * Store neural pattern
	 */
	async storePattern(patternId: string, pattern: any) {
		const key = `pattern:${patternId}`;
		const patternData = {
			...pattern,
			swarmId: this.swarmId,
			createdAt: new Date().toISOString(),
			usageCount: 0,
			successRate: 0,
		};

		await super.store(key, patternData, {
			namespace: SWARM_NAMESPACES.PATTERNS,
			tags: ["pattern", pattern.type],
			metadata: {
				swarmId: this.swarmId,
				patternType: pattern.type,
				confidence: pattern.confidence || 0,
			},
		});

		// Cache frequently used patterns
		if (pattern.type === "coordination" || pattern.type === "optimization") {
			this.patternCache.set(patternId, patternData);
		}

		this.emit("swarm:patternStored", { patternId, type: pattern.type });

		return { patternId, stored: true };
	}

	/**
	 * Update pattern usage and success metrics
	 */
	async updatePatternMetrics(patternId: string, success: boolean = true) {
		const pattern = await this.getPattern(patternId);
		if (!pattern) {
			throw new Error(`Pattern ${patternId} not found`);
		}

		pattern.usageCount++;
		pattern.lastUsedAt = new Date().toISOString();

		// Update success rate with exponential moving average
		const alpha = 0.1; // Smoothing factor
		const currentSuccess = success ? 1 : 0;
		pattern.successRate =
			alpha * currentSuccess + (1 - alpha) * (pattern.successRate || 0);

		await this.storePattern(patternId, pattern);

		return {
			patternId,
			usageCount: pattern.usageCount,
			successRate: pattern.successRate,
		};
	}

	/**
	 * Get pattern
	 */
	async getPattern(patternId: string) {
		// Check cache first
		if (this.patternCache.has(patternId)) {
			return this.patternCache.get(patternId);
		}

		const key = `pattern:${patternId}`;
		return await this.retrieve(key, SWARM_NAMESPACES.PATTERNS);
	}

	/**
	 * Find best patterns for a given context
	 */
	async findBestPatterns(context: any, limit: number = 5) {
		const patterns = await this.search({
			namespace: SWARM_NAMESPACES.PATTERNS,
			tags: context.tags,
			limit: 100,
		});

		// Score patterns based on success rate and relevance
		const scored = patterns.map((entry: any) => {
			const pattern = entry.value;
			const score =
				pattern.successRate * 0.7 +
				(pattern.confidence || 0) * 0.2 +
				(pattern.usageCount > 0 ? 0.1 : 0);

			return { ...pattern, score };
		});

		// Sort by score and return top patterns
		return scored.sort((a: any, b: any) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Store coordination state
	 */
	async storeCoordination(key: string, state: any) {
		await super.store(key, state, {
			namespace: SWARM_NAMESPACES.COORDINATION,
			ttl: 3600, // 1 hour
			metadata: {
				swarmId: this.swarmId,
				timestamp: new Date().toISOString(),
			},
		});

		return { key, stored: true };
	}

	/**
	 * Get coordination state
	 */
	async getCoordination(key: string) {
		return await this.retrieve(key, SWARM_NAMESPACES.COORDINATION);
	}

	/**
	 * Store performance metrics
	 */
	async storeMetrics(metricsId: string, metrics: any) {
		const key = `metrics:${metricsId}`;
		await super.store(key, metrics, {
			namespace: SWARM_NAMESPACES.METRICS,
			ttl: 86400 * 7, // 7 days
			tags: ["metrics", metrics.type],
			metadata: {
				swarmId: this.swarmId,
				agentId: metrics.agentId,
				timestamp: new Date().toISOString(),
			},
		});

		this.emit("swarm:metricsStored", { metricsId, type: metrics.type });

		return { metricsId, stored: true };
	}

	/**
	 * Get swarm statistics
	 */
	async getSwarmStats() {
		const baseStats = await this.getStats();

		// Add swarm-specific stats
		const agentCount = await this._countNamespace(SWARM_NAMESPACES.AGENTS);
		const taskCount = await this._countNamespace(SWARM_NAMESPACES.TASKS);
		const patternCount = await this._countNamespace(SWARM_NAMESPACES.PATTERNS);

		// Get active agents
		const activeAgents = Array.from(this.agentCache.values()).filter(
			(agent) => agent.status === "active" || agent.status === "busy",
		).length;

		// Get task statistics
		const tasks = Array.from(this.taskCache.values());
		const taskStats = {
			total: tasks.length,
			pending: tasks.filter((t) => t.status === "pending").length,
			inProgress: tasks.filter((t) => t.status === "in_progress").length,
			completed: tasks.filter((t) => t.status === "completed").length,
			failed: tasks.filter((t) => t.status === "failed").length,
		};

		return {
			...baseStats,
			swarm: {
				swarmId: this.swarmId,
				agents: {
					total: agentCount,
					active: activeAgents,
					cached: this.agentCache.size,
				},
				tasks: taskStats,
				patterns: {
					total: patternCount,
					cached: this.patternCache.size,
				},
				namespaces: Object.values(SWARM_NAMESPACES),
			},
		};
	}

	/**
	 * Clean up old swarm data
	 */
	async cleanupSwarmData(options: any = {}) {
		const {
			maxAge = 86400 * 7, // 7 days
			keepPatterns = true,
			keepConsensus = true,
		} = options;

		const cutoffTime = Date.now() - maxAge * 1000;
		let cleaned = 0;

		// Clean old communications
		const comms = await this.list(SWARM_NAMESPACES.COMMUNICATIONS);
		for (const comm of comms) {
			if (new Date(comm.value.timestamp).getTime() < cutoffTime) {
				await this.delete(comm.key, SWARM_NAMESPACES.COMMUNICATIONS);
				cleaned++;
			}
		}

		// Clean completed tasks
		const tasks = await this.list(SWARM_NAMESPACES.TASKS);
		for (const task of tasks) {
			if (
				task.value.status === "completed" &&
				new Date(task.value.completedAt).getTime() < cutoffTime
			) {
				await this.delete(task.key, SWARM_NAMESPACES.TASKS);
				this.taskCache.delete(task.value.id);
				cleaned++;
			}
		}

		// Clean old metrics
		const metrics = await this.list(SWARM_NAMESPACES.METRICS);
		for (const metric of metrics) {
			if (new Date(metric.createdAt).getTime() < cutoffTime) {
				await this.delete(metric.key, SWARM_NAMESPACES.METRICS);
				cleaned++;
			}
		}

		this.emit("swarm:cleanup", { cleaned, maxAge });

		return { cleaned };
	}

	/**
	 * Export swarm state
	 */
	async exportSwarmState() {
		const agents = await this.listAgents();
		const tasks = Array.from(this.taskCache.values());
		const patterns = await this.list(SWARM_NAMESPACES.PATTERNS);

		return {
			swarmId: this.swarmId,
			exportedAt: new Date().toISOString(),
			agents: agents,
			tasks: tasks,
			patterns: patterns.map((p: any) => p.value),
			statistics: await this.getSwarmStats(),
		};
	}

	/**
	 * Import swarm state
	 */
	async importSwarmState(state: any) {
		const imported = {
			agents: 0,
			tasks: 0,
			patterns: 0,
		};

		// Import agents
		if (state.agents) {
			for (const agent of state.agents) {
				await this.storeAgent(agent.id, agent);
				imported.agents++;
			}
		}

		// Import tasks
		if (state.tasks) {
			for (const task of state.tasks) {
				await this.storeTask(task.id, task);
				imported.tasks++;
			}
		}

		// Import patterns
		if (state.patterns) {
			for (const pattern of state.patterns) {
				await this.storePattern(pattern.id, pattern);
				imported.patterns++;
			}
		}

		this.emit("swarm:imported", imported);

		return imported;
	}

	/**
	 * Private helper methods
	 */

	async _initializeSwarmNamespaces() {
		// Create swarm metadata
		await super.store(
			"swarm:metadata",
			{
				swarmId: this.swarmId,
				createdAt: new Date().toISOString(),
				version: "1.0.0",
				namespaces: Object.values(SWARM_NAMESPACES),
			},
			{
				namespace: "swarm:system",
			},
		);
	}

	async _loadSwarmState() {
		// Load active agents
		const agents = await this.list(SWARM_NAMESPACES.AGENTS, { limit: 100 });
		for (const entry of agents) {
			if (entry.value.status === "active" || entry.value.status === "busy") {
				this.agentCache.set(entry.value.id, entry.value);
			}
		}

		// Load in-progress tasks
		const tasks = await this.search({
			namespace: SWARM_NAMESPACES.TASKS,
			tags: ["in_progress"],
			limit: 100,
		});
		for (const entry of tasks) {
			this.taskCache.set(entry.value.id, entry.value);
		}

		// Load high-confidence patterns
		const patterns = await this.list(SWARM_NAMESPACES.PATTERNS, { limit: 50 });
		for (const entry of patterns) {
			if (entry.value.confidence > 0.7 || entry.value.successRate > 0.8) {
				this.patternCache.set(entry.value.id, entry.value);
			}
		}
	}

	async _countNamespace(namespace: string) {
		const stats = await this.getStats();
		return (stats.namespaces as any)[namespace]?.count || 0;
	}

	/**
	 * Interface methods for MemoryCoordinator compatibility
	 */

	// Store with MemoryEntry and context interface
	override async store(entry: any, context?: any): Promise<any> {
		const options = {
			namespace: context?.namespace || "default",
			tags: entry?.tags || [],
			ttl: context?.ttl,
			metadata: {
				...context?.metadata,
				agentId: context?.agentId,
				sessionId: context?.sessionId,
				swarmId: context?.swarmId || this.swarmId,
			},
		};

		return await super.store(
			entry.key || entry.id,
			entry.value || entry,
			options,
		);
	}

	// Retrieve with context interface
	override async retrieve(id: string, context?: any): Promise<any> {
		const namespace = context?.namespace || "default";
		return await super.retrieve(id, namespace);
	}

	// Query with MemoryQuery and context interface
	async query(query: any, context?: any): Promise<any[]> {
		const searchOptions = {
			namespace: query?.namespace || context?.namespace || "default",
			tags: query?.tags,
			limit: query?.limit,
		};

		const results = await super.search(searchOptions);
		return results.map((result: any) => result.value);
	}

	// Synchronize interface
	async synchronize(namespace?: string): Promise<any> {
		// Basic synchronization - can be enhanced
		return {
			synchronized: true,
			namespace,
			timestamp: new Date().toISOString(),
		};
	}

	// Health status interface
	async getHealthStatus(): Promise<any> {
		const stats = await this.getSwarmStats();
		return {
			healthy: true,
			agents: stats.swarm?.agents || {},
			tasks: stats.swarm?.tasks || {},
			patterns: stats.swarm?.patterns || {},
			lastSync: new Date().toISOString(),
		};
	}

	// Shutdown method for cleanup
	async shutdown(): Promise<void> {
		// Clear caches
		this.agentCache.clear();
		this.taskCache.clear();
		this.patternCache.clear();

		// Call parent shutdown if available
		// Note: SharedMemory may not have a shutdown method, so we handle it gracefully
		const parentShutdown = (this as any).__proto__.__proto__.shutdown;
		if (typeof parentShutdown === "function") {
			await parentShutdown.call(this);
		}
	}
}

// Export factory function for easy creation
export function createSwarmMemory(options: any = {}): SwarmMemory {
	return new SwarmMemory(options);
}

// Export for backwards compatibility
export { SwarmMemory as SwarmMemoryManager };
export default SwarmMemory;
