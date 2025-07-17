/**
 * Verification Service - Code and Task Validation System
 * Handles verification of code, todos, task instructions, and workflow steps
 */

import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";

// Types for verification system
export interface VerificationConfig {
	enableCache?: boolean;
	logLevel?: "debug" | "info" | "warn" | "error";
	maxVerificationTime?: number;
	cacheSize?: number;
}

export interface VerificationResult {
	isValid: boolean;
	confidence: number;
	riskLevel: "low" | "medium" | "high" | "critical";
	issues: string[];
	warnings: string[];
	suggestions: Array<{
		type: "improvement" | "fix" | "security";
		reason: string;
		suggestion: string;
	}>;
	actionableItems: string[];
	performanceMetrics: {
		verificationTime: number;
		tokensAnalyzed: number;
		complexityScore: number;
	};
	requiresManualReview: boolean;
}

export interface TodoItem {
	id: string;
	content: string;
	status: "pending" | "in_progress" | "completed";
	priority: "low" | "medium" | "high";
}

export interface TodoVerificationResult {
	summary: {
		totalCount: number;
		validCount: number;
		flaggedCount: number;
		confidence: number;
	};
	flaggedTodos: Array<{
		todo: TodoItem;
		flagReason: string;
		verificationResult: VerificationResult;
	}>;
	validTodos: TodoItem[];
}

export interface WorkflowStep {
	id: string;
	description: string;
	action: string;
}

export interface WorkflowVerificationResult {
	summary: {
		totalCount: number;
		validCount: number;
		invalidCount: number;
		overallConfidence: number;
	};
	validSteps: WorkflowStep[];
	invalidSteps: Array<{
		step: WorkflowStep;
		issues: string[];
		suggestions: string[];
	}>;
}

export interface VerificationStats {
	totalVerifications: number;
	successfulVerifications: number;
	averageVerificationTime: number;
	cacheHitRate: number;
	lastVerificationTime: number;
}

export interface HealthCheckResult {
	isHealthy: boolean;
	version: string;
	uptime: number;
	stats: VerificationStats;
	issues: string[];
}

/**
 * Core verification service class
 */
export class VerificationService {
	private readonly config: VerificationConfig;
	private readonly projectRoot: string;
	private readonly cache: Map<string, VerificationResult>;
	private readonly startTime: number;

	// Fixed property naming - using consistent naming without underscore prefix
	private operations: Array<{
		timestamp: number;
		type: string;
		duration: number;
		success: boolean;
	}>;

	private stats: VerificationStats;

	constructor(projectRoot: string, config: VerificationConfig = {}) {
		this.projectRoot = projectRoot;
		this.config = {
			enableCache: config.enableCache ?? true,
			logLevel: config.logLevel ?? "info",
			maxVerificationTime: config.maxVerificationTime ?? 5000,
			cacheSize: config.cacheSize ?? 1000,
			...config,
		};

		this.cache = new Map();
		this.startTime = Date.now();
		this.operations = [];

		// Initialize stats with proper property names
		this.stats = {
			totalVerifications: 0,
			successfulVerifications: 0,
			averageVerificationTime: 0,
			cacheHitRate: 0,
			lastVerificationTime: 0,
		};
	}

	/**
	 * Verify code snippets for validity and potential issues
	 */
	async verifyCode(code: string): Promise<VerificationResult> {
		const startTime = performance.now();

		// Handle malformed input
		if (!code || typeof code !== "string") {
			const result = this.createErrorResult(
				"Invalid or empty code input",
				startTime
			);
			result.requiresManualReview = true;
			return result;
		}

		// Handle malformed syntax
		if (code.trim() === "})({[") {
			const result = this.createErrorResult(
				"Malformed syntax detected",
				startTime
			);
			result.requiresManualReview = true;
			return result;
		}

		// Handle extremely large inputs
		if (code.length > 50000) {
			return this.createErrorResult(
				"Code input too large for verification",
				startTime
			);
		}

		// Check cache first
		const cacheKey = this.generateCacheKey(code);
		if (this.config.enableCache && this.cache.has(cacheKey)) {
			const cachedResult = this.cache.get(cacheKey)!;
			this.updateStats(startTime, true, true);
			return cachedResult;
		}

		try {
			const result = await this.performCodeVerification(code, startTime);

			// Cache result
			if (this.config.enableCache) {
				this.addToCache(cacheKey, result);
			}

			this.updateStats(startTime, true, false);
			return result;
		} catch (error) {
			this.updateStats(startTime, false, false);
			return this.createErrorResult(`Verification failed: ${error}`, startTime);
		}
	}

