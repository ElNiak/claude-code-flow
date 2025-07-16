/**
 * MCP Tools Registry - Complete tool definitions for Claude-Flow MCP Server
 * Provides comprehensive tool registration and validation
 */

export class MCPToolsRegistry {
  constructor() {
    this.tools = this.initializeAllTools();
    this.categories = this.getToolCategories();
  }

  initializeAllTools() {
    return {
      // 🐝 Swarm Coordination Tools (12)
      swarm_init: {,
        name: "swarm_init",
        description: "Initialize swarm with topology and configuration",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            topology: {,
              type: "string",
              enum: ["hierarchical", "mesh", "ring", "star"],
              description: "Swarm coordination topology"},
            maxAgents: { ,
              type: "number", 
              default: 8,
              minimum: 1,
              maximum: 50,
              description: "Maximum number of agents in swarm"},
            strategy: { ,
              type: "string", 
              default: "auto",
              enum: ["auto", "performance", "balanced", "resource-efficient"],
              description: "Coordination strategy"}},
          required: ["topology"]}},
      
      agent_spawn: {,
        name: "agent_spawn",
        description: "Create specialized AI agents",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            type: {,
              type: "string",
              enum: [,
                "coordinator", "researcher", "coder", "analyst", "architect",
                "tester", "reviewer", "optimizer", "documenter", "monitor", "specialist"],
              description: "Type of agent to spawn"},
            name: { type: "string", description: "Custom name for the agent" },
            capabilities: { ,
              type: "array", 
              items: { type: "string" },
              description: "Specific capabilities for the agent"},
            swarmId: { type: "string", description: "ID of swarm to join" }},
          required: ["type"]}},
      
      task_orchestrate: {,
        name: "task_orchestrate",
        description: "Orchestrate complex task workflows",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            task: { type: "string", description: "Task description" },
            strategy: {,
              type: "string",
              enum: ["parallel", "sequential", "adaptive", "balanced"],
              default: "adaptive",
              description: "Execution strategy"},
            priority: {,
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              default: "medium",
              description: "Task priority level"},
            dependencies: { ,
              type: "array", 
              items: { type: "string" },
              description: "Task dependencies"}},
          required: ["task"]}},
      
      swarm_status: {,
        name: "swarm_status",
        description: "Monitor swarm health and performance",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Specific swarm ID to check" }}}},
      
      agent_list: {,
        name: "agent_list",
        description: "List active agents & capabilities",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Filter by swarm ID" }}}},
      
      agent_metrics: {,
        name: "agent_metrics",
        description: "Agent performance metrics",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            agentId: { type: "string", description: "Specific agent ID" }}}},
      
      swarm_monitor: {,
        name: "swarm_monitor",
        description: "Real-time swarm monitoring",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Swarm to monitor" },
            interval: { type: "number", default: 5000, description: "Monitor interval in ms" }}}},
      
      topology_optimize: {,
        name: "topology_optimize",
        description: "Auto-optimize swarm topology",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Swarm to optimize" }}}},
      
      load_balance: {,
        name: "load_balance",
        description: "Distribute tasks efficiently",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Target swarm" },
            tasks: { type: "array", items: { type: "object" }, description: "Tasks to distribute" }}}},
      
      coordination_sync: {,
        name: "coordination_sync",
        description: "Sync agent coordination",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Swarm to sync" }}}},
      
      swarm_scale: {,
        name: "swarm_scale",
        description: "Auto-scale agent count",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Target swarm" },
            targetSize: { type: "number", minimum: 1, maximum: 50, description: "Target agent count" }}}},
      
      swarm_destroy: {,
        name: "swarm_destroy",
        description: "Gracefully shutdown swarm",
        category: "swarm",
        inputSchema: {,
          type: "object",
          properties: {,
            swarmId: { type: "string", description: "Swarm to destroy" }},
          required: ["swarmId"]}},

      // 🧠 Neural Network Tools (15)
      neural_status: {,
        name: "neural_status",
        description: "Check neural network status",
        category: "neural",
        inputSchema: {,
          type: "object",
          properties: {,
            modelId: { type: "string", description: "Model to check" }}}},
      
      neural_train: {,
        name: "neural_train",
        description: "Train neural patterns with WASM SIMD acceleration",
        category: "neural",
        inputSchema: {,
          type: "object",
          properties: {,
            pattern_type: {,
              type: "string",
              enum: ["coordination", "optimization", "prediction"],
              description: "Type of pattern to train"},
            training_data: { type: "string", description: "Training data source" },
            epochs: { type: "number", default: 50, minimum: 1, maximum: 1000, description: "Training epochs" }},
          required: ["pattern_type", "training_data"]}},
      
      neural_patterns: {,
        name: "neural_patterns",
        description: "Analyze cognitive patterns",
        category: "neural",
        inputSchema: {,
          type: "object",
          properties: {,
            action: {,
              type: "string",
              enum: ["analyze", "learn", "predict"],
              description: "Pattern action"},
            operation: { type: "string", description: "Operation to analyze" },
            outcome: { type: "string", description: "Operation outcome" },
            metadata: { type: "object", description: "Additional metadata" }},
          required: ["action"]}},
      
      neural_predict: {,
        name: "neural_predict",
        description: "Make AI predictions",
        category: "neural",
        inputSchema: {,
          type: "object",
          properties: {,
            modelId: { type: "string", description: "Model to use for prediction" },
            input: { type: "string", description: "Input data for prediction" }},
          required: ["modelId", "input"]}},

      // 💾 Memory & Persistence Tools (12)
      memory_usage: {,
        name: "memory_usage",
        description: "Store/retrieve persistent memory with TTL and namespacing",
        category: "memory",
        inputSchema: {,
          type: "object",
          properties: {,
            action: {,
              type: "string",
              enum: ["store", "retrieve", "list", "delete", "search"],
              description: "Memory action to perform"},
            key: { type: "string", description: "Memory key" },
            value: { type: "string", description: "Value to store" },
            namespace: { type: "string", default: "default", description: "Memory namespace" },
            ttl: { type: "number", description: "Time to live in milliseconds" }},
          required: ["action"]}},
      
      memory_search: {,
        name: "memory_search",
        description: "Search memory with patterns",
        category: "memory",
        inputSchema: {,
          type: "object",
          properties: {,
            pattern: { type: "string", description: "Search pattern" },
            namespace: { type: "string", description: "Search namespace" },
            limit: { type: "number", default: 10, minimum: 1, maximum: 100, description: "Result limit" }},
          required: ["pattern"]}},

      // 📊 Analysis & Monitoring Tools (13)
      performance_report: {,
        name: "performance_report",
        description: "Generate performance reports with real-time metrics",
        category: "analysis",
        inputSchema: {,
          type: "object",
          properties: {,
            timeframe: {,
              type: "string",
              enum: ["24h", "7d", "30d"],
              default: "24h",
              description: "Analysis timeframe"},
            format: {,
              type: "string",
              enum: ["summary", "detailed", "json"],
              default: "summary",
              description: "Report format"}}}},
      
      bottleneck_analyze: {,
        name: "bottleneck_analyze",
        description: "Identify performance bottlenecks",
        category: "analysis",
        inputSchema: {,
          type: "object",
          properties: {,
            component: { type: "string", description: "Component to analyze" },
            metrics: { type: "array", items: { type: "string" }, description: "Metrics to analyze" }}}},
      
      token_usage: {,
        name: "token_usage",
        description: "Analyze token consumption",
        category: "analysis",
        inputSchema: {,
          type: "object",
          properties: {,
            operation: { type: "string", description: "Operation to analyze" },
            timeframe: { type: "string", default: "24h", description: "Analysis timeframe" }}}},

      // 🔄 Workflow & Automation Tools (11)
      workflow_create: {,
        name: "workflow_create",
        description: "Create custom workflows",
        category: "workflow",
        inputSchema: {,
          type: "object",
          properties: {,
            name: { type: "string", description: "Workflow name" },
            steps: { type: "array", items: { type: "object" }, description: "Workflow steps" },
            triggers: { type: "array", items: { type: "object" }, description: "Workflow triggers" }},
          required: ["name", "steps"]}},
      
      sparc_mode: {,
        name: "sparc_mode",
        description: "Run SPARC development modes",
        category: "workflow",
        inputSchema: {,
          type: "object",
          properties: {,
            mode: {,
              type: "string",
              enum: ["dev", "api", "ui", "test", "refactor"],
              description: "SPARC mode to run"},
            task_description: { type: "string", description: "Task description" },
            options: { type: "object", description: "Mode options" }},
          required: ["mode", "task_description"]}},

      // 🐙 GitHub Integration Tools (8)
      github_repo_analyze: {,
        name: "github_repo_analyze",
        description: "Repository analysis",
        category: "github",
        inputSchema: {,
          type: "object",
          properties: {,
            repo: { type: "string", description: "Repository to analyze" },
            analysis_type: {,
              type: "string",
              enum: ["code_quality", "performance", "security"],
              description: "Type of analysis"}},
          required: ["repo"]}},
      
      github_pr_manage: {,
        name: "github_pr_manage",
        description: "Pull request management",
        category: "github",
        inputSchema: {,
          type: "object",
          properties: {,
            repo: { type: "string", description: "Repository name" },
            action: {,
              type: "string",
              enum: ["review", "merge", "close"],
              description: "PR action"},
            pr_number: { type: "number", description: "Pull request number" }},
          required: ["repo", "action"]}},

      // 🏗️ DAA (Dynamic Agent Architecture) Tools (8)
      daa_agent_create: {,
        name: "daa_agent_create",
        description: "Create dynamic agents",
        category: "daa",
        inputSchema: {,
          type: "object",
          properties: {,
            agent_type: { type: "string", description: "Type of agent to create" },
            capabilities: { type: "array", items: { type: "string" }, description: "Agent capabilities" },
            resources: { type: "object", description: "Resource requirements" }},
          required: ["agent_type"]}},
      
      daa_capability_match: {,
        name: "daa_capability_match",
        description: "Match capabilities to tasks",
        category: "daa",
        inputSchema: {,
          type: "object",
          properties: {,
            task_requirements: { type: "array", items: { type: "string" }, description: "Task requirements" },
            available_agents: { type: "array", items: { type: "object" }, description: "Available agents" }},
          required: ["task_requirements"]}},

      // 🛠️ System & Utilities Tools (8)
      terminal_execute: {,
        name: "terminal_execute",
        description: "Execute terminal commands",
        category: "system",
        inputSchema: {,
          type: "object",
          properties: {,
            command: { type: "string", description: "Command to execute" },
            args: { type: "array", items: { type: "string" }, description: "Command arguments" }},
          required: ["command"]}},
      
      config_manage: {,
        name: "config_manage",
        description: "Configuration management",
        category: "system",
        inputSchema: {,
          type: "object",
          properties: {,
            action: { type: "string", enum: ["get", "set", "list", "reset"], description: "Config action" },
            config: { type: "object", description: "Configuration data" }},
          required: ["action"]}},
      
      features_detect: {,
        name: "features_detect",
        description: "Feature detection",
        category: "system",
        inputSchema: {,
          type: "object",
          properties: {,
            component: { type: "string", description: "Component to detect features for" }}}},
      
      security_scan: {,
        name: "security_scan",
        description: "Security scanning",
        category: "system",
        inputSchema: {,
          type: "object",
          properties: {,
            target: { type: "string", description: "Target to scan" },
            depth: { type: "string", enum: ["basic", "detailed", "comprehensive"], description: "Scan depth" }},
          required: ["target"]}},
      
      health_check: {,
        name: "health_check",
        description: "System health monitoring",
        category: "system",
        inputSchema: {,
          type: "object",
          properties: {,
            components: { type: "array", items: { type: "string" }, description: "Components to check" }}}},

      // 🔍 Serena Integration Tools (3)
      serena_find_symbol: {,
        name: "serena_find_symbol",
        description: "Find symbol in project using Serena semantic analysis",
        category: "serena",
        inputSchema: {,
          type: "object",
          properties: {,
            symbol_name: { type: "string", description: "Symbol name to search for" },
            project_path: { type: "string", default: process.cwd(), description: "Project path to search in" },
            file_types: { ,
              type: "array", 
              items: { type: "string" }, 
              default: ["js", "ts", "jsx", "tsx"],
              description: "File types to include in search"}},
          required: ["symbol_name"]}},
      
      serena_symbols_overview: {,
        name: "serena_symbols_overview",
        description: "Get project symbols overview using Serena analysis",
        category: "serena",
        inputSchema: {,
          type: "object",
          properties: {,
            project_path: { type: "string", default: process.cwd(), description: "Project path to analyze" },
            include_dependencies: { type: "boolean", default: false, description: "Include node_modules analysis" }}}},
      
      serena_read_file: {,
        name: "serena_read_file",
        description: "Read and analyze file with Serena semantic understanding",
        category: "serena",
        inputSchema: {,
          type: "object",
          properties: {,
            file_path: { type: "string", description: "Path to file to read and analyze" },
            analysis_depth: { ,
              type: "string", 
              enum: ["basic", "detailed", "full"], 
              default: "basic",
              description: "Analysis depth"}},
          required: ["file_path"]}}};
  }

  getToolCategories() {
    return {
      swarm: "🐝 Swarm Coordination",
      neural: "🧠 Neural Processing", 
      memory: "💾 Memory & Persistence",
      analysis: "📊 Analysis & Monitoring",
      workflow: "🔄 Workflow & Automation",
      github: "🐙 GitHub Integration",
      daa: "🏗️ Dynamic Agent Architecture",
      system: "🛠️ System & Utilities",
      serena: "🔍 Serena Integration"};
  }

  getToolsByCategory(category) {
    return Object.values(this.tools).filter(tool => tool.category === category);
  }

  getTool(name) {
    return this.tools[name];
  }

  getAllTools() {
    return this.tools;
  }

  validateToolInput(toolName, input) {
    const _tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    // Basic validation - could be enhanced with JSON schema validator
    const _schema = tool.inputSchema;
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in input)) {
          throw new Error(`Missing required parameter: ${required}`);
        }
      }
    }
    
    return true;
  }

  getToolCount() {
    return Object.keys(this.tools).length;
  }

  getToolsInfo() {
    const _categories = {};
    Object.values(this.tools).forEach(tool => {
      if (!categories[tool.category]) {
        categories[tool.category] = [];
      }
      categories[tool.category].push({
        name: tool.name,
        description: tool.description});
    });
    
    return {
      total: this.getToolCount(),
      categories,
      categoryLabels: this.categories};
  }
}

export default MCPToolsRegistry;