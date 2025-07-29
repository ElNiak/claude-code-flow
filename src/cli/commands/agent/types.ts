/**
 * Agent system TypeScript interfaces
 * Part of Phase 1B TypeScript migration architecture
 */

export type AgentType =
	| "researcher"
	| "coder"
	| "analyst"
	| "coordinator"
	| "tester"
	| "architect"
	| "reviewer"
	| "optimizer"
	| "documenter";

export type AgentStatus =
	| "spawned"
	| "active"
	| "idle"
	| "terminated"
	| "unhealthy";

export interface AgentConfiguration {
	id: string;
	type: AgentType;
	name?: string;
	capabilities: string[];
	status: AgentStatus;
	timestamp: string;
	sessionId?: string;
	parentId?: string;
}

export interface AgentSpawnOptions {
	type: AgentType;
	name?: string;
	verbose?: boolean;
	json?: boolean;
	force?: boolean;
}

export interface AgentListOptions {
	detailed?: boolean;
	json?: boolean;
	pattern?: string;
	type?: AgentType;
	status?: AgentStatus;
	sessionId?: string;
	verbose?: boolean;
}

export interface AgentCommandContext {
	args: string[];
	flags: Record<string, any>;
	command: string;
}

export interface AgentHierarchy {
	parent?: string;
	children: string[];
	level: number;
}

export interface AgentNetwork {
	connections: string[];
	messageRoutes: Record<string, string[]>;
	resourceSharing: boolean;
}

export interface AgentEcosystem {
	memoryPools: string[];
	resourceAllocation: Record<string, number>;
	taskDistribution: Record<string, string[]>;
	performanceMetrics: Record<string, any>;
}
