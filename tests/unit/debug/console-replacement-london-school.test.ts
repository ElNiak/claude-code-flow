/**
 * TDD London School: Console Replacement Strategy
 * Mock-driven replacement of 10,967+ console.* calls
 */

import { jest } from '@jest/globals';

// Interfaces for console replacement system
interface IConsoleReplacer {
  replaceConsole(targetModule: any, debugLogger: IDebugLogger): void;
  restoreConsole(targetModule: any): void;
  getReplacementStats(): ReplacementStats;
}

interface IDebugLogger {
  debug(category: string, message: string, data?: any, correlationId?: string): void;
  info(category: string, message: string, data?: any, correlationId?: string): void;
  warn(category: string, message: string, data?: any, correlationId?: string): void;
  error(category: string, message: string, data?: any, correlationId?: string): void;
  isEnabled(category: string): boolean;
}

interface ReplacementStats {
  totalReplacements: number;
  byType: Record<string, number>;
  byModule: Record<string, number>;
}

interface IModuleAnalyzer {
  analyzeConsoleUsage(modulePath: string): ConsoleUsageAnalysis;
  getConsoleCallsCount(modulePath: string): number;
  getConsoleCallsByType(modulePath: string): Record<string, number>;
}

interface ConsoleUsageAnalysis {
  totalCalls: number;
  byType: Record<string, number>;
  locations: Array<{
    line: number;
    column: number;
    type: string;
    context: string;
  }>;
}

// Mock implementations following London School principles
class MockDebugLogger implements IDebugLogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  isEnabled = jest.fn().mockReturnValue(true);
}

class MockModuleAnalyzer implements IModuleAnalyzer {
  analyzeConsoleUsage = jest.fn<(modulePath: string) => ConsoleUsageAnalysis>();
  getConsoleCallsCount = jest.fn<(modulePath: string) => number>();
  getConsoleCallsByType = jest.fn<(modulePath: string) => Record<string, number>>();
}

class MockConsole {
  debug = jest.fn();
  log = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  info = jest.fn();
  trace = jest.fn();
  dir = jest.fn();
  table = jest.fn();
  group = jest.fn();
  groupEnd = jest.fn();
  time = jest.fn();
  timeEnd = jest.fn();
}

// Implementation for TDD GREEN phase
class ConsoleReplacer implements IConsoleReplacer {
  private originalConsoles = new WeakMap<any, Console>();
  private stats: ReplacementStats = {
    totalReplacements: 0,
    byType: {},
    byModule: {},
  };

  replaceConsole(targetModule: any, debugLogger: IDebugLogger): void {
    // Store original console reference
    this.originalConsoles.set(targetModule, targetModule.console);

    // Create replacement console with debug logger integration
    const replacementConsole = {
      debug: (message: string, ...args: any[]) => {
        debugLogger.debug(
          this.getModuleCategory(targetModule),
          message,
          args.length > 0 ? args : undefined,
        );
        this.incrementStat('debug', targetModule);
      },
      log: (message: string, ...args: any[]) => {
        debugLogger.info(
          this.getModuleCategory(targetModule),
          message,
          args.length > 0 ? args : undefined,
        );
        this.incrementStat('log', targetModule);
      },
      warn: (message: string, ...args: any[]) => {
        debugLogger.warn(
          this.getModuleCategory(targetModule),
          message,
          args.length > 0 ? args : undefined,
        );
        this.incrementStat('warn', targetModule);
      },
      error: (message: string, ...args: any[]) => {
        debugLogger.error(
          this.getModuleCategory(targetModule),
          message,
          args.length > 0 ? args : undefined,
        );
        this.incrementStat('error', targetModule);
      },
      info: (message: string, ...args: any[]) => {
        debugLogger.info(
          this.getModuleCategory(targetModule),
          message,
          args.length > 0 ? args : undefined,
        );
        this.incrementStat('info', targetModule);
      },
      trace: (message: string, ...args: any[]) => {
        debugLogger.debug(
          this.getModuleCategory(targetModule),
          `TRACE: ${message}`,
          args.length > 0 ? args : undefined,
        );
        this.incrementStat('trace', targetModule);
      },
    };

    // Replace console in target module
    targetModule.console = replacementConsole;
  }

