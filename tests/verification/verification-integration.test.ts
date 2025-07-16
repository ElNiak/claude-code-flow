/**
 * Integration tests for verification system with TodoWrite and Task tools
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VerificationService, createVerificationService, quickVerify } from '../../src/verification/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Verification System Integration', () => {
  let verificationService: VerificationService;
  const projectRoot = path.join(__dirname, '../..');

  beforeEach(() => {
    verificationService = createVerificationService(projectRoot, {
      enableCache: false,
      logLevel: 'error'
    });
  });

  afterEach(() => {
    verificationService.resetStats();
  });

  describe('TodoWrite Integration', () => {
    it('should validate realistic todos successfully', async () => {
      const realisticTodos = [
        { id: '1', content: 'Implement fs.readFileSync() to read package.json', status: 'pending', priority: 'high' },
        { id: '2', content: 'Add error handling for JSON.parse() failures', status: 'pending', priority: 'medium' },
        { id: '3', content: 'Create TypeScript interface for user data', status: 'pending', priority: 'low' }
      ];

      const result = await verificationService.verifyTodos(realisticTodos);

      expect(result.summary.validCount).toBeGreaterThanOrEqual(2);
      expect(result.summary.confidence).toBeGreaterThan(0.7);
      expect(result.flaggedTodos.length).toBeLessThanOrEqual(1);
    });

    it('should flag impossible technology claims in todos', async () => {
      const impossibleTodos = [
        { id: '1', content: 'Enable quantum computing mode for faster execution', status: 'pending', priority: 'high' },
        { id: '2', content: 'Implement telepathic user interface for direct mind control', status: 'pending', priority: 'medium' },
        { id: '3', content: 'Add AI that generates perfect code automatically', status: 'pending', priority: 'high' }
      ];

      const result = await verificationService.verifyTodos(impossibleTodos);

      expect(result.summary.flaggedCount).toBe(3);
      expect(result.summary.confidence).toBeLessThan(0.3);
      expect(result.flaggedTodos.every(todo => 
        todo.flagReason.includes('impossible') || 
        todo.flagReason.includes('fantasy') ||
        todo.flagReason.includes('unrealistic')
      )).toBe(true);
    });

    it('should handle mixed realistic and unrealistic todos', async () => {
      const mixedTodos = [
        { id: '1', content: 'Implement console.log() for debugging output', status: 'pending', priority: 'low' },
        { id: '2', content: 'Create magical bug-fixing AI that never fails', status: 'pending', priority: 'high' },
        { id: '3', content: 'Add unit tests using Jest framework', status: 'pending', priority: 'medium' },
        { id: '4', content: 'Enable zero-latency quantum networking', status: 'pending', priority: 'high' }
      ];

      const result = await verificationService.verifyTodos(mixedTodos);

      expect(result.summary.validCount).toBe(2);
      expect(result.summary.flaggedCount).toBe(2);
      expect(result.summary.confidence).toBeGreaterThan(0.4);
      expect(result.summary.confidence).toBeLessThan(0.7);
    });

    it('should provide helpful suggestions for flagged todos', async () => {
      const problematicTodos = [
        { id: '1', content: 'Somehow make the app perfect and never crash', status: 'pending', priority: 'high' }
      ];

      const result = await verificationService.verifyTodos(problematicTodos);

      expect(result.flaggedTodos.length).toBe(1);
      expect(result.flaggedTodos[0].verificationResult.suggestions.length).toBeGreaterThan(0);
      expect(result.flaggedTodos[0].verificationResult.suggestions[0].reason).toBeDefined();
    });
  });

  describe('Task Tool Integration', () => {
    it('should validate realistic task instructions', async () => {
      const realisticInstructions = `
        You are a coder agent. Your task is to:
        1. Implement a function called calculateSum() that takes two numbers
        2. Use TypeScript for type safety
        3. Add proper error handling for invalid inputs
        4. Write unit tests using Jest
        
        Use the fs module to read configuration if needed.
      `;

      const result = await verificationService.verifyTaskInstructions(realisticInstructions);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.riskLevel).toBe('low');
      expect(result.actionableItems.length).toBeGreaterThan(0);
    });

    it('should flag impossible capability claims in instructions', async () => {
      const impossibleInstructions = `
        You are a super-intelligent AI agent with access to:
        - Quantum computing algorithms for infinite speed
        - Telepathic communication with other systems
        - Time travel debugging capabilities
        - Perfect code generation that never has bugs
        
        Use these capabilities to automatically solve any programming problem perfectly.
      `;

      const result = await verificationService.verifyTaskInstructions(impossibleInstructions);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.riskLevel).toBe('critical');
      expect(result.warnings.length).toBeGreaterThan(3);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should validate task instructions for specific agent types', async () => {
      const coderInstructions = `
        As a coder agent, please research market trends and write a business report.
        Do not write any code or implement any functions.
      `;

      const result = await verificationService.verifyTaskInstructions(coderInstructions);

      expect(result.confidence).toBeLessThan(0.6);
      expect(result.warnings.some(w => w.includes('role') || w.includes('inappropriate'))).toBe(true);
    });

    it('should handle vague vs. specific instructions', async () => {
      const vageInstructions = "Make the system better somehow using advanced AI.";
      const specificInstructions = "Implement the getUserById() function in src/users/userService.ts using the existing database connection.";

      const vageResult = await verificationService.verifyTaskInstructions(vageInstructions);
      const specificResult = await verificationService.verifyTaskInstructions(specificInstructions);

      expect(vageResult.confidence).toBeLessThan(specificResult.confidence);
      expect(vageResult.actionableItems.length).toBeLessThan(specificResult.actionableItems.length);
      expect(vageResult.suggestions.length).toBeGreaterThan(specificResult.suggestions.length);
    });
  });

  describe('Workflow Verification', () => {
    it('should validate realistic workflow steps', async () => {
      const realisticSteps = [
        { id: 'step1', description: 'Initialize project with npm init', action: 'setup' },
        { id: 'step2', description: 'Install TypeScript and Jest dependencies', action: 'install' },
        { id: 'step3', description: 'Create src/index.ts entry point', action: 'create' },
        { id: 'step4', description: 'Write unit tests in tests/ directory', action: 'test' }
      ];

      const result = await verificationService.verifyWorkflowSteps(realisticSteps);

      expect(result.summary.validCount).toBeGreaterThanOrEqual(3);
      expect(result.summary.overallConfidence).toBeGreaterThan(0.7);
      expect(result.invalidSteps.length).toBeLessThanOrEqual(1);
    });

    it('should flag impossible workflow steps', async () => {
      const impossibleSteps = [
        { id: 'step1', description: 'Activate quantum computing mode', action: 'quantum' },
        { id: 'step2', description: 'Enable telepathic user interface', action: 'telepathy' },
        { id: 'step3', description: 'Generate perfect code automatically', action: 'magic' }
      ];

      const result = await verificationService.verifyWorkflowSteps(impossibleSteps);

      expect(result.summary.invalidCount).toBe(3);
      expect(result.summary.overallConfidence).toBeLessThan(0.3);
      expect(result.invalidSteps.every(step => step.issues.length > 0)).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete verification within performance targets', async () => {
      const testCode = 'console.log("Hello, World!");';
      
      const startTime = performance.now();
      const result = await verificationService.verifyCode(testCode);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // < 100ms target
      expect(result.performanceMetrics.verificationTime).toBeLessThan(100);
    });

    it('should handle concurrent verifications efficiently', async () => {
      const codeSnippets = Array(50).fill(0).map((_, i) => `const test${i} = ${i};`);
      
      const startTime = performance.now();
      const results = await Promise.all(
        codeSnippets.map(code => verificationService.verifyCode(code))
      );
      const endTime = performance.now();

      expect(results.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(1000); // < 1s for 50 verifications
      expect(results.every(r => r.isValid)).toBe(true);
    });

    it('should maintain accuracy targets', async () => {
      const validCodes = [
        'JSON.parse("{}")',
        'Array.from([1,2,3])',
        'fs.readFileSync("test.txt")',
        'console.log("test")'
      ];

      const invalidCodes = [
        'AI.generatePerfectCode()',
        'quantumProcessor.compute()',
        'telepathicAPI.readMind()',
        'magicSolver.solveAll()'
      ];

      const validResults = await Promise.all(
        validCodes.map(code => verificationService.verifyCode(code))
      );

      const invalidResults = await Promise.all(
        invalidCodes.map(code => verificationService.verifyCode(code))
      );

      // Check for low false positive rate (< 2%)
      const falsePositives = validResults.filter(r => !r.isValid).length;
      const falsePositiveRate = falsePositives / validResults.length;
      expect(falsePositiveRate).toBeLessThan(0.02);

      // Check for low false negative rate (< 0.5%)
      const falseNegatives = invalidResults.filter(r => r.isValid).length;
      const falseNegativeRate = falseNegatives / invalidResults.length;
      expect(falseNegativeRate).toBeLessThan(0.005);
    });
  });

  describe('Quick Verify Function', () => {
    it('should provide simple verification interface', async () => {
      const result = await quickVerify('console.log("test")');

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.issues).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should handle invalid code gracefully', async () => {
      const result = await quickVerify('impossibleFunction()');

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('System Health', () => {
    it('should report healthy status', async () => {
      const health = await verificationService.healthCheck();

      expect(health.isHealthy).toBe(true);
      expect(health.version).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.stats).toBeDefined();
    });

    it('should provide usage statistics', async () => {
      // Perform some verifications to generate stats
      await verificationService.verifyCode('console.log("test1")');
      await verificationService.verifyCode('console.log("test2")');
      await verificationService.verifyCode('impossibleFunction()');

      const stats = verificationService.getStats();

      expect(stats.totalVerifications).toBe(3);
      expect(stats.successfulVerifications).toBeGreaterThanOrEqual(2);
      expect(stats.averageVerificationTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      const malformedInputs = [
        '',
        null,
        undefined,
        '})({['
      ];

      for (const input of malformedInputs) {
        const result = await verificationService.verifyCode(input as any);
        expect(result).toBeDefined();
        expect(result.requiresManualReview).toBe(true);
      }
    });

    it('should recover from service errors', async () => {
      // Test with extremely large input
      const largeInput = 'x'.repeat(100000);
      
      const result = await verificationService.verifyCode(largeInput);
      expect(result).toBeDefined();
      
      // Service should still be functional after error
      const followupResult = await verificationService.verifyCode('console.log("test")');
      expect(followupResult.isValid).toBe(true);
    });
  });
});

describe('Real-world Integration Scenarios', () => {
  let verificationService: VerificationService;

  beforeEach(() => {
    verificationService = createVerificationService(process.cwd());
  });

  it('should integrate with existing Claude Flow workflows', async () => {
    // Simulate real Claude Flow usage patterns
    const swarmInitCode = `
      await mcp__claude-flow__swarm_init({ 
        topology: "mesh", 
        maxAgents: 6 
      });
    `;

    const result = await verificationService.verifyCode(swarmInitCode);
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('should validate common TodoWrite patterns from the codebase', async () => {
    const realTodos = [
      { content: 'Initialize system with proper error handling', status: 'pending', priority: 'high' },
      { content: 'Implement task orchestration using Promise.all()', status: 'in_progress', priority: 'high' },
      { content: 'Add memory persistence with SQLite database', status: 'completed', priority: 'medium' },
      { content: 'Create agent coordination hooks system', status: 'pending', priority: 'medium' },
      { content: 'Optimize swarm topology for performance', status: 'pending', priority: 'low' }
    ];

    const result = await verificationService.verifyTodos(realTodos);
    
    expect(result.summary.confidence).toBeGreaterThan(0.8);
    expect(result.summary.validCount).toBeGreaterThanOrEqual(4);
  });

  it('should handle agent instruction patterns from the codebase', async () => {
    const realAgentInstructions = `
      You are the VerificationEngineer coder agent in the Hive Mind collective intelligence system.
      
      Your mission: Design and implement systematic code/string verification methodology.
      
      Specific tasks:
      1. Analyze existing validation mechanisms in the codebase
      2. Research industry best practices for code verification
      3. Design a systematic approach to validate generated code/strings
      4. Identify checkpoints where verification should occur
      5. Create validation schemas and rule sets
      
      Use WebSearch to research anti-hallucination techniques and verification methodologies.
      Coordinate with HallucinationDetector for anomaly patterns.
    `;

    const result = await verificationService.verifyTaskInstructions(realAgentInstructions);
    
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.riskLevel).toBe('low');
    expect(result.actionableItems.length).toBeGreaterThan(3);
  });
});