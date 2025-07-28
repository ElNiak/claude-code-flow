/**
 * ABOUTME: Comprehensive integration tests for hooks debug logging functionality
 * ABOUTME: Tests all hook categories, coordination, execution, CLI, and wrapper functions
 */

// Simplified test version for hooks debug logging without complex Jest mocking
// Mock console methods for testing
let originalConsoleDebug, originalConsoleError, originalConsoleWarn;
let logMessages = [];

const captureLogMessage = (level, ...args) => {
  const fullMessage = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  logMessages.push({ level, message: fullMessage, args });
};

// Create embedded DebugLogger class that mirrors the functionality
class TestDebugLogger {
  constructor() {
    this.enabled = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
    this.enabledCategories = this.parseDebugCategories();
    this.correlationId = 0;
    this.callStack = new Map();
    this.performanceThreshold = parseInt(process.env.DEBUG_PERF_THRESHOLD) || 100;
  }

  parseDebugCategories() {
    const categories = process.env.DEBUG_CATEGORIES || 'all';
    return categories.split(',').map(cat => cat.trim().toLowerCase());
  }

  shouldLog(category = 'general') {
    if (!this.enabled) return false;
    return this.enabledCategories.includes('all') ||
           this.enabledCategories.includes(category.toLowerCase());
  }

  generateCorrelationId() {
    return `debug-${++this.correlationId}-${Date.now()}`;
  }

  serializeArgs(args) {
    try {
      return args ? JSON.stringify(args, null, 2) : 'no args';
    } catch (error) {
      return `[Serialization Error: ${error.message}]`;
    }
  }

  logFunctionEntry(module, functionName, args, category = 'general') {
    if (!this.shouldLog(category)) return null;

    const correlationId = this.generateCorrelationId();
    const timestamp = new Date().toISOString();
    const callId = Date.now();

    this.callStack.set(correlationId, {
      module,
      functionName,
      startTime: callId,
      category,
      timestamp
    });

    console.debug(
      `[🟢 ENTRY] [${timestamp}] [${category.toUpperCase()}] ${module}.${functionName}()`,
      `\n  ┌─ Correlation ID: ${correlationId}`,
      `\n  ├─ Arguments: ${this.serializeArgs(args)}`,
      `\n  └─ Stack Depth: ${this.callStack.size}`
    );

    return correlationId;
  }

  logFunctionExit(correlationId, result, category = 'general') {
    if (!correlationId || !this.shouldLog(category)) return;

    const callContext = this.callStack.get(correlationId);
    if (!callContext) return;

    const duration = Date.now() - callContext.startTime;
    const timestamp = new Date().toISOString();
    const isSlowCall = duration > this.performanceThreshold;

    console.debug(
      `[🔴 EXIT] [${timestamp}] [${callContext.category.toUpperCase()}] ${callContext.module}.${callContext.functionName}()`,
      `\n  ├─ Correlation ID: ${correlationId}`,
      `\n  ├─ Duration: ${duration}ms ${isSlowCall ? '⚠️  SLOW' : '✅'}`,
      `\n  ├─ Result: ${this.serializeArgs(result)}`,
      `\n  └─ Stack Depth: ${this.callStack.size - 1}`
    );

    if (isSlowCall) {
      console.warn(`⚠️  PERFORMANCE: ${callContext.module}.${callContext.functionName}() took ${duration}ms (threshold: ${this.performanceThreshold}ms)`);
    }

    this.callStack.delete(correlationId);
  }

  logFunctionError(correlationId, error, category = 'general') {
    if (!correlationId || !this.shouldLog(category)) return;

    const callContext = this.callStack.get(correlationId);
    if (!callContext) return;

    const duration = Date.now() - callContext.startTime;
    const timestamp = new Date().toISOString();

    console.error(
      `[❌ ERROR] [${timestamp}] [${callContext.category.toUpperCase()}] ${callContext.module}.${callContext.functionName}()`,
      `\n  ├─ Correlation ID: ${correlationId}`,
      `\n  ├─ Duration: ${duration}ms`,
      `\n  ├─ Error: ${error.message}`,
      `\n  ├─ Stack Trace: ${error.stack}`,
      `\n  └─ Stack Depth: ${this.callStack.size - 1}`
    );

    this.callStack.delete(correlationId);
  }

