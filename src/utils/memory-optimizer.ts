import { getErrorMessage as _getErrorMessage } from "./error-handler.js";
/**
 * Memory Optimizer with garbage collection triggers and monitoring
 */

import type { ILogger } from "../core/logger.js";
import {
	EnhancedErrorHandler,
	ErrorSeverity,
} from "./enhanced-error-handler.js";

export interface MemoryThresholds {
	heapUsed: number; // MB
	heapTotal: number; // MB
	external: number; // MB
	arrayBuffers: number; // MB
	rss: number; // MB
}

export interface MemoryMetrics {
	heapUsed: number;
	heapTotal: number;
	external: number;
	arrayBuffers: number;
	rss: number;
	gcStats: {
		minorGCs: number;
		majorGCs: number;
		incrementalGCs: number;
		totalGCTime: number;
		lastGCTime: number;
	};
	memoryLeaks: Array<{
		type: string;
		size: number;
		timestamp: Date;
		stackTrace?: string;
	}>;
}

export interface MemoryOptimizationStrategy {
	name: string;
	priority: number;
	canExecute: (metrics: MemoryMetrics) => boolean;
	execute: () => Promise<boolean>;
}

export class MemoryOptimizer {
	private monitoringInterval?: NodeJS.Timeout;
	private optimizationStrategies: MemoryOptimizationStrategy[] = [];
	private metrics: MemoryMetrics = {
		heapUsed: 0,
		heapTotal: 0,
		external: 0,
		arrayBuffers: 0,
		rss: 0,
		gcStats: {
			minorGCs: 0,
			majorGCs: 0,
			incrementalGCs: 0,
			totalGCTime: 0,
			lastGCTime: 0,
		},
		memoryLeaks: [],
	};

	private memorySnapshots: Array<{
		timestamp: Date;
		metrics: MemoryMetrics;
	}> = [];

	private readonly defaultThresholds: MemoryThresholds = {
		heapUsed: 500, // 500MB
		heapTotal: 1000, // 1GB
		external: 200, // 200MB
		arrayBuffers: 100, // 100MB
		rss: 1500, // 1.5GB
	};

	constructor(
		private logger: ILogger,
		private thresholds: MemoryThresholds = {} as MemoryThresholds,
		private errorHandler?: EnhancedErrorHandler
	) {
		// Merge with default thresholds
		this.thresholds = { ...this.defaultThresholds, ...thresholds };

		// Register default optimization strategies
		this.registerDefaultStrategies();
	}

	/**
	 * Start memory monitoring
	 */
	startMonitoring(intervalMs: number = 30000): void {
		if (this.monitoringInterval) {
			this.stopMonitoring();
		}

		this.logger.info("Starting memory monitoring", {
			interval: intervalMs,
			thresholds: this.thresholds,
		});

		this.monitoringInterval = setInterval(() => {
			this.checkMemoryUsage();
		}, intervalMs);

		// Initial check
		this.checkMemoryUsage();
	}

	/**
	 * Stop memory monitoring
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
			this.logger.info("Memory monitoring stopped");
		}
	}

	/**
	 * Force garbage collection if available
	 */
	forceGarbageCollection(): boolean {
		if (global.gc) {
			const before = process.memoryUsage();
			const startTime = Date.now();

			global.gc();

			const after = process.memoryUsage();
			const duration = Date.now() - startTime;

			this.metrics.gcStats.totalGCTime += duration;
			this.metrics.gcStats.lastGCTime = startTime;
			this.metrics.gcStats.majorGCs++;

			const freed = before.heapUsed - after.heapUsed;

			this.logger.info("Manual garbage collection completed", {
				freedMemory: Math.round(freed / 1024 / 1024),
				duration,
				before: this.formatMemoryUsage(before),
				after: this.formatMemoryUsage(after),
			});

			return true;
		}

		this.logger.warn("Garbage collection not available");
		return false;
	}

