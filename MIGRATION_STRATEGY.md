# Migration Guide: From Multi-Command to Unified "work" System

## Overview

This guide explains how to migrate from Claude Flow's current 50+ command system to the new unified "work" command. The migration maintains full backward compatibility while providing a streamlined user experience.

## Before and After Comparison

### Current System (Complex)
```bash
# Multiple commands for different workflows
claude-flow init --sparc
claude-flow swarm "build API" --strategy development --max-agents 8 
claude-flow sparc code "implement auth"
claude-flow agent spawn architect
claude-flow agent spawn coder --count 2
claude-flow memory store "architecture" "microservices pattern"
claude-flow github pr-manager "coordinate release"
claude-flow status --verbose
claude-flow hooks post-edit --file app.js
```

### New System (Unified)
```bash
# Single command with intelligent presets
claude-flow work api "build API with authentication"
# Automatically handles: swarm init, agent spawning, sparc modes, memory, hooks
```

## Migration Mapping

### 1. Swarm Commands
| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `swarm "task" --strategy development` | `work api "task"` | Auto-detects API development |
| `swarm "research topic"` | `work research "topic"` | Research-specific preset |
| `swarm "deploy app" --mode distributed` | `work deployment "deploy app"` | Deployment workflow |

**Example Migration:**
```bash
# OLD
claude-flow swarm "build REST API with auth" --strategy development --max-agents 8 --parallel

# NEW  
claude-flow work api "build REST API with auth"
# Automatically sets: strategy=development, max-agents=8, parallel=true
```

### 2. SPARC Mode Commands
| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `sparc code "implement feature"` | `work api "implement feature"` | Code mode in API preset |
| `sparc tdd "write tests"` | `work testing "write tests"` | TDD-focused workflow |
| `sparc architect "design system"` | `work api "design system" --focus architecture` | Architecture focus |

### 3. Agent Management Commands
| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `agent spawn researcher` | `work research "task"` | Auto-spawns research agents |
| `agent spawn coder --count 3` | `work api "task" --agents 8` | Increased agent count |
| `agent list` | `work --status` | Shows active agents |

### 4. GitHub Integration Commands
| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `github pr-manager "task"` | `work deployment "task"` | Includes GitHub workflow |
| `github issue-tracker` | `work project "manage issues"` | Project management preset |
| `github release-manager` | `work deployment "create release"` | Release workflow |

### 5. Memory and Configuration Commands
| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `memory store key value` | Automatic via hooks | Handled by preset hooks |
| `config get setting` | `work --config custom.json` | Custom configuration |
| `status --verbose` | `work --status --verbose` | Status with detail |

## Step-by-Step Migration Process

### Phase 1: Learning the New System (Week 1)

#### Day 1-2: Install and Setup
```bash
# Update to latest version
npm install -g claude-flow@2.0.0

# Initialize new configuration system
claude-flow work --init

# This creates .claude/work-config.json with your preferences
```

#### Day 3-4: Try Basic Workflows
```bash
# Start with simple tasks
claude-flow work "analyze this codebase"           # Auto-detects research preset
claude-flow work "build a simple API"             # Auto-detects API preset
claude-flow work "write tests for my functions"   # Auto-detects testing preset

# Use explicit presets
claude-flow work api "create user management"
claude-flow work research "study microservices"
claude-flow work deployment "setup CI/CD"
```

#### Day 5-7: Explore Advanced Features
```bash
# Custom configurations
claude-flow work --config my-workflow.json "complex task"

# Interactive mode
claude-flow work                                   # Opens preset selector

# Status and monitoring
claude-flow work --status                          # Show active workflows
claude-flow work --dry-run api "preview workflow" # See what would run
```

### Phase 2: Migrating Existing Workflows (Week 2)

#### Convert Your Most Common Commands
Create a mapping document for your team:

```bash
# Document your current workflows
echo "# My Current Workflows" > workflow-migration.md

# OLD: Daily development workflow
claude-flow init --sparc
claude-flow swarm "implement feature X" --strategy development
claude-flow sparc code "write implementation"
claude-flow sparc tdd "add tests"
claude-flow github pr-manager "create PR"

# NEW: Single command equivalent
claude-flow work api "implement feature X with tests and PR"
```

## Best Practices for Migration

### 1. Start Simple
```bash
# Begin with basic auto-detection
claude-flow work "your task description"

# Let the system learn your patterns
# Gradually move to explicit presets as needed
```

### 2. Use Interactive Mode
```bash
# When unsure, use interactive mode
claude-flow work

# This shows:
# - Available presets
# - Task examples for each preset
# - Configuration previews
```

### 3. Leverage Auto-Detection
```bash
# The system recognizes patterns:
claude-flow work "build REST API"          → api preset
claude-flow work "research AI trends"      → research preset  
claude-flow work "deploy to production"    → deployment preset
claude-flow work "write comprehensive tests" → testing preset
```

## Summary

The migration to the unified "work" command provides:

✅ **Simplified Interface:** One command instead of 50+  
✅ **Intelligent Defaults:** System learns and adapts  
✅ **Full Compatibility:** All old functionality preserved  
✅ **Better Performance:** Optimized execution paths  
✅ **Team Collaboration:** Shared configurations and standards  
✅ **Future-Proof:** Extensible through configuration, not code  

Start your migration today with `claude-flow work "your first task"` and experience the streamlined Claude Flow workflow system.