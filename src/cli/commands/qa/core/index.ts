/**
 * Verification System - Main Entry Point
 * Exports all verification functionality for code, todos, and task validation
 */

// Re-export as default for convenience
export {
	createVerificationService,
	type HealthCheckResult,
	quickVerify,
	type TodoItem,
	type TodoVerificationResult,
	// Types
	type VerificationConfig,
	type VerificationResult,
	VerificationService,
	VerificationService as default,
	type VerificationStats,
	type WorkflowStep,
	type WorkflowVerificationResult,
} from "./verification-service.js";
