// Node.js Memory Optimizer
// HIGH PRIORITY - Immediate implementation for V8 heap optimization

import * as os from "os";
import { EmergencyMemoryManager } from "./emergency-memory-limits.js";

export interface MemoryConfig {
	maxOldSpaceSize: number;
	maxSemiSpaceSize: number;
	initialOldSpaceSize: number;
	maxExecutableSize: number;
	gcStrategy: "throughput" | "balanced" | "latency";
	threadPoolSize: number;
	enableGC: boolean;
	incrementalMarking: boolean;
	optimizeForSize: boolean;
}

export interface MemoryOptimizerOptions {
	expectedAgents?: number;
	systemMemoryGB?: number;
	forceStrategy?: "throughput" | "balanced" | "latency";
	enableEmergencyManager?: boolean;
}

export class NodeMemoryOptimizer {
	private config: MemoryConfig;
	private emergencyManager: EmergencyMemoryManager | undefined;
	private monitoring: boolean = false;

	constructor(options: MemoryOptimizerOptions = {}) {
		this.config = this.determineOptimalConfig(options);

		if (options.enableEmergencyManager !== false) {
			this.emergencyManager = EmergencyMemoryManager.getInstance();
			this.emergencyManager.activate();
		}
	}

	private determineOptimalConfig(
		options: MemoryOptimizerOptions,
	): MemoryConfig {
		const systemMemoryBytes = os.totalmem();
		const systemMemoryGB = systemMemoryBytes / (1024 * 1024 * 1024);
		const systemCores = os.cpus().length;
		const agentCount = options.expectedAgents || 8;

		console.log(`🧠 System Analysis:`);
		console.log(`   Memory: ${systemMemoryGB.toFixed(1)}GB`);
		console.log(`   Cores: ${systemCores}`);
		console.log(`   Expected Agents: ${agentCount}`);

		// Calculate optimal heap size (60% of system memory, max 12GB for Option B)
		const maxHeapSizeGB = Math.min(systemMemoryGB * 0.6, 12);
		const maxHeapSizeMB = Math.floor(maxHeapSizeGB * 1024);

		const config: MemoryConfig = {
			maxOldSpaceSize: maxHeapSizeMB,
			maxSemiSpaceSize: Math.min(192, Math.floor(maxHeapSizeMB / 64)), // 1/64 of heap, max 192MB
			initialOldSpaceSize: Math.floor(maxHeapSizeMB / 4), // 25% of max heap
			maxExecutableSize: Math.min(2048, Math.floor(maxHeapSizeMB / 8)), // 1/8 of heap, max 2048MB
			gcStrategy: this.determineGCStrategy(agentCount),
			threadPoolSize: Math.min(16, systemCores * 2), // 2x CPU cores, max 16
			enableGC: true,
			incrementalMarking: true,
			optimizeForSize: systemMemoryGB < 12, // < 12GB system memory
		};

		console.log(`🎯 Optimal Configuration:`);
		console.log(`   Max Heap: ${config.maxOldSpaceSize}MB`);
		console.log(`   Semi Space: ${config.maxSemiSpaceSize}MB`);
		console.log(`   Initial Heap: ${config.initialOldSpaceSize}MB`);
		console.log(`   GC Strategy: ${config.gcStrategy}`);
		console.log(`   Thread Pool: ${config.threadPoolSize}`);

		return config;
	}

	private determineGCStrategy(
		agentCount: number,
	): "throughput" | "balanced" | "latency" {
		if (agentCount <= 4) {
			return "throughput"; // Optimize for maximum throughput
		} else if (agentCount <= 8) {
			return "balanced"; // Balance between throughput and latency
		} else {
			return "latency"; // Optimize for low latency
		}
	}

	generateNodeFlags(): string[] {
		const flags = [
			`--max-old-space-size=${this.config.maxOldSpaceSize}`,
			`--max-semi-space-size=${this.config.maxSemiSpaceSize}`,
			`--initial-old-space-size=${this.config.initialOldSpaceSize}`,
			`--max-executable-size=${this.config.maxExecutableSize}`,
		];

		if (this.config.enableGC) {
			flags.push("--expose-gc");
		}

		if (this.config.incrementalMarking) {
			flags.push("--incremental-marking");
		}

		if (this.config.optimizeForSize) {
			flags.push("--optimize-for-size");
		}

		// GC strategy specific flags
		switch (this.config.gcStrategy) {
			case "throughput":
				flags.push("--gc-interval=100");
				break;
			case "balanced":
				flags.push("--gc-interval=50");
				flags.push("--concurrent-marking");
				break;
			case "latency":
				flags.push("--gc-interval=25");
				flags.push("--concurrent-marking");
				flags.push("--concurrent-sweeping");
				break;
		}

		return flags;
	}

