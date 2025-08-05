/**
 * Logging infrastructure for Claude-Flow
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import type { LoggingConfig } from '../utils/types.js';
import { formatBytes } from '../utils/helpers.js';

export interface ILogger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, error?: unknown): void;
  configure(config: LoggingConfig): Promise<void>;
  level?: string;
}

export type ComponentType =
  | 'CLI'
  | 'MCP'
  | 'Swarm'
  | 'Core'
  | 'Terminal'
  | 'Memory'
  | 'Migration'
  | 'Hooks'
  | 'Enterprise';

export interface DebugMeta {
  component?: ComponentType;
  correlationId?: string;
  sessionId?: string;
  operationId?: string;
  performance?: {
    startTime: number;
    duration?: number;
  };
  usageTracking?: {
    symbol: string;
    location: string;
    frequency: number;
  };
  [key: string]: unknown;
}

export interface UsageReport {
  totalCalls: number;
  symbolUsage: Record<string, { count: number; locations: string[] }>;
  componentBreakdown: Record<ComponentType, number>;
  memoryPressure: number;
  avgResponseTime: number;
}

// Output Manager specific interfaces for dual-stream CLI logging
export interface UserDisplayMeta {
  sessionId?: string;
  operationId?: string;
  emoji?: string;
  duration?: number;
  timestamp?: number;
}

export interface ProgressInfo {
  current: number;
  total: number;
  message?: string;
  percentage?: number;
  operationId?: string;
}

export interface OperationResult {
  success: boolean;
  message?: string;
  duration?: number;
  data?: unknown;
  error?: Error;
}

export interface SessionConfig {
  sessionId: string;
  command: string;
  sessionPath: string;
  batchSize: number;
  flushInterval: number;
}

export interface EmergencyTier {
  threshold: number;
  batchSize: number;
  flushInterval: number;
  features: string[];
}

export interface IDebugLogger extends ILogger {
  // Component-specific debug with memory-aware filtering
  debugComponent(component: ComponentType, message: string, meta?: DebugMeta): void;

  // Correlation tracking for distributed debugging
  withCorrelationId(correlationId: string): IDebugLogger;
  withSessionId(sessionId: string): IDebugLogger;
  withComponent(component: ComponentType): IDebugLogger;

  // Memory-optimized conditional logging
  debugIf(condition: () => boolean, message: string, meta?: DebugMeta): void;
  debugLazy(messageFactory: () => string, meta?: DebugMeta): void;

  // Refactor preparation analytics
  trackUsage(symbol: string, location: string): void;
  getUsageAnalytics(): UsageReport;

  // Emergency memory management
  getMemoryPressure(): number;
  enableEmergencyMode(): void;
  disableEmergencyMode(): void;

  // Performance tracking
  timeStart(operationId: string): void;
  timeEnd(operationId: string, message?: string, meta?: DebugMeta): void;
}

// Dual-stream output manager for human-readable CLI with session logging
export interface IOutputManager extends IDebugLogger {
  // Human-readable stdout (user-facing) - Zero memory allocation
  userInfo(message: string, meta?: UserDisplayMeta): void;
  userSuccess(message: string, meta?: UserDisplayMeta): void;
  userWarning(message: string, meta?: UserDisplayMeta): void;
  userError(message: string, error?: Error, meta?: UserDisplayMeta): void;

  // Progress tracking - Minimal memory footprint
  startOperation(operation: string, sessionId?: string): string;
  updateProgress(progress: ProgressInfo): void;
  completeOperation(operationId: string, result?: OperationResult): void;

  // Session logging - Aggressive batching
  debugSession(level: LogLevel, message: string, meta: DebugMeta): Promise<void>;

  // Memory management - Multi-tier emergency
  activateEmergencyMode(threshold: number, reason: string): void;
  isInEmergencyMode(): boolean;
  criticalMemoryShutdown(): void;

  // Session management
  getSessionPath(): string;
  flushSession(): Promise<void>;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context: Record<string, unknown>;
  data?: unknown;
  error?: unknown;
  component?: ComponentType;
  correlationId?: string;
  sessionId?: string;
  operationId?: string;
  performance?: {
    startTime: number;
    duration?: number;
  };
}

/**
 * Circular buffer for memory-efficient logging
 */
class CircularBuffer<T> {
  private buffer: T[];
  private size: number;
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Array(size);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.size;

