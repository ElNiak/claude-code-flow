/**
 * Memory Coordinator - Unified interface for all memory systems
 * Provides intelligent selection and seamless integration across memory backends
 */

import type { 
  ILogger, 
  IEventBus, 
  MemoryEntry, 
  MemoryQuery, 
  MemoryConfig 
} from '../../utils/types.js';
import type { IMemoryManager } from '../../memory/manager.js';
import { MemoryManager } from '../../memory/manager.js';
import { DistributedMemory } from '../../memory/distributed-memory.js';
import { SwarmMemory } from '../../memory/swarm-memory.js';
import { MemoryError } from '../../utils/errors.js';

export interface MemoryCoordinatorConfig {
  primary: MemoryConfig;
  swarm?: {
    enabled: boolean;
    topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
    syncInterval: number;
    conflictResolution: 'timestamp' | 'priority' | 'merge';
  };
  distributed?: {
    enabled: boolean;
    nodes: string[];
    replicationFactor: number;
    consistencyLevel: 'eventual' | 'strong' | 'bounded';
  };
  performance?: {
    enableIntelligentCaching: boolean;
    predictivePreloading: boolean;
    compressionEnabled: boolean;
    batchOperations: boolean;
  };
}

export interface MemoryContext {
  agentId?: string;
  sessionId?: string;
  swarmId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  namespace?: string;
  coordination: boolean;
  distributed: boolean;
  metadata?: Record<string, unknown>;
}

export interface MemoryOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics: {
    duration: number;
    backendUsed: string;
    cacheHit?: boolean;
    replicationStatus?: string;
  };
}

/**
 * Intelligent Memory Coordinator
 * Routes memory operations to optimal backends based on context
 */
export class MemoryCoordinator {
  private primaryManager: IMemoryManager;
  private swarmMemory?: SwarmMemory;
  private distributedMemory?: DistributedMemory;
  private initialized = false;
  private performanceCache = new Map<string, any>();
  private operationMetrics = new Map<string, number[]>();

