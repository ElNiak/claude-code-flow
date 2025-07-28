#!/usr/bin/env node
/**
 * Complete Claude-Flow MCP Stdio Server
 * Standalone stdio-based MCP server implementation
 * Compatible with Claude Code CLI integration
 */

import { ClaudeFlowMCPServer } from "./mcp-server-complete.js";

// Create and start the stdio server using legacy working implementation
async function startMCPServer() {
	// Import debug logger
	const { debugLogger } = require("../utils/debug-logger.js");
	const correlationId = debugLogger.logFunctionEntry(
		"StdioMCPServer",
		"startMCPServer",
		[],
		"mcp-server",
	);

	try {
		debugLogger.logEvent(
			"StdioMCPServer",
			"stdio-server-startup-initiated",
			{
				nodeVersion: process.version,
				platform: process.platform,
				processId: process.pid,
			},
			"mcp-server",
		);

		const { ClaudeFlowMCPServer } = require("./mcp-server-complete.js");
		const server = new ClaudeFlowMCPServer({
			name: "claude-flow-mcp-stdio-server",
			version: "2.0.0",
			stdio: true,
		});

		debugLogger.logEvent(
			"StdioMCPServer",
			"server-instance-created",
			{
				serverName: server.config?.name,
				serverVersion: server.config?.version,
			},
			"mcp-server",
		);

		// Initialize server components
		await server.initializeMemoryStore();
		await server.initializeTools();
		await server.initializeResources();

		debugLogger.logEvent(
			"StdioMCPServer",
			"server-components-initialized",
			{
				toolsCount: server.tools?.size,
				resourcesCount: server.resources?.size,
				memoryInitialized: !!server.memoryStore,
			},
			"mcp-server",
		);

		// Setup stdio protocol
		server.setupStdioProtocol();

		debugLogger.logEvent(
			"StdioMCPServer",
			"stdio-protocol-configured",
			{},
			"mcp-server",
		);

		debugLogger.logEvent(
			"StdioMCPServer",
			"server-ready-listening",
			{
				serverName: server.config?.name,
				processId: process.pid,
			},
			"mcp-server",
		);

		debugLogger.logFunctionExit(
			correlationId,
			{ success: true, processId: process.pid },
			"mcp-server",
		);
		return server;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "mcp-server");
		throw error;
	}
}

// Start the server
startMCPServer().catch(console.error);

// Handle clean shutdown
process.on("SIGINT", () => {
	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Received SIGINT, shutting down`,
	);
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Received SIGTERM, shutting down`,
	);
	process.exit(0);
});

process.on("uncaughtException", (error) => {
	console.error(
		`[${new Date().toISOString()}] ERROR [claude-flow-mcp-stdio] Uncaught exception: ${error.message}`,
	);
	console.error(error.stack);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error(
		`[${new Date().toISOString()}] ERROR [claude-flow-mcp-stdio] Unhandled rejection:`,
		reason,
	);
	process.exit(1);
});
