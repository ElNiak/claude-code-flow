#!/usr/bin/env node
/**
 * Performance Regression Detection System
 * Compares current performance against established baselines
 */

import { PerformanceBaselineAnalyzer } from './performance-baseline-analyzer.js';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

class PerformanceRegressionDetector {
  constructor(baselineFile = 'performance-baseline-current.json') {
    this.baselineFile = baselineFile;
    this.baseline = null;
    this.current = null;
    this.regressions = [];
    this.improvements = [];
  }

  async loadBaseline() {
    if (!existsSync(this.baselineFile)) {
      throw new Error(`Baseline file not found: ${this.baselineFile}`);
    }

    const content = await readFile(this.baselineFile, 'utf8');
    this.baseline = JSON.parse(content);
    console.log(`📊 Loaded baseline from ${this.baseline.timestamp}`);
  }

  async measureCurrentPerformance() {
    console.log('🔄 Measuring current performance...');
    const analyzer = new PerformanceBaselineAnalyzer();
    this.current = await analyzer.establishBaseline();
  }

  detectRegressions() {
    console.log('🔍 Detecting performance regressions...');

    this.regressions = [];
    this.improvements = [];

    // Check startup time regression
    const baselineStartup = this.baseline.metrics.startup.statistics.mean;
    const currentStartup = this.current.metrics.startup.statistics.mean;
    const startupChange = ((currentStartup - baselineStartup) / baselineStartup) * 100;

    if (Math.abs(startupChange) > 5) { // 5% threshold
      const item = {
        metric: 'Startup Time',
        baseline: `${baselineStartup.toFixed(2)}ms`,
        current: `${currentStartup.toFixed(2)}ms`,
        change: `${startupChange > 0 ? '+' : ''}${startupChange.toFixed(1)}%`,
        severity: Math.abs(startupChange) > 20 ? 'high' : Math.abs(startupChange) > 10 ? 'medium' : 'low'
      };

      if (startupChange > 0) {
        this.regressions.push(item);
      } else {
        this.improvements.push(item);
      }
    }

    // Check command performance regressions
    for (const cmdName of Object.keys(this.baseline.metrics.commands)) {
      const baselineCmd = this.baseline.metrics.commands[cmdName];
      const currentCmd = this.current.metrics.commands[cmdName];

      if (baselineCmd && currentCmd) {
        const baselineTime = baselineCmd.statistics.mean;
        const currentTime = currentCmd.statistics.mean;
        const change = ((currentTime - baselineTime) / baselineTime) * 100;

        if (Math.abs(change) > 10) { // 10% threshold for commands
          const item = {
            metric: `Command: ${cmdName}`,
            baseline: `${baselineTime.toFixed(2)}ms`,
            current: `${currentTime.toFixed(2)}ms`,
            change: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
            severity: Math.abs(change) > 30 ? 'high' : Math.abs(change) > 20 ? 'medium' : 'low'
          };

          if (change > 0) {
            this.regressions.push(item);
          } else {
            this.improvements.push(item);
          }
        }
      }
    }
  }

