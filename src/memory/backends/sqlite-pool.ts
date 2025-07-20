import { getErrorMessage as _getErrorMessage } from "../../utils/error-handler.js";
/**
 * SQLite Connection Pool for enhanced database performance
 */

import Database from "better-sqlite3";
import { promises as fs } from "fs";
import path from "path";
import type { ILogger } from "../../core/logger.js";
import { MemoryBackendError } from "../../utils/errors.js";
import type { MemoryEntry, MemoryQuery } from "../../utils/types.js";

export interface ConnectionPoolOptions {
	minConnections: number;
	maxConnections: number;
	idleTimeoutMs: number;
	connectionTimeoutMs: number;
	retryAttempts: number;
	retryDelayMs: number;
}

export interface PooledConnection {
	db: Database.Database;
	inUse: boolean;
	createdAt: number;
	lastUsed: number;
	id: string;
}

export interface PoolMetrics {
	totalConnections: number;
	activeConnections: number;
	idleConnections: number;
	queueSize: number;
	connectionErrors: number;
	queryCount: number;
	averageQueryTime: number;
}

/**
 * SQLite Connection Pool for optimal performance
 */
export class SQLiteConnectionPool {
	private connections: Map<string, PooledConnection> = new Map();
	private connectionQueue: Array<{
		resolve: (connection: PooledConnection) => void;
		reject: (error: Error) => void;
		timestamp: number;
	}> = [];
	private metrics: PoolMetrics = {
		totalConnections: 0,
		activeConnections: 0,
		idleConnections: 0,
		queueSize: 0,
		connectionErrors: 0,
		queryCount: 0,
		averageQueryTime: 0,
	};
	private totalQueryTime = 0;
	private cleanupInterval?: NodeJS.Timeout;

	constructor(
		private dbPath: string,
		private logger: ILogger,
		private options: ConnectionPoolOptions = {
			minConnections: 2,
			maxConnections: 10,
			idleTimeoutMs: 300000, // 5 minutes
			connectionTimeoutMs: 10000, // 10 seconds
			retryAttempts: 3,
			retryDelayMs: 1000,
		}
	) {}

	async initialize(): Promise<void> {
		this.logger.info("Initializing SQLite connection pool", {
			dbPath: this.dbPath,
			options: this.options,
		});

		try {
			// Ensure directory exists
			const dir = path.dirname(this.dbPath);
			await fs.mkdir(dir, { recursive: true });

			// Create minimum connections
			for (let i = 0; i < this.options.minConnections; i++) {
				await this.createConnection();
			}

			// Start cleanup interval
			this.startCleanupInterval();

			this.logger.info("SQLite connection pool initialized", {
				initialConnections: this.options.minConnections,
			});
		} catch (error) {
			throw new MemoryBackendError("Failed to initialize connection pool", {
				error,
			});
		}
	}

	async shutdown(): Promise<void> {
		this.logger.info("Shutting down SQLite connection pool");

		// Stop cleanup interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		// Close all connections
		for (const [id, connection] of this.connections) {
			try {
				connection.db.close();
				this.logger.debug("Closed connection", { id });
			} catch (error) {
				this.logger.warn("Error closing connection", { id, error });
			}
		}

		// Clear data structures
		this.connections.clear();
		this.connectionQueue.length = 0;

		this.logger.info("SQLite connection pool shutdown complete");
	}

	private async createConnection(): Promise<PooledConnection> {
		const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		try {
			const db = new Database(this.dbPath);

			// Configure SQLite for optimal performance and deadlock prevention
			db.pragma("journal_mode = WAL");
			db.pragma("synchronous = NORMAL");
			db.pragma("cache_size = 1000");
			db.pragma("temp_store = memory");
			db.pragma("mmap_size = 268435456"); // 256MB
			db.pragma("busy_timeout = 10000"); // 10 second busy timeout
			db.pragma("wal_autocheckpoint = 1000"); // Checkpoint every 1000 pages
			db.pragma("optimize");

			// Create tables if they don't exist
			this.createTables(db);
			this.createIndexes(db);

			const connection: PooledConnection = {
				db,
				inUse: false,
				createdAt: Date.now(),
				lastUsed: Date.now(),
				id,
			};

			this.connections.set(id, connection);
			this.metrics.totalConnections++;
			this.metrics.idleConnections++;

			this.logger.debug("Created new connection", { id });
			return connection;
		} catch (error) {
			this.metrics.connectionErrors++;
			throw new MemoryBackendError(`Failed to create connection ${id}`, {
				error,
			});
		}
	}

	private createTables(db: Database.Database): void {
		const createTableSQL = `
			CREATE TABLE IF NOT EXISTS memory_entries (
				id TEXT PRIMARY KEY,
				agent_id TEXT NOT NULL,
				session_id TEXT NOT NULL,
				type TEXT NOT NULL,
				content TEXT NOT NULL,
				context TEXT,
				timestamp TEXT NOT NULL,
				tags TEXT,
				version INTEGER DEFAULT 1,
				parent_id TEXT,
				metadata TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`;

		db.exec(createTableSQL);
	}

