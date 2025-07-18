import { getErrorMessage as _getErrorMessage } from "../../utils/error-handler.js";
/**
 * Optimized Task Executor
 * Implements async execution with connection pooling and caching
 */

import { EventEmitter } from "node:events";
import PQueue from "p-queue";
import { Logger } from "../../core/logger.js";
import type {
	AgentId,
	TaskDefinition,
	TaskPriority,
	TaskResult,
	TaskStatus,
	TaskType,
} from "../types.js";
import { AsyncFileManager } from "./async-file-manager.js";
import { CircularBuffer } from "./circular-buffer.js";
import { ClaudeConnectionPool } from "./connection-pool.js";
import { TTLMap } from "./ttl-map.js";

export interface ExecutorConfig {
	connectionPool?: {
		min?: number;
		max?: number;
		adaptiveResize?: boolean;
	};
	concurrency?: number;
	caching?: {
		enabled?: boolean;
		ttl?: number;
		maxSize?: number;
		distributed?: boolean;
	};
	fileOperations?: {
		outputDir?: string;
		concurrency?: number;
	};
	monitoring?: {
		metricsInterval?: number;
		slowTaskThreshold?: number;
	};
	// New batch processing options
	batchProcessing?: {
		enabled?: boolean;
		batchSize?: number;
		batchTimeout?: number;
		optimalBatchSize?: number;
	};
	// Memory optimization options
	memoryOptimization?: {
		enabled?: boolean;
		gcInterval?: number;
		maxMemoryUsage?: number;
		preallocationSize?: number;
	};
	// Async optimization options
	asyncOptimization?: {
		enabled?: boolean;
		parallelism?: number;
		streaming?: boolean;
		pipeline?: boolean;
	};
}

export interface OptimizedExecutionMetrics {
	totalExecuted: number;
	totalSucceeded: number;
	totalFailed: number;
	avgExecutionTime: number;
	cacheHitRate: number;
	queueLength: number;
	activeExecutions: number;
	// Enhanced metrics
	batchesProcessed: number;
	batchEfficiency: number;
	memoryUsage: number;
	gcCycles: number;
	batchQueueLength: number;
	streamingConnections: number;
	memoryPoolSize: number;
}

export interface ExecutionTaskResult {
	id: string;
	agentId: string;
	success: boolean;
	output: string;
	error?: {
		type: string;
		message: string;
		code?: string;
		stack?: string;
		context: Record<string, any>;
		recoverable: boolean;
		retryable: boolean;
	};
	executionTime: number;
	tokensUsed?: {
		inputTokens: number;
		outputTokens: number;
	};
	timestamp: Date;
}

export class OptimizedExecutor extends EventEmitter {
	private logger: Logger;
	private connectionPool: ClaudeConnectionPool;
	private fileManager: AsyncFileManager;
	private executionQueue: PQueue;
	private resultCache: TTLMap<string, ExecutionTaskResult>;
	private executionHistory: CircularBuffer<{
		taskId: string;
		duration: number;
		status: "success" | "failed";
		timestamp: Date;
	}>;

	private metrics = {
		totalExecuted: 0,
		totalSucceeded: 0,
		totalFailed: 0,
		totalExecutionTime: 0,
		cacheHits: 0,
		cacheMisses: 0,
		batchesProcessed: 0,
		batchEfficiency: 0,
		memoryUsage: 0,
		gcCycles: 0,
		batchQueueLength: 0,
		streamingConnections: 0,
		memoryPoolSize: 0,
	};

	private activeExecutions = new Set<string>();
	private batchQueue: TaskDefinition[] = [];
	private batchTimeout?: NodeJS.Timeout;
	private memoryPool: Map<string, any> = new Map();
	private gcInterval?: NodeJS.Timeout;
	private streamingConnections: Map<string, any> = new Map();

