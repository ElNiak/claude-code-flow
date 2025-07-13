# CLI Implementation Specification

## Implementation Architecture

### Core Components

#### 1. WorkCommand Class
```typescript
// src/cli/commands/work/index.ts
export class WorkCommand {
  private configManager: ConfigurationManager;
  private presetSelector: PresetSelector;
  private workflowExecutor: WorkflowExecutor;
  
  constructor() {
    this.configManager = new ConfigurationManager();
    this.presetSelector = new PresetSelector();
    this.workflowExecutor = new WorkflowExecutor();
  }
  
  async execute(args: string[], options: WorkOptions): Promise<void> {
    try {
      // 1. Parse and validate arguments
      const { preset, task, flags } = this.parseArguments(args, options);
      
      // 2. Load configuration with smart defaults
      const config = await this.loadConfiguration(preset, task, flags);
      
      // 3. Initialize workflow executor
      const executor = new WorkflowExecutor(config);
      
      // 4. Execute workflow
      await executor.run(task);
      
    } catch (error) {
      await this.handleError(error, options);
    }
  }
  
  private parseArguments(args: string[], options: WorkOptions): ParsedArgs {
    // Handle different argument patterns:
    // work "task description"
    // work preset "task description"  
    // work --preset preset "task description"
    
    let preset: string | undefined;
    let task: string | undefined;
    
    if (options.preset) {
      preset = options.preset;
      task = args[0];
    } else if (args.length >= 2 && !args[0].startsWith('"')) {
      preset = args[0];
      task = args[1];
    } else {
      task = args[0];
    }
    
    return { preset, task, flags: options };
  }
}
```

#### 2. Configuration Management System
```typescript
// src/cli/commands/work/config-manager.ts
export class ConfigurationManager {
  private static readonly CONFIG_PATHS = [
    '.claude/work-config.json',      // Project level
    '~/.claude/work-config.json',    // User level
    '/etc/claude/work-config.json'   // System level
  ];
  
  async loadConfiguration(preset?: string, task?: string, overrides?: Partial<WorkConfig>): Promise<WorkConfig> {
    // 1. Load base configuration
    const baseConfig = await this.loadBaseConfig();
    
    // 2. Apply preset if specified
    if (preset) {
      const presetConfig = await this.loadPreset(preset);
      baseConfig.merge(presetConfig);
    } else if (task) {
      // 3. Auto-select preset based on task analysis
      const detectedPreset = await this.detectPreset(task);
      if (detectedPreset) {
        const presetConfig = await this.loadPreset(detectedPreset);
        baseConfig.merge(presetConfig);
      }
    }
    
    // 4. Apply command-line overrides
    if (overrides) {
      baseConfig.merge(overrides);
    }
    
    // 5. Validate final configuration
    return this.validateConfig(baseConfig);
  }
  
  private async loadBaseConfig(): Promise<WorkConfig> {
    const configs: Partial<WorkConfig>[] = [];
    
    // Load from all available sources
    for (const path of ConfigurationManager.CONFIG_PATHS) {
      try {
        const config = await this.loadConfigFile(path);
        configs.push(config);
      } catch {
        // Continue if file doesn't exist
      }
    }
    
    // Merge configurations (later sources override earlier ones)
    return WorkConfig.merge(...configs);
  }
  
  private async detectPreset(task: string): Promise<string | undefined> {
    const analysis = await this.analyzeTask(task);
    return this.matchPreset(analysis);
  }
  
  private async analyzeTask(task: string): Promise<TaskAnalysis> {
    // Extract keywords and patterns
    const keywords = this.extractKeywords(task);
    const patterns = this.identifyPatterns(task);
    const complexity = this.estimateComplexity(task);
    
    return { keywords, patterns, complexity };
  }
  
  private matchPreset(analysis: TaskAnalysis): string | undefined {
    const presetMatchers = {
      'api': /\b(api|rest|endpoint|server|backend|auth|database)\b/i,
      'web': /\b(web|frontend|react|vue|angular|ui|component)\b/i,
      'research': /\b(research|analyze|study|investigate|explore)\b/i,
      'deployment': /\b(deploy|release|ci|cd|production|infrastructure)\b/i,
      'testing': /\b(test|qa|quality|validation|coverage)\b/i,
      'security': /\b(security|audit|vulnerability|compliance|encryption)\b/i,
      'performance': /\b(optimize|performance|speed|efficiency|benchmark)\b/i,
      'data': /\b(data|analytics|etl|pipeline|warehouse|ml|ai)\b/i
    };
    
    for (const [preset, pattern] of Object.entries(presetMatchers)) {
      if (pattern.test(analysis.keywords.join(' '))) {
        return preset;
      }
    }
    
    return undefined;
  }
}
```

