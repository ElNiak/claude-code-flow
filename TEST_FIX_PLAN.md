# 🧪 Claude-Flow Test Suite Fix Plan

## 📊 Executive Summary

This document outlines a comprehensive plan to fix the failing test suite in the claude-flow repository. Currently, **100% of tests are failing** due to a critical runtime environment mismatch between Deno and Node.js.

**Key Metrics:**
- 📁 **52+ test files** affected
- 🚨 **0% test success rate**
- ⏱️ **7-12 days** estimated fix time
- 🎯 **100% test execution** target outcome

## 🔍 Root Cause Analysis

### 1. **Runtime Environment Mismatch (Critical)**
- **Issue**: Tests written for Deno runtime but project configured for Node.js/Jest
- **Evidence**: All test files import from `https://deno.land/std@0.220.0/` URLs
- **Impact**: Complete test suite failure
- **Example Error**: `Cannot find module 'https://deno.land/std@0.220.0/testing/bdd.ts'`

### 2. **Module Resolution Conflicts**
- **Issue**: Jest cannot resolve Deno-style URL imports
- **Files Affected**: All `.test.ts` and `.test.js` files
- **Root Cause**: Incompatible import syntax between runtimes

### 3. **Test Environment Teardown Issues**
- **Issue**: Jest environment teardown causing cascading failures
- **Error Pattern**: `You are trying to import a file after the Jest environment has been torn down`
- **Impact**: Tests cannot complete execution

### 4. **Mixed Runtime Dependencies**
- **Issue**: Test utilities use Deno APIs in Node.js environment
- **Problematic APIs**: `Deno.makeTempDir`, `Deno.Command`, `Deno.writeTextFile`
- **Files**: `tests/test.utils.ts`, `tests/test.config.ts`

### 5. **Import Path Inconsistencies**
- **Issue**: Incorrect relative paths and file extensions
- **Example**: Importing `.ts` files instead of `.js` in Node.js environment
- **Impact**: Module resolution failures

## 🛠️ Comprehensive Fix Strategy

### Phase 1: Critical Infrastructure Fixes (Priority: HIGH)

#### 1.1 Runtime Strategy Decision
**Recommendation: Migrate to Node.js/Jest**
- ✅ Consistent with package.json configuration
- ✅ Better CI/CD integration
- ✅ Existing Jest setup can be leveraged
- ✅ More mature tooling ecosystem

#### 1.2 Test Utilities Conversion
**File**: `tests/test.utils.ts`

**Deno → Node.js API Mapping:**
```typescript
// File Operations
Deno.makeTempDir() → fs.mkdtempSync(path.join(os.tmpdir(), 'claude-flow-'))
Deno.writeTextFile() → fs.writeFileSync()
Deno.readTextFile() → fs.readFileSync()

// Process Management
Deno.Command() → child_process.spawn()
Deno.env.get() → process.env

// Path Operations
Deno.cwd() → process.cwd()
```

#### 1.3 Import Statement Standardization
**Pattern**: Convert all Deno imports to Node.js equivalents

```typescript
// BEFORE (Deno style)
import { describe, it, beforeEach } from "https://deno.land/std@0.220.0/testing/bdd.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";

// AFTER (Node.js/Jest style)
import { describe, it, beforeEach, expect } from '@jest/globals';
```

### Phase 2: Test Configuration Updates (Priority: HIGH)

#### 2.1 Jest Configuration Enhancement
**File**: `jest.config.js`

**Required Updates:**
```javascript
export default {
  // Enhanced module name mapping
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Better transform handling
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|inquirer|nanoid|fs-extra|ansi-styles|ruv-swarm)/)'
  ],

  // Improved test environment
  testEnvironment: 'node',

  // Enhanced setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Better timeout handling
  testTimeout: 30000
};
```

#### 2.2 Jest Setup File Fix
**File**: `jest.setup.js`

**Current Issues:**
- Import from `src/core/logger.js` causing module resolution conflicts
- Missing proper test environment initialization

