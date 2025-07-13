# Deprecation and Removal Plan

## Overview

This document outlines the systematic deprecation and removal of redundant, outdated, and complex CLI commands in Claude-Flow. The goal is to migrate from the current 50+ commands to a streamlined unified CLI while ensuring zero disruption to existing users.

## Current Command Inventory

### Commands for Immediate Removal (Phase 1 - Week 1)
**Rationale**: Unused, experimental, or completely superseded

#### Experimental/Unused Commands
```bash
claude-flow batch-manager         # Unused experimental feature
claude-flow hive-mind-optimize    # Superseded by swarm optimization
claude-flow hook-safety           # Internal debugging tool
claude-flow simple-mcp            # Development testing command
claude-flow swarm-metrics-integration  # Internal metrics, not user-facing
```

#### Redundant Development Commands
```bash
claude-flow init --minimal        # Superseded by repoctl config init --template basic
claude-flow node-repl             # Use standard node REPL
claude-flow runtime-detector      # Internal utility
claude-flow utils                 # Internal utility functions
```

**Impact**: Near zero - these commands have <1% usage based on analytics
**Migration**: None required - purely internal or experimental

### Commands for Deprecation Warning (Phase 2 - Month 1)
**Rationale**: Functional but superseded by unified CLI

#### SPARC Mode Commands (17 commands → 1 unified)
```bash
# DEPRECATED: Individual SPARC modes
claude-flow sparc orchestrator <task>
claude-flow sparc coder <task>
claude-flow sparc researcher <task>
claude-flow sparc tdd <task>
claude-flow sparc architect <task>
claude-flow sparc reviewer <task>
claude-flow sparc debugger <task>
claude-flow sparc tester <task>
claude-flow sparc analyzer <task>
claude-flow sparc optimizer <task>
claude-flow sparc documenter <task>
claude-flow sparc designer <task>
claude-flow sparc innovator <task>
claude-flow sparc swarm-coordinator <task>
claude-flow sparc memory-manager <task>
claude-flow sparc batch-executor <task>
claude-flow sparc workflow-manager <task>

# REPLACEMENT: Unified agent command
repoctl agent spawn <type> --task "<task>" [options]
```

#### Swarm Strategy Commands (6 commands → 1 unified)
```bash
# DEPRECATED: Individual strategy commands
claude-flow swarm research <objective>
claude-flow swarm development <objective>
claude-flow swarm analysis <objective>
claude-flow swarm testing <objective>
claude-flow swarm optimization <objective>
claude-flow swarm maintenance <objective>

# REPLACEMENT: Unified swarm command
repoctl swarm create <objective> --strategy <research|development|analysis|testing|optimization|maintenance>
```

#### Memory Commands (7 commands → 6 unified)
```bash
# DEPRECATED: Inconsistent memory commands
claude-flow memory store <key> <data>
claude-flow memory get <key>
claude-flow memory list
claude-flow memory export <file>
claude-flow memory import <file>
claude-flow memory stats
claude-flow memory cleanup

# REPLACEMENT: Consistent repoctl memory commands (same functionality, better patterns)
repoctl memory store <key> <value> [--ttl 3600]
repoctl memory get <key> [--format json|yaml|table]
repoctl memory list [--pattern glob] [--sort date|name]
repoctl memory export <file> [--format json|sqlite|csv]
repoctl memory import <file> [--merge|replace]
repoctl memory cleanup [--older-than 30d] [--dry-run]
```

### Commands for Gradual Phase-Out (Phase 3 - Month 2-3)
**Rationale**: Commonly used but being replaced with better alternatives

#### Build and Development Commands
```bash
# DEPRECATED: Scattered build commands
claude-flow start [--ui] [--swarm]    # → repoctl monitor dashboard [--components all]
claude-flow status                    # → repoctl monitor status [--system all]
claude-flow monitor                   # → repoctl monitor dashboard

# DEPRECATED: Agent management
claude-flow agent spawn <type>        # → repoctl agent spawn <type>
claude-flow agent list               # → repoctl agent list
claude-flow spawn <type>             # → repoctl agent spawn <type>
```

