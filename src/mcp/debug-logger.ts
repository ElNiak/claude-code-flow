/**
 * MCP Protocol-Aware Debug Logger with Cross-System Correlation
 *
 * This module provides:
 * - Stderr-only logging for MCP protocol compliance
 * - Cross-system correlation between claude-flow and claude-code
 * - Tool invocation parameter tracing
 * - Protocol error correlation
 * - JSON-RPC format compliance
 * - Performance monitoring with minimal overhead
 */

import {
  ComponentLoggerFactory,
  IDebugLogger,
  DebugMeta,
  generateCorrelationId,
} from '../core/logger.js';
import type {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPContext,
  MCPSession,
} from '../utils/types.js';
import type { ILogger } from '../core/logger.js';

export interface MCPProtocolTrace {
  correlationId: string;
  sessionId?: string;
  claudeCodeSessionId?: string; // Cross-system correlation
  requestId?: string | number;
  method?: string;
  direction: 'inbound' | 'outbound';
  messageType: 'request' | 'response' | 'notification' | 'error';
  timestamp: number;
  performance?: {
    startTime: number;
    duration?: number;
    overhead?: number;
  };
  protocol: {
    version: string;
    transport: 'stdio' | 'http' | 'websocket';
    compliance: boolean;
  };
  payload?: {
    size: number;
    hash?: string;
    sanitized?: any; // Sanitized for logging
  };
  error?: {
    code: number;
    message: string;
    stack?: string;
    category: 'protocol' | 'transport' | 'application' | 'correlation';
  };
}

export interface ToolInvocationTrace {
  correlationId: string;
  sessionId?: string;
  toolName: string;
  invocationId: string;
  parameters: {
    schema: any;
    provided: any;
    sanitized: any; // Sensitive data removed
    validation: {
      valid: boolean;
      errors?: string[];
    };
  };
  execution: {
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    result?: any;
    error?: any;
  };
  context?: MCPContext;
  crossSystemRef?: {
    claudeCodeCorrelationId?: string;
    originatingSystem: 'claude-flow' | 'claude-code';
  };
}

export interface CrossSystemCorrelation {
  claudeFlowSessionId: string;
  claudeCodeSessionId?: string;
  correlationChain: string[]; // Trace of correlation IDs
  initiatingSystem: 'claude-flow' | 'claude-code';
  timestamp: number;
  status: 'active' | 'completed' | 'failed' | 'timeout';
  metadata?: {
    workflowId?: string;
    taskId?: string;
    agentId?: string;
  };
}

export interface MCPDebugMetrics {
  protocolCompliance: {
    totalMessages: number;
    compliantMessages: number;
    violations: number;
    stderrUsage: number;
  };
  correlation: {
    activeSessions: number;
    crossSystemLinks: number;
    orphanedRequests: number;
    avgCorrelationTime: number;
  };
  toolInvocations: {
    total: number;
    successful: number;
    failed: number;
    avgExecutionTime: number;
  };
  performance: {
    totalOverhead: number;
    avgLogProcessingTime: number;
    memoryUsage: number;
  };
}

/**
 * MCP Protocol Debug Logger with Cross-System Correlation
 */
export class MCPDebugLogger {
  private baseLogger: IDebugLogger;
  private protocolTraces: Map<string, MCPProtocolTrace> = new Map();
  private toolInvocations: Map<string, ToolInvocationTrace> = new Map();
  private crossSystemCorrelations: Map<string, CrossSystemCorrelation> = new Map();
  private correlationCleanupInterval?: NodeJS.Timeout;
  private metrics: MCPDebugMetrics;
  private performanceEnabled: boolean;

  constructor(
    private config: {
      enableTracing?: boolean;
      enableCrossSystemCorrelation?: boolean;
      enableToolTracing?: boolean;
      performanceThreshold?: number; // max 10% overhead
      traceRetentionTime?: number; // ms
      sanitizeSensitiveData?: boolean;
    } = {},
    baseLogger?: IDebugLogger,
  ) {
    this.baseLogger = baseLogger || ComponentLoggerFactory.getMCPLogger();
    this.performanceEnabled = true;

    // Initialize metrics
    this.metrics = {
      protocolCompliance: {
        totalMessages: 0,
        compliantMessages: 0,
        violations: 0,
        stderrUsage: 0,
      },
      correlation: {
        activeSessions: 0,
        crossSystemLinks: 0,
        orphanedRequests: 0,
        avgCorrelationTime: 0,
      },
      toolInvocations: {
        total: 0,
        successful: 0,
        failed: 0,
        avgExecutionTime: 0,
      },
      performance: {
        totalOverhead: 0,
        avgLogProcessingTime: 0,
        memoryUsage: 0,
      },
    };

    // Start cleanup interval for trace retention
    this.startCleanupInterval();

    this.logProtocolCompliantMessage('debug', 'MCP Debug Logger initialized', {
      config: this.config,
      stderrCompliance: true,
    });
  }

