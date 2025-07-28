#!/bin/bash

# Script to update all test references from simple-cli.ts to cli.ts

echo "🔄 Updating test references from simple-cli.ts to cli.ts..."

# Find all files with simple-cli.ts references
files_to_update=(
    "tests/unit/cli/commands/init/rollback.test.ts"
    "tests/unit/cli/commands/init/validation.test.ts"
    "tests/cli-migration-strategy.cjs"
    "tests/integration/cli/init/e2e-workflow.test.ts"
    "tests/integration/cli/init/selective-modes.test.ts"
    "tests/integration/cli/init/full-init-flow.test.ts"
    "tests/manual/cli-tests/comprehensive-cli-test.sh"
    "tests/migrated/cli/e2e-workflow.test.ts"
    "tests/migrated/cli/rollback.test.ts"
    "tests/migrated/cli/selective-modes.test.ts"
    "tests/migrated/cli/init-performance.test.ts"
    "tests/migrated/cli/validation.test.ts"
    "tests/migrated/cli/full-init-flow.test.ts"
    "tests/pre-migration-baseline-tests.cjs"
    "tests/performance/cli/init/init-performance.test.ts"
)

updated_count=0
failed_count=0

for file in "${files_to_update[@]}"; do
    if [ -f "$file" ]; then
        echo "  📝 Updating $file..."

        # Create backup
        cp "$file" "$file.bak"

        # Update references
        sed -i '' 's/simple-cli\.ts/cli.ts/g' "$file"
        sed -i '' 's/simple-cli\.js/cli.js/g' "$file"
        sed -i '' 's/src\/cli\/simple-cli/src\/cli\/cli/g' "$file"
        sed -i '' 's/dist\/cli\/simple-cli/dist\/cli\/cli/g' "$file"

        # Remove backup if successful
        if [ $? -eq 0 ]; then
            rm "$file.bak"
            ((updated_count++))
            echo "    ✅ Updated successfully"
        else
            # Restore from backup on failure
            mv "$file.bak" "$file"
            ((failed_count++))
            echo "    ❌ Failed to update"
        fi
    else
        echo "  ⚠️  File not found: $file"
        ((failed_count++))
    fi
done

echo ""
echo "📊 Update Summary:"
echo "  ✅ Successfully updated: $updated_count files"
echo "  ❌ Failed updates: $failed_count files"
echo ""

if [ $updated_count -gt 0 ]; then
    echo "🎉 Test references successfully updated from simple-cli.ts to cli.ts!"
else
    echo "⚠️  No files were updated. Check if files exist and have the expected content."
fi
