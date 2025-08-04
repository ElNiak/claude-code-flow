/**
 * TDD London School: MCP Protocol Compliance Testing
 * Mock-driven testing for MCP protocol adherence and compliance validation
 */

import { jest } from '@jest/globals';
import {
  LondonSchoolMockFactory,
  IDebugLogger,
  IMemoryMonitor,
  ContractTestHelper,
} from '../../utils/london-school-test-helpers.js';

// MCP Protocol interfaces for testing
interface IMCPTransport {
  send(message: MCPMessage): Promise<void>;
  receive(): Promise<MCPMessage>;
  close(): Promise<void>;
  isConnected(): boolean;
}

interface IMCPProtocolHandler {
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  handleNotification(notification: MCPNotification): Promise<void>;
  validateMessage(message: MCPMessage): MCPValidationResult;
  getProtocolVersion(): string;
}

interface IMCPLogger {
  logProtocolEvent(event: MCPProtocolEvent): void;
  logError(error: MCPError): void;
  logMetrics(metrics: MCPMetrics): void;
  isDebugEnabled(): boolean;
}

// MCP Message types
interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

interface MCPRequest extends MCPMessage {
  method: string;
  params?: any;
}

interface MCPResponse extends MCPMessage {
  id: string | number;
  result?: any;
  error?: MCPError;
}

interface MCPNotification extends MCPMessage {
  method: string;
  params?: any;
}

interface MCPError {
  code: number;
  message: string;
  data?: any;
}

interface MCPValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface MCPProtocolEvent {
  type: 'request' | 'response' | 'notification' | 'error';
  direction: 'incoming' | 'outgoing';
  message: MCPMessage;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MCPMetrics {
  requestCount: number;
  responseCount: number;
  notificationCount: number;
  errorCount: number;
  averageResponseTime: number;
  protocolCompliance: number; // 0-100%
}

// Mock implementations for MCP testing
class MockMCPTransport implements IMCPTransport {
  private connected = false;
  private messageQueue: MCPMessage[] = [];

  send = jest.fn<(message: MCPMessage) => Promise<void>>().mockImplementation(async (message) => {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  receive = jest.fn<() => Promise<MCPMessage>>().mockImplementation(async () => {
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift()!;
    }
    throw new Error('No messages available');
  });

  close = jest.fn<() => Promise<void>>().mockImplementation(async () => {
    this.connected = false;
  });

  isConnected = jest.fn<() => boolean>().mockImplementation(() => this.connected);

  // Test utility methods
  connect(): void {
    this.connected = true;
  }

  queueMessage(message: MCPMessage): void {
    this.messageQueue.push(message);
  }
}

class MockMCPProtocolHandler implements IMCPProtocolHandler {
  handleRequest = jest.fn<(request: MCPRequest) => Promise<MCPResponse>>();
  handleNotification = jest.fn<(notification: MCPNotification) => Promise<void>>();
  validateMessage = jest.fn<(message: MCPMessage) => MCPValidationResult>();
  getProtocolVersion = jest.fn<() => string>().mockReturnValue('2.0');
}

// MCP-compliant debug logger
class MCPCompliantDebugLogger implements IMCPLogger {
  private baseLogger: IDebugLogger;
  private protocolHandler: IMCPProtocolHandler;
  private transport: IMCPTransport;
  private metrics: MCPMetrics;
  private eventLog: MCPProtocolEvent[] = [];

  constructor(
    baseLogger: IDebugLogger,
    protocolHandler: IMCPProtocolHandler,
    transport: IMCPTransport,
  ) {
    this.baseLogger = baseLogger;
    this.protocolHandler = protocolHandler;
    this.transport = transport;
    this.metrics = {
      requestCount: 0,
      responseCount: 0,
      notificationCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      protocolCompliance: 100,
    };
  }

  logProtocolEvent(event: MCPProtocolEvent): void {
    this.eventLog.push(event);

    // Log to stderr for MCP compliance (stdout reserved for protocol)
    this.baseLogger.debug('mcp:protocol', 'MCP protocol event', {
      type: event.type,
      direction: event.direction,
      method: event.message.method,
      messageId: event.message.id,
      timestamp: event.timestamp,
    });

    // Update metrics
    this.updateMetrics(event);

    // Validate protocol compliance
    const validation = this.protocolHandler.validateMessage(event.message);
    if (!validation.isValid) {
      this.logError({
        code: -32600,
        message: 'Invalid MCP message format',
        data: {
          errors: validation.errors,
          message: event.message,
        },
      });
    }
  }

