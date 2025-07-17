import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";

/**
 * MCP (Model Context Protocol) Module
 * Export all MCP components for easy integration
 */

import { MCPLifecycleManager } from "./lifecycle-manager.js";
// Import types and classes needed for the factory class
import type {
	MCPOrchestrationConfig,
	OrchestrationComponents,
} from "./orchestration-integration.js";
import { MCPOrchestrationIntegration } from "./orchestration-integration.js";
import { MCPPerformanceMonitor } from "./performance-monitor.js";
import { MCPProtocolManager } from "./protocol-manager.js";
import { MCPServer } from "./server.js";

// Authentication and Authorization,
export {
	type AuthContext,
	AuthManager,
	type AuthResult,
	type AuthSession,
	type IAuthManager,
	Permissions,
	type TokenGenerationOptions,
	type TokenInfo,
} from "./auth.js";
// Tool Implementations,
export {
	type ClaudeFlowToolContext,
	createClaudeFlowTools,
} from "./claude-flow-tools.js";
// Lifecycle Management,
export {
	type HealthCheckResult,
	type LifecycleEvent,
	type LifecycleManagerConfig,
	LifecycleState,
	MCPLifecycleManager,
} from "./lifecycle-manager.js";
// Load Balancing,
export {
	type ILoadBalancer,
	LoadBalancer,
	RequestQueue,
} from "./load-balancer.js";
// Orchestration Integration,
export {
	type IntegrationStatus,
	type MCPOrchestrationConfig,
	MCPOrchestrationIntegration,
	type OrchestrationComponents,
} from "./orchestration-integration.js";

// Performance Monitoring,
export {
	type Alert,
	type AlertRule,
	MCPPerformanceMonitor,
	type OptimizationSuggestion,
	type PerformanceMetrics,
	type RequestMetrics,
} from "./performance-monitor.js";
// Protocol Management,
export {
	type CompatibilityResult,
	MCPProtocolManager,
	type NegotiationResult,
	type ProtocolVersionInfo,
} from "./protocol-manager.js";
// Request Routing,
export { RequestRouter } from "./router.js";
// Core MCP Server,
export { type IMCPServer, MCPServer } from "./server.js";
// Session Management,
export { type ISessionManager, SessionManager } from "./session-manager.js";
export { createSwarmTools, type SwarmToolContext } from "./swarm-tools.js";
// Tool Registry and Management,
export {
	type ToolCapability,
	type ToolDiscoveryQuery,
	type ToolMetrics,
	ToolRegistry,
} from "./tools.js";
// Transport Implementations,
export type { ITransport } from "./transports/base.js";
export { HttpTransport } from "./transports/http.js";
export { StdioTransport } from "./transports/stdio.js";

/**
 * MCP Integration Factory
 * Provides a simple way to create a complete MCP integration
 */
export class MCPIntegrationFactory {
	/**
	 * Create a complete MCP integration with all components
	 */
	static async createIntegration(config: {
		mcpConfig: import("../utils/types.js").MCPConfig;
		orchestrationConfig?: Partial<MCPOrchestrationConfig>;
		components?: Partial<OrchestrationComponents>;
		logger: import("../core/logger.js").ILogger;
	}): Promise<MCPOrchestrationIntegration> {
		const {
			mcpConfig,
			orchestrationConfig = {},
			components = {},
			logger,
		} = config;

		const integration = new MCPOrchestrationIntegration(
			mcpConfig,
			{
				enabledIntegrations: {
					orchestrator: true,
					swarm: true,
					agents: true,
					resources: true,
					memory: true,
					monitoring: true,
					terminals: true,
				},
				autoStart: true,
				healthCheckInterval: 30000,
				reconnectAttempts: 3,
				reconnectDelay: 5000,
				enableMetrics: true,
				enableAlerts: true,
				...orchestrationConfig,
			},
			components,
			logger
		);

		return integration;
	}

