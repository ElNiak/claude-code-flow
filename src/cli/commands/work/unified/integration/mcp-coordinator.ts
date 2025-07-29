/**
 * MCP Coordinator - Intelligent tool selection and routing across MCP systems
 * Manages 87 tools across claude-flow, swarm, and ruv-swarm categories
 */

import { MCPServer } from "../../../mcp/core/server.js";
import { LoadBalancer } from "../../../mcp/infrastructure/load-balancer.js";
import { ToolRegistry } from "../../../mcp/tools/tools.js";
import { MCPError } from "../../shared/errors/errors.js";
import type {
	IEventBus,
	ILogger,
	MCPCapabilities,
	MCPContext,
	MCPSession,
	MCPTool,
} from "../../shared/types/utils-types.js";

export interface MCPCoordinatorConfig {
	primaryServer: {
		transport: "stdio" | "http" | "websocket";
		host?: string;
		port?: number;
		maxSessions: number;
	};
	loadBalancing: {
		enabled: boolean;
		strategy:
			| "round-robin"
			| "least-connections"
			| "capability-based"
			| "performance-based";
		healthCheckInterval: number;
		circuitBreakerThreshold: number;
	};
	toolSelection: {
		enableIntelligentRouting: boolean;
		preferenceOrder: string[]; // ['claude-flow', 'swarm', 'ruv-swarm']
		fallbackStrategy: "cascade" | "parallel" | "best-effort";
		performanceTracking: boolean;
	};
	categories: {
		"claude-flow": string[];
		swarm: string[];
		"ruv-swarm": string[];
	};
}

export interface ToolSelectionContext {
	taskType: "coordination" | "memory" | "monitoring" | "analysis" | "execution";
	complexity: "low" | "medium" | "high";
	priority: "low" | "normal" | "high" | "critical";
	agentId?: string;
	swarmId?: string;
	sessionId?: string;
	preferredCategory?: string;
	requiredCapabilities?: string[];
	maxExecutionTime?: number;
	metadata?: Record<string, unknown>;
}

export interface ToolExecutionResult {
	success: boolean;
	result?: any;
	error?: string;
	metrics: {
		toolName: string;
		category: string;
		executionTime: number;
		selectionReason: string;
		fallbackUsed?: boolean;
		performanceScore?: number;
	};
}

/**
 * Intelligent MCP Tool Coordinator
 * Routes tool calls to optimal implementations based on context and performance
 */
export class MCPCoordinator {
	private toolRegistries = new Map<string, ToolRegistry>();
	private servers = new Map<string, MCPServer>();
	private loadBalancer?: LoadBalancer;
	private initialized = false;
	private toolPerformanceMetrics = new Map<string, number[]>();
	private toolCapabilityMap = new Map<string, Set<string>>();
	private categoryPreferences = new Map<string, string[]>();

	// Tool categories and their characteristics
	private readonly TOOL_CATEGORIES = {
		"claude-flow": {
			focus: "coordination",
			strengths: ["memory_usage", "agent_spawn", "task_orchestrate"],
			latency: "low",
			reliability: "high",
		},
		swarm: {
			focus: "monitoring",
			strengths: ["swarm_status", "agent_metrics", "swarm_monitor"],
			latency: "medium",
			reliability: "high",
		},
		"ruv-swarm": {
			focus: "execution",
			strengths: ["neural_train", "benchmark_run", "features_detect"],
			latency: "high",
			reliability: "medium",
		},
	};

	constructor(
		private config: MCPCoordinatorConfig,
		private eventBus: IEventBus,
		private logger: ILogger,
	) {
		this.initializeToolRegistries();
		this.initializeCategoryPreferences();
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		this.logger.info("Initializing MCP Coordinator...");

		try {
			// Initialize tool registries for each category
			await this.initializeRegistries();

			// Initialize servers
			await this.initializeServers();

			// Initialize load balancer if enabled
			if (this.config.loadBalancing.enabled) {
				await this.initializeLoadBalancer();
			}

			// Setup performance monitoring
			this.setupPerformanceMonitoring();

			// Setup capability mapping
			await this.buildCapabilityMap();

			this.initialized = true;
			this.logger.info("MCP Coordinator initialized successfully");

			this.eventBus.emit("mcp-coordinator:ready", {
				registries: this.toolRegistries.size,
				tools: this.getTotalToolCount(),
			});
		} catch (error) {
			this.logger.error("Failed to initialize MCP Coordinator", error);
			throw new MCPError("MCP Coordinator initialization failed", { error });
		}
	}

