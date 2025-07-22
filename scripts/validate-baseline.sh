#!/bin/bash
# Quick baseline validation
echo "🔍 Validating against baseline..."
node scripts/validate-feature-parity.js --cli ./bin/claude-flow
echo "✅ Validation complete"
