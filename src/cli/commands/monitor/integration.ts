/**
 * Monitoring System Integration
 * Integrates all monitoring components into a unified system
 */

import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { IEventBus } from "../cli/core/events/event-bus.js";
import type { ILogger } from "../cli/core/logging/logger.js";
import { getErrorMessage } from "../cli/shared/errors/error-handler.js";
import { MCPPerformanceMonitor } from "../mcp/performance-monitor.js";
import { ComprehensiveMonitoringSystem } from "./comprehensive-monitoring-system.js";
import { DiagnosticManager } from "./diagnostics.js";
import { HealthCheckManager } from "./health-check.js";
import { PerformanceOptimizationAnalyzer } from "./performance-analyzer.js";
import type { RealTimeMonitor } from "./real-time-monitor.js";

export interface MonitoringIntegrationConfig {
	enableComprehensiveMonitoring: boolean;
	enablePerformanceAnalyzer: boolean;
	enableDiagnostics: boolean;
	enableHealthChecks: boolean;
	enableMCPMonitoring: boolean;
	alertingConfig: AlertingConfig;
	dashboardConfig: DashboardIntegrationConfig;
	reportingConfig: ReportingConfig;
	exportConfig: ExportConfig;
}

export interface AlertingConfig {
	enabled: boolean;
	channels: string[];
	aggregationWindow: number;
	escalationRules: EscalationRule[];
	suppressionRules: SuppressionRule[];
	notificationTemplates: NotificationTemplate[];
}

export interface EscalationRule {
	id: string;
	conditions: string[];
	delay: number;
	action: string;
	recipients: string[];
}

export interface SuppressionRule {
	id: string;
	conditions: string[];
	duration: number;
	reason: string;
}

export interface NotificationTemplate {
	id: string;
	channel: string;
	template: string;
	variables: string[];
}

export interface DashboardIntegrationConfig {
	enabled: boolean;
	port: number;
	authentication: boolean;
	customPanels: any[];
	themes: string[];
	autoRefresh: boolean;
	exportFormats: string[];
}

export interface ReportingConfig {
	enabled: boolean;
	schedule: {
		daily: boolean;
		weekly: boolean;
		monthly: boolean;
	};
	recipients: string[];
	format: "html" | "pdf" | "json" | "csv";
	includeMetrics: boolean;
	includeAlerts: boolean;
	includeRecommendations: boolean;
}

export interface ExportConfig {
	enabled: boolean;
	format: "json" | "csv" | "prometheus";
	destinations: string[];
	compression: boolean;
	retention: number;
}

export interface MonitoringSystemStatus {
	overall: "healthy" | "degraded" | "unhealthy";
	components: {
		[component: string]: {
			status: "healthy" | "degraded" | "unhealthy";
			lastCheck: Date;
			uptime: number;
			errorCount: number;
			metrics: any;
		};
	};
	performance: {
		responseTime: number;
		throughput: number;
		errorRate: number;
		resourceUsage: any;
	};
	alerts: {
		active: number;
		resolved: number;
		suppressed: number;
	};
	lastUpdate: Date;
}

export interface MonitoringEvent {
	timestamp: Date;
	type: string;
	source: string;
	severity: "info" | "warning" | "error" | "critical";
	message: string;
	data: any;
	correlationId?: string;
	tags: string[];
}

export interface MonitoringAggregation {
	timestamp: Date;
	period: string;
	metrics: {
		[metric: string]: {
			avg: number;
			min: number;
			max: number;
			sum: number;
			count: number;
		};
	};
	alerts: {
		total: number;
		byLevel: { [level: string]: number };
		bySource: { [source: string]: number };
	};
	performance: {
		overallScore: number;
		trends: { [metric: string]: "improving" | "stable" | "degrading" };
	};
}

/**
 * Monitoring System Integration
 * Coordinates all monitoring components and provides unified interface
 */
export class MonitoringSystemIntegration extends EventEmitter {
	private logger: ILogger;
	private eventBus: IEventBus;
	private config: MonitoringIntegrationConfig;

