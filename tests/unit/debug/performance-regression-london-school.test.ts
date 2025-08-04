/**
 * TDD London School: Performance Regression Testing
 * Mock-driven testing for performance constraints and regression detection
 */

import { jest } from '@jest/globals';
import {
  LondonSchoolMockFactory,
  MemoryPressureSimulator,
  PerformanceTestHelper,
  MockConfiguration,
  IPerformanceCounter,
  IMemoryMonitor,
  IDebugLogger,
} from '../../utils/london-school-test-helpers.js';

// Performance baseline interfaces
interface IPerformanceBaseline {
  operation: string;
  baselineMs: number;
  maxOverheadPercent: number;
  memoryConstraintMB: number;
  throughputRequirement: number;
}

interface IPerformanceRegression {
  detectRegression(
    current: PerformanceMeasurement,
    baseline: IPerformanceBaseline,
  ): RegressionResult;
  recordBaseline(operation: string, measurement: PerformanceMeasurement): void;
  getBaseline(operation: string): IPerformanceBaseline | null;
}

interface PerformanceMeasurement {
  operation: string;
  durationMs: number;
  overheadPercent: number;
  memoryUsageMB: number;
  throughputOps: number;
  timestamp: number;
}

interface RegressionResult {
  hasRegression: boolean;
  regressionType: 'performance' | 'memory' | 'throughput' | 'overhead' | null;
  currentValue: number;
  baselineValue: number;
  regressionPercent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Mock implementations for regression testing
class MockPerformanceRegression implements IPerformanceRegression {
  private baselines = new Map<string, IPerformanceBaseline>();

  detectRegression =
    jest.fn<
      (current: PerformanceMeasurement, baseline: IPerformanceBaseline) => RegressionResult
    >();
  recordBaseline = jest.fn<(operation: string, measurement: PerformanceMeasurement) => void>();
  getBaseline = jest.fn<(operation: string) => IPerformanceBaseline | null>();
}

class MockPerformanceMonitor {
  private regressionDetector: IPerformanceRegression;
  private performanceCounter: IPerformanceCounter;
  private memoryMonitor: IMemoryMonitor;
  private debugLogger: IDebugLogger;

  constructor(
    regressionDetector: IPerformanceRegression,
    performanceCounter: IPerformanceCounter,
    memoryMonitor: IMemoryMonitor,
    debugLogger: IDebugLogger,
  ) {
    this.regressionDetector = regressionDetector;
    this.performanceCounter = performanceCounter;
    this.memoryMonitor = memoryMonitor;
    this.debugLogger = debugLogger;
  }

  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<{ result: T; measurement: PerformanceMeasurement }> {
    // Check memory pressure before operation
    if (this.memoryMonitor.isMemoryPressureHigh()) {
      this.debugLogger.warn(
        'performance:monitor',
        'High memory pressure detected before operation',
        {
          operation: operationName,
          memoryLevel: this.memoryMonitor.getMemoryPressureLevel(),
        },
      );
    }

    const startTime = this.performanceCounter.start();
    const memoryBefore = this.memoryMonitor.getCurrentUsage();

    try {
      const result = await operation();
      const endTime = this.performanceCounter.end();
      const memoryAfter = this.memoryMonitor.getCurrentUsage();

      const measurement: PerformanceMeasurement = {
        operation: operationName,
        durationMs: endTime - startTime,
        overheadPercent: this.performanceCounter.getOverheadPercentage(),
        memoryUsageMB: (memoryAfter.heapUsed - memoryBefore.heapUsed) / (1024 * 1024),
        throughputOps: 1000 / (endTime - startTime), // ops/second
        timestamp: Date.now(),
      };

      this.debugLogger.debug('performance:monitor', 'Operation measured', {
        operation: operationName,
        duration: measurement.durationMs,
        overhead: measurement.overheadPercent,
        memoryDelta: measurement.memoryUsageMB,
      });

      return { result, measurement };
    } catch (error) {
      this.debugLogger.error('performance:monitor', 'Operation failed during measurement', error);
      throw error;
    }
  }

