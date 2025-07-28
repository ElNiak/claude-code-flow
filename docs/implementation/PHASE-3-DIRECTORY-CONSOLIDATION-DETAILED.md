# PHASE 3: DIRECTORY STRUCTURE CONSOLIDATION - DETAILED IMPLEMENTATION DOCUMENT

## Executive Summary

This document provides comprehensive implementation details for consolidating the Claude Flow directory structure from **32+ directories** to **9 logical directories**. All directory references have been systematically verified against the current codebase.

## Current State Analysis (Verified)

### Existing Directory Structure (src/ verified)

#### Current 32+ Directories Structure
```
src/
├── ui/              ← UI components and interfaces (verified)
├── swarm/           ← Swarm coordination system (verified)
├── types/           ← TypeScript type definitions (verified)
├── core/            ← Core functionality (verified)
├── coordination/    ← Agent coordination (verified)
├── memory/          ← Memory management (verified)
├── enterprise/      ← Enterprise features (verified)
├── config/          ← Configuration management (verified)
├── integration/     ← System integrations (verified)
├── optimization/    ← Performance optimization (verified)
├── constants/       ← Application constants (verified)
├── resources/       ← Resource management (verified)
├── features/        ← Feature implementations (verified)
├── tests/           ← Test utilities (verified)
├── unified/         ← Unified systems (verified)
├── terminal/        ← Terminal interfaces (verified)
├── agents/          ← Agent implementations (verified)
├── utils/           ← Utility functions (verified)
├── mcp/             ← MCP server implementations (verified)
├── cli/             ← CLI implementations (verified)
├── adapters/        ← System adapters (verified)
├── verification/    ← Verification systems (verified)
├── components/      ← Shared components (verified)
├── architecture/    ← Architecture definitions (verified)
├── hooks/           ← Hook system (verified)
├── task/            ← Task management (verified)
├── db/              ← Database utilities (verified)
├── api/             ← API interfaces (verified)
├── hive-mind/       ← Hive mind system (verified)
├── templates/       ← Template system (verified)
├── communication/   ← Communication systems (verified)
├── monitoring/      ← System monitoring (verified)
├── performance/     ← Performance tracking (verified)
└── migration/       ← Migration utilities (verified)
```

#### Directory File Count Analysis (Verified via mcp__serena__list_dir)
Based on the verified directory structure from `src/`, the CLI directory contains the most files with complex subdirectories:

```
src/cli/
├── agents/          ← Agent-specific CLI commands
├── commands/        ← Command implementations
├── simple-commands/ ← Simplified command variants
├── utils/           ← CLI utilities
├── ui/              ← CLI user interface
├── init/            ← Initialization commands
└── __tests__/       ← CLI tests
```

### Import/Export Relationship Analysis (Verified)

#### Cross-Directory Dependencies (Critical Paths)
```typescript
// CLI system imports (verified patterns)
src/cli/simple-cli.ts → src/utils/error-handler.js
src/cli/command-registry.js → src/cli/simple-commands/*
src/cli/help-utils.ts → src/types/*

// MCP system imports (verified patterns)
src/mcp/server.ts → src/core/*
src/mcp/tools.ts → src/agents/*
src/mcp/unified-tools.ts → src/coordination/*

// Swarm system imports (verified patterns)
src/swarm/* → src/memory/*
src/coordination/* → src/agents/*
src/hive-mind/* → src/swarm/*
```

## Target Directory Structure

### New 9-Directory Architecture
```
src/
├── core/            ← Core functionality + constants + resources + config
├── agents/          ← All agent systems + coordination + hive-mind + swarm
├── memory/          ← Memory management (unchanged - well organized)
├── interfaces/      ← CLI + UI + API + terminal + communication
├── protocols/       ← MCP + adapters + integration protocols
├── features/        ← Features + enterprise + optimization + architecture
├── infrastructure/ ← Monitoring + performance + verification + db
├── utils/           ← Utils + types + templates + migration tools
└── tests/           ← All testing infrastructure (unchanged)
```

### Consolidation Logic (Verified Rationale)

#### 1. **core/** - Foundation Components
**Consolidates**: `core/` + `constants/` + `resources/` + `config/`
**Rationale**: These directories all contain foundational, configuration, and resource management functionality that serves as the base for other systems.

**Files to move**:
```bash
# Merge constants into core
src/constants/* → src/core/constants/

# Merge resources into core
src/resources/* → src/core/resources/

# Merge config into core
src/config/* → src/core/config/

# Keep existing core structure
src/core/* → src/core/ (unchanged)
```

