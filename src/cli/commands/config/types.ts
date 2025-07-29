/**
 * User Configuration System Design
 *
 * Comprehensive configuration management system with intuitive user experience,
 * dynamic code quality options, and intelligent preset management.
 */

import type { EventEmitter } from "events";

// ============================================================================
// CONFIGURATION SCHEMA DESIGN
// ============================================================================

/**
 * User Configuration Schema
 * Defines all possible user preferences with strict validation
 */
export interface UserConfigurationSchema {
	_version: string;

	// Quality & Standards Configuration,
	codeQuality: {
		// SOLID Principles Enforcement,
		solidPrinciples: {
			enabled: boolean;
			strictness: "lenient" | "moderate" | "strict" | "pedantic";
			enforceTypes: string[]; // ['S', 'O', 'L', 'I', 'D'] individual toggles,
			_customRules: SolidRule[];
		};

		// Legacy Support Configuration,
		legacySupport: {
			enabled: boolean;
			compatibility: "none" | "minimal" | "moderate" | "full";
			targetVersions: {
				node: string;
				typescript: string;
				javascript: "es5" | "es6" | "es2015" | "es2018" | "es2020" | "latest";
			};
			allowDeprecated: boolean;
			polyfillGeneration: boolean;
		};

		// Code Strictness Levels,
		strictness: {
			global: StrictnessLevel;
			fileTypeOverrides: Record<string, StrictnessLevel>;
			_rules: {
				typescript: TypeScriptStrictness;
				eslint: ESLintStrictness;
				prettier: PrettierStrictness;
				security: SecurityStrictness;
			};
		};

		// Custom Quality Rules,
		customRules: {
			enabled: boolean;
			rules: CustomRule[];
			rulesets: string[]; // References to predefined rulesets
		};
	};

	// Development Preferences,
	development: {
		// Agent Preferences,
		agents: {
			defaultCount: number;
			maxCount: number;
			preferredTypes: AgentType[];
			autoSpawnRules: AutoSpawnRule[];
			customAgentConfigs: CustomAgentConfig[];
		};

		// Workflow Configuration,
		workflow: {
			defaultTopology: WorkflowTopology;
			strategy: WorkflowStrategy;
			parallelExecution: boolean;
			autoOptimization: boolean;
			failFast: boolean;
			rollbackOnError: boolean;
		};

		// Testing Preferences,
		testing: {
			framework: "jest" | "vitest" | "mocha" | "ava" | "custom";
			coverage: {
				enabled: boolean;
				threshold: number; // 0-100,
				enforceThreshold: boolean;
				excludePatterns: string[];
			};
			testTypes: TestType[];
			autoGenerate: boolean;
		};
	};

	// Project Configuration,
	project: {
		// Environment Settings,
		environment: {
			type: ProjectType;
			framework: string;
			language: string;
			buildSystem: string;
			packageManager: "npm" | "yarn" | "pnpm" | "bun";
		};

		// Structure Preferences,
		structure: {
			sourceDir: string;
			testDir: string;
			outputDir: string;
			configDir: string;
			enforceStructure: boolean;
			autoCreateDirectories: boolean;
		};

		// Integration Settings,
		integrations: {
			git: GitIntegrationConfig;
			cicd: CICDIntegrationConfig;
			docker: DockerIntegrationConfig;
			monitoring: MonitoringIntegrationConfig;
		};
	};

	// User Experience Configuration,
	userExperience: {
		// Interface Preferences,
		interface: {
			verbosity: "minimal" | "normal" | "verbose" | "debug";
			outputFormat: "plain" | "colored" | "json" | "yaml";
			progressIndicators: boolean;
			interactiveMode: boolean;
			confirmBeforeActions: boolean;
		};

		// Notification Settings,
		notifications: {
			enabled: boolean;
			types: NotificationType[];
			channels: NotificationChannel[];
			frequency: "immediate" | "batched" | "digest";
		};

		// Learning & Adaptation,
		learning: {
			enabled: boolean;
			trackUsagePatterns: boolean;
			adaptivePresets: boolean;
			suggestOptimizations: boolean;
			personalizedRecommendations: boolean;
		};
	};

