# Hybrid Integration Technical Specifications
## Implementation Details for Claude Flow MCP ↔ Claude Code Integration

### Technical Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Interface                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │           Hybrid Execution Coordinator                     │ │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌─────────────┐  │ │
│  │  │ Task Analyzer │  │ Strategy Selector│  │ Router      │  │ │
│  │  └───────────────┘  └──────────────────┘  └─────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐           ┌─────────────────────────────────┐ │
│  │  Direct Hooks   │           │    MCP Integration Bridge       │ │
│  │  System         │           │                                 │ │
│  │  ┌────────────┐ │           │  ┌────────────┐ ┌─────────────┐ │ │
│  │  │Pre-Hook    │ │           │  │Agent       │ │Swarm        │ │ │
│  │  │Post-Hook   │ │           │  │Inheritance │ │Coordinator  │ │ │
│  │  │Stop-Hook   │ │           │  │Mapper      │ │             │ │ │
│  │  └────────────┘ │           │  └────────────┘ └─────────────┘ │ │
│  └─────────────────┘           └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       Configuration Layer                       │
│  ┌─────────────────┐           ┌─────────────────────────────────┐ │
│  │settings.json    │    ↔      │   hook-profiles.json            │ │
│  │+ swarm config   │           │   + mcp integration             │ │
│  └─────────────────┘           └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: Enhanced Configuration Schema

### 1.1 Extended settings.json Structure

```json
{
  "env": {
    "CLAUDE_FLOW_AUTO_COMMIT": "false",
    "CLAUDE_FLOW_AUTO_PUSH": "false",
    "CLAUDE_FLOW_HOOKS_ENABLED": "true",
    "CLAUDE_FLOW_TELEMETRY_ENABLED": "true",
    "CLAUDE_FLOW_REMOTE_EXECUTION": "true",
    "CLAUDE_FLOW_GITHUB_INTEGRATION": "true",
    "EMERGENCY_MEMORY_ACTIVE": "true",
    "NODE_OPTIONS": "--max-old-space-size=12288 --expose-gc"
  },
  "permissions": {
    "allow": ["Bash(npx claude-flow *)", "..."],
    "deny": ["Bash(rm -rf /)", "..."]
  },
  "hooks": {
    "PreToolUse": ["...existing hooks..."],
    "PostToolUse": ["...existing hooks..."],
    "Stop": ["...existing hooks..."]
  },

  // NEW: Hybrid Integration Configuration
  "hybrid": {
    "enabled": true,
    "mode": "auto", // "disabled" | "simple" | "mcp" | "auto" | "hybrid"
    "mcp_server_path": "npx claude-flow mcp start",
    "fallback_strategy": "graceful_degradation",
    "performance_mode": "balanced" // "performance" | "balanced" | "comprehensive"
  },

  // NEW: Swarm Configuration
  "swarm": {
    "enabled": true,
    "auto_spawn": {
      "enabled": true,
      "file_threshold": 3,
      "complexity_threshold": 0.6,
      "task_types": ["research", "analysis", "multi_component"]
    },
    "default_topology": "hierarchical",
    "max_agents": 8,
    "agent_timeout": 300000,
    "coordination_strategy": "hybrid",
    "memory_namespace": "hybrid_swarm",
    "persistent_state": true
  },

  // NEW: Agent Integration
  "agent_integration": {
    "inherit_from_hooks": true,
    "auto_capability_detection": true,
    "profile_enhancement": true,
    "cross_session_learning": true,
    "mcp_agent_mapping": {
      "researcher": {
        "mcp_type": "researcher",
        "capabilities": ["web-search", "analysis", "documentation"],
        "spawn_triggers": ["research_task", "information_gathering"]
      },
      "coder": {
        "mcp_type": "coder",
        "capabilities": ["implementation", "testing", "refactoring"],
        "spawn_triggers": ["code_generation", "implementation_task"]
      },
      "analyst": {
        "mcp_type": "analyst",
        "capabilities": ["evaluation", "metrics", "performance"],
        "spawn_triggers": ["analysis_task", "evaluation_request"]
      },
      "tester": {
        "mcp_type": "tester",
        "capabilities": ["testing", "validation", "quality_assurance"],
        "spawn_triggers": ["testing_task", "validation_request"]
      },
      "coordinator": {
        "mcp_type": "coordinator",
        "capabilities": ["orchestration", "management", "coordination"],
        "spawn_triggers": ["complex_task", "multi_agent_coordination"]
      }
    }
  },

  // NEW: Performance Optimization
  "optimization": {
    "lazy_mcp_init": true,
    "agent_pooling": true,
    "memory_caching": true,
    "batch_operations": true,
    "parallel_execution": true,
    "smart_prefetching": false
  }
}
```

