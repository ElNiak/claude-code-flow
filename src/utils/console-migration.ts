/**
 * Console migration utilities for systematic replacement of console.* calls
 */

import { ComponentLoggerFactory, type ComponentType } from '../core/logger.js';

/**
 * Migration tracking and replacement for console calls
 */
export class ConsoleMigration {
  private static migrationStats = new Map<
    string,
    {
      originalCalls: number;
      migratedCalls: number;
      lastSeen: Date;
      locations: Set<string>;
    }
  >();

  /**
   * Replace console.log with component-aware debug logging
   */
  static log(component: ComponentType, message: string, ...args: unknown[]): void {
    this.trackMigration('log', component);
    const logger = ComponentLoggerFactory.getLogger(component);
    logger.info(message, { args: args.length > 0 ? args : undefined });
  }

  /**
   * Replace console.info with component-aware debug logging
   */
  static info(component: ComponentType, message: string, ...args: unknown[]): void {
    this.trackMigration('info', component);
    const logger = ComponentLoggerFactory.getLogger(component);
    logger.info(message, { args: args.length > 0 ? args : undefined });
  }

  /**
   * Replace console.warn with component-aware debug logging
   */
  static warn(component: ComponentType, message: string, ...args: unknown[]): void {
    this.trackMigration('warn', component);
    const logger = ComponentLoggerFactory.getLogger(component);
    logger.warn(message, { args: args.length > 0 ? args : undefined });
  }

  /**
   * Replace console.error with component-aware debug logging
   */
  static error(
    component: ComponentType,
    message: string,
    error?: unknown,
    ...args: unknown[]
  ): void {
    this.trackMigration('error', component);
    const logger = ComponentLoggerFactory.getLogger(component);
    logger.error(message, error || (args.length > 0 ? args[0] : undefined));
  }

  /**
   * Replace console.debug with component-aware debug logging
   */
  static debug(component: ComponentType, message: string, ...args: unknown[]): void {
    this.trackMigration('debug', component);
    const logger = ComponentLoggerFactory.getLogger(component);
    logger.debug(message, { args: args.length > 0 ? args : undefined });
  }

  /**
   * Track migration statistics
   */
  private static trackMigration(method: string, component: ComponentType): void {
    const key = `${method}@${component}`;
    const location = new Error().stack?.split('\n')[3]?.trim() || 'unknown';

    const existing = this.migrationStats.get(key);
    if (existing) {
      existing.migratedCalls++;
      existing.lastSeen = new Date();
      existing.locations.add(location);
    } else {
      this.migrationStats.set(key, {
        originalCalls: 0,
        migratedCalls: 1,
        lastSeen: new Date(),
        locations: new Set([location]),
      });
    }
  }

  /**
   * Get migration statistics
   */
  static getMigrationStats(): Record<
    string,
    {
      originalCalls: number;
      migratedCalls: number;
      migrationRate: number;
      lastSeen: string;
      locations: string[];
    }
  > {
    const stats: Record<string, any> = {};

    for (const [key, data] of this.migrationStats.entries()) {
      stats[key] = {
        originalCalls: data.originalCalls,
        migratedCalls: data.migratedCalls,
        migrationRate: data.originalCalls > 0 ? data.migratedCalls / data.originalCalls : 1,
        lastSeen: data.lastSeen.toISOString(),
        locations: Array.from(data.locations),
      };
    }

    return stats;
  }

