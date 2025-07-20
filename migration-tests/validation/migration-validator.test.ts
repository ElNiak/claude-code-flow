/**
 * Migration Validator Tests
 * Tests for validating Jest migration quality and correctness
 */

import { DenoToJestConverter, ConversionResult } from '@utils/deno-to-jest-converter';
import { assertionMapper } from '@utils/assertion-mapper';
import { AsyncTestHandler } from '@utils/async-test-handler';

describe('Jest Migration Validation', () => {
  let converter: DenoToJestConverter;

  beforeEach(() => {
    converter = new DenoToJestConverter({
      preserveComments: true,
      useESModules: true,
      maintainStructure: true,
      addTypeScript: true
    });
  });

  describe('Deno to Jest Converter', () => {
    it('should convert simple Deno test to Jest format', () => {
      const denoCode = `
Deno.test("should add numbers", () => {
  const result = add(2, 3);
  assertEquals(result, 5);
});`;

      const result = converter.convert(denoCode);

      expect(result.convertedCode).toBeValidJestTest();
      expect(result.convertedCode).toContain('describe(');
      expect(result.convertedCode).toContain('it(');
      expect(result.convertedCode).toContain('expect(');
      expect(result.conversionStats.testsConverted).toBe(1);
      expect(result.conversionStats.assertionsConverted).toBeGreaterThan(0);
    });

    it('should convert async Deno test to Jest format', () => {
      const denoCode = `
Deno.test("should fetch data", async () => {
  const data = await fetchData();
  assertEquals(data.status, "success");
  assertExists(data.result);
});`;

      const result = converter.convert(denoCode);

      expect(result.convertedCode).toContain('async () => {');
      expect(result.convertedCode).toContain('await');
      expect(result.convertedCode).toContain('expect(');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle complex Deno test with multiple assertions', () => {
      const denoCode = `
Deno.test("should validate user data", () => {
  const user = { name: "John", age: 30, active: true };
  assertEquals(user.name, "John");
  assertEquals(user.age, 30);
  assert(user.active);
  assertExists(user);
  assertInstanceOf(user, Object);
});`;

      const result = converter.convert(denoCode);

      expect(result.convertedCode).toBeValidJestTest();
      expect(result.conversionStats.assertionsConverted).toBeGreaterThanOrEqual(5);
      expect(result.convertedCode).toContain('expect(user.name).toBe("John")');
      expect(result.convertedCode).toContain('expect(user.active).toBeTruthy()');
      expect(result.convertedCode).toContain('expect(user).toBeDefined()');
    });

    it('should convert error throwing tests', () => {
      const denoCode = `
Deno.test("should throw error for invalid input", () => {
  assertThrows(() => {
    validateInput(null);
  }, Error, "Input cannot be null");
});`;

      const result = converter.convert(denoCode);

      expect(result.convertedCode).toContain('expect(');
      expect(result.convertedCode).toContain('.toThrow(');
      expect(result.conversionStats.assertionsConverted).toBeGreaterThan(0);
    });

    it('should handle imports and convert them appropriately', () => {
      const denoCode = `
import { assertEquals, assertExists } from "https://deno.land/std/testing/asserts.ts";
import { add } from "./math.ts";

Deno.test("math operations", () => {
  assertEquals(add(1, 2), 3);
});`;

      const result = converter.convert(denoCode);

      expect(result.convertedCode).not.toContain('https://deno.land');
      expect(result.convertedCode).toContain('// Jest');
      expect(result.conversionStats.importsUpdated).toBeGreaterThan(0);
    });

    it('should generate meaningful conversion report', () => {
      const denoCode = `
Deno.test("test with warnings", () => {
  assertEquals(someFunction(), expectedValue);
});`;

      const result = converter.convert(denoCode);
      const report = converter.generateReport(result);

      expect(report).toContain('Conversion Statistics');
      expect(report).toContain('Tests converted:');
      expect(report).toContain('Assertions converted:');
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });

  describe('Assertion Mapper', () => {
    it('should map assertEquals to Jest toBe', () => {
      const jestEquivalent = assertionMapper.getJestEquivalent('assertEquals');
      expect(jestEquivalent).toBe('expect().toBe()');
    });

    it('should map assertExists to multiple Jest assertions', () => {
      const mapping = assertionMapper.getMapping('assertExists');

      expect(mapping).toBeDefined();
      expect(mapping?.jestEquivalent).toContain('toBeDefined');
      expect(mapping?.jestEquivalent).toContain('not.toBeNull');
    });

    it('should convert specific assertion calls correctly', () => {
      const denoAssertion = 'assertEquals(result, 42)';
      const converted = assertionMapper.convertAssertion(denoAssertion);

      expect(converted).toBe('expect(result).toBe(42)');
    });

    it('should handle complex assertion parameters', () => {
      const denoAssertion = 'assertArrayIncludes([1, 2, 3], [1, 3])';
      const converted = assertionMapper.convertAssertion(denoAssertion);

      expect(converted).toContain('forEach');
      expect(converted).toContain('toContain');
    });

    it('should return original assertion if no mapping exists', () => {
      const unknownAssertion = 'customAssert(value)';
      const converted = assertionMapper.convertAssertion(unknownAssertion);

      expect(converted).toBe(unknownAssertion);
    });

    it('should generate comprehensive conversion guide', () => {
      const guide = assertionMapper.generateConversionGuide();

      expect(guide).toContain('# Deno to Jest Assertion Conversion Guide');
      expect(guide).toContain('assertEquals');
      expect(guide).toContain('assertExists');
      expect(guide).toContain('**Deno:**');
      expect(guide).toContain('**Jest:**');
    });
  });

  describe('Async Test Handler', () => {
    it('should convert async Deno test to Jest format', () => {
      const denoCode = `
Deno.test("async operation", async () => {
  const result = await asyncFunction();
  assertEquals(result, "success");
});`;

      const converted = AsyncTestHandler.convertAsyncTest(denoCode);

      expect(converted).toContain('describe(');
      expect(converted).toContain('async () => {');
      expect(converted).toContain('await');
    });

    it('should generate async test template with options', () => {
      const template = AsyncTestHandler.generateAsyncTestTemplate(
        'API calls',
        'fetchData',
        {
          timeout: 5000,
          retries: 2,
          expectRejection: true,
          expectedErrorType: Error
        }
      );

      expect(template).toContain('jest.setTimeout(5000)');
      expect(template).toContain('jest.retryTimes(2)');
      expect(template).toContain('.rejects');
      expect(template).toContain('toThrow(Error)');
    });

    it('should validate async test code and provide feedback', () => {
      const validAsyncCode = `
describe('test', () => {
  it('should work', async () => {
    const result = await someFunction();
    expect(result).toBeDefined();
  });
});`;

      const validation = AsyncTestHandler.validateAsyncTest(validAsyncCode);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect issues in async test code', () => {
      const invalidAsyncCode = `
describe('test', () => {
  it('should work', () => {
    const result = await someFunction(); // await without async
    expect(result).toBeDefined();
  });
});`;

      const validation = AsyncTestHandler.validateAsyncTest(invalidAsyncCode);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('await without async');
    });
  });

  describe('Integration Tests', () => {
    it('should perform end-to-end conversion of complex Deno test file', () => {
      const complexDenoCode = `
import { assertEquals, assertExists, assertThrows } from "https://deno.land/std/testing/asserts.ts";
import { Calculator } from "./calculator.ts";

Deno.test("Calculator - basic operations", () => {
  const calc = new Calculator();
  assertEquals(calc.add(2, 3), 5);
  assertEquals(calc.subtract(5, 3), 2);
  assertEquals(calc.multiply(3, 4), 12);
  assertEquals(calc.divide(10, 2), 5);
});

Deno.test("Calculator - error handling", () => {
  const calc = new Calculator();
  assertThrows(() => {
    calc.divide(10, 0);
  }, Error, "Division by zero");
});

Deno.test("Calculator - async operations", async () => {
  const calc = new Calculator();
  const result = await calc.asyncCalculate(5, 3, "add");
  assertEquals(result, 8);
  assertExists(result);
});`;

      const result = converter.convert(complexDenoCode);

      // Validate overall conversion
      expect(result.convertedCode).toBeValidJestTest();
      expect(result.convertedCode).toHaveJestStructure();
      expect(result.convertedCode).toBeCompatibleWithESModules();

      // Validate statistics
      expect(result.conversionStats.testsConverted).toBe(3);
      expect(result.conversionStats.assertionsConverted).toBeGreaterThan(6);
      expect(result.conversionStats.importsUpdated).toBeGreaterThan(0);

      // Validate specific conversions
      expect(result.convertedCode).toContain('describe(');
      expect(result.convertedCode).toContain('it(');
      expect(result.convertedCode).toContain('expect(');
      expect(result.convertedCode).toContain('async () => {');
      expect(result.convertedCode).toContain('.toThrow(');
      expect(result.convertedCode).not.toContain('assertEquals');
      expect(result.convertedCode).not.toContain('assertExists');
      expect(result.convertedCode).not.toContain('Deno.test');
    });

    it('should handle edge cases gracefully', () => {
      const edgeCaseCode = `
// Test with unusual formatting
Deno.test(   "weird spacing"   ,   () => {
    assertEquals(  1  ,  1  );
});

// Test with nested functions
Deno.test("nested", () => {
  function helper() {
    return 42;
  }
  assertEquals(helper(), 42);
});`;

      const result = converter.convert(edgeCaseCode);

      expect(result.errors).toHaveLength(0);
      expect(result.convertedCode).toContain('expect(');
      expect(result.conversionStats.testsConverted).toBeGreaterThan(0);
    });

    it('should preserve code structure and readability', () => {
      const wellFormattedDeno = `
Deno.test("user service", () => {
  // Given
  const userService = new UserService();
  const userData = { name: "John", email: "john@example.com" };

  // When
  const user = userService.createUser(userData);

  // Then
  assertEquals(user.name, "John");
  assertEquals(user.email, "john@example.com");
  assertExists(user.id);
});`;

      const result = converter.convert(wellFormattedDeno);

      expect(result.convertedCode).toContain('// Given');
      expect(result.convertedCode).toContain('// When');
      expect(result.convertedCode).toContain('// Then');
      expect(result.convertedCode).toMatch(/describe\s*\(/);
      expect(result.convertedCode).toMatch(/it\s*\(/);
    });
  });

  describe('Performance and Quality', () => {
    it('should complete conversion in reasonable time', () => {
      const largeDenoCode = Array(100).fill(`
Deno.test("test ${Math.random()}", () => {
  const result = someFunction();
  assertEquals(result, expectedValue);
});`).join('\n');

      const startTime = performance.now();
      const result = converter.convert(largeDenoCode);
      const endTime = performance.now();

      const conversionTime = endTime - startTime;

      expect(conversionTime).toBeLessThan(5000); // Should complete in less than 5 seconds
      expect(result.conversionStats.testsConverted).toBe(100);
    });

    it('should maintain conversion quality metrics', () => {
      const denoCode = `
Deno.test("quality test", () => {
  const value = computeValue();
  assertEquals(value, 42);
  assertExists(value);
  assert(value > 0);
});`;

      const result = converter.convert(denoCode);

      // Quality metrics
      const originalLines = denoCode.split('\n').filter(line => line.trim()).length;
      const convertedLines = result.convertedCode.split('\n').filter(line => line.trim()).length;

      // Converted code should be reasonably similar in size
      expect(convertedLines).toBeGreaterThan(originalLines * 0.5);
      expect(convertedLines).toBeLessThan(originalLines * 3);

      // Should have high conversion rate
      const conversionRate = result.conversionStats.assertionsConverted / 3; // 3 assertions in original
      expect(conversionRate).toBe(1); // 100% conversion rate for basic assertions
    });
  });
});
