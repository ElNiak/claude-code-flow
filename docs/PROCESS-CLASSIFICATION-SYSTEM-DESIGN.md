# Process Classification System Design - Phase 1 Planning

**Mission**: Define comprehensive process classification taxonomy and identification methods for claude-flow system cleanup

## Executive Summary

This document defines a systematic approach to classify, identify, and manage all process types within the claude-flow ecosystem. Building on Hive Mind analysis findings of HIGH RISK detached processes in background-executor.ts, this classification system distinguishes between legitimate process patterns and problematic orphans requiring cleanup.

## 1. Process Classification Taxonomy

### 1.1 Primary Process Categories

#### **Category A: Coordination Processes (PRESERVE)**
- **MCP Servers**: Long-running coordination hubs
  - `ClaudeFlowMCPServer` instances
  - External MCP servers (serena, context7)
  - Stdio transport processes
- **Swarm Coordinators**: Multi-instance orchestration
- **Hive Mind Sessions**: Persistent intelligence processes

#### **Category B: Background Executors (CONDITIONAL PRESERVE)**
- **Intentionally Detached**: BackgroundExecutor with `unref()` call
  - Claude spawns for autonomous tasks
  - Long-running analysis processes
  - Performance monitoring daemons
- **Task Executors**: Legitimate background work
- **Hook Processors**: Coordination-aware execution

#### **Category C: Shell Execution Chain (HIGH RISK)**
- **NPM Exec Processes**: Package execution contexts
- **Shell Command Chains**: Piped command sequences
- **Terminal Adapters**: Interactive shell sessions
- **Git Operations**: Version control processes

#### **Category D: System Orphans (CLEANUP REQUIRED)**
- **Unintentional Orphans**: Broken parent-child relationships
- **Resource Leaks**: Processes consuming resources without purpose
- **Zombie Processes**: Completed but not reaped
- **Timeout Failures**: Processes that should have terminated

#### **Category E: Multi-Instance Shared (COORDINATE)**
- **Shared Resources**: Cross-instance coordination required
- **Memory Stores**: SQLite, file locks, named pipes
- **Hook Coordinators**: Cross-instance hook execution
- **Performance Monitors**: System-wide metrics collection

### 1.2 Secondary Classification Attributes

#### **Legitimacy Status**
- `LEGITIMATE_DETACHED`: Intentionally detached for valid reasons
- `LEGITIMATE_TEMPORARY`: Short-lived with expected lifecycle
- `SUSPICIOUS_ORPHAN`: Likely unintentional orphaning
- `CONFIRMED_LEAK`: Definite resource leak requiring cleanup

#### **Ownership Context**
- `SINGLE_INSTANCE`: Owned by specific claude-flow instance
- `MULTI_INSTANCE_SHARED`: Shared across instances
- `SYSTEM_GLOBAL`: System-wide processes
- `EXTERNAL_MANAGED`: Managed by external systems

#### **Lifecycle Stage**
- `INITIALIZING`: Starting up
- `ACTIVE_WORKING`: Performing intended function
- `IDLE_WAITING`: Waiting for work/events
- `TERMINATING`: Shutting down gracefully
- `HUNG_TIMEOUT`: Exceeded expected runtime
- `ORPHANED_ABANDONED`: Parent process terminated

## 2. Process Identification Methods

### 2.1 PID-Based Identification

#### **Primary Identifiers**
```typescript
interface ProcessIdentity {
  pid: number;
  ppid: number;           // Parent process ID
  pgid: number;           // Process group ID
  sid: number;            // Session ID
  startTime: number;      // Process start timestamp
  command: string;        // Command line with arguments
  cwd: string;           // Current working directory
  env: Record<string, string>; // Environment variables
}
```

#### **Claude-Flow Specific Markers**
```typescript
interface ClaudeFlowProcessMarkers {
  // Command line indicators
  isClaudeFlow: boolean;        // Contains 'claude-flow' in command
  isMCPServer: boolean;         // MCP server process
  isBackgroundExecutor: boolean; // Background executor spawn
  isHookProcessor: boolean;     // Hook execution process

  // Environment markers
  claudeFlowVersion?: string;   // CLAUDE_FLOW_VERSION env var
  instanceId?: string;          // CLAUDE_FLOW_INSTANCE_ID
  swarmId?: string;            // CLAUDE_FLOW_SWARM_ID
  sessionId?: string;          // CLAUDE_FLOW_SESSION_ID

  // Process tree relationships
  parentIsClaudeFlow: boolean;  // Parent is claude-flow process
  hasClaudeFlowAncestor: boolean; // Ancestor in process tree

  // File system indicators
  hasClaudeFlowCwd: boolean;    // CWD contains claude-flow project
  hasClaudeFlowLocks: boolean;  // Associated lock files exist
}
```

