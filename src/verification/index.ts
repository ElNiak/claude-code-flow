/**
 * Verification System - Main Entry Point
 * Exports all verification functionality for code, todos, and task validation
 */

export {
  VerificationService,
  createVerificationService,
  quickVerify,
  
  // Types
  type VerificationConfig,
  type VerificationResult,
  type TodoItem,
  type TodoVerificationResult,
  type WorkflowStep,
  type WorkflowVerificationResult,
  type VerificationStats,
  type HealthCheckResult
} from './verification-service.js';

// Re-export as default for convenience
export { VerificationService as default } from './verification-service.js';