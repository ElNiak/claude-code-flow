/**
 * Unit Tests for parseFlags Function
 * Tests the core parameter parsing logic in isolation
 */

import { parseFlags } from "../../src/cli/utils.js";

describe("parseFlags Unit Tests", () => {
	describe("Basic Flag Parsing", () => {
		test("should parse single long flag with value", () => {
			const result = parseFlags(["--config", "test.json"]);
			expect(result.flags.config).toBe("test.json");
			expect(result.args).toEqual([]);
		});

		test("should parse single long flag without value", () => {
			const result = parseFlags(["--force"]);
			expect(result.flags.force).toBe(true);
			expect(result.args).toEqual([]);
		});

		test("should parse single short flag", () => {
			const result = parseFlags(["-f"]);
			expect(result.flags.f).toBe(true);
			expect(result.args).toEqual([]);
		});

		test("should parse combined short flags", () => {
			const result = parseFlags(["-abc"]);
			expect(result.flags.a).toBe(true);
			expect(result.flags.b).toBe(true);
			expect(result.flags.c).toBe(true);
			expect(result.args).toEqual([]);
		});
	});

	describe("Mixed Arguments and Flags", () => {
		test("should separate positional arguments from flags", () => {
			const result = parseFlags(["command", "--flag", "value", "arg1", "arg2"]);
			expect(result.flags.flag).toBe("value");
			expect(result.args).toEqual(["command", "arg1", "arg2"]);
		});

		test("should handle flags at different positions", () => {
			const result = parseFlags([
				"--first",
				"value1",
				"arg1",
				"--second",
				"arg2",
			]);
			expect(result.flags.first).toBe("value1");
			expect(result.flags.second).toBe(true);
			expect(result.args).toEqual(["arg1", "arg2"]);
		});
	});

	describe("Unknown Parameter Handling", () => {
		test("should store unknown long flags", () => {
			const result = parseFlags(["--unknown-flag", "value"]);
			expect(result.flags["unknown-flag"]).toBe("value");
			expect(result.args).toEqual([]);
		});

		test("should store unknown short flags", () => {
			const result = parseFlags(["-xyz"]);
			expect(result.flags.x).toBe(true);
			expect(result.flags.y).toBe(true);
			expect(result.flags.z).toBe(true);
			expect(result.args).toEqual([]);
		});

		test("should handle mix of known and unknown flags", () => {
			const result = parseFlags(["--force", "--unknown", "value", "-m", "-x"]);
			expect(result.flags.force).toBe(true);
			expect(result.flags.unknown).toBe("value");
			expect(result.flags.m).toBe(true);
			expect(result.flags.x).toBe(true);
			expect(result.args).toEqual([]);
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty input", () => {
			const result = parseFlags([]);
			expect(result.flags).toEqual({});
			expect(result.args).toEqual([]);
		});

		test("should handle flag without value at end", () => {
			const result = parseFlags(["--config"]);
			expect(result.flags.config).toBe(true);
			expect(result.args).toEqual([]);
		});

		test("should handle empty string values", () => {
			const result = parseFlags(["--config", ""]);
			expect(result.flags.config).toBe("");
			expect(result.args).toEqual([]);
		});

		test("should handle special characters in values", () => {
			const result = parseFlags(["--name", "test with spaces"]);
			expect(result.flags.name).toBe("test with spaces");
			expect(result.args).toEqual([]);
		});

		test("should handle malformed flags", () => {
			const result = parseFlags(["---triple", "--flag=value"]);
			expect(result.args).toContain("---triple");
			expect(result.args).toContain("--flag=value");
			expect(Object.keys(result.flags)).toHaveLength(0);
		});
	});

	describe("Complex Scenarios", () => {
		test("should handle multiple flags with same name (last wins)", () => {
			const result = parseFlags([
				"--config",
				"first.json",
				"--config",
				"second.json",
			]);
			expect(result.flags.config).toBe("second.json");
			expect(result.args).toEqual([]);
		});

		test("should handle flags that look like arguments", () => {
			const result = parseFlags([
				"command",
				"--flag",
				"value",
				"argument-with--dashes",
			]);
			expect(result.flags.flag).toBe("value");
			expect(result.args).toEqual(["command", "argument-with--dashes"]);
		});

		test("should preserve argument order", () => {
			const result = parseFlags([
				"first",
				"--flag",
				"second",
				"third",
				"--other",
			]);
			expect(result.flags.flag).toBe(true);
			expect(result.flags.other).toBe(true);
			expect(result.args).toEqual(["first", "second", "third"]);
		});
	});

	describe("Performance Tests", () => {
		test("should handle large number of flags efficiently", () => {
			const args = [];
			for (let i = 0; i < 100; i++) {
				args.push(`--flag${i}`, `value${i}`);
			}

			const start = performance.now();
			const result = parseFlags(args);
			const end = performance.now();

			expect(end - start).toBeLessThan(100); // Should complete in under 100ms
			expect(Object.keys(result.flags)).toHaveLength(100);
		});

		test("should handle very long flag values", () => {
			const longValue = "a".repeat(10000);
			const result = parseFlags(["--long-value", longValue]);
			expect(result.flags["long-value"]).toBe(longValue);
			expect(result.args).toEqual([]);
		});
	});

	describe("Security Tests", () => {
		test("should handle potentially dangerous characters safely", () => {
			const dangerousChars = [
				"$(rm -rf /)",
				'"; rm -rf /',
				"../../../etc/passwd",
			];

			dangerousChars.forEach((dangerous) => {
				const result = parseFlags(["--input", dangerous]);
				expect(result.flags.input).toBe(dangerous);
				expect(result.args).toEqual([]);
			});
		});

		test("should handle Unicode characters", () => {
			const unicode = "test-émojis-🚀-中文";
			const result = parseFlags(["--unicode", unicode]);
			expect(result.flags.unicode).toBe(unicode);
			expect(result.args).toEqual([]);
		});

		test("should handle quotes and escapes", () => {
			const quotedValue = "test with \"quotes\" and 'apostrophes'";
			const result = parseFlags(["--quoted", quotedValue]);
			expect(result.flags.quoted).toBe(quotedValue);
			expect(result.args).toEqual([]);
		});
	});
});

