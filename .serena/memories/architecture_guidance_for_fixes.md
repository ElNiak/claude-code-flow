# Architectural Guidance for Fix Implementation

## 🏗️ Claude Flow Architecture Analysis

### Core Architectural Patterns

#### 1. **Utility Function Placement**
- **Location**: `src/utils/helpers.ts` - Primary utility functions
- **Pattern**: Single source of truth for common utilities
- **Key Functions**:
  - `generateId(prefix?: string): string` - Located in `src/utils/helpers.ts`
  - Standard ID generation pattern: `timestamp_random` or `prefix_timestamp_random`

#### 2. **Error Handling Architecture**
- **Primary Module**: `src/utils/error-handler.ts` - Main error handling facade
- **Type Guards**: `src/utils/type-guards.ts` - Core error detection functions
- **Custom Errors**: `src/utils/errors.ts` - Domain-specific error classes
- **Pattern**: Re-export strategy for backward compatibility

**Error Function Hierarchy**:
```typescript
// Core implementation in type-guards.ts
export function getErrorMessage(error: unknown): string

// Re-exported in error-handler.ts for compatibility  
export const getErrorMessage = getErrorMsg; // from type-guards

// Also available in both .ts and .js versions
```

#### 3. **CLI Command Structure**
- **Base Location**: `src/cli/commands/`
- **Pattern**: Command pattern with factory functions
- **Structure**: Each command exports a default command object
- **Dependencies**: Commands import utilities from `src/utils/`

#### 4. **Type System Hierarchy**
- **Core Types**: `src/types/` - Shared interfaces and types
- **Domain Types**: `src/unified/work/types.ts` - Work-specific interfaces
- **Pattern**: Single source of truth per domain

**Key Interface**: `WorkOptions` defined in `src/unified/work/types.ts`:
```typescript
export interface WorkOptions {
  verbose?: boolean;
  debug?: boolean;
  dryRun?: boolean;
  config?: string;
  preset?: string;
  agents?: number;
  topology?: string;
  strategy?: string;
  output?: string;
  memory?: boolean;
  hooks?: boolean;
  autoOptimize?: boolean;
  tmux?: boolean;
  tmuxSession?: string;
}
```

#### 5. **Import/Export Patterns**
- **Module System**: ES modules with `.js` extensions in imports
- **Resolution**: NodeNext resolution strategy
- **Pattern**: Consistent use of relative imports with `.js` extension
- **Compatibility**: Both `.ts` and `.js` versions exist for some utilities

### 🚨 Current Architecture Violations

#### 1. **Duplicate Exports** 
- **Issue**: Multiple files exporting same symbols
- **Examples**: `getErrorMessage` exported from multiple locations
- **Fix Strategy**: Maintain single source of truth, use re-exports for compatibility

#### 2. **Missing Index Files**
- **Issue**: Referenced `src/unified/work/index.ts` doesn't exist
- **Impact**: Import resolution failures
- **Fix Strategy**: Create proper index files or update import paths

#### 3. **Type Definition Inconsistencies**
- **Issue**: Type definitions scattered across multiple files
- **Fix Strategy**: Consolidate related types, maintain clear hierarchies

### ✅ Architectural Fix Guidelines

#### 1. **For `generateId` Function**
- **Location**: Keep in `src/utils/helpers.ts` (correct location)
- **Usage**: Import as `import { generateId } from '../utils/helpers.js'`
- **Pattern**: Function export, not type alias

#### 2. **For `getErrorMessage` Function**
- **Primary**: Keep implementation in `src/utils/type-guards.ts`
- **Secondary**: Re-export from `src/utils/error-handler.ts` for compatibility
- **Usage**: Import from error-handler for consistency
- **Pattern**: `export const getErrorMessage = getErrorMsg;`

#### 3. **For `_error` Convention**
- **Pattern**: Use `getErrorMessage` function, not `_error` variable
- **Standard**: `const message = getErrorMessage(error);`
- **Import**: `import { getErrorMessage } from '../utils/error-handler.js';`

#### 4. **For CLI Commands**
- **Pattern**: Import utilities using relative paths with `.js` extension
- **Structure**: Commands should have clear dependency hierarchy
- **Error Handling**: Use standard error utilities, not custom implementations

#### 5. **For Type Definitions**
- **Pattern**: Single export per interface/type
- **Location**: Domain-specific types in appropriate modules
- **Re-exports**: Use index files for public API, direct imports for internal use

### 🔧 Fix Implementation Strategy

#### Priority 1: Syntax Errors
1. Fix immediate compilation blockers
2. Remove duplicate exports 
3. Correct import paths

#### Priority 2: Architectural Alignment  
1. Ensure utilities are imported from correct locations
2. Standardize error handling patterns
3. Maintain type system consistency

#### Priority 3: System Integration
1. Verify all imports resolve correctly
2. Test compilation across all modules
3. Validate runtime behavior

### 🎯 Key Architectural Principles to Preserve

1. **Single Source of Truth**: Each utility/type defined in one place
2. **Layered Dependencies**: Utils → Core → Features → CLI
3. **Consistent Import Patterns**: Always use `.js` extensions
4. **Graceful Error Handling**: Standard error utilities throughout
5. **Modular Design**: Clear separation of concerns between modules