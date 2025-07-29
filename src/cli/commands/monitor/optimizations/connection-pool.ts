// ABOUTME: Connection pool implementation that extends the core ConnectionPool for optimization use cases
// ABOUTME: Wrapper around the core connection pool with Claude-specific optimizations

import { EventEmitter } from "events";
import {
	type Connection,
	type ConnectionConfig,
	ConnectionPool,
	type ConnectionStats,
	createConnectionPool,
} from "../core/connection-pool.js";

// Re-export core types for backward compatibility
export type { ConnectionConfig, Connection, ConnectionStats };

export interface PoolConfig extends Partial<ConnectionConfig> {
	min?: number;
	max?: number;
	connectionTimeout?: number;
	idleTimeout?: number;
}

export interface PooledConnection extends Connection {
	acquired?: boolean;
	acquiredAt?: number;
}

/**
 * Claude-specific connection pool that extends the core ConnectionPool
 * with optimization features and monitoring capabilities
 */
export class ClaudeConnectionPool extends EventEmitter {
	private corePool: ConnectionPool;
	private config: PoolConfig;
	private logger: any;

	constructor(config: PoolConfig = {}) {
		super();

		this.config = {
			min: 2,
			max: 10,
			connectionTimeout: 10000,
			idleTimeout: 300000,
			...config,
		};

		// Create core connection pool with converted config
		const coreConfig: ConnectionConfig = {
			command: "node", // Default command, can be overridden
			args: [],
			maxConnections: this.config.max || 10,
			minConnections: this.config.min || 2,
			connectionTimeout: this.config.connectionTimeout || 10000,
			idleTimeout: this.config.idleTimeout || 300000,
			maxRetries: 3,
			retryDelay: 1000,
			healthCheckInterval: 30000,
			enableAutoReconnect: true,
			...config,
		};

		this.corePool = new ConnectionPool(coreConfig);

		// Set up event forwarding
		this.setupEventForwarding();

		// Initialize logger (placeholder)
		this.logger = {
			info: console.log,
			error: console.error,
			warn: console.warn,
			debug: console.debug,
		};
	}

	private setupEventForwarding(): void {
		// Forward events from core pool
		this.corePool.on("connectionCreated", (data) =>
			this.emit("connectionCreated", data),
		);
		this.corePool.on("connectionError", (data) =>
			this.emit("connectionError", data),
		);
		this.corePool.on("connectionExit", (data) =>
			this.emit("connectionExit", data),
		);
		this.corePool.on("connectionReconnected", (data) =>
			this.emit("connectionReconnected", data),
		);
		this.corePool.on("connectionRemoved", (data) =>
			this.emit("connectionRemoved", data),
		);
		this.corePool.on("connectionAcquired", (data) =>
			this.emit("connectionAcquired", data),
		);
		this.corePool.on("connectionReleased", (data) =>
			this.emit("connectionReleased", data),
		);
	}

	async acquire(): Promise<PooledConnection> {
		const connection = await this.corePool.acquire();

		// Add Claude-specific properties
		const pooledConnection: PooledConnection = {
			...connection,
			acquired: true,
			acquiredAt: Date.now(),
		};

		return pooledConnection;
	}

	release(connection: PooledConnection): void {
		// Remove Claude-specific properties before releasing
		const { acquired, acquiredAt, ...coreConnection } = connection;
		this.corePool.release(coreConnection as Connection);
	}

	async execute<T>(
		operation: (connection: PooledConnection) => Promise<T>,
	): Promise<T> {
		const connection = await this.acquire();
		try {
			return await operation(connection);
		} finally {
			this.release(connection);
		}
	}

	getStats(): ConnectionStats {
		return this.corePool.getStats();
	}

	getConnectionInfo(id: string): Connection | undefined {
		return this.corePool.getConnectionInfo(id);
	}

	getAllConnections(): Connection[] {
		return this.corePool.getAllConnections();
	}

	async drain(): Promise<void> {
		await this.corePool.drain();
	}

	async destroy(): Promise<void> {
		await this.corePool.destroy();
		this.removeAllListeners();
	}

	// Backward compatibility methods that delegate to core pool
	getConnectionPoolStats() {
		return this.getStats();
	}

	// Additional optimization methods can be added here
	async optimizeConnections(): Promise<void> {
		// Custom optimization logic specific to Claude operations
		const stats = this.getStats();

		if (stats.idle > stats.active * 2) {
			this.logger.info(
				"High idle connection ratio detected, considering scale down",
			);
			// Could implement auto-scaling logic here
		}

		if (stats.avgResponseTime > 5000) {
			this.logger.warn(
				"High average response time detected, considering pool reset",
			);
			// Could implement performance optimization here
		}
	}

	// Monitor connection health
	async healthCheck(): Promise<boolean> {
		try {
			const stats = this.getStats();
			return stats.total > 0 && stats.failed < stats.total * 0.5;
		} catch {
			return false;
		}
	}
}

// Factory function for backward compatibility
export function createOptimizedConnectionPool(
	config: PoolConfig = {},
): ClaudeConnectionPool {
	return new ClaudeConnectionPool(config);
}

// Re-export for convenience
export { createConnectionPool };
