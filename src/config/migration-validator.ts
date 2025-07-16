import { promises as fs } from 'fs';
import path from 'path';
import { Config, ConfigError } from './config-manager.js';

/**
 * Configuration migration interface
 */
export interface ConfigMigration {
  fromVersion: string;
  toVersion: string;
  migrate(config: any): any;
  validate(config: any): boolean;
}

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  warnings: string[];
  errors: string[];
  itemsMigrated: number;
  itemsSkipped: number;
  itemsFailed: number;
  duration: number;
}

/**
 * Backup information interface
 */
export interface BackupInfo {
  path: string;
  timestamp: number;
  version: string;
  size: number;
}

/**
 * Configuration Migration Validator
 */
export class MigrationValidator {
  private static instance: MigrationValidator;
  private migrations: Map<string, ConfigMigration> = new Map();
  private backupDir: string;

  private constructor() {
    this.backupDir = path.join(process.cwd(), 'config', 'backups');
    this.registerMigrations();
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): MigrationValidator {
    if (!MigrationValidator.instance) {
      MigrationValidator.instance = new MigrationValidator();
    }
    return MigrationValidator.instance;
  }

  /**
   * Register all available migrations
   */
  private registerMigrations(): void {
    // Register v1.x to v2.0 migration,
    this.migrations.set('1.x->2.0', {
      fromVersion: '1.x',
      toVersion: '2.0',
      migrate: this.migrateV1ToV2.bind(this),
      validate: this.validateV2Config.bind(this)
    });

    // Register v2.0 to v2.1 migration (future)
    this.migrations.set('2.0->2.1', {
      fromVersion: '2.0',
      toVersion: '2.1',
      migrate: this.migrateV2ToV21.bind(this),
      validate: this.validateV21Config.bind(this)
    });
  }

