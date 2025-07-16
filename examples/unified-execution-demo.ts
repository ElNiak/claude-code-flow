#!/usr/bin/env node

/**
 * Unified Execution Engine Demonstration
 * Shows the merger of TaskEngine + WorkflowEngine capabilities
 */

import { UnifiedExecutionEngine, type UnifiedExecutionOptions } from '../src/unified/execution/unified-execution-engine.js';
import { WorkflowDefinition } from '../src/cli/commands/workflow.js';
import { WorkflowTask } from '../src/task/engine.js';

async function demonstrateUnifiedExecution() {
  console.log('🚀 Unified Execution Engine Demonstration');
  console.log('═'.repeat(60));

  // Initialize the unified engine
  const options: Partial<UnifiedExecutionOptions> = {
    strategy: 'adaptive',
    maxConcurrency: 6,
    enableIntelligentDecomposition: true,
    enableResourceOptimization: true,
    enableAdaptiveLearning: true,
    coordinationConfig: {
      topology: 'mesh',
      communicationProtocol: 'event-driven'
    },
    debug: true
  };

  const engine = new UnifiedExecutionEngine(options);
  await engine.initialize();

  console.log('✓ Unified execution engine initialized\n');

  // Demo 1: Simple string input (routes to preset execution)
  console.log('📋 Demo 1: Simple Task Description → Preset Execution');
  console.log('─'.repeat(50));
  
  const taskDescription = 'Research neural network architectures for computer vision';
  const result1 = await engine.executeIntelligent(taskDescription, {
    strategy: 'adaptive',
    maxConcurrency: 3,
    enableAdaptiveLearning: true
  });

  console.log(`Result: ${result1.type} execution`);
  console.log(`Success: ${result1.success}`);
  console.log(`Duration: ${result1.duration}ms`);
  console.log(`Efficiency: ${(result1.performance.efficiency * 100).toFixed(1)}%`);
  console.log('');

  // Demo 2: Complex workflow (routes to workflow execution with task decomposition)
  console.log('📋 Demo 2: Complex Workflow → Workflow + Task Decomposition');
  console.log('─'.repeat(50));

  const complexWorkflow: WorkflowDefinition = {
    name: 'Full-Stack Application Development',
    version: '1.0.0',
    description: 'Complete development workflow for a full-stack application',
    tasks: [
      {
        id: 'requirements-analysis',
        type: 'analysis',
        description: 'Analyze and document requirements'
      },
      {
        id: 'system-design',
        type: 'design',
        description: 'Design system architecture and database schema',
        depends: ['requirements-analysis']
      },
      {
        id: 'backend-development',
        type: 'implementation',
        description: 'Implement REST API with authentication and business logic',
        depends: ['system-design']
      },
      {
        id: 'frontend-development',
        type: 'implementation',
        description: 'Implement React frontend with responsive design',
        depends: ['system-design']
      },
      {
        id: 'integration-testing',
        type: 'testing',
        description: 'End-to-end integration testing',
        depends: ['backend-development', 'frontend-development']
      },
      {
        id: 'deployment',
        type: 'deployment',
        description: 'Deploy to production with CI/CD pipeline',
        depends: ['integration-testing']
      }
    ],
    settings: {
      maxConcurrency: 4,
      failurePolicy: 'continue'
    }
  };

  const result2 = await engine.executeIntelligent(complexWorkflow, {
    strategy: 'parallel',
    maxConcurrency: 6,
    enableIntelligentDecomposition: true,
    enableResourceOptimization: true
  });

  console.log(`Result: ${result2.type} execution`);
  console.log(`Success: ${result2.success}`);
  console.log(`Duration: ${result2.duration}ms`);
  console.log(`Tasks Total: ${result2.workflowExecution?.tasksTotal || 0}`);
  console.log(`Tasks Completed: ${result2.workflowExecution?.tasksCompleted || 0}`);
  console.log(`Decomposed Tasks: ${result2.taskExecutions?.length || 0}`);
  console.log(`Decomposition Quality: ${(result2.performance.decompositionQuality * 100).toFixed(1)}%`);
  console.log(`Parallelization: ${(result2.performance.parallelization * 100).toFixed(1)}%`);
  console.log('');

  // Demo 3: Individual task (routes to task execution)
  console.log('📋 Demo 3: Individual Task → Task Execution with Resource Management');
  console.log('─'.repeat(50));

  const individualTask: WorkflowTask = {
    id: 'user-authentication-implementation',
    type: 'security-implementation',
    description: 'Implement secure user authentication with JWT tokens and refresh mechanism',
    priority: 1,
    status: 'pending',
    input: {
      technology: 'JWT',
      features: ['login', 'logout', 'refresh-token', 'password-reset'],
      securityLevel: 'high'
    },
    createdAt: new Date(),
    dependencies: [],
    resourceRequirements: [
      {
        resourceId: 'security-specialist',
        type: 'agent',
        amount: 1,
        unit: 'developer',
        exclusive: false,
        priority: 1
      },
      {
        resourceId: 'database-access',
        type: 'disk',
        amount: 100,
        unit: 'MB',
        exclusive: false
      }
    ],
    tags: ['authentication', 'security', 'jwt', 'backend'],
    progressPercentage: 0,
    checkpoints: [],
    metadata: {
      estimatedComplexity: 'high',
      securityReviewRequired: true,
      testingRequired: true
    }
  };

  const result3 = await engine.executeIntelligent(individualTask, {
    strategy: 'sequential',
    maxConcurrency: 2,
    enableResourceOptimization: true
  });

  console.log(`Result: ${result3.type} execution`);
  console.log(`Success: ${result3.success}`);
  console.log(`Duration: ${result3.duration}ms`);
  console.log(`Task Executions: ${result3.taskExecutions?.length || 0}`);
  console.log(`Resource Utilization: ${(result3.performance.resourceUtilization * 100).toFixed(1)}%`);
  console.log(`Efficiency: ${(result3.performance.efficiency * 100).toFixed(1)}%`);
  console.log('');

  // Demo 4: Preset with context (routes to preset execution with intelligence)
  console.log('📋 Demo 4: Preset with Context → Enhanced Preset Execution');
  console.log('─'.repeat(50));

  const presetInput = {
    preset: 'development',
    context: {
      taskType: 'microservices-development',
      complexity: 'high' as const,
      priority: 1,
      availableResources: ['senior-developer', 'devops-engineer', 'database', 'cloud-services'],
      resourceConstraints: {
        maxCost: 5000,
        maxDevelopers: 3,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
      },
      learningMode: true,
      adaptationEnabled: true,
      patternMatching: true,
      executionId: 'demo-preset-execution',
      environment: 'development' as const,
      constraints: {
        maxDuration: 2 * 60 * 60 * 1000, // 2 hours
        maxCost: 1000
      }
    }
  };

  const result4 = await engine.executeIntelligent(presetInput, {
    strategy: 'adaptive',
    maxConcurrency: 4,
    enableAdaptiveLearning: true,
    enableResourceOptimization: true
  });

  console.log(`Result: ${result4.type} execution`);
  console.log(`Success: ${result4.success}`);
  console.log(`Duration: ${result4.duration}ms`);
  console.log(`Preset Steps: ${result4.presetResult?.steps.length || 0}`);
  console.log(`Converted Tasks: ${result4.taskExecutions?.length || 0}`);
  console.log(`Adaptations Applied: ${result4.presetResult?.adaptations.join(', ') || 'None'}`);
  console.log(`Learning Patterns: ${result4.learningData.patterns.join(', ') || 'None'}`);
  console.log('');

  // Demo 5: System status and learning analytics
  console.log('📋 Demo 5: System Status and Learning Analytics');
  console.log('─'.repeat(50));

  const status = engine.getUnifiedStatus();
  
  console.log('System Status:');
  console.log(`├── Workflows: ${status.workflows.total} total, ${status.workflows.active} active`);
  console.log(`├── Tasks: ${status.tasks.total} total, ${status.tasks.running} running, ${status.tasks.completed} completed`);
  console.log(`├── Presets: ${status.presets.available} available, ${status.presets.executed} executed`);
  console.log(`└── Performance:`);
  console.log(`    ├── Efficiency: ${(status.performance.efficiency * 100).toFixed(1)}%`);
  console.log(`    ├── Resource Utilization: ${(status.performance.resourceUtilization * 100).toFixed(1)}%`);
  console.log(`    ├── Parallelization: ${(status.performance.parallelization * 100).toFixed(1)}%`);
  console.log(`    ├── Total Executions: ${status.performance.totalExecutions}`);
  console.log(`    └── Success Rate: ${(status.performance.successRate * 100).toFixed(1)}%`);
  
  console.log('\nLearning Data:');
  console.log(`├── Patterns Identified: ${status.learning.patterns.length}`);
  console.log(`├── Optimizations Found: ${status.learning.optimizations.length}`);
  console.log(`└── Recommendations: ${status.learning.recommendations.length}`);

  if (status.learning.patterns.length > 0) {
    console.log('\nTop Patterns:');
    status.learning.patterns.slice(0, 3).forEach((pattern: string, index: number) => {
      console.log(`  ${index + 1}. ${pattern}`);
    });
  }

  if (status.learning.optimizations.length > 0) {
    console.log('\nOptimization Opportunities:');
    status.learning.optimizations.slice(0, 3).forEach((opt: string, index: number) => {
      console.log(`  ${index + 1}. ${opt}`);
    });
  }

  console.log('\n🎉 Unified Execution Engine Demonstration Complete!');
  console.log('═'.repeat(60));
  console.log('\nKey Benefits Demonstrated:');
  console.log('✓ Intelligent input routing (string → preset, workflow → workflow+tasks, task → task)');
  console.log('✓ Hierarchical execution (workflows decompose into tasks)');
  console.log('✓ Resource optimization across all execution types');
  console.log('✓ Adaptive learning from execution patterns');
  console.log('✓ Unified monitoring and performance metrics');
  console.log('✓ Cross-system integration and coordination');
  console.log('\nThe unified system successfully merges TaskEngine and WorkflowEngine');
  console.log('capabilities into a single, intelligent execution platform! 🚀');
}

// Run demonstration if called directly
if (import.meta.main) {
  demonstrateUnifiedExecution().catch(console.error);
}

export { demonstrateUnifiedExecution };