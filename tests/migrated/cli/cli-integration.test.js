import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Integration tests for Claude-Flow CLI
 */

import { jest } from "@jest/globals";
import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../");
const cliPath = path.join(rootDir, "src/cli/simple-cli.js");

describe("CLI Integration Tests", () => {
	let testDir;

	beforeEach(async () => {
		// Create temporary test directory
		testDir = path.join(__dirname, `test-${Date.now()}`);
		await fs.ensureDir(testDir);
		process.chdir(testDir);
	});

	afterEach(async () => {
		// Cleanup test directory
		if (testDir && (await fs.pathExists(testDir))) {
			await fs.remove(testDir);
		}
	});

	describe("CLI Commands", () => {
		test("should show help when no arguments", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
			});

			let stdout = "";
			child.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			child.on("close", (code) => {
				expect(stdout).toContain("Claude-Flow v2.0.0");
				expect(stdout).toContain("USAGE:");
				expect(stdout).toContain("claude-flow <command> [options]");
				done();
			});
		}, 10000);

		test("should show version", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "--version"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
			});

			let stdout = "";
			child.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			child.on("close", (code) => {
				expect(stdout.trim()).toBe("2.0.0");
				expect(code).toBe(0);
				done();
			});
		}, 10000);

		test("should handle unknown command", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "unknown-command"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
			});

			let stderr = "";
			child.stderr.on("data", (data) => {
				stderr += data.toString();
			});

			child.on("close", (code) => {
				expect(stderr).toContain("Unknown command: unknown-command");
				expect(code).toBe(1);
				done();
			});
		}, 10000);
	});

	describe("Init Command", () => {
		test("should initialize basic setup", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "init", "--minimal"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
				cwd: testDir,
			});

			let stdout = "";
			child.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			child.on("close", async (code) => {
				try {
					expect(code).toBe(0);
					expect(stdout).toContain("Claude-Flow initialized");

					// Check if .claude directory was created
					const claudeDir = path.join(testDir, ".claude");
					expect(await fs.pathExists(claudeDir)).toBe(true);

					done();
				} catch (error) {
					done(error);
				}
			});
		}, 15000);

		test("should initialize with SPARC setup", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "init", "--sparc"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
				cwd: testDir,
			});

			let stdout = "";
			child.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			child.on("close", async (code) => {
				try {
					expect(code).toBe(0);
					expect(stdout).toContain("SPARC development environment");

					// Check for SPARC files
					const sparcFiles = [
						path.join(testDir, ".roomodes"),
						path.join(testDir, "CLAUDE.md"),
						path.join(testDir, ".claude", "commands"),
					];

					for (const file of sparcFiles) {
						expect(await fs.pathExists(file)).toBe(true);
					}

					done();
				} catch (error) {
					done(error);
				}
			});
		}, 20000);
	});

	describe("Memory Command", () => {
		beforeEach(async () => {
			// Initialize basic setup first
			await new Promise((resolve) => {
				const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "init", "--minimal"], {
					stdio: "ignore",
					env: { ...process.env, NODE_ENV: "test" },
					cwd: testDir,
				});
				child.on("close", resolve);
			});
		});

		test("should store and retrieve memory", (done) => {
			// First store a memory
			const storeChild = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn(
				"node",
				[cliPath, "memory", "store", "test-key", "test-value"],
				{
					stdio: ["pipe", "pipe", "pipe"],
					env: { ...process.env, NODE_ENV: "test" },
					cwd: testDir,
				},
			);

			storeChild.on("close", (code) => {
				expect(code).toBe(0);

				// Then retrieve it
				const retrieveChild = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn(
					"node",
					[cliPath, "memory", "retrieve", "test-key"],
					{
						stdio: ["pipe", "pipe", "pipe"],
						env: { ...process.env, NODE_ENV: "test" },
						cwd: testDir,
					},
				);

				let stdout = "";
				retrieveChild.stdout.on("data", (data) => {
					stdout += data.toString();
				});

				retrieveChild.on("close", (code) => {
					expect(code).toBe(0);
					expect(stdout).toContain("test-value");
					done();
				});
			});
		}, 15000);

		test("should list memory entries", (done) => {
			// Store some memories first
			const store1 = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn(
				"node",
				[cliPath, "memory", "store", "key1", "value1"],
				{
					stdio: "ignore",
					env: { ...process.env, NODE_ENV: "test" },
					cwd: testDir,
				},
			);

			store1.on("close", () => {
				const store2 = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn(
					"node",
					[cliPath, "memory", "store", "key2", "value2"],
					{
						stdio: "ignore",
						env: { ...process.env, NODE_ENV: "test" },
						cwd: testDir,
					},
				);

				store2.on("close", () => {
					// List memories
					const listChild = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "memory", "list"], {
						stdio: ["pipe", "pipe", "pipe"],
						env: { ...process.env, NODE_ENV: "test" },
						cwd: testDir,
					});

					let stdout = "";
					listChild.stdout.on("data", (data) => {
						stdout += data.toString();
					});

					listChild.on("close", (code) => {
						expect(code).toBe(0);
						expect(stdout).toContain("key1");
						expect(stdout).toContain("key2");
						expect(stdout).toContain("Memory Entries (2)");
						done();
					});
				});
			});
		}, 20000);
	});

	describe("Agent Command", () => {
		beforeEach(async () => {
			// Initialize and start a swarm first
			await new Promise((resolve) => {
				const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "init", "--minimal"], {
					stdio: "ignore",
					env: { ...process.env, NODE_ENV: "test" },
					cwd: testDir,
				});
				child.on("close", resolve);
			});
		});

		test("should list available agent types", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "agent", "list"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
				cwd: testDir,
			});

			let stdout = "";
			child.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			child.on("close", (code) => {
				expect(code).toBe(0);
				expect(stdout).toContain("Available Agent Types");
				expect(stdout).toContain("researcher");
				expect(stdout).toContain("coder");
				expect(stdout).toContain("analyst");
				done();
			});
		}, 10000);
	});

	describe("Error Handling", () => {
		test("should handle commands without initialization", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "agent", "status"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
				cwd: testDir,
			});

			let stderr = "";
			child.stderr.on("data", (data) => {
				stderr += data.toString();
			});

			child.on("close", (code) => {
				expect(code).toBe(1);
				expect(stderr).toContain("Claude-Flow not initialized");
				done();
			});
		}, 10000);

		test("should handle insufficient arguments", (done) => {
			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "memory", "store"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
				cwd: testDir,
			});

			let stderr = "";
			child.stderr.on("data", (data) => {
				stderr += data.toString();
			});

			child.on("close", (code) => {
				expect(code).toBe(1);
				expect(stderr).toContain("Missing required");
				done();
			});
		}, 10000);
	});

	describe("Configuration", () => {
		test("should handle configuration files", async () => {
			// Create a test config file
			const configPath = path.join(testDir, "claude-flow.json");
			const config = {
				version: "2.0.0",
				features: {
					swarm: true,
					memory: true,
					github: false,
				},
			};

			await fs.writeJson(configPath, config);

			const child = await new Promise((resolve, reject) => {
    const child = await new Promise((resolve, reject) => {
    const child = spawn("node", [cliPath, "config", "show"], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, NODE_ENV: "test" },
				cwd: testDir,
			});

			let stdout = "";
			child.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			await new Promise((resolve) => {
				child.on("close", (code) => {
					expect(code).toBe(0);
					expect(stdout).toContain("Configuration");
					resolve();
				});
			});
		}, 10000);
	});
});
