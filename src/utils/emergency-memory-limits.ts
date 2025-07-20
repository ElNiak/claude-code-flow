// Emergency Memory Management System
// HIGH PRIORITY - Immediate implementation to prevent OOM crashes

export const EMERGENCY_LIMITS = {
	connectionPoolSize: 10, // Down from 50
	cacheSize: 100, // Down from unlimited
	metricsBuffer: 50, // Down from unlimited
	eventHistorySize: 20, // Down from unlimited
	executionHistorySize: 100, // Down from unlimited
	distributedCacheSize: 200, // Down from unlimited
	maxAgents: 6, // Down from 16
	gcThreshold: 0.67, // Trigger GC at 67% heap usage (8GB of 12GB)
	gcInterval: 30000, // Check every 30 seconds
	memoryCheckInterval: 10000, // Check every 10 seconds
	emergencyThreshold: 0.83, // Emergency cleanup at 83% heap usage (10GB of 12GB)
};

export class EmergencyMemoryManager {
	private static instance: EmergencyMemoryManager;
	private gcInterval: NodeJS.Timeout | null = null;
	private memoryCheckInterval: NodeJS.Timeout | null = null;
	private isActive: boolean = false;
	private circuitBreaker: any = null;

	constructor() {
		this.setupEmergencyGC();
		this.setupMemoryMonitoring();
		this.enforceMapLimits();
	}

	static getInstance(): EmergencyMemoryManager {
		if (!EmergencyMemoryManager.instance) {
			EmergencyMemoryManager.instance = new EmergencyMemoryManager();
		}
		return EmergencyMemoryManager.instance;
	}

	activate(): void {
		if (this.isActive) return;

		console.log("🚨 Emergency Memory Manager ACTIVATED");
		this.isActive = true;

		// Activate circuit breaker
		try {
			// Dynamic import to avoid circular dependency
			import("./memory-circuit-breaker.js").then(({ MemoryCircuitBreaker }) => {
				this.circuitBreaker = MemoryCircuitBreaker.getInstance();
				this.circuitBreaker.activate();
			});
		} catch (error) {
			console.warn("⚠️ Could not activate circuit breaker:", error);
		}

		// Start monitoring
		this.startGCMonitoring();
		this.startMemoryMonitoring();

		// Apply immediate limits
		this.applyEmergencyLimits();
	}

	private setupEmergencyGC(): void {
		// Enable manual GC if not already available
		if (!global.gc) {
			console.warn("⚠️ Manual GC not available. Start with --expose-gc flag");
		}
	}

	private setupMemoryMonitoring(): void {
		// Will be started when activated
	}

	private startGCMonitoring(): void {
		if (this.gcInterval) return;

		this.gcInterval = setInterval(() => {
			if (!this.isActive) return;

			const memUsage = process.memoryUsage();
			const heapPercent = memUsage.heapUsed / memUsage.heapTotal;

			if (heapPercent > EMERGENCY_LIMITS.gcThreshold) {
				console.warn(
					`🚨 Emergency GC triggered at ${(heapPercent * 100).toFixed(1)}% heap usage`
				);
				this.forceGarbageCollection();
			}
		}, EMERGENCY_LIMITS.gcInterval);
	}

	private startMemoryMonitoring(): void {
		if (this.memoryCheckInterval) return;

		this.memoryCheckInterval = setInterval(() => {
			if (!this.isActive) return;

			const memUsage = process.memoryUsage();
			const heapPercent = memUsage.heapUsed / memUsage.heapTotal;

			if (heapPercent > EMERGENCY_LIMITS.emergencyThreshold) {
				console.error(
					`🆘 EMERGENCY MEMORY CLEANUP at ${(heapPercent * 100).toFixed(1)}% heap usage`
				);
				this.executeEmergencyCleanup();
			}
		}, EMERGENCY_LIMITS.memoryCheckInterval);
	}

