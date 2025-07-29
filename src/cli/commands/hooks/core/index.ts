/**
 * Hook System Index
 *
 * Exports all hook-related functionality with proper integration
 */

export type {
	CoordinationLock,
	HookDependency,
	HookExecution,
} from "./coordinator.js";
// Hook coordination components
export {
	executeHookCoordinated,
	globalHookCoordinator,
	HookCoordinator,
} from "./coordinator.js";
export type {
	HookExecutionResult,
	HookTask,
	HookType,
} from "./execution-manager.js";
// Core hook execution components
export {
	executeHookSafely,
	globalHookQueue,
	globalProcessPool,
	HOOK_TIMEOUTS,
	HookExecutionQueue,
	HookProcessPool,
} from "./execution-manager.js";
// Testing components
export {
	HookIntegrationTests,
	runHookIntegrationTests,
} from "./integration-tests.js";
// Hook wrapper and workflow components
export {
	executeNotifyHook,
	executePostEditHook,
	executePostTaskHook,
	executePreBashHook,
	executePreEditHook,
	executePreReadHook,
	executePreTaskHook,
	executeSessionEndHook,
	executeSessionRestoreHook,
	HookWorkflow,
	HookWrapper,
	hookWorkflow,
	hookWrapper,
} from "./wrapper.js";

import { globalHookCoordinator } from "./coordinator.js";
import { globalHookQueue, globalProcessPool } from "./execution-manager.js";
// Re-import for default export
import { hookWorkflow, hookWrapper } from "./wrapper.js";

// Default export for easy importing
export default {
	wrapper: hookWrapper,
	workflow: hookWorkflow,
	queue: globalHookQueue,
	coordinator: globalHookCoordinator,
	processPool: globalProcessPool,
};
