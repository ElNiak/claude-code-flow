/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by monitoring operation success rates
 */

export interface CircuitBreakerOptions {
	failureThreshold: number;
	resetTimeout: number;
	successThreshold: number;
	monitoringWindow: number;
}

export interface CircuitBreakerMetrics {
	state: CircuitBreakerState;
	failures: number;
	successes: number;
	totalOperations: number;
	failureRate: number;
	lastFailureTime: number;
	lastSuccessTime: number;
	stateChanges: number;
}

export enum CircuitBreakerState {
	CLOSED = 'CLOSED',
	OPEN = 'OPEN',
	HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
	private failures = 0;
	private successes = 0;
	private totalOperations = 0;
	private lastFailureTime = 0;
	private lastSuccessTime = 0;
	private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
	private stateChanges = 0;
	private halfOpenSuccesses = 0;
	private recentOperations: { timestamp: number; success: boolean }[] = [];

	constructor(
		private name: string,
		private options: CircuitBreakerOptions = {
			failureThreshold: 5,
			resetTimeout: 60000, // 1 minute
			successThreshold: 2,
			monitoringWindow: 300000 // 5 minutes
		}
	) {}

	/**
	 * Execute operation with circuit breaker protection
	 */
	async execute<T>(operation: () => Promise<T>): Promise<T> {
		// Check if circuit should be opened
		if (this.state === CircuitBreakerState.OPEN) {
			if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
				this.transitionToHalfOpen();
			} else {
				throw new Error(`Circuit breaker is OPEN for ${this.name}`);
			}
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	/**
	 * Execute operation with timeout and circuit breaker protection
	 */
	async executeWithTimeout<T>(
		operation: () => Promise<T>,
		timeoutMs: number
	): Promise<T> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Operation timed out after ${timeoutMs}ms`));
			}, timeoutMs);
		});

		return this.execute(() => Promise.race([operation(), timeoutPromise]));
	}

	/**
	 * Check if circuit breaker allows execution
	 */
	canExecute(): boolean {
		if (this.state === CircuitBreakerState.CLOSED) {
			return true;
		}

		if (this.state === CircuitBreakerState.HALF_OPEN) {
			return true;
		}

		if (this.state === CircuitBreakerState.OPEN) {
			return Date.now() - this.lastFailureTime > this.options.resetTimeout;
		}

		return false;
	}

	/**
	 * Force circuit to open state
	 */
	forceOpen(): void {
		this.state = CircuitBreakerState.OPEN;
		this.lastFailureTime = Date.now();
		this.stateChanges++;
	}

	/**
	 * Force circuit to closed state
	 */
	forceClose(): void {
		this.state = CircuitBreakerState.CLOSED;
		this.failures = 0;
		this.halfOpenSuccesses = 0;
		this.stateChanges++;
	}

	/**
	 * Reset circuit breaker statistics
	 */
	reset(): void {
		this.failures = 0;
		this.successes = 0;
		this.totalOperations = 0;
		this.lastFailureTime = 0;
		this.lastSuccessTime = 0;
		this.state = CircuitBreakerState.CLOSED;
		this.stateChanges = 0;
		this.halfOpenSuccesses = 0;
		this.recentOperations = [];
	}

	/**
	 * Get circuit breaker metrics
	 */
	getMetrics(): CircuitBreakerMetrics {
		this.cleanupOldOperations();

		const recentFailures = this.recentOperations.filter(op => !op.success).length;
		const recentTotal = this.recentOperations.length;

		return {
			state: this.state,
			failures: this.failures,
			successes: this.successes,
			totalOperations: this.totalOperations,
			failureRate: recentTotal > 0 ? (recentFailures / recentTotal) * 100 : 0,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			stateChanges: this.stateChanges
		};
	}

	/**
	 * Get circuit breaker state
	 */
	getState(): CircuitBreakerState {
		return this.state;
	}

	/**
	 * Get circuit breaker name
	 */
	getName(): string {
		return this.name;
	}

	private onSuccess(): void {
		this.successes++;
		this.totalOperations++;
		this.lastSuccessTime = Date.now();
		this.recordOperation(true);

		if (this.state === CircuitBreakerState.HALF_OPEN) {
			this.halfOpenSuccesses++;
			if (this.halfOpenSuccesses >= this.options.successThreshold) {
				this.transitionToClosed();
			}
		}
	}

	private onFailure(): void {
		this.failures++;
		this.totalOperations++;
		this.lastFailureTime = Date.now();
		this.recordOperation(false);

		if (this.state === CircuitBreakerState.CLOSED) {
			this.cleanupOldOperations();
			const recentFailures = this.recentOperations.filter(op => !op.success).length;

			if (recentFailures >= this.options.failureThreshold) {
				this.transitionToOpen();
			}
		} else if (this.state === CircuitBreakerState.HALF_OPEN) {
			this.transitionToOpen();
		}
	}

	private recordOperation(success: boolean): void {
		this.recentOperations.push({
			timestamp: Date.now(),
			success
		});

		// Keep only recent operations
		this.cleanupOldOperations();
	}

	private cleanupOldOperations(): void {
		const cutoffTime = Date.now() - this.options.monitoringWindow;
		this.recentOperations = this.recentOperations.filter(
			op => op.timestamp > cutoffTime
		);
	}

	private transitionToOpen(): void {
		this.state = CircuitBreakerState.OPEN;
		this.halfOpenSuccesses = 0;
		this.stateChanges++;
	}

	private transitionToHalfOpen(): void {
		this.state = CircuitBreakerState.HALF_OPEN;
		this.halfOpenSuccesses = 0;
		this.stateChanges++;
	}

	private transitionToClosed(): void {
		this.state = CircuitBreakerState.CLOSED;
		this.failures = 0;
		this.halfOpenSuccesses = 0;
		this.stateChanges++;
	}
}

/**
 * Circuit Breaker Manager for multiple circuit breakers
 */
export class CircuitBreakerManager {
	private circuitBreakers = new Map<string, CircuitBreaker>();

	/**
	 * Get or create circuit breaker
	 */
	getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
		let circuitBreaker = this.circuitBreakers.get(name);

		if (!circuitBreaker) {
			circuitBreaker = new CircuitBreaker(name, options);
			this.circuitBreakers.set(name, circuitBreaker);
		}

		return circuitBreaker;
	}

	/**
	 * Execute operation with circuit breaker protection
	 */
	async executeWithCircuitBreaker<T>(
		name: string,
		operation: () => Promise<T>,
		options?: CircuitBreakerOptions
	): Promise<T> {
		const circuitBreaker = this.getCircuitBreaker(name, options);
		return circuitBreaker.execute(operation);
	}

	/**
	 * Execute operation with timeout and circuit breaker protection
	 */
	async executeWithTimeoutAndCircuitBreaker<T>(
		name: string,
		operation: () => Promise<T>,
		timeoutMs: number,
		options?: CircuitBreakerOptions
	): Promise<T> {
		const circuitBreaker = this.getCircuitBreaker(name, options);
		return circuitBreaker.executeWithTimeout(operation, timeoutMs);
	}

	/**
	 * Get all circuit breaker metrics
	 */
	getAllMetrics(): Record<string, CircuitBreakerMetrics> {
		const metrics: Record<string, CircuitBreakerMetrics> = {};

		this.circuitBreakers.forEach((circuitBreaker, name) => {
			metrics[name] = circuitBreaker.getMetrics();
		});

		return metrics;
	}

	/**
	 * Get circuit breaker by name
	 */
	getCircuitBreakerByName(name: string): CircuitBreaker | undefined {
		return this.circuitBreakers.get(name);
	}

	/**
	 * Remove circuit breaker
	 */
	removeCircuitBreaker(name: string): boolean {
		return this.circuitBreakers.delete(name);
	}

	/**
	 * Reset all circuit breakers
	 */
	resetAll(): void {
		this.circuitBreakers.forEach((circuitBreaker) => {
			circuitBreaker.reset();
		});
	}

	/**
	 * Force all circuit breakers to closed state
	 */
	closeAll(): void {
		this.circuitBreakers.forEach((circuitBreaker) => {
			circuitBreaker.forceClose();
		});
	}

	/**
	 * Get circuit breaker names
	 */
	getCircuitBreakerNames(): string[] {
		return Array.from(this.circuitBreakers.keys());
	}
}

// Global circuit breaker manager
export const globalCircuitBreakerManager = new CircuitBreakerManager();

/**
 * Decorator for automatic circuit breaker protection
 */
export function withCircuitBreaker(
	name: string,
	options?: CircuitBreakerOptions
) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const circuitBreaker = globalCircuitBreakerManager.getCircuitBreaker(name, options);

			return circuitBreaker.execute(() => originalMethod.apply(this, args));
		};

		return descriptor;
	};
}

/**
 * Decorator for automatic circuit breaker protection with timeout
 */
export function withCircuitBreakerAndTimeout(
	name: string,
	timeoutMs: number,
	options?: CircuitBreakerOptions
) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const circuitBreaker = globalCircuitBreakerManager.getCircuitBreaker(name, options);

			return circuitBreaker.executeWithTimeout(
				() => originalMethod.apply(this, args),
				timeoutMs
			);
		};

		return descriptor;
	};
}
