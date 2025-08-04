#!/usr/bin/env tsx

/**
 * Migration Validation System
 * Ensures that console call migration preserves all functionality
 * and adds debug capabilities without breaking existing behavior
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { glob } from 'glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ComponentLoggerFactory } from '../src/core/logger.js';

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    filesValidated: number;
    consoleCalls: number;
    migratedCalls: number;
    migrationCoverage: number;
    performanceImpact: number;
  };
}

interface ComponentValidation {
  component: string;
  fileCount: number;
  migrationCount: number;
  syntaxErrors: string[];
  importErrors: string[];
  logicErrors: string[];
}

export class MigrationValidator {
  private readonly projectRoot: string;
  private readonly excludePatterns: string[] = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
  ];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run comprehensive migration validation
   */
  async validateMigration(): Promise<ValidationResult> {
    console.log('🔍 Starting Migration Validation');

    const startTime = Date.now();
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
      metrics: {
        filesValidated: 0,
        consoleCalls: 0,
        migratedCalls: 0,
        migrationCoverage: 0,
        performanceImpact: 0,
      },
    };

    try {
      // 1. Syntax validation
      await this.validateSyntax(result);

      // 2. Import validation
      await this.validateImports(result);

      // 3. Migration completeness
      await this.validateMigrationCompleteness(result);

      // 4. Component-specific validation
      await this.validateComponentLogic(result);

      // 5. Performance impact assessment
      await this.assessPerformanceImpact(result);

      // 6. Functionality preservation tests
      await this.runFunctionalityTests(result);

      result.metrics.performanceImpact = Date.now() - startTime;
      result.passed = result.errors.length === 0;

      this.printValidationResults(result);
      return result;
    } catch (error) {
      result.passed = false;
      result.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }

  /**
   * Validate syntax of all migrated files
   */
  private async validateSyntax(result: ValidationResult): Promise<void> {
    console.log('🔍 Validating syntax...');

    const files = await this.findTargetFiles();
    result.metrics.filesValidated = files.length;

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Parse with TypeScript support
        parse(content, {
          sourceType: 'module',
          plugins: [
            'typescript',
            'jsx',
            'decorators-legacy',
            'classProperties',
            'objectRestSpread',
          ],
        });
      } catch (error) {
        const relativePath = path.relative(this.projectRoot, filePath);
        result.errors.push(
          `Syntax error in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Validate import statements and dependencies
   */
  private async validateImports(result: ValidationResult): Promise<void> {
    console.log('🔍 Validating imports...');

    const files = await this.findTargetFiles();

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Check if file uses ConsoleMigration
        if (content.includes('ConsoleMigration')) {
          // Validate import statement exists
          if (!content.includes('import { ConsoleMigration }')) {
            const relativePath = path.relative(this.projectRoot, filePath);
            result.errors.push(`Missing ConsoleMigration import in ${relativePath}`);
          }

          // Validate import path is correct
          const importMatch = content.match(/import.*ConsoleMigration.*from\s+['"]([^'"]+)['"]/);
          if (importMatch) {
            const importPath = importMatch[1];
            const resolvedPath = this.resolveImportPath(filePath, importPath);

            try {
              await fs.access(resolvedPath);
            } catch {
              const relativePath = path.relative(this.projectRoot, filePath);
              result.errors.push(`Invalid import path in ${relativePath}: ${importPath}`);
            }
          }
        }
      } catch (error) {
        const relativePath = path.relative(this.projectRoot, filePath);
        result.warnings.push(
          `Import validation warning in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Validate migration completeness
   */
  private async validateMigrationCompleteness(result: ValidationResult): Promise<void> {
    console.log('🔍 Validating migration completeness...');

    const files = await this.findTargetFiles();
    let totalConsoleCalls = 0;
    let totalMigratedCalls = 0;

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Count remaining console calls
        const consoleMatches = content.match(/console\.(log|info|warn|error|debug)\s*\(/g);
        if (consoleMatches) {
          totalConsoleCalls += consoleMatches.length;

          const relativePath = path.relative(this.projectRoot, filePath);
          result.warnings.push(
            `Unmigrated console calls in ${relativePath}: ${consoleMatches.length}`,
          );
        }

        // Count migrated calls
        const migrationMatches = content.match(
          /ConsoleMigration\.(log|info|warn|error|debug)\s*\(/g,
        );
        if (migrationMatches) {
          totalMigratedCalls += migrationMatches.length;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    result.metrics.consoleCalls = totalConsoleCalls;
    result.metrics.migratedCalls = totalMigratedCalls;
    result.metrics.migrationCoverage =
      totalConsoleCalls + totalMigratedCalls > 0
        ? (totalMigratedCalls / (totalConsoleCalls + totalMigratedCalls)) * 100
        : 100;

    if (totalConsoleCalls > 0) {
      result.warnings.push(`${totalConsoleCalls} console calls still need migration`);
    }
  }

  /**
   * Validate component-specific logic
   */
  private async validateComponentLogic(result: ValidationResult): Promise<void> {
    console.log('🔍 Validating component logic...');

    const components = [
      'CLI',
      'MCP',
      'Swarm',
      'Core',
      'Terminal',
      'Memory',
      'Migration',
      'Hooks',
      'Enterprise',
    ];

    for (const component of components) {
      await this.validateComponentSpecificLogic(component, result);
    }
  }

  /**
   * Validate specific component logic
   */
  private async validateComponentSpecificLogic(
    component: string,
    result: ValidationResult,
  ): Promise<void> {
    const componentFiles = await this.findComponentFiles(component);

    for (const filePath of componentFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Validate component assignment is correct
        if (content.includes('ConsoleMigration')) {
          const migrationMatches = content.match(/ConsoleMigration\.\w+\(['"](\w+)['"],/g);
          if (migrationMatches) {
            for (const match of migrationMatches) {
              const componentMatch = match.match(/['"](\w+)['"]/);
              if (componentMatch && componentMatch[1] !== component) {
                const relativePath = path.relative(this.projectRoot, filePath);
                result.errors.push(
                  `Incorrect component assignment in ${relativePath}: expected ${component}, got ${componentMatch[1]}`,
                );
              }
            }
          }
        }

        // MCP-specific validation: ensure stderr-only compliance
        if (component === 'MCP') {
          if (content.includes('console.log') || content.includes('console.info')) {
            const relativePath = path.relative(this.projectRoot, filePath);
            result.errors.push(
              `MCP protocol violation in ${relativePath}: stdout logging detected`,
            );
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  /**
   * Assess performance impact of migration
   */
  private async assessPerformanceImpact(result: ValidationResult): Promise<void> {
    console.log('🔍 Assessing performance impact...');

    try {
      // Initialize logger to measure baseline performance
      ComponentLoggerFactory.initializeDebugLogger({
        level: 'debug',
        format: 'json',
        destination: 'console',
      });

      const startMemory = process.memoryUsage();
      const startTime = Date.now();

      // Simulate logging operations
      const logger = ComponentLoggerFactory.getCoreLogger();
      for (let i = 0; i < 1000; i++) {
        logger.debug(`Performance test message ${i}`, { testData: { iteration: i } });
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      const timeDelta = endTime - startTime;

      // Performance impact should be minimal (<5% overhead)
      const maxAcceptableTime = 100; // 100ms for 1000 operations
      const maxAcceptableMemory = 1024 * 1024; // 1MB

      if (timeDelta > maxAcceptableTime) {
        result.warnings.push(
          `Performance impact detected: ${timeDelta}ms for 1000 operations (max: ${maxAcceptableTime}ms)`,
        );
      }

      if (memoryDelta > maxAcceptableMemory) {
        result.warnings.push(
          `Memory impact detected: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB increase`,
        );
      }

      result.metrics.performanceImpact = timeDelta;
    } catch (error) {
      result.warnings.push(
        `Performance assessment failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Run functionality preservation tests
   */
  private async runFunctionalityTests(result: ValidationResult): Promise<void> {
    console.log('🔍 Running functionality tests...');

    try {
      // Run existing test suite to ensure no regressions
      execSync('npm test', {
        cwd: this.projectRoot,
        stdio: 'pipe',
        timeout: 60000, // 1 minute timeout
      });
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        const execError = error as any;
        if (execError.status !== 0) {
          result.errors.push('Test suite failed - migration may have broken functionality');

          // Try to capture test output
          if (execError.stdout) {
            result.errors.push(`Test output: ${execError.stdout.toString()}`);
          }
          if (execError.stderr) {
            result.errors.push(`Test errors: ${execError.stderr.toString()}`);
          }
        }
      } else {
        result.warnings.push('Could not run test suite to validate functionality');
      }
    }
  }

  /**
   * Find all target files
   */
  private async findTargetFiles(): Promise<string[]> {
    const patterns = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'];
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: this.excludePatterns,
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)].sort();
  }

  /**
   * Find files for specific component
   */
  private async findComponentFiles(component: string): Promise<string[]> {
    const componentPath = component.toLowerCase();
    const pattern = `**/src/${componentPath}/**/*.{ts,js,tsx,jsx}`;

    return glob(pattern, {
      cwd: this.projectRoot,
      absolute: true,
      ignore: this.excludePatterns,
    });
  }

  /**
   * Resolve import path relative to file
   */
  private resolveImportPath(filePath: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      return path.resolve(
        path.dirname(filePath),
        importPath + (importPath.endsWith('.js') ? '' : '.js'),
      );
    }
    return path.join(this.projectRoot, 'node_modules', importPath);
  }

  /**
   * Print validation results
   */
  private printValidationResults(result: ValidationResult): void {
    console.log('\n📊 VALIDATION RESULTS');
    console.log('═'.repeat(50));

    if (result.passed) {
      console.log('✅ Migration validation PASSED');
    } else {
      console.log('❌ Migration validation FAILED');
    }

    console.log(`\n📄 Files validated: ${result.metrics.filesValidated}`);
    console.log(`🔄 Migrated calls: ${result.metrics.migratedCalls}`);
    console.log(`⚠️ Remaining console calls: ${result.metrics.consoleCalls}`);
    console.log(`📈 Migration coverage: ${result.metrics.migrationCoverage.toFixed(2)}%`);
    console.log(`⏱️ Performance impact: ${result.metrics.performanceImpact}ms`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach((error) => console.log(`  • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      result.warnings.forEach((warning) => console.log(`  • ${warning}`));
    }

    if (result.passed) {
      console.log(
        '\n🎉 Migration successfully maintains all functionality while adding debug capabilities!',
      );
    } else {
      console.log('\n🔧 Please address the errors above before proceeding.');
    }
  }
}

// CLI interface - PKG-compatible main module detection
const __filename = process.argv[1] || require.main?.filename || '';
const isMainModule = process.argv[1] && process.argv[1].endsWith('/validate-migration.ts');
if (isMainModule) {
  const projectRoot = process.argv[2] || process.cwd();
  const validator = new MigrationValidator(projectRoot);

  validator
    .validateMigration()
    .then((result) => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export default MigrationValidator;
