/**
 * Coordination system exports
 */

// Advanced scheduling,
export {
	AdvancedTaskScheduler,
	AffinitySchedulingStrategy,
	CapabilitySchedulingStrategy,
	LeastLoadedSchedulingStrategy,
	RoundRobinSchedulingStrategy,
	type SchedulingContext,
	type SchedulingStrategy,
} from "./advanced-scheduler.js";
// Circuit breakers,
export {
	CircuitBreaker,
	type CircuitBreakerConfig,
	CircuitBreakerManager,
	type CircuitBreakerMetrics,
	CircuitState,
} from "./circuit-breaker.js";
// Conflict resolution,
export {
	type ConflictResolution,
	type ConflictResolutionStrategy,
	ConflictResolver,
	OptimisticLockManager,
	PriorityResolutionStrategy,
	type ResourceConflict,
	type TaskConflict,
	TimestampResolutionStrategy,
	VotingResolutionStrategy,
} from "./conflict-resolution.js";
// Dependency management,
export {
	DependencyGraph,
	type DependencyNode,
	type DependencyPath,
} from "./dependency-graph.js";
// Core coordination components,
export { CoordinationManager, type ICoordinationManager } from "./manager.js";
export { MessageRouter } from "./messaging.js";
// Metrics and monitoring,
export {
	type CoordinationMetrics,
	CoordinationMetricsCollector,
	type MetricsSample,
} from "./metrics.js";
export { ResourceManager } from "./resources.js";
export { TaskScheduler } from "./scheduler.js";
// Work stealing,
export {
	type AgentWorkload,
	type WorkStealingConfig,
	WorkStealingCoordinator,
} from "./work-stealing.js";
