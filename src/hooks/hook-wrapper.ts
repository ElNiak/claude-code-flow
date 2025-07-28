/**
 * Hook Wrapper
 *
 * Provides a simplified interface for hook execution with automatic
 * deadlock prevention and coordination
 */

import { debugLogger } from "../utils/debug-logger.js";
import { executeHookCoordinated } from "./hook-coordinator.js";
import type { HookType } from "./hook-execution-manager.js";

/**
 * Safe hook execution wrapper
 * Automatically handles coordination and deadlock prevention
 */
export class HookWrapper {
	private static instance: HookWrapper;
	private enabled = true;
	private debugMode = false;

	constructor() {
		// Check environment variables
		this.enabled = process.env.CLAUDE_FLOW_HOOKS_ENABLED !== "false";
		this.debugMode = process.env.CLAUDE_FLOW_HOOKS_DEBUG === "true";

		debugLogger.logEvent(
			"HookWrapper",
			"constructor",
			{
				enabled: this.enabled,
				debugMode: this.debugMode,
				envHooksEnabled: process.env.CLAUDE_FLOW_HOOKS_ENABLED,
				envHooksDebug: process.env.CLAUDE_FLOW_HOOKS_DEBUG,
			},
			"hook-wrapper",
		);
	}

	static getInstance(): HookWrapper {
		return debugLogger.logSyncFunction(
			"HookWrapper",
			"getInstance",
			() => {
				const wasNewInstance = !HookWrapper.instance;
				if (!HookWrapper.instance) {
					debugLogger.logEvent(
						"HookWrapper",
						"getInstance.createNewInstance",
						{},
						"hook-wrapper",
					);
					HookWrapper.instance = new HookWrapper();
				} else {
					debugLogger.logEvent(
						"HookWrapper",
						"getInstance.reuseExistingInstance",
						{},
						"hook-wrapper",
					);
				}
				return HookWrapper.instance;
			},
			[],
			"hook-wrapper",
		);
	}

	/**
	 * Execute pre-task hook
	 */
	async preTask(
		description: string,
		options: { autoSpawnAgents?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"preTask",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"preTask.start",
					{ description, options, enabled: this.enabled },
					"hook-wrapper",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"preTask.disabled",
						{ reason: "hooks_disabled" },
						"hook-wrapper",
					);
					return;
				}

				const args = [
					"--description",
					description,
					"--auto-spawn-agents",
					options.autoSpawnAgents ? "true" : "false",
				];

