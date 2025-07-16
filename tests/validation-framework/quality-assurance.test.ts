/**
 * Quality Assurance Framework for Validation Testing
 * Comprehensive QA methodology, coverage analysis, and quality gates
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Quality metrics interfaces
interface QualityMetrics {
  testCoverage: CoverageMetrics;
  codeQuality: CodeQualityMetrics;
  defectMetrics: DefectMetrics;
  performanceMetrics: PerformanceQualityMetrics;
  reliabilityMetrics: ReliabilityMetrics;
}

interface CoverageMetrics {
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  statementCoverage: number;
  pathCoverage: number;
  mutationScore: number;
}

interface CodeQualityMetrics {
  complexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: number;
  duplicateCodePercentage: number;
  documentationCoverage: number;
}

interface DefectMetrics {
  totalDefects: number;
  criticalDefects: number;
  highPriorityDefects: number;
  defectDensity: number;
  defectEscapeRate: number;
  meanTimeToResolution: number;
}

interface PerformanceQualityMetrics {
  responseTime: number;
  throughput: number;
  resourceUtilization: number;
  scalabilityFactor: number;
  reliabilityUptime: number;
}

interface ReliabilityMetrics {
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
  availability: number;
  errorRate: number;
  failoverTime: number;
}

// Quality gates definition
interface QualityGate {
  name: string;
  conditions: QualityCondition[];
  blocking: boolean;
}

interface QualityCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'blocker';
}

// Quality assurance manager
class QualityAssuranceManager {
  private qualityGates: QualityGate[] = [];
  private qualityMetrics: QualityMetrics;
  private testResults: Array<{
    testName: string;
    passed: boolean;
    coverage: CoverageMetrics;
    quality: CodeQualityMetrics;
    performance: PerformanceQualityMetrics;
  }> = [];

  constructor() {
    this.qualityMetrics = this.initializeMetrics();
    this.setupDefaultQualityGates();
  }

  private initializeMetrics(): QualityMetrics {
    return {
      testCoverage: {
        lineCoverage: 0,
        branchCoverage: 0,
        functionCoverage: 0,
        statementCoverage: 0,
        pathCoverage: 0,
        mutationScore: 0
      },
      codeQuality: {
        complexity: 0,
        maintainabilityIndex: 0,
        technicalDebt: 0,
        codeSmells: 0,
        duplicateCodePercentage: 0,
        documentationCoverage: 0
      },
      defectMetrics: {
        totalDefects: 0,
        criticalDefects: 0,
        highPriorityDefects: 0,
        defectDensity: 0,
        defectEscapeRate: 0,
        meanTimeToResolution: 0
      },
      performanceMetrics: {
        responseTime: 0,
        throughput: 0,
        resourceUtilization: 0,
        scalabilityFactor: 0,
        reliabilityUptime: 0
      },
      reliabilityMetrics: {
        mtbf: 0,
        mttr: 0,
        availability: 0,
        errorRate: 0,
        failoverTime: 0
      }
    };
  }

  private setupDefaultQualityGates(): void {
    // Unit test quality gate
    this.addQualityGate({
      name: 'Unit Test Quality Gate',
      blocking: true,
      conditions: [
        { metric: 'lineCoverage', operator: 'gte', threshold: 95, severity: 'error' },
        { metric: 'branchCoverage', operator: 'gte', threshold: 90, severity: 'error' },
        { metric: 'functionCoverage', operator: 'gte', threshold: 100, severity: 'error' },
        { metric: 'mutationScore', operator: 'gte', threshold: 80, severity: 'warning' }
      ]
    });

    // Integration test quality gate
    this.addQualityGate({
      name: 'Integration Test Quality Gate',
      blocking: true,
      conditions: [
        { metric: 'lineCoverage', operator: 'gte', threshold: 85, severity: 'error' },
        { metric: 'pathCoverage', operator: 'gte', threshold: 75, severity: 'warning' },
        { metric: 'errorRate', operator: 'lte', threshold: 0.01, severity: 'error' }
      ]
    });

    // Performance quality gate
    this.addQualityGate({
      name: 'Performance Quality Gate',
      blocking: false,
      conditions: [
        { metric: 'responseTime', operator: 'lte', threshold: 100, severity: 'warning' },
        { metric: 'throughput', operator: 'gte', threshold: 1000, severity: 'info' },
        { metric: 'resourceUtilization', operator: 'lte', threshold: 80, severity: 'warning' }
      ]
    });

    // Code quality gate
    this.addQualityGate({
      name: 'Code Quality Gate',
      blocking: false,
      conditions: [
        { metric: 'complexity', operator: 'lte', threshold: 10, severity: 'warning' },
        { metric: 'maintainabilityIndex', operator: 'gte', threshold: 70, severity: 'warning' },
        { metric: 'duplicateCodePercentage', operator: 'lte', threshold: 5, severity: 'error' },
        { metric: 'technicalDebt', operator: 'lte', threshold: 5, severity: 'warning' }
      ]
    });
  }

  addQualityGate(gate: QualityGate): void {
    this.qualityGates.push(gate);
  }

  updateMetrics(metrics: Partial<QualityMetrics>): void {
    this.qualityMetrics = { ...this.qualityMetrics, ...metrics };
  }

  evaluateQualityGates(): {
    passed: boolean;
    results: Array<{
      gateName: string;
      passed: boolean;
      blocking: boolean;
      failedConditions: Array<{
        condition: QualityCondition;
        actualValue: number;
        message: string;
      }>;
    }>;
  } {
    const results = this.qualityGates.map(gate => {
      const failedConditions: Array<{
        condition: QualityCondition;
        actualValue: number;
        message: string;
      }> = [];

      for (const condition of gate.conditions) {
        const actualValue = this.getMetricValue(condition.metric);
        const passed = this.evaluateCondition(actualValue, condition);

        if (!passed) {
          failedConditions.push({
            condition,
            actualValue,
            message: `${condition.metric} ${condition.operator} ${condition.threshold} (actual: ${actualValue})`
          });
        }
      }

      return {
        gateName: gate.name,
        passed: failedConditions.length === 0,
        blocking: gate.blocking,
        failedConditions
      };
    });

    const blockingFailures = results.filter(r => r.blocking && !r.passed);
    const passed = blockingFailures.length === 0;

    return { passed, results };
  }

  private getMetricValue(metricName: string): number {
    const parts = metricName.split('.');
    let value: any = this.qualityMetrics;

    for (const part of parts) {
      value = value[part];
      if (value === undefined) {
        return 0;
      }
    }

    return typeof value === 'number' ? value : 0;
  }

  private evaluateCondition(value: number, condition: QualityCondition): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'ne': return value !== condition.threshold;
      default: return false;
    }
  }

  generateQualityReport(): {
    summary: {
      overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
      qualityScore: number;
      gatesPassed: number;
      totalGates: number;
      blockingIssues: number;
    };
    detailedMetrics: QualityMetrics;
    recommendations: string[];
    trends: Array<{
      metric: string;
      trend: 'improving' | 'stable' | 'declining';
      change: number;
    }>;
  } {
    const gateResults = this.evaluateQualityGates();
    const qualityScore = this.calculateQualityScore();
    const overallQuality = this.getQualityLevel(qualityScore);
    const recommendations = this.generateRecommendations();
    const trends = this.analyzeTrends();

    return {
      summary: {
        overallQuality,
        qualityScore,
        gatesPassed: gateResults.results.filter(r => r.passed).length,
        totalGates: gateResults.results.length,
        blockingIssues: gateResults.results.filter(r => r.blocking && !r.passed).length
      },
      detailedMetrics: this.qualityMetrics,
      recommendations,
      trends
    };
  }

  private calculateQualityScore(): number {
    const weights = {
      testCoverage: 0.25,
      codeQuality: 0.20,
      defectMetrics: 0.20,
      performanceMetrics: 0.20,
      reliabilityMetrics: 0.15
    };

    const coverageScore = (
      this.qualityMetrics.testCoverage.lineCoverage +
      this.qualityMetrics.testCoverage.branchCoverage +
      this.qualityMetrics.testCoverage.functionCoverage
    ) / 3;

    const qualityScore = Math.max(0, 100 - (
      this.qualityMetrics.codeQuality.complexity +
      this.qualityMetrics.codeQuality.technicalDebt +
      this.qualityMetrics.codeQuality.duplicateCodePercentage
    ));

    const defectScore = Math.max(0, 100 - (
      this.qualityMetrics.defectMetrics.defectDensity * 10 +
      this.qualityMetrics.defectMetrics.defectEscapeRate * 100
    ));

    const performanceScore = Math.min(100, (
      this.qualityMetrics.performanceMetrics.throughput / 10 +
      Math.max(0, 100 - this.qualityMetrics.performanceMetrics.responseTime)
    ));

    const reliabilityScore = (
      this.qualityMetrics.reliabilityMetrics.availability +
      Math.max(0, 100 - this.qualityMetrics.reliabilityMetrics.errorRate * 100)
    ) / 2;

    return (
      coverageScore * weights.testCoverage +
      qualityScore * weights.codeQuality +
      defectScore * weights.defectMetrics +
      performanceScore * weights.performanceMetrics +
      reliabilityScore * weights.reliabilityMetrics
    );
  }

  private getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (this.qualityMetrics.testCoverage.lineCoverage < 95) {
      recommendations.push('Increase line coverage to at least 95%');
    }
    if (this.qualityMetrics.testCoverage.branchCoverage < 90) {
      recommendations.push('Improve branch coverage to at least 90%');
    }
    if (this.qualityMetrics.testCoverage.mutationScore < 80) {
      recommendations.push('Strengthen tests to achieve mutation score above 80%');
    }

    // Code quality recommendations
    if (this.qualityMetrics.codeQuality.complexity > 10) {
      recommendations.push('Reduce code complexity through refactoring');
    }
    if (this.qualityMetrics.codeQuality.duplicateCodePercentage > 5) {
      recommendations.push('Eliminate duplicate code to improve maintainability');
    }
    if (this.qualityMetrics.codeQuality.technicalDebt > 5) {
      recommendations.push('Address technical debt accumulation');
    }

    // Performance recommendations
    if (this.qualityMetrics.performanceMetrics.responseTime > 100) {
      recommendations.push('Optimize response times to under 100ms');
    }
    if (this.qualityMetrics.performanceMetrics.throughput < 1000) {
      recommendations.push('Improve system throughput capacity');
    }

    // Defect recommendations
    if (this.qualityMetrics.defectMetrics.defectEscapeRate > 0.05) {
      recommendations.push('Strengthen testing to reduce defect escape rate');
    }
    if (this.qualityMetrics.defectMetrics.criticalDefects > 0) {
      recommendations.push('Address all critical defects immediately');
    }

    return recommendations;
  }

  private analyzeTrends(): Array<{
    metric: string;
    trend: 'improving' | 'stable' | 'declining';
    change: number;
  }> {
    // Mock trend analysis - in real implementation would compare with historical data
    const mockTrends = [
      { metric: 'testCoverage.lineCoverage', trend: 'improving' as const, change: 2.5 },
      { metric: 'codeQuality.complexity', trend: 'stable' as const, change: 0.1 },
      { metric: 'defectMetrics.defectDensity', trend: 'improving' as const, change: -0.3 },
      { metric: 'performanceMetrics.responseTime', trend: 'declining' as const, change: 5.2 }
    ];

    return mockTrends;
  }
}

// Test data quality analyzer
class TestDataQualityAnalyzer {
  analyzeTestDataQuality(testData: any[]): {
    completeness: number;
    accuracy: number;
    consistency: number;
    validity: number;
    coverage: number;
    recommendations: string[];
  } {
    const completeness = this.analyzeCompleteness(testData);
    const accuracy = this.analyzeAccuracy(testData);
    const consistency = this.analyzeConsistency(testData);
    const validity = this.analyzeValidity(testData);
    const coverage = this.analyzeCoverage(testData);
    const recommendations = this.generateDataRecommendations(
      completeness, accuracy, consistency, validity, coverage
    );

    return {
      completeness,
      accuracy,
      consistency,
      validity,
      coverage,
      recommendations
    };
  }

  private analyzeCompleteness(testData: any[]): number {
    if (testData.length === 0) return 0;

    let completeRecords = 0;
    for (const record of testData) {
      const requiredFields = ['id', 'input', 'expectedOutput', 'category'];
      const hasAllFields = requiredFields.every(field => 
        record[field] !== undefined && record[field] !== null && record[field] !== ''
      );
      
      if (hasAllFields) {
        completeRecords++;
      }
    }

    return (completeRecords / testData.length) * 100;
  }

  private analyzeAccuracy(testData: any[]): number {
    // Mock accuracy analysis - would validate against known correct values
    let accurateRecords = 0;
    
    for (const record of testData) {
      // Simulate accuracy checks
      const hasValidInput = typeof record.input === 'string' || typeof record.input === 'object';
      const hasValidExpectedOutput = record.expectedOutput !== undefined;
      const hasValidCategory = ['unit', 'integration', 'property', 'performance'].includes(record.category);
      
      if (hasValidInput && hasValidExpectedOutput && hasValidCategory) {
        accurateRecords++;
      }
    }

    return testData.length > 0 ? (accurateRecords / testData.length) * 100 : 0;
  }

  private analyzeConsistency(testData: any[]): number {
    // Check for consistent data formats and structures
    if (testData.length === 0) return 100;

    const firstRecord = testData[0];
    const expectedKeys = Object.keys(firstRecord);
    let consistentRecords = 0;

    for (const record of testData) {
      const recordKeys = Object.keys(record);
      const hasConsistentStructure = expectedKeys.every(key => recordKeys.includes(key)) &&
                                   recordKeys.every(key => expectedKeys.includes(key));
      
      if (hasConsistentStructure) {
        consistentRecords++;
      }
    }

    return (consistentRecords / testData.length) * 100;
  }

  private analyzeValidity(testData: any[]): number {
    // Check for valid data types and ranges
    let validRecords = 0;

    for (const record of testData) {
      const isValidId = typeof record.id === 'string' && record.id.length > 0;
      const isValidPriority = ['low', 'medium', 'high', 'critical'].includes(record.priority);
      const isValidInput = record.input !== null && record.input !== undefined;
      
      if (isValidId && isValidPriority && isValidInput) {
        validRecords++;
      }
    }

    return testData.length > 0 ? (validRecords / testData.length) * 100 : 0;
  }

  private analyzeCoverage(testData: any[]): number {
    // Analyze test scenario coverage
    const categories = new Set(testData.map(record => record.category));
    const priorities = new Set(testData.map(record => record.priority));
    const inputTypes = new Set(testData.map(record => typeof record.input));

    const expectedCategories = 4; // unit, integration, property, performance
    const expectedPriorities = 4; // low, medium, high, critical
    const expectedInputTypes = 2; // string, object

    const categoryCoverage = (categories.size / expectedCategories) * 100;
    const priorityCoverage = (priorities.size / expectedPriorities) * 100;
    const inputTypeCoverage = (inputTypes.size / expectedInputTypes) * 100;

    return (categoryCoverage + priorityCoverage + inputTypeCoverage) / 3;
  }

  private generateDataRecommendations(
    completeness: number,
    accuracy: number, 
    consistency: number,
    validity: number,
    coverage: number
  ): string[] {
    const recommendations: string[] = [];

    if (completeness < 95) {
      recommendations.push('Ensure all test records have complete required fields');
    }
    if (accuracy < 90) {
      recommendations.push('Validate test data accuracy against known correct values');
    }
    if (consistency < 95) {
      recommendations.push('Standardize test data structure and format');
    }
    if (validity < 90) {
      recommendations.push('Validate data types and value ranges in test records');
    }
    if (coverage < 80) {
      recommendations.push('Increase test scenario coverage across all categories');
    }

    return recommendations;
  }
}

describe('Quality Assurance Framework Tests', () => {
  let qaManager: QualityAssuranceManager;
  let dataQualityAnalyzer: TestDataQualityAnalyzer;

  beforeEach(() => {
    qaManager = new QualityAssuranceManager();
    dataQualityAnalyzer = new TestDataQualityAnalyzer();
  });

  describe('Quality Gates', () => {
    it('should pass all quality gates with excellent metrics', async () => {
      // Set high-quality metrics
      qaManager.updateMetrics({
        testCoverage: {
          lineCoverage: 98,
          branchCoverage: 95,
          functionCoverage: 100,
          statementCoverage: 97,
          pathCoverage: 85,
          mutationScore: 85
        },
        codeQuality: {
          complexity: 5,
          maintainabilityIndex: 85,
          technicalDebt: 2,
          codeSmells: 3,
          duplicateCodePercentage: 1,
          documentationCoverage: 90
        },
        defectMetrics: {
          totalDefects: 2,
          criticalDefects: 0,
          highPriorityDefects: 1,
          defectDensity: 0.1,
          defectEscapeRate: 0.005,
          meanTimeToResolution: 24
        },
        performanceMetrics: {
          responseTime: 45,
          throughput: 1500,
          resourceUtilization: 65,
          scalabilityFactor: 1.8,
          reliabilityUptime: 99.9
        },
        reliabilityMetrics: {
          mtbf: 720,
          mttr: 15,
          availability: 99.95,
          errorRate: 0.002,
          failoverTime: 5
        }
      });

      const gateResults = qaManager.evaluateQualityGates();

      expect(gateResults.passed).toBe(true);
      expect(gateResults.results.every(r => r.passed)).toBe(true);

      console.log('Quality Gates Results:');
      gateResults.results.forEach(result => {
        console.log(`  ${result.gateName}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      });
    });

    it('should fail quality gates with poor metrics', async () => {
      // Set poor-quality metrics
      qaManager.updateMetrics({
        testCoverage: {
          lineCoverage: 70,  // Below 95% threshold
          branchCoverage: 60, // Below 90% threshold
          functionCoverage: 80, // Below 100% threshold
          statementCoverage: 65,
          pathCoverage: 50,
          mutationScore: 40  // Below 80% threshold
        },
        codeQuality: {
          complexity: 15,    // Above 10 threshold
          maintainabilityIndex: 50, // Below 70 threshold
          technicalDebt: 10,  // Above 5 threshold
          codeSmells: 25,
          duplicateCodePercentage: 12, // Above 5% threshold
          documentationCoverage: 30
        },
        defectMetrics: {
          totalDefects: 50,
          criticalDefects: 5,
          highPriorityDefects: 15,
          defectDensity: 2.5,
          defectEscapeRate: 0.08, // Above 0.01 threshold
          meanTimeToResolution: 120
        }
      });

      const gateResults = qaManager.evaluateQualityGates();

      expect(gateResults.passed).toBe(false);
      
      const blockingFailures = gateResults.results.filter(r => r.blocking && !r.passed);
      expect(blockingFailures.length).toBeGreaterThan(0);

      console.log('Failed Quality Gates:');
      gateResults.results.filter(r => !r.passed).forEach(result => {
        console.log(`  ${result.gateName}: FAILED (blocking: ${result.blocking})`);
        result.failedConditions.forEach(condition => {
          console.log(`    - ${condition.message}`);
        });
      });
    });

    it('should generate comprehensive quality report', async () => {
      // Set mixed quality metrics
      qaManager.updateMetrics({
        testCoverage: {
          lineCoverage: 88,
          branchCoverage: 85,
          functionCoverage: 95,
          statementCoverage: 90,
          pathCoverage: 75,
          mutationScore: 75
        },
        codeQuality: {
          complexity: 8,
          maintainabilityIndex: 72,
          technicalDebt: 4,
          codeSmells: 12,
          duplicateCodePercentage: 3,
          documentationCoverage: 78
        },
        defectMetrics: {
          totalDefects: 8,
          criticalDefects: 1,
          highPriorityDefects: 3,
          defectDensity: 0.4,
          defectEscapeRate: 0.02,
          meanTimeToResolution: 48
        },
        performanceMetrics: {
          responseTime: 120,
          throughput: 800,
          resourceUtilization: 75,
          scalabilityFactor: 2.2,
          reliabilityUptime: 99.5
        },
        reliabilityMetrics: {
          mtbf: 480,
          mttr: 30,
          availability: 99.8,
          errorRate: 0.008,
          failoverTime: 12
        }
      });

      const report = qaManager.generateQualityReport();

      expect(report.summary.overallQuality).toBeDefined();
      expect(report.summary.qualityScore).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.trends.length).toBeGreaterThan(0);

      console.log('\nQuality Report Summary:');
      console.log(`  Overall Quality: ${report.summary.overallQuality}`);
      console.log(`  Quality Score: ${report.summary.qualityScore.toFixed(1)}`);
      console.log(`  Gates Passed: ${report.summary.gatesPassed}/${report.summary.totalGates}`);
      console.log(`  Blocking Issues: ${report.summary.blockingIssues}`);

      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });

      console.log('\nTrends:');
      report.trends.forEach(trend => {
        console.log(`  ${trend.metric}: ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change})`);
      });
    });
  });

  describe('Test Data Quality', () => {
    it('should analyze high-quality test data', async () => {
      const highQualityTestData = [
        {
          id: 'test-001',
          input: 'function test() { return true; }',
          expectedOutput: { isValid: true, confidence: 0.95 },
          category: 'unit',
          priority: 'high',
          tags: ['syntax', 'validation']
        },
        {
          id: 'test-002',
          input: { code: 'const x = 42;', context: 'simple' },
          expectedOutput: { isValid: true, confidence: 0.9 },
          category: 'integration',
          priority: 'medium',
          tags: ['semantic', 'validation']
        },
        {
          id: 'test-003',
          input: 'class Example { method() {} }',
          expectedOutput: { isValid: true, confidence: 0.98 },
          category: 'property',
          priority: 'low',
          tags: ['structural', 'validation']
        },
        {
          id: 'test-004',
          input: 'async function fetch() { return data; }',
          expectedOutput: { isValid: true, confidence: 0.85 },
          category: 'performance',
          priority: 'critical',
          tags: ['async', 'validation']
        }
      ];

      const analysis = dataQualityAnalyzer.analyzeTestDataQuality(highQualityTestData);

      expect(analysis.completeness).toBeGreaterThan(95);
      expect(analysis.accuracy).toBeGreaterThan(90);
      expect(analysis.consistency).toBeGreaterThan(95);
      expect(analysis.validity).toBeGreaterThan(90);
      expect(analysis.coverage).toBeGreaterThan(80);
      expect(analysis.recommendations.length).toBe(0); // No recommendations for high-quality data

      console.log('\nTest Data Quality Analysis:');
      console.log(`  Completeness: ${analysis.completeness.toFixed(1)}%`);
      console.log(`  Accuracy: ${analysis.accuracy.toFixed(1)}%`);
      console.log(`  Consistency: ${analysis.consistency.toFixed(1)}%`);
      console.log(`  Validity: ${analysis.validity.toFixed(1)}%`);
      console.log(`  Coverage: ${analysis.coverage.toFixed(1)}%`);
    });

    it('should identify issues in poor-quality test data', async () => {
      const poorQualityTestData = [
        {
          id: '', // Missing ID
          input: null, // Invalid input
          expectedOutput: undefined, // Missing expected output
          category: 'invalid', // Invalid category
          priority: 'unknown' // Invalid priority
        },
        {
          id: 'test-002',
          input: 'test code',
          expectedOutput: { isValid: true },
          category: 'unit',
          priority: 'medium',
          extraField: 'should not be here' // Inconsistent structure
        },
        {
          // Missing required fields
          category: 'integration'
        }
      ];

      const analysis = dataQualityAnalyzer.analyzeTestDataQuality(poorQualityTestData);

      expect(analysis.completeness).toBeLessThan(70);
      expect(analysis.accuracy).toBeLessThan(70);
      expect(analysis.consistency).toBeLessThan(70);
      expect(analysis.validity).toBeLessThan(70);
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      console.log('\nPoor Quality Test Data Analysis:');
      console.log(`  Completeness: ${analysis.completeness.toFixed(1)}%`);
      console.log(`  Accuracy: ${analysis.accuracy.toFixed(1)}%`);
      console.log(`  Consistency: ${analysis.consistency.toFixed(1)}%`);
      console.log(`  Validity: ${analysis.validity.toFixed(1)}%`);
      console.log(`  Coverage: ${analysis.coverage.toFixed(1)}%`);
      
      console.log('\nRecommendations:');
      analysis.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    });
  });

  describe('Quality Metrics Calculation', () => {
    it('should calculate quality score correctly', async () => {
      // Test with known metrics to verify calculation
      qaManager.updateMetrics({
        testCoverage: {
          lineCoverage: 90,
          branchCoverage: 85,
          functionCoverage: 95,
          statementCoverage: 92,
          pathCoverage: 80,
          mutationScore: 75
        },
        codeQuality: {
          complexity: 6,
          maintainabilityIndex: 75,
          technicalDebt: 3,
          codeSmells: 8,
          duplicateCodePercentage: 2,
          documentationCoverage: 82
        },
        defectMetrics: {
          totalDefects: 5,
          criticalDefects: 0,
          highPriorityDefects: 2,
          defectDensity: 0.2,
          defectEscapeRate: 0.01,
          meanTimeToResolution: 36
        },
        performanceMetrics: {
          responseTime: 75,
          throughput: 1200,
          resourceUtilization: 70,
          scalabilityFactor: 2.0,
          reliabilityUptime: 99.7
        },
        reliabilityMetrics: {
          mtbf: 600,
          mttr: 20,
          availability: 99.85,
          errorRate: 0.005,
          failoverTime: 8
        }
      });

      const report = qaManager.generateQualityReport();

      expect(report.summary.qualityScore).toBeGreaterThan(70);
      expect(report.summary.qualityScore).toBeLessThan(95);
      expect(report.summary.overallQuality).toMatch(/good|fair/);
    });

    it('should provide appropriate recommendations based on metrics', async () => {
      // Set metrics that should trigger specific recommendations
      qaManager.updateMetrics({
        testCoverage: {
          lineCoverage: 80, // Below 95% - should trigger recommendation
          branchCoverage: 75, // Below 90% - should trigger recommendation
          functionCoverage: 90,
          statementCoverage: 85,
          pathCoverage: 70,
          mutationScore: 65 // Below 80% - should trigger recommendation
        },
        codeQuality: {
          complexity: 15, // Above 10 - should trigger recommendation
          maintainabilityIndex: 60,
          technicalDebt: 8, // Above 5 - should trigger recommendation
          codeSmells: 20,
          duplicateCodePercentage: 8, // Above 5% - should trigger recommendation
          documentationCoverage: 50
        },
        performanceMetrics: {
          responseTime: 150, // Above 100ms - should trigger recommendation
          throughput: 500, // Below 1000 - should trigger recommendation
          resourceUtilization: 85,
          scalabilityFactor: 1.5,
          reliabilityUptime: 98.5
        },
        defectMetrics: {
          totalDefects: 20,
          criticalDefects: 3, // > 0 - should trigger recommendation
          highPriorityDefects: 8,
          defectDensity: 1.0,
          defectEscapeRate: 0.08, // Above 0.05 - should trigger recommendation
          meanTimeToResolution: 96
        }
      });

      const report = qaManager.generateQualityReport();

      expect(report.recommendations).toContain('Increase line coverage to at least 95%');
      expect(report.recommendations).toContain('Improve branch coverage to at least 90%');
      expect(report.recommendations).toContain('Strengthen tests to achieve mutation score above 80%');
      expect(report.recommendations).toContain('Reduce code complexity through refactoring');
      expect(report.recommendations).toContain('Eliminate duplicate code to improve maintainability');
      expect(report.recommendations).toContain('Address technical debt accumulation');
      expect(report.recommendations).toContain('Optimize response times to under 100ms');
      expect(report.recommendations).toContain('Improve system throughput capacity');
      expect(report.recommendations).toContain('Address all critical defects immediately');
      expect(report.recommendations).toContain('Strengthen testing to reduce defect escape rate');

      console.log(`Generated ${report.recommendations.length} recommendations`);
    });
  });

  describe('Quality Trend Analysis', () => {
    it('should track quality improvements over time', async () => {
      // This would typically compare with historical data
      // For testing, we'll simulate trend analysis
      
      const report = qaManager.generateQualityReport();
      const trends = report.trends;

      expect(trends.length).toBeGreaterThan(0);
      
      trends.forEach(trend => {
        expect(['improving', 'stable', 'declining']).toContain(trend.trend);
        expect(typeof trend.change).toBe('number');
        expect(trend.metric).toBeDefined();
      });

      const improvingTrends = trends.filter(t => t.trend === 'improving');
      const decliningTrends = trends.filter(t => t.trend === 'declining');

      console.log(`\nTrend Analysis:`);
      console.log(`  Improving metrics: ${improvingTrends.length}`);
      console.log(`  Declining metrics: ${decliningTrends.length}`);
      console.log(`  Stable metrics: ${trends.length - improvingTrends.length - decliningTrends.length}`);
    });
  });
});