# Unified Coordination Engine - Detailed Implementation Plan

## File-by-File Modification Strategy

This document provides specific instructions for implementing the unified coordination engine, with exact file paths, code changes, and implementation steps.

## Phase 1: Core Engine Foundation

### 1.1 Create Core Engine Structure

#### New Directory Structure
```bash
mkdir -p src/engine/core
mkdir -p src/engine/intelligence  
mkdir -p src/engine/execution
mkdir -p src/engine/integration
mkdir -p src/engine/types
```

#### 1.2 Core Engine Types (`src/engine/types/index.ts`)

```typescript
// Core coordination types
export interface CoordinationRequest {
  id: string;
  type: 'swarm' | 'agent' | 'task' | 'sparc';
  objective: string;
  strategy: CoordinationStrategy;
  constraints: Constraint[];
  context: CoordinationContext;
}

export interface CoordinationResult {
  requestId: string;
  status: 'success' | 'failure' | 'partial';
  results: any[];
  metrics: CoordinationMetrics;
  artifacts: Artifact[];
}

export interface CoordinationStrategy {
  name: string;
  mode: 'centralized' | 'distributed' | 'hierarchical' | 'mesh';
  maxAgents: number;
  taskDecomposition: TaskDecompositionStrategy;
  executionPattern: ExecutionPattern;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: Capability[];
  status: AgentStatus;
  assignedTasks: string[];
  performance: AgentPerformance;
  memoryContext: MemoryContext;
}

export interface Task {
  id: string;
  type: TaskType;
  description: string;
  priority: TaskPriority;
  dependencies: string[];
  assignedAgent?: string;
  status: TaskStatus;
  progress: number;
  artifacts: Artifact[];
  metadata: TaskMetadata;
}

export type AgentType = 'coordinator' | 'researcher' | 'coder' | 'analyst' | 
                       'architect' | 'tester' | 'reviewer' | 'optimizer' |
                       'documenter' | 'monitor' | 'specialist';

export type TaskType = 'research' | 'analysis' | 'implementation' | 'testing' |
                      'documentation' | 'optimization' | 'coordination' |
                      'validation' | 'deployment';

export type AgentStatus = 'idle' | 'busy' | 'error' | 'unavailable';
export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 
                        'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
```

#### 1.3 Unified Coordinator (`src/engine/core/unified-coordinator.ts`)

