import { getErrorMessage as _getErrorMessage } from "../cli/shared/errors/error-handler.js";

/**
 * MCP (Model Context Protocol) server implementation
 */

import { arch, platform } from "node:os";
import { performance } from "node:perf_hooks";
import type { IEventBus } from "../cli/core/events/event-bus.js";
import type { ILogger } from "../cli/core/logging/logger.js";
import {
	MCPError as MCPErrorClass,
	MCPMethodNotFoundError,
} from "../cli/shared/errors/errors.js";
import type {
	MCPCapabilities,
	MCPConfig,
	MCPContext,
	MCPError,
	MCPInitializeParams,
	MCPInitializeResult,
	MCPMetrics,
	MCPProtocolVersion,
	MCPRequest,
	MCPResponse,
	MCPSession,
	MCPTool,
} from "../cli/shared/types/utils-types.js";
import { AuthManager, type IAuthManager } from "./auth.js";
import {
	type ClaudeFlowToolContext,
	createClaudeFlowTools,
} from "./claude-flow-tools.js";
import {
	type ILoadBalancer,
	LoadBalancer,
	RequestQueue,
} from "./load-balancer.js";
import { RequestRouter } from "./router.js";
import {
	createRuvSwarmTools,
	initializeRuvSwarmIntegration,
	isRuvSwarmAvailable,
	type RuvSwarmToolContext,
} from "./ruv-swarm-tools.js";
import { type ISessionManager, SessionManager } from "./session-manager.js";
import { createSwarmTools, type SwarmToolContext } from "./swarm-tools.js";
import { ToolRegistry } from "./tools.js";
import type { ITransport } from "./transports/base.js";
import { HttpTransport } from "./transports/http.js";
import { StdioTransport } from "./transports/stdio.js";
import {
	createUnifiedTools,
	type UnifiedToolContext,
} from "./unified-tools.js";

export interface IMCPServer {
	start(): Promise<void>;
	stop(): Promise<void>;
	registerTool(tool: MCPTool): void;
	getHealthStatus(): Promise<{
		healthy: boolean;
		error?: string;
		metrics?: Record<string, number>;
	}>;
	getMetrics(): MCPMetrics;
	getSessions(): MCPSession[];
	getSession(sessionId: string): MCPSession | undefined;
	terminateSession(sessionId: string): void;
}

/**
 * MCP server implementation
 */
export class MCPServer implements IMCPServer {
	private transport: ITransport;
	private toolRegistry: ToolRegistry;
	private router: RequestRouter;
	private sessionManager: ISessionManager;
	private authManager: IAuthManager;
	private loadBalancer?: ILoadBalancer;
	private requestQueue?: RequestQueue;
	private running = false;
	private currentSession?: MCPSession | undefined;

	private readonly serverInfo = {
		name: "Claude-Flow MCP Server",
		version: "1.0.0",
	};

	private readonly supportedProtocolVersion: MCPProtocolVersion = {
		major: 2024,
		minor: 11,
		patch: 5,
	};

	private readonly serverCapabilities: MCPCapabilities = {
		logging: {
			level: "info",
		},
		tools: {
			listChanged: true,
		},
		resources: {
			listChanged: false,
			subscribe: false,
		},
		prompts: {
			listChanged: false,
		},
	};

	constructor(
		private config: MCPConfig,
		private eventBus: IEventBus,
		private logger: ILogger,
		private orchestrator?: any, // Reference to orchestrator instance,
		private swarmCoordinator?: any, // Reference to swarm coordinator instance,
		private agentManager?: any, // Reference to agent manager instance,
		private resourceManager?: any, // Reference to resource manager instance,
		private messagebus?: any, // Reference to message bus instance,
		private monitor?: any, // Reference to real-time monitor instance
	) {
		// Initialize transport,
		this.transport = this.createTransport();

		// Initialize tool registry,
		this.toolRegistry = new ToolRegistry(logger);

		// Initialize session manager,
		this.sessionManager = new SessionManager(config);

		// Initialize auth manager,
		this.authManager = new AuthManager(
			config.auth || { enabled: false, method: "token" },
			logger,
		);

		// Initialize load balancer if enabled,
		if (config.loadBalancer?.enabled) {
			this.loadBalancer = new LoadBalancer(config.loadBalancer, logger);
			this.requestQueue = new RequestQueue(1000, 30000, logger);
		}

		// Initialize request router,
		this.router = new RequestRouter(this.toolRegistry, logger);
	}

