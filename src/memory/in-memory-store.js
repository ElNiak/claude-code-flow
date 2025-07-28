/**
 * In-memory store for environments where SQLite is not available
 * Provides the same API as SQLite store but data is not persistent
 */

import { debugLogger } from "../utils/debug-logger.js";

class InMemoryStore {
	constructor(options = {}) {
		this.options = options;
		this.data = new Map(); // namespace -> Map(key -> entry)
		this.isInitialized = false;
		this.cleanupInterval = null;
	}

	async initialize() {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"initialize",
			[],
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

		// Initialize default namespace
		this.data.set("default", new Map());

		// Start cleanup interval for expired entries
		this.cleanupInterval = setInterval(() => {
			this.cleanup().catch((err) =>
				console.error(
					`[${new Date().toISOString()}] ERROR [in-memory-store] Cleanup failed:`,
					err,
				),
			);
		}, 60000); // Run cleanup every minute

		this.isInitialized = true;
		console.error(
			`[${new Date().toISOString()}] INFO [in-memory-store] Initialized in-memory store`,
		);
		debugLogger.logFunctionExit(
			correlationId,
			{ initialized: true },
			"memory-backend",
		);
	}

	_getNamespaceMap(namespace) {
		if (!this.data.has(namespace)) {
			this.data.set(namespace, new Map());
		}
		return this.data.get(namespace);
	}

	async store(key, value, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"store",
			[key, value, options],
			"memory-crud",
		);

		await this.initialize();

		const namespace = options.namespace || "default";
		const namespaceMap = this._getNamespaceMap(namespace);

		const now = Date.now();
		const ttl = options.ttl || null;
		const expiresAt = ttl ? now + ttl * 1000 : null;
		const valueStr = typeof value === "string" ? value : JSON.stringify(value);

		const entry = {
			key,
			value: valueStr,
			namespace,
			metadata: options.metadata || null,
			createdAt: namespaceMap.has(key) ? namespaceMap.get(key).createdAt : now,
			updatedAt: now,
			accessedAt: now,
			accessCount: namespaceMap.has(key)
				? namespaceMap.get(key).accessCount + 1
				: 1,
			ttl,
			expiresAt,
		};

		namespaceMap.set(key, entry);

		const result = {
			success: true,
			id: `${namespace}:${key}`,
			size: valueStr.length,
		};
		debugLogger.logFunctionExit(
			correlationId,
			{ key, namespace, size: valueStr.length },
			"memory-crud",
		);
		return result;
	}

	async retrieve(key, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"retrieve",
			[key, options],
			"memory-crud",
		);

		await this.initialize();

		const namespace = options.namespace || "default";
		const namespaceMap = this._getNamespaceMap(namespace);

		const entry = namespaceMap.get(key);

		if (!entry) {
			debugLogger.logFunctionExit(
				correlationId,
				{ key, namespace, found: false },
				"memory-crud",
			);
			return null;
		}

		// Check if expired
		if (entry.expiresAt && entry.expiresAt < Date.now()) {
			namespaceMap.delete(key);
			debugLogger.logEvent(
				"InMemoryStore",
				"entry-expired",
				{ key, namespace },
				"memory-crud",
			);
			debugLogger.logFunctionExit(
				correlationId,
				{ key, namespace, found: false, reason: "expired" },
				"memory-crud",
			);
			return null;
		}

		// Update access stats
		entry.accessedAt = Date.now();
		entry.accessCount++;

		// Try to parse as JSON, fall back to raw string
		let parsedValue;
		try {
			parsedValue = JSON.parse(entry.value);
		} catch {
			parsedValue = entry.value;
		}
		debugLogger.logFunctionExit(
			correlationId,
			{ key, namespace, found: true, accessCount: entry.accessCount },
			"memory-crud",
		);
		return parsedValue;
	}

	async list(options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"list",
			[options],
			"memory-crud",
		);

		await this.initialize();

		const namespace = options.namespace || "default";
		const limit = options.limit || 100;
		const namespaceMap = this._getNamespaceMap(namespace);

		const entries = Array.from(namespaceMap.values())
			.filter((entry) => !entry.expiresAt || entry.expiresAt > Date.now())
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.slice(0, limit);

		const result = entries.map((entry) => ({
			key: entry.key,
			value: this._tryParseJson(entry.value),
			namespace: entry.namespace,
			metadata: entry.metadata,
			createdAt: new Date(entry.createdAt),
			updatedAt: new Date(entry.updatedAt),
			accessCount: entry.accessCount,
		}));
		debugLogger.logFunctionExit(
			correlationId,
			{ namespace, count: result.length, limit },
			"memory-crud",
		);
		return result;
	}

	async delete(key, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"delete",
			[key, options],
			"memory-crud",
		);

		await this.initialize();

		const namespace = options.namespace || "default";
		const namespaceMap = this._getNamespaceMap(namespace);

		const deleted = namespaceMap.delete(key);
		debugLogger.logFunctionExit(
			correlationId,
			{ key, namespace, deleted },
			"memory-crud",
		);
		return deleted;
	}

	async search(pattern, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"search",
			[pattern, options],
			"memory-crud",
		);

		await this.initialize();

		const namespace = options.namespace || "default";
		const limit = options.limit || 50;
		const namespaceMap = this._getNamespaceMap(namespace);

		const searchLower = pattern.toLowerCase();
		const results = [];

		for (const [key, entry] of namespaceMap.entries()) {
			// Skip expired entries
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				continue;
			}

			// Search in key and value
			if (
				key.toLowerCase().includes(searchLower) ||
				entry.value.toLowerCase().includes(searchLower)
			) {
				results.push({
					key: entry.key,
					value: this._tryParseJson(entry.value),
					namespace: entry.namespace,
					score: entry.accessCount,
					updatedAt: new Date(entry.updatedAt),
				});
			}

			if (results.length >= limit) {
				break;
			}
		}

		// Sort by score (access count) and updated time
		const sortedResults = results.sort((a, b) => {
			if (a.score !== b.score) return b.score - a.score;
			return b.updatedAt - a.updatedAt;
		});
		debugLogger.logFunctionExit(
			correlationId,
			{ pattern, namespace, count: sortedResults.length },
			"memory-crud",
		);
		return sortedResults;
	}

	async cleanup() {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"cleanup",
			[],
			"memory-backend",
		);

		await this.initialize();

		let cleaned = 0;
		const now = Date.now();

		for (const [namespace, namespaceMap] of this.data.entries()) {
			for (const [key, entry] of namespaceMap.entries()) {
				if (entry.expiresAt && entry.expiresAt <= now) {
					namespaceMap.delete(key);
					cleaned++;
				}
			}
		}

		debugLogger.logFunctionExit(correlationId, { cleaned }, "memory-backend");
		return cleaned;
	}

	_tryParseJson(value) {
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	}

	close() {
		const correlationId = debugLogger.logFunctionEntry(
			"InMemoryStore",
			"close",
			[],
			"memory-backend",
		);

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.data.clear();
		this.isInitialized = false;
		debugLogger.logFunctionExit(
			correlationId,
			{ closed: true },
			"memory-backend",
		);
	}
}

export { InMemoryStore };
export default InMemoryStore;
