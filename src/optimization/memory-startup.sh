#!/bin/bash

# Node.js Memory Optimization Startup Script
# Optimized for multi-agent systems with dynamic memory management

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/memory-config.json"
LOG_FILE="${SCRIPT_DIR}/../../logs/memory-optimization.log"

# Default values
NODE_ENV=${NODE_ENV:-production}
AGENT_COUNT=${AGENT_COUNT:-8}
MEMORY_PROFILE=${MEMORY_PROFILE:-balanced}
ENABLE_PROFILING=${ENABLE_PROFILING:-false}
ENABLE_MONITORING=${ENABLE_MONITORING:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

log "🚀 Starting Node.js Memory Optimization Setup"
log "Environment: $NODE_ENV"
log "Agent Count: $AGENT_COUNT"
log "Memory Profile: $MEMORY_PROFILE"

# System information
log "📊 System Information:"
log "   Total RAM: $(free -h | awk '/^Mem:/ {print $2}' 2>/dev/null || echo 'Unknown')"
log "   Available RAM: $(free -h | awk '/^Mem:/ {print $7}' 2>/dev/null || echo 'Unknown')"
log "   CPU Cores: $(nproc 2>/dev/null || echo 'Unknown')"
log "   Node.js Version: $(node --version)"

# Calculate optimal heap size based on available memory
calculate_optimal_heap_size() {
    local available_memory

    # Get available memory in MB (works on both Linux and macOS)
    if command -v free > /dev/null 2>&1; then
        # Linux
        available_memory=$(free -m | awk '/^Mem:/ {print $7}')
    elif command -v vm_stat > /dev/null 2>&1; then
        # macOS
        local pages_free=$(vm_stat | grep 'Pages free' | awk '{print $3}' | sed 's/\.//')
        local page_size=$(vm_stat | grep 'page size' | awk '{print $8}' | sed 's/\.//')
        available_memory=$((pages_free * page_size / 1024 / 1024))
    else
        # Default fallback
        available_memory=4096
    fi

    # Calculate heap size (70% of available memory divided by agent count)
    local heap_per_agent=$((available_memory * 70 / 100 / AGENT_COUNT))

    # Ensure minimum 512MB, maximum 8GB per agent
    if [ "$heap_per_agent" -lt 512 ]; then
        heap_per_agent=512
    elif [ "$heap_per_agent" -gt 8192 ]; then
        heap_per_agent=8192
    fi

    echo $heap_per_agent
}

# Set memory optimization flags based on profile
set_memory_flags() {
    local profile=$1
    local heap_size=$2

    # Base flags
    local base_flags=(
        "--max-old-space-size=$heap_size"
        "--initial-old-space-size=$((heap_size / 4))"
        "--max-semi-space-size=$((heap_size / 16))"
        "--max-executable-size=256"
        "--expose-gc"
        "--incremental-marking"
        "--concurrent-marking"
        "--use-idle-notification"
    )

    # Profile-specific flags
    case $profile in
        "highThroughput")
            local profile_flags=(
                "--parallel-gc-threads=8"
                "--optimize-for-size"
                "--enable-precise-gc"
            )
            ;;
        "lowLatency")
            local profile_flags=(
                "--parallel-gc-threads=2"
                "--max-semi-space-size=32"
            )
            ;;
        "balanced")
            local profile_flags=(
                "--parallel-gc-threads=4"
                "--enable-precise-gc"
            )
            ;;
        "memoryConstrained")
            local profile_flags=(
                "--parallel-gc-threads=2"
                "--max-semi-space-size=16"
                "--optimize-for-size"
            )
            ;;
        *)
            local profile_flags=(
                "--parallel-gc-threads=4"
                "--enable-precise-gc"
            )
            ;;
    esac

    # Development/debugging flags
    if [ "$NODE_ENV" = "development" ] || [ "$ENABLE_PROFILING" = "true" ]; then
        local debug_flags=(
            "--trace-gc"
            "--trace-gc-verbose"
            "--track-heap-objects"
        )
        profile_flags+=("${debug_flags[@]}")
    fi

    # Combine all flags
    local all_flags=("${base_flags[@]}" "${profile_flags[@]}")

    # Export as NODE_OPTIONS
    export NODE_OPTIONS="${all_flags[*]}"

    log "🔧 Memory flags set: $NODE_OPTIONS"
}

# Set environment variables for optimal performance
set_environment_variables() {
    # UV thread pool size (for file I/O operations)
    export UV_THREADPOOL_SIZE=$((AGENT_COUNT * 2))

    # Memory allocator optimizations (Linux only)
    if [ "$(uname)" = "Linux" ]; then
        export MALLOC_ARENA_MAX=2
        export MALLOC_MMAP_THRESHOLD_=131072
        export MALLOC_TRIM_THRESHOLD_=131072
        export MALLOC_TOP_PAD_=131072
        export MALLOC_MMAP_MAX_=65536
    fi

    # Node.js specific
    export NODE_ENV=$NODE_ENV
    export NODE_NO_WARNINGS=1

    log "🌍 Environment variables configured"
    log "   UV_THREADPOOL_SIZE: $UV_THREADPOOL_SIZE"
    log "   NODE_ENV: $NODE_ENV"
}

# Monitor memory usage during startup
monitor_memory_startup() {
    local pid=$1
    local duration=${2:-30}

    log "📊 Monitoring memory usage for ${duration}s..."

    for i in $(seq 1 $duration); do
        if kill -0 "$pid" 2>/dev/null; then
            local mem_info=$(ps -p "$pid" -o rss= 2>/dev/null || echo "0")
            local mem_mb=$((mem_info / 1024))

            if [ $((i % 10)) -eq 0 ]; then
                log "   Memory usage: ${mem_mb}MB (RSS)"
            fi

            sleep 1
        else
            warn "Process $pid no longer exists"
            break
        fi
    done
}