	async shutdown(): Promise<void> {
		if (!this.initialized) {
			return;
		}

		this.logger.info("Shutting down MCP Coordinator...");

		try {
			// Shutdown load balancer
			if (this.loadBalancer) {
				await this.loadBalancer.shutdown();
			}

			// Shutdown servers
			for (const [category, server] of this.servers.entries()) {
				await server.shutdown();
				this.logger.debug(`Server shutdown: ${category}`);
			}

			this.initialized = false;
			this.logger.info("MCP Coordinator shutdown complete");
		} catch (error) {
			this.logger.error("Error during MCP Coordinator shutdown", error);
			throw error;
		}
	}

	/**
	 * Intelligent tool execution with optimal selection
	 */
	async executeTool(
		toolName: string,
		input: unknown,
		context: ToolSelectionContext,
	): Promise<ToolExecutionResult> {
		const startTime = Date.now();

		try {
			this.logger.debug("Executing tool with intelligent selection", {
				toolName,
				context: context.taskType,
				priority: context.priority,
			});

			// Select optimal tool implementation
			const selectedTool = await this.selectOptimalTool(toolName, context);

			if (!selectedTool) {
				return {
					success: false,
					error: `Tool not found: ${toolName}`,
					metrics: {
						toolName,
						category: "unknown",
						executionTime: Date.now() - startTime,
						selectionReason: "tool_not_found",
					},
				};
			}

			// Execute tool with performance tracking
			const result = await this.executeWithPerformanceTracking(
				selectedTool.tool,
				selectedTool.category,
				input,
				context,
			);

			const executionTime = Date.now() - startTime;

			// Record performance metrics
			this.recordToolPerformance(
				`${selectedTool.category}:${toolName}`,
				executionTime,
				result.success,
			);

			this.eventBus.emit("mcp-coordinator:tool-executed", {
				toolName,
				category: selectedTool.category,
				success: result.success,
				executionTime,
				selectionReason: selectedTool.reason,
			});

			return {
				success: result.success,
				result: result.data,
				error: result.error,
				metrics: {
					toolName,
					category: selectedTool.category,
					executionTime,
					selectionReason: selectedTool.reason,
					fallbackUsed: selectedTool.fallbackUsed,
					performanceScore: this.calculatePerformanceScore(
						selectedTool.category,
						toolName,
						executionTime,
					),
				},
			};
		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.logger.error("Tool execution failed", {
				toolName,
				error,
				executionTime,
			});

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				metrics: {
					toolName,
					category: "unknown",
					executionTime,
					selectionReason: "execution_error",
				},
			};
		}
	}

	/**
	 * Batch tool execution with intelligent load balancing
	 */
	async executeBatch(
		requests: Array<{
			toolName: string;
			input: unknown;
			context: ToolSelectionContext;
		}>,
	): Promise<ToolExecutionResult[]> {
		this.logger.info("Executing tool batch", { count: requests.length });

		if (this.loadBalancer) {
			// Use load balancer for distributed execution
			return await this.executeWithLoadBalancer(requests);
		} else {
			// Execute sequentially with intelligent selection
			const results: ToolExecutionResult[] = [];

			for (const request of requests) {
				const result = await this.executeTool(
					request.toolName,
					request.input,
					request.context,
				);
				results.push(result);
			}

			return results;
		}
	}

	/**
	 * Discover available tools by capabilities
	 */
	async discoverTools(
		capabilities: string[],
		category?: string,
	): Promise<
		Array<{ name: string; category: string; capabilities: string[] }>
	> {
		const discovered: Array<{
			name: string;
			category: string;
			capabilities: string[];
		}> = [];

		for (const [cat, registry] of this.toolRegistries.entries()) {
			// Filter by category if specified
			if (category && cat !== category) {
				continue;
			}

			const tools = registry.discoverTools({
				capabilities,
				includeDeprecated: false,
			});

			for (const { tool, capability } of tools) {
				discovered.push({
					name: tool.name,
					category: cat,
					capabilities: capability.tags,
				});
			}
		}

		// Sort by capability match score
		discovered.sort((a, b) => {
			const aScore = this.calculateCapabilityMatchScore(
				a.capabilities,
				capabilities,
			);
			const bScore = this.calculateCapabilityMatchScore(
				b.capabilities,
				capabilities,
			);
			return bScore - aScore;
		});

		return discovered;
	}

	/**
	 * Get comprehensive tool registry statistics
	 */
	getRegistryStats(): {
		totalTools: number;
		toolsByCategory: Record<string, number>;
		performanceMetrics: Record<string, any>;
		healthStatus: Record<string, boolean>;
	} {
		const stats = {
			totalTools: 0,
			toolsByCategory: {} as Record<string, number>,
			performanceMetrics: {} as Record<string, any>,
			healthStatus: {} as Record<string, boolean>,
		};

		// Count tools by category
		for (const [category, registry] of this.toolRegistries.entries()) {
			const toolCount = registry.getToolCount();
			stats.toolsByCategory[category] = toolCount;
			stats.totalTools += toolCount;

			// Get registry stats
			const registryStats = registry.getRegistryStats();
			stats.performanceMetrics[category] = registryStats;

			// Health status (simplified)
			stats.healthStatus[category] = toolCount > 0;
		}

		return stats;
	}

	/**
	 * Select optimal tool implementation based on context
	 */
	private async selectOptimalTool(
		toolName: string,
		context: ToolSelectionContext,
	): Promise<{
		tool: MCPTool;
		category: string;
		reason: string;
		fallbackUsed?: boolean;
	} | null> {
		// Strategy 1: Use preferred category if specified
		if (
			context.preferredCategory &&
			this.toolRegistries.has(context.preferredCategory)
		) {
			const registry = this.toolRegistries.get(context.preferredCategory)!;
			const tool = registry.getTool(toolName);

			if (tool) {
				return {
					tool,
					category: context.preferredCategory,
					reason: "preferred_category",
				};
			}
		}

		// Strategy 2: Performance-based selection
		if (this.config.toolSelection.performanceTracking) {
			const bestPerforming = this.findBestPerformingTool(toolName);
			if (bestPerforming) {
				return {
					tool: bestPerforming.tool,
					category: bestPerforming.category,
					reason: "performance_optimized",
				};
			}
		}

		// Strategy 3: Context-based intelligent selection
		const contextOptimal = this.selectByContext(toolName, context);
		if (contextOptimal) {
			return {
				tool: contextOptimal.tool,
				category: contextOptimal.category,
				reason: "context_optimized",
			};
		}

		// Strategy 4: Capability-based selection
		if (context.requiredCapabilities) {
			const capabilityOptimal = this.selectByCapabilities(
				toolName,
				context.requiredCapabilities,
			);
			if (capabilityOptimal) {
				return {
					tool: capabilityOptimal.tool,
					category: capabilityOptimal.category,
					reason: "capability_match",
				};
			}
		}

		// Strategy 5: Fallback using preference order
		return this.fallbackSelection(toolName, context);
	}

	/**
	 * Select tool based on task context
	 */
	private selectByContext(
		toolName: string,
		context: ToolSelectionContext,
	): { tool: MCPTool; category: string } | null {
		// Map task types to preferred categories
		const taskTypeMapping: Record<string, string[]> = {
			coordination: ["claude-flow", "swarm", "ruv-swarm"],
			memory: ["claude-flow", "ruv-swarm", "swarm"],
			monitoring: ["swarm", "ruv-swarm", "claude-flow"],
			analysis: ["ruv-swarm", "claude-flow", "swarm"],
			execution: ["ruv-swarm", "swarm", "claude-flow"],
		};

		const preferredCategories =
			taskTypeMapping[context.taskType] ||
			this.config.toolSelection.preferenceOrder;

		for (const category of preferredCategories) {
			const registry = this.toolRegistries.get(category);
			if (registry) {
				const tool = registry.getTool(toolName);
				if (tool) {
					return { tool, category };
				}
			}
		}

		return null;
	}

	/**
	 * Select tool based on required capabilities
	 */
	private selectByCapabilities(
		toolName: string,
		requiredCapabilities: string[],
	): { tool: MCPTool; category: string } | null {
		let bestMatch: { tool: MCPTool; category: string; score: number } | null =
			null;

		for (const [category, registry] of this.toolRegistries.entries()) {
			const tool = registry.getTool(toolName);
			if (tool) {
				const capability = registry.getToolCapability(toolName);
				if (capability) {
					const score = this.calculateCapabilityMatchScore(
						capability.tags,
						requiredCapabilities,
					);

					if (!bestMatch || score > bestMatch.score) {
						bestMatch = { tool, category, score };
					}
				}
			}
		}

		return bestMatch
			? { tool: bestMatch.tool, category: bestMatch.category }
			: null;
	}

	/**
	 * Fallback selection using preference order
	 */
	private fallbackSelection(
		toolName: string,
		context: ToolSelectionContext,
	): {
		tool: MCPTool;
		category: string;
		reason: string;
		fallbackUsed: boolean;
	} | null {
		for (const category of this.config.toolSelection.preferenceOrder) {
			const registry = this.toolRegistries.get(category);
			if (registry) {
				const tool = registry.getTool(toolName);
				if (tool) {
					return {
						tool,
						category,
						reason: "fallback_preference_order",
						fallbackUsed: true,
					};
				}
			}
		}

		return null;
	}

	/**
	 * Find best performing tool implementation
	 */
	private findBestPerformingTool(
		toolName: string,
	): { tool: MCPTool; category: string } | null {
		let bestPerforming: {
			tool: MCPTool;
			category: string;
			avgTime: number;
		} | null = null;

		for (const [category, registry] of this.toolRegistries.entries()) {
			const tool = registry.getTool(toolName);
			if (tool) {
				const key = `${category}:${toolName}`;
				const metrics = this.toolPerformanceMetrics.get(key);

				if (metrics && metrics.length > 0) {
					const avgTime = metrics.reduce((a, b) => a + b, 0) / metrics.length;

					if (!bestPerforming || avgTime < bestPerforming.avgTime) {
						bestPerforming = { tool, category, avgTime };
					}
				}
			}
		}

		return bestPerforming
			? { tool: bestPerforming.tool, category: bestPerforming.category }
			: null;
	}

	/**
	 * Execute tool with performance tracking
	 */
	private async executeWithPerformanceTracking(
		tool: MCPTool,
		category: string,
		input: unknown,
		context: ToolSelectionContext,
	): Promise<{ success: boolean; data?: any; error?: string }> {
		const registry = this.toolRegistries.get(category);
		if (!registry) {
			return { success: false, error: `Registry not found: ${category}` };
		}

		try {
			// Create MCP context
			const mcpContext: MCPContext = {
				sessionId: context.sessionId || "default",
				agentId: context.agentId,
				logger: this.logger,
			};

			// Execute tool
			const result = await registry.executeTool(tool.name, input, mcpContext);

			return { success: true, data: result };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Execute batch with load balancer
	 */
	private async executeWithLoadBalancer(
		requests: Array<{
			toolName: string;
			input: unknown;
			context: ToolSelectionContext;
		}>,
	): Promise<ToolExecutionResult[]> {
		// This is a placeholder for load balancer integration
		// In a real implementation, this would distribute requests across multiple servers
		const results: ToolExecutionResult[] = [];

		for (const request of requests) {
			const result = await this.executeTool(
				request.toolName,
				request.input,
				request.context,
			);
			results.push(result);
		}

		return results;
	}

	/**
	 * Initialize tool registries for each category
	 */
	private initializeToolRegistries(): void {
		for (const category of Object.keys(this.TOOL_CATEGORIES)) {
			const registry = new ToolRegistry(this.logger);
			this.toolRegistries.set(category, registry);
		}
	}

	/**
	 * Initialize category preferences based on configuration
	 */
	private initializeCategoryPreferences(): void {
		// Set up default preferences for different task types
		this.categoryPreferences.set("coordination", [
			"claude-flow",
			"swarm",
			"ruv-swarm",
		]);
		this.categoryPreferences.set("memory", [
			"claude-flow",
			"ruv-swarm",
			"swarm",
		]);
		this.categoryPreferences.set("monitoring", [
			"swarm",
			"ruv-swarm",
			"claude-flow",
		]);
		this.categoryPreferences.set("analysis", [
			"ruv-swarm",
			"claude-flow",
			"swarm",
		]);
		this.categoryPreferences.set("execution", [
			"ruv-swarm",
			"swarm",
			"claude-flow",
		]);
	}

	/**
	 * Initialize registries with actual tools
	 */
	private async initializeRegistries(): Promise<void> {
		// This would be implemented to load actual tools from each category
		// For now, this is a placeholder
		this.logger.info("Tool registries initialized");
	}

	/**
	 * Initialize MCP servers for each category
	 */
	private async initializeServers(): Promise<void> {
		for (const [category, registry] of this.toolRegistries.entries()) {
			const serverConfig = {
				transport: this.config.primaryServer.transport,
				host: this.config.primaryServer.host,
				port: this.config.primaryServer.port,
				maxSessions: this.config.primaryServer.maxSessions,
				auth: { enabled: false, method: "token" as const },
				loadBalancer: {
					enabled: false,
					strategy: "round-robin" as const,
					maxRequestsPerSecond: 100,
					healthCheckInterval: 30000,
					circuitBreakerThreshold: 5,
				},
				logging: { level: "info" as const, format: "json" as const },
				capabilities: {
					tools: { listChanged: true },
					resources: { subscribe: true, listChanged: true },
					prompts: { listChanged: true },
				},
			};

			const server = new MCPServer(serverConfig, this.eventBus, this.logger);
			await server.initialize();
			this.servers.set(category, server);
		}
	}

	/**
	 * Initialize load balancer if enabled
	 */
	private async initializeLoadBalancer(): Promise<void> {
		if (this.config.loadBalancing.enabled) {
			this.loadBalancer = new LoadBalancer(
				{
					enabled: this.config.loadBalancing.enabled,
					strategy: this.config.loadBalancing.strategy as
						| "round-robin"
						| "least-connections"
						| "weighted",
					maxRequestsPerSecond:
						this.config.loadBalancing.healthCheckInterval / 1000,
					healthCheckInterval: this.config.loadBalancing.healthCheckInterval,
					circuitBreakerThreshold:
						this.config.loadBalancing.circuitBreakerThreshold,
				},
				this.logger,
			);
			await this.loadBalancer.initialize();
		}
	}

	/**
	 * Setup performance monitoring
	 */
	private setupPerformanceMonitoring(): void {
		if (!this.config.toolSelection.performanceTracking) {
			return;
		}

		// Cleanup old metrics periodically
		setInterval(() => {
			this.cleanupPerformanceMetrics();
		}, 300000); // Every 5 minutes
	}

	/**
	 * Build capability map for intelligent tool selection
	 */
	private async buildCapabilityMap(): Promise<void> {
		for (const [category, registry] of this.toolRegistries.entries()) {
			const tools = registry.listTools();

			for (const tool of tools) {
				const capability = registry.getToolCapability(tool.name);
				if (capability) {
					this.toolCapabilityMap.set(
						`${category}:${tool.name}`,
						new Set(capability.tags),
					);
				}
			}
		}
	}

	/**
	 * Record tool performance metrics
	 */
	private recordToolPerformance(
		toolKey: string,
		executionTime: number,
		success: boolean,
	): void {
		if (!this.config.toolSelection.performanceTracking) {
			return;
		}

		const metrics = this.toolPerformanceMetrics.get(toolKey) || [];

		// Only record successful executions for performance metrics
		if (success) {
			metrics.push(executionTime);

			// Keep only last 50 measurements
			if (metrics.length > 50) {
				metrics.shift();
			}

			this.toolPerformanceMetrics.set(toolKey, metrics);
		}
	}

	/**
	 * Calculate capability match score
	 */
	private calculateCapabilityMatchScore(
		toolCapabilities: string[],
		requiredCapabilities: string[],
	): number {
		const toolSet = new Set(toolCapabilities);
		const matches = requiredCapabilities.filter((cap) => toolSet.has(cap));
		return matches.length / requiredCapabilities.length;
	}

	/**
	 * Calculate performance score for a tool
	 */
	private calculatePerformanceScore(
		category: string,
		toolName: string,
		lastExecutionTime: number,
	): number {
		const key = `${category}:${toolName}`;
		const metrics = this.toolPerformanceMetrics.get(key);

		if (!metrics || metrics.length === 0) {
			return 0.5; // Neutral score for new tools
		}

		const avgTime = metrics.reduce((a, b) => a + b, 0) / metrics.length;
		const categoryInfo =
			this.TOOL_CATEGORIES[category as keyof typeof this.TOOL_CATEGORIES];

		// Score based on performance relative to category expectations
		let score = 1.0;

		if (categoryInfo.latency === "low" && avgTime > 1000) score *= 0.7;
		if (categoryInfo.latency === "medium" && avgTime > 3000) score *= 0.8;
		if (categoryInfo.latency === "high" && avgTime > 5000) score *= 0.9;

		// Bonus for consistent performance
		if (metrics.length > 10) {
			const variance = this.calculateVariance(metrics);
			if (variance < avgTime * 0.2) score *= 1.1; // Low variance bonus
		}

		return Math.min(1.0, Math.max(0.0, score));
	}

	/**
	 * Calculate variance of execution times
	 */
	private calculateVariance(values: number[]): number {
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const squaredDiffs = values.map((value) => (value - mean) ** 2);
		return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
	}

	/**
	 * Cleanup old performance metrics
	 */
	private cleanupPerformanceMetrics(): void {
		// Remove metrics for tools that haven't been used recently
		const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

		for (const [key, metrics] of this.toolPerformanceMetrics.entries()) {
			if (metrics.length === 0) {
				this.toolPerformanceMetrics.delete(key);
			}
		}
	}

	/**
	 * Get total tool count across all registries
	 */
	private getTotalToolCount(): number {
		let total = 0;
		for (const registry of this.toolRegistries.values()) {
			total += registry.getToolCount();
		}
		return total;
	}
}