				debugLogger.logEvent(
					"HookWrapper",
					"preTask.argsBuilt",
					{ args, priority: "high" },
					"hook-wrapper",
				);
				await this.executeHookSafely("pre-task", args, "high");
				debugLogger.logEvent(
					"HookWrapper",
					"preTask.complete",
					{ description },
					"hook-wrapper",
				);
			},
			[description, options],
			"hook-wrapper",
		);
	}

	/**
	 * Execute post-edit hook
	 */
	async postEdit(filePath: string, memoryKey?: string): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"postEdit",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"postEdit.start",
					{ filePath, memoryKey, enabled: this.enabled },
					"hook-wrapper",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"postEdit.disabled",
						{ reason: "hooks_disabled" },
						"hook-wrapper",
					);
					return;
				}

				const args = ["--file", filePath];
				if (memoryKey) {
					args.push("--memory-key", memoryKey);
					debugLogger.logEvent(
						"HookWrapper",
						"postEdit.memoryKeyAdded",
						{ memoryKey },
						"hook-wrapper",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"postEdit.argsBuilt",
					{ args, priority: "medium" },
					"hook-wrapper",
				);
				await this.executeHookSafely("post-edit", args, "medium");
				debugLogger.logEvent(
					"HookWrapper",
					"postEdit.complete",
					{ filePath },
					"hook-wrapper",
				);
			},
			[filePath, memoryKey],
			"hook-wrapper",
		);
	}

	/**
	 * Execute post-task hook
	 */
	async postTask(
		taskId: string,
		options: { analyzePerformance?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"postTask",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"postTask.start",
					{ taskId, options, enabled: this.enabled },
					"hook-wrapper",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"postTask.disabled",
						{ reason: "hooks_disabled" },
						"hook-wrapper",
					);
					return;
				}

				const args = ["--task-id", taskId];
				if (options.analyzePerformance) {
					args.push("--analyze-performance", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"postTask.performanceAnalysisEnabled",
						{ taskId },
						"hook-wrapper",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"postTask.argsBuilt",
					{ args, priority: "medium" },
					"hook-wrapper",
				);
				await this.executeHookSafely("post-task", args, "medium");
				debugLogger.logEvent(
					"HookWrapper",
					"postTask.complete",
					{ taskId },
					"hook-wrapper",
				);
			},
			[taskId, options],
			"hook-wrapper",
		);
	}

	/**
	 * Execute pre-bash hook
	 */
	async preBash(
		command: string,
		options: { validateSafety?: boolean; prepareResources?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"preBash",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"preBash.start",
					{ command, options, enabled: this.enabled },
					"hook-wrapper",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"preBash.disabled",
						{ reason: "hooks_disabled" },
						"hook-wrapper",
					);
					return;
				}

				const args = ["--command", command];
				if (options.validateSafety) {
					args.push("--validate-safety", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"preBash.safetyValidationEnabled",
						{ command },
						"hook-wrapper",
					);
				}
				if (options.prepareResources) {
					args.push("--prepare-resources", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"preBash.resourcePreparationEnabled",
						{ command },
						"hook-wrapper",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"preBash.argsBuilt",
					{ args, priority: "high" },
					"hook-wrapper",
				);
				await this.executeHookSafely("pre-bash", args, "high");
				debugLogger.logEvent(
					"HookWrapper",
					"preBash.complete",
					{ command },
					"hook-wrapper",
				);
			},
			[command, options],
			"hook-wrapper",
		);
	}

	/**
	 * Execute pre-edit hook
	 */
	async preEdit(
		filePath: string,
		options: { autoAssignAgents?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"preEdit",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"preEdit.start",
					{ filePath, options, enabled: this.enabled },
					"hook-wrapper",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"preEdit.disabled",
						{ reason: "hooks_disabled" },
						"hook-wrapper",
					);
					return;
				}

				const args = ["--file", filePath];
				if (options.autoAssignAgents) {
					args.push("--auto-assign-agents", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"preEdit.autoAssignAgentsEnabled",
						{ filePath },
						"hook-wrapper",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"preEdit.argsBuilt",
					{ args, priority: "high" },
					"hook-wrapper",
				);
				await this.executeHookSafely("pre-edit", args, "high");
				debugLogger.logEvent(
					"HookWrapper",
					"preEdit.complete",
					{ filePath },
					"hook-wrapper",
				);
			},
			[filePath, options],
			"hook-wrapper",
		);
	}

	/**
	 * Execute pre-read hook
	 */
	async preRead(
		filePath: string,
		options: { symbolsOverview?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"preRead",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"preRead.start",
					{ filePath, options, enabled: this.enabled },
					"hook-wrapper",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"preRead.disabled",
						{ reason: "hooks_disabled" },
						"hook-wrapper",
					);
					return;
				}

				const args = ["--file", filePath];
				if (options.symbolsOverview) {
					args.push("--symbols-overview", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"preRead.symbolsOverviewEnabled",
						{ filePath },
						"hook-wrapper",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"preRead.argsBuilt",
					{ args, priority: "low" },
					"hook-wrapper",
				);
				await this.executeHookSafely("pre-read", args, "low");
				debugLogger.logEvent(
					"HookWrapper",
					"preRead.complete",
					{ filePath },
					"hook-wrapper",
				);
			},
			[filePath, options],
			"hook-wrapper",
		);
	}

	/**
	 * Execute notification hook
	 */
	async notify(
		message: string,
		options: { telemetry?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"notify",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"notify.start",
					{ message, options, enabled: this.enabled },
					"hook-notify",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"notify.disabled",
						{ reason: "hooks_disabled" },
						"hook-notify",
					);
					return;
				}

				const args = ["--message", message];
				if (options.telemetry) {
					args.push("--telemetry", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"notify.telemetryEnabled",
						{ message },
						"hook-notify",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"notify.argsBuilt",
					{ args, priority: "low" },
					"hook-notify",
				);
				await this.executeHookSafely("notify", args, "low");
				debugLogger.logEvent(
					"HookWrapper",
					"notify.complete",
					{ message },
					"hook-notify",
				);
			},
			[message, options],
			"hook-notify",
		);
	}

	/**
	 * Execute session restore hook
	 */
	async sessionRestore(
		sessionId: string,
		options: { loadMemory?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"sessionRestore",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"sessionRestore.start",
					{ sessionId, options, enabled: this.enabled },
					"hook-lifecycle",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"sessionRestore.disabled",
						{ reason: "hooks_disabled" },
						"hook-lifecycle",
					);
					return;
				}

				const args = ["--session-id", sessionId];
				if (options.loadMemory) {
					args.push("--load-memory", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"sessionRestore.memoryLoadEnabled",
						{ sessionId },
						"hook-lifecycle",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"sessionRestore.argsBuilt",
					{ args, priority: "high" },
					"hook-lifecycle",
				);
				await this.executeHookSafely("session-restore", args, "high");
				debugLogger.logEvent(
					"HookWrapper",
					"sessionRestore.complete",
					{ sessionId },
					"hook-lifecycle",
				);
			},
			[sessionId, options],
			"hook-lifecycle",
		);
	}

	/**
	 * Execute session end hook
	 */
	async sessionEnd(
		options: { exportMetrics?: boolean; generateSummary?: boolean } = {},
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"sessionEnd",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"sessionEnd.start",
					{ options, enabled: this.enabled },
					"hook-lifecycle",
				);

				if (!this.enabled) {
					debugLogger.logEvent(
						"HookWrapper",
						"sessionEnd.disabled",
						{ reason: "hooks_disabled" },
						"hook-lifecycle",
					);
					return;
				}

				const args: string[] = [];
				if (options.exportMetrics) {
					args.push("--export-metrics", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"sessionEnd.metricsExportEnabled",
						{},
						"hook-lifecycle",
					);
				}
				if (options.generateSummary) {
					args.push("--generate-summary", "true");
					debugLogger.logEvent(
						"HookWrapper",
						"sessionEnd.summaryGenerationEnabled",
						{},
						"hook-lifecycle",
					);
				}

				debugLogger.logEvent(
					"HookWrapper",
					"sessionEnd.argsBuilt",
					{ args, priority: "medium" },
					"hook-lifecycle",
				);
				await this.executeHookSafely("session-end", args, "medium");
				debugLogger.logEvent(
					"HookWrapper",
					"sessionEnd.complete",
					{},
					"hook-lifecycle",
				);
			},
			[options],
			"hook-lifecycle",
		);
	}

	/**
	 * Execute hook with coordination and error handling
	 */
	private async executeHookSafely(
		hookType: HookType,
		args: string[],
		priority: "low" | "medium" | "high",
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWrapper",
			"executeHookSafely",
			async () => {
				debugLogger.logEvent(
					"HookWrapper",
					"executeHookSafely.start",
					{ hookType, args, priority, debugMode: this.debugMode },
					"hook-operation",
				);

				if (this.debugMode) {
					console.log(`[HookWrapper] Executing ${hookType} with args:`, args);
				}

				try {
					debugLogger.logEvent(
						"HookWrapper",
						"executeHookSafely.coordinatedExecution",
						{ hookType, priority },
						"hook-operation",
					);
					await executeHookCoordinated(hookType, args, { priority });

					debugLogger.logEvent(
						"HookWrapper",
						"executeHookSafely.success",
						{ hookType },
						"hook-operation",
					);
					if (this.debugMode) {
						console.log(`[HookWrapper] Successfully executed ${hookType}`);
					}
				} catch (error) {
					// Type guard to safely handle unknown error type
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					const errorObject =
						error instanceof Error ? error : new Error(String(error));

					debugLogger.logEvent(
						"HookWrapper",
						"executeHookSafely.error",
						{ hookType, error: errorMessage, nodeEnv: process.env.NODE_ENV },
						"hook-operation",
					);

					if (this.debugMode) {
						console.error(
							`[HookWrapper] Failed to execute ${hookType}:`,
							error,
						);
					}

					// Don't throw in production to prevent breaking the main flow
					if (process.env.NODE_ENV === "development") {
						debugLogger.logEvent(
							"HookWrapper",
							"executeHookSafely.throwingError",
							{ hookType, error: errorMessage },
							"hook-operation",
						);
						throw errorObject;
					} else {
						debugLogger.logEvent(
							"HookWrapper",
							"executeHookSafely.suppressedError",
							{ hookType, error: errorMessage, reason: "production_mode" },
							"hook-operation",
						);
					}
				}
			},
			[hookType, args, priority],
			"hook-operation",
		);
	}

	/**
	 * Enable/disable hooks
	 */
	setEnabled(enabled: boolean): void {
		debugLogger.logEvent(
			"HookWrapper",
			"setEnabled",
			{ enabled, previousState: this.enabled },
			"hook-wrapper",
		);
		this.enabled = enabled;
	}

	/**
	 * Enable/disable debug mode
	 */
	setDebugMode(enabled: boolean): void {
		debugLogger.logEvent(
			"HookWrapper",
			"setDebugMode",
			{ enabled, previousState: this.debugMode },
			"hook-wrapper",
		);
		this.debugMode = enabled;
	}

	/**
	 * Get hook status
	 */
	getStatus(): { enabled: boolean; debugMode: boolean } {
		return debugLogger.logSyncFunction(
			"HookWrapper",
			"getStatus",
			() => {
				const status = {
					enabled: this.enabled,
					debugMode: this.debugMode,
				};
				debugLogger.logEvent(
					"HookWrapper",
					"getStatus.result",
					status,
					"hook-wrapper",
				);
				return status;
			},
			[],
			"hook-wrapper",
		);
	}
}

