/**
 * Hook Coordinator
 *
 * Coordinates hook execution across multiple processes and prevents deadlocks
 * through intelligent scheduling and dependency management
 */

import { EventEmitter } from "events";
import { debugLogger } from "../../../../utils/debug-logger.js";
import {
	executeHookSafely,
	HookExecutionQueue,
	HookProcessPool,
	type HookType,
} from "./execution-manager.js";

interface HookDependency {
	hook: HookType;
	dependsOn: HookType[];
	blockedBy: HookType[];
	priority: "low" | "medium" | "high";
}

interface CoordinationLock {
	lockId: string;
	processId: number;
	hookType: HookType;
	acquiredAt: number;
	expiresAt: number;
}

interface HookExecution {
	id: string;
	hookType: HookType;
	args: string[];
	processId: number;
	startTime: number;
	status: "pending" | "running" | "completed" | "failed";
	dependencies: string[];
}

/**
 * Process-Level Hook Coordinator
 * Prevents hook stampedes and manages cross-process coordination
 */
export class HookCoordinator extends EventEmitter {
	private coordinationState = new Map<string, CoordinationLock>();
	private lockTimeouts = new Map<string, NodeJS.Timeout>();
	private executionQueue: HookExecutionQueue;
	private processPool: HookProcessPool;
	private activeLocks = new Map<string, CoordinationLock>();
	private pendingExecutions = new Map<string, HookExecution>();
	private dependencyGraph = new Map<HookType, HookDependency>();
	private maxConcurrentHooks = 3;
	private lockTimeout = 30000; // 30 seconds
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(options: { maxConcurrentHooks?: number } = {}) {
		super();

		this.maxConcurrentHooks = options.maxConcurrentHooks || 3;

		this.executionQueue = new HookExecutionQueue();
		this.processPool = new HookProcessPool();

		this.initializeDependencyGraph();
		this.startCleanupProcess();
	}

	/**
	 * Initialize hook dependency graph
	 */
	private initializeDependencyGraph(): void {
		return debugLogger.logSyncFunction(
			"HookCoordinator",
			"initializeDependencyGraph",
			() => {
				debugLogger.logEvent(
					"HookCoordinator",
					"dependency_graph_initialization_started",
					{
						maxConcurrentHooks: this.maxConcurrentHooks,
						lockTimeout: this.lockTimeout,
					},
					"hook-coordination",
				);

				const dependencies: HookDependency[] = [
					{
						hook: "pre-task",
						dependsOn: [],
						blockedBy: [],
						priority: "high",
					},
					{
						hook: "pre-edit",
						dependsOn: ["pre-task"],
						blockedBy: ["post-edit"],
						priority: "high",
					},
					{
						hook: "post-edit",
						dependsOn: ["pre-edit"],
						blockedBy: ["post-task"],
						priority: "medium",
					},
					{
						hook: "post-task",
						dependsOn: ["pre-task"],
						blockedBy: [],
						priority: "medium",
					},
					{
						hook: "pre-bash",
						dependsOn: [],
						blockedBy: [],
						priority: "high",
					},
					{
						hook: "pre-read",
						dependsOn: [],
						blockedBy: [],
						priority: "low",
					},
					{
						hook: "notify",
						dependsOn: [],
						blockedBy: [],
						priority: "low",
					},
					{
						hook: "session-restore",
						dependsOn: [],
						blockedBy: ["session-end"],
						priority: "high",
					},
					{
						hook: "session-end",
						dependsOn: ["session-restore"],
						blockedBy: [],
						priority: "medium",
					},
				];

				const dependencyStats = {
					totalHooks: dependencies.length,
					highPriority: dependencies.filter((d) => d.priority === "high")
						.length,
					mediumPriority: dependencies.filter((d) => d.priority === "medium")
						.length,
					lowPriority: dependencies.filter((d) => d.priority === "low").length,
					withDependencies: dependencies.filter((d) => d.dependsOn.length > 0)
						.length,
					blocking: dependencies.filter((d) => d.blockedBy.length > 0).length,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"dependency_graph_structure_analyzed",
					dependencyStats,
					"hook-dependencies",
				);

				for (const dep of dependencies) {
					this.dependencyGraph.set(dep.hook, dep);

					debugLogger.logEvent(
						"HookCoordinator",
						"dependency_registered",
						{
							hook: dep.hook,
							dependsOn: dep.dependsOn,
							blockedBy: dep.blockedBy,
							priority: dep.priority,
							dependencyCount: dep.dependsOn.length,
							blockingCount: dep.blockedBy.length,
						},
						"hook-dependencies",
					);
				}

				debugLogger.logEvent(
					"HookCoordinator",
					"dependency_graph_initialization_completed",
					{ registeredHooks: this.dependencyGraph.size, ...dependencyStats },
					"hook-coordination",
				);
			},
			[],
			"hook-coordination",
		);
	}