### 1.2 Enhanced hook-profiles.json Structure

```json
{
  "profiles": {
    "researcher": {
      "description": "Research-focused agent workflow",
      "pre-hooks": ["memory-sync", "session-restore"],
      "post-hooks": ["memory-sync", "performance"],
      "timeout": 2000,
      "hooks": {
        "start": "pre-task --description 'Research task' --auto-spawn-agents false",
        "update": "post-edit --memory-key 'research/findings'",
        "complete": "post-task --analyze-performance true"
      },

      // NEW: MCP Integration Extensions
      "mcp_integration": {
        "enabled": true,
        "agent_config": {
          "type": "researcher",
          "capabilities": ["web-search", "analysis", "documentation", "synthesis"],
          "specializations": ["literature_review", "data_gathering", "insight_generation"]
        },
        "spawn_conditions": {
          "file_count_threshold": 2,
          "task_keywords": ["research", "analyze", "investigate", "study"],
          "complexity_threshold": 0.4
        },
        "coordination_preferences": {
          "communication_style": "collaborative",
          "reporting_frequency": "high",
          "memory_usage_pattern": "research_namespace"
        },
        "tool_preferences": [
          "memory_usage", "memory_search", "task_orchestrate",
          "performance_report", "agent_communicate"
        ]
      }
    },

    "coder": {
      "description": "Code implementation workflow",
      "pre-hooks": ["pre-edit"],
      "post-hooks": ["post-edit", "performance"],
      "timeout": 3000,
      "hooks": {
        "start": "pre-task --description 'Code implementation' --requires-testing true",
        "update": "post-edit --format --analyze",
        "complete": "post-task --generate-report true"
      },

      "mcp_integration": {
        "enabled": true,
        "agent_config": {
          "type": "coder",
          "capabilities": ["implementation", "testing", "refactoring", "optimization"],
          "specializations": ["frontend", "backend", "fullstack", "testing"]
        },
        "spawn_conditions": {
          "file_count_threshold": 3,
          "task_keywords": ["implement", "code", "develop", "build", "create"],
          "has_code_files": true,
          "complexity_threshold": 0.5
        },
        "coordination_preferences": {
          "communication_style": "technical",
          "code_review_enabled": true,
          "testing_integration": true
        },
        "tool_preferences": [
          "task_orchestrate", "agent_communicate", "memory_usage",
          "quality_assess", "performance_report"
        ]
      }
    }
  },

  // NEW: Global MCP Integration Settings
  "mcp_global": {
    "auto_coordination": true,
    "memory_sharing": true,
    "cross_profile_communication": true,
    "performance_tracking": true,
    "neural_learning": true
  }
}
```

## Layer 2: Hook-MCP Integration Bridge

### 2.1 HybridHookExecutor Implementation

