/**
 * Event system type definitions to prevent unknown type errors
 */

// Base event interface,
export interface BaseEvent {
	_type: string;
	timestamp: Date;
	source?: string;
}

// Performance metric event,
export interface PerformanceMetricEvent extends BaseEvent {
	name: string;
	value: number;
	unit?: string;
	labels?: Record<string, string>;
}

// System error event,
export interface SystemErrorEvent extends BaseEvent {
	_component: string;
	error: string | Error;
	message?: string;
	stack?: string;
	severity: "low" | "medium" | "high" | "critical";
}

// Task events,
export interface TaskEvent extends BaseEvent {
	taskId: string;
	agentId?: string;
	status: "started" | "completed" | "failed" | "cancelled";
}

export interface TaskCompletedEvent extends TaskEvent {
	status: "completed";
	result: Record<string, unknown>;
	duration?: number;
}

export interface TaskFailedEvent extends TaskEvent {
	_status: "failed";
	error: Error | string;
	reason?: string;
}

// Agent events,
export interface AgentEvent extends BaseEvent {
	agentId: string;
	action: "spawned" | "terminated" | "idle" | "busy" | "error" | "heartbeat";
}

export interface AgentHeartbeatEvent extends AgentEvent {
	action: "heartbeat";
	load: number;
	status: "healthy" | "degraded" | "unhealthy";
}

// Memory events,
export interface MemoryEvent extends BaseEvent {
	operation: "store" | "retrieve" | "delete" | "sync";
	key?: string;
	namespace?: string;
	success: boolean;
}

// MCP Tool input interfaces,
export interface MCPToolInput {
	[key: string]: unknown;
}

export interface MCPContext {
	sessionId?: string;
	userId?: string;
	metadata?: Record<string, unknown>;
}

// Type guards for events,
export function isPerformanceMetricEvent(
	event: unknown
): event is PerformanceMetricEvent {
	return !!(
		event &&
		typeof event === "object" &&
		"name" in event &&
		"value" in event &&
		typeof (event as any).name === "string" &&
		typeof (event as any).value === "number"
	);
}

export function isSystemErrorEvent(event: unknown): event is SystemErrorEvent {
	return !!(
		event &&
		typeof event === "object" &&
		"component" in event &&
		("error" in event || "message" in event)
	);
}

export function isTaskEvent(event: unknown): event is TaskEvent {
	return !!(
		event &&
		typeof event === "object" &&
		"taskId" in event &&
		typeof (event as any).taskId === "string"
	);
}

export function isAgentEvent(event: unknown): event is AgentEvent {
	return !!(
		event &&
		typeof event === "object" &&
		"agentId" in event &&
		typeof (event as any).agentId === "string"
	);
}
