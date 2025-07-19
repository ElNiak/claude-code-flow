#!/bin/bash
set -e

echo "🔍 Verifying commit integrity..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "⚠️  Not in a git repository"
    exit 1
fi

# Get the latest commit hash
LATEST_COMMIT=$(git rev-parse HEAD)

# Check if the commit exists
if ! git cat-file -e $LATEST_COMMIT 2>/dev/null; then
    echo "❌ Latest commit not found"
    exit 1
fi

# Verify the commit is properly formed
COMMIT_INFO=$(git show --format="%H %s" -s $LATEST_COMMIT)
echo "📋 Latest commit: $COMMIT_INFO"

# Check if build still passes after commit
echo "🔍 Validating build integrity post-commit..."
if npm run typecheck >/dev/null 2>&1; then
    echo "✅ TypeScript compilation passes"
else
    echo "❌ TypeScript compilation fails after commit"
    exit 1
fi

if npm run build >/dev/null 2>&1; then
    echo "✅ Build passes"
else
    echo "❌ Build fails after commit"
    exit 1
fi

echo "✅ Commit integrity verified successfully!"
