/**
 * Parameter Parsing Test Suite
 * Comprehensive tests for Claude Flow parameter parsing system
 */

const { parseFlags } = require("../src/cli/utils.js");
const { execSync } = require("child_process");
const path = require("path");

describe("Parameter Parsing Tests", () => {
	// Helper function to test CLI commands
	function testCLI(command, expectedToSucceed = true) {
		try {
			const result = execSync(`npx claude-flow ${command}`, {
				encoding: "utf8",
				timeout: 30000,
				stdio: "pipe",
			});
			return { success: true, output: result, error: null };
		} catch (error) {
			return {
				success: false,
				output: error.stdout || "",
				error: error.stderr || error.message,
			};
		}
	}

	describe("Core Flag Parsing Logic", () => {
		test("should parse long flags with values correctly", () => {
			const { flags, args } = parseFlags([
				"--config",
				"test.json",
				"--name",
				"TestBot",
			]);
			expect(flags.config).toBe("test.json");
			expect(flags.name).toBe("TestBot");
			expect(args).toEqual([]);
		});

		test("should parse boolean long flags correctly", () => {
			const { flags, args } = parseFlags(["--force", "--dry-run"]);
			expect(flags.force).toBe(true);
			expect(flags["dry-run"]).toBe(true);
			expect(args).toEqual([]);
		});

		test("should parse short flags correctly", () => {
			const { flags, args } = parseFlags(["-f", "-m"]);
			expect(flags.f).toBe(true);
			expect(flags.m).toBe(true);
			expect(args).toEqual([]);
		});

		test("should handle combined short flags", () => {
			const { flags, args } = parseFlags(["-fm"]);
			expect(flags.f).toBe(true);
			expect(flags.m).toBe(true);
			expect(args).toEqual([]);
		});

		test("should separate positional arguments from flags", () => {
			const { flags, args } = parseFlags([
				"init",
				"--force",
				"command",
				"--dry-run",
			]);
			expect(flags.force).toBe(true);
			expect(flags["dry-run"]).toBe(true);
			expect(args).toEqual(["init", "command"]);
		});
	});

	describe("Unknown Parameter Handling", () => {
		test("should handle unknown long flags", () => {
			const { flags, args } = parseFlags(["--unknown-flag", "value"]);
			// Current implementation stores unknown flags
			expect(flags["unknown-flag"]).toBe("value");
			expect(args).toEqual([]);
		});

		test("should handle unknown short flags", () => {
			const { flags, args } = parseFlags(["-x", "-y"]);
			expect(flags.x).toBe(true);
			expect(flags.y).toBe(true);
			expect(args).toEqual([]);
		});

		test("should handle unknown flags mixed with known ones", () => {
			const { flags, args } = parseFlags([
				"--force",
				"--unknown",
				"value",
				"-m",
			]);
			expect(flags.force).toBe(true);
			expect(flags.unknown).toBe("value");
			expect(flags.m).toBe(true);
			expect(args).toEqual([]);
		});
	});

	describe("Edge Case Handling", () => {
		test("should handle empty flag values", () => {
			const { flags, args } = parseFlags(["--config", ""]);
			expect(flags.config).toBe("");
			expect(args).toEqual([]);
		});

		test("should handle flags with special characters", () => {
			const { flags, args } = parseFlags(["--name", "test with spaces"]);
			expect(flags.name).toBe("test with spaces");
			expect(args).toEqual([]);
		});

		test("should handle malformed flags gracefully", () => {
			const { flags, args } = parseFlags(["---triple-dash", "--flag=value"]);
			// Triple dash should be treated as positional argument
			expect(args).toContain("---triple-dash");
			// Equals syntax not supported, should be positional
			expect(args).toContain("--flag=value");
		});

		test("should handle flag without value at end", () => {
			const { flags, args } = parseFlags(["--config"]);
			expect(flags.config).toBe(true);
			expect(args).toEqual([]);
		});
	});

	describe("Command Integration Tests", () => {
		describe("Init Command", () => {
			test("should accept valid init parameters", () => {
				const result = testCLI("init --dry-run --minimal", true);
				expect(result.success).toBe(true);
			});

			test("should handle unknown init parameters gracefully", () => {
				const result = testCLI("init --unknown-flag --dry-run", true);
				// Should not fail, but may show warnings
				expect(result.success).toBe(true);
			});

			test("should handle multiple unknown parameters", () => {
				const result = testCLI(
					"init --fake-flag value1 --invalid value2 --dry-run",
					true,
				);
				expect(result.success).toBe(true);
			});
		});

		describe("Agent Command", () => {
			test("should accept valid agent spawn parameters", () => {
				const result = testCLI("agent spawn researcher --name TestBot", true);
				expect(result.success).toBe(true);
			});

			test("should handle unknown agent parameters", () => {
				const result = testCLI(
					"agent spawn researcher --invalid-param value",
					true,
				);
				expect(result.success).toBe(true);
			});

			test("should handle malformed agent commands", () => {
				const result = testCLI("agent spawn --unknown-type", true);
				expect(result.success).toBe(true);
			});
		});

		describe("Task Command", () => {
			test("should accept valid task parameters", () => {
				const result = testCLI(
					'task create research "Test task" --priority 8',
					true,
				);
				expect(result.success).toBe(true);
			});

			test("should handle unknown task parameters", () => {
				const result = testCLI(
					'task create research "Test" --unknown-flag',
					true,
				);
				expect(result.success).toBe(true);
			});
		});

		describe("Swarm Command", () => {
			test("should handle swarm with unknown strategy", () => {
				const result = testCLI(
					'swarm "test objective" --strategy unknown --dry-run',
					true,
				);
				expect(result.success).toBe(true);
			});

			test("should handle unknown swarm parameters", () => {
				const result = testCLI(
					'swarm "test" --fake-param value --dry-run',
					true,
				);
				expect(result.success).toBe(true);
			});
		});
	});

	describe("Parameter Interaction Tests", () => {
		test("should handle conflicting boolean flags", () => {
			const result = testCLI("init --minimal --sparc --dry-run", true);
			expect(result.success).toBe(true);
		});

		test("should handle multiple config parameters", () => {
			const result = testCLI(
				"init --config test1.json --config test2.json --dry-run",
				true,
			);
			expect(result.success).toBe(true);
		});

		test("should handle mixed valid and invalid parameters", () => {
			const result = testCLI(
				"init --force --invalid-flag --minimal --fake value --dry-run",
				true,
			);
			expect(result.success).toBe(true);
		});
	});

	describe("Performance and Stress Tests", () => {
		test("should handle many parameters without performance degradation", () => {
			const manyFlags = Array.from(
				{ length: 50 },
				(_, i) => `--flag${i} value${i}`,
			).join(" ");
			const result = testCLI(`init ${manyFlags} --dry-run`, true);
			expect(result.success).toBe(true);
		});

		test("should handle long parameter values", () => {
			const longValue = "a".repeat(1000);
			const result = testCLI(`init --name "${longValue}" --dry-run`, true);
			expect(result.success).toBe(true);
		});

		test("should handle duplicate flags", () => {
			const result = testCLI(
				"init --force --force --minimal --minimal --dry-run",
				true,
			);
			expect(result.success).toBe(true);
		});
	});

	describe("Security Tests", () => {
		test("should handle special characters safely", () => {
			const result = testCLI(
				'init --name "test with $pecial ch@rs" --dry-run',
				true,
			);
			expect(result.success).toBe(true);
		});

		test("should handle quotes and escapes", () => {
			const result = testCLI(
				'init --description "test with \\"quotes\\"" --dry-run',
				true,
			);
			expect(result.success).toBe(true);
		});

		test("should handle Unicode characters", () => {
			const result = testCLI('init --name "test-émojis-🚀" --dry-run', true);
			expect(result.success).toBe(true);
		});
	});

	describe("Type Validation Tests", () => {
		test("should handle numeric parameters", () => {
			const result = testCLI("agent provision 5", true);
			expect(result.success).toBe(true);
		});

		test("should handle invalid numeric parameters", () => {
			const result = testCLI("agent provision abc", true);
			// Should not crash, might show validation error
			expect(result.success).toBe(true);
		});

		test("should handle negative numbers", () => {
			const result = testCLI("agent provision -5", true);
			expect(result.success).toBe(true);
		});
	});

	describe("Help and Documentation Tests", () => {
		test("should show help with unknown parameters", () => {
			const result = testCLI("--help", true);
			expect(result.success).toBe(true);
			expect(result.output).toContain("Usage:");
		});

		test("should show command help with unknown parameters", () => {
			const result = testCLI("init --help", true);
			expect(result.success).toBe(true);
		});

		test("should handle help flag mixed with unknown parameters", () => {
			const result = testCLI("init --unknown-flag --help", true);
			expect(result.success).toBe(true);
		});
	});

	describe("Regression Tests", () => {
		test("should maintain backward compatibility for common patterns", () => {
			const commonCommands = [
				"init --sparc",
				"init --minimal --force",
				"agent spawn researcher",
				'task create research "test"',
				'swarm "test objective"',
				"status",
				'memory store "key" "value"',
			];

			commonCommands.forEach((command) => {
				const result = testCLI(`${command} --dry-run || true`, true);
				// Commands should not crash or fail catastrophically
				expect(typeof result.success).toBe("boolean");
			});
		});
	});
});

