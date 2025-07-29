/**
 * Enhanced Memory Functions for Comprehensive Swarm Coordination
 * Version 2: Works with both SQLite and in-memory fallback stores
 */

import { debugLogger } from "../cli/utils/utils-debug-logger.js";
import { FallbackMemoryStore } from "./fallback-store.js";

export class EnhancedMemory extends FallbackMemoryStore {
	constructor(options = {}) {
		super(options);
	}

	async initialize() {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"initialize",
			{},
			"memory-backend",
		);

		await super.initialize();

		// If using SQLite, try to apply enhanced schema
		if (!this.isUsingFallback() && this.primaryStore?.db) {
			try {
				const { readFileSync } = await import("fs");
				const schemaPath = new URL("./enhanced-schema.sql", import.meta.url);
				const schema = readFileSync(schemaPath, "utf-8");
				this.primaryStore.db.exec(schema);
				console.error(
					`[${new Date().toISOString()}] INFO [enhanced-memory] Applied enhanced schema to SQLite`,
				);
			} catch (error) {
				console.error(
					`[${new Date().toISOString()}] WARN [enhanced-memory] Could not apply enhanced schema:`,
					error.message,
				);
				debugLogger.logEvent(
					"EnhancedMemory",
					"schema-application-failed",
					{ error: error.message },
					"memory-backend",
				);
			}
		}
		debugLogger.logFunctionExit(
			correlationId,
			{ initialized: true, usingFallback: this.isUsingFallback() },
			"memory-backend",
		);
	}

	// === SESSION MANAGEMENT ===

	async saveSessionState(sessionId, state) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"saveSessionState",
			{ sessionId, userId: state.userId },
			"memory-session",
		);

		const sessionData = {
			sessionId,
			userId: state.userId || process.env.USER,
			projectPath: state.projectPath || process.cwd(),
			activeBranch: state.activeBranch || "main",
			lastActivity: Date.now(),
			state: state.state || "active",
			context: state.context || {},
			environment: state.environment || process.env,
		};

		const result = await this.store(`session:${sessionId}`, sessionData, {
			namespace: "sessions",
			metadata: { type: "session_state" },
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ sessionId, success: !!result },
			"memory-session",
		);
		return result;
	}

	async resumeSession(sessionId) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"resumeSession",
			{ sessionId },
			"memory-session",
		);
		const result = await this.retrieve(`session:${sessionId}`, {
			namespace: "sessions",
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ sessionId, found: !!result },
			"memory-session",
		);
		return result;
	}

	async getActiveSessions() {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"getActiveSessions",
			{},
			"memory-session",
		);
		const sessions = await this.list({ namespace: "sessions", limit: 100 });
		const activeSessions = sessions
			.map((item) => item.value)
			.filter((session) => session.state === "active");
		debugLogger.logFunctionExit(
			correlationId,
			{ total: sessions.length, active: activeSessions.length },
			"memory-session",
		);
		return activeSessions;
	}

	// === WORKFLOW TRACKING ===

	async trackWorkflow(workflowId, data) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"trackWorkflow",
			{ workflowId, status: data.status },
			"memory-ops",
		);

		const workflowData = {
			workflowId,
			name: data.name,
			steps: data.steps || [],
			status: data.status || "pending",
			progress: data.progress || 0,
			startTime: data.startTime || Date.now(),
			endTime: data.endTime,
			results: data.results || {},
		};

		const result = await this.store(`workflow:${workflowId}`, workflowData, {
			namespace: "workflows",
			metadata: { type: "workflow" },
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ workflowId, status: workflowData.status },
			"memory-ops",
		);
		return result;
	}

	async getWorkflowStatus(workflowId) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"getWorkflowStatus",
			{ workflowId },
			"memory-ops",
		);
		const result = await this.retrieve(`workflow:${workflowId}`, {
			namespace: "workflows",
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ workflowId, found: !!result, status: result?.status },
			"memory-ops",
		);
		return result;
	}

	// === METRICS COLLECTION ===

	async recordMetric(metricName, value, metadata = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"recordMetric",
			{ metricName, value },
			"memory-ops",
		);

		const timestamp = Date.now();
		const metricKey = `metric:${metricName}:${timestamp}`;

		const result = await this.store(
			metricKey,
			{
				name: metricName,
				value,
				timestamp,
				metadata,
			},
			{
				namespace: "metrics",
				ttl: 86400, // 24 hours
			},
		);
		debugLogger.logFunctionExit(
			correlationId,
			{ metricName, value, metricKey },
			"memory-ops",
		);
		return result;
	}

	async getMetrics(metricName, timeRange = 3600000) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"getMetrics",
			{ metricName, timeRange },
			"memory-ops",
		);

		// Default 1 hour
		const cutoff = Date.now() - timeRange;
		const metrics = await this.search(`metric:${metricName}`, {
			namespace: "metrics",
			limit: 1000,
		});

		const filteredMetrics = metrics
			.map((item) => item.value)
			.filter((metric) => metric.timestamp >= cutoff)
			.sort((a, b) => a.timestamp - b.timestamp);

		debugLogger.logFunctionExit(
			correlationId,
			{ metricName, count: filteredMetrics.length, timeRange },
			"memory-ops",
		);
		return filteredMetrics;
	}

	// === AGENT COORDINATION ===

	async registerAgent(agentId, config) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"registerAgent",
			{ agentId, type: config.type },
			"memory-ops",
		);

		const agentData = {
			agentId,
			type: config.type,
			capabilities: config.capabilities || [],
			status: "active",
			createdAt: Date.now(),
			lastHeartbeat: Date.now(),
			metrics: {
				tasksCompleted: 0,
				successRate: 1.0,
				avgResponseTime: 0,
			},
		};

		const result = await this.store(`agent:${agentId}`, agentData, {
			namespace: "agents",
			metadata: { type: "agent_registration" },
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ agentId, type: config.type },
			"memory-ops",
		);
		return result;
	}

	async updateAgentStatus(agentId, status, metrics = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"updateAgentStatus",
			{ agentId, status },
			"memory-ops",
		);

		const agent = await this.retrieve(`agent:${agentId}`, {
			namespace: "agents",
		});
		if (!agent) {
			debugLogger.logFunctionExit(
				correlationId,
				{ agentId, found: false },
				"memory-ops",
			);
			return null;
		}

		agent.status = status;
		agent.lastHeartbeat = Date.now();

		if (metrics) {
			Object.assign(agent.metrics, metrics);
		}

		const result = await this.store(`agent:${agentId}`, agent, {
			namespace: "agents",
			metadata: { type: "agent_update" },
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ agentId, status, updated: true },
			"memory-ops",
		);
		return result;
	}

	async getActiveAgents() {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"getActiveAgents",
			{},
			"memory-ops",
		);

		const agents = await this.list({ namespace: "agents", limit: 100 });
		const cutoff = Date.now() - 300000; // 5 minutes

		const activeAgents = agents
			.map((item) => item.value)
			.filter(
				(agent) => agent.lastHeartbeat > cutoff && agent.status === "active",
			);

		debugLogger.logFunctionExit(
			correlationId,
			{ total: agents.length, active: activeAgents.length },
			"memory-ops",
		);
		return activeAgents;
	}

	// === KNOWLEDGE MANAGEMENT ===

	async storeKnowledge(domain, key, value, metadata = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"storeKnowledge",
			{ domain, key },
			"memory-crud",
		);

		const result = await this.store(
			`knowledge:${domain}:${key}`,
			{
				domain,
				key,
				value,
				metadata,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			{
				namespace: "knowledge",
				metadata: { domain },
			},
		);
		debugLogger.logFunctionExit(correlationId, { domain, key }, "memory-crud");
		return result;
	}

	async retrieveKnowledge(domain, key) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"retrieveKnowledge",
			{ domain, key },
			"memory-crud",
		);
		const result = await this.retrieve(`knowledge:${domain}:${key}`, {
			namespace: "knowledge",
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ domain, key, found: !!result },
			"memory-crud",
		);
		return result;
	}

	async searchKnowledge(domain, pattern) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"searchKnowledge",
			{ domain, pattern },
			"memory-crud",
		);

		const results = await this.search(`knowledge:${domain}:${pattern}`, {
			namespace: "knowledge",
			limit: 50,
		});

		const knowledge = results.map((item) => item.value);
		debugLogger.logFunctionExit(
			correlationId,
			{ domain, pattern, count: knowledge.length },
			"memory-crud",
		);
		return knowledge;
	}

	// === LEARNING & ADAPTATION ===

	async recordLearning(agentId, learning) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"recordLearning",
			{ agentId, type: learning.type },
			"memory-ops",
		);

		const learningData = {
			agentId,
			timestamp: Date.now(),
			type: learning.type,
			input: learning.input,
			output: learning.output,
			feedback: learning.feedback,
			improvement: learning.improvement,
		};

		const result = await this.store(
			`learning:${agentId}:${Date.now()}`,
			learningData,
			{
				namespace: "learning",
				ttl: 604800, // 7 days
			},
		);
		debugLogger.logFunctionExit(
			correlationId,
			{ agentId, type: learning.type },
			"memory-ops",
		);
		return result;
	}

	async getLearnings(agentId, limit = 100) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"getLearnings",
			{ agentId, limit },
			"memory-ops",
		);

		const learnings = await this.search(`learning:${agentId}`, {
			namespace: "learning",
			limit,
		});

		const sortedLearnings = learnings
			.map((item) => item.value)
			.sort((a, b) => b.timestamp - a.timestamp);

		debugLogger.logFunctionExit(
			correlationId,
			{ agentId, count: sortedLearnings.length },
			"memory-ops",
		);
		return sortedLearnings;
	}

	// === PERFORMANCE TRACKING ===

	async trackPerformance(operation, duration, success = true, metadata = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"trackPerformance",
			{ operation, duration, success },
			"memory-ops",
		);

		const perfData = {
			operation,
			duration,
			success,
			timestamp: Date.now(),
			metadata,
		};

		// Store individual performance record
		await this.store(`perf:${operation}:${Date.now()}`, perfData, {
			namespace: "performance",
			ttl: 86400, // 24 hours
		});

		// Update aggregated stats
		const statsKey = `stats:${operation}`;
		const stats = (await this.retrieve(statsKey, {
			namespace: "performance",
		})) || {
			count: 0,
			successCount: 0,
			totalDuration: 0,
			avgDuration: 0,
			minDuration: Infinity,
			maxDuration: 0,
		};

		stats.count++;
		if (success) stats.successCount++;
		stats.totalDuration += duration;
		stats.avgDuration = stats.totalDuration / stats.count;
		stats.minDuration = Math.min(stats.minDuration, duration);
		stats.maxDuration = Math.max(stats.maxDuration, duration);
		stats.successRate = stats.successCount / stats.count;

		const result = await this.store(statsKey, stats, {
			namespace: "performance",
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ operation, count: stats.count, successRate: stats.successRate },
			"memory-ops",
		);
		return result;
	}

	async getPerformanceStats(operation) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"getPerformanceStats",
			{ operation },
			"memory-ops",
		);
		const result = await this.retrieve(`stats:${operation}`, {
			namespace: "performance",
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ operation, found: !!result, count: result?.count },
			"memory-ops",
		);
		return result;
	}

	// === COORDINATION CACHE ===

	async cacheCoordination(key, value, ttl = 300) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"cacheCoordination",
			{ key, ttl },
			"memory-ops",
		);

		// 5 minutes default
		const result = await this.store(`cache:${key}`, value, {
			namespace: "coordination",
			ttl,
		});
		debugLogger.logFunctionExit(correlationId, { key, ttl }, "memory-ops");
		return result;
	}

	async getCachedCoordination(key) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"getCachedCoordination",
			{ key },
			"memory-ops",
		);
		const result = await this.retrieve(`cache:${key}`, {
			namespace: "coordination",
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ key, found: !!result },
			"memory-ops",
		);
		return result;
	}

	// === UTILITY METHODS ===

	async cleanupExpired() {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"cleanupExpired",
			{},
			"memory-backend",
		);

		// Base cleanup handles TTL expiration
		const cleaned = await this.cleanup();

		// Additional cleanup for old performance data
		if (!this.isUsingFallback()) {
			// SQLite-specific cleanup can be added here
			debugLogger.logEvent(
				"EnhancedMemory",
				"sqlite-cleanup-available",
				{},
				"memory-backend",
			);
		}

		debugLogger.logFunctionExit(
			correlationId,
			{ cleaned, usingFallback: this.isUsingFallback() },
			"memory-backend",
		);
		return cleaned;
	}

	async exportData(namespace = null) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"exportData",
			{ namespace },
			"memory-backend",
		);

		const namespaces = namespace
			? [namespace]
			: [
					"sessions",
					"workflows",
					"metrics",
					"agents",
					"knowledge",
					"learning",
					"performance",
					"coordination",
				];

		const exportData = {};
		let totalItems = 0;

		for (const ns of namespaces) {
			exportData[ns] = await this.list({ namespace: ns, limit: 10000 });
			totalItems += exportData[ns].length;
		}

		debugLogger.logFunctionExit(
			correlationId,
			{ namespacesExported: namespaces.length, totalItems },
			"memory-backend",
		);
		return exportData;
	}

	async importData(data) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedMemory",
			"importData",
			{ namespacesCount: Object.keys(data).length },
			"memory-backend",
		);

		let totalImported = 0;
		for (const [namespace, items] of Object.entries(data)) {
			for (const item of items) {
				await this.store(item.key, item.value, {
					namespace,
					metadata: item.metadata,
				});
				totalImported++;
			}
		}
		debugLogger.logFunctionExit(
			correlationId,
			{ totalImported },
			"memory-backend",
		);
	}
}

export default EnhancedMemory;
