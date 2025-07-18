/**
 * Hook Coordinator
 *
 * Coordinates hook execution across multiple processes and prevents deadlocks
 * through intelligent scheduling and dependency management
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { HookExecutionQueue, HookProcessPool, HookType, executeHookSafely } from './hook-execution-manager.js';

interface HookDependency {
    hook: HookType;
    dependsOn: HookType[];
    blockedBy: HookType[];
    priority: 'low' | 'medium' | 'high';
}

interface CoordinationLock {
    lockId: string;
    processId: number;
    hookType: HookType;
    acquiredAt: number;
    expiresAt: number;
}

interface HookExecution {
    id: string;
    hookType: HookType;
    args: string[];
    processId: number;
    startTime: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    dependencies: string[];
}

/**
 * Process-Level Hook Coordinator
 * Prevents hook stampedes and manages cross-process coordination
 */
export class HookCoordinator extends EventEmitter {
    private lockDirectory: string;
    private coordLockFile: string;
    private executionQueue: HookExecutionQueue;
    private processPool: HookProcessPool;
    private activeLocks = new Map<string, CoordinationLock>();
    private pendingExecutions = new Map<string, HookExecution>();
    private dependencyGraph = new Map<HookType, HookDependency>();
    private maxConcurrentHooks = 3;
    private lockTimeout = 30000; // 30 seconds
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(options: { lockDirectory?: string; maxConcurrentHooks?: number } = {}) {
        super();

        this.lockDirectory = options.lockDirectory || path.join(process.cwd(), '.claude-flow', 'locks');
        this.coordLockFile = path.join(this.lockDirectory, 'coordination.lock');
        this.maxConcurrentHooks = options.maxConcurrentHooks || 3;

        this.executionQueue = new HookExecutionQueue();
        this.processPool = new HookProcessPool();

        this.initializeDependencyGraph();
        this.startCleanupProcess();
    }

    /**
     * Initialize hook dependency graph
     */
    private initializeDependencyGraph(): void {
        const dependencies: HookDependency[] = [
            {
                hook: 'pre-task',
                dependsOn: [],
                blockedBy: [],
                priority: 'high'
            },
            {
                hook: 'pre-edit',
                dependsOn: ['pre-task'],
                blockedBy: ['post-edit'],
                priority: 'high'
            },
            {
                hook: 'post-edit',
                dependsOn: ['pre-edit'],
                blockedBy: ['post-task'],
                priority: 'medium'
            },
            {
                hook: 'post-task',
                dependsOn: ['pre-task'],
                blockedBy: [],
                priority: 'medium'
            },
            {
                hook: 'pre-bash',
                dependsOn: [],
                blockedBy: [],
                priority: 'high'
            },
            {
                hook: 'pre-read',
                dependsOn: [],
                blockedBy: [],
                priority: 'low'
            },
            {
                hook: 'notify',
                dependsOn: [],
                blockedBy: [],
                priority: 'low'
            },
            {
                hook: 'session-restore',
                dependsOn: [],
                blockedBy: ['session-end'],
                priority: 'high'
            },
            {
                hook: 'session-end',
                dependsOn: ['session-restore'],
                blockedBy: [],
                priority: 'medium'
            }
        ];

        for (const dep of dependencies) {
            this.dependencyGraph.set(dep.hook, dep);
        }
    }

