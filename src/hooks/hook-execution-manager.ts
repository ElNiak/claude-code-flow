/**
 * Hook Execution Manager
 *
 * Prevents deadlocks by serializing hook execution and managing process coordination
 */

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import {
	CircuitBreaker,
	CircuitBreakerManager,
} from "../utils/circuit-breaker.js";
import { TimeoutManager } from "../utils/timeout-manager.js";

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
		priority: "low" | "medium" | "high" = "medium"
	): Promise<any> {
		const taskId = this.generateTaskId();

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

			this.emit("hook_queued", {
				taskId,
				hookType,
				queueLength: this.queue.length,
			});

			// Process queue
			this.processQueue();
		});
	}

	/**
	 * Process the hook execution queue
	 */
	private async processQueue(): Promise<void> {
		if (this.executing || this.queue.length === 0) return;

		this.executing = true;
		this.emit("queue_processing_started", { queueLength: this.queue.length });

		while (this.queue.length > 0) {
			const task = this.queue.shift()!;

			try {
				await this.executeHookTask(task);
			} catch (error) {
				this.emit("hook_execution_failed", {
					taskId: task.id,
					hookType: task.hookType,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		this.executing = false;
		this.emit("queue_processing_completed");
	}

	/**
	 * Execute a single hook task with timeout and retry logic
	 */
	private async executeHookTask(task: HookTask): Promise<void> {
		const startTime = performance.now();
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				this.emit("hook_execution_started", {
					taskId: task.id,
					hookType: task.hookType,
					attempt,
					queuedFor: Date.now() - task.createdAt,
				});

				const result = await this.executeHookWithTimeout(
					task.hookType,
					task.args
				);
				const duration = performance.now() - startTime;

				// Record successful execution
				this.recordExecutionResult(task.hookType, {
					success: true,
					duration,
					output: result.output,
				});

				this.emit("hook_execution_completed", {
					taskId: task.id,
					hookType: task.hookType,
					duration,
					attempt,
				});

				task.resolve(result);
				return;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				this.emit("hook_execution_retry", {
					taskId: task.id,
					hookType: task.hookType,
					attempt,
					error: lastError.message,
				});

				if (attempt < this.maxRetries) {
					await this.delay(this.retryDelay * attempt);
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

		task.reject(lastError || new Error("Hook execution failed after retries"));
	}

	/**
	 * Execute hook with strict timeout enforcement
	 */
	private async executeHookWithTimeout(
		hookType: HookType,
		args: string[]
	): Promise<{ output: string; exitCode: number }> {
		const timeout = HOOK_TIMEOUTS[hookType];

		return Promise.race([
			this.executeHookProcess(hookType, args),
			new Promise<never>((_, reject) =>
				setTimeout(
					() =>
						reject(new Error(`Hook ${hookType} timed out after ${timeout}ms`)),
					timeout
				)
			),
		]);
	}

	/**
	 * Execute hook process
	 */
	private async executeHookProcess(
		hookType: HookType,
		args: string[]
	): Promise<{ output: string; exitCode: number }> {
		return new Promise((resolve, reject) => {
			const childProcess = spawn(
				"npx",
				["claude-flow", "hooks", hookType, ...args],
				{
					stdio: ["pipe", "pipe", "pipe"],
					env: { ...process.env, HOOK_EXECUTION_SERIALIZED: "true" },
				}
			);

			let output = "";
			let errorOutput = "";

			childProcess.stdout?.on("data", (data: Buffer) => {
				output += data.toString();
			});

			childProcess.stderr?.on("data", (data: Buffer) => {
				errorOutput += data.toString();
			});

			childProcess.on("close", (code: number | null) => {
				if (code === 0) {
					resolve({ output, exitCode: code });
				} else {
					reject(
						new Error(
							`Hook ${hookType} failed with exit code ${code}: ${errorOutput}`
						)
					);
				}
			});

			childProcess.on("error", (error: Error) => {
				reject(new Error(`Hook ${hookType} process error: ${error.message}`));
			});

			// Ensure process is killed on timeout
			const killTimeout = setTimeout(() => {
				childProcess.kill("SIGKILL");
				reject(new Error(`Hook ${hookType} process killed due to timeout`));
			}, HOOK_TIMEOUTS[hookType] + 1000);

			childProcess.on("exit", () => {
				clearTimeout(killTimeout);
			});
		});
	}

	/**
	 * Insert task by priority
	 */
	private insertByPriority(task: HookTask): void {
		const priorityOrder = { high: 0, medium: 1, low: 2 };

		let insertIndex = this.queue.length;
		for (let i = 0; i < this.queue.length; i++) {
			if (
				priorityOrder[task.priority] < priorityOrder[this.queue[i].priority]
			) {
				insertIndex = i;
				break;
			}
		}

		this.queue.splice(insertIndex, 0, task);
	}

	/**
	 * Record execution result for metrics
	 */
	private recordExecutionResult(
		hookType: HookType,
		result: HookExecutionResult
	): void {
		if (!this.executionStats.has(hookType)) {
			this.executionStats.set(hookType, []);
		}

		const stats = this.executionStats.get(hookType)!;
		stats.push(result);

		// Keep only last 100 results per hook type
		if (stats.length > 100) {
			stats.shift();
		}
	}

	/**
	 * Get execution statistics
	 */
	getExecutionStats(): Record<string, any> {
		const stats: Record<string, any> = {};

		this.executionStats.forEach((results, hookType) => {
			const successful = results.filter((r) => r.success);
			const failed = results.filter((r) => !r.success);

			stats[hookType] = {
				total: results.length,
				successful: successful.length,
				failed: failed.length,
				successRate:
					results.length > 0 ? (successful.length / results.length) * 100 : 0,
				avgDuration:
					results.length > 0
						? results.reduce((sum, r) => sum + r.duration, 0) / results.length
						: 0,
				minDuration:
					results.length > 0 ? Math.min(...results.map((r) => r.duration)) : 0,
				maxDuration:
					results.length > 0 ? Math.max(...results.map((r) => r.duration)) : 0,
			};
		});

		return stats;
	}

	/**
	 * Get current queue status
	 */
	getQueueStatus(): {
		length: number;
		executing: boolean;
		priorities: Record<string, number>;
	} {
		const priorities = { high: 0, medium: 0, low: 0 };

		for (const task of this.queue) {
			priorities[task.priority]++;
		}

		return {
			length: this.queue.length,
			executing: this.executing,
			priorities,
		};
	}

	/**
	 * Emergency clear queue
	 */
	emergencyClear(): void {
		const clearedTasks = this.queue.length;

		// Reject all pending tasks
		for (const task of this.queue) {
			task.reject(new Error("Queue emergency cleared"));
		}

		this.queue = [];
		this.executing = false;

		this.emit("emergency_clear", { clearedTasks });
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
		// Emit metrics every 30 seconds
		setInterval(() => {
			this.emit("metrics_update", {
				stats: this.getExecutionStats(),
				queue: this.getQueueStatus(),
				timestamp: new Date().toISOString(),
			});
		}, 30000);
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
		return new Promise((resolve, reject) => {
			const process = spawn("node", ["-e", "process.stdin.resume()"], {
				stdio: ["pipe", "pipe", "pipe"],
			});

			process.on("spawn", () => {
				this.pool.push(process);
				this.emit("process_created", { poolSize: this.pool.length });
				resolve(process);
			});

			process.on("error", reject);
			process.on("exit", () => {
				this.removeProcessFromPool(process);
			});
		});
	}

	/**
	 * Acquire a process from the pool
	 */
	async acquireProcess(): Promise<ChildProcess> {
		// Clear idle timer for acquired process
		if (this.pool.length > 0) {
			const process = this.pool.shift()!;
			const timer = this.processIdleTimers.get(process);
			if (timer) {
				clearTimeout(timer);
				this.processIdleTimers.delete(process);
			}
			return process;
		}

		// Create new process if pool is empty and we haven't reached max
		if (this.pool.length + this.getActiveProcessCount() < this.maxProcesses) {
			return await this.createProcess();
		}

		// Wait for a process to become available
		return new Promise((resolve) => {
			const checkForAvailable = () => {
				if (this.pool.length > 0) {
					resolve(this.acquireProcess());
				} else {
					setTimeout(checkForAvailable, 100);
				}
			};
			checkForAvailable();
		});
	}

	/**
	 * Release a process back to the pool
	 */
	releaseProcess(process: ChildProcess): void {
		if (this.pool.length < this.maxProcesses) {
			this.pool.push(process);

			// Set idle timer
			const timer = setTimeout(() => {
				this.terminateIdleProcess(process);
			}, this.processTimeout);

			this.processIdleTimers.set(process, timer);

			this.emit("process_released", { poolSize: this.pool.length });
		} else {
			// Pool is full, terminate excess process
			this.terminateProcess(process);
		}
	}

	/**
	 * Execute hook using pool
	 */
	async executeHook(
		hookType: HookType,
		args: string[]
	): Promise<{ output: string; exitCode: number }> {
		const process = await this.acquireProcess();

		try {
			return await this.executeOnProcess(process, hookType, args);
		} finally {
			this.releaseProcess(process);
		}
	}

	/**
	 * Execute hook on specific process
	 */
	private async executeOnProcess(
		process: ChildProcess,
		hookType: HookType,
		args: string[]
	): Promise<{ output: string; exitCode: number }> {
		return new Promise((resolve, reject) => {
			const timeout = HOOK_TIMEOUTS[hookType];
			let output = "";
			let errorOutput = "";

			const command = `npx claude-flow hooks ${hookType} ${args.join(" ")}\n`;

			const dataHandler = (data: Buffer) => {
				output += data.toString();

				// Check for completion marker
				if (output.includes("HOOK_EXECUTION_COMPLETE")) {
					process.stdout?.removeListener("data", dataHandler);
					process.stderr?.removeListener("data", errorHandler);
					resolve({ output, exitCode: 0 });
				}
			};

			const errorHandler = (data: Buffer) => {
				errorOutput += data.toString();
			};

			process.stdout?.on("data", dataHandler);
			process.stderr?.on("data", errorHandler);

			// Set timeout
			const timeoutId = setTimeout(() => {
				process.stdout?.removeListener("data", dataHandler);
				process.stderr?.removeListener("data", errorHandler);
				reject(new Error(`Hook ${hookType} timed out after ${timeout}ms`));
			}, timeout);

			// Send command
			process.stdin?.write(command);

			// Cleanup timeout on completion
			process.once("exit", () => {
				clearTimeout(timeoutId);
			});
		});
	}

	/**
	 * Terminate idle process
	 */
	private terminateIdleProcess(process: ChildProcess): void {
		this.processIdleTimers.delete(process);
		this.removeProcessFromPool(process);
		this.terminateProcess(process);

		this.emit("process_idle_terminated", { poolSize: this.pool.length });
	}

	/**
	 * Terminate process
	 */
	private terminateProcess(process: ChildProcess): void {
		process.kill("SIGTERM");

		// Force kill if not terminated in 5 seconds
		setTimeout(() => {
			if (!process.killed) {
				process.kill("SIGKILL");
			}
		}, 5000);
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
		// Clear all idle timers
		this.processIdleTimers.forEach((timer) => {
			clearTimeout(timer);
		});
		this.processIdleTimers.clear();

		// Terminate all processes
		for (const process of this.pool) {
			this.terminateProcess(process);
		}

		this.pool = [];
		this.emit("pool_shutdown");
	}

	/**
	 * Get pool status
	 */
	getPoolStatus(): { size: number; maxSize: number; activeProcesses: number } {
		return {
			size: this.pool.length,
			maxSize: this.maxProcesses,
			activeProcesses: this.getActiveProcessCount(),
		};
	}
}

// Global instances
export const globalHookQueue = new HookExecutionQueue();
export const globalProcessPool = new HookProcessPool();

// Helper function for easy hook execution
export async function executeHookSafely(
	hookType: HookType,
	args: string[],
	priority: "low" | "medium" | "high" = "medium"
): Promise<any> {
	return globalHookQueue.enqueue(hookType, args, priority);
}

// Export types
export type { HookType, HookTask, HookExecutionResult };
