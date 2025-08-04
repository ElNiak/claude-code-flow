/**
 * Agent management and factory for Claude-Flow
 */

import { logger } from '../../core/logger.js';
import {
  AgentType,
  AgentCapability,
  normalizeAgentType,
  getCapabilitiesForAgentType,
  isValidAgentType as validateAgentType,
} from '../../hive-mind/types.js';

// Agent factory counter for unique IDs
const agentCounter = 0;

// Runtime validation and error handling
export interface RuntimeValidationError {
  type: 'validation_error';
  field: string;
  value: unknown;
  expected: string;
  message: string;
}

export interface AgentSpawnOptions {
  name?: string;
  capabilities?: AgentCapability[];
  priority?: number;
  environment?: Record<string, string>;
  workingDirectory?: string;
  shell?: string;
  metadata?: Record<string, unknown>;
}

export interface SpawnedAgent {
  id: string;
  type: AgentType;
  name: string;
  capabilities: AgentCapability[];
  status: 'initializing' | 'idle' | 'busy' | 'error' | 'offline';
  priority: number;
  environment: Record<string, string>;
  workingDirectory: string;
  shell: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastActivity?: Date;
}

/**
 * Agent Factory Class - handles creation and management of agents
 */
export class AgentFactory {
  private agentCounter = 0;