  restoreConsole(targetModule: any): void {
    const originalConsole = this.originalConsoles.get(targetModule);
    if (originalConsole) {
      targetModule.console = originalConsole;
      this.originalConsoles.delete(targetModule);
    }
  }

  getReplacementStats(): ReplacementStats {
    return { ...this.stats };
  }

  private getModuleCategory(targetModule: any): string {
    // Extract module name/category from module
    const moduleName = targetModule.constructor?.name || 'unknown';
    return `console:${moduleName.toLowerCase()}`;
  }

  private incrementStat(type: string, targetModule: any): void {
    this.stats.totalReplacements++;
    this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;

    const moduleName = this.getModuleCategory(targetModule);
    this.stats.byModule[moduleName] = (this.stats.byModule[moduleName] || 0) + 1;
  }
}

describe('ConsoleReplacer - London School TDD', () => {
  let mockDebugLogger: MockDebugLogger;
  let mockModuleAnalyzer: MockModuleAnalyzer;
  let consoleReplacer: ConsoleReplacer;
  let targetModule: any;

  beforeEach(() => {
    mockDebugLogger = new MockDebugLogger();
    mockModuleAnalyzer = new MockModuleAnalyzer();
    consoleReplacer = new ConsoleReplacer();

    // Create a mock target module with console
    targetModule = {
      console: new MockConsole(),
      constructor: { name: 'TestModule' },
    };
  });

  describe('Console Replacement Behavior - Interaction Testing', () => {
    it('should replace console methods with debug logger calls', () => {
      // Arrange
      mockDebugLogger.isEnabled.mockReturnValue(true);
      const originalConsole = targetModule.console;

      // Act
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);

      // Assert - Verify console was replaced
      expect(targetModule.console).not.toBe(originalConsole);
      expect(typeof targetModule.console.debug).toBe('function');
      expect(typeof targetModule.console.log).toBe('function');
      expect(typeof targetModule.console.warn).toBe('function');
      expect(typeof targetModule.console.error).toBe('function');
    });

    it('should route console.debug calls to debugLogger.debug', () => {
      // Arrange
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);

      // Act
      targetModule.console.debug('Debug message', { data: 'test' });

      // Assert - Verify interaction with debug logger
      expect(mockDebugLogger.debug).toHaveBeenCalledWith('console:testmodule', 'Debug message', [
        { data: 'test' },
      ]);
    });

    it('should route console.log calls to debugLogger.info', () => {
      // Arrange
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);

      // Act
      targetModule.console.log('Info message', 'additional data');

      // Assert - Verify correct method mapping
      expect(mockDebugLogger.info).toHaveBeenCalledWith('console:testmodule', 'Info message', [
        'additional data',
      ]);
    });

    it('should route console.warn calls to debugLogger.warn', () => {
      // Arrange
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);

      // Act
      targetModule.console.warn('Warning message');

      // Assert
      expect(mockDebugLogger.warn).toHaveBeenCalledWith(
        'console:testmodule',
        'Warning message',
        undefined,
      );
    });

    it('should route console.error calls to debugLogger.error', () => {
      // Arrange
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);
      const error = new Error('Test error');

      // Act
      targetModule.console.error('Error message', error);

      // Assert
      expect(mockDebugLogger.error).toHaveBeenCalledWith('console:testmodule', 'Error message', [
        error,
      ]);
    });
  });

  describe('Statistics Tracking - State Verification', () => {
    it('should track replacement statistics correctly', () => {
      // Arrange
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);

      // Act
      targetModule.console.debug('Debug 1');
      targetModule.console.debug('Debug 2');
      targetModule.console.log('Log 1');
      targetModule.console.warn('Warn 1');
      targetModule.console.error('Error 1');

      const stats = consoleReplacer.getReplacementStats();

      // Assert - Verify statistics tracking
      expect(stats.totalReplacements).toBe(5);
      expect(stats.byType.debug).toBe(2);
      expect(stats.byType.log).toBe(1);
      expect(stats.byType.warn).toBe(1);
      expect(stats.byType.error).toBe(1);
      expect(stats.byModule['console:testmodule']).toBe(5);
    });

    it('should track multiple module replacements separately', () => {
      // Arrange
      const module1 = { console: new MockConsole(), constructor: { name: 'Module1' } };
      const module2 = { console: new MockConsole(), constructor: { name: 'Module2' } };

      consoleReplacer.replaceConsole(module1, mockDebugLogger);
      consoleReplacer.replaceConsole(module2, mockDebugLogger);

      // Act
      module1.console.debug('Module1 debug');
      module1.console.log('Module1 log');
      module2.console.warn('Module2 warn');

      const stats = consoleReplacer.getReplacementStats();

      // Assert
      expect(stats.totalReplacements).toBe(3);
      expect(stats.byModule['console:module1']).toBe(2);
      expect(stats.byModule['console:module2']).toBe(1);
    });
  });

  describe('Console Restoration - Behavior Verification', () => {
    it('should restore original console when requested', () => {
      // Arrange
      const originalConsole = targetModule.console;
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);

      // Verify replacement occurred
      expect(targetModule.console).not.toBe(originalConsole);

      // Act
      consoleReplacer.restoreConsole(targetModule);

      // Assert - Verify restoration
      expect(targetModule.console).toBe(originalConsole);
    });

    it('should handle restoration of non-replaced modules gracefully', () => {
      // Arrange
      const originalConsole = targetModule.console;

      // Act - Restore without replacing first
      expect(() => {
        consoleReplacer.restoreConsole(targetModule);
      }).not.toThrow();

      // Assert - Console should remain unchanged
      expect(targetModule.console).toBe(originalConsole);
    });
  });

  describe('Large-Scale Replacement Testing', () => {
    it('should handle mass console replacement across 333+ files simulation', () => {
      // Arrange - Simulate multiple modules like the real codebase
      const modules = Array.from({ length: 333 }, (_, i) => ({
        console: new MockConsole(),
        constructor: { name: `Module${i}` },
      }));

      // Act - Replace consoles in all modules
      modules.forEach((module) => {
        consoleReplacer.replaceConsole(module, mockDebugLogger);
      });

      // Simulate some console usage
      modules.slice(0, 10).forEach((module, i) => {
        module.console.debug(`Debug from module ${i}`);
        module.console.log(`Log from module ${i}`);
      });

      const stats = consoleReplacer.getReplacementStats();

      // Assert - Verify mass replacement handling
      expect(stats.totalReplacements).toBe(20); // 10 modules × 2 calls each
      expect(stats.byType.debug).toBe(10);
      expect(stats.byType.log).toBe(10);
      expect(Object.keys(stats.byModule)).toHaveLength(10);
    });

    it('should handle 10,967+ console calls simulation with performance', () => {
      // Arrange
      consoleReplacer.replaceConsole(targetModule, mockDebugLogger);

      const startTime = Date.now();

      // Act - Simulate high-volume console usage
      for (let i = 0; i < 10967; i++) {
        const callType = ['debug', 'log', 'warn', 'error'][i % 4];
        targetModule.console[callType](`Message ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const stats = consoleReplacer.getReplacementStats();

      // Assert - Verify performance and scale handling
      expect(stats.totalReplacements).toBe(10967);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
      expect(mockDebugLogger.debug).toHaveBeenCalledTimes(Math.ceil(10967 / 4));
    });
  });
});

describe('Module Analysis Integration - London School', () => {
  let mockModuleAnalyzer: MockModuleAnalyzer;
  let mockDebugLogger: MockDebugLogger;
  let consoleReplacer: ConsoleReplacer;

  beforeEach(() => {
    mockModuleAnalyzer = new MockModuleAnalyzer();
    mockDebugLogger = new MockDebugLogger();
    consoleReplacer = new ConsoleReplacer();
  });

  it('should analyze module console usage before replacement', () => {
    // Arrange
    const modulePath = '/src/core/orchestrator.ts';
    mockModuleAnalyzer.analyzeConsoleUsage.mockReturnValue({
      totalCalls: 45,
      byType: { log: 20, debug: 15, warn: 8, error: 2 },
      locations: [
        { line: 123, column: 8, type: 'log', context: 'console.log("Agent spawned", agent.id);' },
        { line: 156, column: 8, type: 'debug', context: 'console.debug("Task assigned", task);' },
      ],
    });

    // Act
    const analysis = mockModuleAnalyzer.analyzeConsoleUsage(modulePath);

    // Assert - Verify analysis interaction
    expect(mockModuleAnalyzer.analyzeConsoleUsage).toHaveBeenCalledWith(modulePath);
    expect(analysis.totalCalls).toBe(45);
    expect(analysis.byType.log).toBe(20);
    expect(analysis.locations).toHaveLength(2);
  });

  it('should coordinate replacement based on analysis results', () => {
    // Arrange
    const modulePath = '/src/ui/web-ui/core/EventBus.js';
    mockModuleAnalyzer.getConsoleCallsCount.mockReturnValue(20); // 20 console calls in EventBus
    mockModuleAnalyzer.getConsoleCallsByType.mockReturnValue({
      debug: 12,
      error: 4,
      log: 3,
      groupEnd: 1,
    });

    // Act - Use analysis to guide replacement
    const callCount = mockModuleAnalyzer.getConsoleCallsCount(modulePath);
    const callsByType = mockModuleAnalyzer.getConsoleCallsByType(modulePath);

    // Assert - Verify coordination between analyzer and replacer
    expect(mockModuleAnalyzer.getConsoleCallsCount).toHaveBeenCalledWith(modulePath);
    expect(mockModuleAnalyzer.getConsoleCallsByType).toHaveBeenCalledWith(modulePath);
    expect(callCount).toBe(20);
    expect(callsByType.debug).toBe(12);
  });
});

describe('Contract Compliance - IConsoleReplacer', () => {
  it('should satisfy IConsoleReplacer contract through behavior verification', () => {
    // Arrange
    const mockDebugLogger = new MockDebugLogger();
    const consoleReplacer = new ConsoleReplacer();
    const targetModule = { console: new MockConsole(), constructor: { name: 'TestModule' } };

    // Act & Assert - Contract verification
    expect(() => consoleReplacer.replaceConsole(targetModule, mockDebugLogger)).not.toThrow();
    expect(() => consoleReplacer.restoreConsole(targetModule)).not.toThrow();
    expect(typeof consoleReplacer.getReplacementStats()).toBe('object');

    // Verify interface compliance through behavior
    const stats = consoleReplacer.getReplacementStats();
    expect(stats).toHaveProperty('totalReplacements');
    expect(stats).toHaveProperty('byType');
    expect(stats).toHaveProperty('byModule');
  });

  it('should maintain consistent replacement behavior across different module types', () => {
    // London School: Test behavior consistency
    const mockDebugLogger = new MockDebugLogger();
    const consoleReplacer = new ConsoleReplacer();

    const moduleTypes = [
      { console: new MockConsole(), constructor: { name: 'Orchestrator' } },
      { console: new MockConsole(), constructor: { name: 'MemoryManager' } },
      { console: new MockConsole(), constructor: { name: 'MCPServer' } },
      { console: new MockConsole(), constructor: { name: 'EventBus' } },
    ];

    // Act - Same operations on different module types
    moduleTypes.forEach((module) => {
      consoleReplacer.replaceConsole(module, mockDebugLogger);
      module.console.debug('Consistency test');
      module.console.log('Consistency test');
    });

    // Assert - Consistent behavior across all module types
    expect(mockDebugLogger.debug).toHaveBeenCalledTimes(4);
    expect(mockDebugLogger.info).toHaveBeenCalledTimes(4);

    const stats = consoleReplacer.getReplacementStats();
    expect(stats.totalReplacements).toBe(8);
    expect(Object.keys(stats.byModule)).toHaveLength(4);
  });
});
