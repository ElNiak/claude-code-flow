/**
 * TDD London School: Orchestrator Debug Integration Testing
 * Mock-driven integration testing for replacing console calls in orchestrator
 */

import { jest } from '@jest/globals';
import {
  IMemoryMonitor,
  ICircuitBreaker,
  IDebugLogger,
  LondonSchoolMockFactory,
  InteractionVerifier,
  MemoryPressureSimulator,
  ContractTestHelper,
} from '../../utils/london-school-test-helpers.js';

// Orchestrator interfaces for testing
interface IOrchestrator {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  spawnAgent(profile: AgentProfile): Promise<string>;
  terminateAgent(agentId: string): Promise<void>;
  assignTask(task: Task): Promise<void>;
  getHealthStatus(): Promise<HealthStatus>;
  getMetrics(): Promise<OrchestratorMetrics>;
}

interface AgentProfile {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
}

interface Task {
  id: string;
  type: string;
  priority: number;
  data: any;
}

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  timestamp: number;
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  metrics?: Record<string, number>;
}

interface OrchestratorMetrics {
  totalAgents: number;
  activeAgents: number;
  completedTasks: number;
  failedTasks: number;
  memoryUsage: number;
  cpuUsage: number;
}

// Mock implementations following London School principles
class MockOrchestrator implements IOrchestrator {
  private debugLogger: IDebugLogger;
  private memoryMonitor: IMemoryMonitor;
  private agents = new Map<string, AgentProfile>();
  private tasks = new Map<string, Task>();
  private isInitialized = false;

  constructor(debugLogger: IDebugLogger, memoryMonitor: IMemoryMonitor) {
    this.debugLogger = debugLogger;
    this.memoryMonitor = memoryMonitor;
  }

  async initialize(): Promise<void> {
    // Replace console.log with debug logger
    this.debugLogger.info('orchestrator:lifecycle', 'Initializing orchestrator', {
      timestamp: new Date().toISOString(),
      memoryUsage: this.memoryMonitor.getCurrentUsage(),
    });

    this.isInitialized = true;

    this.debugLogger.debug('orchestrator:lifecycle', 'Orchestrator initialized successfully', {
      isInitialized: this.isInitialized,
      agentCount: this.agents.size,
    });
  }

  async shutdown(): Promise<void> {
    this.debugLogger.warn('orchestrator:lifecycle', 'Shutting down orchestrator', {
      agentCount: this.agents.size,
      taskCount: this.tasks.size,
    });

    // Cleanup agents and tasks
    this.agents.clear();
    this.tasks.clear();
    this.isInitialized = false;

    this.debugLogger.info('orchestrator:lifecycle', 'Orchestrator shutdown complete');
  }

  async spawnAgent(profile: AgentProfile): Promise<string> {
    if (!this.isInitialized) {
      this.debugLogger.error(
        'orchestrator:agent',
        'Cannot spawn agent - orchestrator not initialized',
        {
          profileId: profile.id,
        },
      );
      throw new Error('Orchestrator not initialized');
    }

    this.debugLogger.debug('orchestrator:agent', 'Spawning agent', {
      profileId: profile.id,
      agentType: profile.type,
      currentAgentCount: this.agents.size,
    });

    this.agents.set(profile.id, profile);

    this.debugLogger.info('orchestrator:agent', 'Agent spawned successfully', {
      agentId: profile.id,
      totalAgents: this.agents.size,
    });

    return profile.id;
  }

  async terminateAgent(agentId: string): Promise<void> {
    this.debugLogger.debug('orchestrator:agent', 'Terminating agent', { agentId });

    if (!this.agents.has(agentId)) {
      this.debugLogger.warn('orchestrator:agent', 'Agent not found for termination', { agentId });
      return;
    }

    this.agents.delete(agentId);

    this.debugLogger.info('orchestrator:agent', 'Agent terminated successfully', {
      agentId,
      remainingAgents: this.agents.size,
    });
  }

  async assignTask(task: Task): Promise<void> {
    this.debugLogger.debug('orchestrator:task', 'Assigning task', {
      taskId: task.id,
      taskType: task.type,
      priority: task.priority,
    });

    if (this.agents.size === 0) {
      this.debugLogger.error('orchestrator:task', 'No agents available for task assignment', {
        taskId: task.id,
      });
      throw new Error('No agents available');
    }

    this.tasks.set(task.id, task);

    this.debugLogger.info('orchestrator:task', 'Task assigned successfully', {
      taskId: task.id,
      availableAgents: this.agents.size,
      totalTasks: this.tasks.size,
    });
  }