### 2.2 Command Line Pattern Analysis

#### **Pattern Recognition Rules**
```typescript
interface CommandPatterns {
  // MCP Server patterns
  mcpServer: [
    /node.*mcp-server.*\.js/,
    /npx.*claude-flow.*mcp.*start/,
    /claude-flow.*mcp.*stdio/
  ];

  // Background executor patterns
  backgroundExecutor: [
    /claude.*-p.*--dangerously-skip-permissions/,
    /node.*background-executor/,
    /spawned.*by.*BackgroundExecutor/
  ];

  // Hook processor patterns
  hookProcessor: [
    /claude-flow.*hooks.*start/,
    /hooks.*--session-id/,
    /hook.*execution.*manager/
  ];

  // Shell orphan patterns (HIGH RISK)
  shellOrphans: [
    /npm.*exec.*detached/,
    /bash.*-c.*&$/,           // Background shell commands
    /sh.*-c.*nohup/,          // Nohup processes
    /git.*--no-pager.*&/      // Background git operations
  ];

  // System processes (DO NOT TOUCH)
  systemProcesses: [
    /^\/bin\//,
    /^\/usr\/bin\//,
    /^\/sbin\//,
    /systemd/,
    /kernel/
  ];
}
```

### 2.3 Parent-Child Relationship Analysis

#### **Relationship Classification**
```typescript
interface ProcessRelationship {
  relationshipType: 'direct_child' | 'descendant' | 'orphaned' | 'adopted' | 'detached';
  legitimacy: 'intended_detach' | 'accidental_orphan' | 'normal_child' | 'unknown';

  // Detachment analysis
  wasIntentionallyDetached: boolean;  // Called unref() or detached:true
  hasDetachmentMarkers: boolean;      // Env vars indicating intentional detach
  parentTerminatedCleanly: boolean;   // Parent did clean shutdown

  // Adoption analysis
  adoptedByInit: boolean;             // PPID=1 (adopted by init)
  adoptedBySystemd: boolean;          // PPID=systemd
  adoptionTimestamp?: number;         // When adoption occurred
}
```

### 2.4 Resource and File Handle Analysis

#### **Resource Indicators**
```typescript
interface ProcessResources {
  // File descriptors
  openFiles: string[];           // Open file paths
  lockFiles: string[];           // Held lock files
  socketConnections: string[];   // Network/Unix sockets

  // Memory usage
  memoryUsage: {
    rss: number;                 // Resident set size
    heapUsed: number;           // Heap memory used
    heapTotal: number;          // Heap memory allocated
    external: number;           // External memory
  };

  // CPU usage
  cpuUsage: {
    user: number;               // User CPU time
    system: number;             // System CPU time
    percent: number;            // Current CPU percentage
  };

  // Time indicators
  runtime: number;              // How long process has been running
  idleTime: number;            // Time since last activity
  lastActivity: string;        // Type of last activity
}
```

## 3. Legitimacy Assessment Algorithms

### 3.1 Detachment Legitimacy Assessment

#### **Algorithm: Legitimate Detachment Checker**
```typescript
function assessDetachmentLegitimacy(process: ProcessIdentity): LegitimacyAssessment {
  const score = 0;
  const reasons: string[] = [];

  // POSITIVE INDICATORS (increase legitimacy score)
  if (process.command.includes('--detached')) {
    score += 30;
    reasons.push('EXPLICIT_DETACH_FLAG');
  }

  if (process.env.CLAUDE_FLOW_BACKGROUND_TASK) {
    score += 25;
    reasons.push('BACKGROUND_TASK_MARKER');
  }

  if (process.command.includes('claude') && process.command.includes('dangerously-skip-permissions')) {
    score += 20;
    reasons.push('AUTONOMOUS_CLAUDE_TASK');
  }

  if (hasBackgroundExecutorMarkers(process)) {
    score += 15;
    reasons.push('BACKGROUND_EXECUTOR_SPAWN');
  }

  // NEGATIVE INDICATORS (decrease legitimacy score)
  if (process.runtime > 3600000 && process.cpuUsage.percent < 1) {
    score -= 25;
    reasons.push('LONG_RUNNING_IDLE');
  }

  if (hasOrphanedFileHandles(process)) {
    score -= 20;
    reasons.push('ORPHANED_FILE_HANDLES');
  }

  if (process.command.includes('npm exec') && !hasNpmExecMarkers(process)) {
    score -= 30;
    reasons.push('SUSPICIOUS_NPM_EXEC');
  }

  return {
    score,
    legitimacy: score > 50 ? 'LEGITIMATE' : score > 0 ? 'SUSPICIOUS' : 'ILLEGITIMATE',
    confidence: Math.min(100, Math.abs(score)),
    reasons
  };
}
```

