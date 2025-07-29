/**
 * Claude Flow v2.0.0 System Integration
 * Comprehensive integration manager for all system components
 */

import { AgentManager } from "../cli/agents/agent-manager.js";
import type { ConfigManager } from "../cli/commands/config/manager.js";
import { RealTimeMonitor } from "../cli/commands/monitor/real-time-monitor.js";
import { TaskEngine } from "../cli/commands/task/core/engine.js";
import { EventBus } from "../cli/core/events/event-bus.js";
import { Logger } from "../cli/core/logging/logger.js";
import { getErrorMessage } from "../cli/shared/errors/error-handler.js";
import { MCPServer } from "../mcp/server.js";
import { MemoryManager as _MemoryManager } from "../memory/manager.js";
import type {
	ComponentStatus,
	IntegrationConfig,
	SystemHealth,
} from "./types.js";

export class SystemIntegration {
	private static instance: SystemIntegration;
	private eventBus: EventBus;
	private logger: Logger;
	private orchestrator: any | null = null;
	private configManager: any | null = null;
	private memoryManager: any | null = null;
	private agentManager: any | null = null;
	private swarmCoordinator: any | null = null;
	private taskEngine: any | null = null;
	private monitor: any | null = null;
	private mcpServer: any | null = null;
	private initialized = false;
	private componentStatuses: Map<string, ComponentStatus> = new Map();

	private constructor() {
		this.eventBus = EventBus.getInstance();
		this.logger = new Logger({
			level: "info",
			format: "text",
			destination: "console",
		});

		// Initialize configManager safely,
		try {
			// Dynamic import for ConfigManager if available,
			this.configManager = {
				getInstance: () => ({
					load: async () => {},
					get: () => null,
					set: () => {},
				}),
			};
		} catch (error) {
			this.logger.warn("ConfigManager not available, using mock");
			this.configManager = {
				load: async () => {},
				get: () => null,
				set: () => {},
			};
		}

		this.setupEventHandlers();
	}

	static getInstance(): SystemIntegration {
		if (!SystemIntegration.instance) {
			SystemIntegration.instance = new SystemIntegration();
		}
		return SystemIntegration.instance;
	}

	/**
	 * Initialize all system components in proper order
	 */
	async initialize(config?: IntegrationConfig): Promise<void> {
		if (this.initialized) {
			this.logger.warn("System already initialized");
			return;
		}

		this.logger.info("🚀 Starting Claude Flow v2.0.0 System Integration");

		try {
			// Phase 1: Core Infrastructure,
			await this.initializeCore(config);

			// Phase 2: Memory and Configuration,
			await this.initializeMemoryAndConfig();

			// Phase 3: Agents and Coordination,
			await this.initializeAgentsAndCoordination();

			// Phase 4: Task Management,
			await this.initializeTaskManagement();

			// Phase 5: Monitoring and MCP,
			await this.initializeMonitoringAndMcp();

			// Phase 6: Cross-component wiring,
			await this.wireComponents();

			this.initialized = true;
			this.logger.info("✅ Claude Flow v2.0.0 System Integration Complete");

			// Emit system ready event,
			this.eventBus.emit("system:ready", {
				timestamp: Date.now(),
				components: Array.from(this.componentStatuses.keys()),
				health: await this.getSystemHealth(),
			});
		} catch (error) {
			this.logger.error(
				"❌ System Integration Failed:",
				getErrorMessage(error),
			);
			throw error;
		}
	}

