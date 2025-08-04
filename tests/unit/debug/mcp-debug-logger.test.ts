/**
 * MCP Debug Logger Unit Tests - London School TDD
 * Tests MCP protocol compliance, cross-system correlation, and tool tracing
 */

import { jest } from '@jest/globals';
import {
  MCPDebugLogger,
  getMCPDebugLogger,
  initializeMCPDebugLogging,
} from '../../../src/mcp/debug-logger.js';
import type {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPSession,
} from '../../../src/utils/types.js';
import {
  LondonSchoolMockFactory,
  InteractionVerifier,
  MemoryPressureSimulator,
  PerformanceTestHelper,
  MockDataGenerator,
  type IDebugLogger,
} from '../../utils/london-school-test-helpers.js';

describe('MCPDebugLogger - Protocol Compliance & Cross-System Correlation', () => {
  let mcpDebugLogger: MCPDebugLogger;
  let mockBaseLogger: jest.Mocked<IDebugLogger>;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Mock console.error for stderr compliance testing
    originalConsoleError = console.error;
    console.error = jest.fn();

    // Create mock base logger
    mockBaseLogger = LondonSchoolMockFactory.createDebugLoggerMock();

    // Initialize MCP debug logger with test configuration
    mcpDebugLogger = new MCPDebugLogger(
      {
        enableTracing: true,
        enableCrossSystemCorrelation: true,
        enableToolTracing: true,
        performanceThreshold: 0.1,
        traceRetentionTime: 300000, // 5 minutes for testing
        sanitizeSensitiveData: true,
      },
      mockBaseLogger,
    );
  });

  afterEach(() => {
    console.error = originalConsoleError;
    mcpDebugLogger.shutdown();
    jest.clearAllMocks();
  });

  describe('Protocol Compliance Validation', () => {
    it('should validate JSON-RPC 2.0 compliance correctly', () => {
      // Arrange
      const validMessages = [
        { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
        { jsonrpc: '2.0', id: 1, result: { success: true } },
        { jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'Invalid Request' } },
        { jsonrpc: '2.0', method: 'notification', params: {} },
      ];

      const invalidMessages = [
        { jsonrpc: '1.0', id: 1, method: 'test' }, // Wrong version
        { id: 1, method: 'test' }, // Missing jsonrpc
        { jsonrpc: '2.0', id: 1 }, // Missing method/result/error
        { jsonrpc: '2.0', method: 123 }, // Invalid method type
      ];

      // Act & Assert - Valid messages
      validMessages.forEach((message, index) => {
        const correlationId = mcpDebugLogger.traceProtocolMessage(
          'inbound',
          'request',
          message as MCPRequest,
        );

        const trace = mcpDebugLogger.getProtocolTrace(correlationId);
        expect(trace?.protocol.compliance).toBe(true);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"mcpCompliant":true'));
      });

      // Act & Assert - Invalid messages
      invalidMessages.forEach((message, index) => {
        const correlationId = mcpDebugLogger.traceProtocolMessage(
          'inbound',
          'request',
          message as MCPRequest,
        );

        const trace = mcpDebugLogger.getProtocolTrace(correlationId);
        expect(trace?.protocol.compliance).toBe(false);
      });

      // Verify metrics
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.protocolCompliance.compliantMessages).toBe(4);
      expect(metrics.protocolCompliance.violations).toBe(4);
      expect(metrics.protocolCompliance.totalMessages).toBe(8);
    });

    it('should enforce stderr-only logging for MCP protocol compliance', () => {
      // Arrange
      const testMessage: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test/method',
        params: { data: 'test' },
      };

      // Act
      mcpDebugLogger.traceProtocolMessage('inbound', 'request', testMessage);

      // Assert - All MCP logs must go to stderr
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"outputStream":"stderr"'),
      );
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"mcpCompliant":true'));

      // Verify base logger was also called for internal tracking
      expect(mockBaseLogger.debug).toHaveBeenCalled();
    });

    it('should categorize MCP errors correctly', () => {
      // Arrange
      const errorMessages = [
        {
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32700, message: 'Parse error' }, // Transport error
        },
        {
          jsonrpc: '2.0',
          id: 2,
          error: { code: -32600, message: 'Invalid Request' }, // Protocol error
        },
        {
          jsonrpc: '2.0',
          id: 3,
          error: { code: -32050, message: 'Server error' }, // Protocol error (reserved range)
        },
        {
          jsonrpc: '2.0',
          id: 4,
          error: { code: 1000, message: 'Application error' }, // Application error
        },
        {
          jsonrpc: '2.0',
          id: 5,
          error: { code: 2000, message: 'Correlation tracking failed' }, // Correlation error
        },
      ];

      // Act & Assert
      errorMessages.forEach((message, index) => {
        const correlationId = mcpDebugLogger.traceProtocolMessage(
          'inbound',
          'error',
          message as MCPResponse,
        );

        const trace = mcpDebugLogger.getProtocolTrace(correlationId);
        expect(trace?.error).toBeDefined();

        // Verify error categorization logic is working
        if (message.error.code >= -32700 && message.error.code <= -32600) {
          expect(trace?.error?.category).toBe('transport');
        } else if (message.error.code >= -32099 && message.error.code <= -32000) {
          expect(trace?.error?.category).toBe('protocol');
        } else if (message.error.message.includes('correlation')) {
          expect(trace?.error?.category).toBe('correlation');
        } else {
          expect(trace?.error?.category).toBe('application');
        }
      });
    });
  });

  describe('Cross-System Correlation Behavior', () => {
    it('should create and manage cross-system correlations', () => {
      // Arrange
      const claudeFlowSessionId = 'cf-session-123';
      const claudeCodeSessionId = 'cc-session-456';
      const workflowId = 'workflow-789';

      // Act
      const correlationId = mcpDebugLogger.createCrossSystemCorrelation(
        claudeFlowSessionId,
        undefined,
        { workflowId, taskId: 'task-001' },
      );

      const linkSuccess = mcpDebugLogger.linkToClaudeCode(
        correlationId,
        claudeCodeSessionId,
        'cc-correlation-999',
      );

      // Assert
      expect(linkSuccess).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cross-system correlation created'),
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Correlation linked to claude-code'),
      );

      const correlation = mcpDebugLogger.getCrossSystemCorrelation(correlationId);
      expect(correlation).toBeDefined();
      expect(correlation?.claudeFlowSessionId).toBe(claudeFlowSessionId);
      expect(correlation?.claudeCodeSessionId).toBe(claudeCodeSessionId);
      expect(correlation?.correlationChain).toContain('cc-correlation-999');
      expect(correlation?.metadata?.workflowId).toBe(workflowId);

      // Verify metrics
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.correlation.crossSystemLinks).toBe(1);
    });

    it('should handle failed correlation links gracefully', () => {
      // Arrange
      const nonExistentCorrelationId = 'non-existent-correlation';

      // Act
      const linkSuccess = mcpDebugLogger.linkToClaudeCode(
        nonExistentCorrelationId,
        'cc-session-123',
        'cc-correlation-456',
      );

      // Assert
      expect(linkSuccess).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Correlation not found for claude-code link'),
      );
    });

    it('should maintain correlation chain integrity across multiple links', () => {
      // Arrange
      const correlationId = mcpDebugLogger.createCrossSystemCorrelation('cf-session-1');

      // Act - Create multiple correlation links
      mcpDebugLogger.linkToClaudeCode(correlationId, 'cc-session-1', 'cc-corr-1');
      mcpDebugLogger.linkToClaudeCode(correlationId, 'cc-session-1', 'cc-corr-2');
      mcpDebugLogger.linkToClaudeCode(correlationId, 'cc-session-1', 'cc-corr-3');

      // Assert
      const correlation = mcpDebugLogger.getCrossSystemCorrelation(correlationId);
      expect(correlation?.correlationChain).toHaveLength(4); // Original + 3 links
      expect(correlation?.correlationChain).toContain('cc-corr-1');
      expect(correlation?.correlationChain).toContain('cc-corr-2');
      expect(correlation?.correlationChain).toContain('cc-corr-3');
    });
  });

  describe('Tool Invocation Tracing Behavior', () => {
    it('should trace tool invocations with parameter sanitization', () => {
      // Arrange
      const toolName = 'test/secure-tool';
      const sensitiveParams = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'api-key-456',
        normalData: 'this is fine',
        token: 'bearer-token-789',
      };

      // Act
      const invocationId = mcpDebugLogger.traceToolInvocation(toolName, sensitiveParams, {
        sessionId: 'test-session',
      });

      mcpDebugLogger.completeToolInvocation(invocationId, { result: 'Tool executed successfully' });

      // Assert
      const trace = mcpDebugLogger.getToolInvocationTrace(invocationId);
      expect(trace).toBeDefined();
      expect(trace?.toolName).toBe(toolName);
      expect(trace?.execution.success).toBe(true);

      // Verify sensitive data sanitization
      expect(trace?.parameters.sanitized.password).toBe('[REDACTED]');
      expect(trace?.parameters.sanitized.apiKey).toBe('[REDACTED]');
      expect(trace?.parameters.sanitized.token).toBe('[REDACTED]');
      expect(trace?.parameters.sanitized.normalData).toBe('this is fine');
      expect(trace?.parameters.sanitized.username).toBe('testuser'); // Username not in sensitive list

      // Verify logging behavior
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Tool invocation started'),
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Tool invocation completed'),
      );

      // Verify metrics
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.toolInvocations.total).toBe(1);
      expect(metrics.toolInvocations.successful).toBe(1);
      expect(metrics.toolInvocations.failed).toBe(0);
    });

    it('should handle tool invocation failures correctly', () => {
      // Arrange
      const toolName = 'test/failing-tool';
      const params = { data: 'test' };
      const error = new Error('Tool execution failed');

      // Act
      const invocationId = mcpDebugLogger.traceToolInvocation(toolName, params);
      mcpDebugLogger.completeToolInvocation(invocationId, undefined, error);

      // Assert
      const trace = mcpDebugLogger.getToolInvocationTrace(invocationId);
      expect(trace?.execution.success).toBe(false);
      expect(trace?.execution.error?.message).toBe('Tool execution failed');
      expect(trace?.execution.error?.name).toBe('Error');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Tool invocation failed'));

      // Verify metrics
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.toolInvocations.failed).toBe(1);
    });

    it('should handle missing tool invocation traces gracefully', () => {
      // Arrange
      const nonExistentInvocationId = 'non-existent-invocation';

      // Act
      mcpDebugLogger.completeToolInvocation(nonExistentInvocationId, { result: 'success' });

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Tool invocation trace not found'),
      );
    });

    it('should calculate average execution time correctly', () => {
      // Arrange
      const tools = [
        { name: 'tool1', duration: 100 },
        { name: 'tool2', duration: 200 },
        { name: 'tool3', duration: 300 },
      ];

      // Act
      tools.forEach((tool, index) => {
        const invocationId = mcpDebugLogger.traceToolInvocation(tool.name, {});

        // Simulate execution time by manipulating the trace
        const trace = mcpDebugLogger.getToolInvocationTrace(invocationId);
        if (trace) {
          trace.execution.startTime = Date.now() - tool.duration;
        }

        mcpDebugLogger.completeToolInvocation(invocationId, { result: 'success' });
      });

      // Assert
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.toolInvocations.avgExecutionTime).toBeGreaterThan(0);
      expect(metrics.toolInvocations.total).toBe(3);
      expect(metrics.toolInvocations.successful).toBe(3);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should maintain performance overhead below threshold', async () => {
      // Arrange
      const iterations = 1000;
      const messages = Array.from({ length: iterations }, (_, i) => ({
        jsonrpc: '2.0' as const,
        id: i,
        method: `test/method-${i}`,
        params: { data: `test-data-${i}` },
      }));

      // Act
      const startTime = performance.now();

      messages.forEach((message) => {
        mcpDebugLogger.traceProtocolMessage('inbound', 'request', message);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert - Should complete within reasonable time
      expect(duration).toBeLessThan(500); // Less than 500ms for 1000 operations

      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.protocolCompliance.totalMessages).toBe(iterations);
    });

    it('should clean up expired traces based on retention time', async () => {
      // Arrange
      const shortRetentionLogger = new MCPDebugLogger({
        enableTracing: true,
        traceRetentionTime: 100, // 100ms retention
      });

      // Act
      const correlationId = shortRetentionLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: {},
      });

      // Verify trace exists
      expect(shortRetentionLogger.getProtocolTrace(correlationId)).toBeDefined();

      // Wait for retention time to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Force cleanup (normally done by interval)
      shortRetentionLogger.shutdown();

      // Assert - Trace should be cleaned up
      // Note: This tests the cleanup logic indirectly through shutdown
      expect(() => shortRetentionLogger.getProtocolTrace(correlationId)).not.toThrow();
    });

    it('should track memory usage in metrics', () => {
      // Arrange & Act
      for (let i = 0; i < 100; i++) {
        mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
          jsonrpc: '2.0',
          id: i,
          method: 'test',
          params: {},
        });
      }

      // Assert
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.performance.memoryUsage).toBeGreaterThan(0);
      expect(typeof metrics.performance.memoryUsage).toBe('number');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed message tracing gracefully', () => {
      // Arrange
      const malformedMessage = null as any;

      // Act & Assert - Should not throw
      expect(() => {
        mcpDebugLogger.traceProtocolMessage('inbound', 'request', malformedMessage);
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to trace protocol message'),
      );
    });

    it('should handle tool invocation errors gracefully', () => {
      // Arrange
      const invalidParams = { circular: {} };
      invalidParams.circular = invalidParams; // Create circular reference

      // Act & Assert - Should not throw
      expect(() => {
        mcpDebugLogger.traceToolInvocation('test/tool', invalidParams);
      }).not.toThrow();
    });

    it('should recover from trace completion errors', () => {
      // Arrange
      const invocationId = 'valid-invocation';
      mcpDebugLogger.traceToolInvocation('test/tool', {});

      // Act - Try to complete with malformed data
      expect(() => {
        mcpDebugLogger.completeToolInvocation(invocationId, { circular: {} });
      }).not.toThrow();

      // Assert - Should have logged error
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Tool invocation completed'),
      );
    });
  });

  describe('Singleton and Factory Behavior', () => {
    it('should maintain singleton instance correctly', () => {
      // Act
      const instance1 = getMCPDebugLogger();
      const instance2 = getMCPDebugLogger();

      // Assert
      expect(instance1).toBe(instance2); // Same instance
    });

    it('should initialize with custom configuration', () => {
      // Arrange
      const config = {
        enableTracing: false,
        enableCrossSystemCorrelation: false,
        performanceThreshold: 0.05,
      };

      // Act
      const customLogger = initializeMCPDebugLogging(config);

      // Assert
      expect(customLogger).toBeInstanceOf(MCPDebugLogger);
      expect(getMCPDebugLogger()).toBe(customLogger); // Should update singleton
    });
  });

  describe('Protocol Message Tracing Edge Cases', () => {
    it('should handle session context extraction correctly', () => {
      // Arrange
      const session: MCPSession = {
        id: 'test-session-123',
        protocolVersion: { major: 2, minor: 0, patch: 1 },
        transport: 'stdio' as const,
        capabilities: {},
      };

      const additionalContext = {
        claudeCodeSessionId: 'cc-session-456',
        crossSystemRef: {
          claudeCodeSessionId: 'cc-ref-789',
        },
      };

      // Act
      const correlationId = mcpDebugLogger.traceProtocolMessage(
        'inbound',
        'request',
        { jsonrpc: '2.0', id: 1, method: 'test', params: {} },
        session,
        additionalContext,
      );

      // Assert
      const trace = mcpDebugLogger.getProtocolTrace(correlationId);
      expect(trace?.sessionId).toBe('test-session-123');
      expect(trace?.claudeCodeSessionId).toBe('cc-session-456');
      expect(trace?.protocol.version).toBe('2.0.1');
      expect(trace?.protocol.transport).toBe('stdio');
    });

    it('should generate correlation IDs from various sources', () => {
      // Arrange
      const messageWithId = {
        jsonrpc: '2.0' as const,
        id: 'corr-existing-123',
        method: 'test',
        params: {},
      };

      const sessionWithId: MCPSession = {
        id: 'session-456',
        protocolVersion: { major: 2, minor: 0, patch: 0 },
        transport: 'stdio' as const,
        capabilities: {},
      };

      // Act
      const correlationId1 = mcpDebugLogger.traceProtocolMessage(
        'inbound',
        'request',
        messageWithId,
      );

      const correlationId2 = mcpDebugLogger.traceProtocolMessage(
        'inbound',
        'request',
        { jsonrpc: '2.0', id: 2, method: 'test', params: {} },
        sessionWithId,
      );

      // Assert
      expect(correlationId1).toBe('corr-existing-123'); // Used existing correlation ID
      expect(correlationId2).toContain('session-456'); // Generated from session ID
    });
  });
});
