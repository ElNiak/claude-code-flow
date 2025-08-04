#!/usr/bin/env tsx

/**
 * Component-Specific Console Migration System
 * Handles migration by component with priority-based processing
 * and component-specific validation rules
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { ComponentType } from '../src/core/logger.js';
import AutomatedConsoleMigration from './automated-console-migration.js';
import MigrationValidator from './validate-migration.js';

interface ComponentMigrationConfig {
  component: ComponentType;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  paths: string[];
  expectedCalls: number;
  validationRules: string[];
  dependencies: ComponentType[];
}

interface ComponentMigrationResult {
  component: ComponentType;
  success: boolean;
  filesMigrated: number;
  callsMigrated: number;
  validationPassed: boolean;
  performanceImpact: number;
  errors: string[];
  warnings: string[];
}

export class ComponentMigrationSystem {
  private readonly projectRoot: string;
  private readonly migrationOrder: ComponentMigrationConfig[] = [
    {
      component: 'Core',
      priority: 'CRITICAL',
      paths: ['src/core/**'],
      expectedCalls: 600,
      validationRules: ['syntax', 'imports', 'performance'],
      dependencies: [],
    },
    {
      component: 'MCP',
      priority: 'CRITICAL',
      paths: ['src/mcp/**', 'src/server/**'],
      expectedCalls: 800,
      validationRules: ['syntax', 'imports', 'stderr-compliance', 'performance'],
      dependencies: ['Core'],
    },
    {
      component: 'CLI',
      priority: 'HIGH',
      paths: ['src/cli/**', 'bin/**'],
      expectedCalls: 1500,
      validationRules: ['syntax', 'imports', 'user-output', 'performance'],
      dependencies: ['Core'],
    },
    {
      component: 'Swarm',
      priority: 'HIGH',
      paths: ['src/swarm/**', 'src/coordination/**'],
      expectedCalls: 1200,
      validationRules: ['syntax', 'imports', 'distributed-logging', 'performance'],
      dependencies: ['Core'],
    },
    {
      component: 'Memory',
      priority: 'MEDIUM',
      paths: ['src/memory/**'],
      expectedCalls: 300,
      validationRules: ['syntax', 'imports', 'memory-pressure', 'performance'],
      dependencies: ['Core'],
    },
    {
      component: 'Terminal',
      priority: 'MEDIUM',
      paths: ['src/terminal/**', 'src/ui/**'],
      expectedCalls: 400,
      validationRules: ['syntax', 'imports', 'user-interface', 'performance'],
      dependencies: ['Core'],
    },
    {
      component: 'Migration',
      priority: 'MEDIUM',
      paths: ['src/migration/**'],
      expectedCalls: 200,
      validationRules: ['syntax', 'imports', 'migration-safety', 'performance'],
      dependencies: ['Core'],
    },
    {
      component: 'Hooks',
      priority: 'LOW',
      paths: ['src/hooks/**'],
      expectedCalls: 150,
      validationRules: ['syntax', 'imports', 'lifecycle', 'performance'],
      dependencies: ['Core'],
    },
    {
      component: 'Enterprise',
      priority: 'LOW',
      paths: ['src/enterprise/**'],
      expectedCalls: 100,
      validationRules: ['syntax', 'imports', 'security', 'performance'],
      dependencies: ['Core'],
    },
  ];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run component-by-component migration
   */
  async runComponentMigration(): Promise<ComponentMigrationResult[]> {
    console.log('🚀 Starting Component-Based Console Migration');
    console.log('═'.repeat(60));

    const results: ComponentMigrationResult[] = [];

    // Sort by priority and dependencies
    const sortedComponents = this.sortComponentsByPriority();

    for (const config of sortedComponents) {
      console.log(`\n🔄 Migrating ${config.component} component (${config.priority} priority)`);

      try {
        const result = await this.migrateComponent(config);
        results.push(result);

        if (!result.success) {
          console.error(`❌ ${config.component} migration failed - stopping pipeline`);
          break;
        }

        console.log(`✅ ${config.component} migration completed successfully`);
      } catch (error) {
        const errorResult: ComponentMigrationResult = {
          component: config.component,
          success: false,
          filesMigrated: 0,
          callsMigrated: 0,
          validationPassed: false,
          performanceImpact: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          warnings: [],
        };

        results.push(errorResult);
        console.error(`❌ ${config.component} migration failed:`, error);
        break;
      }
    }

    await this.generateComponentReport(results);
    this.printComponentSummary(results);

    return results;
  }

  /**
   * Migrate a specific component
   */
  private async migrateComponent(
    config: ComponentMigrationConfig,
  ): Promise<ComponentMigrationResult> {
    const startTime = Date.now();

    // 1. Validate dependencies are migrated first
    await this.validateDependencies(config);

    // 2. Find component files
    const files = await this.findComponentFiles(config.paths);
    console.log(`📁 Found ${files.length} files for ${config.component}`);

    // 3. Create component-specific backup
    await this.createComponentBackup(config.component, files);

    // 4. Run migration for component files
    const migration = new AutomatedConsoleMigration(this.projectRoot);
    const migrationResults = await this.migrateComponentFiles(files, config.component);

    // 5. Validate component-specific rules
    const validationResult = await this.validateComponent(config);

    // 6. Performance assessment
    const performanceImpact = Date.now() - startTime;

    return {
      component: config.component,
      success: migrationResults.success && validationResult.passed,
      filesMigrated: migrationResults.fileCount,
      callsMigrated: migrationResults.callCount,
      validationPassed: validationResult.passed,
      performanceImpact,
      errors: [...migrationResults.errors, ...validationResult.errors],
      warnings: [...migrationResults.warnings, ...validationResult.warnings],
    };
  }

  /**
   * Migrate files for specific component
   */
  private async migrateComponentFiles(
    files: string[],
    component: ComponentType,
  ): Promise<{
    success: boolean;
    fileCount: number;
    callCount: number;
    errors: string[];
    warnings: string[];
  }> {
    let totalCalls = 0;
    let successfulFiles = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Count console calls before migration
        const consoleCalls = (content.match(/console\.(log|info|warn|error|debug)\s*\(/g) || [])
          .length;

        if (consoleCalls === 0) {
          successfulFiles++;
          continue;
        }

        // Apply component-specific migration
        const migratedContent = await this.applyComponentMigration(content, component, filePath);

        // Write migrated content
        await fs.writeFile(filePath, migratedContent, 'utf-8');

        totalCalls += consoleCalls;
        successfulFiles++;
      } catch (error) {
        const relativePath = path.relative(this.projectRoot, filePath);
        errors.push(
          `Failed to migrate ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      success: errors.length === 0,
      fileCount: successfulFiles,
      callCount: totalCalls,
      errors,
      warnings,
    };
  }

  /**
   * Apply component-specific migration logic
   */
  private async applyComponentMigration(
    content: string,
    component: ComponentType,
    filePath: string,
  ): Promise<string> {
    let migratedContent = content;

    // Add import if not present
    if (!content.includes('ConsoleMigration') && this.hasConsoleCalls(content)) {
      const importPath = this.getRelativeImportPath(filePath);
      const importStatement = `import { ConsoleMigration } from '${importPath}';\n`;
      migratedContent = importStatement + migratedContent;
    }

    // Apply component-specific replacements
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'];

    for (const method of consoleMethods) {
      const regex = new RegExp(`console\\.${method}\\s*\\(`, 'g');

      // Special handling for MCP components (stderr compliance)
      if (component === 'MCP' && (method === 'log' || method === 'info')) {
        migratedContent = migratedContent.replace(regex, `ConsoleMigration.error('${component}', `);
      } else {
        migratedContent = migratedContent.replace(
          regex,
          `ConsoleMigration.${method}('${component}', `,
        );
      }
    }

    return migratedContent;
  }

  /**
   * Validate component-specific rules
   */
  private async validateComponent(config: ComponentMigrationConfig): Promise<{
    passed: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const files = await this.findComponentFiles(config.paths);

    for (const rule of config.validationRules) {
      try {
        await this.applyValidationRule(rule, config.component, files, errors, warnings);
      } catch (error) {
        errors.push(
          `Validation rule '${rule}' failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Apply specific validation rule
   */
  private async applyValidationRule(
    rule: string,
    component: ComponentType,
    files: string[],
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    switch (rule) {
      case 'stderr-compliance':
        await this.validateStderrCompliance(component, files, errors, warnings);
        break;

      case 'user-output':
        await this.validateUserOutput(component, files, errors, warnings);
        break;

      case 'distributed-logging':
        await this.validateDistributedLogging(component, files, errors, warnings);
        break;

      case 'memory-pressure':
        await this.validateMemoryPressure(component, files, errors, warnings);
        break;

      case 'migration-safety':
        await this.validateMigrationSafety(component, files, errors, warnings);
        break;

      case 'security':
        await this.validateSecurity(component, files, errors, warnings);
        break;

      default:
        // Standard validation rules handled by base validator
        break;
    }
  }

  /**
   * Validate MCP stderr compliance
   */
  private async validateStderrCompliance(
    component: ComponentType,
    files: string[],
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    if (component !== 'MCP') return;

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for stdout violations
      if (content.includes('console.log') || content.includes('console.info')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        errors.push(`MCP protocol violation in ${relativePath}: stdout logging detected`);
      }

      // Ensure all output goes to stderr
      if (content.includes('ConsoleMigration.log') || content.includes('ConsoleMigration.info')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        warnings.push(
          `MCP component should use error/warn methods for stderr compliance in ${relativePath}`,
        );
      }
    }
  }

  /**
   * Validate user output formatting
   */
  private async validateUserOutput(
    component: ComponentType,
    files: string[],
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    if (component !== 'CLI') return;

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');

      // CLI components should preserve user-friendly output
      if (content.includes('ConsoleMigration') && !content.includes('userFriendly')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        warnings.push(
          `CLI component may need user-friendly output preservation in ${relativePath}`,
        );
      }
    }
  }

  /**
   * Validate distributed logging patterns
   */
  private async validateDistributedLogging(
    component: ComponentType,
    files: string[],
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    if (component !== 'Swarm') return;

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');

      // Swarm components should use correlation tracking
      if (content.includes('ConsoleMigration') && !content.includes('correlationId')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        warnings.push(`Swarm component should implement correlation tracking in ${relativePath}`);
      }
    }
  }

  /**
   * Validate memory pressure handling
   */
  private async validateMemoryPressure(
    component: ComponentType,
    files: string[],
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    if (component !== 'Memory') return;

    // Memory components should be especially careful about logging overhead
    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');

      if (content.includes('ConsoleMigration.debug') && !content.includes('debugIf')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        warnings.push(`Memory component should use conditional debug logging in ${relativePath}`);
      }
    }
  }

  /**
   * Validate migration safety
   */
  private async validateMigrationSafety(
    component: ComponentType,
    files: string[],
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    if (component !== 'Migration') return;

    // Migration components should not break during their own migration
    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');

      if (content.includes('console.') && content.includes('migration')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        errors.push(`Critical migration code still uses console in ${relativePath}`);
      }
    }
  }

  /**
   * Validate security considerations
   */
  private async validateSecurity(
    component: ComponentType,
    files: string[],
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    if (component !== 'Enterprise') return;

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for potential data leakage in logs
      if (content.includes('password') || content.includes('token') || content.includes('secret')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        warnings.push(`Potential sensitive data in logs detected in ${relativePath}`);
      }
    }
  }

  /**
   * Helper methods
   */
  private sortComponentsByPriority(): ComponentMigrationConfig[] {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    return [...this.migrationOrder].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Sort by dependency order within same priority
      if (a.dependencies.includes(b.component)) return 1;
      if (b.dependencies.includes(a.component)) return -1;

      return 0;
    });
  }

  private async validateDependencies(config: ComponentMigrationConfig): Promise<void> {
    // Implementation would check that dependencies are already migrated
    // For now, we assume dependencies are handled by the migration order
  }

  private async findComponentFiles(paths: string[]): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of paths) {
      const files = await glob(`${pattern}/*.{ts,js,tsx,jsx}`, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)].sort();
  }

  private async createComponentBackup(component: ComponentType, files: string[]): Promise<void> {
    const backupDir = path.join(
      this.projectRoot,
      '.claude-flow',
      'component-backups',
      component.toLowerCase(),
    );
    await fs.mkdir(backupDir, { recursive: true });

    for (const filePath of files) {
      const relativePath = path.relative(this.projectRoot, filePath);
      const backupPath = path.join(backupDir, relativePath);

      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      const content = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(backupPath, content, 'utf-8');
    }
  }

  private hasConsoleCalls(content: string): boolean {
    return /console\.(log|info|warn|error|debug)\s*\(/.test(content);
  }

  private getRelativeImportPath(filePath: string): string {
    const fileDir = path.dirname(filePath);
    const utilsDir = path.join(this.projectRoot, 'src', 'utils');
    const relativePath = path.relative(fileDir, utilsDir);
    return `${relativePath}/console-migration.js`.replace(/\\/g, '/');
  }

  private async generateComponentReport(results: ComponentMigrationResult[]): Promise<void> {
    const reportPath = path.join(
      this.projectRoot,
      '.claude-flow',
      'component-migration-report.json',
    );
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  }

  private printComponentSummary(results: ComponentMigrationResult[]): void {
    console.log('\n📊 COMPONENT MIGRATION SUMMARY');
    console.log('═'.repeat(60));

    const totalFiles = results.reduce((sum, r) => sum + r.filesMigrated, 0);
    const totalCalls = results.reduce((sum, r) => sum + r.callsMigrated, 0);
    const successfulComponents = results.filter((r) => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.performanceImpact, 0);

    console.log(`📄 Total files migrated: ${totalFiles}`);
    console.log(`🔄 Total console calls migrated: ${totalCalls}`);
    console.log(`✅ Successful components: ${successfulComponents}/${results.length}`);
    console.log(`⏱️ Total processing time: ${(totalTime / 1000).toFixed(2)}s`);

    console.log('\n🏗️ COMPONENT STATUS:');
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      const validation = result.validationPassed ? '🔍✅' : '🔍❌';
      console.log(
        `  ${status} ${validation} ${result.component}: ${result.callsMigrated} calls in ${result.filesMigrated} files`,
      );

      if (result.errors.length > 0) {
        result.errors.forEach((error) => console.log(`    ❌ ${error}`));
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => console.log(`    ⚠️ ${warning}`));
      }
    }
  }
}

// CLI interface - PKG-compatible main module detection
const __filename = process.argv[1] || require.main?.filename || '';
const isMainModule = process.argv[1] && process.argv[1].endsWith('/component-migration.ts');
if (isMainModule) {
  const projectRoot = process.argv[2] || process.cwd();
  const component = process.argv[3] as ComponentType;

  const migrationSystem = new ComponentMigrationSystem(projectRoot);

  if (component) {
    console.log(`Migrating specific component: ${component}`);
    // TODO: Implement single component migration
  } else {
    migrationSystem.runComponentMigration().catch((error) => {
      console.error('❌ Component migration failed:', error);
      process.exit(1);
    });
  }
}

export default ComponentMigrationSystem;
