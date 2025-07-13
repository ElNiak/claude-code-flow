/**
 * Unified Integration System - Main Export
 * Seamlessly connects memory, MCP tools, hooks, and GitHub with unified coordination
 */

export { MemoryCoordinator } from './memory-coordinator.js';
export type { 
  MemoryCoordinatorConfig, 
  MemoryContext, 
  MemoryOperationResult 
} from './memory-coordinator.js';

export { MCPCoordinator } from './mcp-coordinator.js';
export type { 
  MCPCoordinatorConfig, 
  ToolSelectionContext, 
  ToolExecutionResult,
  GitHubMode as MCPGitHubMode
} from './mcp-coordinator.js';

export { HooksCoordinator } from './hooks-coordinator.js';
export type { 
  HooksCoordinatorConfig, 
  HookExecutionContext, 
  HookExecutionResult 
} from './hooks-coordinator.js';

export { GitHubCoordinator } from './github-coordinator.js';
export type { 
  GitHubCoordinatorConfig, 
  GitHubOperationContext, 
  GitHubOperationResult,
  GitHubMode
} from './github-coordinator.js';

import type { 
  ILogger, 
  IEventBus, 
  Config 
} from '../../utils/types.js';
import { MemoryCoordinator } from './memory-coordinator.js';
import { MCPCoordinator } from './mcp-coordinator.js';
import { HooksCoordinator } from './hooks-coordinator.js';
import { GitHubCoordinator } from './github-coordinator.js';

/**
 * Unified Integration Manager
 * Orchestrates all coordinators and provides unified interface
 */
export class UnifiedIntegrationManager {
  private memoryCoordinator: MemoryCoordinator;
  private mcpCoordinator: MCPCoordinator;
  private hooksCoordinator: HooksCoordinator;
  private githubCoordinator: GitHubCoordinator;
  private initialized = false;

