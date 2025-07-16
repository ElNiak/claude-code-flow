// Re-export all types for convenience
// export * from '../core/types.js'; // File not found
// export * from '../agents/types.js'; // File not found
// export * from '../integrations/types.js'; // File not found
// export * from '../memory/types.js'; // File not found,

// Export swarm types with specific naming to avoid conflicts
export type {
  SwarmId,
  AgentId,
  TaskId as SwarmTaskId,
  AgentType,
  AgentStatus,
  AgentCapabilities,
  AgentMetrics,
  AgentState,
  AgentEnvironment,
  AgentError,
  TaskType,
  TaskStatus as SwarmTaskStatus,
  TaskDefinition,
  TaskResult,
  TaskRequirements,
  SwarmObjective,
  SwarmConfig,
  SwarmMetrics,
  ValidationResult as SwarmValidationResult,
  TaskEvent,
  ErrorEvent
} from '../swarm/types.js';

// Export swarm AgentConfig as SwarmAgentConfig to avoid conflicts
export type { AgentConfig as SwarmAgentConfig } from '../swarm/types.js';

// Export hive-mind types
export type { AgentCapability } from '../hive-mind/types.js';

// Export unified coordination types with specific naming
export type {
  UnifiedCoordinationConfig,
  CoordinationMatrixConfig,
  UnifiedAgentConfig,
  UnifiedAgentCapabilities,
  UnifiedAgentState,
  UnifiedCoordinationState,
  ExecutionContext,
  SPARCState,
  SwarmState as UnifiedSwarmState,
  HiveState,
  CoordinationPattern,
  Decision,
  Refinement,
  Pattern,
  AdaptationRule,
  ConsensusState,
  HolisticView,
  CoordinationSnapshot,
  UnifiedMetrics,
  Trigger,
  Action,
  CollaborationState,
  AdaptationState,
  Improvement,
  HolisticInsight,
  IntrinsicCoordinator,
  UnifiedAgent,
  UnifiedAgentEvents,
  CoordinationMatrix,
  ExecutionEngine,
  ExecutionStatus,
  ExecutionPhase,
  SPARCPhase,
  UnifiedCoordinationSystem,
  UnifiedCoordinationSystemConfig
} from '../unified/core/index.js';

// Export unified work command types with specific naming
export type {
  WorkOptions,
  TaskComplexity,
  AgentTopology,
  TaskInput,
  TaskAnalysis,
  ExecutionStep,
  CoordinationConfig,
  ExecutionPlan,
  WorkConfig,
  EnvironmentConfig,
  ConfigSchema,
  WorkPreset,
  PresetDefinition,
  PresetMetadata,
  CustomPreset,
  CoordinationResult
} from '../unified/work/types.js';

// Export unified work AgentConfig as WorkAgentConfig to avoid conflicts
export type { AgentConfig as WorkAgentConfig } from '../unified/work/types.js';

// Export unified work ExecutionStrategy as WorkExecutionStrategy to avoid conflicts  
export type { ExecutionStrategy as WorkExecutionStrategy } from '../unified/work/types.js';

// Export unified core ExecutionStrategy as UnifiedExecutionStrategy to avoid conflicts
export type { ExecutionStrategy as UnifiedExecutionStrategy } from '../unified/core/index.js';

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
export type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';

// Component monitoring types,
export enum ComponentStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  UNKNOWN = 'unknown'
}

// Alert types for monitoring,
export interface AlertData {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  component?: string;
  metadata?: Record<string, any>;
}

// Export new type definitions with explicit re-exports to avoid ambiguity and conflicts
export type * from './error-types.js';
export type * from './features.js';
export * from './event-types.js';

// Re-export specific resource types from swarm/types.ts to make them available globally
export type {
  ResourceRequest,
  ResourceRelease,
  ResourceUsageUpdate,
  ResourceFailure,
  ScalingTrigger
} from '../swarm/types.js';

// Re-export event and update types from swarm/types.ts with consistent naming
export type {
  AgentMetricsUpdate,
  AgentStatusChange,
  SwarmMetricsUpdate,
  TaskEvent as SwarmTaskEvent,
  SystemResourceUpdate,
  ErrorEvent as SwarmErrorEvent
} from '../swarm/types.js';

// Import specific functions from event-types for use in type guards
import { isTaskEvent } from './event-types.js';

// Explicit selective re-exports to avoid conflicts
export type {
  ProgressStep,
  ProgressIndicator,
  ProgressStatus,
  ProgressResult,
  EnvironmentInfo as ProgressEnvironmentInfo,  // Renamed to resolve conflict with cli-types
  ProgressConfig,
  ProgressConfigManager,
  CreateProgressIndicator,
  DetectEnvironment,
  GetOptimalConfig,
  ProgressDemoFunction,
  ProgressMiddlewareOptions,
  MigrationProgress
} from './progress-types.js';

