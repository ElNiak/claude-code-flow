/**
 * Validation Runner - Executes validation tests and generates reports
 */

import ValidationFramework from './validation-framework.js';

class ValidationRunner {
  constructor() {
    this.framework = new ValidationFramework();
    this.initialize();
  }

  initialize() {
    this.framework.initializeTestScenarios();
    this.framework.initializeQualityMetrics();
    this.framework.initializeBenchmarkComparisons();
    this.framework.initializeMonitoringSystem();
  }

  /**
   * Run All Validation Tests
   */
  async runAllValidationTests() {
    console.log('🧪 Starting Validation Framework Tests...\n');

    const strategies = ['original', 'optimized', 'progressive'];
    const results = {};

    for (const scenario of this.framework.testScenarios) {
      console.log(`📋 Testing Scenario: ${scenario.name}`);
      results[scenario.name] = {};

      for (const strategy of strategies) {
        console.log(`  ⚡ Strategy: ${strategy}`);

        try {
          const result = await this.framework.executeValidationTest(scenario.name, strategy);
          results[scenario.name][strategy] = result;

          const status = result.success ? '✅ PASSED' : '❌ FAILED';
          console.log(`    ${status} - Tokens: ${result.metrics.tokensUsed || 'N/A'}, Quality: ${Math.round((result.metrics.accuracy_preservation || 0) * 100)}%`);

          if (result.alerts.length > 0) {
            console.log(`    ⚠️  Alerts: ${result.alerts.length}`);
          }
        } catch (error) {
          console.log(`    ❌ ERROR: ${error.message}`);
          results[scenario.name][strategy] = { error: error.message, success: false };
        }
      }
      console.log('');
    }

    return results;
  }

  /**
   * Run Specific Validation Test
   */
  async runSpecificTest(scenarioName, strategy = 'optimized') {
    console.log(`🎯 Running Specific Test: ${scenarioName} with ${strategy} strategy\n`);

    try {
      const result = await this.framework.executeValidationTest(scenarioName, strategy);
      this.displayTestResult(result);
      return result;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Display Test Result
   */
  displayTestResult(result) {
    console.log(`📊 Test Results for ${result.scenario}:`);
    console.log(`   Strategy: ${result.strategy}`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Duration: ${result.duration}ms\n`);

    console.log('📈 Metrics:');
    Object.entries(result.metrics).forEach(([key, value]) => {
      const formatted = typeof value === 'number' ?
        (value < 1 ? `${Math.round(value * 100)}%` : Math.round(value)) : value;
      console.log(`   ${key}: ${formatted}`);
    });

    console.log('\n✅ Validations:');
    Object.entries(result.validations).forEach(([key, passed]) => {
      console.log(`   ${key}: ${passed ? '✅' : '❌'}`);
    });

    if (result.alerts.length > 0) {
      console.log('\n⚠️  Alerts:');
      result.alerts.forEach(alert => {
        console.log(`   ${alert.type.toUpperCase()}: ${alert.message} (${alert.value})`);
      });
    }
    console.log('');
  }

  /**
   * Generate and Display Report
   */
  generateReport() {
    console.log('📋 Generating Validation Report...\n');

    const report = this.framework.generateValidationReport();

    console.log('📊 VALIDATION SUMMARY:');
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passedTests} ✅`);
    console.log(`   Failed: ${report.summary.failedTests} ❌`);
    console.log(`   Success Rate: ${Math.round((report.summary.passedTests / report.summary.totalTests) * 100)}%`);
    console.log(`   Average Token Reduction: ${Math.round(report.summary.averageTokenReduction)}%`);
    console.log(`   Average Quality Preservation: ${Math.round(report.summary.averageQualityPreservation)}%\n`);

    if (report.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    }

    return report;
  }

  /**
   * Monitor Real-time Validation
   */
  async monitorRealTimeValidation(duration = 300000) { // 5 minutes
    console.log(`🔍 Starting Real-time Validation Monitoring for ${duration/1000} seconds...\n`);

    const startTime = Date.now();
    const monitoringInterval = 30000; // Check every 30 seconds

    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= duration) {
        clearInterval(interval);
        console.log('⏰ Real-time monitoring completed.');
        return;
      }

      // Run a quick validation test
      const quickTest = await this.runSpecificTest('mixed_file_types', 'optimized');

      if (quickTest && !quickTest.success) {
        console.log('🚨 ALERT: Validation test failed during monitoring!');
      }

      console.log(`⏱️  Monitoring checkpoint: ${Math.round(elapsed/1000)}s elapsed`);
    }, monitoringInterval);
  }

  /**
   * Benchmark Comparison
   */
  async runBenchmarkComparison() {
    console.log('⚖️  Running Benchmark Comparison...\n');

    const results = {};

    for (const scenario of this.framework.testScenarios) {
      console.log(`📊 Benchmarking: ${scenario.name}`);

      const original = await this.framework.executeValidationTest(scenario.name, 'original');
      const optimized = await this.framework.executeValidationTest(scenario.name, 'optimized');

      const comparison = {
        tokenReduction: ((original.metrics.tokensUsed - optimized.metrics.tokensUsed) / original.metrics.tokensUsed) * 100,
        qualityPreservation: (optimized.metrics.accuracy_preservation / original.metrics.accuracy_preservation) * 100,
        performanceImprovement: ((original.duration - optimized.duration) / original.duration) * 100
      };

      results[scenario.name] = comparison;

      console.log(`   Token Reduction: ${Math.round(comparison.tokenReduction)}%`);
      console.log(`   Quality Preservation: ${Math.round(comparison.qualityPreservation)}%`);
      console.log(`   Performance Improvement: ${Math.round(comparison.performanceImprovement)}%\n`);
    }

    return results;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ValidationRunner();

  const command = process.argv[2];
  const scenario = process.argv[3];
  const strategy = process.argv[4];

  switch (command) {
    case 'all':
      runner.runAllValidationTests().then(() => {
        runner.generateReport();
      });
      break;
    case 'test':
      if (scenario) {
        runner.runSpecificTest(scenario, strategy);
      } else {
        console.log('Usage: node validation-runner.js test <scenario> [strategy]');
      }
      break;
    case 'monitor':
      runner.monitorRealTimeValidation();
      break;
    case 'benchmark':
      runner.runBenchmarkComparison();
      break;
    case 'report':
      runner.generateReport();
      break;
    default:
      console.log('Usage: node validation-runner.js <command> [options]');
      console.log('Commands:');
      console.log('  all       - Run all validation tests');
      console.log('  test      - Run specific test scenario');
      console.log('  monitor   - Real-time validation monitoring');
      console.log('  benchmark - Run benchmark comparison');
      console.log('  report    - Generate validation report');
  }
}

export default ValidationRunner;
