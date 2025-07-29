/**
 * Advanced Connection Pool Manager for Language Servers
 */

import { type ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";

export interface ConnectionConfig {
	command: string;
	args: string[];
	maxConnections: number;
	minConnections: number;
	connectionTimeout: number;
	idleTimeout: number;
	maxRetries: number;
	retryDelay: number;
	healthCheckInterval: number;
	enableAutoReconnect: boolean;
	environmentVariables?: Record<string, string>;
}

export interface ConnectionStats {
	active: number;
	idle: number;
	total: number;
	failed: number;
	reconnects: number;
	avgResponseTime: number;
	totalRequests: number;
}

export interface Connection {
	id: string;
	process: ChildProcess;
	isHealthy: boolean;
	isIdle: boolean;
	createdAt: number;
	lastUsed: number;
	requestCount: number;
	avgResponseTime: number;
	retryCount: number;
}

export interface PoolRequest {
	id: string;
	resolve: (connection: Connection) => void;
	reject: (error: Error) => void;
	timestamp: number;
	timeout: NodeJS.Timeout;
}

export class ConnectionPool extends EventEmitter {
	private connections: Map<string, Connection> = new Map();
	private availableConnections: Set<string> = new Set();
	private pendingRequests: Map<string, PoolRequest> = new Map();
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private cleanupInterval: NodeJS.Timeout | null = null;
	private stats: ConnectionStats = {
		active: 0,
		idle: 0,
		total: 0,
		failed: 0,
		reconnects: 0,
		avgResponseTime: 0,
		totalRequests: 0,
	};

	constructor(private config: ConnectionConfig) {
		super();
		this.startHealthCheck();
		this.startCleanup();
		this.initializeMinConnections();
	}

	private async initializeMinConnections(): Promise<void> {
		const promises = Array.from({ length: this.config.minConnections }, () =>
			this.createConnection(),
		);

		try {
			await Promise.all(promises);
		} catch (error) {
			this.emit("initializationError", error);
		}
	}

	private startHealthCheck(): void {
		this.healthCheckInterval = setInterval(() => {
			this.performHealthCheck();
		}, this.config.healthCheckInterval);
	}

	private startCleanup(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupIdleConnections();
		}, this.config.idleTimeout);
	}

	private async createConnection(): Promise<Connection> {
		if (this.connections.size >= this.config.maxConnections) {
			throw new Error("Connection pool is at maximum capacity");
		}

		const id = this.generateId();
		const startTime = performance.now();

		try {
			const childProcess = spawn(this.config.command, this.config.args, {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, ...this.config.environmentVariables },
			});

			const connection: Connection = {
				id,
				process: childProcess,
				isHealthy: false,
				isIdle: true,
				createdAt: Date.now(),
				lastUsed: Date.now(),
				requestCount: 0,
				avgResponseTime: 0,
				retryCount: 0,
			};

			// Setup process event handlers
			this.setupProcessHandlers(connection);

			// Wait for process to be ready
			await this.waitForProcessReady(connection);

			connection.isHealthy = true;
			this.connections.set(id, connection);
			this.availableConnections.add(id);
			this.stats.total++;
			this.stats.idle++;

			const connectionTime = performance.now() - startTime;
			this.emit("connectionCreated", { id, connectionTime });

			return connection;
		} catch (error) {
			this.stats.failed++;
			this.emit("connectionError", { id, error });
			throw error;
		}
	}

	private setupProcessHandlers(connection: Connection): void {
		const { process, id } = connection;

		process.on("error", (error) => {
			connection.isHealthy = false;
			this.emit("connectionError", { id, error });
			this.handleConnectionFailure(connection);
		});

		process.on("exit", (code, signal) => {
			connection.isHealthy = false;
			this.emit("connectionExit", { id, code, signal });
			this.handleConnectionFailure(connection);
		});

		process.on("close", () => {
			connection.isHealthy = false;
			this.removeConnection(id);
		});

		// Setup stdio handlers for LSP communication
		process.stdin?.on("error", (error) => {
			this.emit("stdinError", { id, error });
		});

		process.stdout?.on("error", (error) => {
			this.emit("stdoutError", { id, error });
		});

		process.stderr?.on("error", (error) => {
			this.emit("stderrError", { id, error });
		});
	}

	private async waitForProcessReady(connection: Connection): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Connection timeout"));
			}, this.config.connectionTimeout);

			// For LSP servers, we typically need to wait for the initialize response
			// This is a simplified version - in practice, you'd implement LSP handshake
			const readyCheck = () => {
				if (connection.process.pid) {
					clearTimeout(timeout);
					resolve();
				} else {
					setTimeout(readyCheck, 100);
				}
			};

			readyCheck();
		});
	}

	private handleConnectionFailure(connection: Connection): void {
		const { id } = connection;

		this.availableConnections.delete(id);
		this.updateStats();

		if (
			this.config.enableAutoReconnect &&
			connection.retryCount < this.config.maxRetries
		) {
			setTimeout(() => {
				this.reconnectConnection(connection);
			}, this.config.retryDelay);
		} else {
			this.removeConnection(id);
		}
	}

	private async reconnectConnection(connection: Connection): Promise<void> {
		const { id } = connection;

		try {
			connection.retryCount++;
			this.stats.reconnects++;

			// Clean up old process
			if (connection.process && !connection.process.killed) {
				connection.process.kill();
			}

			// Create new process
			const newProcess = spawn(this.config.command, this.config.args, {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, ...this.config.environmentVariables },
			});

			connection.process = newProcess;
			connection.isHealthy = false;

			this.setupProcessHandlers(connection);
			await this.waitForProcessReady(connection);

			connection.isHealthy = true;
			connection.isIdle = true;
			connection.lastUsed = Date.now();

			this.availableConnections.add(id);
			this.emit("connectionReconnected", { id });
		} catch (error) {
			this.emit("reconnectionError", { id, error });
			this.removeConnection(id);
		}
	}

	private removeConnection(id: string): void {
		const connection = this.connections.get(id);
		if (connection) {
			if (connection.process && !connection.process.killed) {
				connection.process.kill();
			}
			this.connections.delete(id);
			this.availableConnections.delete(id);
			this.stats.total--;
			this.updateStats();
			this.emit("connectionRemoved", { id });
		}
	}

	private performHealthCheck(): void {
		for (const [id, connection] of this.connections) {
			if (!connection.isHealthy) continue;

			// Simple health check - in practice, you'd send a ping/heartbeat
			if (!connection.process.pid || connection.process.killed) {
				connection.isHealthy = false;
				this.handleConnectionFailure(connection);
			}
		}
	}

	private cleanupIdleConnections(): void {
		const now = Date.now();
		const connectionsToRemove: string[] = [];

		for (const [id, connection] of this.connections) {
			if (
				connection.isIdle &&
				now - connection.lastUsed > this.config.idleTimeout &&
				this.connections.size > this.config.minConnections
			) {
				connectionsToRemove.push(id);
			}
		}

		connectionsToRemove.forEach((id) => this.removeConnection(id));
	}

	private updateStats(): void {
		this.stats.active = 0;
		this.stats.idle = 0;

		for (const connection of this.connections.values()) {
			if (connection.isHealthy) {
				if (connection.isIdle) {
					this.stats.idle++;
				} else {
					this.stats.active++;
				}
			}
		}
	}

	async acquire(): Promise<Connection> {
		return new Promise((resolve, reject) => {
			const requestId = this.generateId();

			// Check for available connection
			const availableId = this.availableConnections.values().next().value;
			if (availableId) {
				const connection = this.connections.get(availableId)!;
				this.useConnection(connection);
				resolve(connection);
				return;
			}

			// Try to create new connection if under limit
			if (this.connections.size < this.config.maxConnections) {
				this.createConnection()
					.then((connection) => {
						this.useConnection(connection);
						resolve(connection);
					})
					.catch(reject);
				return;
			}

			// Queue the request
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error("Connection acquire timeout"));
			}, this.config.connectionTimeout);

			this.pendingRequests.set(requestId, {
				id: requestId,
				resolve,
				reject,
				timestamp: Date.now(),
				timeout,
			});
		});
	}

	private useConnection(connection: Connection): void {
		connection.isIdle = false;
		connection.lastUsed = Date.now();
		connection.requestCount++;
		this.availableConnections.delete(connection.id);
		this.updateStats();
		this.emit("connectionAcquired", { id: connection.id });
	}

	release(connection: Connection): void {
		if (!this.connections.has(connection.id)) {
			return; // Connection was already removed
		}

		connection.isIdle = true;
		connection.lastUsed = Date.now();

		// Update response time statistics
		const responseTime = Date.now() - connection.lastUsed;
		connection.avgResponseTime =
			(connection.avgResponseTime * (connection.requestCount - 1) +
				responseTime) /
			connection.requestCount;

		this.stats.totalRequests++;
		this.stats.avgResponseTime =
			(this.stats.avgResponseTime * (this.stats.totalRequests - 1) +
				responseTime) /
			this.stats.totalRequests;

		this.availableConnections.add(connection.id);
		this.updateStats();
		this.emit("connectionReleased", { id: connection.id });

		// Process pending requests
		this.processPendingRequests();
	}

	private processPendingRequests(): void {
		if (
			this.pendingRequests.size === 0 ||
			this.availableConnections.size === 0
		) {
			return;
		}

		const availableId = this.availableConnections.values().next().value;
		if (!availableId) {
			return;
		}
		const connection = this.connections.get(availableId);

		const requestId = this.pendingRequests.keys().next().value;
		if (!requestId) {
			return;
		}
		const request = this.pendingRequests.get(requestId);

		if (!connection || !request) {
			return;
		}

		this.pendingRequests.delete(requestId);
		clearTimeout(request.timeout);

		this.useConnection(connection);
		request.resolve(connection);
	}

	async execute<T>(
		operation: (connection: Connection) => Promise<T>,
	): Promise<T> {
		const connection = await this.acquire();
		try {
			const result = await operation(connection);
			return result;
		} finally {
			this.release(connection);
		}
	}

	getStats(): ConnectionStats {
		this.updateStats();
		return { ...this.stats };
	}

	getConnectionInfo(id: string): Connection | undefined {
		return this.connections.get(id);
	}

	getAllConnections(): Connection[] {
		return Array.from(this.connections.values());
	}

	private generateId(): string {
		return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	async drain(): Promise<void> {
		// Stop accepting new requests
		for (const [id, request] of this.pendingRequests) {
			clearTimeout(request.timeout);
			request.reject(new Error("Connection pool is draining"));
		}
		this.pendingRequests.clear();

		// Wait for active connections to finish
		const activeConnections = Array.from(this.connections.values()).filter(
			(conn) => !conn.isIdle,
		);

		if (activeConnections.length > 0) {
			await new Promise<void>((resolve) => {
				const checkInterval = setInterval(() => {
					const stillActive = Array.from(this.connections.values()).filter(
						(conn) => !conn.isIdle,
					);

					if (stillActive.length === 0) {
						clearInterval(checkInterval);
						resolve();
					}
				}, 100);
			});
		}
	}

	async destroy(): Promise<void> {
		// Clean up intervals
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		// Drain the pool
		await this.drain();

		// Kill all connections
		for (const connection of this.connections.values()) {
			if (connection.process && !connection.process.killed) {
				connection.process.kill();
			}
		}

		this.connections.clear();
		this.availableConnections.clear();
		this.removeAllListeners();
	}
}

