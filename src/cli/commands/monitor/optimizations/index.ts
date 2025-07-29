/**
 * Swarm Optimizations
 * Export all optimization components
 */

export type { FileOperationResult } from "./async-file-manager.js";
export { AsyncFileManager } from "./async-file-manager.js";
export { CircularBuffer } from "./circular-buffer.js";
export type { PoolConfig, PooledConnection } from "./connection-pool.js";
export {
	ClaudeConnectionPool,
	createOptimizedConnectionPool,
} from "./connection-pool.js";
export type {
	ExecutorConfig,
	OptimizedExecutionMetrics,
} from "./optimized-executor.js";
export { OptimizedExecutor } from "./optimized-executor.js";
export type { TTLMapOptions } from "./ttl-map.js";
export { TTLMap } from "./ttl-map.js";

// Re-export commonly used together,
export const createOptimizedSwarmStack = async (config?: {
	connectionPool?: any;
	executor?: any;
	fileManager?: any;
}) => {
	// Import classes at runtime to avoid circular dependency issues
	const { ClaudeConnectionPool } = await import("./connection-pool.js");
	const { AsyncFileManager } = await import("./async-file-manager.js");
	const { OptimizedExecutor } = await import("./optimized-executor.js");

	const connectionPool = new ClaudeConnectionPool(config?.connectionPool);
	const fileManager = new AsyncFileManager(config?.fileManager);
	const executor = new OptimizedExecutor({
		...config?.executor,
		connectionPool: config?.connectionPool,
		fileOperations: config?.fileManager,
	});

	return {
		connectionPool,
		fileManager,
		executor,
		shutdown: async () => {
			await executor.shutdown();
			await fileManager.waitForPendingOperations();
			await connectionPool.drain();
		},
	};
};
