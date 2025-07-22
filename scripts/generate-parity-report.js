#!/usr/bin/env node
/**
 * Feature Parity Report Generator
 * Creates comprehensive validation reports with visual output
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

/**
 * Generate markdown report
 */
function generateMarkdownReport(validationResults, baselineData) {
  const timestamp = new Date().toISOString();
  let markdown = `# Claude Flow Feature Parity Validation Report

**Generated**: ${timestamp}
**Status**: ${validationResults.summary.failed === 0 ? '✅ PASSING' : '❌ FAILING'}

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Features | ${validationResults.summary.total} |
| Passed | ${validationResults.summary.passed} (${validationResults.summary.successRate}%) |
| Failed | ${validationResults.summary.failed} |
| Skipped | ${validationResults.summary.skipped} |
| Warnings | ${validationResults.summary.warnings} |

## Feature Categories

`;

  // Group results by category
  const categories = {};
  Object.entries(validationResults.results).forEach(([key, value]) => {
    if (Array.isArray(value)) return;

    Object.entries(value).forEach(([feature, results]) => {
      if (!categories[key]) categories[key] = [];
      categories[key].push({ feature, results });
    });
  });

  // Generate category sections
  Object.entries(categories).forEach(([category, features]) => {
    markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    markdown += '| Feature | Status | Duration | Notes |\n';
    markdown += '|---------|--------|----------|-------|\n';

    features.forEach(({ feature, results }) => {
      const featureId = `${category}.${feature}`;
      const passed = validationResults.results.passed.includes(featureId);
      const failed = validationResults.results.failed.find(f => f.id === featureId);
      const skipped = validationResults.results.skipped.find(f => f.id === featureId);
      const duration = validationResults.results.performance[featureId];

      let status = '✅ Passed';
      let notes = '-';

      if (failed) {
        status = '❌ Failed';
        notes = failed.error || 'Unknown error';
      } else if (skipped) {
        status = '⏭️ Skipped';
        notes = skipped.reason;
      }

      markdown += `| ${feature} | ${status} | ${duration || '-'}ms | ${notes} |\n`;
    });

    markdown += '\n';
  });

  // Performance analysis
  if (validationResults.results.performance) {
    markdown += `## Performance Analysis

### Top 10 Slowest Operations

| Operation | Duration |
|-----------|----------|
`;

    const sortedPerf = Object.entries(validationResults.results.performance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedPerf.forEach(([op, duration]) => {
      markdown += `| ${op} | ${duration}ms |\n`;
    });
  }

  // Regression analysis
  if (baselineData) {
    markdown += `\n## Regression Analysis

Comparing against baseline from ${baselineData.metadata.timestamp}

`;

    const baselineFeatures = new Set();
    baselineData.configurations.forEach(config => {
      Object.entries(config.features).forEach(([feature, result]) => {
        if (result.passed) baselineFeatures.add(feature);
      });
    });

    const currentFeatures = new Set(validationResults.results.passed.map(f => f.split('.').pop()));
    const regressions = [...baselineFeatures].filter(f => !currentFeatures.has(f));
    const improvements = [...currentFeatures].filter(f => !baselineFeatures.has(f));

    markdown += `### Regressions (${regressions.length})

`;
    if (regressions.length > 0) {
      regressions.forEach(r => markdown += `- ❌ ${r}\n`);
    } else {
      markdown += '*No regressions detected*\n';
    }

    markdown += `\n### Improvements (${improvements.length})

`;
    if (improvements.length > 0) {
      improvements.forEach(i => markdown += `- ✅ ${i}\n`);
    } else {
      markdown += '*No new features detected*\n';
    }
  }

  // Recommendations
  markdown += `\n## Recommendations

`;

  if (validationResults.results.failed.length > 0) {
    markdown += `### Critical Issues to Address

`;
    validationResults.results.failed
      .filter(f => f.feature?.priority === 'critical')
      .forEach(failure => {
        markdown += `1. **${failure.id}**: ${failure.error}\n`;
      });
  }

  if (validationResults.results.warnings.length > 0) {
    markdown += `\n### Performance Optimizations

`;
    validationResults.results.warnings
      .filter(w => w.type === 'performance')
      .slice(0, 5)
      .forEach(warning => {
        markdown += `- ${warning.id}: ${warning.duration}ms (consider optimization)\n`;
      });
  }

  return markdown;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(validationResults, baselineData) {
  const timestamp = new Date().toISOString();
  const passed = validationResults.summary.failed === 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Flow Feature Parity Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: ${passed ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric {
            display: inline-block;
            padding: 10px 20px;
            margin: 5px;
            background: #f0f0f0;
            border-radius: 4px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #2196F3;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f0f0f0;
            font-weight: 600;
        }
        .status-passed { color: #4CAF50; }
        .status-failed { color: #f44336; }
        .status-skipped { color: #FF9800; }
        .status-warning { color: #FFC107; }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: #4CAF50;
            transition: width 0.3s;
        }
        .chart {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        .chart-item {
            text-align: center;
        }
        .chart-bar {
            width: 80px;
            background: #e0e0e0;
            border-radius: 4px;
            position: relative;
            height: 200px;
            margin: 0 auto;
        }
        .chart-fill {
            position: absolute;
            bottom: 0;
            width: 100%;
            background: #2196F3;
            border-radius: 0 0 4px 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Feature Parity Validation Report</h1>
        <p>Generated: ${timestamp}</p>
        <h2>Status: ${passed ? '✅ PASSING' : '❌ FAILING'}</h2>
    </div>

    <div class="card">
        <h2>Summary Metrics</h2>
        <div class="metric">
            <div>Total Features</div>
            <div class="metric-value">${validationResults.summary.total}</div>
        </div>
        <div class="metric">
            <div>Passed</div>
            <div class="metric-value status-passed">${validationResults.summary.passed}</div>
        </div>
        <div class="metric">
            <div>Failed</div>
            <div class="metric-value status-failed">${validationResults.summary.failed}</div>
        </div>
        <div class="metric">
            <div>Success Rate</div>
            <div class="metric-value">${validationResults.summary.successRate}%</div>
        </div>

        <div class="progress-bar">
            <div class="progress-fill" style="width: ${validationResults.summary.successRate}%"></div>
        </div>
    </div>

    <div class="card">
        <h2>Feature Status by Category</h2>
        <div class="chart">
            ${generateCategoryChart(validationResults)}
        </div>
    </div>

    <div class="card">
        <h2>Detailed Results</h2>
        ${generateDetailedTable(validationResults)}
    </div>

    ${baselineData ? generateRegressionSection(validationResults, baselineData) : ''}

    <div class="card">
        <h2>Performance Analysis</h2>
        ${generatePerformanceTable(validationResults)}
    </div>
</body>
</html>`;

  return html;
}

/**
 * Generate category chart HTML
 */
function generateCategoryChart(results) {
  // Implementation would create visual chart
  return '<p>Category breakdown chart would be rendered here</p>';
}

/**
 * Generate detailed results table
 */
function generateDetailedTable(results) {
  let table = `<table>
    <thead>
        <tr>
            <th>Feature</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Notes</th>
        </tr>
    </thead>
    <tbody>`;

  results.results.passed.forEach(feature => {
    const duration = results.results.performance[feature] || '-';
    table += `
        <tr>
            <td>${feature}</td>
            <td class="status-passed">✅ Passed</td>
            <td>${duration}ms</td>
            <td>-</td>
        </tr>`;
  });

  results.results.failed.forEach(failure => {
    const duration = results.results.performance[failure.id] || '-';
    table += `
        <tr>
            <td>${failure.id}</td>
            <td class="status-failed">❌ Failed</td>
            <td>${duration}ms</td>
            <td>${failure.error}</td>
        </tr>`;
  });

  table += '</tbody></table>';
  return table;
}

/**
 * Generate regression analysis section
 */
function generateRegressionSection(current, baseline) {
  return `
    <div class="card">
        <h2>Regression Analysis</h2>
        <p>Comparing against baseline from ${baseline.metadata.timestamp}</p>
        <!-- Regression details would be rendered here -->
    </div>`;
}

/**
 * Generate performance table
 */
function generatePerformanceTable(results) {
  const sorted = Object.entries(results.results.performance || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let table = `<table>
    <thead>
        <tr>
            <th>Operation</th>
            <th>Duration (ms)</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>`;

  sorted.forEach(([op, duration]) => {
    const statusClass = duration > 1000 ? 'status-warning' : '';
    table += `
        <tr>
            <td>${op}</td>
            <td class="${statusClass}">${duration}</td>
            <td>${duration > 1000 ? '⚠️ Slow' : '✅ OK'}</td>
        </tr>`;
  });

  table += '</tbody></table>';
  return table;
}

/**
 * Main report generator
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
Feature Parity Report Generator

Usage:
  node generate-parity-report.js [options]

Options:
  --validation   Path to validation results JSON
  --baseline     Path to baseline results JSON (optional)
  --format       Output format: markdown, html, both (default: both)
  --output       Output directory (default: ./reports)

Example:
  node generate-parity-report.js --validation ./reports/feature-parity-report.json
`);
    process.exit(0);
  }

  // Parse arguments
  const validationIndex = args.indexOf('--validation');
  const baselineIndex = args.indexOf('--baseline');
  const formatIndex = args.indexOf('--format');
  const outputIndex = args.indexOf('--output');

  if (validationIndex === -1) {
    console.error('❌ --validation path is required');
    process.exit(1);
  }

  const validationPath = args[validationIndex + 1];
  const baselinePath = baselineIndex !== -1 ? args[baselineIndex + 1] : null;
  const format = formatIndex !== -1 ? args[formatIndex + 1] : 'both';
  const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : './reports';

  // Load data
  console.log('📊 Generating Feature Parity Report...');

  const validationData = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
  const baselineData = baselinePath ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;

  // Generate reports
  fs.mkdirSync(outputDir, { recursive: true });

  if (format === 'markdown' || format === 'both') {
    const markdown = generateMarkdownReport(validationData, baselineData);
    const mdPath = path.join(outputDir, 'feature-parity-report.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`✅ Markdown report: ${mdPath}`);
  }

  if (format === 'html' || format === 'both') {
    const html = generateHTMLReport(validationData, baselineData);
    const htmlPath = path.join(outputDir, 'feature-parity-report.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ HTML report: ${htmlPath}`);
  }

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Status: ${validationData.summary.failed === 0 ? '✅ PASSING' : '❌ FAILING'}`);
  console.log(`   Success Rate: ${validationData.summary.successRate}%`);
  console.log(`   Failed: ${validationData.summary.failed}`);
  console.log(`   Warnings: ${validationData.summary.warnings}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateMarkdownReport, generateHTMLReport };