```typescript
import { EventEmitter } from 'events';
import { Logger } from '../../core/logger.js';
import { TaskEngine } from './task-engine.js';
import { AgentPool } from './agent-pool.js';
import { ResourceManager } from './resource-manager.js';
import { MemoryStore } from './memory-store.js';
import { SparcIntelligence } from '../intelligence/sparc-intelligence.js';
import { HiveIntelligence } from '../intelligence/hive-intelligence.js';
import { McpExecutor } from '../execution/mcp-executor.js';
import {
  CoordinationRequest,
  CoordinationResult,
  CoordinationStrategy,
  Agent,
  Task,
  CoordinationMetrics
} from '../types/index.js';

export class UnifiedCoordinator extends EventEmitter {
  private logger: Logger;
  private taskEngine: TaskEngine;
  private agentPool: AgentPool;
  private resourceManager: ResourceManager;
  private memoryStore: MemoryStore;
  private sparcIntelligence: SparcIntelligence;
  private hiveIntelligence: HiveIntelligence;
  private mcpExecutor: McpExecutor;
  private initialized = false;
  private metrics: CoordinationMetrics;

  constructor(config: any) {
    super();
    this.logger = new Logger({ level: 'info' }, { component: 'UnifiedCoordinator' });
    
    // Initialize subsystems
    this.taskEngine = new TaskEngine(config);
    this.agentPool = new AgentPool(config);
    this.resourceManager = new ResourceManager(config);
    this.memoryStore = new MemoryStore(config);
    this.sparcIntelligence = new SparcIntelligence(config);
    this.hiveIntelligence = new HiveIntelligence(config);
    this.mcpExecutor = new McpExecutor(config);
    
    this.metrics = this.initializeMetrics();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing Unified Coordination Engine...');

    try {
      // Initialize all subsystems in parallel
      await Promise.all([
        this.taskEngine.initialize(),
        this.agentPool.initialize(),
        this.resourceManager.initialize(),
        this.memoryStore.initialize(),
        this.sparcIntelligence.initialize(),
        this.hiveIntelligence.initialize(),
        this.mcpExecutor.initialize()
      ]);

      this.setupEventHandlers();
      this.initialized = true;
      
      this.logger.info('Unified Coordination Engine initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Unified Coordination Engine', error);
      throw error;
    }
  }

  async coordinateTask(request: CoordinationRequest): Promise<CoordinationResult> {
    const startTime = Date.now();
    this.logger.info('Coordinating task', { 
      requestId: request.id, 
      type: request.type,
      objective: request.objective 
    });

    try {
      // Store request context in memory
      await this.memoryStore.storeCoordinationContext({
        requestId: request.id,
        type: request.type,
        objective: request.objective,
        timestamp: new Date()
      });

      // Determine coordination strategy
      const strategy = await this.determineStrategy(request);
      
      // Decompose into tasks
      const tasks = await this.decomposeIntoTasks(request, strategy);
      
      // Select and assign agents
      const agents = await this.selectAgents(tasks, strategy);
      
      // Execute coordination
      const result = await this.executeCoordination(tasks, agents, strategy);
      
      // Aggregate results
      const aggregatedResult = await this.aggregateResults(result, request);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(request.type, duration, aggregatedResult.status);
      
      this.logger.info('Task coordination completed', {
        requestId: request.id,
        status: aggregatedResult.status,
        duration
      });

      return aggregatedResult;
    } catch (error) {
      this.logger.error('Task coordination failed', { requestId: request.id, error });
      throw error;
    }
  }

  private async determineStrategy(request: CoordinationRequest): Promise<CoordinationStrategy> {
    // Use intelligence layers to determine optimal strategy
    switch (request.type) {
      case 'sparc':
        return this.sparcIntelligence.determineStrategy(request);
      case 'swarm':
        return this.hiveIntelligence.determineStrategy(request);
      default:
        return this.getDefaultStrategy(request);
    }
  }

  private async decomposeIntoTasks(
    request: CoordinationRequest, 
    strategy: CoordinationStrategy
  ): Promise<Task[]> {
    return this.taskEngine.decomposeObjective(request.objective, strategy);
  }

  private async selectAgents(tasks: Task[], strategy: CoordinationStrategy): Promise<Agent[]> {
    return this.agentPool.selectOptimalAgents(tasks, strategy);
  }

  private async executeCoordination(
    tasks: Task[], 
    agents: Agent[], 
    strategy: CoordinationStrategy
  ): Promise<any> {
    // Execute based on strategy pattern
    switch (strategy.mode) {
      case 'centralized':
        return this.executeCentralized(tasks, agents);
      case 'distributed':
        return this.executeDistributed(tasks, agents);
      case 'hierarchical':
        return this.executeHierarchical(tasks, agents);
      case 'mesh':
        return this.executeMesh(tasks, agents);
      default:
        throw new Error(`Unknown coordination mode: ${strategy.mode}`);
    }
  }

  // ... Additional implementation methods
}
```

### 1.4 Task Engine (`src/engine/core/task-engine.ts`)

```typescript
import { Logger } from '../../core/logger.js';
import { Task, TaskStatus, CoordinationStrategy } from '../types/index.js';

export class TaskEngine {
  private logger: Logger;
  private tasks: Map<string, Task> = new Map();
  private taskDependencies: Map<string, string[]> = new Map();

  constructor(private config: any) {
    this.logger = new Logger({ level: 'info' }, { component: 'TaskEngine' });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Task Engine...');
    // Initialize task scheduling, dependency resolution, etc.
  }

  async decomposeObjective(objective: string, strategy: CoordinationStrategy): Promise<Task[]> {
    this.logger.info('Decomposing objective into tasks', { objective });

    // Use strategy-specific decomposition
    const decomposer = this.getDecomposer(strategy);
    const tasks = await decomposer.decompose(objective);

    // Store tasks
    tasks.forEach(task => {
      this.tasks.set(task.id, task);
      this.taskDependencies.set(task.id, task.dependencies);
    });

    return tasks;
  }

  async assignTask(taskId: string, agentId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.assignedAgent = agentId;
    task.status = 'assigned';
    
    this.logger.info('Task assigned', { taskId, agentId });
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, progress?: number): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;
    if (progress !== undefined) {
      task.progress = progress;
    }

    this.logger.debug('Task status updated', { taskId, status, progress });
  }

  // ... Additional task management methods
}
```

### 1.5 Agent Pool (`src/engine/core/agent-pool.ts`)

