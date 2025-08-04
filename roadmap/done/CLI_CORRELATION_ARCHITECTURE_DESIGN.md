# CLI Correlation Architecture Design

## Executive Summary

This document details the enhanced CLI correlation architecture that extends the existing ComponentLoggerFactory correlation system for CLI command tracking and cross-system coordination. The design maintains full compatibility with existing correlation mechanisms while adding CLI-specific command lifecycle tracking.

## Current Correlation Infrastructure Analysis

### Existing Capabilities

From the analysis of `src/core/logger.ts` and `src/mcp/debug-logger.ts`:

**Existing Correlation Features:**

- `correlationId` and `sessionId` tracking in `IDebugLogger`
- `withCorrelationId()` and `withSessionId()` methods for logger chaining
- Cross-system correlation in `MCPDebugLogger` with `CrossSystemCorrelation` interface
- `generateCorrelationId()` and `generateSessionId()` utility functions
- Component-based correlation through `ComponentLoggerFactory`

**Current Correlation Flow:**

1. Correlation IDs generated via `generateCorrelationId()`
2. Loggers chained with correlation context using `withCorrelationId()`
3. Cross-system links tracked via `MCPDebugLogger.createCrossSystemCorrelation()`
4. Component-specific loggers created via `ComponentLoggerFactory.getLogger()`

## Enhanced CLI Correlation Architecture

### 1. CLI Command Correlation Manager

