/**
 * Swarm Optimizations
 * Export all optimization components
 */

export { ClaudeConnectionPool } from './connection-pool.js';
export type { PoolConfig, PooledConnection } from './connection-pool.js';

export { AsyncFileManager } from './async-file-manager.js';
export type { FileOperationResult } from './async-file-manager.js';

export { CircularBuffer } from './circular-buffer.js';

export { TTLMap } from './ttl-map.js';
export type { TTLMapOptions } from './ttl-map.js';

export { OptimizedExecutor } from './optimized-executor.js';
export type {
  ExecutorConfig,
  ExecutionMetrics as OptimizedExecutionMetrics,
} from './optimized-executor.js';

// Import classes for internal usage
import { ClaudeConnectionPool } from './connection-pool.js';
import { AsyncFileManager } from './async-file-manager.js';
import { OptimizedExecutor } from './optimized-executor.js';

// Re-export commonly used together
export const createOptimizedSwarmStack = (config?: {
  connectionPool?: any;
  executor?: any;
  fileManager?: any;
}) => {
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
