#!/usr/bin/env tsx
/**
 * Debug Test Suite Runner
 * Comprehensive test execution with coverage validation and performance benchmarking
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';

interface TestSuiteConfig {
  name: string;
  pattern: string;
  timeout: number;
  coverage: boolean;
  parallel: boolean;
  retries: number;
  requiredCoverage: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
}

interface TestResults {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
  performance?: {
    overhead: number;
    throughput: number;
    memoryGrowth: number;
  };
  errors: string[];
}

interface SuiteResults {
  overall: {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    duration: number;
    coverage: {
      branches: number;
      functions: number;
      lines: number;
      statements: number;
    };
  };
  suites: TestResults[];
  recommendations: string[];
}

class DebugTestSuiteRunner {
  private testSuites: TestSuiteConfig[] = [
    {
      name: 'Debug Logger Unit Tests',
      pattern: 'tests/unit/debug/debug-logger.test.ts',
      timeout: 15000,
      coverage: true,
      parallel: false,
      retries: 2,
      requiredCoverage: { branches: 98, functions: 98, lines: 98, statements: 98 },
    },
    {
      name: 'MCP Debug Logger Unit Tests',
      pattern: 'tests/unit/debug/mcp-debug-logger.test.ts',
      timeout: 20000,
      coverage: true,
      parallel: false,
      retries: 2,
      requiredCoverage: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
    {
      name: 'Console Migration Unit Tests',
      pattern: 'tests/unit/debug/console-migration.test.ts',
      timeout: 15000,
      coverage: true,
      parallel: false,
      retries: 2,
      requiredCoverage: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
    {
      name: 'Debug Integration Tests',
      pattern: 'tests/integration/debug/debug-integration.test.ts',
      timeout: 30000,
      coverage: true,
      parallel: false,
      retries: 1,
      requiredCoverage: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    {
      name: 'Debug Performance Validation',
      pattern: 'tests/validation/debug-performance.test.ts',
      timeout: 60000,
      coverage: false,
      parallel: false,
      retries: 1,
      requiredCoverage: { branches: 0, functions: 0, lines: 0, statements: 0 },
    },
  ];

  private results: SuiteResults = {
    overall: {
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0,
      coverage: { branches: 0, functions: 0, lines: 0, statements: 0 },
    },
    suites: [],
    recommendations: [],
  };

  async runTestSuite(): Promise<SuiteResults> {
    console.log('🚀 Starting Debug Test Suite Execution\n');

    const overallStart = performance.now();

    // Run individual test suites
    for (const suite of this.testSuites) {
      console.log(`📋 Running: ${suite.name}`);
      const result = await this.runIndividualSuite(suite);
      this.results.suites.push(result);

      if (result.passed) {
        console.log(`✅ ${suite.name} - PASSED (${result.duration.toFixed(0)}ms)`);
      } else {
        console.log(`❌ ${suite.name} - FAILED (${result.duration.toFixed(0)}ms)`);
        result.errors.forEach((error) => console.log(`   Error: ${error}`));
      }
      console.log();
    }

    const overallEnd = performance.now();
    this.results.overall.duration = overallEnd - overallStart;

    // Calculate overall results
    this.calculateOverallResults();

    // Generate recommendations
    this.generateRecommendations();

    // Generate report
    await this.generateTestReport();

    // Display summary
    this.displaySummary();

    return this.results;
  }

  private async runIndividualSuite(suite: TestSuiteConfig): Promise<TestResults> {
    const result: TestResults = {
      suite: suite.name,
      passed: false,
      duration: 0,
      errors: [],
    };

    const start = performance.now();

    try {
      // Prepare Jest command
      const jestArgs = [
        '--config',
        'jest.config.js',
        '--testPathPattern',
        suite.pattern,
        '--testTimeout',
        suite.timeout.toString(),
        '--maxWorkers',
        suite.parallel ? '4' : '1',
        '--bail',
        '1',
      ];

      if (suite.coverage) {
        jestArgs.push('--coverage', '--coverageReporters', 'json', 'text');
      }

      // Add NODE_OPTIONS for ES modules
      const env = {
        ...process.env,
        NODE_OPTIONS: '--experimental-vm-modules',
      };

      // Run Jest
      const jestResult = await this.runCommand('npx', ['jest', ...jestArgs], { env });

      if (jestResult.success) {
        result.passed = true;

        // Parse coverage if available
        if (suite.coverage) {
          result.coverage = await this.parseCoverage();

          // Validate coverage requirements
          if (!this.validateCoverage(result.coverage, suite.requiredCoverage)) {
            result.passed = false;
            result.errors.push('Coverage requirements not met');
          }
        }

        // Parse performance metrics for performance tests
        if (suite.name.includes('Performance')) {
          result.performance = await this.parsePerformanceMetrics(jestResult.output);
        }
      } else {
        result.errors.push(...jestResult.errors);
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    const end = performance.now();
    result.duration = end - start;

    // Retry logic for failed tests
    if (!result.passed && suite.retries > 0) {
      console.log(`   🔄 Retrying ${suite.name} (${suite.retries} attempts remaining)`);

      const retrySuite = { ...suite, retries: suite.retries - 1 };
      const retryResult = await this.runIndividualSuite(retrySuite);

      if (retryResult.passed) {
        return retryResult;
      }
    }

    return result;
  }

  private async runCommand(
    command: string,
    args: string[],
    options: { env?: NodeJS.ProcessEnv } = {},
  ): Promise<{ success: boolean; output: string; errors: string[] }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        env: options.env,
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        const errors = errorOutput ? [errorOutput] : [];
        resolve({
          success: code === 0,
          output,
          errors,
        });
      });
    });
  }

  private async parseCoverage(): Promise<{
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  }> {
    try {
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
      const coverageData = await fs.readFile(coveragePath, 'utf-8');
      const coverage = JSON.parse(coverageData);

      let totalBranches = 0;
      let coveredBranches = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalLines = 0;
      let coveredLines = 0;
      let totalStatements = 0;
      let coveredStatements = 0;

      for (const file in coverage) {
        const fileCoverage = coverage[file];

        // Branches
        if (fileCoverage.b) {
          for (const branchId in fileCoverage.b) {
            const branch = fileCoverage.b[branchId];
            totalBranches += branch.length;
            coveredBranches += branch.filter((count: number) => count > 0).length;
          }
        }

        // Functions
        if (fileCoverage.f) {
          for (const funcId in fileCoverage.f) {
            totalFunctions++;
            if (fileCoverage.f[funcId] > 0) {
              coveredFunctions++;
            }
          }
        }

        // Lines
        if (fileCoverage.l) {
          for (const lineId in fileCoverage.l) {
            totalLines++;
            if (fileCoverage.l[lineId] > 0) {
              coveredLines++;
            }
          }
        }

        // Statements
        if (fileCoverage.s) {
          for (const stmtId in fileCoverage.s) {
            totalStatements++;
            if (fileCoverage.s[stmtId] > 0) {
              coveredStatements++;
            }
          }
        }
      }

      return {
        branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
        functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
        lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
        statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
      };
    } catch (error) {
      console.warn('Could not parse coverage data:', error);
      return { branches: 0, functions: 0, lines: 0, statements: 0 };
    }
  }

  private validateCoverage(
    actual: { branches: number; functions: number; lines: number; statements: number },
    required: { branches: number; functions: number; lines: number; statements: number },
  ): boolean {
    return (
      actual.branches >= required.branches &&
      actual.functions >= required.functions &&
      actual.lines >= required.lines &&
      actual.statements >= required.statements
    );
  }

  private async parsePerformanceMetrics(output: string): Promise<{
    overhead: number;
    throughput: number;
    memoryGrowth: number;
  }> {
    // Parse performance metrics from test output
    const overheadMatch = output.match(/Overhead:\s*(\d+\.?\d*)%/);
    const throughputMatch = output.match(/(\d+)\s*ops\/sec/);
    const memoryMatch = output.match(/Memory growth:\s*(\d+\.?\d*)MB/);

    return {
      overhead: overheadMatch ? parseFloat(overheadMatch[1]) : 0,
      throughput: throughputMatch ? parseInt(throughputMatch[1]) : 0,
      memoryGrowth: memoryMatch ? parseFloat(memoryMatch[1]) : 0,
    };
  }

  private calculateOverallResults(): void {
    const totalSuites = this.results.suites.length;
    const passedSuites = this.results.suites.filter((s) => s.passed).length;

    this.results.overall.totalTests = totalSuites;
    this.results.overall.passedTests = passedSuites;
    this.results.overall.passed = passedSuites === totalSuites;

    // Calculate weighted average coverage
    const coverageSuites = this.results.suites.filter((s) => s.coverage);
    if (coverageSuites.length > 0) {
      this.results.overall.coverage = {
        branches:
          coverageSuites.reduce((sum, s) => sum + (s.coverage?.branches || 0), 0) /
          coverageSuites.length,
        functions:
          coverageSuites.reduce((sum, s) => sum + (s.coverage?.functions || 0), 0) /
          coverageSuites.length,
        lines:
          coverageSuites.reduce((sum, s) => sum + (s.coverage?.lines || 0), 0) /
          coverageSuites.length,
        statements:
          coverageSuites.reduce((sum, s) => sum + (s.coverage?.statements || 0), 0) /
          coverageSuites.length,
      };
    }
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (this.results.overall.coverage.branches < 95) {
      recommendations.push(
        `Increase branch coverage from ${this.results.overall.coverage.branches.toFixed(1)}% to >95%`,
      );
    }

    if (this.results.overall.coverage.functions < 95) {
      recommendations.push(
        `Increase function coverage from ${this.results.overall.coverage.functions.toFixed(1)}% to >95%`,
      );
    }

    // Performance recommendations
    const perfSuite = this.results.suites.find((s) => s.performance);
    if (perfSuite?.performance) {
      if (perfSuite.performance.overhead > 10) {
        recommendations.push(
          `Reduce debug overhead from ${perfSuite.performance.overhead.toFixed(1)}% to <10%`,
        );
      }

      if (perfSuite.performance.memoryGrowth > 50) {
        recommendations.push(
          `Reduce memory growth from ${perfSuite.performance.memoryGrowth.toFixed(1)}MB to <50MB`,
        );
      }

      if (perfSuite.performance.throughput < 10000) {
        recommendations.push(
          `Improve throughput from ${perfSuite.performance.throughput} to >10,000 ops/sec`,
        );
      }
    }

    // Failed test recommendations
    const failedSuites = this.results.suites.filter((s) => !s.passed);
    if (failedSuites.length > 0) {
      recommendations.push(
        `Fix failing test suites: ${failedSuites.map((s) => s.suite).join(', ')}`,
      );
    }

    // General recommendations
    if (this.results.overall.duration > 120000) {
      // 2 minutes
      recommendations.push('Consider parallelizing tests to reduce execution time');
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passing with excellent coverage and performance!');
    }

    this.results.recommendations = recommendations;
  }

  private async generateTestReport(): Promise<void> {
    const reportPath = path.join(process.cwd(), 'test-reports', 'debug-test-suite-report.json');

    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    // Generate comprehensive test report
    const report = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      results: this.results,
      configuration: {
        testSuites: this.testSuites.map((suite) => ({
          name: suite.name,
          pattern: suite.pattern,
          timeout: suite.timeout,
          requiredCoverage: suite.requiredCoverage,
        })),
      },
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Test report generated: ${reportPath}`);
  }

  private displaySummary(): void {
    console.log('📊 DEBUG TEST SUITE SUMMARY');
    console.log('==========================================');
    console.log(`Overall Status: ${this.results.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(
      `Test Suites: ${this.results.overall.passedTests}/${this.results.overall.totalTests} passed`,
    );
    console.log(`Duration: ${(this.results.overall.duration / 1000).toFixed(1)}s`);
    console.log();

    console.log('📈 Coverage Summary:');
    console.log(`  Branches: ${this.results.overall.coverage.branches.toFixed(1)}%`);
    console.log(`  Functions: ${this.results.overall.coverage.functions.toFixed(1)}%`);
    console.log(`  Lines: ${this.results.overall.coverage.lines.toFixed(1)}%`);
    console.log(`  Statements: ${this.results.overall.coverage.statements.toFixed(1)}%`);
    console.log();

    // Performance summary
    const perfSuite = this.results.suites.find((s) => s.performance);
    if (perfSuite?.performance) {
      console.log('⚡ Performance Summary:');
      console.log(`  Debug Overhead: ${perfSuite.performance.overhead.toFixed(1)}%`);
      console.log(`  Throughput: ${perfSuite.performance.throughput.toLocaleString()} ops/sec`);
      console.log(`  Memory Growth: ${perfSuite.performance.memoryGrowth.toFixed(1)}MB`);
      console.log();
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      console.log();
    }

    // Individual suite results
    console.log('🔍 Individual Suite Results:');
    this.results.suites.forEach((suite) => {
      const status = suite.passed ? '✅' : '❌';
      const coverage = suite.coverage ? ` (${suite.coverage.statements.toFixed(1)}% coverage)` : '';
      console.log(`  ${status} ${suite.suite} - ${suite.duration.toFixed(0)}ms${coverage}`);

      if (!suite.passed && suite.errors.length > 0) {
        suite.errors.forEach((error) => {
          console.log(`      Error: ${error}`);
        });
      }
    });
  }
}

// Main execution
async function main(): Promise<void> {
  const runner = new DebugTestSuiteRunner();

  try {
    const results = await runner.runTestSuite();

    // Exit with appropriate code
    process.exit(results.overall.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite runner failed:', error);
    process.exit(1);
  }
}

// CLI interface - PKG-compatible main module detection
const __filename = process.argv[1] || require.main?.filename || '';
const isMainModule = process.argv[1] && process.argv[1].endsWith('/run-debug-test-suite.ts');
if (isMainModule) {
  main();
}

export { DebugTestSuiteRunner, type TestResults, type SuiteResults };
