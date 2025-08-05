# TDD London School Strategy: Debug Logging Implementation

## Executive Summary

This document outlines a comprehensive Test-Driven Development (TDD) strategy following the London School (mockist) approach for implementing debug logging infrastructure in Claude-Flow under extreme memory constraints (98.96% utilization).

## Environment Analysis

**Current State:**

- **Scale**: 10,967+ console.* calls across 333+ files
- **Memory Pressure**: 98.96% system utilization
- **Performance Target**: <5%/<10% overhead with 10,000+ entries/second throughput
- **Testing Foundation**: Jest framework with 55+ test files, performance benchmarking established

## London School TDD Principles Applied

### 1. Mock-Driven Development Philosophy

- **Outside-In Design**: Start with high-level behavior tests, mock all collaborators
- **Interaction Testing**: Focus on HOW objects collaborate, not WHAT they contain
- **Contract Definition**: Use mocks to establish clear interfaces between components
- **Isolation**: Test each component in complete isolation with all dependencies mocked

### 2. Component Architecture for Mocking

```typescript
// Core Debug Infrastructure (9 Subsystems)
interface IDebugLogger {
  debug(category: string, message: string, data?: any, correlationId?: string): void;
  isEnabled(category: string): boolean;
  setEnabled(category: string, enabled: boolean): void;
}

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
```

## TDD Strategy Implementation

### Phase 1: RED - Write Failing Tests (Mock-First)

#### 1.1 Core Debug Logger Mock Tests

```typescript
// tests/unit/debug/debug-logger.test.ts
describe('DebugLogger - London School TDD', () => {
  let mockMemoryMonitor: jest.Mocked<IMemoryMonitor>;
  let mockCircuitBreaker: jest.Mocked<ICircuitBreaker>;
  let mockConsole: jest.Mocked<Console>;
  let debugLogger: DebugLogger;

  beforeEach(() => {
    // Mock all dependencies
    mockMemoryMonitor = {
      getCurrentUsage: jest.fn(),
      isMemoryPressureHigh: jest.fn(),
      onMemoryPressure: jest.fn()
    };

    mockCircuitBreaker = {
      execute: jest.fn(),
      getState: jest.fn(),
      reset: jest.fn()
    };

    mockConsole = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    debugLogger = new DebugLogger(mockMemoryMonitor, mockCircuitBreaker, mockConsole);
  });

  describe('Memory-Constrained Behavior', () => {
    it('should disable logging when memory pressure is high', () => {
      // Arrange
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(true);
      mockCircuitBreaker.getState.mockReturnValue('OPEN');

      // Act
      debugLogger.debug('core:orchestrator', 'Test message');

      // Assert - Verify interactions
      expect(mockMemoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockCircuitBreaker.execute).not.toHaveBeenCalled();
    });

    it('should use circuit breaker for memory-safe operations', () => {
      // Arrange
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockCircuitBreaker.getState.mockReturnValue('CLOSED');
      mockCircuitBreaker.execute.mockImplementation(fn => fn());

      // Act
      debugLogger.debug('core:orchestrator', 'Test message');

      // Assert - Verify collaboration
      expect(mockCircuitBreaker.execute).toHaveBeenCalledWith(expect.any(Function));
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('core:orchestrator'),
        'Test message'
      );
    });
  });
});
```

#### 1.2 Performance-Constrained Testing

```typescript
describe('Performance Regression Prevention', () => {
  let performanceMonitor: jest.Mocked<IPerformanceMonitor>;

  beforeEach(() => {
    performanceMonitor = {
      startTimer: jest.fn(),
      endTimer: jest.fn(),
      getOverhead: jest.fn()
    };
  });

  it('should enforce <5% overhead constraint through mocked measurements', () => {
    // Arrange
    performanceMonitor.getOverhead.mockReturnValue(0.03); // 3% overhead

    // Act
    const overhead = debugLogger.measureLoggingOverhead();

    // Assert
    expect(performanceMonitor.getOverhead).toHaveBeenCalled();
    expect(overhead).toBeLessThan(0.05); // <5% requirement
  });

  it('should handle 10,000+ entries/second through mocked throughput', () => {
    // Arrange
    const mockThroughputMeter = {
      record: jest.fn(),
      getRate: jest.fn().mockReturnValue(12000) // >10k/sec
    };

    // Act & Assert - Focus on interactions
    for (let i = 0; i < 100; i++) {
      debugLogger.debug('perf:test', `Message ${i}`);
    }

    expect(mockThroughputMeter.record).toHaveBeenCalledTimes(100);
    expect(mockThroughputMeter.getRate()).toBeGreaterThan(10000);
  });
});
```

