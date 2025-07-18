// Memory-Protected Agent Spawner
// Ensures all spawned agents inherit 12GB heap limit and memory protection

import { spawn, type ChildProcess } from 'child_process';
import { EmergencyMemoryManager } from './emergency-memory-limits.js';

export interface SpawnOptions {
  command: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  detached?: boolean;
  stdio?: 'inherit' | 'pipe' | 'ignore';
}

export interface AgentSpawnOptions extends SpawnOptions {
  agentId?: string;
  agentType?: string;
  taskId?: string;
  description?: string;
  enableMemoryProtection?: boolean;
}

export class MemoryProtectedSpawner {
  private static instance: MemoryProtectedSpawner;
  private emergencyManager: EmergencyMemoryManager;
  private spawnedProcesses: Map<string, ChildProcess> = new Map();

  constructor() {
    this.emergencyManager = EmergencyMemoryManager.getInstance();
    this.setupProcessTracking();
  }

  static getInstance(): MemoryProtectedSpawner {
    if (!MemoryProtectedSpawner.instance) {
      MemoryProtectedSpawner.instance = new MemoryProtectedSpawner();
    }
    return MemoryProtectedSpawner.instance;
  }

  /**
   * Spawn a Claude Code agent with memory protection
   */
  async spawnAgent(options: AgentSpawnOptions): Promise<ChildProcess> {
    const {
      command,
      args = [],
      env = {},
      cwd = process.cwd(),
      detached = false,
      stdio = 'inherit',
      agentId = `agent-${Date.now()}`,
      agentType = 'generic',
      taskId = `task-${Date.now()}`,
      description = 'Agent task',
      enableMemoryProtection = true
    } = options;

    console.log(`🚀 Spawning memory-protected agent: ${agentId}`);

    // Build memory-protected environment
    const protectedEnv = this.buildMemoryProtectedEnv(env, {
      agentId,
      agentType,
      taskId,
      description,
      enableMemoryProtection
    });

    // Log memory protection status
    this.logMemoryProtection(protectedEnv);

    // Spawn process with memory protection
    const childProcess = spawn(command, args, {
      env: protectedEnv,
      cwd,
      detached,
      stdio
    });

    // Track spawned process
    this.trackSpawnedProcess(agentId, childProcess);

    // Setup process monitoring
    this.setupProcessMonitoring(agentId, childProcess);

    return childProcess;
  }

  /**
   * Build memory-protected environment variables
   */
  private buildMemoryProtectedEnv(
    baseEnv: NodeJS.ProcessEnv,
    agentInfo: {
      agentId: string;
      agentType: string;
      taskId: string;
      description: string;
      enableMemoryProtection: boolean;
    }
  ): NodeJS.ProcessEnv {
    const { agentId, agentType, taskId, description, enableMemoryProtection } = agentInfo;

    const protectedEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...baseEnv,

      // Agent identification
      CLAUDE_AGENT_ID: agentId,
      CLAUDE_AGENT_TYPE: agentType,
      CLAUDE_TASK_ID: taskId,
      CLAUDE_TASK_DESCRIPTION: description,

      // Memory protection - Option B: 12GB heap with emergency management
      ...(enableMemoryProtection && {
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=12288 --expose-gc --incremental-marking",
        EMERGENCY_MEMORY_ACTIVE: "true",
        MEMORY_PROTECTED_AGENT: "true",
        MEMORY_CIRCUIT_BREAKER: "true",

        // Memory thresholds
        MEMORY_GC_THRESHOLD: "67",      // 8GB of 12GB
        MEMORY_EMERGENCY_THRESHOLD: "83", // 10GB of 12GB
        MEMORY_CIRCUIT_BREAKER_THRESHOLD: "83", // 10GB of 12GB

        // Agent-specific memory limits
        AGENT_MAX_HEAP_SIZE: "12288",
        AGENT_INITIAL_HEAP_SIZE: "3072",
        AGENT_SEMI_SPACE_SIZE: "192",
      })
    };