	constructor(private config: ExecutorConfig = {}) {
		super();

		// Use test-safe logger configuration,
		const loggerConfig =
			process.env.CLAUDE_FLOW_ENV === "test"
				? {
						level: "error" as const,
						format: "json" as const,
						destination: "console" as const,
					}
				: {
						level: "info" as const,
						format: "json" as const,
						destination: "console" as const,
					};

		this.logger = new Logger(loggerConfig, { component: "OptimizedExecutor" });

		// Initialize connection pool,
		this.connectionPool = new ClaudeConnectionPool({
			min: config.connectionPool?.min || 2,
			max: config.connectionPool?.max || 10,
			adaptiveResize: config.connectionPool?.adaptiveResize || true,
		});

		// Initialize file manager,
		this.fileManager = new AsyncFileManager({
			write: config.fileOperations?.concurrency || 10,
			read: config.fileOperations?.concurrency || 20,
		});

		// Initialize execution queue,
		this.executionQueue = new PQueue({
			concurrency: config.concurrency || 10,
		});

		// Initialize result cache,
		this.resultCache = new TTLMap({
			defaultTTL: config.caching?.ttl || 3600000, // 1 hour,
			maxSize: config.caching?.maxSize || 1000,
			onExpire: (key, value) => {
				this.logger.debug("Cache entry expired", { taskId: key });
			},
		});

		// Initialize execution history,
		this.executionHistory = new CircularBuffer(1000);

		// Initialize batch processing
		if (config.batchProcessing?.enabled) {
			this.setupBatchProcessing();
		}

		// Initialize memory optimization
		if (config.memoryOptimization?.enabled) {
			this.setupMemoryOptimization();
		}

		// Initialize async optimization
		if (config.asyncOptimization?.enabled) {
			this.setupAsyncOptimization();
		}

		// Start monitoring if configured,
		if (config.monitoring?.metricsInterval) {
			setInterval(() => {
				this.emitMetrics();
			}, config.monitoring.metricsInterval);
		}
	}

	async executeTask(
		task: TaskDefinition,
		agentId: AgentId
	): Promise<ExecutionTaskResult> {
		const startTime = Date.now();
		const taskKey = this.getTaskCacheKey(task);

		// Check cache if enabled,
		if (this.config.caching?.enabled) {
			const cached = this.resultCache.get(taskKey);
			if (cached) {
				this.metrics.cacheHits++;
				this.logger.debug("Cache hit for task", { taskId: task.id });
				return cached;
			}
			this.metrics.cacheMisses++;
		}

		// Add to active executions,
		this.activeExecutions.add(task.id.id);

		// Queue the execution,
		const result = (await this.executionQueue.add(
			async (): Promise<ExecutionTaskResult> => {
				try {
					// Execute with connection pool,
					const executionResult = await this.connectionPool.execute(
						async (api) => {
							const response = await api.complete({
								messages: this.buildMessages(task),
								model: task.context?.model || "claude-3-5-sonnet-20241022",
								max_tokens: task.constraints.maxTokens || 4096,
								temperature: task.context?.temperature || 0.7,
							});

							return {
								success: true,
								output: response.content[0]?.text || "",
								usage: {
									inputTokens: response.usage?.input_tokens || 0,
									outputTokens: response.usage?.output_tokens || 0,
								},
							};
						}
					);

					// Save result to file asynchronously,
					if (this.config.fileOperations?.outputDir) {
						const outputPath = `${this.config.fileOperations.outputDir}/${task.id.id}.json`;
						await this.fileManager.writeJSON(outputPath, {
							taskId: task.id.id,
							agentId: agentId.id,
							result: executionResult,
							timestamp: new Date(),
						});
					}

					// Create task result,
					const taskResult: ExecutionTaskResult = {
						id: task.id.id,
						agentId: agentId.id,
						success: executionResult.success,
						output: executionResult.output,
						error: undefined,
						executionTime: Date.now() - startTime,
						tokensUsed: executionResult.usage,
						timestamp: new Date(),
					};

					// Cache result if enabled,
					if (this.config.caching?.enabled && executionResult.success) {
						this.resultCache.set(taskKey, taskResult);
					}

					// Update metrics,
					this.metrics.totalExecuted++;
					this.metrics.totalSucceeded++;
					this.metrics.totalExecutionTime += taskResult.executionTime;

					// Record in history,
					this.executionHistory.push({
						taskId: task.id.id,
						duration: taskResult.executionTime,
						status: "success",
						timestamp: new Date(),
					});

					// Check if slow task,
					if (
						this.config.monitoring?.slowTaskThreshold &&
						taskResult.executionTime > this.config.monitoring.slowTaskThreshold
					) {
						this.logger.warn("Slow task detected", {
							taskId: task.id.id,
							duration: taskResult.executionTime,
							threshold: this.config.monitoring.slowTaskThreshold,
						});
					}

					this.emit("task:completed", taskResult);
					return taskResult;
				} catch (error) {
					this.metrics.totalExecuted++;
					this.metrics.totalFailed++;

					const errorResult: ExecutionTaskResult = {
						id: task.id.id,
						agentId: agentId.id,
						success: false,
						output: "",
						error: {
							type:
								error instanceof Error
									? error.constructor.name
									: "UnknownError",
							message: error instanceof Error ? error.message : "Unknown error",
							code: (error as any).code,
							stack: error instanceof Error ? error.stack : undefined,
							context: { taskId: task.id.id, agentId: agentId.id },
							recoverable: this.isRecoverableError(error),
							retryable: this.isRetryableError(error),
						},
						executionTime: Date.now() - startTime,
						timestamp: new Date(),
					};

					// Record in history,
					this.executionHistory.push({
						taskId: task.id.id,
						duration: errorResult.executionTime,
						status: "failed",
						timestamp: new Date(),
					});

					this.emit("task:failed", errorResult);
					throw error;
				} finally {
					this.activeExecutions.delete(task.id.id);
				}
			}
		)) as ExecutionTaskResult;

		return result;
	}

