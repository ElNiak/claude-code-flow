/**
 * Distributed Caching Architecture for Claude Flow
 *
 * Implements a multi-tiered distributed caching system with:
 * - L1 Cache: In-memory cache for immediate access
 * - L2 Cache: Redis/Memcached for shared caching
 * - L3 Cache: Persistent storage for long-term caching
 *
 * Features:
 * - Automatic cache invalidation
 * - Cache warming strategies
 * - Distributed cache coherency
 * - Performance monitoring
 * - Horizontal scaling support
 *
 * @author SystemArchitect - Swarm-7CO3JavO
 */

import { EventEmitter } from "events";
import { LRUCache } from "lru-cache";
import { promisify } from "util";

// ===== CACHE LAYER DEFINITIONS =====

interface CacheItem<T> {
	key: string;
	value: T;
	timestamp: number;
	ttl: number;
	tags: string[];
	metadata: Record<string, any>;
}

interface CacheStats {
	hits: number;
	misses: number;
	evictions: number;
	size: number;
	hitRate: number;
	memoryUsage: number;
}

interface CacheConfig {
	maxSize: number;
	defaultTtl: number;
	cleanupInterval: number;
	persistenceEnabled: boolean;
	distributedMode: boolean;
	compressionEnabled: boolean;
}

// ===== L1 CACHE: IN-MEMORY LAYER =====

class L1MemoryCache<T> extends EventEmitter {
	private cache: LRUCache<string, CacheItem<T>>;
	private stats: CacheStats;
	private config: CacheConfig;
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(config: Partial<CacheConfig> = {}) {
		super();
		this.config = {
			maxSize: 10000,
			defaultTtl: 300000, // 5 minutes
			cleanupInterval: 60000, // 1 minute
			persistenceEnabled: false,
			distributedMode: false,
			compressionEnabled: false,
			...config,
		};

		this.cache = new LRUCache<string, CacheItem<T>>({
			max: this.config.maxSize,
			ttl: this.config.defaultTtl,
			dispose: (value: CacheItem<T>, key: string) => {
				this.stats.evictions++;
				this.emit("evicted", key, value);
			},
		});

		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
			size: 0,
			hitRate: 0,
			memoryUsage: 0,
		};

		this.startCleanup();
	}

	async get(key: string): Promise<T | null> {
		const item = this.cache.get(key);

		if (item) {
			// Check if item is still valid
			if (Date.now() - item.timestamp < item.ttl) {
				this.stats.hits++;
				this.updateStats();
				this.emit("hit", key, item.value);
				return item.value;
			} else {
				// Item expired, remove it
				this.cache.delete(key);
			}
		}

		this.stats.misses++;
		this.updateStats();
		this.emit("miss", key);
		return null;
	}

	async set(
		key: string,
		value: T,
		ttl?: number,
		tags: string[] = [],
	): Promise<void> {
		const item: CacheItem<T> = {
			key,
			value,
			timestamp: Date.now(),
			ttl: ttl || this.config.defaultTtl,
			tags,
			metadata: {
				createdAt: new Date().toISOString(),
				accessCount: 0,
			},
		};

		this.cache.set(key, item);
		this.updateStats();
		this.emit("set", key, value);
	}

	async delete(key: string): Promise<boolean> {
		const deleted = this.cache.delete(key);
		if (deleted) {
			this.updateStats();
			this.emit("deleted", key);
		}
		return deleted;
	}

	async clear(): Promise<void> {
		this.cache.clear();
		this.updateStats();
		this.emit("cleared");
	}

	async invalidateByTags(tags: string[]): Promise<string[]> {
		const invalidatedKeys: string[] = [];

		for (const [key, item] of this.cache.entries()) {
			if (tags.some((tag) => item.tags.includes(tag))) {
				this.cache.delete(key);
				invalidatedKeys.push(key);
			}
		}

		this.updateStats();
		this.emit("invalidated", invalidatedKeys);
		return invalidatedKeys;
	}

	getStats(): CacheStats {
		return { ...this.stats };
	}

	private updateStats(): void {
		this.stats.size = this.cache.size;
		this.stats.hitRate =
			this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
		this.stats.memoryUsage = process.memoryUsage().heapUsed;
	}

	private startCleanup(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanup();
		}, this.config.cleanupInterval);
	}

	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, item] of this.cache.entries()) {
			if (now - item.timestamp > item.ttl) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this.cache.delete(key);
		}

		if (expiredKeys.length > 0) {
			this.emit("cleanup", expiredKeys);
		}
	}

	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}
		this.cache.clear();
	}
}

