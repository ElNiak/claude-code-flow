/**
 * Integration tests for Task tool with hallucination prevention
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TaskValidator } from '../../../src/verification/task-validator';
import { VerificationEngine } from '../../../src/verification/verification-engine';
import { TaskInstruction, AgentSpawnRequest } from '../../../src/types/task-types';

describe('Task Tool Integration with Hallucination Prevention', () => {
  let taskValidator: TaskValidator;
  let mockVerificationEngine: jest.Mocked<VerificationEngine>;

  beforeEach(() => {
    mockVerificationEngine = {
      verify: jest.fn(),
      verifyCodeSnippet: jest.fn(),
      verifyImplementationClaim: jest.fn(),
      validateCapabilityClaim: jest.fn(),
      validateInstructionRealism: jest.fn()
    } as jest.Mocked<VerificationEngine>;

    taskValidator = new TaskValidator(mockVerificationEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Instruction Validation', () => {
    it('should validate realistic agent instructions', async () => {
      const validInstructions: TaskInstruction[] = [
        {
          agentType: 'researcher',
          instruction: 'Research best practices for REST API design and document findings',
          context: 'Building a new user management system',
          tools: ['Read', 'WebSearch', 'Write']
        },
        {
          agentType: 'coder',
          instruction: 'Implement user authentication endpoints using JWT tokens',
          context: 'Following the research findings from researcher agent',
          tools: ['Read', 'Write', 'Edit', 'Bash']
        },
        {
          agentType: 'tester',
          instruction: 'Write comprehensive unit tests for authentication endpoints',
          context: 'Testing the implementation from coder agent',
          tools: ['Read', 'Write', 'Bash']
        }
      ];

      mockVerificationEngine.validateInstructionRealism.mockResolvedValue({
        isRealistic: true,
        confidence: 0.9,
        reason: 'Standard development workflow with realistic tasks'
      });

      const result = await taskValidator.validateInstructions(validInstructions);

      expect(result.validInstructions).toHaveLength(3);
      expect(result.flaggedInstructions).toHaveLength(0);
      expect(result.overallReliabilityScore).toBeGreaterThan(0.8);
    });

    it('should flag instructions with impossible capabilities', async () => {
      const problematicInstructions: TaskInstruction[] = [
        {
          agentType: 'architect',
          instruction: 'Design a quantum computing architecture that solves all scalability issues',
          context: 'Creating next-generation system',
          tools: ['Write', 'Read']
        },
        {
          agentType: 'ai-coder',
          instruction: 'Use advanced AI to write perfect bug-free code automatically',
          context: 'Leveraging superintelligent coding capabilities',
          tools: ['AI', 'AutoCoder', 'PerfectGenerator']
        },
        {
          agentType: 'predictor',
          instruction: 'Predict all future user requirements with 100% accuracy',
          context: 'Using telepathic user analysis',
          tools: ['MindReader', 'FutureSight']
        }
      ];

      mockVerificationEngine.validateInstructionRealism
        .mockResolvedValueOnce({
          isRealistic: false,
          confidence: 0.95,
          reason: 'Quantum computing claims are unrealistic for typical applications'
        })
        .mockResolvedValueOnce({
          isRealistic: false,
          confidence: 0.98,
          reason: 'Claims of perfect automated coding are impossible'
        })
        .mockResolvedValueOnce({
          isRealistic: false,
          confidence: 0.97,
          reason: 'Future prediction with 100% accuracy is impossible'
        });

      const result = await taskValidator.validateInstructions(problematicInstructions);

      expect(result.validInstructions).toHaveLength(0);
      expect(result.flaggedInstructions).toHaveLength(3);
      expect(result.flaggedInstructions[0].reason).toContain('Quantum computing claims');
      expect(result.flaggedInstructions[1].reason).toContain('perfect automated coding');
      expect(result.flaggedInstructions[2].reason).toContain('100% accuracy is impossible');
    });

    it('should validate tool availability claims', async () => {
      const instructionsWithTools: TaskInstruction[] = [
        {
          agentType: 'coder',
          instruction: 'Use Read, Write, and Edit tools to implement features',
          context: 'Standard development workflow',
          tools: ['Read', 'Write', 'Edit', 'Bash']
        },
        {
          agentType: 'magic-coder',
          instruction: 'Use MagicTool and AutoPerfectCode to implement features',
          context: 'Using advanced non-existent tools',
          tools: ['MagicTool', 'AutoPerfectCode', 'MindReader']
        }
      ];

      mockVerificationEngine.validateInstructionRealism
        .mockResolvedValueOnce({
          isRealistic: true,
          confidence: 0.95,
          reason: 'All tools are available in Claude Code'
        })
        .mockResolvedValueOnce({
          isRealistic: false,
          confidence: 0.9,
          reason: 'Referenced tools do not exist in the system'
        });

      const result = await taskValidator.validateInstructions(instructionsWithTools);

      expect(result.validInstructions).toHaveLength(1);
      expect(result.flaggedInstructions).toHaveLength(1);
      expect(result.flaggedInstructions[0].reason).toContain('tools do not exist');
    });
  });

  describe('Agent Spawning Validation', () => {
    it('should validate realistic agent spawn requests', async () => {
      const spawnRequest: AgentSpawnRequest = {
        agents: [
          {
            type: 'researcher',
            name: 'API Research Specialist',
            instruction: 'Research modern API design patterns and security best practices',
            coordinationHooks: ['pre-task', 'post-edit', 'notification']
          },
          {
            type: 'architect',
            name: 'System Designer',
            instruction: 'Design scalable architecture based on research findings',
            coordinationHooks: ['pre-task', 'post-edit', 'memory-store']
          },
          {
            type: 'coder',
            name: 'Backend Developer',
            instruction: 'Implement the designed architecture with proper error handling',
            coordinationHooks: ['pre-task', 'post-edit', 'post-task']
          }
        ],
        coordinationStrategy: 'hierarchical',
        maxConcurrency: 3
      };

      mockVerificationEngine.validateInstructionRealism.mockResolvedValue({
        isRealistic: true,
        confidence: 0.88,
        reason: 'Realistic agent workflow with proper coordination'
      });

      const result = await taskValidator.validateSpawnRequest(spawnRequest);

      expect(result.isValid).toBe(true);
      expect(result.validatedAgents).toHaveLength(3);
      expect(result.warnings).toHaveLength(0);
    });

    it('should flag agent types with impossible capabilities', async () => {
      const unrealisticSpawnRequest: AgentSpawnRequest = {
        agents: [
          {
            type: 'quantum-optimizer',
            name: 'Quantum Performance Enhancer',
            instruction: 'Use quantum computing to optimize all code to theoretical perfection',
            coordinationHooks: ['quantum-sync', 'perfect-optimization']
          },
          {
            type: 'time-traveler',
            name: 'Future Code Previewer',
            instruction: 'Travel to the future to see optimal implementation and bring it back',
            coordinationHooks: ['time-portal', 'future-sync']
          }
        ],
        coordinationStrategy: 'quantum-entanglement',
        maxConcurrency: Infinity
      };

      mockVerificationEngine.validateInstructionRealism
        .mockResolvedValueOnce({
          isRealistic: false,
          confidence: 0.98,
          reason: 'Quantum computing optimization claims are unrealistic'
        })
        .mockResolvedValueOnce({
          isRealistic: false,
          confidence: 0.99,
          reason: 'Time travel for code development is impossible'
        });

      const result = await taskValidator.validateSpawnRequest(unrealisticSpawnRequest);

      expect(result.isValid).toBe(false);
      expect(result.validatedAgents).toHaveLength(0);
      expect(result.flaggedAgents).toHaveLength(2);
      expect(result.flaggedAgents[0].reason).toContain('Quantum computing optimization');
      expect(result.flaggedAgents[1].reason).toContain('Time travel');
    });
  });

  describe('Coordination Hook Validation', () => {
    it('should validate existing coordination hooks', async () => {
      const validHooks = [
        'pre-task',
        'post-edit',
        'post-task',
        'notification',
        'memory-store',
        'session-restore'
      ];

      const result = await taskValidator.validateCoordinationHooks(validHooks);

      expect(result.validHooks).toHaveLength(6);
      expect(result.invalidHooks).toHaveLength(0);
      expect(result.allHooksValid).toBe(true);
    });

    it('should flag non-existent coordination hooks', async () => {
      const invalidHooks = [
        'pre-task', // Valid
        'telepathic-sync', // Invalid
        'quantum-entanglement', // Invalid
        'post-edit', // Valid
        'mind-meld', // Invalid
        'time-sync' // Invalid
      ];

      const result = await taskValidator.validateCoordinationHooks(invalidHooks);

      expect(result.validHooks).toHaveLength(2);
      expect(result.invalidHooks).toHaveLength(4);
      expect(result.invalidHooks).toEqual([
        'telepathic-sync',
        'quantum-entanglement', 
        'mind-meld',
        'time-sync'
      ]);
      expect(result.allHooksValid).toBe(false);
    });
  });

  describe('Task Coordination Strategy Validation', () => {
    it('should validate supported coordination strategies', async () => {
      const validStrategies = [
        'hierarchical',
        'mesh',
        'ring',
        'star',
        'parallel',
        'sequential'
      ];

      for (const strategy of validStrategies) {
        const result = await taskValidator.validateCoordinationStrategy(strategy);
        expect(result.isValid).toBe(true);
        expect(result.strategy).toBe(strategy);
      }
    });

    it('should flag unsupported coordination strategies', async () => {
      const invalidStrategies = [
        'quantum-entangled',
        'telepathic-mesh',
        'time-synchronized',
        'mind-melded',
        'impossible-perfect'
      ];

      for (const strategy of invalidStrategies) {
        const result = await taskValidator.validateCoordinationStrategy(strategy);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('not supported');
      }
    });
  });

  describe('Batch Agent Instruction Validation', () => {
    it('should efficiently validate large batches of agent instructions', async () => {
      const largeBatch: TaskInstruction[] = Array.from({ length: 20 }, (_, i) => ({
        agentType: `agent-${i + 1}`,
        instruction: `Perform standard development task ${i + 1}`,
        context: `Standard context for task ${i + 1}`,
        tools: ['Read', 'Write', 'Edit']
      }));

      mockVerificationEngine.validateInstructionRealism.mockResolvedValue({
        isRealistic: true,
        confidence: 0.85,
        reason: 'Standard development task'
      });

      const startTime = performance.now();
      const result = await taskValidator.validateInstructions(largeBatch);
      const endTime = performance.now();

      expect(result.validInstructions).toHaveLength(20);
      expect(result.flaggedInstructions).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle validation errors gracefully in batch processing', async () => {
      const instructionsWithErrors: TaskInstruction[] = [
        {
          agentType: 'valid-agent',
          instruction: 'Perform valid task',
          context: 'Valid context',
          tools: ['Read', 'Write']
        },
        {
          agentType: 'error-prone-agent',
          instruction: 'Task that causes validation error',
          context: 'Error context',
          tools: ['Read', 'Write']
        }
      ];

      mockVerificationEngine.validateInstructionRealism
        .mockResolvedValueOnce({
          isRealistic: true,
          confidence: 0.9,
          reason: 'Valid instruction'
        })
        .mockRejectedValueOnce(new Error('Validation service error'));

      const result = await taskValidator.validateInstructions(instructionsWithErrors);

      expect(result.validInstructions).toHaveLength(1);
      expect(result.errorInstructions).toHaveLength(1);
      expect(result.errorInstructions[0].error).toContain('Validation service error');
    });
  });

  describe('Real-World Task Validation Scenarios', () => {
    it('should validate complex multi-agent development workflow', async () => {
      const realWorldWorkflow: TaskInstruction[] = [
        {
          agentType: 'product-owner',
          instruction: 'Analyze user requirements and create user stories for e-commerce platform',
          context: 'Building new e-commerce system',
          tools: ['Read', 'Write', 'WebSearch']
        },
        {
          agentType: 'architect',
          instruction: 'Design microservices architecture based on user stories',
          context: 'Scalable e-commerce platform design',
          tools: ['Read', 'Write', 'Edit']
        },
        {
          agentType: 'backend-developer',
          instruction: 'Implement user service and authentication API',
          context: 'Following architectural design',
          tools: ['Read', 'Write', 'Edit', 'Bash']
        },
        {
          agentType: 'frontend-developer',
          instruction: 'Create React components for user authentication UI',
          context: 'Connecting to backend authentication API',
          tools: ['Read', 'Write', 'Edit', 'Bash']
        },
        {
          agentType: 'qa-engineer',
          instruction: 'Write automated tests for authentication flow',
          context: 'Testing full authentication workflow',
          tools: ['Read', 'Write', 'Bash']
        },
        {
          agentType: 'devops-engineer',
          instruction: 'Set up CI/CD pipeline and deployment configuration',
          context: 'Automating deployment of e-commerce platform',
          tools: ['Read', 'Write', 'Bash']
        }
      ];

      mockVerificationEngine.validateInstructionRealism.mockResolvedValue({
        isRealistic: true,
        confidence: 0.9,
        reason: 'Standard software development workflow with realistic tasks'
      });

      const result = await taskValidator.validateInstructions(realWorldWorkflow);

      expect(result.validInstructions).toHaveLength(6);
      expect(result.flaggedInstructions).toHaveLength(0);
      expect(result.overallReliabilityScore).toBeGreaterThan(0.85);
    });

    it('should detect and flag unrealistic workflow claims', async () => {
      const unrealisticWorkflow: TaskInstruction[] = [
        {
          agentType: 'ai-architect',
          instruction: 'Use superintelligent AI to design perfect scalable architecture',
          context: 'Leveraging AGI capabilities',
          tools: ['SuperAI', 'PerfectDesigner']
        },
        {
          agentType: 'quantum-developer',
          instruction: 'Implement quantum-enhanced backend with impossible performance',
          context: 'Using quantum computing for web APIs',
          tools: ['QuantumCompiler', 'ImpossibleOptimizer']
        },
        {
          agentType: 'telepathic-tester',
          instruction: 'Test all possible user scenarios by reading their minds',
          context: 'Comprehensive telepathic testing',
          tools: ['MindReader', 'TelepathicAPI']
        }
      ];

      mockVerificationEngine.validateInstructionRealism.mockResolvedValue({
        isRealistic: false,
        confidence: 0.95,
        reason: 'Claims impossible technological capabilities'
      });

      const result = await taskValidator.validateInstructions(unrealisticWorkflow);

      expect(result.validInstructions).toHaveLength(0);
      expect(result.flaggedInstructions).toHaveLength(3);
      expect(result.overallReliabilityScore).toBeLessThan(0.2);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should maintain low false positive rate for standard agent types', async () => {
      const standardAgentTypes = [
        'researcher', 'architect', 'coder', 'tester', 'reviewer',
        'analyst', 'coordinator', 'specialist', 'documenter', 'monitor'
      ];

      const instructions = standardAgentTypes.map(type => ({
        agentType: type,
        instruction: `Perform standard ${type} tasks with best practices`,
        context: 'Standard development workflow',
        tools: ['Read', 'Write', 'Edit']
      }));

      mockVerificationEngine.validateInstructionRealism.mockResolvedValue({
        isRealistic: true,
        confidence: 0.9,
        reason: 'Standard agent type with realistic capabilities'
      });

      const result = await taskValidator.validateInstructions(instructions);

      // Should have 0% false positive rate for standard agent types
      expect(result.flaggedInstructions).toHaveLength(0);
      expect(result.validInstructions).toHaveLength(10);
    });

    it('should handle service failures gracefully', async () => {
      const instructions: TaskInstruction[] = [
        {
          agentType: 'test-agent',
          instruction: 'Perform test task',
          context: 'Test context',
          tools: ['Read', 'Write']
        }
      ];

      mockVerificationEngine.validateInstructionRealism.mockRejectedValue(
        new Error('Verification service temporarily unavailable')
      );

      const result = await taskValidator.validateInstructions(instructions);

      expect(result.validInstructions).toHaveLength(0);
      expect(result.errorInstructions).toHaveLength(1);
      expect(result.errorInstructions[0].error).toContain('temporarily unavailable');
      expect(result.serviceHealthy).toBe(false);
    });
  });
});