  /**
   * Log MCP protocol message with full tracing
   */
  traceProtocolMessage(
    direction: 'inbound' | 'outbound',
    messageType: 'request' | 'response' | 'notification' | 'error',
    message: MCPRequest | MCPResponse | MCPNotification,
    session?: MCPSession,
    additionalContext?: any,
  ): string {
    const startTime = this.performanceEnabled ? performance.now() : 0;
    const correlationId = this.extractOrGenerateCorrelationId(message, session);

    try {
      const trace: MCPProtocolTrace = {
        correlationId,
        sessionId: session?.id,
        claudeCodeSessionId: this.extractClaudeCodeSessionId(additionalContext),
        requestId: 'id' in message ? message.id : undefined,
        method: 'method' in message ? message.method : undefined,
        direction,
        messageType,
        timestamp: Date.now(),
        performance: {
          startTime,
        },
        protocol: {
          version: session?.protocolVersion
            ? `${session.protocolVersion.major}.${session.protocolVersion.minor}.${session.protocolVersion.patch}`
            : 'unknown',
          transport: session?.transport || 'stdio',
          compliance: this.validateProtocolCompliance(message),
        },
        payload: this.createPayloadSummary(message),
      };

      // Add error details if this is an error message
      if (messageType === 'error' && 'error' in message && message.error) {
        trace.error = {
          code: message.error.code,
          message: message.error.message,
          category: this.categorizeError(message.error),
        };
      }

      // Store trace
      this.protocolTraces.set(correlationId, trace);

      // Update correlation if cross-system reference exists
      this.updateCrossSystemCorrelation(correlationId, trace, additionalContext);

      // Log with stderr compliance
      this.logProtocolCompliantMessage(
        'debug',
        `MCP ${direction} ${messageType}: ${trace.method || 'unknown'}`,
        {
          correlationId,
          sessionId: trace.sessionId,
          requestId: trace.requestId,
          protocolVersion: trace.protocol.version,
          transport: trace.protocol.transport,
          compliance: trace.protocol.compliance,
          payloadSize: trace.payload?.size,
          claudeCodeRef: trace.claudeCodeSessionId,
        },
      );

      // Update metrics
      this.updateProtocolMetrics(trace);

      const endTime = this.performanceEnabled ? performance.now() : startTime;
      trace.performance!.duration = endTime - startTime;
      trace.performance!.overhead = this.calculateOverhead(trace.performance!.duration);

      return correlationId;
    } catch (error) {
      this.logProtocolCompliantMessage('error', 'Failed to trace protocol message', {
        error: error instanceof Error ? error.message : String(error),
        messageType,
        direction,
      });
      return correlationId;
    }
  }

  /**
   * Trace tool invocation with parameter capture
   */
  traceToolInvocation(
    toolName: string,
    parameters: any,
    context?: MCPContext,
    correlationId?: string,
  ): string {
    const invocationId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const corrId = correlationId || generateCorrelationId();

    try {
      const trace: ToolInvocationTrace = {
        correlationId: corrId,
        sessionId: context?.sessionId,
        toolName,
        invocationId,
        parameters: {
          schema: this.extractToolSchema(toolName),
          provided: this.config.sanitizeSensitiveData
            ? this.sanitizeParameters(parameters)
            : parameters,
          sanitized: this.sanitizeParameters(parameters),
          validation: this.validateToolParameters(toolName, parameters),
        },
        execution: {
          startTime: Date.now(),
          success: false,
        },
        context,
        crossSystemRef: this.extractCrossSystemReference(context),
      };

      this.toolInvocations.set(invocationId, trace);

      this.logProtocolCompliantMessage('debug', `Tool invocation started: ${toolName}`, {
        invocationId,
        correlationId: corrId,
        sessionId: trace.sessionId,
        parameterCount: Object.keys(parameters || {}).length,
        validation: trace.parameters.validation.valid,
        crossSystemRef: trace.crossSystemRef?.claudeCodeCorrelationId,
      });

      this.metrics.toolInvocations.total++;
      return invocationId;
    } catch (error) {
      this.logProtocolCompliantMessage('error', 'Failed to trace tool invocation', {
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });
      return invocationId;
    }
  }

