#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Debug Logging Implementation
 * London School TDD approach with >95% coverage validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  requiredCoverage: 95,
  testTimeout: 30000,
  maxWorkers: 1, // Sequential execution for deterministic results
  retries: 2,
  verbose: true
};

// Test suites to execute
const TEST_SUITES = [
  {
    name: 'Unit Tests - Debug Logger Core',
    pattern: 'tests/unit/debug/debug-logger*.test.ts',
    timeout: 10000,
    critical: true
  },
  {
    name: 'Unit Tests - Memory Pressure Simulation',
    pattern: 'tests/unit/debug/memory-pressure-simulation.test.ts',
    timeout: 15000,
    critical: true
  },
  {
    name: 'Unit Tests - Performance Regression',
    pattern: 'tests/unit/debug/performance-regression-london-school.test.ts',
    timeout: 20000,
    critical: true
  },
  {
    name: 'Unit Tests - Security Validation',
    pattern: 'tests/unit/debug/security-validation-london-school.test.ts',
    timeout: 15000,
    critical: true
  },
  {
    name: 'Unit Tests - Emergency Mode & Circuit Breaker',
    pattern: 'tests/unit/debug/emergency-mode-circuit-breaker-london-school.test.ts',
    timeout: 15000,
    critical: true
  },
  {
    name: 'Integration Tests - Component Matrix',
    pattern: 'tests/integration/debug/component-integration-matrix-london-school.test.ts',
    timeout: 25000,
    critical: true
  },
  {
    name: 'Integration Tests - MCP Protocol Compliance',
    pattern: 'tests/integration/debug/mcp-protocol-compliance-london-school.test.ts',
    timeout: 20000,
    critical: true
  },
  {
    name: 'Validation Tests - Implementation Compliance',
    pattern: 'tests/validation/debug-implementation-validation.test.ts',
    timeout: 30000,
    critical: true
  }
];

// Console formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('');
  console.log('='.repeat(80));
  log(`  ${message}`, 'bright');
  console.log('='.repeat(80));
  console.log('');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// Test execution functions