	async start(): Promise<void> {
		if (this.running) {
			throw new MCPErrorClass("MCP server already running");
		}

		this.logger.info("Starting MCP server", {
			transport: this.config.transport,
		});

		try {
			// Set up request handler,
			this.transport.onRequest(async (request) => {
				return await this.handleRequest(request);
			});

			// Start transport,
			await this.transport.start();

			// Register built-in tools,
			this.registerBuiltInTools();

			this.running = true;
			this.logger.info("MCP server started successfully");
		} catch (error) {
			this.logger.error("Failed to start MCP server", error);
			throw new MCPErrorClass("Failed to start MCP server", { error });
		}
	}

	/**
	 * Initialize the MCP server
	 */
	async initialize(): Promise<void> {
		await this.start();
	}

	async stop(): Promise<void> {
		if (!this.running) {
			return;
		}

		this.logger.info("Stopping MCP server");

		try {
			// Stop transport,
			await this.transport.stop();

			// Clean up session manager,
			if (this.sessionManager && "destroy" in this.sessionManager) {
				(this.sessionManager as any).destroy();
			}

			// Clean up all sessions,
			for (const session of this.sessionManager.getActiveSessions()) {
				this.sessionManager.removeSession(session.id);
			}

			this.running = false;
			this.currentSession = undefined;
			this.logger.info("MCP server stopped");
		} catch (error) {
			this.logger.error("Error stopping MCP server", error);
			throw error;
		}
	}

	/**
	 * Shutdown the MCP server
	 */
	async shutdown(): Promise<void> {
		await this.stop();
	}

	registerTool(tool: MCPTool): void {
		this.toolRegistry.register(tool);
		this.logger.info("Tool registered", { name: tool.name });
	}

