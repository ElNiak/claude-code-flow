#!/usr/bin/env node

/**
 * Claude Flow Test Migration Infrastructure
 *
 * Comprehensive test migration system for converting Deno tests to Jest
 * Created by: Test Migration Infrastructure Agent
 *
 * Features:
 * - Deno.test to Jest conversion utilities
 * - Automated test migration scripts
 * - Test validation and verification
 * - Batch migration capabilities
 * - Migration rollback support
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestMigrationEngine {
    constructor(options = {}) {
        this.sourceDir = options.sourceDir || './tests';
        this.targetDir = options.targetDir || './tests/migrated';
        this.backupDir = options.backupDir || './tests/backup';
        this.patterns = {
            denoTest: /Deno\.test\s*\(\s*["`']([^"`']+)["`']\s*,\s*(.+)\)/g,
            denoTestAsync: /Deno\.test\s*\(\s*["`']([^"`']+)["`']\s*,\s*async\s+(.+)\)/g,
            denoAssert: /assert(Equals|Exists|Rejects|Throws|StringIncludes|ArrayIncludes|ObjectMatch|InstanceOf|NotEquals|StrictEquals)\s*\(/g,
            denoImports: /from\s+["`']https:\/\/deno\.land\/[^"`']+["`']/g,
            stdImports: /from\s+["`']https:\/\/deno\.land\/std@[^"`']+["`']/g
        };
        this.conversions = new Map();
        this.validationErrors = [];
        this.stats = {
            totalFiles: 0,
            migratedFiles: 0,
            errors: 0,
            testCases: 0,
            assertions: 0
        };
    }

    /**
     * Main migration entry point
     */
    async migrate(options = {}) {
        console.log('🚀 Starting Test Migration Infrastructure...');

        try {
            await this.setupMigrationEnvironment();
            await this.discoverTestFiles();
            await this.processTestFiles(options);
            await this.validateMigratedTests();
            await this.generateMigrationReport();

            console.log('✅ Test migration completed successfully!');
            return this.stats;

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    }

    /**
     * Setup migration environment and directories
     */
    async setupMigrationEnvironment() {
        console.log('📁 Setting up migration environment...');

        // Create target directories
        const dirs = [this.targetDir, this.backupDir,
                     path.join(this.targetDir, 'unit'),
                     path.join(this.targetDir, 'integration'),
                     path.join(this.targetDir, 'e2e'),
                     path.join(this.targetDir, 'utils')];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`  Created: ${dir}`);
            }
        });

        // Copy jest configuration
        await this.ensureJestConfig();
    }

    /**
     * Discover all test files in source directory
     */
    async discoverTestFiles() {
        console.log('🔍 Discovering test files...');

        const testFiles = this.findTestFiles(this.sourceDir);
        this.stats.totalFiles = testFiles.length;

        console.log(`  Found ${testFiles.length} test files`);
        return testFiles;
    }

    /**
     * Find all test files recursively
     */
    findTestFiles(dir, files = []) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                this.findTestFiles(fullPath, files);
            } else if (entry.isFile() && this.isTestFile(entry.name)) {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * Check if file is a test file
     */
    isTestFile(filename) {
        return /\.(test|spec)\.(ts|js)$/.test(filename) ||
               filename.includes('_test.') ||
               filename.includes('.test.');
    }

    /**
     * Process all discovered test files
     */
    async processTestFiles(options = {}) {
        console.log('⚙️ Processing test files...');

        const testFiles = this.findTestFiles(this.sourceDir);
        const processOptions = {
            dryRun: options.dryRun || false,
            verbose: options.verbose || false,
            force: options.force || false
        };

        for (const filePath of testFiles) {
            try {
                await this.processTestFile(filePath, processOptions);
                this.stats.migratedFiles++;
            } catch (error) {
                console.error(`  ❌ Failed to process ${filePath}:`, error.message);
                this.stats.errors++;
            }
        }
    }

    /**
     * Process individual test file
     */
    async processTestFile(filePath, options = {}) {
        if (options.verbose) {
            console.log(`  Processing: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const migrated = await this.convertDenoToJest(content, filePath);

        if (!options.dryRun) {
            // Create backup
            const backupPath = this.getBackupPath(filePath);
            fs.mkdirSync(path.dirname(backupPath), { recursive: true });
            fs.copyFileSync(filePath, backupPath);

            // Save migrated file
            const targetPath = this.getTargetPath(filePath);
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, migrated.content);

            // Store conversion metadata
            this.conversions.set(filePath, {
                originalPath: filePath,
                targetPath: targetPath,
                backupPath: backupPath,
                stats: migrated.stats,
                timestamp: new Date().toISOString()
            });
        }

        return migrated;
    }

    /**
     * Convert Deno test content to Jest
     */
    async convertDenoToJest(content, filePath) {
        const stats = { testCases: 0, assertions: 0, imports: 0 };
        let converted = content;

        // Convert imports
        converted = this.convertImports(converted, stats);

        // Convert test declarations
        converted = this.convertTestDeclarations(converted, stats);

        // Convert assertions
        converted = this.convertAssertions(converted, stats);

        // Add Jest imports if needed
        converted = this.addJestImports(converted);

        // Update module paths
        converted = this.updateModulePaths(converted);

        this.stats.testCases += stats.testCases;
        this.stats.assertions += stats.assertions;

        return {
            content: converted,
            stats: stats,
            originalPath: filePath
        };
    }

    /**
     * Convert Deno imports to Jest compatible imports
     */
    convertImports(content, stats) {
        // Convert Deno standard library imports
        content = content.replace(this.patterns.stdImports, (match) => {
            stats.imports++;
            if (match.includes('/testing/')) {
                return 'from "../test.utils.js"';
            }
            if (match.includes('/assert/')) {
                return 'from "../test.utils.js"';
            }
            return 'from "@jest/globals"';
        });

        // Convert other Deno.land imports
        content = content.replace(this.patterns.denoImports, (match) => {
            stats.imports++;
            return 'from "@jest/globals"';
        });

        return content;
    }

    /**
     * Convert Deno.test declarations to Jest describe/it blocks
     */
    convertTestDeclarations(content, stats) {
        // Convert async Deno.test
        content = content.replace(this.patterns.denoTestAsync, (match, testName, testBody) => {
            stats.testCases++;
            return `it("${testName}", async ${testBody})`;
        });

        // Convert regular Deno.test
        content = content.replace(this.patterns.denoTest, (match, testName, testBody) => {
            stats.testCases++;
            return `it("${testName}", ${testBody})`;
        });

        // Wrap standalone tests in describe blocks
        if (stats.testCases > 0 && !content.includes('describe(')) {
            const fileName = path.basename(this.currentFile || 'test', '.test.ts');
            content = `describe("${fileName}", () => {\n${content}\n});`;
        }

        return content;
    }

    /**
     * Convert Deno assertions to Jest expectations
     */
    convertAssertions(content, stats) {
        const assertionMappings = {
            'assertEquals': 'expect($2).toBe($1)',
            'assertExists': 'expect($1).toBeDefined()',
            'assertRejects': 'await expect($1).rejects.toThrow()',
            'assertThrows': 'expect($1).toThrow()',
            'assertStringIncludes': 'expect($1).toContain($2)',
            'assertArrayIncludes': 'expect($1).toContain($2)',
            'assertObjectMatch': 'expect($1).toMatchObject($2)',
            'assertInstanceOf': 'expect($1).toBeInstanceOf($2)',
            'assertNotEquals': 'expect($2).not.toBe($1)',
            'assertStrictEquals': 'expect($2).toStrictEqual($1)'
        };

        content = content.replace(this.patterns.denoAssert, (match, assertType) => {
            stats.assertions++;
            const mapping = assertionMappings[`assert${assertType}`];
            return mapping ? mapping.replace(/\$(\d+)/g, (m, n) => `\$${n}`) : match;
        });

        return content;
    }

    /**
     * Add necessary Jest imports
     */
    addJestImports(content) {
        if (!content.includes('import') && !content.includes('require')) {
            return `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';\n\n${content}`;
        }

        // Check if Jest imports are already present
        if (!content.includes('@jest/globals') && !content.includes('../test.utils')) {
            const importLine = `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';\n`;
            return importLine + content;
        }

        return content;
    }

    /**
     * Update module paths for Jest compatibility
     */
    updateModulePaths(content) {
        // Convert relative imports to use .js extension
        content = content.replace(/from\s+["`'](\.[^"`']+)(?<!\.js)["`']/g, (match, path) => {
            if (path.endsWith('.ts')) {
                return match.replace('.ts', '.js');
            }
            if (!path.includes('.')) {
                return match.replace(path, `${path}.js`);
            }
            return match;
        });

        return content;
    }

    /**
     * Validate migrated tests
     */
    async validateMigratedTests() {
        console.log('✅ Validating migrated tests...');

        const migratedFiles = this.findTestFiles(this.targetDir);

        for (const filePath of migratedFiles) {
            try {
                await this.validateTestFile(filePath);
            } catch (error) {
                this.validationErrors.push({
                    file: filePath,
                    error: error.message
                });
            }
        }

        if (this.validationErrors.length > 0) {
            console.warn(`⚠️ Found ${this.validationErrors.length} validation errors`);
        }
    }

    /**
     * Validate individual test file
     */
    async validateTestFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Basic syntax validation
        try {
            // Check for common Jest patterns
            if (!content.includes('describe') && !content.includes('it')) {
                throw new Error('No Jest test patterns found');
            }

            // Check for remaining Deno patterns
            if (content.includes('Deno.test')) {
                throw new Error('Unconverted Deno.test found');
            }

            // Check for proper imports
            if (!content.includes('@jest/globals') && !content.includes('../test.utils')) {
                console.warn(`File may be missing Jest imports: ${filePath}`);
            }

        } catch (error) {
            throw new Error(`Validation failed: ${error.message}`);
        }
    }

    /**
     * Generate migration report
     */
    async generateMigrationReport() {
        console.log('📊 Generating migration report...');

        const report = {
            timestamp: new Date().toISOString(),
            summary: this.stats,
            conversions: Array.from(this.conversions.values()),
            validationErrors: this.validationErrors,
            totalDuration: Date.now() - this.startTime
        };

        const reportPath = path.join(this.targetDir, 'migration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        const markdownPath = path.join(this.targetDir, 'MIGRATION_REPORT.md');
        fs.writeFileSync(markdownPath, markdownReport);

        console.log(`📄 Report saved to: ${reportPath}`);
        console.log(`📄 Markdown report: ${markdownPath}`);

        return report;
    }

    /**
     * Generate markdown migration report
     */
    generateMarkdownReport(report) {
        return `# Test Migration Report

## Summary
- **Total Files**: ${report.summary.totalFiles}
- **Migrated Files**: ${report.summary.migratedFiles}
- **Errors**: ${report.summary.errors}
- **Test Cases**: ${report.summary.testCases}
- **Assertions**: ${report.summary.assertions}
- **Duration**: ${Math.round(report.totalDuration / 1000)}s

## Migration Details

### Successfully Migrated Files
${report.conversions.map(c => `- \`${c.originalPath}\` → \`${c.targetPath}\``).join('\n')}

### Validation Errors
${report.validationErrors.length > 0
    ? report.validationErrors.map(e => `- **${e.file}**: ${e.error}`).join('\n')
    : 'No validation errors found! 🎉'
}

## Next Steps
1. Review migrated tests in \`tests/migrated/\`
2. Run Jest tests: \`npm test\`
3. Fix any remaining issues
4. Remove backup files when satisfied

Generated: ${report.timestamp}
`;
    }

    /**
     * Rollback migration
     */
    async rollback(options = {}) {
        console.log('🔄 Rolling back migration...');

        for (const [originalPath, conversion] of this.conversions) {
            try {
                if (fs.existsSync(conversion.backupPath)) {
                    fs.copyFileSync(conversion.backupPath, originalPath);
                    console.log(`  Restored: ${originalPath}`);
                }

                if (fs.existsSync(conversion.targetPath)) {
                    fs.unlinkSync(conversion.targetPath);
                    console.log(`  Removed: ${conversion.targetPath}`);
                }
            } catch (error) {
                console.error(`  Failed to rollback ${originalPath}:`, error.message);
            }
        }

        console.log('✅ Rollback completed');
    }

    /**
     * Utility methods
     */
    getBackupPath(filePath) {
        const relativePath = path.relative(this.sourceDir, filePath);
        return path.join(this.backupDir, relativePath);
    }

    getTargetPath(filePath) {
        const relativePath = path.relative(this.sourceDir, filePath);
        return path.join(this.targetDir, relativePath);
    }

    async ensureJestConfig() {
        const jestConfigPath = path.join(process.cwd(), 'jest.config.js');

        if (!fs.existsSync(jestConfigPath)) {
            console.log('⚙️ Creating Jest configuration...');

            const jestConfig = `module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    roots: ['<rootDir>/tests/migrated'],
    testMatch: [
        '<rootDir>/tests/migrated/**/*.test.ts',
        '<rootDir>/tests/migrated/**/*.test.js'
    ],
    transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }]
    },
    moduleNameMapper: {
        '^(\\\\.{1,2}/.*)\\\\.js$': '$1'
    }
};`;

            fs.writeFileSync(jestConfigPath, jestConfig);
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run'),
        verbose: args.includes('--verbose'),
        force: args.includes('--force'),
        rollback: args.includes('--rollback')
    };

    const migrator = new TestMigrationEngine();

    try {
        if (options.rollback) {
            await migrator.rollback(options);
        } else {
            await migrator.migrate(options);
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Export for programmatic use
module.exports = { TestMigrationEngine };

// Run if called directly
if (require.main === module) {
    main();
}
