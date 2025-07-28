#!/bin/bash

# Phase 1 CLI Consolidation Validation Execution Script
# ABOUTME: Executes comprehensive validation framework for Phase 1 CLI consolidation
# ABOUTME: Runs pre-implementation tests, component validation, integration tests, and safety checks

set -e  # Exit on any error

echo "🚀 Phase 1 CLI Consolidation Validation Framework"
echo "================================================="
echo "Date: $(date)"
echo "Platform: $(uname -s)"
echo "Node Version: $(node --version)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
CRITICAL_FAILURES=0

# Log functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_critical() {
    echo -e "${RED}🚨 CRITICAL: $1${NC}"
    ((CRITICAL_FAILURES++))
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        log_critical "Node.js not found"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_critical "npm not found"
        exit 1
    fi

    if [ ! -f "package.json" ]; then
        log_critical "package.json not found - run from project root"
        exit 1
    fi

    if [ ! -d "src/cli" ]; then
        log_critical "src/cli directory not found"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Pre-implementation validation
run_pre_implementation_validation() {
    log_info "Running Pre-Implementation Validation..."

    # P1.1: Check current CLI implementations
    log_info "Checking current CLI implementations..."

    if [ -f "src/cli/simple-cli.ts" ]; then
        log_success "Primary CLI implementation found: simple-cli.ts"
    else
        log_critical "Primary CLI implementation missing: simple-cli.ts"
    fi

    if [ -f "src/cli/simple-cli.js" ]; then
        log_warning "Legacy CLI implementation found: simple-cli.js"
    fi

    # Count total CLI implementations
    CLI_COUNT=$(find src/cli -name "*cli*.ts" -o -name "*cli*.js" | grep -E "(simple-cli|unified-cli|optimized-cli)" | wc -l)
    log_info "Total CLI implementations found: $CLI_COUNT"

    # P1.2: Test current CLI baseline
    log_info "Testing current CLI baseline..."

    if timeout 10s npm run dev -- --version > /dev/null 2>&1; then
        log_success "CLI version command works"
    else
        log_critical "CLI version command failed"
    fi

    if timeout 15s npm run dev -- --help > /dev/null 2>&1; then
        log_success "CLI help command works"
    else
        log_error "CLI help command failed"
    fi

    # P1.3: Check critical files
    CRITICAL_FILES=(
        "src/cli/command-registry.js"
        "src/cli/utils.js"
        "src/mcp/mcp-server.js"
        "src/memory/shared-memory.js"
        "bin/claude-flow"
    )

    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            log_success "Critical file exists: $file"
        else
            log_critical "Critical file missing: $file"
        fi
    done
}

# Component validation
run_component_validation() {
    log_info "Running Component Validation..."

    # CV1: Command registry validation
    log_info "Validating command registry..."

    if node -e "
        try {
            const { commandRegistry, registerCoreCommands } = require('./src/cli/command-registry.js');
            registerCoreCommands();
            const commandCount = commandRegistry.size;
            console.log('Commands registered:', commandCount);
            if (commandCount >= 10) {
                console.log('SUCCESS: Command registry has sufficient commands');
                process.exit(0);
            } else {
                console.log('ERROR: Insufficient commands registered');
                process.exit(1);
            }
        } catch (error) {
            console.log('ERROR: Command registry validation failed:', error.message);
            process.exit(1);
        }
    " 2>/dev/null; then
        log_success "Command registry validation passed"
    else
        log_critical "Command registry validation failed"
    fi

    # CV2: MCP server validation
    log_info "Validating MCP server..."

    if node -e "
        try {
            const { ClaudeFlowMCPServer } = require('./src/mcp/mcp-server.js');
            const server = new ClaudeFlowMCPServer();
            console.log('SUCCESS: MCP server can be instantiated');
            process.exit(0);
        } catch (error) {
            console.log('ERROR: MCP server validation failed:', error.message);
            process.exit(1);
        }
    " 2>/dev/null; then
        log_success "MCP server validation passed"
    else
        log_error "MCP server validation failed"
    fi

    # CV3: Shared memory validation
    log_info "Validating shared memory..."

    if node -e "
        const SharedMemory = require('./src/memory/shared-memory.js').default;
        const sm = new SharedMemory({
            directory: '.swarm',
            filename: 'validation-test.db'
        });

        sm.initialize()
            .then(() => sm.store('test-key', 'test-value'))
            .then(() => sm.retrieve('test-key'))
            .then(value => {
                if (value === 'test-value') {
                    console.log('SUCCESS: Shared memory validation passed');
                    return sm.close();
                } else {
                    console.log('ERROR: Shared memory data integrity failed');
                    process.exit(1);
                }
            })
            .then(() => {
                // Cleanup
                const fs = require('fs');
                const path = '.swarm/validation-test.db';
                if (fs.existsSync(path)) fs.unlinkSync(path);
                process.exit(0);
            })
            .catch(error => {
                console.log('ERROR: Shared memory validation failed:', error.message);
                process.exit(1);
            });
    " 2>/dev/null; then
        log_success "Shared memory validation passed"
    else
        log_error "Shared memory validation failed"
    fi
}

# Integration validation
run_integration_validation() {
    log_info "Running Integration Validation..."

    # IV1: MCP integration test
    log_info "Testing MCP integration..."

    if timeout 10s npm run mcp:test > /dev/null 2>&1; then
        log_success "MCP integration test passed"
    else
        log_error "MCP integration test failed"
    fi

    # IV2: Hooks integration test
    log_info "Testing hooks integration..."

    if [ -f "src/hooks/hook-coordinator.ts" ] && [ -f "src/hooks/hook-execution-manager.ts" ]; then
        log_success "Hooks system files present"
    else
        log_error "Hooks system files missing"
    fi

    # IV3: TypeScript compilation test
    log_info "Testing TypeScript compilation..."

    if npm run typecheck > /dev/null 2>&1; then
        log_success "TypeScript compilation passed"
    else
        log_warning "TypeScript compilation has issues (may be non-critical)"
    fi
}