#### Configuration Commands
```bash
# DEPRECATED: Configuration scattered across domains
claude-flow config show              # → repoctl config show
claude-flow config get <key>         # → repoctl config show --key <key>
claude-flow config set <key> <value> # → repoctl config set <key> <value>
claude-flow config init              # → repoctl config init
claude-flow config validate          # → repoctl config validate
```

#### Task and Workflow Commands  
```bash
# DEPRECATED: Task management
claude-flow task create <type>       # → repoctl agent spawn <type> --task <description>
claude-flow task list               # → repoctl agent list --filter active
claude-flow workflow <file>         # → repoctl config apply <file>
```

### Commands for Long-Term Maintenance (Phase 4 - Month 6+)
**Rationale**: Complex enterprise features requiring careful migration

#### GitHub Integration (13 commands → 5 unified)
```bash
# DEPRECATED: Individual GitHub commands
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

# REPLACEMENT: Unified GitHub domain
repoctl github sync [--repos all|repo1,repo2]
repoctl github pr <create|review|merge> [options]
repoctl github issue <create|update|close> [options]
repoctl github release create <version> [options]
repoctl github workflow <run|status|logs> [options]
```

#### MCP Integration Commands
```bash
# DEPRECATED: MCP scattered commands
claude-flow mcp start                # → repoctl config set mcp.enabled true && repoctl monitor dashboard
claude-flow mcp status               # → repoctl monitor status --component mcp
claude-flow mcp tools                # → repoctl config show --section mcp.tools
```

#### Enterprise Commands (Keep with deprecation notice)
```bash
# KEEP BUT DEPRECATE: Enterprise features
claude-flow project <subcommand>     # → Will be replaced by repoctl project in v3.0
claude-flow deploy <subcommand>      # → Will be replaced by repoctl deploy in v3.0
claude-flow cloud <subcommand>       # → Will be replaced by repoctl cloud in v3.0
claude-flow security <subcommand>    # → Will be replaced by repoctl security in v3.0
claude-flow analytics <subcommand>   # → Will be replaced by repoctl analytics in v3.0
```

## Deprecation Implementation Strategy

### Phase 1: Immediate Removal (Week 1)
**Target**: Remove 8 unused/experimental commands

```javascript
// Implementation: Remove from command registry
const REMOVED_COMMANDS = [
  'batch-manager',
  'hive-mind-optimize', 
  'hook-safety',
  'simple-mcp',
  'swarm-metrics-integration',
  'node-repl',
  'runtime-detector',
  'utils'
];

// Show helpful error message
function handleRemovedCommand(command) {
  console.error(`❌ Command '${command}' has been removed in v2.1.0`);
  console.log(`🔄 Try: repoctl --help`);
  console.log(`📖 Migration guide: repoctl help migrate`);
  process.exit(1);
}
```

### Phase 2: Deprecation Warnings (Month 1)
**Target**: Add warnings to 30+ commands

```javascript
// Implementation: Add deprecation warning system
function deprecationWarning(oldCommand, newCommand, removalVersion) {
  console.warn(`⚠️  DEPRECATED: '${oldCommand}' will be removed in ${removalVersion}`);
  console.warn(`✅ Use instead: ${newCommand}`);
  console.warn(`📖 Migration guide: repoctl help migrate`);
  console.warn(`⏰ Continuing with legacy command...\n`);
}

// Example usage
export function sparcCommand(mode, task, options) {
  deprecationWarning(
    `claude-flow sparc ${mode}`,
    `repoctl agent spawn ${mode} --task "${task}"`,
    'v2.3.0'
  );
  
  // Continue with existing functionality
  return executeLegacySparcCommand(mode, task, options);
}
```

### Phase 3: Removal with Graceful Fallback (Month 2-3)
**Target**: Remove deprecated commands with automatic migration