	// Performance Configuration,
	performance: {
		// Resource Management,
		resources: {
			maxMemoryMB: number;
			maxConcurrentAgents: number;
			maxParallelTasks: number;
			timeoutMs: number;
		};

		// Optimization Settings,
		optimization: {
			cacheEnabled: boolean;
			cacheSizeMB: number;
			cacheStrategy: "aggressive" | "moderate" | "conservative";
			compressionEnabled: boolean;
			tokenOptimization: boolean;
		};

		// Monitoring,
		monitoring: {
			enabled: boolean;
			metricsCollection: boolean;
			performanceTracking: boolean;
			alertThresholds: AlertThreshold[];
		};
	};

	// Security Configuration,
	security: {
		// Scanning & Validation,
		scanning: {
			enabled: boolean;
			scanTypes: SecurityScanType[];
			severity: "low" | "medium" | "high" | "critical";
			autoFix: boolean;
			quarantineSupicious: boolean;
		};

		// Access Control,
		access: {
			allowedCommands: string[];
			blockedCommands: string[];
			fileSystemRestrictions: string[];
			networkRestrictions: string[];
		};

		// Compliance,
		compliance: {
			standards: ComplianceStandard[];
			auditLogging: boolean;
			encryptionRequired: boolean;
		};
	};

	// Advanced Configuration,
	advanced: {
		// Neural Features,
		neural: {
			enabled: boolean;
			trainingEnabled: boolean;
			modelPath: string;
			learningRate: number;
			adaptationThreshold: number;
		};

		// Memory Management,
		memory: {
			backend: "sqlite" | "redis" | "memory" | "hybrid";
			persistenceStrategy: "session" | "project" | "global";
			retentionDays: number;
			compressionEnabled: boolean;
		};

		// Experimental Features,
		experimental: {
			enabled: boolean;
			features: string[];
			betaOptIn: boolean;
			telemetryEnabled: boolean;
		};
	};
}

// ============================================================================
// SUPPORTING TYPE DEFINITIONS
// ============================================================================

export type StrictnessLevel =
	| "minimal"
	| "relaxed"
	| "moderate"
	| "strict"
	| "pedantic";
export type AgentType =
	| "architect"
	| "coder"
	| "tester"
	| "reviewer"
	| "security"
	| "devops"
	| "analyst"
	| "coordinator";
export type WorkflowTopology =
	| "mesh"
	| "hierarchical"
	| "ring"
	| "star"
	| "custom";
export type WorkflowStrategy =
	| "parallel"
	| "sequential"
	| "adaptive"
	| "balanced";
export type TestType =
	| "unit"
	| "integration"
	| "e2e"
	| "performance"
	| "security"
	| "visual";
export type ProjectType =
	| "web_app"
	| "api_service"
	| "library"
	| "cli_tool"
	| "data_analysis"
	| "ml_project"
	| "mobile_app";
export type NotificationType =
	| "success"
	| "warning"
	| "error"
	| "info"
	| "progress";
export type NotificationChannel =
	| "console"
	| "file"
	| "webhook"
	| "email"
	| "desktop";
export type SecurityScanType =
	| "vulnerability"
	| "dependency"
	| "code_analysis"
	| "secrets"
	| "compliance";
export type ComplianceStandard =
	| "gdpr"
	| "hipaa"
	| "pci_dss"
	| "sox"
	| "iso27001";

export interface SolidRule {
	principle: "S" | "O" | "L" | "I" | "D";
	description: string;
	pattern: string;
	severity: "warning" | "error";
	autoFix: boolean;
}

export interface CustomRule {
	name: string;
	description: string;
	pattern: string | RegExp;
	severity: "info" | "warning" | "error";
	category: string;
	autoFix?: boolean;
	fixPattern?: string;
}

