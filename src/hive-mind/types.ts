/**
 * Hive Mind Type Definitions - UPDATED to use unified AgentType system
 *
 * Core types and interfaces for the Hive Mind system
 * Now imports AgentType from single source of truth to prevent fragmentation
 */

// Import unified AgentType system from single source of truth
import {
  AgentType,
  resolveLegacyAgentType,
  isValidAgentType,
  normalizeAgentType,
} from '../swarm/agent-types-unified.js';

// Swarm types
export type SwarmTopology = 'mesh' | 'hierarchical' | 'ring' | 'star' | 'specs-driven';
export type QueenMode = 'centralized' | 'distributed' | 'strategic';

export interface HiveMindConfig {
  name: string;
  topology: SwarmTopology;
  maxAgents: number;
  queenMode: QueenMode;
  memoryTTL: number;
  consensusThreshold: number;
  autoSpawn: boolean;
  enableConsensus?: boolean;
  enableMemory?: boolean;
  enableCommunication?: boolean;
  enabledFeatures?: string[];
  createdAt?: Date;
}

/**
 * Legacy agent type resolution for hive-mind compatibility
 * Maps old underscore format to unified hyphen format
 */
export function resolveHiveMindAgentType(legacyType: string): AgentType {
  return resolveLegacyAgentType(legacyType);
}

/**
 * Validate agent type for hive-mind usage
 */
export function isValidHiveMindAgentType(type: string): type is AgentType {
  return isValidAgentType(type);
}

/**
 * Normalize agent type for hive-mind usage
 */
export function normalizeHiveMindAgentType(type: string): string {
  return normalizeAgentType(type);
}

/**
 * Get default capabilities for an agent type
 */
export function getCapabilitiesForAgentType(type: AgentType): AgentCapability[] {
  // Basic capabilities mapping based on agent type
  const capabilityMap: Partial<Record<AgentType, AgentCapability[]>> = {
    coder: ['code_generation', 'refactoring', 'debugging', 'implementation'],
    reviewer: ['code_review', 'standards_enforcement', 'best_practices', 'quality_assurance'],
    tester: ['test_generation', 'quality_assurance', 'edge_case_detection', 'testing'],
    planner: ['task_management', 'resource_allocation', 'workflow_orchestration'],
    researcher: ['information_gathering', 'pattern_recognition', 'knowledge_synthesis'],
    architecture: [
      'system_design',
      'architecture',
      'architecture_patterns',
      'integration_planning',
    ],
    'system-architect': [
      'system_design',
      'architecture',
      'architecture_patterns',
      'integration_planning',
    ],
    'ml-developer': ['code_generation', 'data_analysis', 'algorithm_improvement', 'implementation'],
    'api-docs': ['documentation_generation', 'api_docs', 'technical_writing'],
    specification: [
      'requirements_analysis',
      'user_story_creation',
      'acceptance_criteria',
      'specs_driven_design',
    ],
    pseudocode: ['algorithm_improvement', 'system_design', 'pattern_recognition'],
    refinement: ['code_review', 'performance_optimization', 'quality_assurance'],
  };

  return capabilityMap[type] || ['problem_solving', 'custom_capabilities'];
}

export type AgentStatus = 'idle' | 'busy' | 'active' | 'error' | 'offline';

export type AgentCapability =
  | 'task_management'
  | 'resource_allocation'
  | 'consensus_building'
  | 'information_gathering'
  | 'pattern_recognition'
  | 'knowledge_synthesis'
  | 'code_generation'
  | 'refactoring'
  | 'debugging'
  | 'data_analysis'
  | 'performance_metrics'
  | 'bottleneck_detection'
  | 'system_design'
  | 'architecture'
  | 'architecture_patterns'
  | 'integration_planning'
  | 'technical_writing'
  | 'test_generation'
  | 'quality_assurance'
  | 'edge_case_detection'
  | 'code_review'
  | 'standards_enforcement'
  | 'best_practices'
  | 'performance_optimization'
  | 'resource_optimization'
  | 'algorithm_improvement'
  | 'documentation_generation'
  | 'api_docs'
  | 'user_guides'
  | 'system_monitoring'
  | 'health_checks'
  | 'alerting'
  | 'domain_expertise'
  | 'custom_capabilities'
  | 'problem_solving'
  // Maestro specs-driven capabilities
  | 'requirements_analysis'
  | 'user_story_creation'
  | 'acceptance_criteria'
  | 'specs_driven_design'
  | 'workflow_orchestration'
  | 'governance'
  // Add missing capabilities that are being used
  | 'implementation'
  | 'testing';

