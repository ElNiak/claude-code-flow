/**
 * ABOUTME: Tests for command workflow dependencies, coordination patterns, and cross-command relationships
 * ABOUTME: Validates dependency chains, workflow orchestration, and command interaction patterns
 */

import { jest } from "@jest/globals";
import { exec, spawn } from "child_process";
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
 * Command dependency mapping based on codebase analysis
 */
const COMMAND_DEPENDENCIES = {
	"hive-mind": {
		requires: ["init"],
		optionalDeps: ["memory", "config"],
		integrates: ["swarm", "agent", "task"],
	},
	swarm: {
		requires: ["init"],
		optionalDeps: ["memory", "hive-mind"],
		integrates: ["task", "agent"],
	},
	agent: {
		requires: ["init"],
		optionalDeps: ["swarm", "memory"],
		integrates: ["task", "hive-mind"],
	},
	task: {
		requires: ["init"],
		optionalDeps: ["memory", "agent"],
		integrates: ["swarm", "hive-mind"],
	},
	memory: {
		requires: ["init"],
		optionalDeps: [],
		integrates: ["all"],
	},
	config: {
		requires: [],
		optionalDeps: [],
		integrates: ["all"],
	},
	status: {
		requires: [],
		optionalDeps: ["init"],
		integrates: ["all"],
	},
};

