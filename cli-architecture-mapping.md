# CLI Architecture Mapping

## Entry Points Analysis

### Primary Entry Points

1. **simple-cli.ts** (Primary Implementation)
   - Location: `/src/cli/simple-cli.ts`
   - Type: Node.js-based standalone CLI
   - Size: ~35,846 tokens (very large)
   - Features:
     - Complete command implementation
     - Memory optimization
     - Emergency GC management
     - Hook system integration
     - MCP support
     - Comprehensive help system
   - Dependencies: Minimal (node:child_process, node:crypto, node:fs, node:path, node:readline)

2. **index.ts** (Commander-based)
   - Location: `/src/cli/index.ts`
   - Type: Commander.js-based CLI
   - Features:
     - Command subcommands structure
     - REPL integration via startREPL
     - Configuration management
     - Logging setup
     - Shell completion
     - Signal handlers
   - Dependencies: commander, chalk, various command modules

3. **main.ts** (Wrapper)
   - Location: `/src/cli/main.ts`
   - Type: Thin wrapper around cli-core
   - Features:
     - Sets up CLI instance
     - Calls setupCommands
     - Minimal functionality

## Command System Architecture

### Command Registry System
- **command-registry.js**: Map-based extensible command registration
- **30+ registered commands** including:
  - Core: init, start, memory, sparc, agent, task, config, status
  - Advanced: hive-mind, swarm, github, hooks, batch
  - Utilities: monitor, session, workflow, training, analysis, automation, coordination

### CLI Core System
- **cli-core.ts**: Base CLI implementation
  - Custom argument parser
  - Command routing
  - Configuration loading
  - Help system
  - Option handling

## REPL Implementations

1. **repl.ts** (Primary REPL)
   - Full-featured with inquirer integration
   - Command completion
   - History management
   - Interactive prompts
   - Connection status tracking

2. **node-repl.ts** (Node.js readline-based)
   - Native readline interface
   - Similar command structure
   - CLI command execution via spawn
   - More lightweight

## Feature Matrix

| Feature | simple-cli.ts | index.ts | main.ts | cli-core.ts | repl.ts | node-repl.ts |
|---------|--------------|----------|---------|-------------|---------|--------------|
| Command Registration | ✓ (registry) | ✓ (commander) | ✓ (via core) | ✓ (Map) | ✗ | ✗ |
| REPL Support | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| Memory Management | ✓ (advanced) | ✗ | ✗ | ✗ | ✗ | ✗ |
| Hook System | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| MCP Integration | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Configuration | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Completion | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Help System | ✓ (extensive) | ✓ | ✗ | ✓ | ✓ | ✓ |
| Signal Handling | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| Logging | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

## Dependencies Analysis

### simple-cli.ts Dependencies
- Core Node.js modules only
- command-registry.js
- utils.js
- Simple command implementations in ./simple-commands/

### index.ts Dependencies
- External: commander, chalk, inquirer, cli-table3
- Internal: Multiple command modules, config, logger, formatter
- Heavy dependency tree

### Shared Utilities
- `utils/error-handler.js`
- `utils/helpers.js`
- `utils/types.js`
- `formatter.js`

## Duplication Analysis

### Duplicated Features
1. **Command System**: 3 different implementations (registry, commander, cli-core)
2. **REPL**: 2 implementations with similar features
3. **Help System**: Multiple implementations across files
4. **Argument Parsing**: Custom parsers in simple-cli and cli-core

### Unique Features by File

**simple-cli.ts Unique:**
- Memory optimization and GC management
- Hook system integration
- Emergency memory handling
- Extensive help with examples
- Direct command registry integration

**index.ts Unique:**
- Commander.js integration
- Structured subcommands
- Built-in completion generation
- Profile support

**cli-core.ts Unique:**
- Abstracted CLI class
- Reusable command interface
- Option type definitions

## Consolidation Strategy

### Primary Implementation: simple-cli.ts
**Rationale:**
- Most complete implementation
- Minimal dependencies
- Advanced memory management
- Hook system already integrated
- Extensible command registry

### Features to Extract and Integrate

**From index.ts:**
1. Commander-style subcommand structure (optional enhancement)
2. Shell completion generation
3. Profile support
4. Some command implementations not in simple-cli

**From cli-core.ts:**
1. CLI class abstraction (refactor simple-cli to use)
2. Type definitions for commands/options
3. Structured command interface

**From REPL implementations:**
1. Merge best features into single REPL
2. Keep both inquirer and readline options
3. Unify command completion logic

### Components to Remove/Deprecate
1. **index.ts**: After extracting unique features
2. **main.ts**: Redundant wrapper
3. **cli-core.ts**: After merging abstractions
4. **node-repl.ts**: After unifying REPL implementations

### Migration Path
1. Extract type definitions to shared types file
2. Refactor simple-cli.ts to use CLI class pattern
3. Port missing commands from index.ts
4. Unify REPL implementations
5. Update entry point references
6. Remove deprecated files

## Risk Assessment

### High Risk Areas
- Large simple-cli.ts file (needs modularization)
- Command registry vs commander pattern differences
- REPL implementation differences
- External tool dependencies

### Low Risk Areas
- Utility functions (already shared)
- Command implementations (modular)
- Help system (can be unified easily)

## Recommendations

1. **Modularize simple-cli.ts**: Break into smaller modules while maintaining structure
2. **Unified Command Interface**: Create standard command interface used by all systems
3. **Single REPL**: Merge features into one flexible REPL implementation
4. **Type Safety**: Add TypeScript interfaces for all commands
5. **Testing**: Ensure comprehensive tests before removing files