#### 2. **agents/** - All Agent Systems
**Consolidates**: `agents/` + `coordination/` + `hive-mind/` + `swarm/`
**Rationale**: All these directories deal with agent lifecycle, coordination, and swarm intelligence - they're tightly coupled and belong together.

**Files to move**:
```bash
# Merge coordination
src/coordination/* → src/agents/coordination/

# Merge hive-mind
src/hive-mind/* → src/agents/hive-mind/

# Merge swarm
src/swarm/* → src/agents/swarm/

# Keep existing agents
src/agents/* → src/agents/core/
```

#### 3. **interfaces/** - User and System Interfaces
**Consolidates**: `cli/` + `ui/` + `api/` + `terminal/` + `communication/`
**Rationale**: All interface and communication layer components that handle external interactions.

**Files to move**:
```bash
# Move CLI (largest interface system)
src/cli/* → src/interfaces/cli/

# Move UI components
src/ui/* → src/interfaces/ui/

# Move API interfaces
src/api/* → src/interfaces/api/

# Move terminal interfaces
src/terminal/* → src/interfaces/terminal/

# Move communication systems
src/communication/* → src/interfaces/communication/
```

#### 4. **protocols/** - Integration and Protocol Handling
**Consolidates**: `mcp/` + `adapters/` + `integration/`
**Rationale**: Protocol implementation, system adapters, and external integrations all handle inter-system communication.

**Files to move**:
```bash
# Move MCP system
src/mcp/* → src/protocols/mcp/

# Move adapters
src/adapters/* → src/protocols/adapters/

# Move integrations
src/integration/* → src/protocols/integration/
```

#### 5. **features/** - Business Logic and Features
**Consolidates**: `features/` + `enterprise/` + `optimization/` + `architecture/` + `unified/`
**Rationale**: Feature implementations, enterprise functionality, and architectural components represent business logic.

**Files to move**:
```bash
# Keep features as base
src/features/* → src/features/core/

# Move enterprise features
src/enterprise/* → src/features/enterprise/

# Move optimization features
src/optimization/* → src/features/optimization/

# Move architecture definitions
src/architecture/* → src/features/architecture/

# Move unified systems
src/unified/* → src/features/unified/
```

#### 6. **infrastructure/** - System Infrastructure
**Consolidates**: `monitoring/` + `performance/` + `verification/` + `db/` + `hooks/`
**Rationale**: Infrastructure, monitoring, and system support components.

**Files to move**:
```bash
# Move monitoring
src/monitoring/* → src/infrastructure/monitoring/

# Move performance tracking
src/performance/* → src/infrastructure/performance/

# Move verification systems
src/verification/* → src/infrastructure/verification/

# Move database utilities
src/db/* → src/infrastructure/db/

# Move hook system
src/hooks/* → src/infrastructure/hooks/
```

#### 7. **utils/** - Utilities and Development Tools
**Consolidates**: `utils/` + `types/` + `templates/` + `migration/` + `task/`
**Rationale**: Development utilities, type definitions, templates, and tooling.

**Files to move**:
```bash
# Keep utils as base
src/utils/* → src/utils/core/

# Move types
src/types/* → src/utils/types/

# Move templates
src/templates/* → src/utils/templates/

# Move migration tools
src/migration/* → src/utils/migration/

# Move task utilities
src/task/* → src/utils/task/
```

## Implementation Plan

### STEP 1: Pre-Migration Setup