    /**
     * Coordinate hook execution with deadlock prevention
     */
    async coordinateHook(hookType: HookType, args: string[], options: { priority?: 'low' | 'medium' | 'high'; timeout?: number } = {}): Promise<any> {
        const executionId = this.generateExecutionId();
        const processId = process.pid;
        const priority = options.priority || this.getDependency(hookType)?.priority || 'medium';

        try {
            // Check for deadlock potential
            await this.checkDeadlockPotential(hookType, processId);

            // Acquire coordination lock
            const lockId = await this.acquireCoordinationLock(hookType, processId);

            // Create execution record
            const execution: HookExecution = {
                id: executionId,
                hookType,
                args,
                processId,
                startTime: Date.now(),
                status: 'pending',
                dependencies: this.getDependencyHooks(hookType)
            };

            this.pendingExecutions.set(executionId, execution);

            this.emit('hook_coordination_started', {
                executionId,
                hookType,
                processId,
                priority,
                dependencies: execution.dependencies
            });

            // Wait for dependencies to complete
            await this.waitForDependencies(execution);

            // Execute hook through queue
            execution.status = 'running';
            const result = await this.executionQueue.enqueue(hookType, args, priority);

            // Mark as completed
            execution.status = 'completed';
            this.pendingExecutions.delete(executionId);

            // Release coordination lock
            await this.releaseCoordinationLock(lockId);

            this.emit('hook_coordination_completed', {
                executionId,
                hookType,
                processId,
                duration: Date.now() - execution.startTime
            });

            return result;

        } catch (error) {
            // Mark as failed
            const execution = this.pendingExecutions.get(executionId);
            if (execution) {
                execution.status = 'failed';
                this.pendingExecutions.delete(executionId);
            }

            this.emit('hook_coordination_failed', {
                executionId,
                hookType,
                processId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw error;
        }
    }

    /**
     * Check for potential deadlock scenarios
     */
    private async checkDeadlockPotential(hookType: HookType, processId: number): Promise<void> {
        const dependency = this.getDependency(hookType);
        if (!dependency) return;

        // Check for circular dependencies
        const visited = new Set<HookType>();
        const recursionStack = new Set<HookType>();

        if (this.hasCyclicDependency(hookType, visited, recursionStack)) {
            throw new Error(`Circular dependency detected for hook ${hookType}`);
        }

        // Check for resource contention
        const runningHooks = Array.from(this.pendingExecutions.values())
            .filter(exec => exec.status === 'running' && exec.processId !== processId);

        if (runningHooks.length >= this.maxConcurrentHooks) {
            // Check if any running hooks are blocked by the requested hook
            const blockedHooks = runningHooks.filter(exec =>
                dependency.blockedBy.includes(exec.hookType)
            );

            if (blockedHooks.length > 0) {
                throw new Error(`Deadlock potential: ${hookType} would block running hooks ${blockedHooks.map(h => h.hookType).join(', ')}`);
            }
        }
    }

    /**
     * Check for cyclic dependencies
     */
    private hasCyclicDependency(hookType: HookType, visited: Set<HookType>, recursionStack: Set<HookType>): boolean {
        visited.add(hookType);
        recursionStack.add(hookType);

        const dependency = this.getDependency(hookType);
        if (dependency) {
            for (const depHook of dependency.dependsOn) {
                if (!visited.has(depHook)) {
                    if (this.hasCyclicDependency(depHook, visited, recursionStack)) {
                        return true;
                    }
                } else if (recursionStack.has(depHook)) {
                    return true;
                }
            }
        }

        recursionStack.delete(hookType);
        return false;
    }

    /**
     * Acquire coordination lock
     */
    private async acquireCoordinationLock(hookType: HookType, processId: number): Promise<string> {
        const lockId = `${hookType}-${processId}-${Date.now()}`;
        const lock: CoordinationLock = {
            lockId,
            processId,
            hookType,
            acquiredAt: Date.now(),
            expiresAt: Date.now() + this.lockTimeout
        };

        // Ensure lock directory exists
        await fs.mkdir(this.lockDirectory, { recursive: true });

        // Try to acquire lock
        const maxRetries = 10;
        const retryDelay = 500;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check if coordination lock file exists
                const coordLockExists = await this.fileExists(this.coordLockFile);

                if (coordLockExists) {
                    // Read existing lock
                    const existingLockData = await fs.readFile(this.coordLockFile, 'utf8');
                    const existingLock: CoordinationLock = JSON.parse(existingLockData);

                    // Check if lock is expired
                    if (existingLock.expiresAt < Date.now()) {
                        // Remove expired lock
                        await fs.unlink(this.coordLockFile);
                    } else {
                        // Lock is still valid, wait and retry
                        await this.delay(retryDelay * attempt);
                        continue;
                    }
                }

                // Create new lock
                await fs.writeFile(this.coordLockFile, JSON.stringify(lock), { flag: 'wx' });
                this.activeLocks.set(lockId, lock);

                this.emit('coordination_lock_acquired', { lockId, hookType, processId });
                return lockId;

            } catch (error) {
                if (attempt === maxRetries) {
                    throw new Error(`Failed to acquire coordination lock for ${hookType} after ${maxRetries} attempts`);
                }

                await this.delay(retryDelay * attempt);
            }
        }

        throw new Error(`Failed to acquire coordination lock for ${hookType}`);
    }

    /**
     * Release coordination lock
     */
    private async releaseCoordinationLock(lockId: string): Promise<void> {
        const lock = this.activeLocks.get(lockId);
        if (!lock) return;

        try {
            // Check if the lock file contains our lock
            const lockData = await fs.readFile(this.coordLockFile, 'utf8');
            const fileLock: CoordinationLock = JSON.parse(lockData);

            if (fileLock.lockId === lockId) {
                await fs.unlink(this.coordLockFile);
                this.emit('coordination_lock_released', { lockId, hookType: lock.hookType, processId: lock.processId });
            }
        } catch (error) {
            this.emit('coordination_lock_release_error', {
                lockId,
                error: error instanceof Error ? error.message : String(error)
            });
        }

        this.activeLocks.delete(lockId);
    }

