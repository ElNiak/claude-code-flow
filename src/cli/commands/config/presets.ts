import { promises as fs } from "fs";
import path from "path";
import { type Config, ConfigError, ConfigManager } from "./manager.js";

/**
 * Preset configuration interface
 */
export interface PresetConfig extends Config {
	name: string;
	description: string;
	version: string;
	agents?: {
		preferredTypes: string[];
		autoSpawn: {
			enabled: boolean;
			triggers: Record<string, any>;
		};
	};
	workflows?: Record<string, WorkflowConfig>;
	smartDefaults?: Record<string, any>;
	hooks?: Record<string, any>;
	performance?: Record<string, any>;
	security?: Record<string, any>;
	monitoring?: Record<string, any>;
}

/**
 * Workflow configuration interface
 */
export interface WorkflowConfig {
	enabled: boolean;
	agents: string[];
	topology: string;
	strategy: string;
	parallel: boolean;
	sequential?: boolean;
}

/**
 * Agent capability requirements
 */
export interface AgentCapabilities {
	agentTypes: Record<string, AgentTypeDefinition>;
	agentSelectionRules: {
		byFileType: Record<string, string[]>;
		byProjectType: Record<string, string[]>;
		byWorkflowPhase: Record<string, string[]>;
	};
	coordinationPatterns: Record<string, any>;
	adaptiveRules: Record<string, any>;
}

/**
 * Agent type definition
 */
export interface AgentTypeDefinition {
	name: string;
	description: string;
	capabilities: Record<string, any>;
	specializations: string[];
	workflowRoles: string[];
	preferredTopologies: string[];
	resourceRequirements: {
		memory: "low" | "medium" | "high";
		cpu: "low" | "medium" | "high";
		network: "low" | "medium" | "high";
	};
}

/**
 * Preset Manager for configuration presets and adaptive configuration
 */
export class PresetManager {
	private static instance: PresetManager;
	private configManager: ConfigManager;
	private presetsDir: string;
	private agentCapabilities?: AgentCapabilities;

	private constructor() {
		this.configManager = ConfigManager.getInstance();
		this.presetsDir = path.join(process.cwd(), "config", "presets");
	}

	/**
	 * Gets the singleton instance
	 */
	static getInstance(): PresetManager {
		if (!PresetManager.instance) {
			PresetManager.instance = new PresetManager();
		}
		return PresetManager.instance;
	}

	/**
	 * Initialize the preset manager
	 */
	async init(): Promise<void> {
		await this.loadAgentCapabilities();
	}

