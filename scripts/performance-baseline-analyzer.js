#!/usr/bin/env node
/**
 * Performance Baseline Analyzer for CLI Testing Hive Mind
 * Establishes Day 1 baselines and comprehensive performance benchmarking
 */

import { performance } from 'perf_hooks';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

class PerformanceBaselineAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      day: 'Day 1 Baseline',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cliVersion: null
      },
      metrics: {
        startup: {
          samples: [],
          statistics: {}
        },
        commands: {},
        buildTime: {},
        memory: {},
        fileSize: {}
      },
      recommendations: [],
      regressionThresholds: {
        startupTimeMs: 200,
        commandTimeMs: 300,
        memoryUsageMB: 100
      }
    };
  }

  async establishBaseline() {
    console.log('🎯 Establishing Day 1 Performance Baseline...\n');

    // Get CLI version
    try {
      const { stdout } = await execAsync('node dist/cli/simple-cli.js --version 2>/dev/null');
      this.results.environment.cliVersion = stdout.trim();
    } catch (error) {
      console.warn('⚠️ Could not get CLI version');
    }

    await this.measureStartupPerformance();
    await this.measureCommandPerformance();
    await this.measureBuildPerformance();
    await this.measureMemoryUsage();
    await this.analyzeFileSizes();
    this.generateRecommendations();

    return this.results;
  }

  async measureStartupPerformance() {
    console.log('⚡ Measuring CLI startup performance...');

    const samples = 15; // More samples for better statistical accuracy
    const times = [];

    for (let i = 0; i < samples; i++) {
      const start = performance.now();
      try {
        await execAsync('node dist/cli/simple-cli.js --version 2>/dev/null');
        const end = performance.now();
        times.push(end - start);

        if (i % 5 === 0) console.log(`  📊 Sample ${i + 1}/${samples}`);
      } catch (error) {
        console.error(`⚠️ Sample ${i + 1} failed:`, error.message);
      }
    }

    this.results.metrics.startup = {
      samples: times,
      statistics: {
        count: times.length,
        mean: this.calculateMean(times),
        median: this.calculateMedian(times),
        min: Math.min(...times),
        max: Math.max(...times),
        stdDev: this.calculateStdDev(times),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      }
    };

    console.log(`  ✅ Startup baseline: ${this.results.metrics.startup.statistics.mean.toFixed(2)}ms (avg)`);
  }

  async measureCommandPerformance() {
    console.log('⚙️ Measuring command execution performance...');

    const commands = [
      { cmd: '--help', name: 'help', critical: true },
      { cmd: 'config get', name: 'config-get', critical: true },
      { cmd: 'status --json', name: 'status', critical: false },
      { cmd: 'memory stats', name: 'memory', critical: false },
      { cmd: 'agents list', name: 'agents-list', critical: false }
    ];

    for (const { cmd, name, critical } of commands) {
      console.log(`  📈 Testing command: ${name}`);
      const times = [];

      for (let i = 0; i < 8; i++) { // 8 samples per command
        const start = performance.now();
        try {
          await execAsync(`node dist/cli/simple-cli.js ${cmd} 2>/dev/null`);
          const end = performance.now();
          times.push(end - start);
        } catch (error) {
          // Command may fail but we still measure execution time
          const end = performance.now();
          times.push(end - start);
        }
      }

      this.results.metrics.commands[name] = {
        command: cmd,
        critical,
        samples: times,
        statistics: {
          mean: this.calculateMean(times),
          median: this.calculateMedian(times),
          min: Math.min(...times),
          max: Math.max(...times),
          stdDev: this.calculateStdDev(times)
        }
      };
    }
  }

  async measureBuildPerformance() {
    console.log('🔨 Measuring build performance...');

    try {
      const start = performance.now();
      await execAsync('npm run clean 2>/dev/null');
      const cleanEnd = performance.now();

      const buildStart = performance.now();
      await execAsync('npm run build:tsx 2>/dev/null');
      const buildEnd = performance.now();

      this.results.metrics.buildTime = {
        clean: cleanEnd - start,
        build: buildEnd - buildStart,
        total: buildEnd - start
      };

      console.log(`  ✅ Build time: ${(buildEnd - buildStart).toFixed(2)}ms`);
    } catch (error) {
      console.warn('⚠️ Build performance measurement failed:', error.message);
      this.results.metrics.buildTime = { error: error.message };
    }
  }

  async measureMemoryUsage() {
    console.log('💾 Measuring memory usage...');

    const memoryCmd = `node -e "
      const start = process.memoryUsage();
      console.log(JSON.stringify({
        initial: start,
        heapUsedMB: start.heapUsed / 1024 / 1024,
        heapTotalMB: start.heapTotal / 1024 / 1024,
        rssMB: start.rss / 1024 / 1024,
        externalMB: start.external / 1024 / 1024
      }));
    "`;

    try {
      const { stdout } = await execAsync(memoryCmd);
      this.results.metrics.memory = JSON.parse(stdout);
    } catch (error) {
      console.warn('⚠️ Memory measurement failed:', error.message);
      this.results.metrics.memory = { error: error.message };
    }
  }

  async analyzeFileSizes() {
    console.log('📁 Analyzing file sizes...');

    const filesToAnalyze = [
      'dist/cli/simple-cli.js',
      'dist/cli/command-registry.js',
      'dist/cli/simple-orchestrator.js',
      'package.json',
      'package-lock.json'
    ];

    this.results.metrics.fileSize = {};

    for (const file of filesToAnalyze) {
      try {
        const { stdout } = await execAsync(`wc -c ${file} 2>/dev/null`);
        const bytes = parseInt(stdout.split(' ')[0]);
        this.results.metrics.fileSize[file] = {
          bytes,
          kilobytes: Math.round(bytes / 1024),
          megabytes: (bytes / 1024 / 1024).toFixed(2)
        };
      } catch (error) {
        this.results.metrics.fileSize[file] = { error: 'File not found' };
      }
    }
  }

  generateRecommendations() {
    console.log('💡 Generating performance recommendations...');

    const recs = [];
    const startupMean = this.results.metrics.startup.statistics.mean;

    // Startup time recommendations
    if (startupMean > 150) {
      recs.push({
        category: 'Startup Performance',
        severity: startupMean > 200 ? 'high' : 'medium',
        issue: `CLI startup time is ${startupMean.toFixed(2)}ms`,
        recommendation: 'Consider lazy loading heavy dependencies and reducing initial import cost',
        threshold: '< 150ms for good UX'
      });
    }

    // Command performance recommendations
    for (const [cmdName, cmdData] of Object.entries(this.results.metrics.commands)) {
      if (cmdData.statistics.mean > 200) {
        recs.push({
          category: 'Command Performance',
          severity: cmdData.critical ? 'high' : 'medium',
          issue: `Command '${cmdName}' takes ${cmdData.statistics.mean.toFixed(2)}ms`,
          recommendation: 'Optimize command execution path and reduce blocking operations',
          threshold: '< 200ms for responsive UX'
        });
      }
    }

    // File size recommendations
    const mainCliSize = this.results.metrics.fileSize['dist/cli/simple-cli.js'];
    if (mainCliSize && mainCliSize.kilobytes > 100) {
      recs.push({
        category: 'Bundle Size',
        severity: 'medium',
        issue: `Main CLI bundle is ${mainCliSize.kilobytes}KB`,
        recommendation: 'Consider code splitting and tree shaking to reduce bundle size',
        threshold: '< 100KB for fast loading'
      });
    }

    // General optimization recommendations
    recs.push({
      category: 'Optimization Opportunities',
      severity: 'low',
      issue: 'Performance baseline established',
      recommendation: 'Implement dynamic imports, command caching, and build optimizations',
      threshold: 'Continuous improvement'
    });

    this.results.recommendations = recs;
  }

  // Statistical helper methods
  calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculateStdDev(values) {
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * sorted.length;

    if (Math.floor(index) === index) {
      return sorted[index - 1];
    } else {
      const lower = sorted[Math.floor(index) - 1];
      const upper = sorted[Math.floor(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  async saveBaseline() {
    console.log('💾 Saving performance baseline...');

    const timestamp = new Date().toISOString().split('T')[0];
    const baselineFile = `performance-baseline-${timestamp}.json`;
    const reportFile = `performance-baseline-report-${timestamp}.md`;

    await writeFile(baselineFile, JSON.stringify(this.results, null, 2));

    const mdReport = this.generateMarkdownReport();
    await writeFile(reportFile, mdReport);

    // Also save as current baseline for comparisons
    await writeFile('performance-baseline-current.json', JSON.stringify(this.results, null, 2));

    console.log(`✅ Baseline saved to: ${baselineFile}`);
    console.log(`📄 Report saved to: ${reportFile}`);

    return { baselineFile, reportFile };
  }

  generateMarkdownReport() {
    const stats = this.results.metrics.startup.statistics;

    let report = `# Claude-Flow CLI Performance Baseline Report

**Generated:** ${this.results.timestamp}
**Environment:** ${this.results.environment.nodeVersion} on ${this.results.environment.platform}
**CLI Version:** ${this.results.environment.cliVersion || 'Unknown'}

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Startup Time (avg)** | ${stats.mean.toFixed(2)}ms | ${stats.mean < 150 ? '✅ Good' : stats.mean < 200 ? '⚠️ Fair' : '❌ Poor'} |
| **Startup Time (p95)** | ${stats.p95.toFixed(2)}ms | Statistical reliability |
| **Critical Issues** | ${this.results.recommendations.filter(r => r.severity === 'high').length} | Requires attention |

## ⚡ Startup Performance Analysis

| Statistic | Value |
|-----------|-------|
| Mean | ${stats.mean.toFixed(2)}ms |
| Median | ${stats.median.toFixed(2)}ms |
| Min | ${stats.min.toFixed(2)}ms |
| Max | ${stats.max.toFixed(2)}ms |
| Std Dev | ${stats.stdDev.toFixed(2)}ms |
| 95th Percentile | ${stats.p95.toFixed(2)}ms |
| 99th Percentile | ${stats.p99.toFixed(2)}ms |
| Sample Count | ${stats.count} |

## 📈 Command Performance Baseline

| Command | Mean (ms) | Median (ms) | Critical | Status |
|---------|-----------|-------------|----------|--------|
`;

    for (const [name, data] of Object.entries(this.results.metrics.commands)) {
      const status = data.statistics.mean < 150 ? '✅' : data.statistics.mean < 250 ? '⚠️' : '❌';
      report += `| ${name} | ${data.statistics.mean.toFixed(2)} | ${data.statistics.median.toFixed(2)} | ${data.critical ? '🔴' : '🟡'} | ${status} |\n`;
    }

    report += `\n## 💾 Memory Usage Baseline

| Metric | Value |
|--------|-------|
| Heap Used | ${this.results.metrics.memory.heapUsedMB?.toFixed(2) || 'N/A'} MB |
| Heap Total | ${this.results.metrics.memory.heapTotalMB?.toFixed(2) || 'N/A'} MB |
| RSS | ${this.results.metrics.memory.rssMB?.toFixed(2) || 'N/A'} MB |
| External | ${this.results.metrics.memory.externalMB?.toFixed(2) || 'N/A'} MB |

## 📁 File Size Analysis

| File | Size | Status |
|------|------|--------|
`;

    for (const [file, data] of Object.entries(this.results.metrics.fileSize)) {
      if (!data.error) {
        const status = data.kilobytes < 50 ? '✅' : data.kilobytes < 150 ? '⚠️' : '❌';
        report += `| ${file} | ${data.kilobytes} KB | ${status} |\n`;
      }
    }

    report += `\n## 🎯 Performance Recommendations

`;

    const groupedRecs = {};
    for (const rec of this.results.recommendations) {
      if (!groupedRecs[rec.category]) groupedRecs[rec.category] = [];
      groupedRecs[rec.category].push(rec);
    }

    for (const [category, recs] of Object.entries(groupedRecs)) {
      report += `### ${category}\n\n`;
      for (const rec of recs) {
        const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '⚠️' : '💡';
        report += `${icon} **${rec.issue}**\n`;
        report += `- **Recommendation:** ${rec.recommendation}\n`;
        report += `- **Target:** ${rec.threshold}\n\n`;
      }
    }

    report += `## 🔄 Regression Detection Thresholds

For future performance testing, these thresholds will trigger alerts:

- **Startup Time:** > ${this.results.regressionThresholds.startupTimeMs}ms
- **Command Time:** > ${this.results.regressionThresholds.commandTimeMs}ms
- **Memory Usage:** > ${this.results.regressionThresholds.memoryUsageMB}MB

## 📝 Next Steps

1. **Monitor Performance:** Regular benchmarking to detect regressions
2. **Optimize Imports:** Lazy load heavy dependencies
3. **Build Optimization:** Implement tree shaking and minification
4. **Command Optimization:** Profile and optimize slow commands
5. **Memory Management:** Monitor memory usage patterns

---
*This baseline report will be used for performance regression detection and optimization tracking.*
`;

    return report;
  }

  async run() {
    console.log('🚀 Starting Performance Baseline Analysis...\n');

    await this.establishBaseline();
    const files = await this.saveBaseline();

    console.log('\n✅ Performance baseline analysis complete!');
    console.log('\n📊 Summary:');
    console.log(`  Startup time: ${this.results.metrics.startup.statistics.mean.toFixed(2)}ms (avg)`);
    console.log(`  Commands tested: ${Object.keys(this.results.metrics.commands).length}`);
    console.log(`  Recommendations: ${this.results.recommendations.length}`);
    console.log(`  High priority issues: ${this.results.recommendations.filter(r => r.severity === 'high').length}`);

    return this.results;
  }
}

// Export for use in other scripts
export { PerformanceBaselineAnalyzer };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new PerformanceBaselineAnalyzer();
  analyzer.run().catch(console.error);
}