	/**
	 * Initialize core infrastructure components
	 */
	private async initializeCore(config?: IntegrationConfig): Promise<void> {
		this.logger.info("🔧 Phase 1: Initializing Core Infrastructure");

		try {
			// Initialize configuration,
			if (this.configManager && typeof this.configManager.load === "function") {
				await this.configManager.load();
				this.updateComponentStatus("config", "healthy", "Configuration loaded");
			} else {
				this.updateComponentStatus(
					"config",
					"warning",
					"Configuration manager not available",
				);
			}

			// Try to initialize orchestrator if available,
			try {
				const { Orchestrator } = await import("../core/orchestrator-fixed.js");
				this.orchestrator = new Orchestrator(
					this.configManager,
					this.eventBus,
					this.logger,
				);
				if (typeof this.orchestrator.initialize === "function") {
					await this.orchestrator.initialize();
				}
				this.updateComponentStatus(
					"orchestrator",
					"healthy",
					"Orchestrator initialized",
				);
			} catch (error) {
				this.logger.warn("Orchestrator not available:", getErrorMessage(error));
				this.updateComponentStatus(
					"orchestrator",
					"warning",
					"Orchestrator not available",
				);
			}

			this.logger.info("✅ Core Infrastructure Ready");
		} catch (error) {
			this.logger.error("Core initialization failed:", getErrorMessage(error));
			throw error;
		}
	}

	/**
	 * Initialize memory and configuration management
	 */
	private async initializeMemoryAndConfig(): Promise<void> {
		this.logger.info("🧠 Phase 2: Initializing Memory and Configuration");

		try {
			// Initialize memory manager,
			try {
				const { MemoryManager } = await import("../memory/manager.js");
				this.memoryManager = new MemoryManager(
					{
						backend: "sqlite",
						cacheSizeMB: 10,
						syncInterval: 60000,
						conflictResolution: "last-write",
						retentionDays: 30,
					},
					this.eventBus,
					this.logger,
				);
				if (typeof this.memoryManager.initialize === "function") {
					await this.memoryManager.initialize();
				}
				this.updateComponentStatus(
					"memory",
					"healthy",
					"Memory manager initialized",
				);
			} catch (error) {
				this.logger.warn(
					"Memory manager not available:",
					getErrorMessage(error),
				);
				this.updateComponentStatus(
					"memory",
					"warning",
					"Memory manager not available",
				);
			}

			this.logger.info("✅ Memory and Configuration Ready");
		} catch (error) {
			this.logger.error(
				"Memory initialization failed:",
				getErrorMessage(error),
			);
			throw error;
		}
	}

	/**
	 * Initialize agents and coordination systems
	 */
	private async initializeAgentsAndCoordination(): Promise<void> {
		this.logger.info("🤖 Phase 3: Initializing Agents and Coordination");

		try {
			// Initialize agent manager,
			try {
				const { AgentManager } = await import("../cli/agents/agent-manager.js");
				this.agentManager = new AgentManager(
					{
						maxAgents: 100,
						defaultTimeout: 30000,
						heartbeatInterval: 10000,
						healthCheckInterval: 30000,
						autoRestart: true,
						resourceLimits: {
							memory: 512 * 1024 * 1024,
							cpu: 1.0,
							disk: 1024 * 1024 * 1024,
						},
						agentDefaults: {
							autonomyLevel: 0.7,
							learningEnabled: true,
							adaptationEnabled: true,
						},
						environmentDefaults: {
							runtime: "deno",
							workingDirectory: "./agents",
							tempDirectory: "./tmp",
							logDirectory: "./logs",
						},
					},
					this.logger,
					this.eventBus,
					this.memoryManager!,
				);
				if (typeof this.agentManager.initialize === "function") {
					await this.agentManager.initialize();
				}
				this.updateComponentStatus(
					"agents",
					"healthy",
					"Agent manager initialized",
				);
			} catch (error) {
				this.logger.warn(
					"Agent manager not available, using mock:",
					getErrorMessage(error),
				);
				const { MockAgentManager } = await import("./mock-components.js");
				this.agentManager = new MockAgentManager(
					{ maxAgents: 100, autoSpawn: false },
					this.eventBus,
					this.logger,
				);
				await this.agentManager.initialize();
				this.updateComponentStatus(
					"agents",
					"warning",
					"Using mock agent manager",
				);
			}

			// Initialize swarm coordinator,
			try {
				const { SwarmCoordinator } = await import(
					"../coordination/swarm-coordinator.js"
				);
				this.swarmCoordinator = new SwarmCoordinator({
					maxAgents: 10,
					maxConcurrentTasks: 5,
					taskTimeout: 300000,
					enableMonitoring: true,
					enableWorkStealing: true,
					enableCircuitBreaker: true,
					memoryNamespace: "swarm",
					coordinationStrategy: "hybrid",
					backgroundTaskInterval: 5000,
					healthCheckInterval: 10000,
					maxRetries: 3,
					backoffMultiplier: 2,
				});
				if (typeof this.swarmCoordinator.initialize === "function") {
					await this.swarmCoordinator.initialize();
				}
				this.updateComponentStatus(
					"swarm",
					"healthy",
					"Swarm coordinator initialized",
				);
			} catch (error) {
				this.logger.warn(
					"Swarm coordinator not available, using mock:",
					getErrorMessage(error),
				);
				const { MockSwarmCoordinator } = await import("./mock-components.js");
				this.swarmCoordinator = new MockSwarmCoordinator(
					{ topology: "mesh", maxAgents: 10 },
					this.eventBus,
					this.logger,
					this.memoryManager!,
				);
				await this.swarmCoordinator.initialize();
				this.updateComponentStatus(
					"swarm",
					"warning",
					"Using mock swarm coordinator",
				);
			}

			this.logger.info("✅ Agents and Coordination Ready");
		} catch (error) {
			this.logger.error(
				"Agents and coordination initialization failed:",
				getErrorMessage(error),
			);
			throw error;
		}
	}

