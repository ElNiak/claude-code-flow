/**
 * Jest Migration Test Setup
 * Configure environment for Deno-to-Jest migration testing
 */

// Set migration test environment
process.env.JEST_MIGRATION_TEST = "true";
process.env.MIGRATION_TEST_MODE = "true";

// Enhanced test timeout for migration operations - only for migration tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(90000);
}

// Mock console methods for cleaner test output
const originalConsole = { ...console };

// Store original console methods
global.originalConsole = originalConsole;
global.restoreConsole = () => {
  Object.assign(console, originalConsole);
};

// Create test utilities namespace
global.migrationUtils = {
  // Deno assertion mappings to Jest
  assertEquals: (actual, expected, message) => {
    expect(actual).toBe(expected);
  },
  assertStrictEquals: (actual, expected, message) => {
    expect(actual).toStrictEqual(expected);
  },
  assertExists: (value, message) => {
    expect(value).toBeDefined();
    expect(value).not.toBeNull();
  },
  assertNotExists: (value, message) => {
    expect(value).toBeUndefined();
  },
  assertThrows: async (fn, ErrorType, message) => {
    if (ErrorType) {
      await expect(fn).rejects.toThrow(ErrorType);
    } else {
      await expect(fn).rejects.toThrow();
    }
  },
  assertArrayIncludes: (actual, expected, message) => {
    expected.forEach(item => {
      expect(actual).toContain(item);
    });
  },
  assertStringIncludes: (actual, expected, message) => {
    expect(actual).toContain(expected);
  },
  assertMatch: (actual, pattern, message) => {
    expect(actual).toMatch(pattern);
  },
  assertInstanceOf: (actual, Type, message) => {
    expect(actual).toBeInstanceOf(Type);
  },
  assertGreater: (actual, expected, message) => {
    expect(actual).toBeGreaterThan(expected);
  },
  assertLess: (actual, expected, message) => {
    expect(actual).toBeLessThan(expected);
  },
  assertGreaterOrEqual: (actual, expected, message) => {
    expect(actual).toBeGreaterThanOrEqual(expected);
  },
  assertLessOrEqual: (actual, expected, message) => {
    expect(actual).toBeLessThanOrEqual(expected);
  },
  assertAlmostEquals: (actual, expected, delta = 0.001, message) => {
    expect(actual).toBeCloseTo(expected, Math.abs(Math.log10(delta)));
  },
  fail: (message) => {
    throw new Error(message || "Test failed");
  }
};

// Create Deno-like test utilities
global.Deno = {
  test: (name, options, fn) => {
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }

    const testFn = options.only ? it.only : options.skip ? it.skip : it;

    testFn(name, async () => {
      if (options.sanitizeOps === false) {
        // Skip operation sanitization
      }
      if (options.sanitizeResources === false) {
        // Skip resource sanitization
      }

      await fn();
    });
  },

  // File system mocks for migration
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  readDir: jest.fn(),
  mkdir: jest.fn(),
  remove: jest.fn(),

  // Environment mocks
  env: {
    get: jest.fn((key) => process.env[key]),
    set: jest.fn((key, value) => { process.env[key] = value; }),
  },

  // Path utilities
  cwd: jest.fn(() => process.cwd()),

  // Mock permissions
  permissions: {
    query: jest.fn(() => Promise.resolve({ state: "granted" })),
    request: jest.fn(() => Promise.resolve({ state: "granted" })),
  }
};

// Enhanced Jest matchers for migration testing
expect.extend({
  toBeValidJestTest(received) {
    const hasDescribe = received.includes('describe(');
    const hasIt = received.includes('it(') || received.includes('test(');
    const hasExpect = received.includes('expect(');

    const pass = hasDescribe && hasIt && hasExpect;

    if (pass) {
      return {
        message: () => `Expected code not to be a valid Jest test`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected code to be a valid Jest test (needs describe, it/test, and expect)`,
        pass: false,
      };
    }
  },

  toHaveJestStructure(received) {
    const hasProperIndentation = !received.includes('\t') || received.includes('  ');
    const hasAsyncAwait = received.includes('async') && received.includes('await');
    const hasCleanAssertions = received.includes('expect(') && received.includes('.toBe');

    const pass = hasProperIndentation && hasCleanAssertions;

    if (pass) {
      return {
        message: () => `Expected code not to have proper Jest structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected code to have proper Jest structure`,
        pass: false,
      };
    }
  },

  toBeCompatibleWithESModules(received) {
    const hasImports = received.includes('import ') || received.includes('import{');
    const noRequire = !received.includes('require(');
    const hasExports = received.includes('export ') || received.includes('export{');

    const pass = hasImports && noRequire;

    if (pass) {
      return {
        message: () => `Expected code not to be ES module compatible`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected code to be ES module compatible (use import/export, not require)`,
        pass: false,
      };
    }
  }
});

// Global test helpers
global.migrationTestHelpers = {
  createMockFile: (content) => ({
    content,
    path: `/mock/${Math.random().toString(36).substr(2, 9)}.ts`,
    exists: true
  }),

  createMockTest: (name, assertions = []) => `
describe('${name}', () => {
  it('should pass basic test', async () => {
    ${assertions.map(a => `expect(${a}).toBeDefined();`).join('\n    ')}
  });
});`,

  simulateDenoTest: (testCode) => {
    // Simulate converting Deno.test to Jest structure
    return testCode
      .replace(/Deno\.test\(/g, 'it(')
      .replace(/assertEquals/g, 'expect')
      .replace(/assertExists/g, 'expect');
  },

  validateMigration: (originalCode, migratedCode) => {
    return {
      hasValidStructure: migratedCode.includes('describe(') && migratedCode.includes('it('),
      maintainsLogic: migratedCode.length > originalCode.length * 0.8,
      usesJestSyntax: migratedCode.includes('expect('),
      score: 0 // To be calculated based on above
    };
  }
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Global cleanup
afterAll(() => {
  global.restoreConsole();
});

console.log('🧪 Jest Migration Test Environment Initialized');
