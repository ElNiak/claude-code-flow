/**
 * SharedMemory - Unified memory persistence module for ruv-swarm
 * Supports both .swarm/ and .hive-mind/ directories with SQLite backend
 *
 * @module shared-memory
 */

import Database from "better-sqlite3";
import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";
import { performance } from "perf_hooks";
import { debugLogger } from "../utils/debug-logger.js";
import { registerCleanupResource } from "../utils/graceful-exit.js";

/**
 * Migration definitions for schema evolution
 */
const MIGRATIONS = [
	{
		version: 1,
		description: "Initial schema",
		sql: `
      -- Memory store table
      CREATE TABLE IF NOT EXISTS memory_store (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        namespace TEXT NOT NULL DEFAULT 'default',
        value TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'json',
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        accessed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        access_count INTEGER NOT NULL DEFAULT 0,
        ttl INTEGER,
        expires_at INTEGER,
        compressed INTEGER DEFAULT 0,
        size INTEGER NOT NULL DEFAULT 0,
        UNIQUE(key, namespace)
      );

      -- Metadata table for system information
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Migrations tracking table
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory_store(namespace);
      CREATE INDEX IF NOT EXISTS idx_memory_expires ON memory_store(expires_at) WHERE expires_at IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_memory_accessed ON memory_store(accessed_at);
      CREATE INDEX IF NOT EXISTS idx_memory_key_namespace ON memory_store(key, namespace);

      -- Insert initial metadata
      INSERT OR IGNORE INTO metadata (key, value) VALUES
        ('version', '1.0.0'),
        ('created_at', strftime('%s', 'now'));
    `,
	},
	{
		version: 2,
		description: "Add tags and search capabilities",
		sql: `
      -- Add tags column
      ALTER TABLE memory_store ADD COLUMN tags TEXT;

      -- Create tags index for faster searching
      CREATE INDEX IF NOT EXISTS idx_memory_tags ON memory_store(tags) WHERE tags IS NOT NULL;

      -- Update version
      UPDATE metadata SET value = '1.1.0', updated_at = strftime('%s', 'now') WHERE key = 'version';
    `,
	},
];

/**
 * High-performance LRU cache implementation
 */
class LRUCache {
	constructor(maxSize = 1000, maxMemoryMB = 50) {
		this.maxSize = maxSize;
		this.maxMemory = maxMemoryMB * 1024 * 1024;
		this.cache = new Map();
		this.currentMemory = 0;
		this.hits = 0;
		this.misses = 0;
		this.evictions = 0;
	}

	get(key) {
		if (this.cache.has(key)) {
			const value = this.cache.get(key);
			// Move to end (most recently used)
			this.cache.delete(key);
			this.cache.set(key, value);
			this.hits++;
			return value.data;
		}
		this.misses++;
		return null;
	}

	set(key, data, size = 0) {
		// Estimate size if not provided
		if (!size) {
			size = this._estimateSize(data);
		}

		// Handle memory pressure
		while (this.currentMemory + size > this.maxMemory && this.cache.size > 0) {
			this._evictLRU();
		}

		// Handle size limit
		while (this.cache.size >= this.maxSize) {
			this._evictLRU();
		}

		this.cache.set(key, { data, size, timestamp: Date.now() });
		this.currentMemory += size;
	}

	delete(key) {
		const entry = this.cache.get(key);
		if (entry) {
			this.currentMemory -= entry.size;
			return this.cache.delete(key);
		}
		return false;
	}

	clear() {
		this.cache.clear();
		this.currentMemory = 0;
		this.hits = 0;
		this.misses = 0;
		this.evictions = 0;
	}

	getStats() {
		const total = this.hits + this.misses;
		return {
			size: this.cache.size,
			memoryUsage: this.currentMemory,
			memoryUsageMB: this.currentMemory / (1024 * 1024),
			hitRate: total > 0 ? (this.hits / total) * 100 : 0,
			evictions: this.evictions,
			utilizationPercent: (this.currentMemory / this.maxMemory) * 100,
		};
	}

	_estimateSize(data) {
		try {
			return JSON.stringify(data).length * 2; // UTF-16 estimate
		} catch {
			return 1000; // Default for non-serializable
		}
	}

