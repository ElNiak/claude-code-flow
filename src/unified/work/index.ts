/**
 * Unified Work Command System
 * 
 * A comprehensive system that replaces 50+ individual commands with a single
 * intelligent work command that analyzes tasks and coordinates optimal execution.
 */

// Core components
export { WorkCommand, createWorkCommand } from './work-command.js';
export { TaskAnalyzer } from './task-analyzer.js';
export { ConfigManager } from './config-manager.js';
export { PresetManager } from './preset-manager.js';

// Type exports
export type {
  // Core options and configuration
  WorkOptions,
  WorkConfig,
  EnvironmentConfig,
  ConfigSchema,

  // Task analysis
  TaskInput,
  TaskAnalysis,
  TaskComplexity,
  AgentTopology,
  ExecutionStrategy,

  // Execution planning
  ExecutionPlan,
  ExecutionStep,
  CoordinationConfig,
  CoordinationResult,

  // Presets
  WorkPreset,
  PresetDefinition,
  PresetMetadata,
  CustomPreset,

  // Agent configuration
  AgentConfig,

  // Context analysis
  ProjectContext,
  SystemContext,

  // Metrics and monitoring
  ExecutionMetrics,
  PerformanceMetrics,
  ProgressUpdate,

  // Session management
  WorkSession,

  // Error handling
  WorkError,
  ErrorRecovery,

  // Integrations
  MCPIntegration,
  GitIntegration,
  CacheConfig,

  // Validation
  ValidationRule,
  ValidationResult,

  // Hooks
  HookEvent,
  HookHandler,

  // Neural patterns (future)
  NeuralPattern,
  LearningData,

  // Search and filtering
  SearchFilter,
  SortOptions,

  // Aggregated types
  WorkCommandTypes
} from './types.js';

// Constants and defaults
export const WORK_COMMAND_VERSION = '1.0.0';
export const DEFAULT_AGENT_COUNT = 4;
export const DEFAULT_TOPOLOGY = 'mesh';
export const DEFAULT_STRATEGY = 'adaptive';

// Utility functions
export const createDefaultWorkConfig = () => ({
  coordination: {
    defaultAgents: DEFAULT_AGENT_COUNT,
    maxAgents: 12,
    defaultTopology: DEFAULT_TOPOLOGY,
    defaultStrategy: DEFAULT_STRATEGY,
    timeoutMs: 300000,
    retryAttempts: 3
  },
  features: {
    enableMemory: true,
    enableHooks: true,
    autoOptimize: true,
    enableMetrics: true,
    enableCaching: true
  },
  analysis: {
    complexityThresholds: {
      low: 10,
      medium: 25,
      high: 40
    },
    confidenceThreshold: 70,
    maxKeywords: 20,
    enableContextAnalysis: true
  },
  execution: {
    parallelSteps: true,
    failFast: true,
    saveProgress: true,
    enableRollback: true,
    maxExecutionTime: 7200000
  },
  logging: {
    level: 'info' as const,
    format: 'text' as const,
    destination: 'console' as const,
    debug: false
  },
  presets: {},
  paths: {
    configDir: '.claude',
    dataDir: '.claude/data',
    logsDir: '.claude/logs',
    cacheDir: '.claude/cache'
  }
});

// Factory functions for common configurations
export const createDevelopmentConfig = () => ({
  ...createDefaultWorkConfig(),
  coordination: {
    ...createDefaultWorkConfig().coordination,
    defaultAgents: 4,
    defaultTopology: 'hierarchical' as const,
    defaultStrategy: 'parallel' as const
  }
});

export const createResearchConfig = () => ({
  ...createDefaultWorkConfig(),
  coordination: {
    ...createDefaultWorkConfig().coordination,
    defaultAgents: 3,
    defaultTopology: 'mesh' as const,
    defaultStrategy: 'adaptive' as const
  }
});

export const createDeploymentConfig = () => ({
  ...createDefaultWorkConfig(),
  coordination: {
    ...createDefaultWorkConfig().coordination,
    defaultAgents: 3,
    defaultTopology: 'ring' as const,
    defaultStrategy: 'sequential' as const
  }
});

// Built-in task type detection patterns
export const TASK_PATTERNS = {
  development: [
    'build', 'create', 'implement', 'develop', 'code', 'api', 'app', 
    'system', 'feature', 'component', 'module', 'service'
  ],
  research: [
    'research', 'analyze', 'study', 'investigate', 'explore', 'find', 
    'discover', 'survey', 'review', 'compare'
  ],
  deployment: [
    'deploy', 'release', 'publish', 'ship', 'production', 'server', 
    'host', 'launch', 'distribute'
  ],
  optimization: [
    'optimize', 'improve', 'fix', 'debug', 'performance', 'speed', 
    'memory', 'refactor', 'enhance'
  ],
  testing: [
    'test', 'validate', 'verify', 'check', 'qa', 'quality', 
    'assertion', 'coverage', 'integration'
  ]
};

// Built-in complexity indicators
export const COMPLEXITY_INDICATORS = {
  high: [
    'multiple', 'complex', 'advanced', 'enterprise', 'scalable', 
    'distributed', 'microservices', 'architecture'
  ],
  medium: [
    'integration', 'api', 'database', 'auth', 'security', 
    'performance', 'optimization'
  ],
  low: [
    'simple', 'basic', 'quick', 'small', 'minimal', 'prototype'
  ]
};

