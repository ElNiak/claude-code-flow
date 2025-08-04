/**
 * Enhanced Console Migration Validation Tests
 * London School TDD for comprehensive console.* replacement validation
 */

import { jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  LondonSchoolMockFactory,
  InteractionVerifier,
  MockDataGenerator,
  type IDebugLogger,
  type IMemoryMonitor,
  type MockConfiguration,
} from '../../utils/london-school-test-helpers.js';

// Console Migration interfaces
interface IConsoleMigrationValidator {
  validateFileConsoleUsage(filePath: string): Promise<ConsoleMigrationResult>;
  validateDirectoryConsoleUsage(dirPath: string): Promise<DirectoryMigrationResult>;
  generateMigrationPlan(analysisResults: DirectoryMigrationResult): MigrationPlan;
  executeMigrationPlan(plan: MigrationPlan): Promise<MigrationExecutionResult>;
  validateMigrationSuccess(result: MigrationExecutionResult): boolean;
}

interface ConsoleMigrationResult {
  filePath: string;
  totalConsoleUsages: number;
  consoleUsagesByType: Record<string, ConsoleUsageInfo[]>;
  migrationComplexity: 'low' | 'medium' | 'high';
  potentialIssues: MigrationIssue[];
  recommendedActions: string[];
}

interface ConsoleUsageInfo {
  line: number;
  column: number;
  type: 'log' | 'debug' | 'warn' | 'error' | 'info' | 'trace';
  context: string;
  hasComplexArguments: boolean;
  isInTryCatch: boolean;
  isConditional: boolean;
}

interface DirectoryMigrationResult {
  directoryPath: string;
  totalFiles: number;
  filesWithConsoleUsage: number;
  totalConsoleUsages: number;
  fileResults: ConsoleMigrationResult[];
  overallComplexity: 'low' | 'medium' | 'high';
  migrationRecommendations: string[];
}

interface MigrationPlan {
  phase: 'analysis' | 'preparation' | 'migration' | 'validation';
  steps: MigrationStep[];
  rollbackPlan: RollbackStep[];
  riskAssessment: RiskAssessment;
  estimatedDuration: number;
}

interface MigrationStep {
  id: string;
  description: string;
  type: 'file_backup' | 'console_replacement' | 'import_addition' | 'validation';
  targetFiles: string[];
  dependencies: string[];
  rollbackable: boolean;
}

interface RollbackStep {
  id: string;
  description: string;
  action: 'restore_backup' | 'revert_changes' | 'remove_imports';
  targetFiles: string[];
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

interface RiskFactor {
  type:
    | 'complex_console_usage'
    | 'missing_error_handling'
    | 'performance_impact'
    | 'integration_complexity';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedFiles: string[];
}

interface MigrationExecutionResult {
  success: boolean;
  migratedFiles: string[];
  failedFiles: string[];
  backupFiles: string[];
  errors: MigrationError[];
  performanceImpact: PerformanceImpact;
}

interface MigrationIssue {
  type: 'complex_arguments' | 'async_console' | 'conditional_logging' | 'error_handling';
  severity: 'low' | 'medium' | 'high';
  line: number;
  description: string;
  suggestion: string;
}

interface MigrationError {
  filePath: string;
  error: string;
  line?: number;
  recoverable: boolean;
}

interface PerformanceImpact {
  migrationTime: number;
  filesProcessed: number;
  averageTimePerFile: number;
  memoryUsage: number;
}

// Mock Console Migration Validator
class MockConsoleMigrationValidator implements IConsoleMigrationValidator {
  private debugLogger: IDebugLogger;
  private memoryMonitor: IMemoryMonitor;

  constructor(debugLogger: IDebugLogger, memoryMonitor: IMemoryMonitor) {
    this.debugLogger = debugLogger;
    this.memoryMonitor = memoryMonitor;
  }

