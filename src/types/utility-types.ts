/**
 * Utility types for common functionality
 */

// ID generation
export type GenerateId = () => string;

// Error message extraction
export type GetErrorMessage = (error: unknown) => string;

// Common array operations
export interface ArrayHelper {
	join: (items: string[], separator?: string) => string;
	split: (str: string, separator?: string) => string[];
	filter: <T>(items: T[], predicate: (item: T) => boolean) => T[];
	map: <T, U>(items: T[], transform: (item: T) => U) => U[];
}

// Path operations
export interface PathHelper {
	join: (...parts: string[]) => string;
	resolve: (...parts: string[]) => string;
	dirname: (path: string) => string;
	basename: (path: string) => string;
	extname: (path: string) => string;
}

// Common CLI option types
export interface BaseCliOptions {
	help?: boolean;
	version?: boolean;
	debug?: boolean;
	verbose?: boolean;
	quiet?: boolean;
	config?: string;
}

// Parameter parsing
export interface ParsedParams {
	args: string[];
	options: Record<string, any>;
	subCommand?: string;
	flags: Record<string, boolean>;
}

// Context object for commands
export interface CommandContext {
	command: string;
	args: string[];
	options: Record<string, any>;
	flags: Record<string, boolean>;
	workingDir: string;
	configPath?: string;
	debug: boolean;
}

// Generic configuration impact
export interface ConfigImpact {
	breaking: boolean;
	description: string;
	affectedFeatures: string[];
	migrationRequired: boolean;
	backupRecommended: boolean;
}

// Current state tracking
export interface CurrentState {
	phase: string;
	step: string;
	progress: number;
	startTime: Date;
	data: Record<string, any>;
}

// Migration config state
export interface MigratedConfig {
	version: string;
	migrated: boolean;
	originalVersion?: string;
	migrationDate: Date;
	backupPath?: string;
	changes: string[];
}

// Iteration helpers
export interface IterationHelper {
	current: number;
	total: number;
	hasNext: boolean;
	hasPrevious: boolean;
	isFirst: boolean;
	isLast: boolean;
	percentage: number;
}

// String manipulation helpers
export interface StringHelper {
	parts: string[];
	join: (separator?: string) => string;
	split: (separator: string) => string[];
	trim: () => string;
	isEmpty: boolean;
}

// Type guards for common patterns
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
	return typeof value === "number" && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

export function isObject(value: unknown): value is Record<string, any> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isArray<T = any>(value: unknown): value is T[] {
	return Array.isArray(value);
}

export function hasProperty<T extends string>(
	obj: unknown,
	prop: T
): obj is Record<T, unknown> {
	return isObject(obj) && prop in obj;
}

// Safe property access
export function safeGet<T>(
	obj: Record<string, any>,
	path: string,
	defaultValue?: T
): T | undefined {
	const keys = path.split(".");
	let current = obj;

	for (const key of keys) {
		if (!isObject(current) || !(key in current)) {
			return defaultValue;
		}
		current = current[key];
	}

	return current as T;
}

// Safe array access
export function safeArrayAccess<T>(
	arr: T[],
	index: number,
	defaultValue?: T
): T | undefined {
	if (!isArray(arr) || index < 0 || index >= arr.length) {
		return defaultValue;
	}
	return arr[index];
}

// String utilities that handle the common variable names
export const stringUtils = {
	join: (items: string[], separator = ""): string => items.join(separator),
	split: (str: string, separator: string): string[] => str.split(separator),
	trim: (str: string): string => str.trim(),
	isEmpty: (str: string): boolean => !str || str.trim().length === 0,
};

// Array utilities
export const arrayUtils = {
	join: <T>(items: T[], separator = ""): string => items.join(separator),
	filter: <T>(items: T[], predicate: (item: T) => boolean): T[] =>
		items.filter(predicate),
	map: <T, U>(items: T[], transform: (item: T) => U): U[] =>
		items.map(transform),
	find: <T>(items: T[], predicate: (item: T) => boolean): T | undefined =>
		items.find(predicate),
};
