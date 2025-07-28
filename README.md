# Claude Flow

A comprehensive AI orchestration framework with unified CLI tools and MCP integration for intelligent task automation and swarm coordination.

## Overview

Claude Flow provides advanced swarm coordination, neural optimization, and intelligent task orchestration capabilities for AI-powered development workflows. The framework features a unified CLI architecture that consolidates multiple agent systems, memory management, and extensible command structure.

## Key Features

- **Unified CLI Architecture**: Single entry point with modular command system
- **Swarm Coordination**: Multi-agent task orchestration with intelligent load balancing
- **Memory Management**: Persistent cross-session memory with optimization
- **MCP Integration**: Model Context Protocol server for external tool integration
- **TypeScript-First**: Full type safety with intelligent IDE support
- **Performance Optimized**: Memory management with emergency GC and optimization
- **Extensible Hooks**: Pre/post command hooks for automation and customization

## Quick Start

### Installation

```bash
# Install globally
npm install -g claude-flow

# Or use directly
npx claude-flow --help
```

### Basic Usage

```bash
# Show available commands
claude-flow --help

# Initialize a new project
claude-flow init

# Start a swarm coordination
claude-flow swarm init --topology mesh --agents 5

# Manage memory and sessions
claude-flow memory store --key "project/config" --value "settings"

# Run with hooks
claude-flow hooks start --task "development"
```

## CLI Architecture

The unified CLI consolidates multiple command systems into a single, modular architecture:

### Core Commands
- **agent**: Agent management and spawning
- **swarm**: Multi-agent coordination and topology management
- **memory**: Persistent memory operations and optimization
- **hooks**: Pre/post command automation system
- **init**: Project and configuration initialization

### Advanced Commands
- **hive-mind**: Collective intelligence coordination
- **github**: Repository integration and automation
- **mcp**: Model Context Protocol server management
- **sparc**: Structured problem-solving methodology
- **task**: Task orchestration and workflow management

### Tools & Integration
- **start**: Process management with UI integration
- **monitor**: System health and performance monitoring
- **config**: Configuration management and validation
- **analysis**: Performance analysis and optimization

## Memory Management

Claude Flow includes sophisticated memory management:

```bash
# Store data with TTL
claude-flow memory store --key "session/state" --value "{}" --ttl 3600

# Retrieve and search
claude-flow memory get --key "session/state"
claude-flow memory search --pattern "session/*"

# Optimize memory usage
claude-flow memory optimize --gc --compress
```

## Swarm Coordination

Multi-agent coordination with intelligent topology:

```bash
# Initialize swarm with mesh topology
claude-flow swarm init --topology mesh --max-agents 8

# Spawn specialized agents
claude-flow agent spawn --type researcher --name "data-analyst"
claude-flow agent spawn --type coder --name "backend-dev"

# Orchestrate tasks across agents
claude-flow task orchestrate --strategy parallel --priority high
```

## Hook System

Extensible automation with pre/post command hooks:

```bash
# Start session with hooks
claude-flow hooks start --task "feature-development"

# Update progress automatically
claude-flow hooks update --file "src/api.ts" --message "API endpoints added"

# Complete task with analysis
claude-flow hooks complete --task "feature-development" --analyze
```

## MCP Integration

Model Context Protocol server for external tool integration:

```bash
# Start MCP server
claude-flow mcp start --stdio

# Test MCP connection
claude-flow mcp test --method "initialize"

# Add to Claude Desktop
claude mcp add claude-flow npx claude-flow mcp start
```

## Development Workflow

Typical development workflow with Claude Flow:

```bash
# 1. Initialize project
claude-flow init --template typescript --hooks

# 2. Start development session
claude-flow hooks start --task "api-development"

# 3. Initialize swarm for parallel work
claude-flow swarm init --topology hierarchical --agents 6

# 4. Spawn specialized agents
claude-flow agent spawn --type architect --task "design-api"
claude-flow agent spawn --type coder --task "implement-endpoints"
claude-flow agent spawn --type tester --task "write-tests"

# 5. Monitor progress
claude-flow monitor --swarm --memory --performance

# 6. Complete session
claude-flow hooks complete --task "api-development" --export-metrics
```

## Configuration

Configuration is managed through `.claude/settings.json`:

```json
{
  "cli": {
    "defaultTopology": "mesh",
    "maxAgents": 8,
    "memoryOptimization": true,
    "hooksEnabled": true
  },
  "memory": {
    "persistent": true,
    "compression": true,
    "ttl": 86400
  },
  "hooks": {
    "preCommand": true,
    "postCommand": true,
    "sessionManagement": true
  }
}
```

## Performance Features

### Memory Optimization
- Emergency garbage collection
- Memory usage monitoring
- Automatic cleanup and compression
- Cross-session persistence

### Parallel Execution
- Multi-agent coordination
- Intelligent load balancing
- Topology optimization
- Performance monitoring

### Caching & Efficiency
- Command result caching
- Memory reuse strategies
- Optimized startup time
- Lazy loading of commands

## TypeScript Integration

Full TypeScript support with intelligent types:

```typescript
import { CLICommand, AgentConfig, MemoryStore } from 'claude-flow';

// Define custom commands
const customCommand: CLICommand = {
  name: 'custom',
  description: 'Custom workflow command',
  handler: async (args, flags) => {
    // Implementation
  }
};

// Agent configuration
const agentConfig: AgentConfig = {
  type: 'specialist',
  capabilities: ['analysis', 'optimization'],
  memory: { persistent: true }
};
```

## Migration Guide

For users upgrading from previous versions, see [MIGRATION.md](./MIGRATION.md) for detailed transition instructions.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, testing procedures, and contribution standards.

## Documentation

- **Architecture**: `/docs/architecture/` - System design and patterns
- **API Reference**: `/docs/api/` - Command and API documentation
- **Examples**: `/docs/examples/` - Usage examples and tutorials
- **Deployment**: `/docs/deployment/` - Installation and configuration

## License

MIT - See [LICENSE](./LICENSE) for details.

## Links

- **Repository**: https://github.com/ruvnet/claude-code-flow
- **Issues**: https://github.com/ruvnet/claude-code-flow/issues
- **NPM Package**: https://www.npmjs.com/package/claude-flow
