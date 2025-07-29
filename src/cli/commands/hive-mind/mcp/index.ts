/**
 * Hive-Mind MCP Integration
 */

export { injectClaudeCodeClient, MCPIntegration } from "./integrate-wrapper.js";
export {
	type MCPOrchestrationConfig,
	MCPOrchestrationIntegration,
	type OrchestrationComponents,
} from "./orchestration-integration.js";
export {
	createRuvSwarmTools,
	getRuvSwarmCapabilities,
	type RuvSwarmResponse,
	type RuvSwarmToolContext,
} from "./ruv-swarm-tools.js";