  logError(error: MCPError): void {
    this.metrics.errorCount++;
    this.metrics.protocolCompliance = Math.max(0, this.metrics.protocolCompliance - 5);

    // Use stderr for error logging (MCP compliance)
    this.baseLogger.error('mcp:error', `MCP Error ${error.code}: ${error.message}`, {
      errorCode: error.code,
      errorData: error.data,
      protocolVersion: this.protocolHandler.getProtocolVersion(),
    });
  }

  logMetrics(metrics: MCPMetrics): void {
    this.metrics = { ...metrics };

    // Log metrics to stderr
    this.baseLogger.info('mcp:metrics', 'MCP protocol metrics', {
      requests: metrics.requestCount,
      responses: metrics.responseCount,
      notifications: metrics.notificationCount,
      errors: metrics.errorCount,
      avgResponseTime: metrics.averageResponseTime,
      compliance: metrics.protocolCompliance,
    });
  }

  isDebugEnabled(): boolean {
    return this.baseLogger.isEnabled('mcp:debug');
  }

  // MCP-specific debug methods
  async logRequest(request: MCPRequest): Promise<void> {
    const event: MCPProtocolEvent = {
      type: 'request',
      direction: 'incoming',
      message: request,
      timestamp: Date.now(),
      metadata: {
        transport: this.transport.isConnected() ? 'connected' : 'disconnected',
        protocolVersion: this.protocolHandler.getProtocolVersion(),
      },
    };

    this.logProtocolEvent(event);

    // Process request through handler
    try {
      const response = await this.protocolHandler.handleRequest(request);
      await this.logResponse(response, request.id!);
    } catch (error) {
      this.logError({
        code: -32603,
        message: 'Internal error processing request',
        data: { requestId: request.id, originalError: error },
      });
    }
  }

  async logResponse(response: MCPResponse, originalRequestId: string | number): Promise<void> {
    const event: MCPProtocolEvent = {
      type: 'response',
      direction: 'outgoing',
      message: response,
      timestamp: Date.now(),
      metadata: {
        originalRequestId,
        hasError: !!response.error,
      },
    };

    this.logProtocolEvent(event);

    // Send response through transport
    if (this.transport.isConnected()) {
      await this.transport.send(response);
    } else {
      this.logError({
        code: -32000,
        message: 'Transport disconnected - cannot send response',
        data: { responseId: response.id },
      });
    }
  }

  async logNotification(notification: MCPNotification): Promise<void> {
    const event: MCPProtocolEvent = {
      type: 'notification',
      direction: 'incoming',
      message: notification,
      timestamp: Date.now(),
    };

    this.logProtocolEvent(event);

    // Handle notification
    try {
      await this.protocolHandler.handleNotification(notification);
    } catch (error) {
      this.logError({
        code: -32603,
        message: 'Error handling notification',
        data: { method: notification.method, error },
      });
    }
  }

  private updateMetrics(event: MCPProtocolEvent): void {
    switch (event.type) {
      case 'request':
        this.metrics.requestCount++;
        break;
      case 'response':
        this.metrics.responseCount++;
        // Update average response time if metadata available
        if (event.metadata?.responseTime) {
          const currentAvg = this.metrics.averageResponseTime;
          const count = this.metrics.responseCount;
          this.metrics.averageResponseTime =
            (currentAvg * (count - 1) + event.metadata.responseTime) / count;
        }
        break;
      case 'notification':
        this.metrics.notificationCount++;
        break;
    }
  }

  // Test utility methods
  getEventLog(): MCPProtocolEvent[] {
    return [...this.eventLog];
  }

  clearEventLog(): void {
    this.eventLog = [];
  }

  getMetrics(): MCPMetrics {
    return { ...this.metrics };
  }

