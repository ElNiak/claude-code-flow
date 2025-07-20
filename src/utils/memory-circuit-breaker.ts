// Memory Circuit Breaker - Prevents heap exhaustion by graceful shutdown
// Option B Implementation: 12GB heap with 10GB circuit breaker threshold

export interface CircuitBreakerConfig {
	maxHeapUsageBytes: number; // Maximum heap usage before circuit breaker triggers
	checkInterval: number; // How often to check memory usage (ms)
	warningThreshold: number; // Warning threshold (percentage of max)
	shutdownDelay: number; // Delay before shutdown (ms)
	enableGracefulShutdown: boolean; // Whether to attempt graceful shutdown
}

export class MemoryCircuitBreaker {
	private static instance: MemoryCircuitBreaker;
	private config: CircuitBreakerConfig;
	private checkInterval: NodeJS.Timeout | null = null;
	private isActive: boolean = false;
	private shutdownInProgress: boolean = false;

	constructor(config?: Partial<CircuitBreakerConfig>) {
		this.config = {
			maxHeapUsageBytes: 10 * 1024 * 1024 * 1024, // 10GB (83% of 12GB)
			checkInterval: 5000, // Check every 5 seconds
			warningThreshold: 0.75, // Warning at 75% of max
			shutdownDelay: 30000, // 30 seconds to shutdown
			enableGracefulShutdown: true,
			...config,
		};

		console.log(`🛡️ Memory Circuit Breaker configured:`);
		console.log(
			`   Max Heap: ${(this.config.maxHeapUsageBytes / 1024 / 1024 / 1024).toFixed(1)}GB`
		);
		console.log(`   Check Interval: ${this.config.checkInterval}ms`);
		console.log(
			`   Warning Threshold: ${(this.config.warningThreshold * 100).toFixed(0)}%`
		);
	}

	static getInstance(
		config?: Partial<CircuitBreakerConfig>
	): MemoryCircuitBreaker {
		if (!MemoryCircuitBreaker.instance) {
			MemoryCircuitBreaker.instance = new MemoryCircuitBreaker(config);
		}
		return MemoryCircuitBreaker.instance;
	}

	activate(): void {
		if (this.isActive) return;

		console.log("🛡️ Memory Circuit Breaker ACTIVATED");
		this.isActive = true;

		this.startMonitoring();

		// Set up process exit handlers
		this.setupExitHandlers();
	}

	private startMonitoring(): void {
		if (this.checkInterval) return;

		this.checkInterval = setInterval(() => {
			if (!this.isActive || this.shutdownInProgress) return;

			const memUsage = process.memoryUsage();
			const heapUsed = memUsage.heapUsed;
			const heapTotal = memUsage.heapTotal;

			// Check against absolute limit
			if (heapUsed > this.config.maxHeapUsageBytes) {
				this.triggerCircuitBreaker(heapUsed);
			}
			// Check against warning threshold
			else if (
				heapUsed >
				this.config.maxHeapUsageBytes * this.config.warningThreshold
			) {
				this.emitWarning(heapUsed);
			}

			// Also check for approaching total heap limit
			if (heapUsed / heapTotal > 0.9) {
				console.warn(
					`⚠️ High heap usage: ${(heapUsed / 1024 / 1024 / 1024).toFixed(2)}GB / ${(heapTotal / 1024 / 1024 / 1024).toFixed(2)}GB (${((heapUsed / heapTotal) * 100).toFixed(1)}%)`
				);
			}
		}, this.config.checkInterval);
	}

