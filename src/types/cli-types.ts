/**
 * CLI system type definitions
 */

// Base command interface
export interface CliCommand {
	name: string;
	description: string;
	usage?: string;
	examples?: string[];
	options?: CliOption[];
	subcommands?: CliCommand[];
	action?: (context: CommandContext) => Promise<void> | void;
	beforeAction?: (context: CommandContext) => Promise<void> | void;
	afterAction?: (context: CommandContext) => Promise<void> | void;
}

// CLI option definition
export interface CliOption {
	name: string;
	description: string;
	type: "string" | "number" | "boolean" | "array";
	required?: boolean;
	default?: any;
	choices?: string[];
	alias?: string;
	multiple?: boolean;
}

// Command execution context
export interface CommandContext {
	command: string;
	args: string[];
	flags: Record<string, any>;
	options: Record<string, any>;
	workingDir: string;
	configPath?: string;
	debug: boolean;
	verbose?: boolean;
	quiet?: boolean;
}

// CLI configuration
export interface CliConfig {
	name: string;
	version: string;
	description: string;
	defaultCommand?: string;
	globalOptions: CliOption[];
	commands: CliCommand[];
	helpText?: string;
	aliases?: Record<string, string>;
}

// Command result
export interface CommandResult {
	success: boolean;
	exitCode: number;
	output?: string;
	error?: string;
	data?: any;
	metadata?: Record<string, any>;
}

// CLI error types
export interface CliError extends Error {
	code: number;
	command?: string;
	context?: CommandContext;
	suggestions?: string[];
}

// Help system types
export interface HelpSection {
	title: string;
	content: string;
	order?: number;
}

export interface HelpOptions {
	showUsage?: boolean;
	showExamples?: boolean;
	showOptions?: boolean;
	showSubcommands?: boolean;
	groupBy?: "category" | "alphabetical";
}

// Completion system types
export interface CompletionContext {
	line: string;
	cursor: number;
	words: string[];
	partial: string;
	command?: string;
	subcommand?: string;
}

export interface CompletionSuggestion {
	value: string;
	description?: string;
	type: "command" | "subcommand" | "option" | "argument" | "file" | "directory";
	priority?: number;
}

// Plugin system types
export interface CliPlugin {
	name: string;
	version: string;
	description: string;
	commands?: CliCommand[];
	hooks?: PluginHooks;
	dependencies?: string[];
	config?: Record<string, any>;
}

export interface PluginHooks {
	beforeCommand?: (context: CommandContext) => Promise<void>;
	afterCommand?: (
		context: CommandContext,
		result: CommandResult
	) => Promise<void>;
	onError?: (error: CliError, context: CommandContext) => Promise<void>;
	onInit?: (config: CliConfig) => Promise<void>;
}

// Interactive prompt types
export interface PromptQuestion {
	name: string;
	type: "input" | "confirm" | "list" | "checkbox" | "password" | "number";
	message: string;
	default?: any;
	choices?: PromptChoice[];
	validate?: (value: any) => boolean | string;
	when?: (answers: Record<string, any>) => boolean;
}

export interface PromptChoice {
	name: string;
	value: any;
	short?: string;
	disabled?: boolean | string;
}

export interface PromptAnswer {
	[key: string]: any;
}

// Progress indicator for CLI operations
export interface CliProgressIndicator {
	start(message?: string): void;
	update(message?: string, progress?: number): void;
	succeed(message?: string): void;
	fail(message?: string): void;
	warn(message?: string): void;
	info(message?: string): void;
	stop(): void;
}

// CLI table formatting
export interface TableColumn {
	header: string;
	accessor: string | ((row: any) => string);
	align?: "left" | "center" | "right";
	width?: number;
	formatter?: (value: any) => string;
}

export interface TableOptions {
	border?: boolean;
	padding?: number;
	maxWidth?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

// Logging for CLI
export interface CliLogger {
	debug(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
	success(message: string, ...args: any[]): void;
	log(level: LogLevel, message: string, ...args: any[]): void;
}

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

// Configuration management
export interface ConfigManager {
	get<T = any>(key: string, defaultValue?: T): T;
	set(key: string, value: any): void;
	has(key: string): boolean;
	delete(key: string): boolean;
	clear(): void;
	load(path?: string): Promise<void>;
	save(path?: string): Promise<void>;
	getPath(): string;
	merge(config: Record<string, any>): void;
}

// Environment detection
export interface EnvironmentInfo {
	isCI: boolean;
	isTTY: boolean;
	isDocker: boolean;
	isWSL: boolean;
	platform: NodeJS.Platform;
	arch: string;
	nodeVersion: string;
	npmVersion?: string;
	shell?: string;
	terminalProgram?: string;
	colorDepth?: number;
	supportsUnicode: boolean;
}

// Performance monitoring
export interface PerformanceMetrics {
	commandDuration: number;
	memoryUsage: NodeJS.MemoryUsage;
	cpuUsage: NodeJS.CpuUsage;
	startTime: Date;
	endTime: Date;
	exitCode: number;
}

// Middleware system
export interface CliMiddleware {
	name: string;
	priority?: number;
	beforeCommand?: (
		context: CommandContext,
		next: () => Promise<void>
	) => Promise<void>;
	afterCommand?: (
		context: CommandContext,
		result: CommandResult,
		next: () => Promise<void>
	) => Promise<void>;
	onError?: (
		error: CliError,
		context: CommandContext,
		next: (error?: Error) => Promise<void>
	) => Promise<void>;
}

// Parsed command line arguments
export interface ParsedArgs {
	_: string[];
	[key: string]: any;
}

// Auto-updater types
export interface UpdateInfo {
	available: boolean;
	currentVersion: string;
	latestVersion: string;
	releaseNotes?: string;
	downloadUrl?: string;
	mandatory?: boolean;
}

// Analytics and telemetry
export interface TelemetryEvent {
	name: string;
	properties?: Record<string, any>;
	timestamp: Date;
	sessionId: string;
	userId?: string;
	version: string;
}

export interface TelemetryConfig {
	enabled: boolean;
	endpoint?: string;
	anonymize: boolean;
	collectPII: boolean;
	bufferSize: number;
	flushInterval: number;
}
