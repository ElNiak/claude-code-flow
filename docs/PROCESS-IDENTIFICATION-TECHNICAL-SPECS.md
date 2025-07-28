# Process Identification Technical Specifications

**Technical Implementation Guide for Process Classification System**

## Overview

This document provides detailed technical specifications for implementing the process identification methods defined in the Process Classification System Design. These specifications focus on the algorithms, data structures, and validation procedures required for accurate process classification.

## 1. Process Discovery Engine Specifications

### 1.1 Cross-Platform Process Enumeration

#### **Linux/macOS Implementation**
```typescript
interface ProcessEnumerator {
  /**
   * Get all processes with detailed metadata
   */
  async enumerateProcesses(): Promise<ProcessSnapshot[]>;

  /**
   * Get specific process by PID with full details
   */
  async getProcessDetails(pid: number): Promise<ProcessDetails | null>;

  /**
   * Monitor process tree changes in real-time
   */
  startProcessMonitoring(callback: ProcessChangeCallback): void;
}

class UnixProcessEnumerator implements ProcessEnumerator {
  async enumerateProcesses(): Promise<ProcessSnapshot[]> {
    // Use /proc filesystem on Linux, ps command on macOS
    const processes: ProcessSnapshot[] = [];

    if (process.platform === 'linux') {
      // Read /proc/*/stat, /proc/*/cmdline, /proc/*/environ
      const procDirs = await fs.readdir('/proc');
      for (const dir of procDirs) {
        if (/^\d+$/.test(dir)) {
          const processInfo = await this.readLinuxProcInfo(parseInt(dir));
          if (processInfo) processes.push(processInfo);
        }
      }
    } else if (process.platform === 'darwin') {
      // Use ps command with comprehensive flags
      const psOutput = await execAsync('ps -eo pid,ppid,pgid,sid,command,etime,pcpu,pmem,rss,vsz');
      processes.push(...this.parsePsOutput(psOutput));
    }

    return processes;
  }

  private async readLinuxProcInfo(pid: number): Promise<ProcessSnapshot | null> {
    try {
      // Read process statistics
      const statData = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
      const cmdlineData = await fs.readFile(`/proc/${pid}/cmdline`, 'utf8');
      const environData = await fs.readFile(`/proc/${pid}/environ`, 'utf8');
      const statusData = await fs.readFile(`/proc/${pid}/status`, 'utf8');

      // Parse process information
      const stat = this.parseStatFile(statData);
      const cmdline = this.parseCmdlineFile(cmdlineData);
      const environ = this.parseEnvironFile(environData);
      const status = this.parseStatusFile(statusData);

      return {
        pid,
        ppid: stat.ppid,
        pgid: stat.pgid,
        sid: stat.sid,
        command: cmdline.join(' '),
        args: cmdline,
        env: environ,
        startTime: stat.startTime,
        cpuTime: stat.cpuTime,
        memoryUsage: {
          rss: status.vmRSS,
          vsz: status.vmSize,
          shared: status.vmShared
        },
        state: stat.state,
        threads: status.threads
      };
    } catch (error) {
      // Process may have disappeared, return null
      return null;
    }
  }
}
```

### 1.2 Process Metadata Enrichment

