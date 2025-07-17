/**
 * End-to-end workflow tests
 */

import { delay } from "../../src/utils/helpers.ts";
import { afterEach, beforeEach, describe, expect, it } from "../test.utils.ts";

Deno.test("E2E - CLI should show help", async () => {
	const command = new Deno.Command(Deno.execPath(), {
		args: ["run", "--allow-all", "src/cli/index.ts", "--help"],
		stdout: "piped",
		stderr: "piped",
	});

	const { code, stdout } = await command.output();
	const output = new TextDecoder().decode(stdout);

	expect(code).toBe(0);
	expect(
		output.includes("Claude-Flow: Advanced AI agent orchestration system"),
	).toBe(true);
	expect(output.includes("COMMANDS")).toBe(true);
});

Deno.test("E2E - Config init should create file", async () => {
	const testFile = "./test-config.json";

	try {
		// Remove test file if it exists
		try {
			await Deno.remove(testFile);
		} catch {
			// File doesn't exist, which is fine
		}

		const command = new Deno.Command(Deno.execPath(), {
			args: [
				"run",
				"--allow-all",
				"src/cli/index.ts",
				"config",
				"init",
				testFile,
			],
			stdout: "piped",
			stderr: "piped",
		});

		const { code, stdout } = await command.output();
		const output = new TextDecoder().decode(stdout);

		expect(code).toBe(0);
		expect(output.includes("Configuration file created")).toBe(true);

		// Verify file was created
		const stat = await Deno.stat(testFile);
		expect(stat.isFile).toBe(true);

		// Verify content is valid JSON
		const content = await Deno.readTextFile(testFile);
		const config = JSON.parse(content);
		expect(typeof config.orchestrator).toBe("object");
		expect(typeof config.terminal).toBe("object");
		expect(typeof config.memory).toBe("object");
	} finally {
		// Cleanup
		try {
			await Deno.remove(testFile);
		} catch {
			// Ignore cleanup errors
		}
	}
});

Deno.test("E2E - Agent spawn command should create profile", async () => {
	const command = new Deno.Command(Deno.execPath(), {
		args: [
			"run",
			"--allow-all",
			"src/cli/index.ts",
			"agent",
			"spawn",
			"researcher",
			"--name",
			"test-researcher",
			"--priority",
			"5",
		],
		stdout: "piped",
		stderr: "piped",
	});

	const { code, stdout } = await command.output();
	const output = new TextDecoder().decode(stdout);

	expect(code).toBe(0);
	expect(output.includes("Agent profile created")).toBe(true);
	expect(output.includes('"name": "test-researcher"')).toBe(true);
	expect(output.includes('"type": "researcher"')).toBe(true);
	expect(output.includes('"priority": 5')).toBe(true);
});

Deno.test("E2E - Task create command should create task", async () => {
	const command = new Deno.Command(Deno.execPath(), {
		args: [
			"run",
			"--allow-all",
			"src/cli/index.ts",
			"task",
			"create",
			"analysis",
			"Analyze the test results",
			"--priority",
			"10",
		],
		stdout: "piped",
		stderr: "piped",
	});

	const { code, stdout } = await command.output();
	const output = new TextDecoder().decode(stdout);

	expect(code).toBe(0);
	expect(output.includes("Task created")).toBe(true);
	expect(output.includes('"type": "analysis"')).toBe(true);
	expect(output.includes('"description": "Analyze the test results"')).toBe(
		true,
	);
	expect(output.includes('"priority": 10')).toBe(true);
});