	async executeBatch(
		tasks: TaskDefinition[],
		agentId: AgentId
	): Promise<ExecutionTaskResult[]> {
		return Promise.all(tasks.map((task) => this.executeTask(task, agentId)));
	}

	private buildMessages(task: TaskDefinition): any[] {
		const messages = [];

		// Add system message if needed,
		if (task.context?.systemPrompt) {
			messages.push({
				role: "system",
				content: task.context.systemPrompt,
			});
		}

		// Add main task instructions,
		messages.push({
			role: "user",
			content: task.instructions,
		});

		// Add context if available,
		if (task.context) {
			if (task.context.previousResults?.length) {
				messages.push({
					role: "assistant",
					content:
						"Previous results:\n" +
						task.context.previousResults.map((r: any) => r.output).join("\n\n"),
				});
			}

			if (task.context.relatedTasks?.length) {
				messages.push({
					role: "user",
					content:
						"Related context:\n" +
						task.context.relatedTasks
							.map((t: any) => t.instructions)
							.join("\n"),
				});
			}
		}

		return messages;
	}

	private getTaskCacheKey(task: TaskDefinition): string {
		// Create a cache key based on task properties,
		return `${task.type}-${task.instructions}-${JSON.stringify(task.context || {})}`;
	}

	private isRecoverableError(error: any): boolean {
		if (!error) return false;

		// Network errors are often recoverable,
		if (
			error.code === "ECONNRESET" ||
			error.code === "ETIMEDOUT" ||
			error.code === "ENOTFOUND"
		) {
			return true;
		}

		// Rate limit errors are recoverable with backoff,
		if (error.status === 429) {
			return true;
		}

		return false;
	}

	private isRetryableError(error: any): boolean {
		if (!error) return false;

		// Most recoverable errors are retryable,
		if (this.isRecoverableError(error)) {
			return true;
		}

		// Server errors might be temporary,
		if (error.status >= 500 && error.status < 600) {
			return true;
		}

		return false;
	}

	getMetrics(): OptimizedExecutionMetrics {
		const history = this.executionHistory.getAll();
		const avgExecutionTime =
			this.metrics.totalExecuted > 0
				? this.metrics.totalExecutionTime / this.metrics.totalExecuted
				: 0;

		const cacheTotal = this.metrics.cacheHits + this.metrics.cacheMisses;
		const cacheHitRate =
			cacheTotal > 0 ? this.metrics.cacheHits / cacheTotal : 0;

		return {
			totalExecuted: this.metrics.totalExecuted,
			totalSucceeded: this.metrics.totalSucceeded,
			totalFailed: this.metrics.totalFailed,
			avgExecutionTime,
			cacheHitRate,
			queueLength: this.executionQueue.size,
			activeExecutions: this.activeExecutions.size,
			batchesProcessed: this.metrics.batchesProcessed || 0,
			batchEfficiency: this.metrics.batchEfficiency || 0,
			memoryUsage: process.memoryUsage().heapUsed,
			gcCycles: this.metrics.gcCycles || 0,
			batchQueueLength: this.metrics.batchQueueLength || 0,
			streamingConnections: this.metrics.streamingConnections || 0,
			memoryPoolSize: this.metrics.memoryPoolSize || 0,
		};
	}

