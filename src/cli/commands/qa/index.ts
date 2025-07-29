/**
 * QA Command - Quality Assurance and Verification Tools
 * Provides code verification, todo validation, and task instruction checking
 */

// Re-export verification functionality
export {
	createVerificationService,
	type HealthCheckResult,
	quickVerify,
	type TodoItem,
	type TodoVerificationResult,
	type VerificationConfig,
	type VerificationResult,
	VerificationService,
	type VerificationStats,
	type WorkflowStep,
	type WorkflowVerificationResult,
} from "./core/index.js";

// TODO: Future CLI command exports will go here
// export { verifyCodeCommand } from './commands/verify-code.js';
// export { verifyTodosCommand } from './commands/verify-todos.js';
// export { verifyTasksCommand } from './commands/verify-tasks.js';
