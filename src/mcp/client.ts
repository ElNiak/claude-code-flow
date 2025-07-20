import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";
/**
 * MCP Client for Model Context Protocol
 */

import { EventEmitter } from "node:events";
import { logger } from "../core/logger.js";
import type {
	MCPConfig,
	MCPNotification,
	MCPRequest,
	MCPResponse,
} from "../utils/types.js";
import { type RecoveryConfig, RecoveryManager } from "./recovery/index.js";
import type { ITransport } from "./transports/base.js";

export interface MCPClientConfig {
	transport: ITransport;
	timeout?: number;
	toolTimeouts?: Record<string, number>;
	enableRecovery?: boolean;
	recoveryConfig?: RecoveryConfig;
	mcpConfig?: MCPConfig;
	resourceCleanup?: {
		enabled: boolean;
		timeoutCleanup: boolean;
		releaseOnTimeout: boolean;
	};
}

export class MCPClient extends EventEmitter {
	private transport: ITransport;
	private timeout: number;
	private toolTimeouts: Record<string, number>;
	private connected = false;
	private recoveryManager?: RecoveryManager;
	private pendingRequests = new Map<
		string,
		{
			resolve: (value: any) => void;
			reject: (reason?: any) => void;
			timer: NodeJS.Timeout;
		}
	>();
	private resourceCleanup: {
		enabled: boolean;
		timeoutCleanup: boolean;
		releaseOnTimeout: boolean;
	};

	constructor(config: MCPClientConfig) {
		super();
		this.transport = config.transport;
		this.timeout = config.timeout || 30000;
		this.toolTimeouts = config.toolTimeouts || {};
		this.resourceCleanup = config.resourceCleanup || {
			enabled: true,
			timeoutCleanup: true,
			releaseOnTimeout: true,
		};

		// Initialize recovery manager if enabled,
		if (config.enableRecovery) {
			this.recoveryManager = new RecoveryManager(
				this,
				config.mcpConfig || {
					transport: "stdio",
					port: 3000,
					tlsEnabled: false,
				},
				logger,
				config.recoveryConfig
			);
			this.setupRecoveryHandlers();
		}
	}

	async connect(): Promise<void> {
		try {
			await this.transport.connect();
			this.connected = true;
			logger.info("MCP Client connected");

			// Start recovery manager if enabled,
			if (this.recoveryManager) {
				await this.recoveryManager.start();
			}

			this.emit("connected");
		} catch (error) {
			logger.error("Failed to connect MCP client", error);
			this.connected = false;

			// Trigger recovery if enabled,
			if (this.recoveryManager) {
				await this.recoveryManager.forceRecovery();
			}

			throw error;
		}
	}

	async disconnect(): Promise<void> {
		if (this.connected) {
			// Stop recovery manager first,
			if (this.recoveryManager) {
				await this.recoveryManager.stop();
			}

			await this.transport.disconnect();
			this.connected = false;
			logger.info("MCP Client disconnected");

			this.emit("disconnected");
		}
	}

