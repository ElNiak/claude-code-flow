/**
 * Monitoring System Module
 * Comprehensive monitoring, alerting, and performance optimization system
 */

// Types from comprehensive monitoring system
export type {
	Alert,
	AlertChannels,
	AlertThresholds,
	DashboardConfig,
	HealthCheckResult,
	MonitoringReport,
	PerformanceMetrics,
	StorageConfig,
	SystemMetrics,
	SystemMonitorConfig,
} from "./comprehensive-monitoring-system.js";
// Core monitoring components
export { ComprehensiveMonitoringSystem } from "./comprehensive-monitoring-system.js";
// Existing components
export { DiagnosticManager } from "./diagnostics.js";
export { HealthCheckManager } from "./health-check.js";
// Configuration and types
export {
	type AlertConfiguration,
	type DashboardConfiguration,
	type DiagnosticsConfiguration,
	defaultMonitoringConfig,
	type ExportConfiguration,
	getEnvironmentConfig,
	type IntegrationConfiguration,
	type MonitoringConfiguration,
	mergeMonitoringConfig,
	type PerformanceMonitoringConfig,
	type ReportingConfiguration,
	type SystemMonitoringConfig,
	validateMonitoringConfig,
} from "./monitoring-config.js";
// Types from monitoring integration
export type {
	AlertingConfig,
	DashboardIntegrationConfig,
	ExportConfig,
	MonitoringAggregation,
	MonitoringEvent,
	MonitoringIntegrationConfig,
	MonitoringSystemStatus,
	ReportingConfig,
} from "./monitoring-integration.js";
export { MonitoringSystemIntegration } from "./monitoring-integration.js";
// Types from performance analyzer
export type {
	BenchmarkResult,
	Bottleneck,
	OptimizationAction,
	OptimizationRecommendation,
	OptimizationReport,
	OptimizationTarget,
	PerformanceAnalysis,
	PerformanceAnalysisConfig,
	PerformanceIssue,
	PerformanceThresholds,
} from "./performance-analyzer.js";
export { PerformanceOptimizationAnalyzer } from "./performance-analyzer.js";

// Types from real-time dashboard
export type {
	ChartData,
	DashboardData,
	DashboardPanel,
	DataSource,
	LogData,
	MetricData,
	PanelConfig,
	PanelData,
	TableData,
	TimeRange,
	VisualizationConfig,
} from "./real-time-dashboard.js";
export { RealTimeMonitoringDashboard } from "./real-time-dashboard.js";
export { RealTimeMonitor } from "./real-time-monitor.js";

/**
 * Create a complete monitoring system with all components
 */
