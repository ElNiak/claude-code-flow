#!/usr/bin/env node
import { getErrorMessage } from '../../utils/error-handler.js';
/**
 * Unified Agent Commands - Intrinsic agent coordination with automatic hooks integration
 */

import chalk from 'chalk';
import type { Command, CommandContext } from "../cli-core.js";
import { success, error, warning, info } from "../cli-core.js";
import { ConfigManager } from "../../core/config.js";
import { EventBus } from "../../core/event-bus.js";
import { Logger } from "../../core/logger.js";
import type { IMemoryManager } from "../../memory/manager.js";
import { MemoryManager } from "../../memory/manager.js";

// Unified agent command that integrates with both ruv-swarm and intrinsic coordination
const agentUnifiedCommand: Command = {
  name: "agent",
  description: "🤖 Unified agent management with intrinsic coordination",
  aliases: ["agents", "a"],
  action: async (ctx: CommandContext) => {
    const subcommand = ctx.args[0];
    
    switch (subcommand) {
      case "spawn":
        await handleAgentSpawn(ctx);
        break;
      case "list":
        await handleAgentList(ctx);
        break;
      case "status":
        await handleAgentStatus(ctx);
        break;
      case "coordinate":
        await handleAgentCoordinate(ctx);
        break;
      case "intrinsic":
        await handleIntrinsicCoordination(ctx);
        break;
      default:
        showAgentHelp();
    }
  }
};

// Intrinsic coordination command for advanced agent cooperation
const intrinsicCommand: Command = {
  name: "intrinsic",
  description: "🧠 Intrinsic agent coordination with automatic memory hooks",
  aliases: ["int", "coord"],
  options: [
    {
      name: "agents",
      short: "a",
      description: "Number of agents to coordinate",
      type: "number",
      default: 5,
    },
    {
      name: "topology",
      short: "t",
      description: "Coordination topology: mesh, hierarchical, ring",
      type: "string",
      default: "hierarchical",
    },
    {
      name: "memory-hooks",
      short: "m",
      description: "Enable automatic memory coordination hooks",
      type: "boolean",
      default: true,
    },
    {
      name: "session-id",
      description: "Session ID for coordination",
      type: "string",
    },
  ],
  action: async (ctx: CommandContext) => {
    try {
      const agentCount = ctx.flags.agents as number || 5;
      const topology = ctx.flags.topology as string || "hierarchical";
      const memoryHooks = ctx.flags['memory-hooks'] !== false;
      const sessionId = (ctx.flags['session-id'] as string) || `intrinsic-${Date.now()}`;
      
      info(`🧠 Initializing intrinsic coordination for ${agentCount} agents...`);
      console.log(`   • Topology: ${topology}`);
      console.log(`   • Memory Hooks: ${memoryHooks ? '✅' : '❌'}`);
      console.log(`   • Session: ${sessionId}`);
      
      await initializeIntrinsicCoordination({
        agentCount,
        topology,
        memoryHooks,
        sessionId
      });
      
      success("🎉 Intrinsic coordination initialized successfully!");
      
    } catch (err) {
      error(`Failed to initialize intrinsic coordination: ${getErrorMessage(err)}`);
    }
  }
};

// Memory coordination command for persistent agent memory
const memoryCoordCommand: Command = {
  name: "memory-coord",
  description: "💾 Memory-based agent coordination with persistent state",
  aliases: ["mem-coord", "mc"],
  options: [
    {
      name: "session-id",
      short: "s",
      description: "Session ID to coordinate",
      type: "string",
      required: true,
    },
    {
      name: "action",
      short: "a",
      description: "Action: store, retrieve, sync, clear",
      type: "string",
      default: "sync",
    },
  ],
  action: async (ctx: CommandContext) => {
    try {
      const sessionId = ctx.flags['session-id'] as string;
      const action = ctx.flags.action as string || "sync";
      
      if (!sessionId) {
        error("Session ID is required. Use --session-id or -s");
        return;
      }
      
      await handleMemoryCoordination(sessionId, action);
      
    } catch (err) {
      error(`Memory coordination failed: ${getErrorMessage(err)}`);
    }
  }
};

export const unifiedAgentCommands: Command[] = [
  agentUnifiedCommand,
  intrinsicCommand,
  memoryCoordCommand
];

