# 🔍 **Code Execution Related to Each Agent Type**

## 📊 **CRITICAL FINDING: Agents Are COORDINATION TEMPLATES, Not Code Executors**

After analyzing the codebase, here's what code is actually related to each agent type:

---

## 🎭 **THE TRUTH: Agents Generate Specialized Claude Code Prompts**

### **Location**: `hive-mind.js:2113-2250` - `generateHiveMindPrompt()` & `getWorkerTypeInstructions()`

**Each agent type creates specialized instructions for Claude Code instances:**

### **🔍 RESEARCHER Agent**
```javascript
researcher: `- Conduct thorough research using WebSearch and WebFetch
- Document findings in structured formats
- Validate source credibility and relevance
- Synthesize insights from multiple sources
- Share research methodology and results`
```

**Generated Claude Code Context:**
```
You are a RESEARCHER agent in the "MyProject" Hive Mind swarm.
🎯 MISSION: Build REST API
🐝 SWARM COORDINATION:
- Swarm ID: swarm-123
- Your Role: RESEARCHER specialist
- Team Size: 2 researcher(s)
- Coordination: Hive Mind collective intelligence

🧠 MANDATORY COORDINATION PROTOCOL:
1. BEFORE starting work:
   mcp__ruv-swarm__memory_usage {"action": "retrieve", "key": "hive-mind-swarm-123/status"}
2. DURING work:
   mcp__ruv-swarm__memory_usage {"action": "store", "key": "progress", "value": {...}}
3. FOR decisions: Use consensus_vote

- Conduct thorough research using WebSearch and WebFetch
- Document findings in structured formats
- Validate source credibility and relevance
```

### **💻 CODER Agent**
```javascript
coder: `- Write clean, maintainable, well-documented code
- Follow project conventions and best practices
- Test implementations thoroughly
- Document code changes and decisions
- Review and optimize existing code`
```

### **📊 ANALYST Agent**
```javascript
analyst: `- Analyze data patterns and trends
- Create comprehensive reports and visualizations
- Identify key insights and recommendations
- Validate analytical methodologies
- Correlate findings across data sources`
```

### **🧪 TESTER Agent**
```javascript
tester: `- Design comprehensive test strategies
- Write unit, integration, and e2e tests
- Perform manual testing and QA validation
- Document test results and coverage
- Report and track bugs and issues`
```

### **🏗️ ARCHITECT Agent**
```javascript
architect: `- Design system architecture and structure
- Create technical specifications and diagrams
- Review code for architectural compliance
- Plan scalability and performance strategies
- Document architectural decisions`
```

### **⚡ OPTIMIZER Agent**
```javascript
optimizer: `- Identify performance bottlenecks
- Optimize code, queries, and algorithms
- Monitor system performance metrics
- Implement caching and optimization strategies
- Benchmark and profile applications`
```

### **📝 DOCUMENTER Agent**
```javascript
documenter: `- Write comprehensive documentation
- Create user guides and tutorials
- Document APIs and technical specifications
- Maintain knowledge bases and wikis
- Ensure documentation accuracy and clarity`
```

### **👁️ REVIEWER Agent**
```javascript
reviewer: `- Conduct thorough code reviews
- Provide constructive feedback and suggestions
- Ensure code quality and standards compliance
- Review documentation for accuracy
- Mentor team members on best practices`
```

---

## 🔧 **ACTUAL CODE EXECUTION MECHANISM**

### **1. Agent Spawning Process**
**Location**: `hive-mind.js:2003-2110` - `spawnClaudeCodeInstances()`

```javascript
// For each agent type, generate a specialized Claude Code command
const commands = [];

workerTypes.forEach(type => {
  const typeWorkers = workerGroups[type];
  const instructions = getWorkerTypeInstructions(type);

  const command = createClaudeCodeSpawnCommand(
    swarmId, swarmName, objective, type, typeWorkers, instructions
  );

  commands.push(command);
});
```

### **2. Command Generation**
**Location**: `hive-mind.js:2025-2050` - `createClaudeCodeSpawnCommand()`

```javascript
function createClaudeCodeSpawnCommand(swarmId, swarmName, objective, workerType, typeWorkers, instructions) {
  const context = `You are a ${workerType} agent in the "${swarmName}" Hive Mind swarm.
🎯 MISSION: ${objective}
🐝 SWARM COORDINATION:
- Swarm ID: ${swarmId}
- Your Role: ${workerType.toUpperCase()} specialist
- Team Size: ${typeWorkers.length} ${workerType}(s)

🧠 MANDATORY COORDINATION PROTOCOL:
1. BEFORE starting work: [MCP coordination calls]
2. DURING work: [Memory and progress updates]
3. FOR decisions: [Consensus mechanisms]