// ===== L2 CACHE: DISTRIBUTED LAYER =====

class L2DistributedCache<T> extends EventEmitter {
	private nodes: Map<string, any> = new Map();
	private consistentHash: ConsistentHash;
	private config: CacheConfig;
	private stats: CacheStats;

	constructor(config: Partial<CacheConfig> = {}) {
		super();
		this.config = {
			maxSize: 100000,
			defaultTtl: 3600000, // 1 hour
			cleanupInterval: 300000, // 5 minutes
			persistenceEnabled: true,
			distributedMode: true,
			compressionEnabled: true,
			...config,
		};

		this.consistentHash = new ConsistentHash();
		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
			size: 0,
			hitRate: 0,
			memoryUsage: 0,
		};
	}

	async addNode(nodeId: string, connection: any): Promise<void> {
		this.nodes.set(nodeId, connection);
		this.consistentHash.addNode(nodeId);
		this.emit("nodeAdded", nodeId);
	}

	async removeNode(nodeId: string): Promise<void> {
		this.nodes.delete(nodeId);
		this.consistentHash.removeNode(nodeId);
		this.emit("nodeRemoved", nodeId);
	}

	async get(key: string): Promise<T | null> {
		const nodeId = this.consistentHash.getNode(key);
		const node = this.nodes.get(nodeId);

		if (!node) {
			this.stats.misses++;
			return null;
		}

		try {
			const value = await this.getFromNode(node, key);
			if (value !== null) {
				this.stats.hits++;
				this.emit("hit", key, value);
				return value;
			}
		} catch (error) {
			this.emit("error", error, nodeId);
		}

		this.stats.misses++;
		return null;
	}

	async set(
		key: string,
		value: T,
		ttl?: number,
		tags: string[] = [],
	): Promise<void> {
		const nodeId = this.consistentHash.getNode(key);
		const node = this.nodes.get(nodeId);

		if (!node) {
			throw new Error(`No node available for key: ${key}`);
		}

		const item: CacheItem<T> = {
			key,
			value,
			timestamp: Date.now(),
			ttl: ttl || this.config.defaultTtl,
			tags,
			metadata: {
				nodeId,
				compressed: this.config.compressionEnabled,
			},
		};

		try {
			await this.setToNode(node, key, item);
			this.emit("set", key, value);
		} catch (error) {
			this.emit("error", error, nodeId);
			throw error;
		}
	}

	async delete(key: string): Promise<boolean> {
		const nodeId = this.consistentHash.getNode(key);
		const node = this.nodes.get(nodeId);

		if (!node) {
			return false;
		}

		try {
			const deleted = await this.deleteFromNode(node, key);
			if (deleted) {
				this.emit("deleted", key);
			}
			return deleted;
		} catch (error) {
			this.emit("error", error, nodeId);
			return false;
		}
	}

	async invalidateByTags(tags: string[]): Promise<string[]> {
		const invalidatedKeys: string[] = [];

		// Broadcast tag invalidation to all nodes
		const promises = Array.from(this.nodes.entries()).map(
			async ([nodeId, node]) => {
				try {
					const keys = await this.invalidateTagsOnNode(node, tags);
					invalidatedKeys.push(...keys);
				} catch (error) {
					this.emit("error", error, nodeId);
				}
			},
		);

		await Promise.allSettled(promises);
		this.emit("invalidated", invalidatedKeys);
		return invalidatedKeys;
	}

	private async getFromNode(node: any, key: string): Promise<T | null> {
		// Implementation depends on the distributed cache backend (Redis, Memcached, etc.)
		// This is a placeholder
		return null;
	}

	private async setToNode(
		node: any,
		key: string,
		item: CacheItem<T>,
	): Promise<void> {
		// Implementation depends on the distributed cache backend
		// This is a placeholder
	}

	private async deleteFromNode(node: any, key: string): Promise<boolean> {
		// Implementation depends on the distributed cache backend
		// This is a placeholder
		return false;
	}

	private async invalidateTagsOnNode(
		node: any,
		tags: string[],
	): Promise<string[]> {
		// Implementation depends on the distributed cache backend
		// This is a placeholder
		return [];
	}

	getStats(): CacheStats {
		return { ...this.stats };
	}
}