#### **Metadata Collection Pipeline**
```typescript
interface MetadataEnricher {
  /**
   * Enrich basic process info with claude-flow specific metadata
   */
  enrichProcessMetadata(snapshot: ProcessSnapshot): Promise<EnrichedProcessMetadata>;
}

class ClaudeFlowMetadataEnricher implements MetadataEnricher {
  async enrichProcessMetadata(snapshot: ProcessSnapshot): Promise<EnrichedProcessMetadata> {
    const enriched: EnrichedProcessMetadata = {
      ...snapshot,
      claudeFlowMarkers: await this.detectClaudeFlowMarkers(snapshot),
      executionContext: await this.analyzeExecutionContext(snapshot),
      resourceUsage: await this.collectResourceUsage(snapshot.pid),
      parentChain: await this.buildParentChain(snapshot),
      fileDescriptors: await this.enumerateFileDescriptors(snapshot.pid),
      networkConnections: await this.getNetworkConnections(snapshot.pid),
      memoryMaps: await this.getMemoryMaps(snapshot.pid)
    };

    return enriched;
  }

  private async detectClaudeFlowMarkers(snapshot: ProcessSnapshot): Promise<ClaudeFlowMarkers> {
    const markers: ClaudeFlowMarkers = {
      isClaudeFlow: false,
      isMCPServer: false,
      isBackgroundExecutor: false,
      isHookProcessor: false,
      instanceId: null,
      swarmId: null,
      sessionId: null
    };

    // Check command line for claude-flow indicators
    const command = snapshot.command.toLowerCase();
    markers.isClaudeFlow = command.includes('claude-flow') ||
                          command.includes('npx claude-flow') ||
                          snapshot.args[0]?.includes('claude-flow');

    // Check for MCP server patterns
    markers.isMCPServer = command.includes('mcp-server') ||
                         command.includes('mcp start') ||
                         this.matchesPattern(command, /mcp.*stdio/);

    // Check for background executor patterns
    markers.isBackgroundExecutor = command.includes('background-executor') ||
                                  snapshot.env.CLAUDE_FLOW_BACKGROUND_TASK === 'true' ||
                                  command.includes('dangerously-skip-permissions');

    // Check for hook processor patterns
    markers.isHookProcessor = command.includes('hooks start') ||
                             command.includes('hook-execution') ||
                             snapshot.env.CLAUDE_FLOW_HOOK_EXECUTION === 'true';

    // Extract instance/swarm/session IDs from environment
    markers.instanceId = snapshot.env.CLAUDE_FLOW_INSTANCE_ID || null;
    markers.swarmId = snapshot.env.CLAUDE_FLOW_SWARM_ID || null;
    markers.sessionId = snapshot.env.CLAUDE_FLOW_SESSION_ID || null;

    return markers;
  }
}
```

## 2. Command Pattern Recognition Engine

### 2.1 Advanced Pattern Matching

