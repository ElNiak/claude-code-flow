#!/usr/bin/env node

/**
 * Validation Test Execution Script
 *
 * Runs comprehensive validation tests for token-efficient tool usage
 */

import ValidationRunner from './validation-runner.js';
import TestDataGenerator from './test-data-generator.js';
import fs from 'fs';
import path from 'path';

class ValidationTestExecutor {
  constructor() {
    this.runner = new ValidationRunner();
    this.generator = new TestDataGenerator();
    this.config = this.loadConfig();
    this.results = {};
  }

  loadConfig() {
    try {
      const configPath = './monitoring-config.json';
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Could not load monitoring config, using defaults');
    }
    return { monitoring: { enabled: true }, validation: { enabled: true } };
  }

  /**
   * Execute Full Validation Suite
   */
  async executeFullValidationSuite() {
    console.log('🚀 Starting Full Validation Suite...\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    VALIDATION FRAMEWORK');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Phase 1: Generate Test Data
    console.log('📊 PHASE 1: Test Data Generation');
    console.log('─────────────────────────────────────────────────────────');
    await this.generator.generateAllTestData();

    // Phase 2: Execute Core Validation Tests
    console.log('\n🧪 PHASE 2: Core Validation Tests');
    console.log('─────────────────────────────────────────────────────────');
    const coreResults = await this.runner.runAllValidationTests();
    this.results.coreValidation = coreResults;

    // Phase 3: Benchmark Comparisons
    console.log('\n⚖️  PHASE 3: Benchmark Comparisons');
    console.log('─────────────────────────────────────────────────────────');
    const benchmarkResults = await this.runner.runBenchmarkComparison();
    this.results.benchmarks = benchmarkResults;

    // Phase 4: Quality Metrics Analysis
    console.log('\n📈 PHASE 4: Quality Metrics Analysis');
    console.log('─────────────────────────────────────────────────────────');
    const qualityAnalysis = await this.analyzeQualityMetrics();
    this.results.qualityAnalysis = qualityAnalysis;

    // Phase 5: Generate Comprehensive Report
    console.log('\n📋 PHASE 5: Comprehensive Report Generation');
    console.log('─────────────────────────────────────────────────────────');
    const report = this.runner.generateReport();
    this.results.finalReport = report;

    // Phase 6: Save Results
    await this.saveResults();

    console.log('\n✅ VALIDATION SUITE COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');

    return this.results;
  }

