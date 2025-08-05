/**
 * London School TDD Mocks for CLI Human-Readable Logging System
 * Mock-driven development following the London School (mockist) approach
 * 
 * Focus: Define contracts and collaborations through mock behavior
 */

import { jest } from '@jest/globals';
import type { IDebugLogger, ComponentType, DebugMeta, UsageReport } from '../../../src/core/logger.js';

// ============================================================================
// CORE INTERFACE MOCKS - Contract Definition Through Behavior
// ============================================================================

/**
 * IOutputManager Interface Mock - Dual-Stream Capability
 * Defines the contract for human-readable stdout + session file logging
 */
export interface IOutputManager extends IDebugLogger {
  // Human-readable stdout (user-facing) - Zero memory allocation
  userInfo(message: string, meta?: UserDisplayMeta): void;
  userSuccess(message: string, meta?: UserDisplayMeta): void;  
  userWarning(message: string, meta?: UserDisplayMeta): void;
  userError(message: string, error?: Error, meta?: UserDisplayMeta): void;
  
  // Progress tracking - Minimal memory footprint
  startOperation(operation: string, sessionId?: string): void;
  updateProgress(progress: ProgressInfo): void;
  completeOperation(operation: string, result?: OperationResult): void;
  
  // Session logging - Aggressive batching
  debugSession(level: LogLevel, message: string, meta: DebugMeta): Promise<void>;
  
  // Memory management - Multi-tier emergency
  activateEmergencyMode(threshold: number, reason: string): void;
  isEmergencyMode(): boolean;
  getMemoryPressure(): number;
  criticalMemoryShutdown(): void;
}

export interface UserDisplayMeta {
  sessionId?: string;
  operationId?: string;
  emoji?: string;
  timestamp?: number;
  duration?: number;
}

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  message?: string;
  operationId: string;
}

