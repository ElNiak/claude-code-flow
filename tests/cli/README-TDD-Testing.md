# TDD Testing Infrastructure for Claude Flow CLI Commands

## Overview

This directory contains a comprehensive Test-Driven Development (TDD) infrastructure specifically designed for testing Claude Flow CLI commands. The testing approach follows the red-green-refactor methodology to ensure high-quality, well-tested command implementations.

## Directory Structure

```
tests/cli/
├── commands/                    # Unit tests for individual commands
│   ├── hive-mind-tdd-comprehensive.test.js
│   └── hive-mind-functionality.test.js
├── integration/                 # Integration tests for workflows
│   └── hive-mind-workflows.test.js
├── utils/                      # Test utilities and helpers
│   └── cli-test-utilities.js
├── scripts/                    # TDD automation scripts
│   └── run-tdd-cycle.js
└── README-TDD-Testing.md       # This documentation
```

## TDD Methodology Implementation

### 🔴 RED Phase - Write Failing Tests First

The RED phase involves writing tests that define the desired behavior before implementing the functionality. All tests should fail initially.

**Characteristics:**
- Tests are marked with `FAILING:` prefix
- Tests use `🔴 RED PHASE` describe blocks
- Tests define expected behavior that doesn't exist yet
- All assertions should fail when run against unimplemented code

**Example:**
```javascript
describe('🔴 RED PHASE - Main Command Function (Should FAIL Initially)', () => {
  test('FAILING: hiveMindCommand should handle empty args array', async () => {
    await hiveMindCommand([], {});

    // Should display help when no subcommand provided
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('🧠 Claude Flow Hive Mind System')
    );
  });
});
```

### 🟢 GREEN Phase - Implement Minimal Code

The GREEN phase involves writing the minimal amount of code necessary to make the failing tests pass.

**Characteristics:**
- Focus on making tests pass, not perfection
- Implement only what's needed for current tests
- Don't add functionality not covered by tests
- Tests transition from `FAILING:` to `PASSING:`

### 🔵 REFACTOR Phase - Improve Code Quality

The REFACTOR phase improves code quality while maintaining passing tests.

**Characteristics:**
- Improve readability and maintainability
- Remove duplication
- Enhance performance
- Better design patterns
- All tests must remain green

## Test Categories

### 1. Unit Tests (`commands/`)

Test individual command functions in isolation:

- **Main command routing** - How commands parse arguments and route to subcommands
- **Subcommand functionality** - Each subcommand's specific behavior
- **Error handling** - How commands handle invalid inputs and error conditions
- **Flag processing** - How command-line flags modify behavior
- **Help system** - Command help generation and display

### 2. Integration Tests (`integration/`)

Test complete workflows and cross-command interactions:

- **Multi-command workflows** - Sequences of commands working together
- **Database interactions** - Commands interacting with persistent storage
- **Agent coordination** - How commands coordinate multiple agents
- **Memory system integration** - Commands using shared memory
- **Performance scenarios** - Commands under load and stress

### 3. Test Utilities (`utils/`)

Reusable testing infrastructure:

- **MockDatabaseFactory** - Creates consistent database mocks
- **ConsoleCapture** - Captures and analyzes console output
- **CLITestRunner** - Executes CLI commands in controlled environment
- **TestFixtures** - Realistic test data for various scenarios
- **MockInquirer** - Interactive prompt mocking
- **TDDTestHelper** - TDD methodology validation utilities

## Running TDD Tests

### Automated TDD Cycle

Use the TDD cycle runner to orchestrate the complete red-green-refactor cycle:

```bash
# Run the complete TDD cycle
node tests/cli/scripts/run-tdd-cycle.js

# The script will:
# 1. Discover TDD test files
# 2. Validate test structure
# 3. Run RED phase (expect failures)
# 4. Prompt for implementation
# 5. Run GREEN phase (expect passes)
# 6. Prompt for refactoring
# 7. Run REFACTOR phase (ensure still passing)
# 8. Generate final report
```

### Manual Test Execution

Run specific test phases manually:

```bash
# Run only failing tests (RED phase)
npm test -- --testNamePattern="FAILING|RED PHASE" tests/cli/

# Run all TDD tests
npm test -- --testMatch="**/*tdd*.test.js"

# Run specific test file
npm test tests/cli/commands/hive-mind-tdd-comprehensive.test.js

# Run with coverage
npm test -- --coverage tests/cli/
```

### Development Workflow

1. **Start with RED** - Write failing tests that define requirements
2. **Move to GREEN** - Implement minimal code to pass tests
3. **Apply REFACTOR** - Improve code quality while keeping tests green
4. **Repeat cycle** - Add more tests and continue the cycle

## Test Patterns and Best Practices

### 1. Test Naming Convention

```javascript
// RED Phase tests (should fail initially)
test('FAILING: should handle empty input gracefully', async () => {

// GREEN Phase tests (should pass after implementation)
test('PASSING: should handle empty input gracefully', async () => {

// REFACTOR Phase tests (should still pass after refactoring)
test('REFACTORED: should handle empty input gracefully', async () => {
```

### 2. Mock Setup Pattern

```javascript
beforeEach(async () => {
  // Reset all mocks
  jest.clearAllMocks();

  // Set up fresh mocks for each test
  mockDatabase = MockDatabaseFactory.create(initialData);
  mockInquirer = new MockInquirer();

  // Import after mocking (ES modules)
  const module = await import('../../../src/cli/simple-commands/hive-mind.js');
  commandFunction = module.hiveMindCommand;
});
```

