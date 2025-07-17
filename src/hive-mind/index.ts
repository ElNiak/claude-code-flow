/**
 * Hive Mind Module Export
 *
 * Main entry point for the Hive Mind collective intelligence system
 */

export { Agent } from "./core/Agent.js";
export { Communication } from "./core/Communication.js";
export { DatabaseManager } from "./core/DatabaseManager.js";
// Core classes,
// Default export,
export { HiveMind, HiveMind as default } from "./core/HiveMind.js";
export { Memory } from "./core/Memory.js";
export { Queen } from "./core/Queen.js";
export { ConsensusEngine } from "./integration/ConsensusEngine.js";
// Integration layer,
export { MCPToolWrapper } from "./integration/MCPToolWrapper.js";
export { SwarmOrchestrator } from "./integration/SwarmOrchestrator.js";
// Types,
export * from "./types.js";
