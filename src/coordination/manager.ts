import { debugLogger } from "../utils/debug-logger.js";
import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";

/**
 * Coordination manager for task scheduling and resource management
 */

import type { IEventBus } from "../core/event-bus.js";
import type { ILogger } from "../core/logger.js";
import { CoordinationError, DeadlockError } from "../utils/errors.js";
import {
	type CoordinationConfig,
	SystemEvents,
	type Task,
} from "../utils/types.js";
import { AdvancedTaskScheduler } from "./advanced-scheduler.js";
import { ConflictResolver } from "./conflict-resolution.js";
import { MessageRouter } from "./messaging.js";
import { CoordinationMetricsCollector } from "./metrics.js";
import { ResourceManager } from "./resources.js";
import { TaskScheduler } from "./scheduler.js";

export interface ICoordinationManager {
	initialize(): Promise<void>;
	shutdown(): Promise<void>;
	assignTask(task: Task, agentId: string): Promise<void>;
	getAgentTaskCount(agentId: string): Promise<number>;
	getAgentTasks(agentId: string): Promise<Task[]>;
	cancelTask(taskId: string, reason?: string): Promise<void>;
	acquireResource(resourceId: string, agentId: string): Promise<void>;
	releaseResource(resourceId: string, agentId: string): Promise<void>;
	sendMessage(from: string, to: string, message: unknown): Promise<void>;
	getHealthStatus(): Promise<{
		healthy: boolean;
		error?: string;
		metrics?: Record<string, number>;
	}>;
	performMaintenance(): Promise<void>;
	getCoordinationMetrics(): Promise<Record<string, unknown>>;
	enableAdvancedScheduling(): void;
	reportConflict(
		type: "resource" | "task",
		id: string,
		agents: string[],
	): Promise<void>;
}

/**
 * Coordination manager implementation
 */
export class CoordinationManager implements ICoordinationManager {
	private scheduler: TaskScheduler;
	private resourceManager: ResourceManager;
	private messageRouter: MessageRouter;
	private conflictResolver: ConflictResolver;
	private metricsCollector: CoordinationMetricsCollector;
	private initialized = false;
	private deadlockCheckInterval?: ReturnType<typeof setInterval>;
	private advancedSchedulingEnabled = false;

	constructor(
		private config: CoordinationConfig,
		private eventBus: IEventBus,
		private logger: ILogger,
	) {
		this.scheduler = new TaskScheduler(config, eventBus, logger);
		this.resourceManager = new ResourceManager(config, eventBus, logger);
		this.messageRouter = new MessageRouter(config, eventBus, logger);
		this.conflictResolver = new ConflictResolver(logger, eventBus);
		this.metricsCollector = new CoordinationMetricsCollector(logger, eventBus);
	}

	async initialize(): Promise<void> {
		const debugId = debugLogger.logFunctionEntry(
			"CoordinationManager",
			"initialize",
			{},
			"coordination",
		);
		try {
			if (this.initialized) {
				debugLogger.logFunctionExit(
					debugId,
					JSON.stringify({ alreadyInitialized: true }),
					"coordination",
				);
				return;
			}

			this.logger.info("Initializing coordination manager...");
			// Initialize components,
			await this.scheduler.initialize();
			await this.resourceManager.initialize();
			await this.messageRouter.initialize();

			// Start metrics collection,
			this.metricsCollector.start();

			// Start deadlock detection if enabled,
			if (this.config.deadlockDetection) {
				this.startDeadlockDetection();
			}

			// Set up event handlers,
			this.setupEventHandlers();

			this.initialized = true;
			this.logger.info("Coordination manager initialized");
			debugLogger.logFunctionExit(
				debugId,
				JSON.stringify({ initialized: true }),
				"coordination",
			);
		} catch (error) {
			debugLogger.logFunctionError(debugId, String(error), "coordination");
			this.logger.error("Failed to initialize coordination manager", error);
			throw new CoordinationError(
				"Coordination manager initialization failed",
				{ error },
			);
		}
	}

