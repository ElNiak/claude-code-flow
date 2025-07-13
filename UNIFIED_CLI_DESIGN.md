# Unified CLI Design: Single "work" Command System

## Executive Summary

This document outlines the design for migrating Claude Flow's current 50+ command structure to a unified, configuration-driven "work" command. This transformation will simplify user experience while maintaining all current functionality through intelligent configuration presets and smart defaults.

## Current State Analysis

### Existing CLI Structure
- **129 command exports** across multiple files
- **50+ distinct commands** including:
  - Core: `init`, `start`, `agent`, `task`, `memory`, `config`, `status`
  - SPARC modes: 17 specialized development modes
  - Swarm operations: `swarm`, `hive-mind`, `coordination`
  - Infrastructure: `mcp`, `github`, `monitor`, `session`
  - Advanced: `neural`, `benchmark`, `analytics`

### Complexity Analysis
- **17,539 lines** of code in simple-commands directory
- **Multiple CLI entry points**: `index.ts`, `simple-cli.ts`, `main.ts`
- **Fragmented configuration**: Commands scattered across dozens of files
- **Inconsistent interfaces**: Different parameter patterns and options

## Unified "work" Command Design

### Core Philosophy
```bash
# Single command, infinite possibilities
claude-flow work [preset] [task] [options]

# Examples
claude-flow work                          # Interactive mode with preset selection
claude-flow work api "build auth system"  # Use API development preset
claude-flow work research "AI trends"     # Use research preset
claude-flow work --preset custom          # Use custom configuration
```

### Command Structure

#### 1. Basic Syntax
```bash
claude-flow work [preset] ["task description"] [options]

# Where:
# - preset: Optional workflow preset (api, research, analysis, etc.)
# - task: Optional natural language task description
# - options: Configuration overrides and flags
```

#### 2. Configuration-Driven Architecture

**Primary Configuration: `.claude/work-config.json`**
```json
{
  "version": "2.0.0",
  "defaultPreset": "auto",
  "globalDefaults": {
    "maxAgents": 6,
    "topology": "hierarchical",
    "executionMode": "parallel",
    "outputFormat": "interactive"
  },
  "presets": {
    "api": {
      "description": "API development workflow",
      "agents": ["architect", "coder", "tester", "reviewer"],
      "sparc": {
        "enabled": true,
        "modes": ["code", "tdd", "integration"]
      },
      "swarm": {
        "strategy": "development",
        "maxAgents": 8,
        "topology": "hierarchical"
      },
      "hooks": {
        "preTask": ["validation", "setup"],
        "postEdit": ["format", "test"]
      }
    },
    "research": {
      "description": "Research and analysis workflow",
      "agents": ["researcher", "analyst", "reviewer"],
      "tools": ["web-search", "data-analysis", "documentation"],
      "outputFormat": "report"
    },
    "deployment": {
      "description": "Deployment and operations workflow",
      "agents": ["devops", "monitor", "security"],
      "github": {
        "enabled": true,
        "workflow": "ci-cd"
      }
    }
  }
}
```

#### 3. Smart Defaults and Auto-Detection

```typescript
interface WorkContext {
  // Auto-detected from environment
  projectType: 'web' | 'api' | 'mobile' | 'data' | 'ml' | 'unknown';
  technologies: string[];           // Detected from package.json, requirements.txt, etc.
  gitContext: GitInfo;             // Current branch, pending changes, etc.
  
  // User preferences (learned over time)
  preferredTopology: string;
  commonAgentTypes: string[];
  taskPatterns: TaskPattern[];
}
```

#### 4. Preset Categories

**Development Presets:**
- `api` - REST API development
- `web` - Web application development  
- `mobile` - Mobile app development
- `ml` - Machine learning workflows
- `data` - Data analysis and processing

**Operational Presets:**
- `research` - Research and documentation
- `analysis` - Code analysis and optimization
- `testing` - Quality assurance workflows
- `deployment` - CI/CD and deployment
- `maintenance` - Bug fixes and updates

**Specialized Presets:**
- `security` - Security review workflows
- `performance` - Performance optimization
- `migration` - Code migration projects
- `documentation` - Documentation generation

### Configuration System Architecture

#### 1. Hierarchical Configuration Loading