// Global instance
export const hookWrapper = HookWrapper.getInstance();

// Convenience functions for common hook patterns
export async function executePreTaskHook(
	description: string,
	options: { autoSpawnAgents?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executePreTaskHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executePreTaskHook.delegate",
				{ description, options },
				"hook-wrapper",
			);
			return hookWrapper.preTask(description, options);
		},
		[description, options],
		"hook-wrapper",
	);
}

export async function executePostEditHook(
	filePath: string,
	memoryKey?: string,
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executePostEditHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executePostEditHook.delegate",
				{ filePath, memoryKey },
				"hook-wrapper",
			);
			return hookWrapper.postEdit(filePath, memoryKey);
		},
		[filePath, memoryKey],
		"hook-wrapper",
	);
}

export async function executePostTaskHook(
	taskId: string,
	options: { analyzePerformance?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executePostTaskHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executePostTaskHook.delegate",
				{ taskId, options },
				"hook-wrapper",
			);
			return hookWrapper.postTask(taskId, options);
		},
		[taskId, options],
		"hook-wrapper",
	);
}

export async function executePreBashHook(
	command: string,
	options: { validateSafety?: boolean; prepareResources?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executePreBashHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executePreBashHook.delegate",
				{ command, options },
				"hook-wrapper",
			);
			return hookWrapper.preBash(command, options);
		},
		[command, options],
		"hook-wrapper",
	);
}

