// import { getErrorMessage as _getErrorMessage } from "./error-handler.js";
/**
 * Enhanced Error Handler with consistent error patterns and recovery strategies
 */

import type { ILogger } from "../core/logger.js";
import { debugLogger } from "./debug-logger.js";
import { SystemEvents } from "./types.js";

export interface ErrorContext {
	operation: string;
	component: string;
	metadata?: Record<string, any>;
	userId?: string;
	sessionId?: string;
	timestamp: Date;
}

export interface ErrorRecoveryStrategy {
	name: string;
	priority: number;
	canHandle: (error: Error, context: ErrorContext) => boolean;
	execute: (error: Error, context: ErrorContext) => Promise<boolean>;
}

export interface ErrorMetrics {
	total: number;
	byType: Map<string, number>;
	byComponent: Map<string, number>;
	byOperation: Map<string, number>;
	recoveryAttempts: number;
	recoverySuccesses: number;
	criticalErrors: number;
}

export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

export interface EnhancedError extends Error {
	readonly id: string;
	readonly severity: ErrorSeverity;
	readonly context: ErrorContext;
	readonly retryable: boolean;
	readonly recoveryAttempts: number;
	readonly originalError?: Error;
	readonly stackTrace?: string;
	readonly userMessage?: string;
}

/**
 * Enhanced Error Handler with consistent patterns and recovery
 */
export class EnhancedErrorHandler {
	private recoveryStrategies: ErrorRecoveryStrategy[] = [];
	private metrics: ErrorMetrics = {
		total: 0,
		byType: new Map(),
		byComponent: new Map(),
		byOperation: new Map(),
		recoveryAttempts: 0,
		recoverySuccesses: 0,
		criticalErrors: 0,
	};
	private circuitBreakers = new Map<
		string,
		{
			failures: number;
			lastFailure: Date;
			isOpen: boolean;
		}
	>();

