#!/usr/bin/env node
/**
 * Claude-Flow CLI - Main entry point for Node.js
 */

import { CLI, VERSION } from './cli-core.js';
import { setupCommands } from './commands/index.js';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ComponentLoggerFactory, generateCorrelationId } from '../core/logger.js';

async function main() {
  // Initialize debug logging with correlation tracking
  const correlationId = generateCorrelationId();
  const logger = ComponentLoggerFactory.getCLILogger(correlationId);

  logger.debug('CLI main entry point started', { correlationId });
  logger.timeStart('cli-main-execution');

  const cli = new CLI('claude-flow', 'Advanced AI Agent Orchestration System');

  // Setup all commands
  setupCommands(cli);

  // Run the CLI (args default to process.argv.slice(2) in Node.js version)
  try {
    logger.timeStart('cli-run');
    await cli.run();
    logger.timeEnd('cli-run', 'CLI execution completed successfully');
    logger.timeEnd('cli-main-execution', 'Main function completed successfully');
  } catch (error) {
    logger.timeEnd('cli-run', 'CLI execution failed', { error });
    logger.timeEnd('cli-main-execution', 'Main function failed', { error });
    throw error; // Re-throw to maintain existing error handling
  }
}

// Check if this module is being run directly (Node.js equivalent of import.meta.main)
// PKG-compatible filename detection (avoids import.meta entirely)
const __filename: string = process.argv[1] || require.main?.filename || '';
const __dirname = dirname(__filename);
const isMainModule =
  process.argv[1] &&
  (process.argv[1] === __filename ||
    process.argv[1].endsWith('/main.js') ||
    process.argv[1].endsWith('/main.ts'));

if (isMainModule) {
  main().catch((error) => {
    // Use emergency logger for fatal errors
    const logger = ComponentLoggerFactory.getCLILogger();
    logger.error('Fatal CLI error - application terminating', error);
    process.exit(1);
  });
}