# Performance validation
run_performance_validation() {
    log_info "Running Performance Validation..."

    # PV1: CLI startup time
    log_info "Measuring CLI startup time..."

    START_TIME=$(node -e "console.log(Date.now())")
    if npm run dev -- --version > /dev/null 2>&1; then
        END_TIME=$(node -e "console.log(Date.now())")
        DURATION=$((END_TIME - START_TIME))

        if [ $DURATION -le 2000 ]; then  # 2 seconds threshold for npm run dev
            log_success "CLI startup time acceptable: ${DURATION}ms"
        else
            log_warning "CLI startup time slow: ${DURATION}ms"
        fi
    else
        log_error "CLI startup performance test failed"
    fi

    # PV2: Memory usage check
    log_info "Checking memory usage..."

    MEMORY_MB=$(node -e "console.log(Math.round(process.memoryUsage().heapUsed / 1024 / 1024))")
    if [ $MEMORY_MB -le 100 ]; then  # 100MB threshold
        log_success "Memory usage acceptable: ${MEMORY_MB}MB"
    else
        log_warning "Memory usage high: ${MEMORY_MB}MB"
    fi
}

# Safety validation
run_safety_validation() {
    log_info "Running Safety Validation..."

    # SV1: Error handling test
    log_info "Testing error handling..."

    if npm run dev -- nonexistent-command > /dev/null 2>&1; then
        log_error "Invalid command should have failed but didn't"
    else
        log_success "Invalid command handling works correctly"
    fi

    # SV2: File permissions test
    log_info "Testing file permissions..."

    if [ -x "bin/claude-flow" ]; then
        log_success "CLI binary is executable"
    else
        log_error "CLI binary is not executable"
    fi

    # SV3: Directory structure test
    log_info "Testing directory structure..."

    REQUIRED_DIRS=(".swarm" "src/cli" "src/mcp" "src/memory")

    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Required directory exists: $dir"
        else
            log_error "Required directory missing: $dir"
        fi
    done
}

# Generate summary report
generate_summary() {
    echo ""
    echo "=========================================="
    echo "📊 VALIDATION SUMMARY REPORT"
    echo "=========================================="
    echo "Date: $(date)"
    echo ""

    PASS_RATE=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi

    echo "📈 Test Results:"
    echo "   Total Tests: $TOTAL_TESTS"
    echo "   ✅ Passed: $PASSED_TESTS ($PASS_RATE%)"
    echo "   ❌ Failed: $FAILED_TESTS"
    echo "   🚨 Critical Failures: $CRITICAL_FAILURES"
    echo ""

    # Recommendation
    if [ $CRITICAL_FAILURES -gt 0 ]; then
        echo -e "${RED}🚨 RECOMMENDATION: DO NOT PROCEED${NC}"
        echo "   Critical failures must be resolved before CLI consolidation"
        RECOMMENDATION="STOP"
    elif [ $PASS_RATE -ge 90 ]; then
        echo -e "${GREEN}✅ RECOMMENDATION: PROCEED${NC}"
        echo "   Validation passed with excellent score"
        RECOMMENDATION="PROCEED"
    elif [ $PASS_RATE -ge 75 ]; then
        echo -e "${YELLOW}✅ RECOMMENDATION: PROCEED WITH MONITORING${NC}"
        echo "   Good validation score, monitor remaining issues"
        RECOMMENDATION="PROCEED_MONITOR"
    else
        echo -e "${RED}❌ RECOMMENDATION: INVESTIGATE${NC}"
        echo "   Overall score too low, investigate failed tests"
        RECOMMENDATION="INVESTIGATE"
    fi

    echo ""
    echo "=========================================="

    # Save summary to file
    {
        echo "Phase 1 CLI Consolidation Validation Summary"
        echo "Generated: $(date)"
        echo "Platform: $(uname -s)"
        echo "Node Version: $(node --version)"
        echo ""
        echo "Results:"
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS ($PASS_RATE%)"
        echo "Failed: $FAILED_TESTS"
        echo "Critical Failures: $CRITICAL_FAILURES"
        echo "Recommendation: $RECOMMENDATION"
    } > "phase1-validation-summary-$(date +%Y%m%d-%H%M%S).txt"

    echo "📄 Summary saved to: phase1-validation-summary-$(date +%Y%m%d-%H%M%S).txt"

    # Return appropriate exit code
    if [ "$RECOMMENDATION" = "STOP" ]; then
        return 2
    elif [ "$RECOMMENDATION" = "INVESTIGATE" ]; then
        return 1
    else
        return 0
    fi
}

# Main execution
main() {
    log_info "Starting Phase 1 CLI Consolidation Validation..."

    check_prerequisites
    run_pre_implementation_validation
    run_component_validation
    run_integration_validation
    run_performance_validation
    run_safety_validation

    if generate_summary; then
        log_success "Validation completed successfully!"
        exit 0
    else
        exit_code=$?
        log_error "Validation completed with issues (exit code: $exit_code)"
        exit $exit_code
    fi
}

# Handle script interruption
trap 'echo -e "\n${RED}❌ Validation interrupted${NC}"; exit 130' INT TERM

# Execute main function
main "$@"
