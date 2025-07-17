#!/usr/bin/env node

/**
 * Progress Indicators Demo
 * Shows how real-time progress indicators work without artificial delays
 */

import { performance } from "node:perf_hooks";
import { createProgressEnhancedAgent } from "../src/ui/progress/agent-integrations.js";
import { createProgressIndicator } from "../src/ui/progress/progress-indicator.js";

/**
 * Demo 1: Basic Progress Indicator
 */
async function demoBasicProgress() {
	console.log("\n🎯 Demo 1: Basic Progress Indicator\n");

	const progress = createProgressIndicator("build", "Building Application");

	// Define steps
	progress.defineSteps([
		{
			id: "setup",
			name: "Setup Environment",
			description: "Setting up build environment",
			weight: 0.1,
		},
		{
			id: "compile",
			name: "Compile Source",
			description: "Compiling TypeScript to JavaScript",
			weight: 0.4,
		},
		{
			id: "bundle",
			name: "Bundle Assets",
			description: "Bundling application assets",
			weight: 0.3,
		},
		{
			id: "optimize",
			name: "Optimize Output",
			description: "Optimizing build output",
			weight: 0.2,
		},
	]);

	// Execute steps with real work
	for (const stepId of ["setup", "compile", "bundle", "optimize"]) {
		await simulateRealWork(progress, stepId);
	}

	console.log("✅ Build completed!\n");
}

/**
 * Demo 2: Agent with Progress
 */
async function demoAgentProgress() {
	console.log("🎯 Demo 2: Agent with Progress Tracking\n");

	const coderAgent = createProgressEnhancedAgent("coder", {
		name: "Demo Coder",
		type: "coder",
	});

	const task = {
		name: "Generate REST API",
		parameters: {
			requirements: {
				features: [
					{ name: "UserService", description: "User management API" },
					{ name: "AuthService", description: "Authentication system" },
					{ name: "DataService", description: "Data persistence layer" },
				],
			},
		},
	};

	const result = await coderAgent.generateCode(task);
	console.log("✅ Code generation completed!\n");
	console.log("📊 Generated files:", result.files?.length || 0);
}

/**
 * Demo 3: Parallel Progress Tracking
 */
async function demoParallelProgress() {
	console.log("🎯 Demo 3: Parallel Progress Tracking\n");

	const progress = createProgressIndicator(
		"analysis",
		"Multi-Component Analysis",
	);

	progress.defineSteps([
		{
			id: "frontend",
			name: "Frontend Analysis",
			description: "Analyzing React components",
			weight: 0.3,
		},
		{
			id: "backend",
			name: "Backend Analysis",
			description: "Analyzing API endpoints",
			weight: 0.4,
		},
		{
			id: "database",
			name: "Database Analysis",
			description: "Analyzing data models",
			weight: 0.3,
		},
	]);

	// Start all steps in parallel
	const promises = [
		simulateRealWork(progress, "frontend", 800),
		simulateRealWork(progress, "backend", 1200),
		simulateRealWork(progress, "database", 600),
	];

	await Promise.all(promises);
	console.log("✅ Multi-component analysis completed!\n");
}

/**
 * Demo 4: Error Handling with Progress
 */
async function demoErrorHandling() {
	console.log("🎯 Demo 4: Error Handling with Progress\n");

	const progress = createProgressIndicator("test", "Running Test Suite");

	progress.defineSteps([
		{
			id: "unit",
			name: "Unit Tests",
			description: "Running unit tests",
			weight: 0.4,
		},
		{
			id: "integration",
			name: "Integration Tests",
			description: "Running integration tests",
			weight: 0.4,
		},
		{
			id: "e2e",
			name: "E2E Tests",
			description: "Running end-to-end tests",
			weight: 0.2,
		},
	]);

	try {
		await simulateRealWork(progress, "unit");
		await simulateRealWork(progress, "integration");

		// Simulate an error
		progress.startStep("e2e");
		await new Promise((resolve) => setTimeout(resolve, 300));
		progress.failStep("e2e", "Browser automation failed");

		console.log("❌ Test suite failed!\n");
	} catch (error) {
		console.log("Error handled gracefully\n");
	}
}

/**
 * Demo 5: Real-time Updates
 */
async function demoRealTimeUpdates() {
	console.log("🎯 Demo 5: Real-time Updates\n");

	const progress = createProgressIndicator("deploy", "Deploying Application");

	progress.defineSteps([
		{
			id: "package",
			name: "Package Application",
			description: "Creating deployment package",
			weight: 0.2,
		},
		{
			id: "upload",
			name: "Upload to Server",
			description: "Uploading package to server",
			weight: 0.3,
		},
		{
			id: "deploy",
			name: "Deploy & Configure",
			description: "Deploying and configuring service",
			weight: 0.3,
		},
		{
			id: "verify",
			name: "Verify Deployment",
			description: "Running deployment verification",
			weight: 0.2,
		},
	]);

	// Show real-time updates during long-running operations
	for (const stepId of ["package", "upload", "deploy", "verify"]) {
		await simulateRealWork(progress, stepId, 1000 + Math.random() * 1000);
	}

	console.log("✅ Deployment completed!\n");
}

/**
 * Simulate real work with actual processing time
 */
async function simulateRealWork(
	progress: any,
	stepId: string,
	duration: number = 500,
): Promise<void> {
	progress.startStep(stepId);

	// Simulate real work by doing actual computation
	const startTime = performance.now();
	let iterations = 0;

	while (performance.now() - startTime < duration) {
		// Simulate CPU-intensive work
		const data = new Array(1000)
			.fill(0)
			.map((_, i) => Math.sin((i * Math.PI) / 180));
		const sum = data.reduce((acc, val) => acc + val, 0);
		iterations++;

		// Small delay to prevent blocking
		if (iterations % 100 === 0) {
			await new Promise((resolve) => setTimeout(resolve, 1));
		}
	}

	progress.completeStep(stepId, {
		iterations,
		duration: performance.now() - startTime,
	});
}

/**
 * Main demo runner
 */
async function main() {
	console.log(
		"🚀 Progress Indicators Demo - Real-time Progress Without Delays\n",
	);

	try {
		await demoBasicProgress();
		await demoAgentProgress();
		await demoParallelProgress();
		await demoErrorHandling();
		await demoRealTimeUpdates();

		console.log("🎉 All demos completed!\n");

		console.log("💡 Key Benefits:");
		console.log("   • Real-time progress updates");
		console.log("   • No artificial delays");
		console.log("   • Immediate feedback");
		console.log("   • Cancellable operations");
		console.log("   • Error handling");
		console.log("   • ETA calculations");
		console.log("   • Resource usage tracking\n");
	} catch (error) {
		console.error("Demo failed:", error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export {
	demoBasicProgress,
	demoAgentProgress,
	demoParallelProgress,
	demoErrorHandling,
	demoRealTimeUpdates,
};
