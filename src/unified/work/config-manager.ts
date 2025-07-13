import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../core/logger.js';
import type { WorkConfig, WorkOptions, ConfigSchema, EnvironmentConfig } from './types.js';

/**
 * Configuration manager for the unified work command
 * Handles loading, merging, and validation of configuration from multiple sources
 */
export class ConfigManager {
  private config: WorkConfig;
  private logger: Logger;
  private configPaths: string[];
  private environmentConfig: EnvironmentConfig;

  constructor() {
    this.logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
    this.config = this.getDefaultConfig();
    this.configPaths = this.getConfigPaths();
    this.environmentConfig = this.loadEnvironmentConfig();
  }

  /**
   * Load configuration from file
   */
  async loadFromFile(configPath: string): Promise<void> {
    try {
      const fullPath = path.resolve(configPath);
      const exists = await this.fileExists(fullPath);
      
      if (!exists) {
        throw new Error(`Configuration file not found: ${fullPath}`);
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const fileConfig = this.parseConfigFile(content, path.extname(fullPath));
      
      this.config = this.mergeConfigs(this.config, fileConfig);
      this.validateConfig(this.config);
      
      this.logger.info(`Configuration loaded from: ${fullPath}`);
    } catch (error) {
      this.logger.error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Load default configuration with auto-discovery
   */
  async loadDefaults(): Promise<void> {
    // Start with base defaults
    this.config = this.getDefaultConfig();

    // Try to find and load configuration files
    for (const configPath of this.configPaths) {
      try {
        const exists = await this.fileExists(configPath);
        if (exists) {
          await this.loadFromFile(configPath);
          this.logger.info(`Auto-discovered configuration: ${configPath}`);
          break; // Use first found config
        }
      } catch (error) {
        // Continue to next config path
        this.logger.warn(`Failed to load ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Apply environment configuration
    this.config = this.mergeConfigs(this.config, this.environmentConfig);
    
    this.logger.info('Default configuration loaded successfully');
  }

  /**
   * Update configuration from command line options
   */
  updateFromOptions(options: WorkOptions): void {
    const optionsConfig: Partial<WorkConfig> = {};

    // Map CLI options to config
    if (options.agents !== undefined) {
      optionsConfig.coordination = { ...this.config.coordination, defaultAgents: options.agents };
    }
    if (options.topology && options.topology !== 'auto') {
      optionsConfig.coordination = { ...this.config.coordination, defaultTopology: options.topology as any };
    }
    if (options.strategy && options.strategy !== 'adaptive') {
      optionsConfig.coordination = { ...this.config.coordination, defaultStrategy: options.strategy as any };
    }
    if (options.memory !== undefined) {
      optionsConfig.features = { ...this.config.features, enableMemory: options.memory };
    }
    if (options.hooks !== undefined) {
      optionsConfig.features = { ...this.config.features, enableHooks: options.hooks };
    }
    if (options.autoOptimize !== undefined) {
      optionsConfig.features = { ...this.config.features, autoOptimize: options.autoOptimize };
    }
    if (options.verbose !== undefined) {
      optionsConfig.logging = { ...this.config.logging, level: options.verbose ? 'debug' : 'info' };
    }
    if (options.debug !== undefined) {
      optionsConfig.logging = { ...this.config.logging, debug: options.debug };
    }

    this.config = this.mergeConfigs(this.config, optionsConfig);
    this.validateConfig(this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkConfig {
    return { ...this.config }; // Return a copy to prevent mutation
  }

  /**
   * Get configuration for specific section
   */
  getSection<K extends keyof WorkConfig>(section: K): WorkConfig[K] {
    return { ...this.config[section] };
  }

  /**
   * Update specific configuration section
   */
  updateSection<K extends keyof WorkConfig>(section: K, updates: Partial<WorkConfig[K]>): void {
    this.config[section] = { ...this.config[section], ...updates };
    this.validateConfig(this.config);
  }

  /**
   * Save current configuration to file
   */
  async saveToFile(configPath: string, format: 'json' | 'yaml' = 'json'): Promise<void> {
    try {
      const fullPath = path.resolve(configPath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      const content = this.serializeConfig(this.config, format);
      await fs.writeFile(fullPath, content, 'utf-8');
      
      this.logger.info(`Configuration saved to: ${fullPath}`);
    } catch (error) {
      this.logger.error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = this.getDefaultConfig();
    this.logger.info('Configuration reset to defaults');
  }

  /**
   * Validate configuration against schema
   */
  private validateConfig(config: WorkConfig): void {
    const schema = this.getConfigSchema();
    const errors = this.validateAgainstSchema(config, schema);
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): WorkConfig {
    return {
      coordination: {
        defaultAgents: 4,
        maxAgents: 12,
        defaultTopology: 'mesh',
        defaultStrategy: 'adaptive',
        timeoutMs: 300000, // 5 minutes
        retryAttempts: 3
      },
      features: {
        enableMemory: true,
        enableHooks: true,
        autoOptimize: true,
        enableMetrics: true,
        enableCaching: true
      },
      analysis: {
        complexityThresholds: {
          low: 10,
          medium: 25,
          high: 40
        },
        confidenceThreshold: 70,
        maxKeywords: 20,
        enableContextAnalysis: true
      },
      execution: {
        parallelSteps: true,
        failFast: true,
        saveProgress: true,
        enableRollback: true,
        maxExecutionTime: 7200000 // 2 hours
      },
      logging: {
        level: 'info',
        format: 'text',
        destination: 'console',
        debug: false,
        saveToFile: false
      },
      presets: {
        development: {
          agents: 4,
          topology: 'hierarchical',
          strategy: 'parallel',
          features: ['code_generation', 'testing', 'documentation']
        },
        research: {
          agents: 3,
          topology: 'mesh',
          strategy: 'adaptive',
          features: ['web_search', 'analysis', 'documentation']
        },
        deployment: {
          agents: 3,
          topology: 'ring',
          strategy: 'sequential',
          features: ['validation', 'monitoring', 'rollback']
        },
        optimization: {
          agents: 2,
          topology: 'mesh',
          strategy: 'adaptive',
          features: ['profiling', 'analysis', 'benchmarking']
        }
      },
      paths: {
        configDir: '.claude',
        dataDir: '.claude/data',
        logsDir: '.claude/logs',
        cacheDir: '.claude/cache'
      }
    };
  }

  /**
   * Get possible configuration file paths in order of priority
   */
  private getConfigPaths(): string[] {
    const cwd = process.cwd();
    return [
      path.join(cwd, 'claude-flow.config.json'),
      path.join(cwd, 'claude-flow.config.yaml'),
      path.join(cwd, 'claude-flow.config.yml'),
      path.join(cwd, '.claude', 'config.json'),
      path.join(cwd, '.claude', 'config.yaml'),
      path.join(cwd, '.claude', 'config.yml'),
      path.join(cwd, 'package.json'), // Check for claude-flow section
    ];
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentConfig(): EnvironmentConfig {
    const env = process.env;
    const config: EnvironmentConfig = {};

    // Map environment variables to config
    if (env.CLAUDE_FLOW_AGENTS) {
      config.defaultAgents = parseInt(env.CLAUDE_FLOW_AGENTS, 10);
    }
    if (env.CLAUDE_FLOW_TOPOLOGY) {
      config.defaultTopology = env.CLAUDE_FLOW_TOPOLOGY as any;
    }
    if (env.CLAUDE_FLOW_STRATEGY) {
      config.defaultStrategy = env.CLAUDE_FLOW_STRATEGY as any;
    }
    if (env.CLAUDE_FLOW_LOG_LEVEL) {
      config.logLevel = env.CLAUDE_FLOW_LOG_LEVEL as any;
    }
    if (env.CLAUDE_FLOW_DEBUG) {
      config.debug = env.CLAUDE_FLOW_DEBUG === 'true';
    }
    if (env.CLAUDE_FLOW_DISABLE_MEMORY) {
      config.enableMemory = env.CLAUDE_FLOW_DISABLE_MEMORY !== 'true';
    }
    if (env.CLAUDE_FLOW_DISABLE_HOOKS) {
      config.enableHooks = env.CLAUDE_FLOW_DISABLE_HOOKS !== 'true';
    }

    return config;
  }

  /**
   * Parse configuration file based on extension
   */
  private parseConfigFile(content: string, extension: string): Partial<WorkConfig> {
    try {
      switch (extension.toLowerCase()) {
        case '.json':
          const jsonConfig = JSON.parse(content);
          // Handle package.json with claude-flow section
          return jsonConfig['claude-flow'] || jsonConfig;
          
        case '.yaml':
        case '.yml':
          // Would need yaml parser for full implementation
          throw new Error('YAML configuration not yet supported');
          
        default:
          throw new Error(`Unsupported configuration file format: ${extension}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse configuration file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Merge multiple configurations with proper precedence
   */
  private mergeConfigs(base: WorkConfig, override: Partial<WorkConfig>): WorkConfig {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && key in merged) {
          // Deep merge objects
          merged[key as keyof WorkConfig] = {
            ...merged[key as keyof WorkConfig],
            ...value
          } as any;
        } else {
          // Direct assignment for primitives and arrays
          merged[key as keyof WorkConfig] = value as any;
        }
      }
    }

    return merged;
  }

  /**
   * Serialize configuration to string format
   */
  private serializeConfig(config: WorkConfig, format: 'json' | 'yaml'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        // Would need yaml serializer for full implementation
        throw new Error('YAML serialization not yet supported');
      default:
        throw new Error(`Unsupported serialization format: ${format}`);
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration validation schema
   */
  private getConfigSchema(): ConfigSchema {
    return {
      coordination: {
        defaultAgents: { type: 'number', min: 1, max: 20, required: true },
        maxAgents: { type: 'number', min: 1, max: 50, required: true },
        defaultTopology: { type: 'string', enum: ['mesh', 'hierarchical', 'ring', 'star'], required: true },
        defaultStrategy: { type: 'string', enum: ['parallel', 'sequential', 'adaptive'], required: true },
        timeoutMs: { type: 'number', min: 1000, required: true },
        retryAttempts: { type: 'number', min: 0, max: 10, required: true }
      },
      features: {
        enableMemory: { type: 'boolean', required: true },
        enableHooks: { type: 'boolean', required: true },
        autoOptimize: { type: 'boolean', required: true },
        enableMetrics: { type: 'boolean', required: true },
        enableCaching: { type: 'boolean', required: true }
      },
      logging: {
        level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], required: true },
        format: { type: 'string', enum: ['text', 'json'], required: true },
        destination: { type: 'string', enum: ['console', 'file'], required: true },
        debug: { type: 'boolean', required: true }
      }
    };
  }

  /**
   * Validate configuration against schema
   */
  private validateAgainstSchema(config: any, schema: any, path = ''): string[] {
    const errors: string[] = [];

    for (const [key, rules] of Object.entries(schema)) {
      const currentPath = path ? `${path}.${key}` : key;
      const value = config[key];

      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${currentPath} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`${currentPath} must be a number`);
        } else if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${currentPath} must be a string`);
        } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${currentPath} must be a boolean`);
        }

        // Range validation for numbers
        if (rules.type === 'number' && typeof value === 'number') {
          if (rules.min !== undefined && value < rules.min) {
            errors.push(`${currentPath} must be >= ${rules.min}`);
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push(`${currentPath} must be <= ${rules.max}`);
          }
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${currentPath} must be one of: ${rules.enum.join(', ')}`);
        }

        // Nested object validation
        if (typeof value === 'object' && !Array.isArray(value) && typeof rules === 'object' && !rules.type) {
          errors.push(...this.validateAgainstSchema(value, rules, currentPath));
        }
      }
    }

    return errors;
  }
}