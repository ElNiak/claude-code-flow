# Migration Guide: Claude-Flow to Unified CLI

## Quick Start Migration

### TL;DR - Common Command Translations

```bash
# OLD → NEW (Most Common Commands)

# Agent spawning
claude-flow sparc coder "task"          → repoctl agent spawn coder --task "task"
claude-flow spawn researcher             → repoctl agent spawn researcher

# Swarm operations
claude-flow swarm "objective"            → repoctl swarm create "objective"
claude-flow swarm research "task"        → repoctl swarm create "task" --strategy research

# Memory management
claude-flow memory store key value       → repoctl memory store key value
claude-flow memory get key               → repoctl memory get key

# System monitoring
claude-flow status                       → repoctl monitor status
claude-flow start --ui                   → repoctl monitor dashboard

# Configuration
claude-flow config show                  → repoctl config show
claude-flow init --sparc                 → repoctl config init --template advanced
```

## Why Migrate?

### Before: Complex and Scattered
```bash
# 50+ commands to remember
claude-flow sparc orchestrator "task"
claude-flow sparc coder "task"
claude-flow sparc researcher "task"
claude-flow swarm research "objective"
claude-flow swarm development "objective"
claude-flow memory store key value
claude-flow github pr-manager "task"
claude-flow start --ui
claude-flow status
claude-flow monitor
# ... 40+ more commands
```

### After: Simple and Organized
```bash
# 8 domains, intuitive commands
repoctl agent spawn <type> --task "task"      # All agent operations
repoctl swarm create "objective" --strategy   # All swarm operations
repoctl memory <action> <args>                # All memory operations
repoctl github <action> <args>                # All GitHub operations
repoctl config <action> <args>                # All configuration
repoctl monitor <action> <args>               # All monitoring
repoctl build <action> <args>                 # All build operations
repoctl deploy <action> <args>                # All deployment
```

## Automatic Migration Tools

### Check Current Usage
```bash
# Scan your scripts and configs for deprecated commands
repoctl migrate check

# Output example:
# ✅ Found 12 scripts using deprecated commands
# 📄 ./scripts/deploy.sh: Uses 'claude-flow swarm development'
# 📄 ./package.json: Uses 'claude-flow sparc coder' in scripts
# 📄 ./.claude/hooks: Uses 'claude-flow memory store'
```

### Generate Migration Plan
```bash
# Create detailed migration plan
repoctl migrate plan

# Output example:
# 🔄 Migration Plan for your project:
#
# Scripts to update: 3 files
# Config files to migrate: 2 files
# Estimated time: 15 minutes
#
# High-impact changes:
# - ./scripts/ci.sh: 5 command updates needed
# - ./package.json: 3 npm script updates needed
```

### Execute Auto-Migration
```bash
# Automatically migrate scripts and configs (with backup)
repoctl migrate execute

# Interactive migration for complex cases
repoctl migrate interactive
```

## Domain-by-Domain Migration Guide

### 1. Agent Domain (SPARC Modes)

#### Before: 17 Separate Commands
```bash
claude-flow sparc orchestrator "coordinate project"
claude-flow sparc coder "implement feature"
claude-flow sparc researcher "find solutions"
claude-flow sparc tdd "develop with tests"
claude-flow sparc architect "design system"
claude-flow sparc reviewer "review code"
claude-flow sparc debugger "fix bugs"
claude-flow sparc tester "write tests"
claude-flow sparc analyzer "analyze performance"
claude-flow sparc optimizer "optimize code"
claude-flow sparc documenter "write docs"
claude-flow sparc designer "create UI"
claude-flow sparc innovator "brainstorm ideas"
claude-flow sparc swarm-coordinator "manage swarm"
claude-flow sparc memory-manager "manage memory"
claude-flow sparc batch-executor "batch operations"
claude-flow sparc workflow-manager "manage workflows"
```