// Factory function for creating language server connection pools
export function createConnectionPool(
	serverType: "typescript" | "python" | "rust" | "go" | "java" | "custom",
	customConfig?: Partial<ConnectionConfig>,
): ConnectionPool {
	const baseConfig: ConnectionConfig = {
		command: "",
		args: [],
		maxConnections: 10,
		minConnections: 2,
		connectionTimeout: 10000,
		idleTimeout: 300000, // 5 minutes
		maxRetries: 3,
		retryDelay: 1000,
		healthCheckInterval: 30000, // 30 seconds
		enableAutoReconnect: true,
	};

	let config: ConnectionConfig;

	switch (serverType) {
		case "typescript":
			config = {
				...baseConfig,
				command: "typescript-language-server",
				args: ["--stdio"],
				...customConfig,
			};
			break;
		case "python":
			config = {
				...baseConfig,
				command: "pylsp",
				args: [],
				...customConfig,
			};
			break;
		case "rust":
			config = {
				...baseConfig,
				command: "rust-analyzer",
				args: [],
				...customConfig,
			};
			break;
		case "go":
			config = {
				...baseConfig,
				command: "gopls",
				args: [],
				...customConfig,
			};
			break;
		case "java":
			config = {
				...baseConfig,
				command: "java",
				args: ["-jar", "jdtls.jar"],
				...customConfig,
			};
			break;
		default:
			config = { ...baseConfig, ...customConfig! };
	}

	return new ConnectionPool(config);
}