  /**
   * Create backup of current configuration
   */
  async createBackup(configPath: string): Promise<BackupInfo> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      const timestamp = Date.now();
      const backupFileName = `config-backup-${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      const originalContent = await fs.readFile(configPath, 'utf8');
      await fs.writeFile(backupPath, originalContent);
      
      const stats = await fs.stat(backupPath);
      
      // Try to determine version from config,
      let version = 'unknown';
      try {
        const config = JSON.parse(originalContent);
        version = config.version || (config.orchestrator?.maxAgents !== undefined ? '1.x' : 'unknown');
      } catch {
        // Invalid JSON, keep as unknown
      }

      const backupInfo: BackupInfo = {
        path: backupPath,
        timestamp,
        version,
        size: stats.size
      };

      console.log(`✅ Created backup: ${backupFileName}`);
      return backupInfo;
    } catch (error) {
      throw new ConfigError(`Failed to create backup: ${(error as Error).message}`);
    }
  }

  /**
   * Detect configuration version
   */
  detectVersion(config: any): string {
    if (config.version) {
      return config.version;
    }

    // Heuristic detection for v1.x,
    if (config.orchestrator?.maxAgents !== undefined && !config.orchestrator?.maxConcurrentAgents) {
      return '1.x';
    }

    // Heuristic detection for v2.0,
    if (config.orchestrator?.maxConcurrentAgents !== undefined) {
      return '2.0';
    }

    return 'unknown';
  }

  /**
   * Migrate configuration to latest version
   */
  async migrateConfiguration(configPath: string, targetVersion?: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      fromVersion: 'unknown',
      toVersion: targetVersion || '2.0',
      warnings: [],
      errors: [],
      itemsMigrated: 0,
      itemsSkipped: 0,
      itemsFailed: 0,
      duration: 0
    };

    try {
      // Read and parse original configuration,
      const originalContent = await fs.readFile(configPath, 'utf8');
      const originalConfig = JSON.parse(originalContent);
      
      result.fromVersion = this.detectVersion(originalConfig);
      
      if (result.fromVersion === result.toVersion) {
        result.warnings.push('Configuration is already at target version');
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Create backup before migration,
      await this.createBackup(configPath);

      // Find appropriate migration path,
      const migrationKey = `${result.fromVersion}->${result.toVersion}`;
      const migration = this.migrations.get(migrationKey);
      
      if (!migration) {
        throw new ConfigError(`No migration path found from ${result.fromVersion} to ${result.toVersion}`);
      }

      // Perform migration,
      const migratedConfig = migration.migrate(originalConfig);
      
      // Validate migrated configuration,
      if (!migration.validate(migratedConfig)) {
        throw new ConfigError('Migrated configuration failed validation');
      }

      // Write migrated configuration,
      const migratedContent = JSON.stringify(migratedConfig, null, 2);
      await fs.writeFile(configPath, migratedContent);

      result.success = true;
      result.itemsMigrated = this.countConfigItems(migratedConfig);
      
      console.log(`✅ Successfully migrated configuration from ${result.fromVersion} to ${result.toVersion}`);

    } catch (error) {
      result.errors.push((error as Error).message);
      console.error(`❌ Migration failed: ${(error as Error).message}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Migrate v1.x configuration to v2.0
   */
  private migrateV1ToV2(v1Config: any): any {
    const v2Config: any = {
      version: '2.0.0',
      orchestrator: {
        maxConcurrentAgents: v1Config.orchestrator?.maxAgents || 10,
        taskQueueSize: v1Config.orchestrator?.queueSize || 100,
        healthCheckInterval: v1Config.orchestrator?.healthCheckInterval || 30000,
        shutdownTimeout: v1Config.orchestrator?.shutdownTimeout || 30000
      },
      terminal: {
        type: v1Config.terminal?.type || 'auto',
        poolSize: v1Config.terminal?.poolSize || 5,
        recycleAfter: v1Config.terminal?.recycleAfter || 10,
        healthCheckInterval: v1Config.terminal?.healthCheckInterval || 60000,
        commandTimeout: v1Config.terminal?.commandTimeout || 300000
      },
      memory: {
        backend: v1Config.memory?.backend || 'hybrid',
        cacheSizeMB: v1Config.memory?.cacheSizeMB || 100,
        syncInterval: v1Config.memory?.syncInterval || 5000,
        conflictResolution: v1Config.memory?.conflictResolution || 'crdt',
        retentionDays: v1Config.memory?.retentionDays || 30
      },
      coordination: {
        maxRetries: v1Config.coordination?.maxRetries || 3,
        retryDelay: v1Config.coordination?.retryDelay || 1000,
        deadlockDetection: v1Config.coordination?.deadlockDetection ?? true,
        resourceTimeout: v1Config.coordination?.resourceTimeout || 60000,
        messageTimeout: v1Config.coordination?.messageTimeout || 30000
      },
      mcp: {
        transport: v1Config.mcp?.transport || 'stdio',
        port: v1Config.mcp?.port || 3000,
        tlsEnabled: v1Config.mcp?.tlsEnabled ?? false
      },
      logging: {
        level: v1Config.logging?.level || 'info',
        format: v1Config.logging?.format || 'json',
        destination: v1Config.logging?.destination || 'console'
      },
      ruvSwarm: {
        enabled: v1Config.ruvSwarm?.enabled ?? true,
        defaultTopology: v1Config.ruvSwarm?.defaultTopology || 'mesh',
        maxAgents: v1Config.ruvSwarm?.maxAgents || 8,
        defaultStrategy: v1Config.ruvSwarm?.defaultStrategy || 'adaptive',
        autoInit: v1Config.ruvSwarm?.autoInit ?? true,
        enableHooks: v1Config.ruvSwarm?.enableHooks ?? true,
        enablePersistence: v1Config.ruvSwarm?.enablePersistence ?? true,
        enableNeuralTraining: v1Config.ruvSwarm?.enableNeuralTraining ?? true,
        configPath: v1Config.ruvSwarm?.configPath || '.claude/ruv-swarm-config.json'
      }
    };

    // Migrate custom fields if they exist,
    if (v1Config.customHooks) {
      v2Config.hooks = this.migrateCustomHooks(v1Config.customHooks);
    }

    if (v1Config.agents) {
      v2Config.agents = this.migrateAgentConfig(v1Config.agents);
    }

    return v2Config;
  }

  /**
   * Migrate v2.0 to v2.1 (placeholder for future migration)
   */
  private migrateV2ToV21(v2Config: any): any {
    const v21Config = { ...v2Config };
    v21Config.version = '2.1.0';
    
    // Add new v2.1 features here when they become available,
    
    return v21Config;
  }

  /**
   * Migrate custom hooks from v1 to v2 format
   */
  private migrateCustomHooks(v1Hooks: any[]): any {
    const v2Hooks: any = {};
    
    v1Hooks.forEach(hook => {
      const hookName = hook.name.replace(/-/g, '_');
      v2Hooks[hookName] = {
        enabled: true,
        command: hook.command,
        timeout: hook.timeout || 30000,
        onFailure: hook.onFailure || 'warn'
      };
    });

    return v2Hooks;
  }

  /**
   * Migrate agent configuration from v1 to v2 format
   */
  private migrateAgentConfig(v1Agents: any[]): any {
    const agentTypeMapping: Record<string, string> = {
      'worker': 'coder',
      'coordinator': 'coordinator',
      'tester': 'tester',
      'reviewer': 'reviewer'
    };

    return {
      preferredTypes: v1Agents.map(agent => agentTypeMapping[agent.type] || agent.type),
      autoSpawn: {
        enabled: true,
        triggers: {
          fileTypes: {},
          projectStructure: {}
        }
      }
    };
  }