#### After: 1 Unified Command
```bash
# Basic agent spawning
repoctl agent spawn <type> --task "<description>"

# Examples with all agent types
repoctl agent spawn orchestrator --task "coordinate project"
repoctl agent spawn coder --task "implement feature"
repoctl agent spawn researcher --task "find solutions"
repoctl agent spawn tdd --task "develop with tests"
repoctl agent spawn architect --task "design system"
repoctl agent spawn reviewer --task "review code"
repoctl agent spawn debugger --task "fix bugs"
repoctl agent spawn tester --task "write tests"
repoctl agent spawn analyzer --task "analyze performance"
repoctl agent spawn optimizer --task "optimize code"
repoctl agent spawn documenter --task "write docs"
repoctl agent spawn designer --task "create UI"
repoctl agent spawn innovator --task "brainstorm ideas"
repoctl agent spawn swarm-coordinator --task "manage swarm"
repoctl agent spawn memory-manager --task "manage memory"
repoctl agent spawn batch-executor --task "batch operations"
repoctl agent spawn workflow-manager --task "manage workflows"

# Enhanced options (new capabilities)
repoctl agent spawn coder --task "implement auth" --config advanced.json
repoctl agent spawn coder,tester --tasks "implement,test" --parallel
repoctl agent list --filter active
repoctl agent stop agent-123 --force
repoctl agent logs agent-123 --follow
```

### 2. Swarm Domain

#### Before: 6 Strategy Commands
```bash
claude-flow swarm research "analyze market trends"
claude-flow swarm development "build REST API"
claude-flow swarm analysis "performance review"
claude-flow swarm testing "comprehensive QA"
claude-flow swarm optimization "improve performance"
claude-flow swarm maintenance "update dependencies"
```

#### After: 1 Command with Strategy Parameter
```bash
# Basic swarm creation with strategies
repoctl swarm create "analyze market trends" --strategy research
repoctl swarm create "build REST API" --strategy development
repoctl swarm create "performance review" --strategy analysis
repoctl swarm create "comprehensive QA" --strategy testing
repoctl swarm create "improve performance" --strategy optimization
repoctl swarm create "update dependencies" --strategy maintenance

# Enhanced options (new capabilities)
repoctl swarm create "build API" --strategy development --mode hierarchical --max-agents 8
repoctl swarm create "research task" --strategy research --parallel --monitor
repoctl swarm status swarm-123
repoctl swarm monitor --real-time
repoctl swarm stop swarm-123 --save-state
```

### 3. Memory Domain

#### Before: Multiple Commands with Inconsistent Patterns
```bash
claude-flow memory store key value
claude-flow memory get key
claude-flow memory list
claude-flow memory export file.json
claude-flow memory import file.json
claude-flow memory stats
claude-flow memory cleanup
```

#### After: Consistent Patterns with Enhanced Options
```bash
# Same functionality, better patterns
repoctl memory store key value --ttl 3600
repoctl memory get key --format json
repoctl memory list --pattern "project/*" --sort date
repoctl memory export file.json --format sqlite
repoctl memory import file.json --merge
repoctl memory cleanup --older-than 30d --dry-run

# New capabilities
repoctl memory search "pattern" --fuzzy
repoctl memory backup --location ./backups/
repoctl memory restore backup-file.json
```

### 4. GitHub Domain

#### Before: 13 Specialized Commands
```bash
claude-flow github gh-coordinator
claude-flow github pr-manager
claude-flow github issue-tracker
claude-flow github release-manager
claude-flow github repo-architect
claude-flow github sync-coordinator
claude-flow github code-review-swarm
claude-flow github multi-repo-swarm
claude-flow github release-swarm
claude-flow github swarm-issue
claude-flow github swarm-pr
claude-flow github workflow-automation
claude-flow github project-board-sync
```