```javascript
// src/hybrid/hybrid-hook-executor.js
import { MCPClient } from '../mcp/mcp-client.js';
import { TaskComplexityAnalyzer } from './task-complexity-analyzer.js';
import { AgentInheritanceMapper } from './agent-inheritance-mapper.js';

export class HybridHookExecutor {
  constructor(settings) {
    this.settings = settings;
    this.mcpClient = new MCPClient();
    this.complexityAnalyzer = new TaskComplexityAnalyzer(settings);
    this.agentMapper = new AgentInheritanceMapper(settings);
    this.activeSwarms = new Map();
    this.agentPool = new Map();
  }

  async executeHook(hookType, context) {
    try {
      // Analyze execution strategy
      const strategy = await this.determineExecutionStrategy(hookType, context);

      // Log strategy decision
      console.log(`[HybridHook] Strategy: ${strategy.type} for ${hookType}`);

      switch (strategy.type) {
        case 'direct':
          return await this.executeDirectHook(hookType, context);

        case 'hybrid':
          return await this.executeHybridHook(hookType, context, strategy);

        case 'mcp_swarm':
          return await this.executeMCPSwarmHook(hookType, context, strategy);

        default:
          return await this.executeDirectHook(hookType, context);
      }
    } catch (error) {
      console.error(`[HybridHook] Error executing ${hookType}:`, error);
      // Graceful degradation to direct hooks
      return await this.executeDirectHook(hookType, context);
    }
  }

  async determineExecutionStrategy(hookType, context) {
    if (!this.settings.hybrid?.enabled) {
      return { type: 'direct', reason: 'hybrid_disabled' };
    }

    const complexity = await this.complexityAnalyzer.analyze(context);

    // Strategy decision matrix
    if (complexity.score >= 0.8 || complexity.isResearchTask) {
      return {
        type: 'mcp_swarm',
        reason: 'high_complexity',
        complexity: complexity
      };
    } else if (complexity.score >= 0.4 && complexity.fileCount >= 3) {
      return {
        type: 'hybrid',
        reason: 'medium_complexity',
        complexity: complexity
      };
    } else {
      return {
        type: 'direct',
        reason: 'low_complexity',
        complexity: complexity
      };
    }
  }

  async executeDirectHook(hookType, context) {
    // Execute existing hook system unchanged
    return await this.standardHookExecutor.execute(hookType, context);
  }

  async executeHybridHook(hookType, context, strategy) {
    // Pre-hook: Initialize light MCP coordination
    const coordination = await this.initializeLightCoordination(context);

    // Execute hook with MCP memory and basic coordination
    const result = await this.executeEnhancedHook(hookType, context, coordination);

    // Post-hook: Store results in MCP memory
    await this.storeMCPResults(result, coordination);

    return result;
  }

  async executeMCPSwarmHook(hookType, context, strategy) {
    // Initialize or reuse swarm
    const swarm = await this.getOrCreateSwarm(context, strategy.complexity);

    // Spawn agents based on hook profiles
    const agents = await this.spawnAgentsFromProfiles(swarm, context);

    // Orchestrate swarm execution
    const result = await this.orchestrateSwarmExecution(
      swarm, agents, hookType, context
    );

    // Update swarm state
    await this.updateSwarmState(swarm, result);

    return result;
  }

  async getOrCreateSwarm(context, complexity) {
    const swarmKey = this.generateSwarmKey(context);

    if (this.activeSwarms.has(swarmKey)) {
      return this.activeSwarms.get(swarmKey);
    }

    // Initialize new swarm via MCP
    const swarmConfig = {
      topology: this.selectOptimalTopology(complexity),
      maxAgents: Math.min(complexity.recommendedAgents, this.settings.swarm.max_agents),
      strategy: complexity.isResearchTask ? 'research' : 'auto'
    };

    const swarmResult = await this.mcpClient.call('swarm_init', swarmConfig);
    const swarm = {
      id: swarmResult.swarmId,
      config: swarmConfig,
      agents: new Map(),
      memory: swarmResult.memoryId
    };

    this.activeSwarms.set(swarmKey, swarm);
    return swarm;
  }

  async spawnAgentsFromProfiles(swarm, context) {
    const profileNames = this.determineRequiredProfiles(context);
    const agents = [];

    for (const profileName of profileNames) {
      const agent = await this.agentMapper.spawnFromProfile(
        profileName, swarm.id, context
      );
      agents.push(agent);
      swarm.agents.set(agent.agentId, agent);
    }

    return agents;
  }

  selectOptimalTopology(complexity) {
    if (complexity.isResearchTask) return 'mesh';
    if (complexity.fileCount > 10) return 'hierarchical';
    if (complexity.requiresCollaboration) return 'mesh';
    return 'hierarchical';
  }
}
```

### 2.2 Task Complexity Analyzer