#### **Multi-Level Pattern Analyzer**
```typescript
interface PatternAnalyzer {
  /**
   * Analyze command patterns and classify process type
   */
  analyzeCommandPatterns(command: string, args: string[]): PatternAnalysisResult;
}

class ClaudeFlowPatternAnalyzer implements PatternAnalyzer {
  private patterns: PatternDefinition[] = [
    // MCP Server patterns (PRESERVE)
    {
      category: 'MCP_SERVER',
      priority: 'HIGH',
      patterns: [
        /node.*src\/mcp\/mcp-server.*\.js/,
        /npx.*claude-flow.*mcp.*start/,
        /claude-flow.*mcp.*stdio/,
        /mcp-server.*--stdio/
      ],
      envMarkers: ['MCP_SERVER=true', 'CLAUDE_FLOW_MCP=true'],
      legitimacy: 'ALWAYS_LEGITIMATE'
    },

    // Background Executor patterns (CONDITIONAL)
    {
      category: 'BACKGROUND_EXECUTOR',
      priority: 'HIGH',
      patterns: [
        /claude.*-p.*--dangerously-skip-permissions/,
        /spawned.*by.*BackgroundExecutor/,
        /background-executor.*spawn/
      ],
      envMarkers: ['CLAUDE_FLOW_BACKGROUND_TASK=true'],
      legitimacy: 'CONTEXT_DEPENDENT',
      contextChecks: ['checkDetachmentIntent', 'validateParentRelationship']
    },

    // Shell orphan patterns (HIGH RISK)
    {
      category: 'SHELL_ORPHAN',
      priority: 'CRITICAL',
      patterns: [
        /npm.*exec.*&$/,
        /bash.*-c.*&$/,
        /sh.*-c.*nohup/,
        /.*\|\s*&$/,  // Command ending with pipe to background
        /.*;\s*&$/    // Command ending with semicolon and background
      ],
      envMarkers: [],
      legitimacy: 'USUALLY_ILLEGITIMATE',
      riskLevel: 'HIGH'
    },

    // Hook processor patterns (PRESERVE)
    {
      category: 'HOOK_PROCESSOR',
      priority: 'MEDIUM',
      patterns: [
        /claude-flow.*hooks.*start/,
        /hooks.*--session-id/,
        /hook.*execution.*manager/
      ],
      envMarkers: ['CLAUDE_FLOW_HOOK_EXECUTION=true'],
      legitimacy: 'USUALLY_LEGITIMATE'
    }
  ];

  analyzeCommandPatterns(command: string, args: string[]): PatternAnalysisResult {
    const results: PatternMatch[] = [];
    const fullCommand = [command, ...args].join(' ');

    for (const patternDef of this.patterns) {
      for (const pattern of patternDef.patterns) {
        if (pattern.test(fullCommand)) {
          results.push({
            category: patternDef.category,
            pattern: pattern.source,
            confidence: this.calculatePatternConfidence(pattern, fullCommand),
            priority: patternDef.priority,
            legitimacy: patternDef.legitimacy,
            riskLevel: patternDef.riskLevel || 'MEDIUM'
          });
        }
      }
    }

    // Sort by priority and confidence
    results.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence;
    });

    return {
      matches: results,
      primaryCategory: results[0]?.category || 'UNKNOWN',
      overallConfidence: results.length > 0 ? results[0].confidence : 0,
      riskAssessment: this.assessOverallRisk(results)
    };
  }

  private calculatePatternConfidence(pattern: RegExp, command: string): number {
    const match = pattern.exec(command);
    if (!match) return 0;

    // Base confidence from pattern specificity
    let confidence = 70;

    // Increase confidence for more specific matches
    if (match[0].length / command.length > 0.5) confidence += 20;
    if (pattern.source.includes('claude-flow')) confidence += 10;
    if (pattern.source.includes('\\')) confidence += 5; // Escaped characters = more specific

    return Math.min(100, confidence);
  }
}
```

### 2.2 Context-Sensitive Pattern Recognition

#### **Execution Context Analyzer**
```typescript
interface ExecutionContextAnalyzer {
  analyzeContext(process: EnrichedProcessMetadata): ExecutionContextResult;
}

class ClaudeFlowContextAnalyzer implements ExecutionContextAnalyzer {
  analyzeContext(process: EnrichedProcessMetadata): ExecutionContextResult {
    const contexts: ExecutionContext[] = [];

    // NPM execution context analysis
    if (this.isNpmExecution(process)) {
      contexts.push(this.analyzeNpmContext(process));
    }

    // Direct CLI execution
    if (this.isDirectCliExecution(process)) {
      contexts.push(this.analyzeCliContext(process));
    }

    // Hook execution context
    if (this.isHookExecution(process)) {
      contexts.push(this.analyzeHookContext(process));
    }

    // Shell chain execution
    if (this.isShellChainExecution(process)) {
      contexts.push(this.analyzeShellChainContext(process));
    }

    return {
      contexts,
      primaryContext: this.selectPrimaryContext(contexts),
      riskAssessment: this.assessContextualRisk(contexts),
      recommendedAction: this.determineContextualAction(contexts)
    };
  }

  private analyzeNpmContext(process: EnrichedProcessMetadata): ExecutionContext {
    const npmContext: NpmExecutionContext = {
      type: 'NPM_EXECUTION',
      packageName: this.extractPackageName(process.command),
      isGlobalExecution: process.command.includes('npx'),
      isLocalExecution: process.command.includes('npm exec'),
      workingDirectory: process.cwd,
      packageVersion: this.extractPackageVersion(process),
      riskFactors: []
    };

    // Analyze risk factors for NPM execution
    if (process.command.includes('&') || process.command.includes('nohup')) {
      npmContext.riskFactors.push('BACKGROUND_EXECUTION');
    }

    if (!process.parentChain.some(p => p.command.includes('npm'))) {
      npmContext.riskFactors.push('ORPHANED_FROM_NPM');
    }

    if (process.resourceUsage.cpuTime === 0 && process.age > 300000) {
      npmContext.riskFactors.push('LONG_IDLE_NPM_PROCESS');
    }

    return {
      ...npmContext,
      confidence: this.calculateNpmContextConfidence(npmContext),
      legitimacy: this.assessNpmLegitimacy(npmContext)
    };
  }

  private analyzeShellChainContext(process: EnrichedProcessMetadata): ExecutionContext {
    const shellContext: ShellChainContext = {
      type: 'SHELL_CHAIN',
      chainLength: this.calculateChainLength(process),
      hasRedirection: this.hasRedirection(process.command),
      hasPipes: this.hasPipes(process.command),
      hasBackgroundOperators: this.hasBackgroundOperators(process.command),
      parentShells: this.identifyParentShells(process.parentChain),
      riskFactors: []
    };

    // High-risk shell chain patterns
    if (shellContext.hasBackgroundOperators) {
      shellContext.riskFactors.push('BACKGROUND_SHELL_OPERATORS');
    }

    if (shellContext.chainLength > 3) {
      shellContext.riskFactors.push('DEEP_SHELL_NESTING');
    }

    if (this.hasOrphanedPipes(process)) {
      shellContext.riskFactors.push('ORPHANED_PIPE_CHAIN');
    }

    return {
      ...shellContext,
      confidence: this.calculateShellContextConfidence(shellContext),
      legitimacy: this.assessShellChainLegitimacy(shellContext)
    };
  }
}
```

