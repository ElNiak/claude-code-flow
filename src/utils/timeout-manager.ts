import { getErrorMessage as _getErrorMessage } from "./error-handler.js";
/**
 * Timeout Manager for long-running operations
 */

import type { ILogger } from "../core/logger.js";
import {
	EnhancedErrorHandler,
	ErrorSeverity,
} from "./enhanced-error-handler.js";

export interface TimeoutOptions {
	timeout: number;
	retries?: number;
	retryDelay?: number;
	onTimeout?: (operation: string, attempt: number) => void;
	onRetry?: (operation: string, attempt: number, error: Error) => void;
}

export interface TimeoutMetrics {
	totalOperations: number;
	timedOutOperations: number;
	retriedOperations: number;
	averageExecutionTime: number;
	operationsByType: Map<
		string,
		{
			count: number;
			timeouts: number;
			averageTime: number;
		}
	>;
}

export class TimeoutManager {
	private activeOperations = new Map<
		string,
		{
			startTime: number;
			timeout: NodeJS.Timeout;
			operation: string;
			promise: Promise<any>;
		}
	>();

	private metrics: TimeoutMetrics = {
		totalOperations: 0,
		timedOutOperations: 0,
		retriedOperations: 0,
		averageExecutionTime: 0,
		operationsByType: new Map(),
	};

	private totalExecutionTime = 0;

	constructor(
		private logger: ILogger,
		private errorHandler?: EnhancedErrorHandler
	) {}

	/**
	 * Execute operation with timeout and retry logic
	 */
	async executeWithTimeout<T>(
		operation: () => Promise<T>,
		operationName: string,
		options: TimeoutOptions
	): Promise<T> {
		const {
			timeout,
			retries = 0,
			retryDelay = 1000,
			onTimeout,
			onRetry,
		} = options;

		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retries; attempt++) {
			const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const startTime = Date.now();

			try {
				const result = await this.executeOperation(
					operation,
					operationId,
					operationName,
					timeout,
					startTime
				);

				// Update metrics on success
				this.updateMetrics(operationName, Date.now() - startTime, false);

				return result;
			} catch (error) {
				lastError = error as Error;

				// Update metrics on failure
				this.updateMetrics(operationName, Date.now() - startTime, true);

				if (lastError.message.includes("timeout")) {
					if (onTimeout) {
						onTimeout(operationName, attempt);
					}

					this.logger.warn("Operation timed out", {
						operation: operationName,
						attempt,
						timeout,
						operationId,
					});
				}

				// If this is the last attempt or error is not retryable, throw
				if (attempt === retries || !this.isRetryableError(lastError)) {
					throw lastError;
				}

				// Notify retry
				if (onRetry) {
					onRetry(operationName, attempt, lastError);
				}

				this.metrics.retriedOperations++;

				this.logger.info("Retrying operation", {
					operation: operationName,
					attempt,
					delay: retryDelay,
					error: lastError.message,
				});

				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			}
		}

