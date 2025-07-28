/**
 * Swarm system TypeScript interfaces
 * Part of Phase 1B TypeScript migration architecture
 */

export type SwarmStrategy =
	| "auto"
	| "research"
	| "development"
	| "analysis"
	| "testing"
	| "optimization"
	| "maintenance";

export type CoordinationMode =
	| "centralized"
	| "distributed"
	| "hierarchical"
	| "mesh"
	| "hybrid";

export type AgentSelectionStrategy =
	| "capability-based"
	| "random"
	| "round-robin"
	| "load-balanced";

export type TaskSchedulingAlgorithm =
	| "priority"
	| "fifo"
	| "deadline"
	| "shortest-job";

export type LoadBalancingMethod =
	| "work-stealing"
	| "round-robin"
	| "least-loaded"
	| "random";

export type FaultToleranceStrategy =
	| "retry"
	| "failover"
	| "circuit-breaker"
	| "graceful-degradation";

export interface SwarmConfiguration {
	strategy: SwarmStrategy;
	mode: CoordinationMode;
	maxAgents: number;
	timeout: number;
	taskTimeoutMinutes: number;
	parallel: boolean;
	distributed: boolean;
	monitor: boolean;
	ui: boolean;
	background: boolean;
	review: boolean;
	testing: boolean;
	encryption: boolean;
	verbose: boolean;
	dryRun: boolean;
	executor: boolean;
	outputFormat: "json" | "text";
	outputFile?: string;
	noInteractive: boolean;
	noAutoPermissions: boolean;
	testMode: boolean;
	qualityThreshold: number;
	memoryNamespace: string;
	agentSelection?: AgentSelectionStrategy;
	taskScheduling?: TaskSchedulingAlgorithm;
	loadBalancing?: LoadBalancingMethod;
	faultTolerance?: FaultToleranceStrategy;
	sparc: boolean;
}

export interface SwarmExecutionContext {
	objective: string;
	config: SwarmConfiguration;
	swarmId: string;
	startTime: string;
}

export interface SwarmResult {
	success: boolean;
	swarmId: string;
	exitCode?: number;
	testMode?: boolean;
	output?: any;
	error?: string;
}

export interface SwarmGuidance {
	strategy: string;
	mode: string;
	agents: string;
}

export interface SwarmAgentRecommendation {
	type: string;
	name: string;
	role: string;
	capabilities: string[];
}

export interface SwarmExecutionPlan {
	phases: SwarmPhase[];
	estimatedDuration: number;
	requiredAgents: SwarmAgentRecommendation[];
	dependencies: string[];
}

export interface SwarmPhase {
	name: string;
	description: string;
	tasks: SwarmTask[];
	dependencies: string[];
	estimatedDuration: number;
}

export interface SwarmTask {
	id: string;
	name: string;
	description: string;
	assignedAgent?: string;
	dependencies: string[];
	priority: "high" | "medium" | "low";
	estimatedDuration: number;
}