  /**
   * Complete tool invocation trace
   */
  completeToolInvocation(invocationId: string, result?: any, error?: Error): void {
    const trace = this.toolInvocations.get(invocationId);
    if (!trace) {
      this.logProtocolCompliantMessage('warn', 'Tool invocation trace not found', {
        invocationId,
      });
      return;
    }

    try {
      trace.execution.endTime = Date.now();
      trace.execution.duration = trace.execution.endTime - trace.execution.startTime;
      trace.execution.success = !error;

      if (result) {
        trace.execution.result = this.config.sanitizeSensitiveData
          ? this.sanitizeResult(result)
          : result;
      }

      if (error) {
        trace.execution.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      }

      this.logProtocolCompliantMessage(
        error ? 'error' : 'debug',
        `Tool invocation ${error ? 'failed' : 'completed'}: ${trace.toolName}`,
        {
          invocationId,
          correlationId: trace.correlationId,
          duration: trace.execution.duration,
          success: trace.execution.success,
          resultSize: result ? this.calculateSize(result) : 0,
          error: error?.message,
        },
      );

      // Update metrics
      if (error) {
        this.metrics.toolInvocations.failed++;
      } else {
        this.metrics.toolInvocations.successful++;
      }

      // Update average execution time
      const total = this.metrics.toolInvocations.successful + this.metrics.toolInvocations.failed;
      this.metrics.toolInvocations.avgExecutionTime =
        (this.metrics.toolInvocations.avgExecutionTime * (total - 1) + trace.execution.duration!) /
        total;
    } catch (traceError) {
      this.logProtocolCompliantMessage('error', 'Failed to complete tool invocation trace', {
        invocationId,
        error: traceError instanceof Error ? traceError.message : String(traceError),
      });
    }
  }

  /**
   * Create cross-system correlation
   */
  createCrossSystemCorrelation(
    claudeFlowSessionId: string,
    claudeCodeSessionId?: string,
    metadata?: any,
  ): string {
    const correlationId = generateCorrelationId();

    const correlation: CrossSystemCorrelation = {
      claudeFlowSessionId,
      claudeCodeSessionId,
      correlationChain: [correlationId],
      initiatingSystem: claudeCodeSessionId ? 'claude-code' : 'claude-flow',
      timestamp: Date.now(),
      status: 'active',
      metadata,
    };

    this.crossSystemCorrelations.set(correlationId, correlation);
    this.metrics.correlation.crossSystemLinks++;

    this.logProtocolCompliantMessage('info', 'Cross-system correlation created', {
      correlationId,
      claudeFlowSessionId,
      claudeCodeSessionId,
      initiatingSystem: correlation.initiatingSystem,
    });

    return correlationId;
  }

  /**
   * Link existing correlation to claude-code session
   */
  linkToClaudeCode(
    correlationId: string,
    claudeCodeSessionId: string,
    claudeCodeCorrelationId?: string,
  ): boolean {
    const correlation = this.crossSystemCorrelations.get(correlationId);
    if (!correlation) {
      this.logProtocolCompliantMessage('warn', 'Correlation not found for claude-code link', {
        correlationId,
        claudeCodeSessionId,
      });
      return false;
    }

    correlation.claudeCodeSessionId = claudeCodeSessionId;
    if (claudeCodeCorrelationId) {
      correlation.correlationChain.push(claudeCodeCorrelationId);
    }

    this.logProtocolCompliantMessage('info', 'Correlation linked to claude-code', {
      correlationId,
      claudeCodeSessionId,
      claudeCodeCorrelationId,
      correlationChain: correlation.correlationChain,
    });

    return true;
  }

  /**
   * Get MCP debug metrics
   */
  getMetrics(): MCPDebugMetrics {
    // Calculate current memory usage
    const memUsage = process.memoryUsage();
    this.metrics.performance.memoryUsage = memUsage.heapUsed;

    // Update active correlations
    this.metrics.correlation.activeSessions = this.crossSystemCorrelations.size;

    return { ...this.metrics };
  }

  /**
   * Get protocol trace by correlation ID
   */
  getProtocolTrace(correlationId: string): MCPProtocolTrace | undefined {
    return this.protocolTraces.get(correlationId);
  }

  /**
   * Get tool invocation trace
   */
  getToolInvocationTrace(invocationId: string): ToolInvocationTrace | undefined {
    return this.toolInvocations.get(invocationId);
  }

  /**
   * Get cross-system correlation
   */
  getCrossSystemCorrelation(correlationId: string): CrossSystemCorrelation | undefined {
    return this.crossSystemCorrelations.get(correlationId);
  }

