#!/usr/bin/env node

/**
 * Test Suite for Batch Initialization Features
 */

import {
	batchInitCommand,
	ENVIRONMENT_CONFIGS,
	PROJECT_TEMPLATES,
	validateBatchOptions,
} from "../src/cli/simple-commands/init/batch-init.js";
import { afterEach, beforeEach, describe, expect, it } from "../test.utils.ts";

// Test configuration
const TEST_DIR = "./test-batch-output";

// Cleanup function
async function cleanup() {
	try {
		await Deno.remove(TEST_DIR, { recursive: true });
	} catch {
		// Directory doesn't exist, which is fine
	}
}

// Setup test environment
async function setup() {
	await cleanup();
	await Deno.mkdir(TEST_DIR, { recursive: true });
	Deno.chdir(TEST_DIR);
}

// Test 1: Validate batch options
Deno.test("Batch Options Validation", () => {
	console.log("🧪 Testing batch options validation...");

	// Valid options
	let errors = validateBatchOptions({
		maxConcurrency: 5,
		template: "web-api",
		environments: ["dev", "staging"],
	});
	expect(errors.length).toBe(0, "Valid options should pass validation");

	// Invalid max concurrency
	errors = validateBatchOptions({
		maxConcurrency: 25,
	});
	expect(
		errors.some((e) => e.includes("maxConcurrency").toBeTruthy()),
		"High concurrency should fail",
	);

	// Invalid template
	errors = validateBatchOptions({
		template: "invalid-template",
	});
	expect(
		errors.some((e) => e.includes("template").toBeTruthy()),
		"Invalid template should fail",
	);

	// Invalid environment
	errors = validateBatchOptions({
		environments: ["invalid-env"],
	});
	expect(
		errors.some((e) => e.includes("environment").toBeTruthy()),
		"Invalid environment should fail",
	);

	console.log("✅ Batch options validation tests passed");
});

// Test 2: Project templates validation
Deno.test("Project Templates", () => {
	console.log("🧪 Testing project templates...");

	// Check that all templates have required properties
	for (const [key, template] of Object.entries(PROJECT_TEMPLATES)) {
		expect(template.name, `Template ${key} should have a name`).toBeTruthy();
		expect(
			template.description,
			`Template ${key} should have a description`,
		).toBeTruthy();
		expect(
			Array.isArray(template.extraDirs).toBeTruthy(),
			`Template ${key} should have extraDirs array`,
		);
		expect(
			typeof template.extraFiles === "object",
			`Template ${key} should have extraFiles object`,
		).toBeTruthy();
	}

	// Check specific templates
	expect(
		PROJECT_TEMPLATES["web-api"],
		"web-api template should exist",
	).toBeTruthy();
	expect(
		PROJECT_TEMPLATES["react-app"],
		"react-app template should exist",
	).toBeTruthy();
	expect(
		PROJECT_TEMPLATES["microservice"],
		"microservice template should exist",
	).toBeTruthy();
	expect(
		PROJECT_TEMPLATES["cli-tool"],
		"cli-tool template should exist",
	).toBeTruthy();

	console.log("✅ Project templates tests passed");
});

// Test 3: Environment configurations validation
Deno.test("Environment Configurations", () => {
	console.log("🧪 Testing environment configurations...");

	// Check that all environments have required properties
	for (const [key, env] of Object.entries(ENVIRONMENT_CONFIGS)) {
		expect(env.name, `Environment ${key} should have a name`).toBeTruthy();
		expect(
			Array.isArray(env.features).toBeTruthy(),
			`Environment ${key} should have features array`,
		);
		expect(
			typeof env.config === "object",
			`Environment ${key} should have config object`,
		).toBeTruthy();
	}

	// Check specific environments
	expect(
		ENVIRONMENT_CONFIGS["dev"],
		"dev environment should exist",
	).toBeTruthy();
	expect(
		ENVIRONMENT_CONFIGS["staging"],
		"staging environment should exist",
	).toBeTruthy();
	expect(
		ENVIRONMENT_CONFIGS["prod"],
		"prod environment should exist",
	).toBeTruthy();

	console.log("✅ Environment configurations tests passed");
});

