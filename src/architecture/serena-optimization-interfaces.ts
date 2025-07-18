/**
 * Serena MCP Performance Optimization - Interface Definitions
 *
 * This file contains all the interface definitions for the Serena MCP
 * performance optimization system.
 */

import { EventEmitter } from 'node:events';

// ===== CORE INTERFACES =====

export interface SerenaOptimizationConfig {
  cache: {
    l1Cache: {
      maxSize: number; // in MB
      ttl: number; // in milliseconds
      enabled: boolean;
    };
    l2Cache: {
      maxSize: number; // in MB
      ttl: number; // in milliseconds
      enabled: boolean;
    };
    l3Cache: {
      maxSize: number; // in MB
      ttl: number; // in milliseconds
      enabled: boolean;
    };
    invalidationStrategy: 'conservative' | 'aggressive' | 'smart';
  };

  connectionPool: {
    minConnections: number;
    maxConnections: number;
    healthCheckInterval: number; // in milliseconds
    reconnectRetries: number;
    connectionTimeout: number; // in milliseconds
    idleTimeout: number; // in milliseconds
    adaptiveScaling: boolean;
  };

  memoryOptimization: {
    objectPoolSizes: {
      astNodes: number;
      symbols: number;
      typeInfo: number;
      references: number;
    };
    gcTriggerThreshold: number; // in MB
    memoryMonitoringInterval: number; // in milliseconds
    enableProactiveCleanup: boolean;
  };

  apiBatching: {
    maxBatchSize: number;
    maxWaitTime: number; // in milliseconds
    priorityLevels: number;
    enableStreaming: boolean;
    batchProcessingInterval: number; // in milliseconds
  };
}

// ===== CACHING INTERFACES =====

export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'enum';
  location: {
    file: string;
    line: number;
    column: number;
  };
  signature?: string;
  documentation?: string;
  dependencies: string[];
  lastModified: Date;
  accessCount: number;
}

export interface ASTNode {
  type: string;
  start: number;
  end: number;
  children?: ASTNode[];
  properties: Record<string, any>;
  symbolReferences: string[];
}

export interface TypeInfo {
  name: string;
  kind: 'primitive' | 'object' | 'array' | 'function' | 'generic';
  properties?: Record<string, TypeInfo>;
  methods?: Record<string, TypeInfo>;
  extends?: string[];
  implements?: string[];
}

export interface Definition {
  symbol: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  kind: 'declaration' | 'definition' | 'reference';
  scope: string;
}

export interface Reference {
  symbol: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  context: 'read' | 'write' | 'call';
}

export interface Dependency {
  source: string;
  target: string;
  type: 'import' | 'extends' | 'implements' | 'calls' | 'references';
  weight: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: Date;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: Date;
  dirty: boolean;
}

export interface CacheMetrics {
  l1Metrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    avgLatency: number;
    size: number;
    maxSize: number;
  };
  l2Metrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    avgLatency: number;
    size: number;
    maxSize: number;
  };
  l3Metrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    avgLatency: number;
    size: number;
    maxSize: number;
  };
  overallHitRate: number;
  invalidationEvents: number;
}

export interface InvalidationTask {
  symbol: string;
  reason: 'file_changed' | 'dependency_changed' | 'manual' | 'expired';
  priority: 'low' | 'medium' | 'high';
  affectedFiles: string[];
  timestamp: Date;
}

export interface DependencyGraph {
  nodes: Map<string, Set<string>>; // symbol -> dependencies
  reverseNodes: Map<string, Set<string>>; // symbol -> dependents

  addDependency(source: string, target: string): void;
  removeDependency(source: string, target: string): void;
  getDependents(symbol: string): string[];
  getDependencies(symbol: string): string[];
  getTransitiveDependents(symbol: string): string[];
}

// ===== CONNECTION POOL INTERFACES =====

export interface SerenaLSPConnection {
  id: string;
  projectPath: string;
  isHealthy(): boolean;
  ping(): Promise<void>;
  testSymbolResolution(): Promise<{
    success: boolean;
    capabilities: string[];
  }>;
  sendRequest(method: string, params: any): Promise<any>;
  sendNotification(method: string, params: any): Promise<void>;
  dispose(): Promise<void>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: Date;
  capabilities?: string[];
  errors: string[];
  metrics: {
    successRate: number;
    avgResponseTime: number;
    errorCount: number;
  };
}

export interface LoadBalancingStrategy {
  selectConnection(
    connections: SerenaLSPConnection[],
    request: SerenaRequest
  ): SerenaLSPConnection | null;