	/**
	 * Optimize memory usage
	 */
	async optimizeMemory(): Promise<boolean> {
		const startTime = Date.now();
		this.logger.info("Starting memory optimization");

		let optimized = false;

		// Sort strategies by priority
		const sortedStrategies = [...this.optimizationStrategies].sort(
			(a, b) => b.priority - a.priority
		);

		for (const strategy of sortedStrategies) {
			if (strategy.canExecute(this.metrics)) {
				try {
					const success = await strategy.execute();
					if (success) {
						optimized = true;
						this.logger.info("Memory optimization strategy executed", {
							strategy: strategy.name,
							duration: Date.now() - startTime,
						});
					}
				} catch (error) {
					this.logger.error("Memory optimization strategy failed", {
						strategy: strategy.name,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}

		// Force GC as final step
		if (optimized || this.shouldForceGC()) {
			this.forceGarbageCollection();
		}

		this.logger.info("Memory optimization completed", {
			optimized,
			duration: Date.now() - startTime,
			finalMemory: this.formatMemoryUsage(process.memoryUsage()),
		});

		return optimized;
	}

	/**
	 * Register a memory optimization strategy
	 */
	registerOptimizationStrategy(strategy: MemoryOptimizationStrategy): void {
		this.optimizationStrategies.push(strategy);
		this.optimizationStrategies.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Get current memory metrics
	 */
	getMetrics(): MemoryMetrics {
		this.updateMetrics();
		return JSON.parse(JSON.stringify(this.metrics));
	}

	/**
	 * Get memory usage summary
	 */
	getMemoryUsageSummary(): {
		current: MemoryMetrics;
		thresholds: MemoryThresholds;
		status: "healthy" | "warning" | "critical";
		recommendations: string[];
	} {
		const current = this.getMetrics();
		const status = this.getMemoryStatus(current);
		const recommendations = this.getRecommendations(current);

		return {
			current,
			thresholds: this.thresholds,
			status,
			recommendations,
		};
	}

	/**
	 * Detect potential memory leaks
	 */
	detectMemoryLeaks(): Array<{
		type: string;
		severity: "low" | "medium" | "high";
		description: string;
		recommendation: string;
	}> {
		const leaks: Array<{
			type: string;
			severity: "low" | "medium" | "high";
			description: string;
			recommendation: string;
		}> = [];

		// Check for consistent memory growth
		if (this.memorySnapshots.length >= 5) {
			const recent = this.memorySnapshots.slice(-5);
			const growthRate = this.calculateGrowthRate(recent);

			if (growthRate > 0.1) {
				// 10% growth
				leaks.push({
					type: "memory_growth",
					severity: "high",
					description: `Memory usage growing at ${(growthRate * 100).toFixed(2)}% per interval`,
					recommendation: "Investigate object retention and optimize cleanup",
				});
			}
		}

		// Check for high external memory
		if (this.metrics.external > this.thresholds.external * 0.8) {
			leaks.push({
				type: "external_memory",
				severity: "medium",
				description: `High external memory usage: ${Math.round(this.metrics.external)}MB`,
				recommendation: "Review Buffer and ArrayBuffer usage",
			});
		}

		// Check for high array buffer usage
		if (this.metrics.arrayBuffers > this.thresholds.arrayBuffers * 0.8) {
			leaks.push({
				type: "array_buffers",
				severity: "medium",
				description: `High ArrayBuffer usage: ${Math.round(this.metrics.arrayBuffers)}MB`,
				recommendation: "Review ArrayBuffer cleanup and disposal",
			});
		}

		return leaks;
	}

	/**
	 * Create memory snapshot
	 */
	createSnapshot(): void {
		const snapshot = {
			timestamp: new Date(),
			metrics: this.getMetrics(),
		};

		this.memorySnapshots.push(snapshot);

		// Keep only last 50 snapshots
		if (this.memorySnapshots.length > 50) {
			this.memorySnapshots.shift();
		}
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.stopMonitoring();
		this.memorySnapshots.length = 0;
		this.optimizationStrategies.length = 0;
	}

	private checkMemoryUsage(): void {
		this.updateMetrics();
		this.createSnapshot();

		const status = this.getMemoryStatus(this.metrics);

		if (status === "critical") {
			this.logger.error("Critical memory usage detected", {
				metrics: this.formatMemoryUsage(process.memoryUsage()),
				thresholds: this.thresholds,
			});

			// Trigger immediate optimization
			this.optimizeMemory().catch((error) => {
				this.logger.error("Emergency memory optimization failed", error);
			});
		} else if (status === "warning") {
			this.logger.warn("High memory usage detected", {
				metrics: this.formatMemoryUsage(process.memoryUsage()),
				thresholds: this.thresholds,
			});
		}

		// Check for memory leaks
		const leaks = this.detectMemoryLeaks();
		if (leaks.length > 0) {
			this.logger.warn("Potential memory leaks detected", { leaks });
		}
	}

	private updateMetrics(): void {
		const memUsage = process.memoryUsage();

		this.metrics.heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
		this.metrics.heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
		this.metrics.external = Math.round(memUsage.external / 1024 / 1024);
		this.metrics.arrayBuffers = Math.round(memUsage.arrayBuffers / 1024 / 1024);
		this.metrics.rss = Math.round(memUsage.rss / 1024 / 1024);
	}

	private getMemoryStatus(
		metrics: MemoryMetrics
	): "healthy" | "warning" | "critical" {
		// Check critical thresholds
		if (
			metrics.heapUsed > this.thresholds.heapUsed ||
			metrics.heapTotal > this.thresholds.heapTotal ||
			metrics.rss > this.thresholds.rss
		) {
			return "critical";
		}

		// Check warning thresholds (80% of limits)
		if (
			metrics.heapUsed > this.thresholds.heapUsed * 0.8 ||
			metrics.heapTotal > this.thresholds.heapTotal * 0.8 ||
			metrics.rss > this.thresholds.rss * 0.8
		) {
			return "warning";
		}

		return "healthy";
	}

	private getRecommendations(metrics: MemoryMetrics): string[] {
		const recommendations: string[] = [];

		if (metrics.heapUsed > this.thresholds.heapUsed * 0.7) {
			recommendations.push(
				"Consider increasing heap size or optimizing object lifecycle"
			);
		}

		if (metrics.external > this.thresholds.external * 0.7) {
			recommendations.push(
				"Review external memory usage (Buffers, ArrayBuffers)"
			);
		}

		if (metrics.arrayBuffers > this.thresholds.arrayBuffers * 0.7) {
			recommendations.push("Optimize ArrayBuffer usage and cleanup");
		}

		if (this.metrics.gcStats.majorGCs > 10) {
			recommendations.push(
				"High GC activity detected - consider object pooling"
			);
		}

		return recommendations;
	}

	private shouldForceGC(): boolean {
		return this.metrics.heapUsed > this.thresholds.heapUsed * 0.6;
	}

	private calculateGrowthRate(
		snapshots: Array<{ timestamp: Date; metrics: MemoryMetrics }>
	): number {
		if (snapshots.length < 2) return 0;

		const first = snapshots[0].metrics.heapUsed;
		const last = snapshots[snapshots.length - 1].metrics.heapUsed;

		return last > first ? (last - first) / first : 0;
	}

	private formatMemoryUsage(
		memUsage: NodeJS.MemoryUsage
	): Record<string, string> {
		return {
			heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
			heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
			external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
			arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)}MB`,
			rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
		};
	}

	private registerDefaultStrategies(): void {
		// Cache cleanup strategy
		this.registerOptimizationStrategy({
			name: "cache-cleanup",
			priority: 100,
			canExecute: (metrics) =>
				metrics.heapUsed > this.thresholds.heapUsed * 0.7,
			execute: async () => {
				// Implement cache cleanup logic
				this.logger.info("Executing cache cleanup strategy");

				// Simulate cache cleanup
				await new Promise((resolve) => setTimeout(resolve, 100));

				return true;
			},
		});

		// Object pool optimization
		this.registerOptimizationStrategy({
			name: "object-pool-optimization",
			priority: 90,
			canExecute: (metrics) => metrics.gcStats.majorGCs > 5,
			execute: async () => {
				this.logger.info("Executing object pool optimization strategy");

				// Simulate object pool cleanup
				await new Promise((resolve) => setTimeout(resolve, 100));

				return true;
			},
		});

		// External memory cleanup
		this.registerOptimizationStrategy({
			name: "external-memory-cleanup",
			priority: 80,
			canExecute: (metrics) =>
				metrics.external > this.thresholds.external * 0.7,
			execute: async () => {
				this.logger.info("Executing external memory cleanup strategy");

				// Simulate external memory cleanup
				await new Promise((resolve) => setTimeout(resolve, 100));

				return true;
			},
		});

		// Emergency GC strategy
		this.registerOptimizationStrategy({
			name: "emergency-gc",
			priority: 70,
			canExecute: (metrics) =>
				metrics.heapUsed > this.thresholds.heapUsed * 0.9,
			execute: async () => {
				this.logger.info("Executing emergency GC strategy");
				return this.forceGarbageCollection();
			},
		});
	}
}

/**
 * Global memory optimizer instance
 */
let globalMemoryOptimizer: MemoryOptimizer | null = null;

export function initializeGlobalMemoryOptimizer(
	logger: ILogger,
	thresholds?: MemoryThresholds,
	errorHandler?: EnhancedErrorHandler
): MemoryOptimizer {
	if (!globalMemoryOptimizer) {
		globalMemoryOptimizer = new MemoryOptimizer(
			logger,
			thresholds,
			errorHandler
		);
	}
	return globalMemoryOptimizer;
}

export function getGlobalMemoryOptimizer(): MemoryOptimizer {
	if (!globalMemoryOptimizer) {
		throw new Error("Global memory optimizer not initialized");
	}
	return globalMemoryOptimizer;
}

/**
 * Decorator for memory-aware operations
 */
export function memoryOptimized(
	options: {
		checkBefore?: boolean;
		checkAfter?: boolean;
		forceGC?: boolean;
	} = {}
) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const optimizer = getGlobalMemoryOptimizer();

			// Check memory before operation
			if (options.checkBefore) {
				const status = optimizer.getMemoryUsageSummary().status;
				if (status === "critical") {
					await optimizer.optimizeMemory();
				}
			}

			// Execute original method
			const result = await originalMethod.apply(this, args);

			// Check memory after operation
			if (options.checkAfter) {
				const status = optimizer.getMemoryUsageSummary().status;
				if (status === "critical") {
					await optimizer.optimizeMemory();
				}
			}

			// Force GC if requested
			if (options.forceGC) {
				optimizer.forceGarbageCollection();
			}

			return result;
		};

		return descriptor;
	};
}
