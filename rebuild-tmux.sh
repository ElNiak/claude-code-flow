#!/bin/bash

echo "🧹 Cleaning previous build..."
npm run clean

echo "🔨 Building project..."
npm run build

echo "✅ Build complete!"
echo ""
echo "🧪 Test the tmux integration:"
echo "   npx claude-flow work \"test tmux integration\" --tmux --debug"