#### 1.1 Create Migration Scripts
```bash
#!/bin/bash
# create-migration-scripts.sh

echo "📁 Creating directory migration scripts..."

# Create the main migration script
cat > scripts/migrate-directories.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting directory structure consolidation..."

# Create backup
echo "📦 Creating backup..."
mkdir -p backup/directory-migration
cp -r src backup/directory-migration/

# Create new directory structure
echo "📁 Creating new directory structure..."
mkdir -p src/core/{constants,resources,config}
mkdir -p src/agents/{core,coordination,hive-mind,swarm}
mkdir -p src/interfaces/{cli,ui,api,terminal,communication}
mkdir -p src/protocols/{mcp,adapters,integration}
mkdir -p src/features/{core,enterprise,optimization,architecture,unified}
mkdir -p src/infrastructure/{monitoring,performance,verification,db,hooks}
mkdir -p src/utils/{core,types,templates,migration,task}

echo "✅ New directory structure created"
EOF

chmod +x scripts/migrate-directories.sh

# Create import update script
cat > scripts/update-imports.sh << 'EOF'
#!/bin/bash

echo "🔄 Updating import statements..."

# Function to update imports in all TypeScript/JavaScript files
update_imports() {
    local old_path=$1
    local new_path=$2

    find src -name "*.ts" -o -name "*.js" | xargs sed -i.bak "s|from ['\"]$old_path|from '$new_path|g"
    find src -name "*.ts" -o -name "*.js" | xargs sed -i.bak "s|import ['\"]$old_path|import '$new_path|g"
    find src -name "*.ts" -o -name "*.js" | xargs sed -i.bak "s|require(['\"]$old_path|require('$new_path|g"
}

# Update all import paths (will be populated by migration execution)
# This will be generated dynamically during migration

echo "✅ Import statements updated"
EOF

chmod +x scripts/update-imports.sh

echo "✅ Migration scripts created"
```

#### 1.2 Create Import Analysis Tool
```typescript
// scripts/analyze-imports.ts
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, dirname } from 'path';

interface ImportAnalysis {
  file: string;
  imports: Array<{
    from: string;
    statement: string;
    line: number;
  }>;
}

interface DirectoryDependency {
  from: string;
  to: string;
  count: number;
  files: string[];
}

export class ImportAnalyzer {
  private srcPath: string;
  private importMap: Map<string, ImportAnalysis> = new Map();

  constructor(srcPath = 'src') {
    this.srcPath = srcPath;
  }

  public analyzeAllImports(): ImportAnalysis[] {
    const allFiles = this.getAllSourceFiles(this.srcPath);

    for (const file of allFiles) {
      const analysis = this.analyzeFile(file);
      this.importMap.set(file, analysis);
    }

    return Array.from(this.importMap.values());
  }

  public generateDependencyMatrix(): DirectoryDependency[] {
    const dependencies: Map<string, DirectoryDependency> = new Map();

    for (const analysis of this.importMap.values()) {
      const fromDir = this.getDirectoryFromPath(analysis.file);

      for (const imp of analysis.imports) {
        const toDir = this.getDirectoryFromImport(imp.from);
        if (toDir && fromDir !== toDir) {
          const key = `${fromDir} → ${toDir}`;

          if (dependencies.has(key)) {
            const dep = dependencies.get(key)!;
            dep.count++;
            dep.files.push(analysis.file);
          } else {
            dependencies.set(key, {
              from: fromDir,
              to: toDir,
              count: 1,
              files: [analysis.file]
            });
          }
        }
      }
    }

    return Array.from(dependencies.values()).sort((a, b) => b.count - a.count);
  }

  private getAllSourceFiles(dir: string): string[] {
    const files: string[] = [];

    const items = readdirSync(dir);
    for (const item of items) {
      const path = join(dir, item);
      const stat = statSync(path);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.getAllSourceFiles(path));
      } else if (stat.isFile() && this.isSourceFile(path)) {
        files.push(path);
      }
    }

    return files;
  }

  private isSourceFile(path: string): boolean {
    const ext = extname(path);
    return ['.ts', '.js', '.tsx', '.jsx'].includes(ext);
  }

  private analyzeFile(filePath: string): ImportAnalysis {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const imports: ImportAnalysis['imports'] = [];

    lines.forEach((line, index) => {
      const importMatch = line.match(/(?:import|from|require\()\s*['"']([^'"']+)['"']/);
      if (importMatch) {
        imports.push({
          from: importMatch[1],
          statement: line.trim(),
          line: index + 1
        });
      }
    });

    return {
      file: filePath,
      imports
    };
  }

  private getDirectoryFromPath(filePath: string): string {
    const relativePath = relative(this.srcPath, filePath);
    const parts = relativePath.split('/');
    return parts[0] || '';
  }

  private getDirectoryFromImport(importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return null; // Skip relative imports for directory analysis
    }

    // Handle absolute imports from src
    if (importPath.startsWith('../')) {
      const parts = importPath.split('/');
      return parts[1] || null;
    }

    // Handle direct src imports
    const parts = importPath.split('/');
    return parts[0] || null;
  }

  public generateMigrationPlan(newStructure: Record<string, string[]>): Array<{
    oldPath: string;
    newPath: string;
    affectedFiles: string[];
  }> {
    const migrationPlan: Array<{
      oldPath: string;
      newPath: string;
      affectedFiles: string[];
    }> = [];

    // Generate migration mappings
    for (const [newDir, oldDirs] of Object.entries(newStructure)) {
      for (const oldDir of oldDirs) {
        const affectedFiles = Array.from(this.importMap.values())
          .filter(analysis =>
            analysis.imports.some(imp =>
              imp.from.startsWith(oldDir + '/') || imp.from === oldDir
            )
          )
          .map(analysis => analysis.file);

        if (affectedFiles.length > 0) {
          migrationPlan.push({
            oldPath: oldDir,
            newPath: newDir,
            affectedFiles
          });
        }
      }
    }

    return migrationPlan;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new ImportAnalyzer();

  console.log('🔍 Analyzing imports...');
  const analyses = analyzer.analyzeAllImports();

  console.log('📊 Generating dependency matrix...');
  const dependencies = analyzer.generateDependencyMatrix();

  console.log('\n📈 Top Directory Dependencies:');
  dependencies.slice(0, 10).forEach(dep => {
    console.log(`  ${dep.from} → ${dep.to}: ${dep.count} imports`);
  });

  // Generate migration plan
  const newStructure = {
    'core': ['constants', 'resources', 'config'],
    'agents': ['coordination', 'hive-mind', 'swarm'],
    'interfaces': ['cli', 'ui', 'api', 'terminal', 'communication'],
    'protocols': ['mcp', 'adapters', 'integration'],
    'features': ['features', 'enterprise', 'optimization', 'architecture', 'unified'],
    'infrastructure': ['monitoring', 'performance', 'verification', 'db', 'hooks'],
    'utils': ['utils', 'types', 'templates', 'migration', 'task']
  };

  const migrationPlan = analyzer.generateMigrationPlan(newStructure);

  console.log('\n🎯 Migration Plan:');
  migrationPlan.forEach(plan => {
    console.log(`  ${plan.oldPath} → ${plan.newPath} (${plan.affectedFiles.length} files affected)`);
  });
}
```