	/**
	 * Initialize task management system
	 */
	private async initializeTaskManagement(): Promise<void> {
		this.logger.info("📋 Phase 4: Initializing Task Management");

		try {
			// Initialize task engine,
			try {
				const { TaskEngine } = await import(
					"../cli/commands/task/core/engine.js"
				);
				this.taskEngine = new TaskEngine(50, this.memoryManager!);
				if (typeof this.taskEngine.initialize === "function") {
					await this.taskEngine.initialize();
				}
				this.updateComponentStatus(
					"tasks",
					"healthy",
					"Task engine initialized",
				);
			} catch (error) {
				this.logger.warn(
					"Task engine not available, using mock:",
					getErrorMessage(error),
				);
				const { MockTaskEngine } = await import("./mock-components.js");
				this.taskEngine = new MockTaskEngine(50, this.memoryManager!);
				await this.taskEngine.initialize();
				this.updateComponentStatus(
					"tasks",
					"warning",
					"Using mock task engine",
				);
			}

			this.logger.info("✅ Task Management Ready");
		} catch (error) {
			this.logger.error(
				"Task management initialization failed:",
				getErrorMessage(error),
			);
			throw error;
		}
	}

	/**
	 * Initialize monitoring and MCP systems
	 */
	private async initializeMonitoringAndMcp(): Promise<void> {
		this.logger.info("📊 Phase 5: Initializing Monitoring and MCP");

		try {
			// Initialize real-time monitor,
			try {
				const { RealTimeMonitor } = await import(
					"../cli/commands/monitor/real-time-monitor.js"
				);
				this.monitor = new RealTimeMonitor(
					{
						updateInterval: 1000,
						retentionPeriod: 86400000,
						alertingEnabled: true,
						alertThresholds: {
							cpu: { warning: 0.7, critical: 0.9 },
							memory: { warning: 0.8, critical: 0.95 },
							disk: { warning: 0.8, critical: 0.95 },
							errorRate: { warning: 0.05, critical: 0.1 },
							responseTime: { warning: 1000, critical: 5000 },
							queueDepth: { warning: 100, critical: 500 },
							agentHealth: { warning: 0.7, critical: 0.5 },
							swarmUtilization: { warning: 0.8, critical: 0.95 },
						},
						metricsEnabled: true,
						tracingEnabled: true,
						dashboardEnabled: false,
						exportEnabled: false,
						exportFormat: "json",
						debugMode: false,
					},
					this.logger,
					this.eventBus,
					this.memoryManager!,
				);
				if (typeof this.monitor.initialize === "function") {
					await this.monitor.initialize();
				}
				this.updateComponentStatus(
					"monitor",
					"healthy",
					"Real-time monitor initialized",
				);
			} catch (error) {
				this.logger.warn(
					"Real-time monitor not available, using mock:",
					getErrorMessage(error),
				);
				const { MockRealTimeMonitor } = await import("./mock-components.js");
				this.monitor = new MockRealTimeMonitor(
					{ updateInterval: 1000, maxMetrics: 100 },
					this.logger,
					this.eventBus,
					this.memoryManager!,
				);
				await this.monitor.initialize();
				this.updateComponentStatus("monitor", "warning", "Using mock monitor");
			}

			// Initialize MCP server,
			try {
				const { MCPServer } = await import("../mcp/server.js");
				this.mcpServer = new MCPServer(
					{ transport: "http", port: 3001 },
					this.eventBus,
					this.logger,
				);
				if (typeof this.mcpServer.initialize === "function") {
					await this.mcpServer.initialize();
				}
				this.updateComponentStatus("mcp", "healthy", "MCP server initialized");
			} catch (error) {
				this.logger.warn(
					"MCP server not available, using mock:",
					getErrorMessage(error),
				);
				const { MockMCPServer } = await import("./mock-components.js");
				this.mcpServer = new MockMCPServer(
					{ transport: "http", port: 3001 },
					this.eventBus,
					this.logger,
				);
				await this.mcpServer.initialize();
				this.updateComponentStatus("mcp", "warning", "Using mock MCP server");
			}

			this.logger.info("✅ Monitoring and MCP Ready");
		} catch (error) {
			this.logger.error(
				"Monitoring and MCP initialization failed:",
				getErrorMessage(error),
			);
			throw error;
		}
	}