#### After: 5 Logical Actions
```bash
# Repository synchronization
repoctl github sync --repos all
repoctl github sync --repos repo1,repo2 --dry-run

# Pull request management
repoctl github pr create --title "Feature X" --draft
repoctl github pr review 123 --approve
repoctl github pr merge 123 --strategy squash

# Issue management
repoctl github issue create --template bug --title "Bug report"
repoctl github issue update 456 --assign user --labels bug,priority-high
repoctl github issue close 456 --comment "Fixed in v1.2.3"

# Release management
repoctl github release create v1.2.3 --draft --notes auto
repoctl github release publish v1.2.3 --notify-team

# Workflow automation
repoctl github workflow run ci-pipeline --branch feature-x
repoctl github workflow status --filter failed
repoctl github workflow logs workflow-123
```

### 5. Configuration Domain

#### Before: Scattered Configuration Management
```bash
claude-flow config show
claude-flow config get key
claude-flow config set key value
claude-flow config init
claude-flow config validate
claude-flow init --sparc
```

#### After: Unified Configuration System
```bash
# Configuration management
repoctl config show --format yaml
repoctl config set key value --global
repoctl config init --template enterprise

# Project initialization (replaces init commands)
repoctl config init --template basic      # Replaces: claude-flow init
repoctl config init --template advanced   # Replaces: claude-flow init --sparc
repoctl config init --template enterprise # New: Enterprise setup

# Validation and troubleshooting
repoctl config validate --fix-issues
repoctl config migrate --from-claude-flow
repoctl config backup --location ./backups/
```

### 6. Monitoring Domain

#### Before: Multiple Monitoring Commands
```bash
claude-flow start --ui
claude-flow status
claude-flow monitor
```

#### After: Comprehensive Monitoring System
```bash
# System status and health
repoctl monitor status --system all
repoctl monitor status --component agents
repoctl monitor health --detailed

# Dashboard and real-time monitoring
repoctl monitor dashboard --port 3000
repoctl monitor dashboard --components agents,swarm,memory

# Logs and debugging
repoctl monitor logs --component cli --follow
repoctl monitor logs --agent agent-123 --lines 100
repoctl monitor metrics --export metrics.json
```

### 7. Build Domain (New)

#### Replaces: Scattered Build-Related Commands
```bash
# New unified build system
repoctl build start --watch
repoctl build test --coverage --parallel
repoctl build lint --fix
repoctl build typecheck --watch
repoctl build package --target docker
```

### 8. Deploy Domain (New)

#### Replaces: Enterprise Deploy Commands
```bash
# New deployment system
repoctl deploy preview --branch feature-x
repoctl deploy production --strategy blue-green
repoctl deploy status --env all
repoctl deploy rollback --version 1.2.3
```

## Migration Scripts and Automation

### Script Migration Examples

#### Before: package.json Scripts
```json
{
  "scripts": {
    "dev": "claude-flow sparc coder 'implement feature'",
    "test": "claude-flow sparc tester 'run tests'",
    "deploy": "claude-flow swarm development 'deploy to staging'"
  }
}
```

#### After: Migrated Scripts
```json
{
  "scripts": {
    "dev": "repoctl agent spawn coder --task 'implement feature'",
    "test": "repoctl agent spawn tester --task 'run tests'",
    "deploy": "repoctl swarm create 'deploy to staging' --strategy development"
  }
}
```

#### Migration Command
```bash
# Automatically update package.json scripts
repoctl migrate package-json --backup
```

### Configuration File Migration

#### Before: .claude/settings.json
```json
{
  "sparc": {
    "defaultMode": "coder",
    "parallel": true
  },
  "swarm": {
    "defaultStrategy": "development",
    "maxAgents": 5
  },
  "memory": {
    "backend": "sqlite"
  }
}
```

#### After: repoctl.yaml
```yaml
version: "1.0"
project:
  name: "my-project"
  type: "web-app"

domains:
  agent:
    defaultType: "coder"
    maxConcurrent: 5
    parallel: true

  swarm:
    defaultStrategy: "development"
    defaultMode: "hierarchical"
    maxAgents: 5

  memory:
    backend: "sqlite"
    location: ".repoctl/memory.db"

  github:
    repository: "user/repo"
    defaultBranch: "main"
```

