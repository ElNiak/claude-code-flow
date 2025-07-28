/**
 * ABOUTME: Performance tests for hive-mind command using TDD methodology and load testing
 * ABOUTME: Validates command performance under various load conditions and optimization scenarios
 */

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	jest,
	test,
} from "@jest/globals";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
	CLITestRunner,
	MockDatabaseFactory,
	PerformanceTestHelper,
	TestDataGenerator,
} from "../utils/cli-test-utilities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../../..");

describe("⚡ Hive-Mind Performance Tests (TDD)", () => {
	let hiveMindCommand;
	let mockDatabase;
	let cliRunner;

	beforeEach(async () => {
		// Create performance-optimized mocks
		mockDatabase = MockDatabaseFactory.create({
			agents: TestDataGenerator.generateAgents(100),
			memories: TestDataGenerator.generateMemories(1000),
			metrics: TestDataGenerator.generateMetrics(500),
		});

		// Mock modules for performance testing
		jest.unstable_mockModule("better-sqlite3", () => ({
			default: jest.fn().mockImplementation(() => mockDatabase),
		}));

		// Import command after mocking
		const hiveMindModule = await import(
			`${projectRoot}/src/cli/simple-commands/hive-mind.js`
		);
		hiveMindCommand = hiveMindModule.hiveMindCommand;
		cliRunner = new CLITestRunner(hiveMindCommand);
	});

	describe("🔴 RED PHASE - Command Execution Performance (Should FAIL)", () => {
		test("FAILING: status command should execute within performance threshold", async () => {
			const performanceTest = await PerformanceTestHelper.measureExecutionTime(
				async () => {
					return await cliRunner.run(["status"], {});
				},
			);

			// Should complete within 500ms even with large dataset
			expect(performanceTest.duration).toBeLessThan(500);

			// Should handle large agent list efficiently
			expect(performanceTest.result.exitCode).toBe(0);
			expect(performanceTest.result.output.logs.join("\n")).toContain(
				"Active Agents: 100",
			);
		});

		test("FAILING: memory list command should handle pagination efficiently", async () => {
			const performanceTest = await PerformanceTestHelper.measureExecutionTime(
				async () => {
					return await cliRunner.run(["memory", "list"], {
						limit: 50,
						offset: 0,
					});
				},
			);

			// Should paginate large datasets quickly
			expect(performanceTest.duration).toBeLessThan(200);

			// Should use proper SQL LIMIT/OFFSET
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("LIMIT 50 OFFSET 0"),
			);
		});

		test("FAILING: concurrent command execution should not degrade performance", async () => {
			const concurrentTest = async () => {
				const promises = Array.from({ length: 10 }, () =>
					cliRunner.run(["status"], {}),
				);

				const startTime = Date.now();
				const results = await Promise.all(promises);
				const totalTime = Date.now() - startTime;

				return {
					results,
					totalTime,
					avgTime: totalTime / promises.length,
				};
			};

			const concurrentResults = await concurrentTest();

			// All concurrent requests should succeed
			expect(concurrentResults.results.every((r) => r.exitCode === 0)).toBe(
				true,
			);

			// Average time per request should be reasonable
			expect(concurrentResults.avgTime).toBeLessThan(100);

			// Total time should show parallelism benefits
			expect(concurrentResults.totalTime).toBeLessThan(500);
		});

		test("FAILING: memory search should be optimized for large datasets", async () => {
			// Set up database with full-text search optimization
			mockDatabase
				.prepare()
				.all.mockReturnValue(TestDataGenerator.generateMemories(5000));

			const searchTest = await PerformanceTestHelper.measureExecutionTime(
				async () => {
					return await cliRunner.run(["memory", "search"], {
						query: "test",
						limit: 20,
					});
				},
			);

			// Search should be fast even with large dataset
			expect(searchTest.duration).toBeLessThan(300);

			// Should use indexed search
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("CREATE INDEX IF NOT EXISTS"),
			);
		});
	});

	describe("🔴 RED PHASE - Load Testing Scenarios (Should FAIL)", () => {
		test("FAILING: should handle high-frequency status requests", async () => {
			const loadTest = PerformanceTestHelper.createLoadTest(
				() => cliRunner.run(["status"], {}),
				100, // 100 concurrent requests
			);

			const results = await loadTest();

			// Should handle all requests successfully
			expect(results.successful).toBe(100);
			expect(results.failed).toBe(0);

			// Should maintain reasonable response times
			expect(results.avgTime).toBeLessThan(50); // 50ms average
			expect(results.totalTime).toBeLessThan(5000); // 5 seconds total
		});

		test("FAILING: should handle rapid agent spawning requests", async () => {
			const spawnLoadTest = async () => {
				const startTime = Date.now();
				const promises = Array.from({ length: 20 }, (_, i) =>
					cliRunner.run(["spawn"], {
						type: "researcher",
						name: `load-test-agent-${i}`,
					}),
				);

				const results = await Promise.allSettled(promises);
				const endTime = Date.now();

				return {
					successful: results.filter((r) => r.status === "fulfilled").length,
					failed: results.filter((r) => r.status === "rejected").length,
					duration: endTime - startTime,
				};
			};

			const spawnResults = await spawnLoadTest();

			// Should handle rapid spawning
			expect(spawnResults.successful).toBeGreaterThan(15); // Allow some failures under load
			expect(spawnResults.duration).toBeLessThan(3000); // 3 seconds for 20 spawns
		});

		test("FAILING: should handle memory operations under load", async () => {
			const memoryLoadTest = async () => {
				const operations = [];

				// Mix of different memory operations
				for (let i = 0; i < 50; i++) {
					operations.push(
						cliRunner.run(["memory", "store"], {
							key: `load-test-${i}`,
							value: `test-data-${i}`,
						}),
					);

					operations.push(
						cliRunner.run(["memory", "retrieve"], {
							key: `existing-key-${i % 10}`,
						}),
					);
				}

				const startTime = Date.now();
				const results = await Promise.allSettled(operations);
				const endTime = Date.now();

				return {
					operations: operations.length,
					successful: results.filter((r) => r.status === "fulfilled").length,
					duration: endTime - startTime,
				};
			};

			const memoryResults = await memoryLoadTest();

			// Should handle mixed memory operations efficiently
			expect(memoryResults.successful).toBeGreaterThan(80); // 80% success rate under load
			expect(memoryResults.duration).toBeLessThan(2000); // 2 seconds for 100 operations
		});
	});

	describe("🔴 RED PHASE - Memory Usage and Resource Management (Should FAIL)", () => {
		test("FAILING: should maintain stable memory usage during long operations", async () => {
			// Simulate long-running operation
			const memoryUsageTest = async () => {
				const initialMemory = process.memoryUsage();

				// Perform many operations
				for (let i = 0; i < 100; i++) {
					await cliRunner.run(["status"], {});

					// Check memory every 10 operations
					if (i % 10 === 0) {
						const currentMemory = process.memoryUsage();
						const memoryGrowth =
							currentMemory.heapUsed - initialMemory.heapUsed;

						// Memory growth should be reasonable (less than 50MB)
						expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
					}
				}

				const finalMemory = process.memoryUsage();
				return {
					initial: initialMemory,
					final: finalMemory,
					growth: finalMemory.heapUsed - initialMemory.heapUsed,
				};
			};

			const memoryResults = await memoryUsageTest();

			// Should not have excessive memory growth
			expect(memoryResults.growth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
		});

		test("FAILING: should cleanup resources properly after operations", async () => {
			// Track resource usage
			let connectionCount = 0;
			const fileHandleCount = 0;

			// Mock resource tracking
			const originalPrepare = mockDatabase.prepare;
			mockDatabase.prepare = jest.fn().mockImplementation((...args) => {
				connectionCount++;
				const result = originalPrepare.call(mockDatabase, ...args);

				// Add cleanup tracking
				const originalRun = result.run;
				result.run = jest.fn().mockImplementation((...runArgs) => {
					const runResult = originalRun.call(result, ...runArgs);
					connectionCount--; // Simulate connection release
					return runResult;
				});

				return result;
			});

			// Perform operations that should cleanup after themselves
			await cliRunner.run(["status"], {});
			await cliRunner.run(["memory", "list"], {});
			await cliRunner.run(["metrics"], {});

			// Should have cleaned up connections
			expect(connectionCount).toBeLessThanOrEqual(0);
		});
	});

	describe("🔴 RED PHASE - Optimization and Caching (Should FAIL)", () => {
		test("FAILING: should implement intelligent caching for repeated queries", async () => {
			// First query should hit database
			const firstQuery = await PerformanceTestHelper.measureExecutionTime(
				async () => {
					return await cliRunner.run(["status"], {});
				},
			);

			// Second identical query should be faster due to caching
			const secondQuery = await PerformanceTestHelper.measureExecutionTime(
				async () => {
					return await cliRunner.run(["status"], {});
				},
			);

			// Second query should be significantly faster
			expect(secondQuery.duration).toBeLessThan(firstQuery.duration * 0.5);

			// Should use cached data
			expect(secondQuery.result.output.logs.join("\n")).toContain("(cached)");
		});

		test("FAILING: should batch database operations for efficiency", async () => {
			// Clear database call tracking
			mockDatabase.prepare.mockClear();

			// Perform operation that should batch multiple database calls
			await cliRunner.run(["analyze"], {
				agents: true,
				memory: true,
				consensus: true,
			});

			// Should batch operations rather than individual calls
			const totalDbCalls = mockDatabase.prepare.mock.calls.length;

			// Should use batched queries (fewer than individual operations)
			expect(totalDbCalls).toBeLessThan(10); // Should batch into fewer operations

			// Should use transactions for consistency
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("BEGIN TRANSACTION"),
			);
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("COMMIT"),
			);
		});

		test("FAILING: should implement query optimization for complex operations", async () => {
			// Set up complex query scenario
			mockDatabase.__setData("agents", TestDataGenerator.generateAgents(1000));
			mockDatabase.__setData(
				"metrics",
				TestDataGenerator.generateMetrics(5000),
			);

			const complexQuery = await PerformanceTestHelper.measureExecutionTime(
				async () => {
					return await cliRunner.run(["report"], {
						type: "comprehensive",
						include_metrics: true,
						include_agents: true,
						timeframe: "7d",
					});
				},
			);

			// Should complete complex query efficiently
			expect(complexQuery.duration).toBeLessThan(1000); // Less than 1 second

			// Should use optimized joins and indexing
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringMatching(/JOIN.*ON.*WHERE.*ORDER BY.*LIMIT/),
			);

			// Should create necessary indexes
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("CREATE INDEX IF NOT EXISTS"),
			);
		});
	});

	describe("🔴 RED PHASE - Scalability Testing (Should FAIL)", () => {
		test("FAILING: should scale linearly with data size", async () => {
			const scalabilityTests = [];
			const dataSizes = [100, 500, 1000, 5000];

			for (const size of dataSizes) {
				// Set up database with specific size
				mockDatabase.__setData(
					"agents",
					TestDataGenerator.generateAgents(size),
				);

				const scaleTest = await PerformanceTestHelper.measureExecutionTime(
					async () => {
						return await cliRunner.run(["status"], { format: "summary" });
					},
				);

				scalabilityTests.push({
					dataSize: size,
					duration: scaleTest.duration,
				});
			}

			// Calculate scaling factor
			const small = scalabilityTests[0]; // 100 items
			const large = scalabilityTests[3]; // 5000 items

			const scalingFactor = large.duration / small.duration;
			const dataSizeFactor = large.dataSize / small.dataSize;

			// Should scale better than O(n) - ideally close to O(log n) or O(1) for summary
			expect(scalingFactor).toBeLessThan(dataSizeFactor * 0.5);
		});

		test("FAILING: should handle extreme load gracefully", async () => {
			const extremeLoadTest = async () => {
				// Generate massive dataset
				mockDatabase.__setData(
					"agents",
					TestDataGenerator.generateAgents(10000),
				);
				mockDatabase.__setData(
					"memories",
					TestDataGenerator.generateMemories(50000),
				);
				mockDatabase.__setData(
					"metrics",
					TestDataGenerator.generateMetrics(25000),
				);

				const startTime = Date.now();

				// Perform multiple concurrent operations
				const operations = [
					cliRunner.run(["status"], {}),
					cliRunner.run(["memory", "list"], { limit: 100 }),
					cliRunner.run(["metrics"], { range: "1h" }),
					cliRunner.run(["agents", "list"], {}),
					cliRunner.run(["consensus", "status"], {}),
				];

				const results = await Promise.allSettled(operations);
				const endTime = Date.now();

				return {
					operations: operations.length,
					successful: results.filter((r) => r.status === "fulfilled").length,
					duration: endTime - startTime,
				};
			};

			const extremeResults = await extremeLoadTest();

			// Should handle extreme load without complete failure
			expect(extremeResults.successful).toBeGreaterThan(3); // At least 60% success
			expect(extremeResults.duration).toBeLessThan(10000); // Less than 10 seconds
		});

		test("FAILING: should implement circuit breaker for failing operations", async () => {
			// Simulate failing database operations
			let failureCount = 0;
			mockDatabase.prepare.mockImplementation(() => {
				failureCount++;
				if (failureCount <= 5) {
					throw new Error("Database temporarily unavailable");
				}
				return {
					run: jest.fn(),
					all: jest.fn().mockReturnValue([]),
					get: jest.fn(),
				};
			});

			const circuitBreakerTest = async () => {
				const results = [];

				// Try multiple operations - first few should fail, then circuit should open
				for (let i = 0; i < 10; i++) {
					try {
						const result = await cliRunner.run(["status"], {});
						results.push({ success: true, attempt: i + 1 });
					} catch (error) {
						results.push({
							success: false,
							attempt: i + 1,
							error: error.message,
						});
					}

					// Small delay between attempts
					await new Promise((resolve) => setTimeout(resolve, 10));
				}

				return results;
			};

			const circuitResults = await circuitBreakerTest();

			// Should fail fast after circuit opens
			const laterAttempts = circuitResults.slice(5);
			const fastFailures = laterAttempts.filter(
				(r) =>
					!r.success && r.error && r.error.includes("Circuit breaker open"),
			);

			expect(fastFailures.length).toBeGreaterThan(0);
		});
	});
});
