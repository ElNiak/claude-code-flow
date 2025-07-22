#!/usr/bin/env node
/**
 * Performance Monitoring Setup
 * Sets up ongoing performance monitoring for the CLI system
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { performance } from 'perf_hooks';

class PerformanceMonitoringSetup {
  constructor() {
    this.monitoringConfig = {
      metrics: {
        startupTime: { threshold: 150, enabled: true },
        commandExecution: { threshold: 2000, enabled: true },
        memoryUsage: { threshold: 100, enabled: true },
        testExecution: { threshold: 30000, enabled: true },
      },
      alerting: {
        enabled: true,
        channels: ['console', 'file'],
        thresholds: {
          critical: 2.0, // 2x slower than baseline
          warning: 1.5,  // 1.5x slower than baseline
        },
      },
      reporting: {
        interval: '24h',
        retention: '30d',
        format: ['json', 'markdown'],
      },
    };
  }

  async setup() {
    console.log('📊 Setting up performance monitoring system...\n');

    try {
      await this.createMonitoringInfrastructure();
      await this.setupPerformanceHooks();
      await this.createDashboard();
      await this.setupAlertSystem();
      await this.createReportingSystem();
      await this.generateMonitoringGuide();

      console.log('\n✅ Performance monitoring system setup complete!');
      console.log('📈 Monitoring will track CLI performance and alert on regressions');
    } catch (error) {
      console.error('❌ Performance monitoring setup failed:', error);
      process.exit(1);
    }
  }

  async createMonitoringInfrastructure() {
    console.log('🏗️ Creating monitoring infrastructure...');

    await mkdir('.performance-monitor', { recursive: true });
    await mkdir('.performance-monitor/logs', { recursive: true });
    await mkdir('.performance-monitor/reports', { recursive: true });
    await mkdir('.performance-monitor/baselines', { recursive: true });

    // Performance collector
    const collector = `/**
 * Performance Data Collector
 * Collects and stores performance metrics
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

export class PerformanceCollector {
  constructor() {
    this.metricsDir = '.performance-monitor/logs';
    this.baselinesDir = '.performance-monitor/baselines';
    this.currentSession = {
      sessionId: Date.now().toString(),
      startTime: performance.now(),
      metrics: [],
    };
  }

  // Record a performance metric
  async recordMetric(type, name, duration, metadata = {}) {
    const metric = {
      type,
      name,
      duration,
      timestamp: Date.now(),
      session: this.currentSession.sessionId,
      metadata: {
        ...metadata,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    this.currentSession.metrics.push(metric);

    // Write to log file
    const logFile = join(this.metricsDir, \`\${new Date().toISOString().split('T')[0]}.json\`);
    await this.appendToLogFile(logFile, metric);

    // Check against thresholds
    await this.checkThresholds(metric);

    return metric;
  }

  // Load baseline metrics
  async loadBaseline(type, name) {
    try {
      const baselineFile = join(this.baselinesDir, \`\${type}-\${name}.json\`);
      const content = await fs.readFile(baselineFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  // Update baseline metrics
  async updateBaseline(type, name, metrics) {
    const baseline = {
      type,
      name,
      average: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      min: Math.min(...metrics.map(m => m.duration)),
      max: Math.max(...metrics.map(m => m.duration)),
      p95: this.calculatePercentile(metrics.map(m => m.duration), 0.95),
      count: metrics.length,
      lastUpdated: Date.now(),
    };

    const baselineFile = join(this.baselinesDir, \`\${type}-\${name}.json\`);
    await fs.writeFile(baselineFile, JSON.stringify(baseline, null, 2));

    return baseline;
  }

  // Append metric to daily log file
  async appendToLogFile(logFile, metric) {
    try {
      let existingData = [];
      try {
        const content = await fs.readFile(logFile, 'utf8');
        existingData = JSON.parse(content);
      } catch {
        // File doesn't exist or is empty
      }

      existingData.push(metric);
      await fs.writeFile(logFile, JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.error('Failed to write performance log:', error);
    }
  }

  // Check metric against thresholds
  async checkThresholds(metric) {
    const baseline = await this.loadBaseline(metric.type, metric.name);
    if (!baseline) return;

    const ratio = metric.duration / baseline.average;

    if (ratio >= 2.0) {
      await this.triggerAlert('critical', metric, baseline, ratio);
    } else if (ratio >= 1.5) {
      await this.triggerAlert('warning', metric, baseline, ratio);
    }
  }

  // Trigger performance alert
  async triggerAlert(level, metric, baseline, ratio) {
    const alert = {
      level,
      message: \`Performance regression detected: \${metric.name}\`,
      details: {
        current: \`\${metric.duration.toFixed(2)}ms\`,
        baseline: \`\${baseline.average.toFixed(2)}ms\`,
        regression: \`\${(ratio * 100).toFixed(1)}% of baseline\`,
        threshold: level === 'critical' ? '200%' : '150%',
      },
      timestamp: new Date().toISOString(),
    };

    console.warn(\`⚠️  [\${level.toUpperCase()}] \${alert.message}\`);
    console.warn(\`   Current: \${alert.details.current}, Baseline: \${alert.details.baseline}\`);

    // Write to alerts log
    const alertsFile = join(this.metricsDir, 'alerts.json');
    await this.appendToLogFile(alertsFile, alert);
  }

  // Calculate percentile
  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }

  // End session and generate summary
  async endSession() {
    const sessionSummary = {
      ...this.currentSession,
      endTime: performance.now(),
      duration: performance.now() - this.currentSession.startTime,
      totalMetrics: this.currentSession.metrics.length,
    };

    const sessionFile = join(this.metricsDir, \`session-\${this.currentSession.sessionId}.json\`);
    await fs.writeFile(sessionFile, JSON.stringify(sessionSummary, null, 2));

    return sessionSummary;
  }
}

// Singleton instance
export const performanceCollector = new PerformanceCollector();
`;

    await writeFile('.performance-monitor/collector.js', collector);
  }

  async setupPerformanceHooks() {
    console.log('🔗 Setting up performance hooks...');

    const hooks = `/**
 * Performance Monitoring Hooks
 * Automatic performance measurement hooks
 */

