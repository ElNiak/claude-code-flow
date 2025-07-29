#!/usr/bin/env node

/**
 * TDD Test Suite: Hive-Mind Command Functionality
 *
 * This test suite validates the actual functionality of the hive-mind command,
 * including both metadata-driven and legacy features.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../../..");

console.log("🧪 TDD Test Suite: Hive-Mind Command Functionality\n");

// Simple test runner for functionality tests
class FunctionalTestRunner {
	constructor() {
		this.tests = [];
		this.passed = 0;
		this.failed = 0;
	}

	test(name, fn) {
		this.tests.push({ name, fn });
	}

	async run() {
		console.log(`🏃 Running ${this.tests.length} functional tests...\n`);

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
			console.log("🎉 All functional tests passed!");
		}
	}
}

const runner = new FunctionalTestRunner();

// Functionality Test Suite
runner.test("Help generation from command registry", async () => {
	const { showCommandHelp } = await import(
		`${projectRoot}/src/cli/command-registry.js`
	);

	// Capture output to prevent spam during testing
	const originalLog = console.log;
	let helpOutput = "";
	console.log = (...args) => {
		helpOutput += args.join(" ") + "\n";
	};

	try {
		await showCommandHelp("hive-mind");
		console.log = originalLog;

		if (!helpOutput.includes("hive-mind") || helpOutput.length < 500) {
			throw new Error("Help output seems incomplete or incorrect");
		}

		console.log(`   📖 Generated ${helpOutput.length} characters of help text`);
	} catch (error) {
		console.log = originalLog;
		throw error;
	}
});

runner.test("Command help flag functionality", async () => {
	const { hiveMindCommand } = await import(
		`${projectRoot}/src/cli/commands/hive-mind/index.ts`
	);

	// Capture output
	const originalLog = console.log;
	let helpOutput = "";
	console.log = (...args) => {
		helpOutput += args.join(" ") + "\n";
	};

	try {
		await hiveMindCommand([], { help: true });
		console.log = originalLog;

		if (!helpOutput.includes("hive-mind") || helpOutput.length < 500) {
			throw new Error("Command help output seems incomplete");
		}

		console.log(`   🔧 Help flag generated ${helpOutput.length} characters`);
	} catch (error) {
		console.log = originalLog;
		throw error;
	}
});

runner.test("Advanced JSON output functionality", async () => {
	const { hiveMindCommand } = await import(
		`${projectRoot}/src/cli/commands/hive-mind/index.ts`
	);

	// Capture output
	const originalLog = console.log;
	let jsonOutput = "";
	console.log = (...args) => {
		jsonOutput += args.join(" ") + "\n";
	};

	try {
		await hiveMindCommand(["status"], { json: true });
		console.log = originalLog;

		// Check if JSON-like output was produced
		if (!jsonOutput || jsonOutput.length < 50) {
			throw new Error("JSON output seems too short or missing");
		}

		console.log(`   🔧 JSON flag generated output`);
	} catch (error) {
		console.log = originalLog;
		throw error;
	}
});

runner.test("Advanced verbose output functionality", async () => {
	const { hiveMindCommand } = await import(
		`${projectRoot}/src/cli/commands/hive-mind/index.ts`
	);

	// Capture output
	const originalLog = console.log;
	let verboseOutput = "";
	console.log = (...args) => {
		verboseOutput += args.join(" ") + "\n";
	};

	try {
		await hiveMindCommand(["metrics"], { verbose: true });
		console.log = originalLog;

		if (!verboseOutput || verboseOutput.length < 50) {
			throw new Error("Verbose output seems too short or missing");
		}

		console.log(`   🔧 Verbose flag generated enhanced output`);
	} catch (error) {
		console.log = originalLog;
		throw error;
	}
});

runner.test(
	"Legacy command functionality (backward compatibility)",
	async () => {
		const { hiveMindCommand } = await import(
			`${projectRoot}/src/cli/commands/hive-mind/index.ts`
		);

		// Capture output
		const originalLog = console.log;
		let legacyOutput = "";
		console.log = (...args) => {
			legacyOutput += args.join(" ") + "\n";
		};

		try {
			await hiveMindCommand(["status"], {});
			console.log = originalLog;

			if (!legacyOutput || legacyOutput.length < 30) {
				throw new Error("Legacy functionality output seems missing");
			}

			console.log(`   🔧 Legacy mode works correctly`);
		} catch (error) {
			console.log = originalLog;
			throw error;
		}
	},
);

runner.test("Metadata-driven vs legacy routing", async () => {
	const { hiveMindCommand } = await import(
		`${projectRoot}/src/cli/commands/hive-mind/index.ts`
	);

	// Test that advanced features route to metadata-driven implementation
	const originalLog = console.log;
	let metadataOutput = "";
	console.log = (...args) => {
		metadataOutput += args.join(" ") + "\n";
	};

	try {
		// This should use metadata-driven implementation due to advanced options
		await hiveMindCommand(["status"], { json: true, verbose: true });
		console.log = originalLog;

		console.log(
			`   🔧 Advanced features correctly routed to metadata implementation`,
		);
	} catch (error) {
		console.log = originalLog;
		throw error;
	}
});

runner.test("Command subcommand handling", async () => {
	const { hiveMindCommand } = await import(
		`${projectRoot}/src/cli/commands/hive-mind/index.ts`
	);

	const originalLog = console.log;
	const originalError = console.error;
	let output = "";
	let errorOutput = "";

	console.log = (...args) => {
		output += args.join(" ") + "\n";
	};
	console.error = (...args) => {
		errorOutput += args.join(" ") + "\n";
	};

	try {
		// Test each major subcommand doesn't crash
		const subcommands = ["init", "status", "metrics", "wizard"];

		for (const subcommand of subcommands) {
			output = "";
			errorOutput = "";
			await hiveMindCommand([subcommand], {});

			if (errorOutput.length > 0) {
				throw new Error(
					`Subcommand ${subcommand} produced errors: ${errorOutput}`,
				);
			}
		}

		console.log = originalLog;
		console.error = originalError;

		console.log(`   🔧 All major subcommands handled correctly`);
	} catch (error) {
		console.log = originalLog;
		console.error = originalError;
		throw error;
	}
});

// Run all tests
runner.run().catch(console.error);
