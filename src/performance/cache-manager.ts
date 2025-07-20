/**
 * Advanced Cache Manager with TTL, LRU eviction, and memory optimization
 */

import { createHash } from "crypto";
import { EventEmitter } from "events";
import { FSWatcher, promises as fs, watch } from "fs";
import { LRUCache } from "lru-cache";

export interface CacheConfig {
	maxSize: number;
	ttl: number;
	checkInterval: number;
	maxMemoryMB: number;
	enableFileWatch: boolean;
	enableCompression: boolean;
	persistToDisk: boolean;
	diskCachePath?: string;
}

export interface CacheEntry<T> {
	value: T;
	timestamp: number;
	hits: number;
	size: number;
	compressed?: boolean;
	hash: string;
}

export interface CacheStats {
	size: number;
	hitRate: number;
	memoryUsage: number;
	evictions: number;
	compressionRatio: number;
	diskCacheSize: number;
}

export class AdvancedCacheManager extends EventEmitter {
	private cache!: LRUCache<string, CacheEntry<any>>;
	private fileWatchers: Map<string, FSWatcher> = new Map();
	private stats = {
		hits: 0,
		misses: 0,
		evictions: 0,
		memoryUsage: 0,
		compressionSaved: 0,
		diskReads: 0,
		diskWrites: 0,
	};
	private cleanupInterval: NodeJS.Timeout | null = null;
	private memoryMonitor: NodeJS.Timeout | null = null;

	constructor(private config: CacheConfig) {
		super();
		this.setupCache();
		this.startCleanupInterval();
		this.startMemoryMonitor();
	}

	private setupCache(): void {
		this.cache = new LRUCache({
			max: this.config.maxSize,
			ttl: this.config.ttl,
			dispose: (value, key) => {
				this.stats.evictions++;
				this.emit("eviction", { key, value });
			},
			updateAgeOnGet: true,
			updateAgeOnHas: true,
		});
	}

	private startCleanupInterval(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, this.config.checkInterval);
	}

	private startMemoryMonitor(): void {
		this.memoryMonitor = setInterval(() => {
			this.checkMemoryUsage();
		}, 30000); // Check every 30 seconds
	}

	private checkMemoryUsage(): void {
		const memoryUsage = process.memoryUsage();
		this.stats.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // MB

		if (this.stats.memoryUsage > this.config.maxMemoryMB) {
			this.emit("memoryPressure", this.stats.memoryUsage);
			this.performEmergencyCleanup();
		}
	}

	private performEmergencyCleanup(): void {
		const targetSize = Math.floor(this.cache.size * 0.7);
		while (this.cache.size > targetSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}
	}

	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.config.ttl) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => this.cache.delete(key));
	}

	async get<T>(key: string): Promise<T | undefined> {
		const entry = this.cache.get(key);

		if (entry) {
			this.stats.hits++;
			entry.hits++;
			return entry.value;
		}

		// Try disk cache if enabled
		if (this.config.persistToDisk && this.config.diskCachePath) {
			try {
				const diskValue = await this.getDiskCache<T>(key);
				if (diskValue) {
					this.stats.diskReads++;
					// Restore to memory cache
					await this.set(key, diskValue);
					return diskValue;
				}
			} catch (error) {
				this.emit("diskError", { key, error });
			}
		}

		this.stats.misses++;
		return undefined;
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		const timestamp = Date.now();
		const hash = this.createHash(value);
		const size = this.calculateSize(value);

		let finalValue = value;
		let compressed = false;

		// Compression for large values
		if (this.config.enableCompression && size > 1024) {
			try {
				const compressedValue = await this.compress(value);
				if (compressedValue.length < size * 0.8) {
					finalValue = compressedValue as T;
					compressed = true;
					this.stats.compressionSaved += size - compressedValue.length;
				}
			} catch (error) {
				this.emit("compressionError", { key, error });
			}
		}

		const entry: CacheEntry<T> = {
			value: finalValue,
			timestamp,
			hits: 0,
			size,
			compressed,
			hash,
		};

		this.cache.set(key, entry);

		// Persist to disk if enabled
		if (this.config.persistToDisk && this.config.diskCachePath) {
			try {
				await this.setDiskCache(key, value);
				this.stats.diskWrites++;
			} catch (error) {
				this.emit("diskError", { key, error });
			}
		}

		this.emit("set", { key, size, compressed });
	}

	has(key: string): boolean {
		return this.cache.has(key);
	}

	delete(key: string): boolean {
		this.unwatchFile(key);
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
		this.clearAllWatchers();
	}

	async watchFile(filePath: string, cacheKey?: string): Promise<void> {
		if (!this.config.enableFileWatch) return;

		const key = cacheKey || `file:${filePath}`;

		try {
			// Check if file exists
			await fs.access(filePath);

			const watcher = watch(filePath, (eventType) => {
				if (eventType === "change") {
					this.delete(key);
					this.emit("fileChanged", { filePath, key });
				}
			});

			this.fileWatchers.set(key, watcher);
		} catch (error) {
			this.emit("watchError", { filePath, error });
		}
	}

	unwatchFile(key: string): void {
		const watcher = this.fileWatchers.get(key);
		if (watcher) {
			watcher.close();
			this.fileWatchers.delete(key);
		}
	}

	private clearAllWatchers(): void {
		for (const [key, watcher] of this.fileWatchers) {
			watcher.close();
		}
		this.fileWatchers.clear();
	}

	private async getDiskCache<T>(key: string): Promise<T | undefined> {
		if (!this.config.diskCachePath) return undefined;

		const filePath = `${this.config.diskCachePath}/${this.createHash(key)}.cache`;
		try {
			const data = await fs.readFile(filePath, "utf8");
			return JSON.parse(data);
		} catch {
			return undefined;
		}
	}

	private async setDiskCache<T>(key: string, value: T): Promise<void> {
		if (!this.config.diskCachePath) return;

		const filePath = `${this.config.diskCachePath}/${this.createHash(key)}.cache`;
		await fs.writeFile(filePath, JSON.stringify(value), "utf8");
	}

	private createHash(data: any): string {
		return createHash("sha256")
			.update(JSON.stringify(data))
			.digest("hex")
			.substring(0, 16);
	}

	private calculateSize(value: any): number {
		return Buffer.byteLength(JSON.stringify(value), "utf8");
	}

	private async compress(value: any): Promise<Buffer> {
		const zlib = await import("zlib");
		return new Promise((resolve, reject) => {
			zlib.gzip(JSON.stringify(value), (err, compressed) => {
				if (err) reject(err);
				else resolve(compressed);
			});
		});
	}

	private async decompress(buffer: Buffer): Promise<any> {
		const zlib = await import("zlib");
		return new Promise((resolve, reject) => {
			zlib.gunzip(buffer, (err, decompressed) => {
				if (err) reject(err);
				else resolve(JSON.parse(decompressed.toString()));
			});
		});
	}

	getStats(): CacheStats {
		const hitRate =
			this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
		const compressionRatio =
			this.stats.compressionSaved /
				(this.stats.compressionSaved + this.cache.size) || 0;

		return {
			size: this.cache.size,
			hitRate,
			memoryUsage: this.stats.memoryUsage,
			evictions: this.stats.evictions,
			compressionRatio,
			diskCacheSize: this.stats.diskWrites,
		};
	}

	resetStats(): void {
		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
			memoryUsage: 0,
			compressionSaved: 0,
			diskReads: 0,
			diskWrites: 0,
		};
	}

	async destroy(): Promise<void> {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		if (this.memoryMonitor) {
			clearInterval(this.memoryMonitor);
		}

		this.clearAllWatchers();
		this.cache.clear();
		this.removeAllListeners();
	}
}

