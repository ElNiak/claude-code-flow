#!/bin/bash
# Deno Elimination Execution Script
# Systematic migration from Deno APIs to Node.js equivalents

set -e  # Exit on error

echo "🚀 DENO ELIMINATION - SYSTEMATIC MIGRATION"
echo "=========================================="

# Phase 1: Backup and preparation
echo "📁 Phase 1: Creating backup and preparation..."
BACKUP_DIR="backups/deno-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup all affected directories
cp -r src/cli/simple-commands/ "$BACKUP_DIR/simple-commands-backup/"
cp -r src/cli/commands/ "$BACKUP_DIR/commands-backup/" 2>/dev/null || true
cp -r src/utils/ "$BACKUP_DIR/utils-backup/" 2>/dev/null || true

echo "✅ Backup created: $BACKUP_DIR"

# Phase 2: Execute automated migration
echo ""
echo "🔄 Phase 2: Executing automated migration..."
node scripts/deno-elimination-plan.js

# Phase 3: Manual verification and fixes
echo ""
echo "🔍 Phase 3: Manual verification phase..."

# Create manual fix checklist
cat > deno-manual-fixes-checklist.md << 'EOF'
# Manual Deno Migration Fixes Checklist

## Files Requiring Manual Attention

### 1. Complex Deno.Command Usage
Files with complex command execution may need manual review:
- Check spawn() options mapping
- Verify stdout/stderr handling
- Ensure proper async/await patterns

### 2. Error Handling Patterns
- Deno errors vs Node.js errors
- Exception handling updates
- Error message consistency

### 3. Import Path Updates
- Verify all import paths are correct
- Check for circular dependencies
- Ensure proper ES module syntax

## Validation Tests
- [ ] All files compile without TypeScript errors
- [ ] No remaining Deno.* references
- [ ] All CLI commands still functional
- [ ] Tests pass (after Jest migration)

## Performance Validation
- [ ] CLI startup time maintained
- [ ] Memory usage within bounds
- [ ] File operations performance check
EOF

# Phase 4: Compilation and validation
echo ""
echo "🧪 Phase 4: Compilation validation..."

# Check for TypeScript compilation errors
if npm run typecheck; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation errors found - manual fixes required"
    echo "📋 Check deno-manual-fixes-checklist.md for guidance"
fi

# Phase 5: Search for remaining Deno references
echo ""
echo "🔍 Phase 5: Final Deno reference scan..."
REMAINING_DENO=$(grep -r "Deno\." src/ --include="*.ts" --include="*.js" | wc -l || echo "0")

if [ "$REMAINING_DENO" -eq 0 ]; then
    echo "🎉 SUCCESS: All Deno references eliminated!"
else
    echo "⚠️  Found $REMAINING_DENO remaining Deno references:"
    grep -r "Deno\." src/ --include="*.ts" --include="*.js" || true
    echo ""
    echo "📋 Manual review required - check deno-manual-fixes-checklist.md"
fi

# Phase 6: CLI functionality test
echo ""
echo "🧪 Phase 6: CLI functionality validation..."

if ./bin/claude-flow --help >/dev/null 2>&1; then
    echo "✅ CLI basic functionality maintained"
else
    echo "❌ CLI functionality broken - rollback may be required"
    echo "💾 Restore from: $BACKUP_DIR"
fi

# Final summary
echo ""
echo "📊 DENO ELIMINATION SUMMARY"
echo "=========================="
echo "📁 Backup location: $BACKUP_DIR"
echo "📋 Manual checklist: deno-manual-fixes-checklist.md"
echo "📄 Migration plan: deno-migration-plan.json"
echo "📊 Results: deno-migration-results.json"

if [ "$REMAINING_DENO" -eq 0 ]; then
    echo "🎯 STATUS: COMPLETE - Ready for Phase 2"
else
    echo "🎯 STATUS: NEEDS MANUAL FIXES - $REMAINING_DENO references remaining"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Review and apply manual fixes if needed"
echo "2. Run npm test after Jest migration complete"
echo "3. Validate all CLI commands work"
echo "4. Proceed with Phase 2 if all validations pass"
