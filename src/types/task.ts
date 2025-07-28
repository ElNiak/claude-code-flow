/**
 * Task system TypeScript interfaces
 * Part of Phase 1B TypeScript migration architecture
 */

export type TaskType =
	| "research"
	| "code"
	| "analysis"
	| "coordination"
	| "general";
export type TaskStatus =
	| "queued"
	| "running"
	| "completed"
	| "failed"
	| "cancelled";
export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Task {
	id: string;
	type: TaskType;
	description: string;
	priority: TaskPriority;
	status: TaskStatus;
	createdAt: string;
	updatedAt?: string;
	completedAt?: string;
	assignedAgent?: string;
	parentTask?: string;
	subtasks: string[];
	dependencies: string[];
	progress: number; // 0-100
	results?: any;
	metadata?: Record<string, any>;
}

export interface TaskCreateOptions {
	type: TaskType;
	description: string;
	priority?: TaskPriority;
	assignedAgent?: string;
	parentTask?: string;
	dependencies?: string[];
	metadata?: Record<string, any>;
}

export interface TaskListOptions {
	filter?: TaskStatus;
	verbose?: boolean;
	type?: TaskType;
	assignedAgent?: string;
	parentTask?: string;
	limit?: number;
	offset?: number;
}

export interface TaskUpdateOptions {
	status?: TaskStatus;
	progress?: number;
	assignedAgent?: string;
	results?: any;
	metadata?: Record<string, any>;
}

export interface TaskCommandOptions {
	filter?: TaskStatus;
	verbose?: boolean;
	priority?: string;
	json?: boolean;
}

export interface WorkflowDefinition {
	name: string;
	description: string;
	tasks: WorkflowTask[];
	dependencies: WorkflowDependency[];
	metadata?: Record<string, any>;
}

export interface WorkflowTask {
	id: string;
	name: string;
	type: TaskType;
	description: string;
	priority: TaskPriority;
	estimatedDuration?: number;
	requirements?: string[];
}

export interface WorkflowDependency {
	taskId: string;
	dependsOn: string[];
	type: "sequential" | "parallel" | "conditional";
	condition?: string;
}

export interface TaskCoordinationStatus {
	activeCoordinators: number;
	pendingTasks: number;
	runningTasks: number;
	completedTasks: number;
	resourceUtilization: number;
	averageTaskDuration: number;
}

export interface TaskOptimizationResult {
	dependencyAnalysis: {
		criticalPath: string[];
		parallelizableTasks: string[][];
		bottlenecks: string[];
	};
	resourceAllocation: {
		recommendedAgents: number;
		estimatedDuration: number;
		optimalSchedule: TaskScheduleEntry[];
	};
}

export interface TaskScheduleEntry {
	taskId: string;
	agentId: string;
	startTime: string;
	estimatedEndTime: string;
	dependencies: string[];
}