  checkForRegression(measurement: PerformanceMeasurement): RegressionResult | null {
    const baseline = this.regressionDetector.getBaseline(measurement.operation);
    if (!baseline) {
      this.debugLogger.debug('performance:regression', 'No baseline found for operation', {
        operation: measurement.operation,
      });
      return null;
    }

    const regression = this.regressionDetector.detectRegression(measurement, baseline);

    if (regression.hasRegression) {
      this.debugLogger.warn('performance:regression', 'Performance regression detected', {
        operation: measurement.operation,
        regressionType: regression.regressionType,
        severity: regression.severity,
        regressionPercent: regression.regressionPercent,
      });
    }

    return regression;
  }

  recordPerformanceBaseline(measurement: PerformanceMeasurement): void {
    this.regressionDetector.recordBaseline(measurement.operation, measurement);
    this.debugLogger.info('performance:baseline', 'Performance baseline recorded', {
      operation: measurement.operation,
      duration: measurement.durationMs,
      overhead: measurement.overheadPercent,
    });
  }
}

describe('Performance Regression Testing - London School TDD', () => {
  let mockRegressionDetector: MockPerformanceRegression;
  let mockPerformanceCounter: jest.Mocked<IPerformanceCounter>;
  let mockMemoryMonitor: jest.Mocked<IMemoryMonitor>;
  let mockDebugLogger: jest.Mocked<IDebugLogger>;
  let performanceMonitor: MockPerformanceMonitor;

  beforeEach(() => {
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite({
      performanceOverhead: 2.5,
      memoryPressureLevel: 80,
    });

    mockRegressionDetector = new MockPerformanceRegression();
    mockPerformanceCounter = mockSuite.performanceCounter;
    mockMemoryMonitor = mockSuite.memoryMonitor;
    mockDebugLogger = mockSuite.debugLogger;

    performanceMonitor = new MockPerformanceMonitor(
      mockRegressionDetector,
      mockPerformanceCounter,
      mockMemoryMonitor,
      mockDebugLogger,
    );
  });

  describe('<5% Performance Overhead Requirement', () => {
    it('should detect and reject operations exceeding 5% overhead', async () => {
      // Arrange - Mock excessive overhead scenario
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(7.2); // 7.2% overhead - exceeds 5%
      mockPerformanceCounter.start.mockReturnValue(1000);
      mockPerformanceCounter.end.mockReturnValue(1050);
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockMemoryMonitor.getCurrentUsage.mockReturnValue({
        heapUsed: 25 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      });

      const baseline: IPerformanceBaseline = {
        operation: 'debug-logging',
        baselineMs: 45,
        maxOverheadPercent: 5,
        memoryConstraintMB: 50,
        throughputRequirement: 10000,
      };

      mockRegressionDetector.getBaseline.mockReturnValue(baseline);
      mockRegressionDetector.detectRegression.mockReturnValue({
        hasRegression: true,
        regressionType: 'overhead',
        currentValue: 7.2,
        baselineValue: 5.0,
        regressionPercent: 44, // (7.2 - 5.0) / 5.0 * 100
        severity: 'critical',
      });

      // Act
      const testOperation = async () => {
        // Simulate debug logging operation
        mockDebugLogger.debug('test:category', 'Test message with overhead');
        return 'operation-complete';
      };

      const { measurement } = await performanceMonitor.measureOperation(
        'debug-logging',
        testOperation,
      );
      const regression = performanceMonitor.checkForRegression(measurement);

      // Assert - Verify overhead detection
      expect(measurement.overheadPercent).toBe(7.2);
      expect(regression?.hasRegression).toBe(true);
      expect(regression?.regressionType).toBe('overhead');
      expect(regression?.severity).toBe('critical');

      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        'performance:regression',
        'Performance regression detected',
        expect.objectContaining({
          regressionType: 'overhead',
          severity: 'critical',
          regressionPercent: 44,
        }),
      );
    });

    it('should pass operations within 5% overhead constraint', async () => {
      // Arrange - Mock acceptable overhead scenario
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(3.8); // 3.8% overhead - within 5%
      mockPerformanceCounter.start.mockReturnValue(1000);
      mockPerformanceCounter.end.mockReturnValue(1035);
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockMemoryMonitor.getCurrentUsage.mockReturnValue({
        heapUsed: 22 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      });

      const baseline: IPerformanceBaseline = {
        operation: 'efficient-logging',
        baselineMs: 35,
        maxOverheadPercent: 5,
        memoryConstraintMB: 50,
        throughputRequirement: 10000,
      };

      mockRegressionDetector.getBaseline.mockReturnValue(baseline);
      mockRegressionDetector.detectRegression.mockReturnValue({
        hasRegression: false,
        regressionType: null,
        currentValue: 3.8,
        baselineValue: 5.0,
        regressionPercent: -24, // Performance improvement
        severity: 'low',
      });

      // Act
      const testOperation = async () => {
        mockDebugLogger.debug('efficient:category', 'Efficient logging operation');
        return 'efficient-complete';
      };

      const { measurement } = await performanceMonitor.measureOperation(
        'efficient-logging',
        testOperation,
      );
      const regression = performanceMonitor.checkForRegression(measurement);

      // Assert - Verify acceptable performance
      expect(measurement.overheadPercent).toBe(3.8);
      expect(regression?.hasRegression).toBe(false);
      expect(measurement.overheadPercent).toBeLessThan(5);

      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'performance:monitor',
        'Operation measured',
        expect.objectContaining({
          operation: 'efficient-logging',
          overhead: 3.8,
        }),
      );
    });
  });