## 3. Parent-Child Relationship Analysis

### 3.1 Process Tree Reconstruction

#### **Process Tree Builder**
```typescript
interface ProcessTreeBuilder {
  buildProcessTree(processes: ProcessSnapshot[]): ProcessTree;
  findOrphanedProcesses(tree: ProcessTree): OrphanedProcess[];
  traceProcessLineage(pid: number, tree: ProcessTree): ProcessLineage;
}

class ClaudeFlowProcessTreeBuilder implements ProcessTreeBuilder {
  buildProcessTree(processes: ProcessSnapshot[]): ProcessTree {
    const nodeMap = new Map<number, ProcessTreeNode>();
    const rootNodes: ProcessTreeNode[] = [];

    // Create nodes for all processes
    for (const process of processes) {
      const node: ProcessTreeNode = {
        process,
        children: [],
        parent: null,
        depth: 0,
        orphanedAt: null,
        detachmentMarkers: this.analyzeDetachmentMarkers(process)
      };
      nodeMap.set(process.pid, node);
    }

    // Build parent-child relationships
    for (const node of nodeMap.values()) {
      const parentNode = nodeMap.get(node.process.ppid);
      if (parentNode) {
        node.parent = parentNode;
        node.depth = parentNode.depth + 1;
        parentNode.children.push(node);
      } else {
        // No parent found - either root process or orphaned
        if (node.process.ppid === 0 || node.process.ppid === 1) {
          rootNodes.push(node);
        } else {
          // Orphaned process
          node.orphanedAt = this.estimateOrphanTime(node.process);
          rootNodes.push(node);
        }
      }
    }

    return {
      nodes: nodeMap,
      roots: rootNodes,
      orphanedProcesses: this.identifyOrphanedProcesses(nodeMap),
      detachedProcesses: this.identifyDetachedProcesses(nodeMap)
    };
  }

  private analyzeDetachmentMarkers(process: ProcessSnapshot): DetachmentMarkers {
    return {
      hasDetachedFlag: process.command.includes('--detached'),
      hasUnrefCall: this.hasUnrefMarkers(process),
      hasBackgroundMarkers: process.env.CLAUDE_FLOW_BACKGROUND_TASK === 'true',
      intentionalDetachment: this.assessIntentionalDetachment(process),
      detachmentTimestamp: this.estimateDetachmentTime(process)
    };
  }

  private hasUnrefMarkers(process: ProcessSnapshot): boolean {
    // Look for evidence of unref() call in parent process
    // This is indirect detection through environment variables or process state
    return process.env.CHILD_PROCESS_UNREF === 'true' ||
           process.env.DETACHED_SPAWN === 'true' ||
           this.detectUnrefPatterns(process);
  }

  findOrphanedProcesses(tree: ProcessTree): OrphanedProcess[] {
    const orphans: OrphanedProcess[] = [];

    for (const [pid, node] of tree.nodes) {
      if (this.isOrphaned(node)) {
        const orphan: OrphanedProcess = {
          pid,
          process: node.process,
          orphanedAt: node.orphanedAt || this.estimateOrphanTime(node.process),
          originalParent: this.findOriginalParent(node),
          orphanCause: this.determineOrphanCause(node),
          riskLevel: this.assessOrphanRisk(node),
          recommendedAction: this.determineOrphanAction(node)
        };
        orphans.push(orphan);
      }
    }

    return orphans.sort((a, b) => {
      // Sort by risk level, then by time orphaned
      const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      return riskDiff !== 0 ? riskDiff : a.orphanedAt - b.orphanedAt;
    });
  }
}
```

