// ABOUTME: Enhanced debug logging utility for comprehensive execution flow tracing
// ABOUTME: Provides function entry/exit logging, parameter tracing, performance monitoring, and correlation tracking

class DebugLogger {
	constructor() {
		this.enabled =
			process.env.DEBUG === "true" || process.env.NODE_ENV === "development";
		this.enabledCategories = this.parseDebugCategories();
		this.correlationId = 0;
		this.callStack = new Map();
		this.performanceThreshold =
			parseInt(process.env.DEBUG_PERF_THRESHOLD) || 100; // ms

		// Performance optimization: pre-compile no-op functions for disabled state
		if (!this.enabled) {
			this._createNoOpMethods();
		}
	}

	_createNoOpMethods() {
		// Override methods with no-op versions for better performance when disabled
		this.logFunctionEntry = () => null;
		this.logFunctionExit = () => {};
		this.logFunctionError = () => {};
		this.logEvent = () => {};
		this.serializeArgs = () => "disabled";
		this.shouldLog = () => false;

		// Override the main wrapper functions to bypass all overhead
		this.logSyncFunction = (
			module,
			functionName,
			syncFn,
			args,
			category = "general",
		) => {
			return syncFn(...(args || []));
		};

		this.logAsyncFunction = async (
			module,
			functionName,
			asyncFn,
			args,
			category = "general",
		) => {
			return await asyncFn(...(args || []));
		};
	}

	parseDebugCategories() {
		const categories = process.env.DEBUG_CATEGORIES || "all";
		return categories.split(",").map((cat) => cat.trim().toLowerCase());
	}

	shouldLog(category = "general") {
		if (!this.enabled) return false;
		return (
			this.enabledCategories.includes("all") ||
			this.enabledCategories.includes(category.toLowerCase())
		);
	}

	generateCorrelationId() {
		return `debug-${++this.correlationId}-${Date.now()}`;
	}

	serializeArgs(args) {
		try {
			if (!args) return "no args";
			// Performance optimization: limit serialization depth and size
			if (Array.isArray(args) && args.length === 0) return "[]";
			if (
				Array.isArray(args) &&
				args.length === 1 &&
				typeof args[0] === "string"
			)
				return args[0];
			if (
				Array.isArray(args) &&
				args.length === 1 &&
				typeof args[0] === "number"
			)
				return args[0].toString();

			// For complex objects, provide summary instead of full serialization
			const serialized = JSON.stringify(args, (key, value) => {
				// Limit string length to prevent performance issues
				if (typeof value === "string" && value.length > 100) {
					return value.substring(0, 97) + "...";
				}
				// Limit array size
				if (Array.isArray(value) && value.length > 10) {
					return [...value.slice(0, 10), `... ${value.length - 10} more items`];
				}
				// Avoid circular references and deep objects
				if (typeof value === "object" && value !== null) {
					const keys = Object.keys(value);
					if (keys.length > 5) {
						const limited = {};
						keys.slice(0, 5).forEach((k) => (limited[k] = value[k]));
						limited["..."] = `${keys.length - 5} more properties`;
						return limited;
					}
				}
				return value;
			});

			return serialized.length > 200
				? serialized.substring(0, 197) + "..."
				: serialized;
		} catch (error) {
			return `[Serialization Error: ${error.message}]`;
		}
	}

	logFunctionEntry(module, functionName, args, category = "general") {
		if (!this.shouldLog(category)) return null;

		const correlationId = this.generateCorrelationId();
		const timestamp = new Date().toISOString();
		const callId = Date.now();

		// Store call context for exit logging
		this.callStack.set(correlationId, {
			module,
			functionName,
			startTime: callId,
			category,
			timestamp,
		});

		// Performance optimization: single console.debug call with pre-built string
		const argsStr = this.serializeArgs(args);
		console.debug(
			`[🟢 ENTRY] [${timestamp}] [${category.toUpperCase()}] ${module}.${functionName}() | ID: ${correlationId} | Args: ${argsStr} | Depth: ${this.callStack.size}`,
		);

		return correlationId;
	}

