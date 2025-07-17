/**
 * End-to-end tests for the start command
 */

import { afterEach, afterEach, beforeEach, beforeEach, describe, describe, expect, expect, it, it } from "../test.utils.ts";

describe('Start Command E2E', () => {
  describe('JavaScript CLI', () => {
    it('should show help with UI option', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', 'src/cli/simple-cli.js', 'start', '--help'],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { stdout, stderr, success } = await command.output();
      const output = new TextDecoder().decode(stdout);
      const error = new TextDecoder().decode(stderr);

      expect(success).toBe(true);
      expect(output.includes('--ui')).toBe(true);
      expect(output.includes('Launch interactive process management UI')).toBe(true);
      expect(output.includes('Process Management UI:')).toBe(true);
    });

    it('should handle UI flag', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', 'src/cli/simple-cli.js', 'start', '--ui'],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { stdout, stderr, success } = await command.output();
      const output = new TextDecoder().decode(stdout);

      expect(success).toBe(true);
      expect(output.includes('Launching interactive process management UI')).toBe(true);
    });
  });

  describe('ProcessManager functionality', () => {
    it('should manage process lifecycle', async () => {
      const testScript = `
        import { ProcessManager } from './src/cli/commands/start/process-manager.ts';

        const manager = new ProcessManager();
        await manager.initialize();

        // Test process lifecycle
        const processes = manager.getAllProcesses();
        console.log('PROCESSES:' + processes.length);

        // Start a process
        await manager.startProcess('event-bus');
        const eventBus = manager.getProcess('event-bus');
        console.log('STATUS:' + eventBus?.status);

        // Stop the process
        await manager.stopProcess('event-bus');
        const stopped = manager.getProcess('event-bus');
        console.log('STOPPED:' + stopped?.status);

        // Get stats
        const stats = manager.getSystemStats();
        console.log('STATS:' + stats.totalProcesses);
      `;

      const tempFile = await Deno.makeTempFile({ suffix: '.ts' });
      await Deno.writeTextFile(tempFile, testScript);

      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', tempFile],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { stdout, success } = await command.output();
      const output = new TextDecoder().decode(stdout);

      await Deno.remove(tempFile);

      expect(success).toBe(true);
      expect(output.includes('PROCESSES:6')).toBe(true);
      expect(output.includes('STATUS:running')).toBe(true);
      expect(output.includes('STOPPED:stopped')).toBe(true);
      expect(output.includes('STATS:6')).toBe(true);
    });
  });

  describe('SystemMonitor functionality', () => {
    it('should track events', async () => {
      const testScript = `
        import { ProcessManager } from './src/cli/commands/start/process-manager.ts';
        import { SystemMonitor } from './src/cli/commands/start/system-monitor.ts';
        import { eventBus } from './src/core/event-bus.ts';
        import { SystemEvents } from './src/utils/types.ts';

        const manager = new ProcessManager();
        const monitor = new SystemMonitor(manager);

        // Emit some events
        eventBus.emit(SystemEvents.AGENT_SPAWNED, { agentId: 'test-1', profile: { type: 'test' } });
        eventBus.emit(SystemEvents.TASK_COMPLETED, { taskId: 'task-1' });

        // Check events were tracked
        const events = monitor.getRecentEvents(10);
        console.log('EVENTS:' + events.length);
        console.log('HAS_AGENT:' + events.some(e => e.type === 'agent_spawned'));
        console.log('HAS_TASK:' + events.some(e => e.type === 'task_completed'));
      `;

      const tempFile = await Deno.makeTempFile({ suffix: '.ts' });
      await Deno.writeTextFile(tempFile, testScript);

      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', tempFile],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { stdout, success } = await command.output();
      const output = new TextDecoder().decode(stdout);

      await Deno.remove(tempFile);

      expect(success).toBe(true);
      expect(output.includes('EVENTS:2')).toBe(true);
      expect(output.includes('HAS_AGENT:true')).toBe(true);
      expect(output.includes('HAS_TASK:true')).toBe(true);
    });
  });

  describe('Backward compatibility', () => {
    it('should support all original CLI options', async () => {
      // Test daemon flag
      const daemonTest = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', 'src/cli/simple-cli.js', 'start', '--help'],
        stdout: 'piped',
      });
      const { stdout: daemonOut } = await daemonTest.output();
      const daemonHelp = new TextDecoder().decode(daemonOut);
      expect(daemonHelp.includes('--daemon')).toBe(true);

      // Test port flag
      expect(daemonHelp.includes('--port')).toBe(true);

      // Test verbose flag
      expect(daemonHelp.includes('--verbose')).toBe(true);
    });

    it('should maintain existing functionality', async () => {
      // Create test directories
      const testDir = await Deno.makeTempDir();
      const originalCwd = Deno.cwd();

      try {
        Deno.chdir(testDir);
        await Deno.mkdir('memory', { recursive: true });
        await Deno.mkdir('coordination', { recursive: true });

        const command = new Deno.Command(Deno.execPath(), {
          args: ['run', '--allow-all', originalCwd + '/src/cli/simple-cli.js', 'start', '--daemon'],
          stdout: 'piped',
          stderr: 'piped',
        });

        const { stdout, success } = await command.output();
        const output = new TextDecoder().decode(stdout);

        expect(success).toBe(true);
        expect(output.includes('Starting in daemon mode')).toBe(true);
        expect(output.includes('Process ID:')).toBe(true);

        // Check PID file was created
        const pidExists = await Deno.stat('.claude-flow.pid').then(() => true).catch(() => false);
        expect(pidExists).toBe(true);

      } finally {
        Deno.chdir(originalCwd);
        await Deno.remove(testDir, { recursive: true });
      }
    });
  });
});