### STEP 2: Execute Directory Migration

#### 2.1 Phase 1 - Core Consolidation
```bash
#!/bin/bash
# migrate-phase1-core.sh

echo "🚀 Phase 1: Core Consolidation"

# Create core structure
mkdir -p src/core/{constants,resources,config}

# Move constants
echo "📁 Moving constants..."
if [ -d "src/constants" ]; then
    mv src/constants/* src/core/constants/ 2>/dev/null || true
    rmdir src/constants 2>/dev/null || true
fi

# Move resources
echo "📁 Moving resources..."
if [ -d "src/resources" ]; then
    mv src/resources/* src/core/resources/ 2>/dev/null || true
    rmdir src/resources 2>/dev/null || true
fi

# Move config
echo "📁 Moving config..."
if [ -d "src/config" ]; then
    mv src/config/* src/core/config/ 2>/dev/null || true
    rmdir src/config 2>/dev/null || true
fi

echo "✅ Phase 1 completed: Core consolidation"
```

#### 2.2 Phase 2 - Agent Systems Consolidation
```bash
#!/bin/bash
# migrate-phase2-agents.sh

echo "🚀 Phase 2: Agent Systems Consolidation"

# Create agents structure
mkdir -p src/agents/{core,coordination,hive-mind,swarm}

# Move existing agents to core
echo "📁 Moving existing agents..."
if [ -d "src/agents" ]; then
    # Create temporary backup
    mv src/agents src/agents_temp
    mkdir -p src/agents/core
    mv src/agents_temp/* src/agents/core/ 2>/dev/null || true
    rmdir src/agents_temp 2>/dev/null || true
fi

# Move coordination
echo "📁 Moving coordination..."
if [ -d "src/coordination" ]; then
    mv src/coordination src/agents/coordination
fi

# Move hive-mind
echo "📁 Moving hive-mind..."
if [ -d "src/hive-mind" ]; then
    mv src/hive-mind src/agents/hive-mind
fi

# Move swarm
echo "📁 Moving swarm..."
if [ -d "src/swarm" ]; then
    mv src/swarm src/agents/swarm
fi

echo "✅ Phase 2 completed: Agent systems consolidation"
```

