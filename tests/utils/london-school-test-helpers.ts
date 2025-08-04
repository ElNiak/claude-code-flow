/**
 * TDD London School Test Helpers
 * Mock factories and utilities for consistent mock-driven testing
 */

import { jest } from '@jest/globals';

// Core interfaces for mock creation
export interface IMemoryMonitor {
  getCurrentUsage(): MemoryUsage;
  isMemoryPressureHigh(): boolean;
  getMemoryPressureLevel(): number;
  onMemoryPressure(callback: (level: number) => void): void;
}

export interface ICircuitBreaker {
  execute<T>(operation: () => T): T | null;
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  getFailureCount(): number;
  reset(): void;
}

export interface IDebugLogger {
  debug(category: string, message: string, data?: any, correlationId?: string): void;
  info(category: string, message: string, data?: any, correlationId?: string): void;
  warn(category: string, message: string, data?: any, correlationId?: string): void;
  error(category: string, message: string, data?: any, correlationId?: string): void;
  isEnabled(category: string): boolean;
  setEnabled(category: string, enabled: boolean): void;
}

export interface IPerformanceCounter {
  start(): number;
  end(): number;
  getOverheadPercentage(): number;
  measure<T>(operation: () => T): { result: T; duration: number; overhead: number };
}

export interface IObjectPool<T> {
  acquire(): T;
  release(item: T): void;
  size(): number;
  capacity(): number;
  clear(): void;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

export interface MockConfiguration {
  memoryPressureLevel?: number;
  circuitBreakerState?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  performanceOverhead?: number;
  objectPoolSize?: number;
}

// London School Mock Factory
export class LondonSchoolMockFactory {
  /**
   * Creates a memory monitor mock with realistic behavior
   */
  static createMemoryMonitorMock(config: MockConfiguration = {}): jest.Mocked<IMemoryMonitor> {
    const pressureLevel = config.memoryPressureLevel ?? 85; // Default to 85% usage

    return {
      getCurrentUsage: jest.fn<() => MemoryUsage>().mockReturnValue({
        heapUsed: Math.floor((pressureLevel / 100) * 50 * 1024 * 1024), // Scale to 50MB max
        heapTotal: 50 * 1024 * 1024, // 50MB total heap
        external: 2 * 1024 * 1024, // 2MB external
        arrayBuffers: 1 * 1024 * 1024, // 1MB array buffers
        timestamp: Date.now(),
      }),
      isMemoryPressureHigh: jest.fn<() => boolean>().mockReturnValue(pressureLevel > 95),
      getMemoryPressureLevel: jest.fn<() => number>().mockReturnValue(pressureLevel),
      onMemoryPressure: jest.fn<(callback: (level: number) => void) => void>(),
    };
  }

  /**
   * Creates a circuit breaker mock with configurable state
   */
  static createCircuitBreakerMock(config: MockConfiguration = {}): jest.Mocked<ICircuitBreaker> {
    const state = config.circuitBreakerState ?? 'CLOSED';
    let failureCount = 0;

    return {
      execute: jest.fn<(operation: () => any) => any>().mockImplementation((operation) => {
        if (state === 'OPEN') {
          return null; // Circuit breaker is open
        }
        try {
          return operation();
        } catch (error) {
          failureCount++;
          throw error;
        }
      }),
      getState: jest.fn<() => 'CLOSED' | 'OPEN' | 'HALF_OPEN'>().mockReturnValue(state),
      getFailureCount: jest.fn<() => number>().mockImplementation(() => failureCount),
      reset: jest.fn<() => void>().mockImplementation(() => {
        failureCount = 0;
      }),
    };
  }

  /**
   * Creates a debug logger mock with category management
   */
  static createDebugLoggerMock(): jest.Mocked<IDebugLogger> {
    return {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      isEnabled: jest.fn<(category: string) => boolean>().mockReturnValue(true),
      setEnabled: jest.fn(),
    };
  }

  /**
   * Creates a performance counter mock with realistic measurements
   */
  static createPerformanceCounterMock(
    config: MockConfiguration = {},
  ): jest.Mocked<IPerformanceCounter> {
    const overhead = config.performanceOverhead ?? 2.5; // Default 2.5% overhead
    let startTime = 0;

    return {
      start: jest.fn<() => number>().mockImplementation(() => {
        startTime = Date.now();
        return startTime;
      }),
      end: jest.fn<() => number>().mockImplementation(() => {
        return Date.now();
      }),
      getOverheadPercentage: jest.fn<() => number>().mockReturnValue(overhead),
      measure: jest.fn<(operation: () => any) => any>().mockImplementation((operation) => {
        const start = Date.now();
        const result = operation();
        const end = Date.now();
        const duration = end - start;
        return {
          result,
          duration,
          overhead: overhead,
        };
      }),
    };
  }

