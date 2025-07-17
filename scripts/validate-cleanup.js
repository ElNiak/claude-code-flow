#!/usr/bin/env node
/**
 * Directory Cleanup Validation Tool
 * Validates directory structure and file accessibility after cleanup operations
 */

import fs from 'node:fs';
import path from 'node:path';

// Configuration
const CONFIG = {
  criticalFiles: [
    'package.json',
    'README.md',
    'CLAUDE.md',
    'STEP_BY_STEP_MERGER_IMPLEMENTATION_PLAN.md',
    'bin/claude-flow',
    'src/cli/simple-cli.ts',
    'src/cli/simple-cli.js'
  ],

  expectedDirectories: [
    'docs',
    'docs/active',
    'docs/architecture',
    'docs/analysis',
    'docs/completed',
    'docs/testing',
    'docs/integration',
    'docs/reference',
    'analysis-archive',
    'analysis-archive/2024',
    'analysis-archive/2025',
    'build-tools'
  ],

  phaseExpectedFiles: {
    1: {
      'docs/completed': ['FINAL_SYNTHESIS_REPORT.md', 'MISSION_COMPLETION_SUMMARY.md', 'DEPLOYMENT_READINESS_REPORT.md'],
      'docs/architecture': ['UNIFIED_CLI_ARCHITECTURE_SPECIFICATION.md', 'UNIFIED_COORDINATION_ARCHITECTURE.md'],
      'docs/active': ['IMPLEMENTATION_ROADMAP.md', 'DENO_REMOVAL_ANALYSIS.md']
    },
    2: {
      'docs/analysis': ['COMPREHENSIVE_TECHNICAL_DEBT_REPORT.md', 'PERFORMANCE_IMPACT_ANALYSIS.md'],
      'docs/integration': ['SERENA_MCP_INTEGRATION_STATUS_REPORT.md', 'HOOKS_INTEGRATION_ANALYSIS.md']
    },
    3: {
      'build-tools': ['quick-compile.sh', 'rebuild-tmux.sh', 'compile-tmux-fix.js'],
      'docs/reference': ['system_touchpoints.json', 'technical_challenges_analysis.json']
    }
  }
};

/**
 * Validate critical files exist and are accessible
 */
function validateCriticalFiles() {
  console.log('🔍 Validating critical files...');

  const results = {
    passed: 0,
    failed: 0,
    missing: [],
    errors: []
  };

  CONFIG.criticalFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        // Check if file is readable
        fs.accessSync(file, fs.constants.R_OK);
        console.log(`✅ ${file} - OK`);
        results.passed++;
      } else {
        console.log(`❌ ${file} - MISSING`);
        results.failed++;
        results.missing.push(file);
      }
    } catch (error) {
      console.log(`❌ ${file} - ERROR: ${error.message}`);
      results.failed++;
      results.errors.push({ file, error: error.message });
    }
  });

  return results;
}

/**
 * Validate expected directory structure
 */
function validateDirectoryStructure() {
  console.log('\\n🏗️ Validating directory structure...');

  const results = {
    passed: 0,
    failed: 0,
    missing: [],
    errors: []
  };

  CONFIG.expectedDirectories.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        const stats = fs.statSync(dir);
        if (stats.isDirectory()) {
          console.log(`✅ ${dir}/ - OK`);
          results.passed++;
        } else {
          console.log(`❌ ${dir}/ - NOT A DIRECTORY`);
          results.failed++;
          results.errors.push({ dir, error: 'Not a directory' });
        }
      } else {
        console.log(`❌ ${dir}/ - MISSING`);
        results.failed++;
        results.missing.push(dir);
      }
    } catch (error) {
      console.log(`❌ ${dir}/ - ERROR: ${error.message}`);
      results.failed++;
      results.errors.push({ dir, error: error.message });
    }
  });

  return results;
}

/**
 * Validate phase-specific file locations
 */
function validatePhaseFiles(phase) {
  console.log(`\\n📋 Validating Phase ${phase} file locations...`);

  const results = {
    passed: 0,
    failed: 0,
    missing: [],
    errors: []
  };

  const phaseFiles = CONFIG.phaseExpectedFiles[phase];
  if (!phaseFiles) {
    console.log(`⚠️ No validation rules for Phase ${phase}`);
    return results;
  }

  Object.entries(phaseFiles).forEach(([directory, files]) => {
    console.log(`\\n📁 Checking ${directory}:`);

    files.forEach(file => {
      const fullPath = path.join(directory, file);
      try {
        if (fs.existsSync(fullPath)) {
          console.log(`  ✅ ${file} - OK`);
          results.passed++;
        } else {
          console.log(`  ❌ ${file} - MISSING`);
          results.failed++;
          results.missing.push(fullPath);
        }
      } catch (error) {
        console.log(`  ❌ ${file} - ERROR: ${error.message}`);
        results.failed++;
        results.errors.push({ file: fullPath, error: error.message });
      }
    });
  });

  return results;
}

/**
 * Validate file accessibility and permissions
 */