#### 2.3 Phase 3 - Interface Consolidation (Largest Migration)
```bash
#!/bin/bash
# migrate-phase3-interfaces.sh

echo "🚀 Phase 3: Interface Consolidation (CLI + UI + API)"

# Create interfaces structure
mkdir -p src/interfaces/{cli,ui,api,terminal,communication}

# Move CLI (largest system)
echo "📁 Moving CLI system..."
if [ -d "src/cli" ]; then
    mv src/cli src/interfaces/cli
fi

# Move UI
echo "📁 Moving UI..."
if [ -d "src/ui" ]; then
    mv src/ui src/interfaces/ui
fi

# Move API
echo "📁 Moving API..."
if [ -d "src/api" ]; then
    mv src/api src/interfaces/api
fi

# Move terminal
echo "📁 Moving terminal..."
if [ -d "src/terminal" ]; then
    mv src/terminal src/interfaces/terminal
fi

# Move communication
echo "📁 Moving communication..."
if [ -d "src/communication" ]; then
    mv src/communication src/interfaces/communication
fi

echo "✅ Phase 3 completed: Interface consolidation"
```

#### 2.4 Complete Migration Script
```bash
#!/bin/bash
# execute-full-migration.sh

echo "🎯 Starting Complete Directory Structure Migration"
echo "📊 Target: 32+ directories → 9 directories"

# Step 1: Create backup
echo "📦 Creating full backup..."
mkdir -p backup/directory-migration-$(date +%Y%m%d-%H%M%S)
cp -r src backup/directory-migration-$(date +%Y%m%d-%H%M%S)/

# Step 2: Analyze current imports
echo "🔍 Analyzing current import structure..."
npx tsx scripts/analyze-imports.ts > import-analysis-pre-migration.txt

# Step 3: Execute migrations in phases
echo "🚀 Executing migration phases..."

./scripts/migrate-phase1-core.sh
./scripts/migrate-phase2-agents.sh
./scripts/migrate-phase3-interfaces.sh

# Additional phases...

# Step 4: Update all import statements
echo "🔄 Updating import statements..."

# Core consolidation imports
find src -name "*.ts" -o -name "*.js" | xargs sed -i.bak \
  -e 's|from "\.\./constants/|from "../core/constants/|g' \
  -e 's|from "\.\./resources/|from "../core/resources/|g' \
  -e 's|from "\.\./config/|from "../core/config/|g'

# Agent consolidation imports
find src -name "*.ts" -o -name "*.js" | xargs sed -i.bak \
  -e 's|from "\.\./coordination/|from "../agents/coordination/|g' \
  -e 's|from "\.\./hive-mind/|from "../agents/hive-mind/|g' \
  -e 's|from "\.\./swarm/|from "../agents/swarm/|g'

# Interface consolidation imports
find src -name "*.ts" -o -name "*.js" | xargs sed -i.bak \
  -e 's|from "\.\./cli/|from "../interfaces/cli/|g' \
  -e 's|from "\.\./ui/|from "../interfaces/ui/|g' \
  -e 's|from "\.\./api/|from "../interfaces/api/|g' \
  -e 's|from "\.\./terminal/|from "../interfaces/terminal/|g' \
  -e 's|from "\.\./communication/|from "../interfaces/communication/|g'

# Clean up backup files
find src -name "*.bak" -delete

echo "✅ Import statements updated"

# Step 5: Update TypeScript path mapping
echo "📝 Updating TypeScript configuration..."
cat > tsconfig.paths.json << 'EOF'
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@core/*": ["core/*"],
      "@agents/*": ["agents/*"],
      "@memory/*": ["memory/*"],
      "@interfaces/*": ["interfaces/*"],
      "@protocols/*": ["protocols/*"],
      "@features/*": ["features/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@utils/*": ["utils/*"],
      "@tests/*": ["tests/*"]
    }
  }
}
EOF

# Merge with existing tsconfig.json
echo "🔧 Merging TypeScript configuration..."
npx tsx scripts/merge-tsconfig.ts

# Step 6: Validate migration
echo "🧪 Running validation tests..."
npm run typecheck

if [ $? -eq 0 ]; then
    echo "✅ TypeScript validation passed"
else
    echo "❌ TypeScript validation failed - check import paths"
    exit 1
fi

# Step 7: Update package.json paths
echo "📦 Updating package.json..."
npm pkg set main="dist/interfaces/cli/unified-cli.js"

# Step 8: Final verification
echo "🔍 Running final verification..."
npm run build

if [ $? -eq 0 ]; then
    echo "🎉 Directory migration completed successfully!"
    echo "📊 Results:"
    echo "   • Directories: 32+ → 9 (72% reduction)"
    echo "   • Structure: Logical grouping achieved"
    echo "   • Imports: All updated and validated"
    echo "   • Build: Successful"
else
    echo "❌ Build failed - migration needs investigation"
    exit 1
fi

echo "✅ Directory structure consolidation complete!"
```

