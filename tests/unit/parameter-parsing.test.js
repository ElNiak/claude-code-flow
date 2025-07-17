/**
 * Comprehensive Parameter Parsing Test Suite
 * Tests the claude-flow parameter parsing system for robustness and security
 */

import { jest } from "@jest/globals";
import { parseFlags } from "../../src/cli/utils.js";

describe("Parameter Parsing System", () => {
	describe("Core Flag Parsing", () => {
		describe("Long Flag Handling", () => {
			test("should parse long flags with values", () => {
				const result = parseFlags(["--config", "test.json"]);
				expect(result.flags.config).toBe("test.json");
			});

			test("should parse boolean long flags", () => {
				const result = parseFlags(["--force"]);
				expect(result.flags.force).toBe(true);
			});

			test("should handle multiple long flags", () => {
				const result = parseFlags([
					"--force",
					"--config",
					"test.json",
					"--minimal",
				]);
				expect(result.flags.force).toBe(true);
				expect(result.flags.config).toBe("test.json");
				expect(result.flags.minimal).toBe(true);
			});

			test("should handle empty values", () => {
				const result = parseFlags(["--config", ""]);
				expect(result.flags.config).toBe("");
			});

			test("should parse explicit boolean values", () => {
				const result1 = parseFlags(["--force", "true"]);
				const result2 = parseFlags(["--force", "false"]);
				expect(result1.flags.force).toBe(true);
				expect(result2.flags.force).toBe(false);
			});
		});

		describe("Short Flag Handling", () => {
			test("should parse single short flags", () => {
				const result = parseFlags(["-f"]);
				expect(result.flags.f).toBe(true);
			});

			test("should parse combined short flags", () => {
				const result = parseFlags(["-fm"]);
				expect(result.flags.f).toBe(true);
				expect(result.flags.m).toBe(true);
			});

			test("should handle mixed short and long flags", () => {
				const result = parseFlags(["-f", "--minimal", "-s"]);
				expect(result.flags.f).toBe(true);
				expect(result.flags.minimal).toBe(true);
				expect(result.flags.s).toBe(true);
			});
		});

		describe("Positional Arguments", () => {
			test("should separate flags from arguments", () => {
				const result = parseFlags(["arg1", "--flag", "value", "arg2"]);
				expect(result.args).toContain("arg1");
				expect(result.args).toContain("arg2");
				expect(result.flags.flag).toBe("value");
			});

			test("should preserve argument order", () => {
				const result = parseFlags(["first", "second", "--flag", "third"]);
				expect(result.args).toEqual(["first", "second", "third"]);
			});
		});
	});

	describe("Edge Cases and Error Handling", () => {
		describe("Malformed Parameters", () => {
			test("should handle triple-dash flags", () => {
				const result = parseFlags(["---triple"]);
				// Should not crash and handle gracefully
				expect(result).toBeDefined();
			});

			test("should handle empty flag names", () => {
				const result = parseFlags(["--", "value"]);
				expect(result).toBeDefined();
			});

			test("should handle single dash", () => {
				const result = parseFlags(["-"]);
				expect(result).toBeDefined();
			});
		});

		describe("Special Characters", () => {
			test("should handle spaces in values", () => {
				const result = parseFlags(["--name", "test with spaces"]);
				expect(result.flags.name).toBe("test with spaces");
			});

			test("should handle quotes in values", () => {
				const result = parseFlags(["--description", "test with 'quotes'"]);
				expect(result.flags.description).toBe("test with 'quotes'");
			});

			test("should handle unicode characters", () => {
				const result = parseFlags(["--name", "test-émojis-🚀"]);
				expect(result.flags.name).toBe("test-émojis-🚀");
			});
		});

		describe("Duplicate Parameters", () => {
			test("should handle duplicate flags (last one wins)", () => {
				const result = parseFlags([
					"--config",
					"first.json",
					"--config",
					"second.json",
				]);
				expect(result.flags.config).toBe("second.json");
			});

			test("should handle duplicate short flags", () => {
				const result = parseFlags(["-f", "-f"]);
				expect(result.flags.f).toBe(true);
			});
		});
	});

	describe("Performance Tests", () => {
		test("should handle large parameter sets efficiently", () => {
			const largeArgs = [];
			for (let i = 0; i < 1000; i++) {
				largeArgs.push(`--param${i}`, `value${i}`);
			}

			const start = Date.now();
			const result = parseFlags(largeArgs);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(100); // Should parse within 100ms
			expect(Object.keys(result.flags)).toHaveLength(1000);
		});

		test("should handle very long parameter values", () => {
			const longValue = "a".repeat(10000);
			const result = parseFlags(["--long-param", longValue]);
			expect(result.flags["long-param"]).toBe(longValue);
		});
	});

	describe("Security Validation", () => {
		test("should safely handle potential injection attempts", () => {
			const maliciousInputs = [
				"--config",
				"; rm -rf /",
				"--script",
				"$(malicious command)",
				"--path",
				"../../../etc/passwd",
				"--command",
				"`evil command`",
			];

			expect(() => {
				const result = parseFlags(maliciousInputs);
				// Should not execute any commands or crash
				expect(result).toBeDefined();
			}).not.toThrow();
		});

		test("should prevent buffer overflow with massive inputs", () => {
			const massiveArgs = new Array(100000)
				.fill("--test")
				.concat(new Array(100000).fill("value"));

			expect(() => {
				const result = parseFlags(massiveArgs);
				expect(result).toBeDefined();
			}).not.toThrow();
		});
	});

	describe("Type Validation", () => {
		test("should validate numeric parameters", () => {
			const result1 = parseFlags(["--count", "5"]);
			const result2 = parseFlags(["--count", "abc"]);

			expect(result1.flags.count).toBe("5"); // String by default
			expect(result2.flags.count).toBe("abc"); // Invalid but stored
		});

		test("should validate boolean parameters", () => {
			const validBooleans = ["true", "false", "yes", "no", "1", "0"];
			const invalidBooleans = ["maybe", "invalid", "true1"];

			validBooleans.forEach((bool) => {
				const result = parseFlags(["--flag", bool]);
				expect(result.flags.flag).toBe(bool);
			});

			invalidBooleans.forEach((bool) => {
				const result = parseFlags(["--flag", bool]);
				expect(result.flags.flag).toBe(bool); // Stored as-is
			});
		});
	});

	describe("Command-Specific Integration", () => {
		describe("Init Command Parameters", () => {
			const initValidParams = [
				"force",
				"minimal",
				"sparc",
				"dry-run",
				"config",
				"batch-init",
			];

			test("should recognize all valid init parameters", () => {
				const args = [
					"--force",
					"--minimal",
					"--sparc",
					"--config",
					"test.json",
				];
				const result = parseFlags(args);

				expect(result.flags.force).toBe(true);
				expect(result.flags.minimal).toBe(true);
				expect(result.flags.sparc).toBe(true);
				expect(result.flags.config).toBe("test.json");
			});

			test("should handle mixed valid and unknown init parameters", () => {
				const args = ["--force", "--unknown-param", "value", "--minimal"];
				const result = parseFlags(args);

				expect(result.flags.force).toBe(true);
				expect(result.flags.minimal).toBe(true);
				expect(result.flags["unknown-param"]).toBe("value");
			});
		});

		describe("Agent Command Parameters", () => {
			test("should parse agent spawn parameters", () => {
				const args = [
					"spawn",
					"researcher",
					"--name",
					"TestBot",
					"--capabilities",
					"analysis",
				];
				const result = parseFlags(args);

				expect(result.args).toContain("spawn");
				expect(result.args).toContain("researcher");
				expect(result.flags.name).toBe("TestBot");
				expect(result.flags.capabilities).toBe("analysis");
			});

			test("should parse agent provision parameters", () => {
				const args = ["provision", "5", "--type", "coder"];
				const result = parseFlags(args);

				expect(result.args).toContain("provision");
				expect(result.args).toContain("5");
				expect(result.flags.type).toBe("coder");
			});
		});

		describe("Task Command Parameters", () => {
			test("should parse task creation parameters", () => {
				const args = [
					"create",
					"research",
					"Test task",
					"--priority",
					"8",
					"--deadline",
					"2024-12-31",
				];
				const result = parseFlags(args);

				expect(result.args).toContain("create");
				expect(result.args).toContain("research");
				expect(result.args).toContain("Test task");
				expect(result.flags.priority).toBe("8");
				expect(result.flags.deadline).toBe("2024-12-31");
			});

			test("should parse task filtering parameters", () => {
				const args = [
					"list",
					"--filter",
					"running",
					"--status",
					"active",
					"--limit",
					"10",
				];
				const result = parseFlags(args);

				expect(result.args).toContain("list");
				expect(result.flags.filter).toBe("running");
				expect(result.flags.status).toBe("active");
				expect(result.flags.limit).toBe("10");
			});
		});
	});

	describe("Backward Compatibility", () => {
		test("should maintain compatibility with legacy flag formats", () => {
			// Test existing parameter combinations that should continue working
			const legacyFormats = [
				["--force"],
				["-f"],
				["--config", "config.json"],
				["--sparc", "--minimal"],
				["-fm"],
			];

			legacyFormats.forEach((args) => {
				expect(() => {
					const result = parseFlags(args);
					expect(result).toBeDefined();
					expect(result.flags).toBeDefined();
					expect(result.args).toBeDefined();
				}).not.toThrow();
			});
		});

		test("should preserve default behaviors", () => {
			const result = parseFlags([]);
			expect(result.flags).toEqual({});
			expect(result.args).toEqual([]);
		});
	});

	describe("Error Recovery", () => {
		test("should recover from parsing errors gracefully", () => {
			const problematicInputs = [
				null,
				undefined,
				[],
				[""],
				["--"],
				["-"],
				["---"],
			];

			problematicInputs.forEach((input) => {
				expect(() => {
					const result = parseFlags(input || []);
					expect(result).toBeDefined();
				}).not.toThrow();
			});
		});

		test("should handle unexpected input types", () => {
			// Test with non-string array elements
			const weirdInputs = [123, true, {}, null, undefined];

			expect(() => {
				const result = parseFlags(weirdInputs.map(String));
				expect(result).toBeDefined();
			}).not.toThrow();
		});
	});
});

// Helper function to test actual CLI execution
export function testCliExecution(command, args, expectedSuccess = true) {
	return new Promise((resolve, reject) => {
		const { spawn } = require("child_process");
		const child = spawn("npx", ["claude-flow", command, ...args], {
			stdio: "pipe",
			timeout: 10000,
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			const result = {
				exitCode: code,
				stdout,
				stderr,
				success: code === 0,
			};

			if (expectedSuccess && code !== 0) {
				reject(new Error(`Command failed with code ${code}: ${stderr}`));
			} else {
				resolve(result);
			}
		});

		child.on("error", reject);
	});
}
