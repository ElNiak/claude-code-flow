#!/usr/bin/env node

/**
 * ABOUTME: Continuous validation framework for CLI migration monitoring
 * ABOUTME: Monitors CLI behavior changes and validates test outcomes during migration
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class ContinuousValidationFramework {
	constructor() {
		this.projectRoot = path.join(__dirname, "..");
		this.validationResults = {
			timestamp: new Date().toISOString(),
			behaviorValidation: {},
			testValidation: {},
			performanceValidation: {},
			regressionDetection: {},
		};
	}

	async validateBehavioralEquivalence() {
		console.log("🔍 Validating CLI behavioral equivalence...");

		const commands = [
			"--help",
			"--version",
			"status",
			"agent --help",
			"swarm --help",
		];

		for (const cmd of commands) {
			try {
				const currentOutput = execSync(`npm run dev -- ${cmd}`, {
					cwd: this.projectRoot,
					encoding: "utf8",
					timeout: 10000,
					stdio: "pipe",
				});

				this.validationResults.behaviorValidation[cmd] = {
					success: true,
					outputLength: currentOutput.length,
					outputHash: this.hashString(currentOutput),
					timestamp: new Date().toISOString(),
				};
			} catch (error) {
				this.validationResults.behaviorValidation[cmd] = {
					success: false,
					error: error.message,
					timestamp: new Date().toISOString(),
				};
			}
		}
	}

	async runRegressionTests() {
		console.log("🧪 Running regression test suite...");

		const testCategories = [
			{ name: "unit", pattern: "tests/unit/**/*.test.*" },
			{ name: "integration", pattern: "tests/integration/**/*.test.*" },
			{ name: "cli", pattern: "tests/cli/**/*.test.*" },
			{ name: "e2e-critical", files: ["tests/e2e/cli-commands.test.ts"] },
		];

		for (const category of testCategories) {
			try {
				const startTime = Date.now();
				let testCommand;

				if (category.pattern) {
					testCommand = `npm test -- --testPathPattern="${category.pattern}"`;
				} else if (category.files) {
					testCommand = `npm test -- ${category.files.join(" ")}`;
				}

				const output = execSync(testCommand, {
					cwd: this.projectRoot,
					encoding: "utf8",
					timeout: 120000,
					stdio: "pipe",
				});

				const duration = Date.now() - startTime;

				this.validationResults.testValidation[category.name] = {
					success: true,
					duration,
					output: this.extractTestSummary(output),
					timestamp: new Date().toISOString(),
				};
			} catch (error) {
				this.validationResults.testValidation[category.name] = {
					success: false,
					error: error.message,
					stdout: error.stdout,
					stderr: error.stderr,
					timestamp: new Date().toISOString(),
				};
			}
		}
	}

	async monitorPerformance() {
		console.log("⚡ Monitoring CLI performance...");

		const performanceTests = [
			{ name: "startup", command: "--version" },
			{ name: "help", command: "--help" },
			{ name: "status", command: "status" },
		];

		for (const test of performanceTests) {
			const times = [];
			const iterations = 5;

			for (let i = 0; i < iterations; i++) {
				try {
					const startTime = process.hrtime.bigint();

					execSync(`npm run dev -- ${test.command}`, {
						cwd: this.projectRoot,
						encoding: "utf8",
						timeout: 10000,
						stdio: "pipe",
					});

					const endTime = process.hrtime.bigint();
					const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
					times.push(duration);
				} catch (error) {
					// Skip failed iterations
				}
			}

			if (times.length > 0) {
				this.validationResults.performanceValidation[test.name] = {
					averageTime: times.reduce((a, b) => a + b, 0) / times.length,
					minTime: Math.min(...times),
					maxTime: Math.max(...times),
					iterations: times.length,
					times: times,
				};
			}
		}
	}

	detectRegressions(baselineFile) {
		console.log("🔍 Detecting regressions...");

		if (!fs.existsSync(baselineFile)) {
			console.log("⚠️  No baseline file found, skipping regression detection");
			return;
		}

		try {
			const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
			const regressions = [];

			// Compare command success rates
			if (baseline.commands) {
				Object.entries(this.validationResults.behaviorValidation).forEach(
					([cmd, current]) => {
						const baselineCmd = baseline.commands[cmd];
						if (baselineCmd && baselineCmd.success && !current.success) {
							regressions.push({
								type: "behavioral",
								command: cmd,
								issue: "Command now failing",
								severity: "high",
							});
						}
					},
				);
			}

			// Compare test results
			if (baseline.tests) {
				Object.entries(this.validationResults.testValidation).forEach(
					([category, current]) => {
						if (!current.success) {
							regressions.push({
								type: "test",
								category: category,
								issue: "Test category failing",
								severity: "high",
							});
						}
					},
				);
			}

			this.validationResults.regressionDetection = {
				totalRegressions: regressions.length,
				regressions: regressions,
				baselineFile: baselineFile,
			};
		} catch (error) {
			this.validationResults.regressionDetection = {
				error: "Failed to load baseline: " + error.message,
			};
		}
	}

	extractTestSummary(output) {
		const lines = output.split("\n");
		const summary = {
			passed: 0,
			failed: 0,
			total: 0,
		};

		lines.forEach((line) => {
			if (line.includes("passed")) {
				const match = line.match(/(\d+) passed/);
				if (match) summary.passed = parseInt(match[1]);
			}
			if (line.includes("failed")) {
				const match = line.match(/(\d+) failed/);
				if (match) summary.failed = parseInt(match[1]);
			}
			if (line.includes("total")) {
				const match = line.match(/(\d+) total/);
				if (match) summary.total = parseInt(match[1]);
			}
		});

		return summary;
	}

	hashString(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString();
	}

	async generateReport() {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const reportPath = path.join(
			this.projectRoot,
			`continuous-validation-${timestamp}.json`,
		);

		// Add summary
		this.validationResults.summary = {
			behaviorValidationPassed: Object.values(
				this.validationResults.behaviorValidation,
			).filter((v) => v.success).length,
			behaviorValidationFailed: Object.values(
				this.validationResults.behaviorValidation,
			).filter((v) => !v.success).length,
			testValidationPassed: Object.values(
				this.validationResults.testValidation,
			).filter((v) => v.success).length,
			testValidationFailed: Object.values(
				this.validationResults.testValidation,
			).filter((v) => !v.success).length,
			regressionsDetected:
				this.validationResults.regressionDetection.totalRegressions || 0,
			overallHealth: this.calculateOverallHealth(),
		};

		fs.writeFileSync(
			reportPath,
			JSON.stringify(this.validationResults, null, 2),
		);
		console.log(`\n📋 Validation report saved: ${reportPath}`);

		return reportPath;
	}

	calculateOverallHealth() {
		const behaviorScore = Object.values(
			this.validationResults.behaviorValidation,
		).filter((v) => v.success).length;
		const testScore = Object.values(
			this.validationResults.testValidation,
		).filter((v) => v.success).length;
		const regressionPenalty =
			(this.validationResults.regressionDetection.totalRegressions || 0) * 0.1;

		const totalScore = behaviorScore + testScore - regressionPenalty;
		const maxScore =
			Object.keys(this.validationResults.behaviorValidation).length +
			Object.keys(this.validationResults.testValidation).length;

		if (maxScore === 0) return "unknown";

		const healthPercent = (totalScore / maxScore) * 100;

		if (healthPercent >= 90) return "excellent";
		if (healthPercent >= 75) return "good";
		if (healthPercent >= 50) return "fair";
		if (healthPercent >= 25) return "poor";
		return "critical";
	}

	async run(options = {}) {
		console.log("🚀 Starting Continuous Validation Framework\n");

		try {
			await this.validateBehavioralEquivalence();

			if (!options.skipTests) {
				await this.runRegressionTests();
			}

			if (!options.skipPerformance) {
				await this.monitorPerformance();
			}

			if (options.baselineFile) {
				this.detectRegressions(options.baselineFile);
			}

			const reportPath = await this.generateReport();

			console.log("\n✅ Continuous Validation Complete!");
			console.log("\nSummary:");
			console.log(
				`  🔍 Behavior Tests: ${this.validationResults.summary.behaviorValidationPassed}/${this.validationResults.summary.behaviorValidationPassed + this.validationResults.summary.behaviorValidationFailed}`,
			);
			console.log(
				`  🧪 Test Categories: ${this.validationResults.summary.testValidationPassed}/${this.validationResults.summary.testValidationPassed + this.validationResults.summary.testValidationFailed}`,
			);
			console.log(
				`  🚨 Regressions: ${this.validationResults.summary.regressionsDetected}`,
			);
			console.log(
				`  💚 Overall Health: ${this.validationResults.summary.overallHealth}`,
			);
			console.log(`\n📄 Full Report: ${reportPath}`);

			return this.validationResults;
		} catch (error) {
			console.error("❌ Continuous validation failed:", error);
			throw error;
		}
	}
}

// Run if called directly
if (require.main === module) {
	const framework = new ContinuousValidationFramework();
	const baselineFile = process.argv
		.find((arg) => arg.startsWith("--baseline="))
		?.split("=")[1];
	const skipTests = process.argv.includes("--skip-tests");
	const skipPerformance = process.argv.includes("--skip-performance");

	framework
		.run({
			baselineFile,
			skipTests,
			skipPerformance,
		})
		.catch(console.error);
}

module.exports = ContinuousValidationFramework;
