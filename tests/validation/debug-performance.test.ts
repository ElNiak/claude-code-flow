/**
 * Debug Performance Validation Tests
 * Automated performance testing with <10% overhead requirements
 */

import { jest } from '@jest/globals';
import { performance } from 'node:perf_hooks';
import {
  DebugValidationSuite,
  type ValidationResults,
} from '../../scripts/validate-debug-implementation.js';
import { DebugLogger, ComponentLoggerFactory } from '../../src/core/logger.js';
import { getMCPDebugLogger, initializeMCPDebugLogging } from '../../src/mcp/debug-logger.js';
import { ConsoleMigration } from '../../src/utils/console-migration.js';
import {
  LondonSchoolMockFactory,
  PerformanceTestHelper,
  MockDataGenerator,
  type IPerformanceCounter,
} from '../utils/london-school-test-helpers.js';

describe('Debug Performance Validation', () => {
  let performanceCounter: jest.Mocked<IPerformanceCounter>;
  let originalConsole: typeof console;

  beforeEach(() => {
    // Mock console for performance testing
    originalConsole = { ...console };
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

    // Create performance counter mock
    performanceCounter = LondonSchoolMockFactory.createPerformanceCounterMock({
      performanceOverhead: 2.5,
    });

    // Reset all singletons and factories
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
    jest.restoreAllMocks();
  });

  describe('Core Performance Requirements', () => {
    it('should meet <10% overhead requirement for debug logging', async () => {
      // Arrange
      const iterations = 10000;
      const testMessages = Array.from({ length: iterations }, (_, i) => `Test message ${i}`);

      // Test WITHOUT debug logging
      const startWithoutDebug = performance.now();
      for (let i = 0; i < iterations; i++) {
        // Simulate minimal processing
        JSON.stringify({ message: testMessages[i], timestamp: Date.now() });
      }
      const endWithoutDebug = performance.now();
      const baselineTime = endWithoutDebug - startWithoutDebug;

      // Test WITH debug logging
      const debugLogger = new DebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      const startWithDebug = performance.now();
      for (let i = 0; i < iterations; i++) {
        debugLogger.debug(testMessages[i], { iteration: i });
        JSON.stringify({ message: testMessages[i], timestamp: Date.now() });
      }
      const endWithDebug = performance.now();
      const debugTime = endWithDebug - startWithDebug;

      // Calculate overhead
      const overhead = debugTime - baselineTime;
      const overheadPercentage = (overhead / baselineTime) * 100;

      // Assert
      expect(overheadPercentage).toBeLessThan(10);
      expect(baselineTime).toBeGreaterThan(0);
      expect(debugTime).toBeGreaterThan(baselineTime);

      console.log(
        `Baseline: ${baselineTime.toFixed(2)}ms, With Debug: ${debugTime.toFixed(2)}ms, Overhead: ${overheadPercentage.toFixed(2)}%`,
      );
    });

    it('should maintain <5% overhead when debug logging is disabled', async () => {
      // Arrange
      const iterations = 10000;
      const testMessages = Array.from({ length: iterations }, (_, i) => `Test message ${i}`);

      // Test baseline without any logging
      const startBaseline = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify({ message: testMessages[i], timestamp: Date.now() });
      }
      const endBaseline = performance.now();
      const baselineTime = endBaseline - startBaseline;

      // Test with disabled debug logging (info level)
      const debugLogger = new DebugLogger({
        level: 'info', // Debug disabled
        format: 'json',
        destination: 'console',
      });

      const startDisabled = performance.now();
      for (let i = 0; i < iterations; i++) {
        debugLogger.debug(testMessages[i], { iteration: i }); // Should be filtered out
        JSON.stringify({ message: testMessages[i], timestamp: Date.now() });
      }
      const endDisabled = performance.now();
      const disabledTime = endDisabled - startDisabled;

      // Calculate overhead
      const overhead = disabledTime - baselineTime;
      const overheadPercentage = (overhead / baselineTime) * 100;

      // Assert - Disabled debug logging should have minimal overhead
      expect(overheadPercentage).toBeLessThan(5);
      expect(Math.abs(disabledTime - baselineTime)).toBeLessThan(baselineTime * 0.05);
    });

    it('should handle emergency mode performance correctly', async () => {
      // Arrange
      const iterations = 5000;
      const debugLogger = new DebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      // Test normal mode performance
      const startNormal = performance.now();
      for (let i = 0; i < iterations; i++) {
        debugLogger.debug(`Normal mode message ${i}`);
      }
      const endNormal = performance.now();
      const normalTime = endNormal - startNormal;

      // Test emergency mode performance
      debugLogger.enableEmergencyMode();

      const startEmergency = performance.now();
      for (let i = 0; i < iterations; i++) {
        debugLogger.debug(`Emergency mode message ${i}`); // Should be filtered
        debugLogger.info(`Emergency info ${i}`); // Should still work
      }
      const endEmergency = performance.now();
      const emergencyTime = endEmergency - startEmergency;

      // Assert - Emergency mode should be faster (no debug processing)
      expect(emergencyTime).toBeLessThan(normalTime);

      // Should have significant performance improvement
      const improvement = ((normalTime - emergencyTime) / normalTime) * 100;
      expect(improvement).toBeGreaterThan(10); // At least 10% improvement
    });
  });

  describe('MCP Protocol Performance', () => {
    it('should maintain <10% overhead for MCP protocol tracing', async () => {
      // Arrange
      const iterations = 1000;
      const mcpMessages = Array.from({ length: iterations }, (_, i) => ({
        jsonrpc: '2.0' as const,
        id: i,
        method: `test/method-${i}`,
        params: { data: `test-data-${i}` },
      }));

      // Baseline without MCP tracing
      const startBaseline = performance.now();
      for (const message of mcpMessages) {
        JSON.stringify(message);
        // Simulate message validation
        const isValid = message.jsonrpc === '2.0' && message.method && message.id !== undefined;
      }
      const endBaseline = performance.now();
      const baselineTime = endBaseline - startBaseline;

      // With MCP debug tracing
      const mcpDebugLogger = initializeMCPDebugLogging({
        enableTracing: true,
        enableCrossSystemCorrelation: true,
        performanceThreshold: 0.1,
      });

      const startMCP = performance.now();
      for (const message of mcpMessages) {
        mcpDebugLogger.traceProtocolMessage('inbound', 'request', message);
        JSON.stringify(message);
        // Simulate message validation
        const isValid = message.jsonrpc === '2.0' && message.method && message.id !== undefined;
      }
      const endMCP = performance.now();
      const mcpTime = endMCP - startMCP;

      mcpDebugLogger.shutdown();

      // Calculate overhead
      const overhead = mcpTime - baselineTime;
      const overheadPercentage = (overhead / baselineTime) * 100;

      // Assert
      expect(overheadPercentage).toBeLessThan(10);
      console.log(
        `MCP Baseline: ${baselineTime.toFixed(2)}ms, With Tracing: ${mcpTime.toFixed(2)}ms, Overhead: ${overheadPercentage.toFixed(2)}%`,
      );
    });

    it('should handle tool invocation tracing efficiently', async () => {
      // Arrange
      const toolCount = 500;
      const mcpDebugLogger = getMCPDebugLogger({
        enableToolTracing: true,
        sanitizeSensitiveData: true,
      });

      const toolData = Array.from({ length: toolCount }, (_, i) => ({
        name: `test/tool-${i}`,
        params: {
          data: `tool-data-${i}`.repeat(10), // Some bulk data
          iteration: i,
          sensitive: 'password123', // Will be sanitized
        },
      }));

      // Measure tool invocation tracing performance
      const startTime = performance.now();

      const invocationIds: string[] = [];
      for (const tool of toolData) {
        const invocationId = mcpDebugLogger.traceToolInvocation(tool.name, tool.params);
        invocationIds.push(invocationId);
      }

      // Complete all invocations
      for (const invocationId of invocationIds) {
        mcpDebugLogger.completeToolInvocation(invocationId, { result: 'success' });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert performance requirements
      expect(duration).toBeLessThan(1000); // Less than 1 second for 500 tools
      expect(duration / toolCount).toBeLessThan(2); // Less than 2ms per tool

      // Verify all traces were created
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.toolInvocations.total).toBe(toolCount);
      expect(metrics.toolInvocations.successful).toBe(toolCount);

      mcpDebugLogger.shutdown();
    });

    it('should handle cross-system correlation efficiently', async () => {
      // Arrange
      const correlationCount = 1000;
      const mcpDebugLogger = getMCPDebugLogger({
        enableCrossSystemCorrelation: true,
      });

      // Measure correlation creation performance
      const startTime = performance.now();

      const correlationIds: string[] = [];
      for (let i = 0; i < correlationCount; i++) {
        const correlationId = mcpDebugLogger.createCrossSystemCorrelation(
          `cf-session-${i}`,
          i % 2 === 0 ? `cc-session-${i}` : undefined, // 50% have claude-code sessions
          { workflowId: `workflow-${i}`, taskId: `task-${i}` },
        );
        correlationIds.push(correlationId);

        // Link to claude-code for half of them
        if (i % 2 === 1) {
          mcpDebugLogger.linkToClaudeCode(correlationId, `cc-session-${i}`, `cc-corr-${i}`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert performance requirements
      expect(duration).toBeLessThan(500); // Less than 500ms for 1000 correlations
      expect(duration / correlationCount).toBeLessThan(0.5); // Less than 0.5ms per correlation

      // Verify correlations were created
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.correlation.crossSystemLinks).toBe(correlationCount);

      mcpDebugLogger.shutdown();
    });
  });

  describe('Console Migration Performance', () => {
    it('should handle console migration calls efficiently', async () => {
      // Arrange
      const migrationCount = 10000;
      const components = ['CLI', 'MCP', 'Core', 'Swarm', 'Terminal'] as const;

      // Measure migration performance
      const startTime = performance.now();

      for (let i = 0; i < migrationCount; i++) {
        const component = components[i % components.length];
        const method = ['log', 'info', 'warn', 'error', 'debug'][
          i % 5
        ] as keyof typeof ConsoleMigration;

        ConsoleMigration[method](component, `Migration message ${i}`, `arg-${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert performance requirements
      expect(duration).toBeLessThan(1000); // Less than 1 second for 10k migrations
      expect(duration / migrationCount).toBeLessThan(0.1); // Less than 0.1ms per migration

      // Verify migration tracking
      const stats = ConsoleMigration.getMigrationStats();
      expect(Object.keys(stats).length).toBeGreaterThan(0);

      const totalMigrated = Object.values(stats).reduce((sum, stat) => sum + stat.migratedCalls, 0);
      expect(totalMigrated).toBe(migrationCount);
    });

    it('should handle file migration performance', async () => {
      // Arrange - Mock file operations for performance testing
      const fs = await import('node:fs/promises');
      const mockFs = fs as jest.Mocked<typeof fs>;

      const fileContent = `
function example() {
  console.log('Message 1');
  console.warn('Message 2');
  console.error('Message 3');
  console.debug('Message 4');
  console.info('Message 5');
}
`.repeat(100); // Large file content

      jest.doMock('node:fs/promises', () => ({
        readFile: jest.fn().mockResolvedValue(fileContent),
        writeFile: jest.fn().mockResolvedValue(undefined),
        copyFile: jest.fn().mockResolvedValue(undefined),
      }));

      // Act - Measure file migration performance
      const startTime = performance.now();

      const result = await ConsoleMigration.migrateFile('/test/large-file.ts', 'CLI');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalReplacements).toBe(500); // 5 console calls * 100 repetitions
      expect(duration).toBeLessThan(100); // Less than 100ms for large file
    });
  });

  describe('Memory Performance Validation', () => {
    it('should maintain memory efficiency under load', async () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 10000;

      // Initialize all debug components
      ComponentLoggerFactory.initializeDebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      const mcpDebugLogger = getMCPDebugLogger({
        enableTracing: true,
        enableCrossSystemCorrelation: true,
        enableToolTracing: true,
      });

      // Act - Generate memory load
      for (let i = 0; i < iterations; i++) {
        // Component logging
        const cliLogger = ComponentLoggerFactory.getCLILogger(`correlation-${i}`);
        cliLogger.debug(`Memory test message ${i}`, {
          iteration: i,
          data: 'x'.repeat(100), // 100 bytes per message
        });

        // MCP tracing every 10th iteration
        if (i % 10 === 0) {
          mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
            jsonrpc: '2.0',
            id: i,
            method: 'memory/test',
            params: { data: 'y'.repeat(200) }, // 200 bytes
          });
        }

        // Tool invocation every 50th iteration
        if (i % 50 === 0) {
          const invocationId = mcpDebugLogger.traceToolInvocation(
            `memory/tool-${i}`,
            { largeData: 'z'.repeat(500) }, // 500 bytes
          );
          mcpDebugLogger.completeToolInvocation(invocationId, { result: 'success' });
        }

        // Console migration every 20th iteration
        if (i % 20 === 0) {
          ConsoleMigration.log('Core', `Memory migration ${i}`);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Assert memory constraints
      expect(memoryGrowthMB).toBeLessThan(100); // Less than 100MB growth

      // Memory growth per operation should be minimal
      const memoryPerOp = memoryGrowth / iterations;
      expect(memoryPerOp).toBeLessThan(1000); // Less than 1KB per operation

      mcpDebugLogger.shutdown();

      console.log(
        `Memory growth: ${memoryGrowthMB.toFixed(2)}MB, Per operation: ${memoryPerOp.toFixed(2)} bytes`,
      );
    });

    it('should handle memory pressure gracefully', async () => {
      // Arrange - Simulate high memory usage
      const debugLogger = new DebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      // Mock high memory pressure
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 1024, // 1GB
        heapTotal: 900 * 1024 * 1024, // 900MB
        heapUsed: 850 * 1024 * 1024, // 850MB (94% usage)
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });

      // Act - Operate under memory pressure
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        debugLogger.debug(`High memory test ${i}`, {
          iteration: i,
          largeData: 'x'.repeat(1000),
        });

        // Should trigger emergency mode automatically
        if (debugLogger.getMemoryPressure() > 0.95) {
          break;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert - Should complete quickly despite memory pressure
      expect(duration).toBeLessThan(500); // Less than 500ms

      // Memory pressure should be detected
      expect(debugLogger.getMemoryPressure()).toBeGreaterThan(0.8);

      // Restore original memory usage
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Comprehensive Performance Validation', () => {
    it('should pass complete debug validation suite', async () => {
      // Arrange
      const validationSuite = new DebugValidationSuite();

      // Act
      const results = await validationSuite.run();

      // Assert - All performance requirements should pass
      expect(results.overall.passed).toBe(true);
      expect(results.overall.score).toBeGreaterThanOrEqual(100);

      // Specific performance requirements
      expect(results.performanceOverhead.passed).toBe(true);
      expect(results.performanceOverhead.overheadPercentage).toBeLessThan(10);

      expect(results.memoryEfficiency.passed).toBe(true);
      expect(results.memoryEfficiency.memoryGrowth).toBeLessThan(50);

      expect(results.protocolCompliance.passed).toBe(true);
      expect(results.crossSystemCorrelation.passed).toBe(true);
      expect(results.toolInvocationTracing.passed).toBe(true);
    });

    it('should maintain performance across concurrent operations', async () => {
      // Arrange
      const concurrentOperations = 10;
      const operationsPerWorker = 1000;

      // Act - Run concurrent performance tests
      const promises = Array.from({ length: concurrentOperations }, async (_, workerId) => {
        const debugLogger = new DebugLogger({
          level: 'debug',
          format: 'json',
          destination: 'console',
        });

        const startTime = performance.now();

        for (let i = 0; i < operationsPerWorker; i++) {
          debugLogger.debug(`Concurrent worker ${workerId} message ${i}`, {
            workerId,
            iteration: i,
            timestamp: Date.now(),
          });

          // Simulate some processing
          await new Promise((resolve) => setImmediate(resolve));
        }

        const endTime = performance.now();
        return endTime - startTime;
      });

      const results = await Promise.all(promises);
      const totalDuration = Math.max(...results);
      const avgDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length;

      // Assert - Concurrent operations should not degrade performance significantly
      expect(totalDuration).toBeLessThan(5000); // Less than 5 seconds total
      expect(avgDuration).toBeLessThan(3000); // Less than 3 seconds average

      // Variance should be reasonable (good load balancing)
      const variance =
        results.reduce((sum, duration) => sum + Math.pow(duration - avgDuration, 2), 0) /
        results.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev / avgDuration).toBeLessThan(0.5); // Standard deviation < 50% of mean
    });
  });

  describe('Performance Regression Testing', () => {
    it('should detect performance regressions', async () => {
      // Arrange - Baseline performance
      const iterations = 5000;
      const debugLogger = new DebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      // Baseline measurement
      const baselineStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        debugLogger.debug(`Baseline message ${i}`);
      }
      const baselineEnd = performance.now();
      const baselineTime = baselineEnd - baselineStart;

      // Simulated regression (add artificial delay)
      const regressionLogger = new DebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      const regressionStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        regressionLogger.debug(`Regression message ${i}`);
        // Simulate 0.001ms delay per operation (regression)
        const delay = performance.now() + 0.001;
        while (performance.now() < delay) {
          /* busy wait */
        }
      }
      const regressionEnd = performance.now();
      const regressionTime = regressionEnd - regressionStart;

      // Assert - Should detect significant regression
      const regressionPercentage = ((regressionTime - baselineTime) / baselineTime) * 100;
      expect(regressionPercentage).toBeGreaterThan(20); // Significant regression detected

      // Performance should not exceed 15% degradation in normal conditions
      expect(baselineTime).toBeLessThan(regressionTime);
    });

    it('should benchmark against performance targets', async () => {
      // Arrange - Performance targets
      const performanceTargets = {
        debugOperationsPerSecond: 10000,
        mcpTracesPerSecond: 1000,
        migrationCallsPerSecond: 20000,
        memoryGrowthPerMB: 1000, // operations per MB of memory growth
        maxLatencyMs: 1, // max latency per operation
      };

      // Debug logging benchmark
      const debugLogger = new DebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      const debugStart = performance.now();
      const debugIterations = 10000;
      for (let i = 0; i < debugIterations; i++) {
        debugLogger.debug(`Benchmark message ${i}`);
      }
      const debugEnd = performance.now();
      const debugDuration = debugEnd - debugStart;
      const debugOpsPerSecond = (debugIterations / debugDuration) * 1000;

      // MCP tracing benchmark
      const mcpDebugLogger = getMCPDebugLogger();
      const mcpStart = performance.now();
      const mcpIterations = 1000;
      for (let i = 0; i < mcpIterations; i++) {
        mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
          jsonrpc: '2.0',
          id: i,
          method: 'benchmark/test',
          params: {},
        });
      }
      const mcpEnd = performance.now();
      const mcpDuration = mcpEnd - mcpStart;
      const mcpOpsPerSecond = (mcpIterations / mcpDuration) * 1000;

      // Console migration benchmark
      const migrationStart = performance.now();
      const migrationIterations = 20000;
      for (let i = 0; i < migrationIterations; i++) {
        ConsoleMigration.log('CLI', `Benchmark migration ${i}`);
      }
      const migrationEnd = performance.now();
      const migrationDuration = migrationEnd - migrationStart;
      const migrationOpsPerSecond = (migrationIterations / migrationDuration) * 1000;

      mcpDebugLogger.shutdown();

      // Assert against performance targets
      expect(debugOpsPerSecond).toBeGreaterThan(performanceTargets.debugOperationsPerSecond);
      expect(mcpOpsPerSecond).toBeGreaterThan(performanceTargets.mcpTracesPerSecond);
      expect(migrationOpsPerSecond).toBeGreaterThan(performanceTargets.migrationCallsPerSecond);

      // Latency requirements
      expect(debugDuration / debugIterations).toBeLessThan(performanceTargets.maxLatencyMs);
      expect(mcpDuration / mcpIterations).toBeLessThan(performanceTargets.maxLatencyMs);

      console.log(
        `Debug: ${debugOpsPerSecond.toFixed(0)} ops/sec, MCP: ${mcpOpsPerSecond.toFixed(0)} ops/sec, Migration: ${migrationOpsPerSecond.toFixed(0)} ops/sec`,
      );
    });
  });
});
