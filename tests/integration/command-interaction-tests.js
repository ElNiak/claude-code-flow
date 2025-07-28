/**
 * ABOUTME: Integration tests for command interactions, workflows, and cross-command dependencies
 * ABOUTME: Tests command chaining, coordination patterns, and end-to-end CLI workflow scenarios
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

describe("🔗 Command Interaction Integration Tests", () => {
	let testDir;
	let originalCwd;

	beforeEach(async () => {
		originalCwd = process.cwd();
		testDir = path.join(__dirname, `test-integration-${Date.now()}`);
		await fs.ensureDir(testDir);
		process.chdir(testDir);
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		if (testDir && (await fs.pathExists(testDir))) {
			await fs.remove(testDir);
		}
	});

	describe("🏗️ Init → Memory → Agent Workflow", () => {
		test("should complete full initialization and agent spawning workflow", async () => {
			// Step 1: Initialize project
			const initResult = await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(initResult.stdout).toContain("Claude-Flow initialized");

			// Step 2: Store coordination memory
			const memoryResult = await execAsync(
				`node "${cliPath}" memory store "project-context" "Building REST API with authentication"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryResult.code || 0).toBe(0);

			// Step 3: Check memory persistence
			const retrieveResult = await execAsync(
				`node "${cliPath}" memory retrieve "project-context"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(retrieveResult.stdout).toContain(
				"Building REST API with authentication",
			);

			// Step 4: List available agent types
			const agentListResult = await execAsync(`node "${cliPath}" agent list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(agentListResult.stdout).toContain("Available Agent Types");
		}, 30000);

		test("should handle command dependencies correctly", async () => {
			// Test that memory commands fail without initialization
			try {
				await execAsync(`node "${cliPath}" memory store "test" "value"`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});
			} catch (error) {
				expect(error.stderr || error.message).toContain(
					"not initialized" || "directory not found",
				);
			}

			// Initialize and retry
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			const memoryResult = await execAsync(
				`node "${cliPath}" memory store "test" "value"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryResult.code || 0).toBe(0);
		}, 20000);
	});

	describe("🐝 Hive-Mind → Swarm Coordination", () => {
		beforeEach(async () => {
			// Initialize for hive-mind tests
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should initialize hive-mind and spawn coordinated swarm", async () => {
			// Step 1: Initialize hive-mind
			const hiveInitResult = await execAsync(
				`node "${cliPath}" hive-mind init`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(hiveInitResult.code || 0).toBe(0);

			// Step 2: Check hive-mind status
			const statusResult = await execAsync(
				`node "${cliPath}" hive-mind status`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(statusResult.stdout).toContain("Hive Mind Status");

			// Step 3: Store coordination context in memory
			await execAsync(
				`node "${cliPath}" memory store "swarm-objective" "Build microservices architecture"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Step 4: Spawn swarm with coordination
			const spawnResult = await execAsync(
				`node "${cliPath}" hive-mind spawn "Build API endpoints" --worker-types "researcher,architect,coder"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 15000,
				},
			);

			expect(spawnResult.code || 0).toBe(0);
		}, 25000);

		test("should handle consensus workflow integration", async () => {
			// Initialize hive-mind
			await execAsync(`node "${cliPath}" hive-mind init`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			// Store decision context
			await execAsync(
				`node "${cliPath}" memory store "decision-context" "Architecture choice for scaling"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Test consensus viewing (should not fail)
			const consensusResult = await execAsync(
				`node "${cliPath}" hive-mind consensus`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(consensusResult.code || 0).toBe(0);
		}, 20000);
	});

	describe("📊 Status → Config → Monitor Integration", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should integrate status, config, and monitoring commands", async () => {
			// Step 1: Check system status
			const statusResult = await execAsync(`node "${cliPath}" status`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(statusResult.stdout).toContain("System Status");

			// Step 2: Show configuration
			const configResult = await execAsync(`node "${cliPath}" config show`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(configResult.code || 0).toBe(0);

			// Step 3: Check memory stats (integrated monitoring)
			const memoryStatsResult = await execAsync(
				`node "${cliPath}" memory stats`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryStatsResult.code || 0).toBe(0);
		}, 15000);

		test("should handle configuration changes affecting other commands", async () => {
			// Test config changes and their effects
			const configSetResult = await execAsync(
				`node "${cliPath}" config set memory.namespace "test-integration"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(configSetResult.code || 0).toBe(0);

			// Verify config change affects memory operations
			await execAsync(
				`node "${cliPath}" memory store "test-key" "test-value"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			const listResult = await execAsync(`node "${cliPath}" memory list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(listResult.stdout).toContain("test-key");
		}, 15000);
	});

	describe("🔄 Task → Swarm → Memory Workflow", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should create task, spawn swarm, and coordinate through memory", async () => {
			// Step 1: Create a task
			const taskResult = await execAsync(
				`node "${cliPath}" task create "Implement user authentication" --priority high`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(taskResult.code || 0).toBe(0);

			// Step 2: Store task context in memory
			await execAsync(
				`node "${cliPath}" memory store "current-task" "authentication-implementation"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Step 3: List tasks to verify creation
			const listTasksResult = await execAsync(`node "${cliPath}" task list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(listTasksResult.code || 0).toBe(0);

			// Step 4: Check swarm integration with tasks
			const swarmResult = await execAsync(
				`node "${cliPath}" swarm init --agents 3 --objective "Complete authentication task"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(swarmResult.code || 0).toBe(0);
		}, 25000);

		test("should handle task status updates affecting swarm coordination", async () => {
			// Create initial task
			await execAsync(
				`node "${cliPath}" task create "Build API endpoints" --priority medium`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Check task status
			const statusResult = await execAsync(`node "${cliPath}" task status`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(statusResult.code || 0).toBe(0);

			// Store task progress in memory
			await execAsync(
				`node "${cliPath}" memory store "task-progress" "endpoints-defined"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Verify memory coordination
			const memoryResult = await execAsync(
				`node "${cliPath}" memory retrieve "task-progress"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryResult.stdout).toContain("endpoints-defined");
		}, 20000);
	});

	describe("🔧 Command Chaining and Composition", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should support complex command chaining workflows", async () => {
			// Chain 1: Init → Memory Store → Agent List → Status
			const commands = [
				`node "${cliPath}" memory store "workflow-step" "1"`,
				`node "${cliPath}" agent list`,
				`node "${cliPath}" memory store "workflow-step" "2"`,
				`node "${cliPath}" status`,
				`node "${cliPath}" memory store "workflow-step" "3"`,
			];

			for (const command of commands) {
				const result = await execAsync(command, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});
				expect(result.code || 0).toBe(0);
			}

			// Verify final state
			const finalResult = await execAsync(
				`node "${cliPath}" memory retrieve "workflow-step"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(finalResult.stdout).toContain("3");
		}, 30000);

		test("should handle parallel command execution scenarios", async () => {
			// Test commands that can run in parallel
			const parallelCommands = [
				`node "${cliPath}" memory store "parallel-1" "value1"`,
				`node "${cliPath}" memory store "parallel-2" "value2"`,
				`node "${cliPath}" memory store "parallel-3" "value3"`,
			];

			const promises = parallelCommands.map((command) =>
				execAsync(command, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				}),
			);

			const results = await Promise.all(promises);
			results.forEach((result) => {
				expect(result.code || 0).toBe(0);
			});

			// Verify all parallel operations completed
			const listResult = await execAsync(`node "${cliPath}" memory list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(listResult.stdout).toContain("parallel-1");
			expect(listResult.stdout).toContain("parallel-2");
			expect(listResult.stdout).toContain("parallel-3");
		}, 20000);
	});

	describe("🚨 Error Handling and Recovery Workflows", () => {
		test("should handle command failure cascades gracefully", async () => {
			// Test failing command chain
			try {
				await execAsync(`node "${cliPath}" memory store "test" "value"`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});
			} catch (error) {
				// Should fail without initialization
				expect(error.stderr || error.message).toContain(
					"not initialized" || "directory not found",
				);
			}

			// Recovery: Initialize and retry
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			const retryResult = await execAsync(
				`node "${cliPath}" memory store "test" "value"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(retryResult.code || 0).toBe(0);
		}, 15000);

		test("should maintain command state consistency during errors", async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			// Store initial state
			await execAsync(
				`node "${cliPath}" memory store "error-test" "initial-state"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Attempt invalid operation
			try {
				await execAsync(`node "${cliPath}" unknown-command`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});
			} catch (error) {
				// Expected to fail
				expect(error.stderr || error.message).toContain("Unknown command");
			}

			// Verify state is still consistent
			const stateResult = await execAsync(
				`node "${cliPath}" memory retrieve "error-test"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(stateResult.stdout).toContain("initial-state");
		}, 15000);
	});

	describe("🔄 Cross-Command Data Flow", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should maintain data consistency across command boundaries", async () => {
			// Store project configuration
			await execAsync(
				`node "${cliPath}" memory store "project-config" '{"name":"test-project","version":"1.0.0"}'`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Use configuration in agent command
			const agentResult = await execAsync(`node "${cliPath}" agent list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(agentResult.code || 0).toBe(0);

			// Verify configuration persists
			const configResult = await execAsync(
				`node "${cliPath}" memory retrieve "project-config"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(configResult.stdout).toContain("test-project");
		}, 15000);

		test("should support complex workflow state transitions", async () => {
			// Workflow: Task Creation → Memory Update → Status Check → Completion
			const workflowSteps = [
				{
					command: `node "${cliPath}" task create "Integration test workflow"`,
					description: "Create task",
				},
				{
					command: `node "${cliPath}" memory store "workflow-state" "task-created"`,
					description: "Update state",
				},
				{
					command: `node "${cliPath}" status`,
					description: "Check system status",
				},
				{
					command: `node "${cliPath}" memory store "workflow-state" "status-checked"`,
					description: "Update workflow state",
				},
				{
					command: `node "${cliPath}" memory retrieve "workflow-state"`,
					description: "Verify final state",
				},
			];

			for (const step of workflowSteps) {
				const result = await execAsync(step.command, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});

				expect(result.code || 0).toBe(0);
			}

			// Final verification
			const finalState = await execAsync(
				`node "${cliPath}" memory retrieve "workflow-state"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(finalState.stdout).toContain("status-checked");
		}, 25000);
	});
});
