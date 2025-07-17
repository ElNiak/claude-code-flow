/**
 * Enhanced Debug Logger for Claude-Flow CLI
 * Provides comprehensive function call tracing with arguments
 */

interface DebugLogEntry {
	timestamp: string;
	module: string;
	function: string;
	args: unknown[];
	returnValue?: unknown;
	executionTime?: number;
	error?: Error;
}

interface DebugLogConfig {
	enabled: boolean;
	level: "TRACE" | "DEBUG" | "INFO";
	modules: string[];
	functions: string[];
	maxArgLength: number;
	includeStack: boolean;
	includeReturn: boolean;
	measureTime: boolean;
}

export class DebugLogger {
	private static instance: DebugLogger;
	private config: DebugLogConfig;
	private callStack: Map<string, { startTime: number; depth: number }> =
		new Map();

	constructor() {
		this.config = {
			enabled: this.getEnvironmentConfig(),
			level: (process.env.CLAUDE_FLOW_DEBUG_LEVEL as any) || "DEBUG",
			modules: this.parseModuleList(
				process.env.CLAUDE_FLOW_DEBUG_MODULES || "*"
			),
			functions: this.parseModuleList(
				process.env.CLAUDE_FLOW_DEBUG_FUNCTIONS || "*"
			),
			maxArgLength: parseInt(
				process.env.CLAUDE_FLOW_DEBUG_MAX_ARG_LENGTH || "1000"
			),
			includeStack: process.env.CLAUDE_FLOW_DEBUG_STACK === "true",
			includeReturn: process.env.CLAUDE_FLOW_DEBUG_RETURN === "true",
			measureTime: process.env.CLAUDE_FLOW_DEBUG_TIME === "true",
		};
	}

	static getInstance(): DebugLogger {
		if (!DebugLogger.instance) {
			DebugLogger.instance = new DebugLogger();
		}
		return DebugLogger.instance;
	}

	private getEnvironmentConfig(): boolean {
		return (
			process.env.NODE_ENV === "development" ||
			process.env.DEBUG === "true" ||
			process.env.CLAUDE_FLOW_DEBUG === "true" ||
			process.env.CLAUDE_FLOW_DEBUG_CLI === "true"
		);
	}

	private parseModuleList(moduleString: string): string[] {
		if (moduleString === "*") {
			return ["*"];
		}
		return moduleString.split(",").map((m) => m.trim());
	}

	private shouldLog(module: string, functionName: string): boolean {
		if (!this.config.enabled) {
			return false;
		}

		const moduleMatch =
			this.config.modules.includes("*") ||
			this.config.modules.some((m) => module.includes(m));

		const functionMatch =
			this.config.functions.includes("*") ||
			this.config.functions.includes(functionName);

		return moduleMatch && functionMatch;
	}

	private sanitizeArgs(args: unknown[]): unknown[] {
		return args.map((arg) => {
			if (typeof arg === "string" && arg.length > this.config.maxArgLength) {
				return `${arg.substring(0, this.config.maxArgLength)}...`;
			}
			if (typeof arg === "object" && arg !== null) {
				try {
					const str = JSON.stringify(arg);
					if (str.length > this.config.maxArgLength) {
						return `${str.substring(0, this.config.maxArgLength)}...`;
					}
					return arg;
				} catch {
					return "[Record<string, any> - could not serialize]";
				}
			}
			return arg;
		});
	}