  /**
   * Creates an object pool mock with capacity management
   */
  static createObjectPoolMock<T>(config: MockConfiguration = {}): jest.Mocked<IObjectPool<T>> {
    const poolSize = config.objectPoolSize ?? 10;
    let currentSize = 0;

    return {
      acquire: jest.fn<() => T>().mockImplementation(() => {
        currentSize = Math.max(0, currentSize - 1);
        return {} as T; // Mock object
      }),
      release: jest.fn<(item: T) => void>().mockImplementation(() => {
        currentSize = Math.min(poolSize, currentSize + 1);
      }),
      size: jest.fn<() => number>().mockImplementation(() => currentSize),
      capacity: jest.fn<() => number>().mockReturnValue(poolSize),
      clear: jest.fn<() => void>().mockImplementation(() => {
        currentSize = 0;
      }),
    };
  }

  /**
   * Creates a comprehensive mock suite for debug logging
   */
  static createDebugLoggingMockSuite(config: MockConfiguration = {}) {
    return {
      memoryMonitor: this.createMemoryMonitorMock(config),
      circuitBreaker: this.createCircuitBreakerMock(config),
      debugLogger: this.createDebugLoggerMock(),
      performanceCounter: this.createPerformanceCounterMock(config),
      objectPool: this.createObjectPoolMock(config),
    };
  }
}

// Interaction verification helpers
export class InteractionVerifier {
  /**
   * Verifies that mocks were called in the expected order
   */
  static verifyCallOrder(mocks: jest.Mock[], expectedOrder: string[]) {
    const allCalls = mocks
      .flatMap((mock, mockIndex) =>
        mock.mock.invocationCallOrder.map((callOrder) => ({
          mockIndex,
          callOrder,
          mockName: expectedOrder[mockIndex],
        })),
      )
      .sort((a, b) => a.callOrder - b.callOrder);

    const actualOrder = allCalls.map((call) => call.mockName);

    expect(actualOrder).toEqual(expectedOrder);
  }

  /**
   * Verifies that a mock was called before another mock
   */
  static verifyCalledBefore(firstMock: jest.Mock, secondMock: jest.Mock) {
    const firstCalls = firstMock.mock.invocationCallOrder;
    const secondCalls = secondMock.mock.invocationCallOrder;

    if (firstCalls.length === 0) {
      throw new Error('First mock was never called');
    }

    if (secondCalls.length === 0) {
      throw new Error('Second mock was never called');
    }

    const lastFirstCall = Math.max(...firstCalls);
    const firstSecondCall = Math.min(...secondCalls);

    expect(lastFirstCall).toBeLessThan(firstSecondCall);
  }

  /**
   * Verifies interaction patterns for memory-constrained scenarios
   */
  static verifyMemoryConstrainedInteractions(
    memoryMonitor: jest.Mocked<IMemoryMonitor>,
    circuitBreaker: jest.Mocked<ICircuitBreaker>,
    debugLogger: jest.Mocked<IDebugLogger>,
  ) {
    // Memory should be checked first
    expect(memoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();

    // If memory pressure is high, circuit breaker should not be called
    if (memoryMonitor.isMemoryPressureHigh.mock.results[0]?.value === true) {
      expect(circuitBreaker.execute).not.toHaveBeenCalled();
      expect(debugLogger.debug).not.toHaveBeenCalled();
    } else {
      // If memory is OK, circuit breaker should be used
      expect(circuitBreaker.execute).toHaveBeenCalled();
    }
  }
}

// Memory pressure simulation helpers
export class MemoryPressureSimulator {
  /**
   * Simulates gradual memory pressure increase
   */
  static simulateGradualPressureIncrease(
    memoryMonitor: jest.Mocked<IMemoryMonitor>,
    startLevel: number = 80,
    endLevel: number = 98,
    steps: number = 5,
  ) {
    const stepSize = (endLevel - startLevel) / steps;
    let currentStep = 0;

    memoryMonitor.getMemoryPressureLevel.mockImplementation(() => {
      const level = startLevel + currentStep * stepSize;
      currentStep = Math.min(currentStep + 1, steps);
      return level;
    });

    memoryMonitor.isMemoryPressureHigh.mockImplementation(() => {
      return memoryMonitor.getMemoryPressureLevel() > 95;
    });

    memoryMonitor.getCurrentUsage.mockImplementation(() => {
      const level = memoryMonitor.getMemoryPressureLevel();
      return {
        heapUsed: Math.floor((level / 100) * 50 * 1024 * 1024),
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      };
    });
  }