  constructor(
    private config: MemoryCoordinatorConfig,
    private eventBus: IEventBus,
    private logger: ILogger,
  ) {
    // Initialize primary memory manager
    this.primaryManager = new MemoryManager(
      this.config.primary,
      this.eventBus,
      this.logger,
    );

    // Initialize swarm memory if enabled
    if (this.config.swarm?.enabled) {
      this.swarmMemory = new SwarmMemory(
        this.config.swarm,
        this.eventBus,
        this.logger,
      );
    }

    // Initialize distributed memory if enabled
    if (this.config.distributed?.enabled) {
      this.distributedMemory = new DistributedMemory(
        this.config.distributed,
        this.eventBus,
        this.logger,
      );
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing Memory Coordinator...');

    try {
      // Initialize primary manager
      await this.primaryManager.initialize();

      // Initialize swarm memory
      if (this.swarmMemory) {
        await this.swarmMemory.initialize();
        this.logger.info('Swarm memory initialized');
      }

      // Initialize distributed memory
      if (this.distributedMemory) {
        await this.distributedMemory.initialize();
        this.logger.info('Distributed memory initialized');
      }

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      this.initialized = true;
      this.logger.info('Memory Coordinator initialized successfully');
      
      this.eventBus.emit('memory-coordinator:ready', { timestamp: new Date() });
    } catch (error) {
      this.logger.error('Failed to initialize Memory Coordinator', error);
      throw new MemoryError('Memory Coordinator initialization failed', { error });
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.info('Shutting down Memory Coordinator...');

    try {
      // Shutdown in reverse order
      if (this.distributedMemory) {
        await this.distributedMemory.shutdown();
      }

      if (this.swarmMemory) {
        await this.swarmMemory.shutdown();
      }

      await this.primaryManager.shutdown();

      this.initialized = false;
      this.logger.info('Memory Coordinator shutdown complete');
    } catch (error) {
      this.logger.error('Error during Memory Coordinator shutdown', error);
      throw error;
    }
  }

  /**
   * Intelligent store operation with optimal backend selection
   */
  async store(entry: MemoryEntry, context: MemoryContext): Promise<MemoryOperationResult> {
    const startTime = Date.now();
    const backend = this.selectOptimalBackend('store', context);

    try {
      this.logger.debug('Storing memory entry', { 
        id: entry.id, 
        backend, 
        context: context.namespace,
      });

      let result: any;

      switch (backend) {
        case 'swarm':
          if (!this.swarmMemory) {
            throw new MemoryError('Swarm memory not available');
          }
          result = await this.swarmMemory.store(entry, context);
          break;

        case 'distributed':
          if (!this.distributedMemory) {
            throw new MemoryError('Distributed memory not available');
          }
          result = await this.distributedMemory.store(entry, context);
          break;

        case 'primary':
        default:
          await this.primaryManager.store(entry);
          result = { success: true };
          break;
      }

      // Handle cross-system replication if needed
      if (context.coordination && backend !== 'swarm' && this.swarmMemory) {
        await this.swarmMemory.store(entry, context).catch(error => {
          this.logger.warn('Failed to replicate to swarm memory', { error });
        });
      }

      const duration = Date.now() - startTime;
      this.recordMetrics('store', backend, duration);

      this.eventBus.emit('memory-coordinator:stored', { entry, backend, duration });

      return {
        success: true,
        data: result,
        metrics: {
          duration,
          backendUsed: backend,
          replicationStatus: context.coordination ? 'replicated' : 'single',
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to store memory entry', { 
        id: entry.id, 
        backend, 
        error,
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          duration,
          backendUsed: backend,
        },
      };
    }
  }

  /**
   * Intelligent retrieve operation with fallback strategy
   */
  async retrieve(id: string, context: MemoryContext): Promise<MemoryOperationResult> {
    const startTime = Date.now();
    let backend = this.selectOptimalBackend('retrieve', context);

    try {
      this.logger.debug('Retrieving memory entry', { id, backend });

      let result: MemoryEntry | undefined;
      let cacheHit = false;

      // Check performance cache first
      if (this.config.performance?.enableIntelligentCaching) {
        const cached = this.performanceCache.get(id);
        if (cached && this.isCacheValid(cached)) {
          result = cached.entry;
          cacheHit = true;
          backend = 'cache';
        }
      }

      if (!result) {
        // Try primary backend first
        switch (backend) {
          case 'swarm':
            if (this.swarmMemory) {
              result = await this.swarmMemory.retrieve(id, context);
            }
            break;

          case 'distributed':
            if (this.distributedMemory) {
              result = await this.distributedMemory.retrieve(id, context);
            }
            break;

          case 'primary':
          default:
            result = await this.primaryManager.retrieve(id);
            break;
        }

        // Fallback strategy if not found
        if (!result) {
          result = await this.fallbackRetrieve(id, context);
          if (result) {
            backend = 'fallback';
          }
        }

        // Cache successful retrieval
        if (result && this.config.performance?.enableIntelligentCaching) {
          this.performanceCache.set(id, {
            entry: result,
            timestamp: Date.now(),
            accessCount: 1,
          });
        }
      }

      const duration = Date.now() - startTime;
      this.recordMetrics('retrieve', backend, duration);

      if (result) {
        this.eventBus.emit('memory-coordinator:retrieved', { id, backend, duration });
        return {
          success: true,
          data: result,
          metrics: {
            duration,
            backendUsed: backend,
            cacheHit,
          },
        };
      } else {
        return {
          success: false,
          error: 'Entry not found',
          metrics: {
            duration,
            backendUsed: backend,
          },
        };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to retrieve memory entry', { id, backend, error });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          duration,
          backendUsed: backend,
        },
      };
    }
  }

  /**
   * Intelligent query operation with result aggregation
   */
  async query(query: MemoryQuery, context: MemoryContext): Promise<MemoryOperationResult> {
    const startTime = Date.now();
    const backend = this.selectOptimalBackend('query', context);

    try {
      this.logger.debug('Querying memory', { query, backend });

      let results: MemoryEntry[] = [];

      // Execute query on selected backend
      switch (backend) {
        case 'swarm':
          if (this.swarmMemory) {
            results = await this.swarmMemory.query(query, context);
          }
          break;

        case 'distributed':
          if (this.distributedMemory) {
            results = await this.distributedMemory.query(query, context);
          }
          break;

        case 'primary':
        default:
          results = await this.primaryManager.query(query);
          break;
      }

      // Aggregate results from multiple backends if needed
      if (context.coordination && results.length === 0) {
        results = await this.aggregateQueryResults(query, context);
      }

      const duration = Date.now() - startTime;
      this.recordMetrics('query', backend, duration);

      this.eventBus.emit('memory-coordinator:queried', { 
        query, 
        resultCount: results.length, 
        backend, 
        duration,
      });

      return {
        success: true,
        data: results,
        metrics: {
          duration,
          backendUsed: backend,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to query memory', { query, backend, error });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          duration,
          backendUsed: backend,
        },
      };
    }
  }

  /**
   * Cross-system memory synchronization
   */
  async synchronize(namespace?: string): Promise<MemoryOperationResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting memory synchronization', { namespace });

      const results = [];

      // Synchronize swarm memory
      if (this.swarmMemory) {
        const swarmResult = await this.swarmMemory.synchronize(namespace);
        results.push({ system: 'swarm', ...swarmResult });
      }

      // Synchronize distributed memory
      if (this.distributedMemory) {
        const distResult = await this.distributedMemory.synchronize(namespace);
        results.push({ system: 'distributed', ...distResult });
      }

      const duration = Date.now() - startTime;

      this.eventBus.emit('memory-coordinator:synchronized', { 
        namespace, 
        results, 
        duration,
      });

      return {
        success: true,
        data: results,
        metrics: {
          duration,
          backendUsed: 'all',
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Memory synchronization failed', { namespace, error });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          duration,
          backendUsed: 'all',
        },
      };
    }
  }

  /**
   * Get comprehensive health status across all memory systems
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    systems: Record<string, any>;
    metrics: Record<string, number>;
  }> {
    const systems: Record<string, any> = {};
    let overallHealthy = true;

    // Check primary memory
    try {
      const primaryHealth = await this.primaryManager.getHealthStatus();
      systems.primary = primaryHealth;
      if (!primaryHealth.healthy) {
        overallHealthy = false;
      }
    } catch (error) {
      systems.primary = { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
      overallHealthy = false;
    }

    // Check swarm memory
    if (this.swarmMemory) {
      try {
        const swarmHealth = await this.swarmMemory.getHealthStatus();
        systems.swarm = swarmHealth;
        if (!swarmHealth.healthy) {
          overallHealthy = false;
        }
      } catch (error) {
        systems.swarm = { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Check distributed memory
    if (this.distributedMemory) {
      try {
        const distHealth = await this.distributedMemory.getHealthStatus();
        systems.distributed = distHealth;
        if (!distHealth.healthy) {
          overallHealthy = false;
        }
      } catch (error) {
        systems.distributed = { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Aggregate metrics
    const metrics = this.getAggregatedMetrics();

    return {
      healthy: overallHealthy,
      systems,
      metrics,
    };
  }

  /**
   * Select optimal backend based on operation type and context
   */
  private selectOptimalBackend(operation: string, context: MemoryContext): string {
    // Priority-based selection for critical operations
    if (context.priority === 'critical') {
      if (this.distributedMemory && context.distributed) {
        return 'distributed';
      }
      return 'primary';
    }

    // Swarm coordination context
    if (context.coordination && context.swarmId && this.swarmMemory) {
      return 'swarm';
    }

    // Distributed context
    if (context.distributed && this.distributedMemory) {
      return 'distributed';
    }

    // Performance-based selection
    if (this.config.performance?.enableIntelligentCaching) {
      const metrics = this.getBackendPerformanceMetrics();
      
      // Select fastest backend for reads
      if (operation === 'retrieve' || operation === 'query') {
        const fastest = Object.keys(metrics).reduce((a, b) => 
          metrics[a].averageLatency < metrics[b].averageLatency ? a : b
        );
        
        if (fastest === 'swarm' && this.swarmMemory) return 'swarm';
        if (fastest === 'distributed' && this.distributedMemory) return 'distributed';
      }
    }

    // Default to primary
    return 'primary';
  }

  /**
   * Fallback retrieve strategy across all available backends
   */
  private async fallbackRetrieve(id: string, context: MemoryContext): Promise<MemoryEntry | undefined> {
    const backends = ['primary', 'swarm', 'distributed'];
    
    for (const backend of backends) {
      try {
        let result: MemoryEntry | undefined;

        switch (backend) {
          case 'swarm':
            if (this.swarmMemory) {
              result = await this.swarmMemory.retrieve(id, context);
            }
            break;
          case 'distributed':
            if (this.distributedMemory) {
              result = await this.distributedMemory.retrieve(id, context);
            }
            break;
          case 'primary':
            result = await this.primaryManager.retrieve(id);
            break;
        }

        if (result) {
          this.logger.debug('Found entry in fallback backend', { id, backend });
          return result;
        }
      } catch (error) {
        this.logger.debug('Fallback backend failed', { id, backend, error });
      }
    }

    return undefined;
  }

  /**
   * Aggregate query results from multiple backends
   */
  private async aggregateQueryResults(query: MemoryQuery, context: MemoryContext): Promise<MemoryEntry[]> {
    const allResults: MemoryEntry[] = [];
    const seenIds = new Set<string>();

    // Query primary
    try {
      const primaryResults = await this.primaryManager.query(query);
      for (const entry of primaryResults) {
        if (!seenIds.has(entry.id)) {
          allResults.push(entry);
          seenIds.add(entry.id);
        }
      }
    } catch (error) {
      this.logger.debug('Primary query failed during aggregation', { error });
    }

    // Query swarm
    if (this.swarmMemory) {
      try {
        const swarmResults = await this.swarmMemory.query(query, context);
        for (const entry of swarmResults) {
          if (!seenIds.has(entry.id)) {
            allResults.push(entry);
            seenIds.add(entry.id);
          }
        }
      } catch (error) {
        this.logger.debug('Swarm query failed during aggregation', { error });
      }
    }

    // Query distributed
    if (this.distributedMemory) {
      try {
        const distResults = await this.distributedMemory.query(query, context);
        for (const entry of distResults) {
          if (!seenIds.has(entry.id)) {
            allResults.push(entry);
            seenIds.add(entry.id);
          }
        }
      } catch (error) {
        this.logger.debug('Distributed query failed during aggregation', { error });
      }
    }

    // Sort by timestamp (most recent first)
    allResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit if specified
    if (query.limit && allResults.length > query.limit) {
      return allResults.slice(0, query.limit);
    }

    return allResults;
  }

  /**
   * Setup performance monitoring for intelligent operation selection
   */
  private setupPerformanceMonitoring(): void {
    if (!this.config.performance?.enableIntelligentCaching) {
      return;
    }

    // Monitor cache performance
    setInterval(() => {
      this.cleanupPerformanceCache();
    }, 60000); // Cleanup every minute

    // Monitor backend performance
    setInterval(() => {
      this.updateBackendMetrics();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Record operation metrics for performance analysis
   */
  private recordMetrics(operation: string, backend: string, duration: number): void {
    const key = `${operation}:${backend}`;
    const metrics = this.operationMetrics.get(key) || [];
    
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    this.operationMetrics.set(key, metrics);
  }

  /**
   * Get backend performance metrics for intelligent selection
   */
  private getBackendPerformanceMetrics(): Record<string, { averageLatency: number; successRate: number }> {
    const metrics: Record<string, { averageLatency: number; successRate: number }> = {};

    for (const [key, durations] of this.operationMetrics.entries()) {
      const [operation, backend] = key.split(':');
      
      if (!metrics[backend]) {
        metrics[backend] = { averageLatency: 0, successRate: 100 };
      }

      if (durations.length > 0) {
        const sum = durations.reduce((a, b) => a + b, 0);
        metrics[backend].averageLatency = sum / durations.length;
      }
    }

    return metrics;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cached: any): boolean {
    const maxAge = 300000; // 5 minutes
    return (Date.now() - cached.timestamp) < maxAge;
  }

  /**
   * Cleanup expired performance cache entries
   */
  private cleanupPerformanceCache(): void {
    const maxAge = 300000; // 5 minutes
    const now = Date.now();

    for (const [key, value] of this.performanceCache.entries()) {
      if ((now - value.timestamp) > maxAge) {
        this.performanceCache.delete(key);
      }
    }
  }

  /**
   * Update backend performance metrics
   */
  private updateBackendMetrics(): void {
    // This method can be extended to collect more sophisticated metrics
    this.logger.debug('Backend performance metrics updated');
  }

  /**
   * Get aggregated metrics across all memory systems
   */
  private getAggregatedMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {
      cacheSize: this.performanceCache.size,
      operationTypes: this.operationMetrics.size,
    };

    // Calculate average latencies per backend
    const backendMetrics = this.getBackendPerformanceMetrics();
    for (const [backend, perf] of Object.entries(backendMetrics)) {
      metrics[`${backend}_avg_latency`] = perf.averageLatency;
      metrics[`${backend}_success_rate`] = perf.successRate;
    }

    return metrics;
  }
}