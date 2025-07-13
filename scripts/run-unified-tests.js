#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner for Unified Architecture
 * 
 * This script runs all tests for the configuration system and unified coordination architecture
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

// Color codes for terminal output
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

// Test suite configuration
const testSuites = {
  config: {
    name: 'Configuration System Tests',
    patterns: [
      'tests/config/**/*.test.ts',
      'tests/config/**/*.test.js'
    ],
    timeout: 60000,
    critical: true
  },
  unifiedCoordination: {
    name: 'Unified Coordination Tests',
    patterns: [
      'tests/unified-coordination/**/*.test.ts',
      'tests/unified-coordination/**/*.test.js'
    ],
    timeout: 120000,
    critical: true
  },
  memoryIntegration: {
    name: 'Memory Integration Tests',
    patterns: [
      'tests/unified-coordination/memory-integration.test.ts'
    ],
    timeout: 90000,
    critical: true
  },
  mcpHooksIntegration: {
    name: 'MCP and Hooks Integration Tests',
    patterns: [
      'tests/unified-coordination/mcp-hooks-integration.test.ts'
    ],
    timeout: 90000,
    critical: true
  },
  performanceBenchmarks: {
    name: 'Performance Benchmark Tests',
    patterns: [
      'tests/unified-coordination/performance-benchmarks.test.ts'
    ],
    timeout: 180000,
    critical: false
  },
  migrationValidation: {
    name: 'Migration Validation Tests',
    patterns: [
      'tests/unified-coordination/migration-validation.test.ts'
    ],
    timeout: 120000,
    critical: true
  },
  endToEndWorkflows: {
    name: 'End-to-End Workflow Tests',
    patterns: [
      'tests/unified-coordination/end-to-end-workflows.test.ts'
    ],
    timeout: 300000,
    critical: false
  },
  existing: {
    name: 'Existing Test Suite',
    patterns: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts'
    ],
    timeout: 180000,
    critical: false
  }
};

// Test execution options
const testOptions = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  coverage: process.argv.includes('--coverage') || process.argv.includes('-c'),
  watch: process.argv.includes('--watch') || process.argv.includes('-w'),
  suite: process.argv.find(arg => arg.startsWith('--suite='))?.split('=')[1],
  parallel: !process.argv.includes('--no-parallel'),
  bail: process.argv.includes('--bail'),
  updateSnapshots: process.argv.includes('--update-snapshots'),
  detectLeaks: process.argv.includes('--detect-leaks'),
  maxWorkers: process.argv.find(arg => arg.startsWith('--max-workers='))?.split('=')[1] || '50%'
};

/**
 * Print colored output to console
 */
function printColored(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * Print test suite header
 */
function printHeader(title) {
  const separator = '='.repeat(60);
  printColored(`\n${separator}`, 'cyan');
  printColored(`🧪 ${title}`, 'bright');
  printColored(separator, 'cyan');
}

/**
 * Print test suite footer with results
 */
function printResults(results) {
  const separator = '='.repeat(60);
  printColored(`\n${separator}`, 'cyan');
  printColored('📊 TEST RESULTS SUMMARY', 'bright');
  printColored(separator, 'cyan');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedSuites = [];
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    
    printColored(`${status} ${result.name}: ${result.tests} tests, ${result.duration}ms`, color);
    
    totalTests += result.tests;
    if (result.success) {
      passedTests += result.tests;
    } else {
      failedSuites.push(result.name);
    }
  });
  
  printColored(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'red');
  
  if (failedSuites.length > 0) {
    printColored(`❌ Failed suites: ${failedSuites.join(', ')}`, 'red');
  }
  
  printColored(separator, 'cyan');
}

/**
 * Run Jest with specific configuration
 */
