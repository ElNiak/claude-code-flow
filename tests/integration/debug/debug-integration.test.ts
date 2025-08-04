/**
 * Debug Integration Tests - Cross-Component Validation
 * Tests the complete debug flow across system boundaries
 */

import { jest } from '@jest/globals';
import {
  DebugLogger,
  ComponentLoggerFactory,
  type ComponentType,
} from '../../../src/core/logger.js';
import { MCPDebugLogger, getMCPDebugLogger } from '../../../src/mcp/debug-logger.js';
import { ConsoleMigration } from '../../../src/utils/console-migration.js';
import type { MCPSession, MCPRequest } from '../../../src/utils/types.js';

describe('Debug Integration - Cross-Component Flow', () => {
  let debugLogger: DebugLogger;
  let mcpDebugLogger: MCPDebugLogger;
  let originalConsole: typeof console;

  beforeEach(() => {
    // Mock console methods for integration testing
    originalConsole = { ...console };
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

    // Initialize debug infrastructure
    ComponentLoggerFactory.initializeDebugLogger({
      level: 'debug',
      format: 'json',
      destination: 'console',
    });

    debugLogger = DebugLogger.getInstance();
    mcpDebugLogger = getMCPDebugLogger({
      enableTracing: true,
      enableCrossSystemCorrelation: true,
      enableToolTracing: true,
      performanceThreshold: 0.1,
      sanitizeSensitiveData: true,
    });
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
    mcpDebugLogger.shutdown();
    jest.clearAllMocks();
  });

  describe('CLI to MCP Debug Flow Integration', () => {
    it('should maintain correlation across CLI and MCP components', async () => {
      // Arrange
      const correlationId = 'integration-test-correlation-123';
      const sessionId = 'cli-session-456';

      // Act - Simulate CLI command that triggers MCP operations
      const cliLogger = ComponentLoggerFactory.getCLILogger(correlationId, sessionId);
      cliLogger.info('CLI command started: debug-test', {
        command: 'debug-test',
        args: ['--verbose'],
      });

      // Simulate MCP request triggered by CLI
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      const mcpSession: MCPSession = {
        id: sessionId,
        protocolVersion: { major: 2, minor: 0, patch: 0 },
        transport: 'stdio',
        capabilities: {},
      };

      const mcpCorrelationId = mcpDebugLogger.traceProtocolMessage(
        'inbound',
        'request',
        mcpRequest,
        mcpSession,
        { claudeCodeSessionId: 'cc-session-789' },
      );

      cliLogger.debug('MCP request initiated', {
        mcpCorrelationId,
        method: mcpRequest.method,
      });

      // Assert - Verify correlation chain
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(correlationId.slice(0, 8)));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining(sessionId));

      const mcpTrace = mcpDebugLogger.getProtocolTrace(mcpCorrelationId);
      expect(mcpTrace?.sessionId).toBe(sessionId);
      expect(mcpTrace?.claudeCodeSessionId).toBe('cc-session-789');
    });

    it('should handle CLI error propagation to MCP layer', async () => {
      // Arrange
      const correlationId = 'error-propagation-test';
      const error = new Error('CLI validation failed');

      // Act - Simulate CLI error that affects MCP operations
      const cliLogger = ComponentLoggerFactory.getCLILogger(correlationId);
      cliLogger.error('Command validation failed', error);

      // Simulate MCP error response
      const mcpErrorResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request - CLI validation failed',
          data: { correlationId },
        },
      };

      const mcpCorrelationId = mcpDebugLogger.traceProtocolMessage(
        'outbound',
        'error',
        mcpErrorResponse,
      );

      // Assert - Verify error correlation
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Command validation failed'),
      );
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid Request'));

      const mcpTrace = mcpDebugLogger.getProtocolTrace(mcpCorrelationId);
      expect(mcpTrace?.error?.category).toBe('protocol');
    });
  });

  describe('Console Migration Integration', () => {
    it('should migrate console calls while preserving debug correlation', () => {
      // Arrange
      const component: ComponentType = 'Core';
      const correlationId = 'migration-test-123';

      // Act - Simulate legacy console usage being migrated
      ConsoleMigration.log(component, 'Legacy console.log migrated', {
        correlationId,
        legacyCall: true,
      });

      ConsoleMigration.error(component, 'Legacy console.error migrated', new Error('Test error'));

      // Verify migration tracking
      const migrationStats = ConsoleMigration.getMigrationStats();

      // Assert
      expect(migrationStats['log@Core']).toBeDefined();
      expect(migrationStats['log@Core'].migratedCalls).toBe(1);
      expect(migrationStats['error@Core']).toBeDefined();
      expect(migrationStats['error@Core'].migratedCalls).toBe(1);

      // Verify component logger was called correctly
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Legacy console.log migrated'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Legacy console.error migrated'),
      );
    });

    it('should handle MCP stderr compliance during migration', () => {
      // Arrange
      const component: ComponentType = 'MCP';

      // Act - Migrate MCP console calls
      ConsoleMigration.log(component, 'MCP log message');
      ConsoleMigration.info(component, 'MCP info message');
      ConsoleMigration.warn(component, 'MCP warn message');
      ConsoleMigration.error(component, 'MCP error message');

      // Assert - All MCP messages should go to stderr
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('MCP log message'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('MCP info message'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('MCP warn message'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('MCP error message'));
    });
  });

  describe('Cross-System Correlation Integration', () => {
    it('should create and maintain cross-system correlations', async () => {
      // Arrange
      const claudeFlowSessionId = 'cf-integration-session';
      const claudeCodeSessionId = 'cc-integration-session';
      const workflowId = 'integration-workflow-123';

      // Act - Create cross-system correlation
      const correlationId = mcpDebugLogger.createCrossSystemCorrelation(
        claudeFlowSessionId,
        undefined,
        { workflowId, taskId: 'integration-task' },
      );

      const linkSuccess = mcpDebugLogger.linkToClaudeCode(
        correlationId,
        claudeCodeSessionId,
        'cc-correlation-456',
      );

      // Simulate CLI operations using the correlation
      const cliLogger = ComponentLoggerFactory.getCLILogger(correlationId);
      cliLogger.info('Cross-system operation started', {
        workflowId,
        claudeCodeSessionId,
      });

      // Simulate tool invocation with cross-system context
      const toolInvocationId = mcpDebugLogger.traceToolInvocation(
        'integration/test-tool',
        { data: 'cross-system-test' },
        {
          sessionId: claudeFlowSessionId,
          claudeCodeCorrelationId: 'cc-correlation-456',
        },
      );

      mcpDebugLogger.completeToolInvocation(toolInvocationId, {
        result: 'Cross-system operation completed',
      });

      // Assert - Verify cross-system links
      expect(linkSuccess).toBe(true);

      const correlation = mcpDebugLogger.getCrossSystemCorrelation(correlationId);
      expect(correlation?.claudeFlowSessionId).toBe(claudeFlowSessionId);
      expect(correlation?.claudeCodeSessionId).toBe(claudeCodeSessionId);
      expect(correlation?.correlationChain).toContain('cc-correlation-456');

      const toolTrace = mcpDebugLogger.getToolInvocationTrace(toolInvocationId);
      expect(toolTrace?.crossSystemRef?.claudeCodeCorrelationId).toBe('cc-correlation-456');

      // Verify logging output contains cross-system references
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cross-system correlation created'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cross-system operation started'),
      );
    });

    it('should handle cross-system correlation failures gracefully', () => {
      // Arrange
      const invalidCorrelationId = 'non-existent-correlation';

      // Act - Attempt to link to non-existent correlation
      const linkSuccess = mcpDebugLogger.linkToClaudeCode(
        invalidCorrelationId,
        'cc-session-123',
        'cc-correlation-456',
      );

      // Assert
      expect(linkSuccess).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Correlation not found for claude-code link'),
      );
    });
  });

  describe('Performance Integration Testing', () => {
    it('should maintain performance constraints across all components', async () => {
      // Arrange
      const iterations = 1000;
      const components: ComponentType[] = ['CLI', 'MCP', 'Core', 'Swarm', 'Terminal'];

      // Act - Simulate high-load scenario across components
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const component = components[i % components.length];
        const correlationId = `perf-test-${i}`;

        // CLI logging
        const cliLogger = ComponentLoggerFactory.getCLILogger(correlationId);
        cliLogger.debug(`Performance test iteration ${i}`, {
          iteration: i,
          component,
        });

        // MCP protocol tracing
        if (i % 10 === 0) {
          mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
            jsonrpc: '2.0',
            id: i,
            method: `perf/test-${i}`,
            params: { iteration: i },
          });
        }

        // Console migration
        if (i % 5 === 0) {
          ConsoleMigration.log(component, `Migrated log ${i}`);
        }

        // Tool invocation tracing
        if (i % 20 === 0) {
          const invocationId = mcpDebugLogger.traceToolInvocation(`perf/tool-${i}`, {
            iteration: i,
          });
          mcpDebugLogger.completeToolInvocation(invocationId, { result: 'success' });
        }
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Assert - Performance requirements
      expect(totalDuration).toBeLessThan(2000); // Less than 2 seconds for 1000 operations

      // Verify metrics
      const mcpMetrics = mcpDebugLogger.getMetrics();
      expect(mcpMetrics.protocolCompliance.totalMessages).toBeGreaterThan(0);
      expect(mcpMetrics.toolInvocations.total).toBeGreaterThan(0);

      const migrationStats = ConsoleMigration.getMigrationStats();
      expect(Object.keys(migrationStats).length).toBeGreaterThan(0);
    });

    it('should handle memory pressure across integrated components', async () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - Create memory pressure scenario
      for (let i = 0; i < 5000; i++) {
        // Large debug operations
        const correlationId = `memory-test-${i}`;
        const largeData = 'x'.repeat(1000); // 1KB per iteration

        // CLI logging with large payloads
        const cliLogger = ComponentLoggerFactory.getCLILogger(correlationId);
        cliLogger.debug(`Memory test ${i}`, {
          largeData,
          iteration: i,
          timestamp: Date.now(),
        });

        // MCP tracing with large payloads
        if (i % 10 === 0) {
          mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
            jsonrpc: '2.0',
            id: i,
            method: 'memory/test',
            params: { largeData, iteration: i },
          });
        }

        // Console migration tracking
        ConsoleMigration.log('CLI', `Memory test log ${i}`, largeData);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;

      // Assert - Memory constraints
      expect(memoryGrowth).toBeLessThan(100); // Less than 100% growth

      // Verify emergency mode handling
      const memoryPressure = ComponentLoggerFactory.getMemoryPressure();
      expect(memoryPressure).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from cascading errors across components', async () => {
      // Arrange
      const correlationId = 'error-recovery-test';

      // Act - Simulate cascading error scenario
      try {
        // CLI error
        const cliLogger = ComponentLoggerFactory.getCLILogger(correlationId);
        cliLogger.error('CLI component error', new Error('CLI failure'));

        // MCP error in response to CLI error
        const mcpError = {
          jsonrpc: '2.0' as const,
          id: 1,
          error: {
            code: -32000,
            message: 'Server error caused by CLI failure',
            data: { correlationId },
          },
        };

        mcpDebugLogger.traceProtocolMessage('outbound', 'error', mcpError);

        // Console migration should continue working despite errors
        ConsoleMigration.warn('Core', 'System warning during error recovery');

        // Tool invocation that fails
        const invocationId = mcpDebugLogger.traceToolInvocation('recovery/test-tool', {
          test: 'error-scenario',
        });
        mcpDebugLogger.completeToolInvocation(
          invocationId,
          undefined,
          new Error('Tool execution failed'),
        );
      } catch (error) {
        // Should not throw unhandled errors
        expect(error).toBeUndefined();
      }

      // Assert - System should continue functioning
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CLI component error'));
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Server error caused by CLI failure'),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('System warning during error recovery'),
      );

      // Verify metrics are still tracking correctly
      const mcpMetrics = mcpDebugLogger.getMetrics();
      expect(mcpMetrics.toolInvocations.failed).toBe(1);
      expect(mcpMetrics.protocolCompliance.violations).toBeGreaterThan(0);
    });
  });

  describe('Component Logger Factory Integration', () => {
    it('should coordinate all component loggers correctly', () => {
      // Arrange
      const correlationId = 'factory-integration-test';
      const sessionId = 'factory-session-123';

      // Act - Get all component loggers
      const loggers = {
        cli: ComponentLoggerFactory.getCLILogger(correlationId, sessionId),
        mcp: ComponentLoggerFactory.getMCPLogger(correlationId, sessionId),
        swarm: ComponentLoggerFactory.getSwarmLogger(correlationId, sessionId),
        core: ComponentLoggerFactory.getCoreLogger(correlationId, sessionId),
        terminal: ComponentLoggerFactory.getTerminalLogger(correlationId, sessionId),
        memory: ComponentLoggerFactory.getMemoryLogger(correlationId, sessionId),
        migration: ComponentLoggerFactory.getMigrationLogger(correlationId, sessionId),
        hooks: ComponentLoggerFactory.getHooksLogger(correlationId, sessionId),
        enterprise: ComponentLoggerFactory.getEnterpriseLogger(correlationId, sessionId),
      };

      // Test each logger
      Object.entries(loggers).forEach(([component, logger]) => {
        logger.info(`${component} component test`, {
          correlationId,
          sessionId,
          component: component.toUpperCase(),
        });
      });

      // Assert - Verify all loggers are working
      expect(console.log).toHaveBeenCalledTimes(8); // All except MCP (uses stderr)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('mcp component test'));

      // Verify usage analytics
      const analytics = ComponentLoggerFactory.getUsageAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics?.totalCalls).toBeGreaterThan(0);
    });

    it('should handle emergency mode coordination across all components', () => {
      // Arrange
      const correlationId = 'emergency-mode-test';

      // Act - Enable emergency mode
      ComponentLoggerFactory.enableEmergencyMode();

      // Test all component loggers during emergency mode
      const components: ComponentType[] = [
        'CLI',
        'MCP',
        'Core',
        'Swarm',
        'Terminal',
        'Memory',
        'Migration',
        'Hooks',
        'Enterprise',
      ];

      components.forEach((component) => {
        const logger = ComponentLoggerFactory.getLogger(component, correlationId);
        logger.debug('Debug message during emergency'); // Should be filtered
        logger.info('Info message during emergency'); // Should work
      });

      // Disable emergency mode
      ComponentLoggerFactory.disableEmergencyMode();

      // Test normal operation after emergency mode
      const cliLogger = ComponentLoggerFactory.getCLILogger(correlationId);
      cliLogger.debug('Debug message after emergency');

      // Assert - Verify emergency mode behavior
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Emergency mode enabled'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Emergency mode disabled'));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Debug message after emergency'),
      );
    });
  });
});
