import * as fs from "fs/promises";
import * as path from "path";
import { Logger } from "../../core/logger.js";
import type {
	CustomPreset,
	PresetDefinition,
	PresetMetadata,
	WorkPreset,
} from "./types.js";

/**
 * Preset manager for common workflow configurations
 * Provides predefined and custom workflow presets for different task types
 */
export class PresetManager {
	private presets: Map<string, PresetDefinition>;
	private customPresets: Map<string, CustomPreset>;
	private logger: Logger;
	private presetPaths: string[];

	constructor() {
		this.presets = new Map();
		this.customPresets = new Map();
		this.logger = new Logger({
			level: "info",
			format: "text",
			destination: "console",
		});
		this.presetPaths = this.getPresetPaths();
		this.initializeBuiltinPresets();
	}

	/**
	 * Initialize the preset manager and load custom presets
	 */
	async initialize(): Promise<void> {
		await this.loadCustomPresets();
		this.logger.info(
			`Preset manager initialized with ${this.presets.size} built-in and ${this.customPresets.size} custom presets`,
		);
	}

	/**
	 * Get a preset by name
	 */
	async getPreset(name: string): Promise<WorkPreset | null> {
		// Check built-in presets first
		if (this.presets.has(name)) {
			const definition = this.presets.get(name)!;
			return this.convertDefinitionToPreset(definition);
		}

		// Check custom presets
		if (this.customPresets.has(name)) {
			const custom = this.customPresets.get(name)!;
			return custom.preset;
		}

		// Try to load from file if not found
		const loaded = await this.tryLoadPresetFromFile(name);
		if (loaded) {
			return loaded;
		}

		this.logger.warn(`Preset '${name}' not found`);
		return null;
	}