#### Migration Command
```bash
# Automatically migrate configuration
repoctl config migrate --from-claude-flow --backup
```

### Shell Script Migration

#### Before: CI/CD Scripts
```bash
#!/bin/bash
# deploy.sh
claude-flow swarm development "build and deploy API"
claude-flow memory store "deployment" "$(date)"
claude-flow github pr-manager "create deployment PR"
```

#### After: Migrated Scripts
```bash
#!/bin/bash
# deploy.sh
repoctl swarm create "build and deploy API" --strategy development
repoctl memory store "deployment" "$(date)"
repoctl github pr create --title "Deployment $(date)" --auto-merge
```

#### Migration Command
```bash
# Scan and update shell scripts
repoctl migrate scripts --directory ./scripts --backup
```

## Backward Compatibility and Transition Period

### Compatibility Shim (Temporary)
During the transition period, old commands will work through a compatibility layer:

```bash
# These will work but show deprecation warnings
claude-flow sparc coder "task"    # → Auto-converts to: repoctl agent spawn coder --task "task"
claude-flow swarm research "obj"  # → Auto-converts to: repoctl swarm create "obj" --strategy research
claude-flow memory store k v      # → Auto-converts to: repoctl memory store k v
```

### Transition Timeline
- **Month 1**: Compatibility shim active, deprecation warnings shown
- **Month 2**: Interactive migration prompts offered
- **Month 3**: Legacy commands require explicit confirmation
- **Month 6**: Legacy commands removed, repoctl only

### Opting Out of Compatibility
```bash
# Disable compatibility layer (use new commands only)
repoctl config set compatibility.enabled false

# Re-enable if needed
repoctl config set compatibility.enabled true
```

## Advanced Migration Scenarios

### Enterprise Environments

#### Custom Migration for Enterprise Features
```bash
# Enterprise customers get extended migration support
repoctl migrate enterprise --customer-id ABC123
repoctl migrate validate --environment production
repoctl migrate rollback --version 2.0.1  # Rollback if issues
```

#### Gradual Migration by Team
```bash
# Enable new CLI for specific teams first
repoctl config set teams.frontend.newCli true
repoctl config set teams.backend.newCli false  # Keep legacy for now
```

### CI/CD Integration Migration

#### GitHub Actions Migration
```yaml
# Before: .github/workflows/deploy.yml
- name: Deploy with Claude-Flow
  run: claude-flow swarm development "deploy to production"

# After: Migrated workflow
- name: Deploy with repoctl
  run: repoctl swarm create "deploy to production" --strategy development --monitor
```

#### Docker Container Migration
```dockerfile
# Before: Dockerfile
RUN npm install -g claude-flow
CMD ["claude-flow", "start", "--ui"]

# After: Migrated Dockerfile
RUN npm install -g claude-flow@latest  # Includes repoctl
CMD ["repoctl", "monitor", "dashboard"]
```

### Plugin and Extension Migration

#### Custom Command Migration
```bash
# Migrate custom plugins to new architecture
repoctl plugin migrate --from-claude-flow --plugin my-custom-plugin
repoctl plugin install my-custom-plugin-v2
```

## Troubleshooting Migration Issues

### Common Issues and Solutions

#### Issue: "Command not found after migration"
```bash
# Solution: Verify repoctl installation
which repoctl
npm list -g claude-flow

# If needed, reinstall
npm install -g claude-flow@latest
```

#### Issue: "Configuration not migrated properly"
```bash
# Solution: Manual config migration
repoctl config migrate --from-claude-flow --force
repoctl config validate --fix-issues
```

#### Issue: "Scripts failing with new commands"
```bash
# Solution: Update scripts step by step
repoctl migrate check --verbose
repoctl migrate plan --detailed
repoctl migrate execute --dry-run  # Test first
```

#### Issue: "Performance different with new CLI"
```bash
# Solution: Optimize new command usage
repoctl config set performance.parallel true
repoctl config set performance.cache true
repoctl monitor metrics --export perf.json
```

### Rollback Strategy