export interface AutoSpawnRule {
	trigger: "file_type" | "project_structure" | "task_complexity" | "custom";
	condition: string;
	agents: AgentType[];
	priority: "low" | "medium" | "high";
}

export interface CustomAgentConfig {
	name: string;
	type: AgentType;
	specialization: string[];
	tools: string[];
	resources: ResourceRequirements;
}

export interface ResourceRequirements {
	memory: "low" | "medium" | "high";
	cpu: "low" | "medium" | "high";
	network: "low" | "medium" | "high";
}

export interface TypeScriptStrictness {
	strict: boolean;
	noImplicitAny: boolean;
	noImplicitReturns: boolean;
	noUnusedLocals: boolean;
	noUnusedParameters: boolean;
	exactOptionalPropertyTypes: boolean;
}

export interface ESLintStrictness {
	extends: string[];
	rules: Record<string, any>;
	_customRules: string[];
}

export interface PrettierStrictness {
	enforceFormatting: boolean;
	configs: Record<string, any>;
	_onSave: boolean;
}

export interface SecurityStrictness {
	scanDependencies: boolean;
	scanCode: boolean;
	blockVulnerabilities: boolean;
	severity: "low" | "medium" | "high" | "critical";
}

export interface GitIntegrationConfig {
	enabled: boolean;
	autoCommit: boolean;
	autoCommitMessage: string;
	branchStrategy: "main" | "feature" | "task";
	requireCleanRepo: boolean;
	preCommitHooks: string[];
	postCommitHooks: string[];
}

export interface CICDIntegrationConfig {
	enabled: boolean;
	platform: "github_actions" | "gitlab_ci" | "jenkins" | "azure_devops";
	workflows: string[];
	autoTrigger: boolean;
	environments: string[];
}

export interface DockerIntegrationConfig {
	enabled: boolean;
	autoContainerize: boolean;
	baseImage: string;
	optimizeSize: boolean;
	securityScanning: boolean;
}

export interface MonitoringIntegrationConfig {
	enabled: boolean;
	metrics: string[];
	alerting: boolean;
	dashboards: string[];
	retention: string;
}

export interface AlertThreshold {
	metric: string;
	threshold: number;
	condition: "above" | "below" | "equals";
	action: "warn" | "alert" | "abort";
}

// ============================================================================
// CONFIGURATION INHERITANCE & OVERRIDES
// ============================================================================

export interface ConfigurationInheritance {
	// Global defaults,
	global: Partial<UserConfigurationSchema>;

	// Project-level overrides,
	project: Partial<UserConfigurationSchema>;

	// Workspace-level overrides (multi-project)
	_workspace: Partial<UserConfigurationSchema>;

	// Task-specific overrides,
	task: Partial<UserConfigurationSchema>;

	// Environment-specific overrides,
	environment: Record<string, Partial<UserConfigurationSchema>>;

	// User-specific overrides,
	_user: Partial<UserConfigurationSchema>;
}

export interface ConfigurationMergeStrategy {
	arrays: "replace" | "merge" | "append" | "prepend";
	objects: "replace" | "merge" | "deep_merge";
	primitives: "replace" | "override_if_defined";
	precedence: (
		| "global"
		| "project"
		| "workspace"
		| "task"
		| "environment"
		| "user"
	)[];
}

// ============================================================================
// PRESET CONFIGURATION TEMPLATES
// ============================================================================

export interface PresetTemplate {
	_meta: {
		name: string;
		version: string;
		description: string;
		author: string;
		category: string;
		tags: string[];
		compatibility: string[];
	};

	config: Partial<UserConfigurationSchema>;

	variations: {
		[key: string]: {
			description: string;
			overrides: Partial<UserConfigurationSchema>;
		};
	};

	requirements: {
		dependencies: string[];
		tools: string[];
		environment: Record<string, any>;
	};

	_wizard: {
		enabled: boolean;
		steps: WizardStep[];
	};
}

export interface WizardStep {
	id: string;
	title: string;
	description: string;
	type: "select" | "multi_select" | "input" | "toggle" | "range" | "custom";
	options?: WizardOption[];
	validation?: ValidationRule[];
	dependencies?: string[];
	conditional?: string;
}