    if (this.count < this.size) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.size;
    }
  }

  getAll(): T[] {
    if (this.count === 0) return [];

    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.size;
      result.push(this.buffer[index]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  getCount(): number {
    return this.count;
  }

  getSize(): number {
    return this.size;
  }
}

/**
 * Debug Logger implementation with advanced features
 */
export class DebugLogger implements IDebugLogger {
  private static instance: DebugLogger;
  private config: LoggingConfig;
  private context: Record<string, unknown>;
  private fileHandle?: fs.FileHandle;
  private currentFileSize = 0;
  private currentFileIndex = 0;
  private isClosing = false;

  // Debug-specific properties
  private correlationId?: string;
  private sessionId?: string;
  private component?: ComponentType;
  private usageTracker = new Map<string, { count: number; locations: Set<string> }>();
  private componentStats = new Map<ComponentType, number>();
  private operationTimers = new Map<string, number>();
  private debugBuffer: CircularBuffer<LogEntry>;
  private isEmergencyMode = false;
  private memoryPressureThreshold = 0.95;

  get level(): string {
    return this.config.level;
  }

  constructor(
    config: LoggingConfig = {
      level: 'info',
      format: 'json',
      destination: 'console',
    },
    context: Record<string, unknown> = {},
    bufferSize = 10000,
  ) {
    // Validate file path if file destination
    if ((config.destination === 'file' || config.destination === 'both') && !config.filePath) {
      throw new Error('File path required for file logging');
    }

    this.config = config;
    this.context = context;
    this.debugBuffer = new CircularBuffer<LogEntry>(bufferSize);
  }

  /**
   * Gets the singleton instance of the debug logger
   */
  static getInstance(config?: LoggingConfig): DebugLogger {
    if (!DebugLogger.instance) {
      if (!config) {
        // Use default config if none provided and not in test environment
        const isTestEnv = process.env.CLAUDE_FLOW_ENV === 'test';
        if (isTestEnv) {
          throw new Error('DebugLogger configuration required for initialization');
        }
        config = {
          level: 'info',
          format: 'json',
          destination: 'console',
        };
      }
      DebugLogger.instance = new DebugLogger(config);
    }
    return DebugLogger.instance;
  }

  // ILogger interface implementation
  debug(message: string, meta?: unknown): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: unknown): void {
    this.log(LogLevel.ERROR, message, undefined, error);
  }

  async configure(config: LoggingConfig): Promise<void> {
    this.config = config;

    // Reset file handle if destination changed
    if (this.fileHandle && config.destination !== 'file' && config.destination !== 'both') {
      await this.fileHandle.close();
      delete this.fileHandle;
    }
  }

  // IDebugLogger interface implementation
  debugComponent(component: ComponentType, message: string, meta?: DebugMeta): void {
    const enhancedMeta: DebugMeta = {
      ...meta,
      component,
      correlationId: this.correlationId,
      sessionId: this.sessionId,
    };

    this.updateComponentStats(component);
    this.log(LogLevel.DEBUG, message, enhancedMeta);
  }

  withCorrelationId(correlationId: string): IDebugLogger {
    const newLogger = new DebugLogger(this.config, this.context, this.debugBuffer.getSize());
    newLogger.correlationId = correlationId;
    newLogger.sessionId = this.sessionId;
    newLogger.component = this.component;
    return newLogger;
  }

  withSessionId(sessionId: string): IDebugLogger {
    const newLogger = new DebugLogger(this.config, this.context, this.debugBuffer.getSize());
    newLogger.correlationId = this.correlationId;
    newLogger.sessionId = sessionId;
    newLogger.component = this.component;
    return newLogger;
  }

  withComponent(component: ComponentType): IDebugLogger {
    const newLogger = new DebugLogger(this.config, this.context, this.debugBuffer.getSize());
    newLogger.correlationId = this.correlationId;
    newLogger.sessionId = this.sessionId;
    newLogger.component = component;
    return newLogger;
  }

  debugIf(condition: () => boolean, message: string, meta?: DebugMeta): void {
    if (!this.shouldLog(LogLevel.DEBUG) || this.isEmergencyMode) {
      return;
    }

    try {
      if (condition()) {
        this.debug(message, meta);
      }
    } catch (error) {
      this.warn('Debug condition evaluation failed', { error, originalMessage: message });
    }
  }

  debugLazy(messageFactory: () => string, meta?: DebugMeta): void {
    if (!this.shouldLog(LogLevel.DEBUG) || this.isEmergencyMode) {
      return;
    }

    try {
      const message = messageFactory();
      this.debug(message, meta);
    } catch (error) {
      this.warn('Lazy debug message generation failed', { error });
    }
  }

  trackUsage(symbol: string, location: string): void {
    if (this.isEmergencyMode) return;

    const key = `${symbol}@${location}`;
    const existing = this.usageTracker.get(key);

    if (existing) {
      existing.count++;
      existing.locations.add(location);
    } else {
      this.usageTracker.set(key, {
        count: 1,
        locations: new Set([location]),
      });
    }
  }

  getUsageAnalytics(): UsageReport {
    const symbolUsage: Record<string, { count: number; locations: string[] }> = {};
    let totalCalls = 0;

    for (const [key, data] of this.usageTracker.entries()) {
      const [symbol] = key.split('@');
      totalCalls += data.count;

      if (symbolUsage[symbol]) {
        symbolUsage[symbol].count += data.count;
        symbolUsage[symbol].locations.push(...Array.from(data.locations));
      } else {
        symbolUsage[symbol] = {
          count: data.count,
          locations: Array.from(data.locations),
        };
      }
    }

    const componentBreakdown: Record<ComponentType, number> = {} as Record<ComponentType, number>;
    for (const [component, count] of this.componentStats.entries()) {
      componentBreakdown[component] = count;
    }

    return {
      totalCalls,
      symbolUsage,
      componentBreakdown,
      memoryPressure: this.getMemoryPressure(),
      avgResponseTime: this.calculateAverageResponseTime(),
    };
  }

  getMemoryPressure(): number {
    try {
      const usage = process.memoryUsage();
      const totalMemory = usage.heapTotal + usage.external;
      const maxMemory = 1024 * 1024 * 1024; // 1GB default limit
      return totalMemory / maxMemory;
    } catch {
      return 0;
    }
  }

  enableEmergencyMode(): void {
    this.isEmergencyMode = true;
    this.debugBuffer.clear();
    this.warn('Emergency mode enabled - debug logging suspended');
  }

  disableEmergencyMode(): void {
    this.isEmergencyMode = false;
    this.info('Emergency mode disabled - debug logging resumed');
  }

  timeStart(operationId: string): void {
    if (this.isEmergencyMode) return;
    this.operationTimers.set(operationId, Date.now());
  }

  timeEnd(operationId: string, message?: string, meta?: DebugMeta): void {
    if (this.isEmergencyMode) return;

    const startTime = this.operationTimers.get(operationId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.operationTimers.delete(operationId);

      const enhancedMeta: DebugMeta = {
        ...meta,
        performance: {
          startTime,
          duration,
        },
      };

      this.debug(message || `Operation ${operationId} completed`, enhancedMeta);
    }
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: Record<string, unknown>): DebugLogger {
    const childLogger = new DebugLogger(
      this.config,
      { ...this.context, ...context },
      this.debugBuffer.getSize(),
    );
    childLogger.correlationId = this.correlationId;
    childLogger.sessionId = this.sessionId;
    childLogger.component = this.component;
    return childLogger;
  }

  /**
   * Properly close the logger and release resources
   */
  async close(): Promise<void> {
    this.isClosing = true;
    if (this.fileHandle) {
      try {
        await this.fileHandle.close();
      } catch (error) {
        console.error('Error closing log file handle:', error);
      } finally {
        delete this.fileHandle;
      }
    }
  }

  private updateComponentStats(component: ComponentType): void {
    const current = this.componentStats.get(component) || 0;
    this.componentStats.set(component, current + 1);
  }

  private calculateAverageResponseTime(): number {
    const entries = this.debugBuffer.getAll();
    const performanceEntries = entries.filter((e) => e.performance?.duration);

    if (performanceEntries.length === 0) return 0;

    const totalTime = performanceEntries.reduce(
      (sum, entry) => sum + (entry.performance?.duration || 0),
      0,
    );

    return totalTime / performanceEntries.length;
  }

  private log(level: LogLevel, message: string, data?: unknown, error?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Check memory pressure and enable emergency mode if needed
    if (!this.isEmergencyMode && this.getMemoryPressure() > this.memoryPressureThreshold) {
      this.enableEmergencyMode();
      return;
    }

    // Skip debug logging in emergency mode
    if (this.isEmergencyMode && level === LogLevel.DEBUG) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: this.context,
      data,
      error,
      component: this.component,
      correlationId: this.correlationId,
      sessionId: this.sessionId,
    };

    // Add to circular buffer for analysis
    if (!this.isEmergencyMode) {
      this.debugBuffer.push(entry);
    }

    const formatted = this.format(entry);

    if (this.config.destination === 'console' || this.config.destination === 'both') {
      this.writeToConsole(level, formatted);
    }

    if (this.config.destination === 'file' || this.config.destination === 'both') {
      this.writeToFile(formatted);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const configLevel = LogLevel[this.config.level.toUpperCase() as keyof typeof LogLevel];
    return level >= configLevel;
  }

  private format(entry: LogEntry): string {
    if (this.config.format === 'json') {
      // Handle error serialization for JSON format
      const jsonEntry = { ...entry };
      if (jsonEntry.error instanceof Error) {
        jsonEntry.error = {
          name: jsonEntry.error.name,
          message: jsonEntry.error.message,
          stack: jsonEntry.error.stack,
        };
      }
      return JSON.stringify(jsonEntry);
    }

    // Text format with enhanced debug information
    const contextStr =
      Object.keys(entry.context).length > 0 ? ` ${JSON.stringify(entry.context)}` : '';
    const dataStr = entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : '';
    const errorStr =
      entry.error !== undefined
        ? entry.error instanceof Error
          ? `\n  Error: ${entry.error.message}\n  Stack: ${entry.error.stack}`
          : ` Error: ${JSON.stringify(entry.error)}`
        : '';

    const debugInfo = [];
    if (entry.component) debugInfo.push(`[${entry.component}]`);
    if (entry.correlationId) debugInfo.push(`corr:${entry.correlationId.slice(0, 8)}`);
    if (entry.sessionId) debugInfo.push(`sess:${entry.sessionId.slice(0, 8)}`);
    if (entry.performance?.duration) debugInfo.push(`${entry.performance.duration}ms`);

    const debugInfoStr = debugInfo.length > 0 ? ` ${debugInfo.join(' ')}` : '';

    return `[${entry.timestamp}] ${entry.level}${debugInfoStr} ${entry.message}${contextStr}${dataStr}${errorStr}`;
  }

  private writeToConsole(level: LogLevel, message: string): void {
    // Use stderr for MCP protocol compliance when component is MCP
    const output = this.component === 'MCP' ? console.error : console.log;

    switch (level) {
      case LogLevel.DEBUG:
        if (this.component === 'MCP') {
          console.error(message);
        } else {
          console.debug(message);
        }
        break;
      case LogLevel.INFO:
        if (this.component === 'MCP') {
          console.error(message);
        } else {
          console.info(message);
        }
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  private async writeToFile(message: string): Promise<void> {
    if (!this.config.filePath || this.isClosing) {
      return;
    }

    try {
      // Check if we need to rotate the log file
      if (await this.shouldRotate()) {
        await this.rotate();
      }

      // Open file handle if not already open
      if (!this.fileHandle) {
        this.fileHandle = await fs.open(this.config.filePath, 'a');
      }

      // Write the message
      const data = Buffer.from(message + '\n', 'utf8');
      await this.fileHandle.write(data);
      this.currentFileSize += data.length;
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async shouldRotate(): Promise<boolean> {
    if (!this.config.maxFileSize || !this.config.filePath) {
      return false;
    }

    try {
      const stat = await fs.stat(this.config.filePath);
      return stat.size >= this.config.maxFileSize;
    } catch {
      return false;
    }
  }

  private async rotate(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFiles) {
      return;
    }

    // Close current file
    if (this.fileHandle) {
      await this.fileHandle.close();
      delete this.fileHandle;
    }

    // Rename current file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${this.config.filePath}.${timestamp}`;
    await fs.rename(this.config.filePath, rotatedPath);

    // Clean up old files
    await this.cleanupOldFiles();

    // Reset file size
    this.currentFileSize = 0;
  }

  private async cleanupOldFiles(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFiles) {
      return;
    }

    const dir = path.dirname(this.config.filePath);
    const baseFileName = path.basename(this.config.filePath);

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.startsWith(baseFileName + '.')) {
          files.push(entry.name);
        }
      }

      // Sort files by timestamp (newest first)
      files.sort().reverse();

      // Remove old files
      const filesToRemove = files.slice(this.config.maxFiles - 1);
      for (const file of filesToRemove) {
        await fs.unlink(path.join(dir, file));
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }
}

/**
 * Extreme Memory-Aware Output Manager for dual-stream CLI logging
 * Implements multi-tier emergency response system for 99%+ memory pressure
 */
export class ExtremeMemoryOutputManager extends DebugLogger implements IOutputManager {
  private emergencyLevel = 0; // 0=normal, 1=95%, 2=99%, 3=99.5%
  private messageBuffer: string[] = []; // Minimal buffer
  private lastFlush = Date.now();
  private sessionConfig: SessionConfig;
  private static readonly EMERGENCY_TIERS: EmergencyTier[] = [
    {
      threshold: 0.9, // Normal operations
      batchSize: 50,
      flushInterval: 200,
      features: ['full_logging', 'session_files', 'correlation', 'pii_detection'],
    },
    {
      threshold: 0.95, // Standard emergency
      batchSize: 25,
      flushInterval: 100,
      features: ['basic_logging', 'session_files', 'correlation'],
    },
    {
      threshold: 0.99, // Extreme emergency (current system level)
      batchSize: 5,
      flushInterval: 50,
      features: ['minimal_logging', 'stdout_only'],
    },
    {
      threshold: 0.995, // Critical shutdown
      batchSize: 0,
      flushInterval: 0,
      features: ['console_only'],
    },
  ];

  constructor(
    config: LoggingConfig,
    sessionConfig: SessionConfig,
    context: Record<string, unknown> = {},
  ) {
    super(config, context, 1000); // Smaller buffer for memory constraints
    this.sessionConfig = sessionConfig;
    this.ensureSessionDirectory();
  }

  // Human-readable stdout methods - Zero memory allocation
  userInfo(message: string, meta?: UserDisplayMeta): void {
    const emoji = meta?.emoji || '✅';
    const sessionRef = meta?.sessionId ? ` [sess:${meta.sessionId.slice(-6)}]` : '';
    const output = `${emoji} ${message}${sessionRef}\n`;

    // Immediate stdout - no memory allocation
    process.stdout.write(output);

    // Conditional session logging based on emergency level
    if (this.emergencyLevel < 2) {
      // Only if memory < 99%
      this.queueForSession(message, 'INFO', meta);
    }
  }

  userSuccess(message: string, meta?: UserDisplayMeta): void {
    const emoji = meta?.emoji || '🎯';
    const sessionRef = meta?.sessionId ? ` [sess:${meta.sessionId.slice(-6)}]` : '';
    const output = `${emoji} ${message}${sessionRef}\n`;

    process.stdout.write(output);

    if (this.emergencyLevel < 2) {
      this.queueForSession(message, 'SUCCESS', meta);
    }
  }

  userWarning(message: string, meta?: UserDisplayMeta): void {
    const emoji = meta?.emoji || '⚠️';
    const sessionRef = meta?.sessionId ? ` [sess:${meta.sessionId.slice(-6)}]` : '';
    const output = `${emoji} ${message}${sessionRef}\n`;

    process.stdout.write(output);

    if (this.emergencyLevel < 1) {
      // Only in normal mode
      this.queueForSession(message, 'WARNING', meta);
    }
  }

  userError(message: string, error?: Error, meta?: UserDisplayMeta): void {
    const emoji = meta?.emoji || '🚨';
    const sessionRef = meta?.sessionId ? ` [sess:${meta.sessionId.slice(-6)}]` : '';
    const errorStr = error ? ` - ${error.message}` : '';
    const output = `${emoji} ${message}${errorStr}${sessionRef}\n`;

    process.stdout.write(output);

    // Always log errors, even in emergency mode
    this.queueForSession(`${message}${errorStr}`, 'ERROR', { ...meta, error });
  }

  // Progress tracking methods
  startOperation(operation: string, sessionId?: string): string {
    const operationId = `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.timeStart(operationId);

    this.userInfo(`Starting ${operation}...`, {
      sessionId,
      operationId,
      emoji: '🔄',
    });

    return operationId;
  }

  updateProgress(progress: ProgressInfo): void {
    if (this.emergencyLevel >= 2) return; // Skip in extreme mode

    const percentage = progress.percentage || Math.round((progress.current / progress.total) * 100);
    const message = progress.message || `Progress: ${progress.current}/${progress.total}`;

    this.userInfo(`${message} (${percentage}%)`, {
      operationId: progress.operationId,
      emoji: '⏳',
    });
  }

  completeOperation(operationId: string, result?: OperationResult): void {
    // Use the inherited timeEnd method for completion timing
    if (result?.success !== false) {
      this.timeEnd(operationId, 'Operation completed');
      this.userSuccess(result?.message || 'Operation completed', {
        operationId,
        duration: result?.duration,
        emoji: '✅',
      });
    } else {
      this.timeEnd(operationId, 'Operation failed');
      this.userError(result?.message || 'Operation failed', result?.error, {
        operationId,
        duration: result?.duration,
        emoji: '❌',
      });
    }
  }

  // Session logging with aggressive batching
  async debugSession(level: LogLevel, message: string, meta: DebugMeta): Promise<void> {
    if (this.emergencyLevel >= 3) return; // Skip in critical mode

    const entry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      ...meta,
    };

    this.queueForSession(JSON.stringify(entry), LogLevel[level], meta);
  }

  // Memory management methods
  activateEmergencyMode(threshold: number, reason: string): void {
    const newLevel = ExtremeMemoryOutputManager.EMERGENCY_TIERS.findIndex(
      (tier) => threshold >= tier.threshold,
    );

    if (newLevel !== this.emergencyLevel) {
      this.emergencyLevel = newLevel;
      this.transitionToTier(newLevel, threshold, reason);
    }
  }

  isInEmergencyMode(): boolean {
    return this.emergencyLevel > 0;
  }

  criticalMemoryShutdown(): void {
    // Immediate memory cleanup
    this.messageBuffer = [];

    // Console-only fallback
    process.stdout.write('🚨 Critical memory - console-only mode activated\n');

    // Disable all async operations
    this.debugSession = () => Promise.resolve();
    this.queueForSession = () => {};
  }

  // Session management
  getSessionPath(): string {
    return this.sessionConfig.sessionPath;
  }

  async flushSession(): Promise<void> {
    if (this.messageBuffer.length === 0 || this.emergencyLevel >= 3) return;

    try {
      const content = this.messageBuffer.join('\n') + '\n';
      this.messageBuffer = []; // Clear immediately

      await fs.appendFile(this.sessionConfig.sessionPath, content);
      this.lastFlush = Date.now();
    } catch (error) {
      // Fail silently in emergency mode
      if (this.emergencyLevel === 0) {
        console.error('Session flush failed:', error);
      }
    }
  }

  // Private methods
  private queueForSession(message: string, level: string, meta?: any): void {
    if (this.emergencyLevel >= 3) return; // Critical mode

    // Very small buffer for memory constraints
    if (this.messageBuffer.length > 5) {
      this.flushImmediately();
    }

    const entry = `${new Date().toISOString()}|${level}|${message}`;
    this.messageBuffer.push(entry);

    // Aggressive flushing based on emergency level
    const flushInterval =
      ExtremeMemoryOutputManager.EMERGENCY_TIERS[this.emergencyLevel].flushInterval;
    if (Date.now() - this.lastFlush > flushInterval) {
      this.flushImmediately();
    }
  }

  private flushImmediately(): void {
    if (this.messageBuffer.length === 0) return;

    const content = this.messageBuffer.join('\n') + '\n';
    this.messageBuffer = []; // Clear immediately

    // Async write without await to prevent blocking
    fs.appendFile(this.sessionConfig.sessionPath, content).catch(() => {
      // Fail silently in emergency mode
    });

    this.lastFlush = Date.now();
  }

  private transitionToTier(tierIndex: number, pressure: number, reason: string): void {
    const tier = ExtremeMemoryOutputManager.EMERGENCY_TIERS[tierIndex];

    // Immediate reconfiguration
    this.sessionConfig.batchSize = tier.batchSize;
    this.sessionConfig.flushInterval = tier.flushInterval;

    // Flush any pending messages
    this.flushImmediately();

    // User notification
    const severityEmojis = ['✅', '⚠️', '🚨', '💀'];
    const emoji = severityEmojis[tierIndex] || '🚨';
    process.stdout.write(
      `${emoji} Memory tier ${tierIndex}: ${(pressure * 100).toFixed(1)}% - ${reason}\n`,
    );

    // Critical shutdown if needed
    if (tierIndex >= 3) {
      this.criticalMemoryShutdown();
    }
  }

  private ensureSessionDirectory(): void {
    try {
      const sessionDir = path.dirname(this.sessionConfig.sessionPath);
      if (!fs.access) return; // Skip in test environments

      fs.mkdir(sessionDir, { recursive: true }).catch(() => {
        // Directory creation failed - use console fallback
        this.activateEmergencyMode(0.99, 'Session directory creation failed');
      });
    } catch {
      // Fail silently - emergency mode will handle
    }
  }

  // Override memory pressure monitoring to include automatic tier switching
  override getMemoryPressure(): number {
    const pressure = super.getMemoryPressure();

    // Automatic tier switching based on memory pressure
    if (pressure >= 0.995 && this.emergencyLevel < 3) {
      this.activateEmergencyMode(pressure, 'Critical memory pressure detected');
    } else if (pressure >= 0.99 && this.emergencyLevel < 2) {
      this.activateEmergencyMode(pressure, 'Extreme memory pressure detected');
    } else if (pressure >= 0.95 && this.emergencyLevel < 1) {
      this.activateEmergencyMode(pressure, 'High memory pressure detected');
    }

    return pressure;
  }
}

/**
 * Logger implementation with context support (legacy compatibility)
 */
export class Logger implements ILogger {
  private static instance: Logger;
  private config: LoggingConfig;
  private context: Record<string, unknown>;
  private fileHandle?: fs.FileHandle;
  private currentFileSize = 0;
  private currentFileIndex = 0;
  private isClosing = false;

  get level(): string {
    return this.config.level;
  }

  constructor(
    config: LoggingConfig = {
      level: 'info',
      format: 'json',
      destination: 'console',
    },
    context: Record<string, unknown> = {},
  ) {
    // Validate file path if file destination
    if ((config.destination === 'file' || config.destination === 'both') && !config.filePath) {
      throw new Error('File path required for file logging');
    }

    this.config = config;
    this.context = context;
  }

  /**
   * Gets the singleton instance of the logger
   */
  static getInstance(config?: LoggingConfig): Logger {
    if (!Logger.instance) {
      if (!config) {
        // Use default config if none provided and not in test environment
        const isTestEnv = process.env.CLAUDE_FLOW_ENV === 'test';
        if (isTestEnv) {
          throw new Error('Logger configuration required for initialization');
        }
        config = {
          level: 'info',
          format: 'json',
          destination: 'console',
        };
      }
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Updates logger configuration
   */
  async configure(config: LoggingConfig): Promise<void> {
    this.config = config;

    // Reset file handle if destination changed
    if (this.fileHandle && config.destination !== 'file' && config.destination !== 'both') {
      await this.fileHandle.close();
      delete this.fileHandle;
    }
  }

  debug(message: string, meta?: unknown): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: unknown): void {
    this.log(LogLevel.ERROR, message, undefined, error);
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    return new Logger(this.config, { ...this.context, ...context });
  }

  /**
   * Properly close the logger and release resources
   */
  async close(): Promise<void> {
    this.isClosing = true;
    if (this.fileHandle) {
      try {
        await this.fileHandle.close();
      } catch (error) {
        console.error('Error closing log file handle:', error);
      } finally {
        delete this.fileHandle;
      }
    }
  }

  private log(level: LogLevel, message: string, data?: unknown, error?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: this.context,
      data,
      error,
    };

    const formatted = this.format(entry);

    if (this.config.destination === 'console' || this.config.destination === 'both') {
      this.writeToConsole(level, formatted);
    }

    if (this.config.destination === 'file' || this.config.destination === 'both') {
      this.writeToFile(formatted);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const configLevel = LogLevel[this.config.level.toUpperCase() as keyof typeof LogLevel];
    return level >= configLevel;
  }

  private format(entry: LogEntry): string {
    if (this.config.format === 'json') {
      // Handle error serialization for JSON format
      const jsonEntry = { ...entry };
      if (jsonEntry.error instanceof Error) {
        jsonEntry.error = {
          name: jsonEntry.error.name,
          message: jsonEntry.error.message,
          stack: jsonEntry.error.stack,
        };
      }
      return JSON.stringify(jsonEntry);
    }

    // Text format
    const contextStr =
      Object.keys(entry.context).length > 0 ? ` ${JSON.stringify(entry.context)}` : '';
    const dataStr = entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : '';
    const errorStr =
      entry.error !== undefined
        ? entry.error instanceof Error
          ? `\n  Error: ${entry.error.message}\n  Stack: ${entry.error.stack}`
          : ` Error: ${JSON.stringify(entry.error)}`
        : '';

    return `[${entry.timestamp}] ${entry.level} ${entry.message}${contextStr}${dataStr}${errorStr}`;
  }

  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  private async writeToFile(message: string): Promise<void> {
    if (!this.config.filePath || this.isClosing) {
      return;
    }

    try {
      // Check if we need to rotate the log file
      if (await this.shouldRotate()) {
        await this.rotate();
      }

      // Open file handle if not already open
      if (!this.fileHandle) {
        this.fileHandle = await fs.open(this.config.filePath, 'a');
      }

      // Write the message
      const data = Buffer.from(message + '\n', 'utf8');
      await this.fileHandle.write(data);
      this.currentFileSize += data.length;
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async shouldRotate(): Promise<boolean> {
    if (!this.config.maxFileSize || !this.config.filePath) {
      return false;
    }

    try {
      const stat = await fs.stat(this.config.filePath);
      return stat.size >= this.config.maxFileSize;
    } catch {
      return false;
    }
  }

  private async rotate(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFiles) {
      return;
    }

    // Close current file
    if (this.fileHandle) {
      await this.fileHandle.close();
      delete this.fileHandle;
    }

    // Rename current file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${this.config.filePath}.${timestamp}`;
    await fs.rename(this.config.filePath, rotatedPath);

    // Clean up old files
    await this.cleanupOldFiles();

    // Reset file size
    this.currentFileSize = 0;
  }

  private async cleanupOldFiles(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFiles) {
      return;
    }

    const dir = path.dirname(this.config.filePath);
    const baseFileName = path.basename(this.config.filePath);

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.startsWith(baseFileName + '.')) {
          files.push(entry.name);
        }
      }

      // Sort files by timestamp (newest first)
      files.sort().reverse();

      // Remove old files
      const filesToRemove = files.slice(this.config.maxFiles - 1);
      for (const file of filesToRemove) {
        await fs.unlink(path.join(dir, file));
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }
}

