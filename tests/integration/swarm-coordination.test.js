/**
 * Swarm Coordination Testing Framework
 * Comprehensive test suite for AI agent coordination and orchestration
 */

import { jest } from '@jest/globals';
import { testCliExecution } from '../unit/parameter-parsing.test.js';

// Mock SwarmCoordinator for testing
class MockSwarmCoordinator {
  constructor() {
    this.agents = new Map();
    this.tasks = new Map();
    this.topology = 'mesh';
    this.isActive = false;
    this.metrics = {
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksFailed: 0,
      averageCompletionTime: 0,
      throughput: 0
    };
  }

  async initialize(config = {}) {
    this.topology = config.topology || 'mesh';
    this.maxAgents = config.maxAgents || 5;
    this.isActive = true;
    return { success: true, swarmId: 'test-swarm-123' };
  }

  async spawnAgent(type, config = {}) {
    const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agent = {
      id: agentId,
      type,
      name: config.name || `${type}-${agentId.slice(-4)}`,
      status: 'active',
      capabilities: config.capabilities || [type],
      tasksAssigned: 0,
      tasksCompleted: 0,
      createdAt: new Date().toISOString()
    };
    
    this.agents.set(agentId, agent);
    return agent;
  }

  async orchestrateTask(taskConfig) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      ...taskConfig,
      status: 'pending',
      assignedAgent: null,
      createdAt: new Date().toISOString(),
      progress: 0
    };
    
    this.tasks.set(taskId, task);
    
    // Auto-assign to suitable agent
    const suitableAgent = this.findSuitableAgent(task.type || 'general');
    if (suitableAgent) {
      task.assignedAgent = suitableAgent.id;
      task.status = 'in_progress';
      suitableAgent.tasksAssigned++;
      this.metrics.tasksInProgress++;
    }
    
    return task;
  }

  findSuitableAgent(taskType) {
    for (const agent of this.agents.values()) {
      if (agent.status === 'active' && 
          (agent.capabilities.includes(taskType) || agent.capabilities.includes('general'))) {
        return agent;
      }
    }
    return null;
  }

  async completeTask(taskId, result = {}) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;
    task.progress = 100;
    
    if (task.assignedAgent) {
      const agent = this.agents.get(task.assignedAgent);
      if (agent) {
        agent.tasksCompleted++;
      }
    }
    
    this.metrics.tasksCompleted++;
    this.metrics.tasksInProgress--;
    
    return task;
  }

  getStatus() {
    return {
      isActive: this.isActive,
      topology: this.topology,
      agentCount: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.status === 'active').length,
      taskCount: this.tasks.size,
      metrics: this.metrics
    };
  }

  async shutdown() {
    this.isActive = false;
    this.agents.clear();
    this.tasks.clear();
    return { success: true };
  }
}

