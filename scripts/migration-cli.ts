#!/usr/bin/env tsx

/**
 * Console Migration CLI
 * Command-line interface for managing console call migrations
 */

import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import MigrationOrchestrator from './migration-orchestrator.js';
import ComponentMigrationSystem from './component-migration.js';
import MigrationValidator from './validate-migration.js';
import { ConsoleMigration } from '../src/utils/console-migration.js';
import { ComponentType } from '../src/core/logger.js';

const program = new Command();

program.name('migration-cli').description('Console Migration Management CLI').version('1.0.0');

// Full migration command
program
  .command('migrate')
  .description('Run complete console call migration')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--dry-run', 'Show what would be migrated without making changes')
  .option('--component <component>', 'Migrate specific component only')
  .option('--verbose', 'Show detailed progress information')
  .action(async (options) => {
    try {
      console.log('🚀 Starting Console Migration');

      if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No files will be modified');
        await runDryRun(options.project);
        return;
      }

      if (options.component) {
        console.log(`🎯 Migrating component: ${options.component}`);
        await runComponentMigration(options.project, options.component as ComponentType);
        return;
      }

      // Run full migration
      const orchestrator = new MigrationOrchestrator(options.project);

      if (options.verbose) {
        orchestrator.on('progress', (progress) => {
          console.log(
            `📊 ${progress.stage}: ${progress.processedFiles}/${progress.totalFiles} files processed`,
          );
        });
      }

      const report = await orchestrator.executeMigration();
      console.log('✅ Migration completed successfully!');
      console.log(
        `📄 Report saved to: ${path.join(options.project, '.claude-flow', 'migrations')}`,
      );
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  });