	private emitMetrics(): void {
		const metrics = this.getMetrics();
		this.emit("metrics", metrics);

		// Also log if configured,
		this.logger.info("Executor metrics", metrics);
	}

	async waitForPendingExecutions(): Promise<void> {
		await this.executionQueue.onIdle();
		await this.fileManager.waitForPendingOperations();
	}

	async shutdown(): Promise<void> {
		this.logger.info("Shutting down optimized executor");

		// Clear the queue,
		this.executionQueue.clear();

		// Wait for active executions,
		await this.waitForPendingExecutions();

		// Drain connection pool,
		await this.connectionPool.drain();

		// Clear caches,
		this.resultCache.destroy();

		this.logger.info("Optimized executor shut down");
	}

	/**
	 * Get execution history for analysis
	 */
	getExecutionHistory() {
		return this.executionHistory.snapshot();
	}

	/**
	 * Get connection pool statistics
	 */
	getConnectionPoolStats() {
		return this.connectionPool.getStats();
	}

	/**
	 * Get file manager metrics
	 */
	getFileManagerMetrics() {
		return this.fileManager.getMetrics();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return this.resultCache.getStats();
	}

	// === BATCH PROCESSING METHODS ===

	private setupBatchProcessing(): void {
		this.logger.info("Setting up batch processing", {
			batchSize: this.config.batchProcessing?.batchSize,
			batchTimeout: this.config.batchProcessing?.batchTimeout,
		});

		// Start batch processing timer
		const timeout = this.config.batchProcessing?.batchTimeout || 1000;
		this.batchTimeout = setInterval(() => {
			this.processPendingBatch();
		}, timeout);
	}

	private async processPendingBatch(): Promise<void> {
		if (this.batchQueue.length === 0) return;

		const batchSize = this.config.batchProcessing?.batchSize || 10;
		const batch = this.batchQueue.splice(0, batchSize);

		this.logger.debug("Processing pending batch", {
			batchSize: batch.length,
			remainingQueue: this.batchQueue.length,
		});

		// Process batch asynchronously
		setImmediate(async () => {
			for (const task of batch) {
				try {
					await this.executeTask(task, { id: "batch-processor", instance: 1, swarmId: "default", type: "coordinator" });
				} catch (error) {
					this.logger.error("Batch task execution failed", { taskId: task.id.id, error });
				}
			}
		});
	}

	async executeOptimizedBatch(
		tasks: TaskDefinition[],
		agentId: AgentId
	): Promise<ExecutionTaskResult[]> {
		const batchStartTime = Date.now();
		const batchSize = this.config.batchProcessing?.batchSize || 5;
		const results: ExecutionTaskResult[] = [];

		// Process tasks in optimized batches
		for (let i = 0; i < tasks.length; i += batchSize) {
			const batch = tasks.slice(i, i + batchSize);
			const batchResults = await this.processBatchOptimized(batch, agentId);
			results.push(...batchResults);
		}

		// Update batch metrics
		this.metrics.batchesProcessed++;
		const batchDuration = Date.now() - batchStartTime;
		const efficiency = tasks.length / (batchDuration / 1000); // tasks per second
		this.metrics.batchEfficiency = (this.metrics.batchEfficiency + efficiency) / 2;

		this.logger.debug("Batch execution completed", {
			totalTasks: tasks.length,
			batchDuration,
			efficiency,
		});

		return results;
	}

	private async processBatchOptimized(
		tasks: TaskDefinition[],
		agentId: AgentId
	): Promise<ExecutionTaskResult[]> {
		if (this.config.asyncOptimization?.streaming) {
			return this.processStreamingBatch(tasks, agentId);
		}

		return Promise.all(tasks.map((task) => this.executeTask(task, agentId)));
	}

	private async processStreamingBatch(
		tasks: TaskDefinition[],
		agentId: AgentId
	): Promise<ExecutionTaskResult[]> {
		const results: ExecutionTaskResult[] = [];
		const processingPromises: Promise<ExecutionTaskResult>[] = [];

		// Start processing tasks with streaming
		for (const task of tasks) {
			const promise = this.executeTaskWithStreaming(task, agentId);
			processingPromises.push(promise);
		}

		// Process results as they become available
		for (const promise of processingPromises) {
			results.push(await promise);
		}

		return results;
	}

