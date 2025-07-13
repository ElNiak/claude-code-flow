/**
 * Comprehensive Test Suite for Hive-Mind Parameter Parsing Fix
 * Tests for GitHub Issue #212: hive-mind spawn ignores multiple parameters
 */

import { execSync } from 'child_process';
import path from 'path';

describe('Hive-Mind Parameter Parsing Fix Tests', () => {
  const binPath = path.join(__dirname, '../../bin/claude-flow');
  
  // Helper function to run commands and capture output
  function runHiveMindCommand(args, expectError = false) {
    try {
      const result = execSync(`node ${binPath} hive-mind spawn ${args}`, {
        encoding: 'utf8',
        timeout: 10000,
        stdio: 'pipe'
      });
      return { success: true, output: result, error: null };
    } catch (error) {
      if (expectError) {
        return { success: false, output: error.stdout, error: error.stderr };
      }
      throw error;
    }
  }

  describe('Parameter Alias Support', () => {
    test('should accept --agents parameter', () => {
      const result = runHiveMindCommand('--agents 5 "Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('5'); // Should reflect the agent count
    });

    test('should accept --max-workers parameter', () => {
      const result = runHiveMindCommand('--max-workers 6 "Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('6');
    });

    test('should accept maxWorkers parameter', () => {
      const result = runHiveMindCommand('--maxWorkers 7 "Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('7');
    });
  });

  describe('Queen Type Parameter', () => {
    test('should accept --queen-type parameter', () => {
      const result = runHiveMindCommand('--queen-type tactical "Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('tactical');
    });

    test('should accept queenType parameter', () => {
      const result = runHiveMindCommand('--queenType adaptive "Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('adaptive');
    });

    test('should default to strategic when no queen type specified', () => {
      const result = runHiveMindCommand('"Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('strategic');
    });
  });

  describe('Consensus Algorithm Parameter', () => {
    test('should accept --consensus parameter', () => {
      const result = runHiveMindCommand('--consensus weighted "Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('weighted');
    });

    test('should accept consensusAlgorithm parameter', () => {
      const result = runHiveMindCommand('--consensusAlgorithm byzantine "Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('byzantine');
    });

    test('should default to majority when no consensus specified', () => {
      const result = runHiveMindCommand('"Test objective"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('majority');
    });
  });

  describe('Parameter Validation', () => {
    test('should reject invalid agent count - zero', () => {
      const result = runHiveMindCommand('--agents 0 "Test objective"', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid agent count');
      expect(result.error).toContain('Must be between 1 and 100');
    });

    test('should reject invalid agent count - negative', () => {
      const result = runHiveMindCommand('--agents -5 "Test objective"', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid agent count');
    });

    test('should reject invalid agent count - too large', () => {
      const result = runHiveMindCommand('--agents 150 "Test objective"', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid agent count');
      expect(result.error).toContain('Must be between 1 and 100');
    });

    test('should reject non-numeric agent count', () => {
      const result = runHiveMindCommand('--agents abc "Test objective"', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid agent count');
    });

    test('should accept valid agent count range', () => {
      for (const count of [1, 5, 50, 100]) {
        const result = runHiveMindCommand(`--agents ${count} "Test objective"`);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Combined Parameters', () => {
    test('should handle multiple parameters correctly', () => {
      const result = runHiveMindCommand(
        '--agents 8 --queen-type tactical --consensus weighted "Complex test objective"'
      );
      expect(result.success).toBe(true);
      expect(result.output).toContain('8');
      expect(result.output).toContain('tactical');
      expect(result.output).toContain('weighted');
    });

    test('should prioritize first parameter when duplicates provided', () => {
      const result = runHiveMindCommand(
        '--agents 5 --max-workers 10 "Test objective"'
      );
      expect(result.success).toBe(true);
      // Should use first valid parameter (agents=5, not max-workers=10)
      expect(result.output).toContain('5');
    });
  });

  describe('Backward Compatibility', () => {
    test('should still work with original parameter names', () => {
      const result = runHiveMindCommand(
        '--maxWorkers 4 --queenType strategic --consensus majority "Legacy test"'
      );
      expect(result.success).toBe(true);
      expect(result.output).toContain('4');
      expect(result.output).toContain('strategic');
      expect(result.output).toContain('majority');
    });

    test('should handle mixed old and new parameter styles', () => {
      const result = runHiveMindCommand(
        '--agents 3 --queenType adaptive --consensus byzantine "Mixed test"'
      );
      expect(result.success).toBe(true);
      expect(result.output).toContain('3');
      expect(result.output).toContain('adaptive');
      expect(result.output).toContain('byzantine');
    });
  });

  describe('Default Values', () => {
    test('should use correct defaults when no parameters provided', () => {
      const result = runHiveMindCommand('"Default test"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('8'); // default maxWorkers
      expect(result.output).toContain('strategic'); // default queenType
      expect(result.output).toContain('majority'); // default consensus
    });

    test('should override only specified parameters', () => {
      const result = runHiveMindCommand('--agents 12 "Partial override test"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('12'); // overridden maxWorkers
      expect(result.output).toContain('strategic'); // default queenType
      expect(result.output).toContain('majority'); // default consensus
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string parameters gracefully', () => {
      const result = runHiveMindCommand('--agents "" "Empty param test"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('8'); // Should use default
    });

    test('should handle whitespace in parameters', () => {
      const result = runHiveMindCommand('--agents " 5 " "Whitespace test"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('5'); // Should parse correctly
    });

    test('should handle objective with special characters', () => {
      const result = runHiveMindCommand('--agents 3 "Test with @#$% special chars"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('3');
    });
  });
});

describe('Integration Tests', () => {
  test('should fix the original issue from GitHub #212', () => {
    // Test the exact scenarios mentioned in the GitHub issue
    const scenarios = [
      { args: '--agents 8 "Task 1"', expected: '8' },
      { args: '--agents 6 "Task 2"', expected: '6' },
      { args: '--queen-type tactical "Task 3"', expected: 'tactical' },
      { args: '--consensus weighted "Task 4"', expected: 'weighted' }
    ];

    scenarios.forEach(({ args, expected }) => {
      const result = runHiveMindCommand(args);
      expect(result.success).toBe(true);
      expect(result.output).toContain(expected);
    });
  });

  test('should no longer ignore user-specified parameters', () => {
    const result = runHiveMindCommand('--agents 15 --queen-type adaptive "Full test"');
    expect(result.success).toBe(true);
    
    // Verify that user parameters are NOT ignored
    expect(result.output).not.toContain('4'); // Old hardcoded default
    expect(result.output).not.toContain('researcher, coder, analyst, tester'); // Old hardcoded types
    
    // Verify that user parameters ARE used
    expect(result.output).toContain('15');
    expect(result.output).toContain('adaptive');
  });
});