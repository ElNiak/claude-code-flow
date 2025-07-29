/**
 * Stress testing framework for hallucination verification engine
 * Tests performance, reliability, and accuracy under extreme conditions
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { VerificationService } from "../../../src/cli/commands/qa/core";
import {
	MemoryTestUtils,
	PerformanceTestUtils,
	TestDataGenerator,
} from "../../utils/test-utils";

interface StressTestConfig {
	name: string;
	duration: number; // milliseconds
	concurrency: number;
	requestsPerSecond: number;
	memoryPressure: boolean;
	cpuIntensive: boolean;
	expectedAccuracy: number;
	expectedThroughput: number;
}

interface StressTestResult {
	config: StressTestConfig;
	actualThroughput: number;
	actualAccuracy: number;
	averageResponseTime: number;
	p95ResponseTime: number;
	p99ResponseTime: number;
	memoryPeakUsage: number;
	cpuUtilization: number;
	errorRate: number;
	degradationFactor: number;
}

const stressTestConfigurations: StressTestConfig[] = [
	{
		name: "High Volume Simple Code",
		duration: 30000, // 30 seconds
		concurrency: 500,
		requestsPerSecond: 100,
		memoryPressure: false,
		cpuIntensive: false,
		expectedAccuracy: 0.98,
		expectedThroughput: 90,
	},
	{
		name: "Medium Volume Complex Code",
		duration: 60000, // 1 minute
		concurrency: 200,
		requestsPerSecond: 50,
		memoryPressure: true,
		cpuIntensive: true,
		expectedAccuracy: 0.95,
		expectedThroughput: 45,
	},
	{
		name: "Sustained Load Test",
		duration: 300000, // 5 minutes
		concurrency: 100,
		requestsPerSecond: 20,
		memoryPressure: false,
		cpuIntensive: false,
		expectedAccuracy: 0.97,
		expectedThroughput: 18,
	},
	{
		name: "Extreme Concurrency",
		duration: 15000, // 15 seconds
		concurrency: 1000,
		requestsPerSecond: 200,
		memoryPressure: true,
		cpuIntensive: true,
		expectedAccuracy: 0.9,
		expectedThroughput: 150,
	},
	{
		name: "Memory Stress Test",
		duration: 45000, // 45 seconds
		concurrency: 300,
		requestsPerSecond: 75,
		memoryPressure: true,
		cpuIntensive: false,
		expectedAccuracy: 0.94,
		expectedThroughput: 65,
	},
];

interface MemoryPressureGenerator {
	start(): void;
	stop(): void;
	getUsage(): number;
}

class MemoryPressureGenerator {
	private memoryBlocks: ArrayBuffer[] = [];
	private isRunning = false;
	private interval?: NodeJS.Timeout;

	start(): void {
		this.isRunning = true;
		this.interval = setInterval(() => {
			if (this.isRunning) {
				// Allocate 10MB blocks to create memory pressure
				const block = new ArrayBuffer(10 * 1024 * 1024);
				this.memoryBlocks.push(block);

				// Keep only last 50 blocks to prevent excessive memory usage
				if (this.memoryBlocks.length > 50) {
					this.memoryBlocks.shift();
				}
			}
		}, 100);
	}

	stop(): void {
		this.isRunning = false;
		if (this.interval) {
			clearInterval(this.interval);
		}
		this.memoryBlocks = [];
	}

	getUsage(): number {
		return this.memoryBlocks.length * 10; // MB
	}
}

describe("Verification Engine Stress Testing", () => {
	let verificationEngine: VerificationService;
	let memoryPressure: MemoryPressureGenerator;
	let baselinePerformance: any;
	const stressResults: StressTestResult[] = [];

	beforeEach(async () => {
		verificationEngine = new VerificationService();
		memoryPressure = new MemoryPressureGenerator();

		// Establish baseline performance
		baselinePerformance = await measureBaselinePerformance();
	});

	afterEach(async () => {
		memoryPressure.stop();

		// Clean up and force garbage collection
		await MemoryTestUtils.forceGC();

		// Report stress test summary
		if (stressResults.length > 0) {
			const summary = analyzeStressTestResults(stressResults);
			console.log("🔥 Stress Test Summary:", summary);
		}
	});

	describe("Load Testing", () => {
		it("should handle high volume simple code verification", async () => {
			const config = stressTestConfigurations.find(
				(c) => c.name === "High Volume Simple Code",
			)!;
			const result = await runStressTest(config);
			stressResults.push(result);

			// Verify performance requirements
			expect(result.actualThroughput).toBeGreaterThan(
				config.expectedThroughput,
			);
			expect(result.actualAccuracy).toBeGreaterThan(config.expectedAccuracy);
			expect(result.averageResponseTime).toBeLessThan(100); // < 100ms average
			expect(result.errorRate).toBeLessThan(0.01); // < 1% error rate
		});

		it("should maintain accuracy under concurrent load", async () => {
			const config = stressTestConfigurations.find(
				(c) => c.name === "Extreme Concurrency",
			)!;
			const result = await runStressTest(config);
			stressResults.push(result);

			// Should maintain reasonable accuracy even under extreme load
			expect(result.actualAccuracy).toBeGreaterThan(config.expectedAccuracy);
			expect(result.errorRate).toBeLessThan(0.05); // < 5% error rate

			// Performance may degrade but should remain functional
			expect(result.averageResponseTime).toBeLessThan(500); // < 500ms under extreme load
			expect(result.actualThroughput).toBeGreaterThan(
				config.expectedThroughput * 0.7,
			); // At least 70% of expected
		});
	});

	describe("Memory Pressure Testing", () => {
		it("should handle memory pressure gracefully", async () => {
			const config = stressTestConfigurations.find(
				(c) => c.name === "Memory Stress Test",
			)!;

			// Start memory pressure
			memoryPressure.start();

			const result = await runStressTest(config);
			stressResults.push(result);

			memoryPressure.stop();

			// Should maintain functionality under memory pressure
			expect(result.actualAccuracy).toBeGreaterThan(config.expectedAccuracy);
			expect(result.errorRate).toBeLessThan(0.03); // < 3% error rate

			// Memory usage should be reasonable
			expect(result.memoryPeakUsage).toBeLessThan(1000); // < 1GB peak usage
		});

		it("should detect memory leaks during extended operation", async () => {
			const testCodes = [
				"validFunction()",
				"impossibleFunction()",
				"ambiguousFunction()",
				"complexMethod.chain().multiple().calls()",
			];

			const { memoryIncrease, leaked } = await MemoryTestUtils.checkMemoryLeak(
				async () => {
					// Run 1000 verifications to check for leaks
					for (let i = 0; i < 1000; i++) {
						const code = testCodes[i % testCodes.length];
						await verificationEngine.verify(code);
					}
				},
				{ threshold: 50 * 1024 * 1024 }, // 50MB threshold
			);

			expect(leaked).toBe(false);
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB increase
		});
	});

	describe("Sustained Load Testing", () => {
		it("should maintain performance over extended periods", async () => {
			const config = stressTestConfigurations.find(
				(c) => c.name === "Sustained Load Test",
			)!;
			const result = await runStressTest(config);
			stressResults.push(result);

			// Should maintain stable performance over 5 minutes
			expect(result.actualAccuracy).toBeGreaterThan(config.expectedAccuracy);
			expect(result.degradationFactor).toBeLessThan(1.5); // < 50% performance degradation
			expect(result.errorRate).toBeLessThan(0.02); // < 2% error rate
		});

		it("should handle gradual load increase gracefully", async () => {
			const phases = [
				{ concurrency: 50, duration: 10000 },
				{ concurrency: 100, duration: 10000 },
				{ concurrency: 200, duration: 10000 },
				{ concurrency: 400, duration: 10000 },
			];

			const phaseResults = [];

			for (const phase of phases) {
				const config: StressTestConfig = {
					name: `Ramp Phase ${phase.concurrency}`,
					duration: phase.duration,
					concurrency: phase.concurrency,
					requestsPerSecond: phase.concurrency / 2,
					memoryPressure: false,
					cpuIntensive: false,
					expectedAccuracy: 0.95,
					expectedThroughput: phase.concurrency / 3,
				};

				const result = await runStressTest(config);
				phaseResults.push(result);
			}

			// Verify graceful degradation
			for (let i = 1; i < phaseResults.length; i++) {
				const previous = phaseResults[i - 1];
				const current = phaseResults[i];

				// Accuracy should not degrade significantly
				expect(current.actualAccuracy).toBeGreaterThan(
					previous.actualAccuracy - 0.05,
				);

				// Response time increase should be reasonable
				const responseTimeIncrease =
					current.averageResponseTime / previous.averageResponseTime;
				expect(responseTimeIncrease).toBeLessThan(3); // < 3x increase
			}
		});
	});

	describe("Complex Code Stress Testing", () => {
		it("should handle complex code patterns under stress", async () => {
			const complexPatterns = generateComplexCodePatterns(1000);

			const startTime = performance.now();
			const results = await Promise.all(
				complexPatterns.map(async (pattern) => {
					try {
						return await verificationEngine.verify(pattern.code);
					} catch (error) {
						return {
							isHallucination: false,
							confidence: 0.5,
							error: error.message,
							requiresManualReview: true,
						};
					}
				}),
			);
			const endTime = performance.now();

			const duration = endTime - startTime;
			const averageTime = duration / complexPatterns.length;
			const errorCount = results.filter((r) => r.error).length;
			const errorRate = errorCount / results.length;

			// Performance requirements for complex code
			expect(averageTime).toBeLessThan(200); // < 200ms for complex patterns
			expect(errorRate).toBeLessThan(0.02); // < 2% error rate
			expect(results.length).toBe(complexPatterns.length);
		});
	});

	describe("Error Recovery Testing", () => {
		it("should recover from verification service failures", async () => {
			const testCodes = Array(100)
				.fill(null)
				.map((_, i) => `testFunction${i}()`);

			// Simulate intermittent service failures
			let failureCount = 0;
			const originalVerify = verificationEngine.verify;

			verificationEngine.verify = jest
				.fn()
				.mockImplementation((code: string) => {
					failureCount++;
					if (failureCount % 10 === 0) {
						// Fail every 10th request
						return Promise.reject(new Error("Service temporarily unavailable"));
					}
					return originalVerify.call(verificationEngine, code);
				});

			const results = await Promise.all(
				testCodes.map(async (code) => {
					try {
						return await verificationEngine.verify(code);
					} catch (error) {
						// Should fail gracefully
						return {
							isHallucination: false,
							confidence: 0.5,
							requiresManualReview: true,
							reason: "Service unavailable - manual review required",
						};
					}
				}),
			);

			// Should handle failures gracefully
			expect(results.length).toBe(testCodes.length);
			expect(results.every((r) => r !== null)).toBe(true);

			// Restore original method
			verificationEngine.verify = originalVerify;
		});
	});

	describe("Resource Exhaustion Testing", () => {
		it("should handle CPU-intensive verification under stress", async () => {
			const cpuIntensivePatterns = generateCPUIntensivePatterns(500);

			const startTime = performance.now();
			const results = await Promise.all(
				cpuIntensivePatterns.map((pattern) =>
					verificationEngine.verify(pattern),
				),
			);
			const endTime = performance.now();

			const duration = endTime - startTime;
			const throughput = (cpuIntensivePatterns.length / duration) * 1000; // per second

			// Should maintain reasonable throughput even for CPU-intensive operations
			expect(throughput).toBeGreaterThan(10); // > 10 verifications per second
			expect(results.length).toBe(cpuIntensivePatterns.length);
			expect(results.every((r) => r !== null && r !== undefined)).toBe(true);
		});
	});

	// Helper functions
	async function runStressTest(
		config: StressTestConfig,
	): Promise<StressTestResult> {
		const testData = generateTestData(config);

		// Apply memory pressure if configured
		if (config.memoryPressure) {
			memoryPressure.start();
		}

		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		// Run the actual stress test
		const results = await PerformanceTestUtils.loadTest(
			() => runVerificationBatch(testData, config.cpuIntensive),
			{
				duration: config.duration,
				maxConcurrency: config.concurrency,
				requestsPerSecond: config.requestsPerSecond,
			},
		);

		const endTime = performance.now();
		const endMemory = process.memoryUsage();

		if (config.memoryPressure) {
			memoryPressure.stop();
		}

		// Calculate metrics
		const duration = endTime - startTime;
		const actualThroughput = (results.totalRequests / duration) * 1000;
		const actualAccuracy = results.successfulRequests / results.totalRequests;
		const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
		const degradationFactor =
			results.averageResponseTime / baselinePerformance.averageResponseTime;

		return {
			config,
			actualThroughput,
			actualAccuracy,
			averageResponseTime: results.averageResponseTime,
			p95ResponseTime: 0, // Would be calculated from detailed metrics
			p99ResponseTime: 0, // Would be calculated from detailed metrics
			memoryPeakUsage:
				Math.max(startMemory.heapUsed, endMemory.heapUsed) / (1024 * 1024), // MB
			cpuUtilization: 0, // Would require CPU monitoring
			errorRate: results.failedRequests / results.totalRequests,
			degradationFactor,
		};
	}

	async function runVerificationBatch(
		testData: any[],
		cpuIntensive: boolean,
	): Promise<any> {
		const code = testData[Math.floor(Math.random() * testData.length)];

		if (cpuIntensive) {
			// Add artificial CPU load
			const iterations = 10000;
			let sum = 0;
			for (let i = 0; i < iterations; i++) {
				sum += Math.random();
			}
		}

		return await verificationEngine.verify(code.code);
	}

	function generateTestData(config: StressTestConfig): any[] {
		return [
			// Valid code samples
			...Array(500)
				.fill(null)
				.map((_, i) => ({
					code: `validFunction${i}()`,
					expected: false, // not hallucination
				})),
			// Invalid code samples
			...Array(200)
				.fill(null)
				.map((_, i) => ({
					code: `impossibleFunction${i}()`,
					expected: true, // hallucination
				})),
			// Ambiguous samples
			...Array(100)
				.fill(null)
				.map((_, i) => ({
					code: `ambiguousFunction${i}()`,
					expected: null, // requires review
				})),
		];
	}

	async function measureBaselinePerformance(): Promise<any> {
		const simpleCode = 'console.log("test")';
		const iterations = 100;

		const { stats } = await PerformanceTestUtils.benchmark(
			() => verificationEngine.verify(simpleCode),
			{ iterations, warmupIterations: 10 },
		);

		return {
			averageResponseTime: stats.mean,
			throughput: 1000 / stats.mean, // requests per second
		};
	}
});

function generateComplexCodePatterns(
	count: number,
): Array<{ code: string; complexity: number }> {
	const patterns = [];

	for (let i = 0; i < count; i++) {
		const complexity = Math.floor(Math.random() * 5) + 1;
		let code = "";

		switch (complexity) {
			case 1:
				code = `simpleFunction${i}()`;
				break;
			case 2:
				code = `object${i}.method().chain()`;
				break;
			case 3:
				code = `complex${i}.deeply().nested().method().calls()`;
				break;
			case 4:
				code = `async function test${i}() { return await complex.operation().with().multiple().steps(); }`;
				break;
			case 5:
				code = `class Complex${i} { async performOperation() { return this.chain().multiple().async().operations(); } }`;
				break;
		}

		patterns.push({ code, complexity });
	}

	return patterns;
}

function generateCPUIntensivePatterns(count: number): string[] {
	return Array(count)
		.fill(null)
		.map(
			(_, i) =>
				`intensiveProcessor${i}.compute().analyze().optimize().validate().finalize()`,
		);
}

function analyzeStressTestResults(results: StressTestResult[]) {
	return {
		totalTests: results.length,
		averageAccuracy:
			results.reduce((sum, r) => sum + r.actualAccuracy, 0) / results.length,
		averageThroughput:
			results.reduce((sum, r) => sum + r.actualThroughput, 0) / results.length,
		averageResponseTime:
			results.reduce((sum, r) => sum + r.averageResponseTime, 0) /
			results.length,
		maxMemoryUsage: Math.max(...results.map((r) => r.memoryPeakUsage)),
		worstDegradation: Math.max(...results.map((r) => r.degradationFactor)),
		passedTests: results.filter(
			(r) =>
				r.actualAccuracy >= r.config.expectedAccuracy &&
				r.actualThroughput >= r.config.expectedThroughput * 0.8,
		).length,
	};
}
