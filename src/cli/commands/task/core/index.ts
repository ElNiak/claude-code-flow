// ABOUTME: Task system utilities and orchestration functions
// ABOUTME: Provides main entry point and helper functions for task management system

import { getErrorMessage as _getErrorMessage } from "../../../cli/shared/errors/error-handler.js";
import { generateId } from "../../../utils/helpers.js";
import type {
	CoordinationContext,
	TaskCreateOptions,
	TaskPriority,
	TaskType,
	TodoItem,
} from "../types.js";
import type { TaskCoordinator } from "./coordinator.js";
import type { TaskEngine } from "./engine.js";

function getErrorMessage(error: unknown): string {
	return _getErrorMessage(error);
}

/**
 * Initialize task management system with engine and coordinator
 */
export async function initializeTaskManagement(
	maxConcurrentTasks: number = 10,
	memoryManager?: any,
): Promise<{ taskEngine: TaskEngine; taskCoordinator: TaskCoordinator }> {
	const { TaskEngine } = await import("./engine.js");
	const { TaskCoordinator } = await import("./coordinator.js");

	const taskEngine = new TaskEngine(maxConcurrentTasks, memoryManager);
	await taskEngine.initialize();

	const taskCoordinator = new TaskCoordinator(taskEngine, memoryManager);

	return { taskEngine, taskCoordinator };
}

/**
 * Create TodoWrite-style task breakdown for complex operations
 */
export async function createTaskTodos(
	objective: string,
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
		sessionId?: string;
		coordinationMode?:
			| "centralized"
			| "distributed"
			| "hierarchical"
			| "mesh"
			| "hybrid";
	} = {},
	taskCoordinator?: TaskCoordinator,
): Promise<TodoItem[]> {
	if (!taskCoordinator) {
		const { taskCoordinator: coordinator } = await initializeTaskManagement();
		taskCoordinator = coordinator;
	}

	const context: CoordinationContext = {
		sessionId: options.sessionId || generateId(),
		coordinationMode: options.coordinationMode || "centralized",
		metadata: {
			objective,
			createdAt: new Date(),
		},
	};

	return await taskCoordinator.createTaskTodos(objective, context, options);
}

/**
 * Launch parallel agents using Task tool pattern
 */
export async function launchParallelAgents(
	agentConfigs: Array<{
		agentType: string;
		objective: string;
		mode: string;
		memoryKey?: string;
		batchOptimized?: boolean;
		coordinationHooks?: boolean;
	}>,
	context?: Partial<CoordinationContext>,
	taskCoordinator?: TaskCoordinator,
): Promise<string[]> {
	if (!taskCoordinator) {
		const { taskCoordinator: coordinator } = await initializeTaskManagement();
		taskCoordinator = coordinator;
	}

	const coordinationContext: CoordinationContext = {
		sessionId: context?.sessionId || generateId(),
		coordinationMode: context?.coordinationMode || "hierarchical",
		metadata: {
			agentCount: agentConfigs.length,
			createdAt: new Date(),
			...context?.metadata,
		},
		...context,
	};

	return await taskCoordinator.launchParallelAgents(
		agentConfigs,
		coordinationContext,
	);
}

/**
 * Store coordination data in memory
 */
export async function storeCoordinationData(
	key: string,
	value: any,
	options: {
		namespace?: string;
		tags?: string[];
		expiresIn?: number;
	} = {},
	taskCoordinator?: TaskCoordinator,
): Promise<void> {
	if (!taskCoordinator) {
		const { taskCoordinator: coordinator } = await initializeTaskManagement();
		taskCoordinator = coordinator;
	}

	await taskCoordinator.storeInMemory(key, value, options);
}

/**
 * Retrieve coordination data from memory
 */
export async function retrieveCoordinationData(
	key: string,
	namespace?: string,
	taskCoordinator?: TaskCoordinator,
): Promise<any> {
	if (!taskCoordinator) {
		const { taskCoordinator: coordinator } = await initializeTaskManagement();
		taskCoordinator = coordinator;
	}

	return await taskCoordinator.retrieveFromMemory(key, namespace);
}