### 3.2 Multi-Instance Coordination Assessment

#### **Algorithm: Cross-Instance Analysis**
```typescript
function assessMultiInstanceImpact(process: ProcessIdentity): CoordinationAssessment {
  const sharedResources = analyzeSharedResources(process);
  const coordinationPatterns = detectCoordinationPatterns(process);

  return {
    requiresCoordination: sharedResources.length > 0 || coordinationPatterns.length > 0,
    sharedResourceTypes: sharedResources.map(r => r.type),
    coordinationMethods: coordinationPatterns,
    safetyLevel: calculateSafetyLevel(sharedResources, coordinationPatterns),
    recommendedAction: determineCoordinatedAction(sharedResources, coordinationPatterns)
  };
}
```

### 3.3 Context-Sensitive Classification

#### **Algorithm: Execution Context Analyzer**
```typescript
function analyzeExecutionContext(process: ProcessIdentity): ExecutionContext {
  // NPM execution context
  if (process.command.includes('npm exec') || process.command.includes('npx')) {
    return analyzeNpmContext(process);
  }

  // Direct CLI execution
  if (process.command.includes('claude-flow')) {
    return analyzeCliContext(process);
  }

  // Hook execution context
  if (hasHookExecutionMarkers(process)) {
    return analyzeHookContext(process);
  }

  // Shell chain execution
  if (hasShellChainMarkers(process)) {
    return analyzeShellChainContext(process);
  }

  return { type: 'UNKNOWN', riskLevel: 'HIGH' };
}
```

## 4. Dynamic Classification and State Transitions

### 4.1 State Transition Rules

#### **State Machine Definition**
```typescript
interface ProcessState {
  current: 'INITIALIZING' | 'ACTIVE' | 'IDLE' | 'TERMINATING' | 'ORPHANED' | 'ZOMBIE';
  legitimacy: 'LEGITIMATE' | 'SUSPICIOUS' | 'ILLEGITIMATE' | 'UNKNOWN';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastTransition: number;
  transitionHistory: StateTransition[];
}

interface StateTransition {
  from: ProcessState['current'];
  to: ProcessState['current'];
  trigger: string;
  timestamp: number;
  legitimacyChange?: boolean;
}
```

#### **Transition Triggers**
```typescript
const stateTransitionTriggers = {
  // Normal lifecycle transitions
  PARENT_TERMINATED: (state) => state.current === 'ACTIVE' ? 'ORPHANED' : state.current,
  PROCESS_TIMEOUT: (state) => state.current === 'ACTIVE' ? 'ORPHANED' : state.current,
  GRACEFUL_SHUTDOWN: (state) => 'TERMINATING',
  TASK_COMPLETED: (state) => 'TERMINATING',

  // Suspicious behavior triggers
  RESOURCE_LEAK_DETECTED: (state) => ({ ...state, riskLevel: 'HIGH' }),
  LONG_IDLE_PERIOD: (state) => ({ ...state, legitimacy: 'SUSPICIOUS' }),
  ABNORMAL_CPU_USAGE: (state) => ({ ...state, riskLevel: 'MEDIUM' }),

  // Recovery triggers
  PARENT_RECONNECTED: (state) => state.legitimacy === 'SUSPICIOUS' ? 'ACTIVE' : state.current,
  COORDINATION_RESTORED: (state) => ({ ...state, legitimacy: 'LEGITIMATE' })
};
```

### 4.2 Dynamic Reclassification Events

