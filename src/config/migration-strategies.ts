/**
 * Configuration Migration Strategies
 *
 * Comprehensive migration system for upgrading configurations between versions,
 * handling breaking changes, and providing smooth upgrade paths.
 */

import { promises as fs } from "fs";
import * as path from "path";
import type {
	ConfigurationMigration,
	MigrationChange,
	MigrationResult,
	MigrationStep,
	UserConfigurationSchema,
	ValidationResult,
} from "./user-configuration-system.js";

// ============================================================================
// MIGRATION ENGINE
// ============================================================================

export class ConfigurationMigrationManager {
	private migrations: Map<string, ConfigurationMigration>;
	private backupDirectory: string;

	constructor(backupDir = ".claude/backups") {
		this.migrations = new Map();
		this.backupDirectory = backupDir;
		this.registerBuiltInMigrations();
	}

	/**
	 * Migrate configuration to target version
	 */
	async migrate(
		config: Partial<UserConfigurationSchema>,
		fromVersion: string,
		toVersion: string
	): Promise<MigrationResult> {
		const _migrationPath = this.findMigrationPath(fromVersion, toVersion);

		if (!_migrationPath.length) {
			return {
				_success: false,
				version: fromVersion,
				changes: [],
				warnings: [
					`No migration path found from ${fromVersion} to ${toVersion}`,
				],
				errors: ["Migration path not available"],
				config: config,
			};
		}

		// Create backup,
		const backupPath = await this.createBackup(config, fromVersion);

		let _currentConfig = JSON.parse(JSON.stringify(config));
		const _allChanges: MigrationChange[] = [];
		const _allWarnings: string[] = [];
		const _allErrors: string[] = [];

		try {
			// Apply migrations in sequence,
			for (const migration of _migrationPath) {
				const _result = await this.applyMigration(_currentConfig, migration);

				if (!_result._success) {
					// Rollback on failure,
					await this.rollback(config, migration, backupPath);
					return {
						_success: false,
						version: fromVersion,
						changes: _allChanges,
						warnings: _allWarnings,
						errors: [..._allErrors, ..._result.errors],
						config: config,
					};
				}

				_currentConfig = _result.config;
				_allChanges.push(..._result.changes);
				_allWarnings.push(..._result.warnings);
			}

			// Validate final configuration,
			const validation = await this.validateMigratedConfig(_currentConfig);
			if (!validation._valid) {
				_allWarnings.push("Migrated configuration has validation issues");
			}

			return {
				_success: true,
				version: toVersion,
				changes: _allChanges,
				warnings: _allWarnings,
				errors: _allErrors,
				config: _currentConfig,
				backupPath,
			};
		} catch (error) {
			_allErrors.push(
				`Migration _failed: ${error instanceof Error ? error.message : String(error)}`
			);

			return {
				_success: false,
				version: fromVersion,
				changes: _allChanges,
				warnings: _allWarnings,
				errors: _allErrors,
				config: config,
				backupPath,
			};
		}
	}

	/**
	 * Check if migration is needed
	 */
	needsMigration(currentVersion: string, targetVersion: string): boolean {
		return this.compareVersions(currentVersion, targetVersion) < 0;
	}

	/**
	 * Get available migrations
	 */
	getAvailableMigrations(): ConfigurationMigration[] {
		return Array.from(this.migrations.values());
	}

	/**
	 * Register custom migration
	 */
	registerMigration(migration: ConfigurationMigration): void {
		const _key = `${migration.fromVersion}-${migration.toVersion}`;
		this.migrations.set(_key, migration);
	}