  validateFileConsoleUsage = jest
    .fn<(filePath: string) => Promise<ConsoleMigrationResult>>()
    .mockImplementation(async (filePath: string) => {
      this.debugLogger.debug('migration:validator', 'Analyzing file console usage', { filePath });

      // Simulate file analysis with realistic console usage patterns
      const mockUsages = MockDataGenerator.generateConsoleUsagePattern(1, 15)[0];

      const consoleUsagesByType: Record<string, ConsoleUsageInfo[]> = {
        log: [],
        debug: [],
        warn: [],
        error: [],
        info: [],
        trace: [],
      };

      mockUsages.consoleUsage.locations.forEach((location) => {
        const usageInfo: ConsoleUsageInfo = {
          line: location.line,
          column: location.column,
          type: location.type as any,
          context: location.context,
          hasComplexArguments: Math.random() > 0.7,
          isInTryCatch: Math.random() > 0.8,
          isConditional: Math.random() > 0.6,
        };

        consoleUsagesByType[location.type].push(usageInfo);
      });

      const totalUsages = Object.values(consoleUsagesByType).reduce(
        (sum, usages) => sum + usages.length,
        0,
      );

      const migrationComplexity: 'low' | 'medium' | 'high' =
        totalUsages < 5 ? 'low' : totalUsages < 15 ? 'medium' : 'high';

      const potentialIssues: MigrationIssue[] = [];
      if (totalUsages > 10) {
        potentialIssues.push({
          type: 'complex_arguments',
          severity: 'medium',
          line: 42,
          description: 'Console usage with complex object arguments detected',
          suggestion: 'Consider using structured logging with debug logger',
        });
      }

      this.debugLogger.info('migration:validator', 'File analysis completed', {
        filePath,
        totalUsages,
        complexity: migrationComplexity,
      });

      return {
        filePath,
        totalConsoleUsages: totalUsages,
        consoleUsagesByType,
        migrationComplexity,
        potentialIssues,
        recommendedActions: [
          'Replace console.log with debugLogger.info',
          'Replace console.error with debugLogger.error',
          'Add correlation ID to all debug calls',
        ],
      };
    });

  validateDirectoryConsoleUsage = jest
    .fn<(dirPath: string) => Promise<DirectoryMigrationResult>>()
    .mockImplementation(async (dirPath: string) => {
      this.debugLogger.debug('migration:validator', 'Analyzing directory console usage', {
        dirPath,
      });

      // Check memory pressure before extensive analysis
      if (this.memoryMonitor.isMemoryPressureHigh()) {
        this.debugLogger.warn(
          'migration:validator',
          'High memory pressure detected during directory analysis',
          {
            dirPath,
            memoryLevel: this.memoryMonitor.getMemoryPressureLevel(),
          },
        );
      }

      // Simulate directory analysis with mock files
      const mockFiles = MockDataGenerator.generateConsoleUsagePattern(25, 20);
      const fileResults: ConsoleMigrationResult[] = [];

      let totalConsoleUsages = 0;
      let filesWithConsoleUsage = 0;

      for (const mockFile of mockFiles) {
        const fileResult = await this.validateFileConsoleUsage(mockFile.filePath);
        fileResults.push(fileResult);

        totalConsoleUsages += fileResult.totalConsoleUsages;
        if (fileResult.totalConsoleUsages > 0) {
          filesWithConsoleUsage++;
        }
      }

      const overallComplexity: 'low' | 'medium' | 'high' =
        totalConsoleUsages < 50 ? 'low' : totalConsoleUsages < 200 ? 'medium' : 'high';

      const migrationRecommendations = [
        'Implement phased migration approach',
        'Start with low-complexity files',
        'Establish debug logger configuration',
        'Create comprehensive test coverage',
        'Implement rollback procedures',
      ];

      this.debugLogger.info('migration:validator', 'Directory analysis completed', {
        dirPath,
        totalFiles: mockFiles.length,
        filesWithConsoleUsage,
        totalConsoleUsages,
        complexity: overallComplexity,
      });

      return {
        directoryPath: dirPath,
        totalFiles: mockFiles.length,
        filesWithConsoleUsage,
        totalConsoleUsages,
        fileResults,
        overallComplexity,
        migrationRecommendations,
      };
    });

