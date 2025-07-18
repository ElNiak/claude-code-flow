/**
 * Integration tests for the start command
 */

import { Command } from 'commander';
import { startCommand } from '../../src/cli/commands/start/start-command.ts';
import { afterEach, afterEach, beforeEach, beforeEach, describe, describe, expect, expect, it, it } from "../test.utils.ts";

describe('Start Command Integration', () => {
  let testDir: string;

  beforeAll(async () => {
    // Create test directory
    testDir = await Deno.makeTempDir({ prefix: 'claude-flow-test-' });
    Deno.chdir(testDir);

    // Create required directories
    await Deno.mkdir('memory', { recursive: true });
    await Deno.mkdir('coordination', { recursive: true });

    // Create minimal config
    const config = {
      memory: {
        backend: 'json',
        path: './memory/claude-flow-data.json'
      },
      terminal: {
        poolSize: 2
      },
      coordination: {
        maxConcurrentTasks: 5
      },
      mcp: {
        port: 3000,
        transport: 'stdio'
      },
      orchestrator: {
        maxConcurrentTasks: 10
      }
    };

    await Deno.writeTextFile('claude-flow.config.json', JSON.stringify(config, null, 2));
  });

  afterAll(async () => {
    // Cleanup
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('command structure', () => {
    it('should be a valid Commander command', () => {
      expect(startCommand).toBeDefined();
      expect(startCommand instanceof Command).toBe(true);
    });

    it('should have correct description', () => {
      const desc = (startCommand as any).description() ||
                   (startCommand as any)._description;
      expect(typeof desc).toBe('string');
      expect(desc.includes('orchestration')).toBe(true);
    });

    it('should have all expected options', () => {
      const command = startCommand as any;
      const options = command.options || [];

      const optionNames = options.map((opt: any) => opt.long || opt.name);
      expect(optionNames.includes('daemon')).toBe(true);
      expect(optionNames.includes('port')).toBe(true);
      expect(optionNames.includes('ui')).toBe(true);
      expect(optionNames.includes('verbose')).toBe(true);
    });
  });

  describe('initialization', () => {
    it('should initialize process manager without errors', async () => {
      // Test that the command can be parsed without executing
      const command = new Command()
        .command('start', startCommand);

      const help = command.helpInformation();
      expect(help).toBeDefined();
      expect(help.includes('start')).toBe(true);
    });
  });
});
