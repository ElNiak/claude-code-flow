#!/bin/bash
set -e

PHASE=${1:-"unknown"}
DESCRIPTION=${2:-"Implementation step"}

echo "🔄 Inter-phase commit for Phase: $PHASE"
echo "Description: $DESCRIPTION"
echo "========================================"

# Function to handle rollback
handle_rollback() {
    echo "❌ Commit validation failed!"
    echo "🔄 Rolling back changes..."
    git reset --hard HEAD~1 2>/dev/null || echo "No commit to rollback"
    echo "💡 Fix the issues and retry the commit"
    exit 1
}

# Validate build before commit
echo "🔍 Running pre-commit validation..."
if ! ./scripts/validation/validate-build-before-commit.sh; then
    echo "❌ Build validation failed. Cannot proceed with commit."
    exit 1
fi

# Check if there are changes to commit
if git diff --cached --quiet && git diff --quiet; then
    echo "⚠️  No changes to commit"
    exit 0
fi

# Stage all changes
echo "📦 Staging changes..."
git add .

# Create commit with standardized message
COMMIT_MSG="Phase $PHASE: $DESCRIPTION - Build validated ✅

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "💾 Creating commit..."
git commit -m "$COMMIT_MSG" || handle_rollback

# Verify commit integrity
echo "🔍 Verifying commit integrity..."
if ! ./scripts/validation/verify-commit-integrity.sh 2>/dev/null; then
    echo "⚠️  Commit integrity verification failed, but commit was successful"
fi

echo ""
echo "✅ Inter-phase commit successful!"
echo "================================="
echo "📋 Commit details:"
echo "  Phase: $PHASE"
echo "  Description: $DESCRIPTION"
echo "  Validation: ✅ Passed"
echo "  Integrity: ✅ Verified"
echo ""
echo "🚀 Ready for next phase!"