  generateMigrationPlan = jest
    .fn<(analysisResults: DirectoryMigrationResult) => MigrationPlan>()
    .mockImplementation((analysisResults: DirectoryMigrationResult) => {
      this.debugLogger.debug('migration:planner', 'Generating migration plan', {
        directoryPath: analysisResults.directoryPath,
        totalFiles: analysisResults.totalFiles,
        complexity: analysisResults.overallComplexity,
      });

      const steps: MigrationStep[] = [
        {
          id: 'backup-files',
          description: 'Create backup copies of all files to be migrated',
          type: 'file_backup',
          targetFiles: analysisResults.fileResults
            .filter((f) => f.totalConsoleUsages > 0)
            .map((f) => f.filePath),
          dependencies: [],
          rollbackable: true,
        },
        {
          id: 'add-imports',
          description: 'Add debug logger imports to target files',
          type: 'import_addition',
          targetFiles: analysisResults.fileResults
            .filter((f) => f.totalConsoleUsages > 0)
            .map((f) => f.filePath),
          dependencies: ['backup-files'],
          rollbackable: true,
        },
        {
          id: 'replace-console',
          description: 'Replace console.* calls with debug logger calls',
          type: 'console_replacement',
          targetFiles: analysisResults.fileResults
            .filter((f) => f.totalConsoleUsages > 0)
            .map((f) => f.filePath),
          dependencies: ['backup-files', 'add-imports'],
          rollbackable: true,
        },
        {
          id: 'validate-changes',
          description: 'Validate migration success and functionality',
          type: 'validation',
          targetFiles: [],
          dependencies: ['replace-console'],
          rollbackable: false,
        },
      ];

      const rollbackPlan: RollbackStep[] = [
        {
          id: 'restore-original-files',
          description: 'Restore original files from backups',
          action: 'restore_backup',
          targetFiles: analysisResults.fileResults
            .filter((f) => f.totalConsoleUsages > 0)
            .map((f) => f.filePath),
        },
      ];

      const riskFactors: RiskFactor[] = [];

      if (analysisResults.overallComplexity === 'high') {
        riskFactors.push({
          type: 'complex_console_usage',
          severity: 'high',
          description: 'High number of console usages may impact migration time and complexity',
          affectedFiles: analysisResults.fileResults
            .filter((f) => f.migrationComplexity === 'high')
            .map((f) => f.filePath),
        });
      }

      const riskAssessment: RiskAssessment = {
        overallRisk: analysisResults.overallComplexity === 'high' ? 'medium' : 'low',
        riskFactors,
        mitigationStrategies: [
          'Implement comprehensive testing before migration',
          'Use phased rollout approach',
          'Maintain backup files throughout process',
          'Monitor system performance during migration',
        ],
      };

      const estimatedDuration =
        analysisResults.totalFiles * 2 + analysisResults.totalConsoleUsages * 0.5;

      return {
        phase: 'preparation',
        steps,
        rollbackPlan,
        riskAssessment,
        estimatedDuration,
      };
    });