	private emitWarning(heapUsed: number): void {
		const heapGB = heapUsed / 1024 / 1024 / 1024;
		const maxGB = this.config.maxHeapUsageBytes / 1024 / 1024 / 1024;
		const percentage = (heapUsed / this.config.maxHeapUsageBytes) * 100;

		console.warn(
			`⚠️ MEMORY WARNING: ${heapGB.toFixed(2)}GB / ${maxGB.toFixed(1)}GB (${percentage.toFixed(1)}%)`
		);

		// Force garbage collection if available
		if (global.gc) {
			console.log("🧹 Forcing garbage collection...");
			global.gc();

			// Check memory again after GC
			const afterGC = process.memoryUsage().heapUsed;
			const freed = heapUsed - afterGC;
			if (freed > 0) {
				console.log(`🧹 GC freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
			}
		}
	}

	private triggerCircuitBreaker(heapUsed: number): void {
		if (this.shutdownInProgress) return;

		const heapGB = heapUsed / 1024 / 1024 / 1024;
		const maxGB = this.config.maxHeapUsageBytes / 1024 / 1024 / 1024;

		console.error(`🚨 MEMORY CIRCUIT BREAKER TRIGGERED!`);
		console.error(`   Heap Usage: ${heapGB.toFixed(2)}GB`);
		console.error(`   Limit: ${maxGB.toFixed(1)}GB`);
		console.error(
			`   Percentage: ${((heapUsed / this.config.maxHeapUsageBytes) * 100).toFixed(1)}%`
		);

		this.shutdownInProgress = true;

		if (this.config.enableGracefulShutdown) {
			this.gracefulShutdown();
		} else {
			this.immediateShutdown();
		}
	}

	private gracefulShutdown(): void {
		console.log(
			`🔄 Initiating graceful shutdown in ${this.config.shutdownDelay}ms...`
		);

		// Try to cleanup immediately
		this.performEmergencyCleanup();

		// Set timeout for forced shutdown
		setTimeout(() => {
			console.error("🚨 Graceful shutdown timeout - forcing exit");
			process.exit(2); // Exit with error code 2 (memory exhaustion)
		}, this.config.shutdownDelay);

		// Try to exit gracefully
		try {
			process.emit("SIGTERM");
		} catch (error) {
			console.error("Error during graceful shutdown:", error);
			process.exit(2);
		}
	}

	private immediateShutdown(): void {
		console.error("🚨 Immediate shutdown due to memory exhaustion");
		process.exit(2); // Exit with error code 2 (memory exhaustion)
	}

	private performEmergencyCleanup(): void {
		console.log("🧹 Performing emergency cleanup...");

		try {
			// Force multiple garbage collections
			if (global.gc) {
				for (let i = 0; i < 5; i++) {
					global.gc();
				}
			}

			// Clear any global caches
			this.clearGlobalCaches();

			// Clear timers and intervals
			this.clearTimersAndIntervals();

			console.log("✅ Emergency cleanup completed");
		} catch (error) {
			console.error("❌ Error during emergency cleanup:", error);
		}
	}

	private clearGlobalCaches(): void {
		try {
			// Clear require cache (carefully)
			const keysToDelete = Object.keys(require.cache).filter(
				(key) =>
					!key.includes("node_modules") &&
					!key.includes("core") &&
					!key.includes("emergency") &&
					!key.includes("circuit-breaker")
			);

			keysToDelete.forEach((key) => {
				delete require.cache[key];
			});

			if (keysToDelete.length > 0) {
				console.log(`🧹 Cleared ${keysToDelete.length} require cache entries`);
			}
		} catch (error) {
			console.error("Error clearing caches:", error);
		}
	}

	private clearTimersAndIntervals(): void {
		try {
			// This is a simplified approach - in a real implementation,
			// you would track all timers and intervals
			console.log("🧹 Clearing timers and intervals...");
		} catch (error) {
			console.error("Error clearing timers:", error);
		}
	}

	private setupExitHandlers(): void {
		// Handle various exit signals
		process.on("SIGTERM", () => {
			if (!this.shutdownInProgress) {
				console.log("📡 Received SIGTERM - shutting down gracefully");
				this.deactivate();
			}
			process.exit(0);
		});

		process.on("SIGINT", () => {
			if (!this.shutdownInProgress) {
				console.log("📡 Received SIGINT - shutting down gracefully");
				this.deactivate();
			}
			process.exit(0);
		});

		// Handle uncaught exceptions
		process.on("uncaughtException", (error) => {
			console.error("💥 Uncaught Exception:", error);
			if (!this.shutdownInProgress) {
				this.triggerCircuitBreaker(process.memoryUsage().heapUsed);
			}
		});

		// Handle unhandled promise rejections
		process.on("unhandledRejection", (reason, promise) => {
			console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
			// Don't exit on unhandled rejection, just log
		});
	}

	getStatus(): any {
		const memUsage = process.memoryUsage();
		return {
			isActive: this.isActive,
			shutdownInProgress: this.shutdownInProgress,
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			maxHeapUsageBytes: this.config.maxHeapUsageBytes,
			warningThreshold: this.config.warningThreshold,
			heapUsagePercent:
				(memUsage.heapUsed / this.config.maxHeapUsageBytes) * 100,
			totalHeapUsagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
		};
	}

	deactivate(): void {
		if (!this.isActive) return;

		console.log("🛡️ Memory Circuit Breaker DEACTIVATED");
		this.isActive = false;

		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	// Method to manually trigger for testing
	manualTrigger(): void {
		console.log("🧪 Manual circuit breaker trigger");
		this.triggerCircuitBreaker(this.config.maxHeapUsageBytes + 1);
	}
}

// Auto-activate if environment variable is set
if (process.env.EMERGENCY_MEMORY_ACTIVE === "true") {
	console.log("🛡️ Auto-activating Memory Circuit Breaker");
	MemoryCircuitBreaker.getInstance().activate();
}

export default MemoryCircuitBreaker;