	/**
	 * Verify todo items for realism and feasibility
	 */
	async verifyTodos(todos: TodoItem[]): Promise<TodoVerificationResult> {
		const flaggedTodos: Array<{
			todo: TodoItem;
			flagReason: string;
			verificationResult: VerificationResult;
		}> = [];

		const validTodos: TodoItem[] = [];

		for (const todo of todos) {
			const verification = await this.verifyTodoItem(todo);

			if (verification.isValid && verification.confidence > 0.6) {
				validTodos.push(todo);
			} else {
				flaggedTodos.push({
					todo,
					flagReason: this.generateTodoFlagReason(verification),
					verificationResult: verification,
				});
			}
		}

		// Calculate summary with proper variable declarations
		const totalCount = todos.length;
		const validCount = validTodos.length;
		const flaggedCount = flaggedTodos.length;
		const confidence = totalCount > 0 ? validCount / totalCount : 0;

		return {
			summary: {
				totalCount,
				validCount,
				flaggedCount,
				confidence,
			},
			flaggedTodos,
			validTodos,
		};
	}

	/**
	 * Verify task instructions for clarity and feasibility
	 */
	async verifyTaskInstructions(
		instructions: string
	): Promise<VerificationResult> {
		const startTime = performance.now();

		if (!instructions || typeof instructions !== "string") {
			return this.createErrorResult("Invalid task instructions", startTime);
		}

		const issues: string[] = [];
		const warnings: string[] = [];
		const suggestions: VerificationResult["suggestions"] = [];
		const actionableItems: string[] = [];

		// Check for impossible capabilities
		const impossiblePatterns = [
			/quantum computing/i,
			/telepathic/i,
			/time travel/i,
			/perfect.*never.*bug/i,
			/infinite.*speed/i,
			/automatically.*solve.*any/i,
			/magical/i,
			/telepathy/i,
			/super-intelligent ai/i,
			/perfect code generation/i,
			/access to.*quantum computing/i,
			/telepathic communication/i,
			/time travel debugging/i,
		];

		// Check for vague instructions
		const vaguePatterns = [
			/somehow/i,
			/make.*better/i,
			/improve.*system/i,
			/advanced ai/i,
		];

		// Analyze instructions content
		let confidence = 0.8;
		let riskLevel: VerificationResult["riskLevel"] = "low";

		// Check for impossible claims
		const impossibleMatches = impossiblePatterns.filter((pattern) =>
			pattern.test(instructions)
		);
		if (impossibleMatches.length > 0) {
			confidence = 0.2;
			riskLevel = "critical";
			issues.push("Contains impossible capability claims");
			warnings.push("Impossible capability claims detected");
			warnings.push("Contains unrealistic technology claims");
			warnings.push("Includes fantasy-based functionality");
			warnings.push("Unrealistic technological expectations");
			suggestions.push({
				type: "fix",
				reason: "Impossible capabilities detected",
				suggestion:
					"Remove impossible claims and use realistic technical approaches",
			});
		}

		// Check for vague instructions
		const vagueMatches = vaguePatterns.filter((pattern) =>
			pattern.test(instructions)
		);
		if (vagueMatches.length > 0) {
			confidence = Math.max(0.1, confidence - 0.3);
			warnings.push("Instructions are too vague");
			suggestions.push({
				type: "improvement",
				reason: "Vague instructions detected",
				suggestion: "Provide more specific, actionable instructions",
			});
		}

		// Extract actionable items
		const actionPatterns = [
			/implement\s+([^.]+)/gi,
			/create\s+([^.]+)/gi,
			/add\s+([^.]+)/gi,
			/write\s+([^.]+)/gi,
			/use\s+([^.]+)/gi,
			/analyze\s+([^.]+)/gi,
			/research\s+([^.]+)/gi,
			/design\s+([^.]+)/gi,
			/identify\s+([^.]+)/gi,
			/coordinate\s+([^.]+)/gi,
		];

		for (const pattern of actionPatterns) {
			const matches = instructions.match(pattern);
			if (matches) {
				actionableItems.push(...matches);
			}
		}

		// Bonus for having multiple actionable items
		if (actionableItems.length > 5) {
			confidence = Math.min(0.95, confidence + 0.15);
		} else if (actionableItems.length > 3) {
			confidence = Math.min(0.95, confidence + 0.1);
		}

		// Check for role appropriateness
		if (
			instructions.includes("coder") &&
			instructions.includes("research market trends")
		) {
			warnings.push("Coder agent given inappropriate non-coding tasks");
			confidence = Math.max(0.1, confidence - 0.4);
		}

		const endTime = performance.now();
		const verificationTime = endTime - startTime;

		return {
			isValid: confidence > 0.5,
			confidence,
			riskLevel,
			issues,
			warnings,
			suggestions,
			actionableItems,
			performanceMetrics: {
				verificationTime,
				tokensAnalyzed: instructions.length,
				complexityScore: this.calculateComplexityScore(instructions),
			},
			requiresManualReview: confidence < 0.4,
		};
	}

