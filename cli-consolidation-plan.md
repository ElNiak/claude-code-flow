# CLI Consolidation Plan

## Overview
The Claude Flow CLI has evolved into two parallel implementations:
1. **JavaScript-based** (`simple-cli.ts` + `command-registry.js` + `simple-commands/`)
2. **TypeScript-based** (`index.ts` + `cli-core.ts` + `commands/`)

## Current State Analysis

### File Count
- **Simple Commands (JS)**: 40+ implementation files
- **Commands (TS)**: 20+ implementation files
- **Shared Utilities**: ~10 files
- **Total CLI Files**: ~100+ files

### Primary Implementation: simple-cli.ts
**Strengths:**
- Complete, working implementation
- Minimal external dependencies
- Advanced memory management
- Hook system integration
- Extensive command coverage via registry

**Weaknesses:**
- Monolithic file (35,846 tokens)
- Mixed JavaScript/TypeScript
- No type safety in command definitions
- Complex nested logic

### Secondary Implementation: index.ts
**Strengths:**
- Clean Commander.js structure
- TypeScript throughout
- Modular command imports
- Better separation of concerns

**Weaknesses:**
- Heavy dependency on external packages
- Incomplete command coverage
- No memory optimization
- Missing hook integration

## Consolidation Strategy

### Phase 1: Preparation (No Breaking Changes)

1. **Extract Types and Interfaces**
   ```typescript
   // src/cli/types/index.ts
   export interface Command {
     name: string;
     description: string;
     usage?: string;
     examples?: string[];
     handler: CommandHandler;
     subcommands?: Command[];
     options?: CommandOption[];
   }
   ```

2. **Create Command Base Classes**
   ```typescript
   // src/cli/base/command.ts
   export abstract class BaseCommand implements Command {
     abstract execute(args: string[], flags: Record<string, any>): Promise<void>;
   }
   ```

3. **Standardize Command Interface**
   - Create adapter for existing commands
   - Ensure both systems can use same interface

### Phase 2: Unification

1. **Merge Command Implementations**
   - Identify unique commands in each system
   - Port TypeScript commands to JavaScript (temporary)
   - Ensure all commands work with registry

2. **Consolidate REPL**
   ```typescript
   // src/cli/repl/unified-repl.ts
   export class UnifiedREPL {
     // Merge best features from both implementations
     // Support both readline and inquirer modes
   }
   ```

3. **Unify Help System**
   - Extract help generation to separate module
   - Support multiple output formats
   - Centralize command documentation

### Phase 3: Modularization

1. **Break Down simple-cli.ts**
   ```
   src/cli/
   ├── core/
   │   ├── cli.ts          // Main CLI class
   │   ├── parser.ts       // Argument parsing
   │   ├── registry.ts     // Command registry
   │   └── memory.ts       // Memory management
   ├── commands/           // Unified commands
   ├── utils/
   └── index.ts           // New entry point
   ```

2. **Module Structure**
   - **Core**: CLI engine, parsing, registry
   - **Commands**: All command implementations
   - **Utils**: Shared utilities
   - **REPL**: Interactive mode
   - **Hooks**: Hook system
   - **Config**: Configuration management

### Phase 4: Command Migration

#### Commands to Consolidate

**From simple-commands/ (Keep)**
- agent.js → commands/agent.ts
- memory.js → commands/memory.ts
- swarm.js → commands/swarm.ts
- hive-mind.js → commands/hive-mind.ts
- sparc.js → commands/sparc.ts
- github.js → commands/github.ts
- hooks.ts → commands/hooks.ts

**From commands/ (Port Missing)**
- workflow.ts → Ensure in simple-commands
- session.ts → Ensure in simple-commands
- monitor.ts → Merge implementations

**New Unified Structure**
```
commands/
├── core/           // Essential commands
│   ├── init.ts
│   ├── start.ts
│   └── help.ts
├── agent/          // Agent-related
│   ├── spawn.ts
│   ├── list.ts
│   └── manage.ts
├── swarm/          // Swarm functionality
│   ├── init.ts
│   ├── orchestrate.ts
│   └── monitor.ts
└── index.ts        // Command exports
```

### Phase 5: Implementation

1. **New Entry Point**
   ```typescript
   // src/cli/index.ts
   import { CLI } from './core/cli';
   import { registerCommands } from './commands';

   const cli = new CLI();
   registerCommands(cli);
   cli.run();
   ```

2. **Backward Compatibility**
   - Keep command-registry.js as adapter
   - Maintain same command names/syntax
   - Gradual deprecation notices

3. **Testing Strategy**
   - Add comprehensive tests before changes
   - Test each phase independently
   - Ensure no regression in functionality

## Migration Timeline

### Week 1: Preparation
- [ ] Extract type definitions
- [ ] Create base classes
- [ ] Set up test framework
- [ ] Document all commands

### Week 2: Core Refactoring
- [ ] Modularize simple-cli.ts
- [ ] Create unified registry
- [ ] Implement adapter pattern
- [ ] Test core functionality

### Week 3: Command Migration
- [ ] Port TypeScript commands
- [ ] Unify command structure
- [ ] Consolidate duplicates
- [ ] Update tests

### Week 4: Finalization
- [ ] Update documentation
- [ ] Add deprecation notices
- [ ] Performance testing
- [ ] Release preparation

## Risk Mitigation

1. **Maintain Backward Compatibility**
   - Keep existing command syntax
   - Support both entry points initially
   - Gradual migration path

2. **Comprehensive Testing**
   - Unit tests for each command
   - Integration tests for CLI flow
   - Performance benchmarks

3. **Feature Preservation**
   - Document all features before migration
   - Ensure no functionality is lost
   - Keep memory optimization

## Success Metrics

1. **Code Reduction**: Target 50% fewer files
2. **Performance**: Maintain or improve startup time
3. **Type Coverage**: 100% TypeScript
4. **Test Coverage**: >80%
5. **Documentation**: Complete for all commands

## Final Architecture

```
claude-flow/
├── src/
│   └── cli/
│       ├── index.ts           // Main entry
│       ├── core/              // CLI engine
│       ├── commands/          // All commands
│       ├── repl/              // REPL implementation
│       ├── hooks/             // Hook system
│       ├── utils/             // Utilities
│       └── types/             // TypeScript types
├── dist/                      // Compiled output
└── bin/
    └── claude-flow            // Executable