#### **Reclassification Triggers**
```typescript
interface ReclassificationEvent {
  trigger: 'TIME_BASED' | 'BEHAVIOR_CHANGE' | 'PARENT_CHANGE' | 'RESOURCE_CHANGE' | 'MANUAL';
  oldClassification: ProcessClassification;
  newClassification: ProcessClassification;
  confidence: number;
  evidence: string[];
}

// Time-based reclassification
const timeBasedRules = [
  {
    condition: (process) => process.runtime > 3600000 && process.activity === 'IDLE',
    action: (classification) => ({ ...classification, legitimacy: 'SUSPICIOUS' }),
    reason: 'LONG_RUNNING_IDLE'
  },

  {
    condition: (process) => process.runtime > 86400000, // 24 hours
    action: (classification) => ({ ...classification, riskLevel: 'HIGH' }),
    reason: 'EXTREMELY_LONG_RUNNING'
  }
];

// Behavior-based reclassification
const behaviorRules = [
  {
    condition: (process) => process.cpuUsage.percent > 90 && process.runtime > 300000,
    action: (classification) => ({ ...classification, riskLevel: 'HIGH' }),
    reason: 'HIGH_CPU_SUSTAINED'
  },

  {
    condition: (process) => process.memoryUsage.rss > 1073741824, // 1GB
    action: (classification) => ({ ...classification, riskLevel: 'HIGH' }),
    reason: 'HIGH_MEMORY_USAGE'
  }
];
```

## 5. Metadata Collection and Storage Schema

### 5.1 Process Metadata Schema

#### **Core Metadata Structure**
```typescript
interface ProcessMetadata {
  // Identity
  identity: ProcessIdentity;
  classification: ProcessClassification;

  // Discovery metadata
  discovery: {
    discoveredAt: number;
    discoveryMethod: string;
    discoveredBy: string;        // Instance ID that discovered process
    lastSeen: number;
    seenCount: number;
  };

  // Classification metadata
  classificationHistory: ClassificationEvent[];
  assessmentResults: {
    legitimacy: LegitimacyAssessment;
    coordination: CoordinationAssessment;
    context: ExecutionContext;
    lastAssessed: number;
  };

  // Monitoring metadata
  monitoring: {
    resourceSnapshots: ResourceSnapshot[];
    performanceMetrics: PerformanceMetric[];
    alerts: Alert[];
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  };

  // Coordination metadata
  coordination: {
    instanceOwnership: string[];     // Instance IDs that claim ownership
    sharedResources: SharedResource[];
    coordinationState: CoordinationState;
    conflictHistory: ConflictEvent[];
  };

  // Action metadata
  actions: {
    plannedActions: PlannedAction[];
    executedActions: ExecutedAction[];
    blockedActions: BlockedAction[];
    lastActionTime: number;
  };
}
```

### 5.2 Storage and Indexing Strategy

#### **Storage Structure**
```typescript
interface ProcessMetadataStore {
  // Primary indices
  byPid: Map<number, ProcessMetadata>;
  byInstanceId: Map<string, Set<number>>;
  byClassification: Map<string, Set<number>>;
  byLegitimacy: Map<string, Set<number>>;

  // Secondary indices for efficient queries
  byParentPid: Map<number, Set<number>>;
  byCommandPattern: Map<string, Set<number>>;
  byRiskLevel: Map<string, Set<number>>;
  byLastSeen: SortedMap<number, Set<number>>;

  // Time-based cleanup indices
  staleProcesses: SortedMap<number, number>;    // lastSeen -> pid
  zombieProcesses: Set<number>;

  // Cross-instance coordination
  globalLocks: Map<number, InstanceLock>;
  coordinationState: Map<string, CoordinationRecord>;
}
```

#### **Indexing Rules**
```typescript
const indexingRules = {
  // Auto-cleanup stale entries
  staleThreshold: 300000,        // 5 minutes without updates
  zombieThreshold: 3600000,      // 1 hour in zombie state

  // Index rebuilding triggers
  rebuildThresholds: {
    totalEntries: 10000,         // Rebuild when entries exceed limit
    stalePercentage: 30,         // Rebuild when 30% entries are stale
    fragmentationRatio: 0.7      // Rebuild when fragmentation high
  },

  // Query optimization
  enableSecondaryIndices: true,
  cacheHotQueries: true,
  maxCacheSize: 1000,
  cacheExpiryTime: 60000         // 1 minute cache expiry
};
```

## 6. Implementation Priority Matrix

### 6.1 Critical Path Implementation Order

#### **Phase 1: Foundation (Week 1)**
1. **Core Classification Types** - Define TypeScript interfaces
2. **PID Discovery Engine** - Process enumeration and basic metadata
3. **Command Pattern Analyzer** - Pattern matching for process identification
4. **Basic Legitimacy Assessment** - Simple scoring algorithm