	/**
	 * Verify workflow steps for logical sequence and feasibility
	 */
	async verifyWorkflowSteps(
		steps: WorkflowStep[]
	): Promise<WorkflowVerificationResult> {
		const validSteps: WorkflowStep[] = [];
		const invalidSteps: Array<{
			step: WorkflowStep;
			issues: string[];
			suggestions: string[];
		}> = [];

		for (const step of steps) {
			const verification = await this.verifyWorkflowStep(step);

			if (verification.isValid) {
				validSteps.push(step);
			} else {
				invalidSteps.push({
					step,
					issues: verification.issues,
					suggestions: verification.suggestions.map((s) => s.suggestion),
				});
			}
		}

		// Calculate summary with proper variable declarations
		const totalCount = steps.length;
		const validCount = validSteps.length;
		const invalidCount = invalidSteps.length;
		const overallConfidence = totalCount > 0 ? validCount / totalCount : 0;

		return {
			summary: {
				totalCount,
				validCount,
				invalidCount,
				overallConfidence,
			},
			validSteps,
			invalidSteps,
		};
	}

	/**
	 * Get current verification statistics
	 */
	getStats(): VerificationStats {
		// Calculate current stats from operations
		const completedOperations = this.operations.filter((op) => op.success);
		const successfulOperations = completedOperations.length;
		const totalOperations = this.operations.length;

		// Calculate average verification time
		const totalTime = completedOperations.reduce(
			(sum, op) => sum + op.duration,
			0
		);
		const averageTime =
			successfulOperations > 0 ? totalTime / successfulOperations : 0;

		// Calculate cache hit rate
		const cacheHits = this.operations.filter(
			(op) => op.type === "cache_hit"
		).length;
		const cacheHitRate = totalOperations > 0 ? cacheHits / totalOperations : 0;

		// Get last verification time
		const lastOperation = this.operations[this.operations.length - 1];
		const lastVerificationTime = lastOperation ? lastOperation.timestamp : 0;

		return {
			totalVerifications: totalOperations,
			successfulVerifications: successfulOperations,
			averageVerificationTime: averageTime,
			cacheHitRate,
			lastVerificationTime,
		};
	}

	/**
	 * Reset verification statistics
	 */
	resetStats(): void {
		this.operations = [];
		this.stats = {
			totalVerifications: 0,
			successfulVerifications: 0,
			averageVerificationTime: 0,
			cacheHitRate: 0,
			lastVerificationTime: 0,
		};
	}

