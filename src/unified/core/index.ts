/**
 * Unified Core Components - Index
 * 
 * This module exports all the core unified coordination components that provide
 * intrinsic SPARC + Swarm + Hive capabilities built-in simultaneously.
 */

// Core coordination engine
export { 
  IntrinsicCoordinator,
  CoordinationEvents,
  type IntrinsicCapabilities,
  type UnifiedCoordinationState,
  type ExecutionContext,
  type SPARCState,
  type SwarmState,
  type HiveState,
  type CoordinationPattern,
  type Decision,
  type Refinement,
  type Pattern,
  type AdaptationRule,
  type ConsensusState,
  type HolisticView,
  type CoordinationSnapshot,
  type UnifiedMetrics,
  type UnifiedCoordinationConfig,
  type Trigger,
  type Action
} from './intrinsic-coordinator.js';

// Unified agent implementation
export {
  UnifiedAgent,
  UnifiedAgentEvents,
  type UnifiedAgentCapabilities,
  type UnifiedAgentState,
  type UnifiedAgentConfig,
  type CollaborationState,
  type AdaptationState,
  type Improvement,
  type HolisticInsight
} from './unified-agent.js';

// Coordination matrix for multi-dimensional coordination
export {
  CoordinationMatrix,
  CoordinationDimension,
  CoordinationEventType,
  ConnectionType,
  type CoordinationNode,
  type CoordinationPosition,
  type NodeState,
  type NodeMetrics,
  type CoordinationEvent,
  type CoordinationConnection,
  type CoordinationPattern as MatrixCoordinationPattern,
  type CoordinationMatrixConfig,
  type MatrixState,
  type MatrixMetrics,
  type CoordinationRecommendation
} from './coordination-matrix.js';

// Execution engine for unified task execution
export {
  ExecutionEngine,
  ExecutionStatus,
  ExecutionPhase,
  SPARCPhase,
  type ExecutionContext as EngineExecutionContext,
  type ExecutionDecision,
  type QualityMetrics,
  type TaskDistribution,
  type TaskSegment,
  type CoordinationEvent as ExecutionCoordinationEvent,
  type ResourceUsage,
  type ExecutionAdaptation,
  type ConsensusState as ExecutionConsensusState,
  type ExecutionStrategy,
  type UnifiedExecutionResult
} from './execution-engine.js';

/**
 * Re-export common types for convenience
 */
export type {
  AgentId,
  TaskId,
  SwarmId,
  AgentType,
  TaskType,
  AgentState,
  TaskDefinition,
  TaskResult,
  SwarmObjective,
  SwarmConfig
} from '../../swarm/types.js';

/**
 * Unified Coordination System Factory
 * 
 * Factory function to create a complete unified coordination system
 * with all components properly initialized and connected.
 */
export interface UnifiedCoordinationSystemConfig {
  // Coordinator configuration
  coordinator: Partial<UnifiedCoordinationConfig>;
  
  // Matrix configuration
  matrix?: Partial<CoordinationMatrixConfig>;
  
  // Agent configuration defaults
  agentDefaults?: Partial<UnifiedAgentConfig>;
  
  // Execution strategy preferences
  executionStrategies?: string[];
  
  // System-wide settings
  system: {
    maxAgents: number;
    maxTasks: number;
    optimizationFrequency: number;
    enableMonitoring: boolean;
    enableLearning: boolean;
  };
}

/**
 * Unified Coordination System
 * 
 * Complete coordination system that combines all core components
 */
export class UnifiedCoordinationSystem {
  private coordinator: IntrinsicCoordinator;
  private matrix: CoordinationMatrix;
  private executionEngine: ExecutionEngine;
  private agents: Map<string, UnifiedAgent>;
  private initialized = false;

  constructor(
    private config: UnifiedCoordinationSystemConfig,
    private logger: import('../../core/logger.js').ILogger,
    private eventBus: import('../../core/event-bus.js').IEventBus
  ) {
    // Create coordinator with unified configuration
    const coordinatorConfig: UnifiedCoordinationConfig = {
      enableStructuredThinking: true,
      phaseTimeouts: {
        'specification': 30000,
        'pseudocode': 60000,
        'architecture': 90000,
        'refinement': 45000,
        'completion': 30000
      },
      refinementThreshold: 0.8,
      maxAgents: config.system.maxAgents,
      defaultTopology: 'hierarchical',
      loadBalanceThreshold: 0.8,
      learningRate: 0.1,
      patternRetention: 100,
      consensusThreshold: 0.7,
      coordinationMode: 'automatic',
      optimizationFrequency: config.system.optimizationFrequency,
      performanceTargets: {
        'effectiveness': 0.85,
        'synergy': 0.8,
        'adaptation': 0.75
      },
      ...config.coordinator
    };

    this.coordinator = new IntrinsicCoordinator(coordinatorConfig, logger, eventBus);
    this.matrix = new CoordinationMatrix(logger, config.matrix);
    this.agents = new Map();
    
    // Note: ExecutionEngine will be initialized when coordinator state is available
    this.executionEngine = new ExecutionEngine(
      {} as UnifiedCoordinationState, // Will be set during initialization
      logger,
      eventBus
    );
  }