// ===== CONSISTENT HASHING FOR DISTRIBUTION =====

class ConsistentHash {
	private ring: Map<number, string> = new Map();
	private nodes: Set<string> = new Set();
	private virtualNodes = 100;

	addNode(nodeId: string): void {
		this.nodes.add(nodeId);

		for (let i = 0; i < this.virtualNodes; i++) {
			const hash = this.hash(`${nodeId}:${i}`);
			this.ring.set(hash, nodeId);
		}
	}

	removeNode(nodeId: string): void {
		this.nodes.delete(nodeId);

		for (let i = 0; i < this.virtualNodes; i++) {
			const hash = this.hash(`${nodeId}:${i}`);
			this.ring.delete(hash);
		}
	}

	getNode(key: string): string {
		if (this.nodes.size === 0) {
			throw new Error("No nodes available");
		}

		const hash = this.hash(key);
		const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

		for (const ringHash of sortedHashes) {
			if (hash <= ringHash) {
				return this.ring.get(ringHash)!;
			}
		}

		// Wrap around to the first node
		return this.ring.get(sortedHashes[0])!;
	}

	private hash(key: string): number {
		let hash = 0;
		for (let i = 0; i < key.length; i++) {
			const char = key.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}
}

// ===== L3 CACHE: PERSISTENT LAYER =====

class L3PersistentCache<T> extends EventEmitter {
	private config: CacheConfig;
	private stats: CacheStats;
	private persistence: PersistenceManager;

	constructor(config: Partial<CacheConfig> = {}) {
		super();
		this.config = {
			maxSize: 1000000,
			defaultTtl: 86400000, // 24 hours
			cleanupInterval: 3600000, // 1 hour
			persistenceEnabled: true,
			distributedMode: false,
			compressionEnabled: true,
			...config,
		};

		this.persistence = new PersistenceManager(this.config);
		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
			size: 0,
			hitRate: 0,
			memoryUsage: 0,
		};
	}

	async get(key: string): Promise<T | null> {
		try {
			const value = await this.persistence.get<T>(key);
			if (value !== null) {
				this.stats.hits++;
				this.emit("hit", key, value);
				return value;
			}
		} catch (error) {
			this.emit("error", error);
		}

		this.stats.misses++;
		return null;
	}

	async set(
		key: string,
		value: T,
		ttl?: number,
		tags: string[] = [],
	): Promise<void> {
		const item: CacheItem<T> = {
			key,
			value,
			timestamp: Date.now(),
			ttl: ttl || this.config.defaultTtl,
			tags,
			metadata: {
				persistent: true,
				compressed: this.config.compressionEnabled,
			},
		};

		try {
			await this.persistence.set(key, item);
			this.emit("set", key, value);
		} catch (error) {
			this.emit("error", error);
			throw error;
		}
	}

	async delete(key: string): Promise<boolean> {
		try {
			const deleted = await this.persistence.delete(key);
			if (deleted) {
				this.emit("deleted", key);
			}
			return deleted;
		} catch (error) {
			this.emit("error", error);
			return false;
		}
	}

	async invalidateByTags(tags: string[]): Promise<string[]> {
		try {
			const invalidatedKeys = await this.persistence.invalidateByTags(tags);
			this.emit("invalidated", invalidatedKeys);
			return invalidatedKeys;
		} catch (error) {
			this.emit("error", error);
			return [];
		}
	}

