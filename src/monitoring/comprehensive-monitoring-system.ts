/**
 * Comprehensive Monitoring and Alerting System
 * SystemMonitor Agent Implementation
 */

import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { IEventBus } from "../core/event-bus.js";
import type { ILogger } from "../core/logger.js";
import { getErrorMessage } from "../utils/error-handler.js";

export interface SystemMonitorConfig {
	metricsInterval: number;
	alertCheckInterval: number;
	healthCheckInterval: number;
	retentionPeriod: number;
	alertThresholds: AlertThresholds;
	dashboardConfig: DashboardConfig;
	alertChannels: AlertChannels;
	enableRealTimeMonitoring: boolean;
	enablePerformanceOptimization: boolean;
	enableProactiveAlerting: boolean;
	storageConfig: StorageConfig;
}

export interface AlertThresholds {
	cpu: { warning: number; critical: number };
	memory: { warning: number; critical: number };
	disk: { warning: number; critical: number };
	responseTime: { warning: number; critical: number };
	errorRate: { warning: number; critical: number };
	throughput: { warning: number; critical: number };
	queueDepth: { warning: number; critical: number };
	agentHealth: { warning: number; critical: number };
}

export interface DashboardConfig {
	enabled: boolean;
	refreshInterval: number;
	panels: DashboardPanel[];
	filters: Record<string, any>;
	customWidgets: CustomWidget[];
}

export interface AlertChannels {
	console: { enabled: boolean; level: string };
	file: { enabled: boolean; level: string; path: string };
	email: { enabled: boolean; level: string; smtp: any };
	webhook: { enabled: boolean; level: string; url: string };
	slack: { enabled: boolean; level: string; webhook: string };
	memory: { enabled: boolean; level: string; retention: string };
}

export interface StorageConfig {
	type: "memory" | "file" | "database";
	path?: string;
	maxSize: number;
	compression: boolean;
	backupInterval: number;
}

export interface SystemMetrics {
	timestamp: Date;
	system: {
		cpu: number;
		memory: number;
		disk: number;
		network: number;
		uptime: number;
	};
	application: {
		responseTime: number;
		throughput: number;
		errorRate: number;
		activeConnections: number;
		queueDepth: number;
	};
	agents: {
		total: number;
		active: number;
		idle: number;
		failed: number;
		averageHealth: number;
	};
	swarm: {
		utilization: number;
		efficiency: number;
		coordination: number;
		communication: number;
	};
}

export interface Alert {
	id: string;
	timestamp: Date;
	level: "info" | "warning" | "error" | "critical";
	category: "system" | "application" | "performance" | "security";
	source: string;
	message: string;
	details: Record<string, any>;
	threshold?: number;
	currentValue?: number;
	acknowledged: boolean;
	resolved: boolean;
	resolvedAt?: Date;
	acknowledgedBy?: string;
	escalationLevel: number;
	actions: string[];
}

export interface PerformanceMetrics {
	responseTime: {
		min: number;
		max: number;
		avg: number;
		p50: number;
		p95: number;
		p99: number;
	};
	throughput: {
		current: number;
		peak: number;
		average: number;
		trend: "up" | "down" | "stable";
	};
	errors: {
		total: number;
		rate: number;
		byType: Record<string, number>;
		recentErrors: Error[];
	};
	resources: {
		cpu: number;
		memory: number;
		disk: number;
		network: number;
	};
}

export interface HealthCheckResult {
	component: string;
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: Date;
	responseTime: number;
	details: Record<string, any>;
	lastError?: string;
}

export interface DashboardPanel {
	id: string;
	title: string;
	type: "line" | "bar" | "gauge" | "table" | "heatmap" | "stat";
	metrics: string[];
	size: { width: number; height: number };
	position: { x: number; y: number };
	config: Record<string, any>;
}

export interface CustomWidget {
	id: string;
	name: string;
	type: string;
	config: Record<string, any>;
	data: () => Promise<any>;
}

export interface MonitoringReport {
	timestamp: Date;
	period: string;
	summary: {
		overallHealth: "healthy" | "degraded" | "unhealthy";
		alertCount: number;
		criticalIssues: number;
		performanceScore: number;
		recommendations: string[];
	};
	metrics: SystemMetrics;
	performance: PerformanceMetrics;
	alerts: Alert[];
	healthChecks: HealthCheckResult[];
	trends: {
		responseTime: "improving" | "degrading" | "stable";
		throughput: "improving" | "degrading" | "stable";
		errorRate: "improving" | "degrading" | "stable";
		resourceUsage: "improving" | "degrading" | "stable";
	};
}

/**
 * Comprehensive Monitoring System
 * Provides real-time monitoring, alerting, and performance optimization
 */
export class ComprehensiveMonitoringSystem extends EventEmitter {
	private logger: ILogger;
	private eventBus: IEventBus;
	private config: SystemMonitorConfig;

