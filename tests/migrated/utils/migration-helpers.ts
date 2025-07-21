/**
 * Test Migration Utilities
 *
 * Helper functions and utilities for migrated tests
 * Created by: Test Migration Infrastructure Agent
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * Deno to Jest assertion compatibility layer
 */
export class MigrationAssertions {
    /**
     * assertEquals compatibility
     */
    static assertEquals<T>(actual: T, expected: T, msg?: string): void {
        expect(actual).toBe(expected);
    }

    /**
     * assertExists compatibility
     */
    static assertExists<T>(value: T, msg?: string): void {
        expect(value).toBeDefined();
        expect(value).not.toBeNull();
    }

    /**
     * assertRejects compatibility
     */
    static async assertRejects(
        promise: Promise<any>,
        ErrorClass?: any,
        msg?: string
    ): Promise<void> {
        if (ErrorClass) {
            await expect(promise).rejects.toThrow(ErrorClass);
        } else {
            await expect(promise).rejects.toThrow();
        }
    }

    /**
     * assertThrows compatibility
     */
    static assertThrows(fn: () => any, ErrorClass?: any, msg?: string): void {
        if (ErrorClass) {
            expect(fn).toThrow(ErrorClass);
        } else {
            expect(fn).toThrow();
        }
    }

    /**
     * assertStringIncludes compatibility
     */
    static assertStringIncludes(
        actual: string,
        expected: string,
        msg?: string
    ): void {
        expect(actual).toContain(expected);
    }

    /**
     * assertArrayIncludes compatibility
     */
    static assertArrayIncludes<T>(
        actual: T[],
        expected: T,
        msg?: string
    ): void {
        expect(actual).toContain(expected);
    }

    /**
     * assertObjectMatch compatibility
     */
    static assertObjectMatch(
        actual: Record<string, any>,
        expected: Record<string, any>,
        msg?: string
    ): void {
        expect(actual).toMatchObject(expected);
    }

    /**
     * assertInstanceOf compatibility
     */
    static assertInstanceOf<T>(
        actual: any,
        expectedType: new (...args: any[]) => T,
        msg?: string
    ): void {
        expect(actual).toBeInstanceOf(expectedType);
    }

    /**
     * assertNotEquals compatibility
     */
    static assertNotEquals<T>(actual: T, expected: T, msg?: string): void {
        expect(actual).not.toBe(expected);
    }

    /**
     * assertStrictEquals compatibility
     */
    static assertStrictEquals<T>(actual: T, expected: T, msg?: string): void {
        expect(actual).toStrictEqual(expected);
    }
}

/**
 * Test environment utilities for migrated tests
 */
export class MigrationTestEnv {
    private static cleanupFunctions: (() => void)[] = [];

    /**
     * Setup test environment
     */
    static setup(): void {
        beforeEach(() => {
            // Reset all mocks
            jest.clearAllMocks();
        });

        afterEach(() => {
            // Run cleanup functions
            this.cleanupFunctions.forEach(fn => fn());
            this.cleanupFunctions = [];
        });
    }

    /**
     * Register cleanup function
     */
    static addCleanup(fn: () => void): void {
        this.cleanupFunctions.push(fn);
    }

    /**
     * Create temporary test directory
     */
    static createTempDir(): string {
        const tempDir = require('fs').mkdtempSync(
            require('path').join(require('os').tmpdir(), 'claude-flow-test-')
        );

        this.addCleanup(() => {
            require('fs').rmSync(tempDir, { recursive: true, force: true });
        });

        return tempDir;
    }

    /**
     * Create test file
     */
    static createTestFile(filePath: string, content: string): string {
        const fullPath = require('path').resolve(filePath);
        require('fs').mkdirSync(require('path').dirname(fullPath), { recursive: true });
        require('fs').writeFileSync(fullPath, content);

        this.addCleanup(() => {
            if (require('fs').existsSync(fullPath)) {
                require('fs').unlinkSync(fullPath);
            }
        });

        return fullPath;
    }

    /**
     * Mock process environment
     */
    static mockEnv(env: Record<string, string>): void {
        const originalEnv = { ...process.env };

        Object.assign(process.env, env);

        this.addCleanup(() => {
            process.env = originalEnv;
        });
    }

    /**
     * Mock console methods
     */
    static mockConsole(): {
        log: jest.Mock;
        error: jest.Mock;
        warn: jest.Mock;
        info: jest.Mock;
    } {
        const mocks = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn()
        };

        const originalConsole = { ...console };

        Object.assign(console, mocks);

        this.addCleanup(() => {
            Object.assign(console, originalConsole);
        });

        return mocks;
    }
}

/**
 * Async test utilities
 */