// Component-specific debug logger factory
export class ComponentLoggerFactory {
  private static debugLogger?: DebugLogger;

  static initializeDebugLogger(config?: LoggingConfig): void {
    ComponentLoggerFactory.debugLogger = DebugLogger.getInstance(config);
  }

  static getLogger(
    component: ComponentType,
    correlationId?: string,
    sessionId?: string,
  ): IDebugLogger {
    if (!ComponentLoggerFactory.debugLogger) {
      ComponentLoggerFactory.initializeDebugLogger();
    }

    let logger = ComponentLoggerFactory.debugLogger!.withComponent(component);

    if (correlationId) {
      logger = logger.withCorrelationId(correlationId);
    }

    if (sessionId) {
      logger = logger.withSessionId(sessionId);
    }

    return logger;
  }

  static getCLILogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('CLI', correlationId, sessionId);
  }

  static getMCPLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('MCP', correlationId, sessionId);
  }

  static getSwarmLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('Swarm', correlationId, sessionId);
  }

  static getCoreLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('Core', correlationId, sessionId);
  }

  static getTerminalLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('Terminal', correlationId, sessionId);
  }

  static getMemoryLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('Memory', correlationId, sessionId);
  }

  static getMigrationLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('Migration', correlationId, sessionId);
  }

  static getHooksLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('Hooks', correlationId, sessionId);
  }

  static getEnterpriseLogger(correlationId?: string, sessionId?: string): IDebugLogger {
    return this.getLogger('Enterprise', correlationId, sessionId);
  }

  static getUsageAnalytics(): UsageReport | null {
    return ComponentLoggerFactory.debugLogger?.getUsageAnalytics() || null;
  }

  static getMemoryPressure(): number {
    return ComponentLoggerFactory.debugLogger?.getMemoryPressure() || 0;
  }

  static enableEmergencyMode(): void {
    ComponentLoggerFactory.debugLogger?.enableEmergencyMode();
  }

  static disableEmergencyMode(): void {
    ComponentLoggerFactory.debugLogger?.disableEmergencyMode();
  }

  // IOutputManager factory methods - NEW dual-stream logging capability
  static createOutputManager(
    component: ComponentType,
    command: string,
    correlationId?: string,
    sessionId?: string,
  ): IOutputManager {
    if (!ComponentLoggerFactory.debugLogger) {
      ComponentLoggerFactory.initializeDebugLogger();
    }

    // Generate session configuration
    const actualSessionId = sessionId || generateSessionId();
    const sessionConfig: SessionConfig = {
      sessionId: actualSessionId,
      command,
      sessionPath: this.generateSessionPath(command, actualSessionId),
      batchSize: 50, // Will be adjusted by emergency mode
      flushInterval: 200, // Will be adjusted by emergency mode
    };

    // Create logging configuration optimized for dual-stream
    const outputConfig: LoggingConfig = {
      level: 'debug',
      format: 'json',
      destination: 'both', // Enable both console and file
      filePath: sessionConfig.sessionPath,
      maxFileSize: 10 * 1024 * 1024, // 10MB per session
      maxFiles: 5,
    };

    const outputManager = new ExtremeMemoryOutputManager(outputConfig, sessionConfig, {
      component,
    });

    // Apply correlation and session context
    if (correlationId) {
      outputManager.withCorrelationId(correlationId);
    }

    return outputManager;
  }

  static getOutputManager(
    component: ComponentType,
    command?: string,
    correlationId?: string,
    sessionId?: string,
  ): IOutputManager {
    return this.createOutputManager(component, command || 'default', correlationId, sessionId);
  }

  // Component-specific output manager factory methods
  static getCLIOutputManager(
    command?: string,
    correlationId?: string,
    sessionId?: string,
  ): IOutputManager {
    return this.getOutputManager('CLI', command || 'cli', correlationId, sessionId);
  }

  static getMCPOutputManager(
    command?: string,
    correlationId?: string,
    sessionId?: string,
  ): IOutputManager {
    return this.getOutputManager('MCP', command || 'mcp', correlationId, sessionId);
  }

  static getSwarmOutputManager(
    command?: string,
    correlationId?: string,
    sessionId?: string,
  ): IOutputManager {
    return this.getOutputManager('Swarm', command || 'swarm', correlationId, sessionId);
  }

  static getCoreOutputManager(
    command?: string,
    correlationId?: string,
    sessionId?: string,
  ): IOutputManager {
    return this.getOutputManager('Core', command || 'core', correlationId, sessionId);
  }

  static getHooksOutputManager(
    command?: string,
    correlationId?: string,
    sessionId?: string,
  ): IOutputManager {
    return this.getOutputManager('Hooks', command || 'hooks', correlationId, sessionId);
  }

  // Session management utilities
  private static generateSessionPath(command: string, sessionId: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sessionName = `${date}_${command}-session_${sessionId.slice(-6)}`;
    return path.join('.claude', 'sessions', command, `${sessionName}.log`);
  }

  static cleanupOldSessions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    return new Promise((resolve) => {
      const sessionsDir = path.join('.claude', 'sessions');

      fs.readdir(sessionsDir, { withFileTypes: true })
        .then((entries) => {
          const now = Date.now();
          const promises: Promise<void>[] = [];

          for (const entry of entries) {
            if (entry.isDirectory()) {
              const dirPath = path.join(sessionsDir, entry.name);
              promises.push(
                fs
                  .readdir(dirPath)
                  .then((files) => {
                    const cleanupPromises = files.map(async (file) => {
                      const filePath = path.join(dirPath, file);
                      try {
                        const stat = await fs.stat(filePath);
                        if (now - stat.mtime.getTime() > maxAge) {
                          await fs.unlink(filePath);
                        }
                      } catch {
                        // File may have been deleted - ignore
                      }
                    });
                    return Promise.all(cleanupPromises);
                  })
                  .then(() => {}),
              );
            }
          }

          Promise.all(promises)
            .then(() => resolve())
            .catch(() => resolve());
        })
        .catch(() => resolve());
    });
  }

  // Memory monitoring with automatic emergency mode activation
  static monitorMemoryPressure(): void {
    if (!ComponentLoggerFactory.debugLogger) return;

    const pressure = ComponentLoggerFactory.debugLogger.getMemoryPressure();

    // Automatic emergency mode activation based on memory pressure
    if (pressure >= 0.95) {
      ComponentLoggerFactory.debugLogger.enableEmergencyMode();
    } else if (pressure < 0.9) {
      ComponentLoggerFactory.debugLogger.disableEmergencyMode();
    }
  }
}

