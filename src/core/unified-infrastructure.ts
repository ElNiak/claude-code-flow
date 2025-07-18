import { EventBus } from './event-bus.js';
import { Logger } from './logger.js';
import { ConfigManager } from './config.js';
import chalk from 'chalk';

/**
 * Unified Infrastructure - Single source of truth for all shared services
 * Eliminates duplicate code and provides consistent interfaces
 */
export class UnifiedInfrastructure {
  private static instance: UnifiedInfrastructure;

  public readonly logger: Logger;
  public readonly eventBus: EventBus;
  public readonly configManager: ConfigManager;
  public readonly outputFormatter: OutputFormatter;
  public readonly errorHandler: UnifiedErrorHandler;

  private constructor() {
    this.logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'console'
    });

    this.eventBus = EventBus.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.outputFormatter = new OutputFormatter();
    this.errorHandler = new UnifiedErrorHandler(this.logger);
  }

  public static getInstance(): UnifiedInfrastructure {
    if (!UnifiedInfrastructure.instance) {
      UnifiedInfrastructure.instance = new UnifiedInfrastructure();
    }
    return UnifiedInfrastructure.instance;
  }

  /**
   * Initialize all infrastructure components
   */
  public async initialize(): Promise<void> {
    await this.configManager.init();
    this.logger.info('🚀 Unified Infrastructure initialized');
  }

  /**
   * Cleanup all resources
   */
  public async cleanup(): Promise<void> {
    this.eventBus.shutdown();
    this.logger.info('✅ Unified Infrastructure cleaned up');
  }
}

/**
 * Unified Output Formatter - Replaces 267 chalk instances
 */
export class OutputFormatter {
  // Standard color schemes
  private readonly colors = {
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.cyan,
    debug: chalk.gray,
    highlight: chalk.blue.bold,
    dim: chalk.dim
  };

  // Standard symbols
  private readonly symbols = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    debug: '🔍',
    progress: '⏳',
    arrow: '➤',
    bullet: '•'
  };

  /**
   * Format success message
   */
  success(message: string): string {
    return this.colors.success(`${this.symbols.success} ${message}`);
  }

  /**
   * Format error message
   */
  error(message: string): string {
    return this.colors.error(`${this.symbols.error} ${message}`);
  }

  /**
   * Format warning message
   */
  warning(message: string): string {
    return this.colors.warning(`${this.symbols.warning} ${message}`);
  }

  /**
   * Format info message
   */
  info(message: string): string {
    return this.colors.info(`${this.symbols.info} ${message}`);
  }

  /**
   * Format debug message
   */
  debug(message: string): string {
    return this.colors.debug(`${this.symbols.debug} ${message}`);
  }

  /**
   * Format progress message
   */
  progress(message: string): string {
    return this.colors.info(`${this.symbols.progress} ${message}`);
  }

  /**
   * Format highlighted text
   */
  highlight(text: string): string {
    return this.colors.highlight(text);
  }

  /**
   * Format dimmed text
   */
  dim(text: string): string {
    return this.colors.dim(text);
  }

  /**
   * Format section header
   */
  section(title: string): string {
    return this.colors.highlight(`\n${title}\n${'='.repeat(title.length)}`);
  }

  /**
   * Format list item
   */
  listItem(text: string): string {
    return `${this.colors.info(this.symbols.bullet)} ${text}`;
  }

  /**
   * Format key-value pair
   */
  keyValue(key: string, value: string): string {
    return `${this.colors.dim(key)}: ${this.colors.highlight(value)}`;
  }

  /**
   * Print formatted message to console
   */
  print(message: string): void {
    console.log(message);
  }

  /**
   * Print success message
   */
  printSuccess(message: string): void {
    this.print(this.success(message));
  }

  /**
   * Print error message
   */
  printError(message: string): void {
    this.print(this.error(message));
  }

  /**
   * Print warning message
   */
  printWarning(message: string): void {
    this.print(this.warning(message));
  }

  /**
   * Print info message
   */
  printInfo(message: string): void {
    this.print(this.info(message));
  }
}

/**
 * Unified Error Handler - Replaces scattered error handling
 */
export class UnifiedErrorHandler {
  constructor(private logger: Logger) {}

  /**
   * Handle and format errors consistently
   */
  handleError(error: Error, context?: string): never {
    const message = context ? `${context}: ${error.message}` : error.message;
    this.logger.error(message);

    if (error.stack) {
      this.logger.debug(error.stack);
    }

    throw error;
  }

  /**
   * Handle errors with recovery
   */
  handleErrorWithRecovery<T>(error: Error, fallback: T, context?: string): T {
    const message = context ? `${context}: ${error.message}` : error.message;
    this.logger.warn(`${message} - Using fallback`);

    if (error.stack) {
      this.logger.debug(error.stack);
    }

    return fallback;
  }

  /**
   * Create standardized error
   */
  createError(message: string, code?: string): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  }

  /**
   * Wrap async operations with error handling
   */
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context);
    }
  }
}