```typescript
import { Logger } from '../../core/logger.js';
import { Agent, AgentType, Capability, Task, CoordinationStrategy } from '../types/index.js';

export class AgentPool {
  private logger: Logger;
  private agents: Map<string, Agent> = new Map();
  private availableAgents: Set<string> = new Set();

  constructor(private config: any) {
    this.logger = new Logger({ level: 'info' }, { component: 'AgentPool' });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Agent Pool...');
    // Initialize agent registry, capability tracking, etc.
  }

  async registerAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
    if (agent.status === 'idle') {
      this.availableAgents.add(agent.id);
    }
    
    this.logger.info('Agent registered', { 
      agentId: agent.id, 
      type: agent.type,
      capabilities: agent.capabilities 
    });
  }

  async selectOptimalAgents(tasks: Task[], strategy: CoordinationStrategy): Promise<Agent[]> {
    this.logger.info('Selecting optimal agents for tasks', { 
      taskCount: tasks.length,
      maxAgents: strategy.maxAgents 
    });

    const selectedAgents: Agent[] = [];
    const requiredCapabilities = this.extractRequiredCapabilities(tasks);

    // Find agents with required capabilities
    for (const agentId of this.availableAgents) {
      if (selectedAgents.length >= strategy.maxAgents) break;

      const agent = this.agents.get(agentId);
      if (!agent) continue;

      const score = this.calculateAgentScore(agent, requiredCapabilities);
      if (score > 0) {
        selectedAgents.push(agent);
      }
    }

    // If not enough agents, spawn new ones
    if (selectedAgents.length < this.getRequiredAgentCount(tasks, strategy)) {
      const newAgents = await this.spawnAdditionalAgents(tasks, strategy);
      selectedAgents.push(...newAgents);
    }

    return selectedAgents;
  }

  private extractRequiredCapabilities(tasks: Task[]): Capability[] {
    const capabilities = new Set<string>();
    
    tasks.forEach(task => {
      // Extract capabilities based on task type
      const taskCapabilities = this.getCapabilitiesForTaskType(task.type);
      taskCapabilities.forEach(cap => capabilities.add(cap));
    });

    return Array.from(capabilities).map(name => ({ name, level: 'required' }));
  }

  // ... Additional agent management methods
}
```

## Phase 2: Integration with Existing Systems

### 2.1 Modify Main CLI Entry Point (`src/cli/main.ts`)

```typescript
// Add at the top of the file
import { UnifiedCoordinator } from '../engine/core/unified-coordinator.js';

// Modify the main function
async function main() {
  const cli = new CLI("claude-flow", "Advanced AI Agent Orchestration System");
  
  // Initialize unified coordinator
  const coordinator = new UnifiedCoordinator({
    maxAgents: 10,
    defaultStrategy: 'hierarchical',
    memoryBackend: 'sqlite',
    logging: { level: 'info' }
  });
  
  await coordinator.initialize();
  
  // Pass coordinator to CLI setup
  setupCommands(cli, coordinator);
  
  await cli.run();
}
```

### 2.2 Update Swarm Command (`src/cli/simple-commands/swarm.js`)

```javascript
// Add unified coordinator integration
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Add to the main swarm function
export async function swarmCommand(args, coordinator = null) {
  // If unified coordinator is available, use it
  if (coordinator) {
    return executeUnifiedSwarm(args, coordinator);
  }
  
  // Otherwise, fall back to legacy implementation
  return executeLegacySwarm(args);
}

async function executeUnifiedSwarm(args, coordinator) {
  const objective = args[0];
  const options = parseSwarmOptions(args.slice(1));
  
  const request = {
    id: generateId(),
    type: 'swarm',
    objective,
    strategy: {
      name: options.strategy || 'auto',
      mode: options.mode || 'hierarchical',
      maxAgents: options.maxAgents || 6,
      taskDecomposition: 'intelligent',
      executionPattern: 'parallel'
    },
    constraints: options.constraints || [],
    context: {
      workingDirectory: process.cwd(),
      outputFormat: options.outputFormat || 'interactive',
      timeout: options.timeout || 300000
    }
  };
  
  try {
    const result = await coordinator.coordinateTask(request);
    displaySwarmResults(result, options);
    return result;
  } catch (error) {
    console.error('Swarm execution failed:', error.message);
    process.exit(1);
  }
}
```

### 2.3 Create Migration Manager (`src/engine/integration/migration-manager.ts`)