  async generateRegressionReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseline: {
        timestamp: this.baseline.timestamp,
        cliVersion: this.baseline.environment.cliVersion
      },
      current: {
        timestamp: this.current.timestamp,
        cliVersion: this.current.environment.cliVersion
      },
      summary: {
        totalRegressions: this.regressions.length,
        totalImprovements: this.improvements.length,
        highSeverityRegressions: this.regressions.filter(r => r.severity === 'high').length,
        overallStatus: this.regressions.length === 0 ? 'PASS' :
                     this.regressions.filter(r => r.severity === 'high').length > 0 ? 'FAIL' : 'WARNING'
      },
      regressions: this.regressions,
      improvements: this.improvements,
      recommendations: this.generateRecommendations()
    };

    const reportFile = `performance-regression-report-${new Date().toISOString().split('T')[0]}.json`;
    await writeFile(reportFile, JSON.stringify(report, null, 2));

    const mdReport = this.generateMarkdownReport(report);
    const mdFile = `performance-regression-report-${new Date().toISOString().split('T')[0]}.md`;
    await writeFile(mdFile, mdReport);

    console.log(`📄 Regression report saved to: ${reportFile}`);
    console.log(`📝 Markdown report saved to: ${mdFile}`);

    return report;
  }

  generateRecommendations() {
    const recs = [];

    if (this.regressions.length === 0) {
      recs.push({
        category: 'Performance Status',
        recommendation: 'No performance regressions detected. Continue monitoring.',
        priority: 'low'
      });
    } else {
      // High severity regressions
      const highSeverity = this.regressions.filter(r => r.severity === 'high');
      if (highSeverity.length > 0) {
        recs.push({
          category: 'Critical Performance Regression',
          recommendation: `Immediate investigation required for ${highSeverity.length} high-severity regressions`,
          priority: 'high',
          items: highSeverity.map(r => r.metric)
        });
      }

      // Startup time regressions
      const startupRegressions = this.regressions.filter(r => r.metric === 'Startup Time');
      if (startupRegressions.length > 0) {
        recs.push({
          category: 'Startup Performance',
          recommendation: 'Review recent changes affecting CLI initialization and import costs',
          priority: 'high'
        });
      }

      // Command regressions
      const commandRegressions = this.regressions.filter(r => r.metric.startsWith('Command:'));
      if (commandRegressions.length > 0) {
        recs.push({
          category: 'Command Performance',
          recommendation: 'Profile affected commands and optimize execution paths',
          priority: 'medium',
          items: commandRegressions.map(r => r.metric)
        });
      }
    }

    // Improvement recognition
    if (this.improvements.length > 0) {
      recs.push({
        category: 'Performance Improvements',
        recommendation: `${this.improvements.length} performance improvements detected. Document successful optimizations.`,
        priority: 'low'
      });
    }

    return recs;
  }

  generateMarkdownReport(report) {
    const statusIcon = report.summary.overallStatus === 'PASS' ? '✅' :
                      report.summary.overallStatus === 'WARNING' ? '⚠️' : '❌';

    let md = `# Performance Regression Detection Report

**Status:** ${statusIcon} ${report.summary.overallStatus}
**Generated:** ${report.timestamp}

## 📊 Summary

| Metric | Count |
|--------|-------|
| **Regressions** | ${report.summary.totalRegressions} |
| **Improvements** | ${report.summary.totalImprovements} |
| **High Severity Issues** | ${report.summary.highSeverityRegressions} |

## 🔍 Baseline Comparison

| | Baseline | Current |
|---|----------|---------|
| **Timestamp** | ${report.baseline.timestamp} | ${report.current.timestamp} |
| **CLI Version** | ${report.baseline.cliVersion} | ${report.current.cliVersion} |

`;

    if (report.regressions.length > 0) {
      md += `## ❌ Performance Regressions

| Metric | Baseline | Current | Change | Severity |
|--------|----------|---------|--------|----------|
`;

      for (const reg of report.regressions) {
        const severityIcon = reg.severity === 'high' ? '🔴' : reg.severity === 'medium' ? '⚠️' : '🟡';
        md += `| ${reg.metric} | ${reg.baseline} | ${reg.current} | ${reg.change} | ${severityIcon} ${reg.severity} |\n`;
      }
      md += '\n';
    }

    if (report.improvements.length > 0) {
      md += `## ✅ Performance Improvements

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
`;

      for (const imp of report.improvements) {
        md += `| ${imp.metric} | ${imp.baseline} | ${imp.current} | ${imp.change} |\n`;
      }
      md += '\n';
    }

    md += `## 💡 Recommendations

`;

    for (const rec of report.recommendations) {
      const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '⚠️' : '💡';
      md += `### ${priorityIcon} ${rec.category}

${rec.recommendation}

`;
      if (rec.items) {
        md += 'Affected items:\n';
        for (const item of rec.items) {
          md += `- ${item}\n`;
        }
        md += '\n';
      }
    }

    md += `## 🔧 Next Steps

`;

    if (report.summary.overallStatus === 'FAIL') {
      md += `1. **Immediate Action Required** - Address high-severity regressions
2. **Root Cause Analysis** - Identify recent changes causing performance degradation
3. **Performance Optimization** - Implement fixes for identified issues
4. **Re-test** - Run regression detection after fixes
`;
    } else if (report.summary.overallStatus === 'WARNING') {
      md += `1. **Monitor Closely** - Watch for trend continuation
2. **Investigate Changes** - Review recent commits for potential causes
3. **Consider Optimization** - Proactive performance improvements
`;
    } else {
      md += `1. **Continue Monitoring** - Regular performance baseline checks
2. **Document Success** - Record successful optimization strategies
3. **Maintain Standards** - Keep performance thresholds current
`;
    }

    return md;
  }

  async run() {
    console.log('🔍 Starting Performance Regression Detection...\n');

    try {
      await this.loadBaseline();
      await this.measureCurrentPerformance();
      this.detectRegressions();

      const report = await this.generateRegressionReport();

      console.log('\n✅ Regression detection complete!');
      console.log(`Status: ${report.summary.overallStatus}`);
      console.log(`Regressions: ${report.summary.totalRegressions}`);
      console.log(`Improvements: ${report.summary.totalImprovements}`);

      return report;
    } catch (error) {
      console.error('❌ Regression detection failed:', error.message);
      throw error;
    }
  }
}

// Export for use in other scripts
export { PerformanceRegressionDetector };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const detector = new PerformanceRegressionDetector();
  detector.run().catch(console.error);
}
