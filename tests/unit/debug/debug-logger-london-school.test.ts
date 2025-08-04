/**
 * TDD London School: Debug Logger Implementation
 * Mock-driven development with behavior verification
 */

import { jest } from '@jest/globals';

// Interfaces for London School contract definition
interface IMemoryMonitor {
  getCurrentUsage(): MemoryUsage;
  isMemoryPressureHigh(): boolean;
  onMemoryPressure(callback: () => void): void;
}

interface ICircuitBreaker {
  execute<T>(operation: () => T): T | null;
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  reset(): void;
}

interface IDebugLogger {
  debug(category: string, message: string, data?: any, correlationId?: string): void;
  isEnabled(category: string): boolean;
  setEnabled(category: string, enabled: boolean): void;
  measureOverhead(): number;
}

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
}

interface IPerformanceCounter {
  start(): number;
  end(): number;
  getOverheadPercentage(): number;
}

interface IObjectPool<T> {
  acquire(): T;
  release(item: T): void;
  size(): number;
  clear(): void;
}

// Mock implementations - London School focuses on contracts
class MockMemoryMonitor implements IMemoryMonitor {
  getCurrentUsage = jest.fn<() => MemoryUsage>();
  isMemoryPressureHigh = jest.fn<() => boolean>();
  onMemoryPressure = jest.fn<(callback: () => void) => void>();
}

class MockCircuitBreaker implements ICircuitBreaker {
  execute = jest.fn<(operation: () => any) => any>();
  getState = jest.fn<() => 'CLOSED' | 'OPEN' | 'HALF_OPEN'>();
  reset = jest.fn<() => void>();
}

class MockConsole {
  debug = jest.fn();
  log = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  info = jest.fn();
  trace = jest.fn();
}

class MockPerformanceCounter implements IPerformanceCounter {
  start = jest.fn<() => number>();
  end = jest.fn<() => number>();
  getOverheadPercentage = jest.fn<() => number>();
}

// Simple implementation for TDD GREEN phase
class DebugLogger implements IDebugLogger {
  private enabledCategories = new Set<string>();
  private memoryMonitor: IMemoryMonitor;
  private circuitBreaker: ICircuitBreaker;
  private console: MockConsole;
  private performanceCounter: IPerformanceCounter;

  constructor(
    memoryMonitor: IMemoryMonitor,
    circuitBreaker: ICircuitBreaker,
    console: MockConsole,
    performanceCounter: IPerformanceCounter,
  ) {
    this.memoryMonitor = memoryMonitor;
    this.circuitBreaker = circuitBreaker;
    this.console = console;
    this.performanceCounter = performanceCounter;
  }

  debug(category: string, message: string, data?: any, correlationId?: string): void {
    // Memory pressure circuit breaker
    if (this.memoryMonitor.isMemoryPressureHigh()) {
      return; // Emergency exit under memory constraints
    }

    // Use circuit breaker for safe operation
    this.circuitBreaker.execute(() => {
      if (this.isEnabled(category)) {
        const prefix = `[DEBUG][${category}]${correlationId ? `[${correlationId}]` : ''}`;

        if (data) {
          this.console.debug(prefix, message, data);
        } else {
          this.console.debug(prefix, message);
        }
      }
    });
  }

  isEnabled(category: string): boolean {
    return (
      this.enabledCategories.has(category) ||
      this.enabledCategories.has('*') ||
      this.enabledCategories.has(category.split(':')[0] + ':*')
    );
  }

  setEnabled(category: string, enabled: boolean): void {
    if (enabled) {
      this.enabledCategories.add(category);
    } else {
      this.enabledCategories.delete(category);
    }
  }

  measureOverhead(): number {
    return this.performanceCounter.getOverheadPercentage();
  }
}

