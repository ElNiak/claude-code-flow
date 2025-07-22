#!/usr/bin/env node

/**
 * Feature Mapping Script for CLI Unification
 * Analyzes CLI features and creates a comprehensive mapping matrix
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * Feature categories for classification
 */
const FEATURE_CATEGORIES = {
  CORE: 'Core Infrastructure',
  COMMANDS: 'Command Implementation',
  UTILITIES: 'Utility Functions',
  INTERFACES: 'Type Definitions',
  CONFIGURATION: 'Configuration Management',
  ERROR_HANDLING: 'Error Handling',
  FORMATTING: 'Output Formatting',
  PARSING: 'Argument Parsing',
  REPL: 'REPL Functionality',
  EXTERNAL_DEPS: 'External Dependencies'
};

/**
 * Consolidation strategies
 */
const CONSOLIDATION_STRATEGY = {
  EXTRACT: 'Extract to shared module',
  MERGE: 'Merge implementations',
  KEEP_SIMPLE: 'Keep in simple-cli',
  KEEP_ADVANCED: 'Keep in advanced CLI',
  REFACTOR: 'Refactor and unify',
  DEPRECATE: 'Deprecate in favor of better implementation'
};

/**
 * Load and parse the CLI feature inventory
 */
async function loadFeatureInventory() {
  const inventoryPath = path.join(projectRoot, 'CLI_FEATURE_INVENTORY.json');
  const content = await fs.readFile(inventoryPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Analyze features from simple-cli.ts
 */
function analyzeSimpleCliFeatures(fileData) {
  return {
    functions: {
      'printHelp': {
        category: FEATURE_CATEGORIES.FORMATTING,
        description: 'Basic help display',
        dependencies: [],
        consolidationStrategy: CONSOLIDATION_STRATEGY.MERGE
      },
      'printVersion': {
        category: FEATURE_CATEGORIES.FORMATTING,
        description: 'Version display',
        dependencies: ['VERSION constant'],
        consolidationStrategy: CONSOLIDATION_STRATEGY.EXTRACT
      },
      'printError': {
        category: FEATURE_CATEGORIES.ERROR_HANDLING,
        description: 'Error message formatting',
        dependencies: [],
        consolidationStrategy: CONSOLIDATION_STRATEGY.EXTRACT
      },
      'printSuccess': {
        category: FEATURE_CATEGORIES.FORMATTING,
        description: 'Success message formatting',
        dependencies: [],
        consolidationStrategy: CONSOLIDATION_STRATEGY.EXTRACT
      },
      'printWarning': {
        category: FEATURE_CATEGORIES.FORMATTING,
        description: 'Warning message formatting',
        dependencies: [],
        consolidationStrategy: CONSOLIDATION_STRATEGY.EXTRACT
      },
      'startRepl': {
        category: FEATURE_CATEGORIES.REPL,
        description: 'REPL initialization',
        dependencies: ['readline', 'processReplCommand'],
        consolidationStrategy: CONSOLIDATION_STRATEGY.MERGE
      },
      'handleAgentCommand': {
        category: FEATURE_CATEGORIES.COMMANDS,
        description: 'Agent command handling',
        dependencies: ['spawn', 'fs', 'path'],
        consolidationStrategy: CONSOLIDATION_STRATEGY.MERGE
      },
      'handleTaskCommand': {
        category: FEATURE_CATEGORIES.COMMANDS,
        description: 'Task command handling',
        dependencies: ['fs', 'path'],
        consolidationStrategy: CONSOLIDATION_STRATEGY.MERGE
      },
      'handleMemoryCommand': {
        category: FEATURE_CATEGORIES.COMMANDS,
        description: 'Memory command handling',
        dependencies: ['fs', 'path'],
        consolidationStrategy: CONSOLIDATION_STRATEGY.MERGE
      },
      'handleTerminalCommand': {
        category: FEATURE_CATEGORIES.COMMANDS,
        description: 'Terminal command execution',
        dependencies: ['spawn'],
        consolidationStrategy: CONSOLIDATION_STRATEGY.KEEP_SIMPLE
      }
    },
    templates: {
      'createMinimalClaudeMd': CONSOLIDATION_STRATEGY.REFACTOR,
      'createFullClaudeMd': CONSOLIDATION_STRATEGY.REFACTOR,
      'createMinimalMemoryBankMd': CONSOLIDATION_STRATEGY.REFACTOR,
      'createFullMemoryBankMd': CONSOLIDATION_STRATEGY.REFACTOR,
      'createMinimalCoordinationMd': CONSOLIDATION_STRATEGY.REFACTOR,
      'createFullCoordinationMd': CONSOLIDATION_STRATEGY.REFACTOR,
      'createAgentsReadme': CONSOLIDATION_STRATEGY.REFACTOR,
      'createSessionsReadme': CONSOLIDATION_STRATEGY.REFACTOR,
      'createSparcStructureManually': CONSOLIDATION_STRATEGY.REFACTOR
    }
  };
}

/**
 * Analyze features from cli-core.ts
 */
function analyzeCliCoreFeatures(fileData) {
  return {
    interfaces: {
      'CommandContext': {
        category: FEATURE_CATEGORIES.INTERFACES,
        description: 'Command execution context',
        consolidationStrategy: CONSOLIDATION_STRATEGY.EXTRACT
      },
      'Command': {
        category: FEATURE_CATEGORIES.INTERFACES,
        description: 'Command definition interface',
        consolidationStrategy: CONSOLIDATION_STRATEGY.EXTRACT
      },
      'Option': {
        category: FEATURE_CATEGORIES.INTERFACES,
        description: 'Command option interface',
        consolidationStrategy: CONSOLIDATION_STRATEGY.EXTRACT
      }
    },
    classes: {
      'CLI': {
        category: FEATURE_CATEGORIES.CORE,
        description: 'Core CLI class with command registry',
        methods: ['run', 'command', 'option', 'parse', 'showHelp'],
        consolidationStrategy: CONSOLIDATION_STRATEGY.REFACTOR
      }
    },
    utilities: {
      'success': CONSOLIDATION_STRATEGY.EXTRACT,
      '_error': CONSOLIDATION_STRATEGY.EXTRACT,
      'warning': CONSOLIDATION_STRATEGY.EXTRACT,
      'info': CONSOLIDATION_STRATEGY.EXTRACT
    }
  };
}

/**
 * Analyze command files
 */
async function analyzeCommandFiles() {
  const commandsDir = path.join(projectRoot, 'src/cli/commands');
  const files = await fs.readdir(commandsDir);

  const commandAnalysis = {};

  // Key command files to analyze
  const keyCommands = [
    'agent.ts',
    'agent-simple.ts',
    'task.ts',
    'memory.ts',
    'session.ts',
    'workflow.ts',
    'swarm.ts',
    'hook.ts'
  ];

  for (const file of keyCommands) {
    if (files.includes(file)) {
      commandAnalysis[file] = {
        category: FEATURE_CATEGORIES.COMMANDS,
        consolidationStrategy: file.includes('-simple')
          ? CONSOLIDATION_STRATEGY.MERGE
          : CONSOLIDATION_STRATEGY.KEEP_ADVANCED,
        relatedFiles: []
      };
    }
  }

  // Special handling for duplicate implementations
  commandAnalysis['agent-consolidation'] = {
    description: 'Merge agent.ts and agent-simple.ts',
    strategy: CONSOLIDATION_STRATEGY.MERGE,
    targetFile: 'agent.ts',
    sourceFiles: ['agent.ts', 'agent-simple.ts'],
    preserveFeatures: [
      'Advanced agent profiles',
      'Simple agent spawning',
      'Agent monitoring',
      'Agent communication'
    ]
  };

  return commandAnalysis;
}

/**
 * Create the feature mapping matrix
 */
async function createFeatureMappingMatrix() {
  console.log('📊 Loading CLI Feature Inventory...');
  const inventory = await loadFeatureInventory();

  console.log('🔍 Analyzing Simple CLI features...');
  const simpleCliFeatures = analyzeSimpleCliFeatures(inventory.files['src/cli/simple-cli.ts']);

  console.log('🔍 Analyzing CLI Core features...');
  const cliCoreFeatures = analyzeCliCoreFeatures(inventory.files['src/cli/cli-core.ts']);

  console.log('🔍 Analyzing Command files...');
  const commandFeatures = await analyzeCommandFiles();

  // Create comprehensive mapping matrix
  const mappingMatrix = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalFiles: inventory.totalFiles,
      strategy: 'Unified CLI with preserved functionality'
    },

    extractionPlan: {
      interfaces: {
        source: 'src/cli/cli-core.ts',
        target: 'src/cli/types/interfaces.ts',
        items: Object.keys(cliCoreFeatures.interfaces)
      },
      utilities: {
        source: 'Multiple files',
        target: 'src/cli/utils/formatting.ts',
        items: [
          'printError', 'printSuccess', 'printWarning', 'printHelp',
          'success', '_error', 'warning', 'info'
        ]
      },
      constants: {
        source: 'Multiple files',
        target: 'src/cli/constants.ts',
        items: ['VERSION', 'BUILD_DATE']
      }
    },

    consolidationPlan: {
      commands: {
        agent: {
          strategy: CONSOLIDATION_STRATEGY.MERGE,
          targetFile: 'src/cli/commands/agent.ts',
          sourceFiles: ['agent.ts', 'agent-simple.ts'],
          preserveFeatures: {
            fromAdvanced: ['Profiles', 'Advanced options', 'Monitoring'],
            fromSimple: ['Quick spawn', 'Basic operations']
          }
        },
        task: {
          strategy: CONSOLIDATION_STRATEGY.KEEP_ADVANCED,
          reasoning: 'Advanced implementation is more complete'
        },
        memory: {
          strategy: CONSOLIDATION_STRATEGY.KEEP_ADVANCED,
          reasoning: 'Advanced implementation has better features'
        }
      },

      repl: {
        strategy: CONSOLIDATION_STRATEGY.MERGE,
        targetFile: 'src/cli/repl.ts',
        sourceFiles: ['repl.ts', 'simple-cli.ts (REPL portions)'],
        features: ['Command history', 'Auto-completion', 'Interactive mode']
      },

      mainEntry: {
        strategy: CONSOLIDATION_STRATEGY.REFACTOR,
        targetFile: 'src/cli/index.ts',
        approach: 'Unified entry point with mode detection',
        modes: ['simple', 'advanced', 'auto-detect']
      }
    },

    migrationSteps: [
      {
        step: 1,
        description: 'Extract shared interfaces and types',
        files: ['src/cli/types/interfaces.ts', 'src/cli/types/index.ts']
      },
      {
        step: 2,
        description: 'Extract utility functions',
        files: ['src/cli/utils/formatting.ts', 'src/cli/utils/validation.ts']
      },
      {
        step: 3,
        description: 'Merge command implementations',
        files: ['src/cli/commands/agent.ts', 'src/cli/commands/task.ts']
      },
      {
        step: 4,
        description: 'Unify REPL implementations',
        files: ['src/cli/repl.ts']
      },
      {
        step: 5,
        description: 'Create unified entry point',
        files: ['src/cli/index.ts', 'src/cli/main.ts']
      }
    ],

    featurePreservation: {
      simple: {
        'Minimal dependencies': 'Preserve through conditional imports',
        'Quick commands': 'Keep as shortcuts in unified CLI',
        'Template generation': 'Refactor into dedicated module',
        'Basic REPL': 'Merge with advanced REPL'
      },
      advanced: {
        'Commander.js integration': 'Primary command framework',
        'Rich formatting': 'Default for advanced mode',
        'Plugin system': 'Preserve and enhance',
        'MCP integration': 'Core feature'
      }
    },

    dependencies: {
      toRemove: [],
      toAdd: [],
      toConsolidate: [
        {
          package: 'chalk',
          reason: 'Used in multiple files, standardize usage'
        },
        {
          package: 'commander',
          reason: 'Primary CLI framework'
        }
      ]
    }
  };

  // Save the mapping matrix
  const outputPath = path.join(projectRoot, 'FEATURE_MAPPING_MATRIX.json');
  await fs.writeFile(outputPath, JSON.stringify(mappingMatrix, null, 2));

  console.log('✅ Feature Mapping Matrix created at:', outputPath);

  return mappingMatrix;
}