  updateConnectionMetrics(
    connection: SerenaLSPConnection,
    metrics: ConnectionMetrics
  ): void;
}

export interface ConnectionMetrics {
  activeRequests: number;
  avgResponseTime: number;
  errorRate: number;
  throughput: number;
  utilization: number;
  lastRequestTime: Date;
}

export interface ReconnectStrategy {
  shouldReconnect(error: Error, attempt: number): boolean;
  getRetryDelay(attempt: number): number;
  getMaxRetries(): number;
}

// ===== MEMORY OPTIMIZATION INTERFACES =====

export interface ObjectPool<T> {
  acquire(): T;
  release(obj: T): void;
  size(): number;
  availableCount(): number;
  inUseCount(): number;
  getMetrics(): ObjectPoolMetrics;
}

export interface ObjectPoolMetrics {
  totalObjects: number;
  availableObjects: number;
  inUseObjects: number;
  acquisitionRate: number;
  releaseRate: number;
  hitRate: number;
  creationRate: number;
}

export interface MemoryPool {
  allocate(size: number): Buffer;
  deallocate(buffer: Buffer): void;
  getStats(): MemoryPoolStats;
  optimize(): void;
}

export interface MemoryPoolStats {
  totalAllocated: number;
  totalDeallocated: number;
  currentUsage: number;
  fragmentation: number;
  peakUsage: number;
}

export interface GCOptimizer {
  shouldTriggerGC(): boolean;
  forceGC(): boolean;
  getGCStats(): GCStats;
  optimizeGCTiming(): void;
}

export interface GCStats {
  minorGCs: number;
  majorGCs: number;
  incrementalGCs: number;
  totalGCTime: number;
  avgGCTime: number;
  lastGCTime: Date;
  memoryFreed: number;
}

// ===== API BATCHING INTERFACES =====

export interface SerenaRequest {
  id: string;
  type: 'symbol_lookup' | 'file_analysis' | 'type_resolution' | 'references' | 'definitions';
  params: any;
  priority: 'low' | 'medium' | 'high';
  timeout: number;
  projectPath: string;
  timestamp: Date;
}

export interface SerenaResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  metadata: {
    processingTime: number;
    cacheHit: boolean;
    batchId?: string;
  };
}

export interface BatchRequest {
  id: string;
  request: SerenaRequest;
  onComplete: (response: SerenaResponse) => void;
  onError: (error: Error) => void;
  onPartial?: (partialResult: any) => void;
  timestamp: Date;
}

export interface Batch {
  id: string;
  type: string;
  requests: BatchRequest[];
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedProcessingTime: number;
}

export interface BatchProcessor {
  processBatch(batch: Batch): Promise<void>;
  canProcessBatch(batch: Batch): boolean;
  getProcessingCapacity(): number;
  getQueueLength(): number;
}

export interface StreamingResponse {
  id: string;
  batch: Batch;
  progress: number;
  partialResults: any[];
  isComplete: boolean;
  emit(event: string, data: any): void;
  onProgress(callback: (progress: number) => void): void;
  onPartialResult(callback: (result: any) => void): void;
  onComplete(callback: (results: any[]) => void): void;
}

export interface PriorityQueue<T> {
  enqueue(item: T, priority: number): void;
  dequeue(): T | undefined;
  peek(): T | undefined;
  isEmpty(): boolean;
  size(): number;
  clear(): void;
}

// ===== PERFORMANCE MONITORING INTERFACES =====

export interface PerformanceMetrics {
  cacheMetrics: CacheMetrics;
  connectionMetrics: {
    activeConnections: number;
    connectionUtilization: number;
    avgConnectionLatency: number;
    reconnectionRate: number;
    healthScore: number;
    throughput: number;
  };
  memoryMetrics: {
    heapUsage: number;
    objectPoolUtilization: number;
    gcFrequency: number;
    memoryLeakDetection: boolean;
    memoryGrowthRate: number;
  };
  batchingMetrics: {
    avgBatchSize: number;
    batchProcessingTime: number;
    streamingLatency: number;
    queueLength: number;
    batchSuccessRate: number;
  };
  operationMetrics: {
    symbolLookupLatency: number;
    fileAnalysisLatency: number;
    typeResolutionLatency: number;
    operationThroughput: number;
  };
}

export interface PerformanceThresholds {
  cache: {
    minHitRate: number;
    maxLatency: number;
    maxEvictionRate: number;
  };
  connections: {
    minHealthScore: number;
    maxLatency: number;
    maxReconnectionRate: number;
  };
  memory: {
    maxHeapUsage: number;
    maxGCFrequency: number;
    maxGrowthRate: number;
  };
  batching: {
    maxQueueLength: number;
    maxProcessingTime: number;
    minSuccessRate: number;
  };
}