	private forceGarbageCollection(): void {
		if (global.gc) {
			const before = process.memoryUsage().heapUsed;
			global.gc();
			const after = process.memoryUsage().heapUsed;
			const freed = before - after;

			if (freed > 0) {
				console.log(`🧹 GC freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
			}
		}
	}

	private executeEmergencyCleanup(): void {
		console.log("🆘 Executing emergency memory cleanup...");

		// 1. Force garbage collection multiple times
		for (let i = 0; i < 3; i++) {
			if (global.gc) global.gc();
		}

		// 2. Clear all possible caches
		this.clearAllCaches();

		// 3. Reduce active connections
		this.reduceConnections();

		// 4. Clear metrics and history
		this.clearMetricsAndHistory();

		// 5. Check if we need to crash gracefully
		const afterCleanup =
			process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
		if (afterCleanup > 0.9) {
			console.error(
				"🚨 CRITICAL: Memory still high after cleanup. System may need restart."
			);
		}
	}

	private applyEmergencyLimits(): void {
		console.log("🔧 Applying emergency memory limits...");

		try {
			// Reduce connection pools
			this.limitConnectionPools();

			// Limit distributed cache
			this.limitDistributedCache();

			// Limit metrics buffers
			this.limitMetricsBuffers();

			// Limit event history
			this.limitEventHistory();

			console.log("✅ Emergency limits applied successfully");
		} catch (error) {
			console.error("❌ Error applying emergency limits:", error);
		}
	}

	private limitConnectionPools(): void {
		try {
			// Find and limit connection pools
			const pools = this.findConnectionPools();
			pools.forEach((pool) => {
				if (pool && pool.size > EMERGENCY_LIMITS.connectionPoolSize) {
					const toRemove = pool.size - EMERGENCY_LIMITS.connectionPoolSize;
					console.log(`🔧 Reducing connection pool by ${toRemove} connections`);

					// Remove oldest/idle connections
					const connections = Array.from(pool.values());
					for (let i = 0; i < toRemove && i < connections.length; i++) {
						const conn = connections[i];
						if (conn && !conn.inUse) {
							pool.delete(conn.id);
							if (conn.close) conn.close();
						}
					}
				}
			});
		} catch (error) {
			console.error("Error limiting connection pools:", error);
		}
	}

	private limitDistributedCache(): void {
		try {
			// Find and limit distributed cache
			const cache = this.getDistributedCache();
			if (cache && cache.size > EMERGENCY_LIMITS.distributedCacheSize) {
				const toRemove = cache.size - EMERGENCY_LIMITS.distributedCacheSize;
				console.log(`🔧 Reducing distributed cache by ${toRemove} entries`);

				// Remove oldest entries
				const entries = Array.from(cache.entries());
				for (let i = 0; i < toRemove; i++) {
					const [key] = entries[i];
					cache.delete(key);
				}
			}
		} catch (error) {
			console.error("Error limiting distributed cache:", error);
		}
	}

	private limitMetricsBuffers(): void {
		try {
			// Find and limit metrics arrays
			const metricsArrays = this.findMetricsArrays();
			metricsArrays.forEach((array) => {
				if (array && array.length > EMERGENCY_LIMITS.metricsBuffer) {
					const toRemove = array.length - EMERGENCY_LIMITS.metricsBuffer;
					console.log(`🔧 Reducing metrics buffer by ${toRemove} entries`);
					array.splice(0, toRemove);
				}
			});
		} catch (error) {
			console.error("Error limiting metrics buffers:", error);
		}
	}

	private limitEventHistory(): void {
		try {
			// Find and limit event history
			const eventMaps = this.findEventMaps();
			eventMaps.forEach((map) => {
				if (map && map.size > EMERGENCY_LIMITS.eventHistorySize) {
					const toRemove = map.size - EMERGENCY_LIMITS.eventHistorySize;
					console.log(`🔧 Reducing event history by ${toRemove} entries`);

					const keys = Array.from(map.keys());
					for (let i = 0; i < toRemove; i++) {
						map.delete(keys[i]);
					}
				}
			});
		} catch (error) {
			console.error("Error limiting event history:", error);
		}
	}

	private clearAllCaches(): void {
		try {
			// Clear distributed cache
			const distributedCache = this.getDistributedCache();
			if (distributedCache) {
				const size = distributedCache.size;
				distributedCache.clear();
				console.log(`🧹 Cleared distributed cache (${size} entries)`);
			}

			// Clear connection pool caches
			const connectionPools = this.findConnectionPools();
			connectionPools.forEach((pool) => {
				if (pool) {
					const size = pool.size;
					pool.clear();
					console.log(`🧹 Cleared connection pool (${size} connections)`);
				}
			});
		} catch (error) {
			console.error("Error clearing caches:", error);
		}
	}

	private reduceConnections(): void {
		try {
			// Force close idle connections
			const pools = this.findConnectionPools();
			pools.forEach((pool) => {
				if (pool) {
					const connections = Array.from(pool.values());
					connections.forEach((conn) => {
						if (conn && !conn.inUse) {
							if (conn.close) conn.close();
							pool.delete(conn.id);
						}
					});
				}
			});
		} catch (error) {
			console.error("Error reducing connections:", error);
		}
	}

	private clearMetricsAndHistory(): void {
		try {
			// Clear metrics arrays
			const metricsArrays = this.findMetricsArrays();
			metricsArrays.forEach((array) => {
				if (array) {
					const length = array.length;
					array.length = 0;
					console.log(`🧹 Cleared metrics array (${length} entries)`);
				}
			});

			// Clear event maps
			const eventMaps = this.findEventMaps();
			eventMaps.forEach((map) => {
				if (map) {
					const size = map.size;
					map.clear();
					console.log(`🧹 Cleared event map (${size} entries)`);
				}
			});
		} catch (error) {
			console.error("Error clearing metrics and history:", error);
		}
	}

	private enforceMapLimits(): void {
		// This will be called periodically to enforce limits
		// Implementation depends on finding the actual Map objects in the system
	}

	// Helper methods to find system objects
	private findConnectionPools(): Map<string, any>[] {
		const pools: Map<string, any>[] = [];

		// Try to find connection pools in global scope
		try {
			// Look for common connection pool patterns
			const globalAny = global as any;
			if (globalAny.connectionPools) {
				pools.push(...globalAny.connectionPools);
			}

			// Look for SQLite connection pools
			if (globalAny.sqliteConnectionPool) {
				pools.push(globalAny.sqliteConnectionPool);
			}
		} catch (error) {
			// Ignore errors when searching
		}

		return pools;
	}

	private getDistributedCache(): Map<string, any> | null {
		try {
			const globalAny = global as any;
			return globalAny.distributedCache || null;
		} catch (error) {
			return null;
		}
	}

	private findMetricsArrays(): any[] {
		const arrays: any[] = [];

		try {
			const globalAny = global as any;
			if (globalAny.metricsArrays) {
				arrays.push(...globalAny.metricsArrays);
			}

			// Look for monitoring system arrays
			if (globalAny.monitoringSystem) {
				const system = globalAny.monitoringSystem;
				if (system.metrics) arrays.push(system.metrics);
				if (system.alerts) arrays.push(system.alerts);
				if (system.healthChecks) arrays.push(system.healthChecks);
			}
		} catch (error) {
			// Ignore errors when searching
		}

		return arrays;
	}

	private findEventMaps(): Map<string, any>[] {
		const maps: Map<string, any>[] = [];

		try {
			const globalAny = global as any;
			if (globalAny.eventMaps) {
				maps.push(...globalAny.eventMaps);
			}

			// Look for event bus maps
			if (globalAny.eventBus) {
				const eventBus = globalAny.eventBus;
				if (eventBus.eventCounts) maps.push(eventBus.eventCounts);
				if (eventBus.lastEventTimes) maps.push(eventBus.lastEventTimes);
			}
		} catch (error) {
			// Ignore errors when searching
		}

		return maps;
	}

	getMemoryStatus(): any {
		const memUsage = process.memoryUsage();
		return {
			isActive: this.isActive,
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			heapPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
			external: memUsage.external,
			rss: memUsage.rss,
			emergencyThreshold: EMERGENCY_LIMITS.emergencyThreshold * 100,
			gcThreshold: EMERGENCY_LIMITS.gcThreshold * 100,
		};
	}

	deactivate(): void {
		if (!this.isActive) return;

		console.log("🔧 Emergency Memory Manager DEACTIVATED");
		this.isActive = false;

		if (this.gcInterval) {
			clearInterval(this.gcInterval);
			this.gcInterval = null;
		}

		if (this.memoryCheckInterval) {
			clearInterval(this.memoryCheckInterval);
			this.memoryCheckInterval = null;
		}
	}
}

// Auto-activate if heap usage is already high
const initialUsage = process.memoryUsage();
const initialPercent = initialUsage.heapUsed / initialUsage.heapTotal;

if (initialPercent > 0.7) {
	console.log(
		`🚨 High initial heap usage detected: ${(initialPercent * 100).toFixed(1)}%`
	);
	EmergencyMemoryManager.getInstance().activate();
}

export default EmergencyMemoryManager;
