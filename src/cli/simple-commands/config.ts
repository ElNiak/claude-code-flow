// ABOUTME: Configuration management commands for initializing, viewing, and updating system configuration
// ABOUTME: Handles JSON-based configuration with validation and nested key operations

import {
	fileExists,
	printError,
	printSuccess,
	printWarning,
	readJsonFile,
	writeJsonFile,
} from "../utils.js";

/**
 * Configuration display format options
 */
export type ConfigFormat = "pretty" | "json";

/**
 * Terminal configuration settings
 */
export interface TerminalConfig {
	poolSize: number;
	recycleAfter: number;
	healthCheckInterval: number;
	type: string;
}

/**
 * Orchestrator configuration settings
 */
export interface OrchestratorConfig {
	maxConcurrentTasks: number;
	taskTimeout: number;
	defaultPriority: number;
}

/**
 * Memory backend configuration
 */
export interface MemoryConfig {
	backend: string;
	path: string;
	cacheSize: number;
	indexing: boolean;
}

/**
 * Agent resource limits configuration
 */
export interface AgentResourceLimits {
	memory: string;
	cpu: string;
}

/**
 * Agent configuration settings
 */
export interface AgentConfig {
	maxAgents: number;
	defaultCapabilities: string[];
	resourceLimits: AgentResourceLimits;
}

/**
 * MCP server configuration
 */
export interface MCPConfig {
	port: number;
	host: string;
	timeout: number;
}

/**
 * Logging configuration settings
 */
export interface LoggingConfig {
	level: string;
	file: string;
	maxSize: string;
	maxFiles: number;
}

/**
 * Complete system configuration schema
 */
export interface SystemConfig {
	version: string;
	terminal: TerminalConfig;
	orchestrator: OrchestratorConfig;
	memory: MemoryConfig;
	agents: AgentConfig;
	mcp: MCPConfig;
	logging: LoggingConfig;
	[key: string]: unknown;
}

/**
 * Command line flags for configuration operations
 */
export interface ConfigFlags {
	format?: ConfigFormat;
	force?: boolean;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
	errors: string[];
	warnings: string[];
	isValid: boolean;
}

/**
 * Main configuration command handler - routes to specific config operations
 * @param subArgs - Command line arguments after 'config'
 * @param flags - Command line flags and options
 */
export async function configCommand(
	subArgs: string[],
	flags: ConfigFlags,
): Promise<void> {
	const configCmd = subArgs[0];

	switch (configCmd) {
		case "init":
			await initConfig(subArgs, flags);
			break;

		case "show":
			await showConfig(subArgs, flags);
			break;

		case "get":
			await getConfigValue(subArgs, flags);
			break;

		case "set":
			await setConfigValue(subArgs, flags);
			break;

		case "validate":
			await validateConfig(subArgs, flags);
			break;

		case "reset":
			await resetConfig(subArgs, flags);
			break;

		default:
			showConfigHelp();
	}
}

/**
 * Initialize default configuration file
 * @param subArgs - Arguments including force flag
 * @param flags - Command flags for overwriting existing config
 */
async function initConfig(
	subArgs: string[],
	flags: ConfigFlags,
): Promise<void> {
	const force = subArgs.includes("--force") || subArgs.includes("-f");
	const configFile = "claude-flow.config.json";

	try {
		// Check if config already exists
		const exists = await fileExists(configFile);
		if (exists && !force) {
			printWarning("Configuration file already exists");
			console.log("Use --force to overwrite existing configuration");
			return;
		}

		printSuccess("Initializing Claude-Flow configuration...");

		// Create default configuration
		const defaultConfig: SystemConfig = {
			version: "1.0.71",
			terminal: {
				poolSize: 10,
				recycleAfter: 20,
				healthCheckInterval: 30000,
				type: "auto",
			},
			orchestrator: {
				maxConcurrentTasks: 10,
				taskTimeout: 300000,
				defaultPriority: 5,
			},
			memory: {
				backend: "json",
				path: "./memory/claude-flow-data.json",
				cacheSize: 1000,
				indexing: true,
			},
			agents: {
				maxAgents: 20,
				defaultCapabilities: ["research", "code", "terminal"],
				resourceLimits: {
					memory: "1GB",
					cpu: "50%",
				},
			},
			mcp: {
				port: 3000,
				host: "localhost",
				timeout: 30000,
			},
			logging: {
				level: "info",
				file: "./claude-flow.log",
				maxSize: "10MB",
				maxFiles: 5,
			},
		};

		await writeJsonFile(configFile, defaultConfig);
		console.log(`✓ Created ${configFile}`);
		console.log("✓ Default settings configured");
		console.log("\nNext steps:");
		console.log("1. Review settings: claude-flow config show");
		console.log("2. Customize values: claude-flow config set <key> <value>");
		console.log("3. Validate config: claude-flow config validate");
	} catch (err) {
		const error = err as Error;
		printError(`Failed to initialize configuration: ${error.message}`);
	}
}

