#!/usr/bin/env node
/**
 * Complete Claude-Flow MCP Stdio Server
 * Standalone stdio-based MCP server implementation
 * Compatible with Claude Code CLI integration
 */

import { ClaudeFlowMCPServer } from "./mcp-server-complete.js";

// Create and start the stdio server using legacy working implementation
async function startMCPServer() {
	const server = new ClaudeFlowMCPServer();

	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Server starting on stdio`
	);
	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Session: ${server.sessionId}`
	);
	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Tools available: ${Object.keys(server.tools).length}`
	);
	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Ready for MCP communication`
	);

	// Handle stdin messages using legacy approach
	let buffer = "";

	process.stdin.on("data", async (chunk) => {
		buffer += chunk.toString();

		// Process complete JSON messages
		const lines = buffer.split("\n");
		buffer = lines.pop() || ""; // Keep incomplete line in buffer

		for (const line of lines) {
			if (line.trim()) {
				try {
					const message = JSON.parse(line);
					const response = await server.handleMessage(message);
					if (response) {
						console.log(JSON.stringify(response));
					}
				} catch (error) {
					console.error(
						`[${new Date().toISOString()}] ERROR [claude-flow-mcp-stdio] Failed to parse message:`,
						error.message
					);
				}
			}
		}
	});

	process.stdin.on("end", () => {
		console.error(
			`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Connection closed`
		);
		process.exit(0);
	});
}

// Start the server
startMCPServer().catch(console.error);

console.error(
	`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Server starting on stdio`
);
console.error(
	`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Session: ${server.sessionId}`
);
console.error(
	`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Tools available: ${Object.keys(server.tools).length}`
);
console.error(
	`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Resources available: ${Object.keys(server.resources).length}`
);
console.error(
	`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Ready for MCP communication`
);

// Handle clean shutdown
process.on("SIGINT", () => {
	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Received SIGINT, shutting down`
	);
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.error(
		`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Received SIGTERM, shutting down`
	);
	process.exit(0);
});

process.on("uncaughtException", (error) => {
	console.error(
		`[${new Date().toISOString()}] ERROR [claude-flow-mcp-stdio] Uncaught exception: ${error.message}`
	);
	console.error(error.stack);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error(
		`[${new Date().toISOString()}] ERROR [claude-flow-mcp-stdio] Unhandled rejection:`,
		reason
	);
	process.exit(1);
});
