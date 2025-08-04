# Debug Infrastructure Completion - Implementation Guide

**HIVE MIND WORKER**: Architecture_Designer  
**DELIVERABLE**: Concrete implementation patterns for completing debug logging infrastructure

## Overview

This guide provides concrete implementation steps to complete the remaining 10% of debug logging infrastructure, leveraging the existing 90% of enterprise-grade components.

**Existing Infrastructure (LEVERAGE, DON'T REPLACE)**:

- `DebugLogger` class (1,071 lines) - Core debug logging with correlation IDs
- `MCPDebugLogger` (835 lines) - MCP protocol compliance and cross-system correlation
- `ConsoleMigration` utilities - Systematic console.* replacement with tracking
- `ComponentLoggerFactory` - Component-specific logger creation

## 1. Main Entry Point Integration

### 1.1 Target: `src/cli/main.ts` (Current: 32 lines)

**BEFORE** (current implementation):

```typescript
// Line 28: console.error('Fatal error:', error);
if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
```

**AFTER** (enhanced implementation):

```typescript
import { ComponentLoggerFactory, generateCorrelationId, generateSessionId } from './core/logger.js';

async function enhancedMain(): Promise<void> {
  // 1. Initialize debug context
  const correlationId = generateCorrelationId();
  const sessionId = generateSessionId();

  // 2. Setup CLI component logger (leverages existing ComponentLoggerFactory)
  const cliLogger = ComponentLoggerFactory.getLogger('CLI')
    .withCorrelationId(correlationId)
    .withSessionId(sessionId);

  // 3. Track CLI startup
  cliLogger.debugComponent('CLI', 'Claude-Flow CLI starting', {
    version: VERSION,
    args: process.argv.slice(2),
    correlationId,
    sessionId,
    memory: process.memoryUsage(),
    performance: { startTime: performance.now() }
  });

  try {
    const cli = new CLI('claude-flow', 'Advanced AI Agent Orchestration System');

    // 4. Inject debug context
    if ('setDebugContext' in cli) {
      (cli as any).setDebugContext({ correlationId, sessionId });
    }

    setupCommands(cli);
    await cli.run();

    cliLogger.debugComponent('CLI', 'CLI execution completed successfully', {
      correlationId,
      duration: performance.now() - performance.now()
    });

  } catch (error) {
    // REPLACE console.error with component logging
    cliLogger.error('Fatal CLI error', {
      error,
      correlationId,
      sessionId,
      stack: error instanceof Error ? error.stack : undefined,
      memory: process.memoryUsage()
    });

    // Graceful shutdown
    await ComponentLoggerFactory.shutdown();
    process.exit(1);
  }
}

if (isMainModule) {
  enhancedMain().catch(async (error) => {
    // Final fallback - if logger setup fails, use minimal console
    console.error('Logger initialization failed:', error);
    process.exit(1);
  });
}
```

### 1.2 Target: `src/cli/cli-core.ts` Console Replacements

**Identified Console Calls** (12 total):

- Line 93: `console.log(\`\${this.name} v\${VERSION}\`)`
- Line 106: `console.error(chalk.red(\`Unknown command: \${commandName}\`))`
- Line 107: `console.log(\`Run "\${this.name} help" for available commands\`)`
- Lines 121, 124, 129: Error handling console calls
- Lines 232, 281, 285, 289, 293: Helper function console calls
- Line 318: `main().catch(console.error)`

**Implementation Pattern**:

```typescript
import { ComponentLoggerFactory, type IDebugLogger } from '../core/logger.js';

export class CLI {
  private debugContext?: { correlationId: string; sessionId: string };
  private cliLogger?: IDebugLogger;

  // Add debug context injection
  setDebugContext(context: { correlationId: string; sessionId: string }): void {
    this.debugContext = context;
    this.cliLogger = ComponentLoggerFactory.getLogger('CLI')
      .withCorrelationId(context.correlationId)
      .withSessionId(context.sessionId);
  }

  async run(args?: string[]): Promise<void> {
    const parsed = this.parseArgs(args);

    // REPLACE: console.log(`${this.name} v${VERSION}`)
    if (parsed.options.version) {
      if (this.cliLogger) {
        this.cliLogger.info(`${this.name} v${VERSION}`, {
          correlationId: this.debugContext?.correlationId,
          sessionId: this.debugContext?.sessionId
        });
      } else {
        console.log(`${this.name} v${VERSION}`);
      }
      return;
    }

    const { commandName, commandArgs, options } = parsed;
    const command = this.commands.get(commandName);

    if (!command) {
      // REPLACE: console.error(chalk.red(`Unknown command: ${commandName}`))
      if (this.cliLogger) {
        this.cliLogger.error(`Unknown command: ${commandName}`, {
          command: commandName,
          availableCommands: Array.from(this.commands.keys()),
          correlationId: this.debugContext?.correlationId
        });

        // REPLACE: console.log(`Run "${this.name} help" for available commands`)
        this.cliLogger.info(`Run "${this.name} help" for available commands`);
      } else {
        console.error(chalk.red(`Unknown command: ${commandName}`));
        console.log(`Run "${this.name} help" for available commands`);
      }
      return;
    }

    try {
      if (!command.action) {
        // REPLACE: console.log(chalk.yellow(`Command '${commandName}' has no action defined`))
        if (this.cliLogger) {
          this.cliLogger.warn(`Command '${commandName}' has no action defined`, {
            command: commandName,
            correlationId: this.debugContext?.correlationId
          });
        } else {
          console.log(chalk.yellow(`Command '${commandName}' has no action defined`));
        }
        return;
      }

      // Track command execution with performance
      const startTime = performance.now();
      await command.action(commandArgs, options);
      const duration = performance.now() - startTime;

      if (this.cliLogger) {
        this.cliLogger.debugComponent('CLI', 'Command executed successfully', {
          command: commandName,
          duration,
          correlationId: this.debugContext?.correlationId
        });
      }

    } catch (error) {
      // REPLACE: console.error()
      if (this.cliLogger) {
        this.cliLogger.error('Command execution failed', {
          command: commandName,
          error,
          correlationId: this.debugContext?.correlationId,
          sessionId: this.debugContext?.sessionId
        });
      } else {
        console.error(error);
      }
      throw error;
    }
  }
}

// REPLACE helper functions
export function success(message: string): void {
  const logger = ComponentLoggerFactory.getLogger('CLI');
  logger.info(message, { level: 'success' });
}

export function error(message: string): void {
  const logger = ComponentLoggerFactory.getLogger('CLI');
  logger.error(message, { level: 'error' });
}

export function warning(message: string): void {
  const logger = ComponentLoggerFactory.getLogger('CLI');
  logger.warn(message, { level: 'warning' });
}

export function info(message: string): void {
  const logger = ComponentLoggerFactory.getLogger('CLI');
  logger.info(message, { level: 'info' });
}
```

## 2. Console Migration Implementation

### 2.1 Create Console Migration Executor

**New File**: `src/utils/console-migration-executor.ts`

```typescript
import { ConsoleMigration, type ComponentType } from './console-migration.js';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface MigrationPhase {
  name: string;
  files: string[];
  strategy: 'component-replace' | 'context-aware' | 'performance-sensitive';
  component: ComponentType;
  priority: 'high' | 'medium' | 'low';
}

export class ConsoleMigrationExecutor {
  private readonly migrationPhases: MigrationPhase[] = [
    // Phase 1: Critical CLI components
    {
      name: 'cli-core',
      files: ['src/cli/main.ts', 'src/cli/cli-core.ts'],
      strategy: 'component-replace',
      component: 'CLI',
      priority: 'high'
    },

    // Phase 2: Command handlers
    {
      name: 'command-handlers',
      files: ['src/cli/commands/index.ts'],
      strategy: 'context-aware',
      component: 'CLI',
      priority: 'medium'
    },

    // Phase 3: Core utilities
    {
      name: 'core-utilities',
      files: ['src/core/*.ts', 'src/utils/*.ts'],
      strategy: 'performance-sensitive',
      component: 'Core',
      priority: 'low'
    }
  ];

  async executeSystematicMigration(): Promise<void> {
    console.log('Starting systematic console migration...');

    for (const phase of this.migrationPhases) {
      console.log(`\nExecuting phase: ${phase.name} (Priority: ${phase.priority})`);

      try {
        await this.executePhase(phase);
        console.log(`✅ Phase ${phase.name} completed successfully`);
      } catch (error) {
        console.error(`❌ Phase ${phase.name} failed:`, error);
        throw error;
      }
    }

    // Generate migration report
    const report = ConsoleMigration.generateMigrationReport();
    console.log('\n📊 Migration Report:', report);
  }

  private async executePhase(phase: MigrationPhase): Promise<void> {
    for (const filePattern of phase.files) {
      const files = await this.expandFilePattern(filePattern);

      for (const file of files) {
        await this.migrateFile(file, phase);
      }
    }
  }

  private async migrateFile(filePath: string, phase: MigrationPhase): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    let updatedContent = content;

    // Migration patterns based on strategy
    switch (phase.strategy) {
      case 'component-replace':
        updatedContent = this.replaceWithComponentLoggers(content, phase.component);
        break;

      case 'context-aware':
        updatedContent = this.replaceWithContextAwareLoggers(content, phase.component);
        break;

      case 'performance-sensitive':
        updatedContent = this.replaceWithPerformanceOptimizedLoggers(content, phase.component);
        break;
    }

    if (updatedContent !== content) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      console.log(`  📝 Migrated: ${filePath}`);
    }
  }

  private replaceWithComponentLoggers(content: string, component: ComponentType): string {
    return content
      // Replace console.log
      .replace(
        /console\.log\(([^)]+)\)/g,
        `ConsoleMigration.log('${component}', $1)`
      )
      // Replace console.error
      .replace(
        /console\.error\(([^)]+)\)/g,
        `ConsoleMigration.error('${component}', $1)`
      )
      // Replace console.warn
      .replace(
        /console\.warn\(([^)]+)\)/g,
        `ConsoleMigration.warn('${component}', $1)`
      )
      // Replace console.info
      .replace(
        /console\.info\(([^)]+)\)/g,
        `ConsoleMigration.info('${component}', $1)`
      )
      // Add import if not present
      .replace(
        /^(import[^;]*;)$/m,
        `$1\nimport { ConsoleMigration } from '../utils/console-migration.js';`
      );
  }

  private replaceWithContextAwareLoggers(content: string, component: ComponentType): string {
    // More sophisticated replacement that preserves context
    return content
      .replace(
        /console\.log\(([^)]+)\)/g,
        (match, args) => {
          return `ConsoleMigration.log('${component}', ${args})`;
        }
      );
  }

  private replaceWithPerformanceOptimizedLoggers(content: string, component: ComponentType): string {
    // Performance-sensitive replacements with lazy evaluation
    return content
      .replace(
        /console\.log\(([^)]+)\)/g,
        `ConsoleMigration.log('${component}', () => $1)`
      );
  }

  private async expandFilePattern(pattern: string): Promise<string[]> {
    if (pattern.includes('*')) {
      // Simple glob expansion - in production, use a proper glob library
      const dir = pattern.substring(0, pattern.lastIndexOf('/'));
      const files = await fs.readdir(dir);
      return files
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .map(file => path.join(dir, file));
    }
    return [pattern];
  }
}
```

### 2.2 Migration Execution Script

**New File**: `scripts/migrate-console-calls.ts`

```typescript
#!/usr/bin/env node
import { ConsoleMigrationExecutor } from '../src/utils/console-migration-executor.js';

async function main() {
  try {
    const executor = new ConsoleMigrationExecutor();
    await executor.executeSystematicMigration();

    console.log('\n🎉 Console migration completed successfully!');
    console.log('📋 Next steps:');
    console.log('  1. Run tests: npm test');
    console.log('  2. Run linting: npm run lint');
    console.log('  3. Verify debug logs: npm run start -- --debug');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
```

## 3. Performance Optimization Implementation

### 3.1 Enhanced Memory Monitor

**New File**: `src/core/performance-monitor.ts`

```typescript
import { ComponentLoggerFactory, type LoggingConfig } from './logger.js';

export class PerformanceMonitor {
  private readonly thresholds = {
    normal: 0.3,     // Full debug logging
    reduced: 0.6,    // Reduce verbosity
    minimal: 0.8,    // Essential only
    emergency: 0.9   // Circuit breaker
  };

  private memoryHistory: number[] = [];
  private readonly maxHistorySize = 100;

  getCurrentMemoryPressure(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / usage.heapTotal;
  }

  adjustLoggingStrategy(): void {
    const pressure = this.getCurrentMemoryPressure();
    this.memoryHistory.push(pressure);

    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Get the core logger to trigger adjustments
    const coreLogger = ComponentLoggerFactory.getLogger('Core');

    if (pressure >= this.thresholds.emergency) {
      // Use existing emergency mode functionality
      coreLogger.enableEmergencyMode();

      console.warn(`🚨 Memory pressure critical (${(pressure * 100).toFixed(1)}%) - Emergency mode activated`);

    } else if (pressure >= this.thresholds.minimal) {
      // Adjust component logger levels
      ComponentLoggerFactory.adjustGlobalLevel('warn');

    } else if (pressure >= this.thresholds.reduced) {
      ComponentLoggerFactory.adjustGlobalLevel('info');

    } else {
      // Normal operation
      ComponentLoggerFactory.adjustGlobalLevel('debug');

      // Disable emergency mode if it was active
      if (coreLogger.isEmergencyMode) {
        coreLogger.disableEmergencyMode();
      }
    }
  }

  startMonitoring(intervalMs: number = 5000): void {
    setInterval(() => {
      this.adjustLoggingStrategy();
    }, intervalMs);
  }

  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < 10) return 'stable';

    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 0.05) return 'increasing';
    if (difference < -0.05) return 'decreasing';
    return 'stable';
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
```

### 3.2 Integration with Main Entry Point

```typescript
// Add to enhanced main.ts
import { performanceMonitor } from './core/performance-monitor.js';

async function enhancedMain(): Promise<void> {
  // ... existing code ...

  // Start performance monitoring
  performanceMonitor.startMonitoring(5000); // Every 5 seconds

  // ... rest of main function ...
}
```

## 4. Cross-System Integration Enhancement

### 4.1 Enhanced MCP Integration

**Target**: `src/mcp/server.ts` and `src/mcp/debug-logger.ts`

```typescript
// Add to MCP server initialization
import { ComponentLoggerFactory } from '../core/logger.js';

export function setupMCPServer(correlationId?: string) {
  const mcpLogger = ComponentLoggerFactory.getMCPLogger();

  if (correlationId) {
    // Link to CLI session
    mcpLogger.linkToClaudeCode(correlationId, {
      sessionType: 'CLI',
      capabilities: ['file-operations', 'code-analysis'],
      metadata: {
        version: VERSION,
        platform: process.platform
      }
    });
  }

  // ... existing MCP server setup ...
}
```

## 5. Testing and Validation

### 5.1 Debug Logging Test

**New File**: `tests/debug-integration.test.ts`

```typescript
import { ComponentLoggerFactory } from '../src/core/logger.js';
import { ConsoleMigration } from '../src/utils/console-migration.js';
import { performanceMonitor } from '../src/core/performance-monitor.js';

describe('Debug Infrastructure Integration', () => {
  test('ComponentLoggerFactory creates loggers with correlation', () => {
    const logger = ComponentLoggerFactory.getLogger('CLI')
      .withCorrelationId('test-123')
      .withSessionId('session-456');

    expect(logger.correlationId).toBe('test-123');
    expect(logger.sessionId).toBe('session-456');
  });

  test('ConsoleMigration tracks usage', () => {
    ConsoleMigration.log('CLI', 'test message');
    const stats = ConsoleMigration.getMigrationStats();

    expect(stats.get('log')?.migratedCalls).toBeGreaterThan(0);
  });

  test('Performance monitor adjusts under pressure', () => {
    // Mock high memory pressure
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 900 * 1024 * 1024, // 900MB
      heapTotal: 1000 * 1024 * 1024, // 1GB
      external: 0,
      arrayBuffers: 0,
      rss: 0
    });

    performanceMonitor.adjustLoggingStrategy();

    const coreLogger = ComponentLoggerFactory.getLogger('Core');
    expect(coreLogger.isEmergencyMode).toBe(true);
  });
});
```

### 5.2 Migration Validation Script

**New File**: `scripts/validate-migration.ts`

```typescript
#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

async function validateMigration() {
  const srcDir = './src';
  const files = await getAllTSFiles(srcDir);

  let totalConsoleReferences = 0;
  let remainingFiles: string[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const consoleMatches = content.match(/console\.(log|info|warn|error|debug)/g);

    if (consoleMatches) {
      totalConsoleReferences += consoleMatches.length;
      remainingFiles.push(file);
      console.log(`❌ ${file}: ${consoleMatches.length} console references`);
    }
  }

  if (totalConsoleReferences === 0) {
    console.log('✅ Migration complete - no console references found');
  } else {
    console.log(`⚠️  Migration incomplete - ${totalConsoleReferences} console references in ${remainingFiles.length} files`);
  }

  return totalConsoleReferences === 0;
}

async function getAllTSFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      files.push(...await getAllTSFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

validateMigration()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
```

## 6. Implementation Checklist

### Phase 1: Main Entry Point (Priority: HIGH)

- [ ] Enhance `src/cli/main.ts` with debug context initialization
- [ ] Replace `console.error` with component logging
- [ ] Add correlation ID generation and propagation
- [ ] Add graceful shutdown with logger cleanup
- [ ] Test CLI startup with debug logging

### Phase 2: CLI Core Integration (Priority: HIGH)

- [ ] Add `setDebugContext` method to CLI class
- [ ] Replace 12 console calls with component logging
- [ ] Enhance error handling with correlation context
- [ ] Add performance tracking for command execution
- [ ] Test all CLI commands with debug logging

### Phase 3: Console Migration (Priority: MEDIUM)

- [ ] Create `ConsoleMigrationExecutor` class
- [ ] Implement systematic migration phases
- [ ] Add rollback mechanisms
- [ ] Create migration validation script
- [ ] Execute migration across remaining files

### Phase 4: Performance Optimization (Priority: LOW)

- [ ] Create `PerformanceMonitor` class
- [ ] Enhance memory pressure monitoring
- [ ] Implement adaptive logging strategies
- [ ] Add circuit breaker optimization
- [ ] Monitor performance overhead (<10%)

### Phase 5: Cross-System Enhancement (Priority: MEDIUM)

- [ ] Enhance MCP server correlation integration
- [ ] Improve claude-code session linking
- [ ] Validate protocol compliance
- [ ] Test cross-system correlation propagation

### Phase 6: Testing and Validation (Priority: HIGH)

- [ ] Create debug integration tests
- [ ] Implement migration validation
- [ ] Add performance regression tests
- [ ] Verify correlation ID propagation
- [ ] Test emergency mode activation

## 7. Success Metrics

- **✅ Complete Coverage**: 100% console.* calls replaced
- **✅ Performance**: <10% overhead from debug infrastructure  
- **✅ Correlation**: Cross-system correlation ID propagation functional
- **✅ Compliance**: MCP protocol compliance maintained
- **✅ Memory**: Adaptive pressure handling operational
- **✅ Quality**: All tests passing, no linting errors

This implementation guide provides concrete, actionable steps to complete the debug logging infrastructure while leveraging the existing 90% of enterprise-grade components.
