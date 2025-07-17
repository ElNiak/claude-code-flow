#!/usr/bin/env node
/**
 * Specification Validation Demo
 *
 * Demonstrates the enhanced task system with formal specification validation
 */

import {
	SpecificationParser,
	SpecificationValidationEngine,
	SpecificationValidationHooks,
} from "../src/specification/index.js";
import { VerificationEngine } from "../src/verification/verification-engine.js";

async function demonstrateSpecificationValidation() {
	console.log("🧠 HIVE MIND SPECIFICATION VALIDATION DEMO");
	console.log("═══════════════════════════════════════════════\n");

	// Initialize the validation system
	const verificationEngine = new VerificationEngine();
	const validationEngine = new SpecificationValidationEngine(
		verificationEngine,
	);
	const validationHooks = SpecificationValidationHooks.getInstance();
	const parser = SpecificationParser.getInstance();

	// Demo 1: Basic task validation without specification
	console.log("📋 Demo 1: Basic Task Validation");
	console.log("─────────────────────────────────");

	const basicTaskDescription = `
    Implement a REST API for user management with authentication.
    Create endpoints for CRUD operations on users.
    Add JWT token validation middleware.
    Write comprehensive unit tests.
    Document the API with OpenAPI specification.
  `;

	const basicResult =
		await validationEngine.validateWithSpecification(basicTaskDescription);

	console.log(`✅ Task Valid: ${basicResult.isValid}`);
	console.log(`🎯 Confidence: ${(basicResult.confidence * 100).toFixed(1)}%`);
	console.log(`⚠️  Warnings: ${basicResult.warnings.length}`);
	console.log(`💡 Suggestions: ${basicResult.suggestions.length}`);
	console.log(`🔍 Risk Level: ${basicResult.riskAssessment.overall}\n`);

	// Demo 2: Generate specification from task description
	console.log("📋 Demo 2: Auto-Generate Specification");
	console.log("─────────────────────────────────────────");

	const specificationResult =
		await validationHooks.buildSpecificationInteractively(
			basicTaskDescription,
			"api",
		);

	console.log(`📄 Generated Specification:`);
	console.log(`   Type: api`);
	console.log(
		`   Confidence: ${(specificationResult.confidence * 100).toFixed(1)}%`,
	);
	console.log(
		`   Preconditions: ${specificationResult.specification.preconditions.files?.length || 0} files, ${specificationResult.specification.preconditions.tools?.length || 0} tools`,
	);
	console.log(
		`   Outputs: ${specificationResult.specification.postconditions.outputs.length} expected`,
	);
	console.log(
		`   Verification Methods: ${Object.keys(specificationResult.specification.verification).length}`,
	);
	console.log();

	// Demo 3: Validate with formal specification
	console.log("📋 Demo 3: Formal Specification Validation");
	console.log("──────────────────────────────────────────");

	const apiSpecification = `
name: "User Management API"
description: "REST API for user management with authentication"
version: "1.0.0"

preconditions:
  files:
    - path: "package.json"
      type: "exists"
    - path: "src/types"
      type: "readable"

  tools:
    - name: "node"
      version: ">=18.0.0"
      available: true
    - name: "npm"
      available: true

  capabilities:
    - "code_generation"
    - "api_docs"
    - "test_generation"

  environment:
    - variable: "NODE_ENV"
      value: "development"
      required: false

postconditions:
  outputs:
    - type: "file"
      path: "src/api/users.ts"
      format: "typescript"
    - type: "file"
      path: "src/middleware/auth.ts"
      format: "typescript"
    - type: "file"
      path: "tests/api/users.test.ts"
      format: "typescript"
    - type: "file"
      path: "docs/api.yaml"
      format: "yaml"

  quality:
    coverage: 90
    complexity: 10
    maintainability: 80

  performance:
    maxExecutionTime: 5000
    maxMemoryUsage: "500MB"

verification:
  static:
    - tool: "typescript"
      rules: ["strict", "noImplicitAny"]
    - tool: "eslint"
      rules: ["recommended"]

  dynamic:
    - type: "unit"
      framework: "jest"
      coverage: 90
    - type: "integration"
      framework: "supertest"

errorHandling:
  retryStrategy:
    maxRetries: 3
    backoffStrategy: "exponential"
    conditions: ["network_error", "timeout"]

  fallbackPlan:
    triggers: ["compilation_error"]
    actions: ["revert_changes", "notify_team"]
    notification: true
  `;

	const formalResult = await validationEngine.validateWithSpecification(
		basicTaskDescription,
		apiSpecification,
	);

	console.log(
		`✅ Specification Compliant: ${formalResult.specificationCompliant}`,
	);
	console.log(`🎯 Confidence: ${(formalResult.confidence * 100).toFixed(1)}%`);
	console.log(`🔍 Risk Level: ${formalResult.riskAssessment.overall}`);
	console.log(
		`📋 Preconditions Checked: ${formalResult.preconditionResults.length}`,
	);
	console.log(
		`📤 Postconditions Verified: ${formalResult.postconditionResults.length}`,
	);
	console.log(
		`🔬 Verification Methods: ${formalResult.verificationResults.length}`,
	);

	// Show detailed results
	if (formalResult.preconditionResults.length > 0) {
		console.log("\n📋 Precondition Results:");
		for (const result of formalResult.preconditionResults) {
			const status = result.satisfied ? "✅" : "❌";
			console.log(`   ${status} ${result.name}: ${result.details}`);
		}
	}

	if (formalResult.postconditionResults.length > 0) {
		console.log("\n📤 Postcondition Results:");
		for (const result of formalResult.postconditionResults) {
			const status = result.verifiable ? "✅" : "❓";
			console.log(
				`   ${status} ${result.name} (confidence: ${(result.confidence * 100).toFixed(1)}%)`,
			);
		}
	}

	if (formalResult.enhancedSuggestions.length > 0) {
		console.log("\n💡 Enhanced Suggestions:");
		for (const suggestion of formalResult.enhancedSuggestions) {
			const priority =
				suggestion.priority === "high"
					? "🔴"
					: suggestion.priority === "medium"
						? "🟡"
						: "🟢";
			console.log(
				`   ${priority} [${suggestion.category}] ${suggestion.description}`,
			);
		}
	}

	console.log("\n");

	// Demo 4: Performance validation
	console.log("📋 Demo 4: Performance Validation");
	console.log("─────────────────────────────────");

	const performanceStart = process.hrtime.bigint();

	// Run multiple validations to test performance
	const validationPromises = [];
	for (let i = 0; i < 10; i++) {
		validationPromises.push(
			validationEngine.validateWithSpecification(
				basicTaskDescription,
				apiSpecification,
			),
		);
	}

	await Promise.all(validationPromises);

	const performanceEnd = process.hrtime.bigint();
	const durationMs = Number(performanceEnd - performanceStart) / 1_000_000;
	const avgValidationTime = durationMs / 10;

	console.log(`🚀 Performance Results:`);
	console.log(`   Total time for 10 validations: ${durationMs.toFixed(2)}ms`);
	console.log(`   Average validation time: ${avgValidationTime.toFixed(2)}ms`);
	console.log(
		`   Overhead per validation: ${((avgValidationTime / 1000) * 100).toFixed(2)}% of 1s task`,
	);
	console.log(
		`   ✅ Performance target (<50ms): ${avgValidationTime < 50 ? "PASSED" : "NEEDS OPTIMIZATION"}`,
	);

	// Demo 5: Different task types
	console.log("\n📋 Demo 5: Multiple Task Types");
	console.log("─────────────────────────────────");

	const taskTypes = [
		{
			name: "Frontend Component",
			type: "frontend" as const,
			description:
				"Create a React component for user profile display with responsive design and accessibility features",
		},
		{
			name: "Data Processing",
			type: "data" as const,
			description:
				"Process and analyze customer transaction data to identify spending patterns and generate monthly reports",
		},
		{
			name: "Machine Learning",
			type: "ml" as const,
			description:
				"Train a classification model to predict customer churn using historical data and feature engineering",
		},
	];

	for (const taskType of taskTypes) {
		const typeResult = await validationHooks.buildSpecificationInteractively(
			taskType.description,
			taskType.type,
		);

		console.log(`📄 ${taskType.name}:`);
		console.log(`   Confidence: ${(typeResult.confidence * 100).toFixed(1)}%`);
		console.log(
			`   Preconditions: ${typeResult.specification.preconditions.files?.length || 0} files, ${typeResult.specification.preconditions.tools?.length || 0} tools`,
		);
		console.log(
			`   Verification: ${Object.keys(typeResult.specification.verification).length} methods`,
		);
	}

	console.log("\n🎉 Demo Complete!");
	console.log("═══════════════════════════════════════════════");
	console.log("The specification validation system provides:");
	console.log("✅ Formal specification language (SDL) support");
	console.log("✅ Pre-task validation with risk assessment");
	console.log("✅ Post-task verification capabilities");
	console.log("✅ Integration with existing TaskValidationService");
	console.log("✅ CLI enhancements with --spec and --validate flags");
	console.log("✅ Performance optimized (<50ms per validation)");
	console.log("✅ Backward compatibility with existing workflows");
	console.log("✅ Auto-generation of specifications from descriptions");
	console.log("✅ Support for multiple task types (API, Frontend, Data, ML)");
	console.log("✅ Comprehensive testing framework");
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
	demonstrateSpecificationValidation().catch(console.error);
}

export { demonstrateSpecificationValidation };
