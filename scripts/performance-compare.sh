#!/bin/bash
# Performance Comparison Script
# Created: 2025-07-20
# Purpose: Compare current performance against baseline

echo "=== CLAUDE FLOW PERFORMANCE COMPARISON ==="
echo "Date: $(date)"
echo ""

# Baseline values
BASELINE_STARTUP="0.252"
BASELINE_BUILD="7.162"
BASELINE_MEMORY_MB="99.3"

echo "📊 BASELINE vs CURRENT PERFORMANCE"
echo "======================================"
echo ""

# Current CLI Startup Time
echo "🚀 CLI STARTUP TIME:"
echo "   Baseline: ${BASELINE_STARTUP}s"
unset NODE_OPTIONS
total_time=0
for i in {1..5}; do
    start_time=$(date +%s.%N)
    ./bin/claude-flow --help > /dev/null 2>&1
    end_time=$(date +%s.%N)
    runtime=$(echo "$end_time - $start_time" | bc -l)
    total_time=$(echo "$total_time + $runtime" | bc -l)
done
current_startup=$(echo "scale=3; $total_time / 5" | bc -l)
echo "   Current:  ${current_startup}s"

# Calculate percentage change
startup_change=$(echo "scale=1; ($current_startup - $BASELINE_STARTUP) / $BASELINE_STARTUP * 100" | bc -l)
if (( $(echo "$startup_change > 0" | bc -l) )); then
    echo "   Change:   +${startup_change}% (SLOWER) ⚠️"
elif (( $(echo "$startup_change < -5" | bc -l) )); then
    echo "   Change:   ${startup_change}% (FASTER) ✅"
else
    echo "   Change:   ${startup_change}% (SIMILAR) ➡️"
fi
echo ""

# Current Memory Usage
echo "🧠 MEMORY USAGE:"
echo "   Baseline: ${BASELINE_MEMORY_MB}MB"
current_memory_bytes=$(/usr/bin/time -l ./bin/claude-flow --help 2>&1 | grep "maximum resident" | awk '{print $1}')
current_memory_mb=$(echo "scale=1; $current_memory_bytes / 1024 / 1024" | bc -l)
echo "   Current:  ${current_memory_mb}MB"

memory_change=$(echo "scale=1; ($current_memory_mb - $BASELINE_MEMORY_MB) / $BASELINE_MEMORY_MB * 100" | bc -l)
if (( $(echo "$memory_change > 10" | bc -l) )); then
    echo "   Change:   +${memory_change}% (HIGHER) ⚠️"
elif (( $(echo "$memory_change < -10" | bc -l) )); then
    echo "   Change:   ${memory_change}% (LOWER) ✅"
else
    echo "   Change:   ${memory_change}% (SIMILAR) ➡️"
fi
echo ""

# Current Build Time
echo "🏗️  BUILD TIME:"
echo "   Baseline: ${BASELINE_BUILD}s"
npm run clean > /dev/null 2>&1
start_time=$(date +%s.%N)
npm run build > /dev/null 2>&1
end_time=$(date +%s.%N)
current_build=$(echo "scale=3; $end_time - $start_time" | bc -l)
echo "   Current:  ${current_build}s"

build_change=$(echo "scale=1; ($current_build - $BASELINE_BUILD) / $BASELINE_BUILD * 100" | bc -l)
if (( $(echo "$build_change > 20" | bc -l) )); then
    echo "   Change:   +${build_change}% (SLOWER) ⚠️"
elif (( $(echo "$build_change < -20" | bc -l) )); then
    echo "   Change:   ${build_change}% (FASTER) ✅"
else
    echo "   Change:   ${build_change}% (SIMILAR) ➡️"
fi
echo ""

# Summary
echo "📋 PERFORMANCE SUMMARY:"
if (( $(echo "$startup_change > 10" | bc -l) )) || (( $(echo "$memory_change > 20" | bc -l) )) || (( $(echo "$build_change > 30" | bc -l) )); then
    echo "   Status: PERFORMANCE REGRESSION DETECTED ❌"
    echo "   Action: Review recent changes and optimize"
elif (( $(echo "$startup_change < -5" | bc -l) )) && (( $(echo "$memory_change < -10" | bc -l) )); then
    echo "   Status: PERFORMANCE IMPROVED ✅"
    echo "   Action: Document optimizations"
else
    echo "   Status: PERFORMANCE STABLE ➡️"
    echo "   Action: Continue monitoring"
fi
echo ""
echo "=== COMPARISON COMPLETE ==="
