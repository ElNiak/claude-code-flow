// ABOUTME: Swarm-specific memory coordination and management exports
// ABOUTME: Provides unified access to swarm memory functionality

// Re-export both JavaScript and TypeScript implementations
export {
	createSwarmMemory,
	SWARM_NAMESPACES,
	SwarmMemory,
} from "./swarm-memory.js";
export { default as SwarmMemoryTS } from "./swarm-memory.ts";