export async function executePreEditHook(
	filePath: string,
	options: { autoAssignAgents?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executePreEditHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executePreEditHook.delegate",
				{ filePath, options },
				"hook-wrapper",
			);
			return hookWrapper.preEdit(filePath, options);
		},
		[filePath, options],
		"hook-wrapper",
	);
}

export async function executePreReadHook(
	filePath: string,
	options: { symbolsOverview?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executePreReadHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executePreReadHook.delegate",
				{ filePath, options },
				"hook-wrapper",
			);
			return hookWrapper.preRead(filePath, options);
		},
		[filePath, options],
		"hook-wrapper",
	);
}

export async function executeNotifyHook(
	message: string,
	options: { telemetry?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executeNotifyHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executeNotifyHook.delegate",
				{ message, options },
				"hook-notify",
			);
			return hookWrapper.notify(message, options);
		},
		[message, options],
		"hook-notify",
	);
}

export async function executeSessionRestoreHook(
	sessionId: string,
	options: { loadMemory?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executeSessionRestoreHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executeSessionRestoreHook.delegate",
				{ sessionId, options },
				"hook-lifecycle",
			);
			return hookWrapper.sessionRestore(sessionId, options);
		},
		[sessionId, options],
		"hook-lifecycle",
	);
}

export async function executeSessionEndHook(
	options: { exportMetrics?: boolean; generateSummary?: boolean } = {},
): Promise<void> {
	return debugLogger.logAsyncFunction(
		"hook-wrapper",
		"executeSessionEndHook",
		async () => {
			debugLogger.logEvent(
				"hook-wrapper",
				"executeSessionEndHook.delegate",
				{ options },
				"hook-lifecycle",
			);
			return hookWrapper.sessionEnd(options);
		},
		[options],
		"hook-lifecycle",
	);
}

// Enhanced hook patterns for common workflows
export class HookWorkflow {
	private wrapper: HookWrapper;

	constructor() {
		this.wrapper = HookWrapper.getInstance();
	}

