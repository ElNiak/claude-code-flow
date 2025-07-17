import * as fs from "fs/promises";
import * as path from "path";
import { Logger } from "../../core/logger.js";
import type {
	AgentTopology,
	ExecutionStrategy,
	TaskAnalysis,
	TaskComplexity,
	TaskInput,
} from "./types.js";

/**
 * Intelligent task analyzer that determines optimal coordination approach
 * Analyzes task context, complexity, and requirements to suggest best execution strategy
 */
export class TaskAnalyzer {
	private logger: Logger;
	private taskPatterns: Map<string, TaskPattern>;
	private complexityRules: ComplexityRule[];

	constructor() {
		this.logger = new Logger({
			level: "info",
			format: "text",
			destination: "console",
		});
		this.taskPatterns = this.initializeTaskPatterns();
		this.complexityRules = this.initializeComplexityRules();
	}

	/**
	 * Analyze a task and determine optimal execution approach
	 */
	async analyze(input: TaskInput): Promise<TaskAnalysis> {
		this.logger.info("🧠 Starting intelligent task analysis...");

		// Extract and normalize task information
		const normalizedTask = this.normalizeTask(input.task);
		const keywords = this.extractKeywords(normalizedTask);
		const context = await this.analyzeContext(input.context);

		// Determine task type based on patterns and keywords
		const taskType = this.determineTaskType(normalizedTask, keywords, context);

		// Analyze complexity
		const complexity = this.analyzeComplexity(
			normalizedTask,
			keywords,
			context,
			input.params
		);

		// Suggest optimal configuration
		const suggestions = this.generateSuggestions(taskType, complexity, context);

		const analysis: TaskAnalysis = {
			task: input.task,
			taskType,
			complexity,
			keywords,
			context,
			suggestedAgents: suggestions.agents,
			suggestedTopology: suggestions.topology,
			suggestedStrategy: suggestions.strategy,
			estimatedDuration: suggestions.duration,
			requiredResources: suggestions.resources,
			confidence: suggestions.confidence,
			recommendations: suggestions.recommendations,
		};

		this.logger.info(
			`✅ Task analysis complete (confidence: ${suggestions.confidence}%)`
		);
		return analysis;
	}

