// ABOUTME: Task Coordination Layer - Integrates with TodoWrite/TodoRead and Memory for orchestration
// ABOUTME: Provides seamless coordination between task management and Claude Code batch tools

import { EventEmitter } from "events";
import { getErrorMessage as _getErrorMessage } from "../../../shared/errors/error-handler.js";
import { generateId } from "../../../utils/helpers.js";
import type {
	AgentCoordinationState,
	BatchOperation,
	CoordinationContext,
	MemoryEntry,
	TaskExecution,
	TaskPriority,
	TaskStatus,
	TaskType,
	TodoItem,
	WorkflowTask,
} from "../types.js";
import type { TaskEngine } from "./engine.js";

function getErrorMessage(error: unknown): string {
	return _getErrorMessage(error);
}

export class TaskCoordinator extends EventEmitter {
	private todoItems = new Map<string, TodoItem>();
	private memoryStore = new Map<string, MemoryEntry>();
	private coordinationSessions = new Map<string, CoordinationContext>();
	private batchOperations = new Map<string, BatchOperation>();
	private agentCoordination = new Map<string, AgentCoordinationState>();

	constructor(
		private taskEngine: TaskEngine,
		private memoryManager?: any,
	) {
		super();
		this.setupCoordinationHandlers();
	}

	private setupCoordinationHandlers(): void {
		this.taskEngine.on("task:created", this.handleTaskCreated.bind(this));
		this.taskEngine.on(
			"task:status:changed",
			this.handleTaskStatusChanged.bind(this),
		);
		this.taskEngine.on("task:completed", this.handleTaskCompleted.bind(this));
		this.taskEngine.on("task:failed", this.handleTaskFailed.bind(this));
		this.taskEngine.on("task:cancelled", this.handleTaskCancelled.bind(this));
	}