	private getCallId(module: string, functionName: string): string {
		return `${module}:${functionName}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
	}

	private getCurrentDepth(): number {
		return this.callStack.size;
	}

	private getIndent(depth: number): string {
		return "  ".repeat(depth);
	}

	/**
	 * Log function entry with arguments
	 */
	logFunctionEntry(
		module: string,
		functionName: string,
		args: unknown[]
	): string | null {
		if (!this.shouldLog(module, functionName)) {
			return null;
		}

		const callId = this.getCallId(module, functionName);
		const depth = this.getCurrentDepth();
		const indent = this.getIndent(depth);

		const sanitizedArgs = this.sanitizeArgs(args);
		const argsStr = sanitizedArgs
			.map((arg) =>
				typeof arg === "string"
					? `"${arg}"`
					: typeof arg === "object"
						? JSON.stringify(arg)
						: String(arg)
			)
			.join(", ");

		const logEntry: DebugLogEntry = {
			timestamp: new Date().toISOString(),
			module,
			function: functionName,
			args: sanitizedArgs,
		};

		const message = `${indent}→ ${module}:${functionName}(${argsStr})`;

		if (this.config.includeStack) {
			const stack = new Error().stack?.split("\n").slice(2, 5).join("\n") || "";
			console.debug(`${message}\n${indent}  Stack: ${stack}`, logEntry);
		} else {
			console.debug(message, logEntry);
		}

		// Store call info for exit logging
		this.callStack.set(callId, {
			startTime: this.config.measureTime ? Date.now() : 0,
			depth,
		});

		return callId;
	}

	/**
	 * Log function exit with return value
	 */
	logFunctionExit(
		callId: string | null,
		module: string,
		functionName: string,
		returnValue?: unknown
	): void {
		if (!callId || !this.shouldLog(module, functionName)) {
			return;
		}

		const callInfo = this.callStack.get(callId);
		if (!callInfo) {
			return;
		}

		const executionTime = this.config.measureTime
			? Date.now() - callInfo.startTime
			: undefined;
		const indent = this.getIndent(callInfo.depth);

		let message = `${indent}← ${module}:${functionName}`;

		if (this.config.includeReturn && returnValue !== undefined) {
			const returnStr =
				typeof returnValue === "string"
					? `"${returnValue}"`
					: typeof returnValue === "object"
						? JSON.stringify(returnValue)
						: String(returnValue);
			message += ` → ${returnStr}`;
		}

		if (executionTime !== undefined) {
			message += ` (${executionTime}ms)`;
		}

		const logEntry: DebugLogEntry = {
			timestamp: new Date().toISOString(),
			module,
			function: functionName,
			args: [],
			returnValue: this.config.includeReturn ? returnValue : undefined,
			executionTime,
		};

		console.debug(message, logEntry);
		this.callStack.delete(callId);
	}

	/**
	 * Log function error
	 */
	logFunctionError(
		callId: string | null,
		module: string,
		functionName: string,
		error: Error
	): void {
		if (!callId || !this.shouldLog(module, functionName)) {
			return;
		}

		const callInfo = this.callStack.get(callId);
		if (!callInfo) {
			return;
		}

		const executionTime = this.config.measureTime
			? Date.now() - callInfo.startTime
			: undefined;
		const indent = this.getIndent(callInfo.depth);

		const message = `${indent}✗ ${module}:${functionName} ERROR: ${error.message}`;

		const logEntry: DebugLogEntry = {
			timestamp: new Date().toISOString(),
			module,
			function: functionName,
			args: [],
			error,
			executionTime,
		};

		console.error(message, logEntry);
		this.callStack.delete(callId);
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<DebugLogConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): DebugLogConfig {
		return { ...this.config };
	}

	/**
	 * Clear call stack (useful for testing)
	 */
	clearCallStack(): void {
		this.callStack.clear();
	}
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

/**
 * Decorator for automatic function logging
 */
export function debugTrace(module: string) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = function (...args: unknown[]) {
			const callId = debugLogger.logFunctionEntry(module, propertyKey, args);

			try {
				const result = originalMethod.apply(this, args);

				// Handle async functions
				if (result && typeof result.then === "function") {
					return result
						.then((value: unknown) => {
							debugLogger.logFunctionExit(callId, module, propertyKey, value);
							return value;
						})
						.catch((error: Error) => {
							debugLogger.logFunctionError(callId, module, propertyKey, error);
							throw error;
						});
				}

				debugLogger.logFunctionExit(callId, module, propertyKey, result);
				return result;
			} catch (error) {
				debugLogger.logFunctionError(
					callId,
					module,
					propertyKey,
					error as Error
				);
				throw error;
			}
		};

		return descriptor;
	};
}

/**
 * Manual function tracing for non-decorator usage
 */
export function traceFunction<T extends (...args: any[]) => any>(
	module: string,
	functionName: string,
	fn: T
): T {
	return ((...args: Parameters<T>) => {
		const callId = debugLogger.logFunctionEntry(module, functionName, args);

		try {
			const result = fn(...args);

			// Handle async functions
			if (result && typeof result.then === "function") {
				return result
					.then((value: any) => {
						debugLogger.logFunctionExit(callId, module, functionName, value);
						return value;
					})
					.catch((error: Error) => {
						debugLogger.logFunctionError(callId, module, functionName, error);
						throw error;
					});
			}

			debugLogger.logFunctionExit(callId, module, functionName, result);
			return result;
		} catch (error) {
			debugLogger.logFunctionError(
				callId,
				module,
				functionName,
				error as Error
			);
			throw error;
		}
	}) as T;
}

export default debugLogger;
