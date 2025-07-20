/**
 * Monitoring System Configuration
 * Central configuration for all monitoring components
 */

export interface MonitoringConfiguration {
	system: SystemMonitoringConfig;
	performance: PerformanceMonitoringConfig;
	alerts: AlertConfiguration;
	dashboard: DashboardConfiguration;
	diagnostics: DiagnosticsConfiguration;
	reporting: ReportingConfiguration;
	export: ExportConfiguration;
	integration: IntegrationConfiguration;
}

export interface SystemMonitoringConfig {
	enabled: boolean;
	metricsInterval: number;
	healthCheckInterval: number;
	retentionPeriod: number;
	realTimeUpdates: boolean;
	thresholds: SystemThresholds;
	components: {
		cpu: ComponentConfig;
		memory: ComponentConfig;
		disk: ComponentConfig;
		network: ComponentConfig;
		agents: ComponentConfig;
		swarm: ComponentConfig;
	};
}

export interface ComponentConfig {
	enabled: boolean;
	interval: number;
	thresholds: {
		warning: number;
		critical: number;
	};
	actions: string[];
}

export interface SystemThresholds {
	cpu: { warning: number; critical: number };
	memory: { warning: number; critical: number };
	disk: { warning: number; critical: number };
	network: { warning: number; critical: number };
	responseTime: { warning: number; critical: number };
	throughput: { warning: number; critical: number };
	errorRate: { warning: number; critical: number };
}

export interface PerformanceMonitoringConfig {
	enabled: boolean;
	analysisInterval: number;
	benchmarkingEnabled: boolean;
	autoOptimization: boolean;
	thresholds: PerformanceThresholds;
	optimization: OptimizationConfig;
	profiling: ProfilingConfig;
}

export interface PerformanceThresholds {
	responseTime: {
		excellent: number;
		good: number;
		acceptable: number;
		poor: number;
	};
	throughput: {
		excellent: number;
		good: number;
		acceptable: number;
		poor: number;
	};
	latency: {
		excellent: number;
		good: number;
		acceptable: number;
		poor: number;
	};
	efficiency: {
		excellent: number;
		good: number;
		acceptable: number;
		poor: number;
	};
}

export interface OptimizationConfig {
	enabled: boolean;
	autoApply: boolean;
	riskLevel: "low" | "medium" | "high";
	targets: OptimizationTarget[];
	constraints: OptimizationConstraint[];
}

export interface OptimizationTarget {
	metric: string;
	target: number;
	priority: "low" | "medium" | "high";
	strategy: "minimize" | "maximize" | "stabilize";
}

export interface OptimizationConstraint {
	type: "resource" | "time" | "cost" | "risk";
	limit: number;
	hard: boolean;
}

export interface ProfilingConfig {
	enabled: boolean;
	interval: number;
	duration: number;
	triggers: string[];
	depth: number;
	sampling: number;
}

export interface AlertConfiguration {
	enabled: boolean;
	channels: AlertChannel[];
	rules: AlertRule[];
	escalation: EscalationConfig;
	suppression: SuppressionConfig;
	templates: AlertTemplate[];
}

export interface AlertChannel {
	type: "console" | "file" | "email" | "webhook" | "slack" | "memory";
	name: string;
	enabled: boolean;
	level: "info" | "warning" | "error" | "critical";
	config: any;
	rateLimiting: {
		enabled: boolean;
		maxPerMinute: number;
		maxPerHour: number;
	};
}

export interface AlertRule {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	conditions: AlertCondition[];
	actions: AlertAction[];
	metadata: {
		category: string;
		severity: "low" | "medium" | "high" | "critical";
		tags: string[];
	};
}

export interface AlertCondition {
	metric: string;
	operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
	threshold: number;
	duration: number;
	aggregation: "avg" | "sum" | "min" | "max" | "count";
}

export interface AlertAction {
	type: "notify" | "execute" | "escalate" | "suppress";
	target: string;
	parameters: any;
	delay: number;
	conditions: string[];
}

export interface EscalationConfig {
	enabled: boolean;
	levels: EscalationLevel[];
	maxLevel: number;
	cooldown: number;
}

export interface EscalationLevel {
	level: number;
	delay: number;
	actions: string[];
	recipients: string[];
	conditions: string[];
}