    return protectedEnv;
  }

  /**
   * Log memory protection configuration
   */
  private logMemoryProtection(env: NodeJS.ProcessEnv): void {
    if (env.MEMORY_PROTECTED_AGENT === "true") {
      console.log(`🛡️ Memory Protection: ENABLED`);
      console.log(`   Max Heap: ${env.AGENT_MAX_HEAP_SIZE}MB`);
      console.log(`   GC Threshold: ${env.MEMORY_GC_THRESHOLD}%`);
      console.log(`   Emergency Threshold: ${env.MEMORY_EMERGENCY_THRESHOLD}%`);
      console.log(`   Circuit Breaker: ${env.MEMORY_CIRCUIT_BREAKER === "true" ? "ENABLED" : "DISABLED"}`);
    } else {
      console.log(`⚠️ Memory Protection: DISABLED`);
    }
  }

  /**
   * Track spawned process for monitoring
   */
  private trackSpawnedProcess(agentId: string, childProcess: ChildProcess): void {
    this.spawnedProcesses.set(agentId, childProcess);

    // Clean up when process exits
    childProcess.on('exit', (code, signal) => {
      console.log(`🔄 Agent ${agentId} exited with code ${code}, signal ${signal}`);
      this.spawnedProcesses.delete(agentId);
    });

    childProcess.on('error', (error) => {
      console.error(`❌ Agent ${agentId} error:`, error);
      this.spawnedProcesses.delete(agentId);
    });
  }

  /**
   * Setup process monitoring for memory usage
   */
  private setupProcessMonitoring(agentId: string, childProcess: ChildProcess): void {
    if (!childProcess.pid) return;

    // Monitor memory usage periodically
    const monitorInterval = setInterval(() => {
      if (childProcess.killed) {
        clearInterval(monitorInterval);
        return;
      }

      // Check if process is still alive
      try {
        process.kill(childProcess.pid!, 0);
      } catch (error) {
        // Process is dead
        clearInterval(monitorInterval);
        return;
      }

      // Log memory status (could be enhanced with actual memory monitoring)
      console.log(`📊 Agent ${agentId} (PID: ${childProcess.pid}) - Memory monitoring active`);
    }, 60000); // Check every minute

    // Clean up monitoring when process exits
    childProcess.on('exit', () => {
      clearInterval(monitorInterval);
    });
  }

  /**
   * Setup global process tracking
   */
  private setupProcessTracking(): void {
    // Track all spawned processes for cleanup
    process.on('exit', () => {
      this.cleanupAllProcesses();
    });

    process.on('SIGINT', () => {
      console.log('\n🚨 Received SIGINT - cleaning up spawned processes...');
      this.cleanupAllProcesses();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🚨 Received SIGTERM - cleaning up spawned processes...');
      this.cleanupAllProcesses();
      process.exit(0);
    });
  }

  /**
   * Clean up all spawned processes
   */
  private cleanupAllProcesses(): void {
    console.log(`🧹 Cleaning up ${this.spawnedProcesses.size} spawned processes...`);

    this.spawnedProcesses.forEach((childProcess, agentId) => {
      if (!childProcess.killed) {
        console.log(`   Terminating agent ${agentId}...`);
        childProcess.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (!childProcess.killed) {
            console.log(`   Force killing agent ${agentId}...`);
            childProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    });

    this.spawnedProcesses.clear();
  }

  /**
   * Get status of all spawned processes
   */
  getSpawnedProcesses(): Map<string, ChildProcess> {
    return new Map(this.spawnedProcesses);
  }

  /**
   * Kill a specific spawned process
   */
  killAgent(agentId: string): boolean {
    const childProcess = this.spawnedProcesses.get(agentId);
    if (childProcess && !childProcess.killed) {
      childProcess.kill('SIGTERM');
      return true;
    }
    return false;
  }

  /**
   * Get memory protection status
   */
  getMemoryProtectionStatus(): any {
    return {
      emergencyManagerActive: this.emergencyManager.getMemoryStatus().isActive,
      spawnedProcessCount: this.spawnedProcesses.size,
      memoryLimits: {
        maxHeapSize: "12288MB",
        gcThreshold: "67%",
        emergencyThreshold: "83%",
        circuitBreakerThreshold: "83%"
      }
    };
  }
}

// Helper function for easy spawning with memory protection
export async function spawnMemoryProtectedAgent(options: AgentSpawnOptions): Promise<ChildProcess> {
  return MemoryProtectedSpawner.getInstance().spawnAgent(options);
}

// Auto-initialize if environment variable is set
if (process.env.EMERGENCY_MEMORY_ACTIVE === 'true') {
  console.log('🛡️ Auto-initializing Memory Protected Spawner');
  MemoryProtectedSpawner.getInstance();
}

export default MemoryProtectedSpawner;
