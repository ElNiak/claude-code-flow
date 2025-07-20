# Jest Migration Testing Framework

## Overview

This directory contains a comprehensive Jest-based testing framework specifically designed for migrating tests from Deno to Jest. The framework provides utilities, converters, and validation tools to ensure high-quality test migration.

## Directory Structure

```
migration-tests/
├── setup.js                           # Jest setup for migration environment
├── jest.config.js                     # Dedicated Jest config for migration tests
├── README.md                          # This file
├── utils/                             # Migration utilities
│   ├── deno-to-jest-converter.ts      # Main conversion engine
│   ├── assertion-mapper.ts            # Assertion conversion mappings
│   ├── test-pattern-library.ts        # Common test patterns and templates
│   └── async-test-handler.ts          # Async/await pattern handling
├── validation/                        # Validation tests
│   └── migration-validator.test.ts    # Comprehensive validation suite
└── examples/                          # Real-world conversion examples
    └── sample-conversions.test.ts     # Sample Deno→Jest conversions
```

## Quick Start

### 1. Run Migration Tests

```bash
# Run all migration tests
npm test -- --testPathPattern="migration-tests"

# Run specific migration test
npm test -- --testNamePattern="Jest Framework Validation"

# Run with coverage
npm test -- --testPathPattern="migration-tests" --coverage
```

### 2. Use Migration Utilities

```typescript
import { DenoToJestConverter } from './utils/deno-to-jest-converter';
import { assertionMapper } from './utils/assertion-mapper';

// Convert Deno test to Jest
const converter = new DenoToJestConverter();
const result = converter.convert(denoTestCode);

// Convert individual assertions
const jestAssertion = assertionMapper.convertAssertion('assertEquals(a, b)');
```

### 3. Validate Conversion Quality

```typescript
import { validateJestCode } from './utils/deno-to-jest-converter';

const validation = validateJestCode(convertedCode);
console.log(validation.isValid); // true/false
console.log(validation.issues);  // List of issues found
```

## Migration Utilities

### Deno-to-Jest Converter

The main conversion engine that transforms Deno test files to Jest format:

- **Test Structure**: Converts `Deno.test()` to `describe()`/`it()` blocks
- **Imports**: Maps Deno std imports to Node.js/Jest equivalents
- **Assertions**: Converts all Deno assertions to Jest `expect()` statements
- **Async Patterns**: Handles async/await and Promise-based testing
- **Error Handling**: Comprehensive error reporting and validation

### Assertion Mapper

Maps 20+ Deno assertion functions to Jest equivalents:

- `assertEquals` → `expect().toBe()`
- `assertExists` → `expect().toBeDefined()` + `expect().not.toBeNull()`
- `assertThrows` → `expect().toThrow()`
- `assertThrowsAsync` → `expect().rejects.toThrow()`
- And many more...

### Test Pattern Library

Pre-built patterns for common testing scenarios:

- **Basic Tests**: Simple equality and existence checks
- **Async Tests**: Promise-based and async/await patterns
- **Mock Tests**: Function mocking and spying
- **Integration Tests**: Complex multi-component testing
- **Performance Tests**: Benchmarking and timing validation

### Async Test Handler

Specialized handling for asynchronous test patterns:

- **Promise Conversion**: Callback → Promise → async/await
- **Error Handling**: Rejection testing and error propagation
- **Performance Testing**: Timeout and throughput validation
- **Concurrency**: Parallel execution patterns

## Features

### ✅ Complete Deno Test Conversion
- Handles all common Deno test patterns
- Preserves test semantics and structure
- Maintains code readability and organization

### ✅ TypeScript Support
- Full TypeScript compilation and type checking
- ES module compatibility
- Modern JavaScript features

### ✅ Quality Validation
- Automated code quality checks
- Semantic preservation validation
- Performance benchmarking

### ✅ Error Handling
- Comprehensive error reporting
- Conversion warnings and suggestions
- Detailed diagnostic information

## Usage Examples

### Basic Conversion

```typescript
// Input: Deno test
const denoCode = `
Deno.test("should add numbers", () => {
  const result = add(2, 3);
  assertEquals(result, 5);
});`;

// Output: Jest test
const jestCode = `
describe('should add numbers', () => {
  it('should pass', () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });
});`;
```

### Async Conversion

```typescript
// Input: Deno async test
const denoAsyncCode = `
Deno.test("should fetch data", async () => {
  const data = await fetchData();
  assertEquals(data.status, "success");
});`;

// Output: Jest async test
const jestAsyncCode = `
describe('should fetch data', () => {
  it('should pass', async () => {
    const data = await fetchData();
    expect(data.status).toBe("success");
  });
});`;
```

### Error Handling Conversion

```typescript
// Input: Deno error test
const denoErrorCode = `
Deno.test("should throw error", () => {
  assertThrows(() => {
    throw new Error("test");
  }, Error);
});`;

// Output: Jest error test
const jestErrorCode = `
describe('should throw error', () => {
  it('should pass', () => {
    expect(() => {
      throw new Error("test");
    }).toThrow(Error);
  });
});`;
```

## Configuration

### Jest Configuration

The migration tests use a dedicated Jest configuration optimized for migration testing:

```javascript
// migration-tests/jest.config.js
export default {
  displayName: 'Migration Tests',
  testMatch: ["<rootDir>/migration-tests/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/migration-tests/setup.js"],
  testTimeout: 90000,
  // ... other migration-specific settings
};
```

### Environment Setup

The setup file provides migration-specific globals and utilities:

```javascript
// migration-tests/setup.js
global.migrationUtils = {
  assertEquals: (actual, expected) => expect(actual).toBe(expected),
  assertExists: (value) => {
    expect(value).toBeDefined();
    expect(value).not.toBeNull();
  },
  // ... other migration utilities
};
```

## Best Practices

### 1. Start Simple
Begin with basic test conversions before moving to complex scenarios.

### 2. Validate Frequently
Use the validation utilities to ensure conversion quality.

### 3. Test Incrementally
Convert and test small batches of tests rather than entire suites.

### 4. Maintain Structure
Preserve the original test organization and naming conventions.

### 5. Document Changes
Keep track of conversion decisions and any manual adjustments needed.

## Troubleshooting

### Common Issues

1. **Module Resolution**: Ensure import paths are correctly mapped
2. **Async Patterns**: Verify async/await usage is consistent
3. **Assertion Mapping**: Check that all Deno assertions are converted
4. **Type Errors**: Ensure TypeScript types are properly imported

### Debugging

```bash
# Run with verbose output
npm test -- --testPathPattern="migration-tests" --verbose

# Run specific test with debugging
npm test -- --testNamePattern="your-test-name" --detectOpenHandles

# Check TypeScript compilation
npx tsc --noEmit --project tsconfig.json
```

## Contributing

When adding new migration utilities or patterns:

1. Add comprehensive tests in the `validation/` directory
2. Update the pattern library with new examples
3. Document any new assertion mappings
4. Ensure TypeScript compatibility
5. Update this README with new features

## Support

For migration assistance or questions:

1. Check the validation test output for guidance
2. Review the pattern library for similar examples
3. Use the conversion utilities for automated help
4. Consult the comprehensive assertion mapping guide

---

**Status**: ✅ Ready for Production Use
**Last Updated**: 2025-07-20
**Framework Version**: 2.0.0-alpha.50