  /**
   * Initialize the complete unified coordination system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing Unified Coordination System...');

    try {
      // Initialize core components in order
      await this.coordinator.initialize();
      await this.matrix.initialize();
      
      // Update execution engine with coordinator state
      const coordinatorState = this.coordinator.getPublicState() as UnifiedCoordinationState;
      this.executionEngine = new ExecutionEngine(coordinatorState, this.logger, this.eventBus);
      await this.executionEngine.initialize();

      // Set up cross-component connections
      this.setupComponentConnections();

      this.initialized = true;
      this.logger.info('Unified Coordination System initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Unified Coordination System', error);
      throw error;
    }
  }

  /**
   * Create and add a unified agent to the system
   */
  async createAgent(
    agentId: string,
    type: AgentType,
    capabilities?: Partial<UnifiedAgentCapabilities>,
    config?: Partial<UnifiedAgentConfig>
  ): Promise<UnifiedAgent> {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }

    const fullAgentId: AgentId = {
      id: agentId,
      swarmId: 'system',
      type,
      instance: this.agents.size
    };

    // Create default capabilities
    const defaultCapabilities: UnifiedAgentCapabilities = {
      // Base capabilities
      codeGeneration: true,
      codeReview: true,
      testing: true,
      documentation: true,
      research: true,
      analysis: true,
      webSearch: false,
      apiIntegration: false,
      fileSystem: true,
      terminalAccess: false,
      languages: ['typescript', 'javascript'],
      frameworks: ['node.js'],
      domains: ['software-development'],
      tools: ['basic'],
      maxConcurrentTasks: 3,
      maxMemoryUsage: 512 * 1024 * 1024,
      maxExecutionTime: 300000,
      reliability: 0.9,
      speed: 0.8,
      quality: 0.85,

      // SPARC capabilities
      sparc: {
        specification: true,
        pseudocode: true,
        architecture: true,
        refinement: true,
        completion: true,
        qualityThreshold: 0.8
      },

      // Swarm capabilities
      swarm: {
        collaboration: true,
        taskSharing: true,
        loadBalancing: true,
        faultTolerance: true,
        coordination: true,
        communicationRange: 5
      },

      // Hive capabilities
      hive: {
        collectiveIntelligence: true,
        emergentBehavior: true,
        patternRecognition: true,
        adaptiveLearning: true,
        consensusBuilding: true,
        holisticView: true
      },

      ...capabilities
    };

    // Create default configuration
    const defaultConfig: UnifiedAgentConfig = {
      // Base config
      autonomyLevel: 0.8,
      learningEnabled: true,
      adaptationEnabled: true,
      maxTasksPerHour: 10,
      maxConcurrentTasks: 3,
      timeoutThreshold: 300000,
      reportingInterval: 30000,
      heartbeatInterval: 10000,
      permissions: ['read', 'write', 'execute'],
      trustedAgents: [],
      expertise: {},
      preferences: {},

      // SPARC config
      sparc: {
        thinkingDepth: 3,
        qualityThreshold: 0.8,
        refinementEnabled: true,
        phaseTimeouts: {
          'specification': 30000,
          'pseudocode': 60000,
          'architecture': 90000,
          'refinement': 45000,
          'completion': 30000
        }
      },

      // Swarm config
      swarm: {
        collaborationEnabled: true,
        maxConnections: 5,
        loadShareThreshold: 0.8,
        coordinationFrequency: 10000
      },

      // Hive config
      hive: {
        collectiveEnabled: true,
        learningRate: 0.1,
        consensusThreshold: 0.7,
        emergenceEnabled: true
      },

      // Unified config
      unified: {
        coordinationMode: 'adaptive',
        synergyEnabled: true,
        holisticThinking: true
      },

      ...this.config.agentDefaults,
      ...config
    };

    // Create the unified agent
    const agent = new UnifiedAgent(
      fullAgentId,
      type,
      defaultCapabilities,
      defaultConfig,
      this.logger,
      this.eventBus
    );

    await agent.initialize();

    // Add to system
    this.agents.set(agentId, agent);

    // Add to coordination matrix
    const agentState: AgentState = agent.getState();
    this.matrix.addAgent(fullAgentId, agentState);

    this.logger.info('Created unified agent', { 
      agentId, 
      type, 
      capabilities: Object.keys(defaultCapabilities).length 
    });