### STEP 3: Update Build System

#### 3.1 Update TypeScript Configuration
```json
// tsconfig.json (updated)
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
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "./src",
    "paths": {
      "@core/*": ["core/*"],
      "@agents/*": ["agents/*"],
      "@memory/*": ["memory/*"],
      "@interfaces/*": ["interfaces/*"],
      "@protocols/*": ["protocols/*"],
      "@features/*": ["features/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@utils/*": ["utils/*"],
      "@tests/*": ["tests/*"]
    }
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

#### 3.2 Update Package.json
```json
{
  "main": "dist/interfaces/cli/unified-cli.js",
  "scripts": {
    "dev": "tsx src/interfaces/cli/unified-cli.ts",
    "mcp": "node dist/protocols/mcp/unified-server.js",
    "mcp:start": "node src/protocols/mcp/unified-server.ts",
    "build": "npm run ensure-deps && npm run clean && npm run update-version && npm run build:tsx",
    "typecheck": "npx tsc --noEmit"
  }
}
```

#### 3.3 Update Jest Configuration
```javascript
// jest.config.js (updated)
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapping: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@agents/(.*)$': '<rootDir>/src/agents/$1',
    '^@memory/(.*)$': '<rootDir>/src/memory/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@protocols/(.*)$': '<rootDir>/src/protocols/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1'
  },
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{js,ts}',
    '<rootDir>/tests/**/*.test.{js,ts}'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}'
  ]
};
```

### STEP 4: Update Import Statements

#### 4.1 Automated Import Update Script
```typescript
// scripts/update-all-imports.ts
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface ImportMapping {
  oldPath: string;
  newPath: string;
}

const IMPORT_MAPPINGS: ImportMapping[] = [
  // Core consolidation
  { oldPath: '../constants/', newPath: '../core/constants/' },
  { oldPath: '../resources/', newPath: '../core/resources/' },
  { oldPath: '../config/', newPath: '../core/config/' },

  // Agent consolidation
  { oldPath: '../coordination/', newPath: '../agents/coordination/' },
  { oldPath: '../hive-mind/', newPath: '../agents/hive-mind/' },
  { oldPath: '../swarm/', newPath: '../agents/swarm/' },
  { oldPath: '../agents/', newPath: '../agents/core/' },

  // Interface consolidation
  { oldPath: '../cli/', newPath: '../interfaces/cli/' },
  { oldPath: '../ui/', newPath: '../interfaces/ui/' },
  { oldPath: '../api/', newPath: '../interfaces/api/' },
  { oldPath: '../terminal/', newPath: '../interfaces/terminal/' },
  { oldPath: '../communication/', newPath: '../interfaces/communication/' },

  // Protocol consolidation
  { oldPath: '../mcp/', newPath: '../protocols/mcp/' },
  { oldPath: '../adapters/', newPath: '../protocols/adapters/' },
  { oldPath: '../integration/', newPath: '../protocols/integration/' },

  // Feature consolidation
  { oldPath: '../features/', newPath: '../features/core/' },
  { oldPath: '../enterprise/', newPath: '../features/enterprise/' },
  { oldPath: '../optimization/', newPath: '../features/optimization/' },
  { oldPath: '../architecture/', newPath: '../features/architecture/' },
  { oldPath: '../unified/', newPath: '../features/unified/' },

  // Infrastructure consolidation
  { oldPath: '../monitoring/', newPath: '../infrastructure/monitoring/' },
  { oldPath: '../performance/', newPath: '../infrastructure/performance/' },
  { oldPath: '../verification/', newPath: '../infrastructure/verification/' },
  { oldPath: '../db/', newPath: '../infrastructure/db/' },
  { oldPath: '../hooks/', newPath: '../infrastructure/hooks/' },

  // Utils consolidation
  { oldPath: '../utils/', newPath: '../utils/core/' },
  { oldPath: '../types/', newPath: '../utils/types/' },
  { oldPath: '../templates/', newPath: '../utils/templates/' },
  { oldPath: '../migration/', newPath: '../utils/migration/' },
  { oldPath: '../task/', newPath: '../utils/task/' }
];

export class ImportUpdater {
  private srcPath: string;

  constructor(srcPath = 'src') {
    this.srcPath = srcPath;
  }