	// Data Storage
	private metrics: SystemMetrics[] = [];
	private alerts: Alert[] = [];
	private healthChecks: HealthCheckResult[] = [];
	private performanceHistory: PerformanceMetrics[] = [];

	// Monitoring State
	private timers: Map<string, NodeJS.Timeout> = new Map();
	private alertRules: Map<string, any> = new Map();
	private dashboardData: Map<string, any> = new Map();
	private activeConnections: Set<string> = new Set();

	// Performance Tracking
	private requestMetrics: Map<string, any> = new Map();
	private responseTimes: number[] = [];
	private errorCounts: Map<string, number> = new Map();

	// Real-time Monitoring
	private realTimeSubscribers: Set<(data: any) => void> = new Set();
	private metricsBuffer: any[] = [];
	private alertQueue: Alert[] = [];

	constructor(
		logger: ILogger,
		eventBus: IEventBus,
		config: Partial<SystemMonitorConfig> = {}
	) {
		super();
		this.logger = logger;
		this.eventBus = eventBus;

		this.config = {
			metricsInterval: 5000,
			alertCheckInterval: 2000,
			healthCheckInterval: 30000,
			retentionPeriod: 86400000, // 24 hours
			alertThresholds: {
				cpu: { warning: 70, critical: 90 },
				memory: { warning: 80, critical: 95 },
				disk: { warning: 85, critical: 95 },
				responseTime: { warning: 5000, critical: 10000 },
				errorRate: { warning: 5, critical: 10 },
				throughput: { warning: 10, critical: 5 },
				queueDepth: { warning: 100, critical: 200 },
				agentHealth: { warning: 0.7, critical: 0.5 },
			},
			dashboardConfig: {
				enabled: true,
				refreshInterval: 5000,
				panels: [],
				filters: {},
				customWidgets: [],
			},
			alertChannels: {
				console: { enabled: true, level: "warning" },
				file: { enabled: true, level: "warning", path: "./logs/alerts.log" },
				email: { enabled: false, level: "critical", smtp: {} },
				webhook: { enabled: false, level: "critical", url: "" },
				slack: { enabled: false, level: "critical", webhook: "" },
				memory: { enabled: true, level: "info", retention: "24h" },
			},
			enableRealTimeMonitoring: true,
			enablePerformanceOptimization: true,
			enableProactiveAlerting: true,
			storageConfig: {
				type: "memory",
				maxSize: 1000000, // 1MB
				compression: false,
				backupInterval: 3600000, // 1 hour
			},
			...config,
		};

		this.setupEventHandlers();
		this.initializeDefaultAlertRules();
		this.initializeDashboard();
	}

	async initialize(): Promise<void> {
		this.logger.info("Initializing comprehensive monitoring system", {
			metricsInterval: this.config.metricsInterval,
			alerting: this.config.enableProactiveAlerting,
			realTime: this.config.enableRealTimeMonitoring,
		});

		// Start monitoring loops
		this.startMetricsCollection();
		this.startAlertProcessing();
		this.startHealthChecks();

		if (this.config.enableRealTimeMonitoring) {
			this.startRealTimeMonitoring();
		}

		if (this.config.enablePerformanceOptimization) {
			this.startPerformanceOptimization();
		}

		// Create output directory for logs
		await this.ensureLogDirectory();

		this.emit("monitoring:initialized");
		this.logger.info("Comprehensive monitoring system initialized");
	}

	async shutdown(): Promise<void> {
		this.logger.info("Shutting down comprehensive monitoring system");

		// Stop all timers
		for (const [name, timer] of this.timers) {
			clearInterval(timer);
			this.logger.debug(`Stopped timer: ${name}`);
		}
		this.timers.clear();

		// Generate final report
		await this.generateReport("shutdown");

		// Save metrics to file
		await this.saveMetricsToFile();

		this.emit("monitoring:shutdown");
		this.logger.info("Comprehensive monitoring system shutdown complete");
	}

	// === METRICS COLLECTION ===

	private startMetricsCollection(): void {
		const timer = setInterval(async () => {
			try {
				const metrics = await this.collectSystemMetrics();
				this.metrics.push(metrics);

				// Cleanup old metrics
				this.cleanupOldMetrics();

				// Buffer for real-time updates
				this.metricsBuffer.push(metrics);

				// Emit metrics event
				this.emit("metrics:collected", metrics);

				// Update dashboard
				this.updateDashboard(metrics);
			} catch (error) {
				this.logger.error("Failed to collect metrics", {
					error: getErrorMessage(error),
				});
			}
		}, this.config.metricsInterval);

		this.timers.set("metrics", timer);
		this.logger.info("Started metrics collection", {
			interval: this.config.metricsInterval,
		});
	}

