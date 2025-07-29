// ABOUTME: Task Engine Core - Comprehensive task management with orchestration features
// ABOUTME: Integrates with TodoWrite/TodoRead for coordination and Memory for persistence

import { EventEmitter } from "events";
import { getErrorMessage as _getErrorMessage } from "../../../shared/errors/error-handler.js";
import { generateId } from "../../../utils/helpers.js";
import type {
	AgentProfile,
	Resource,
	ResourceRequirement,
	Task,
	TaskCheckpoint,
	TaskDependency,
	TaskExecution,
	TaskFilter,
	TaskLog,
	TaskMetadata,
	TaskMetrics,
	TaskPriority,
	TaskSchedule,
	TaskSort,
	TaskStatus,
	TaskType,
	Workflow,
	WorkflowTask,
} from "../types.js";

function getErrorMessage(error: unknown): string {
	return _getErrorMessage(error);
}

export class TaskEngine extends EventEmitter {
	private tasks = new Map<string, Task>();
	private executions = new Map<string, TaskExecution>();
	private workflows = new Map<string, Workflow>();
	private resources = new Map<string, Resource>();
	private agents = new Map<string, AgentProfile>();
	private isInitialized = false;

	constructor(
		private maxConcurrentTasks: number = 10,
		private memoryManager?: any,
	) {
		super();
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		// Initialize default resources
		this.resources.set("cpu", {
			id: "cpu",
			type: "cpu",
			total: 8,
			available: 8,
			unit: "cores",
		});

		this.resources.set("memory", {
			id: "memory",
			type: "memory",
			total: 16384,
			available: 16384,
			unit: "MB",
		});

		this.isInitialized = true;
		this.emit("initialized");
	}

	/**
	 * Create a new task with comprehensive configuration
	 */
	async createTask(options: {
		type: TaskType;
		description: string;
		priority?: TaskPriority;
		dependencies?: TaskDependency[];
		resourceRequirements?: ResourceRequirement[];
		schedule?: TaskSchedule;
		tags?: string[];
		metadata?: TaskMetadata;
		assignedAgent?: string;
		parentTask?: string;
	}): Promise<string> {
		const taskId = generateId();
		const now = new Date();

		const task: Task = {
			id: taskId,
			type: options.type,
			description: options.description,
			priority: options.priority || 5,
			status: "queued",
			createdAt: now,
			updatedAt: now,
			assignedAgent: options.assignedAgent,
			parentTask: options.parentTask,
			subtasks: [],
			dependencies: options.dependencies || [],
			progress: 0,
			metadata: options.metadata,
			resourceRequirements: options.resourceRequirements,
			schedule: options.schedule,
			tags: options.tags,
		};

		// Validate dependencies
		for (const dep of task.dependencies) {
			if (!this.tasks.has(dep.taskId)) {
				throw new Error(`Dependency task ${dep.taskId} not found`);
			}
		}

		// Check resource availability
		if (task.resourceRequirements) {
			for (const req of task.resourceRequirements) {
				const resource = this.resources.get(req.resourceId);
				if (!resource) {
					throw new Error(`Resource ${req.resourceId} not found`);
				}
				if (resource.available < req.amount) {
					throw new Error(
						`Insufficient ${req.type} resource: ${resource.available}${resource.unit} available, ${req.amount}${req.unit} required`,
					);
				}
			}
		}

		this.tasks.set(taskId, task);

		// Update parent task subtasks
		if (task.parentTask && this.tasks.has(task.parentTask)) {
			const parentTask = this.tasks.get(task.parentTask)!;
			parentTask.subtasks.push(taskId);
			parentTask.updatedAt = now;
		}

		// Store in memory if available
		if (this.memoryManager) {
			await this.memoryManager.store(`task/${taskId}`, task);
		}

		this.emit("task:created", { taskId, task });
		return taskId;
	}

	/**
	 * Get a task by ID
	 */
	async getTask(taskId: string): Promise<Task | null> {
		let task = this.tasks.get(taskId);

		// Try to load from memory if not in cache
		if (!task && this.memoryManager) {
			try {
				task = await this.memoryManager.retrieve(`task/${taskId}`);
				if (task) {
					this.tasks.set(taskId, task);
				}
			} catch (error) {
				// Task not in memory, return null
			}
		}

		return task || null;
	}