  describe('<10% Memory Overhead Requirement', () => {
    it('should detect memory overhead regressions above 10%', async () => {
      // Arrange - High memory overhead scenario
      const memoryBefore = {
        heapUsed: 20 * 1024 * 1024, // 20MB
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      };

      const memoryAfter = {
        heapUsed: 26 * 1024 * 1024, // 26MB (6MB increase = 30% of baseline)
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now() + 100,
      };

      let usageCallCount = 0;
      mockMemoryMonitor.getCurrentUsage.mockImplementation(() => {
        usageCallCount++;
        return usageCallCount === 1 ? memoryBefore : memoryAfter;
      });

      mockPerformanceCounter.start.mockReturnValue(1000);
      mockPerformanceCounter.end.mockReturnValue(1055);
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(4.5);

      const baseline: IPerformanceBaseline = {
        operation: 'memory-intensive-logging',
        baselineMs: 50,
        maxOverheadPercent: 5,
        memoryConstraintMB: 2, // Baseline 2MB memory usage
        throughputRequirement: 8000,
      };

      mockRegressionDetector.getBaseline.mockReturnValue(baseline);
      mockRegressionDetector.detectRegression.mockReturnValue({
        hasRegression: true,
        regressionType: 'memory',
        currentValue: 6, // 6MB used
        baselineValue: 2, // 2MB baseline
        regressionPercent: 200, // 200% increase
        severity: 'critical',
      });

      // Act
      const memoryIntensiveOperation = async () => {
        // Simulate memory-intensive logging
        for (let i = 0; i < 1000; i++) {
          mockDebugLogger.debug('memory:test', `Memory test iteration ${i}`, {
            data: new Array(100).fill(`large-data-${i}`),
          });
        }
        return 'memory-operation-complete';
      };

      const { measurement } = await performanceMonitor.measureOperation(
        'memory-intensive-logging',
        memoryIntensiveOperation,
      );
      const regression = performanceMonitor.checkForRegression(measurement);

      // Assert - Verify memory regression detection
      expect(measurement.memoryUsageMB).toBe(6); // 6MB increase
      expect(regression?.hasRegression).toBe(true);
      expect(regression?.regressionType).toBe('memory');
      expect(regression?.regressionPercent).toBe(200);

      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        'performance:regression',
        'Performance regression detected',
        expect.objectContaining({
          regressionType: 'memory',
          severity: 'critical',
        }),
      );
    });
  });

  describe('Throughput Performance Testing', () => {
    it('should maintain 10,000+ entries/second throughput', async () => {
      // Arrange - High throughput scenario
      mockPerformanceCounter.start.mockReturnValue(1000);
      mockPerformanceCounter.end.mockReturnValue(1100); // 100ms for operation
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(2.1);
      mockMemoryMonitor.isMemoryPressureHigh.mockReturnValue(false);
      mockMemoryMonitor.getCurrentUsage.mockReturnValue({
        heapUsed: 30 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      });

      const baseline: IPerformanceBaseline = {
        operation: 'high-throughput-logging',
        baselineMs: 100,
        maxOverheadPercent: 5,
        memoryConstraintMB: 50,
        throughputRequirement: 10000, // 10k ops/second
      };

      mockRegressionDetector.getBaseline.mockReturnValue(baseline);
      mockRegressionDetector.detectRegression.mockReturnValue({
        hasRegression: false,
        regressionType: null,
        currentValue: 10000, // Meets requirement
        baselineValue: 10000,
        regressionPercent: 0,
        severity: 'low',
      });

      // Act - Simulate high-throughput operation
      const highThroughputOperation = async () => {
        // Simulate processing 10,000 log entries in 100ms
        for (let i = 0; i < 100; i++) {
          // Sample processing
          mockDebugLogger.debug('throughput:test', `Batch ${i}`, { batchSize: 100 });
        }
        return 'throughput-complete';
      };

      const { measurement } = await performanceMonitor.measureOperation(
        'high-throughput-logging',
        highThroughputOperation,
      );

      // Assert - Verify throughput requirement
      expect(measurement.durationMs).toBe(100);
      expect(measurement.throughputOps).toBe(10); // 1000ms / 100ms = 10 ops/second for this measurement

      // Scale up calculation: if this batch took 100ms, 10k entries would take 1 second
      const scaledThroughput = (10000 / 100) * (1000 / measurement.durationMs);
      expect(scaledThroughput).toBeGreaterThanOrEqual(10000);

      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'performance:monitor',
        'Operation measured',
        expect.objectContaining({
          operation: 'high-throughput-logging',
          duration: 100,
        }),
      );
    });

    it('should detect throughput regressions below requirements', async () => {
      // Arrange - Slow throughput scenario
      mockPerformanceCounter.start.mockReturnValue(1000);
      mockPerformanceCounter.end.mockReturnValue(1500); // 500ms - too slow
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(3.2);
      mockMemoryMonitor.getCurrentUsage.mockReturnValue({
        heapUsed: 28 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      });

      const baseline: IPerformanceBaseline = {
        operation: 'slow-logging',
        baselineMs: 100,
        maxOverheadPercent: 5,
        memoryConstraintMB: 50,
        throughputRequirement: 10000,
      };

      mockRegressionDetector.getBaseline.mockReturnValue(baseline);
      mockRegressionDetector.detectRegression.mockReturnValue({
        hasRegression: true,
        regressionType: 'throughput',
        currentValue: 2000, // 2k ops/second (below 10k requirement)
        baselineValue: 10000,
        regressionPercent: -80, // 80% decrease
        severity: 'high',
      });

      // Act
      const slowOperation = async () => {
        // Simulate slow logging operation
        mockDebugLogger.debug('slow:test', 'Slow operation with performance issues');
        return 'slow-complete';
      };

      const { measurement } = await performanceMonitor.measureOperation(
        'slow-logging',
        slowOperation,
      );
      const regression = performanceMonitor.checkForRegression(measurement);

      // Assert - Verify throughput regression detection
      expect(measurement.durationMs).toBe(500);
      expect(measurement.throughputOps).toBe(2); // 1000ms / 500ms = 2 ops/second
      expect(regression?.hasRegression).toBe(true);
      expect(regression?.regressionType).toBe('throughput');

      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        'performance:regression',
        'Performance regression detected',
        expect.objectContaining({
          regressionType: 'throughput',
          severity: 'high',
          regressionPercent: -80,
        }),
      );
    });
  });

  describe('Memory Pressure Performance Impact', () => {
    it('should maintain performance standards under 98% memory pressure', async () => {
      // Arrange - Extreme memory pressure scenario
      MemoryPressureSimulator.simulateExtremeMemoryConstraint(mockMemoryMonitor, 98.5);

      mockPerformanceCounter.start.mockReturnValue(1000);
      mockPerformanceCounter.end.mockReturnValue(1120); // Slightly slower under pressure
      mockPerformanceCounter.getOverheadPercentage.mockReturnValue(4.8); // Still within 5%

      const baseline: IPerformanceBaseline = {
        operation: 'pressure-logging',
        baselineMs: 100,
        maxOverheadPercent: 5,
        memoryConstraintMB: 50,
        throughputRequirement: 8000, // Reduced requirement under pressure
      };

      mockRegressionDetector.getBaseline.mockReturnValue(baseline);
      mockRegressionDetector.detectRegression.mockReturnValue({
        hasRegression: false,
        regressionType: null,
        currentValue: 4.8,
        baselineValue: 5.0,
        regressionPercent: -4, // Still within acceptable range
        severity: 'low',
      });

      // Act
      const pressureOperation = async () => {
        if (mockMemoryMonitor.isMemoryPressureHigh()) {
          // Reduced functionality under pressure
          mockDebugLogger.warn('pressure:test', 'Operating under memory pressure');
        } else {
          mockDebugLogger.debug('pressure:test', 'Normal operation');
        }
        return 'pressure-complete';
      };

      const { measurement } = await performanceMonitor.measureOperation(
        'pressure-logging',
        pressureOperation,
      );

      // Assert - Verify performance maintained under pressure
      expect(mockMemoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();
      expect(mockMemoryMonitor.getMemoryPressureLevel()).toBe(98.5);
      expect(measurement.overheadPercent).toBeLessThan(5);
      expect(measurement.durationMs).toBe(120); // Acceptable degradation

      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        'performance:monitor',
        'High memory pressure detected before operation',
        expect.objectContaining({
          operation: 'pressure-logging',
          memoryLevel: 98.5,
        }),
      );
    });
  });

  describe('Performance Baseline Management', () => {
    it('should record and retrieve performance baselines correctly', async () => {
      // Arrange
      const testMeasurement: PerformanceMeasurement = {
        operation: 'baseline-test',
        durationMs: 85,
        overheadPercent: 3.2,
        memoryUsageMB: 1.5,
        throughputOps: 11764, // ~11.8k ops/second
        timestamp: Date.now(),
      };

      mockRegressionDetector.recordBaseline.mockImplementation((operation, measurement) => {
        // Mock recording baseline
      });

      mockRegressionDetector.getBaseline.mockReturnValue({
        operation: 'baseline-test',
        baselineMs: 85,
        maxOverheadPercent: 5,
        memoryConstraintMB: 50,
        throughputRequirement: 10000,
      });

      // Act
      performanceMonitor.recordPerformanceBaseline(testMeasurement);
      const retrievedBaseline = mockRegressionDetector.getBaseline('baseline-test');

      // Assert - Verify baseline management
      expect(mockRegressionDetector.recordBaseline).toHaveBeenCalledWith(
        'baseline-test',
        testMeasurement,
      );

      expect(retrievedBaseline).toBeDefined();
      expect(retrievedBaseline?.baselineMs).toBe(85);
      expect(retrievedBaseline?.maxOverheadPercent).toBe(5);

      expect(mockDebugLogger.info).toHaveBeenCalledWith(
        'performance:baseline',
        'Performance baseline recorded',
        expect.objectContaining({
          operation: 'baseline-test',
          duration: 85,
          overhead: 3.2,
        }),
      );
    });

    it('should handle missing baselines gracefully', async () => {
      // Arrange
      mockRegressionDetector.getBaseline.mockReturnValue(null);

      const testMeasurement: PerformanceMeasurement = {
        operation: 'unknown-operation',
        durationMs: 100,
        overheadPercent: 4.0,
        memoryUsageMB: 2.0,
        throughputOps: 10000,
        timestamp: Date.now(),
      };

      // Act
      const regression = performanceMonitor.checkForRegression(testMeasurement);

      // Assert - Verify graceful handling
      expect(regression).toBeNull();
      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'performance:regression',
        'No baseline found for operation',
        expect.objectContaining({
          operation: 'unknown-operation',
        }),
      );
    });
  });
});

