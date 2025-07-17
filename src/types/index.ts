// Re-export all types for convenience
// export * from '../core/types.js'; // File not found
// export * from '../agents/types.js'; // File not found
// export * from '../integrations/types.js'; // File not found
// export * from '../memory/types.js'; // File not found,

// Export hive-mind types
export type { AgentCapability } from "../hive-mind/types.js";
// Export swarm types with specific naming to avoid conflicts
// Export swarm AgentConfig as SwarmAgentConfig to avoid conflicts
export type {
	AgentCapabilities,
	AgentConfig as SwarmAgentConfig,
	AgentEnvironment,
	AgentError,
	AgentId,
	AgentMetrics,
	AgentState,
	AgentStatus,
	AgentType,
	ErrorEvent,
	SwarmConfig,
	SwarmId,
	SwarmMetrics,
	SwarmObjective,
	TaskDefinition,
	TaskEvent,
	TaskId as SwarmTaskId,
	TaskRequirements,
	TaskResult,
	TaskStatus as SwarmTaskStatus,
	TaskType,
	ValidationResult as SwarmValidationResult,
} from "../swarm/types.js";
// Export unified coordination types with specific naming
// Export unified core ExecutionStrategy as UnifiedExecutionStrategy to avoid conflicts
export type {
	Action,
	AdaptationRule,
	AdaptationState,
	CollaborationState,
	ConsensusState,
	CoordinationMatrix,
	CoordinationMatrixConfig,
	CoordinationPattern,
	CoordinationSnapshot,
	Decision,
	ExecutionContext,
	ExecutionEngine,
	ExecutionPhase,
	ExecutionStatus,
	ExecutionStrategy as UnifiedExecutionStrategy,
	HiveState,
	HolisticInsight,
	HolisticView,
	Improvement,
	IntrinsicCoordinator,
	Pattern,
	Refinement,
	SPARCPhase,
	SPARCState,
	SwarmState as UnifiedSwarmState,
	Trigger,
	UnifiedAgent,
	UnifiedAgentCapabilities,
	UnifiedAgentConfig,
	UnifiedAgentEvents,
	UnifiedAgentState,
	UnifiedCoordinationConfig,
	UnifiedCoordinationState,
	UnifiedCoordinationSystem,
	UnifiedCoordinationSystemConfig,
	UnifiedMetrics,
} from "../unified/core/index.js";
// Export unified work command types with specific naming
// Export unified work AgentConfig as WorkAgentConfig to avoid conflicts
// Export unified work ExecutionStrategy as WorkExecutionStrategy to avoid conflicts
export type {
	AgentConfig as WorkAgentConfig,
	AgentTopology,
	ConfigSchema,
	CoordinationConfig,
	CoordinationResult,
	CustomPreset,
	EnvironmentConfig,
	ExecutionPlan,
	ExecutionStep,
	ExecutionStrategy as WorkExecutionStrategy,
	PresetDefinition,
	PresetMetadata,
	TaskAnalysis,
	TaskComplexity,
	TaskInput,
	WorkConfig,
	WorkOptions,
	WorkPreset,
} from "../unified/work/types.js";

// Memory-specific types that may be referenced,
export interface MemoryEntry {
	id: string;
	key: string;
	value: any;
	data?: any; // For backward compatibility,
	metadata?: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
	partition?: string;
}

// Task types for coordination system (simple types)
export type TaskId = string;
export type TaskStatus = "pending" | "active" | "completed" | "failed";

// Component monitoring types,
export enum ComponentStatus {
	HEALTHY = "healthy",
	WARNING = "warning",
	ERROR = "error",
	UNKNOWN = "unknown",
}

// Alert types for monitoring,
export interface AlertData {
	id: string;
	level: "info" | "warning" | "error" | "critical";
	message: string;
	timestamp: Date;
	component?: string;
	metadata?: Record<string, any>;
}

// Re-export specific resource types from swarm/types.ts to make them available globally
// Re-export event and update types from swarm/types.ts with consistent naming
export type {
	AgentMetricsUpdate,
	AgentStatusChange,
	ErrorEvent as SwarmErrorEvent,
	ResourceFailure,
	ResourceRelease,
	ResourceRequest,
	ResourceUsageUpdate,
	ScalingTrigger,
	SwarmMetricsUpdate,
	SystemResourceUpdate,
	TaskEvent as SwarmTaskEvent,
} from "../swarm/types.js";
// Export new type definitions with explicit re-exports to avoid ambiguity and conflicts
export type * from "./error-types.js";
export * from "./event-types.js";
export type * from "./features.js";

// Import specific functions from event-types for use in type guards
import { isTaskEvent } from "./event-types.js";