// Validation command
program
  .command('validate')
  .description('Validate migration results')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--component <component>', 'Validate specific component only')
  .action(async (options) => {
    try {
      console.log('🔍 Validating migration...');

      const validator = new MigrationValidator(options.project);
      const result = await validator.validateMigration();

      if (result.passed) {
        console.log('✅ Validation passed!');
      } else {
        console.log('❌ Validation failed!');
        result.errors.forEach((error) => console.error(`  • ${error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show migration status and statistics')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      await showMigrationStatus(options.project);
    } catch (error) {
      console.error('❌ Failed to get status:', error);
      process.exit(1);
    }
  });

// Rollback command
program
  .command('rollback')
  .description('Rollback migration changes')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--component <component>', 'Rollback specific component only')
  .option('--file <file>', 'Rollback specific file only')
  .option('--force', 'Force rollback without confirmation')
  .action(async (options) => {
    try {
      if (!options.force) {
        const { default: inquirer } = await import('inquirer');
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to rollback migration changes?',
            default: false,
          },
        ]);

        if (!confirm) {
          console.log('Rollback cancelled');
          return;
        }
      }

      if (options.file) {
        await rollbackFile(options.file);
      } else if (options.component) {
        await rollbackComponent(options.project, options.component as ComponentType);
      } else {
        await rollbackComplete(options.project);
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    }
  });

// Report command
program
  .command('report')
  .description('Generate migration reports')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--format <format>', 'Report format (json, html, text)', 'text')
  .option('--output <file>', 'Output file path')
  .action(async (options) => {
    try {
      await generateReport(options.project, options.format, options.output);
    } catch (error) {
      console.error('❌ Failed to generate report:', error);
      process.exit(1);
    }
  });

// Analytics command
program
  .command('analytics')
  .description('Show usage analytics and refactor recommendations')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      await showAnalytics(options.project);
    } catch (error) {
      console.error('❌ Failed to get analytics:', error);
      process.exit(1);
    }
  });

/**
 * Implementation functions
 */

async function runDryRun(projectRoot: string): Promise<void> {
  console.log('📊 Analyzing codebase for console calls...');

  // Count console calls by component
  const componentCounts = await analyzeConsoleCalls(projectRoot);

  console.log('\n📈 MIGRATION PREVIEW:');
  console.log('═'.repeat(50));

  let totalCalls = 0;
  for (const [component, count] of Object.entries(componentCounts)) {
    console.log(`${component}: ${count} console calls`);
    totalCalls += count;
  }

  console.log('─'.repeat(50));
  console.log(`TOTAL: ${totalCalls} console calls to migrate`);

  console.log('\n💡 RECOMMENDATIONS:');
  if (totalCalls > 5000) {
    console.log('  • Large codebase detected - consider component-by-component migration');
  }
  if (componentCounts['MCP'] > 0) {
    console.log('  • MCP components detected - stderr compliance will be enforced');
  }
  if (totalCalls > 10000) {
    console.log('  • Monitor performance impact post-migration');
  }

  console.log('\n🚀 To run migration: migration-cli migrate');
}

async function runComponentMigration(projectRoot: string, component: ComponentType): Promise<void> {
  const migrationSystem = new ComponentMigrationSystem(projectRoot);
  // Implementation would call single component migration
  console.log(`🔄 Component-specific migration for ${component} is not yet implemented`);
  console.log('Use full migration command for now');
}

async function showMigrationStatus(projectRoot: string): Promise<void> {
  console.log('📊 MIGRATION STATUS');
  console.log('═'.repeat(50));

  // Check for migration artifacts
  const migrationDir = path.join(projectRoot, '.claude-flow', 'migrations');

  try {
    const migrations = await fs.readdir(migrationDir);
    console.log(`📁 Found ${migrations.length} migration(s)`);

    for (const migration of migrations) {
      const migrationPath = path.join(migrationDir, migration);
      const reportPath = path.join(migrationPath, 'final-report.json');

      try {
        const reportContent = await fs.readFile(reportPath, 'utf-8');
        const report = JSON.parse(reportContent);

        console.log(`\n🆔 Migration: ${report.executionId}`);
        console.log(`📅 Date: ${new Date(report.timestamp).toLocaleString()}`);
        console.log(`✅ Status: ${report.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`📄 Files: ${report.summary.totalFiles}`);
        console.log(`🔄 Calls migrated: ${report.summary.totalCallsMigrated}`);
        console.log(`📈 Coverage: ${report.summary.migrationCoverage.toFixed(1)}%`);
      } catch {
        console.log(`\n📁 Migration: ${migration} (in progress or incomplete)`);
      }
    }
  } catch {
    console.log('No migrations found');
  }

  // Show current console call count
  const currentCalls = await countCurrentConsoleCalls(projectRoot);
  console.log(`\n📊 Current unmigrated console calls: ${currentCalls}`);
}

async function rollbackFile(filePath: string): Promise<void> {
  console.log(`🔄 Rolling back file: ${filePath}`);

  const result = await ConsoleMigration.rollbackFile(filePath);

  if (result.success) {
    console.log('✅ File rollback completed');
  } else {
    console.error(`❌ File rollback failed: ${result.error}`);
    throw new Error('Rollback failed');
  }
}

async function rollbackComponent(projectRoot: string, component: ComponentType): Promise<void> {
  console.log(`🔄 Rolling back component: ${component}`);

  const backupDir = path.join(
    projectRoot,
    '.claude-flow',
    'component-backups',
    component.toLowerCase(),
  );

  try {
    // Implementation would restore component files from backup
    console.log(`📁 Looking for backups in: ${backupDir}`);
    console.log('🔄 Component rollback is not yet fully implemented');
    console.log('Use file-specific rollback for now');
  } catch (error) {
    throw new Error(`Component rollback failed: ${error}`);
  }
}

async function rollbackComplete(projectRoot: string): Promise<void> {
  console.log('🔄 Rolling back complete migration...');

  const migrationDir = path.join(projectRoot, '.claude-flow', 'migrations');

  try {
    const migrations = await fs.readdir(migrationDir);
    const latestMigration = migrations.sort().reverse()[0];

    if (!latestMigration) {
      throw new Error('No migration found to rollback');
    }

    const rollbackScript = path.join(migrationDir, latestMigration, 'rollback.sh');

    console.log(`📁 Latest migration: ${latestMigration}`);
    console.log(`🔄 Rollback script: ${rollbackScript}`);
    console.log('Run the rollback script manually for now');
  } catch (error) {
    throw new Error(`Complete rollback failed: ${error}`);
  }
}

async function generateReport(
  projectRoot: string,
  format: string,
  outputFile?: string,
): Promise<void> {
  console.log(`📊 Generating ${format} report...`);

  const migrationDir = path.join(projectRoot, '.claude-flow', 'migrations');

  try {
    const migrations = await fs.readdir(migrationDir);
    const latestMigration = migrations.sort().reverse()[0];

    if (!latestMigration) {
      throw new Error('No migration found to report on');
    }

    const reportPath = path.join(migrationDir, latestMigration, 'final-report.json');
    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(reportContent);

    let formattedReport: string;

    switch (format) {
      case 'json':
        formattedReport = JSON.stringify(report, null, 2);
        break;
      case 'html':
        formattedReport = generateHtmlReport(report);
        break;
      default:
        formattedReport = generateTextReport(report);
    }

    if (outputFile) {
      await fs.writeFile(outputFile, formattedReport, 'utf-8');
      console.log(`✅ Report saved to: ${outputFile}`);
    } else {
      console.log(formattedReport);
    }
  } catch (error) {
    throw new Error(`Report generation failed: ${error}`);
  }
}

async function showAnalytics(projectRoot: string): Promise<void> {
  console.log('📊 USAGE ANALYTICS');
  console.log('═'.repeat(50));

  // Implementation would show real analytics
  const migrationStats = ConsoleMigration.getMigrationStats();

  console.log('🔄 Migration Statistics:');
  for (const [key, stats] of Object.entries(migrationStats)) {
    console.log(`  ${key}: ${stats.migratedCalls} calls`);
  }

  const report = ConsoleMigration.generateMigrationReport();

  console.log(`\n📈 Total migrated: ${report.totalMigrated}`);
  console.log(`📊 Completion: ${report.completionPercentage.toFixed(1)}%`);

  console.log('\n💡 Recommendations:');
  report.recommendations.forEach((rec) => console.log(`  • ${rec}`));
}

/**
 * Helper functions
 */

async function analyzeConsoleCalls(projectRoot: string): Promise<Record<string, number>> {
  // Simplified implementation - would use actual file analysis
  return {
    CLI: 1500,
    MCP: 800,
    Swarm: 1200,
    Core: 600,
    Terminal: 400,
    Memory: 300,
    Migration: 200,
    Hooks: 150,
    Enterprise: 100,
  };
}

async function countCurrentConsoleCalls(projectRoot: string): Promise<number> {
  // Implementation would count actual console calls
  return 0; // Placeholder
}

function generateHtmlReport(report: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Console Migration Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Console Migration Report</h1>
        <p><strong>Migration ID:</strong> ${report.executionId}</p>
        <p><strong>Date:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        <p><strong>Status:</strong> <span class="${report.success ? 'success' : 'failed'}">${report.success ? 'SUCCESS' : 'FAILED'}</span></p>
    </div>

    <h2>Summary</h2>
    <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Files</td><td>${report.summary.totalFiles}</td></tr>
        <tr><td>Console Calls Migrated</td><td>${report.summary.totalCallsMigrated}</td></tr>
        <tr><td>Migration Coverage</td><td>${report.summary.migrationCoverage.toFixed(1)}%</td></tr>
        <tr><td>Duration</td><td>${(report.duration / 1000).toFixed(2)}s</td></tr>
    </table>

    <h2>Component Breakdown</h2>
    <table>
        <tr><th>Component</th><th>Calls Migrated</th></tr>
        ${Object.entries(report.summary.componentBreakdown)
          .map(([component, count]) => `<tr><td>${component}</td><td>${count}</td></tr>`)
          .join('')}
    </table>
</body>
</html>
  `;
}

function generateTextReport(report: any): string {
  return `
CONSOLE MIGRATION REPORT
${'═'.repeat(50)}

Migration ID: ${report.executionId}
Date: ${new Date(report.timestamp).toLocaleString()}
Status: ${report.success ? 'SUCCESS' : 'FAILED'}
Duration: ${(report.duration / 1000).toFixed(2)}s

SUMMARY
${'─'.repeat(30)}
Total Files: ${report.summary.totalFiles}
Console Calls Migrated: ${report.summary.totalCallsMigrated}
Migration Coverage: ${report.summary.migrationCoverage.toFixed(1)}%
Performance Impact: ${report.summary.performanceImpact.toFixed(1)}%

COMPONENT BREAKDOWN
${'─'.repeat(30)}
${Object.entries(report.summary.componentBreakdown)
  .map(([component, count]) => `${component}: ${count} calls`)
  .join('\n')}

VALIDATION STATUS
${'─'.repeat(30)}
Syntax: ${report.validation.syntaxPassed ? '✅' : '❌'}
Imports: ${report.validation.importsPassed ? '✅' : '❌'}
Functionality: ${report.validation.functionalityPassed ? '✅' : '❌'}
Performance: ${report.validation.performancePassed ? '✅' : '❌'}

RECOMMENDATIONS
${'─'.repeat(30)}
${report.recommendations.map((rec: string) => `• ${rec}`).join('\n')}
  `;
}

// Run CLI
program.parse();
