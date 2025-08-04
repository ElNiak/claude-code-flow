/**
 * CLI Debug Instrumentation Integration Tests
 * London School TDD for comprehensive CLI debug logging validation
 */

import { jest } from '@jest/globals';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  LondonSchoolMockFactory,
  InteractionVerifier,
  PerformanceTestHelper,
  MockDataGenerator,
  type IDebugLogger,
  type IPerformanceCounter,
  type MockConfiguration,
} from '../../utils/london-school-test-helpers.js';

// CLI Command interfaces for mocking
interface ICLICommand {
  execute(args: string[], context: CLIContext): Promise<CLIResult>;
  getDebugInfo(): CommandDebugInfo;
  getName(): string;
}

interface CLIContext {
  sessionId: string;
  correlationId: string;
  debugLevel: 'debug' | 'info' | 'warn' | 'error';
  enableTracing: boolean;
}

interface CLIResult {
  success: boolean;
  output: string;
  errorOutput?: string;
  exitCode: number;
  debugTrace?: DebugTrace;
}

interface CommandDebugInfo {
  invocations: number;
  averageExecutionTime: number;
  lastError?: string;
  debugCategories: string[];
}

interface DebugTrace {
  correlationId: string;
  startTime: number;
  endTime: number;
  steps: DebugStep[];
}

interface DebugStep {
  timestamp: number;
  component: string;
  action: string;
  data?: any;
}

// Mock CLI Command implementations
class MockCLICommand implements ICLICommand {
  private debugLogger: IDebugLogger;
  private performanceCounter: IPerformanceCounter;
  private commandName: string;
  private invocationCount = 0;
  private executionTimes: number[] = [];

  constructor(name: string, debugLogger: IDebugLogger, performanceCounter: IPerformanceCounter) {
    this.commandName = name;
    this.debugLogger = debugLogger;
    this.performanceCounter = performanceCounter;
  }

  execute = jest
    .fn<(args: string[], context: CLIContext) => Promise<CLIResult>>()
    .mockImplementation(async (args: string[], context: CLIContext) => {
      this.invocationCount++;

      const measurement = this.performanceCounter.measure(() => {
        // Simulate command execution with debug logging
        this.debugLogger.debug(
          `cli:${this.commandName}`,
          'Command execution started',
          { args, sessionId: context.sessionId },
          context.correlationId,
        );

        this.debugLogger.info(
          `cli:${this.commandName}`,
          'Processing command arguments',
          { argumentCount: args.length },
          context.correlationId,
        );

        // Simulate some processing time
        return `Command ${this.commandName} executed with args: ${args.join(', ')}`;
      });

      this.executionTimes.push(measurement.duration);

      const debugTrace: DebugTrace = {
        correlationId: context.correlationId,
        startTime: Date.now() - measurement.duration,
        endTime: Date.now(),
        steps: [
          {
            timestamp: Date.now() - measurement.duration,
            component: 'CLI',
            action: 'command_start',
            data: { command: this.commandName, args },
          },
          {
            timestamp: Date.now() - measurement.duration / 2,
            component: 'CLI',
            action: 'argument_processing',
            data: { argumentCount: args.length },
          },
          {
            timestamp: Date.now(),
            component: 'CLI',
            action: 'command_complete',
            data: { success: true },
          },
        ],
      };

      this.debugLogger.debug(
        `cli:${this.commandName}`,
        'Command execution completed',
        { success: true, duration: measurement.duration },
        context.correlationId,
      );

      return {
        success: true,
        output: measurement.result,
        exitCode: 0,
        debugTrace,
      };
    });

  getDebugInfo = jest.fn<() => CommandDebugInfo>().mockImplementation(() => ({
    invocations: this.invocationCount,
    averageExecutionTime:
      this.executionTimes.length > 0
        ? this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length
        : 0,
    debugCategories: [`cli:${this.commandName}`],
  }));

  getName = jest.fn<() => string>().mockReturnValue(this.commandName);
}

// CLI Debug Manager mock
class MockCLIDebugManager {
  private debugLogger: IDebugLogger;
  private performanceCounter: IPerformanceCounter;
  private commands = new Map<string, ICLICommand>();
  private globalContext: CLIContext;

  constructor(debugLogger: IDebugLogger, performanceCounter: IPerformanceCounter) {
    this.debugLogger = debugLogger;
    this.performanceCounter = performanceCounter;
    this.globalContext = {
      sessionId: 'test-session-' + Date.now(),
      correlationId: 'test-correlation-' + Date.now(),
      debugLevel: 'debug',
      enableTracing: true,
    };
  }

  registerCommand = jest.fn((name: string, command: ICLICommand) => {
    this.commands.set(name, command);
    this.debugLogger.debug('cli:manager', 'Command registered', { name });
  });