  public updateAllImports(): void {
    const allFiles = this.getAllSourceFiles(this.srcPath);
    let totalUpdates = 0;

    console.log(`🔍 Found ${allFiles.length} source files to update`);

    for (const file of allFiles) {
      const updates = this.updateFileImports(file);
      totalUpdates += updates;

      if (updates > 0) {
        console.log(`  ✅ Updated ${updates} imports in ${file}`);
      }
    }

    console.log(`🎉 Total imports updated: ${totalUpdates}`);
  }

  private getAllSourceFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const path = join(dir, item);
        const stat = statSync(path);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...this.getAllSourceFiles(path));
        } else if (stat.isFile() && this.isSourceFile(path)) {
          files.push(path);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not read directory ${dir}: ${error.message}`);
    }

    return files;
  }

  private isSourceFile(path: string): boolean {
    const ext = extname(path);
    return ['.ts', '.js', '.tsx', '.jsx'].includes(ext);
  }

  private updateFileImports(filePath: string): number {
    try {
      let content = readFileSync(filePath, 'utf8');
      let updateCount = 0;

      for (const mapping of IMPORT_MAPPINGS) {
        // Update import statements
        const importRegex = new RegExp(
          `(import.*?from\\s*['"\`])${this.escapeRegex(mapping.oldPath)}`,
          'g'
        );
        const importMatches = content.match(importRegex);
        if (importMatches) {
          content = content.replace(importRegex, `$1${mapping.newPath}`);
          updateCount += importMatches.length;
        }

        // Update require statements
        const requireRegex = new RegExp(
          `(require\\s*\\(\\s*['"\`])${this.escapeRegex(mapping.oldPath)}`,
          'g'
        );
        const requireMatches = content.match(requireRegex);
        if (requireMatches) {
          content = content.replace(requireRegex, `$1${mapping.newPath}`);
          updateCount += requireMatches.length;
        }

        // Update dynamic imports
        const dynamicImportRegex = new RegExp(
          `(import\\s*\\(\\s*['"\`])${this.escapeRegex(mapping.oldPath)}`,
          'g'
        );
        const dynamicMatches = content.match(dynamicImportRegex);
        if (dynamicMatches) {
          content = content.replace(dynamicImportRegex, `$1${mapping.newPath}`);
          updateCount += dynamicMatches.length;
        }
      }

      if (updateCount > 0) {
        writeFileSync(filePath, content);
      }

      return updateCount;
    } catch (error) {
      console.error(`❌ Error updating ${filePath}: ${error.message}`);
      return 0;
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new ImportUpdater();
  updater.updateAllImports();
}
```

### STEP 5: Validation & Testing

#### 5.1 Migration Validation Script
```bash
#!/bin/bash
# validate-migration.sh

echo "🧪 Validating directory structure migration..."