    return agent;
  }

  /**
   * Execute a task using the unified coordination system
   */
  async executeTask(
    task: TaskDefinition,
    agentId?: string,
    strategy: string = 'balanced'
  ): Promise<UnifiedExecutionResult> {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }

    // Find or assign agent
    let assignedAgent: UnifiedAgent;
    if (agentId) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      assignedAgent = agent;
    } else {
      // Auto-assign based on task requirements
      assignedAgent = this.selectBestAgent(task);
    }

    // Add task to coordination matrix
    this.matrix.addTask(task.id, task, assignedAgent.getState().id.id);

    // Execute using coordination system
    const objectiveId = await this.coordinator.coordinateObjective({
      name: `Task: ${task.name}`,
      description: task.description,
      strategy: 'auto',
      mode: 'hierarchical',
      requirements: {
        minAgents: 1,
        maxAgents: 3,
        agentTypes: [assignedAgent.getState().type],
        estimatedDuration: 300000,
        maxDuration: 600000,
        qualityThreshold: 0.8,
        reviewCoverage: 0.8,
        testCoverage: 0.7,
        reliabilityTarget: 0.9
      },
      constraints: {
        milestones: [],
        resourceLimits: {},
        minQuality: 0.7,
        requiredApprovals: [],
        allowedFailures: 1,
        recoveryTime: 30000
      },
      tasks: [task],
      dependencies: []
    });

    // Execute task with unified engine
    const result = await this.executionEngine.executeTask(
      task,
      assignedAgent.getState().id,
      strategy
    );

    this.logger.info('Task executed successfully', {
      taskId: task.id.id,
      objectiveId,
      agentId: assignedAgent.getState().id.id,
      synergy: result.unifiedResults.synergyAchieved
    });

    return result;
  }

  /**
   * Select the best agent for a task
   */
  private selectBestAgent(task: TaskDefinition): UnifiedAgent {
    if (this.agents.size === 0) {
      throw new Error('No agents available');
    }

    // Simple selection - in practice, this would use sophisticated matching
    const agents = Array.from(this.agents.values());
    
    // Find agent with matching capabilities
    for (const agent of agents) {
      const capabilities = agent.getCapabilities();
      const hasRequiredCapabilities = task.requirements.capabilities.every(cap =>
        capabilities.languages.includes(cap) ||
        capabilities.frameworks.includes(cap) ||
        capabilities.domains.includes(cap)
      );
      
      if (hasRequiredCapabilities && agent.getState().status === 'idle') {
        return agent;
      }
    }

    // Fallback to first available agent
    return agents.find(agent => agent.getState().status === 'idle') || agents[0];
  }

  /**
   * Set up connections between components
   */
  private setupComponentConnections(): void {
    // Connect coordinator events to matrix updates
    this.coordinator.on(CoordinationEvents.AGENT_SPAWNED, (data: any) => {
      this.matrix.updateAgentCoordination(
        data.agentId,
        CoordinationDimension.SPARC,
        'initialization',
        data
      );
    });

    this.coordinator.on(CoordinationEvents.THINKING_STARTED, (data: any) => {
      this.matrix.updateAgentCoordination(
        data.agentId || 'system',
        CoordinationDimension.SPARC,
        data.phase,
        data
      );
    });

    // Connect agent events to matrix updates
    this.eventBus.on('agent.collaboration.initiated', (data: any) => {
      this.matrix.updateAgentCoordination(
        data.agentId,
        CoordinationDimension.SWARM,
        'collaborate',
        data
      );
    });

    this.eventBus.on('agent.adaptation.performed', (data: any) => {
      this.matrix.updateAgentCoordination(
        data.agentId,
        CoordinationDimension.HIVE,
        'adapt',
        data
      );
    });

    // Connect execution engine events
    this.executionEngine.on('phase.completed', (data: any) => {
      this.eventBus.emit('execution.phase.completed', data);
    });
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): {
    coordinator: UnifiedMetrics;
    matrix: MatrixMetrics;
    agents: number;
    activeExecutions: number;
  } {
    return {
      coordinator: this.coordinator.getMetrics(),
      matrix: this.matrix.getMetrics(),
      agents: this.agents.size,
      activeExecutions: this.executionEngine.getActiveExecutions().length
    };
  }

  /**
   * Get coordination recommendations
   */
  getCoordinationRecommendations(): CoordinationRecommendation[] {
    const recommendations: CoordinationRecommendation[] = [];
    
    // Get recommendations for each agent
    this.agents.forEach((agent, agentId) => {
      const agentRecommendations = this.matrix.getCoordinationRecommendations(agentId);
      recommendations.push(...agentRecommendations);
    });

    return recommendations;
  }

  /**
   * Shutdown the unified coordination system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.info('Shutting down Unified Coordination System...');

    try {
      // Shutdown agents
      const shutdownPromises = Array.from(this.agents.values()).map(agent => agent.shutdown());
      await Promise.all(shutdownPromises);

      // Shutdown core components
      await this.executionEngine.shutdown();
      await this.matrix.shutdown();
      await this.coordinator.shutdown();

      this.agents.clear();
      this.initialized = false;

      this.logger.info('Unified Coordination System shutdown complete');

    } catch (error) {
      this.logger.error('Error during system shutdown', error);
      throw error;
    }
  }
}