  /**
   * Validate v2.0 configuration
   */
  private validateV2Config(config: any): boolean {
    try {
      // Check required fields,
      const requiredFields = [
        'version',
        'orchestrator.maxConcurrentAgents',
        'terminal.type',
        'memory.backend',
        'coordination.maxRetries',
        'mcp.transport',
        'logging.level',
        'ruvSwarm.enabled'
      ];

      for (const field of requiredFields) {
        if (!this.getNestedValue(config, field)) {
          console.warn(`Missing required field: ${field}`);
          return false;
        }
      }

      // Validate value ranges,
      if (config.orchestrator.maxConcurrentAgents < 1 || config.orchestrator.maxConcurrentAgents > 100) {
        console.warn('orchestrator.maxConcurrentAgents must be between 1 and 100');
        return false;
      }

      if (!['auto', 'vscode', 'native'].includes(config.terminal.type)) {
        console.warn('terminal.type must be one of: auto, vscode, native');
        return false;
      }

      if (!['sqlite', 'markdown', 'hybrid'].includes(config.memory.backend)) {
        console.warn('memory.backend must be one of: sqlite, markdown, hybrid');
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`Configuration validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Validate v2.1 configuration (placeholder)
   */
  private validateV21Config(config: any): boolean {
    // Start with v2.0 validation,
    if (!this.validateV2Config(config)) {
      return false;
    }

    // Add v2.1 specific validations here when needed,

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Count configuration items for migration reporting
   */
  private countConfigItems(config: any): number {
    let count = 0;
    
    const countObject = (obj: any) => {
      for (const key in obj) {
        count++;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          countObject(obj[key]);
        }
      }
    };

    countObject(config);
    return count;
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(backupPath: string, targetConfigPath: string): Promise<void> {
    try {
      const backupContent = await fs.readFile(backupPath, 'utf8');
      await fs.writeFile(targetConfigPath, backupContent);
      
      console.log(`✅ Restored configuration from backup: ${path.basename(backupPath)}`);
    } catch (error) {
      throw new ConfigError(`Failed to restore from backup: ${(error as Error).message}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.startsWith('config-backup-') && file.endsWith('.json')) {
          const backupPath = path.join(this.backupDir, file);
          const stats = await fs.stat(backupPath);
          
          // Extract timestamp from filename,
          const timestampMatch = file.match(/config-backup-(\d+)\.json/);
          const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : 0;

          // Try to determine version,
          let version = 'unknown';
          try {
            const content = await fs.readFile(backupPath, 'utf8');
            const config = JSON.parse(content);
            version = this.detectVersion(config);
          } catch {
            // Keep as unknown
          }

          backups.push({
            path: backupPath,
            timestamp,
            version,
            size: stats.size
          });
        }
      }

      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      throw new ConfigError(`Failed to list backups: ${(error as Error).message}`);
    }
  }

  /**
   * Validate backward compatibility
   */
  async validateBackwardCompatibility(newConfigPath: string, oldConfigPath: string): Promise<boolean> {
    try {
      const newConfig = JSON.parse(await fs.readFile(newConfigPath, 'utf8'));
      const oldConfig = JSON.parse(await fs.readFile(oldConfigPath, 'utf8'));

      // Check if essential functionality is preserved,
      const compatibilityChecks = [
        this.checkAgentCompatibility(newConfig, oldConfig),
        this.checkWorkflowCompatibility(newConfig, oldConfig),
        this.checkPerformanceCompatibility(newConfig, oldConfig)
      ];

      return compatibilityChecks.every(check => check);
    } catch (error) {
      console.warn(`Backward compatibility check failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Check agent configuration compatibility
   */
  private checkAgentCompatibility(newConfig: any, oldConfig: any): boolean {
    // Ensure agent count is not significantly reduced,
    const oldMaxAgents = oldConfig.orchestrator?.maxAgents || oldConfig.orchestrator?.maxConcurrentAgents || 10;
    const newMaxAgents = newConfig.orchestrator?.maxConcurrentAgents || 10;

    if (newMaxAgents < oldMaxAgents * 0.5) {
      console.warn('Agent count reduced by more than 50%');
      return false;
    }

    return true;
  }

  /**
   * Check workflow compatibility
   */
  private checkWorkflowCompatibility(newConfig: any, oldConfig: any): boolean {
    // Check if basic workflow capabilities are maintained,
    const oldHasWorkflows = oldConfig.workflows || oldConfig.agents;
    const newHasWorkflows = newConfig.workflows || newConfig.agents;

    if (oldHasWorkflows && !newHasWorkflows) {
      console.warn('Workflow capabilities may have been lost');
      return false;
    }

    return true;
  }

  /**
   * Check performance compatibility
   */
  private checkPerformanceCompatibility(newConfig: any, oldConfig: any): boolean {
    // Check if performance settings are not significantly degraded,
    const oldCacheSize = oldConfig.memory?.cacheSizeMB || 100;
    const newCacheSize = newConfig.memory?.cacheSizeMB || 100;

    if (newCacheSize < oldCacheSize * 0.5) {
      console.warn('Memory cache size reduced by more than 50%');
      return false;
    }

    return true;
  }
}

// Export singleton instance,
export const migrationValidator = MigrationValidator.getInstance();