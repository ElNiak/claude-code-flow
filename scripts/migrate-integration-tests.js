#!/usr/bin/env node

/**
 * Integration Test Migration Script
 *
 * Specialized migration for integration tests with async patterns
 * Created by: Test Migration Infrastructure Agent
 */

const { TestMigrationEngine } = require('./migrate-tests.js');
const fs = require('fs');
const path = require('path');

class IntegrationTestMigrator extends TestMigrationEngine {
    constructor(options = {}) {
        super({
            sourceDir: options.sourceDir || './tests/integration',
            targetDir: options.targetDir || './tests/migrated/integration',
            ...options
        });

        // Integration test specific patterns
        this.integrationPatterns = {
            asyncTest: /Deno\.test\s*\(\s*["`']([^"`']+)["`']\s*,\s*async\s+\(([^)]*)\)\s*=>\s*\{/g,
            setupTeardown: /(beforeAll|afterAll|beforeEach|afterEach)\s*\(/g,
            tempDir: /Deno\.makeTempDir\s*\(/g,
            tempFile: /Deno\.makeTempFile\s*\(/g,
            readFile: /Deno\.readTextFile\s*\(/g,
            writeFile: /Deno\.writeTextFile\s*\(/g,
            removeFile: /Deno\.remove\s*\(/g
        };
    }

    /**
     * Enhanced conversion for integration tests
     */
    async convertDenoToJest(content, filePath) {
        const result = await super.convertDenoToJest(content, filePath);

        // Apply integration test specific conversions
        result.content = this.convertAsyncPatterns(result.content);
        result.content = this.convertFileOperations(result.content);
        result.content = this.addIntegrationTestImports(result.content);
        result.content = this.addTestTimeout(result.content);

        return result;
    }

    /**
     * Convert async test patterns
     */
    convertAsyncPatterns(content) {
        // Enhanced async test conversion with proper Jest structure
        content = content.replace(this.integrationPatterns.asyncTest, (match, testName, params) => {
            const timeout = this.extractTimeout(content) || 30000;
            return `it("${testName}", async (${params}) => {`;
        });

        return content;
    }

    /**
     * Convert Deno file operations to Node.js equivalents
     */
    convertFileOperations(content) {
        // Convert Deno.makeTempDir
        content = content.replace(this.integrationPatterns.tempDir, () => {
            return 'fs.mkdtempSync(path.join(os.tmpdir(), "claude-flow-test-")';
        });

        // Convert Deno.makeTempFile
        content = content.replace(this.integrationPatterns.tempFile, () => {
            return 'fs.mkstemp(path.join(os.tmpdir(), "claude-flow-test-")';
        });

        // Convert Deno.readTextFile
        content = content.replace(this.integrationPatterns.readFile, () => {
            return 'fs.readFileSync(';
        });

        // Convert Deno.writeTextFile
        content = content.replace(this.integrationPatterns.writeFile, () => {
            return 'fs.writeFileSync(';
        });

        // Convert Deno.remove
        content = content.replace(this.integrationPatterns.removeFile, () => {
            return 'fs.rmSync(';
        });

        return content;
    }

    /**
     * Add integration test specific imports
     */
    addIntegrationTestImports(content) {
        const imports = [
            `import fs from 'fs';`,
            `import path from 'path';`,
            `import os from 'os';`,
            `import { AsyncTestUtils, MigrationTestEnv } from '../utils/migration-helpers.js';`
        ];

        if (!content.includes('import fs')) {
            return imports.join('\n') + '\n\n' + content;
        }

        return content;
    }

    /**
     * Add test timeout for integration tests
     */
    addTestTimeout(content) {
        // Check if timeout is already set
        if (!content.includes('jest.setTimeout') && !content.includes('timeout:')) {
            const timeoutLine = `jest.setTimeout(60000); // 60 second timeout for integration tests\n\n`;
            return timeoutLine + content;
        }

        return content;
    }

    /**
     * Extract timeout from test content
     */
    extractTimeout(content) {
        const timeoutMatch = content.match(/timeout[:\s]*(\d+)/i);
        return timeoutMatch ? parseInt(timeoutMatch[1]) : null;
    }

    /**
     * Enhanced validation for integration tests
     */
    async validateTestFile(filePath) {
        await super.validateTestFile(filePath);

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for proper async handling
        if (content.includes('async') && !content.includes('await')) {
            console.warn(`Integration test may be missing await statements: ${filePath}`);
        }

        // Check for timeout configuration
        if (!content.includes('jest.setTimeout') && content.includes('async')) {
            console.warn(`Integration test may need timeout configuration: ${filePath}`);
        }
    }
}

// CLI runner
async function main() {
    console.log('🔗 Starting Integration Test Migration...');

    const migrator = new IntegrationTestMigrator();

    try {
        const result = await migrator.migrate({
            verbose: process.argv.includes('--verbose'),
            dryRun: process.argv.includes('--dry-run')
        });

        console.log(`✅ Migrated ${result.migratedFiles} integration test files`);

    } catch (error) {
        console.error('❌ Integration test migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { IntegrationTestMigrator };