// Test 4: Batch initialization with minimal setup
Deno.test("Batch Initialization - Minimal", async () => {
	console.log("🧪 Testing minimal batch initialization...");

	await setup();

	const projects = ["test-project-1", "test-project-2"];
	const options = {
		parallel: false, // Sequential for testing
		minimal: true,
		progressTracking: false, // Disable progress tracking for testing
	};

	const results = await batchInitCommand(projects, options);

	expect(results.length).toBe(2, "Should create 2 projects");
	expect(
		results.every((r) => r.success).toBeTruthy(),
		"All projects should be created successfully",
	);

	// Check that projects were created
	for (const project of projects) {
		const stats = await Deno.stat(project);
		expect(stats.isDirectory, `${project} should be a directory`).toBeTruthy();

		// Check for essential files
		await Deno.stat(`${project}/CLAUDE.md`);
		await Deno.stat(`${project}/memory-bank.md`);
		await Deno.stat(`${project}/coordination.md`);
		await Deno.stat(`${project}/memory/claude-flow-data.json`);
	}

	console.log("✅ Minimal batch initialization tests passed");
	await cleanup();
});

// Test 5: Template-based initialization
Deno.test("Template-Based Initialization", async () => {
	console.log("🧪 Testing template-based initialization...");

	await setup();

	const projects = ["api-project"];
	const options = {
		parallel: false,
		template: "web-api",
		progressTracking: false,
	};

	const results = await batchInitCommand(projects, options);

	expect(results.length).toBe(1, "Should create 1 project");
	expect(
		results[0].success,
		"Project should be created successfully",
	).toBeTruthy();

	// Check template-specific files
	const projectDir = projects[0];
	await Deno.stat(`${projectDir}/package.json`);
	await Deno.stat(`${projectDir}/src/index.js`);
	await Deno.stat(`${projectDir}/src`);

	// Check package.json content
	const packageJson = JSON.parse(
		await Deno.readTextFile(`${projectDir}/package.json`),
	);
	expect(packageJson.name).toBe("api-project");
	expect(
		packageJson.dependencies.express,
		"Should have Express dependency",
	).toBeTruthy();

	console.log("✅ Template-based initialization tests passed");
	await cleanup();
});

// Test 6: Multi-environment initialization
Deno.test("Multi-Environment Initialization", async () => {
	console.log("🧪 Testing multi-environment initialization...");

	await setup();

	const projects = ["multi-env-app"];
	const options = {
		parallel: false,
		environments: ["dev", "staging"],
		progressTracking: false,
	};

	const results = await batchInitCommand(projects, options);

	expect(results.length).toBe(2, "Should create 2 environment variants");
	expect(
		results.every((r) => r.success).toBeTruthy(),
		"All environments should be created successfully",
	);

	// Check that both environments were created
	await Deno.stat("multi-env-app-dev");
	await Deno.stat("multi-env-app-staging");

	// Check environment-specific configuration
	const devData = JSON.parse(
		await Deno.readTextFile("multi-env-app-dev/memory/claude-flow-data.json"),
	);
	const stagingData = JSON.parse(
		await Deno.readTextFile(
			"multi-env-app-staging/memory/claude-flow-data.json",
		),
	);

	expect(devData.environment).toBe("dev");
	expect(stagingData.environment).toBe("staging");

	console.log("✅ Multi-environment initialization tests passed");
	await cleanup();
});

// Test 7: Error handling
Deno.test("Error Handling", async () => {
	console.log("🧪 Testing error handling...");

	await setup();

	// Test with invalid directory name
	const projects = ["test-project", ""];
	const options = {
		parallel: false,
		progressTracking: false,
	};

	const results = await batchInitCommand(projects, options);

	expect(results.length).toBe(2, "Should attempt to create 2 projects");
	expect(results[0].success, "Valid project should succeed").toBeTruthy();
	expect(!results[1].success, "Invalid project should fail").toBeTruthy();

	console.log("✅ Error handling tests passed");
	await cleanup();
});

console.log("\n🎉 All batch initialization tests completed!");
console.log("Run with: deno run --allow-all tests/batch-init.test.js");