export interface SuppressionConfig {
	enabled: boolean;
	rules: SuppressionRule[];
	globalSuppression: boolean;
	maintenanceMode: boolean;
}

export interface SuppressionRule {
	id: string;
	name: string;
	conditions: string[];
	duration: number;
	reason: string;
	schedule?: {
		start: string;
		end: string;
		days: string[];
	};
}

export interface AlertTemplate {
	id: string;
	name: string;
	type: "text" | "html" | "json";
	subject: string;
	body: string;
	variables: string[];
	formatting: {
		colors: boolean;
		markdown: boolean;
		html: boolean;
	};
}

export interface DashboardConfiguration {
	enabled: boolean;
	port: number;
	host: string;
	authentication: AuthenticationConfig;
	themes: ThemeConfig[];
	panels: PanelConfig[];
	layout: LayoutConfig;
	realtime: RealtimeConfig;
	export: DashboardExportConfig;
}

export interface AuthenticationConfig {
	enabled: boolean;
	type: "basic" | "oauth" | "jwt";
	config: any;
}

export interface ThemeConfig {
	id: string;
	name: string;
	colors: { [key: string]: string };
	fonts: { [key: string]: string };
	spacing: { [key: string]: number };
}

export interface PanelConfig {
	id: string;
	title: string;
	type: "metric" | "chart" | "table" | "gauge" | "heatmap" | "log";
	enabled: boolean;
	position: { x: number; y: number; width: number; height: number };
	dataSource: DataSourceConfig;
	visualization: VisualizationConfig;
	refresh: RefreshConfig;
}

export interface DataSourceConfig {
	type: "metrics" | "alerts" | "logs" | "events";
	query: string;
	filters: FilterConfig[];
	aggregation: AggregationConfig;
}

export interface FilterConfig {
	field: string;
	operator: string;
	value: any;
	type: "include" | "exclude";
}

export interface AggregationConfig {
	method: "avg" | "sum" | "min" | "max" | "count";
	interval: number;
	groupBy: string[];
}

export interface VisualizationConfig {
	chartType: "line" | "bar" | "pie" | "scatter" | "area" | "gauge";
	colors: string[];
	axes: AxisConfig[];
	legend: LegendConfig;
	tooltip: TooltipConfig;
}

export interface AxisConfig {
	type: "x" | "y";
	label: string;
	min?: number;
	max?: number;
	scale: "linear" | "log" | "time";
}

export interface LegendConfig {
	enabled: boolean;
	position: "top" | "bottom" | "left" | "right";
	style: "list" | "table";
}

export interface TooltipConfig {
	enabled: boolean;
	format: "json" | "pdf" | "html" | "csv";
	shared: boolean;
}

export interface LayoutConfig {
	type: "grid" | "tabs" | "accordion";
	columns: number;
	rows: number;
	responsive: boolean;
}

export interface RealtimeConfig {
	enabled: boolean;
	updateInterval: number;
	maxDataPoints: number;
	compression: boolean;
}

export interface DashboardExportConfig {
	enabled: boolean;
	formats: string[];
	scheduled: boolean;
	retention: number;
}

export interface RefreshConfig {
	enabled: boolean;
	interval: number;
	onDemand: boolean;
}

export interface DiagnosticsConfiguration {
	enabled: boolean;
	interval: number;
	depth: "basic" | "detailed" | "comprehensive";
	components: string[];
	analysis: AnalysisConfig;
	reporting: DiagnosticReportingConfig;
}

export interface AnalysisConfig {
	performanceAnalysis: boolean;
	memoryAnalysis: boolean;
	errorAnalysis: boolean;
	trendAnalysis: boolean;
	correlationAnalysis: boolean;
}

export interface DiagnosticReportingConfig {
	enabled: boolean;
	formats: string[];
	schedule: string;
	retention: number;
}

export interface ReportingConfiguration {
	enabled: boolean;
	schedule: ScheduleConfig;
	formats: ReportFormat[];
	recipients: RecipientConfig[];
	content: ContentConfig;
	distribution: DistributionConfig;
}

export interface ScheduleConfig {
	daily: { enabled: boolean; time: string };
	weekly: { enabled: boolean; day: string; time: string };
	monthly: { enabled: boolean; day: number; time: string };
	custom: { enabled: boolean; cron: string };
}