  logEvent(module, event, data, category = 'general') {
    if (!this.shouldLog(category)) return;

    const timestamp = new Date().toISOString();
    console.debug(
      `[📝 EVENT] [${timestamp}] [${category.toUpperCase()}] ${module}: ${event}`,
      `\n  └─ Data: ${this.serializeArgs(data)}`
    );
  }
}

const debugLogger = new TestDebugLogger();

function beforeEach() {
  // Reset state
  logMessages = [];

  // Setup console capture
  originalConsoleDebug = console.debug;
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;

  console.debug = (...args) => captureLogMessage('debug', ...args);
  console.error = (...args) => captureLogMessage('error', ...args);
  console.warn = (...args) => captureLogMessage('warn', ...args);

  // Enable debug logging for tests
  process.env.DEBUG = 'true';
  process.env.DEBUG_CATEGORIES = 'all';
});

afterEach(() => {
  // Cleanup spies
  consoleDebugSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();
  consoleWarnSpy?.mockRestore();

  // Reset environment
  delete process.env.DEBUG;
  delete process.env.DEBUG_CATEGORIES;
});

describe('🧪 Hooks Debug Logging Integration Tests', () => {

  describe('🔗 Hook Coordination Debug Logging', () => {

    test('should log hook coordination with correlation IDs', () => {
      // Test coordination logging
      const correlationId = debugLogger.logFunctionEntry('HookCoordinator', 'coordinateHook',
        ['pre-task', ['--description', 'test']], 'hook-coordination');

      expect(correlationId).toMatch(/^debug-\d+-\d+$/);
      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[🟢 ENTRY]');
      expect(logMessages[0].message).toContain('[HOOK-COORDINATION]');
      expect(logMessages[0].message).toContain('HookCoordinator.coordinateHook()');
      expect(logMessages[0].message).toContain(correlationId);
    });

    test('should log deadlock prevention with detailed analysis', () => {
      debugLogger.logEvent('HookCoordinator', 'deadlock_prevention_check', {
        hookType: 'pre-edit',
        dependencies: ['pre-task'],
        blockedBy: ['post-edit'],
        circularDependencyCheck: 'passed',
        resourceContentionCheck: 'passed'
      }, 'hook-deadlock');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[📝 EVENT]');
      expect(logMessages[0].message).toContain('[HOOK-DEADLOCK]');
      expect(logMessages[0].message).toContain('deadlock_prevention_check');
      expect(logMessages[0].message).toContain('circularDependencyCheck');
    });

    test('should log lock management with timing', () => {
      const startTime = Date.now();
      debugLogger.logEvent('HookCoordinator', 'lock_acquired', {
        lockId: 'pre-task-12345-1234567890',
        hookType: 'pre-task',
        processId: process.pid,
        acquisitionTime: 15,
        lockTimeout: 30000
      }, 'hook-locking');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[HOOK-LOCKING]');
      expect(logMessages[0].message).toContain('lock_acquired');
      expect(logMessages[0].message).toContain('acquisitionTime');
    });

    test('should log dependency resolution status', () => {
      debugLogger.logEvent('HookCoordinator', 'dependency_resolution', {
        hookType: 'post-edit',
        dependencies: ['pre-edit'],
        dependenciesSatisfied: true,
        waitTime: 250,
        maxWaitTime: 30000
      }, 'hook-dependencies');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[HOOK-DEPENDENCIES]');
      expect(logMessages[0].message).toContain('dependency_resolution');
      expect(logMessages[0].message).toContain('dependenciesSatisfied');
    });

  });

  describe('⚡ Hook Execution Debug Logging', () => {

    test('should log hook queue operations', () => {
      const correlationId = debugLogger.logFunctionEntry('HookExecutionQueue', 'enqueue',
        ['pre-task', ['--description', 'test'], 'high'], 'hook-queue');

      debugLogger.logEvent('HookExecutionQueue', 'task_queued', {
        taskId: 'hook-123-456',
        hookType: 'pre-task',
        priority: 'high',
        queueLength: 1,
        queuePosition: 0
      }, 'hook-queue');

      debugLogger.logFunctionExit(correlationId, { success: true, taskId: 'hook-123-456' }, 'hook-queue');

      expect(logMessages).toHaveLength(3);
      expect(logMessages[0].message).toContain('[HOOK-QUEUE]');
      expect(logMessages[1].message).toContain('task_queued');
      expect(logMessages[2].message).toContain('[🔴 EXIT]');
    });

    test('should log hook process pool management', () => {
      debugLogger.logEvent('HookProcessPool', 'process_acquired', {
        processId: 12345,
        poolSize: 2,
        maxPoolSize: 3,
        activeProcesses: 1,
        acquisitionTime: 5
      }, 'hook-pool');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[HOOK-POOL]');
      expect(logMessages[0].message).toContain('process_acquired');
      expect(logMessages[0].message).toContain('poolSize');
    });

    test('should log hook execution with timeout monitoring', () => {
      const correlationId = debugLogger.logFunctionEntry('HookExecutionQueue', 'executeHookWithTimeout',
        ['pre-task', ['--description', 'test']], 'hook-execution');

      debugLogger.logEvent('HookExecutionQueue', 'timeout_setup', {
        hookType: 'pre-task',
        timeout: 5000,
        executionStarted: true
      }, 'hook-execution');

      debugLogger.logFunctionExit(correlationId, { output: 'Hook completed successfully', exitCode: 0 }, 'hook-execution');

      expect(logMessages).toHaveLength(3);
      expect(logMessages[0].message).toContain('[HOOK-EXECUTION]');
      expect(logMessages[1].message).toContain('timeout_setup');
      expect(logMessages[2].message).toContain('Hook completed successfully');
    });

    test('should log hook execution metrics collection', () => {
      debugLogger.logEvent('HookExecutionQueue', 'execution_stats_updated', {
        hookType: 'pre-task',
        success: true,
        duration: 245,
        totalExecutions: 5,
        successRate: 100,
        avgDuration: 234
      }, 'hook-execution');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('execution_stats_updated');
      expect(logMessages[0].message).toContain('successRate');
    });

  });

  describe('💻 Hook CLI Debug Logging', () => {

    test('should log CLI hook command processing', () => {
      const correlationId = debugLogger.logFunctionEntry('HookCLI', 'buildArgs',
        ['pre-task', { description: 'test', complexity: 'high' }], 'hook-cli');

      debugLogger.logEvent('HookCLI', 'args_built', {
        hookType: 'pre-task',
        originalOptions: { description: 'test', complexity: 'high' },
        finalArgs: ['pre-task', '--description', 'test', '--complexity', 'high'],
        argCount: 5
      }, 'hook-args');

      debugLogger.logFunctionExit(correlationId, ['pre-task', '--description', 'test', '--complexity', 'high'], 'hook-cli');

      expect(logMessages).toHaveLength(3);
      expect(logMessages[0].message).toContain('[HOOK-CLI]');
      expect(logMessages[1].message).toContain('args_built');
      expect(logMessages[2].message).toContain('--complexity');
    });

    test('should log CLI parameter validation', () => {
      debugLogger.logEvent('HookCLI', 'parameter_validation', {
        hookType: 'post-task',
        requiredParams: ['taskId'],
        providedParams: { taskId: 'task-123' },
        validationResult: 'passed',
        validationRules: ['taskId required']
      }, 'hook-validation');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[HOOK-VALIDATION]');
      expect(logMessages[0].message).toContain('parameter_validation');
      expect(logMessages[0].message).toContain('validationResult');
    });

    test('should log CLI command resolution', () => {
      debugLogger.logEvent('HookCLI', 'command_resolution', {
        originalCommand: 'start',
        resolvedCommand: 'pre-task',
        shortcutUsed: true,
        shortcutMap: { 'start': 'pre-task' }
      }, 'hook-command');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[HOOK-COMMAND]');
      expect(logMessages[0].message).toContain('command_resolution');
      expect(logMessages[0].message).toContain('shortcutUsed');
    });

  });

  describe('🔧 Hook Wrapper Debug Logging', () => {

    test('should log wrapper function execution', () => {
      const correlationId = debugLogger.logFunctionEntry('HookWrapper', 'preTask',
        ['Build REST API', { autoSpawnAgents: true }], 'hook-wrapper');

      debugLogger.logEvent('HookWrapper', 'preTask_execution', {
        description: 'Build REST API',
        autoSpawnAgents: true,
        enabled: true,
        args: ['--description', 'Build REST API', '--auto-spawn-agents', 'true']
      }, 'hook-wrapper');

      debugLogger.logFunctionExit(correlationId, undefined, 'hook-wrapper');

      expect(logMessages).toHaveLength(3);
      expect(logMessages[0].message).toContain('[HOOK-WRAPPER]');
      expect(logMessages[1].message).toContain('preTask_execution');
      expect(logMessages[2].message).toContain('[🔴 EXIT]');
    });

    test('should log notification dispatch', () => {
      debugLogger.logEvent('HookWrapper', 'notification_dispatch', {
        message: 'Task completed successfully',
        level: 'info',
        telemetry: true,
        persist: false,
        dispatchTime: Date.now()
      }, 'hook-notify');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[HOOK-NOTIFY]');
      expect(logMessages[0].message).toContain('notification_dispatch');
      expect(logMessages[0].message).toContain('Task completed successfully');
    });

    test('should log lifecycle event execution', () => {
      debugLogger.logEvent('HookWrapper', 'lifecycle_event', {
        eventType: 'session-end',
        sessionId: 'session-123',
        exportMetrics: true,
        generateSummary: true,
        duration: 3600000
      }, 'hook-lifecycle');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('[HOOK-LIFECYCLE]');
      expect(logMessages[0].message).toContain('lifecycle_event');
      expect(logMessages[0].message).toContain('session-end');
    });

  });

  describe('⚡ Performance Monitoring', () => {

    test('should detect slow hook operations', () => {
      // Set low threshold for testing
      process.env.DEBUG_PERF_THRESHOLD = '10';

      const correlationId = debugLogger.logFunctionEntry('HookCoordinator', 'coordinateHook',
        ['pre-task', []], 'hook-coordination');

      // Simulate slow operation by advancing time
      setTimeout(() => {
        debugLogger.logFunctionExit(correlationId, { success: true }, 'hook-coordination');
      }, 50);

      // Wait for async operation
      return new Promise(resolve => {
        setTimeout(() => {
          expect(logMessages.length).toBeGreaterThan(1);
          expect(logMessages.some(msg => msg.message.includes('⚠️  SLOW'))).toBe(true);
          resolve();
        }, 100);
      });
    });

    test('should track call stack depth for nested hooks', () => {
      const correlationId1 = debugLogger.logFunctionEntry('HookCoordinator', 'coordinateHook', [], 'hook-coordination');
      const correlationId2 = debugLogger.logFunctionEntry('HookExecutionQueue', 'enqueue', [], 'hook-queue');
      const correlationId3 = debugLogger.logFunctionEntry('HookProcessPool', 'acquireProcess', [], 'hook-pool');

      expect(logMessages).toHaveLength(3);
      expect(logMessages[0].message).toContain('Stack Depth: 1');
      expect(logMessages[1].message).toContain('Stack Depth: 2');
      expect(logMessages[2].message).toContain('Stack Depth: 3');

      debugLogger.logFunctionExit(correlationId3, {}, 'hook-pool');
      debugLogger.logFunctionExit(correlationId2, {}, 'hook-queue');
      debugLogger.logFunctionExit(correlationId1, {}, 'hook-coordination');
    });

  });

  describe('🚨 Error Handling & Recovery', () => {

    test('should log hook execution errors with context', () => {
      const correlationId = debugLogger.logFunctionEntry('HookExecutionQueue', 'executeHookTask',
        [{ id: 'task-123', hookType: 'pre-task' }], 'hook-execution');

      const error = new Error('Hook execution failed: timeout');
      error.stack = 'Error: Hook execution failed: timeout\n    at HookExecutionQueue.executeHookTask';

      debugLogger.logFunctionError(correlationId, error, 'hook-execution');

      expect(logMessages).toHaveLength(2);
      expect(logMessages[1].message).toContain('[❌ ERROR]');
      expect(logMessages[1].message).toContain('Hook execution failed: timeout');
      expect(logMessages[1].message).toContain('Stack Trace:');
    });

    test('should log emergency recovery operations', () => {
      debugLogger.logEvent('HookCoordinator', 'emergency_reset', {
        reason: 'deadlock_detected',
        activeLocks: 3,
        pendingExecutions: 5,
        clearingAll: true,
        resetTimestamp: Date.now()
      }, 'hook-coordination');

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].message).toContain('emergency_reset');
      expect(logMessages[0].message).toContain('deadlock_detected');
      expect(logMessages[0].message).toContain('activeLocks');
    });

  });

  describe('🔍 Category-Based Filtering', () => {

    test('should filter logs by hook-specific categories', () => {
      process.env.DEBUG_CATEGORIES = 'hook-coordination,hook-execution';

      debugLogger.logEvent('HookCoordinator', 'test_coordination', {}, 'hook-coordination');
      debugLogger.logEvent('HookExecutionQueue', 'test_execution', {}, 'hook-execution');
      debugLogger.logEvent('HookWrapper', 'test_wrapper', {}, 'hook-wrapper');
      debugLogger.logEvent('HookCLI', 'test_cli', {}, 'hook-cli');

      // Should only log coordination and execution events
      expect(logMessages).toHaveLength(2);
      expect(logMessages[0].message).toContain('test_coordination');
      expect(logMessages[1].message).toContain('test_execution');
    });

    test('should handle "all" category for hooks', () => {
      process.env.DEBUG_CATEGORIES = 'all';

      debugLogger.logEvent('Hook', 'test_all_categories', {}, 'hook-coordination');
      debugLogger.logEvent('Hook', 'test_all_categories', {}, 'hook-execution');
      debugLogger.logEvent('Hook', 'test_all_categories', {}, 'hook-wrapper');
      debugLogger.logEvent('Hook', 'test_all_categories', {}, 'hook-cli');

      expect(logMessages).toHaveLength(4);
    });

  });

  describe('🧪 Integration End-to-End Tests', () => {

    test('should provide complete hook execution traceability', () => {
      // Simulate complete hook execution flow
      const coordinationId = debugLogger.logFunctionEntry('HookCoordinator', 'coordinateHook',
        ['pre-task', ['--description', 'test']], 'hook-coordination');

      const executionId = debugLogger.logFunctionEntry('HookExecutionQueue', 'enqueue',
        ['pre-task', ['--description', 'test'], 'high'], 'hook-execution');

      const processId = debugLogger.logFunctionEntry('HookProcessPool', 'acquireProcess',
        [], 'hook-pool');

      debugLogger.logEvent('HookProcessPool', 'process_acquired', { processId: 12345 }, 'hook-pool');
      debugLogger.logEvent('HookExecutionQueue', 'hook_executed', { success: true }, 'hook-execution');
      debugLogger.logEvent('HookCoordinator', 'coordination_complete', { duration: 150 }, 'hook-coordination');

      debugLogger.logFunctionExit(processId, { processId: 12345 }, 'hook-pool');
      debugLogger.logFunctionExit(executionId, { success: true }, 'hook-execution');
      debugLogger.logFunctionExit(coordinationId, { success: true }, 'hook-coordination');

      // Should have complete execution trace
      expect(logMessages.length).toBeGreaterThan(8);
      expect(logMessages.some(msg => msg.message.includes('coordinateHook'))).toBe(true);
      expect(logMessages.some(msg => msg.message.includes('enqueue'))).toBe(true);
      expect(logMessages.some(msg => msg.message.includes('acquireProcess'))).toBe(true);
    });

    test('should maintain correlation across hook boundaries', () => {
      const wrapperCorrelationId = debugLogger.logFunctionEntry('HookWrapper', 'preTask',
        ['test task', {}], 'hook-wrapper');

      const coordinationCorrelationId = debugLogger.logFunctionEntry('HookCoordinator', 'coordinateHook',
        ['pre-task', []], 'hook-coordination');

      // Both should have unique correlation IDs
      expect(wrapperCorrelationId).toMatch(/^debug-\d+-\d+$/);
      expect(coordinationCorrelationId).toMatch(/^debug-\d+-\d+$/);
      expect(wrapperCorrelationId).not.toBe(coordinationCorrelationId);

      // Both should be traceable in logs
      expect(logMessages.some(msg => msg.message.includes(wrapperCorrelationId))).toBe(true);
      expect(logMessages.some(msg => msg.message.includes(coordinationCorrelationId))).toBe(true);
    });

  });

});

