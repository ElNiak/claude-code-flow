/**
 * Console Migration Unit Tests - London School TDD
 * Tests systematic console replacement and migration accuracy
 */

import { jest } from '@jest/globals';
import { ConsoleMigration } from '../../../src/utils/console-migration.js';
import { ComponentLoggerFactory, type ComponentType } from '../../../src/core/logger.js';
import {
  LondonSchoolMockFactory,
  MockDataGenerator,
  type IDebugLogger,
} from '../../utils/london-school-test-helpers.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Mock fs module for file operations
jest.mock('node:fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConsoleMigration - Systematic Console Replacement', () => {
  let mockLogger: jest.Mocked<IDebugLogger>;
  let originalProcessCwd: typeof process.cwd;

  beforeEach(() => {
    // Create mock logger
    mockLogger = LondonSchoolMockFactory.createDebugLoggerMock();

    // Mock ComponentLoggerFactory to return our mock logger
    jest.spyOn(ComponentLoggerFactory, 'getLogger').mockReturnValue(mockLogger);

    // Mock process.cwd for path resolution
    originalProcessCwd = process.cwd;
    process.cwd = jest.fn().mockReturnValue('/test/project');

    // Reset migration stats before each test
    (ConsoleMigration as any).migrationStats.clear();

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.cwd = originalProcessCwd;
    jest.restoreAllMocks();
  });

  describe('Console Method Replacement Behavior', () => {
    it('should replace console.log with component-aware info logging', () => {
      // Arrange
      const component: ComponentType = 'CLI';
      const message = 'Test log message';
      const args = ['arg1', 'arg2'];

      // Act
      ConsoleMigration.log(component, message, ...args);

      // Assert
      expect(ComponentLoggerFactory.getLogger).toHaveBeenCalledWith(component);
      expect(mockLogger.info).toHaveBeenCalledWith(message, { args });
    });

    it('should replace console.error with component-aware error logging', () => {
      // Arrange
      const component: ComponentType = 'MCP';
      const message = 'Test error message';
      const error = new Error('Test error');

      // Act
      ConsoleMigration.error(component, message, error);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(message, error);
    });

    it('should track migration statistics accurately', () => {
      // Arrange
      const component: ComponentType = 'Core';

      // Act
      ConsoleMigration.log(component, 'Message 1');
      ConsoleMigration.log(component, 'Message 2');
      ConsoleMigration.warn(component, 'Warning message');
      ConsoleMigration.debug(component, 'Debug message');

      const stats = ConsoleMigration.getMigrationStats();

      // Assert
      expect(stats['log@Core']).toEqual({
        originalCalls: 0,
        migratedCalls: 2,
        migrationRate: 1,
        lastSeen: expect.any(String),
        locations: expect.any(Array),
      });

      expect(stats['warn@Core']).toEqual({
        originalCalls: 0,
        migratedCalls: 1,
        migrationRate: 1,
        lastSeen: expect.any(String),
        locations: expect.any(Array),
      });
    });

    it('should handle all console method types correctly', () => {
      // Arrange
      const component: ComponentType = 'Terminal';
      const methods = [
        { method: 'log', expectedLogger: 'info' },
        { method: 'info', expectedLogger: 'info' },
        { method: 'warn', expectedLogger: 'warn' },
        { method: 'debug', expectedLogger: 'debug' },
        { method: 'error', expectedLogger: 'error' },
      ];

      // Act & Assert
      methods.forEach(({ method, expectedLogger }) => {
        ConsoleMigration[method as keyof typeof ConsoleMigration](
          component,
          `Test ${method} message`,
        );

        expect(mockLogger[expectedLogger as keyof typeof mockLogger]).toHaveBeenCalledWith(
          `Test ${method} message`,
          expect.any(Object),
        );
      });
    });
  });

  describe('File Migration Behavior', () => {
    it('should migrate console calls in a file correctly', async () => {
      // Arrange
      const filePath = '/test/project/src/example.ts';
      const component: ComponentType = 'CLI';
      const originalContent = `
import { something } from './utils';

function testFunction() {
  console.log('This is a log message');
  console.warn('This is a warning');
  console.error('This is an error', new Error('test'));
  console.debug('Debug info');

  // Some other code
  const result = doSomething();
  console.info('Processing result:', result);
}
`;

      const expectedContent = `import { ConsoleMigration } from '../utils/console-migration.js';
import { something } from './utils';

function testFunction() {
  ConsoleMigration.log('CLI', 'This is a log message');
  ConsoleMigration.warn('CLI', 'This is a warning');
  ConsoleMigration.error('CLI', 'This is an error', new Error('test'));
  ConsoleMigration.debug('CLI', 'Debug info');

  // Some other code
  const result = doSomething();
  ConsoleMigration.info('CLI', 'Processing result:', result);
}
`;

      mockFs.readFile.mockResolvedValue(originalContent);
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await ConsoleMigration.migrateFile(filePath, component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalReplacements).toBe(5);
      expect(result.patterns).toEqual([
        'console.log',
        'console.warn',
        'console.error',
        'console.debug',
        'console.info',
      ]);

      expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(mockFs.copyFile).toHaveBeenCalledWith(filePath, `${filePath}.migration-backup`);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        filePath,
        expect.stringContaining("ConsoleMigration.log('CLI',"),
        'utf-8',
      );
    });

    it('should handle MCP component stderr compliance in file migration', async () => {
      // Arrange
      const filePath = '/test/project/src/mcp-handler.ts';
      const component: ComponentType = 'MCP';
      const originalContent = `
console.log('MCP log message');
console.info('MCP info message');
console.warn('MCP warning');
console.error('MCP error');
`;

      mockFs.readFile.mockResolvedValue(originalContent);
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      await ConsoleMigration.migrateFile(filePath, component);

      // Assert
      const writeCall = mockFs.writeFile.mock.calls[0];
      const migratedContent = writeCall[1] as string;

      // MCP log and info should be converted to error for stderr compliance
      expect(migratedContent).toContain("ConsoleMigration.error('MCP',");
      expect(migratedContent).toContain("ConsoleMigration.warn('MCP',");
      expect(migratedContent).toContain("ConsoleMigration.error('MCP',");

      // Should contain import statement
      expect(migratedContent).toContain('import { ConsoleMigration }');
    });

    it('should skip migration when no console calls are present', async () => {
      // Arrange
      const filePath = '/test/project/src/clean-file.ts';
      const component: ComponentType = 'Core';
      const contentWithoutConsole = `
import { something } from './utils';

function cleanFunction() {
  const result = doSomething();
  return result;
}
`;

      mockFs.readFile.mockResolvedValue(contentWithoutConsole);

      // Act
      const result = await ConsoleMigration.migrateFile(filePath, component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalReplacements).toBe(0);
      expect(result.patterns).toEqual([]);

      // Should not attempt to write file or create backup
      expect(mockFs.copyFile).not.toHaveBeenCalled();
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file migration errors gracefully', async () => {
      // Arrange
      const filePath = '/test/project/src/inaccessible-file.ts';
      const component: ComponentType = 'CLI';
      const error = new Error('File not found');

      mockFs.readFile.mockRejectedValue(error);

      // Act
      const result = await ConsoleMigration.migrateFile(filePath, component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(result.totalReplacements).toBe(0);
    });

    it('should calculate correct import paths for different directory structures', async () => {
      // Arrange
      const testCases = [
        {
          filePath: '/test/project/src/cli/commands/init.ts',
          expectedImport: '../../utils/console-migration.js',
        },
        {
          filePath: '/test/project/src/core/logger.ts',
          expectedImport: '../utils/console-migration.js',
        },
        {
          filePath: '/test/project/src/mcp/server.ts',
          expectedImport: '../utils/console-migration.js',
        },
      ];

      // Act & Assert
      for (const testCase of testCases) {
        mockFs.readFile.mockResolvedValue('console.log("test");');
        mockFs.copyFile.mockResolvedValue(undefined);
        mockFs.writeFile.mockResolvedValue(undefined);

        await ConsoleMigration.migrateFile(testCase.filePath, 'CLI');

        const writeCall = mockFs.writeFile.mock.calls[mockFs.writeFile.mock.calls.length - 1];
        const migratedContent = writeCall[1] as string;

        expect(migratedContent).toContain(
          `import { ConsoleMigration } from '${testCase.expectedImport}';`,
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('Migration Rollback Behavior', () => {
    it('should rollback file migration successfully', async () => {
      // Arrange
      const filePath = '/test/project/src/example.ts';
      const backupPath = `${filePath}.migration-backup`;

      mockFs.access.mockResolvedValue(undefined); // Backup exists
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      // Act
      const result = await ConsoleMigration.rollbackFile(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(backupPath);
      expect(mockFs.copyFile).toHaveBeenCalledWith(backupPath, filePath);
      expect(mockFs.unlink).toHaveBeenCalledWith(backupPath);
    });

    it('should handle rollback when backup does not exist', async () => {
      // Arrange
      const filePath = '/test/project/src/example.ts';
      const error = new Error('Backup file not found');

      mockFs.access.mockRejectedValue(error);

      // Act
      const result = await ConsoleMigration.rollbackFile(filePath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Backup file not found');
    });
  });

  describe('Migration Validation Behavior', () => {
    it('should validate migrated files correctly', async () => {
      // Arrange
      const filePath = '/test/project/src/example.ts';
      const component: ComponentType = 'CLI';
      const validMigratedContent = `
import { ConsoleMigration } from '../utils/console-migration.js';

function example() {
  ConsoleMigration.log('CLI', 'This is migrated');
  ConsoleMigration.warn('CLI', 'This is also migrated');
}
`;

      mockFs.readFile.mockResolvedValue(validMigratedContent);

      // Act
      const result = await ConsoleMigration.validateFileM(filePath, component);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should detect unmigrated console calls', async () => {
      // Arrange
      const filePath = '/test/project/src/example.ts';
      const component: ComponentType = 'CLI';
      const partiallyMigratedContent = `
import { ConsoleMigration } from '../utils/console-migration.js';

function example() {
  ConsoleMigration.log('CLI', 'This is migrated');
  console.log('This is not migrated');
  console.warn('This is also not migrated');
}
`;

      mockFs.readFile.mockResolvedValue(partiallyMigratedContent);

      // Act
      const result = await ConsoleMigration.validateFileM(filePath, component);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Found 2 unmigrated console calls');
      expect(result.suggestions).toContain('Run migration again to complete the process');
    });

    it('should detect incorrect component assignments', async () => {
      // Arrange
      const filePath = '/test/project/src/example.ts';
      const component: ComponentType = 'CLI';
      const incorrectComponentContent = `
import { ConsoleMigration } from '../utils/console-migration.js';

function example() {
  ConsoleMigration.log('Core', 'Wrong component');
  ConsoleMigration.warn('MCP', 'Also wrong component');
}
`;

      mockFs.readFile.mockResolvedValue(incorrectComponentContent);

      // Act
      const result = await ConsoleMigration.validateFileM(filePath, component);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        expect.stringContaining('Incorrect component assignment: expected CLI, got Core'),
      );
      expect(result.suggestions).toContain(
        expect.stringContaining("Update component assignments to use 'CLI'"),
      );
    });

    it('should provide MCP-specific validation suggestions', async () => {
      // Arrange
      const filePath = '/test/project/src/mcp-handler.ts';
      const component: ComponentType = 'MCP';
      const mcpContent = `
import { ConsoleMigration } from '../utils/console-migration.js';

function mcpHandler() {
  ConsoleMigration.log('MCP', 'This should use stderr');
  ConsoleMigration.info('MCP', 'This should also use stderr');
}
`;

      mockFs.readFile.mockResolvedValue(mcpContent);

      // Act
      const result = await ConsoleMigration.validateFileM(filePath, component);

      // Assert
      expect(result.suggestions).toContain(
        'MCP components should prefer error/warn methods for stderr compliance',
      );
    });
  });

  describe('Migration Reporting and Analytics', () => {
    it('should generate comprehensive migration report', () => {
      // Arrange
      const components: ComponentType[] = ['CLI', 'MCP', 'Core', 'Swarm'];
      const methods = ['log', 'warn', 'error', 'debug'];

      // Simulate various migration calls
      components.forEach((component, compIndex) => {
        methods.forEach((method, methodIndex) => {
          const callCount = (compIndex + 1) * (methodIndex + 1);
          for (let i = 0; i < callCount; i++) {
            ConsoleMigration[method as keyof typeof ConsoleMigration](
              component,
              `Test ${method} message ${i}`,
            );
          }
        });
      });

      // Act
      const report = ConsoleMigration.generateMigrationReport();

      // Assert
      expect(report.totalMigrated).toBeGreaterThan(0);
      expect(Object.keys(report.byComponent)).toContain('CLI');
      expect(Object.keys(report.byComponent)).toContain('MCP');
      expect(Object.keys(report.byMethod)).toContain('log');
      expect(Object.keys(report.byMethod)).toContain('error');
      expect(report.completionPercentage).toBeGreaterThan(0);
      expect(report.recommendations).toContain(
        'MCP components detected - ensure stderr-only compliance for protocol requirements',
      );
    });

    it('should provide recommendations based on usage patterns', () => {
      // Arrange - Simulate error-heavy usage
      for (let i = 0; i < 50; i++) {
        ConsoleMigration.error('CLI', `Error message ${i}`);
      }
      for (let i = 0; i < 5; i++) {
        ConsoleMigration.debug('CLI', `Debug message ${i}`);
      }

      // Act
      const report = ConsoleMigration.generateMigrationReport();

      // Assert
      expect(report.recommendations).toContain(
        'Consider using debug logging for development-time information instead of error logging',
      );
    });

    it('should track migration statistics over time', () => {
      // Arrange
      const component: ComponentType = 'Terminal';

      // Act - Simulate multiple calls over time
      ConsoleMigration.log(component, 'Message 1');
      ConsoleMigration.log(component, 'Message 2');
      ConsoleMigration.warn(component, 'Warning 1');

      const stats = ConsoleMigration.getMigrationStats();

      // Assert
      expect(stats['log@Terminal'].migratedCalls).toBe(2);
      expect(stats['log@Terminal'].locations).toHaveLength(2);
      expect(stats['warn@Terminal'].migratedCalls).toBe(1);
      expect(new Date(stats['log@Terminal'].lastSeen)).toBeInstanceOf(Date);
    });
  });

  describe('Legacy Console Replacement Exports', () => {
    it('should provide legacy exports for gradual migration', () => {
      // Arrange
      const {
        consoleLog,
        consoleInfo,
        consoleWarn,
        consoleError,
        consoleDebug,
      } = require('../../../src/utils/console-migration.js');

      // Act & Assert - Should not throw
      expect(() => {
        consoleLog('CLI', 'Test log');
        consoleInfo('MCP', 'Test info');
        consoleWarn('Core', 'Test warn');
        consoleError('Swarm', 'Test error');
        consoleDebug('Terminal', 'Test debug');
      }).not.toThrow();

      // Verify logger interactions
      expect(mockLogger.info).toHaveBeenCalledTimes(2); // log + info
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with Usage Analytics', () => {
    it('should integrate migration data with console usage patterns', () => {
      // Arrange
      const usagePattern = MockDataGenerator.generateConsoleUsagePattern(5, 10);

      // Act - Simulate migration based on usage pattern
      usagePattern.forEach((fileData) => {
        fileData.consoleUsage.locations.forEach((location) => {
          ConsoleMigration[location.type as keyof typeof ConsoleMigration](
            'CLI',
            `Migrated ${location.type} from ${fileData.filePath}:${location.line}`,
          );
        });
      });

      const stats = ConsoleMigration.getMigrationStats();

      // Assert
      expect(Object.keys(stats)).toHaveLength(4); // log, debug, warn, error
      expect(Object.values(stats).reduce((sum, stat) => sum + stat.migratedCalls, 0)).toBe(50 * 10); // 5 files * 10 calls per file
    });
  });
});