export interface PerformanceIssue {
  type: 'cache_performance' | 'connection_health' | 'memory_usage' | 'batch_processing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  affectedComponents: string[];
  timestamp: Date;
  autoResolvable: boolean;
}

export interface PerformanceOptimization {
  name: string;
  description: string;
  canApply(metrics: PerformanceMetrics): boolean;
  apply(): Promise<boolean>;
  estimatedImprovement: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// ===== INTEGRATION INTERFACES =====

export interface ClaudeFlowIntegration {
  reportMetrics(metrics: PerformanceMetrics): Promise<void>;
  reportIssue(issue: PerformanceIssue): Promise<void>;
  requestOptimization(optimization: PerformanceOptimization): Promise<boolean>;
  syncConfiguration(config: SerenaOptimizationConfig): Promise<void>;
}

export interface HookIntegration {
  preOperation(operation: SerenaOperation): Promise<void>;
  postOperation(operation: SerenaOperation, result: any): Promise<void>;
  onError(operation: SerenaOperation, error: Error): Promise<void>;
  onPerformanceIssue(issue: PerformanceIssue): Promise<void>;
}

export interface SerenaOperation {
  type: string;
  projectPath: string;
  params: any;
  timestamp: Date;
  expectedDuration: number;
  priority: 'low' | 'medium' | 'high';
}

// ===== MAIN ORCHESTRATOR INTERFACES =====

export interface SerenaOptimizationOrchestrator {
  initialize(config: SerenaOptimizationConfig): Promise<void>;
  optimizeOperation(operation: SerenaOperation): Promise<any>;
  getMetrics(): Promise<PerformanceMetrics>;
  detectIssues(): Promise<PerformanceIssue[]>;
  applyOptimizations(): Promise<boolean>;
  shutdown(): Promise<void>;
}

export interface OptimizationStrategy {
  name: string;
  priority: number;
  canApply(context: OptimizationContext): boolean;
  apply(context: OptimizationContext): Promise<OptimizationResult>;
  rollback(context: OptimizationContext): Promise<void>;
}

export interface OptimizationContext {
  operation: SerenaOperation;
  metrics: PerformanceMetrics;
  availableResources: ResourceInfo;
  constraints: OptimizationConstraints;
}

export interface OptimizationResult {
  success: boolean;
  improvement: number;
  metrics: PerformanceMetrics;
  appliedOptimizations: string[];
  errors: string[];
}

export interface ResourceInfo {
  availableMemory: number;
  availableConnections: number;
  cacheCapacity: number;
  cpuUsage: number;
}

export interface OptimizationConstraints {
  maxMemoryUsage: number;
  maxLatency: number;
  maxResourceUsage: number;
  maintainStability: boolean;
}

// ===== EVENT INTERFACES =====

export interface SerenaOptimizationEvents {
  'cache:hit': (key: string, level: string) => void;
  'cache:miss': (key: string, level: string) => void;
  'cache:eviction': (keys: string[], level: string) => void;
  'cache:invalidation': (keys: string[], reason: string) => void;

  'connection:acquired': (connection: SerenaLSPConnection) => void;
  'connection:released': (connection: SerenaLSPConnection) => void;
  'connection:health-changed': (connection: SerenaLSPConnection, status: HealthStatus) => void;
  'connection:error': (connection: SerenaLSPConnection, error: Error) => void;

  'memory:threshold-exceeded': (type: string, usage: number) => void;
  'memory:gc-triggered': (stats: GCStats) => void;
  'memory:pool-exhausted': (poolName: string) => void;

  'batch:created': (batch: Batch) => void;
  'batch:processed': (batch: Batch, results: any[]) => void;
  'batch:failed': (batch: Batch, error: Error) => void;

  'performance:issue-detected': (issue: PerformanceIssue) => void;
  'performance:optimization-applied': (optimization: PerformanceOptimization) => void;
  'performance:threshold-exceeded': (metric: string, value: number) => void;
}

export interface SerenaOptimizationEventEmitter extends EventEmitter {
  emit<K extends keyof SerenaOptimizationEvents>(
    event: K,
    ...args: Parameters<SerenaOptimizationEvents[K]>
  ): boolean;

  on<K extends keyof SerenaOptimizationEvents>(
    event: K,
    listener: SerenaOptimizationEvents[K]
  ): this;

  off<K extends keyof SerenaOptimizationEvents>(
    event: K,
    listener: SerenaOptimizationEvents[K]
  ): this;
}