export async function createMonitoringSystem(
	logger: any,
	eventBus: any,
	config: any = {}
): Promise<any> {
	const { defaultMonitoringConfig, mergeMonitoringConfig } = await import(
		"./monitoring-config.js"
	);
	const { MonitoringSystemIntegration } = await import(
		"./monitoring-integration.js"
	);

	const finalConfig = mergeMonitoringConfig(defaultMonitoringConfig, config);

	const monitoringSystem = new MonitoringSystemIntegration(logger, eventBus, {
		enableComprehensiveMonitoring: finalConfig.system.enabled,
		enableRealTimeDashboard: finalConfig.dashboard.enabled,
		enablePerformanceAnalyzer: finalConfig.performance.enabled,
		enableDiagnostics: finalConfig.diagnostics.enabled,
		enableHealthChecks: true,
		enableMCPMonitoring: true,
		alertingConfig: {
			enabled: finalConfig.alerts.enabled,
			channels: finalConfig.alerts.channels.map((c) => c.type),
			aggregationWindow: 60000,
			escalationRules: finalConfig.alerts.escalation.levels.map((l) => ({
				id: `level-${l.level}`,
				conditions: l.conditions,
				delay: l.delay,
				action: l.actions[0] || "notify",
				recipients: l.recipients,
			})),
			suppressionRules: finalConfig.alerts.suppression.rules.map((r) => ({
				id: r.id,
				conditions: r.conditions,
				duration: r.duration,
				reason: r.reason,
			})),
			notificationTemplates: finalConfig.alerts.templates.map((t) => ({
				id: t.id,
				channel: "default",
				template: t.body,
				variables: t.variables,
			})),
		},
		dashboardConfig: {
			enabled: finalConfig.dashboard.enabled,
			port: finalConfig.dashboard.port,
			authentication: finalConfig.dashboard.authentication.enabled,
			customPanels: finalConfig.dashboard.panels,
			themes: finalConfig.dashboard.themes.map((t) => t.name),
			autoRefresh: finalConfig.dashboard.realtime.enabled,
			exportFormats: finalConfig.dashboard.export.formats,
		},
		reportingConfig: {
			enabled: finalConfig.reporting.enabled,
			schedule: {
				daily: finalConfig.reporting.schedule.daily.enabled,
				weekly: finalConfig.reporting.schedule.weekly.enabled,
				monthly: finalConfig.reporting.schedule.monthly.enabled,
			},
			recipients: finalConfig.reporting.recipients.map((r) => r.address),
			format:
				(finalConfig.reporting.formats[0]?.type === "csv"
					? "json"
					: finalConfig.reporting.formats[0]?.type) || "json",
			includeMetrics: finalConfig.reporting.content.metrics,
			includeAlerts: finalConfig.reporting.content.alerts,
			includeRecommendations: finalConfig.reporting.content.recommendations,
		},
		exportConfig: {
			enabled: finalConfig.export.enabled,
			format:
				(finalConfig.export.formats[0]?.type === "parquet"
					? "json"
					: finalConfig.export.formats[0]?.type) || "json",
			destinations: finalConfig.export.destinations.map(
				(d) => d.config?.path || "./logs/monitoring-export"
			),
			compression: finalConfig.export.compression.enabled,
			retention: 7 * 24 * 60 * 60 * 1000, // 7 days
		},
	});

	return monitoringSystem;
}

/**
 * Create a simple monitoring system with basic components
 */
export async function createSimpleMonitoringSystem(
	logger: any,
	eventBus: any
): Promise<any> {
	const config = {
		system: {
			enabled: true,
			metricsInterval: 10000,
			healthCheckInterval: 30000,
			retentionPeriod: 24 * 60 * 60 * 1000, // 1 day
		},
		performance: {
			enabled: true,
			analysisInterval: 120000,
			benchmarkingEnabled: false,
			autoOptimization: false,
		},
		alerts: {
			enabled: true,
			channels: [
				{
					type: "console" as const,
					name: "console",
					enabled: true,
					level: "warning" as const,
					config: {},
					rateLimiting: { enabled: false, maxPerMinute: 0, maxPerHour: 0 },
				},
			],
		},
		dashboard: {
			enabled: false,
		},
		diagnostics: {
			enabled: true,
		},
		reporting: {
			enabled: false,
		},
		export: {
			enabled: false,
		},
	};

	return createMonitoringSystem(logger, eventBus, config);
}

/**
 * Create a monitoring system for production use
 */