### 3.2 Orphan Detection Algorithms

#### **Advanced Orphan Classification**
```typescript
interface OrphanClassifier {
  classifyOrphan(orphan: OrphanedProcess, tree: ProcessTree): OrphanClassification;
}

class ClaudeFlowOrphanClassifier implements OrphanClassifier {
  classifyOrphan(orphan: OrphanedProcess, tree: ProcessTree): OrphanClassification {
    const classification: OrphanClassification = {
      category: this.determineOrphanCategory(orphan),
      legitimacy: this.assessOrphanLegitimacy(orphan),
      urgency: this.calculateOrphanUrgency(orphan),
      safetyLevel: this.assessTerminationSafety(orphan),
      contextualFactors: this.analyzeContextualFactors(orphan, tree)
    };

    return classification;
  }

  private determineOrphanCategory(orphan: OrphanedProcess): OrphanCategory {
    // Background executor orphans - may be legitimate
    if (orphan.process.claudeFlowMarkers?.isBackgroundExecutor) {
      return orphan.process.env.CLAUDE_FLOW_BACKGROUND_TASK === 'true'
        ? 'LEGITIMATE_BACKGROUND_TASK'
        : 'SUSPICIOUS_BACKGROUND_TASK';
    }

    // Shell command orphans - usually problematic
    if (this.isShellCommandOrphan(orphan)) {
      return orphan.orphanCause === 'SHELL_CHAIN_BREAK'
        ? 'SHELL_CHAIN_ORPHAN'
        : 'GENERAL_SHELL_ORPHAN';
    }

    // NPM execution orphans
    if (this.isNpmOrphan(orphan)) {
      return 'NPM_EXECUTION_ORPHAN';
    }

    // Hook processor orphans - check if legitimate
    if (orphan.process.claudeFlowMarkers?.isHookProcessor) {
      return 'HOOK_PROCESSOR_ORPHAN';
    }

    // MCP server orphans - usually legitimate
    if (orphan.process.claudeFlowMarkers?.isMCPServer) {
      return 'MCP_SERVER_ORPHAN';
    }

    return 'UNKNOWN_ORPHAN';
  }

  private assessOrphanLegitimacy(orphan: OrphanedProcess): OrphanLegitimacy {
    let legitimacyScore = 50; // Start neutral
    const factors: string[] = [];

    // Positive legitimacy indicators
    if (orphan.process.env.CLAUDE_FLOW_BACKGROUND_TASK === 'true') {
      legitimacyScore += 30;
      factors.push('EXPLICIT_BACKGROUND_TASK');
    }

    if (orphan.process.command.includes('--detached')) {
      legitimacyScore += 25;
      factors.push('EXPLICIT_DETACHED_FLAG');
    }

    if (orphan.process.claudeFlowMarkers?.isMCPServer) {
      legitimacyScore += 35;
      factors.push('MCP_SERVER_PROCESS');
    }

    // Negative legitimacy indicators
    if (this.hasShellBackgroundOperators(orphan.process.command)) {
      legitimacyScore -= 40;
      factors.push('SHELL_BACKGROUND_OPERATORS');
    }

    if (orphan.process.resourceUsage.cpuTime === 0 && orphan.ageInSeconds > 3600) {
      legitimacyScore -= 25;
      factors.push('LONG_RUNNING_IDLE');
    }

    if (orphan.orphanCause === 'PARENT_CRASH') {
      legitimacyScore -= 30;
      factors.push('PARENT_PROCESS_CRASHED');
    }

    return {
      score: Math.max(0, Math.min(100, legitimacyScore)),
      legitimacy: legitimacyScore > 70 ? 'LEGITIMATE' :
                 legitimacyScore > 30 ? 'SUSPICIOUS' : 'ILLEGITIMATE',
      confidence: this.calculateLegitimacyConfidence(factors.length),
      factors
    };
  }

  private calculateOrphanUrgency(orphan: OrphanedProcess): OrphanUrgency {
    let urgencyScore = 0;
    const factors: string[] = [];

    // Time-based urgency
    const ageHours = orphan.ageInSeconds / 3600;
    if (ageHours > 24) {
      urgencyScore += 40;
      factors.push('ORPHANED_OVER_24_HOURS');
    } else if (ageHours > 1) {
      urgencyScore += 20;
      factors.push('ORPHANED_OVER_1_HOUR');
    }

    // Resource-based urgency
    if (orphan.process.resourceUsage.memoryUsage.rss > 100 * 1024 * 1024) { // 100MB
      urgencyScore += 30;
      factors.push('HIGH_MEMORY_USAGE');
    }

    if (orphan.process.resourceUsage.cpuUsage.percent > 50) {
      urgencyScore += 25;
      factors.push('HIGH_CPU_USAGE');
    }

    // Risk-based urgency
    if (orphan.riskLevel === 'CRITICAL') {
      urgencyScore += 50;
      factors.push('CRITICAL_RISK_LEVEL');
    } else if (orphan.riskLevel === 'HIGH') {
      urgencyScore += 30;
      factors.push('HIGH_RISK_LEVEL');
    }

    return {
      score: Math.min(100, urgencyScore),
      urgency: urgencyScore > 80 ? 'CRITICAL' :
               urgencyScore > 60 ? 'HIGH' :
               urgencyScore > 30 ? 'MEDIUM' : 'LOW',
      factors
    };
  }
}
```