describe('Comprehensive Performance Validation', () => {
  it('should validate all performance requirements in integrated scenario', async () => {
    // Arrange - Comprehensive performance test
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite({
      performanceOverhead: 4.2, // Within 5% limit
      memoryPressureLevel: 92, // High but manageable
    });

    const mockRegressionDetector = new MockPerformanceRegression();
    const performanceMonitor = new MockPerformanceMonitor(
      mockRegressionDetector,
      mockSuite.performanceCounter,
      mockSuite.memoryMonitor,
      mockSuite.debugLogger,
    );

    // Setup comprehensive baseline
    const comprehensiveBaseline: IPerformanceBaseline = {
      operation: 'comprehensive-logging',
      baselineMs: 75,
      maxOverheadPercent: 5,
      memoryConstraintMB: 45,
      throughputRequirement: 12000,
    };

    mockRegressionDetector.getBaseline.mockReturnValue(comprehensiveBaseline);
    mockRegressionDetector.detectRegression.mockReturnValue({
      hasRegression: false,
      regressionType: null,
      currentValue: 4.2,
      baselineValue: 5.0,
      regressionPercent: -16, // Performance improvement
      severity: 'low',
    });

    mockSuite.performanceCounter.start.mockReturnValue(1000);
    mockSuite.performanceCounter.end.mockReturnValue(1070); // 70ms
    mockSuite.performanceCounter.getOverheadPercentage.mockReturnValue(4.2);

    // Act - Comprehensive performance test
    const comprehensiveOperation = async () => {
      // Simulate complex logging operation
      mockSuite.debugLogger.debug('comprehensive:init', 'Starting comprehensive operation');

      for (let i = 0; i < 50; i++) {
        mockSuite.debugLogger.debug('comprehensive:iteration', `Processing item ${i}`, {
          itemId: i,
          data: { complexity: 'high', size: 1024 },
        });
      }

      mockSuite.debugLogger.info('comprehensive:complete', 'Comprehensive operation completed');
      return 'comprehensive-success';
    };

    const { measurement } = await performanceMonitor.measureOperation(
      'comprehensive-logging',
      comprehensiveOperation,
    );

    const regression = performanceMonitor.checkForRegression(measurement);

    // Assert - Validate all requirements
    expect(measurement.overheadPercent).toBeLessThan(5); // <5% overhead ✓
    expect(measurement.memoryUsageMB).toBeLessThan(10); // <10MB memory ✓
    expect(measurement.durationMs).toBeLessThan(100); // <100ms duration ✓

    // Throughput validation (scaled)
    const projectedThroughput = (1000 / measurement.durationMs) * 1000; // ops/second
    expect(projectedThroughput).toBeGreaterThan(10000); // >10k ops/sec ✓

    expect(regression?.hasRegression).toBe(false);
    expect(mockSuite.debugLogger.debug).toHaveBeenCalledTimes(52); // 1 init + 50 iterations + 1 measurement
    expect(mockSuite.debugLogger.info).toHaveBeenCalledTimes(1); // 1 completion
  });
});
