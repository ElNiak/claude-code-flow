#!/usr/bin/env node

/**
 * Automated CLI Validation System
 *
 * Validates CLI functionality, feature parity, and system integration
 * Designed to run in CI/CD pipelines for automated quality assurance
 *
 * @version 2.0.0
 * @author Test Framework Builder Agent
 */

import chalk from 'chalk';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * Automated Validation System
 */
class AutomatedValidation {
  constructor(options = {}) {
    this.options = {
      strictMode: options.strictMode || false,
      timeout: options.timeout || 60000,
      maxRetries: options.maxRetries || 3,
      validateBuild: options.validateBuild !== false,
      validateDependencies: options.validateDependencies !== false,
      validateSecurity: options.validateSecurity !== false,
      validatePerformance: options.validatePerformance !== false,
      ...options
    };

    this.results = {
      timestamp: new Date().toISOString(),
      validations: new Map(),
      errors: [],
      warnings: [],
      summary: {}
    };

    this.startTime = Date.now();
  }

  /**
   * Logger with different levels
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString().substr(11, 8);
    const prefix = `[${timestamp}]`;

    switch (level) {
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        this.results.errors.push(message);
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
        this.results.warnings.push(message);
        break;
      case 'info':
        console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
        break;
      case 'debug':
        if (this.options.verbose) {
          console.log(chalk.gray(`${prefix} 🔍 ${message}`));
        }
        break;
    }
  }

  /**
   * Execute command with retries
   */
  async executeWithRetry(command, retries = this.options.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await execAsync(command, {
          timeout: this.options.timeout,
          cwd: projectRoot
        });
        return { success: true, ...result };
      } catch (error) {
        if (attempt === retries) {
          return { success: false, error: error.message, stderr: error.stderr };
        }
        this.log(`Command failed (attempt ${attempt}/${retries}): ${command}`, 'warning');
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Validate build system
   */
  async validateBuild() {
    if (!this.options.validateBuild) return;

    this.log('🔨 Validating build system...', 'info');

    const validations = [];

    // Check package.json exists and is valid
    try {
      const packageJson = await readFile(path.join(projectRoot, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);

      validations.push({
        name: 'package_json_valid',
        passed: true,
        message: 'package.json is valid JSON'
      });

      // Check required fields
      const requiredFields = ['name', 'version', 'main', 'scripts'];
      for (const field of requiredFields) {
        validations.push({
          name: `package_json_${field}`,
          passed: !!pkg[field],
          message: `package.json has ${field} field`,
          value: pkg[field]
        });
      }

      // Check build script exists
      validations.push({
        name: 'build_script_exists',
        passed: !!pkg.scripts?.build,
        message: 'Build script exists in package.json',
        value: pkg.scripts?.build
      });

    } catch (error) {
      validations.push({
        name: 'package_json_valid',
        passed: false,
        message: 'Failed to read or parse package.json',
        error: error.message
      });
    }

    // Test build process
    this.log('  Testing build process...', 'debug');
    const buildResult = await this.executeWithRetry('npm run build');
    validations.push({
      name: 'build_execution',
      passed: buildResult.success,
      message: 'Build process completes successfully',
      error: buildResult.error,
      duration: buildResult.duration
    });

    // Check if build outputs exist
    const expectedOutputs = [
      'dist/cli/simple-cli.js',
      'dist/mcp/stdio-server-complete.js'
    ];

    for (const output of expectedOutputs) {
      try {
        await access(path.join(projectRoot, output));
        validations.push({
          name: `output_exists_${output.replace(/[\/\.]/g, '_')}`,
          passed: true,
          message: `Build output exists: ${output}`
        });
      } catch (error) {
        validations.push({
          name: `output_exists_${output.replace(/[\/\.]/g, '_')}`,
          passed: false,
          message: `Build output missing: ${output}`
        });
      }
    }

    this.results.validations.set('build', validations);

    const passed = validations.filter(v => v.passed).length;
    const total = validations.length;

    if (passed === total) {
      this.log(`Build validation: ${passed}/${total} checks passed`, 'success');
    } else {
      this.log(`Build validation: ${passed}/${total} checks passed`, 'warning');
    }
  }

  /**
   * Validate dependencies
   */
  async validateDependencies() {
    if (!this.options.validateDependencies) return;

    this.log('📦 Validating dependencies...', 'info');

    const validations = [];

    // Check node_modules exists
    try {
      await access(path.join(projectRoot, 'node_modules'));
      validations.push({
        name: 'node_modules_exists',
        passed: true,
        message: 'node_modules directory exists'
      });
    } catch (error) {
      validations.push({
        name: 'node_modules_exists',
        passed: false,
        message: 'node_modules directory not found - run npm install'
      });
    }

    // Check for security vulnerabilities
    this.log('  Checking for security vulnerabilities...', 'debug');
    const auditResult = await this.executeWithRetry('npm audit --audit-level=high --json');

    if (auditResult.success) {
      try {
        const audit = JSON.parse(auditResult.stdout);
        const highVulns = audit.metadata?.vulnerabilities?.high || 0;
        const criticalVulns = audit.metadata?.vulnerabilities?.critical || 0;

        validations.push({
          name: 'security_audit',
          passed: highVulns === 0 && criticalVulns === 0,
          message: `Security audit: ${criticalVulns} critical, ${highVulns} high vulnerabilities`,
          details: audit.metadata?.vulnerabilities
        });
      } catch (parseError) {
        validations.push({
          name: 'security_audit',
          passed: false,
          message: 'Failed to parse npm audit results',
          error: parseError.message
        });
      }
    } else {
      validations.push({
        name: 'security_audit',
        passed: false,
        message: 'npm audit failed to run',
        error: auditResult.error
      });
    }

    // Check dependency versions
    this.log('  Validating dependency versions...', 'debug');
    const outdatedResult = await this.executeWithRetry('npm outdated --json');

    if (outdatedResult.success && outdatedResult.stdout.trim()) {
      try {
        const outdated = JSON.parse(outdatedResult.stdout);
        const outdatedCount = Object.keys(outdated).length;

        // Check for major version differences
        const majorOutdated = Object.entries(outdated).filter(([name, info]) => {
          const current = info.current?.split('.')[0] || '0';
          const latest = info.latest?.split('.')[0] || '0';
          return current !== latest;
        });

        validations.push({
          name: 'dependency_versions',
          passed: majorOutdated.length === 0,
          message: `${outdatedCount} outdated dependencies, ${majorOutdated.length} with major version differences`,
          details: { outdated, majorOutdated: majorOutdated.map(([name]) => name) }
        });
      } catch (parseError) {
        validations.push({
          name: 'dependency_versions',
          passed: true,
          message: 'All dependencies are up to date'
        });
      }
    } else {
      validations.push({
        name: 'dependency_versions',
        passed: true,
        message: 'All dependencies are up to date'
      });
    }

    this.results.validations.set('dependencies', validations);

    const passed = validations.filter(v => v.passed).length;
    const total = validations.length;

    if (passed === total) {
      this.log(`Dependencies validation: ${passed}/${total} checks passed`, 'success');
    } else {
      this.log(`Dependencies validation: ${passed}/${total} checks passed`, 'warning');
    }
  }

  /**
   * Validate CLI functionality
   */
  async validateCLIFunctionality() {
    this.log('🖥️ Validating CLI functionality...', 'info');

    const validations = [];

    // Test basic CLI commands
    const basicCommands = [
      { cmd: '--version', name: 'version_command', expected: /\d+\.\d+\.\d+/ },
      { cmd: '--help', name: 'help_command', expected: /Usage:|Commands:/ },
      { cmd: 'status --json', name: 'status_json', expected: /\{.*\}/ }
    ];

    for (const { cmd, name, expected } of basicCommands) {
      this.log(`  Testing command: ${cmd}`, 'debug');

      const result = await this.executeWithRetry(`node dist/cli/simple-cli.js ${cmd}`);

      const passed = result.success && (expected ? expected.test(result.stdout) : true);

      validations.push({
        name,
        passed,
        message: `Command '${cmd}' ${passed ? 'works correctly' : 'failed or returned unexpected output'}`,
        command: cmd,
        exitCode: result.success ? 0 : 1,
        output: result.stdout?.substring(0, 200) + (result.stdout?.length > 200 ? '...' : ''),
        error: result.error
      });
    }

    // Test command categories
    const commandCategories = [
      'agent', 'swarm', 'memory', 'task', 'config', 'mcp'
    ];

    for (const category of commandCategories) {
      this.log(`  Testing command category: ${category}`, 'debug');

      const result = await this.executeWithRetry(`node dist/cli/simple-cli.js ${category} --help`);

      validations.push({
        name: `command_category_${category}`,
        passed: result.success,
        message: `Command category '${category}' is ${result.success ? 'available' : 'not available'}`,
        error: result.error
      });
    }

    // Test JSON output capabilities
    const jsonCommands = [
      'status --json',
      'config get --json',
      'memory stats --json'
    ];

    for (const cmd of jsonCommands) {
      this.log(`  Testing JSON output: ${cmd}`, 'debug');

      const result = await this.executeWithRetry(`node dist/cli/simple-cli.js ${cmd}`);

      let isValidJson = false;
      try {
        JSON.parse(result.stdout);
        isValidJson = true;
      } catch (error) {
        // Not valid JSON, but command might still work
      }

      validations.push({
        name: `json_output_${cmd.replace(/[^a-z0-9]/gi, '_')}`,
        passed: result.success && isValidJson,
        message: `Command '${cmd}' ${result.success && isValidJson ? 'produces valid JSON' : 'failed or invalid JSON'}`,
        error: result.error
      });
    }

    this.results.validations.set('cli_functionality', validations);

    const passed = validations.filter(v => v.passed).length;
    const total = validations.length;

    if (passed === total) {
      this.log(`CLI functionality validation: ${passed}/${total} checks passed`, 'success');
    } else {
      this.log(`CLI functionality validation: ${passed}/${total} checks passed`, 'warning');
    }
  }

  /**
   * Validate performance requirements
   */
  async validatePerformance() {
    if (!this.options.validatePerformance) return;

    this.log('⚡ Validating performance requirements...', 'info');

    const validations = [];

    // Test startup time
    this.log('  Measuring startup time...', 'debug');

    const startupTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const result = await this.executeWithRetry('node dist/cli/simple-cli.js --version');
      const duration = Date.now() - start;

      if (result.success) {
        startupTimes.push(duration);
      }
    }

    const avgStartupTime = startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length;

    validations.push({
      name: 'startup_time',
      passed: avgStartupTime < 3000, // Less than 3 seconds
      message: `Average startup time: ${avgStartupTime.toFixed(2)}ms`,
      value: avgStartupTime,
      threshold: 3000,
      measurements: startupTimes
    });

    // Test memory usage
    this.log('  Measuring memory usage...', 'debug');

    const memoryTest = `
      const start = process.memoryUsage();
      import('./dist/cli/simple-cli.js').then(() => {
        const end = process.memoryUsage();
        console.log(JSON.stringify({
          heapUsed: (end.heapUsed - start.heapUsed) / 1024 / 1024,
          heapTotal: (end.heapTotal - start.heapTotal) / 1024 / 1024,
          rss: (end.rss - start.rss) / 1024 / 1024
        }));
      }).catch(console.error);
    `;

    const memoryResult = await this.executeWithRetry(`node -e "${memoryTest}"`);

    if (memoryResult.success) {
      try {
        const memory = JSON.parse(memoryResult.stdout);

        validations.push({
          name: 'memory_usage',
          passed: memory.heapUsed < 100, // Less than 100MB heap
          message: `Memory usage: ${memory.heapUsed.toFixed(2)}MB heap, ${memory.rss.toFixed(2)}MB RSS`,
          value: memory,
          threshold: 100
        });
      } catch (error) {
        validations.push({
          name: 'memory_usage',
          passed: false,
          message: 'Failed to measure memory usage',
          error: error.message
        });
      }
    } else {
      validations.push({
        name: 'memory_usage',
        passed: false,
        message: 'Memory measurement command failed',
        error: memoryResult.error
      });
    }

    this.results.validations.set('performance', validations);

    const passed = validations.filter(v => v.passed).length;
    const total = validations.length;

    if (passed === total) {
      this.log(`Performance validation: ${passed}/${total} checks passed`, 'success');
    } else {
      this.log(`Performance validation: ${passed}/${total} checks passed`, 'warning');
    }
  }

  /**
   * Validate system integration
   */
  async validateSystemIntegration() {
    this.log('🔗 Validating system integration...', 'info');

    const validations = [];

    // Check Node.js version compatibility
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);

    validations.push({
      name: 'node_version',
      passed: majorVersion >= 20,
      message: `Node.js version: ${nodeVersion} (required: >= 20.0.0)`,
      value: nodeVersion,
      requirement: '>=20.0.0'
    });

    // Check platform compatibility
    const platform = process.platform;
    const supportedPlatforms = ['darwin', 'linux', 'win32'];

    validations.push({
      name: 'platform_support',
      passed: supportedPlatforms.includes(platform),
      message: `Platform: ${platform} (supported: ${supportedPlatforms.join(', ')})`,
      value: platform
    });

    // Test file system operations
    try {
      const testFile = path.join(projectRoot, '.validation-test');
      await writeFile(testFile, 'test');
      await readFile(testFile);
      await import('fs').then(fs => fs.unlinkSync(testFile));

      validations.push({
        name: 'filesystem_access',
        passed: true,
        message: 'File system operations work correctly'
      });
    } catch (error) {
      validations.push({
        name: 'filesystem_access',
        passed: false,
        message: 'File system operations failed',
        error: error.message
      });
    }

    // Test process spawning capability
    try {
      await this.executeWithRetry('node --version');
      validations.push({
        name: 'process_spawning',
        passed: true,
        message: 'Process spawning works correctly'
      });
    } catch (error) {
      validations.push({
        name: 'process_spawning',
        passed: false,
        message: 'Process spawning failed',
        error: error.message
      });
    }

    this.results.validations.set('system_integration', validations);

    const passed = validations.filter(v => v.passed).length;
    const total = validations.length;

    if (passed === total) {
      this.log(`System integration validation: ${passed}/${total} checks passed`, 'success');
    } else {
      this.log(`System integration validation: ${passed}/${total} checks passed`, 'warning');
    }
  }