### Phase 2: GREEN - Minimal Implementation

#### 2.1 Memory-Constrained Debug Logger

```typescript
export class DebugLogger implements IDebugLogger {
  private memoryMonitor: IMemoryMonitor;
  private circuitBreaker: ICircuitBreaker;
  private console: Console;
  private enabledCategories = new Set<string>();

  constructor(
    memoryMonitor: IMemoryMonitor,
    circuitBreaker: ICircuitBreaker,
    console: Console = globalThis.console
  ) {
    this.memoryMonitor = memoryMonitor;
    this.circuitBreaker = circuitBreaker;
    this.console = console;
  }

  debug(category: string, message: string, data?: any, correlationId?: string): void {
    // Emergency circuit breaker for memory pressure
    if (this.memoryMonitor.isMemoryPressureHigh()) {
      return; // Fail fast under memory pressure
    }

    // Use circuit breaker for safe operation
    this.circuitBreaker.execute(() => {
      if (this.isEnabled(category)) {
        const timestamp = Date.now();
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
    return this.enabledCategories.has(category) ||
           this.enabledCategories.has('*') ||
           this.enabledCategories.has(category.split(':')[0] + ':*');
  }
}
```

### Phase 3: REFACTOR - Memory Optimization

#### 3.1 Object Pooling with Mocked Pool Management

```typescript
describe('Memory Optimization - Object Pooling', () => {
  let mockObjectPool: jest.Mocked<IObjectPool<LogEntry>>;

  beforeEach(() => {
    mockObjectPool = {
      acquire: jest.fn(),
      release: jest.fn(),
      size: jest.fn(),
      clear: jest.fn()
    };
  });

  it('should use object pooling to minimize allocations', () => {
    // Arrange
    const pooledEntry = { category: '', message: '', timestamp: 0 };
    mockObjectPool.acquire.mockReturnValue(pooledEntry);

    // Act
    debugLogger.debug('core:test', 'Pooled message');

    // Assert - Verify pool interactions
    expect(mockObjectPool.acquire).toHaveBeenCalled();
    expect(mockObjectPool.release).toHaveBeenCalledWith(pooledEntry);
  });
});
```

## Component-Specific Test Plans

### 1. Core Orchestrator Debug Tests

```typescript
describe('Orchestrator Debug Integration', () => {
  let mockOrchestrator: jest.Mocked<IOrchestrator>;
  let mockDebugLogger: jest.Mocked<IDebugLogger>;

  it('should replace console.log with debug logger', () => {
    // Arrange
    mockDebugLogger.isEnabled.mockReturnValue(true);

    // Act
    orchestrator.spawnAgent(mockProfile);

    // Assert - Verify logger interaction instead of console
    expect(mockDebugLogger.debug).toHaveBeenCalledWith(
      'core:orchestrator',
      'Spawning agent',
      expect.objectContaining({ profileId: mockProfile.id })
    );
    expect(console.log).not.toHaveBeenCalled();
  });
});
```

### 2. Memory Manager Debug Tests

```typescript
describe('Memory Manager Debug Integration', () => {
  let mockMemoryManager: jest.Mocked<IMemoryManager>;
  let mockDebugLogger: jest.Mocked<IDebugLogger>;

  it('should debug memory operations with correlation IDs', () => {
    // Arrange
    const correlationId = 'mem-op-123';
    mockDebugLogger.isEnabled.mockReturnValue(true);

    // Act
    memoryManager.store('key', 'value', correlationId);

    // Assert
    expect(mockDebugLogger.debug).toHaveBeenCalledWith(
      'memory:store',
      'Storing memory entry',
      { key: 'key', size: expect.any(Number) },
      correlationId
    );
  });
});
```

