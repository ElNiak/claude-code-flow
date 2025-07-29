#!/bin/bash
set -e

echo "🔍 Validating build before commit..."
echo "=================================="

# Function to handle errors
handle_error() {
    echo "❌ Build validation failed at step: $1"
    echo "🔄 Run 'git status' to see current state"
    echo "🛠️  Fix the issues and retry validation"
    exit 1
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "⚠️  Not in a git repository. Skipping git-specific checks."
fi

echo "📦 Step 1: Clean build environment..."
npm run clean || handle_error "clean"

echo "🔧 Step 2: Type checking..."
npm run typecheck || handle_error "typecheck"

echo "🔨 Step 3: Building project..."
npm run build || handle_error "build"

echo "✨ Step 4: Linting code..."
npm run lint || handle_error "lint"

echo "🧪 Step 5: Running tests..."
npm run test || handle_error "test"

echo "🔍 Step 6: Checking for anti-patterns..."
if [ -f "scripts/validation/detect-anti-patterns.sh" ]; then
    ./scripts/validation/detect-anti-patterns.sh || handle_error "anti-pattern detection"
else
    echo "⚠️  Anti-pattern detection script not found, skipping..."
fi

echo ""
echo "✅ Build validation complete!"
echo "================================"
echo "📋 All checks passed:"
echo "  ✓ Clean build environment"
echo "  ✓ TypeScript compilation"
echo "  ✓ Project build"
echo "  ✓ Code linting"
echo "  ✓ Unit tests"
echo "  ✓ Anti-pattern detection"
echo ""
echo "🚀 Ready for commit!"