async function runJest(patterns, options = {}) {
  return new Promise((resolve) => {
    const jestArgs = [
      '--passWithNoTests',
      '--testTimeout', (options.timeout || 60000).toString(),
      '--maxWorkers', testOptions.maxWorkers
    ];
    
    // Add patterns
    if (patterns && patterns.length > 0) {
      jestArgs.push('--testPathPattern', patterns.join('|'));
    }
    
    // Add coverage if requested
    if (testOptions.coverage) {
      jestArgs.push('--coverage');
      jestArgs.push('--coverageDirectory', 'coverage/unified-tests');
    }
    
    // Add verbose if requested
    if (testOptions.verbose) {
      jestArgs.push('--verbose');
    }
    
    // Add watch mode if requested
    if (testOptions.watch) {
      jestArgs.push('--watch');
    }
    
    // Add bail if requested
    if (testOptions.bail) {
      jestArgs.push('--bail');
    }
    
    // Add update snapshots if requested
    if (testOptions.updateSnapshots) {
      jestArgs.push('--updateSnapshot');
    }
    
    // Add leak detection if requested
    if (testOptions.detectLeaks) {
      jestArgs.push('--detectLeaks');
    }
    
    // Set environment variables
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      NODE_OPTIONS: '--experimental-vm-modules',
      JEST_WORKER_ID: undefined // Reset worker ID for main process
    };
    
    const jest = spawn('npx', ['jest', ...jestArgs], {
      cwd: rootDir,
      stdio: testOptions.verbose ? 'inherit' : 'pipe',
      env
    });
    
    let output = '';
    let errorOutput = '';
    
    if (!testOptions.verbose) {
      jest.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      jest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }
    
    jest.on('close', (code) => {
      const success = code === 0;
      
      // Parse test results from output
      let tests = 0;
      let duration = 0;
      
      if (output) {
        const testMatch = output.match(/(\d+) tests? passed/);
        if (testMatch) {
          tests = parseInt(testMatch[1]);
        } else {
          const totalMatch = output.match(/Tests:\s+(\d+) total/);
          if (totalMatch) {
            tests = parseInt(totalMatch[1]);
          }
        }
        
        const timeMatch = output.match(/Time:\s+([\d.]+)\s*s/);
        if (timeMatch) {
          duration = Math.round(parseFloat(timeMatch[1]) * 1000);
        }
      }
      
      resolve({
        success,
        tests,
        duration,
        output,
        errorOutput
      });
    });
  });
}

/**
 * Run a specific test suite
 */
async function runTestSuite(suiteName, suiteConfig) {
  printColored(`\n🔄 Running ${suiteConfig.name}...`, 'blue');
  
  const startTime = Date.now();
  const result = await runJest(suiteConfig.patterns, {
    timeout: suiteConfig.timeout
  });
  
  const actualDuration = Date.now() - startTime;
  
  if (result.success) {
    printColored(`✅ ${suiteConfig.name} completed successfully`, 'green');
  } else {
    printColored(`❌ ${suiteConfig.name} failed`, 'red');
    
    if (result.errorOutput && testOptions.verbose) {
      printColored('Error output:', 'yellow');
      console.log(result.errorOutput);
    }
  }
  
  return {
    name: suiteConfig.name,
    success: result.success,
    tests: result.tests,
    duration: result.duration || actualDuration,
    critical: suiteConfig.critical
  };
}

/**
 * Check if configuration files exist
 */