// Resource mapping for different task types
export const RESOURCE_MAPPING = {
  development: ['code_generation', 'testing', 'file_operations', 'git_operations'],
  research: ['web_search', 'analysis', 'documentation'],
  deployment: ['system_operations', 'monitoring', 'validation'],
  optimization: ['profiling', 'analysis', 'benchmarking'],
  testing: ['test_execution', 'validation', 'reporting']
};

// Agent type recommendations
export const AGENT_RECOMMENDATIONS = {
  development: ['architect', 'coder', 'tester', 'coordinator'],
  research: ['researcher', 'analyst', 'coordinator'],
  deployment: ['devops', 'monitor', 'coordinator'],
  optimization: ['analyzer', 'optimizer', 'coordinator'],
  testing: ['tester', 'validator', 'coordinator']
};

// Example usage documentation
export const USAGE_EXAMPLES = [
  {
    command: 'work "build a REST API with authentication"',
    description: 'Automatically detects development task, spawns 4 agents in hierarchical topology',
    expectedResult: 'Complete API implementation with auth, tests, and documentation'
  },
  {
    command: 'work "research machine learning frameworks" --preset research',
    description: 'Uses research preset with 3 agents in mesh topology for comprehensive analysis',
    expectedResult: 'Detailed research report comparing ML frameworks'
  },
  {
    command: 'work "deploy to production" --agents 3 --strategy sequential',
    description: 'Custom deployment with specific agent count and sequential execution',
    expectedResult: 'Safe production deployment with validation and monitoring'
  },
  {
    command: 'work "optimize database performance" --auto-optimize',
    description: 'Performance optimization with AI-assisted decision making',
    expectedResult: 'Optimized database with performance benchmarks'
  }
];

// Integration helpers
export const createMCPIntegration = (tools: string[] = []) => ({
  enabled: true,
  tools: [
    'mcp__claude-flow__swarm_init',
    'mcp__claude-flow__agent_spawn',
    'mcp__claude-flow__task_orchestrate',
    'mcp__claude-flow__memory_usage',
    'mcp__claude-flow__swarm_monitor',
    ...tools
  ],
  configuration: {}
});

export const createGitIntegration = (autoCommit = false) => ({
  enabled: true,
  autoCommit,
  autoCommitMessage: 'feat: unified work command implementation 🤖',
  branchStrategy: 'feature' as const,
  requireCleanRepo: false
});

// Validation helpers
export const validateWorkOptions = (options: WorkOptions): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (options.agents && (options.agents < 1 || options.agents > 20)) {
    errors.push('Agent count must be between 1 and 20');
  }

  if (options.topology && !['mesh', 'hierarchical', 'ring', 'star', 'auto'].includes(options.topology)) {
    errors.push('Invalid topology. Must be: mesh, hierarchical, ring, star, or auto');
  }

  if (options.strategy && !['parallel', 'sequential', 'adaptive'].includes(options.strategy)) {
    errors.push('Invalid strategy. Must be: parallel, sequential, or adaptive');
  }

  if (options.output && !['text', 'json', 'yaml'].includes(options.output)) {
    warnings.push('Invalid output format. Defaulting to text');
  }

  if (options.agents && options.agents > 8) {
    suggestions.push('Consider using fewer agents for better performance');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
};

// Quick start guide
export const QUICK_START_GUIDE = `
# Claude Flow Unified Work Command

## Quick Start

1. **Basic Usage**
   \`\`\`bash
   npx claude-flow@alpha work "your task description"
   \`\`\`

2. **With Preset**
   \`\`\`bash
   npx claude-flow@alpha work "build an API" --preset development
   \`\`\`

3. **Custom Configuration**
   \`\`\`bash
   npx claude-flow@alpha work "deploy app" --agents 3 --topology ring --strategy sequential
   \`\`\`

4. **Dry Run (Preview)**
   \`\`\`bash
   npx claude-flow@alpha work "complex task" --dry-run
   \`\`\`

## Available Presets
- \`development\` - Software development tasks
- \`research\` - Research and analysis
- \`deployment\` - Production deployment
- \`optimization\` - Performance optimization
- \`testing\` - Quality assurance
- \`api\` - REST API development
- \`data-analysis\` - Data analysis workflows
- \`ml\` - Machine learning projects

## Configuration
Create \`claude-flow.config.json\` in your project root for custom defaults.

## Environment Variables
- \`CLAUDE_FLOW_AGENTS\` - Default agent count
- \`CLAUDE_FLOW_TOPOLOGY\` - Default topology
- \`CLAUDE_FLOW_STRATEGY\` - Default strategy
- \`CLAUDE_FLOW_LOG_LEVEL\` - Logging level
`;

// Export everything for easy consumption
export default {
  WorkCommand,
  TaskAnalyzer,
  ConfigManager,
  PresetManager,
  createWorkCommand,
  createDefaultWorkConfig,
  WORK_COMMAND_VERSION,
  USAGE_EXAMPLES,
  QUICK_START_GUIDE
};