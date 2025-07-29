// ABOUTME: Memory optimization modules export index for monitor command integration
// ABOUTME: Provides unified access to all memory optimization utilities and configuration

export { EmergencyMemoryManager } from './emergency-memory-limits.js';
// Configuration and scripts
export { default as memoryProfiles } from './memory-profiles.json'
export { NodeMemoryOptimizer } from './node-memory-optimizer.js';assert { type: 'json' };

// CLI command interface for memory optimization
export const memoryCommands = {
  optimize: async (options?: { agentCount?: number; profile?: string }) => {
    const { NodeMemoryOptimizer } = await import('./node-memory-optimizer.js');
    const optimizer = new NodeMemoryOptimizer({
      expectedAgents: options?.agentCount,
      forceStrategy: options?.profile as any
    });
    return optimizer.setupEnvironment();
  },

  status: async () => {
    const { NodeMemoryOptimizer } = await import('./node-memory-optimizer.js');
    const optimizer = new NodeMemoryOptimizer();
    return optimizer.getMemoryStatus();
  },

  emergency: async () => {
    const { EmergencyMemoryManager } = await import('./emergency-memory-limits.js');
    const manager = EmergencyMemoryManager.getInstance();
    manager.activate();
    return manager.getMemoryStatus();
  },

  startupScript: './startup-script.sh'
};

export default memoryCommands;