```typescript
class ConfigurationManager {
  private sources = [
    new GlobalDefaultsSource(),      // Built-in defaults
    new ProjectConfigSource(),       // .claude/work-config.json
    new UserConfigSource(),          // ~/.claude/config.json
    new EnvironmentSource(),         // Environment variables
    new CLIArgumentsSource()         // Command line overrides
  ];
  
  async loadConfiguration(preset?: string): Promise<WorkConfig> {
    const config = new WorkConfig();
    
    // Load in priority order (later sources override earlier ones)
    for (const source of this.sources) {
      const partial = await source.load(preset);
      config.merge(partial);
    }
    
    return config.validate();
  }
}
```

#### 2. Configuration Schema

```typescript
interface WorkConfig {
  // Core execution
  preset: string;
  task?: string;
  maxAgents: number;
  topology: 'hierarchical' | 'mesh' | 'ring' | 'star';
  executionMode: 'parallel' | 'sequential' | 'adaptive';
  
  // Agent configuration
  agents: AgentConfig[];
  autoSpawn: boolean;
  agentSelection: 'auto' | 'manual' | 'learned';
  
  // SPARC integration
  sparc: {
    enabled: boolean;
    modes: string[];
    autoMode: boolean;
  };
  
  // Swarm configuration
  swarm: {
    strategy: string;
    coordination: 'centralized' | 'distributed';
    memory: MemoryConfig;
  };
  
  // Output and UI
  outputFormat: 'interactive' | 'json' | 'quiet' | 'verbose';
  ui: 'terminal' | 'web' | 'headless';
  
  // Integration
  github: GitHubConfig;
  hooks: HooksConfig;
  mcp: MCPConfig;
}
```

#### 3. Smart Preset Selection

```typescript
class PresetSelector {
  async selectPreset(task?: string, context?: WorkContext): Promise<string> {
    if (!task) {
      return await this.interactiveSelection();
    }
    
    // AI-powered task analysis
    const analysis = await this.analyzeTask(task);
    
    // Match against preset patterns
    const candidates = this.matchPresets(analysis, context);
    
    // Return best match or default
    return candidates[0]?.name || 'auto';
  }
  
  private async analyzeTask(task: string): Promise<TaskAnalysis> {
    const keywords = this.extractKeywords(task);
    const intent = await this.classifyIntent(task);
    const complexity = this.estimateComplexity(task);
    
    return { keywords, intent, complexity };
  }
}
```

### Implementation Strategy

#### Phase 1: Foundation (Week 1-2)
1. **Create unified command entry point**
   ```typescript
   // src/cli/commands/work.ts
   export class WorkCommand {
     async execute(args: string[], options: WorkOptions): Promise<void> {
       const config = await this.configManager.load(options.preset);
       const executor = new WorkflowExecutor(config);
       await executor.run(args[0]); // task description
     }
   }
   ```

2. **Implement configuration system**
   - Configuration schema and validation
   - Hierarchical loading mechanism  
   - Built-in preset definitions

3. **Create workflow executor**
   ```typescript
   class WorkflowExecutor {
     async run(task?: string): Promise<void> {
       // 1. Load and validate configuration
       // 2. Initialize swarm with specified topology
       // 3. Spawn agents according to preset
       // 4. Execute task with coordination
       // 5. Handle output according to format
     }
   }
   ```

#### Phase 2: Migration (Week 3-4)
1. **Map existing commands to presets**
   - Analyze current command usage patterns
   - Create equivalent preset configurations
   - Maintain backward compatibility

2. **Implement preset library**
   - Built-in presets for common workflows
   - Preset validation and testing
   - Documentation and examples

#### Phase 3: Advanced Features (Week 5-6)
1. **Smart defaults and learning**
   - Usage pattern analysis
   - Automatic preset recommendations
   - Configuration optimization

2. **Interactive mode**
   - Preset selection interface
   - Real-time configuration preview
   - Guided workflow setup

### Migration Strategy