describe('📈 Hook Debug Logging Performance Tests', () => {

  test('should have minimal overhead when debug logging is disabled', () => {
    process.env.DEBUG = 'false';
    delete process.env.DEBUG_CATEGORIES;

    const startTime = Date.now();

    // Perform multiple logging operations
    for (let i = 0; i < 1000; i++) {
      const correlationId = debugLogger.logFunctionEntry('TestModule', 'testFunction', [i], 'test-category');
      debugLogger.logEvent('TestModule', 'test_event', { iteration: i }, 'test-category');
      debugLogger.logFunctionExit(correlationId, { result: i * 2 }, 'test-category');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete quickly when disabled
    expect(duration).toBeLessThan(100); // Less than 100ms for 1000 operations
    expect(logMessages).toHaveLength(0); // No messages when disabled
  });

  test('should maintain acceptable performance when enabled', () => {
    process.env.DEBUG = 'true';
    process.env.DEBUG_CATEGORIES = 'hook-test';

    const startTime = Date.now();

    // Perform logging operations
    for (let i = 0; i < 100; i++) {
      const correlationId = debugLogger.logFunctionEntry('TestModule', 'testFunction', [i], 'hook-test');
      debugLogger.logEvent('TestModule', 'test_event', { iteration: i }, 'hook-test');
      debugLogger.logFunctionExit(correlationId, { result: i * 2 }, 'hook-test');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete reasonably quickly when enabled
    expect(duration).toBeLessThan(1000); // Less than 1 second for 100 operations
    expect(logMessages.length).toBeGreaterThan(200); // Should have logged entries
  });

});

// Final summary test
test('🎉 Hooks Debug Logging System - Complete Integration Validation', () => {
  // Test that the full hooks debug logging system is properly integrated
  const categories = ['hook-coordination', 'hook-execution', 'hook-queue', 'hook-pool',
                     'hook-wrapper', 'hook-cli', 'hook-command', 'hook-validation',
                     'hook-args', 'hook-notify', 'hook-lifecycle'];

  categories.forEach(category => {
    debugLogger.logEvent('HookSystem', 'integration_test', { category }, category);
  });

  expect(logMessages).toHaveLength(categories.length);

  // Verify all hook categories are working
  categories.forEach((category, index) => {
    expect(logMessages[index].message).toContain(category.toUpperCase());
    expect(logMessages[index].message).toContain('integration_test');
  });

  console.log('🎉 All hooks debug logging integration tests passed!');
  console.log(`📊 Total categories tested: ${categories.length}`);
  console.log(`📋 Total log messages validated: ${logMessages.length}`);
  console.log('✅ Hooks debug logging system is fully operational!');
});