// Correlation ID generator utility
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Session ID generator utility
export function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Console migration helper - replaces console.* calls with debug logging
export function migrateConsoleCall(
  component: ComponentType,
  level: 'log' | 'info' | 'warn' | 'error' | 'debug',
  message: string,
  ...args: unknown[]
): void {
  const logger = ComponentLoggerFactory.getLogger(component);
  const location = new Error().stack?.split('\n')[2]?.trim() || 'unknown';

  // Track usage for refactor analytics
  logger.trackUsage(`console.${level}`, location);

  const meta: DebugMeta = {
    originalConsoleCall: level,
    args: args.length > 0 ? args : undefined,
    migrationLocation: location,
  };

  switch (level) {
    case 'log':
    case 'info':
      logger.info(message, meta);
      break;
    case 'warn':
      logger.warn(message, meta);
      break;
    case 'error':
      logger.error(message, args[0]);
      break;
    case 'debug':
      logger.debug(message, meta);
      break;
  }
}

// Export singleton instances with lazy initialization
export const logger = Logger.getInstance();
export const debugLogger = DebugLogger.getInstance();

// Export component-specific loggers for convenience
export const cliLogger = ComponentLoggerFactory.getCLILogger();
export const mcpLogger = ComponentLoggerFactory.getMCPLogger();
export const swarmLogger = ComponentLoggerFactory.getSwarmLogger();
export const coreLogger = ComponentLoggerFactory.getCoreLogger();
export const terminalLogger = ComponentLoggerFactory.getTerminalLogger();
export const memoryLogger = ComponentLoggerFactory.getMemoryLogger();
export const migrationLogger = ComponentLoggerFactory.getMigrationLogger();
export const hooksLogger = ComponentLoggerFactory.getHooksLogger();
export const enterpriseLogger = ComponentLoggerFactory.getEnterpriseLogger();
