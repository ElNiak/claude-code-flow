# Unified CLI Architecture Specification

## Executive Summary

This document outlines the consolidation strategy for Claude-Flow's CLI architecture, proposing a simplified, unified interface that reduces complexity while maintaining powerful functionality. The goal is to transform the current 50+ commands into a coherent, domain-grouped CLI with consistent patterns.

## Current State Analysis

### Command Complexity Assessment
- **Total Commands**: 50+ individual commands
- **Command Categories**: 15 different domains (sparc, swarm, memory, github, mcp, etc.)
- **Inconsistent Patterns**: Multiple command styles and argument patterns
- **Documentation Fragmentation**: Commands documented across 60+ files in .claude/commands/
- **User Confusion**: Complex onboarding due to overwhelming choice

### Pain Points Identified
1. **Command Discovery**: Users struggle to find the right command
2. **Inconsistent Patterns**: Different argument styles across commands
3. **Documentation Scatter**: Information spread across many files
4. **Cognitive Overload**: Too many options for simple tasks
5. **Maintenance Burden**: 50+ command files to maintain

## Proposed Unified CLI Architecture

### Single Entry Point Design

```bash
repoctl <domain> <action> [options]
```

Where:
- `repoctl` is the unified CLI name (repository control)
- `<domain>` groups related functionality 
- `<action>` specifies the operation
- `[options]` provide configuration

### Domain Grouping Strategy

#### 1. Build Domain
```bash
repoctl build start [--watch] [--env production]
repoctl build test [--coverage] [--watch] [--parallel]
repoctl build lint [--fix] [--format]
repoctl build typecheck [--watch]
repoctl build package [--target all|docker|binary]
```

**Consolidates**: Multiple build, test, lint, typecheck commands

#### 2. Deploy Domain  
```bash
repoctl deploy preview [--branch main] [--monitor]
repoctl deploy production [--strategy blue-green|rolling]
repoctl deploy status [--env all|staging|production]
repoctl deploy rollback [--version 1.2.3]
```

**Consolidates**: Deployment, environment management, rollback commands

#### 3. Agent Domain
```bash
repoctl agent spawn <type> [--name custom] [--config file.json]
repoctl agent list [--filter active|idle|error]
repoctl agent stop <name|id> [--force]
repoctl agent logs <name|id> [--follow] [--lines 100]
```

**Consolidates**: Agent spawning, management, SPARC mode commands

#### 4. Memory Domain
```bash
repoctl memory store <key> <value> [--ttl 3600]
repoctl memory get <key> [--format json|yaml|table]
repoctl memory list [--pattern glob] [--sort date|name]
repoctl memory export <file> [--format json|sqlite|csv]
repoctl memory import <file> [--merge|replace]
repoctl memory cleanup [--older-than 30d] [--dry-run]
```

**Consolidates**: Memory storage, retrieval, management commands

#### 5. Swarm Domain
```bash
repoctl swarm create <objective> [--strategy research|development|analysis]
repoctl swarm status [--id swarm-id] [--format table|json]
repoctl swarm monitor [--real-time] [--alerts]
repoctl swarm stop <id> [--force] [--save-state]
```

**Consolidates**: Swarm coordination, monitoring commands

#### 6. Config Domain
```bash
repoctl config show [--global|local] [--format json|yaml]
repoctl config set <key> <value> [--global|local]
repoctl config init [--template basic|advanced|enterprise]
repoctl config validate [--fix-issues]
```

**Consolidates**: Configuration management across all systems

#### 7. Monitor Domain
```bash
repoctl monitor status [--system all|agents|swarm|memory]
repoctl monitor health [--detailed] [--export metrics.json]
repoctl monitor logs [--component all|cli|agents] [--follow]
repoctl monitor dashboard [--port 3000] [--host localhost]
```

**Consolidates**: System monitoring, health checks, dashboards

#### 8. GitHub Domain
```bash
repoctl github sync [--repos all|repo1,repo2] [--dry-run]
repoctl github pr create [--title "Title"] [--draft] [--auto-merge]
repoctl github pr review <number> [--approve|request-changes]
repoctl github issue create [--template bug|feature] [--assign user]
repoctl github release create <version> [--draft] [--notes auto]
```

**Consolidates**: GitHub integration, workflow automation

### Consistent Argument Patterns

#### Global Options (Available for all commands)
```bash
--verbose, -v      # Verbose output
--quiet, -q        # Quiet mode
--config FILE      # Custom config file
--dry-run          # Show what would happen
--help, -h         # Command help
--format FORMAT    # Output format (json|yaml|table)
--output FILE      # Save output to file
```

#### Common Option Patterns
```bash
--watch            # Watch for changes (build, config)
--force            # Force operation (agent stop, deploy)
--parallel         # Enable parallel execution
--monitor          # Enable monitoring
--filter PATTERN   # Filter results
--timeout SECONDS  # Operation timeout
```

### Backward Compatibility Strategy

#### Compatibility Shims
Create wrapper scripts that map old commands to new structure:

