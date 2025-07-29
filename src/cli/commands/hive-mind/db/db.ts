/**
 * TypeScript interfaces for Hive Mind database results
 * Fixes unknown type assertions and provides proper typing for SQLite query results
 */

// Database result interfaces based on schema
export interface DbSwarm {
	id: string;
	name: string;
	objective?: string;
	queen_type?: string;
	status: string;
	created_at: string;
	updated_at?: string;
}

export interface DbAgent {
	id: string;
	swarm_id: string;
	name: string;
	type: string;
	role: string;
	status: string;
	capabilities?: string;
	current_task_id?: string;
	message_count: number;
	error_count: number;
	success_count: number;
	created_at: string;
	last_active_at?: string;
	metadata?: string;
}

export interface DbTask {
	id: string;
	swarm_id: string;
	description: string;
	priority: string;
	strategy: string;
	status: string;
	progress: number;
	result?: string;
	error?: string;
	dependencies?: string;
	assigned_agents?: string;
	require_consensus: boolean;
	consensus_achieved?: boolean;
	max_agents: number;
	required_capabilities?: string;
	created_at: string;
	assigned_at?: string;
	started_at?: string;
	completed_at?: string;
	metadata?: string;
}

export interface DbConsensusDecision {
	id: string;
	task_id?: string;
	proposal: string;
	required_threshold: number;
	current_votes: number;
	total_voters: number;
	votes: string;
	status: string;
	created_at: string;
	deadline_at?: string;
	completed_at?: string;
	swarm_name?: string;
	topic?: string;
	decision?: string;
	algorithm?: string;
	confidence?: number;
}

export interface DbMemory {
	key: string;
	namespace: string;
	value: string;
	ttl?: number;
	access_count: number;
	last_accessed_at: string;
	created_at: string;
	expires_at?: string;
	metadata?: string;
}

// Aggregate query result interfaces
export interface TaskStatsResult {
	total: number;
	completed: number;
	in_progress: number;
	pending: number;
	failed?: number;
}

export interface CountResult {
	count: number;
}

export interface MemoryCountResult extends CountResult {}

export interface ConsensusCountResult extends CountResult {}

// Type guards for runtime type checking
export function isDbSwarm(obj: unknown): obj is DbSwarm {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as DbSwarm).id === "string" &&
		typeof (obj as DbSwarm).name === "string" &&
		typeof (obj as DbSwarm).status === "string"
	);
}

export function isDbAgent(obj: unknown): obj is DbAgent {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as DbAgent).id === "string" &&
		typeof (obj as DbAgent).swarm_id === "string" &&
		typeof (obj as DbAgent).name === "string" &&
		typeof (obj as DbAgent).type === "string" &&
		typeof (obj as DbAgent).status === "string"
	);
}

export function isTaskStatsResult(obj: unknown): obj is TaskStatsResult {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as TaskStatsResult).total === "number" &&
		typeof (obj as TaskStatsResult).completed === "number" &&
		typeof (obj as TaskStatsResult).in_progress === "number" &&
		typeof (obj as TaskStatsResult).pending === "number"
	);
}

export function isCountResult(obj: unknown): obj is CountResult {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as CountResult).count === "number"
	);
}

export function isDbConsensusDecision(
	obj: unknown,
): obj is DbConsensusDecision {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as DbConsensusDecision).id === "string" &&
		typeof (obj as DbConsensusDecision).swarm_id === "string" &&
		typeof (obj as DbConsensusDecision).status === "string"
	);
}

// Error type interface for proper error handling
export interface TypedError extends Error {
	message: string;
	name: string;
	stack?: string;
}

// Type guard for errors
export function isTypedError(error: unknown): error is TypedError {
	return (
		error instanceof Error ||
		(typeof error === "object" &&
			error !== null &&
			typeof (error as TypedError).message === "string")
	);
}

// Helper function to safely extract error message
export function getErrorMessage(error: unknown): string {
	if (isTypedError(error)) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	return "Unknown error occurred";
}
