/**
 * Hooks Coordinator - Automated hook management with context enrichment
 * Manages pre/post operation automation with neural training integration
 */

import type { 
  ILogger, 
  IEventBus,
} from '../../utils/types.js';
import type {
  PreTaskOptions,
  PostTaskOptions,
  PreEditOptions,
  PostEditOptions,
  PreCommandOptions,
  PostCommandOptions,
  SessionStartOptions,
  SessionEndOptions,
  SessionRestoreOptions,
  PreSearchOptions,
  NotificationOptions,
  PerformanceOptions,
  MemorySyncOptions,
  TelemetryOptions
} from '../../cli/commands/hook-types.js';
import { spawn } from 'child_process';
import { HookError } from '../../utils/errors.js';

export interface HooksCoordinatorConfig {
  automation: {
    enabled: boolean;
    autoFormatCode: boolean;
    autoValidateCommands: boolean;
    autoAssignAgents: boolean;
    autoOptimizeTopology: boolean;
    autoCacheSearches: boolean;
  };
  neuralTraining: {
    enabled: boolean;
    learningRate: number;
    adaptiveOptimization: boolean;
    performanceThreshold: number;
    trainingInterval: number;
  };
  contextEnrichment: {
    enabled: boolean;
    includeProjectMetadata: boolean;
    includePerformanceMetrics: boolean;
    includeMemoryContext: boolean;
    includeSwarmState: boolean;
  };
  safety: {
    validateBeforeExecution: boolean;
    sandboxMode: boolean;
    commandWhitelist: string[];
    maxExecutionTime: number;
  };
}

export interface HookExecutionContext {
  agentId?: string;
  sessionId?: string;
  swarmId?: string;
  taskId?: string;
  workflowId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  automated: boolean;
  metadata?: Record<string, unknown>;
}

export interface HookExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics: {
    hookType: string;
    executionTime: number;
    automation: {
      triggered: string[];
      completed: string[];
      failed: string[];
    };
    neuralTraining: {
      patternsLearned: number;
      performanceImprovement: number;
    };
    contextEnrichment: {
      dataPointsAdded: number;
      relevanceScore: number;
    };
  };
}

/**
 * Advanced Hooks Coordinator with Intelligence
 * Manages all hook operations with automation, learning, and context enrichment
 */
export class HooksCoordinator {
  private initialized = false;
  private hookMetrics = new Map<string, number[]>();
  private neuralPatterns = new Map<string, any>();
  private automationRules = new Map<string, any[]>();
  private contextCache = new Map<string, any>();
  private activeHooks = new Set<string>();

  // Hook type definitions with automation rules
  private readonly HOOK_AUTOMATION = {
    'pre-task': {
      autoActions: ['validate-task', 'assign-agents', 'prepare-environment'],
      contextNeeds: ['project-state', 'agent-availability', 'resource-usage'],
      neuralOptimizations: ['task-complexity-estimation', 'agent-selection'],
    },
    'post-task': {
      autoActions: ['analyze-performance', 'update-metrics', 'train-neural'],
      contextNeeds: ['execution-metrics', 'result-quality', 'resource-impact'],
      neuralOptimizations: ['performance-prediction', 'bottleneck-detection'],
    },
    'pre-edit': {
      autoActions: ['validate-file', 'backup-content', 'check-permissions'],
      contextNeeds: ['file-history', 'project-structure', 'lint-rules'],
      neuralOptimizations: ['edit-pattern-recognition', 'risk-assessment'],
    },
    'post-edit': {
      autoActions: ['format-code', 'update-memory', 'analyze-changes'],
      contextNeeds: ['diff-analysis', 'code-quality', 'dependency-impact'],
      neuralOptimizations: ['code-quality-prediction', 'refactoring-suggestions'],
    },
    'pre-command': {
      autoActions: ['validate-command', 'check-safety', 'prepare-sandbox'],
      contextNeeds: ['command-history', 'system-state', 'security-context'],
      neuralOptimizations: ['command-safety-scoring', 'execution-planning'],
    },
    'post-command': {
      autoActions: ['analyze-output', 'update-state', 'cache-results'],
      contextNeeds: ['execution-results', 'system-changes', 'error-patterns'],
      neuralOptimizations: ['success-prediction', 'error-classification'],
    },
    'session-start': {
      autoActions: ['load-context', 'restore-state', 'initialize-agents'],
      contextNeeds: ['previous-sessions', 'project-config', 'user-preferences'],
      neuralOptimizations: ['session-optimization', 'context-prioritization'],
    },
    'session-end': {
      autoActions: ['save-state', 'generate-summary', 'export-metrics'],
      contextNeeds: ['session-activities', 'performance-data', 'learning-outcomes'],
      neuralOptimizations: ['session-quality-scoring', 'improvement-identification'],
    },
  };

