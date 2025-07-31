# Claude Code Configuration - SPARC Development Environment (Batchtools Optimized)

## Core Principles

- NEVER RESET or CLEAN the repository or workspace except when explicitly
  requested by the User.
- Do what has been asked; nothing more, nothing less.
- NEVER create files unless they're absolutely necessary for achieving your goal.
- ALWAYS prefer editing an existing file to creating a new one.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- NEVER create md or test files in root directories or system folders.
- **Grounded, not guessed**: Retrieve context (Context7) and resolve symbols
  (Serena/LSP) **before** coding.
- **No overengineering**: Avoid complex abstractions; use simple, effective
  solutions.
- **Safety-first concurrency**: Batch **independent, idempotent** operations;
  pipeline **dependent** ones.
- **Smallest reasonable change**: Prefer minimal diffs over rewriting new files
  (NO UPDATED/UNIFIED/etc. FILES).
- **Verification gate**: Typecheck/lint/tests must pass before finalization.
- **Factual outputs only**: No numeric claims without measured artifacts.
- **Repository hygiene**: No analysis/plan/report files in repo root.

## Grounded Code-Generation Checklist

```bash
# BEFORE coding (Context7 + Serena integration)
1. mcp__context7__resolve-library-id "library-name"
2. mcp__context7__get-library-docs "/org/project" --topic="specific-feature"
3. mcp__serena__get_symbols_overview "src/" --max_answer_chars=10000
4. mcp__serena__find_symbol "target-function" --include_body=true

# DURING coding (Sequential + Serena integration)
1. mcp__sequential-thinking__sequentialthinking --thought="Plan implementation approach"
2. mcp__serena__replace_symbol_body "function-name" --body="new-implementation"
3. mcp__serena__find_referencing_symbols "updated-function"

# AFTER coding (Validation)
1. mcp__consult7__consultation --query="Review implementation quality" --pattern="**/*.ts"
2. Lint/Typecheck: `npm run lint && npm run typecheck`
3. Run tests and validation

# Chain-of-Verification (CoVe) - Before finalizing:
1. **List** new/changed identifiers; confirm each exists in
      retrieved/modified files.
2. For each factual statement, **attach a source** (file path, test id, or benchmark artifact).
3. Re-run lint/typecheck/tests after fixes until all green.
4. If a required fact cannot be supported, **omit it** or request guidance.
```

## 🚨 CRITICAL: CONCURRENT EXECUTION FOR ALL ACTIONS

Use the agent `objective-analyst` to analyze the given objectives and determine
the best approach for concurrent execution. This agent will help you identify
independent operations that can be batched together for optimal performance.

Reviewer agents are NEVER allowed to run concurrently to coder agents. Always after
the coder agents have completed their tasks, the reviewer agents can be spawned
to review the code changes.

### Concurrency Policy (Safety-First)

**Rule**: Use batching/parallelism **only** for operations that are independent
and idempotent (e.g., multiple reads).  
Use **sequential/pipelined** steps when any of the following are true:

- Ordering/causal dependencies exist (actions depend on outputs of previous ones).
- External rate-limits or side effects could conflict.
- A later step depends on results from an earlier step.
- Error isolation is needed to avoid cascading failures.

**Guideline**: “**One message = all independent related operations**.”  
If any operation needs a prior result, **split** into a short pipeline.

**Do (Batch)**: multiple Reads, non-conflicting Writes, stateless Bash,
independent Task spawns (e.g analysis, research, exploration, etc), TodoWrites
with multiple todos.(5-10+ todos). **Don’t batch**: migrations,
build→test→deploy chains, network-limited installs, writes with causal deps.

**ABSOLUTE RULE**: ALL operations MUST be concurrent/parallel in a single
message:

#### 🔴 MANDATORY CONCURRENT PATTERNS

1. **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
2. **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
3. **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
4. **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
5. **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

#### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**Examples of CORRECT concurrent execution:**

