/**
 * Hook Execution Manager
 *
 * Prevents deadlocks by serializing hook execution and managing process coordination
 */

import { type ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import {
	CircuitBreaker,
	CircuitBreakerManager,
} from "../../../../utils/circuit-breaker.js";
import { debugLogger } from "../../../../utils/debug-logger.js";
import { globalTimerRegistry } from "../../../../utils/graceful-exit.js";
import { TimeoutManager } from "../../../../utils/timeout-manager.js";

// Hook timeout configurations
export const HOOK_TIMEOUTS = {
	"pre-task": 5000, // 5 seconds
	"post-edit": 3000, // 3 seconds
	"post-task": 10000, // 10 seconds
	"pre-bash": 2000, // 2 seconds
	"pre-edit": 2000, // 2 seconds
	"pre-read": 1000, // 1 second
	notify: 1000, // 1 second
	"session-restore": 15000, // 15 seconds
	"session-end": 20000, // 20 seconds
} as const;

type HookType = keyof typeof HOOK_TIMEOUTS;

interface HookTask {
	id: string;
	hookType: HookType;
	args: string[];
	resolve: (result: any) => void;
	reject: (error: Error) => void;
	createdAt: number;
	priority: "low" | "medium" | "high";
}

interface HookExecutionResult {
	success: boolean;
	duration: number;
	output?: string;
	error?: string;
}

/**
 * Hook Execution Queue - Serializes hook execution to prevent circular dependencies
 */
export class HookExecutionQueue extends EventEmitter {
	private queue: HookTask[] = [];
	private executing = false;
	private executionStats = new Map<string, HookExecutionResult[]>();
	private maxRetries = 3;
	private retryDelay = 1000;
	private metricsInterval?: NodeJS.Timeout;

	constructor() {
		super();
		this.startMetricsCollection();
	}

	/**
	 * Enqueue a hook for execution
	 */
	async enqueue(
		hookType: HookType,
		args: string[],
		priority: "low" | "medium" | "high" = "medium",
	): Promise<any> {
		return debugLogger.logAsyncFunction(
			"HookExecutionQueue",
			"enqueue",
			async () => {
				const taskId = this.generateTaskId();

				debugLogger.logEvent(
					"HookExecutionQueue",
					"task_creation",
					{
						taskId,
						hookType,
						priority,
						argsCount: args?.length || 0,
						currentQueueLength: this.queue.length,
					},
					"hook-queue",
				);

				return new Promise((resolve, reject) => {
					const task: HookTask = {
						id: taskId,
						hookType,
						args,
						resolve,
						reject,
						createdAt: Date.now(),
						priority,
					};

					// Insert based on priority
					this.insertByPriority(task);

					debugLogger.logEvent(
						"HookExecutionQueue",
						"task_queued",
						{
							taskId,
							hookType,
							queuePosition: this.queue.findIndex((t) => t.id === taskId),
							newQueueLength: this.queue.length,
						},
						"hook-queue",
					);

					this.emit("hook_queued", {
						taskId,
						hookType,
						queueLength: this.queue.length,
					});

					// Process queue
					this.processQueue();
				});
			},
			[hookType, args, priority],
			"hook-queue",
		);
	}

	/**
	 * Process the hook execution queue
	 */
	private async processQueue(): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookExecutionQueue",
			"processQueue",
			async () => {
				if (this.executing || this.queue.length === 0) {
					debugLogger.logEvent(
						"HookExecutionQueue",
						"process_queue_skipped",
						{
							executing: this.executing,
							queueLength: this.queue.length,
							reason: this.executing ? "already_executing" : "empty_queue",
						},
						"hook-queue",
					);
					return;
				}

				this.executing = true;
				debugLogger.logEvent(
					"HookExecutionQueue",
					"queue_processing_started",
					{
						queueLength: this.queue.length,
						taskTypes: this.queue.map((t) => t.hookType),
						priorities: this.queue.map((t) => t.priority),
					},
					"hook-queue",
				);

				this.emit("queue_processing_started", {
					queueLength: this.queue.length,
				});

				let processedCount = 0;
				let failedCount = 0;

				while (this.queue.length > 0) {
					const task = this.queue.shift()!;

					debugLogger.logEvent(
						"HookExecutionQueue",
						"task_dequeued",
						{
							taskId: task.id,
							hookType: task.hookType,
							remainingTasks: this.queue.length,
							queuedFor: Date.now() - task.createdAt,
						},
						"hook-queue",
					);

					try {
						await this.executeHookTask(task);
						processedCount++;
					} catch (error) {
						failedCount++;
						debugLogger.logEvent(
							"HookExecutionQueue",
							"task_execution_failed",
							{
								taskId: task.id,
								hookType: task.hookType,
								error: error instanceof Error ? error.message : String(error),
								processedCount,
								failedCount,
							},
							"hook-queue",
						);

						this.emit("hook_execution_failed", {
							taskId: task.id,
							hookType: task.hookType,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}

				this.executing = false;

				debugLogger.logEvent(
					"HookExecutionQueue",
					"queue_processing_completed",
					{
						processedCount,
						failedCount,
						successRate:
							processedCount > 0
								? (
										((processedCount - failedCount) / processedCount) *
										100
									).toFixed(2) + "%"
								: "0%",
					},
					"hook-queue",
				);

				this.emit("queue_processing_completed");
			},
			[],
			"hook-queue",
		);
	}

	/**
	 * Execute a single hook task with timeout and retry logic
	 */
	private async executeHookTask(task: HookTask): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookExecutionQueue",
			"executeHookTask",
			async () => {
				const startTime = performance.now();
				let lastError: Error | null = null;

				debugLogger.logEvent(
					"HookExecutionQueue",
					"task_execution_started",
					{
						taskId: task.id,
						hookType: task.hookType,
						priority: task.priority,
						maxRetries: this.maxRetries,
						timeout: HOOK_TIMEOUTS[task.hookType],
						queuedFor: Date.now() - task.createdAt,
					},
					"hook-execution",
				);

				for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
					try {
						debugLogger.logEvent(
							"HookExecutionQueue",
							"attempt_started",
							{
								taskId: task.id,
								hookType: task.hookType,
								attempt,
								isRetry: attempt > 1,
								elapsedTime: performance.now() - startTime,
							},
							"hook-execution",
						);

						this.emit("hook_execution_started", {
							taskId: task.id,
							hookType: task.hookType,
							attempt,
							queuedFor: Date.now() - task.createdAt,
						});

						const result = await this.executeHookWithTimeout(
							task.hookType,
							task.args,
						);
						const duration = performance.now() - startTime;

						// Record successful execution
						this.recordExecutionResult(task.hookType, {
							success: true,
							duration,
							output: result.output,
						});

						debugLogger.logEvent(
							"HookExecutionQueue",
							"task_execution_success",
							{
								taskId: task.id,
								hookType: task.hookType,
								duration,
								attempt,
								outputLength: result.output?.length || 0,
								exitCode: result.exitCode,
							},
							"hook-execution",
						);

						this.emit("hook_execution_completed", {
							taskId: task.id,
							hookType: task.hookType,
							duration,
							attempt,
						});

						task.resolve(result);
						return;
					} catch (error) {
						lastError =
							error instanceof Error ? error : new Error(String(error));

						debugLogger.logEvent(
							"HookExecutionQueue",
							"attempt_failed",
							{
								taskId: task.id,
								hookType: task.hookType,
								attempt,
								error: lastError.message,
								errorType: lastError.constructor.name,
								willRetry: attempt < this.maxRetries,
								retryDelay: this.retryDelay * attempt,
							},
							"hook-execution",
						);

						this.emit("hook_execution_retry", {
							taskId: task.id,
							hookType: task.hookType,
							attempt,
							error: lastError.message,
						});

						if (attempt < this.maxRetries) {
							const delayMs = this.retryDelay * attempt;
							debugLogger.logEvent(
								"HookExecutionQueue",
								"retry_delay",
								{
									taskId: task.id,
									delayMs,
									nextAttempt: attempt + 1,
								},
								"hook-execution",
							);
							await this.delay(delayMs);
						}
					}
				}

				// All retries failed
				const duration = performance.now() - startTime;
				this.recordExecutionResult(task.hookType, {
					success: false,
					duration,
					error: lastError?.message || "Unknown error",
				});

				debugLogger.logEvent(
					"HookExecutionQueue",
					"task_execution_failed_final",
					{
						taskId: task.id,
						hookType: task.hookType,
						totalDuration: duration,
						totalAttempts: this.maxRetries,
						finalError: lastError?.message || "Unknown error",
					},
					"hook-execution",
				);

				task.reject(
					lastError || new Error("Hook execution failed after retries"),
				);
			},
			[task],
			"hook-execution",
		);
	}

	/**
	 * Execute hook with strict timeout enforcement
	 */
	private async executeHookWithTimeout(
		hookType: HookType,
		args: string[],
	): Promise<{ output: string; exitCode: number }> {
		return debugLogger.logAsyncFunction(
			"HookExecutionQueue",
			"executeHookWithTimeout",
			async () => {
				const timeout = HOOK_TIMEOUTS[hookType];

				debugLogger.logEvent(
					"HookExecutionQueue",
					"timeout_setup",
					{
						hookType,
						timeout,
						argsCount: args?.length || 0,
					},
					"hook-execution",
				);

				return Promise.race([
					this.executeHookProcess(hookType, args),
					new Promise<never>((_, reject) => {
						const timeoutId = setTimeout(() => {
							debugLogger.logEvent(
								"HookExecutionQueue",
								"timeout_triggered",
								{
									hookType,
									timeout,
									elapsedTime: timeout,
								},
								"hook-execution",
							);
							reject(
								new Error(`Hook ${hookType} timed out after ${timeout}ms`),
							);
						}, timeout);

						// Store timeout ID for potential cleanup
						(timeoutId as any).__hookType = hookType;
					}),
				]);
			},
			[hookType, args],
			"hook-execution",
		);
	}

	/**
	 * Execute hook directly without spawning process
	 */
	private async executeHookProcess(
		hookType: HookType,
		args: string[],
	): Promise<{ output: string; exitCode: number }> {
		return debugLogger.logAsyncFunction(
			"HookExecutionQueue",
			"executeHookProcess",
			async () => {
				try {
					debugLogger.logEvent(
						"HookExecutionQueue",
						"process_import_start",
						{
							hookType,
							argsCount: args?.length || 0,
						},
						"hook-process",
					);

					// Import and execute hook directly instead of spawning process
					const { hooksCommand } = await import("../index.js");

					debugLogger.logEvent(
						"HookExecutionQueue",
						"process_import_complete",
						{
							hookType,
						},
						"hook-process",
					);

					// Parse args into flags format expected by hooksCommand
					const flags = this.parseHookArgs(args);

					debugLogger.logEvent(
						"HookExecutionQueue",
						"args_parsed",
						{
							hookType,
							originalArgs: args,
							parsedFlags: Object.keys(flags),
							flagCount: Object.keys(flags).length,
						},
						"hook-process",
					);

					// Capture output by temporarily redirecting console
					let output = "";
					const originalLog = console.log;
					const originalError = console.error;

					debugLogger.logEvent(
						"HookExecutionQueue",
						"console_redirect_start",
						{
							hookType,
						},
						"hook-process",
					);

					console.log = (...args: any[]) => {
						output += args.join(" ") + "\n";
					};
					console.error = (...args: any[]) => {
						output += "ERROR: " + args.join(" ") + "\n";
					};

					try {
						debugLogger.logEvent(
							"HookExecutionQueue",
							"hook_action_start",
							{
								hookType,
								flags,
							},
							"hook-process",
						);

						await hooksCommand([
							hookType,
							...Object.entries(flags).flatMap(([key, value]) =>
								typeof value === "boolean" && value
									? [`--${key}`]
									: typeof value === "boolean" && !value
										? [`--no-${key}`]
										: [`--${key}`, String(value)],
							),
						]);

						// Restore console
						console.log = originalLog;
						console.error = originalError;

						debugLogger.logEvent(
							"HookExecutionQueue",
							"hook_action_success",
							{
								hookType,
								outputLength: output.length,
								hasOutput: output.length > 0,
							},
							"hook-process",
						);

						return { output, exitCode: 0 };
					} catch (error) {
						// Restore console
						console.log = originalLog;
						console.error = originalError;

						debugLogger.logEvent(
							"HookExecutionQueue",
							"hook_action_failed",
							{
								hookType,
								error: error instanceof Error ? error.message : String(error),
								errorType:
									error instanceof Error ? error.constructor.name : "Unknown",
								outputBeforeError: output,
							},
							"hook-process",
						);

						throw new Error(
							`Hook ${hookType} failed: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
				} catch (error) {
					debugLogger.logEvent(
						"HookExecutionQueue",
						"process_execution_error",
						{
							hookType,
							error: error instanceof Error ? error.message : String(error),
							errorType:
								error instanceof Error ? error.constructor.name : "Unknown",
						},
						"hook-process",
					);

					throw new Error(
						`Hook ${hookType} execution error: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
			[hookType, args],
			"hook-process",
		);
	}

	/**
	 * Parse hook arguments into flags format
	 */
	private parseHookArgs(args: string[]): Record<string, any> {
		return debugLogger.logSyncFunction(
			"HookExecutionQueue",
			"parseHookArgs",
			() => {
				const flags: Record<string, any> = {};

				debugLogger.logEvent(
					"HookExecutionQueue",
					"parse_start",
					{
						argsCount: args?.length || 0,
						rawArgs: args,
					},
					"hook-process",
				);

				for (let i = 0; i < args.length; i++) {
					const arg = args[i];

					if (arg.startsWith("--")) {
						const key = arg
							.slice(2)
							.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
						const nextArg = args[i + 1];

						if (!nextArg || nextArg.startsWith("--")) {
							// Boolean flag
							flags[key] = true;
							debugLogger.logEvent(
								"HookExecutionQueue",
								"flag_parsed",
								{
									originalArg: arg,
									parsedKey: key,
									type: "boolean",
									value: true,
								},
								"hook-process",
							);
						} else {
							// Value flag
							flags[key] = nextArg;
							debugLogger.logEvent(
								"HookExecutionQueue",
								"flag_parsed",
								{
									originalArg: arg,
									parsedKey: key,
									type: "value",
									value: nextArg,
								},
								"hook-process",
							);
							i++; // Skip next arg
						}
					} else {
						debugLogger.logEvent(
							"HookExecutionQueue",
							"arg_skipped",
							{
								arg,
								reason: "not_flag_format",
							},
							"hook-process",
						);
					}
				}

				debugLogger.logEvent(
					"HookExecutionQueue",
					"parse_complete",
					{
						originalArgsCount: args.length,
						parsedFlagsCount: Object.keys(flags).length,
						flags,
					},
					"hook-process",
				);

				return flags;
			},
			[args],
			"hook-process",
		);
	}

	/**
	 * Insert task by priority
	 */
	private insertByPriority(task: HookTask): void {
		debugLogger.logSyncFunction(
			"HookExecutionQueue",
			"insertByPriority",
			() => {
				const priorityOrder = { high: 0, medium: 1, low: 2 };

				debugLogger.logEvent(
					"HookExecutionQueue",
					"priority_insertion_start",
					{
						taskId: task.id,
						taskPriority: task.priority,
						currentQueueLength: this.queue.length,
						queuePriorities: this.queue.map((t) => t.priority),
					},
					"hook-queue",
				);

				let insertIndex = this.queue.length;
				for (let i = 0; i < this.queue.length; i++) {
					if (
						priorityOrder[task.priority] < priorityOrder[this.queue[i].priority]
					) {
						insertIndex = i;
						debugLogger.logEvent(
							"HookExecutionQueue",
							"priority_position_found",
							{
								taskId: task.id,
								insertIndex,
								taskPriority: task.priority,
								comparedWith: this.queue[i].priority,
								comparedTaskId: this.queue[i].id,
							},
							"hook-queue",
						);
						break;
					}
				}

				this.queue.splice(insertIndex, 0, task);

				debugLogger.logEvent(
					"HookExecutionQueue",
					"priority_insertion_complete",
					{
						taskId: task.id,
						insertIndex,
						newQueueLength: this.queue.length,
						queueOrder: this.queue.map((t) => ({
							id: t.id,
							priority: t.priority,
						})),
					},
					"hook-queue",
				);
			},
			[task],
			"hook-queue",
		);
	}

	/**
	 * Record execution result for metrics
	 */
	private recordExecutionResult(
		hookType: HookType,
		result: HookExecutionResult,
	): void {
		debugLogger.logSyncFunction(
			"HookExecutionQueue",
			"recordExecutionResult",
			() => {
				const existingStatsCount = this.executionStats.has(hookType)
					? this.executionStats.get(hookType)!.length
					: 0;

				debugLogger.logEvent(
					"HookExecutionQueue",
					"metrics_recording_start",
					{
						hookType,
						resultSuccess: result.success,
						resultDuration: result.duration,
						existingStatsCount,
						hasOutput: !!result.output,
						hasError: !!result.error,
					},
					"hook-execution",
				);

				if (!this.executionStats.has(hookType)) {
					this.executionStats.set(hookType, []);
					debugLogger.logEvent(
						"HookExecutionQueue",
						"new_stats_collection_created",
						{
							hookType,
						},
						"hook-execution",
					);
				}

				const stats = this.executionStats.get(hookType)!;
				stats.push(result);

				// Keep only last 100 results per hook type
				let trimmed = false;
				if (stats.length > 100) {
					stats.shift();
					trimmed = true;
				}

				debugLogger.logEvent(
					"HookExecutionQueue",
					"metrics_recorded",
					{
						hookType,
						newStatsCount: stats.length,
						trimmed,
						successCount: stats.filter((s) => s.success).length,
						failureCount: stats.filter((s) => !s.success).length,
						avgDuration:
							stats.reduce((sum, s) => sum + s.duration, 0) / stats.length,
					},
					"hook-execution",
				);
			},
			[hookType, result],
			"hook-execution",
		);
	}

	/**
	 * Get execution statistics
	 */
	getExecutionStats(): Record<string, any> {
		return debugLogger.logSyncFunction(
			"HookExecutionQueue",
			"getExecutionStats",
			() => {
				const stats: Record<string, any> = {};

				debugLogger.logEvent(
					"HookExecutionQueue",
					"stats_calculation_start",
					{
						hookTypesCount: this.executionStats.size,
						hookTypes: Array.from(this.executionStats.keys()),
					},
					"hook-execution",
				);

				this.executionStats.forEach((results, hookType) => {
					const successful = results.filter((r) => r.success);
					const failed = results.filter((r) => !r.success);

					const hookStats = {
						total: results.length,
						successful: successful.length,
						failed: failed.length,
						successRate:
							results.length > 0
								? (successful.length / results.length) * 100
								: 0,
						avgDuration:
							results.length > 0
								? results.reduce((sum, r) => sum + r.duration, 0) /
									results.length
								: 0,
						minDuration:
							results.length > 0
								? Math.min(...results.map((r) => r.duration))
								: 0,
						maxDuration:
							results.length > 0
								? Math.max(...results.map((r) => r.duration))
								: 0,
					};

					stats[hookType] = hookStats;

					debugLogger.logEvent(
						"HookExecutionQueue",
						"hook_stats_calculated",
						{
							hookType,
							...hookStats,
						},
						"hook-execution",
					);
				});

				debugLogger.logEvent(
					"HookExecutionQueue",
					"stats_calculation_complete",
					{
						totalHookTypes: Object.keys(stats).length,
						totalExecutions: Object.values(stats).reduce(
							(sum: number, s: any) => sum + s.total,
							0,
						),
						overallSuccessRate:
							Object.values(stats).length > 0
								? (Object.values(stats).reduce(
										(sum: number, s: any) => sum + (s.successful || 0),
										0,
									) /
										Object.values(stats).reduce(
											(sum: number, s: any) => sum + (s.total || 0),
											0,
										)) *
									100
								: 0,
					},
					"hook-execution",
				);

				return stats;
			},
			[],
			"hook-execution",
		);
	}

	/**
	 * Get current queue status
	 */
	getQueueStatus(): {
		length: number;
		executing: boolean;
		priorities: Record<string, number>;
	} {
		return debugLogger.logSyncFunction(
			"HookExecutionQueue",
			"getQueueStatus",
			() => {
				const priorities = { high: 0, medium: 0, low: 0 };

				for (const task of this.queue) {
					priorities[task.priority]++;
				}

				const status = {
					length: this.queue.length,
					executing: this.executing,
					priorities,
				};

				debugLogger.logEvent(
					"HookExecutionQueue",
					"queue_status_retrieved",
					{
						...status,
						oldestTaskAge:
							this.queue.length > 0
								? Date.now() - Math.min(...this.queue.map((t) => t.createdAt))
								: 0,
						newestTaskAge:
							this.queue.length > 0
								? Date.now() - Math.max(...this.queue.map((t) => t.createdAt))
								: 0,
						hookTypes: this.queue.map((t) => t.hookType),
					},
					"hook-queue",
				);

				return status;
			},
			[],
			"hook-queue",
		);
	}

	/**
	 * Emergency clear queue
	 */
	emergencyClear(): void {
		debugLogger.logSyncFunction(
			"HookExecutionQueue",
			"emergencyClear",
			() => {
				const clearedTasks = this.queue.length;
				const wasExecuting = this.executing;
				const taskTypes = this.queue.map((t) => t.hookType);
				const priorities = this.queue.map((t) => t.priority);

				debugLogger.logEvent(
					"HookExecutionQueue",
					"emergency_clear_start",
					{
						clearedTasks,
						wasExecuting,
						taskTypes,
						priorities,
						oldestTaskAge:
							this.queue.length > 0
								? Date.now() - Math.min(...this.queue.map((t) => t.createdAt))
								: 0,
					},
					"hook-queue",
				);

				// Reject all pending tasks
				for (const task of this.queue) {
					task.reject(new Error("Queue emergency cleared"));
					debugLogger.logEvent(
						"HookExecutionQueue",
						"task_rejected",
						{
							taskId: task.id,
							hookType: task.hookType,
							reason: "emergency_clear",
						},
						"hook-queue",
					);
				}

				this.queue = [];
				this.executing = false;

				debugLogger.logEvent(
					"HookExecutionQueue",
					"emergency_clear_complete",
					{
						clearedTasks,
						previouslyExecuting: wasExecuting,
						newQueueLength: this.queue.length,
						newExecutingState: this.executing,
					},
					"hook-queue",
				);

				this.emit("emergency_clear", { clearedTasks });
			},
			[],
			"hook-queue",
		);
	}

	/**
	 * Utility methods
	 */
	private generateTaskId(): string {
		return `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private startMetricsCollection(): void {
		// Emit metrics every 30 seconds with timer tracking
		this.metricsInterval = globalTimerRegistry.register(
			setInterval(() => {
				this.emit("metrics_update", {
					stats: this.getExecutionStats(),
					queue: this.getQueueStatus(),
					timestamp: new Date().toISOString(),
				});
			}, 30000),
			"interval",
		);
	}

	/**
	 * Clean up timer resources
	 */
	destroy(): void {
		if (this.metricsInterval) {
			globalTimerRegistry.clear(this.metricsInterval);
			this.metricsInterval = undefined;
		}
		this.queue = [];
		this.executionStats.clear();
	}
}

/**
 * Hook Process Pool - Manages a pool of processes to avoid constant spawning
 */
export class HookProcessPool extends EventEmitter {
	private pool: ChildProcess[] = [];
	private maxProcesses = 3;
	private minProcesses = 1;
	private processTimeout = 30000; // 30 seconds idle timeout
	private processIdleTimers = new Map<ChildProcess, NodeJS.Timeout>();

	constructor(maxProcesses = 3, minProcesses = 1) {
		super();
		this.maxProcesses = maxProcesses;
		this.minProcesses = minProcesses;
		this.initializePool();
	}

	/**
	 * Initialize the process pool
	 */
	private async initializePool(): Promise<void> {
		for (let i = 0; i < this.minProcesses; i++) {
			await this.createProcess();
		}

		this.emit("pool_initialized", { size: this.pool.length });
	}

	/**
	 * Create a new process
	 */
	private async createProcess(): Promise<ChildProcess> {
		return debugLogger.logAsyncFunction(
			"HookProcessPool",
			"createProcess",
			async () => {
				return new Promise((resolve, reject) => {
					debugLogger.logEvent(
						"HookProcessPool",
						"process_creation_start",
						{
							currentPoolSize: this.pool.length,
							maxProcesses: this.maxProcesses,
							activeProcesses: this.getActiveProcessCount(),
						},
						"hook-pool",
					);

					const process = spawn("node", ["-e", "process.stdin.resume()"], {
						stdio: ["pipe", "pipe", "pipe"],
					});

					process.on("spawn", () => {
						this.pool.push(process);

						debugLogger.logEvent(
							"HookProcessPool",
							"process_created_successfully",
							{
								processPid: process.pid,
								newPoolSize: this.pool.length,
								totalActiveProcesses: this.getActiveProcessCount(),
							},
							"hook-pool",
						);

						this.emit("process_created", { poolSize: this.pool.length });
						resolve(process);
					});

					process.on("error", (error) => {
						debugLogger.logEvent(
							"HookProcessPool",
							"process_creation_failed",
							{
								error: error.message,
								errorType: error.constructor.name,
								poolSize: this.pool.length,
							},
							"hook-pool",
						);
						reject(error);
					});

					process.on("exit", (code, signal) => {
						debugLogger.logEvent(
							"HookProcessPool",
							"process_exited_during_lifecycle",
							{
								processPid: process.pid,
								exitCode: code,
								signal,
								poolSizeBefore: this.pool.length,
							},
							"hook-pool",
						);
						this.removeProcessFromPool(process);
					});
				});
			},
			[],
			"hook-pool",
		);
	}

	/**
	 * Acquire a process from the pool
	 */
	async acquireProcess(): Promise<ChildProcess> {
		return debugLogger.logAsyncFunction(
			"HookProcessPool",
			"acquireProcess",
			async () => {
				debugLogger.logEvent(
					"HookProcessPool",
					"acquire_request",
					{
						poolSize: this.pool.length,
						activeProcesses: this.getActiveProcessCount(),
						maxProcesses: this.maxProcesses,
						idleTimers: this.processIdleTimers.size,
					},
					"hook-pool",
				);

				// Clear idle timer for acquired process
				if (this.pool.length > 0) {
					const process = this.pool.shift()!;
					const timer = this.processIdleTimers.get(process);
					if (timer) {
						clearTimeout(timer);
						this.processIdleTimers.delete(process);
						debugLogger.logEvent(
							"HookProcessPool",
							"idle_timer_cleared",
							{
								processPid: process.pid,
								remainingTimers: this.processIdleTimers.size,
							},
							"hook-pool",
						);
					}

					debugLogger.logEvent(
						"HookProcessPool",
						"process_acquired_from_pool",
						{
							processPid: process.pid,
							newPoolSize: this.pool.length,
						},
						"hook-pool",
					);

					return process;
				}

				// Create new process if pool is empty and we haven't reached max
				const totalProcesses = this.pool.length + this.getActiveProcessCount();
				if (totalProcesses < this.maxProcesses) {
					debugLogger.logEvent(
						"HookProcessPool",
						"creating_new_process",
						{
							totalProcesses,
							maxProcesses: this.maxProcesses,
							poolSize: this.pool.length,
							activeProcesses: this.getActiveProcessCount(),
						},
						"hook-pool",
					);

					return await this.createProcess();
				}

				// Wait for a process to become available
				debugLogger.logEvent(
					"HookProcessPool",
					"waiting_for_available_process",
					{
						totalProcesses,
						maxProcesses: this.maxProcesses,
						poolSize: this.pool.length,
					},
					"hook-pool",
				);

				return new Promise((resolve) => {
					let pollCount = 0;
					const checkForAvailable = () => {
						pollCount++;
						if (this.pool.length > 0) {
							debugLogger.logEvent(
								"HookProcessPool",
								"process_became_available",
								{
									pollCount,
									poolSize: this.pool.length,
								},
								"hook-pool",
							);
							resolve(this.acquireProcess());
						} else {
							if (pollCount % 10 === 0) {
								debugLogger.logEvent(
									"HookProcessPool",
									"still_waiting",
									{
										pollCount,
										waitTime: pollCount * 100,
									},
									"hook-pool",
								);
							}
							// Register polling timer with registry
							globalTimerRegistry.register(
								setTimeout(checkForAvailable, 100),
								"timeout",
							);
						}
					};
					checkForAvailable();
				});
			},
			[],
			"hook-pool",
		);
	}

	/**
	 * Release a process back to the pool
	 */
	releaseProcess(process: ChildProcess): void {
		debugLogger.logSyncFunction(
			"HookProcessPool",
			"releaseProcess",
			() => {
				debugLogger.logEvent(
					"HookProcessPool",
					"release_request",
					{
						processPid: process.pid,
						currentPoolSize: this.pool.length,
						maxProcesses: this.maxProcesses,
						processKilled: process.killed,
					},
					"hook-pool",
				);

				if (this.pool.length < this.maxProcesses) {
					this.pool.push(process);

					// Set idle timer with registry tracking
					const timer = globalTimerRegistry.register(
						setTimeout(() => {
							this.terminateIdleProcess(process);
						}, this.processTimeout),
						"timeout",
					);

					this.processIdleTimers.set(process, timer);

					debugLogger.logEvent(
						"HookProcessPool",
						"process_returned_to_pool",
						{
							processPid: process.pid,
							newPoolSize: this.pool.length,
							idleTimeout: this.processTimeout,
							totalIdleTimers: this.processIdleTimers.size,
						},
						"hook-pool",
					);

					this.emit("process_released", { poolSize: this.pool.length });
				} else {
					// Pool is full, terminate excess process
					debugLogger.logEvent(
						"HookProcessPool",
						"terminating_excess_process",
						{
							processPid: process.pid,
							poolSize: this.pool.length,
							maxProcesses: this.maxProcesses,
							reason: "pool_full",
						},
						"hook-pool",
					);

					this.terminateProcess(process);
				}
			},
			[process],
			"hook-pool",
		);
	}

	/**
	 * Execute hook using pool
	 */
	async executeHook(
		hookType: HookType,
		args: string[],
	): Promise<{ output: string; exitCode: number }> {
		return debugLogger.logAsyncFunction(
			"HookProcessPool",
			"executeHook",
			async () => {
				debugLogger.logEvent(
					"HookProcessPool",
					"pool_execution_start",
					{
						hookType,
						argsCount: args?.length || 0,
						poolSize: this.pool.length,
						activeProcesses: this.getActiveProcessCount(),
					},
					"hook-pool",
				);

				const process = await this.acquireProcess();

				debugLogger.logEvent(
					"HookProcessPool",
					"process_acquired_for_execution",
					{
						hookType,
						processPid: process.pid,
						remainingPoolSize: this.pool.length,
					},
					"hook-pool",
				);

				try {
					const result = await this.executeOnProcess(process, hookType, args);

					debugLogger.logEvent(
						"HookProcessPool",
						"pool_execution_success",
						{
							hookType,
							processPid: process.pid,
							outputLength: result.output?.length || 0,
							exitCode: result.exitCode,
						},
						"hook-pool",
					);

					return result;
				} catch (error) {
					debugLogger.logEvent(
						"HookProcessPool",
						"pool_execution_failed",
						{
							hookType,
							processPid: process.pid,
							error: error instanceof Error ? error.message : String(error),
						},
						"hook-pool",
					);
					throw error;
				} finally {
					debugLogger.logEvent(
						"HookProcessPool",
						"releasing_process_after_execution",
						{
							hookType,
							processPid: process.pid,
						},
						"hook-pool",
					);
					this.releaseProcess(process);
				}
			},
			[hookType, args],
			"hook-pool",
		);
	}

	/**
	 * Execute hook on specific process
	 */
	private async executeOnProcess(
		process: ChildProcess,
		hookType: HookType,
		args: string[],
	): Promise<{ output: string; exitCode: number }> {
		return debugLogger.logAsyncFunction(
			"HookProcessPool",
			"executeOnProcess",
			async () => {
				return new Promise((resolve, reject) => {
					const timeout = HOOK_TIMEOUTS[hookType];
					let output = "";
					let errorOutput = "";
					const command = `npx claude-flow hooks ${hookType} ${args.join(" ")}\n`;

					debugLogger.logEvent(
						"HookProcessPool",
						"process_execution_start",
						{
							hookType,
							processPid: process.pid,
							timeout,
							command: command.trim(),
							processKilled: process.killed,
						},
						"hook-process",
					);

					const dataHandler = (data: Buffer) => {
						const chunk = data.toString();
						output += chunk;

						debugLogger.logEvent(
							"HookProcessPool",
							"process_stdout_data",
							{
								hookType,
								processPid: process.pid,
								chunkLength: chunk.length,
								totalOutputLength: output.length,
								hasCompletionMarker: chunk.includes("HOOK_EXECUTION_COMPLETE"),
							},
							"hook-process",
						);

						// Check for completion marker
						if (output.includes("HOOK_EXECUTION_COMPLETE")) {
							process.stdout?.removeListener("data", dataHandler);
							process.stderr?.removeListener("data", errorHandler);
							clearTimeout(timeoutId);

							debugLogger.logEvent(
								"HookProcessPool",
								"process_execution_complete",
								{
									hookType,
									processPid: process.pid,
									finalOutputLength: output.length,
									errorOutputLength: errorOutput.length,
								},
								"hook-process",
							);

							resolve({ output, exitCode: 0 });
						}
					};

					const errorHandler = (data: Buffer) => {
						const chunk = data.toString();
						errorOutput += chunk;

						debugLogger.logEvent(
							"HookProcessPool",
							"process_stderr_data",
							{
								hookType,
								processPid: process.pid,
								chunkLength: chunk.length,
								totalErrorLength: errorOutput.length,
							},
							"hook-process",
						);
					};

					process.stdout?.on("data", dataHandler);
					process.stderr?.on("data", errorHandler);

					// Set timeout
					const timeoutId = setTimeout(() => {
						process.stdout?.removeListener("data", dataHandler);
						process.stderr?.removeListener("data", errorHandler);

						debugLogger.logEvent(
							"HookProcessPool",
							"process_execution_timeout",
							{
								hookType,
								processPid: process.pid,
								timeout,
								partialOutput:
									output.substring(0, 100) + (output.length > 100 ? "..." : ""),
								partialError:
									errorOutput.substring(0, 100) +
									(errorOutput.length > 100 ? "..." : ""),
							},
							"hook-process",
						);

						reject(new Error(`Hook ${hookType} timed out after ${timeout}ms`));
					}, timeout);

					// Send command
					debugLogger.logEvent(
						"HookProcessPool",
						"sending_command_to_process",
						{
							hookType,
							processPid: process.pid,
							command: command.trim(),
						},
						"hook-process",
					);

					process.stdin?.write(command);

					// Cleanup timeout on completion
					process.once("exit", () => {
						clearTimeout(timeoutId);
						debugLogger.logEvent(
							"HookProcessPool",
							"process_exited",
							{
								hookType,
								processPid: process.pid,
							},
							"hook-process",
						);
					});
				});
			},
			[process, hookType, args],
			"hook-process",
		);
	}

	/**
	 * Terminate idle process
	 */
	private terminateIdleProcess(process: ChildProcess): void {
		// Clear timer from registry
		const timer = this.processIdleTimers.get(process);
		if (timer) {
			globalTimerRegistry.clear(timer);
		}
		this.processIdleTimers.delete(process);
		this.removeProcessFromPool(process);
		this.terminateProcess(process);

		this.emit("process_idle_terminated", { poolSize: this.pool.length });
	}

	/**
	 * Terminate process
	 */
	private terminateProcess(process: ChildProcess): void {
		debugLogger.logSyncFunction(
			"HookProcessPool",
			"terminateProcess",
			() => {
				debugLogger.logEvent(
					"HookProcessPool",
					"process_termination_start",
					{
						processPid: process.pid,
						processKilled: process.killed,
						poolSize: this.pool.length,
					},
					"hook-pool",
				);

				process.kill("SIGTERM");

				debugLogger.logEvent(
					"HookProcessPool",
					"sigterm_sent",
					{
						processPid: process.pid,
						forceKillTimeout: 5000,
					},
					"hook-pool",
				);

				// Force kill if not terminated in 5 seconds - register timer
				globalTimerRegistry.register(
					setTimeout(() => {
						if (!process.killed) {
							debugLogger.logEvent(
								"HookProcessPool",
								"force_killing_process",
								{
									processPid: process.pid,
									reason: "sigterm_timeout",
								},
								"hook-pool",
							);
							process.kill("SIGKILL");
						} else {
							debugLogger.logEvent(
								"HookProcessPool",
								"process_already_terminated",
								{
									processPid: process.pid,
								},
								"hook-pool",
							);
						}
					}, 5000),
					"timeout",
				);
			},
			[process],
			"hook-pool",
		);
	}

	/**
	 * Remove process from pool
	 */
	private removeProcessFromPool(process: ChildProcess): void {
		const index = this.pool.indexOf(process);
		if (index > -1) {
			this.pool.splice(index, 1);
		}

		const timer = this.processIdleTimers.get(process);
		if (timer) {
			clearTimeout(timer);
			this.processIdleTimers.delete(process);
		}
	}

	/**
	 * Get active process count
	 */
	private getActiveProcessCount(): number {
		return this.pool.filter((p) => !p.killed).length;
	}

	/**
	 * Shutdown pool
	 */
	async shutdown(): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookProcessPool",
			"shutdown",
			async () => {
				const initialPoolSize = this.pool.length;
				const initialIdleTimers = this.processIdleTimers.size;
				const processPids = this.pool.map((p) => p.pid);

				debugLogger.logEvent(
					"HookProcessPool",
					"shutdown_start",
					{
						initialPoolSize,
						initialIdleTimers,
						processPids,
						maxProcesses: this.maxProcesses,
					},
					"hook-pool",
				);

				// Clear all idle timers using timer registry
				let clearedTimers = 0;
				this.processIdleTimers.forEach((timer, process) => {
					globalTimerRegistry.clear(timer);
					clearedTimers++;
					debugLogger.logEvent(
						"HookProcessPool",
						"idle_timer_cleared_during_shutdown",
						{
							processPid: process.pid,
							clearedTimers,
						},
						"hook-pool",
					);
				});
				this.processIdleTimers.clear();

				debugLogger.logEvent(
					"HookProcessPool",
					"all_idle_timers_cleared",
					{
						clearedTimers,
						remainingTimers: this.processIdleTimers.size,
					},
					"hook-pool",
				);

				// Terminate all processes
				let terminatedProcesses = 0;
				for (const process of this.pool) {
					debugLogger.logEvent(
						"HookProcessPool",
						"terminating_process_during_shutdown",
						{
							processPid: process.pid,
							terminatedProcesses,
						},
						"hook-pool",
					);
					this.terminateProcess(process);
					terminatedProcesses++;
				}

				this.pool = [];

				debugLogger.logEvent(
					"HookProcessPool",
					"shutdown_complete",
					{
						initialPoolSize,
						terminatedProcesses,
						clearedTimers,
						finalPoolSize: this.pool.length,
						finalIdleTimers: this.processIdleTimers.size,
					},
					"hook-pool",
				);

				this.emit("pool_shutdown");
			},
			[],
			"hook-pool",
		);
	}

	/**
	 * Get pool status
	 */
	getPoolStatus(): { size: number; maxSize: number; activeProcesses: number } {
		return debugLogger.logSyncFunction(
			"HookProcessPool",
			"getPoolStatus",
			() => {
				const status = {
					size: this.pool.length,
					maxSize: this.maxProcesses,
					activeProcesses: this.getActiveProcessCount(),
				};

				debugLogger.logEvent(
					"HookProcessPool",
					"pool_status_retrieved",
					{
						...status,
						idleTimers: this.processIdleTimers.size,
						minProcesses: this.minProcesses,
						processTimeout: this.processTimeout,
						processPids: this.pool.map((p) => p.pid),
					},
					"hook-pool",
				);

				return status;
			},
			[],
			"hook-pool",
		);
	}
}

// Global instances
export const globalHookQueue = new HookExecutionQueue();
export const globalProcessPool = new HookProcessPool();

// Helper function for easy hook execution
export async function executeHookSafely(
	hookType: HookType,
	args: string[],
	priority: "low" | "medium" | "high" = "medium",
): Promise<any> {
	return debugLogger.logAsyncFunction(
		"GlobalHookExecution",
		"executeHookSafely",
		async () => {
			debugLogger.logEvent(
				"GlobalHookExecution",
				"safe_execution_request",
				{
					hookType,
					argsCount: args?.length || 0,
					priority,
					currentQueueLength: globalHookQueue.getQueueStatus().length,
					queueExecuting: globalHookQueue.getQueueStatus().executing,
				},
				"hook-execution",
			);

			try {
				const result = await globalHookQueue.enqueue(hookType, args, priority);

				debugLogger.logEvent(
					"GlobalHookExecution",
					"safe_execution_success",
					{
						hookType,
						priority,
						resultType: typeof result,
						hasResult: result !== undefined,
					},
					"hook-execution",
				);

				return result;
			} catch (error) {
				debugLogger.logEvent(
					"GlobalHookExecution",
					"safe_execution_failed",
					{
						hookType,
						priority,
						error: error instanceof Error ? error.message : String(error),
						errorType:
							error instanceof Error ? error.constructor.name : "Unknown",
					},
					"hook-execution",
				);
				throw error;
			}
		},
		[hookType, args, priority],
		"hook-execution",
	);
}

// Export types
export type { HookType, HookTask, HookExecutionResult };