export type {
	CliCommand,
	CliConfig,
	CliError,
	CliLogger,
	CliMiddleware,
	CliOption,
	CliPlugin,
	CliProgressIndicator,
	CommandContext as CliCommandContext,
	CommandResult as CliCommandResult,
	CompletionContext,
	CompletionSuggestion,
	ConfigManager as CliConfigManager,
	EnvironmentInfo as CliEnvironmentInfo, // Primary EnvironmentInfo from cli-types
	HelpOptions,
	HelpSection,
	LogLevel,
	PerformanceMetrics,
	PluginHooks,
	PromptAnswer,
	PromptChoice,
	PromptQuestion,
	TableColumn,
	TableOptions,
	TelemetryConfig,
	TelemetryEvent,
	UpdateInfo,
} from "./cli-types.js";
// Explicit selective re-exports to avoid conflicts
export type {
	CreateProgressIndicator,
	DetectEnvironment,
	EnvironmentInfo as ProgressEnvironmentInfo, // Renamed to resolve conflict with cli-types
	GetOptimalConfig,
	MigrationProgress,
	ProgressConfig,
	ProgressConfigManager,
	ProgressDemoFunction,
	ProgressIndicator,
	ProgressMiddlewareOptions,
	ProgressResult,
	ProgressStatus,
	ProgressStep,
} from "./progress-types.js";
export type {
	AgentConfig as SwarmInterfaceAgentConfig, // Renamed to avoid conflict with other SwarmAgentConfig
	AgentPerformance,
	CommandResult as SwarmCommandResult, // Renamed to avoid conflict with cli-types
	McpServerResult,
	SwarmAgent,
	SwarmMemoryError,
	SwarmMemoryManager,
	SwarmMemoryStats,
	SwarmMemoryStatus,
	SwarmMemoryWarning,
	SwarmProgress,
	SwarmTask,
	SwarmTopology,
	TaskExecutor,
	TaskExecutorError,
	TaskExecutorStats,
	TaskExecutorStatus,
	TopologyConnection,
	TopologyNode,
} from "./swarm-interfaces.js";
export type {
	ArrayHelper,
	BaseCliOptions,
	CommandContext as UtilityCommandContext, // Renamed to avoid conflict with cli-types
	ConfigImpact,
	CurrentState,
	GenerateId,
	GetErrorMessage,
	IterationHelper,
	MigratedConfig,
	ParsedParams,
	PathHelper,
	StringHelper,
} from "./utility-types.js";
// Export utility functions (these don't conflict since they're not types)
export {
	arrayUtils,
	hasProperty,
	isArray,
	isBoolean,
	isNumber,
	isObject,
	isString,
	safeArrayAccess,
	safeGet,
	stringUtils,
} from "./utility-types.js";

// Import types for type guards - use the same names as exported to avoid confusion
import type {
	AgentMetricsUpdate,
	AgentStatusChange,
	ErrorEvent,
	ResourceFailure,
	ResourceRelease,
	ResourceRequest,
	ResourceUsageUpdate,
	ScalingTrigger,
	SwarmMetricsUpdate,
	SystemResourceUpdate,
	TaskEvent,
} from "../swarm/types.js";

// Type guards for real-time monitor events
export function isAgentMetricsUpdate(
	data: unknown
): data is AgentMetricsUpdate {
	return (
		typeof data === "object" &&
		data !== null &&
		"agentId" in data &&
		"metrics" in data &&
		typeof (data as any).agentId === "string"
	);
}

export function isAgentStatusChange(data: unknown): data is AgentStatusChange {
	return (
		typeof data === "object" &&
		data !== null &&
		"agentId" in data &&
		"from" in data &&
		"to" in data
	);
}

export function isTaskCompletedEvent(
	data: unknown
): data is TaskEvent & { duration: number } {
	return (
		isTaskEvent(data) &&
		"duration" in data &&
		typeof (data as any).duration === "number"
	);
}

export function isTaskFailedEvent(
	data: unknown
): data is TaskEvent & { error: string } {
	return (
		isTaskEvent(data) &&
		"error" in data &&
		typeof (data as any).error === "string"
	);
}

export function isSystemResourceUpdate(
	data: unknown
): data is SystemResourceUpdate {
	return typeof data === "object" && data !== null;
}

export function isSwarmMetricsUpdate(
	data: unknown
): data is SwarmMetricsUpdate {
	return typeof data === "object" && data !== null && "metrics" in data;
}

export function isErrorEvent(data: unknown): data is ErrorEvent {
	return typeof data === "object" && data !== null && "message" in data;
}

// Additional type guards for swarm types
export function isSwarmTaskEvent(data: unknown): data is TaskEvent {
	return (
		typeof data === "object" &&
		data !== null &&
		"taskId" in data &&
		"agentId" in data &&
		typeof (data as any).taskId === "string"
	);
}

export function isResourceRequest(data: unknown): data is ResourceRequest {
	return (
		typeof data === "object" &&
		data !== null &&
		"agentId" in data &&
		"requirements" in data
	);
}

export function isResourceRelease(data: unknown): data is ResourceRelease {
	return typeof data === "object" && data !== null && "allocationId" in data;
}

export function isResourceUsageUpdate(
	data: unknown
): data is ResourceUsageUpdate {
	return (
		typeof data === "object" &&
		data !== null &&
		"resourceId" in data &&
		"usage" in data
	);
}

export function isResourceFailure(data: unknown): data is ResourceFailure {
	return (
		typeof data === "object" &&
		data !== null &&
		"resourceId" in data &&
		"type" in data
	);
}

export function isScalingTrigger(data: unknown): data is ScalingTrigger {
	return typeof data === "object" && data !== null && "action" in data;
}
