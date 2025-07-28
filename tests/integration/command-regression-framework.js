/**
 * ABOUTME: Regression testing framework for command interactions and workflow stability
 * ABOUTME: Validates that command integrations continue to work across code changes and updates
 */

import { jest } from "@jest/globals";
import { exec, spawn } from "child_process";
import crypto from "crypto";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const cliPath = path.join(rootDir, "src/cli/simple-cli.js");

/**
 * Regression test cases for command interactions
 */
const REGRESSION_TEST_CASES = [
	{
		id: "basic-init-memory-flow",
		name: "Basic Init → Memory Flow",
		commands: [
			{ cmd: "init --minimal", expectCode: 0 },
			{ cmd: "memory store test-key test-value", expectCode: 0 },
			{
				cmd: "memory retrieve test-key",
				expectCode: 0,
				expectOutput: "test-value",
			},
		],
	},
	{
		id: "hive-mind-coordination",
		name: "Hive-Mind Coordination Flow",
		commands: [
			{ cmd: "init --minimal", expectCode: 0 },
			{ cmd: "hive-mind init", expectCode: 0, timeout: 20000 },
			{ cmd: "hive-mind status", expectCode: 0 },
			{ cmd: "memory store hive-context coordination-test", expectCode: 0 },
		],
	},
	{
		id: "swarm-task-integration",
		name: "Swarm → Task Integration",
		commands: [
			{ cmd: "init --minimal", expectCode: 0 },
			{
				cmd: "task create 'Integration test task' --priority medium",
				expectCode: 0,
			},
			{
				cmd: "swarm init --agents 2 --objective 'Test coordination'",
				expectCode: 0,
				timeout: 20000,
			},
			{
				cmd: "task list",
				expectCode: 0,
				expectOutput: "Integration test task",
			},
		],
	},
	{
		id: "config-status-memory",
		name: "Config → Status → Memory Chain",
		commands: [
			{ cmd: "init --minimal", expectCode: 0 },
			{ cmd: "config show", expectCode: 0 },
			{ cmd: "status", expectCode: 0 },
			{ cmd: "memory store config-test status-checked", expectCode: 0 },
			{ cmd: "memory list", expectCode: 0, expectOutput: "config-test" },
		],
	},
	{
		id: "agent-coordination",
		name: "Agent Coordination Flow",
		commands: [
			{ cmd: "init --minimal", expectCode: 0 },
			{ cmd: "agent list", expectCode: 0 },
			{ cmd: "memory store agent-context development", expectCode: 0 },
			{
				cmd: "memory retrieve agent-context",
				expectCode: 0,
				expectOutput: "development",
			},
		],
	},
];

/**
 * Performance benchmarks for regression testing
 */
const PERFORMANCE_BENCHMARKS = {
	"init-minimal": { maxTime: 15000, description: "Minimal initialization" },
	"memory-operations": {
		maxTime: 5000,
		description: "Memory store/retrieve cycle",
	},
	"hive-mind-init": { maxTime: 25000, description: "Hive-mind initialization" },
	"swarm-init": { maxTime: 20000, description: "Swarm initialization" },
	"status-check": { maxTime: 5000, description: "System status check" },
};

class RegressionTestFramework {
	constructor(testDir, cliPath) {
		this.testDir = testDir;
		this.cliPath = cliPath;
		this.results = [];
		this.performanceResults = [];
	}

	async runRegressionSuite() {
		console.log("🔄 Starting regression test suite...");

		for (const testCase of REGRESSION_TEST_CASES) {
			const result = await this.runTestCase(testCase);
			this.results.push(result);
		}

		return this.generateReport();
	}

