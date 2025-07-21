import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

import {
	assertEquals,
	assertExists,
	assertStringIncludes,
} from "@std/assert/mod.ts";
import { exists } from "@std/fs/mod.ts";
import { join } from "@std/path/mod.ts";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd.ts";

describe("Selective Mode Initialization Tests", () => {
	let testDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		originalCwd = process.cwd();
		testDir = await Deno.makeTempDir({ prefix: "claude_flow_selective_test_" });
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

	describe("Standard vs Minimal modes", () => {
		it("should create different content for standard vs minimal", async () => {
			// Create standard initialization
			const standardDir = join(testDir, "standard");
			await Deno.mkdir(standardDir);

			const standardCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
				],
				cwd: standardDir,
				stdout: "piped",
				stderr: "piped",
			);

			await standardCommand;

			// Create minimal initialization
			const minimalDir = join(testDir, "minimal");
			await Deno.mkdir(minimalDir);

			const minimalCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--minimal",
				],
				cwd: minimalDir,
				stdout: "piped",
				stderr: "piped",
			);

			await minimalCommand;

			// Compare content sizes
			const standardClaude = await fs.promises.readFile(join(standardDir, "CLAUDE.md", 'utf8'),
			);
			const minimalClaude = await fs.promises.readFile(join(minimalDir, "CLAUDE.md", 'utf8'),
			);

			expect(standardClaude.length > minimalClaude.length).toBe(true);
			assertStringIncludes(minimalClaude, "Minimal project configuration");

			const standardMemory = await fs.promises.readFile(join(standardDir, "memory-bank.md", 'utf8'),
			);
			const minimalMemory = await fs.promises.readFile(join(minimalDir, "memory-bank.md", 'utf8'),
			);

			expect(standardMemory.length > minimalMemory.length).toBe(true);
			assertStringIncludes(minimalMemory, "Simple memory tracking");
		});

		it("should create same directory structure for both modes", async () => {
			// Create both modes
			const dirs = ["standard", "minimal"];

			for (const mode of dirs) {
				const modeDir = join(testDir, mode);
				await Deno.mkdir(modeDir);

				const args = [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
				];
				if (mode === "minimal") args.push("--minimal");

				const command = await new Promise((resolve, reject) => {
    const child = spawn('deno',
					args,
					cwd: modeDir,
					stdout: "piped",
					stderr: "piped",
				);

				await command;
			}

			// Check both have same directory structure
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

			for (const mode of dirs) {
				for (const dir of expectedDirs) {
					expect(await exists(join(testDir, mode, dir).toBeDefined()));
				}
			}
		});
	});

	describe("SPARC vs Non-SPARC modes", () => {
		it("should create SPARC-specific files only with --sparc", async () => {
			// Create regular initialization
			const regularDir = join(testDir, "regular");
			await Deno.mkdir(regularDir);

			const regularCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
				],
				cwd: regularDir,
				stdout: "piped",
				stderr: "piped",
			);

			await regularCommand;

			// Create SPARC initialization
			const sparcDir = join(testDir, "sparc");
			await Deno.mkdir(sparcDir);

			const sparcCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--sparc",
				],
				cwd: sparcDir,
				stdout: "piped",
				stderr: "piped",
			);

			await sparcCommand;

			// Check SPARC-specific files
			expect(await exists(join(regularDir).toBe(".roo")), false);
			expect(await exists(join(regularDir).toBe(".roomodes")), false);
			expect(
				await exists(join(regularDir).toBe(".claude/commands/sparc")),
				false,
			);

			expect(await exists(join(sparcDir, ".roo").toBeDefined()));
			expect(await exists(join(sparcDir, ".roomodes").toBeDefined()));
			expect(
				await exists(join(sparcDir, ".claude/commands/sparc").toBeDefined()),
			);

			// Check CLAUDE.md content differences
			const regularClaude = await fs.promises.readFile(join(regularDir, "CLAUDE.md", 'utf8'),
			);
			const sparcClaude = await fs.promises.readFile(join(sparcDir, "CLAUDE.md", 'utf8'));

			expect(regularClaude.includes("SPARC Development Environment")).toBe(
				false,
			);
			assertStringIncludes(sparcClaude, "SPARC Development Environment");
			assertStringIncludes(sparcClaude, "## SPARC Development Commands");
		});

		it("should create appropriate SPARC command structure", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--sparc",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await command;

			// Check SPARC directory structure
			const sparcDirs = [
				".roo",
				".roo/templates",
				".roo/workflows",
				".roo/modes",
				".roo/configs",
			];

			for (const dir of sparcDirs) {
				expect(await exists(join(testDir, dir).toBeDefined()));
			}

			// Check Claude commands
			expect(
				await exists(join(testDir, ".claude/commands/sparc").toBeDefined()),
			);

			// Check workflow files
			expect(
				await exists(
					join(testDir, ".roo/workflows/basic-tdd.json").toBeDefined(),
				),
			);
			expect(await exists(join(testDir, ".roo/README.md").toBeDefined()));
		});
	});

	describe("Mixed mode combinations", () => {
		it("should handle --sparc --minimal combination correctly", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--sparc",
					"--minimal",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await command;

			// Should have SPARC structure
			expect(await exists(join(testDir, ".roo").toBeDefined()));
			expect(await exists(join(testDir, ".roomodes").toBeDefined()));
			expect(
				await exists(join(testDir, ".claude/commands/sparc").toBeDefined()),
			);

			// Should have SPARC-enhanced CLAUDE.md (SPARC overrides minimal for CLAUDE.md)
			const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			assertStringIncludes(claudeContent, "SPARC Development Environment");

			// But memory-bank should be minimal
			const memoryContent = await fs.promises.readFile(join(testDir, "memory-bank.md", 'utf8'),
			);
			assertStringIncludes(memoryContent, "Simple memory tracking");

			// Coordination should be minimal
			const coordContent = await fs.promises.readFile(join(testDir, "coordination.md", 'utf8'),
			);
			assertStringIncludes(coordContent, "Simple coordination tracking");
		});

		it("should prioritize SPARC content over minimal for CLAUDE.md", async () => {
			// Create minimal first
			const minimalCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--minimal",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await minimalCommand;

			const minimalClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));

			// Now initialize with SPARC minimal (force overwrite)
			const sparcMinimalCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--sparc",
					"--minimal",
					"--force",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await sparcMinimalCommand;

			const sparcMinimalClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'),
			);

			// SPARC version should be different from minimal-only
			expect(minimalClaude === sparcMinimalClaude).toBe(false);
			assertStringIncludes(sparcMinimalClaude, "SPARC Development Environment");
			expect(minimalClaude.includes("SPARC Development Environment")).toBe(
				false,
			);
		});
	});

	describe("Progressive initialization", () => {
		it("should support upgrading from minimal to full", async () => {
			// Start with minimal
			const minimalCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--minimal",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await minimalCommand;

			const minimalClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			const minimalMemory = await fs.promises.readFile(join(testDir, "memory-bank.md", 'utf8'),
			);

			// Upgrade to full with force
			const fullCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--force",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await fullCommand;

			const fullClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			const fullMemory = await fs.promises.readFile(join(testDir, "memory-bank.md", 'utf8'),
			);

			// Should be different and longer
			expect(minimalClaude === fullClaude).toBe(false);
			expect(minimalMemory === fullMemory).toBe(false);
			expect(fullClaude.length > minimalClaude.length).toBe(true);
			expect(fullMemory.length > minimalMemory.length).toBe(true);
		});

		it("should support adding SPARC to existing project", async () => {
			// Start with regular init
			const regularCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await regularCommand;

			// Verify no SPARC files
			expect(await exists(join(testDir).toBe(".roo")), false);
			expect(await exists(join(testDir).toBe(".roomodes")), false);

			// Add SPARC with force
			const sparcCommand = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--sparc",
					"--force",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await sparcCommand;

			// Should now have SPARC files
			expect(await exists(join(testDir, ".roo").toBeDefined()));
			expect(await exists(join(testDir, ".roomodes").toBeDefined()));
			expect(
				await exists(join(testDir, ".claude/commands/sparc").toBeDefined()),
			);

			// CLAUDE.md should be SPARC-enhanced
			const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			assertStringIncludes(claudeContent, "SPARC Development Environment");
		});
	});

	describe("Mode-specific file validation", () => {
		it("should validate minimal mode file sizes", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--minimal",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await command;

			// Check that minimal files are actually smaller
			const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));
			const memoryContent = await fs.promises.readFile(join(testDir, "memory-bank.md", 'utf8'),
			);
			const coordContent = await fs.promises.readFile(join(testDir, "coordination.md", 'utf8'),
			);

			// Minimal files should be under reasonable size limits
			expect(claudeContent.length < 5000).toBe(true); // Should be much smaller than full
			expect(memoryContent.length < 2000).toBe(true);
			expect(coordContent.length < 2000).toBe(true);

			// But should still have basic structure
			assertStringIncludes(claudeContent, "# Claude Code Configuration");
			assertStringIncludes(memoryContent, "# Memory Bank");
			assertStringIncludes(coordContent, "# Multi-Agent Coordination");
		});

		it("should validate SPARC mode file completeness", async () => {
			const command = await new Promise((resolve, reject) => {
    const child = spawn('deno',
				args: [
					"run",
					"--allow-all",
					join(originalCwd, "src/cli/simple-cli.ts"),
					"init",
					"--sparc",
				],
				cwd: testDir,
				stdout: "piped",
				stderr: "piped",
			);

			await command;

			// Check SPARC file contents
			const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md", 'utf8'));

			// Should include all SPARC sections
			const requiredSections = [
				"## SPARC Development Commands",
				"## SPARC Methodology Workflow",
				"### 1. Specification Phase",
				"### 2. Pseudocode Phase",
				"### 3. Architecture Phase",
				"### 4. Refinement Phase",
				"### 5. Completion Phase",
				"## SPARC Mode Reference",
				"## SPARC Memory Integration",
			];

			for (const section of requiredSections) {
				assertStringIncludes(claudeContent, section);
			}

			// Check .roomodes content
			if (await exists(join(testDir, ".roomodes"))) {
				const roomodesContent = await fs.promises.readFile(join(testDir, ".roomodes", 'utf8'),
				);
				const roomodesData = JSON.parse(roomodesContent);

				expect(typeof roomodesData.modes).toBe("object");
				expect(roomodesData.modes.architect).toBeDefined();
				expect(roomodesData.modes.tdd).toBeDefined();
				expect(roomodesData.modes.code).toBeDefined();
			}
		});
	});
});
