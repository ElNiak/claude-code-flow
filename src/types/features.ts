/**
 * Feature system type definitions
 */

export interface FeatureFlags {
	autoTopologySelection?: boolean;
	parallelExecution?: boolean;
	neuralTraining?: boolean;
	bottleneckAnalysis?: boolean;
	smartAutoSpawning?: boolean;
	selfHealingWorkflows?: boolean;
	crossSessionMemory?: boolean;
	githubIntegration?: boolean;
	[_key: string]: boolean | undefined;
}

export interface FeatureConfig {
	enabled: boolean;
	description: string;
	category: "performance" | "coordination" | "intelligence" | "integration";
	requirements?: string[];
	conflicts?: string[];
}

export interface FeatureStatus {
	name: string;
	enabled: boolean;
	config: FeatureConfig;
	lastModified?: Date;
	modifiedBy?: string;
}

export interface FeatureManager {
	getFeature(name: string): Promise<FeatureStatus | null>;
	enableFeature(name: string): Promise<void>;
	disableFeature(name: string): Promise<void>;
	listFeatures(): Promise<FeatureStatus[]>;
	validateFeatures(): Promise<boolean>;
}
