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

# Calculate much more conservative heap size to prevent overflow
MAX_HEAP_SIZE=$(node -e "console.log(Math.min(Math.floor($TOTAL_MEMORY * 0.25), 4096))")
# Use 25% of max heap for initial size to prevent excessive allocation
INITIAL_HEAP_SIZE=$(node -e "console.log(Math.floor($MAX_HEAP_SIZE / 4))")
# Conservative semi-space sizing
SEMI_SPACE_SIZE=$(node -e "console.log(Math.min(128, Math.floor($MAX_HEAP_SIZE / 32)))")
# Conservative executable size
EXECUTABLE_SIZE=$(node -e "console.log(Math.min(1024, Math.floor($MAX_HEAP_SIZE / 4)))")

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
# NODE_FLAGS="$NODE_FLAGS --incremental-marking"  # Not allowed in NODE_OPTIONS, enabled by default

# Memory-constrained systems - Avoid flag conflicts
if [ $TOTAL_MEMORY -lt 8192 ]; then
    # Only use --optimize-for-size for very low memory systems, and don't combine with concurrent marking
    if [ $AGENT_COUNT -le 4 ]; then
        NODE_FLAGS="$NODE_FLAGS --optimize-for-size"
        echo "💾 Memory-constrained system detected - optimizing for size"
    else
        echo "💾 Memory-constrained system detected - using concurrent GC instead of size optimization"
    fi
fi

# GC strategy based on agent count - Fixed aggressive intervals
if [ $AGENT_COUNT -le 4 ]; then
    NODE_FLAGS="$NODE_FLAGS --gc-interval=2000"
    echo "🎯 Using throughput-optimized GC strategy"
elif [ $AGENT_COUNT -le 8 ]; then
    NODE_FLAGS="$NODE_FLAGS --gc-interval=1500 --concurrent-marking"
    echo "⚖️ Using balanced GC strategy"
else
    NODE_FLAGS="$NODE_FLAGS --gc-interval=1000 --concurrent-marking --concurrent-sweeping"
    echo "⚡ Using latency-optimized GC strategy"
fi

echo "🔧 Node.js Flags: $NODE_FLAGS"

# Removed emergency memory management overhead
echo "🔧 Memory optimization configured (no emergency overhead)"

# Start the application
echo "🚀 Starting application..."

# Some flags are not allowed in NODE_OPTIONS, so we'll use them directly
ALLOWED_NODE_OPTIONS="--max-old-space-size=$MAX_HEAP_SIZE --expose-gc"
# Size optimization moved to earlier section to avoid conflicts

# Only include flags that are allowed in NODE_OPTIONS
export NODE_OPTIONS="$ALLOWED_NODE_OPTIONS"

# Remove conflicting flags from EXTRA_FLAGS when using size optimization
EXTRA_FLAGS="--max-semi-space-size=$SEMI_SPACE_SIZE"

# Only add concurrent marking for higher agent counts and when not using size optimization
if [ $AGENT_COUNT -gt 4 ] && [ $TOTAL_MEMORY -ge 8192 ]; then
    EXTRA_FLAGS="$EXTRA_FLAGS --concurrent-marking"
fi

# Check if debug mode is requested
if [ "$1" = "--debug" ]; then
    echo "🔍 Debug mode enabled with memory profiling"
    export NODE_OPTIONS="$NODE_OPTIONS --inspect=0.0.0.0:9229"
fi

# EXTRA_FLAGS already configured above - remove duplicate section

# Note: --incremental-marking removed as it's not allowed in NODE_OPTIONS
# and can cause startup errors. It's enabled by default in modern Node.js anyway.

exec node $EXTRA_FLAGS "$@"