	private async executeTaskWithStreaming(
		task: TaskDefinition,
		agentId: AgentId
	): Promise<ExecutionTaskResult> {
		// Implementation for streaming task execution
		// For now, fallback to regular execution
		return this.executeTask(task, agentId);
	}

	// === MEMORY OPTIMIZATION METHODS ===

	private setupMemoryOptimization(): void {
		this.logger.info("Setting up memory optimization", {
			gcInterval: this.config.memoryOptimization?.gcInterval,
			maxMemoryUsage: this.config.memoryOptimization?.maxMemoryUsage,
		});

		// Preallocate memory pool
		const preallocationSize = this.config.memoryOptimization?.preallocationSize || 1000;
		for (let i = 0; i < preallocationSize; i++) {
			this.memoryPool.set(`pool-${i}`, { available: true, data: null });
		}

		// Start garbage collection timer
		const gcInterval = this.config.memoryOptimization?.gcInterval || 30000;
		this.gcInterval = setInterval(() => {
			this.performGarbageCollection();
		}, gcInterval);
	}

	private performGarbageCollection(): void {
		const startTime = Date.now();
		let freed = 0;

		// Clean up expired cache entries
		(this.resultCache as any).cleanup();

		// Clean up memory pool
		for (const [key, poolItem] of this.memoryPool) {
			if (poolItem.available && poolItem.data) {
				poolItem.data = null;
				freed++;
			}
		}

		// Force garbage collection if available
		if (global.gc) {
			global.gc();
		}

		const duration = Date.now() - startTime;
		this.metrics.gcCycles++;
		this.updateMemoryMetrics();

		this.logger.debug("Garbage collection completed", {
			duration,
			freed,
			cycles: this.metrics.gcCycles,
		});
	}

	private updateMemoryMetrics(): void {
		if (process.memoryUsage) {
			const memUsage = process.memoryUsage();
			this.metrics.memoryUsage = memUsage.heapUsed;

			// Check if memory usage is too high
			const maxMemory = this.config.memoryOptimization?.maxMemoryUsage || 1024 * 1024 * 1024; // 1GB
			if (memUsage.heapUsed > maxMemory) {
				this.logger.warn("High memory usage detected", {
					heapUsed: memUsage.heapUsed,
					maxMemory,
					utilization: (memUsage.heapUsed / maxMemory) * 100,
				});
				// Trigger immediate garbage collection
				setImmediate(() => this.performGarbageCollection());
			}
		}
	}

	// === ASYNC OPTIMIZATION METHODS ===

	private setupAsyncOptimization(): void {
		this.logger.info("Setting up async optimization", {
			parallelism: this.config.asyncOptimization?.parallelism,
			streaming: this.config.asyncOptimization?.streaming,
			pipeline: this.config.asyncOptimization?.pipeline,
		});

		// Setup streaming connections pool
		if (this.config.asyncOptimization?.streaming) {
			this.setupStreamingPool();
		}

		// Setup pipeline processing
		if (this.config.asyncOptimization?.pipeline) {
			this.setupPipelineProcessing();
		}
	}

	private setupStreamingPool(): void {
		const poolSize = this.config.asyncOptimization?.parallelism || 10;
		for (let i = 0; i < poolSize; i++) {
			this.streamingConnections.set(`stream-${i}`, {
				id: `stream-${i}`,
				active: false,
				lastUsed: Date.now(),
			});
		}
	}

	private setupPipelineProcessing(): void {
		// Setup pipeline stages for optimized processing
		this.logger.debug("Pipeline processing setup completed");
	}

	// === DISTRIBUTED CACHE METHODS ===

	private async updateDistributedCache(key: string, result: ExecutionTaskResult): Promise<void> {
		// Implementation for distributed cache update
		// This could integrate with Redis, Memcached, etc.
		this.logger.debug("Updating distributed cache", { key, resultId: result.id });
	}

	private async getFromDistributedCache(key: string): Promise<ExecutionTaskResult | null> {
		// Implementation for distributed cache retrieval
		this.logger.debug("Checking distributed cache", { key });
		return null;
	}
}