function validateFileAccess() {
  console.log('\\n🔐 Validating file access permissions...');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  const checkAccess = (filePath) => {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch (error) {
      results.errors.push({ file: filePath, error: error.message });
      return false;
    }
  };

  const checkDirectory = (dir) => {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        checkDirectory(fullPath);
      } else {
        if (checkAccess(fullPath)) {
          results.passed++;
        } else {
          results.failed++;
        }
      }
    });
  };

  // Check all docs directories
  CONFIG.expectedDirectories.forEach(dir => {
    if (dir.startsWith('docs/')) {
      checkDirectory(dir);
    }
  });

  console.log(`✅ Accessible files: ${results.passed}`);
  if (results.failed > 0) {
    console.log(`❌ Inaccessible files: ${results.failed}`);
    results.errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  return results;
}

/**
 * Check for orphaned files in root directory
 */
function checkOrphanedFiles() {
  console.log('\\n🗑️ Checking for orphaned files in root directory...');

  const results = {
    orphaned: [],
    count: 0
  };

  try {
    const files = fs.readdirSync('.', { withFileTypes: true });

    files.forEach(file => {
      if (file.isFile() && !CONFIG.criticalFiles.includes(file.name)) {
        // Check if it's a file that should have been moved
        const extensions = ['.md', '.json'];
        if (extensions.some(ext => file.name.endsWith(ext))) {
          const shouldBeMoved = file.name.includes('ANALYSIS') ||
                               file.name.includes('REPORT') ||
                               file.name.includes('IMPLEMENTATION') ||
                               file.name.includes('ARCHITECTURE') ||
                               file.name.includes('SUMMARY');

          if (shouldBeMoved) {
            results.orphaned.push(file.name);
            results.count++;
            console.log(`⚠️ Orphaned file: ${file.name}`);
          }
        }
      }
    });

    if (results.count === 0) {
      console.log('✅ No orphaned files found');
    }
  } catch (error) {
    console.log(`❌ Error checking orphaned files: ${error.message}`);
  }

  return results;
}

/**
 * Generate validation report
 */
function generateValidationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    overall: {
      passed: 0,
      failed: 0,
      warnings: 0
    },
    criticalFiles: results.criticalFiles,
    directories: results.directories,
    phaseFiles: results.phaseFiles,
    fileAccess: results.fileAccess,
    orphanedFiles: results.orphanedFiles,
    recommendations: []
  };

  // Calculate overall scores
  report.overall.passed = results.criticalFiles.passed + results.directories.passed +
                         (results.phaseFiles?.passed || 0) + (results.fileAccess?.passed || 0);
  report.overall.failed = results.criticalFiles.failed + results.directories.failed +
                         (results.phaseFiles?.failed || 0) + (results.fileAccess?.failed || 0);
  report.overall.warnings = results.orphanedFiles?.count || 0;

  // Generate recommendations
  if (results.criticalFiles.failed > 0) {
    report.recommendations.push('❌ CRITICAL: Restore missing critical files immediately');
  }
  if (results.directories.failed > 0) {
    report.recommendations.push('🏗️ Create missing directory structure');
  }
  if (results.phaseFiles?.failed > 0) {
    report.recommendations.push('📋 Move files to correct phase locations');
  }
  if (results.fileAccess?.failed > 0) {
    report.recommendations.push('🔐 Fix file permission issues');
  }
  if (results.orphanedFiles?.count > 0) {
    report.recommendations.push('🗑️ Move or archive orphaned files');
  }

  return report;
}

/**
 * Main validation function
 */
function runValidation(options = {}) {
  console.log('🔍 Starting directory cleanup validation...');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  const results = {};

  // Run all validations
  results.criticalFiles = validateCriticalFiles();
  results.directories = validateDirectoryStructure();

  if (options.phase) {
    results.phaseFiles = validatePhaseFiles(options.phase);
  }

  if (options.comprehensive || options.final) {
    results.fileAccess = validateFileAccess();
    results.orphanedFiles = checkOrphanedFiles();
  }

  // Generate report
  const report = generateValidationReport(results);

  console.log('\\n📊 Validation Summary:');
  console.log(`   ✅ Passed: ${report.overall.passed}`);
  console.log(`   ❌ Failed: ${report.overall.failed}`);
  console.log(`   ⚠️ Warnings: ${report.overall.warnings}`);

  if (report.recommendations.length > 0) {
    console.log('\\n📋 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
  }

  // Save report if requested
  if (options.output) {
    const outputFile = options.output || 'validation-report.json';
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\\n📄 Validation report saved to: ${outputFile}`);
  }

  // Return success/failure
  const success = report.overall.failed === 0;
  console.log(`\\n${success ? '✅ Validation PASSED' : '❌ Validation FAILED'}`);

  return { success, report };
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--phase':
        options.phase = parseInt(args[i + 1]);
        i++;
        break;
      case '--comprehensive':
        options.comprehensive = true;
        break;
      case '--final':
        options.final = true;
        break;
      case '--output':
        options.output = args[i + 1];
        i++;
        break;
      case '--help':
        console.log('Usage: node validate-cleanup.js [options]');
        console.log('Options:');
        console.log('  --phase <1|2|3>      Validate specific phase');
        console.log('  --comprehensive      Run comprehensive validation');
        console.log('  --final              Run final validation');
        console.log('  --output <file>      Save report to file');
        console.log('  --help               Show this help');
        process.exit(0);
        break;
    }
  }

  const { success } = runValidation(options);
  process.exit(success ? 0 : 1);
}

export { runValidation };