	async request(method: string, params?: unknown): Promise<unknown> {
		const request: MCPRequest = {
			jsonrpc: "2.0" as const,
			method,
			params,
			id: Math.random().toString(36).slice(2),
		};

		// If recovery manager is enabled, let it handle the request,
		if (this.recoveryManager && !this.connected) {
			await this.recoveryManager.handleRequest(request);
		}

		if (!this.connected) {
			throw new Error("Client not connected");
		}

		// Determine timeout for this specific tool or use default
		const toolTimeout = this.getToolTimeout(method);

		// Create promise for tracking the request,
		const requestPromise = new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(String(request.id!));

				// Trigger resource cleanup on timeout if enabled
				if (
					this.resourceCleanup.enabled &&
					this.resourceCleanup.timeoutCleanup
				) {
					this.handleTimeoutCleanup(method, params);
				}

				reject(new Error(`Request timeout: ${method} (${toolTimeout}ms)`));
			}, toolTimeout);

			this.pendingRequests.set(String(request.id!), { resolve, reject, timer });
		});

		try {
			const response = await this.transport.sendRequest(request);

			// Clear pending request,
			const pending = this.pendingRequests.get(String(request.id!));
			if (pending) {
				clearTimeout(pending.timer);
				this.pendingRequests.delete(String(request.id!));
			}

			if ("error" in response) {
				throw new Error(String(response.error));
			}

			return response.result;
		} catch (error) {
			// Clear pending request on error,
			const pending = this.pendingRequests.get(String(request.id!));
			if (pending) {
				clearTimeout(pending.timer);
				this.pendingRequests.delete(String(request.id!));
			}

			throw error;
		}
	}

	async notify(method: string, params?: unknown): Promise<void> {
		// Special handling for heartbeat notifications,
		if (method === "heartbeat") {
			// Always allow heartbeat notifications for recovery,
			const notification: MCPNotification = {
				jsonrpc: "2.0" as const,
				method,
				params,
			};

			if (this.transport.sendNotification) {
				await this.transport.sendNotification(notification);
			}
			return;
		}

		if (!this.connected) {
			throw new Error("Client not connected");
		}

		const notification: MCPNotification = {
			jsonrpc: "2.0" as const,
			method,
			params,
		};

		if (this.transport.sendNotification) {
			await this.transport.sendNotification(notification);
		} else {
			throw new Error("Transport does not support notifications");
		}
	}

	isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Get recovery status if recovery is enabled
	 */
	getRecoveryStatus() {
		return this.recoveryManager?.getStatus();
	}

	/**
	 * Force a recovery attempt
	 */
	async forceRecovery(): Promise<boolean> {
		if (!this.recoveryManager) {
			throw new Error("Recovery not enabled");
		}
		return this.recoveryManager.forceRecovery();
	}

	private setupRecoveryHandlers(): void {
		if (!this.recoveryManager) {
			return;
		}

		// Handle recovery events,
		this.recoveryManager.on("recoveryStart", ({ trigger }) => {
			logger.info("Recovery started", { trigger });
			this.emit("recoveryStart", { trigger });
		});

		this.recoveryManager.on("recoveryComplete", ({ success, duration }) => {
			if (success) {
				logger.info("Recovery completed successfully", { duration });
				this.connected = true;
				this.emit("recoverySuccess", { duration });
			} else {
				logger.error("Recovery failed");
				this.emit("recoveryFailed", { duration });
			}
		});

		this.recoveryManager.on("fallbackActivated", (state) => {
			logger.warn("Fallback mode activated", state);
			this.emit("fallbackActivated", state);
		});

		this.recoveryManager.on("healthChange", (newStatus, oldStatus) => {
			this.emit("healthChange", newStatus, oldStatus);
		});
	}

	/**
	 * Get timeout for a specific tool
	 */
	private getToolTimeout(method: string): number {
		// Check for exact match first
		if (this.toolTimeouts[method]) {
			return this.toolTimeouts[method];
		}

		// Check for pattern matches (e.g., "mcp__serena__*" -> 30000)
		for (const [pattern, timeout] of Object.entries(this.toolTimeouts)) {
			if (pattern.includes("*")) {
				const regex = new RegExp(pattern.replace("*", ".*"));
				if (regex.test(method)) {
					return timeout;
				}
			}
		}

		// Return default timeout
		return this.timeout;
	}

	/**
	 * Handle timeout cleanup for tools
	 */
	private handleTimeoutCleanup(method: string, params: unknown): void {
		if (!this.resourceCleanup.releaseOnTimeout) {
			return;
		}

		// Emit timeout event for coordination manager to handle
		this.emit("toolTimeout", {
			method,
			params,
			timestamp: new Date().toISOString(),
			timeout: this.getToolTimeout(method),
		});

		logger.warn("MCP tool timeout detected, triggering resource cleanup", {
			method,
			timeout: this.getToolTimeout(method),
			resourceCleanup: this.resourceCleanup,
		});
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		// Clear all pending requests,
		for (const [id, pending] of Array.from(this.pendingRequests.entries())) {
			clearTimeout(pending.timer);
			pending.reject(new Error("Client cleanup"));
		}
		this.pendingRequests.clear();

		// Cleanup recovery manager,
		if (this.recoveryManager) {
			await this.recoveryManager.cleanup();
		}

		// Disconnect if connected,
		await this.disconnect();
	}
}
