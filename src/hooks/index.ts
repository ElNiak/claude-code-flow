/**
 * Hook System Index
 *
 * Exports all hook-related functionality with proper integration
 */

export type {
	CoordinationLock,
	HookDependency,
	HookExecution,
} from "./hook-coordinator.js";
// Hook coordination components
export {
	executeHookCoordinated,
	globalHookCoordinator,
	HookCoordinator,
} from "./hook-coordinator.js";
export type {
	HookExecutionResult,
	HookTask,
	HookType,
} from "./hook-execution-manager.js";
// Core hook execution components
export {
	executeHookSafely,
	globalHookQueue,
	globalProcessPool,
	HOOK_TIMEOUTS,
	HookExecutionQueue,
	HookProcessPool,
} from "./hook-execution-manager.js";
// Testing components
export {
	HookIntegrationTests,
	runHookIntegrationTests,
} from "./hook-integration-tests.js";
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
} from "./hook-wrapper.js";

import { globalHookCoordinator } from "./hook-coordinator.js";
import {
	globalHookQueue,
	globalProcessPool,
} from "./hook-execution-manager.js";
// Re-import for default export
import { hookWorkflow, hookWrapper } from "./hook-wrapper.js";

// Default export for easy importing
export default {
	wrapper: hookWrapper,
	workflow: hookWorkflow,
	queue: globalHookQueue,
	coordinator: globalHookCoordinator,
	processPool: globalProcessPool,
};
