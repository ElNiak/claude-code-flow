# PHASE 1: CLI CONSOLIDATION - DETAILED IMPLEMENTATION DOCUMENT

## Executive Summary

This document provides comprehensive implementation details for consolidating the Claude Flow CLI system from **6 different CLI entry points** into a **single TypeScript CLI**. All code references have been systematically verified against the current codebase.

## Current State Analysis (Verified)

### Existing CLI Implementations

#### 1. **src/cli/simple-cli.ts** (Primary TypeScript Implementation)
```typescript
// Line 1-2: Verified shebang and imports
#!/usr/bin/env node
import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";

// Line 32: Current version
const VERSION = "2.0.0-alpha.50";

// Lines 34-38: Help system
function printHelp() {
    printBanner(VERSION);
    printUsage();
    printFooter();
}
```
**Status**: Primary implementation with advanced features
**Lines of Code**: ~800+ lines
**Dependencies**: command-registry.js, help-utils.ts, utils.js

#### 2. **src/cli/simple-cli.js** (Legacy JavaScript Implementation)
```javascript
// Line 1-6: Verified header
#!/usr/bin/env node
/**
 * Simple CLI wrapper for Claude-Flow (JavaScript version)
 * This version avoids TypeScript issues in node_modules
 */

// Line 31: Version mismatch
const VERSION = "2.0.0-alpha.49";

// Lines 33-35: Basic help
function printHelp() {
    console.log(getMainHelp());
}
```
**Status**: Legacy version (alpha.49 vs alpha.50)
**Lines of Code**: ~600+ lines
**Dependencies**: command-registry.js, help-text.js, node-compat.js

#### 3. **Package.json Main Entry Point** (Verified)
```json
// Line 5: Current main entry
"main": "dist/cli/simple-cli.js",

// Line 10-12: Dev scripts pointing to TypeScript
"dev": "tsx src/cli/simple-cli.ts",
"dev:tsx": "tsx src/cli/main.ts",
```
**Issue**: Main points to JS but dev uses TS

#### 4. **Other CLI Files** (Verified locations)
- `src/cli/unified-cli-core.ts` - Attempted unification
- `src/cli/optimized-cli-core.ts` - Performance variant
- `src/cli/performance-optimized-cli.ts` - Additional optimization
- `src/cli/swarm-standalone.js` - Standalone swarm CLI implementation

### Dependencies Analysis (Verified)

#### Import/Export Relationships
```typescript
// simple-cli.ts imports (verified lines 14-28)
import {
    executeCommand,
    hasCommand,
    listCommands,
    showCommandHelp,
} from "./command-registry.js";
import { parseFlags } from "./utils.js";
import {
    printBanner,
    printUsage,
    printFooter,
    categorizeCommands,
    printCommandSection,
    type CommandWithMetadata
} from "./help-utils.js";
```

#### Command Registry Integration (Verified)
```javascript
// command-registry.js (lines verified)
export const commandRegistry = new Map();
export function registerCoreCommands() { /* ... */ }
export function executeCommand(name, subArgs, flags) { /* ... */ }
```

## Implementation Plan

### STEP 1: Pre-Implementation Verification

#### 1.1 Verify Current Test References
**Verified Test Files Referencing simple-cli**:
- `tests/unit/cli/commands/init/rollback.test.ts` (13 references)
- `tests/integration/cli-integration.test.js` (1 reference)
- `tests/migrated/cli/hive-mind-cli.test.js` (67 references)
- `scripts/prepare-publish.js` (4 references)

#### 1.2 Build System Verification
```json
// package.json scripts (verified)
"scripts": {
    "dev": "tsx src/cli/simple-cli.ts",           // Uses TypeScript
    "start": "./start-optimized.sh dist/cli/simple-cli.js", // Uses JavaScript
    "mcp:start": "node src/mcp/stdio-server-complete.js"
}
```

### STEP 2: Create Unified CLI Implementation

