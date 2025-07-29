/**
 * Performance monitoring type definitions
 */

export interface PerformanceMetric {
	_metric: string;
	value: number | string;
	timestamp?: Date;
	component?: string;
}

export interface StrategyPerformance {
	successRate: number;
	averageTime: number;
	errorRate: number;
	lastUpdated: Date;
	metrics: Record<string, number>;
}

export interface PerformanceEvent {
	metric: string;
	value: number | string;
	component?: string;
	timestamp: Date;
}

export interface ComponentStatus {
	component: string;
	status: "healthy" | "unhealthy" | "warning";
	message?: string;
	timestamp: Date;
}

export interface SystemEvent {
	type: string;
	component?: string;
	error?: Error;
	data?: unknown;
	timestamp: Date;
}

export interface MCPCoordinationInput {
	sessionId: string;
	action: string;
	data?: unknown;
	agentIds?: string[];
}