```javascript
// src/hybrid/task-complexity-analyzer.js
export class TaskComplexityAnalyzer {
  constructor(settings) {
    this.settings = settings;
    this.learningModel = new ComplexityLearningModel();
  }

  async analyze(context) {
    const factors = await this.extractFactors(context);
    const score = this.calculateComplexityScore(factors);
    const recommendations = this.generateRecommendations(factors, score);

    return {
      score: score,
      factors: factors,
      recommendations: recommendations,
      fileCount: factors.fileCount,
      isResearchTask: factors.isResearchTask,
      requiresCollaboration: factors.requiresCollaboration,
      recommendedAgents: recommendations.agentCount,
      executionStrategy: recommendations.strategy
    };
  }

  async extractFactors(context) {
    return {
      // File-based factors
      fileCount: context.files?.length || 0,
      fileTypes: this.analyzeFileTypes(context.files || []),
      codeComplexity: await this.analyzeCodeComplexity(context.files || []),

      // Task-based factors
      operationType: context.operation || 'unknown',
      taskKeywords: this.extractTaskKeywords(context.description || ''),
      isResearchTask: this.isResearchTask(context),
      isAnalysisTask: this.isAnalysisTask(context),

      // Context factors
      hasTests: this.hasTestFiles(context.files || []),
      hasDocumentation: this.hasDocFiles(context.files || []),
      requiresCollaboration: this.requiresCollaboration(context),

      // Historical factors
      previousExecutions: await this.getPreviousExecutions(context),
      userPreferences: this.getUserPreferences(context)
    };
  }

  calculateComplexityScore(factors) {
    let score = 0;

    // File complexity contribution (0-0.3)
    score += Math.min(factors.fileCount / 20, 0.3);

    // Code complexity contribution (0-0.25)
    score += factors.codeComplexity * 0.25;

    // Task type contribution (0-0.25)
    if (factors.isResearchTask) score += 0.25;
    else if (factors.isAnalysisTask) score += 0.2;

    // Collaboration requirement (0-0.2)
    if (factors.requiresCollaboration) score += 0.2;

    // Apply learning model adjustments
    score = this.learningModel.adjust(score, factors);

    return Math.min(score, 1.0);
  }

  generateRecommendations(factors, score) {
    const recommendations = {
      strategy: 'direct',
      agentCount: 1,
      topology: 'single',
      tools: [],
      reasoning: []
    };

    if (score >= 0.8) {
      recommendations.strategy = 'mcp_swarm';
      recommendations.agentCount = Math.min(
        Math.ceil(factors.fileCount / 3) + 2,
        this.settings.swarm.max_agents
      );
      recommendations.topology = factors.isResearchTask ? 'mesh' : 'hierarchical';
      recommendations.reasoning.push('High complexity requires full swarm coordination');
    } else if (score >= 0.4) {
      recommendations.strategy = 'hybrid';
      recommendations.agentCount = Math.min(factors.fileCount, 4);
      recommendations.topology = 'hierarchical';
      recommendations.reasoning.push('Medium complexity benefits from coordination');
    } else {
      recommendations.reasoning.push('Low complexity suitable for direct execution');
    }

    return recommendations;
  }
}
```

### 2.3 Agent Inheritance Mapper

