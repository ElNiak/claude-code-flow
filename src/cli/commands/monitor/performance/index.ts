// ABOUTME: Performance monitoring CLI commands that expose connection pool and cache manager utilities
// ABOUTME: Implements the claude-flow performance command family for real-time monitoring and analysis

import {
	AdvancedCacheManager,
	type CacheStats,
	createCacheManager,
} from "../core/cache-manager.js";
import {
	ConnectionPool,
	type ConnectionStats,
	createConnectionPool,
} from "../core/connection-pool.js";

export interface PerformanceCommandOptions {
	realTime?: boolean;
	interval?: number;
	format?: "json" | "table";
	detailed?: boolean;
	focus?: string;
}

export class PerformanceMonitor {
	private connectionPools: Map<string, ConnectionPool> = new Map();
	private cacheManagers: Map<string, AdvancedCacheManager> = new Map();
	private monitoringInterval?: NodeJS.Timeout;

	/**
	 * Start real-time performance monitoring
	 */
	async startMonitoring(
		options: PerformanceCommandOptions = {},
	): Promise<void> {
		const interval = options.interval || 5000;

		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}

		console.log(`🚀 Starting performance monitoring (interval: ${interval}ms)`);

		this.monitoringInterval = setInterval(() => {
			this.displayMetrics(options);
		}, interval);

		// Show initial metrics
		this.displayMetrics(options);
	}

	/**
	 * Stop performance monitoring
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
			console.log("📊 Performance monitoring stopped");
		}
	}

	/**
	 * Add a connection pool to monitor
	 */
	addConnectionPool(
		name: string,
		type: "typescript" | "python" | "rust" | "go" | "java" | "custom",
	): void {
		const pool = createConnectionPool(type);
		this.connectionPools.set(name, pool);
		console.log(`✅ Added ${name} connection pool for monitoring`);
	}

	/**
	 * Add a cache manager to monitor
	 */
	addCacheManager(name: string, type: "general" | "symbols" | "ast"): void {
		const cache = createCacheManager(type);
		this.cacheManagers.set(name, cache);
		console.log(`✅ Added ${name} cache manager for monitoring`);
	}

	/**
	 * Display current performance metrics
	 */
	private displayMetrics(options: PerformanceCommandOptions): void {
		const timestamp = new Date().toISOString();

		if (options.format === "json") {
			const metrics = this.gatherMetrics();
			console.log(JSON.stringify({ timestamp, ...metrics }, null, 2));
			return;
		}

		console.log(`\n📊 Performance Metrics - ${timestamp}`);
		console.log("=".repeat(60));

		// Connection Pool Metrics
		if (this.connectionPools.size > 0) {
			console.log("\n🔗 Connection Pools:");
			for (const [name, pool] of this.connectionPools) {
				const stats = pool.getStats();
				this.displayConnectionStats(name, stats, options.detailed);
			}
		}

		// Cache Manager Metrics
		if (this.cacheManagers.size > 0) {
			console.log("\n💾 Cache Managers:");
			for (const [name, cache] of this.cacheManagers) {
				const stats = cache.getStats();
				this.displayCacheStats(name, stats, options.detailed);
			}
		}

		if (this.connectionPools.size === 0 && this.cacheManagers.size === 0) {
			console.log(
				"ℹ️  No performance monitors active. Add connection pools or cache managers to track metrics.",
			);
		}
	}

	/**
	 * Display connection pool statistics
	 */
	private displayConnectionStats(
		name: string,
		stats: ConnectionStats,
		detailed?: boolean,
	): void {
		console.log(`  📈 ${name}:`);
		console.log(
			`    Active: ${stats.active} | Idle: ${stats.idle} | Total: ${stats.total}`,
		);
		console.log(
			`    Failed: ${stats.failed} | Reconnects: ${stats.reconnects}`,
		);
		console.log(
			`    Avg Response: ${stats.avgResponseTime.toFixed(2)}ms | Total Requests: ${stats.totalRequests}`,
		);

		if (detailed) {
			console.log(
				`    Performance: ${(stats.totalRequests / Math.max(stats.active + stats.idle, 1)).toFixed(2)} req/conn`,
			);
		}
	}

	/**
	 * Display cache manager statistics
	 */
	private displayCacheStats(
		name: string,
		stats: CacheStats,
		detailed?: boolean,
	): void {
		console.log(`  🗂️  ${name}:`);
		console.log(
			`    Size: ${stats.size} entries | Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`,
		);
		console.log(
			`    Memory: ${stats.memoryUsage.toFixed(1)}MB | Evictions: ${stats.evictions}`,
		);

		if (detailed) {
			console.log(
				`    Compression: ${(stats.compressionRatio * 100).toFixed(1)}% | Disk: ${stats.diskCacheSize} files`,
			);
		}
	}

	/**
	 * Gather all metrics for JSON output
	 */
	private gatherMetrics() {
		const metrics: any = {
			connectionPools: {},
			cacheManagers: {},
		};

		for (const [name, pool] of this.connectionPools) {
			metrics.connectionPools[name] = pool.getStats();
		}

		for (const [name, cache] of this.cacheManagers) {
			metrics.cacheManagers[name] = cache.getStats();
		}

		return metrics;
	}

	/**
	 * Generate performance report
	 */
	async generateReport(options: PerformanceCommandOptions = {}): Promise<void> {
		console.log("📋 Generating Performance Report...\n");

		const metrics = this.gatherMetrics();
		const timestamp = new Date().toISOString();

		if (options.format === "json") {
			console.log(
				JSON.stringify(
					{
						report: true,
						timestamp,
						summary: this.generateSummary(metrics),
						details: metrics,
					},
					null,
					2,
				),
			);
			return;
		}

		console.log("🏷️  Performance Summary");
		console.log("=".repeat(40));

		const summary = this.generateSummary(metrics);
		console.log(`Total Connection Pools: ${summary.totalPools}`);
		console.log(`Total Cache Managers: ${summary.totalCaches}`);
		console.log(`Average Hit Rate: ${summary.avgHitRate.toFixed(1)}%`);
		console.log(`Total Memory Usage: ${summary.totalMemory.toFixed(1)}MB`);

		if (options.detailed) {
			console.log("\n📊 Detailed Metrics:");
			this.displayMetrics({ ...options, format: "table" });
		}

		console.log(`\n📅 Report generated at: ${timestamp}`);
	}

	/**
	 * Generate performance summary
	 */
	private generateSummary(metrics: any) {
		const totalPools = Object.keys(metrics.connectionPools).length;
		const totalCaches = Object.keys(metrics.cacheManagers).length;
		let totalMemory = 0;
		let totalHitRate = 0;
		let cacheCount = 0;

		for (const cache of Object.values(metrics.cacheManagers) as CacheStats[]) {
			totalMemory += cache.memoryUsage;
			totalHitRate += cache.hitRate;
			cacheCount++;
		}

		return {
			totalPools,
			totalCaches,
			totalMemory,
			avgHitRate: cacheCount > 0 ? (totalHitRate / cacheCount) * 100 : 0,
		};
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		this.stopMonitoring();

		// Cleanup connection pools
		for (const [name, pool] of this.connectionPools) {
			await pool.destroy();
			console.log(`🧹 Cleaned up ${name} connection pool`);
		}
		this.connectionPools.clear();

		// Cleanup cache managers
		for (const [name, cache] of this.cacheManagers) {
			await cache.destroy();
			console.log(`🧹 Cleaned up ${name} cache manager`);
		}
		this.cacheManagers.clear();
	}
}