describe("parseFlags Limitations and Issues", () => {
	describe("Current Implementation Issues", () => {
		test("silently accepts unknown parameters", () => {
			const result = parseFlags(["--completely-unknown-flag", "value"]);

			// Current implementation stores unknown flags without warning
			expect(result.flags["completely-unknown-flag"]).toBe("value");

			// Issue: No indication that parameter is unknown
			expect(result.warnings).toBeUndefined();
			expect(result.errors).toBeUndefined();
		});

		test("no type validation for parameter values", () => {
			const result = parseFlags(["--numeric-param", "not-a-number"]);

			// Should validate if parameter expects number
			expect(result.flags["numeric-param"]).toBe("not-a-number");

			// Issue: No type checking
			expect(isNaN(result.flags["numeric-param"])).toBe(true);
		});

		test("no required parameter validation", () => {
			const result = parseFlags(["--optional-param"]);

			// Should check if required parameters are missing
			expect(result.flags["optional-param"]).toBe(true);

			// Issue: No validation of required vs optional
			expect(result.missingRequired).toBeUndefined();
		});
	});
});

// Test data for manual testing
export const testData = {
	validCombinations: [
		["--force", "--minimal"],
		["--config", "test.json", "--dry-run"],
		["-fm", "--sparc"],
	],

	unknownParameters: [["--unknown-flag"], ["--typo-flag", "value"], ["-xyz"]],

	edgeCases: [["---triple-dash"], ["--flag=value"], ["--"], ["-"]],

	securityTests: [
		["--input", "$(rm -rf /)"],
		["--path", "../../../etc/passwd"],
		["--script", '"; rm -rf /'],
	],
};
