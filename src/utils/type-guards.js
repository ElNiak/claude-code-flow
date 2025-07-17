/**
 * Type guard utility functions for safe type checking
 */

/**
 * Check if a value is an object (non-null and typeof object)
 */
export function isObject(value) {
	return typeof value === "object" && value !== null;
}

/**
 * Check if a value is an Error instance or has error-like properties
 */
export function isError(value) {
	return value instanceof Error;
}

/**
 * Check if a value has a message property (error-like)
 */
export function hasMessage(value) {
	return (
		isObject(value) && "message" in value && typeof value.message === "string"
	);
}

/**
 * Check if a value has a stack property (error-like)
 */
export function hasStack(value) {
	return isObject(value) && "stack" in value && typeof value.stack === "string";
}

/**
 * Check if a value is an error-like object
 */
export function isErrorLike(value) {
	return hasMessage(value);
}

/**
 * Check if a value has a code property
 */
export function hasCode(value) {
	return (
		isObject(value) &&
		"code" in value &&
		(typeof value.code === "string" || typeof value.code === "number")
	);
}

/**
 * Check if a value has an agentId property
 */
export function hasAgentId(value) {
	return (
		isObject(value) &&
		("agentId" in value || "id" in value) &&
		((isObject(value.agentId) &&
			"id" in value.agentId &&
			typeof value.agentId.id === "string") ||
			("id" in value && typeof value.id === "string"))
	);
}

/**
 * Check if a value has a pid property (process-like)
 */
export function hasPid(value) {
	return isObject(value) && "pid" in value && typeof value.pid === "number";
}

/**
 * Safely get error message from unknown value
 */
export function getErrorMessage(error) {
	if (typeof error === "string") {
		return error;
	}
	if (isError(error)) {
		return error.message;
	}
	if (hasMessage(error)) {
		return error.message;
	}
	return String(error);
}

/**
 * Safely get error stack from unknown value
 */
export function getErrorStack(error) {
	if (isError(error)) {
		return error.stack;
	}
	if (hasStack(error)) {
		return error.stack;
	}
	return undefined;
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value) {
	return typeof value === "string";
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value) {
	return typeof value === "number" && !isNaN(value);
}

/**
 * Type guard for checking if value is a boolean
 */
export function isBoolean(value) {
	return typeof value === "boolean";
}

/**
 * Type guard for checking if value is an array
 */
export function isArray(value) {
	return Array.isArray(value);
}

/**
 * Type guard for checking if value is a function
 */
export function isFunction(value) {
	return typeof value === "function";
}

/**
 * Type guard for checking if value is null or undefined
 */
export function isNullOrUndefined(value) {
	return value === null || value === undefined;
}

/**
 * Type guard for checking if value is defined (not null or undefined)
 */
export function isDefined(value) {
	return value !== null && value !== undefined;
}

/**
 * Type guard for agent load update event data
 */
export function hasAgentLoad(value) {
	return (
		isObject(value) &&
		"agentId" in value &&
		isObject(value.agentId) &&
		"id" in value.agentId &&
		typeof value.agentId.id === "string" &&
		"load" in value &&
		typeof value.load === "number"
	);
}

/**
 * Type guard for task event data
 */
export function hasAgentTask(value) {
	return (
		isObject(value) &&
		"agentId" in value &&
		isObject(value.agentId) &&
		"id" in value.agentId &&
		typeof value.agentId.id === "string" &&
		"task" in value
	);
}

/**
 * Type guard for work stealing event data
 */
export function hasWorkStealingData(value) {
	return (
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
		typeof value.taskCount === "number"
	);
}
