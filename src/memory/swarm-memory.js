/**
 * SwarmMemory - MCP-specific memory persistence extending SharedMemory
 * Provides swarm-specific features like agent coordination, task tracking, and neural patterns
 *
 * @module swarm-memory
 */

import path from "path";
import { debugLogger } from "../utils/debug-logger.js";
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
	constructor(options = {}) {
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
	async initialize() {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"initialize",
			{ swarmId: this.swarmId, directory: this.options.directory },
			"memory-backend",
		);

		await super.initialize();

		// Initialize swarm-specific namespaces
		await this._initializeSwarmNamespaces();

		// Load active agents and tasks into cache
		await this._loadSwarmState();

		this.emit("swarm:initialized", { swarmId: this.swarmId });
		debugLogger.logFunctionExit(
			correlationId,
			{
				swarmId: this.swarmId,
				agentCacheSize: this.agentCache.size,
				taskCacheSize: this.taskCache.size,
			},
			"memory-backend",
		);
	}

	/**
	 * Store agent information
	 */
	async storeAgent(agentId, agentData) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"storeAgent",
			{ agentId, type: agentData.type, status: agentData.status },
			"memory-ops",
		);

		const key = `agent:${agentId}`;
		const enrichedData = {
			...agentData,
			swarmId: this.swarmId,
			lastUpdated: new Date().toISOString(),
		};

		await this.store(key, enrichedData, {
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

		const result = { agentId, stored: true };
		debugLogger.logFunctionExit(correlationId, result, "memory-ops");
		return result;
	}

	/**
	 * Retrieve agent information
	 */
	async getAgent(agentId) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"getAgent",
			{ agentId },
			"memory-ops",
		);

		// Check cache first
		if (this.agentCache.has(agentId)) {
			const cachedAgent = this.agentCache.get(agentId);
			debugLogger.logEvent(
				"SwarmMemory",
				"agent-cache-hit",
				{ agentId },
				"memory-ops",
			);
			debugLogger.logFunctionExit(
				correlationId,
				{ agentId, found: true, source: "cache" },
				"memory-ops",
			);
			return cachedAgent;
		}

		const key = `agent:${agentId}`;
		const agent = await this.retrieve(key, SWARM_NAMESPACES.AGENTS);

		if (agent) {
			this.agentCache.set(agentId, agent);
		}

		debugLogger.logFunctionExit(
			correlationId,
			{ agentId, found: !!agent, source: "database" },
			"memory-ops",
		);
		return agent;
	}

	/**
	 * List all agents in swarm
	 */
	async listAgents(filter = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"listAgents",
			filter,
			"memory-ops",
		);

		const agents = await this.list(SWARM_NAMESPACES.AGENTS, {
			limit: filter.limit || 100,
		});

		const filteredAgents = agents
			.map((entry) => entry.value)
			.filter((agent) => {
				if (filter.type && agent.type !== filter.type) return false;
				if (filter.status && agent.status !== filter.status) return false;
				if (filter.swarmId && agent.swarmId !== filter.swarmId) return false;
				return true;
			});

		debugLogger.logFunctionExit(
			correlationId,
			{ total: agents.length, filtered: filteredAgents.length },
			"memory-ops",
		);
		return filteredAgents;
	}

	/**
	 * Store task information
	 */
	async storeTask(taskId, taskData) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"storeTask",
			{ taskId, status: taskData.status, priority: taskData.priority },
			"memory-ops",
		);

		const key = `task:${taskId}`;
		const enrichedData = {
			...taskData,
			swarmId: this.swarmId,
			createdAt: taskData.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await this.store(key, enrichedData, {
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

		const result = { taskId, stored: true };
		debugLogger.logFunctionExit(correlationId, result, "memory-ops");
		return result;
	}

	/**
	 * Update task status
	 */
	async updateTaskStatus(taskId, status, result = null) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"updateTaskStatus",
			{ taskId, status, hasResult: !!result },
			"memory-ops",
		);

		const task = await this.getTask(taskId);
		if (!task) {
			const error = new Error(`Task ${taskId} not found`);
			debugLogger.logFunctionError(correlationId, error, "memory-ops");
			throw error;
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

		const updateResult = { taskId, status, updated: true };
		debugLogger.logFunctionExit(correlationId, updateResult, "memory-ops");
		return updateResult;
	}

	/**
	 * Get task information
	 */
	async getTask(taskId) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"getTask",
			{ taskId },
			"memory-ops",
		);

		// Check cache first
		if (this.taskCache.has(taskId)) {
			const cachedTask = this.taskCache.get(taskId);
			debugLogger.logEvent(
				"SwarmMemory",
				"task-cache-hit",
				{ taskId },
				"memory-ops",
			);
			debugLogger.logFunctionExit(
				correlationId,
				{ taskId, found: true, source: "cache" },
				"memory-ops",
			);
			return cachedTask;
		}

		const key = `task:${taskId}`;
		const task = await this.retrieve(key, SWARM_NAMESPACES.TASKS);

		if (task) {
			this.taskCache.set(taskId, task);
		}

		debugLogger.logFunctionExit(
			correlationId,
			{ taskId, found: !!task, source: "database" },
			"memory-ops",
		);
		return task;
	}

	/**
	 * Store inter-agent communication
	 */
	async storeCommunication(fromAgent, toAgent, message) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"storeCommunication",
			{ fromAgent, toAgent, messageType: message.type },
			"memory-ops",
		);

		const commId = `comm:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const communication = {
			id: commId,
			fromAgent,
			toAgent,
			message,
			swarmId: this.swarmId,
			timestamp: new Date().toISOString(),
		};

		await this.store(commId, communication, {
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

		const result = { id: commId, stored: true };
		debugLogger.logFunctionExit(correlationId, result, "memory-ops");
		return result;
	}

	/**
	 * Store consensus decision
	 */
	async storeConsensus(consensusId, decision) {
		const key = `consensus:${consensusId}`;
		const consensusData = {
			...decision,
			swarmId: this.swarmId,
			timestamp: new Date().toISOString(),
		};

		await this.store(key, consensusData, {
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
	async storePattern(patternId, pattern) {
		const key = `pattern:${patternId}`;
		const patternData = {
			...pattern,
			swarmId: this.swarmId,
			createdAt: new Date().toISOString(),
			usageCount: 0,
			successRate: 0,
		};

		await this.store(key, patternData, {
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
	async updatePatternMetrics(patternId, success = true) {
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
	async getPattern(patternId) {
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
	async findBestPatterns(context, limit = 5) {
		const patterns = await this.search({
			namespace: SWARM_NAMESPACES.PATTERNS,
			tags: context.tags,
			limit: 100,
		});

		// Score patterns based on success rate and relevance
		const scored = patterns.map((entry) => {
			const pattern = entry.value;
			const score =
				pattern.successRate * 0.7 +
				(pattern.confidence || 0) * 0.2 +
				(pattern.usageCount > 0 ? 0.1 : 0);

			return { ...pattern, score };
		});

		// Sort by score and return top patterns
		return scored.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Store coordination state
	 */
	async storeCoordination(key, state) {
		await this.store(key, state, {
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
	async getCoordination(key) {
		return await this.retrieve(key, SWARM_NAMESPACES.COORDINATION);
	}

	/**
	 * Store performance metrics
	 */
	async storeMetrics(metricsId, metrics) {
		const key = `metrics:${metricsId}`;
		await this.store(key, metrics, {
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
	async cleanupSwarmData(options = {}) {
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
			patterns: patterns.map((p) => p.value),
			statistics: await this.getSwarmStats(),
		};
	}

	/**
	 * Import swarm state
	 */
	async importSwarmState(state) {
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
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"_initializeSwarmNamespaces",
			{ swarmId: this.swarmId },
			"memory-backend",
		);

		// Create swarm metadata
		const key = "swarm:metadata";
		const value = {
			swarmId: this.swarmId,
			createdAt: new Date().toISOString(),
			version: "1.0.0",
			namespaces: Object.values(SWARM_NAMESPACES),
		};
		const options = {
			namespace: "swarm:system",
		};

		debugLogger.logEvent(
			"SwarmMemory",
			"namespace-init",
			{
				swarmId: this.swarmId,
				namespacesCount: Object.keys(SWARM_NAMESPACES).length,
			},
			"memory-backend",
		);

		await super.store(key, value, options);

		debugLogger.logFunctionExit(
			correlationId,
			{
				swarmId: this.swarmId,
				namespacesInitialized: Object.keys(SWARM_NAMESPACES).length,
			},
			"memory-backend",
		);
	}

	async _loadSwarmState() {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"_loadSwarmState",
			{},
			"memory-backend",
		);

		// Load active agents
		const agents = await this.list(SWARM_NAMESPACES.AGENTS, { limit: 100 });
		let activeAgentsLoaded = 0;
		for (const entry of agents) {
			if (entry.value.status === "active" || entry.value.status === "busy") {
				this.agentCache.set(entry.value.id, entry.value);
				activeAgentsLoaded++;
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
		let highConfidencePatternsLoaded = 0;
		for (const entry of patterns) {
			if (entry.value.confidence > 0.7 || entry.value.successRate > 0.8) {
				this.patternCache.set(entry.value.id, entry.value);
				highConfidencePatternsLoaded++;
			}
		}

		debugLogger.logFunctionExit(
			correlationId,
			{
				totalAgents: agents.length,
				activeAgentsLoaded,
				inProgressTasks: tasks.length,
				totalPatterns: patterns.length,
				highConfidencePatternsLoaded,
			},
			"memory-backend",
		);
	}

	async _countNamespace(namespace) {
		const stats = await this.getStats();
		return stats.namespaces[namespace]?.count || 0;
	}

	/**
	 * Interface methods for MemoryCoordinator compatibility
	 */

	// Store with MemoryEntry and context interface - Compatible with SharedMemory
	async store(keyOrEntry, valueOrContext, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"store",
			{ keyOrEntry: typeof keyOrEntry, valueOrContext: typeof valueOrContext },
			"memory-crud",
		);

		// Handle both interfaces: (key, value, options) and (entry, context)
		let key, value, finalOptions;

		if (typeof keyOrEntry === "string") {
			// SharedMemory interface: store(key, value, options)
			key = keyOrEntry;
			value = valueOrContext;
			finalOptions = {
				namespace: options.namespace || "default",
				tags: options.tags || [],
				ttl: options.ttl,
				metadata: {
					...options.metadata,
					swarmId: this.swarmId,
				},
			};
		} else if (keyOrEntry && typeof keyOrEntry === "object") {
			// MemoryEntry interface: store(entry, context)
			const entry = keyOrEntry;
			const context = valueOrContext || {};
			key = entry.key || entry.id;
			value = entry.value || entry;
			finalOptions = {
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
		} else {
			// Invalid input - log and reject
			const error = new Error(
				`Invalid store() parameters: expected (string, any) or (object, object) but got (${typeof keyOrEntry}, ${typeof valueOrContext})`,
			);
			console.error(
				`[SwarmMemory] Invalid store() input: keyOrEntry=${JSON.stringify(keyOrEntry)}, valueOrContext=${JSON.stringify(valueOrContext)}`,
			);
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			throw error;
		}

		// Final validation
		if (!key || key === null || key === undefined) {
			const error = new Error(
				`Store operation failed: key cannot be null or undefined. Got: ${JSON.stringify(key)}`,
			);
			console.error(
				`[SwarmMemory] Invalid key after processing: ${JSON.stringify(key)}`,
			);
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			throw error;
		}

		const result = await super.store(key, value, finalOptions);
		debugLogger.logFunctionExit(
			correlationId,
			{ key, namespace: finalOptions.namespace, success: !!result },
			"memory-crud",
		);
		return result;
	}

	// Retrieve with context interface
	async retrieve(id, context) {
		const correlationId = debugLogger.logFunctionEntry(
			"SwarmMemory",
			"retrieve",
			{ id, namespace: context?.namespace },
			"memory-crud",
		);

		const namespace = context?.namespace || "default";
		const result = await super.retrieve(id, namespace);
		debugLogger.logFunctionExit(
			correlationId,
			{ id, namespace, found: !!result },
			"memory-crud",
		);
		return result;
	}

	// Query with MemoryQuery and context interface
	async query(query, context) {
		const searchOptions = {
			namespace: query?.namespace || context?.namespace || "default",
			tags: query?.tags,
			limit: query?.limit,
		};

		const results = await this.search(searchOptions);
		return results.map((result) => result.value);
	}

	// Synchronize interface
	async synchronize(namespace) {
		// Basic synchronization - can be enhanced
		return {
			synchronized: true,
			namespace,
			timestamp: new Date().toISOString(),
		};
	}

	// Health status interface
	async getHealthStatus() {
		const stats = await this.getSwarmStats();
		return {
			healthy: true,
			agents: stats.swarm?.agents || {},
			tasks: stats.swarm?.tasks || {},
			patterns: stats.swarm?.patterns || {},
			lastSync: new Date().toISOString(),
		};
	}
}

// Export factory function for easy creation
export function createSwarmMemory(options = {}) {
	return new SwarmMemory(options);
}

// Named export for imports (already exported as class above)

// Export for backwards compatibility
export default SwarmMemory;