export interface AgentConfig {
  id?: string;
  name: string;
  type: AgentType; // Now uses unified AgentType
  swarmId: string;
  capabilities: AgentCapability[];
}

export interface AgentSpawnOptions {
  type: AgentType; // Now uses unified AgentType
  name?: string;
  capabilities?: AgentCapability[];
  autoAssign?: boolean;
  config?: Partial<AgentConfig>;
  environment?: Partial<AgentEnvironment>;
}

export interface AgentEnvironment {
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  resourceLimits?: {
    maxMemory?: number;
    maxCpu?: number;
    timeout?: number;
  };
}

// Task types
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStrategy = 'parallel' | 'sequential' | 'adaptive' | 'consensus';
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Task {
  id: string;
  swarmId: string;
  description: string;
  priority: TaskPriority;
  strategy: TaskStrategy;
  status: TaskStatus;
  progress: number;
  result?: any;
  error?: string;
  dependencies: string[];
  assignedAgents: string[];
  requireConsensus: boolean;
  consensusAchieved?: boolean;
  maxAgents: number;
  requiredCapabilities: AgentCapability[];
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata: any;
}

export interface TaskSubmitOptions {
  description: string;
  priority: TaskPriority;
  strategy: TaskStrategy;
  dependencies?: string[];
  assignTo?: string;
  requireConsensus?: boolean;
  maxAgents?: number;
  requiredCapabilities?: AgentCapability[];
  metadata?: any;
}

export interface TaskAssignment {
  role: string;
  requiredCapabilities: AgentCapability[];
  responsibilities: string[];
  expectedOutput: string;
  timeout: number;
  canRunParallel: boolean;
}

// Communication types
export type MessageType =
  | 'direct'
  | 'broadcast'
  | 'consensus'
  | 'query'
  | 'response'
  | 'notification'
  | 'task_assignment'
  | 'progress_update'
  | 'coordination'
  | 'channel';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Message {
  id: string;
  fromAgentId: string;
  toAgentId: string | null;
  swarmId: string;
  type: MessageType;
  content: any;
  priority?: MessagePriority;
  timestamp: Date;
  requiresResponse: boolean;
}

export interface CommunicationChannel {
  name: string;
  description: string;
  type: 'public' | 'private';
  subscribers: string[];
  createdAt: Date;
}

export interface CommunicationStats {
  totalMessages: number;
  avgLatency: number;
  activeChannels: number;
  messagesByType: Record<MessageType, number>;
  throughput: number;
}

// Memory types
export interface MemoryEntry {
  key: string;
  namespace: string;
  value: string;
  ttl?: number;
  createdAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  expiresAt?: Date;
}

export interface MemoryNamespace {
  name: string;
  description: string;
  retentionPolicy: 'persistent' | 'time-based' | 'size-based';
  ttl?: number;
  maxEntries?: number;
  lastOperation?: string;
  lastOperationTime?: Date;
}

export interface MemoryStats {
  totalEntries: number;
  totalSize: number;
  byNamespace: Record<
    string,
    {
      entries: number;
      size: number;
      avgTTL: number;
    }
  >;
  cacheHitRate: number;
  avgAccessTime: number;
  hotKeys: string[];
}

export interface MemorySearchOptions {
  namespace?: string;
  pattern?: string;
  keyPrefix?: string;
  minAccessCount?: number;
  limit?: number;
  sortBy?: 'access' | 'recent' | 'created';
}

export interface MemoryPattern {
  type: 'co-access' | 'temporal' | 'frequency';
  keys: string[];
  confidence: number;
  frequency: number;
}

// Consensus types
export interface ConsensusProposal {
  id: string;
  swarmId: string;
  taskId?: string;
  proposal: any;
  requiredThreshold: number;
  deadline?: Date;
  creator?: string;
  metadata?: Record<string, any>;
}

export interface ConsensusVote {
  proposalId: string;
  agentId: string;
  vote: boolean;
  reason?: string;
  timestamp: Date;
}

