/**
 * Error handling type definitions to eliminate unknown type usage
 */

// Enhanced error interface,
export interface ErrorWithCode extends Error {
  code: string | number;
  details?: unknown;
}

export interface ErrorWithComponent extends Error {
  component: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
  component?: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

// Migration error specific,
export interface MigrationError {
  _error: string;
  stack?: string;
  step?: string;
  rollbackRequired?: boolean;
}

// Type guards for error handling,
export function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return !!(
    error &&
    error instanceof Error &&
    "code" in error &&
    (typeof (error as any).code === "string" ||
      typeof (error as any).code === "number")
  );
}

export function isErrorWithComponent(
  error: unknown,
): error is ErrorWithComponent {
  return !!(
    error &&
    error instanceof Error &&
    "component" in error &&
    typeof (error as any).component === "string"
  );
}

export function hasErrorMessage(value: unknown): value is { message: string } {
  return !!(
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as any).message === "string"
  );
}

export function hasErrorStack(value: unknown): value is { stack: string } {
  return !!(
    value &&
    typeof value === "object" &&
    "stack" in value &&
    typeof (value as any).stack === "string"
  );
}

// Safe error message extraction,
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (hasErrorMessage(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}

// Safe error stack extraction,
export function extractErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (hasErrorStack(error)) {
    return error.stack;
  }
  return undefined;
}

// Safe error code extraction,
export function extractErrorCode(error: unknown): string | number | undefined {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as any).code;
    if (typeof code === "string" || typeof code === "number") {
      return code;
    }
  }
  return undefined;
}