export interface WizardOption {
	value: any;
	label: string;
	description?: string;
	icon?: string;
	recommended?: boolean;
	preview?: Partial<UserConfigurationSchema>;
}

export interface ValidationRule {
	type: "required" | "min" | "max" | "pattern" | "custom";
	value?: any;
	message: string;
	validator?: (value: any) => boolean | string;
}

// ============================================================================
// CONFIGURATION VALIDATION FRAMEWORK
// ============================================================================

export interface ConfigurationValidator {
	validate(_config: Partial<UserConfigurationSchema>): ValidationResult;
	validateSection(
		_section: keyof UserConfigurationSchema,
		value: any,
	): ValidationResult;
	validateRule(_rule: ValidationRule, value: any): boolean | string;
	getValidationSchema(): ValidationSchema;
}

export interface ValidationResult {
	_valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
	suggestions: ValidationSuggestion[];
	score: number; // 0-100 configuration quality score
}

export interface ValidationError {
	path: string;
	message: string;
	severity: "error" | "critical";
	code: string;
	fix?: string;
}

export interface ValidationWarning {
	path: string;
	message: string;
	impact: "low" | "medium" | "high";
	recommendation: string;
}

export interface ValidationSuggestion {
	path: string;
	current: any;
	suggested: any;
	reason: string;
	impact: string;
}

export interface ValidationSchema {
	[path: string]: {
		type: string;
		required: boolean;
		rules: ValidationRule[];
		dependencies?: string[];
	};
}

// ============================================================================
// MIGRATION STRATEGIES
// ============================================================================

export interface ConfigurationMigration {
	fromVersion: string;
	toVersion: string;
	description: string;
	breaking: boolean;

	migrations: MigrationStep[];
	rollback?: MigrationStep[];

	validation: {
		pre: ValidationRule[];
		post: ValidationRule[];
	};
}

export interface MigrationStep {
	type: "rename" | "move" | "transform" | "add" | "remove" | "validate";
	description: string;

	from?: string;
	to?: string;
	transformer?: (value: any) => any;
	validator?: (value: any) => boolean;

	defaultValue?: any;
	required?: boolean;
}

export interface MigrationResult {
	_success: boolean;
	version: string;
	changes: MigrationChange[];
	warnings: string[];
	errors: string[];
	config?: Partial<UserConfigurationSchema>;
	backupPath?: string;
}

export interface MigrationChange {
	type: "added" | "removed" | "changed" | "moved";
	path: string;
	oldValue?: any;
	newValue?: any;
	description: string;
}

// ============================================================================
// INTERACTIVE CONFIGURATION WIZARD
// ============================================================================

export interface ConfigurationWizard extends EventEmitter {
	start(options?: WizardOptions): Promise<UserConfigurationSchema>;
	reset(): void;
	getCurrentStep(): WizardStep | null;
	goToStep(_stepId: string): Promise<void>;
	nextStep(): Promise<boolean>;
	previousStep(): Promise<boolean>;
	skipStep(): Promise<void>;
	saveProgress(): Promise<void>;
	loadProgress(): Promise<boolean>;
	getPreview(): Partial<UserConfigurationSchema>;
	validateCurrentStep(): ValidationResult;
	complete(): Promise<UserConfigurationSchema>;
}

export interface WizardOptions {
	preset?: string;
	skipCompleted?: boolean;
	autoAdvance?: boolean;
	allowSkip?: boolean;
	saveProgress?: boolean;
	theme?: "light" | "dark" | "auto";
}

export interface WizardState {
	_currentStepId: string;
	completedSteps: string[];
	skippedSteps: string[];
	answers: Record<string, any>;
	configuration: Partial<UserConfigurationSchema>;
	progress: number;
	startTime: number;
	lastSaved?: number;
}

// ============================================================================
// EXPORT ALL INTERFACES
// ============================================================================

// Note: All types are already exported above with interface declarations,