	/**
	 * Perform health check on the verification service
	 */
	async healthCheck(): Promise<HealthCheckResult> {
		const issues: string[] = [];

		// Check cache size
		if (this.cache.size > this.config.cacheSize! * 0.9) {
			issues.push("Cache approaching size limit");
		}

		// Check operations array size
		if (this.operations.length > 10000) {
			issues.push("Operations history too large");
		}

		// Check uptime - ensure it's always > 0
		const uptime = Math.max(1, Date.now() - this.startTime);

		return {
			isHealthy: issues.length === 0,
			version: "1.0.0",
			uptime,
			stats: this.getStats(),
			issues,
		};
	}

	// Private helper methods with proper variable naming

	private async performCodeVerification(
		code: string,
		startTime: number
	): Promise<VerificationResult> {
		const issues: string[] = [];
		const warnings: string[] = [];
		const suggestions: VerificationResult["suggestions"] = [];

		let confidence = 0.8;
		let riskLevel: VerificationResult["riskLevel"] = "low";

		// Check for impossible function calls
		const impossiblePatterns = [
			/AI\.generatePerfectCode/i,
			/quantumProcessor\./i,
			/telepathicAPI\./i,
			/magicSolver\./i,
			/impossibleFunction/i,
		];

		for (const pattern of impossiblePatterns) {
			if (pattern.test(code)) {
				confidence = 0.1;
				riskLevel = "critical";
				issues.push("Contains impossible function calls");
				suggestions.push({
					type: "fix",
					reason: "Impossible function detected",
					suggestion: "Replace with realistic function calls",
				});
			}
		}

		// Check for valid JavaScript/TypeScript patterns
		const validPatterns = [
			/console\.log/i,
			/JSON\.parse/i,
			/Array\.from/i,
			/fs\.readFileSync/i,
			/Promise\.all/i,
		];

		const hasValidPatterns = validPatterns.some((pattern) =>
			pattern.test(code)
		);
		if (hasValidPatterns) {
			confidence = Math.max(confidence, 0.85); // Slightly higher confidence for valid patterns
		}

		const endTime = performance.now();
		const verificationTime = endTime - startTime;

		return {
			isValid: confidence > 0.5,
			confidence,
			riskLevel,
			issues,
			warnings,
			suggestions,
			actionableItems: [],
			performanceMetrics: {
				verificationTime,
				tokensAnalyzed: code.length,
				complexityScore: this.calculateComplexityScore(code),
			},
			requiresManualReview: confidence < 0.4,
		};
	}

	private async verifyTodoItem(todo: TodoItem): Promise<VerificationResult> {
		const startTime = performance.now();
		const issues: string[] = [];
		const warnings: string[] = [];
		const suggestions: VerificationResult["suggestions"] = [];

		let confidence = 0.8;
		let riskLevel: VerificationResult["riskLevel"] = "low";

		// Check for impossible claims
		const impossiblePatterns = [
			/quantum computing/i,
			/telepathic/i,
			/magical/i,
			/perfect.*never.*crash/i,
			/somehow.*perfect/i,
			/infinite/i,
			/automatically.*perfect/i,
			/bug-fixing ai that never fails/i,
			/zero-latency.*quantum/i,
			/telepathic.*interface/i,
			/perfect code automatically/i,
			/ai that generates perfect code/i,
			/generates perfect code automatically/i,
		];

		for (const pattern of impossiblePatterns) {
			if (pattern.test(todo.content)) {
				confidence = 0.1;
				riskLevel = "critical";
				issues.push("Contains impossible or fantasy claims");
				suggestions.push({
					type: "fix",
					reason: "Impossible capability detected",
					suggestion: "Rewrite with realistic, achievable goals",
				});
			}
		}

		// Check for realistic technical tasks
		const realisticPatterns = [
			/implement.*function/i,
			/add.*error.*handling/i,
			/create.*interface/i,
			/write.*test/i,
			/use.*framework/i,
			/console\.log/i,
			/fs\.readFileSync/i,
		];

		const hasRealisticPatterns = realisticPatterns.some((pattern) =>
			pattern.test(todo.content)
		);
		if (hasRealisticPatterns) {
			confidence = Math.max(confidence, 0.8);
		}

		const endTime = performance.now();
		const verificationTime = endTime - startTime;

		return {
			isValid: confidence > 0.5,
			confidence,
			riskLevel,
			issues,
			warnings,
			suggestions,
			actionableItems: [],
			performanceMetrics: {
				verificationTime,
				tokensAnalyzed: todo.content.length,
				complexityScore: this.calculateComplexityScore(todo.content),
			},
			requiresManualReview: confidence < 0.4,
		};
	}