	getStats(): CacheStats {
		return { ...this.stats };
	}
}

// ===== PERSISTENCE MANAGER =====

class PersistenceManager {
	private config: CacheConfig;

	constructor(config: CacheConfig) {
		this.config = config;
	}

	async get<T>(key: string): Promise<T | null> {
		// Implementation depends on storage backend (SQLite, PostgreSQL, etc.)
		// This is a placeholder
		return null;
	}

	async set<T>(key: string, item: CacheItem<T>): Promise<void> {
		// Implementation depends on storage backend
		// This is a placeholder
	}

	async delete(key: string): Promise<boolean> {
		// Implementation depends on storage backend
		// This is a placeholder
		return false;
	}

	async invalidateByTags(tags: string[]): Promise<string[]> {
		// Implementation depends on storage backend
		// This is a placeholder
		return [];
	}
}

// ===== MULTI-TIER CACHE ORCHESTRATOR =====

export class DistributedCacheOrchestrator<T> extends EventEmitter {
	private l1Cache: L1MemoryCache<T>;
	private l2Cache: L2DistributedCache<T>;
	private l3Cache: L3PersistentCache<T>;
	private config: CacheConfig;
	private performanceMetrics: Map<string, any> = new Map();

	constructor(config: Partial<CacheConfig> = {}) {
		super();
		this.config = {
			maxSize: 10000,
			defaultTtl: 300000,
			cleanupInterval: 60000,
			persistenceEnabled: true,
			distributedMode: true,
			compressionEnabled: true,
			...config,
		};

		this.l1Cache = new L1MemoryCache<T>(this.config);
		this.l2Cache = new L2DistributedCache<T>(this.config);
		this.l3Cache = new L3PersistentCache<T>(this.config);

		this.setupEventHandlers();
	}

	async get(key: string): Promise<T | null> {
		const startTime = Date.now();

		try {
			// L1 Cache (Memory)
			let value = await this.l1Cache.get(key);
			if (value !== null) {
				this.recordMetric("l1_hit", Date.now() - startTime);
				return value;
			}

			// L2 Cache (Distributed)
			if (this.config.distributedMode) {
				value = await this.l2Cache.get(key);
				if (value !== null) {
					// Warm L1 cache
					await this.l1Cache.set(key, value);
					this.recordMetric("l2_hit", Date.now() - startTime);
					return value;
				}
			}

			// L3 Cache (Persistent)
			if (this.config.persistenceEnabled) {
				value = await this.l3Cache.get(key);
				if (value !== null) {
					// Warm L1 and L2 caches
					await this.l1Cache.set(key, value);
					if (this.config.distributedMode) {
						await this.l2Cache.set(key, value);
					}
					this.recordMetric("l3_hit", Date.now() - startTime);
					return value;
				}
			}

			this.recordMetric("cache_miss", Date.now() - startTime);
			return null;
		} catch (error) {
			this.emit("error", error);
			return null;
		}
	}

	async set(
		key: string,
		value: T,
		ttl?: number,
		tags: string[] = [],
	): Promise<void> {
		const promises: Promise<void>[] = [];

		// Set in all cache layers
		promises.push(this.l1Cache.set(key, value, ttl, tags));

		if (this.config.distributedMode) {
			promises.push(this.l2Cache.set(key, value, ttl, tags));
		}

		if (this.config.persistenceEnabled) {
			promises.push(this.l3Cache.set(key, value, ttl, tags));
		}

		await Promise.allSettled(promises);
		this.emit("set", key, value);
	}

	async delete(key: string): Promise<boolean> {
		const promises: Promise<boolean>[] = [];

		promises.push(this.l1Cache.delete(key));

		if (this.config.distributedMode) {
			promises.push(this.l2Cache.delete(key));
		}

		if (this.config.persistenceEnabled) {
			promises.push(this.l3Cache.delete(key));
		}

		const results = await Promise.allSettled(promises);
		const deleted = results.some((r) => r.status === "fulfilled" && r.value);

		if (deleted) {
			this.emit("deleted", key);
		}

		return deleted;
	}