```javascript
// src/hybrid/agent-inheritance-mapper.js
export class AgentInheritanceMapper {
  constructor(settings) {
    this.settings = settings;
    this.hookProfiles = settings.hookProfiles || {};
    this.mcpClient = new MCPClient();
  }

  async spawnFromProfile(profileName, swarmId, context) {
    const hookProfile = this.getHookProfile(profileName);
    const mcpConfig = this.buildMCPAgentConfig(hookProfile, profileName, context);

    // Spawn agent via MCP
    const agent = await this.mcpClient.call('agent_spawn', {
      ...mcpConfig,
      swarmId: swarmId
    });

    // Enhance agent with hook profile capabilities
    await this.enhanceAgentCapabilities(agent, hookProfile, context);

    return agent;
  }

  buildMCPAgentConfig(hookProfile, profileName, context) {
    const mcpIntegration = hookProfile.mcp_integration || {};
    const agentConfig = mcpIntegration.agent_config || {};

    return {
      type: agentConfig.type || profileName,
      name: `${profileName}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      capabilities: this.enhanceCapabilities(
        agentConfig.capabilities || [],
        context,
        hookProfile
      ),
      specializations: agentConfig.specializations || [],
      coordination_preferences: mcpIntegration.coordination_preferences || {},
      tool_preferences: mcpIntegration.tool_preferences || []
    };
  }

  enhanceCapabilities(baseCapabilities, context, hookProfile) {
    const enhanced = [...baseCapabilities];

    // Context-aware enhancements
    if (context.files?.some(f => f.endsWith('.test.js'))) {
      enhanced.push('testing');
    }
    if (context.files?.some(f => f.endsWith('.md'))) {
      enhanced.push('documentation');
    }
    if (context.operation === 'analysis') {
      enhanced.push('analysis', 'metrics');
    }

    // Hook profile enhancements
    if (hookProfile.hooks?.update?.includes('--format')) {
      enhanced.push('code-formatting');
    }
    if (hookProfile.hooks?.complete?.includes('--analyze-performance')) {
      enhanced.push('performance-analysis');
    }

    return [...new Set(enhanced)]; // Remove duplicates
  }

  async enhanceAgentCapabilities(agent, hookProfile, context) {
    // Store hook profile data in MCP memory for agent access
    await this.mcpClient.call('memory_usage', {
      action: 'store',
      key: `agent/${agent.agentId}/hook_profile`,
      value: JSON.stringify({
        profile: hookProfile,
        context: context,
        enhanced_capabilities: agent.capabilities
      }),
      namespace: 'agent_inheritance'
    });

    return agent;
  }
}
```

## Layer 3: Performance Optimization

### 3.1 Lazy MCP Initialization

```javascript
// src/hybrid/lazy-mcp-client.js
export class LazyMCPClient {
  constructor(settings) {
    this.settings = settings;
    this.client = null;
    this.initPromise = null;
    this.isInitializing = false;
  }

  async ensureInitialized() {
    if (this.client) return this.client;

    if (this.isInitializing) {
      return await this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.initializeMCP();

    try {
      this.client = await this.initPromise;
      return this.client;
    } finally {
      this.isInitializing = false;
    }
  }

  async initializeMCP() {
    console.log('[LazyMCP] Initializing MCP client...');

    // Start MCP server if not running
    const serverProcess = await this.startMCPServer();

    // Connect to MCP server
    const client = new MCPClient({
      serverPath: this.settings.hybrid.mcp_server_path,
      timeout: 10000
    });

    await client.connect();

    console.log('[LazyMCP] MCP client initialized successfully');
    return client;
  }

  async call(toolName, args) {
    const client = await this.ensureInitialized();
    return await client.call(toolName, args);
  }
}
```

### 3.2 Agent Pooling System

```javascript
// src/hybrid/agent-pool.js
export class AgentPool {
  constructor(settings) {
    this.settings = settings;
    this.pools = new Map(); // profileName -> agents[]
    this.activeAgents = new Map(); // agentId -> agent
    this.maxPoolSize = settings.optimization?.agent_pool_size || 5;
  }

  async getAgent(profileName, swarmId, context) {
    const poolKey = this.generatePoolKey(profileName, context);

    // Try to reuse existing agent from pool
    if (this.pools.has(poolKey)) {
      const pool = this.pools.get(poolKey);
      const availableAgent = pool.find(agent => !agent.busy);

      if (availableAgent) {
        availableAgent.busy = true;
        availableAgent.swarmId = swarmId;
        return availableAgent;
      }
    }

    // Create new agent if pool empty or all busy
    const agent = await this.createAgent(profileName, swarmId, context);
    this.addToPool(poolKey, agent);

    return agent;
  }

  async releaseAgent(agentId) {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.busy = false;
      agent.swarmId = null;
      // Agent remains in pool for reuse
    }
  }