	private async collectSystemMetrics(): Promise<SystemMetrics> {
		const startTime = performance.now();

		// System metrics
		const systemMetrics = await this.getSystemResourceMetrics();

		// Application metrics
		const applicationMetrics = await this.getApplicationMetrics();

		// Agent metrics
		const agentMetrics = await this.getAgentMetrics();

		// Swarm metrics
		const swarmMetrics = await this.getSwarmMetrics();

		const metrics: SystemMetrics = {
			timestamp: new Date(),
			system: systemMetrics,
			application: applicationMetrics,
			agents: agentMetrics,
			swarm: swarmMetrics,
		};

		const collectionTime = performance.now() - startTime;
		this.logger.debug("Metrics collected", {
			duration: collectionTime,
			metricsCount: Object.keys(metrics).length,
		});

		return metrics;
	}

	private async getSystemResourceMetrics(): Promise<any> {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		return {
			cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to percentage
			memory: (memUsage.heapUsed / memUsage.heapTotal) * 100,
			disk: await this.getDiskUsage(),
			network: await this.getNetworkUsage(),
			uptime: process.uptime() * 1000,
		};
	}

	private async getApplicationMetrics(): Promise<any> {
		const responseTime = this.calculateAverageResponseTime();
		const throughput = this.calculateThroughput();
		const errorRate = this.calculateErrorRate();

		return {
			responseTime,
			throughput,
			errorRate,
			activeConnections: this.activeConnections.size,
			queueDepth: this.getQueueDepth(),
		};
	}

	private async getAgentMetrics(): Promise<any> {
		// Get agent data from event bus or system integration
		const agentData = await this.getAgentData();

		return {
			total: agentData.total || 0,
			active: agentData.active || 0,
			idle: agentData.idle || 0,
			failed: agentData.failed || 0,
			averageHealth: agentData.averageHealth || 1.0,
		};
	}

	private async getSwarmMetrics(): Promise<any> {
		return {
			utilization: await this.calculateSwarmUtilization(),
			efficiency: await this.calculateSwarmEfficiency(),
			coordination: await this.calculateCoordinationMetrics(),
			communication: await this.calculateCommunicationMetrics(),
		};
	}

	// === ALERT PROCESSING ===

	private startAlertProcessing(): void {
		const timer = setInterval(async () => {
			try {
				await this.processAlerts();
				await this.sendQueuedAlerts();
			} catch (error) {
				this.logger.error("Failed to process alerts", {
					error: getErrorMessage(error),
				});
			}
		}, this.config.alertCheckInterval);

		this.timers.set("alerts", timer);
		this.logger.info("Started alert processing", {
			interval: this.config.alertCheckInterval,
		});
	}

	private async processAlerts(): Promise<void> {
		const currentMetrics = this.metrics[this.metrics.length - 1];
		if (!currentMetrics) return;

		// Check each alert rule
		for (const [ruleId, rule] of this.alertRules) {
			if (!rule.enabled) continue;

			const value = this.getMetricValue(currentMetrics, rule.metric);
			const threshold = rule.threshold;

			if (this.evaluateAlertCondition(value, rule.condition, threshold)) {
				await this.createAlert(rule, value, currentMetrics);
			}
		}
	}

	private async createAlert(
		rule: any,
		value: number,
		metrics: SystemMetrics
	): Promise<void> {
		const alert: Alert = {
			id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date(),
			level: rule.severity,
			category: rule.category,
			source: rule.source || "monitoring-system",
			message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
			details: {
				metric: rule.metric,
				value,
				threshold: rule.threshold,
				condition: rule.condition,
				metrics: metrics,
			},
			threshold: rule.threshold,
			currentValue: value,
			acknowledged: false,
			resolved: false,
			escalationLevel: 0,
			actions: rule.actions || [],
		};

		this.alerts.push(alert);
		this.alertQueue.push(alert);

		this.logger.warn("Alert created", {
			id: alert.id,
			level: alert.level,
			message: alert.message,
		});

		this.emit("alert:created", alert);
	}

	private async sendQueuedAlerts(): Promise<void> {
		if (this.alertQueue.length === 0) return;

		const alerts = [...this.alertQueue];
		this.alertQueue = [];

		for (const alert of alerts) {
			await this.sendAlert(alert);
		}
	}