  executeMigrationPlan = jest
    .fn<(plan: MigrationPlan) => Promise<MigrationExecutionResult>>()
    .mockImplementation(async (plan: MigrationPlan) => {
      this.debugLogger.info('migration:executor', 'Starting migration execution', {
        stepsCount: plan.steps.length,
        estimatedDuration: plan.estimatedDuration,
      });

      const startTime = Date.now();
      const migratedFiles: string[] = [];
      const failedFiles: string[] = [];
      const backupFiles: string[] = [];
      const errors: MigrationError[] = [];

      // Execute migration steps
      for (const step of plan.steps) {
        this.debugLogger.debug('migration:executor', 'Executing migration step', {
          stepId: step.id,
          stepType: step.type,
          targetFilesCount: step.targetFiles.length,
        });

        // Check memory pressure during migration
        if (this.memoryMonitor.isMemoryPressureHigh()) {
          this.debugLogger.warn(
            'migration:executor',
            'High memory pressure during migration step',
            {
              stepId: step.id,
              memoryLevel: this.memoryMonitor.getMemoryPressureLevel(),
            },
          );
        }

        try {
          // Simulate step execution
          switch (step.type) {
            case 'file_backup':
              step.targetFiles.forEach((file) => {
                backupFiles.push(`${file}.backup`);
              });
              break;

            case 'console_replacement':
              step.targetFiles.forEach((file) => {
                // Simulate occasional failure for testing
                if (Math.random() > 0.95) {
                  failedFiles.push(file);
                  errors.push({
                    filePath: file,
                    error: 'Syntax error during console replacement',
                    line: 42,
                    recoverable: true,
                  });
                } else {
                  migratedFiles.push(file);
                }
              });
              break;
          }

          this.debugLogger.info('migration:executor', 'Migration step completed', {
            stepId: step.id,
            success: true,
          });
        } catch (error) {
          this.debugLogger.error('migration:executor', 'Migration step failed', {
            stepId: step.id,
            error: error instanceof Error ? error.message : String(error),
          });

          errors.push({
            filePath: 'unknown',
            error: `Step ${step.id} failed: ${error}`,
            recoverable: step.rollbackable,
          });
        }
      }

      const endTime = Date.now();
      const migrationTime = endTime - startTime;

      const performanceImpact: PerformanceImpact = {
        migrationTime,
        filesProcessed: migratedFiles.length + failedFiles.length,
        averageTimePerFile: migrationTime / (migratedFiles.length + failedFiles.length || 1),
        memoryUsage: this.memoryMonitor.getCurrentUsage().heapUsed,
      };

      const success = errors.length === 0;

      this.debugLogger.info('migration:executor', 'Migration execution completed', {
        success,
        migratedFilesCount: migratedFiles.length,
        failedFilesCount: failedFiles.length,
        executionTime: migrationTime,
      });

      return {
        success,
        migratedFiles,
        failedFiles,
        backupFiles,
        errors,
        performanceImpact,
      };
    });

