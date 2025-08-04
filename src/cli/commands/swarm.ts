/**
 * Claude Swarm Mode - Self-orchestrating agent swarms using claude-flow
 */

import { generateId } from '../../utils/helpers.js';
import { promises as fs } from 'node:fs';
import { success, error, warning, info } from '../cli-core.js';
import type { CommandContext } from '../cli-core.js';
import { BackgroundExecutor } from '../../coordination/background-executor.js';
import { SwarmCoordinator } from '../../coordination/swarm-coordinator.js';
import { SwarmMemoryManager } from '../../swarm/memory.js';
export async function swarmAction(ctx: CommandContext) {
  // First check if help is requested
  if (ctx.flags.help || ctx.flags.h) {
    // Show help is handled by the CLI framework
    return;
  }

  // The objective should be all the non-flag arguments joined together
  const objective = ctx.args.join(' ').trim();

  if (!objective) {
    error('Please provide an objective for the swarm:');
    error('  claude-flow swarm "Find all TODO comments in the codebase"');
    error('  claude-flow swarm "Implement user authentication with JWT"');
    error('  claude-flow swarm "Optimize database queries in the user service"');
    return;
  }

  try {
    info(`🚀 Starting swarm with objective: ${objective}`);

    // Initialize memory manager
    const memoryManager = new SwarmMemoryManager({
      namespace: `swarm-${Date.now()}`,
      enableDistribution: true,
      maxEntrySize: 1000000,
      persistencePath: './swarm-memory',
    });

    await memoryManager.initialize();

    // Initialize background executor with memory
    const backgroundExecutor = new BackgroundExecutor({
      maxConcurrentTasks: (ctx.flags.agents as number) || 3,
      enablePersistence: (ctx.flags.verbose as boolean) || false,
    });

    // Initialize swarm coordinator
    const coordinator = new SwarmCoordinator({
      maxAgents: (ctx.flags.agents as number) || 3,
      coordinationStrategy: 'distributed' as const,
    });

    await coordinator.start();

    // Store the objective in memory
    await memoryManager.store(
      'coordinator:objective',
      {
        text: objective,
        strategy: ctx.flags.strategy || 'adaptive',
        maxAgents: ctx.flags.agents || 3,
        startTime: new Date(),
      },
      {
        type: 'objective' as any,
        tags: ['objective', 'coordinator'],
        partition: 'swarm',
      },
    );

    // Execute the swarm
    success(`🎯 Objective: ${objective}`);
    info(`📊 Strategy: ${ctx.flags.strategy || 'adaptive'}`);
    info(`🤖 Max Agents: ${ctx.flags.agents || 3}`);
    info('');

    await coordinator.executeObjective(objective);

    // Store results in memory
    await memoryManager.store(
      'coordinator:result',
      {
        objective,
        completedAt: new Date(),
        success: true,
      },
      {
        type: 'result' as any,
        tags: ['result', 'coordinator'],
        partition: 'swarm',
      },
    );

    success('✅ Swarm completed successfully!');

    // Save memory state
    await memoryManager.shutdown();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`❌ Swarm failed: ${errorMessage}`);

    if (ctx.flags.verbose) {
      console.error(err);
    }

    process.exit(1);
  }
}