export interface ReportFormat {
	type: "html" | "pdf" | "json" | "csv";
	template: string;
	options: any;
}

export interface RecipientConfig {
	type: "email" | "webhook" | "file";
	address: string;
	filters: string[];
}

export interface ContentConfig {
	metrics: boolean;
	alerts: boolean;
	performance: boolean;
	diagnostics: boolean;
	recommendations: boolean;
	charts: boolean;
}

export interface DistributionConfig {
	compression: boolean;
	encryption: boolean;
	retention: number;
}

export interface ExportConfiguration {
	enabled: boolean;
	formats: ExportFormat[];
	destinations: ExportDestination[];
	schedule: ExportSchedule;
	compression: CompressionConfig;
	encryption: EncryptionConfig;
}

export interface ExportFormat {
	type: "json" | "csv" | "parquet" | "prometheus";
	options: any;
}

export interface ExportDestination {
	type: "file" | "s3" | "gcs" | "azure" | "http";
	config: any;
}

export interface ExportSchedule {
	interval: number;
	batch: boolean;
	retry: RetryConfig;
}

export interface RetryConfig {
	enabled: boolean;
	maxAttempts: number;
	backoff: "linear" | "exponential";
	delay: number;
}

export interface CompressionConfig {
	enabled: boolean;
	algorithm: "gzip" | "brotli" | "lz4";
	level: number;
}

export interface EncryptionConfig {
	enabled: boolean;
	algorithm: "aes256" | "chacha20";
	keyRotation: number;
}

export interface IntegrationConfiguration {
	eventBus: EventBusConfig;
	logging: LoggingConfig;
	storage: StorageConfig;
	networking: NetworkingConfig;
	security: SecurityConfig;
}

export interface EventBusConfig {
	enabled: boolean;
	maxListeners: number;
	bufferSize: number;
	persistence: boolean;
}

export interface LoggingConfig {
	level: "debug" | "info" | "warn" | "error";
	format: "json" | "text";
	rotation: {
		enabled: boolean;
		maxSize: number;
		maxFiles: number;
	};
	destinations: LogDestination[];
}

export interface LogDestination {
	type: "file" | "console" | "syslog" | "http";
	config: any;
}

export interface StorageConfig {
	type: "memory" | "file" | "database";
	config: any;
	backup: BackupConfig;
}

export interface BackupConfig {
	enabled: boolean;
	interval: number;
	retention: number;
	compression: boolean;
}

export interface NetworkingConfig {
	timeout: number;
	retries: number;
	keepAlive: boolean;
	compression: boolean;
}

export interface SecurityConfig {
	authentication: boolean;
	authorization: boolean;
	encryption: boolean;
	auditing: boolean;
}

/**
 * Default monitoring configuration
 */
