/**
 * Unified Agent Listing System
 * Consolidates agent listing across all coordination patterns (swarm, hive, SPARC, unified)
 */

import chalk from "chalk";
import Table from "cli-table3";
import { Command } from "commander";
import { AgentManager } from "../../agents/agent-manager.js";
import { AgentRegistry } from "../../agents/agent-registry.js";
import { EventBus } from "../../core/event-bus.js";
import { Logger } from "../../core/logger.js";
import { DistributedMemorySystem } from "../../memory/distributed-memory.js";
import { formatBytes, formatPercentage } from "../../utils/formatters.js";

// Unified Agent Data Model
export interface UnifiedAgent {
	id: string;
	name: string;
	type: string;
	pattern: "swarm" | "hive" | "sparc" | "unified";
	status:
		| "idle"
		| "active"
		| "busy"
		| "error"
		| "offline"
		| "initializing"
		| "terminating";
	health: number; // 0.0 - 1.0
	workload: number; // 0.0 - 1.0
	capabilities: string[];
	session?: string;
	topology?: string;
	metadata: {
		spawnedAt: Date;
		lastActivity: Date;
		coordinationHooks?: string[];
		parentAgents?: string[];
		childAgents?: string[];
		peerAgents?: string[];
	};
	metrics?: {
		tasksCompleted: number;
		tasksFailed: number;
		successRate: number;
		performance: number;
		cpuUsage?: number;
		memoryUsage?: number;
	};
	coordination?: {
		swarmId?: string;
		hiveId?: string;
		sparcMode?: string;
		coordinationLevel?: number;
	};
}

// Pattern Adapter Interface
interface PatternAdapter {
	getPatternName(): string;
	getAgents(): Promise<UnifiedAgent[]>;
	isAvailable(): boolean;
}

// Swarm Pattern Adapter
class SwarmPatternAdapter implements PatternAdapter {
	private agentManager?: AgentManager;

	constructor(
		private logger: Logger,
		private eventBus: EventBus,
		private memorySystem: DistributedMemorySystem
	) {}

	getPatternName(): string {
		return "swarm";
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			if (!this.agentManager) {
				this.agentManager = new AgentManager(
					{
						maxAgents: 100,
						defaultTimeout: 60000,
						heartbeatInterval: 15000,
						healthCheckInterval: 30000,
						autoRestart: true,
						resourceLimits: {
							memory: 1024 * 1024 * 1024,
							cpu: 2.0,
							disk: 2 * 1024 * 1024 * 1024,
						},
					},
					this.logger,
					this.eventBus,
					this.memorySystem
				);
				await this.agentManager.initialize();
			}

			const agents = this.agentManager.getAllAgents();
			return agents.map((agent) => this.normalizeAgent(agent, "swarm"));
		} catch (error) {
			this.logger.warn(
				`Swarm pattern adapter failed: ${error instanceof Error ? error.message : String(error)}`
			);
			return [];
		}
	}

	isAvailable(): boolean {
		try {
			return Boolean(this.agentManager || this.memorySystem);
		} catch {
			return false;
		}
	}

	private normalizeAgent(agent: any, pattern: "swarm"): UnifiedAgent {
		return {
			id: agent.id || agent.agentId || `swarm-${Date.now()}`,
			name: agent.name || `Swarm Agent ${agent.id?.slice(-8) || "Unknown"}`,
			type: agent.type || "coordinator",
			pattern,
			status: agent.status || "idle",
			health: agent.health || 1.0,
			workload: agent.workload || 0.0,
			capabilities: agent.capabilities || [],
			session: agent.session,
			topology: agent.topology,
			metadata: {
				spawnedAt: agent.createdAt || new Date(),
				lastActivity: agent.lastHeartbeat || new Date(),
				coordinationHooks: agent.hooks || [],
				parentAgents: agent.parentAgents || [],
				childAgents: agent.childAgents || [],
				peerAgents: agent.peerAgents || [],
			},
			metrics: agent.metrics
				? {
						tasksCompleted: agent.metrics.tasksCompleted || 0,
						tasksFailed: agent.metrics.tasksFailed || 0,
						successRate: agent.metrics.successRate || 1.0,
						performance: agent.metrics.performance || 1.0,
						cpuUsage: agent.metrics.cpuUsage,
						memoryUsage: agent.metrics.memoryUsage,
					}
				: undefined,
			coordination: {
				swarmId: agent.swarmId,
				coordinationLevel: agent.coordinationLevel || 0.7,
			},
		};
	}
}

