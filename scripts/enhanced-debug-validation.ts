#!/usr/bin/env tsx
/**
 * Enhanced Debug Implementation Validation Script
 * Comprehensive validation with TDD framework integration and rollback testing
 */

import { performance } from 'node:perf_hooks';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { DebugValidationSuite } from './validate-debug-implementation.js';

interface EnhancedValidationConfig {
  includeCLIInstrumentation: boolean;
  includeConsoleMigrationValidation: boolean;
  includeRollbackTesting: boolean;
  includePerformanceRegression: boolean;
  includeLondonSchoolValidation: boolean;
  performanceThresholds: {
    maxOverheadPercent: number;
    maxMemoryGrowthMB: number;
    maxExecutionTimeMs: number;
    minThroughputOps: number;
  };
  rollbackConfig: {
    createCheckpoint: boolean;
    validateRollback: boolean;
    cleanupAfterTest: boolean;
  };
}

interface ValidationSuite {
  name: string;
  testPattern: string;
  category: 'unit' | 'integration' | 'validation';
  critical: boolean;
  timeout: number;
  requiredCoverage?: number;
}

interface EnhancedValidationResults {
  overall: {
    passed: boolean;
    score: number;
    duration: number;
    timestamp: string;
  };
  framework: {
    tddFramework: ValidationResult;
    londonSchoolPatterns: ValidationResult;
    mockingInfrastructure: ValidationResult;
  };
  implementation: {
    debugLogger: ValidationResult;
    mcpDebugLogger: ValidationResult;
    consoleMigration: ValidationResult;
    cliInstrumentation: ValidationResult;
  };
  systemValidation: {
    performanceRegression: ValidationResult;
    memoryPressure: ValidationResult;
    securityValidation: ValidationResult;
    rollbackTesting: ValidationResult;
  };
  coverage: {
    overall: number;
    byCategory: Record<string, number>;
    meetsCriteria: boolean;
  };
  recommendations: string[];
  riskAssessment: RiskAssessment;
}

interface ValidationResult {
  passed: boolean;
  score: number;
  duration: number;
  details: string;
  issues: Issue[];
  metrics?: ValidationMetrics;
}

interface Issue {
  type: 'error' | 'warning' | 'info';
  category: string;
  description: string;
  suggestion?: string;
  critical: boolean;
}

interface ValidationMetrics {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  coverage: number;
  performanceOverhead: number;
  memoryUsage: number;
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  rollbackReady: boolean;
}

interface RiskFactor {
  type: 'performance' | 'stability' | 'compatibility' | 'security';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  probability: string;
}

class EnhancedDebugValidator {
  private config: EnhancedValidationConfig;
  private results: EnhancedValidationResults;
  private validationSuites: ValidationSuite[];

  constructor(config: EnhancedValidationConfig) {
    this.config = config;
    this.results = this.initializeResults();
    this.validationSuites = this.defineValidationSuites();
  }

  async runEnhancedValidation(): Promise<EnhancedValidationResults> {
    console.log('🚀 Starting Enhanced Debug Implementation Validation\n');
    console.log('====================================================');
    console.log(
      `TDD Framework Integration: ${this.config.includeCLIInstrumentation ? '✅' : '❌'}`,
    );
    console.log(
      `Console Migration Validation: ${this.config.includeConsoleMigrationValidation ? '✅' : '❌'}`,
    );
    console.log(`Rollback Testing: ${this.config.includeRollbackTesting ? '✅' : '❌'}`);
    console.log(
      `Performance Regression: ${this.config.includePerformanceRegression ? '✅' : '❌'}`,
    );
    console.log(
      `London School Validation: ${this.config.includeLondonSchoolValidation ? '✅' : '❌'}`,
    );
    console.log('====================================================\n');

    const overallStart = performance.now();

    try {
      // Phase 1: TDD Framework Validation
      await this.validateTDDFramework();

      // Phase 2: Implementation Validation
      await this.validateImplementation();

      // Phase 3: System-Level Validation
      await this.validateSystemLevel();

      // Phase 4: Coverage Analysis
      await this.analyzeCoverage();

      // Phase 5: Risk Assessment
      await this.performRiskAssessment();

      // Phase 6: Generate Recommendations
      this.generateRecommendations();

      const overallEnd = performance.now();
      this.results.overall.duration = overallEnd - overallStart;
      this.results.overall.passed = this.calculateOverallSuccess();
      this.results.overall.score = this.calculateOverallScore();

      // Generate comprehensive report
      await this.generateEnhancedReport();

      console.log('\n📊 ENHANCED VALIDATION SUMMARY');
      console.log('===============================');
      this.displayResults();
    } catch (error) {
      console.error('❌ Enhanced validation failed:', error);
      this.results.overall.passed = false;
      this.results.overall.score = 0;
    }

    return this.results;
  }