  /**
   * Simulates memory pressure spikes
   */
  static simulateMemorySpikes(memoryMonitor: jest.Mocked<IMemoryMonitor>, spikeLevels: number[]) {
    let spikeIndex = 0;

    memoryMonitor.getMemoryPressureLevel.mockImplementation(() => {
      const level = spikeLevels[spikeIndex % spikeLevels.length];
      spikeIndex++;
      return level;
    });

    memoryMonitor.isMemoryPressureHigh.mockImplementation(() => {
      return memoryMonitor.getMemoryPressureLevel() > 95;
    });
  }

  /**
   * Simulates extreme memory constraint (98%+ usage)
   */
  static simulateExtremeMemoryConstraint(
    memoryMonitor: jest.Mocked<IMemoryMonitor>,
    level: number = 98.96,
  ) {
    memoryMonitor.getMemoryPressureLevel.mockReturnValue(level);
    memoryMonitor.isMemoryPressureHigh.mockReturnValue(true);
    memoryMonitor.getCurrentUsage.mockReturnValue({
      heapUsed: Math.floor((level / 100) * 50 * 1024 * 1024),
      heapTotal: 50 * 1024 * 1024,
      external: 2 * 1024 * 1024,
      arrayBuffers: 1 * 1024 * 1024,
      timestamp: Date.now(),
    });

    // Simulate memory pressure callbacks
    memoryMonitor.onMemoryPressure.mockImplementation((callback) => {
      setTimeout(() => callback(level), 0);
    });
  }
}

// Performance testing helpers
export class PerformanceTestHelper {
  /**
   * Measures operation performance with mocked counters
   */
  static async measureWithMocks<T>(
    operation: () => T | Promise<T>,
    performanceCounter: jest.Mocked<IPerformanceCounter>,
  ): Promise<{ result: T; duration: number; overhead: number }> {
    performanceCounter.start();
    const result = await operation();
    performanceCounter.end();

    return {
      result,
      duration: 10, // Mocked duration
      overhead: performanceCounter.getOverheadPercentage(),
    };
  }

  /**
   * Verifies performance constraints through mocked measurements
   */
  static verifyPerformanceConstraints(
    performanceCounter: jest.Mocked<IPerformanceCounter>,
    maxOverheadPercent: number = 5,
  ) {
    const overhead = performanceCounter.getOverheadPercentage();
    expect(overhead).toBeLessThan(maxOverheadPercent);
    expect(performanceCounter.start).toHaveBeenCalled();
    expect(performanceCounter.end).toHaveBeenCalled();
  }

  /**
   * Simulates throughput testing with mocked measurements
   */
  static simulateThroughputTest(
    targetThroughput: number,
    performanceCounter: jest.Mocked<IPerformanceCounter>,
  ) {
    const operationsPerSecond = targetThroughput;
    const durationMs = 1000 / operationsPerSecond;

    performanceCounter.measure.mockImplementation((operation) => {
      const result = operation();
      return {
        result,
        duration: durationMs,
        overhead: performanceCounter.getOverheadPercentage(),
      };
    });

    return {
      expectedThroughput: operationsPerSecond,
      measuredDuration: durationMs,
    };
  }
}

// Contract testing utilities
export class ContractTestHelper {
  /**
   * Verifies that an implementation satisfies the IDebugLogger contract
   */
  static verifyDebugLoggerContract(implementation: IDebugLogger) {
    expect(typeof implementation.debug).toBe('function');
    expect(typeof implementation.info).toBe('function');
    expect(typeof implementation.warn).toBe('function');
    expect(typeof implementation.error).toBe('function');
    expect(typeof implementation.isEnabled).toBe('function');
    expect(typeof implementation.setEnabled).toBe('function');

    // Verify methods don't throw with valid inputs
    expect(() => implementation.debug('test', 'message')).not.toThrow();
    expect(() => implementation.setEnabled('test', true)).not.toThrow();
    expect(typeof implementation.isEnabled('test')).toBe('boolean');
  }

  /**
   * Verifies that an implementation satisfies the IMemoryMonitor contract
   */
  static verifyMemoryMonitorContract(implementation: IMemoryMonitor) {
    expect(typeof implementation.getCurrentUsage).toBe('function');
    expect(typeof implementation.isMemoryPressureHigh).toBe('function');
    expect(typeof implementation.getMemoryPressureLevel).toBe('function');
    expect(typeof implementation.onMemoryPressure).toBe('function');

    const usage = implementation.getCurrentUsage();
    expect(typeof usage.heapUsed).toBe('number');
    expect(typeof usage.heapTotal).toBe('number');
    expect(typeof implementation.isMemoryPressureHigh()).toBe('boolean');
    expect(typeof implementation.getMemoryPressureLevel()).toBe('number');
  }