```javascript
// Implementation: Auto-migration layer
function handleDeprecatedCommand(oldCommand, args) {
  const migration = COMMAND_MIGRATIONS[oldCommand];
  
  if (migration) {
    console.log(`🔄 Auto-migrating: ${oldCommand} → ${migration.newCommand}`);
    
    if (migration.confirm) {
      const response = await confirmMigration(migration);
      if (!response) {
        console.log('Migration cancelled.');
        process.exit(0);
      }
    }
    
    // Execute new command
    return executeNewCommand(migration.newCommand, migration.transformArgs(args));
  }
  
  showCommandNotFound(oldCommand);
}

const COMMAND_MIGRATIONS = {
  'sparc coder': {
    newCommand: 'repoctl agent spawn coder',
    transformArgs: (args) => ['--task', args.join(' ')],
    confirm: false
  },
  'memory store': {
    newCommand: 'repoctl memory store',
    transformArgs: (args) => args,
    confirm: false
  }
};
```

### Phase 4: Final Cleanup (Month 6)
**Target**: Remove all legacy command infrastructure

```javascript
// Remove legacy command registry
// Remove compatibility shims
// Update documentation
// Clean up test suites
```

## Migration Path for Each Command Category

### SPARC Commands Migration
```bash
# Old pattern (17 different commands)
claude-flow sparc coder "implement login"
claude-flow sparc researcher "find authentication libs"
claude-flow sparc tester "write unit tests"

# New pattern (1 unified command)
repoctl agent spawn coder --task "implement login"
repoctl agent spawn researcher --task "find authentication libs"  
repoctl agent spawn tester --task "write unit tests"

# Batch operations (new capability)
repoctl agent spawn coder,researcher,tester --tasks "implement login,find auth libs,write tests"
```

### Swarm Commands Migration
```bash
# Old pattern (6 strategy-specific commands)
claude-flow swarm research "analyze market trends"
claude-flow swarm development "build API"
claude-flow swarm testing "comprehensive QA"

# New pattern (1 command with strategy parameter)
repoctl swarm create "analyze market trends" --strategy research
repoctl swarm create "build API" --strategy development
repoctl swarm create "comprehensive QA" --strategy testing

# Enhanced options (new capabilities)
repoctl swarm create "build API" --strategy development --parallel --max-agents 8 --monitor
```

### Memory Commands Migration  
```bash
# Old pattern (inconsistent options)
claude-flow memory store key value
claude-flow memory get key
claude-flow memory list

# New pattern (consistent options and enhanced features)
repoctl memory store key value --ttl 3600
repoctl memory get key --format json
repoctl memory list --pattern "project/*" --sort date
```

### GitHub Commands Migration
```bash
# Old pattern (13 specialized commands)
claude-flow github pr-manager "review PR #123"
claude-flow github issue-tracker "create bug report"
claude-flow github release-manager "v1.2.3"

# New pattern (5 domain commands)
repoctl github pr review 123 --approve
repoctl github issue create --template bug --title "Bug report"
repoctl github release create v1.2.3 --auto-notes
```

## Backward Compatibility Plan

### Compatibility Shim Layer
```bash
#!/bin/bash
# File: claude-flow (compatibility wrapper)

echo "⚠️  claude-flow command is deprecated. Switching to repoctl..."

case "$1" in
  "sparc")
    repoctl agent spawn "$2" --task "${@:3}"
    ;;
  "swarm")
    repoctl swarm create "${@:2}"
    ;;
  "memory")
    repoctl memory "${@:2}"
    ;;
  "github")
    repoctl github "${@:2}"
    ;;
  "agent")
    repoctl agent "${@:2}"
    ;;
  "config")
    repoctl config "${@:2}"
    ;;
  *)
    echo "❌ Command '$1' not supported in compatibility mode"
    echo "📖 See migration guide: repoctl help migrate"
    echo "🔄 Use: repoctl --help"
    exit 1
    ;;
esac
```

