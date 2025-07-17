#!/usr/bin/env node

/**
 * Unified Work Command Examples
 *
 * This file demonstrates various usage patterns of the unified work command
 * that replaces 50+ individual commands with intelligent task analysis.
 */

console.log(`
🚀 Claude Flow Unified Work Command Examples
===========================================

The unified work command intelligently analyzes your task and coordinates
the optimal execution strategy automatically.

Basic Usage:
-----------

1. Simple Development Task:
   npx claude-flow work "build a REST API with authentication"

   → Auto-detects: development task
   → Spawns: 4 agents (architect, coder, tester, coordinator)
   → Uses: hierarchical topology, parallel strategy
   → Includes: code generation, testing, git operations

2. Research Task:
   npx claude-flow work "research machine learning frameworks for computer vision"

   → Auto-detects: research task
   → Spawns: 3 agents (researcher, analyst, coordinator)
   → Uses: mesh topology, adaptive strategy
   → Includes: web search, analysis, documentation

3. Deployment Task:
   npx claude-flow work "deploy application to production with monitoring"

   → Auto-detects: deployment task
   → Spawns: 3 agents (devops, monitor, coordinator)
   → Uses: ring topology, sequential strategy
   → Includes: system operations, monitoring, validation

Preset Usage:
------------

4. Using Research Preset:
   npx claude-flow work "analyze GraphQL vs REST APIs" --preset research

   → Uses predefined research configuration
   → Optimized for information gathering and analysis

5. Using Development Preset:
   npx claude-flow work "implement user authentication system" --preset development

   → Uses predefined development configuration
   → Optimized for code generation and testing

6. Using API Development Preset:
   npx claude-flow work "build GraphQL API with real-time subscriptions" --preset api

   → Uses API-specific configuration
   → Includes authentication, testing, documentation

Custom Configuration:
--------------------

7. Custom Agent Count:
   npx claude-flow work "build microservices architecture" --agents 8

   → Uses 8 agents for complex distributed system
   → Auto-selects appropriate agent types and coordination

8. Custom Topology:
   npx claude-flow work "implement CI/CD pipeline" --topology ring --strategy sequential

   → Uses ring topology for pipeline flow
   → Sequential strategy for safe deployment steps

9. Dry Run Mode:
   npx claude-flow work "complex full-stack application" --dry-run --verbose

   → Shows execution plan without running
   → Displays agent allocation and coordination strategy

Advanced Examples:
-----------------

10. Configuration File:
    # Create claude-flow.config.json:
    {
      "coordination": {
        "defaultAgents": 6,
        "defaultTopology": "hierarchical"
      },
      "presets": {
        "enterprise": {
          "agents": 10,
          "topology": "hierarchical",
          "features": ["security", "scalability", "monitoring"]
        }
      }
    }

    npx claude-flow work "build enterprise application" --preset enterprise

11. Environment Variables:
    export CLAUDE_FLOW_AGENTS=5
    export CLAUDE_FLOW_TOPOLOGY=mesh
    export CLAUDE_FLOW_STRATEGY=adaptive

    npx claude-flow work "optimize database performance"

12. JSON Output:
    npx claude-flow work "analyze system architecture" --output json --dry-run

    → Outputs execution plan in JSON format
    → Useful for automation and tooling integration

Task Type Examples:
------------------

Development Tasks:
• "build a React todo application"
• "implement JWT authentication"
• "create RESTful API endpoints"
• "develop real-time chat system"
• "build e-commerce checkout flow"

Research Tasks:
• "research container orchestration tools"
• "analyze NoSQL vs SQL databases"
• "investigate AI/ML frameworks"
• "compare cloud providers"
• "study microservices patterns"

Deployment Tasks:
• "deploy to AWS with auto-scaling"
• "set up Kubernetes cluster"
• "configure CI/CD pipeline"
• "implement blue-green deployment"
• "setup monitoring and alerting"

Optimization Tasks:
• "optimize React app performance"
• "improve database query speed"
• "reduce bundle size"
• "fix memory leaks"
• "enhance API response times"

Testing Tasks:
• "implement comprehensive test suite"
• "add integration tests"
• "setup automated testing"
• "perform security testing"
• "validate accessibility compliance"

Complex Multi-Component Examples:
--------------------------------

13. Full-Stack E-commerce:
    npx claude-flow work "build complete e-commerce platform with React frontend, Node.js backend, payment processing, user authentication, and admin dashboard" --agents 10 --topology hierarchical

14. Enterprise Integration:
    npx claude-flow work "integrate legacy system with modern microservices architecture including API gateway, service mesh, and event-driven communication" --preset enterprise

15. Data Pipeline:
    npx claude-flow work "create data pipeline with ETL processes, real-time streaming, machine learning inference, and visualization dashboard" --agents 8 --strategy adaptive

Intelligence Features:
---------------------

The unified work command provides:

✅ Automatic Task Type Detection
   → Analyzes keywords and context to determine task type

✅ Complexity Assessment
   → Evaluates task complexity using weighted scoring

✅ Context Analysis
   → Examines project structure, dependencies, and environment

✅ Optimal Agent Selection
   → Chooses best agent types for the specific task

✅ Resource Planning
   → Identifies required resources and capabilities

✅ Confidence Scoring
   → Provides confidence level in analysis results

✅ Smart Recommendations
   → Suggests improvements and optimizations

Configuration Hierarchy:
-----------------------

1. Command Line Options (highest priority)
2. Configuration Files (claude-flow.config.json)
3. Environment Variables (CLAUDE_FLOW_*)
4. Project Auto-Discovery (package.json, etc.)
5. System Defaults (lowest priority)

Performance Benefits:
--------------------

• 84.8% SWE-Bench solve rate
• 32.3% token reduction through efficient coordination
• 2.8-4.4x speed improvement with parallel strategies
• 27+ neural patterns for diverse approaches
• Automatic optimization and learning

Getting Started:
---------------

1. Try a simple task:
   npx claude-flow work "create a simple web server"

2. Use dry run to see the plan:
   npx claude-flow work "your task here" --dry-run --verbose

3. Experiment with presets:
   npx claude-flow work "your task" --preset development

4. Customize as needed:
   npx claude-flow work "your task" --agents 5 --topology mesh

The unified work command makes AI-assisted development simple, intelligent,
and powerful. It replaces dozens of commands with one smart interface that
adapts to your needs automatically.

Happy coding! 🎉
`);

// Example of programmatic usage (for integration)
const exampleUsage = {
	// Basic development task
	development: {
		command: 'npx claude-flow work "build REST API"',
		expected: {
			taskType: "development",
			agents: 4,
			topology: "hierarchical",
			strategy: "parallel",
		},
	},

	// Research task with preset
	research: {
		command: 'npx claude-flow work "research AI frameworks" --preset research',
		expected: {
			taskType: "research",
			agents: 3,
			topology: "mesh",
			strategy: "adaptive",
		},
	},

	// Custom configuration
	custom: {
		command:
			'npx claude-flow work "deploy to production" --agents 5 --topology ring',
		expected: {
			taskType: "deployment",
			agents: 5,
			topology: "ring",
			strategy: "sequential",
		},
	},
};

// Export for testing or integration
if (typeof module !== "undefined" && module.exports) {
	module.exports = { exampleUsage };
}