${getWorkerTypeInstructions(workerType)}`;

  const command = `claude code --context "${context.replace(/"/g, '\\"')}"`;

  return {
    title: `${workerType.toUpperCase()} Agent`,
    command,
    context,
    workerType,
    count: typeWorkers.length
  };
}
```

### **3. Execution Flow**
```
1. User runs: claude-flow hive-mind spawn "Build API" --claude
2. System analyzes objective → selects optimal agent types
3. For each agent type → generates specialized Claude Code prompt
4. System spawns separate Claude Code instances with agent-specific instructions
5. Each Claude Code instance executes with its specialized role context
```

---

## 💡 **WHAT CODE EACH AGENT TYPE ACTUALLY EXECUTES**

### **🔍 RESEARCHER Agents Execute:**
- **WebSearch** queries for relevant technologies/patterns
- **WebFetch** operations to gather documentation
- **Read** operations to analyze existing codebases
- **Write** operations to document research findings
- **Analysis and synthesis** of gathered information

### **💻 CODER Agents Execute:**
- **Write** operations to create source code files
- **Edit/MultiEdit** operations to modify existing code
- **Bash** commands for running build/compile processes
- **Testing execution** via npm/pytest/etc commands
- **Code validation** and syntax checking

### **🏗️ ARCHITECT Agents Execute:**
- **Read** operations to understand existing architecture
- **Write** operations to create design documents
- **Bash** commands to generate diagrams/specs
- **Analysis** of system structure and dependencies
- **Planning** operations using project management tools

### **🧪 TESTER Agents Execute:**
- **Write** operations to create test files
- **Bash** commands to run test suites
- **Read** operations to analyze test coverage
- **Validation** of functionality and edge cases
- **Bug reporting** and quality assessment

### **⚡ OPTIMIZER Agents Execute:**
- **Profiling** commands to measure performance
- **Analysis** of bottlenecks and resource usage
- **Edit** operations to optimize code
- **Bash** commands for benchmarking
- **Monitoring** and metrics collection

### **📝 DOCUMENTER Agents Execute:**
- **Write** operations to create documentation files
- **Read** operations to understand code functionality
- **Edit** operations to update existing docs
- **Analysis** of documentation gaps
- **Formatting** and organization of content

### **👁️ REVIEWER Agents Execute:**
- **Read** operations for comprehensive code review
- **Analysis** of code quality and compliance
- **Write** operations to document feedback
- **Validation** of best practices adherence
- **Mentoring** through detailed comments

---

## 🎯 **CONCRETE EXECUTION EXAMPLE**

### **Command**: `claude-flow hive-mind spawn "Build REST API" --claude`

**System spawns 3 Claude Code instances:**

#### **Instance 1: RESEARCHER Agent**
```bash
claude code --context "You are a RESEARCHER agent...
- Conduct thorough research using WebSearch and WebFetch
- Document findings in structured formats..."
```

**This instance executes:**
- `WebSearch("REST API best practices 2024")`
- `WebSearch("Node.js Express framework patterns")`
- `WebFetch("https://restfulapi.net/rest-api-design-tutorial-with-example/")`
- `Write("research/api-patterns.md", researchFindings)`

#### **Instance 2: CODER Agent**
```bash
claude code --context "You are a CODER agent...
- Write clean, maintainable, well-documented code
- Follow project conventions and best practices..."
```

**This instance executes:**
- `Write("package.json", packageConfig)`
- `Write("src/server.js", serverCode)`
- `Write("src/routes/users.js", routeCode)`
- `Bash("npm install express")`
- `Bash("npm test")`

#### **Instance 3: ARCHITECT Agent**
```bash
claude code --context "You are an ARCHITECT agent...
- Design system architecture and structure
- Create technical specifications and diagrams..."
```

**This instance executes:**
- `Write("docs/architecture.md", systemDesign)`
- `Write("docs/api-spec.yaml", openApiSpec)`
- `Read("src/", "Analyze current structure")`
- `Write("ARCHITECTURE.md", designDecisions)`

---

## ✅ **CONCLUSION: Agents Are Specialized Claude Code Executors**

1. **Agent types don't execute different code engines** - they all run Claude Code
2. **Agent types provide specialized context/instructions** to Claude Code instances
3. **Each agent type gets different behavioral prompts** that influence tool usage
4. **Coordination happens via MCP tools** for memory sharing and consensus
5. **Real work is done by Claude Code** with agent-specific expertise context

**The genius is**: Instead of building separate execution engines for each agent type, the system leverages Claude Code's native capabilities with specialized prompting to create behaviorally distinct agents that coordinate through shared memory and consensus mechanisms.