	/**
	 * List tasks with filtering and pagination
	 */
	async listTasks(
		filter?: TaskFilter,
		sort?: TaskSort,
		limit?: number,
		offset?: number,
	): Promise<{ tasks: Task[]; total: number; hasMore: boolean }> {
		let tasks = Array.from(this.tasks.values());

		// Apply filters
		if (filter) {
			tasks = tasks.filter((task) => {
				if (filter.status && !filter.status.includes(task.status)) {
					return false;
				}
				if (filter.type && !filter.type.includes(task.type)) {
					return false;
				}
				if (
					filter.priority &&
					(task.priority < filter.priority[0] ||
						task.priority > filter.priority[1])
				) {
					return false;
				}
				if (
					filter.assignedTo &&
					(!task.assignedAgent ||
						!filter.assignedTo.includes(task.assignedAgent))
				) {
					return false;
				}
				if (
					filter.tags &&
					(!task.tags || !filter.tags.some((tag) => task.tags!.includes(tag)))
				) {
					return false;
				}
				if (filter.createdAfter && task.createdAt < filter.createdAfter) {
					return false;
				}
				if (filter.createdBefore && task.createdAt > filter.createdBefore) {
					return false;
				}
				return true;
			});
		}

		// Apply sorting
		if (sort) {
			tasks.sort((a, b) => {
				let aValue: any = a[sort.field];
				let bValue: any = b[sort.field];

				if (aValue instanceof Date && bValue instanceof Date) {
					aValue = aValue.getTime();
					bValue = bValue.getTime();
				}

				if (sort.direction === "desc") {
					return bValue - aValue;
				}
				return aValue - bValue;
			});
		}

		const total = tasks.length;

		// Apply pagination
		if (offset) {
			tasks = tasks.slice(offset);
		}
		if (limit) {
			tasks = tasks.slice(0, limit);
		}

		return {
			tasks,
			total,
			hasMore: (offset || 0) + tasks.length < total,
		};
	}

	/**
	 * Update task status and progress
	 */
	async updateTask(
		taskId: string,
		updates: {
			status?: TaskStatus;
			progress?: number;
			results?: any;
			assignedAgent?: string;
			metadata?: Partial<TaskMetadata>;
		},
	): Promise<boolean> {
		const task = await this.getTask(taskId);
		if (!task) {
			throw new Error(`Task ${taskId} not found`);
		}

		const now = new Date();
		let statusChanged = false;

		if (updates.status && updates.status !== task.status) {
			const oldStatus = task.status;
			task.status = updates.status;
			statusChanged = true;

			if (updates.status === "completed") {
				task.completedAt = now;
				task.progress = 100;
			}

			this.emit("task:status:changed", {
				taskId,
				oldStatus,
				newStatus: updates.status,
			});
		}

		if (updates.progress !== undefined) {
			task.progress = Math.max(0, Math.min(100, updates.progress));
		}

		if (updates.results !== undefined) {
			task.results = updates.results;
		}

		if (updates.assignedAgent !== undefined) {
			task.assignedAgent = updates.assignedAgent;
		}

		if (updates.metadata) {
			task.metadata = { ...task.metadata, ...updates.metadata };
		}

		task.updatedAt = now;
		this.tasks.set(taskId, task);

		// Update in memory
		if (this.memoryManager) {
			await this.memoryManager.store(`task/${taskId}`, task);
		}

		if (statusChanged) {
			this.emit(`task:${updates.status}`, { taskId, task });
		}

		this.emit("task:updated", { taskId, task, updates });
		return true;
	}

	/**
	 * Cancel a task with optional rollback
	 */
	async cancelTask(
		taskId: string,
		reason: string = "User requested",
		rollback: boolean = true,
	): Promise<boolean> {
		const task = await this.getTask(taskId);
		if (!task) {
			throw new Error(`Task ${taskId} not found`);
		}

		if (task.status === "completed" || task.status === "cancelled") {
			return false; // Already finished
		}

		// Cancel all subtasks
		for (const subtaskId of task.subtasks) {
			await this.cancelTask(
				subtaskId,
				`Parent task cancelled: ${reason}`,
				rollback,
			);
		}

		// Free up resources
		if (task.resourceRequirements) {
			for (const req of task.resourceRequirements) {
				const resource = this.resources.get(req.resourceId);
				if (resource) {
					resource.available += req.amount;
				}
			}
		}

		// Update task
		await this.updateTask(taskId, {
			status: "cancelled",
			metadata: {
				...task.metadata,
				cancellationReason: reason,
				cancelledAt: new Date(),
			},
		});

		this.emit("task:cancelled", { taskId, task, reason });
		return true;
	}

	/**
	 * Get task status with detailed information
	 */
	async getTaskStatus(taskId: string): Promise<{
		task: Task;
		execution?: TaskExecution;
		subtasks: Task[];
		dependencies: Task[];
	} | null> {
		const task = await this.getTask(taskId);
		if (!task) {
			return null;
		}

		const execution = this.executions.get(taskId);
		const subtasks = await Promise.all(
			task.subtasks
				.map((id) => this.getTask(id))
				.filter(Boolean) as Promise<Task>[],
		);
		const dependencies = await Promise.all(
			task.dependencies
				.map((dep) => this.getTask(dep.taskId))
				.filter(Boolean) as Promise<Task>[],
		);

		return {
			task,
			execution,
			subtasks,
			dependencies,
		};
	}

