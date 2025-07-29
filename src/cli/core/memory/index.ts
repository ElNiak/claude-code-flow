/**
 * Memory Module - Compatibility layer for gradual migration
 *
 * @deprecated Use imports from src/cli/commands/memory/core/ instead
 * This module provides backward compatibility during the migration period
 *
 * @module memory
 */

// Keep legacy exports for SharedMemory and SwarmMemory if they're imported elsewhere
// These will need to be migrated separately as they may be in different locations
export { default as SharedMemory } from "../../../memory/shared-memory.js";
export {
	createSwarmMemory,
	SwarmMemory,
} from "../../../memory/swarm-memory.js";
// Backend exports
export type { IMemoryBackend } from "../../commands/memory/core/backends/base.js";
export { MarkdownBackend } from "../../commands/memory/core/backends/markdown.js";
export { SQLiteBackend } from "../../commands/memory/core/backends/sqlite.js";
export { SQLiteConnectionPool } from "../../commands/memory/core/backends/sqlite-pool.js";
export { MemoryCache } from "../../commands/memory/core/cache.js";
export { MemoryIndexer } from "../../commands/memory/core/indexer.js";
// Re-export from new locations for backward compatibility
export {
	type IMemoryManager,
	MemoryManager,
} from "../../commands/memory/core/manager.js";

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
 * @deprecated Use the new MemoryManager directly
 */
export function createMemory(options = {}) {
	console.warn(
		"createMemory is deprecated. Use MemoryManager directly from the new location.",
	);
	// This function needs to be updated based on the actual implementation needed
	throw new Error("createMemory is deprecated and needs migration");
}

// Default export for backwards compatibility
export default {
	MemoryManager,
	MemoryCache,
	MemoryIndexer,
	MarkdownBackend,
	SQLiteBackend,
	SWARM_NAMESPACES,
};