#### Backward Compatibility
```typescript
// Legacy command mapping
const LEGACY_COMMAND_MAP = {
  'swarm': { preset: 'auto', mode: 'swarm' },
  'sparc code': { preset: 'api', sparc: { modes: ['code'] } },
  'agent spawn researcher': { preset: 'research', agents: ['researcher'] },
  'github pr-manager': { preset: 'deployment', github: { workflow: 'pr' } }
};

// Automatic migration
class LegacyCommandHandler {
  async migrate(legacyCommand: string[]): Promise<WorkConfig> {
    const mapping = LEGACY_COMMAND_MAP[legacyCommand.join(' ')];
    if (mapping) {
      return this.configManager.createFromMapping(mapping);
    }
    throw new Error(`Unknown legacy command: ${legacyCommand.join(' ')}`);
  }
}
```

#### User Migration Path
1. **Phase 1: Dual interface** - Both old and new commands work
2. **Phase 2: Deprecation warnings** - Old commands show migration hints
3. **Phase 3: Legacy removal** - Old commands redirect to new system

### Benefits Analysis

#### For Users
- **Simplified interface**: One command to learn instead of 50+
- **Intelligent defaults**: System learns user preferences
- **Flexible configuration**: Easy customization without code changes
- **Better discoverability**: Preset system guides users to optimal workflows

#### For Developers  
- **Reduced maintenance**: Single command implementation
- **Easier testing**: Standardized configuration patterns
- **Better extensibility**: New workflows via configuration, not code
- **Cleaner codebase**: Elimination of redundant command implementations

#### For System
- **Consistent behavior**: All workflows use same execution engine
- **Better resource management**: Unified agent and swarm coordination
- **Improved performance**: Optimized execution paths
- **Enhanced monitoring**: Centralized metrics and logging

### Configuration Examples

#### Example 1: API Development
```bash
# Simple usage
claude-flow work api "build user authentication"

# With customization
claude-flow work api "build auth" --max-agents 8 --topology mesh --output json
```

**Generated Configuration:**
```json
{
  "preset": "api",
  "task": "build user authentication", 
  "maxAgents": 8,
  "topology": "mesh",
  "outputFormat": "json",
  "agents": ["architect", "coder", "tester", "security"],
  "sparc": {
    "enabled": true,
    "modes": ["code", "tdd", "security-review"]
  },
  "swarm": {
    "strategy": "development",
    "coordination": "distributed"
  }
}
```

#### Example 2: Research Workflow
```bash
claude-flow work research "analyze microservices patterns"
```

**Generated Configuration:**
```json
{
  "preset": "research",
  "task": "analyze microservices patterns",
  "agents": ["researcher", "analyst", "architect"],
  "tools": ["web-search", "documentation", "analysis"],
  "outputFormat": "report",
  "swarm": {
    "strategy": "research",
    "coordination": "centralized"
  }
}
```

#### Example 3: Custom Workflow
```bash
claude-flow work --config custom-ml.json "train recommendation model"
```

**custom-ml.json:**
```json
{
  "description": "ML model training workflow",
  "agents": ["data-scientist", "ml-engineer", "analyst"],
  "tools": ["jupyter", "tensorboard", "model-validation"],
  "resources": {
    "gpu": true,
    "memory": "16GB"
  },
  "pipeline": [
    "data-preparation",
    "feature-engineering", 
    "model-training",
    "validation",
    "deployment"
  ]
}
```

## Integration with Existing Systems

### .claude/settings.json Integration
The new work command will seamlessly integrate with existing Claude Code hooks and MCP server configuration:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "work",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hooks pre-work --preset ${preset} --load-context true"
          }
        ]
      }
    ]
  },
  "workPresets": {
    "default": "auto",
    "learned": {
      "api": 85,
      "research": 12,
      "deployment": 3
    }
  }
}
```

### MCP Tools Integration
The work command will leverage all existing MCP tools through configuration:

```typescript
interface MCPIntegration {
  swarmInit: boolean;
  agentSpawn: string[];
  taskOrchestrate: boolean;
  memoryUsage: boolean;
  neuralTraining: boolean;
}
```

## Next Steps

1. **Immediate Actions:**
   - Review and approve this design
   - Create implementation timeline
   - Set up development environment

2. **Development Phases:**
   - Phase 1: Core implementation (2 weeks)
   - Phase 2: Preset library (2 weeks)  
   - Phase 3: Advanced features (2 weeks)

3. **Testing Strategy:**
   - Unit tests for configuration system
   - Integration tests with existing MCP tools
   - User acceptance testing with common workflows

This unified CLI design maintains all existing functionality while dramatically simplifying the user experience and creating a foundation for future extensibility.