import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";

/**
 * Session manager for MCP connections
 */

import { createHash, timingSafeEqual } from "node:crypto";
import type { ILogger } from "../core/logger.js";
import { MCPError } from "../utils/errors.js";
import { globalTimerRegistry } from "../utils/graceful-exit.js";
import {
	type MCPAuthConfig,
	MCPCapabilities,
	type MCPConfig,
	type MCPInitializeParams,
	type MCPProtocolVersion,
	type MCPSession,
} from "../utils/types.js";

export interface ISessionManager {
	createSession(transport: "stdio" | "http" | "websocket"): MCPSession;
	getSession(id: string): MCPSession | undefined;
	initializeSession(sessionId: string, params: MCPInitializeParams): void;
	authenticateSession(sessionId: string, credentials: unknown): boolean;
	updateActivity(sessionId: string): void;
	removeSession(sessionId: string): void;
	getActiveSessions(): MCPSession[];
	cleanupExpiredSessions(): void;
	getSessionMetrics(): {
		total: number;
		active: number;
		authenticated: number;
		expired: number;
	};
}

/**
 * Session manager implementation
 */
export class SessionManager implements ISessionManager {
	private sessions = new Map<string, MCPSession>();
	private authConfig: MCPAuthConfig;
	private sessionTimeout: number;
	private maxSessions: number;
	private cleanupInterval?: NodeJS.Timeout;
	private config: any;
	private logger: ILogger;
	private debugLogger: any;

	constructor(config: any) {
		// Import debug logger
		const { debugLogger } = require("../utils/debug-logger.js");
		this.debugLogger = debugLogger;

		const correlationId = this.debugLogger.logFunctionEntry(
			"SessionManager",
			"constructor",
			[config],
			"mcp-session",
		);

		try {
			this.config = config;
			this.logger = config.logger || console;
			this.sessions = new Map();
			this.sessionTimeout = config.sessionTimeout || 3600000; // 1 hour
			this.maxSessions = config.maxSessions || 100;
			this.authConfig = config.auth || {};
			this.cleanupInterval = undefined;

			this.debugLogger.logEvent(
				"SessionManager",
				"session-manager-initialized",
				{
					sessionTimeout: this.sessionTimeout,
					maxSessions: this.maxSessions,
					hasAuthConfig: !!this.authConfig,
					configKeys: Object.keys(config),
				},
				"mcp-session",
			);

			// Start cleanup interval
			this.cleanupInterval = setInterval(() => {
				this.cleanupExpiredSessions();
			}, 300000); // 5 minutes

			this.debugLogger.logEvent(
				"SessionManager",
				"cleanup-interval-started",
				{
					intervalMs: 300000,
				},
				"mcp-session",
			);

			this.debugLogger.logFunctionExit(
				correlationId,
				{ success: true },
				"mcp-session",
			);
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-session");
			throw error;
		}
	}

	createSession(transport: "stdio" | "http" | "websocket"): MCPSession {
		const correlationId = this.debugLogger.logFunctionEntry(
			"SessionManager",
			"createSession",
			[transport],
			"mcp-session",
		);

		try {
			this.debugLogger.logEvent(
				"SessionManager",
				"session-creation-start",
				{
					currentSessionsCount: this.sessions.size,
					maxSessions: this.maxSessions,
					transport,
				},
				"mcp-session",
			);

			if (this.sessions.size >= this.maxSessions) {
				// Clean up expired sessions first
				this.cleanupExpiredSessions();

				// If still at limit, reject
				if (this.sessions.size >= this.maxSessions) {
					const error = new Error(
						`Maximum sessions limit reached: ${this.maxSessions}`,
					);
					this.debugLogger.logEvent(
						"SessionManager",
						"session-limit-reached",
						{
							currentSessions: this.sessions.size,
							maxSessions: this.maxSessions,
						},
						"mcp-session",
					);
					this.debugLogger.logFunctionError(
						correlationId,
						error,
						"mcp-session",
					);
					throw error;
				}
			}

			const sessionId = this.generateSessionId();
			const session: MCPSession = {
				id: sessionId,
				clientInfo: {
					name: "unknown",
					version: "1.0.0",
				},
				protocolVersion: { major: 2024, minor: 11, patch: 5 },
				capabilities: {},
				isInitialized: false,
				createdAt: new Date(),
				lastActivity: new Date(),
				transport,
				authenticated: false,
			};

			this.sessions.set(sessionId, session);

			this.debugLogger.logEvent(
				"SessionManager",
				"session-created",
				{
					sessionId,
					totalSessions: this.sessions.size,
					transport,
				},
				"mcp-session",
			);

			this.debugLogger.logFunctionExit(
				correlationId,
				{ sessionId, success: true },
				"mcp-session",
			);
			return session;
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-session");
			throw error;
		}
	}

	getSession(id: string): MCPSession | undefined {
		const session = this.sessions.get(id);
		if (session && this.isSessionExpired(session)) {
			this.removeSession(id);
			return undefined;
		}
		return session;
	}

	initializeSession(sessionId: string, params: MCPInitializeParams): void {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new MCPError(`Session not found: ${sessionId}`);
		}

		// Validate protocol version
		this.validateProtocolVersion(params.protocolVersion);

		// Update session with initialization params
		session.clientInfo = params.clientInfo;
		session.protocolVersion = params.protocolVersion;
		session.capabilities = params.capabilities;
		session.isInitialized = true;
		session.lastActivity = new Date();

