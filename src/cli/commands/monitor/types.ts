/**
 * Consolidated Monitoring Types
 * All monitoring-related types in one location
 */

// Re-export types from comprehensive monitoring system
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
} from "./comprehensive-system.js";
// Re-export configuration types
export type {
	AlertConfiguration,
	DashboardConfiguration,
	DiagnosticsConfiguration,
	ExportConfiguration,
	IntegrationConfiguration,
	MonitoringConfiguration,
	PerformanceMonitoringConfig,
	ReportingConfiguration,
	SystemMonitoringConfig,
} from "./config.js";
// Re-export types from monitoring integration
export type {
	AlertingConfig,
	DashboardIntegrationConfig,
	ExportConfig,
	MonitoringAggregation,
	MonitoringEvent,
	MonitoringIntegrationConfig,
	MonitoringSystemStatus,
	ReportingConfig,
} from "./integration.js";
// Re-export types from performance analyzer
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

// CLI-specific monitoring types
export interface MonitorCommandOptions {
	interval?: number;
	format?: "pretty" | "json";
	watch?: boolean;
	continuous?: boolean;
}

export interface MonitorSubcommand {
	name: string;
	description: string;
	execute: (args: string[], options: MonitorCommandOptions) => Promise<void>;
}

export interface SystemMetricsSnapshot {
	timestamp: number;
	system: {
		uptime: number;
		cpu_usage: number;
		memory_usage: number;
		disk_usage: number;
	};
	orchestrator: {
		status: string;
		active_agents: number;
		queued_tasks: number;
		completed_tasks: number;
		errors: number;
	};
	performance: {
		avg_task_duration: number;
		throughput: number;
		success_rate: number;
	};
	resources: {
		memory_entries: number;
		terminal_sessions: number;
		mcp_connections: number;
	};
}