	/**
	 * Normalize task string for better analysis
	 */
	private normalizeTask(task: string): string {
		return task
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	/**
	 * Extract meaningful keywords from task description
	 */
	private extractKeywords(normalizedTask: string): string[] {
		const commonWords = new Set([
			"a",
			"an",
			"and",
			"are",
			"as",
			"at",
			"be",
			"by",
			"for",
			"from",
			"has",
			"he",
			"in",
			"is",
			"it",
			"its",
			"of",
			"on",
			"that",
			"the",
			"to",
			"was",
			"were",
			"will",
			"with",
			"the",
			"this",
			"that",
		]);

		return normalizedTask
			.split(" ")
			.filter((word) => word.length > 2 && !commonWords.has(word))
			.slice(0, 20); // Limit to most relevant keywords
	}

	/**
	 * Analyze task context (working directory, environment, etc.)
	 */
	private async analyzeContext(context: any): Promise<any> {
		const analysis = {
			projectType: "unknown",
			hasTests: false,
			hasDocumentation: false,
			language: "unknown",
			framework: "unknown",
			buildSystem: "unknown",
			isGitRepo: false,
			fileCount: 0,
			complexity: "unknown",
		};

		try {
			const workingDir = context.workingDirectory || process.cwd();

			// Check for common project files
			const projectFiles = await this.scanProjectFiles(workingDir);

			// Determine project type and characteristics
			analysis.projectType = this.determineProjectType(projectFiles);
			analysis.language = this.detectLanguage(projectFiles);
			analysis.framework = this.detectFramework(projectFiles);
			analysis.buildSystem = this.detectBuildSystem(projectFiles);
			analysis.hasTests = this.hasTestFiles(projectFiles);
			analysis.hasDocumentation = this.hasDocumentationFiles(projectFiles);
			analysis.isGitRepo = projectFiles.includes(".git");
			analysis.fileCount = projectFiles.length;
		} catch (error) {
			this.logger.warn(
				`Context analysis warning: ${error instanceof Error ? error.message : String(error)}`
			);
		}

		return analysis;
	}

	/**
	 * Scan project directory for relevant files
	 */
	private async scanProjectFiles(directory: string): Promise<string[]> {
		try {
			const files = await fs.readdir(directory, { withFileTypes: true });
			const projectFiles = [];

			for (const file of files) {
				if (file.isDirectory()) {
					// Check common directories
					if (
						[
							"src",
							"lib",
							"tests",
							"test",
							"docs",
							".git",
							"node_modules",
						].includes(file.name)
					) {
						projectFiles.push(file.name);
					}
				} else {
					// Check for important files
					projectFiles.push(file.name);
				}
			}

			return projectFiles;
		} catch (error) {
			return [];
		}
	}

	/**
	 * Determine task type based on keywords and patterns
	 */
	private determineTaskType(
		normalizedTask: string,
		keywords: string[],
		context: any
	): string {
		// Check against known patterns
		for (const [type, pattern] of Array.from(this.taskPatterns.entries())) {
			if (pattern.matcher(normalizedTask, keywords, context)) {
				return type;
			}
		}

		// Fallback keyword-based detection
		if (
			keywords.some((k) =>
				["build", "create", "implement", "develop", "code"].includes(k)
			)
		) {
			return "development";
		}
		if (
			keywords.some((k) =>
				["research", "analyze", "study", "investigate"].includes(k)
			)
		) {
			return "research";
		}
		if (
			keywords.some((k) => ["deploy", "release", "publish", "ship"].includes(k))
		) {
			return "deployment";
		}
		if (
			keywords.some((k) => ["optimize", "improve", "fix", "debug"].includes(k))
		) {
			return "optimization";
		}
		if (
			keywords.some((k) => ["test", "validate", "verify", "check"].includes(k))
		) {
			return "testing";
		}

		return "general";
	}

	/**
	 * Analyze task complexity
	 */
	private analyzeComplexity(
		normalizedTask: string,
		keywords: string[],
		context: any,
		params: string[]
	): TaskComplexity {
		let complexityScore = 0;

		// Apply complexity rules
		for (const rule of this.complexityRules) {
			if (rule.condition(normalizedTask, keywords, context, params)) {
				complexityScore += rule.weight;
			}
		}

		// Determine complexity level
		if (complexityScore <= 10) return "low";
		if (complexityScore <= 25) return "medium";
		if (complexityScore <= 40) return "high";
		return "very_high";
	}

	/**
	 * Generate optimal suggestions based on analysis
	 */
	private generateSuggestions(
		taskType: string,
		complexity: TaskComplexity,
		context: any
	): {
		agents: number;
		topology: AgentTopology;
		strategy: ExecutionStrategy;
		duration: string;
		resources: string[];
		confidence: number;
		recommendations: string[];
	} {
		const baseConfig = this.getBaseConfiguration(taskType);
		const complexityMultiplier = this.getComplexityMultiplier(complexity);

		const agents = Math.min(
			Math.max(baseConfig.agents * complexityMultiplier, 2),
			12
		);
		const topology = this.selectOptimalTopology(taskType, complexity, agents);
		const strategy = this.selectOptimalStrategy(taskType, complexity);

		return {
			agents: Math.round(agents),
			topology,
			strategy,
			duration: this.estimateDuration(taskType, complexity),
			resources: this.identifyRequiredResources(taskType, context),
			confidence: this.calculateConfidence(taskType, complexity, context),
			recommendations: this.generateRecommendations(
				taskType,
				complexity,
				context
			),
		};
	}

	/**
	 * Get base configuration for task type
	 */
	private getBaseConfiguration(taskType: string): {
		agents: number;
		topology: AgentTopology;
		strategy: ExecutionStrategy;
	} {
		const configs = {
			development: {
				agents: 4,
				topology: "hierarchical" as AgentTopology,
				strategy: "parallel" as ExecutionStrategy,
			},
			research: {
				agents: 3,
				topology: "mesh" as AgentTopology,
				strategy: "adaptive" as ExecutionStrategy,
			},
			deployment: {
				agents: 3,
				topology: "sequential" as AgentTopology,
				strategy: "sequential" as ExecutionStrategy,
			},
			optimization: {
				agents: 2,
				topology: "mesh" as AgentTopology,
				strategy: "adaptive" as ExecutionStrategy,
			},
			testing: {
				agents: 3,
				topology: "parallel" as AgentTopology,
				strategy: "parallel" as ExecutionStrategy,
			},
			general: {
				agents: 3,
				topology: "mesh" as AgentTopology,
				strategy: "adaptive" as ExecutionStrategy,
			},
		};

		return configs[taskType as keyof typeof configs] || configs.general;
	}

	/**
	 * Get complexity multiplier for agent count
	 */
	private getComplexityMultiplier(complexity: TaskComplexity): number {
		const multipliers = {
			low: 0.8,
			medium: 1.0,
			high: 1.5,
			very_high: 2.0,
		};
		return multipliers[complexity];
	}

	/**
	 * Select optimal topology based on task characteristics
	 */
	private selectOptimalTopology(
		taskType: string,
		complexity: TaskComplexity,
		agents: number
	): AgentTopology {
		// For simple tasks or few agents, use mesh
		if (complexity === "low" || agents <= 3) {
			return "mesh";
		}

		// For complex development tasks, use hierarchical
		if (taskType === "development" && complexity === "high") {
			return "hierarchical";
		}

		// For sequential processes like deployment
		if (taskType === "deployment") {
			return "ring";
		}

		// For research and exploration
		if (taskType === "research") {
			return "mesh";
		}

		// Default to mesh for most cases
		return "mesh";
	}

	/**
	 * Select optimal execution strategy
	 */
	private selectOptimalStrategy(
		taskType: string,
		complexity: TaskComplexity
	): ExecutionStrategy {
		// Sequential for deployment and critical operations
		if (taskType === "deployment" || taskType === "optimization") {
			return "sequential";
		}

		// Parallel for development and testing
		if (taskType === "development" || taskType === "testing") {
			return "parallel";
		}

		// Adaptive for research and complex tasks
		return "adaptive";
	}

	/**
	 * Estimate task duration
	 */
	private estimateDuration(
		taskType: string,
		complexity: TaskComplexity
	): string {
		const baseDurations: Record<string, Record<TaskComplexity, number>> = {
			development: { low: 15, medium: 45, high: 120, very_high: 300 },
			research: { low: 10, medium: 30, high: 90, very_high: 180 },
			deployment: { low: 5, medium: 15, high: 45, very_high: 120 },
			optimization: { low: 10, medium: 30, high: 75, very_high: 180 },
			testing: { low: 5, medium: 15, high: 30, very_high: 60 },
			general: { low: 10, medium: 25, high: 60, very_high: 150 },
		};

		const taskDurations = baseDurations[taskType] || baseDurations.general;
		const minutes = taskDurations[complexity];

		if (minutes < 60) {
			return `${minutes} minutes`;
		} else {
			const hours = Math.round((minutes / 60) * 10) / 10;
			return `${hours} hours`;
		}
	}

	/**
	 * Identify required resources based on task type and context
	 */
	private identifyRequiredResources(taskType: string, context: any): string[] {
		const resources = new Set<string>();

		// Base resources for all tasks
		resources.add("coordination");
		resources.add("memory");

		// Task-specific resources
		switch (taskType) {
			case "development":
				resources.add("code_generation");
				resources.add("testing");
				resources.add("file_operations");
				if (context.hasTests) resources.add("test_execution");
				break;

			case "research":
				resources.add("web_search");
				resources.add("analysis");
				resources.add("documentation");
				break;

			case "deployment":
				resources.add("system_operations");
				resources.add("monitoring");
				resources.add("validation");
				break;

			case "optimization":
				resources.add("profiling");
				resources.add("analysis");
				resources.add("benchmarking");
				break;

			case "testing":
				resources.add("test_execution");
				resources.add("validation");
				resources.add("reporting");
				break;
		}

		// Context-based resources
		if (context.isGitRepo) {
			resources.add("git_operations");
		}
		if (context.projectType !== "unknown") {
			resources.add("project_management");
		}

		return Array.from(resources);
	}

	/**
	 * Calculate confidence in analysis
	 */
	private calculateConfidence(
		taskType: string,
		complexity: TaskComplexity,
		context: any
	): number {
		let confidence = 70; // Base confidence

		// Higher confidence for well-understood task types
		if (["development", "research", "deployment"].includes(taskType)) {
			confidence += 15;
		}

		// Higher confidence with good context
		if (context.projectType !== "unknown") {
			confidence += 10;
		}
		if (context.language !== "unknown") {
			confidence += 5;
		}

		// Lower confidence for very complex tasks
		if (complexity === "very_high") {
			confidence -= 15;
		}

		return Math.min(Math.max(confidence, 50), 95);
	}

	/**
	 * Generate actionable recommendations
	 */
	private generateRecommendations(
		taskType: string,
		complexity: TaskComplexity,
		context: any
	): string[] {
		const recommendations = [];

		if (complexity === "very_high") {
			recommendations.push("Consider breaking this task into smaller subtasks");
		}

		if (taskType === "development" && !context.hasTests) {
			recommendations.push("Consider adding tests to ensure quality");
		}

		if (taskType === "deployment" && !context.isGitRepo) {
			recommendations.push("Initialize git repository for version control");
		}

		if (context.fileCount > 100) {
			recommendations.push(
				"Large project detected - consider using hierarchical topology"
			);
		}

		return recommendations;
	}

	/**
	 * Initialize task patterns for recognition
	 */
	private initializeTaskPatterns(): Map<string, TaskPattern> {
		const patterns = new Map<string, TaskPattern>();

		patterns.set("development", {
			keywords: [
				"build",
				"create",
				"implement",
				"develop",
				"code",
				"api",
				"app",
				"system",
				"feature",
			],
			matcher: (task, keywords, context) => {
				return (
					keywords.some((k) =>
						["build", "create", "implement", "develop", "code"].includes(k)
					) ||
					task.includes("api") ||
					task.includes("app") ||
					task.includes("system")
				);
			},
		});

		patterns.set("research", {
			keywords: [
				"research",
				"analyze",
				"study",
				"investigate",
				"explore",
				"find",
				"discover",
			],
			matcher: (task, keywords, context) => {
				return keywords.some((k) =>
					["research", "analyze", "study", "investigate"].includes(k)
				);
			},
		});

		patterns.set("deployment", {
			keywords: [
				"deploy",
				"release",
				"publish",
				"ship",
				"production",
				"server",
				"host",
			],
			matcher: (task, keywords, context) => {
				return keywords.some((k) =>
					["deploy", "release", "publish", "ship"].includes(k)
				);
			},
		});

		patterns.set("optimization", {
			keywords: [
				"optimize",
				"improve",
				"fix",
				"debug",
				"performance",
				"speed",
				"memory",
			],
			matcher: (task, keywords, context) => {
				return keywords.some((k) =>
					["optimize", "improve", "fix", "debug", "performance"].includes(k)
				);
			},
		});

		patterns.set("testing", {
			keywords: ["test", "validate", "verify", "check", "qa", "quality"],
			matcher: (task, keywords, context) => {
				return keywords.some((k) =>
					["test", "validate", "verify", "check"].includes(k)
				);
			},
		});

		return patterns;
	}

	/**
	 * Initialize complexity analysis rules
	 */
	private initializeComplexityRules(): ComplexityRule[] {
		return [
			{
				name: "multiple_components",
				condition: (task, keywords, context, params) => {
					return keywords.some((k) =>
						["multiple", "several", "many", "complex"].includes(k)
					);
				},
				weight: 8,
			},
			{
				name: "large_project",
				condition: (task, keywords, context, params) => {
					return context.fileCount > 50;
				},
				weight: 6,
			},
			{
				name: "multiple_technologies",
				condition: (task, keywords, context, params) => {
					const techKeywords = keywords.filter((k) =>
						[
							"api",
							"database",
							"frontend",
							"backend",
							"auth",
							"deployment",
						].includes(k)
					);
					return techKeywords.length > 2;
				},
				weight: 5,
			},
			{
				name: "integration_required",
				condition: (task, keywords, context, params) => {
					return keywords.some((k) =>
						["integrate", "connect", "sync", "api"].includes(k)
					);
				},
				weight: 4,
			},
			{
				name: "performance_critical",
				condition: (task, keywords, context, params) => {
					return keywords.some((k) =>
						["performance", "speed", "optimize", "scale"].includes(k)
					);
				},
				weight: 6,
			},
			{
				name: "security_required",
				condition: (task, keywords, context, params) => {
					return keywords.some((k) =>
						["auth", "security", "login", "permission"].includes(k)
					);
				},
				weight: 5,
			},
			{
				name: "many_parameters",
				condition: (task, keywords, context, params) => {
					return params.length > 3;
				},
				weight: 3,
			},
		];
	}

	/**
	 * Utility methods for context analysis
	 */
	private determineProjectType(files: string[]): string {
		if (files.includes("package.json")) return "node";
		if (files.includes("requirements.txt") || files.includes("pyproject.toml"))
			return "python";
		if (files.includes("Cargo.toml")) return "rust";
		if (files.includes("go.mod")) return "go";
		if (files.includes("pom.xml") || files.includes("build.gradle"))
			return "java";
		if (files.includes("composer.json")) return "php";
		return "unknown";
	}

	private detectLanguage(files: string[]): string {
		const extensions = files.map((f) => path.extname(f)).filter((ext) => ext);

		if (extensions.some((ext) => [".js", ".ts", ".jsx", ".tsx"].includes(ext)))
			return "javascript/typescript";
		if (extensions.some((ext) => [".py"].includes(ext))) return "python";
		if (extensions.some((ext) => [".rs"].includes(ext))) return "rust";
		if (extensions.some((ext) => [".go"].includes(ext))) return "go";
		if (extensions.some((ext) => [".java", ".kt"].includes(ext)))
			return "java/kotlin";
		if (extensions.some((ext) => [".php"].includes(ext))) return "php";

		return "unknown";
	}

	private detectFramework(files: string[]): string {
		if (files.includes("next.config.js")) return "next.js";
		if (files.includes("nuxt.config.js")) return "nuxt.js";
		if (files.includes("angular.json")) return "angular";
		if (files.includes("vue.config.js")) return "vue";
		if (files.includes("svelte.config.js")) return "svelte";
		if (files.includes("gatsby-config.js")) return "gatsby";

		return "unknown";
	}

	private detectBuildSystem(files: string[]): string {
		if (files.includes("webpack.config.js")) return "webpack";
		if (files.includes("vite.config.js")) return "vite";
		if (files.includes("rollup.config.js")) return "rollup";
		if (files.includes("Makefile")) return "make";
		if (files.includes("Dockerfile")) return "docker";

		return "unknown";
	}

	private hasTestFiles(files: string[]): boolean {
		return files.some(
			(f) =>
				f.includes("test") ||
				f.includes("spec") ||
				[".test.js", ".test.ts", ".spec.js", ".spec.ts"].some((ext) =>
					f.endsWith(ext)
				)
		);
	}

	private hasDocumentationFiles(files: string[]): boolean {
		return files.some(
			(f) =>
				["README.md", "DOCUMENTATION.md", "docs", "documentation"].includes(
					f
				) || f.toLowerCase().includes("readme")
		);
	}
}

// Types for internal use
interface TaskPattern {
	keywords: string[];
	matcher: (task: string, keywords: string[], context: any) => boolean;
}

interface ComplexityRule {
	name: string;
	condition: (
		task: string,
		keywords: string[],
		context: any,
		params: string[]
	) => boolean;
	weight: number;
}