```typescript
import { Logger } from '../../core/logger.js';
import { UnifiedCoordinator } from '../core/unified-coordinator.js';

export class MigrationManager {
  private logger: Logger;
  private coordinator: UnifiedCoordinator;

  constructor(coordinator: UnifiedCoordinator) {
    this.logger = new Logger({ level: 'info' }, { component: 'MigrationManager' });
    this.coordinator = coordinator;
  }

  async migrateExistingCommands(): Promise<void> {
    this.logger.info('Starting command migration...');

    // Migrate swarm commands
    await this.migrateSwarmCommands();
    
    // Migrate agent commands
    await this.migrateAgentCommands();
    
    // Migrate task commands
    await this.migrateTaskCommands();
    
    // Migrate SPARC commands
    await this.migrateSparcCommands();

    this.logger.info('Command migration completed');
  }

  private async migrateSwarmCommands(): Promise<void> {
    // Update swarm command files to use unified coordinator
    const swarmFiles = [
      'src/cli/simple-commands/swarm.js',
      'src/cli/simple-commands/swarm-executor.js',
      'src/cli/simple-commands/swarm-ui.js'
    ];

    for (const file of swarmFiles) {
      await this.addCoordinatorIntegration(file);
    }
  }

  private async addCoordinatorIntegration(filePath: string): Promise<void> {
    // Read existing file, add coordinator parameter to main function
    // Modify to use coordinator when available, fall back to legacy otherwise
    this.logger.debug('Adding coordinator integration', { file: filePath });
  }
}
```

## Phase 3: Intelligence Layer Integration

### 3.1 SPARC Intelligence (`src/engine/intelligence/sparc-intelligence.ts`)

```typescript
import { Logger } from '../../core/logger.js';
import { CoordinationRequest, CoordinationStrategy, Task } from '../types/index.js';

export class SparcIntelligence {
  private logger: Logger;
  private modeDefinitions: Map<string, ModeDefinition>;

  constructor(private config: any) {
    this.logger = new Logger({ level: 'info' }, { component: 'SparcIntelligence' });
    this.modeDefinitions = new Map();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing SPARC Intelligence...');
    await this.loadModeDefinitions();
  }

  async determineStrategy(request: CoordinationRequest): Promise<CoordinationStrategy> {
    const mode = this.extractSparcMode(request);
    const modeDefinition = this.modeDefinitions.get(mode);
    
    if (!modeDefinition) {
      throw new Error(`Unknown SPARC mode: ${mode}`);
    }

    return {
      name: `sparc-${mode}`,
      mode: modeDefinition.coordinationMode,
      maxAgents: modeDefinition.recommendedAgents,
      taskDecomposition: modeDefinition.taskDecomposition,
      executionPattern: modeDefinition.executionPattern
    };
  }

  async decomposeSparcObjective(objective: string, mode: string): Promise<Task[]> {
    const modeDefinition = this.modeDefinitions.get(mode);
    if (!modeDefinition) {
      throw new Error(`Unknown SPARC mode: ${mode}`);
    }

    // Use mode-specific decomposition logic
    return modeDefinition.decomposer.decompose(objective);
  }

  private async loadModeDefinitions(): Promise<void> {
    // Load existing SPARC mode definitions from src/cli/simple-commands/sparc-modes/
    const modes = [
      'architect', 'code', 'tdd', 'debug', 'security-review',
      'docs-writer', 'integration', 'monitoring', 'optimization'
    ];

    for (const mode of modes) {
      const definition = await this.loadModeDefinition(mode);
      this.modeDefinitions.set(mode, definition);
    }
  }

  private async loadModeDefinition(mode: string): Promise<ModeDefinition> {
    // Convert existing SPARC mode files to structured definitions
    // This maintains backward compatibility while enabling unified coordination
    
    return {
      name: mode,
      coordinationMode: this.getCoordinationModeForSparc(mode),
      recommendedAgents: this.getRecommendedAgentsForSparc(mode),
      taskDecomposition: this.getTaskDecompositionForSparc(mode),
      executionPattern: this.getExecutionPatternForSparc(mode),
      decomposer: new SparcTaskDecomposer(mode)
    };
  }
}

interface ModeDefinition {
  name: string;
  coordinationMode: 'centralized' | 'distributed' | 'hierarchical' | 'mesh';
  recommendedAgents: number;
  taskDecomposition: string;
  executionPattern: string;
  decomposer: SparcTaskDecomposer;
}

class SparcTaskDecomposer {
  constructor(private mode: string) {}

  async decompose(objective: string): Promise<Task[]> {
    // Mode-specific task decomposition logic
    switch (this.mode) {
      case 'architect':
        return this.decomposeArchitectureTask(objective);
      case 'code':
        return this.decomposeCodeTask(objective);
      case 'tdd':
        return this.decomposeTddTask(objective);
      // ... etc for all modes
      default:
        return this.decomposeGenericTask(objective);
    }
  }

  private decomposeArchitectureTask(objective: string): Task[] {
    return [
      {
        id: 'arch-analysis',
        type: 'analysis',
        description: 'Analyze requirements and constraints',
        priority: 'high',
        dependencies: [],
        status: 'pending',
        progress: 0,
        artifacts: [],
        metadata: { phase: 'analysis' }
      },
      {
        id: 'arch-design',
        type: 'implementation',
        description: 'Design system architecture',
        priority: 'high',
        dependencies: ['arch-analysis'],
        status: 'pending',
        progress: 0,
        artifacts: [],
        metadata: { phase: 'design' }
      },
      {
        id: 'arch-validation',
        type: 'validation',
        description: 'Validate architecture design',
        priority: 'medium',
        dependencies: ['arch-design'],
        status: 'pending',
        progress: 0,
        artifacts: [],
        metadata: { phase: 'validation' }
      }
    ];
  }
}
```