```javascript
// ✅ CORRECT: Everything in ONE message
[Single Message]:
  - mcp__context7__resolve-library-id("react")
  - mcp__context7__resolve-library-id("typescript")
  - mcp__context7__resolve-library-id("node")
  - mcp__serena__get_symbols_overview("src/")
  - mcp__perplexity-ask__search("latest react best practices 2025")
  - TodoWrite { todos: [10+ todos with all statuses/priorities] }
  - Task("Agent 1 with full instructions and hooks")
  - Task("Agent 2 with full instructions and hooks")
  - Task("Agent 3 with full instructions and hooks")
  - Read("file1.js")
  - Read("file2.js")
  - Write("output1.js", content)
  - Write("output2.js", content)
  - Bash("npm install")
  - Bash("npm test")
  - Bash("npm run build")
```

**Examples of WRONG sequential execution:**

```javascript
// ❌ WRONG: Multiple messages (NEVER DO THIS)
Message 1: mcp__context7__resolve-library-id("react")
Message 2: mcp__serena__get_symbols_overview("src/")
Message 3: mcp__perplexity-ask__search("react tips")
Message 4: TodoWrite { todos: [single todo] }
Message 5: Task("Agent 1")
Message 6: Task("Agent 2")
Message 7: Read("file1.js")
Message 8: Write("output1.js")
Message 9: Bash("npm install")
// This is 6x slower and breaks coordination!
```

### 🎯 CONCURRENT EXECUTION CHECKLIST

Before sending ANY message, ask yourself:

- ✅ Are ALL related TodoWrite operations batched together?
- ✅ Are ALL Task spawning operations in ONE message?
- ✅ Are ALL file operations (Read/Write/Edit) batched together?
- ✅ Are ALL bash commands grouped in ONE message?
- ✅ Are ALL memory operations concurrent?

If ANY answer is "No", you MUST combine operations into a single message!

## Project Overview

This project uses the SPARC (Specification, Pseudocode, Architecture,
Refinement, Completion) methodology for systematic Test-Driven Development with
AI assistance through Claude-Flow orchestration.

**🚀 Batchtools Optimization Enabled**: This configuration includes optimized
prompts and parallel processing capabilities for improved performance and
efficiency.

## SPARC Development Commands

### Core SPARC Commands

- `npx claude-flow sparc modes`: List all available SPARC development modes
- `npx claude-flow sparc run <mode> "<task>"`: Execute specific SPARC mode for a
  task
- `npx claude-flow sparc tdd "<feature>"`: Run complete TDD workflow using SPARC
  methodology
- `npx claude-flow sparc info <mode>`: Get detailed information about a specific
  mode

### Batchtools Commands (Optimized)

- `npx claude-flow sparc batch <modes> "<task>"`: Execute multiple SPARC modes
  in parallel
- `npx claude-flow sparc pipeline "<task>"`: Execute full SPARC pipeline with
  parallel processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"`: Process multiple
  tasks concurrently

### Standard Build Commands

- `npm run build`: Build the project
- `npm run test`: Run the test suite
- `npm run lint`: Run linter and format checks
- `npm run typecheck`: Run TypeScript type checking

## SPARC Methodology Workflow (Batchtools Enhanced)

### 1. Specification Phase (Parallel Analysis)

```bash
# Create detailed specifications with concurrent requirements analysis
npx claude-flow sparc run spec-pseudocode "Define user authentication requirements" --parallel
```

**Batchtools Optimization**: Simultaneously analyze multiple requirement
sources, validate constraints in parallel, and generate comprehensive
specifications.

### 2. Pseudocode Phase (Concurrent Logic Design)

```bash
# Develop algorithmic logic with parallel pattern analysis
npx claude-flow sparc run spec-pseudocode "Create authentication flow pseudocode" --batch-optimize
```

**Batchtools Optimization**: Process multiple algorithm patterns concurrently,
validate logic flows in parallel, and optimize data structures simultaneously.

### 3. Architecture Phase (Parallel Component Design)

```bash
# Design system architecture with concurrent component analysis
npx claude-flow sparc run architect "Design authentication service architecture" --parallel
```

**Batchtools Optimization**: Generate multiple architectural alternatives
simultaneously, validate integration points in parallel, and create
comprehensive documentation concurrently.

