/**
 * Hook Wrapper
 *
 * Provides a simplified interface for hook execution with automatic
 * deadlock prevention and coordination
 */

import { HookType } from './hook-execution-manager.js';
import { executeHookCoordinated } from './hook-coordinator.js';

/**
 * Safe hook execution wrapper
 * Automatically handles coordination and deadlock prevention
 */
export class HookWrapper {
    private static instance: HookWrapper;
    private enabled = true;
    private debugMode = false;

    constructor() {
        // Check environment variables
        this.enabled = process.env.CLAUDE_FLOW_HOOKS_ENABLED !== 'false';
        this.debugMode = process.env.CLAUDE_FLOW_HOOKS_DEBUG === 'true';
    }

    static getInstance(): HookWrapper {
        if (!HookWrapper.instance) {
            HookWrapper.instance = new HookWrapper();
        }
        return HookWrapper.instance;
    }

    /**
     * Execute pre-task hook
     */
    async preTask(description: string, options: { autoSpawnAgents?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args = [
            '--description', description,
            '--auto-spawn-agents', options.autoSpawnAgents ? 'true' : 'false'
        ];

        await this.executeHookSafely('pre-task', args, 'high');
    }

    /**
     * Execute post-edit hook
     */
    async postEdit(filePath: string, memoryKey?: string): Promise<void> {
        if (!this.enabled) return;

        const args = ['--file', filePath];
        if (memoryKey) {
            args.push('--memory-key', memoryKey);
        }

        await this.executeHookSafely('post-edit', args, 'medium');
    }

    /**
     * Execute post-task hook
     */
    async postTask(taskId: string, options: { analyzePerformance?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args = ['--task-id', taskId];
        if (options.analyzePerformance) {
            args.push('--analyze-performance', 'true');
        }

        await this.executeHookSafely('post-task', args, 'medium');
    }

    /**
     * Execute pre-bash hook
     */
    async preBash(command: string, options: { validateSafety?: boolean; prepareResources?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args = ['--command', command];
        if (options.validateSafety) {
            args.push('--validate-safety', 'true');
        }
        if (options.prepareResources) {
            args.push('--prepare-resources', 'true');
        }

        await this.executeHookSafely('pre-bash', args, 'high');
    }

    /**
     * Execute pre-edit hook
     */
    async preEdit(filePath: string, options: { autoAssignAgents?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args = ['--file', filePath];
        if (options.autoAssignAgents) {
            args.push('--auto-assign-agents', 'true');
        }

        await this.executeHookSafely('pre-edit', args, 'high');
    }

    /**
     * Execute pre-read hook
     */
    async preRead(filePath: string, options: { symbolsOverview?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args = ['--file', filePath];
        if (options.symbolsOverview) {
            args.push('--symbols-overview', 'true');
        }

        await this.executeHookSafely('pre-read', args, 'low');
    }

    /**
     * Execute notification hook
     */
    async notify(message: string, options: { telemetry?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args = ['--message', message];
        if (options.telemetry) {
            args.push('--telemetry', 'true');
        }

        await this.executeHookSafely('notify', args, 'low');
    }

    /**
     * Execute session restore hook
     */
    async sessionRestore(sessionId: string, options: { loadMemory?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args = ['--session-id', sessionId];
        if (options.loadMemory) {
            args.push('--load-memory', 'true');
        }

        await this.executeHookSafely('session-restore', args, 'high');
    }

    /**
     * Execute session end hook
     */
    async sessionEnd(options: { exportMetrics?: boolean; generateSummary?: boolean } = {}): Promise<void> {
        if (!this.enabled) return;

        const args: string[] = [];
        if (options.exportMetrics) {
            args.push('--export-metrics', 'true');
        }
        if (options.generateSummary) {
            args.push('--generate-summary', 'true');
        }

        await this.executeHookSafely('session-end', args, 'medium');
    }

    /**
     * Execute hook with coordination and error handling
     */
    private async executeHookSafely(hookType: HookType, args: string[], priority: 'low' | 'medium' | 'high'): Promise<void> {
        if (this.debugMode) {
            console.log(`[HookWrapper] Executing ${hookType} with args:`, args);
        }

        try {
            await executeHookCoordinated(hookType, args, { priority });

            if (this.debugMode) {
                console.log(`[HookWrapper] Successfully executed ${hookType}`);
            }
        } catch (error) {
            if (this.debugMode) {
                console.error(`[HookWrapper] Failed to execute ${hookType}:`, error);
            }

            // Don't throw in production to prevent breaking the main flow
            if (process.env.NODE_ENV === 'development') {
                throw error;
            }
        }
    }

    /**
     * Enable/disable hooks
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * Get hook status
     */
    getStatus(): { enabled: boolean; debugMode: boolean } {
        return {
            enabled: this.enabled,
            debugMode: this.debugMode
        };
    }
}

// Global instance
export const hookWrapper = HookWrapper.getInstance();

// Convenience functions for common hook patterns
export async function executePreTaskHook(description: string, options: { autoSpawnAgents?: boolean } = {}): Promise<void> {
    return hookWrapper.preTask(description, options);
}

export async function executePostEditHook(filePath: string, memoryKey?: string): Promise<void> {
    return hookWrapper.postEdit(filePath, memoryKey);
}

export async function executePostTaskHook(taskId: string, options: { analyzePerformance?: boolean } = {}): Promise<void> {
    return hookWrapper.postTask(taskId, options);
}

export async function executePreBashHook(command: string, options: { validateSafety?: boolean; prepareResources?: boolean } = {}): Promise<void> {
    return hookWrapper.preBash(command, options);
}

export async function executePreEditHook(filePath: string, options: { autoAssignAgents?: boolean } = {}): Promise<void> {
    return hookWrapper.preEdit(filePath, options);
}

export async function executePreReadHook(filePath: string, options: { symbolsOverview?: boolean } = {}): Promise<void> {
    return hookWrapper.preRead(filePath, options);
}

export async function executeNotifyHook(message: string, options: { telemetry?: boolean } = {}): Promise<void> {
    return hookWrapper.notify(message, options);
}

export async function executeSessionRestoreHook(sessionId: string, options: { loadMemory?: boolean } = {}): Promise<void> {
    return hookWrapper.sessionRestore(sessionId, options);
}

export async function executeSessionEndHook(options: { exportMetrics?: boolean; generateSummary?: boolean } = {}): Promise<void> {
    return hookWrapper.sessionEnd(options);
}

// Enhanced hook patterns for common workflows
export class HookWorkflow {
    private wrapper: HookWrapper;

    constructor() {
        this.wrapper = HookWrapper.getInstance();
    }

    /**
     * Task execution workflow
     */
    async executeTaskWorkflow(taskId: string, description: string, filePaths: string[]): Promise<void> {
        // Pre-task hook
        await this.wrapper.preTask(description, { autoSpawnAgents: true });

        // Pre-edit hooks for all files
        for (const filePath of filePaths) {
            await this.wrapper.preEdit(filePath, { autoAssignAgents: true });
        }

        // Post-edit hooks for all files
        for (const filePath of filePaths) {
            await this.wrapper.postEdit(filePath, `task/${taskId}/${path.basename(filePath)}`);
        }

        // Post-task hook
        await this.wrapper.postTask(taskId, { analyzePerformance: true });
    }

    /**
     * File operation workflow
     */
    async executeFileWorkflow(filePath: string, operation: 'read' | 'edit'): Promise<void> {
        if (operation === 'read') {
            await this.wrapper.preRead(filePath, { symbolsOverview: true });
        } else {
            await this.wrapper.preEdit(filePath, { autoAssignAgents: true });
            await this.wrapper.postEdit(filePath);
        }
    }

    /**
     * Session workflow
     */
    async executeSessionWorkflow(sessionId: string, action: 'start' | 'end'): Promise<void> {
        if (action === 'start') {
            await this.wrapper.sessionRestore(sessionId, { loadMemory: true });
        } else {
            await this.wrapper.sessionEnd({ exportMetrics: true, generateSummary: true });
        }
    }

    /**
     * Bash command workflow
     */
    async executeBashWorkflow(command: string): Promise<void> {
        await this.wrapper.preBash(command, { validateSafety: true, prepareResources: true });
    }
}

// Global workflow instance
export const hookWorkflow = new HookWorkflow();

// Import path for easier module resolution
import path from 'path';
