/**
 * Swarm system interface definitions
 */

// Task Executor interface
export interface TaskExecutor {
  execute(task: any): Promise<any>;
  getStats(): TaskExecutorStats;
  getStatus(): TaskExecutorStatus;
  cancel(taskId: string): Promise<boolean>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  shutdown(): Promise<void>;
  initialize(): Promise<void>;
}

export interface TaskExecutorStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeTasks: number;
  averageExecutionTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  lastUpdated: Date;
}

export interface TaskExecutorStatus {
  isRunning: boolean;
  isPaused: boolean;
  isShuttingDown: boolean;
  activeTaskCount: number;
  queueLength: number;
  errors: TaskExecutorError[];
}

export interface TaskExecutorError {
  taskId: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

// Swarm Memory Manager interface
export interface SwarmMemoryManager {
  store(key: string, value: any, partition?: string): Promise<void>;
  retrieve(key: string, partition?: string): Promise<any>;
  remove(key: string, partition?: string): Promise<boolean>;
  clear(partition?: string): Promise<void>;
  getStats(): SwarmMemoryStats;
  getStatus(): SwarmMemoryStatus;
  optimize(): Promise<void>;
  backup(): Promise<string>;
  restore(backupPath: string): Promise<void>;
  initialize(): Promise<void>;
}

export interface SwarmMemoryStats {
  totalEntries: number;
  totalSize: number;
  partitions: number;
  hitRate: number;
  missRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  diskUsage: number;
  fragmentationRatio: number;
  lastCleanup: Date;
  lastOptimization: Date;
}

export interface SwarmMemoryStatus {
  isHealthy: boolean;
  isOptimized: boolean;
  needsCleanup: boolean;
  errors: SwarmMemoryError[];
  warnings: SwarmMemoryWarning[];
}

export interface SwarmMemoryError {
  operation: string;
  key: string;
  error: string;
  timestamp: Date;
}

export interface SwarmMemoryWarning {
  type: 'memory' | 'disk' | 'performance' | 'fragmentation';
  message: string;
  threshold: number;
  current: number;
  timestamp: Date;
}

// Import.meta extensions removed to avoid overload signature conflicts

// String prompt extension (for REPL)
declare global {
  interface String {
    prompt?: boolean;
  }
}

// Generic command result structure
export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

// MCP server result structure
export interface McpServerResult {
  name: string;
  tools: string[];
  noPermissions: boolean;
  status: 'connected' | 'disconnected' | 'error';
  version?: string;
  capabilities?: string[];
  lastPing?: Date;
}

// Agent configuration structure
export interface AgentConfig {
  name: string;
  type: string;
  capabilities: string[];
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
  priority?: number;
}

// Task coordination structures
export interface SwarmTask {
  id: string;
  name: string;
  type: string;
  priority: number;
  dependencies: string[];
  assignedAgent?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  metadata: Record<string, any>;
}

export interface SwarmAgent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'offline' | 'error';
  capabilities: string[];
  currentTask?: string;
  tasksCompleted: number;
  tasksInProgress: number;
  lastActivity: Date;
  performance: AgentPerformance;
}

export interface AgentPerformance {
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  reliability: number;
  efficiency: number;
}

// Coordination topology
export interface SwarmTopology {
  type: 'mesh' | 'hierarchical' | 'ring' | 'star' | 'custom';
  nodes: TopologyNode[];
  connections: TopologyConnection[];
  coordinator?: string;
  redundancy: number;
}

export interface TopologyNode {
  id: string;
  type: 'agent' | 'coordinator' | 'gateway';
  position?: { x: number; y: number };
  capacity: number;
  load: number;
  status: 'active' | 'inactive' | 'overloaded';
}

export interface TopologyConnection {
  from: string;
  to: string;
  weight: number;
  latency: number;
  bandwidth: number;
  reliability: number;
}

// Progress tracking for swarm operations
export interface SwarmProgress {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  overallProgress: number;
  estimatedTimeRemaining?: number;
  throughput: number;
  efficiency: number;
}