	// Monitoring Components
	private comprehensiveMonitoring?: ComprehensiveMonitoringSystem;
	private performanceAnalyzer?: PerformanceOptimizationAnalyzer;
	private diagnosticManager?: DiagnosticManager;
	private healthCheckManager?: HealthCheckManager;
	private realTimeMonitor?: RealTimeMonitor;
	private mcpPerformanceMonitor?: MCPPerformanceMonitor;

	// Integration State
	private isInitialized = false;
	private componentStatus: Map<string, any> = new Map();
	private eventAggregator: Map<string, MonitoringEvent[]> = new Map();
	private metricsAggregator: Map<string, any> = new Map();
	private alertAggregator: Map<string, any> = new Map();

	// Timers
	private aggregationTimer?: NodeJS.Timeout;
	private reportingTimer?: NodeJS.Timeout;
	private exportTimer?: NodeJS.Timeout;
	private healthCheckTimer?: NodeJS.Timeout;

	constructor(
		logger: ILogger,
		eventBus: IEventBus,
		config: Partial<MonitoringIntegrationConfig> = {},
	) {
		super();
		this.logger = logger;
		this.eventBus = eventBus;

		this.config = {
			enableComprehensiveMonitoring: true,
			enablePerformanceAnalyzer: true,
			enableDiagnostics: true,
			enableHealthChecks: true,
			enableMCPMonitoring: true,
			alertingConfig: {
				enabled: true,
				channels: ["console", "file", "memory"],
				aggregationWindow: 60000,
				escalationRules: [],
				suppressionRules: [],
				notificationTemplates: [],
			},
			dashboardConfig: {
				enabled: true,
				port: 3000,
				authentication: false,
				customPanels: [],
				themes: ["light", "dark"],
				autoRefresh: true,
				exportFormats: ["json", "csv"],
			},
			reportingConfig: {
				enabled: true,
				schedule: {
					daily: true,
					weekly: true,
					monthly: true,
				},
				recipients: [],
				format: "html",
				includeMetrics: true,
				includeAlerts: true,
				includeRecommendations: true,
			},
			exportConfig: {
				enabled: true,
				format: "json",
				destinations: ["./logs/monitoring-export"],
				compression: true,
				retention: 7 * 24 * 60 * 60 * 1000, // 7 days
			},
			...config,
		};

		this.setupEventHandlers();
	}

	async initialize(): Promise<void> {
		this.logger.info("Initializing monitoring system integration", {
			components: this.getEnabledComponents(),
		});

		try {
			// Initialize components based on configuration
			await this.initializeComponents();

			// Start integration services
			await this.startIntegrationServices();

			// Setup component health monitoring
			this.startComponentHealthMonitoring();

			this.isInitialized = true;

			this.logger.info(
				"Monitoring system integration initialized successfully",
			);
			this.emit("integration:initialized");
		} catch (error) {
			this.logger.error("Failed to initialize monitoring system integration", {
				error: getErrorMessage(error),
			});
			throw error;
		}
	}

