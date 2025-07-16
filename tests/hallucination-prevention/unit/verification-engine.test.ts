/**
 * Unit tests for hallucination verification engine
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { VerificationEngine } from '../../../src/verification/verification-engine';
import { CodeExistenceVerifier } from '../../../src/verification/code-existence-verifier';
import { CapabilityValidator } from '../../../src/verification/capability-validator';
import { RealityChecker } from '../../../src/verification/reality-checker';

describe('VerificationEngine', () => {
  let verificationEngine: VerificationEngine;
  let mockCodeVerifier: jest.Mocked<CodeExistenceVerifier>;
  let mockCapabilityValidator: jest.Mocked<CapabilityValidator>;
  let mockRealityChecker: jest.Mocked<RealityChecker>;

  beforeEach(() => {
    mockCodeVerifier = {
      verifyFunctionExists: jest.fn(),
      verifyMethodExists: jest.fn(),
      verifyImportValid: jest.fn(),
      verifyAPIEndpoint: jest.fn()
    } as jest.Mocked<CodeExistenceVerifier>;

    mockCapabilityValidator = {
      validateAIClaims: jest.fn(),
      validatePerformanceClaims: jest.fn(),
      validateFeatureClaims: jest.fn()
    } as jest.Mocked<CapabilityValidator>;

    mockRealityChecker = {
      checkImplementationExists: jest.fn(),
      validateAgainstCodebase: jest.fn(),
      crossReferenceDocumentation: jest.fn()
    } as jest.Mocked<RealityChecker>;

    verificationEngine = new VerificationEngine(
      mockCodeVerifier,
      mockCapabilityValidator,
      mockRealityChecker
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Code Existence Verification', () => {
    it('should correctly identify existing JavaScript built-ins', async () => {
      const validCode = 'JSON.parse(data)';
      mockCodeVerifier.verifyFunctionExists.mockResolvedValue(true);
      
      const result = await verificationEngine.verify(validCode);
      
      expect(result.isHallucination).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.verificationMethod).toBe('builtin_function_check');
    });

    it('should flag non-existent functions as hallucinations', async () => {
      const hallucinatedCode = 'nonExistentFunction()';
      mockCodeVerifier.verifyFunctionExists.mockResolvedValue(false);
      
      const result = await verificationEngine.verify(hallucinatedCode);
      
      expect(result.isHallucination).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reason).toContain('function does not exist');
    });

    it('should validate Node.js built-in modules', async () => {
      const validCode = 'fs.readFileSync("package.json")';
      mockCodeVerifier.verifyImportValid.mockResolvedValue(true);
      
      const result = await verificationEngine.verify(validCode);
      
      expect(result.isHallucination).toBe(false);
      expect(mockCodeVerifier.verifyImportValid).toHaveBeenCalledWith('fs');
    });

    it('should handle project-specific function verification', async () => {
      const projectCode = 'SwarmCoordinator.initialize()';
      mockCodeVerifier.verifyMethodExists.mockResolvedValue(true);
      
      const result = await verificationEngine.verify(projectCode);
      
      expect(result.isHallucination).toBe(false);
      expect(mockCodeVerifier.verifyMethodExists).toHaveBeenCalledWith('SwarmCoordinator', 'initialize');
    });
  });

  describe('AI Capability Claims Validation', () => {
    it('should flag impossible AI capabilities', async () => {
      const impossibleClaim = 'AI.generatePerfectCode()';
      mockCapabilityValidator.validateAIClaims.mockResolvedValue({
        isValid: false,
        confidence: 0.95,
        reason: 'Claims impossible AI perfection'
      });
      
      const result = await verificationEngine.verify(impossibleClaim);
      
      expect(result.isHallucination).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reason).toContain('impossible AI perfection');
    });

    it('should validate reasonable AI assistance claims', async () => {
      const reasonableClaim = 'aiAssistant.suggestOptimizations()';
      mockCapabilityValidator.validateAIClaims.mockResolvedValue({
        isValid: true,
        confidence: 0.8,
        reason: 'Reasonable AI assistance capability'
      });
      
      const result = await verificationEngine.verify(reasonableClaim);
      
      expect(result.isHallucination).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should flag overblown automation claims', async () => {
      const overblownClaim = 'automaticBugFixer.fixAllBugs()';
      mockCapabilityValidator.validateAIClaims.mockResolvedValue({
        isValid: false,
        confidence: 0.9,
        reason: 'Claims perfect automated bug fixing'
      });
      
      const result = await verificationEngine.verify(overblownClaim);
      
      expect(result.isHallucination).toBe(true);
      expect(result.reason).toContain('perfect automated bug fixing');
    });
  });

  describe('Performance Claims Validation', () => {
    it('should validate realistic performance improvements', async () => {
      const realisticClaim = 'optimizer.improve() // 20% performance gain';
      mockCapabilityValidator.validatePerformanceClaims.mockResolvedValue({
        isValid: true,
        confidence: 0.85,
        reason: 'Realistic performance improvement claim'
      });
      
      const result = await verificationEngine.verify(realisticClaim);
      
      expect(result.isHallucination).toBe(false);
    });

    it('should flag impossible performance claims', async () => {
      const impossibleClaim = 'quantumOptimizer.achieve1000xSpeedup()';
      mockCapabilityValidator.validatePerformanceClaims.mockResolvedValue({
        isValid: false,
        confidence: 0.98,
        reason: 'Claims impossible performance improvement'
      });
      
      const result = await verificationEngine.verify(impossibleClaim);
      
      expect(result.isHallucination).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.95);
    });
  });

  describe('Implementation Reality Check', () => {
    it('should cross-reference against actual codebase', async () => {
      const codeSnippet = 'memorySystem.store(data)';
      mockRealityChecker.validateAgainstCodebase.mockResolvedValue({
        isValid: true,
        confidence: 0.92,
        foundInFiles: ['src/memory/memory-system.ts'],
        reason: 'Method exists in codebase'
      });
      
      const result = await verificationEngine.verify(codeSnippet);
      
      expect(result.isHallucination).toBe(false);
      expect(result.evidence).toContain('src/memory/memory-system.ts');
    });

    it('should flag code not found in codebase', async () => {
      const nonExistentCode = 'magicSolver.solveEverything()';
      mockRealityChecker.validateAgainstCodebase.mockResolvedValue({
        isValid: false,
        confidence: 0.95,
        foundInFiles: [],
        reason: 'No matching implementation found'
      });
      
      const result = await verificationEngine.verify(nonExistentCode);
      
      expect(result.isHallucination).toBe(true);
      expect(result.reason).toContain('No matching implementation found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle ambiguous function names', async () => {
      const ambiguousCode = 'optimize()'; // Could be many things
      mockCodeVerifier.verifyFunctionExists.mockResolvedValue(false);
      mockRealityChecker.validateAgainstCodebase.mockResolvedValue({
        isValid: false,
        confidence: 0.6, // Low confidence due to ambiguity
        foundInFiles: [],
        reason: 'Ambiguous function name, requires context'
      });
      
      const result = await verificationEngine.verify(ambiguousCode);
      
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.requiresManualReview).toBe(true);
    });

    it('should handle dynamic method calls', async () => {
      const dynamicCode = 'object[methodName]()';
      
      const result = await verificationEngine.verify(dynamicCode);
      
      expect(result.requiresManualReview).toBe(true);
      expect(result.reason).toContain('dynamic method call');
    });

    it('should handle newly added features', async () => {
      const newFeatureCode = 'recentlyAddedFeature()';
      mockCodeVerifier.verifyFunctionExists.mockResolvedValue(true);
      mockRealityChecker.validateAgainstCodebase.mockResolvedValue({
        isValid: true,
        confidence: 0.8,
        foundInFiles: ['src/features/new-feature.ts'],
        reason: 'Recently added feature found'
      });
      
      const result = await verificationEngine.verify(newFeatureCode);
      
      expect(result.isHallucination).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete verification within 100ms', async () => {
      const code = 'simpleFunction()';
      mockCodeVerifier.verifyFunctionExists.mockResolvedValue(true);
      
      const startTime = performance.now();
      await verificationEngine.verify(code);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle concurrent verifications efficiently', async () => {
      const codeSnippets = Array(100).fill('testFunction()');
      mockCodeVerifier.verifyFunctionExists.mockResolvedValue(true);
      
      const startTime = performance.now();
      const results = await Promise.all(
        codeSnippets.map(code => verificationEngine.verify(code))
      );
      const endTime = performance.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should handle 100 verifications in < 1s
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide high confidence for clear cases', async () => {
      const clearValidCode = 'console.log("hello")';
      mockCodeVerifier.verifyFunctionExists.mockResolvedValue(true);
      
      const result = await verificationEngine.verify(clearValidCode);
      
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    it('should provide lower confidence for borderline cases', async () => {
      const borderlineCode = 'smartOptimizer.optimize()';
      mockCapabilityValidator.validateAIClaims.mockResolvedValue({
        isValid: true,
        confidence: 0.6,
        reason: 'Could be legitimate optimization'
      });
      
      const result = await verificationEngine.verify(borderlineCode);
      
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.requiresManualReview).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle verification service failures gracefully', async () => {
      const code = 'testFunction()';
      mockCodeVerifier.verifyFunctionExists.mockRejectedValue(new Error('Service unavailable'));
      
      const result = await verificationEngine.verify(code);
      
      expect(result.isHallucination).toBe(false); // Fail open for safety
      expect(result.confidence).toBe(0.5); // Neutral confidence
      expect(result.reason).toContain('verification service unavailable');
      expect(result.requiresManualReview).toBe(true);
    });

    it('should handle malformed code input', async () => {
      const malformedCode = '})({[';
      
      const result = await verificationEngine.verify(malformedCode);
      
      expect(result.requiresManualReview).toBe(true);
      expect(result.reason).toContain('malformed code');
    });
  });
});