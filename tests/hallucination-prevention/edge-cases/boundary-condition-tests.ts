/**
 * Advanced boundary condition tests for hallucination detection
 * Tests the verification engine at the edges of valid/invalid classification
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VerificationEngine } from '../../../src/verification/verification-engine';

interface BoundaryTestCase {
  id: string;
  code: string;
  description: string;
  expectedClassification: 'valid' | 'invalid' | 'ambiguous';
  expectedConfidence: { min: number; max: number };
  contextRequired: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  categories: string[];
}

const boundaryTestCases: BoundaryTestCase[] = [
  // Semantic Ambiguity Cases
  {
    id: 'semantic-001',
    code: 'optimize()',
    description: 'Generic optimization function - could be legitimate or hallucinated',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.3, max: 0.7 },
    contextRequired: true,
    difficulty: 'medium',
    categories: ['semantic_ambiguity', 'function_call']
  },
  {
    id: 'semantic-002', 
    code: 'smartProcessor.process(data)',
    description: 'AI-suggestive but potentially legitimate processing',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.4, max: 0.8 },
    contextRequired: true,
    difficulty: 'hard',
    categories: ['semantic_ambiguity', 'ai_terminology', 'method_call']
  },
  {
    id: 'semantic-003',
    code: 'intelligentAnalyzer.analyze()',
    description: 'Intelligence claim that could be marketing or genuine capability',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.2, max: 0.8 },
    contextRequired: true,
    difficulty: 'hard',
    categories: ['semantic_ambiguity', 'intelligence_claims']
  },

  // Context-Dependent Cases
  {
    id: 'context-001',
    code: 'aiAgent.learn(trainingData)',
    description: 'Machine learning context makes this potentially valid',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.5, max: 0.9 },
    contextRequired: true,
    difficulty: 'medium',
    categories: ['context_dependent', 'machine_learning']
  },
  {
    id: 'context-002',
    code: 'neuralNetwork.predict(input)',
    description: 'Valid in ML context, suspicious in general context',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.6, max: 0.9 },
    contextRequired: true,
    difficulty: 'easy',
    categories: ['context_dependent', 'neural_networks']
  },
  {
    id: 'context-003',
    code: 'quantumProcessor.compute()',
    description: 'Valid in quantum computing context, suspicious elsewhere',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.1, max: 0.9 },
    contextRequired: true,
    difficulty: 'expert',
    categories: ['context_dependent', 'quantum_computing']
  },

  // Performance Claims Boundary
  {
    id: 'performance-001',
    code: 'optimizer.improve() // 20% faster',
    description: 'Realistic performance improvement claim',
    expectedClassification: 'valid',
    expectedConfidence: { min: 0.7, max: 0.9 },
    contextRequired: false,
    difficulty: 'easy',
    categories: ['performance_claims', 'realistic']
  },
  {
    id: 'performance-002',
    code: 'superOptimizer.optimize() // 500% improvement',
    description: 'Suspicious but potentially possible performance claim',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.3, max: 0.7 },
    contextRequired: true,
    difficulty: 'medium',
    categories: ['performance_claims', 'suspicious']
  },
  {
    id: 'performance-003',
    code: 'hyperOptimizer.optimize() // 10000% faster',
    description: 'Clearly impossible performance claim',
    expectedClassification: 'invalid',
    expectedConfidence: { min: 0.8, max: 0.99 },
    contextRequired: false,
    difficulty: 'easy',
    categories: ['performance_claims', 'impossible']
  },

  // AI Capability Boundaries
  {
    id: 'ai-capability-001',
    code: 'assistant.suggestImprovements(code)',
    description: 'Reasonable AI assistance capability',
    expectedClassification: 'valid',
    expectedConfidence: { min: 0.8, max: 0.95 },
    contextRequired: false,
    difficulty: 'easy',
    categories: ['ai_capabilities', 'reasonable']
  },
  {
    id: 'ai-capability-002',
    code: 'aiSystem.generateOptimalSolution()',
    description: 'Borderline AI capability claim - depends on domain',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.4, max: 0.8 },
    contextRequired: true,
    difficulty: 'medium',
    categories: ['ai_capabilities', 'borderline']
  },
  {
    id: 'ai-capability-003',
    code: 'perfectAI.solveAnything()',
    description: 'Clearly impossible AI capability',
    expectedClassification: 'invalid',
    expectedConfidence: { min: 0.9, max: 0.99 },
    contextRequired: false,
    difficulty: 'easy',
    categories: ['ai_capabilities', 'impossible']
  },

  // Method Chaining Complexity
  {
    id: 'chaining-001',
    code: 'data.process().optimize().validate()',
    description: 'Complex method chaining with reasonable operations',
    expectedClassification: 'valid',
    expectedConfidence: { min: 0.7, max: 0.9 },
    contextRequired: false,
    difficulty: 'medium',
    categories: ['method_chaining', 'reasonable']
  },
  {
    id: 'chaining-002',
    code: 'input.analyze().understand().solve().perfect()',
    description: 'Method chain progressing to impossible claims',
    expectedClassification: 'invalid',
    expectedConfidence: { min: 0.6, max: 0.9 },
    contextRequired: false,
    difficulty: 'medium',
    categories: ['method_chaining', 'escalating_claims']
  },

  // Dynamic/Runtime Ambiguity
  {
    id: 'dynamic-001',
    code: 'object[methodName]()',
    description: 'Dynamic method call - cannot verify statically',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.4, max: 0.6 },
    contextRequired: true,
    difficulty: 'hard',
    categories: ['dynamic_calls', 'runtime_ambiguity']
  },
  {
    id: 'dynamic-002',
    code: 'eval("smartFunction()")',
    description: 'Eval with potentially hallucinated content',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.1, max: 0.5 },
    contextRequired: true,
    difficulty: 'expert',
    categories: ['dynamic_calls', 'eval', 'security_risk']
  },

  // Version/API Evolution Cases
  {
    id: 'evolution-001',
    code: 'newFramework.experimentalFeature()',
    description: 'Potentially new or experimental API',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.3, max: 0.8 },
    contextRequired: true,
    difficulty: 'hard',
    categories: ['api_evolution', 'experimental']
  },
  {
    id: 'evolution-002',
    code: 'legacy.deprecatedMethod()',
    description: 'Potentially deprecated but historically valid',
    expectedClassification: 'ambiguous',
    expectedConfidence: { min: 0.4, max: 0.8 },
    contextRequired: true,
    difficulty: 'medium',
    categories: ['api_evolution', 'deprecated']
  }
];

describe('Boundary Condition Tests for Hallucination Detection', () => {
  let verificationEngine: VerificationEngine;
  let testResults: Map<string, any> = new Map();

  beforeEach(() => {
    verificationEngine = new VerificationEngine();
    testResults.clear();
  });

  afterEach(() => {
    // Analyze and report boundary test results
    const analysis = analyzeBoundaryResults(testResults);
    console.log('🎯 Boundary Test Analysis:', analysis);
  });

  describe('Semantic Ambiguity Handling', () => {
    it('should handle semantic ambiguity with appropriate confidence levels', async () => {
      const semanticCases = boundaryTestCases.filter(tc => 
        tc.categories.includes('semantic_ambiguity')
      );

      for (const testCase of semanticCases) {
        const result = await verificationEngine.verify(testCase.code);
        testResults.set(testCase.id, { testCase, result });

        // Verify confidence is in expected range
        expect(result.confidence).toBeGreaterThanOrEqual(testCase.expectedConfidence.min);
        expect(result.confidence).toBeLessThanOrEqual(testCase.expectedConfidence.max);

        // Verify manual review is triggered for ambiguous cases
        if (testCase.expectedClassification === 'ambiguous') {
          expect(result.requiresManualReview).toBe(true);
        }

        // Verify context requirement detection
        if (testCase.contextRequired) {
          expect(result.reason).toMatch(/context|ambiguous|requires.*review/i);
        }
      }
    });

    it('should differentiate between similar but distinct semantic patterns', async () => {
      const patterns = [
        'optimize()', // Generic optimization
        'smartOptimize()', // AI-suggestive optimization
        'perfectOptimize()', // Impossible optimization
        'basicOptimize()' // Clearly legitimate optimization
      ];

      const results = await Promise.all(
        patterns.map(async pattern => ({
          pattern,
          result: await verificationEngine.verify(pattern)
        }))
      );

      // Should show confidence progression from ambiguous to clear
      const confidences = results.map(r => r.result.confidence);
      
      // perfectOptimize should have lowest confidence (most suspicious)
      const perfectOptimizeResult = results.find(r => r.pattern === 'perfectOptimize()');
      expect(perfectOptimizeResult?.result.isHallucination).toBe(true);

      // basicOptimize should have highest confidence (least suspicious)
      const basicOptimizeResult = results.find(r => r.pattern === 'basicOptimize()');
      expect(basicOptimizeResult?.result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Context-Dependent Classification', () => {
    it('should require context for context-dependent cases', async () => {
      const contextCases = boundaryTestCases.filter(tc => 
        tc.categories.includes('context_dependent')
      );

      for (const testCase of contextCases) {
        const result = await verificationEngine.verify(testCase.code);
        testResults.set(testCase.id, { testCase, result });

        // Context-dependent cases should require manual review
        expect(result.requiresManualReview).toBe(true);
        
        // Should have moderate confidence - not fully certain either way
        expect(result.confidence).toBeLessThan(0.9);
        expect(result.confidence).toBeGreaterThan(0.1);
      }
    });

    it('should handle machine learning context appropriately', async () => {
      const mlContextCode = 'neuralNetwork.train(dataset)';
      const result = await verificationEngine.verify(mlContextCode);

      // Should be classified as potentially valid in ML context
      expect(result.isHallucination).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Performance Claims Boundary Testing', () => {
    it('should classify performance claims by believability', async () => {
      const performanceCases = boundaryTestCases.filter(tc => 
        tc.categories.includes('performance_claims')
      );

      for (const testCase of performanceCases) {
        const result = await verificationEngine.verify(testCase.code);
        testResults.set(testCase.id, { testCase, result });

        if (testCase.categories.includes('realistic')) {
          expect(result.isHallucination).toBe(false);
          expect(result.confidence).toBeGreaterThan(0.7);
        } else if (testCase.categories.includes('impossible')) {
          expect(result.isHallucination).toBe(true);
          expect(result.confidence).toBeGreaterThan(0.8);
        } else if (testCase.categories.includes('suspicious')) {
          expect(result.requiresManualReview).toBe(true);
        }
      }
    });
  });

  describe('AI Capability Boundary Testing', () => {
    it('should distinguish between reasonable and impossible AI claims', async () => {
      const aiCases = boundaryTestCases.filter(tc => 
        tc.categories.includes('ai_capabilities')
      );

      for (const testCase of aiCases) {
        const result = await verificationEngine.verify(testCase.code);
        testResults.set(testCase.id, { testCase, result });

        if (testCase.categories.includes('reasonable')) {
          expect(result.isHallucination).toBe(false);
        } else if (testCase.categories.includes('impossible')) {
          expect(result.isHallucination).toBe(true);
          expect(result.confidence).toBeGreaterThan(0.8);
        } else if (testCase.categories.includes('borderline')) {
          expect(result.requiresManualReview).toBe(true);
          expect(result.confidence).toBeLessThan(0.9);
        }
      }
    });
  });

  describe('Dynamic Call Handling', () => {
    it('should appropriately handle dynamic method calls', async () => {
      const dynamicCases = boundaryTestCases.filter(tc => 
        tc.categories.includes('dynamic_calls')
      );

      for (const testCase of dynamicCases) {
        const result = await verificationEngine.verify(testCase.code);
        testResults.set(testCase.id, { testCase, result });

        // Dynamic calls should always require manual review
        expect(result.requiresManualReview).toBe(true);
        
        // Should have low to moderate confidence
        expect(result.confidence).toBeLessThan(0.7);
        
        // Should indicate why verification is limited
        expect(result.reason).toMatch(/dynamic|runtime|cannot.*verify/i);
      }
    });
  });

  describe('Confidence Calibration', () => {
    it('should have well-calibrated confidence scores', async () => {
      // Test confidence calibration across difficulty levels
      const easyCase = boundaryTestCases.find(tc => tc.difficulty === 'easy');
      const expertCase = boundaryTestCases.find(tc => tc.difficulty === 'expert');

      if (easyCase && expertCase) {
        const easyResult = await verificationEngine.verify(easyCase.code);
        const expertResult = await verificationEngine.verify(expertCase.code);

        // Easy cases should have higher confidence in their classification
        if (easyCase.expectedClassification !== 'ambiguous') {
          expect(easyResult.confidence).toBeGreaterThan(0.8);
        }

        // Expert cases should have lower confidence due to complexity
        if (expertCase.expectedClassification === 'ambiguous') {
          expect(expertResult.confidence).toBeLessThan(0.8);
        }
      }
    });

    it('should provide consistent confidence for similar patterns', async () => {
      const similarPatterns = [
        'advancedProcessor.process()',
        'intelligentProcessor.process()',
        'smartProcessor.process()'
      ];

      const results = await Promise.all(
        similarPatterns.map(async pattern => ({
          pattern,
          result: await verificationEngine.verify(pattern)
        }))
      );

      // Similar patterns should have similar confidence levels
      const confidences = results.map(r => r.result.confidence);
      const maxConfidence = Math.max(...confidences);
      const minConfidence = Math.min(...confidences);
      
      // Confidence should not vary by more than 0.3 for similar patterns
      expect(maxConfidence - minConfidence).toBeLessThan(0.3);
    });
  });

  describe('Edge Case Combinations', () => {
    it('should handle complex combinations of boundary conditions', async () => {
      const complexCombinations = [
        'smartAI.optimize().analyze().perfect()', // Escalating impossibility
        'neuralNetwork.train().evaluate().deploy()', // Reasonable ML pipeline
        'quantumProcessor.superposition().entangle().solve()', // Sci-fi but potentially valid
        'magicSystem.cast().enchant().miracle()' // Clearly fantasy
      ];

      for (const combination of complexCombinations) {
        const result = await verificationEngine.verify(combination);
        
        // Complex combinations should be handled gracefully
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);

        // Should provide meaningful reason
        expect(result.reason).toBeTruthy();
        expect(result.reason.length).toBeGreaterThan(10);
      }
    });
  });
});

/**
 * Analyze boundary test results for patterns and insights
 */