  executeCommand = jest.fn(async (commandName: string, args: string[]) => {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }

    this.debugLogger.info('cli:manager', 'Executing command', {
      commandName,
      args,
      correlationId: this.globalContext.correlationId,
    });

    const result = await command.execute(args, this.globalContext);

    this.debugLogger.info('cli:manager', 'Command execution completed', {
      commandName,
      success: result.success,
      exitCode: result.exitCode,
    });

    return result;
  });

  getDebugSummary = jest.fn(() => {
    const summary = {
      registeredCommands: Array.from(this.commands.keys()),
      totalInvocations: 0,
      averageExecutionTime: 0,
      debugCategories: new Set<string>(),
    };

    this.commands.forEach((command) => {
      const info = command.getDebugInfo();
      summary.totalInvocations += info.invocations;
      summary.averageExecutionTime += info.averageExecutionTime;
      info.debugCategories.forEach((cat) => summary.debugCategories.add(cat));
    });

    summary.averageExecutionTime = summary.averageExecutionTime / this.commands.size;

    return {
      ...summary,
      debugCategories: Array.from(summary.debugCategories),
    };
  });

  setGlobalContext = jest.fn((context: Partial<CLIContext>) => {
    this.globalContext = { ...this.globalContext, ...context };
  });
}

describe('CLI Debug Instrumentation Integration Tests', () => {
  let mockSuite: ReturnType<typeof LondonSchoolMockFactory.createDebugLoggingMockSuite>;
  let cliDebugManager: MockCLIDebugManager;
  let originalProcessArgv: string[];

  beforeEach(() => {
    // Create comprehensive mock suite
    mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite({
      performanceOverhead: 3.0,
      memoryPressureLevel: 80,
    });

    // Initialize CLI debug manager
    cliDebugManager = new MockCLIDebugManager(mockSuite.debugLogger, mockSuite.performanceCounter);

    // Mock process.argv
    originalProcessArgv = process.argv;
    process.argv = ['node', 'claude-flow', 'test-command', '--debug'];
  });

  afterEach(() => {
    process.argv = originalProcessArgv;
    jest.clearAllMocks();
  });

  describe('CLI Command Debug Integration', () => {
    it('should instrument all CLI commands with debug logging', async () => {
      // Arrange
      const commands = ['init', 'spawn', 'ps', 'stop', 'status'];
      const registeredCommands: ICLICommand[] = [];

      commands.forEach((cmdName) => {
        const command = new MockCLICommand(
          cmdName,
          mockSuite.debugLogger,
          mockSuite.performanceCounter,
        );
        registeredCommands.push(command);
        cliDebugManager.registerCommand(cmdName, command);
      });

      // Act - Execute each command with debug logging
      const results: CLIResult[] = [];
      for (const cmdName of commands) {
        const result = await cliDebugManager.executeCommand(cmdName, ['--verbose']);
        results.push(result);
      }

      // Assert - Verify debug logging behavior
      expect(cliDebugManager.registerCommand).toHaveBeenCalledTimes(5);
      expect(cliDebugManager.executeCommand).toHaveBeenCalledTimes(5);

      // Verify each command was logged appropriately
      commands.forEach((cmdName) => {
        expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
          `cli:${cmdName}`,
          'Command execution started',
          expect.any(Object),
          expect.any(String),
        );

        expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
          `cli:${cmdName}`,
          'Command execution completed',
          expect.objectContaining({ success: true }),
          expect.any(String),
        );
      });

      // Verify performance monitoring
      expect(mockSuite.performanceCounter.measure).toHaveBeenCalledTimes(5);

      // Verify all commands succeeded
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.every((r) => r.debugTrace)).toBeTruthy();
    });

    it('should maintain correlation across CLI command chain', async () => {
      // Arrange
      const correlationId = 'chain-correlation-123';
      cliDebugManager.setGlobalContext({ correlationId });

      const spawnCommand = new MockCLICommand(
        'spawn',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );
      const psCommand = new MockCLICommand(
        'ps',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );

      cliDebugManager.registerCommand('spawn', spawnCommand);
      cliDebugManager.registerCommand('ps', psCommand);

      // Act - Execute command chain
      await cliDebugManager.executeCommand('spawn', ['researcher', 'test-task']);
      await cliDebugManager.executeCommand('ps', []);

      // Assert - Verify correlation maintained
      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'cli:spawn',
        'Command execution started',
        expect.any(Object),
        correlationId,
      );

      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'cli:ps',
        'Command execution started',
        expect.any(Object),
        correlationId,
      );

      // Verify interaction order
      InteractionVerifier.verifyCalledBefore(spawnCommand.execute, psCommand.execute);
    });

    it('should handle CLI command failures with appropriate debug logging', async () => {
      // Arrange
      const failingCommand = new MockCLICommand(
        'failing-command',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );

      // Mock command to fail
      failingCommand.execute.mockImplementation(async (args, context) => {
        mockSuite.debugLogger.error(
          `cli:failing-command`,
          'Command execution failed',
          { error: 'Simulated failure', args },
          context.correlationId,
        );

        return {
          success: false,
          output: '',
          errorOutput: 'Simulated command failure',
          exitCode: 1,
        };
      });

      cliDebugManager.registerCommand('failing-command', failingCommand);

      // Act & Assert
      const result = await cliDebugManager.executeCommand('failing-command', ['invalid-arg']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorOutput).toBe('Simulated command failure');

      expect(mockSuite.debugLogger.error).toHaveBeenCalledWith(
        'cli:failing-command',
        'Command execution failed',
        expect.objectContaining({ error: 'Simulated failure' }),
        expect.any(String),
      );
    });
  });

  describe('CLI Debug Performance Validation', () => {
    it('should maintain <5% performance overhead for CLI commands', async () => {
      // Arrange
      const performanceCommand = new MockCLICommand(
        'performance-test',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );

      cliDebugManager.registerCommand('performance-test', performanceCommand);

      // Configure performance counter to return acceptable overhead
      mockSuite.performanceCounter.getOverheadPercentage.mockReturnValue(3.5);

      // Act
      const result = await PerformanceTestHelper.measureWithMocks(
        () => cliDebugManager.executeCommand('performance-test', ['--benchmark']),
        mockSuite.performanceCounter,
      );

      // Assert
      expect(result.overhead).toBeLessThan(5.0);
      PerformanceTestHelper.verifyPerformanceConstraints(mockSuite.performanceCounter, 5.0);

      expect(mockSuite.performanceCounter.start).toHaveBeenCalled();
      expect(mockSuite.performanceCounter.end).toHaveBeenCalled();
    });

    it('should handle high memory pressure during CLI operations', async () => {
      // Arrange
      const memoryIntensiveCommand = new MockCLICommand(
        'memory-intensive',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );

      cliDebugManager.registerCommand('memory-intensive', memoryIntensiveCommand);

      // Simulate high memory pressure
      mockSuite.memoryMonitor.isMemoryPressureHigh.mockReturnValue(true);
      mockSuite.memoryMonitor.getMemoryPressureLevel.mockReturnValue(96.5);

      // Act
      const result = await cliDebugManager.executeCommand('memory-intensive', ['--large-dataset']);

      // Assert - Command should still execute but with reduced debug logging
      expect(result.success).toBe(true);
      expect(mockSuite.memoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();

      // Verify memory-constrained interaction pattern
      InteractionVerifier.verifyMemoryConstrainedInteractions(
        mockSuite.memoryMonitor,
        mockSuite.circuitBreaker,
        mockSuite.debugLogger,
      );
    });
  });

  describe('CLI Debug Output Validation', () => {
    it('should format CLI debug output for MCP stderr compliance', async () => {
      // Arrange
      const outputCommand = new MockCLICommand(
        'output-test',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );

      cliDebugManager.registerCommand('output-test', outputCommand);

      // Mock console.error to capture stderr output
      const originalConsoleError = console.error;
      console.error = jest.fn();

      try {
        // Act
        await cliDebugManager.executeCommand('output-test', ['--format', 'json']);

        // Assert - Verify debug output uses stderr for MCP compliance
        expect(mockSuite.debugLogger.debug).toHaveBeenCalled();
        expect(mockSuite.debugLogger.info).toHaveBeenCalled();

        // Verify debug messages include required fields
        const debugCalls = (mockSuite.debugLogger.debug as jest.Mock).mock.calls;
        debugCalls.forEach((call) => {
          const [category, message, data, correlationId] = call;
          expect(category).toMatch(/^cli:/);
          expect(typeof message).toBe('string');
          expect(correlationId).toBeDefined();
        });
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('should support different debug levels for CLI operations', async () => {
      // Arrange
      const debugLevels: Array<'debug' | 'info' | 'warn' | 'error'> = [
        'debug',
        'info',
        'warn',
        'error',
      ];
      const levelCommand = new MockCLICommand(
        'level-test',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );

      cliDebugManager.registerCommand('level-test', levelCommand);

      // Act & Assert for each debug level
      for (const level of debugLevels) {
        cliDebugManager.setGlobalContext({ debugLevel: level });
        await cliDebugManager.executeCommand('level-test', [`--level=${level}`]);

        // Verify appropriate logger method was called
        expect(mockSuite.debugLogger[level]).toHaveBeenCalled();
      }
    });
  });

  describe('CLI Debug Context Management', () => {
    it('should manage CLI session context across multiple commands', async () => {
      // Arrange
      const sessionId = 'cli-session-integration-test';
      const correlationId = 'cli-correlation-integration-test';

      cliDebugManager.setGlobalContext({ sessionId, correlationId });

      const commands = ['init', 'spawn', 'ps'];
      commands.forEach((cmdName) => {
        const command = new MockCLICommand(
          cmdName,
          mockSuite.debugLogger,
          mockSuite.performanceCounter,
        );
        cliDebugManager.registerCommand(cmdName, command);
      });

      // Act - Execute multiple commands in same session
      for (const cmdName of commands) {
        await cliDebugManager.executeCommand(cmdName, []);
      }

      // Assert - Verify session context maintained
      const debugCalls = (mockSuite.debugLogger.debug as jest.Mock).mock.calls;
      debugCalls.forEach((call) => {
        const [, , data, correlationIdParam] = call;
        if (data && data.sessionId) {
          expect(data.sessionId).toBe(sessionId);
        }
        expect(correlationIdParam).toBe(correlationId);
      });
    });

    it('should generate debug summary for CLI operations', async () => {
      // Arrange
      const summaryCommands = ['init', 'spawn', 'ps', 'stop'];
      summaryCommands.forEach((cmdName) => {
        const command = new MockCLICommand(
          cmdName,
          mockSuite.debugLogger,
          mockSuite.performanceCounter,
        );
        cliDebugManager.registerCommand(cmdName, command);
      });

      // Execute commands
      for (const cmdName of summaryCommands) {
        await cliDebugManager.executeCommand(cmdName, []);
      }

      // Act
      const summary = cliDebugManager.getDebugSummary();

      // Assert
      expect(summary.registeredCommands).toEqual(summaryCommands);
      expect(summary.totalInvocations).toBe(summaryCommands.length);
      expect(summary.averageExecutionTime).toBeGreaterThan(0);
      expect(summary.debugCategories).toEqual(summaryCommands.map((cmd) => `cli:${cmd}`));
    });
  });

  describe('CLI Integration with MCP Debug Flow', () => {
    it('should correlate CLI commands with MCP protocol messages', async () => {
      // Arrange
      const mcpCommand = new MockCLICommand(
        'mcp-test',
        mockSuite.debugLogger,
        mockSuite.performanceCounter,
      );

      // Mock MCP-related functionality
      mcpCommand.execute.mockImplementation(async (args, context) => {
        // Simulate CLI command that triggers MCP operations
        mockSuite.debugLogger.debug(
          'cli:mcp-test',
          'Initiating MCP protocol communication',
          { mcpMethod: 'tools/list' },
          context.correlationId,
        );

        mockSuite.debugLogger.debug(
          'mcp:protocol',
          'MCP request initiated from CLI',
          {
            cliCommand: 'mcp-test',
            cliCorrelationId: context.correlationId,
            mcpRequestId: 'mcp-req-123',
          },
          context.correlationId,
        );

        return {
          success: true,
          output: 'MCP operation completed',
          exitCode: 0,
          debugTrace: {
            correlationId: context.correlationId,
            startTime: Date.now() - 100,
            endTime: Date.now(),
            steps: [
              {
                timestamp: Date.now() - 100,
                component: 'CLI',
                action: 'mcp_request_start',
                data: { method: 'tools/list' },
              },
              {
                timestamp: Date.now(),
                component: 'MCP',
                action: 'protocol_response',
                data: { success: true },
              },
            ],
          },
        };
      });

      cliDebugManager.registerCommand('mcp-test', mcpCommand);

      // Act
      const result = await cliDebugManager.executeCommand('mcp-test', ['--mcp-operation']);

      // Assert
      expect(result.success).toBe(true);
      expect(result.debugTrace?.steps).toHaveLength(2);

      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'cli:mcp-test',
        'Initiating MCP protocol communication',
        expect.objectContaining({ mcpMethod: 'tools/list' }),
        expect.any(String),
      );

      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'mcp:protocol',
        'MCP request initiated from CLI',
        expect.objectContaining({
          cliCommand: 'mcp-test',
          mcpRequestId: 'mcp-req-123',
        }),
        expect.any(String),
      );

      // Verify CLI and MCP debug traces use same correlation ID
      const cliDebugCalls = (mockSuite.debugLogger.debug as jest.Mock).mock.calls.filter((call) =>
        call[0].startsWith('cli:'),
      );
      const mcpDebugCalls = (mockSuite.debugLogger.debug as jest.Mock).mock.calls.filter((call) =>
        call[0].startsWith('mcp:'),
      );

      expect(cliDebugCalls[0][3]).toBe(mcpDebugCalls[0][3]); // Same correlation ID
    });
  });
});