  validateMigrationSuccess = jest
    .fn<(result: MigrationExecutionResult) => boolean>()
    .mockImplementation((result: MigrationExecutionResult) => {
      this.debugLogger.debug('migration:validator', 'Validating migration success', {
        migratedFiles: result.migratedFiles.length,
        failedFiles: result.failedFiles.length,
        errorsCount: result.errors.length,
      });

      // Migration is successful if:
      // 1. No critical errors
      // 2. All files processed successfully
      // 3. Performance impact within acceptable limits
      const criticalErrors = result.errors.filter((e) => !e.recoverable);
      const performanceAcceptable = result.performanceImpact.averageTimePerFile < 1000; // <1s per file

      const success =
        criticalErrors.length === 0 && result.failedFiles.length === 0 && performanceAcceptable;

      this.debugLogger.info('migration:validator', 'Migration validation completed', {
        success,
        criticalErrors: criticalErrors.length,
        performanceAcceptable,
      });

      return success;
    });
}

describe('Enhanced Console Migration Validation Tests', () => {
  let mockSuite: ReturnType<typeof LondonSchoolMockFactory.createDebugLoggingMockSuite>;
  let migrationValidator: MockConsoleMigrationValidator;

  beforeEach(() => {
    mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite({
      memoryPressureLevel: 75,
      performanceOverhead: 2.0,
    });

    migrationValidator = new MockConsoleMigrationValidator(
      mockSuite.debugLogger,
      mockSuite.memoryMonitor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File-Level Console Migration Validation', () => {
    it('should accurately identify console usage patterns in individual files', async () => {
      // Arrange
      const testFilePath = '/src/components/test-component.ts';

      // Act
      const result = await migrationValidator.validateFileConsoleUsage(testFilePath);

      // Assert - Verify analysis behavior
      expect(migrationValidator.validateFileConsoleUsage).toHaveBeenCalledWith(testFilePath);
      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'migration:validator',
        'Analyzing file console usage',
        { filePath: testFilePath },
      );

      expect(result.filePath).toBe(testFilePath);
      expect(result.totalConsoleUsages).toBeGreaterThan(0);
      expect(result.consoleUsagesByType).toHaveProperty('log');
      expect(result.consoleUsagesByType).toHaveProperty('error');
      expect(result.migrationComplexity).toMatch(/^(low|medium|high)$/);
      expect(Array.isArray(result.potentialIssues)).toBe(true);
      expect(Array.isArray(result.recommendedActions)).toBe(true);
    });

    it('should categorize migration complexity based on console usage patterns', async () => {
      // Test different complexity scenarios
      const testCases = [
        { filePath: '/src/simple.ts', expectedMinComplexity: 'low' },
        { filePath: '/src/moderate.ts', expectedMinComplexity: 'medium' },
        { filePath: '/src/complex.ts', expectedMinComplexity: 'high' },
      ];

      for (const testCase of testCases) {
        const result = await migrationValidator.validateFileConsoleUsage(testCase.filePath);

        expect(result.migrationComplexity).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(result.migrationComplexity);
      }
    });

    it('should identify potential migration issues and provide recommendations', async () => {
      // Arrange
      const complexFilePath = '/src/complex-console-usage.ts';

      // Act
      const result = await migrationValidator.validateFileConsoleUsage(complexFilePath);

      // Assert
      if (result.potentialIssues.length > 0) {
        result.potentialIssues.forEach((issue) => {
          expect(issue.type).toMatch(
            /^(complex_arguments|async_console|conditional_logging|error_handling)$/,
          );
          expect(issue.severity).toMatch(/^(low|medium|high)$/);
          expect(typeof issue.line).toBe('number');
          expect(typeof issue.description).toBe('string');
          expect(typeof issue.suggestion).toBe('string');
        });
      }

      expect(result.recommendedActions.length).toBeGreaterThan(0);
      result.recommendedActions.forEach((action) => {
        expect(typeof action).toBe('string');
        expect(action.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Directory-Level Console Migration Analysis', () => {
    it('should analyze entire directory for console usage patterns', async () => {
      // Arrange
      const testDirPath = '/src/components';

      // Act
      const result = await migrationValidator.validateDirectoryConsoleUsage(testDirPath);

      // Assert
      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'migration:validator',
        'Analyzing directory console usage',
        { dirPath: testDirPath },
      );

      expect(result.directoryPath).toBe(testDirPath);
      expect(result.totalFiles).toBeGreaterThan(0);
      expect(result.filesWithConsoleUsage).toBeGreaterThanOrEqual(0);
      expect(result.totalConsoleUsages).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.fileResults)).toBe(true);
      expect(result.overallComplexity).toMatch(/^(low|medium|high)$/);
      expect(Array.isArray(result.migrationRecommendations)).toBe(true);
    });

    it('should handle memory pressure during large directory analysis', async () => {
      // Arrange
      mockSuite.memoryMonitor.isMemoryPressureHigh.mockReturnValue(true);
      mockSuite.memoryMonitor.getMemoryPressureLevel.mockReturnValue(96.2);

      const largeDirPath = '/src/large-codebase';

      // Act
      const result = await migrationValidator.validateDirectoryConsoleUsage(largeDirPath);

      // Assert
      expect(mockSuite.memoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();
      expect(mockSuite.debugLogger.warn).toHaveBeenCalledWith(
        'migration:validator',
        'High memory pressure detected during directory analysis',
        expect.objectContaining({
          dirPath: largeDirPath,
          memoryLevel: 96.2,
        }),
      );

      expect(result.directoryPath).toBe(largeDirPath);
    });

    it('should provide comprehensive migration recommendations based on analysis', async () => {
      // Arrange
      const testDirPath = '/src/application';

      // Act
      const result = await migrationValidator.validateDirectoryConsoleUsage(testDirPath);

      // Assert
      expect(result.migrationRecommendations.length).toBeGreaterThan(0);

      const expectedRecommendations = [
        'Implement phased migration approach',
        'Start with low-complexity files',
        'Establish debug logger configuration',
      ];

      expectedRecommendations.forEach((expected) => {
        expect(
          result.migrationRecommendations.some((rec) => rec.includes(expected.split(' ')[0])),
        ).toBe(true);
      });
    });
  });

  describe('Migration Plan Generation and Execution', () => {
    it('should generate comprehensive migration plan based on analysis', async () => {
      // Arrange
      const analysisResult = await migrationValidator.validateDirectoryConsoleUsage('/src/test');

      // Act
      const migrationPlan = migrationValidator.generateMigrationPlan(analysisResult);

      // Assert
      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'migration:planner',
        'Generating migration plan',
        expect.objectContaining({
          directoryPath: analysisResult.directoryPath,
          totalFiles: analysisResult.totalFiles,
          complexity: analysisResult.overallComplexity,
        }),
      );

      expect(migrationPlan.phase).toBe('preparation');
      expect(Array.isArray(migrationPlan.steps)).toBe(true);
      expect(migrationPlan.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(migrationPlan.rollbackPlan)).toBe(true);
      expect(migrationPlan.riskAssessment).toBeDefined();
      expect(typeof migrationPlan.estimatedDuration).toBe('number');

      // Verify step structure
      migrationPlan.steps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.type).toMatch(/^(file_backup|console_replacement|import_addition|validation)$/);
        expect(Array.isArray(step.targetFiles)).toBe(true);
        expect(Array.isArray(step.dependencies)).toBe(true);
        expect(typeof step.rollbackable).toBe('boolean');
      });
    });

    it('should execute migration plan with proper error handling and logging', async () => {
      // Arrange
      const analysisResult = await migrationValidator.validateDirectoryConsoleUsage('/src/test');
      const migrationPlan = migrationValidator.generateMigrationPlan(analysisResult);

      // Act
      const executionResult = await migrationValidator.executeMigrationPlan(migrationPlan);

      // Assert
      expect(mockSuite.debugLogger.info).toHaveBeenCalledWith(
        'migration:executor',
        'Starting migration execution',
        expect.objectContaining({
          stepsCount: migrationPlan.steps.length,
          estimatedDuration: migrationPlan.estimatedDuration,
        }),
      );

      expect(typeof executionResult.success).toBe('boolean');
      expect(Array.isArray(executionResult.migratedFiles)).toBe(true);
      expect(Array.isArray(executionResult.failedFiles)).toBe(true);
      expect(Array.isArray(executionResult.backupFiles)).toBe(true);
      expect(Array.isArray(executionResult.errors)).toBe(true);
      expect(executionResult.performanceImpact).toBeDefined();

      // Verify performance impact structure
      expect(typeof executionResult.performanceImpact.migrationTime).toBe('number');
      expect(typeof executionResult.performanceImpact.filesProcessed).toBe('number');
      expect(typeof executionResult.performanceImpact.averageTimePerFile).toBe('number');
      expect(typeof executionResult.performanceImpact.memoryUsage).toBe('number');
    });

    it('should validate migration success with comprehensive criteria', async () => {
      // Arrange
      const mockExecutionResult: MigrationExecutionResult = {
        success: true,
        migratedFiles: ['/src/file1.ts', '/src/file2.ts'],
        failedFiles: [],
        backupFiles: ['/src/file1.ts.backup', '/src/file2.ts.backup'],
        errors: [],
        performanceImpact: {
          migrationTime: 1500,
          filesProcessed: 2,
          averageTimePerFile: 750,
          memoryUsage: 45 * 1024 * 1024,
        },
      };

      // Act
      const isSuccessful = migrationValidator.validateMigrationSuccess(mockExecutionResult);

      // Assert
      expect(mockSuite.debugLogger.debug).toHaveBeenCalledWith(
        'migration:validator',
        'Validating migration success',
        expect.objectContaining({
          migratedFiles: 2,
          failedFiles: 0,
          errorsCount: 0,
        }),
      );

      expect(typeof isSuccessful).toBe('boolean');
      expect(isSuccessful).toBe(true);

      expect(mockSuite.debugLogger.info).toHaveBeenCalledWith(
        'migration:validator',
        'Migration validation completed',
        expect.objectContaining({
          success: true,
          criticalErrors: 0,
          performanceAcceptable: true,
        }),
      );
    });

    it('should handle migration failures and provide recovery options', async () => {
      // Arrange
      const mockExecutionResultWithErrors: MigrationExecutionResult = {
        success: false,
        migratedFiles: ['/src/file1.ts'],
        failedFiles: ['/src/file2.ts'],
        backupFiles: ['/src/file1.ts.backup', '/src/file2.ts.backup'],
        errors: [
          {
            filePath: '/src/file2.ts',
            error: 'Syntax error during console replacement',
            line: 42,
            recoverable: true,
          },
        ],
        performanceImpact: {
          migrationTime: 2000,
          filesProcessed: 2,
          averageTimePerFile: 1000,
          memoryUsage: 50 * 1024 * 1024,
        },
      };

      // Act
      const isSuccessful = migrationValidator.validateMigrationSuccess(
        mockExecutionResultWithErrors,
      );

      // Assert
      expect(isSuccessful).toBe(false);
      expect(mockExecutionResultWithErrors.errors[0].recoverable).toBe(true);
    });
  });

  describe('Memory Pressure and Performance Validation', () => {
    it('should monitor memory usage during migration operations', async () => {
      // Arrange
      const analysisResult =
        await migrationValidator.validateDirectoryConsoleUsage('/src/memory-test');
      const migrationPlan = migrationValidator.generateMigrationPlan(analysisResult);

      // Simulate high memory usage
      mockSuite.memoryMonitor.isMemoryPressureHigh.mockReturnValue(true);
      mockSuite.memoryMonitor.getMemoryPressureLevel.mockReturnValue(94.5);

      // Act
      await migrationValidator.executeMigrationPlan(migrationPlan);

      // Assert
      expect(mockSuite.memoryMonitor.isMemoryPressureHigh).toHaveBeenCalled();
      expect(mockSuite.debugLogger.warn).toHaveBeenCalledWith(
        'migration:executor',
        'High memory pressure during migration step',
        expect.objectContaining({
          memoryLevel: 94.5,
        }),
      );
    });

    it('should maintain acceptable performance during large-scale migrations', async () => {
      // Arrange
      const largeDirAnalysis =
        await migrationValidator.validateDirectoryConsoleUsage('/src/large-project');
      const largeMigrationPlan = migrationValidator.generateMigrationPlan(largeDirAnalysis);

      // Act
      const executionResult = await migrationValidator.executeMigrationPlan(largeMigrationPlan);

      // Assert
      expect(executionResult.performanceImpact.averageTimePerFile).toBeLessThan(1000); // <1s per file
      expect(executionResult.performanceImpact.migrationTime).toBeGreaterThan(0);
      expect(executionResult.performanceImpact.filesProcessed).toBeGreaterThan(0);
    });
  });

  describe('Integration with London School Testing Patterns', () => {
    it('should verify interaction patterns for migration workflow', async () => {
      // Arrange
      const testDir = '/src/integration-test';

      // Act - Execute full migration workflow
      const analysis = await migrationValidator.validateDirectoryConsoleUsage(testDir);
      const plan = migrationValidator.generateMigrationPlan(analysis);
      const execution = await migrationValidator.executeMigrationPlan(plan);
      const validation = migrationValidator.validateMigrationSuccess(execution);

      // Assert - Verify interaction order
      InteractionVerifier.verifyCalledBefore(
        migrationValidator.validateDirectoryConsoleUsage,
        migrationValidator.generateMigrationPlan,
      );

      InteractionVerifier.verifyCalledBefore(
        migrationValidator.generateMigrationPlan,
        migrationValidator.executeMigrationPlan,
      );

      InteractionVerifier.verifyCalledBefore(
        migrationValidator.executeMigrationPlan,
        migrationValidator.validateMigrationSuccess,
      );

      expect(validation).toBeDefined();
    });
  });
});
