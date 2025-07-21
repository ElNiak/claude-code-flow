/**
 * Jest Migration Setup Extensions
 * Provides utilities for test migration from other frameworks
 */

// Set up migration test environment
process.env.JEST_MIGRATION_TEST = 'true';
process.env.MIGRATION_TEST_MODE = 'true';

// Create global migration utilities
global.migrationUtils = {
  // Deno-style assertions mapped to Jest
  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${actual} to equal ${expected}`);
    }
  },

  assertStrictEquals(actual, expected, message) {
    if (actual !== expected || typeof actual !== typeof expected) {
      throw new Error(message || `Expected ${actual} to strictly equal ${expected}`);
    }
  },

  assertExists(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || `Expected value to exist, got ${value}`);
    }
  },

  assertNotExists(value, message) {
    if (value !== null && value !== undefined) {
      throw new Error(message || `Expected value not to exist, got ${value}`);
    }
  },

  async assertThrows(fn, errorClass, message) {
    try {
      await fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      if (errorClass && !(error instanceof errorClass)) {
        throw new Error(message || `Expected error of type ${errorClass.name}, got ${error.constructor.name}`);
      }
    }
  },

  assertArrayIncludes(actual, expected, message) {
    if (!Array.isArray(actual)) {
      throw new Error(message || 'Expected actual to be an array');
    }
    if (!actual.includes(expected)) {
      throw new Error(message || `Expected array to include ${expected}`);
    }
  },

  assertStringIncludes(actual, expected, message) {
    if (typeof actual !== 'string') {
      throw new Error(message || 'Expected actual to be a string');
    }
    if (!actual.includes(expected)) {
      throw new Error(message || `Expected string to include ${expected}`);
    }
  },

  assertMatch(actual, pattern, message) {
    if (!pattern.test(actual)) {
      throw new Error(message || `Expected ${actual} to match pattern ${pattern}`);
    }
  },

  assertInstanceOf(actual, expected, message) {
    if (!(actual instanceof expected)) {
      throw new Error(message || `Expected value to be instance of ${expected.name}`);
    }
  },

  assertGreater(actual, expected, message) {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  },

  assertLess(actual, expected, message) {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  },

  assertGreaterOrEqual(actual, expected, message) {
    if (actual < expected) {
      throw new Error(message || `Expected ${actual} to be greater than or equal to ${expected}`);
    }
  },

  assertLessOrEqual(actual, expected, message) {
    if (actual > expected) {
      throw new Error(message || `Expected ${actual} to be less than or equal to ${expected}`);
    }
  },

  assertAlmostEquals(actual, expected, tolerance = 1e-7, message) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(message || `Expected ${actual} to be close to ${expected} within ${tolerance}`);
    }
  },

  fail(message) {
    throw new Error(message || 'Test failed');
  }
};

// Create mock Deno environment for migration compatibility
global.Deno = {
  test(name, fn) {
    // Convert Deno.test to Jest describe/it structure
    describe(name, () => {
      it('should pass', fn);
    });
  },

  env: {
    get(key) {
      return process.env[key];
    },
    set(key, value) {
      process.env[key] = value;
    },
    delete(key) {
      delete process.env[key];
    }
  }
};

// Migration test helpers
global.migrationTestHelpers = {
  createMockFile(name, content) {
    return {
      name,
      content,
      type: 'file',
      created: new Date().toISOString()
    };
  },

  createMockTest(testName, testParams = []) {
    return `describe('${testName}', () => {
  it('should work correctly', () => {
    ${testParams.map(param => `expect(${param}).toBeDefined();`).join('\n    ')}
  });
});`;
  },

  validateMigration(originalCode, migratedCode) {
    const hasValidStructure = migratedCode.includes('describe(') && migratedCode.includes('it(');
    const usesJestSyntax = migratedCode.includes('expect(') && !migratedCode.includes('assertEquals');
    const preservesLogic = originalCode.includes('test') && migratedCode.includes('test');

    return {
      hasValidStructure,
      usesJestSyntax,
      preservesLogic,
      isValid: hasValidStructure && usesJestSyntax
    };
  },

  convertDenoAssertion(denoAssertion) {
    const conversionMap = {
      'assertEquals': 'toBe',
      'assertStrictEquals': 'toStrictEqual',
      'assertExists': 'toBeDefined',
      'assertNotExists': 'toBeUndefined',
      'assertArrayIncludes': 'toContain',
      'assertStringIncludes': 'toContain',
      'assertInstanceOf': 'toBeInstanceOf',
      'assertThrows': 'toThrow'
    };

    return conversionMap[denoAssertion] || 'toBe';
  }
};

// Enhanced custom matchers for migration testing
expect.extend({
  toBeValidJestTest(received) {
    const hasDescribe = received.includes('describe(');
    const hasIt = received.includes('it(');
    const hasExpect = received.includes('expect(');

    const pass = hasDescribe && hasIt && hasExpect;

    return {
      pass,
      message: () => pass
        ? `Expected string not to be a valid Jest test`
        : `Expected string to be a valid Jest test (should contain describe, it, and expect)`
    };
  },

  toHaveValidMigration(received) {
    const validation = global.migrationTestHelpers.validateMigration('', received);

    return {
      pass: validation.isValid,
      message: () => validation.isValid
        ? `Expected code not to have valid migration`
        : `Expected code to have valid migration (structure: ${validation.hasValidStructure}, syntax: ${validation.usesJestSyntax})`
    };
  }
});

// Setup performance monitoring for migration tests
if (global.performance) {
  global.migrationUtils.measurePerformance = (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    console.log(`Migration test "${name}" took ${end - start} milliseconds`);
    return result;
  };
}

// Error handling for migration edge cases
process.on('unhandledRejection', (reason, promise) => {
  if (process.env.DEBUG_MIGRATION_TESTS) {
    console.error('Unhandled migration test rejection:', reason);
  }
});

// Clean up function for after migration tests
global.cleanupMigrationTest = () => {
  // Clean up any global state
  jest.clearAllMocks();
  jest.restoreAllMocks();
};

// Auto-cleanup after each test
afterEach(() => {
  if (global.cleanupMigrationTest) {
    global.cleanupMigrationTest();
  }
});