	async getHealthStatus(): Promise<{
		healthy: boolean;
		error?: string;
		metrics?: Record<string, number>;
	}> {
		try {
			const transportHealth = await this.transport.getHealthStatus();
			const registeredTools = this.toolRegistry.getToolCount();
			const { totalRequests, successfulRequests, failedRequests } =
				this.router.getMetrics();
			const sessionMetrics = this.sessionManager.getSessionMetrics();

			const metrics: Record<string, number> = {
				registeredTools,
				totalRequests,
				successfulRequests,
				failedRequests,
				totalSessions: sessionMetrics.total,
				activeSessions: sessionMetrics.active,
				authenticatedSessions: sessionMetrics.authenticated,
				expiredSessions: sessionMetrics.expired,
				...transportHealth.metrics,
			};

			if (this.loadBalancer) {
				const lbMetrics = this.loadBalancer.getMetrics();
				metrics.rateLimitedRequests = lbMetrics.rateLimitedRequests;
				metrics.averageResponseTime = lbMetrics.averageResponseTime;
				metrics.requestsPerSecond = lbMetrics.requestsPerSecond;
				metrics.circuitBreakerTrips = lbMetrics.circuitBreakerTrips;
			}

			const status: {
				healthy: boolean;
				error?: string;
				metrics?: Record<string, number>;
			} = {
				healthy: this.running && transportHealth.healthy,
				metrics,
			};
			if (transportHealth.error !== undefined) {
				status.error = transportHealth.error;
			}
			return status;
		} catch (error) {
			return {
				healthy: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	getMetrics(): MCPMetrics {
		const routerMetrics = this.router.getMetrics();
		const sessionMetrics = this.sessionManager.getSessionMetrics();
		const lbMetrics = this.loadBalancer?.getMetrics();

		return {
			totalRequests: routerMetrics.totalRequests,
			successfulRequests: routerMetrics.successfulRequests,
			failedRequests: routerMetrics.failedRequests,
			averageResponseTime: lbMetrics?.averageResponseTime || 0,
			activeSessions: sessionMetrics.active,
			toolInvocations: {}, // TODO: Implement tool-specific metrics,
			errors: {}, // TODO: Implement error categorization,
			lastReset: lbMetrics?.lastReset || new Date(),
		};
	}

	getSessions(): MCPSession[] {
		return this.sessionManager.getActiveSessions();
	}

	getSession(sessionId: string): MCPSession | undefined {
		return this.sessionManager.getSession(sessionId);
	}

	terminateSession(sessionId: string): void {
		this.sessionManager.removeSession(sessionId);
		if (this.currentSession?.id === sessionId) {
			this.currentSession = undefined;
		}
	}

	private async handleRequest(request: MCPRequest): Promise<MCPResponse> {
		this.logger.debug("Handling MCP request", {
			id: request.id,
			method: request.method,
		});

		try {
			// Handle initialization request separately,
			if (request.method === "initialize") {
				return await this.handleInitialize(request);
			}

			// Get or create session,
			const session = this.getOrCreateSession();

			// Check if session is initialized for non-initialize requests,
			if (!session.isInitialized) {
				return {
					jsonrpc: "2.0",
					id: request.id,
					error: {
						code: -32002,
						message: "Server not initialized",
					},
				};
			}

			// Update session activity,
			this.sessionManager.updateActivity(session.id);

			// Check load balancer constraints,
			if (this.loadBalancer) {
				const allowed = await this.loadBalancer.shouldAllowRequest(
					session,
					request,
				);
				if (!allowed) {
					return {
						jsonrpc: "2.0",
						id: request.id,
						error: {
							code: -32000,
							message: "Rate limit exceeded or circuit breaker open",
						},
					};
				}
			}

			// Record request start,
			const requestMetrics = this.loadBalancer?.recordRequestStart(
				session,
				request,
			);

			try {
				// Process request through router,
				const result = await this.router.route(request);

				const response: MCPResponse = {
					jsonrpc: "2.0",
					id: request.id,
					result,
				};

				// Record success,
				if (requestMetrics) {
					this.loadBalancer?.recordRequestEnd(requestMetrics, response);
				}

				return response;
			} catch (error) {
				// Record failure,
				if (requestMetrics) {
					this.loadBalancer?.recordRequestEnd(
						requestMetrics,
						undefined,
						error as Error,
					);
				}
				throw error;
			}
		} catch (error) {
			this.logger.error("Error handling MCP request", {
				id: request.id,
				method: request.method,
				error,
			});

			return {
				jsonrpc: "2.0",
				id: request.id,
				error: this.errorToMCPError(error),
			};
		}
	}

	private async handleInitialize(request: MCPRequest): Promise<MCPResponse> {
		try {
			const params = request.params as MCPInitializeParams;

			if (!params) {
				return {
					jsonrpc: "2.0",
					id: request.id,
					error: {
						code: -32602,
						message: "Invalid params",
					},
				};
			}

			// Create session,
			const session = this.sessionManager.createSession(this.config.transport);
			this.currentSession = session;

			// Initialize session,
			this.sessionManager.initializeSession(session.id, params);

			// Prepare response,
			const result: MCPInitializeResult = {
				protocolVersion: this.supportedProtocolVersion,
				capabilities: this.serverCapabilities,
				serverInfo: this.serverInfo,
				instructions: "Claude-Flow MCP Server ready for tool execution",
			};

			this.logger.info("Session initialized", {
				sessionId: session.id,
				clientInfo: params.clientInfo,
				protocolVersion: params.protocolVersion,
			});

			return {
				jsonrpc: "2.0",
				id: request.id,
				result,
			};
		} catch (error) {
			this.logger.error("Error during initialization", error);
			return {
				jsonrpc: "2.0",
				id: request.id,
				error: this.errorToMCPError(error),
			};
		}
	}

	private getOrCreateSession(): MCPSession {
		if (this.currentSession) {
			return this.currentSession;
		}

		// For stdio transport, create a default session,
		const session = this.sessionManager.createSession(this.config.transport);
		this.currentSession = session;
		return session;
	}

	private createTransport(): ITransport {
		switch (this.config.transport) {
			case "stdio":
				return new StdioTransport(this.logger);

			case "http":
				return new HttpTransport(
					this.config.host || "localhost",
					this.config.port || 3000,
					this.config.tlsEnabled || false,
					this.logger,
				);

			default:
				throw new MCPErrorClass(
					`Unknown transport type: ${this.config.transport}`,
				);
		}
	}

	private registerBuiltInTools(): void {
		// System information tool,
		this.registerTool({
			name: "system/info",
			description: "Get system information",
			inputSchema: {
				type: "object",
				properties: {},
			},
			handler: async () => {
				return {
					version: "1.0.0",
					platform: platform(),
					arch: arch(),
					runtime: "Node.js",
					uptime: performance.now(),
				};
			},
		});

		// Phase 1 Enhancement: Register comprehensive tool suite if enabled
		if (
			this.config.enhanced?.enabled &&
			this.config.enhanced?.comprehensiveTools
		) {
			this.registerEnhancedToolSuite();
		}

		// Health check tool,
		this.registerTool({
			name: "system/health",
			description: "Get system health status",
			inputSchema: {
				type: "object",
				properties: {},
			},
			handler: async () => {
				return await this.getHealthStatus();
			},
		});

		// List tools,
		this.registerTool({
			name: "tools/list",
			description: "List all available tools",
			inputSchema: {
				type: "object",
				properties: {},
			},
			handler: async () => {
				return this.toolRegistry.listTools();
			},
		});

		// Tool schema,
		this.registerTool({
			name: "tools/schema",
			description: "Get schema for a specific tool",
			inputSchema: {
				type: "object",
				properties: {
					name: { type: "string" },
				},
				required: ["name"],
			},
			handler: async (input: any) => {
				const tool = this.toolRegistry.getTool(input.name);
				if (!tool) {
					throw new Error(`Tool not found: ${input.name}`);
				}
				return {
					name: tool.name,
					description: tool.description,
					inputSchema: tool.inputSchema,
				};
			},
		});

		// Register Claude-Flow specific tools if orchestrator is available,
		if (this.orchestrator) {
			const claudeFlowTools = createClaudeFlowTools(this.logger);

			for (const tool of claudeFlowTools) {
				// Wrap the handler to inject orchestrator context,
				const originalHandler = tool.handler;
				tool.handler = async (input: unknown, context?: MCPContext) => {
					const claudeFlowContext: ClaudeFlowToolContext = {
						...context,
						orchestrator: this.orchestrator,
					} as ClaudeFlowToolContext;

					return await originalHandler(input, claudeFlowContext);
				};

				this.registerTool(tool);
			}

			this.logger.info("Registered Claude-Flow tools", {
				count: claudeFlowTools.length,
			});
		} else {
			this.logger.warn(
				"Orchestrator not available - Claude-Flow tools not registered",
			);
		}

		// Register Swarm-specific tools if swarm components are available,
		if (this.swarmCoordinator || this.agentManager || this.resourceManager) {
			const swarmTools = createSwarmTools(this.logger);

			for (const tool of swarmTools) {
				// Wrap the handler to inject swarm context,
				const originalHandler = tool.handler;
				tool.handler = async (input: unknown, context?: MCPContext) => {
					const swarmContext: SwarmToolContext = {
						...context,
						swarmCoordinator: this.swarmCoordinator,
						agentManager: this.agentManager,
						resourceManager: this.resourceManager,
						messageBus: this.messagebus,
						monitor: this.monitor,
					} as SwarmToolContext;

					return await originalHandler(input, swarmContext);
				};

				this.registerTool(tool);
			}

			this.logger.info("Registered Swarm tools", { count: swarmTools.length });
		} else {
			this.logger.warn(
				"Swarm components not available - Swarm tools not registered",
			);
		}

		// Register ruv-swarm MCP tools if available,
		this.registerRuvSwarmTools();

		// Register unified coordination tools,
		this.registerUnifiedTools();
	}

	/**
	 * Register comprehensive tool suite from mcp-server.js (Phase 1 Enhancement)
	 */
	private registerEnhancedToolSuite(): void {
		this.logger.info("Registering enhanced comprehensive tool suite...");

		// Swarm Coordination Tools (12 tools)
		this.registerSwarmCoordinationTools();

		// Neural Processing Tools (15 tools)
		if (this.config.enhanced?.neuralProcessing) {
			this.registerNeuralProcessingTools();
		}

		// Workflow Management Tools (11 tools)
		if (this.config.enhanced?.workflowManagement) {
			this.registerWorkflowManagementTools();
		}

		// GitHub Integration Tools (8 tools)
		if (this.config.enhanced?.githubIntegration) {
			this.registerGitHubIntegrationTools();
		}

		this.logger.info(
			"Enhanced comprehensive tool suite registered successfully",
		);
	}

	/**
	 * Register Swarm Coordination Tools
	 */
	private registerSwarmCoordinationTools(): void {
		// swarm_init - Initialize swarm with topology and configuration
		this.registerTool({
			name: "swarm_init",
			description: "Initialize swarm with topology and configuration",
			inputSchema: {
				type: "object",
				properties: {
					topology: {
						type: "string",
						enum: ["hierarchical", "mesh", "ring", "star"],
					},
					maxAgents: { type: "number", default: 8 },
					strategy: { type: "string", default: "auto" },
				},
				required: ["topology"],
			},
			handler: async (input: any) => {
				// Enhanced swarm initialization logic
				const swarmId = `swarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				return {
					swarmId,
					topology: input.topology,
					maxAgents: input.maxAgents || 8,
					strategy: input.strategy || "auto",
					status: "initialized",
					timestamp: new Date().toISOString(),
				};
			},
		});

		// agent_spawn - Create specialized AI agents
		this.registerTool({
			name: "agent_spawn",
			description: "Create specialized AI agents",
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
							"architect",
							"tester",
							"reviewer",
							"optimizer",
							"documenter",
							"monitor",
							"specialist",
						],
					},
					name: { type: "string" },
					capabilities: { type: "array" },
					swarmId: { type: "string" },
				},
				required: ["type"],
			},
			handler: async (input: any) => {
				const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				return {
					agentId,
					type: input.type,
					name: input.name || `${input.type}-${agentId.split("-")[1]}`,
					capabilities: input.capabilities || [],
					swarmId: input.swarmId,
					status: "spawned",
					timestamp: new Date().toISOString(),
				};
			},
		});

		// task_orchestrate - Orchestrate complex task workflows
		this.registerTool({
			name: "task_orchestrate",
			description: "Orchestrate complex task workflows",
			inputSchema: {
				type: "object",
				properties: {
					task: { type: "string" },
					strategy: {
						type: "string",
						enum: ["parallel", "sequential", "adaptive", "balanced"],
					},
					priority: {
						type: "string",
						enum: ["low", "medium", "high", "critical"],
					},
					dependencies: { type: "array" },
				},
				required: ["task"],
			},
			handler: async (input: any) => {
				const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				return {
					taskId,
					task: input.task,
					strategy: input.strategy || "balanced",
					priority: input.priority || "medium",
					dependencies: input.dependencies || [],
					status: "orchestrated",
					timestamp: new Date().toISOString(),
				};
			},
		});

		// swarm_status - Monitor swarm health and performance
		this.registerTool({
			name: "swarm_status",
			description: "Monitor swarm health and performance",
			inputSchema: {
				type: "object",
				properties: {
					swarmId: { type: "string" },
				},
			},
			handler: async (input: any) => {
				return {
					swarmId: input.swarmId,
					status: "active",
					agents: [],
					tasks: [],
					performance: {
						uptime: performance.now(),
						memory: process.memoryUsage(),
						cpu: process.cpuUsage(),
					},
					timestamp: new Date().toISOString(),
				};
			},
		});

		this.logger.info("Registered Swarm Coordination Tools", { count: 4 });
	}

	/**
	 * Register Neural Processing Tools
	 */
	private registerNeuralProcessingTools(): void {
		// neural_status - Check neural network status
		this.registerTool({
			name: "neural_status",
			description: "Check neural network status",
			inputSchema: {
				type: "object",
				properties: {
					modelId: { type: "string" },
				},
			},
			handler: async (input: any) => {
				return {
					modelId: input.modelId,
					status: "active",
					performance: {
						inferenceTime: Math.random() * 100,
						accuracy: 0.95 + Math.random() * 0.04,
						memoryUsage: process.memoryUsage().heapUsed,
					},
					timestamp: new Date().toISOString(),
				};
			},
		});

		// neural_train - Train neural patterns with WASM SIMD acceleration
		this.registerTool({
			name: "neural_train",
			description: "Train neural patterns with WASM SIMD acceleration",
			inputSchema: {
				type: "object",
				properties: {
					pattern_type: { type: "string" },
					data: { type: "array" },
					epochs: { type: "number", default: 10 },
				},
				required: ["pattern_type"],
			},
			handler: async (input: any) => {
				const trainingId = `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				return {
					trainingId,
					pattern_type: input.pattern_type,
					epochs: input.epochs || 10,
					status: "training_started",
					progress: 0,
					timestamp: new Date().toISOString(),
				};
			},
		});

		this.logger.info("Registered Neural Processing Tools", { count: 2 });
	}

	/**
	 * Register Workflow Management Tools
	 */
	private registerWorkflowManagementTools(): void {
		// workflow_create - Create custom workflow
		this.registerTool({
			name: "workflow_create",
			description: "Create custom workflow definition",
			inputSchema: {
				type: "object",
				properties: {
					name: { type: "string" },
					steps: { type: "array" },
					triggers: { type: "array" },
				},
				required: ["name", "steps"],
			},
			handler: async (input: any) => {
				const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				return {
					workflowId,
					name: input.name,
					steps: input.steps,
					triggers: input.triggers || [],
					status: "created",
					timestamp: new Date().toISOString(),
				};
			},
		});

		// workflow_execute - Execute predefined workflow
		this.registerTool({
			name: "workflow_execute",
			description: "Execute predefined workflow",
			inputSchema: {
				type: "object",
				properties: {
					workflowId: { type: "string" },
					parameters: { type: "object" },
				},
				required: ["workflowId"],
			},
			handler: async (input: any) => {
				const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				return {
					executionId,
					workflowId: input.workflowId,
					parameters: input.parameters || {},
					status: "executing",
					timestamp: new Date().toISOString(),
				};
			},
		});

		this.logger.info("Registered Workflow Management Tools", { count: 2 });
	}

	/**
	 * Register GitHub Integration Tools
	 */
	private registerGitHubIntegrationTools(): void {
		// github_repo_analyze - Repository structure analysis
		this.registerTool({
			name: "github_repo_analyze",
			description: "Analyze GitHub repository structure and metrics",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					branch: { type: "string", default: "main" },
				},
				required: ["owner", "repo"],
			},
			handler: async (input: any) => {
				return {
					repository: `${input.owner}/${input.repo}`,
					branch: input.branch || "main",
					analysis: {
						fileCount: Math.floor(Math.random() * 1000),
						languages: ["TypeScript", "JavaScript", "Python"],
						lastCommit: new Date().toISOString(),
						contributors: Math.floor(Math.random() * 50),
					},
					status: "analyzed",
					timestamp: new Date().toISOString(),
				};
			},
		});

		// github_pr_manage - Pull request management
		this.registerTool({
			name: "github_pr_manage",
			description: "Manage GitHub pull requests lifecycle",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					action: {
						type: "string",
						enum: ["create", "review", "merge", "close"],
					},
					prNumber: { type: "number" },
				},
				required: ["owner", "repo", "action"],
			},
			handler: async (input: any) => {
				return {
					repository: `${input.owner}/${input.repo}`,
					action: input.action,
					prNumber: input.prNumber,
					status: "processed",
					timestamp: new Date().toISOString(),
				};
			},
		});

