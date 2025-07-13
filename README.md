# 🌊 Claude-Flow v2.0.0 Alpha: Advanced AI Agent Coordination Platform

<div align="center">

[![🌟 Star on GitHub](https://img.shields.io/github/stars/ruvnet/claude-flow?style=for-the-badge&logo=github&color=gold)](https://github.com/ruvnet/claude-flow)
[![📦 Alpha Release](https://img.shields.io/npm/v/claude-flow/alpha?style=for-the-badge&logo=npm&color=orange&label=v2.0.0-alpha)](https://www.npmjs.com/package/claude-flow/v/alpha)
[![⚡ Claude Code](https://img.shields.io/badge/Claude%20Code-Optimized-green?style=for-the-badge&logo=anthropic)](https://github.com/ruvnet/claude-flow)
[![🐝 Coordination](https://img.shields.io/badge/Agent-Coordination-purple?style=for-the-badge&logo=swarm)](https://github.com/ruvnet/claude-flow)
[![🔧 MCP Tools](https://img.shields.io/badge/MCP-Integration-blue?style=for-the-badge&logo=tools)](https://github.com/ruvnet/claude-flow)
[![🛡️ MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=opensourceinitiative)](https://opensource.org/licenses/MIT)

</div>

---

## 🌟 **Overview**

**Claude-Flow v2 Alpha** is an advanced AI agent coordination platform designed for orchestrated development workflows. By combining **intelligent task coordination**, **persistent memory systems**, and **MCP integration**, Claude-Flow enables sophisticated multi-agent development coordination.

### 🎯 **Core Features (Currently Working)**

- **🐝 Agent Coordination**: Intelligent task distribution and agent management
- **🔧 MCP Integration**: ~25 functional tools for workflow orchestration
- **💾 SQLite Memory System**: Persistent `.swarm/memory.db` with cross-session storage
- **🪝 Hooks System**: Automated workflows with pre/post operation hooks
- **📊 Task Management**: Advanced scheduling and load balancing
- **⚡ Parallel Execution**: Optimized coordination with concurrent processing

> 🔥 **Professional Coordination**: Streamline development with intelligent agent orchestration

## ⚠️ **Important: Current Status vs Future Plans**

This README has been updated to accurately reflect current capabilities. For detailed information about planned features and implementation status, see our **[GitHub Issues](https://github.com/ElNiak/claude-code-flow/issues)**:

### 🚧 **Planned Features (Future Work)**
- **[Neural/AI Features](https://github.com/ElNiak/claude-code-flow/issues/1)** - Advanced AI capabilities (planned)
- **[Performance Enhancements](https://github.com/ElNiak/claude-code-flow/issues/2)** - Real performance monitoring (in development)
- **[Extended MCP Tools](https://github.com/ElNiak/claude-code-flow/issues/3)** - Expanding from ~25 to 87+ tools
- **[Enterprise Features](https://github.com/ElNiak/claude-code-flow/issues/4)** - Enterprise-grade security and compliance
- **[Advanced Dependencies](https://github.com/ElNiak/claude-code-flow/issues/5)** - ML/AI library integration
- **[Documentation Updates](https://github.com/ElNiak/claude-code-flow/issues/6)** - Comprehensive feature documentation

**See [Master Tracking Issue](https://github.com/ElNiak/claude-code-flow/issues/9)** for complete roadmap and implementation status.

## ⚡ **Try v2.0.0 Alpha in 4 Commands**

### 📋 **Prerequisites**

⚠️ **IMPORTANT**: Claude Code must be installed first:

```bash
# 1. Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# 2. Activate Claude Code with permissions
claude --dangerously-skip-permissions
```

### 🎯 **Quick Start**

```bash
# 1. Initialize Claude Flow with MCP setup
npx --y claude-flow@alpha init --force

# 2. Explore available capabilities  
npx --y claude-flow@alpha --help

# 3. Launch the coordination system
npx --y claude-flow@alpha hive-mind wizard

# 4. Start coordinated development
npx claude-flow@alpha hive-mind spawn "build me something amazing" --claude
```

## 🎯 **Typical Workflows - Your "Happy Path" Guide**

### **New to Claude-Flow? Start Here!**

Confused about `.hive-mind` and `.swarm` directories? Not sure when to create new coordination sessions? Here are the most common workflow patterns:

#### **🚀 Pattern 1: Single Feature Development**
```bash
# Initialize once per feature/task
npx claude-flow@alpha init --force
npx claude-flow@alpha hive-mind spawn "Implement user authentication" --claude

# Continue working on SAME feature (reuse existing coordination)
npx claude-flow@alpha hive-mind status
npx claude-flow@alpha memory query "authentication" --recent
npx claude-flow@alpha swarm "Add password reset functionality" --continue-session
```

#### **🏗️ Pattern 2: Multi-Feature Project**
```bash
# Project-level initialization (once per project)
npx claude-flow@alpha init --force --project-name "my-app"

# Feature 1: Authentication (new coordination context)
npx claude-flow@alpha hive-mind spawn "auth-system" --namespace auth --claude

# Feature 2: User management (separate coordination context)  
npx claude-flow@alpha hive-mind spawn "user-management" --namespace users --claude

# Resume Feature 1 later
npx claude-flow@alpha hive-mind resume --namespace auth
```

#### **🔍 Pattern 3: Research & Analysis**
```bash
# Start research session
npx claude-flow@alpha hive-mind spawn "Research microservices patterns" --agents researcher,analyst --claude

# Continue research in SAME session
npx claude-flow@alpha memory stats  # See what's been learned
npx claude-flow@alpha swarm "Deep dive into API gateway patterns" --continue-session
```

### **🤔 When Should I Create a New Coordination Session?**

| Situation | Action | Command |
|-----------|--------|---------|
| **Same objective/feature** | Continue existing session | `npx claude-flow@alpha hive-mind resume` |
| **New feature in same project** | Create new session with namespace | `npx claude-flow@alpha hive-mind spawn "new-feature" --namespace feature-name` |
| **Completely different project** | New directory + init | `mkdir new-project && cd new-project && npx claude-flow@alpha init` |
| **Experimenting/testing** | Temporary session | `npx claude-flow@alpha hive-mind spawn "experiment" --temp` |

### **📁 Understanding the Directory Structure**

**Don't panic if directories seem empty!** Claude-Flow uses SQLite databases that may not show files in directory listings:

```bash
# Check what's actually stored (even if directories look empty)
npx claude-flow@alpha memory stats        # See memory data
npx claude-flow@alpha memory list         # List all namespaces  
npx claude-flow@alpha hive-mind status    # See active coordination

# Your project structure after initialization:
# .hive-mind/     <- Contains config.json + SQLite session data
# .swarm/         <- Contains memory.db (SQLite database)
# memory/         <- Agent-specific memories (created when agents spawn)
# coordination/   <- Active workflow files (created during tasks)
```

## 🪝 **Advanced Hooks System**

### **Automated Workflow Enhancement**
Claude-Flow v2.0.0 includes a hooks system that automates coordination and enhances operations:

```bash
# Hooks automatically trigger on operations
npx claude-flow@alpha init --force  # Auto-configures MCP servers & hooks
```

### **Available Hooks**

#### **Pre-Operation Hooks**
- **`pre-task`**: Prepares context for task execution
- **`pre-search`**: Optimizes search performance  
- **`pre-edit`**: Validates files and prepares resources
- **`pre-command`**: Security validation before execution

#### **Post-Operation Hooks**
- **`post-edit`**: Auto-formats code using language-specific tools
- **`post-task`**: Stores task results and updates memory
- **`post-command`**: Updates memory with operation context
- **`notification`**: Real-time progress updates

#### **Session Hooks**
- **`session-start`**: Restores previous context
- **`session-end`**: Generates summaries and persists state
- **`session-restore`**: Loads memory from previous sessions

### **Hook Configuration**
```json
// .claude/settings.json (auto-configured)
{
  "hooks": {
    "preEditHook": {
      "command": "npx",
      "args": ["claude-flow", "hooks", "pre-edit", "--file", "${file}", "--auto-assign-agents", "true"],
      "alwaysRun": false
    },
    "postEditHook": {
      "command": "npx", 
      "args": ["claude-flow", "hooks", "post-edit", "--file", "${file}", "--format", "true"],
      "alwaysRun": true
    }
  }
}
```

## 🐝 **Agent Coordination System**

### **Intelligent Task Distribution**
Claude-Flow coordinates multiple specialized agents for complex development tasks:

```bash
# Deploy coordinated development workflow
npx claude-flow@alpha swarm "Build a full-stack application" --strategy development --claude

# Launch coordination with specific agent types
npx claude-flow@alpha hive-mind spawn "Create microservices architecture" --agents 8 --claude
```

### **🤖 Agent Types**
- **🏗️ Architect Agents**: System design and technical architecture
- **💻 Coder Agents**: Implementation and development
- **🧪 Tester Agents**: Quality assurance and validation
- **📊 Analyst Agents**: Data analysis and insights
- **🔍 Researcher Agents**: Information gathering and analysis
- **🛡️ Security Agents**: Security auditing and compliance
- **🚀 DevOps Agents**: Deployment and infrastructure

## 🔧 **MCP Tools Integration**

### **Current Functional Tools (~25 Tools)**

#### **💾 Memory Management** (Working)
```bash
# Cross-session memory management with SQLite persistence
npx claude-flow@alpha memory store "project-context" "Full-stack app requirements"
npx claude-flow@alpha memory query "authentication" --namespace sparc
npx claude-flow@alpha memory stats  # Shows SQLite database statistics
npx claude-flow@alpha memory export backup.json --namespace default
npx claude-flow@alpha memory import project-memory.json
```

#### **🐝 Agent Coordination** (Working)
```bash
# Agent spawning and coordination
npx claude-flow@alpha agent spawn --type researcher --capabilities analysis
npx claude-flow@alpha swarm init --topology hierarchical --agents 5
npx claude-flow@alpha swarm status --detailed
```

#### **📊 Basic Monitoring** (Working)
```bash
# System monitoring and health checks
npx claude-flow@alpha status --components all
npx claude-flow@alpha health check --detailed
npx claude-flow@alpha diagnostics --full
```

### **🚧 Future Tool Categories (In Development)**

**See [MCP Tool Count Issue](https://github.com/ElNiak/claude-code-flow/issues/3)** for detailed implementation plans:

- **🧠 Neural & Cognitive Tools** - Pattern recognition and learning ([Issue #1](https://github.com/ElNiak/claude-code-flow/issues/1))
- **📊 Advanced Performance Tools** - Real performance monitoring ([Issue #2](https://github.com/ElNiak/claude-code-flow/issues/2))
- **🔄 Workflow Automation** - Advanced pipeline tools
- **📦 GitHub Integration** - Repository management tools
- **🛡️ Security & Compliance** - Enterprise security features ([Issue #4](https://github.com/ElNiak/claude-code-flow/issues/4))

## 💾 **Memory Architecture**

### **SQLite-Based Persistence**
- **Robust Storage**: `.swarm/memory.db` with organized tables
- **Cross-Session Persistence**: Maintains context across Claude Code sessions
- **Namespace Management**: Organized memory with hierarchical access
- **Efficient Queries**: Fast retrieval of coordination context

```bash
# Memory system commands
npx claude-flow@alpha memory stats      # Database statistics
npx claude-flow@alpha memory list       # Available namespaces
npx claude-flow@alpha memory query "pattern" --namespace project
```

## 🛡️ **Claude Code Integration**

### **Auto-MCP Server Setup**
v2.0.0 Alpha automatically configures MCP servers for seamless Claude Code integration:

```bash
# Automatic MCP integration (happens during init)
✅ claude-flow MCP server configured
✅ Coordination tools available in Claude Code
✅ Cross-session memory persistence
✅ Automated workflow hooks
```

### **Enhanced Development Workflows**
```bash
# Advanced coordination with memory enhancement
npx claude-flow@alpha sparc mode --type "tdd" --memory-enhanced
npx claude-flow@alpha sparc workflow --phases "all" --coordination-guided
```

## 📊 **Performance & Capabilities**

### **🏆 Current Benefits**
- **✅ Enhanced Coordination**: Improved task management through intelligent distribution
- **✅ Efficient Memory**: Persistent SQLite storage with fast retrieval
- **✅ Parallel Processing**: Optimized coordination for better throughput
- **✅ MCP Integration**: Coordination tools available in Claude Code
- **✅ Zero-Config Setup**: Automatic MCP integration with Claude Code

### **🚀 Available Commands**
```bash
# Check memory system
npx claude-flow@alpha memory stats
npx claude-flow@alpha memory list

# Test coordination capabilities
npx claude-flow@alpha hive-mind status
npx claude-flow@alpha agent list

# Workflow management
npx claude-flow@alpha hooks list
```

## 🎮 **Advanced Usage Examples**

### **🏗️ Full-Stack Development**
```bash
# Deploy coordinated development workflow
npx claude-flow@alpha hive-mind spawn "Build e-commerce platform with React, Node.js, and PostgreSQL" \
  --agents 6 \
  --strategy parallel \
  --memory-namespace ecommerce \
  --claude

# Monitor coordination progress
npx claude-flow@alpha swarm monitor --detailed
```

### **🔬 Research & Analysis**
```bash
# Deploy research coordination
npx claude-flow@alpha swarm "Research AI safety in autonomous systems" \
  --strategy research \
  --memory-enhanced \
  --claude

# Analyze coordination results
npx claude-flow@alpha memory query "research" --recent --limit 10
```

## 🏗️ **Architecture Overview**

### **🐝 Coordination Layer**
```
┌─────────────────────────────────────────────────────────┐
│              🎯 Task Coordination Engine                │
│              (Intelligent Distribution)                │
├─────────────────────────────────────────────────────────┤
│  🏗️ Architect │ 💻 Coder │ 🧪 Tester │ 🔍 Research │ 🛡️ Security │
│      Agent    │   Agent  │   Agent   │    Agent    │    Agent    │
├─────────────────────────────────────────────────────────┤
│              💾 SQLite Memory System                    │
├─────────────────────────────────────────────────────────┤
│               🔧 MCP Tools Integration                  │
├─────────────────────────────────────────────────────────┤
│              🛡️ Claude Code Integration                 │
└─────────────────────────────────────────────────────────┘
```

### **🔄 Coordination Strategies**
- **Hierarchical**: Structured coordination with clear agent roles
- **Parallel**: Concurrent task execution for improved performance
- **Memory-Enhanced**: Context-aware coordination using persistent memory

## 🛠️ **Installation & Setup**

### **🚀 Quick Installation**
```bash
# Global installation (recommended)
npm install -g claude-flow@alpha

# Or use NPX for instant testing
npx claude-flow@alpha init --force

# Verify installation
claude-flow --version  # Should show 2.0.0-alpha.x
```

### **🔧 Configuration**
```bash
# Initialize with coordination features
npx claude-flow@alpha init --force --coordination-enhanced

# Configure Claude Code integration
npx claude-flow@alpha mcp setup --auto-permissions

# Test coordination system
npx claude-flow@alpha hive-mind test --agents 3 --basic-coordination
```

## 📋 **Command Reference**

### **🐝 Coordination Commands**
| Command | Description | Example |
|---------|-------------|---------|
| `hive-mind wizard` | Interactive coordination setup | `npx claude-flow@alpha hive-mind wizard` |
| `hive-mind spawn` | Deploy coordinated workflow | `npx claude-flow@alpha hive-mind spawn "task" --claude` |
| `hive-mind status` | Monitor coordination | `npx claude-flow@alpha hive-mind status --detailed` |

### **💾 Memory Commands**
| Command | Description | Example |
|---------|-------------|---------|
| `memory store` | Store key-value pair | `npx claude-flow@alpha memory store "context" "data"` |
| `memory query` | Search memory entries | `npx claude-flow@alpha memory query "auth" --namespace sparc` |
| `memory stats` | Show database statistics | `npx claude-flow@alpha memory stats` |
| `memory export` | Export memory to file | `npx claude-flow@alpha memory export backup.json` |
| `memory import` | Import memory from file | `npx claude-flow@alpha memory import project.json` |
| `memory list` | List all namespaces | `npx claude-flow@alpha memory list` |

### **📊 Monitoring Commands**
| Command | Description | Example |
|---------|-------------|---------|
| `status` | System status | `npx claude-flow@alpha status --components all` |
| `agent list` | List active agents | `npx claude-flow@alpha agent list --detailed` |
| `hooks list` | Available hooks | `npx claude-flow@alpha hooks list` |

## 🧪 **Alpha Testing & Development**

### **🐛 Bug Reports & Feature Requests**
Found issues or have suggestions for the alpha?

- **🐛 Report Bugs**: [GitHub Issues](https://github.com/ElNiak/claude-code-flow/issues)
- **💡 Feature Requests**: Use GitHub Issues with "enhancement" label
- **🛠️ Development**: Check the main branch for latest updates
- **📋 Alpha Testing**: Join our testing community

### **🔬 Testing Current Features**
```bash
# Test memory functionality
npx claude-flow@alpha memory stats
npx claude-flow@alpha memory store "test" "alpha testing data"
npx claude-flow@alpha memory query "test"

# Test coordination capabilities
npx claude-flow@alpha hive-mind status
npx claude-flow@alpha agent list

# Test hook system
npx claude-flow@alpha hooks list
```

## 🚀 **Roadmap & Future Development**

### **🎯 Current Status (v2.0.0-alpha.50)**
- ✅ Core coordination system
- ✅ SQLite memory persistence
- ✅ Basic MCP tools integration
- ✅ Hook system foundation
- ✅ Claude Code integration

### **🔄 Planned Development**
See our **[GitHub Issues](https://github.com/ElNiak/claude-code-flow/issues)** for detailed development plans:

- **🧠 Neural Features** ([Issue #1](https://github.com/ElNiak/claude-code-flow/issues/1)) - Advanced AI capabilities
- **📊 Performance Monitoring** ([Issue #2](https://github.com/ElNiak/claude-code-flow/issues/2)) - Real-time metrics
- **🔧 Extended MCP Tools** ([Issue #3](https://github.com/ElNiak/claude-code-flow/issues/3)) - 60+ additional tools
- **🏢 Enterprise Features** ([Issue #4](https://github.com/ElNiak/claude-code-flow/issues/4)) - Security and compliance
- **📚 Documentation** ([Issue #6](https://github.com/ElNiak/claude-code-flow/issues/6)) - Comprehensive guides

### **🏆 Stable v2.0.0 (Future)**
- 🎯 Production-ready coordination platform
- 🎯 Complete tool suite implementation
- 🎯 Advanced performance optimization
- 🎯 Comprehensive documentation
- 🎯 Enterprise support options

## 🤝 **Contributing**

### **🛠️ Development Setup**
```bash
# Clone the repository
git clone https://github.com/ElNiak/claude-code-flow.git
cd claude-code-flow

# Install dependencies
npm install

# Build the project
npm run build

# Test functionality
npm run test
```

### **🔬 Testing Guidelines**
- Focus on coordination system testing
- Validate memory persistence across sessions
- Test Claude Code MCP integration
- Report any issues through GitHub Issues

## 📄 **License**

MIT License - see [LICENSE](./LICENSE) for details.

**Alpha Disclaimer**: This is an alpha release intended for testing and development. Production use should be carefully evaluated.

---

## 🎉 **Acknowledgments**

- **🐝 Coordination Architecture**: Inspired by distributed systems patterns
- **💾 Memory Systems**: SQLite-based persistence for reliability
- **🛡️ Claude Code Integration**: Seamless AI development workflow
- **🚀 Performance Focus**: Optimized for development coordination

---

<div align="center">

### **🚀 Ready to try intelligent agent coordination?**

```bash
npx --y claude-flow@alpha init --force
```

**Join the coordination revolution!**

[![GitHub](https://img.shields.io/badge/GitHub-Main%20Branch-blue?style=for-the-badge&logo=github)](https://github.com/ElNiak/claude-code-flow)
[![NPM Alpha](https://img.shields.io/badge/NPM-Alpha%20Release-orange?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/claude-flow/v/alpha)
[![Issues](https://img.shields.io/badge/Issues-Development%20Tracking-green?style=for-the-badge&logo=github)](https://github.com/ElNiak/claude-code-flow/issues)

---

**Built with ❤️ by the Claude-Flow Team | Professional Agent Coordination**

*v2.0.0-alpha.50 - Honest, Capable, Evolving*

</div>