```typescript
/**
 * CLI Command Correlation Manager extending existing correlation system
 * Integrates with existing ComponentLoggerFactory pattern
 */
export class CLICommandCorrelationManager {
  private commandCorrelations = new Map<string, CLICommandCorrelation>();
  private hierarchyIndex = new Map<string, string[]>(); // parentId -> childIds
  private nameIndex = new Map<string, string[]>(); // commandName -> commandIds
  private sessionCorrelations = new Map<string, string[]>(); // sessionId -> commandIds

  // Integration with existing systems
  private baseLogger: IDebugLogger;
  private mcpDebugLogger?: MCPDebugLogger;
  private eventBus?: IEventBus;

  constructor(
    baseLogger?: IDebugLogger,
    mcpDebugLogger?: MCPDebugLogger,
    eventBus?: IEventBus
  ) {
    // Use existing ComponentLoggerFactory for CLI logging
    this.baseLogger = baseLogger || ComponentLoggerFactory.getCLILogger();
    this.mcpDebugLogger = mcpDebugLogger;
    this.eventBus = eventBus;
  }

  /**
   * Create CLI command correlation extending existing correlation system
   */
  createCommandCorrelation(
    commandName: string,
    args: CommandArgs,
    context: CLIContext,
    parentCorrelationId?: string
  ): CLICommandCorrelation {
    const commandId = this.generateCommandId(commandName);
    const correlationId = generateCorrelationId();
    const sessionId = context.sessionId || generateSessionId();

    // Create logger with existing correlation chain
    const correlatedLogger = this.baseLogger
      .withCorrelationId(correlationId)
      .withSessionId(sessionId)
      .withComponent('CLI');

    const correlation: CLICommandCorrelation = {
      commandId,
      commandName,
      parentCommandId: parentCorrelationId,
      childCommandIds: [],
      correlationId,
      sessionId,
      startTime: Date.now(),
      status: 'running',

      // Integration points
      mcpCorrelationId: undefined,
      swarmTaskId: undefined,
      eventBusCorrelations: [],

      // Context and tracking
      args: this.sanitizeArgs(args, context.compliance.dataClassification),
      environment: context,
      metrics: this.initializeMetrics(),

      // Lifecycle tracking
      steps: [],
      errors: [],
      warnings: [],

      // Performance tracking
      performanceMarkers: new Map(),
      resourceSnapshots: []
    };

    // Store correlation
    this.commandCorrelations.set(commandId, correlation);

    // Update hierarchy index
    if (parentCorrelationId) {
      const parentChildren = this.hierarchyIndex.get(parentCorrelationId) || [];
      parentChildren.push(commandId);
      this.hierarchyIndex.set(parentCorrelationId, parentChildren);

      // Update parent's child list
      const parentCorrelation = this.commandCorrelations.get(parentCorrelationId);
      if (parentCorrelation) {
        parentCorrelation.childCommandIds.push(commandId);
      }
    }

    // Update name index
    const nameIds = this.nameIndex.get(commandName) || [];
    nameIds.push(commandId);
    this.nameIndex.set(commandName, nameIds);

    // Update session index
    const sessionIds = this.sessionCorrelations.get(sessionId) || [];
    sessionIds.push(commandId);
    this.sessionCorrelations.set(sessionId, sessionIds);

    // Integrate with MCP correlation if available
    if (this.mcpDebugLogger) {
      const mcpCorrelationId = this.mcpDebugLogger.createCrossSystemCorrelation(
        sessionId,
        correlationId,
        {
          commandId,
          commandName,
          initiatingSystem: 'claude-flow'
        }
      );
      correlation.mcpCorrelationId = mcpCorrelationId;
    }

    // Emit correlation event
    if (this.eventBus) {
      this.eventBus.emit('cli:command:correlation:created', {
        commandId,
        correlationId,
        commandName,
        parentCommandId: parentCorrelationId,
        sessionId
      });
    }

    // Log correlation creation with existing debug system
    correlatedLogger.debugComponent('CLI', 'CLI command correlation created', {
      commandId,
      commandName,
      correlationId,
      sessionId,
      parentCommandId: parentCorrelationId,
      mcpCorrelationId: correlation.mcpCorrelationId
    });

    return correlation;
  }

  /**
   * Track command lifecycle event with performance monitoring
   */
  trackCommandLifecycle(
    commandId: string,
    event: CommandLifecycleEvent
  ): void {
    const correlation = this.commandCorrelations.get(commandId);
    if (!correlation) {
      this.baseLogger.warn('Command correlation not found for lifecycle event', {
        commandId,
        event: event.type
      });
      return;
    }

    // Create performance-aware logger
    const perfLogger = this.baseLogger
      .withCorrelationId(correlation.correlationId)
      .withSessionId(correlation.sessionId)
      .withComponent('CLI');

    perfLogger.timeStart(`lifecycle-${event.type}-${commandId}`);

    try {
      // Add lifecycle step
      const step: CommandStep = {
        stepId: `${event.type}-${Date.now()}`,
        stepName: event.type,
        timestamp: event.timestamp,
        duration: event.duration,
        status: 'completed',
        data: event.data,
        performanceMetrics: this.captureStepMetrics()
      };

      correlation.steps.push(step);

      // Update correlation status
      if (event.type === 'complete') {
        correlation.status = 'completed';
        correlation.endTime = event.timestamp;
        correlation.metrics = this.finalizeMetrics(correlation);
      } else if (event.type === 'error') {
        correlation.status = 'failed';
        correlation.endTime = event.timestamp;
      }

      // Performance marker
      if (event.duration) {
        correlation.performanceMarkers.set(event.type, {
          timestamp: event.timestamp,
          duration: event.duration,
          memoryUsage: process.memoryUsage().heapUsed
        });
      }

      // Resource snapshot for resource-intensive steps
      if (['execute', 'complete'].includes(event.type)) {
        correlation.resourceSnapshots.push({
          timestamp: event.timestamp,
          step: event.type,
          resources: this.captureResourceSnapshot()
        });
      }

      // Cross-system integration
      this.integrateLifecycleEvent(correlation, step);

      // Log with existing debug system
      perfLogger.debugComponent('CLI', `Command lifecycle: ${event.type}`, {
        commandId,
        correlationId: correlation.correlationId,
        stepId: step.stepId,
        duration: event.duration,
        status: correlation.status,
        performanceMetrics: step.performanceMetrics
      });

    } finally {
      perfLogger.timeEnd(`lifecycle-${event.type}-${commandId}`,
        `Lifecycle ${event.type} processing completed`);
    }
  }

  /**
   * Integrate with MCP correlation system
   */
  integrateMCPCorrelation(commandId: string, mcpCorrelationId: string): void {
    const correlation = this.commandCorrelations.get(commandId);
    if (!correlation) return;

    correlation.mcpCorrelationId = mcpCorrelationId;

    // Link with existing MCP debug logger
    if (this.mcpDebugLogger) {
      this.mcpDebugLogger.linkToClaudeCode(
        mcpCorrelationId,
        correlation.sessionId,
        correlation.correlationId
      );
    }

    this.baseLogger.debugComponent('CLI', 'MCP correlation integrated', {
      commandId,
      correlationId: correlation.correlationId,
      mcpCorrelationId
    });
  }

  /**
   * Get complete correlation chain with cross-system links
   */
  getCorrelationChain(commandId: string): CorrelationChain | null {
    const correlation = this.commandCorrelations.get(commandId);
    if (!correlation) return null;

    // Build hierarchy
    const hierarchy = this.buildHierarchy(commandId);

    // Collect cross-system links
    const crossSystemLinks: CrossSystemLink[] = [];

    if (correlation.mcpCorrelationId) {
      crossSystemLinks.push({
        system: 'mcp',
        correlationId: correlation.mcpCorrelationId,
        linkType: 'sibling'
      });
    }

    if (correlation.swarmTaskId) {
      crossSystemLinks.push({
        system: 'swarm',
        correlationId: correlation.swarmTaskId,
        linkType: 'parent'
      });
    }

    correlation.eventBusCorrelations.forEach(eventId => {
      crossSystemLinks.push({
        system: 'eventbus',
        correlationId: eventId,
        linkType: 'sibling'
      });
    });

    // Build timeline
    const timeline = this.buildCorrelationTimeline(commandId, hierarchy);

    return {
      rootCommandId: this.findRootCommand(commandId),
      commandHierarchy: hierarchy,
      crossSystemLinks,
      timeline
    };
  }

  /**
   * Health monitoring and cleanup
   */
  getCorrelationHealth(): CorrelationHealthMetrics {
    const now = Date.now();
    const activeThreshold = 30000; // 30 seconds

    let totalCorrelations = this.commandCorrelations.size;
    let activeCorrelations = 0;
    let completedCorrelations = 0;
    let orphanedCorrelations = 0;
    let totalLifetime = 0;
    let crossSystemLinkSuccess = 0;

    const correlationErrors: Record<string, number> = {};

    for (const [commandId, correlation] of this.commandCorrelations.entries()) {
      if (correlation.status === 'running') {
        if (now - correlation.startTime > activeThreshold) {
          orphanedCorrelations++;
        } else {
          activeCorrelations++;
        }
      } else {
        completedCorrelations++;
        if (correlation.endTime) {
          totalLifetime += correlation.endTime - correlation.startTime;
        }
      }

      // Count cross-system links
      if (correlation.mcpCorrelationId || correlation.swarmTaskId ||
          correlation.eventBusCorrelations.length > 0) {
        crossSystemLinkSuccess++;
      }

      // Count errors
      correlation.errors.forEach(error => {
        correlationErrors[error.category] = (correlationErrors[error.category] || 0) + 1;
      });
    }

    return {
      totalCorrelations,
      activeCorrelations,
      completedCorrelations,
      orphanedCorrelations,
      averageCorrelationLifetime: completedCorrelations > 0 ?
        totalLifetime / completedCorrelations : 0,
      crossSystemLinkSuccess,
      correlationErrors
    };
  }

  /**
   * Cleanup orphaned correlations
   */
  async cleanupOrphanedCorrelations(): Promise<OrphanedCorrelation[]> {
    const now = Date.now();
    const orphanThreshold = 300000; // 5 minutes
    const orphaned: OrphanedCorrelation[] = [];

    for (const [commandId, correlation] of this.commandCorrelations.entries()) {
      if (correlation.status === 'running' &&
          now - correlation.startTime > orphanThreshold) {

        const orphanedCorrelation: OrphanedCorrelation = {
          commandId,
          commandName: correlation.commandName,
          orphanedAt: now,
          reason: 'timeout',
          lastKnownState: {
            correlationId: correlation.correlationId,
            sessionId: correlation.sessionId,
            startTime: correlation.startTime,
            steps: correlation.steps.slice(-5), // Last 5 steps
            errors: correlation.errors
          }
        };

        orphaned.push(orphanedCorrelation);

        // Remove from active correlations
        this.commandCorrelations.delete(commandId);

        // Cleanup indices
        this.cleanupIndices(commandId, correlation);

        // Log orphaned correlation
        this.baseLogger.warn('Orphaned CLI correlation cleaned up', {
          commandId,
          correlationId: correlation.correlationId,
          duration: now - correlation.startTime,
          reason: 'timeout'
        });
      }
    }

    return orphaned;
  }

  // Private helper methods
  private generateCommandId(commandName: string): string {
    return `cmd-${commandName}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }

  private sanitizeArgs(args: CommandArgs, classification: string): CommandArgs {
    if (classification === 'public') return args;

    const sanitized = { ...args };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];

    // Sanitize parsed args
    for (const key in sanitized.parsed) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized.parsed[key] = '[REDACTED]';
      }
    }

    // Mark sensitive positional args
    if (args.sensitive) {
      args.sensitive.forEach(index => {
        if (typeof index === 'number' && sanitized.positional[index]) {
          sanitized.positional[index] = '[REDACTED]';
        }
      });
    }

    return sanitized;
  }

  private initializeMetrics(): CLIPerformanceMetrics {
    return {
      commandStartTime: Date.now(),
      commandEndTime: 0,
      executionDuration: 0,
      memoryPeak: 0,
      memoryAverage: 0,
      cpuUsage: { user: 0, system: 0 },
      diskIO: { read: 0, write: 0 },
      networkIO: { sent: 0, received: 0 },
      overhead: {
        debuggingTime: 0,
        loggingTime: 0,
        correlationTime: 0
      }
    };
  }

  private captureStepMetrics(): StepPerformanceMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: Date.now(),
      memoryUsage: memUsage.heapUsed,
      cpuTime: cpuUsage.user + cpuUsage.system,
      overhead: 0 // Calculated separately
    };
  }

  private captureResourceSnapshot(): ResourceUsage {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heap: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        userTime: cpuUsage.user,
        systemTime: cpuUsage.system
      },
      filesystem: {
        reads: 0, // Would integrate with fs monitoring
        writes: 0,
        bytesRead: 0,
        bytesWritten: 0
      },
      network: {
        connections: 0, // Would integrate with network monitoring
        requestsSent: 0,
        responsesReceived: 0
      }
    };
  }

  private integrateLifecycleEvent(
    correlation: CLICommandCorrelation,
    step: CommandStep
  ): void {
    // EventBus integration
    if (this.eventBus) {
      const eventId = `${correlation.commandId}-${step.stepId}`;
      correlation.eventBusCorrelations.push(eventId);

      this.eventBus.emit('cli:command:step', {
        commandId: correlation.commandId,
        correlationId: correlation.correlationId,
        step: step.stepName,
        timestamp: step.timestamp,
        duration: step.duration,
        eventId
      });
    }

    // MCP integration
    if (this.mcpDebugLogger && correlation.mcpCorrelationId) {
      // Update MCP correlation with CLI step
      // This would integrate with MCPDebugLogger methods
    }
  }

  private buildHierarchy(commandId: string): CommandHierarchyNode[] {
    const visited = new Set<string>();
    const hierarchy: CommandHierarchyNode[] = [];

    const buildNode = (id: string, depth: number): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const correlation = this.commandCorrelations.get(id);
      if (!correlation) return;

      const node: CommandHierarchyNode = {
        commandId: id,
        parentId: correlation.parentCommandId,
        children: correlation.childCommandIds,
        depth
      };

      hierarchy.push(node);

      // Recurse into children
      correlation.childCommandIds.forEach(childId => {
        buildNode(childId, depth + 1);
      });
    };

    // Find root command
    const rootId = this.findRootCommand(commandId);
    buildNode(rootId, 0);

    return hierarchy;
  }

  private findRootCommand(commandId: string): string {
    const correlation = this.commandCorrelations.get(commandId);
    if (!correlation || !correlation.parentCommandId) {
      return commandId;
    }
    return this.findRootCommand(correlation.parentCommandId);
  }

  private buildCorrelationTimeline(
    commandId: string,
    hierarchy: CommandHierarchyNode[]
  ): CorrelationEvent[] {
    const events: CorrelationEvent[] = [];

    hierarchy.forEach(node => {
      const correlation = this.commandCorrelations.get(node.commandId);
      if (!correlation) return;

      // Add command start event
      events.push({
        timestamp: correlation.startTime,
        type: 'command_start',
        commandId: node.commandId,
        commandName: correlation.commandName,
        correlationId: correlation.correlationId,
        data: {
          args: correlation.args,
          parentId: correlation.parentCommandId
        }
      });

      // Add step events
      correlation.steps.forEach(step => {
        events.push({
          timestamp: step.timestamp,
          type: 'command_step',
          commandId: node.commandId,
          commandName: correlation.commandName,
          correlationId: correlation.correlationId,
          data: {
            stepName: step.stepName,
            duration: step.duration,
            status: step.status
          }
        });
      });

      // Add command end event
      if (correlation.endTime) {
        events.push({
          timestamp: correlation.endTime,
          type: 'command_end',
          commandId: node.commandId,
          commandName: correlation.commandName,
          correlationId: correlation.correlationId,
          data: {
            status: correlation.status,
            duration: correlation.endTime - correlation.startTime,
            metrics: correlation.metrics
          }
        });
      }
    });

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  private finalizeMetrics(correlation: CLICommandCorrelation): CLIPerformanceMetrics {
    const metrics = correlation.metrics;
    metrics.commandEndTime = Date.now();
    metrics.executionDuration = metrics.commandEndTime - metrics.commandStartTime;

    // Calculate averages and peaks from snapshots
    if (correlation.resourceSnapshots.length > 0) {
      const memoryValues = correlation.resourceSnapshots.map(s => s.resources.memory.heap);
      metrics.memoryPeak = Math.max(...memoryValues);
      metrics.memoryAverage = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    }

    return metrics;
  }

  private cleanupIndices(commandId: string, correlation: CLICommandCorrelation): void {
    // Remove from hierarchy index
    if (correlation.parentCommandId) {
      const parentChildren = this.hierarchyIndex.get(correlation.parentCommandId);
      if (parentChildren) {
        const index = parentChildren.indexOf(commandId);
        if (index !== -1) {
          parentChildren.splice(index, 1);
        }
      }
    }

    // Remove from name index
    const nameIds = this.nameIndex.get(correlation.commandName);
    if (nameIds) {
      const index = nameIds.indexOf(commandId);
      if (index !== -1) {
        nameIds.splice(index, 1);
      }
    }

    // Remove from session index
    const sessionIds = this.sessionCorrelations.get(correlation.sessionId);
    if (sessionIds) {
      const index = sessionIds.indexOf(commandId);
      if (index !== -1) {
        sessionIds.splice(index, 1);
      }
    }
  }
}
```

### 2. Supporting Type Definitions

```typescript
export interface CLICommandCorrelation {
  commandId: string;
  commandName: string;
  parentCommandId?: string;
  childCommandIds: string[];
  correlationId: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';