#### 3. Preset Definitions
```typescript
// src/cli/commands/work/presets/index.ts
export const BUILT_IN_PRESETS: Record<string, PresetDefinition> = {
  auto: {
    description: "Automatically detect best workflow",
    agents: [],
    autoSpawn: true,
    agentSelection: 'auto'
  },
  
  api: {
    description: "REST API development workflow",
    maxAgents: 8,
    topology: 'hierarchical',
    agents: [
      { type: 'architect', priority: 'high' },
      { type: 'coder', priority: 'high', count: 2 },
      { type: 'tester', priority: 'medium' },
      { type: 'reviewer', priority: 'medium' },
      { type: 'security', priority: 'low' }
    ],
    sparc: {
      enabled: true,
      modes: ['code', 'tdd', 'integration', 'security-review'],
      autoMode: true
    },
    swarm: {
      strategy: 'development',
      coordination: 'hierarchical',
      memory: {
        enabled: true,
        persistence: 'session'
      }
    },
    tools: ['database', 'testing', 'documentation'],
    hooks: {
      preTask: ['validation', 'environment-check'],
      postEdit: ['format', 'lint', 'test'],
      postTask: ['documentation', 'deployment-check']
    }
  },
  
  research: {
    description: "Research and analysis workflow",
    maxAgents: 4,
    topology: 'mesh',
    agents: [
      { type: 'researcher', priority: 'high', count: 2 },
      { type: 'analyst', priority: 'high' },
      { type: 'reviewer', priority: 'medium' }
    ],
    tools: ['web-search', 'data-analysis', 'documentation'],
    outputFormat: 'report',
    swarm: {
      strategy: 'research',
      coordination: 'distributed'
    }
  },
  
  deployment: {
    description: "Deployment and operations workflow",
    maxAgents: 6,
    topology: 'star',
    agents: [
      { type: 'devops', priority: 'high' },
      { type: 'security', priority: 'high' },
      { type: 'monitor', priority: 'medium' },
      { type: 'tester', priority: 'medium' }
    ],
    github: {
      enabled: true,
      workflows: ['ci-cd', 'security-scan', 'deployment']
    },
    tools: ['docker', 'kubernetes', 'monitoring']
  }
};
```

#### 4. Workflow Executor
```typescript
// src/cli/commands/work/executor.ts
export class WorkflowExecutor {
  private config: WorkConfig;
  private swarmManager: SwarmManager;
  private outputHandler: OutputHandler;
  
  constructor(config: WorkConfig) {
    this.config = config;
    this.swarmManager = new SwarmManager(config.swarm);
    this.outputHandler = new OutputHandler(config.outputFormat);
  }
  
  async run(task?: string): Promise<WorkflowResult> {
    // 1. Initialize execution context
    const context = await this.initializeContext(task);
    
    // 2. Setup swarm topology
    await this.swarmManager.initialize(this.config.topology, this.config.maxAgents);
    
    // 3. Spawn agents according to configuration
    const agents = await this.spawnAgents();
    
    // 4. Execute pre-task hooks
    await this.executeHooks('preTask', context);
    
    // 5. Execute main workflow
    const result = await this.executeWorkflow(task, agents, context);
    
    // 6. Execute post-task hooks
    await this.executeHooks('postTask', { ...context, result });
    
    // 7. Generate output
    await this.outputHandler.generate(result);
    
    return result;
  }
  
  private async spawnAgents(): Promise<Agent[]> {
    const agents: Agent[] = [];
    
    for (const agentConfig of this.config.agents) {
      const count = agentConfig.count || 1;
      
      for (let i = 0; i < count; i++) {
        const agent = await this.createAgent(agentConfig);
        agents.push(agent);
      }
    }
    
    return agents;
  }
  
  private async createAgent(config: AgentConfig): Promise<Agent> {
    const agentClass = this.getAgentClass(config.type);
    const agent = new agentClass({
      ...config,
      swarmManager: this.swarmManager,
      workConfig: this.config
    });
    
    await agent.initialize();
    return agent;
  }
  
  private async executeWorkflow(task: string | undefined, agents: Agent[], context: ExecutionContext): Promise<WorkflowResult> {
    if (!task) {
      return this.interactiveMode(agents, context);
    }
    
    // Parse task into actionable steps
    const steps = await this.parseTaskIntoSteps(task);
    
    // Execute steps with agent coordination
    const results: StepResult[] = [];
    
    for (const step of steps) {
      const stepResult = await this.executeStep(step, agents, context);
      results.push(stepResult);
      
      // Update context with step results
      context.stepResults.push(stepResult);
    }
    
    return {
      task,
      steps: results,
      summary: await this.generateSummary(results),
      metrics: await this.collectMetrics()
    };
  }
}
```