  /**
   * Verifies that an implementation satisfies the ICircuitBreaker contract
   */
  static verifyCircuitBreakerContract(implementation: ICircuitBreaker) {
    expect(typeof implementation.execute).toBe('function');
    expect(typeof implementation.getState).toBe('function');
    expect(typeof implementation.getFailureCount).toBe('function');
    expect(typeof implementation.reset).toBe('function');

    const state = implementation.getState();
    expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(state);
    expect(typeof implementation.getFailureCount()).toBe('number');
  }
}

// Mock data generators
export class MockDataGenerator {
  /**
   * Generates realistic console usage patterns for testing
   */
  static generateConsoleUsagePattern(fileCount: number = 333, callsPerFile: number = 33) {
    return Array.from({ length: fileCount }, (_, fileIndex) => ({
      filePath: `/src/module${fileIndex}.ts`,
      consoleUsage: {
        totalCalls: callsPerFile,
        byType: {
          log: Math.floor(callsPerFile * 0.4),
          debug: Math.floor(callsPerFile * 0.3),
          warn: Math.floor(callsPerFile * 0.2),
          error: Math.floor(callsPerFile * 0.1),
        },
        locations: Array.from({ length: callsPerFile }, (_, callIndex) => ({
          line: 10 + callIndex * 5,
          column: 8,
          type: ['log', 'debug', 'warn', 'error'][callIndex % 4],
          context: `console.${['log', 'debug', 'warn', 'error'][callIndex % 4]}("Message ${callIndex}");`,
        })),
      },
    }));
  }

  /**
   * Generates memory usage scenarios for testing
   */
  static generateMemoryScenarios() {
    return [
      { name: 'low-pressure', level: 70, isHigh: false },
      { name: 'medium-pressure', level: 85, isHigh: false },
      { name: 'high-pressure', level: 96, isHigh: true },
      { name: 'extreme-pressure', level: 98.96, isHigh: true },
      { name: 'critical-pressure', level: 99.5, isHigh: true },
    ];
  }

  /**
   * Generates performance test scenarios
   */
  static generatePerformanceScenarios() {
    return [
      { name: 'low-overhead', overhead: 1.5, acceptable: true },
      { name: 'medium-overhead', overhead: 3.8, acceptable: true },
      { name: 'high-overhead', overhead: 4.9, acceptable: true },
      { name: 'excessive-overhead', overhead: 7.2, acceptable: false },
      { name: 'extreme-overhead', overhead: 12.5, acceptable: false },
    ];
  }
}

// Jest custom matchers for London School testing
export const londonSchoolMatchers = {
  toHaveBeenCalledBefore(received: jest.Mock, expected: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;

    if (receivedCalls.length === 0) {
      return {
        message: () =>
          `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}, but it was never called`,
        pass: false,
      };
    }

    if (expectedCalls.length === 0) {
      return {
        message: () =>
          `Expected ${expected.getMockName()} to have been called after ${received.getMockName()}, but it was never called`,
        pass: false,
      };
    }

    const lastReceivedCall = Math.max(...receivedCalls);
    const firstExpectedCall = Math.min(...expectedCalls);
    const pass = lastReceivedCall < firstExpectedCall;

    return {
      message: () =>
        pass
          ? `Expected ${received.getMockName()} NOT to have been called before ${expected.getMockName()}`
          : `Expected ${received.getMockName()} to have been called before ${expected.getMockName()}`,
      pass,
    };
  },

  toSatisfyMemoryConstraints(received: any, maxMemoryMB: number) {
    const memoryUsage = received.getCurrentUsage ? received.getCurrentUsage() : received;
    const memoryUsageMB = memoryUsage.heapUsed / (1024 * 1024);
    const pass = memoryUsageMB <= maxMemoryMB;

    return {
      message: () =>
        pass
          ? `Expected memory usage ${memoryUsageMB.toFixed(2)}MB NOT to be within limit of ${maxMemoryMB}MB`
          : `Expected memory usage ${memoryUsageMB.toFixed(2)}MB to be within limit of ${maxMemoryMB}MB`,
      pass,
    };
  },

  toHavePerformanceOverhead(received: any, maxOverheadPercent: number) {
    const overhead = received.getOverheadPercentage ? received.getOverheadPercentage() : received;
    const pass = overhead <= maxOverheadPercent;

    return {
      message: () =>
        pass
          ? `Expected performance overhead ${overhead}% NOT to be within limit of ${maxOverheadPercent}%`
          : `Expected performance overhead ${overhead}% to be within limit of ${maxOverheadPercent}%`,
      pass,
    };
  },
};

// Type declarations for Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(expected: jest.Mock): R;
      toSatisfyMemoryConstraints(maxMemoryMB: number): R;
      toHavePerformanceOverhead(maxOverheadPercent: number): R;
    }
  }
}
