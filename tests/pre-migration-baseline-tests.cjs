#!/usr/bin/env node

/**
 * ABOUTME: Pre-migration testing baseline to capture current CLI behavior
 * ABOUTME: Validates all commands, help outputs, and establishes reference for migration
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class PreMigrationTestFramework {
	constructor() {
		this.results = {
			timestamp: new Date().toISOString(),
			baseline: {},
			commands: {},
			tests: {},
			errors: [],
		};
		this.projectRoot = path.join(__dirname, "..");
		this.cliPath = "src/cli/cli.ts";
	}

	async runCommand(cmd, timeout = 10000) {
		return new Promise((resolve) => {
			try {
				const result = execSync(`npm run dev -- ${cmd}`, {
					cwd: this.projectRoot,
					timeout,
					encoding: "utf8",
					stdio: "pipe",
				});
				resolve({ success: true, output: result, error: null });
			} catch (error) {
				resolve({
					success: false,
					output: error.stdout || "",
					error: error.stderr || error.message,
				});
			}
		});
	}

	async captureCliBaseline() {
		console.log("🔍 Capturing CLI baseline behavior...");

		const commands = [
			"--help",
			"--version",
			"status --help",
			"start --help",
			"agent --help",
			"swarm --help",
			"hive-mind --help",
			"memory --help",
			"hooks --help",
			"init --help",
			"config --help",
		];

		for (const cmd of commands) {
			console.log(`  📋 Testing: ${cmd}`);
			const result = await this.runCommand(cmd);
			this.results.commands[cmd] = {
				success: result.success,
				output: result.output,
				error: result.error,
				outputLength: result.output?.length || 0,
			};
		}
	}

	async findAllTestFiles() {
		console.log("🔍 Cataloging test files...");

		const testDirs = ["tests", "src"];
		const testFiles = [];

		const findTests = (dir) => {
			try {
				const items = fs.readdirSync(path.join(this.projectRoot, dir));
				for (const item of items) {
					const fullPath = path.join(this.projectRoot, dir, item);
					if (fs.statSync(fullPath).isDirectory()) {
						findTests(path.join(dir, item));
					} else if (item.includes(".test.") || item.includes(".spec.")) {
						testFiles.push(path.join(dir, item));
					}
				}
			} catch (error) {
				// Directory might not exist, skip
			}
		};

		testDirs.forEach(findTests);

		this.results.baseline.testFiles = {
			total: testFiles.length,
			files: testFiles,
			byExtension: this.groupByExtension(testFiles),
		};
	}

	async analyzeSimpleCliReferences() {
		console.log("🔍 Analyzing simple-cli references...");

		const references = [];
		const searchDirs = ["tests", "src", "scripts"];

		const findReferences = (dir) => {
			try {
				const items = fs.readdirSync(path.join(this.projectRoot, dir));
				for (const item of items) {
					const fullPath = path.join(this.projectRoot, dir, item);
					if (fs.statSync(fullPath).isDirectory()) {
						findReferences(path.join(dir, item));
					} else if (
						item.endsWith(".js") ||
						item.endsWith(".ts") ||
						item.endsWith(".json")
					) {
						try {
							const content = fs.readFileSync(fullPath, "utf8");
							if (content.includes("simple-cli")) {
								const lines = content.split("\n");
								const matchingLines = lines
									.map((line, index) => ({
										line: line.trim(),
										number: index + 1,
									}))
									.filter(({ line }) => line.includes("simple-cli"));

								if (matchingLines.length > 0) {
									references.push({
										file: path.join(dir, item),
										matches: matchingLines.length,
										lines: matchingLines,
									});
								}
							}
						} catch (error) {
							// Skip files that can't be read
						}
					}
				}
			} catch (error) {
				// Directory might not exist, skip
			}
		};

		searchDirs.forEach(findReferences);

		this.results.baseline.simpleCliReferences = {
			total: references.length,
			totalMatches: references.reduce((sum, ref) => sum + ref.matches, 0),
			files: references,
		};
	}

	async runCriticalTests() {
		console.log("🧪 Running critical test suites...");

		const criticalTests = [
			"tests/unit/simple-example.test.ts",
			"tests/unit/core/config.test.ts",
			"tests/unit/cli/cli-commands.test.ts",
			"tests/integration/cli-integration.test.js",
		];

		for (const testFile of criticalTests) {
			console.log(`  🧪 Running: ${testFile}`);
			try {
				const result = execSync(`npm test -- ${testFile}`, {
					cwd: this.projectRoot,
					timeout: 30000,
					encoding: "utf8",
					stdio: "pipe",
				});
				this.results.tests[testFile] = { success: true, output: result };
			} catch (error) {
				this.results.tests[testFile] = {
					success: false,
					error: error.message,
					stdout: error.stdout,
					stderr: error.stderr,
				};
			}
		}
	}

	groupByExtension(files) {
		return files.reduce((acc, file) => {
			const ext = path.extname(file);
			acc[ext] = (acc[ext] || 0) + 1;
			return acc;
		}, {});
	}

	async generateReport() {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const reportPath = path.join(
			this.projectRoot,
			`pre-migration-baseline-${timestamp}.json`,
		);

		// Add summary
		this.results.summary = {
			totalTestFiles: this.results.baseline.testFiles?.total || 0,
			simpleCliReferences:
				this.results.baseline.simpleCliReferences?.total || 0,
			successfulCommands: Object.values(this.results.commands).filter(
				(c) => c.success,
			).length,
			failedCommands: Object.values(this.results.commands).filter(
				(c) => !c.success,
			).length,
			criticalTestsPassed: Object.values(this.results.tests).filter(
				(t) => t.success,
			).length,
			criticalTestsFailed: Object.values(this.results.tests).filter(
				(t) => !t.success,
			).length,
		};

		fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
		console.log(`\n📋 Baseline report saved: ${reportPath}`);

		return reportPath;
	}

	async run() {
		console.log("🚀 Starting Pre-Migration Testing Baseline\n");

		try {
			await this.captureCliBaseline();
			await this.findAllTestFiles();
			await this.analyzeSimpleCliReferences();
			await this.runCriticalTests();

			const reportPath = await this.generateReport();

			console.log("\n✅ Pre-Migration Baseline Complete!");
			console.log("\nSummary:");
			console.log(`  📁 Test Files: ${this.results.summary.totalTestFiles}`);
			console.log(
				`  🔗 simple-cli References: ${this.results.summary.simpleCliReferences}`,
			);
			console.log(
				`  ✅ Successful Commands: ${this.results.summary.successfulCommands}`,
			);
			console.log(
				`  ❌ Failed Commands: ${this.results.summary.failedCommands}`,
			);
			console.log(
				`  🧪 Tests Passed: ${this.results.summary.criticalTestsPassed}`,
			);
			console.log(
				`  💥 Tests Failed: ${this.results.summary.criticalTestsFailed}`,
			);
			console.log(`\n📄 Full Report: ${reportPath}`);

			return this.results;
		} catch (error) {
			console.error("❌ Baseline testing failed:", error);
			this.results.errors.push(error.message);
			throw error;
		}
	}
}

// Run if called directly
if (require.main === module) {
	const framework = new PreMigrationTestFramework();
	framework.run().catch(console.error);
}

module.exports = PreMigrationTestFramework;