  /**
   * Protocol-compliant stderr logging
   */
  private logProtocolCompliantMessage(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: any,
  ): void {
    // All MCP logs must go to stderr for protocol compliance
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      component: 'MCP',
      message,
      ...meta,
      mcpCompliant: true,
      outputStream: 'stderr',
    };

    // Use stderr directly for MCP protocol compliance
    console.error(JSON.stringify(logEntry));
    this.metrics.protocolCompliance.stderrUsage++;

    // Also use the base logger for internal tracking
    switch (level) {
      case 'debug':
        this.baseLogger.debug(message, meta);
        break;
      case 'info':
        this.baseLogger.info(message, meta);
        break;
      case 'warn':
        this.baseLogger.warn(message, meta);
        break;
      case 'error':
        this.baseLogger.error(message, meta);
        break;
    }
  }

  private extractOrGenerateCorrelationId(
    message: MCPRequest | MCPResponse | MCPNotification,
    session?: MCPSession,
  ): string {
    // Try to extract existing correlation ID from message or session
    if ('id' in message && typeof message.id === 'string' && message.id.includes('corr-')) {
      return message.id;
    }

    if (session?.id) {
      return `corr-${session.id}-${Date.now()}`;
    }

    return generateCorrelationId();
  }

  private extractClaudeCodeSessionId(context?: any): string | undefined {
    return (
      context?.claudeCodeSessionId ||
      context?.crossSystemRef?.claudeCodeSessionId ||
      process.env.CLAUDE_CODE_SESSION_ID
    );
  }

  private validateProtocolCompliance(message: any): boolean {
    try {
      // Check JSON-RPC 2.0 compliance
      if (message.jsonrpc !== '2.0') {
        this.metrics.protocolCompliance.violations++;
        return false;
      }

      // Check required fields based on message type
      if ('method' in message) {
        // Request or notification
        if (typeof message.method !== 'string') {
          this.metrics.protocolCompliance.violations++;
          return false;
        }
      }

      if ('result' in message || 'error' in message) {
        // Response
        if (!('id' in message)) {
          this.metrics.protocolCompliance.violations++;
          return false;
        }
      }

      this.metrics.protocolCompliance.compliantMessages++;
      return true;
    } catch {
      this.metrics.protocolCompliance.violations++;
      return false;
    }
  }

  private createPayloadSummary(message: any): { size: number; hash?: string; sanitized?: any } {
    try {
      const jsonStr = JSON.stringify(message);
      const size = Buffer.byteLength(jsonStr, 'utf8');

      return {
        size,
        hash: this.createHash(jsonStr),
        sanitized: this.config.sanitizeSensitiveData ? this.sanitizeMessage(message) : undefined,
      };
    } catch {
      return { size: 0 };
    }
  }

  private categorizeError(
    error: MCPError,
  ): 'protocol' | 'transport' | 'application' | 'correlation' {
    if (error.code >= -32099 && error.code <= -32000) {
      return 'protocol';
    }
    if (error.code >= -32700 && error.code <= -32600) {
      return 'transport';
    }
    if (error.message?.includes('correlation') || error.message?.includes('session')) {
      return 'correlation';
    }
    return 'application';
  }

  private updateCrossSystemCorrelation(
    correlationId: string,
    trace: MCPProtocolTrace,
    context?: any,
  ): void {
    if (!this.config.enableCrossSystemCorrelation) return;

    // Look for existing correlation or create new one
    let correlation = this.crossSystemCorrelations.get(correlationId);

    if (!correlation && trace.sessionId) {
      // Try to find by session ID
      for (const [id, corr] of Array.from(this.crossSystemCorrelations.entries())) {
        if (corr.claudeFlowSessionId === trace.sessionId) {
          correlation = corr;
          break;
        }
      }
    }

    if (!correlation && trace.claudeCodeSessionId) {
      const correlationId = this.createCrossSystemCorrelation(
        trace.sessionId || 'unknown',
        trace.claudeCodeSessionId,
        context,
      );
      correlation = this.crossSystemCorrelations.get(correlationId);
    }

    if (correlation && !correlation.correlationChain.includes(correlationId)) {
      correlation.correlationChain.push(correlationId);
    }
  }

  private updateProtocolMetrics(trace: MCPProtocolTrace): void {
    this.metrics.protocolCompliance.totalMessages++;

    if (trace.protocol.compliance) {
      this.metrics.protocolCompliance.compliantMessages++;
    } else {
      this.metrics.protocolCompliance.violations++;
    }
  }

  private calculateOverhead(duration: number): number {
    // Calculate as percentage of total request time
    return duration / 1000; // Convert to ms
  }

  private extractToolSchema(toolName: string): any {
    // This would integrate with the tool registry to get schema
    return { type: 'object', properties: {}, toolName };
  }

  private validateToolParameters(
    toolName: string,
    parameters: any,
  ): { valid: boolean; errors?: string[] } {
    // Basic validation - would integrate with actual schema validation
    try {
      if (parameters && typeof parameters === 'object') {
        return { valid: true };
      }
      return { valid: false, errors: ['Parameters must be an object'] };
    } catch {
      return { valid: false, errors: ['Invalid parameters'] };
    }
  }

  private extractCrossSystemReference(
    context?: MCPContext,
  ):
    | { claudeCodeCorrelationId?: string; originatingSystem: 'claude-flow' | 'claude-code' }
    | undefined {
    if (!context) return undefined;

    return {
      claudeCodeCorrelationId: (context as any).claudeCodeCorrelationId,
      originatingSystem: (context as any).originatingSystem || 'claude-flow',
    };
  }

  private sanitizeParameters(params: any): any {
    if (!params || typeof params !== 'object') return params;

    const sanitized = { ...params };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const key in sanitized) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeResult(result: any): any {
    return this.sanitizeParameters(result);
  }

  private sanitizeMessage(message: any): any {
    return this.sanitizeParameters(message);
  }

  private calculateSize(obj: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(obj), 'utf8');
    } catch {
      return 0;
    }
  }

  private createHash(str: string): string {
    // Simple hash for correlation
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private startCleanupInterval(): void {
    const cleanupInterval = this.config.traceRetentionTime || 3600000; // 1 hour default

    this.correlationCleanupInterval = setInterval(() => {
      this.cleanupExpiredTraces();
    }, cleanupInterval / 10); // Clean up every 6 minutes if retention is 1 hour
  }

  private cleanupExpiredTraces(): void {
    const now = Date.now();
    const retentionTime = this.config.traceRetentionTime || 3600000;

    // Clean up protocol traces
    for (const [id, trace] of Array.from(this.protocolTraces.entries())) {
      if (now - trace.timestamp > retentionTime) {
        this.protocolTraces.delete(id);
      }
    }

    // Clean up tool invocations
    for (const [id, trace] of Array.from(this.toolInvocations.entries())) {
      if (now - trace.execution.startTime > retentionTime) {
        this.toolInvocations.delete(id);
      }
    }

    // Clean up cross-system correlations
    for (const [id, correlation] of Array.from(this.crossSystemCorrelations.entries())) {
      if (now - correlation.timestamp > retentionTime && correlation.status !== 'active') {
        this.crossSystemCorrelations.delete(id);
        this.metrics.correlation.crossSystemLinks--;
      }
    }
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.correlationCleanupInterval) {
      clearInterval(this.correlationCleanupInterval);
    }

    this.logProtocolCompliantMessage('info', 'MCP Debug Logger shutdown', {
      protocolTraces: this.protocolTraces.size,
      toolInvocations: this.toolInvocations.size,
      crossSystemCorrelations: this.crossSystemCorrelations.size,
      metrics: this.metrics,
    });

    // Clear all traces
    this.protocolTraces.clear();
    this.toolInvocations.clear();
    this.crossSystemCorrelations.clear();
  }
}