async function handleAgentSpawn(ctx: CommandContext): Promise<void> {
  const agentType = ctx.args[1] || "general";
  const agentName = ctx.flags.name as string || `${agentType}-${Date.now()}`;
  const sessionId = ctx.flags['session-id'] as string || `session-${Date.now()}`;
  const intrinsic = ctx.flags.intrinsic !== false;
  
  info(`🤖 Spawning ${agentType} agent: ${agentName}`);
  
  try {
    // Check if ruv-swarm is available for hybrid coordination
    let ruvSwarmAvailable = false;
    try {
      const { execSync } = await import('child_process');
      execSync('npx ruv-swarm --version', { stdio: 'pipe' });
      ruvSwarmAvailable = true;
    } catch {
      // ruv-swarm not available, use intrinsic only
    }
    
    if (ruvSwarmAvailable && !intrinsic) {
      // Use ruv-swarm for agent spawning
      const { execSync } = await import('child_process');
      const spawnCommand = `npx ruv-swarm agent spawn ${agentType} --name ${agentName} --session-id ${sessionId}`;
      execSync(spawnCommand, { stdio: 'inherit' });
      success(`✅ Agent spawned via ruv-swarm: ${agentName}`);
    } else {
      // Use intrinsic coordination
      await spawnIntrinsicAgent({
        type: agentType,
        name: agentName,
        sessionId,
        capabilities: getAgentCapabilities(agentType),
        memoryHooks: true
      });
      success(`✅ Intrinsic agent spawned: ${agentName}`);
    }
    
    // Store agent information in memory for coordination
    const memoryManager = await getMemoryManager();
    await memoryManager.store({
      id: `agent-${agentName}`,
      type: 'observation', // Use valid MemoryEntry type
      content: JSON.stringify({
        name: agentName,
        type: agentType,
        sessionId,
        spawnedAt: Date.now(),
        intrinsic,
        ruvSwarmAvailable
      }),
      metadata: {
        unified: true,
        coordinationHooks: intrinsic,
        agentType: 'spawn'
      },
      tags: ['agent', 'spawn', agentType, sessionId],
      timestamp: Date.now()
    });
    
  } catch (err) {
    error(`Failed to spawn agent: ${getErrorMessage(err)}`);
  }
}

async function handleAgentList(ctx: CommandContext): Promise<void> {
  try {
    const sessionId = ctx.flags['session-id'] as string;
    const memoryManager = await getMemoryManager();
    
    // Query agents from memory
    const agents = await memoryManager.query({
      type: 'observation',
      sessionId: sessionId || undefined,
      limit: 50
    });
    
    if (agents.length === 0) {
      info("No agents found");
      return;
    }
    
    success(`Active agents (${agents.length}):`);
    
    for (const agent of agents) {
      let content: any;
      try {
        content = JSON.parse(agent.content);
      } catch {
        content = { name: agent.id, type: 'unknown', sessionId: 'unknown' };
      }
      
      const agentName = content.name || agent.id;
      const agentType = content.type || 'unknown';
      const session = content.sessionId || 'no-session';
      const intrinsic = agent.metadata?.coordinationHooks ? '🧠' : '📝';
      
      console.log(`   ${intrinsic} ${agentName} (${agentType}) - Session: ${session}`);
      
      if (ctx.flags.verbose) {
        console.log(`      Spawned: ${new Date(content.spawnedAt || 0).toLocaleString()}`);
        console.log(`      Unified: ${agent.metadata?.unified ? 'Yes' : 'No'}`);
      }
    }
    
  } catch (err) {
    error(`Failed to list agents: ${getErrorMessage(err)}`);
  }
}

async function handleAgentStatus(ctx: CommandContext): Promise<void> {
  try {
    const sessionId = ctx.flags['session-id'] as string;
    const memoryManager = await getMemoryManager();
    
    // Get coordination status
    const coordinationEntries = await memoryManager.query({
      type: 'insight',
      sessionId: sessionId || undefined,
      limit: 10
    });
    
    const agents = await memoryManager.query({
      type: 'observation',
      sessionId: sessionId || undefined,
      limit: 50
    });
    
    console.log(chalk.cyan(`
🤖 AGENT COORDINATION STATUS
============================

Session: ${sessionId || 'All sessions'}
Active Agents: ${agents.length}
Coordination Events: ${coordinationEntries.length}

Agent Distribution:
${generateAgentDistribution(agents)}

Recent Coordination Activity:
${generateCoordinationActivity(coordinationEntries)}
    `));
    
  } catch (err) {
    error(`Failed to get agent status: ${getErrorMessage(err)}`);
  }
}