export type {
  GenerateId,
  GetErrorMessage,
  ArrayHelper,
  PathHelper,
  BaseCliOptions,
  ParsedParams,
  CommandContext as UtilityCommandContext,  // Renamed to avoid conflict with cli-types
  ConfigImpact,
  CurrentState,
  MigratedConfig,
  IterationHelper,
  StringHelper
} from './utility-types.js';

// Export utility functions (these don't conflict since they're not types)
export {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  hasProperty,
  safeGet,
  safeArrayAccess,
  stringUtils,
  arrayUtils
} from './utility-types.js';

export type {
  CliCommand,
  CliOption,
  CommandContext as CliCommandContext,
  CliConfig,
  CommandResult as CliCommandResult,
  CliError,
  HelpSection,
  HelpOptions,
  CompletionContext,
  CompletionSuggestion,
  CliPlugin,
  PluginHooks,
  PromptQuestion,
  PromptChoice,
  PromptAnswer,
  CliProgressIndicator,
  TableColumn,
  TableOptions,
  CliLogger,
  LogLevel,
  ConfigManager as CliConfigManager,
  EnvironmentInfo as CliEnvironmentInfo,  // Primary EnvironmentInfo from cli-types
  PerformanceMetrics,
  CliMiddleware,
  UpdateInfo,
  TelemetryEvent,
  TelemetryConfig
} from './cli-types.js';

export type {
  TaskExecutor,
  TaskExecutorStats,
  TaskExecutorStatus,
  TaskExecutorError,
  SwarmMemoryManager,
  SwarmMemoryStats,
  SwarmMemoryStatus,
  SwarmMemoryError,
  SwarmMemoryWarning,
  CommandResult as SwarmCommandResult,  // Renamed to avoid conflict with cli-types
  McpServerResult,
  AgentConfig as SwarmInterfaceAgentConfig,  // Renamed to avoid conflict with other SwarmAgentConfig
  SwarmTask,
  SwarmAgent,
  AgentPerformance,
  SwarmTopology,
  TopologyNode,
  TopologyConnection,
  SwarmProgress
} from './swarm-interfaces.js';

// Import types for type guards - use the same names as exported to avoid confusion
import type {
  AgentMetricsUpdate,
  AgentStatusChange,
  TaskEvent,
  SystemResourceUpdate,
  SwarmMetricsUpdate,
  ErrorEvent,
  ResourceRequest,
  ResourceRelease,
  ResourceUsageUpdate,
  ResourceFailure,
  ScalingTrigger
} from '../swarm/types.js';

// Type guards for real-time monitor events
export function isAgentMetricsUpdate(data: unknown): data is AgentMetricsUpdate {
  return (
    typeof data === 'object' &&
    data !== null &&
    'agentId' in data &&
    'metrics' in data &&
    typeof (data as any).agentId === 'string'
  );
}

export function isAgentStatusChange(data: unknown): data is AgentStatusChange {
  return (
    typeof data === 'object' &&
    data !== null &&
    'agentId' in data &&
    'from' in data &&
    'to' in data
  );
}

export function isTaskCompletedEvent(data: unknown): data is TaskEvent & { duration: number } {
  return (
    isTaskEvent(data) &&
    'duration' in data &&
    typeof (data as any).duration === 'number'
  );
}

export function isTaskFailedEvent(data: unknown): data is TaskEvent & { error: string } {
  return (
    isTaskEvent(data) &&
    'error' in data &&
    typeof (data as any).error === 'string'
  );
}

export function isSystemResourceUpdate(data: unknown): data is SystemResourceUpdate {
  return (
    typeof data === 'object' &&
    data !== null
  );
}

export function isSwarmMetricsUpdate(data: unknown): data is SwarmMetricsUpdate {
  return (
    typeof data === 'object' &&
    data !== null &&
    'metrics' in data
  );
}

export function isErrorEvent(data: unknown): data is ErrorEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'message' in data
  );
}

// Additional type guards for swarm types
export function isSwarmTaskEvent(data: unknown): data is TaskEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'taskId' in data &&
    'agentId' in data &&
    typeof (data as any).taskId === 'string'
  );
}

export function isResourceRequest(data: unknown): data is ResourceRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'agentId' in data &&
    'requirements' in data
  );
}

export function isResourceRelease(data: unknown): data is ResourceRelease {
  return (
    typeof data === 'object' &&
    data !== null &&
    'allocationId' in data
  );
}

export function isResourceUsageUpdate(data: unknown): data is ResourceUsageUpdate {
  return (
    typeof data === 'object' &&
    data !== null &&
    'resourceId' in data &&
    'usage' in data
  );
}

export function isResourceFailure(data: unknown): data is ResourceFailure {
  return (
    typeof data === 'object' &&
    data !== null &&
    'resourceId' in data &&
    'type' in data
  );
}

export function isScalingTrigger(data: unknown): data is ScalingTrigger {
  return (
    typeof data === 'object' &&
    data !== null &&
    'action' in data
  );
}