// Singleton instance for global access
let globalMCPDebugLogger: MCPDebugLogger | undefined;

/**
 * Get or create global MCP debug logger instance
 */
export function getMCPDebugLogger(config?: any): MCPDebugLogger {
  if (!globalMCPDebugLogger) {
    globalMCPDebugLogger = new MCPDebugLogger(config);
  }
  return globalMCPDebugLogger;
}

/**
 * Initialize MCP debug logging with configuration
 */
export function initializeMCPDebugLogging(config: any): MCPDebugLogger {
  globalMCPDebugLogger = new MCPDebugLogger(config);
  return globalMCPDebugLogger;
}

/**
 * Helper function to create correlation ID for claude-code integration
 */
export function createClaudeCodeCorrelation(
  claudeFlowSessionId: string,
  workflowId?: string,
  taskId?: string,
  agentId?: string,
): string {
  const logger = getMCPDebugLogger();
  return logger.createCrossSystemCorrelation(claudeFlowSessionId, undefined, {
    workflowId,
    taskId,
    agentId,
    timestamp: Date.now(),
  });
}

/**
 * Helper function to link claude-code session to existing correlation
 */
export function linkClaudeCodeSession(
  correlationId: string,
  claudeCodeSessionId: string,
  claudeCodeCorrelationId?: string,
): boolean {
  const logger = getMCPDebugLogger();
  return logger.linkToClaudeCode(correlationId, claudeCodeSessionId, claudeCodeCorrelationId);
}