	logFunctionExit(correlationId, result, category = "general") {
		if (!correlationId || !this.shouldLog(category)) return;

		const callContext = this.callStack.get(correlationId);
		if (!callContext) return;

		const duration = Date.now() - callContext.startTime;
		const timestamp = new Date().toISOString();
		const isSlowCall = duration > this.performanceThreshold;

		// Performance optimization: single console.debug call with pre-built string
		const resultStr = this.serializeArgs(result);
		const statusIcon = isSlowCall ? "⚠️ SLOW" : "✅";
		console.debug(
			`[🔴 EXIT] [${timestamp}] [${callContext.category.toUpperCase()}] ${callContext.module}.${callContext.functionName}() | ID: ${correlationId} | ${duration}ms ${statusIcon} | Result: ${resultStr} | Depth: ${this.callStack.size - 1}`,
		);

		// Performance warning for slow calls (only if really needed)
		if (isSlowCall) {
			console.warn(
				`⚠️ PERFORMANCE: ${callContext.module}.${callContext.functionName}() took ${duration}ms (threshold: ${this.performanceThreshold}ms)`,
			);
		}

		this.callStack.delete(correlationId);
	}

	logFunctionError(correlationId, error, category = "general") {
		if (!correlationId || !this.shouldLog(category)) return;

		const callContext = this.callStack.get(correlationId);
		if (!callContext) return;

		const duration = Date.now() - callContext.startTime;
		const timestamp = new Date().toISOString();

		// Performance optimization: single console.error call
		console.error(
			`[❌ ERROR] [${timestamp}] [${callContext.category.toUpperCase()}] ${callContext.module}.${callContext.functionName}() | ID: ${correlationId} | ${duration}ms | Error: ${error.message} | Depth: ${this.callStack.size - 1}`,
		);

		// Only include stack trace if it's really needed (can be expensive)
		if (process.env.DEBUG_INCLUDE_STACK === "true") {
			console.error(`Stack trace: ${error.stack}`);
		}

		this.callStack.delete(correlationId);
	}

	// New method for async function logging
	async logAsyncFunction(
		module,
		functionName,
		asyncFn,
		args,
		category = "general",
	) {
		// Performance optimization: bypass all processing if debug is disabled
		if (!this.shouldLog(category)) {
			return await asyncFn(...(args || []));
		}

		const correlationId = this.logFunctionEntry(
			module,
			functionName,
			args,
			category,
		);
		try {
			const result = await asyncFn(...(args || []));
			this.logFunctionExit(correlationId, result, category);
			return result;
		} catch (error) {
			this.logFunctionError(correlationId, error, category);
			throw error;
		}
	}

	// New method for sync function logging
	logSyncFunction(module, functionName, syncFn, args, category = "general") {
		// Performance optimization: bypass all processing if debug is disabled
		if (!this.shouldLog(category)) {
			return syncFn(...(args || []));
		}

		const correlationId = this.logFunctionEntry(
			module,
			functionName,
			args,
			category,
		);
		try {
			const result = syncFn(...(args || []));
			this.logFunctionExit(correlationId, result, category);
			return result;
		} catch (error) {
			this.logFunctionError(correlationId, error, category);
			throw error;
		}
	}

	// Log arbitrary events
	logEvent(module, event, data, category = "general") {
		if (!this.shouldLog(category)) return;

		const timestamp = new Date().toISOString();
		const dataStr = this.serializeArgs(data);
		console.debug(
			`[📝 EVENT] [${timestamp}] [${category.toUpperCase()}] ${module}: ${event} | Data: ${dataStr}`,
		);
	}

	// Get current call stack status
	getCallStackStatus() {
		return {
			activeCallsCount: this.callStack.size,
			activeCalls: Array.from(this.callStack.entries()).map(
				([id, context]) => ({
					correlationId: id,
					function: `${context.module}.${context.functionName}`,
					duration: Date.now() - context.startTime,
					category: context.category,
				}),
			),
		};
	}
}

export const debugLogger = new DebugLogger();
