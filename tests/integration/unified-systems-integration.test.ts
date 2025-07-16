/**
 * Comprehensive Integration Tests for Unified Systems
 * Tests SPARC + Swarm + Hive integration in work-command.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkCommand } from '../../src/unified/work/work-command.js';
import { Logger } from '../../src/core/logger.js';
import { EventBus } from '../../src/core/event-bus.js';
import { TaskEngine } from '../../src/task/engine.js';
import { SeamlessIntegration } from '../../src/unified/core/seamless-integration.js';
import { UnifiedExecutionEngine } from '../../src/unified/execution/unified-execution-engine.js';

// Mock dependencies
jest.mock('../../src/core/logger.js');
jest.mock('../../src/core/event-bus.js');
jest.mock('../../src/task/engine.js');
jest.mock('../../src/unified/core/seamless-integration.js', () => ({
  SeamlessIntegration: jest.fn(),
  createSeamlessIntegration: jest.fn(),
  executeWithSeamlessIntegration: jest.fn()
}));
jest.mock('../../src/unified/execution/unified-execution-engine.js');

describe('Unified Systems Integration Tests', () => {
  let workCommand: WorkCommand;
  let mockLogger: jest.Mocked<Logger>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockTaskEngine: jest.Mocked<TaskEngine>;
  let mockSeamlessIntegration: jest.Mocked<SeamlessIntegration>;
  let mockUnifiedExecutionEngine: jest.Mocked<UnifiedExecutionEngine>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn(),
      getInstance: jest.fn(),
    } as any;

    mockTaskEngine = {
      initialize: jest.fn(),
      submitTask: jest.fn(),
    } as any;

    mockSeamlessIntegration = {
      integrateSeamlessly: jest.fn(),
    } as any;

    mockUnifiedExecutionEngine = {
      initialize: jest.fn(),
      executeIntelligent: jest.fn(),
      getUnifiedStatus: jest.fn(),
    } as any;

    // Setup static method mocks
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
    (EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus);

    // Setup constructor mocks
    (SeamlessIntegration as jest.Mock).mockImplementation(() => mockSeamlessIntegration);
    (UnifiedExecutionEngine as jest.Mock).mockImplementation(() => mockUnifiedExecutionEngine);
    (TaskEngine as jest.Mock).mockImplementation(() => mockTaskEngine);

    // Initialize WorkCommand
    workCommand = new WorkCommand();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Work Command Integration', () => {
    it('should initialize unified systems properly', async () => {
      // Mock seamless integration success
      mockSeamlessIntegration.integrateSeamlessly.mockResolvedValue({
        sparc: true,
        swarm: true,
        hive: true,
      });

      mockUnifiedExecutionEngine.initialize.mockResolvedValue();

      // Call the private method through reflection
      const initializeMethod = (workCommand as any).initializeUnifiedSystems;
      await initializeMethod.call(workCommand);

      expect(mockSeamlessIntegration.integrateSeamlessly).toHaveBeenCalledWith(
        'system-initialization',
        expect.objectContaining({
          environment: 'development',
          silentMode: false,
        })
      );

      expect(mockUnifiedExecutionEngine.initialize).toHaveBeenCalled();
    });

    it('should handle seamless integration failure gracefully', async () => {
      // Mock seamless integration failure
      mockSeamlessIntegration.integrateSeamlessly.mockRejectedValue(new Error('Integration failed'));

      // Mock fallback to basic unified execution
      mockUnifiedExecutionEngine.initialize.mockResolvedValue();

      // Call the private method through reflection
      const initializeMethod = (workCommand as any).initializeUnifiedSystems;
      await initializeMethod.call(workCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Seamless integration not available')
      );
      expect(mockUnifiedExecutionEngine.initialize).toHaveBeenCalled();
    });

    it('should fall back to legacy mode when unified systems fail', async () => {
      // Mock all unified systems failing
      mockSeamlessIntegration.integrateSeamlessly.mockRejectedValue(new Error('No integration'));
      mockUnifiedExecutionEngine.initialize.mockRejectedValue(new Error('Engine failed'));

      // Call the private method through reflection
      const initializeMethod = (workCommand as any).initializeUnifiedSystems;
      await initializeMethod.call(workCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unified systems not available, using legacy mode')
      );
    });
  });

  describe('Agent Spawning in reformulateObjective', () => {
    it('should spawn prompt-engineer agent successfully', async () => {
      const mockTaskResult = {
        reformulatedTask: 'Enhanced task description',
        enhancedParams: ['param1', 'param2'],
        rationale: 'Task improved for better execution',
        optimizations: ['optimization1'],
        clarifications: ['clarification1'],
      };

      // Mock Task tool being available
      (globalThis as any).Task = jest.fn().mockResolvedValue(JSON.stringify(mockTaskResult));

      const reformulateMethod = (workCommand as any).reformulateObjective;
      const result = await reformulateMethod.call(workCommand, 'original task', [], {});

      expect(result).toEqual(mockTaskResult);
      expect((globalThis as any).Task).toHaveBeenCalledWith({
        description: 'Prompt Engineering Reformulation',
        prompt: expect.stringContaining('You are the prompt-engineer agent'),
      });
    });

    it('should handle Task tool failure with fallback', async () => {
      // Mock Task tool not available
      (globalThis as any).Task = undefined;

      // Mock TaskEngine fallback
      mockTaskEngine.submitTask.mockResolvedValue({
        output: 'Fallback reformulation',
        result: 'Reformulation completed',
      });

      const reformulateMethod = (workCommand as any).reformulateObjective;
      const result = await reformulateMethod.call(workCommand, 'original task', [], {});

      expect(result.reformulatedTask).toBe('original task (analyzed and optimized for execution)');
      expect(mockTaskEngine.submitTask).toHaveBeenCalledWith({
        id: expect.stringContaining('reformulation_'),
        description: 'Prompt Engineering Reformulation',
        content: expect.stringContaining('You are the prompt-engineer agent'),
        type: 'prompt-engineering',
        priority: 'high',
      });
    });

    it('should use simple reformulation when all agent spawning fails', async () => {
      // Mock all agent spawning methods failing
      (globalThis as any).Task = undefined;
      mockTaskEngine.submitTask.mockRejectedValue(new Error('Engine failed'));

      const reformulateMethod = (workCommand as any).reformulateObjective;
      const result = await reformulateMethod.call(workCommand, 'build a REST API', [], {});

      expect(result.reformulatedTask).toContain('comprehensive');
      expect(result.reformulatedTask).toContain('well-tested');
      expect(result.reformulatedTask).toContain('well-documented');
      expect(result.rationale).toBe('Applied basic reformulation rules for clarity and completeness');
    });
  });

  describe('Execution Plan Generation', () => {
    it('should generate execution steps with SPARC methodology', async () => {
      const mockAnalysis = {
        taskType: 'development',
        complexity: 'high',
        suggestedAgents: 5,
        suggestedTopology: 'hierarchical',
        suggestedStrategy: 'parallel',
        estimatedDuration: '45 minutes',
        requiredResources: ['coding', 'testing'],
      };

      const mockCoordination = {
        topology: 'hierarchical',
        agents: 5,
        strategy: 'parallel',
        enableMemory: true,
        enableHooks: true,
        enableClaudeCode: false,
      };

      const generateStepsMethod = (workCommand as any).generateExecutionSteps;
      const steps = await generateStepsMethod.call(workCommand, mockAnalysis, mockCoordination);

      // Should include SPARC initialization
      expect(steps).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'sparc_init',
          action: 'mcp__claude-flow__sparc_mode',
        }),
      ]));

      // Should include agent spawning
      expect(steps).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'agent_spawn',
          action: 'mcp__claude-flow__agent_spawn',
        }),
      ]));

      // Should include SPARC phases
      expect(steps).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'sparc_specification',
          action: 'mcp__claude-flow__sparc_mode',
        }),
        expect.objectContaining({
          type: 'sparc_architecture',
          action: 'mcp__claude-flow__sparc_mode',
        }),
      ]));
    });

    it('should include prompt-engineer agent in agent selection', async () => {
      const mockAnalysis = {
        taskType: 'development',
        complexity: 'medium',
        suggestedAgents: 4,
      };

      const getAgentTypesMethod = (workCommand as any).getOptimalAgentTypes;
      const agentTypes = getAgentTypesMethod.call(workCommand, mockAnalysis);

      // Should always include coordinator and prompt-engineer
      expect(agentTypes).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'coordinator',
          name: 'Project Manager',
        }),
        expect.objectContaining({
          type: 'prompt-engineer',
          name: 'Prompt Optimization Specialist',
        }),
      ]));
    });
  });

  describe('Unified Execution Engine Integration', () => {
    it('should use unified execution engine when available', async () => {
      const mockExecutionResult = {
        id: 'exec-123',
        type: 'workflow',
        success: true,
        duration: 5000,
        performance: {
          efficiency: 0.9,
          resourceUtilization: 0.8,
          parallelization: 0.7,
          decompositionQuality: 0.85,
        },
        learningData: {
          patterns: ['pattern1'],
          optimizations: ['optimization1'],
          recommendations: ['recommendation1'],
        },
      };

      mockUnifiedExecutionEngine.executeIntelligent.mockResolvedValue(mockExecutionResult);

      const mockPlan = {
        id: 'plan-123',
        analysis: { taskType: 'development' },
        coordination: { topology: 'mesh' },
        steps: [],
        estimatedDuration: '30 minutes',
        resources: ['coding'],
      };

      const executePlanMethod = (workCommand as any).executePlan;
      await executePlanMethod.call(workCommand, mockPlan, { strategy: 'adaptive' });

      expect(mockUnifiedExecutionEngine.executeIntelligent).toHaveBeenCalledWith(
        expect.stringContaining('Execute unified work plan'),
        expect.objectContaining({
          strategy: 'adaptive',
          enableIntelligentDecomposition: true,
        })
      );
    });

    it('should fall back to legacy execution when unified engine fails', async () => {
      mockUnifiedExecutionEngine.executeIntelligent.mockRejectedValue(new Error('Engine failed'));

      const mockPlan = {
        id: 'plan-123',
        analysis: { taskType: 'development' },
        coordination: { topology: 'mesh' },
        steps: [
          { type: 'swarm_init', action: 'mcp__claude-flow__swarm_init', params: {} },
          { type: 'agent_spawn', action: 'mcp__claude-flow__agent_spawn', params: {} },
        ],
        estimatedDuration: '30 minutes',
        resources: ['coding'],
      };

      const executePlanMethod = (workCommand as any).executePlan;
      await executePlanMethod.call(workCommand, mockPlan, { verbose: true });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unified execution failed, falling back to legacy mode')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Using legacy execution mode')
      );
    });
  });

  describe('System Status and Health', () => {
    it('should provide unified system status', () => {
      const mockStatus = {
        useUnifiedSystems: true,
        isInitialized: true,
        components: {
          unifiedExecutionEngine: true,
          seamlessIntegration: true,
        },
        unifiedEngine: {
          workflows: { total: 5, active: 2 },
          tasks: { total: 10, running: 3 },
          performance: { efficiency: 0.9 },
        },
      };

      mockUnifiedExecutionEngine.getUnifiedStatus.mockReturnValue(mockStatus.unifiedEngine);

      const getStatusMethod = (workCommand as any).getSystemStatus;
      const status = getStatusMethod.call(workCommand);

      expect(status).toEqual(expect.objectContaining({
        useUnifiedSystems: true,
        isInitialized: true,
        components: expect.objectContaining({
          unifiedExecutionEngine: true,
        }),
      }));
    });

    it('should handle MCP status checks', async () => {
      const displayMCPStatusMethod = (workCommand as any).displayMCPStatus;
      await displayMCPStatusMethod.call(workCommand, { verbose: true });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('MCP System Status:')
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle import errors gracefully', async () => {
      // Mock import failure
      const originalImport = jest.requireMock('../../src/unified/core/seamless-integration.js');
      originalImport.SeamlessIntegration.mockImplementation(() => {
        throw new Error('Import failed');
      });

      const initializeMethod = (workCommand as any).initializeUnifiedSystems;
      await initializeMethod.call(workCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Seamless integration not available')
      );
    });

    it('should validate configuration before execution', async () => {
      const mockOptions = {
        agents: 5,
        topology: 'hierarchical',
        strategy: 'parallel',
      };

      const initializeConfigMethod = (workCommand as any).initializeConfiguration;
      await initializeConfigMethod.call(workCommand, mockOptions);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Configuration loaded successfully')
      );
    });
  });

  describe('Two-Step Workflow Integration', () => {
    it('should execute two-step workflow with reformulation', async () => {
      const mockEnhancedInput = {
        reformulatedTask: 'Enhanced task description',
        enhancedParams: ['param1'],
        rationale: 'Improved for execution',
        optimizations: ['optimization1'],
        clarifications: ['clarification1'],
      };

      // Mock the reformulation method
      const reformulateMethod = jest.fn().mockResolvedValue(mockEnhancedInput);
      (workCommand as any).reformulateObjective = reformulateMethod;

      // Mock other methods
      const analyzeTaskMethod = jest.fn().mockResolvedValue({
        taskType: 'development',
        complexity: 'medium',
        suggestedAgents: 4,
      });
      (workCommand as any).analyzeTask = analyzeTaskMethod;

      const createExecutionPlanMethod = jest.fn().mockResolvedValue({
        id: 'plan-123',
        steps: [],
      });
      (workCommand as any).createExecutionPlan = createExecutionPlanMethod;

      const executePlanMethod = jest.fn().mockResolvedValue();
      (workCommand as any).executePlan = executePlanMethod;

      // Mock initialization methods
      (workCommand as any).initializeConfiguration = jest.fn().mockResolvedValue();
      (workCommand as any).initializeUnifiedSystems = jest.fn().mockResolvedValue();

      // Test the main execute method
      const executeMethod = (workCommand as any).execute;
      await executeMethod.call(workCommand, 'original task', [], {});

      expect(reformulateMethod).toHaveBeenCalledWith('original task', [], {});
      expect(analyzeTaskMethod).toHaveBeenCalledWith(
        mockEnhancedInput.reformulatedTask,
        mockEnhancedInput.enhancedParams,
        {}
      );
      expect(executePlanMethod).toHaveBeenCalled();
    });
  });
});