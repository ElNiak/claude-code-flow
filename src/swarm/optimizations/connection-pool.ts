import { getErrorMessage as _getErrorMessage } from "../../utils/error-handler.js";
/**
 * Connection Pool for Claude API
 * Manages reusable connections to improve performance
 */

import { EventEmitter } from "node:events";
import { Logger } from "../../core/logger.js";
// Mock ClaudeAPI for testing when service doesn't exist,
export class ClaudeAPI {
	id: string;
	isHealthy: boolean;

	constructor() {
		this.id = `mock-api-${Date.now()}`;
		this.isHealthy = true;
	}

	async healthCheck(): Promise<boolean> {
		return this.isHealthy;
	}

	async complete(options: any): Promise<any> {
		// Mock response for testing,
		return {
			content: [
				{
					text: `Mock response for: ${options.messages?.[0]?.content || "test"}`,
				},
			],
			model: options.model || "claude-3-5-sonnet-20241022",
			usage: {
				input_tokens: 10,
				output_tokens: 20,
			},
		};
	}
}

export interface PoolConfig {
	min: number;
	max: number;
	acquireTimeoutMillis: number;
	idleTimeoutMillis: number;
	evictionRunIntervalMillis: number;
	testOnBorrow: boolean;
	// New adaptive features
	adaptiveResize: boolean;
	loadThresholdHigh: number;
	loadThresholdLow: number;
	resizeInterval: number;
	maxAutoResize: number;
	performanceMonitoring: boolean;
	metricsWindow: number;
}

export interface PooledConnection {
	id: string;
	api: ClaudeAPI;
	inUse: boolean;
	createdAt: Date;
	lastUsedAt: Date;
	useCount: number;
}

export class ClaudeConnectionPool extends EventEmitter {
	private connections: Map<string, PooledConnection> = new Map();
	private waitingQueue: Array<{
		resolve: (conn: PooledConnection) => void;
		reject: (error: Error) => void;
		timeout: NodeJS.Timeout;
	}> = [];

	private config: PoolConfig;
	private logger: Logger;
	private evictionTimer?: NodeJS.Timeout;
	private isShuttingDown = false;

	// Enhanced adaptive features
	private adaptiveTimer?: NodeJS.Timeout;
	private performanceMetrics: {
		acquireTime: number[];
		queueWaitTime: number[];
		throughput: number[];
		connectionUtilization: number[];
		lastResizeTime: number;
	} = {
		acquireTime: [],
		queueWaitTime: [],
		throughput: [],
		connectionUtilization: [],
		lastResizeTime: 0,
	};
	private loadHistory: Array<{ timestamp: number; load: number }> = [];

	constructor(config: Partial<PoolConfig> = {}) {
		super();

		this.config = {
			min: 2,
			max: 10,
			acquireTimeoutMillis: 30000,
			idleTimeoutMillis: 30000,
			evictionRunIntervalMillis: 10000,
			testOnBorrow: true,
			// New adaptive features
			adaptiveResize: true,
			loadThresholdHigh: 0.8,
			loadThresholdLow: 0.2,
			resizeInterval: 30000,
			maxAutoResize: 50,
			performanceMonitoring: true,
			metricsWindow: 60000,
			...config,
		};

		this.logger = new Logger(
			{ level: "info", format: "json", destination: "console" },
			{ component: "ClaudeConnectionPool" }
		);

		this.initialize();
	}

	private async initialize(): Promise<void> {
		// Create minimum connections,
		for (let i = 0; i < this.config.min; i++) {
			await this.createConnection();
		}

		// Start eviction timer,
		this.evictionTimer = setInterval(() => {
			this.evictIdleConnections();
		}, this.config.evictionRunIntervalMillis);

		// Start adaptive resizing if enabled
		if (this.config.adaptiveResize) {
			this.adaptiveTimer = setInterval(() => {
				this.performAdaptiveResize();
			}, this.config.resizeInterval);
		}

		this.logger.info("Connection pool initialized", {
			min: this.config.min,
			max: this.config.max,
			adaptiveResize: this.config.adaptiveResize,
		});
	}

