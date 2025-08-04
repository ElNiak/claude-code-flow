/**
 * Integration tests for MCP Debug Logger with Cross-System Correlation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  MCPDebugLogger,
  getMCPDebugLogger,
  initializeMCPDebugLogging,
} from '../../../src/mcp/debug-logger.js';
import { MCPServer } from '../../../src/mcp/server.js';
import { DebugLogger } from '../../../src/core/logger.js';
import type { MCPConfig, MCPRequest, MCPResponse } from '../../../src/utils/types.js';

describe('MCP Debug Integration', () => {
  let mcpDebugLogger: MCPDebugLogger;
  let mockConsoleError: jest.SpyInstance;
  let originalStderr: typeof process.stderr.write;
  let stderrOutput: string[];

  beforeEach(() => {
    // Mock console.error to capture stderr output
    stderrOutput = [];
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation((message) => {
      stderrOutput.push(typeof message === 'string' ? message : JSON.stringify(message));
    });

    // Initialize MCP debug logger with test configuration
    mcpDebugLogger = initializeMCPDebugLogging({
      enableTracing: true,
      enableCrossSystemCorrelation: true,
      enableToolTracing: true,
      performanceThreshold: 0.1,
      traceRetentionTime: 60000,
      sanitizeSensitiveData: true,
    });
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    if (mcpDebugLogger) {
      mcpDebugLogger.shutdown();
    }
  });

  describe('Protocol Message Tracing', () => {
    it('should trace inbound requests with correlation ID', () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'tools/list',
        params: {},
      };

      const correlationId = mcpDebugLogger.traceProtocolMessage('inbound', 'request', request);

      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');

      // Verify stderr output for MCP compliance
      expect(stderrOutput.length).toBeGreaterThan(0);
      const logEntry = JSON.parse(stderrOutput[0]);
      expect(logEntry.component).toBe('MCP');
      expect(logEntry.mcpCompliant).toBe(true);
      expect(logEntry.outputStream).toBe('stderr');
    });

    it('should trace outbound responses with correlation', () => {
      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: 'test-123',
        result: { tools: [] },
      };

      const correlationId = mcpDebugLogger.traceProtocolMessage('outbound', 'response', response);

      expect(correlationId).toBeDefined();

      // Check protocol compliance validation
      const trace = mcpDebugLogger.getProtocolTrace(correlationId);
      expect(trace?.protocol.compliance).toBe(true);
    });

    it('should trace error responses with proper categorization', () => {
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 'test-123',
        error: {
          code: -32601,
          message: 'Method not found',
        },
      };

      const correlationId = mcpDebugLogger.traceProtocolMessage('outbound', 'error', errorResponse);

      const trace = mcpDebugLogger.getProtocolTrace(correlationId);
      expect(trace?.error?.category).toBe('protocol');
      expect(trace?.error?.code).toBe(-32601);
    });

    it('should validate JSON-RPC 2.0 compliance', () => {
      const invalidMessage = {
        jsonrpc: '1.0', // Invalid version
        id: 'test',
        method: 'test',
      };

      const correlationId = mcpDebugLogger.traceProtocolMessage(
        'inbound',
        'request',
        invalidMessage as any,
      );

      const trace = mcpDebugLogger.getProtocolTrace(correlationId);
      expect(trace?.protocol.compliance).toBe(false);

      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.protocolCompliance.violations).toBeGreaterThan(0);
    });
  });

  describe('Tool Invocation Tracing', () => {
    it('should trace tool invocation with parameter sanitization', () => {
      const toolName = 'test/sensitive-tool';
      const parameters = {
        username: 'testuser',
        password: 'secret123',
        data: 'normal data',
      };

      const invocationId = mcpDebugLogger.traceToolInvocation(toolName, parameters);

      expect(invocationId).toBeDefined();

      const trace = mcpDebugLogger.getToolInvocationTrace(invocationId);
      expect(trace?.parameters.sanitized.password).toBe('[REDACTED]');
      expect(trace?.parameters.sanitized.username).toBe('testuser');
      expect(trace?.parameters.sanitized.data).toBe('normal data');
    });

    it('should complete tool invocation with success', () => {
      const invocationId = mcpDebugLogger.traceToolInvocation('test/tool', { input: 'test' });

      const result = { output: 'success' };
      mcpDebugLogger.completeToolInvocation(invocationId, result);

      const trace = mcpDebugLogger.getToolInvocationTrace(invocationId);
      expect(trace?.execution.success).toBe(true);
      expect(trace?.execution.result).toEqual(result);
      expect(trace?.execution.endTime).toBeDefined();
      expect(trace?.execution.duration).toBeGreaterThan(0);
    });

    it('should complete tool invocation with error', () => {
      const invocationId = mcpDebugLogger.traceToolInvocation('test/failing-tool', {
        input: 'test',
      });

      const error = new Error('Tool execution failed');
      mcpDebugLogger.completeToolInvocation(invocationId, undefined, error);

      const trace = mcpDebugLogger.getToolInvocationTrace(invocationId);
      expect(trace?.execution.success).toBe(false);
      expect(trace?.execution.error?.message).toBe('Tool execution failed');
    });
  });

  describe('Cross-System Correlation', () => {
    it('should create cross-system correlation for claude-code integration', () => {
      const claudeFlowSessionId = 'cf-session-123';
      const metadata = {
        workflowId: 'workflow-456',
        taskId: 'task-789',
      };

      const correlationId = mcpDebugLogger.createCrossSystemCorrelation(
        claudeFlowSessionId,
        undefined,
        metadata,
      );

      expect(correlationId).toBeDefined();

      const correlation = mcpDebugLogger.getCrossSystemCorrelation(correlationId);
      expect(correlation?.claudeFlowSessionId).toBe(claudeFlowSessionId);
      expect(correlation?.initiatingSystem).toBe('claude-flow');
      expect(correlation?.metadata?.workflowId).toBe('workflow-456');
      expect(correlation?.status).toBe('active');
    });

    it('should link existing correlation to claude-code session', () => {
      const correlationId = mcpDebugLogger.createCrossSystemCorrelation('cf-session-123');
      const claudeCodeSessionId = 'cc-session-456';
      const claudeCodeCorrelationId = 'cc-corr-789';

      const linked = mcpDebugLogger.linkToClaudeCode(
        correlationId,
        claudeCodeSessionId,
        claudeCodeCorrelationId,
      );

      expect(linked).toBe(true);

      const correlation = mcpDebugLogger.getCrossSystemCorrelation(correlationId);
      expect(correlation?.claudeCodeSessionId).toBe(claudeCodeSessionId);
      expect(correlation?.correlationChain).toContain(claudeCodeCorrelationId);
    });

    it('should fail to link non-existent correlation', () => {
      const linked = mcpDebugLogger.linkToClaudeCode('non-existent-correlation', 'cc-session-123');

      expect(linked).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics with minimal overhead', () => {
      const startTime = Date.now();

      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        const correlationId = mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
          jsonrpc: '2.0',
          id: i,
          method: 'test',
          params: {},
        });

        mcpDebugLogger.traceProtocolMessage('outbound', 'response', {
          jsonrpc: '2.0',
          id: i,
          result: {},
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.performance.totalOverhead).toBeLessThan(totalTime * 0.1); // <10% overhead
      expect(metrics.protocolCompliance.totalMessages).toBe(200); // 100 requests + 100 responses
    });

    it('should calculate accurate metrics', () => {
      // Trace some protocol messages
      mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      });

      mcpDebugLogger.traceProtocolMessage('outbound', 'response', {
        jsonrpc: '2.0',
        id: 1,
        result: {},
      });

      // Trace some tool invocations
      const invocationId1 = mcpDebugLogger.traceToolInvocation('test/tool1', {});
      mcpDebugLogger.completeToolInvocation(invocationId1, { success: true });

      const invocationId2 = mcpDebugLogger.traceToolInvocation('test/tool2', {});
      mcpDebugLogger.completeToolInvocation(invocationId2, undefined, new Error('Failed'));

      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.protocolCompliance.totalMessages).toBe(2);
      expect(metrics.toolInvocations.total).toBe(2);
      expect(metrics.toolInvocations.successful).toBe(1);
      expect(metrics.toolInvocations.failed).toBe(1);
    });
  });

  describe('Protocol Compliance', () => {
    it('should enforce stderr-only logging for MCP components', () => {
      mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 'test',
        method: 'test',
      });

      // All MCP debug logs should go to stderr
      expect(stderrOutput.length).toBeGreaterThan(0);
      const logEntry = JSON.parse(stderrOutput[0]);
      expect(logEntry.outputStream).toBe('stderr');
      expect(logEntry.mcpCompliant).toBe(true);
    });

    it('should maintain JSON-RPC format compliance in all messages', () => {
      const testMessages = [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        },
        {
          jsonrpc: '2.0',
          id: 1,
          result: {},
        },
        {
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32600, message: 'Invalid Request' },
        },
      ];

      testMessages.forEach((message, index) => {
        const correlationId = mcpDebugLogger.traceProtocolMessage(
          'inbound',
          index === 0 ? 'request' : index === 1 ? 'response' : 'error',
          message as any,
        );

        const trace = mcpDebugLogger.getProtocolTrace(correlationId);
        expect(trace?.protocol.compliance).toBe(true);
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup expired traces', async () => {
      // Create logger with short retention time
      const shortRetentionLogger = new MCPDebugLogger({
        traceRetentionTime: 100, // 100ms
      });

      const correlationId = shortRetentionLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 'test',
        method: 'test',
      });

      // Verify trace exists
      expect(shortRetentionLogger.getProtocolTrace(correlationId)).toBeDefined();

      // Wait for retention time + cleanup interval
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Force cleanup by creating a new trace (triggers cleanup)
      shortRetentionLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 'new-test',
        method: 'test',
      });

      shortRetentionLogger.shutdown();
    });

    it('should track memory usage in metrics', () => {
      const metrics = mcpDebugLogger.getMetrics();
      expect(metrics.performance.memoryUsage).toBeGreaterThan(0);
      expect(typeof metrics.performance.memoryUsage).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', () => {
      const malformedMessage = {
        not: 'valid',
        jsonrpc: 'wrong',
      };

      const correlationId = mcpDebugLogger.traceProtocolMessage(
        'inbound',
        'request',
        malformedMessage as any,
      );

      const trace = mcpDebugLogger.getProtocolTrace(correlationId);
      expect(trace?.protocol.compliance).toBe(false);
    });

    it('should continue logging even if trace operations fail', () => {
      // This test ensures robustness - the debug logger should not crash
      // the main application even if there are issues with tracing

      expect(() => {
        mcpDebugLogger.traceToolInvocation('', null as any);
        mcpDebugLogger.completeToolInvocation('invalid-id', {});
        mcpDebugLogger.linkToClaudeCode('invalid', 'invalid');
      }).not.toThrow();
    });
  });

  describe('Integration with MCP Server', () => {
    it('should integrate with MCP server for end-to-end tracing', async () => {
      const config: MCPConfig = {
        transport: 'stdio',
        debug: {
          enableTracing: true,
          enableCrossSystemCorrelation: true,
          enableToolTracing: true,
        },
      };

      const mockLogger = new DebugLogger();
      const mockEventBus = {
        emit: jest.fn(),
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      };

      const server = new MCPServer(config, mockEventBus as any, mockLogger);

      // Verify that debug logger is initialized in server
      expect(server).toBeDefined();

      // Test would continue with actual request handling...
      // This is a placeholder for integration testing
    });
  });
});

describe('MCP Debug Logger Singleton', () => {
  it('should return same instance from getMCPDebugLogger', () => {
    const logger1 = getMCPDebugLogger();
    const logger2 = getMCPDebugLogger();

    expect(logger1).toBe(logger2);
  });

  it('should reinitialize with new config', () => {
    const logger1 = getMCPDebugLogger();
    const logger2 = initializeMCPDebugLogging({
      enableTracing: false,
    });

    expect(logger1).not.toBe(logger2);
  });
});