		throw lastError || new Error("Operation failed after all retries");
	}

	/**
	 * Execute operation with abort controller for better cancellation
	 */
	async executeWithAbort<T>(
		operation: (abortSignal: AbortSignal) => Promise<T>,
		operationName: string,
		timeout: number
	): Promise<T> {
		const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const startTime = Date.now();
		const abortController = new AbortController();

		// Set up timeout
		const timeoutId = setTimeout(() => {
			abortController.abort();
			this.logger.warn("Operation aborted due to timeout", {
				operation: operationName,
				timeout,
				operationId,
			});
		}, timeout);

		try {
			const result = await operation(abortController.signal);

			// Clear timeout on success
			clearTimeout(timeoutId);

			// Update metrics
			this.updateMetrics(operationName, Date.now() - startTime, false);

			return result;
		} catch (error) {
			clearTimeout(timeoutId);

			// Update metrics
			this.updateMetrics(operationName, Date.now() - startTime, true);

			if (abortController.signal.aborted) {
				throw new Error(
					`Operation '${operationName}' timed out after ${timeout}ms`
				);
			}

			throw error;
		}
	}

	/**
	 * Execute multiple operations with individual timeouts
	 */
	async executeMultipleWithTimeout<T>(
		operations: Array<{
			operation: () => Promise<T>;
			name: string;
			timeout: number;
		}>,
		options: {
			mode: "parallel" | "sequential";
			failFast?: boolean;
			retries?: number;
		} = { mode: "parallel" }
	): Promise<T[]> {
		const { mode, failFast = true, retries = 0 } = options;

		if (mode === "parallel") {
			const promises = operations.map(({ operation, name, timeout }) =>
				this.executeWithTimeout(operation, name, { timeout, retries })
			);

			if (failFast) {
				return Promise.all(promises);
			} else {
				const results = await Promise.allSettled(promises);
				return results.map((result) => {
					if (result.status === "fulfilled") {
						return result.value;
					} else {
						throw result.reason;
					}
				});
			}
		} else {
			// Sequential execution
			const results: T[] = [];

			for (const { operation, name, timeout } of operations) {
				try {
					const result = await this.executeWithTimeout(operation, name, {
						timeout,
						retries,
					});
					results.push(result);
				} catch (error) {
					if (failFast) {
						throw error;
					}
					// Continue with next operation on failure
				}
			}

			return results;
		}
	}

	/**
	 * Create a timeout wrapper for a function
	 */
	createTimeoutWrapper<T extends (...args: any[]) => Promise<any>>(
		fn: T,
		operationName: string,
		defaultTimeout: number
	): T {
		return (async (...args: any[]) => {
			return this.executeWithTimeout(() => fn(...args), operationName, {
				timeout: defaultTimeout,
			});
		}) as T;
	}

	/**
	 * Cancel a specific operation
	 */
	cancelOperation(operationId: string): boolean {
		const operation = this.activeOperations.get(operationId);
		if (!operation) {
			return false;
		}

		clearTimeout(operation.timeout);
		this.activeOperations.delete(operationId);

		this.logger.info("Operation cancelled", {
			operationId,
			operation: operation.operation,
			duration: Date.now() - operation.startTime,
		});

		return true;
	}

	/**
	 * Cancel all active operations
	 */
	cancelAllOperations(): void {
		const operationIds = Array.from(this.activeOperations.keys());

		for (const operationId of operationIds) {
			this.cancelOperation(operationId);
		}

		this.logger.info("All operations cancelled", {
			count: operationIds.length,
		});
	}

	/**
	 * Get timeout metrics
	 */
	getMetrics(): TimeoutMetrics {
		return {
			totalOperations: this.metrics.totalOperations,
			timedOutOperations: this.metrics.timedOutOperations,
			retriedOperations: this.metrics.retriedOperations,
			averageExecutionTime: this.metrics.averageExecutionTime,
			operationsByType: new Map(this.metrics.operationsByType),
		};
	}

	/**
	 * Get active operations count
	 */
	getActiveOperationsCount(): number {
		return this.activeOperations.size;
	}

	/**
	 * Get active operations details
	 */
	getActiveOperations(): Array<{
		id: string;
		operation: string;
		startTime: number;
		duration: number;
	}> {
		const now = Date.now();
		return Array.from(this.activeOperations.entries()).map(([id, op]) => ({
			id,
			operation: op.operation,
			startTime: op.startTime,
			duration: now - op.startTime,
		}));
	}

	/**
	 * Reset metrics
	 */
	resetMetrics(): void {
		this.metrics = {
			totalOperations: 0,
			timedOutOperations: 0,
			retriedOperations: 0,
			averageExecutionTime: 0,
			operationsByType: new Map(),
		};
		this.totalExecutionTime = 0;
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.cancelAllOperations();
		this.resetMetrics();
	}

	private async executeOperation<T>(
		operation: () => Promise<T>,
		operationId: string,
		operationName: string,
		timeout: number,
		startTime: number
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			// Set up timeout
			const timeoutId = setTimeout(() => {
				this.activeOperations.delete(operationId);
				reject(
					new Error(`Operation '${operationName}' timed out after ${timeout}ms`)
				);
			}, timeout);

			// Execute operation
			const operationPromise = operation();

			// Store active operation
			this.activeOperations.set(operationId, {
				startTime,
				timeout: timeoutId,
				operation: operationName,
				promise: operationPromise,
			});

			// Handle resolution
			operationPromise
				.then((result) => {
					clearTimeout(timeoutId);
					this.activeOperations.delete(operationId);
					resolve(result);
				})
				.catch((error) => {
					clearTimeout(timeoutId);
					this.activeOperations.delete(operationId);
					reject(error);
				});
		});
	}

	private updateMetrics(
		operationName: string,
		duration: number,
		timedOut: boolean
	): void {
		this.metrics.totalOperations++;
		this.totalExecutionTime += duration;
		this.metrics.averageExecutionTime =
			this.totalExecutionTime / this.metrics.totalOperations;

		if (timedOut) {
			this.metrics.timedOutOperations++;
		}

		// Update operation-specific metrics
		let operationMetrics = this.metrics.operationsByType.get(operationName);
		if (!operationMetrics) {
			operationMetrics = {
				count: 0,
				timeouts: 0,
				averageTime: 0,
			};
			this.metrics.operationsByType.set(operationName, operationMetrics);
		}

		operationMetrics.count++;
		operationMetrics.averageTime =
			(operationMetrics.averageTime * (operationMetrics.count - 1) + duration) /
			operationMetrics.count;

		if (timedOut) {
			operationMetrics.timeouts++;
		}
	}

	private isRetryableError(error: Error): boolean {
		// Common retryable error patterns
		const retryablePatterns = [
			/timeout/i,
			/connection/i,
			/network/i,
			/temporarily unavailable/i,
			/rate limit/i,
			/service unavailable/i,
		];

		const message = error.message || "";
		return retryablePatterns.some((pattern) => pattern.test(message));
	}
}

/**
 * Global timeout manager instance
 */
let globalTimeoutManager: TimeoutManager | null = null;

export function initializeGlobalTimeoutManager(
	logger: ILogger,
	errorHandler?: EnhancedErrorHandler
): TimeoutManager {
	if (!globalTimeoutManager) {
		globalTimeoutManager = new TimeoutManager(logger, errorHandler);
	}
	return globalTimeoutManager;
}

export function getGlobalTimeoutManager(): TimeoutManager {
	if (!globalTimeoutManager) {
		throw new Error("Global timeout manager not initialized");
	}
	return globalTimeoutManager;
}

/**
 * Decorator for automatic timeout handling
 */
export function withTimeout(
	timeoutMs: number,
	options: {
		retries?: number;
		operationName?: string;
	} = {}
) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value;
		const operationName =
			options.operationName || `${target.constructor.name}.${propertyKey}`;

		descriptor.value = async function (...args: any[]) {
			const timeoutManager = getGlobalTimeoutManager();

			return timeoutManager.executeWithTimeout(
				() => originalMethod.apply(this, args),
				operationName,
				{ timeout: timeoutMs, retries: options.retries || 0 }
			);
		};

		return descriptor;
	};
}