#### **Phase 2: Risk Mitigation (Week 2)**
5. **Shell Orphan Detector** - HIGH RISK process identification
6. **Background Executor Classifier** - Distinguish legitimate vs orphaned
7. **Multi-Instance Coordination** - Cross-instance process visibility
8. **Emergency Cleanup Protocols** - Safe termination procedures

#### **Phase 3: Intelligence (Week 3)**
9. **Dynamic State Tracking** - Process lifecycle monitoring
10. **Behavioral Analysis** - Resource usage pattern detection
11. **Context-Sensitive Classification** - Execution environment analysis
12. **Conflict Resolution** - Multi-instance coordination protocols

#### **Phase 4: Optimization (Week 4)**
13. **Performance Monitoring** - Real-time metrics and alerting
14. **Predictive Analysis** - Identify potential problems before they occur
15. **Self-Healing Mechanisms** - Automated recovery procedures
16. **Advanced Reporting** - Comprehensive process health dashboards

### 6.2 Risk-Based Priority Assessment

#### **CRITICAL (Immediate Implementation)**
- Shell orphan detection and cleanup
- Background executor legitimacy assessment
- Multi-instance process coordination
- Basic PID tracking and metadata storage

#### **HIGH (Week 1-2)**
- Command pattern recognition
- Parent-child relationship analysis
- Resource leak detection
- Time-based state transitions

#### **MEDIUM (Week 3-4)**
- Advanced behavioral analysis
- Predictive failure detection
- Cross-session process persistence
- Performance optimization

#### **LOW (Future Enhancement)**
- Machine learning classification
- Advanced visualization
- Integration with external monitoring
- Historical trend analysis

## 7. Success Metrics and Validation

### 7.1 Classification Accuracy Metrics

#### **Accuracy Measurements**
```typescript
interface ClassificationMetrics {
  // Overall accuracy
  totalProcessesClassified: number;
  correctClassifications: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;              // (correct / total) * 100

  // Per-category accuracy
  categoryAccuracy: Map<string, {
    precision: number;           // true positives / (true positives + false positives)
    recall: number;              // true positives / (true positives + false negatives)
    f1Score: number;             // 2 * (precision * recall) / (precision + recall)
  }>;

  // Performance metrics
  classificationLatency: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };

  // Reliability metrics
  reclassificationRate: number;   // How often classifications change
  stabilityScore: number;         // How stable classifications remain over time
}
```

### 7.2 System Impact Metrics

#### **Impact Measurements**
```typescript
interface SystemImpactMetrics {
  // Cleanup effectiveness
  processesCleanedUp: number;
  resourcesReclaimed: {
    memory: number;              // Bytes reclaimed
    fileHandles: number;         // File descriptors freed
    networkSockets: number;      // Sockets closed
  };

  // System health improvement
  cpuUsageReduction: number;      // Percentage reduction in CPU usage
  memoryUsageReduction: number;   // Percentage reduction in memory usage
  processCountReduction: number;  // Reduction in total process count

  // Error reduction
  orphanProcessEvents: number;    // Orphan process creation events
  resourceLeakEvents: number;     // Resource leak detection events
  systemStabilityScore: number;   // Overall system stability improvement

  // Performance impact
  classificationOverhead: number; // CPU/memory overhead of classification
  monitoringLatency: number;      // Time to detect problems
  responseTime: number;           // Time to take corrective action
}
```

## 8. Conclusion and Next Steps

This comprehensive process classification system provides the foundation for intelligent process management in the claude-flow ecosystem. The design prioritizes:

1. **Safety First**: Rigorous legitimacy assessment prevents accidental termination of valid processes
2. **Risk Mitigation**: Focuses on HIGH RISK shell orphans and background executor processes
3. **Multi-Instance Awareness**: Handles coordination across multiple claude-flow instances
4. **Adaptive Intelligence**: Dynamic classification that improves over time
5. **Performance**: Efficient algorithms suitable for real-time monitoring

**Immediate Next Steps:**
1. Implement core TypeScript interfaces and types
2. Build PID discovery and basic metadata collection
3. Create shell orphan detection with HIGH priority
4. Establish multi-instance coordination protocols
5. Develop emergency cleanup procedures for critical situations

**Success Criteria:**
- 95%+ accuracy in process classification
- Zero false positives on legitimate processes
- 90%+ reduction in shell orphan processes
- <100ms average classification latency
- Full multi-instance coordination support

This system will transform claude-flow from reactive process cleanup to proactive process intelligence and management.
