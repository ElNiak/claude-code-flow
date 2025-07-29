/**
 * Shared types index - Central exports for types used across all commands
 * Only truly shared types that are used by multiple commands
 */

// Library compatibility
export * from "./compatibility.js";
// Core command interfaces
export * from "./core.js";
// Error handling types
export * from "./errors.js";
// Event system types
export * from "./events.js";
// Module utilities
export * from "./module-utils.js";
// Neural integration (shared across commands)
export * from "./neural.js";
// Utility types and functions (excluding CommandContext to avoid conflict)
export type {
	ArrayHelper,
	BaseCliOptions,
	ConfigImpact,
	CurrentState,
	GenerateId,
	GetErrorMessage,
	IterationHelper,
	MigratedConfig,
	ParsedParams,
	PathHelper,
	StringHelper,
} from "./utility.js";
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
} from "./utility.js";

// Environment and compatibility types are imported via .d.ts files
// These don't need to be re-exported: global.d.ts, node-compat.d.ts, vscode.d.ts

// Type guards for real-time monitor events (the only current dependency)
export {
	isAgentMetricsUpdate,
	isAgentStatusChange,
	isErrorEvent,
	isSwarmMetricsUpdate,
	isSystemResourceUpdate,
	isTaskCompletedEvent,
	isTaskEvent,
	isTaskFailedEvent,
} from "./events.js";
// Performance types
export * from "./performance.js";
// Progress types
export * from "./progress.js";
