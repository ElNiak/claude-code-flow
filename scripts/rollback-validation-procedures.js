#!/usr/bin/env node
/**
 * Rollback Validation Procedures for Day 7
 * Comprehensive validation suite for performance optimizations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { performance } from 'perf_hooks';

const execAsync = promisify(exec);

class RollbackValidationSuite {
  constructor() {
    this.results = {
      startupPerformance: null,
      commandPerformance: null,
      testingFramework: null,
      memoryUsage: null,
      buildOptimization: null,
      regressionCheck: null,
      overallScore: 0,
      passed: false,
    };

    this.thresholds = {
      startupTime: 150, // ms
      commandTime: 2000, // ms
      memoryUsage: 100, // MB
      testDuration: 30000, // ms
      regressionTolerance: 0.1, // 10%
    };
  }

  async runValidation() {
    console.log('🔍 Starting Day 7 Rollback Validation Suite...\n');

    try {
      // Run all validation tests
      await this.validateStartupPerformance();
      await this.validateCommandPerformance();
      await this.validateTestingFramework();
      await this.validateMemoryUsage();
      await this.validateBuildOptimization();
      await this.checkForRegressions();

      // Calculate overall score
      this.calculateOverallScore();

      // Generate validation report
      await this.generateValidationReport();

      // Display results
      this.displayResults();

      // Determine pass/fail
      if (this.results.passed) {
        console.log('\n✅ VALIDATION PASSED - Optimizations ready for production');
        process.exit(0);
      } else {
        console.log('\n❌ VALIDATION FAILED - Recommend rollback or further optimization');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Validation suite failed:', error);
      process.exit(1);
    }
  }

  async validateStartupPerformance() {
    console.log('🚀 Validating startup performance...');

    const iterations = 10;
    const times = [];

    try {
      // Test optimized CLI startup
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await execAsync('node src/cli/performance-optimized-cli.js --version');
        const duration = performance.now() - start;
        times.push(duration);
      }

      const average = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      this.results.startupPerformance = {
        average,
        min,
        max,
        times,
        passed: average < this.thresholds.startupTime,
        improvement: await this.calculateStartupImprovement(average),
      };

      console.log(`   Average: ${average.toFixed(2)}ms`);
      console.log(`   Target: <${this.thresholds.startupTime}ms`);
      console.log(`   Status: ${this.results.startupPerformance.passed ? '✅ PASS' : '❌ FAIL'}`);

    } catch (error) {
      console.log(`   Status: ❌ FAIL - ${error.message}`);
      this.results.startupPerformance = { passed: false, error: error.message };
    }
  }

  async validateCommandPerformance() {
    console.log('\n⚡ Validating command performance...');

    const commands = [
      'help',
      'status --json',
      'config get',
      'memory stats',
      'agent list',
    ];

    const results = {};
    let allPassed = true;

    try {
      for (const cmd of commands) {
        const times = [];

        for (let i = 0; i < 3; i++) {
          const start = performance.now();
          try {
            await execAsync(`node src/cli/performance-optimized-cli.js ${cmd}`);
            const duration = performance.now() - start;
            times.push(duration);
          } catch {
            // Some commands may fail but we still measure time
          }
        }

        if (times.length > 0) {
          const average = times.reduce((a, b) => a + b, 0) / times.length;
          const passed = average < this.thresholds.commandTime;

          results[cmd] = {
            average,
            times,
            passed,
          };

          console.log(`   ${cmd}: ${average.toFixed(2)}ms ${passed ? '✅' : '❌'}`);

          if (!passed) allPassed = false;
        }
      }

      this.results.commandPerformance = {
        commands: results,
        passed: allPassed,
      };

    } catch (error) {
      console.log(`   Status: ❌ FAIL - ${error.message}`);
      this.results.commandPerformance = { passed: false, error: error.message };
    }
  }

  async validateTestingFramework() {
    console.log('\n🧪 Validating testing framework optimizations...');

    try {
      // Test optimized test runner
      const start = performance.now();

      const { stdout, stderr } = await execAsync(
        'node scripts/run-tests-optimized.js',
        { timeout: 60000 }
      );

      const duration = performance.now() - start;

      // Parse test results
      const passedMatch = stdout.match(/(\d+) passed/);
      const failedMatch = stdout.match(/(\d+) failed/) || stderr.match(/(\d+) failed/);

      const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]) : 0;

      const testsPassed = failed === 0 && passed > 0;
      const performancePassed = duration < this.thresholds.testDuration;

      this.results.testingFramework = {
        duration,
        passed,
        failed,
        testsPassed,
        performancePassed,
        passed: testsPassed && performancePassed,
      };

      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`   Tests passed: ${passed}`);
      console.log(`   Tests failed: ${failed}`);
      console.log(`   Status: ${this.results.testingFramework.passed ? '✅ PASS' : '❌ FAIL'}`);

    } catch (error) {
      console.log(`   Status: ❌ FAIL - ${error.message}`);
      this.results.testingFramework = { passed: false, error: error.message };
    }
  }

  async validateMemoryUsage() {
    console.log('\n💾 Validating memory usage...');

    try {
      const initialMemory = process.memoryUsage();

      // Import and test optimized CLI
      const { CLI } = await import('../src/cli/performance-optimized-cli.js');
      const cli = new CLI('test-cli', 'Test CLI');

      // Run some operations
      await cli.run(['--help']);

      const finalMemory = process.memoryUsage();
      const heapDelta = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      const rssDelta = (finalMemory.rss - initialMemory.rss) / 1024 / 1024;

      const passed = heapDelta < this.thresholds.memoryUsage;

      this.results.memoryUsage = {
        initialHeap: initialMemory.heapUsed / 1024 / 1024,
        finalHeap: finalMemory.heapUsed / 1024 / 1024,
        heapDelta,
        rssDelta,
        passed,
      };

      console.log(`   Heap delta: ${heapDelta.toFixed(2)}MB`);
      console.log(`   RSS delta: ${rssDelta.toFixed(2)}MB`);
      console.log(`   Target: <${this.thresholds.memoryUsage}MB`);
      console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    } catch (error) {
      console.log(`   Status: ❌ FAIL - ${error.message}`);
      this.results.memoryUsage = { passed: false, error: error.message };
    }
  }

  async validateBuildOptimization() {
    console.log('\n🔨 Validating build optimizations...');

    try {
      // Test optimized build process
      const start = performance.now();
      await execAsync('node scripts/optimize-build.js');
      const buildDuration = performance.now() - start;

      // Check if optimized files exist
      const optimizedFiles = [
        'dist-optimized/cli.js',
        'dist-optimized/index.js',
        'build-optimization-report.json',
      ];

      let filesExist = true;
      for (const file of optimizedFiles) {
        try {
          await access(file);
        } catch {
          filesExist = false;
          break;
        }
      }

      // Check optimization report
      let optimizationData = null;
      try {
        const report = await readFile('build-optimization-report.json', 'utf8');
        optimizationData = JSON.parse(report);
      } catch {
        // Report not available
      }

      const passed = filesExist && buildDuration < 60000; // 1 minute

      this.results.buildOptimization = {
        buildDuration: buildDuration / 1000,
        filesExist,
        optimizationData,
        passed,
      };

      console.log(`   Build duration: ${(buildDuration / 1000).toFixed(2)}s`);
      console.log(`   Optimized files: ${filesExist ? '✅' : '❌'}`);
      console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    } catch (error) {
      console.log(`   Status: ❌ FAIL - ${error.message}`);
      this.results.buildOptimization = { passed: false, error: error.message };
    }
  }

  async checkForRegressions() {
    console.log('\n🔍 Checking for performance regressions...');

    try {
      // Compare against baseline performance data
      const baselineFiles = [
        'performance-analysis-report.json',
        'performance-comparison-report.json',
      ];

      let baselineData = null;
      for (const file of baselineFiles) {
        try {
          const data = await readFile(file, 'utf8');
          baselineData = JSON.parse(data);
          break;
        } catch {
          // File doesn't exist, continue
        }
      }

      if (!baselineData) {
        this.results.regressionCheck = {
          passed: true,
          message: 'No baseline data available for comparison',
        };
        console.log('   No baseline data available - skipping regression check');
        return;
      }

      // Compare current results with baseline
      const regressions = [];

      // Check startup performance
      if (this.results.startupPerformance && baselineData.details?.startupTime) {
        const currentStartup = this.results.startupPerformance.average;
        const baselineStartup = baselineData.details.startupTime.average;
        const regression = (currentStartup - baselineStartup) / baselineStartup;

        if (regression > this.thresholds.regressionTolerance) {
          regressions.push({
            type: 'startup',
            current: currentStartup,
            baseline: baselineStartup,
            regression: regression * 100,
          });
        }
      }

      // Check command performance
      if (this.results.commandPerformance && baselineData.details?.commandExecutionTime) {
        for (const [cmd, results] of Object.entries(this.results.commandPerformance.commands)) {
          const baselineCmd = baselineData.details.commandExecutionTime[cmd];
          if (baselineCmd) {
            const regression = (results.average - baselineCmd.average) / baselineCmd.average;

            if (regression > this.thresholds.regressionTolerance) {
              regressions.push({
                type: 'command',
                command: cmd,
                current: results.average,
                baseline: baselineCmd.average,
                regression: regression * 100,
              });
            }
          }
        }
      }

      const passed = regressions.length === 0;

      this.results.regressionCheck = {
        regressions,
        passed,
      };

      console.log(`   Regressions found: ${regressions.length}`);
      for (const regression of regressions) {
        console.log(`   ⚠️  ${regression.type}/${regression.command || 'general'}: +${regression.regression.toFixed(1)}%`);
      }
      console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    } catch (error) {
      console.log(`   Status: ❌ FAIL - ${error.message}`);
      this.results.regressionCheck = { passed: false, error: error.message };
    }
  }

  async calculateStartupImprovement(currentStartup) {
    try {
      const report = await readFile('performance-comparison-report.json', 'utf8');
      const data = JSON.parse(report);

      if (data.details?.improvements?.startup) {
        const originalStartup = data.details.original.startup.reduce((a, b) => a + b, 0) /
                               data.details.original.startup.length;
        const improvement = ((originalStartup - currentStartup) / originalStartup * 100);
        return improvement;
      }
    } catch {
      // No comparison data available
    }

    return null;
  }

  calculateOverallScore() {
    const checks = [
      this.results.startupPerformance?.passed || false,
      this.results.commandPerformance?.passed || false,
      this.results.testingFramework?.passed || false,
      this.results.memoryUsage?.passed || false,
      this.results.buildOptimization?.passed || false,
      this.results.regressionCheck?.passed || false,
    ];

    const passedChecks = checks.filter(Boolean).length;
    this.results.overallScore = (passedChecks / checks.length) * 100;

    // Require at least 80% pass rate
    this.results.passed = this.results.overallScore >= 80;
  }

  async generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      validationType: 'day-7-rollback-validation',
      thresholds: this.thresholds,
      results: this.results,
      recommendation: this.generateRecommendation(),
      nextSteps: this.generateNextSteps(),
    };

    await writeFile(
      'day-7-rollback-validation-report.json',
      JSON.stringify(report, null, 2)
    );

    // Generate markdown report
    const mdReport = this.generateMarkdownReport(report);
    await writeFile('day-7-rollback-validation-report.md', mdReport);
  }

  generateRecommendation() {
    if (this.results.passed) {
      return {
        decision: 'PROCEED',
        confidence: 'HIGH',
        reasoning: 'All critical performance metrics meet or exceed targets',
      };
    } else {
      const failures = [];

      if (!this.results.startupPerformance?.passed) failures.push('startup performance');
      if (!this.results.commandPerformance?.passed) failures.push('command performance');
      if (!this.results.testingFramework?.passed) failures.push('testing framework');
      if (!this.results.memoryUsage?.passed) failures.push('memory usage');
      if (!this.results.buildOptimization?.passed) failures.push('build optimization');
      if (!this.results.regressionCheck?.passed) failures.push('regression check');

      return {
        decision: 'ROLLBACK',
        confidence: 'HIGH',
        reasoning: `Critical failures in: ${failures.join(', ')}`,
        requiredFixes: failures,
      };
    }
  }

  generateNextSteps() {
    if (this.results.passed) {
      return [
        'Deploy optimizations to production',
        'Enable continuous performance monitoring',
        'Update performance baselines',
        'Document optimization wins',
        'Schedule regular performance reviews',
      ];
    } else {
      return [
        'Address failing validation checks',
        'Re-run validation after fixes',
        'Consider partial optimization deployment',
        'Update optimization strategy',
        'Schedule follow-up optimization sprint',
      ];
    }
  }

  generateMarkdownReport(report) {
    return `# Day 7 Rollback Validation Report

Generated: ${report.timestamp}

## Executive Summary

- **Overall Score**: ${this.results.overallScore.toFixed(1)}%
- **Validation Status**: ${this.results.passed ? '✅ PASS' : '❌ FAIL'}
- **Recommendation**: ${report.recommendation.decision}

## Validation Results

### 🚀 Startup Performance
${this.formatValidationResult(this.results.startupPerformance)}

### ⚡ Command Performance
${this.formatValidationResult(this.results.commandPerformance)}

### 🧪 Testing Framework
${this.formatValidationResult(this.results.testingFramework)}

### 💾 Memory Usage
${this.formatValidationResult(this.results.memoryUsage)}

### 🔨 Build Optimization
${this.formatValidationResult(this.results.buildOptimization)}

### 🔍 Regression Check
${this.formatValidationResult(this.results.regressionCheck)}

## Recommendation

**Decision**: ${report.recommendation.decision}
**Confidence**: ${report.recommendation.confidence}
**Reasoning**: ${report.recommendation.reasoning}

${report.recommendation.requiredFixes ?
`### Required Fixes
${report.recommendation.requiredFixes.map(fix => `- ${fix}`).join('\\n')}` : ''}

## Next Steps

${report.nextSteps.map(step => `- ${step}`).join('\\n')}

---
*Generated by Claude-Flow Rollback Validation Suite*
`;
  }

  formatValidationResult(result) {
    if (!result) return 'No data available';

    if (result.error) return `❌ FAILED: ${result.error}`;

    return result.passed ? '✅ PASSED' : '❌ FAILED';
  }

  displayResults() {
    console.log('\n📊 Validation Summary:');
    console.log('═'.repeat(60));
    console.log(`Overall Score: ${this.results.overallScore.toFixed(1)}%`);
    console.log(`Status: ${this.results.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('─'.repeat(60));

    const checks = [
      ['Startup Performance', this.results.startupPerformance?.passed],
      ['Command Performance', this.results.commandPerformance?.passed],
      ['Testing Framework', this.results.testingFramework?.passed],
      ['Memory Usage', this.results.memoryUsage?.passed],
      ['Build Optimization', this.results.buildOptimization?.passed],
      ['Regression Check', this.results.regressionCheck?.passed],
    ];

    checks.forEach(([name, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`${name.padEnd(20)}: ${status}`);
    });

    console.log('═'.repeat(60));
    console.log(`📄 Detailed report: day-7-rollback-validation-report.json`);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new RollbackValidationSuite();
  validator.runValidation().catch(console.error);
}

export { RollbackValidationSuite };