	/**
	 * Create a workflow with multiple tasks
	 */
	async createWorkflow(workflowData: {
		name: string;
		description: string;
		tasks: Omit<WorkflowTask, "id" | "createdAt" | "updatedAt">[];
		dependencies?: TaskDependency[];
	}): Promise<Workflow> {
		const workflowId = generateId();
		const now = new Date();

		const workflow: Workflow = {
			id: workflowId,
			name: workflowData.name,
			description: workflowData.description,
			tasks: [],
			dependencies: workflowData.dependencies || [],
			status: "draft",
			createdAt: now,
			updatedAt: now,
		};

		// Create tasks for the workflow
		for (const taskData of workflowData.tasks) {
			const taskId = await this.createTask({
				type: taskData.type,
				description: taskData.description,
				priority: taskData.priority,
				dependencies: taskData.dependencies,
				resourceRequirements: taskData.resourceRequirements,
				schedule: taskData.schedule,
				tags: taskData.tags,
				metadata: {
					...taskData.metadata,
					workflowId,
				},
			});

			const workflowTask: WorkflowTask = {
				...taskData,
				id: taskId,
				createdAt: now,
				updatedAt: now,
				subtasks: [],
			};

			workflow.tasks.push(workflowTask);
		}

		this.workflows.set(workflowId, workflow);

		// Store in memory
		if (this.memoryManager) {
			await this.memoryManager.store(`workflow/${workflowId}`, workflow);
		}

		this.emit("workflow:created", { workflowId, workflow });
		return workflow;
	}

	/**
	 * Execute a workflow
	 */
	async executeWorkflow(workflow: Workflow): Promise<void> {
		if (workflow.status !== "draft") {
			throw new Error(`Workflow ${workflow.id} is not in draft status`);
		}

		workflow.status = "active";
		workflow.updatedAt = new Date();
		this.workflows.set(workflow.id, workflow);

		// Start executing tasks based on dependencies
		for (const task of workflow.tasks) {
			if (task.dependencies.length === 0) {
				// No dependencies, can start immediately
				await this.updateTask(task.id, { status: "running" });
			}
		}

		this.emit("workflow:started", { workflow });
	}

	/**
	 * Get workflow status
	 */
	async getWorkflowStatus(workflowId: string): Promise<{
		workflow: Workflow;
		taskStatuses: Record<string, TaskStatus>;
		progress: number;
	} | null> {
		const workflow = this.workflows.get(workflowId);
		if (!workflow) {
			return null;
		}

		const taskStatuses: Record<string, TaskStatus> = {};
		let completedTasks = 0;

		for (const workflowTask of workflow.tasks) {
			const task = await this.getTask(workflowTask.id);
			if (task) {
				taskStatuses[workflowTask.id] = task.status;
				if (task.status === "completed") {
					completedTasks++;
				}
			}
		}

		const progress =
			workflow.tasks.length > 0
				? (completedTasks / workflow.tasks.length) * 100
				: 0;

		return {
			workflow,
			taskStatuses,
			progress,
		};
	}

	/**
	 * Get system statistics
	 */
	getStats(): {
		totalTasks: number;
		tasksByStatus: Record<TaskStatus, number>;
		tasksByType: Record<TaskType, number>;
		totalWorkflows: number;
		resourceUtilization: Record<string, number>;
	} {
		const stats = {
			totalTasks: this.tasks.size,
			tasksByStatus: {} as Record<TaskStatus, number>,
			tasksByType: {} as Record<TaskType, number>,
			totalWorkflows: this.workflows.size,
			resourceUtilization: {} as Record<string, number>,
		};

		// Initialize counters
		const statuses: TaskStatus[] = [
			"queued",
			"running",
			"completed",
			"failed",
			"cancelled",
		];
		const types: TaskType[] = [
			"research",
			"code",
			"analysis",
			"coordination",
			"general",
		];

		for (const status of statuses) {
			stats.tasksByStatus[status] = 0;
		}
		for (const type of types) {
			stats.tasksByType[type] = 0;
		}

		// Count tasks
		for (const task of this.tasks.values()) {
			stats.tasksByStatus[task.status]++;
			stats.tasksByType[task.type]++;
		}

		// Calculate resource utilization
		for (const resource of this.resources.values()) {
			const utilization =
				((resource.total - resource.available) / resource.total) * 100;
			stats.resourceUtilization[resource.id] = Math.round(utilization);
		}

		return stats;
	}

	/**
	 * Clean up completed tasks older than specified time
	 */
	async cleanup(olderThanDays: number = 30): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		let cleaned = 0;
		for (const [taskId, task] of this.tasks.entries()) {
			if (
				(task.status === "completed" || task.status === "cancelled") &&
				task.updatedAt &&
				task.updatedAt < cutoffDate
			) {
				this.tasks.delete(taskId);
				this.executions.delete(taskId);

				// Remove from memory
				if (this.memoryManager) {
					try {
						await this.memoryManager.delete(`task/${taskId}`);
					} catch (error) {
						// Ignore cleanup errors
					}
				}

				cleaned++;
			}
		}

		this.emit("cleanup:completed", { cleaned, cutoffDate });
		return cleaned;
	}

	/**
	 * Shutdown the task engine
	 */
	async shutdown(): Promise<void> {
		// Cancel all running tasks
		for (const task of this.tasks.values()) {
			if (task.status === "running") {
				await this.cancelTask(task.id, "System shutdown");
			}
		}

		this.removeAllListeners();
		this.isInitialized = false;
		this.emit("shutdown");
	}
}