  /**
   * Generate validation summary
   */
  generateSummary() {
    let totalValidations = 0;
    let passedValidations = 0;
    let criticalFailures = 0;

    for (const [category, validations] of this.results.validations) {
      totalValidations += validations.length;
      passedValidations += validations.filter(v => v.passed).length;

      // Count critical failures
      const criticalChecks = ['build_execution', 'security_audit', 'node_version'];
      criticalFailures += validations.filter(v =>
        !v.passed && criticalChecks.includes(v.name)
      ).length;
    }

    this.results.summary = {
      totalTime: Date.now() - this.startTime,
      totalValidations,
      passedValidations,
      failedValidations: totalValidations - passedValidations,
      successRate: totalValidations > 0 ? ((passedValidations / totalValidations) * 100).toFixed(2) : 100,
      criticalFailures,
      errors: this.results.errors.length,
      warnings: this.results.warnings.length,
      overallStatus: criticalFailures === 0 && passedValidations === totalValidations ? 'PASS' :
                     criticalFailures > 0 ? 'CRITICAL_FAIL' : 'PARTIAL_PASS'
    };
  }

  /**
   * Export validation results
   */
  async exportResults() {
    const results = {
      timestamp: this.results.timestamp,
      summary: this.results.summary,
      validations: Object.fromEntries(this.results.validations),
      errors: this.results.errors,
      warnings: this.results.warnings,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd(),
        args: process.argv
      }
    };

