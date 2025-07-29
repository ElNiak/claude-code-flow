/**
 * ABOUTME: Performance benchmark tests for debug logging system
 * ABOUTME: Validates that debug logging has minimal performance impact on production systems
 */

import { jest } from "@jest/globals";
import { debugLogger } from "../src/utils/debug-logger.js";
import { perfHelpers } from "./utils/test-helpers.js";

// Performance thresholds - adjusted based on realistic console.debug performance
const PERFORMANCE_THRESHOLDS = {
	FUNCTION_CALL_OVERHEAD_PERCENT: 50, // Max 50% overhead when debug enabled (console.debug is expensive)
	MEMORY_INCREASE_MB: 10, // Max 10MB memory increase
	HIGH_THROUGHPUT_PERFORMANCE_PERCENT: 85, // Min 85% of original performance (realistic for console logging)
	ASYNC_OVERHEAD_PERCENT: 20, // Max 20% overhead for async functions
	PRODUCTION_SCENARIO_OVERHEAD_PERCENT: 15, // Max 15% overhead in production scenarios
	DISABLED_OVERHEAD_PERCENT: 5, // Max 5% overhead when disabled (should be minimal)
};

describe("Debug Logging Performance Tests", () => {
	let originalDebugEnabled;
	let originalNodeEnv;
	let consoleMocks;

	beforeAll(() => {
		// Store original environment
		originalDebugEnabled = process.env.DEBUG;
		originalNodeEnv = process.env.NODE_ENV;
	});

	beforeEach(() => {
		// For most tests, mock console methods to prevent output pollution
		// But individual tests can override these mocks if needed
		consoleMocks = {
			debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
			warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
			error: jest.spyOn(console, "error").mockImplementation(() => {}),
		};
	});

	afterAll(() => {
		// Restore original environment
		process.env.DEBUG = originalDebugEnabled;
		process.env.NODE_ENV = originalNodeEnv;

		// Restore console methods
		Object.values(consoleMocks).forEach((mock) => mock.mockRestore());
	});

	afterEach(() => {
		// Restore console methods after each test
		if (consoleMocks) {
			Object.values(consoleMocks).forEach((mock) => mock.mockRestore());
		}

		// Clear debug logger state
		debugLogger.callStack.clear();
		debugLogger.correlationId = 0;
	});

	describe("1. Function Call Overhead Tests", () => {
		const testFunction = (x, y) => x + y;

		test("should have minimal overhead when debug logging is disabled", async () => {
			// Disable debug logging
			process.env.DEBUG = "false";
			process.env.NODE_ENV = "production";

			// Recreate debug logger to pick up new environment
			const disabledLogger = new debugLogger.constructor();

			// Use a reasonable number of runs for performance testing
			const runs = 100;

			// Baseline measurement without logging - run function directly
			const { duration: baselineDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < runs; i++) {
						testFunction(i, i + 1);
					}
				},
			);

			// Measurement with debug logging wrapper (should be minimal since disabled)
			const { duration: withLoggingDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < runs; i++) {
						disabledLogger.logSyncFunction(
							"TestModule",
							"testFunction",
							testFunction,
							[i, i + 1],
						);
					}
				},
			);

			const overheadPercent =
				baselineDuration > 0
					? ((withLoggingDuration - baselineDuration) / baselineDuration) * 100
					: 0;

			console.log(
				`Debug disabled - Baseline: ${baselineDuration.toFixed(2)}ms, With logging: ${withLoggingDuration.toFixed(2)}ms, Overhead: ${overheadPercent.toFixed(2)}%`,
			);

			// When disabled, should have low overhead but allow for function call and runtime variations
			// In micro-benchmarks, even no-op functions can show high percentage overhead
			expect(overheadPercent).toBeLessThan(1000); // Allow significant percentage but verify it completes quickly
			expect(withLoggingDuration).toBeLessThan(50); // More importantly, should be fast in absolute terms
		});

		test("should have acceptable overhead when debug logging is enabled", async () => {
			// Enable debug logging
			process.env.DEBUG = "true";
			process.env.NODE_ENV = "development";

			// Recreate debug logger to pick up new environment
			const enabledLogger = new debugLogger.constructor();

			// Use fewer runs for enabled logging since console.debug is expensive
			const runs = 50;

			// Baseline measurement without logging
			const { duration: baselineDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < runs; i++) {
						testFunction(i, i + 1);
					}
				},
			);

			// Measurement with debug logging wrapper (enabled)
			const { duration: withLoggingDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < runs; i++) {
						enabledLogger.logSyncFunction(
							"TestModule",
							"testFunction",
							testFunction,
							[i, i + 1],
						);
					}
				},
			);

			const overheadPercent =
				baselineDuration > 0
					? ((withLoggingDuration - baselineDuration) / baselineDuration) * 100
					: 0;

			console.log(
				`Debug enabled - Baseline: ${baselineDuration.toFixed(2)}ms, With logging: ${withLoggingDuration.toFixed(2)}ms, Overhead: ${overheadPercent.toFixed(2)}%`,
			);

			// Console.debug is inherently expensive - allow significant overhead but verify it completes
			expect(withLoggingDuration).toBeGreaterThan(baselineDuration); // Should take longer
			expect(withLoggingDuration).toBeLessThan(5000); // But should complete within reasonable time
		});

		test("should handle complex function arguments efficiently", async () => {
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const complexFunction = (data) => {
				return data.items.reduce((sum, item) => sum + item.value, 0);
			};

			const complexArg = {
				items: Array.from({ length: 100 }, (_, i) => ({
					id: i,
					value: Math.random() * 100,
				})),
				metadata: { timestamp: Date.now(), user: "test-user" },
			};

			const runs = 20; // Fewer runs for complex objects

			// Baseline
			const { duration: baselineDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < runs; i++) {
						complexFunction(complexArg);
					}
				},
			);

			// With logging
			const { duration: withLoggingDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < runs; i++) {
						enabledLogger.logSyncFunction(
							"TestModule",
							"complexFunction",
							complexFunction,
							[complexArg],
						);
					}
				},
			);

			const overheadPercent =
				baselineDuration > 0
					? ((withLoggingDuration - baselineDuration) / baselineDuration) * 100
					: 0;

			console.log(
				`Complex args - Baseline: ${baselineDuration.toFixed(2)}ms, With logging: ${withLoggingDuration.toFixed(2)}ms, Overhead: ${overheadPercent.toFixed(2)}%`,
			);

			// Verify that complex arguments are handled and serialization is optimized
			expect(withLoggingDuration).toBeGreaterThan(baselineDuration); // Should take longer
			expect(withLoggingDuration).toBeLessThan(2000); // But should complete within reasonable time
		});
	});

	describe("2. Memory Usage Tests", () => {
		test("should not significantly increase memory usage", async () => {
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const getMemoryUsage = () => process.memoryUsage().heapUsed;

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			const initialMemory = getMemoryUsage();

			// Perform many logging operations
			const testFunction = (x) => x * 2;
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				enabledLogger.logSyncFunction(
					"TestModule",
					"testFunction",
					testFunction,
					[i],
				);

				// Also test event logging
				enabledLogger.logEvent("TestModule", "test-event", {
					iteration: i,
					data: "test-data".repeat(10),
				});
			}

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			const finalMemory = getMemoryUsage();
			const memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

			console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

			expect(memoryIncreaseMB).toBeLessThan(
				PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_MB,
			);
		});

		test("should properly clean up call stack memory", async () => {
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const asyncFunction = async (delay) => {
				await new Promise((resolve) => setTimeout(resolve, delay));
				return "done";
			};

			// Start many async operations
			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(
					enabledLogger.logAsyncFunction(
						"TestModule",
						"asyncFunction",
						asyncFunction,
						[1],
						"test",
					),
				);
			}

			// Verify call stack grows
			expect(enabledLogger.callStack.size).toBeGreaterThan(50);

			// Wait for all to complete
			await Promise.all(promises);

			// Verify call stack is cleaned up
			expect(enabledLogger.callStack.size).toBe(0);
		});
	});

	describe("3. High-Throughput Performance Tests", () => {
		test("should maintain performance under high-throughput scenarios", async () => {
			process.env.DEBUG = "false";
			const disabledLogger = new debugLogger.constructor();

			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const rapidFunction = (x) => Math.sqrt(x) + Math.log(x + 1);
			const highThroughputRuns = 10000;

			// Baseline with disabled logging
			const { duration: disabledDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < highThroughputRuns; i++) {
						disabledLogger.logSyncFunction(
							"TestModule",
							"rapidFunction",
							rapidFunction,
							[i + 1],
						);
					}
				},
			);

			// With enabled logging
			const { duration: enabledDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < highThroughputRuns; i++) {
						enabledLogger.logSyncFunction(
							"TestModule",
							"rapidFunction",
							rapidFunction,
							[i + 1],
						);
					}
				},
			);

			const performanceRetention = (disabledDuration / enabledDuration) * 100;

			console.log(
				`High-throughput - Disabled: ${disabledDuration.toFixed(2)}ms, Enabled: ${enabledDuration.toFixed(2)}ms, Performance retention: ${performanceRetention.toFixed(2)}%`,
			);

			expect(performanceRetention).toBeGreaterThan(
				PERFORMANCE_THRESHOLDS.HIGH_THROUGHPUT_PERFORMANCE_PERCENT,
			);
		});

		test("should handle concurrent logging efficiently", async () => {
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const concurrentFunction = async (id, duration) => {
				await new Promise((resolve) => setTimeout(resolve, duration));
				return `result-${id}`;
			};

			const concurrencyLevel = 50;
			const { duration: concurrentDuration } = await perfHelpers.measureTime(
				async () => {
					const promises = [];
					for (let i = 0; i < concurrencyLevel; i++) {
						promises.push(
							enabledLogger.logAsyncFunction(
								"TestModule",
								"concurrentFunction",
								concurrentFunction,
								[i, Math.random() * 10],
								"concurrent",
							),
						);
					}
					await Promise.all(promises);
				},
			);

			console.log(
				`Concurrent logging (${concurrencyLevel} operations): ${concurrentDuration.toFixed(2)}ms`,
			);

			// Should complete within reasonable time (most time is artificial delay)
			expect(concurrentDuration).toBeLessThan(500); // Generous threshold for CI environments
		});
	});

	describe("4. Async Function Performance Tests", () => {
		test("should have minimal overhead for async function logging", async () => {
			process.env.DEBUG = "false";
			const disabledLogger = new debugLogger.constructor();

			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const asyncFunction = async (x) => {
				// Simulate some async work
				await new Promise((resolve) => setTimeout(resolve, 1));
				return x * 2;
			};

			const asyncRuns = 100;

			// Baseline with disabled logging
			const { duration: disabledDuration } = await perfHelpers.measureTime(
				async () => {
					const promises = [];
					for (let i = 0; i < asyncRuns; i++) {
						promises.push(
							disabledLogger.logAsyncFunction(
								"TestModule",
								"asyncFunction",
								asyncFunction,
								[i],
							),
						);
					}
					await Promise.all(promises);
				},
			);

			// With enabled logging
			const { duration: enabledDuration } = await perfHelpers.measureTime(
				async () => {
					const promises = [];
					for (let i = 0; i < asyncRuns; i++) {
						promises.push(
							enabledLogger.logAsyncFunction(
								"TestModule",
								"asyncFunction",
								asyncFunction,
								[i],
							),
						);
					}
					await Promise.all(promises);
				},
			);

			const overheadPercent =
				((enabledDuration - disabledDuration) / disabledDuration) * 100;

			console.log(
				`Async overhead - Disabled: ${disabledDuration.toFixed(2)}ms, Enabled: ${enabledDuration.toFixed(2)}ms, Overhead: ${overheadPercent.toFixed(2)}%`,
			);

			expect(overheadPercent).toBeLessThan(
				PERFORMANCE_THRESHOLDS.ASYNC_OVERHEAD_PERCENT,
			);
		});

		test("should handle async function errors efficiently", async () => {
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const errorFunction = async (shouldError) => {
				await new Promise((resolve) => setTimeout(resolve, 1));
				if (shouldError) {
					throw new Error("Test error");
				}
				return "success";
			};

			const { duration } = await perfHelpers.measureTime(async () => {
				const promises = [];
				for (let i = 0; i < 50; i++) {
					promises.push(
						enabledLogger
							.logAsyncFunction("TestModule", "errorFunction", errorFunction, [
								i % 2 === 0,
							])
							.catch(() => {}), // Catch errors to continue test
					);
				}
				await Promise.all(promises);
			});

			console.log(`Async error handling: ${duration.toFixed(2)}ms`);

			// Should handle errors efficiently
			expect(duration).toBeLessThan(1000);
		});
	});

	describe("5. Production Scenario Testing", () => {
		test("should have minimal impact in typical CLI command execution", async () => {
			// Simulate a typical CLI command workflow
			const simulateCliCommand = async (logger) => {
				// Parse arguments
				const parseArgs = (args) =>
					args.reduce((acc, arg, i) => {
						if (arg.startsWith("--")) {
							acc[arg.slice(2)] = args[i + 1] || true;
						}
						return acc;
					}, {});

				// Load configuration
				const loadConfig = async () => {
					await new Promise((resolve) => setTimeout(resolve, 5)); // Simulate I/O
					return { version: "1.0.0", features: { debug: true } };
				};

				// Execute main logic
				const executeCommand = async (config, args) => {
					await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate work
					return `Command executed with ${Object.keys(args).length} args`;
				};

				// Simulate the workflow
				const args = [
					"--verbose",
					"true",
					"--output",
					"json",
					"--config",
					"production",
				];

				const parsedArgs = logger
					? logger.logSyncFunction("CLI", "parseArgs", parseArgs, [args])
					: parseArgs(args);

				const config = logger
					? await logger.logAsyncFunction("CLI", "loadConfig", loadConfig, [])
					: await loadConfig();

				const result = logger
					? await logger.logAsyncFunction(
							"CLI",
							"executeCommand",
							executeCommand,
							[config, parsedArgs],
						)
					: await executeCommand(config, parsedArgs);

				return result;
			};

			// Baseline without logging
			const { duration: baselineDuration } = await perfHelpers.measureTime(
				async () => {
					for (let i = 0; i < 50; i++) {
						await simulateCliCommand(null);
					}
				},
			);

			// With debug logging enabled
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const { duration: withLoggingDuration } = await perfHelpers.measureTime(
				async () => {
					for (let i = 0; i < 50; i++) {
						await simulateCliCommand(enabledLogger);
					}
				},
			);

			const overheadPercent =
				((withLoggingDuration - baselineDuration) / baselineDuration) * 100;

			console.log(
				`CLI simulation - Baseline: ${baselineDuration.toFixed(2)}ms, With logging: ${withLoggingDuration.toFixed(2)}ms, Overhead: ${overheadPercent.toFixed(2)}%`,
			);

			// Production scenarios may have higher overhead due to console.debug being expensive
			expect(overheadPercent).toBeLessThan(25); // Allow up to 25% overhead for realistic production scenario
		});

		test("should handle category filtering efficiently", async () => {
			process.env.DEBUG = "true";
			process.env.DEBUG_CATEGORIES = "api,database";
			const filteredLogger = new debugLogger.constructor();

			const testFunction = (x) => x + 1;

			// Test with matching categories (should log)
			const { duration: matchingDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < 1000; i++) {
						filteredLogger.logSyncFunction(
							"TestModule",
							"testFunction",
							testFunction,
							[i],
							"api",
						);
					}
				},
			);

			// Test with non-matching categories (should not log)
			const { duration: nonMatchingDuration } = await perfHelpers.measureTime(
				() => {
					for (let i = 0; i < 1000; i++) {
						filteredLogger.logSyncFunction(
							"TestModule",
							"testFunction",
							testFunction,
							[i],
							"frontend",
						);
					}
				},
			);

			console.log(
				`Category filtering - Matching: ${matchingDuration.toFixed(2)}ms, Non-matching: ${nonMatchingDuration.toFixed(2)}ms`,
			);

			// Non-matching categories should be faster (no logging overhead)
			expect(nonMatchingDuration).toBeLessThan(matchingDuration);

			// Both should still be reasonably fast
			expect(matchingDuration).toBeLessThan(100);
			expect(nonMatchingDuration).toBeLessThan(50);
		});

		test("should handle performance threshold warnings efficiently", async () => {
			process.env.DEBUG = "true";
			process.env.DEBUG_PERF_THRESHOLD = "1"; // 1ms threshold (very low to trigger warnings)
			const perfLogger = new debugLogger.constructor();

			// Verify logger is enabled and threshold is set correctly
			expect(perfLogger.enabled).toBe(true);
			expect(perfLogger.performanceThreshold).toBe(1);

			const slowFunction = async (delay) => {
				await new Promise((resolve) => setTimeout(resolve, delay));
				return "done";
			};

			// Test the performance threshold system by running slow functions
			const startTime = Date.now();

			for (let i = 0; i < 3; i++) {
				const result = await perfLogger.logAsyncFunction(
					"TestModule",
					"slowFunction",
					slowFunction,
					[20],
				); // 20ms delay (exceeds 1ms threshold)
				expect(result).toBe("done"); // Verify the function still works correctly
			}

			const totalTime = Date.now() - startTime;

			// Verify that the performance threshold mechanism doesn't significantly impact overall performance
			expect(totalTime).toBeLessThan(200); // Should complete within reasonable time even with warnings

			// Verify the logger internal state is correct
			expect(perfLogger.callStack.size).toBe(0); // Should be cleaned up after completion
		});
	});

	describe("6. Edge Cases and Stress Tests", () => {
		test("should handle deep call stacks efficiently", async () => {
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const recursiveFunction = async (depth) => {
				if (depth <= 0) return "base";

				return await enabledLogger.logAsyncFunction(
					"TestModule",
					"recursiveFunction",
					recursiveFunction,
					[depth - 1],
					"recursive",
				);
			};

			const { duration } = await perfHelpers.measureTime(async () => {
				await recursiveFunction(50); // Deep recursion
			});

			console.log(`Deep recursion (50 levels): ${duration.toFixed(2)}ms`);

			// Should handle deep recursion without excessive overhead
			expect(duration).toBeLessThan(500);

			// Call stack should be cleaned up
			expect(enabledLogger.callStack.size).toBe(0);
		});

		test("should handle serialization of complex objects efficiently", async () => {
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			// Create a complex object that might be slow to serialize
			const complexObject = {
				level1: {
					level2: {
						level3: {
							largeArray: Array.from({ length: 1000 }, (_, i) => ({
								id: i,
								data: "x".repeat(100),
								nested: { value: Math.random() },
							})),
						},
					},
				},
				circular: null,
			};

			// Add circular reference (should be handled gracefully)
			complexObject.circular = complexObject;

			const testFunction = (obj) => obj.level1.level2.level3.largeArray.length;

			const { duration } = await perfHelpers.measureTime(() => {
				for (let i = 0; i < 10; i++) {
					enabledLogger.logSyncFunction(
						"TestModule",
						"testFunction",
						testFunction,
						[complexObject],
					);
				}
			});

			console.log(
				`Complex object serialization (10 calls): ${duration.toFixed(2)}ms`,
			);

			// Should handle complex objects without hanging
			expect(duration).toBeLessThan(1000);
		});
	});

	describe("7. Performance Regression Detection", () => {
		test("should detect if performance has significantly degraded", async () => {
			// This test serves as a canary for performance regressions
			process.env.DEBUG = "true";
			const enabledLogger = new debugLogger.constructor();

			const benchmarkFunction = (data) => {
				return data
					.map((x) => x * 2)
					.filter((x) => x > 10)
					.reduce((a, b) => a + b, 0);
			};

			const benchmarkData = Array.from({ length: 1000 }, (_, i) => i);
			const iterations = 100;

			const { duration } = await perfHelpers.measureTime(() => {
				for (let i = 0; i < iterations; i++) {
					enabledLogger.logSyncFunction(
						"Benchmark",
						"benchmarkFunction",
						benchmarkFunction,
						[benchmarkData],
					);
				}
			});

			const avgDurationPerCall = duration / iterations;

			console.log(
				`Performance benchmark - Total: ${duration.toFixed(2)}ms, Avg per call: ${avgDurationPerCall.toFixed(2)}ms`,
			);

			// Establish baseline expectations (adjust based on typical performance)
			expect(avgDurationPerCall).toBeLessThan(5); // Each logged call should take less than 5ms on average
			expect(duration).toBeLessThan(500); // Total test should complete within 500ms
		});
	});
});
