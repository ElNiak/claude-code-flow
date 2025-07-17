/**
 * Type definitions for the unified work command system
 */

// Core command options,
export interface WorkOptions {
	verbose?: boolean;
	debug?: boolean;
	dryRun?: boolean;
	config?: string;
	preset?: string;
	agents?: number;
	topology?: string;
	strategy?: string;
	output?: string;
	memory?: boolean;
	hooks?: boolean;
	autoOptimize?: boolean;
	tmux?: boolean;
	tmuxSession?: string;
}

// Task analysis types,
export type TaskComplexity = "low" | "medium" | "high" | "very_high";
export type AgentTopology = "mesh" | "hierarchical" | "ring" | "star";
export type ExecutionStrategy = "parallel" | "sequential" | "adaptive";

export interface TaskInput {
	task: string;
	params: string[];
	context: {
		workingDirectory: string;
		environment: NodeJS.ProcessEnv;
		options: WorkOptions;
	};
}

export interface TaskAnalysis {
	task: string;
	taskType: string;
	complexity: TaskComplexity;
	keywords: string[];
	context: any;
	suggestedAgents: number;
	suggestedTopology: AgentTopology;
	suggestedStrategy: ExecutionStrategy;
	estimatedDuration: string;
	requiredResources: string[];
	confidence: number;
	recommendations: string[];
}

// Execution plan types,
export interface ExecutionStep {
	type: string;
	action: string;
	params?: any;
	description?: string;
	dependencies?: string[];
	parallel?: boolean;
}

export interface CoordinationConfig {
	topology: AgentTopology;
	agents: number;
	strategy: ExecutionStrategy;
	enableMemory: boolean;
	enableHooks: boolean;
}

export interface ExecutionPlan {
	id: string;
	analysis: TaskAnalysis;
	steps: ExecutionStep[];
	coordination: CoordinationConfig;
	estimatedDuration: string;
	resources: string[];
}

// Configuration types,
export interface WorkConfig {
	coordination: {
		defaultAgents: number;
		maxAgents: number;
		defaultTopology: AgentTopology;
		defaultStrategy: ExecutionStrategy;
		timeoutMs: number;
		retryAttempts: number;
	};
	features: {
		enableMemory: boolean;
		enableHooks: boolean;
		autoOptimize: boolean;
		enableMetrics: boolean;
		enableCaching: boolean;
	};
	analysis: {
		complexityThresholds: {
			low: number;
			medium: number;
			high: number;
		};
		confidenceThreshold: number;
		maxKeywords: number;
		enableContextAnalysis: boolean;
	};
	execution: {
		parallelSteps: boolean;
		failFast: boolean;
		saveProgress: boolean;
		enableRollback: boolean;
		maxExecutionTime: number;
	};
	logging: {
		level: "debug" | "info" | "warn" | "error";
		format: "text" | "json";
		destination: "console" | "file";
		debug: boolean;
		saveToFile?: boolean;
		logFile?: string;
	};
	presets: {
		[key: string]: {
			agents: number;
			topology: AgentTopology;
			strategy: ExecutionStrategy;
			features: string[];
		};
	};
	paths: {
		configDir: string;
		dataDir: string;
		logsDir: string;
		cacheDir: string;
	};
}

export interface EnvironmentConfig {
	defaultAgents?: number;
	defaultTopology?: AgentTopology;
	defaultStrategy?: ExecutionStrategy;
	logLevel?: "debug" | "info" | "warn" | "error";
	debug?: boolean;
	enableMemory?: boolean;
	enableHooks?: boolean;
}

export interface ConfigSchema {
	[key: string]: {
		[field: string]: {
			type: "string" | "number" | "boolean" | "object" | "array";
			required?: boolean;
			min?: number;
			max?: number;
			enum?: any[];
			default?: any;
		};
	};
}

// Preset types,
export interface WorkPreset {
	overrides: Partial<TaskAnalysis>;
	steps?: ExecutionStep[];
}

export interface PresetDefinition {
	description: string;
	category: string;
	tags?: string[];
	overrides: Partial<TaskAnalysis>;
	steps?: ExecutionStep[];
}

export interface PresetMetadata {
	name: string;
	type: "builtin" | "custom";
	description: string;
	category: string;
	tags: string[];
	version: string;
	author: string;
	createdAt?: string;
	updatedAt?: string;
	exportedAt?: string;
}

export interface CustomPreset {
	preset: WorkPreset;
	metadata: PresetMetadata;
}

// Agent and coordination types,
export interface AgentConfig {
	type: string;
	name: string;
	specialization: string;
	capabilities: string[];
	priority: number;
}

export interface CoordinationResult {
	success: boolean;
	agents: AgentConfig[];
	topology: AgentTopology;
	strategy: ExecutionStrategy;
	executionTime: number;
	results: any[];
	errors: string[];
}

// Metrics and monitoring types,
export interface ExecutionMetrics {
	startTime: number;
	endTime: number;
	duration: number;
	tokensUsed: number;
	agentsSpawned: number;
	stepsCompleted: number;
	stepsTotal: number;
	successRate: number;
	errorCount: number;
	warnings: string[];
}

