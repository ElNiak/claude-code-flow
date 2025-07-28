/**
 * Type guard utility functions for safe type checking
 */

import { debugLogger } from "./debug-logger.js";

/**
 * Check if a value is an object (non-null and typeof object)
 */
export function isObject(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"isObject",
		[value],
		"utils-validation",
	);
	try {
		const result = typeof value === "object" && value !== null;
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Check if a value is an Error instance or has error-like properties
 */
export function isError(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"isError",
		[value],
		"utils-validation",
	);
	try {
		const result = value instanceof Error;
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Check if a value has a message property (error-like)
 */
export function hasMessage(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasMessage",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) &&
			"message" in value &&
			typeof value.message === "string";
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Check if a value has a stack property (error-like)
 */
export function hasStack(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasStack",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) && "stack" in value && typeof value.stack === "string";
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Check if a value is an error-like object
 */
export function isErrorLike(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"isErrorLike",
		[value],
		"utils-validation",
	);
	try {
		const result = hasMessage(value);
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Check if a value has a code property
 */
export function hasCode(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasCode",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) &&
			"code" in value &&
			(typeof value.code === "string" || typeof value.code === "number");
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Check if a value has an agentId property
 */
export function hasAgentId(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasAgentId",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) &&
			("agentId" in value || "id" in value) &&
			((isObject(value.agentId) &&
				"id" in value.agentId &&
				typeof value.agentId.id === "string") ||
				("id" in value && typeof value.id === "string"));
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Check if a value has a pid property (process-like)
 */
export function hasPid(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasPid",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) && "pid" in value && typeof value.pid === "number";
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Safely get error message from unknown value
 */
export function getErrorMessage(error) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"getErrorMessage",
		[error],
		"utils-validation",
	);
	try {
		let result;
		if (typeof error === "string") {
			result = error;
		} else if (isError(error)) {
			result = error.message;
		} else if (hasMessage(error)) {
			result = error.message;
		} else {
			result = String(error);
		}
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Safely get error stack from unknown value
 */
export function getErrorStack(error) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"getErrorStack",
		[error],
		"utils-validation",
	);
	try {
		let result;
		if (isError(error)) {
			result = error.stack;
		} else if (hasStack(error)) {
			result = error.stack;
		} else {
			result = undefined;
		}
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value) {
	return debugLogger.logSyncFunction(
		"type-guards",
		"isString",
		() => typeof value === "string",
		[value],
		"utils-validation",
	);
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value) {
	return debugLogger.logSyncFunction(
		"type-guards",
		"isNumber",
		() => typeof value === "number" && !isNaN(value),
		[value],
		"utils-validation",
	);
}

/**
 * Type guard for checking if value is a boolean
 */
export function isBoolean(value) {
	return debugLogger.logSyncFunction(
		"type-guards",
		"isBoolean",
		() => typeof value === "boolean",
		[value],
		"utils-validation",
	);
}

/**
 * Type guard for checking if value is an array
 */
export function isArray(value) {
	return debugLogger.logSyncFunction(
		"type-guards",
		"isArray",
		() => Array.isArray(value),
		[value],
		"utils-validation",
	);
}

/**
 * Type guard for checking if value is a function
 */
export function isFunction(value) {
	return debugLogger.logSyncFunction(
		"type-guards",
		"isFunction",
		() => typeof value === "function",
		[value],
		"utils-validation",
	);
}

/**
 * Type guard for checking if value is null or undefined
 */
export function isNullOrUndefined(value) {
	return debugLogger.logSyncFunction(
		"type-guards",
		"isNullOrUndefined",
		() => value === null || value === undefined,
		[value],
		"utils-validation",
	);
}

/**
 * Type guard for checking if value is defined (not null or undefined)
 */
export function isDefined(value) {
	return debugLogger.logSyncFunction(
		"type-guards",
		"isDefined",
		() => value !== null && value !== undefined,
		[value],
		"utils-validation",
	);
}

/**
 * Type guard for agent load update event data
 */
export function hasAgentLoad(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasAgentLoad",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) &&
			"agentId" in value &&
			isObject(value.agentId) &&
			"id" in value.agentId &&
			typeof value.agentId.id === "string" &&
			"load" in value &&
			typeof value.load === "number";
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Type guard for task event data
 */
export function hasAgentTask(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasAgentTask",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) &&
			"agentId" in value &&
			isObject(value.agentId) &&
			"id" in value.agentId &&
			typeof value.agentId.id === "string" &&
			"task" in value;
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}

/**
 * Type guard for work stealing event data
 */
export function hasWorkStealingData(value) {
	const correlationId = debugLogger.logFunctionEntry(
		"type-guards",
		"hasWorkStealingData",
		[value],
		"utils-validation",
	);
	try {
		const result =
			isObject(value) &&
			"sourceAgent" in value &&
			isObject(value.sourceAgent) &&
			"id" in value.sourceAgent &&
			typeof value.sourceAgent.id === "string" &&
			"targetAgent" in value &&
			isObject(value.targetAgent) &&
			"id" in value.targetAgent &&
			typeof value.targetAgent.id === "string" &&
			"taskCount" in value &&
			typeof value.taskCount === "number";
		debugLogger.logFunctionExit(correlationId, result, "utils-validation");
		return result;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-validation");
		throw error;
	}
}
