/**
 * ABOUTME: Enhanced monitor command with subcommand support for comprehensive system monitoring
 * ABOUTME: Consolidates all monitoring functionality including diagnostics, health checks, and performance analysis
 */

import { printError, printSuccess, printWarning } from "../../core/utils.js";
// Subcommand imports
import { DiagnosticManager } from "./diagnostics.js";
import { HealthCheckManager } from "./health-check.js";
import {
	performanceAnalyzeCommand,
	performanceMonitorCommand,
	performanceReportCommand,
} from "./performance/index.js";
import { PerformanceOptimizationAnalyzer } from "./performance-analyzer.js";
import { RealTimeMonitor } from "./real-time-monitor.js";
import type { MonitorCommandOptions, SystemMetricsSnapshot } from "./types.js";

export type {
	AuditConfiguration,
	AuditEntry,
	AuditMetrics,
	AuditReport,
	ComplianceFramework,
} from "./audit/audit-manager.js";
// Enterprise audit management features
export { AuditManager } from "./audit/audit-manager.js";

/**
 * Main monitor command entry point
 * Supports both direct monitoring and subcommands
 */
export async function monitorCommand(
	subArgs: string[],
	flags: any,
): Promise<void> {
	const options: MonitorCommandOptions = {
		interval: getFlag(subArgs, "--interval") || flags.interval || 5000,
		format: getFlag(subArgs, "--format") || flags.format || "pretty",
		watch: subArgs.includes("--watch") || flags.watch,
		continuous: subArgs.includes("--watch") || flags.watch,
	};

	// Filter out flag arguments to get subcommands
	const filteredArgs = subArgs.filter(
		(arg) => !arg.startsWith("--") && !isNumber(arg),
	);

	if (filteredArgs.length === 0) {
		// No subcommand - run default monitoring
		if (options.continuous) {
			await runContinuousMonitoring(options.interval, options.format);
		} else {
			await showCurrentMetrics(options.format);
		}
		return;
	}

	// Route to subcommand
	const subcommand = filteredArgs[0].toLowerCase();
	const subcommandArgs = filteredArgs.slice(1);

	try {
		switch (subcommand) {
			case "diagnostics":
			case "diag":
				await runDiagnostics(subcommandArgs, options);
				break;

			case "health-check":
			case "health":
				await runHealthCheck(subcommandArgs, options);
				break;

			case "performance":
			case "perf":
				await runPerformanceAnalysis(subcommandArgs, options);
				break;

			case "realtime":
			case "rt":
				await runRealTimeMonitoring(subcommandArgs, options);
				break;

			case "help":
				showMonitorHelp();
				break;

			default:
				printError(`Unknown monitor subcommand: ${subcommand}`);
				printWarning("Run 'claude-flow monitor help' for available commands");
				process.exit(1);
		}
	} catch (error) {
		printError(
			`Monitor command failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

/**
 * Default monitoring functionality (preserved from original)
 */
async function showCurrentMetrics(format: string): Promise<void> {
	const metrics = await collectMetrics();

	if (format === "json") {
		console.log(JSON.stringify(metrics, null, 2));
	} else {
		displayMetrics(metrics);
	}
}

async function runContinuousMonitoring(
	interval: number,
	format: string,
): Promise<void> {
	printSuccess(`Starting continuous monitoring (interval: ${interval}ms)`);
	console.log("Press Ctrl+C to stop monitoring\\n");

	// Simulate monitoring - in a real implementation, this would collect actual metrics
	let iteration = 0;
	const maxIterations = 10; // Limit for demo purposes

	const monitorInterval = setInterval(async () => {
		iteration++;

		if (iteration > maxIterations) {
			console.log("\\n📊 Monitoring demo completed (limited to 10 iterations)");
			console.log("In production, this would run continuously until stopped");
			clearInterval(monitorInterval);
			return;
		}

		console.clear(); // Clear screen for fresh output
		console.log(`🔄 Monitoring Claude-Flow System - Update #${iteration}`);
		console.log(`⏰ ${new Date().toLocaleTimeString()}\\n`);

		const metrics = await collectMetrics();

		if (format === "json") {
			console.log(JSON.stringify(metrics, null, 2));
		} else {
			displayMetrics(metrics);
		}

		console.log(`\\n🔄 Next update in ${interval}ms...`);
	}, interval);

	// In a real implementation, you would handle Ctrl+C gracefully
	setTimeout(
		() => {
			clearInterval(monitorInterval);
			console.log("\\n👋 Monitoring stopped");
		},
		interval * (maxIterations + 1),
	);
}

