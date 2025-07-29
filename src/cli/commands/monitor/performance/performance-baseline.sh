#!/bin/bash
# Performance Baseline Measurement Script
# Created: 2025-07-20
# Purpose: Establish baseline metrics for performance regression testing

echo "=== CLAUDE FLOW PERFORMANCE BASELINE ==="
echo "Date: $(date)"
echo "Platform: $(uname -a)"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo ""

# CLI Startup Time
echo "=== CLI STARTUP TIME (10 runs) ==="
unset NODE_OPTIONS
total_time=0
for i in {1..10}; do
    echo -n "Run $i: "
    start_time=$(date +%s.%N)
    ./bin/claude-flow --help > /dev/null 2>&1
    end_time=$(date +%s.%N)
    runtime=$(echo "$end_time - $start_time" | bc -l)
    echo "${runtime}s"
    total_time=$(echo "$total_time + $runtime" | bc -l)
done
average_time=$(echo "scale=3; $total_time / 10" | bc -l)
echo "Average startup time: ${average_time}s"
echo ""

# Memory Usage
echo "=== MEMORY USAGE ==="
unset NODE_OPTIONS
/usr/bin/time -l ./bin/claude-flow --help 2>&1 | grep -E "maximum resident|peak memory"
echo ""

# Build Time
echo "=== BUILD TIME ==="
echo "Cleaning..."
npm run clean > /dev/null 2>&1
echo "Building..."
time npm run build > /dev/null 2>&1
echo ""

# Disk Usage
echo "=== DISK USAGE ==="
echo "Project size: $(du -sh . | cut -f1)"
echo "dist/ size: $(du -sh dist/ 2>/dev/null | cut -f1 || echo 'N/A')"
echo "node_modules/ size: $(du -sh node_modules/ | cut -f1)"
echo "bin/ size: $(du -sh bin/ | cut -f1)"
echo ""

# CLI Functionality Test
echo "=== FUNCTIONALITY TEST ==="
unset NODE_OPTIONS
echo "Testing --version:"
./bin/claude-flow --version 2>&1
echo "Testing --help (first 5 lines):"
./bin/claude-flow --help 2>&1 | head -5
echo ""

echo "=== BASELINE COMPLETE ==="
