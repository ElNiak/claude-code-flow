/**
 * Agent Types - UPDATED to use unified AgentType system
 *
 * This file now imports from the single source of truth to prevent fragmentation.
 * All agent type definitions are maintained in src/swarm/agent-types-unified.ts
 */

// Import unified AgentType system from single source of truth
export type {
  AgentType,
  AgentTypeInfo,
  AgentTypeValidationResult,
} from '../swarm/agent-types-unified.js';

export {
  AGENT_TYPE_REGISTRY,
  LEGACY_AGENT_MAPPING,
  ALL_AGENT_TYPES,
  getAllAgentTypes,
  isValidAgentType,
  validateAgentTypeStrict,
  resolveLegacyAgentType,
  normalizeAgentType,
  getAgentTypeInfo,
  assertValidAgentType,
  isValidAgentTypeCached,
  AGENT_TYPE_REGISTRY_INSTANCE,
  isAgentTypeArray,
} from '../swarm/agent-types-unified.js';

// Re-export from the dynamic agent loader for compatibility
import {
  getAvailableAgentTypes,
  isValidAgentType as validateAgentType,
} from '../agents/agent-loader.js';

/**
 * Get all valid agent types dynamically from .claude/agents/ directory
 * This integrates with the file-based agent definitions
 */
export async function getValidAgentTypes(): Promise<string[]> {
  return await getAvailableAgentTypes();
}

/**
 * Helper function to validate agent type against dynamic definitions
 * This checks against actual agent files in .claude/agents/
 */
export async function isValidAgentTypeDynamic(type: string): Promise<boolean> {
  return await validateAgentType(type);
}

/**
 * Create JSON Schema for agent type validation (async)
 * Uses both static definitions and dynamic agent files
 */
export async function getAgentTypeSchema() {
  const validTypes = await getValidAgentTypes();
  return {
    type: 'string',
    enum: validTypes,
    description: 'Type of specialized AI agent',
  };
}

// Strategy types (maintained for compatibility)
export const SWARM_STRATEGIES = {
  AUTO: 'auto',
  RESEARCH: 'research',
  DEVELOPMENT: 'development',
  ANALYSIS: 'analysis',
  TESTING: 'testing',
  OPTIMIZATION: 'optimization',
  MAINTENANCE: 'maintenance',
  CUSTOM: 'custom',
} as const;

export type SwarmStrategy = (typeof SWARM_STRATEGIES)[keyof typeof SWARM_STRATEGIES];
export const VALID_SWARM_STRATEGIES = Object.values(SWARM_STRATEGIES);

// Task orchestration strategies (different from swarm strategies)
export const ORCHESTRATION_STRATEGIES = {
  PARALLEL: 'parallel',
  SEQUENTIAL: 'sequential',
  ADAPTIVE: 'adaptive',
  BALANCED: 'balanced',
} as const;

export type OrchestrationStrategy =
  (typeof ORCHESTRATION_STRATEGIES)[keyof typeof ORCHESTRATION_STRATEGIES];
export const VALID_ORCHESTRATION_STRATEGIES = Object.values(ORCHESTRATION_STRATEGIES);

/**
 * Integration helper: Merge static and dynamic agent types
 * This ensures all agent types are available regardless of source
 */
export async function getAllAgentTypesUnified(): Promise<string[]> {
  // Import the function at usage to avoid circular dependencies
  const { getAllAgentTypes } = await import('../swarm/agent-types-unified.js');
  const staticTypes = getAllAgentTypes();
  const dynamicTypes = await getAvailableAgentTypes();

  // Merge and deduplicate
  const allTypes = [...new Set([...staticTypes, ...dynamicTypes])];
  return allTypes.sort();
}

// Note: getValidAgentTypes is already defined above - removed duplicate

/**
 * Comprehensive agent type validation
 * Checks against both static definitions and dynamic agent files
 */
export async function isValidAgentTypeUnified(type: string): Promise<boolean> {
  // Import the function at usage to avoid circular dependencies
  const { isValidAgentType } = await import('../swarm/agent-types-unified.js');
  // Check static definitions first (faster)
  if (isValidAgentType(type)) {
    return true;
  }

  // Check dynamic definitions
  return await validateAgentType(type);
}
