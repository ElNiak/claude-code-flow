#!/usr/bin/env node

/**
 * Test intelligent agent auto-selection for hive spawn command
 */

import { QueenCoordinator } from "./src/cli/simple-commands/hive-mind/queen.js";

console.log("🧪 TESTING INTELLIGENT HIVE SPAWN AUTO-SELECTION");
console.log("=".repeat(60));

// Test scenarios with different objectives
const testScenarios = [
	{
		objective: "Build a scalable microservices API with authentication",
		expected: ["researcher", "coder", "architect", "tester"],
	},
	{
		objective: "Create a frontend React application with user interface",
		expected: ["researcher", "coder", "reviewer", "tester"],
	},
	{
		objective: "Optimize database performance and analytics",
		expected: ["researcher", "analyst", "architect", "optimizer"],
	},
	{
		objective: "Document the codebase and create user guides",
		expected: ["researcher", "documenter", "reviewer"],
	},
	{
		objective: "Build enterprise security system with monitoring",
		expected: ["researcher", "coder", "architect", "tester", "optimizer"],
	},
	{
		objective: "Simple script to process data files",
		expected: ["researcher", "coder", "tester"],
	},
];

// Simulate the determineOptimalWorkerTypes function
async function simulateDetermineOptimalWorkerTypes(
	objective,
	showDetails = true,
) {
	if (showDetails) {
		console.log(
			chalk.blue("🧠 Analyzing objective for optimal agent selection..."),
		);
	}

	try {
		// Create a Queen coordinator for analysis
		const queen = new QueenCoordinator({
			swarmId: "test-swarm",
			type: "strategic",
			objective,
		});

		// Get Queen's analysis of the objective
		const analysis = await queen.analyzeObjective(objective);
		const requiredCapabilities = analysis.requiredCapabilities;
		const complexity = analysis.complexity;

		if (showDetails) {
			console.log(chalk.cyan("📊 Queen Analysis Results:"));
			console.log(chalk.gray(`  - Complexity: ${complexity}`));
			console.log(
				chalk.gray(
					`  - Components: ${analysis.requiredCapabilities.join(", ")}`,
				),
			);
			console.log(chalk.gray(`  - Strategy: ${analysis.recommendedStrategy}`));
		}

		// Start with queen-recommended capabilities
		const recommendedTypes = new Set(requiredCapabilities);

		// Add strategic worker types based on complexity and objective content
		const objectiveLower = objective.toLowerCase();

		// High complexity projects need architects and optimizers
		if (complexity === "high" || complexity === "very_high") {
			recommendedTypes.add("architect");
			recommendedTypes.add("optimizer");
		}

		// Documentation keywords suggest documenter
		if (
			objectiveLower.includes("document") ||
			objectiveLower.includes("guide") ||
			objectiveLower.includes("readme") ||
			objectiveLower.includes("docs")
		) {
			recommendedTypes.add("documenter");
		}

		// Quality/review keywords suggest reviewer
		if (
			objectiveLower.includes("review") ||
			objectiveLower.includes("audit") ||
			objectiveLower.includes("refactor") ||
			complexity !== "low"
		) {
			recommendedTypes.add("reviewer");
		}

		// Enterprise/production keywords suggest additional specialists
		if (
			objectiveLower.includes("enterprise") ||
			objectiveLower.includes("production") ||
			objectiveLower.includes("scale") ||
			objectiveLower.includes("security")
		) {
			recommendedTypes.add("architect");
			recommendedTypes.add("optimizer");
			recommendedTypes.add("tester");
		}

		// API/backend keywords suggest coders and testers
		if (
			objectiveLower.includes("api") ||
			objectiveLower.includes("backend") ||
			objectiveLower.includes("service") ||
			objectiveLower.includes("endpoint")
		) {
			recommendedTypes.add("coder");
			recommendedTypes.add("tester");
		}

		// Frontend/UI keywords suggest coders and reviewers
		if (
			objectiveLower.includes("frontend") ||
			objectiveLower.includes("ui") ||
			objectiveLower.includes("interface") ||
			objectiveLower.includes("web")
		) {
			recommendedTypes.add("coder");
			recommendedTypes.add("reviewer");
		}

		// Database/data keywords suggest analysts and architects
		if (
			objectiveLower.includes("database") ||
			objectiveLower.includes("data") ||
			objectiveLower.includes("storage") ||
			objectiveLower.includes("analytics")
		) {
			recommendedTypes.add("analyst");
			recommendedTypes.add("architect");
		}

		// Always include researcher for initial analysis
		recommendedTypes.add("researcher");

		// Convert to array and ensure we have valid types
		const allWorkerTypes = [
			"researcher",
			"coder",
			"architect",
			"analyst",
			"tester",
			"optimizer",
			"documenter",
			"reviewer",
		];
		const finalTypes = Array.from(recommendedTypes).filter((type) =>
			allWorkerTypes.includes(type),
		);

		// Ensure we have at least 3 and at most 8 worker types
		const minTypes = 3;
		const maxTypes = 8;

		if (finalTypes.length < minTypes) {
			// Add essential types if we're under minimum
			const essentialTypes = ["researcher", "coder", "tester"];
			essentialTypes.forEach((type) => {
				if (!finalTypes.includes(type)) {
					finalTypes.push(type);
				}
			});
		}

		if (finalTypes.length > maxTypes) {
			// Prioritize types based on objective analysis
			const priorityOrder = [
				...requiredCapabilities, // Queen's recommendations come first
				"researcher",
				"coder",
				"architect",
				"tester",
				"analyst",
				"optimizer",
				"reviewer",
				"documenter",
			];

			const prioritizedTypes = [];
			priorityOrder.forEach((type) => {
				if (finalTypes.includes(type) && prioritizedTypes.length < maxTypes) {
					prioritizedTypes.push(type);
				}
			});

			finalTypes.splice(0, finalTypes.length, ...prioritizedTypes);
		}

		return {
			selectedTypes: finalTypes,
			analysis: {
				complexity,
				requiredCapabilities,
				strategy: analysis.recommendedStrategy,
			},
		};
	} catch (error) {
		console.warn(
			"⚠️ Queen analysis failed, using enhanced defaults:",
			error.message,
		);

		// Fallback: Enhanced default selection based on objective keywords
		const objectiveLower = objective.toLowerCase();
		const enhancedDefaults = new Set(["researcher", "coder"]);

		// Add types based on objective keywords
		if (
			objectiveLower.includes("api") ||
			objectiveLower.includes("backend") ||
			objectiveLower.includes("microservice") ||
			objectiveLower.includes("system")
		) {
			enhancedDefaults.add("architect");
			enhancedDefaults.add("tester");
		}

		if (
			objectiveLower.includes("frontend") ||
			objectiveLower.includes("ui") ||
			objectiveLower.includes("web")
		) {
			enhancedDefaults.add("reviewer");
			enhancedDefaults.add("tester");
		}

		if (
			objectiveLower.includes("data") ||
			objectiveLower.includes("analytics") ||
			objectiveLower.includes("database")
		) {
			enhancedDefaults.add("analyst");
			enhancedDefaults.add("architect");
		}

		if (
			objectiveLower.includes("performance") ||
			objectiveLower.includes("optimize") ||
			objectiveLower.includes("scale")
		) {
			enhancedDefaults.add("optimizer");
		}

		if (
			objectiveLower.includes("document") ||
			objectiveLower.includes("guide")
		) {
			enhancedDefaults.add("documenter");
		}

		// Always include tester for quality
		enhancedDefaults.add("tester");

		const fallbackTypes = Array.from(enhancedDefaults);

		return {
			selectedTypes: fallbackTypes,
			analysis: {
				complexity: "unknown",
				requiredCapabilities: [],
				strategy: "fallback",
			},
		};
	}
}

