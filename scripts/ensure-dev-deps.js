#!/usr/bin/env node

/**
 * Ensure Development Dependencies Script
 *
 * This script ensures that devDependencies are properly installed
 * even when npm is running in production mode or has issues with
 * devDependency installation.
 *
 * Fixes the issue where TypeScript and other build tools are missing
 * despite being in package.json devDependencies.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDevDependencies() {
    try {
        console.log('🔍 Checking development dependencies...');

        // Read package.json to get devDependencies
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        const devDependencies = packageJson.devDependencies || {};
        const criticalDevDeps = [
            'typescript',
            'jest',
            '@babel/core',
            'eslint'
        ];

        // Check if critical devDependencies are missing
        const missingDeps = [];

        for (const dep of criticalDevDeps) {
            if (devDependencies[dep]) {
                const depPath = path.join(process.cwd(), 'node_modules', dep);
                if (!fs.existsSync(depPath)) {
                    missingDeps.push(dep);
                }
            }
        }

        // Check if TypeScript binary specifically exists
        const tscBinary = path.join(process.cwd(), 'node_modules', '.bin', 'tsc');
        const typescriptExists = fs.existsSync(path.join(process.cwd(), 'node_modules', 'typescript'));

        if (!fs.existsSync(tscBinary) || !typescriptExists) {
            missingDeps.push('typescript');
        }

        if (missingDeps.length > 0) {
            console.log(`⚠️  Missing development dependencies: ${missingDeps.join(', ')}`);
            console.log('📦 Installing missing devDependencies...');

            // Force install devDependencies with proper environment
            try {
                console.log('🔄 Method 1: Installing with NODE_ENV=development...');
                execSync('npm install --no-audit --no-fund', {
                    stdio: 'inherit',
                    cwd: process.cwd(),
                    env: { ...process.env, NODE_ENV: 'development' }
                });
                console.log('✅ Development dependencies installed successfully!');
            } catch (error) {
                try {
                    // Fallback method
                    console.log('⚠️  Method 1 failed, trying --production=false...');
                    execSync('npm install --production=false --no-audit --no-fund', {
                        stdio: 'inherit',
                        cwd: process.cwd()
                    });
                    console.log('✅ Development dependencies installed via fallback method!');
                } catch (error2) {
                    // Last resort: install specific packages
                    console.log('⚠️  Method 2 failed, installing specific packages...');
                    const specificDeps = missingDeps.map(dep => `${dep}@${devDependencies[dep] || 'latest'}`).join(' ');
                    execSync(`npm install --save-dev ${specificDeps}`, {
                        stdio: 'inherit',
                        cwd: process.cwd()
                    });
                    console.log('✅ Specific packages installed successfully!');
                }
            }
        } else {
            console.log('✅ All critical development dependencies are present');
        }

        // Verify TypeScript is working
        try {
            execSync('npx tsc --version', { stdio: 'pipe', cwd: process.cwd() });
            console.log('✅ TypeScript compiler is operational');
        } catch (error) {
            console.log('❌ TypeScript compiler verification failed');
            throw error;
        }

    } catch (error) {
        console.error('❌ Failed to ensure development dependencies:', error.message);
        process.exit(1);
    }
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
    ensureDevDependencies();
}

export { ensureDevDependencies };