/**
 * Generate implementation checklist
 */
async function generateImplementationChecklist(mappingMatrix) {
  const checklist = `# CLI Unification Implementation Checklist

Generated: ${mappingMatrix.metadata.generatedAt}

## Phase 1: Extraction (Shared Components)

### Interfaces & Types
- [ ] Create \`src/cli/types/interfaces.ts\`
  - [ ] Extract CommandContext interface
  - [ ] Extract Command interface
  - [ ] Extract Option interface
  - [ ] Add unified type definitions

### Utilities
- [ ] Create \`src/cli/utils/formatting.ts\`
  - [ ] Consolidate print functions (Error, Success, Warning)
  - [ ] Unify color schemes
  - [ ] Standardize output formats

- [ ] Create \`src/cli/utils/validation.ts\`
  - [ ] Command validation logic
  - [ ] Argument parsing utilities
  - [ ] Flag validation

### Constants
- [ ] Create \`src/cli/constants.ts\`
  - [ ] VERSION management
  - [ ] Default configurations
  - [ ] Feature flags

## Phase 2: Command Consolidation

### Agent Commands
- [ ] Merge \`agent.ts\` and \`agent-simple.ts\`
  - [ ] Preserve profile-based spawning
  - [ ] Keep simple spawn shortcuts
  - [ ] Unify monitoring features
  - [ ] Consolidate communication methods

### Task Commands
- [ ] Review and update \`task.ts\`
  - [ ] Ensure compatibility with simple mode
  - [ ] Add progressive enhancement

### Memory Commands
- [ ] Update \`memory.ts\` for unified access
  - [ ] Support both simple and advanced operations

## Phase 3: REPL Unification

- [ ] Merge REPL implementations
  - [ ] Combine simple and advanced features
  - [ ] Preserve command history
  - [ ] Enhance auto-completion
  - [ ] Add mode switching

## Phase 4: Entry Point Refactoring

- [ ] Create unified \`index.ts\`
  - [ ] Mode detection logic
  - [ ] Conditional feature loading
  - [ ] Backward compatibility

- [ ] Update \`main.ts\`
  - [ ] Unified command registration
  - [ ] Dynamic feature enabling

## Phase 5: Testing & Validation

- [ ] Update test suites
- [ ] Add integration tests
- [ ] Verify backward compatibility
- [ ] Performance benchmarking

## Phase 6: Documentation

- [ ] Update CLI documentation
- [ ] Migration guide for users
- [ ] Developer documentation
- [ ] Update examples

## Notes

- Preserve all existing functionality
- Maintain backward compatibility
- Optimize for both simple and advanced use cases
- Consider progressive enhancement approach
`;

  const checklistPath = path.join(projectRoot, 'CLI_UNIFICATION_CHECKLIST.md');
  await fs.writeFile(checklistPath, checklist);

  console.log('📋 Implementation Checklist created at:', checklistPath);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting CLI Feature Mapping Analysis...\n');

    const mappingMatrix = await createFeatureMappingMatrix();
    await generateImplementationChecklist(mappingMatrix);

    console.log('\n✨ Feature mapping completed successfully!');
    console.log('📊 Review FEATURE_MAPPING_MATRIX.json for detailed analysis');
    console.log('📋 Follow CLI_UNIFICATION_CHECKLIST.md for implementation');

  } catch (error) {
    console.error('❌ Error during feature mapping:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { createFeatureMappingMatrix, analyzeSimpleCliFeatures, analyzeCliCoreFeatures };
