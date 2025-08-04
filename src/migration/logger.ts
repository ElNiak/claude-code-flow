import { ConsoleMigration } from '../utils/console-migration.js';
import * as process from 'node:process';
/**
 * Migration Logger - Structured logging for migration operations
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as chalk from 'chalk';

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
  context?: any;
  stack?: string;
}

export class MigrationLogger {
  private logFile?: string;
  private entries: LogEntry[] = [];

  constructor(logFile?: string) {
    this.logFile = logFile;
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
    ConsoleMigration.log('Migration', chalk.blue(`ℹ️  ${message}`));
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
    ConsoleMigration.log('Migration', chalk.yellow(`⚠️  ${message}`));
  }

  error(message: string, error?: Error | any, context?: any): void {
    this.log('error', message, context, error?.stack);
    ConsoleMigration.log('Migration', chalk.red(`❌ ${message}`));
    if (error && (error instanceof Error ? error.message : String(error)) !== message) {
      ConsoleMigration.log(
        'Migration',
        chalk.red(`   ${error instanceof Error ? error.message : String(error)}`),
      );
    }
  }

  success(message: string, context?: any): void {
    this.log('success', message, context);
    ConsoleMigration.log('Migration', chalk.green(`✅ ${message}`));
  }

  debug(message: string, context?: any): void {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
      ConsoleMigration.log('Migration', chalk.gray(`🔍 ${message}`));
    }
  }

  private log(level: LogEntry['level'], message: string, context?: any, stack?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      stack,
    };

    this.entries.push(entry);

    if (this.logFile) {
      this.writeToFile(entry);
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.logFile) return;

    try {
      const logDir = path.dirname(this.logFile);
      await fs.ensureDir(logDir);

      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      // Prevent recursive logging
      ConsoleMigration.error(
        'Migration',
        'Failed to write to log file:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async saveToFile(filePath: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, this.entries, { spaces: 2 });
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getEntriesByLevel(level: LogEntry['level']): LogEntry[] {
    return this.entries.filter((entry) => entry.level === level);
  }

  clear(): void {
    this.entries = [];
  }

  printSummary(): void {
    const summary = {
      total: this.entries.length,
      info: this.getEntriesByLevel('info').length,
      warn: this.getEntriesByLevel('warn').length,
      error: this.getEntriesByLevel('error').length,
      success: this.getEntriesByLevel('success').length,
      debug: this.getEntriesByLevel('debug').length,
    };

    ConsoleMigration.log('Migration', chalk.bold('\n📊 Migration Log Summary'));
    ConsoleMigration.log('Migration', chalk.gray('─'.repeat(30)));
    ConsoleMigration.log('Migration', `Total entries: ${summary.total}`);
    ConsoleMigration.log('Migration', `${chalk.blue('Info:')} ${summary.info}`);
    ConsoleMigration.log('Migration', `${chalk.green('Success:')} ${summary.success}`);
    ConsoleMigration.log('Migration', `${chalk.yellow('Warnings:')} ${summary.warn}`);
    ConsoleMigration.log('Migration', `${chalk.red('Errors:')} ${summary.error}`);
    if (summary.debug > 0) {
      ConsoleMigration.log('Migration', `${chalk.gray('Debug:')} ${summary.debug}`);
    }
    ConsoleMigration.log('Migration', chalk.gray('─'.repeat(30)));
  }
}

// Global logger instance
export const logger = new MigrationLogger();

// Set log file if in production
if (process.env.NODE_ENV === 'production') {
  const logFile = path.join(process.cwd(), 'logs', 'migration.log');
  logger['logFile'] = logFile;
}
