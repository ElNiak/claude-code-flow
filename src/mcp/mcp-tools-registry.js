/**
 * MCP Tools Registry - Complete tool definitions for Claude-Flow MCP Server
 * Provides comprehensive tool registration and validation
 */

export class MCPToolsRegistry {
	constructor() {
		// Import debug logger
		const { debugLogger } = require("../utils/debug-logger.js");
		this.debugLogger = debugLogger;

		const correlationId = this.debugLogger.logFunctionEntry(
			"MCPToolsRegistry",
			"constructor",
			[],
			"mcp-registry",
		);

		try {
			this.tools = new Map();
			this.debugLogger.logEvent(
				"MCPToolsRegistry",
				"tools-registry-initialized",
				{ toolsCount: this.tools.size },
				"mcp-registry",
			);
			this.debugLogger.logFunctionExit(
				correlationId,
				{ success: true },
				"mcp-registry",
			);
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-registry");
			throw error;
		}
	}

	initializeAllTools() {
		const correlationId = this.debugLogger.logFunctionEntry(
			"MCPToolsRegistry",
			"initializeAllTools",
			[],
			"mcp-registry",
		);

		try {
			this.debugLogger.logEvent(
				"MCPToolsRegistry",
				"tools-initialization-start",
				{},
				"mcp-registry",
			);

			// Swarm Coordination Tools
			this.tools.set("swarm_init", {
				name: "swarm_init",
				description:
					"Initialize a swarm coordination topology for enhanced parallel processing",
				inputSchema: {
					type: "object",
					properties: {
						topology: {
							type: "string",
							enum: ["mesh", "hierarchical", "ring", "star"],
							description: "Swarm coordination topology",
						},
						maxAgents: {
							type: "number",
							minimum: 1,
							maximum: 50,
							description: "Maximum number of agents in the swarm",
						},
						strategy: {
							type: "string",
							enum: ["balanced", "specialized", "adaptive", "parallel"],
							description: "Coordination strategy",
						},
					},
					required: ["topology"],
				},
				category: "coordination",
			});

			this.tools.set("agent_spawn", {
				name: "agent_spawn",
				description: "Spawn specialized agents for coordinated task execution",
				inputSchema: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: [
								"coordinator",
								"researcher",
								"coder",
								"analyst",
								"tester",
								"reviewer",
								"architect",
								"optimizer",
							],
							description: "Type of agent to spawn",
						},
						name: {
							type: "string",
							description: "Human-readable name for the agent",
						},
						capabilities: {
							type: "array",
							items: { type: "string" },
							description: "List of agent capabilities",
						},
						swarmId: {
							type: "string",
							description: "ID of the swarm to join",
						},
					},
					required: ["type"],
				},
				category: "coordination",
			});

			this.tools.set("task_orchestrate", {
				name: "task_orchestrate",
				description: "Orchestrate complex tasks across coordinated agents",
				inputSchema: {
					type: "object",
					properties: {
						task: {
							type: "string",
							description: "Main task description",
						},
						strategy: {
							type: "string",
							enum: ["parallel", "sequential", "adaptive", "pipeline"],
							description: "Task execution strategy",
						},
						agents: {
							type: "array",
							items: { type: "string" },
							description: "List of agent IDs to involve",
						},
						priority: {
							type: "string",
							enum: ["low", "medium", "high", "critical"],
							description: "Task priority level",
						},
					},
					required: ["task"],
				},
				category: "coordination",
			});

			// Memory and Neural Tools
			this.tools.set("memory_usage", {
				name: "memory_usage",
				description:
					"Advanced memory operations for persistent coordination context",
				inputSchema: {
					type: "object",
					properties: {
						action: {
							type: "string",
							enum: [
								"store",
								"retrieve",
								"delete",
								"list",
								"search",
								"clear",
								"stats",
							],
							description: "Memory operation to perform",
						},
						key: {
							type: "string",
							description: "Memory key for store/retrieve/delete operations",
						},
						value: {
							description: "Value to store (any type)",
						},
						pattern: {
							type: "string",
							description: "Search pattern for search operations",
						},
					},
					required: ["action"],
				},
				category: "memory",
			});

			this.tools.set("memory_search", {
				name: "memory_search",
				description:
					"Advanced search across memory store with pattern matching",
				inputSchema: {
					type: "object",
					properties: {
						pattern: {
							type: "string",
							description: "Search pattern (regex supported)",
						},
						limit: {
							type: "number",
							minimum: 1,
							maximum: 100,
							description: "Maximum results to return",
						},
						sortBy: {
							type: "string",
							enum: ["timestamp", "key", "relevance"],
							description: "Sort results by field",
						},
					},
					required: ["pattern"],
				},
				category: "memory",
			});

			// Status and Monitoring Tools
			this.tools.set("swarm_status", {
				name: "swarm_status",
				description: "Get comprehensive status of swarm coordination",
				inputSchema: {
					type: "object",
					properties: {
						swarmId: {
							type: "string",
							description: "Specific swarm ID to check",
						},
						includeMetrics: {
							type: "boolean",
							description: "Include performance metrics",
						},
					},
				},
				category: "monitoring",
			});

			this.tools.set("agent_list", {
				name: "agent_list",
				description: "List all active agents with their status",
				inputSchema: {
					type: "object",
					properties: {
						swarmId: {
							type: "string",
							description: "Filter by swarm ID",
						},
						type: {
							type: "string",
							description: "Filter by agent type",
						},
						status: {
							type: "string",
							enum: ["active", "idle", "busy", "error"],
							description: "Filter by agent status",
						},
					},
				},
				category: "monitoring",
			});

			this.tools.set("agent_metrics", {
				name: "agent_metrics",
				description: "Get detailed performance metrics for agents",
				inputSchema: {
					type: "object",
					properties: {
						agentId: {
							type: "string",
							description: "Specific agent ID for metrics",
						},
						timeRange: {
							type: "string",
							enum: ["1h", "6h", "24h", "7d"],
							description: "Time range for metrics",
						},
					},
				},
				category: "monitoring",
			});

			// Task Management Tools
			this.tools.set("task_status", {
				name: "task_status",
				description: "Get status of orchestrated tasks",
				inputSchema: {
					type: "object",
					properties: {
						taskId: {
							type: "string",
							description: "Specific task ID to check",
						},
						includeHistory: {
							type: "boolean",
							description: "Include task execution history",
						},
					},
				},
				category: "tasks",
			});

			this.tools.set("task_results", {
				name: "task_results",
				description: "Retrieve results from completed tasks",
				inputSchema: {
					type: "object",
					properties: {
						taskId: {
							type: "string",
							description: "Task ID to get results for",
						},
						format: {
							type: "string",
							enum: ["json", "text", "summary"],
							description: "Result format",
						},
					},
					required: ["taskId"],
				},
				category: "tasks",
			});

			// Neural and Learning Tools
			this.tools.set("neural_status", {
				name: "neural_status",
				description: "Get status of neural learning patterns",
				inputSchema: {
					type: "object",
					properties: {
						includePatterns: {
							type: "boolean",
							description: "Include learned patterns",
						},
					},
				},
				category: "neural",
			});

			this.tools.set("neural_train", {
				name: "neural_train",
				description: "Train neural patterns from execution data",
				inputSchema: {
					type: "object",
					properties: {
						data: {
							type: "object",
							description: "Training data for neural patterns",
						},
						method: {
							type: "string",
							enum: ["supervised", "unsupervised", "reinforcement"],
							description: "Training method",
						},
					},
					required: ["data"],
				},
				category: "neural",
			});

			this.tools.set("neural_patterns", {
				name: "neural_patterns",
				description: "Analyze and retrieve learned neural patterns",
				inputSchema: {
					type: "object",
					properties: {
						category: {
							type: "string",
							description: "Pattern category to filter",
						},
						confidence: {
							type: "number",
							minimum: 0,
							maximum: 1,
							description: "Minimum confidence threshold",
						},
					},
				},
				category: "neural",
			});

			// Performance and Benchmarking Tools
			this.tools.set("benchmark_run", {
				name: "benchmark_run",
				description: "Run performance benchmarks on coordination system",
				inputSchema: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: ["coordination", "memory", "neural", "full"],
							description: "Benchmark type to run",
						},
						duration: {
							type: "number",
							minimum: 1,
							maximum: 300,
							description: "Benchmark duration in seconds",
						},
					},
					required: ["type"],
				},
				category: "performance",
			});

			this.tools.set("features_detect", {
				name: "features_detect",
				description: "Detect available system features and capabilities",
				inputSchema: {
					type: "object",
					properties: {
						category: {
							type: "string",
							enum: ["coordination", "memory", "neural", "performance", "all"],
							description: "Feature category to detect",
						},
					},
				},
				category: "system",
			});

			this.tools.set("swarm_monitor", {
				name: "swarm_monitor",
				description: "Real-time monitoring of swarm coordination",
				inputSchema: {
					type: "object",
					properties: {
						interval: {
							type: "number",
							minimum: 1,
							maximum: 60,
							description: "Monitoring interval in seconds",
						},
						metrics: {
							type: "array",
							items: { type: "string" },
							description: "Specific metrics to monitor",
						},
					},
				},
				category: "monitoring",
			});

			this.debugLogger.logEvent(
				"MCPToolsRegistry",
				"tools-initialization-complete",
				{
					totalTools: this.tools.size,
					categories: this.getToolCategories(),
				},
				"mcp-registry",
			);

			this.debugLogger.logFunctionExit(
				correlationId,
				{ toolsCount: this.tools.size },
				"mcp-registry",
			);
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-registry");
			throw error;
		}
	}

	getToolCategories() {
		return {
			swarm: "🐝 Swarm Coordination",
			neural: "🧠 Neural Processing",
			memory: "💾 Memory & Persistence",
			analysis: "📊 Analysis & Monitoring",
			workflow: "🔄 Workflow & Automation",
			github: "🐙 GitHub Integration",
			daa: "🏗️ Dynamic Agent Architecture",
			system: "🛠️ System & Utilities",
			serena: "🔍 Serena Integration",
		};
	}

	getToolsByCategory(category) {
		return Object.values(this.tools).filter(
			(tool) => tool.category === category,
		);
	}

	getTool(name) {
		const correlationId = this.debugLogger.logFunctionEntry(
			"MCPToolsRegistry",
			"getTool",
			[name],
			"mcp-registry",
		);

		try {
			const tool = this.tools.get(name);
			this.debugLogger.logEvent(
				"MCPToolsRegistry",
				"tool-lookup",
				{
					toolName: name,
					found: !!tool,
					totalTools: this.tools.size,
				},
				"mcp-registry",
			);

			this.debugLogger.logFunctionExit(
				correlationId,
				{ found: !!tool },
				"mcp-registry",
			);
			return tool;
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-registry");
			throw error;
		}
	}

	getAllTools() {
		return this.tools;
	}

	validateToolInput(toolName, args) {
		const correlationId = this.debugLogger.logFunctionEntry(
			"MCPToolsRegistry",
			"validateToolInput",
			[toolName, args],
			"mcp-registry",
		);

		try {
			this.debugLogger.logEvent(
				"MCPToolsRegistry",
				"input-validation-start",
				{
					toolName,
					hasArgs: !!args,
					argsKeys: args ? Object.keys(args) : [],
				},
				"mcp-registry",
			);

			const tool = this.tools.get(toolName);
			if (!tool) {
				const error = new Error(`Tool '${toolName}' not found`);
				this.debugLogger.logEvent(
					"MCPToolsRegistry",
					"tool-not-found-validation",
					{ toolName },
					"mcp-registry",
				);
				this.debugLogger.logFunctionError(correlationId, error, "mcp-registry");
				throw error;
			}

			// Basic validation - could be enhanced with JSON schema validation
			if (tool.inputSchema && tool.inputSchema.required) {
				for (const required of tool.inputSchema.required) {
					if (!(required in args)) {
						const error = new Error(`Missing required parameter: ${required}`);
						this.debugLogger.logEvent(
							"MCPToolsRegistry",
							"missing-required-param",
							{
								toolName,
								missingParam: required,
								providedParams: Object.keys(args || {}),
							},
							"mcp-registry",
						);
						this.debugLogger.logFunctionError(
							correlationId,
							error,
							"mcp-registry",
						);
						throw error;
					}
				}
			}

			this.debugLogger.logEvent(
				"MCPToolsRegistry",
				"input-validation-success",
				{
					toolName,
					validatedParams: Object.keys(args || {}),
				},
				"mcp-registry",
			);

			this.debugLogger.logFunctionExit(
				correlationId,
				{ valid: true },
				"mcp-registry",
			);
			return true;
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-registry");
			throw error;
		}
	}

	getToolCount() {
		return Object.keys(this.tools).length;
	}

	getToolsInfo() {
		const _categories = {};
		Object.values(this.tools).forEach((tool) => {
			if (!categories[tool.category]) {
				categories[tool.category] = [];
			}
			categories[tool.category].push({
				name: tool.name,
				description: tool.description,
			});
		});

		return {
			total: this.getToolCount(),
			categories,
			categoryLabels: this.categories,
		};
	}
}

export default MCPToolsRegistry;