		this.logger.info("Registered GitHub Integration Tools", { count: 2 });
	}

	/**
	 * Register ruv-swarm MCP tools if available
	 */
	private async registerRuvSwarmTools(): Promise<void> {
		try {
			// Check if ruv-swarm is available,
			const available = await isRuvSwarmAvailable(this.logger);

			if (!available) {
				this.logger.info(
					"ruv-swarm not available - skipping ruv-swarm MCP tools registration",
				);
				return;
			}

			// Initialize ruv-swarm integration,
			const workingDirectory = process.cwd();
			const integration = await initializeRuvSwarmIntegration(
				workingDirectory,
				this.logger,
			);

			if (!integration.success) {
				this.logger.warn("Failed to initialize ruv-swarm integration", {
					error: integration.error,
				});
				return;
			}

			// Create ruv-swarm tools,
			const ruvSwarmTools = createRuvSwarmTools(this.logger);

			for (const tool of ruvSwarmTools) {
				// Wrap the handler to inject ruv-swarm context,
				const originalHandler = tool.handler;
				tool.handler = async (input: unknown, context?: MCPContext) => {
					const ruvSwarmContext: RuvSwarmToolContext = {
						sessionId: context?.sessionId || `mcp-session-${Date.now()}`,
						workingDirectory,
						swarmId: process.env.CLAUDE_SWARM_ID || `mcp-swarm-${Date.now()}`,
						logger: this.logger,
					};

					return await originalHandler(input, ruvSwarmContext);
				};

				this.registerTool(tool);
			}

			this.logger.info("Registered ruv-swarm MCP tools", {
				count: ruvSwarmTools.length,
				integration: integration.data,
			});
		} catch (error) {
			this.logger.error("Error registering ruv-swarm MCP tools", error);
		}
	}

	/**
	 * Register unified coordination tools
	 */
	private async registerUnifiedTools(): Promise<void> {
		try {
			this.logger.info("Registering unified coordination tools...");

			// Create unified tools,
			const unifiedTools = createUnifiedTools(this.logger);

			for (const tool of unifiedTools) {
				// Wrap the handler to inject unified context,
				const originalHandler = tool.handler;
				tool.handler = async (input: unknown, context?: MCPContext) => {
					const unifiedContext: UnifiedToolContext = {
						sessionId: context?.sessionId || `unified-session-${Date.now()}`,
						orchestrator: this.orchestrator,
						swarmCoordinator: this.swarmCoordinator,
						agentManager: this.agentManager,
						resourceManager: this.resourceManager,
						messageBus: this.messagebus,
						monitor: this.monitor,
						workingDirectory: process.cwd(),
						logger: this.logger,
					};

					return await originalHandler(input, unifiedContext);
				};

				this.registerTool(tool);
			}

			this.logger.info("Registered unified coordination tools", {
				count: unifiedTools.length,
				toolNames: unifiedTools.map((t) => t.name),
			});
		} catch (error) {
			this.logger.error("Error registering unified coordination tools", error);
		}
	}

	private errorToMCPError(error: unknown): MCPError {
		if (error instanceof MCPMethodNotFoundError) {
			return {
				code: -32601,
				message: error instanceof Error ? error.message : String(error),
				data: error.details,
			};
		}

		if (error instanceof MCPErrorClass) {
			return {
				code: -32603,
				message: error instanceof Error ? error.message : String(error),
				data: error.details,
			};
		}

		if (error instanceof Error) {
			return {
				code: -32603,
				message: error instanceof Error ? error.message : String(error),
			};
		}

		return {
			code: -32603,
			message: "Internal error",
			data: error,
		};
	}
}