// Symbol Cache with AST-specific optimizations
export class SymbolCache extends AdvancedCacheManager {
	private astCache: Map<string, any> = new Map();
	private dependencyGraph: Map<string, Set<string>> = new Map();

	constructor(config: CacheConfig) {
		super(config);
	}

	async cacheSymbol(
		filePath: string,
		symbols: any[],
		ast?: any
	): Promise<void> {
		const key = `symbols:${filePath}`;
		await this.set(key, symbols);

		if (ast) {
			this.astCache.set(filePath, ast);
		}

		// Watch file for changes
		await this.watchFile(filePath, key);
	}

	async getSymbols(filePath: string): Promise<any[] | undefined> {
		const key = `symbols:${filePath}`;
		return this.get(key);
	}

	getAST(filePath: string): any | undefined {
		return this.astCache.get(filePath);
	}

	addDependency(from: string, to: string): void {
		if (!this.dependencyGraph.has(from)) {
			this.dependencyGraph.set(from, new Set());
		}
		this.dependencyGraph.get(from)!.add(to);
	}

	invalidateDependents(filePath: string): void {
		const toInvalidate = new Set<string>();

		// Find all files that depend on this file
		for (const [dependent, dependencies] of this.dependencyGraph) {
			if (dependencies.has(filePath)) {
				toInvalidate.add(dependent);
			}
		}

		// Recursively invalidate
		for (const dependent of toInvalidate) {
			this.delete(`symbols:${dependent}`);
			this.astCache.delete(dependent);
			this.invalidateDependents(dependent);
		}
	}

	override async destroy(): Promise<void> {
		this.astCache.clear();
		this.dependencyGraph.clear();
		await super.destroy();
	}
}

// Factory function for creating optimized cache instances
export function createCacheManager(
	type: "general" | "symbols" | "ast",
	config: Partial<CacheConfig> = {}
): AdvancedCacheManager {
	const defaultConfig: CacheConfig = {
		maxSize: 1000,
		ttl: 300000, // 5 minutes
		checkInterval: 60000, // 1 minute
		maxMemoryMB: 256,
		enableFileWatch: true,
		enableCompression: true,
		persistToDisk: false,
	};

	const finalConfig = { ...defaultConfig, ...config };

	switch (type) {
		case "symbols":
			return new SymbolCache(finalConfig);
		case "ast":
			return new AdvancedCacheManager({
				...finalConfig,
				maxSize: 500,
				ttl: 600000, // 10 minutes for AST
				enableCompression: true,
			});
		default:
			return new AdvancedCacheManager(finalConfig);
	}
}