#### 5. Command Registration and Integration
```typescript
// src/cli/commands/work/register.ts
export function registerWorkCommand(cli: Command): void {
  cli
    .command('work')
    .description('Unified workflow execution with intelligent presets')
    .argument('[preset-or-task]', 'Preset name or task description')
    .argument('[task]', 'Task description (when first arg is preset)')
    .option('-p, --preset <preset>', 'Workflow preset to use')
    .option('-a, --agents <count>', 'Maximum number of agents', parseInt)
    .option('-t, --topology <type>', 'Swarm topology (hierarchical, mesh, ring, star)')
    .option('-m, --mode <mode>', 'Execution mode (parallel, sequential, adaptive)')
    .option('-f, --format <format>', 'Output format (interactive, json, quiet, verbose)')
    .option('-c, --config <path>', 'Custom configuration file')
    .option('--ui <type>', 'UI mode (terminal, web, headless)')
    .option('--dry-run', 'Show configuration without executing')
    .option('--interactive', 'Force interactive mode')
    .option('--no-hooks', 'Disable hook execution')
    .option('--verbose', 'Enable verbose output')
    .action(async (presetOrTask, task, options) => {
      const workCommand = new WorkCommand();
      
      // Determine arguments based on usage pattern
      const args = task ? [presetOrTask, task] : [presetOrTask].filter(Boolean);
      
      await workCommand.execute(args, options);
    });
}
```

### File Structure

```
src/cli/commands/work/
├── index.ts                 # Main WorkCommand class
├── config-manager.ts        # Configuration management
├── preset-selector.ts       # Smart preset selection
├── workflow-executor.ts     # Workflow execution engine
├── output-handler.ts        # Output formatting and display
├── types.ts                 # TypeScript interfaces
├── presets/
│   ├── index.ts            # Built-in preset definitions
│   ├── api.ts              # API development preset
│   ├── research.ts         # Research workflow preset
│   ├── deployment.ts       # Deployment workflow preset
│   └── custom.ts           # Custom preset handling
├── agents/
│   ├── agent-factory.ts    # Agent creation and management
│   ├── coordination.ts     # Inter-agent coordination
│   └── capabilities.ts     # Agent capability mapping
├── hooks/
│   ├── hook-manager.ts     # Hook execution system
│   ├── built-in-hooks.ts   # Standard hook implementations
│   └── custom-hooks.ts     # User-defined hooks
└── utils/
    ├── task-analyzer.ts    # Natural language task analysis
    ├── pattern-matcher.ts  # Pattern recognition utilities
    └── validator.ts        # Configuration validation
```

### Migration Implementation