export const defaultMonitoringConfig: MonitoringConfiguration = {
	system: {
		enabled: true,
		metricsInterval: 5000,
		healthCheckInterval: 30000,
		retentionPeriod: 86400000, // 24 hours
		realTimeUpdates: true,
		thresholds: {
			cpu: { warning: 70, critical: 90 },
			memory: { warning: 80, critical: 95 },
			disk: { warning: 85, critical: 95 },
			network: { warning: 100, critical: 500 },
			responseTime: { warning: 1000, critical: 5000 },
			throughput: { warning: 100, critical: 10 },
			errorRate: { warning: 5, critical: 10 },
		},
		components: {
			cpu: {
				enabled: true,
				interval: 5000,
				thresholds: { warning: 70, critical: 90 },
				actions: ["log", "alert"],
			},
			memory: {
				enabled: true,
				interval: 5000,
				thresholds: { warning: 80, critical: 95 },
				actions: ["log", "alert"],
			},
			disk: {
				enabled: true,
				interval: 30000,
				thresholds: { warning: 85, critical: 95 },
				actions: ["log", "alert"],
			},
			network: {
				enabled: true,
				interval: 10000,
				thresholds: { warning: 100, critical: 500 },
				actions: ["log", "alert"],
			},
			agents: {
				enabled: true,
				interval: 15000,
				thresholds: { warning: 70, critical: 50 },
				actions: ["log", "alert"],
			},
			swarm: {
				enabled: true,
				interval: 10000,
				thresholds: { warning: 60, critical: 40 },
				actions: ["log", "alert"],
			},
		},
	},
	performance: {
		enabled: true,
		analysisInterval: 60000,
		benchmarkingEnabled: true,
		autoOptimization: false,
		thresholds: {
			responseTime: { excellent: 100, good: 500, acceptable: 1000, poor: 5000 },
			throughput: { excellent: 1000, good: 500, acceptable: 100, poor: 10 },
			latency: { excellent: 10, good: 50, acceptable: 100, poor: 500 },
			efficiency: { excellent: 95, good: 80, acceptable: 60, poor: 40 },
		},
		optimization: {
			enabled: true,
			autoApply: false,
			riskLevel: "low",
			targets: [
				{
					metric: "responseTime",
					target: 500,
					priority: "high",
					strategy: "minimize",
				},
				{
					metric: "throughput",
					target: 1000,
					priority: "high",
					strategy: "maximize",
				},
				{
					metric: "cpuUsage",
					target: 70,
					priority: "medium",
					strategy: "minimize",
				},
			],
			constraints: [
				{ type: "resource", limit: 90, hard: true },
				{ type: "cost", limit: 1000, hard: false },
			],
		},
		profiling: {
			enabled: false,
			interval: 300000,
			duration: 60000,
			triggers: ["high-cpu", "high-memory", "slow-response"],
			depth: 10,
			sampling: 1000,
		},
	},
	alerts: {
		enabled: true,
		channels: [
			{
				type: "console",
				name: "console",
				enabled: true,
				level: "warning",
				config: {},
				rateLimiting: { enabled: true, maxPerMinute: 10, maxPerHour: 100 },
			},
			{
				type: "file",
				name: "file",
				enabled: true,
				level: "info",
				config: { path: "./logs/alerts.log" },
				rateLimiting: { enabled: false, maxPerMinute: 0, maxPerHour: 0 },
			},
			{
				type: "memory",
				name: "memory",
				enabled: true,
				level: "info",
				config: { retention: 86400000 },
				rateLimiting: { enabled: false, maxPerMinute: 0, maxPerHour: 0 },
			},
		],
		rules: [],
		escalation: {
			enabled: true,
			levels: [
				{
					level: 1,
					delay: 300000,
					actions: ["notify"],
					recipients: ["admin"],
					conditions: [],
				},
				{
					level: 2,
					delay: 900000,
					actions: ["escalate"],
					recipients: ["manager"],
					conditions: [],
				},
			],
			maxLevel: 2,
			cooldown: 1800000,
		},
		suppression: {
			enabled: true,
			rules: [],
			globalSuppression: false,
			maintenanceMode: false,
		},
		templates: [
			{
				id: "default",
				name: "Default Alert",
				type: "text",
				subject: "Alert: {{alert.title}}",
				body: "Alert: {{alert.message}}\nSeverity: {{alert.level}}\nTime: {{alert.timestamp}}",
				variables: [
					"alert.title",
					"alert.message",
					"alert.level",
					"alert.timestamp",
				],
				formatting: { colors: false, markdown: false, html: false },
			},
		],
	},
	dashboard: {
		enabled: true,
		port: 3000,
		host: "localhost",
		authentication: {
			enabled: false,
			type: "basic",
			config: {},
		},
		themes: [
			{
				id: "dark",
				name: "Dark Theme",
				colors: {
					primary: "#007bff",
					secondary: "#6c757d",
					success: "#28a745",
					warning: "#ffc107",
					danger: "#dc3545",
					background: "#212529",
					text: "#ffffff",
				},
				fonts: {
					primary: "Arial, sans-serif",
					mono: "Consolas, monospace",
				},
				spacing: {
					small: 8,
					medium: 16,
					large: 24,
				},
			},
		],
		panels: [],
		layout: {
			type: "grid",
			columns: 12,
			rows: 8,
			responsive: true,
		},
		realtime: {
			enabled: true,
			updateInterval: 5000,
			maxDataPoints: 1000,
			compression: true,
		},
		export: {
			enabled: true,
			formats: ["json", "csv", "png"],
			scheduled: true,
			retention: 604800000, // 7 days
		},
	},
	diagnostics: {
		enabled: true,
		interval: 300000, // 5 minutes
		depth: "detailed",
		components: ["system", "application", "performance", "network"],
		analysis: {
			performanceAnalysis: true,
			memoryAnalysis: true,
			errorAnalysis: true,
			trendAnalysis: true,
			correlationAnalysis: false,
		},
		reporting: {
			enabled: true,
			formats: ["json", "html"],
			schedule: "daily",
			retention: 2592000000, // 30 days
		},
	},
	reporting: {
		enabled: true,
		schedule: {
			daily: { enabled: true, time: "00:00" },
			weekly: { enabled: true, day: "sunday", time: "00:00" },
			monthly: { enabled: true, day: 1, time: "00:00" },
			custom: { enabled: false, cron: "" },
		},
		formats: [
			{ type: "html", template: "default", options: {} },
			{ type: "json", template: "default", options: {} },
		],
		recipients: [],
		content: {
			metrics: true,
			alerts: true,
			performance: true,
			diagnostics: true,
			recommendations: true,
			charts: true,
		},
		distribution: {
			compression: true,
			encryption: false,
			retention: 2592000000, // 30 days
		},
	},
	export: {
		enabled: true,
		formats: [
			{ type: "json", options: {} },
			{ type: "csv", options: {} },
		],
		destinations: [
			{ type: "file", config: { path: "./logs/monitoring-export" } },
		],
		schedule: {
			interval: 3600000, // 1 hour
			batch: true,
			retry: {
				enabled: true,
				maxAttempts: 3,
				backoff: "exponential",
				delay: 1000,
			},
		},
		compression: {
			enabled: true,
			algorithm: "gzip",
			level: 6,
		},
		encryption: {
			enabled: false,
			algorithm: "aes256",
			keyRotation: 86400000,
		},
	},
	integration: {
		eventBus: {
			enabled: true,
			maxListeners: 100,
			bufferSize: 10000,
			persistence: true,
		},
		logging: {
			level: "info",
			format: "json",
			rotation: {
				enabled: true,
				maxSize: 10485760, // 10MB
				maxFiles: 10,
			},
			destinations: [
				{ type: "file", config: { path: "./logs/monitoring.log" } },
				{ type: "console", config: {} },
			],
		},
		storage: {
			type: "memory",
			config: {},
			backup: {
				enabled: true,
				interval: 3600000,
				retention: 86400000,
				compression: true,
			},
		},
		networking: {
			timeout: 30000,
			retries: 3,
			keepAlive: true,
			compression: true,
		},
		security: {
			authentication: false,
			authorization: false,
			encryption: false,
			auditing: true,
		},
	},
};