  // Cross-system references
  mcpCorrelationId?: string;
  swarmTaskId?: string;
  eventBusCorrelations: string[];

  // Context
  args: CommandArgs;
  environment: CLIContext;
  metrics: CLIPerformanceMetrics;

  // Lifecycle tracking
  steps: CommandStep[];
  errors: CLIError[];
  warnings: string[];

  // Performance tracking
  performanceMarkers: Map<string, PerformanceMarker>;
  resourceSnapshots: ResourceSnapshot[];
}

export interface CommandStep {
  stepId: string;
  stepName: string;
  timestamp: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  data?: unknown;
  performanceMetrics: StepPerformanceMetrics;
}

export interface PerformanceMarker {
  timestamp: number;
  duration: number;
  memoryUsage: number;
}

export interface ResourceSnapshot {
  timestamp: number;
  step: string;
  resources: ResourceUsage;
}

export interface StepPerformanceMetrics {
  timestamp: number;
  memoryUsage: number;
  cpuTime: number;
  overhead: number;
}

export interface CommandHierarchyNode {
  commandId: string;
  parentId?: string;
  children: string[];
  depth: number;
}

export interface CrossSystemLink {
  system: 'mcp' | 'swarm' | 'eventbus';
  correlationId: string;
  linkType: 'parent' | 'child' | 'sibling';
}

