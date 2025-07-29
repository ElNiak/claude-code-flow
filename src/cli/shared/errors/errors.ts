import { getErrorMessage as _getErrorMessage } from "../cli/shared/errors/error-handler.js";
/**
 * Custom error types for Claude-Flow
 */

/**
 * Base error class for all Claude-Flow errors
 */
export class ClaudeFlowError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "ClaudeFlowError";
		Error.captureStackTrace(this, this.constructor);
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			details: this.details,
			stack: this.stack,
		};
	}
}

/**
 * Terminal-related errors
 */
export class TerminalError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "TERMINAL_ERROR", details);
		this.name = "TerminalError";
	}
}

export class TerminalSpawnError extends TerminalError {
	override readonly code = "TERMINAL_SPAWN_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

export class TerminalCommandError extends TerminalError {
	override readonly code = "TERMINAL_COMMAND_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

/**
 * Memory-related errors
 */
export class MemoryError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "MEMORY_ERROR", details);
		this.name = "MemoryError";
	}
}

export class MemoryBackendError extends MemoryError {
	override readonly code = "MEMORY_BACKEND_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

export class MemoryConflictError extends MemoryError {
	override readonly code = "MEMORY_CONFLICT_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

/**
 * Coordination-related errors
 */
export class CoordinationError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "COORDINATION_ERROR", details);
		this.name = "CoordinationError";
	}
}

export class DeadlockError extends CoordinationError {
	override readonly code = "DEADLOCK_ERROR";

	constructor(
		message: string,
		public readonly agents: string[],
		public readonly resources: string[],
	) {
		super(message, { agents, resources });
	}
}

export class ResourceLockError extends CoordinationError {
	override readonly code = "RESOURCE_LOCK_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

/**
 * MCP-related errors
 */
export class MCPError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "MCP_ERROR", details);
		this.name = "MCPError";
	}
}

export class MCPTransportError extends MCPError {
	override readonly code = "MCP_TRANSPORT_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

export class MCPMethodNotFoundError extends MCPError {
	override readonly code = "MCP_METHOD_NOT_FOUND";

	constructor(method: string) {
		super(`Method not found: ${method}`, { method });
	}
}

/**
 * Configuration errors
 */
export class ConfigError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "CONFIG_ERROR", details);
		this.name = "ConfigError";
	}
}

export class ValidationError extends ConfigError {
	override readonly code = "VALIDATION_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

/**
 * Task-related errors
 */
export class TaskError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "TASK_ERROR", details);
		this.name = "TaskError";
	}
}

export class TaskTimeoutError extends TaskError {
	override readonly code = "TASK_TIMEOUT_ERROR";

	constructor(taskId: string, timeout: number) {
		super(`Task ${taskId} timed out after ${timeout}ms`, { taskId, timeout });
	}
}

export class TaskDependencyError extends TaskError {
	override readonly code = "TASK_DEPENDENCY_ERROR";

	constructor(taskId: string, dependencies: string[]) {
		super(`Task ${taskId} has unmet dependencies`, { taskId, dependencies });
	}
}

/**
 * System errors
 */
export class SystemError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "SYSTEM_ERROR", details);
		this.name = "SystemError";
	}
}

export class InitializationError extends SystemError {
	override readonly code = "INITIALIZATION_ERROR";

	constructor(componentOrMessage: string, details?: unknown) {
		// If the message already contains the word "initialize", use it as-is,
		const message = componentOrMessage.includes("initialize")
			? componentOrMessage
			: `Failed to initialize ${componentOrMessage}`;
		super(
			message,
			details
				? {
						component: componentOrMessage,
						...(details as Record<string, unknown>),
					}
				: { component: componentOrMessage },
		);
	}
}

export class ShutdownError extends SystemError {
	override readonly code = "SHUTDOWN_ERROR";

	constructor(message: string, details?: unknown) {
		super(message, details);
	}
}

/**
 * Integration-related errors
 */
export class IntegrationError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "INTEGRATION_ERROR", details);
		this.name = "IntegrationError";
	}
}

export class HookError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "HOOK_ERROR", details);
		this.name = "HookError";
	}
}