	async shutdown(): Promise<void> {
		this.logger.info("Shutting down monitoring system integration");

		try {
			// Stop all timers
			if (this.aggregationTimer) clearInterval(this.aggregationTimer);
			if (this.reportingTimer) clearInterval(this.reportingTimer);
			if (this.exportTimer) clearInterval(this.exportTimer);
			if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);

			// Shutdown components
			await this.shutdownComponents();

			// Generate final report
			await this.generateFinalReport();

			this.isInitialized = false;

			this.logger.info("Monitoring system integration shutdown completed");
			this.emit("integration:shutdown");
		} catch (error) {
			this.logger.error("Error during monitoring system shutdown", {
				error: getErrorMessage(error),
			});
		}
	}

	// === COMPONENT MANAGEMENT ===

	private async initializeComponents(): Promise<void> {
		const initPromises: Promise<void>[] = [];

		// Initialize Comprehensive Monitoring System
		if (this.config.enableComprehensiveMonitoring) {
			this.comprehensiveMonitoring = new ComprehensiveMonitoringSystem(
				this.logger,
				this.eventBus,
			);
			initPromises.push(this.comprehensiveMonitoring.initialize());
			this.componentStatus.set("comprehensive-monitoring", {
				status: "initializing",
			});
		}

		// Initialize Performance Analyzer
		if (this.config.enablePerformanceAnalyzer) {
			this.performanceAnalyzer = new PerformanceOptimizationAnalyzer(
				this.logger,
			);
			initPromises.push(this.performanceAnalyzer.initialize());
			this.componentStatus.set("performance-analyzer", {
				status: "initializing",
			});
		}

		// Initialize Diagnostics Manager
		if (this.config.enableDiagnostics) {
			this.diagnosticManager = new DiagnosticManager(
				this.eventBus as any,
				this.logger as any,
			);
			this.componentStatus.set("diagnostics", { status: "ready" });
		}

		// Initialize Health Check Manager
		if (this.config.enableHealthChecks) {
			this.healthCheckManager = new HealthCheckManager(
				this.eventBus as any,
				this.logger as any,
			);
			this.healthCheckManager.start();
			this.componentStatus.set("health-checks", { status: "ready" });
		}

		// Initialize MCP Performance Monitor
		if (this.config.enableMCPMonitoring) {
			this.mcpPerformanceMonitor = new MCPPerformanceMonitor(this.logger);
			this.componentStatus.set("mcp-monitoring", { status: "ready" });
		}

		// Wait for all components to initialize
		await Promise.all(initPromises);

		// Update component status
		for (const [component, status] of this.componentStatus) {
			if (status.status === "initializing") {
				this.componentStatus.set(component, {
					status: "ready",
					startTime: Date.now(),
				});
			}
		}
	}

	private async shutdownComponents(): Promise<void> {
		const shutdownPromises: Promise<void>[] = [];

		if (this.comprehensiveMonitoring) {
			shutdownPromises.push(this.comprehensiveMonitoring.shutdown());
		}

		if (this.performanceAnalyzer) {
			shutdownPromises.push(this.performanceAnalyzer.shutdown());
		}

		if (this.healthCheckManager) {
			this.healthCheckManager.stop();
		}

		if (this.mcpPerformanceMonitor) {
			this.mcpPerformanceMonitor.stop();
		}

		await Promise.all(shutdownPromises);
	}

	// === INTEGRATION SERVICES ===

	private async startIntegrationServices(): Promise<void> {
		// Start data aggregation
		this.startDataAggregation();

		// Start reporting
		if (this.config.reportingConfig.enabled) {
			this.startReporting();
		}

		// Start export
		if (this.config.exportConfig.enabled) {
			this.startExport();
		}

		// Setup component interconnections
		this.setupComponentInterconnections();
	}

	private startDataAggregation(): void {
		this.aggregationTimer = setInterval(async () => {
			try {
				await this.aggregateData();
			} catch (error) {
				this.logger.error("Data aggregation failed", {
					error: getErrorMessage(error),
				});
			}
		}, this.config.alertingConfig.aggregationWindow);

		this.logger.info("Data aggregation started", {
			window: this.config.alertingConfig.aggregationWindow,
		});
	}

	private startReporting(): void {
		// Daily reports
		if (this.config.reportingConfig.schedule.daily) {
			this.scheduleReport("daily", 24 * 60 * 60 * 1000);
		}

		// Weekly reports
		if (this.config.reportingConfig.schedule.weekly) {
			this.scheduleReport("weekly", 7 * 24 * 60 * 60 * 1000);
		}

		// Monthly reports
		if (this.config.reportingConfig.schedule.monthly) {
			this.scheduleReport("monthly", 30 * 24 * 60 * 60 * 1000);
		}
	}

	private startExport(): void {
		this.exportTimer = setInterval(async () => {
			try {
				await this.exportData();
			} catch (error) {
				this.logger.error("Data export failed", {
					error: getErrorMessage(error),
				});
			}
		}, 300000); // 5 minutes

		this.logger.info("Data export started");
	}

	private startComponentHealthMonitoring(): void {
		this.healthCheckTimer = setInterval(async () => {
			try {
				await this.checkComponentHealth();
			} catch (error) {
				this.logger.error("Component health check failed", {
					error: getErrorMessage(error),
				});
			}
		}, 30000); // 30 seconds

		this.logger.info("Component health monitoring started");
	}

	private setupComponentInterconnections(): void {
		// Connect performance analyzer to comprehensive monitoring
		if (this.performanceAnalyzer && this.comprehensiveMonitoring) {
			this.comprehensiveMonitoring.on("metrics:collected", (metrics) => {
				this.performanceAnalyzer!.addMetrics(metrics);
			});
		}

		// Dashboard data connections removed

		// Connect diagnostics to health checks
		if (this.diagnosticManager && this.healthCheckManager) {
			(this.healthCheckManager as any).on(
				"health:check:completed",
				(data: any) => {
					this.emit("monitoring:health:updated", data);
				},
			);
		}
	}

	// === DATA PROCESSING ===

	private async aggregateData(): Promise<void> {
		const now = new Date();
		const aggregationKey = this.getAggregationKey(now);

		// Aggregate metrics
		const metrics = await this.aggregateMetrics();

		// Aggregate alerts
		const alerts = await this.aggregateAlerts();

		// Aggregate performance data
		const performance = await this.aggregatePerformance();

		const aggregation: MonitoringAggregation = {
			timestamp: now,
			period: "1m",
			metrics,
			alerts,
			performance,
		};

		this.metricsAggregator.set(aggregationKey, aggregation);

		// Clean up old aggregations
		this.cleanupOldAggregations();

		this.emit("data:aggregated", aggregation);
	}

	private async aggregateMetrics(): Promise<any> {
		const metrics: any = {};

		// Get metrics from comprehensive monitoring
		if (this.comprehensiveMonitoring) {
			const currentMetrics = this.comprehensiveMonitoring.getCurrentMetrics();
			if (currentMetrics) {
				metrics["system.cpu"] = this.createMetricAggregation(
					currentMetrics.system.cpu,
				);
				metrics["system.memory"] = this.createMetricAggregation(
					currentMetrics.system.memory,
				);
				metrics["application.responseTime"] = this.createMetricAggregation(
					currentMetrics.application.responseTime,
				);
				metrics["application.throughput"] = this.createMetricAggregation(
					currentMetrics.application.throughput,
				);
			}
		}

		return metrics;
	}

	private async aggregateAlerts(): Promise<any> {
		const alerts = {
			total: 0,
			byLevel: {} as any,
			bySource: {} as any,
		};

		// Get alerts from comprehensive monitoring
		if (this.comprehensiveMonitoring) {
			const currentAlerts = this.comprehensiveMonitoring.getAlerts();

			alerts.total = currentAlerts.length;

			// Group by level
			for (const alert of currentAlerts) {
				alerts.byLevel[alert.level] = (alerts.byLevel[alert.level] || 0) + 1;
				alerts.bySource[alert.source] =
					(alerts.bySource[alert.source] || 0) + 1;
			}
		}

		return alerts;
	}

	private async aggregatePerformance(): Promise<any> {
		const performance = {
			overallScore: 0,
			trends: {} as any,
		};

		// Get performance data from analyzer
		if (this.performanceAnalyzer) {
			const analysis = this.performanceAnalyzer.getCurrentAnalysis();
			if (analysis) {
				performance.overallScore = analysis.overallScore;
				performance.trends = analysis.trends;
			}
		}

		return performance;
	}

	private async checkComponentHealth(): Promise<void> {
		const healthStatus: any = {};

		// Check each component
		for (const [component, status] of this.componentStatus) {
			try {
				const componentHealth =
					await this.checkSingleComponentHealth(component);
				healthStatus[component] = componentHealth;

				this.componentStatus.set(component, {
					...status,
					...componentHealth,
					lastCheck: new Date(),
				});
			} catch (error) {
				healthStatus[component] = {
					status: "unhealthy",
					error: getErrorMessage(error),
				};
			}
		}

		this.emit("component:health:updated", healthStatus);
	}

	private async checkSingleComponentHealth(component: string): Promise<any> {
		switch (component) {
			case "comprehensive-monitoring":
				return this.comprehensiveMonitoring
					? {
							status: "healthy",
							uptime:
								Date.now() -
								(this.componentStatus.get(component)?.startTime || 0),
						}
					: { status: "unhealthy", error: "Component not initialized" };

			// Dashboard status removed
			case "real-time-dashboard":
				return {
					status: "unhealthy",
					error: "Real-time dashboard component is disabled",
				};

			case "performance-analyzer":
				return this.performanceAnalyzer
					? {
							status: "healthy",
							uptime:
								Date.now() -
								(this.componentStatus.get(component)?.startTime || 0),
						}
					: { status: "unhealthy", error: "Component not initialized" };

			case "health-checks":
				return this.healthCheckManager?.isMonitoring()
					? {
							status: "healthy",
							uptime:
								Date.now() -
								(this.componentStatus.get(component)?.startTime || 0),
						}
					: { status: "unhealthy", error: "Health checks not running" };

			default:
				return { status: "unknown", error: "Unknown component" };
		}
	}

	// === REPORTING ===

	private scheduleReport(type: string, interval: number): void {
		setInterval(async () => {
			try {
				await this.generateReport(type);
			} catch (error) {
				this.logger.error("Report generation failed", {
					type,
					error: getErrorMessage(error),
				});
			}
		}, interval);

		this.logger.info("Report scheduled", { type, interval });
	}

	private async generateReport(type: string): Promise<void> {
		this.logger.info("Generating monitoring report", { type });

		const report = {
			timestamp: new Date(),
			type,
			system: await this.getSystemStatus(),
			performance: await this.getPerformanceStatus(),
			alerts: await this.getAlertStatus(),
			recommendations: await this.getRecommendations(),
			health: await this.getHealthStatus(),
		};

		// Save report
		const reportPath = path.join(
			"./logs",
			`monitoring-report-${type}-${Date.now()}.json`,
		);
		await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

		this.logger.info("Monitoring report generated", { type, path: reportPath });
		this.emit("report:generated", { type, report, path: reportPath });
	}

	private async generateFinalReport(): Promise<void> {
		await this.generateReport("shutdown");
	}

	// === EXPORT ===

	private async exportData(): Promise<void> {
		const exportData = {
			timestamp: new Date(),
			metrics: Array.from(this.metricsAggregator.values()),
			alerts: Array.from(this.alertAggregator.values()),
			events: Array.from(this.eventAggregator.values()).flat(),
			componentStatus: Object.fromEntries(this.componentStatus),
		};

		for (const destination of this.config.exportConfig.destinations) {
			await this.exportToDestination(exportData, destination);
		}
	}

	private async exportToDestination(
		data: any,
		destination: string,
	): Promise<void> {
		try {
			const exportPath = path.join(
				destination,
				`monitoring-export-${Date.now()}.json`,
			);
			await fs.mkdir(path.dirname(exportPath), { recursive: true });
			await fs.writeFile(exportPath, JSON.stringify(data, null, 2), "utf8");

			this.logger.debug("Data exported", { destination: exportPath });
		} catch (error) {
			this.logger.error("Export failed", {
				destination,
				error: getErrorMessage(error),
			});
		}
	}

	// === PUBLIC API ===

	getSystemStatus(): Promise<MonitoringSystemStatus> {
		return this.getSystemStatusInternal();
	}

	async getPerformanceStatus(): Promise<any> {
		if (!this.performanceAnalyzer) {
			return { message: "Performance analyzer not enabled" };
		}

		const analysis = this.performanceAnalyzer.getCurrentAnalysis();
		const recommendations =
			this.performanceAnalyzer.getOptimizationRecommendations();

		return {
			analysis,
			recommendations,
			bottlenecks: this.performanceAnalyzer.getBottlenecks(),
		};
	}

	async getAlertStatus(): Promise<any> {
		if (!this.comprehensiveMonitoring) {
			return { message: "Comprehensive monitoring not enabled" };
		}

		const alerts = this.comprehensiveMonitoring.getAlerts();

		return {
			total: alerts.length,
			active: alerts.filter((a) => !a.resolved).length,
			resolved: alerts.filter((a) => a.resolved).length,
			byLevel: this.groupAlertsByLevel(alerts),
			recent: alerts.slice(-10),
		};
	}

	async getRecommendations(): Promise<any> {
		const recommendations: any = {};

		if (this.performanceAnalyzer) {
			recommendations.performance =
				this.performanceAnalyzer.getOptimizationRecommendations();
		}

		if (this.diagnosticManager) {
			const diagnostics =
				await this.diagnosticManager.generateDiagnosticReport();
			recommendations.diagnostics = diagnostics.recommendations;
		}

		return recommendations;
	}

	async getHealthStatus(): Promise<any> {
		if (!this.healthCheckManager) {
			return { message: "Health checks not enabled" };
		}

		const systemHealth = await this.healthCheckManager.getSystemHealth();
		const metrics = this.healthCheckManager.getCurrentMetrics();

		return {
			system: systemHealth,
			metrics,
			components: Object.fromEntries(this.componentStatus),
		};
	}

	getDashboardData(): any {
		return { message: "Dashboard removed" };
	}

	subscribeToRealTimeData(callback: (data: any) => void): () => void {
		return () => {};
	}

	acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
		this.comprehensiveMonitoring?.acknowledgeAlert(alertId, acknowledgedBy);
	}

	resolveAlert(alertId: string): void {
		this.comprehensiveMonitoring?.resolveAlert(alertId);
	}

	// === UTILITY METHODS ===

	private setupEventHandlers(): void {
		// Handle component events
		this.on("component:health:updated", (healthStatus) => {
			this.logger.debug("Component health updated", {
				components: Object.keys(healthStatus).length,
			});
		});

		// Handle monitoring events
		this.eventBus.on("monitoring:event", (event: any) => {
			this.handleMonitoringEvent(event);
		});
	}

	private handleMonitoringEvent(event: MonitoringEvent): void {
		const eventKey = this.getEventKey(event.timestamp);

		if (!this.eventAggregator.has(eventKey)) {
			this.eventAggregator.set(eventKey, []);
		}

		this.eventAggregator.get(eventKey)!.push(event);

		// Emit for real-time processing
		this.emit("monitoring:event:received", event);
	}

	private getEnabledComponents(): string[] {
		const components: string[] = [];

		if (this.config.enableComprehensiveMonitoring)
			components.push("comprehensive-monitoring");
		// Dashboard component removed
		if (this.config.enablePerformanceAnalyzer)
			components.push("performance-analyzer");
		if (this.config.enableDiagnostics) components.push("diagnostics");
		if (this.config.enableHealthChecks) components.push("health-checks");
		if (this.config.enableMCPMonitoring) components.push("mcp-monitoring");

		return components;
	}

	private async getSystemStatusInternal(): Promise<MonitoringSystemStatus> {
		const components: any = {};

		for (const [component, status] of this.componentStatus) {
			components[component] = {
				status: status.status || "unknown",
				lastCheck: status.lastCheck || new Date(),
				uptime: status.uptime || 0,
				errorCount: status.errorCount || 0,
				metrics: status.metrics || {},
			};
		}

		const overallStatus = this.calculateOverallStatus(components);

		return {
			overall: overallStatus,
			components,
			performance: {
				responseTime: 0,
				throughput: 0,
				errorRate: 0,
				resourceUsage: {},
			},
			alerts: {
				active: 0,
				resolved: 0,
				suppressed: 0,
			},
			lastUpdate: new Date(),
		};
	}

	private calculateOverallStatus(
		components: any,
	): "healthy" | "degraded" | "unhealthy" {
		const statuses = Object.values(components).map((c: any) => c.status);

		if (statuses.includes("unhealthy")) return "unhealthy";
		if (statuses.includes("degraded")) return "degraded";
		return "healthy";
	}

	private groupAlertsByLevel(alerts: any[]): any {
		const grouped: any = {};

		for (const alert of alerts) {
			grouped[alert.level] = (grouped[alert.level] || 0) + 1;
		}

		return grouped;
	}

	private createMetricAggregation(value: number): any {
		return {
			avg: value,
			min: value,
			max: value,
			sum: value,
			count: 1,
		};
	}

	private getAggregationKey(timestamp: Date): string {
		return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}`;
	}

	private getEventKey(timestamp: Date): string {
		return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`;
	}

	private cleanupOldAggregations(): void {
		const cutoff = new Date(Date.now() - this.config.exportConfig.retention);

		for (const [key, aggregation] of this.metricsAggregator) {
			if (aggregation.timestamp < cutoff) {
				this.metricsAggregator.delete(key);
			}
		}
	}
}
