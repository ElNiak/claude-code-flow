#!/bin/bash
# Quick startup script with memory optimization
# HIGH PRIORITY - Immediate use

echo "🚀 Starting Claude Flow with EMERGENCY MEMORY OPTIMIZATION..."

# Set emergency memory active
export EMERGENCY_MEMORY_ACTIVE=true

# Use the memory-optimized startup script
exec ./scripts/memory-optimized-start.sh "$@"