#### 2.1 New File: `src/cli/cli.ts`
```typescript
#!/usr/bin/env node

/**
 * ABOUTME: CLI implementation consolidating all CLI variants
 * ABOUTME: Single TypeScript entry point with comprehensive feature set
 */

import { spawn } from "node:child_process";
import { randomUUID as generateId } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
    executeCommand,
    hasCommand,
    listCommands,
    showCommandHelp,
    registerCoreCommands
} from "./command-registry.js";
import { parseFlags } from "./utils.js";
import {
    printBanner,
    printUsage,
    printFooter,
    categorizeCommands,
    printCommandSection,
    type CommandWithMetadata
} from "./help-utils.js";
import { getErrorMessage } from "../utils/error-handler.js";

const VERSION = "2.0.0-alpha.50";

class CLI {
    private initialized = false;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        if (this.initialized) return;

        // Register core commands
        registerCoreCommands();

        // Set up error handlers
        process.on('uncaughtException', this.handleError.bind(this));
        process.on('unhandledRejection', this.handleError.bind(this));

        this.initialized = true;
    }

    private handleError(error: unknown) {
        console.error('❌ Error:', getErrorMessage(error));
        process.exit(1);
    }

    public async run(args: string[] = process.argv.slice(2)) {
        await this.initialize();

        if (args.length === 0) {
            this.printHelp();
            return;
        }

        const [command, ...subArgs] = args;
        const flags = parseFlags(subArgs);

        // Handle global flags
        if (flags.version || command === '--version') {
            this.printVersion();
            return;
        }

        if (flags.help || command === '--help' || command === 'help') {
            if (subArgs.length > 0 && hasCommand(subArgs[0])) {
                await showCommandHelp(subArgs[0]);
            } else {
                this.printHelp();
            }
            return;
        }

        // Execute command
        if (hasCommand(command)) {
            try {
                await executeCommand(command, subArgs, flags);
            } catch (error) {
                this.handleError(error);
            }
        } else {
            console.error(`❌ Unknown command: ${command}`);
            console.log('\nAvailable commands:');
            this.showCommands();
            process.exit(1);
        }
    }

    private printHelp() {
        printBanner(VERSION);
        printUsage();
        this.showCommands();
        printFooter();
    }

    private printVersion() {
        console.log(`Claude-Flow v${VERSION}`);
    }

    private showCommands() {
        const commands = listCommands();
        const categorized = categorizeCommands(commands);

        for (const [category, categoryCommands] of Object.entries(categorized)) {
            printCommandSection(category, categoryCommands);
        }
    }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const cli = new CLI();
    cli.run().catch(console.error);
}

export default CLI;
```

### STEP 3: Update Package.json

#### 3.1 Main Entry Point Update
```json
{
  "main": "dist/cli/cli.js",
  "bin": {
    "claude-flow": "./bin/claude-flow"
  },
  "scripts": {
    "dev": "tsx src/cli/cli.ts",
    "dev:tsx": "tsx src/cli/cli.ts",
    "start": "./start-optimized.sh dist/cli/cli.js",
    "build": "npm run ensure-deps && npm run clean && npm run update-version && npm run build:tsx",
    "build:tsx": "npm run clean && npx tsc"
  }
}
```

#### 3.2 Binary Update: `bin/claude-flow`
```bash
#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Check if built version exists
const builtCLI = path.join(__dirname, '../dist/cli/cli.js');
const sourceCLI = path.join(__dirname, '../src/cli/cli.ts');

if (fs.existsSync(builtCLI)) {
    require(builtCLI);
} else if (fs.existsSync(sourceCLI)) {
    // Development mode - use tsx
    const { spawn } = require('child_process');
    const child = spawn('npx', ['tsx', sourceCLI, ...process.argv.slice(2)], {
        stdio: 'inherit',
        cwd: path.dirname(sourceCLI)
    });
    child.on('exit', process.exit);
} else {
    console.error('❌ Claude Flow CLI not found. Please run: npm run build');
    process.exit(1);
}
```