  private async validateTDDFramework(): Promise<void> {
    console.log('🔍 Phase 1: TDD Framework Validation');
    console.log('-------------------------------------');

    // Validate TDD Framework Setup
    this.results.framework.tddFramework = await this.runValidationSuite(
      'TDD Framework Infrastructure',
      'tests/utils/london-school-test-helpers.test.ts',
    );

    // Validate London School Patterns
    if (this.config.includeLondonSchoolValidation) {
      this.results.framework.londonSchoolPatterns = await this.runValidationSuite(
        'London School TDD Patterns',
        'tests/unit/debug/*london-school*.test.ts',
      );
    }

    // Validate Mocking Infrastructure
    this.results.framework.mockingInfrastructure = await this.runValidationSuite(
      'Mock Factory Infrastructure',
      'tests/unit/debug/debug-logger.test.ts tests/unit/debug/mcp-debug-logger.test.ts',
    );

    console.log(
      `✅ TDD Framework: ${this.results.framework.tddFramework.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ London School: ${this.results.framework.londonSchoolPatterns.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ Mock Infrastructure: ${this.results.framework.mockingInfrastructure.passed ? 'PASSED' : 'FAILED'}\n`,
    );
  }

  private async validateImplementation(): Promise<void> {
    console.log('🔍 Phase 2: Implementation Validation');
    console.log('--------------------------------------');

    // Core Debug Logger
    this.results.implementation.debugLogger = await this.runValidationSuite(
      'Debug Logger Implementation',
      'tests/unit/debug/debug-logger*.test.ts',
    );

    // MCP Debug Logger
    this.results.implementation.mcpDebugLogger = await this.runValidationSuite(
      'MCP Debug Logger Implementation',
      'tests/unit/debug/mcp-debug*.test.ts',
    );

    // Console Migration
    if (this.config.includeConsoleMigrationValidation) {
      this.results.implementation.consoleMigration = await this.runValidationSuite(
        'Console Migration Validation',
        'tests/unit/debug/console-migration*.test.ts',
      );
    }

    // CLI Instrumentation
    if (this.config.includeCLIInstrumentation) {
      this.results.implementation.cliInstrumentation = await this.runValidationSuite(
        'CLI Debug Instrumentation',
        'tests/integration/debug/cli-debug-instrumentation.test.ts',
      );
    }

    console.log(
      `✅ Debug Logger: ${this.results.implementation.debugLogger.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ MCP Debug Logger: ${this.results.implementation.mcpDebugLogger.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ Console Migration: ${this.results.implementation.consoleMigration.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ CLI Instrumentation: ${this.results.implementation.cliInstrumentation.passed ? 'PASSED' : 'FAILED'}\n`,
    );
  }