	_evictLRU() {
		const firstKey = this.cache.keys().next().value;
		if (firstKey !== undefined) {
			const entry = this.cache.get(firstKey);
			this.cache.delete(firstKey);
			this.currentMemory -= entry.size;
			this.evictions++;
		}
	}
}

/**
 * SharedMemory class - Core implementation
 */
export class SharedMemory extends EventEmitter {
	constructor(options = {}) {
		super();

		this.options = {
			directory: options.directory || ".hive-mind",
			filename: options.filename || "memory.db",
			cacheSize: options.cacheSize || 1000,
			cacheMemoryMB: options.cacheMemoryMB || 50,
			compressionThreshold: options.compressionThreshold || 10240, // 10KB
			gcInterval: options.gcInterval || 300000, // 5 minutes
			enableWAL: options.enableWAL !== false,
			enableVacuum: options.enableVacuum !== false,
			...options,
		};

		/** @type {import('better-sqlite3').Database | null} */
		this.db = null;
		this.cache = new LRUCache(
			this.options.cacheSize,
			this.options.cacheMemoryMB,
		);
		this.statements = new Map();
		this.gcTimer = null;
		this.isInitialized = false;

		// Performance tracking
		this.metrics = {
			operations: new Map(),
			lastGC: Date.now(),
			totalOperations: 0,
		};
	}

	/**
	 * Initialize the database and run migrations
	 */
	async initialize() {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"initialize",
			{ isInitialized: this.isInitialized, directory: this.options.directory },
			"memory-backend",
		);

		if (this.isInitialized) {
			debugLogger.logFunctionExit(
				correlationId,
				{ alreadyInitialized: true },
				"memory-backend",
			);
			return;
		}

		const startTime = performance.now();

		try {
			// Ensure directory exists
			await fs.mkdir(path.join(process.cwd(), this.options.directory), {
				recursive: true,
			});

			// Get database path
			const dbPath = path.join(
				process.cwd(),
				this.options.directory,
				this.options.filename,
			);

			// Clean up any stale WAL files before opening database
			await this._cleanupStaleWALFiles(dbPath);

			// Open database
			this.db = new Database(dbPath);

			// Configure for performance
			this._configureDatabase();

			// Run migrations
			await this._runMigrations();

			// Prepare statements
			this._prepareStatements();

			// Start garbage collection
			this._startGarbageCollection();

			// Register database cleanup with graceful exit system
			this._registerGracefulCleanup();

			this.isInitialized = true;

			const duration = performance.now() - startTime;
			this._recordMetric("initialize", duration);

			this.emit("initialized", { dbPath, duration });
			debugLogger.logFunctionExit(
				correlationId,
				{ initialized: true, dbPath, duration },
				"memory-backend",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-backend");
			this.emit("error", error);
			throw new Error(`Failed to initialize SharedMemory: ${error.message}`);
		}
	}

	/**
	 * Store a value in memory
	 */
	async store(key, value, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"store",
			{
				key,
				keyType: typeof key,
				namespace: options.namespace,
				ttl: options.ttl,
			},
			"memory-crud",
		);

		this._ensureInitialized();

		const startTime = performance.now();

