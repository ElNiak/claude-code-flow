/**
 * Agent Type Compatibility Layer - Phase 3: Agent Factory Engineering
 *
 * This module provides format compatibility between different agent type formats
 * and ensures seamless agent spawning across all factory methods.
 *
 * Addresses the issue where:
 * - Some code uses underscore format: 'requirements_analyst', 'design_architect'
 * - Some code uses hyphen format: 'requirements-analyst', 'design-architect'
 * - Factory methods need to handle both formats seamlessly
 */

import { AgentType } from '../constants/agent-types.js';

// Type format mappings for compatibility
const UNDERSCORE_TO_HYPHEN_MAP: Record<string, string> = {
  requirements_analyst: 'requirements-analyst',
  design_architect: 'design-architect',
  task_planner: 'task-planner',
  implementation_coder: 'implementation-coder',
  quality_reviewer: 'quality-reviewer',
  steering_documenter: 'steering-documenter',
  system_architect: 'system-architect',
  requirements_engineer: 'requirements-engineer',
} as const;

const HYPHEN_TO_UNDERSCORE_MAP: Record<string, string> = {
  'requirements-analyst': 'requirements_analyst',
  'design-architect': 'design_architect',
  'task-planner': 'task_planner',
  'implementation-coder': 'implementation_coder',
  'quality-reviewer': 'quality_reviewer',
  'steering-documenter': 'steering_documenter',
  'system-architect': 'system_architect',
  'requirements-engineer': 'requirements_engineer',
} as const;

// Unified valid agent types (supporting both formats)
const VALID_AGENT_TYPES = new Set([
  // Core agent types (consistent across formats)
  'coordinator',
  'researcher',
  'coder',
  'analyst',
  'architect',
  'tester',
  'reviewer',
  'optimizer',
  'documenter',
  'monitor',
  'specialist',
  'developer',

  // Maestro-specific types (both formats supported)
  'requirements_analyst',
  'requirements-analyst',
  'design_architect',
  'design-architect',
  'task_planner',
  'task-planner',
  'implementation_coder',
  'implementation-coder',
  'quality_reviewer',
  'quality-reviewer',
  'steering_documenter',
  'steering-documenter',
  'system_architect',
  'system-architect',
  'requirements_engineer',
  'requirements-engineer',
]);

/**
 * Normalize agent type to a consistent format
 * Converts underscores to hyphens for internal consistency
 */
export function normalizeAgentType(type: string | AgentType): string {
  if (!type || typeof type !== 'string') {
    throw new AgentTypeError(`Invalid agent type: ${type}. Must be a non-empty string.`);
  }

  const trimmedType = type.trim();

  // If it's already in hyphen format or a core type, return as-is
  if (!trimmedType.includes('_')) {
    return trimmedType;
  }

  // Convert underscore to hyphen format
  const normalizedType = UNDERSCORE_TO_HYPHEN_MAP[trimmedType] || trimmedType;
  return normalizedType;
}

/**
 * Convert agent type to underscore format for legacy compatibility
 */
export function toUnderscoreFormat(type: string | AgentType): string {
  if (!type || typeof type !== 'string') {
    throw new AgentTypeError(`Invalid agent type: ${type}. Must be a non-empty string.`);
  }

  const trimmedType = type.trim();

  // If it's already in underscore format, return as-is
  if (!trimmedType.includes('-')) {
    return trimmedType;
  }

  // Convert hyphen to underscore format
  const underscoreType = HYPHEN_TO_UNDERSCORE_MAP[trimmedType] || trimmedType;
  return underscoreType;
}

/**
 * Validate if an agent type is supported (in any format)
 */
export function isValidAgentType(type: string | AgentType): boolean {
  if (!type || typeof type !== 'string') {
    return false;
  }

  const trimmedType = type.trim();
  return VALID_AGENT_TYPES.has(trimmedType);
}

/**
 * Enhanced agent spawning function with type normalization
 */
export function normalizeAgentTypeForSpawning(type: string | AgentType): string {
  if (!isValidAgentType(type)) {
    const suggestions = getSimilarAgentTypes(type as string);
    const suggestionsText =
      suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';

    throw new AgentTypeError(
      `Invalid agent type: '${type}'. ${suggestionsText}\n` +
        `Valid types: ${getValidAgentTypesList().join(', ')}`,
    );
  }

  // Normalize to consistent internal format (hyphen format)
  return normalizeAgentType(type);
}

/**
 * Get list of all valid agent types (both formats)
 */
export function getValidAgentTypesList(): string[] {
  return Array.from(VALID_AGENT_TYPES).sort();
}

/**
 * Find similar agent types for helpful error messages
 */
function getSimilarAgentTypes(type: string): string[] {
  if (!type || typeof type !== 'string') return [];

  const lowerType = type.toLowerCase();
  const validTypes = getValidAgentTypesList();

  // Find types that contain the input as a substring
  const similarTypes = validTypes.filter(
    (validType) =>
      validType.toLowerCase().includes(lowerType) || lowerType.includes(validType.toLowerCase()),
  );

  // Limit to 3 suggestions to avoid overwhelming the user
  return similarTypes.slice(0, 3);
}

/**
 * Custom error class for agent type validation errors
 */
export class AgentTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentTypeError';
  }
}

/**
 * Agent factory helper - ensures consistent agent creation
 */
export interface AgentSpawnOptions {
  type: string | AgentType;
  name?: string;
  capabilities?: string[];
  config?: Record<string, any>;
}

/**
 * Enhanced agent spawn options with normalized type
 */
export function normalizeAgentSpawnOptions(
  options: AgentSpawnOptions,
): AgentSpawnOptions & { normalizedType: string } {
  const normalizedType = normalizeAgentTypeForSpawning(options.type);

  return {
    ...options,
    type: normalizedType,
    normalizedType,
  };
}

/**
 * Type guard to check if a string is a valid agent type
 */
export function assertValidAgentType(type: unknown): asserts type is string {
  if (typeof type !== 'string' || !isValidAgentType(type)) {
    throw new AgentTypeError(`Invalid agent type: ${type}`);
  }
}

/**
 * Format compatibility matrix for debugging
 */
export function getFormatCompatibilityMatrix(): Record<
  string,
  { underscore: string; hyphen: string; valid: boolean }
> {
  const matrix: Record<string, { underscore: string; hyphen: string; valid: boolean }> = {};

  // Add mappings for dual-format types
  Object.entries(UNDERSCORE_TO_HYPHEN_MAP).forEach(([underscore, hyphen]) => {
    matrix[underscore] = { underscore, hyphen, valid: true };
    matrix[hyphen] = { underscore, hyphen, valid: true };
  });

  // Add core types (same in both formats)
  const coreTypes = [
    'coordinator',
    'researcher',
    'coder',
    'analyst',
    'architect',
    'tester',
    'reviewer',
    'optimizer',
    'documenter',
    'monitor',
    'specialist',
    'developer',
  ];
  coreTypes.forEach((type) => {
    matrix[type] = { underscore: type, hyphen: type, valid: true };
  });

  return matrix;
}

// Export type definitions for external use
export type NormalizedAgentType = string;
export type AgentTypeFormat = 'underscore' | 'hyphen' | 'mixed';

/**
 * Detect the format of an agent type string
 */
export function detectAgentTypeFormat(type: string): AgentTypeFormat {
  if (type.includes('_') && type.includes('-')) {
    return 'mixed';
  } else if (type.includes('_')) {
    return 'underscore';
  } else if (type.includes('-')) {
    return 'hyphen';
  } else {
    return 'hyphen'; // Default for core types
  }
}