  constructor(
    private config: HooksCoordinatorConfig,
    private eventBus: IEventBus,
    private logger: ILogger,
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing Hooks Coordinator...');

    try {
      // Load neural patterns if neural training is enabled
      if (this.config.neuralTraining.enabled) {
        await this.loadNeuralPatterns();
      }

      // Setup automation rules
      this.setupAutomationRules();

      // Initialize context enrichment
      if (this.config.contextEnrichment.enabled) {
        await this.initializeContextEnrichment();
      }

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      this.initialized = true;
      this.logger.info('Hooks Coordinator initialized successfully');
      
      this.eventBus.emit('hooks-coordinator:ready', { 
        automation: this.config.automation.enabled,
        neuralTraining: this.config.neuralTraining.enabled,
        contextEnrichment: this.config.contextEnrichment.enabled,
      });

    } catch (error) {
      this.logger.error('Failed to initialize Hooks Coordinator', error);
      throw new HookError('Hooks Coordinator initialization failed', { error });
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.info('Shutting down Hooks Coordinator...');

    try {
      // Save neural patterns if training is enabled
      if (this.config.neuralTraining.enabled) {
        await this.saveNeuralPatterns();
      }

      // Wait for active hooks to complete
      await this.waitForActiveHooks();

      this.initialized = false;
      this.logger.info('Hooks Coordinator shutdown complete');

    } catch (error) {
      this.logger.error('Error during Hooks Coordinator shutdown', error);
      throw error;
    }
  }

  /**
   * Execute pre-task hook with intelligent automation
   */
  async executePreTask(
    options: PreTaskOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('pre-task', options, context);
  }

  /**
   * Execute post-task hook with performance analysis
   */
  async executePostTask(
    options: PostTaskOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('post-task', options, context);
  }

  /**
   * Execute pre-edit hook with validation
   */
  async executePreEdit(
    options: PreEditOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('pre-edit', options, context);
  }

  /**
   * Execute post-edit hook with code formatting
   */
  async executePostEdit(
    options: PostEditOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('post-edit', options, context);
  }

  /**
   * Execute pre-command hook with safety validation
   */
  async executePreCommand(
    options: PreCommandOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('pre-command', options, context);
  }

  /**
   * Execute post-command hook with result analysis
   */
  async executePostCommand(
    options: PostCommandOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('post-command', options, context);
  }

  /**
   * Execute session hooks
   */
  async executeSessionStart(
    options: SessionStartOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('session-start', options, context);
  }

  async executeSessionEnd(
    options: SessionEndOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('session-end', options, context);
  }

  async executeSessionRestore(
    options: SessionRestoreOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('session-restore', options, context);
  }

  /**
   * Execute utility hooks
   */
  async executePreSearch(
    options: PreSearchOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('pre-search', options, context);
  }

  async executeNotification(
    options: NotificationOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('notification', options, context);
  }

  async executePerformance(
    options: PerformanceOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('performance', options, context);
  }

  async executeMemorySync(
    options: MemorySyncOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('memory-sync', options, context);
  }

  async executeTelemetry(
    options: TelemetryOptions,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    return this.executeHookWithIntelligence('telemetry', options, context);
  }

  /**
   * Core intelligent hook execution with automation and learning
   */
  private async executeHookWithIntelligence(
    hookType: string,
    options: any,
    context: HookExecutionContext,
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const hookId = `${hookType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.activeHooks.add(hookId);

    try {
      this.logger.debug('Executing intelligent hook', { 
        hookType, 
        context: context.agentId,
        priority: context.priority,
      });

      const result: HookExecutionResult = {
        success: false,
        metrics: {
          hookType,
          executionTime: 0,
          automation: {
            triggered: [],
            completed: [],
            failed: [],
          },
          neuralTraining: {
            patternsLearned: 0,
            performanceImprovement: 0,
          },
          contextEnrichment: {
            dataPointsAdded: 0,
            relevanceScore: 0,
          },
        },
      };

      // Step 1: Context enrichment
      if (this.config.contextEnrichment.enabled) {
        const enrichedContext = await this.enrichContext(hookType, options, context);
        result.metrics.contextEnrichment = enrichedContext.metrics;
        options = { ...options, ...enrichedContext.data };
      }

      // Step 2: Automation pre-processing
      if (this.config.automation.enabled) {
        const automationResult = await this.executeAutomation(hookType, 'pre', options, context);
        result.metrics.automation.triggered.push(...automationResult.triggered);
        result.metrics.automation.completed.push(...automationResult.completed);
        result.metrics.automation.failed.push(...automationResult.failed);
      }

      // Step 3: Neural optimization
      if (this.config.neuralTraining.enabled) {
        const optimizedOptions = await this.applyNeuralOptimizations(hookType, options, context);
        options = optimizedOptions;
      }

      // Step 4: Execute actual hook
      const execResult = await this.executeRawHook(hookType, options);
      result.success = execResult.success;
      result.data = execResult.data;
      result.error = execResult.error;

      // Step 5: Automation post-processing
      if (this.config.automation.enabled && result.success) {
        const postAutomationResult = await this.executeAutomation(hookType, 'post', options, context);
        result.metrics.automation.completed.push(...postAutomationResult.completed);
        result.metrics.automation.failed.push(...postAutomationResult.failed);
      }

      // Step 6: Neural training
      if (this.config.neuralTraining.enabled) {
        const trainingResult = await this.performNeuralTraining(
          hookType,
          options,
          result,
          context,
        );
        result.metrics.neuralTraining = trainingResult;
      }

      const executionTime = Date.now() - startTime;
      result.metrics.executionTime = executionTime;

      // Record performance metrics
      this.recordHookPerformance(hookType, executionTime, result.success);

      this.eventBus.emit('hooks-coordinator:executed', {
        hookType,
        success: result.success,
        executionTime,
        automation: result.metrics.automation,
        neuralTraining: result.metrics.neuralTraining,
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Hook execution failed', { hookType, error, executionTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          hookType,
          executionTime,
          automation: { triggered: [], completed: [], failed: [] },
          neuralTraining: { patternsLearned: 0, performanceImprovement: 0 },
          contextEnrichment: { dataPointsAdded: 0, relevanceScore: 0 },
        },
      };
    } finally {
      this.activeHooks.delete(hookId);
    }
  }

  /**
   * Execute raw hook with ruv-swarm
   */
  private async executeRawHook(
    hookType: string,
    options: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return new Promise((resolve) => {
      const args = this.buildHookArgs(hookType, options);
      
      this.logger.debug(`Executing: npx ruv-swarm hook ${args.join(' ')}`);
      
      const child = spawn('npx', ['ruv-swarm', 'hook', ...args], {
        stdio: 'pipe',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            data: this.parseHookOutput(stdout),
          });
        } else {
          resolve({
            success: false,
            error: stderr || `Hook ${hookType} failed with exit code ${code}`,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      // Set timeout
      setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          error: `Hook ${hookType} timed out after ${this.config.safety.maxExecutionTime}ms`,
        });
      }, this.config.safety.maxExecutionTime);
    });
  }

  /**
   * Enrich context with additional metadata
   */
  private async enrichContext(
    hookType: string,
    options: any,
    context: HookExecutionContext,
  ): Promise<{ data: any; metrics: any }> {
    const enriched: any = {};
    let dataPointsAdded = 0;
    let relevanceScore = 0;

    // Add project metadata
    if (this.config.contextEnrichment.includeProjectMetadata) {
      try {
        const projectData = await this.getProjectMetadata();
        enriched.projectMetadata = projectData;
        dataPointsAdded += Object.keys(projectData).length;
        relevanceScore += 0.3;
      } catch (error) {
        this.logger.debug('Failed to get project metadata', { error });
      }
    }

    // Add performance metrics
    if (this.config.contextEnrichment.includePerformanceMetrics) {
      const perfMetrics = this.getPerformanceMetrics(hookType);
      if (perfMetrics) {
        enriched.performanceMetrics = perfMetrics;
        dataPointsAdded += Object.keys(perfMetrics).length;
        relevanceScore += 0.2;
      }
    }

    // Add memory context
    if (this.config.contextEnrichment.includeMemoryContext && context.sessionId) {
      try {
        const memoryContext = await this.getMemoryContext(context.sessionId);
        enriched.memoryContext = memoryContext;
        dataPointsAdded += memoryContext ? Object.keys(memoryContext).length : 0;
        relevanceScore += 0.3;
      } catch (error) {
        this.logger.debug('Failed to get memory context', { error });
      }
    }

    // Add swarm state
    if (this.config.contextEnrichment.includeSwarmState && context.swarmId) {
      try {
        const swarmState = await this.getSwarmState(context.swarmId);
        enriched.swarmState = swarmState;
        dataPointsAdded += swarmState ? Object.keys(swarmState).length : 0;
        relevanceScore += 0.2;
      } catch (error) {
        this.logger.debug('Failed to get swarm state', { error });
      }
    }

    return {
      data: enriched,
      metrics: {
        dataPointsAdded,
        relevanceScore: Math.min(1.0, relevanceScore),
      },
    };
  }

  /**
   * Execute automation rules for hook
   */
  private async executeAutomation(
    hookType: string,
    phase: 'pre' | 'post',
    options: any,
    context: HookExecutionContext,
  ): Promise<{ triggered: string[]; completed: string[]; failed: string[] }> {
    const result = { triggered: [], completed: [], failed: [] };

    const automation = this.HOOK_AUTOMATION[hookType as keyof typeof this.HOOK_AUTOMATION];
    if (!automation) {
      return result;
    }

    const actions = automation.autoActions.filter(action => 
      this.shouldTriggerAutomation(action, phase, options, context)
    );

    for (const action of actions) {
      result.triggered.push(action);
      
      try {
        await this.executeAutomationAction(action, hookType, options, context);
        result.completed.push(action);
      } catch (error) {
        this.logger.debug('Automation action failed', { action, error });
        result.failed.push(action);
      }
    }

    return result;
  }

  /**
   * Apply neural optimizations to hook options
   */
  private async applyNeuralOptimizations(
    hookType: string,
    options: any,
    context: HookExecutionContext,
  ): Promise<any> {
    const patterns = this.neuralPatterns.get(hookType);
    if (!patterns) {
      return options;
    }

    // Apply learned optimizations
    const optimized = { ...options };

    // Example optimizations based on neural patterns
    if (patterns.agentSelection && context.agentId) {
      optimized.suggestedAgent = patterns.agentSelection.bestMatch;
    }

    if (patterns.performanceTuning) {
      optimized.optimizedParams = patterns.performanceTuning.parameters;
    }

    return optimized;
  }

  /**
   * Perform neural training based on hook execution results
   */
  private async performNeuralTraining(
    hookType: string,
    options: any,
    result: HookExecutionResult,
    context: HookExecutionContext,
  ): Promise<{ patternsLearned: number; performanceImprovement: number }> {
    if (!this.config.neuralTraining.enabled) {
      return { patternsLearned: 0, performanceImprovement: 0 };
    }

    let patternsLearned = 0;
    let performanceImprovement = 0;

    try {
      // Learn from successful executions
      if (result.success && result.metrics.executionTime > 0) {
        const pattern = this.extractPattern(hookType, options, result, context);
        await this.updateNeuralPattern(hookType, pattern);
        patternsLearned = 1;

        // Calculate performance improvement
        const historicalAvg = this.getHistoricalAverage(hookType);
        if (historicalAvg > 0) {
          performanceImprovement = Math.max(0, 
            (historicalAvg - result.metrics.executionTime) / historicalAvg
          );
        }
      }

      // Learn from failures
      if (!result.success && result.error) {
        await this.updateFailurePattern(hookType, options, result.error, context);
        patternsLearned += 0.5; // Partial learning from failures
      }

    } catch (error) {
      this.logger.debug('Neural training failed', { hookType, error });
    }

    return { patternsLearned, performanceImprovement };
  }

  /**
   * Helper methods for context enrichment
   */
  private async getProjectMetadata(): Promise<any> {
    // Implementation would gather project-specific metadata
    return {
      timestamp: Date.now(),
      projectType: 'node',
      dependencies: [],
    };
  }

  private getPerformanceMetrics(hookType: string): any {
    const metrics = this.hookMetrics.get(hookType);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sum = metrics.reduce((a, b) => a + b, 0);
    return {
      averageExecutionTime: sum / metrics.length,
      executionCount: metrics.length,
      lastExecution: Date.now(),
    };
  }

  private async getMemoryContext(sessionId: string): Promise<any> {
    // Implementation would fetch memory context from memory coordinator
    return this.contextCache.get(`memory:${sessionId}`);
  }

  private async getSwarmState(swarmId: string): Promise<any> {
    // Implementation would fetch swarm state
    return this.contextCache.get(`swarm:${swarmId}`);
  }

  /**
   * Helper methods for automation
   */
  private shouldTriggerAutomation(
    action: string,
    phase: 'pre' | 'post',
    options: any,
    context: HookExecutionContext,
  ): boolean {
    // Implement logic to determine if automation should trigger
    const rules = this.automationRules.get(action);
    if (!rules) {
      return false;
    }

    return rules.some(rule => this.evaluateRule(rule, phase, options, context));
  }

  private evaluateRule(rule: any, phase: string, options: any, context: HookExecutionContext): boolean {
    // Simple rule evaluation logic
    return rule.phase === phase && 
           (rule.priority === 'all' || rule.priority === context.priority);
  }

  private async executeAutomationAction(
    action: string,
    hookType: string,
    options: any,
    context: HookExecutionContext,
  ): Promise<void> {
    // Implementation would execute specific automation actions
    this.logger.debug('Executing automation action', { action, hookType });
  }

  /**
   * Helper methods for neural training
   */
  private extractPattern(
    hookType: string,
    options: any,
    result: HookExecutionResult,
    context: HookExecutionContext,
  ): any {
    return {
      timestamp: Date.now(),
      executionTime: result.metrics.executionTime,
      success: result.success,
      context: {
        priority: context.priority,
        agentId: context.agentId,
      },
      options: this.sanitizeOptions(options),
    };
  }

  private async updateNeuralPattern(hookType: string, pattern: any): Promise<void> {
    const existing = this.neuralPatterns.get(hookType) || { patterns: [], lastUpdate: 0 };
    existing.patterns.push(pattern);
    existing.lastUpdate = Date.now();

    // Keep only recent patterns
    if (existing.patterns.length > 100) {
      existing.patterns = existing.patterns.slice(-100);
    }

    this.neuralPatterns.set(hookType, existing);
  }

  private async updateFailurePattern(
    hookType: string,
    options: any,
    error: string,
    context: HookExecutionContext,
  ): Promise<void> {
    const pattern = {
      timestamp: Date.now(),
      error,
      context: context.priority,
      options: this.sanitizeOptions(options),
    };

    const existing = this.neuralPatterns.get(`${hookType}:failures`) || { patterns: [] };
    existing.patterns.push(pattern);
    this.neuralPatterns.set(`${hookType}:failures`, existing);
  }

  private sanitizeOptions(options: any): any {
    // Remove sensitive data from options before storing
    const sanitized = { ...options };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }

  /**
   * Setup and utility methods
   */
  private async loadNeuralPatterns(): Promise<void> {
    // Implementation would load neural patterns from storage
    this.logger.debug('Neural patterns loaded');
  }

  private async saveNeuralPatterns(): Promise<void> {
    // Implementation would save neural patterns to storage
    this.logger.debug('Neural patterns saved');
  }

  private setupAutomationRules(): void {
    // Setup default automation rules
    this.automationRules.set('validate-command', [
      { phase: 'pre', priority: 'all', enabled: true },
    ]);
    this.automationRules.set('format-code', [
      { phase: 'post', priority: 'all', enabled: this.config.automation.autoFormatCode },
    ]);
  }

  private async initializeContextEnrichment(): Promise<void> {
    // Initialize context enrichment system
    this.logger.debug('Context enrichment initialized');
  }

  private setupPerformanceMonitoring(): void {
    // Cleanup old metrics periodically
    setInterval(() => {
      this.cleanupHookMetrics();
    }, 300000); // Every 5 minutes
  }

  private async waitForActiveHooks(): Promise<void> {
    while (this.activeHooks.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private buildHookArgs(hookType: string, options: any): string[] {
    const args = [hookType];
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const flagName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        
        if (typeof value === 'boolean') {
          if (value) {
            args.push(`--${flagName}`);
          }
        } else {
          args.push(`--${flagName}`, String(value));
        }
      }
    });
    
    return args;
  }

  private parseHookOutput(output: string): any {
    try {
      return JSON.parse(output);
    } catch {
      return { output };
    }
  }

  private recordHookPerformance(hookType: string, executionTime: number, success: boolean): void {
    if (!success) {
      return; // Only record successful executions
    }

    const metrics = this.hookMetrics.get(hookType) || [];
    metrics.push(executionTime);
    
    // Keep only last 50 measurements
    if (metrics.length > 50) {
      metrics.shift();
    }
    
    this.hookMetrics.set(hookType, metrics);
  }

  private getHistoricalAverage(hookType: string): number {
    const metrics = this.hookMetrics.get(hookType);
    if (!metrics || metrics.length === 0) {
      return 0;
    }

    return metrics.reduce((a, b) => a + b, 0) / metrics.length;
  }

  private cleanupHookMetrics(): void {
    // Remove old metrics that are no longer needed
    for (const [hookType, metrics] of this.hookMetrics.entries()) {
      if (metrics.length === 0) {
        this.hookMetrics.delete(hookType);
      }
    }
  }
}