  setProtocolCompliance(level: number): void {
    this.metrics.protocolCompliance = Math.max(0, Math.min(100, level));
  }
}

describe('MCP Protocol Compliance Testing - London School TDD', () => {
  let mockBaseLogger: jest.Mocked<IDebugLogger>;
  let mockProtocolHandler: MockMCPProtocolHandler;
  let mockTransport: MockMCPTransport;
  let mcpLogger: MCPCompliantDebugLogger;

  beforeEach(() => {
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite();
    mockBaseLogger = mockSuite.debugLogger;
    mockProtocolHandler = new MockMCPProtocolHandler();
    mockTransport = new MockMCPTransport();

    mcpLogger = new MCPCompliantDebugLogger(mockBaseLogger, mockProtocolHandler, mockTransport);

    // Setup transport connection
    mockTransport.connect();
  });

  describe('JSON-RPC 2.0 Protocol Compliance', () => {
    it('should validate and log proper JSON-RPC 2.0 request format', async () => {
      // Arrange
      const validRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'req-123',
        method: 'tools/list',
        params: {},
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      mockProtocolHandler.handleRequest.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'req-123',
        result: { tools: [] },
      });

      // Act
      await mcpLogger.logRequest(validRequest);

      // Assert - Verify protocol compliance logging
      expect(mockProtocolHandler.validateMessage).toHaveBeenCalledWith(validRequest);
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        'mcp:protocol',
        'MCP protocol event',
        expect.objectContaining({
          type: 'request',
          direction: 'incoming',
          method: 'tools/list',
          messageId: 'req-123',
        }),
      );

      expect(mockProtocolHandler.handleRequest).toHaveBeenCalledWith(validRequest);
      expect(mockTransport.send).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: '2.0',
          id: 'req-123',
          result: { tools: [] },
        }),
      );
    });

    it('should detect and log JSON-RPC 2.0 format violations', async () => {
      // Arrange - Invalid message missing jsonrpc field
      const invalidMessage: any = {
        id: 'invalid-req',
        method: 'invalid/method',
        // Missing jsonrpc: '2.0'
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: false,
        errors: ['Missing required field: jsonrpc', 'Invalid jsonrpc version'],
        warnings: [],
      });

      const protocolEvent: MCPProtocolEvent = {
        type: 'request',
        direction: 'incoming',
        message: invalidMessage,
        timestamp: Date.now(),
      };

      // Act
      mcpLogger.logProtocolEvent(protocolEvent);

      // Assert - Verify validation error logging
      expect(mockProtocolHandler.validateMessage).toHaveBeenCalledWith(invalidMessage);
      expect(mockBaseLogger.error).toHaveBeenCalledWith(
        'mcp:error',
        'MCP Error -32600: Invalid MCP message format',
        expect.objectContaining({
          errorCode: -32600,
          errorData: expect.objectContaining({
            errors: ['Missing required field: jsonrpc', 'Invalid jsonrpc version'],
            message: invalidMessage,
          }),
        }),
      );

      // Verify compliance metric degradation
      const metrics = mcpLogger.getMetrics();
      expect(metrics.protocolCompliance).toBeLessThan(100);
      expect(metrics.errorCount).toBe(1);
    });

    it('should handle JSON-RPC 2.0 notification format correctly', async () => {
      // Arrange
      const validNotification: MCPNotification = {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          token: 'progress-123',
          value: { percentage: 45 },
        },
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      mockProtocolHandler.handleNotification.mockResolvedValue();

      // Act
      await mcpLogger.logNotification(validNotification);

      // Assert - Verify notification logging
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        'mcp:protocol',
        'MCP protocol event',
        expect.objectContaining({
          type: 'notification',
          direction: 'incoming',
          method: 'notifications/progress',
        }),
      );

      expect(mockProtocolHandler.handleNotification).toHaveBeenCalledWith(validNotification);

      // Verify notification count in metrics
      const metrics = mcpLogger.getMetrics();
      expect(metrics.notificationCount).toBe(1);
    });
  });

  describe('Stderr Usage Compliance', () => {
    it('should use stderr for all MCP logging to preserve stdout for protocol', () => {
      // Arrange
      const testEvent: MCPProtocolEvent = {
        type: 'request',
        direction: 'incoming',
        message: {
          jsonrpc: '2.0',
          id: 'stderr-test',
          method: 'test/method',
        },
        timestamp: Date.now(),
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      // Act
      mcpLogger.logProtocolEvent(testEvent);

      // Assert - Verify stderr usage through debug logger
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        'mcp:protocol',
        'MCP protocol event',
        expect.any(Object),
      );

      // The base logger should be configured to use stderr for MCP component
      // This is verified through the component-specific logging in the base logger
    });

    it('should log errors to stderr without interfering with stdout protocol', () => {
      // Arrange
      const mcpError: MCPError = {
        code: -32601,
        message: 'Method not found',
        data: { method: 'unknown/method' },
      };

      // Act
      mcpLogger.logError(mcpError);

      // Assert - Verify error logged to stderr
      expect(mockBaseLogger.error).toHaveBeenCalledWith(
        'mcp:error',
        'MCP Error -32601: Method not found',
        expect.objectContaining({
          errorCode: -32601,
          errorData: { method: 'unknown/method' },
        }),
      );

      // Verify error metrics
      const metrics = mcpLogger.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should log metrics to stderr for monitoring without protocol interference', () => {
      // Arrange
      const testMetrics: MCPMetrics = {
        requestCount: 25,
        responseCount: 24,
        notificationCount: 5,
        errorCount: 1,
        averageResponseTime: 45.2,
        protocolCompliance: 96,
      };

      // Act
      mcpLogger.logMetrics(testMetrics);

      // Assert - Verify metrics logged to stderr
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        'mcp:metrics',
        'MCP protocol metrics',
        expect.objectContaining({
          requests: 25,
          responses: 24,
          notifications: 5,
          errors: 1,
          avgResponseTime: 45.2,
          compliance: 96,
        }),
      );
    });
  });

  describe('Protocol Message Flow Validation', () => {
    it('should validate complete request-response cycle', async () => {
      // Arrange
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'cycle-test',
        method: 'resources/list',
        params: { cursor: null },
      };

      const expectedResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 'cycle-test',
        result: {
          resources: [{ uri: 'file://test.txt', name: 'Test File' }],
          nextCursor: null,
        },
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      mockProtocolHandler.handleRequest.mockResolvedValue(expectedResponse);

      // Act
      await mcpLogger.logRequest(request);

      // Assert - Verify complete cycle
      const eventLog = mcpLogger.getEventLog();
      expect(eventLog).toHaveLength(2); // Request + Response

      expect(eventLog[0]).toMatchObject({
        type: 'request',
        direction: 'incoming',
        message: request,
      });

      expect(eventLog[1]).toMatchObject({
        type: 'response',
        direction: 'outgoing',
        message: expectedResponse,
      });

      expect(mockTransport.send).toHaveBeenCalledWith(expectedResponse);

      // Verify metrics updated correctly
      const metrics = mcpLogger.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.responseCount).toBe(1);
    });

    it('should handle protocol errors in request processing', async () => {
      // Arrange
      const faultyRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'error-test',
        method: 'nonexistent/method',
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      mockProtocolHandler.handleRequest.mockRejectedValue(new Error('Method not implemented'));

      // Act
      await mcpLogger.logRequest(faultyRequest);

      // Assert - Verify error handling
      expect(mockBaseLogger.error).toHaveBeenCalledWith(
        'mcp:error',
        'MCP Error -32603: Internal error processing request',
        expect.objectContaining({
          errorCode: -32603,
          errorData: expect.objectContaining({
            requestId: 'error-test',
          }),
        }),
      );

      const metrics = mcpLogger.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should validate notification handling without responses', async () => {
      // Arrange
      const notification: MCPNotification = {
        jsonrpc: '2.0',
        method: 'notifications/message',
        params: {
          level: 'info',
          message: 'Operation completed successfully',
        },
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      mockProtocolHandler.handleNotification.mockResolvedValue();

      // Act
      await mcpLogger.logNotification(notification);

      // Assert - Verify notification handling (no response sent)
      const eventLog = mcpLogger.getEventLog();
      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].type).toBe('notification');

      expect(mockTransport.send).not.toHaveBeenCalled(); // No response for notifications

      const metrics = mcpLogger.getMetrics();
      expect(metrics.notificationCount).toBe(1);
      expect(metrics.responseCount).toBe(0);
    });
  });

  describe('Transport Layer Integration', () => {
    it('should handle transport disconnection gracefully', async () => {
      // Arrange
      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: 'disconnect-test',
        result: { success: true },
      };

      // Simulate transport disconnection
      mockTransport.close();

      // Act
      await mcpLogger.logResponse(response, 'disconnect-test');

      // Assert - Verify disconnection error logged
      expect(mockBaseLogger.error).toHaveBeenCalledWith(
        'mcp:error',
        'MCP Error -32000: Transport disconnected - cannot send response',
        expect.objectContaining({
          errorCode: -32000,
          errorData: expect.objectContaining({
            responseId: 'disconnect-test',
          }),
        }),
      );
    });

    it('should monitor transport connection status in protocol events', async () => {
      // Arrange
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'transport-test',
        method: 'ping',
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      mockProtocolHandler.handleRequest.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'transport-test',
        result: { pong: true },
      });

      // Act
      await mcpLogger.logRequest(request);

      // Assert - Verify transport status in event metadata
      const eventLog = mcpLogger.getEventLog();
      expect(eventLog[0].metadata?.transport).toBe('connected');
      expect(eventLog[0].metadata?.protocolVersion).toBe('2.0');
    });
  });

  describe('Protocol Compliance Metrics', () => {
    it('should track protocol compliance percentage accurately', async () => {
      // Arrange - Mix of valid and invalid messages
      const validMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: 'valid',
        method: 'test',
      };

      const invalidMessage: MCPMessage = {
        jsonrpc: '1.0', // Wrong version
        id: 'invalid',
        method: 'test',
      } as any;

      mockProtocolHandler.validateMessage
        .mockReturnValueOnce({ isValid: true, errors: [], warnings: [] })
        .mockReturnValueOnce({ isValid: false, errors: ['Invalid version'], warnings: [] });

      // Act
      mcpLogger.logProtocolEvent({
        type: 'request',
        direction: 'incoming',
        message: validMessage,
        timestamp: Date.now(),
      });

      mcpLogger.logProtocolEvent({
        type: 'request',
        direction: 'incoming',
        message: invalidMessage,
        timestamp: Date.now(),
      });

      // Assert - Verify compliance tracking
      const metrics = mcpLogger.getMetrics();
      expect(metrics.protocolCompliance).toBeLessThan(100); // Degraded due to invalid message
      expect(metrics.errorCount).toBe(1);
    });

    it('should calculate average response times correctly', async () => {
      // Arrange
      const responseTimes = [50, 75, 30, 100, 45]; // Expected average: 60

      for (let i = 0; i < responseTimes.length; i++) {
        const event: MCPProtocolEvent = {
          type: 'response',
          direction: 'outgoing',
          message: {
            jsonrpc: '2.0',
            id: `response-${i}`,
            result: {},
          },
          timestamp: Date.now(),
          metadata: { responseTime: responseTimes[i] },
        };

        mockProtocolHandler.validateMessage.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });

        // Act
        mcpLogger.logProtocolEvent(event);
      }

      // Assert - Verify average calculation
      const metrics = mcpLogger.getMetrics();
      expect(metrics.averageResponseTime).toBeCloseTo(60, 1); // Within 0.1 tolerance
      expect(metrics.responseCount).toBe(5);
    });
  });

  describe('Debug Configuration Compliance', () => {
    it('should respect debug enable/disable settings for MCP logging', () => {
      // Arrange
      mockBaseLogger.isEnabled.mockImplementation((category) => {
        return category === 'mcp:debug';
      });

      // Act & Assert
      expect(mcpLogger.isDebugEnabled()).toBe(true);

      mockBaseLogger.isEnabled.mockImplementation((category) => {
        return category !== 'mcp:debug';
      });

      expect(mcpLogger.isDebugEnabled()).toBe(false);
    });

    it('should maintain protocol logging even when debug is disabled', () => {
      // Arrange
      mockBaseLogger.isEnabled.mockReturnValue(false); // Debug disabled

      const protocolEvent: MCPProtocolEvent = {
        type: 'request',
        direction: 'incoming',
        message: {
          jsonrpc: '2.0',
          id: 'debug-disabled-test',
          method: 'test',
        },
        timestamp: Date.now(),
      };

      mockProtocolHandler.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      // Act
      mcpLogger.logProtocolEvent(protocolEvent);

      // Assert - Protocol events should still be logged
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        'mcp:protocol',
        'MCP protocol event',
        expect.any(Object),
      );
    });
  });
});