	async runTestCase(testCase) {
		const startTime = Date.now();
		const testResult = {
			id: testCase.id,
			name: testCase.name,
			status: "PASSED",
			errors: [],
			warnings: [],
			executionTime: 0,
			commandResults: [],
		};

		try {
			// Clean test environment for each test case
			await this.cleanTestEnvironment();

			for (const commandSpec of testCase.commands) {
				const commandResult = await this.executeCommand(commandSpec);
				testResult.commandResults.push(commandResult);

				if (!commandResult.success) {
					testResult.status = "FAILED";
					testResult.errors.push(commandResult.error);
				}

				// Small delay between commands
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		} catch (error) {
			testResult.status = "ERROR";
			testResult.errors.push(error.message);
		}

		testResult.executionTime = Date.now() - startTime;
		return testResult;
	}

	async executeCommand(commandSpec) {
		const { cmd, expectCode = 0, expectOutput, timeout = 15000 } = commandSpec;

		try {
			const result = await execAsync(`node "${this.cliPath}" ${cmd}`, {
				cwd: this.testDir,
				env: { ...process.env, NODE_ENV: "test" },
				timeout,
			});

			const success = (result.code || 0) === expectCode;
			const outputMatch =
				!expectOutput ||
				(result.stdout && result.stdout.includes(expectOutput));

			return {
				command: cmd,
				success: success && outputMatch,
				exitCode: result.code || 0,
				stdout: result.stdout || "",
				stderr: result.stderr || "",
				expectedCode: expectCode,
				expectedOutput: expectOutput,
				error:
					success && outputMatch
						? null
						: `Expected code ${expectCode}, got ${result.code || 0}. Expected output: ${expectOutput}`,
			};
		} catch (error) {
			return {
				command: cmd,
				success: false,
				exitCode: error.code || 1,
				stdout: "",
				stderr: error.stderr || error.message,
				expectedCode: expectCode,
				expectedOutput: expectOutput,
				error: error.message,
			};
		}
	}

	async cleanTestEnvironment() {
		// Remove any existing claude-flow configuration
		const configDirs = [".claude", ".hive-mind", ".swarm"];
		for (const dir of configDirs) {
			const dirPath = path.join(this.testDir, dir);
			if (await fs.pathExists(dirPath)) {
				await fs.remove(dirPath);
			}
		}

		// Remove any test files
		const testFiles = ["CLAUDE.md", ".roomodes", "claude-flow.json"];
		for (const file of testFiles) {
			const filePath = path.join(this.testDir, file);
			if (await fs.pathExists(filePath)) {
				await fs.remove(filePath);
			}
		}
	}

	generateReport() {
		const passedTests = this.results.filter(
			(r) => r.status === "PASSED",
		).length;
		const failedTests = this.results.filter(
			(r) => r.status === "FAILED",
		).length;
		const errorTests = this.results.filter((r) => r.status === "ERROR").length;
		const totalTests = this.results.length;

		const report = {
			summary: {
				total: totalTests,
				passed: passedTests,
				failed: failedTests,
				errors: errorTests,
				successRate: (passedTests / totalTests) * 100,
			},
			testResults: this.results,
			timestamp: new Date().toISOString(),
		};

		return report;
	}

	async runPerformanceBenchmarks() {
		console.log("⚡ Running performance benchmarks...");

		for (const [benchmarkId, benchmark] of Object.entries(
			PERFORMANCE_BENCHMARKS,
		)) {
			const result = await this.runPerformanceBenchmark(benchmarkId, benchmark);
			this.performanceResults.push(result);
		}

		return this.performanceResults;
	}

	async runPerformanceBenchmark(benchmarkId, benchmark) {
		await this.cleanTestEnvironment();

		const startTime = Date.now();
		let success = false;
		let error = null;

		try {
			switch (benchmarkId) {
				case "init-minimal":
					await execAsync(`node "${this.cliPath}" init --minimal`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
						timeout: benchmark.maxTime,
					});
					success = true;
					break;

				case "memory-operations":
					await execAsync(`node "${this.cliPath}" init --minimal`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});
					await execAsync(
						`node "${this.cliPath}" memory store perf-test value`,
						{
							cwd: this.testDir,
							env: { ...process.env, NODE_ENV: "test" },
						},
					);
					await execAsync(`node "${this.cliPath}" memory retrieve perf-test`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});
					success = true;
					break;

				case "hive-mind-init":
					await execAsync(`node "${this.cliPath}" init --minimal`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});
					await execAsync(`node "${this.cliPath}" hive-mind init`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
						timeout: benchmark.maxTime,
					});
					success = true;
					break;

				case "swarm-init":
					await execAsync(`node "${this.cliPath}" init --minimal`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});
					await execAsync(
						`node "${this.cliPath}" swarm init --agents 2 --objective "Performance test"`,
						{
							cwd: this.testDir,
							env: { ...process.env, NODE_ENV: "test" },
							timeout: benchmark.maxTime,
						},
					);
					success = true;
					break;

				case "status-check":
					await execAsync(`node "${this.cliPath}" init --minimal`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});
					await execAsync(`node "${this.cliPath}" status`, {
						cwd: this.testDir,
						env: { ...process.env, NODE_ENV: "test" },
						timeout: benchmark.maxTime,
					});
					success = true;
					break;
			}
		} catch (err) {
			error = err.message;
		}

		const executionTime = Date.now() - startTime;
		const withinBenchmark = executionTime <= benchmark.maxTime;

		return {
			id: benchmarkId,
			description: benchmark.description,
			executionTime,
			maxTime: benchmark.maxTime,
			withinBenchmark,
			success,
			error,
			performanceRatio: executionTime / benchmark.maxTime,
		};
	}
}

