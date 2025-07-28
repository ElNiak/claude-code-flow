import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
	assertEquals,
	assertExists,
	assertStringIncludes,
} from "@std/assert/mod.ts";
import { exists } from "@std/fs/mod.ts";
import { join } from "@std/path/mod.ts";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd.ts";
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

describe("End-to-End Init Workflow Tests", () => {
	let testDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		originalCwd = process.cwd();
		testDir = await Deno.makeTempDir({ prefix: "claude_flow_e2e_test_" });
		Deno.env.set("PWD", testDir);
		Deno.chdir(testDir);
	});

	afterEach(async () => {
		Deno.chdir(originalCwd);
		try {
			await Deno.remove(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Complete project initialization workflow", () => {
		it("should initialize a new project from scratch", async () => {
			// Step 1: Initialize basic project
			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const initResult = await initCommand;
			expect(initResult.success).toBe(true);

			const initOutput = new TextDecoder().decode(initResult.stdout);
			assertStringIncludes(initOutput, "initialized successfully");
			assertStringIncludes(initOutput, "Next steps");

			// Verify all files and directories are created
			const expectedFiles = [
				"CLAUDE.md",
				"memory-bank.md",
				"coordination.md",
				"memory/claude-flow-data.json",
				"memory/agents/README.md",
				"memory/sessions/README.md",
				"claude-flow",
			];

			for (const file of expectedFiles) {
				expect(await exists(join(testDir, file).toBeDefined()));
			}

			const expectedDirs = [
				"memory",
				"memory/agents",
				"memory/sessions",
				"coordination",
				"coordination/memory_bank",
				"coordination/subtasks",
				"coordination/orchestration",
				".claude",
				".claude/commands",
				".claude/logs",
			];

			for (const dir of expectedDirs) {
				expect(await exists(join(testDir, dir).toBeDefined()));
			}

			// Step 2: Test that local executable works
			const helpCommand = new Deno.Command(join(testDir, "claude-flow"), {
				args: ["--help"],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			const helpResult = await helpCommand;
			expect(helpResult.success).toBe(true);

			const helpOutput = new TextDecoder().decode(helpResult.stdout);
			assertStringIncludes(helpOutput, "claude-flow");

			// Step 3: Verify memory system is functional
			const memoryTestCommand = new Deno.Command(join(testDir, "claude-flow"), {
				args: ["memory", "store", "test_key", "test_value"],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			const memoryResult = await memoryTestCommand;
			// Memory command should work (success or fail gracefully)
			console.log("Memory test result:", memoryResult.success);
		});

		it("should initialize SPARC-enabled project workflow", async () => {
			// Step 1: Initialize with SPARC
			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
					"--sparc",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const initResult = await initCommand;
			expect(initResult.success).toBe(true);

			const initOutput = new TextDecoder().decode(initResult.stdout);
			assertStringIncludes(initOutput, "SPARC development environment");

			// Verify SPARC structure
			expect(await exists(join(testDir, ".roo").toBeDefined()));
			expect(await exists(join(testDir, ".roomodes").toBeDefined()));
			expect(
				await exists(join(testDir, ".claude/commands/sparc").toBeDefined()),
			);

			// Step 2: Test SPARC commands
			const sparcModesCommand = new Deno.Command(join(testDir, "claude-flow"), {
				args: ["sparc", "modes"],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			const sparcResult = await sparcModesCommand;
			// SPARC command should work or fail gracefully
			console.log("SPARC modes result:", sparcResult.success);

			// Step 3: Verify CLAUDE.md has SPARC content
			const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			assertStringIncludes(claudeContent, "SPARC Development Environment");
			assertStringIncludes(claudeContent, "## SPARC Development Commands");
			assertStringIncludes(claudeContent, "Test-Driven Development");

			// Step 4: Verify slash commands directory
			expect(
				await exists(join(testDir, ".claude/commands/sparc").toBeDefined()),
			);
		});

		it("should handle project upgrade workflow", async () => {
			// Step 1: Start with minimal project
			const minimalCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
					"--minimal",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await minimalCommand;

			const minimalClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			assertStringIncludes(minimalClaude, "Minimal project configuration");

			// Step 2: Upgrade to full project
			const fullCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
					"--force",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const fullResult = await fullCommand;
			expect(fullResult.success).toBe(true);

			const fullClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			expect(fullClaude.length > minimalClaude.length).toBe(true);
			assertStringIncludes(fullClaude, "## Project Overview");

			// Step 3: Upgrade to SPARC project
			const sparcCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
					"--sparc",
					"--force",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const sparcResult = await sparcCommand;
			expect(sparcResult.success).toBe(true);

			const sparcClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			assertStringIncludes(sparcClaude, "SPARC Development Environment");
			expect(await exists(join(testDir, ".roo").toBeDefined()));
		});
	});

	describe("Real-world project scenarios", () => {
		it("should initialize in existing Node.js project", async () => {
			// Create existing Node.js project structure
			await fs.promises.writeFile(join(testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-project",
						version: "1.0.0",
						main: "index.js",
					},
					null,
					2,
				),
			);

			await fs.promises.writeFile(join(testDir, "index.js"),
				"console.log('Hello World');",
			);

			await Deno.mkdir(join(testDir, "src"));
			await fs.promises.writeFile(join(testDir, "src/app.js"), "// App code");

			await Deno.mkdir(join(testDir, "tests"));
			await fs.promises.writeFile(join(testDir, "tests/app.test.js"), "// Tests");

			// Initialize Claude Flow
			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const result = await initCommand;
			expect(result.success).toBe(true);

			// Should not interfere with existing project files
			expect(await exists(join(testDir, "package.json").toBeDefined()));
			expect(await exists(join(testDir, "index.js").toBeDefined()));
			expect(await exists(join(testDir, "src/app.js").toBeDefined()));
			expect(await exists(join(testDir, "tests/app.test.js").toBeDefined()));

			// Should add Claude Flow files
			expect(await exists(join(testDir, "CLAUDE.md").toBeDefined()));
			expect(await exists(join(testDir, "memory-bank.md").toBeDefined()));
			expect(await exists(join(testDir, "coordination.md").toBeDefined()));
			expect(await exists(join(testDir, "claude-flow").toBeDefined()));

			// Verify package.json is unchanged
			const packageJson = JSON.parse(
				await fs.promises.readFile(join(testDir, "package.json", 'utf8')),
			);
			expect(packageJson.name).toBe("test-project");
			expect(packageJson.version).toBe("1.0.0");
		});

		it("should initialize in Git repository", async () => {
			// Initialize git repository
			const gitInitCommand = await new Promise((resolve, reject) => {
    const child = spawn('git',
				args: ["init"],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await gitInitCommand;

			// Create some files and commit
			await fs.promises.writeFile(join(testDir, "README.md"), "# Test Project");
			await fs.promises.writeFile(join(testDir, ".gitignore"),
				"node_modules/\n*.log",
			);

			const gitAddCommand = await new Promise((resolve, reject) => {
    const child = spawn('git',
				args: ["add", "."],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await gitAddCommand;

			const gitCommitCommand = await new Promise((resolve, reject) => {
    const child = spawn('git',
				args: ["commit", "-m", "Initial commit"],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await gitCommitCommand;

			// Initialize Claude Flow
			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const result = await initCommand;
			expect(result.success).toBe(true);

			// Should preserve git repository
			expect(await exists(join(testDir, ".git").toBeDefined()));
			expect(await exists(join(testDir, "README.md").toBeDefined()));
			expect(await exists(join(testDir, ".gitignore").toBeDefined()));

			// Should add Claude Flow files
			expect(await exists(join(testDir, "CLAUDE.md").toBeDefined()));
			expect(await exists(join(testDir, "memory-bank.md").toBeDefined()));

			// Check git status
			const gitStatusCommand = await new Promise((resolve, reject) => {
    const child = spawn('git',
				args: ["status", "--porcelain"],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const statusResult = await gitStatusCommand;
			const statusOutput = new TextDecoder().decode(statusResult.stdout);

			// New files should be untracked
			assertStringIncludes(statusOutput, "CLAUDE.md");
			assertStringIncludes(statusOutput, "memory-bank.md");
		});

		it("should handle large project with many subdirectories", async () => {
			// Create complex project structure
			const projectStructure = [
				"src/components",
				"src/utils",
				"src/services",
				"tests/unit",
				"tests/integration",
				"tests/e2e",
				"docs/api",
				"docs/guides",
				"config/dev",
				"config/prod",
				"scripts/build",
				"scripts/deploy",
			];

			for (const dir of projectStructure) {
				await Deno.mkdir(join(testDir, dir), { recursive: true });
				await fs.promises.writeFile(join(testDir, dir, "index.js"),
					`// ${dir} code`,
				);
			}

			// Add many files
			for (let i = 0; i < 50; i++) {
				await fs.promises.writeFile(join(testDir, `file_${i}.txt`),
					`Content ${i}`,
				);
			}

			const startTime = performance.now();

			// Initialize Claude Flow
			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const result = await initCommand;
			const endTime = performance.now();

			expect(result.success).toBe(true);

			// Should not take too long even with many files
			expect(endTime - startTime < 30000).toBe(true);

			// Should preserve all existing structure
			for (const dir of projectStructure) {
				expect(await exists(join(testDir, dir).toBeDefined()));
				expect(await exists(join(testDir, dir, "index.js").toBeDefined()));
			}

			// Should add Claude Flow files
			expect(await exists(join(testDir, "CLAUDE.md").toBeDefined()));
			expect(await exists(join(testDir, "memory-bank.md").toBeDefined()));
			expect(await exists(join(testDir, "coordination.md").toBeDefined()));

			console.log(
				`Large project init completed in ${(endTime - startTime).toFixed(2)}ms`,
			);
		});
	});

	describe("User experience workflow", () => {
		it("should provide helpful output and guidance", async () => {
			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const result = await initCommand;
			const output = new TextDecoder().decode(result.stdout);

			// Should provide clear feedback
			assertStringIncludes(
				output,
				"Initializing Claude Code integration files",
			);
			assertStringIncludes(output, "✓ Created");
			assertStringIncludes(output, "initialized successfully");

			// Should provide next steps
			assertStringIncludes(output, "Next steps:");
			assertStringIncludes(output, "./claude-flow start");
			assertStringIncludes(output, "Review and customize");

			// Should mention local executable
			assertStringIncludes(output, "Local executable created");
			assertStringIncludes(
				output,
				"Use './claude-flow' instead of 'npx claude-flow'",
			);
		});

		it("should provide SPARC-specific guidance", async () => {
			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
					"--sparc",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const result = await initCommand;
			const output = new TextDecoder().decode(result.stdout);

			// Should mention SPARC initialization
			assertStringIncludes(output, "SPARC development environment");
			assertStringIncludes(output, "SPARC environment initialized");

			// Should provide SPARC guidance
			assertStringIncludes(output, "Claude Code slash commands");
			assertStringIncludes(output, "/sparc");
			assertStringIncludes(output, "sparc modes");
			assertStringIncludes(output, "sparc tdd");
		});

		it("should handle help request appropriately", async () => {
			const helpCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
					"--help",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const result = await helpCommand;
			const output = new TextDecoder().decode(result.stdout);

			// Should show help without initializing
			assertStringIncludes(output, "Initialize Claude Code integration");
			assertStringIncludes(output, "--force");
			assertStringIncludes(output, "--minimal");
			assertStringIncludes(output, "--sparc");

			// Should not create any files
			expect(await exists(join(testDir).toBe("CLAUDE.md")), false);
			expect(await exists(join(testDir).toBe("memory-bank.md")), false);
		});

		it("should handle error scenarios gracefully", async () => {
			// Create a scenario that will cause an error
			await fs.promises.writeFile(join(testDir, "memory"), "blocking file");

			const initCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			const result = await initCommand;
			const output = new TextDecoder().decode(result.stdout);
			const error = new TextDecoder().decode(result.stderr);

			// Should provide clear error message
			console.log("Error output:", error);
			console.log("Standard output:", output);

			// Should not leave the system in a bad state
			expect(await exists(join(testDir).toBe("memory")), true); // Original file should remain
		});
	});
});
