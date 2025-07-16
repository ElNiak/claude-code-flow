#!/usr/bin/env node
/**
 * Complete Claude-Flow MCP Stdio Server
 * Standalone stdio-based MCP server implementation
 * Compatible with Claude Code CLI integration
 */


// Create and start the stdio server
const _server = new ClaudeFlowMCPServer();

console.error(`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Server starting on stdio`);
console.error(`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Session: ${server.sessionId}`);
console.error(`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Tools available: ${Object.keys(server.tools).length}`);
console.error(`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Resources available: ${Object.keys(server.resources).length}`);
console.error(`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Ready for MCP communication`);

// Handle clean shutdown
process.on(_'SIGINT', _() => {
  console.error(`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Received SIGINT, shutting down`);
  process.exit(0);
});

process.on(_'SIGTERM', _() => {
  console.error(`[${new Date().toISOString()}] INFO [claude-flow-mcp-stdio] Received SIGTERM, shutting down`);
  process.exit(0);
});

process.on(_'uncaughtException', _(error) => {
  console.error(`[${new Date().toISOString()}] ERROR [claude-flow-mcp-stdio] Uncaught exception: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on(_'unhandledRejection', _(reason, _promise) => {
  console.error(`[${new Date().toISOString()}] ERROR [claude-flow-mcp-stdio] Unhandled rejection:`, reason);
  process.exit(1);
});