  /**
   * Batch migrate console calls in a file
   */
  static async migrateFile(
    filePath: string,
    component: ComponentType,
  ): Promise<{
    totalReplacements: number;
    patterns: string[];
    success: boolean;
    error?: string;
  }> {
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      // Read and validate file
      const content = await fs.readFile(filePath, 'utf-8');

      const patterns = [
        'console.log',
        'console.info',
        'console.warn',
        'console.error',
        'console.debug',
      ];

      let totalReplacements = 0;
      let modifiedContent = content;

      // Calculate relative import path
      const fileDir = path.dirname(filePath);
      const projectRoot = process.cwd();
      const utilsPath = path.join(projectRoot, 'src', 'utils');
      const relativePath = path.relative(fileDir, utilsPath);
      const importPath = `${relativePath}/console-migration.js`.replace(/\\/g, '/');

      // Add import statement if not present and we have console calls
      const hasConsoleCalls = patterns.some((p) => content.includes(p));
      if (hasConsoleCalls && !content.includes('ConsoleMigration')) {
        const importStatement = `import { ConsoleMigration } from '${importPath}';\n`;
        modifiedContent = importStatement + modifiedContent;
      }

      // Replace console calls with more robust pattern matching
      for (const pattern of patterns) {
        const method = pattern.replace('console.', '');
        const regex = new RegExp(`\\bconsole\\.${method}\\s*\\(`, 'g');
        const matches = modifiedContent.match(regex);

        if (matches) {
          totalReplacements += matches.length;

          // Special handling for MCP components (stderr compliance)
          if (component === 'MCP' && (method === 'log' || method === 'info')) {
            modifiedContent = modifiedContent.replace(
              regex,
              `ConsoleMigration.error('${component}', `,
            );
          } else {
            modifiedContent = modifiedContent.replace(
              regex,
              `ConsoleMigration.${method}('${component}', `,
            );
          }
        }
      }

      // Only write file if changes were made
      if (totalReplacements > 0) {
        // Create backup before modifying
        const backupPath = `${filePath}.migration-backup`;
        await fs.copyFile(filePath, backupPath);

        await fs.writeFile(filePath, modifiedContent, 'utf-8');
      }

      return {
        totalReplacements,
        patterns: patterns.filter((p) => content.includes(p)),
        success: true,
      };
    } catch (error) {
      return {
        totalReplacements: 0,
        patterns: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Rollback migration for a specific file
   */
  static async rollbackFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fs = await import('node:fs/promises');
      const backupPath = `${filePath}.migration-backup`;

      // Check if backup exists
      await fs.access(backupPath);

      // Restore from backup
      await fs.copyFile(backupPath, filePath);

      // Remove backup file
      await fs.unlink(backupPath);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate migration for a file
   */
  static async validateFileM(
    filePath: string,
    component: ComponentType,
  ): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    try {
      const fs = await import('node:fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');

      const issues: string[] = [];
      const suggestions: string[] = [];

      // Check for unmigrated console calls
      const consoleCalls = content.match(/\bconsole\.(log|info|warn|error|debug)\s*\(/g);
      if (consoleCalls) {
        issues.push(`Found ${consoleCalls.length} unmigrated console calls`);
        suggestions.push('Run migration again to complete the process');
      }

      // Check for correct import
      if (
        content.includes('ConsoleMigration') &&
        !content.includes('import { ConsoleMigration }')
      ) {
        issues.push('ConsoleMigration used but import statement missing');
        suggestions.push('Add import statement for ConsoleMigration');
      }

      // Check component assignment
      const migrationCalls = content.match(/ConsoleMigration\.\w+\(['"](\w+)['"],/g);
      if (migrationCalls) {
        for (const call of migrationCalls) {
          const componentMatch = call.match(/['"](\w+)['"]/);
          if (componentMatch && componentMatch[1] !== component) {
            issues.push(
              `Incorrect component assignment: expected ${component}, got ${componentMatch[1]}`,
            );
            suggestions.push(`Update component assignments to use '${component}'`);
          }
        }
      }

      // MCP-specific validation
      if (component === 'MCP') {
        if (content.includes('ConsoleMigration.log') || content.includes('ConsoleMigration.info')) {
          suggestions.push('MCP components should prefer error/warn methods for stderr compliance');
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        suggestions,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [error instanceof Error ? error.message : String(error)],
        suggestions: ['Check file accessibility and permissions'],
      };
    }
  }

  /**
   * Generate migration report
   */
  static generateMigrationReport(): {
    totalMigrated: number;
    byComponent: Record<ComponentType, number>;
    byMethod: Record<string, number>;
    completionPercentage: number;
    recommendations: string[];
  } {
    const stats = this.getMigrationStats();
    let totalMigrated = 0;
    const byComponent: Record<ComponentType, number> = {} as Record<ComponentType, number>;
    const byMethod: Record<string, number> = {};

    for (const [key, data] of Object.entries(stats)) {
      const [method, component] = key.split('@');
      totalMigrated += data.migratedCalls;

      byComponent[component as ComponentType] =
        (byComponent[component as ComponentType] || 0) + data.migratedCalls;
      byMethod[method] = (byMethod[method] || 0) + data.migratedCalls;
    }

    const recommendations = [];

    // Analyze patterns and provide recommendations
    if (byMethod['error'] > byMethod['debug']) {
      recommendations.push(
        'Consider using debug logging for development-time information instead of error logging',
      );
    }

    if (totalMigrated < 100) {
      recommendations.push(
        'Migration is in early stages - consider batch processing files by component',
      );
    }

    if (byComponent['MCP'] > 0) {
      recommendations.push(
        'MCP components detected - ensure stderr-only compliance for protocol requirements',
      );
    }

    return {
      totalMigrated,
      byComponent,
      byMethod,
      completionPercentage:
        totalMigrated > 0 ? (totalMigrated / (totalMigrated + Object.keys(stats).length)) * 100 : 0,
      recommendations,
    };
  }
}

// Legacy console replacement exports for gradual migration
export const consoleLog = (component: ComponentType, message: string, ...args: unknown[]) =>
  ConsoleMigration.log(component, message, ...args);

export const consoleInfo = (component: ComponentType, message: string, ...args: unknown[]) =>
  ConsoleMigration.info(component, message, ...args);

export const consoleWarn = (component: ComponentType, message: string, ...args: unknown[]) =>
  ConsoleMigration.warn(component, message, ...args);

export const consoleError = (
  component: ComponentType,
  message: string,
  error?: unknown,
  ...args: unknown[]
) => ConsoleMigration.error(component, message, error, ...args);

export const consoleDebug = (component: ComponentType, message: string, ...args: unknown[]) =>
  ConsoleMigration.debug(component, message, ...args);