	/**
	 * Load agent capabilities from configuration
	 */
	private async loadAgentCapabilities(): Promise<void> {
		try {
			const capabilitiesPath = path.join(
				process.cwd(),
				"config",
				"agent-capabilities.json",
			);
			const content = await fs.readFile(capabilitiesPath, "utf8");
			this.agentCapabilities = JSON.parse(content);
		} catch (error) {
			throw new ConfigError(
				`Failed to load agent capabilities: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Get available presets
	 */
	async getAvailablePresets(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.presetsDir);
			return files
				.filter((file) => file.endsWith(".json"))
				.map((file) => path.basename(file, ".json"));
		} catch (error) {
			throw new ConfigError(
				`Failed to read presets directory: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Load a specific preset
	 */
	async loadPreset(presetName: string): Promise<PresetConfig> {
		try {
			const presetPath = path.join(this.presetsDir, `${presetName}.json`);
			const content = await fs.readFile(presetPath, "utf8");
			const preset = JSON.parse(content) as PresetConfig;

			// Validate preset structure,
			this.validatePreset(preset);

			return preset;
		} catch (error) {
			throw new ConfigError(
				`Failed to load preset '${presetName}': ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Apply a preset to the configuration manager
	 */
	async applyPreset(presetName: string): Promise<void> {
		const preset = await this.loadPreset(presetName);

		// Extract base configuration (remove preset-specific fields)
		const {
			name,
			description,
			version,
			agents,
			workflows,
			smartDefaults,
			hooks,
			performance,
			security,
			monitoring,
			...baseConfig
		} = preset;

		// Apply base configuration,
		await this.configManager.load(JSON.stringify(baseConfig));

		console.log(`✅ Applied preset: ${name} (${version})`);
	}

	/**
	 * Create adaptive configuration based on project analysis
	 */
	async createAdaptiveConfig(
		projectAnalysis: ProjectAnalysis,
	): Promise<PresetConfig> {
		if (!this.agentCapabilities) {
			throw new ConfigError("Agent capabilities not loaded");
		}

		// Start with appropriate base preset,
		let basePreset: PresetConfig;

		if (
			projectAnalysis.type === "web_application" ||
			projectAnalysis.type === "api_service"
		) {
			basePreset = await this.loadPreset("development");
		} else if (
			projectAnalysis.type === "data_analysis" ||
			projectAnalysis.type === "research"
		) {
			basePreset = await this.loadPreset("research");
		} else if (
			projectAnalysis.type === "infrastructure" ||
			projectAnalysis.type === "deployment"
		) {
			basePreset = await this.loadPreset("deployment");
		} else {
			basePreset = await this.loadPreset("development"); // Default
		}

		// Adapt configuration based on project characteristics,
		const adaptedConfig = this.adaptConfigurationForProject(
			basePreset,
			projectAnalysis,
		);

		return adaptedConfig;
	}

	/**
	 * Adapt configuration based on project analysis
	 */
	private adaptConfigurationForProject(
		baseConfig: PresetConfig,
		analysis: ProjectAnalysis,
	): PresetConfig {
		const adaptedConfig = JSON.parse(
			JSON.stringify(baseConfig),
		) as PresetConfig;

		// Adapt agent count based on project size,
		const sizeRules = this.agentCapabilities?.adaptiveRules.projectSize;
		if (sizeRules) {
			const sizeRule = sizeRules[analysis.size];
			if (sizeRule) {
				adaptedConfig.ruvSwarm.maxAgents = sizeRule.maxAgents;
				adaptedConfig.ruvSwarm.defaultTopology = sizeRule.preferredTopology;
				adaptedConfig.ruvSwarm.defaultStrategy = sizeRule.strategy;
			}
		}

		// Adapt agents based on file types,
		if (analysis.fileTypes && this.agentCapabilities) {
			const recommendedAgents = new Set<string>();

			analysis.fileTypes.forEach((fileType) => {
				const agents =
					this.agentCapabilities!.agentSelectionRules.byFileType[fileType];
				if (agents) {
					agents.forEach((agent) => recommendedAgents.add(agent));
				}
			});

			if (adaptedConfig.agents) {
				adaptedConfig.agents.preferredTypes = Array.from(recommendedAgents);
			}
		}

		// Adapt complexity-based settings,
		const complexityRules = this.agentCapabilities?.adaptiveRules.complexity;
		if (complexityRules) {
			const complexityRule = complexityRules[analysis.complexity];
			if (complexityRule && adaptedConfig.agents) {
				adaptedConfig.agents.preferredTypes = complexityRule.agentTypes;
			}
		}

		// Adapt time constraints,
		const timeRules = this.agentCapabilities?.adaptiveRules.timeConstraints;
		if (timeRules) {
			const timeRule = timeRules[analysis.timeConstraint];
			if (timeRule && adaptedConfig.performance) {
				adaptedConfig.performance.parallelExecution =
					timeRule.parallelism === "maximum";
				adaptedConfig.performance.intelligentBatching =
					timeRule.quality !== "fast";
			}
		}

		// Adapt memory settings based on project characteristics,
		if (analysis.isDataIntensive) {
			adaptedConfig.memory.cacheSizeMB = Math.max(
				adaptedConfig.memory.cacheSizeMB,
				500,
			);
			adaptedConfig.memory.backend = "hybrid";
		}

		// Adapt coordination settings based on team size,
		if (analysis.teamSize > 5) {
			adaptedConfig.ruvSwarm.defaultTopology = "hierarchical";
			adaptedConfig.coordination.maxRetries = Math.max(
				adaptedConfig.coordination.maxRetries,
				5,
			);
		}

		// Set adaptive metadata,
		adaptedConfig.name = `adaptive-${analysis.type}`;
		adaptedConfig.description = `Adaptive configuration for ${analysis.type} project`;
		adaptedConfig.version = "2.0.0-adaptive";

		return adaptedConfig;
	}

	/**
	 * Analyze project structure and characteristics
	 */
	async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
		const analysis: ProjectAnalysis = {
			type: "unknown",
			size: "medium",
			complexity: "medium",
			timeConstraint: "normal",
			fileTypes: [],
			isDataIntensive: false,
			teamSize: 1,
		};

		try {
			// Analyze package.json if it exists,
			const packageJsonPath = path.join(projectPath, "package.json");
			try {
				const packageContent = await fs.readFile(packageJsonPath, "utf8");
				const packageJson = JSON.parse(packageContent);
				analysis.type = this.inferProjectTypeFromPackageJson(packageJson);
			} catch {
				// No package.json or invalid JSON
			}

			// Analyze file structure,
			const files = await this.getProjectFiles(projectPath);
			analysis.fileTypes = this.getUniqueFileTypes(files);
			analysis.size = this.inferProjectSize(files);
			analysis.complexity = this.inferProjectComplexity(
				files,
				analysis.fileTypes,
			);
			analysis.isDataIntensive = this.isDataIntensiveProject(
				analysis.fileTypes,
			);

			// Check for team indicators,
			const gitConfigPath = path.join(projectPath, ".git", "config");
			try {
				await fs.access(gitConfigPath);
				// Could analyze git history for team size, but simplified for now,
				analysis.teamSize = 3; // Default assumption for git projects
			} catch {
				analysis.teamSize = 1; // Single developer
			}
		} catch (error) {
			console.warn(`Project analysis failed: ${(error as Error).message}`);
		}

		return analysis;
	}

	/**
	 * Validate preset configuration
	 */
	private validatePreset(preset: PresetConfig): void {
		if (!preset.name) {
			throw new ConfigError("Preset must have a name");
		}
		if (!preset.version) {
			throw new ConfigError("Preset must have a version");
		}
		if (!preset.orchestrator) {
			throw new ConfigError("Preset must have orchestrator configuration");
		}
		if (!preset.ruvSwarm) {
			throw new ConfigError("Preset must have ruv-swarm configuration");
		}
	}

	/**
	 * Infer project type from package.json
	 */
	private inferProjectTypeFromPackageJson(packageJson: any): string {
		const dependencies = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};
		const scripts = packageJson.scripts || {};

		if (dependencies.react || dependencies.vue || dependencies.angular) {
			return "web_application";
		}
		if (dependencies.express || dependencies.fastify || dependencies.koa) {
			return "api_service";
		}
		if (dependencies.pandas || dependencies.numpy || dependencies["jupyter"]) {
			return "data_analysis";
		}
		if (dependencies.docker || scripts.deploy || scripts.build) {
			return "deployment";
		}

		return "web_application"; // Default
	}

	/**
	 * Get all files in project recursively
	 */
	private async getProjectFiles(
		projectPath: string,
		maxDepth = 3,
	): Promise<string[]> {
		const files: string[] = [];

		const traverse = async (currentPath: string, depth: number) => {
			if (depth > maxDepth) return;

			try {
				const entries = await fs.readdir(currentPath, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = path.join(currentPath, entry.name);

					if (
						entry.isDirectory() &&
						!entry.name.startsWith(".") &&
						entry.name !== "node_modules"
					) {
						await traverse(fullPath, depth + 1);
					} else if (entry.isFile()) {
						files.push(fullPath);
					}
				}
			} catch {
				// Ignore permission errors
			}
		};

		await traverse(projectPath, 0);
		return files;
	}

	/**
	 * Get unique file types from file list
	 */
	private getUniqueFileTypes(files: string[]): string[] {
		const extensions = new Set<string>();

		files.forEach((file) => {
			const ext = path.extname(file);
			if (ext) {
				extensions.add(`*${ext}`);
			}
		});

		return Array.from(extensions);
	}

	/**
	 * Infer project size based on file count
	 */
	private inferProjectSize(files: string[]): "small" | "medium" | "large" {
		const fileCount = files.length;

		if (fileCount < 50) return "small";
		if (fileCount < 200) return "medium";
		return "large";
	}

	/**
	 * Infer project complexity
	 */
	private inferProjectComplexity(
		files: string[],
		fileTypes: string[],
	): "low" | "medium" | "high" {
		const complexityIndicators = {
			languages: fileTypes.length,
			testFiles: files.filter((f) => f.includes("test") || f.includes("spec"))
				.length,
			configFiles: files.filter(
				(f) => f.includes("config") || f.includes("package.json"),
			).length,
			buildFiles: files.filter(
				(f) =>
					f.includes("webpack") || f.includes("rollup") || f.includes("babel"),
			).length,
		};

		const complexityScore =
			complexityIndicators.languages * 2 +
			complexityIndicators.testFiles * 1 +
			complexityIndicators.configFiles * 1 +
			complexityIndicators.buildFiles * 3;

		if (complexityScore < 10) return "low";
		if (complexityScore < 25) return "medium";
		return "high";
	}

	/**
	 * Check if project is data intensive
	 */
	private isDataIntensiveProject(fileTypes: string[]): boolean {
		const dataFileTypes = [".csv", ".json", ".xml", ".parquet", ".db", ".sql"];
		return fileTypes.some((type) =>
			dataFileTypes.includes(type.replace("*", "")),
		);
	}

	/**
	 * Get recommended configuration for a project
	 */
	async getRecommendedConfiguration(
		projectPath: string,
	): Promise<PresetConfig> {
		const analysis = await this.analyzeProject(projectPath);
		const adaptiveConfig = await this.createAdaptiveConfig(analysis);

		console.log(`📊 Project Analysis:`);
		console.log(`   Type: ${analysis.type}`);
		console.log(`   Size: ${analysis.size}`);
		console.log(`   Complexity: ${analysis.complexity}`);
		console.log(`   File Types: ${analysis.fileTypes.join(", ")}`);
		console.log(`   Data Intensive: ${analysis.isDataIntensive}`);
		console.log(`   Team Size: ${analysis.teamSize}`);
		console.log(`✅ Generated adaptive configuration`);

		return adaptiveConfig;
	}

	/**
	 * Save adaptive configuration as a custom preset
	 */
	async saveAsCustomPreset(config: PresetConfig, name: string): Promise<void> {
		const customPresetsDir = path.join(
			process.cwd(),
			"config",
			"custom-presets",
		);
		await fs.mkdir(customPresetsDir, { recursive: true });

		const customPresetPath = path.join(customPresetsDir, `${name}.json`);
		await fs.writeFile(customPresetPath, JSON.stringify(config, null, 2));

		console.log(`✅ Saved custom preset: ${name}`);
	}
}

/**
 * Project analysis interface
 */
export interface ProjectAnalysis {
	type: string;
	size: "small" | "medium" | "large";
	complexity: "low" | "medium" | "high";
	timeConstraint: "urgent" | "normal" | "thorough";
	fileTypes: string[];
	isDataIntensive: boolean;
	teamSize: number;
}

// Export singleton instance,
export const presetManager = PresetManager.getInstance();
