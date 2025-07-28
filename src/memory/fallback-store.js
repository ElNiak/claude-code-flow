/**
 * Fallback memory store that tries SQLite first, then falls back to in-memory storage
 * Designed to handle npx environments where native modules may fail to load
 */

import { debugLogger } from "../utils/debug-logger.js";
import { InMemoryStore } from "./in-memory-store.js";
import { SqliteMemoryStore } from "./sqlite-store.js";

class FallbackMemoryStore {
	constructor(options = {}) {
		this.options = options;
		this.primaryStore = null;
		this.fallbackStore = null;
		this.useFallback = false;
		this.initializationAttempted = false;
	}

	async initialize() {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"initialize",
			[],
			"memory-backend",
		);

		if (this.initializationAttempted) {
			debugLogger.logFunctionExit(
				correlationId,
				{ alreadyAttempted: true, usingFallback: this.useFallback },
				"memory-backend",
			);
			return;
		}
		this.initializationAttempted = true;

		// First, try to initialize SQLite store
		try {
			this.primaryStore = new SqliteMemoryStore(this.options);
			await this.primaryStore.initialize();
			console.error(
				`[${new Date().toISOString()}] INFO [fallback-store] Successfully initialized SQLite store`,
			);
			this.useFallback = false;
			debugLogger.logEvent(
				"FallbackMemoryStore",
				"sqlite-init-success",
				{},
				"memory-backend",
			);
		} catch (error) {
			console.error(
				`[${new Date().toISOString()}] WARN [fallback-store] SQLite initialization failed, falling back to in-memory store:`,
				error.message,
			);

			// Fall back to in-memory store
			this.fallbackStore = new InMemoryStore(this.options);
			await this.fallbackStore.initialize();
			this.useFallback = true;

			console.error(
				`[${new Date().toISOString()}] INFO [fallback-store] Using in-memory store (data will not persist across sessions)`,
			);
			console.error(
				`[${new Date().toISOString()}] INFO [fallback-store] To enable persistent storage, install the package locally: npm install claude-flow@alpha`,
			);
			debugLogger.logEvent(
				"FallbackMemoryStore",
				"fallback-to-memory",
				{ reason: error.message },
				"memory-backend",
			);
		}
		debugLogger.logFunctionExit(
			correlationId,
			{ usingFallback: this.useFallback, initialized: true },
			"memory-backend",
		);
	}

	get activeStore() {
		return this.useFallback ? this.fallbackStore : this.primaryStore;
	}

	async store(key, value, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"store",
			[key, value, options],
			"memory-crud",
		);

		await this.initialize();
		const result = await this.activeStore.store(key, value, options);
		debugLogger.logFunctionExit(
			correlationId,
			{ key, namespace: options.namespace, success: !!result },
			"memory-crud",
		);
		return result;
	}

	async retrieve(key, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"retrieve",
			[key, options],
			"memory-crud",
		);

		await this.initialize();
		const result = await this.activeStore.retrieve(key, options);
		debugLogger.logFunctionExit(
			correlationId,
			{ key, namespace: options.namespace, found: !!result },
			"memory-crud",
		);
		return result;
	}

	async list(options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"list",
			[options],
			"memory-crud",
		);

		await this.initialize();
		const result = await this.activeStore.list(options);
		debugLogger.logFunctionExit(
			correlationId,
			{ namespace: options.namespace, count: result?.length },
			"memory-crud",
		);
		return result;
	}

	async delete(key, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"delete",
			[key, options],
			"memory-crud",
		);

		await this.initialize();
		const result = await this.activeStore.delete(key, options);
		debugLogger.logFunctionExit(
			correlationId,
			{ key, namespace: options.namespace, deleted: !!result },
			"memory-crud",
		);
		return result;
	}

	async search(pattern, options = {}) {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"search",
			[pattern, options],
			"memory-crud",
		);

		await this.initialize();
		const result = await this.activeStore.search(pattern, options);
		debugLogger.logFunctionExit(
			correlationId,
			{ pattern, namespace: options.namespace, count: result?.length },
			"memory-crud",
		);
		return result;
	}

	async cleanup() {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"cleanup",
			[],
			"memory-backend",
		);

		await this.initialize();
		const result = await this.activeStore.cleanup();
		debugLogger.logFunctionExit(
			correlationId,
			{ cleaned: result },
			"memory-backend",
		);
		return result;
	}

	close() {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"close",
			[],
			"memory-backend",
		);

		if (this.primaryStore) {
			this.primaryStore.close();
		}
		if (this.fallbackStore) {
			this.fallbackStore.close();
		}
		debugLogger.logFunctionExit(
			correlationId,
			{ closed: true },
			"memory-backend",
		);
	}

	isUsingFallback() {
		const correlationId = debugLogger.logFunctionEntry(
			"FallbackMemoryStore",
			"isUsingFallback",
			[],
			"memory-ops",
		);
		debugLogger.logFunctionExit(
			correlationId,
			{ usingFallback: this.useFallback },
			"memory-ops",
		);
		return this.useFallback;
	}
}

// Export a singleton instance for MCP server
export const memoryStore = new FallbackMemoryStore();

export { FallbackMemoryStore };
export default FallbackMemoryStore;