**Solution:**
```javascript
// Set test environment flags
process.env.CLAUDE_FLOW_ENV = 'test';
process.env.NODE_ENV = 'test';

// Mock external dependencies that cause issues
jest.mock('better-sqlite3', () => ({
  default: jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    }),
    close: jest.fn()
  }))
}));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### Phase 3: Assertion Library Migration (Priority: MEDIUM)

#### 3.1 Assertion Mapping Strategy
**Complete mapping from Deno to Jest:**

| Deno Assertion | Jest Equivalent | Usage Example |
|----------------|-----------------|---------------|
| `assertEquals(a, b)` | `expect(a).toBe(b)` | Exact equality |
| `assertExists(value)` | `expect(value).toBeDefined()` | Existence check |
| `assertGreater(a, b)` | `expect(a).toBeGreaterThan(b)` | Numerical comparison |
| `assertThrows(() => fn())` | `expect(() => fn()).toThrow()` | Exception testing |
| `assertRejects(promise)` | `expect(promise).rejects.toThrow()` | Async exception testing |
| `assert(condition)` | `expect(condition).toBeTruthy()` | Boolean assertion |

#### 3.2 Mock and Spy Migration
```typescript
// BEFORE (Deno style)
import { spy, stub, assertSpyCall } from 'https://deno.land/std@0.220.0/testing/mock.ts';

// AFTER (Jest style)
import { jest } from '@jest/globals';

// Usage changes:
const mockFn = jest.fn();
expect(mockFn).toHaveBeenCalledWith(expectedArgs);
```

### Phase 4: File-by-File Conversion (Priority: MEDIUM)

#### 4.1 Conversion Priority Order
1. **Test utilities** (`tests/test.utils.ts`) - Foundation
2. **Unit tests** (`tests/unit/**/*.test.ts`) - Core functionality
3. **Integration tests** (`tests/integration/**/*.test.ts`) - System tests
4. **E2E tests** (`tests/e2e/**/*.test.ts`) - End-to-end validation
5. **Performance tests** (`tests/performance/**/*.test.ts`) - Benchmarking

#### 4.2 Automated Conversion Scripts
**Create conversion utilities:**

```bash
# Script 1: Import converter
scripts/convert-imports.js

# Script 2: Assertion converter
scripts/convert-assertions.js

# Script 3: Path fixer
scripts/fix-paths.js

# Script 4: Validation runner
scripts/validate-conversion.js
```

### Phase 5: Source Code Import Fixes (Priority: LOW)

#### 5.1 Import Path Standardization
**Pattern**: Fix relative import paths and extensions

```typescript
// Common issues to fix:
import { ConfigManager } from '../../../src/core/config.ts';
// Should be:
import { ConfigManager } from '../../../src/core/config.js';

// Or with alias:
import { ConfigManager } from '@/core/config.js';
```

#### 5.2 Template Test Updates
**Files**: Tests in `src/templates/` directory
- Update to use Node.js file operations
- Fix import statements
- Ensure Jest compatibility

## 📋 Implementation Checklist

### Phase 1: Infrastructure (Days 1-3)
- [ ] Update `tests/test.utils.ts` for Node.js compatibility
- [ ] Convert Deno APIs to Node.js equivalents
- [ ] Fix `jest.setup.js` configuration issues
- [ ] Test core utilities functionality

### Phase 2: Configuration (Day 4)
- [ ] Enhance `jest.config.js` with proper mappings
- [ ] Update package.json test scripts
- [ ] Configure CI/CD for new test setup
- [ ] Validate Jest environment

### Phase 3: Bulk Conversion (Days 5-8)
- [ ] Convert all import statements (52+ files)
- [ ] Migrate assertion libraries
- [ ] Update mock and spy usage
- [ ] Fix relative import paths

### Phase 4: Validation (Days 9-10)
- [ ] Run unit tests and fix issues
- [ ] Run integration tests and fix issues
- [ ] Run e2e tests and fix issues
- [ ] Performance test validation

### Phase 5: Polish (Days 11-12)
- [ ] Fix remaining edge cases
- [ ] Update documentation
- [ ] Add test coverage reporting
- [ ] Final validation and cleanup

## 🔧 Conversion Scripts

### 1. Import Converter Script
```javascript
// scripts/convert-imports.js
const fs = require('fs');
const path = require('path');

