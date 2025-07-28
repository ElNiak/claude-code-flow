/**
 * Memory Module - Unified memory persistence for ruv-swarm
 *
 * Provides both generic SharedMemory and MCP-specific SwarmMemory implementations
 *
 * @module memory
 */

import { debugLogger } from "../utils/debug-logger.js";
import SharedMemory from "./shared-memory.js";
import { createSwarmMemory, SwarmMemory } from "./swarm-memory.js";

export { SharedMemory, SwarmMemory, createSwarmMemory };

// Re-export swarm namespaces for convenience
export const SWARM_NAMESPACES = {
	AGENTS: "swarm:agents",
	TASKS: "swarm:tasks",
	COMMUNICATIONS: "swarm:communications",
	CONSENSUS: "swarm:consensus",
	PATTERNS: "swarm:patterns",
	METRICS: "swarm:metrics",
	COORDINATION: "swarm:coordination",
};

/**
 * Create memory instance based on context
 * @param {Object} options - Configuration options
 * @returns {SharedMemory|SwarmMemory} Memory instance
 */
export function createMemory(options = {}) {
	const correlationId = debugLogger.logFunctionEntry(
		"MemoryModule",
		"createMemory",
		{ type: options.type, swarmId: options.swarmId },
		"memory-backend",
	);

	let instance;
	if (options.type === "swarm" || options.swarmId) {
		instance = new SwarmMemory(options);
		debugLogger.logEvent(
			"MemoryModule",
			"swarm-memory-created",
			{ swarmId: options.swarmId },
			"memory-backend",
		);
	} else {
		instance = new SharedMemory(options);
		debugLogger.logEvent(
			"MemoryModule",
			"shared-memory-created",
			{ directory: options.directory },
			"memory-backend",
		);
	}

	debugLogger.logFunctionExit(
		correlationId,
		{ type: instance.constructor.name },
		"memory-backend",
	);
	return instance;
}

// Default export for backwards compatibility
export default { SharedMemory, SwarmMemory, createMemory, SWARM_NAMESPACES };
