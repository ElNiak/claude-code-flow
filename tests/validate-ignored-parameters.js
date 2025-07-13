#!/usr/bin/env node
/**
 * Parameter Validation Script
 * Identifies and reports ignored/unknown parameters in Claude Flow commands
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test cases for parameter validation
const testCases = [
  // Init command tests
  {
    command: 'init',
    validParams: ['--force', '--minimal', '--sparc', '--dry-run', '--skip-mcp', '--enhanced', '--safe', '--validate-only', '--batch-init', '--config'],
    testParams: ['--unknown-flag', '--typo-sparc', '--invalid-mode', '--fake-option', '--not-real'],
    description: 'Init command parameter validation'
  },
  
  // Agent command tests
  {
    command: 'agent spawn researcher',
    validParams: ['--name'],
    testParams: ['--invalid-type', '--unknown-param', '--fake-flag', '--not-supported'],
    description: 'Agent spawn parameter validation'
  },
  
  // Task command tests
  {
    command: 'task create research "Test task"',
    validParams: ['--priority'],
    testParams: ['--invalid-priority', '--unknown-flag', '--fake-param', '--not-real'],
    description: 'Task create parameter validation'
  },
  
  // Swarm command tests
  {
    command: 'swarm "test objective"',
    validParams: ['--strategy', '--mode', '--max-agents', '--parallel', '--monitor'],
    testParams: ['--invalid-strategy', '--fake-mode', '--unknown-param', '--not-supported'],
    description: 'Swarm command parameter validation'
  },
  
  // Memory command tests
  {
    command: 'memory store "key" "value"',
    validParams: [],
    testParams: ['--unknown-flag', '--invalid-param', '--fake-option'],
    description: 'Memory command parameter validation'
  }
];

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function runCommand(command) {
  try {
    const output = execSync(`npx claude-flow ${command} --dry-run 2>&1`, { 
      encoding: 'utf8',
      timeout: 30000 
    });
    return { success: true, output, error: null };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || '', 
      error: error.stderr || error.message 
    };
  }
}

function analyzeOutput(output, error, unknownParam) {
  const fullOutput = (output + ' ' + (error || '')).toLowerCase();
  
  // Check for various warning/error patterns
  const patterns = [
    'unknown',
    'invalid',
    'unrecognized',
    'warning',
    'error',
    'not found',
    'unexpected',
    'ignored',
    unknownParam.replace('--', '').toLowerCase()
  ];
  
  const detected = patterns.filter(pattern => fullOutput.includes(pattern));
  
  return {
    hasWarning: detected.length > 0,
    detectedPatterns: detected,
    isIgnored: !detected.length // If no warnings, parameter was silently ignored
  };
}

function testParameterHandling() {
  console.log(colorize('\n🔍 Claude Flow Parameter Validation Analysis\n', 'bold'));
  
  const results = {
    totalTests: 0,
    ignoredParams: [],
    warningParams: [],
    errorParams: []
  };
  
  testCases.forEach(testCase => {
    console.log(colorize(`📋 ${testCase.description}`, 'cyan'));
    console.log(colorize(`   Command: ${testCase.command}`, 'blue'));
    
    testCase.testParams.forEach(param => {
      results.totalTests++;
      const fullCommand = `${testCase.command} ${param}`;
      
      console.log(colorize(`   Testing: ${param}`, 'yellow'));
      
      const result = runCommand(fullCommand);
      const analysis = analyzeOutput(result.output, result.error, param);
      
      if (analysis.isIgnored) {
        results.ignoredParams.push({
          command: testCase.command,
          parameter: param,
          output: result.output
        });
        console.log(colorize(`      ⚠️  IGNORED (no warning shown)`, 'red'));
      } else if (analysis.hasWarning) {
        results.warningParams.push({
          command: testCase.command,
          parameter: param,
          patterns: analysis.detectedPatterns,
          output: result.output
        });
        console.log(colorize(`      ✅ Warning detected: ${analysis.detectedPatterns.join(', ')}`, 'green'));
      }
      
      if (!result.success) {
        results.errorParams.push({
          command: testCase.command,
          parameter: param,
          error: result.error
        });
        console.log(colorize(`      ❌ Command failed`, 'red'));
      }
    });
    
    console.log('');
  });
  
  return results;
}

function generateReport(results) {
  console.log(colorize('\n📊 PARAMETER VALIDATION REPORT\n', 'bold'));
  
  console.log(colorize(`Total parameters tested: ${results.totalTests}`, 'blue'));
  console.log(colorize(`Silently ignored: ${results.ignoredParams.length}`, 'red'));
  console.log(colorize(`Properly warned: ${results.warningParams.length}`, 'green'));
  console.log(colorize(`Caused errors: ${results.errorParams.length}`, 'yellow'));
  
  if (results.ignoredParams.length > 0) {
    console.log(colorize('\n🚨 SILENTLY IGNORED PARAMETERS (SECURITY RISK):', 'red'));
    results.ignoredParams.forEach(item => {
      console.log(colorize(`   ${item.command} ${item.parameter}`, 'red'));
    });
  }
  
  if (results.warningParams.length > 0) {
    console.log(colorize('\n✅ PROPERLY HANDLED PARAMETERS:', 'green'));
    results.warningParams.forEach(item => {
      console.log(colorize(`   ${item.command} ${item.parameter} (${item.patterns.join(', ')})`, 'green'));
    });
  }
  
  if (results.errorParams.length > 0) {
    console.log(colorize('\n❌ PARAMETERS CAUSING ERRORS:', 'yellow'));
    results.errorParams.forEach(item => {
      console.log(colorize(`   ${item.command} ${item.parameter}`, 'yellow'));
      console.log(colorize(`      Error: ${item.error}`, 'yellow'));
    });
  }
  
  // Calculate security score
  const securityScore = Math.round(
    ((results.warningParams.length + results.errorParams.length) / results.totalTests) * 100
  );
  
  console.log(colorize(`\n🛡️  SECURITY SCORE: ${securityScore}%`, securityScore > 80 ? 'green' : securityScore > 50 ? 'yellow' : 'red'));
  
  if (securityScore < 80) {
    console.log(colorize('\n⚠️  RECOMMENDATIONS:', 'yellow'));
    console.log('1. Implement parameter validation in parseFlags function');
    console.log('2. Add warning messages for unknown parameters');
    console.log('3. Create whitelist of valid parameters per command');
    console.log('4. Add type checking for parameter values');
  }
  
  return results;
}

function saveReport(results) {
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.totalTests,
      ignoredCount: results.ignoredParams.length,
      warningCount: results.warningParams.length,
      errorCount: results.errorParams.length,
      securityScore: Math.round(
        ((results.warningParams.length + results.errorParams.length) / results.totalTests) * 100
      )
    },
    ignoredParameters: results.ignoredParams,
    warningParameters: results.warningParams,
    errorParameters: results.errorParams
  };
  
  const reportPath = path.join(__dirname, '..', 'parameter-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  console.log(colorize(`\n📄 Report saved to: ${reportPath}`, 'cyan'));
  
  return reportPath;
}

function testSpecificScenarios() {
  console.log(colorize('\n🧪 TESTING SPECIFIC EDGE CASES\n', 'bold'));
  
  const edgeCases = [
    {
      name: 'Multiple unknown parameters',
      command: 'init --fake1 value1 --fake2 --fake3 value3 --dry-run'
    },
    {
      name: 'Mixed valid and invalid parameters',
      command: 'init --force --unknown-flag --minimal --fake-value test --dry-run'
    },
    {
      name: 'Unknown short flags',
      command: 'init -xyz --dry-run'
    },
    {
      name: 'Malformed parameters',
      command: 'init ---triple-dash --flag=value --dry-run'
    },
    {
      name: 'Special characters in parameter values',
      command: 'init --name "test with $pecial ch@rs" --fake-param "value" --dry-run'
    }
  ];
  
  edgeCases.forEach(testCase => {
    console.log(colorize(`Testing: ${testCase.name}`, 'yellow'));
    console.log(colorize(`Command: ${testCase.command}`, 'blue'));
    
    const result = runCommand(testCase.command);
    
    if (result.success) {
      console.log(colorize('   ✅ Command executed successfully', 'green'));
      
      // Check if output contains any warnings
      const hasWarnings = result.output.toLowerCase().includes('warning') || 
                         result.output.toLowerCase().includes('unknown') ||
                         result.output.toLowerCase().includes('invalid');
      
      if (hasWarnings) {
        console.log(colorize('   ⚠️  Contains warnings (good)', 'yellow'));
      } else {
        console.log(colorize('   🚨 No warnings shown (potential issue)', 'red'));
      }
    } else {
      console.log(colorize('   ❌ Command failed', 'red'));
    }
    
    console.log('');
  });
}

// Main execution
async function main() {
  try {
    console.log(colorize('Starting Claude Flow parameter validation analysis...', 'cyan'));
    
    // Test parameter handling
    const results = testParameterHandling();
    
    // Test specific edge cases
    testSpecificScenarios();
    
    // Generate and save report
    generateReport(results);
    saveReport(results);
    
    // Exit with appropriate code
    const hasIssues = results.ignoredParams.length > 0;
    process.exit(hasIssues ? 1 : 0);
    
  } catch (error) {
    console.error(colorize(`\n❌ Analysis failed: ${error.message}`, 'red'));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  testParameterHandling,
  generateReport,
  saveReport,
  testSpecificScenarios
};