		try {
			const namespace = options.namespace || "default";
			const ttl = options.ttl;
			const tags = options.tags ? JSON.stringify(options.tags) : null;
			const metadata = options.metadata
				? JSON.stringify(options.metadata)
				: null;

			// Serialize value
			let serialized = value;
			let type = "string";
			let compressed = 0;

			if (typeof value !== "string") {
				serialized = JSON.stringify(value);
				type = "json";
			}

			const size = Buffer.byteLength(serialized);

			// Compress if needed
			if (size > this.options.compressionThreshold) {
				// In production, use proper compression
				compressed = 1;
			}

			// Calculate expiry
			const expiresAt = ttl ? Math.floor(Date.now() / 1000) + ttl : null;

			debugLogger.logEvent(
				"SharedMemory",
				"pre-sql-execution",
				{ key, namespace, type, size, compressed, expiresAt },
				"memory-crud",
			);

			// Store in database
			this.statements
				.get("upsert")
				.run(
					key,
					namespace,
					serialized,
					type,
					metadata,
					tags,
					ttl,
					expiresAt,
					compressed,
					size,
				);

			// Update cache
			const cacheKey = this._getCacheKey(key, namespace);
			this.cache.set(cacheKey, value, size);

			const duration = performance.now() - startTime;
			this._recordMetric("store", duration);

			this.emit("stored", { key, namespace, size, compressed: !!compressed });

			const result = { success: true, key, namespace, size };
			debugLogger.logFunctionExit(correlationId, result, "memory-crud");
			return result;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Retrieve a value from memory
	 */
	async retrieve(key, namespace = "default") {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"retrieve",
			{ key, namespace },
			"memory-crud",
		);

		this._ensureInitialized();

		const startTime = performance.now();

		try {
			// Check cache first
			const cacheKey = this._getCacheKey(key, namespace);
			const cached = this.cache.get(cacheKey);

			if (cached !== null) {
				this._recordMetric("retrieve_cache", performance.now() - startTime);
				debugLogger.logEvent(
					"SharedMemory",
					"cache-hit",
					{ key, namespace },
					"memory-crud",
				);
				debugLogger.logFunctionExit(
					correlationId,
					{ found: true, source: "cache" },
					"memory-crud",
				);
				return cached;
			}

			// Get from database
			const row = this.statements.get("select").get(key, namespace);

			if (!row) {
				this._recordMetric("retrieve_miss", performance.now() - startTime);
				debugLogger.logEvent(
					"SharedMemory",
					"retrieve-miss",
					{ key, namespace },
					"memory-crud",
				);
				debugLogger.logFunctionExit(
					correlationId,
					{ found: false },
					"memory-crud",
				);
				return null;
			}

			// Check expiry
			if (row.expires_at && row.expires_at < Math.floor(Date.now() / 1000)) {
				// Delete expired entry
				this.statements.get("delete").run(key, namespace);
				this._recordMetric("retrieve_expired", performance.now() - startTime);
				debugLogger.logEvent(
					"SharedMemory",
					"entry-expired",
					{ key, namespace, expiresAt: row.expires_at },
					"memory-crud",
				);
				debugLogger.logFunctionExit(
					correlationId,
					{ found: false, reason: "expired" },
					"memory-crud",
				);
				return null;
			}

			// Update access stats
			this.statements.get("updateAccess").run(key, namespace);

			// Deserialize value
			let value = row.value;
			if (row.type === "json") {
				value = JSON.parse(value);
			}

			// Update cache
			this.cache.set(cacheKey, value, row.size);

			const duration = performance.now() - startTime;
			this._recordMetric("retrieve_db", duration);

			debugLogger.logFunctionExit(
				correlationId,
				{ found: true, type: row.type, size: row.size },
				"memory-crud",
			);
			return value;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * List entries in a namespace
	 */
	async list(namespace = "default", options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"list",
			{ namespace, limit: options.limit, offset: options.offset },
			"memory-crud",
		);

		this._ensureInitialized();

		const limit = options.limit || 100;
		const offset = options.offset || 0;

		try {
			const rows = this.statements.get("list").all(namespace, limit, offset);

			const result = rows.map((row) => ({
				key: row.key,
				namespace: row.namespace,
				type: row.type,
				size: row.size,
				compressed: !!row.compressed,
				tags: row.tags ? JSON.parse(row.tags) : [],
				createdAt: new Date(row.created_at * 1000),
				updatedAt: new Date(row.updated_at * 1000),
				accessedAt: new Date(row.accessed_at * 1000),
				accessCount: row.access_count,
				expiresAt: row.expires_at ? new Date(row.expires_at * 1000) : null,
			}));
			debugLogger.logFunctionExit(
				correlationId,
				{ count: result.length },
				"memory-crud",
			);
			return result;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Delete an entry
	 */
	async delete(key, namespace = "default") {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"delete",
			{ key, namespace },
			"memory-crud",
		);

		this._ensureInitialized();

		try {
			// Remove from cache
			const cacheKey = this._getCacheKey(key, namespace);
			this.cache.delete(cacheKey);

			// Remove from database
			const result = this.statements.get("delete").run(key, namespace);

			const deleted = result.changes > 0;
			if (deleted) {
				this.emit("deleted", { key, namespace });
			}
			debugLogger.logFunctionExit(
				correlationId,
				{ deleted, changes: result.changes },
				"memory-crud",
			);
			return deleted;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Clear all entries in a namespace
	 */
	async clear(namespace = "default") {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"clear",
			{ namespace },
			"memory-crud",
		);

		this._ensureInitialized();

		try {
			// Clear cache entries for namespace
			for (const [key] of this.cache.cache) {
				if (key.startsWith(`${namespace}:`)) {
					this.cache.delete(key);
				}
			}

			// Clear database entries
			const result = this.statements.get("clearNamespace").run(namespace);

			this.emit("cleared", { namespace, count: result.changes });

			const clearResult = { cleared: result.changes };
			debugLogger.logFunctionExit(correlationId, clearResult, "memory-crud");
			return clearResult;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Get statistics
	 */
	async getStats() {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"getStats",
			{},
			"memory-ops",
		);

		this._ensureInitialized();

		try {
			const dbStats = this.statements.get("stats").all();
			const cacheStats = this.cache.getStats();

			// Transform database stats
			const namespaceStats = {};
			for (const row of dbStats) {
				namespaceStats[row.namespace] = {
					count: row.count,
					totalSize: row.total_size,
					avgSize: row.avg_size,
					compressed: row.compressed_count,
				};
			}

			const stats = {
				namespaces: namespaceStats,
				cache: cacheStats,
				metrics: this._getMetricsSummary(),
				database: {
					totalEntries: Object.values(namespaceStats).reduce(
						(sum, ns) => sum + ns.count,
						0,
					),
					totalSize: Object.values(namespaceStats).reduce(
						(sum, ns) => sum + ns.totalSize,
						0,
					),
				},
			};
			debugLogger.logFunctionExit(
				correlationId,
				{
					namespaceCount: Object.keys(namespaceStats).length,
					totalEntries: stats.database.totalEntries,
				},
				"memory-ops",
			);
			return stats;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-ops");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Search entries by pattern or tags
	 */
	async search(options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"search",
			options,
			"memory-crud",
		);

		this._ensureInitialized();

		const { pattern, namespace, tags, limit = 50, offset = 0 } = options;

		try {
			let query = "SELECT * FROM memory_store WHERE 1=1";
			const params = [];

			if (namespace) {
				query += " AND namespace = ?";
				params.push(namespace);
			}

			if (pattern) {
				query += " AND key LIKE ?";
				params.push(`%${pattern}%`);
			}

			if (tags && tags.length > 0) {
				// Simple tag search - in production, use JSON functions
				query += " AND tags IS NOT NULL";
			}

			query += " ORDER BY accessed_at DESC LIMIT ? OFFSET ?";
			params.push(limit, offset);

			const stmt = this.db.prepare(query);
			const rows = stmt.all(...params);

			const result = rows.map((row) => ({
				key: row.key,
				namespace: row.namespace,
				value: row.type === "json" ? JSON.parse(row.value) : row.value,
				metadata: row.metadata ? JSON.parse(row.metadata) : null,
				tags: row.tags ? JSON.parse(row.tags) : [],
			}));
			debugLogger.logFunctionExit(
				correlationId,
				{ count: result.length, pattern, namespace },
				"memory-crud",
			);
			return result;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-crud");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Backup the database
	 */
	async backup(filepath) {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"backup",
			{ filepath },
			"memory-backend",
		);

		this._ensureInitialized();

		try {
			await this.db.backup(filepath);
			this.emit("backup", { filepath });
			const result = { success: true, filepath };
			debugLogger.logFunctionExit(correlationId, result, "memory-backend");
			return result;
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-backend");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Close the database connection with proper WAL cleanup
	 */
	async close() {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"close",
			{ isInitialized: this.isInitialized },
			"memory-backend",
		);

		if (!this.isInitialized) {
			debugLogger.logFunctionExit(
				correlationId,
				{ alreadyClosed: true },
				"memory-backend",
			);
			return;
		}

		try {
			// Stop garbage collection
			if (this.gcTimer) {
				clearInterval(this.gcTimer);
				this.gcTimer = null;
			}

			// Final optimization
			if (this.options.enableVacuum) {
				this.db.pragma("optimize");
			}

			// Critical: Force WAL checkpoint before closing to prevent corruption
			if (this.options.enableWAL) {
				try {
					// Force a full checkpoint to merge WAL into main database
					this.db.pragma("wal_checkpoint(FULL)");

					// Truncate WAL file to remove it completely
					this.db.pragma("wal_checkpoint(TRUNCATE)");

					console.log("✅ SQLite WAL files successfully cleaned up");
				} catch (walError) {
					console.warn("⚠️ WAL checkpoint failed:", walError.message);
					// Continue with close even if WAL cleanup fails
				}
			}

			// Close statements
			for (const stmt of this.statements.values()) {
				stmt.finalize();
			}
			this.statements.clear();

			// Close database connection
			this.db.close();
			this.db = null;

			// Clear cache
			this.cache.clear();

			this.isInitialized = false;

			this.emit("closed");
			debugLogger.logFunctionExit(
				correlationId,
				{ closed: true },
				"memory-backend",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-backend");
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * Private helper methods
	 */

	_ensureInitialized() {
		if (!this.isInitialized) {
			throw new Error("SharedMemory not initialized. Call initialize() first.");
		}
	}

	/**
	 * Clean up stale WAL files before opening database
	 */
	async _cleanupStaleWALFiles(dbPath) {
		const walFile = `${dbPath}-wal`;
		const shmFile = `${dbPath}-shm`;

		try {
			// Check and remove WAL file
			try {
				await fs.access(walFile);
				await fs.unlink(walFile);
				console.log("🧹 Removed stale WAL file:", walFile);
			} catch (error) {
				// File doesn't exist, which is fine
				if (error.code !== "ENOENT") {
					console.warn("⚠️ Could not remove WAL file:", error.message);
				}
			}

			// Check and remove SHM file
			try {
				await fs.access(shmFile);
				await fs.unlink(shmFile);
				console.log("🧹 Removed stale SHM file:", shmFile);
			} catch (error) {
				// File doesn't exist, which is fine
				if (error.code !== "ENOENT") {
					console.warn("⚠️ Could not remove SHM file:", error.message);
				}
			}
		} catch (error) {
			console.warn("⚠️ WAL cleanup failed:", error.message);
			// Don't throw - continue with database initialization
		}
	}

	/**
	 * Register database cleanup with graceful exit system
	 */
	_registerGracefulCleanup() {
		const dbPath = path.join(
			process.cwd(),
			this.options.directory,
			this.options.filename,
		);

		registerCleanupResource({
			name: `sqlite-database-${this.options.directory}`,
			cleanup: async () => {
				if (this.isInitialized && this.db) {
					console.log(`🧹 Gracefully closing database: ${dbPath}`);
					await this.close();
				}
			},
		});
	}

	_configureDatabase() {
		// Performance optimizations
		if (this.options.enableWAL) {
			this.db.pragma("journal_mode = WAL");
		}
		this.db.pragma("synchronous = NORMAL");
		this.db.pragma("cache_size = -64000"); // 64MB
		this.db.pragma("temp_store = MEMORY");
		this.db.pragma("mmap_size = 268435456"); // 256MB
	}

	_runMigrations() {
		// Create migrations table if needed
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

		// Get current version
		const currentVersion =
			this.db.prepare("SELECT MAX(version) as version FROM migrations").get()
				.version || 0;

		// Run pending migrations
		const pending = MIGRATIONS.filter((m) => m.version > currentVersion);

		if (pending.length > 0) {
			const transaction = this.db.transaction((migrations) => {
				for (const migration of migrations) {
					this.db.exec(migration.sql);
					this.db
						.prepare(
							"INSERT INTO migrations (version, description) VALUES (?, ?)",
						)
						.run(migration.version, migration.description);
				}
			});

			transaction(pending);
			this.emit("migrated", {
				from: currentVersion,
				to: pending[pending.length - 1].version,
			});
		}
	}

	_prepareStatements() {
		// Upsert statement
		this.statements.set(
			"upsert",
			this.db.prepare(`
      INSERT INTO memory_store (key, namespace, value, type, metadata, tags, ttl, expires_at, compressed, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key, namespace) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        metadata = excluded.metadata,
        tags = excluded.tags,
        ttl = excluded.ttl,
        expires_at = excluded.expires_at,
        compressed = excluded.compressed,
        size = excluded.size,
        updated_at = strftime('%s', 'now'),
        access_count = memory_store.access_count + 1
    `),
		);

		// Select statement
		this.statements.set(
			"select",
			this.db.prepare(`
      SELECT * FROM memory_store WHERE key = ? AND namespace = ?
    `),
		);

		// Update access statement
		this.statements.set(
			"updateAccess",
			this.db.prepare(`
      UPDATE memory_store
      SET accessed_at = strftime('%s', 'now'), access_count = access_count + 1
      WHERE key = ? AND namespace = ?
    `),
		);

		// Delete statement
		this.statements.set(
			"delete",
			this.db.prepare(`
      DELETE FROM memory_store WHERE key = ? AND namespace = ?
    `),
		);

		// List statement
		this.statements.set(
			"list",
			this.db.prepare(`
      SELECT * FROM memory_store
      WHERE namespace = ?
      ORDER BY accessed_at DESC
      LIMIT ? OFFSET ?
    `),
		);

		// Clear namespace statement
		this.statements.set(
			"clearNamespace",
			this.db.prepare(`
      DELETE FROM memory_store WHERE namespace = ?
    `),
		);

		// Stats statement
		this.statements.set(
			"stats",
			this.db.prepare(`
      SELECT
        namespace,
        COUNT(*) as count,
        SUM(size) as total_size,
        AVG(size) as avg_size,
        SUM(compressed) as compressed_count
      FROM memory_store
      GROUP BY namespace
    `),
		);

		// Garbage collection statement
		this.statements.set(
			"gc",
			this.db.prepare(`
      DELETE FROM memory_store
      WHERE expires_at IS NOT NULL AND expires_at < strftime('%s', 'now')
    `),
		);
	}

	_startGarbageCollection() {
		this.gcTimer = setInterval(() => {
			this._runGarbageCollection();
		}, this.options.gcInterval);
	}

	_runGarbageCollection() {
		const correlationId = debugLogger.logFunctionEntry(
			"SharedMemory",
			"_runGarbageCollection",
			{},
			"memory-backend",
		);

		try {
			const result = this.statements.get("gc").run();

			if (result.changes > 0) {
				this.emit("gc", { expired: result.changes });
				debugLogger.logEvent(
					"SharedMemory",
					"garbage-collection",
					{ expired: result.changes },
					"memory-backend",
				);
			}

			this.metrics.lastGC = Date.now();
			debugLogger.logFunctionExit(
				correlationId,
				{ expired: result.changes },
				"memory-backend",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "memory-backend");
			this.emit("error", error);
		}
	}

	_getCacheKey(key, namespace) {
		return `${namespace}:${key}`;
	}

	_recordMetric(operation, duration) {
		if (!this.metrics.operations.has(operation)) {
			this.metrics.operations.set(operation, []);
		}

		const metrics = this.metrics.operations.get(operation);
		metrics.push(duration);

		// Keep only last 100 measurements
		if (metrics.length > 100) {
			metrics.shift();
		}

		this.metrics.totalOperations++;
	}

	_getMetricsSummary() {
		const summary = {};

		for (const [operation, durations] of this.metrics.operations) {
			if (durations.length > 0) {
				summary[operation] = {
					count: durations.length,
					avg: durations.reduce((a, b) => a + b, 0) / durations.length,
					min: Math.min(...durations),
					max: Math.max(...durations),
				};
			}
		}

		summary.totalOperations = this.metrics.totalOperations;
		summary.lastGC = new Date(this.metrics.lastGC).toISOString();

		return summary;
	}
}

// Export for backwards compatibility
export default SharedMemory;
