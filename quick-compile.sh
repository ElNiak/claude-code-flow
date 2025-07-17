#!/bin/bash

# Quick compilation script for tmux fix
echo "🔧 Compiling TypeScript files..."

# Check if we're in the right directory
if [ ! -f "tsconfig.json" ]; then
    echo "❌ tsconfig.json not found. Please run from project root."
    exit 1
fi

# Run TypeScript compilation
echo "🔨 Running tsc..."
npx tsc

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation completed successfully"

    # Check if the compiled file exists
    if [ -f "dist/unified/work/tmux-manager.js" ]; then
        echo "✅ Compiled tmux-manager.js found"

        # Check if retry logic is present
        if grep -q "maxAttempts" "dist/unified/work/tmux-manager.js"; then
            echo "✅ Retry logic successfully compiled"
        else
            echo "⚠️  Retry logic may not be compiled properly"
        fi
    else
        echo "❌ Compiled tmux-manager.js not found"
    fi

    echo ""
    echo "🎉 Compilation complete! You can now test the tmux integration:"
    echo "   npx claude-flow work \"test tmux integration\" --tmux --debug"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi
