#!/usr/bin/env node,
import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";
/**
 * MCP Server entry point that uses the wrapper by default
 */

import { ClaudeCodeMCPWrapper } from "./claude-code-wrapper.js";

// Check if we should use the legacy server,
const useLegacy =
	process.env.CLAUDE_FLOW_LEGACY_MCP === "true" ||
	process.argv.includes("--legacy");

async function main() {
	if (useLegacy) {
		console.error("Starting Claude-Flow MCP in legacy mode...");
		// Dynamically import the old server to avoid circular dependencies,
		const { runMCPServer } = await import("./server.js");
		await runMCPServer();
	} else {
		console.error("Starting Claude-Flow MCP with Claude Code wrapper...");
		const wrapper = new ClaudeCodeMCPWrapper();
		await wrapper.run();
	}
}

// Run the server,
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