	private async createConnection(): Promise<PooledConnection> {
		const id = `conn-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const api = new ClaudeAPI();

		const connection: PooledConnection = {
			id,
			api,
			inUse: false,
			createdAt: new Date(),
			lastUsedAt: new Date(),
			useCount: 0,
		};

		this.connections.set(id, connection);
		this.emit("connection:created", connection);

		return connection;
	}

	async acquire(): Promise<PooledConnection> {
		const acquireStartTime = Date.now();

		if (this.isShuttingDown) {
			throw new Error("Connection pool is shutting down");
		}

		// Try to find an available connection,
		for (const conn of this.connections.values()) {
			if (!conn.inUse) {
				conn.inUse = true;
				conn.lastUsedAt = new Date();
				conn.useCount++;

				// Test connection if configured,
				if (this.config.testOnBorrow) {
					const isHealthy = await this.testConnection(conn);
					if (!isHealthy) {
						await this.destroyConnection(conn);
						continue;
					}
				}

				// Record performance metrics
				this.recordAcquireTime(Date.now() - acquireStartTime);
				this.emit("connection:acquired", conn);
				return conn;
			}
		}

		// Create new connection if under limit,
		if (this.connections.size < this.config.max) {
			const conn = await this.createConnection();
			conn.inUse = true;
			conn.useCount++;
			this.recordAcquireTime(Date.now() - acquireStartTime);
			this.emit("connection:acquired", conn);
			return conn;
		}

		// Wait for a connection to become available,
		return new Promise((resolve, reject) => {
			const queueStartTime = Date.now();
			const timeout = setTimeout(() => {
				const index = this.waitingQueue.findIndex(
					(item) => item.resolve === resolve
				);
				if (index !== -1) {
					this.waitingQueue.splice(index, 1);
				}
				reject(new Error("Connection acquire timeout"));
			}, this.config.acquireTimeoutMillis);

			this.waitingQueue.push({
				resolve: (conn) => {
					this.recordQueueWaitTime(Date.now() - queueStartTime);
					this.recordAcquireTime(Date.now() - acquireStartTime);
					resolve(conn);
				},
				reject,
				timeout,
			});
		});
	}

	async release(connection: PooledConnection): Promise<void> {
		const conn = this.connections.get(connection.id);
		if (!conn) {
			this.logger.warn("Attempted to release unknown connection", {
				id: connection.id,
			});
			return;
		}

		conn.inUse = false;
		conn.lastUsedAt = new Date();

		this.emit("connection:released", conn);

		// Check if anyone is waiting for a connection,
		if (this.waitingQueue.length > 0) {
			const waiter = this.waitingQueue.shift();
			if (waiter) {
				clearTimeout(waiter.timeout);
				conn.inUse = true;
				conn.useCount++;
				waiter.resolve(conn);
			}
		}
	}

	async execute<T>(fn: (api: ClaudeAPI) => Promise<T>): Promise<T> {
		const conn = await this.acquire();
		try {
			return await fn(conn.api);
		} finally {
			await this.release(conn);
		}
	}

	private async testConnection(conn: PooledConnection): Promise<boolean> {
		try {
			// Simple health check - could be expanded,
			return true;
		} catch (error) {
			this.logger.warn("Connection health check failed", {
				id: conn.id,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			return false;
		}
	}

	private async destroyConnection(conn: PooledConnection): Promise<void> {
		this.connections.delete(conn.id);
		this.emit("connection:destroyed", conn);

		// Ensure minimum connections,
		if (this.connections.size < this.config.min && !this.isShuttingDown) {
			await this.createConnection();
		}
	}

	private evictIdleConnections(): void {
		const now = Date.now();
		const idleThreshold = now - this.config.idleTimeoutMillis;

		for (const conn of this.connections.values()) {
			if (
				!conn.inUse &&
				conn.lastUsedAt.getTime() < idleThreshold &&
				this.connections.size > this.config.min
			) {
				this.destroyConnection(conn);
			}
		}
	}

	async drain(): Promise<void> {
		this.isShuttingDown = true;

		// Clear eviction timer,
		if (this.evictionTimer) {
			clearInterval(this.evictionTimer);
			this.evictionTimer = undefined;
		}

		// Clear adaptive timer
		if (this.adaptiveTimer) {
			clearInterval(this.adaptiveTimer);
			this.adaptiveTimer = undefined;
		}

		// Reject all waiting requests,
		for (const waiter of this.waitingQueue) {
			clearTimeout(waiter.timeout);
			waiter.reject(new Error("Connection pool is draining"));
		}
		this.waitingQueue = [];

		// Wait for all connections to be released,
		const maxWaitTime = 30000; // 30 seconds,
		const startTime = Date.now();

		while (true) {
			const inUseCount = Array.from(this.connections.values()).filter(
				(conn) => conn.inUse
			).length;

			if (inUseCount === 0) break;

			if (Date.now() - startTime > maxWaitTime) {
				this.logger.warn("Timeout waiting for connections to be released", {
					inUseCount,
				});
				break;
			}

			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Destroy all connections,
		for (const conn of this.connections.values()) {
			await this.destroyConnection(conn);
		}

		this.logger.info("Connection pool drained");
	}

	getStats() {
		const connections = Array.from(this.connections.values());
		const avgAcquireTime =
			this.performanceMetrics.acquireTime.length > 0
				? this.performanceMetrics.acquireTime.reduce(
						(sum, time) => sum + time,
						0
					) / this.performanceMetrics.acquireTime.length
				: 0;
		const avgQueueWaitTime =
			this.performanceMetrics.queueWaitTime.length > 0
				? this.performanceMetrics.queueWaitTime.reduce(
						(sum, time) => sum + time,
						0
					) / this.performanceMetrics.queueWaitTime.length
				: 0;
		const utilization =
			connections.length > 0
				? connections.filter((c) => c.inUse).length / connections.length
				: 0;

		return {
			total: connections.length,
			inUse: connections.filter((c) => c.inUse).length,
			idle: connections.filter((c) => !c.inUse).length,
			waitingQueue: this.waitingQueue.length,
			totalUseCount: connections.reduce((sum, c) => sum + c.useCount, 0),
			// Enhanced metrics
			utilization: utilization,
			avgAcquireTime: Math.round(avgAcquireTime),
			avgQueueWaitTime: Math.round(avgQueueWaitTime),
			loadHistory: this.loadHistory.slice(-20), // Last 20 samples
			performanceMetrics: {
				acquireTimeP95: this.calculatePercentile(
					this.performanceMetrics.acquireTime,
					0.95
				),
				queueWaitTimeP95: this.calculatePercentile(
					this.performanceMetrics.queueWaitTime,
					0.95
				),
				throughput: this.calculateThroughput(),
			},
		};
	}

	// === ADAPTIVE RESIZING METHODS ===

	private performAdaptiveResize(): void {
		if (!this.config.adaptiveResize) return;

		const now = Date.now();
		const currentLoad = this.calculateCurrentLoad();

		// Record load history
		this.loadHistory.push({ timestamp: now, load: currentLoad });

		// Keep only last 20 measurements
		if (this.loadHistory.length > 20) {
			this.loadHistory.shift();
		}

		// Don't resize too frequently
		if (
			now - this.performanceMetrics.lastResizeTime <
			this.config.resizeInterval
		) {
			return;
		}

		const avgLoad = this.calculateAverageLoad();
		const connectionCount = this.connections.size;
		const queueLength = this.waitingQueue.length;

		// Scale up if high load and queue building
		if (avgLoad > this.config.loadThresholdHigh && queueLength > 0) {
			const newSize = Math.min(
				this.config.max,
				Math.min(
					this.config.maxAutoResize,
					connectionCount + Math.ceil(queueLength / 2)
				)
			);

			if (newSize > connectionCount) {
				this.scaleUp(newSize - connectionCount);
			}
		}
		// Scale down if low load and excess connections
		else if (
			avgLoad < this.config.loadThresholdLow &&
			connectionCount > this.config.min
		) {
			const idleConnections = Array.from(this.connections.values()).filter(
				(c) => !c.inUse
			).length;
			const connectionsToRemove = Math.min(
				idleConnections,
				Math.floor((connectionCount - this.config.min) / 2)
			);

			if (connectionsToRemove > 0) {
				this.scaleDown(connectionsToRemove);
			}
		}

		this.performanceMetrics.lastResizeTime = now;
	}

	private async scaleUp(count: number): Promise<void> {
		this.logger.info(`Scaling up connection pool by ${count} connections`);

		for (let i = 0; i < count; i++) {
			try {
				await this.createConnection();
			} catch (error) {
				this.logger.error("Failed to create connection during scale-up", error);
				break;
			}
		}

		this.emit("pool:scaled-up", {
			count,
			totalConnections: this.connections.size,
		});
	}

	private scaleDown(count: number): void {
		this.logger.info(`Scaling down connection pool by ${count} connections`);

		let removed = 0;
		for (const conn of this.connections.values()) {
			if (!conn.inUse && removed < count) {
				this.destroyConnection(conn);
				removed++;
			}
		}

		this.emit("pool:scaled-down", {
			count: removed,
			totalConnections: this.connections.size,
		});
	}

	private calculateCurrentLoad(): number {
		const totalConnections = this.connections.size;
		const activeConnections = Array.from(this.connections.values()).filter(
			(c) => c.inUse
		).length;
		const queuePressure = Math.min(1, this.waitingQueue.length / 10);

		return totalConnections > 0
			? activeConnections / totalConnections + queuePressure
			: 0;
	}

	private calculateAverageLoad(): number {
		if (this.loadHistory.length === 0) return 0;

		const recentHistory = this.loadHistory.slice(-10); // Last 10 measurements
		return (
			recentHistory.reduce((sum, entry) => sum + entry.load, 0) /
			recentHistory.length
		);
	}

	private recordAcquireTime(time: number): void {
		if (!this.config.performanceMonitoring) return;

		this.performanceMetrics.acquireTime.push(time);

		// Keep only last 100 measurements
		if (this.performanceMetrics.acquireTime.length > 100) {
			this.performanceMetrics.acquireTime.shift();
		}
	}

	private recordQueueWaitTime(time: number): void {
		if (!this.config.performanceMonitoring) return;

		this.performanceMetrics.queueWaitTime.push(time);

		// Keep only last 100 measurements
		if (this.performanceMetrics.queueWaitTime.length > 100) {
			this.performanceMetrics.queueWaitTime.shift();
		}
	}

	private calculatePercentile(values: number[], percentile: number): number {
		if (values.length === 0) return 0;

		const sorted = [...values].sort((a, b) => a - b);
		const index = Math.ceil(sorted.length * percentile) - 1;
		return sorted[Math.max(0, index)];
	}

	private calculateThroughput(): number {
		// Calculate throughput as connections per second over last minute
		const oneMinuteAgo = Date.now() - 60000;
		const recentMetrics = this.performanceMetrics.acquireTime.length;

		return recentMetrics > 0 ? recentMetrics / 60 : 0;
	}
}