	setupEnvironment(): void {
		console.log("🔧 Setting up optimized Node.js environment...");

		// Set UV_THREADPOOL_SIZE for libuv thread pool
		process.env.UV_THREADPOOL_SIZE = this.config.threadPoolSize.toString();

		// Ensure production mode for memory optimization
		if (!process.env.NODE_ENV) {
			process.env.NODE_ENV = "production";
		}

		// Set memory-related environment variables
		process.env.NODE_OPTIONS = this.generateNodeFlags().join(" ");

		console.log(`✅ Environment configured:`);
		console.log(`   UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE}`);
		console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
		console.log(`   NODE_OPTIONS: ${process.env.NODE_OPTIONS}`);

		// Start monitoring
		this.startMonitoring();
	}

	private startMonitoring(): void {
		if (this.monitoring) return;

		this.monitoring = true;

		// Log initial memory status
		this.logMemoryStatus();

		// Set up periodic monitoring
		setInterval(() => {
			this.logMemoryStatus();
			this.checkMemoryHealth();
		}, 30000); // Every 30 seconds
	}

	private logMemoryStatus(): void {
		const memUsage = process.memoryUsage();
		const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

		console.log(
			`📊 Memory Status: ${heapPercent.toFixed(1)}% (${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB)`,
		);

		if (heapPercent > 80) {
			console.warn(`⚠️ High memory usage detected: ${heapPercent.toFixed(1)}%`);
		}
	}

	private checkMemoryHealth(): void {
		const memUsage = process.memoryUsage();
		const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

		// Trigger emergency measures if memory is critically high
		if (heapPercent > 90) {
			console.error(`🚨 Critical memory usage: ${heapPercent.toFixed(1)}%`);
			this.triggerEmergencyGC();
		}
	}

	private triggerEmergencyGC(): void {
		if (global.gc) {
			console.log("🆘 Triggering emergency garbage collection...");
			const before = process.memoryUsage().heapUsed;
			global.gc();
			const after = process.memoryUsage().heapUsed;
			const freed = before - after;

			if (freed > 0) {
				console.log(
					`🧹 Emergency GC freed ${(freed / 1024 / 1024).toFixed(2)}MB`,
				);
			}
		}
	}

	getConfig(): MemoryConfig {
		return { ...this.config };
	}

	getMemoryStatus(): any {
		const memUsage = process.memoryUsage();
		return {
			config: this.config,
			current: {
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				heapPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
				external: memUsage.external,
				rss: memUsage.rss,
				arrayBuffers: memUsage.arrayBuffers,
			},
			emergencyManager: this.emergencyManager?.getMemoryStatus(),
		};
	}

	// Method to be called before spawning agents
	optimizeForAgents(agentCount: number): void {
		console.log(`🤖 Optimizing for ${agentCount} agents...`);

		// Adjust GC strategy based on agent count
		const newStrategy = this.determineGCStrategy(agentCount);
		if (newStrategy !== this.config.gcStrategy) {
			console.log(
				`🔄 Updating GC strategy from ${this.config.gcStrategy} to ${newStrategy}`,
			);
			this.config.gcStrategy = newStrategy;
		}

		// Trigger proactive GC before spawning
		if (global.gc) {
			console.log("🧹 Proactive GC before agent spawning...");
			global.gc();
		}

		// Update emergency manager limits
		if (this.emergencyManager) {
			// Reduce limits if we have more agents
			const agentMultiplier = Math.max(0.5, 1 - (agentCount - 4) * 0.1);
			console.log(
				`📉 Adjusting memory limits with multiplier: ${agentMultiplier.toFixed(2)}`,
			);
		}
	}
}

// Auto-optimization based on current system state
export function createOptimizedNodeEnvironment(
	options: MemoryOptimizerOptions = {},
): NodeMemoryOptimizer {
	console.log("🚀 Creating optimized Node.js environment...");

	const optimizer = new NodeMemoryOptimizer(options);
	optimizer.setupEnvironment();

	return optimizer;
}

// Export for immediate use
export default NodeMemoryOptimizer;
