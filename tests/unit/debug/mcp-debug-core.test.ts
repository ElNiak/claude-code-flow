/**
 * Core unit tests for MCP Debug Logger
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MCPDebugLogger } from '../../../src/mcp/debug-logger.js';
import { DebugLogger } from '../../../src/core/logger.js';
import type { MCPRequest, MCPResponse } from '../../../src/utils/types.js';

describe('MCP Debug Logger Core Functionality', () => {
  let debugLogger: MCPDebugLogger;
  let mockConsoleError: jest.SpyInstance;
  let stderrOutput: string[];

  beforeEach(() => {
    // Mock console.error to capture stderr output
    stderrOutput = [];
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation((message) => {
      stderrOutput.push(typeof message === 'string' ? message : JSON.stringify(message));
    });

    // Create a base logger for the debug logger
    const baseLogger = new DebugLogger({
      level: 'debug',
      format: 'json',
      destination: 'console',
    });

    // Create debug logger instance
    debugLogger = new MCPDebugLogger(
      {
        enableTracing: true,
        enableCrossSystemCorrelation: true,
        enableToolTracing: true,
        performanceThreshold: 0.1,
        traceRetentionTime: 60000,
        sanitizeSensitiveData: true,
      },
      baseLogger,
    );
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    if (debugLogger) {
      debugLogger.shutdown();
    }
  });

  describe('Protocol Message Tracing', () => {
    it('should trace inbound requests', () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'tools/list',
        params: {},
      };

      const correlationId = debugLogger.traceProtocolMessage('inbound', 'request', request);

      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      expect(stderrOutput.length).toBeGreaterThan(0);
    });

    it('should validate JSON-RPC compliance', () => {
      const validMessage = {
        jsonrpc: '2.0',
        id: 'test',
        method: 'test',
      };

      const invalidMessage = {
        jsonrpc: '1.0', // Invalid version
        id: 'test',
        method: 'test',
      };

      const validCorrelationId = debugLogger.traceProtocolMessage(
        'inbound',
        'request',
        validMessage as any,
      );

      const invalidCorrelationId = debugLogger.traceProtocolMessage(
        'inbound',
        'request',
        invalidMessage as any,
      );

      const validTrace = debugLogger.getProtocolTrace(validCorrelationId);
      const invalidTrace = debugLogger.getProtocolTrace(invalidCorrelationId);

      expect(validTrace?.protocol.compliance).toBe(true);
      expect(invalidTrace?.protocol.compliance).toBe(false);
    });

    it('should enforce stderr output for MCP compliance', () => {
      debugLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 'test',
        method: 'test',
      });

      expect(stderrOutput.length).toBeGreaterThan(0);
      const logEntry = JSON.parse(stderrOutput[0]);
      expect(logEntry.component).toBe('MCP');
      expect(logEntry.mcpCompliant).toBe(true);
      expect(logEntry.outputStream).toBe('stderr');
    });
  });

  describe('Tool Invocation Tracing', () => {
    it('should trace tool invocations with parameter sanitization', () => {
      const toolName = 'test/sensitive-tool';
      const parameters = {
        username: 'testuser',
        password: 'secret123',
        data: 'normal data',
      };

      const invocationId = debugLogger.traceToolInvocation(toolName, parameters);

      expect(invocationId).toBeDefined();

      const trace = debugLogger.getToolInvocationTrace(invocationId);
      expect(trace?.parameters.sanitized.password).toBe('[REDACTED]');
      expect(trace?.parameters.sanitized.username).toBe('testuser');
      expect(trace?.parameters.sanitized.data).toBe('normal data');
    });

    it('should complete tool invocations successfully', () => {
      const invocationId = debugLogger.traceToolInvocation('test/tool', { input: 'test' });

      const result = { output: 'success' };
      debugLogger.completeToolInvocation(invocationId, result);

      const trace = debugLogger.getToolInvocationTrace(invocationId);
      expect(trace?.execution.success).toBe(true);
      expect(trace?.execution.result).toEqual(result);
      expect(trace?.execution.duration).toBeGreaterThan(0);
    });

    it('should handle tool invocation errors', () => {
      const invocationId = debugLogger.traceToolInvocation('test/failing-tool', { input: 'test' });

      const error = new Error('Tool execution failed');
      debugLogger.completeToolInvocation(invocationId, undefined, error);

      const trace = debugLogger.getToolInvocationTrace(invocationId);
      expect(trace?.execution.success).toBe(false);
      expect(trace?.execution.error?.message).toBe('Tool execution failed');
    });
  });

  describe('Cross-System Correlation', () => {
    it('should create cross-system correlations', () => {
      const claudeFlowSessionId = 'cf-session-123';
      const metadata = {
        workflowId: 'workflow-456',
        taskId: 'task-789',
      };

      const correlationId = debugLogger.createCrossSystemCorrelation(
        claudeFlowSessionId,
        undefined,
        metadata,
      );

      expect(correlationId).toBeDefined();

      const correlation = debugLogger.getCrossSystemCorrelation(correlationId);
      expect(correlation?.claudeFlowSessionId).toBe(claudeFlowSessionId);
      expect(correlation?.initiatingSystem).toBe('claude-flow');
      expect(correlation?.metadata?.workflowId).toBe('workflow-456');
      expect(correlation?.status).toBe('active');
    });

    it('should link to claude-code sessions', () => {
      const correlationId = debugLogger.createCrossSystemCorrelation('cf-session-123');
      const claudeCodeSessionId = 'cc-session-456';
      const claudeCodeCorrelationId = 'cc-corr-789';

      const linked = debugLogger.linkToClaudeCode(
        correlationId,
        claudeCodeSessionId,
        claudeCodeCorrelationId,
      );

      expect(linked).toBe(true);

      const correlation = debugLogger.getCrossSystemCorrelation(correlationId);
      expect(correlation?.claudeCodeSessionId).toBe(claudeCodeSessionId);
      expect(correlation?.correlationChain).toContain(claudeCodeCorrelationId);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should provide comprehensive metrics', () => {
      // Perform some operations
      debugLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      });

      const invocationId = debugLogger.traceToolInvocation('test/tool', {});
      debugLogger.completeToolInvocation(invocationId, { success: true });

      debugLogger.createCrossSystemCorrelation('session-123');

      const metrics = debugLogger.getMetrics();
      expect(metrics.protocolCompliance.totalMessages).toBeGreaterThan(0);
      expect(metrics.toolInvocations.total).toBeGreaterThan(0);
      expect(metrics.correlation.crossSystemLinks).toBeGreaterThan(0);
      expect(metrics.performance.memoryUsage).toBeGreaterThan(0);
    });

    it('should track stderr usage compliance', () => {
      // Generate some debug messages
      for (let i = 0; i < 10; i++) {
        debugLogger.traceProtocolMessage('inbound', 'request', {
          jsonrpc: '2.0',
          id: i,
          method: 'test',
        });
      }

      const metrics = debugLogger.getMetrics();
      expect(metrics.protocolCompliance.stderrUsage).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should handle malformed messages gracefully', () => {
      const malformedMessage = {
        not: 'valid',
        jsonrpc: 'wrong',
      };

      expect(() => {
        const correlationId = debugLogger.traceProtocolMessage(
          'inbound',
          'request',
          malformedMessage as any,
        );

        const trace = debugLogger.getProtocolTrace(correlationId);
        expect(trace?.protocol.compliance).toBe(false);
      }).not.toThrow();
    });

    it('should handle invalid tool invocations gracefully', () => {
      expect(() => {
        debugLogger.traceToolInvocation('', null as any);
        debugLogger.completeToolInvocation('invalid-id', {});
        debugLogger.linkToClaudeCode('invalid', 'invalid');
      }).not.toThrow();
    });

    it('should cleanup properly on shutdown', () => {
      // Create some traces
      debugLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: 'test',
        method: 'test',
      });

      debugLogger.createCrossSystemCorrelation('session-123');

      // Shutdown should not throw
      expect(() => {
        debugLogger.shutdown();
      }).not.toThrow();
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive parameters', () => {
      const sensitiveParams = {
        username: 'admin',
        password: 'super-secret',
        apiKey: 'key-123',
        token: 'bearer-token',
        secret: 'confidential',
        auth: 'auth-header',
        credential: 'cred-data',
        normalData: 'visible',
      };

      const invocationId = debugLogger.traceToolInvocation('test/sensitive', sensitiveParams);

      const trace = debugLogger.getToolInvocationTrace(invocationId);
      const sanitized = trace?.parameters.sanitized;

      expect(sanitized?.password).toBe('[REDACTED]');
      expect(sanitized?.apiKey).toBe('[REDACTED]');
      expect(sanitized?.token).toBe('[REDACTED]');
      expect(sanitized?.secret).toBe('[REDACTED]');
      expect(sanitized?.auth).toBe('[REDACTED]');
      expect(sanitized?.credential).toBe('[REDACTED]');
      expect(sanitized?.normalData).toBe('visible');
      expect(sanitized?.username).toBe('admin'); // username is not considered sensitive
    });
  });
});