### STEP 4: File Modifications

#### 4.1 Files to DELETE
```bash
# Remove redundant CLI implementations
rm src/cli/simple-cli.js
rm src/cli/unified-cli-core.ts
rm src/cli/optimized-cli-core.ts
rm src/cli/performance-optimized-cli.ts
rm src/cli/swarm-standalone.js

# Remove legacy compatibility files
rm src/cli/node-compat.js
rm src/cli/help-text.js
```

#### 4.2 Files to MODIFY

##### Update TypeScript Config: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "backup"
  ]
}
```

##### Update Command Registry Import: `src/cli/command-registry.js`
```javascript
// Line 772: Update import path (verified current line)
const { generateUsageFromMetadata, generateOptionsHelp } = await import('./command-metadata.js');
```

### STEP 5: Test Updates

#### 5.1 Update Test References (Automated Script)
```bash
#!/bin/bash
# update-test-references.sh

echo "Updating test references from simple-cli to cli..."

# Files to update (verified from search results)
files=(
    "tests/unit/cli/commands/init/rollback.test.ts"
    "tests/integration/cli-integration.test.js"
    "tests/migrated/cli/hive-mind-cli.test.js"
    "scripts/prepare-publish.js"
    # Add all other files found in search
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        sed -i.bak 's/simple-cli\.ts/cli.ts/g' "$file"
        sed -i.bak 's/simple-cli\.js/cli.js/g' "$file"
        sed -i.bak 's/src\/cli\/simple-cli/src\/cli\/cli/g' "$file"
        sed -i.bak 's/dist\/cli\/simple-cli/dist\/cli\/cli/g' "$file"
        rm "$file.bak"
        echo "✅ Updated $file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "✅ All test references updated"
```

#### 5.2 Update Individual Test Files

##### Example: `tests/integration/cli-integration.test.js`
```javascript
// Before (line 14):
const cliPath = path.join(rootDir, "src/cli/simple-cli.js");

// After:
const cliPath = path.join(rootDir, "src/cli/cli.ts");
```

### STEP 6: Build System Integration

#### 6.1 Update Build Scripts
```bash
# scripts/build-cli.sh
#!/bin/bash

echo "Building CLI..."

# Ensure TypeScript is available
npm run ensure-deps

# Clean previous builds
npm run clean

# Update version in source
npm run update-version

# Build TypeScript
npx tsc

# Verify build
if [ -f "dist/cli/cli.js" ]; then
    echo "✅ CLI built successfully"

    # Test basic functionality
    node dist/cli/cli.js --version

    if [ $? -eq 0 ]; then
        echo "✅ CLI test passed"
    else
        echo "❌ CLI test failed"
        exit 1
    fi
else
    echo "❌ CLI build failed"
    exit 1
fi
```

#### 6.2 Update Start Scripts
```bash
# start-optimized.sh (update to use cli)
#!/bin/bash

CLI_PATH="$1"
shift

# Replace simple-cli references with cli
if [[ "$CLI_PATH" == *"simple-cli"* ]]; then
    CLI_PATH="${CLI_PATH/simple-cli/cli}"
fi

# Continue with existing optimization logic
exec node "$CLI_PATH" "$@"
```

### STEP 7: Validation & Testing

#### 7.1 Pre-Migration Tests
```bash
# Run existing tests before migration
npm test

# Capture current CLI output
node src/cli/simple-cli.ts --help > pre-migration-help.txt
node src/cli/simple-cli.ts --version > pre-migration-version.txt
```

#### 7.2 Post-Migration Validation
```bash
# Build new CLI
npm run build

# Test CLI
node dist/cli/cli.js --help > post-migration-help.txt
node dist/cli/cli.js --version > post-migration-version.txt

# Compare outputs
diff pre-migration-help.txt post-migration-help.txt
diff pre-migration-version.txt post-migration-version.txt

# Run all tests with new CLI
npm test
```

#### 7.3 Integration Tests
```typescript
// tests/cli/cli-integration.test.ts
import { describe, it, expect } from '@jest/globals';
import { spawn } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(__dirname, '../../dist/cli/cli.js');

describe('CLI Integration', () => {
    it('should display version', (done) => {
        const child = spawn('node', [CLI_PATH, '--version']);
        let output = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.on('close', (code) => {
            expect(code).toBe(0);
            expect(output).toMatch(/Claude-Flow v\d+\.\d+\.\d+/);
            done();
        });
    });

    it('should display help', (done) => {
        const child = spawn('node', [CLI_PATH, '--help']);
        let output = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.on('close', (code) => {
            expect(code).toBe(0);
            expect(output).toContain('Claude-Flow');
            expect(output).toContain('Available commands');
            done();
        });
    });

    it('should execute commands', (done) => {
        const child = spawn('node', [CLI_PATH, 'status']);

        child.on('close', (code) => {
            expect(code).toBe(0);
            done();
        });
    });
});
```

### STEP 8: Documentation Updates

#### 8.1 Update README.md
```markdown
# Claude Flow - Installation & Usage

## Installation
```bash
npm install -g claude-flow
```

## Usage
```bash
# Show version
claude-flow --version

# Show help
claude-flow --help

# Run commands
claude-flow init --sparc
claude-flow start
```

## Development
```bash
# Run from source
npm run dev

# Build for production
npm run build
```
```

#### 8.2 Update CLI Documentation
```markdown
# CLI Reference

The Claude Flow CLI provides a unified interface for all operations.

## Entry Points
- **Production**: `claude-flow` (via npm)
- **Development**: `npm run dev`
- **Built**: `node dist/cli/cli.js`

## Architecture
- Single TypeScript implementation
- Modular command system via command-registry
- Consistent error handling and help system
```

## Implementation Timeline

### Week 1: Preparation & Setup
- **Day 1-2**: Create cli.ts implementation
- **Day 3**: Update package.json and build configuration
- **Day 4**: Create test update scripts
- **Day 5**: Validate build system changes

### Week 2: Migration & Testing
- **Day 1**: Execute file deletions and updates
- **Day 2**: Run comprehensive test suite
- **Day 3-4**: Fix any compatibility issues
- **Day 5**: Performance testing and optimization

### Week 3: Validation & Documentation
- **Day 1-2**: End-to-end integration testing
- **Day 3**: Update documentation
- **Day 4**: User acceptance testing
- **Day 5**: Final validation and deployment

## Risk Mitigation

### High-Risk Areas
1. **Test References**: 67+ files reference simple-cli
2. **Build Scripts**: Multiple scripts depend on CLI paths
3. **Binary Distribution**: Package distribution may be affected

### Mitigation Strategies
1. **Automated Updates**: Scripts to update all references
2. **Gradual Migration**: Keep old files until validation complete
3. **Rollback Plan**: Git branches for immediate reversion
4. **Comprehensive Testing**: Full test suite execution

### Rollback Procedure
```bash
# If migration fails, rollback with:
git checkout HEAD~1 -- src/cli/
npm run build
npm test
```

## Success Metrics

### Quantitative Targets
- **6→1 CLI implementations** (83% reduction)
- **Zero test failures** after migration
- **Same functionality** preserved
- **Build time improvement** (target: 15-20%)

### Qualitative Improvements
- **Single source of truth** for CLI
- **Consistent TypeScript architecture**
- **Simplified maintenance**
- **Better error handling**

## Expected Outcomes

After Phase 1 completion:
- ✅ Single `cli.ts` entry point
- ✅ All tests passing with new CLI
- ✅ Build system optimized
- ✅ Documentation updated
- ✅ 83% reduction in CLI file complexity (6→1 implementations)

---

**Document Status**: Implementation Ready
**Last Updated**: 2024-07-22
**Validation**: All code references systematically verified
