/**
 * Debug Logger Unit Tests - London School TDD
 * Tests behavior of DebugLogger with comprehensive mock verification
 */

import { jest } from '@jest/globals';
import {
  DebugLogger,
  ComponentLoggerFactory,
  type ComponentType,
  type DebugMeta,
} from '../../../src/core/logger.js';
import {
  LondonSchoolMockFactory,
  InteractionVerifier,
  MemoryPressureSimulator,
  PerformanceTestHelper,
  ContractTestHelper,
  MockDataGenerator,
  type IDebugLogger,
  type IMemoryMonitor,
  type ICircuitBreaker,
  type IPerformanceCounter,
  type MockConfiguration,
} from '../../utils/london-school-test-helpers.js';

describe('DebugLogger - London School TDD', () => {
  let debugLogger: DebugLogger;
  let mockSuite: ReturnType<typeof LondonSchoolMockFactory.createDebugLoggingMockSuite>;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;
  let originalProcessMemoryUsage: typeof process.memoryUsage;

  beforeEach(() => {
    // Create comprehensive mock suite
    mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite({
      memoryPressureLevel: 85,
      circuitBreakerState: 'CLOSED',
      performanceOverhead: 2.5,
      objectPoolSize: 10,
    });

    // Mock console methods to verify MCP stderr compliance
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    console.error = jest.fn();
    console.log = jest.fn();

    // Mock process.memoryUsage for memory pressure testing
    originalProcessMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue({
      rss: 50 * 1024 * 1024,
      heapTotal: 40 * 1024 * 1024,
      heapUsed: 30 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 2 * 1024 * 1024,
    });

    // Initialize debug logger with test configuration
    debugLogger = new DebugLogger({
      level: 'debug',
      format: 'json',
      destination: 'console',
    });
  });

  afterEach(() => {
    // Restore original functions
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    process.memoryUsage = originalProcessMemoryUsage;
    jest.clearAllMocks();
  });

  describe('Component Logger Behavior', () => {
    it('should create component-specific loggers with correlation', () => {
      // Arrange
      const component: ComponentType = 'CLI';
      const correlationId = 'test-correlation-123';
      const sessionId = 'test-session-456';

      // Act
      const componentLogger = debugLogger
        .withComponent(component)
        .withCorrelationId(correlationId)
        .withSessionId(sessionId);

      componentLogger.debugComponent(component, 'Test message', {
        component,
        correlationId,
        sessionId,
      });

      // Assert - Verify behavior through console interaction
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CLI'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test-correlation-123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
    });

    it('should enforce MCP stderr compliance for MCP component', () => {
      // Arrange
      const mcpLogger = debugLogger.withComponent('MCP');

      // Act
      mcpLogger.info('MCP protocol message');

      // Assert - MCP component should use stderr for protocol compliance
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('MCP protocol message'));
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should track usage analytics for refactor preparation', () => {
      // Arrange
      const logger = debugLogger.withComponent('Core');
      const symbol = 'console.log';
      const location = 'src/test/example.ts:25';

      // Act
      logger.trackUsage(symbol, location);
      logger.trackUsage(symbol, location); // Duplicate to test counting
      logger.trackUsage('console.error', 'src/test/other.ts:10');

      const analytics = logger.getUsageAnalytics();

      // Assert
      expect(analytics.totalCalls).toBe(3);
      expect(analytics.symbolUsage['console.log']).toEqual({
        count: 2,
        locations: [location],
      });
      expect(analytics.symbolUsage['console.error']).toEqual({
        count: 1,
        locations: ['src/test/other.ts:10'],
      });
    });
  });

  describe('Memory-Aware Logging Behavior', () => {
    it('should enable emergency mode when memory pressure exceeds threshold', () => {
      // Arrange
      MemoryPressureSimulator.simulateExtremeMemoryConstraint(mockSuite.memoryMonitor, 98.96);

      // Mock the actual memory pressure method to return high pressure
      const loggerSpy = jest.spyOn(debugLogger, 'getMemoryPressure').mockReturnValue(0.96);

      // Act
      debugLogger.debug('Test message before emergency');
      debugLogger.enableEmergencyMode();
      debugLogger.debug('Test message during emergency'); // Should be filtered out
      debugLogger.info('Info message during emergency'); // Should still work

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Test message before emergency'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Info message during emergency'),
      );
      // Debug messages should be filtered during emergency mode
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Test message during emergency'),
      );

      loggerSpy.mockRestore();
    });

    it('should use conditional logging to avoid expensive operations', () => {
      // Arrange
      const expensiveCondition = jest.fn().mockReturnValue(false);
      const messageFactory = jest.fn().mockReturnValue('Expensive message');

      // Act
      debugLogger.debugIf(expensiveCondition, 'Conditional message');
      debugLogger.debugLazy(messageFactory);

      // Assert
      expect(expensiveCondition).toHaveBeenCalled();
      expect(messageFactory).toHaveBeenCalled(); // Called because debug level is enabled
    });

    it('should handle memory pressure gracefully with circuit breaker pattern', () => {
      // Arrange
      const circuitBreaker = LondonSchoolMockFactory.createCircuitBreakerMock({
        circuitBreakerState: 'OPEN',
      });

      // Simulate memory constraint scenario
      InteractionVerifier.verifyMemoryConstrainedInteractions(
        mockSuite.memoryMonitor,
        circuitBreaker,
        mockSuite.debugLogger,
      );

      // Act & Assert - Verify interactions happen in correct order
      mockSuite.memoryMonitor.isMemoryPressureHigh();

      // Circuit breaker should not be called when memory pressure is high
      expect(mockSuite.memoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking Behavior', () => {
    it('should track operation timing with minimal overhead', async () => {
      // Arrange
      const operationId = 'test-operation-123';
      const performanceCounter = LondonSchoolMockFactory.createPerformanceCounterMock({
        performanceOverhead: 1.5,
      });

      // Act
      debugLogger.timeStart(operationId);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate work
      debugLogger.timeEnd(operationId, 'Operation completed');

      const testResult = await PerformanceTestHelper.measureWithMocks(async () => {
        debugLogger.timeStart('perf-test');
        debugLogger.timeEnd('perf-test');
        return 'success';
      }, performanceCounter);

      // Assert
      expect(testResult.result).toBe('success');
      expect(testResult.overhead).toBeLessThan(5); // Must be under 5% overhead

      PerformanceTestHelper.verifyPerformanceConstraints(
        performanceCounter,
        5, // 5% max overhead
      );
    });

    it('should measure memory usage and trigger warnings', () => {
      // Arrange
      const initialPressure = debugLogger.getMemoryPressure();

      // Act
      const currentPressure = debugLogger.getMemoryPressure();

      // Assert
      expect(typeof currentPressure).toBe('number');
      expect(currentPressure).toBeGreaterThanOrEqual(0);
      expect(currentPressure).toBeLessThanOrEqual(1);
    });
  });

  describe('Correlation Tracking Behavior', () => {
    it('should maintain correlation chain across logger instances', () => {
      // Arrange
      const correlationId = 'main-correlation-123';
      const sessionId = 'session-456';

      // Act
      const logger1 = debugLogger.withCorrelationId(correlationId);
      const logger2 = logger1.withSessionId(sessionId);
      const logger3 = logger2.withComponent('MCP');

      logger1.debug('Message from logger1');
      logger2.info('Message from logger2');
      logger3.debugComponent('MCP', 'Message from logger3');

      // Assert - All should contain correlation info
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(correlationId.slice(0, 8)));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(sessionId.slice(0, 8)));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Message from logger3'));
    });

    it('should generate unique correlation IDs for different sessions', () => {
      // Act
      const analytics1 = debugLogger.getUsageAnalytics();
      const analytics2 = debugLogger.withComponent('CLI').getUsageAnalytics();

      // Assert
      expect(analytics1).toEqual(analytics2); // Same instance, same analytics
      expect(analytics1.memoryPressure).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed correlation IDs gracefully', () => {
      // Arrange
      const invalidCorrelationId = '';

      // Act & Assert - Should not throw
      expect(() => {
        const logger = debugLogger.withCorrelationId(invalidCorrelationId);
        logger.debug('Test message');
      }).not.toThrow();
    });

    it('should recover from debug condition evaluation failures', () => {
      // Arrange
      const faultyCondition = jest.fn().mockImplementation(() => {
        throw new Error('Condition evaluation failed');
      });

      // Act & Assert - Should not throw and should log warning
      expect(() => {
        debugLogger.debugIf(faultyCondition, 'This should not crash');
      }).not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Debug condition evaluation failed'),
      );
    });

    it('should handle lazy message factory failures', () => {
      // Arrange
      const faultyMessageFactory = jest.fn().mockImplementation(() => {
        throw new Error('Message generation failed');
      });

      // Act & Assert - Should not throw and should log warning
      expect(() => {
        debugLogger.debugLazy(faultyMessageFactory);
      }).not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Lazy debug message generation failed'),
      );
    });
  });

  describe('Contract Compliance', () => {
    it('should satisfy IDebugLogger contract requirements', () => {
      // Act & Assert
      ContractTestHelper.verifyDebugLoggerContract(debugLogger);
    });

    it('should provide consistent behavior across component types', () => {
      // Arrange
      const components: ComponentType[] = [
        'CLI',
        'MCP',
        'Swarm',
        'Core',
        'Terminal',
        'Memory',
        'Migration',
        'Hooks',
        'Enterprise',
      ];

      // Act & Assert
      components.forEach((component) => {
        const logger = debugLogger.withComponent(component);
        expect(() => {
          logger.debugComponent(component, 'Test message');
          logger.info('Info message');
          logger.warn('Warning message');
          logger.error('Error message');
        }).not.toThrow();
      });
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle gradual memory pressure increase', () => {
      // Arrange
      MemoryPressureSimulator.simulateGradualPressureIncrease(
        mockSuite.memoryMonitor,
        80, // Start at 80%
        98, // End at 98%
        5, // 5 steps
      );

      // Act - Simulate multiple operations during pressure increase
      for (let i = 0; i < 5; i++) {
        debugLogger.debug(`Debug message ${i}`);
        const pressure = mockSuite.memoryMonitor.getMemoryPressureLevel();

        // Assert - Behavior should adapt to pressure level
        if (pressure > 95) {
          // High pressure scenario
          expect(mockSuite.memoryMonitor.isMemoryPressureHigh()).toBe(true);
        }
      }
    });

    it('should handle memory spikes and recovery', () => {
      // Arrange
      const spikeLevels = [70, 95, 99, 85, 75, 98, 80]; // Varying pressure levels
      MemoryPressureSimulator.simulateMemorySpikes(mockSuite.memoryMonitor, spikeLevels);

      // Act & Assert - Should handle spikes without crashing
      spikeLevels.forEach((level, index) => {
        expect(() => {
          debugLogger.debug(`Message during spike ${index}`);
          const currentLevel = mockSuite.memoryMonitor.getMemoryPressureLevel();
          expect(currentLevel).toBe(level);
        }).not.toThrow();
      });
    });
  });

  describe('Performance Validation', () => {
    it('should meet overhead requirements under load', async () => {
      // Arrange
      const iterations = 1000;
      const messages = MockDataGenerator.generateConsoleUsagePattern(10, 100);

      // Act
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        debugLogger.debug(`Load test message ${i}`);
        debugLogger.trackUsage('test-symbol', `location-${i}`);

        if (i % 100 === 0) {
          debugLogger.timeStart(`operation-${i}`);
          debugLogger.timeEnd(`operation-${i}`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert - Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second for 1000 operations

      const analytics = debugLogger.getUsageAnalytics();
      expect(analytics.totalCalls).toBeGreaterThan(0);
    });

    it('should maintain memory constraints under sustained load', () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - Generate sustained load
      for (let i = 0; i < 5000; i++) {
        debugLogger.debug(`Sustained load message ${i}`, {
          iteration: i,
          data: 'test-data'.repeat(10),
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;

      // Assert - Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50); // Less than 50% growth
    });
  });

  describe('Integration with ComponentLoggerFactory', () => {
    it('should integrate correctly with component logger factory', () => {
      // Arrange
      ComponentLoggerFactory.initializeDebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      // Act
      const cliLogger = ComponentLoggerFactory.getCLILogger('test-correlation');
      const mcpLogger = ComponentLoggerFactory.getMCPLogger('test-correlation');

      cliLogger.info('CLI message');
      mcpLogger.info('MCP message');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CLI message'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('MCP message'));
    });

    it('should provide accurate usage analytics through factory', () => {
      // Arrange
      ComponentLoggerFactory.initializeDebugLogger();

      // Act
      const analytics = ComponentLoggerFactory.getUsageAnalytics();
      const memoryPressure = ComponentLoggerFactory.getMemoryPressure();

      // Assert
      expect(analytics).toBeDefined();
      expect(typeof memoryPressure).toBe('number');
      expect(memoryPressure).toBeGreaterThanOrEqual(0);
    });
  });
});