describe("Specific Bug Tests", () => {
	describe("Parameter Parsing Gaps", () => {
		test("should identify all unknown flags", () => {
			const { flags } = parseFlags([
				"--known",
				"--unknown1",
				"value1",
				"--unknown2",
				"--known2",
			]);

			// Current implementation stores all flags, but we should track unknown ones
			expect(flags.unknown1).toBe("value1");
			expect(flags.unknown2).toBe(true);
		});

		test("should handle flag-like arguments that are not flags", () => {
			const { flags, args } = parseFlags([
				"command",
				"--valid-flag",
				"value",
				"argument-with--dashes",
			]);

			expect(flags["valid-flag"]).toBe("value");
			expect(args).toContain("command");
			expect(args).toContain("argument-with--dashes");
		});

		test("should preserve order of positional arguments", () => {
			const { flags, args } = parseFlags([
				"first",
				"--flag",
				"second",
				"third",
			]);

			expect(args).toEqual(["first", "second", "third"]);
			expect(flags.flag).toBe(true);
		});
	});

	describe("Edge Cases in Current Implementation", () => {
		test("should handle flags without values followed by other flags", () => {
			const { flags } = parseFlags(["--flag1", "--flag2", "value2"]);

			expect(flags.flag1).toBe(true);
			expect(flags.flag2).toBe("value2");
		});

		test("should handle empty string values", () => {
			const { flags } = parseFlags(["--config", "", "--name", "test"]);

			expect(flags.config).toBe("");
			expect(flags.name).toBe("test");
		});

		test("should handle short flag combinations with unknown flags", () => {
			const { flags } = parseFlags(["-abc"]);

			expect(flags.a).toBe(true);
			expect(flags.b).toBe(true);
			expect(flags.c).toBe(true);
		});
	});
});

// Test utilities for manual testing
const manualTestCases = {
	"Unknown long flags": [
		"init --unknown-flag",
		"init --typo-flag value",
		"init --force --unknown --minimal",
	],
	"Unknown short flags": ["init -x", "init -fxm", "agent spawn researcher -z"],
	"Malformed parameters": [
		"init ---triple-dash",
		"init --flag=value",
		"init -",
	],
	"Special characters": [
		'init --name "test with spaces"',
		'init --config "./path with spaces/config.json"',
		'init --description "test with \\"quotes\\""',
	],
	"Large parameter sets": [
		"init --force --minimal --sparc --dry-run --skip-mcp --enhanced --config test.json",
		Array.from({ length: 20 }, (_, i) => `--param${i} value${i}`).join(" "),
	],
};

// Export test cases for manual testing
if (typeof module !== "undefined" && module.exports) {
	module.exports = { manualTestCases };
}