	async invalidateByTags(tags: string[]): Promise<string[]> {
		const promises: Promise<string[]>[] = [];

		promises.push(this.l1Cache.invalidateByTags(tags));

		if (this.config.distributedMode) {
			promises.push(this.l2Cache.invalidateByTags(tags));
		}

		if (this.config.persistenceEnabled) {
			promises.push(this.l3Cache.invalidateByTags(tags));
		}

		const results = await Promise.allSettled(promises);
		const allInvalidatedKeys = results
			.filter((r) => r.status === "fulfilled")
			.flatMap((r) => (r as PromiseFulfilledResult<string[]>).value);

		const uniqueKeys = [...new Set(allInvalidatedKeys)];
		this.emit("invalidated", uniqueKeys);
		return uniqueKeys;
	}

	async clear(): Promise<void> {
		const promises: Promise<void>[] = [];

		promises.push(this.l1Cache.clear());

		// Note: L2 and L3 clear operations would be implemented based on backend

		await Promise.allSettled(promises);
		this.emit("cleared");
	}

	getCacheStats(): Record<string, CacheStats> {
		return {
			l1: this.l1Cache.getStats(),
			l2: this.l2Cache.getStats(),
			l3: this.l3Cache.getStats(),
		};
	}

	getPerformanceMetrics(): Record<string, any> {
		return Object.fromEntries(this.performanceMetrics);
	}

	private setupEventHandlers(): void {
		// Forward events from all cache layers
		[this.l1Cache, this.l2Cache, this.l3Cache].forEach((cache) => {
			cache.on("hit", (key, value) => this.emit("hit", key, value));
			cache.on("miss", (key) => this.emit("miss", key));
			cache.on("set", (key, value) => this.emit("set", key, value));
			cache.on("deleted", (key) => this.emit("deleted", key));
			cache.on("error", (error) => this.emit("error", error));
		});
	}

	private recordMetric(operation: string, duration: number): void {
		const metric = this.performanceMetrics.get(operation) || {
			count: 0,
			totalTime: 0,
			avgTime: 0,
		};
		metric.count++;
		metric.totalTime += duration;
		metric.avgTime = metric.totalTime / metric.count;
		this.performanceMetrics.set(operation, metric);
	}

	destroy(): void {
		this.l1Cache.destroy();
		// L2 and L3 cleanup would be implemented based on backend
	}
}

// ===== CACHE WARMING STRATEGIES =====

class CacheWarmingStrategy<T> {
	private cache: DistributedCacheOrchestrator<T>;
	private warmingRules: Map<string, WarmingRule> = new Map();

	constructor(cache: DistributedCacheOrchestrator<T>) {
		this.cache = cache;
	}

	addWarmingRule(pattern: string, rule: WarmingRule): void {
		this.warmingRules.set(pattern, rule);
	}

	async warmCache(keys: string[]): Promise<void> {
		const promises = keys.map((key) => this.warmKey(key));
		await Promise.allSettled(promises);
	}

	private async warmKey(key: string): Promise<void> {
		for (const [pattern, rule] of this.warmingRules) {
			if (this.matchesPattern(key, pattern)) {
				const value = await rule.loader(key);
				if (value !== null) {
					await this.cache.set(key, value, rule.ttl, rule.tags);
				}
				break;
			}
		}
	}

	private matchesPattern(key: string, pattern: string): boolean {
		const regex = new RegExp(pattern.replace(/\*/g, ".*"));
		return regex.test(key);
	}
}

interface WarmingRule {
	loader: (key: string) => Promise<any>;
	ttl?: number;
	tags?: string[];
}

// ===== EXPORTS =====

export {
	L1MemoryCache,
	L2DistributedCache,
	L3PersistentCache,
	ConsistentHash,
	CacheWarmingStrategy,
};

export type { CacheItem, CacheStats, CacheConfig, WarmingRule };

export default DistributedCacheOrchestrator;