    /**
     * Wait for hook dependencies to complete
     */
    private async waitForDependencies(execution: HookExecution): Promise<void> {
        const dependency = this.getDependency(execution.hookType);
        if (!dependency || dependency.dependsOn.length === 0) return;

        const maxWaitTime = 30000; // 30 seconds
        const checkInterval = 100; // 100ms
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const pendingDependencies = dependency.dependsOn.filter(depHook =>
                this.isHookRunning(depHook) && !this.isHookCompleted(depHook)
            );

            if (pendingDependencies.length === 0) {
                this.emit('hook_dependencies_satisfied', {
                    executionId: execution.id,
                    hookType: execution.hookType
                });
                return;
            }

            await this.delay(checkInterval);
        }

        throw new Error(`Timeout waiting for dependencies of ${execution.hookType}: ${dependency.dependsOn.join(', ')}`);
    }

    /**
     * Check if hook is running
     */
    private isHookRunning(hookType: HookType): boolean {
        return Array.from(this.pendingExecutions.values())
            .some(exec => exec.hookType === hookType && exec.status === 'running');
    }

    /**
     * Check if hook is completed
     */
    private isHookCompleted(hookType: HookType): boolean {
        return Array.from(this.pendingExecutions.values())
            .some(exec => exec.hookType === hookType && exec.status === 'completed');
    }

    /**
     * Get dependency hooks
     */
    private getDependencyHooks(hookType: HookType): string[] {
        const dependency = this.getDependency(hookType);
        return dependency ? dependency.dependsOn : [];
    }

    /**
     * Get dependency information
     */
    private getDependency(hookType: HookType): HookDependency | undefined {
        return this.dependencyGraph.get(hookType);
    }

    /**
     * Start cleanup process for expired locks and executions
     */
    private startCleanupProcess(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredLocks();
            this.cleanupStaleExecutions();
        }, 10000); // Every 10 seconds
    }

    /**
     * Clean up expired locks
     */
    private async cleanupExpiredLocks(): Promise<void> {
        const now = Date.now();
        const expiredLocks = Array.from(this.activeLocks.entries())
            .filter(([_, lock]) => lock.expiresAt < now);

        for (const [lockId, lock] of expiredLocks) {
            await this.releaseCoordinationLock(lockId);
            this.emit('expired_lock_cleaned', { lockId, hookType: lock.hookType });
        }
    }

    /**
     * Clean up stale executions
     */
    private cleanupStaleExecutions(): void {
        const now = Date.now();
        const staleTimeout = 300000; // 5 minutes

        const staleExecutions = Array.from(this.pendingExecutions.entries())
            .filter(([_, exec]) => now - exec.startTime > staleTimeout);

        for (const [executionId, execution] of staleExecutions) {
            this.pendingExecutions.delete(executionId);
            this.emit('stale_execution_cleaned', { executionId, hookType: execution.hookType });
        }
    }

    /**
     * Emergency coordination reset
     */
    async emergencyReset(): Promise<void> {
        // Clear all active locks
        for (const lockId of this.activeLocks.keys()) {
            await this.releaseCoordinationLock(lockId);
        }

        // Clear pending executions
        this.pendingExecutions.clear();

        // Reset queue
        this.executionQueue.emergencyClear();

        // Shutdown and reinitialize process pool
        await this.processPool.shutdown();
        this.processPool = new HookProcessPool();

        this.emit('emergency_reset_completed');
    }

    /**
     * Get coordination status
     */
    getCoordinationStatus(): {
        activeLocks: number;
        pendingExecutions: number;
        queueStatus: any;
        poolStatus: any;
    } {
        return {
            activeLocks: this.activeLocks.size,
            pendingExecutions: this.pendingExecutions.size,
            queueStatus: this.executionQueue.getQueueStatus(),
            poolStatus: this.processPool.getPoolStatus()
        };
    }

    /**
     * Shutdown coordinator
     */
    async shutdown(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        await this.emergencyReset();
        await this.processPool.shutdown();

        this.emit('coordinator_shutdown');
    }

    /**
     * Utility methods
     */
    private generateExecutionId(): string {
        return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global coordinator instance
export const globalHookCoordinator = new HookCoordinator();

// Helper function for coordinated hook execution
export async function executeHookCoordinated(hookType: HookType, args: string[], options: { priority?: 'low' | 'medium' | 'high'; timeout?: number } = {}): Promise<any> {
    return globalHookCoordinator.coordinateHook(hookType, args, options);
}

// Export types
export type { HookDependency, CoordinationLock, HookExecution };
