#!/usr/bin/env node
/**
 * File Migration Script for Completed Implementation Files
 * Updates all references before moving files to maintain system integrity
 */

import fs from 'node:fs';
import path from 'node:path';

// File mappings for migration
const FILE_MIGRATIONS = [
  {
    source: 'FINAL_SYNTHESIS_REPORT.md',
    destination: 'docs/completed/implementation-reports/FINAL_SYNTHESIS_REPORT.md',
    category: 'implementation-report'
  },
  {
    source: 'MISSION_COMPLETION_SUMMARY.md',
    destination: 'docs/completed/implementation-reports/MISSION_COMPLETION_SUMMARY.md',
    category: 'implementation-report'
  },
  {
    source: 'DEPLOYMENT_READINESS_REPORT.md',
    destination: 'docs/completed/implementation-reports/DEPLOYMENT_READINESS_REPORT.md',
    category: 'implementation-report'
  },
  {
    source: 'QUALITY_VALIDATION_REPORT.md',
    destination: 'docs/completed/validation-reports/QUALITY_VALIDATION_REPORT.md',
    category: 'validation-report'
  },
  {
    source: 'SPECIFICATION_VALIDATION_COMPLETE.md',
    destination: 'docs/completed/validation-reports/SPECIFICATION_VALIDATION_COMPLETE.md',
    category: 'validation-report'
  },
  {
    source: 'INTEGRATION_COMPLETION_VALIDATION.md',
    destination: 'docs/completed/validation-reports/INTEGRATION_COMPLETION_VALIDATION.md',
    category: 'validation-report'
  },
  {
    source: 'UNIFIED_CLI_ARCHITECTURE_SPECIFICATION.md',
    destination: 'docs/architecture/specifications/UNIFIED_CLI_ARCHITECTURE_SPECIFICATION.md',
    category: 'architecture-specification'
  }
];

// Files that need reference updates
const REFERENCE_FILES = [
  'ROOT_DIRECTORY_CLEANUP_ANALYSIS.md',
  'ROOT_FILES_ORGANIZATION_PLAN.md',
  'docs/guides/implementation/STEP_BY_STEP_MERGER_IMPLEMENTATION_PLAN.md',
  'scripts/validate-cleanup.js',
  'CLEANUP_OPPORTUNITIES.md'
];

/**
 * Update file references in content
 */
function updateReferences(content, migrations) {
  let updatedContent = content;

  migrations.forEach(({ source, destination }) => {
    // Update direct file references
    const patterns = [
      new RegExp(`\\b${source}\\b`, 'g'),
      new RegExp(`\\./${source}`, 'g'),
      new RegExp(`/${source}`, 'g'),
      new RegExp(`\\[([^\\]]*)\\]\\(${source}\\)`, 'g'),
      new RegExp(`\\[([^\\]]*)\\]\\(\\./${source}\\)`, 'g')
    ];

    patterns.forEach((pattern, index) => {
      if (index < 3) {
        // Simple replacements
        updatedContent = updatedContent.replace(pattern, destination);
      } else {
        // Markdown link replacements
        updatedContent = updatedContent.replace(pattern, `[$1](${destination})`);
      }
    });
  });

  return updatedContent;
}

/**
 * Validate file exists before migration
 */
function validateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  return true;
}

/**
 * Create backup of original file
 */
function createBackup(filePath) {
  const backupPath = `${filePath}.backup`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`📦 Backup created: ${backupPath}`);
  return backupPath;
}

/**
 * Main migration process
 */
async function migrateCompletedFiles() {
  console.log('🚀 Starting File Migration Process\n');

  // Step 1: Validate all source files exist
  console.log('📋 Step 1: Validating source files...');
  const missingFiles = [];

  FILE_MIGRATIONS.forEach(({ source }) => {
    if (!validateFile(source)) {
      missingFiles.push(source);
    }
  });

  if (missingFiles.length > 0) {
    console.error(`❌ Missing files: ${missingFiles.join(', ')}`);
    console.error('Migration aborted.');
    process.exit(1);
  }

  console.log('✅ All source files validated\n');

  // Step 2: Create destination directories
  console.log('📁 Step 2: Creating destination directories...');
  const dirs = new Set();
  FILE_MIGRATIONS.forEach(({ destination }) => {
    dirs.add(path.dirname(destination));
  });

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📂 Created directory: ${dir}`);
    }
  });

  console.log('✅ All directories ready\n');

  // Step 3: Create backups of reference files
  console.log('💾 Step 3: Creating backups...');
  const backups = [];

  REFERENCE_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      const backup = createBackup(file);
      backups.push({ original: file, backup });
    }
  });

  console.log('✅ Backups created\n');

  // Step 4: Update references in reference files
  console.log('🔄 Step 4: Updating file references...');

  REFERENCE_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const updatedContent = updateReferences(content, FILE_MIGRATIONS);

        if (content !== updatedContent) {
          fs.writeFileSync(file, updatedContent);
          console.log(`✏️  Updated references in: ${file}`);
        } else {
          console.log(`➖ No changes needed in: ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${file}:`, error.message);
      }
    }
  });

  console.log('✅ References updated\n');

  // Step 5: Move files to new locations
  console.log('📤 Step 5: Moving files...');

  FILE_MIGRATIONS.forEach(({ source, destination, category }) => {
    try {
      if (fs.existsSync(source)) {
        // Copy file to destination
        fs.copyFileSync(source, destination);
        console.log(`📋 Copied: ${source} → ${destination}`);

        // Remove original file
        fs.unlinkSync(source);
        console.log(`🗑️  Removed: ${source}`);

        console.log(`✅ Migrated ${category}: ${path.basename(source)}\n`);
      }
    } catch (error) {
      console.error(`❌ Error migrating ${source}:`, error.message);
    }
  });

  // Step 6: Create migration summary
  console.log('📊 Step 6: Creating migration summary...');

  const summary = {
    timestamp: new Date().toISOString(),
    migratedFiles: FILE_MIGRATIONS.length,
    updatedReferences: REFERENCE_FILES.length,
    categories: {
      'implementation-report': FILE_MIGRATIONS.filter(f => f.category === 'implementation-report').length,
      'validation-report': FILE_MIGRATIONS.filter(f => f.category === 'validation-report').length,
      'architecture-specification': FILE_MIGRATIONS.filter(f => f.category === 'architecture-specification').length
    },
    migrations: FILE_MIGRATIONS,
    backups: backups
  };

  fs.writeFileSync('docs/completed/migration-summary.json', JSON.stringify(summary, null, 2));
  console.log('📄 Migration summary saved: docs/completed/migration-summary.json');

  // Step 7: Validation
  console.log('\n🔍 Step 7: Validating migration...');

  let validationPassed = true;
  FILE_MIGRATIONS.forEach(({ source, destination }) => {
    if (fs.existsSync(source)) {
      console.error(`❌ Source file still exists: ${source}`);
      validationPassed = false;
    }

    if (!fs.existsSync(destination)) {
      console.error(`❌ Destination file missing: ${destination}`);
      validationPassed = false;
    } else {
      console.log(`✅ Successfully migrated: ${destination}`);
    }
  });

  if (validationPassed) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📁 Completed files are now organized in:');
    console.log('   • docs/completed/implementation-reports/');
    console.log('   • docs/completed/validation-reports/');
    console.log('   • docs/architecture/specifications/');
  } else {
    console.error('\n❌ Migration validation failed. Check errors above.');
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCompletedFiles().catch(console.error);
}

export { migrateCompletedFiles, FILE_MIGRATIONS, updateReferences };