	private createIndexes(db: Database.Database): void {
		const indexes = [
			"CREATE INDEX IF NOT EXISTS idx_memory_agent_id ON memory_entries(agent_id)",
			"CREATE INDEX IF NOT EXISTS idx_memory_session_id ON memory_entries(session_id)",
			"CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(type)",
			"CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory_entries(timestamp)",
			"CREATE INDEX IF NOT EXISTS idx_memory_parent_id ON memory_entries(parent_id)",
			"CREATE INDEX IF NOT EXISTS idx_memory_tags ON memory_entries(tags)",
		];

		for (const indexSQL of indexes) {
			db.exec(indexSQL);
		}
	}

	async acquireConnection(): Promise<PooledConnection> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new MemoryBackendError("Connection timeout"));
			}, this.options.connectionTimeoutMs);

			this.connectionQueue.push({
				resolve: (connection) => {
					clearTimeout(timeout);
					resolve(connection);
				},
				reject: (error) => {
					clearTimeout(timeout);
					reject(error);
				},
				timestamp: Date.now(),
			});

			this.processConnectionQueue();
		});
	}

	private async processConnectionQueue(): Promise<void> {
		if (this.connectionQueue.length === 0) {
			return;
		}

		// Find available connection
		let availableConnection: PooledConnection | undefined;
		for (const connection of this.connections.values()) {
			if (!connection.inUse) {
				availableConnection = connection;
				break;
			}
		}

		// Create new connection if needed and allowed
		if (
			!availableConnection &&
			this.connections.size < this.options.maxConnections
		) {
			try {
				availableConnection = await this.createConnection();
			} catch (error) {
				const pending = this.connectionQueue.shift();
				if (pending) {
					pending.reject(error as Error);
				}
				return;
			}
		}

		if (availableConnection) {
			availableConnection.inUse = true;
			availableConnection.lastUsed = Date.now();
			this.metrics.activeConnections++;
			this.metrics.idleConnections--;

			const pending = this.connectionQueue.shift();
			if (pending) {
				pending.resolve(availableConnection);
			}
		}

		// Update queue metrics
		this.metrics.queueSize = this.connectionQueue.length;
	}

	releaseConnection(connection: PooledConnection): void {
		if (this.connections.has(connection.id)) {
			connection.inUse = false;
			connection.lastUsed = Date.now();
			this.metrics.activeConnections--;
			this.metrics.idleConnections++;

			// Process any pending requests
			this.processConnectionQueue();
		}
	}

	async executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
		const start = Date.now();
		const connection = await this.acquireConnection();

		try {
			const stmt = connection.db.prepare(query);
			const results = stmt.all(...params) as T[];

			const duration = Date.now() - start;
			this.updateQueryMetrics(duration);

			return results;
		} catch (error) {
			this.metrics.connectionErrors++;
			throw new MemoryBackendError("Query execution failed", { error });
		} finally {
			this.releaseConnection(connection);
		}
	}

	async executeUpdate(
		query: string,
		params: any[] = []
	): Promise<Database.RunResult> {
		const start = Date.now();
		const connection = await this.acquireConnection();

		try {
			const stmt = connection.db.prepare(query);
			const result = stmt.run(...params);

			const duration = Date.now() - start;
			this.updateQueryMetrics(duration);

			return result;
		} catch (error) {
			this.metrics.connectionErrors++;
			throw new MemoryBackendError("Update execution failed", { error });
		} finally {
			this.releaseConnection(connection);
		}
	}

	async executeTransaction<T>(
		operations: (db: Database.Database) => T
	): Promise<T> {
		const start = Date.now();
		const connection = await this.acquireConnection();

		try {
			const transaction = connection.db.transaction(operations);
			const result = transaction(connection.db);

			const duration = Date.now() - start;
			this.updateQueryMetrics(duration);

			return result;
		} catch (error) {
			this.metrics.connectionErrors++;
			throw new MemoryBackendError("Transaction execution failed", { error });
		} finally {
			this.releaseConnection(connection);
		}
	}

	private updateQueryMetrics(duration: number): void {
		this.metrics.queryCount++;
		this.totalQueryTime += duration;
		this.metrics.averageQueryTime =
			this.totalQueryTime / this.metrics.queryCount;
	}

	private startCleanupInterval(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupIdleConnections();
		}, 60000); // Check every minute
	}

	private cleanupIdleConnections(): void {
		const now = Date.now();
		const connectionsToClose: string[] = [];

		for (const [id, connection] of this.connections) {
			if (
				!connection.inUse &&
				now - connection.lastUsed > this.options.idleTimeoutMs &&
				this.connections.size > this.options.minConnections
			) {
				connectionsToClose.push(id);
			}
		}

		for (const id of connectionsToClose) {
			const connection = this.connections.get(id);
			if (connection) {
				try {
					connection.db.close();
					this.connections.delete(id);
					this.metrics.totalConnections--;
					this.metrics.idleConnections--;
					this.logger.debug("Closed idle connection", { id });
				} catch (error) {
					this.logger.warn("Error closing idle connection", { id, error });
				}
			}
		}
	}

	getMetrics(): PoolMetrics {
		return { ...this.metrics };
	}

	getConnectionCount(): number {
		return this.connections.size;
	}

	getActiveConnectionCount(): number {
		return Array.from(this.connections.values()).filter((c) => c.inUse).length;
	}
}