/**
 * Display current configuration in specified format
 * @param subArgs - Arguments including format option
 * @param flags - Command flags for output format
 */
async function showConfig(
	subArgs: string[],
	flags: ConfigFlags,
): Promise<void> {
	const configFile = "claude-flow.config.json";
	const format = (getFlag(subArgs, "--format") as ConfigFormat) || "pretty";

	try {
		const config = (await readJsonFile(configFile)) as SystemConfig;

		printSuccess("Current configuration:");

		if (format === "json") {
			console.log(JSON.stringify(config, null, 2));
		} else {
			// Pretty format
			console.log("\n📋 System Configuration:");
			console.log(`   Version: ${config.version || "unknown"}`);
			console.log("\n🖥️  Terminal Pool:");
			console.log(`   Pool Size: ${config.terminal?.poolSize || 10}`);
			console.log(
				`   Recycle After: ${config.terminal?.recycleAfter || 20} commands`,
			);
			console.log(
				`   Health Check: ${config.terminal?.healthCheckInterval || 30000}ms`,
			);
			console.log("\n🎭 Orchestrator:");
			console.log(
				`   Max Concurrent Tasks: ${config.orchestrator?.maxConcurrentTasks || 10}`,
			);
			console.log(
				`   Task Timeout: ${config.orchestrator?.taskTimeout || 300000}ms`,
			);
			console.log("\n💾 Memory:");
			console.log(`   Backend: ${config.memory?.backend || "json"}`);
			console.log(
				`   Path: ${config.memory?.path || "./memory/claude-flow-data.json"}`,
			);
			console.log("\n🤖 Agents:");
			console.log(`   Max Agents: ${config.agents?.maxAgents || 20}`);
			console.log(
				`   Resource Limits: ${JSON.stringify(config.agents?.resourceLimits || {})}`,
			);
		}
	} catch (err) {
		printError("Configuration file not found");
		console.log(
			'Run "claude-flow config init" to create default configuration',
		);
	}
}

/**
 * Get a specific configuration value by key path
 * @param subArgs - Arguments containing the key path
 * @param flags - Command flags (unused in current implementation)
 */
async function getConfigValue(
	subArgs: string[],
	flags: ConfigFlags,
): Promise<void> {
	const key = subArgs[1];
	const configFile = "claude-flow.config.json";

	if (!key) {
		printError("Usage: config get <key>");
		console.log("Examples:");
		console.log("  claude-flow config get terminal.poolSize");
		console.log("  claude-flow config get orchestrator.maxConcurrentTasks");
		return;
	}

	try {
		const config = (await readJsonFile(configFile)) as SystemConfig;
		const value = getNestedValue(config as Record<string, unknown>, key);

		if (value !== undefined) {
			console.log(`${key}: ${JSON.stringify(value)}`);
		} else {
			printWarning(`Configuration key '${key}' not found`);
		}
	} catch (err) {
		printError("Configuration file not found");
		console.log('Run "claude-flow config init" to create configuration');
	}
}

/**
 * Set a configuration value by key path
 * @param subArgs - Arguments containing key and value
 * @param flags - Command flags (unused in current implementation)
 */
async function setConfigValue(
	subArgs: string[],
	flags: ConfigFlags,
): Promise<void> {
	const key = subArgs[1];
	const value = subArgs[2];
	const configFile = "claude-flow.config.json";

	if (!key || value === undefined) {
		printError("Usage: config set <key> <value>");
		console.log("Examples:");
		console.log("  claude-flow config set terminal.poolSize 15");
		console.log("  claude-flow config set orchestrator.taskTimeout 600000");
		return;
	}

	try {
		const config = (await readJsonFile(
			configFile,
			{},
		)) as Partial<SystemConfig>;

		// Parse value appropriately
		let parsedValue: string | number | boolean = value;
		if (value === "true") parsedValue = true;
		else if (value === "false") parsedValue = false;
		else if (!isNaN(Number(value)) && value.trim() !== "")
			parsedValue = Number(value);

		// Set nested value
		setNestedValue(config, key, parsedValue);

		await writeJsonFile(configFile, config);
		printSuccess(`Set ${key} = ${JSON.stringify(parsedValue)}`);
	} catch (err) {
		const error = err as Error;
		printError(`Failed to set configuration: ${error.message}`);
	}
}

/**
 * Validate current configuration against schema requirements
 * @param subArgs - Arguments (unused in current implementation)
 * @param flags - Command flags (unused in current implementation)
 */
