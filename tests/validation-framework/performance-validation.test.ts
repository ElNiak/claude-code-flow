/**
 * Performance Validation Testing Framework
 * Benchmarking, load testing, and performance regression detection
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PerformanceTester } from './core-framework.test';
import { performance } from 'perf_hooks';

// Performance metrics interfaces
interface PerformanceMetrics {
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  latency: number;
  errorRate: number;
}

interface BenchmarkResult {
  name: string;
  metrics: PerformanceMetrics;
  passed: boolean;
  baseline?: PerformanceMetrics;
  regression?: number;
}

interface LoadTestConfig {
  concurrency: number;
  duration: number;
  rampUpTime: number;
  requests: number;
}

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: number = 0;
  private samples: PerformanceMetrics[] = [];

  start(): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  stop(): PerformanceMetrics {
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const metrics: PerformanceMetrics = {
      duration: endTime - this.startTime,
      memoryUsage: endMemory - this.startMemory,
      cpuUsage: this.getCPUUsage(),
      throughput: 0, // Calculated separately
      latency: endTime - this.startTime,
      errorRate: 0 // Calculated separately
    };

    this.samples.push(metrics);
    return metrics;
  }

  getSamples(): PerformanceMetrics[] {
    return [...this.samples];
  }

  getAverageMetrics(): PerformanceMetrics {
    if (this.samples.length === 0) {
      return {
        duration: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        throughput: 0,
        latency: 0,
        errorRate: 0
      };
    }

    const sum = this.samples.reduce((acc, sample) => ({
      duration: acc.duration + sample.duration,
      memoryUsage: acc.memoryUsage + sample.memoryUsage,
      cpuUsage: acc.cpuUsage + sample.cpuUsage,
      throughput: acc.throughput + sample.throughput,
      latency: acc.latency + sample.latency,
      errorRate: acc.errorRate + sample.errorRate
    }), {
      duration: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      throughput: 0,
      latency: 0,
      errorRate: 0
    });

    const count = this.samples.length;
    return {
      duration: sum.duration / count,
      memoryUsage: sum.memoryUsage / count,
      cpuUsage: sum.cpuUsage / count,
      throughput: sum.throughput / count,
      latency: sum.latency / count,
      errorRate: sum.errorRate / count
    };
  }

  private getCPUUsage(): number {
    // Simplified CPU usage calculation
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000; // Convert to milliseconds
  }

  reset(): void {
    this.samples = [];
  }
}

// Load testing framework
class LoadTester {
  private activeRequests: number = 0;
  private completedRequests: number = 0;
  private errors: number = 0;
  private results: Array<{ duration: number; success: boolean }> = [];

  async runLoadTest(
    operation: () => Promise<any>,
    config: LoadTestConfig
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    throughput: number;
    errorRate: number;
  }> {
    this.reset();

    const startTime = performance.now();
    const promises: Promise<void>[] = [];

    // Ramp up phase
    const rampUpDelay = config.rampUpTime / config.concurrency;
    
    for (let i = 0; i < config.concurrency; i++) {
      promises.push(
        this.delay(i * rampUpDelay).then(() =>
          this.runWorker(operation, config.duration)
        )
      );
    }

    await Promise.all(promises);

    const totalTime = performance.now() - startTime;
    const latencies = this.results.map(r => r.duration);

    return {
      totalRequests: this.completedRequests,
      successfulRequests: this.completedRequests - this.errors,
      failedRequests: this.errors,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length || 0,
      maxLatency: Math.max(...latencies) || 0,
      minLatency: Math.min(...latencies) || 0,
      throughput: (this.completedRequests / totalTime) * 1000, // requests per second
      errorRate: this.errors / this.completedRequests || 0
    };
  }

  private async runWorker(operation: () => Promise<any>, duration: number): Promise<void> {
    const endTime = performance.now() + duration;

    while (performance.now() < endTime) {
      this.activeRequests++;
      const requestStart = performance.now();

      try {
        await operation();
        const requestEnd = performance.now();
        
        this.results.push({
          duration: requestEnd - requestStart,
          success: true
        });
      } catch (error) {
        const requestEnd = performance.now();
        
        this.results.push({
          duration: requestEnd - requestStart,
          success: false
        });
        
        this.errors++;
      }

      this.activeRequests--;
      this.completedRequests++;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private reset(): void {
    this.activeRequests = 0;
    this.completedRequests = 0;
    this.errors = 0;
    this.results = [];
  }
}

// Regression detection system
class RegressionDetector {
  private baselines: Map<string, PerformanceMetrics> = new Map();
  private thresholds = {
    duration: 0.20, // 20% increase is a regression
    memory: 0.30,   // 30% increase is a regression
    throughput: 0.15, // 15% decrease is a regression
    errorRate: 0.05   // 5% increase is a regression
  };

  setBaseline(name: string, metrics: PerformanceMetrics): void {
    this.baselines.set(name, { ...metrics });
  }

  detectRegression(name: string, current: PerformanceMetrics): {
    hasRegression: boolean;
    regressions: Array<{
      metric: string;
      baseline: number;
      current: number;
      change: number;
      severity: 'minor' | 'major' | 'critical';
    }>;
  } {
    const baseline = this.baselines.get(name);
    if (!baseline) {
      return { hasRegression: false, regressions: [] };
    }

    const regressions: Array<{
      metric: string;
      baseline: number;
      current: number;
      change: number;
      severity: 'minor' | 'major' | 'critical';
    }> = [];

    // Check duration regression
    const durationChange = (current.duration - baseline.duration) / baseline.duration;
    if (durationChange > this.thresholds.duration) {
      regressions.push({
        metric: 'duration',
        baseline: baseline.duration,
        current: current.duration,
        change: durationChange,
        severity: this.getSeverity(durationChange, this.thresholds.duration)
      });
    }

    // Check memory regression
    const memoryChange = (current.memoryUsage - baseline.memoryUsage) / Math.abs(baseline.memoryUsage || 1);
    if (memoryChange > this.thresholds.memory) {
      regressions.push({
        metric: 'memory',
        baseline: baseline.memoryUsage,
        current: current.memoryUsage,
        change: memoryChange,
        severity: this.getSeverity(memoryChange, this.thresholds.memory)
      });
    }

    // Check throughput regression (decrease is bad)
    const throughputChange = (baseline.throughput - current.throughput) / baseline.throughput;
    if (throughputChange > this.thresholds.throughput) {
      regressions.push({
        metric: 'throughput',
        baseline: baseline.throughput,
        current: current.throughput,
        change: -throughputChange, // Negative because decrease is bad
        severity: this.getSeverity(throughputChange, this.thresholds.throughput)
      });
    }

    // Check error rate regression
    const errorRateChange = current.errorRate - baseline.errorRate;
    if (errorRateChange > this.thresholds.errorRate) {
      regressions.push({
        metric: 'errorRate',
        baseline: baseline.errorRate,
        current: current.errorRate,
        change: errorRateChange,
        severity: this.getSeverity(errorRateChange, this.thresholds.errorRate)
      });
    }

    return {
      hasRegression: regressions.length > 0,
      regressions
    };
  }

  private getSeverity(change: number, threshold: number): 'minor' | 'major' | 'critical' {
    if (change > threshold * 3) return 'critical';
    if (change > threshold * 2) return 'major';
    return 'minor';
  }
}

// Scalability testing framework
class ScalabilityTester {
  async testScaling(
    operation: (scale: number) => Promise<PerformanceMetrics>,
    scales: number[]
  ): Promise<{
    results: Array<{ scale: number; metrics: PerformanceMetrics }>;
    scalingFactor: number;
    linearityCoefficient: number;
    recommendation: string;
  }> {
    const results: Array<{ scale: number; metrics: PerformanceMetrics }> = [];

    for (const scale of scales) {
      const metrics = await operation(scale);
      results.push({ scale, metrics });
    }

    // Calculate scaling characteristics
    const scalingFactor = this.calculateScalingFactor(results);
    const linearityCoefficient = this.calculateLinearity(results);
    const recommendation = this.generateRecommendation(scalingFactor, linearityCoefficient);

    return {
      results,
      scalingFactor,
      linearityCoefficient,
      recommendation
    };
  }

  private calculateScalingFactor(results: Array<{ scale: number; metrics: PerformanceMetrics }>): number {
    if (results.length < 2) return 1;

    const first = results[0];
    const last = results[results.length - 1];

    const scaleRatio = last.scale / first.scale;
    const durationRatio = last.metrics.duration / first.metrics.duration;

    return durationRatio / scaleRatio;
  }

  private calculateLinearity(results: Array<{ scale: number; metrics: PerformanceMetrics }>): number {
    if (results.length < 3) return 1;

    // Calculate R² for linear regression
    const n = results.length;
    const sumX = results.reduce((sum, r) => sum + r.scale, 0);
    const sumY = results.reduce((sum, r) => sum + r.metrics.duration, 0);
    const sumXY = results.reduce((sum, r) => sum + r.scale * r.metrics.duration, 0);
    const sumX2 = results.reduce((sum, r) => sum + r.scale * r.scale, 0);
    const sumY2 = results.reduce((sum, r) => sum + r.metrics.duration * r.metrics.duration, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    const correlation = numerator / denominator;
    return correlation * correlation; // R²
  }

  private generateRecommendation(scalingFactor: number, linearity: number): string {
    if (scalingFactor < 1.2 && linearity > 0.8) {
      return 'Excellent scaling - near linear performance';
    } else if (scalingFactor < 2.0 && linearity > 0.6) {
      return 'Good scaling - acceptable performance degradation';
    } else if (scalingFactor < 5.0) {
      return 'Moderate scaling - consider optimization for large scales';
    } else {
      return 'Poor scaling - significant optimization needed';
    }
  }
}

describe('Performance Validation Tests', () => {
  let performanceTester: PerformanceTester;
  let performanceMonitor: PerformanceMonitor;
  let loadTester: LoadTester;
  let regressionDetector: RegressionDetector;
  let scalabilityTester: ScalabilityTester;

  beforeEach(() => {
    performanceTester = new PerformanceTester();
    performanceMonitor = new PerformanceMonitor();
    loadTester = new LoadTester();
    regressionDetector = new RegressionDetector();
    scalabilityTester = new ScalabilityTester();
  });

  afterEach(() => {
    performanceMonitor.reset();
  });

  describe('Validation Engine Performance', () => {
    it('should meet validation performance benchmarks', async () => {
      const MAX_VALIDATION_TIME = 100; // 100ms
      const MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB

      performanceTester.setThreshold('code_validation', MAX_VALIDATION_TIME, MAX_MEMORY_USAGE);

      const validationBenchmark = async () => {
        performanceMonitor.start();

        // Mock validation operations
        const operations = [
          () => new Promise(resolve => setTimeout(resolve, Math.random() * 50)),
          () => new Promise(resolve => setTimeout(resolve, Math.random() * 30)),
          () => new Promise(resolve => setTimeout(resolve, Math.random() * 20)),
        ];

        await Promise.all(operations.map(op => op()));

        return performanceMonitor.stop();
      };

      performanceTester.registerBenchmark('code_validation', validationBenchmark);

      const result = await performanceTester.runBenchmark('code_validation');

      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(MAX_VALIDATION_TIME);
      expect(result.memoryUsage).toBeLessThan(MAX_MEMORY_USAGE);

      console.log(`Validation benchmark: ${result.duration.toFixed(2)}ms, ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle large code samples efficiently', async () => {
      const LARGE_CODE_SIZE = 100000; // 100KB
      const MAX_PROCESSING_TIME = 500; // 500ms

      const largeCodeValidation = async () => {
        performanceMonitor.start();

        // Simulate processing large code
        const largeCode = 'function test() { return true; }\n'.repeat(LARGE_CODE_SIZE / 30);
        
        // Mock complex validation processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
        
        // Simulate syntax parsing
        const lines = largeCode.split('\n');
        for (let i = 0; i < Math.min(lines.length, 1000); i++) {
          // Simulate processing without actually doing expensive operations
          if (lines[i].includes('function')) {
            // Mock function analysis
          }
        }

        return performanceMonitor.stop();
      };

      performanceTester.registerBenchmark('large_code_validation', largeCodeValidation);
      performanceTester.setThreshold('large_code_validation', MAX_PROCESSING_TIME, 100 * 1024 * 1024);

      const result = await performanceTester.runBenchmark('large_code_validation');

      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(MAX_PROCESSING_TIME);
    });

    it('should scale linearly with input size', async () => {
      const testScaling = async (scale: number): Promise<PerformanceMetrics> => {
        performanceMonitor.start();

        // Simulate processing that should scale linearly
        const operations = Math.floor(scale * 10);
        for (let i = 0; i < operations; i++) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        return performanceMonitor.stop();
      };

      const scales = [1, 2, 4, 8, 16];
      const result = await scalabilityTester.testScaling(testScaling, scales);

      expect(result.scalingFactor).toBeLessThan(2.0); // Should be close to linear
      expect(result.linearityCoefficient).toBeGreaterThan(0.7); // Good correlation

      console.log(`Scaling factor: ${result.scalingFactor.toFixed(2)}`);
      console.log(`Linearity: ${(result.linearityCoefficient * 100).toFixed(1)}%`);
      console.log(`Recommendation: ${result.recommendation}`);
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent validation requests', async () => {
      const concurrentValidation = async () => {
        // Mock validation operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
        
        if (Math.random() < 0.05) { // 5% error rate
          throw new Error('Simulated validation error');
        }
        
        return { isValid: true, confidence: 0.9 };
      };

      const loadConfig: LoadTestConfig = {
        concurrency: 10,
        duration: 5000, // 5 seconds
        rampUpTime: 1000, // 1 second ramp up
        requests: 100
      };

      const result = await loadTester.runLoadTest(concurrentValidation, loadConfig);

      expect(result.errorRate).toBeLessThan(0.1); // Less than 10% errors
      expect(result.throughput).toBeGreaterThan(5); // At least 5 requests/second
      expect(result.averageLatency).toBeLessThan(100); // Less than 100ms average

      console.log(`Load test results:`);
      console.log(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
      console.log(`  Average latency: ${result.averageLatency.toFixed(2)}ms`);
      console.log(`  Error rate: ${(result.errorRate * 100).toFixed(2)}%`);
      console.log(`  Total requests: ${result.totalRequests}`);
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedOperation = async () => {
        // Simulate memory-intensive operation
        const data = new Array(1000).fill(0).map(() => Math.random());
        
        // Mock processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
        
        return data.reduce((a, b) => a + b, 0);
      };

      const sustainedConfig: LoadTestConfig = {
        concurrency: 5,
        duration: 10000, // 10 seconds
        rampUpTime: 2000, // 2 second ramp up
        requests: 200
      };

      const result = await loadTester.runLoadTest(sustainedOperation, sustainedConfig);

      // Performance should remain stable over time
      expect(result.errorRate).toBeLessThan(0.05); // Less than 5% errors
      expect(result.maxLatency / result.averageLatency).toBeLessThan(3); // Max latency not too much higher than average

      console.log(`Sustained load test results:`);
      console.log(`  Max latency: ${result.maxLatency.toFixed(2)}ms`);
      console.log(`  Min latency: ${result.minLatency.toFixed(2)}ms`);
      console.log(`  Latency ratio: ${(result.maxLatency / result.averageLatency).toFixed(2)}`);
    });
  });

  describe('Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // Set baseline performance
      const baselineMetrics: PerformanceMetrics = {
        duration: 100,
        memoryUsage: 1024 * 1024, // 1MB
        cpuUsage: 50,
        throughput: 100,
        latency: 50,
        errorRate: 0.01
      };

      regressionDetector.setBaseline('validation_benchmark', baselineMetrics);

      // Simulate regressed performance
      const regressedMetrics: PerformanceMetrics = {
        duration: 150, // 50% slower
        memoryUsage: 1.5 * 1024 * 1024, // 50% more memory
        cpuUsage: 75,
        throughput: 80, // 20% lower throughput
        latency: 75,
        errorRate: 0.08 // Much higher error rate
      };

      const result = regressionDetector.detectRegression('validation_benchmark', regressedMetrics);

      expect(result.hasRegression).toBe(true);
      expect(result.regressions.length).toBeGreaterThan(0);

      const durationRegression = result.regressions.find(r => r.metric === 'duration');
      expect(durationRegression).toBeDefined();
      expect(durationRegression!.severity).toBe('major');

      console.log('Detected regressions:');
      result.regressions.forEach(regression => {
        console.log(`  ${regression.metric}: ${(regression.change * 100).toFixed(1)}% (${regression.severity})`);
      });
    });

    it('should not flag minor performance variations', async () => {
      const baselineMetrics: PerformanceMetrics = {
        duration: 100,
        memoryUsage: 1024 * 1024,
        cpuUsage: 50,
        throughput: 100,
        latency: 50,
        errorRate: 0.01
      };

      regressionDetector.setBaseline('stable_benchmark', baselineMetrics);

      // Simulate minor variation (within acceptable range)
      const minorVariationMetrics: PerformanceMetrics = {
        duration: 110, // 10% slower (below 20% threshold)
        memoryUsage: 1.1 * 1024 * 1024, // 10% more memory (below 30% threshold)
        cpuUsage: 55,
        throughput: 95, // 5% lower throughput (below 15% threshold)
        latency: 55,
        errorRate: 0.02 // Minor increase (below 5% threshold)
      };

      const result = regressionDetector.detectRegression('stable_benchmark', minorVariationMetrics);

      expect(result.hasRegression).toBe(false);
      expect(result.regressions.length).toBe(0);
    });
  });

  describe('Memory Performance', () => {
    it('should not have memory leaks during repeated operations', async () => {
      const iterations = 100;
      const memoryReadings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Simulate validation operation
        performanceMonitor.start();
        
        // Create some temporary objects
        const tempData = new Array(1000).fill(0).map(() => ({
          id: Math.random(),
          data: new Array(100).fill(Math.random())
        }));

        // Process data
        await new Promise(resolve => setTimeout(resolve, 10));

        const metrics = performanceMonitor.stop();
        memoryReadings.push(process.memoryUsage().heapUsed);

        // Force garbage collection periodically (if available)
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      // Analyze memory trend
      const firstHalf = memoryReadings.slice(0, iterations / 2);
      const secondHalf = memoryReadings.slice(iterations / 2);

      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const memoryGrowth = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

      expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% memory growth
      
      console.log(`Memory growth over ${iterations} iterations: ${(memoryGrowth * 100).toFixed(2)}%`);
      console.log(`Initial average: ${(firstHalfAvg / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final average: ${(secondHalfAvg / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle memory pressure gracefully', async () => {
      const memoryPressureTest = async () => {
        performanceMonitor.start();

        // Create significant memory pressure
        const largeArrays: number[][] = [];
        
        try {
          for (let i = 0; i < 100; i++) {
            largeArrays.push(new Array(10000).fill(Math.random()));
            
            // Simulate some processing
            await new Promise(resolve => setTimeout(resolve, 5));
            
            // Check if we're using too much memory
            const currentMemory = process.memoryUsage().heapUsed;
            if (currentMemory > 200 * 1024 * 1024) { // 200MB limit
              break;
            }
          }

          // Simulate validation under memory pressure
          await new Promise(resolve => setTimeout(resolve, 50));

          return performanceMonitor.stop();
        } finally {
          // Clean up
          largeArrays.length = 0;
          if (global.gc) {
            global.gc();
          }
        }
      };

      performanceTester.registerBenchmark('memory_pressure', memoryPressureTest);
      performanceTester.setThreshold('memory_pressure', 1000, 250 * 1024 * 1024); // 250MB limit

      const result = await performanceTester.runBenchmark('memory_pressure');

      expect(result.passed).toBe(true);
      console.log(`Memory pressure test: ${result.duration.toFixed(2)}ms, ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Concurrent Performance', () => {
    it('should maintain performance with multiple concurrent validations', async () => {
      const concurrentValidations = async (count: number) => {
        performanceMonitor.start();

        const promises = Array(count).fill(0).map(async (_, index) => {
          // Simulate validation operation
          await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));
          
          return {
            id: index,
            isValid: Math.random() > 0.1, // 90% valid
            confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
          };
        });

        const results = await Promise.all(promises);
        const metrics = performanceMonitor.stop();

        return {
          ...metrics,
          throughput: count / (metrics.duration / 1000), // operations per second
          errorRate: results.filter(r => !r.isValid).length / results.length
        };
      };

      const concurrencyLevels = [1, 5, 10, 20, 50];
      const results: Array<{ scale: number; metrics: PerformanceMetrics }> = [];

      for (const level of concurrencyLevels) {
        const metrics = await concurrentValidations(level);
        results.push({ scale: level, metrics });
        
        console.log(`Concurrency ${level}: ${metrics.throughput.toFixed(2)} ops/s, ${metrics.duration.toFixed(2)}ms`);
      }

      // Check that throughput increases with concurrency (up to a point)
      const lowConcurrency = results.find(r => r.scale === 5)!;
      const mediumConcurrency = results.find(r => r.scale === 20)!;

      expect(mediumConcurrency.metrics.throughput).toBeGreaterThan(lowConcurrency.metrics.throughput * 0.8);
    });
  });
});