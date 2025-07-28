# Contributing to Claude Flow

Welcome to Claude Flow! This guide outlines the development process, architecture, and standards for contributing to the unified CLI system.

## Table of Contents

- [Development Setup](#development-setup)
- [CLI Architecture](#cli-architecture)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Command Development](#command-development)
- [Memory Management](#memory-management)
- [Hook System](#hook-system)
- [Submission Process](#submission-process)

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- TypeScript >= 5.8.3
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/ruvnet/claude-code-flow.git
cd claude-code-flow

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Development Scripts

```bash
# Development with memory optimization
npm run dev:optimized

# TypeScript compilation
npm run build:tsx

# Watch mode for TypeScript
npm run dev:build

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Comprehensive testing
npm run test:comprehensive
```

## CLI Architecture

### Unified Architecture (Phase 1D)

The CLI has been consolidated into a single, modular system:

```
src/cli/
├── simple-cli.ts           # Main entry point (unified)
├── command-registry.js     # Command registration system
├── utils.js               # Core utilities
├── help-utils.ts          # Help system
├── simple-commands/       # Command implementations
│   ├── agent.ts          # Agent management
│   ├── swarm.ts          # Swarm coordination
│   ├── memory.ts         # Memory operations
│   ├── hooks.ts          # Hook system
│   └── ...               # Other commands
└── commands/             # TypeScript commands (being migrated)
```

### Key Principles

1. **Single Entry Point**: `simple-cli.ts` is the unified CLI entry
2. **Modular Commands**: Each command is a separate module
3. **TypeScript-First**: New code should be TypeScript
4. **Memory Optimized**: Built-in memory management and GC
5. **Hook Integration**: Extensible automation system

### Architecture Components

#### Command Registry (`command-registry.js`)

Central command registration and execution system:

```javascript
// Register a command
export function registerCommand(name, handler, description, examples) {
  commands.set(name, { handler, description, examples });
}

// Execute a command
export async function executeCommand(name, args, flags) {
  const command = commands.get(name);
  if (!command) throw new Error(`Command not found: ${name}`);
  return await command.handler(args, flags);
}
```

#### Memory Management

Built-in memory optimization features:

- Emergency garbage collection
- Memory usage monitoring
- Cross-session persistence
- Automatic cleanup

#### Hook System

Extensible pre/post command automation:

```typescript
// Pre-command hook
export async function preCommandHook(command: string, args: string[]) {
  // Setup, validation, preparation
}

// Post-command hook
export async function postCommandHook(command: string, result: any) {
  // Cleanup, logging, follow-up actions
}
```

## Code Standards

### TypeScript Guidelines

#### File Structure

```typescript
// ABOUTME: Command implementation for [feature description]
// ABOUTME: Provides [specific functionality]

import type { CommandArgs, CommandFlags } from '../types';

export interface [Command]Config {
  // Configuration interface
}

export class [Command]Handler {
  // Command implementation
}

export async function [command]Handler(
  args: CommandArgs,
  flags: CommandFlags
): Promise<void> {
  // Main command logic
}
```

#### Type Safety

- Use strict TypeScript configuration
- Define interfaces for all command arguments
- Implement proper error handling with typed exceptions
- Use generics for reusable components

#### Naming Conventions

- **Files**: kebab-case (`memory-manager.ts`)
- **Classes**: PascalCase (`MemoryManager`)
- **Functions**: camelCase (`executeCommand`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **Interfaces**: PascalCase with descriptive suffixes (`CommandConfig`)

### JavaScript Guidelines (Legacy)

For existing JavaScript files being maintained:

- Follow existing patterns
- Add JSDoc comments for type hints
- Use ES modules (`import`/`export`)
- Maintain backward compatibility

### Code Quality

#### Linting and Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

#### Error Handling

```typescript
// Use typed errors
class CommandError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CommandError';
  }
}

// Proper error handling
try {
  await executeCommand(name, args, flags);
} catch (error) {
  if (error instanceof CommandError) {
    console.error(`Command failed: ${error.message}`);
    process.exit(1);
  }
  throw error; // Re-throw unknown errors
}
```

## Testing Guidelines

### Test Structure

```
tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── e2e/                 # End-to-end tests
└── performance/         # Performance tests
```

### Testing Standards

#### Unit Tests

```typescript
// ABOUTME: Unit tests for [component]
// ABOUTME: Tests [specific functionality]

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryManager } from '../src/memory/memory-manager';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager();
  });

  afterEach(() => {
    memoryManager.cleanup();
  });

  it('should store and retrieve data', async () => {
    await memoryManager.store('test-key', 'test-value');
    const result = await memoryManager.get('test-key');
    expect(result).toBe('test-value');
  });
});
```

#### Integration Tests

Test command interactions and system integration:

```typescript
import { execSync } from 'child_process';

describe('CLI Integration', () => {
  it('should execute swarm init command', () => {
    const result = execSync('npm run dev -- swarm init --topology mesh', {
      encoding: 'utf8'
    });
    expect(result).toContain('Swarm initialized');
  });
});
```

#### E2E Tests

Test complete workflows:

```typescript
describe('Development Workflow', () => {
  it('should complete full development cycle', async () => {
    // Initialize project
    await runCommand('init --template typescript');

    // Start session
    await runCommand('hooks start --task test-development');

    // Initialize swarm
    await runCommand('swarm init --topology mesh --agents 3');

    // Complete session
    await runCommand('hooks complete --task test-development');

    // Verify results
    expect(getSessionData()).toBeDefined();
  });
});
```

### Test Requirements

- **Coverage**: Minimum 80% code coverage
- **All Test Types**: Unit, integration, and E2E tests required
- **Performance**: Performance tests for critical paths
- **Mocking**: No mock implementations - use real data and APIs
- **Clean Output**: Test output must be pristine to pass

### Running Tests

```bash
# All tests
npm test

# Specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Debug mode
npm run test:debug
```

## Command Development

### Creating New Commands

#### 1. TypeScript Command Template

```typescript
// ABOUTME: Implementation of [command-name] command
// ABOUTME: Provides [specific functionality description]

import type { CommandArgs, CommandFlags } from '../../types';
import { registerCommand } from '../command-registry.js';

export interface [CommandName]Options {
  // Command-specific options
}

export async function [commandName]Handler(
  args: CommandArgs,
  flags: CommandFlags
): Promise<void> {
  try {
    // Command implementation
    console.log(`Executing ${commandName} with args:`, args);

    // Process command logic

    console.log(`✅ ${commandName} completed successfully`);
  } catch (error) {
    console.error(`❌ ${commandName} failed:`, error.message);
    throw error;
  }
}

// Register command
registerCommand(
  '[command-name]',
  [commandName]Handler,
  '[Command description]',
  [
    'claude-flow [command-name] --option value',
    'claude-flow [command-name] --flag'
  ]
);
```

#### 2. Command Registration

Add to `command-registry.js`:

```javascript
import { [commandName]Handler } from './simple-commands/[command-name].js';

// Register in initialization
registerCommand(
  '[command-name]',
  [commandName]Handler,
  '[Description]',
  ['example1', 'example2']
);
```

#### 3. Help Integration

Commands automatically appear in help system when registered.

### Command Standards

#### Input Validation

```typescript
export function validateArgs(args: CommandArgs): void {
  if (args.length < 1) {
    throw new CommandError('Missing required argument', 'MISSING_ARG');
  }

  // Additional validation
}
```

#### Flag Processing

```typescript
export function processFlags(flags: CommandFlags): ProcessedFlags {
  return {
    verbose: flags.verbose || flags.v || false,
    dryRun: flags['dry-run'] || flags.n || false,
    // Process other flags
  };
}
```

#### Error Handling

```typescript
export async function commandHandler(args: CommandArgs, flags: CommandFlags) {
  try {
    validateArgs(args);
    const processedFlags = processFlags(flags);

    // Command logic

  } catch (error) {
    if (error instanceof CommandError) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}
```

## Memory Management

### Memory Store Integration

Commands should integrate with the memory system:

```typescript
import { MemoryStore } from '../memory/shared-memory.js';

export async function commandWithMemory(args: CommandArgs) {
  const memory = new MemoryStore();

  // Store command state
  await memory.store('command/state', {
    started: Date.now(),
    args: args
  });

  // Retrieve previous state
  const previousState = await memory.get('command/previous');

  // Command logic

  // Update memory
  await memory.store('command/result', result);
}
```

### Memory Optimization

Commands should be memory-efficient:

```typescript
export async function memoryEfficientCommand(largeData: any[]) {
  // Process in chunks to avoid memory issues
  const CHUNK_SIZE = 1000;

  for (let i = 0; i < largeData.length; i += CHUNK_SIZE) {
    const chunk = largeData.slice(i, i + CHUNK_SIZE);
    await processChunk(chunk);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}
```

## Hook System

### Hook Integration

Commands should support hooks:

```typescript
import { executePreHook, executePostHook } from '../hooks/hook-execution-manager.js';

export async function commandWithHooks(args: CommandArgs, flags: CommandFlags) {
  const commandName = 'example-command';

  try {
    // Execute pre-command hooks
    await executePreHook(commandName, { args, flags });

    // Command logic
    const result = await executeCommand();

    // Execute post-command hooks
    await executePostHook(commandName, { result, args, flags });

    return result;
  } catch (error) {
    // Execute error hooks
    await executeErrorHook(commandName, { error, args, flags });
    throw error;
  }
}
```

### Creating Hooks

```typescript
// ABOUTME: Pre-command hook for [specific purpose]
// ABOUTME: Executes before [command type] commands

export async function preCommandHook(
  commandName: string,
  context: HookContext
): Promise<void> {
  // Hook logic
  console.log(`Executing pre-hook for ${commandName}`);

  // Setup, validation, preparation
}
```

## Submission Process

### Pre-Submission Checklist

- [ ] Code follows TypeScript-first guidelines
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code coverage meets minimum requirements
- [ ] Linting and formatting checks pass
- [ ] Documentation updated (if needed)
- [ ] Memory management considerations addressed
- [ ] Hook integration implemented (if applicable)
- [ ] No breaking changes (or properly documented)

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-command

# Make changes and commit
git add .
git commit -m "feat: add new command implementation"

# Run pre-commit checks
npm run lint
npm test
npm run typecheck

# Push and create PR
git push origin feature/new-command
```

### Commit Messages

Follow conventional commit format:

```
feat: add memory optimization to swarm commands
fix: resolve TypeScript compilation issues in hooks
docs: update CLI architecture documentation
test: add E2E tests for agent coordination
refactor: consolidate duplicate command handlers
perf: optimize memory usage in large data processing
```

### Pull Request Guidelines

#### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests pass

## Documentation
- [ ] Code comments updated
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] No breaking changes (or documented)
- [ ] Memory management considered
- [ ] Hook integration implemented
```

#### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainer review for architecture and standards
3. **Testing**: Manual testing of new functionality
4. **Documentation**: Verify documentation is complete and accurate
5. **Merge**: Squash and merge with conventional commit message

### Release Process

#### Version Bumping

```bash
# Patch version (bug fixes)
npm run publish:patch

# Minor version (new features)
npm run publish:minor

# Major version (breaking changes)
npm run publish:major

# Alpha release
npm run publish:alpha
```

## Development Tips

### Debugging

```bash
# Debug mode with inspector
npm run test:debug

# Memory profiling
NODE_OPTIONS="--inspect --max-old-space-size=12288" npm run dev

# Performance monitoring
npm run diagnostics
npm run health-check
```

### Performance Optimization

- Use memory-optimized startup scripts
- Implement lazy loading for commands
- Consider garbage collection in long-running operations
- Monitor memory usage with built-in tools

### IDE Setup

Recommended VS Code extensions:
- TypeScript Hero
- ESLint
- Prettier
- Jest
- GitLens

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/ruvnet/claude-code-flow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ruvnet/claude-code-flow/discussions)
- **Documentation**: `/docs` directory
- **Examples**: `/docs/examples`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