	constructor(
		private logger: ILogger,
		private eventBus?: any,
	) {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedErrorHandler",
			"constructor",
			[logger, eventBus],
			"utils-error",
		);
		try {
			this.registerDefaultRecoveryStrategies();
			debugLogger.logFunctionExit(
				correlationId,
				"EnhancedErrorHandler initialized",
				"utils-error",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "utils-error");
			throw error;
		}
	}

	/**
	 * Create a standardized error with consistent structure
	 */
	createError(
		message: string,
		context: ErrorContext,
		severity: ErrorSeverity = ErrorSeverity.MEDIUM,
		originalError?: Error,
		userMessage?: string,
	): EnhancedError {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedErrorHandler",
			"createError",
			[message, context, severity, originalError, userMessage],
			"utils-error",
		);
		try {
			const error = new Error(message) as EnhancedError;

			// Add enhanced properties
			Object.defineProperty(error, "id", {
				value: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				writable: false,
				enumerable: true,
			});

			Object.defineProperty(error, "severity", {
				value: severity,
				writable: false,
				enumerable: true,
			});

			Object.defineProperty(error, "context", {
				value: context,
				writable: false,
				enumerable: true,
			});

			Object.defineProperty(error, "retryable", {
				value: this.isRetryableError(originalError || error),
				writable: false,
				enumerable: true,
			});

			Object.defineProperty(error, "recoveryAttempts", {
				value: 0,
				writable: true,
				enumerable: true,
			});

			if (originalError) {
				Object.defineProperty(error, "originalError", {
					value: originalError,
					writable: false,
					enumerable: true,
				});
			}

			Object.defineProperty(error, "stackTrace", {
				value: error.stack,
				writable: false,
				enumerable: true,
			});

			if (userMessage) {
				Object.defineProperty(error, "userMessage", {
					value: userMessage,
					writable: false,
					enumerable: true,
				});
			}

			debugLogger.logFunctionExit(
				correlationId,
				`Error created: ${error.id}`,
				"utils-error",
			);
			return error;
		} catch (innerError) {
			debugLogger.logFunctionError(correlationId, innerError, "utils-error");
			throw innerError;
		}
	}

	/**
	 * Handle error with recovery strategies and consistent logging
	 */
	async handleError(error: Error, context: ErrorContext): Promise<boolean> {
		return await debugLogger.logAsyncFunction(
			"EnhancedErrorHandler",
			"handleError",
			async () => {
				// Create enhanced error if needed
				const enhancedError = this.isEnhancedError(error)
					? (error as EnhancedError)
					: this.createError(
							error.message,
							context,
							ErrorSeverity.MEDIUM,
							error,
						);

				// Update metrics
				this.updateMetrics(enhancedError);

				// Check circuit breaker
				const circuitKey = `${context.component}:${context.operation}`;
				if (this.isCircuitOpen(circuitKey)) {
					this.logger.warn("Circuit breaker open, skipping operation", {
						error: enhancedError.id,
						circuit: circuitKey,
						context,
					});
					return false;
				}

				// Log error consistently
				this.logError(enhancedError);

				// Emit system event
				if (this.eventBus) {
					this.eventBus.emit(SystemEvents.SYSTEM_ERROR, {
						error: enhancedError,
						context,
						timestamp: new Date(),
					});
				}

				// Attempt recovery
				const recovered = await this.attemptRecovery(enhancedError);

				// Update circuit breaker
				this.updateCircuitBreaker(circuitKey, !recovered);

				return recovered;
			},
			[error, context],
			"utils-error",
		);
	}

	/**
	 * Wrap async operations with consistent error handling
	 */
	async withErrorHandling<T>(
		operation: () => Promise<T>,
		context: ErrorContext,
		options: {
			retries?: number;
			timeout?: number;
			fallback?: () => Promise<T>;
		} = {},
	): Promise<T> {
		const { retries = 3, timeout = 30000, fallback } = options;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				// Add timeout if specified
				if (timeout > 0) {
					return await Promise.race([
						operation(),
						new Promise<never>((_, reject) =>
							setTimeout(() => reject(new Error("Operation timeout")), timeout),
						),
					]);
				}

				return await operation();
			} catch (error) {
				const isLastAttempt = attempt === retries;

				// Create enhanced error
				const enhancedError = this.createError(
					`Operation failed: ${error instanceof Error ? error.message : String(error)}`,
					{ ...context, metadata: { ...context.metadata, attempt } },
					isLastAttempt ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
					error instanceof Error ? error : undefined,
				);

				// Handle error
				const recovered = await this.handleError(enhancedError, context);

				if (recovered || isLastAttempt) {
					if (!recovered && fallback) {
						try {
							return await fallback();
						} catch (fallbackError) {
							throw this.createError(
								"Both operation and fallback failed",
								context,
								ErrorSeverity.CRITICAL,
								fallbackError instanceof Error ? fallbackError : undefined,
							);
						}
					}

					if (!recovered) {
						throw enhancedError;
					}
				}

				// Wait before retry
				if (!isLastAttempt) {
					await new Promise((resolve) =>
						setTimeout(resolve, 2 ** attempt * 1000),
					);
				}
			}
		}

		throw this.createError(
			"Operation failed after all retries",
			context,
			ErrorSeverity.CRITICAL,
		);
	}

	/**
	 * Register a recovery strategy
	 */
	registerRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
		const correlationId = debugLogger.logFunctionEntry(
			"EnhancedErrorHandler",
			"registerRecoveryStrategy",
			[strategy],
			"utils-error",
		);
		try {
			this.recoveryStrategies.push(strategy);
			this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
			debugLogger.logFunctionExit(
				correlationId,
				`Strategy '${strategy.name}' registered`,
				"utils-error",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "utils-error");
			throw error;
		}
	}

	/**
	 * Get error metrics
	 */
	getMetrics(): ErrorMetrics {
		return debugLogger.logSyncFunction(
			"EnhancedErrorHandler",
			"getMetrics",
			() => {
				return {
					total: this.metrics.total,
					byType: new Map(this.metrics.byType),
					byComponent: new Map(this.metrics.byComponent),
					byOperation: new Map(this.metrics.byOperation),
					recoveryAttempts: this.metrics.recoveryAttempts,
					recoverySuccesses: this.metrics.recoverySuccesses,
					criticalErrors: this.metrics.criticalErrors,
				};
			},
			[],
			"utils-error",
		);
	}

	/**
	 * Reset metrics
	 */
	resetMetrics(): void {
		this.metrics = {
			total: 0,
			byType: new Map(),
			byComponent: new Map(),
			byOperation: new Map(),
			recoveryAttempts: 0,
			recoverySuccesses: 0,
			criticalErrors: 0,
		};
	}

	private isEnhancedError(error: Error): boolean {
		return "id" in error && "severity" in error && "context" in error;
	}

	private isRetryableError(error: Error): boolean {
		// Common retryable error patterns
		const retryablePatterns = [
			/timeout/i,
			/connection/i,
			/network/i,
			/ECONNRESET/i,
			/ECONNREFUSED/i,
			/ETIMEDOUT/i,
			/temporarily unavailable/i,
			/rate limit/i,
			/circuit.*open/i,
		];

		const message = error.message || "";
		return retryablePatterns.some((pattern) => pattern.test(message));
	}

	private updateMetrics(error: EnhancedError): void {
		this.metrics.total++;

		// By type
		const errorType = error.constructor.name;
		this.metrics.byType.set(
			errorType,
			(this.metrics.byType.get(errorType) || 0) + 1,
		);

		// By component
		const component = error.context.component;
		this.metrics.byComponent.set(
			component,
			(this.metrics.byComponent.get(component) || 0) + 1,
		);

		// By operation
		const operation = error.context.operation;
		this.metrics.byOperation.set(
			operation,
			(this.metrics.byOperation.get(operation) || 0) + 1,
		);

		// Critical errors
		if (error.severity === ErrorSeverity.CRITICAL) {
			this.metrics.criticalErrors++;
		}
	}

	private logError(error: EnhancedError): void {
		const logLevel = this.getLogLevel(error.severity);
		const logData = {
			errorId: error.id,
			message: error.message,
			severity: error.severity,
			context: error.context,
			retryable: error.retryable,
			recoveryAttempts: error.recoveryAttempts,
			stack: error.stackTrace,
			originalError: error.originalError?.message,
		};

		switch (logLevel) {
			case "error":
				this.logger.error("System error occurred", logData);
				break;
			case "warn":
				this.logger.warn("System warning", logData);
				break;
			case "info":
				this.logger.info("System event", logData);
				break;
			default:
				this.logger.debug("System debug", logData);
		}
	}

	private getLogLevel(
		severity: ErrorSeverity,
	): "error" | "warn" | "info" | "debug" {
		switch (severity) {
			case ErrorSeverity.CRITICAL:
			case ErrorSeverity.HIGH:
				return "error";
			case ErrorSeverity.MEDIUM:
				return "warn";
			case ErrorSeverity.LOW:
				return "info";
			default:
				return "debug";
		}
	}

	private async attemptRecovery(error: EnhancedError): Promise<boolean> {
		this.metrics.recoveryAttempts++;

		for (const strategy of this.recoveryStrategies) {
			if (strategy.canHandle(error, error.context)) {
				try {
					const success = await strategy.execute(error, error.context);
					if (success) {
						this.metrics.recoverySuccesses++;
						this.logger.info("Error recovery successful", {
							errorId: error.id,
							strategy: strategy.name,
							context: error.context,
						});
						return true;
					}
				} catch (recoveryError) {
					this.logger.warn("Recovery strategy failed", {
						errorId: error.id,
						strategy: strategy.name,
						recoveryError:
							recoveryError instanceof Error
								? recoveryError.message
								: String(recoveryError),
					});
				}
			}
		}

		return false;
	}

	private isCircuitOpen(circuitKey: string): boolean {
		const circuit = this.circuitBreakers.get(circuitKey);
		if (!circuit) return false;

		// Reset circuit after timeout
		if (circuit.isOpen && Date.now() - circuit.lastFailure.getTime() > 60000) {
			circuit.isOpen = false;
			circuit.failures = 0;
		}

		return circuit.isOpen;
	}

	private updateCircuitBreaker(circuitKey: string, failed: boolean): void {
		let circuit = this.circuitBreakers.get(circuitKey);
		if (!circuit) {
			circuit = { failures: 0, lastFailure: new Date(), isOpen: false };
			this.circuitBreakers.set(circuitKey, circuit);
		}

		if (failed) {
			circuit.failures++;
			circuit.lastFailure = new Date();

			// Open circuit after 5 failures
			if (circuit.failures >= 5) {
				circuit.isOpen = true;
				this.logger.warn("Circuit breaker opened", { circuit: circuitKey });
			}
		} else {
			circuit.failures = 0;
			circuit.isOpen = false;
		}
	}

	private registerDefaultRecoveryStrategies(): void {
		// Database connection recovery
		this.registerRecoveryStrategy({
			name: "database-reconnect",
			priority: 100,
			canHandle: (error, context) => {
				return (
					context.component.includes("database") ||
					context.component.includes("sqlite") ||
					error.message.includes("database")
				);
			},
			execute: async (error, context) => {
				// Implement database reconnection logic
				this.logger.info("Attempting database reconnection", {
					errorId: (error as EnhancedError).id,
					context,
				});

				// Simulate recovery attempt
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Return success if connection issues are resolved
				return Math.random() > 0.3; // 70% success rate for demo
			},
		});

		// Network retry recovery
		this.registerRecoveryStrategy({
			name: "network-retry",
			priority: 90,
			canHandle: (error, context) => {
				return (
					error.message.includes("network") ||
					error.message.includes("connection") ||
					error.message.includes("timeout")
				);
			},
			execute: async (error, context) => {
				this.logger.info("Attempting network retry", {
					errorId: (error as EnhancedError).id,
					context,
				});

				// Exponential backoff
				const delay = Math.min(
					1000 * 2 ** (error as EnhancedError).recoveryAttempts,
					10000,
				);
				await new Promise((resolve) => setTimeout(resolve, delay));

				return Math.random() > 0.5; // 50% success rate for demo
			},
		});

		// Memory cleanup recovery
		this.registerRecoveryStrategy({
			name: "memory-cleanup",
			priority: 80,
			canHandle: (error, context) => {
				return (
					error.message.includes("memory") ||
					error.message.includes("heap") ||
					context.operation.includes("memory")
				);
			},
			execute: async (error, context) => {
				this.logger.info("Attempting memory cleanup", {
					errorId: (error as EnhancedError).id,
					context,
				});

				// Force garbage collection if available
				if (global.gc) {
					global.gc();
				}

				return true;
			},
		});
	}
}

/**
 * Global error handler instance
 */
let globalErrorHandler: EnhancedErrorHandler | null = null;

export function initializeGlobalErrorHandler(
	logger: ILogger,
	eventBus?: any,
): EnhancedErrorHandler {
	if (!globalErrorHandler) {
		globalErrorHandler = new EnhancedErrorHandler(logger, eventBus);
	}
	return globalErrorHandler;
}

export function getGlobalErrorHandler(): EnhancedErrorHandler {
	if (!globalErrorHandler) {
		throw new Error("Global error handler not initialized");
	}
	return globalErrorHandler;
}

/**
 * Decorator for automatic error handling
 */
export function withErrorHandling(
	context: Partial<ErrorContext>,
	options: {
		retries?: number;
		timeout?: number;
		severity?: ErrorSeverity;
	} = {},
) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const errorHandler = getGlobalErrorHandler();
			const fullContext: ErrorContext = {
				operation: propertyKey,
				component: target.constructor.name,
				timestamp: new Date(),
				...context,
			};

			return errorHandler.withErrorHandling(
				() => originalMethod.apply(this, args),
				fullContext,
				options,
			);
		};

		return descriptor;
	};
}
