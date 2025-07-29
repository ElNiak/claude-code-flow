import { getErrorMessage as _getErrorMessage } from "../cli/shared/errors/error-handler.js";

export * from "../../memory/core/memory.js";
// Optimizations,
export * from "../../monitor/optimizations/index.js";
export * from "../../prompt/core/prompt-cli.js";
// Prompt copying system exports,
export * from "../../prompt/core/prompt-copier.js";
export * from "../../prompt/core/prompt-copier-enhanced.js";
export * from "../../prompt/core/prompt-manager.js";
export * from "../../prompt/utils/prompt-utils.js";
// Main exports for the swarm system,
export * from "../core/coordinator.js";
export * from "../core/executor.js";
export * from "../strategies/auto.js";
export * from "../strategies/base.js";
export * from "../strategies/research.js";
export * from "../types.js";

// Utility function to get all exports,
export function getSwarmComponents() {
	return {
		// Core components,
		coordinator: () => import("./coordinator.js"),
		executor: () => import("./executor.js"),
		types: () => import("./types.js"),

		// Strategies,
		strategies: {
			base: () => import("./strategies/base.js"),
			auto: () => import("./strategies/auto.js"),
			research: () => import("./strategies/research.js"),
		},

		// Memory,
		memory: () => import("./memory.js"),

		// Prompt system,
		promptCopier: () => import("./prompt-copier.js"),
		promptCopierEnhanced: () => import("./prompt-copier-enhanced.js"),
		promptUtils: () => import("./prompt-utils.js"),
		promptManager: () => import("./prompt-manager.js"),
		promptCli: () => import("./prompt-cli.js"),

		// Optimizations,
		optimizations: () => import("./optimizations/index.js"),
	};
}