  private async validateSystemLevel(): Promise<void> {
    console.log('🔍 Phase 3: System-Level Validation');
    console.log('------------------------------------');

    // Performance Regression Testing
    if (this.config.includePerformanceRegression) {
      this.results.systemValidation.performanceRegression = await this.runValidationSuite(
        'Performance Regression Testing',
        'tests/unit/debug/performance-regression*.test.ts',
      );
    }

    // Memory Pressure Testing
    this.results.systemValidation.memoryPressure = await this.runValidationSuite(
      'Memory Pressure Simulation',
      'tests/unit/debug/memory-pressure*.test.ts',
    );

    // Security Validation
    this.results.systemValidation.securityValidation = await this.runValidationSuite(
      'Security Validation Testing',
      'tests/unit/debug/security-validation*.test.ts',
    );

    // Rollback Testing
    if (this.config.includeRollbackTesting) {
      this.results.systemValidation.rollbackTesting = await this.runValidationSuite(
        'Rollback Testing Framework',
        'tests/validation/rollback-testing-framework.test.ts',
      );
    }

    console.log(
      `✅ Performance Regression: ${this.results.systemValidation.performanceRegression.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ Memory Pressure: ${this.results.systemValidation.memoryPressure.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ Security Validation: ${this.results.systemValidation.securityValidation.passed ? 'PASSED' : 'FAILED'}`,
    );
    console.log(
      `✅ Rollback Testing: ${this.results.systemValidation.rollbackTesting.passed ? 'PASSED' : 'FAILED'}\n`,
    );
  }

  private async runValidationSuite(
    suiteName: string,
    testPattern: string,
  ): Promise<ValidationResult> {
    const start = performance.now();

    try {
      console.log(`  🧪 Running: ${suiteName}`);

      const result = await this.executeJestTest(testPattern);
      const end = performance.now();

      const validationResult: ValidationResult = {
        passed: result.success,
        score: result.success ? 100 : Math.max(0, 100 - result.failedTests * 10),
        duration: end - start,
        details: result.output,
        issues: result.issues,
        metrics: {
          testsRun: result.testsRun,
          testsPassed: result.testsPassed,
          testsFailed: result.testsFailed,
          coverage: result.coverage,
          performanceOverhead: result.performanceOverhead || 0,
          memoryUsage: result.memoryUsage || 0,
        },
      };

      console.log(
        `     ${result.success ? '✅' : '❌'} ${suiteName}: ${result.testsPassed}/${result.testsRun} tests passed`,
      );

      if (!result.success) {
        console.log(`     Issues found: ${result.issues.length}`);
        result.issues
          .filter((issue) => issue.critical)
          .forEach((issue) => {
            console.log(`       🚨 ${issue.description}`);
          });
      }

      return validationResult;
    } catch (error) {
      const end = performance.now();

      return {
        passed: false,
        score: 0,
        duration: end - start,
        details: `Validation suite failed: ${error}`,
        issues: [
          {
            type: 'error',
            category: 'execution',
            description: `Failed to execute validation suite: ${error}`,
            critical: true,
          },
        ],
      };
    }
  }

  private async executeJestTest(testPattern: string): Promise<{
    success: boolean;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    coverage: number;
    performanceOverhead?: number;
    memoryUsage?: number;
    output: string;
    issues: Issue[];
  }> {
    return new Promise((resolve) => {
      const jestArgs = [
        'jest',
        testPattern,
        '--verbose',
        '--coverage',
        '--testTimeout=30000',
        '--maxWorkers=1',
        '--forceExit',
      ];

      const jest = spawn('npx', jestArgs, {
        stdio: 'pipe',
        env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
      });

      let output = '';
      let errorOutput = '';

      jest.stdout?.on('data', (data) => {
        output += data.toString();
      });

      jest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      jest.on('close', (code) => {
        const success = code === 0;

        // Parse test results from output
        const testsMatch = output.match(
          /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/,
        );
        const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
        const overheadMatch = output.match(/Overhead:\s*(\d+\.?\d*)%/);
        const memoryMatch = output.match(/Memory:\s*(\d+\.?\d*)MB/);

        const testsRun = testsMatch ? parseInt(testsMatch[3]) : 0;
        const testsPassed = testsMatch ? parseInt(testsMatch[2]) : 0;
        const testsFailed = testsMatch ? parseInt(testsMatch[1]) : 0;
        const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
        const performanceOverhead = overheadMatch ? parseFloat(overheadMatch[1]) : undefined;
        const memoryUsage = memoryMatch ? parseFloat(memoryMatch[1]) : undefined;

        // Extract issues from output
        const issues: Issue[] = [];

        if (errorOutput.includes('FAIL')) {
          issues.push({
            type: 'error',
            category: 'test_failure',
            description: 'One or more tests failed',
            critical: true,
          });
        }

        if (coverage < 95) {
          issues.push({
            type: 'warning',
            category: 'coverage',
            description: `Coverage ${coverage}% is below required 95%`,
            suggestion: 'Add more test cases to improve coverage',
            critical: false,
          });
        }

        if (
          performanceOverhead &&
          performanceOverhead > this.config.performanceThresholds.maxOverheadPercent
        ) {
          issues.push({
            type: 'error',
            category: 'performance',
            description: `Performance overhead ${performanceOverhead}% exceeds threshold`,
            critical: true,
          });
        }

        resolve({
          success,
          testsRun,
          testsPassed,
          testsFailed,
          coverage,
          performanceOverhead,
          memoryUsage,
          output: output + errorOutput,
          issues,
        });
      });
    });
  }