async function runTestSuite(suite, options = {}) {
  const startTime = Date.now();

  logInfo(`Running: ${suite.name}`);
  logInfo(`Pattern: ${suite.pattern}`);

  try {
    const jestCommand = [
      'NODE_OPTIONS="--experimental-vm-modules"',
      'npx jest',
      `"${suite.pattern}"`,
      '--verbose',
      '--bail',
      `--maxWorkers=${options.maxWorkers || TEST_CONFIG.maxWorkers}`,
      `--testTimeout=${suite.timeout || TEST_CONFIG.testTimeout}`,
      '--forceExit',
      '--detectOpenHandles',
      options.coverage ? '--coverage' : '',
      options.verbose ? '--verbose' : ''
    ].filter(Boolean).join(' ');

    const output = execSync(jestCommand, {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    logSuccess(`${suite.name} - PASSED (${duration}ms)`);

    if (options.verbose) {
      console.log(output);
    }

    return {
      name: suite.name,
      pattern: suite.pattern,
      status: 'PASSED',
      duration,
      output,
      critical: suite.critical
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logError(`${suite.name} - FAILED (${duration}ms)`);

    if (error.stdout) {
      console.log('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.log('STDERR:', error.stderr);
    }

    return {
      name: suite.name,
      pattern: suite.pattern,
      status: 'FAILED',
      duration,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      critical: suite.critical
    };
  }
}

async function runCoverageAnalysis() {
  logInfo('Running comprehensive coverage analysis...');

  try {
    const coverageCommand = [
      'NODE_OPTIONS="--experimental-vm-modules"',
      'npx jest',
      '"tests/unit/debug/**/*.test.ts"',
      '"tests/integration/debug/**/*.test.ts"',
      '"tests/validation/**/*.test.ts"',
      '--coverage',
      '--coverageReporters=text',
      '--coverageReporters=lcov',
      '--coverageReporters=html',
      '--coverageDirectory=coverage/debug-implementation',
      `--coverageThreshold='{"global":{"branches":${TEST_CONFIG.requiredCoverage},"functions":${TEST_CONFIG.requiredCoverage},"lines":${TEST_CONFIG.requiredCoverage},"statements":${TEST_CONFIG.requiredCoverage}}}'`,
      '--maxWorkers=1',
      '--forceExit'
    ].join(' ');

    const output = execSync(coverageCommand, {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    logSuccess('Coverage analysis completed');
    console.log(output);

    // Extract coverage percentage from output
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    const coveragePercent = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

    return {
      status: 'SUCCESS',
      coveragePercent,
      output,
      meetsRequirement: coveragePercent >= TEST_CONFIG.requiredCoverage
    };

  } catch (error) {
    logError('Coverage analysis failed');
    console.log('Error:', error.message);

    return {
      status: 'FAILED',
      error: error.message,
      coveragePercent: 0,
      meetsRequirement: false
    };
  }
}

async function validateTestEnvironment() {
  logInfo('Validating test environment...');

  const checks = [
    {
      name: 'Node.js version',
      check: () => {
        const version = process.version;
        const majorVersion = parseInt(version.slice(1).split('.')[0]);
        return majorVersion >= 20;
      },
      errorMessage: 'Node.js version 20+ required'
    },
    {
      name: 'Jest installed',
      check: () => {
        try {
          execSync('npx jest --version', { stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      },
      errorMessage: 'Jest not available'
    },
    {
      name: 'TypeScript configuration',
      check: () => fs.existsSync('tsconfig.json'),
      errorMessage: 'tsconfig.json not found'
    },
    {
      name: 'Jest configuration',
      check: () => fs.existsSync('jest.config.js'),
      errorMessage: 'jest.config.js not found'
    },
    {
      name: 'London School helpers',
      check: () => fs.existsSync('tests/utils/london-school-test-helpers.ts'),
      errorMessage: 'London School test helpers not found'
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      if (check.check()) {
        logSuccess(check.name);
      } else {
        logError(`${check.name}: ${check.errorMessage}`);
        allPassed = false;
      }
    } catch (error) {
      logError(`${check.name}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

function generateTestReport(results, coverage) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd()
    },
    configuration: TEST_CONFIG,
    results: {
      totalSuites: results.length,
      passedSuites: results.filter(r => r.status === 'PASSED').length,
      failedSuites: results.filter(r => r.status === 'FAILED').length,
      criticalFailures: results.filter(r => r.status === 'FAILED' && r.critical).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    },
    coverage: coverage,
    suites: results
  };

  // Write report to file
  const reportPath = path.join(process.cwd(), 'test-reports', 'debug-implementation-test-report.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return { report, reportPath };
}

function displaySummary(results, coverage, reportPath) {
  logHeader('TEST EXECUTION SUMMARY');

  const totalSuites = results.length;
  const passedSuites = results.filter(r => r.status === 'PASSED').length;
  const failedSuites = results.filter(r => r.status === 'FAILED').length;
  const criticalFailures = results.filter(r => r.status === 'FAILED' && r.critical).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  log(`Total Test Suites: ${totalSuites}`, 'bright');
  log(`Passed: ${passedSuites}`, passedSuites === totalSuites ? 'green' : 'yellow');
  log(`Failed: ${failedSuites}`, failedSuites === 0 ? 'green' : 'red');
  log(`Critical Failures: ${criticalFailures}`, criticalFailures === 0 ? 'green' : 'red');
  log(`Total Duration: ${totalDuration}ms`, 'blue');

  console.log('');
  log('COVERAGE ANALYSIS:', 'bright');
  if (coverage.status === 'SUCCESS') {
    log(`Coverage: ${coverage.coveragePercent}%`, coverage.meetsRequirement ? 'green' : 'red');
    log(`Requirement: ${TEST_CONFIG.requiredCoverage}%`, 'blue');
    log(`Status: ${coverage.meetsRequirement ? 'MEETS REQUIREMENT' : 'BELOW REQUIREMENT'}`,
        coverage.meetsRequirement ? 'green' : 'red');
  } else {
    logError('Coverage analysis failed');
  }

  console.log('');
  log('INDIVIDUAL SUITE RESULTS:', 'bright');
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✓' : '✗';
    const color = result.status === 'PASSED' ? 'green' : 'red';
    const critical = result.critical ? ' [CRITICAL]' : '';
    log(`${status} ${result.name}${critical} (${result.duration}ms)`, color);
  });

  console.log('');
  log(`Full report saved to: ${reportPath}`, 'cyan');

  // Overall result
  const overallSuccess = failedSuites === 0 && coverage.meetsRequirement;
  console.log('');
  log('OVERALL RESULT: ' + (overallSuccess ? 'SUCCESS ✓' : 'FAILURE ✗'),
      overallSuccess ? 'green' : 'red');

  return overallSuccess;
}

// Main execution
async function main() {
  try {
    logHeader('DEBUG IMPLEMENTATION COMPREHENSIVE TEST SUITE');
    logInfo('London School TDD Methodology with >95% Coverage Requirement');
    console.log('');

    // Validate environment
    logHeader('ENVIRONMENT VALIDATION');
    const envValid = await validateTestEnvironment();

    if (!envValid) {
      logError('Environment validation failed. Please fix the issues above.');
      process.exit(1);
    }

    // Run test suites
    logHeader('EXECUTING TEST SUITES');
    const results = [];

    for (const suite of TEST_SUITES) {
      const result = await runTestSuite(suite, {
        verbose: false,
        maxWorkers: TEST_CONFIG.maxWorkers
      });
      results.push(result);

      // Stop on critical failure
      if (result.status === 'FAILED' && suite.critical) {
        logError(`Critical test suite failed: ${suite.name}`);
        logWarning('Stopping execution due to critical failure');
        break;
      }
    }

    // Run coverage analysis
    logHeader('COVERAGE ANALYSIS');
    const coverage = await runCoverageAnalysis();

    // Generate report
    logHeader('GENERATING REPORT');
    const { report, reportPath } = generateTestReport(results, coverage);
    logSuccess(`Test report generated: ${reportPath}`);

    // Display summary
    const success = displaySummary(results, coverage, reportPath);

    // Exit with appropriate code
    process.exit(success ? 0 : 1);

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  logWarning('Test execution interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logWarning('Test execution terminated');
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runTestSuite,
  runCoverageAnalysis,
  validateTestEnvironment,
  generateTestReport,
  TEST_CONFIG,
  TEST_SUITES
};
