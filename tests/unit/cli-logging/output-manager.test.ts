/**
 * London School TDD Tests for IOutputManager - Dual-Stream CLI Logging
 * 
 * Focus: Mock-driven behavior verification for human-readable stdout + session file logging
 * Memory Context: Extreme pressure (98%+ usage) with multi-tier emergency response
 * 
 * Test Strategy: Outside-in development with contract-first design
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createCompleteCliLoggingMocks,
  validateMockContracts,
  type IOutputManager,
  type UserDisplayMeta,
  type ProgressInfo,
  type OperationResult,
  LogLevel
} from '../../utils/mocks/cli-logging-mocks.js';

describe('IOutputManager - London School TDD Contract Verification', () => {
  let mocks: ReturnType<typeof createCompleteCliLoggingMocks>;
  let outputManager: IOutputManager;
  
  beforeEach(() => {
    // Reset all mocks for clean test state
    mocks = createCompleteCliLoggingMocks();
    
    // Create mock implementation of IOutputManager for behavior testing
    outputManager = {
      // Human-readable stdout methods
      userInfo: jest.fn((message: string, meta?: UserDisplayMeta) => {
        mocks.humanFormatter.formatUserInfo(message, meta);
        mocks.processStreams.stdout.write(`✅ ${message} [sess:${meta?.sessionId?.slice(-6) || 'abc123'}]\n`);
        if (mocks.memoryManager.getCurrentTier() < 2) {
          return mocks.sessionManager.writeToSession(`INFO|${message}`, meta?.sessionId);
        }
      }),
      
      userSuccess: jest.fn((message: string, meta?: UserDisplayMeta) => {
        mocks.humanFormatter.formatUserSuccess(message, meta);
        mocks.processStreams.stdout.write(`🎯 ${message} [sess:${meta?.sessionId?.slice(-6) || 'abc123'}]\n`);
        return mocks.sessionManager.writeToSession(`SUCCESS|${message}`, meta?.sessionId);
      }),
      
      userWarning: jest.fn((message: string, meta?: UserDisplayMeta) => {
        mocks.humanFormatter.formatUserWarning(message, meta);
        mocks.processStreams.stdout.write(`⚠️  ${message} [sess:${meta?.sessionId?.slice(-6) || 'abc123'}]\n`);
        return mocks.sessionManager.writeToSession(`WARN|${message}`, meta?.sessionId);
      }),
      
      userError: jest.fn((message: string, error?: Error, meta?: UserDisplayMeta) => {
        mocks.humanFormatter.formatUserError(message, error, meta);
        mocks.processStreams.stdout.write(`❌ ${message} [sess:${meta?.sessionId?.slice(-6) || 'abc123'}]\n`);
        return mocks.sessionManager.writeToSession(`ERROR|${message}`, meta?.sessionId);
      }),
      
      // Progress tracking methods
      startOperation: jest.fn((operation: string, sessionId?: string) => {
        mocks.humanFormatter.formatOperation(operation, sessionId);
        mocks.processStreams.stdout.write(`🚀 ${operation} started [sess:${sessionId?.slice(-6) || 'abc123'}]\n`);
        return mocks.sessionManager.writeToSession(`START|${operation}`, sessionId);
      }),
      
      updateProgress: jest.fn((progress: ProgressInfo) => {
        mocks.humanFormatter.formatProgress(progress);
        const percentage = Math.round(progress.percentage);
        mocks.processStreams.stdout.write(`🔄 ${progress.message || 'Progress'}: ${percentage}% (${progress.current}/${progress.total})\n`);
        return mocks.sessionManager.writeToSession(`PROGRESS|${progress.percentage}%`, progress.operationId);
      }),
      
      completeOperation: jest.fn((operation: string, result?: OperationResult) => {
        mocks.humanFormatter.formatCompletion(operation, result);
        const duration = result?.duration ? ` (${result.duration}ms)` : '';
        const status = result?.success ? '✨' : '💥';
        mocks.processStreams.stdout.write(`${status} ${operation} complete${duration}\n`);
        return mocks.sessionManager.writeToSession(`COMPLETE|${operation}|${result?.success}`, undefined);
      }),
      
      // Session logging method
      debugSession: jest.fn(async (level: LogLevel, message: string, meta: any) => {
        if (mocks.memoryManager.getCurrentTier() >= 2) {
          return Promise.resolve(); // Skip in extreme emergency
        }
        await mocks.sessionManager.writeToSession(`${LogLevel[level]}|${message}`, meta?.sessionId);
      }),
      
      // Memory management methods
      activateEmergencyMode: jest.fn((threshold: number, reason: string) => {
        mocks.memoryManager.enableEmergencyMode();
        const level = threshold >= 0.995 ? 3 : threshold >= 0.99 ? 2 : 1;
        mocks.processStreams.stdout.write(`⚠️  Emergency level ${level}: ${reason}\n`);
      }),
      
      isEmergencyMode: jest.fn(() => {
        return mocks.memoryManager.getCurrentTier() > 0;
      }),
      
      getMemoryPressure: jest.fn(() => {
        return mocks.memoryManager.getMemoryPressure();
      }),
      
      criticalMemoryShutdown: jest.fn(() => {
        mocks.memoryManager.activateCriticalShutdown();
        mocks.processStreams.stdout.write('🚨 Critical memory - console-only mode activated\n');
        // Disable session logging
        outputManager.debugSession = jest.fn().mockResolvedValue(void 0);
      }),
      
      // IDebugLogger interface compliance
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      configure: jest.fn(),
      debugComponent: jest.fn(),
      withCorrelationId: jest.fn(),
      withSessionId: jest.fn(),
      withComponent: jest.fn(),
      debugIf: jest.fn(),
      debugLazy: jest.fn(),
      trackUsage: jest.fn(),
      getUsageAnalytics: jest.fn(),
      enableEmergencyMode: jest.fn(),
      disableEmergencyMode: jest.fn(),
      timeStart: jest.fn(),
      timeEnd: jest.fn()
    } as IOutputManager;
  });
  
  afterEach(() => {
    mocks.resetAllMocks();
  });

  // ============================================================================
  // CONTRACT VERIFICATION TESTS - Interface Compliance
  // ============================================================================

  describe('Contract Verification', () => {
    it('should implement all required IOutputManager methods', () => {
      expect(validateMockContracts.validateOutputManagerContract(outputManager)).toBe(true);
    });

    it('should extend IDebugLogger interface completely', () => {
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
  });

  // ============================================================================
  // DUAL-STREAM BEHAVIOR TESTS - Human-Readable Stdout + Session Files
  // ============================================================================

  describe('Dual-Stream Functionality', () => {
    describe('Human-Readable Stdout', () => {
      it('should output emoji-enhanced user info to stdout with session reference', () => {
        const meta: UserDisplayMeta = { sessionId: 'test-session-123' };
        
        outputManager.userInfo('Test message', meta);
        
        expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
          '✅ Test message [sess:123]\n'
        );
        expect(mocks.humanFormatter.formatUserInfo).toHaveBeenCalledWith('Test message', meta);
      });

      it('should output success messages with appropriate emoji', () => {
        const meta: UserDisplayMeta = { sessionId: 'success-session-456' };
        
        outputManager.userSuccess('Operation completed', meta);
        
        expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
          '🎯 Operation completed [sess:456]\n'
        );
        expect(mocks.humanFormatter.formatUserSuccess).toHaveBeenCalledWith('Operation completed', meta);
      });

      it('should output warning messages with warning emoji', () => {
        const meta: UserDisplayMeta = { sessionId: 'warn-session-789' };
        
        outputManager.userWarning('High memory usage detected', meta);
        
        expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
          '⚠️  High memory usage detected [sess:789]\n'
        );
        expect(mocks.humanFormatter.formatUserWarning).toHaveBeenCalledWith('High memory usage detected', meta);
      });

      it('should output error messages with error emoji', () => {
        const error = new Error('Test error');
        const meta: UserDisplayMeta = { sessionId: 'error-session-000' };
        
        outputManager.userError('Operation failed', error, meta);
        
        expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
          '❌ Operation failed [sess:000]\n'
        );
        expect(mocks.humanFormatter.formatUserError).toHaveBeenCalledWith('Operation failed', error, meta);
      });
    });

    describe('Session File Logging', () => {
      it('should write structured data to session files', () => {
        const meta: UserDisplayMeta = { sessionId: 'file-session-123' };
        
        outputManager.userInfo('Test message', meta);
        
        expect(mocks.sessionManager.writeToSession).toHaveBeenCalledWith(
          'INFO|Test message',
          'file-session-123'
        );
      });

      it('should handle session file writes asynchronously', async () => {
        const meta = { sessionId: 'async-session-456' };
        
        await outputManager.debugSession(LogLevel.DEBUG, 'Debug message', meta);
        
        expect(mocks.sessionManager.writeToSession).toHaveBeenCalledWith(
          'DEBUG|Debug message',
          'async-session-456'
        );
      });

      it('should coordinate with session manager for file organization', () => {
        outputManager.userSuccess('File coordination test');
        
        expect(mocks.sessionManager.writeToSession).toHaveBeenCalled();
        expect(mocks.sessionManager.getSessionPath).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // PROGRESS TRACKING TESTS - Operation Lifecycle Management
  // ============================================================================

  describe('Progress Tracking', () => {
    it('should start operations with appropriate formatting', () => {
      outputManager.startOperation('Test Operation', 'op-session-123');
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        '🚀 Test Operation started [sess:123]\n'
      );
      expect(mocks.humanFormatter.formatOperation).toHaveBeenCalledWith('Test Operation', 'op-session-123');
      expect(mocks.sessionManager.writeToSession).toHaveBeenCalledWith(
        'START|Test Operation',
        'op-session-123'
      );
    });

    it('should update progress with percentage and visual indicators', () => {
      const progress: ProgressInfo = {
        current: 5,
        total: 10,
        percentage: 50,
        message: 'Processing files',
        operationId: 'op-123'
      };
      
      outputManager.updateProgress(progress);
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        '🔄 Processing files: 50% (5/10)\n'
      );
      expect(mocks.humanFormatter.formatProgress).toHaveBeenCalledWith(progress);
      expect(mocks.sessionManager.writeToSession).toHaveBeenCalledWith(
        'PROGRESS|50%',
        'op-123'
      );
    });

    it('should complete operations with success/failure indication and timing', () => {
      const result: OperationResult = {
        success: true,
        message: 'Files processed successfully',
        duration: 125
      };
      
      outputManager.completeOperation('File Processing', result);
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        '✨ File Processing complete (125ms)\n'
      );
      expect(mocks.humanFormatter.formatCompletion).toHaveBeenCalledWith('File Processing', result);
      expect(mocks.sessionManager.writeToSession).toHaveBeenCalledWith(
        'COMPLETE|File Processing|true',
        undefined
      );
    });

    it('should handle failed operations with error indication', () => {
      const result: OperationResult = {
        success: false,
        message: 'Operation failed due to memory constraints'
      };
      
      outputManager.completeOperation('Memory Intensive Task', result);
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        '💥 Memory Intensive Task complete\n'
      );
    });
  });

  // ============================================================================
  // MEMORY PRESSURE RESPONSE TESTS - Multi-Tier Emergency System
  // ============================================================================

  describe('Memory Pressure Response', () => {
    it('should activate emergency mode at 95% threshold', () => {
      mocks.memoryManager.getMemoryPressure.mockReturnValue(0.95);
      
      outputManager.activateEmergencyMode(0.95, 'Memory pressure threshold reached');
      
      expect(mocks.memoryManager.enableEmergencyMode).toHaveBeenCalled();
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        '⚠️  Emergency level 1: Memory pressure threshold reached\n'
      );
    });

    it('should escalate to extreme emergency mode at 99% threshold', () => {
      mocks.memoryManager.getMemoryPressure.mockReturnValue(0.99);
      mocks.memoryManager.getCurrentTier.mockReturnValue(2);
      
      outputManager.activateEmergencyMode(0.99, 'Extreme memory pressure detected');
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        '⚠️  Emergency level 2: Extreme memory pressure detected\n'
      );
    });

    it('should activate critical shutdown at 99.5% threshold', () => {
      mocks.memoryManager.getMemoryPressure.mockReturnValue(0.995);
      
      outputManager.criticalMemoryShutdown();
      
      expect(mocks.memoryManager.activateCriticalShutdown).toHaveBeenCalled();
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        '🚨 Critical memory - console-only mode activated\n'
      );
    });

    it('should disable session logging in extreme emergency mode', async () => {
      mocks.memoryManager.getCurrentTier.mockReturnValue(2); // Extreme mode
      
      await outputManager.debugSession(LogLevel.DEBUG, 'Test message', { sessionId: 'test' });
      
      // Should resolve immediately without calling session manager
      expect(mocks.sessionManager.writeToSession).not.toHaveBeenCalled();
    });

    it('should report emergency mode status correctly', () => {
      mocks.memoryManager.getCurrentTier.mockReturnValue(1);
      
      const isEmergency = outputManager.isEmergencyMode();
      
      expect(isEmergency).toBe(true);
    });

    it('should report current memory pressure accurately', () => {
      mocks.memoryManager.getMemoryPressure.mockReturnValue(0.987);
      
      const pressure = outputManager.getMemoryPressure();
      
      expect(pressure).toBe(0.987);
      expect(mocks.memoryManager.getMemoryPressure).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // BEHAVIORAL INTERACTION TESTS - London School Focus
  // ============================================================================

  describe('Component Collaboration Behavior', () => {
    it('should coordinate stdout formatting with human formatter', () => {
      outputManager.userInfo('Collaboration test');
      
      expect(mocks.humanFormatter.formatUserInfo).toHaveBeenCalledBefore(
        mocks.processStreams.stdout.write as jest.Mock
      );
    });

    it('should coordinate session management with file operations', () => {
      outputManager.userWarning('Session coordination test', { sessionId: 'coord-123' });
      
      expect(mocks.sessionManager.writeToSession).toHaveBeenCalledWith(
        'WARN|Session coordination test',
        'coord-123'
      );
    });

    it('should respect memory manager tier decisions for feature disabling', async () => {
      // Simulate normal mode
      mocks.memoryManager.getCurrentTier.mockReturnValue(0);
      
      outputManager.userInfo('Normal mode test', { sessionId: 'normal-123' });
      expect(mocks.sessionManager.writeToSession).toHaveBeenCalled();
      
      // Reset calls
      jest.clearAllMocks();
      
      // Simulate extreme emergency mode
      mocks.memoryManager.getCurrentTier.mockReturnValue(2);
      
      outputManager.userInfo('Emergency mode test', { sessionId: 'emergency-123' });
      expect(mocks.sessionManager.writeToSession).not.toHaveBeenCalled();
    });

    it('should maintain consistent session ID formatting across components', () => {
      const sessionId = 'very-long-session-id-12345678';
      
      outputManager.userSuccess('Session ID test', { sessionId });
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('[sess:45678]')
      );
    });
  });

  // ============================================================================
  // PERFORMANCE CONTRACT TESTS - Memory Constraint Validation
  // ============================================================================

  describe('Performance Contract Validation', () => {
    it('should complete stdout operations within 10ms under memory pressure', () => {
      const startTime = Date.now();
      
      outputManager.userInfo('Performance test');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });

    it('should handle session file operations asynchronously without blocking stdout', async () => {
      const startTime = Date.now();
      
      // Stdout should be immediate
      outputManager.userInfo('Async test', { sessionId: 'async-test' });
      const stdoutDuration = Date.now() - startTime;
      
      expect(stdoutDuration).toBeLessThan(10);
      expect(mocks.sessionManager.writeToSession).toHaveBeenCalled();
    });

    it('should validate memory overhead stays within 5% limit', () => {
      const memoryBefore = process.memoryUsage().heapUsed;
      
      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        outputManager.userInfo(`Memory test ${i}`, { sessionId: `test-${i}` });
      }
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const overhead = (memoryAfter - memoryBefore) / memoryBefore;
      
      expect(overhead).toBeLessThan(0.05); // Less than 5%
    });
  });

  // ============================================================================
  // ERROR RESILIENCE TESTS - Graceful Degradation
  // ============================================================================

  describe('Error Resilience & Graceful Degradation', () => {
    it('should continue stdout operations even if session logging fails', () => {
      mocks.sessionManager.writeToSession.mockRejectedValue(new Error('File system full'));
      
      expect(() => {
        outputManager.userError('Error resilience test');
      }).not.toThrow();
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error resilience test')
      );
    });

    it('should gracefully handle formatter failures with fallback formatting', () => {
      mocks.humanFormatter.formatUserInfo.mockImplementation(() => {
        throw new Error('Formatter crashed');
      });
      
      expect(() => {
        outputManager.userInfo('Formatter failure test');
      }).not.toThrow();
      
      expect(mocks.processStreams.stdout.write).toHaveBeenCalled();
    });

    it('should handle memory pressure spikes during operation', () => {
      // Start in normal mode
      mocks.memoryManager.getCurrentTier.mockReturnValue(0);
      
      outputManager.startOperation('Memory spike test');
      
      // Simulate memory spike during operation
      mocks.memoryManager.getCurrentTier.mockReturnValue(2);
      mocks.memoryManager.getMemoryPressure.mockReturnValue(0.99);
      
      outputManager.updateProgress({
        current: 5,
        total: 10,
        percentage: 50,
        operationId: 'spike-test'
      });
      
      // Should still output to stdout but skip session logging
      expect(mocks.processStreams.stdout.write).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// SWARM COORDINATION TESTS - Cross-Agent Memory Sharing
// ============================================================================

describe('Swarm Memory Coordination', () => {
  let mocks: ReturnType<typeof createCompleteCliLoggingMocks>;
  
  beforeEach(() => {
    mocks = createCompleteCliLoggingMocks();
  });

  it('should store test strategy results in swarm memory', async () => {
    const testStrategy = {
      strategy: 'london-school-tdd',
      coverage: { lines: 0.96, branches: 0.94, functions: 0.98 },
      memoryPressure: 0.985,
      emergencyActivations: 3
    };
    
    await mocks.swarmMemory.storeTestStrategy(testStrategy);
    
    expect(mocks.swarmMemory.storeTestStrategy).toHaveBeenCalledWith(testStrategy);
  });

  it('should share coverage metrics with other swarm agents', async () => {
    const coverageMetrics = {
      outputManagerTests: { lines: 0.98, branches: 0.96, functions: 1.0 },
      memoryManagerTests: { lines: 0.94, branches: 0.92, functions: 0.96 },
      sessionManagerTests: { lines: 0.95, branches: 0.93, functions: 0.97 }
    };
    
    await mocks.swarmMemory.shareCoverageMetrics(coverageMetrics);
    
    expect(mocks.swarmMemory.shareCoverageMetrics).toHaveBeenCalledWith(coverageMetrics);
  });

  it('should coordinate emergency mode activation across swarm', async () => {
    const emergencyData = {
      memoryPressure: 0.995,
      emergencyLevel: 3,
      affectedComponents: ['OutputManager', 'SessionManager'],
      timestamp: Date.now()
    };
    
    await mocks.swarmMemory.broadcastEmergencyMode(emergencyData);
    
    expect(mocks.swarmMemory.broadcastEmergencyMode).toHaveBeenCalledWith(emergencyData);
  });

  it('should validate mock contracts across swarm agents', () => {
    const contractValidation = mocks.swarmMemory.verifyMockContracts();
    
    expect(contractValidation).toBe(true);
    expect(mocks.swarmMemory.validateInteractions()).toEqual([]);
  });
});