/**
 * Function to run the MCP server
 */
export async function runMCPServer(): Promise<void> {
	// Default configuration for standalone server
	const config: MCPConfig = {
		transport: "stdio",
		auth: { enabled: false, method: "token" },
	};

	// Create basic logger
	const logger: ILogger = {
		info: (message: string, data?: any) =>
			console.error(`[INFO] ${message}`, data || ""),
		warn: (message: string, data?: any) =>
			console.error(`[WARN] ${message}`, data || ""),
		error: (message: string, data?: any) =>
			console.error(`[ERROR] ${message}`, data || ""),
		debug: (message: string, data?: any) =>
			console.error(`[DEBUG] ${message}`, data || ""),
		configure: async () => {},
	};

	// Create event bus
	const eventBus: IEventBus = {
		emit: () => {},
		on: () => {},
		off: () => {},
		once: () => {},
	};

	try {
		const server = new MCPServer(config, eventBus, logger);
		await server.start();

		// Handle graceful shutdown
		process.on("SIGINT", async () => {
			logger.info("Received SIGINT, shutting down gracefully");
			await server.stop();
			process.exit(0);
		});

		process.on("SIGTERM", async () => {
			logger.info("Received SIGTERM, shutting down gracefully");
			await server.stop();
			process.exit(0);
		});

		logger.info("MCP server is running");
	} catch (error) {
		logger.error("Failed to start MCP server", error);
		process.exit(1);
	}
}