export interface ConsensusResult {
  proposalId: string;
  achieved: boolean;
  finalRatio: number;
  totalVotes: number;
  positiveVotes: number;
  negativeVotes: number;
  participationRate: number;
}

export interface VotingStrategy {
  name: string;
  description: string;
  threshold: number;
  recommend: (
    proposal: ConsensusProposal,
    analysis: any,
  ) => {
    vote: boolean;
    confidence: number;
    reasoning: string;
    factors: string[];
  };
}

export interface ConsensusMetrics {
  totalProposals: number;
  achievedConsensus: number;
  failedConsensus: number;
  avgVotingTime: number;
  avgParticipation: number;
}

// Orchestration types
export interface ExecutionPlan {
  taskId: string;
  strategy: TaskStrategy;
  phases: string[];
  phaseAssignments: TaskAssignment[][];
  dependencies: string[];
  checkpoints: any[];
  parallelizable: boolean;
  estimatedDuration: number;
  resourceRequirements: any;
}

export interface OrchestrationResult {
  taskId: string;
  success: boolean;
  executionTime: number;
  phaseResults: any[];
  errors?: any[];
}

export interface ExecutionResult {
  success: boolean;
  data: any;
  executionTime: number;
  agentId: string;
  metadata?: any;
}

// Queen types
export interface QueenDecision {
  id: string;
  taskId: string;
  strategy: CoordinationStrategy;
  selectedAgents: string[];
  executionPlan: any;
  confidence: number;
  rationale: string;
  timestamp: Date;
}

export interface CoordinationStrategy {
  name: string;
  description: string;
  phases: string[];
  maxAgents: number;
  coordinationPoints: string[];
  suitable_for: string[];
}

// Status types
export interface SwarmStatus {
  swarmId: string;
  name: string;
  topology: SwarmTopology;
  queenMode: QueenMode;
  health: 'healthy' | 'degraded' | 'critical' | 'unknown';
  uptime: number;
  agents: Array<{
    id: string;
    name: string;
    type: AgentType; // Now uses unified AgentType
    status: AgentStatus;
    currentTask: string | null;
    messageCount: number;
    createdAt: number;
  }>;
  agentsByType: Record<string, number>; // Using string instead of AgentType for compatibility
  tasks: Array<{
    id: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    progress: number;
    assignedAgent: string | null;
  }>;
  taskStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  memoryStats: MemoryStats;
  communicationStats: CommunicationStats;
  performance: {
    avgTaskCompletion: number;
    messageThroughput: number;
    consensusSuccessRate: number;
    memoryHitRate: number;
    agentUtilization: number;
  };
  warnings: string[];
}

// Neural pattern types
export interface NeuralPattern {
  id: string;
  swarmId: string;
  patternType: 'coordination' | 'optimization' | 'prediction' | 'behavior';
  patternData: any;
  confidence: number;
  usageCount: number;
  successRate: number;
  createdAt: Date;
  lastUsedAt?: Date;
}

// Performance types
export interface PerformanceMetric {
  swarmId: string;
  agentId?: string;
  metricType: string;
  metricValue: number;
  timestamp: Date;
  metadata?: any;
}

/**
 * Migration helper functions for legacy code
 */

/**
 * Convert legacy underscore agent types to unified format
 */
export function migrateLegacyAgentTypes<T extends { type?: string }>(
  objects: T[],
): Array<T & { type: AgentType }> {
  return objects.map((obj) => ({
    ...obj,
    type: obj.type ? resolveLegacyAgentType(obj.type) : ('coder' as AgentType),
  }));
}

/**
 * Validate and normalize agent type for hive-mind operations
 */
export function validateHiveMindAgentType(type: string): AgentType {
  const normalized = normalizeAgentType(type);
  const resolved = resolveLegacyAgentType(normalized);

  if (!isValidAgentType(resolved)) {
    throw new Error(`Invalid agent type: ${type}. Resolved to: ${resolved}`);
  }

  return resolved;
}

/**
 * Get all valid agent types for hive-mind
 * This provides backward compatibility while using the unified system
 */
export function getHiveMindAgentTypes(): AgentType[] {
  // Import here to avoid circular dependencies
  const { getAllAgentTypes } = require('../swarm/agent-types-unified');
  return getAllAgentTypes();
}

// Export the unified AgentType and utility functions for external use
export type { AgentType };

export { normalizeAgentType, isValidAgentType };