import { performanceCollector } from './collector.js';
import { performance } from 'perf_hooks';

// CLI Command Performance Hook
export function withCommandPerformance(commandName, commandFn) {
  return async function(...args) {
    const startTime = performance.now();

    try {
      const result = await commandFn.apply(this, args);
      const duration = performance.now() - startTime;

      await performanceCollector.recordMetric(
        'command',
        commandName,
        duration,
        {
          args: args.length,
          success: true,
        }
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await performanceCollector.recordMetric(
        'command',
        commandName,
        duration,
        {
          args: args.length,
          success: false,
          error: error.message,
        }
      );

      throw error;
    }
  };
}

// CLI Startup Performance Hook
export async function measureStartupTime() {
  const startTime = performance.now();

  // Hook into process ready event
  process.nextTick(async () => {
    const duration = performance.now() - startTime;
    await performanceCollector.recordMetric(
      'startup',
      'cli-init',
      duration,
      {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      }
    );
  });
}

// Test Execution Performance Hook
export function withTestPerformance(testName, testFn) {
  return async function(...args) {
    const startTime = performance.now();

    try {
      const result = await testFn.apply(this, args);
      const duration = performance.now() - startTime;

      await performanceCollector.recordMetric(
        'test',
        testName,
        duration,
        {
          success: true,
          type: 'unit',
        }
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await performanceCollector.recordMetric(
        'test',
        testName,
        duration,
        {
          success: false,
          error: error.message,
        }
      );

      throw error;
    }
  };
}

// Memory Usage Monitor
export class MemoryMonitor {
  static intervals = new Map();

  static start(name, intervalMs = 1000) {
    const interval = setInterval(async () => {
      const usage = process.memoryUsage();
      await performanceCollector.recordMetric(
        'memory',
        name,
        usage.heapUsed / 1024 / 1024, // Convert to MB
        {
          heapTotal: usage.heapTotal / 1024 / 1024,
          external: usage.external / 1024 / 1024,
          rss: usage.rss / 1024 / 1024,
        }
      );
    }, intervalMs);

    this.intervals.set(name, interval);
  }

  static stop(name) {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }

  static stopAll() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

// Auto-instrument CLI
export function instrumentCLI(cli) {
  // Hook into command execution
  const originalRun = cli.run;
  cli.run = async function(args) {
    await measureStartupTime();
    return withCommandPerformance('cli-run', originalRun).call(this, args);
  };

  // Start memory monitoring
  MemoryMonitor.start('cli-session', 5000);

  // Stop monitoring on exit
  process.on('exit', () => {
    MemoryMonitor.stopAll();
    performanceCollector.endSession();
  });

  return cli;
}
`;

    await writeFile('.performance-monitor/hooks.js', hooks);
  }

  async createDashboard() {
    console.log('📊 Creating performance dashboard...');

    const dashboard = `#!/usr/bin/env node
/**
 * Performance Dashboard
 * View current performance metrics and trends
 */

import { promises as fs } from 'fs';
import { join } from 'path';

class PerformanceDashboard {
  constructor() {
    this.metricsDir = '.performance-monitor/logs';
    this.baselinesDir = '.performance-monitor/baselines';
  }

  async showDashboard() {
    console.log('📊 Claude-Flow Performance Dashboard\\n');

    await this.showStartupMetrics();
    await this.showCommandMetrics();
    await this.showTestMetrics();
    await this.showMemoryMetrics();
    await this.showAlerts();

    console.log('\\n📈 Full reports available in .performance-monitor/reports/');
  }

  async showStartupMetrics() {
    console.log('🚀 Startup Performance:');
    console.log('─'.repeat(40));

    const baseline = await this.loadBaseline('startup', 'cli-init');
    if (baseline) {
      console.log(\`Average: \${baseline.average.toFixed(2)}ms\`);
      console.log(\`Best: \${baseline.min.toFixed(2)}ms\`);
      console.log(\`Worst: \${baseline.max.toFixed(2)}ms\`);
      console.log(\`P95: \${baseline.p95.toFixed(2)}ms\`);

      // Show trend
      const recent = await this.getRecentMetrics('startup', 'cli-init', 10);
      if (recent.length > 0) {
        const recentAvg = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
        const trend = ((recentAvg - baseline.average) / baseline.average * 100);
        const trendSymbol = trend > 5 ? '📈' : trend < -5 ? '📉' : '➡️';
        console.log(\`Recent trend: \${trendSymbol} \${trend.toFixed(1)}%\`);
      }
    } else {
      console.log('No baseline data available');
    }
  }

  async showCommandMetrics() {
    console.log('\\n⚡ Command Performance:');
    console.log('─'.repeat(40));

    const commands = await this.getUniqueCommands();
    for (const command of commands.slice(0, 5)) {
      const baseline = await this.loadBaseline('command', command);
      if (baseline) {
        console.log(\`\${command}: \${baseline.average.toFixed(2)}ms (avg)\`);
      }
    }
  }

  async showTestMetrics() {
    console.log('\\n🧪 Test Performance:');
    console.log('─'.repeat(40));

    const baseline = await this.loadBaseline('test', 'test-suite');
    if (baseline) {
      console.log(\`Average test duration: \${baseline.average.toFixed(2)}ms\`);
      console.log(\`Total tests: \${baseline.count}\`);
    } else {
      console.log('No test metrics available');
    }
  }

  async showMemoryMetrics() {
    console.log('\\n💾 Memory Usage:');
    console.log('─'.repeat(40));

    const baseline = await this.loadBaseline('memory', 'cli-session');
    if (baseline) {
      console.log(\`Average heap: \${baseline.average.toFixed(2)}MB\`);
      console.log(\`Peak usage: \${baseline.max.toFixed(2)}MB\`);
    } else {
      console.log('No memory metrics available');
    }
  }

  async showAlerts() {
    console.log('\\n⚠️  Recent Alerts:');
    console.log('─'.repeat(40));

    try {
      const alertsFile = join(this.metricsDir, 'alerts.json');
      const alerts = JSON.parse(await fs.readFile(alertsFile, 'utf8'));
      const recentAlerts = alerts.slice(-3);

      if (recentAlerts.length === 0) {
        console.log('No recent alerts ✅');
      } else {
        recentAlerts.forEach(alert => {
          console.log(\`[\${alert.level.toUpperCase()}] \${alert.message}\`);
          console.log(\`   \${alert.details.current} vs \${alert.details.baseline}\`);
        });
      }
    } catch {
      console.log('No alerts recorded');
    }
  }

  async loadBaseline(type, name) {
    try {
      const baselineFile = join(this.baselinesDir, \`\${type}-\${name}.json\`);
      return JSON.parse(await fs.readFile(baselineFile, 'utf8'));
    } catch {
      return null;
    }
  }

  async getRecentMetrics(type, name, count = 10) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = join(this.metricsDir, \`\${today}.json\`);
      const logs = JSON.parse(await fs.readFile(logFile, 'utf8'));

      return logs
        .filter(log => log.type === type && log.name === name)
        .slice(-count);
    } catch {
      return [];
    }
  }

  async getUniqueCommands() {
    try {
      const files = await fs.readdir(this.baselinesDir);
      return files
        .filter(f => f.startsWith('command-'))
        .map(f => f.replace('command-', '').replace('.json', ''));
    } catch {
      return [];
    }
  }
}

// Run dashboard
const dashboard = new PerformanceDashboard();
dashboard.showDashboard().catch(console.error);
`;

    await writeFile('.performance-monitor/dashboard.js', dashboard);
  }

  async setupAlertSystem() {
    console.log('🚨 Setting up alert system...');

    const alertSystem = `/**
 * Performance Alert System
 * Monitors performance and sends alerts on regressions
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export class AlertSystem {
  constructor(config) {
    this.config = config;
    this.alertsFile = '.performance-monitor/logs/alerts.json';
  }

  async checkPerformanceRegression(metric, baseline) {
    const ratio = metric.duration / baseline.average;

    if (ratio >= this.config.thresholds.critical) {
      return this.createAlert('critical', metric, baseline, ratio);
    } else if (ratio >= this.config.thresholds.warning) {
      return this.createAlert('warning', metric, baseline, ratio);
    }

    return null;
  }

  createAlert(level, metric, baseline, ratio) {
    return {
      id: Date.now().toString(),
      level,
      type: 'performance_regression',
      metric: {
        type: metric.type,
        name: metric.name,
        current: metric.duration,
        baseline: baseline.average,
      },
      regression: {
        ratio,
        percentage: (ratio * 100).toFixed(1) + '%',
      },
      timestamp: new Date().toISOString(),
      resolved: false,
    };
  }

  async sendAlert(alert) {
    // Console notification
    if (this.config.channels.includes('console')) {
      this.logAlert(alert);
    }

    // File notification
    if (this.config.channels.includes('file')) {
      await this.writeAlert(alert);
    }

    // Could add email, Slack, etc. here
  }

  logAlert(alert) {
    const symbol = alert.level === 'critical' ? '🔴' : '🟡';
    console.warn(\`\\n\${symbol} PERFORMANCE ALERT [\${alert.level.toUpperCase()}]\`);
    console.warn(\`   \${alert.metric.type}/\${alert.metric.name}\`);
    console.warn(\`   Current: \${alert.metric.current.toFixed(2)}ms\`);
    console.warn(\`   Baseline: \${alert.metric.baseline.toFixed(2)}ms\`);
    console.warn(\`   Regression: \${alert.regression.percentage}\\n\`);
  }

  async writeAlert(alert) {
    try {
      let alerts = [];
      try {
        const content = await fs.readFile(this.alertsFile, 'utf8');
        alerts = JSON.parse(content);
      } catch {
        // File doesn't exist
      }

      alerts.push(alert);

      // Keep only last 100 alerts
      if (alerts.length > 100) {
        alerts = alerts.slice(-100);
      }

      await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('Failed to write alert:', error);
    }
  }

  async getUnresolvedAlerts() {
    try {
      const content = await fs.readFile(this.alertsFile, 'utf8');
      const alerts = JSON.parse(content);
      return alerts.filter(alert => !alert.resolved);
    } catch {
      return [];
    }
  }

  async resolveAlert(alertId) {
    try {
      const content = await fs.readFile(this.alertsFile, 'utf8');
      const alerts = JSON.parse(content);

      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
        await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }
}
`;

    await writeFile('.performance-monitor/alerts.js', alertSystem);
  }

  async createReportingSystem() {
    console.log('📋 Creating reporting system...');

    const reporter = `#!/usr/bin/env node
/**
 * Performance Reporting System
 * Generate comprehensive performance reports
 */

import { promises as fs } from 'fs';
import { join } from 'path';

class PerformanceReporter {
  constructor() {
    this.metricsDir = '.performance-monitor/logs';
    this.baselinesDir = '.performance-monitor/baselines';
    this.reportsDir = '.performance-monitor/reports';
  }

  async generateDailyReport(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    console.log(\`📊 Generating daily performance report for \${dateStr}...\`);

    try {
      const logFile = join(this.metricsDir, \`\${dateStr}.json\`);
      const metrics = JSON.parse(await fs.readFile(logFile, 'utf8'));

      const report = {
        date: dateStr,
        summary: this.generateSummary(metrics),
        details: this.analyzeMetrics(metrics),
        recommendations: this.generateRecommendations(metrics),
        generatedAt: new Date().toISOString(),
      };

      // Write JSON report
      const reportFile = join(this.reportsDir, \`daily-\${dateStr}.json\`);
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Write markdown report
      const mdReport = this.generateMarkdownReport(report);
      const mdFile = join(this.reportsDir, \`daily-\${dateStr}.md\`);
      await fs.writeFile(mdFile, mdReport);

      console.log(\`✅ Report generated: \${reportFile}\`);
      return report;

    } catch (error) {
      console.error('Failed to generate daily report:', error);
      return null;
    }
  }

  generateSummary(metrics) {
    const groups = this.groupMetrics(metrics);

    return {
      totalMetrics: metrics.length,
      startupMetrics: groups.startup.length,
      commandMetrics: groups.command.length,
      testMetrics: groups.test.length,
      memoryMetrics: groups.memory.length,
      averageStartupTime: this.calculateAverage(groups.startup),
      averageCommandTime: this.calculateAverage(groups.command),
      peakMemoryUsage: this.calculateMax(groups.memory),
    };
  }

  analyzeMetrics(metrics) {
    const groups = this.groupMetrics(metrics);

    return {
      startup: this.analyzeGroup(groups.startup),
      commands: this.analyzeCommandGroups(groups.command),
      tests: this.analyzeGroup(groups.test),
      memory: this.analyzeGroup(groups.memory),
    };
  }

  groupMetrics(metrics) {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.type]) groups[metric.type] = [];
      groups[metric.type].push(metric);
      return groups;
    }, {});
  }

  analyzeGroup(metrics) {
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration);

    return {
      count: metrics.length,
      average: this.calculateAverage(metrics),
      min: Math.min(...durations),
      max: Math.max(...durations),
      p50: this.calculatePercentile(durations, 0.5),
      p95: this.calculatePercentile(durations, 0.95),
      p99: this.calculatePercentile(durations, 0.99),
    };
  }

  analyzeCommandGroups(commands) {
    const grouped = commands.reduce((groups, cmd) => {
      if (!groups[cmd.name]) groups[cmd.name] = [];
      groups[cmd.name].push(cmd);
      return groups;
    }, {});

    const analysis = {};
    for (const [name, metrics] of Object.entries(grouped)) {
      analysis[name] = this.analyzeGroup(metrics);
    }

    return analysis;
  }

  calculateAverage(metrics) {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
  }

  calculateMax(metrics) {
    if (metrics.length === 0) return 0;
    return Math.max(...metrics.map(m => m.duration));
  }

  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  generateRecommendations(metrics) {
    const recommendations = [];
    const groups = this.groupMetrics(metrics);

    // Startup time recommendations
    const startupAvg = this.calculateAverage(groups.startup || []);
    if (startupAvg > 200) {
      recommendations.push({
        category: 'Startup Performance',
        issue: \`Average startup time is \${startupAvg.toFixed(2)}ms\`,
        recommendation: 'Consider optimizing module loading and lazy initialization',
        priority: 'high',
      });
    }

    // Command performance recommendations
    if (groups.command) {
      const commandGroups = this.analyzeCommandGroups(groups.command);
      for (const [name, analysis] of Object.entries(commandGroups)) {
        if (analysis.average > 3000) {
          recommendations.push({
            category: 'Command Performance',
            issue: \`Command "\${name}" averages \${analysis.average.toFixed(2)}ms\`,
            recommendation: 'Profile and optimize this command execution',
            priority: 'medium',
          });
        }
      }
    }

    // Memory recommendations
    const memoryPeak = this.calculateMax(groups.memory || []);
    if (memoryPeak > 200) {
      recommendations.push({
        category: 'Memory Usage',
        issue: \`Peak memory usage: \${memoryPeak.toFixed(2)}MB\`,
        recommendation: 'Monitor for memory leaks and optimize data structures',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  generateMarkdownReport(report) {
    return \`# Daily Performance Report - \${report.date}

Generated: \${report.generatedAt}

## Summary

- **Total Metrics**: \${report.summary.totalMetrics}
- **Average Startup Time**: \${report.summary.averageStartupTime?.toFixed(2) || 'N/A'}ms
- **Average Command Time**: \${report.summary.averageCommandTime?.toFixed(2) || 'N/A'}ms
- **Peak Memory Usage**: \${report.summary.peakMemoryUsage?.toFixed(2) || 'N/A'}MB

## Performance Analysis

### Startup Performance
\${this.formatAnalysisSection(report.details.startup)}

### Command Performance
\${this.formatCommandAnalysis(report.details.commands)}

### Memory Usage
\${this.formatAnalysisSection(report.details.memory)}

## Recommendations

\${report.recommendations.map(rec => \`
### \${rec.category}

**Issue**: \${rec.issue}
**Recommendation**: \${rec.recommendation}
**Priority**: \${rec.priority}
\`).join('\\n')}

---
*Report generated by Claude-Flow Performance Monitor*
\`;
  }

  formatAnalysisSection(analysis) {
    if (!analysis) return 'No data available';

    return \`
- **Count**: \${analysis.count}
- **Average**: \${analysis.average.toFixed(2)}ms
- **Min/Max**: \${analysis.min.toFixed(2)}ms / \${analysis.max.toFixed(2)}ms
- **P95**: \${analysis.p95.toFixed(2)}ms
\`;
  }

  formatCommandAnalysis(commands) {
    if (!commands || Object.keys(commands).length === 0) {
      return 'No command data available';
    }

    let output = '\\n| Command | Avg | Min | Max | P95 |\\n|---------|-----|-----|-----|-----|\\n';

    for (const [name, analysis] of Object.entries(commands)) {
      output += \`| \${name} | \${analysis.average.toFixed(2)}ms | \${analysis.min.toFixed(2)}ms | \${analysis.max.toFixed(2)}ms | \${analysis.p95.toFixed(2)}ms |\\n\`;
    }

    return output;
  }
}

// Auto-run if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const reporter = new PerformanceReporter();
  reporter.generateDailyReport().catch(console.error);
}

export { PerformanceReporter };
`;

    await writeFile('.performance-monitor/reporter.js', reporter);
  }

  async generateMonitoringGuide() {
    console.log('📚 Generating monitoring guide...');

    const guide = `# Claude-Flow Performance Monitoring Guide

## Overview

The performance monitoring system tracks CLI performance metrics and alerts on regressions.

## Components

### 1. Performance Collector (collector.js)
- Collects and stores performance metrics
- Maintains baseline measurements
- Triggers alerts on performance regressions

### 2. Performance Hooks (hooks.js)
- Automatic instrumentation for CLI commands
- Startup time measurement
- Memory usage monitoring
- Test execution tracking

### 3. Dashboard (dashboard.js)
- Real-time performance overview
- Trend analysis
- Recent alerts display

### 4. Alert System (alerts.js)
- Performance regression detection
- Multi-channel alert delivery
- Alert resolution tracking

### 5. Reporting System (reporter.js)
- Daily performance reports
- Historical analysis
- Performance recommendations

## Usage

### Enable Monitoring
\`\`\`bash
# Instrument CLI for monitoring
import { instrumentCLI } from '.performance-monitor/hooks.js';
const cli = instrumentCLI(new CLI());
\`\`\`

### View Dashboard
\`\`\`bash
node .performance-monitor/dashboard.js
\`\`\`

### Generate Reports
\`\`\`bash
node .performance-monitor/reporter.js
\`\`\`

## Configuration

The monitoring system uses these thresholds:

- **Warning**: Performance >150% of baseline
- **Critical**: Performance >200% of baseline
- **Startup Target**: <150ms
- **Command Target**: <2000ms
- **Memory Target**: <100MB peak

## Monitoring Metrics

### Startup Performance
- CLI initialization time
- Module loading time
- First command readiness

### Command Performance
- Individual command execution times
- Argument parsing time
- Command loading time

### Memory Usage
- Heap usage over time
- Peak memory consumption
- Memory leak detection

### Test Performance
- Test suite execution time
- Individual test durations
- Test framework overhead

## Alert Handling

### Performance Regressions
When performance degrades:

1. Alert is logged to console
2. Alert is written to alerts.json
3. Dashboard shows alert status
4. Daily report includes regression analysis

### Resolution Process
1. Investigate performance regression
2. Apply optimization fixes
3. Mark alert as resolved
4. Monitor for improvement

## Rollback Validation (Day 7)

### Validation Checklist
- [ ] Startup time meets target (<150ms)
- [ ] No critical performance alerts
- [ ] Memory usage within limits
- [ ] Test execution performance maintained
- [ ] Command responsiveness acceptable

### Validation Script
\`\`\`bash
node scripts/validate-test-optimization.js
\`\`\`

### Rollback Decision Criteria
- Critical performance regressions
- Excessive memory usage
- Test execution timeouts
- User experience degradation

## Maintenance

### Daily Tasks
- Review performance dashboard
- Check for new alerts
- Monitor trends

### Weekly Tasks
- Generate performance reports
- Update performance baselines
- Review recommendations

### Monthly Tasks
- Analyze performance trends
- Optimize based on insights
- Update monitoring thresholds

## Troubleshooting

### High Memory Usage
1. Check memory monitoring logs
2. Look for memory leak patterns
3. Profile heavy operations
4. Optimize data structures

### Slow Startup
1. Review startup metrics
2. Profile module loading
3. Implement lazy loading
4. Optimize import chains

### Command Performance Issues
1. Profile specific commands
2. Check for blocking operations
3. Optimize algorithm complexity
4. Add caching where appropriate

---

*This monitoring system helps maintain optimal CLI performance and provides early warning of regressions.*
`;

    await writeFile('.performance-monitor/README.md', guide);

    // Create config file
    await writeFile('.performance-monitor/config.json',
      JSON.stringify(this.monitoringConfig, null, 2));
  }
}

// Run the setup
const setup = new PerformanceMonitoringSetup();
setup.setup().catch(console.error);