	/**
	 * Wire all components together for proper communication
	 */
	private async wireComponents(): Promise<void> {
		this.logger.info("🔗 Phase 6: Wiring Components");

		// Wire orchestrator to agents,
		if (this.orchestrator && this.agentManager) {
			this.orchestrator.setAgentManager(this.agentManager);
			this.agentManager.setOrchestrator(this.orchestrator);
		}

		// Wire swarm coordinator to agents and tasks,
		if (this.swarmCoordinator && this.agentManager && this.taskEngine) {
			this.swarmCoordinator.setAgentManager(this.agentManager);
			this.swarmCoordinator.setTaskEngine(this.taskEngine);
			this.taskEngine.setSwarmCoordinator(this.swarmCoordinator);
		}

		// Wire monitor to all components,
		if (this.monitor) {
			this.monitor.attachToOrchestrator(this.orchestrator!);
			this.monitor.attachToAgentManager(this.agentManager!);
			this.monitor.attachToSwarmCoordinator(this.swarmCoordinator!);
			this.monitor.attachToTaskEngine(this.taskEngine!);
		}

		// Wire MCP server to core components,
		if (this.mcpServer) {
			this.mcpServer.attachToOrchestrator(this.orchestrator!);
			this.mcpServer.attachToAgentManager(this.agentManager!);
			this.mcpServer.attachToSwarmCoordinator(this.swarmCoordinator!);
			this.mcpServer.attachToTaskEngine(this.taskEngine!);
			this.mcpServer.attachToMemoryManager(this.memoryManager!);
		}

		this.logger.info("✅ Component Wiring Complete");
	}

	/**
	 * Setup event handlers for cross-component communication
	 */
	private setupEventHandlers(): void {
		// System health monitoring,
		this.eventBus.on("component:status", (event: unknown) => {
			const statusEvent = event as {
				component: string;
				status: "healthy" | "unhealthy" | "warning";
				message: string;
			};
			this.updateComponentStatus(
				statusEvent.component,
				statusEvent.status,
				statusEvent.message,
			);
		});

		// Error handling,
		this.eventBus.on("system:error", (event: unknown) => {
			const errorEvent = event as {
				component: string;
				error: { message: string };
			};
			this.logger.error(
				`System Error in ${errorEvent.component}:`,
				errorEvent.error,
			);
			this.updateComponentStatus(
				errorEvent.component,
				"unhealthy",
				errorEvent.error.message,
			);
		});

		// Performance monitoring,
		this.eventBus.on("performance:metric", (event: unknown) => {
			const metricEvent = event as { metric: string; value: number };
			this.logger.debug(
				`Performance Metric: ${metricEvent.metric} = ${metricEvent.value}`,
			);
		});
	}