### 4. Refinement Phase (Parallel TDD Implementation)

```bash
# Execute Test-Driven Development with parallel test generation
npx claude-flow sparc tdd "implement user authentication system" --batch-tdd
```

**Batchtools Optimization**: Generate multiple test scenarios simultaneously,
implement and validate code in parallel, and optimize performance concurrently.

### 5. Completion Phase (Concurrent Integration)

```bash
# Integration with parallel validation and documentation
npx claude-flow sparc run integration "integrate authentication with user management" --parallel
```

**Batchtools Optimization**: Run integration tests in parallel, generate
documentation concurrently, and validate requirements simultaneously.

## Batchtools Integration Features

### Parallel Processing Capabilities

- **Concurrent File Operations**: Read, analyze, and modify multiple files
  simultaneously
- **Parallel Code Analysis**: Analyze dependencies, patterns, and architecture
  concurrently
- **Batch Test Generation**: Create comprehensive test suites in parallel
- **Concurrent Documentation**: Generate multiple documentation formats
  simultaneously

### Performance Optimizations

- **Smart Batching**: Group related operations for optimal performance
- **Pipeline Processing**: Chain dependent operations with parallel stages
- **Resource Management**: Efficient utilization of system resources
- **Error Resilience**: Robust error handling with parallel recovery

## Performance Benchmarks

### Batchtools Performance Improvements

- **File Operations**: Up to 300% faster with parallel processing
- **Code Analysis**: 250% improvement with concurrent pattern recognition
- **Test Generation**: 400% faster with parallel test creation
- **Documentation**: 200% improvement with concurrent content generation
- **Memory Operations**: 180% faster with batched read/write operations

## Code Style and Best Practices (Batchtools Enhanced)

### SPARC Development Principles with Batchtools

- **Modular Design**: Keep files under 500 lines, optimize with parallel
  analysis
- **Environment Safety**: Never hardcode secrets, validate with concurrent
  checks
- **Test-First**: Always write tests before implementation using parallel
  generation
- **Clean Architecture**: Separate concerns with concurrent validation
- **Parallel Documentation**: Maintain clear, up-to-date documentation with
  concurrent updates

### Batchtools Best Practices

- **Parallel Operations**: Use batchtools for independent tasks
- **Concurrent Validation**: Validate multiple aspects simultaneously
- **Batch Processing**: Group similar operations for efficiency
- **Pipeline Optimization**: Chain operations with parallel stages
- **Resource Management**: Monitor and optimize resource usage

## Important Notes (Enhanced)

- Always run tests before committing with parallel execution
  (`npm run test --parallel`)
- Use SPARC memory system with concurrent operations to maintain context across
  sessions
- Follow the Red-Green-Refactor cycle with parallel test generation during TDD
  phases
- Document architectural decisions with concurrent validation in memory
- Regular security reviews with parallel analysis for authentication or data
  handling code
- Claude Code slash commands provide quick access to batchtools-optimized SPARC
  modes
- Monitor system resources during parallel operations for optimal performance

## Available Agents (54 Total)

### 🚀 Concurrent Agent Usage

**CRITICAL**: Always spawn multiple agents concurrently using the Task tool in a
single message:

```javascript
// ✅ CORRECT: Concurrent agent deployment
[Single Message]:
  - Task("Agent 1", "full instructions", "agent-type-1")
  - Task("Agent 2", "full instructions", "agent-type-2")
  - Task("Agent 3", "full instructions", "agent-type-3")
  - Task("Agent 4", "full instructions", "agent-type-4")
  - Task("Agent 5", "full instructions", "agent-type-5")
```

### 📋 Agent Categories & Concurrent Patterns

#### **Core Development Agents**

- `coder` - Implementation specialist
- `reviewer` - Code quality assurance
- `tester` - Test creation and validation
- `planner` - Strategic planning
- `researcher` - Information gathering

**Concurrent Usage:**