	async shutdown(): Promise<void> {
		if (!this.initialized) {
			return;
		}

		this.logger.info("Shutting down coordination manager...");

		try {
			// Stop deadlock detection,
			if (this.deadlockCheckInterval) {
				clearInterval(this.deadlockCheckInterval);
			}

			// Stop metrics collection,
			this.metricsCollector.stop();

			// Shutdown components,
			await Promise.all([
				this.scheduler.shutdown(),
				this.resourceManager.shutdown(),
				this.messageRouter.shutdown(),
			]);

			this.initialized = false;
			this.logger.info("Coordination manager shutdown complete");
		} catch (error) {
			this.logger.error("Error during coordination manager shutdown", error);
			throw error;
		}
	}

	async assignTask(task: Task, agentId: string): Promise<void> {
		if (!this.initialized) {
			throw new CoordinationError("Coordination manager not initialized");
		}

		await this.scheduler.assignTask(task, agentId);
	}

	async getAgentTaskCount(agentId: string): Promise<number> {
		if (!this.initialized) {
			throw new CoordinationError("Coordination manager not initialized");
		}

		return this.scheduler.getAgentTaskCount(agentId);
	}

	async acquireResource(resourceId: string, agentId: string): Promise<void> {
		if (!this.initialized) {
			throw new CoordinationError("Coordination manager not initialized");
		}

		await this.resourceManager.acquire(resourceId, agentId);
	}

	async releaseResource(resourceId: string, agentId: string): Promise<void> {
		if (!this.initialized) {
			throw new CoordinationError("Coordination manager not initialized");
		}

		await this.resourceManager.release(resourceId, agentId);
	}

	async sendMessage(from: string, to: string, message: unknown): Promise<void> {
		if (!this.initialized) {
			throw new CoordinationError("Coordination manager not initialized");
		}

		await this.messageRouter.send(from, to, message);
	}

