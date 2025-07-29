import {
	assertEquals,
	assertExists,
	assertStringIncludes,
} from "@std/assert/mod.ts";
import { exists } from "@std/fs/mod.ts";
import { join } from "@std/path/mod.ts";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd.ts";

describe("Full Init Flow Integration Tests", () => {
	let testDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		originalCwd = Deno.cwd();
		testDir = await Deno.makeTempDir({ prefix: "claude_flow_full_init_test_" });
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

	describe("Complete initialization scenarios", () => {
		it("should initialize empty project successfully", async () => {
			// Run init command through CLI
			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			const result = await command.output();
			const output = new TextDecoder().decode(result.stdout);
			const error = new TextDecoder().decode(result.stderr);

			if (!result.success) {
				console.error("Command failed:", error);
			}

			// Check that key files were created
			expect(await exists(join(testDir, "CLAUDE.md").toBeDefined()));
			expect(await exists(join(testDir, "memory-bank.md").toBeDefined()));
			expect(await exists(join(testDir, "coordination.md").toBeDefined()));
			expect(
				await exists(
					join(testDir, "memory/claude-flow-data.json").toBeDefined(),
				),
			);

			// Check directory structure
			expect(await exists(join(testDir, "memory").toBeDefined()));
			expect(await exists(join(testDir, "memory/agents").toBeDefined()));
			expect(await exists(join(testDir, "memory/sessions").toBeDefined()));
			expect(await exists(join(testDir, "coordination").toBeDefined()));
			expect(await exists(join(testDir, ".claude").toBeDefined()));
			expect(await exists(join(testDir, ".claude/commands").toBeDefined()));
		});

		it("should handle project with existing files", async () => {
			// Create existing files
			await Deno.writeTextFile(join(testDir, "CLAUDE.md"), "existing content");
			await Deno.writeTextFile(
				join(testDir, "package.json"),
				'{"name": "test"}',
			);

			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			const result = await command.output();
			const output = new TextDecoder().decode(result.stdout);

			// Should warn about existing files
			assertStringIncludes(output, "already exist");
			assertStringIncludes(output, "Use --force to overwrite");

			// Should not overwrite without force
			const existingContent = await Deno.readTextFile(
				join(testDir, "CLAUDE.md"),
			);
			expect(existingContent).toBe("existing content");
		});

		it("should handle force overwrite correctly", async () => {
			// Create existing files
			await Deno.writeTextFile(join(testDir, "CLAUDE.md"), "old content");
			await Deno.writeTextFile(join(testDir, "memory-bank.md"), "old memory");

			const command = new Deno.Command("deno", {
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
			});

			const result = await command.output();
			expect(result.success).toBe(true);

			// Should overwrite files
			const claudeContent = await Deno.readTextFile(join(testDir, "CLAUDE.md"));
			expect(claudeContent.includes("old content")).toBe(false);
			assertStringIncludes(claudeContent, "Claude Code Configuration");

			const memoryContent = await Deno.readTextFile(
				join(testDir, "memory-bank.md"),
			);
			expect(memoryContent.includes("old memory")).toBe(false);
			assertStringIncludes(memoryContent, "Memory Bank");
		});
	});

	describe("SPARC initialization flow", () => {
		it("should initialize with SPARC structure", async () => {
			const command = new Deno.Command("deno", {
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
			});

			const result = await command.output();
			const output = new TextDecoder().decode(result.stdout);

			// Should create SPARC structure
			expect(await exists(join(testDir, ".roo").toBeDefined()));
			expect(await exists(join(testDir, ".roomodes").toBeDefined()));
			expect(
				await exists(join(testDir, ".claude/commands/sparc").toBeDefined()),
			);

			// Should have SPARC-enhanced CLAUDE.md
			const claudeContent = await Deno.readTextFile(join(testDir, "CLAUDE.md"));
			assertStringIncludes(claudeContent, "SPARC Development Environment");
			assertStringIncludes(claudeContent, "Test-Driven Development");
		});

		it("should handle SPARC with force flag", async () => {
			// Create existing SPARC files
			await Deno.mkdir(join(testDir, ".roo"), { recursive: true });
			await Deno.writeTextFile(join(testDir, ".roomodes"), '{"old": "config"}');

			const command = new Deno.Command("deno", {
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
			});

			const result = await command.output();
			expect(result.success).toBe(true);

			// Should preserve existing .roomodes (as per manual creation logic)
			const roomodesContent = await Deno.readTextFile(
				join(testDir, ".roomodes"),
			);
			assertStringIncludes(roomodesContent, "old");
		});
	});

	describe("Minimal initialization flow", () => {
		it("should create minimal structure", async () => {
			const command = new Deno.Command("deno", {
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
			});

			const result = await command.output();
			expect(result.success).toBe(true);

			// Should create basic files
			expect(await exists(join(testDir, "CLAUDE.md").toBeDefined()));
			expect(await exists(join(testDir, "memory-bank.md").toBeDefined()));
			expect(await exists(join(testDir, "coordination.md").toBeDefined()));

			// Content should be minimal
			const claudeContent = await Deno.readTextFile(join(testDir, "CLAUDE.md"));
			const memoryContent = await Deno.readTextFile(
				join(testDir, "memory-bank.md"),
			);

			assertStringIncludes(claudeContent, "Minimal project configuration");
			assertStringIncludes(memoryContent, "Simple memory tracking");
		});
	});

	describe("Complex flag combinations", () => {
		it("should handle --sparc --minimal --force", async () => {
			// Create conflicting files
			await Deno.writeTextFile(join(testDir, "CLAUDE.md"), "conflicting");
			await Deno.mkdir(join(testDir, ".roo"), { recursive: true });

			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
					"--sparc",
					"--minimal",
					"--force",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			const result = await command.output();
			expect(result.success).toBe(true);

			// Should create SPARC structure
			expect(await exists(join(testDir, ".roo").toBeDefined()));
			expect(await exists(join(testDir, ".roomodes").toBeDefined()));

			// Should overwrite CLAUDE.md with SPARC content
			const claudeContent = await Deno.readTextFile(join(testDir, "CLAUDE.md"));
			expect(claudeContent.includes("conflicting")).toBe(false);
			assertStringIncludes(claudeContent, "SPARC Development Environment");

			// Memory should be minimal
			const memoryContent = await Deno.readTextFile(
				join(testDir, "memory-bank.md"),
			);
			assertStringIncludes(memoryContent, "Simple memory tracking");
		});
	});

	describe("File integrity validation", () => {
		it("should create valid JSON files", async () => {
			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			await command.output();

			// Check JSON files are valid
			const dataPath = join(testDir, "memory/claude-flow-data.json");
			const dataContent = await Deno.readTextFile(dataPath);
			const data = JSON.parse(dataContent);

			expect(Array.isArray(data.agents)).toBe(true);
			expect(Array.isArray(data.tasks)).toBe(true);
			expect(typeof data.lastUpdated).toBe("number");
		});

		it("should create valid SPARC JSON files", async () => {
			const command = new Deno.Command("deno", {
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
			});

			await command.output();

			// Check SPARC JSON files
			if (await exists(join(testDir, ".roomodes"))) {
				const roomodesContent = await Deno.readTextFile(
					join(testDir, ".roomodes"),
				);
				JSON.parse(roomodesContent); // Should not throw
			}

			if (await exists(join(testDir, ".roo/workflows/basic-tdd.json"))) {
				const workflowContent = await Deno.readTextFile(
					join(testDir, ".roo/workflows/basic-tdd.json"),
				);
				JSON.parse(workflowContent); // Should not throw
			}
		});

		it("should create readable markdown files", async () => {
			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			await command.output();

			// Check markdown files have proper headers
			const mdFiles = [
				"CLAUDE.md",
				"memory-bank.md",
				"coordination.md",
				"memory/agents/README.md",
				"memory/sessions/README.md",
			];

			for (const file of mdFiles) {
				const content = await Deno.readTextFile(join(testDir, file));
				expect(content.startsWith("#")).toBe(true);
				expect(content.includes("\r")).toBe(false); // No Windows line endings
			}
		});
	});

	describe("Executable creation", () => {
		it("should create local executable wrapper", async () => {
			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			await command.output();

			// Check executable was created
			expect(await exists(join(testDir, "claude-flow").toBeDefined()));

			// Check it's executable (on Unix-like systems)
			try {
				const fileInfo = await Deno.stat(join(testDir, "claude-flow"));
				expect(fileInfo.isFile).toBe(true);
			} catch {
				// May not work on all systems
			}
		});

		it("should create working executable", async () => {
			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			await command.output();

			// Try to run the created executable
			const execCommand = new Deno.Command(join(testDir, "claude-flow"), {
				args: ["--help"],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			});

			const execResult = await execCommand.output();
			const execOutput = new TextDecoder().decode(execResult.stdout);

			// Should show help output
			assertStringIncludes(execOutput, "claude-flow");
		});
	});

	describe("Working directory handling", () => {
		it("should respect PWD environment variable", async () => {
			const subDir = join(testDir, "subproject");
			await Deno.mkdir(subDir, { recursive: true });

			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: subDir,
				env: { PWD: subDir },
				stdout: "piped",
				stderr: "piped",
			});

			await command.output();

			// Files should be created in subDir
			expect(await exists(join(subDir, "CLAUDE.md").toBeDefined()));
			expect(await exists(join(subDir, "memory-bank.md").toBeDefined()));
			expect(await exists(join(subDir, "coordination.md").toBeDefined()));
		});

		it("should handle directory changes correctly", async () => {
			// Create nested directory structure
			const nestedDir = join(testDir, "deep", "nested", "project");
			await Deno.mkdir(nestedDir, { recursive: true });

			const command = new Deno.Command("deno", {
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/cli.ts"),
					"init",
				],
				cwd: nestedDir,
				stdout: "piped",
				stderr: "piped",
			});

			await command.output();

			// Files should be in nested directory
			expect(await exists(join(nestedDir, "CLAUDE.md").toBeDefined()));
			expect(await exists(join(nestedDir, "memory").toBeDefined()));
			expect(await exists(join(nestedDir, "coordination").toBeDefined()));
		});
	});
});