### 3. Console Output Testing

```javascript
test('should display proper help output', async () => {
  const consoleCapture = new ConsoleCapture();
  consoleCapture.start();

  await commandFunction(['help'], {});

  consoleCapture.stop();
  const output = consoleCapture.getOutput();

  expect(output.logs.join('\n')).toContain('Usage:');
  expect(output.errors).toHaveLength(0);
});
```

### 4. Database Interaction Testing

```javascript
test('should store data correctly', async () => {
  const mockDatabase = MockDatabaseFactory.create();

  await commandFunction(['store'], { key: 'test', value: 'data' });

  expect(mockDatabase.prepare).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO')
  );
  expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
    expect.objectContaining({
      key: 'test',
      value: 'data'
    })
  );
});
```

### 5. Error Handling Testing

```javascript
test('should handle database errors gracefully', async () => {
  mockDatabase.__setError(new Error('Connection failed'));

  await commandFunction(['status'], {});

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('Database error')
  );
});
```

## Test Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 90% line coverage, 85% branch coverage
- **Integration Tests**: 80% workflow coverage
- **Error Handling**: 95% error path coverage
- **CLI Flag Combinations**: 100% flag combination coverage

### Coverage Areas

1. **Command Routing** - All subcommands and argument combinations
2. **Flag Processing** - All command-line flags and their interactions
3. **Error Scenarios** - Database errors, invalid inputs, network failures
4. **Interactive Flows** - Wizard modes, prompts, confirmations
5. **Integration Points** - MCP integration, agent spawning, memory systems

## Continuous Integration

### Pre-commit Hooks

```bash
# Run TDD validation before commits
npm run test:tdd-validation

# Ensure all tests follow TDD methodology
npm run test:tdd-compliance
```

### CI Pipeline Steps

1. **TDD Structure Validation** - Verify tests follow TDD patterns
2. **RED Phase Validation** - Ensure failing tests actually fail
3. **Coverage Analysis** - Check test coverage meets requirements
4. **Integration Testing** - Run complete workflow tests
5. **Performance Testing** - Validate under load conditions

## Adding New TDD Tests

### 1. Create Test File

```bash
# Create new TDD test file
touch tests/cli/commands/new-command-tdd.test.js
```

### 2. Follow TDD Structure

```javascript
describe('🔴 RED PHASE - New Command Tests (Should FAIL Initially)', () => {
  test('FAILING: should handle basic functionality', async () => {
    // Write test that defines desired behavior
    // This should fail initially
  });
});
```

### 3. Use Test Utilities

```javascript
import { CLITestRunner, TestFixtures, MockDatabaseFactory } from '../utils/cli-test-utilities.js';

// Use provided utilities for consistent testing
const runner = new CLITestRunner(commandFunction);
const mockDb = MockDatabaseFactory.create(TestFixtures.agents);
```

### 4. Validate TDD Compliance

```bash
# Run TDD cycle to ensure proper methodology
node tests/cli/scripts/run-tdd-cycle.js
```

## Debugging Test Issues

### Common Issues and Solutions

1. **Tests Pass in RED Phase**
   - Check if implementation already exists
   - Verify test is actually testing the right behavior
   - Ensure mocks are properly reset

2. **Tests Fail in GREEN Phase**
   - Implementation doesn't match test expectations
   - Mock setup is incorrect
   - Async/await issues in test or implementation

3. **Tests Fail in REFACTOR Phase**
   - Refactoring broke existing functionality
   - Need to update tests to match refactored interface
   - Logic errors introduced during refactoring

### Debug Commands

```bash
# Run tests with debug output
npm test -- --verbose --no-cache tests/cli/

# Run single test with debugging
npm test -- --testNamePattern="specific test name" --verbose

# Enable Jest debugging
node --inspect-brk node_modules/.bin/jest tests/cli/
```

## Performance Considerations

### Test Execution Performance

- **Parallel Execution** - Tests run in parallel where possible
- **Mock Optimization** - Lightweight mocks for fast execution
- **Database Mocking** - In-memory SQLite for database tests
- **Process Spawning** - Mock child processes to avoid overhead

### Load Testing Integration

```javascript
test('FAILING: should handle high load scenarios', async () => {
  const loadTest = PerformanceTestHelper.createLoadTest(
    () => commandFunction(['status'], {}),
    100 // iterations
  );

  const results = await loadTest();

  expect(results.successful).toBe(100);
  expect(results.avgTime).toBeLessThan(100); // ms
});
```

## Future Enhancements

### Planned Improvements

1. **Visual TDD Dashboard** - Web interface showing TDD cycle progress
2. **Automated Code Generation** - Generate boilerplate from failing tests
3. **Test Quality Metrics** - Analyze test effectiveness and maintainability
4. **Integration with IDE** - TDD workflow integration in development environment
5. **Mutation Testing** - Verify test quality through code mutation

### Contributing

When adding new CLI commands or features:

1. Start with TDD methodology
2. Write comprehensive failing tests first
3. Implement minimal working code
4. Refactor for quality and maintainability
5. Ensure all tests remain green
6. Update documentation and examples

---

This TDD infrastructure ensures that Claude Flow CLI commands are well-tested, maintainable, and follow best practices for command-line interface development.