	private async sendAlert(alert: Alert): Promise<void> {
		const channels = this.config.alertChannels;

		// Console alert
		if (
			channels.console.enabled &&
			this.shouldSendAlert(alert.level, channels.console.level)
		) {
			console.warn(`[ALERT] ${alert.level.toUpperCase()}: ${alert.message}`);
		}

		// File alert
		if (
			channels.file.enabled &&
			this.shouldSendAlert(alert.level, channels.file.level)
		) {
			await this.writeAlertToFile(alert);
		}

		// Memory alert
		if (
			channels.memory.enabled &&
			this.shouldSendAlert(alert.level, channels.memory.level)
		) {
			this.eventBus.emit("alert:memory", alert);
		}

		// Email alert (if configured)
		if (
			channels.email.enabled &&
			this.shouldSendAlert(alert.level, channels.email.level)
		) {
			await this.sendEmailAlert(alert);
		}

		// Webhook alert (if configured)
		if (
			channels.webhook.enabled &&
			this.shouldSendAlert(alert.level, channels.webhook.level)
		) {
			await this.sendWebhookAlert(alert);
		}

		// Slack alert (if configured)
		if (
			channels.slack.enabled &&
			this.shouldSendAlert(alert.level, channels.slack.level)
		) {
			await this.sendSlackAlert(alert);
		}
	}

	// === HEALTH CHECKS ===

	private startHealthChecks(): void {
		const timer = setInterval(async () => {
			try {
				await this.performHealthChecks();
			} catch (error) {
				this.logger.error("Failed to perform health checks", {
					error: getErrorMessage(error),
				});
			}
		}, this.config.healthCheckInterval);

		this.timers.set("health", timer);
		this.logger.info("Started health checks", {
			interval: this.config.healthCheckInterval,
		});
	}

	private async performHealthChecks(): Promise<void> {
		const components = [
			"orchestrator",
			"configManager",
			"memoryManager",
			"agentManager",
			"swarmCoordinator",
			"taskEngine",
			"mcpServer",
		];

		const results = await Promise.allSettled(
			components.map((component) => this.checkComponentHealth(component))
		);

		results.forEach((result, index) => {
			if (result.status === "fulfilled") {
				this.healthChecks.push(result.value);
			} else {
				this.healthChecks.push({
					component: components[index],
					status: "unhealthy",
					timestamp: new Date(),
					responseTime: 0,
					details: {},
					lastError: getErrorMessage(result.reason),
				});
			}
		});

		// Cleanup old health checks
		this.cleanupOldHealthChecks();

		this.emit("health:checks:completed", this.healthChecks);
	}

	private async checkComponentHealth(
		component: string
	): Promise<HealthCheckResult> {
		const startTime = performance.now();

		try {
			// Try to get component from system integration
			const systemIntegration = await this.getSystemIntegration();
			const componentInstance = systemIntegration?.getComponent(component);

			if (!componentInstance) {
				return {
					component,
					status: "unhealthy",
					timestamp: new Date(),
					responseTime: 0,
					details: {},
					lastError: "Component not found",
				};
			}

			// If component has health check method, use it
			let healthy = true;
			let details = {};

			if (
				typeof componentInstance === "object" &&
				"healthCheck" in componentInstance
			) {
				const healthResult = await componentInstance.healthCheck();
				healthy = healthResult.healthy;
				details = healthResult.details || {};
			}

			const responseTime = performance.now() - startTime;

			return {
				component,
				status: healthy ? "healthy" : "degraded",
				timestamp: new Date(),
				responseTime,
				details,
			};
		} catch (error) {
			return {
				component,
				status: "unhealthy",
				timestamp: new Date(),
				responseTime: performance.now() - startTime,
				details: {},
				lastError: getErrorMessage(error),
			};
		}
	}

	// === REAL-TIME MONITORING ===

	private startRealTimeMonitoring(): void {
		const timer = setInterval(() => {
			try {
				this.broadcastRealTimeData();
			} catch (error) {
				this.logger.error("Failed to broadcast real-time data", {
					error: getErrorMessage(error),
				});
			}
		}, 1000); // 1 second intervals

		this.timers.set("realtime", timer);
		this.logger.info("Started real-time monitoring");
	}

	private broadcastRealTimeData(): void {
		if (this.realTimeSubscribers.size === 0) return;

		const data = {
			timestamp: new Date(),
			metrics: this.metricsBuffer.splice(0), // Get and clear buffer
			alerts: this.alertQueue.slice(), // Copy alert queue
			health: this.getLatestHealthStatus(),
			performance: this.getLatestPerformanceMetrics(),
		};

		this.realTimeSubscribers.forEach((subscriber) => {
			try {
				subscriber(data);
			} catch (error) {
				this.logger.error("Failed to send real-time data to subscriber", {
					error: getErrorMessage(error),
				});
			}
		});
	}

	// === PERFORMANCE OPTIMIZATION ===

	private startPerformanceOptimization(): void {
		const timer = setInterval(async () => {
			try {
				await this.analyzePerformance();
				await this.generateOptimizationRecommendations();
			} catch (error) {
				this.logger.error("Failed to analyze performance", {
					error: getErrorMessage(error),
				});
			}
		}, 60000); // 1 minute intervals

		this.timers.set("optimization", timer);
		this.logger.info("Started performance optimization analysis");
	}