## 4. Validation and Testing Framework

### 4.1 Classification Accuracy Testing

#### **Test Harness for Process Classification**
```typescript
interface ClassificationTestHarness {
  runAccuracyTests(): Promise<ClassificationTestResults>;
  generateTestProcesses(): Promise<TestProcess[]>;
  validateClassification(expected: ProcessClassification, actual: ProcessClassification): TestResult;
}

class ClaudeFlowClassificationTestHarness implements ClassificationTestHarness {
  async runAccuracyTests(): Promise<ClassificationTestResults> {
    const testCases = await this.generateTestProcesses();
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      const startTime = performance.now();
      const classification = await this.classifyTestProcess(testCase);
      const endTime = performance.now();

      const result = this.validateClassification(testCase.expectedClassification, classification);
      result.latency = endTime - startTime;
      results.push(result);
    }

    return this.analyzeTestResults(results);
  }

  async generateTestProcesses(): Promise<TestProcess[]> {
    return [
      // Legitimate background executor
      {
        id: 'bg-executor-legitimate',
        process: {
          pid: 1001,
          ppid: 1000,
          command: 'claude -p "test prompt" --dangerously-skip-permissions',
          env: { CLAUDE_FLOW_BACKGROUND_TASK: 'true' },
          detached: true
        },
        expectedClassification: {
          category: 'BACKGROUND_EXECUTOR',
          legitimacy: 'LEGITIMATE',
          riskLevel: 'LOW'
        }
      },

      // Shell orphan - high risk
      {
        id: 'shell-orphan-high-risk',
        process: {
          pid: 1002,
          ppid: 1, // Adopted by init - orphaned
          command: 'npm exec claude-flow &',
          env: {},
          detached: false
        },
        expectedClassification: {
          category: 'SHELL_ORPHAN',
          legitimacy: 'ILLEGITIMATE',
          riskLevel: 'HIGH'
        }
      },

      // MCP server - legitimate
      {
        id: 'mcp-server-legitimate',
        process: {
          pid: 1003,
          ppid: 1000,
          command: 'node src/mcp/mcp-server.js --stdio',
          env: { MCP_SERVER: 'true' },
          detached: false
        },
        expectedClassification: {
          category: 'MCP_SERVER',
          legitimacy: 'LEGITIMATE',
          riskLevel: 'LOW'
        }
      },

      // Hook processor - legitimate
      {
        id: 'hook-processor-legitimate',
        process: {
          pid: 1004,
          ppid: 1000,
          command: 'claude-flow hooks start --session-id session-123',
          env: { CLAUDE_FLOW_HOOK_EXECUTION: 'true' },
          detached: false
        },
        expectedClassification: {
          category: 'HOOK_PROCESSOR',
          legitimacy: 'LEGITIMATE',
          riskLevel: 'LOW'
        }
      }
    ];
  }

  validateClassification(expected: ProcessClassification, actual: ProcessClassification): TestResult {
    const categoryMatch = expected.category === actual.category;
    const legitimacyMatch = expected.legitimacy === actual.legitimacy;
    const riskLevelMatch = expected.riskLevel === actual.riskLevel;

    const accuracy = (
      (categoryMatch ? 1 : 0) +
      (legitimacyMatch ? 1 : 0) +
      (riskLevelMatch ? 1 : 0)
    ) / 3;

    return {
      passed: accuracy >= 0.67, // At least 2/3 correct
      accuracy,
      categoryMatch,
      legitimacyMatch,
      riskLevelMatch,
      expected,
      actual,
      confidence: actual.confidence || 0
    };
  }
}
```