	/**
	 * Coordinate hook execution with deadlock prevention
	 */
	async coordinateHook(
		hookType: HookType,
		args: string[],
		options: { priority?: "low" | "medium" | "high"; timeout?: number } = {},
	): Promise<any> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"coordinateHook",
			async () => {
				const executionId = this.generateExecutionId();
				const processId = process.pid;
				const priority =
					options.priority ||
					this.getDependency(hookType)?.priority ||
					"medium";

				const coordinationContext = {
					executionId,
					hookType,
					processId,
					priority,
					timeout: options.timeout,
					argsCount: args.length,
					currentActiveLocks: this.activeLocks.size,
					currentPendingExecutions: this.pendingExecutions.size,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"coordination_request_received",
					coordinationContext,
					"hook-coordination",
				);

				try {
					// Check for deadlock potential
					debugLogger.logEvent(
						"HookCoordinator",
						"deadlock_check_starting",
						{ hookType, processId, activeLocks: this.activeLocks.size },
						"hook-deadlock",
					);

					await this.checkDeadlockPotential(hookType, processId);

					debugLogger.logEvent(
						"HookCoordinator",
						"deadlock_check_passed",
						{ hookType, processId },
						"hook-deadlock",
					);

					// Acquire coordination lock
					debugLogger.logEvent(
						"HookCoordinator",
						"lock_acquisition_starting",
						{
							hookType,
							processId,
							executionId,
							existingLocks: Array.from(this.coordinationState.keys()),
						},
						"hook-locking",
					);

					const lockStartTime = Date.now();
					const lockId = await this.acquireCoordinationLock(
						hookType,
						processId,
					);
					const lockAcquisitionTime = Date.now() - lockStartTime;

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_acquired_successfully",
						{
							hookType,
							processId,
							executionId,
							lockId,
							acquisitionTimeMs: lockAcquisitionTime,
						},
						"hook-locking",
					);

					// Create execution record
					const execution: HookExecution = {
						id: executionId,
						hookType,
						args,
						processId,
						startTime: Date.now(),
						status: "pending",
						dependencies: this.getDependencyHooks(hookType),
					};

					this.pendingExecutions.set(executionId, execution);

					debugLogger.logEvent(
						"HookCoordinator",
						"execution_record_created",
						{
							executionId,
							hookType,
							processId,
							dependencies: execution.dependencies,
							dependencyCount: execution.dependencies.length,
							totalPendingExecutions: this.pendingExecutions.size,
						},
						"hook-coordination",
					);

					this.emit("hook_coordination_started", {
						executionId,
						hookType,
						processId,
						priority,
						dependencies: execution.dependencies,
					});

					// Wait for dependencies to complete
					if (execution.dependencies.length > 0) {
						debugLogger.logEvent(
							"HookCoordinator",
							"dependency_wait_starting",
							{ executionId, hookType, dependencies: execution.dependencies },
							"hook-dependencies",
						);

						const depWaitStartTime = Date.now();
						await this.waitForDependencies(execution);
						const depWaitTime = Date.now() - depWaitStartTime;

						debugLogger.logEvent(
							"HookCoordinator",
							"dependencies_satisfied",
							{
								executionId,
								hookType,
								waitTimeMs: depWaitTime,
								dependencies: execution.dependencies,
							},
							"hook-dependencies",
						);
					}

					// Execute hook through queue
					execution.status = "running";

					debugLogger.logEvent(
						"HookCoordinator",
						"hook_execution_starting",
						{
							executionId,
							hookType,
							processId,
							priority,
							queueSize: this.executionQueue.getQueueStatus().length,
						},
						"hook-coordination",
					);

					const executionStartTime = Date.now();
					const result = await this.executionQueue.enqueue(
						hookType,
						args,
						priority,
					);
					const executionTime = Date.now() - executionStartTime;

					// Mark as completed
					execution.status = "completed";
					this.pendingExecutions.delete(executionId);

					debugLogger.logEvent(
						"HookCoordinator",
						"hook_execution_completed",
						{
							executionId,
							hookType,
							processId,
							executionTimeMs: executionTime,
							resultType: typeof result,
							hasResult: result !== undefined,
						},
						"hook-coordination",
					);

					// Release coordination lock
					debugLogger.logEvent(
						"HookCoordinator",
						"lock_release_starting",
						{ executionId, hookType, lockId, processId },
						"hook-locking",
					);

					await this.releaseCoordinationLock(lockId);

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_released_successfully",
						{
							executionId,
							hookType,
							lockId,
							processId,
							remainingLocks: this.activeLocks.size,
						},
						"hook-locking",
					);

					const totalCoordinationTime = Date.now() - execution.startTime;

					this.emit("hook_coordination_completed", {
						executionId,
						hookType,
						processId,
						duration: totalCoordinationTime,
					});

					debugLogger.logEvent(
						"HookCoordinator",
						"coordination_completed_successfully",
						{
							executionId,
							hookType,
							processId,
							totalTimeMs: totalCoordinationTime,
							lockAcquisitionTimeMs: lockAcquisitionTime,
							executionTimeMs: executionTime,
							efficiency: executionTime / totalCoordinationTime,
						},
						"hook-coordination",
					);