  private async analyzeCoverage(): Promise<void> {
    console.log('🔍 Phase 4: Coverage Analysis');
    console.log('------------------------------');

    try {
      // Run comprehensive coverage analysis
      const coverageResult = await this.executeJestTest(
        'tests/unit/debug/**/*.test.ts tests/integration/debug/**/*.test.ts',
      );

      this.results.coverage.overall = coverageResult.coverage;
      this.results.coverage.byCategory = {
        unit: coverageResult.coverage, // Simplified for mock
        integration: coverageResult.coverage,
        validation: coverageResult.coverage,
      };
      this.results.coverage.meetsCriteria = coverageResult.coverage >= 95;

      console.log(`📊 Overall Coverage: ${this.results.coverage.overall.toFixed(1)}%`);
      console.log(
        `✅ Meets Criteria (≥95%): ${this.results.coverage.meetsCriteria ? 'YES' : 'NO'}\n`,
      );
    } catch (error) {
      console.log(`❌ Coverage analysis failed: ${error}\n`);
      this.results.coverage.overall = 0;
      this.results.coverage.meetsCriteria = false;
    }
  }

  private async performRiskAssessment(): Promise<void> {
    console.log('🔍 Phase 5: Risk Assessment');
    console.log('----------------------------');

    const riskFactors: RiskFactor[] = [];

    // Performance Risk Assessment
    const perfOverhead = this.results.implementation.debugLogger.metrics?.performanceOverhead || 0;
    if (perfOverhead > this.config.performanceThresholds.maxOverheadPercent) {
      riskFactors.push({
        type: 'performance',
        severity: 'high',
        description: `Debug overhead ${perfOverhead}% exceeds acceptable threshold`,
        impact: 'System performance degradation in production',
        probability: 'High if deployed without optimization',
      });
    }

    // Stability Risk Assessment
    const failedTests = this.countFailedValidations();
    if (failedTests > 0) {
      riskFactors.push({
        type: 'stability',
        severity: failedTests > 3 ? 'high' : 'medium',
        description: `${failedTests} validation suites failed`,
        impact: 'Potential system instability or feature regression',
        probability: 'Medium to high depending on failed components',
      });
    }

    // Coverage Risk Assessment
    if (!this.results.coverage.meetsCriteria) {
      riskFactors.push({
        type: 'stability',
        severity: 'medium',
        description: `Test coverage ${this.results.coverage.overall.toFixed(1)}% below 95% requirement`,
        impact: 'Increased risk of undetected bugs',
        probability: 'Medium - gaps in test coverage',
      });
    }

    // Rollback Readiness Assessment
    const rollbackReady =
      this.config.includeRollbackTesting && this.results.systemValidation.rollbackTesting.passed;

    const overallRisk = this.calculateOverallRisk(riskFactors);

    this.results.riskAssessment = {
      overallRisk,
      riskFactors,
      mitigationStrategies: this.generateMitigationStrategies(riskFactors),
      rollbackReady,
    };

    console.log(`🎯 Overall Risk Level: ${overallRisk.toUpperCase()}`);
    console.log(`🔄 Rollback Ready: ${rollbackReady ? 'YES' : 'NO'}`);
    console.log(`⚠️  Risk Factors: ${riskFactors.length}`);
    console.log(
      `🛡️  Mitigation Strategies: ${this.results.riskAssessment.mitigationStrategies.length}\n`,
    );
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Performance Recommendations
    if (
      this.results.implementation.debugLogger.metrics?.performanceOverhead &&
      this.results.implementation.debugLogger.metrics.performanceOverhead > 5
    ) {
      recommendations.push('Optimize debug logger performance to reduce overhead below 5%');
    }

    // Coverage Recommendations
    if (!this.results.coverage.meetsCriteria) {
      recommendations.push(
        `Increase test coverage from ${this.results.coverage.overall.toFixed(1)}% to at least 95%`,
      );
    }

    // TDD Framework Recommendations
    if (!this.results.framework.tddFramework.passed) {
      recommendations.push('Fix TDD framework infrastructure issues before proceeding');
    }

    // London School Pattern Recommendations
    if (!this.results.framework.londonSchoolPatterns.passed) {
      recommendations.push('Review and fix London School TDD pattern implementations');
    }

    // Rollback Recommendations
    if (
      this.config.includeRollbackTesting &&
      !this.results.systemValidation.rollbackTesting.passed
    ) {
      recommendations.push('Implement comprehensive rollback procedures before deployment');
    }

    // CLI Instrumentation Recommendations
    if (
      this.config.includeCLIInstrumentation &&
      !this.results.implementation.cliInstrumentation.passed
    ) {
      recommendations.push('Fix CLI debug instrumentation issues to ensure proper logging');
    }

    // Security Recommendations
    if (!this.results.systemValidation.securityValidation.passed) {
      recommendations.push('Address security validation failures before production deployment');
    }

    // General Recommendations
    if (this.results.overall.score < 90) {
      recommendations.push('Overall validation score is below 90% - review all failed components');
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'All validations passed! System is ready for deployment with monitoring.',
      );
    }