// Hive Pattern Adapter
class HivePatternAdapter implements PatternAdapter {
	getPatternName(): string {
		return "hive";
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			// Mock implementation - in real implementation, this would connect to hive mind system
			const hiveAgents: UnifiedAgent[] = [
				{
					id: "hive-queen-001",
					name: "Hive Queen",
					type: "queen",
					pattern: "hive",
					status: "active",
					health: 0.95,
					workload: 0.6,
					capabilities: ["consensus", "coordination", "optimization"],
					metadata: {
						spawnedAt: new Date(Date.now() - 3600000),
						lastActivity: new Date(),
						coordinationHooks: ["hive-consensus", "queen-behavior"],
					},
					metrics: {
						tasksCompleted: 150,
						tasksFailed: 5,
						successRate: 0.97,
						performance: 0.92,
					},
					coordination: {
						hiveId: "hive-main-001",
						coordinationLevel: 0.95,
					},
				},
				{
					id: "hive-worker-001",
					name: "Hive Worker Alpha",
					type: "worker",
					pattern: "hive",
					status: "busy",
					health: 0.88,
					workload: 0.85,
					capabilities: ["processing", "analysis", "execution"],
					metadata: {
						spawnedAt: new Date(Date.now() - 1800000),
						lastActivity: new Date(),
						parentAgents: ["hive-queen-001"],
					},
					metrics: {
						tasksCompleted: 45,
						tasksFailed: 2,
						successRate: 0.96,
						performance: 0.88,
					},
					coordination: {
						hiveId: "hive-main-001",
						coordinationLevel: 0.85,
					},
				},
			];

			return hiveAgents;
		} catch (error) {
			console.warn(`Hive pattern adapter failed: ${error}`);
			return [];
		}
	}

	isAvailable(): boolean {
		return true; // Mock availability
	}
}

// SPARC Pattern Adapter
class SparcPatternAdapter implements PatternAdapter {
	getPatternName(): string {
		return "sparc";
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			// Mock implementation - in real implementation, this would connect to SPARC system
			const sparcAgents: UnifiedAgent[] = [
				{
					id: "sparc-spec-001",
					name: "SPARC Specification Agent",
					type: "specification",
					pattern: "sparc",
					status: "idle",
					health: 0.92,
					workload: 0.3,
					capabilities: ["specification", "analysis", "documentation"],
					metadata: {
						spawnedAt: new Date(Date.now() - 7200000),
						lastActivity: new Date(Date.now() - 300000),
					},
					metrics: {
						tasksCompleted: 12,
						tasksFailed: 0,
						successRate: 1.0,
						performance: 0.95,
					},
					coordination: {
						sparcMode: "specification",
						coordinationLevel: 0.8,
					},
				},
				{
					id: "sparc-code-001",
					name: "SPARC Coding Agent",
					type: "coder",
					pattern: "sparc",
					status: "active",
					health: 0.89,
					workload: 0.7,
					capabilities: ["coding", "implementation", "testing"],
					metadata: {
						spawnedAt: new Date(Date.now() - 5400000),
						lastActivity: new Date(),
					},
					metrics: {
						tasksCompleted: 28,
						tasksFailed: 3,
						successRate: 0.9,
						performance: 0.85,
					},
					coordination: {
						sparcMode: "coding",
						coordinationLevel: 0.75,
					},
				},
			];

			return sparcAgents;
		} catch (error) {
			console.warn(`SPARC pattern adapter failed: ${error}`);
			return [];
		}
	}

	isAvailable(): boolean {
		return true; // Mock availability
	}
}

// Unified Pattern Adapter
class UnifiedPatternAdapter implements PatternAdapter {
	constructor(private agentRegistry?: AgentRegistry) {}

	getPatternName(): string {
		return "unified";
	}

	async getAgents(): Promise<UnifiedAgent[]> {
		try {
			if (!this.agentRegistry) {
				return [];
			}

			// This would get agents from the unified registry
			const registryAgents = await this.agentRegistry.getAllAgents();
			return registryAgents.map((agent) =>
				this.normalizeAgent(agent, "unified")
			);
		} catch (error) {
			console.warn(`Unified pattern adapter failed: ${error}`);
			return [];
		}
	}

