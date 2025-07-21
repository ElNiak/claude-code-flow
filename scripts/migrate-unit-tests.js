#!/usr/bin/env node

/**
 * Unit Test Migration Script
 *
 * Specialized migration for unit tests with enhanced patterns
 * Created by: Test Migration Infrastructure Agent
 */

const { TestMigrationEngine } = require('./migrate-tests.js');
const fs = require('fs');
const path = require('path');

class UnitTestMigrator extends TestMigrationEngine {
    constructor(options = {}) {
        super({
            sourceDir: options.sourceDir || './tests/unit',
            targetDir: options.targetDir || './tests/migrated/unit',
            ...options
        });

        // Unit test specific patterns
        this.unitPatterns = {
            mockCreation: /const\s+(\w+)\s*=\s*createMock\s*\(/g,
            spyCreation: /const\s+(\w+)\s*=\s*spy\s*\(/g,
            stubCreation: /const\s+(\w+)\s*=\s*stub\s*\(/g,
            assertSpyCall: /assertSpyCall\s*\(\s*(\w+)\s*,\s*(\d+)/g,
            assertSpyCalls: /assertSpyCalls\s*\(\s*(\w+)\s*,\s*(\d+)/g
        };
    }

    /**
     * Enhanced conversion for unit tests
     */
    async convertDenoToJest(content, filePath) {
        const result = await super.convertDenoToJest(content, filePath);

        // Apply unit test specific conversions
        result.content = this.convertMockPatterns(result.content);
        result.content = this.convertSpyPatterns(result.content);
        result.content = this.addUnitTestImports(result.content);

        return result;
    }

    /**
     * Convert mock creation patterns
     */
    convertMockPatterns(content) {
        // Convert createMock calls to Jest mocks
        content = content.replace(this.unitPatterns.mockCreation, (match, varName) => {
            return `const ${varName} = jest.fn()`;
        });

        return content;
    }

    /**
     * Convert spy/stub patterns
     */
    convertSpyPatterns(content) {
        // Convert spy calls
        content = content.replace(this.unitPatterns.spyCreation, (match, varName) => {
            return `const ${varName} = jest.fn()`;
        });

        // Convert stub calls
        content = content.replace(this.unitPatterns.stubCreation, (match, varName) => {
            return `const ${varName} = jest.fn()`;
        });

        // Convert assertSpyCall
        content = content.replace(this.unitPatterns.assertSpyCall, (match, spyVar, callIndex) => {
            return `expect(${spyVar}).toHaveBeenNthCalledWith(${parseInt(callIndex) + 1}`;
        });

        // Convert assertSpyCalls
        content = content.replace(this.unitPatterns.assertSpyCalls, (match, spyVar, callCount) => {
            return `expect(${spyVar}).toHaveBeenCalledTimes(${callCount})`;
        });

        return content;
    }

    /**
     * Add unit test specific imports
     */
    addUnitTestImports(content) {
        if (!content.includes('../utils/migration-helpers')) {
            const importLine = `import { MigrationAssertions, MockFactory } from '../utils/migration-helpers.js';\n`;
            return importLine + content;
        }
        return content;
    }
}

// CLI runner
async function main() {
    console.log('🧪 Starting Unit Test Migration...');

    const migrator = new UnitTestMigrator();

    try {
        const result = await migrator.migrate({
            verbose: process.argv.includes('--verbose'),
            dryRun: process.argv.includes('--dry-run')
        });

        console.log(`✅ Migrated ${result.migratedFiles} unit test files`);

    } catch (error) {
        console.error('❌ Unit test migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { UnitTestMigrator };
