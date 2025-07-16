/**
 * Missing Unified Coordination Types - Type Foundation
 *
 * These types were referenced but not properly defined in the unified core.
 */

import { EventEmitter } from 'node:events';
import { AgentId, AgentType, AgentState, TaskDefinition, TaskResult } from "../../swarm/types.js";

// === UNIFIED COORDINATION CONFIG ===

export interface UnifiedCoordinationConfig {
  enableStructuredThinking: boolean;
  phaseTimeouts: {
    specification: number;
    pseudocode: number;
    architecture: number;
    refinement: number;
    completion: number;
  };
  refinementThreshold: number;
  maxAgents: number;
  defaultTopology: string;
  loadBalanceThreshold: number;
  learningRate: number;
  patternRetention: number;
  consensusThreshold: number;
  coordinationMode: string;
  optimizationFrequency: number;
  performanceTargets: {
    effectiveness: number;
    synergy: number;
    adaptation: number;
  };
}

// === COORDINATION MATRIX CONFIG ===

export interface CoordinationMatrixConfig {
  dimensions: string[];
  maxNodes: number;
  updateFrequency: number;
  persistenceEnabled: boolean;
  metricsRetention: number;
  connectionTimeout: number;
  [key: string]: any;
}

// === UNIFIED AGENT CONFIG ===

export interface UnifiedAgentConfig {
  // Base config
  autonomyLevel: number;
  learningEnabled: boolean;
  adaptationEnabled: boolean;
  maxTasksPerHour: number;
  maxConcurrentTasks: number;
  timeoutThreshold: number;
  reportingInterval: number;
  heartbeatInterval: number;
  permissions: string[];
  trustedAgents: AgentId[];
  expertise: Record<string, number>;
  preferences: Record<string, any>;

  // SPARC config
  sparc: {
    thinkingDepth: number;
    qualityThreshold: number;
    refinementEnabled: boolean;
    phaseTimeouts: {
      specification: number;
      pseudocode: number;
      architecture: number;
      refinement: number;
      completion: number;
    };
  };

  // Swarm config
  swarm: {
    collaborationEnabled: boolean;
    maxConnections: number;
    loadShareThreshold: number;
    coordinationFrequency: number;
  };

  // Hive config
  hive: {
    collectiveEnabled: boolean;
    learningRate: number;
    consensusThreshold: number;
    emergenceEnabled: boolean;
  };

  // Unified config
  unified: {
    coordinationMode: string;
    synergyEnabled: boolean;
    holisticThinking: boolean;
  };
}

// === UNIFIED AGENT CAPABILITIES ===

export interface UnifiedAgentCapabilities {
  // Base capabilities
  codeGeneration: boolean;
  codeReview: boolean;
  testing: boolean;
  documentation: boolean;
  research: boolean;
  analysis: boolean;
  webSearch: boolean;
  apiIntegration: boolean;
  fileSystem: boolean;
  terminalAccess: boolean;
  languages: string[];
  frameworks: string[];
  domains: string[];
  tools: string[];
  maxConcurrentTasks: number;
  maxMemoryUsage: number;
  maxExecutionTime: number;
  reliability: number;
  speed: number;
  quality: number;

  // SPARC capabilities
  sparc: {
    specification: boolean;
    pseudocode: boolean;
    architecture: boolean;
    refinement: boolean;
    completion: boolean;
    qualityThreshold: number;
  };

  // Swarm capabilities
  swarm: {
    collaboration: boolean;
    taskSharing: boolean;
    loadBalancing: boolean;
    faultTolerance: boolean;
    coordination: boolean;
    communicationRange: number;
  };

  // Hive capabilities
  hive: {
    collectiveIntelligence: boolean;
    emergentBehavior: boolean;
    patternRecognition: boolean;
    adaptiveLearning: boolean;
    consensusBuilding: boolean;
    holisticView: boolean;
  };
}

// === UNIFIED AGENT STATE ===