	/**
	 * Task execution workflow
	 */
	async executeTaskWorkflow(
		taskId: string,
		description: string,
		filePaths: string[],
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWorkflow",
			"executeTaskWorkflow",
			async () => {
				debugLogger.logEvent(
					"HookWorkflow",
					"executeTaskWorkflow.start",
					{ taskId, description, fileCount: filePaths.length },
					"hook-workflow",
				);

				// Pre-task hook
				debugLogger.logEvent(
					"HookWorkflow",
					"executeTaskWorkflow.preTask",
					{ taskId, description },
					"hook-workflow",
				);
				await this.wrapper.preTask(description, { autoSpawnAgents: true });

				// Pre-edit hooks for all files
				debugLogger.logEvent(
					"HookWorkflow",
					"executeTaskWorkflow.preEditPhase",
					{ taskId, fileCount: filePaths.length },
					"hook-workflow",
				);
				for (const filePath of filePaths) {
					debugLogger.logEvent(
						"HookWorkflow",
						"executeTaskWorkflow.preEditFile",
						{ taskId, filePath },
						"hook-workflow",
					);
					await this.wrapper.preEdit(filePath, { autoAssignAgents: true });
				}

				// Post-edit hooks for all files
				debugLogger.logEvent(
					"HookWorkflow",
					"executeTaskWorkflow.postEditPhase",
					{ taskId, fileCount: filePaths.length },
					"hook-workflow",
				);
				for (const filePath of filePaths) {
					const memoryKey = `task/${taskId}/${path.basename(filePath)}`;
					debugLogger.logEvent(
						"HookWorkflow",
						"executeTaskWorkflow.postEditFile",
						{ taskId, filePath, memoryKey },
						"hook-workflow",
					);
					await this.wrapper.postEdit(filePath, memoryKey);
				}

				// Post-task hook
				debugLogger.logEvent(
					"HookWorkflow",
					"executeTaskWorkflow.postTask",
					{ taskId },
					"hook-workflow",
				);
				await this.wrapper.postTask(taskId, { analyzePerformance: true });
				debugLogger.logEvent(
					"HookWorkflow",
					"executeTaskWorkflow.complete",
					{ taskId, fileCount: filePaths.length },
					"hook-workflow",
				);
			},
			[taskId, description, filePaths],
			"hook-workflow",
		);
	}

	/**
	 * File operation workflow
	 */
	async executeFileWorkflow(
		filePath: string,
		operation: "read" | "edit",
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWorkflow",
			"executeFileWorkflow",
			async () => {
				debugLogger.logEvent(
					"HookWorkflow",
					"executeFileWorkflow.start",
					{ filePath, operation },
					"hook-workflow",
				);

				if (operation === "read") {
					debugLogger.logEvent(
						"HookWorkflow",
						"executeFileWorkflow.readOperation",
						{ filePath },
						"hook-workflow",
					);
					await this.wrapper.preRead(filePath, { symbolsOverview: true });
				} else {
					debugLogger.logEvent(
						"HookWorkflow",
						"executeFileWorkflow.editOperation",
						{ filePath },
						"hook-workflow",
					);
					await this.wrapper.preEdit(filePath, { autoAssignAgents: true });
					await this.wrapper.postEdit(filePath);
				}
				debugLogger.logEvent(
					"HookWorkflow",
					"executeFileWorkflow.complete",
					{ filePath, operation },
					"hook-workflow",
				);
			},
			[filePath, operation],
			"hook-workflow",
		);
	}

	/**
	 * Session workflow
	 */
	async executeSessionWorkflow(
		sessionId: string,
		action: "start" | "end",
	): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWorkflow",
			"executeSessionWorkflow",
			async () => {
				debugLogger.logEvent(
					"HookWorkflow",
					"executeSessionWorkflow.start",
					{ sessionId, action },
					"hook-workflow",
				);

				if (action === "start") {
					debugLogger.logEvent(
						"HookWorkflow",
						"executeSessionWorkflow.sessionStart",
						{ sessionId },
						"hook-workflow",
					);
					await this.wrapper.sessionRestore(sessionId, { loadMemory: true });
				} else {
					debugLogger.logEvent(
						"HookWorkflow",
						"executeSessionWorkflow.sessionEnd",
						{ sessionId },
						"hook-workflow",
					);
					await this.wrapper.sessionEnd({
						exportMetrics: true,
						generateSummary: true,
					});
				}
				debugLogger.logEvent(
					"HookWorkflow",
					"executeSessionWorkflow.complete",
					{ sessionId, action },
					"hook-workflow",
				);
			},
			[sessionId, action],
			"hook-workflow",
		);
	}

	/**
	 * Bash command workflow
	 */
	async executeBashWorkflow(command: string): Promise<void> {
		return debugLogger.logAsyncFunction(
			"HookWorkflow",
			"executeBashWorkflow",
			async () => {
				debugLogger.logEvent(
					"HookWorkflow",
					"executeBashWorkflow.start",
					{ command },
					"hook-workflow",
				);

				await this.wrapper.preBash(command, {
					validateSafety: true,
					prepareResources: true,
				});
				debugLogger.logEvent(
					"HookWorkflow",
					"executeBashWorkflow.complete",
					{ command },
					"hook-workflow",
				);
			},
			[command],
			"hook-workflow",
		);
	}
}

// Global workflow instance
export const hookWorkflow = new HookWorkflow();

// Import path for easier module resolution
import path from "path";
