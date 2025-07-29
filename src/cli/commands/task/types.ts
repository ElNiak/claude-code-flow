// ABOUTME: Unified type definitions for task management system integrating CLI and core functionality
// ABOUTME: Consolidates types from both CLI and sophisticated task engine systems

import type { EventEmitter } from "events";

// ============================================================================
// CORE TASK TYPES (from sophisticated system)
// ============================================================================

export interface TaskDependency {
	taskId: string;
	type:
		| "finish-to-start"
		| "start-to-start"
		| "finish-to-finish"
		| "start-to-finish";
	lag?: number; // delay in milliseconds
}

export interface ResourceRequirement {
	resourceId: string;
	type: "cpu" | "memory" | "disk" | "network" | "custom";
	amount: number;
	unit: string;
	exclusive?: boolean;
	priority?: number;
}

export interface TaskSchedule {
	startTime?: Date;
	endTime?: Date;
	deadline?: Date;
	recurring?: {
		interval: "daily" | "weekly" | "monthly";
		count?: number;
		until?: Date;
	};
	timezone?: string;
}

export interface TaskExecution {
	id: string;
	taskId: string;
	status: TaskStatus;
	progress: number;
	startTime: Date;
	endTime?: Date;
	error?: Error;
	result?: any;
	metrics: TaskMetrics;
	checkpoints: TaskCheckpoint[];
	logs: TaskLog[];
}

export interface TaskMetrics {
	cpuUsage: number;
	memoryUsage: number;
	diskUsage: number;
	networkUsage: number;
	duration: number;
	completionPercentage: number;
	customMetrics: Record<string, number>;
}

export interface TaskCheckpoint {
	id: string;
	taskId: string;
	timestamp: Date;
	state: any;
	description: string;
	metadata?: Record<string, unknown>;
}

export interface TaskLog {
	timestamp: Date;
	level: "debug" | "info" | "warn" | "error";
	message: string;
	metadata?: Record<string, unknown>;
}

export interface TaskFilter {
	status?: TaskStatus[];
	type?: TaskType[];
	priority?: [number, number]; // min, max
	assignedTo?: string[];
	tags?: string[];
	createdAfter?: Date;
	createdBefore?: Date;
	lastUpdatedAfter?: Date;
	lastUpdatedBefore?: Date;
}

export interface TaskSort {
	field: "createdAt" | "updatedAt" | "priority" | "status" | "deadline";
	direction: "asc" | "desc";
}

export interface Workflow {
	id: string;
	name: string;
	description: string;
	tasks: WorkflowTask[];
	dependencies: TaskDependency[];
	status: "draft" | "active" | "completed" | "failed" | "cancelled";
	createdAt: Date;
	updatedAt: Date;
	metadata?: Record<string, unknown>;
}

// ============================================================================
// CLI COMPATIBLE TYPES (preserved from CLI system)
// ============================================================================

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

// Enhanced Task interface combining both systems
export interface Task {
	id: string;
	type: TaskType;
	description: string;
	priority: TaskPriority;
	status: TaskStatus;
	createdAt: Date;
	updatedAt?: Date;
	completedAt?: Date;
	assignedAgent?: string;
	parentTask?: string;
	subtasks: string[];
	dependencies: TaskDependency[];
	progress: number; // 0-100
	results?: any;
	metadata?: TaskMetadata;
	resourceRequirements?: ResourceRequirement[];
	schedule?: TaskSchedule;
	tags?: string[];
}

// WorkflowTask extends Task with additional workflow-specific properties
export interface WorkflowTask extends Omit<Task, "dependencies" | "metadata"> {
	dependencies: TaskDependency[];
	resourceRequirements: ResourceRequirement[];
	schedule: TaskSchedule;
	retryPolicy: {
		maxAttempts: number;
		backoffMs: number;
		backoffMultiplier: number;
		condition?: (error: Error) => boolean;
	};
	rollbackStrategy: "none" | "previous-checkpoint" | "initial-state" | "custom";
	rollbackHandler?: () => Promise<void>;
	metadata: TaskMetadata;
}

// ============================================================================
// COORDINATION TYPES (from sophisticated system)
// ============================================================================

export interface TodoItem {
	id: string;
	content: string;
	status: "pending" | "in_progress" | "completed";
	priority: "high" | "medium" | "low" | "critical";
	dependencies?: string[];
	estimatedTime?: string;
	assignedAgent?: string;
	batchOptimized?: boolean;
	parallelExecution?: boolean;
	memoryKey?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface MemoryEntry {
	key: string;
	value: any;
	timestamp: Date;
	namespace?: string;
	tags?: string[];
	expiresAt?: Date;
}

export interface CoordinationContext {
	sessionId: string;
	agentId?: string;
	workflowId?: string;
	batchId?: string;
	parentTaskId?: string;
	coordinationMode:
		| "centralized"
		| "distributed"
		| "hierarchical"
		| "mesh"
		| "hybrid";
	agents?: any[];
	metadata?: Record<string, any>;
}

export interface AgentCoordinationState {
	agentId: string;
	status: "idle" | "busy" | "failed" | "disconnected";
	currentTasks: string[];
	capabilities: string[];
	load: number;
	lastHeartbeat: Date;
	metadata?: Record<string, any>;
}

export interface BatchOperation {
	id: string;
	type: "read" | "write" | "search" | "analyze" | "coordinate";
	targets: string[];
	configuration: Record<string, any>;
	status: "pending" | "running" | "completed" | "failed";
	results?: any[];
	error?: Error;
	createdAt: Date;
	completedAt?: Date;
}

// Enhanced task metadata interface
export interface TaskMetadata extends Record<string, unknown> {
	retryCount?: number;
	todoId?: string;
	batchOptimized?: boolean;
	parallelExecution?: boolean;
	memoryKey?: string;
	cancellationReason?: string;
	cancelledAt?: Date;
	lastRetryAt?: Date;
	originalPriority?: number;
	escalated?: boolean;
	checkpointData?: Record<string, unknown>;
}

// ============================================================================
// CLI COMMAND TYPES
// ============================================================================

export interface TaskCommandContext {
	taskEngine: any; // Will be properly typed when moved
	taskCoordinator?: any; // Will be properly typed when moved
	memoryManager?: any;
	logger?: any;
}

export interface TaskFlags {
	priority?: string;
	filter?: string;
	verbose?: boolean;
	force?: boolean;
	json?: boolean;
	watch?: boolean;
}

export interface TaskCreateOptions {
	type: TaskType;
	description: string;
	priority?: TaskPriority;
	assignedAgent?: string;
	parentTask?: string;
	dependencies?: string[];
	tags?: string[];
	deadline?: string;
	resourceRequirements?: ResourceRequirement[];
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
	sort?: TaskSort;
	tags?: string[];
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
	watch?: boolean;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export interface WorkflowDefinition {
	name: string;
	description: string;
	tasks: WorkflowTask[];
	dependencies: TaskDependency[];
	metadata?: Record<string, any>;
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

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AgentProfile = {
	id: string;
	name: string;
	type: string;
	capabilities: string[];
	status: "active" | "inactive" | "busy";
	load: number;
	metadata?: Record<string, any>;
};

export type Resource = {
	id: string;
	type: "cpu" | "memory" | "disk" | "network" | "custom";
	total: number;
	available: number;
	unit: string;
	metadata?: Record<string, any>;
};

// Re-export commonly used types for convenience
export type { EventEmitter };
