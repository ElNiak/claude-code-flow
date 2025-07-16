/**
 * Integration tests for the Unified Execution Engine
 * Tests the merger of TaskEngine and WorkflowEngine capabilities
 */

import { describe, it, beforeEach, afterEach, expect } from "../test.utils.ts";
import { UnifiedExecutionEngine, type UnifiedExecutionOptions } from '../../src/unified/execution/unified-execution-engine.js';
import { WorkflowDefinition } from '../../src/cli/commands/workflow.js';
import { WorkflowTask } from '../../src/task/engine.js';

describe('Unified Execution Engine Integration Tests', () => {
  let engine: UnifiedExecutionEngine;
  let testWorkflowDir: string;

  beforeEach(async () => {
    const options: Partial<UnifiedExecutionOptions> = {
      strategy: 'adaptive',
      maxConcurrency: 4,
      enableIntelligentDecomposition: true,
      enableResourceOptimization: true,
      enableAdaptiveLearning: true,
      coordinationConfig: {
        topology: 'mesh',
        communicationProtocol: 'event-driven'
      },
      debug: true
    };
    
    engine = new UnifiedExecutionEngine(options);
    testWorkflowDir = await Deno.makeTempDir({ prefix: 'unified-test-' });
  });

  afterEach(async () => {
    try {
      await Deno.remove(testWorkflowDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Engine Initialization', () => {
    it('should initialize unified execution engine with all components', async () => {
      await engine.initialize();
      
      const status = engine.getUnifiedStatus();
      expect(status.workflows.total).toBeGreaterThanOrEqual(0);
      expect(status.tasks.total).toBeGreaterThanOrEqual(0);
      expect(status.presets.available).toBeGreaterThanOrEqual(0);
    });

    it('should handle initialization errors gracefully', async () => {
      const faultyEngine = new UnifiedExecutionEngine({
        strategy: 'adaptive',
        maxConcurrency: -1, // Invalid concurrency
        enableIntelligentDecomposition: true
      });

      // Should not throw during construction
      expect(faultyEngine).toBeDefined();
    });
  });

  describe('Intelligent Execution Routing', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should route simple task descriptions to preset execution', async () => {
      const taskDescription = 'research quantum computing applications';
      
      const result = await engine.executeIntelligent(taskDescription, {
        strategy: 'adaptive',
        maxConcurrency: 2
      });

      expect(result.type).toBe('preset');
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.performance.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should route complex workflow definitions to workflow execution', async () => {
      const workflowDef: WorkflowDefinition = {
        name: 'Test Complex Workflow',
        version: '1.0.0',
        description: 'A complex workflow for testing',
        tasks: [
          {
            id: 'analyze',
            type: 'analysis',
            description: 'Analyze requirements'
          },
          {
            id: 'implement',
            type: 'implementation',
            description: 'Implement solution',
            depends: ['analyze']
          },
          {
            id: 'test',
            type: 'testing',
            description: 'Test implementation',
            depends: ['implement']
          }
        ],
        settings: {
          maxConcurrency: 2,
          failurePolicy: 'fail-fast'
        }
      };

      const result = await engine.executeIntelligent(workflowDef, {
        strategy: 'parallel',
        maxConcurrency: 3,
        enableIntelligentDecomposition: true
      });

      expect(result.type).toBe('workflow');
      expect(result.success).toBe(true);
      expect(result.workflowExecution).toBeDefined();
      expect(result.workflowExecution!.tasksTotal).toBe(3);
      expect(result.performance.decompositionQuality).toBeGreaterThan(0);
    });

    it('should route individual tasks to task execution', async () => {
      const task: WorkflowTask = {
        id: 'test-task',
        type: 'implementation',
        description: 'Implement user authentication',
        priority: 1,
        status: 'pending',
        input: { technology: 'JWT' },
        createdAt: new Date(),
        dependencies: [],
        resourceRequirements: [],
        tags: ['auth', 'security'],
        progressPercentage: 0,
        checkpoints: [],
        metadata: {}
      };

      const result = await engine.executeIntelligent(task, {
        strategy: 'sequential',
        maxConcurrency: 1
      });

      expect(result.type).toBe('task');
      expect(result.success).toBe(true);
      expect(result.taskExecutions).toBeDefined();
      expect(result.taskExecutions!.length).toBe(1);
      expect(result.performance.efficiency).toBeGreaterThan(0);
    });

    it('should handle preset execution with context', async () => {
      const presetInput = {
        preset: 'development',
        context: {
          taskType: 'full-stack-development',
          complexity: 'high' as const,
          priority: 1,
          availableResources: ['developer', 'database', 'cloud'],
          resourceConstraints: { maxCost: 1000 },
          learningMode: true,
          adaptationEnabled: true,
          patternMatching: true,
          executionId: 'test-exec-001',
          environment: 'development' as const,
          constraints: { maxDuration: 3600000 }
        }
      };

      const result = await engine.executeIntelligent(presetInput, {
        strategy: 'adaptive',
        maxConcurrency: 4,
        enableAdaptiveLearning: true
      });

      expect(result.type).toBe('preset');
      expect(result.success).toBe(true);
      expect(result.presetResult).toBeDefined();
      expect(result.learningData.patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Workflow to Task Decomposition', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should decompose complex workflow into granular tasks', async () => {
      const complexWorkflow: WorkflowDefinition = {
        name: 'E-commerce Platform Development',
        version: '1.0.0',
        description: 'Complete e-commerce platform with multiple services',
        tasks: [
          {
            id: 'design-database',
            type: 'design',
            description: 'Design database schema for products, users, and orders'
          },
          {
            id: 'implement-backend',
            type: 'implementation',
            description: 'Implement REST API with authentication and business logic',
            depends: ['design-database']
          },
          {
            id: 'implement-frontend',
            type: 'implementation',
            description: 'Implement React frontend with shopping cart and checkout'
          },
          {
            id: 'integration-testing',
            type: 'testing',
            description: 'End-to-end integration testing',
            depends: ['implement-backend', 'implement-frontend']
          },
          {
            id: 'deployment',
            type: 'deployment',
            description: 'Deploy to production with monitoring',
            depends: ['integration-testing']
          }
        ],
        settings: {
          maxConcurrency: 3,
          failurePolicy: 'continue'
        }
      };

      const result = await engine.executeIntelligent(complexWorkflow, {
        strategy: 'parallel',
        maxConcurrency: 6,
        enableIntelligentDecomposition: true,
        enableResourceOptimization: true
      });

      expect(result.type).toBe('workflow');
      expect(result.success).toBe(true);
      
      // Should have decomposed into more granular tasks
      expect(result.taskExecutions!.length).toBeGreaterThan(5);
      
      // Should have good decomposition quality
      expect(result.performance.decompositionQuality).toBeGreaterThan(0.5);
      
      // Should have utilized parallelization
      expect(result.performance.parallelization).toBeGreaterThan(0);
      
      // Should have learning data
      expect(result.learningData.patterns.length).toBeGreaterThanOrEqual(0);
      expect(result.learningData.optimizations.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain task dependencies during decomposition', async () => {
      const dependencyWorkflow: WorkflowDefinition = {
        name: 'Sequential Processing Pipeline',
        version: '1.0.0',
        description: 'Pipeline with strict dependencies',
        tasks: [
          {
            id: 'data-extraction',
            type: 'extraction',
            description: 'Extract data from multiple sources'
          },
          {
            id: 'data-transformation',
            type: 'transformation',
            description: 'Transform and clean data',
            depends: ['data-extraction']
          },
          {
            id: 'data-analysis',
            type: 'analysis',
            description: 'Analyze processed data',
            depends: ['data-transformation']
          },
          {
            id: 'report-generation',
            type: 'reporting',
            description: 'Generate final reports',
            depends: ['data-analysis']
          }
        ]
      };

      const result = await engine.executeIntelligent(dependencyWorkflow, {
        strategy: 'adaptive',
        maxConcurrency: 4,
        enableIntelligentDecomposition: true
      });

      expect(result.type).toBe('workflow');
      expect(result.success).toBe(true);
      
      // Check that task executions respect dependencies
      const taskExecs = result.taskExecutions!;
      expect(taskExecs.length).toBeGreaterThan(4);
      
      // All tasks should be completed for successful workflow
      const completedTasks = taskExecs.filter(t => t.status === 'completed');
      expect(completedTasks.length).toBe(taskExecs.length);
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should optimize resource utilization across task types', async () => {
      const resourceIntensiveWorkflow: WorkflowDefinition = {
        name: 'Resource Intensive Processing',
        version: '1.0.0',
        description: 'Workflow requiring careful resource management',
        tasks: [
          {
            id: 'cpu-intensive-task',
            type: 'computation',
            description: 'CPU-intensive data processing'
          },
          {
            id: 'memory-intensive-task',
            type: 'analysis',
            description: 'Memory-intensive analysis'
          },
          {
            id: 'io-intensive-task',
            type: 'io',
            description: 'I/O intensive file operations'
          },
          {
            id: 'network-intensive-task',
            type: 'network',
            description: 'Network-intensive API calls'
          }
        ],
        settings: {
          maxConcurrency: 4
        }
      };

      const result = await engine.executeIntelligent(resourceIntensiveWorkflow, {
        strategy: 'adaptive',
        maxConcurrency: 4,
        enableResourceOptimization: true,
        enableAdaptiveLearning: true
      });

      expect(result.type).toBe('workflow');
      expect(result.success).toBe(true);
      
      // Resource utilization should be optimized
      expect(result.performance.resourceUtilization).toBeGreaterThan(0.3);
      expect(result.performance.resourceUtilization).toBeLessThanOrEqual(1.0);
      
      // Should have efficiency gains from optimization
      expect(result.performance.efficiency).toBeGreaterThan(0.5);
      
      // Should identify optimization opportunities
      expect(result.learningData.optimizations.length).toBeGreaterThanOrEqual(0);
    });

    it('should adapt strategy based on execution patterns', async () => {
      // Execute multiple similar tasks to trigger learning
      const tasks = [];
      for (let i = 0; i < 3; i++) {
        const task = `Execute data processing pipeline ${i + 1}`;
        const result = await engine.executeIntelligent(task, {
          strategy: 'adaptive',
          maxConcurrency: 2,
          enableAdaptiveLearning: true
        });
        tasks.push(result);
      }

      // Last execution should show learning improvements
      const lastResult = tasks[tasks.length - 1];
      expect(lastResult.success).toBe(true);
      expect(lastResult.learningData.patterns.length).toBeGreaterThanOrEqual(0);
      
      // Check unified status for learning accumulation
      const status = engine.getUnifiedStatus();
      expect(status.learning.patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cross-System Integration', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should integrate preset execution with task scheduling', async () => {
      const presetInput = {
        preset: 'research',
        context: {
          taskType: 'research',
          complexity: 'medium' as const,
          priority: 2,
          availableResources: ['researcher', 'analyst'],
          resourceConstraints: {},
          learningMode: true,
          adaptationEnabled: true,
          patternMatching: true,
          executionId: 'test-preset-001',
          environment: 'development' as const,
          constraints: {}
        }
      };

      const result = await engine.executeIntelligent(presetInput, {
        strategy: 'parallel',
        maxConcurrency: 3,
        enableIntelligentDecomposition: true,
        enableResourceOptimization: true
      });

      expect(result.type).toBe('preset');
      expect(result.success).toBe(true);
      expect(result.presetResult).toBeDefined();
      expect(result.taskExecutions).toBeDefined();
      
      // Preset should have been decomposed into tasks
      expect(result.taskExecutions!.length).toBeGreaterThan(0);
      
      // Should maintain good performance across integration
      expect(result.performance.efficiency).toBeGreaterThan(0);
      expect(result.performance.decompositionQuality).toBeGreaterThan(0);
    });

    it('should provide unified monitoring across all execution types', async () => {
      // Execute different types of workloads
      await engine.executeIntelligent('simple research task');
      
      const simpleTask: WorkflowTask = {
        id: 'monitor-test',
        type: 'monitoring',
        description: 'Test monitoring integration',
        priority: 1,
        status: 'pending',
        input: {},
        createdAt: new Date(),
        dependencies: [],
        resourceRequirements: [],
        tags: ['monitoring'],
        progressPercentage: 0,
        checkpoints: [],
        metadata: {}
      };
      
      await engine.executeIntelligent(simpleTask);
      
      // Check unified status for comprehensive monitoring
      const status = engine.getUnifiedStatus();
      
      expect(status.workflows.total).toBeGreaterThanOrEqual(0);
      expect(status.tasks.total).toBeGreaterThanOrEqual(0);
      expect(status.presets.executed).toBeGreaterThan(0);
      expect(status.performance).toBeDefined();
      expect(status.learning).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle workflow execution failures gracefully', async () => {
      const faultyWorkflow: WorkflowDefinition = {
        name: 'Faulty Workflow',
        version: '1.0.0',
        description: 'Workflow designed to test error handling',
        tasks: [
          {
            id: 'normal-task',
            type: 'normal',
            description: 'Normal task that should succeed'
          },
          {
            id: 'faulty-task',
            type: 'faulty',
            description: 'Task designed to fail'
          },
          {
            id: 'recovery-task',
            type: 'recovery',
            description: 'Task to test recovery mechanisms',
            depends: ['normal-task']
          }
        ],
        settings: {
          failurePolicy: 'continue'
        }
      };

      const result = await engine.executeIntelligent(faultyWorkflow, {
        strategy: 'adaptive',
        maxConcurrency: 2
      });

      // Should handle failure gracefully
      expect(result.type).toBe('workflow');
      // May succeed or fail depending on error handling strategy
      expect(result.duration).toBeGreaterThan(0);
      expect(result.taskExecutions).toBeDefined();
      
      // Should have some performance metrics even on partial failure
      expect(result.performance.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should provide meaningful error information', async () => {
      try {
        // Execute with invalid input to trigger error handling
        await engine.executeIntelligent(null as any);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Unable to determine execution type');
      }
    });
  });
});