  /**
   * Spawn a new agent with given type and options
   */
  async spawnAgent(type: string, options: AgentSpawnOptions = {}): Promise<SpawnedAgent> {
    try {
      // Normalize and validate agent type
      const normalizedType = normalizeAgentType(type) as AgentType;
      logger.debug('Creating agent', { type: normalizedType, originalType: type });

      // Get default capabilities for the agent type
      const defaultCapabilities = getCapabilitiesForAgentType(normalizedType);
      const allCapabilities = [...defaultCapabilities, ...(options.capabilities || [])];

      // Remove duplicates
      const uniqueCapabilities = [...new Set(allCapabilities)];

      const agent: SpawnedAgent = {
        id: this.generateAgentId(normalizedType),
        type: normalizedType,
        name: options.name || `${normalizedType}-${Date.now()}`,
        capabilities: uniqueCapabilities,
        status: 'initializing',
        priority: options.priority || 5,
        environment: options.environment || {},
        workingDirectory: options.workingDirectory || process.cwd(),
        shell: options.shell || '/bin/bash',
        metadata: options.metadata || {},
        createdAt: new Date(),
      };

      logger.info('Agent spawned successfully', {
        id: agent.id,
        type: agent.type,
        capabilities: agent.capabilities.length,
      });

      return agent;
    } catch (error) {
      logger.error('Failed to spawn agent', {
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate agent configuration
   */
  validateAgentConfig(config: Partial<SpawnedAgent & { type: string }>): RuntimeValidationError[] {
    const errors: RuntimeValidationError[] = [];

    if (config.type && typeof config.type === 'string') {
      try {
        normalizeAgentType(config.type);
      } catch (error) {
        errors.push({
          type: 'validation_error',
          field: 'type',
          value: config.type,
          expected: 'valid AgentType',
          message: error instanceof Error ? error.message : 'Invalid agent type',
        });
      }
    }

    if (config.capabilities) {
      config.capabilities.forEach((capability, index) => {
        // Note: We'll add capability validation here when isValidAgentCapability is available
        if (typeof capability !== 'string') {
          errors.push({
            type: 'validation_error',
            field: `capabilities[${index}]`,
            value: capability,
            expected: 'string',
            message: 'Agent capability must be a string',
          });
        }
      });
    }

    if (
      config.priority !== undefined &&
      (typeof config.priority !== 'number' || config.priority < 1 || config.priority > 10)
    ) {
      errors.push({
        type: 'validation_error',
        field: 'priority',
        value: config.priority,
        expected: 'number between 1 and 10',
        message: 'Priority must be a number between 1 and 10',
      });
    }

    return errors;
  }

  /**
   * Get all supported agent types - UNIFIED to support both formats
   */
  getSupportedTypes(): string[] {
    return [
      // Base agent types
      'researcher',
      'coder',
      'analyst',
      'architect',
      'tester',
      'coordinator',
      'reviewer',
      'optimizer',
      'documenter',
      'monitor',
      'specialist',
      // Maestro specs-driven agent types (underscore format)
      'requirements_analyst',
      'design_architect',
      'task_planner',
      'implementation_coder',
      'quality_reviewer',
      'steering_documenter',
      // Maestro specs-driven agent types (hyphen format - backward compatibility)
      'design-architect',
      'system-architect',
      'task-planner',
      'developer',
      'requirements-engineer',
      'steering-author',
    ];
  }

  /**
   * Get agent type descriptions - UNIFIED to support both formats
   */
  getAgentTypeDescriptions(): Record<string, string> {
    return {
      // Base agent types
      researcher: 'Specialized in information gathering, web research, and data collection',
      coder: 'Expert in software development, code generation, and implementation',
      analyst: 'Focused on data analysis, performance optimization, and insights',
      architect: 'Designs system architecture, technical specifications, and solutions',
      tester: 'Specializes in testing, quality assurance, and validation',
      coordinator: 'Manages task orchestration, planning, and team coordination',
      reviewer: 'Reviews and validates work quality and standards',
      optimizer: 'Optimizes performance and efficiency across systems',
      documenter: 'Creates and maintains comprehensive documentation',
      monitor: 'Monitors system health and performance metrics',
      specialist: 'Provides domain-specific expertise and specialized knowledge',
      // Maestro specs-driven agent types (underscore format)
      requirements_analyst:
        'Analyzes requirements and creates user stories with acceptance criteria',
      design_architect: 'Creates technical designs and system architecture for features',
      task_planner: 'Plans implementation tasks and orchestrates workflow execution',
      implementation_coder: 'Implements code based on designs with quality focus',
      quality_reviewer: 'Reviews code quality and ensures standards compliance',
      steering_documenter: 'Maintains governance documentation and project steering',
      // Maestro specs-driven agent types (hyphen format - backward compatibility)
      'design-architect': 'Creates technical designs and system architecture for features',
      'system-architect': 'High-level system architecture and design patterns',
      'task-planner': 'Plans implementation tasks and orchestrates workflow execution',
      developer: 'General purpose software development and implementation',
      'requirements-engineer': 'Requirements analysis and technical documentation',
      'steering-author': 'Governance and steering documentation authoring',
    };
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(type: AgentType): string {
    this.agentCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.agentCounter.toString(36).padStart(2, '0');
    return `${type}-${timestamp}-${counter}`;
  }

  /**
   * Create agent with runtime validation
   */
  createAgentWithValidation(type: string, options: AgentSpawnOptions = {}): Promise<SpawnedAgent> {
    // Validate inputs before creating
    const tempConfig = { type: type as AgentType, ...options };
    const validationErrors = this.validateAgentConfig(tempConfig);

    if (validationErrors.length > 0) {
      logger.error('Agent configuration validation failed', { errors: validationErrors });
      throw new Error(
        `Agent configuration validation failed: ${validationErrors.map((e) => e.message).join(', ')}`,
      );
    }

    return this.spawnAgent(type, options);
  }

  /**
   * Batch spawn multiple agents
   */
  async batchSpawnAgents(
    requests: Array<{ type: string; options?: AgentSpawnOptions }>,
  ): Promise<SpawnedAgent[]> {
    const results: SpawnedAgent[] = [];
    const errors: Error[] = [];

    for (const request of requests) {
      try {
        const agent = await this.spawnAgent(request.type, request.options);
        results.push(agent);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      logger.warn('Some agents failed to spawn in batch operation', {
        successful: results.length,
        failed: errors.length,
        errors: errors.map((e) => e.message),
      });
    }

    return results;
  }

  /**
   * Get agent capabilities by type
   */
  getAgentCapabilities(type: string): AgentCapability[] {
    try {
      const normalizedType = normalizeAgentType(type) as AgentType;
      return getCapabilitiesForAgentType(normalizedType);
    } catch (error) {
      logger.error('Failed to get agent capabilities', {
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

// Export singleton instance
export const agentFactory = new AgentFactory();

// Legacy exports for backward compatibility - use 'export type' for types
export type { AgentType, AgentCapability } from '../../hive-mind/types.js';

// Helper functions
export function isValidAgentType(type: string): boolean {
  try {
    return validateAgentType(type);
  } catch {
    return false;
  }
}

export function getAllAgentTypes(): string[] {
  return agentFactory.getSupportedTypes();
}

export function getAgentTypeDescription(type: string): string {
  try {
    const normalizedType = normalizeAgentType(type);
    const descriptions = agentFactory.getAgentTypeDescriptions();
    return descriptions[normalizedType] || 'Unknown agent type';
  } catch {
    return 'Invalid agent type';
  }
}

export function createAgent(type: string, options: AgentSpawnOptions = {}): Promise<SpawnedAgent> {
  return agentFactory.createAgentWithValidation(type, options);
}

// Default export
export default agentFactory;