	private async analyzePerformance(): Promise<void> {
		const recentMetrics = this.metrics.slice(-10); // Last 10 metrics
		if (recentMetrics.length === 0) return;

		const performanceMetrics = this.calculatePerformanceMetrics(recentMetrics);
		this.performanceHistory.push(performanceMetrics);

		// Keep only recent history
		if (this.performanceHistory.length > 100) {
			this.performanceHistory.shift();
		}

		this.emit("performance:analyzed", performanceMetrics);
	}

	private calculatePerformanceMetrics(
		metrics: SystemMetrics[]
	): PerformanceMetrics {
		const responseTimes = this.responseTimes.slice(-100); // Last 100 response times
		const sortedTimes = [...responseTimes].sort((a, b) => a - b);

		return {
			responseTime: {
				min: sortedTimes[0] || 0,
				max: sortedTimes[sortedTimes.length - 1] || 0,
				avg:
					responseTimes.reduce((sum, time) => sum + time, 0) /
						responseTimes.length || 0,
				p50: this.getPercentile(sortedTimes, 0.5),
				p95: this.getPercentile(sortedTimes, 0.95),
				p99: this.getPercentile(sortedTimes, 0.99),
			},
			throughput: {
				current: this.calculateThroughput(),
				peak: this.calculatePeakThroughput(),
				average: this.calculateAverageThroughput(),
				trend: this.calculateThroughputTrend(),
			},
			errors: {
				total: this.getTotalErrors(),
				rate: this.calculateErrorRate(),
				byType: this.getErrorsByType(),
				recentErrors: this.getRecentErrors(),
			},
			resources: {
				cpu: metrics[metrics.length - 1]?.system.cpu || 0,
				memory: metrics[metrics.length - 1]?.system.memory || 0,
				disk: metrics[metrics.length - 1]?.system.disk || 0,
				network: metrics[metrics.length - 1]?.system.network || 0,
			},
		};
	}

	// === DASHBOARD MANAGEMENT ===

	private initializeDashboard(): void {
		if (!this.config.dashboardConfig.enabled) return;

		const defaultPanels: DashboardPanel[] = [
			{
				id: "system-cpu",
				title: "CPU Usage",
				type: "gauge",
				metrics: ["system.cpu"],
				size: { width: 6, height: 4 },
				position: { x: 0, y: 0 },
				config: { max: 100, thresholds: [70, 90] },
			},
			{
				id: "system-memory",
				title: "Memory Usage",
				type: "gauge",
				metrics: ["system.memory"],
				size: { width: 6, height: 4 },
				position: { x: 6, y: 0 },
				config: { max: 100, thresholds: [80, 95] },
			},
			{
				id: "response-time",
				title: "Response Time",
				type: "line",
				metrics: ["application.responseTime"],
				size: { width: 12, height: 6 },
				position: { x: 0, y: 4 },
				config: { timeWindow: "5m" },
			},
			{
				id: "throughput",
				title: "Throughput",
				type: "bar",
				metrics: ["application.throughput"],
				size: { width: 6, height: 4 },
				position: { x: 0, y: 10 },
				config: { timeWindow: "1m" },
			},
			{
				id: "error-rate",
				title: "Error Rate",
				type: "stat",
				metrics: ["application.errorRate"],
				size: { width: 6, height: 4 },
				position: { x: 6, y: 10 },
				config: { unit: "%" },
			},
		];

		this.config.dashboardConfig.panels = defaultPanels;
		this.logger.info("Dashboard initialized", { panels: defaultPanels.length });
	}

	private updateDashboard(metrics: SystemMetrics): void {
		if (!this.config.dashboardConfig.enabled) return;

		this.dashboardData.set("latest", {
			timestamp: metrics.timestamp,
			metrics,
			panels: this.config.dashboardConfig.panels.map((panel) => ({
				...panel,
				data: this.getPanelData(panel, metrics),
			})),
		});

		this.emit("dashboard:updated", this.dashboardData.get("latest"));
	}

	private getPanelData(panel: DashboardPanel, metrics: SystemMetrics): any {
		const data: any = {};

		for (const metric of panel.metrics) {
			data[metric] = this.getMetricValue(metrics, metric);
		}

		return data;
	}

	// === REPORT GENERATION ===

