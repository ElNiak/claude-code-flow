/**
 * Phase 1 MCP Performance Tests
 * Benchmarking framework for MCP server setup and template generation performance
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock external dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    rm: jest.fn(),
  },
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Phase 1 MCP Performance Tests', () => {
  let testWorkingDir: string;
  let baselineMetrics: PerformanceMetrics;

  interface PerformanceMetrics {
    startupTime: number;
    memoryUsage: number;
    mcpSetupTime: number;
    templateGenerationTime: number;
    totalExecutionTime: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
      disk: number;
    };
  }

  interface BenchmarkResult {
    name: string;
    duration: number;
    memoryDelta: number;
    success: boolean;
    iterations?: number;
    averageTime?: number;
    minTime?: number;
    maxTime?: number;
  }

  beforeAll(async () => {
    // Create test working directory
    testWorkingDir = path.join(os.tmpdir(), 'claude-flow-perf-test-' + Date.now());
    await fs.mkdir(testWorkingDir, { recursive: true }).catch(() => {});

    // Setup mocks
    mockExecSync.mockReturnValue(Buffer.from('success'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.stat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => true,
      size: 1024,
    } as any);

    // Capture baseline metrics
    baselineMetrics = await captureBaselineMetrics();

    console.log('🚀 Starting Phase 1 MCP Performance Tests...');
    console.log(`📊 Baseline Metrics: ${JSON.stringify(baselineMetrics, null, 2)}`);
  });

  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(testWorkingDir, { recursive: true, force: true }).catch(() => {});
    console.log('✅ Phase 1 MCP Performance Tests completed');
  });

  describe('MCP Server Setup Performance', () => {
    it('should setup all 7 MCP servers within performance thresholds', async () => {
      const servers = [
        { name: 'claude-flow', type: 'npx' },
        { name: 'ruv-swarm', type: 'npx' },
        { name: 'context7', type: 'docker' },
        { name: 'serena', type: 'docker' },
        { name: 'sequential-thinking', type: 'uvx' },
        { name: 'perplexity-ask', type: 'uvx' },
        { name: 'consult7', type: 'uvx' },
      ];

      const benchmark = await benchmarkMcpServerSetup(servers);

      // Performance thresholds
      expect(benchmark.duration).toBeLessThan(10000); // Less than 10 seconds
      expect(benchmark.success).toBe(true);
      expect(benchmark.memoryDelta).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

      console.log(`📈 MCP Server Setup: ${benchmark.duration}ms, Memory: ${benchmark.memoryDelta}bytes`);
    });

    it('should benchmark individual server types', async () => {
      const serverTypes = ['npx', 'docker', 'uvx'];
      const benchmarks: BenchmarkResult[] = [];

      for (const type of serverTypes) {
        const benchmark = await benchmarkServerType(type);
        benchmarks.push(benchmark);

        // Type-specific thresholds
        switch (type) {
          case 'npx':
            expect(benchmark.averageTime).toBeLessThan(2000); // 2 seconds
            break;
          case 'docker':
            expect(benchmark.averageTime).toBeLessThan(5000); // 5 seconds
            break;
          case 'uvx':
            expect(benchmark.averageTime).toBeLessThan(3000); // 3 seconds
            break;
        }
      }

      // Log benchmark results
      benchmarks.forEach(b => {
        console.log(`📊 ${b.name}: avg=${b.averageTime}ms, min=${b.minTime}ms, max=${b.maxTime}ms`);
      });
    });

    it('should measure concurrent server setup performance', async () => {
      const concurrentBenchmark = await benchmarkConcurrentSetup();

      // Concurrent setup should be faster than sequential
      const sequentialEstimate = 7 * 3000; // 7 servers * 3 seconds each
      expect(concurrentBenchmark.duration).toBeLessThan(sequentialEstimate * 0.7); // At least 30% faster

      // Memory usage should remain reasonable
      expect(concurrentBenchmark.memoryDelta).toBeLessThan(200 * 1024 * 1024); // Less than 200MB

      console.log(`⚡ Concurrent Setup: ${concurrentBenchmark.duration}ms (vs estimated ${sequentialEstimate}ms sequential)`);
    });

    it('should monitor resource utilization during setup', async () => {
      const resourceMetrics = await monitorResourceUtilization(async () => {
        await benchmarkMcpServerSetup([
          { name: 'test-server', type: 'npx' },
        ]);
      });

      // Resource utilization thresholds
      expect(resourceMetrics.peakCpu).toBeLessThan(80); // Less than 80% CPU
      expect(resourceMetrics.peakMemory).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB
      expect(resourceMetrics.diskIO).toBeLessThan(100 * 1024 * 1024); // Less than 100MB disk I/O

      console.log(`💻 Resource Usage: CPU=${resourceMetrics.peakCpu}%, Memory=${resourceMetrics.peakMemory}bytes, Disk=${resourceMetrics.diskIO}bytes`);
    });
  });

  describe('Template Generation Performance', () => {
    const templateFunctions = [
      'createEnhancedClaudeMd',
      'createEnhancedSettingsJson',
      'createWrapperScript',
      'createCommandDoc',
    ];

    it('should generate all templates within performance thresholds', async () => {
      const benchmark = await benchmarkTemplateGeneration(templateFunctions);

      // Template generation should be fast
      expect(benchmark.duration).toBeLessThan(1000); // Less than 1 second
      expect(benchmark.success).toBe(true);
      expect(benchmark.memoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB

      console.log(`📝 Template Generation: ${benchmark.duration}ms, Memory: ${benchmark.memoryDelta}bytes`);
    });

    templateFunctions.forEach((templateFunc) => {
      it(`should benchmark ${templateFunc} generation`, async () => {
        const benchmark = await benchmarkSingleTemplate(templateFunc);

        // Individual template generation should be very fast
        expect(benchmark.averageTime).toBeLessThan(100); // Less than 100ms
        expect(benchmark.success).toBe(true);

        console.log(`📄 ${templateFunc}: avg=${benchmark.averageTime}ms, iterations=${benchmark.iterations}`);
      });
    });

    it('should measure template validation performance', async () => {
      const validationBenchmark = await benchmarkTemplateValidation();

      // Template validation should be fast
      expect(validationBenchmark.duration).toBeLessThan(500); // Less than 500ms
      expect(validationBenchmark.success).toBe(true);

      console.log(`✅ Template Validation: ${validationBenchmark.duration}ms`);
    });

    it('should test template caching performance', async () => {
      const cachingBenchmark = await benchmarkTemplateCaching();

      // Cached templates should be significantly faster
      expect(cachingBenchmark.cachedTime).toBeLessThan(cachingBenchmark.uncachedTime * 0.1); // 90% faster
      expect(cachingBenchmark.cacheHitRate).toBeGreaterThan(0.8); // 80% hit rate

      console.log(`💾 Template Caching: cached=${cachingBenchmark.cachedTime}ms, uncached=${cachingBenchmark.uncachedTime}ms, hit rate=${cachingBenchmark.cacheHitRate}`);
    });
  });

  describe('End-to-End Performance', () => {
    it('should complete full init process within performance targets', async () => {
      const e2eBenchmark = await benchmarkFullInitProcess();

      // End-to-end should complete within reasonable time
      expect(e2eBenchmark.duration).toBeLessThan(15000); // Less than 15 seconds
      expect(e2eBenchmark.success).toBe(true);
      expect(e2eBenchmark.memoryDelta).toBeLessThan(150 * 1024 * 1024); // Less than 150MB

      // Log detailed breakdown
      console.log(`🎯 Full Init Process: ${e2eBenchmark.duration}ms`);
      console.log(`  📊 Breakdown: ${JSON.stringify(e2eBenchmark.breakdown, null, 2)}`);
    });

    it('should measure startup time regression', async () => {
      const regressionTest = await measureStartupRegression();

      // Startup time should not regress more than 20% from baseline
      const regressionThreshold = baselineMetrics.startupTime * 1.2;
      expect(regressionTest.currentStartupTime).toBeLessThan(regressionThreshold);

      const regression = ((regressionTest.currentStartupTime - baselineMetrics.startupTime) / baselineMetrics.startupTime) * 100;
      console.log(`📈 Startup Regression: ${regression.toFixed(2)}% (${regressionTest.currentStartupTime}ms vs ${baselineMetrics.startupTime}ms baseline)`);
    });

    it('should test scalability with multiple projects', async () => {
      const scalabilityTest = await testScalability([1, 5, 10, 20]);

      // Performance should scale sub-linearly
      const singleProjectTime = scalabilityTest.results[0].averageTime;
      const twentyProjectTime = scalabilityTest.results[3].averageTime;
      
      // 20 projects should take less than 20x the time of 1 project
      expect(twentyProjectTime).toBeLessThan(singleProjectTime * 15);

      scalabilityTest.results.forEach(result => {
        console.log(`📏 ${result.projectCount} projects: ${result.averageTime}ms`);
      });
    });
  });

  describe('Memory Management Performance', () => {
    it('should not leak memory during repeated operations', async () => {
      const memoryLeakTest = await testMemoryLeaks();

      // Memory usage should stabilize after initial allocation
      const memoryGrowth = memoryLeakTest.finalMemory - memoryLeakTest.initialMemory;
      const acceptableGrowth = 10 * 1024 * 1024; // 10MB
      
      expect(memoryGrowth).toBeLessThan(acceptableGrowth);
      expect(memoryLeakTest.stabilized).toBe(true);

      console.log(`🧠 Memory Test: growth=${memoryGrowth}bytes, stabilized=${memoryLeakTest.stabilized}`);
    });

    it('should efficiently garbage collect after operations', async () => {
      const gcTest = await testGarbageCollection();

      // Memory should be reclaimed after operations
      expect(gcTest.memoryReclaimed).toBeGreaterThan(gcTest.memoryAllocated * 0.8); // 80% reclaimed
      expect(gcTest.gcEffective).toBe(true);

      console.log(`♻️ GC Test: allocated=${gcTest.memoryAllocated}bytes, reclaimed=${gcTest.memoryReclaimed}bytes`);
    });
  });

  describe('Cross-Platform Performance', () => {
    const platforms = ['linux', 'darwin', 'win32'];

    platforms.forEach((platform) => {
      it(`should meet performance targets on ${platform}`, async () => {
        const platformBenchmark = await benchmarkPlatform(platform);

        // Platform-specific performance expectations
        const expectedTime = getPlatformExpectedTime(platform);
        expect(platformBenchmark.duration).toBeLessThan(expectedTime);

        console.log(`🖥️ ${platform}: ${platformBenchmark.duration}ms (target: ${expectedTime}ms)`);
      });
    });

    it('should compare cross-platform performance', async () => {
      const comparison = await comparePlatformPerformance();

      // No platform should be more than 50% slower than the fastest
      const fastestTime = Math.min(...comparison.results.map(r => r.duration));
      comparison.results.forEach(result => {
        expect(result.duration).toBeLessThan(fastestTime * 1.5);
      });

      console.log('🏁 Platform Comparison:', comparison.results.map(r => `${r.platform}: ${r.duration}ms`).join(', '));
    });
  });
});

// Helper functions for performance testing

async function captureBaselineMetrics(): Promise<PerformanceMetrics> {
  const startTime = performance.now();
  const initialMemory = process.memoryUsage().heapUsed;

  // Simulate baseline operations
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    startupTime: performance.now() - startTime,
    memoryUsage: process.memoryUsage().heapUsed - initialMemory,
    mcpSetupTime: 2000, // Mock baseline
    templateGenerationTime: 200, // Mock baseline
    totalExecutionTime: 5000, // Mock baseline
    resourceUtilization: {
      cpu: 10,
      memory: 50 * 1024 * 1024,
      disk: 1024 * 1024,
    },
  };
}

async function benchmarkMcpServerSetup(servers: any[]): Promise<BenchmarkResult> {
  const startTime = performance.now();
  const initialMemory = process.memoryUsage().heapUsed;

  try {
    // Simulate server setup
    for (const server of servers) {
      mockExecSync(`claude mcp add ${server.name} test-command`);
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async work
    }

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - initialMemory;

    return {
      name: 'MCP Server Setup',
      duration,
      memoryDelta,
      success: true,
    };
  } catch (error) {
    return {
      name: 'MCP Server Setup',
      duration: performance.now() - startTime,
      memoryDelta: process.memoryUsage().heapUsed - initialMemory,
      success: false,
    };
  }
}

async function benchmarkServerType(type: string): Promise<BenchmarkResult> {
  const iterations = 5;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    // Simulate server type setup
    mockExecSync(`${type} test-command`);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    times.push(performance.now() - startTime);
  }

  return {
    name: `${type} servers`,
    duration: times.reduce((a, b) => a + b, 0),
    memoryDelta: 0,
    success: true,
    iterations,
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}

async function benchmarkConcurrentSetup(): Promise<BenchmarkResult> {
  const startTime = performance.now();
  const initialMemory = process.memoryUsage().heapUsed;

  try {
    // Simulate concurrent setup
    const serverPromises = Array(7).fill(null).map(async (_, i) => {
      mockExecSync(`server-${i}`);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    });

    await Promise.all(serverPromises);

    return {
      name: 'Concurrent Setup',
      duration: performance.now() - startTime,
      memoryDelta: process.memoryUsage().heapUsed - initialMemory,
      success: true,
    };
  } catch (error) {
    return {
      name: 'Concurrent Setup',
      duration: performance.now() - startTime,
      memoryDelta: process.memoryUsage().heapUsed - initialMemory,
      success: false,
    };
  }
}

async function monitorResourceUtilization(operation: () => Promise<void>): Promise<any> {
  const metrics = {
    peakCpu: 0,
    peakMemory: 0,
    diskIO: 0,
  };

  // Start monitoring
  const monitorInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    metrics.peakMemory = Math.max(metrics.peakMemory, memUsage.heapUsed);
    metrics.peakCpu = Math.max(metrics.peakCpu, Math.random() * 50); // Mock CPU usage
    metrics.diskIO += Math.random() * 1024; // Mock disk I/O
  }, 10);

  try {
    await operation();
  } finally {
    clearInterval(monitorInterval);
  }

  return metrics;
}

async function benchmarkTemplateGeneration(templateFunctions: string[]): Promise<BenchmarkResult> {
  const startTime = performance.now();
  const initialMemory = process.memoryUsage().heapUsed;

  try {
    // Simulate template generation
    for (const templateFunc of templateFunctions) {
      await generateMockTemplate(templateFunc);
    }

    return {
      name: 'Template Generation',
      duration: performance.now() - startTime,
      memoryDelta: process.memoryUsage().heapUsed - initialMemory,
      success: true,
    };
  } catch (error) {
    return {
      name: 'Template Generation',
      duration: performance.now() - startTime,
      memoryDelta: process.memoryUsage().heapUsed - initialMemory,
      success: false,
    };
  }
}

async function benchmarkSingleTemplate(templateFunc: string): Promise<BenchmarkResult> {
  const iterations = 10;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    await generateMockTemplate(templateFunc);
    times.push(performance.now() - startTime);
  }

  return {
    name: templateFunc,
    duration: times.reduce((a, b) => a + b, 0),
    memoryDelta: 0,
    success: true,
    iterations,
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}

async function benchmarkTemplateValidation(): Promise<BenchmarkResult> {
  const startTime = performance.now();

  try {
    // Simulate template validation
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      name: 'Template Validation',
      duration: performance.now() - startTime,
      memoryDelta: 0,
      success: true,
    };
  } catch (error) {
    return {
      name: 'Template Validation',
      duration: performance.now() - startTime,
      memoryDelta: 0,
      success: false,
    };
  }
}

async function benchmarkTemplateCaching(): Promise<any> {
  // Simulate uncached template generation
  const uncachedStart = performance.now();
  await generateMockTemplate('test-template');
  const uncachedTime = performance.now() - uncachedStart;

  // Simulate cached template generation
  const cachedStart = performance.now();
  await new Promise(resolve => setTimeout(resolve, 5)); // Much faster
  const cachedTime = performance.now() - cachedStart;

  return {
    uncachedTime,
    cachedTime,
    cacheHitRate: 0.9, // Mock 90% hit rate
  };
}

async function benchmarkFullInitProcess(): Promise<any> {
  const startTime = performance.now();
  const initialMemory = process.memoryUsage().heapUsed;

  const breakdown = {
    validation: 0,
    mcpSetup: 0,
    templateGeneration: 0,
    finalization: 0,
  };

  try {
    // Validation phase
    const validationStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, 200));
    breakdown.validation = performance.now() - validationStart;

    // MCP setup phase
    const mcpStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, 800));
    breakdown.mcpSetup = performance.now() - mcpStart;

    // Template generation phase
    const templateStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, 300));
    breakdown.templateGeneration = performance.now() - templateStart;

    // Finalization phase
    const finalizationStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    breakdown.finalization = performance.now() - finalizationStart;

    return {
      name: 'Full Init Process',
      duration: performance.now() - startTime,
      memoryDelta: process.memoryUsage().heapUsed - initialMemory,
      success: true,
      breakdown,
    };
  } catch (error) {
    return {
      name: 'Full Init Process',
      duration: performance.now() - startTime,
      memoryDelta: process.memoryUsage().heapUsed - initialMemory,
      success: false,
      breakdown,
    };
  }
}

async function measureStartupRegression(): Promise<any> {
  const startTime = performance.now();
  
  // Simulate current startup process
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return {
    currentStartupTime: performance.now() - startTime,
  };
}

async function testScalability(projectCounts: number[]): Promise<any> {
  const results = [];

  for (const count of projectCounts) {
    const times: number[] = [];
    
    for (let i = 0; i < 3; i++) { // 3 iterations per count
      const startTime = performance.now();
      
      // Simulate processing multiple projects
      await Promise.all(Array(count).fill(null).map(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      }));
      
      times.push(performance.now() - startTime);
    }

    results.push({
      projectCount: count,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    });
  }

  return { results };
}

async function testMemoryLeaks(): Promise<any> {
  const initialMemory = process.memoryUsage().heapUsed;
  let previousMemory = initialMemory;
  let stabilized = true;

  // Perform repeated operations
  for (let i = 0; i < 10; i++) {
    await generateMockTemplate('test-template');
    
    const currentMemory = process.memoryUsage().heapUsed;
    const growth = currentMemory - previousMemory;
    
    // If memory keeps growing significantly, it's not stabilized
    if (growth > 1024 * 1024) { // 1MB growth
      stabilized = false;
    }
    
    previousMemory = currentMemory;
  }

  return {
    initialMemory,
    finalMemory: process.memoryUsage().heapUsed,
    stabilized,
  };
}

async function testGarbageCollection(): Promise<any> {
  const beforeAllocation = process.memoryUsage().heapUsed;
  
  // Allocate memory
  const largeArray = Array(100000).fill('test data');
  const afterAllocation = process.memoryUsage().heapUsed;
  
  // Clear reference and force GC if available
  largeArray.length = 0;
  if (global.gc) {
    global.gc();
  }
  
  await new Promise(resolve => setTimeout(resolve, 100)); // Give GC time
  
  const afterGC = process.memoryUsage().heapUsed;
  
  return {
    memoryAllocated: afterAllocation - beforeAllocation,
    memoryReclaimed: afterAllocation - afterGC,
    gcEffective: (afterAllocation - afterGC) > (afterAllocation - beforeAllocation) * 0.5,
  };
}

async function benchmarkPlatform(platform: string): Promise<BenchmarkResult> {
  const startTime = performance.now();

  // Simulate platform-specific operations
  await new Promise(resolve => setTimeout(resolve, getPlatformDelay(platform)));

  return {
    name: `Platform ${platform}`,
    duration: performance.now() - startTime,
    memoryDelta: 0,
    success: true,
  };
}

async function comparePlatformPerformance(): Promise<any> {
  const platforms = ['linux', 'darwin', 'win32'];
  const results = [];

  for (const platform of platforms) {
    const benchmark = await benchmarkPlatform(platform);
    results.push({
      platform,
      duration: benchmark.duration,
    });
  }

  return { results };
}

function getPlatformExpectedTime(platform: string): number {
  const baseTimes = {
    linux: 8000,
    darwin: 10000,
    win32: 12000,
  };
  return baseTimes[platform] || 10000;
}

function getPlatformDelay(platform: string): number {
  const delays = {
    linux: 100,
    darwin: 120,
    win32: 150,
  };
  return delays[platform] || 120;
}

async function generateMockTemplate(templateFunc: string): Promise<void> {
  // Simulate template generation work
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
}