function analyzeBoundaryResults(results: Map<string, any>) {
  const analysis = {
    totalTests: results.size,
    difficultyBreakdown: {} as Record<string, number>,
    confidenceDistribution: [] as number[],
    manualReviewRate: 0,
    categoryAccuracy: {} as Record<string, number>
  };

  let manualReviewCount = 0;

  for (const [id, { testCase, result }] of results) {
    // Track difficulty distribution
    analysis.difficultyBreakdown[testCase.difficulty] = 
      (analysis.difficultyBreakdown[testCase.difficulty] || 0) + 1;

    // Track confidence distribution
    analysis.confidenceDistribution.push(result.confidence);

    // Track manual review rate
    if (result.requiresManualReview) {
      manualReviewCount++;
    }

    // Track category accuracy
    for (const category of testCase.categories) {
      if (!analysis.categoryAccuracy[category]) {
        analysis.categoryAccuracy[category] = 0;
      }
      
      // Simplified accuracy check - correct if confidence is in expected range
      const confidenceInRange = 
        result.confidence >= testCase.expectedConfidence.min &&
        result.confidence <= testCase.expectedConfidence.max;
      
      if (confidenceInRange) {
        analysis.categoryAccuracy[category]++;
      }
    }
  }

  analysis.manualReviewRate = manualReviewCount / results.size;

  // Convert category accuracy to percentages
  for (const category in analysis.categoryAccuracy) {
    const totalInCategory = Array.from(results.values())
      .filter(({ testCase }) => testCase.categories.includes(category)).length;
    analysis.categoryAccuracy[category] = 
      (analysis.categoryAccuracy[category] / totalInCategory) * 100;
  }

  return analysis;
}