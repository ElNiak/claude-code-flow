/**
 * MCP Monitoring and Diagnostics Dashboard
 *
 * Real-time monitoring and diagnostic tools for MCP deadlock detection,
 * performance tracking, and system health monitoring
 */

import { EventEmitter } from "events";
import { loadavg } from "os";
import { MCPDeadlockPreventionSystem } from "./deadlock-prevention-system.js";
import { MCPHealthChecker, SafeMCPOperations } from "./mcp-deadlock-config.js";

// ===== MONITORING DASHBOARD =====

export class MCPMonitoringDashboard {
	private readonly eventEmitter: EventEmitter;
	private readonly deadlockSystem: MCPDeadlockPreventionSystem;
	private readonly healthChecker: MCPHealthChecker;
	private readonly metrics: Map<number, any>;
	private readonly alerts: Array<any>;
	private monitoringInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.eventEmitter = new EventEmitter();
		this.deadlockSystem = new MCPDeadlockPreventionSystem();
		this.healthChecker = new MCPHealthChecker();
		this.metrics = new Map();
		this.alerts = [];

		this.setupEventHandlers();
	}

	// ===== DASHBOARD INITIALIZATION =====

	startMonitoring(intervalMs: number = 30000): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}

		this.monitoringInterval = setInterval(async () => {
			await this.collectMetrics();
			await this.performHealthChecks();
			await this.detectAnomalies();
			this.updateDashboard();
		}, intervalMs);

		console.log("📊 MCP Monitoring Dashboard started");
		this.eventEmitter.emit("monitoring_started");
	}

	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}

		console.log("⏹️ MCP Monitoring Dashboard stopped");
		this.eventEmitter.emit("monitoring_stopped");
	}

	// ===== METRICS COLLECTION =====

	private async collectMetrics(): Promise<void> {
		const timestamp = Date.now();

		// Collect system health metrics
		const systemHealth = this.deadlockSystem.getSystemHealth();

		// Collect performance metrics
		const performanceMetrics = await this.collectPerformanceMetrics();

		// Collect resource utilization
		const resourceMetrics = await this.collectResourceMetrics();

		// Collect deadlock detection metrics
		const deadlockMetrics = await this.collectDeadlockMetrics();

		const allMetrics = {
			timestamp,
			systemHealth,
			performance: performanceMetrics,
			resources: resourceMetrics,
			deadlocks: deadlockMetrics,
		};

		this.metrics.set(timestamp, allMetrics);

		// Keep only last 100 metric snapshots
		if (this.metrics.size > 100) {
			const oldestKey = Math.min(...Array.from(this.metrics.keys()));
			this.metrics.delete(oldestKey);
		}

		this.eventEmitter.emit("metrics_collected", allMetrics);
	}

	private async collectPerformanceMetrics(): Promise<any> {
		const servers = [
			"claude-flow",
			"serena",
			"context7",
			"perplexity",
			"sequential-thinking",
		];
		const performanceData = new Map();

		for (const serverId of servers) {
			try {
				const startTime = Date.now();
				await this.performLightweightHealthCheck(serverId);
				const responseTime = Date.now() - startTime;

				performanceData.set(serverId, {
					responseTime,
					status: "healthy",
					lastCheck: new Date().toISOString(),
				});
			} catch (error) {
				performanceData.set(serverId, {
					responseTime: null,
					status: "unhealthy",
					error: error instanceof Error ? error.message : String(error),
					lastCheck: new Date().toISOString(),
				});
			}
		}

		return Object.fromEntries(performanceData);
	}

	private async collectResourceMetrics(): Promise<any> {
		return {
			memory: {
				used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
				total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
				external: process.memoryUsage().external / 1024 / 1024, // MB
			},
			cpu: {
				usage: process.cpuUsage(),
				loadAverage: process.platform === "darwin" ? loadavg() : [0, 0, 0],
			},
			connections: {
				active: this.getActiveConnections(),
				total: this.getTotalConnections(),
			},
		};
	}

	private async collectDeadlockMetrics(): Promise<any> {
		const systemHealth = this.deadlockSystem.getSystemHealth();

		return {
			activeDeadlocks: systemHealth.deadlocks?.length || 0,
			deadlockHistory: this.getDeadlockHistory(),
			riskFactors: this.calculateRiskFactors(),
			preventionStats: this.getPreventionStats(),
		};
	}

	// ===== HEALTH CHECK OPERATIONS =====

	private async performHealthChecks(): Promise<void> {
		try {
			const health = await this.healthChecker.performHealthChecks();

			if (health.overall === "poor") {
				this.raiseAlert("system_health", "System health is poor", "high");
			} else if (health.overall === "fair") {
				this.raiseAlert("system_health", "System health is fair", "medium");
			}

			this.eventEmitter.emit("health_check_completed", health);
		} catch (error) {
			this.raiseAlert(
				"health_check_failed",
				`Health check failed: ${error instanceof Error ? error.message : String(error)}`,
				"high"
			);
		}
	}

	private async performLightweightHealthCheck(serverId: string): Promise<void> {
		// Lightweight health check that doesn't consume many resources
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Health check timeout for ${serverId}`));
			}, 5000);

			// Simulate quick health check
			setTimeout(
				() => {
					clearTimeout(timeout);
					resolve();
				},
				Math.random() * 1000 + 100
			);
		});
	}

	// ===== ANOMALY DETECTION =====

	private async detectAnomalies(): Promise<void> {
		const recentMetrics = this.getRecentMetrics(5); // Last 5 snapshots

		if (recentMetrics.length < 2) return;

		// Check for response time anomalies
		this.detectResponseTimeAnomalies(recentMetrics);

		// Check for resource usage anomalies
		this.detectResourceAnomalies(recentMetrics);

		// Check for deadlock risk increases
		this.detectDeadlockRiskAnomalies(recentMetrics);

		// Check for pattern anomalies
		this.detectPatternAnomalies(recentMetrics);
	}

	private detectResponseTimeAnomalies(metrics: any[]): void {
		const servers = [
			"claude-flow",
			"serena",
			"context7",
			"perplexity",
			"sequential-thinking",
		];

		for (const serverId of servers) {
			const responseTimes = metrics
				.map((m) => m.performance[serverId]?.responseTime)
				.filter((rt) => rt !== null && rt !== undefined);

			if (responseTimes.length < 2) continue;

			const average =
				responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
			const latest = responseTimes[responseTimes.length - 1];

			if (latest > average * 2) {
				this.raiseAlert(
					"response_time_anomaly",
					`${serverId} response time spike: ${latest}ms (avg: ${average.toFixed(0)}ms)`,
					"medium"
				);
			}
		}
	}

	private detectResourceAnomalies(metrics: any[]): void {
		const memoryUsages = metrics.map((m) => m.resources.memory.used);
		const latest = memoryUsages[memoryUsages.length - 1];
		const previous = memoryUsages[memoryUsages.length - 2];

		if (latest > previous * 1.5) {
			this.raiseAlert(
				"memory_spike",
				`Memory usage spike: ${latest.toFixed(1)}MB (was ${previous.toFixed(1)}MB)`,
				"medium"
			);
		}

		if (latest > 512) {
			// 512MB threshold
			this.raiseAlert(
				"high_memory_usage",
				`High memory usage: ${latest.toFixed(1)}MB`,
				"high"
			);
		}
	}

	private detectDeadlockRiskAnomalies(metrics: any[]): void {
		const deadlockCounts = metrics.map((m) => m.deadlocks.activeDeadlocks);
		const latest = deadlockCounts[deadlockCounts.length - 1];

		if (latest > 0) {
			this.raiseAlert(
				"active_deadlocks",
				`Active deadlocks detected: ${latest}`,
				"critical"
			);
		}

		const riskFactors = metrics.map((m) => m.deadlocks.riskFactors);
		const latestRisk = riskFactors[riskFactors.length - 1];

		if (latestRisk > 0.7) {
			this.raiseAlert(
				"high_deadlock_risk",
				`High deadlock risk: ${(latestRisk * 100).toFixed(1)}%`,
				"high"
			);
		}
	}

	private detectPatternAnomalies(metrics: any[]): void {
		// Detect unusual patterns in system behavior
		const patterns = {
			healthDegradation: this.detectHealthDegradation(metrics),
			performanceSpikes: this.detectPerformanceSpikes(metrics),
			resourceLeaks: this.detectResourceLeaks(metrics),
		};

		for (const [pattern, detected] of Object.entries(patterns)) {
			if (detected) {
				this.raiseAlert(
					"pattern_anomaly",
					`Pattern anomaly detected: ${pattern}`,
					"medium"
				);
			}
		}
	}

	// ===== ALERT MANAGEMENT =====

	private raiseAlert(
		type: string,
		message: string,
		severity: "low" | "medium" | "high" | "critical"
	): void {
		const alert = {
			id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			type,
			message,
			severity,
			timestamp: new Date().toISOString(),
			status: "active",
		};

		this.alerts.push(alert);

		// Keep only last 50 alerts
		if (this.alerts.length > 50) {
			this.alerts.shift();
		}

		this.eventEmitter.emit("alert_raised", alert);

		// Log critical alerts immediately
		if (severity === "critical") {
			console.error(`🚨 CRITICAL ALERT: ${message}`);
		} else if (severity === "high") {
			console.warn(`⚠️ HIGH ALERT: ${message}`);
		}
	}

	// ===== DASHBOARD DISPLAY =====

	private updateDashboard(): void {
		const latest = this.getLatestMetrics();
		if (!latest) return;

		const dashboard = this.generateDashboardDisplay(latest);
		this.eventEmitter.emit("dashboard_updated", dashboard);
	}

	generateDashboardDisplay(metrics?: any): string {
		const latest = metrics || this.getLatestMetrics();
		if (!latest) return "No metrics available";

		let dashboard = "\n📊 MCP MONITORING DASHBOARD\n";
		dashboard += "============================\n";
		dashboard += `Last Updated: ${new Date(latest.timestamp).toLocaleString()}\n\n`;

		// System Health Overview
		dashboard += "🏥 SYSTEM HEALTH\n";
		dashboard += "----------------\n";
		dashboard += `Overall Status: ${this.getSystemStatusEmoji(latest.systemHealth)} ${latest.systemHealth?.overall || "Unknown"}\n`;
		dashboard += `Active Deadlocks: ${latest.deadlocks?.activeDeadlocks || 0}\n`;
		dashboard += `Deadlock Risk: ${((latest.deadlocks?.riskFactors || 0) * 100).toFixed(1)}%\n\n`;

		// Performance Overview
		dashboard += "⚡ PERFORMANCE METRICS\n";
		dashboard += "----------------------\n";
		const servers = [
			"claude-flow",
			"serena",
			"context7",
			"perplexity",
			"sequential-thinking",
		];
		for (const serverId of servers) {
			const perf = latest.performance[serverId];
			if (perf) {
				const statusEmoji = perf.status === "healthy" ? "✅" : "❌";
				const responseTime = perf.responseTime
					? `${perf.responseTime}ms`
					: "N/A";
				dashboard += `${statusEmoji} ${serverId}: ${responseTime}\n`;
			}
		}
		dashboard += "\n";

		// Resource Usage
		dashboard += "💾 RESOURCE USAGE\n";
		dashboard += "-----------------\n";
		const memory = latest.resources.memory;
		const memoryPercent = ((memory.used / memory.total) * 100).toFixed(1);
		dashboard += `Memory: ${memory.used.toFixed(1)}MB / ${memory.total.toFixed(1)}MB (${memoryPercent}%)\n`;
		dashboard += `Active Connections: ${latest.resources.connections.active}\n`;
		dashboard += `Total Connections: ${latest.resources.connections.total}\n\n`;

		// Recent Alerts
		dashboard += "🚨 RECENT ALERTS\n";
		dashboard += "----------------\n";
		const recentAlerts = this.alerts.slice(-5);
		if (recentAlerts.length === 0) {
			dashboard += "No recent alerts ✅\n";
		} else {
			for (const alert of recentAlerts) {
				const severityEmoji = this.getSeverityEmoji(alert.severity);
				dashboard += `${severityEmoji} ${alert.message}\n`;
			}
		}
		dashboard += "\n";

		// Recommendations
		dashboard += "💡 RECOMMENDATIONS\n";
		dashboard += "-------------------\n";
		dashboard += this.generateRecommendations(latest);

		return dashboard;
	}

	private generateRecommendations(metrics: any): string {
		const recommendations = [];

		// Memory recommendations
		if (metrics.resources.memory.used > 256) {
			recommendations.push(
				"• Consider optimizing memory usage or increasing available memory"
			);
		}

		// Performance recommendations
		const slowServers = Object.entries(metrics.performance)
			.filter(
				([_, perf]: [string, any]) =>
					perf.responseTime && perf.responseTime > 5000
			)
			.map(([serverId, _]) => serverId);

		if (slowServers.length > 0) {
			recommendations.push(
				`• Investigate performance issues with: ${slowServers.join(", ")}`
			);
		}

		// Deadlock recommendations
		if (metrics.deadlocks.activeDeadlocks > 0) {
			recommendations.push(
				"• Active deadlocks detected - review resource allocation order"
			);
		}

		if (metrics.deadlocks.riskFactors > 0.5) {
			recommendations.push(
				"• High deadlock risk - consider reducing concurrent operations"
			);
		}

		if (recommendations.length === 0) {
			return "System running optimally ✅\n";
		}

		return recommendations.join("\n") + "\n";
	}

	// ===== UTILITY METHODS =====

	private getLatestMetrics(): any {
		const keys = Array.from(this.metrics.keys());
		if (keys.length === 0) return null;

		const latestKey = Math.max(...keys);
		return this.metrics.get(latestKey);
	}

	private getRecentMetrics(count: number): any[] {
		const keys = Array.from(this.metrics.keys()).sort((a, b) => b - a);
		return keys.slice(0, count).map((key) => this.metrics.get(key));
	}

	private getSystemStatusEmoji(health: any): string {
		if (!health) return "❓";

		switch (health.overall) {
			case "excellent":
				return "🟢";
			case "good":
				return "🟡";
			case "fair":
				return "🟠";
			case "poor":
				return "🔴";
			default:
				return "❓";
		}
	}

	private getSeverityEmoji(severity: string): string {
		switch (severity) {
			case "critical":
				return "🚨";
			case "high":
				return "⚠️";
			case "medium":
				return "💡";
			case "low":
				return "ℹ️";
			default:
				return "❓";
		}
	}

	private getActiveConnections(): number {
		// Placeholder - in real implementation, would track actual connections
		return Math.floor(Math.random() * 20) + 5;
	}

	private getTotalConnections(): number {
		// Placeholder - in real implementation, would track actual connections
		return Math.floor(Math.random() * 50) + 20;
	}

	private getDeadlockHistory(): any[] {
		// Placeholder - in real implementation, would track deadlock history
		return [];
	}

	private calculateRiskFactors(): number {
		// Placeholder - in real implementation, would calculate actual risk
		return Math.random() * 0.3;
	}

	private getPreventionStats(): any {
		// Placeholder - in real implementation, would track prevention stats
		return {
			prevented: Math.floor(Math.random() * 10),
			resolved: Math.floor(Math.random() * 5),
		};
	}

	private detectHealthDegradation(metrics: any[]): boolean {
		// Simple health degradation detection
		const healthScores = metrics.map((m) => {
			const health = m.systemHealth?.overall;
			switch (health) {
				case "excellent":
					return 4;
				case "good":
					return 3;
				case "fair":
					return 2;
				case "poor":
					return 1;
				default:
					return 0;
			}
		});

		if (healthScores.length < 3) return false;

		const recent = healthScores.slice(-3);
		return recent.every((score, i) => i === 0 || score <= recent[i - 1]);
	}

	private detectPerformanceSpikes(metrics: any[]): boolean {
		const avgResponseTimes = metrics.map((m) => {
			const responses = Object.values(m.performance)
				.map((p: any) => p.responseTime)
				.filter((rt) => rt !== null && rt !== undefined);

			return responses.length > 0
				? responses.reduce((a: number, b: number) => a + b, 0) /
						responses.length
				: 0;
		});

		if (avgResponseTimes.length < 2) return false;

		const latest = avgResponseTimes[avgResponseTimes.length - 1];
		const previous = avgResponseTimes[avgResponseTimes.length - 2];

		return latest > previous * 2;
	}

	private detectResourceLeaks(metrics: any[]): boolean {
		const memoryUsages = metrics.map((m) => m.resources.memory.used);

		if (memoryUsages.length < 3) return false;

		// Check if memory usage is consistently increasing
		return memoryUsages
			.slice(-3)
			.every(
				(usage, i) =>
					i === 0 || usage > memoryUsages[memoryUsages.length - 3 + i - 1]
			);
	}

	private setupEventHandlers(): void {
		this.eventEmitter.on("alert_raised", (alert) => {
			// Could integrate with external alerting systems
			console.log(`📢 Alert raised: ${alert.message}`);
		});

		this.eventEmitter.on("metrics_collected", (metrics) => {
			// Could send metrics to external monitoring systems
			console.log(
				"📊 Metrics collected at",
				new Date(metrics.timestamp).toLocaleTimeString()
			);
		});
	}

	// ===== PUBLIC API =====

	getCurrentStatus(): any {
		return {
			isMonitoring: this.monitoringInterval !== null,
			lastUpdate: this.getLatestMetrics()?.timestamp,
			alertCount: this.alerts.length,
			activeAlerts: this.alerts.filter((a) => a.status === "active").length,
		};
	}

	getAlerts(severity?: string): any[] {
		return severity
			? this.alerts.filter((a) => a.severity === severity)
			: this.alerts;
	}

	acknowledgeAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.status = "acknowledged";
			return true;
		}
		return false;
	}

	exportMetrics(): any {
		return {
			metrics: Object.fromEntries(this.metrics),
			alerts: this.alerts,
			exportedAt: new Date().toISOString(),
		};
	}

	// Event subscription methods
	on(event: string, listener: (...args: any[]) => void): void {
		this.eventEmitter.on(event, listener);
	}

	off(event: string, listener: (...args: any[]) => void): void {
		this.eventEmitter.off(event, listener);
	}
}

// ===== COMMAND LINE INTERFACE =====

export class MCPDashboardCLI {
	private dashboard: MCPMonitoringDashboard;

	constructor() {
		this.dashboard = new MCPMonitoringDashboard();
		this.setupEventHandlers();
	}

	async startInteractiveDashboard(): Promise<void> {
		console.log("🚀 Starting MCP Interactive Dashboard...");

		this.dashboard.startMonitoring(10000); // Update every 10 seconds

		// Display dashboard every 30 seconds
		const displayInterval = setInterval(() => {
			console.clear();
			console.log(this.dashboard.generateDashboardDisplay());
		}, 30000);

		// Handle process termination
		process.on("SIGINT", () => {
			console.log("\n👋 Shutting down MCP Dashboard...");
			clearInterval(displayInterval);
			this.dashboard.stopMonitoring();
			process.exit(0);
		});

		// Initial display
		console.log(this.dashboard.generateDashboardDisplay());
		console.log("Press Ctrl+C to exit");
	}

	private setupEventHandlers(): void {
		this.dashboard.on("alert_raised", (alert) => {
			if (alert.severity === "critical" || alert.severity === "high") {
				console.log(`\n🚨 ${alert.message}`);
			}
		});
	}
}

export default MCPMonitoringDashboard;
