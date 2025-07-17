/**
 * Progress system type definitions
 */

// Progress step definition
export interface ProgressStep {
	id: string;
	name: string;
	description: string;
	weight: number;
	status?: "pending" | "active" | "completed" | "failed";
	startTime?: Date;
	endTime?: Date;
	metadata?: Record<string, any>;
}

// Progress indicator interface
export interface ProgressIndicator {
	defineSteps(steps: ProgressStep[]): void;
	startStep(stepId: string): void;
	completeStep(stepId: string, result?: any): void;
	failStep(stepId: string, error: string): void;
	updateProgress(stepId: string, progress: number): void;
	getStatus(): ProgressStatus;
	cancel(): void;
	onProgress?: (status: ProgressStatus) => void;
	onComplete?: (result: ProgressResult) => void;
	onError?: (error: Error) => void;
}

// Progress status
export interface ProgressStatus {
	type: string;
	title: string;
	totalSteps: number;
	completedSteps: number;
	currentStep?: ProgressStep;
	overallProgress: number;
	startTime: Date;
	estimatedTimeRemaining?: number;
	isComplete: boolean;
	isFailed: boolean;
	error?: string;
}

// Progress result
export interface ProgressResult {
	success: boolean;
	totalTime: number;
	steps: ProgressStep[];
	error?: string;
	metadata?: Record<string, any>;
}

// Environment detection
export interface EnvironmentInfo {
	isCI: boolean;
	isTTY: boolean;
	isDocker: boolean;
	isWSL: boolean;
	terminalType: string;
	colorSupport: boolean;
	unicodeSupport: boolean;
	nodeVersion: string;
	platform: string;
}

// Progress configuration
export interface ProgressConfig {
	enabled: boolean;
	mode: "simple" | "detailed" | "minimal" | "verbose";
	theme: "default" | "minimal" | "verbose" | "custom";
	updateInterval: number;
	colorOutput: boolean;
	showETA: boolean;
	showPercentage: boolean;
	showSpinner: boolean;
	customChars?: {
		spinner?: string[];
		complete?: string;
		incomplete?: string;
		progress?: string;
	};
}

// Global progress config manager
export interface ProgressConfigManager {
	getConfig(): ProgressConfig;
	updateConfig(config: Partial<ProgressConfig>): void;
	getOperationConfig(operation: string): ProgressConfig;
	resetToDefaults(): void;
}

// Progress factory function type
export type CreateProgressIndicator = (
	type: string,
	title: string,
	options?: Partial<ProgressConfig>
) => ProgressIndicator;

// Environment detection function types
export type DetectEnvironment = () => EnvironmentInfo;
export type GetOptimalConfig = (env?: EnvironmentInfo) => ProgressConfig;

// Demo function types for progress command
export type ProgressDemoFunction = () => Promise<void>;

// Progress middleware options
export interface ProgressMiddlewareOptions {
	progressMode?: string;
	progressTheme?: string;
	noProgress?: boolean;
}

// Migration progress (already exists but adding for completeness)
export interface MigrationProgress {
	total: number;
	completed: number;
	current: string;
	phase: "analyzing" | "backing-up" | "migrating" | "validating" | "complete";
	errors: number;
	warnings: number;
}