	isAvailable(): boolean {
		return Boolean(this.agentRegistry);
	}

	private normalizeAgent(agent: any, pattern: "unified"): UnifiedAgent {
		return {
			id: agent.id || `unified-${Date.now()}`,
			name: agent.name || `Unified Agent ${agent.id?.slice(-8) || "Unknown"}`,
			type: agent.type || "generic",
			pattern,
			status: agent.status || "idle",
			health: agent.health || 1.0,
			workload: agent.workload || 0.0,
			capabilities: agent.capabilities || [],
			metadata: {
				spawnedAt: agent.createdAt || new Date(),
				lastActivity: agent.lastActivity || new Date(),
				coordinationHooks: agent.hooks || [],
			},
			metrics: agent.metrics,
			coordination: {
				coordinationLevel: agent.coordinationLevel || 0.5,
			},
		};
	}
}

// Agent Status Aggregator
class AgentStatusAggregator {
	private adapters: PatternAdapter[] = [];
	private cache = new Map<
		string,
		{ data: UnifiedAgent[]; timestamp: number }
	>();
	private readonly CACHE_TTL = 30000; // 30 seconds

	constructor(
		private logger: Logger,
		private eventBus: EventBus,
		private memorySystem: DistributedMemorySystem,
		private agentRegistry?: AgentRegistry
	) {
		this.initializeAdapters();
	}

	private initializeAdapters(): void {
		this.adapters = [
			new SwarmPatternAdapter(this.logger, this.eventBus, this.memorySystem),
			new HivePatternAdapter(),
			new SparcPatternAdapter(),
			new UnifiedPatternAdapter(this.agentRegistry),
		];
	}

	async getAllAgents(
		options: {
			pattern?: string;
			type?: string;
			status?: string;
			unhealthy?: boolean;
			useCache?: boolean;
		} = {}
	): Promise<UnifiedAgent[]> {
		const cacheKey = JSON.stringify(options);

		// Check cache if enabled
		if (options.useCache !== false) {
			const cached = this.cache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
				return this.applyFilters(cached.data, options);
			}
		}

		try {
			// Query all adapters in parallel
			const adapterPromises = this.adapters
				.filter(
					(adapter) =>
						!options.pattern || adapter.getPatternName() === options.pattern
				)
				.filter((adapter) => adapter.isAvailable())
				.map(async (adapter) => {
					try {
						return await adapter.getAgents();
					} catch (error) {
						this.logger.warn(
							`Adapter ${adapter.getPatternName()} failed: ${error}`
						);
						return [];
					}
				});

			const results = await Promise.allSettled(adapterPromises);
			const allAgents: UnifiedAgent[] = [];

			results.forEach((result) => {
				if (result.status === "fulfilled") {
					allAgents.push(...result.value);
				}
			});

			// Cache the results
			this.cache.set(cacheKey, { data: allAgents, timestamp: Date.now() });

			return this.applyFilters(allAgents, options);
		} catch (error) {
			this.logger.error(`Error aggregating agent status: ${error}`);
			return [];
		}
	}

	private applyFilters(agents: UnifiedAgent[], options: any): UnifiedAgent[] {
		let filtered = agents;

		if (options.type) {
			filtered = filtered.filter((agent) => agent.type === options.type);
		}

		if (options.status) {
			filtered = filtered.filter((agent) => agent.status === options.status);
		}

		if (options.unhealthy) {
			filtered = filtered.filter((agent) => agent.health < 0.7);
		}

		return filtered;
	}

	clearCache(): void {
		this.cache.clear();
	}
}