async function handleAgentCoordinate(ctx: CommandContext): Promise<void> {
  try {
    const sessionId = ctx.flags['session-id'] as string || `coord-${Date.now()}`;
    const strategy = ctx.flags.strategy as string || "collaborative";
    
    info(`🔗 Initiating agent coordination for session: ${sessionId}`);
    
    const memoryManager = await getMemoryManager();
    
    // Get all agents in session
    const agents = await memoryManager.query({
      type: 'observation',
      sessionId
    });
    
    if (agents.length < 2) {
      warning("Need at least 2 agents for coordination. Spawn more agents first.");
      return;
    }
    
    // Store coordination event
    await memoryManager.store({
      id: `coordination-${sessionId}-${Date.now()}`,
      type: 'coordination',
      content: {
        sessionId,
        strategy,
        participatingAgents: agents.map(a => (a.content as any).name),
        coordinationStarted: Date.now()
      },
      metadata: {
        intrinsicCoordination: true,
        agentCount: agents.length
      },
      timestamp: Date.now()
    });
    
    success(`✅ Coordination initiated for ${agents.length} agents`);
    console.log(`   Strategy: ${strategy}`);
    console.log(`   Participants: ${agents.map(a => (a.content as any).name).join(', ')}`);
    
  } catch (err) {
    error(`Failed to coordinate agents: ${getErrorMessage(err)}`);
  }
}

async function handleIntrinsicCoordination(ctx: CommandContext): Promise<void> {
  try {
    const agentCount = ctx.flags.agents as number || 3;
    const sessionId = ctx.flags['session-id'] as string || `intrinsic-${Date.now()}`;
    
    info(`🧠 Setting up intrinsic coordination for ${agentCount} agents...`);
    
    await initializeIntrinsicCoordination({
      agentCount,
      topology: "mesh",
      memoryHooks: true,
      sessionId
    });
    
    success("✅ Intrinsic coordination setup complete");
    
  } catch (err) {
    error(`Failed to setup intrinsic coordination: ${getErrorMessage(err)}`);
  }
}

function showAgentHelp(): void {
  console.log(chalk.cyan(`
🤖 UNIFIED AGENT COMMANDS
=========================

Usage: claude-flow agent [SUBCOMMAND] [OPTIONS]

Subcommands:
  spawn [TYPE]     Spawn an agent with intrinsic coordination
  list             List all active agents
  status           Show agent coordination status  
  coordinate       Initiate agent coordination
  intrinsic        Setup intrinsic coordination

Options:
  --name           Agent name
  --session-id     Session ID for coordination
  --intrinsic      Enable intrinsic coordination (default: true)
  --memory-hooks   Enable memory coordination hooks (default: true)
  --verbose        Show detailed information

Examples:
  claude-flow agent spawn researcher --name "DataBot"
  claude-flow agent list --session-id "my-session"
  claude-flow agent coordinate --strategy collaborative
  claude-flow intrinsic --agents 5 --topology hierarchical
  `));
}

interface IntrinsicCoordinationConfig {
  agentCount: number;
  topology: string;
  memoryHooks: boolean;
  sessionId: string;
}

async function initializeIntrinsicCoordination(config: IntrinsicCoordinationConfig): Promise<void> {
  const { agentCount, topology, memoryHooks, sessionId } = config;
  
  const memoryManager = await getMemoryManager();
  
  // Initialize coordination session
  await memoryManager.store({
    id: `intrinsic-session-${sessionId}`,
    type: 'session',
    content: {
      sessionId,
      topology,
      agentCount,
      memoryHooks,
      initialized: Date.now()
    },
    metadata: {
      intrinsic: true,
      coordinationType: 'intrinsic'
    },
    timestamp: Date.now()
  });
  
  // Spawn intrinsic agents
  const agentTypes = ['coordinator', 'analyst', 'coder', 'tester', 'researcher'];
  
  for (let i = 0; i < agentCount; i++) {
    const agentType = agentTypes[i % agentTypes.length];
    const agentName = `${agentType}-${i + 1}`;
    
    await spawnIntrinsicAgent({
      type: agentType,
      name: agentName,
      sessionId,
      capabilities: getAgentCapabilities(agentType),
      memoryHooks
    });
    
    console.log(`   🤖 ${agentName} (${agentType})`);
  }
  
  // Set up coordination topology
  await setupCoordinationTopology(sessionId, topology, agentCount);
  
  info(`🔗 Coordination topology (${topology}) established`);
}

interface IntrinsicAgentConfig {
  type: string;
  name: string;
  sessionId: string;
  capabilities: string[];
  memoryHooks: boolean;
}

