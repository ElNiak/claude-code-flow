/**
 * Hook System Index
 *
 * Exports all hook-related functionality with proper integration
 */

// Core hook execution components
export {
    HookExecutionQueue,
    HookProcessPool,
    HOOK_TIMEOUTS,
    globalHookQueue,
    globalProcessPool,
    executeHookSafely
} from './hook-execution-manager.js';

export type {
    HookType,
    HookTask,
    HookExecutionResult
} from './hook-execution-manager.js';

// Hook coordination components
export {
    HookCoordinator,
    globalHookCoordinator,
    executeHookCoordinated
} from './hook-coordinator.js';

export type {
    HookDependency,
    CoordinationLock,
    HookExecution
} from './hook-coordinator.js';

// Hook wrapper and workflow components
export {
    HookWrapper,
    HookWorkflow,
    hookWrapper,
    hookWorkflow,
    executePreTaskHook,
    executePostEditHook,
    executePostTaskHook,
    executePreBashHook,
    executePreEditHook,
    executePreReadHook,
    executeNotifyHook,
    executeSessionRestoreHook,
    executeSessionEndHook
} from './hook-wrapper.js';

// Testing components
export {
    HookIntegrationTests,
    runHookIntegrationTests
} from './hook-integration-tests.js';

// Re-import for default export
import { hookWrapper, hookWorkflow } from './hook-wrapper.js';
import { globalHookQueue, globalProcessPool } from './hook-execution-manager.js';
import { globalHookCoordinator } from './hook-coordinator.js';

// Default export for easy importing
export default {
    wrapper: hookWrapper,
    workflow: hookWorkflow,
    queue: globalHookQueue,
    coordinator: globalHookCoordinator,
    processPool: globalProcessPool
};