    this.results.recommendations = recommendations;
  }

  private calculateOverallSuccess(): boolean {
    const criticalValidations = [
      this.results.framework.tddFramework.passed,
      this.results.implementation.debugLogger.passed,
      this.results.implementation.mcpDebugLogger.passed,
      this.results.systemValidation.securityValidation.passed,
    ];

    const optionalValidations = [
      this.results.framework.londonSchoolPatterns.passed,
      this.results.implementation.consoleMigration.passed,
      this.results.implementation.cliInstrumentation.passed,
      this.results.systemValidation.performanceRegression.passed,
      this.results.systemValidation.memoryPressure.passed,
      this.results.systemValidation.rollbackTesting.passed,
    ];

    const criticalPassed = criticalValidations.every((v) => v);
    const optionalPassedRatio =
      optionalValidations.filter((v) => v).length / optionalValidations.length;

    return criticalPassed && optionalPassedRatio >= 0.8; // 80% of optional tests must pass
  }

  private calculateOverallScore(): number {
    const scores = [
      this.results.framework.tddFramework.score,
      this.results.framework.londonSchoolPatterns.score,
      this.results.framework.mockingInfrastructure.score,
      this.results.implementation.debugLogger.score,
      this.results.implementation.mcpDebugLogger.score,
      this.results.implementation.consoleMigration.score,
      this.results.implementation.cliInstrumentation.score,
      this.results.systemValidation.performanceRegression.score,
      this.results.systemValidation.memoryPressure.score,
      this.results.systemValidation.securityValidation.score,
      this.results.systemValidation.rollbackTesting.score,
    ];

    const validScores = scores.filter((score) => score > 0);
    return validScores.length > 0
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      : 0;
  }

  private countFailedValidations(): number {
    const validations = [
      this.results.framework.tddFramework,
      this.results.framework.londonSchoolPatterns,
      this.results.framework.mockingInfrastructure,
      this.results.implementation.debugLogger,
      this.results.implementation.mcpDebugLogger,
      this.results.implementation.consoleMigration,
      this.results.implementation.cliInstrumentation,
      this.results.systemValidation.performanceRegression,
      this.results.systemValidation.memoryPressure,
      this.results.systemValidation.securityValidation,
      this.results.systemValidation.rollbackTesting,
    ];

    return validations.filter((v) => !v.passed).length;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): 'low' | 'medium' | 'high' | 'critical' {
    if (riskFactors.some((r) => r.severity === 'high')) return 'critical';
    if (riskFactors.filter((r) => r.severity === 'medium').length > 2) return 'high';
    if (riskFactors.length > 0) return 'medium';
    return 'low';
  }

  private generateMitigationStrategies(riskFactors: RiskFactor[]): string[] {
    const strategies: string[] = [];

    riskFactors.forEach((factor) => {
      switch (factor.type) {
        case 'performance':
          strategies.push('Implement performance monitoring and optimization');
          strategies.push('Consider lazy loading and caching strategies');
          break;
        case 'stability':
          strategies.push('Increase test coverage and validation');
          strategies.push('Implement comprehensive monitoring and alerting');
          break;
        case 'security':
          strategies.push('Conduct security audit and penetration testing');
          strategies.push('Implement additional security controls');
          break;
        case 'compatibility':
          strategies.push('Perform extensive compatibility testing');
          strategies.push('Create compatibility matrix documentation');
          break;
      }
    });

    return [...new Set(strategies)]; // Remove duplicates
  }

  private defineValidationSuites(): ValidationSuite[] {
    return [
      {
        name: 'TDD Framework Infrastructure',
        testPattern: 'tests/utils/london-school-test-helpers.test.ts',
        category: 'validation',
        critical: true,
        timeout: 15000,
        requiredCoverage: 95,
      },
      {
        name: 'Debug Logger Core',
        testPattern: 'tests/unit/debug/debug-logger*.test.ts',
        category: 'unit',
        critical: true,
        timeout: 20000,
        requiredCoverage: 98,
      },
      {
        name: 'MCP Debug Integration',
        testPattern: 'tests/unit/debug/mcp-debug*.test.ts',
        category: 'unit',
        critical: true,
        timeout: 25000,
        requiredCoverage: 95,
      },
      {
        name: 'CLI Debug Instrumentation',
        testPattern: 'tests/integration/debug/cli-debug-instrumentation.test.ts',
        category: 'integration',
        critical: false,
        timeout: 30000,
        requiredCoverage: 90,
      },
      {
        name: 'Console Migration Validation',
        testPattern: 'tests/unit/debug/console-migration-validation.test.ts',
        category: 'unit',
        critical: false,
        timeout: 20000,
        requiredCoverage: 95,
      },
      {
        name: 'Rollback Testing Framework',
        testPattern: 'tests/validation/rollback-testing-framework.test.ts',
        category: 'validation',
        critical: false,
        timeout: 35000,
        requiredCoverage: 90,
      },
    ];
  }

  private initializeResults(): EnhancedValidationResults {
    const defaultValidationResult: ValidationResult = {
      passed: false,
      score: 0,
      duration: 0,
      details: '',
      issues: [],
    };

    return {
      overall: {
        passed: false,
        score: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
      },
      framework: {
        tddFramework: { ...defaultValidationResult },
        londonSchoolPatterns: { ...defaultValidationResult },
        mockingInfrastructure: { ...defaultValidationResult },
      },
      implementation: {
        debugLogger: { ...defaultValidationResult },
        mcpDebugLogger: { ...defaultValidationResult },
        consoleMigration: { ...defaultValidationResult },
        cliInstrumentation: { ...defaultValidationResult },
      },
      systemValidation: {
        performanceRegression: { ...defaultValidationResult },
        memoryPressure: { ...defaultValidationResult },
        securityValidation: { ...defaultValidationResult },
        rollbackTesting: { ...defaultValidationResult },
      },
      coverage: {
        overall: 0,
        byCategory: {},
        meetsCriteria: false,
      },
      recommendations: [],
      riskAssessment: {
        overallRisk: 'low',
        riskFactors: [],
        mitigationStrategies: [],
        rollbackReady: false,
      },
    };
  }

  private async generateEnhancedReport(): Promise<void> {
    const reportPath = path.join(
      process.cwd(),
      'test-reports',
      'enhanced-debug-validation-report.json',
    );

    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    const report = {
      metadata: {
        timestamp: this.results.overall.timestamp,
        duration: this.results.overall.duration,
        nodeVersion: process.version,
        platform: process.platform,
        configuration: this.config,
      },
      results: this.results,
      summary: {
        overallPassed: this.results.overall.passed,
        overallScore: this.results.overall.score,
        totalRecommendations: this.results.recommendations.length,
        riskLevel: this.results.riskAssessment.overallRisk,
      },
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Enhanced validation report: ${reportPath}`);
  }

  private displayResults(): void {
    console.log(`Overall Status: ${this.results.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Overall Score: ${this.results.overall.score.toFixed(1)}%`);
    console.log(`Execution Time: ${(this.results.overall.duration / 1000).toFixed(2)}s`);
    console.log(`Risk Level: ${this.results.riskAssessment.overallRisk.toUpperCase()}`);
    console.log(`Coverage: ${this.results.coverage.overall.toFixed(1)}%`);

    console.log('\n📋 Component Results:');
    console.log(
      `  TDD Framework: ${this.results.framework.tddFramework.passed ? '✅' : '❌'} (${this.results.framework.tddFramework.score.toFixed(0)}%)`,
    );
    console.log(
      `  Debug Logger: ${this.results.implementation.debugLogger.passed ? '✅' : '❌'} (${this.results.implementation.debugLogger.score.toFixed(0)}%)`,
    );
    console.log(
      `  MCP Debug: ${this.results.implementation.mcpDebugLogger.passed ? '✅' : '❌'} (${this.results.implementation.mcpDebugLogger.score.toFixed(0)}%)`,
    );
    console.log(
      `  CLI Instrumentation: ${this.results.implementation.cliInstrumentation.passed ? '✅' : '❌'} (${this.results.implementation.cliInstrumentation.score.toFixed(0)}%)`,
    );
    console.log(
      `  Rollback Testing: ${this.results.systemValidation.rollbackTesting.passed ? '✅' : '❌'} (${this.results.systemValidation.rollbackTesting.score.toFixed(0)}%)`,
    );

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    if (this.results.riskAssessment.riskFactors.length > 0) {
      console.log('\n⚠️  Risk Factors:');
      this.results.riskAssessment.riskFactors.forEach((factor, index) => {
        console.log(`  ${index + 1}. [${factor.severity.toUpperCase()}] ${factor.description}`);
      });
    }
  }
}

// Default configuration
const DEFAULT_CONFIG: EnhancedValidationConfig = {
  includeCLIInstrumentation: true,
  includeConsoleMigrationValidation: true,
  includeRollbackTesting: true,
  includePerformanceRegression: true,
  includeLondonSchoolValidation: true,
  performanceThresholds: {
    maxOverheadPercent: 10,
    maxMemoryGrowthMB: 50,
    maxExecutionTimeMs: 30000,
    minThroughputOps: 10000,
  },
  rollbackConfig: {
    createCheckpoint: true,
    validateRollback: true,
    cleanupAfterTest: true,
  },
};

// Main execution
async function main(): Promise<void> {
  try {
    console.log('🚀 Enhanced Debug Implementation Validation');
    console.log('============================================\n');

    // Parse command line arguments for configuration overrides
    const config = { ...DEFAULT_CONFIG };

    // Allow configuration via environment variables
    if (process.env.SKIP_CLI_TESTS === 'true') {
      config.includeCLIInstrumentation = false;
    }
    if (process.env.SKIP_ROLLBACK_TESTS === 'true') {
      config.includeRollbackTesting = false;
    }
    if (process.env.PERFORMANCE_THRESHOLD) {
      config.performanceThresholds.maxOverheadPercent = parseFloat(
        process.env.PERFORMANCE_THRESHOLD,
      );
    }

    const validator = new EnhancedDebugValidator(config);
    const results = await validator.runEnhancedValidation();

    // Exit with appropriate code
    process.exit(results.overall.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Enhanced validation execution failed:', error);
    process.exit(1);
  }
}

// CLI interface - PKG-compatible main module detection
const __filename = process.argv[1] || require.main?.filename || '';
const isMainModule = process.argv[1] && process.argv[1].endsWith('/enhanced-debug-validation.ts');
if (isMainModule) {
  main();
}

export { EnhancedDebugValidator, type EnhancedValidationConfig, type EnhancedValidationResults };