# Validate system requirements
validate_system_requirements() {
    log "🔍 Validating system requirements..."

    # Check available memory
    local available_memory
    if command -v free > /dev/null 2>&1; then
        available_memory=$(free -m | awk '/^Mem:/ {print $7}')
    elif command -v vm_stat > /dev/null 2>&1; then
        local pages_free=$(vm_stat | grep 'Pages free' | awk '{print $3}' | sed 's/\.//')
        local page_size=$(vm_stat | grep 'page size' | awk '{print $8}' | sed 's/\.//')
        available_memory=$((pages_free * page_size / 1024 / 1024))
    else
        warn "Cannot determine available memory"
        available_memory=4096
    fi

    local required_memory=$((AGENT_COUNT * 512))

    if [ "$available_memory" -lt "$required_memory" ]; then
        error "Insufficient memory. Required: ${required_memory}MB, Available: ${available_memory}MB"
    fi

    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local major_version=$(echo "$node_version" | cut -d'.' -f1)

    if [ "$major_version" -lt 18 ]; then
        error "Node.js version 18 or higher required. Current: $node_version"
    fi

    log "✅ System requirements validated"
    log "   Available memory: ${available_memory}MB"
    log "   Required memory: ${required_memory}MB"
    log "   Node.js version: $node_version"
}

# Generate performance report
generate_performance_report() {
    local output_file="${SCRIPT_DIR}/../../reports/memory-performance-$(date +%Y%m%d-%H%M%S).json"

    mkdir -p "$(dirname "$output_file")"

    cat > "$output_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "configuration": {
    "nodeEnv": "$NODE_ENV",
    "agentCount": $AGENT_COUNT,
    "memoryProfile": "$MEMORY_PROFILE",
    "nodeOptions": "$NODE_OPTIONS",
    "uvThreadPoolSize": "$UV_THREADPOOL_SIZE"
  },
  "system": {
    "platform": "$(uname -s)",
    "nodeVersion": "$(node --version)",
    "cpuCores": $(nproc 2>/dev/null || echo 1),
    "totalMemory": "$(free -h | awk '/^Mem:/ {print $2}' 2>/dev/null || echo 'Unknown')",
    "availableMemory": "$(free -h | awk '/^Mem:/ {print $7}' 2>/dev/null || echo 'Unknown')"
  },
  "optimization": {
    "heapSizeCalculated": $(calculate_optimal_heap_size),
    "profileUsed": "$MEMORY_PROFILE",
    "monitoringEnabled": $ENABLE_MONITORING,
    "profilingEnabled": $ENABLE_PROFILING
  }
}
EOF

    log "📄 Performance report generated: $output_file"
}

# Main execution
main() {
    log "🎯 Starting memory optimization process..."

    # Validate system
    validate_system_requirements

    # Calculate optimal heap size
    local optimal_heap_size=$(calculate_optimal_heap_size)
    log "💾 Calculated optimal heap size: ${optimal_heap_size}MB per agent"

    # Set memory flags
    set_memory_flags "$MEMORY_PROFILE" "$optimal_heap_size"

    # Set environment variables
    set_environment_variables

    # Generate performance report
    generate_performance_report

    log "✅ Memory optimization setup completed successfully!"
    log "🚀 Ready to start Node.js application with optimized memory settings"

    # If a command was provided, execute it
    if [ $# -gt 0 ]; then
        log "🔄 Executing command: $*"
        exec "$@"
    fi
}

# Help function
show_help() {
    cat << EOF
Node.js Memory Optimization Startup Script

Usage: $0 [OPTIONS] [COMMAND]

Options:
  -e, --env ENV             Set NODE_ENV (default: production)
  -a, --agents COUNT        Set agent count (default: 8)
  -p, --profile PROFILE     Set memory profile (default: balanced)
                           Options: highThroughput, lowLatency, balanced, memoryConstrained
  -m, --monitoring          Enable memory monitoring (default: true)
  -d, --debug               Enable profiling and debugging
  -h, --help               Show this help message

Examples:
  $0                                    # Setup with defaults
  $0 -e development -a 4 -p lowLatency  # Development with 4 agents, low latency profile
  $0 -d node app.js                     # Start app.js with debugging enabled
  $0 --profile highThroughput npm start # Start with high throughput profile

Memory Profiles:
  balanced         - Balanced performance and memory usage (default)
  highThroughput   - Optimized for maximum throughput
  lowLatency       - Optimized for low latency
  memoryConstrained - Optimized for limited memory environments

Environment Variables:
  NODE_ENV         - Node.js environment (development, production, test)
  AGENT_COUNT      - Number of agents to optimize for
  MEMORY_PROFILE   - Memory optimization profile
  ENABLE_PROFILING - Enable memory profiling (true/false)
  ENABLE_MONITORING - Enable memory monitoring (true/false)
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            NODE_ENV="$2"
            shift 2
            ;;
        -a|--agents)
            AGENT_COUNT="$2"
            shift 2
            ;;
        -p|--profile)
            MEMORY_PROFILE="$2"
            shift 2
            ;;
        -m|--monitoring)
            ENABLE_MONITORING=true
            shift
            ;;
        -d|--debug)
            ENABLE_PROFILING=true
            NODE_ENV=development
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            break
            ;;
    esac
done

# Run main function
main "$@"