// Output Formatters
class OutputFormatter {
	static formatTable(
		agents: UnifiedAgent[],
		detailed: boolean = false
	): string {
		if (agents.length === 0) {
			return chalk.yellow("No agents found matching the criteria");
		}

		const table = new Table({
			head: detailed
				? [
						"ID",
						"Name",
						"Type",
						"Pattern",
						"Status",
						"Health",
						"Workload",
						"Tasks",
						"Last Activity",
					]
				: ["ID", "Name", "Type", "Pattern", "Status", "Health", "Workload"],
			colWidths: detailed
				? [12, 20, 12, 10, 12, 10, 10, 12, 15]
				: [12, 25, 15, 10, 12, 10, 10],
		});

		agents.forEach((agent) => {
			const row = [
				agent.id.slice(-8),
				agent.name,
				agent.type,
				agent.pattern.toUpperCase(),
				this.getStatusDisplay(agent.status),
				this.getHealthDisplay(agent.health),
				formatPercentage(agent.workload),
			];

			if (detailed) {
				const tasks = agent.metrics
					? `${agent.metrics.tasksCompleted}/${agent.metrics.tasksCompleted + agent.metrics.tasksFailed}`
					: "0/0";
				const lastActivity = this.formatRelativeTime(
					agent.metadata.lastActivity
				);
				row.push(tasks, lastActivity);
			}

			table.push(row);
		});

		return table.toString();
	}

	static formatJSON(agents: UnifiedAgent[], pretty: boolean = true): string {
		return JSON.stringify(agents, null, pretty ? 2 : 0);
	}

	static formatTree(agents: UnifiedAgent[]): string {
		const byPattern = agents.reduce(
			(acc, agent) => {
				if (!acc[agent.pattern]) acc[agent.pattern] = [];
				acc[agent.pattern].push(agent);
				return acc;
			},
			{} as Record<string, UnifiedAgent[]>
		);

		let output = chalk.cyan("🌳 Agent Tree View\n");

		Object.entries(byPattern).forEach(([pattern, patternAgents]) => {
			output += `\n├── ${chalk.bold(pattern.toUpperCase())} (${patternAgents.length})\n`;

			patternAgents.forEach((agent, index) => {
				const isLast = index === patternAgents.length - 1;
				const prefix = isLast ? "└──" : "├──";
				const healthColor =
					agent.health >= 0.8
						? chalk.green
						: agent.health >= 0.5
							? chalk.yellow
							: chalk.red;

				output += `│   ${prefix} ${agent.name} (${agent.type}) `;
				output += `${this.getStatusDisplay(agent.status)} `;
				output += `${healthColor(formatPercentage(agent.health))}\n`;
			});
		});

		return output;
	}

	static formatDashboard(agents: UnifiedAgent[]): string {
		const stats = this.calculateStats(agents);

		let output = chalk.cyan("📊 Agent Dashboard\n");
		output += chalk.gray("═".repeat(60)) + "\n\n";

		// Summary stats
		output += chalk.bold("Summary:\n");
		output += `  Total Agents: ${stats.total}\n`;
		output += `  Active: ${chalk.green(stats.active)} | `;
		output += `Idle: ${chalk.blue(stats.idle)} | `;
		output += `Busy: ${chalk.yellow(stats.busy)} | `;
		output += `Error: ${chalk.red(stats.error)}\n`;
		output += `  Average Health: ${this.getHealthDisplay(stats.avgHealth)}\n`;
		output += `  Average Workload: ${formatPercentage(stats.avgWorkload)}\n\n`;

		// Pattern breakdown
		output += chalk.bold("By Pattern:\n");
		Object.entries(stats.byPattern).forEach(([pattern, count]) => {
			output += `  ${pattern.toUpperCase()}: ${count} agents\n`;
		});

		// Health status
		output += `\n${chalk.bold("Health Status:")}\n`;
		output += `  ${chalk.green("Healthy (≥80%):")} ${stats.healthy}\n`;
		output += `  ${chalk.yellow("Warning (50-79%):")} ${stats.warning}\n`;
		output += `  ${chalk.red("Critical (<50%):")} ${stats.critical}\n`;

		return output;
	}

	private static getStatusDisplay(status: string): string {
		const colors = {
			active: chalk.green,
			idle: chalk.blue,
			busy: chalk.yellow,
			error: chalk.red,
			offline: chalk.gray,
			initializing: chalk.cyan,
			terminating: chalk.magenta,
		};

		const color = colors[status as keyof typeof colors] || chalk.white;
		return color(status.toUpperCase());
	}

	private static getHealthDisplay(health: number): string {
		const percentage = Math.round(health * 100);
		let color = chalk.green;

		if (health < 0.3) color = chalk.red;
		else if (health < 0.7) color = chalk.yellow;

		return color(`${percentage}%`);
	}