### 4.2 Performance Benchmarking

#### **Performance Testing Suite**
```typescript
interface PerformanceBenchmark {
  benchmarkClassificationSpeed(processCount: number): Promise<PerformanceResults>;
  benchmarkMemoryUsage(processCount: number): Promise<MemoryResults>;
  benchmarkRealTimeMonitoring(duration: number): Promise<MonitoringResults>;
}

class ClaudeFlowPerformanceBenchmark implements PerformanceBenchmark {
  async benchmarkClassificationSpeed(processCount: number): Promise<PerformanceResults> {
    const testProcesses = await this.generateBenchmarkProcesses(processCount);
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const classifications = await Promise.all(
      testProcesses.map(p => this.classifyProcess(p))
    );

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    return {
      totalTime: endTime - startTime,
      averageTimePerProcess: (endTime - startTime) / processCount,
      processesPerSecond: processCount / ((endTime - startTime) / 1000),
      memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
      memoryPerProcess: (endMemory.heapUsed - startMemory.heapUsed) / processCount,
      successfulClassifications: classifications.filter(c => c.confidence > 50).length,
      failedClassifications: classifications.filter(c => c.confidence <= 50).length
    };
  }

  async benchmarkRealTimeMonitoring(duration: number): Promise<MonitoringResults> {
    const startTime = Date.now();
    const metrics: MonitoringMetric[] = [];

    const monitoringInterval = setInterval(async () => {
      const currentTime = Date.now();
      const processes = await this.discoverProcesses();
      const classificationStart = performance.now();

      const classifications = await Promise.all(
        processes.map(p => this.classifyProcess(p))
      );

      const classificationEnd = performance.now();

      metrics.push({
        timestamp: currentTime,
        processCount: processes.length,
        classificationTime: classificationEnd - classificationStart,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage()
      });

      if (currentTime - startTime >= duration) {
        clearInterval(monitoringInterval);
      }
    }, 1000); // Monitor every second

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          duration,
          totalMetrics: metrics.length,
          averageProcessCount: metrics.reduce((sum, m) => sum + m.processCount, 0) / metrics.length,
          averageClassificationTime: metrics.reduce((sum, m) => sum + m.classificationTime, 0) / metrics.length,
          peakMemoryUsage: Math.max(...metrics.map(m => m.memoryUsage)),
          averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
          performanceStability: this.calculateStabilityScore(metrics)
        });
      }, duration);
    });
  }
}
```