export interface UnifiedAgentState {
  id: AgentId;
  name: string;
  type: AgentType;
  status: string;
  capabilities: UnifiedAgentCapabilities;
  config: UnifiedAgentConfig;

  // Current coordination state
  coordinationState: {
    sparc: any;
    swarm: any;
    hive: any;
  };

  // Performance metrics
  metrics: {
    tasksCompleted: number;
    successRate: number;
    averageQuality: number;
    synergy: number;
  };

  // Relationships
  collaborators: AgentId[];
  mentors: AgentId[];
  mentees: AgentId[];
}

// === COORDINATION STATE ===

export interface UnifiedCoordinationState {
  // Core state
  id: string;
  mode: string;
  status: string;

  // Agent management
  agents: Map<string, UnifiedAgentState>;
  activeAgents: Set<string>;

  // Task coordination
  tasks: Map<string, TaskDefinition>;
  activeTasks: Set<string>;

  // Pattern state
  patterns: Map<string, any>;
  learnings: Map<string, any>;

  // Metrics
  metrics: UnifiedMetrics;

  // Configuration
  config: UnifiedCoordinationConfig;
}

// === EXECUTION CONTEXT ===

export interface ExecutionContext {
  // Task context
  task: TaskDefinition;
  agent: AgentId;

  // Execution environment
  workingDirectory: string;
  environment: Record<string, string>;
  resources: any;

  // Coordination context
  coordinationState: UnifiedCoordinationState;
  parentContext?: ExecutionContext;

  // Timing
  startTime: Date;
  timeout: number;
}

// === SPARC STATE ===

export interface SPARCState {
  phase: string;
  progress: number;
  quality: number;
  refinements: number;
  artifacts: Record<string, any>;
  decisions: any[];
}

// === SWARM STATE ===

export interface SwarmState {
  topology: string;
  agents: Set<string>;
  connections: Map<string, Set<string>>;
  loadBalance: Record<string, number>;
  coordination: Record<string, any>;
}

// === HIVE STATE ===

export interface HiveState {
  collectiveIntelligence: number;
  consensus: Record<string, any>;
  patterns: Map<string, any>;
  emergence: any[];
  adaptations: any[];
}

// === COORDINATION PATTERNS ===

export interface CoordinationPattern {
  id: string;
  name: string;
  type: string;
  description: string;
  conditions: any;
  actions: any[];
  effectiveness: number;
}

// === DECISIONS ===

export interface Decision {
  id: string;
  timestamp: Date;
  agent: AgentId;
  context: any;
  reasoning: string;
  outcome: any;
  confidence: number;
}

// === REFINEMENTS ===

export interface Refinement {
  id: string;
  target: string;
  type: string;
  description: string;
  impact: number;
  applied: boolean;
}

// === PATTERNS ===

export interface Pattern {
  id: string;
  name: string;
  type: string;
  data: any;
  frequency: number;
  effectiveness: number;
}

// === ADAPTATION RULES ===

export interface AdaptationRule {
  id: string;
  condition: any;
  action: any;
  priority: number;
  active: boolean;
}

// === CONSENSUS STATE ===

export interface ConsensusState {
  topic: string;
  participants: AgentId[];
  votes: Map<string, any>;
  consensus: boolean;
  confidence: number;
}

// === HOLISTIC VIEW ===

export interface HolisticView {
  perspective: string;
  agents: AgentId[];
  insights: any[];
  synthesis: any;
  confidence: number;
}

// === COORDINATION SNAPSHOT ===

export interface CoordinationSnapshot {
  timestamp: Date;
  state: UnifiedCoordinationState;
  metrics: UnifiedMetrics;
  events: any[];
}

// === UNIFIED METRICS ===

export interface UnifiedMetrics {
  // Performance metrics
  throughput: number;
  latency: number;
  efficiency: number;

  // Quality metrics
  quality: number;
  synergy: number;
  adaptation: number;

  // Coordination metrics
  coordination: number;
  consensus: number;
  emergence: number;

  // Agent metrics
  agentUtilization: number;
  agentSatisfaction: number;
  collaboration: number;
}