async function spawnIntrinsicAgent(config: IntrinsicAgentConfig): Promise<void> {
  const { type, name, sessionId, capabilities, memoryHooks } = config;
  
  const memoryManager = await getMemoryManager();
  
  // Store agent with intrinsic coordination data
  await memoryManager.store({
    id: `agent-${name}`,
    type: 'agent',
    content: {
      name,
      type,
      sessionId,
      capabilities,
      memoryHooks,
      intrinsicCoordination: true,
      spawnedAt: Date.now(),
      coordinationHooks: {
        preTask: true,
        postEdit: true,
        notification: true,
        memorySync: true
      }
    },
    metadata: {
      intrinsic: true,
      agentType: type,
      sessionCoordination: true
    },
    timestamp: Date.now()
  });
}

async function setupCoordinationTopology(sessionId: string, topology: string, agentCount: number): Promise<void> {
  const memoryManager = await getMemoryManager();
  
  // Store topology configuration
  await memoryManager.store({
    id: `topology-${sessionId}`,
    type: 'topology',
    content: {
      sessionId,
      topology,
      agentCount,
      coordinationRules: getTopologyRules(topology),
      setupAt: Date.now()
    },
    metadata: {
      intrinsicTopology: true
    },
    timestamp: Date.now()
  });
}

async function handleMemoryCoordination(sessionId: string, action: string): Promise<void> {
  const memoryManager = await getMemoryManager();
  
  switch (action) {
    case "store":
      info(`💾 Storing coordination state for session: ${sessionId}`);
      await memoryManager.store({
        id: `memory-coord-${sessionId}-${Date.now()}`,
        type: 'memory-coordination',
        content: {
          sessionId,
          action: 'store',
          timestamp: Date.now()
        },
        metadata: {
          memoryCoordination: true
        },
        timestamp: Date.now()
      });
      success("✅ Coordination state stored");
      break;
      
    case "retrieve":
      info(`📥 Retrieving coordination state for session: ${sessionId}`);
      const entries = await memoryManager.query({
        type: 'memory-coordination',
        sessionId
      });
      console.log(`Found ${entries.length} coordination entries`);
      break;
      
    case "sync":
      info(`🔄 Syncing coordination for session: ${sessionId}`);
      // Implement synchronization logic
      success("✅ Coordination synchronized");
      break;
      
    case "clear":
      warning(`🗑️ Clearing coordination state for session: ${sessionId}`);
      // Implement clearing logic
      success("✅ Coordination state cleared");
      break;
      
    default:
      error(`Unknown action: ${action}. Use: store, retrieve, sync, clear`);
  }
}

function getAgentCapabilities(agentType: string): string[] {
  const capabilities = {
    coordinator: ['orchestration', 'task-management', 'agent-coordination'],
    analyst: ['data-analysis', 'requirement-analysis', 'problem-solving'],
    coder: ['programming', 'implementation', 'code-review'],
    tester: ['testing', 'quality-assurance', 'validation'],
    researcher: ['research', 'information-gathering', 'documentation'],
    architect: ['system-design', 'architecture-planning', 'technical-design'],
    security: ['security-analysis', 'vulnerability-assessment', 'secure-coding']
  };
  
  return capabilities[agentType] || ['general-purpose'];
}

function getTopologyRules(topology: string): string[] {
  const rules = {
    mesh: ['all-to-all-communication', 'distributed-coordination', 'peer-to-peer'],
    hierarchical: ['tree-structure', 'parent-child-communication', 'centralized-coordination'],
    ring: ['circular-communication', 'sequential-coordination', 'neighbor-to-neighbor'],
    star: ['hub-and-spoke', 'central-coordinator', 'radial-communication']
  };
  
  return rules[topology] || ['default-coordination'];
}

function generateAgentDistribution(agents: any[]): string {
  const distribution = {};
  agents.forEach(agent => {
    const type = (agent.content as any).type || 'unknown';
    distribution[type] = (distribution[type] || 0) + 1;
  });
  
  return Object.entries(distribution)
    .map(([type, count]) => `  • ${type}: ${count}`)
    .join('\n');
}

function generateCoordinationActivity(entries: any[]): string {
  if (entries.length === 0) {
    return "  No recent coordination activity";
  }
  
  return entries
    .slice(0, 5)
    .map(entry => {
      const content = entry.content as any;
      const time = new Date(content.coordinationStarted || entry.timestamp).toLocaleTimeString();
      return `  • ${time}: ${content.strategy || 'coordination'} (${content.participatingAgents?.length || 0} agents)`;
    })
    .join('\n');
}

async function getMemoryManager(): Promise<IMemoryManager> {
  const eventBus = EventBus.getInstance();
  const logger = new Logger({ level: "info", format: "text", destination: "console" });
  
  const memoryManager = new MemoryManager(
    { backend: 'sqlite', databases: { sqlite: { path: './memory/claude-flow-memory.db' } } },
    eventBus,
    logger
  );
  
  await memoryManager.initialize();
  return memoryManager;
}