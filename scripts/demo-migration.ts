#!/usr/bin/env tsx

/**
 * Demo Migration Script
 * Demonstrates console call migration on a small subset of files
 * for testing and validation before full migration
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { ConsoleMigration } from '../src/utils/console-migration.js';
import { ComponentType } from '../src/core/logger.js';

interface DemoResult {
  file: string;
  component: ComponentType;
  originalCalls: number;
  migratedCalls: number;
  success: boolean;
  error?: string;
}

async function runDemoMigration(): Promise<void> {
  console.log('🧪 Running Demo Console Migration');
  console.log('═'.repeat(50));

  const projectRoot = process.cwd();

  // Select a few test files for demonstration
  const testFiles = [
    { path: 'src/core/config.ts', component: 'Core' as ComponentType },
    { path: 'src/core/event-bus.ts', component: 'Core' as ComponentType },
    { path: 'src/migration/logger.ts', component: 'Migration' as ComponentType },
    { path: 'src/cli/simple-commands/init/index.js', component: 'CLI' as ComponentType },
  ];

  const results: DemoResult[] = [];

  console.log('📁 Processing demo files...');

  for (const testFile of testFiles) {
    const filePath = path.join(projectRoot, testFile.path);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Count original console calls
      const originalContent = await fs.readFile(filePath, 'utf-8');
      const originalCalls = (
        originalContent.match(/console\.(log|info|warn|error|debug)\s*\(/g) || []
      ).length;

      console.log(`\n🔄 Processing: ${testFile.path}`);
      console.log(`📊 Original console calls: ${originalCalls}`);

      if (originalCalls === 0) {
        console.log('✅ No console calls to migrate');
        results.push({
          file: testFile.path,
          component: testFile.component,
          originalCalls: 0,
          migratedCalls: 0,
          success: true,
        });
        continue;
      }

      // Run migration
      const migrationResult = await ConsoleMigration.migrateFile(filePath, testFile.component);

      if (migrationResult.success) {
        console.log(`✅ Migration successful: ${migrationResult.totalReplacements} calls migrated`);
        console.log(`📝 Patterns found: ${migrationResult.patterns.join(', ')}`);

        // Validate the migration
        const validation = await ConsoleMigration.validateFileM(filePath, testFile.component);
        if (validation.isValid) {
          console.log('✅ Validation passed');
        } else {
          console.log('⚠️ Validation warnings:');
          validation.issues.forEach((issue) => console.log(`  • ${issue}`));
          validation.suggestions.forEach((suggestion) => console.log(`  💡 ${suggestion}`));
        }

        results.push({
          file: testFile.path,
          component: testFile.component,
          originalCalls,
          migratedCalls: migrationResult.totalReplacements,
          success: true,
        });
      } else {
        console.log(`❌ Migration failed: ${migrationResult.error}`);
        results.push({
          file: testFile.path,
          component: testFile.component,
          originalCalls,
          migratedCalls: 0,
          success: false,
          error: migrationResult.error,
        });
      }
    } catch (error) {
      console.log(
        `❌ File processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      results.push({
        file: testFile.path,
        component: testFile.component,
        originalCalls: 0,
        migratedCalls: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Print summary
  printDemoSummary(results);

  // Test the migrated logging
  await testMigratedLogging();

  // Offer rollback option
  await offerRollback(results.filter((r) => r.success && r.migratedCalls > 0));
}

function printDemoSummary(results: DemoResult[]): void {
  console.log('\n📊 DEMO MIGRATION SUMMARY');
  console.log('═'.repeat(50));

  const totalFiles = results.length;
  const successfulFiles = results.filter((r) => r.success).length;
  const totalOriginalCalls = results.reduce((sum, r) => sum + r.originalCalls, 0);
  const totalMigratedCalls = results.reduce((sum, r) => sum + r.migratedCalls, 0);

  console.log(`📄 Files processed: ${successfulFiles}/${totalFiles}`);
  console.log(`🔄 Console calls migrated: ${totalMigratedCalls}/${totalOriginalCalls}`);

  console.log('\n📋 FILE DETAILS:');
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(
      `  ${status} ${result.file} (${result.component}): ${result.migratedCalls}/${result.originalCalls} calls`,
    );
    if (result.error) {
      console.log(`    ❌ Error: ${result.error}`);
    }
  }

  if (totalMigratedCalls > 0) {
    console.log('\n🎯 NEXT STEPS:');
    console.log('  1. Test the application to ensure functionality is preserved');
    console.log('  2. Check that component-specific logging is working correctly');
    console.log('  3. Review debug output and correlation tracking');
    console.log('  4. If satisfied, run full migration: npm run migrate');
  }
}

async function testMigratedLogging(): Promise<void> {
  console.log('\n🧪 Testing migrated logging functionality...');

  try {
    // Import and test ConsoleMigration
    console.log('📝 Testing ConsoleMigration methods...');

    ConsoleMigration.info('Core', 'Test info message from demo', { testData: 'example' });
    ConsoleMigration.warn('CLI', 'Test warning message from demo');
    ConsoleMigration.debug('Swarm', 'Test debug message from demo', { correlationId: 'demo-123' });

    console.log('✅ ConsoleMigration methods working correctly');

    // Test component-specific loggers
    console.log('📝 Testing component loggers...');

    const { ComponentLoggerFactory } = await import('../src/core/logger.js');

    ComponentLoggerFactory.initializeDebugLogger({
      level: 'debug',
      format: 'text',
      destination: 'console',
    });

    const coreLogger = ComponentLoggerFactory.getCoreLogger('demo-correlation-id');
    coreLogger.info('Demo migration test completed successfully');
    coreLogger.debug('Component-specific logging is operational', {
      demoMode: true,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Component loggers working correctly');
  } catch (error) {
    console.log(
      `❌ Logging test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function offerRollback(migratedFiles: DemoResult[]): Promise<void> {
  if (migratedFiles.length === 0) {
    return;
  }

  console.log('\n🔄 ROLLBACK OPTIONS:');
  console.log('If you want to revert the changes, you can:');
  console.log('  1. Use the backup files created during migration');
  console.log('  2. Run git checkout to revert changes');
  console.log('  3. Use the rollback command: npm run migrate:rollback');

  console.log('\n📁 Backup files created:');
  for (const file of migratedFiles) {
    console.log(`  • ${file.file}.migration-backup`);
  }

  // Interactive rollback (commented out for demo)
  /*
  try {
    const { default: inquirer } = await import('inquirer');
    const { shouldRollback } = await inquirer.prompt([{
      type: 'confirm',
      name: 'shouldRollback',
      message: 'Would you like to rollback the demo migration now?',
      default: false
    }]);

    if (shouldRollback) {
      console.log('🔄 Rolling back demo migration...');

      for (const file of migratedFiles) {
        const result = await ConsoleMigration.rollbackFile(path.join(process.cwd(), file.file));
        if (result.success) {
          console.log(`✅ Rolled back: ${file.file}`);
        } else {
          console.log(`❌ Rollback failed for ${file.file}: ${result.error}`);
        }
      }

      console.log('✅ Demo rollback completed');
    }
  } catch (error) {
    // inquirer not available, skip interactive rollback
  }
  */
}

// CLI interface - PKG-compatible main module detection
const __filename = process.argv[1] || require.main?.filename || '';
const isMainModule = process.argv[1] && process.argv[1].endsWith('/demo-migration.ts');
if (isMainModule) {
  runDemoMigration().catch((error) => {
    console.error('❌ Demo migration failed:', error);
    process.exit(1);
  });
}

export default runDemoMigration;
