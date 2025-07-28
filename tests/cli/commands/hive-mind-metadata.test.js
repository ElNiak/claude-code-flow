#!/usr/bin/env node

/**
 * TDD Test Suite: Hive-Mind Metadata-Driven Implementation
 *
 * This test suite validates the metadata-driven implementation for the hive-mind command,
 * ensuring proper integration with the command metadata system.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../../..");

console.log("🧪 TDD Test Suite: Hive-Mind Metadata Implementation\n");

// Test runner with proper error handling and reporting
class TestRunner {
	constructor() {
		this.tests = [];
		this.passed = 0;
		this.failed = 0;
	}

	test(name, fn) {
		this.tests.push({ name, fn });
	}

	async run() {
		console.log(`🏃 Running ${this.tests.length} tests...\n`);

		for (const { name, fn } of this.tests) {
			try {
				console.log(`📝 ${name}`);
				await fn();
				console.log("✅ PASSED\n");
				this.passed++;
			} catch (error) {
				console.log(`❌ FAILED: ${error.message}`);
				if (process.env.VERBOSE) {
					console.log(`   Stack: ${error.stack}`);
				}
				console.log("");
				this.failed++;
			}
		}

		console.log(
			`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`,
		);

		if (this.failed > 0) {
			console.log("❌ Some tests failed");
			process.exit(1);
		} else {
			console.log("🎉 All tests passed!");
		}
	}

	assert(condition, message) {
		if (!condition) {
			throw new Error(message);
		}
	}

	assertEqual(actual, expected, message) {
		if (actual !== expected) {
			throw new Error(`${message}: expected ${expected}, got ${actual}`);
		}
	}

	assertTrue(condition, message) {
		this.assert(condition === true, message);
	}

	assertExists(value, message) {
		this.assert(value !== undefined && value !== null, message);
	}
}

const runner = new TestRunner();

// Test Suite
runner.test("Import hive-mind metadata successfully", async () => {
	const { hiveMindCommandMetadata, hiveMindCommandMetadataDriven } =
		await import(
			`${projectRoot}/src/cli/simple-commands/hive-mind-metadata.js`
		);

	runner.assertExists(
		hiveMindCommandMetadata,
		"hiveMindCommandMetadata should exist",
	);
	runner.assertExists(
		hiveMindCommandMetadataDriven,
		"hiveMindCommandMetadataDriven should exist",
	);
	runner.assertEqual(
		hiveMindCommandMetadata.category,
		"core",
		"Category should be core",
	);
	runner.assertTrue(
		Array.isArray(hiveMindCommandMetadata.subcommands),
		"Subcommands should be an array",
	);
	runner.assertTrue(
		hiveMindCommandMetadata.subcommands.length > 0,
		"Should have subcommands",
	);
	runner.assertTrue(
		Array.isArray(hiveMindCommandMetadata.options),
		"Options should be an array",
	);
	runner.assertTrue(
		hiveMindCommandMetadata.options.length > 0,
		"Should have options",
	);

	console.log(
		`   📋 Subcommands: ${hiveMindCommandMetadata.subcommands.join(", ")}`,
	);
	console.log(`   ⚙️  Options: ${hiveMindCommandMetadata.options.length} total`);
});

runner.test("Import command-metadata utilities successfully", async () => {
	const { parseCommandArgs, validateCommandArgs, generateCommandHelp } =
		await import(`${projectRoot}/src/cli/command-metadata.ts`);

	runner.assertExists(parseCommandArgs, "parseCommandArgs should exist");
	runner.assertExists(validateCommandArgs, "validateCommandArgs should exist");
	runner.assertExists(generateCommandHelp, "generateCommandHelp should exist");
	runner.assertEqual(
		typeof parseCommandArgs,
		"function",
		"parseCommandArgs should be a function",
	);
	runner.assertEqual(
		typeof validateCommandArgs,
		"function",
		"validateCommandArgs should be a function",
	);
	runner.assertEqual(
		typeof generateCommandHelp,
		"function",
		"generateCommandHelp should be a function",
	);
});

runner.test("Generate help text correctly", async () => {
	const { hiveMindCommandMetadata } = await import(
		`${projectRoot}/src/cli/simple-commands/hive-mind-metadata.js`
	);
	const { generateCommandHelp } = await import(
		`${projectRoot}/src/cli/command-metadata.ts`
	);

	const helpText = generateCommandHelp("hive-mind", hiveMindCommandMetadata);

	runner.assertExists(helpText, "Help text should be generated");
	runner.assertTrue(
		helpText.length > 1000,
		"Help text should be comprehensive",
	);
	runner.assertTrue(
		helpText.includes("hive-mind"),
		"Help should mention command name",
	);
	runner.assertTrue(
		helpText.includes("spawn"),
		"Help should mention spawn subcommand",
	);
	runner.assertTrue(
		helpText.includes("--agents"),
		"Help should mention agents option",
	);

	console.log(`   📖 Help length: ${helpText.length} characters`);
});

runner.test("Parse command arguments correctly", async () => {
	const { hiveMindCommandMetadata } = await import(
		`${projectRoot}/src/cli/simple-commands/hive-mind-metadata.js`
	);
	const { parseCommandArgs } = await import(
		`${projectRoot}/src/cli/command-metadata.ts`
	);

	const testArgs = ["spawn", "Build API"];
	const testFlags = { agents: 5, verbose: true, "queen-type": "tactical" };
	const parsed = parseCommandArgs(testArgs, testFlags, hiveMindCommandMetadata);

	runner.assertEqual(
		parsed.subcommand,
		"spawn",
		"Should parse subcommand correctly",
	);
	runner.assertEqual(parsed.options.agents, 5, "Should parse agents option");
	runner.assertEqual(
		parsed.options.verbose,
		true,
		"Should parse verbose option",
	);
	runner.assertEqual(
		parsed.options["queen-type"],
		"tactical",
		"Should parse queen-type option",
	);
	runner.assertTrue(
		Array.isArray(parsed.remainingArgs),
		"remainingArgs should be an array",
	);

	console.log(`   🔧 Parsed subcommand: ${parsed.subcommand}`);
	console.log(`   ⚙️  Options: ${Object.keys(parsed.options).join(", ")}`);
});

runner.test("Validate arguments correctly", async () => {
	const { hiveMindCommandMetadata } = await import(
		`${projectRoot}/src/cli/simple-commands/hive-mind-metadata.js`
	);
	const { parseCommandArgs, validateCommandArgs } = await import(
		`${projectRoot}/src/cli/command-metadata.ts`
	);

	// Test valid arguments
	const validArgs = ["spawn", "Build API"];
	const validFlags = { consensus: "majority", agents: 8 };
	const validParsed = parseCommandArgs(
		validArgs,
		validFlags,
		hiveMindCommandMetadata,
	);
	const validErrors = validateCommandArgs(validParsed, hiveMindCommandMetadata);

	runner.assertEqual(
		validErrors.length,
		0,
		"Valid arguments should produce no errors",
	);

	// Test invalid choice
	const invalidArgs = ["spawn", "Build API"];
	const invalidFlags = { consensus: "invalid_choice" };
	const invalidParsed = parseCommandArgs(
		invalidArgs,
		invalidFlags,
		hiveMindCommandMetadata,
	);
	const invalidErrors = validateCommandArgs(
		invalidParsed,
		hiveMindCommandMetadata,
	);

	runner.assertTrue(
		invalidErrors.length > 0,
		"Invalid consensus choice should produce errors",
	);

	console.log(`   ✅ Valid args: ${validErrors.length} errors`);
	console.log(`   ❌ Invalid args: ${invalidErrors.length} errors`);
});

runner.test("Integrate with main hive-mind command", async () => {
	const { hiveMindCommand } = await import(
		`${projectRoot}/src/cli/simple-commands/hive-mind.js`
	);

	runner.assertExists(hiveMindCommand, "hiveMindCommand should exist");
	runner.assertEqual(
		typeof hiveMindCommand,
		"function",
		"hiveMindCommand should be a function",
	);

	// Test help functionality (should not throw)
	await hiveMindCommand([], { help: true });
});

runner.test("Integrate with command registry", async () => {
	const { commandRegistry } = await import(
		`${projectRoot}/src/cli/command-registry.js`
	);

	const hiveMindEntry = commandRegistry.get("hive-mind");
	runner.assertExists(
		hiveMindEntry,
		"hive-mind should be registered in command registry",
	);
	runner.assertExists(
		hiveMindEntry.handler,
		"Registry entry should have handler",
	);
	runner.assertExists(
		hiveMindEntry.loadMetadata,
		"Registry entry should have loadMetadata function",
	);

	// Test metadata loading
	const metadata = await hiveMindEntry.loadMetadata();
	runner.assertExists(metadata, "Metadata should be loaded successfully");
	runner.assertEqual(
		metadata.category,
		"core",
		"Loaded metadata should have correct category",
	);
	runner.assertTrue(
		Array.isArray(metadata.subcommands),
		"Loaded metadata should have subcommands",
	);

	console.log(
		`   📋 Registry loaded metadata with ${metadata.subcommands.length} subcommands`,
	);
});

runner.test("Test metadata-driven fallback implementation", async () => {
	const { hiveMindCommandMetadataDriven } = await import(
		`${projectRoot}/src/cli/simple-commands/hive-mind-metadata.js`
	);

	runner.assertExists(
		hiveMindCommandMetadataDriven,
		"Fallback implementation should exist",
	);
	runner.assertEqual(
		typeof hiveMindCommandMetadataDriven,
		"function",
		"Should be a function",
	);

	// Test with help flag (should not throw)
	await hiveMindCommandMetadataDriven(["--help"], { help: true });

	// Test with status subcommand (should not throw)
	await hiveMindCommandMetadataDriven(["status"], { json: true });
});

// Run all tests
runner.run().catch(console.error);
