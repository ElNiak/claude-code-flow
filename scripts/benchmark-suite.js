#!/usr/bin/env node

/**
 * CLI Performance Benchmark Suite
 *
 * Comprehensive benchmarking system for CLI performance analysis
 * Measures startup time, command execution, memory usage, and throughput
 *
 * @version 2.0.0
 * @author Test Framework Builder Agent
 */

import chalk from 'chalk';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { performance } from 'perf_hooks';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * Performance Benchmark Suite
 */
class BenchmarkSuite {
  constructor(options = {}) {
    this.options = {
      iterations: options.iterations || 10,
      warmupRuns: options.warmupRuns || 3,
      timeout: options.timeout || 30000,
      detailed: options.detailed || false,
      baseline: options.baseline || null,
      outputFormat: options.outputFormat || 'both',
      ...options
    };

    this.results = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      benchmarks: new Map(),
      summary: {},
      comparisons: null
    };

    this.cliPath = path.join(projectRoot, 'dist/cli/simple-cli.js');
    this.startTime = Date.now();
  }

  /**
   * Get system environment information
   */
  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg()
    };
  }

  /**
   * Logger
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString().substr(11, 8);
    const prefix = `[${timestamp}]`;

    switch (level) {
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
        break;
      case 'info':
        console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
        break;
      case 'debug':
        if (this.options.verbose) {
          console.log(chalk.gray(`${prefix} 🔍 ${message}`));
        }
        break;
    }
  }

  /**
   * Execute command and measure performance
   */
  async measureCommand(command, args = [], options = {}) {
    const iterations = options.iterations || this.options.iterations;
    const warmup = options.warmup || this.options.warmupRuns;

    // Warmup runs
    this.log(`Warming up with ${warmup} runs...`, 'debug');
    for (let i = 0; i < warmup; i++) {
      await this.singleRun(command, args);
    }

    // Actual measurements
    const measurements = [];

    for (let i = 0; i < iterations; i++) {
      this.log(`Iteration ${i + 1}/${iterations}`, 'debug');
      const result = await this.singleRun(command, args);
      if (result.success) {
        measurements.push(result);
      }

      // Small delay between runs to avoid system pressure
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.analyzeMetrics(measurements);
  }

  /**
   * Single command execution run
   */
  async singleRun(command, args = []) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return new Promise((resolve) => {
      const fullCommand = `node ${this.cliPath} ${command} ${args.join(' ')}`.trim();

      const child = spawn('node', [this.cliPath, command, ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: projectRoot
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: 'Timeout',
          duration: performance.now() - startTime
        });
      }, this.options.timeout);

      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        const endTime = performance.now();
        const endMemory = process.memoryUsage();

        resolve({
          success: exitCode === 0,
          exitCode,
          duration: endTime - startTime,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          memory: {
            heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
            heapTotal: (endMemory.heapTotal - startMemory.heapTotal) / 1024 / 1024,
            rss: (endMemory.rss - startMemory.rss) / 1024 / 1024,
            external: (endMemory.external - startMemory.external) / 1024 / 1024
          },
          cpuUsage: process.cpuUsage ? process.cpuUsage() : null
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message,
          duration: performance.now() - startTime
        });
      });
    });
  }

  /**
   * Analyze measurement metrics
   */
  analyzeMetrics(measurements) {
    if (measurements.length === 0) {
      return { error: 'No successful measurements' };
    }

    const durations = measurements.map(m => m.duration);
    const memoryUsages = measurements.map(m => m.memory.rss);

    durations.sort((a, b) => a - b);
    memoryUsages.sort((a, b) => a - b);

    return {
      count: measurements.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        mean: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
        stdDev: this.standardDeviation(durations)
      },
      memory: {
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        mean: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        median: this.percentile(memoryUsages, 50),
        p95: this.percentile(memoryUsages, 95)
      },
      throughput: {
        opsPerSec: 1000 / (durations.reduce((a, b) => a + b, 0) / durations.length),
        totalTime: durations.reduce((a, b) => a + b, 0)
      },
      stability: {
        coefficient: this.standardDeviation(durations) / (durations.reduce((a, b) => a + b, 0) / durations.length),
        consistent: this.standardDeviation(durations) < 100 // Less than 100ms std dev
      },
      rawMeasurements: measurements
    };
  }

  /**
   * Calculate percentile
   */
  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate standard deviation
   */
  standardDeviation(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squaredDiffs = arr.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Define benchmark suite
   */
  getBenchmarkSuite() {
    return [
      {
        category: 'Startup Performance',
        benchmarks: [
          {
            name: 'cold_startup',
            command: '--version',
            description: 'Cold startup time (version check)',
            iterations: 15,
            warmup: 2
          },
          {
            name: 'help_display',
            command: '--help',
            description: 'Help system performance',
            iterations: 10,
            warmup: 2
          }
        ]
      },

      {
        category: 'Core Commands',
        benchmarks: [
          {
            name: 'status_check',
            command: 'status',
            description: 'System status check',
            iterations: 10
          },
          {
            name: 'status_json',
            command: 'status',
            args: ['--json'],
            description: 'JSON status output',
            iterations: 10
          },
          {
            name: 'config_get',
            command: 'config',
            args: ['get'],
            description: 'Configuration retrieval',
            iterations: 8
          }
        ]
      },

      {
        category: 'Agent Operations',
        benchmarks: [
          {
            name: 'agent_list',
            command: 'agent',
            args: ['list'],
            description: 'Agent listing performance',
            iterations: 8
          },
          {
            name: 'agent_status',
            command: 'agent',
            args: ['status'],
            description: 'Agent status check',
            iterations: 8
          }
        ]
      },

      {
        category: 'Memory Operations',
        benchmarks: [
          {
            name: 'memory_stats',
            command: 'memory',
            args: ['stats'],
            description: 'Memory statistics',
            iterations: 8
          },
          {
            name: 'memory_list',
            command: 'memory',
            args: ['list'],
            description: 'Memory listing',
            iterations: 8
          }
        ]
      },

      {
        category: 'Swarm Operations',
        benchmarks: [
          {
            name: 'swarm_status',
            command: 'swarm',
            args: ['status'],
            description: 'Swarm status check',
            iterations: 8
          },
          {
            name: 'swarm_list',
            command: 'swarm',
            args: ['list'],
            description: 'Swarm listing',
            iterations: 8
          }
        ]
      },

      {
        category: 'Advanced Features',
        benchmarks: [
          {
            name: 'mcp_status',
            command: 'mcp',
            args: ['status'],
            description: 'MCP server status',
            iterations: 6
          },
          {
            name: 'task_list',
            command: 'task',
            args: ['list'],
            description: 'Task listing',
            iterations: 6
          }
        ]
      }
    ];
  }

  /**
   * Run benchmark category
   */
  async runBenchmarkCategory(category) {
    this.log(`\n📊 Benchmarking ${category.category}`, 'info');

    const results = new Map();

    for (const benchmark of category.benchmarks) {
      this.log(`  Running: ${benchmark.name} - ${benchmark.description}`, 'info');

      const result = await this.measureCommand(
        benchmark.command,
        benchmark.args || [],
        {
          iterations: benchmark.iterations || this.options.iterations,
          warmup: benchmark.warmup || this.options.warmupRuns
        }
      );

      results.set(benchmark.name, {
        ...benchmark,
        ...result,
        timestamp: new Date().toISOString()
      });

      if (!result.error) {
        this.log(`    ✅ Average: ${result.duration.mean.toFixed(2)}ms, P95: ${result.duration.p95.toFixed(2)}ms`, 'success');
      } else {
        this.log(`    ❌ Failed: ${result.error}`, 'error');
      }
    }

    this.results.benchmarks.set(category.category, results);
    return results;
  }

  /**
   * Generate benchmark summary
   */
  generateSummary() {
    let totalBenchmarks = 0;
    let successfulBenchmarks = 0;
    let totalMeasurements = 0;

    const categoryStats = new Map();
    const overallMetrics = {
      durations: [],
      memoryUsages: []
    };

    for (const [categoryName, benchmarks] of this.results.benchmarks) {
      const categoryMetrics = { durations: [], memoryUsages: [], count: 0 };

      for (const [benchmarkName, result] of benchmarks) {
        totalBenchmarks++;

        if (!result.error) {
          successfulBenchmarks++;
          totalMeasurements += result.count;

          categoryMetrics.durations.push(result.duration.mean);
          categoryMetrics.memoryUsages.push(result.memory.mean);
          categoryMetrics.count++;

          overallMetrics.durations.push(result.duration.mean);
          overallMetrics.memoryUsages.push(result.memory.mean);
        }
      }

      if (categoryMetrics.count > 0) {
        categoryStats.set(categoryName, {
          averageDuration: categoryMetrics.durations.reduce((a, b) => a + b, 0) / categoryMetrics.durations.length,
          averageMemory: categoryMetrics.memoryUsages.reduce((a, b) => a + b, 0) / categoryMetrics.memoryUsages.length,
          benchmarkCount: categoryMetrics.count
        });
      }
    }

    this.results.summary = {
      totalTime: Date.now() - this.startTime,
      totalBenchmarks,
      successfulBenchmarks,
      failedBenchmarks: totalBenchmarks - successfulBenchmarks,
      totalMeasurements,
      successRate: totalBenchmarks > 0 ? ((successfulBenchmarks / totalBenchmarks) * 100).toFixed(2) : 0,
      overall: overallMetrics.durations.length > 0 ? {
        averageDuration: overallMetrics.durations.reduce((a, b) => a + b, 0) / overallMetrics.durations.length,
        fastestCommand: Math.min(...overallMetrics.durations),
        slowestCommand: Math.max(...overallMetrics.durations),
        averageMemoryUsage: overallMetrics.memoryUsages.reduce((a, b) => a + b, 0) / overallMetrics.memoryUsages.length
      } : null,
      categories: Object.fromEntries(categoryStats)
    };
  }

  /**
   * Compare with baseline if provided
   */
  async compareWithBaseline() {
    if (!this.options.baseline) return;

    this.log('📈 Comparing with baseline...', 'info');

    try {
      const baselineData = await readFile(this.options.baseline, 'utf8');
      const baseline = JSON.parse(baselineData);

      const comparisons = new Map();

      for (const [categoryName, benchmarks] of this.results.benchmarks) {
        const categoryComparisons = new Map();

        for (const [benchmarkName, current] of benchmarks) {
          const baselineBenchmark = baseline.benchmarks?.[categoryName]?.[benchmarkName];

          if (baselineBenchmark && !current.error && !baselineBenchmark.error) {
            const durationChange = ((current.duration.mean - baselineBenchmark.duration.mean) / baselineBenchmark.duration.mean) * 100;
            const memoryChange = ((current.memory.mean - baselineBenchmark.memory.mean) / baselineBenchmark.memory.mean) * 100;

            categoryComparisons.set(benchmarkName, {
              duration: {
                current: current.duration.mean,
                baseline: baselineBenchmark.duration.mean,
                change: durationChange,
                improvement: durationChange < 0
              },
              memory: {
                current: current.memory.mean,
                baseline: baselineBenchmark.memory.mean,
                change: memoryChange,
                improvement: memoryChange < 0
              },
              p95: {
                current: current.duration.p95,
                baseline: baselineBenchmark.duration.p95,
                change: ((current.duration.p95 - baselineBenchmark.duration.p95) / baselineBenchmark.duration.p95) * 100
              }
            });
          }
        }

        if (categoryComparisons.size > 0) {
          comparisons.set(categoryName, categoryComparisons);
        }
      }

      this.results.comparisons = Object.fromEntries(comparisons.entries().map(([k, v]) => [k, Object.fromEntries(v)]));

      this.log('Baseline comparison completed', 'success');
    } catch (error) {
      this.log(`Failed to compare with baseline: ${error.message}`, 'warning');
    }
  }

  /**
   * Export results in JSON format
   */
  async exportJSON() {
    const jsonData = {
      timestamp: this.results.timestamp,
      environment: this.results.environment,
      summary: this.results.summary,
      benchmarks: Object.fromEntries(
        Array.from(this.results.benchmarks.entries()).map(([k, v]) => [k, Object.fromEntries(v)])
      ),
      comparisons: this.results.comparisons,
      options: this.options
    };

    const outputPath = path.join(projectRoot, 'benchmark-results.json');
    await writeFile(outputPath, JSON.stringify(jsonData, null, 2));

    return outputPath;
  }

  /**
   * Export results in Markdown format
   */
  async exportMarkdown() {
    let md = `# Claude Flow CLI - Performance Benchmark Report

Generated: ${this.results.timestamp}

## 🖥️ Environment Information

| Property | Value |
|----------|-------|
| **Node Version** | ${this.results.environment.nodeVersion} |
| **Platform** | ${this.results.environment.platform} |
| **Architecture** | ${this.results.environment.arch} |
| **CPU Cores** | ${this.results.environment.cpus} |
| **Total Memory** | ${this.results.environment.memory} |
| **System Load** | ${this.results.environment.loadavg.map(l => l.toFixed(2)).join(', ')} |

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Benchmarks** | ${this.results.summary.totalBenchmarks} |
| **Successful** | ${this.results.summary.successfulBenchmarks} (${this.results.summary.successRate}%) |
| **Failed** | ${this.results.summary.failedBenchmarks} |
| **Total Measurements** | ${this.results.summary.totalMeasurements} |
| **Test Duration** | ${(this.results.summary.totalTime / 1000).toFixed(2)}s |

`;

    if (this.results.summary.overall) {
      md += `| **Average Command Time** | ${this.results.summary.overall.averageDuration.toFixed(2)}ms |
| **Fastest Command** | ${this.results.summary.overall.fastestCommand.toFixed(2)}ms |
| **Slowest Command** | ${this.results.summary.overall.slowestCommand.toFixed(2)}ms |
| **Average Memory Usage** | ${this.results.summary.overall.averageMemoryUsage.toFixed(2)}MB |

`;
    }

    // Benchmark results by category
    for (const [categoryName, benchmarks] of this.results.benchmarks) {
      md += `## ${categoryName}\n\n`;
      md += `| Benchmark | Status | Mean | Min | Max | P95 | P99 | Memory | Ops/sec |\n`;
      md += `|-----------|--------|------|-----|-----|-----|-----|--------|----------|\n`;

      for (const [benchmarkName, result] of benchmarks) {
        if (result.error) {
          md += `| ${result.description} | ❌ Failed | - | - | - | - | - | - | - |\n`;
        } else {
          const status = result.stability.consistent ? '✅' : '⚠️';
          md += `| ${result.description} | ${status} | ${result.duration.mean.toFixed(2)}ms | ${result.duration.min.toFixed(2)}ms | ${result.duration.max.toFixed(2)}ms | ${result.duration.p95.toFixed(2)}ms | ${result.duration.p99.toFixed(2)}ms | ${result.memory.mean.toFixed(2)}MB | ${result.throughput.opsPerSec.toFixed(2)} |\n`;
        }
      }
      md += '\n';
    }

    // Baseline comparison if available
    if (this.results.comparisons) {
      md += `## 📈 Baseline Comparison\n\n`;

      for (const [categoryName, comparisons] of Object.entries(this.results.comparisons)) {
        md += `### ${categoryName}\n\n`;
        md += `| Benchmark | Current | Baseline | Duration Change | Memory Change | P95 Change |\n`;
        md += `|-----------|---------|----------|-----------------|---------------|-----------|\n`;

        for (const [benchmarkName, comparison] of Object.entries(comparisons)) {
          const durationIcon = comparison.duration.improvement ? '🟢' : '🔴';
          const memoryIcon = comparison.memory.improvement ? '🟢' : '🔴';

          md += `| ${benchmarkName} | ${comparison.duration.current.toFixed(2)}ms | ${comparison.duration.baseline.toFixed(2)}ms | ${durationIcon} ${comparison.duration.change.toFixed(2)}% | ${memoryIcon} ${comparison.memory.change.toFixed(2)}% | ${comparison.p95.change.toFixed(2)}% |\n`;
        }
        md += '\n';
      }
    }

    md += `## 🎯 Performance Analysis

### Key Findings:

`;

    // Add performance insights
    if (this.results.summary.overall) {
      if (this.results.summary.overall.averageDuration < 1000) {
        md += `- ✅ Excellent overall performance with ${this.results.summary.overall.averageDuration.toFixed(2)}ms average response time\n`;
      } else if (this.results.summary.overall.averageDuration < 3000) {
        md += `- ⚠️ Good performance with ${this.results.summary.overall.averageDuration.toFixed(2)}ms average response time\n`;
      } else {
        md += `- 🔴 Performance concerns with ${this.results.summary.overall.averageDuration.toFixed(2)}ms average response time\n`;
      }
    }

    // Category performance
    for (const [categoryName, stats] of Object.entries(this.results.summary.categories)) {
      if (stats.averageDuration < 1000) {
        md += `- ✅ ${categoryName}: Fast (${stats.averageDuration.toFixed(2)}ms avg)\n`;
      } else if (stats.averageDuration < 2000) {
        md += `- ⚠️ ${categoryName}: Moderate (${stats.averageDuration.toFixed(2)}ms avg)\n`;
      } else {
        md += `- 🔴 ${categoryName}: Slow (${stats.averageDuration.toFixed(2)}ms avg)\n`;
      }
    }

    md += `
### Recommendations:

1. **Monitor Performance Regularly** - Run this benchmark suite as part of your CI/CD pipeline
2. **Focus on Slow Commands** - Prioritize optimization for commands taking >2 seconds
3. **Memory Optimization** - Commands using >50MB should be investigated
4. **Consistency Checks** - Commands with high variance need stability improvements

---
*Benchmark generated by Claude Flow CLI Performance Suite v2.0.0*
`;

    const outputPath = path.join(projectRoot, 'benchmark-results.md');
    await writeFile(outputPath, md);

    return outputPath;
  }

  /**
   * Main execution method
   */
  async run() {
    this.log('🚀 Starting Performance Benchmark Suite', 'info');
    this.log(`Environment: Node ${this.results.environment.nodeVersion} on ${this.results.environment.platform}`, 'debug');

    try {
      // Run all benchmark categories
      const suite = this.getBenchmarkSuite();

      for (const category of suite) {
        await this.runBenchmarkCategory(category);
      }

      // Generate summary and comparisons
      this.generateSummary();
      await this.compareWithBaseline();

      // Export results
      const outputs = [];

      if (this.options.outputFormat === 'json' || this.options.outputFormat === 'both') {
        const jsonPath = await this.exportJSON();
        outputs.push(jsonPath);
        this.log(`JSON results saved: ${jsonPath}`, 'success');
      }

      if (this.options.outputFormat === 'markdown' || this.options.outputFormat === 'both') {
        const mdPath = await this.exportMarkdown();
        outputs.push(mdPath);
        this.log(`Markdown report saved: ${mdPath}`, 'success');
      }

      // Display summary
      this.displaySummary();

      return {
        success: this.results.summary.failedBenchmarks === 0,
        summary: this.results.summary,
        outputs
      };

    } catch (error) {
      this.log(`Benchmark failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Display final summary
   */
  displaySummary() {
    console.log('\n' + '='.repeat(80));
    console.log(chalk.bold.blue('📊 PERFORMANCE BENCHMARK SUMMARY'));
    console.log('='.repeat(80));

    const summary = this.results.summary;

    console.log(`\n🎯 Results:`);
    console.log(`   Total Benchmarks: ${summary.totalBenchmarks}`);
    console.log(`   Successful: ${chalk.green(summary.successfulBenchmarks)} (${summary.successRate}%)`);
    console.log(`   Failed: ${chalk.red(summary.failedBenchmarks)}`);
    console.log(`   Total Measurements: ${summary.totalMeasurements}`);
    console.log(`   Duration: ${(summary.totalTime / 1000).toFixed(2)}s`);

    if (summary.overall) {
      console.log(`\n⚡ Performance:`);
      console.log(`   Average Time: ${chalk.cyan(summary.overall.averageDuration.toFixed(2))}ms`);
      console.log(`   Fastest Command: ${chalk.green(summary.overall.fastestCommand.toFixed(2))}ms`);
      console.log(`   Slowest Command: ${chalk.yellow(summary.overall.slowestCommand.toFixed(2))}ms`);
      console.log(`   Average Memory: ${chalk.blue(summary.overall.averageMemoryUsage.toFixed(2))}MB`);
    }

    console.log(`\n📊 Category Performance:`);
    for (const [category, stats] of Object.entries(summary.categories)) {
      const performanceColor = stats.averageDuration < 1000 ? chalk.green :
                              stats.averageDuration < 2000 ? chalk.yellow : chalk.red;
      console.log(`   ${category}: ${performanceColor(stats.averageDuration.toFixed(2))}ms avg (${stats.benchmarkCount} benchmarks)`);
    }

    console.log('\n' + '='.repeat(80));
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    iterations: parseInt(args.find(arg => arg.startsWith('--iterations='))?.split('=')[1]) || 10,
    warmupRuns: parseInt(args.find(arg => arg.startsWith('--warmup='))?.split('=')[1]) || 3,
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 30000,
    detailed: args.includes('--detailed'),
    baseline: args.find(arg => arg.startsWith('--baseline='))?.split('=')[1] || null,
    outputFormat: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'both',
    help: args.includes('--help') || args.includes('-h')
  };

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(chalk.bold.blue(`
Claude Flow CLI - Performance Benchmark Suite v2.0.0

Usage:
  node scripts/benchmark-suite.js [options]

Options:
  -v, --verbose              Show detailed output
  --iterations=<num>         Number of iterations per benchmark (default: 10)
  --warmup=<num>             Number of warmup runs (default: 3)
  --timeout=<ms>             Timeout per command (default: 30000)
  --detailed                 Include detailed measurements
  --baseline=<file>          Compare against baseline results
  --output=<format>          Output format: json, markdown, both (default: both)
  -h, --help                 Show this help

Examples:
  node scripts/benchmark-suite.js
  node scripts/benchmark-suite.js --iterations=20 --verbose
  node scripts/benchmark-suite.js --baseline=previous-results.json
  node scripts/benchmark-suite.js --output=json --detailed

Features:
  • Comprehensive performance measurement with percentiles
  • Memory usage tracking
  • Baseline comparison for regression detection
  • Statistical analysis with stability metrics
  • Detailed reporting in JSON and Markdown formats
`));
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const benchmark = new BenchmarkSuite(options);

  try {
    const result = await benchmark.run();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Benchmark error:'), error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default BenchmarkSuite;