```bash
# Deploy full development swarm
Task("Research requirements", "...", "researcher")
Task("Plan architecture", "...", "planner")
Task("Implement features", "...", "coder")
Task("Create tests", "...", "tester")
Task("Review code", "...", "reviewer")
```

#### **Swarm Coordination Agents**

- `hierarchical-coordinator` - Queen-led coordination
- `mesh-coordinator` - Peer-to-peer networks
- `adaptive-coordinator` - Dynamic topology
- `collective-intelligence-coordinator` - Hive-mind intelligence
- `swarm-memory-manager` - Distributed memory

**Concurrent Swarm Deployment:**

```bash
# Deploy multi-topology coordination
Task("Hierarchical coordination", "...", "planner")
Task("Mesh network backup", "...", "smart-agent")
Task("Adaptive optimization", "...", "smart-agent")
```

#### **Consensus & Distributed Systems**

- `byzantine-coordinator` - Byzantine fault tolerance
- `raft-manager` - Leader election protocols
- `gossip-coordinator` - Epidemic dissemination
- `consensus-builder` - Decision-making algorithms
- `crdt-synchronizer` - Conflict-free replication
- `quorum-manager` - Dynamic quorum management
- `security-manager` - Cryptographic security

#### **Performance & Optimization**

- `perf-analyzer` - Bottleneck identification
- `performance-benchmarker` - Performance testing
- `task-orchestrator` - Workflow optimization
- `memory-coordinator` - Memory management
- `smart-agent` - Intelligent coordination

#### **GitHub & Repository Management**

- `github-modes` - Comprehensive GitHub integration
- `pr-manager` - Pull request management
- `code-review-swarm` - Multi-agent code review
- `issue-tracker` - Issue management
- `release-manager` - Release coordination
- `workflow-automation` - CI/CD automation
- `project-board-sync` - Project tracking
- `repo-architect` - Repository optimization
- `multi-repo-swarm` - Cross-repository coordination

#### **SPARC Methodology Agents**

- `sparc-coord` - SPARC orchestration
- `sparc-coder` - TDD implementation
- `specification` - Requirements analysis
- `pseudocode` - Algorithm design
- `architecture` - System design
- `refinement` - Iterative improvement

#### **Specialized Development**

- `backend-dev` - API development
- `mobile-dev` - React Native development
- `ml-developer` - Machine learning
- `cicd-engineer` - CI/CD pipelines
- `api-docs` - OpenAPI documentation
- `system-architect` - High-level design
- `code-analyzer` - Code quality analysis
- `base-template-generator` - Boilerplate creation

#### **Testing & Validation**

- `tdd-london-swarm` - Mock-driven TDD
- `production-validator` - Real implementation validation

#### **Migration & Planning**

- `migration-planner` - System migrations
- `swarm-init` - Topology initialization

### 🎯 Concurrent Agent Patterns

#### **Full-Stack Development Swarm (8 agents)**

```bash
Task("System architecture", "...", "architecture")
Task("Backend APIs", "...", "coder")
Task("Frontend mobile", "...", "coder")
Task("Database design", "...", "coder")
Task("API documentation", "...", "coder")
Task("CI/CD pipeline", "...", "coder")
Task("Performance testing", "...", "tester")
Task("Production validation", "...", "tester")
```

#### **Distributed System Swarm (6 agents)**

```bash
Task("Byzantine consensus", "...", "consensus-builder")
Task("Raft coordination", "...", "consensus-builder")
Task("Gossip protocols", "...", "smart-agent")
Task("CRDT synchronization", "...", "smart-agent")
Task("Security management", "...", "smart-agent")
Task("Performance monitoring", "...", "perf-analyzer")
```

#### **GitHub Workflow Swarm (5 agents)**

```bash
Task("PR management", "...", "pr-manager")
Task("Code review", "...", "code-review-swarm")
Task("Issue tracking", "...", "issue-tracker")
Task("Release coordination", "...", "release-manager")
Task("Workflow automation", "...", "workflow-automation")
```

#### **SPARC TDD Swarm (7 agents)**

