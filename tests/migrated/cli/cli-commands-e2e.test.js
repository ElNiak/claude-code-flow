import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * End-to-end CLI command tests
 */

import { generateId } from "../../src/utils/helpers";
import { cleanupTestEnv, setupTestEnv } from "../test.config";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

describe("CLI Commands E2E", () => {
	let testDir: string;

	beforeEach(async () => {
		setupTestEnv();
		testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), { prefix: "claude-flow-e2e-" });
	});

	afterEach(async () => {
		try {
			await fs.promises.rm(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
		await cleanupTestEnv();
	});

	describe("configuration commands", () => {
		it("should show help information", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "--help"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout, stderr } = await command;
			const output = new TextDecoder().decode(stdout);
			const errorOutput = new TextDecoder().decode(stderr);

			expect(code).toBe(0);
			expect(output).toContain("Claude-Flow");
			expect(output).toContain("COMMANDS");
			expect(output).toContain("start");
			expect(output).toContain("config");
			expect(output).toContain("agent");
			expect(output).toContain("task");
			expect(output).toContain("memory");
		});

		it("should initialize configuration file", async () => {
			const configPath = `${testDir}/test-config.json`;

			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"init",
					configPath,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Configuration file created");

			// Verify file was created with valid content
			const stat = await fs.promises.stat(configPath);
			expect(stat.isFile).toBe(true);

			const content = await fs.promises.readFile(configPath);
			const config = JSON.parse(content);

			expect(config.orchestrator).toBeDefined();
			expect(config.terminal).toBeDefined();
			expect(config.memory).toBeDefined();
			expect(config.coordination).toBeDefined();
			expect(config.mcp).toBeDefined();
			expect(config.logging).toBeDefined();

			// Check specific default values
			expect(config.orchestrator.maxConcurrentAgents).toBe(10);
			expect(config.terminal.type).toBe("auto");
			expect(config.memory.backend).toBe("hybrid");
		});

		it("should validate configuration file", async () => {
			const configPath = `${testDir}/valid-config.json`;

			// Create a valid config file
			const validConfig = {
				orchestrator: {
					maxConcurrentAgents: 5,
					taskQueueSize: 50,
					healthCheckInterval: 30000,
					shutdownTimeout: 10000,
				},
				terminal: {
					type: "native",
					poolSize: 3,
					recycleAfter: 5,
					healthCheckInterval: 15000,
					commandTimeout: 30000,
				},
				memory: {
					backend: "sqlite",
					cacheSizeMB: 100,
					syncInterval: 5000,
					conflictResolution: "crdt",
					retentionDays: 30,
				},
				coordination: {
					maxRetries: 3,
					retryDelay: 1000,
					deadlockDetection: true,
					resourceTimeout: 30000,
					messageTimeout: 10000,
				},
				mcp: {
					transport: "stdio",
				},
				logging: {
					level: "info",
					format: "json",
					destination: "both",
					filePath: "./logs/claude-flow.log",
				},
			};

			await fs.promises.writeFile(
				configPath,
				JSON.stringify(validConfig, null, 2),
			);

			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"validate",
					configPath,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Configuration is valid");
		});

		it("should detect invalid configuration", async () => {
			const configPath = `${testDir}/invalid-config.json`;

			// Create an invalid config file
			const invalidConfig = {
				orchestrator: {
					maxConcurrentAgents: 0, // Invalid: must be at least 1
					taskQueueSize: -10, // Invalid: negative value
				},
				terminal: {
					type: "invalid-type", // Invalid: not in enum
					poolSize: 0, // Invalid: must be at least 1
				},
				memory: {
					backend: "unknown", // Invalid: not in enum
					cacheSizeMB: -5, // Invalid: negative value
				},
			};

			await fs.promises.writeFile(
				configPath,
				JSON.stringify(invalidConfig, null, 2),
			);

			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"validate",
					configPath,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(1); // Should exit with error code
			expect(output).toContain("Configuration validation failed");
		});

		it("should show current configuration", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "config", "show"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);

			// Should contain JSON configuration
			const config = JSON.parse(output);
			expect(config.orchestrator).toBeDefined();
			expect(config.terminal).toBeDefined();
			expect(config.memory).toBeDefined();
		});
	});

	describe("agent commands", () => {
		it("should create agent profile", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"spawn",
					"researcher",
					"--name",
					"Test Researcher",
					"--priority",
					"5",
					"--capabilities",
					"analysis,research,web-search",
					"--max-tasks",
					"3",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Agent profile created");

			// Parse JSON output to verify profile
			const profile = JSON.parse(
				output.split("\n").find((line) => line.includes('"id"')) || "{}",
			);
			expect(profile.name).toBe("Test Researcher");
			expect(profile.type).toBe("researcher");
			expect(profile.priority).toBe(5);
			expect(profile.maxConcurrentTasks).toBe(3);
			expect(profile.capabilities.includes("analysis")).toBe(true);
			expect(profile.capabilities.includes("research")).toBe(true);
		});

		it("should list agent profiles", async () => {
			// First create an agent
			const createCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"spawn",
					"implementer",
					"--name",
					"Test Implementer",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			await createCommand;

			// Then list agents
			const listCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "agent", "list"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await listCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Active Agents");
		});

		it("should show agent status", async () => {
			// Create and start an agent first
			const spawnCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"spawn",
					"coordinator",
					"--name",
					"Status Test Agent",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { stdout: spawnOutput } = await spawnCommand;
			const spawnResult = new TextDecoder().decode(spawnOutput);

			// Extract agent ID from spawn output
			const agentMatch = spawnResult.match(/"id":\s*"([^"]+)"/);
			if (!agentMatch) {
				throw new Error("Could not extract agent ID from spawn output");
			}
			const agentId = agentMatch[1];

			// Check agent status
			const statusCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"status",
					agentId,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await statusCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain(agentId);
			expect(output).toContain("Status Test Agent");
		});

		it("should terminate agent", async () => {
			// Create an agent first
			const spawnCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"spawn",
					"analyst",
					"--name",
					"Terminate Test Agent",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { stdout: spawnOutput } = await spawnCommand;
			const spawnResult = new TextDecoder().decode(spawnOutput);

			const agentMatch = spawnResult.match(/"id":\s*"([^"]+)"/);
			if (!agentMatch) {
				throw new Error("Could not extract agent ID from spawn output");
			}
			const agentId = agentMatch[1];

			// Terminate the agent
			const terminateCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"terminate",
					agentId,
					"--reason",
					"Test termination",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await terminateCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Agent terminated");
			expect(output).toContain(agentId);
		});
	});

	describe("task commands", () => {
		it("should create task", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"create",
					"analysis",
					"Analyze the test data for patterns",
					"--priority",
					"8",
					"--dependencies",
					"data-collection,preprocessing",
					"--metadata",
					'{"dataset": "test-data", "algorithm": "kmeans"}',
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Task created");

			// Parse JSON output to verify task
			const task = JSON.parse(
				output.split("\n").find((line) => line.includes('"id"')) || "{}",
			);
			expect(task.type).toBe("analysis");
			expect(task.description).toBe("Analyze the test data for patterns");
			expect(task.priority).toBe(8);
			expect(task.dependencies.includes("data-collection")).toBe(true);
			expect(task.dependencies.includes("preprocessing")).toBe(true);
			expect(task.input.dataset).toBe("test-data");
		});

		it("should list tasks", async () => {
			// Create a task first
			const createCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"create",
					"test-task",
					"Test task for listing",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			await createCommand;

			// List tasks
			const listCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "task", "list"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await listCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Tasks");
		});

		it("should show task status", async () => {
			// Create a task first
			const createCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"create",
					"status-test",
					"Task for status testing",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { stdout: createOutput } = await createCommand;
			const createResult = new TextDecoder().decode(createOutput);

			const taskMatch = createResult.match(/"id":\s*"([^"]+)"/);
			if (!taskMatch) {
				throw new Error("Could not extract task ID from create output");
			}
			const taskId = taskMatch[1];

			// Check task status
			const statusCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"status",
					taskId,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await statusCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain(taskId);
			expect(output).toContain("status-test");
		});

		it("should execute task", async () => {
			// Create a simple task first
			const createCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"create",
					"shell-command",
					"Execute echo command",
					"--metadata",
					'{"command": "echo Hello World"}',
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { stdout: createOutput } = await createCommand;
			const createResult = new TextDecoder().decode(createOutput);

			const taskMatch = createResult.match(/"id":\s*"([^"]+)"/);
			if (!taskMatch) {
				throw new Error("Could not extract task ID from create output");
			}
			const taskId = taskMatch[1];

			// Execute the task
			const executeCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"execute",
					taskId,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await executeCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Task execution");
		});

		it("should cancel task", async () => {
			// Create a task first
			const createCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"create",
					"cancellation-test",
					"Task for cancellation testing",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { stdout: createOutput } = await createCommand;
			const createResult = new TextDecoder().decode(createOutput);

			const taskMatch = createResult.match(/"id":\s*"([^"]+)"/);
			if (!taskMatch) {
				throw new Error("Could not extract task ID from create output");
			}
			const taskId = taskMatch[1];

			// Cancel the task
			const cancelCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"task",
					"cancel",
					taskId,
					"--reason",
					"Test cancellation",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await cancelCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Task cancelled");
			expect(output).toContain(taskId);
		});
	});

	describe("memory commands", () => {
		it("should query memory entries", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"memory",
					"query",
					"--type",
					"observation",
					"--tags",
					"test,important",
					"--limit",
					"10",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Memory query results");
		});

		it("should store memory entry", async () => {
			const entryContent = "Test memory entry for CLI testing";

			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"memory",
					"store",
					"--agent-id",
					"test-agent",
					"--type",
					"observation",
					"--content",
					entryContent,
					"--tags",
					"cli-test,manual",
					"--context",
					'{"source": "cli", "test": true}',
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Memory entry stored");
			expect(output).toContain(entryContent);
		});

		it("should delete memory entry", async () => {
			// First store an entry
			const storeCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"memory",
					"store",
					"--agent-id",
					"test-agent",
					"--type",
					"observation",
					"--content",
					"Entry to be deleted",
					"--tags",
					"delete-test",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { stdout: storeOutput } = await storeCommand;
			const storeResult = new TextDecoder().decode(storeOutput);

			const entryMatch = storeResult.match(/"id":\s*"([^"]+)"/);
			if (!entryMatch) {
				throw new Error("Could not extract entry ID from store output");
			}
			const entryId = entryMatch[1];

			// Delete the entry
			const deleteCommand = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"memory",
					"delete",
					entryId,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await deleteCommand;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Memory entry deleted");
			expect(output).toContain(entryId);
		});

		it("should sync memory", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "memory", "sync"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Memory synchronization");
		});

		it("should show memory statistics", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "memory", "stats"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Memory Statistics");
		});
	});

	describe("system commands", () => {
		it("should start system in test mode", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"start",
					"--test-mode",
					"--timeout",
					"5000", // 5 second timeout for testing
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Claude-Flow system");
		});

		it("should show system status", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "status"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("System Status");
		});

		it("should show version information", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "--version"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			expect(output).toContain("Claude-Flow");
			expect(output).toContain("version");
		});
	});

	describe("error handling", () => {
		it("should handle invalid commands gracefully", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: ["run", "--allow-all", "src/cli/index.ts", "invalid-command"],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stderr } = await command;
			const errorOutput = new TextDecoder().decode(stderr);

			expect(code).toBe(1);
			expect(errorOutput).toContain("Unknown command");
		});

		it("should handle missing required arguments", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"spawn", // Missing agent type
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stderr } = await command;
			const errorOutput = new TextDecoder().decode(stderr);

			expect(code).toBe(1);
			expect(errorOutput).toContain("required");
		});

		it("should handle invalid file paths", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"validate",
					"/non/existent/path.json",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stderr } = await command;
			const errorOutput = new TextDecoder().decode(stderr);

			expect(code).toBe(1);
			expect(errorOutput).toContain("not found");
		});

		it("should handle invalid JSON in configuration", async () => {
			const invalidConfigPath = `${testDir}/invalid.json`;
			await fs.promises.writeFile(invalidConfigPath, "{ invalid json }");

			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"validate",
					invalidConfigPath,
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stderr } = await command;
			const errorOutput = new TextDecoder().decode(stderr);

			expect(code).toBe(1);
			expect(errorOutput).toContain("JSON");
		});
	});

	describe("output formats", () => {
		it("should support JSON output format", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"show",
					"--format",
					"json",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);

			// Should be valid JSON
			const config = JSON.parse(output);
			expect(config.orchestrator).toBeDefined();
		});

		it("should support table output format", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"agent",
					"list",
					"--format",
					"table",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			// Table format should contain headers and borders
			expect(output).toContain("|");
		});

		it("should support YAML output format", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"show",
					"--format",
					"yaml",
				],
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const { code, stdout } = await command;
			const output = new TextDecoder().decode(stdout);

			expect(code).toBe(0);
			// YAML format should contain key-value pairs with colons
			expect(output).toContain("orchestrator:");
			expect(output).toContain("terminal:");
		});
	});

	describe("interactive mode", () => {
		it("should support interactive configuration setup", async () => {
			// Note: This test simulates interactive input
			const command = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, {
				args: [
					"run",
					"--allow-all",
					"src/cli/index.ts",
					"config",
					"init",
					`${testDir}/interactive-config.json`,
					"--interactive",
				],
				stdin: "piped",
				stdout: "piped",
				stderr: "piped",
				cwd: process.cwd(),
			});

			const process = command.spawn();

			// Simulate user input
			const writer = process.stdin.getWriter();
			await writer.write(new TextEncoder().encode("\n")); // Accept defaults
			await writer.write(new TextEncoder().encode("\n"));
			await writer.write(new TextEncoder().encode("\n"));
			await writer.close();

			const { code } = await process;
			expect(code).toBe(0);
		});
	});
});
