# Test Migration Infrastructure

## Overview

This directory contains the comprehensive test migration infrastructure for converting Deno tests to Jest. The system provides automated migration, validation, and documentation tools.

## Directory Structure

```
tests/migrated/
├── unit/                    # Migrated unit tests
├── integration/             # Migrated integration tests
├── e2e/                     # Migrated end-to-end tests
├── utils/                   # Migration utilities and helpers
│   └── migration-helpers.ts # Test utilities and compatibility layer
├── README.md               # This file
├── migration-report.json   # Migration execution report
├── validation-report.json  # Validation results
└── MIGRATION_REPORT.md     # Human-readable migration report
```

## Migration Scripts

### Core Migration Engine
- **`scripts/migrate-tests.js`** - Main migration infrastructure
  - Comprehensive Deno.test to Jest conversion
  - Automated assertion mapping
  - Import transformation
  - Batch processing capabilities
  - Rollback support

### Specialized Migrators
- **`scripts/migrate-unit-tests.js`** - Unit test specialized migration
  - Mock/spy pattern conversion
  - Jest assertion mapping
  - Enhanced unit test patterns

- **`scripts/migrate-integration-tests.js`** - Integration test migration
  - Async pattern conversion
  - File operation transformation
  - Extended timeout handling

### Validation System
- **`scripts/validate-migrated-tests.js`** - Comprehensive validation
  - Syntax validation
  - Jest compatibility checks
  - Test execution validation
  - Report generation

## Migration Utilities

### Migration Helpers (`utils/migration-helpers.ts`)

#### Assertion Compatibility Layer
```typescript
import { MigrationAssertions } from './utils/migration-helpers.js';

// Deno-style assertions that work with Jest
MigrationAssertions.assertEquals(actual, expected);
MigrationAssertions.assertExists(value);
MigrationAssertions.assertRejects(promise);
```

#### Test Environment Utilities
```typescript
import { MigrationTestEnv } from './utils/migration-helpers.js';

// Setup test environment
MigrationTestEnv.setup();

// Create temporary directories
const tempDir = MigrationTestEnv.createTempDir();

// Mock environment variables
MigrationTestEnv.mockEnv({ NODE_ENV: 'test' });
```

#### Async Test Utilities
```typescript
import { AsyncTestUtils } from './utils/migration-helpers.js';

// Wait for conditions
await AsyncTestUtils.waitFor(() => condition, 5000);

// Create deferred promises
const { promise, resolve, reject } = AsyncTestUtils.createDeferred();
```

#### Mock Factory
```typescript
import { MockFactory } from './utils/migration-helpers.js';

// Create mock objects
const mockAgent = MockFactory.createMockAgent();
const mockTask = MockFactory.createMockTask();
const mockLogger = MockFactory.createMockLogger();
```

## Usage

### Complete Migration
```bash
# Run complete migration
node scripts/migrate-tests.js

# Dry run to preview changes
node scripts/migrate-tests.js --dry-run

# Verbose output
node scripts/migrate-tests.js --verbose
```

### Specialized Migration
```bash
# Migrate only unit tests
node scripts/migrate-unit-tests.js

# Migrate only integration tests
node scripts/migrate-integration-tests.js
```

### Validation
```bash
# Validate migrated tests
node scripts/validate-migrated-tests.js

# Verbose validation
node scripts/validate-migrated-tests.js --verbose
```

### Rollback
```bash
# Rollback migration if needed
node scripts/migrate-tests.js --rollback
```

## Migration Process

### 1. Pre-Migration Setup
- Creates target directory structure
- Ensures Jest configuration
- Prepares backup directories

### 2. Test Discovery
- Recursively finds test files
- Identifies Deno test patterns
- Categorizes by test type

### 3. Content Conversion
- **Import Transformation**: Converts Deno imports to Jest imports
- **Test Declaration**: Converts `Deno.test()` to `describe()/it()`
- **Assertion Mapping**: Maps Deno assertions to Jest expectations
- **Mock Conversion**: Transforms Deno mocks to Jest mocks
- **Async Handling**: Proper async/await pattern conversion

### 4. Validation
- Syntax checking with TypeScript compiler
- Jest compatibility verification
- Test execution dry-run
- Report generation