export interface OperationResult {
  success: boolean;
  message?: string;
  data?: unknown;
  duration?: number;
  memoryUsage?: number;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// ============================================================================
// MEMORY MANAGEMENT MOCKS - Emergency Response System
// ============================================================================

/**
 * ExtremeMemoryManager Mock - Multi-Tier Emergency Response
 * Tests behavior under 95%/99%/99.5% memory pressure thresholds
 */
export const createMemoryManagerMock = () => ({
  // Memory pressure simulation
  evaluateMemoryPressure: jest.fn(),
  transitionToTier: jest.fn(),
  getCurrentTier: jest.fn().mockReturnValue(0),
  
  // Emergency response behavior
  enableEmergencyMode: jest.fn(),
  disableEmergencyMode: jest.fn(),
  activateCriticalShutdown: jest.fn(),
  
  // Memory monitoring
  getMemoryPressure: jest.fn().mockReturnValue(0.85), // Default: normal mode
  getMemoryStats: jest.fn().mockReturnValue({
    used: 1024 * 1024 * 1024, // 1GB
    total: 2048 * 1024 * 1024, // 2GB
    pressure: 0.5
  }),
  
  // Configuration management
  reconfigureBatching: jest.fn(),
  enableFeatures: jest.fn(),
  disableFeatures: jest.fn(),
  
  // Contract: Memory pressure tier thresholds
  MEMORY_TIERS: {
    NORMAL: 0.90,
    EMERGENCY: 0.95,
    EXTREME: 0.99,
    CRITICAL: 0.995
  }
});

// ============================================================================
// SESSION MANAGEMENT MOCKS - File System Interactions
// ============================================================================

/**
 * SessionManager Mock - Organized File Structure & Correlation
 * Tests session-based file logging behavior
 */
export const createSessionManagerMock = () => ({
  // Session lifecycle
  createSession: jest.fn().mockResolvedValue('session-123'),
  getSessionPath: jest.fn().mockReturnValue('./claude/sessions/test/session-123.log'),
  closeSession: jest.fn().mockResolvedValue(void 0),
  
  // File operations - with memory-aware batching
  writeToSession: jest.fn().mockResolvedValue(void 0),
  flushSession: jest.fn().mockResolvedValue(void 0),
  batchWrite: jest.fn().mockResolvedValue(void 0),
  
  // Directory management
  ensureSessionDirectory: jest.fn().mockResolvedValue('./claude/sessions/test/'),
  cleanupOldSessions: jest.fn().mockResolvedValue(5), // Files cleaned
  
  // Correlation tracking
  correlateWithClaudeCode: jest.fn(),
  getCorrelationId: jest.fn().mockReturnValue('corr-456'),
  
  // Emergency behavior
  enableEmergencyMode: jest.fn(),
  getEmergencyStatus: jest.fn().mockReturnValue({ level: 0, active: false }),
  
  // Performance metrics
  getWriteLatency: jest.fn().mockReturnValue(25), // ms
  getBufferSize: jest.fn().mockReturnValue(1024), // bytes
  getBatchCount: jest.fn().mockReturnValue(10)
});

// ============================================================================
// HUMAN FORMATTER MOCKS - User-Friendly Output
// ============================================================================

/**
 * HumanFormatter Mock - Emoji-Enhanced User Messages
 * Tests user-facing message formatting behavior
 */
export const createHumanFormatterMock = () => ({
  // Message formatting
  formatUserInfo: jest.fn().mockReturnValue('✅ Test message [sess:abc123]'),
  formatUserSuccess: jest.fn().mockReturnValue('🎯 Success message [sess:abc123]'),
  formatUserWarning: jest.fn().mockReturnValue('⚠️  Warning message [sess:abc123]'),
  formatUserError: jest.fn().mockReturnValue('❌ Error message [sess:abc123]'),
  
  // Progress formatting
  formatProgress: jest.fn().mockReturnValue('🔄 Progress: 50% (5/10) [sess:abc123]'),
  formatOperation: jest.fn().mockReturnValue('🚀 Operation started [sess:abc123]'),
  formatCompletion: jest.fn().mockReturnValue('✨ Operation complete (125ms) [sess:abc123]'),
  
  // Emergency mode formatting
  formatEmergencyNotice: jest.fn().mockReturnValue('⚠️  Emergency level 1: High memory pressure [sess:abc123]'),
  formatCriticalShutdown: jest.fn().mockReturnValue('🚨 Critical memory - console-only mode activated'),
  
  // Memory pressure indicators
  formatMemoryPressure: jest.fn().mockReturnValue('📊 Memory: 95.5% (emergency mode)'),
  
  // Session correlation
  formatSessionReference: jest.fn().mockReturnValue('[sess:abc123]'),
  truncateSessionId: jest.fn().mockReturnValue('abc123'),
  
  // Performance constraints
  getFormatLatency: jest.fn().mockReturnValue(2), // ms - must be <10ms
  getMessageLength: jest.fn().mockReturnValue(65) // chars - should be <80
});

// ============================================================================
// COMPONENT LOGGER FACTORY MOCKS - Integration with Existing System
// ============================================================================

/**
 * ComponentLoggerFactory Mock - Enhanced Factory with Dual-Stream
 * Tests integration with existing logging infrastructure
 */
export const createComponentLoggerFactoryMock = () => ({
  // Factory methods - enhanced with IOutputManager
  getOutputManager: jest.fn(),
  getCLILogger: jest.fn(),
  getMCPLogger: jest.fn(),
  getSwarmLogger: jest.fn(),
  
  // Existing methods - preserved for backward compatibility
  getLogger: jest.fn(),
  getCoreLogger: jest.fn(),
  getTerminalLogger: jest.fn(),
  getMemoryLogger: jest.fn(),
  getMigrationLogger: jest.fn(),
  getHooksLogger: jest.fn(),
  getEnterpriseLogger: jest.fn(),
  
  // System management
  initializeDebugLogger: jest.fn(),
  getUsageAnalytics: jest.fn().mockReturnValue({
    totalCalls: 1250,
    symbolUsage: {},
    componentBreakdown: {},
    memoryPressure: 0.85,
    avgResponseTime: 15
  }),
  
  // Memory management integration
  getMemoryPressure: jest.fn().mockReturnValue(0.85),
  enableEmergencyMode: jest.fn(),
  disableEmergencyMode: jest.fn(),
  
  // Contract: Zero breaking changes to existing interface
  BACKWARD_COMPATIBILITY: true
});

// ============================================================================
// PII DETECTION MOCKS - Lightweight Security
// ============================================================================

/**
 * MinimalPIIDetector Mock - Security with Minimal Overhead
 * Tests PII detection behavior under memory constraints
 */
export const createPIIDetectorMock = () => ({
  // Core detection methods
  quickRedact: jest.fn().mockImplementation((content: string) => content.replace(/\d{4}-\d{4}-\d{4}-\d{4}/g, '[CARD]')),
  emergencyRedact: jest.fn().mockImplementation((content: string) => content.replace(/secret/gi, '[REDACTED]')),
  
  // Pattern detection
  detectAPIKeys: jest.fn().mockReturnValue(['api_key_123']),
  detectCreditCards: jest.fn().mockReturnValue(['4111-1111-1111-1111']),
  detectSSN: jest.fn().mockReturnValue([]),
  
  // Performance monitoring
  getDetectionLatency: jest.fn().mockReturnValue(3), // ms - must be <5ms
  getPatternCount: jest.fn().mockReturnValue(3), // Number of patterns checked
  
  // Emergency mode behavior
  enableEmergencyMode: jest.fn(),
  isEmergencyMode: jest.fn().mockReturnValue(false),
  
  // Configuration
  updatePatterns: jest.fn(),
  getPatternConfig: jest.fn().mockReturnValue({
    apiKey: true,
    creditCard: true,
    ssn: false // Disabled in emergency mode
  })
});

// ============================================================================
// STDOUT/STDERR MOCKS - MCP Protocol Compliance
// ============================================================================

/**
 * Process Stream Mocks - MCP Protocol Preservation
 * Tests stdout/stderr routing behavior for MCP compliance
 */
export const createProcessStreamMocks = () => ({
  stdout: {
    write: jest.fn().mockImplementation((data: string) => true),
    isTTY: true,
    columns: 80,
    rows: 24
  },
  stderr: {
    write: jest.fn().mockImplementation((data: string) => true),
    isTTY: true,
    columns: 80,
    rows: 24
  },
  
  // MCP compliance verification
  verifyStdoutOnlyForUser: jest.fn(),
  verifyStderrForMCP: jest.fn(),
  
  // Performance tracking
  getWriteLatency: jest.fn().mockReturnValue(1), // ms
  getBufferStatus: jest.fn().mockReturnValue('ready')
});

// ============================================================================
// FILE SYSTEM MOCKS - Session File Operations
// ============================================================================

/**
 * File System Mock - Memory-Aware File Operations
 * Tests file I/O behavior under memory constraints
 */
export const createFileSystemMock = () => ({
  // File operations
  appendFile: jest.fn().mockResolvedValue(void 0),
  writeFile: jest.fn().mockResolvedValue(void 0),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
  mkdir: jest.fn().mockResolvedValue('./claude/sessions/test/'),
  stat: jest.fn().mockResolvedValue({ size: 1024, mtime: new Date() }),
  
  // Directory operations
  readdir: jest.fn().mockResolvedValue(['session1.log', 'session2.log']),
  rmdir: jest.fn().mockResolvedValue(void 0),
  unlink: jest.fn().mockResolvedValue(void 0),
  
  // Stream operations for large files
  createWriteStream: jest.fn().mockReturnValue({
    write: jest.fn(),
    end: jest.fn(),
    close: jest.fn()
  }),
  
  // Emergency behavior
  enableEmergencyMode: jest.fn(),
  getIOLatency: jest.fn().mockReturnValue(45), // ms - should be <100ms
  getBufferSize: jest.fn().mockReturnValue(512), // bytes
  
  // Performance metrics
  getTotalWrites: jest.fn().mockReturnValue(156),
  getFailedWrites: jest.fn().mockReturnValue(0),
  getAverageLatency: jest.fn().mockReturnValue(38) // ms
});

// ============================================================================
// SWARM COORDINATION MOCKS - Cross-Agent Memory Sharing
// ============================================================================

/**
 * Swarm Memory Coordinator Mock - Cross-Agent Communication
 * Tests memory coordination between swarm agents
 */
export const createSwarmMemoryMock = () => ({
  // Memory sharing
  storeTestStrategy: jest.fn().mockResolvedValue('strategy-id-789'),
  retrieveTestStrategy: jest.fn().mockResolvedValue({
    strategy: 'london-school',
    coverage: 0.95,
    memoryConstraints: true
  }),
  
  // Coverage coordination
  shareCoverageMetrics: jest.fn().mockResolvedValue(void 0),
  aggregateCoverage: jest.fn().mockReturnValue({
    lines: 0.96,
    branches: 0.94,
    functions: 0.98,
    statements: 0.97
  }),
  
  // Test result sharing
  shareTestResults: jest.fn().mockResolvedValue(void 0),
  getSwarmTestStatus: jest.fn().mockReturnValue({
    totalAgents: 3,
    completedAgents: 2,
    passingTests: 87,
    failingTests: 3
  }),
  
  // Emergency coordination
  broadcastEmergencyMode: jest.fn().mockResolvedValue(void 0),
  getSwarmMemoryPressure: jest.fn().mockReturnValue(0.89),
  
  // Contract verification
  verifyMockContracts: jest.fn().mockReturnValue(true),
  validateInteractions: jest.fn().mockReturnValue([])
});

// ============================================================================
// PERFORMANCE MONITORING MOCKS - Extreme Memory Testing
// ============================================================================

/**
 * Performance Monitor Mock - Memory Leak Detection & Benchmarking
 * Tests performance behavior under extreme memory constraints
 */
export const createPerformanceMonitorMock = () => ({
  // Memory leak detection
  detectMemoryLeaks: jest.fn().mockResolvedValue([]),
  trackMemoryUsage: jest.fn(),
  getMemoryDelta: jest.fn().mockReturnValue(-512), // bytes - negative means freed
  
  // Performance benchmarking
  benchmarkStdoutLatency: jest.fn().mockResolvedValue(3.2), // ms
  benchmarkFileIOLatency: jest.fn().mockResolvedValue(42.8), // ms
  benchmarkMemoryOverhead: jest.fn().mockResolvedValue(0.03), // 3%
  
  // Emergency response timing
  benchmarkEmergencyResponse: jest.fn().mockResolvedValue(28), // ms
  benchmarkTierSwitching: jest.fn().mockResolvedValue(15), // ms
  benchmarkCriticalShutdown: jest.fn().mockResolvedValue(8), // ms
  
  // Real-time monitoring
  startPerformanceMonitoring: jest.fn(),
  stopPerformanceMonitoring: jest.fn(),
  getPerformanceReport: jest.fn().mockReturnValue({
    avgStdoutLatency: 3.1,
    avgFileLatency: 41.2,
    memoryOverhead: 0.028,
    emergencyActivations: 2,
    memoryLeaksDetected: 0
  }),
  
  // Threshold validation
  validatePerformanceTargets: jest.fn().mockReturnValue({
    stdoutLatency: { target: 10, actual: 3.1, passed: true },
    fileIOLatency: { target: 100, actual: 41.2, passed: true },
    memoryOverhead: { target: 0.05, actual: 0.028, passed: true },
    emergencyResponse: { target: 50, actual: 28, passed: true }
  })
});

// ============================================================================
// MOCK FACTORY FUNCTIONS - Easy Test Setup
// ============================================================================

/**
 * Complete Mock Suite Factory - London School TDD Setup
 * Creates all mocks needed for comprehensive behavior testing
 */
export const createCompleteCliLoggingMocks = () => ({
  memoryManager: createMemoryManagerMock(),
  sessionManager: createSessionManagerMock(),
  humanFormatter: createHumanFormatterMock(),
  componentLoggerFactory: createComponentLoggerFactoryMock(),
  piiDetector: createPIIDetectorMock(),
  processStreams: createProcessStreamMocks(),
  fileSystem: createFileSystemMock(),
  swarmMemory: createSwarmMemoryMock(),
  performanceMonitor: createPerformanceMonitorMock(),
  
  // Mock coordination helpers
  resetAllMocks: () => {
    jest.clearAllMocks();
  },
  
  verifyAllInteractions: () => {
    // Verify that all mocks were called as expected
    return {
      memoryManagerCalls: jest.mocked(createMemoryManagerMock().evaluateMemoryPressure).mock.calls.length,
      sessionManagerCalls: jest.mocked(createSessionManagerMock().writeToSession).mock.calls.length,
      formatterCalls: jest.mocked(createHumanFormatterMock().formatUserInfo).mock.calls.length
    };
  },
  
  simulateMemoryPressure: (pressure: number) => {
    const mocks = createCompleteCliLoggingMocks();
    mocks.memoryManager.getMemoryPressure.mockReturnValue(pressure);
    
    if (pressure >= 0.995) {
      mocks.memoryManager.getCurrentTier.mockReturnValue(3);
    } else if (pressure >= 0.99) {
      mocks.memoryManager.getCurrentTier.mockReturnValue(2);
    } else if (pressure >= 0.95) {
      mocks.memoryManager.getCurrentTier.mockReturnValue(1);
    } else {
      mocks.memoryManager.getCurrentTier.mockReturnValue(0);
    }
    
    return mocks;
  }
});

// ============================================================================
// MOCK CONTRACT VALIDATION - London School Quality Gates
// ============================================================================

/**
 * Mock Contract Validator - Ensures Mock Fidelity
 * Validates that mocks accurately represent real interfaces
 */
export const validateMockContracts = {
  /**
   * Validates IOutputManager mock matches expected interface
   */
  validateOutputManagerContract: (mock: any): boolean => {
    const requiredMethods = [
      'userInfo', 'userSuccess', 'userWarning', 'userError',
      'startOperation', 'updateProgress', 'completeOperation',
      'debugSession', 'activateEmergencyMode', 'isEmergencyMode',
      'getMemoryPressure', 'criticalMemoryShutdown'
    ];
    
    return requiredMethods.every(method => typeof mock[method] === 'function');
  },
  
  /**
   * Validates memory manager mock behavior consistency
   */
  validateMemoryManagerContract: (mock: any): boolean => {
    const memoryPressure = mock.getMemoryPressure();
    const currentTier = mock.getCurrentTier();
    
    // Contract: Memory tier should match pressure
    if (memoryPressure >= 0.995) return currentTier === 3;
    if (memoryPressure >= 0.99) return currentTier === 2;
    if (memoryPressure >= 0.95) return currentTier === 1;
    return currentTier === 0;
  },
  
  /**
   * Validates performance targets are realistic
   */
  validatePerformanceContract: (mock: any): boolean => {
    const targets = mock.validatePerformanceTargets();
    
    return (
      targets.stdoutLatency.actual <= 10 &&
      targets.fileIOLatency.actual <= 100 &&
      targets.memoryOverhead.actual <= 0.05 &&
      targets.emergencyResponse.actual <= 50
    );
  }
};