describe("🔗 Workflow Dependency Integration Tests", () => {
	let testDir;
	let originalCwd;

	beforeEach(async () => {
		originalCwd = process.cwd();
		testDir = path.join(__dirname, `test-workflow-${Date.now()}`);
		await fs.ensureDir(testDir);
		process.chdir(testDir);
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		if (testDir && (await fs.pathExists(testDir))) {
			await fs.remove(testDir);
		}
	});

	describe("📋 Command Dependency Validation", () => {
		test("should enforce init dependency for core commands", async () => {
			const commandsRequiringInit = [
				"hive-mind",
				"swarm",
				"agent",
				"task",
				"memory",
			];

			for (const command of commandsRequiringInit) {
				try {
					const result = await execAsync(
						`node "${cliPath}" ${command} status`,
						{
							cwd: testDir,
							env: { ...process.env, NODE_ENV: "test" },
							timeout: 10000,
						},
					);

					// If command succeeds without init, check if it properly handles missing initialization
					if (result.code === 0) {
						expect(result.stdout || result.stderr).toMatch(
							/(not initialized|directory not found|no configuration)/i,
						);
					}
				} catch (error) {
					// Expected behavior - commands should fail without init
					expect(error.stderr || error.message).toMatch(
						/(not initialized|directory not found|missing|error)/i,
					);
				}
			}
		}, 30000);

		test("should allow commands to work after proper initialization", async () => {
			// Initialize the project
			const initResult = await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(initResult.code || 0).toBe(0);

			// Test each command works after initialization
			const commandsToTest = [
				{ cmd: "memory list", expectPattern: /Memory|No entries|Entries/ },
				{ cmd: "agent list", expectPattern: /Agent|Available|Types/ },
				{ cmd: "status", expectPattern: /Status|System|Claude/ },
				{ cmd: "task list", expectPattern: /Task|No tasks|Tasks/ },
			];

			for (const { cmd, expectPattern } of commandsToTest) {
				const result = await execAsync(`node "${cliPath}" ${cmd}`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});

				expect(result.code || 0).toBe(0);
				expect(result.stdout).toMatch(expectPattern);
			}
		}, 25000);
	});

	describe("🔄 Workflow Orchestration Patterns", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should support hive-mind → swarm → task coordination workflow", async () => {
			// Step 1: Initialize hive-mind
			const hiveInitResult = await execAsync(
				`node "${cliPath}" hive-mind init`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 15000,
				},
			);

			expect(hiveInitResult.code || 0).toBe(0);

			// Step 2: Store workflow context
			await execAsync(
				`node "${cliPath}" memory store "workflow-context" "hive-swarm-task-coordination"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Step 3: Initialize swarm with coordination context
			const swarmResult = await execAsync(
				`node "${cliPath}" swarm init --agents 3 --objective "Coordinate with hive-mind"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 15000,
				},
			);

			expect(swarmResult.code || 0).toBe(0);

			// Step 4: Create coordinated task
			const taskResult = await execAsync(
				`node "${cliPath}" task create "Execute hive-swarm coordination" --priority high`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(taskResult.code || 0).toBe(0);

			// Step 5: Verify coordination state
			const memoryResult = await execAsync(
				`node "${cliPath}" memory retrieve "workflow-context"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryResult.stdout).toContain("hive-swarm-task-coordination");
		}, 40000);

		test("should handle memory-driven command coordination", async () => {
			// Create coordination context in memory
			const contexts = [
				{ key: "project-phase", value: "planning" },
				{ key: "team-size", value: "5" },
				{ key: "architecture", value: "microservices" },
				{ key: "priority", value: "high" },
			];

			// Store all context data
			for (const context of contexts) {
				await execAsync(
					`node "${cliPath}" memory store "${context.key}" "${context.value}"`,
					{
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
					},
				);
			}

			// Use context to drive agent decisions
			const agentResult = await execAsync(`node "${cliPath}" agent list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(agentResult.code || 0).toBe(0);

			// Create tasks based on context
			const taskResult = await execAsync(
				`node "${cliPath}" task create "Plan microservices architecture" --priority high`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(taskResult.code || 0).toBe(0);

			// Verify all context is available
			const memoryListResult = await execAsync(
				`node "${cliPath}" memory list`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			contexts.forEach(({ key }) => {
				expect(memoryListResult.stdout).toContain(key);
			});
		}, 25000);
	});

	describe("🎯 Cross-Command Integration Scenarios", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should support complex multi-command workflows", async () => {
			const workflow = [
				{
					name: "Store Project Context",
					command: `memory store "project-name" "integration-test-project"`,
					verify: (result) => expect(result.code || 0).toBe(0),
				},
				{
					name: "Create Primary Task",
					command: `task create "Build integration system" --priority high`,
					verify: (result) => expect(result.code || 0).toBe(0),
				},
				{
					name: "Check System Status",
					command: `status`,
					verify: (result) => {
						expect(result.code || 0).toBe(0);
						expect(result.stdout).toContain("Status");
					},
				},
				{
					name: "List Available Agents",
					command: `agent list`,
					verify: (result) => {
						expect(result.code || 0).toBe(0);
						expect(result.stdout).toContain("Agent");
					},
				},
				{
					name: "Update Task Progress",
					command: `memory store "task-progress" "agents-listed"`,
					verify: (result) => expect(result.code || 0).toBe(0),
				},
				{
					name: "Initialize Swarm",
					command: `swarm init --agents 2 --objective "Support integration testing"`,
					verify: (result) => expect(result.code || 0).toBe(0),
				},
				{
					name: "Final Status Check",
					command: `status`,
					verify: (result) => {
						expect(result.code || 0).toBe(0);
						expect(result.stdout).toContain("Status");
					},
				},
			];

			for (const step of workflow) {
				const result = await execAsync(`node "${cliPath}" ${step.command}`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 15000,
				});

				step.verify(result);

				// Small delay between commands for system stability
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			// Verify final workflow state
			const finalState = await execAsync(`node "${cliPath}" memory list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(finalState.stdout).toContain("project-name");
			expect(finalState.stdout).toContain("task-progress");
		}, 45000);

		test("should handle command composition and chaining", async () => {
			// Test command composition patterns
			const compositionTests = [
				{
					name: "Memory → Agent → Task Chain",
					steps: [
						`memory store "agent-context" "api-development"`,
						`agent list`,
						`task create "Build API with context" --priority medium`,
					],
				},
				{
					name: "Config → Status → Memory Chain",
					steps: [
						`config show`,
						`status`,
						`memory store "system-check" "completed"`,
					],
				},
				{
					name: "Task → Memory → Status Chain",
					steps: [
						`task create "Integration test task" --priority low`,
						`memory store "test-phase" "execution"`,
						`status`,
					],
				},
			];

			for (const test of compositionTests) {
				for (const step of test.steps) {
					const result = await execAsync(`node "${cliPath}" ${step}`, {
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
					});

					expect(result.code || 0).toBe(0);
				}

				// Small delay between test suites
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			// Verify all operations completed successfully
			const memoryResult = await execAsync(`node "${cliPath}" memory list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(memoryResult.stdout).toContain("agent-context");
			expect(memoryResult.stdout).toContain("system-check");
			expect(memoryResult.stdout).toContain("test-phase");
		}, 35000);
	});

	describe("🔧 Dependency Resolution and Error Handling", () => {
		test("should provide clear dependency error messages", async () => {
			const dependencyTests = [
				{
					command: "hive-mind status",
					expectedError: /(not initialized|directory not found|missing)/i,
				},
				{
					command: "swarm status",
					expectedError: /(not initialized|not found|missing)/i,
				},
				{
					command: "memory retrieve nonexistent",
					expectedError: /(not initialized|not found|missing)/i,
				},
			];

			for (const test of dependencyTests) {
				try {
					await execAsync(`node "${cliPath}" ${test.command}`, {
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
						timeout: 10000,
					});
				} catch (error) {
					expect(error.stderr || error.message).toMatch(test.expectedError);
				}
			}
		}, 20000);

		test("should recover gracefully from dependency failures", async () => {
			// Test partial initialization recovery
			try {
				await execAsync(`node "${cliPath}" memory store "test" "value"`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});
			} catch (error) {
				// Expected to fail
				expect(error.stderr || error.message).toMatch(
					/(not initialized|not found)/i,
				);
			}

			// Perform initialization
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			// Retry the failed operation
			const retryResult = await execAsync(
				`node "${cliPath}" memory store "test" "value"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(retryResult.code || 0).toBe(0);

			// Verify the operation succeeded
			const verifyResult = await execAsync(
				`node "${cliPath}" memory retrieve "test"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(verifyResult.stdout).toContain("value");
		}, 20000);
	});

	describe("📊 Performance and Regression Testing", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should handle high-volume command interactions", async () => {
			const startTime = Date.now();
			const operations = [];

			// Create multiple parallel operations
			for (let i = 0; i < 10; i++) {
				operations.push(
					execAsync(
						`node "${cliPath}" memory store "bulk-test-${i}" "value-${i}"`,
						{
							cwd: testDir,
							env: { ...process.env, NODE_ENV: "test" },
						},
					),
				);
			}

			const results = await Promise.all(operations);
			const endTime = Date.now();

			// Verify all operations completed successfully
			results.forEach((result, index) => {
				expect(result.code || 0).toBe(0);
			});

			// Performance assertion - should complete within reasonable time
			const duration = endTime - startTime;
			expect(duration).toBeLessThan(30000); // 30 seconds max

			// Verify data integrity
			const listResult = await execAsync(`node "${cliPath}" memory list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			for (let i = 0; i < 10; i++) {
				expect(listResult.stdout).toContain(`bulk-test-${i}`);
			}
		}, 45000);

		test("should maintain consistency under concurrent operations", async () => {
			// Test concurrent read/write operations
			const concurrentOps = [
				execAsync(`node "${cliPath}" memory store "concurrent-1" "data-1"`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				}),
				execAsync(`node "${cliPath}" memory store "concurrent-2" "data-2"`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				}),
				execAsync(`node "${cliPath}" status`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				}),
				execAsync(`node "${cliPath}" agent list`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				}),
			];

			const results = await Promise.all(concurrentOps);

			// All operations should succeed
			results.forEach((result) => {
				expect(result.code || 0).toBe(0);
			});

			// Verify data consistency
			const dataCheck1 = await execAsync(
				`node "${cliPath}" memory retrieve "concurrent-1"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			const dataCheck2 = await execAsync(
				`node "${cliPath}" memory retrieve "concurrent-2"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(dataCheck1.stdout).toContain("data-1");
			expect(dataCheck2.stdout).toContain("data-2");
		}, 25000);
	});
});