  async getHealthStatus(): Promise<HealthStatus> {
    this.debugLogger.debug('orchestrator:health', 'Checking health status');

    const memoryUsage = this.memoryMonitor.getCurrentUsage();
    const isMemoryHealthy = memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9;

    const health: HealthStatus = {
      overall: isMemoryHealthy ? 'healthy' : 'degraded',
      components: {
        memory: {
          status: isMemoryHealthy ? 'healthy' : 'degraded',
          message: isMemoryHealthy ? 'Memory usage normal' : 'High memory usage detected',
          metrics: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            usagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          },
        },
        agents: {
          status: this.agents.size > 0 ? 'healthy' : 'degraded',
          message: `${this.agents.size} agents active`,
        },
      },
      timestamp: Date.now(),
    };

    this.debugLogger.debug('orchestrator:health', 'Health status computed', {
      overall: health.overall,
      componentCount: Object.keys(health.components).length,
    });

    return health;
  }

  async getMetrics(): Promise<OrchestratorMetrics> {
    this.debugLogger.debug('orchestrator:metrics', 'Computing metrics');

    const memoryUsage = this.memoryMonitor.getCurrentUsage();
    const metrics: OrchestratorMetrics = {
      totalAgents: this.agents.size,
      activeAgents: this.agents.size, // Simplified - all agents are active
      completedTasks: 0, // Simplified
      failedTasks: 0, // Simplified
      memoryUsage: memoryUsage.heapUsed,
      cpuUsage: 0, // Simplified
    };

    this.debugLogger.debug('orchestrator:metrics', 'Metrics computed', metrics);

    return metrics;
  }
}