// CLI Command implementations
export async function performanceMonitorCommand(
	options: PerformanceCommandOptions,
): Promise<void> {
	const monitor = new PerformanceMonitor();

	// Add some default monitors for common use cases
	monitor.addConnectionPool("typescript", "typescript");
	monitor.addCacheManager("symbols", "symbols");
	monitor.addCacheManager("general", "general");

	if (options.realTime) {
		await monitor.startMonitoring(options);

		// Handle graceful shutdown
		process.on("SIGINT", async () => {
			console.log("\n🛑 Shutting down performance monitor...");
			await monitor.cleanup();
			process.exit(0);
		});
	} else {
		await monitor.generateReport(options);
		await monitor.cleanup();
	}
}

export async function performanceAnalyzeCommand(
	options: PerformanceCommandOptions,
): Promise<void> {
	console.log("🔍 Analyzing performance bottlenecks...");

	const monitor = new PerformanceMonitor();
	monitor.addConnectionPool("analysis", "custom");
	monitor.addCacheManager("analysis", "general");

	// Run analysis for a short period
	await monitor.startMonitoring({ ...options, interval: 1000 });

	setTimeout(async () => {
		await monitor.generateReport({ ...options, detailed: true });
		await monitor.cleanup();
	}, 10000);
}

export async function performanceReportCommand(
	options: PerformanceCommandOptions,
): Promise<void> {
	const monitor = new PerformanceMonitor();

	// Add comprehensive monitoring
	monitor.addConnectionPool("typescript", "typescript");
	monitor.addConnectionPool("python", "python");
	monitor.addCacheManager("symbols", "symbols");
	monitor.addCacheManager("ast", "ast");

	await monitor.generateReport({ ...options, detailed: true });
	await monitor.cleanup();
}

// Export for use in CLI
export {
	ConnectionPool,
	AdvancedCacheManager,
	createConnectionPool,
	createCacheManager,
};