/**
 * Configuration validation
 */
export function validateMonitoringConfig(
	config: Partial<MonitoringConfiguration>
): string[] {
	const errors: string[] = [];

	// Validate system configuration
	if (config.system?.enabled && config.system.metricsInterval < 1000) {
		errors.push("System metrics interval must be at least 1000ms");
	}

	// Validate performance configuration
	if (
		config.performance?.enabled &&
		config.performance.analysisInterval < 30000
	) {
		errors.push("Performance analysis interval must be at least 30000ms");
	}

	// Validate dashboard configuration
	if (config.dashboard?.enabled) {
		if (config.dashboard.port < 1 || config.dashboard.port > 65535) {
			errors.push("Dashboard port must be between 1 and 65535");
		}
	}

	// Validate alert configuration
	if (config.alerts?.enabled && config.alerts.channels.length === 0) {
		errors.push("At least one alert channel must be configured");
	}

	return errors;
}

/**
 * Merge configurations
 */
export function mergeMonitoringConfig(
	base: MonitoringConfiguration,
	override: Partial<MonitoringConfiguration>
): MonitoringConfiguration {
	return {
		...base,
		...override,
		system: { ...base.system, ...override.system },
		performance: { ...base.performance, ...override.performance },
		alerts: { ...base.alerts, ...override.alerts },
		dashboard: { ...base.dashboard, ...override.dashboard },
		diagnostics: { ...base.diagnostics, ...override.diagnostics },
		reporting: { ...base.reporting, ...override.reporting },
		export: { ...base.export, ...override.export },
		integration: { ...base.integration, ...override.integration },
	};
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): Partial<MonitoringConfiguration> {
	const env = process.env.NODE_ENV || "development";

	switch (env) {
		case "production":
			return {
				system: {
					enabled: true,
					metricsInterval: 5000,
					healthCheckInterval: 30000,
					retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
					realTimeUpdates: true,
					thresholds: {
						cpu: { warning: 80, critical: 95 },
						memory: { warning: 80, critical: 95 },
						disk: { warning: 80, critical: 95 },
						network: { warning: 80, critical: 95 },
						responseTime: { warning: 1000, critical: 5000 },
						throughput: { warning: 100, critical: 10 },
						errorRate: { warning: 0.01, critical: 0.05 },
					},
					components: {
						cpu: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 80, critical: 95 },
							actions: ["log", "alert"],
						},
						memory: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 80, critical: 95 },
							actions: ["log", "alert"],
						},
						disk: {
							enabled: true,
							interval: 5000,
							thresholds: { warning: 80, critical: 95 },
							actions: ["log", "alert"],
						},
						network: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 80, critical: 95 },
							actions: ["log", "alert"],
						},
						agents: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 80, critical: 95 },
							actions: ["log", "alert"],
						},
						swarm: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 80, critical: 95 },
							actions: ["log", "alert"],
						},
					},
				},
				performance: {
					enabled: true,
					analysisInterval: 60000,
					benchmarkingEnabled: true,
					autoOptimization: false,
					thresholds: {
						responseTime: {
							excellent: 100,
							good: 500,
							acceptable: 1000,
							poor: 2000,
						},
						throughput: {
							excellent: 1000,
							good: 500,
							acceptable: 100,
							poor: 10,
						},
						latency: { excellent: 50, good: 200, acceptable: 500, poor: 1000 },
						efficiency: {
							excellent: 0.9,
							good: 0.8,
							acceptable: 0.7,
							poor: 0.5,
						},
					},
					optimization: {
						enabled: true,
						autoApply: false,
						riskLevel: "low",
						targets: [],
						constraints: [],
					},
					profiling: {
						enabled: true,
						interval: 60000,
						duration: 30000,
						triggers: ["high_cpu", "high_memory"],
						depth: 10,
						sampling: 0.1,
					},
				},
				alerts: {
					enabled: true,
					channels: [],
					rules: [],
					escalation: {
						enabled: false,
						levels: [],
						maxLevel: 3,
						cooldown: 300000,
					},
					suppression: {
						enabled: false,
						rules: [],
						globalSuppression: false,
						maintenanceMode: false,
					},
					templates: [],
				},
				dashboard: {
					enabled: true,
					port: 8080,
					host: "localhost",
					authentication: { enabled: true, type: "oauth", config: {} },
					themes: [],
					panels: [],
					layout: {
						type: "grid",
						columns: 3,
						rows: 3,
						responsive: true,
					},
					realtime: {
						enabled: true,
						updateInterval: 1000,
						maxDataPoints: 1000,
						compression: true,
					},
					export: {
						enabled: true,
						formats: ["json", "csv", "pdf"],
						scheduled: false,
						retention: 30,
					},
				},
			};

		case "test":
			return {
				system: {
					enabled: true,
					metricsInterval: 10000,
					healthCheckInterval: 60000,
					retentionPeriod: 3 * 24 * 60 * 60 * 1000, // 3 days
					realTimeUpdates: false,
					thresholds: {
						cpu: { warning: 90, critical: 98 },
						memory: { warning: 90, critical: 98 },
						disk: { warning: 90, critical: 98 },
						network: { warning: 90, critical: 98 },
						responseTime: { warning: 2000, critical: 10000 },
						throughput: { warning: 50, critical: 5 },
						errorRate: { warning: 0.05, critical: 0.1 },
					},
					components: {
						cpu: {
							enabled: true,
							interval: 5000,
							thresholds: { warning: 90, critical: 98 },
							actions: ["log"],
						},
						memory: {
							enabled: true,
							interval: 5000,
							thresholds: { warning: 90, critical: 98 },
							actions: ["log"],
						},
						disk: {
							enabled: true,
							interval: 10000,
							thresholds: { warning: 90, critical: 98 },
							actions: ["log"],
						},
						network: {
							enabled: true,
							interval: 5000,
							thresholds: { warning: 90, critical: 98 },
							actions: ["log"],
						},
						agents: {
							enabled: true,
							interval: 5000,
							thresholds: { warning: 90, critical: 98 },
							actions: ["log"],
						},
						swarm: {
							enabled: true,
							interval: 5000,
							thresholds: { warning: 90, critical: 98 },
							actions: ["log"],
						},
					},
				},
				performance: {
					enabled: true,
					analysisInterval: 120000,
					benchmarkingEnabled: false,
					autoOptimization: true,
					thresholds: {
						responseTime: {
							excellent: 200,
							good: 1000,
							acceptable: 2000,
							poor: 5000,
						},
						throughput: { excellent: 500, good: 200, acceptable: 50, poor: 10 },
						latency: {
							excellent: 100,
							good: 500,
							acceptable: 1000,
							poor: 2000,
						},
						efficiency: {
							excellent: 0.8,
							good: 0.7,
							acceptable: 0.6,
							poor: 0.4,
						},
					},
					optimization: {
						enabled: true,
						autoApply: true,
						riskLevel: "medium",
						targets: [],
						constraints: [],
					},
					profiling: {
						enabled: false,
						interval: 120000,
						duration: 60000,
						triggers: [],
						depth: 5,
						sampling: 0.01,
					},
				},
			};

		case "development":
		default:
			return {
				system: {
					enabled: true,
					metricsInterval: 5000,
					healthCheckInterval: 30000,
					retentionPeriod: 24 * 60 * 60 * 1000, // 1 day
					realTimeUpdates: true,
					thresholds: {
						cpu: { warning: 70, critical: 90 },
						memory: { warning: 70, critical: 90 },
						disk: { warning: 70, critical: 90 },
						network: { warning: 70, critical: 90 },
						responseTime: { warning: 1000, critical: 3000 },
						throughput: { warning: 200, critical: 20 },
						errorRate: { warning: 0.02, critical: 0.1 },
					},
					components: {
						cpu: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 70, critical: 90 },
							actions: ["log"],
						},
						memory: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 70, critical: 90 },
							actions: ["log"],
						},
						disk: {
							enabled: true,
							interval: 5000,
							thresholds: { warning: 70, critical: 90 },
							actions: ["log"],
						},
						network: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 70, critical: 90 },
							actions: ["log"],
						},
						agents: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 70, critical: 90 },
							actions: ["log"],
						},
						swarm: {
							enabled: true,
							interval: 1000,
							thresholds: { warning: 70, critical: 90 },
							actions: ["log"],
						},
					},
				},
				performance: {
					enabled: true,
					analysisInterval: 60000,
					benchmarkingEnabled: true,
					autoOptimization: false,
					thresholds: {
						responseTime: {
							excellent: 100,
							good: 300,
							acceptable: 1000,
							poor: 3000,
						},
						throughput: {
							excellent: 1000,
							good: 500,
							acceptable: 200,
							poor: 50,
						},
						latency: { excellent: 50, good: 150, acceptable: 500, poor: 1000 },
						efficiency: {
							excellent: 0.9,
							good: 0.8,
							acceptable: 0.7,
							poor: 0.5,
						},
					},
					optimization: {
						enabled: false,
						autoApply: false,
						riskLevel: "low",
						targets: [],
						constraints: [],
					},
					profiling: {
						enabled: true,
						interval: 60000,
						duration: 30000,
						triggers: ["manual"],
						depth: 20,
						sampling: 1.0,
					},
				},
				alerts: {
					enabled: true,
					channels: [
						{
							type: "console",
							name: "console",
							enabled: true,
							level: "info",
							config: {},
							rateLimiting: { enabled: false, maxPerMinute: 0, maxPerHour: 0 },
						},
					],
					rules: [],
					escalation: {
						enabled: false,
						levels: [],
						maxLevel: 1,
						cooldown: 60000,
					},
					suppression: {
						enabled: false,
						rules: [],
						globalSuppression: false,
						maintenanceMode: false,
					},
					templates: [],
				},
				dashboard: {
					enabled: true,
					port: 3000,
					host: "localhost",
					authentication: { enabled: false, type: "basic", config: {} },
					themes: [],
					panels: [],
					layout: {
						type: "grid",
						columns: 2,
						rows: 2,
						responsive: true,
					},
					realtime: {
						enabled: true,
						updateInterval: 1000,
						maxDataPoints: 500,
						compression: false,
					},
					export: {
						enabled: true,
						formats: ["json"],
						scheduled: false,
						retention: 7,
					},
				},
			};
	}
}