	/**
	 * List all available presets
	 */
	listPresets(): PresetMetadata[] {
		const metadata: PresetMetadata[] = [];

		// Add built-in presets
		for (const [name, definition] of Array.from(this.presets.entries())) {
			metadata.push({
				name,
				type: "builtin",
				description: definition.description,
				category: definition.category,
				tags: definition.tags || [],
				version: "1.0.0",
				author: "Claude Flow Team",
			});
		}

		// Add custom presets
		for (const [name, custom] of Array.from(this.customPresets.entries())) {
			metadata.push({
				name,
				type: "custom",
				description: custom.metadata.description,
				category: custom.metadata.category,
				tags: custom.metadata.tags || [],
				version: custom.metadata.version || "1.0.0",
				author: custom.metadata.author || "User",
			});
		}

		return metadata.sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Create a new custom preset
	 */
	async createPreset(
		name: string,
		preset: WorkPreset,
		metadata: Partial<PresetMetadata>,
	): Promise<void> {
		const customPreset: CustomPreset = {
			preset,
			metadata: {
				name,
				type: "custom",
				description: metadata.description || `Custom preset: ${name}`,
				category: metadata.category || "custom",
				tags: metadata.tags || [],
				version: metadata.version || "1.0.0",
				author: metadata.author || "User",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

		this.customPresets.set(name, customPreset);
		await this.saveCustomPreset(name, customPreset);

		this.logger.info(`Custom preset '${name}' created successfully`);
	}

	/**
	 * Update an existing custom preset
	 */
	async updatePreset(
		name: string,
		updates: Partial<WorkPreset>,
		metadataUpdates?: Partial<PresetMetadata>,
	): Promise<void> {
		if (!this.customPresets.has(name)) {
			throw new Error(`Custom preset '${name}' not found`);
		}

		const existing = this.customPresets.get(name)!;
		const updatedPreset: CustomPreset = {
			preset: { ...existing.preset, ...updates },
			metadata: {
				...existing.metadata,
				...metadataUpdates,
				updatedAt: new Date().toISOString(),
			},
		};

		this.customPresets.set(name, updatedPreset);
		await this.saveCustomPreset(name, updatedPreset);

		this.logger.info(`Custom preset '${name}' updated successfully`);
	}

	/**
	 * Delete a custom preset
	 */
	async deletePreset(name: string): Promise<void> {
		if (this.presets.has(name)) {
			throw new Error(`Cannot delete built-in preset '${name}'`);
		}

		if (!this.customPresets.has(name)) {
			throw new Error(`Custom preset '${name}' not found`);
		}

		this.customPresets.delete(name);
		await this.deleteCustomPresetFile(name);

		this.logger.info(`Custom preset '${name}' deleted successfully`);
	}

	/**
	 * Export a preset to a file
	 */
	async exportPreset(name: string, filePath: string): Promise<void> {
		const preset = await this.getPreset(name);
		if (!preset) {
			throw new Error(`Preset '${name}' not found`);
		}

		const exportData = {
			name,
			preset,
			metadata: this.customPresets.get(name)?.metadata || {
				name,
				type: "builtin" as const,
				description: this.presets.get(name)?.description || "",
				category: this.presets.get(name)?.category || "general",
				version: "1.0.0",
				exportedAt: new Date().toISOString(),
			},
		};

		const content = JSON.stringify(exportData, null, 2);
		await fs.writeFile(filePath, content, "utf-8");

		this.logger.info(`Preset '${name}' exported to ${filePath}`);
	}

	/**
	 * Import a preset from a file
	 */
	async importPreset(filePath: string, overwrite = false): Promise<string> {
		try {
			const content = await fs.readFile(filePath, "utf-8");
			const importData = JSON.parse(content);

			if (!importData.name || !importData.preset) {
				throw new Error("Invalid preset file format");
			}

			const name = importData.name;

			if (this.customPresets.has(name) && !overwrite) {
				throw new Error(
					`Preset '${name}' already exists. Use overwrite=true to replace it.`,
				);
			}

			await this.createPreset(
				name,
				importData.preset,
				importData.metadata || {},
			);

			this.logger.info(
				`Preset '${name}' imported successfully from ${filePath}`,
			);
			return name;
		} catch (error) {
			this.logger.error(
				`Failed to import preset: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	/**
	 * Search presets by tags or category
	 */
	searchPresets(query: string): PresetMetadata[] {
		const lowercaseQuery = query.toLowerCase();
		const allPresets = this.listPresets();

		return allPresets.filter(
			(preset) =>
				preset.name.toLowerCase().includes(lowercaseQuery) ||
				preset.description.toLowerCase().includes(lowercaseQuery) ||
				preset.category.toLowerCase().includes(lowercaseQuery) ||
				preset.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
		);
	}

	/**
	 * Get presets by category
	 */
	getPresetsByCategory(category: string): PresetMetadata[] {
		return this.listPresets().filter((preset) => preset.category === category);
	}

	/**
	 * Validate a preset configuration
	 */
	validatePreset(preset: WorkPreset): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Validate required fields
		if (!preset.overrides) {
			errors.push("Preset must have overrides object");
		}

		// Validate agent count
		if (preset.overrides.suggestedAgents !== undefined) {
			if (
				typeof preset.overrides.suggestedAgents !== "number" ||
				preset.overrides.suggestedAgents < 1 ||
				preset.overrides.suggestedAgents > 20
			) {
				errors.push("Suggested agents must be a number between 1 and 20");
			}
		}

		// Validate topology
		if (preset.overrides.suggestedTopology !== undefined) {
			const validTopologies = ["mesh", "hierarchical", "ring", "star"];
			if (!validTopologies.includes(preset.overrides.suggestedTopology)) {
				errors.push(`Topology must be one of: ${validTopologies.join(", ")}`);
			}
		}

		// Validate strategy
		if (preset.overrides.suggestedStrategy !== undefined) {
			const validStrategies = ["parallel", "sequential", "adaptive"];
			if (!validStrategies.includes(preset.overrides.suggestedStrategy)) {
				errors.push(`Strategy must be one of: ${validStrategies.join(", ")}`);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Initialize built-in presets
	 */
	private initializeBuiltinPresets(): void {
		// Development preset
		this.presets.set("development", {
			description: "Optimal configuration for software development tasks",
			category: "development",
			tags: ["coding", "software", "implementation"],
			overrides: {
				suggestedAgents: 4,
				suggestedTopology: "hierarchical",
				suggestedStrategy: "parallel",
				requiredResources: [
					"code_generation",
					"testing",
					"file_operations",
					"git_operations",
				],
				estimatedDuration: "45 minutes",
			},
			steps: [
				{
					type: "analysis",
					action: "analyze",
					description: "Analyze requirements and design architecture",
				},
				{
					type: "implementation",
					action: "implement",
					description: "Implement core functionality",
				},
				{ type: "testing", action: "test", description: "Write and run tests" },
				{
					type: "documentation",
					action: "document",
					description: "Generate documentation",
				},
			],
		});

		// Research preset
		this.presets.set("research", {
			description: "Optimized for research and information gathering tasks",
			category: "research",
			tags: ["research", "analysis", "investigation"],
			overrides: {
				suggestedAgents: 3,
				suggestedTopology: "mesh",
				suggestedStrategy: "adaptive",
				requiredResources: ["web_search", "analysis", "documentation"],
				estimatedDuration: "30 minutes",
			},
			steps: [
				{
					type: "search",
					action: "search",
					description: "Gather information from multiple sources",
				},
				{
					type: "analysis",
					action: "analyze",
					description: "Analyze and synthesize findings",
				},
				{
					type: "documentation",
					action: "document",
					description: "Create comprehensive report",
				},
			],
		});

		// Deployment preset
		this.presets.set("deployment", {
			description: "Safe and reliable deployment workflows",
			category: "deployment",
			tags: ["deployment", "production", "devops"],
			overrides: {
				suggestedAgents: 3,
				suggestedTopology: "ring",
				suggestedStrategy: "sequential",
				requiredResources: ["system_operations", "monitoring", "validation"],
				estimatedDuration: "25 minutes",
			},
			steps: [
				{
					type: "preparation",
					action: "prepare",
					description: "Prepare deployment environment",
				},
				{
					type: "deployment",
					action: "deploy",
					description: "Execute deployment safely",
				},
				{
					type: "validation",
					action: "validate",
					description: "Validate deployment success",
				},
				{
					type: "monitoring",
					action: "monitor",
					description: "Setup monitoring and alerts",
				},
			],
		});

		// Optimization preset
		this.presets.set("optimization", {
			description: "Performance optimization and debugging workflows",
			category: "optimization",
			tags: ["performance", "optimization", "debugging"],
			overrides: {
				suggestedAgents: 2,
				suggestedTopology: "mesh",
				suggestedStrategy: "adaptive",
				requiredResources: ["profiling", "analysis", "benchmarking"],
				estimatedDuration: "35 minutes",
			},
			steps: [
				{
					type: "profiling",
					action: "profile",
					description: "Profile current performance",
				},
				{
					type: "analysis",
					action: "analyze",
					description: "Identify bottlenecks and issues",
				},
				{
					type: "optimization",
					action: "optimize",
					description: "Apply targeted optimizations",
				},
				{
					type: "validation",
					action: "validate",
					description: "Validate performance improvements",
				},
			],
		});

		// Testing preset
		this.presets.set("testing", {
			description: "Comprehensive testing and quality assurance",
			category: "testing",
			tags: ["testing", "qa", "quality"],
			overrides: {
				suggestedAgents: 3,
				suggestedTopology: "hierarchical",
				suggestedStrategy: "parallel",
				requiredResources: ["test_execution", "validation", "reporting"],
				estimatedDuration: "20 minutes",
			},
			steps: [
				{
					type: "planning",
					action: "plan",
					description: "Plan comprehensive test strategy",
				},
				{
					type: "execution",
					action: "execute",
					description: "Execute all test suites",
				},
				{
					type: "analysis",
					action: "analyze",
					description: "Analyze test results",
				},
				{
					type: "reporting",
					action: "report",
					description: "Generate quality report",
				},
			],
		});

		// API Development preset
		this.presets.set("api", {
			description: "REST API development with authentication and testing",
			category: "development",
			tags: ["api", "rest", "backend", "authentication"],
			overrides: {
				suggestedAgents: 5,
				suggestedTopology: "hierarchical",
				suggestedStrategy: "parallel",
				requiredResources: [
					"code_generation",
					"testing",
					"validation",
					"documentation",
				],
				estimatedDuration: "60 minutes",
			},
			steps: [
				{
					type: "design",
					action: "design",
					description: "Design API architecture and endpoints",
				},
				{
					type: "authentication",
					action: "implement",
					description: "Implement authentication system",
				},
				{
					type: "endpoints",
					action: "build",
					description: "Build REST endpoints",
				},
				{ type: "testing", action: "test", description: "Write API tests" },
				{
					type: "documentation",
					action: "document",
					description: "Generate API documentation",
				},
			],
		});

		// Data Analysis preset
		this.presets.set("data-analysis", {
			description: "Data analysis and visualization workflows",
			category: "analysis",
			tags: ["data", "analysis", "visualization", "statistics"],
			overrides: {
				suggestedAgents: 4,
				suggestedTopology: "mesh",
				suggestedStrategy: "adaptive",
				requiredResources: ["analysis", "visualization", "documentation"],
				estimatedDuration: "40 minutes",
			},
			steps: [
				{
					type: "exploration",
					action: "explore",
					description: "Explore and understand the data",
				},
				{
					type: "cleaning",
					action: "clean",
					description: "Clean and prepare data",
				},
				{
					type: "analysis",
					action: "analyze",
					description: "Perform statistical analysis",
				},
				{
					type: "visualization",
					action: "visualize",
					description: "Create data visualizations",
				},
				{
					type: "insights",
					action: "extract",
					description: "Extract and document insights",
				},
			],
		});

		// Machine Learning preset
		this.presets.set("ml", {
			description: "Machine learning model development and training",
			category: "ai",
			tags: ["machine-learning", "ai", "modeling", "training"],
			overrides: {
				suggestedAgents: 5,
				suggestedTopology: "hierarchical",
				suggestedStrategy: "sequential",
				requiredResources: [
					"analysis",
					"modeling",
					"validation",
					"documentation",
				],
				estimatedDuration: "90 minutes",
			},
			steps: [
				{
					type: "data-prep",
					action: "prepare",
					description: "Prepare and preprocess data",
				},
				{
					type: "feature-engineering",
					action: "engineer",
					description: "Engineer and select features",
				},
				{
					type: "modeling",
					action: "train",
					description: "Train and tune models",
				},
				{
					type: "evaluation",
					action: "evaluate",
					description: "Evaluate model performance",
				},
				{
					type: "deployment",
					action: "deploy",
					description: "Prepare model for deployment",
				},
			],
		});
	}

	/**
	 * Convert preset definition to work preset
	 */
	private convertDefinitionToPreset(definition: PresetDefinition): WorkPreset {
		return {
			overrides: definition.overrides,
			steps: definition.steps,
		};
	}

	/**
	 * Get preset file paths
	 */
	private getPresetPaths(): string[] {
		const cwd = process.cwd();
		return [
			path.join(cwd, ".claude", "presets"),
			path.join(cwd, ".claude-flow", "presets"),
			path.join(cwd, "claude-flow-presets"),
		];
	}

	/**
	 * Load custom presets from file system
	 */
	private async loadCustomPresets(): Promise<void> {
		for (const presetPath of this.presetPaths) {
			try {
				const exists = await this.directoryExists(presetPath);
				if (exists) {
					await this.loadPresetsFromDirectory(presetPath);
				}
			} catch (error) {
				this.logger.warn(
					`Failed to load presets from ${presetPath}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	/**
	 * Load presets from a directory
	 */
	private async loadPresetsFromDirectory(directory: string): Promise<void> {
		try {
			const files = await fs.readdir(directory);
			const presetFiles = files.filter((file) => file.endsWith(".json"));

			for (const file of presetFiles) {
				const filePath = path.join(directory, file);
				const name = path.basename(file, ".json");

				try {
					const content = await fs.readFile(filePath, "utf-8");
					const customPreset: CustomPreset = JSON.parse(content);
					this.customPresets.set(name, customPreset);
				} catch (error) {
					this.logger.warn(
						`Failed to load preset ${file}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		} catch (error) {
			// Directory might not exist, which is fine
		}
	}

	/**
	 * Try to load a preset from file
	 */
	private async tryLoadPresetFromFile(
		name: string,
	): Promise<WorkPreset | null> {
		for (const presetPath of this.presetPaths) {
			const filePath = path.join(presetPath, `${name}.json`);
			try {
				const exists = await this.fileExists(filePath);
				if (exists) {
					const content = await fs.readFile(filePath, "utf-8");
					const customPreset: CustomPreset = JSON.parse(content);
					this.customPresets.set(name, customPreset);
					return customPreset.preset;
				}
			} catch (error) {
				// Continue to next path
			}
		}
		return null;
	}

	/**
	 * Save custom preset to file
	 */
	private async saveCustomPreset(
		name: string,
		preset: CustomPreset,
	): Promise<void> {
		const presetDir = this.presetPaths[0]; // Use first path for saving
		await fs.mkdir(presetDir, { recursive: true });

		const filePath = path.join(presetDir, `${name}.json`);
		const content = JSON.stringify(preset, null, 2);
		await fs.writeFile(filePath, content, "utf-8");
	}

	/**
	 * Delete custom preset file
	 */
	private async deleteCustomPresetFile(name: string): Promise<void> {
		for (const presetPath of this.presetPaths) {
			const filePath = path.join(presetPath, `${name}.json`);
			try {
				const exists = await this.fileExists(filePath);
				if (exists) {
					await fs.unlink(filePath);
					break;
				}
			} catch (error) {
				// Continue to next path
			}
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
	 * Check if directory exists
	 */
	private async directoryExists(dirPath: string): Promise<boolean> {
		try {
			const stat = await fs.stat(dirPath);
			return stat.isDirectory();
		} catch {
			return false;
		}
	}
}