#### 1. Legacy Command Wrapper
```typescript
// src/cli/legacy-wrapper.ts
export class LegacyCommandWrapper {
  private static readonly COMMAND_MAPPINGS: Record<string, WorkCommandMapping> = {
    'swarm': {
      preset: 'auto',
      extractTask: (args) => args.join(' '),
      options: { mode: 'swarm' }
    },
    
    'sparc code': {
      preset: 'api',
      extractTask: (args) => args.slice(1).join(' '),
      options: { sparc: { modes: ['code'] } }
    },
    
    'agent spawn': {
      preset: 'auto',
      extractTask: () => undefined,
      options: { agents: (args) => [{ type: args[1] }] }
    },
    
    'github pr-manager': {
      preset: 'deployment',
      extractTask: (args) => args.slice(1).join(' '),
      options: { github: { workflow: 'pr-management' } }
    }
  };
  
  static async handleLegacyCommand(command: string, args: string[]): Promise<void> {
    const mapping = this.findMapping(command);
    
    if (mapping) {
      // Show deprecation warning
      console.warn(`⚠️  Command '${command}' is deprecated. Use 'claude-flow work' instead.`);
      console.warn(`   New syntax: claude-flow work ${mapping.preset} "${mapping.extractTask(args)}"`);
      
      // Execute through new work command
      const workCommand = new WorkCommand();
      const task = mapping.extractTask(args);
      
      await workCommand.execute(
        task ? [task] : [],
        { preset: mapping.preset, ...mapping.options }
      );
    } else {
      throw new Error(`Unknown legacy command: ${command}`);
    }
  }
  
  private static findMapping(command: string): WorkCommandMapping | undefined {
    // Try exact match first
    if (this.COMMAND_MAPPINGS[command]) {
      return this.COMMAND_MAPPINGS[command];
    }
    
    // Try partial matches
    for (const [pattern, mapping] of Object.entries(this.COMMAND_MAPPINGS)) {
      if (command.startsWith(pattern)) {
        return mapping;
      }
    }
    
    return undefined;
  }
}
```

#### 2. Compatibility Layer
```typescript
// src/cli/compatibility.ts
export function setupCompatibilityLayer(cli: Command): void {
  // Register legacy commands that redirect to work command
  const legacyCommands = [
    'swarm', 'sparc', 'agent', 'github', 'hive-mind',
    'analysis', 'automation', 'coordination'
  ];
  
  for (const cmd of legacyCommands) {
    cli
      .command(cmd)
      .description(`[DEPRECATED] Use 'work' command instead`)
      .allowUnknownOption()
      .action(async (...args) => {
        const command = cmd;
        const commandArgs = args.slice(0, -1); // Remove options object
        
        await LegacyCommandWrapper.handleLegacyCommand(command, commandArgs);
      });
  }
}
```

### Configuration Schema Validation

```typescript
// src/cli/commands/work/schema.ts
export const WorkConfigSchema = {
  type: 'object',
  properties: {
    preset: { type: 'string' },
    task: { type: 'string' },
    maxAgents: { type: 'number', minimum: 1, maximum: 50 },
    topology: { 
      type: 'string', 
      enum: ['hierarchical', 'mesh', 'ring', 'star', 'adaptive'] 
    },
    executionMode: {
      type: 'string',
      enum: ['parallel', 'sequential', 'adaptive']
    },
    agents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          count: { type: 'number', minimum: 1 }
        },
        required: ['type']
      }
    },
    sparc: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        modes: { type: 'array', items: { type: 'string' } },
        autoMode: { type: 'boolean' }
      }
    },
    swarm: {
      type: 'object',
      properties: {
        strategy: { type: 'string' },
        coordination: { type: 'string' },
        memory: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            persistence: { type: 'string', enum: ['session', 'permanent'] }
          }
        }
      }
    },
    outputFormat: {
      type: 'string',
      enum: ['interactive', 'json', 'quiet', 'verbose', 'report']
    },
    ui: {
      type: 'string',
      enum: ['terminal', 'web', 'headless']
    }
  },
  required: ['preset']
};
```

### Testing Strategy

#### Unit Tests
```typescript
// src/cli/commands/work/__tests__/config-manager.test.ts
describe('ConfigurationManager', () => {
  test('loads and merges configuration from multiple sources', async () => {
    const manager = new ConfigurationManager();
    const config = await manager.loadConfiguration('api');
    
    expect(config.preset).toBe('api');
    expect(config.agents).toContain({ type: 'architect' });
  });
  
  test('auto-detects preset from task description', async () => {
    const manager = new ConfigurationManager();
    const config = await manager.loadConfiguration(undefined, 'build REST API');
    
    expect(config.preset).toBe('api');
  });
});
```

#### Integration Tests
```typescript
// src/cli/commands/work/__tests__/work-command.test.ts
describe('WorkCommand Integration', () => {
  test('executes API development workflow', async () => {
    const workCommand = new WorkCommand();
    
    const result = await workCommand.execute(['api', 'build user auth'], {});
    
    expect(result.success).toBe(true);
    expect(result.agentsSpawned).toBeGreaterThan(0);
  });
});
```

This implementation provides a robust, extensible foundation for the unified work command while maintaining full backward compatibility with existing functionality.