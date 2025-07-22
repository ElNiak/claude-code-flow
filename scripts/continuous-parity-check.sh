#!/bin/bash
# Continuous Feature Parity Checker
# Runs validation tests continuously during merger process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORTS_DIR="./reports"
BASELINE_FILE="${REPORTS_DIR}/baseline-features.json"
WATCH_INTERVAL=${WATCH_INTERVAL:-30}  # seconds between checks
CLI_PATH=${CLI_PATH:-"./bin/claude-flow"}

# Ensure reports directory exists
mkdir -p "$REPORTS_DIR"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run validation
run_validation() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="${REPORTS_DIR}/validation_${timestamp}.json"

    print_status "$BLUE" "\n🔍 Running feature parity validation..."

    # Run validation
    if node scripts/validate-feature-parity.js --cli "$CLI_PATH" > "${REPORTS_DIR}/validation_${timestamp}.log" 2>&1; then
        print_status "$GREEN" "✅ Validation passed!"
        return 0
    else
        print_status "$RED" "❌ Validation failed!"
        return 1
    fi
}

# Function to compare with baseline
compare_baseline() {
    if [ ! -f "$BASELINE_FILE" ]; then
        print_status "$YELLOW" "⚠️  No baseline found. Run: node scripts/capture-baseline-features.js"
        return 1
    fi

    print_status "$BLUE" "📊 Comparing with baseline..."

    # Extract key metrics from baseline
    local baseline_success_rate=$(jq -r '.summary.averageSuccessRate' "$BASELINE_FILE")
    local baseline_features=$(jq -r '.inventory.commands | length' "$BASELINE_FILE")

    print_status "$BLUE" "   Baseline success rate: ${baseline_success_rate}%"
    print_status "$BLUE" "   Baseline features: ${baseline_features}"
}

# Function to check critical features
check_critical_features() {
    print_status "$BLUE" "\n🔥 Checking critical features..."

    local critical_pass=true

    # Test help command
    if $CLI_PATH --help > /dev/null 2>&1; then
        print_status "$GREEN" "   ✅ Help command"
    else
        print_status "$RED" "   ❌ Help command"
        critical_pass=false
    fi

    # Test version command
    if $CLI_PATH --version > /dev/null 2>&1; then
        print_status "$GREEN" "   ✅ Version command"
    else
        print_status "$RED" "   ❌ Version command"
        critical_pass=false
    fi

    # Test MCP server
    if timeout 2s $CLI_PATH mcp list-tools > /dev/null 2>&1; then
        print_status "$GREEN" "   ✅ MCP tools listing"
    else
        print_status "$YELLOW" "   ⚠️  MCP tools listing (may need server running)"
    fi

    if [ "$critical_pass" = false ]; then
        print_status "$RED" "\n🚨 Critical features are failing!"
        return 1
    fi

    return 0
}

# Function to generate summary
generate_summary() {
    local validation_count=$(ls -1 ${REPORTS_DIR}/validation_*.json 2>/dev/null | wc -l)
    local last_success=$(ls -1t ${REPORTS_DIR}/validation_*.json 2>/dev/null | head -1)

    print_status "$BLUE" "\n📊 Validation Summary:"
    print_status "$BLUE" "   Total validations run: $validation_count"

    if [ -n "$last_success" ] && [ -f "$last_success" ]; then
        local success_rate=$(jq -r '.summary.successRate // "N/A"' "$last_success" 2>/dev/null || echo "N/A")
        print_status "$BLUE" "   Last success rate: ${success_rate}%"
    fi
}

# Main monitoring loop
main() {
    print_status "$GREEN" "🚀 Starting Continuous Feature Parity Checker"
    print_status "$BLUE" "   CLI Path: $CLI_PATH"
    print_status "$BLUE" "   Check Interval: ${WATCH_INTERVAL}s"
    print_status "$BLUE" "   Reports Directory: $REPORTS_DIR"
    echo ""

    # Initial baseline comparison
    compare_baseline

    # Continuous monitoring
    while true; do
        print_status "$YELLOW" "\n$(date '+%Y-%m-%d %H:%M:%S') - Starting validation cycle"

        # Run checks
        check_critical_features
        critical_status=$?

        run_validation
        validation_status=$?

        # Generate report if requested
        if [ "$GENERATE_REPORT" = "true" ]; then
            node scripts/generate-parity-report.js \
                --validation "${REPORTS_DIR}/feature-parity-report.json" \
                --baseline "$BASELINE_FILE" \
                --format markdown
        fi

        # Summary
        generate_summary

        # Alert on failures
        if [ $critical_status -ne 0 ] || [ $validation_status -ne 0 ]; then
            print_status "$RED" "\n⚠️  ALERT: Feature parity issues detected!"

            # Optional: Send notification (requires terminal-notifier on macOS)
            if command -v terminal-notifier &> /dev/null; then
                terminal-notifier -title "Claude Flow" \
                    -message "Feature parity validation failed!" \
                    -sound "Basso"
            fi
        fi

        # Wait for next cycle
        print_status "$BLUE" "\n💤 Waiting ${WATCH_INTERVAL}s for next check..."
        sleep "$WATCH_INTERVAL"
    done
}

# Handle script arguments
case "$1" in
    --help)
        echo "Continuous Feature Parity Checker"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help              Show this help message"
        echo "  --once              Run validation once and exit"
        echo "  --report            Generate detailed report after each run"
        echo "  --interval <secs>   Set check interval (default: 30)"
        echo "  --cli <path>        Set CLI path (default: ./bin/claude-flow)"
        echo ""
        echo "Environment Variables:"
        echo "  WATCH_INTERVAL      Check interval in seconds"
        echo "  CLI_PATH           Path to CLI executable"
        echo "  GENERATE_REPORT    Set to 'true' to generate reports"
        exit 0
        ;;
    --once)
        check_critical_features
        run_validation
        generate_summary
        exit $?
        ;;
    --report)
        export GENERATE_REPORT=true
        shift
        ;;
    --interval)
        export WATCH_INTERVAL=$2
        shift 2
        ;;
    --cli)
        export CLI_PATH=$2
        shift 2
        ;;
esac

# Trap to handle Ctrl+C gracefully
trap 'print_status "$YELLOW" "\n👋 Stopping continuous validation..."; exit 0' INT TERM

# Start monitoring
main
