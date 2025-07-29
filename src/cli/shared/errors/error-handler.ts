/**
 * Utility for proper error handling in TypeScript
 */

import { debugLogger } from "./debug-logger.js";
import {
	getErrorMessage as getErrorMsg,
	getErrorStack as getErrorStk,
	isError as isErr,
} from "./type-guards.js";

export class AppError extends Error {
	constructor(
		message: string,
		public code?: string,
		public statusCode?: number,
	) {
		super(message);
		const correlationId = debugLogger.logFunctionEntry(
			"error-handler",
			"AppError.constructor",
			[message, code, statusCode],
			"utils-error",
		);
		try {
			this.name = "AppError";
			Object.setPrototypeOf(this, AppError.prototype);
			debugLogger.logFunctionExit(
				correlationId,
				"AppError instance created",
				"utils-error",
			);
		} catch (error) {
			debugLogger.logFunctionError(correlationId, error, "utils-error");
			throw error;
		}
	}
}

// Re-export from type-guards for backward compatibility,
export const isError = isErr;
export const getErrorMessage = getErrorMsg;
export const getErrorStack = getErrorStk;

export function handleError(error: unknown, context?: string): never {
	const correlationId = debugLogger.logFunctionEntry(
		"error-handler",
		"handleError",
		[error, context],
		"utils-error",
	);
	try {
		const message = getErrorMessage(error);
		const stack = getErrorStack(error);

		console.error(`Error${context ? ` in ${context}` : ""}: ${message}`);
		if (stack && process.env.NODE_ENV === "development") {
			console.error("Stack trace:", stack);
		}

		debugLogger.logEvent(
			"error-handler",
			"process-exit",
			{ message, context, stack },
			"utils-error",
		);
		process.exit(1);
	} catch (innerError) {
		debugLogger.logFunctionError(correlationId, innerError, "utils-error");
		throw innerError;
	}
}