export interface PerformanceMetrics {
	taskType: string;
	complexity: TaskComplexity;
	agentCount: number;
	topology: AgentTopology;
	strategy: ExecutionStrategy;
	executionTime: number;
	memoryUsage: number;
	cpuUsage: number;
	successRate: number;
	userSatisfaction?: number;
}

// Context analysis types,
export interface ProjectContext {
	projectType: string;
	language: string;
	framework: string;
	buildSystem: string;
	hasTests: boolean;
	hasDocumentation: boolean;
	isGitRepo: boolean;
	fileCount: number;
	complexity: string;
	dependencies: string[];
	devDependencies: string[];
}

export interface SystemContext {
	os: string;
	nodeVersion: string;
	npmVersion: string;
	gitVersion: string;
	memory: number;
	cpu: string;
	cores: number;
}

// Error handling types,
export interface WorkError {
	code: string;
	message: string;
	details?: any;
	stack?: string;
	recoverable: boolean;
	suggestions: string[];
}

export interface ErrorRecovery {
	strategy: "retry" | "fallback" | "skip" | "abort";
	maxAttempts: number;
	backoffMs: number;
	fallbackAction?: string;
}

// Progress tracking types,
export interface ProgressUpdate {
	stepId: string;
	stepName: string;
	status: "pending" | "running" | "completed" | "failed" | "skipped";
	progress: number; // 0-100,
	message?: string;
	startTime?: number;
	endTime?: number;
	result?: any;
	error?: WorkError;
}

export interface WorkSession {
	id: string;
	task: string;
	startTime: number;
	endTime?: number;
	status: "running" | "completed" | "failed" | "cancelled";
	analysis: TaskAnalysis;
	plan: ExecutionPlan;
	progress: ProgressUpdate[];
	metrics: ExecutionMetrics;
	results: any;
	errors: WorkError[];
}

// Integration types,
export interface MCPIntegration {
	enabled: boolean;
	tools: string[];
	configuration: any;
}

export interface GitIntegration {
	enabled: boolean;
	autoCommit: boolean;
	autoCommitMessage: string;
	branchStrategy: "main" | "feature" | "task";
	requireCleanRepo: boolean;
}

export interface CacheConfig {
	enabled: boolean;
	ttlMs: number;
	maxSize: number;
	strategy: "lru" | "fifo" | "ttl";
}

// Validation types,
export interface ValidationRule {
	name: string;
	description: string;
	validator: (value: any) => boolean | string;
	severity: "error" | "warning" | "info";
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	suggestions: string[];
}

// Hook system types,
export interface HookEvent {
	type: string;
	phase: "pre" | "post" | "error";
	data: any;
	timestamp: number;
}

export interface HookHandler {
	name: string;
	event: string;
	handler: (event: HookEvent) => Promise<void> | void;
	priority: number;
	enabled: boolean;
}

// Neural pattern types (for future AI enhancements)
export interface NeuralPattern {
	id: string;
	name: string;
	pattern: any;
	successRate: number;
	usageCount: number;
	lastUsed: number;
	contexts: string[];
}

export interface LearningData {
	input: TaskInput;
	analysis: TaskAnalysis;
	plan: ExecutionPlan;
	result: CoordinationResult;
	feedback: number; // -1 to 1 scale,
	timestamp: number;
}

// Search and filtering types,
export interface SearchFilter {
	taskType?: string[];
	complexity?: TaskComplexity[];
	category?: string[];
	tags?: string[];
	author?: string;
	dateRange?: {
		start: string;
		end: string;
	};
}

export interface SortOptions {
	field: string;
	direction: "asc" | "desc";
}

// Execution interfaces for preset system
export interface WorkExecutionContext {
	taskType?: string;
	complexity?: string;
	deadline?: string;
	dataSize?: string;
	availableResources?: string[];
}

export interface PresetExecutionOptions {
	dryRun?: boolean;
	skipSteps?: string[];
	overrideParams?: Record<string, any>;
	adaptiveExecution?: boolean;
	maxConcurrency?: number;
	timeout?: number;
	stopOnFailure?: boolean;
}

export interface StepExecutionResult {
	stepId: string;
	success: boolean;
	output?: any;
	duration: number;
	resources: string[];
	metadata?: Record<string, any>;
}

export interface PresetExecutionResult {
	presetName: string;
	success: boolean;
	duration: number;
	steps: StepExecutionResult[];
	adaptations: string[];
	performance: {
		efficiency: number;
		resourceUtilization: number;
		parallelization: number;
	};
	metadata: Record<string, any>;
}

// Export aggregated types,
export type WorkCommandTypes = {
	WorkOptions: WorkOptions;
	TaskAnalysis: TaskAnalysis;
	ExecutionPlan: ExecutionPlan;
	WorkConfig: WorkConfig;
	WorkPreset: WorkPreset;
	CoordinationResult: CoordinationResult;
	WorkSession: WorkSession;
	ExecutionMetrics: ExecutionMetrics;
	WorkError: WorkError;
};
