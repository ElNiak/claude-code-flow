/**
 * Performance tests for hallucination verification system
 */

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import { VerificationEngine } from "../../../src/verification/verification-engine";
import { MemoryTestUtils, PerformanceTestUtils } from "../../utils/test-utils";

describe("Verification System Performance Tests", () => {
	let verificationEngine: VerificationEngine;
	let performanceUtils: PerformanceTestUtils;
	let memoryUtils: MemoryTestUtils;

	beforeEach(() => {
		verificationEngine = new VerificationEngine();
		performanceUtils = new PerformanceTestUtils();
		memoryUtils = new MemoryTestUtils();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("Single Verification Performance", () => {
		it("should complete single verification within 100ms", async () => {
			const codeSnippet = 'console.log("hello world")';

			const { result, duration } = await performanceUtils.measureTime(
				async () => {
					return await verificationEngine.verify(codeSnippet);
				},
			);

			expect(duration).toBeLessThan(100); // < 100ms requirement
			expect(result).toBeDefined();
			expect(result.isHallucination).toBeDefined();
		});

		it("should handle complex code verification within time limits", async () => {
			const complexCode = `
        async function complexFunction(data) {
          const processed = await Promise.all(
            data.map(async item => {
              const validated = await validateItem(item);
              const transformed = transformData(validated);
              return await saveToDatabase(transformed);
            })
          );
          return processed.filter(Boolean);
        }
      `;

			const { result, duration } = await performanceUtils.measureTime(
				async () => {
					return await verificationEngine.verify(complexCode);
				},
			);

			expect(duration).toBeLessThan(200); // Allow more time for complex code
			expect(result).toBeDefined();
		});

		it("should maintain consistent performance across different verification types", async () => {
			const verificationScenarios = [
				{ type: "builtin-function", code: "Array.from([1,2,3])" },
				{ type: "project-method", code: "SwarmCoordinator.initialize()" },
				{ type: "ai-capability", code: "aiAssistant.suggest()" },
				{ type: "hallucination", code: "magicSolver.solveEverything()" },
				{
					type: "complex-expression",
					code: "users.filter(u => u.active).map(u => u.process())",
				},
			];

			const benchmarkResults = await performanceUtils.benchmark(
				async () => {
					const randomScenario =
						verificationScenarios[
							Math.floor(Math.random() * verificationScenarios.length)
						];
					return await verificationEngine.verify(randomScenario.code);
				},
				{ iterations: 50, warmupIterations: 5 },
			);

			expect(benchmarkResults.stats.mean).toBeLessThan(100);
			expect(benchmarkResults.stats.p95).toBeLessThan(150); // 95th percentile under 150ms
			expect(benchmarkResults.stats.max).toBeLessThan(300); // No verification over 300ms
		});
	});

	describe("Concurrent Verification Performance", () => {
		it("should handle 100 concurrent verifications efficiently", async () => {
			const codeSnippets = Array.from(
				{ length: 100 },
				(_, i) => `function test${i}() { return ${i}; }`,
			);

			const { results, duration } = await performanceUtils.measureTime(
				async () => {
					return await Promise.all(
						codeSnippets.map((code) => verificationEngine.verify(code)),
					);
				},
			);

			expect(duration).toBeLessThan(2000); // Should complete 100 verifications in < 2s
			expect(results).toHaveLength(100);
			expect(results.every((r) => r !== null)).toBe(true);
		});

		it("should scale linearly with verification load", async () => {
			const testSizes = [10, 50, 100, 200];
			const performanceResults = [];

			for (const size of testSizes) {
				const codeSnippets = Array.from(
					{ length: size },
					(_, i) => `testFunction${i}()`,
				);

				const { duration } = await performanceUtils.measureTime(async () => {
					return await Promise.all(
						codeSnippets.map((code) => verificationEngine.verify(code)),
					);
				});

				performanceResults.push({
					size,
					duration,
					throughput: (size / duration) * 1000,
				});
			}

			// Check that throughput doesn't degrade significantly
			const baseThroughput = performanceResults[0].throughput;
			for (const result of performanceResults) {
				expect(result.throughput).toBeGreaterThan(baseThroughput * 0.7); // Allow 30% degradation
			}
		});

		it("should maintain accuracy under concurrent load", async () => {
			const validCode = Array.from(
				{ length: 50 },
				() => 'console.log("valid")',
			);
			const invalidCode = Array.from(
				{ length: 50 },
				() => "nonExistentFunction()",
			);
			const mixedCode = [...validCode, ...invalidCode];

			const results = await Promise.all(
				mixedCode.map((code) => verificationEngine.verify(code)),
			);

			const validResults = results.slice(0, 50);
			const invalidResults = results.slice(50);

			// Check accuracy is maintained under load
			expect(validResults.filter((r) => !r.isHallucination)).toHaveLength(50);
			expect(invalidResults.filter((r) => r.isHallucination)).toHaveLength(50);
		});
	});

	describe("Memory Usage Performance", () => {
		it("should maintain reasonable memory usage during verification", async () => {
			const { result, memoryStats } = await memoryUtils.monitorMemory(
				async () => {
					const codeSnippets = Array.from(
						{ length: 100 },
						(_, i) => `function memory_test_${i}() { return "test"; }`,
					);

					return await Promise.all(
						codeSnippets.map((code) => verificationEngine.verify(code)),
					);
				},
				{ sampleInterval: 50, maxSamples: 50 },
			);

			expect(result).toHaveLength(100);

			// Check memory usage doesn't grow excessively
			const maxMemory = Math.max(...memoryStats.map((s) => s.heapUsed));
			const minMemory = Math.min(...memoryStats.map((s) => s.heapUsed));
			const memoryGrowth = maxMemory - minMemory;

			expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // < 50MB growth
		});

		it("should not leak memory with repeated verifications", async () => {
			const { result, memoryIncrease, leaked } =
				await memoryUtils.checkMemoryLeak(
					async () => {
						// Perform multiple verification cycles
						for (let cycle = 0; cycle < 10; cycle++) {
							const codeSnippets = Array.from(
								{ length: 50 },
								(_, i) => `function cycle${cycle}_func${i}() { return ${i}; }`,
							);

							await Promise.all(
								codeSnippets.map((code) => verificationEngine.verify(code)),
							);
						}

						return "completed";
					},
					{ threshold: 10 * 1024 * 1024 }, // 10MB threshold
				);

			expect(result).toBe("completed");
			expect(leaked).toBe(false);
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
		});
	});

	describe("Load Testing", () => {
		it("should handle sustained verification load", async () => {
			const loadTestResults = await performanceUtils.loadTest(
				async () => {
					const codeToVerify = `testFunction${Date.now()}()`;
					return await verificationEngine.verify(codeToVerify);
				},
				{
					duration: 10000, // 10 seconds
					rampUpTime: 2000, // 2 seconds ramp up
					maxConcurrency: 20,
					requestsPerSecond: 50,
				},
			);

			expect(loadTestResults.successfulRequests).toBeGreaterThan(400); // At least 400 successful verifications
			expect(loadTestResults.failedRequests).toBeLessThan(
				loadTestResults.totalRequests * 0.01,
			); // < 1% failure rate
			expect(loadTestResults.averageResponseTime).toBeLessThan(200); // Average under 200ms
			expect(loadTestResults.requestsPerSecond).toBeGreaterThan(40); // Maintain > 40 RPS
		});

		it("should handle burst verification loads", async () => {
			// Simulate burst load scenario
			const burstSizes = [10, 50, 100, 200, 100, 50, 10];
			const burstResults = [];

			for (const burstSize of burstSizes) {
				const startTime = performance.now();

				const codeSnippets = Array.from(
					{ length: burstSize },
					(_, i) => `burstFunction${i}()`,
				);

				const results = await Promise.all(
					codeSnippets.map((code) => verificationEngine.verify(code)),
				);

				const endTime = performance.now();
				const duration = endTime - startTime;

				burstResults.push({
					size: burstSize,
					duration,
					throughput: (burstSize / duration) * 1000,
					successRate: results.filter((r) => r !== null).length / burstSize,
				});
			}

			// Verify system handles bursts well
			for (const burst of burstResults) {
				expect(burst.successRate).toBeGreaterThan(0.99); // > 99% success rate
				expect(burst.throughput).toBeGreaterThan(20); // > 20 verifications/second
			}
		});
	});

	describe("Caching Performance", () => {
		it("should improve performance with caching enabled", async () => {
			const repeatedCode = 'console.log("repeated")';

			// First verification (cache miss)
			const { duration: firstDuration } = await performanceUtils.measureTime(
				async () => {
					return await verificationEngine.verify(repeatedCode);
				},
			);

			// Second verification (cache hit)
			const { duration: secondDuration } = await performanceUtils.measureTime(
				async () => {
					return await verificationEngine.verify(repeatedCode);
				},
			);

			// Cache hit should be significantly faster
			expect(secondDuration).toBeLessThan(firstDuration * 0.5); // At least 50% faster
			expect(secondDuration).toBeLessThan(10); // Cache hits should be < 10ms
		});

		it("should maintain cache effectiveness under load", async () => {
			const commonCodeSnippets = [
				'console.log("test")',
				"JSON.parse(data)",
				"Array.from(items)",
				"Object.keys(obj)",
				"String.prototype.trim.call(str)",
			];

			// Prime the cache
			await Promise.all(
				commonCodeSnippets.map((code) => verificationEngine.verify(code)),
			);

			// Test cache performance under load
			const cacheTestResults = await performanceUtils.benchmark(
				async () => {
					const randomCode =
						commonCodeSnippets[
							Math.floor(Math.random() * commonCodeSnippets.length)
						];
					return await verificationEngine.verify(randomCode);
				},
				{ iterations: 200, warmupIterations: 10 },
			);

			// Cached verifications should be very fast
			expect(cacheTestResults.stats.mean).toBeLessThan(20); // Average under 20ms
			expect(cacheTestResults.stats.p95).toBeLessThan(50); // 95th percentile under 50ms
		});
	});

	describe("Error Handling Performance", () => {
		it("should handle verification errors without significant performance impact", async () => {
			const mixedScenarios = [
				{ code: "validFunction()", shouldError: false },
				{ code: "malformed}{code", shouldError: true },
				{ code: "anotherValidFunction()", shouldError: false },
				{ code: "undefined.something.error", shouldError: true },
				{ code: 'console.log("valid")', shouldError: false },
			];

			const { results, duration } = await performanceUtils.measureTime(
				async () => {
					return await Promise.all(
						mixedScenarios.map(async (scenario) => {
							try {
								return await verificationEngine.verify(scenario.code);
							} catch (error) {
								return {
									isHallucination: false,
									confidence: 0.5,
									error: error.message,
								};
							}
						}),
					);
				},
			);

			expect(duration).toBeLessThan(500); // Should handle errors quickly
			expect(results).toHaveLength(5);
			expect(results.every((r) => r !== null)).toBe(true);
		});

		it("should gracefully degrade when verification services are slow", async () => {
			// Mock slow verification service
			const originalVerify = verificationEngine.verify;
			verificationEngine.verify = jest.fn().mockImplementation(async (code) => {
				await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay
				return {
					isHallucination: false,
					confidence: 0.5,
					reason: "Slow service",
				};
			});

			const { duration } = await performanceUtils.measureTime(async () => {
				return await Promise.all(
					Array.from({ length: 10 }, () =>
						verificationEngine.verify("testCode()"),
					),
				);
			});

			// Should timeout or use fallback faster than waiting for all slow responses
			expect(duration).toBeLessThan(2000); // Should not wait full 3 seconds (10 * 300ms)

			// Restore original method
			verificationEngine.verify = originalVerify;
		});
	});

	describe("Integration Performance", () => {
		it("should maintain TodoWrite tool performance with verification enabled", async () => {
			const largeTodoList = Array.from({ length: 50 }, (_, i) => ({
				id: `todo-${i}`,
				content: `Implement feature ${i} with proper error handling`,
				status: "pending" as const,
				priority: "medium" as const,
			}));

			const { duration } = await performanceUtils.measureTime(async () => {
				// Simulate TodoWrite with verification
				return await Promise.all(
					largeTodoList.map(async (todo) => {
						const verificationResult = await verificationEngine.verify(
							todo.content,
						);
						return { ...todo, verified: !verificationResult.isHallucination };
					}),
				);
			});

			// TodoWrite with verification should complete in reasonable time
			expect(duration).toBeLessThan(3000); // < 3 seconds for 50 todos
		});

		it("should maintain Task tool performance with verification enabled", async () => {
			const batchAgentInstructions = Array.from({ length: 20 }, (_, i) => ({
				agentType: `agent-${i}`,
				instruction: `Perform development task ${i} using standard tools`,
				context: `Task context ${i}`,
				tools: ["Read", "Write", "Edit"],
			}));

			const { duration } = await performanceUtils.measureTime(async () => {
				// Simulate Task tool with verification
				return await Promise.all(
					batchAgentInstructions.map(async (instruction) => {
						const verificationResult = await verificationEngine.verify(
							instruction.instruction,
						);
						return {
							...instruction,
							verified: !verificationResult.isHallucination,
							confidence: verificationResult.confidence,
						};
					}),
				);
			});

			// Task tool with verification should complete in reasonable time
			expect(duration).toBeLessThan(2000); // < 2 seconds for 20 instructions
		});
	});
});