async function validateConfig(
	subArgs: string[],
	flags: ConfigFlags,
): Promise<void> {
	const configFile = "claude-flow.config.json";

	try {
		const config = (await readJsonFile(configFile)) as Partial<SystemConfig>;

		printSuccess("Validating configuration...");

		const result = performValidation(config);

		// Report results
		if (result.isValid) {
			printSuccess("✅ Configuration is valid");
		} else {
			if (result.errors.length > 0) {
				printError(`Found ${result.errors.length} error(s):`);
				result.errors.forEach((error) => console.log(`  ❌ ${error}`));
			}

			if (result.warnings.length > 0) {
				printWarning(`Found ${result.warnings.length} warning(s):`);
				result.warnings.forEach((warning) => console.log(`  ⚠️  ${warning}`));
			}
		}
	} catch (err) {
		printError("Configuration file not found or invalid");
		console.log('Run "claude-flow config init" to create valid configuration');
	}
}

/**
 * Perform configuration validation logic
 * @param config - Configuration object to validate
 * @returns Validation result with errors and warnings
 */
function performValidation(config: Partial<SystemConfig>): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Validate required sections
	const requiredSections: (keyof SystemConfig)[] = [
		"terminal",
		"orchestrator",
		"memory",
	];
	for (const section of requiredSections) {
		if (!config[section]) {
			errors.push(`Missing required section: ${section}`);
		}
	}

	// Validate specific values
	if (
		config.terminal?.poolSize &&
		(config.terminal.poolSize < 1 || config.terminal.poolSize > 100)
	) {
		warnings.push("Terminal pool size should be between 1 and 100");
	}

	if (
		config.orchestrator?.maxConcurrentTasks &&
		config.orchestrator.maxConcurrentTasks < 1
	) {
		errors.push("Max concurrent tasks must be at least 1");
	}

	if (config.agents?.maxAgents && config.agents.maxAgents < 1) {
		errors.push("Max agents must be at least 1");
	}

	return {
		errors,
		warnings,
		isValid: errors.length === 0 && warnings.length === 0,
	};
}

/**
 * Reset configuration to default values
 * @param subArgs - Arguments including force flag
 * @param flags - Command flags for confirmation
 */
async function resetConfig(
	subArgs: string[],
	flags: ConfigFlags,
): Promise<void> {
	const force = subArgs.includes("--force") || subArgs.includes("-f");

	if (!force) {
		printWarning("This will reset configuration to defaults");
		console.log("Use --force to confirm reset");
		return;
	}

	await initConfig(["--force"], flags);
	printSuccess("Configuration reset to defaults");
}

/**
 * Get nested value from object using dot notation
 * @param obj - Object to traverse
 * @param path - Dot-separated path to value
 * @returns Value at path or undefined if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce((current: unknown, key: string) => {
		if (current && typeof current === "object" && key in current) {
			return (current as Record<string, unknown>)[key];
		}
		return undefined;
	}, obj as unknown);
}

/**
 * Set nested value in object using dot notation
 * @param obj - Object to modify
 * @param path - Dot-separated path to set
 * @param value - Value to set at path
 */
function setNestedValue(
	obj: Record<string, unknown>,
	path: string,
	value: unknown,
): void {
	const keys = path.split(".");
	const last = keys.pop();
	if (!last) return;

	const target = keys.reduce((current, key) => {
		if (!current[key] || typeof current[key] !== "object") {
			current[key] = {};
		}
		return current[key] as Record<string, unknown>;
	}, obj);

	target[last] = value;
}

/**
 * Extract flag value from command line arguments
 * @param args - Command line arguments array
 * @param flagName - Name of the flag to extract
 * @returns Flag value or null if not found
 */
function getFlag(args: string[], flagName: string): string | null {
	const index = args.indexOf(flagName);
	return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

/**
 * Display help information for configuration commands
 */
function showConfigHelp(): void {
	console.log("Configuration commands:");
	console.log(
		"  init [--force]                   Create default configuration",
	);
	console.log(
		"  show [--format json]             Display current configuration",
	);
	console.log("  get <key>                        Get configuration value");
	console.log("  set <key> <value>                Set configuration value");
	console.log("  validate                         Validate configuration");
	console.log("  reset --force                    Reset to defaults");
	console.log();
	console.log("Configuration Keys:");
	console.log("  terminal.poolSize                Terminal pool size");
	console.log("  terminal.recycleAfter            Commands before recycle");
	console.log("  orchestrator.maxConcurrentTasks  Max parallel tasks");
	console.log("  orchestrator.taskTimeout         Task timeout in ms");
	console.log("  memory.backend                   Memory storage backend");
	console.log("  memory.path                      Memory database path");
	console.log("  agents.maxAgents                 Maximum number of agents");
	console.log();
	console.log("Examples:");
	console.log("  claude-flow config init");
	console.log("  claude-flow config set terminal.poolSize 15");
	console.log("  claude-flow config get orchestrator.maxConcurrentTasks");
	console.log("  claude-flow config validate");
}