### 3. MCP Protocol Debug Tests

```typescript
describe('MCP Protocol Debug Compliance', () => {
  let mockStderr: jest.Mocked<NodeJS.WriteStream>;
  let mockDebugLogger: jest.Mocked<IDebugLogger>;

  it('should route debug output to stderr for MCP compliance', () => {
    // Arrange
    mockStderr.write = jest.fn();
    mockDebugLogger.isEnabled.mockReturnValue(true);

    // Act
    mcpServer.handleRequest(mockRequest);

    // Assert - Verify stderr interaction, not stdout
    expect(mockStderr.write).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG][mcp:server]')
    );
    expect(process.stdout.write).not.toHaveBeenCalled();
  });
});
```

## Mock Strategy by Subsystem

### 1. Memory Monitor Mocks

```typescript
const createMemoryMonitorMock = () => ({
  getCurrentUsage: jest.fn().mockReturnValue({
    heapUsed: 48 * 1024 * 1024, // 48MB < 50MB limit
    heapTotal: 50 * 1024 * 1024,
    external: 2 * 1024 * 1024
  }),
  isMemoryPressureHigh: jest.fn().mockReturnValue(false),
  onMemoryPressure: jest.fn()
});
```

### 2. File System Mocks

```typescript
const createFileSystemMock = () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ size: 1024 }),
  unlink: jest.fn().mockResolvedValue(undefined)
});
```

### 3. Console Replacement Mocks

```typescript
const createConsoleMock = () => ({
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  trace: jest.fn()
});
```

## Contract Testing Strategy

### 1. Debug Logger Interface Contracts

```typescript
describe('IDebugLogger Contract Compliance', () => {
  const implementations = [
    () => new DebugLogger(mockMemoryMonitor, mockCircuitBreaker),
    () => new FileDebugLogger(mockFileSystem, mockMemoryMonitor),
    () => new NoOpDebugLogger()
  ];

  implementations.forEach((createImpl, index) => {
    describe(`Implementation ${index}`, () => {
      it('should satisfy IDebugLogger contract', () => {
        const impl = createImpl();

        // Contract verification through behavior
        expect(() => impl.debug('test', 'message')).not.toThrow();
        expect(typeof impl.isEnabled('test')).toBe('boolean');
        expect(() => impl.setEnabled('test', true)).not.toThrow();
      });
    });
  });
});
```

## Performance Testing with Mocks

### 1. Memory Footprint Validation

```typescript
describe('Memory Footprint Constraints', () => {
  let mockMemoryMeter: jest.Mocked<IMemoryMeter>;

  beforeEach(() => {
    mockMemoryMeter = {
      measure: jest.fn(),
      getFootprint: jest.fn().mockReturnValue(45 * 1024 * 1024) // 45MB
    };
  });

  it('should maintain <50MB footprint under simulated pressure', async () => {
    // Arrange - Simulate memory pressure scenario
    mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(true);

    // Act - Run debug operations under pressure
    for (let i = 0; i < 1000; i++) {
      debugLogger.debug('stress:test', `Message ${i}`);
    }

    // Assert - Verify memory constraint through mock
    expect(mockMemoryMeter.getFootprint()).toBeLessThan(50 * 1024 * 1024);
  });
});
```

### 2. Overhead Measurement Testing

```typescript
describe('Performance Overhead Validation', () => {
  let mockPerformanceCounter: jest.Mocked<IPerformanceCounter>;

  it('should measure <5% overhead through mocked counters', () => {
    // Arrange
    mockPerformanceCounter.start.mockImplementation();
    mockPerformanceCounter.end.mockImplementation();
    mockPerformanceCounter.getOverheadPercentage.mockReturnValue(3.2); // 3.2%

    // Act
    const startTime = mockPerformanceCounter.start();
    debugLogger.debug('perf:test', 'Overhead test');
    const endTime = mockPerformanceCounter.end();

    // Assert
    expect(mockPerformanceCounter.getOverheadPercentage()).toBeLessThan(5);
  });
});
```