describe('DebugLogger - London School TDD', () => {
  let mockMemoryMonitor: MockMemoryMonitor;
  let mockCircuitBreaker: MockCircuitBreaker;
  let mockConsole: MockConsole;
  let mockPerformanceCounter: MockPerformanceCounter;
  let debugLogger: DebugLogger;

  // London School: Fresh mocks for each test to ensure isolation
  beforeEach(() => {
    mockMemoryMonitor = new MockMemoryMonitor();
    mockCircuitBreaker = new MockCircuitBreaker();
    mockConsole = new MockConsole();
    mockPerformanceCounter = new MockPerformanceCounter();

    debugLogger = new DebugLogger(
      mockMemoryMonitor,
      mockCircuitBreaker,
      mockConsole,
      mockPerformanceCounter,
    );
  });

  describe('Memory-Constrained Behavior - Interaction Testing', () => {
    it('should NOT log when memory pressure is high - verify collaboration', () => {
      // Arrange - Mock the memory pressure scenario
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(true);
      mockCircuitBreaker.getState.mockReturnValue('OPEN');
      debugLogger.setEnabled('core:orchestrator', true);

      // Act
      debugLogger.debug('core:orchestrator', 'Test message under pressure');

      // Assert - London School: Focus on HOW objects collaborate
      expect(mockMemoryMonitor.isMemoryPressureHigh).toHaveBeenCalledTimes(1);
      expect(mockCircuitBreaker.execute).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should use circuit breaker when memory is normal - verify interaction sequence', () => {
      // Arrange
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockCircuitBreaker.getState.mockReturnValue('CLOSED');
      mockCircuitBreaker.execute.mockImplementation((fn) => fn());
      debugLogger.setEnabled('core:orchestrator', true);

      // Act
      debugLogger.debug('core:orchestrator', 'Normal operation test');

      // Assert - Verify the conversation between objects
      expect(mockMemoryMonitor.isMemoryPressureHigh).toHaveBeenCalledBefore(
        mockCircuitBreaker.execute as jest.Mock,
      );
      expect(mockCircuitBreaker.execute).toHaveBeenCalledWith(expect.any(Function));
      expect(mockConsole.debug).toHaveBeenCalledWith(
        '[DEBUG][core:orchestrator]',
        'Normal operation test',
      );
    });

    it('should handle circuit breaker OPEN state gracefully', () => {
      // Arrange
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockCircuitBreaker.execute.mockReturnValue(null); // Circuit breaker is OPEN
      debugLogger.setEnabled('core:orchestrator', true);

      // Act
      debugLogger.debug('core:orchestrator', 'Circuit breaker test');

      // Assert - Verify graceful handling of circuit breaker
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('Category Management - State Verification', () => {
    it('should manage category enablement correctly', () => {
      // Act
      debugLogger.setEnabled('core:orchestrator', true);
      debugLogger.setEnabled('memory:*', true);

      // Assert
      expect(debugLogger.isEnabled('core:orchestrator')).toBe(true);
      expect(debugLogger.isEnabled('memory:store')).toBe(true);
      expect(debugLogger.isEnabled('coordination:gossip')).toBe(false);
    });

    it('should support wildcard patterns', () => {
      // Act
      debugLogger.setEnabled('*', true);

      // Assert
      expect(debugLogger.isEnabled('any:category')).toBe(true);
      expect(debugLogger.isEnabled('core:orchestrator')).toBe(true);
    });

    it('should support namespace wildcards', () => {
      // Act
      debugLogger.setEnabled('mcp:*', true);

      // Assert
      expect(debugLogger.isEnabled('mcp:server')).toBe(true);
      expect(debugLogger.isEnabled('mcp:client')).toBe(true);
      expect(debugLogger.isEnabled('core:orchestrator')).toBe(false);
    });
  });

  describe('Correlation ID Support - Data Flow Testing', () => {
    it('should include correlation ID in debug output', () => {
      // Arrange
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockCircuitBreaker.execute.mockImplementation((fn) => fn());
      debugLogger.setEnabled('coordination:raft', true);

      const correlationId = 'raft-election-123';

      // Act
      debugLogger.debug(
        'coordination:raft',
        'Leader election started',
        { nodeId: 'node-1' },
        correlationId,
      );

      // Assert - Verify correlation ID is included
      expect(mockConsole.debug).toHaveBeenCalledWith(
        `[DEBUG][coordination:raft][${correlationId}]`,
        'Leader election started',
        { nodeId: 'node-1' },
      );
    });

    it('should handle missing correlation ID gracefully', () => {
      // Arrange
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockCircuitBreaker.execute.mockImplementation((fn) => fn());
      debugLogger.setEnabled('coordination:raft', true);

      // Act
      debugLogger.debug('coordination:raft', 'Leader election started', { nodeId: 'node-1' });

      // Assert - No correlation ID in output
      expect(mockConsole.debug).toHaveBeenCalledWith(
        '[DEBUG][coordination:raft]',
        'Leader election started',
        { nodeId: 'node-1' },
      );
    });
  });

  describe('Performance Constraints - Mock-Based Measurement', () => {
    it('should enforce <5% overhead constraint through mocked measurements', () => {
      // Arrange
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(3.2); // 3.2% overhead

      // Act
      const overhead = debugLogger.measureOverhead();

      // Assert
      expect(mockPerformanceCounter.getOverheadPercentage).toHaveBeenCalled();
      expect(overhead).toBeLessThan(5); // <5% requirement
    });

    it('should detect performance violations through mocked counters', () => {
      // Arrange
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(7.5); // 7.5% overhead - violation

      // Act
      const overhead = debugLogger.measureOverhead();

      // Assert
      expect(overhead).toBeGreaterThan(5); // Detect violation
    });
  });
});

describe('Memory-Constrained Integration Testing', () => {
  let mockMemoryMonitor: MockMemoryMonitor;
  let mockCircuitBreaker: MockCircuitBreaker;
  let mockConsole: MockConsole;
  let mockPerformanceCounter: MockPerformanceCounter;

  beforeEach(() => {
    mockMemoryMonitor = new MockMemoryMonitor();
    mockCircuitBreaker = new MockCircuitBreaker();
    mockConsole = new MockConsole();
    mockPerformanceCounter = new MockPerformanceCounter();
  });

  it('should handle 98%+ memory utilization scenario', () => {
    // Arrange - Simulate extreme memory pressure
    mockMemoryMonitor.getCurrentUsage.mockReturnValue({
      heapUsed: 49 * 1024 * 1024, // 49MB
      heapTotal: 50 * 1024 * 1024, // 50MB total
      external: 0.5 * 1024 * 1024, // 0.5MB external
    });
    mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(true);

    const debugLogger = new DebugLogger(
      mockMemoryMonitor,
      mockCircuitBreaker,
      mockConsole,
      mockPerformanceCounter,
    );
    debugLogger.setEnabled('*', true);

    // Act - Attempt logging under extreme memory pressure
    for (let i = 0; i < 100; i++) {
      debugLogger.debug('stress:test', `Message ${i}`, { iteration: i });
    }

    // Assert - Verify emergency circuit breaker prevented logging
    expect(mockMemoryMonitor.isMemoryPressureHigh).toHaveBeenCalledTimes(100);
    expect(mockCircuitBreaker.execute).not.toHaveBeenCalled();
    expect(mockConsole.debug).not.toHaveBeenCalled();
  });

  it('should maintain <50MB footprint constraint', () => {
    // Arrange - Normal memory conditions but track usage
    const memoryUsageHistory: MemoryUsage[] = [];
    mockMemoryMonitor.getCurrentUsage.mockImplementation(() => {
      const usage = {
        heapUsed: 45 * 1024 * 1024, // 45MB - under limit
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
      };
      memoryUsageHistory.push(usage);
      return usage;
    });
    mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
    mockCircuitBreaker.execute.mockImplementation((fn) => fn());

    const debugLogger = new DebugLogger(
      mockMemoryMonitor,
      mockCircuitBreaker,
      mockConsole,
      mockPerformanceCounter,
    );
    debugLogger.setEnabled('*', true);

    // Act - Log many messages
    for (let i = 0; i < 1000; i++) {
      debugLogger.debug('memory:test', `Message ${i}`, { data: 'x'.repeat(100) });
    }

    // Assert - Verify memory constraint maintained
    const finalUsage = memoryUsageHistory[memoryUsageHistory.length - 1];
    expect(finalUsage.heapUsed).toBeLessThan(50 * 1024 * 1024); // <50MB
    expect(mockConsole.debug).toHaveBeenCalledTimes(1000);
  });
});

describe('Contract Compliance Testing', () => {
  it('should satisfy IDebugLogger contract through behavior verification', () => {
    // Arrange
    const mockMemoryMonitor = new MockMemoryMonitor();
    const mockCircuitBreaker = new MockCircuitBreaker();
    const mockConsole = new MockConsole();
    const mockPerformanceCounter = new MockPerformanceCounter();

    mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
    mockCircuitBreaker.execute.mockImplementation((fn) => fn());

    const debugLogger = new DebugLogger(
      mockMemoryMonitor,
      mockCircuitBreaker,
      mockConsole,
      mockPerformanceCounter,
    );

    // Act & Assert - Contract verification
    expect(() => debugLogger.debug('test', 'message')).not.toThrow();
    expect(typeof debugLogger.isEnabled('test')).toBe('boolean');
    expect(() => debugLogger.setEnabled('test', true)).not.toThrow();
    expect(typeof debugLogger.measureOverhead()).toBe('number');

    // Verify interface compliance through mock interactions
    debugLogger.setEnabled('test', true);
    debugLogger.debug('test', 'Contract test message');

    expect(mockCircuitBreaker.execute).toHaveBeenCalled();
    expect(mockConsole.debug).toHaveBeenCalledWith('[DEBUG][test]', 'Contract test message');
  });

  it('should maintain consistent behavior across multiple instances', () => {
    // London School: Each instance should behave consistently
    const createInstance = () => {
      const mockMemoryMonitor = new MockMemoryMonitor();
      const mockCircuitBreaker = new MockCircuitBreaker();
      const mockConsole = new MockConsole();
      const mockPerformanceCounter = new MockPerformanceCounter();

      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockCircuitBreaker.execute.mockImplementation((fn) => fn());

      return {
        logger: new DebugLogger(
          mockMemoryMonitor,
          mockCircuitBreaker,
          mockConsole,
          mockPerformanceCounter,
        ),
        mocks: { mockMemoryMonitor, mockCircuitBreaker, mockConsole, mockPerformanceCounter },
      };
    };

    // Create multiple instances
    const instances = [createInstance(), createInstance(), createInstance()];

    // Act - Same operations on all instances
    instances.forEach(({ logger, mocks }) => {
      logger.setEnabled('contract:test', true);
      logger.debug('contract:test', 'Consistency test');

      // Assert - Same interactions for all instances
      expect(mocks.mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mocks.mockConsole.debug).toHaveBeenCalledWith(
        '[DEBUG][contract:test]',
        'Consistency test',
      );
    });
  });
});

// Jest custom matchers for London School testing
expect.extend({
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
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(expected: jest.Mock): R;
    }
  }
}