export class AsyncTestUtils {
    /**
     * Wait for condition with timeout
     */
    static async waitFor(
        condition: () => boolean | Promise<boolean>,
        timeout = 5000,
        interval = 100
    ): Promise<void> {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            if (await condition()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }

    /**
     * Create deferred promise
     */
    static createDeferred<T>(): {
        promise: Promise<T>;
        resolve: (value: T) => void;
        reject: (error: any) => void;
    } {
        let resolve: (value: T) => void;
        let reject: (error: any) => void;

        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        return { promise, resolve: resolve!, reject: reject! };
    }

    /**
     * Delay execution
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Timeout promise
     */
    static timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
        });

        return Promise.race([promise, timeoutPromise]);
    }
}

/**
 * Mock factory for common test objects
 */
export class MockFactory {
    /**
     * Create mock agent profile
     */
    static createMockAgent(overrides: Partial<any> = {}) {
        return {
            id: 'test-agent-1',
            name: 'Test Agent',
            type: 'coordinator',
            capabilities: ['test-capability'],
            systemPrompt: 'Test prompt',
            maxConcurrentTasks: 5,
            priority: 10,
            environment: {},
            workingDirectory: '/tmp',
            shell: '/bin/bash',
            metadata: {},
            ...overrides
        };
    }

    /**
     * Create mock task
     */
    static createMockTask(overrides: Partial<any> = {}) {
        return {
            id: 'test-task-1',
            type: 'test',
            description: 'Test task',
            priority: 50,
            dependencies: [],
            status: 'pending',
            input: { test: true },
            createdAt: new Date(),
            metadata: {},
            ...overrides
        };
    }

    /**
     * Create mock configuration
     */
    static createMockConfig(overrides: Partial<any> = {}) {
        return {
            orchestrator: {
                maxConcurrentAgents: 10,
                taskQueueSize: 100,
                healthCheckInterval: 30000,
                shutdownTimeout: 30000
            },
            terminal: {
                type: 'native',
                poolSize: 5,
                recycleAfter: 10
            },
            memory: {
                backend: 'sqlite',
                cacheSizeMB: 10,
                sqlitePath: ':memory:'
            },
            coordination: {
                maxRetries: 3,
                retryDelay: 100
            },
            ...overrides
        };
    }

    /**
     * Create mock event bus
     */
    static createMockEventBus() {
        const listeners = new Map();

        return {
            on: jest.fn((event: string, listener: Function) => {
                if (!listeners.has(event)) {
                    listeners.set(event, []);
                }
                listeners.get(event).push(listener);
            }),
            off: jest.fn((event: string, listener: Function) => {
                if (listeners.has(event)) {
                    const eventListeners = listeners.get(event);
                    const index = eventListeners.indexOf(listener);
                    if (index !== -1) {
                        eventListeners.splice(index, 1);
                    }
                }
            }),
            emit: jest.fn((event: string, ...args: any[]) => {
                if (listeners.has(event)) {
                    listeners.get(event).forEach((listener: Function) => {
                        listener(...args);
                    });
                }
            }),
            removeAllListeners: jest.fn(() => {
                listeners.clear();
            })
        };
    }

    /**
     * Create mock logger
     */
    static createMockLogger() {
        return {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLevel: jest.fn(),
            createChild: jest.fn(() => MockFactory.createMockLogger())
        };
    }
}

/**
 * Test pattern utilities
 */
export class TestPatterns {
    /**
     * Test pattern for async operations
     */
    static async testAsyncOperation<T>(
        operation: () => Promise<T>,
        expectedResult?: T
    ): Promise<T> {
        const result = await operation();

        if (expectedResult !== undefined) {
            expect(result).toEqual(expectedResult);
        }

        return result;
    }

    /**
     * Test pattern for error handling
     */
    static async testErrorHandling(
        operation: () => Promise<any>,
        expectedError?: string | RegExp | any
    ): Promise<void> {
        if (expectedError) {
            await expect(operation()).rejects.toThrow(expectedError);
        } else {
            await expect(operation()).rejects.toThrow();
        }
    }

    /**
     * Test pattern for event emission
     */
    static testEventEmission(
        emitter: any,
        eventName: string,
        action: () => void | Promise<void>,
        expectedData?: any
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Event '${eventName}' was not emitted within timeout`));
            }, 5000);

            emitter.once(eventName, (data: any) => {
                clearTimeout(timeout);

                if (expectedData !== undefined) {
                    try {
                        expect(data).toEqual(expectedData);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    resolve();
                }
            });

            try {
                const result = action();
                if (result instanceof Promise) {
                    result.catch(reject);
                }
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
}

// Auto-setup migration environment
MigrationTestEnv.setup();

// Export compatibility layer for Deno assertions
export const {
    assertEquals,
    assertExists,
    assertRejects,
    assertThrows,
    assertStringIncludes,
    assertArrayIncludes,
    assertObjectMatch,
    assertInstanceOf,
    assertNotEquals,
    assertStrictEquals
} = MigrationAssertions;

// Export Jest globals for convenience
export {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    jest
};