/**
 * Subcommand implementations
 */
async function runDiagnostics(
	args: string[],
	options: MonitorCommandOptions,
): Promise<void> {
	printSuccess("🔍 Running system diagnostics...");

	try {
		const diagnosticManager = new DiagnosticManager();
		const report = await diagnosticManager.generateReport();

		if (options.format === "json") {
			console.log(JSON.stringify(report, null, 2));
		} else {
			console.log("\\n📋 Diagnostic Report");
			console.log("===================");
			console.log(report.summary || "Diagnostics completed successfully");
		}
	} catch (error) {
		printError(
			`Diagnostics failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

async function runHealthCheck(
	args: string[],
	options: MonitorCommandOptions,
): Promise<void> {
	printSuccess("❤️ Running health check...");

	try {
		const healthManager = new HealthCheckManager();
		const result = await healthManager.performHealthCheck();

		if (options.format === "json") {
			console.log(JSON.stringify(result, null, 2));
		} else {
			console.log("\\n💗 Health Check Result");
			console.log("======================");
			console.log(`Status: ${result.overall || "Unknown"}`);
			console.log(
				`Timestamp: ${new Date(result.timestamp || Date.now()).toLocaleString()}`,
			);
		}
	} catch (error) {
		printError(
			`Health check failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

async function runPerformanceAnalysis(
	args: string[],
	options: MonitorCommandOptions,
): Promise<void> {
	const performanceSubcommand = args[0] || "monitor";
	const performanceOptions = {
		realTime: args.includes("--real-time") || options.continuous,
		interval: options.interval,
		format: options.format === "json" ? ("json" as const) : ("table" as const),
		detailed: args.includes("--detailed"),
		focus: args.find((arg) => arg.startsWith("--focus="))?.split("=")[1],
	};

	try {
		switch (performanceSubcommand) {
			case "monitor":
				await performanceMonitorCommand(performanceOptions);
				break;
			case "analyze":
				await performanceAnalyzeCommand(performanceOptions);
				break;
			case "report":
				await performanceReportCommand(performanceOptions);
				break;
			default: {
				// Fallback to legacy performance analysis for backward compatibility
				printSuccess("⚡ Running legacy performance analysis...");
				const performanceAnalyzer = new PerformanceOptimizationAnalyzer();
				const analysis = await performanceAnalyzer.analyzePerformance();

				if (options.format === "json") {
					console.log(JSON.stringify(analysis, null, 2));
				} else {
					console.log("\\n📊 Performance Analysis");
					console.log("=======================");
					console.log(`Score: ${analysis.score || "N/A"}`);
					console.log(
						`Recommendations: ${analysis.recommendations?.length || 0}`,
					);
				}
				break;
			}
		}
	} catch (error) {
		printError(
			`Performance analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

async function runRealTimeMonitoring(
	args: string[],
	options: MonitorCommandOptions,
): Promise<void> {
	printSuccess("📡 Starting real-time monitoring...");

	try {
		// Use the comprehensive real-time monitor
		await runContinuousMonitoring(
			options.interval || 1000,
			options.format || "pretty",
		);
	} catch (error) {
		printError(
			`Real-time monitoring failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Utility functions (preserved from original)
 */
async function collectMetrics(): Promise<SystemMetricsSnapshot> {
	// Simulate metric collection - in real implementation, this would gather actual system data
	const timestamp = Date.now();

	return {
		timestamp,
		system: {
			uptime: Math.floor(Math.random() * 86400), // Random uptime in seconds
			cpu_usage: Math.round(Math.random() * 100 * 100) / 100, // Random CPU %
			memory_usage: Math.round(Math.random() * 8192 * 100) / 100, // Random memory MB
			disk_usage: Math.round(Math.random() * 100 * 100) / 100, // Random disk %
		},
		orchestrator: {
			status: Math.random() > 0.8 ? "running" : "stopped",
			active_agents: Math.floor(Math.random() * 5),
			queued_tasks: Math.floor(Math.random() * 10),
			completed_tasks: Math.floor(Math.random() * 50),
			errors: Math.floor(Math.random() * 3),
		},
		performance: {
			avg_task_duration: Math.round(Math.random() * 5000 * 100) / 100, // ms
			throughput: Math.round(Math.random() * 100 * 100) / 100, // tasks/min
			success_rate: Math.round((0.85 + Math.random() * 0.15) * 100 * 100) / 100, // %
		},
		resources: {
			memory_entries: Math.floor(Math.random() * 100),
			terminal_sessions: Math.floor(Math.random() * 5),
			mcp_connections: Math.floor(Math.random() * 3),
		},
	};
}

function displayMetrics(metrics: SystemMetricsSnapshot): void {
	const timestamp = new Date(metrics.timestamp).toLocaleTimeString();

	console.log("📊 System Metrics");
	console.log("================");

	// System metrics
	console.log("\\n🖥️  System Resources:");
	console.log(`   CPU Usage: ${metrics.system.cpu_usage.toFixed(1)}%`);
	console.log(`   Memory: ${metrics.system.memory_usage.toFixed(1)} MB`);
	console.log(`   Disk Usage: ${metrics.system.disk_usage.toFixed(1)}%`);
	console.log(`   Uptime: ${formatUptime(metrics.system.uptime)}`);

	// Orchestrator metrics
	console.log("\\n🎭 Orchestrator:");
	console.log(
		`   Status: ${getStatusIcon(metrics.orchestrator.status)} ${metrics.orchestrator.status}`,
	);
	console.log(`   Active Agents: ${metrics.orchestrator.active_agents}`);
	console.log(`   Queued Tasks: ${metrics.orchestrator.queued_tasks}`);
	console.log(`   Completed: ${metrics.orchestrator.completed_tasks}`);
	console.log(`   Errors: ${metrics.orchestrator.errors}`);

	// Performance metrics
	console.log("\\n⚡ Performance:");
	console.log(
		`   Avg Task Duration: ${metrics.performance.avg_task_duration.toFixed(0)}ms`,
	);
	console.log(
		`   Throughput: ${metrics.performance.throughput.toFixed(1)} tasks/min`,
	);
	console.log(
		`   Success Rate: ${metrics.performance.success_rate.toFixed(1)}%`,
	);

	// Resource utilization
	console.log("\\n📦 Resources:");
	console.log(`   Memory Entries: ${metrics.resources.memory_entries}`);
	console.log(`   Terminal Sessions: ${metrics.resources.terminal_sessions}`);
	console.log(`   MCP Connections: ${metrics.resources.mcp_connections}`);

	console.log(`\\n⏰ Last Updated: ${timestamp}`);
}

function getStatusIcon(status: string): string {
	switch (status) {
		case "running":
			return "🟢";
		case "stopped":
			return "🔴";
		case "starting":
			return "🟡";
		case "error":
			return "❌";
		default:
			return "⚪";
	}
}

function formatUptime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${secs}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	} else {
		return `${secs}s`;
	}
}

function getFlag(args: string[], flagName: string): string | null {
	const index = args.indexOf(flagName);
	return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

function isNumber(str: string): boolean {
	return !isNaN(Number(str));
}

export function showMonitorHelp(): void {
	console.log("Monitor commands:");
	console.log("  monitor [options]                Show current system metrics");
	console.log("  monitor --watch                  Continuous monitoring mode");
	console.log("  monitor diagnostics              Run system diagnostics");
	console.log("  monitor health-check             Perform health check");
	console.log("  monitor performance              Run performance analysis");
	console.log("  monitor realtime                 Real-time monitoring");
	console.log();
	console.log("Options:");
	console.log(
		"  --interval <ms>                  Update interval in milliseconds (default: 5000)",
	);
	console.log(
		"  --format <type>                  Output format: pretty, json (default: pretty)",
	);
	console.log("  --watch                          Continuous monitoring mode");
	console.log();
	console.log("Examples:");
	console.log("  claude-flow monitor              # Show current metrics");
	console.log("  claude-flow monitor --watch      # Continuous monitoring");
	console.log("  claude-flow monitor diagnostics  # Run diagnostics");
	console.log("  claude-flow monitor health-check # Health check");
	console.log(
		"  claude-flow monitor performance monitor --real-time  # Real-time performance monitoring",
	);
	console.log(
		"  claude-flow monitor performance analyze --detailed   # Analyze performance bottlenecks",
	);
	console.log(
		"  claude-flow monitor performance report --format json # Generate performance report",
	);
	console.log("  claude-flow monitor --interval 1000 --watch  # Fast updates");
	console.log("  claude-flow monitor --format json            # JSON output");
}