export interface CorrelationEvent {
  timestamp: number;
  type: 'command_start' | 'command_step' | 'command_end' | 'cross_system_link';
  commandId: string;
  commandName: string;
  correlationId: string;
  data?: unknown;
}
```

### 3. Integration with Existing Systems

```typescript
/**
 * Factory for creating CLI correlation managers integrated with existing infrastructure
 */
export class CLICorrelationFactory {
  static createManager(options: {
    useExistingLogger?: boolean;
    enableMCPIntegration?: boolean;
    enableEventBusIntegration?: boolean;
    enableSwarmIntegration?: boolean;
  } = {}): CLICommandCorrelationManager {

    // Use existing ComponentLoggerFactory
    const baseLogger = options.useExistingLogger ?
      ComponentLoggerFactory.getCLILogger() :
      undefined;

    // Get MCP debug logger if available
    const mcpDebugLogger = options.enableMCPIntegration ?
      getMCPDebugLogger() :
      undefined;

    // Get EventBus if available
    const eventBus = options.enableEventBusIntegration ?
      EventBus.getInstance() :
      undefined;

    return new CLICommandCorrelationManager(
      baseLogger,
      mcpDebugLogger,
      eventBus
    );
  }

  static createWithFullIntegration(): CLICommandCorrelationManager {
    return this.createManager({
      useExistingLogger: true,
      enableMCPIntegration: true,
      enableEventBusIntegration: true,
      enableSwarmIntegration: true
    });
  }
}
```

## Implementation Strategy

### Phase 1: Core Correlation Extension

1. Extend existing `ComponentLoggerFactory.getCLILogger()`
2. Implement `CLICommandCorrelationManager` with existing correlation ID system
3. Integrate with existing `MCPDebugLogger.createCrossSystemCorrelation()`

### Phase 2: Lifecycle Integration

1. Add command lifecycle tracking using existing debug infrastructure
2. Integrate with `EventBus.getInstance()` for correlation events
3. Implement performance monitoring using existing `timeStart()`/`timeEnd()` methods

### Phase 3: Cross-System Enhancement

1. Enhance MCP correlation integration
2. Add swarm task correlation support
3. Implement correlation health monitoring

### Performance Considerations

- **Memory Management**: Use existing circular buffer patterns from `DebugLogger`
- **Performance Overhead**: Leverage existing emergency mode for <5% overhead
- **Cleanup**: Integrate with existing cleanup mechanisms in `DebugLogger`

### Backward Compatibility

- All existing correlation methods remain unchanged
- New CLI correlation extends existing `ComponentLoggerFactory` pattern
- Existing `generateCorrelationId()` and `generateSessionId()` functions used
- Integration with existing `MCPDebugLogger.CrossSystemCorrelation` maintained

This architecture provides comprehensive CLI command correlation while maintaining full compatibility with the existing 95% complete debug infrastructure.
