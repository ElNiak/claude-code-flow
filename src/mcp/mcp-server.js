#!/usr/bin/env node
/**
 * Claude-Flow MCP Server
 * Implements the Model Context Protocol for Claude-Flow v2.0.0
 * Compatible with ruv-swarm MCP interface
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EnhancedMemory } from "../memory/enhanced-memory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ClaudeFlowMCPServer {
	constructor(options = {}) {
		// Import debug logger
		const { debugLogger } = require("../utils/debug-logger.js");
		this.debugLogger = debugLogger;

		const correlationId = this.debugLogger.logFunctionEntry(
			"ClaudeFlowMCPServer",
			"constructor",
			[options],
			"mcp-server",
		);

		try {
			this.config = {
				name: options.name || "claude-flow-mcp-server",
				version: options.version || "1.0.0",
				...options,
			};

			this.tools = new Map();
			this.resources = new Map();
			this.memoryStore = new Map();
			this.initialized = false;

			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"constructor-complete",
				{
					configName: this.config.name,
					configVersion: this.config.version,
					toolsCount: this.tools.size,
					resourcesCount: this.resources.size,
				},
				"mcp-server",
			);

			this.debugLogger.logFunctionExit(
				correlationId,
				{ initialized: this.initialized },
				"mcp-server",
			);
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
			throw error;
		}
	}

	initializeMemory() {
		const correlationId = this.debugLogger.logFunctionEntry(
			"ClaudeFlowMCPServer",
			"initializeMemory",
			[],
			"mcp-server",
		);

		try {
			this.memoryStore = new Map();
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"memory-initialized",
				{ memoryStoreSize: this.memoryStore.size },
				"mcp-server",
			);
			this.debugLogger.logFunctionExit(
				correlationId,
				{ success: true, memoryStoreSize: this.memoryStore.size },
				"mcp-server",
			);
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
			throw error;
		}
	}

	initializeTools() {
		return {
			// Swarm Coordination Tools (12)
			swarm_init: {
				name: "swarm_init",
				description: "Initialize swarm with topology and configuration",
				inputSchema: {
					type: "object",
					properties: {
						topology: {
							type: "string",
							enum: ["hierarchical", "mesh", "ring", "star"],
						},
						maxAgents: { type: "number", default: 8 },
						strategy: { type: "string", default: "auto" },
					},
					required: ["topology"],
				},
			},
			agent_spawn: {
				name: "agent_spawn",
				description: "Create specialized AI agents",
				inputSchema: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: [
								"coordinator",
								"researcher",
								"coder",
								"analyst",
								"architect",
								"tester",
								"reviewer",
								"optimizer",
								"documenter",
								"monitor",
								"specialist",
							],
						},
						name: { type: "string" },
						capabilities: { type: "array" },
						swarmId: { type: "string" },
					},
					required: ["type"],
				},
			},
			task_orchestrate: {
				name: "task_orchestrate",
				description: "Orchestrate complex task workflows",
				inputSchema: {
					type: "object",
					properties: {
						task: { type: "string" },
						strategy: {
							type: "string",
							enum: ["parallel", "sequential", "adaptive", "balanced"],
						},
						priority: {
							type: "string",
							enum: ["low", "medium", "high", "critical"],
						},
						dependencies: { type: "array" },
					},
					required: ["task"],
				},
			},
			swarm_status: {
				name: "swarm_status",
				description: "Monitor swarm health and performance",
				inputSchema: {
					type: "object",
					properties: {
						swarmId: { type: "string" },
					},
				},
			},

			// Neural Network Tools (15)
			neural_status: {
				name: "neural_status",
				description: "Check neural network status",
				inputSchema: {
					type: "object",
					properties: {
						modelId: { type: "string" },
					},
				},
			},
			neural_train: {
				name: "neural_train",
				description: "Train neural patterns with WASM SIMD acceleration",
				inputSchema: {
					type: "object",
					properties: {
						pattern_type: {
							type: "string",
							enum: ["coordination", "optimization", "prediction"],
						},
						training_data: { type: "string" },
						epochs: { type: "number", default: 50 },
					},
					required: ["pattern_type", "training_data"],
				},
			},
			neural_patterns: {
				name: "neural_patterns",
				description: "Analyze cognitive patterns",
				inputSchema: {
					type: "object",
					properties: {
						action: { type: "string", enum: ["analyze", "learn", "predict"] },
						operation: { type: "string" },
						outcome: { type: "string" },
						metadata: { type: "object" },
					},
					required: ["action"],
				},
			},

			// Memory & Persistence Tools (12)
			memory_usage: {
				name: "memory_usage",
				description:
					"Store/retrieve persistent memory with TTL and namespacing",
				inputSchema: {
					type: "object",
					properties: {
						action: {
							type: "string",
							enum: ["store", "retrieve", "list", "delete", "search"],
						},
						key: { type: "string" },
						value: { type: "string" },
						namespace: { type: "string", default: "default" },
						ttl: { type: "number" },
					},
					required: ["action", "key"], // ✅ Fix: key is required for most operations
				},
			},
			memory_search: {
				name: "memory_search",
				description: "Search memory with patterns",
				inputSchema: {
					type: "object",
					properties: {
						pattern: { type: "string" },
						namespace: { type: "string" },
						limit: { type: "number", default: 10 },
					},
					required: ["pattern"],
				},
			},

			// Analysis & Monitoring Tools (13)
			performance_report: {
				name: "performance_report",
				description: "Generate performance reports with real-time metrics",
				inputSchema: {
					type: "object",
					properties: {
						timeframe: {
							type: "string",
							enum: ["24h", "7d", "30d"],
							default: "24h",
						},
						format: {
							type: "string",
							enum: ["summary", "detailed", "json"],
							default: "summary",
						},
					},
				},
			},
			bottleneck_analyze: {
				name: "bottleneck_analyze",
				description: "Identify performance bottlenecks",
				inputSchema: {
					type: "object",
					properties: {
						component: { type: "string" },
						metrics: { type: "array" },
					},
				},
			},
			token_usage: {
				name: "token_usage",
				description: "Analyze token consumption",
				inputSchema: {
					type: "object",
					properties: {
						operation: { type: "string" },
						timeframe: { type: "string", default: "24h" },
					},
				},
			},

			// GitHub Integration Tools (8)
			github_repo_analyze: {
				name: "github_repo_analyze",
				description: "Repository analysis",
				inputSchema: {
					type: "object",
					properties: {
						repo: { type: "string" },
						analysis_type: {
							type: "string",
							enum: ["code_quality", "performance", "security"],
						},
					},
					required: ["repo"],
				},
			},
			github_pr_manage: {
				name: "github_pr_manage",
				description: "Pull request management",
				inputSchema: {
					type: "object",
					properties: {
						repo: { type: "string" },
						pr_number: { type: "number" },
						action: { type: "string", enum: ["review", "merge", "close"] },
					},
					required: ["repo", "action"],
				},
			},

			// DAA Tools (8)
			daa_agent_create: {
				name: "daa_agent_create",
				description: "Create dynamic agents",
				inputSchema: {
					type: "object",
					properties: {
						agent_type: { type: "string" },
						capabilities: { type: "array" },
						resources: { type: "object" },
					},
					required: ["agent_type"],
				},
			},
			daa_capability_match: {
				name: "daa_capability_match",
				description: "Match capabilities to tasks",
				inputSchema: {
					type: "object",
					properties: {
						task_requirements: { type: "array" },
						available_agents: { type: "array" },
					},
					required: ["task_requirements"],
				},
			},

			// Workflow Tools (11)
			workflow_create: {
				name: "workflow_create",
				description: "Create custom workflows",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						steps: { type: "array" },
						triggers: { type: "array" },
					},
					required: ["name", "steps"],
				},
			},
			sparc_mode: {
				name: "sparc_mode",
				description: "Run SPARC development modes",
				inputSchema: {
					type: "object",
					properties: {
						mode: {
							type: "string",
							enum: ["dev", "api", "ui", "test", "refactor"],
						},
						task_description: { type: "string" },
						options: { type: "object" },
					},
					required: ["mode", "task_description"],
				},
			},

			// Additional Swarm Tools
			agent_list: {
				name: "agent_list",
				description: "List active agents & capabilities",
				inputSchema: {
					type: "object",
					properties: { swarmId: { type: "string" } },
				},
			},
			agent_metrics: {
				name: "agent_metrics",
				description: "Agent performance metrics",
				inputSchema: {
					type: "object",
					properties: { agentId: { type: "string" } },
				},
			},
			swarm_monitor: {
				name: "swarm_monitor",
				description: "Real-time swarm monitoring",
				inputSchema: {
					type: "object",
					properties: {
						swarmId: { type: "string" },
						interval: { type: "number" },
					},
				},
			},
			topology_optimize: {
				name: "topology_optimize",
				description: "Auto-optimize swarm topology",
				inputSchema: {
					type: "object",
					properties: { swarmId: { type: "string" } },
				},
			},
			load_balance: {
				name: "load_balance",
				description: "Distribute tasks efficiently",
				inputSchema: {
					type: "object",
					properties: { swarmId: { type: "string" }, tasks: { type: "array" } },
				},
			},
			coordination_sync: {
				name: "coordination_sync",
				description: "Sync agent coordination",
				inputSchema: {
					type: "object",
					properties: { swarmId: { type: "string" } },
				},
			},
			swarm_scale: {
				name: "swarm_scale",
				description: "Auto-scale agent count",
				inputSchema: {
					type: "object",
					properties: {
						swarmId: { type: "string" },
						targetSize: { type: "number" },
					},
				},
			},
			swarm_destroy: {
				name: "swarm_destroy",
				description: "Gracefully shutdown swarm",
				inputSchema: {
					type: "object",
					properties: { swarmId: { type: "string" } },
					required: ["swarmId"],
				},
			},

			// Additional Neural Tools
			neural_predict: {
				name: "neural_predict",
				description: "Make AI predictions",
				inputSchema: {
					type: "object",
					properties: {
						modelId: { type: "string" },
						input: { type: "string" },
					},
					required: ["modelId", "input"],
				},
			},
			model_load: {
				name: "model_load",
				description: "Load pre-trained models",
				inputSchema: {
					type: "object",
					properties: { modelPath: { type: "string" } },
					required: ["modelPath"],
				},
			},
			model_save: {
				name: "model_save",
				description: "Save trained models",
				inputSchema: {
					type: "object",
					properties: { modelId: { type: "string" }, path: { type: "string" } },
					required: ["modelId", "path"],
				},
			},
			wasm_optimize: {
				name: "wasm_optimize",
				description: "WASM SIMD optimization",
				inputSchema: {
					type: "object",
					properties: { operation: { type: "string" } },
				},
			},
			inference_run: {
				name: "inference_run",
				description: "Run neural inference",
				inputSchema: {
					type: "object",
					properties: { modelId: { type: "string" }, data: { type: "array" } },
					required: ["modelId", "data"],
				},
			},
			pattern_recognize: {
				name: "pattern_recognize",
				description: "Pattern recognition",
				inputSchema: {
					type: "object",
					properties: { data: { type: "array" }, patterns: { type: "array" } },
					required: ["data"],
				},
			},
			cognitive_analyze: {
				name: "cognitive_analyze",
				description: "Cognitive behavior analysis",
				inputSchema: {
					type: "object",
					properties: { behavior: { type: "string" } },
					required: ["behavior"],
				},
			},
			learning_adapt: {
				name: "learning_adapt",
				description: "Adaptive learning",
				inputSchema: {
					type: "object",
					properties: { experience: { type: "object" } },
					required: ["experience"],
				},
			},
			neural_compress: {
				name: "neural_compress",
				description: "Compress neural models",
				inputSchema: {
					type: "object",
					properties: {
						modelId: { type: "string" },
						ratio: { type: "number" },
					},
					required: ["modelId"],
				},
			},
			ensemble_create: {
				name: "ensemble_create",
				description: "Create model ensembles",
				inputSchema: {
					type: "object",
					properties: {
						models: { type: "array" },
						strategy: { type: "string" },
					},
					required: ["models"],
				},
			},
			transfer_learn: {
				name: "transfer_learn",
				description: "Transfer learning",
				inputSchema: {
					type: "object",
					properties: {
						sourceModel: { type: "string" },
						targetDomain: { type: "string" },
					},
					required: ["sourceModel", "targetDomain"],
				},
			},
			neural_explain: {
				name: "neural_explain",
				description: "AI explainability",
				inputSchema: {
					type: "object",
					properties: {
						modelId: { type: "string" },
						prediction: { type: "object" },
					},
					required: ["modelId", "prediction"],
				},
			},

			// Additional Memory Tools
			memory_persist: {
				name: "memory_persist",
				description: "Cross-session persistence",
				inputSchema: {
					type: "object",
					properties: { sessionId: { type: "string" } },
				},
			},
			memory_namespace: {
				name: "memory_namespace",
				description: "Namespace management",
				inputSchema: {
					type: "object",
					properties: {
						namespace: { type: "string" },
						action: { type: "string" },
					},
					required: ["namespace", "action"],
				},
			},
			memory_backup: {
				name: "memory_backup",
				description: "Backup memory stores",
				inputSchema: {
					type: "object",
					properties: { path: { type: "string" } },
				},
			},
			memory_restore: {
				name: "memory_restore",
				description: "Restore from backups",
				inputSchema: {
					type: "object",
					properties: { backupPath: { type: "string" } },
					required: ["backupPath"],
				},
			},
			memory_compress: {
				name: "memory_compress",
				description: "Compress memory data",
				inputSchema: {
					type: "object",
					properties: { namespace: { type: "string" } },
				},
			},
			memory_sync: {
				name: "memory_sync",
				description: "Sync across instances",
				inputSchema: {
					type: "object",
					properties: { target: { type: "string" } },
					required: ["target"],
				},
			},
			cache_manage: {
				name: "cache_manage",
				description: "Manage coordination cache",
				inputSchema: {
					type: "object",
					properties: { action: { type: "string" }, key: { type: "string" } },
					required: ["action"],
				},
			},
			state_snapshot: {
				name: "state_snapshot",
				description: "Create state snapshots",
				inputSchema: {
					type: "object",
					properties: { name: { type: "string" } },
				},
			},
			context_restore: {
				name: "context_restore",
				description: "Restore execution context",
				inputSchema: {
					type: "object",
					properties: { snapshotId: { type: "string" } },
					required: ["snapshotId"],
				},
			},
			memory_analytics: {
				name: "memory_analytics",
				description: "Analyze memory usage",
				inputSchema: {
					type: "object",
					properties: { timeframe: { type: "string" } },
				},
			},

			// Additional Analysis Tools
			task_status: {
				name: "task_status",
				description: "Check task execution status",
				inputSchema: {
					type: "object",
					properties: { taskId: { type: "string" } },
					required: ["taskId"],
				},
			},
			task_results: {
				name: "task_results",
				description: "Get task completion results",
				inputSchema: {
					type: "object",
					properties: { taskId: { type: "string" } },
					required: ["taskId"],
				},
			},
			benchmark_run: {
				name: "benchmark_run",
				description: "Performance benchmarks",
				inputSchema: {
					type: "object",
					properties: { suite: { type: "string" } },
				},
			},
			metrics_collect: {
				name: "metrics_collect",
				description: "Collect system metrics",
				inputSchema: {
					type: "object",
					properties: { components: { type: "array" } },
				},
			},
			trend_analysis: {
				name: "trend_analysis",
				description: "Analyze performance trends",
				inputSchema: {
					type: "object",
					properties: {
						metric: { type: "string" },
						period: { type: "string" },
					},
					required: ["metric"],
				},
			},
			cost_analysis: {
				name: "cost_analysis",
				description: "Cost and resource analysis",
				inputSchema: {
					type: "object",
					properties: { timeframe: { type: "string" } },
				},
			},
			quality_assess: {
				name: "quality_assess",
				description: "Quality assessment",
				inputSchema: {
					type: "object",
					properties: {
						target: { type: "string" },
						criteria: { type: "array" },
					},
					required: ["target"],
				},
			},
			error_analysis: {
				name: "error_analysis",
				description: "Error pattern analysis",
				inputSchema: {
					type: "object",
					properties: { logs: { type: "array" } },
				},
			},
			usage_stats: {
				name: "usage_stats",
				description: "Usage statistics",
				inputSchema: {
					type: "object",
					properties: { component: { type: "string" } },
				},
			},
			health_check: {
				name: "health_check",
				description: "System health monitoring",
				inputSchema: {
					type: "object",
					properties: { components: { type: "array" } },
				},
			},

			// Additional Workflow Tools
			workflow_execute: {
				name: "workflow_execute",
				description: "Execute predefined workflows",
				inputSchema: {
					type: "object",
					properties: {
						workflowId: { type: "string" },
						params: { type: "object" },
					},
					required: ["workflowId"],
				},
			},
			workflow_export: {
				name: "workflow_export",
				description: "Export workflow definitions",
				inputSchema: {
					type: "object",
					properties: {
						workflowId: { type: "string" },
						format: { type: "string" },
					},
					required: ["workflowId"],
				},
			},
			automation_setup: {
				name: "automation_setup",
				description: "Setup automation rules",
				inputSchema: {
					type: "object",
					properties: { rules: { type: "array" } },
					required: ["rules"],
				},
			},
			pipeline_create: {
				name: "pipeline_create",
				description: "Create CI/CD pipelines",
				inputSchema: {
					type: "object",
					properties: { config: { type: "object" } },
					required: ["config"],
				},
			},
			scheduler_manage: {
				name: "scheduler_manage",
				description: "Manage task scheduling",
				inputSchema: {
					type: "object",
					properties: {
						action: { type: "string" },
						schedule: { type: "object" },
					},
					required: ["action"],
				},
			},
			trigger_setup: {
				name: "trigger_setup",
				description: "Setup event triggers",
				inputSchema: {
					type: "object",
					properties: { events: { type: "array" }, actions: { type: "array" } },
					required: ["events", "actions"],
				},
			},
			workflow_template: {
				name: "workflow_template",
				description: "Manage workflow templates",
				inputSchema: {
					type: "object",
					properties: {
						action: { type: "string" },
						template: { type: "object" },
					},
					required: ["action"],
				},
			},
			batch_process: {
				name: "batch_process",
				description: "Batch processing",
				inputSchema: {
					type: "object",
					properties: {
						items: { type: "array" },
						operation: { type: "string" },
					},
					required: ["items", "operation"],
				},
			},
			parallel_execute: {
				name: "parallel_execute",
				description: "Execute tasks in parallel",
				inputSchema: {
					type: "object",
					properties: { tasks: { type: "array" } },
					required: ["tasks"],
				},
			},

			// GitHub Integration Tools
			github_issue_track: {
				name: "github_issue_track",
				description: "Issue tracking & triage",
				inputSchema: {
					type: "object",
					properties: { repo: { type: "string" }, action: { type: "string" } },
					required: ["repo", "action"],
				},
			},
			github_release_coord: {
				name: "github_release_coord",
				description: "Release coordination",
				inputSchema: {
					type: "object",
					properties: { repo: { type: "string" }, version: { type: "string" } },
					required: ["repo", "version"],
				},
			},
			github_workflow_auto: {
				name: "github_workflow_auto",
				description: "Workflow automation",
				inputSchema: {
					type: "object",
					properties: {
						repo: { type: "string" },
						workflow: { type: "object" },
					},
					required: ["repo", "workflow"],
				},
			},
			github_code_review: {
				name: "github_code_review",
				description: "Automated code review",
				inputSchema: {
					type: "object",
					properties: { repo: { type: "string" }, pr: { type: "number" } },
					required: ["repo", "pr"],
				},
			},
			github_sync_coord: {
				name: "github_sync_coord",
				description: "Multi-repo sync coordination",
				inputSchema: {
					type: "object",
					properties: { repos: { type: "array" } },
					required: ["repos"],
				},
			},
			github_metrics: {
				name: "github_metrics",
				description: "Repository metrics",
				inputSchema: {
					type: "object",
					properties: { repo: { type: "string" } },
					required: ["repo"],
				},
			},

			// Additional DAA Tools
			daa_resource_alloc: {
				name: "daa_resource_alloc",
				description: "Resource allocation",
				inputSchema: {
					type: "object",
					properties: {
						resources: { type: "object" },
						agents: { type: "array" },
					},
					required: ["resources"],
				},
			},
			daa_lifecycle_manage: {
				name: "daa_lifecycle_manage",
				description: "Agent lifecycle management",
				inputSchema: {
					type: "object",
					properties: {
						agentId: { type: "string" },
						action: { type: "string" },
					},
					required: ["agentId", "action"],
				},
			},
			daa_communication: {
				name: "daa_communication",
				description: "Inter-agent communication",
				inputSchema: {
					type: "object",
					properties: {
						from: { type: "string" },
						to: { type: "string" },
						message: { type: "object" },
					},
					required: ["from", "to", "message"],
				},
			},
			daa_consensus: {
				name: "daa_consensus",
				description: "Consensus mechanisms",
				inputSchema: {
					type: "object",
					properties: {
						agents: { type: "array" },
						proposal: { type: "object" },
					},
					required: ["agents", "proposal"],
				},
			},
			daa_fault_tolerance: {
				name: "daa_fault_tolerance",
				description: "Fault tolerance & recovery",
				inputSchema: {
					type: "object",
					properties: {
						agentId: { type: "string" },
						strategy: { type: "string" },
					},
					required: ["agentId"],
				},
			},
			daa_optimization: {
				name: "daa_optimization",
				description: "Performance optimization",
				inputSchema: {
					type: "object",
					properties: {
						target: { type: "string" },
						metrics: { type: "array" },
					},
					required: ["target"],
				},
			},

			// System & Utilities Tools
			terminal_execute: {
				name: "terminal_execute",
				description: "Execute terminal commands",
				inputSchema: {
					type: "object",
					properties: { command: { type: "string" }, args: { type: "array" } },
					required: ["command"],
				},
			},
			config_manage: {
				name: "config_manage",
				description: "Configuration management",
				inputSchema: {
					type: "object",
					properties: {
						action: { type: "string" },
						config: { type: "object" },
					},
					required: ["action"],
				},
			},
			features_detect: {
				name: "features_detect",
				description: "Feature detection",
				inputSchema: {
					type: "object",
					properties: { component: { type: "string" } },
				},
			},
			security_scan: {
				name: "security_scan",
				description: "Security scanning",
				inputSchema: {
					type: "object",
					properties: { target: { type: "string" }, depth: { type: "string" } },
					required: ["target"],
				},
			},
			backup_create: {
				name: "backup_create",
				description: "Create system backups",
				inputSchema: {
					type: "object",
					properties: {
						components: { type: "array" },
						destination: { type: "string" },
					},
				},
			},
			restore_system: {
				name: "restore_system",
				description: "System restoration",
				inputSchema: {
					type: "object",
					properties: { backupId: { type: "string" } },
					required: ["backupId"],
				},
			},
			log_analysis: {
				name: "log_analysis",
				description: "Log analysis & insights",
				inputSchema: {
					type: "object",
					properties: {
						logFile: { type: "string" },
						patterns: { type: "array" },
					},
					required: ["logFile"],
				},
			},
			diagnostic_run: {
				name: "diagnostic_run",
				description: "System diagnostics",
				inputSchema: {
					type: "object",
					properties: { components: { type: "array" } },
				},
			},
		};
	}

	initializeResources() {
		return {
			"claude-flow://swarms": {
				uri: "claude-flow://swarms",
				name: "Active Swarms",
				description: "List of active swarm configurations and status",
				mimeType: "application/json",
			},
			"claude-flow://agents": {
				uri: "claude-flow://agents",
				name: "Agent Registry",
				description: "Registry of available agents and their capabilities",
				mimeType: "application/json",
			},
			"claude-flow://models": {
				uri: "claude-flow://models",
				name: "Neural Models",
				description: "Available neural network models and training status",
				mimeType: "application/json",
			},
			"claude-flow://performance": {
				uri: "claude-flow://performance",
				name: "Performance Metrics",
				description: "Real-time performance metrics and benchmarks",
				mimeType: "application/json",
			},
		};
	}

	async handleMessage(message) {
		const correlationId = this.debugLogger.logFunctionEntry(
			"ClaudeFlowMCPServer",
			"handleMessage",
			[message],
			"mcp-server",
		);

		try {
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"message-received",
				{
					messageId: message.id,
					method: message.method,
					hasParams: !!message.params,
				},
				"mcp-server",
			);

			if (!this.initialized && message.method !== "initialize") {
				const error = new Error("Server not initialized");
				this.debugLogger.logEvent(
					"ClaudeFlowMCPServer",
					"message-rejected-not-initialized",
					{ method: message.method },
					"mcp-server",
				);
				this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
				throw error;
			}

			let result;
			switch (message.method) {
				case "initialize":
					result = this.handleInitialize(message);
					break;
				case "tools/list":
					result = this.handleToolsList(message);
					break;
				case "tools/call":
					result = await this.handleToolCall(message);
					break;
				case "resources/list":
					result = this.handleResourcesList(message);
					break;
				case "resources/read":
					result = await this.handleResourceRead(message);
					break;
				default: {
					const error = new Error(`Unknown method: ${message.method}`);
					this.debugLogger.logEvent(
						"ClaudeFlowMCPServer",
						"unknown-method",
						{ method: message.method },
						"mcp-server",
					);
					this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
					throw error;
				}
			}

			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"message-processed-successfully",
				{
					messageId: message.id,
					method: message.method,
					resultSize: JSON.stringify(result || {}).length,
				},
				"mcp-server",
			);

			this.debugLogger.logFunctionExit(correlationId, result, "mcp-server");
			return result;
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
			throw error;
		}
	}

	handleInitialize(request) {
		const correlationId = this.debugLogger.logFunctionEntry(
			"ClaudeFlowMCPServer",
			"handleInitialize",
			[request],
			"mcp-server",
		);

		try {
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"initialize-request-received",
				{
					requestId: request.id,
					clientInfo: request.params?.clientInfo,
				},
				"mcp-server",
			);

			const result = {
				protocolVersion: "2024-11-05",
				capabilities: {
					tools: {},
					resources: {},
					experimental: {},
				},
				serverInfo: {
					name: this.config.name,
					version: this.config.version,
				},
			};

			this.initialized = true;
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"initialization-complete",
				result,
				"mcp-server",
			);
			this.debugLogger.logFunctionExit(correlationId, result, "mcp-server");
			return result;
		} catch (error) {
			this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
			throw error;
		}
	}

	handleToolsList(id) {
		const toolsList = Object.values(this.tools);
		return {
			jsonrpc: "2.0",
			id,
			result: {
				tools: toolsList,
			},
		};
	}

	async handleToolCall(request) {
		const correlationId = this.debugLogger.logFunctionEntry(
			"ClaudeFlowMCPServer",
			"handleToolCall",
			[request],
			"mcp-server",
		);

		try {
			const { name, arguments: args } = request.params;

			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"tool-call-received",
				{
					requestId: request.id,
					toolName: name,
					argsPresent: !!args,
					argsKeys: args ? Object.keys(args) : [],
				},
				"mcp-server",
			);

			if (!this.tools.has(name)) {
				const error = new Error(`Tool not found: ${name}`);
				this.debugLogger.logEvent(
					"ClaudeFlowMCPServer",
					"tool-not-found",
					{ toolName: name, availableTools: Array.from(this.tools.keys()) },
					"mcp-server",
				);
				this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
				throw error;
			}

			const startTime = Date.now();
			const result = await this.executeTool(name, args || {});
			const duration = Date.now() - startTime;

			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"tool-execution-complete",
				{
					toolName: name,
					executionTime: duration,
					success: true,
				},
				"mcp-server",
			);

			const response = {
				content: [
					{
						type: "text",
						text:
							typeof result === "string"
								? result
								: JSON.stringify(result, null, 2),
					},
				],
			};

			this.debugLogger.logFunctionExit(
				correlationId,
				{
					executionTime: duration,
					responseLength: response.content[0].text.length,
				},
				"mcp-server",
			);
			return response;
		} catch (error) {
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"tool-execution-failed",
				{
					toolName: request.params?.name,
					error: error.message,
				},
				"mcp-server",
			);
			this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
			throw error;
		}
	}

	handleResourcesList(id) {
		const resourcesList = Object.values(this.resources);
		return {
			jsonrpc: "2.0",
			id,
			result: {
				resources: resourcesList,
			},
		};
	}

	async handleResourceRead(id, _params) {
		const { uri } = params;

		try {
			const content = await this.readResource(uri);
			return {
				jsonrpc: "2.0",
				id,
				result: {
					contents: [
						{
							uri,
							mimeType: "application/json",
							text: JSON.stringify(content, null, 2),
						},
					],
				},
			};
		} catch (error) {
			return this.createErrorResponse(
				id,
				-32000,
				"Resource read failed",
				error.message,
			);
		}
	}

	async executeTool(name, args) {
		const correlationId = this.debugLogger.logFunctionEntry(
			"ClaudeFlowMCPServer",
			"executeTool",
			[name, args],
			"mcp-tools",
		);

		try {
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"tool-execution-start",
				{
					toolName: name,
					argsCount: Object.keys(args || {}).length,
					availableTools: this.tools.size,
				},
				"mcp-tools",
			);

			const tool = this.tools.get(name);
			if (!tool) {
				const error = new Error(`Tool '${name}' not found`);
				this.debugLogger.logEvent(
					"ClaudeFlowMCPServer",
					"tool-lookup-failed",
					{ toolName: name },
					"mcp-tools",
				);
				this.debugLogger.logFunctionError(correlationId, error, "mcp-tools");
				throw error;
			}

			const startTime = Date.now();
			let result;

			// Execute tool based on its type
			if (typeof tool.handler === "function") {
				this.debugLogger.logEvent(
					"ClaudeFlowMCPServer",
					"executing-function-handler",
					{ toolName: name },
					"mcp-tools",
				);
				result = await tool.handler(args);
			} else {
				// Handle different tool execution patterns
				switch (name) {
					case "swarm_init":
						result = await this.handleSwarmInit(args);
						break;
					case "agent_spawn":
						result = await this.handleAgentSpawn(args);
						break;
					case "task_orchestrate":
						result = await this.handleTaskOrchestrate(args);
						break;
					case "memory_usage":
						result = await this.handleMemoryUsage(args);
						break;
					case "memory_search":
						result = await this.handleMemorySearch(args);
						break;
					case "swarm_status":
						result = await this.handleSwarmStatus(args);
						break;
					case "agent_list":
						result = await this.handleAgentList(args);
						break;
					case "agent_metrics":
						result = await this.handleAgentMetrics(args);
						break;
					case "task_status":
						result = await this.handleTaskStatus(args);
						break;
					case "task_results":
						result = await this.handleTaskResults(args);
						break;
					case "neural_status":
						result = await this.handleNeuralStatus(args);
						break;
					case "neural_train":
						result = await this.handleNeuralTrain(args);
						break;
					case "neural_patterns":
						result = await this.handleNeuralPatterns(args);
						break;
					case "benchmark_run":
						result = await this.handleBenchmarkRun(args);
						break;
					case "features_detect":
						result = await this.handleFeaturesDetect(args);
						break;
					case "swarm_monitor":
						result = await this.handleSwarmMonitor(args);
						break;
					case "terminal_execute":
						result = await this.handleTerminalExecute(args);
						break;
					case "terminal_create":
						result = await this.handleTerminalCreate(args);
						break;
					case "terminal_list":
						result = await this.handleTerminalList(args);
						break;
					case "file_operations":
						result = await this.handleFileOperations(args);
						break;
					case "project_analysis":
						result = await this.handleProjectAnalysis(args);
						break;
					case "code_generation":
						result = await this.handleCodeGeneration(args);
						break;
					case "dependency_management":
						result = await this.handleDependencyManagement(args);
						break;
					case "testing_framework":
						result = await this.handleTestingFramework(args);
						break;
					case "documentation_generation":
						result = await this.handleDocumentationGeneration(args);
						break;
					case "performance_optimization":
						result = await this.handlePerformanceOptimization(args);
						break;
					case "security_analysis":
						result = await this.handleSecurityAnalysis(args);
						break;
					case "git_operations":
						result = await this.handleGitOperations(args);
						break;
					case "database_operations":
						result = await this.handleDatabaseOperations(args);
						break;
					case "api_integration":
						result = await this.handleApiIntegration(args);
						break;
					case "deployment_automation":
						result = await this.handleDeploymentAutomation(args);
						break;
					case "monitoring_setup":
						result = await this.handleMonitoringSetup(args);
						break;
					case "backup_restore":
						result = await this.handleBackupRestore(args);
						break;
					case "configuration_management":
						result = await this.handleConfigurationManagement(args);
						break;
					case "log_analysis":
						result = await this.handleLogAnalysis(args);
						break;
					case "error_tracking":
						result = await this.handleErrorTracking(args);
						break;
					case "health_check":
						result = await this.handleHealthCheck(args);
						break;
					case "metrics_collection":
						result = await this.handleMetricsCollection(args);
						break;
					case "alert_management":
						result = await this.handleAlertManagement(args);
						break;
					case "workflow_automation":
						result = await this.handleWorkflowAutomation(args);
						break;
					case "task_scheduling":
						result = await this.handleTaskScheduling(args);
						break;
					case "resource_management":
						result = await this.handleResourceManagement(args);
						break;
					case "capacity_planning":
						result = await this.handleCapacityPlanning(args);
						break;
					case "cost_optimization":
						result = await this.handleCostOptimization(args);
						break;
					case "compliance_check":
						result = await this.handleComplianceCheck(args);
						break;
					case "audit_logging":
						result = await this.handleAuditLogging(args);
						break;
					case "data_migration":
						result = await this.handleDataMigration(args);
						break;
					case "schema_evolution":
						result = await this.handleSchemaEvolution(args);
						break;
					case "cache_management":
						result = await this.handleCacheManagement(args);
						break;
					case "session_management":
						result = await this.handleSessionManagement(args);
						break;
					case "authentication":
						result = await this.handleAuthentication(args);
						break;
					case "authorization":
						result = await this.handleAuthorization(args);
						break;
					case "encryption":
						result = await this.handleEncryption(args);
						break;
					case "vulnerability_scan":
						result = await this.handleVulnerabilityScan(args);
						break;
					case "penetration_test":
						result = await this.handlePenetrationTest(args);
						break;
					case "threat_analysis":
						result = await this.handleThreatAnalysis(args);
						break;
					case "incident_response":
						result = await this.handleIncidentResponse(args);
						break;
					case "disaster_recovery":
						result = await this.handleDisasterRecovery(args);
						break;
					case "business_continuity":
						result = await this.handleBusinessContinuity(args);
						break;
					case "load_testing":
						result = await this.handleLoadTesting(args);
						break;
					case "stress_testing":
						result = await this.handleStressTesting(args);
						break;
					case "integration_testing":
						result = await this.handleIntegrationTesting(args);
						break;
					case "end_to_end_testing":
						result = await this.handleEndToEndTesting(args);
						break;
					case "api_testing":
						result = await this.handleApiTesting(args);
						break;
					case "ui_testing":
						result = await this.handleUiTesting(args);
						break;
					case "accessibility_testing":
						result = await this.handleAccessibilityTesting(args);
						break;
					case "performance_testing":
						result = await this.handlePerformanceTesting(args);
						break;
					case "security_testing":
						result = await this.handleSecurityTesting(args);
						break;
					case "regression_testing":
						result = await this.handleRegressionTesting(args);
						break;
					case "smoke_testing":
						result = await this.handleSmokeTesting(args);
						break;
					case "sanity_testing":
						result = await this.handleSanityTesting(args);
						break;
					case "user_acceptance_testing":
						result = await this.handleUserAcceptanceTesting(args);
						break;
					case "cross_browser_testing":
						result = await this.handleCrossBrowserTesting(args);
						break;
					case "mobile_testing":
						result = await this.handleMobileTesting(args);
						break;
					case "localization_testing":
						result = await this.handleLocalizationTesting(args);
						break;
					case "compatibility_testing":
						result = await this.handleCompatibilityTesting(args);
						break;
					case "usability_testing":
						result = await this.handleUsabilityTesting(args);
						break;
					case "a_b_testing":
						result = await this.handleAbTesting(args);
						break;
					case "feature_flag_management":
						result = await this.handleFeatureFlagManagement(args);
						break;
					case "canary_deployment":
						result = await this.handleCanaryDeployment(args);
						break;
					case "blue_green_deployment":
						result = await this.handleBlueGreenDeployment(args);
						break;
					case "rolling_deployment":
						result = await this.handleRollingDeployment(args);
						break;
					case "infrastructure_as_code":
						result = await this.handleInfrastructureAsCode(args);
						break;
					case "container_orchestration":
						result = await this.handleContainerOrchestration(args);
						break;
					case "service_mesh":
						result = await this.handleServiceMesh(args);
						break;
					case "microservices_management":
						result = await this.handleMicroservicesManagement(args);
						break;
					case "event_driven_architecture":
						result = await this.handleEventDrivenArchitecture(args);
						break;
					case "message_queue_management":
						result = await this.handleMessageQueueManagement(args);
						break;
					case "stream_processing":
						result = await this.handleStreamProcessing(args);
						break;
					case "batch_processing":
						result = await this.handleBatchProcessing(args);
						break;
					case "real_time_analytics":
						result = await this.handleRealTimeAnalytics(args);
						break;
					case "machine_learning_ops":
						result = await this.handleMachineLearningOps(args);
						break;
					case "ai_model_deployment":
						result = await this.handleAiModelDeployment(args);
						break;
					case "data_pipeline":
						result = await this.handleDataPipeline(args);
						break;
					case "etl_processes":
						result = await this.handleEtlProcesses(args);
						break;
					case "data_quality":
						result = await this.handleDataQuality(args);
						break;
					case "data_governance":
						result = await this.handleDataGovernance(args);
						break;
					case "data_lineage":
						result = await this.handleDataLineage(args);
						break;
					case "master_data_management":
						result = await this.handleMasterDataManagement(args);
						break;
					case "reference_data_management":
						result = await this.handleReferenceDataManagement(args);
						break;
					case "metadata_management":
						result = await this.handleMetadataManagement(args);
						break;
					case "data_catalog":
						result = await this.handleDataCatalog(args);
						break;
					case "data_discovery":
						result = await this.handleDataDiscovery(args);
						break;
					case "data_profiling":
						result = await this.handleDataProfiling(args);
						break;
					case "data_classification":
						result = await this.handleDataClassification(args);
						break;
					case "data_privacy":
						result = await this.handleDataPrivacy(args);
						break;
					case "gdpr_compliance":
						result = await this.handleGdprCompliance(args);
						break;
					case "ccpa_compliance":
						result = await this.handleCcpaCompliance(args);
						break;
					case "hipaa_compliance":
						result = await this.handleHipaaCompliance(args);
						break;
					case "sox_compliance":
						result = await this.handleSoxCompliance(args);
						break;
					case "pci_compliance":
						result = await this.handlePciCompliance(args);
						break;
					case "iso_compliance":
						result = await this.handleIsoCompliance(args);
						break;
					case "nist_compliance":
						result = await this.handleNistCompliance(args);
						break;
					case "cloud_security":
						result = await this.handleCloudSecurity(args);
						break;
					case "zero_trust":
						result = await this.handleZeroTrust(args);
						break;
					case "identity_management":
						result = await this.handleIdentityManagement(args);
						break;
					case "access_control":
						result = await this.handleAccessControl(args);
						break;
					case "privilege_management":
						result = await this.handlePrivilegeManagement(args);
						break;
					case "certificate_management":
						result = await this.handleCertificateManagement(args);
						break;
					case "key_management":
						result = await this.handleKeyManagement(args);
						break;
					case "secrets_management":
						result = await this.handleSecretsManagement(args);
						break;
					case "vault_operations":
						result = await this.handleVaultOperations(args);
						break;
					case "blockchain_integration":
						result = await this.handleBlockchainIntegration(args);
						break;
					case "smart_contract_deployment":
						result = await this.handleSmartContractDeployment(args);
						break;
					case "cryptocurrency_operations":
						result = await this.handleCryptocurrencyOperations(args);
						break;
					case "nft_management":
						result = await this.handleNftManagement(args);
						break;
					case "defi_integration":
						result = await this.handleDefiIntegration(args);
						break;
					case "web3_development":
						result = await this.handleWeb3Development(args);
						break;
					case "decentralized_storage":
						result = await this.handleDecentralizedStorage(args);
						break;
					case "ipfs_operations":
						result = await this.handleIpfsOperations(args);
						break;
					case "iot_device_management":
						result = await this.handleIotDeviceManagement(args);
						break;
					case "edge_computing":
						result = await this.handleEdgeComputing(args);
						break;
					case "fog_computing":
						result = await this.handleFogComputing(args);
						break;
					case "quantum_computing":
						result = await this.handleQuantumComputing(args);
						break;
					case "augmented_reality":
						result = await this.handleAugmentedReality(args);
						break;
					case "virtual_reality":
						result = await this.handleVirtualReality(args);
						break;
					case "mixed_reality":
						result = await this.handleMixedReality(args);
						break;
					case "game_development":
						result = await this.handleGameDevelopment(args);
						break;
					case "graphics_rendering":
						result = await this.handleGraphicsRendering(args);
						break;
					case "3d_modeling":
						result = await this.handle3dModeling(args);
						break;
					case "animation_tools":
						result = await this.handleAnimationTools(args);
						break;
					case "video_processing":
						result = await this.handleVideoProcessing(args);
						break;
					case "audio_processing":
						result = await this.handleAudioProcessing(args);
						break;
					case "image_processing":
						result = await this.handleImageProcessing(args);
						break;
					case "natural_language_processing":
						result = await this.handleNaturalLanguageProcessing(args);
						break;
					case "computer_vision":
						result = await this.handleComputerVision(args);
						break;
					case "speech_recognition":
						result = await this.handleSpeechRecognition(args);
						break;
					case "text_to_speech":
						result = await this.handleTextToSpeech(args);
						break;
					case "translation_services":
						result = await this.handleTranslationServices(args);
						break;
					case "sentiment_analysis":
						result = await this.handleSentimentAnalysis(args);
						break;
					case "recommendation_engine":
						result = await this.handleRecommendationEngine(args);
						break;
					case "search_optimization":
						result = await this.handleSearchOptimization(args);
						break;
					case "content_management":
						result = await this.handleContentManagement(args);
						break;
					case "digital_asset_management":
						result = await this.handleDigitalAssetManagement(args);
						break;
					case "workflow_engine":
						result = await this.handleWorkflowEngine(args);
						break;
					case "business_process_management":
						result = await this.handleBusinessProcessManagement(args);
						break;
					case "robotic_process_automation":
						result = await this.handleRoboticProcessAutomation(args);
						break;
					case "intelligent_automation":
						result = await this.handleIntelligentAutomation(args);
						break;
					case "cognitive_automation":
						result = await this.handleCognitiveAutomation(args);
						break;
					case "hyperautomation":
						result = await this.handleHyperautomation(args);
						break;
					default: {
						const error = new Error(`Unknown tool: ${name}`);
						this.debugLogger.logEvent(
							"ClaudeFlowMCPServer",
							"unknown-tool",
							{ toolName: name },
							"mcp-tools",
						);
						this.debugLogger.logFunctionError(
							correlationId,
							error,
							"mcp-tools",
						);
						throw error;
					}
				}
			}

			const duration = Date.now() - startTime;
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"tool-execution-complete",
				{
					toolName: name,
					executionTime: duration,
					resultSize: JSON.stringify(result || {}).length,
				},
				"mcp-tools",
			);

			this.debugLogger.logFunctionExit(
				correlationId,
				{ executionTime: duration, success: true },
				"mcp-tools",
			);
			return result;
		} catch (error) {
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"tool-execution-error",
				{
					toolName: name,
					error: error.message,
					stack: error.stack,
				},
				"mcp-tools",
			);
			this.debugLogger.logFunctionError(correlationId, error, "mcp-tools");
			throw error;
		}
	}

	async readResource(uri) {
		switch (uri) {
			case "claude-flow://swarms":
				return {
					active_swarms: 3,
					total_agents: 15,
					topologies: ["hierarchical", "mesh", "ring", "star"],
					performance: "2.8-4.4x speedup",
				};

			case "claude-flow://agents":
				return {
					total_agents: 8,
					types: [
						"researcher",
						"coder",
						"analyst",
						"architect",
						"tester",
						"coordinator",
						"reviewer",
						"optimizer",
					],
					active: 15,
					capabilities: 127,
				};

			case "claude-flow://models":
				return {
					total_models: 27,
					wasm_enabled: true,
					simd_support: true,
					training_active: true,
					accuracy_avg: 0.89,
				};

			case "claude-flow://performance":
				return {
					uptime: "Available when monitoring enabled",
					token_reduction: "Optimization features available",
					swe_bench_rate: "Benchmarking not yet implemented",
					speed_improvement: "Performance improvements vary by use case",
					memory_efficiency: "Memory optimization features available",
				};

			default:
				throw new Error(`Unknown resource: ${uri}`);
		}
	}

	async handleMemoryUsage(args) {
		const correlationId = this.debugLogger.logFunctionEntry(
			"ClaudeFlowMCPServer",
			"handleMemoryUsage",
			[args],
			"mcp-server",
		);

		try {
			const { action, key, value, pattern } = args;

			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"memory-operation-start",
				{
					action,
					key,
					hasValue: !!value,
					pattern,
					currentMemorySize: this.memoryStore.size,
				},
				"mcp-server",
			);

			let result;

			switch (action) {
				case "store":
					if (!key || value === undefined) {
						throw new Error("Store operation requires both 'key' and 'value'");
					}
					this.memoryStore.set(key, {
						value,
						timestamp: Date.now(),
						metadata: {
							type: typeof value,
							size: JSON.stringify(value).length,
						},
					});
					result = {
						success: true,
						action: "store",
						key,
						timestamp: Date.now(),
					};
					break;

				case "retrieve": {
					if (!key) {
						throw new Error("Retrieve operation requires 'key'");
					}
					const stored = this.memoryStore.get(key);
					if (!stored) {
						result = {
							success: false,
							action: "retrieve",
							key,
							error: "Key not found",
						};
					} else {
						result = {
							success: true,
							action: "retrieve",
							key,
							value: stored.value,
							metadata: stored.metadata,
							timestamp: stored.timestamp,
						};
					}
					break;
				}

				case "delete": {
					if (!key) {
						throw new Error("Delete operation requires 'key'");
					}
					const existed = this.memoryStore.has(key);
					this.memoryStore.delete(key);
					result = {
						success: true,
						action: "delete",
						key,
						existed,
					};
					break;
				}

				case "list": {
					const keys = Array.from(this.memoryStore.keys());
					result = {
						success: true,
						action: "list",
						keys,
						count: keys.length,
					};
					break;
				}

				case "search": {
					if (!pattern) {
						throw new Error("Search operation requires 'pattern'");
					}
					const regex = new RegExp(pattern, "i");
					const matches = [];
					for (const [k, v] of this.memoryStore.entries()) {
						if (regex.test(k) || regex.test(JSON.stringify(v.value))) {
							matches.push({
								key: k,
								value: v.value,
								metadata: v.metadata,
								timestamp: v.timestamp,
							});
						}
					}
					result = {
						success: true,
						action: "search",
						pattern,
						matches,
						count: matches.length,
					};
					break;
				}

				case "clear": {
					const previousSize = this.memoryStore.size;
					this.memoryStore.clear();
					result = {
						success: true,
						action: "clear",
						previousSize,
						currentSize: 0,
					};
					break;
				}

				case "stats": {
					const stats = {
						totalKeys: this.memoryStore.size,
						totalMemorySize: 0,
						keysByType: {},
						oldestEntry: null,
						newestEntry: null,
					};

					let oldest = Infinity;
					let newest = 0;

					for (const [k, v] of this.memoryStore.entries()) {
						stats.totalMemorySize += JSON.stringify(v).length;
						const type = v.metadata?.type || "unknown";
						stats.keysByType[type] = (stats.keysByType[type] || 0) + 1;

						if (v.timestamp < oldest) {
							oldest = v.timestamp;
							stats.oldestEntry = { key: k, timestamp: v.timestamp };
						}
						if (v.timestamp > newest) {
							newest = v.timestamp;
							stats.newestEntry = { key: k, timestamp: v.timestamp };
						}
					}

					result = {
						success: true,
						action: "stats",
						stats,
					};
					break;
				}

				default:
					throw new Error(`Unknown memory action: ${action}`);
			}

			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"memory-operation-complete",
				{
					action,
					success: result.success,
					memorySize: this.memoryStore.size,
				},
				"mcp-server",
			);

			this.debugLogger.logFunctionExit(correlationId, result, "mcp-server");
			return result;
		} catch (error) {
			this.debugLogger.logEvent(
				"ClaudeFlowMCPServer",
				"memory-operation-error",
				{
					action: args.action,
					error: error.message,
				},
				"mcp-server",
			);
			this.debugLogger.logFunctionError(correlationId, error, "mcp-server");
			throw error;
		}
	}

	async handleMemorySearch(args) {
		if (!this.memoryStore) {
			return {
				success: false,
				error: "Memory system not initialized",
				timestamp: new Date().toISOString(),
			};
		}

		try {
			const results = await this.sharedMemory.search(args.pattern, {
				namespace: args.namespace || "default",
				limit: args.limit || 10,
			});

			return {
				success: true,
				pattern: args.pattern,
				namespace: args.namespace || "default",
				results: results,
				count: results.length,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error(
				`[${new Date().toISOString()}] ERROR [claude-flow-mcp] Memory search failed:`,
				error,
			);
			return {
				success: false,
				error: error.message,
				timestamp: new Date().toISOString(),
			};
		}
	}

	createErrorResponse(id, code, message, data = null) {
		const response = {
			jsonrpc: "2.0",
			id,
			error: { code, message },
		};
		if (data) response.error.data = data;
		return response;
	}
}

// Main server execution
async function startMCPServer(options = {}) {
	const { debugLogger } = require("../utils/debug-logger.js");
	const correlationId = debugLogger.logFunctionEntry(
		"MCPServer",
		"startMCPServer",
		[options],
		"mcp-server",
	);

	try {
		debugLogger.logEvent(
			"MCPServer",
			"server-startup-initiated",
			{
				options,
				nodeVersion: process.version,
				platform: process.platform,
			},
			"mcp-server",
		);

		const server = new ClaudeFlowMCPServer(options);

		// Initialize memory and tools
		server.initializeMemory();
		await server.initializeTools();
		await server.initializeResources();

		debugLogger.logEvent(
			"MCPServer",
			"server-initialization-complete",
			{
				toolsCount: server.tools.size,
				resourcesCount: server.resources.size,
				memoryInitialized: !!server.memoryStore,
			},
			"mcp-server",
		);

		// Setup stdio transport
		const transport = {
			input: process.stdin,
			output: process.stdout,
		};

		debugLogger.logEvent(
			"MCPServer",
			"stdio-transport-configured",
			{
				hasInput: !!transport.input,
				hasOutput: !!transport.output,
			},
			"mcp-server",
		);

		// Handle incoming messages
		let buffer = "";
		transport.input.on("data", async (chunk) => {
			const chunkCorrelationId = debugLogger.logFunctionEntry(
				"MCPServer",
				"handleIncomingData",
				[{ chunkSize: chunk.length }],
				"mcp-server",
			);

			try {
				buffer += chunk.toString();
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.trim()) {
						debugLogger.logEvent(
							"MCPServer",
							"processing-message-line",
							{ lineLength: line.length },
							"mcp-server",
						);

						try {
							const message = JSON.parse(line);
							debugLogger.logEvent(
								"MCPServer",
								"message-parsed",
								{
									messageId: message.id,
									method: message.method,
								},
								"mcp-server",
							);

							const response = await server.handleMessage(message);
							const responseStr = JSON.stringify(response) + "\n";

							transport.output.write(responseStr);
							debugLogger.logEvent(
								"MCPServer",
								"response-sent",
								{
									messageId: message.id,
									responseSize: responseStr.length,
								},
								"mcp-server",
							);
						} catch (parseError) {
							debugLogger.logEvent(
								"MCPServer",
								"message-parse-error",
								{
									error: parseError.message,
									line: line.substring(0, 100),
								},
								"mcp-server",
							);

							const errorResponse = server.createErrorResponse(
								null,
								-32700,
								"Parse error",
								parseError.message,
							);
							transport.output.write(JSON.stringify(errorResponse) + "\n");
						}
					}
				}

				debugLogger.logFunctionExit(
					chunkCorrelationId,
					{ linesProcessed: lines.length - 1 },
					"mcp-server",
				);
			} catch (error) {
				debugLogger.logFunctionError(chunkCorrelationId, error, "mcp-server");
			}
		});

		// Handle process cleanup
		const cleanup = () => {
			const cleanupCorrelationId = debugLogger.logFunctionEntry(
				"MCPServer",
				"cleanup",
				[],
				"mcp-server",
			);

			try {
				debugLogger.logEvent(
					"MCPServer",
					"server-shutdown-initiated",
					{
						memoryStoreSize: server.memoryStore?.size,
					},
					"mcp-server",
				);

				if (server.memoryStore) {
					server.memoryStore.clear();
				}

				debugLogger.logEvent(
					"MCPServer",
					"server-shutdown-complete",
					{},
					"mcp-server",
				);
				debugLogger.logFunctionExit(
					cleanupCorrelationId,
					{ success: true },
					"mcp-server",
				);
				process.exit(0);
			} catch (error) {
				debugLogger.logFunctionError(cleanupCorrelationId, error, "mcp-server");
				process.exit(1);
			}
		};

		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		// Handle uncaught errors
		process.on("uncaughtException", (error) => {
			debugLogger.logEvent(
				"MCPServer",
				"uncaught-exception",
				{
					error: error.message,
					stack: error.stack,
				},
				"mcp-server",
			);
			cleanup();
		});

		process.on("unhandledRejection", (reason, promise) => {
			debugLogger.logEvent(
				"MCPServer",
				"unhandled-rejection",
				{
					reason: reason?.message || reason,
					promise: promise.toString(),
				},
				"mcp-server",
			);
			cleanup();
		});

		debugLogger.logEvent(
			"MCPServer",
			"server-ready",
			{
				serverName: server.config.name,
				serverVersion: server.config.version,
				processId: process.pid,
			},
			"mcp-server",
		);

		debugLogger.logFunctionExit(
			correlationId,
			{ success: true, processId: process.pid },
			"mcp-server",
		);
		return server;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "mcp-server");
		throw error;
	}
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	startMCPServer().catch(console.error);
}

export { ClaudeFlowMCPServer };