					return result;
				} catch (error) {
					// Mark as failed
					const execution = this.pendingExecutions.get(executionId);
					if (execution) {
						execution.status = "failed";
						this.pendingExecutions.delete(executionId);

						debugLogger.logEvent(
							"HookCoordinator",
							"execution_marked_as_failed",
							{
								executionId,
								hookType,
								processId,
								duration: Date.now() - execution.startTime,
								error: error instanceof Error ? error.message : String(error),
							},
							"hook-coordination",
						);
					}

					this.emit("hook_coordination_failed", {
						executionId,
						hookType,
						processId,
						error: error instanceof Error ? error.message : String(error),
					});

					debugLogger.logEvent(
						"HookCoordinator",
						"coordination_failed",
						{
							executionId,
							hookType,
							processId,
							error: error instanceof Error ? error.message : String(error),
							errorType:
								error instanceof Error ? error.constructor.name : typeof error,
							activeLocks: this.activeLocks.size,
							pendingExecutions: this.pendingExecutions.size,
						},
						"hook-coordination",
					);

					throw error;
				}
			},
			[hookType, args, options],
			"hook-coordination",
		);
	}

	/**
	 * Check for potential deadlock scenarios
	 */
	private async checkDeadlockPotential(
		hookType: HookType,
		processId: number,
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"checkDeadlockPotential",
			async () => {
				const dependency = this.getDependency(hookType);

				debugLogger.logEvent(
					"HookCoordinator",
					"deadlock_analysis_starting",
					{
						hookType,
						processId,
						hasDependency: !!dependency,
						dependsOn: dependency?.dependsOn || [],
						blockedBy: dependency?.blockedBy || [],
						currentRunningHooks: Array.from(
							this.pendingExecutions.values(),
						).filter((e) => e.status === "running").length,
						maxConcurrentHooks: this.maxConcurrentHooks,
					},
					"hook-deadlock",
				);

				if (!dependency) {
					debugLogger.logEvent(
						"HookCoordinator",
						"no_dependency_found_skip_deadlock_check",
						{ hookType, processId },
						"hook-deadlock",
					);
					return;
				}

				// Check for circular dependencies
				const visited = new Set<HookType>();
				const recursionStack = new Set<HookType>();

				debugLogger.logEvent(
					"HookCoordinator",
					"circular_dependency_check_starting",
					{
						hookType,
						dependsOn: dependency.dependsOn,
						blockedBy: dependency.blockedBy,
					},
					"hook-deadlock",
				);

				if (this.hasCyclicDependency(hookType, visited, recursionStack)) {
					const circularPath = Array.from(recursionStack);

					debugLogger.logEvent(
						"HookCoordinator",
						"circular_dependency_detected",
						{
							hookType,
							processId,
							circularPath,
							visitedHooks: Array.from(visited),
						},
						"hook-deadlock",
					);

					throw new Error(`Circular dependency detected for hook ${hookType}`);
				}

				debugLogger.logEvent(
					"HookCoordinator",
					"circular_dependency_check_passed",
					{ hookType, processId, visitedHooks: Array.from(visited) },
					"hook-deadlock",
				);

				// Check for resource contention
				const runningHooks = Array.from(this.pendingExecutions.values()).filter(
					(exec) => exec.status === "running" && exec.processId !== processId,
				);

				const contentionAnalysis = {
					runningHooksCount: runningHooks.length,
					maxConcurrentHooks: this.maxConcurrentHooks,
					isAtCapacity: runningHooks.length >= this.maxConcurrentHooks,
					runningHookTypes: runningHooks.map((h) => h.hookType),
					requestedHookType: hookType,
					wouldBlock: dependency.blockedBy,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"resource_contention_analysis",
					contentionAnalysis,
					"hook-deadlock",
				);

				if (runningHooks.length >= this.maxConcurrentHooks) {
					// Check if any running hooks are blocked by the requested hook
					const blockedHooks = runningHooks.filter((exec) =>
						dependency.blockedBy.includes(exec.hookType),
					);

					const potentialDeadlock = {
						hookType,
						processId,
						runningHooksCount: runningHooks.length,
						blockedHooksCount: blockedHooks.length,
						blockedHookTypes: blockedHooks.map((h) => h.hookType),
						wouldCauseDeadlock: blockedHooks.length > 0,
					};

					debugLogger.logEvent(
						"HookCoordinator",
						"deadlock_potential_analysis",
						potentialDeadlock,
						"hook-deadlock",
					);

					if (blockedHooks.length > 0) {
						debugLogger.logEvent(
							"HookCoordinator",
							"deadlock_prevented",
							{
								hookType,
								processId,
								blockedHookTypes: blockedHooks.map((h) => h.hookType),
								preventionReason: "would_block_running_hooks",
							},
							"hook-deadlock",
						);

						throw new Error(
							`Deadlock potential: ${hookType} would block running hooks ${blockedHooks.map((h) => h.hookType).join(", ")}`,
						);
					}
				}

				debugLogger.logEvent(
					"HookCoordinator",
					"deadlock_check_completed_safely",
					{
						hookType,
						processId,
						runningHooksCount: runningHooks.length,
						maxConcurrent: this.maxConcurrentHooks,
						resourcesAvailable: this.maxConcurrentHooks - runningHooks.length,
					},
					"hook-deadlock",
				);
			},
			[hookType, processId],
			"hook-deadlock",
		);
	}

	/**
	 * Check for cyclic dependencies
	 */
	private hasCyclicDependency(
		hookType: HookType,
		visited: Set<HookType>,
		recursionStack: Set<HookType>,
	): boolean {
		return debugLogger.logSyncFunction(
			"HookCoordinator",
			"hasCyclicDependency",
			() => {
				debugLogger.logEvent(
					"HookCoordinator",
					"cyclic_dependency_check_enter",
					{
						hookType,
						visitedCount: visited.size,
						recursionStackSize: recursionStack.size,
						visitedHooks: Array.from(visited),
						recursionPath: Array.from(recursionStack),
					},
					"hook-deadlock",
				);

				visited.add(hookType);
				recursionStack.add(hookType);

				const dependency = this.getDependency(hookType);

				debugLogger.logEvent(
					"HookCoordinator",
					"checking_dependencies",
					{
						hookType,
						hasDependency: !!dependency,
						dependencies: dependency?.dependsOn || [],
						dependencyCount: dependency?.dependsOn.length || 0,
						currentRecursionDepth: recursionStack.size,
					},
					"hook-deadlock",
				);

				if (dependency) {
					for (const depHook of dependency.dependsOn) {
						debugLogger.logEvent(
							"HookCoordinator",
							"analyzing_dependency",
							{
								currentHook: hookType,
								dependencyHook: depHook,
								alreadyVisited: visited.has(depHook),
								inRecursionStack: recursionStack.has(depHook),
								recursionDepth: recursionStack.size,
							},
							"hook-deadlock",
						);

						if (!visited.has(depHook)) {
							debugLogger.logEvent(
								"HookCoordinator",
								"recursing_into_unvisited_dependency",
								{
									from: hookType,
									to: depHook,
									recursionDepth: recursionStack.size,
								},
								"hook-deadlock",
							);

							if (this.hasCyclicDependency(depHook, visited, recursionStack)) {
								debugLogger.logEvent(
									"HookCoordinator",
									"cycle_found_in_recursion",
									{
										originHook: hookType,
										cyclicDependency: depHook,
										fullRecursionPath: Array.from(recursionStack),
										cycleDetectedAt: recursionStack.size,
									},
									"hook-deadlock",
								);
								return true;
							}
						} else if (recursionStack.has(depHook)) {
							debugLogger.logEvent(
								"HookCoordinator",
								"direct_cycle_detected",
								{
									currentHook: hookType,
									cyclicDependency: depHook,
									cycleLength:
										recursionStack.size -
										Array.from(recursionStack).indexOf(depHook),
									fullCyclePath: Array.from(recursionStack).concat([depHook]),
								},
								"hook-deadlock",
							);
							return true;
						} else {
							debugLogger.logEvent(
								"HookCoordinator",
								"dependency_already_processed_safely",
								{ currentHook: hookType, processedDependency: depHook },
								"hook-deadlock",
							);
						}
					}
				}

				recursionStack.delete(hookType);

				debugLogger.logEvent(
					"HookCoordinator",
					"cyclic_dependency_check_exit_clean",
					{
						hookType,
						finalVisitedCount: visited.size,
						finalRecursionStackSize: recursionStack.size,
						noCycleFound: true,
					},
					"hook-deadlock",
				);

				return false;
			},
			[hookType, visited, recursionStack],
			"hook-deadlock",
		);
	}

	/**
	 * Acquire coordination lock using in-memory coordination
	 */
	private async acquireCoordinationLock(
		hookType: HookType,
		processId: number,
	): Promise<string> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"acquireCoordinationLock",
			async () => {
				const lockId = `${hookType}-${processId}-${Date.now()}`;
				const resourceKey = `${hookType}`;

				const lockAcquisitionContext = {
					hookType,
					processId,
					lockId,
					resourceKey,
					currentActiveLocks: this.activeLocks.size,
					currentCoordinationState: this.coordinationState.size,
					lockTimeout: this.lockTimeout,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"lock_acquisition_attempt_started",
					lockAcquisitionContext,
					"hook-locking",
				);

				// Try to acquire lock using memory-based coordination (10x faster)
				const maxRetries = 10;
				const retryDelay = 50; // Reduced from 500ms to 50ms

				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					const attemptContext = {
						attempt,
						maxRetries,
						hookType,
						processId,
						lockId,
						resourceKey,
						retryDelay: retryDelay * attempt,
					};

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_acquisition_attempt",
						attemptContext,
						"hook-locking",
					);

					// Check if resource is already locked
					if (this.coordinationState.has(resourceKey)) {
						const existingLock = this.coordinationState.get(resourceKey)!;
						const now = Date.now();

						const lockConflictAnalysis = {
							existingLockId: existingLock.lockId,
							existingProcessId: existingLock.processId,
							existingLockAge: now - existingLock.acquiredAt,
							existingLockExpiry: existingLock.expiresAt,
							isExpired: existingLock.expiresAt < now,
							timeUntilExpiry: existingLock.expiresAt - now,
							requestingProcessId: processId,
							isOwnLock: existingLock.processId === processId,
						};

						debugLogger.logEvent(
							"HookCoordinator",
							"existing_lock_found_analyzing",
							lockConflictAnalysis,
							"hook-locking",
						);

						// Check if lock is expired
						if (existingLock.expiresAt < now) {
							debugLogger.logEvent(
								"HookCoordinator",
								"expired_lock_detected_cleaning",
								{
									expiredLockId: existingLock.lockId,
									expiredProcessId: existingLock.processId,
									lockAge: now - existingLock.acquiredAt,
									expiredBy: now - existingLock.expiresAt,
								},
								"hook-locking",
							);

							// Remove expired lock
							this.coordinationState.delete(resourceKey);
							const timeout = this.lockTimeouts.get(resourceKey);
							if (timeout) {
								clearTimeout(timeout);
								this.lockTimeouts.delete(resourceKey);
							}

							debugLogger.logEvent(
								"HookCoordinator",
								"expired_lock_cleaned_retrying",
								{ hookType, processId, attempt },
								"hook-locking",
							);
						} else {
							// Lock is still valid, wait and retry
							const waitTime = retryDelay * attempt;

							debugLogger.logEvent(
								"HookCoordinator",
								"lock_contention_waiting",
								{
									hookType,
									processId,
									attempt,
									waitTimeMs: waitTime,
									existingLockId: existingLock.lockId,
									existingProcessId: existingLock.processId,
									timeUntilExpiry: existingLock.expiresAt - now,
								},
								"hook-locking",
							);

							await this.delay(waitTime);
							continue;
						}
					} else {
						debugLogger.logEvent(
							"HookCoordinator",
							"no_existing_lock_proceeding",
							{ hookType, processId, attempt, resourceKey },
							"hook-locking",
						);
					}

					// Create new lock in memory
					const lock: CoordinationLock = {
						lockId,
						processId,
						hookType,
						acquiredAt: Date.now(),
						expiresAt: Date.now() + this.lockTimeout,
					};

					this.coordinationState.set(resourceKey, lock);
					this.activeLocks.set(lockId, lock);

					const lockCreationSuccess = {
						lockId,
						processId,
						hookType,
						acquiredAt: lock.acquiredAt,
						expiresAt: lock.expiresAt,
						lockDuration: this.lockTimeout,
						attempt,
						totalActiveLocks: this.activeLocks.size,
						resourceKey,
					};

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_created_successfully",
						lockCreationSuccess,
						"hook-locking",
					);

					// Set automatic cleanup timeout
					const timeout = setTimeout(() => {
						debugLogger.logEvent(
							"HookCoordinator",
							"lock_timeout_triggered_cleanup",
							{
								lockId,
								hookType,
								processId,
								lockAge: Date.now() - lock.acquiredAt,
							},
							"hook-locking",
						);

						this.coordinationState.delete(resourceKey);
						this.lockTimeouts.delete(resourceKey);
						this.activeLocks.delete(lockId);
					}, this.lockTimeout);

					this.lockTimeouts.set(resourceKey, timeout);

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_timeout_scheduled",
						{ lockId, hookType, processId, timeoutMs: this.lockTimeout },
						"hook-locking",
					);

					this.emit("coordination_lock_acquired", {
						lockId,
						hookType,
						processId,
					});

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_acquisition_completed_successfully",
						{
							lockId,
							hookType,
							processId,
							totalAttempts: attempt,
							finalActiveLocks: this.activeLocks.size,
							lockExpiresAt: lock.expiresAt,
						},
						"hook-locking",
					);

					return lockId;
				}

				const lockAcquisitionFailure = {
					hookType,
					processId,
					maxRetries,
					finalActiveLocks: this.activeLocks.size,
					finalCoordinationState: this.coordinationState.size,
					existingLocks: Array.from(this.coordinationState.entries()).map(
						([key, lock]) => ({
							resourceKey: key,
							lockId: lock.lockId,
							processId: lock.processId,
							age: Date.now() - lock.acquiredAt,
							isExpired: lock.expiresAt < Date.now(),
						}),
					),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"lock_acquisition_failed_after_retries",
					lockAcquisitionFailure,
					"hook-locking",
				);

				throw new Error(
					`Failed to acquire coordination lock for ${hookType} after ${maxRetries} attempts`,
				);
			},
			[hookType, processId],
			"hook-locking",
		);
	}

	/**
	 * Release coordination lock from memory
	 */
	private async releaseCoordinationLock(lockId: string): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"releaseCoordinationLock",
			async () => {
				const lock = this.activeLocks.get(lockId);

				const releaseContext = {
					lockId,
					lockExists: !!lock,
					currentActiveLocks: this.activeLocks.size,
					currentCoordinationState: this.coordinationState.size,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"lock_release_attempt_started",
					releaseContext,
					"hook-locking",
				);

				if (!lock) {
					debugLogger.logEvent(
						"HookCoordinator",
						"lock_not_found_in_active_locks",
						{
							lockId,
							existingLockIds: Array.from(this.activeLocks.keys()),
							activeLockCount: this.activeLocks.size,
						},
						"hook-locking",
					);
					return;
				}

				const resourceKey = `${lock.hookType}`;
				const lockDetails = {
					lockId,
					hookType: lock.hookType,
					processId: lock.processId,
					lockAge: Date.now() - lock.acquiredAt,
					lockExpiry: lock.expiresAt,
					resourceKey,
					isExpired: lock.expiresAt < Date.now(),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"processing_lock_release",
					lockDetails,
					"hook-locking",
				);

				try {
					// Check if our lock is still active in memory
					const currentLock = this.coordinationState.get(resourceKey);

					const lockValidationResult = {
						lockId,
						resourceKey,
						currentLockExists: !!currentLock,
						currentLockId: currentLock?.lockId,
						isOurLock: currentLock?.lockId === lockId,
						currentLockProcessId: currentLock?.processId,
						ourProcessId: lock.processId,
					};

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_validation_for_release",
						lockValidationResult,
						"hook-locking",
					);

					if (currentLock && currentLock.lockId === lockId) {
						debugLogger.logEvent(
							"HookCoordinator",
							"valid_lock_found_proceeding_with_release",
							{
								lockId,
								hookType: lock.hookType,
								processId: lock.processId,
								lockAge: Date.now() - currentLock.acquiredAt,
							},
							"hook-locking",
						);

						// Remove from memory coordination
						this.coordinationState.delete(resourceKey);

						debugLogger.logEvent(
							"HookCoordinator",
							"lock_removed_from_coordination_state",
							{
								lockId,
								resourceKey,
								remainingCoordinationStates: this.coordinationState.size,
							},
							"hook-locking",
						);

						// Clear timeout
						const timeout = this.lockTimeouts.get(resourceKey);
						if (timeout) {
							clearTimeout(timeout);
							this.lockTimeouts.delete(resourceKey);

							debugLogger.logEvent(
								"HookCoordinator",
								"lock_timeout_cleared",
								{ lockId, resourceKey, hookType: lock.hookType },
								"hook-locking",
							);
						} else {
							debugLogger.logEvent(
								"HookCoordinator",
								"no_timeout_found_to_clear",
								{ lockId, resourceKey, hookType: lock.hookType },
								"hook-locking",
							);
						}

						this.emit("coordination_lock_released", {
							lockId,
							hookType: lock.hookType,
							processId: lock.processId,
						});

						debugLogger.logEvent(
							"HookCoordinator",
							"lock_release_event_emitted",
							{
								lockId,
								hookType: lock.hookType,
								processId: lock.processId,
								lockDuration: Date.now() - lock.acquiredAt,
							},
							"hook-locking",
						);
					} else {
						const lockMismatchReason = !currentLock
							? "no_current_lock_found"
							: "lock_id_mismatch";

						debugLogger.logEvent(
							"HookCoordinator",
							"lock_release_skipped_validation_failed",
							{
								lockId,
								resourceKey,
								reason: lockMismatchReason,
								currentLockId: currentLock?.lockId,
								expectedLockId: lockId,
							},
							"hook-locking",
						);
					}
				} catch (error) {
					const errorDetails = {
						lockId,
						hookType: lock.hookType,
						processId: lock.processId,
						error: error instanceof Error ? error.message : String(error),
						errorType:
							error instanceof Error ? error.constructor.name : typeof error,
					};

					debugLogger.logEvent(
						"HookCoordinator",
						"lock_release_error_occurred",
						errorDetails,
						"hook-locking",
					);

					this.emit("coordination_lock_release_error", {
						lockId,
						error: error instanceof Error ? error.message : String(error),
					});
				}

				this.activeLocks.delete(lockId);

				debugLogger.logEvent(
					"HookCoordinator",
					"lock_removed_from_active_locks",
					{
						lockId,
						hookType: lock.hookType,
						processId: lock.processId,
						remainingActiveLocks: this.activeLocks.size,
						totalLockDuration: Date.now() - lock.acquiredAt,
					},
					"hook-locking",
				);
			},
			[lockId],
			"hook-locking",
		);
	}

	/**
	 * Wait for hook dependencies to complete
	 */
	private async waitForDependencies(execution: HookExecution): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"waitForDependencies",
			async () => {
				const dependency = this.getDependency(execution.hookType);

				const dependencyContext = {
					executionId: execution.id,
					hookType: execution.hookType,
					processId: execution.processId,
					hasDependency: !!dependency,
					dependencies: dependency?.dependsOn || [],
					dependencyCount: dependency?.dependsOn.length || 0,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"dependency_wait_analysis_started",
					dependencyContext,
					"hook-dependencies",
				);

				if (!dependency || dependency.dependsOn.length === 0) {
					debugLogger.logEvent(
						"HookCoordinator",
						"no_dependencies_required_proceeding",
						{ executionId: execution.id, hookType: execution.hookType },
						"hook-dependencies",
					);
					return;
				}

				const maxWaitTime = 30000; // 30 seconds
				const checkInterval = 100; // 100ms
				const startTime = Date.now();

				const waitConfiguration = {
					executionId: execution.id,
					hookType: execution.hookType,
					maxWaitTime,
					checkInterval,
					dependencies: dependency.dependsOn,
					startTime,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"dependency_wait_loop_starting",
					waitConfiguration,
					"hook-dependencies",
				);

				let checkCount = 0;
				while (Date.now() - startTime < maxWaitTime) {
					checkCount++;

					const currentPendingExecutions = Array.from(
						this.pendingExecutions.values(),
					);
					const runningHooks = currentPendingExecutions
						.filter((e) => e.status === "running")
						.map((e) => e.hookType);
					const completedHooks = currentPendingExecutions
						.filter((e) => e.status === "completed")
						.map((e) => e.hookType);

					const pendingDependencies = dependency.dependsOn.filter(
						(depHook) =>
							this.isHookRunning(depHook) && !this.isHookCompleted(depHook),
					);

					const dependencyStatus = {
						executionId: execution.id,
						hookType: execution.hookType,
						checkCount,
						elapsedTime: Date.now() - startTime,
						remainingTime: maxWaitTime - (Date.now() - startTime),
						totalDependencies: dependency.dependsOn.length,
						pendingDependencies,
						pendingCount: pendingDependencies.length,
						currentRunningHooks: runningHooks,
						currentCompletedHooks: completedHooks,
						satisfiedDependencies: dependency.dependsOn.filter(
							(dep) => !pendingDependencies.includes(dep),
						),
					};

					debugLogger.logEvent(
						"HookCoordinator",
						"dependency_status_check",
						dependencyStatus,
						"hook-dependencies",
					);

					if (pendingDependencies.length === 0) {
						const satisfactionResult = {
							executionId: execution.id,
							hookType: execution.hookType,
							totalWaitTime: Date.now() - startTime,
							totalChecks: checkCount,
							satisfiedDependencies: dependency.dependsOn,
							averageCheckInterval: (Date.now() - startTime) / checkCount,
						};

						debugLogger.logEvent(
							"HookCoordinator",
							"all_dependencies_satisfied",
							satisfactionResult,
							"hook-dependencies",
						);

						this.emit("hook_dependencies_satisfied", {
							executionId: execution.id,
							hookType: execution.hookType,
						});
						return;
					}

					// Log detailed dependency analysis periodically
					if (checkCount % 50 === 0) {
						// Every 5 seconds at 100ms intervals
						const detailedAnalysis = dependency.dependsOn.map((depHook) => ({
							dependency: depHook,
							isRunning: this.isHookRunning(depHook),
							isCompleted: this.isHookCompleted(depHook),
							isPending: pendingDependencies.includes(depHook),
							status: this.isHookCompleted(depHook)
								? "completed"
								: this.isHookRunning(depHook)
									? "running"
									: "not_started",
						}));

						debugLogger.logEvent(
							"HookCoordinator",
							"periodic_dependency_analysis",
							{
								executionId: execution.id,
								hookType: execution.hookType,
								checkCount,
								elapsedTime: Date.now() - startTime,
								detailedDependencyStatus: detailedAnalysis,
							},
							"hook-dependencies",
						);
					}

					await this.delay(checkInterval);
				}

				const timeoutDetails = {
					executionId: execution.id,
					hookType: execution.hookType,
					totalWaitTime: Date.now() - startTime,
					maxWaitTime,
					totalChecks: checkCount,
					pendingDependencies: dependency.dependsOn.filter(
						(depHook) =>
							this.isHookRunning(depHook) && !this.isHookCompleted(depHook),
					),
					allDependencies: dependency.dependsOn,
					finalPendingExecutions: this.pendingExecutions.size,
					finalActiveLocks: this.activeLocks.size,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"dependency_wait_timeout_occurred",
					timeoutDetails,
					"hook-dependencies",
				);

				throw new Error(
					`Timeout waiting for dependencies of ${execution.hookType}: ${dependency.dependsOn.join(", ")}`,
				);
			},
			[execution],
			"hook-dependencies",
		);
	}

	/**
	 * Check if hook is running
	 */
	private isHookRunning(hookType: HookType): boolean {
		return debugLogger.logSyncFunction(
			"HookCoordinator",
			"isHookRunning",
			() => {
				const pendingExecutions = Array.from(this.pendingExecutions.values());
				const runningExecutions = pendingExecutions.filter(
					(exec) => exec.hookType === hookType && exec.status === "running",
				);

				const runningStatus = {
					hookType,
					totalPendingExecutions: pendingExecutions.length,
					runningExecutionsForHook: runningExecutions.length,
					isRunning: runningExecutions.length > 0,
					runningExecutionIds: runningExecutions.map((e) => e.id),
					allRunningHooks: pendingExecutions
						.filter((e) => e.status === "running")
						.map((e) => e.hookType),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"hook_running_status_checked",
					runningStatus,
					"hook-dependencies",
				);

				return runningExecutions.length > 0;
			},
			[hookType],
			"hook-dependencies",
		);
	}

	/**
	 * Check if hook is completed
	 */
	private isHookCompleted(hookType: HookType): boolean {
		return debugLogger.logSyncFunction(
			"HookCoordinator",
			"isHookCompleted",
			() => {
				const pendingExecutions = Array.from(this.pendingExecutions.values());
				const completedExecutions = pendingExecutions.filter(
					(exec) => exec.hookType === hookType && exec.status === "completed",
				);

				const completedStatus = {
					hookType,
					totalPendingExecutions: pendingExecutions.length,
					completedExecutionsForHook: completedExecutions.length,
					isCompleted: completedExecutions.length > 0,
					completedExecutionIds: completedExecutions.map((e) => e.id),
					allCompletedHooks: pendingExecutions
						.filter((e) => e.status === "completed")
						.map((e) => e.hookType),
					recentCompletionTimes: completedExecutions.map((e) => ({
						id: e.id,
						completedDuration: Date.now() - e.startTime,
					})),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"hook_completion_status_checked",
					completedStatus,
					"hook-dependencies",
				);

				return completedExecutions.length > 0;
			},
			[hookType],
			"hook-dependencies",
		);
	}

	/**
	 * Get dependency hooks
	 */
	private getDependencyHooks(hookType: HookType): string[] {
		const dependency = this.getDependency(hookType);
		return dependency ? dependency.dependsOn : [];
	}

	/**
	 * Get dependency information
	 */
	private getDependency(hookType: HookType): HookDependency | undefined {
		return this.dependencyGraph.get(hookType);
	}

	/**
	 * Start cleanup process for expired locks and executions
	 */
	private startCleanupProcess(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredLocks();
			this.cleanupStaleExecutions();
		}, 10000); // Every 10 seconds
	}

	/**
	 * Clean up expired locks
	 */
	private async cleanupExpiredLocks(): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"cleanupExpiredLocks",
			async () => {
				const now = Date.now();
				const allActiveLocks = Array.from(this.activeLocks.entries());
				const expiredLocks = allActiveLocks.filter(
					([_, lock]) => lock.expiresAt < now,
				);

				const cleanupContext = {
					currentTime: now,
					totalActiveLocks: allActiveLocks.length,
					expiredLockCount: expiredLocks.length,
					expiredLockIds: expiredLocks.map(([lockId]) => lockId),
					expiredLockTypes: expiredLocks.map(([_, lock]) => lock.hookType),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"expired_lock_cleanup_started",
					cleanupContext,
					"hook-locking",
				);

				if (expiredLocks.length === 0) {
					debugLogger.logEvent(
						"HookCoordinator",
						"no_expired_locks_found",
						{ totalActiveLocks: allActiveLocks.length, currentTime: now },
						"hook-locking",
					);
					return;
				}

				let cleanedCount = 0;
				let cleanupErrors = 0;

				for (const [lockId, lock] of expiredLocks) {
					const lockAge = now - lock.acquiredAt;
					const expiredBy = now - lock.expiresAt;

					debugLogger.logEvent(
						"HookCoordinator",
						"cleaning_expired_lock",
						{
							lockId,
							hookType: lock.hookType,
							processId: lock.processId,
							lockAge,
							expiredBy,
							wasExpectedToExpireAt: lock.expiresAt,
						},
						"hook-locking",
					);

					try {
						await this.releaseCoordinationLock(lockId);

						this.emit("expired_lock_cleaned", {
							lockId,
							hookType: lock.hookType,
						});
						cleanedCount++;

						debugLogger.logEvent(
							"HookCoordinator",
							"expired_lock_cleaned_successfully",
							{ lockId, hookType: lock.hookType, lockAge, expiredBy },
							"hook-locking",
						);
					} catch (error) {
						cleanupErrors++;

						debugLogger.logEvent(
							"HookCoordinator",
							"expired_lock_cleanup_error",
							{
								lockId,
								hookType: lock.hookType,
								error: error instanceof Error ? error.message : String(error),
								lockAge,
								expiredBy,
							},
							"hook-locking",
						);
					}
				}

				const cleanupSummary = {
					totalExpiredLocks: expiredLocks.length,
					successfullyCleanedLocks: cleanedCount,
					cleanupErrors,
					remainingActiveLocks: this.activeLocks.size,
					cleanupEfficiency: cleanedCount / expiredLocks.length,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"expired_lock_cleanup_completed",
					cleanupSummary,
					"hook-locking",
				);
			},
			[],
			"hook-locking",
		);
	}

	/**
	 * Clean up stale executions
	 */
	private cleanupStaleExecutions(): void {
		return debugLogger.logSyncFunction(
			"HookCoordinator",
			"cleanupStaleExecutions",
			() => {
				const now = Date.now();
				const staleTimeout = 300000; // 5 minutes

				const allPendingExecutions = Array.from(
					this.pendingExecutions.entries(),
				);
				const staleExecutions = allPendingExecutions.filter(
					([_, exec]) => now - exec.startTime > staleTimeout,
				);

				const cleanupContext = {
					currentTime: now,
					staleTimeout,
					totalPendingExecutions: allPendingExecutions.length,
					staleExecutionCount: staleExecutions.length,
					staleExecutionIds: staleExecutions.map(([execId]) => execId),
					staleExecutionTypes: staleExecutions.map(
						([_, exec]) => exec.hookType,
					),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"stale_execution_cleanup_started",
					cleanupContext,
					"hook-coordination",
				);

				if (staleExecutions.length === 0) {
					debugLogger.logEvent(
						"HookCoordinator",
						"no_stale_executions_found",
						{
							totalPendingExecutions: allPendingExecutions.length,
							staleTimeout,
						},
						"hook-coordination",
					);
					return;
				}

				let cleanedCount = 0;

				for (const [executionId, execution] of staleExecutions) {
					const executionAge = now - execution.startTime;
					const staleSince = executionAge - staleTimeout;

					debugLogger.logEvent(
						"HookCoordinator",
						"cleaning_stale_execution",
						{
							executionId,
							hookType: execution.hookType,
							processId: execution.processId,
							status: execution.status,
							executionAge,
							staleSince,
							startTime: execution.startTime,
							dependencies: execution.dependencies,
						},
						"hook-coordination",
					);

					this.pendingExecutions.delete(executionId);

					this.emit("stale_execution_cleaned", {
						executionId,
						hookType: execution.hookType,
					});

					cleanedCount++;

					debugLogger.logEvent(
						"HookCoordinator",
						"stale_execution_cleaned_successfully",
						{
							executionId,
							hookType: execution.hookType,
							executionAge,
							staleSince,
							wasInStatus: execution.status,
						},
						"hook-coordination",
					);
				}

				const cleanupSummary = {
					totalStaleExecutions: staleExecutions.length,
					cleanedExecutions: cleanedCount,
					remainingPendingExecutions: this.pendingExecutions.size,
					cleanupEfficiency: cleanedCount / staleExecutions.length,
					staleTimeout,
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"stale_execution_cleanup_completed",
					cleanupSummary,
					"hook-coordination",
				);
			},
			[],
			"hook-coordination",
		);
	}

	/**
	 * Emergency coordination reset
	 */
	async emergencyReset(): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"emergencyReset",
			async () => {
				const preResetState = {
					activeLocks: this.activeLocks.size,
					pendingExecutions: this.pendingExecutions.size,
					coordinationState: this.coordinationState.size,
					lockTimeouts: this.lockTimeouts.size,
					queueStatus: this.executionQueue.getQueueStatus(),
					poolStatus: this.processPool.getPoolStatus(),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"emergency_reset_initiated",
					preResetState,
					"hook-coordination",
				);

				let clearedLocks = 0;
				let lockClearErrors = 0;

				// Clear all active locks
				const activeLockIds = Array.from(this.activeLocks.keys());

				debugLogger.logEvent(
					"HookCoordinator",
					"clearing_all_active_locks",
					{ lockCount: activeLockIds.length, lockIds: activeLockIds },
					"hook-locking",
				);

				for (const lockId of activeLockIds) {
					try {
						await this.releaseCoordinationLock(lockId);
						clearedLocks++;

						debugLogger.logEvent(
							"HookCoordinator",
							"emergency_lock_cleared",
							{ lockId, clearedCount: clearedLocks },
							"hook-locking",
						);
					} catch (error) {
						lockClearErrors++;

						debugLogger.logEvent(
							"HookCoordinator",
							"emergency_lock_clear_error",
							{
								lockId,
								error: error instanceof Error ? error.message : String(error),
								errorCount: lockClearErrors,
							},
							"hook-locking",
						);
					}
				}

				// Clear pending executions
				const pendingExecutionIds = Array.from(this.pendingExecutions.keys());
				const pendingExecutionTypes = Array.from(
					this.pendingExecutions.values(),
				).map((e) => e.hookType);

				debugLogger.logEvent(
					"HookCoordinator",
					"clearing_pending_executions",
					{
						executionCount: pendingExecutionIds.length,
						executionIds: pendingExecutionIds,
						executionTypes: pendingExecutionTypes,
					},
					"hook-coordination",
				);

				this.pendingExecutions.clear();

				// Reset queue
				debugLogger.logEvent(
					"HookCoordinator",
					"resetting_execution_queue",
					{ preResetQueueStatus: this.executionQueue.getQueueStatus() },
					"hook-coordination",
				);

				this.executionQueue.emergencyClear();

				// Shutdown and reinitialize process pool
				const preShutdownPoolStatus = this.processPool.getPoolStatus();

				debugLogger.logEvent(
					"HookCoordinator",
					"shutting_down_process_pool",
					{ preShutdownStatus: preShutdownPoolStatus },
					"hook-coordination",
				);

				await this.processPool.shutdown();
				this.processPool = new HookProcessPool();

				const postResetState = {
					activeLocks: this.activeLocks.size,
					pendingExecutions: this.pendingExecutions.size,
					coordinationState: this.coordinationState.size,
					lockTimeouts: this.lockTimeouts.size,
					queueStatus: this.executionQueue.getQueueStatus(),
					poolStatus: this.processPool.getPoolStatus(),
					locksClearedSuccessfully: clearedLocks,
					lockClearErrors,
					executionsCleared: pendingExecutionIds.length,
				};

				this.emit("emergency_reset_completed");

				debugLogger.logEvent(
					"HookCoordinator",
					"emergency_reset_completed",
					{
						resetSummary: {
							preResetState,
							postResetState,
							operationResults: {
								locksClearedSuccessfully: clearedLocks,
								lockClearErrors,
								executionsCleared: pendingExecutionIds.length,
								wasSuccessful: lockClearErrors === 0,
							},
						},
					},
					"hook-coordination",
				);
			},
			[],
			"hook-coordination",
		);
	}

	/**
	 * Get coordination status
	 */
	getCoordinationStatus(): {
		activeLocks: number;
		pendingExecutions: number;
		queueStatus: any;
		poolStatus: any;
	} {
		return debugLogger.logSyncFunction(
			"HookCoordinator",
			"getCoordinationStatus",
			() => {
				const queueStatus = this.executionQueue.getQueueStatus();
				const poolStatus = this.processPool.getPoolStatus();

				const detailedStatus = {
					activeLocks: this.activeLocks.size,
					pendingExecutions: this.pendingExecutions.size,
					coordinationState: this.coordinationState.size,
					lockTimeouts: this.lockTimeouts.size,
					queueStatus,
					poolStatus,
					lockDetails: Array.from(this.activeLocks.values()).map((lock) => ({
						lockId: lock.lockId,
						hookType: lock.hookType,
						processId: lock.processId,
						age: Date.now() - lock.acquiredAt,
						timeUntilExpiry: Math.max(0, lock.expiresAt - Date.now()),
						isExpired: lock.expiresAt < Date.now(),
					})),
					executionDetails: Array.from(this.pendingExecutions.values()).map(
						(exec) => ({
							id: exec.id,
							hookType: exec.hookType,
							processId: exec.processId,
							status: exec.status,
							age: Date.now() - exec.startTime,
							dependencyCount: exec.dependencies.length,
							dependencies: exec.dependencies,
						}),
					),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"coordination_status_retrieved",
					detailedStatus,
					"hook-coordination",
				);

				return {
					activeLocks: this.activeLocks.size,
					pendingExecutions: this.pendingExecutions.size,
					queueStatus,
					poolStatus,
				};
			},
			[],
			"hook-coordination",
		);
	}

	/**
	 * Shutdown coordinator
	 */
	async shutdown(): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookCoordinator",
			"shutdown",
			async () => {
				const preShutdownStatus = {
					activeLocks: this.activeLocks.size,
					pendingExecutions: this.pendingExecutions.size,
					coordinationState: this.coordinationState.size,
					lockTimeouts: this.lockTimeouts.size,
					hasCleanupInterval: !!this.cleanupInterval,
					queueStatus: this.executionQueue.getQueueStatus(),
					poolStatus: this.processPool.getPoolStatus(),
				};

				debugLogger.logEvent(
					"HookCoordinator",
					"coordinator_shutdown_initiated",
					preShutdownStatus,
					"hook-coordination",
				);

				// Clear cleanup interval
				if (this.cleanupInterval) {
					debugLogger.logEvent(
						"HookCoordinator",
						"clearing_cleanup_interval",
						{ intervalExists: !!this.cleanupInterval },
						"hook-coordination",
					);

					clearInterval(this.cleanupInterval);
					this.cleanupInterval = null;
				}

				// Perform emergency reset
				debugLogger.logEvent(
					"HookCoordinator",
					"performing_emergency_reset_during_shutdown",
					{
						activeLocks: this.activeLocks.size,
						pendingExecutions: this.pendingExecutions.size,
					},
					"hook-coordination",
				);

				await this.emergencyReset();

				// Final process pool shutdown
				debugLogger.logEvent(
					"HookCoordinator",
					"final_process_pool_shutdown",
					{ poolStatus: this.processPool.getPoolStatus() },
					"hook-coordination",
				);

				await this.processPool.shutdown();

				const postShutdownStatus = {
					activeLocks: this.activeLocks.size,
					pendingExecutions: this.pendingExecutions.size,
					coordinationState: this.coordinationState.size,
					lockTimeouts: this.lockTimeouts.size,
					cleanupInterval: this.cleanupInterval,
					queueStatus: this.executionQueue.getQueueStatus(),
					poolStatus: this.processPool.getPoolStatus(),
				};

				this.emit("coordinator_shutdown");

				debugLogger.logEvent(
					"HookCoordinator",
					"coordinator_shutdown_completed",
					{
						shutdownSummary: {
							preShutdownStatus,
							postShutdownStatus,
							wasCleanShutdown:
								this.activeLocks.size === 0 &&
								this.pendingExecutions.size === 0,
						},
					},
					"hook-coordination",
				);
			},
			[],
			"hook-coordination",
		);
	}

	/**
	 * Utility methods
	 */
	private generateExecutionId(): string {
		return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private async fileExists(filePath: string): Promise<boolean> {
		// File operations removed in favor of memory-based coordination
		return false;
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Global coordinator instance
export const globalHookCoordinator = new HookCoordinator();

// Helper function for coordinated hook execution
export async function executeHookCoordinated(
	hookType: HookType,
	args: string[],
	options: { priority?: "low" | "medium" | "high"; timeout?: number } = {},
): Promise<any> {
	return debugLogger.logAsyncFunction(
		"executeHookCoordinated",
		"globalCoordinationEntry",
		async () => {
			const entryContext = {
				hookType,
				argsCount: args.length,
				args: args.slice(0, 3), // First 3 args for context
				priority: options.priority,
				timeout: options.timeout,
				globalCoordinatorStatus: {
					activeLocks:
						globalHookCoordinator.getCoordinationStatus().activeLocks,
					pendingExecutions:
						globalHookCoordinator.getCoordinationStatus().pendingExecutions,
					queuedJobs:
						globalHookCoordinator.getCoordinationStatus().queueStatus || 0,
				},
				processId: process.pid,
				timestamp: Date.now(),
			};

			debugLogger.logEvent(
				"executeHookCoordinated",
				"global_hook_coordination_request",
				entryContext,
				"hook-coordination",
			);

			const startTime = Date.now();

			try {
				const result = await globalHookCoordinator.coordinateHook(
					hookType,
					args,
					options,
				);
				const executionTime = Date.now() - startTime;

				debugLogger.logEvent(
					"executeHookCoordinated",
					"global_hook_coordination_success",
					{
						hookType,
						executionTimeMs: executionTime,
						resultType: typeof result,
						hasResult: result !== undefined,
						processId: process.pid,
						finalCoordinatorStatus: {
							activeLocks:
								globalHookCoordinator.getCoordinationStatus().activeLocks,
							pendingExecutions:
								globalHookCoordinator.getCoordinationStatus().pendingExecutions,
						},
					},
					"hook-coordination",
				);

				return result;
			} catch (error) {
				const executionTime = Date.now() - startTime;

				debugLogger.logEvent(
					"executeHookCoordinated",
					"global_hook_coordination_error",
					{
						hookType,
						executionTimeMs: executionTime,
						error: error instanceof Error ? error.message : String(error),
						errorType:
							error instanceof Error ? error.constructor.name : typeof error,
						processId: process.pid,
						coordinatorStatusOnError: {
							activeLocks:
								globalHookCoordinator.getCoordinationStatus().activeLocks,
							pendingExecutions:
								globalHookCoordinator.getCoordinationStatus().pendingExecutions,
						},
					},
					"hook-coordination",
				);

				throw error;
			}
		},
		[hookType, args, options],
		"hook-coordination",
	);
}

// Export types
export type { HookDependency, CoordinationLock, HookExecution };
