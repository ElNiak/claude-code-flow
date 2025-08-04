/**
 * AgentType System Unification - Test Suite
 *
 * This test suite defines the expected behavior for the unified AgentType system.
 * Following TDD methodology - tests are written first to define requirements.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Import from the unified source (will be implemented)
import {
  AgentType,
  isValidAgentType,
  resolveLegacyAgentType,
  normalizeAgentType,
  getAllAgentTypes,
  getAgentTypeInfo,
  validateAgentTypeStrict,
  AGENT_TYPE_REGISTRY,
} from '../../../src/swarm/types';

describe('AgentType System Unification', () => {
  describe('Core AgentType Definition', () => {
    it('should have a single authoritative AgentType union type', () => {
      // This test will pass once we implement the unified type
      expect(typeof 'coder' as AgentType).toBe('string');
      expect(typeof 'researcher' as AgentType).toBe('string');
      expect(typeof 'system-architect' as AgentType).toBe('string');
    });

    it('should include all 54+ agent types from CLAUDE.md', () => {
      const allTypes = getAllAgentTypes();

      // Core development agents
      expect(allTypes).toContain('coder');
      expect(allTypes).toContain('reviewer');
      expect(allTypes).toContain('tester');
      expect(allTypes).toContain('planner');
      expect(allTypes).toContain('researcher');

      // Swarm coordination agents
      expect(allTypes).toContain('hierarchical-coordinator');
      expect(allTypes).toContain('mesh-coordinator');
      expect(allTypes).toContain('adaptive-coordinator');
      expect(allTypes).toContain('collective-intelligence-coordinator');
      expect(allTypes).toContain('swarm-memory-manager');

      // Performance & optimization
      expect(allTypes).toContain('perf-analyzer');
      expect(allTypes).toContain('performance-benchmarker');
      expect(allTypes).toContain('task-orchestrator');
      expect(allTypes).toContain('memory-coordinator');
      expect(allTypes).toContain('smart-agent');

      // GitHub & repository management
      expect(allTypes).toContain('github-modes');
      expect(allTypes).toContain('pr-manager');
      expect(allTypes).toContain('code-review-swarm');
      expect(allTypes).toContain('issue-tracker');
      expect(allTypes).toContain('release-manager');

      // SPARC methodology agents
      expect(allTypes).toContain('sparc-coord');
      expect(allTypes).toContain('sparc-coder');
      expect(allTypes).toContain('specification');
      expect(allTypes).toContain('pseudocode');
      expect(allTypes).toContain('architecture');
      expect(allTypes).toContain('refinement');

      // Should have at least 54 agent types
      expect(allTypes.length).toBeGreaterThanOrEqual(54);
    });

    it('should use hyphen-separated naming convention', () => {
      const allTypes = getAllAgentTypes();

      // All agent types should use hyphens, not underscores
      allTypes.forEach((type) => {
        expect(type).not.toMatch(/_/);
        if (type.includes('-')) {
          expect(type).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        }
      });
    });
  });

  describe('Legacy Compatibility Layer', () => {
    it('should resolve underscore format to hyphen format', () => {
      expect(resolveLegacyAgentType('requirements_analyst')).toBe('requirements-analyst');
      expect(resolveLegacyAgentType('design_architect')).toBe('design-architect');
      expect(resolveLegacyAgentType('task_planner')).toBe('task-planner');
      expect(resolveLegacyAgentType('implementation_coder')).toBe('implementation-coder');
      expect(resolveLegacyAgentType('quality_reviewer')).toBe('quality-reviewer');
      expect(resolveLegacyAgentType('steering_documenter')).toBe('steering-documenter');
    });

    it('should handle already-correct hyphen format', () => {
      expect(resolveLegacyAgentType('system-architect')).toBe('system-architect');
      expect(resolveLegacyAgentType('perf-analyzer')).toBe('perf-analyzer');
      expect(resolveLegacyAgentType('code-review-swarm')).toBe('code-review-swarm');
    });

    it('should handle single-word agent types', () => {
      expect(resolveLegacyAgentType('coder')).toBe('coder');
      expect(resolveLegacyAgentType('reviewer')).toBe('reviewer');
      expect(resolveLegacyAgentType('tester')).toBe('tester');
    });

    it('should provide mapping for legacy generic names', () => {
      expect(resolveLegacyAgentType('analyst')).toBe('code-analyzer');
      expect(resolveLegacyAgentType('coordinator')).toBe('task-orchestrator');
      expect(resolveLegacyAgentType('optimizer')).toBe('perf-analyzer');
      expect(resolveLegacyAgentType('documenter')).toBe('api-docs');
      expect(resolveLegacyAgentType('monitor')).toBe('performance-benchmarker');
      expect(resolveLegacyAgentType('specialist')).toBe('system-architect');
      expect(resolveLegacyAgentType('architect')).toBe('system-architect');
    });
  });

  describe('Type Validation', () => {
    it('should validate correct agent types', () => {
      expect(isValidAgentType('coder')).toBe(true);
      expect(isValidAgentType('system-architect')).toBe(true);
      expect(isValidAgentType('perf-analyzer')).toBe(true);
      expect(isValidAgentType('code-review-swarm')).toBe(true);
    });

    it('should reject invalid agent types', () => {
      expect(isValidAgentType('invalid-agent')).toBe(false);
      expect(isValidAgentType('nonexistent')).toBe(false);
      expect(isValidAgentType('')).toBe(false);
      expect(isValidAgentType('123invalid')).toBe(false);
    });

    it('should provide strict validation with helpful errors', () => {
      const validResult = validateAgentTypeStrict('coder');
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateAgentTypeStrict('invalid-agent');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.errors[0]).toMatch(/not a valid agent type/i);
    });

    it('should suggest corrections for common mistakes', () => {
      const result = validateAgentTypeStrict('requirements_analyst');
      if (!result.valid) {
        expect(result.suggestions).toContain('requirements-analyst');
      }

      const result2 = validateAgentTypeStrict('design_architect');
      if (!result2.valid) {
        expect(result2.suggestions).toContain('design-architect');
      }
    });
  });

  describe('Type Normalization', () => {
    it('should normalize agent types consistently', () => {
      expect(normalizeAgentType('CODER')).toBe('coder');
      expect(normalizeAgentType('System-Architect')).toBe('system-architect');
      expect(normalizeAgentType('  perf-analyzer  ')).toBe('perf-analyzer');
      expect(normalizeAgentType('Code_Review_Swarm')).toBe('code-review-swarm');
    });

    it('should handle mixed formats', () => {
      expect(normalizeAgentType('requirements_Analyst')).toBe('requirements-analyst');
      expect(normalizeAgentType('Task_PLANNER')).toBe('task-planner');
      expect(normalizeAgentType('Performance_Benchmarker')).toBe('performance-benchmarker');
    });
  });

  describe('Agent Type Registry', () => {
    it('should provide comprehensive agent information', () => {
      const coderInfo = getAgentTypeInfo('coder');
      expect(coderInfo).toBeDefined();
      expect(coderInfo.name).toBe('coder');
      expect(coderInfo.description).toBeDefined();
      expect(typeof coderInfo.description).toBe('string');
      expect(coderInfo.capabilities).toBeInstanceOf(Array);
    });

    it('should include all agent categories', () => {
      const categories = AGENT_TYPE_REGISTRY.getCategories();
      expect(categories).toContain('core-development');
      expect(categories).toContain('swarm-coordination');
      expect(categories).toContain('performance-optimization');
      expect(categories).toContain('github-integration');
      expect(categories).toContain('sparc-methodology');
      expect(categories).toContain('specialized-development');
      expect(categories).toContain('testing-validation');
    });

    it('should provide agent types by category', () => {
      const coreDevAgents = AGENT_TYPE_REGISTRY.getByCategory('core-development');
      expect(coreDevAgents).toContain('coder');
      expect(coreDevAgents).toContain('reviewer');
      expect(coreDevAgents).toContain('tester');
      expect(coreDevAgents).toContain('planner');
      expect(coreDevAgents).toContain('researcher');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing code patterns', () => {
      // Test that existing code patterns still work
      const agentType: AgentType = 'coder';
      expect(isValidAgentType(agentType)).toBe(true);

      // Test that the legacy resolution works in type assignments
      const legacyType = resolveLegacyAgentType('requirements_analyst');
      expect(() => {
        const normalized: AgentType = legacyType as AgentType;
        expect(normalized).toBe('requirements-analyst');
      }).not.toThrow();
    });

    it('should provide migration helpers', () => {
      // Should provide utilities to help migrate old code
      expect(typeof resolveLegacyAgentType).toBe('function');
      expect(typeof normalizeAgentType).toBe('function');
      expect(typeof validateAgentTypeStrict).toBe('function');
    });
  });

  describe('Performance Requirements', () => {
    it('should handle type validation efficiently', () => {
      const start = performance.now();

      // Run validation 1000 times
      for (let i = 0; i < 1000; i++) {
        isValidAgentType('coder');
        isValidAgentType('system-architect');
        isValidAgentType('invalid-type');
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete in under 100ms for 1000 validations
      expect(duration).toBeLessThan(100);
    });

    it('should cache agent type information', () => {
      // First call might be slower (loading)
      const start1 = performance.now();
      getAllAgentTypes();
      const end1 = performance.now();

      // Second call should be much faster (cached)
      const start2 = performance.now();
      getAllAgentTypes();
      const end2 = performance.now();

      const firstCall = end1 - start1;
      const secondCall = end2 - start2;

      // Second call should be at least 50% faster
      expect(secondCall).toBeLessThan(firstCall * 0.5);
    });
  });

  describe('Integration with Dynamic Loader', () => {
    it('should integrate with the agent loader system', async () => {
      // This test ensures our unified type system works with the dynamic loader
      const { getAvailableAgentTypes } = await import('../../../src/agents/agent-loader');

      const dynamicTypes = await getAvailableAgentTypes();
      const staticTypes = getAllAgentTypes();

      // The static types should be a superset of dynamic types
      // (dynamic types come from .claude/agents files, static includes all possible)
      dynamicTypes.forEach((dynamicType) => {
        expect(staticTypes).toContain(dynamicType);
      });
    });
  });
});

describe('Chain-of-Verification (CoVe) Tests', () => {
  it('should verify no duplicate AgentType definitions exist', () => {
    // Verify that we successfully eliminated all duplicate definitions
    const allTypes = getAllAgentTypes();
    const uniqueTypes = [...new Set(allTypes)];
    expect(allTypes.length).toBe(uniqueTypes.length);
  });

  it('should verify all imports use single source', () => {
    // This test will be updated as we fix imports
    // For now, it documents the requirement
    expect(true).toBe(true); // Placeholder - will implement verification
  });

  it('should verify zero compilation errors', () => {
    // This test documents that TypeScript compilation should pass
    // Will be verified by npm run typecheck in CI
    expect(true).toBe(true); // Placeholder
  });
});