const DENO_TO_JEST_IMPORTS = {
  "https://deno.land/std@0.220.0/testing/bdd.ts": "@jest/globals",
  "https://deno.land/std@0.220.0/assert/mod.ts": "@jest/globals",
  "https://deno.land/std@0.220.0/testing/mock.ts": "@jest/globals"
};

function convertImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  Object.entries(DENO_TO_JEST_IMPORTS).forEach(([denoImport, jestImport]) => {
    const regex = new RegExp(`from\\s+['"]${denoImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    content = content.replace(regex, `from '${jestImport}'`);
  });

  fs.writeFileSync(filePath, content);
}
```

### 2. Assertion Converter Script
```javascript
// scripts/convert-assertions.js
const ASSERTION_MAPPINGS = {
  'assertEquals(': 'expect(',
  'assertExists(': 'expect(',
  'assertGreater(': 'expect(',
  'assertThrows(': 'expect(',
  'assertRejects(': 'expect('
};

function convertAssertions(content) {
  Object.entries(ASSERTION_MAPPINGS).forEach(([denoAssertion, jestStart]) => {
    // Complex regex replacements for each assertion type
    content = content.replace(new RegExp(denoAssertion, 'g'), jestStart);
  });
  return content;
}
```

## 📊 Success Metrics

### Pre-Implementation (Current State)
- ❌ Test execution rate: 0%
- ❌ Passing tests: 0
- ❌ CI/CD pipeline: Broken
- ❌ Code coverage: Unmeasurable

### Post-Implementation (Target State)
- ✅ Test execution rate: 100%
- ✅ Passing tests: Target 90%+
- ✅ CI/CD pipeline: Functional
- ✅ Code coverage: Measurable and reportable

### Validation Criteria
1. **All test files can be imported without errors**
2. **Jest can discover and run all test suites**
3. **No runtime environment conflicts**
4. **Assertion failures are meaningful and clear**
5. **CI/CD pipeline executes tests successfully**

## 🚀 Rollout Strategy

### Development Phase
1. Create feature branch: `fix/test-suite-migration`
2. Implement changes incrementally
3. Test each phase before proceeding
4. Maintain detailed change log

### Testing Phase
1. Validate each converted test file individually
2. Run test suites in isolation
3. Perform integration testing
4. Load test the complete suite

### Deployment Phase
1. Create pull request with comprehensive documentation
2. Conduct code review
3. Merge to main branch
4. Update CI/CD configuration
5. Monitor test execution in production

## 📝 Risk Assessment

### High Risk
- **Runtime incompatibilities** - Mitigation: Thorough testing of Node.js alternatives
- **Breaking changes to source code** - Mitigation: Focus on test-only changes
- **Performance degradation** - Mitigation: Benchmark before/after

### Medium Risk
- **Time overrun** - Mitigation: Phased approach with clear milestones
- **Incomplete conversion** - Mitigation: Automated validation scripts
- **CI/CD disruption** - Mitigation: Feature branch testing

### Low Risk
- **Documentation gaps** - Mitigation: Comprehensive documentation updates
- **Developer workflow changes** - Mitigation: Clear migration guide

## 📚 Additional Resources

### Documentation Updates Required
- [ ] Update README.md testing section
- [ ] Create test development guide
- [ ] Document new test utilities
- [ ] Update CI/CD documentation

### Training Materials
- [ ] Node.js vs Deno testing differences
- [ ] Jest best practices guide
- [ ] Test migration checklist
- [ ] Troubleshooting guide

## 🎯 Conclusion

This comprehensive plan addresses all identified issues in the claude-flow test suite through a systematic, phased approach. The migration from Deno to Node.js/Jest will restore full test functionality and enable reliable CI/CD operations.

**Expected Timeline**: 7-12 days for complete implementation
**Success Rate**: 100% test execution capability
**Impact**: Restored development velocity and code quality assurance

---

*This plan will be executed on the `fix/test-suite-migration` branch with regular progress updates and validation checkpoints.*