  /**
   * Execute Specific Validation Test
   */
  async executeSpecificTest(testName, strategy = 'optimized') {
    console.log(`🎯 Executing Specific Test: ${testName} (${strategy})\n`);

    const result = await this.runner.runSpecificTest(testName, strategy);

    if (result) {
      console.log('📊 Test Summary:');
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Alerts: ${result.alerts.length}`);

      if (result.alerts.length > 0) {
        console.log('\n⚠️  Alerts Generated:');
        result.alerts.forEach((alert, i) => {
          console.log(`   ${i + 1}. ${alert.type.toUpperCase()}: ${alert.message}`);
        });
      }

      return result;
    } else {
      console.log('❌ Test execution failed');
      return null;
    }
  }

  /**
   * Run Progressive Analysis Validation
   */
  async runProgressiveAnalysisValidation() {
    console.log('🔄 Running Progressive Analysis Validation...\n');

    const scenarios = ['large_repository_analysis', 'mixed_file_types', 'complex_symbol_hierarchies'];
    const phases = ['overview', 'targeted', 'comprehensive'];
    const results = {};

    for (const scenario of scenarios) {
      console.log(`📋 Scenario: ${scenario}`);
      results[scenario] = {};

      for (const phase of phases) {
        console.log(`   📊 Phase: ${phase}`);

        const result = await this.runner.runSpecificTest(scenario, `progressive_${phase}`);
        results[scenario][phase] = result;

        if (result) {
          const quality = Math.round((result.metrics.accuracy_preservation || 0) * 100);
          const tokens = result.metrics.tokensUsed || 0;
          console.log(`     Quality: ${quality}%, Tokens: ${tokens}`);
        }
      }
      console.log('');
    }

    return results;
  }

  /**
   * Analyze Quality Metrics
   */
  async analyzeQualityMetrics() {
    console.log('📈 Analyzing Quality Metrics...');

    const analysis = {
      tokenEfficiency: {
        average: 0,
        min: Infinity,
        max: 0,
        trend: 'stable'
      },
      qualityPreservation: {
        average: 0,
        min: Infinity,
        max: 0,
        trend: 'stable'
      },
      performanceImprovement: {
        average: 0,
        min: Infinity,
        max: 0,
        trend: 'improving'
      },
      recommendations: []
    };

    // Analyze results from core validation
    if (this.results.coreValidation) {
      const allResults = [];
      Object.values(this.results.coreValidation).forEach(scenario => {
        Object.values(scenario).forEach(result => {
          if (result.success && result.metrics) {
            allResults.push(result);
          }
        });
      });

      if (allResults.length > 0) {
        // Calculate token efficiency stats
        const tokenEfficiencies = allResults.map(r => r.metrics.token_efficiency || 0);
        analysis.tokenEfficiency.average = tokenEfficiencies.reduce((a, b) => a + b, 0) / tokenEfficiencies.length;
        analysis.tokenEfficiency.min = Math.min(...tokenEfficiencies);
        analysis.tokenEfficiency.max = Math.max(...tokenEfficiencies);

        // Calculate quality preservation stats
        const qualityScores = allResults.map(r => r.metrics.accuracy_preservation || 0);
        analysis.qualityPreservation.average = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
        analysis.qualityPreservation.min = Math.min(...qualityScores);
        analysis.qualityPreservation.max = Math.max(...qualityScores);

        // Generate recommendations
        if (analysis.tokenEfficiency.average < 0.8) {
          analysis.recommendations.push('Implement more aggressive token optimization strategies');
        }

        if (analysis.qualityPreservation.average < 0.90) {
          analysis.recommendations.push('Enhance fallback mechanisms to preserve analysis quality');
        }

        if (analysis.qualityPreservation.min < 0.85) {
          analysis.recommendations.push('Critical: Some tests show significant quality degradation');
        }
      }
    }

    console.log(`   Token Efficiency: ${Math.round(analysis.tokenEfficiency.average * 100)}% (${Math.round(analysis.tokenEfficiency.min * 100)}% - ${Math.round(analysis.tokenEfficiency.max * 100)}%)`);
    console.log(`   Quality Preservation: ${Math.round(analysis.qualityPreservation.average * 100)}% (${Math.round(analysis.qualityPreservation.min * 100)}% - ${Math.round(analysis.qualityPreservation.max * 100)}%)`);
    console.log(`   Recommendations: ${analysis.recommendations.length}`);

    return analysis;
  }

  /**
   * Save Results to File
   */
  async saveResults() {
    console.log('💾 Saving validation results...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = './validation-results';

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultsFile = path.join(resultsDir, `validation-results-${timestamp}.json`);
    const summaryFile = path.join(resultsDir, 'latest-summary.json');

    // Save detailed results
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));

    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: this.countTotalTests(),
      successRate: this.calculateSuccessRate(),
      averageTokenEfficiency: this.calculateAverageTokenEfficiency(),
      averageQualityPreservation: this.calculateAverageQualityPreservation(),
      keyFindings: this.extractKeyFindings(),
      recommendations: this.results.qualityAnalysis?.recommendations || []
    };

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`   Detailed results: ${resultsFile}`);
    console.log(`   Summary: ${summaryFile}`);
  }

  /**
   * Helper Methods
   */
  countTotalTests() {
    let count = 0;
    if (this.results.coreValidation) {
      Object.values(this.results.coreValidation).forEach(scenario => {
        count += Object.keys(scenario).length;
      });
    }
    return count;
  }

  calculateSuccessRate() {
    const total = this.countTotalTests();
    if (total === 0) return 0;

    let passed = 0;
    if (this.results.coreValidation) {
      Object.values(this.results.coreValidation).forEach(scenario => {
        Object.values(scenario).forEach(result => {
          if (result.success) passed++;
        });
      });
    }

    return (passed / total) * 100;
  }

  calculateAverageTokenEfficiency() {
    const efficiencies = [];
    if (this.results.coreValidation) {
      Object.values(this.results.coreValidation).forEach(scenario => {
        Object.values(scenario).forEach(result => {
          if (result.success && result.metrics && result.metrics.token_efficiency) {
            efficiencies.push(result.metrics.token_efficiency);
          }
        });
      });
    }

    return efficiencies.length > 0 ?
      efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length : 0;
  }

  calculateAverageQualityPreservation() {
    const qualities = [];
    if (this.results.coreValidation) {
      Object.values(this.results.coreValidation).forEach(scenario => {
        Object.values(scenario).forEach(result => {
          if (result.success && result.metrics && result.metrics.accuracy_preservation) {
            qualities.push(result.metrics.accuracy_preservation);
          }
        });
      });
    }

    return qualities.length > 0 ?
      qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
  }

  extractKeyFindings() {
    const findings = [];

    if (this.results.qualityAnalysis) {
      const qa = this.results.qualityAnalysis;

      if (qa.tokenEfficiency.average > 0.9) {
        findings.push('Excellent token efficiency achieved');
      } else if (qa.tokenEfficiency.average < 0.7) {
        findings.push('Token efficiency needs improvement');
      }

      if (qa.qualityPreservation.average > 0.95) {
        findings.push('High quality preservation maintained');
      } else if (qa.qualityPreservation.average < 0.85) {
        findings.push('Quality preservation concerns identified');
      }
    }

    return findings;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const executor = new ValidationTestExecutor();

  const command = process.argv[2];
  const testName = process.argv[3];
  const strategy = process.argv[4] || 'optimized';

  switch (command) {
    case 'full':
      executor.executeFullValidationSuite().then(results => {
        console.log('\n🎯 Final Results Summary:');
        console.log(`   Total Tests: ${executor.countTotalTests()}`);
        console.log(`   Success Rate: ${Math.round(executor.calculateSuccessRate())}%`);
        console.log(`   Token Efficiency: ${Math.round(executor.calculateAverageTokenEfficiency() * 100)}%`);
        console.log(`   Quality Preservation: ${Math.round(executor.calculateAverageQualityPreservation() * 100)}%`);
      });
      break;

    case 'test':
      if (testName) {
        executor.executeSpecificTest(testName, strategy);
      } else {
        console.log('Usage: node run-validation-tests.js test <test-name> [strategy]');
      }
      break;

    case 'progressive':
      executor.runProgressiveAnalysisValidation().then(() => {
        console.log('✅ Progressive analysis validation completed');
      });
      break;

    case 'monitor':
      executor.runner.monitorRealTimeValidation().then(() => {
        console.log('✅ Real-time monitoring completed');
      });
      break;

    default:
      console.log('🧪 Validation Test Executor');
      console.log('Usage: node run-validation-tests.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  full        - Run complete validation suite');
      console.log('  test        - Run specific test scenario');
      console.log('  progressive - Run progressive analysis validation');
      console.log('  monitor     - Start real-time monitoring');
      console.log('');
      console.log('Examples:');
      console.log('  node run-validation-tests.js full');
      console.log('  node run-validation-tests.js test large_repository_analysis optimized');
      console.log('  node run-validation-tests.js progressive');
  }
}

export default ValidationTestExecutor;