	/**
	 * Create a standalone MCP server (without orchestration integration)
	 */
	static async createStandaloneServer(config: {
		mcpConfig: import("../utils/types.js").MCPConfig;
		logger: import("../core/logger.js").ILogger;
		enableLifecycleManagement?: boolean;
		enablePerformanceMonitoring?: boolean;
	}): Promise<{
		server: MCPServer;
		lifecycleManager?: MCPLifecycleManager;
		performanceMonitor?: MCPPerformanceMonitor;
	}> {
		const {
			mcpConfig,
			logger,
			enableLifecycleManagement = true,
			enablePerformanceMonitoring = true,
		} = config;

		const eventBus = new (await import("node:events")).EventEmitter();
		const server = new MCPServer(mcpConfig, eventBus, logger);

		let lifecycleManager: MCPLifecycleManager | undefined;
		let performanceMonitor: MCPPerformanceMonitor | undefined;

		if (enableLifecycleManagement) {
			lifecycleManager = new MCPLifecycleManager(
				mcpConfig,
				logger,
				() => server
			);
		}

		if (enablePerformanceMonitoring) {
			performanceMonitor = new MCPPerformanceMonitor(logger);
		}

		return {
			server,
			lifecycleManager,
			performanceMonitor,
		};
	}

	/**
	 * Create a development/testing MCP setup
	 */
	static async createDevelopmentSetup(
		logger: import("../core/logger.js").ILogger
	): Promise<{
		server: MCPServer;
		lifecycleManager: MCPLifecycleManager;
		performanceMonitor: MCPPerformanceMonitor;
		protocolManager: MCPProtocolManager;
	}> {
		const mcpConfig: import("../utils/types.js").MCPConfig = {
			transport: "stdio",
			enableMetrics: true,
			auth: {
				enabled: false,
				method: "token",
			},
		};

		const { server, lifecycleManager, performanceMonitor } =
			await MCPIntegrationFactory.createStandaloneServer({
				mcpConfig,
				logger,
				enableLifecycleManagement: true,
				enablePerformanceMonitoring: true,
			});

		const protocolManager = new MCPProtocolManager(logger);

		return {
			server,
			lifecycleManager: lifecycleManager!,
			performanceMonitor: performanceMonitor!,
			protocolManager,
		};
	}
}

/**
 * Default MCP configuration for common use cases
 */
export const DefaultMCPConfigs = {
	/**
	 * Development configuration with stdio transport
	 */
	development: {
		transport: "stdio" as const,
		enableMetrics: true,
		auth: {
			enabled: false,
			method: "token" as const,
		},
	},

	/**
	 * Production configuration with HTTP transport and authentication
	 */
	production: {
		transport: "http" as const,
		host: "0.0.0.0",
		port: 3000,
		tlsEnabled: true,
		enableMetrics: true,
		auth: {
			enabled: true,
			method: "token" as const,
		},
		loadBalancer: {
			enabled: true,
			maxRequestsPerSecond: 100,
			maxConcurrentRequests: 50,
		},
		sessionTimeout: 3600000, // 1 hour,
		maxSessions: 1000,
	},

	/**
	 * Testing configuration with minimal features
	 */
	testing: {
		transport: "stdio" as const,
		enableMetrics: false,
		auth: {
			enabled: false,
			method: "token" as const,
		},
	},
} as const;

/**
 * MCP Utility Functions
 */
export const MCPUtils = {
	/**
	 * Validate MCP protocol version
	 */
	isValidProtocolVersion(
		version: import("../utils/types.js").MCPProtocolVersion
	): boolean {
		return (
			typeof version.major === "number" &&
			typeof version.minor === "number" &&
			typeof version.patch === "number" &&
			version.major > 0
		);
	},

	/**
	 * Compare two protocol versions
	 */
	compareVersions(
		a: import("../utils/types.js").MCPProtocolVersion,
		b: import("../utils/types.js").MCPProtocolVersion
	): number {
		if (a.major !== b.major) return a.major - b.major;
		if (a.minor !== b.minor) return a.minor - b.minor;
		return a.patch - b.patch;
	},

	/**
	 * Format protocol version as string
	 */
	formatVersion(
		version: import("../utils/types.js").MCPProtocolVersion
	): string {
		return `${version.major}.${version.minor}.${version.patch}`;
	},

	/**
	 * Parse protocol version from string
	 */
	parseVersion(
		versionString: string
	): import("../utils/types.js").MCPProtocolVersion {
		const parts = versionString.split(".").map((p) => parseInt(p, 10));
		if (parts.length !== 3 || parts.some((p) => isNaN(p))) {
			throw new Error(`Invalid version string: ${versionString}`);
		}
		return {
			major: parts[0],
			minor: parts[1],
			patch: parts[2],
		};
	},

	/**
	 * Generate a random session ID
	 */
	generateSessionId(): string {
		return `mcp_session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
	},

	/**
	 * Generate a random request ID
	 */
	generateRequestId(): string {
		return `mcp_req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
	},
};