### Configuration Migration
```yaml
# Old config files (.claude/settings.json) automatically migrated to:
# repoctl.yaml with enhanced structure and validation

migration:
  autoMigrate: true
  preserveOldConfig: true
  backupLocation: ".claude/backup/"
```

### Documentation Migration
```bash
# Auto-redirect old documentation URLs
# Update all examples in .claude/commands/ to use new syntax
# Generate migration mapping document
# Create video tutorials for major workflow changes
```

## Communication Plan

### Deprecation Notices
```bash
# Built into CLI commands
repoctl migrate check           # Check for deprecated usage in scripts
repoctl migrate plan            # Show migration plan for current usage
repoctl migrate execute         # Auto-migrate configurations and scripts
```

### User Communication Timeline
- **Week 1**: Blog post announcing deprecation plan
- **Week 2**: Email to active users with migration guide
- **Month 1**: In-app deprecation warnings start showing
- **Month 2**: CLI startup shows migration reminder
- **Month 3**: Final notice before removal
- **Month 6**: Legacy commands removed

### Documentation Updates
- Migration guide with before/after examples
- Video tutorials for major workflows
- Interactive migration tool: `repoctl migrate interactive`
- FAQ covering common migration scenarios
- Automated script migration tools

## Risk Assessment and Mitigation

### High Risk: Breaking User Scripts
**Mitigation**: 
- 6-month compatibility shim layer
- Automated script migration tools
- Clear migration timelines
- Rollback capability if adoption is slow

### Medium Risk: User Confusion During Transition
**Mitigation**:
- Gradual deprecation with clear messaging
- Interactive help system: `repoctl help migrate`
- Community support channels dedicated to migration
- Office hours for migration assistance

### Low Risk: Enterprise Feature Disruption
**Mitigation**:
- Enterprise features deprecated last (Month 6+)
- Direct customer success manager communication
- Custom migration support for enterprise clients
- Extended support period for enterprise deprecations

## Success Metrics

### Quantitative Metrics
- **Legacy Command Usage**: Reduce by 90% within 3 months
- **User Error Rate**: Reduce command errors by 70%
- **Support Tickets**: Reduce CLI-related tickets by 60%
- **Codebase Size**: Reduce CLI code by 40%

### Qualitative Metrics
- **User Satisfaction**: >4.5/5 rating on post-migration survey
- **Onboarding Time**: New user onboarding time reduced from 2 hours to 20 minutes
- **Documentation Quality**: Single coherent help system vs. fragmented docs

### Adoption Metrics
- **Migration Completion**: 90% of active users migrated within 3 months
- **New User Preference**: >95% of new users use unified CLI
- **Community Feedback**: Positive feedback on simplified architecture

## Timeline Summary

| Phase | Timeline | Commands Affected | Impact |
|-------|----------|-------------------|---------|
| 1 | Week 1 | 8 unused commands | Zero user impact |
| 2 | Month 1 | 30 deprecated commands | Warnings only |
| 3 | Month 2-3 | 20 migrated commands | Auto-migration |
| 4 | Month 6+ | Final cleanup | Legacy removal |

## Post-Deprecation Benefits

### User Experience
- **Simplified Discovery**: 8 domains vs. 50+ commands
- **Consistent Patterns**: Unified argument structure
- **Better Help**: Contextual help system
- **Faster Onboarding**: Logical command grouping

### Maintainability  
- **Reduced Complexity**: 70% fewer command files
- **Consistent Testing**: Unified test patterns
- **Single Documentation**: Coherent help system
- **Easier Extensions**: Plugin architecture ready

### Future Extensibility
- **Plugin System**: Ready for third-party extensions
- **Template System**: Reusable command combinations
- **Configuration**: Unified config management
- **Monitoring**: Integrated observability

This deprecation plan ensures a smooth transition to the unified CLI while maintaining backward compatibility and providing clear migration paths for all user workflows.