	async getHealthStatus(): Promise<{
		healthy: boolean;
		error?: string;
		metrics?: Record<string, number>;
	}> {
		this.logger.info(
			"🔍 DEADLOCK DEBUG: Coordination manager getHealthStatus called",
			{},
		);
		try {
			this.logger.info(
				"🔍 DEADLOCK DEBUG: Starting parallel health checks for coordination components",
				{},
			);
			const healthStart = Date.now();
			const [schedulerHealth, resourceHealth, messageHealth] =
				await Promise.all([
					this.scheduler.getHealthStatus(),
					this.resourceManager.getHealthStatus(),
					this.messageRouter.getHealthStatus(),
				]);
			const healthDuration = Date.now() - healthStart;
			this.logger.info(
				"🔍 DEADLOCK DEBUG: Coordination component health checks completed",
				{ duration: healthDuration },
			);

			const metrics = {
				...schedulerHealth.metrics,
				...resourceHealth.metrics,
				...messageHealth.metrics,
			};

			const healthy =
				schedulerHealth.healthy &&
				resourceHealth.healthy &&
				messageHealth.healthy;

			const errors = [
				schedulerHealth.error,
				resourceHealth.error,
				messageHealth.error,
			].filter(Boolean);

			const status: {
				healthy: boolean;
				error?: string;
				metrics?: Record<string, number>;
			} = {
				healthy,
				metrics,
			};
			if (errors.length > 0) {
				status.error = errors.join("; ");
			}
			return status;
		} catch (error) {
			return {
				healthy: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	private setupEventHandlers(): void {
		// Handle task events,
		this.eventBus.on(SystemEvents.TASK_COMPLETED, async (data: unknown) => {
			const { taskId, result } = data as { taskId: string; result: unknown };
			try {
				await this.scheduler.completeTask(taskId, result);
			} catch (error) {
				this.logger.error("Error handling task completion", { taskId, error });
			}
		});

		this.eventBus.on(SystemEvents.TASK_FAILED, async (data: unknown) => {
			const { taskId, error } = data as { taskId: string; error: Error };
			try {
				await this.scheduler.failTask(taskId, error);
			} catch (err) {
				this.logger.error("Error handling task failure", {
					taskId,
					error: err,
				});
			}
		});

		// Handle agent termination,
		this.eventBus.on(SystemEvents.AGENT_TERMINATED, async (data: unknown) => {
			const { agentId } = data as { agentId: string };
			try {
				// Release all resources held by the agent,
				await this.resourceManager.releaseAllForAgent(agentId);

				// Cancel all tasks assigned to the agent,
				await this.scheduler.cancelAgentTasks(agentId);
			} catch (error) {
				this.logger.error("Error handling agent termination", {
					agentId,
					error,
				});
			}
		});

		// Handle MCP tool timeout events,
		this.eventBus.on("toolTimeout", async (data: unknown) => {
			const { method, params, timestamp, timeout } = data as {
				method: string;
				params: unknown;
				timestamp: string;
				timeout: number;
			};

			try {
				this.logger.warn("🚨 DEADLOCK DEBUG: MCP tool timeout detected", {
					method,
					timeout,
					timestamp,
				});

				// Extract agent ID from params if available
				const agentId = this.extractAgentIdFromParams(params);

				if (agentId) {
					this.logger.info(
						"🔍 DEADLOCK DEBUG: Releasing resources for timed-out agent",
						{
							agentId,
							method,
							timeout,
						},
					);

					// Release all resources held by the agent,
					await this.resourceManager.releaseAllForAgent(agentId);

					// Reschedule the agent's tasks,
					await this.scheduler.rescheduleAgentTasks(agentId);

					this.logger.info(
						"🔍 DEADLOCK DEBUG: Resource cleanup completed for timed-out agent",
						{
							agentId,
							method,
						},
					);
				}

				// Emit a custom event for tool timeout handling
				this.eventBus.emit("MCP_TOOL_TIMEOUT", {
					method,
					agentId,
					timeout,
					timestamp,
				});
			} catch (error) {
				this.logger.error(
					"🚨 DEADLOCK DEBUG: Error handling MCP tool timeout",
					{
						method,
						error,
						timeout,
					},
				);
			}
		});
	}

	private startDeadlockDetection(): void {
		this.logger.info("🔍 DEADLOCK DEBUG: Starting deadlock detection timer", {
			interval: 10000,
		});
		this.deadlockCheckInterval = setInterval(async () => {
			const detectionStart = Date.now();
			this.logger.info("🔍 DEADLOCK DEBUG: Running deadlock detection cycle", {
				timestamp: new Date().toISOString(),
			});
			try {
				const deadlock = await this.detectDeadlock();
				const detectionDuration = Date.now() - detectionStart;

				if (deadlock) {
					this.logger.error("🚨 DEADLOCK DEBUG: Deadlock detected!", {
						deadlock,
						detectionDuration,
					});

					// Emit deadlock event,
					this.logger.info(
						"🔍 DEADLOCK DEBUG: Emitting deadlock detected event",
						{},
					);
					this.eventBus.emit(SystemEvents.DEADLOCK_DETECTED, deadlock);

					// Attempt to resolve deadlock,
					this.logger.info(
						"🔍 DEADLOCK DEBUG: Starting deadlock resolution",
						{},
					);
					await this.resolveDeadlock(deadlock);
				} else {
					this.logger.info("🔍 DEADLOCK DEBUG: No deadlock detected", {
						detectionDuration,
					});
				}
			} catch (error) {
				const detectionDuration = Date.now() - detectionStart;
				this.logger.error(
					"🚨 DEADLOCK DEBUG: Error during deadlock detection",
					{ duration: detectionDuration, error: error },
				);
			}
		}, 10000); // Check every 10 seconds
	}

	private async detectDeadlock(): Promise<{
		agents: string[];
		resources: string[];
	} | null> {
		this.logger.info("🔍 DEADLOCK DEBUG: Starting deadlock detection", {});

		// Get resource allocation graph,
		this.logger.info("🔍 DEADLOCK DEBUG: Getting resource allocations", {});
		const allocStart = Date.now();
		const allocations = await this.resourceManager.getAllocations();
		const allocDuration = Date.now() - allocStart;
		this.logger.info("🔍 DEADLOCK DEBUG: Got resource allocations", {
			allocations: allocations.size,
			duration: allocDuration,
		});

		this.logger.info("🔍 DEADLOCK DEBUG: Getting waiting requests", {});
		const waitStart = Date.now();
		const waitingFor = await this.resourceManager.getWaitingRequests();
		const waitDuration = Date.now() - waitStart;
		this.logger.info("🔍 DEADLOCK DEBUG: Got waiting requests", {
			waitingRequests: waitingFor.size,
			duration: waitDuration,
		});

		// Build dependency graph,
		const graph = new Map<string, Set<string>>();

		// Add edges for resources agents are waiting for,
		for (const [agentId, resources] of Array.from(waitingFor.entries())) {
			if (!graph.has(agentId)) {
				graph.set(agentId, new Set());
			}

			// Find who owns these resources,
			for (const resource of resources) {
				const owner = allocations.get(resource);
				if (owner && owner !== agentId) {
					graph.get(agentId)!.add(owner);
				}
			}
		}

		// Detect cycles using DFS,
		const visited = new Set<string>();
		const recursionStack = new Set<string>();
		const cycle: string[] = [];

		const hasCycle = (node: string): boolean => {
			visited.add(node);
			recursionStack.add(node);

			const neighbors = graph.get(node) || new Set();
			for (const neighbor of Array.from(neighbors)) {
				if (!visited.has(neighbor)) {
					if (hasCycle(neighbor)) {
						cycle.unshift(node);
						return true;
					}
				} else if (recursionStack.has(neighbor)) {
					cycle.unshift(node);
					cycle.unshift(neighbor);
					return true;
				}
			}

			recursionStack.delete(node);
			return false;
		};

		// Check for cycles,
		for (const node of graph.keys()) {
			if (!visited.has(node) && hasCycle(node)) {
				// Extract unique agents in cycle,
				const agents = Array.from(new Set(cycle));

				// Find resources involved,
				const resources: string[] = [];
				for (const agent of agents) {
					const waiting = waitingFor.get(agent) || [];
					resources.push(...waiting);
				}

				return {
					agents,
					resources: Array.from(new Set(resources)),
				};
			}
		}

		return null;
	}

	private async resolveDeadlock(deadlock: {
		agents: string[];
		resources: string[];
	}): Promise<void> {
		this.logger.warn(
			"🚨 DEADLOCK DEBUG: Attempting to resolve deadlock",
			deadlock,
		);

		// Simple resolution: release resources from the lowest priority agent
		// In a real implementation, use more sophisticated strategies,

		try {
			// Find the agent with the lowest priority or least work done,
			const agentToPreempt = deadlock.agents[0]; // Simplified
			this.logger.info("🔍 DEADLOCK DEBUG: Selected agent for preemption", {
				agentId: agentToPreempt,
			});

			// Release all resources held by this agent,
			this.logger.info(
				"🔍 DEADLOCK DEBUG: Releasing all resources for preempted agent",
				{ agentId: agentToPreempt },
			);
			const releaseStart = Date.now();
			await this.resourceManager.releaseAllForAgent(agentToPreempt);
			const releaseDuration = Date.now() - releaseStart;
			this.logger.info(
				"🔍 DEADLOCK DEBUG: Released all resources for preempted agent",
				{ agentId: agentToPreempt, duration: releaseDuration },
			);

			// Reschedule the agent's tasks,
			this.logger.info(
				"🔍 DEADLOCK DEBUG: Rescheduling preempted agent tasks",
				{ agentId: agentToPreempt },
			);
			const rescheduleStart = Date.now();
			await this.scheduler.rescheduleAgentTasks(agentToPreempt);
			const rescheduleDuration = Date.now() - rescheduleStart;
			this.logger.info("🔍 DEADLOCK DEBUG: Rescheduled preempted agent tasks", {
				agentId: agentToPreempt,
				duration: rescheduleDuration,
			});

			this.logger.info("Deadlock resolved by preempting agent", {
				agentId: agentToPreempt,
			});
		} catch (error) {
			throw new DeadlockError(
				"Failed to resolve deadlock",
				deadlock.agents,
				deadlock.resources,
			);
		}
	}

	async getAgentTasks(agentId: string): Promise<Task[]> {
		if (!this.initialized) {
			throw new CoordinationError("Coordination manager not initialized");
		}

		return this.scheduler.getAgentTasks(agentId);
	}

	async cancelTask(taskId: string, reason?: string): Promise<void> {
		if (!this.initialized) {
			throw new CoordinationError("Coordination manager not initialized");
		}

		await this.scheduler.cancelTask(
			taskId,
			reason || "User requested cancellation",
		);
	}

	async performMaintenance(): Promise<void> {
		if (!this.initialized) {
			return;
		}

		this.logger.debug("Performing coordination manager maintenance");

		try {
			await Promise.all([
				this.scheduler.performMaintenance(),
				this.resourceManager.performMaintenance(),
				this.messageRouter.performMaintenance(),
			]);

			// Clean up old conflicts,
			this.conflictResolver.cleanupOldConflicts(24 * 60 * 60 * 1000); // 24 hours
		} catch (error) {
			this.logger.error("Error during coordination manager maintenance", error);
		}
	}

	async getCoordinationMetrics(): Promise<Record<string, unknown>> {
		const baseMetrics = await this.getHealthStatus();
		const coordinationMetrics = this.metricsCollector.getCurrentMetrics();
		const conflictStats = this.conflictResolver.getStats();

		return {
			...baseMetrics.metrics,
			coordination: coordinationMetrics,
			conflicts: conflictStats,
			advancedScheduling: this.advancedSchedulingEnabled,
		};
	}

	enableAdvancedScheduling(): void {
		if (this.advancedSchedulingEnabled) {
			return;
		}

		this.logger.info("Enabling advanced scheduling features");

		// Replace basic scheduler with advanced one,
		const advancedScheduler = new AdvancedTaskScheduler(
			this.config,
			this.eventBus,
			this.logger,
		);

		// Transfer state if needed (in a real implementation)
		this.scheduler = advancedScheduler;
		this.advancedSchedulingEnabled = true;
	}

	async reportConflict(
		type: "resource" | "task",
		id: string,
		agents: string[],
	): Promise<void> {
		this.logger.warn("Conflict reported", { type, id, agents });

		let conflict;
		if (type === "resource") {
			conflict = await this.conflictResolver.reportResourceConflict(id, agents);
		} else {
			conflict = await this.conflictResolver.reportTaskConflict(
				id,
				agents,
				"assignment",
			);
		}

		// Auto-resolve using default strategy,
		try {
			await this.conflictResolver.autoResolve(conflict.id);
		} catch (error) {
			this.logger.error("Failed to auto-resolve conflict", {
				conflictId: conflict.id,
				error,
			});
		}
	}

	/**
	 * Extract agent ID from MCP tool parameters for resource cleanup
	 */
	private extractAgentIdFromParams(params: unknown): string | null {
		if (!params || typeof params !== "object") {
			return null;
		}

		const paramObj = params as Record<string, unknown>;

		// Check common parameter names that might contain agent ID
		const possibleKeys = [
			"agentId",
			"agent_id",
			"id",
			"sessionId",
			"session_id",
		];

		for (const key of possibleKeys) {
			if (paramObj[key] && typeof paramObj[key] === "string") {
				return paramObj[key] as string;
			}
		}

		// Check nested objects
		if (paramObj.context && typeof paramObj.context === "object") {
			const contextObj = paramObj.context as Record<string, unknown>;
			for (const key of possibleKeys) {
				if (contextObj[key] && typeof contextObj[key] === "string") {
					return contextObj[key] as string;
				}
			}
		}

		return null;
	}
}