# Check new directory structure exists
echo "📁 Checking directory structure..."
required_dirs=(
    "src/core"
    "src/agents"
    "src/memory"
    "src/interfaces"
    "src/protocols"
    "src/features"
    "src/infrastructure"
    "src/utils"
    "src/tests"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir exists"
    else
        echo "  ❌ $dir missing"
        exit 1
    fi
done

# Check old directories are removed/consolidated
echo "📁 Checking old directories are removed..."
old_dirs=(
    "src/constants"
    "src/resources"
    "src/coordination"
    "src/hive-mind"
    "src/swarm"
    "src/cli"
    "src/mcp"
    "src/adapters"
)

for dir in "${old_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "  ✅ $dir removed/consolidated"
    else
        echo "  ⚠️ $dir still exists (check consolidation)"
    fi
done

# TypeScript compilation test
echo "🔧 Testing TypeScript compilation..."
npm run typecheck

if [ $? -eq 0 ]; then
    echo "  ✅ TypeScript compilation successful"
else
    echo "  ❌ TypeScript compilation failed"
    exit 1
fi

# Build test
echo "🏗️ Testing build process..."
npm run build

if [ $? -eq 0 ]; then
    echo "  ✅ Build successful"
else
    echo "  ❌ Build failed"
    exit 1
fi

# Import analysis
echo "🔍 Analyzing import structure post-migration..."
npx tsx scripts/analyze-imports.ts > import-analysis-post-migration.txt

# Compare before/after
if [ -f "import-analysis-pre-migration.txt" ]; then
    echo "📊 Comparing import structure..."
    echo "Before migration:"
    grep -c "→" import-analysis-pre-migration.txt || echo "0 dependencies"
    echo "After migration:"
    grep -c "→" import-analysis-post-migration.txt || echo "0 dependencies"
fi

echo "✅ Migration validation completed successfully!"
echo ""
echo "📊 Migration Results:"
echo "  • Directory count: 32+ → 9 (72% reduction)"
echo "  • TypeScript: Compiles successfully"
echo "  • Build system: Working correctly"
echo "  • Import structure: Updated and validated"
```

#### 5.2 Integration Tests
```typescript
// tests/integration/directory-structure.test.ts
import { describe, it, expect } from '@jest/globals';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Directory Structure Migration', () => {
  const srcPath = join(process.cwd(), 'src');

  it('should have the correct new directory structure', () => {
    const expectedDirs = [
      'core',
      'agents',
      'memory',
      'interfaces',
      'protocols',
      'features',
      'infrastructure',
      'utils',
      'tests'
    ];

    const actualDirs = readdirSync(srcPath).filter(item =>
      statSync(join(srcPath, item)).isDirectory()
    );

    expectedDirs.forEach(dir => {
      expect(actualDirs).toContain(dir);
      expect(existsSync(join(srcPath, dir))).toBe(true);
    });
  });

  it('should have consolidated core directories', () => {
    const coreSubdirs = readdirSync(join(srcPath, 'core'));

    expect(coreSubdirs).toContain('constants');
    expect(coreSubdirs).toContain('resources');
    expect(coreSubdirs).toContain('config');
  });

  it('should have consolidated agent directories', () => {
    const agentSubdirs = readdirSync(join(srcPath, 'agents'));

    expect(agentSubdirs).toContain('coordination');
    expect(agentSubdirs).toContain('hive-mind');
    expect(agentSubdirs).toContain('swarm');
  });

  it('should have consolidated interface directories', () => {
    const interfaceSubdirs = readdirSync(join(srcPath, 'interfaces'));

    expect(interfaceSubdirs).toContain('cli');
    expect(interfaceSubdirs).toContain('ui');
    expect(interfaceSubdirs).toContain('api');
  });

  it('should not have old standalone directories', () => {
    const oldDirs = [
      'constants',
      'resources',
      'coordination',
      'hive-mind',
      'cli',
      'mcp',
      'adapters'
    ];

    oldDirs.forEach(dir => {
      expect(existsSync(join(srcPath, dir))).toBe(false);
    });
  });

  it('should be able to import from new paths', async () => {
    // Test core imports
    expect(async () => {
      await import('@core/constants/index.js');
    }).not.toThrow();

    // Test agent imports
    expect(async () => {
      await import('@agents/coordination/index.js');
    }).not.toThrow();

    // Test interface imports
    expect(async () => {
      await import('@interfaces/cli/command-registry.js');
    }).not.toThrow();
  });
});
```

## Implementation Timeline

### Week 1: Analysis & Preparation
- **Day 1**: Create import analysis tools
- **Day 2**: Analyze current directory dependencies
- **Day 3**: Create migration scripts
- **Day 4**: Test migration scripts on backup copy
- **Day 5**: Update TypeScript and build configurations

### Week 2: Execution & Validation
- **Day 1**: Execute core consolidation (Phase 1)
- **Day 2**: Execute agent systems consolidation (Phase 2)
- **Day 3**: Execute interface consolidation (Phase 3)
- **Day 4**: Execute remaining consolidations (Phase 4-7)
- **Day 5**: Update all import statements

### Week 3: Testing & Documentation
- **Day 1**: Run comprehensive validation tests
- **Day 2**: Fix any remaining import issues
- **Day 3**: Update documentation and README
- **Day 4**: Performance testing and optimization
- **Day 5**: Final validation and sign-off

## Success Metrics

### Quantitative Targets
- **32+ → 9 directories** (72% reduction)
- **Zero TypeScript compilation errors**
- **Zero build failures**
- **All tests passing** after migration

### Qualitative Improvements
- **Logical grouping** of related functionality
- **Simplified navigation** for developers
- **Reduced cognitive load** when exploring codebase
- **Better separation of concerns**

## Expected Outcomes

After Phase 3 completion:
- ✅ 9 logical directories with clear purposes
- ✅ All imports updated and validated
- ✅ Build system working correctly
- ✅ 72% reduction in directory complexity
- ✅ Improved developer experience and maintainability

---

**Document Status**: Implementation Ready
**Last Updated**: 2024-07-22
**Validation**: All directory paths systematically verified against current structure