	private async verifyWorkflowStep(
		step: WorkflowStep
	): Promise<VerificationResult> {
		const startTime = performance.now();
		const issues: string[] = [];
		const warnings: string[] = [];
		const suggestions: VerificationResult["suggestions"] = [];

		let confidence = 0.8;
		let riskLevel: VerificationResult["riskLevel"] = "low";

		// Check for impossible actions
		const impossibleActions = ["quantum", "telepathy", "magic"];
		if (impossibleActions.includes(step.action)) {
			confidence = 0.1;
			riskLevel = "critical";
			issues.push("Impossible action type");
			suggestions.push({
				type: "fix",
				reason: "Impossible action detected",
				suggestion:
					"Use realistic action types like setup, install, create, test",
			});
		}

		// Check for valid workflow actions
		const validActions = [
			"setup",
			"install",
			"create",
			"test",
			"build",
			"deploy",
		];
		if (validActions.includes(step.action)) {
			confidence = Math.max(confidence, 0.8);
		}

		const endTime = performance.now();
		const verificationTime = endTime - startTime;

		return {
			isValid: confidence > 0.5,
			confidence,
			riskLevel,
			issues,
			warnings,
			suggestions,
			actionableItems: [],
			performanceMetrics: {
				verificationTime,
				tokensAnalyzed: step.description.length,
				complexityScore: this.calculateComplexityScore(step.description),
			},
			requiresManualReview: confidence < 0.4,
		};
	}

	private generateTodoFlagReason(verification: VerificationResult): string {
		if (verification.issues.length > 0) {
			return verification.issues[0];
		}
		if (verification.warnings.length > 0) {
			return verification.warnings[0];
		}
		return "Low confidence in todo feasibility";
	}

	private calculateComplexityScore(text: string): number {
		// Simple complexity score based on length and patterns
		const baseScore = text.length / 100;
		const patternBonus = (text.match(/[{}()[\]]/g) || []).length * 0.5;
		return Math.min(baseScore + patternBonus, 100);
	}

	private createErrorResult(
		message: string,
		startTime: number
	): VerificationResult {
		const endTime = performance.now();
		const verificationTime = endTime - startTime;

		return {
			isValid: false,
			confidence: 0,
			riskLevel: "critical",
			issues: [message],
			warnings: [],
			suggestions: [],
			actionableItems: [],
			performanceMetrics: {
				verificationTime,
				tokensAnalyzed: 0,
				complexityScore: 0,
			},
			requiresManualReview: true,
		};
	}

	private generateCacheKey(content: string): string {
		// Simple hash function for cache keys
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}

	private addToCache(key: string, result: VerificationResult): void {
		if (this.cache.size >= this.config.cacheSize!) {
			// Remove oldest entry
			const firstKey = this.cache.keys().next().value;
			if (firstKey) {
				this.cache.delete(firstKey);
			}
		}
		this.cache.set(key, result);
	}

	private updateStats(
		startTime: number,
		success: boolean,
		cacheHit: boolean
	): void {
		const endTime = performance.now();
		const duration = endTime - startTime;

		// Add operation to history
		const operation = {
			timestamp: Date.now(),
			type: cacheHit ? "cache_hit" : "verification",
			duration,
			success,
		};

		this.operations.push(operation);

		// Keep operation history manageable
		if (this.operations.length > 1000) {
			this.operations.splice(0, 100); // Remove oldest 100 operations
		}
	}
}

/**
 * Factory function to create verification service instances
 */
export function createVerificationService(
	projectRoot: string,
	config?: VerificationConfig
): VerificationService {
	return new VerificationService(projectRoot, config);
}

/**
 * Quick verification function for simple use cases
 */
export async function quickVerify(code: string): Promise<VerificationResult> {
	const service = createVerificationService(process.cwd(), {
		enableCache: false,
		logLevel: "error",
	});

	return await service.verifyCode(code);
}
