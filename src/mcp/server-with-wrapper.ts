#!/usr/bin/env node
/**
 * MCP Server entry point that uses the wrapper by default
 */

import { ClaudeCodeMCPWrapper } from './claude-code-wrapper.js';

// Check if we should use the legacy server
const useLegacy =
  process.env.CLAUDE_FLOW_LEGACY_MCP === 'true' || process.argv.includes('--legacy');

async function main() {
  if (useLegacy) {
    console.error('Starting Claude-Flow MCP in legacy mode...');
    // Dynamically import and start MCPServer
    const { MCPServer } = await import('./server.js');
    const { EventBus } = await import('../core/event-bus.js');
    const { Logger } = await import('../core/logger.js');

    const eventBus = EventBus.getInstance();
    const logger = Logger.getInstance();
    const config = {
      transport: 'stdio' as const,
      debug: { enableTracing: true },
    };

    const server = new MCPServer(config, eventBus, logger);
    await server.start();
  } else {
    console.error('Starting Claude-Flow MCP with Claude Code wrapper...');
    const wrapper = new ClaudeCodeMCPWrapper();
    await wrapper.run();
  }
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
