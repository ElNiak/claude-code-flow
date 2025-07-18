#!/bin/bash
# Memory-Optimized Node.js Startup Script for Claude Flow
# HIGH PRIORITY - Immediate implementation

set -e

echo "🚀 Starting Claude Flow with Memory Optimization..."

# Detect system resources
TOTAL_MEMORY=$(node -e "console.log(Math.floor(require('os').totalmem() / 1024 / 1024))")
CPU_CORES=$(node -e "console.log(require('os').cpus().length)")
AGENT_COUNT=${AGENT_COUNT:-6}

echo "📊 System Resources:"
echo "   Total Memory: ${TOTAL_MEMORY}MB"
echo "   CPU Cores: ${CPU_CORES}"
echo "   Target Agents: ${AGENT_COUNT}"

# Calculate optimal heap size (60% of system memory, max 12GB for Option B)
MAX_HEAP_SIZE=$(node -e "console.log(Math.min(Math.floor($TOTAL_MEMORY * 0.6), 12288))")
INITIAL_HEAP_SIZE=$(node -e "console.log(Math.floor($MAX_HEAP_SIZE / 4))")
SEMI_SPACE_SIZE=$(node -e "console.log(Math.min(192, Math.floor($MAX_HEAP_SIZE / 64)))")
EXECUTABLE_SIZE=$(node -e "console.log(Math.min(384, Math.floor($MAX_HEAP_SIZE / 32)))")

echo "🧠 Memory Configuration:"
echo "   Max Heap Size: ${MAX_HEAP_SIZE}MB"
echo "   Initial Heap Size: ${INITIAL_HEAP_SIZE}MB"
echo "   Semi Space Size: ${SEMI_SPACE_SIZE}MB"
echo "   Executable Size: ${EXECUTABLE_SIZE}MB"

# Set environment variables
export UV_THREADPOOL_SIZE=$((CPU_CORES * 2))
export NODE_ENV=production
export AGENT_COUNT=$AGENT_COUNT

# Configure Node.js memory flags
NODE_FLAGS="--max-old-space-size=$MAX_HEAP_SIZE"
NODE_FLAGS="$NODE_FLAGS --max-semi-space-size=$SEMI_SPACE_SIZE"
NODE_FLAGS="$NODE_FLAGS --initial-old-space-size=$INITIAL_HEAP_SIZE"
NODE_FLAGS="$NODE_FLAGS --max-executable-size=$EXECUTABLE_SIZE"
NODE_FLAGS="$NODE_FLAGS --expose-gc"
NODE_FLAGS="$NODE_FLAGS --incremental-marking"

# Memory-constrained systems
if [ $TOTAL_MEMORY -lt 8192 ]; then
    NODE_FLAGS="$NODE_FLAGS --optimize-for-size"
    echo "💾 Memory-constrained system detected - optimizing for size"
fi

# GC strategy based on agent count
if [ $AGENT_COUNT -le 4 ]; then
    NODE_FLAGS="$NODE_FLAGS --gc-interval=100"
    echo "🎯 Using throughput-optimized GC strategy"
elif [ $AGENT_COUNT -le 8 ]; then
    NODE_FLAGS="$NODE_FLAGS --gc-interval=50 --concurrent-marking"
    echo "⚖️ Using balanced GC strategy"
else
    NODE_FLAGS="$NODE_FLAGS --gc-interval=25 --concurrent-marking --concurrent-sweeping"
    echo "⚡ Using latency-optimized GC strategy"
fi

echo "🔧 Node.js Flags: $NODE_FLAGS"

# Emergency memory management
echo "🚨 Activating emergency memory management..."
export EMERGENCY_MEMORY_ACTIVE=true

# Start the application
echo "🚀 Starting application..."

# Some flags are not allowed in NODE_OPTIONS, so we'll use them directly
ALLOWED_NODE_OPTIONS="--max-old-space-size=$MAX_HEAP_SIZE --expose-gc"
if [ $TOTAL_MEMORY -lt 12288 ]; then
    ALLOWED_NODE_OPTIONS="$ALLOWED_NODE_OPTIONS --optimize-for-size"
fi

# Only include flags that are allowed in NODE_OPTIONS
export NODE_OPTIONS="$ALLOWED_NODE_OPTIONS"

# Check if debug mode is requested
if [ "$1" = "--debug" ]; then
    echo "🔍 Debug mode enabled with memory profiling"
    export NODE_OPTIONS="$NODE_OPTIONS --inspect=0.0.0.0:9229"
fi

# Start the main application with additional flags not allowed in NODE_OPTIONS
EXTRA_FLAGS="--max-semi-space-size=$SEMI_SPACE_SIZE --incremental-marking"

# Only use valid GC flags that are supported
if [ $AGENT_COUNT -gt 8 ]; then
    EXTRA_FLAGS="$EXTRA_FLAGS --concurrent-marking"
fi

exec node $EXTRA_FLAGS "$@"