export class GitHubError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "GITHUB_ERROR", details);
		this.name = "GitHubError";
	}
}

export class OrchestratorError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "ORCHESTRATOR_ERROR", details);
		this.name = "OrchestratorError";
	}
}

export class AgentError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "AGENT_ERROR", details);
		this.name = "AgentError";
	}
}

export class NetworkError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "NETWORK_ERROR", details);
		this.name = "NetworkError";
	}
}

export class TimeoutError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "TIMEOUT_ERROR", details);
		this.name = "TimeoutError";
	}
}

export class AuthError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "AUTH_ERROR", details);
		this.name = "AuthError";
	}
}

export class ResourceError extends ClaudeFlowError {
	constructor(message: string, details?: unknown) {
		super(message, "RESOURCE_ERROR", details);
		this.name = "ResourceError";
	}
}

/**
 * Error aggregation for multiple errors
 */
export class AggregateError extends ClaudeFlowError {
	public readonly errors: Error[];

	constructor(errors: Error[], message = "Multiple errors occurred") {
		const errorMessages = errors.map((err) => err.message).join("; ");
		super(`${message}: ${errorMessages}`, "AGGREGATE_ERROR", {
			errorCount: errors.length,
			errorCodes: errors.map((err) => getErrorCode(err)),
		});
		this.name = "AggregateError";
		this.errors = errors;
	}
}

/**
 * Error utilities
 */
export function isClaudeFlowError(error: unknown): error is ClaudeFlowError {
	return error instanceof ClaudeFlowError;
}

export function formatError(error: unknown): string {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}`;
	}
	return String(error);
}

export function getErrorDetails(error: unknown): unknown {
	if (isClaudeFlowError(error)) {
		return error.details;
	}
	return undefined;
}

export function getErrorCode(error: unknown): string {
	if (isClaudeFlowError(error)) {
		return error.code;
	}
	if (error instanceof Error) {
		return error.constructor.name;
	}
	return "UNKNOWN_ERROR";
}

export function getErrorContext(
	error: unknown,
): Record<string, unknown> | undefined {
	if (isClaudeFlowError(error)) {
		return error.details as Record<string, unknown>;
	}
	return undefined;
}

/**
 * Error retry utilities
 */
export function isRetryableError(error: unknown): boolean {
	if (isClaudeFlowError(error)) {
		return [
			"NETWORK_ERROR",
			"TIMEOUT_ERROR",
			"RESOURCE_ERROR",
			"MCP_TRANSPORT_ERROR",
		].includes(error.code);
	}
	return false;
}

export function getRetryDelay(attempt: number, baseDelay = 1000): number {
	// Exponential backoff with jitter,
	const delay = baseDelay * 2 ** (attempt - 1);
	const jitter = Math.random() * 0.1 * delay;
	return Math.min(delay + jitter, 30000); // Max 30 seconds
}

/**
 * Error logging helper
 */
export function formatErrorForLogging(error: unknown): Record<string, unknown> {
	if (isClaudeFlowError(error)) {
		return {
			name: error.name,
			message: error.message,
			code: error.code,
			details: error.details,
			stack: error.stack,
		};
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return {
		error: String(error),
		type: typeof error,
	};
}

/**
 * Error recovery utilities
 */
export interface ErrorRecoveryStrategy {
	canRecover(error: unknown): boolean;
	recover(error: unknown): Promise<void>;
}

export class DefaultErrorRecoveryStrategy implements ErrorRecoveryStrategy {
	canRecover(error: unknown): boolean {
		return isRetryableError(error);
	}

	async recover(error: unknown): Promise<void> {
		// Default recovery: wait and retry,
		const delay = getRetryDelay(1);
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
}

/**
 * Error boundary for async operations
 */
export async function withErrorBoundary<T>(
	operation: () => Promise<T>,
	recovery?: ErrorRecoveryStrategy,
	maxRetries = 3,
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			if (attempt === maxRetries || !recovery?.canRecover(error)) {
				throw error;
			}

			try {
				await recovery.recover(error);
			} catch (recoveryError) {
				throw new AggregateError([error as Error, recoveryError as Error]);
			}
		}
	}

	throw lastError;
}