	async generateReport(
		type: "daily" | "weekly" | "monthly" | "shutdown" = "daily"
	): Promise<MonitoringReport> {
		const endTime = new Date();
		const startTime = this.getReportStartTime(type, endTime);

		const relevantMetrics = this.metrics.filter(
			(m) => m.timestamp >= startTime && m.timestamp <= endTime
		);

		const relevantAlerts = this.alerts.filter(
			(a) => a.timestamp >= startTime && a.timestamp <= endTime
		);

		const relevantHealthChecks = this.healthChecks.filter(
			(h) => h.timestamp >= startTime && h.timestamp <= endTime
		);

		const overallHealth = this.calculateOverallHealth(
			relevantMetrics,
			relevantAlerts
		);
		const performanceScore = this.calculatePerformanceScore(relevantMetrics);
		const recommendations = this.generateRecommendations(
			relevantMetrics,
			relevantAlerts
		);
		const trends = this.calculateTrends(relevantMetrics);

		const report: MonitoringReport = {
			timestamp: endTime,
			period: type,
			summary: {
				overallHealth,
				alertCount: relevantAlerts.length,
				criticalIssues: relevantAlerts.filter((a) => a.level === "critical")
					.length,
				performanceScore,
				recommendations,
			},
			metrics:
				relevantMetrics[relevantMetrics.length - 1] || this.getDefaultMetrics(),
			performance: this.calculatePerformanceMetrics(relevantMetrics),
			alerts: relevantAlerts,
			healthChecks: relevantHealthChecks,
			trends,
		};

		// Save report to file
		await this.saveReport(report);

		this.emit("report:generated", report);
		this.logger.info("Monitoring report generated", {
			type,
			period: `${startTime.toISOString()} - ${endTime.toISOString()}`,
		});

		return report;
	}

	// === PUBLIC API ===

	subscribeToRealTimeData(callback: (data: any) => void): () => void {
		this.realTimeSubscribers.add(callback);
		return () => this.realTimeSubscribers.delete(callback);
	}

	getCurrentMetrics(): SystemMetrics | undefined {
		return this.metrics[this.metrics.length - 1];
	}

	getAlerts(level?: string): Alert[] {
		if (level) {
			return this.alerts.filter((a) => a.level === level);
		}
		return [...this.alerts];
	}

	getHealthStatus(): HealthCheckResult[] {
		return [...this.healthChecks];
	}

	acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.acknowledged = true;
			alert.acknowledgedBy = acknowledgedBy;
			this.emit("alert:acknowledged", alert);
		}
	}

	resolveAlert(alertId: string): void {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.resolved = true;
			alert.resolvedAt = new Date();
			this.emit("alert:resolved", alert);
		}
	}

	getDashboardData(): any {
		return this.dashboardData.get("latest");
	}

	getPerformanceMetrics(): PerformanceMetrics | undefined {
		return this.performanceHistory[this.performanceHistory.length - 1];
	}

	// === UTILITY METHODS ===

	private setupEventHandlers(): void {
		this.eventBus.on("request:start", (data: any) => {
			this.activeConnections.add(data.id);
			this.requestMetrics.set(data.id, {
				startTime: performance.now(),
				...data,
			});
		});

		this.eventBus.on("request:end", (data: any) => {
			this.activeConnections.delete(data.id);
			const request = this.requestMetrics.get(data.id);
			if (request) {
				const responseTime = performance.now() - request.startTime;
				this.responseTimes.push(responseTime);
				this.requestMetrics.delete(data.id);
			}
		});

		this.eventBus.on("error", (error: any) => {
			const errorType = error.type || "unknown";
			this.errorCounts.set(
				errorType,
				(this.errorCounts.get(errorType) || 0) + 1
			);
		});
	}

	private initializeDefaultAlertRules(): void {
		const rules = [
			{
				id: "high-cpu",
				name: "High CPU Usage",
				metric: "system.cpu",
				condition: "gt",
				threshold: this.config.alertThresholds.cpu.warning,
				severity: "warning",
				category: "system",
				enabled: true,
				actions: ["log", "notify"],
			},
			{
				id: "critical-cpu",
				name: "Critical CPU Usage",
				metric: "system.cpu",
				condition: "gt",
				threshold: this.config.alertThresholds.cpu.critical,
				severity: "critical",
				category: "system",
				enabled: true,
				actions: ["log", "notify", "alert"],
			},
			{
				id: "high-memory",
				name: "High Memory Usage",
				metric: "system.memory",
				condition: "gt",
				threshold: this.config.alertThresholds.memory.warning,
				severity: "warning",
				category: "system",
				enabled: true,
				actions: ["log", "notify"],
			},
			{
				id: "slow-response",
				name: "Slow Response Time",
				metric: "application.responseTime",
				condition: "gt",
				threshold: this.config.alertThresholds.responseTime.warning,
				severity: "warning",
				category: "performance",
				enabled: true,
				actions: ["log", "notify"],
			},
			{
				id: "high-error-rate",
				name: "High Error Rate",
				metric: "application.errorRate",
				condition: "gt",
				threshold: this.config.alertThresholds.errorRate.warning,
				severity: "warning",
				category: "application",
				enabled: true,
				actions: ["log", "notify"],
			},
		];

		rules.forEach((rule) => this.alertRules.set(rule.id, rule));
	}

	private getMetricValue(metrics: SystemMetrics, path: string): number {
		const parts = path.split(".");
		let value: any = metrics;

		for (const part of parts) {
			value = value?.[part];
			if (value === undefined) return 0;
		}

		return typeof value === "number" ? value : 0;
	}

	private evaluateAlertCondition(
		value: number,
		condition: string,
		threshold: number
	): boolean {
		switch (condition) {
			case "gt":
				return value > threshold;
			case "gte":
				return value >= threshold;
			case "lt":
				return value < threshold;
			case "lte":
				return value <= threshold;
			case "eq":
				return value === threshold;
			default:
				return false;
		}
	}

	private shouldSendAlert(alertLevel: string, channelLevel: string): boolean {
		const levels = ["info", "warning", "error", "critical"];
		return levels.indexOf(alertLevel) >= levels.indexOf(channelLevel);
	}

	private async writeAlertToFile(alert: Alert): Promise<void> {
		try {
			const logEntry = `${alert.timestamp.toISOString()} [${alert.level.toUpperCase()}] ${alert.message}\n`;
			await fs.appendFile(
				this.config.alertChannels.file.path,
				logEntry,
				"utf8"
			);
		} catch (error) {
			this.logger.error("Failed to write alert to file", {
				error: getErrorMessage(error),
			});
		}
	}

	private async sendEmailAlert(alert: Alert): Promise<void> {
		// Placeholder for email implementation
		this.logger.info("Email alert sent", { alertId: alert.id });
	}

	private async sendWebhookAlert(alert: Alert): Promise<void> {
		// Placeholder for webhook implementation
		this.logger.info("Webhook alert sent", { alertId: alert.id });
	}

	private async sendSlackAlert(alert: Alert): Promise<void> {
		// Placeholder for Slack implementation
		this.logger.info("Slack alert sent", { alertId: alert.id });
	}

	private async ensureLogDirectory(): Promise<void> {
		const logDir = path.dirname(this.config.alertChannels.file.path);
		try {
			await fs.mkdir(logDir, { recursive: true });
		} catch (error) {
			this.logger.error("Failed to create log directory", {
				error: getErrorMessage(error),
			});
		}
	}

	private cleanupOldMetrics(): void {
		const cutoff = new Date(Date.now() - this.config.retentionPeriod);
		this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
	}

	private cleanupOldHealthChecks(): void {
		const cutoff = new Date(Date.now() - this.config.retentionPeriod);
		this.healthChecks = this.healthChecks.filter((h) => h.timestamp > cutoff);
	}

	private calculateAverageResponseTime(): number {
		if (this.responseTimes.length === 0) return 0;
		return (
			this.responseTimes.reduce((sum, time) => sum + time, 0) /
			this.responseTimes.length
		);
	}

	private calculateThroughput(): number {
		const oneMinuteAgo = Date.now() - 60000;
		const recentRequests = Array.from(this.requestMetrics.values()).filter(
			(req) => req.startTime > oneMinuteAgo
		);
		return recentRequests.length / 60; // requests per second
	}

	private calculateErrorRate(): number {
		const totalErrors = Array.from(this.errorCounts.values()).reduce(
			(sum, count) => sum + count,
			0
		);
		const totalRequests = this.requestMetrics.size;
		return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
	}

	private getQueueDepth(): number {
		// Placeholder - would get from actual queue implementation
		return 0;
	}

	private async getDiskUsage(): Promise<number> {
		// Placeholder - would use actual disk usage calculation
		return Math.random() * 100;
	}

	private async getNetworkUsage(): Promise<number> {
		// Placeholder - would use actual network usage calculation
		return Math.random() * 1024 * 1024; // bytes
	}

	private async getAgentData(): Promise<any> {
		// Placeholder - would get from actual agent manager
		return {
			total: 5,
			active: 4,
			idle: 1,
			failed: 0,
			averageHealth: 0.9,
		};
	}

	private async calculateSwarmUtilization(): Promise<number> {
		// Placeholder - would calculate from actual swarm metrics
		return Math.random() * 100;
	}

	private async calculateSwarmEfficiency(): Promise<number> {
		// Placeholder - would calculate from actual swarm metrics
		return Math.random() * 100;
	}

	private async calculateCoordinationMetrics(): Promise<number> {
		// Placeholder - would calculate from actual coordination metrics
		return Math.random() * 100;
	}

	private async calculateCommunicationMetrics(): Promise<number> {
		// Placeholder - would calculate from actual communication metrics
		return Math.random() * 100;
	}

	private getPercentile(sortedArray: number[], percentile: number): number {
		if (sortedArray.length === 0) return 0;
		const index = Math.ceil(sortedArray.length * percentile) - 1;
		return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
	}

	private calculatePeakThroughput(): number {
		// Placeholder - would calculate from historical data
		return 100;
	}

	private calculateAverageThroughput(): number {
		// Placeholder - would calculate from historical data
		return 50;
	}

	private calculateThroughputTrend(): "up" | "down" | "stable" {
		// Placeholder - would calculate from historical data
		return "stable";
	}

	private getTotalErrors(): number {
		return Array.from(this.errorCounts.values()).reduce(
			(sum, count) => sum + count,
			0
		);
	}

	private getErrorsByType(): Record<string, number> {
		return Object.fromEntries(this.errorCounts);
	}

	private getRecentErrors(): Error[] {
		// Placeholder - would get from actual error tracking
		return [];
	}

	private getLatestHealthStatus(): any {
		return this.healthChecks.slice(-10); // Last 10 health checks
	}

	private getLatestPerformanceMetrics(): any {
		return this.performanceHistory[this.performanceHistory.length - 1];
	}

	private async generateOptimizationRecommendations(): Promise<void> {
		// Placeholder for optimization recommendations
		this.logger.debug("Generated optimization recommendations");
	}

	private calculateOverallHealth(
		metrics: SystemMetrics[],
		alerts: Alert[]
	): "healthy" | "degraded" | "unhealthy" {
		const criticalAlerts = alerts.filter((a) => a.level === "critical");
		const errorAlerts = alerts.filter((a) => a.level === "error");

		if (criticalAlerts.length > 0) return "unhealthy";
		if (errorAlerts.length > 5) return "degraded";
		return "healthy";
	}

	private calculatePerformanceScore(metrics: SystemMetrics[]): number {
		// Placeholder - would calculate based on actual performance metrics
		return Math.random() * 100;
	}

	private generateRecommendations(
		metrics: SystemMetrics[],
		alerts: Alert[]
	): string[] {
		const recommendations: string[] = [];

		const highCpuAlerts = alerts.filter(
			(a) => a.details.metric === "system.cpu"
		);
		if (highCpuAlerts.length > 0) {
			recommendations.push(
				"Consider optimizing CPU-intensive operations or scaling horizontally"
			);
		}

		const highMemoryAlerts = alerts.filter(
			(a) => a.details.metric === "system.memory"
		);
		if (highMemoryAlerts.length > 0) {
			recommendations.push(
				"Review memory usage patterns and consider implementing memory optimization"
			);
		}

		const slowResponseAlerts = alerts.filter(
			(a) => a.details.metric === "application.responseTime"
		);
		if (slowResponseAlerts.length > 0) {
			recommendations.push(
				"Optimize slow operations and consider implementing caching"
			);
		}

		if (recommendations.length === 0) {
			recommendations.push("System is performing well - continue monitoring");
		}

		return recommendations;
	}

	private calculateTrends(metrics: SystemMetrics[]): any {
		// Placeholder - would calculate trends from historical data
		return {
			responseTime: "stable",
			throughput: "stable",
			errorRate: "stable",
			resourceUsage: "stable",
		};
	}

	private getReportStartTime(type: string, endTime: Date): Date {
		const startTime = new Date(endTime);

		switch (type) {
			case "daily":
				startTime.setHours(0, 0, 0, 0);
				break;
			case "weekly":
				startTime.setDate(startTime.getDate() - 7);
				break;
			case "monthly":
				startTime.setMonth(startTime.getMonth() - 1);
				break;
			case "shutdown":
				startTime.setTime(startTime.getTime() - 3600000); // Last hour
				break;
		}

		return startTime;
	}

	private getDefaultMetrics(): SystemMetrics {
		return {
			timestamp: new Date(),
			system: { cpu: 0, memory: 0, disk: 0, network: 0, uptime: 0 },
			application: {
				responseTime: 0,
				throughput: 0,
				errorRate: 0,
				activeConnections: 0,
				queueDepth: 0,
			},
			agents: { total: 0, active: 0, idle: 0, failed: 0, averageHealth: 0 },
			swarm: {
				utilization: 0,
				efficiency: 0,
				coordination: 0,
				communication: 0,
			},
		};
	}

	private async saveReport(report: MonitoringReport): Promise<void> {
		try {
			const reportPath = path.join(
				"./logs",
				`monitoring-report-${report.timestamp.toISOString().split("T")[0]}.json`
			);
			await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
			this.logger.info("Report saved", { path: reportPath });
		} catch (error) {
			this.logger.error("Failed to save report", {
				error: getErrorMessage(error),
			});
		}
	}

	private async saveMetricsToFile(): Promise<void> {
		try {
			const metricsPath = path.join("./logs", `metrics-${Date.now()}.json`);
			await fs.writeFile(
				metricsPath,
				JSON.stringify(this.metrics, null, 2),
				"utf8"
			);
			this.logger.info("Metrics saved", { path: metricsPath });
		} catch (error) {
			this.logger.error("Failed to save metrics", {
				error: getErrorMessage(error),
			});
		}
	}

	private async getSystemIntegration(): Promise<any> {
		// Placeholder - would get from actual system integration
		return {
			getComponent: (name: string) => ({
				healthCheck: async () => ({ healthy: true, details: {} }),
			}),
		};
	}
}