describe("🔄 Command Integration Regression Tests", () => {
	let testDir;
	let originalCwd;
	let framework;

	beforeEach(async () => {
		originalCwd = process.cwd();
		testDir = path.join(__dirname, `test-regression-${Date.now()}`);
		await fs.ensureDir(testDir);
		process.chdir(testDir);
		framework = new RegressionTestFramework(testDir, cliPath);
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		if (testDir && (await fs.pathExists(testDir))) {
			await fs.remove(testDir);
		}
	});

	test("should pass all regression test cases", async () => {
		const report = await framework.runRegressionSuite();

		// Log results for debugging
		console.log("\n📊 Regression Test Report:");
		console.log(`Total Tests: ${report.summary.total}`);
		console.log(`Passed: ${report.summary.passed}`);
		console.log(`Failed: ${report.summary.failed}`);
		console.log(`Errors: ${report.summary.errors}`);
		console.log(`Success Rate: ${report.summary.successRate.toFixed(2)}%`);

		// Report failed tests
		const failedTests = report.testResults.filter((r) => r.status !== "PASSED");
		if (failedTests.length > 0) {
			console.log("\n❌ Failed Tests:");
			failedTests.forEach((test) => {
				console.log(`  - ${test.name}: ${test.errors.join(", ")}`);
			});
		}

		// Expect at least 80% success rate for regression tests
		expect(report.summary.successRate).toBeGreaterThanOrEqual(80);

		// Expect no error-level failures (system errors)
		expect(report.summary.errors).toBe(0);
	}, 120000);

	test("should meet performance benchmarks", async () => {
		const performanceResults = await framework.runPerformanceBenchmarks();

		console.log("\n⚡ Performance Benchmark Results:");
		performanceResults.forEach((result) => {
			const status = result.withinBenchmark && result.success ? "✅" : "❌";
			console.log(
				`  ${status} ${result.description}: ${result.executionTime}ms (max: ${result.maxTime}ms)`,
			);
			if (result.error) {
				console.log(`    Error: ${result.error}`);
			}
		});

		// Check that all benchmarks pass
		const failedBenchmarks = performanceResults.filter(
			(r) => !r.withinBenchmark || !r.success,
		);

		if (failedBenchmarks.length > 0) {
			console.log("\n❌ Failed Performance Benchmarks:");
			failedBenchmarks.forEach((benchmark) => {
				console.log(
					`  - ${benchmark.description}: ${benchmark.executionTime}ms (exceeded ${benchmark.maxTime}ms)`,
				);
			});
		}

		// Allow up to 20% of benchmarks to exceed time limits (for CI/CD variance)
		const benchmarkPassRate =
			(performanceResults.filter((r) => r.withinBenchmark && r.success).length /
				performanceResults.length) *
			100;
		expect(benchmarkPassRate).toBeGreaterThanOrEqual(80);
	}, 180000);

	test("should maintain backward compatibility", async () => {
		// Test that existing workflows continue to work
		const backwardCompatibilityTests = [
			{
				name: "Legacy memory commands",
				commands: [
					"init --minimal",
					"memory store legacy-test value",
					"memory list",
					"memory retrieve legacy-test",
				],
			},
			{
				name: "Legacy agent commands",
				commands: ["init --minimal", "agent list"],
			},
			{
				name: "Legacy status commands",
				commands: ["init --minimal", "status"],
			},
		];

		for (const test of backwardCompatibilityTests) {
			for (const command of test.commands) {
				const result = await execAsync(`node "${cliPath}" ${command}`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 15000,
				});

				expect(result.code || 0).toBe(0);
			}

			// Clean environment between tests
			await framework.cleanTestEnvironment();
		}
	}, 60000);

	test("should handle command interaction edge cases", async () => {
		// Test edge cases that have caused regressions in the past
		const edgeCases = [
			{
				name: "Commands without initialization",
				test: async () => {
					try {
						await execAsync(`node "${cliPath}" memory store test value`, {
							cwd: testDir,
							env: { ...process.env, NODE_ENV: "test" },
						});
						return false; // Should have failed
					} catch (error) {
						return error.stderr && error.stderr.includes("not initialized");
					}
				},
			},
			{
				name: "Invalid command arguments",
				test: async () => {
					await execAsync(`node "${cliPath}" init --minimal`, {
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});

					try {
						await execAsync(`node "${cliPath}" memory store`, {
							cwd: testDir,
							env: { ...process.env, NODE_ENV: "test" },
						});
						return false; // Should have failed
					} catch (error) {
						return true; // Expected to fail
					}
				},
			},
			{
				name: "Concurrent command execution",
				test: async () => {
					await execAsync(`node "${cliPath}" init --minimal`, {
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});

					const promises = [
						execAsync(`node "${cliPath}" memory store concurrent-1 value1`, {
							cwd: testDir,
							env: { ...process.env, NODE_ENV: "test" },
						}),
						execAsync(`node "${cliPath}" memory store concurrent-2 value2`, {
							cwd: testDir,
							env: { ...process.env, NODE_ENV: "test" },
						}),
						execAsync(`node "${cliPath}" status`, {
							cwd: testDir,
							env: { ...process.env, NODE_ENV: "test" },
						}),
					];

					const results = await Promise.all(promises);
					return results.every((result) => (result.code || 0) === 0);
				},
			},
		];

		for (const edgeCase of edgeCases) {
			const passed = await edgeCase.test();
			expect(passed).toBe(true);

			// Clean environment between edge case tests
			await framework.cleanTestEnvironment();
		}
	}, 45000);
});