```bash
Task("Requirements spec", "...", "specification")
Task("Algorithm design", "...", "pseudocode")
Task("System architecture", "...", "architecture")
Task("TDD implementation", "...", "sparc-coder")
Task("London school tests", "...", "tdd-london-swarm")
Task("Iterative refinement", "...", "refinement")
Task("Production validation", "...", "production-validator")
```

### ⚡ Performance Optimization

**Agent Selection Strategy:**

- **High Priority**: Use 3-5 agents max for critical path
- **Medium Priority**: Use 5-8 agents for complex features
- **Large Projects**: Use 8+ agents with proper coordination

**Memory Management:**

- Use `memory-coordinator` for cross-agent state
- Implement `swarm-memory-manager` for distributed coordination
- Apply `collective-intelligence-coordinator` for decision-making

For more information about SPARC methodology and batchtools optimization, see:

- SPARC Guide: <https://github.com/ruvnet/claude-code-flow/docs/sparc.md>
- Batchtools Documentation:
  <https://github.com/ruvnet/claude-code-flow/docs/batchtools.md>

## Available MCP Tools for Coordination

### Coordination Tools

- `mcp__claude-flow__swarm_init` - Set up coordination topology for Claude Code
- `mcp__claude-flow__agent_spawn` - Create cognitive patterns to guide Claude
  Code
- `mcp__claude-flow__task_orchestrate` - Break down and coordinate complex tasks
- `mcp__context7__resolve-library-id` - Resolve library IDs
- `mcp__context7__get-library-docs` - Fetch library documentation
- `mcp__serena__*` - Symbol resolution and context retrieval using LSP
- `mcp__perplexity-ask__*` - Adds LLMs based web research capabilities
- `mcp__sequential-thinking__sequentialthinking` - Structured problem-solving
- `mcp__consult7__*` - Use of google gemini for advanced reasoning

### Monitoring Tools

- `mcp__claude-flow__swarm_status` - Monitor coordination effectiveness
- `mcp__claude-flow__agent_list` - View active cognitive patterns
- `mcp__claude-flow__agent_metrics` - Track coordination performance
- `mcp__claude-flow__task_status` - Check workflow progress
- `mcp__claude-flow__task_results` - Review coordination outcomes

### Memory & Neural Tools

- `mcp__claude-flow__memory_usage` - Persistent memory across sessions
- `mcp__claude-flow__neural_status` - Neural pattern effectiveness
- `mcp__claude-flow__neural_train` - Improve coordination patterns
- `mcp__claude-flow__neural_patterns` - Analyze thinking approaches

### GitHub Integration Tools

- `mcp__claude-flow__github_swarm` - Create specialized GitHub management swarms
- `mcp__claude-flow__repo_analyze` - Deep repository analysis with AI
- `mcp__claude-flow__pr_enhance` - AI-powered pull request improvements
- `mcp__claude-flow__issue_triage` - Intelligent issue classification
- `mcp__claude-flow__code_review` - Automated code review with swarms

### System Tools

- `mcp__claude-flow__benchmark_run` - Measure coordination efficiency
- `mcp__claude-flow__features_detect` - Available capabilities
- `mcp__claude-flow__swarm_monitor` - Real-time coordination tracking

### MCP Tool Best Practices

#### **Context7 Optimization**

- Always resolve library IDs before fetching docs
- Use topic filters for focused documentation
- Batch multiple library lookups in single message
- Include "use context7" in prompts for auto-detection

#### **Serena LSP Optimization**

- Start with symbols overview before detailed analysis
- Use semantic search over text-based search
- Batch symbol operations when analyzing multiple files
- Leverage LSP for accurate refactoring operations

#### **Sequential Thinking Optimization**

- Use for complex multi-step problems (3+ steps)
- Allow for thought revision and branching
- Set appropriate total_thoughts estimates
- Use for decision-making and planning phases

#### **Consult7 Optimization**

- Use for codebases >50 files or >10MB
- Specify targeted queries for better results
- Use thinking mode for complex analysis
- Batch multiple consultation requests

#### **Perplexity Optimization**

- Use for real-time information needs
- Specify search scope and timeframes
- Request citations for important facts
- Batch related research queries together