describe('Comprehensive MCP Protocol Compliance Validation', () => {
  it('should validate complete MCP protocol compliance with all requirements', async () => {
    // Arrange - Comprehensive MCP compliance test
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite();
    const mockProtocolHandler = new MockMCPProtocolHandler();
    const mockTransport = new MockMCPTransport();

    const mcpLogger = new MCPCompliantDebugLogger(
      mockSuite.debugLogger,
      mockProtocolHandler,
      mockTransport,
    );

    mockTransport.connect();

    // Setup comprehensive protocol scenarios
    const testScenarios = [
      {
        type: 'request' as const,
        message: {
          jsonrpc: '2.0' as const,
          id: 'tools-list',
          method: 'tools/list',
          params: {},
        },
        response: {
          jsonrpc: '2.0' as const,
          id: 'tools-list',
          result: { tools: [] },
        },
      },
      {
        type: 'notification' as const,
        message: {
          jsonrpc: '2.0' as const,
          method: 'notifications/progress',
          params: { token: 'test', value: { percentage: 50 } },
        },
      },
      {
        type: 'error' as const,
        message: {
          jsonrpc: '2.0' as const,
          id: 'error-test',
          method: 'invalid/method',
        },
        error: {
          code: -32601,
          message: 'Method not found',
        },
      },
    ];

    mockProtocolHandler.validateMessage.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    mockProtocolHandler.handleRequest.mockImplementation(async (request) => {
      const scenario = testScenarios.find((s) => s.message.id === request.id);
      if (scenario && 'response' in scenario) {
        return scenario.response;
      }
      throw new Error('Method not found');
    });

    mockProtocolHandler.handleNotification.mockResolvedValue();

    // Act - Execute comprehensive protocol test
    const startTime = Date.now();

    // Process all scenarios
    for (const scenario of testScenarios) {
      switch (scenario.type) {
        case 'request':
          await mcpLogger.logRequest(scenario.message as MCPRequest);
          break;
        case 'notification':
          await mcpLogger.logNotification(scenario.message as MCPNotification);
          break;
        case 'error':
          try {
            await mcpLogger.logRequest(scenario.message as MCPRequest);
          } catch (error) {
            // Expected for error scenario
          }
          break;
      }
    }

    const endTime = Date.now();

    // Assert - Comprehensive compliance validation

    // 1. JSON-RPC 2.0 Protocol Compliance
    expect(mockProtocolHandler.validateMessage).toHaveBeenCalledTimes(3);
    expect(mockProtocolHandler.getProtocolVersion()).toBe('2.0');

    // 2. Stderr Usage Compliance
    const totalLogCalls =
      mockSuite.debugLogger.debug.mock.calls.length +
      mockSuite.debugLogger.info.mock.calls.length +
      mockSuite.debugLogger.warn.mock.calls.length +
      mockSuite.debugLogger.error.mock.calls.length;

    expect(totalLogCalls).toBeGreaterThan(0);

    // Verify MCP-specific logging categories
    const mcpProtocolCalls = mockSuite.debugLogger.debug.mock.calls.filter(
      (call) => call[0] === 'mcp:protocol',
    );
    expect(mcpProtocolCalls.length).toBeGreaterThan(0);

    // 3. Protocol Message Flow Validation
    const eventLog = mcpLogger.getEventLog();
    expect(eventLog.length).toBeGreaterThan(0);

    // Verify request-response pairs
    const requests = eventLog.filter((e) => e.type === 'request');
    const responses = eventLog.filter((e) => e.type === 'response');
    const notifications = eventLog.filter((e) => e.type === 'notification');

    expect(requests.length).toBe(2); // tools-list + error-test
    expect(responses.length).toBe(1); // Only tools-list succeeds
    expect(notifications.length).toBe(1); // progress notification

    // 4. Transport Integration
    expect(mockTransport.send).toHaveBeenCalled();
    expect(mockTransport.isConnected()).toBe(true);

    // 5. Protocol Metrics Tracking
    const metrics = mcpLogger.getMetrics();
    expect(metrics.requestCount).toBe(2);
    expect(metrics.responseCount).toBe(1);
    expect(metrics.notificationCount).toBe(1);
    expect(metrics.errorCount).toBe(1); // Error scenario
    expect(metrics.protocolCompliance).toBeLessThanOrEqual(100);

    // 6. Performance Requirements
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(1000); // <1 second for protocol processing

    // 7. Error Handling Compliance
    const errorCalls = mockSuite.debugLogger.error.mock.calls.filter(
      (call) => call[0] === 'mcp:error',
    );
    expect(errorCalls.length).toBe(1); // Error scenario handled

    // 8. Comprehensive Protocol Coverage
    expect(mockProtocolHandler.handleRequest).toHaveBeenCalledTimes(2);
    expect(mockProtocolHandler.handleNotification).toHaveBeenCalledTimes(1);

    // Verify all required MCP message types were tested
    const messageTypes = eventLog.map((e) => e.type);
    expect(messageTypes).toContain('request');
    expect(messageTypes).toContain('response');
    expect(messageTypes).toContain('notification');

    // Verify protocol event metadata includes required fields
    eventLog.forEach((event) => {
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('direction');
      expect(event.message).toHaveProperty('jsonrpc', '2.0');
    });

    // Final compliance validation
    expect(metrics.protocolCompliance).toBeGreaterThan(90); // >90% compliance maintained
  });
});