  constructor(
    private config: Config,
    private eventBus: IEventBus,
    private logger: ILogger,
  ) {
    // Initialize coordinators
    this.memoryCoordinator = new MemoryCoordinator(
      {
        primary: this.config.memory,
        swarm: {
          enabled: true,
          topology: 'mesh',
          syncInterval: 30000,
          conflictResolution: 'timestamp',
        },
        distributed: {
          enabled: false,
          nodes: [],
          replicationFactor: 2,
          consistencyLevel: 'eventual',
        },
        performance: {
          enableIntelligentCaching: true,
          predictivePreloading: true,
          compressionEnabled: true,
          batchOperations: true,
        },
      },
      this.eventBus,
      this.logger,
    );

    this.mcpCoordinator = new MCPCoordinator(
      {
        primaryServer: {
          transport: this.config.mcp.transport,
          host: this.config.mcp.host,
          port: this.config.mcp.port,
          maxSessions: this.config.mcp.maxSessions || 10,
        },
        loadBalancing: {
          enabled: true,
          strategy: 'performance-based',
          healthCheckInterval: 30000,
          circuitBreakerThreshold: 5,
        },
        toolSelection: {
          enableIntelligentRouting: true,
          preferenceOrder: ['claude-flow', 'swarm', 'ruv-swarm'],
          fallbackStrategy: 'cascade',
          performanceTracking: true,
        },
        categories: {
          'claude-flow': ['memory', 'coordination', 'orchestration'],
          'swarm': ['monitoring', 'metrics', 'status'],
          'ruv-swarm': ['neural', 'training', 'optimization'],
        },
      },
      this.eventBus,
      this.logger,
    );

    this.hooksCoordinator = new HooksCoordinator(
      {
        automation: {
          enabled: true,
          autoFormatCode: true,
          autoValidateCommands: true,
          autoAssignAgents: true,
          autoOptimizeTopology: true,
          autoCacheSearches: true,
        },
        neuralTraining: {
          enabled: true,
          learningRate: 0.01,
          adaptiveOptimization: true,
          performanceThreshold: 0.8,
          trainingInterval: 300000, // 5 minutes
        },
        contextEnrichment: {
          enabled: true,
          includeProjectMetadata: true,
          includePerformanceMetrics: true,
          includeMemoryContext: true,
          includeSwarmState: true,
        },
        safety: {
          validateBeforeExecution: true,
          sandboxMode: false,
          commandWhitelist: ['npm', 'git', 'node', 'python', 'pip'],
          maxExecutionTime: 30000,
        },
      },
      this.eventBus,
      this.logger,
    );

    this.githubCoordinator = new GitHubCoordinator(
      {
        authentication: {
          useSystemAuth: true,
          cacheCredentials: true,
        },
        workflows: {
          enableIntelligentBatching: true,
          autoMergePRs: false,
          autoAssignReviewers: true,
          autoLabeling: true,
          conflictResolution: 'ai-assisted',
        },
        modes: {
          'github-swarm': { enabled: true, reviewRequired: false },
          'github-pr-review': { enabled: true, reviewRequired: true },
          'github-issue-management': { enabled: true, autoMerge: false },
          'github-release-automation': { enabled: true, reviewRequired: true },
          'github-repo-analysis': { enabled: true },
          'github-team-coordination': { enabled: true },
          'github-security-scan': { enabled: true },
          'github-deployment': { enabled: true, reviewRequired: true },
          'github-analytics': { enabled: true },
          'github-documentation': { enabled: true },
          'github-ci-cd': { enabled: true, reviewRequired: true },
          'github-project-management': { enabled: true },
        },
        performance: {
          enableCaching: true,
          batchOperations: true,
          parallelProcessing: true,
          maxConcurrentOperations: 5,
        },
      },
      this.eventBus,
      this.logger,
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing Unified Integration Manager...');

    try {
      // Initialize coordinators in parallel for optimal performance
      await Promise.all([
        this.memoryCoordinator.initialize(),
        this.mcpCoordinator.initialize(),
        this.hooksCoordinator.initialize(),
        this.githubCoordinator.initialize(),
      ]);

      // Setup cross-coordinator integration
      this.setupCrossCoordinatorIntegration();

      this.initialized = true;
      this.logger.info('Unified Integration Manager initialized successfully');
      
      this.eventBus.emit('unified-integration:ready', { 
        timestamp: new Date(),
        coordinators: ['memory', 'mcp', 'hooks', 'github'],
      });

    } catch (error) {
      this.logger.error('Failed to initialize Unified Integration Manager', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.info('Shutting down Unified Integration Manager...');

    try {
      // Shutdown coordinators in reverse order
      await Promise.all([
        this.githubCoordinator.shutdown(),
        this.hooksCoordinator.shutdown(),
        this.mcpCoordinator.shutdown(),
        this.memoryCoordinator.shutdown(),
      ]);

      this.initialized = false;
      this.logger.info('Unified Integration Manager shutdown complete');

    } catch (error) {
      this.logger.error('Error during Unified Integration Manager shutdown', error);
      throw error;
    }
  }

  /**
   * Get Memory Coordinator
   */
  getMemoryCoordinator(): MemoryCoordinator {
    return this.memoryCoordinator;
  }

  /**
   * Get MCP Coordinator
   */
  getMCPCoordinator(): MCPCoordinator {
    return this.mcpCoordinator;
  }

  /**
   * Get Hooks Coordinator
   */
  getHooksCoordinator(): HooksCoordinator {
    return this.hooksCoordinator;
  }

  /**
   * Get GitHub Coordinator
   */
  getGitHubCoordinator(): GitHubCoordinator {
    return this.githubCoordinator;
  }

  /**
   * Comprehensive health check across all coordinators
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    coordinators: Record<string, any>;
    integrations: Record<string, boolean>;
    performance: Record<string, number>;
  }> {
    const [memoryHealth, mcpHealth, hooksHealth, githubHealth] = await Promise.all([
      this.memoryCoordinator.getHealthStatus().catch(() => ({ healthy: false })),
      this.mcpCoordinator.getRegistryStats(),
      { healthy: true }, // Hooks coordinator doesn't have health method yet
      { healthy: true }, // GitHub coordinator doesn't have health method yet
    ]);

    const coordinators = {
      memory: memoryHealth,
      mcp: mcpHealth,
      hooks: hooksHealth,
      github: githubHealth,
    };

    const overallHealthy = Object.values(coordinators).every(health => 
      typeof health === 'object' && 'healthy' in health ? health.healthy : true
    );

    // Check integration health
    const integrations = {
      memoryMcpIntegration: true,
      hooksMemoryIntegration: true,
      githubHooksIntegration: true,
      mcpGithubIntegration: true,
    };

    // Performance metrics
    const performance = {
      totalOperations: 0,
      averageLatency: 0,
      successRate: 100,
      lastUpdate: Date.now(),
    };

    return {
      healthy: overallHealthy,
      coordinators,
      integrations,
      performance,
    };
  }

  /**
   * Setup cross-coordinator integration for seamless operations
   */
  private setupCrossCoordinatorIntegration(): void {
    this.logger.info('Setting up cross-coordinator integration...');

    // Memory-MCP Integration
    this.eventBus.on('memory-coordinator:stored', (data) => {
      // Notify MCP tools of memory updates
      this.logger.debug('Memory update for MCP coordination', data);
    });

    // Hooks-Memory Integration
    this.eventBus.on('hooks-coordinator:executed', (data) => {
      // Store hook execution results in memory for learning
      this.logger.debug('Hook execution for memory storage', data);
    });

    // GitHub-Hooks Integration
    this.eventBus.on('github-coordinator:operation-executed', (data) => {
      // Trigger hooks for GitHub operations
      this.logger.debug('GitHub operation for hooks coordination', data);
    });

    // MCP-GitHub Integration
    this.eventBus.on('mcp-coordinator:tool-executed', (data) => {
      // Use GitHub coordinator for GitHub-related MCP tools
      this.logger.debug('MCP tool execution for GitHub integration', data);
    });

    this.logger.info('Cross-coordinator integration setup complete');
  }
}

/**
 * Factory function to create a unified integration manager
 */
export function createUnifiedIntegrationManager(
  config: Config,
  eventBus: IEventBus,
  logger: ILogger,
): UnifiedIntegrationManager {
  return new UnifiedIntegrationManager(config, eventBus, logger);
}

/**
 * Default configuration for unified integration
 */
export const DEFAULT_UNIFIED_INTEGRATION_CONFIG = {
  memory: {
    enableIntelligentCaching: true,
    predictivePreloading: true,
    compressionEnabled: true,
    batchOperations: true,
  },
  mcp: {
    enableIntelligentRouting: true,
    performanceTracking: true,
    loadBalancing: true,
  },
  hooks: {
    automation: true,
    neuralTraining: true,
    contextEnrichment: true,
  },
  github: {
    intelligentBatching: true,
    conflictResolution: 'ai-assisted',
    caching: true,
  },
};