## Modification Summary

### Files to Create (26 new files)
```
src/engine/
├── core/
│   ├── unified-coordinator.ts       # Main coordination engine
│   ├── task-engine.ts              # Task management
│   ├── agent-pool.ts               # Agent management
│   ├── resource-manager.ts         # Resource allocation
│   └── memory-store.ts             # Memory interface
├── intelligence/
│   ├── sparc-intelligence.ts       # SPARC integration
│   ├── hive-intelligence.ts        # Hive mind features
│   ├── consensus-engine.ts         # Decision making
│   └── pattern-recognition.ts      # Pattern detection
├── execution/
│   ├── mcp-executor.ts             # MCP integration
│   ├── terminal-manager.ts         # Process management
│   └── output-aggregator.ts        # Result aggregation
├── integration/
│   ├── migration-manager.ts        # System migration
│   ├── legacy-adapter.ts           # Backward compatibility
│   └── compatibility-layer.ts      # API compatibility
└── types/
    └── index.ts                    # Core engine types
```

### Files to Modify (12 existing files)
```
src/cli/
├── main.ts                         # Add coordinator initialization
├── simple-cli.js                   # Route to unified engine
└── simple-commands/
    ├── swarm.js                    # Use unified coordination
    ├── agent.js                    # Route to agent pool
    ├── task.js                     # Use task engine
    ├── sparc.js                    # Integrate SPARC intelligence
    ├── hive.js                     # Use hive intelligence
    └── memory.js                   # Use unified memory

src/mcp/
└── server.ts                       # Integrate with coordinator

src/memory/
├── manager.ts                      # Extend for unified storage
└── backends/
    └── sqlite.ts                   # Add engine optimizations
```

### Files to Gradually Deprecate (8 files)
```
src/coordination/
├── manager.ts                      # → unified-coordinator.ts
├── swarm-coordinator.ts            # → merged into engine
└── scheduler.ts                    # → task-engine.ts

src/swarm/
├── coordinator.ts                  # → merged into engine
└── executor.ts                     # → execution layer

src/hive-mind/
├── core/HiveMind.ts               # → intelligence layer
└── integration/                    # → engine integration
```

## Implementation Timeline

### Week 1: Foundation
- Day 1-2: Create engine structure + types
- Day 3-4: Implement UnifiedCoordinator basic functionality
- Day 5: Create compatibility layer and migration tools

### Week 2: Intelligence Integration
- Day 1-2: Implement SPARC intelligence layer
- Day 3-4: Integrate Hive mind features
- Day 5: Add consensus and pattern recognition

### Week 3: Execution Layer
- Day 1-2: Implement MCP executor integration
- Day 3-4: Add terminal and process management
- Day 5: Optimize performance and resource usage

### Week 4: Migration & Testing
- Day 1-2: Migrate all commands to unified engine
- Day 3-4: Comprehensive testing and debugging
- Day 5: Documentation and performance validation

This implementation plan provides a clear pathway to unify the 5 coordination systems into a single, efficient engine while maintaining backward compatibility and improving performance significantly.