## 5. Error Handling and Edge Cases

### 5.1 Process State Race Conditions

#### **Race Condition Handling**
```typescript
interface ProcessStateManager {
  handleProcessStateRace(pid: number, expectedState: ProcessState): Promise<ProcessState>;
  validateProcessExistence(pid: number): Promise<boolean>;
  handleZombieProcess(pid: number): Promise<ZombieHandlingResult>;
}

class RaceConditionSafeStateManager implements ProcessStateManager {
  async handleProcessStateRace(pid: number, expectedState: ProcessState): Promise<ProcessState> {
    const maxRetries = 3;
    const retryDelay = 100; // ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const currentState = await this.getProcessState(pid);

        if (currentState === null) {
          // Process disappeared
          return {
            pid,
            state: 'DISAPPEARED',
            timestamp: Date.now(),
            reliable: false
          };
        }

        if (currentState.state === expectedState.state) {
          return { ...currentState, reliable: true };
        }

        // State mismatch - wait and retry
        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt);
          continue;
        }

        // Final attempt - return current state with warning
        return {
          ...currentState,
          reliable: false,
          warning: `State mismatch: expected ${expectedState.state}, got ${currentState.state}`
        };

      } catch (error) {
        if (attempt === maxRetries) {
          throw new ProcessStateError(`Failed to get stable process state for PID ${pid}`, error);
        }
        await this.delay(retryDelay * attempt);
      }
    }
  }

  async validateProcessExistence(pid: number): Promise<boolean> {
    try {
      // Use kill(pid, 0) to check if process exists without actually sending signal
      process.kill(pid, 0);
      return true;
    } catch (error) {
      if (error.code === 'ESRCH') {
        return false; // No such process
      }
      if (error.code === 'EPERM') {
        return true; // Process exists but we don't have permission to signal it
      }
      throw error; // Some other error
    }
  }

  async handleZombieProcess(pid: number): Promise<ZombieHandlingResult> {
    const processInfo = await this.getProcessInfo(pid);

    if (!processInfo) {
      return { action: 'ALREADY_REAPED', success: true };
    }

    if (processInfo.state !== 'Z') {
      return { action: 'NOT_ZOMBIE', success: true, actualState: processInfo.state };
    }

    // Try to identify the parent process to help with reaping
    const parentPid = processInfo.ppid;
    const parentExists = await this.validateProcessExistence(parentPid);

    if (!parentExists) {
      // Parent is gone, zombie should be reaped by init
      return {
        action: 'WAITING_FOR_INIT_REAP',
        success: true,
        note: 'Parent process gone, init should reap zombie'
      };
    }

    // Parent exists but hasn't reaped child - this could indicate a bug
    return {
      action: 'PARENT_CLEANUP_NEEDED',
      success: false,
      parentPid,
      recommendation: 'Notify parent process to wait() for child'
    };
  }
}
```

This technical specification provides the detailed implementation guidance needed to build the process classification system. The focus is on robust, accurate process identification with comprehensive error handling and performance optimization.