### 5. Documentation
- Generates migration reports
- Creates validation summaries
- Provides recommendations

## Conversion Patterns

### Test Declarations
```typescript
// Before (Deno)
Deno.test("should test something", async () => {
  // test code
});

// After (Jest)
it("should test something", async () => {
  // test code
});
```

### Assertions
```typescript
// Before (Deno)
assertEquals(actual, expected);
assertExists(value);
assertRejects(promise);

// After (Jest)
expect(actual).toBe(expected);
expect(value).toBeDefined();
await expect(promise).rejects.toThrow();
```

### Imports
```typescript
// Before (Deno)
import { assertEquals } from "https://deno.land/std@0.200.0/testing/asserts.ts";

// After (Jest)
import { expect } from '@jest/globals';
```

### File Operations
```typescript
// Before (Deno)
const tempDir = await Deno.makeTempDir();
const content = await Deno.readTextFile(filePath);

// After (Node.js/Jest)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
const content = fs.readFileSync(filePath, 'utf-8');
```

## Configuration

### Jest Configuration
The migration system automatically updates `jest.config.js` to include migrated tests:

```javascript
module.exports = {
  testMatch: [
    '<rootDir>/tests/migrated/**/*.test.ts',
    '<rootDir>/tests/migrated/**/*.test.js'
  ],
  // ... other configurations
};
```

### Migration Options
```javascript
const migrator = new TestMigrationEngine({
  sourceDir: './tests',           // Source directory
  targetDir: './tests/migrated',  // Target directory
  backupDir: './tests/backup'     // Backup directory
});
```

## Best Practices

### Migration Workflow
1. **Backup**: Always backup original tests before migration
2. **Dry Run**: Test migration with `--dry-run` first
3. **Incremental**: Migrate test types separately if needed
4. **Validate**: Run validation after migration
5. **Test**: Execute migrated tests with Jest
6. **Review**: Manual review of complex conversions

### Manual Review Required
Some patterns may require manual review:
- Complex async patterns
- Custom assertion functions
- Platform-specific code
- Complex mock setups
- File system operations

### Error Handling
- Check migration reports for conversion statistics
- Review validation errors and warnings
- Fix syntax errors before test execution
- Update imports if needed

## Troubleshooting

### Common Issues

#### Import Errors
```bash
# Fix: Update import paths
import { expect } from '@jest/globals';
import { MigrationAssertions } from '../utils/migration-helpers.js';
```

#### Async Test Timeouts
```javascript
// Fix: Add timeout configuration
jest.setTimeout(30000);
```

#### Missing Assertions
```javascript
// Fix: Use compatibility layer
import { assertEquals } from '../utils/migration-helpers.js';
```

#### File Operation Errors
```javascript
// Fix: Update to Node.js APIs
import fs from 'fs';
import path from 'path';
import os from 'os';
```

### Support Commands
```bash
# Check Jest installation
npm list jest

# Run specific test file
npx jest tests/migrated/unit/example.test.js

# Debug test execution
npx jest --debug tests/migrated/

# Coverage report
npx jest --coverage tests/migrated/
```

## Migration Reports

### Migration Report (`migration-report.json`)
- Migration statistics
- File conversion details
- Error tracking
- Performance metrics

### Validation Report (`validation-report.json`)
- Validation results
- Error/warning details
- Recommendations
- Success metrics

## Integration with Jest Framework

The migration infrastructure integrates seamlessly with the existing Jest setup:
- Uses existing Jest configuration
- Leverages test utilities
- Maintains coverage reporting
- Supports watch mode
- Compatible with CI/CD pipelines

## Future Enhancements

- **Smart Pattern Recognition**: Enhanced detection of complex patterns
- **Custom Rule Engine**: Configurable conversion rules
- **IDE Integration**: Plugin support for popular editors
- **Performance Optimization**: Faster processing for large test suites
- **Advanced Validation**: Semantic validation beyond syntax

## Contributing

To enhance the migration infrastructure:
1. Add new conversion patterns to the appropriate migrator
2. Extend validation rules in the validator
3. Update migration helpers with new utilities
4. Document new patterns in this README
5. Add test cases for new functionality

---

**Created by**: Test Migration Infrastructure Agent
**Last Updated**: 2025-07-20
**Version**: 1.0.0