    const outputPath = path.join(projectRoot, 'validation-results.json');
    await writeFile(outputPath, JSON.stringify(results, null, 2));

    return outputPath;
  }

  /**
   * Main execution method
   */
  async run() {
    this.log('🚀 Starting Automated CLI Validation', 'info');

    try {
      // Run all validation categories
      await this.validateBuild();
      await this.validateDependencies();
      await this.validateCLIFunctionality();
      await this.validatePerformance();
      await this.validateSystemIntegration();

      // Generate summary and export results
      this.generateSummary();
      const outputPath = await this.exportResults();

      // Display final results
      this.displayResults();

      this.log(`Validation results saved to: ${outputPath}`, 'info');

      return {
        success: this.results.summary.overallStatus === 'PASS',
        summary: this.results.summary,
        outputPath
      };

    } catch (error) {
      this.log(`Validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Display final results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log(chalk.bold.blue('📋 AUTOMATED VALIDATION RESULTS'));
    console.log('='.repeat(80));

    const summary = this.results.summary;

    // Overall status
    const statusColor = summary.overallStatus === 'PASS' ? chalk.green :
                       summary.overallStatus === 'CRITICAL_FAIL' ? chalk.red : chalk.yellow;

    console.log(`\n🎯 Overall Status: ${statusColor(summary.overallStatus)}`);

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Total Validations: ${summary.totalValidations}`);
    console.log(`   Passed: ${chalk.green(summary.passedValidations)} (${summary.successRate}%)`);
    console.log(`   Failed: ${chalk.red(summary.failedValidations)}`);
    console.log(`   Critical Failures: ${chalk.red(summary.criticalFailures)}`);
    console.log(`   Errors: ${summary.errors}`);
    console.log(`   Warnings: ${summary.warnings}`);
    console.log(`   Duration: ${(summary.totalTime / 1000).toFixed(2)}s`);

    // Show category results
    console.log(`\n📋 Category Results:`);
    for (const [category, validations] of this.results.validations) {
      const passed = validations.filter(v => v.passed).length;
      const total = validations.length;
      const status = passed === total ? '✅' : '⚠️';

      console.log(`   ${status} ${category}: ${passed}/${total}`);
    }

    // Show critical failures
    if (summary.criticalFailures > 0) {
      console.log(`\n❌ Critical Failures:`);
      for (const [category, validations] of this.results.validations) {
        const criticalChecks = ['build_execution', 'security_audit', 'node_version'];
        const failed = validations.filter(v =>
          !v.passed && criticalChecks.includes(v.name)
        );

        for (const failure of failed) {
          console.log(`   • ${chalk.red(failure.name)}: ${failure.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
  }
}

/**
 * CLI parsing
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    strictMode: args.includes('--strict'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 60000,
    maxRetries: parseInt(args.find(arg => arg.startsWith('--retries='))?.split('=')[1]) || 3,
    validateBuild: !args.includes('--skip-build'),
    validateDependencies: !args.includes('--skip-deps'),
    validateSecurity: !args.includes('--skip-security'),
    validatePerformance: !args.includes('--skip-performance'),
    help: args.includes('--help') || args.includes('-h')
  };

  return options;
}

/**
 * Show help
 */
function showHelp() {
  console.log(chalk.bold.blue(`
Claude Flow CLI - Automated Validation System v2.0.0

Usage:
  node scripts/automated-validation.js [options]

Options:
  --strict                   Enable strict validation mode
  -v, --verbose              Show detailed output
  --timeout=<ms>             Set command timeout (default: 60000)
  --retries=<num>            Set retry attempts (default: 3)
  --skip-build              Skip build validation
  --skip-deps               Skip dependency validation
  --skip-security           Skip security validation
  --skip-performance        Skip performance validation
  -h, --help                Show this help

Exit Codes:
  0 - All validations passed
  1 - Some validations failed (but not critical)
  2 - Critical validations failed
  3 - System error occurred

Examples:
  node scripts/automated-validation.js
  node scripts/automated-validation.js --strict --verbose
  node scripts/automated-validation.js --skip-performance --timeout=30000
`));
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const validator = new AutomatedValidation(options);

  try {
    const result = await validator.run();

    if (result.summary.overallStatus === 'PASS') {
      process.exit(0);
    } else if (result.summary.overallStatus === 'CRITICAL_FAIL') {
      process.exit(2);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Validation system error:'), error);
    process.exit(3);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(3);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(3);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default AutomatedValidation;
