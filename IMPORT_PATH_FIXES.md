# Import Path Migration Guide

## Critical Import Fixes Required

### 1. Test File: `src/cli/__tests__/command-registry.test.js`

**Current Broken Imports** (Lines 155, 169):
```javascript
const { initCommand } = await import("../simple-commands/init.js");
const { swarmCommand } = await import("../simple-commands/swarm.js");
```

**Fixed Imports**:
```javascript
const { initCommand } = await import("../commands/init/index.js");
const { swarmCommand } = await import("../commands/swarm/index.js");
```

### 2. Test File: `src/cli/commands/hooks/__tests__/hooks/hooks.test.ts`

**Current Broken Imports** (20+ instances):
```javascript
const { hooksCommand } = await import("../../../../simple-commands/hooks.js");
```

**Fixed Import**:
```javascript
const { hooksCommand } = await import("../../index.js");
```

**Specific Line Numbers to Fix**:
- Line 61: `await import("../../../../simple-commands/hooks.js");`
- Line 78: `await import("../../../../simple-commands/hooks.js");`
- Line 104: `await import("../../../../simple-commands/hooks.js");`
- Line 120: `await import("../../../../simple-commands/hooks.js");`
- Line 152: `await import("../../../../simple-commands/hooks.js");`
- Line 197: `await import("../../../../simple-commands/hooks.js");`
- Line 222: `await import("../../../../simple-commands/hooks.js");`
- Line 258: `await import("../../../../simple-commands/hooks.js");`
- Line 296: `await import("../../../../simple-commands/hooks.js");`
- Line 346: `await import("../../../../simple-commands/hooks.js");`
- Line 375: `await import("../../../../simple-commands/hooks.js");`
- Line 423: `await import("../../../../simple-commands/hooks.js");`
- Line 452: `await import("../../../../simple-commands/hooks.js");`
- Line 472: `await import("../../../../simple-commands/hooks.js");`
- Line 485: `await import("../../../../simple-commands/hooks.js");`
- Line 496: `await import("../../../../simple-commands/hooks.js");`
- Line 505: `await import("../../../../simple-commands/hooks.js");`

### 3. Utility Import Updates

**Old Pattern**:
```javascript
import { ... } from "../cli-utils.js";
import { ... } from "../utils.js";
```

**New Pattern**:
```javascript
import { ... } from "../core/cli-utils.ts";
import { ... } from "../core/utils.js";
```

## Command Module Structure Verification

### Required Exports in New Module Structure

Each new command module must export the expected command function:

**Example: `src/cli/commands/init/index.ts`**
```typescript
// Must export initCommand function
export async function initCommand(args: string[], flags: any) {
  // Implementation
}
```

**Example: `src/cli/commands/swarm/index.ts`**
```typescript
// Must export swarmCommand function
export async function swarmCommand(args: string[], flags: any) {
  // Implementation
}
```

**Example: `src/cli/commands/hooks/index.ts`**
```typescript
// Must export hooksCommand function
export async function hooksCommand(args: string[], flags: any) {
  // Implementation
}
```

## Automated Fix Script

```bash
#!/bin/bash
# fix-imports.sh - Automated import path fixes

echo "🔧 Fixing critical import paths..."

# Fix command-registry.test.js
sed -i '' 's|../simple-commands/init.js|../commands/init/index.js|g' src/cli/__tests__/command-registry.test.js
sed -i '' 's|../simple-commands/swarm.js|../commands/swarm/index.js|g' src/cli/__tests__/command-registry.test.js

# Fix hooks.test.ts
sed -i '' 's|../../../../simple-commands/hooks.js|../../index.js|g' src/cli/commands/hooks/__tests__/hooks/hooks.test.ts

echo "✅ Import paths fixed!"
echo "⚠️  Remember to verify command exports exist in target modules"
```

## Verification Steps

### 1. Run Tests
```bash
npm test src/cli/__tests__/command-registry.test.js
npm test src/cli/commands/hooks/__tests__/hooks/hooks.test.ts
```

### 2. Check Command Exports
Verify each command module exports the expected function:

```bash
# Check init command
node -e "import('./src/cli/commands/init/index.js').then(m => console.log(Object.keys(m)))"

# Check swarm command
node -e "import('./src/cli/commands/swarm/index.js').then(m => console.log(Object.keys(m)))"

# Check hooks command
node -e "import('./src/cli/commands/hooks/index.js').then(m => console.log(Object.keys(m)))"
```

### 3. Manual Verification
1. **Import Resolution**: Ensure all import paths resolve correctly
2. **Function Exports**: Verify expected functions are exported
3. **Test Execution**: Run tests to confirm fixes work
4. **Command Functionality**: Test CLI commands still work

## Implementation Priority

### Priority 1: Critical (Immediate)
- Fix test file import paths (prevents test failures)
- Ensure command exports exist (prevents runtime errors)

### Priority 2: Important (Short-term)
- Update utility import patterns
- Clean up any remaining simple-commands references

### Priority 3: Enhancement (Medium-term)
- Optimize import paths for performance
- Add import path validation to prevent regressions

## Rollback Plan

If fixes cause issues, rollback by reverting the sed changes:

```bash
git checkout -- src/cli/__tests__/command-registry.test.js
git checkout -- src/cli/commands/hooks/__tests__/hooks/hooks.test.ts
```

## Notes

- All import paths should use explicit file extensions (.js, .ts)
- Module paths should be relative to avoid absolute path issues
- Test imports in both development and production environments
- Consider adding eslint rules to prevent future import path issues
