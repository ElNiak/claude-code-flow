/**
 * Unit Tests for Agent Type Compatibility Layer - Phase 3: Agent Factory Engineering
 *
 * Tests the format compatibility and normalization functionality for agent types
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  normalizeAgentType,
  toUnderscoreFormat,
  isValidAgentType,
  normalizeAgentTypeForSpawning,
  getValidAgentTypesList,
  AgentTypeError,
  normalizeAgentSpawnOptions,
  assertValidAgentType,
  getFormatCompatibilityMatrix,
  detectAgentTypeFormat,
} from '../../../src/utils/agent-type-compatibility.js';

describe('Agent Type Compatibility Layer', () => {
  describe('normalizeAgentType', () => {
    it('should convert underscore format to hyphen format', () => {
      expect(normalizeAgentType('requirements_analyst')).toBe('requirements-analyst');
      expect(normalizeAgentType('design_architect')).toBe('design-architect');
      expect(normalizeAgentType('task_planner')).toBe('task-planner');
      expect(normalizeAgentType('implementation_coder')).toBe('implementation-coder');
      expect(normalizeAgentType('quality_reviewer')).toBe('quality-reviewer');
      expect(normalizeAgentType('steering_documenter')).toBe('steering-documenter');
    });

    it('should preserve hyphen format types', () => {
      expect(normalizeAgentType('requirements-analyst')).toBe('requirements-analyst');
      expect(normalizeAgentType('design-architect')).toBe('design-architect');
    });

    it('should preserve core types without changes', () => {
      expect(normalizeAgentType('coordinator')).toBe('coordinator');
      expect(normalizeAgentType('researcher')).toBe('researcher');
      expect(normalizeAgentType('coder')).toBe('coder');
      expect(normalizeAgentType('analyst')).toBe('analyst');
    });

    it('should handle edge cases', () => {
      expect(() => normalizeAgentType('')).toThrow(AgentTypeError);
      expect(() => normalizeAgentType(null as any)).toThrow(AgentTypeError);
      expect(() => normalizeAgentType(undefined as any)).toThrow(AgentTypeError);
    });

    it('should trim whitespace', () => {
      expect(normalizeAgentType('  coordinator  ')).toBe('coordinator');
      expect(normalizeAgentType('  requirements_analyst  ')).toBe('requirements-analyst');
    });
  });

  describe('toUnderscoreFormat', () => {
    it('should convert hyphen format to underscore format', () => {
      expect(toUnderscoreFormat('requirements-analyst')).toBe('requirements_analyst');
      expect(toUnderscoreFormat('design-architect')).toBe('design_architect');
      expect(toUnderscoreFormat('task-planner')).toBe('task_planner');
    });

    it('should preserve underscore format types', () => {
      expect(toUnderscoreFormat('requirements_analyst')).toBe('requirements_analyst');
      expect(toUnderscoreFormat('design_architect')).toBe('design_architect');
    });

    it('should preserve core types without changes', () => {
      expect(toUnderscoreFormat('coordinator')).toBe('coordinator');
      expect(toUnderscoreFormat('researcher')).toBe('researcher');
    });

    it('should handle edge cases', () => {
      expect(() => toUnderscoreFormat('')).toThrow(AgentTypeError);
      expect(() => toUnderscoreFormat(null as any)).toThrow(AgentTypeError);
      expect(() => toUnderscoreFormat(undefined as any)).toThrow(AgentTypeError);
    });
  });

  describe('isValidAgentType', () => {
    it('should validate core agent types', () => {
      expect(isValidAgentType('coordinator')).toBe(true);
      expect(isValidAgentType('researcher')).toBe(true);
      expect(isValidAgentType('coder')).toBe(true);
      expect(isValidAgentType('analyst')).toBe(true);
      expect(isValidAgentType('architect')).toBe(true);
      expect(isValidAgentType('tester')).toBe(true);
    });

    it('should validate underscore format Maestro types', () => {
      expect(isValidAgentType('requirements_analyst')).toBe(true);
      expect(isValidAgentType('design_architect')).toBe(true);
      expect(isValidAgentType('task_planner')).toBe(true);
      expect(isValidAgentType('implementation_coder')).toBe(true);
      expect(isValidAgentType('quality_reviewer')).toBe(true);
      expect(isValidAgentType('steering_documenter')).toBe(true);
    });

    it('should validate hyphen format Maestro types', () => {
      expect(isValidAgentType('requirements-analyst')).toBe(true);
      expect(isValidAgentType('design-architect')).toBe(true);
      expect(isValidAgentType('task-planner')).toBe(true);
      expect(isValidAgentType('implementation-coder')).toBe(true);
      expect(isValidAgentType('quality-reviewer')).toBe(true);
      expect(isValidAgentType('steering-documenter')).toBe(true);
    });

    it('should reject invalid agent types', () => {
      expect(isValidAgentType('invalid_type')).toBe(false);
      expect(isValidAgentType('random-agent')).toBe(false);
      expect(isValidAgentType('')).toBe(false);
      expect(isValidAgentType(null as any)).toBe(false);
      expect(isValidAgentType(undefined as any)).toBe(false);
    });
  });

  describe('normalizeAgentTypeForSpawning', () => {
    it('should normalize valid types for spawning', () => {
      expect(normalizeAgentTypeForSpawning('requirements_analyst')).toBe('requirements-analyst');
      expect(normalizeAgentTypeForSpawning('design_architect')).toBe('design-architect');
      expect(normalizeAgentTypeForSpawning('coordinator')).toBe('coordinator');
    });

    it('should throw AgentTypeError for invalid types with suggestions', () => {
      expect(() => normalizeAgentTypeForSpawning('invalid_type')).toThrow(AgentTypeError);
      expect(() => normalizeAgentTypeForSpawning('random-agent')).toThrow(AgentTypeError);
    });

    it('should provide helpful error messages', () => {
      try {
        normalizeAgentTypeForSpawning('analys');
      } catch (error) {
        expect(error).toBeInstanceOf(AgentTypeError);
        expect((error as AgentTypeError).message).toContain('Did you mean');
        expect((error as AgentTypeError).message).toContain('analyst');
      }
    });
  });

  describe('normalizeAgentSpawnOptions', () => {
    it('should normalize spawn options with type normalization', () => {
      const options = {
        type: 'requirements_analyst',
        name: 'test-agent',
        capabilities: ['analysis'],
      };

      const normalized = normalizeAgentSpawnOptions(options);
      expect(normalized.type).toBe('requirements-analyst');
      expect(normalized.normalizedType).toBe('requirements-analyst');
      expect(normalized.name).toBe('test-agent');
    });

    it('should preserve original options while adding normalized type', () => {
      const options = {
        type: 'design_architect',
        config: { debug: true },
      };

      const normalized = normalizeAgentSpawnOptions(options);
      expect(normalized.type).toBe('design-architect');
      expect(normalized.normalizedType).toBe('design-architect');
      expect(normalized.config).toEqual({ debug: true });
    });
  });

  describe('assertValidAgentType', () => {
    it('should pass for valid agent types', () => {
      expect(() => assertValidAgentType('coordinator')).not.toThrow();
      expect(() => assertValidAgentType('requirements_analyst')).not.toThrow();
      expect(() => assertValidAgentType('design-architect')).not.toThrow();
    });

    it('should throw for invalid agent types', () => {
      expect(() => assertValidAgentType('invalid')).toThrow(AgentTypeError);
      expect(() => assertValidAgentType('')).toThrow(AgentTypeError);
      expect(() => assertValidAgentType(null)).toThrow(AgentTypeError);
      expect(() => assertValidAgentType(123)).toThrow(AgentTypeError);
    });
  });

  describe('getValidAgentTypesList', () => {
    it('should return a comprehensive list of valid agent types', () => {
      const validTypes = getValidAgentTypesList();

      // Check core types
      expect(validTypes).toContain('coordinator');
      expect(validTypes).toContain('researcher');
      expect(validTypes).toContain('coder');

      // Check underscore format Maestro types
      expect(validTypes).toContain('requirements_analyst');
      expect(validTypes).toContain('design_architect');

      // Check hyphen format Maestro types
      expect(validTypes).toContain('requirements-analyst');
      expect(validTypes).toContain('design-architect');

      // Should be sorted
      const sortedTypes = [...validTypes].sort();
      expect(validTypes).toEqual(sortedTypes);
    });

    it('should contain both format variants for dual-format types', () => {
      const validTypes = getValidAgentTypesList();

      expect(validTypes).toContain('requirements_analyst');
      expect(validTypes).toContain('requirements-analyst');
      expect(validTypes).toContain('design_architect');
      expect(validTypes).toContain('design-architect');
    });
  });

  describe('detectAgentTypeFormat', () => {
    it('should detect underscore format', () => {
      expect(detectAgentTypeFormat('requirements_analyst')).toBe('underscore');
      expect(detectAgentTypeFormat('design_architect')).toBe('underscore');
    });

    it('should detect hyphen format', () => {
      expect(detectAgentTypeFormat('requirements-analyst')).toBe('hyphen');
      expect(detectAgentTypeFormat('design-architect')).toBe('hyphen');
    });

    it('should detect mixed format', () => {
      expect(detectAgentTypeFormat('mixed_type-format')).toBe('mixed');
    });

    it('should default to hyphen for core types', () => {
      expect(detectAgentTypeFormat('coordinator')).toBe('hyphen');
      expect(detectAgentTypeFormat('researcher')).toBe('hyphen');
    });
  });

  describe('getFormatCompatibilityMatrix', () => {
    it('should provide compatibility mappings', () => {
      const matrix = getFormatCompatibilityMatrix();

      // Check dual-format mappings
      expect(matrix['requirements_analyst']).toEqual({
        underscore: 'requirements_analyst',
        hyphen: 'requirements-analyst',
        valid: true,
      });

      expect(matrix['requirements-analyst']).toEqual({
        underscore: 'requirements_analyst',
        hyphen: 'requirements-analyst',
        valid: true,
      });

      // Check core types
      expect(matrix['coordinator']).toEqual({
        underscore: 'coordinator',
        hyphen: 'coordinator',
        valid: true,
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle whitespace correctly', () => {
      expect(normalizeAgentType('  coordinator  ')).toBe('coordinator');
      expect(isValidAgentType('  requirements_analyst  ')).toBe(false); // Should not trim for validation
    });

    it('should provide consistent error types', () => {
      const testInvalidType = (fn: Function, input: any) => {
        try {
          fn(input);
        } catch (error) {
          expect(error).toBeInstanceOf(AgentTypeError);
        }
      };

      testInvalidType(normalizeAgentType, '');
      testInvalidType(toUnderscoreFormat, null);
      testInvalidType(normalizeAgentTypeForSpawning, 'invalid');
      testInvalidType(assertValidAgentType, 123);
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain backward compatibility for existing code', () => {
      // These should all work without breaking existing functionality
      const legacyTypes = [
        'requirements_analyst',
        'design_architect',
        'task_planner',
        'implementation_coder',
        'quality_reviewer',
        'steering_documenter',
      ];

      legacyTypes.forEach((type) => {
        expect(isValidAgentType(type)).toBe(true);
        expect(() => normalizeAgentTypeForSpawning(type)).not.toThrow();
      });
    });

    it('should handle all known existing type variants', () => {
      const knownVariants = [
        { underscore: 'requirements_analyst', hyphen: 'requirements-analyst' },
        { underscore: 'design_architect', hyphen: 'design-architect' },
        { underscore: 'task_planner', hyphen: 'task-planner' },
        { underscore: 'implementation_coder', hyphen: 'implementation-coder' },
        { underscore: 'quality_reviewer', hyphen: 'quality-reviewer' },
        { underscore: 'steering_documenter', hyphen: 'steering-documenter' },
      ];

      knownVariants.forEach((variant) => {
        expect(isValidAgentType(variant.underscore)).toBe(true);
        expect(isValidAgentType(variant.hyphen)).toBe(true);
        expect(normalizeAgentType(variant.underscore)).toBe(variant.hyphen);
        expect(toUnderscoreFormat(variant.hyphen)).toBe(variant.underscore);
      });
    });
  });

  describe('Integration with agent factory', () => {
    it('should support agent factory operations', () => {
      const testCases = [
        'coordinator',
        'requirements_analyst',
        'requirements-analyst',
        'design_architect',
        'design-architect',
      ];

      testCases.forEach((type) => {
        // Should normalize successfully for spawning
        const normalized = normalizeAgentTypeForSpawning(type);
        expect(typeof normalized).toBe('string');
        expect(normalized.length).toBeGreaterThan(0);

        // Should create valid spawn options
        const spawnOptions = normalizeAgentSpawnOptions({
          type,
          name: 'test-agent',
        });
        expect(spawnOptions.normalizedType).toBe(normalized);
      });
    });
  });
});
