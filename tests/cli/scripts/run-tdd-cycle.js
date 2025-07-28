#!/usr/bin/env node

/**
 * ABOUTME: TDD Cycle Runner for Hive-Mind Command Development
 * ABOUTME: Orchestrates red-green-refactor cycle and validates TDD methodology compliance
 */

import chalk from "chalk";
import { spawn } from "child_process";
import { readdir, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../../..");

class TDDCycleRunner {
	constructor() {
		this.testFiles = [];
		this.results = {
			red: { passed: 0, failed: 0, skipped: 0 },
			green: { passed: 0, failed: 0, skipped: 0 },
			refactor: { passed: 0, failed: 0, skipped: 0 },
		};
		this.startTime = Date.now();
	}

	async discoverTestFiles() {
		console.log(chalk.blue("🔍 Discovering TDD test files...\n"));

		const testDirs = [
			"tests/cli/commands",
			"tests/cli/integration",
			"src/cli/simple-commands/__tests__",
		];

		for (const dir of testDirs) {
			try {
				const fullPath = join(projectRoot, dir);
				const files = await readdir(fullPath);

				const testFiles = files
					.filter((file) => file.includes("tdd") && file.endsWith(".test.js"))
					.map((file) => join(fullPath, file));

				this.testFiles.push(...testFiles);

				console.log(
					chalk.gray(`  Found ${testFiles.length} TDD test files in ${dir}`),
				);
			} catch (error) {
				console.log(chalk.yellow(`  ⚠️ Could not read directory: ${dir}`));
			}
		}

		console.log(
			chalk.green(
				`\n✅ Total TDD test files discovered: ${this.testFiles.length}\n`,
			),
		);
		return this.testFiles;
	}

	async validateTestStructure() {
		console.log(chalk.blue("🔍 Validating TDD test structure...\n"));

		for (const testFile of this.testFiles) {
			try {
				const content = await readFile(testFile, "utf-8");

				// Check for TDD markers
				const hasRedPhase =
					content.includes("🔴 RED PHASE") || content.includes("FAILING:");
				const hasGreenPhase =
					content.includes("🟢 GREEN PHASE") || content.includes("PASSING:");
				const hasRefactorPhase =
					content.includes("🔵 REFACTOR PHASE") ||
					content.includes("REFACTOR:");

				const tddCompliance = {
					file: testFile.replace(projectRoot, ""),
					hasRedPhase,
					hasGreenPhase: hasGreenPhase || false, // Green phase might not exist yet
					hasRefactorPhase: hasRefactorPhase || false, // Refactor phase might not exist yet
					failingTests: (content.match(/FAILING:/g) || []).length,
					passingTests: (content.match(/PASSING:/g) || []).length,
				};

				if (hasRedPhase) {
					console.log(chalk.green(`  ✅ ${tddCompliance.file}`));
					console.log(
						chalk.gray(
							`     Red Phase: ${hasRedPhase ? "✓" : "✗"} (${tddCompliance.failingTests} failing tests)`,
						),
					);
					if (hasGreenPhase) {
						console.log(
							chalk.gray(
								`     Green Phase: ✓ (${tddCompliance.passingTests} passing tests)`,
							),
						);
					}
					if (hasRefactorPhase) {
						console.log(chalk.gray(`     Refactor Phase: ✓`));
					}
				} else {
					console.log(
						chalk.yellow(
							`  ⚠️ ${tddCompliance.file} - Missing RED PHASE markers`,
						),
					);
				}
			} catch (error) {
				console.log(
					chalk.red(`  ❌ Error reading ${testFile}: ${error.message}`),
				);
			}
		}

		console.log("");
	}

	async runRedPhase() {
		console.log(chalk.red.bold("🔴 RUNNING RED PHASE - Tests Should FAIL\n"));
		console.log(
			chalk.gray(
				"In TDD, we start by writing failing tests that define the desired behavior.\n",
			),
		);

		const redPhaseResults = await this.runJestTests({
			testNamePattern: "FAILING|RED PHASE",
			verbose: true,
			expectFailures: true,
		});

		this.results.red = redPhaseResults;

		// In TDD Red Phase, we EXPECT tests to fail
		if (redPhaseResults.failed === 0) {
			console.log(chalk.yellow("⚠️ WARNING: No tests failed in RED PHASE"));
			console.log(chalk.yellow("This might indicate that:"));
			console.log(
				chalk.yellow("  1. Tests are not properly marked as FAILING"),
			);
			console.log(
				chalk.yellow("  2. Implementation already exists (not true TDD)"),
			);
			console.log(
				chalk.yellow("  3. Tests are not testing the right behavior\n"),
			);
		} else {
			console.log(
				chalk.green(
					`✅ RED PHASE COMPLETE: ${redPhaseResults.failed} tests failed as expected\n`,
				),
			);
		}

		return redPhaseResults;
	}

	async runGreenPhase() {
		console.log(
			chalk.green.bold("🟢 RUNNING GREEN PHASE - Implement Minimum Code\n"),
		);
		console.log(
			chalk.gray(
				"Now we write the minimal code to make the failing tests pass.\n",
			),
		);

		console.log(chalk.yellow("⚠️ GREEN PHASE REQUIRES MANUAL IMPLEMENTATION"));
		console.log(
			chalk.gray("You need to implement the missing functionality in:"),
		);
		console.log(chalk.gray("  - src/cli/simple-commands/hive-mind.js"));
		console.log(chalk.gray("  - Related support files\n"));

		console.log(
			chalk.blue(
				"Press Enter when you have implemented the minimal code to proceed with testing...",
			),
		);

		// Wait for user input
		await this.waitForUserInput();

		const greenPhaseResults = await this.runJestTests({
			testNamePattern: "FAILING|RED PHASE|PASSING|GREEN PHASE",
			verbose: true,
			expectFailures: false,
		});

		this.results.green = greenPhaseResults;

		if (greenPhaseResults.failed > 0) {
			console.log(
				chalk.red(
					`❌ GREEN PHASE INCOMPLETE: ${greenPhaseResults.failed} tests still failing`,
				),
			);
			console.log(chalk.yellow("Continue implementing until all tests pass\n"));
		} else {
			console.log(
				chalk.green(`✅ GREEN PHASE COMPLETE: All tests are now passing\n`),
			);
		}

		return greenPhaseResults;
	}

	async runRefactorPhase() {
		console.log(
			chalk.blue.bold("🔵 RUNNING REFACTOR PHASE - Improve Code Quality\n"),
		);
		console.log(
			chalk.gray(
				"Now we refactor the code to improve quality while keeping tests green.\n",
			),
		);

		console.log(
			chalk.yellow("⚠️ REFACTOR PHASE REQUIRES MANUAL CODE IMPROVEMENT"),
		);
		console.log(chalk.gray("Refactor your implementation to improve:"));
		console.log(chalk.gray("  - Code readability and maintainability"));
		console.log(chalk.gray("  - Performance and efficiency"));
		console.log(chalk.gray("  - Design patterns and architecture"));
		console.log(chalk.gray("  - Remove duplication and improve naming\n"));

		console.log(
			chalk.blue(
				"Press Enter when you have refactored the code to proceed with final testing...",
			),
		);

		await this.waitForUserInput();

		const refactorPhaseResults = await this.runJestTests({
			testNamePattern: ".*", // Run all tests
			verbose: true,
			expectFailures: false,
		});

		this.results.refactor = refactorPhaseResults;

		if (refactorPhaseResults.failed > 0) {
			console.log(
				chalk.red(
					`❌ REFACTOR PHASE BROKE TESTS: ${refactorPhaseResults.failed} tests failing`,
				),
			);
			console.log(
				chalk.yellow("Fix the refactoring to keep all tests green\n"),
			);
		} else {
			console.log(
				chalk.green(
					`✅ REFACTOR PHASE COMPLETE: All tests still passing after refactoring\n`,
				),
			);
		}

		return refactorPhaseResults;
	}

	async runJestTests(options = {}) {
		return new Promise((resolve) => {
			const jestArgs = [
				"--testMatch=**/*tdd*.test.js",
				"--verbose",
				"--no-cache",
				"--forceExit",
			];

			if (options.testNamePattern) {
				jestArgs.push(`--testNamePattern="${options.testNamePattern}"`);
			}

			const jestProcess = spawn("npm", ["test", "--", ...jestArgs], {
				cwd: projectRoot,
				stdio: "pipe",
				env: { ...process.env, NODE_OPTIONS: "--experimental-vm-modules" },
			});

			let output = "";
			let errorOutput = "";

			jestProcess.stdout.on("data", (data) => {
				const text = data.toString();
				output += text;
				process.stdout.write(text);
			});

			jestProcess.stderr.on("data", (data) => {
				const text = data.toString();
				errorOutput += text;
				process.stderr.write(text);
			});

			jestProcess.on("close", (code) => {
				// Parse Jest output for results
				const results = this.parseJestOutput(output + errorOutput);
				resolve(results);
			});
		});
	}

	parseJestOutput(output) {
		const lines = output.split("\n");
		let passed = 0;
		let failed = 0;
		let skipped = 0;

		// Look for Jest summary line
		const summaryLine = lines.find(
			(line) => line.includes("Tests:") && line.includes("passed"),
		);

		if (summaryLine) {
			const passedMatch = summaryLine.match(/(\d+) passed/);
			const failedMatch = summaryLine.match(/(\d+) failed/);
			const skippedMatch = summaryLine.match(/(\d+) skipped/);

			passed = passedMatch ? parseInt(passedMatch[1]) : 0;
			failed = failedMatch ? parseInt(failedMatch[1]) : 0;
			skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
		}

		return { passed, failed, skipped };
	}

	async waitForUserInput() {
		return new Promise((resolve) => {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.on("data", (data) => {
				if (data[0] === 13) {
					// Enter key
					process.stdin.setRawMode(false);
					process.stdin.pause();
					console.log("");
					resolve();
				}
			});
		});
	}

	printFinalReport() {
		const totalTime = Date.now() - this.startTime;

		console.log(chalk.bold("\n" + "=".repeat(80)));
		console.log(chalk.bold.blue("📊 TDD CYCLE COMPLETE - FINAL REPORT"));
		console.log(chalk.bold("=".repeat(80) + "\n"));

		console.log(chalk.red.bold("🔴 RED PHASE RESULTS:"));
		console.log(
			chalk.gray(
				`   Tests Run: ${this.results.red.passed + this.results.red.failed + this.results.red.skipped}`,
			),
		);
		console.log(chalk.green(`   Passed: ${this.results.red.passed}`));
		console.log(
			chalk.red(
				`   Failed: ${this.results.red.failed} (Expected in RED phase)`,
			),
		);
		console.log(chalk.yellow(`   Skipped: ${this.results.red.skipped}\n`));

		console.log(chalk.green.bold("🟢 GREEN PHASE RESULTS:"));
		console.log(
			chalk.gray(
				`   Tests Run: ${this.results.green.passed + this.results.green.failed + this.results.green.skipped}`,
			),
		);
		console.log(chalk.green(`   Passed: ${this.results.green.passed}`));
		console.log(chalk.red(`   Failed: ${this.results.green.failed}`));
		console.log(chalk.yellow(`   Skipped: ${this.results.green.skipped}\n`));

		console.log(chalk.blue.bold("🔵 REFACTOR PHASE RESULTS:"));
		console.log(
			chalk.gray(
				`   Tests Run: ${this.results.refactor.passed + this.results.refactor.failed + this.results.refactor.skipped}`,
			),
		);
		console.log(chalk.green(`   Passed: ${this.results.refactor.passed}`));
		console.log(chalk.red(`   Failed: ${this.results.refactor.failed}`));
		console.log(chalk.yellow(`   Skipped: ${this.results.refactor.skipped}\n`));

		// TDD Compliance Check
		const tddCompliant =
			this.results.red.failed > 0 && // RED: Tests should fail
			this.results.green.failed === 0 && // GREEN: Tests should pass
			this.results.refactor.failed === 0; // REFACTOR: Tests should still pass

		if (tddCompliant) {
			console.log(chalk.green.bold("✅ TDD METHODOLOGY FOLLOWED CORRECTLY!"));
			console.log(
				chalk.green("   ✓ RED: Tests failed initially (defining requirements)"),
			);
			console.log(chalk.green("   ✓ GREEN: Tests pass after implementation"));
			console.log(
				chalk.green("   ✓ REFACTOR: Tests still pass after code improvement\n"),
			);
		} else {
			console.log(chalk.red.bold("❌ TDD METHODOLOGY VIOLATIONS DETECTED!"));
			if (this.results.red.failed === 0) {
				console.log(chalk.red("   ✗ RED: Tests should have failed initially"));
			}
			if (this.results.green.failed > 0) {
				console.log(
					chalk.red("   ✗ GREEN: Tests should pass after implementation"),
				);
			}
			if (this.results.refactor.failed > 0) {
				console.log(
					chalk.red("   ✗ REFACTOR: Tests should still pass after refactoring"),
				);
			}
			console.log("");
		}

		console.log(
			chalk.blue(`⏱️ Total TDD Cycle Time: ${Math.round(totalTime / 1000)}s`),
		);
		console.log(
			chalk.blue(`📁 Test Files Processed: ${this.testFiles.length}`),
		);

		console.log(chalk.bold("\n" + "=".repeat(80)));
		console.log(chalk.bold("🎯 NEXT STEPS FOR CONTINUOUS TDD:"));
		console.log(chalk.bold("=".repeat(80)));
		console.log(
			chalk.yellow("1. Add more failing tests for additional functionality"),
		);
		console.log(
			chalk.yellow("2. Implement minimal code to make new tests pass"),
		);
		console.log(
			chalk.yellow("3. Refactor continuously while keeping tests green"),
		);
		console.log(
			chalk.yellow("4. Repeat the cycle for each new feature or improvement"),
		);
		console.log(chalk.bold("=".repeat(80) + "\n"));
	}
}

// Main execution
async function main() {
	console.log(chalk.bold.blue("🔄 TDD CYCLE RUNNER FOR HIVE-MIND COMMAND\n"));
	console.log(
		chalk.gray("This script orchestrates the Test-Driven Development cycle:"),
	);
	console.log(
		chalk.red("🔴 RED: Write failing tests that define requirements"),
	);
	console.log(chalk.green("🟢 GREEN: Write minimal code to make tests pass"));
	console.log(
		chalk.blue("🔵 REFACTOR: Improve code quality while keeping tests green\n"),
	);

	const runner = new TDDCycleRunner();

	try {
		// Discover and validate test files
		await runner.discoverTestFiles();
		await runner.validateTestStructure();

		// Run TDD Cycle
		await runner.runRedPhase();
		await runner.runGreenPhase();
		await runner.runRefactorPhase();

		// Print final report
		runner.printFinalReport();
	} catch (error) {
		console.error(chalk.red("💥 TDD Cycle Runner Error:", error.message));
		process.exit(1);
	}
}

// Handle process termination
process.on("SIGINT", () => {
	console.log(chalk.yellow("\n⚠️ TDD Cycle interrupted by user"));
	process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export default TDDCycleRunner;