	/**
	 * Update component status
	 */
	private updateComponentStatus(
		component: string,
		status: "healthy" | "unhealthy" | "warning",
		message?: string,
	): void {
		const statusInfo: ComponentStatus = {
			component,
			status,
			message: message || "",
			timestamp: Date.now(),
			lastHealthCheck: Date.now(),
		};

		this.componentStatuses.set(component, statusInfo);

		// Emit status update,
		this.eventBus.emit("component:status:updated", statusInfo);
	}

	/**
	 * Get system health status
	 */
	async getSystemHealth(): Promise<SystemHealth> {
		const components = Array.from(this.componentStatuses.values());
		const healthyComponents = components.filter(
			(c) => c.status === "healthy",
		).length;
		const unhealthyComponents = components.filter(
			(c) => c.status === "unhealthy",
		).length;
		const warningComponents = components.filter(
			(c) => c.status === "warning",
		).length;

		let overallStatus: "healthy" | "unhealthy" | "warning" = "healthy";
		if (unhealthyComponents > 0) {
			overallStatus = "unhealthy";
		} else if (warningComponents > 0) {
			overallStatus = "warning";
		}

		return {
			overall: overallStatus,
			components: Object.fromEntries(this.componentStatuses),
			metrics: {
				totalComponents: components.length,
				healthyComponents,
				unhealthyComponents,
				warningComponents,
				uptime: Date.now() - (this.initialized ? Date.now() : 0),
			},
			timestamp: Date.now(),
		};
	}

	/**
	 * Get specific component
	 */
	getComponent<T>(name: string): T | null {
		switch (name) {
			case "orchestrator":
				return this.orchestrator as T;
			case "configManager":
				return this.configManager as T;
			case "memoryManager":
				return this.memoryManager as T;
			case "agentManager":
				return this.agentManager as T;
			case "swarmCoordinator":
				return this.swarmCoordinator as T;
			case "taskEngine":
				return this.taskEngine as T;
			case "monitor":
				return this.monitor as T;
			case "mcpServer":
				return this.mcpServer as T;
			case "eventBus":
				return this.eventBus as T;
			case "logger":
				return this.logger as T;
			default:
				return null;
		}
	}

	/**
	 * Shutdown all components gracefully
	 */
	async shutdown(): Promise<void> {
		this.logger.info("🛑 Shutting down Claude Flow v2.0.0");

		// Shutdown in reverse order,
		if (this.mcpServer) {
			await this.mcpServer.shutdown();
		}

		if (this.monitor) {
			await this.monitor.shutdown();
		}

		if (this.taskEngine) {
			await this.taskEngine.shutdown();
		}

		if (this.swarmCoordinator) {
			await this.swarmCoordinator.shutdown();
		}

		if (this.agentManager) {
			await this.agentManager.shutdown();
		}

		if (this.memoryManager) {
			await this.memoryManager.shutdown();
		}

		if (this.orchestrator) {
			await this.orchestrator.shutdown();
		}

		this.initialized = false;
		this.logger.info("✅ Claude Flow v2.0.0 Shutdown Complete");
	}

	/**
	 * Check if system is ready
	 */
	isReady(): boolean {
		return this.initialized;
	}

	/**
	 * Get initialization status
	 */
	getInitializationStatus(): {
		initialized: boolean;
		components: string[];
		health: SystemHealth | null;
	} {
		return {
			initialized: this.initialized,
			components: Array.from(this.componentStatuses.keys()),
			health: this.initialized ? null : null, // Will be populated after initialization
		};
	}
}

// Export singleton instance,
export const systemIntegration = SystemIntegration.getInstance();