  generatePoolKey(profileName, context) {
    // Generate key based on profile and context characteristics
    const contextSig = this.generateContextSignature(context);
    return `${profileName}:${contextSig}`;
  }
}
```

## Layer 4: Testing and Validation Framework

### 4.1 Integration Test Suite

```javascript
// tests/hybrid/integration.test.js
describe('Hybrid Integration', () => {
  let hybridExecutor;
  let mockMCPClient;

  beforeEach(() => {
    mockMCPClient = new MockMCPClient();
    hybridExecutor = new HybridHookExecutor({
      hybrid: { enabled: true },
      swarm: { max_agents: 5, auto_spawn: { file_threshold: 3 } }
    });
  });

  describe('Execution Strategy Selection', () => {
    test('selects direct execution for simple tasks', async () => {
      const context = { files: ['single-file.js'], operation: 'edit' };
      const strategy = await hybridExecutor.determineExecutionStrategy('PreToolUse', context);

      expect(strategy.type).toBe('direct');
      expect(strategy.reason).toBe('low_complexity');
    });

    test('selects hybrid execution for medium complexity', async () => {
      const context = {
        files: ['file1.js', 'file2.js', 'file3.js'],
        operation: 'refactor'
      };
      const strategy = await hybridExecutor.determineExecutionStrategy('PreToolUse', context);

      expect(strategy.type).toBe('hybrid');
      expect(strategy.reason).toBe('medium_complexity');
    });

    test('selects MCP swarm for high complexity', async () => {
      const context = {
        files: Array.from({length: 10}, (_, i) => `file${i}.js`),
        operation: 'analysis',
        description: 'research and analyze system architecture'
      };
      const strategy = await hybridExecutor.determineExecutionStrategy('PreToolUse', context);

      expect(strategy.type).toBe('mcp_swarm');
      expect(strategy.reason).toBe('high_complexity');
    });
  });

  describe('Agent Inheritance', () => {
    test('maps hook profiles to MCP agents correctly', async () => {
      const mapper = new AgentInheritanceMapper({
        hookProfiles: {
          researcher: {
            mcp_integration: {
              agent_config: {
                type: 'researcher',
                capabilities: ['analysis', 'research']
              }
            }
          }
        }
      });

      const context = { files: ['research.md'], operation: 'analysis' };
      const agent = await mapper.spawnFromProfile('researcher', 'swarm123', context);

      expect(agent.type).toBe('researcher');
      expect(agent.capabilities).toContain('analysis');
      expect(agent.capabilities).toContain('research');
    });
  });

  describe('Backward Compatibility', () => {
    test('existing hook configurations work unchanged', async () => {
      const legacySettings = {
        hooks: {
          PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'format' }] }]
        },
        hybrid: { enabled: false }
      };

      const executor = new HybridHookExecutor(legacySettings);
      const context = { files: ['test.js'], operation: 'write' };

      const result = await executor.executeHook('PreToolUse', context);
      // Should execute legacy hook without MCP integration
      expect(result.strategy).toBe('direct');
    });
  });
});
```

## Deployment and Migration Strategy

### 4.1 Phased Rollout

```javascript
// src/hybrid/migration-manager.js
export class MigrationManager {
  async performMigration(currentVersion, targetVersion) {
    const migrations = this.getMigrationPath(currentVersion, targetVersion);

    for (const migration of migrations) {
      console.log(`[Migration] Applying ${migration.name}...`);
      await migration.apply();
      console.log(`[Migration] ${migration.name} completed`);
    }
  }

  getMigrationPath(from, to) {
    // Define migration steps
    const migrations = [
      {
        name: 'add-hybrid-config',
        version: '2.1.0',
        apply: async () => {
          await this.addHybridConfigurationSection();
        }
      },
      {
        name: 'enhance-hook-profiles',
        version: '2.1.1',
        apply: async () => {
          await this.enhanceHookProfilesWithMCP();
        }
      },
      {
        name: 'initialize-agent-pools',
        version: '2.2.0',
        apply: async () => {
          await this.initializeAgentPooling();
        }
      }
    ];

    return migrations.filter(m =>
      this.compareVersions(m.version, from) > 0 &&
      this.compareVersions(m.version, to) <= 0
    );
  }
}
```

This technical specification provides the detailed implementation framework for the hybrid integration architecture, ensuring both systems can work together seamlessly while preserving their individual strengths and maintaining backward compatibility.