```bash
# Old: claude-flow sparc coder "task"
# New: repoctl agent spawn coder --task "task"
# Shim: claude-flow -> repoctl mapping

#!/bin/bash
# claude-flow compatibility shim
case "$1" in
  "sparc")
    repoctl agent spawn "$2" --task "$3" "${@:4}"
    ;;
  "swarm")
    repoctl swarm create "$2" "${@:3}"
    ;;
  "memory")
    repoctl memory "$2" "${@:3}"
    ;;
  *)
    echo "Command deprecated. Use: repoctl --help"
    echo "Migration guide: repoctl help migrate"
    ;;
esac
```

#### Gradual Migration Path
1. **Phase 1**: Introduce `repoctl` alongside existing commands
2. **Phase 2**: Add deprecation warnings to old commands
3. **Phase 3**: Remove old commands after 2 minor versions

### Help System Design

#### Contextual Help
```bash
repoctl --help                    # Overview + domain list
repoctl build --help              # Build domain commands
repoctl build test --help         # Specific command help
repoctl help migrate              # Migration guide
repoctl help examples             # Usage examples
repoctl help troubleshooting      # Common issues
```

#### Interactive Help
```bash
repoctl --interactive             # Guided command builder
repoctl wizard                    # Setup wizard for new users
```

### Configuration Architecture

#### Unified Configuration File
```yaml
# repoctl.yaml
version: "1.0"
project:
  name: "my-project"
  type: "web-app"

domains:
  build:
    defaultTarget: "development"
    parallel: true
    
  deploy:
    environments:
      - name: "staging"
        url: "https://staging.example.com"
      - name: "production" 
        url: "https://example.com"
        
  agent:
    defaultType: "coder"
    maxConcurrent: 5
    
  swarm:
    defaultStrategy: "development"
    defaultMode: "hierarchical"
    
  memory:
    backend: "sqlite"
    location: ".repoctl/memory.db"
    
  github:
    repository: "user/repo"
    defaultBranch: "main"
```

### Advanced Features

#### Command Composition
```bash
# Chain commands with built-in orchestration
repoctl build test --on-success "deploy preview" --on-failure "agent spawn debugger"

# Conditional execution
repoctl build test && repoctl deploy preview || repoctl monitor health
```

#### Plugin Architecture
```bash
# Plugin management
repoctl plugin install repoctl-docker
repoctl plugin list
repoctl plugin update repoctl-docker

# Plugin usage
repoctl docker build [options]    # Added by repoctl-docker plugin
```

#### Templates and Presets
```bash
# Save command combinations as templates
repoctl template save full-deploy "build test && deploy production --monitor"
repoctl template run full-deploy

# Project-specific presets
repoctl preset create web-app --build-tool webpack --deploy-target vercel
repoctl preset apply web-app
```

## Implementation Priority

### Phase 1: Core Domains (Month 1)
- Build domain (highest user impact)
- Config domain (foundation for others)
- Help system (user onboarding)

### Phase 2: Orchestration Domains (Month 2)  
- Agent domain
- Swarm domain
- Monitor domain

### Phase 3: Integration Domains (Month 3)
- Memory domain
- GitHub domain
- Deploy domain

### Phase 4: Advanced Features (Month 4)
- Plugin architecture
- Command composition
- Templates/presets

## Success Metrics

### User Experience Metrics
- **Command Discovery Time**: Target 80% reduction
- **Onboarding Completion**: From 2 hours to 20 minutes
- **Documentation Search Time**: 90% reduction
- **Error Rate**: 70% reduction in command usage errors

### Technical Metrics
- **Code Maintainability**: Reduce command files from 50+ to ~15
- **Test Coverage**: Achieve 95% coverage for unified CLI
- **Documentation Consistency**: Single help system vs. 60+ files
- **Performance**: Sub-100ms command startup time

### Adoption Metrics
- **Migration Rate**: 90% of users migrated within 3 months
- **User Satisfaction**: >4.5/5 rating in post-migration survey
- **Support Tickets**: 60% reduction in CLI-related tickets

## Risk Mitigation

### Compatibility Risks
- **Mitigation**: Maintain shim layer for 6 months minimum
- **Monitoring**: Track usage of deprecated commands
- **Communication**: Clear migration timelines and guides

### User Adoption Risks
- **Mitigation**: Gradual rollout with opt-in beta period
- **Training**: Video tutorials and interactive guides
- **Support**: Dedicated migration support channel

### Technical Risks
- **Mitigation**: Comprehensive test suite before each phase
- **Rollback**: Ability to revert to previous CLI version
- **Monitoring**: Real-time error tracking and alerting

## Conclusion

The unified CLI architecture will significantly improve user experience while reducing maintenance overhead. The domain-based grouping provides logical organization, consistent patterns reduce cognitive load, and the phased implementation ensures smooth adoption.

The transition from 50+ scattered commands to 8 focused domains represents a major simplification that will benefit both new and existing users while setting the foundation for future extensibility through the plugin architecture.