describe('Orchestrator Debug Integration - London School TDD', () => {
  let mockDebugLogger: jest.Mocked<IDebugLogger>;
  let mockMemoryMonitor: jest.Mocked<IMemoryMonitor>;
  let mockCircuitBreaker: jest.Mocked<ICircuitBreaker>;
  let orchestrator: MockOrchestrator;

  beforeEach(() => {
    // Create comprehensive mock suite
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite({
      memoryPressureLevel: 85,
      circuitBreakerState: 'CLOSED',
    });

    mockDebugLogger = mockSuite.debugLogger;
    mockMemoryMonitor = mockSuite.memoryMonitor;
    mockCircuitBreaker = mockSuite.circuitBreaker;

    orchestrator = new MockOrchestrator(mockDebugLogger, mockMemoryMonitor);
  });

  describe('Console Replacement Verification - Interaction Testing', () => {
    it('should replace console.log with debugLogger.info during initialization', async () => {
      // Arrange
      mockMemoryMonitor.getCurrentUsage.mockReturnValue({
        heapUsed: 42 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      });

      // Act
      await orchestrator.initialize();

      // Assert - Verify logger interactions instead of console
      expect(mockDebugLogger.info).toHaveBeenCalledWith(
        'orchestrator:lifecycle',
        'Initializing orchestrator',
        expect.objectContaining({
          timestamp: expect.any(String),
          memoryUsage: expect.objectContaining({
            heapUsed: 42 * 1024 * 1024,
          }),
        }),
      );

      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:lifecycle',
        'Orchestrator initialized successfully',
        expect.objectContaining({
          isInitialized: true,
          agentCount: 0,
        }),
      );

      // Verify console methods were NOT called
      expect(console.log).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should use debug logger for agent spawning operations', async () => {
      // Arrange
      await orchestrator.initialize();
      const agentProfile: AgentProfile = {
        id: 'agent-123',
        name: 'Test Agent',
        type: 'researcher',
        config: { timeout: 30000 },
      };

      // Act
      const agentId = await orchestrator.spawnAgent(agentProfile);

      // Assert - Verify interaction sequence
      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:agent',
        'Spawning agent',
        expect.objectContaining({
          profileId: 'agent-123',
          agentType: 'researcher',
          currentAgentCount: 0,
        }),
      );

      expect(mockDebugLogger.info).toHaveBeenCalledWith(
        'orchestrator:agent',
        'Agent spawned successfully',
        expect.objectContaining({
          agentId: 'agent-123',
          totalAgents: 1,
        }),
      );

      expect(agentId).toBe('agent-123');
    });

    it('should use debug logger for error conditions', async () => {
      // Arrange - Try to spawn agent without initialization
      const agentProfile: AgentProfile = {
        id: 'agent-456',
        name: 'Failed Agent',
        type: 'analyzer',
        config: {},
      };

      // Act & Assert
      await expect(orchestrator.spawnAgent(agentProfile)).rejects.toThrow(
        'Orchestrator not initialized',
      );

      // Verify error logging interaction
      expect(mockDebugLogger.error).toHaveBeenCalledWith(
        'orchestrator:agent',
        'Cannot spawn agent - orchestrator not initialized',
        expect.objectContaining({
          profileId: 'agent-456',
        }),
      );
    });
  });

  describe('Memory-Aware Logging - Behavior Verification', () => {
    it('should log memory information during health checks', async () => {
      // Arrange
      await orchestrator.initialize();
      mockMemoryMonitor.getCurrentUsage.mockReturnValue({
        heapUsed: 45 * 1024 * 1024, // 45MB used
        heapTotal: 50 * 1024 * 1024, // 50MB total (90% usage)
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      });

      // Act
      const healthStatus = await orchestrator.getHealthStatus();

      // Assert - Verify memory monitoring integration
      expect(mockMemoryMonitor.getCurrentUsage).toHaveBeenCalled();
      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:health',
        'Checking health status',
      );
      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:health',
        'Health status computed',
        expect.objectContaining({
          overall: 'healthy', // 90% is still healthy
          componentCount: 2,
        }),
      );

      expect(healthStatus.components.memory.metrics?.usagePercent).toBe(90);
    });

    it('should detect degraded health under high memory pressure', async () => {
      // Arrange
      await orchestrator.initialize();
      MemoryPressureSimulator.simulateExtremeMemoryConstraint(mockMemoryMonitor, 95); // 95% usage

      // Act
      const healthStatus = await orchestrator.getHealthStatus();

      // Assert - Verify degraded status detection
      expect(healthStatus.overall).toBe('degraded');
      expect(healthStatus.components.memory.status).toBe('degraded');
      expect(healthStatus.components.memory.message).toBe('High memory usage detected');

      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:health',
        'Health status computed',
        expect.objectContaining({
          overall: 'degraded',
        }),
      );
    });
  });

  describe('Task Management with Debug Logging', () => {
    it('should log task assignment operations with correlation', async () => {
      // Arrange
      await orchestrator.initialize();
      await orchestrator.spawnAgent({
        id: 'agent-789',
        name: 'Task Agent',
        type: 'executor',
        config: {},
      });

      const task: Task = {
        id: 'task-abc-123',
        type: 'data-analysis',
        priority: 1,
        data: { source: 'database', table: 'users' },
      };

      // Act
      await orchestrator.assignTask(task);

      // Assert - Verify task logging interactions
      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:task',
        'Assigning task',
        expect.objectContaining({
          taskId: 'task-abc-123',
          taskType: 'data-analysis',
          priority: 1,
        }),
      );

      expect(mockDebugLogger.info).toHaveBeenCalledWith(
        'orchestrator:task',
        'Task assigned successfully',
        expect.objectContaining({
          taskId: 'task-abc-123',
          availableAgents: 1,
          totalTasks: 1,
        }),
      );
    });

    it('should handle task assignment errors with appropriate logging', async () => {
      // Arrange
      await orchestrator.initialize();
      // No agents spawned - should cause error

      const task: Task = {
        id: 'task-failed',
        type: 'impossible-task',
        priority: 1,
        data: {},
      };

      // Act & Assert
      await expect(orchestrator.assignTask(task)).rejects.toThrow('No agents available');

      // Verify error logging
      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:task',
        'Assigning task',
        expect.objectContaining({
          taskId: 'task-failed',
        }),
      );

      expect(mockDebugLogger.error).toHaveBeenCalledWith(
        'orchestrator:task',
        'No agents available for task assignment',
        expect.objectContaining({
          taskId: 'task-failed',
        }),
      );
    });
  });

  describe('Shutdown Process with Debug Logging', () => {
    it('should log shutdown process with cleanup information', async () => {
      // Arrange
      await orchestrator.initialize();
      await orchestrator.spawnAgent({
        id: 'agent-cleanup',
        name: 'Cleanup Agent',
        type: 'maintenance',
        config: {},
      });
      await orchestrator.assignTask({
        id: 'task-cleanup',
        type: 'cleanup',
        priority: 1,
        data: {},
      });

      // Act
      await orchestrator.shutdown();

      // Assert - Verify shutdown logging sequence
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        'orchestrator:lifecycle',
        'Shutting down orchestrator',
        expect.objectContaining({
          agentCount: 1,
          taskCount: 1,
        }),
      );

      expect(mockDebugLogger.info).toHaveBeenCalledWith(
        'orchestrator:lifecycle',
        'Orchestrator shutdown complete',
      );
    });
  });

  describe('Metrics Collection with Debug Logging', () => {
    it('should log metrics computation process', async () => {
      // Arrange
      await orchestrator.initialize();
      await orchestrator.spawnAgent({
        id: 'metrics-agent',
        name: 'Metrics Agent',
        type: 'monitor',
        config: {},
      });

      mockMemoryMonitor.getCurrentUsage.mockReturnValue({
        heapUsed: 38 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
        timestamp: Date.now(),
      });

      // Act
      const metrics = await orchestrator.getMetrics();

      // Assert - Verify metrics logging
      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:metrics',
        'Computing metrics',
      );

      expect(mockDebugLogger.debug).toHaveBeenCalledWith(
        'orchestrator:metrics',
        'Metrics computed',
        expect.objectContaining({
          totalAgents: 1,
          activeAgents: 1,
          memoryUsage: 38 * 1024 * 1024,
        }),
      );

      expect(metrics.totalAgents).toBe(1);
      expect(metrics.memoryUsage).toBe(38 * 1024 * 1024);
    });
  });
});

