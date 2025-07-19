#!/bin/bash
set -e

echo "🔍 Detecting anti-patterns..."
echo "============================="

# Initialize violation counter
VIOLATIONS=0

# Function to report violations
report_violation() {
    echo "❌ $1"
    ((VIOLATIONS++))
}

# Check for placeholders and TODO comments
echo "📝 Checking for placeholders and incomplete code..."
PLACEHOLDERS=$(grep -r "TODO\|FIXME\|XXX\|PLACEHOLDER\|\/\/ TODO\|\/\* TODO" src/ --include="*.ts" --include="*.js" 2>/dev/null || true)
if [ ! -z "$PLACEHOLDERS" ]; then
    report_violation "Placeholders/TODOs found in source code:"
    echo "$PLACEHOLDERS" | head -10
    if [ $(echo "$PLACEHOLDERS" | wc -l) -gt 10 ]; then
        echo "... and $(($(echo "$PLACEHOLDERS" | wc -l) - 10)) more"
    fi
fi

# Check for oversimplification patterns
echo "🔍 Checking for oversimplification patterns..."
SIMPLE_PATTERNS=$(grep -r "// Simplified\|// Basic\|// Minimal\|// Placeholder\|console\.log.*debug" src/ --include="*.ts" --include="*.js" 2>/dev/null || true)
if [ ! -z "$SIMPLE_PATTERNS" ]; then
    report_violation "Potential oversimplification patterns found:"
    echo "$SIMPLE_PATTERNS" | head -5
fi

# Check for duplicate code patterns
echo "🔄 Checking for code duplication..."
if command -v npx >/dev/null 2>&1; then
    if npx jscpd src/ --threshold 5 --silent 2>/dev/null | grep -q "duplications found"; then
        DUPLICATION_RESULT=$(npx jscpd src/ --threshold 5 --reporters console-full 2>/dev/null | head -20)
        if [ ! -z "$DUPLICATION_RESULT" ]; then
            report_violation "Code duplication detected:"
            echo "$DUPLICATION_RESULT"
        fi
    fi
else
    echo "⚠️  jscpd not available, skipping duplication check"
fi

# Check for empty catch blocks
echo "🚫 Checking for empty catch blocks..."
EMPTY_CATCH=$(grep -r "catch.*{[\s]*}" src/ --include="*.ts" --include="*.js" 2>/dev/null || true)
if [ ! -z "$EMPTY_CATCH" ]; then
    report_violation "Empty catch blocks found:"
    echo "$EMPTY_CATCH"
fi

# Check for console.log statements (should use proper logging)
echo "📊 Checking for console.log statements..."
CONSOLE_LOGS=$(grep -r "console\.log\|console\.warn\|console\.error" src/ --include="*.ts" --include="*.js" 2>/dev/null || true)
if [ ! -z "$CONSOLE_LOGS" ]; then
    LOG_COUNT=$(echo "$CONSOLE_LOGS" | wc -l)
    if [ $LOG_COUNT -gt 5 ]; then
        report_violation "Excessive console logging found ($LOG_COUNT instances) - consider proper logging framework"
        echo "$CONSOLE_LOGS" | head -3
        echo "... and $((LOG_COUNT - 3)) more"
    fi
fi

# Check for any TypeScript 'any' types
echo "🔒 Checking for 'any' type usage..."
ANY_TYPES=$(grep -r ": any\|<any>\|any\[\]" src/ --include="*.ts" 2>/dev/null || true)
if [ ! -z "$ANY_TYPES" ]; then
    ANY_COUNT=$(echo "$ANY_TYPES" | wc -l)
    if [ $ANY_COUNT -gt 10 ]; then
        report_violation "Excessive 'any' type usage found ($ANY_COUNT instances) - consider proper typing"
        echo "$ANY_TYPES" | head -3
        echo "... and $((ANY_COUNT - 3)) more"
    fi
fi

# Check for hardcoded secrets or sensitive data patterns
echo "🔐 Checking for potential hardcoded secrets..."
SECRETS=$(grep -r "password\s*=\|api_key\s*=\|secret\s*=\|token\s*=" src/ --include="*.ts" --include="*.js" 2>/dev/null || true)
if [ ! -z "$SECRETS" ]; then
    report_violation "Potential hardcoded secrets found:"
    echo "$SECRETS"
fi

# Summary
echo ""
echo "📋 Anti-pattern detection summary:"
echo "=================================="
if [ $VIOLATIONS -eq 0 ]; then
    echo "✅ No anti-patterns detected!"
    echo "🚀 Code quality looks good!"
else
    echo "❌ Found $VIOLATIONS violation(s)"
    echo "💡 Please address the issues above before proceeding"
    echo ""
    echo "🔧 Common fixes:"
    echo "  • Remove or implement TODOs/FIXMEs"
    echo "  • Replace oversimplified implementations"
    echo "  • Eliminate code duplication"
    echo "  • Use proper logging instead of console.log"
    echo "  • Add proper TypeScript types instead of 'any'"
    echo "  • Move secrets to environment variables"
fi

# Exit with error if violations found
if [ $VIOLATIONS -gt 0 ]; then
    exit 1
fi