/**
 * Create a simple task with common options
 */
export async function createSimpleTask(
	type: TaskType,
	description: string,
	options: {
		priority?: TaskPriority;
		assignedAgent?: string;
		tags?: string[];
		metadata?: Record<string, any>;
	} = {},
	taskEngine?: TaskEngine,
): Promise<string> {
	if (!taskEngine) {
		const { taskEngine: engine } = await initializeTaskManagement();
		taskEngine = engine;
	}

	return await taskEngine.createTask({
		type,
		description,
		priority: options.priority || 5,
		assignedAgent: options.assignedAgent,
		tags: options.tags,
		metadata: options.metadata,
	});
}

/**
 * Get comprehensive task status
 */
export async function getTaskDetails(
	taskId: string,
	taskEngine?: TaskEngine,
): Promise<{
	task: any;
	execution?: any;
	subtasks: any[];
	dependencies: any[];
} | null> {
	if (!taskEngine) {
		const { taskEngine: engine } = await initializeTaskManagement();
		taskEngine = engine;
	}

	return await taskEngine.getTaskStatus(taskId);
}

/**
 * Cancel task with reason
 */
export async function cancelTaskWithReason(
	taskId: string,
	reason: string = "User requested",
	rollback: boolean = true,
	taskEngine?: TaskEngine,
): Promise<boolean> {
	if (!taskEngine) {
		const { taskEngine: engine } = await initializeTaskManagement();
		taskEngine = engine;
	}

	return await taskEngine.cancelTask(taskId, reason, rollback);
}

// CLI Examples and Usage Patterns
export const CLI_EXAMPLES = {
	basic: {
		create: 'claude-flow task create research "Market analysis" --priority 8',
		list: "claude-flow task list --filter running",
		status: "claude-flow task status task-123",
		cancel: "claude-flow task cancel task-123",
	},
	advanced: {
		workflow: "claude-flow task workflow examples/development-workflow.json",
		coordination: "claude-flow task coordination status",
		batch: "claude-flow task create batch --config batch-config.json",
	},
};

export const USAGE_EXAMPLES = `
# Task Management Examples

## Basic Task Operations
${CLI_EXAMPLES.basic.create}
${CLI_EXAMPLES.basic.list}
${CLI_EXAMPLES.basic.status}
${CLI_EXAMPLES.basic.cancel}

## Advanced Operations
${CLI_EXAMPLES.advanced.workflow}
${CLI_EXAMPLES.advanced.coordination}
${CLI_EXAMPLES.advanced.batch}

## Programmatic Usage
\`\`\`typescript
import { createTaskTodos, launchParallelAgents } from './task';

// Create coordinated task breakdown
const todos = await createTaskTodos("Build e-commerce platform", {
  strategy: 'development',
  batchOptimized: true,
  parallelExecution: true,
  memoryCoordination: true
});

// Launch coordinated agents
const agentIds = await launchParallelAgents([
  {
    agentType: 'researcher',
    objective: 'Research microservices patterns',
    mode: 'researcher',
    memoryKey: 'microservices_research'
  },
  {
    agentType: 'architect',
    objective: 'Design system architecture',
    mode: 'architect',
    memoryKey: 'system_architecture'
  }
]);
\`\`\`
`;

// Export default configuration
export default {
	maxConcurrentTasks: 10,
	defaultStrategy: "development",
	batchOptimized: true,
	parallelExecution: true,
	memoryCoordination: true,
	coordinationMode: "hierarchical",
	examples: CLI_EXAMPLES,
	usage: USAGE_EXAMPLES,
};

// Re-export types for convenience
export type {
	CoordinationContext,
	TaskCoordinator,
	TaskCreateOptions,
	TaskEngine,
	TaskPriority,
	TaskType,
	TodoItem,
} from "../types.js";
