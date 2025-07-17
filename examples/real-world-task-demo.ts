#!/usr/bin/env node
/**
 * Real-World Task Demonstration
 *
 * Shows how the enhanced task system works with actual development scenarios
 */

import chalk from "chalk";

// Simulated CLI usage examples
function demonstrateRealWorldUsage() {
	console.log(chalk.bold.cyan("🌍 REAL-WORLD TASK VALIDATION DEMO"));
	console.log(
		chalk.gray(
			"Demonstrating enhanced Claude Flow task system with practical examples\n",
		),
	);

	console.log(chalk.bold("📋 Example 1: API Development Task"));
	console.log(chalk.gray("─".repeat(50)));
	console.log(chalk.white("Command:"));
	console.log(chalk.green("npx claude-flow hive-mind task \\"));
	console.log(
		chalk.green('  "Implement REST API for user management with JWT auth" \\'),
	);
	console.log(
		chalk.green("  --spec examples/task-spec-templates/api-spec.yaml \\"),
	);
	console.log(chalk.green("  --validation-mode advisory \\"));
	console.log(chalk.green("  --priority high"));

	console.log(chalk.blue("\n📊 Expected Output:"));
	console.log(chalk.green("✅ Task validation passed"));
	console.log(chalk.blue("📋 Task Details:"));
	console.log(chalk.blue("   Task ID: task_api_001"));
	console.log(chalk.blue("   Priority: 🔴 high"));
	console.log(chalk.blue("   Strategy: adaptive"));
	console.log(chalk.blue("   Status: pending"));
	console.log(chalk.blue("🔍 Validation Summary:"));
	console.log(chalk.blue("   Specification Compliant: ✅"));
	console.log(chalk.blue("   Risk Level: 🟢 low"));
	console.log(chalk.blue("   Confidence: 92.5%"));

	console.log(chalk.bold("\n📋 Example 2: Frontend Component Task"));
	console.log(chalk.gray("─".repeat(50)));
	console.log(chalk.white("Command:"));
	console.log(chalk.green("npx claude-flow hive-mind task \\"));
	console.log(
		chalk.green(
			'  "Create responsive user profile component with accessibility" \\',
		),
	);
	console.log(chalk.green("  --generate-spec frontend \\"));
	console.log(chalk.green("  --spec-output profile-component-spec.yaml \\"));
	console.log(chalk.green("  --validate"));

	console.log(chalk.blue("\n📊 Expected Output:"));
	console.log(chalk.green("✅ Specification generated successfully!"));
	console.log(chalk.blue("📋 Generated Specification:"));
	console.log(chalk.blue("   Type: frontend"));
	console.log(chalk.blue("   Confidence: 87.3%"));
	console.log(chalk.blue("   Preconditions: 3 files, 3 tools"));
	console.log(chalk.blue("   Outputs: 4 expected"));
	console.log(
		chalk.green("✅ Specification saved to: profile-component-spec.yaml"),
	);

	console.log(chalk.bold("\n📋 Example 3: Data Processing Task"));
	console.log(chalk.gray("─".repeat(50)));
	console.log(chalk.white("Command:"));
	console.log(chalk.green("npx claude-flow hive-mind task \\"));
	console.log(
		chalk.green(
			'  "Process customer transaction data and generate monthly reports" \\',
		),
	);
	console.log(chalk.green("  --interactive \\"));
	console.log(chalk.green("  --validation-mode strict"));

	console.log(chalk.blue("\n📊 Interactive Prompts:"));
	console.log(chalk.yellow("? Select task priority: ▸ high"));
	console.log(
		chalk.yellow(
			"? Select execution strategy: ▸ Parallel (Fast, multiple agents)",
		),
	);
	console.log(
		chalk.yellow("? Require consensus for critical decisions? ▸ Yes"),
	);
	console.log(chalk.yellow("? Maximum agents to assign: ▸ 5"));
	console.log(
		chalk.yellow(
			"? Required agent capabilities: ▸ data_analysis, pattern_recognition",
		),
	);

	console.log(chalk.blue("\n📊 Validation Results:"));
	console.log(chalk.yellow("⚠️ Task has validation warnings"));
	console.log(chalk.yellow("⚠️ Warnings:"));
	console.log(
		chalk.yellow(
			"  • Large dataset processing may require memory optimization",
		),
	);
	console.log(
		chalk.yellow("  • Consider breaking into smaller batch operations"),
	);
	console.log(chalk.green("✅ Task submitted successfully!"));

	console.log(chalk.bold("\n📋 Example 4: Critical System Task (Strict Mode)"));
	console.log(chalk.gray("─".repeat(50)));
	console.log(chalk.white("Command:"));
	console.log(chalk.green("npx claude-flow hive-mind task \\"));
	console.log(
		chalk.green('  "Implement secure payment processing with encryption" \\'),
	);
	console.log(chalk.green("  --validation-mode strict \\"));
	console.log(chalk.green("  --priority critical"));

	console.log(chalk.blue("\n📊 Strict Validation Output:"));
	console.log(chalk.red("❌ Task validation failed"));
	console.log(chalk.red("🚨 Validation Issues:"));
	console.log(chalk.red("  • Missing security compliance specification"));
	console.log(chalk.red("  • No encryption standards defined"));
	console.log(chalk.red("  • PCI DSS requirements not addressed"));
	console.log(chalk.blue("💡 Suggestions:"));
	console.log(chalk.blue("  • Add formal security specification"));
	console.log(
		chalk.blue("  • Define encryption algorithms and key management"),
	);
	console.log(chalk.blue("  • Include compliance validation steps"));

	console.log(chalk.bold("\n📋 Example 5: Machine Learning Task"));
	console.log(chalk.gray("─".repeat(50)));
	console.log(chalk.white("Command:"));
	console.log(chalk.green("npx claude-flow hive-mind task \\"));
	console.log(
		chalk.green(
			'  "Train sentiment analysis model on customer feedback data" \\',
		),
	);
	console.log(chalk.green("  --generate-spec ml \\"));
	console.log(chalk.green("  --validate \\"));
	console.log(chalk.green("  --assign-to specialist"));

	console.log(chalk.blue("\n📊 ML Task Results:"));
	console.log(chalk.green("✅ Specification generated successfully!"));
	console.log(chalk.green("✅ Task validation passed"));
	console.log(chalk.blue("📋 Task Details:"));
	console.log(chalk.blue("   Task ID: task_ml_sentiment_001"));
	console.log(chalk.blue("   Assigned to: specialist"));
	console.log(
		chalk.blue("   Required Capabilities: pattern_recognition, data_analysis"),
	);
	console.log(chalk.blue("🔍 Validation Summary:"));
	console.log(
		chalk.blue("   Expected Outputs: model.pkl, evaluation.json, metrics.csv"),
	);
	console.log(
		chalk.blue("   Quality Requirements: accuracy ≥ 85%, precision ≥ 80%"),
	);
	console.log(chalk.blue("   Resource Requirements: 8GB RAM, 4 CPU cores"));

	console.log(chalk.bold("\n📋 Example 6: Specification File Usage"));
	console.log(chalk.gray("─".repeat(50)));
	console.log(chalk.white("1. Create specification file (api-task.yaml):"));
	console.log(
		chalk.gray(`
name: "User Authentication API"
description: "Secure JWT-based authentication system"
preconditions:
  files:
    - path: "src/types/user.ts"
      type: "exists"
  tools:
    - name: "node"
      version: ">=18.0.0"
postconditions:
  outputs:
    - type: "file"
      path: "src/auth/jwt.ts"
    - type: "file"
      path: "tests/auth.test.ts"
  quality:
    coverage: 90
verification:
  static:
    - tool: "typescript"
  dynamic:
    - type: "unit"
      framework: "jest"
  `),
	);

	console.log(chalk.white("2. Use specification with task:"));
	console.log(chalk.green("npx claude-flow hive-mind task \\"));
	console.log(chalk.green('  "Implement JWT authentication system" \\'));
	console.log(chalk.green("  --spec api-task.yaml \\"));
	console.log(chalk.green("  --watch"));

	console.log(chalk.blue("\n📊 Watching Output:"));
	console.log(chalk.green("✅ Task validation passed"));
	console.log(chalk.blue("👀 Watching task progress..."));
	console.log(chalk.blue("Progress |████████████████████| 100% | Completed"));
	console.log(chalk.blue("📊 Task Result:"));
	console.log(chalk.blue("   Status: completed"));
	console.log(chalk.blue("   Duration: 4m 32s"));
	console.log(
		chalk.blue("   Files Created: src/auth/jwt.ts, tests/auth.test.ts"),
	);
	console.log(chalk.blue("   Test Coverage: 92%"));

	console.log(chalk.bold.green("\n🎉 REAL-WORLD VALIDATION BENEFITS"));
	console.log(chalk.gray("═".repeat(60)));
	console.log(
		chalk.green("✅ Pre-execution validation prevents impossible tasks"),
	);
	console.log(
		chalk.green("✅ Specification files ensure consistent task definitions"),
	);
	console.log(
		chalk.green("✅ Auto-generation reduces specification creation time"),
	);
	console.log(
		chalk.green("✅ Risk assessment helps prioritize task execution"),
	);
	console.log(chalk.green("✅ Quality requirements ensure reliable outputs"));
	console.log(
		chalk.green("✅ Performance monitoring tracks execution efficiency"),
	);
	console.log(
		chalk.green("✅ Backward compatibility maintains existing workflows"),
	);

	console.log(chalk.bold.blue("\n🚀 Ready for Production Use!"));
	console.log(
		chalk.blue("The enhanced task system provides formal validation while"),
	);
	console.log(
		chalk.blue("maintaining the simplicity and power of Claude Flow."),
	);
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
	demonstrateRealWorldUsage();
}

export { demonstrateRealWorldUsage };