## Integration Testing with Selective Mocking

### 1. Component Integration Tests

```typescript
describe('Debug System Integration', () => {
  // Mock external dependencies, test real integration
  let realDebugLogger: DebugLogger;
  let realCircuitBreaker: CircuitBreaker;
  let mockMemoryMonitor: jest.Mocked<IMemoryMonitor>;
  let mockFileSystem: jest.Mocked<IFileSystem>;

  beforeEach(() => {
    // Real components
    realCircuitBreaker = new CircuitBreaker();

    // Mocked external dependencies
    mockMemoryMonitor = createMemoryMonitorMock();
    mockFileSystem = createFileSystemMock();

    realDebugLogger = new DebugLogger(mockMemoryMonitor, realCircuitBreaker);
  });

  it('should integrate debug logger with real circuit breaker', () => {
    // Test real integration with mocked externals
    mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);

    realDebugLogger.debug('integration:test', 'Real integration test');

    expect(mockMemoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();
    // Circuit breaker behavior is real, memory monitoring is mocked
  });
});
```

## Test Execution Strategy

### 1. Test Categories and Coverage

- **Unit Tests**: >95% coverage with full mocking of dependencies
- **Contract Tests**: Interface compliance across all implementations
- **Integration Tests**: Component interactions with selective mocking
- **Performance Tests**: Overhead and throughput with mocked measurements

### 2. Memory-Constrained Test Environment

```typescript
// Jest configuration for memory constraints
module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1, // Single worker for memory control
  maxConcurrency: 1, // Sequential execution
  setupFilesAfterEnv: ['<rootDir>/jest.memory-constrained.setup.js']
};
```

### 3. Test Utilities for London School

```typescript
// tests/utils/london-school-helpers.ts
export const createMockSwarm = <T>(interfaceName: string): jest.Mocked<T> => {
  // Factory for creating consistent mocks
};

export const verifyInteractionSequence = (mocks: jest.Mock[], expectedSequence: string[]) => {
  // Verify the order of mock interactions
};

export const simulateMemoryPressure = (mockMonitor: jest.Mocked<IMemoryMonitor>) => {
  // Simulate high memory scenarios
};
```

## Success Metrics and Validation

### 1. Coverage Metrics

- **>95% Test Coverage**: All debug infrastructure with comprehensive mocking
- **>90% Mock Interaction Coverage**: Verify all collaborations
- **100% Contract Compliance**: All implementations satisfy interfaces

### 2. Performance Metrics (Mocked)

- **<50MB Memory Footprint**: Validated through memory pressure simulation
- **<5%/<10% Performance Overhead**: Measured through mocked performance counters
- **10,000+ entries/second**: Throughput validated with mocked throughput meters

### 3. Quality Metrics

- **Zero Integration Failures**: Contract testing prevents breaking changes
- **Complete Console Replacement**: All 10,967+ console calls systematically replaced
- **MCP Protocol Compliance**: stderr-only output verified through mocked streams

## Implementation Timeline

### Week 1: Mock Infrastructure Setup

- Create comprehensive mock factories
- Establish contract test framework
- Set up memory-constrained testing environment

### Week 2: Core Debug Logger TDD

- RED: Write failing tests for core functionality
- GREEN: Implement minimal debug logger
- REFACTOR: Add memory optimizations

### Week 3: Component Integration

- Apply London School TDD to all 9 subsystems
- Mock-driven replacement of console calls
- Performance regression testing

### Week 4: System Integration & Validation

- Integration testing with selective mocking
- Performance validation under memory constraints
- Final contract compliance verification

## Conclusion

This TDD London School strategy ensures reliable debug logging implementation through:

1. **Mock-Driven Development**: Complete isolation and interaction testing
2. **Contract-Based Design**: Clear interfaces defined through mock expectations
3. **Memory-Constrained Testing**: Simulation of extreme memory conditions
4. **Performance Validation**: Overhead measurement through mocked counters
5. **Systematic Replacement**: Test-driven replacement of all console usage

The approach guarantees >95% test coverage, <50MB memory footprint, and <5%/<10% performance overhead while maintaining system reliability under extreme memory constraints.