	/**
	 * Create TodoWrite-style task breakdown for complex operations
	 */
	async createTaskTodos(
		objective: string,
		context: CoordinationContext,
		options: {
			strategy?:
				| "research"
				| "development"
				| "analysis"
				| "testing"
				| "optimization"
				| "maintenance";
			maxTasks?: number;
			batchOptimized?: boolean;
			parallelExecution?: boolean;
			memoryCoordination?: boolean;
		} = {},
	): Promise<TodoItem[]> {
		const {
			strategy = "development",
			maxTasks = 10,
			batchOptimized = true,
			parallelExecution = true,
			memoryCoordination = true,
		} = options;

		const sessionId = context.sessionId;
		const todos: TodoItem[] = [];

		// Generate comprehensive task breakdown based on strategy
		const taskTemplates = this.getTaskTemplatesByStrategy(strategy, objective);
		const limitedTasks = taskTemplates.slice(0, maxTasks);

		for (let i = 0; i < limitedTasks.length; i++) {
			const template = limitedTasks[i];
			const todoId = generateId();

			const todo: TodoItem = {
				id: todoId,
				content: template.content,
				status: i === 0 ? "in_progress" : "pending",
				priority: template.priority,
				dependencies:
					template.dependencies
						?.map((depIndex) => limitedTasks[depIndex]?.id)
						.filter(Boolean) || [],
				estimatedTime: template.estimatedTime,
				assignedAgent: template.assignedAgent,
				batchOptimized,
				parallelExecution: parallelExecution && !template.sequential,
				memoryKey: memoryCoordination ? `${sessionId}/task/${i}` : undefined,
				tags: template.tags,
				metadata: {
					strategy,
					objective,
					sessionId,
					taskIndex: i,
					totalTasks: limitedTasks.length,
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			todos.push(todo);
			this.todoItems.set(todoId, todo);
		}

		// Store coordination data in memory
		if (memoryCoordination && this.memoryManager) {
			await this.storeInMemory(
				`coordination/${sessionId}/todos`,
				{
					objective,
					strategy,
					todos: todos.map((t) => ({
						id: t.id,
						content: t.content,
						status: t.status,
					})),
					createdAt: new Date(),
				},
				{ namespace: "task_coordination", tags: ["todos", strategy] },
			);
		}

		this.emit("todos:created", { sessionId, todos, objective, strategy });
		return todos;
	}

	/**
	 * Launch parallel agents using Task tool pattern
	 */
	async launchParallelAgents(
		agentConfigs: Array<{
			agentType: string;
			objective: string;
			mode: string;
			memoryKey?: string;
			batchOptimized?: boolean;
			coordinationHooks?: boolean;
		}>,
		context: CoordinationContext,
	): Promise<string[]> {
		const agentIds: string[] = [];
		const batchOperation = this.createBatchOperation("coordinate", [], {
			type: "agent_launch",
			sessionId: context.sessionId,
			coordinationMode: context.coordinationMode,
		});

		for (const config of agentConfigs) {
			const agentId = generateId();
			agentIds.push(agentId);

			// Store agent coordination state
			const agentState: AgentCoordinationState = {
				agentId,
				status: "idle",
				currentTasks: [],
				capabilities: [config.mode, config.agentType],
				load: 0,
				lastHeartbeat: new Date(),
				metadata: {
					objective: config.objective,
					mode: config.mode,
					memoryKey: config.memoryKey,
					batchOptimized: config.batchOptimized,
					coordinationHooks: config.coordinationHooks !== false,
				},
			};

			this.agentCoordination.set(agentId, agentState);

			// Create coordinated task for agent
			const taskId = await this.taskEngine.createTask({
				type: config.agentType as TaskType,
				description: `${config.agentType}: ${config.objective}`,
				priority: 8 as TaskPriority,
				assignedAgent: agentId,
				tags: ["agent", config.mode, config.agentType],
				metadata: {
					agentId,
					coordinationMode: context.coordinationMode,
					memoryKey: config.memoryKey,
					batchOptimized: config.batchOptimized,
					originalObjective: config.objective,
				},
			});

			agentState.currentTasks.push(taskId);
			agentState.status = "busy";
		}

		await this.completeBatchOperation(batchOperation.id, { agentIds });

		// Store coordination session
		this.coordinationSessions.set(context.sessionId, {
			...context,
			agents: agentIds.map((id) => ({ id, ...this.agentCoordination.get(id) })),
		});

		this.emit("agents:launched", {
			sessionId: context.sessionId,
			agentIds,
			configs: agentConfigs,
		});
		return agentIds;
	}

	/**
	 * Store data in coordinated memory system
	 */
	async storeInMemory(
		key: string,
		value: any,
		options: {
			namespace?: string;
			tags?: string[];
			expiresIn?: number; // milliseconds
		} = {},
	): Promise<void> {
		const memoryEntry: MemoryEntry = {
			key,
			value,
			timestamp: new Date(),
			namespace: options.namespace,
			tags: options.tags,
			expiresAt: options.expiresIn
				? new Date(Date.now() + options.expiresIn)
				: undefined,
		};

		this.memoryStore.set(key, memoryEntry);

		// Store in external memory manager if available
		if (this.memoryManager) {
			await this.memoryManager.store(key, value, options);
		}

		this.emit("memory:stored", {
			key,
			namespace: options.namespace,
			tags: options.tags,
		});
	}

	/**
	 * Retrieve data from coordinated memory system
	 */
	async retrieveFromMemory(key: string, namespace?: string): Promise<any> {
		// Try local memory first
		const localEntry = this.memoryStore.get(key);
		if (
			localEntry &&
			(!localEntry.expiresAt || localEntry.expiresAt > new Date())
		) {
			return localEntry.value;
		}

		// Try external memory manager
		if (this.memoryManager) {
			try {
				const value = await this.memoryManager.retrieve(key, namespace);
				if (value !== null) {
					// Cache locally
					this.memoryStore.set(key, {
						key,
						value,
						timestamp: new Date(),
						namespace,
					});
					return value;
				}
			} catch (error) {
				// Memory not found, return null
			}
		}

		return null;
	}

	/**
	 * Coordinate batch operations for efficiency
	 */
	async coordinateBatchOperations(
		operations: Array<{
			type: "read" | "write" | "search" | "analyze";
			targets: string[];
			configuration: Record<string, any>;
		}>,
		context: CoordinationContext,
	): Promise<BatchOperation[]> {
		const batchOps: BatchOperation[] = [];

		for (const op of operations) {
			const batchOp = this.createBatchOperation(
				op.type,
				op.targets,
				op.configuration,
			);
			batchOps.push(batchOp);

			// Simulate batch operation execution
			setTimeout(
				async () => {
					await this.completeBatchOperation(batchOp.id, {
						type: op.type,
						targets: op.targets,
						results: `Processed ${op.targets.length} targets`,
					});
				},
				100 + Math.random() * 500,
			);
		}

		this.emit("batch:coordinated", {
			sessionId: context.sessionId,
			operations: batchOps,
		});

		return batchOps;
	}

	/**
	 * Coordinate swarm of agents with different patterns
	 */
	async coordinateSwarm(
		objective: string,
		context: CoordinationContext,
		agents: Array<{
			type: string;
			capabilities: string[];
			priority: number;
		}>,
	): Promise<{
		coordinationId: string;
		pattern: string;
		agentAssignments: Record<string, string[]>;
	}> {
		const coordinationId = generateId();
		const pattern = context.coordinationMode;

		// Create coordination strategy based on pattern
		const agentAssignments: Record<string, string[]> = {};

		switch (pattern) {
			case "centralized":
				// Single coordinator manages all agents
				agentAssignments.coordinator = agents.map((a, i) => `agent-${i}`);
				break;

			case "distributed": {
				// Multiple coordinators for different capabilities
				const groups = this.groupAgentsByCapability(agents);
				Object.entries(groups).forEach(([capability, groupAgents], i) => {
					agentAssignments[`coordinator-${capability}`] = groupAgents.map(
						(_, j) => `agent-${capability}-${j}`,
					);
				});
				break;
			}

			case "hierarchical": {
				// Tree structure with team leads
				const teamSize = Math.ceil(agents.length / 3);
				for (let i = 0; i < agents.length; i += teamSize) {
					const teamLead = `team-lead-${Math.floor(i / teamSize)}`;
					agentAssignments[teamLead] = agents
						.slice(i, i + teamSize)
						.map((_, j) => `agent-${i + j}`);
				}
				break;
			}

			case "mesh":
				// Peer-to-peer coordination
				agentAssignments.mesh = agents.map((_, i) => `peer-${i}`);
				break;

			case "hybrid": {
				// Mixed patterns based on task complexity
				const criticalAgents = agents.filter((a) => a.priority > 7);
				const regularAgents = agents.filter((a) => a.priority <= 7);

				if (criticalAgents.length > 0) {
					agentAssignments.critical_coordinator = criticalAgents.map(
						(_, i) => `critical-agent-${i}`,
					);
				}
				if (regularAgents.length > 0) {
					agentAssignments.regular_mesh = regularAgents.map(
						(_, i) => `regular-agent-${i}`,
					);
				}
				break;
			}
		}

		// Store coordination plan
		await this.storeInMemory(
			`coordination/${coordinationId}/plan`,
			{
				objective,
				pattern,
				agentAssignments,
				agents,
				createdAt: new Date(),
			},
			{ namespace: "swarm_coordination", tags: [pattern, "coordination"] },
		);

		this.emit("swarm:coordinated", {
			coordinationId,
			pattern,
			agentAssignments,
			objective,
		});

		return { coordinationId, pattern, agentAssignments };
	}

	/**
	 * Get coordination status and metrics
	 */
	getCoordinationStatus(): {
		activeSessions: number;
		totalAgents: number;
		activeOperations: number;
		memoryEntries: number;
		completedTodos: number;
	} {
		const activeAgents = Array.from(this.agentCoordination.values()).filter(
			(agent) => agent.status === "busy",
		).length;

		const activeOperations = Array.from(this.batchOperations.values()).filter(
			(op) => op.status === "running",
		).length;

		const completedTodos = Array.from(this.todoItems.values()).filter(
			(todo) => todo.status === "completed",
		).length;

		return {
			activeSessions: this.coordinationSessions.size,
			totalAgents: this.agentCoordination.size,
			activeOperations,
			memoryEntries: this.memoryStore.size,
			completedTodos,
		};
	}

	// Private helper methods

	private getTaskTemplatesByStrategy(
		strategy: string,
		objective: string,
	): Array<{
		content: string;
		priority: "high" | "medium" | "low" | "critical";
		estimatedTime?: string;
		assignedAgent?: string;
		tags?: string[];
		dependencies?: number[];
		sequential?: boolean;
	}> {
		const templates: Record<string, any[]> = {
			development: [
				{
					content: `Analyze requirements for: ${objective}`,
					priority: "high",
					estimatedTime: "30-45 min",
					tags: ["analysis", "requirements"],
				},
				{
					content: `Design system architecture`,
					priority: "high",
					estimatedTime: "45-60 min",
					tags: ["design", "architecture"],
					dependencies: [0],
				},
				{
					content: `Implement core functionality`,
					priority: "high",
					estimatedTime: "2-3 hours",
					tags: ["implementation", "core"],
					dependencies: [1],
				},
				{
					content: `Write comprehensive tests`,
					priority: "medium",
					estimatedTime: "1-2 hours",
					tags: ["testing", "quality"],
					dependencies: [2],
				},
				{
					content: `Create documentation`,
					priority: "medium",
					estimatedTime: "30-45 min",
					tags: ["documentation"],
					dependencies: [2],
				},
				{
					content: `Performance optimization`,
					priority: "low",
					estimatedTime: "1-2 hours",
					tags: ["optimization", "performance"],
					dependencies: [3, 4],
				},
			],
			research: [
				{
					content: `Define research scope and objectives`,
					priority: "critical",
					estimatedTime: "15-30 min",
					tags: ["research", "planning"],
				},
				{
					content: `Gather relevant sources and data`,
					priority: "high",
					estimatedTime: "45-90 min",
					tags: ["research", "data-collection"],
					dependencies: [0],
				},
				{
					content: `Analyze findings and patterns`,
					priority: "high",
					estimatedTime: "60-120 min",
					tags: ["analysis", "patterns"],
					dependencies: [1],
				},
				{
					content: `Synthesize conclusions`,
					priority: "medium",
					estimatedTime: "30-60 min",
					tags: ["synthesis", "conclusions"],
					dependencies: [2],
				},
				{
					content: `Create research report`,
					priority: "medium",
					estimatedTime: "30-45 min",
					tags: ["documentation", "report"],
					dependencies: [3],
				},
			],
			// Add more strategies as needed
		};

		return templates[strategy] || templates.development;
	}

	private groupAgentsByCapability(
		agents: Array<{ type: string; capabilities: string[]; priority: number }>,
	): Record<string, any[]> {
		const groups: Record<string, any[]> = {};

		for (const agent of agents) {
			for (const capability of agent.capabilities) {
				if (!groups[capability]) {
					groups[capability] = [];
				}
				groups[capability].push(agent);
			}
		}

		return groups;
	}

	private createBatchOperation(
		type: "read" | "write" | "search" | "analyze" | "coordinate",
		targets: string[],
		configuration: Record<string, any>,
	): BatchOperation {
		const id = generateId();
		const batchOp: BatchOperation = {
			id,
			type,
			targets,
			configuration,
			status: "running",
			createdAt: new Date(),
		};

		this.batchOperations.set(id, batchOp);
		return batchOp;
	}

	private async completeBatchOperation(
		id: string,
		results: any,
	): Promise<void> {
		const batchOp = this.batchOperations.get(id);
		if (batchOp) {
			batchOp.status = "completed";
			batchOp.results = results;
			batchOp.completedAt = new Date();
			this.emit("batch:completed", { id, results });
		}
	}

	// Event handlers for task engine events

	private async handleTaskCreated(event: {
		taskId: string;
		task: any;
	}): Promise<void> {
		// Update coordination state when tasks are created
		const { taskId, task } = event;

		if (task.assignedAgent) {
			const agentState = this.agentCoordination.get(task.assignedAgent);
			if (agentState) {
				agentState.currentTasks.push(taskId);
				agentState.lastHeartbeat = new Date();
			}
		}
	}

	private async handleTaskStatusChanged(event: {
		taskId: string;
		oldStatus: TaskStatus;
		newStatus: TaskStatus;
	}): Promise<void> {
		// Update coordination state when task status changes
		const { taskId, newStatus } = event;

		// Update related todo items
		for (const todo of this.todoItems.values()) {
			if (todo.metadata?.taskId === taskId) {
				todo.status =
					newStatus === "completed"
						? "completed"
						: newStatus === "running"
							? "in_progress"
							: "pending";
				todo.updatedAt = new Date();
			}
		}
	}

	private async handleTaskCompleted(event: {
		taskId: string;
		task: any;
	}): Promise<void> {
		// Handle task completion for coordination
		const { taskId, task } = event;

		if (task.assignedAgent) {
			const agentState = this.agentCoordination.get(task.assignedAgent);
			if (agentState) {
				agentState.currentTasks = agentState.currentTasks.filter(
					(id) => id !== taskId,
				);
				agentState.lastHeartbeat = new Date();

				if (agentState.currentTasks.length === 0) {
					agentState.status = "idle";
				}
			}
		}
	}

	private async handleTaskFailed(event: {
		taskId: string;
		task: any;
	}): Promise<void> {
		// Handle task failure for coordination
		const { taskId, task } = event;

		if (task.assignedAgent) {
			const agentState = this.agentCoordination.get(task.assignedAgent);
			if (agentState) {
				agentState.status = "failed";
				agentState.lastHeartbeat = new Date();
			}
		}
	}

	private async handleTaskCancelled(event: {
		taskId: string;
		task: any;
		reason: string;
	}): Promise<void> {
		// Handle task cancellation for coordination
		const { taskId, task } = event;

		if (task.assignedAgent) {
			const agentState = this.agentCoordination.get(task.assignedAgent);
			if (agentState) {
				agentState.currentTasks = agentState.currentTasks.filter(
					(id) => id !== taskId,
				);
				agentState.lastHeartbeat = new Date();

				if (agentState.currentTasks.length === 0) {
					agentState.status = "idle";
				}
			}
		}
	}
}