		this.logger.info("Session initialized", {
			sessionId,
			clientInfo: params.clientInfo,
			protocolVersion: params.protocolVersion,
		});
	}

	authenticateSession(sessionId: string, credentials: unknown): boolean {
		try {
			const session = this.sessions.get(sessionId);
			if (!session) {
				return false;
			}

			// Simple authentication - for interface compatibility
			if (credentials && typeof credentials === "object") {
				const creds = credentials as Record<string, unknown>;
				if (creds.token || creds.username) {
					session.authenticated = true;
					session.lastActivity = new Date();
					return true;
				}
			}

			// Default to no authentication required
			session.authenticated = true;
			session.lastActivity = new Date();
			return true;
		} catch (error) {
			return false;
		}
	}

	updateActivity(sessionId: string): void {
		const session = this.getSession(sessionId);
		if (session) {
			session.lastActivity = new Date();
		}
	}

	removeSession(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (session) {
			this.sessions.delete(sessionId);
			this.logger.info("Session removed", {
				sessionId,
				duration: Date.now() - session.createdAt.getTime(),
				transport: session.transport,
			});
		}
	}

	getActiveSessions(): MCPSession[] {
		const activeSessions: MCPSession[] = [];
		for (const session of this.sessions.values()) {
			if (!this.isSessionExpired(session)) {
				activeSessions.push(session);
			}
		}
		return activeSessions;
	}

	cleanupExpiredSessions(): void {
		const correlationId = this.debugLogger.logFunctionEntry(
			"SessionManager",
			"cleanupExpiredSessions",
			[],
			"mcp-session",
		);

		try {
			const now = Date.now();
			const beforeCount = this.sessions.size;
			let cleanedCount = 0;

			this.debugLogger.logEvent(
				"SessionManager",
				"cleanup-start",
				{
					totalSessions: beforeCount,
					sessionTimeout: this.sessionTimeout,
				},
				"mcp-session",
			);

			for (const [sessionId, session] of this.sessions.entries()) {
				if (this.isSessionExpired(session)) {
					this.sessions.delete(sessionId);
					cleanedCount++;

					this.debugLogger.logEvent(
						"SessionManager",
						"session-expired-removed",
						{
							sessionId,
							lastActivity: session.lastActivity,
							ageMs: now - session.lastActivity.getTime(),
						},
						"mcp-session",
					);
				}
			}

			if (cleanedCount > 0) {
				this.debugLogger.logEvent(
					"SessionManager",
					"cleanup-complete",
					{
						sessionsRemoved: cleanedCount,
						sessionsRemaining: this.sessions.size,
						beforeCount,
					},
					"mcp-session",
				);
			}

			this.debugLogger.logFunctionExit(
				correlationId,
				{ cleanedCount, remainingSessions: this.sessions.size },
				"mcp-session",
			);
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-session");
			throw error;
		}
	}

	getSessionMetrics(): {
		total: number;
		active: number;
		authenticated: number;
		expired: number;
	} {
		let active = 0;
		let authenticated = 0;
		let expired = 0;

		for (const session of this.sessions.values()) {
			if (this.isSessionExpired(session)) {
				expired++;
			} else {
				active++;
				if (session.authenticated) {
					authenticated++;
				}
			}
		}

		return {
			total: this.sessions.size,
			active,
			authenticated,
			expired,
		};
	}

	destroy(): void {
		if (this.cleanupInterval) {
			globalTimerRegistry.clear(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
		this.sessions.clear();
	}

	private generateSessionId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 9);
		return `session_${timestamp}_${random}`;
	}

	private isSessionExpired(session: MCPSession): boolean {
		const now = Date.now();
		const sessionAge = now - session.lastActivity.getTime();
		return sessionAge > this.sessionTimeout;
	}

	private validateProtocolVersion(version: MCPProtocolVersion): void {
		// Currently supporting MCP version 2024-11-05
		const supportedVersions = [{ major: 2024, minor: 11, patch: 5 }];

		const isSupported = supportedVersions.some(
			(supported) =>
				supported.major === version.major &&
				supported.minor === version.minor &&
				supported.patch === version.patch,
		);

		if (!isSupported) {
			throw new MCPError(
				`Unsupported protocol version: ${version.major}.${version.minor}.${version.patch}`,
				{ supportedVersions },
			);
		}
	}

	private extractToken(credentials: unknown): string | null {
		if (typeof credentials === "string") {
			return credentials;
		}

		if (typeof credentials === "object" && credentials !== null) {
			const creds = credentials as Record<string, unknown>;
			if (typeof creds.token === "string") {
				return creds.token;
			}
			if (typeof creds.authorization === "string") {
				const match = creds.authorization.match(/^Bearer\s+(.+)$/);
				return match ? match[1] : null;
			}
		}

		return null;
	}

	private extractBasicAuth(credentials: unknown): {
		username?: string;
		password?: string;
	} {
		if (typeof credentials === "object" && credentials !== null) {
			const creds = credentials as Record<string, unknown>;

			if (
				typeof creds.username === "string" &&
				typeof creds.password === "string"
			) {
				return {
					username: creds.username,
					password: creds.password,
				};
			}

			if (typeof creds.authorization === "string") {
				const match = creds.authorization.match(/^Basic\s+(.+)$/);
				if (match) {
					try {
						const decoded = atob(match[1]);
						const [username, password] = decoded.split(":", 2);
						return { username, password };
					} catch {
						return {};
					}
				}
			}
		}

		return {};
	}

	private extractAuthData(credentials: unknown): any {
		if (typeof credentials === "object" && credentials !== null) {
			const creds = credentials as Record<string, unknown>;
			return {
				token: this.extractToken(credentials),
				user: creds.username || creds.user,
				permissions: creds.permissions || [],
			};
		}
		return {};
	}

	private hashPassword(password: string): string {
		return createHash("sha256").update(password).digest("hex");
	}
}