// === TRIGGERS ===

export interface Trigger {
  id: string;
  name: string;
  condition: any;
  action: string;
  active: boolean;
}

// === ACTIONS ===

export interface Action {
  id: string;
  type: string;
  description: string;
  parameters: any;
  result?: any;
}

// Note: CollaborationState, AdaptationState, Improvement, and HolisticInsight
// are defined in unified-agent.ts to avoid duplication and type vs value confusion.
// They are re-exported from there for convenience.

// === BASE CLASSES ===

export class IntrinsicCoordinator extends EventEmitter {
  private config: UnifiedCoordinationConfig;
  private logger: any;
  private eventBus: any;
  private state: UnifiedCoordinationState;

  constructor(config: UnifiedCoordinationConfig, logger: any, eventBus: any) {
    super();
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;
    this.state = this.createInitialState();
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing Intrinsic Coordinator");
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down Intrinsic Coordinator");
  }

  getPublicState(): UnifiedCoordinationState {
    return { ...this.state };
  }

  getMetrics(): UnifiedMetrics {
    return this.state.metrics;
  }

  async coordinateObjective(objective: any): Promise<string> {
    return "objective-id";
  }

  private createInitialState(): UnifiedCoordinationState {
    return {
      id: "coordinator-" + Date.now(),
      mode: "automatic",
      status: "initializing",
      agents: new Map(),
      activeAgents: new Set(),
      tasks: new Map(),
      activeTasks: new Set(),
      patterns: new Map(),
      learnings: new Map(),
      metrics: {
        throughput: 0,
        latency: 0,
        efficiency: 0,
        quality: 0,
        synergy: 0,
        adaptation: 0,
        coordination: 0,
        consensus: 0,
        emergence: 0,
        agentUtilization: 0,
        agentSatisfaction: 0,
        collaboration: 0
      },
      config: this.config
    };
  }
}

export class UnifiedAgent extends EventEmitter {
  private id: AgentId;
  private type: AgentType;
  private capabilities: UnifiedAgentCapabilities;
  private config: UnifiedAgentConfig;
  private state: UnifiedAgentState;
  private logger: any;
  private eventBus: any;

  constructor(
    id: AgentId,
    type: AgentType,
    capabilities: UnifiedAgentCapabilities,
    config: UnifiedAgentConfig,
    logger: any,
    eventBus: any
  ) {
    super();
    this.id = id;
    this.type = type;
    this.capabilities = capabilities;
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;
    this.state = this.createInitialState();
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing Unified Agent", { id: this.id.id });
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down Unified Agent", { id: this.id.id });
  }

  getState(): UnifiedAgentState {
    return { ...this.state };
  }

  getCapabilities(): UnifiedAgentCapabilities {
    return { ...this.capabilities };
  }

  private createInitialState(): UnifiedAgentState {
    return {
      id: this.id,
      name: `${this.type}-${this.id.instance}`,
      type: this.type,
      status: "idle",
      capabilities: this.capabilities,
      config: this.config,
      coordinationState: {
        sparc: {},
        swarm: {},
        hive: {}
      },
      metrics: {
        tasksCompleted: 0,
        successRate: 0,
        averageQuality: 0,
        synergy: 0
      },
      collaborators: [],
      mentors: [],
      mentees: []
    };
  }
}

export enum UnifiedAgentEvents {
  AGENT_CREATED = 'agent.created',
  AGENT_STARTED = 'agent.started',
  AGENT_STOPPED = 'agent.stopped',
  TASK_ASSIGNED = 'task.assigned',
  TASK_COMPLETED = 'task.completed',
  COLLABORATION_STARTED = 'collaboration.started',
  ADAPTATION_PERFORMED = 'adaptation.performed'
}

// Re-export types that are defined in unified-agent.ts for convenience
export type {
  CollaborationState,
  AdaptationState,
  Improvement,
  HolisticInsight
} from './unified-agent.js';

// All types and classes are already exported in their declarations above