	/**
	 * Rollback to previous version
	 */
	async rollback(
		_originalConfig: Partial<UserConfigurationSchema>,
		failedMigration: ConfigurationMigration,
		backupPath?: string
	): Promise<MigrationResult> {
		if (backupPath) {
			try {
				const _backupContent = await fs.readFile(backupPath, "utf-8");
				const _backedUpConfig = JSON.parse(_backupContent);

				return {
					_success: true,
					version: failedMigration.fromVersion,
					changes: [
						{
							type: "changed",
							path: "entire_config",
							oldValue: "migrated_config",
							newValue: "original_config",
							description: "Rolled back to original configuration",
						},
					],
					warnings: ["Configuration rolled back due to migration failure"],
					errors: [],
					config: _backedUpConfig,
				};
			} catch (error) {
				return {
					_success: false,
					version: failedMigration.fromVersion,
					changes: [],
					warnings: [],
					errors: [
						`Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
					],
					config: _originalConfig,
				};
			}
		}

		return {
			_success: false,
			version: failedMigration.fromVersion,
			changes: [],
			warnings: [],
			errors: ["No backup available for rollback"],
			config: _originalConfig,
		};
	}

	// ============================================================================
	// PRIVATE MIGRATION METHODS
	// ============================================================================

	private findMigrationPath(
		fromVersion: string,
		toVersion: string
	): ConfigurationMigration[] {
		const _path: ConfigurationMigration[] = [];
		let _currentVersion = fromVersion;

		while (this.compareVersions(_currentVersion, toVersion) < 0) {
			const _nextMigration = this.findNextMigration(_currentVersion, toVersion);

			if (!_nextMigration) {
				// No direct path found, return empty array,
				return [];
			}

			_path.push(_nextMigration);
			_currentVersion = _nextMigration.toVersion;
		}

		return _path;
	}

	private findNextMigration(
		fromVersion: string,
		targetVersion: string
	): ConfigurationMigration | null {
		// Find the most direct migration (closest to target version)
		let bestMigration: ConfigurationMigration | null = null;
		let bestDistance = Infinity;

		for (const migration of Array.from(this.migrations.values())) {
			if (migration.fromVersion === fromVersion) {
				const distance = this.compareVersions(
					migration.toVersion,
					targetVersion
				);

				if (distance <= 0 && Math.abs(distance) < bestDistance) {
					bestMigration = migration;
					bestDistance = Math.abs(distance);
				}
			}
		}

		return bestMigration;
	}

	private async applyMigration(
		config: Partial<UserConfigurationSchema>,
		migration: ConfigurationMigration
	): Promise<SingleMigrationResult> {
		const changes: MigrationChange[] = [];
		const warnings: string[] = [];
		const errors: string[] = [];

		// Validate pre-conditions,
		for (const rule of migration.validation.pre) {
			const isValid = this.validateMigrationRule(config, rule);
			if (!isValid) {
				errors.push(`Pre-migration validation failed: ${rule.message}`);
			}
		}

		if (errors.length > 0) {
			return {
				_success: false,
				config,
				changes,
				warnings,
				errors,
			};
		}

		let migratedConfig = JSON.parse(JSON.stringify(config));

		// Apply migration steps,
		for (const step of migration.migrations) {
			try {
				const stepResult = this.applyMigrationStep(migratedConfig, step);
				migratedConfig = stepResult.config;
				changes.push(...stepResult.changes);
				warnings.push(...stepResult.warnings);
			} catch (error) {
				errors.push(
					`Migration step _failed: ${error instanceof Error ? error.message : String(error)}`
				);
				break;
			}
		}

		// Validate post-conditions,
		for (const rule of migration.validation.post) {
			const isValid = this.validateMigrationRule(migratedConfig, rule);
			if (!isValid) {
				warnings.push(`Post-migration validation warning: ${rule.message}`);
			}
		}

		return {
			_success: errors.length === 0,
			config: migratedConfig,
			changes,
			warnings,
			errors,
		};
	}

	private applyMigrationStep(
		config: Partial<UserConfigurationSchema>,
		step: MigrationStep
	): MigrationStepResult {
		const changes: MigrationChange[] = [];
		const warnings: string[] = [];
		const migratedConfig = JSON.parse(JSON.stringify(config));

		switch (step.type) {
			case "rename":
				if (step.from && step.to) {
					const value = this.getConfigValue(migratedConfig, step.from);
					if (value !== undefined) {
						this.setConfigValue(migratedConfig, step.to, value);
						this.deleteConfigValue(migratedConfig, step.from);

						changes.push({
							type: "moved",
							path: step.from,
							oldValue: value,
							newValue: value,
							description: `Renamed ${step.from} to ${step.to}`,
						});
					}
				}
				break;

			case "move":
				if (step.from && step.to) {
					const value = this.getConfigValue(migratedConfig, step.from);
					if (value !== undefined) {
						this.setConfigValue(migratedConfig, step.to, value);
						this.deleteConfigValue(migratedConfig, step.from);

						changes.push({
							type: "moved",
							path: step.from,
							oldValue: value,
							newValue: value,
							description: `Moved ${step.from} to ${step.to}`,
						});
					}
				}
				break;

			case "transform":
				if (step.from && step.to && step.transformer) {
					const oldValue = this.getConfigValue(migratedConfig, step.from);
					if (oldValue !== undefined) {
						const newValue = step.transformer(oldValue);
						this.setConfigValue(migratedConfig, step.to, newValue);

						if (step.from !== step.to) {
							this.deleteConfigValue(migratedConfig, step.from);
						}

						changes.push({
							type: "changed",
							path: step.to,
							oldValue,
							newValue,
							description: step.description,
						});
					}
				}
				break;

			case "add":
				if (step.to && step.defaultValue !== undefined) {
					const currentValue = this.getConfigValue(migratedConfig, step.to);
					if (currentValue === undefined) {
						this.setConfigValue(migratedConfig, step.to, step.defaultValue);

						changes.push({
							type: "added",
							path: step.to,
							newValue: step.defaultValue,
							description: step.description,
						});
					}
				}
				break;

			case "remove":
				if (step.from) {
					const oldValue = this.getConfigValue(migratedConfig, step.from);
					if (oldValue !== undefined) {
						this.deleteConfigValue(migratedConfig, step.from);

						changes.push({
							type: "removed",
							path: step.from,
							oldValue,
							description: step.description,
						});
					}
				}
				break;

			case "validate":
				if (step.validator) {
					const isValid = step.validator(migratedConfig);
					if (!isValid) {
						warnings.push(`Validation warning: ${step.description}`);
					}
				}
				break;
		}

		return {
			config: migratedConfig,
			changes,
			warnings,
		};
	}

	private validateMigrationRule(config: any, rule: any): boolean {
		if (rule.validator && typeof rule.validator === "function") {
			return rule.validator(config);
		}
		return true;
	}

	private async validateMigratedConfig(
		config: Partial<UserConfigurationSchema>
	): Promise<ValidationResult> {
		// This would integrate with the validation framework,
		return {
			_valid: true,
			errors: [],
			warnings: [],
			suggestions: [],
			score: 100,
		};
	}

	private async createBackup(
		config: Partial<UserConfigurationSchema>,
		version: string
	): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupFileName = `config-backup-${version}-${timestamp}.json`;
		const backupPath = path.join(this.backupDirectory, backupFileName);

		// Ensure backup directory exists,
		await fs.mkdir(this.backupDirectory, { recursive: true });

		// Write backup,
		await fs.writeFile(backupPath, JSON.stringify(config, null, 2), "utf-8");

		return backupPath;
	}

	private compareVersions(version1: string, version2: string): number {
		const v1Parts = version1.split(".").map(Number);
		const v2Parts = version2.split(".").map(Number);

		for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
			const v1Part = v1Parts[i] || 0;
			const v2Part = v2Parts[i] || 0;

			if (v1Part < v2Part) {
				return -1;
			}
			if (v1Part > v2Part) {
				return 1;
			}
		}

		return 0;
	}

	private getConfigValue(config: any, path: string): any {
		const parts = path.split(".");
		let current = config;

		for (const part of parts) {
			if (current && typeof current === "object" && part in current) {
				current = current[part];
			} else {
				return undefined;
			}
		}

		return current;
	}

	private setConfigValue(config: any, path: string, value: any): void {
		const parts = path.split(".");
		let current = config;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (!(part in current)) {
				current[part] = {};
			}
			current = current[part];
		}

		current[parts[parts.length - 1]] = value;
	}

	private deleteConfigValue(config: any, path: string): void {
		const parts = path.split(".");
		let current = config;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (!(part in current)) {
				return; // Path doesn't exist
			}
			current = current[part];
		}

		delete current[parts[parts.length - 1]];
	}

	// ============================================================================
	// BUILT-IN MIGRATIONS
	// ============================================================================

	private registerBuiltInMigrations(): void {
		// Migration from 1.0.0 to 2.0.0
		this.registerMigration({
			fromVersion: "1.0.0",
			toVersion: "2.0.0",
			description: "Major upgrade with restructured configuration schema",
			breaking: true,

			migrations: [
				{
					type: "rename",
					from: "quality",
					to: "codeQuality",
					description: "Renamed quality section to codeQuality",
				},
				{
					type: "add",
					to: "codeQuality.solidPrinciples",
					defaultValue: {
						enabled: false,
						strictness: "moderate",
						enforceTypes: ["S", "O", "L", "I", "D"],
						customRules: [],
					},
					description: "Added SOLID principles configuration",
				},
				{
					type: "transform",
					from: "agents",
					to: "development.agents",
					transformer: (oldAgents: any) => ({
						defaultCount: oldAgents.count || 4,
						maxCount: oldAgents.max || 8,
						preferredTypes: oldAgents.types || ["coder", "tester"],
						autoSpawnRules: [],
						customAgentConfigs: [],
					}),
					description: "Restructured agent configuration",
				},
				{
					type: "add",
					to: "userExperience",
					defaultValue: {
						interface: {
							verbosity: "normal",
							outputFormat: "colored",
							progressIndicators: true,
							interactiveMode: true,
							confirmBeforeActions: false,
						},
						notifications: {
							enabled: true,
							types: ["error", "warning"],
							channels: ["console"],
							frequency: "immediate",
						},
						learning: {
							enabled: true,
							trackUsagePatterns: true,
							adaptivePresets: true,
							suggestOptimizations: true,
							personalizedRecommendations: true,
						},
					},
					description: "Added user experience configuration",
				},
			],

			validation: {
				pre: [
					{
						type: "custom",
						validator: (config: any) => config.version === "1.0.0",
						message: "Configuration must be version 1.0.0",
					},
				],
				post: [
					{
						type: "custom",
						validator: (config: any) => config.codeQuality !== undefined,
						message: "codeQuality section should exist after migration",
					},
				],
			},
		});

		// Migration from 2.0.0 to 2.1.0,
		this.registerMigration({
			fromVersion: "2.0.0",
			toVersion: "2.1.0",
			description: "Added advanced neural features and enhanced security",
			breaking: false,

			migrations: [
				{
					type: "add",
					to: "advanced.neural",
					defaultValue: {
						enabled: false,
						trainingEnabled: false,
						modelPath: ".claude/models",
						learningRate: 0.001,
						adaptationThreshold: 0.8,
					},
					description: "Added neural configuration",
				},
				{
					type: "transform",
					from: "security",
					to: "security",
					transformer: (oldSecurity: any) => ({
						...oldSecurity,
						compliance: {
							standards: [],
							auditLogging: false,
							encryptionRequired: false,
						},
					}),
					description: "Enhanced security configuration with compliance",
				},
			],

			validation: {
				pre: [
					{
						type: "custom",
						validator: (config: any) => config.version === "2.0.0",
						message: "Configuration must be version 2.0.0",
					},
				],
				post: [
					{
						type: "custom",
						validator: (config: any) => config.advanced?.neural !== undefined,
						message: "Neural configuration should exist after migration",
					},
				],
			},
		});
	}
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

export class MigrationAnalyzer {
	/**
	 * Analyze migration impact
	 */
	static analyzeMigrationImpact(
		migration: ConfigurationMigration
	): MigrationImpactAnalysis {
		const impact: MigrationImpactAnalysis = {
			breaking: migration.breaking,
			affectedSections: [],
			addedFeatures: [],
			removedFeatures: [],
			changedFeatures: [],
			estimatedTime: "unknown",
			riskLevel: "low",
		};

		for (const step of migration.migrations) {
			switch (step.type) {
				case "add":
					if (step.to) {
						impact.addedFeatures.push(step.to);
						impact.affectedSections.push(
							MigrationAnalyzer.extractSection(step.to)
						);
					}
					break;
				case "remove":
					if (step.from) {
						impact.removedFeatures.push(step.from);
						impact.affectedSections.push(
							MigrationAnalyzer.extractSection(step.from)
						);
					}
					break;
				case "rename":
				case "move":
				case "transform":
					if (step.from) {
						impact.changedFeatures.push(step.from);
						impact.affectedSections.push(
							MigrationAnalyzer.extractSection(step.from)
						);
					}
					if (step.to) {
						impact.affectedSections.push(
							MigrationAnalyzer.extractSection(step.to)
						);
					}
					break;
			}
		}

		// Remove duplicates
		impact.affectedSections = Array.from(new Set(impact.affectedSections));

		// Estimate risk level
		if (migration.breaking) {
			impact.riskLevel = "high";
		} else if (
			impact.removedFeatures.length > 0 ||
			impact.changedFeatures.length > 3
		) {
			impact.riskLevel = "medium";
		} else {
			impact.riskLevel = "low";
		}

		// Estimate time
		const stepCount = migration.migrations.length;
		if (stepCount < 5) {
			impact.estimatedTime = "< 1 minute";
		} else if (stepCount < 15) {
			impact.estimatedTime = "1-3 minutes";
		} else {
			impact.estimatedTime = "> 3 minutes";
		}

		return impact;
	}

	private static extractSection(path: string): string {
		return path.split(".")[0];
	}

	/**
	 * Generate migration preview
	 */
	static generateMigrationPreview(
		config: Partial<UserConfigurationSchema>,
		migration: ConfigurationMigration
	): MigrationPreview {
		const _preview: MigrationPreview = {
			fromVersion: migration.fromVersion,
			toVersion: migration.toVersion,
			changes: [],
			warnings: [],
		};

		// Simulate migration steps to show preview,
		const _simulatedConfig = JSON.parse(JSON.stringify(config));

		for (const step of migration.migrations) {
			const _change = MigrationAnalyzer.simulateStep(_simulatedConfig, step);
			if (_change) {
				_preview.changes.push(_change);
			}
		}

		return _preview;
	}

	private static simulateStep(
		_config: any,
		step: MigrationStep
	): MigrationChange | null {
		switch (step.type) {
			case "add":
				if (step.to && step.defaultValue !== undefined) {
					return {
						type: "added",
						path: step.to,
						newValue: step.defaultValue,
						description: step.description,
					};
				}
				break;
			case "remove":
				if (step.from) {
					return {
						type: "removed",
						path: step.from,
						oldValue: "existing_value",
						description: step.description,
					};
				}
				break;
			case "rename":
			case "move":
				if (step.from && step.to) {
					return {
						type: "moved",
						path: step.from,
						oldValue: "existing_value",
						newValue: "existing_value",
						description: step.description,
					};
				}
				break;
		}

		return null;
	}
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

interface SingleMigrationResult {
	_success: boolean;
	config: Partial<UserConfigurationSchema>;
	changes: MigrationChange[];
	warnings: string[];
	errors: string[];
}

interface MigrationStepResult {
	config: Partial<UserConfigurationSchema>;
	changes: MigrationChange[];
	warnings: string[];
}

export interface MigrationImpactAnalysis {
	breaking: boolean;
	affectedSections: string[];
	addedFeatures: string[];
	removedFeatures: string[];
	changedFeatures: string[];
	estimatedTime: string;
	riskLevel: "low" | "medium" | "high";
}

export interface MigrationPreview {
	fromVersion: string;
	toVersion: string;
	changes: MigrationChange[];
	warnings: string[];
}

// ============================================================================
// Classes are already exported above with 'export class' declarations