#### Temporary Rollback
```bash
# Switch back to legacy CLI temporarily
repoctl config set compatibility.forceEnable true
export CLAUDE_FLOW_LEGACY=true

# Or install specific version
npm install -g claude-flow@2.0.0  # Last legacy version
```

#### Full Rollback with Backup Restore
```bash
# Restore backups if migration issues
repoctl config restore --from-backup ./backups/pre-migration/
repoctl migrate rollback --confirm
```

## Post-Migration Optimization

### New Capabilities to Explore

#### Batch Operations
```bash
# Process multiple tasks efficiently
repoctl agent spawn coder,tester,reviewer --tasks "implement,test,review" --parallel

# Batch memory operations
repoctl memory store --batch "key1=value1,key2=value2,key3=value3"
```

#### Enhanced Monitoring
```bash
# Real-time dashboard with all components
repoctl monitor dashboard --real-time --components all

# Export metrics for analysis
repoctl monitor metrics --export --format prometheus
```

#### Configuration Templates
```bash
# Use pre-built templates for common setups
repoctl config init --template web-app      # Frontend + backend setup
repoctl config init --template api-service # Microservice setup
repoctl config init --template mobile-app  # Mobile development setup
```

#### Plugin Ecosystem
```bash
# Explore available plugins
repoctl plugin search
repoctl plugin install repoctl-docker
repoctl plugin install repoctl-kubernetes
```

### Performance Optimization Tips

#### Parallel Execution
```bash
# Enable parallel processing for better performance
repoctl config set performance.parallel true
repoctl config set performance.maxConcurrent 8
```

#### Caching
```bash
# Enable intelligent caching
repoctl config set cache.enabled true
repoctl config set cache.ttl 3600
```

#### Resource Management
```bash
# Optimize resource usage
repoctl config set resources.memory.limit 2GB
repoctl config set resources.cpu.limit 4
```

## Getting Help During Migration

### Built-in Help System
```bash
repoctl help migrate                    # Complete migration guide
repoctl help migrate agent              # Agent-specific migration
repoctl help examples                   # Before/after examples
repoctl migrate interactive             # Step-by-step wizard
```

### Community Support
- **Discord**: #migration-support channel
- **GitHub**: Migration issues tagged with `migration`
- **Docs**: https://claude-flow.dev/migration
- **Videos**: Migration tutorial playlist

### Enterprise Support
- **Dedicated Support**: Enterprise customers get dedicated migration assistance
- **Custom Training**: Team training sessions available
- **Migration Reviews**: Free migration plan reviews

## Migration Success Checklist

### Pre-Migration
- [ ] Back up current configurations and scripts
- [ ] Run `repoctl migrate check` to assess impact
- [ ] Review `repoctl migrate plan` for detailed changes
- [ ] Test migration in development environment

### During Migration
- [ ] Use `repoctl migrate execute --dry-run` first
- [ ] Migrate in phases (agents → swarm → memory → github)
- [ ] Verify each domain works before proceeding
- [ ] Update documentation and team knowledge

### Post-Migration
- [ ] Run `repoctl config validate` to verify setup
- [ ] Test all critical workflows
- [ ] Update CI/CD pipelines
- [ ] Train team on new commands
- [ ] Explore new capabilities (parallel execution, templates, plugins)

### Performance Verification
- [ ] Compare command execution times
- [ ] Verify parallel operations work correctly
- [ ] Test monitoring and dashboard functionality
- [ ] Confirm memory and caching optimizations

## Conclusion

The migration from claude-flow to the unified repoctl CLI simplifies your workflow while adding powerful new capabilities. The automatic migration tools handle most of the work, and the compatibility layer ensures a smooth transition.

Key benefits after migration:
- **Simpler command structure**: 8 domains vs. 50+ commands
- **Better performance**: Parallel execution and caching
- **Enhanced monitoring**: Real-time dashboards and metrics
- **Future-ready**: Plugin architecture for extensibility

Start your migration today with `repoctl migrate check` to see what's needed for your specific setup!