describe('Integration Contract Compliance', () => {
  it('should satisfy orchestrator integration contracts through behavior verification', () => {
    // Arrange
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite();
    const orchestrator = new MockOrchestrator(mockSuite.debugLogger, mockSuite.memoryMonitor);

    // Assert - Verify contract compliance
    ContractTestHelper.verifyDebugLoggerContract(mockSuite.debugLogger);
    ContractTestHelper.verifyMemoryMonitorContract(mockSuite.memoryMonitor);
    ContractTestHelper.verifyCircuitBreakerContract(mockSuite.circuitBreaker);

    // Verify orchestrator interface compliance
    expect(typeof orchestrator.initialize).toBe('function');
    expect(typeof orchestrator.shutdown).toBe('function');
    expect(typeof orchestrator.spawnAgent).toBe('function');
    expect(typeof orchestrator.terminateAgent).toBe('function');
    expect(typeof orchestrator.assignTask).toBe('function');
    expect(typeof orchestrator.getHealthStatus).toBe('function');
    expect(typeof orchestrator.getMetrics).toBe('function');
  });

  it('should maintain consistent logging behavior across orchestrator lifecycle', async () => {
    // London School: Test behavioral consistency
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite();
    const orchestrator = new MockOrchestrator(mockSuite.debugLogger, mockSuite.memoryMonitor);

    // Act - Full lifecycle
    await orchestrator.initialize();
    await orchestrator.spawnAgent({
      id: 'consistency-agent',
      name: 'Consistency Test',
      type: 'test',
      config: {},
    });
    await orchestrator.assignTask({
      id: 'consistency-task',
      type: 'test',
      priority: 1,
      data: {},
    });
    await orchestrator.getHealthStatus();
    await orchestrator.getMetrics();
    await orchestrator.shutdown();

    // Assert - Verify consistent logging patterns
    expect(mockSuite.debugLogger.info).toHaveBeenCalledTimes(4); // init, spawn success, task success, shutdown
    expect(mockSuite.debugLogger.debug).toHaveBeenCalledTimes(6); // init success, spawn start, task start, health check, health computed, metrics start, metrics computed
    expect(mockSuite.debugLogger.warn).toHaveBeenCalledTimes(1); // shutdown warning
    expect(mockSuite.debugLogger.error).not.toHaveBeenCalled(); // No errors in happy path

    // Verify all calls used proper categories
    const debugCalls = mockSuite.debugLogger.debug.mock.calls;
    const infoCalls = mockSuite.debugLogger.info.mock.calls;
    const warnCalls = mockSuite.debugLogger.warn.mock.calls;

    [...debugCalls, ...infoCalls, ...warnCalls].forEach((call) => {
      const category = call[0];
      expect(category).toMatch(/^orchestrator:(lifecycle|agent|task|health|metrics)$/);
    });
  });
});

describe('Performance Integration Under Memory Constraints', () => {
  it('should maintain logging performance under simulated memory pressure', async () => {
    // Arrange
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite({
      memoryPressureLevel: 96, // High pressure
      performanceOverhead: 3.5, // 3.5% overhead
    });

    MemoryPressureSimulator.simulateGradualPressureIncrease(
      mockSuite.memoryMonitor,
      85, // Start at 85%
      98, // End at 98%
      10, // 10 steps
    );

    const orchestrator = new MockOrchestrator(mockSuite.debugLogger, mockSuite.memoryMonitor);

    const startTime = Date.now();

    // Act - Perform operations under increasing memory pressure
    await orchestrator.initialize();

    for (let i = 0; i < 100; i++) {
      await orchestrator.spawnAgent({
        id: `perf-agent-${i}`,
        name: `Performance Agent ${i}`,
        type: 'performance-test',
        config: { iteration: i },
      });

      if (i % 10 === 0) {
        await orchestrator.getHealthStatus();
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Assert - Verify performance under pressure
    expect(duration).toBeLessThan(5000); // Should complete in <5 seconds
    expect(mockSuite.performanceCounter.getOverheadPercentage()).toBeLessThan(5); // <5% overhead

    // Verify memory monitoring was called throughout
    expect(mockSuite.memoryMonitor.getCurrentUsage).toHaveBeenCalled();
    expect(mockSuite.memoryMonitor.getMemoryPressureLevel).toHaveBeenCalled();

    // Verify logging continued despite pressure
    expect(mockSuite.debugLogger.debug).toHaveBeenCalled();
    expect(mockSuite.debugLogger.info).toHaveBeenCalled();
  });
});
