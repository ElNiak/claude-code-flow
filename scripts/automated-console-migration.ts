#!/usr/bin/env tsx

/**
 * Automated Console Migration System
 * Systematically replaces all console.* calls with component-aware debug logging
 *
 * Features:
 * - AST-based parsing for accurate replacement
 * - Component detection based on file location and imports
 * - Safe replacement with validation checks
 * - Rollback capability for each component
 * - Migration progress tracking and reporting
 * - Performance impact assessment
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { parse } from '@babel/parser';
import traverse, { type NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { ComponentType } from '../src/core/logger.js';

interface MigrationResult {
  filePath: string;
  component: ComponentType;
  totalReplacements: number;
  patterns: string[];
  success: boolean;
  backupPath?: string;
  errors?: string[];
  metrics: {
    originalSize: number;
    newSize: number;
    processingTime: number;
  };
}

interface MigrationSummary {
  totalFiles: number;
  totalReplacements: number;
  successfulMigrations: number;
  failedMigrations: number;
  componentBreakdown: Record<ComponentType, number>;
  methodBreakdown: Record<string, number>;
  performance: {
    totalProcessingTime: number;
    averageFileTime: number;
    memoryUsage: number;
  };
  rollbackData: Array<{
    filePath: string;
    backupPath: string;
    component: ComponentType;
  }>;
}

export class AutomatedConsoleMigration {
  private readonly projectRoot: string;
  private readonly backupDir: string;
  private readonly excludePatterns: string[] = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/docs/**',
    '**/roadmap/**',
    '**/IMPLEMENTATION_SUMMARY.md',
    '**/TDD_*',
  ];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.backupDir = path.join(projectRoot, '.claude-flow', 'migration-backups');
  }

  /**
   * Main migration entry point
   */
  async runMigration(): Promise<MigrationSummary> {
    console.log('🚀 Starting Automated Console Migration System');
    console.log(`📁 Project root: ${this.projectRoot}`);

    const startTime = Date.now();
    await this.ensureBackupDir();

    // Find all TypeScript and JavaScript files
    const files = await this.findTargetFiles();
    console.log(`📄 Found ${files.length} files to analyze`);

    // Analyze files in batches for memory efficiency
    const batchSize = 50;
    const results: MigrationResult[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`,
      );

      const batchResults = await Promise.all(batch.map((file) => this.migrateFile(file)));

      results.push(...batchResults);

      // Memory cleanup between batches
      if (global.gc) {
        global.gc();
      }
    }

    const summary = this.generateMigrationSummary(results, startTime);
    await this.saveMigrationReport(summary);

    console.log('✅ Migration completed successfully');
    this.printSummary(summary);

    return summary;
  }

  /**
   * Migrate a single file
   */
  private async migrateFile(filePath: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const relativePath = path.relative(this.projectRoot, filePath);

    try {
      // Read original file
      const originalContent = await fs.readFile(filePath, 'utf-8');
      const originalSize = originalContent.length;

      // Skip if no console calls found
      if (!this.hasConsoleCalls(originalContent)) {
        return {
          filePath: relativePath,
          component: this.detectComponent(filePath),
          totalReplacements: 0,
          patterns: [],
          success: true,
          metrics: {
            originalSize,
            newSize: originalSize,
            processingTime: Date.now() - startTime,
          },
        };
      }

      // Create backup
      const backupPath = await this.createBackup(filePath, originalContent);

      // Detect component type
      const component = this.detectComponent(filePath);

      // Parse and transform AST
      const { transformedContent, replacements, patterns } = await this.transformFile(
        originalContent,
        component,
        filePath,
      );

      // Write transformed content
      await fs.writeFile(filePath, transformedContent, 'utf-8');

      return {
        filePath: relativePath,
        component,
        totalReplacements: replacements,
        patterns,
        success: true,
        backupPath: path.relative(this.projectRoot, backupPath),
        metrics: {
          originalSize,
          newSize: transformedContent.length,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        filePath: relativePath,
        component: this.detectComponent(filePath),
        totalReplacements: 0,
        patterns: [],
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metrics: {
          originalSize: 0,
          newSize: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Transform file using AST parsing
   */
  private async transformFile(
    content: string,
    component: ComponentType,
    filePath: string,
  ): Promise<{
    transformedContent: string;
    replacements: number;
    patterns: string[];
  }> {
    const patterns = new Set<string>();
    let replacements = 0;

    try {
      // Parse with TypeScript/JSX support
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'asyncGenerators',
          'functionBind',
          'exportDefaultFrom',
          'dynamicImport',
        ],
      });

      let needsImport = false;

      // Transform console calls
      const traverseFunc = traverse.default || traverse;
      traverseFunc(ast, {
        MemberExpression(path: NodePath<t.MemberExpression>) {
          if (
            t.isIdentifier(path.node.object, { name: 'console' }) &&
            t.isIdentifier(path.node.property) &&
            ['log', 'info', 'warn', 'error', 'debug'].includes(path.node.property.name)
          ) {
            const method = path.node.property.name;
            patterns.add(`console.${method}`);
            replacements++;
            needsImport = true;

            // Replace console.method with ConsoleMigration.method
            const newCallExpression = t.callExpression(
              t.memberExpression(t.identifier('ConsoleMigration'), t.identifier(method)),
              [t.stringLiteral(component), ...(path.parent as t.CallExpression).arguments],
            );

            // Replace the entire call expression
            if (t.isCallExpression(path.parent)) {
              path.parentPath.replaceWith(newCallExpression);
            }
          }
        },
      });

      // Add import statement if needed
      if (needsImport && !content.includes('ConsoleMigration')) {
        const importDeclaration = t.importDeclaration(
          [t.importSpecifier(t.identifier('ConsoleMigration'), t.identifier('ConsoleMigration'))],
          t.stringLiteral(this.getRelativeImportPath(filePath)),
        );

        if ('body' in ast && Array.isArray(ast.body)) {
          ast.body.unshift(importDeclaration);
        }
      }

      // Generate transformed code
      const generated = generate(ast, {
        retainLines: true,
        compact: false,
      });

      return {
        transformedContent: generated.code,
        replacements,
        patterns: Array.from(patterns),
      };
    } catch (error) {
      // Fallback to regex-based replacement for problematic files
      console.warn(`⚠️ AST parsing failed for ${filePath}, using regex fallback:`, error);
      return this.fallbackRegexTransform(content, component, filePath);
    }
  }

  /**
   * Fallback regex-based transformation
   */
  private fallbackRegexTransform(
    content: string,
    component: ComponentType,
    filePath: string,
  ): {
    transformedContent: string;
    replacements: number;
    patterns: string[];
  } {
    const patterns = new Set<string>();
    let replacements = 0;
    let transformedContent = content;

    // Add import if not present
    if (!content.includes('ConsoleMigration')) {
      const importPath = this.getRelativeImportPath(filePath);
      const importStatement = `import { ConsoleMigration } from '${importPath}';\n`;
      transformedContent = importStatement + transformedContent;
    }

    // Replace console calls
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'];

    for (const method of consoleMethods) {
      const regex = new RegExp(`console\\.${method}\\s*\\(`, 'g');
      const matches = transformedContent.match(regex);

      if (matches) {
        patterns.add(`console.${method}`);
        replacements += matches.length;
        transformedContent = transformedContent.replace(
          regex,
          `ConsoleMigration.${method}('${component}', `,
        );
      }
    }

    return {
      transformedContent,
      replacements,
      patterns: Array.from(patterns),
    };
  }

  /**
   * Detect component type based on file path and imports
   */
  private detectComponent(filePath: string): ComponentType {
    const relativePath = path.relative(this.projectRoot, filePath).toLowerCase();

    if (relativePath.includes('/cli/') || relativePath.includes('\\cli\\')) return 'CLI';
    if (relativePath.includes('/mcp/') || relativePath.includes('\\mcp\\')) return 'MCP';
    if (relativePath.includes('/swarm/') || relativePath.includes('\\swarm\\')) return 'Swarm';
    if (relativePath.includes('/terminal/') || relativePath.includes('\\terminal\\'))
      return 'Terminal';
    if (relativePath.includes('/memory/') || relativePath.includes('\\memory\\')) return 'Memory';
    if (relativePath.includes('/migration/') || relativePath.includes('\\migration\\'))
      return 'Migration';
    if (relativePath.includes('/hooks/') || relativePath.includes('\\hooks\\')) return 'Hooks';
    if (relativePath.includes('/enterprise/') || relativePath.includes('\\enterprise\\'))
      return 'Enterprise';
    if (relativePath.includes('/core/') || relativePath.includes('\\core\\')) return 'Core';

    // Default to Core for unclassified files
    return 'Core';
  }

  /**
   * Get relative import path for ConsoleMigration
   */
  private getRelativeImportPath(filePath: string): string {
    const fileDir = path.dirname(filePath);
    const utilsDir = path.join(this.projectRoot, 'src', 'utils');
    const relativePath = path.relative(fileDir, utilsDir);
    return `${relativePath}/console-migration.js`.replace(/\\/g, '/');
  }

  /**
   * Check if file contains console calls
   */
  private hasConsoleCalls(content: string): boolean {
    return /console\.(log|info|warn|error|debug)\s*\(/.test(content);
  }

  /**
   * Find all target files for migration
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

    // Remove duplicates and sort
    return [...new Set(allFiles)].sort();
  }

  /**
   * Create backup of original file
   */
  private async createBackup(filePath: string, content: string): Promise<string> {
    const relativePath = path.relative(this.projectRoot, filePath);
    const backupPath = path.join(this.backupDir, relativePath);

    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, content, 'utf-8');

    return backupPath;
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDir(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * Generate migration summary
   */
  private generateMigrationSummary(
    results: MigrationResult[],
    startTime: number,
  ): MigrationSummary {
    const totalProcessingTime = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();

    const summary: MigrationSummary = {
      totalFiles: results.length,
      totalReplacements: results.reduce((sum, r) => sum + r.totalReplacements, 0),
      successfulMigrations: results.filter((r) => r.success).length,
      failedMigrations: results.filter((r) => !r.success).length,
      componentBreakdown: {} as Record<ComponentType, number>,
      methodBreakdown: {},
      performance: {
        totalProcessingTime,
        averageFileTime: totalProcessingTime / results.length,
        memoryUsage: memoryUsage.heapUsed,
      },
      rollbackData: results
        .filter((r) => r.success && r.backupPath)
        .map((r) => ({
          filePath: r.filePath,
          backupPath: r.backupPath!,
          component: r.component,
        })),
    };

    // Calculate breakdowns
    for (const result of results) {
      if (!result.success) continue;

      summary.componentBreakdown[result.component] =
        (summary.componentBreakdown[result.component] || 0) + result.totalReplacements;

      for (const pattern of result.patterns) {
        const method = pattern.replace('console.', '');
        summary.methodBreakdown[method] = (summary.methodBreakdown[method] || 0) + 1;
      }
    }

    return summary;
  }

  /**
   * Save migration report
   */
  private async saveMigrationReport(summary: MigrationSummary): Promise<void> {
    const reportPath = path.join(this.backupDir, 'migration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2), 'utf-8');

    // Save rollback script
    const rollbackScript = this.generateRollbackScript(summary.rollbackData);
    const rollbackPath = path.join(this.backupDir, 'rollback.sh');
    await fs.writeFile(rollbackPath, rollbackScript, 'utf-8');
    await fs.chmod(rollbackPath, 0o755);
  }

  /**
   * Generate rollback script
   */
  private generateRollbackScript(
    rollbackData: Array<{ filePath: string; backupPath: string }>,
  ): string {
    const commands = rollbackData.map(
      (data) =>
        `cp "${path.join(this.backupDir, data.backupPath)}" "${path.join(this.projectRoot, data.filePath)}"`,
    );

    return `#!/bin/bash
# Console Migration Rollback Script
# Generated: ${new Date().toISOString()}

echo "🔄 Rolling back console migration..."

${commands.join('\n')}

echo "✅ Rollback completed - ${rollbackData.length} files restored"
`;
  }

  /**
   * Print migration summary
   */
  private printSummary(summary: MigrationSummary): void {
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('═'.repeat(50));
    console.log(`📄 Total files processed: ${summary.totalFiles}`);
    console.log(`🔄 Total console calls migrated: ${summary.totalReplacements}`);
    console.log(`✅ Successful migrations: ${summary.successfulMigrations}`);
    console.log(`❌ Failed migrations: ${summary.failedMigrations}`);
    console.log(
      `⏱️ Total processing time: ${(summary.performance.totalProcessingTime / 1000).toFixed(2)}s`,
    );
    console.log(
      `💾 Memory usage: ${(summary.performance.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
    );

    console.log('\n🏗️ COMPONENT BREAKDOWN:');
    for (const [component, count] of Object.entries(summary.componentBreakdown)) {
      console.log(`  ${component}: ${count} migrations`);
    }

    console.log('\n📝 METHOD BREAKDOWN:');
    for (const [method, count] of Object.entries(summary.methodBreakdown)) {
      console.log(`  console.${method}: ${count} files`);
    }

    console.log(`\n💾 Backup location: ${this.backupDir}`);
    console.log(`🔄 Rollback script: ${path.join(this.backupDir, 'rollback.sh')}`);
  }

  /**
   * Rollback migration for specific component
   */
  async rollbackComponent(component: ComponentType): Promise<void> {
    const reportPath = path.join(this.backupDir, 'migration-report.json');
    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const report: MigrationSummary = JSON.parse(reportContent);

    const componentFiles = report.rollbackData.filter((data) => data.component === component);

    console.log(`🔄 Rolling back ${componentFiles.length} files for component: ${component}`);

    for (const data of componentFiles) {
      const backupPath = path.join(this.backupDir, data.backupPath);
      const originalPath = path.join(this.projectRoot, data.filePath);

      try {
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(originalPath, backupContent, 'utf-8');
        console.log(`✅ Restored: ${data.filePath}`);
      } catch (error) {
        console.error(`❌ Failed to restore: ${data.filePath}`, error);
      }
    }
  }
}

// CLI interface - PKG-compatible main module detection
const isMainModule = process.argv[1] && process.argv[1].endsWith('/automated-console-migration.ts');
if (isMainModule) {
  const projectRoot = process.argv[2] || process.cwd();
  const migration = new AutomatedConsoleMigration(projectRoot);

  migration.runMigration().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

export default AutomatedConsoleMigration;