// Mock chalk for simple testing
const chalk = {
	blue: (str) => `[BLUE] ${str}`,
	cyan: (str) => `[CYAN] ${str}`,
	gray: (str) => `[GRAY] ${str}`,
	green: (str) => `[GREEN] ${str}`,
	yellow: (str) => `[YELLOW] ${str}`,
	bold: (str) => `[BOLD] ${str}`,
};

async function runTests() {
	for (let i = 0; i < testScenarios.length; i++) {
		const scenario = testScenarios[i];

		console.log(`\n${i + 1}️⃣ Testing: "${scenario.objective}"`);
		console.log("─".repeat(50));

		const result = await simulateDetermineOptimalWorkerTypes(
			scenario.objective,
			true,
		);

		console.log(`✨ Selected Types: ${result.selectedTypes.join(", ")}`);
		console.log(`📊 Complexity: ${result.analysis.complexity}`);
		console.log(`🎯 Strategy: ${result.analysis.strategy}`);

		// Show reasoning
		const reasoning = [];
		if (result.analysis.requiredCapabilities.length > 0) {
			reasoning.push(
				`Components: ${result.analysis.requiredCapabilities.join(", ")}`,
			);
		}

		const objectiveLower = scenario.objective.toLowerCase();
		if (
			result.analysis.complexity === "high" ||
			result.analysis.complexity === "very_high"
		) {
			reasoning.push("High complexity: added architect, optimizer");
		}
		if (objectiveLower.includes("document")) {
			reasoning.push("Documentation needs: added documenter");
		}
		if (objectiveLower.includes("api") || objectiveLower.includes("backend")) {
			reasoning.push("Backend/API project: added coder, tester");
		}
		if (objectiveLower.includes("frontend") || objectiveLower.includes("ui")) {
			reasoning.push("Frontend project: added coder, reviewer");
		}
		if (
			objectiveLower.includes("database") ||
			objectiveLower.includes("analytics")
		) {
			reasoning.push("Data project: added analyst, architect");
		}
		if (
			objectiveLower.includes("enterprise") ||
			objectiveLower.includes("security")
		) {
			reasoning.push("Enterprise/security: added architect, optimizer, tester");
		}

		if (reasoning.length > 0) {
			console.log("📝 Reasoning:");
			reasoning.forEach((reason) => {
				console.log(`  - ${reason}`);
			});
		}
	}

	console.log("\n🎉 All intelligent selection tests completed!");
	console.log("\n🚀 Ready to test with real hive spawn command:");
	console.log(
		'   claude-flow hive-mind spawn "Build scalable microservices API"',
	);
	console.log(
		'   claude-flow hive-mind spawn "Create React frontend application"',
	);
	console.log('   claude-flow hive-mind spawn "Optimize database performance"');
}

runTests().catch(console.error);