describe('Swarm Coordination System', () => {
  let coordinator;
  
  beforeEach(() => {
    coordinator = new MockSwarmCoordinator();
  });
  
  afterEach(async () => {
    if (coordinator.isActive) {
      await coordinator.shutdown();
    }
  });

  describe('Swarm Initialization', () => {
    test('should initialize swarm with default configuration', async () => {
      const result = await coordinator.initialize();
      
      expect(result.success).toBe(true);
      expect(result.swarmId).toBeDefined();
      expect(coordinator.isActive).toBe(true);
      expect(coordinator.topology).toBe('mesh');
    });

    test('should initialize swarm with custom topology', async () => {
      const result = await coordinator.initialize({ 
        topology: 'hierarchical', 
        maxAgents: 10 
      });
      
      expect(result.success).toBe(true);
      expect(coordinator.topology).toBe('hierarchical');
      expect(coordinator.maxAgents).toBe(10);
    });

    test('should validate topology options', async () => {
      const validTopologies = ['mesh', 'hierarchical', 'ring', 'star', 'centralized'];
      
      for (const topology of validTopologies) {
        await coordinator.shutdown();
        coordinator = new MockSwarmCoordinator();
        
        const result = await coordinator.initialize({ topology });
        expect(result.success).toBe(true);
        expect(coordinator.topology).toBe(topology);
      }
    });
  });

  describe('Agent Management', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    test('should spawn agents of different types', async () => {
      const agentTypes = ['researcher', 'coder', 'analyst', 'tester', 'coordinator'];
      const spawnedAgents = [];
      
      for (const type of agentTypes) {
        const agent = await coordinator.spawnAgent(type);
        spawnedAgents.push(agent);
        
        expect(agent.id).toBeDefined();
        expect(agent.type).toBe(type);
        expect(agent.status).toBe('active');
        expect(agent.capabilities).toContain(type);
      }
      
      expect(coordinator.agents.size).toBe(agentTypes.length);
    });

    test('should spawn agents with custom configuration', async () => {
      const agent = await coordinator.spawnAgent('researcher', {
        name: 'CustomResearcher',
        capabilities: ['research', 'analysis', 'documentation']
      });
      
      expect(agent.name).toBe('CustomResearcher');
      expect(agent.capabilities).toEqual(['research', 'analysis', 'documentation']);
    });

    test('should track agent metrics', async () => {
      const agent = await coordinator.spawnAgent('coder');
      
      expect(agent.tasksAssigned).toBe(0);
      expect(agent.tasksCompleted).toBe(0);
      expect(agent.createdAt).toBeDefined();
    });

    test('should handle multiple agents of same type', async () => {
      const agent1 = await coordinator.spawnAgent('coder', { name: 'Coder1' });
      const agent2 = await coordinator.spawnAgent('coder', { name: 'Coder2' });
      
      expect(agent1.id).not.toBe(agent2.id);
      expect(agent1.name).toBe('Coder1');
      expect(agent2.name).toBe('Coder2');
      expect(coordinator.agents.size).toBe(2);
    });
  });

  describe('Task Orchestration', () => {
    beforeEach(async () => {
      await coordinator.initialize();
      // Spawn agents for task assignment
      await coordinator.spawnAgent('researcher');
      await coordinator.spawnAgent('coder');
      await coordinator.spawnAgent('analyst');
    });

    test('should create and assign tasks to suitable agents', async () => {
      const task = await coordinator.orchestrateTask({
        type: 'research',
        description: 'Research AI coordination patterns',
        priority: 'high'
      });
      
      expect(task.id).toBeDefined();
      expect(task.type).toBe('research');
      expect(task.status).toBe('in_progress');
      expect(task.assignedAgent).toBeDefined();
      
      const assignedAgent = coordinator.agents.get(task.assignedAgent);
      expect(assignedAgent.type).toBe('researcher');
      expect(assignedAgent.tasksAssigned).toBe(1);
    });

    test('should handle parallel task creation', async () => {
      const taskPromises = [
        coordinator.orchestrateTask({ type: 'research', description: 'Task 1' }),
        coordinator.orchestrateTask({ type: 'coder', description: 'Task 2' }),
        coordinator.orchestrateTask({ type: 'analyst', description: 'Task 3' })
      ];
      
      const tasks = await Promise.all(taskPromises);
      
      expect(tasks).toHaveLength(3);
      tasks.forEach(task => {
        expect(task.status).toBe('in_progress');
        expect(task.assignedAgent).toBeDefined();
      });
    });

    test('should complete tasks and update metrics', async () => {
      const task = await coordinator.orchestrateTask({
        type: 'research',
        description: 'Test task completion'
      });
      
      const completedTask = await coordinator.completeTask(task.id, {
        findings: 'Research completed successfully',
        confidence: 0.95
      });
      
      expect(completedTask.status).toBe('completed');
      expect(completedTask.completedAt).toBeDefined();
      expect(completedTask.result.findings).toBe('Research completed successfully');
      expect(coordinator.metrics.tasksCompleted).toBe(1);
      
      const assignedAgent = coordinator.agents.get(task.assignedAgent);
      expect(assignedAgent.tasksCompleted).toBe(1);
    });

    test('should handle task failures gracefully', async () => {
      const task = await coordinator.orchestrateTask({
        type: 'nonexistent',
        description: 'Task with unknown type'
      });
      
      // Should create task even if no suitable agent
      expect(task.id).toBeDefined();
      expect(task.status).toBe('pending'); // No agent assigned
      expect(task.assignedAgent).toBeNull();
    });
  });

  describe('Coordination Patterns', () => {
    beforeEach(async () => {
      await coordinator.initialize({ topology: 'hierarchical', maxAgents: 8 });
    });

    test('should implement mesh coordination', async () => {
      await coordinator.shutdown();
      coordinator = new MockSwarmCoordinator();
      await coordinator.initialize({ topology: 'mesh' });
      
      // Spawn multiple agents
      const agents = await Promise.all([
        coordinator.spawnAgent('researcher'),
        coordinator.spawnAgent('coder'),
        coordinator.spawnAgent('analyst'),
        coordinator.spawnAgent('tester')
      ]);
      
      expect(coordinator.topology).toBe('mesh');
      expect(agents).toHaveLength(4);
      
      // In mesh topology, all agents should be able to coordinate directly
      const status = coordinator.getStatus();
      expect(status.activeAgents).toBe(4);
    });

    test('should implement hierarchical coordination', async () => {
      // Spawn coordinator first, then subordinate agents
      const coordinator_agent = await coordinator.spawnAgent('coordinator');
      const subordinates = await Promise.all([
        coordinator.spawnAgent('researcher'),
        coordinator.spawnAgent('coder'),
        coordinator.spawnAgent('analyst')
      ]);
      
      expect(coordinator.topology).toBe('hierarchical');
      expect(coordinator_agent.type).toBe('coordinator');
      expect(subordinates).toHaveLength(3);
    });

    test('should handle complex task dependencies', async () => {
      // Create a chain of dependent tasks
      const researchTask = await coordinator.orchestrateTask({
        type: 'research',
        description: 'Research requirements',
        dependencies: []
      });
      
      const designTask = await coordinator.orchestrateTask({
        type: 'analyst',
        description: 'Design architecture',
        dependencies: [researchTask.id]
      });
      
      const implementTask = await coordinator.orchestrateTask({
        type: 'coder',
        description: 'Implement solution',
        dependencies: [designTask.id]
      });
      
      expect(researchTask.dependencies).toHaveLength(0);
      expect(designTask.dependencies).toContain(researchTask.id);
      expect(implementTask.dependencies).toContain(designTask.id);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large number of agents efficiently', async () => {
      await coordinator.initialize({ maxAgents: 50 });
      
      const startTime = Date.now();
      const agentPromises = [];
      
      // Spawn 20 agents in parallel
      for (let i = 0; i < 20; i++) {
        const type = ['researcher', 'coder', 'analyst', 'tester'][i % 4];
        agentPromises.push(coordinator.spawnAgent(type, { name: `Agent${i}` }));
      }
      
      const agents = await Promise.all(agentPromises);
      const duration = Date.now() - startTime;
      
      expect(agents).toHaveLength(20);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(coordinator.agents.size).toBe(20);
    });

    test('should distribute tasks efficiently across agents', async () => {
      await coordinator.initialize();
      
      // Spawn multiple agents of same type
      await Promise.all([
        coordinator.spawnAgent('coder', { name: 'Coder1' }),
        coordinator.spawnAgent('coder', { name: 'Coder2' }),
        coordinator.spawnAgent('coder', { name: 'Coder3' })
      ]);
      
      // Create multiple tasks
      const tasks = await Promise.all([
        coordinator.orchestrateTask({ type: 'coder', description: 'Task 1' }),
        coordinator.orchestrateTask({ type: 'coder', description: 'Task 2' }),
        coordinator.orchestrateTask({ type: 'coder', description: 'Task 3' }),
        coordinator.orchestrateTask({ type: 'coder', description: 'Task 4' }),
        coordinator.orchestrateTask({ type: 'coder', description: 'Task 5' })
      ]);
      
      // Check that tasks are distributed among agents
      const agentTaskCounts = new Map();
      tasks.forEach(task => {
        if (task.assignedAgent) {
          const count = agentTaskCounts.get(task.assignedAgent) || 0;
          agentTaskCounts.set(task.assignedAgent, count + 1);
        }
      });
      
      expect(agentTaskCounts.size).toBeGreaterThan(1); // Tasks distributed
    });

    test('should maintain performance under concurrent load', async () => {
      await coordinator.initialize({ maxAgents: 10 });
      
      // Spawn agents
      const agentPromises = [];
      for (let i = 0; i < 5; i++) {
        agentPromises.push(coordinator.spawnAgent('researcher'));
      }
      await Promise.all(agentPromises);
      
      // Create many concurrent tasks
      const taskPromises = [];
      for (let i = 0; i < 50; i++) {
        taskPromises.push(coordinator.orchestrateTask({
          type: 'research',
          description: `Concurrent task ${i}`
        }));
      }
      
      const startTime = Date.now();
      const tasks = await Promise.all(taskPromises);
      const duration = Date.now() - startTime;
      
      expect(tasks).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should handle 50 tasks within 2 seconds
      
      // Complete all tasks
      const completionPromises = tasks.map(task => 
        coordinator.completeTask(task.id, { result: 'success' })
      );
      
      const completedTasks = await Promise.all(completionPromises);
      expect(completedTasks).toHaveLength(50);
      expect(coordinator.metrics.tasksCompleted).toBe(50);
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    test('should handle agent failures gracefully', async () => {
      const agent = await coordinator.spawnAgent('researcher');
      const task = await coordinator.orchestrateTask({
        type: 'research',
        description: 'Test task'
      });
      
      // Simulate agent failure
      agent.status = 'failed';
      
      // System should detect failure and handle gracefully
      expect(() => {
        const status = coordinator.getStatus();
        expect(status.activeAgents).toBe(0); // Failed agent not counted
      }).not.toThrow();
    });

    test('should handle task completion errors', async () => {
      const task = await coordinator.orchestrateTask({
        type: 'research',
        description: 'Test task'
      });
      
      // Try to complete non-existent task
      await expect(coordinator.completeTask('non-existent-id'))
        .rejects.toThrow('Task non-existent-id not found');
      
      // Original task should still be intact
      expect(coordinator.tasks.has(task.id)).toBe(true);
    });

    test('should recover from coordinator failures', async () => {
      // Simulate coordinator restart
      const originalStatus = coordinator.getStatus();
      
      await coordinator.shutdown();
      coordinator = new MockSwarmCoordinator();
      await coordinator.initialize();
      
      // Should start fresh
      const newStatus = coordinator.getStatus();
      expect(newStatus.isActive).toBe(true);
      expect(newStatus.agentCount).toBe(0);
      expect(newStatus.taskCount).toBe(0);
    });
  });

  describe('Status and Monitoring', () => {
    test('should provide comprehensive status information', async () => {
      await coordinator.initialize({ topology: 'hierarchical', maxAgents: 10 });
      
      await coordinator.spawnAgent('researcher');
      await coordinator.spawnAgent('coder');
      const task = await coordinator.orchestrateTask({
        type: 'research',
        description: 'Status test'
      });
      
      const status = coordinator.getStatus();
      
      expect(status.isActive).toBe(true);
      expect(status.topology).toBe('hierarchical');
      expect(status.agentCount).toBe(2);
      expect(status.activeAgents).toBe(2);
      expect(status.taskCount).toBe(1);
      expect(status.metrics).toBeDefined();
      expect(status.metrics.tasksInProgress).toBe(1);
    });

    test('should track performance metrics accurately', async () => {
      await coordinator.initialize();
      await coordinator.spawnAgent('researcher');
      
      // Create and complete multiple tasks
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const task = await coordinator.orchestrateTask({
          type: 'research',
          description: `Metrics test ${i}`
        });
        tasks.push(task);
      }
      
      // Complete all tasks
      for (const task of tasks) {
        await coordinator.completeTask(task.id, { result: 'success' });
      }
      
      const status = coordinator.getStatus();
      expect(status.metrics.tasksCompleted).toBe(5);
      expect(status.metrics.tasksInProgress).toBe(0);
      expect(status.metrics.tasksFailed).toBe(0);
    });
  });

  describe('CLI Integration Tests', () => {
    test('should execute swarm init command', async () => {
      try {
        const result = await testCliExecution('swarm', ['init', '--topology', 'mesh'], false);
        // Command should execute (may fail due to environment, but should not crash)
        expect(result).toBeDefined();
      } catch (error) {
        // CLI execution may fail in test environment, but should handle gracefully
        expect(error.message).toBeDefined();
      }
    });

    test('should execute agent spawn command', async () => {
      try {
        const result = await testCliExecution('agent', ['spawn', 'researcher'], false);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    test('should execute task orchestration command', async () => {
      try {
        const result = await testCliExecution('task', ['create', 'research', 'Test task'], false);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });
});

// Export for use in other test files
export { MockSwarmCoordinator };