	private static formatRelativeTime(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		if (diff < 60000) return "now";
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
		return `${Math.floor(diff / 86400000)}d`;
	}

	private static calculateStats(agents: UnifiedAgent[]) {
		const stats = {
			total: agents.length,
			active: 0,
			idle: 0,
			busy: 0,
			error: 0,
			healthy: 0,
			warning: 0,
			critical: 0,
			avgHealth: 0,
			avgWorkload: 0,
			byPattern: {} as Record<string, number>,
		};

		agents.forEach((agent) => {
			// Status counts
			switch (agent.status) {
				case "active":
					stats.active++;
					break;
				case "idle":
					stats.idle++;
					break;
				case "busy":
					stats.busy++;
					break;
				case "error":
					stats.error++;
					break;
			}

			// Health categories
			if (agent.health >= 0.8) stats.healthy++;
			else if (agent.health >= 0.5) stats.warning++;
			else stats.critical++;

			// Pattern counts
			stats.byPattern[agent.pattern] =
				(stats.byPattern[agent.pattern] || 0) + 1;

			// Averages
			stats.avgHealth += agent.health;
			stats.avgWorkload += agent.workload;
		});

		stats.avgHealth /= agents.length || 1;
		stats.avgWorkload /= agents.length || 1;

		return stats;
	}
}

// Main List Command Implementation
export async function createUnifiedListCommand(): Promise<Command> {
	const listCommand = new Command("list")
		.description(
			"Display all agents across all coordination patterns with comprehensive status"
		)
		.option(
			"-p, --pattern <pattern>",
			"Filter by coordination pattern (swarm, hive, sparc, unified)"
		)
		.option("-t, --type <type>", "Filter by agent type")
		.option("-s, --status <status>", "Filter by agent status")
		.option("--unhealthy", "Show only unhealthy agents (health < 70%)")
		.option("--json", "Output in JSON format")
		.option("--detailed", "Show detailed metrics and resource usage")
		.option(
			"--format <format>",
			"Output format (table, json, tree, dashboard)",
			"table"
		)
		.option(
			"--sort <field>",
			"Sort by field (name, type, status, health, workload, pattern)",
			"name"
		)
		.option("--no-cache", "Disable caching for real-time data")
		.action(async (options: any) => {
			try {
				// Initialize systems
				const logger = new Logger({
					level: "info",
					format: "text",
					destination: "console",
				});

				const eventBus = EventBus.getInstance();

				const memorySystem = new DistributedMemorySystem(
					{ namespace: "unified-agents" },
					logger,
					eventBus
				);
				await memorySystem.initialize();

				const aggregator = new AgentStatusAggregator(
					logger,
					eventBus,
					memorySystem
				);

				// Get agents with filters
				const agents = await aggregator.getAllAgents({
					pattern: options.pattern,
					type: options.type,
					status: options.status,
					unhealthy: options.unhealthy,
					useCache: !options.noCache,
				});

				// Sort agents
				agents.sort((a, b) => {
					switch (options.sort) {
						case "type":
							return a.type.localeCompare(b.type);
						case "status":
							return a.status.localeCompare(b.status);
						case "health":
							return b.health - a.health;
						case "workload":
							return b.workload - a.workload;
						case "pattern":
							return a.pattern.localeCompare(b.pattern);
						default:
							return a.name.localeCompare(b.name);
					}
				});

				// Output in requested format
				let output: string;
				switch (options.format) {
					case "json":
						output = OutputFormatter.formatJSON(agents, !options.json);
						break;
					case "tree":
						output = OutputFormatter.formatTree(agents);
						break;
					case "dashboard":
						output = OutputFormatter.formatDashboard(agents);
						break;
					default:
						output = OutputFormatter.formatTable(agents, options.detailed);
				}

				console.log(output);

				// Show summary unless in JSON mode
				if (options.format !== "json") {
					console.log(
						`\n${chalk.gray("Found")} ${chalk.bold(agents.length)} ${chalk.gray("agents across all patterns")}`
					);
				}
			} catch (error) {
				console.error(
					chalk.red("Error listing agents:"),
					error instanceof Error ? error.message : String(error)
				);
				process.exit(1);
			}
		});

	return listCommand;
}

// Export for integration
export { AgentStatusAggregator, OutputFormatter };