export async function createProductionMonitoringSystem(
	logger: any,
	eventBus: any,
	config: {
		alertEmail?: string;
		webhookUrl?: string;
		dashboardPort?: number;
		enableAuth?: boolean;
	} = {}
): Promise<any> {
	const productionConfig = {
		system: {
			enabled: true,
			metricsInterval: 5000,
			healthCheckInterval: 15000,
			retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
		},
		performance: {
			enabled: true,
			analysisInterval: 60000,
			benchmarkingEnabled: true,
			autoOptimization: false, // Disabled for safety in production
		},
		alerts: {
			enabled: true,
			channels: [
				{
					type: "console" as const,
					name: "console",
					enabled: true,
					level: "error" as const,
					config: {},
					rateLimiting: { enabled: true, maxPerMinute: 5, maxPerHour: 50 },
				},
				{
					type: "file" as const,
					name: "file",
					enabled: true,
					level: "warning" as const,
					config: { path: "./logs/production-alerts.log" },
					rateLimiting: { enabled: false, maxPerMinute: 0, maxPerHour: 0 },
				},
			],
		},
		dashboard: {
			enabled: true,
			port: config.dashboardPort || 3000,
			authentication: {
				enabled: config.enableAuth || false,
				type: "basic" as const,
				config: {},
			},
		},
		diagnostics: {
			enabled: true,
			interval: 300000, // 5 minutes
			depth: "detailed" as const,
		},
		reporting: {
			enabled: true,
			schedule: {
				daily: { enabled: true, time: "02:00" },
				weekly: { enabled: true, day: "monday", time: "02:00" },
				monthly: { enabled: true, day: 1, time: "02:00" },
				custom: { enabled: false, cron: "" },
			},
		},
		export: {
			enabled: true,
			formats: [{ type: "json" as const, options: {} }],
			destinations: [
				{ type: "file" as const, config: { path: "./logs/monitoring-export" } },
			],
			schedule: {
				interval: 3600000, // 1 hour
				batch: true,
				retry: {
					enabled: true,
					maxAttempts: 3,
					backoff: "exponential" as const,
					delay: 1000,
				},
			},
		},
	};

	return createMonitoringSystem(logger, eventBus, productionConfig);
}

/**
 * Monitoring system factory
 */
export class MonitoringSystemFactory {
	static async create(
		type: "simple" | "production" | "custom",
		logger: any,
		eventBus: any,
		config: any = {}
	): Promise<any> {
		switch (type) {
			case "simple":
				return createSimpleMonitoringSystem(logger, eventBus);
			case "production":
				return createProductionMonitoringSystem(logger, eventBus, config);
			case "custom":
				return createMonitoringSystem(logger, eventBus, config);
			default:
				throw new Error(`Unknown monitoring system type: ${type}`);
		}
	}
}

/**
 * Monitoring utilities
 */
export class MonitoringUtils {
	static formatMetrics(metrics: any): string {
		return JSON.stringify(metrics, null, 2);
	}

	static calculatePerformanceScore(metrics: any): number {
		// Simple performance score calculation
		const cpu = metrics.system?.cpu || 0;
		const memory = metrics.system?.memory || 0;
		const responseTime = metrics.application?.responseTime || 0;

		const cpuScore = Math.max(0, 100 - cpu);
		const memoryScore = Math.max(0, 100 - memory);
		const responseTimeScore = Math.max(0, 100 - responseTime / 100);

		return (cpuScore + memoryScore + responseTimeScore) / 3;
	}

	static formatAlert(alert: any): string {
		return `[${alert.level.toUpperCase()}] ${alert.message} (${alert.timestamp})`;
	}

	static aggregateMetrics(metrics: any[]): any {
		if (metrics.length === 0) return null;

		const aggregated: any = {};

		for (const metric of metrics) {
			for (const [key, value] of Object.entries(metric)) {
				if (typeof value === "number") {
					if (!aggregated[key]) {
						aggregated[key] = { sum: 0, count: 0, min: value, max: value };
					}
					aggregated[key].sum += value;
					aggregated[key].count++;
					aggregated[key].min = Math.min(aggregated[key].min, value);
					aggregated[key].max = Math.max(aggregated[key].max, value);
					aggregated[key].avg = aggregated[key].sum / aggregated[key].count;
				}
			}
		}

		return aggregated;
	}
}

/**
 * Default export - factory for creating monitoring systems
 */
export default {
	create: MonitoringSystemFactory.create,
	createSimple: createSimpleMonitoringSystem,
	createProduction: createProductionMonitoringSystem,
	createCustom: createMonitoringSystem,
	utils: MonitoringUtils,
};