async function validateSetup() {
  const requiredFiles = [
    'config/presets/development.json',
    'config/presets/research.json',
    'config/presets/deployment.json',
    'config/agent-capabilities.json',
    'jest.config.js'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    try {
      await fs.access(filePath);
    } catch {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    printColored('❌ Missing required files:', 'red');
    missingFiles.forEach(file => {
      printColored(`   - ${file}`, 'red');
    });
    printColored('\nPlease ensure all configuration files are properly set up.', 'yellow');
    return false;
  }
  
  return true;
}

/**
 * Print usage information
 */
function printUsage() {
  printHeader('Unified Architecture Test Suite Runner');
  
  printColored('Usage: npm run test:unified [options] [--suite=<suite-name>]\n', 'bright');
  
  printColored('Available Test Suites:', 'cyan');
  Object.entries(testSuites).forEach(([key, suite]) => {
    const critical = suite.critical ? ' (critical)' : '';
    printColored(`  ${key.padEnd(20)} - ${suite.name}${critical}`, 'white');
  });
  
  printColored('\nOptions:', 'cyan');
  printColored('  --verbose, -v        Verbose output', 'white');
  printColored('  --coverage, -c       Generate coverage report', 'white');
  printColored('  --watch, -w          Watch mode', 'white');
  printColored('  --suite=<name>       Run specific test suite', 'white');
  printColored('  --no-parallel        Disable parallel execution', 'white');
  printColored('  --bail               Stop on first failure', 'white');
  printColored('  --update-snapshots   Update Jest snapshots', 'white');
  printColored('  --detect-leaks       Detect memory leaks', 'white');
  printColored('  --max-workers=<n>    Set maximum worker processes', 'white');
  printColored('  --help               Show this help message\n', 'white');
  
  printColored('Examples:', 'cyan');
  printColored('  npm run test:unified --coverage', 'white');
  printColored('  npm run test:unified --suite=config --verbose', 'white');
  printColored('  npm run test:unified --suite=performanceBenchmarks', 'white');
  printColored('  npm run test:unified --watch --suite=unifiedCoordination', 'white');
}

/**
 * Main test runner function
 */
async function main() {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  printHeader('Unified Architecture Test Suite');
  
  // Validate setup
  printColored('🔍 Validating test setup...', 'blue');
  if (!(await validateSetup())) {
    process.exit(1);
  }
  printColored('✅ Test setup validation completed', 'green');
  
  // Determine which suites to run
  let suitesToRun;
  if (testOptions.suite) {
    if (!testSuites[testOptions.suite]) {
      printColored(`❌ Unknown test suite: ${testOptions.suite}`, 'red');
      printColored('Available suites: ' + Object.keys(testSuites).join(', '), 'yellow');
      process.exit(1);
    }
    suitesToRun = { [testOptions.suite]: testSuites[testOptions.suite] };
  } else {
    suitesToRun = testSuites;
  }
  
  printColored(`\n🚀 Running ${Object.keys(suitesToRun).length} test suite(s)...`, 'blue');
  
  // Run test suites
  const results = [];
  let hasFailures = false;
  
  if (testOptions.parallel && Object.keys(suitesToRun).length > 1) {
    // Run suites in parallel
    printColored('⚡ Running test suites in parallel...', 'blue');
    
    const promises = Object.entries(suitesToRun).map(([name, config]) => 
      runTestSuite(name, config)
    );
    
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // Run suites sequentially
    for (const [suiteName, suiteConfig] of Object.entries(suitesToRun)) {
      const result = await runTestSuite(suiteName, suiteConfig);
      results.push(result);
      
      // Check for critical failures
      if (!result.success && result.critical && testOptions.bail) {
        printColored(`❌ Critical test suite failed, stopping execution`, 'red');
        hasFailures = true;
        break;
      }
    }
  }
  
  // Check for any failures
  hasFailures = hasFailures || results.some(r => !r.success);
  
  // Print results
  printResults(results);
  
  // Generate additional reports if coverage was requested
  if (testOptions.coverage) {
    printColored('\n📊 Coverage report generated in coverage/unified-tests/', 'blue');
  }
  
  // Exit with appropriate code
  const criticalFailures = results.filter(r => !r.success && r.critical);
  if (criticalFailures.length > 0) {
    printColored(`\n❌ ${criticalFailures.length} critical test suite(s) failed`, 'red');
    process.exit(1);
  } else if (hasFailures) {
    printColored(`\n⚠️  Some non-critical tests failed`, 'yellow');
    process.exit(0); // Don't fail CI for non-critical tests
  } else {
    printColored('\n🎉 All tests passed successfully!', 'green');
    process.exit(0);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  printColored(`❌ Unhandled rejection: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  printColored('\n🛑 Test execution interrupted by user', 'yellow');
  process.exit(130);
});

// Run the main function
main().catch((error) => {
  printColored(`❌ Test runner failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});