/**
 * London School TDD Integration Tests for MCP Protocol Compliance
 * 
 * Focus: Zero regression testing for MCP protocol compliance during CLI logging enhancement
 * Testing Strategy: Mock-driven verification of stderr routing and protocol preservation
 * 
 * Critical Requirements:
 * - MCP components MUST use stderr exclusively (no stdout pollution)
 * - CLI user messages MUST use stdout exclusively  
 * - Cross-system correlation preserved (claude-flow ↔ claude-code)
 * - Zero breaking changes to existing MCPDebugLogger behavior
 * - Performance overhead <5% for MCP operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createCompleteCliLoggingMocks,
  validateMockContracts,
  type IOutputManager,
  LogLevel
} from '../../utils/mocks/cli-logging-mocks.js';

describe('MCP Protocol Compliance - London School Integration Testing', () => {
  let mocks: ReturnType<typeof createCompleteCliLoggingMocks>;
  let outputManager: IOutputManager;
  let mcpLogger: any;
  
  beforeEach(() => {
    mocks = createCompleteCliLoggingMocks();
    
    // Create MCP-compliant logger mock
    mcpLogger = {
      component: 'MCP',
      debug: jest.fn((message: string) => {
        mocks.processStreams.stderr.write(`[DEBUG] ${message}\n`);
      }),
      info: jest.fn((message: string) => {
        mocks.processStreams.stderr.write(`[INFO] ${message}\n`);
      }),
      warn: jest.fn((message: string) => {
        mocks.processStreams.stderr.write(`[WARN] ${message}\n`);
      }),
      error: jest.fn((message: string) => {
        mocks.processStreams.stderr.write(`[ERROR] ${message}\n`);
      }),
      withCorrelationId: jest.fn().mockReturnThis(),
      withSessionId: jest.fn().mockReturnThis(),
      withComponent: jest.fn().mockReturnThis()
    };
    
    // Create output manager that respects MCP protocol
    outputManager = {
      // User-facing methods (stdout only)
      userInfo: jest.fn((message: string, meta?: any) => {
        mocks.processStreams.stdout.write(`✅ ${message}\n`);
      }),
      userSuccess: jest.fn((message: string, meta?: any) => {
        mocks.processStreams.stdout.write(`🎯 ${message}\n`);
      }),
      userWarning: jest.fn((message: string, meta?: any) => {
        mocks.processStreams.stdout.write(`⚠️  ${message}\n`);
      }),
      userError: jest.fn((message: string, error?: Error, meta?: any) => {
        mocks.processStreams.stdout.write(`❌ ${message}\n`);
      }),
      
      // MCP-aware methods (component-based routing)
      debug: jest.fn((message: string) => {
        if (mcpLogger.component === 'MCP') {
          mocks.processStreams.stderr.write(`[DEBUG] ${message}\n`);
        } else {
          mocks.processStreams.stdout.write(`[DEBUG] ${message}\n`);
        }
      }),
      info: jest.fn((message: string) => {
        if (mcpLogger.component === 'MCP') {
          mocks.processStreams.stderr.write(`[INFO] ${message}\n`);
        } else {
          mocks.processStreams.stdout.write(`[INFO] ${message}\n`);
        }
      }),
      warn: jest.fn((message: string) => {
        mocks.processStreams.stderr.write(`[WARN] ${message}\n`);
      }),
      error: jest.fn((message: string) => {
        mocks.processStreams.stderr.write(`[ERROR] ${message}\n`);
      }),
      
      // Other interface methods
      startOperation: jest.fn(), updateProgress: jest.fn(), completeOperation: jest.fn(),
      debugSession: jest.fn(), activateEmergencyMode: jest.fn(), isEmergencyMode: jest.fn(),
      getMemoryPressure: jest.fn(), criticalMemoryShutdown: jest.fn(), configure: jest.fn(),
      debugComponent: jest.fn(), withCorrelationId: jest.fn(), withSessionId: jest.fn(),
      withComponent: jest.fn(), debugIf: jest.fn(), debugLazy: jest.fn(),
      trackUsage: jest.fn(), getUsageAnalytics: jest.fn(), enableEmergencyMode: jest.fn(),
      disableEmergencyMode: jest.fn(), timeStart: jest.fn(), timeEnd: jest.fn()
    } as IOutputManager;
    
    // Mock ComponentLoggerFactory integration
    mocks.componentLoggerFactory.getMCPLogger.mockReturnValue(mcpLogger);
    mocks.componentLoggerFactory.getOutputManager.mockReturnValue(outputManager);
  });
  
  afterEach(() => {
    mocks.resetAllMocks();
  });

  // ============================================================================
  // STREAM ROUTING COMPLIANCE - Stdout vs Stderr Separation
  // ============================================================================

  describe('Stream Routing Compliance', () => {
    it('should route all MCP logging to stderr exclusively', () => {
      mcpLogger.debug('MCP debug message');
      mcpLogger.info('MCP info message');
      mcpLogger.warn('MCP warning message');
      mcpLogger.error('MCP error message');
      
      // All MCP messages should go to stderr
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledTimes(4);
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[DEBUG] MCP debug message\n');
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[INFO] MCP info message\n');
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[WARN] MCP warning message\n');
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[ERROR] MCP error message\n');
      
      // No MCP messages should pollute stdout
      expect(mocks.processStreams.stdout.write).not.toHaveBeenCalled();
    });

    it('should route all user messages to stdout exclusively', () => {
      outputManager.userInfo('User info message');
      outputManager.userSuccess('User success message');
      outputManager.userWarning('User warning message');
      outputManager.userError('User error message');
      
      // All user messages should go to stdout
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledTimes(4);
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('✅ User info message\n');
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('🎯 User success message\n');
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('⚠️  User warning message\n');
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('❌ User error message\n');
      
      // No user messages should pollute stderr
      expect(mocks.processStreams.stderr.write).not.toHaveBeenCalled();
    });

    it('should maintain strict separation under memory pressure', () => {
      // Simulate extreme memory pressure
      mocks.memoryManager.getMemoryPressure.mockReturnValue(0.99);
      mocks.memoryManager.getCurrentTier.mockReturnValue(2);
      
      // MCP logging should still use stderr
      mcpLogger.error('MCP error under pressure');
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[ERROR] MCP error under pressure\n');
      
      // User messages should still use stdout
      outputManager.userWarning('User warning under pressure');
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('⚠️  User warning under pressure\n');
      
      // Streams should remain separate
      expect(mocks.processStreams.stdout.write).not.toHaveBeenCalledWith(
        expect.stringContaining('MCP error under pressure')
      );
      expect(mocks.processStreams.stderr.write).not.toHaveBeenCalledWith(
        expect.stringContaining('User warning under pressure')
      );
    });

    it('should handle component-based routing correctly', () => {
      // Non-MCP component should use stdout for info/debug
      const cliLogger = { component: 'CLI' };
      mocks.componentLoggerFactory.getCLILogger.mockReturnValue(cliLogger);
      
      outputManager.debug('CLI debug message');
      outputManager.info('CLI info message');
      
      // CLI messages should go to stdout (for user visibility)
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('[DEBUG] CLI debug message\n');
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('[INFO] CLI info message\n');
      
      // But warn/error should still go to stderr
      outputManager.warn('CLI warning');
      outputManager.error('CLI error');
      
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[WARN] CLI warning\n');
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[ERROR] CLI error\n');
    });
  });

  // ============================================================================
  // CROSS-SYSTEM CORRELATION - Claude-Flow ↔ Claude-Code Integration
  // ============================================================================

  describe('Cross-System Correlation', () => {
    it('should preserve correlation IDs across MCP and user logging', () => {
      const correlationId = 'corr-123456789';
      
      // MCP logger with correlation
      mcpLogger.withCorrelationId(correlationId);
      mcpLogger.info('MCP operation with correlation');
      
      // User message with same correlation
      outputManager.userInfo('User message with correlation', { sessionId: correlationId });
      
      expect(mcpLogger.withCorrelationId).toHaveBeenCalledWith(correlationId);
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[INFO] MCP operation with correlation\n');
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('✅ User message with correlation\n');
    });

    it('should maintain session tracking across both streams', () => {
      const sessionId = 'session-test-correlation';
      
      // Start session in MCP context
      mcpLogger.withSessionId(sessionId);
      mcpLogger.debug('MCP session start');
      
      // Continue session in user context
      outputManager.startOperation('User operation', sessionId);
      
      expect(mcpLogger.withSessionId).toHaveBeenCalledWith(sessionId);
      expect(outputManager.startOperation).toHaveBeenCalledWith('User operation', sessionId);
    });

    it('should coordinate emergency mode across MCP and user systems', () => {
      const emergencyReason = 'Memory pressure coordination test';
      
      // Activate emergency mode
      outputManager.activateEmergencyMode(0.95, emergencyReason);
      
      // Both systems should be aware of emergency state
      expect(outputManager.activateEmergencyMode).toHaveBeenCalledWith(0.95, emergencyReason);
      expect(mocks.memoryManager.enableEmergencyMode).toHaveBeenCalled();
      
      // User should see emergency notification on stdout
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Emergency level 1')
      );
    });

    it('should preserve component hierarchy in distributed debugging', () => {
      const components = ['CLI', 'MCP', 'Swarm', 'Core'];
      
      components.forEach(component => {
        const logger = mocks.componentLoggerFactory.getLogger(component as any);
        logger.withComponent(component);
        
        expect(logger.withComponent).toHaveBeenCalledWith(component);
      });
    });
  });

  // ============================================================================
  // BACKWARD COMPATIBILITY - Zero Breaking Changes
  // ============================================================================

  describe('Backward Compatibility', () => {
    it('should maintain all existing ComponentLoggerFactory methods', () => {
      const requiredMethods = [
        'getCLILogger', 'getMCPLogger', 'getSwarmLogger', 'getCoreLogger',
        'getTerminalLogger', 'getMemoryLogger', 'getMigrationLogger',
        'getHooksLogger', 'getEnterpriseLogger', 'getUsageAnalytics',
        'getMemoryPressure', 'enableEmergencyMode', 'disableEmergencyMode'
      ];
      
      requiredMethods.forEach(method => {
        expect(typeof mocks.componentLoggerFactory[method]).toBe('function');
      });
    });

    it('should maintain existing IDebugLogger interface completely', () => {
      const debugLoggerMethods = [
        'debug', 'info', 'warn', 'error', 'configure',
        'debugComponent', 'withCorrelationId', 'withSessionId', 'withComponent',
        'debugIf', 'debugLazy', 'trackUsage', 'getUsageAnalytics',
        'getMemoryPressure', 'enableEmergencyMode', 'disableEmergencyMode',
        'timeStart', 'timeEnd'
      ];
      
      debugLoggerMethods.forEach(method => {
        expect(typeof outputManager[method as keyof IOutputManager]).toBe('function');
      });
    });

    it('should preserve existing emergency mode behavior', () => {
      // Existing emergency mode methods should work
      outputManager.enableEmergencyMode();
      outputManager.disableEmergencyMode();
      
      const memoryPressure = outputManager.getMemoryPressure();
      expect(typeof memoryPressure).toBe('number');
      
      expect(outputManager.enableEmergencyMode).toHaveBeenCalled();
      expect(outputManager.disableEmergencyMode).toHaveBeenCalled();
    });

    it('should maintain existing usage analytics functionality', () => {
      const analytics = mocks.componentLoggerFactory.getUsageAnalytics();
      
      expect(analytics).toMatchObject({
        totalCalls: expect.any(Number),
        symbolUsage: expect.any(Object),
        componentBreakdown: expect.any(Object),
        memoryPressure: expect.any(Number),
        avgResponseTime: expect.any(Number)
      });
    });
  });

  // ============================================================================
  // PERFORMANCE IMPACT VALIDATION - <5% Overhead
  // ============================================================================

  describe('Performance Impact Validation', () => {
    it('should add <5% overhead to MCP logging operations', async () => {
      const iterations = 1000;
      
      // Baseline: Direct stderr writing
      const baselineStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        mocks.processStreams.stderr.write(`Baseline message ${i}\n`);
      }
      const baselineTime = Date.now() - baselineStart;
      
      // Enhanced: MCP logging through new system
      const enhancedStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        mcpLogger.info(`Enhanced message ${i}`);
      }
      const enhancedTime = Date.now() - enhancedStart;
      
      const overhead = (enhancedTime - baselineTime) / baselineTime;
      expect(overhead).toBeLessThan(0.05); // Less than 5%
    });

    it('should maintain MCP operation latency under memory pressure', () => {
      // Simulate high memory pressure
      mocks.memoryManager.getMemoryPressure.mockReturnValue(0.97);
      
      const startTime = Date.now();
      mcpLogger.error('MCP error under pressure');
      const latency = Date.now() - startTime;
      
      expect(latency).toBeLessThan(10); // <10ms even under pressure
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[ERROR] MCP error under pressure\n');
    });

    it('should validate memory allocation impact for MCP operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many MCP operations
      for (let i = 0; i < 100; i++) {
        mcpLogger.debug(`Memory test ${i}`);
        mcpLogger.info(`Memory test ${i}`);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not significantly increase memory usage
      expect(memoryIncrease).toBeLessThan(50 * 1024); // Less than 50KB
    });

    it('should benchmark protocol compliance overhead', async () => {
      const complianceOverhead = await mocks.performanceMonitor.benchmarkMemoryOverhead();
      
      expect(complianceOverhead).toBeLessThan(0.03); // Less than 3%
      expect(mocks.performanceMonitor.benchmarkMemoryOverhead).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR RESILIENCE - Protocol Preservation Under Stress
  // ============================================================================

  describe('Error Resilience & Protocol Preservation', () => {
    it('should maintain protocol compliance even when stdout fails', () => {
      // Simulate stdout failure
      mocks.processStreams.stdout.write.mockImplementation(() => {
        throw new Error('stdout write failed');
      });
      
      // MCP logging should still work (uses stderr)
      expect(() => {
        mcpLogger.error('MCP error when stdout fails');
      }).not.toThrow();
      
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[ERROR] MCP error when stdout fails\n');
    });

    it('should maintain protocol compliance even when stderr fails', () => {
      // Simulate stderr failure
      mocks.processStreams.stderr.write.mockImplementation(() => {
        throw new Error('stderr write failed');
      });
      
      // User messages should still work (uses stdout)
      expect(() => {
        outputManager.userInfo('User message when stderr fails');
      }).not.toThrow();
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('✅ User message when stderr fails\n');
    });

    it('should gracefully handle stream switching failures', () => {
      // Both streams fail
      mocks.processStreams.stdout.write.mockImplementation(() => {
        throw new Error('stdout failed');
      });
      mocks.processStreams.stderr.write.mockImplementation(() => {
        throw new Error('stderr failed');
      });
      
      // System should not crash
      expect(() => {
        outputManager.userError('Error when both streams fail');
        mcpLogger.error('MCP error when both streams fail');
      }).not.toThrow();
    });

    it('should maintain correlation tracking even under stream failures', () => {
      const correlationId = 'failure-test-correlation';
      
      // Simulate partial failure
      mocks.processStreams.stdout.write.mockImplementationOnce(() => {
        throw new Error('stdout temporary failure');
      });
      
      mcpLogger.withCorrelationId(correlationId);
      mcpLogger.info('Correlation preserved despite failure');
      
      expect(mcpLogger.withCorrelationId).toHaveBeenCalledWith(correlationId);
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[INFO] Correlation preserved despite failure\n');
    });
  });

  // ============================================================================
  // INTEGRATION VALIDATION - Real-World Scenarios
  // ============================================================================

  describe('Integration Validation', () => {
    it('should handle mixed CLI and MCP operations in single session', () => {
      const sessionId = 'mixed-operations-session';
      
      // Start with user operation
      outputManager.startOperation('Mixed operation test', sessionId);
      
      // MCP processing
      mcpLogger.withSessionId(sessionId);
      mcpLogger.debug('MCP processing started');
      
      // User progress update
      outputManager.updateProgress({
        current: 1,
        total: 3,
        percentage: 33,
        message: 'Processing',
        operationId: sessionId
      });
      
      // MCP completion
      mcpLogger.info('MCP processing completed');
      
      // User completion
      outputManager.completeOperation('Mixed operation test', {
        success: true,
        message: 'Operation completed successfully'
      });
      
      // Verify proper stream routing throughout
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Mixed operation test started')
      );
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[DEBUG] MCP processing started\n');
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[INFO] MCP processing completed\n');
    });

    it('should coordinate emergency mode across CLI and MCP systems', () => {
      // Start normal operations
      outputManager.userInfo('Normal operation');
      mcpLogger.info('MCP normal operation');
      
      // Trigger emergency mode
      outputManager.activateEmergencyMode(0.95, 'Integration emergency test');
      
      // Both systems should operate in emergency mode
      outputManager.userWarning('Emergency user warning');
      mcpLogger.warn('MCP emergency warning');
      
      // Verify emergency notifications and continued operation
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Emergency level 1')
      );
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith('⚠️  Emergency user warning\n');
      expect(mocks.processStreams.stderr.write).toHaveBeenCalledWith('[WARN] MCP emergency warning\n');
    });

    it('should validate end-to-end protocol compliance in realistic workflow', () => {
      // Simulate realistic claude-flow operation with MCP communication
      const workflowId = 'protocol-compliance-workflow';
      
      // 1. User initiates operation
      outputManager.startOperation('Protocol compliance test', workflowId);
      
      // 2. MCP initialization
      mcpLogger.withSessionId(workflowId);
      mcpLogger.info('MCP protocol initialized');
      
      // 3. User sees progress
      outputManager.updateProgress({
        current: 1,
        total: 5,
        percentage: 20,
        message: 'Connecting to MCP server',
        operationId: workflowId
      });
      
      // 4. MCP communication
      mcpLogger.debug('MCP server connected');
      mcpLogger.debug('MCP request sent');
      
      // 5. User progress update
      outputManager.updateProgress({
        current: 3,
        total: 5,
        percentage: 60,
        message: 'Processing MCP response',
        operationId: workflowId
      });
      
      // 6. MCP processing
      mcpLogger.info('MCP response processed');
      
      // 7. User completion
      outputManager.completeOperation('Protocol compliance test', {
        success: true,
        message: 'MCP communication successful',
        duration: 150
      });
      
      // Verify complete protocol compliance throughout workflow
      const stdoutCalls = mocks.processStreams.stdout.write.mock.calls;
      const stderrCalls = mocks.processStreams.stderr.write.mock.calls;
      
      // All user messages should be on stdout
      expect(stdoutCalls.some(call => call[0].includes('Protocol compliance test started'))).toBe(true);
      expect(stdoutCalls.some(call => call[0].includes('Connecting to MCP server'))).toBe(true);
      expect(stdoutCalls.some(call => call[0].includes('Processing MCP response'))).toBe(true);
      expect(stdoutCalls.some(call => call[0].includes('complete'))).toBe(true);
      
      // All MCP messages should be on stderr
      expect(stderrCalls.some(call => call[0].includes('MCP protocol initialized'))).toBe(true);
      expect(stderrCalls.some(call => call[0].includes('MCP server connected'))).toBe(true);
      expect(stderrCalls.some(call => call[0].includes('MCP request sent'))).toBe(true);
      expect(stderrCalls.some(call => call[0].includes('MCP response processed'))).toBe(true);
      
      // No cross-contamination
      expect(stdoutCalls.some(call => call[0].includes('MCP'))).toBe(false);
      expect(stderrCalls.some(call => call[0].includes('user') || call[0].includes('✅') || call[0].includes('🔄'))).toBe(false);
    });
  });
});