#!/bin/bash
# Simple optimized startup script that bypasses problematic memory optimization

# Just run the CLI directly with basic memory settings
NODE_OPTIONS="--max-old-space-size=4096" exec node "$@"
