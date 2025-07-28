/**
 * CLI Function Instrumentation Utility
 * Automatically adds debug logging to CLI functions
 */

import { debugLogger } from "./debug-logger.js";

interface InstrumentationConfig {
	_includePrivateFunctions: boolean;
	includeGetters: boolean;
	includeSetters: boolean;
	excludePatterns: string[];
	includePatterns: string[];
}

const defaultConfig: InstrumentationConfig = {
	_includePrivateFunctions: false,
	includeGetters: false,
	includeSetters: false,
	excludePatterns: ["toString", "valueOf", "constructor", "hasOwnProperty"],
	includePatterns: ["*"],
};

/**
 * Instrument a class with debug logging
 */
export function instrumentClass(
	targetClass: any,
	moduleName: string,
	config: Partial<InstrumentationConfig> = {},
): void {
	const finalConfig = { ...defaultConfig, ...config };
	const prototype = targetClass.prototype;

	// Get all method names
	const methodNames = getAllMethodNames(prototype);

	for (const methodName of methodNames) {
		if (shouldInstrumentMethod(methodName, finalConfig)) {
			instrumentMethod(prototype, methodName, moduleName);
		}
	}
}

/**
 * Instrument a single object with debug logging
 */
export function instrumentObject(
	obj: any,
	moduleName: string,
	config: Partial<InstrumentationConfig> = {},
): void {
	const finalConfig = { ...defaultConfig, ...config };
	const methodNames = getAllMethodNames(obj);

	for (const methodName of methodNames) {
		if (shouldInstrumentMethod(methodName, finalConfig)) {
			instrumentMethod(obj, methodName, moduleName);
		}
	}
}

/**
 * Instrument a standalone function
 */
export function instrumentFunction<T extends (...args: any[]) => any>(
	fn: T,
	functionName: string,
	moduleName: string,
): T {
	return ((...args: Parameters<T>) => {
		const callId = debugLogger.logFunctionEntry(moduleName, functionName, args);

		try {
			const result = fn(...args);

			// Handle async functions
			if (result && typeof result.then === "function") {
				return result
					.then((value: any) => {
						debugLogger.logFunctionExit(callId, value);
						return value;
					})
					.catch((error: Error) => {
						debugLogger.logFunctionError(callId, error);
						throw error;
					});
			}

			debugLogger.logFunctionExit(callId, result);
			return result;
		} catch (error) {
			debugLogger.logFunctionError(callId, error as Error);
			throw error;
		}
	}) as T;
}

/**
 * Get all method names from an object or prototype
 */
function getAllMethodNames(obj: any): string[] {
	const methods = new Set<string>();

	// Walk the prototype chain
	let current = obj;
	while (current && current !== Object.prototype) {
		Object.getOwnPropertyNames(current).forEach((name) => {
			if (typeof current[name] === "function") {
				methods.add(name);
			}
		});
		current = Object.getPrototypeOf(current);
	}

	return Array.from(methods);
}

/**
 * Check if a method should be instrumented
 */
function shouldInstrumentMethod(
	methodName: string,
	config: InstrumentationConfig,
): boolean {
	// Skip private methods unless explicitly included
	if (methodName.startsWith("_") && !config._includePrivateFunctions) {
		return false;
	}

	// Skip getters/setters unless explicitly included
	if (
		(methodName.startsWith("get") || methodName.startsWith("set")) &&
		!config.includeGetters &&
		!config.includeSetters
	) {
		return false;
	}

	// Check exclude patterns
	if (
		config.excludePatterns.some(
			(pattern) => pattern === methodName || methodName.includes(pattern),
		)
	) {
		return false;
	}

	// Check include patterns
	if (config.includePatterns.includes("*")) {
		return true;
	}

	return config.includePatterns.some(
		(pattern) => pattern === methodName || methodName.includes(pattern),
	);
}

/**
 * Instrument a specific method
 */
function instrumentMethod(
	obj: any,
	methodName: string,
	moduleName: string,
): void {
	const originalMethod = obj[methodName];

	if (typeof originalMethod !== "function") {
		return;
	}

	// Check if already instrumented
	if (originalMethod._instrumented) {
		return;
	}

	obj[methodName] = function (...args: unknown[]) {
		const callId = debugLogger.logFunctionEntry(moduleName, methodName, args);

		try {
			const result = originalMethod.apply(this, args);

			// Handle async functions
			if (result && typeof result.then === "function") {
				return result
					.then((value: unknown) => {
						debugLogger.logFunctionExit(callId, value);
						return value;
					})
					.catch((error: Error) => {
						debugLogger.logFunctionError(callId, error);
						throw error;
					});
			}

			debugLogger.logFunctionExit(callId, result);
			return result;
		} catch (error) {
			debugLogger.logFunctionError(callId, error as Error);
			throw error;
		}
	};

	// Mark as instrumented
	obj[methodName]._instrumented = true;
	obj[methodName]._originalMethod = originalMethod;
}

/**
 * Auto-instrument CLI commands based on file patterns
 */
export function autoInstrumentCLI(): void {
	// This would be called during CLI initialization
	// It would scan for command files and instrument them

	if (!debugLogger.enabled) {
		return;
	}

	// Future: Add automatic scanning and instrumentation
	// For now, we'll do manual instrumentation in each command file
}

/**
 * Macro for easy method instrumentation
 */
export function withDebugLogging<T extends (...args: any[]) => any>(
	moduleName: string,
	functionName: string,
) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = function (...args: unknown[]) {
			const callId = debugLogger.logFunctionEntry(
				moduleName,
				functionName || propertyKey,
				args,
			);

			try {
				const result = originalMethod.apply(this, args);

				// Handle async functions
				if (result && typeof result.then === "function") {
					return result
						.then((value: unknown) => {
							debugLogger.logFunctionExit(callId, value);
							return value;
						})
						.catch((error: Error) => {
							debugLogger.logFunctionError(callId, error);
							throw error;
						});
				}

				debugLogger.logFunctionExit(callId, result);
				return result;
			} catch (error) {
				debugLogger.logFunctionError(callId, error as Error);
				throw error;
			}
		};

		return descriptor;
	};
}

export default {
	instrumentClass,
	instrumentObject,
	instrumentFunction,
	autoInstrumentCLI,
	withDebugLogging,
};
