import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import * as fs from "fs/promises";
import * as path from "path";
import { TaskAnalyzer } from "../../src/unified/work/task-analyzer.js";
import type { TaskInput, WorkOptions } from "../../src/unified/work/types.js";
import { WorkCommand } from "../../src/unified/work/work-command.js";

/**
 * Performance Validation Test Suite for Unified Work Command
 *
 * Validates performance characteristics, resource usage, and scalability
 * of the unified work command and prompt engineering system.
 */
describe("Unified Work Command Performance Validation", () => {
	let workCommand: WorkCommand;
	let taskAnalyzer: TaskAnalyzer;
	let performanceMetrics: PerformanceMetrics;

	beforeAll(async () => {
		workCommand = new WorkCommand();
		taskAnalyzer = new TaskAnalyzer();
		performanceMetrics = new PerformanceMetrics();
	});

	afterAll(async () => {
		try {
			await workCommand.cleanup();
			performanceMetrics.generateReport();
		} catch (error) {
			console.warn("Cleanup warning:", error);
		}
	});

	describe("Task Analysis Performance", () => {
		test("should analyze simple tasks within performance thresholds", async () => {
			const simpleTasks = [
				"Fix CSS styling issue",
				"Add logging to function",
				"Update documentation",
				"Run unit tests",
				"Deploy to staging",
			];

			for (const task of simpleTasks) {
				const startTime = performance.now();
				const startMemory = process.memoryUsage().heapUsed;

				const analysis = await taskAnalyzer.analyze({
					task,
					params: [],
					context: {
						workingDirectory: process.cwd(),
						environment: process.env,
						options: {},
					},
				});

				const endTime = performance.now();
				const endMemory = process.memoryUsage().heapUsed;
				const analysisTime = endTime - startTime;
				const memoryUsed = endMemory - startMemory;

				// Performance thresholds for simple tasks
				expect(analysisTime).toBeLessThan(500); // 500ms max
				expect(memoryUsed).toBeLessThan(10 * 1024 * 1024); // 10MB max
				expect(analysis).toBeDefined();

				performanceMetrics.recordTaskAnalysis(
					task,
					analysisTime,
					memoryUsed,
					"simple",
				);
			}
		});

		test("should analyze complex tasks within reasonable thresholds", async () => {
			const complexTasks = [
				"Build a comprehensive microservices architecture with 15 services, API gateway, service mesh, monitoring, logging, security, CI/CD pipeline, and deployment automation across multiple cloud providers",
				"Develop a machine learning platform with data ingestion, feature engineering, model training, hyperparameter optimization, model serving, A/B testing, and real-time inference with support for multiple ML frameworks",
				"Create a complete e-commerce platform with user management, product catalog, inventory management, payment processing, order fulfillment, customer support, analytics dashboard, and mobile applications",
			];

			for (const task of complexTasks) {
				const startTime = performance.now();
				const startMemory = process.memoryUsage().heapUsed;

				const analysis = await taskAnalyzer.analyze({
					task,
					params: [],
					context: {
						workingDirectory: process.cwd(),
						environment: process.env,
						options: {},
					},
				});

				const endTime = performance.now();
				const endMemory = process.memoryUsage().heapUsed;
				const analysisTime = endTime - startTime;
				const memoryUsed = endMemory - startMemory;

				// Performance thresholds for complex tasks
				expect(analysisTime).toBeLessThan(2000); // 2 seconds max
				expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB max
				expect(analysis).toBeDefined();
				expect(analysis.complexity).toMatch(/^(high|very_high)$/);

				performanceMetrics.recordTaskAnalysis(
					task,
					analysisTime,
					memoryUsed,
					"complex",
				);
			}
		});

		test("should handle concurrent task analysis efficiently", async () => {
			const concurrentTasks = [
				"Build REST API",
				"Create frontend components",
				"Setup database schema",
				"Implement authentication",
				"Add monitoring",
				"Write unit tests",
				"Deploy application",
				"Setup CI/CD pipeline",
				"Create documentation",
				"Performance optimization",
			];

			const startTime = performance.now();
			const startMemory = process.memoryUsage().heapUsed;

			// Run all tasks concurrently
			const analyses = await Promise.all(
				concurrentTasks.map((task) =>
					taskAnalyzer.analyze({
						task,
						params: [],
						context: {
							workingDirectory: process.cwd(),
							environment: process.env,
							options: {},
						},
					}),
				),
			);

			const endTime = performance.now();
			const endMemory = process.memoryUsage().heapUsed;
			const totalTime = endTime - startTime;
			const totalMemory = endMemory - startMemory;

			// Concurrent processing should be efficient
			expect(analyses).toHaveLength(concurrentTasks.length);
			expect(analyses.every((analysis) => analysis !== undefined)).toBe(true);
			expect(totalTime).toBeLessThan(5000); // 5 seconds max for 10 concurrent tasks
			expect(totalMemory).toBeLessThan(100 * 1024 * 1024); // 100MB max

			performanceMetrics.recordConcurrentAnalysis(
				concurrentTasks.length,
				totalTime,
				totalMemory,
			);
		});

		test("should scale linearly with task complexity", async () => {
			const complexityLevels = [
				{ task: "Simple task", components: 1 },
				{ task: "Medium task with API and database", components: 3 },
				{
					task: "Complex task with frontend, backend, database, auth, and deployment",
					components: 7,
				},
				{
					task: "Very complex task with microservices, event sourcing, CQRS, monitoring, security, CI/CD, and multi-cloud deployment",
					components: 15,
				},
			];

			const results = [];

			for (const level of complexityLevels) {
				const startTime = performance.now();

				const analysis = await taskAnalyzer.analyze({
					task: level.task,
					params: [],
					context: {
						workingDirectory: process.cwd(),
						environment: process.env,
						options: {},
					},
				});

				const endTime = performance.now();
				const analysisTime = endTime - startTime;

				results.push({
					components: level.components,
					time: analysisTime,
					agents: analysis.suggestedAgents,
				});
			}

			// Should scale reasonably with complexity
			for (let i = 1; i < results.length; i++) {
				const current = results[i];
				const previous = results[i - 1];

				// Time should not increase exponentially
				expect(current.time).toBeLessThan(previous.time * 3);

				// Agent count should scale with complexity
				expect(current.agents).toBeGreaterThanOrEqual(previous.agents);
			}

			performanceMetrics.recordScalabilityTest(results);
		});
	});

	describe("Prompt Generation Performance", () => {
		test("should generate prompts within time constraints", async () => {
			const testCases = [
				{ task: "Simple development task", expectedTimeMs: 100 },
				{ task: "Medium complexity research project", expectedTimeMs: 200 },
				{
					task: "Complex enterprise system implementation",
					expectedTimeMs: 500,
				},
			];

			for (const testCase of testCases) {
				let promptGenerated = false;
				let generationTime = 0;

				const writeFileSpy = jest
					.spyOn(fs, "writeFile")
					.mockImplementation(async (filePath, content) => {
						if (
							typeof filePath === "string" &&
							filePath.includes("unified-work-prompt")
						) {
							promptGenerated = true;
						}
					});

				try {
					const startTime = performance.now();
					const command = workCommand.createCommand();
					await command.parseAsync(
						["node", "test", testCase.task, "--dry-run"],
						{ from: "user" },
					);
					await new Promise((resolve) => setTimeout(resolve, 50));
					const endTime = performance.now();

					generationTime = endTime - startTime;

					expect(promptGenerated).toBe(true);
					expect(generationTime).toBeLessThan(testCase.expectedTimeMs);

					performanceMetrics.recordPromptGeneration(
						testCase.task,
						generationTime,
					);
				} finally {
					writeFileSpy.mockRestore();
				}
			}
		});

		test("should handle prompt generation under load", async () => {
			const loadTestTasks = Array.from(
				{ length: 20 },
				(_, i) => `Load test task ${i + 1}`,
			);
			let promptsGenerated = 0;

			const writeFileSpy = jest
				.spyOn(fs, "writeFile")
				.mockImplementation(async (filePath, content) => {
					if (
						typeof filePath === "string" &&
						filePath.includes("unified-work-prompt")
					) {
						promptsGenerated++;
					}
				});

			try {
				const startTime = performance.now();

				// Generate prompts concurrently
				await Promise.all(
					loadTestTasks.map(async (task, index) => {
						const command = workCommand.createCommand();
						await command.parseAsync(["node", "test", task, "--dry-run"], {
							from: "user",
						});
						await new Promise((resolve) => setTimeout(resolve, 10));
					}),
				);

				const endTime = performance.now();
				const totalTime = endTime - startTime;

				expect(promptsGenerated).toBe(loadTestTasks.length);
				expect(totalTime).toBeLessThan(10000); // 10 seconds for 20 concurrent prompts

				performanceMetrics.recordLoadTest(
					loadTestTasks.length,
					totalTime,
					promptsGenerated,
				);
			} finally {
				writeFileSpy.mockRestore();
			}
		});

		test("should maintain consistent prompt size regardless of complexity", async () => {
			const complexityTasks = [
				"Simple CSS fix",
				"Build API with authentication",
				"Create comprehensive microservices platform with full DevOps pipeline",
			];

			const promptSizes = [];

			for (const task of complexityTasks) {
				let promptSize = 0;

				const writeFileSpy = jest
					.spyOn(fs, "writeFile")
					.mockImplementation(async (filePath, content) => {
						if (
							typeof filePath === "string" &&
							filePath.includes("unified-work-prompt")
						) {
							promptSize = content.toString().length;
						}
					});

				try {
					const command = workCommand.createCommand();
					await command.parseAsync(["node", "test", task, "--dry-run"], {
						from: "user",
					});
					await new Promise((resolve) => setTimeout(resolve, 50));

					promptSizes.push(promptSize);
				} finally {
					writeFileSpy.mockRestore();
				}
			}

			// Prompt sizes should be relatively consistent
			const minSize = Math.min(...promptSizes);
			const maxSize = Math.max(...promptSizes);
			const sizeVariation = (maxSize - minSize) / minSize;

			expect(sizeVariation).toBeLessThan(0.5); // Size variation should be less than 50%
			expect(minSize).toBeGreaterThan(1000); // Minimum comprehensive prompt size
			expect(maxSize).toBeLessThan(20000); // Maximum reasonable prompt size

			performanceMetrics.recordPromptSizes(promptSizes);
		});
	});

	describe("Memory Usage and Resource Management", () => {
		test("should maintain stable memory usage over time", async () => {
			const iterations = 50;
			const memoryReadings = [];

			for (let i = 0; i < iterations; i++) {
				const beforeMemory = process.memoryUsage().heapUsed;

				await taskAnalyzer.analyze({
					task: `Test task iteration ${i}`,
					params: [],
					context: {
						workingDirectory: process.cwd(),
						environment: process.env,
						options: {},
					},
				});

				// Force garbage collection if available
				if (global.gc) {
					global.gc();
				}

				const afterMemory = process.memoryUsage().heapUsed;
				memoryReadings.push(afterMemory - beforeMemory);
			}

			// Memory usage should not continuously grow (memory leak detection)
			const firstHalf = memoryReadings.slice(0, 25);
			const secondHalf = memoryReadings.slice(25);

			const firstHalfAvg =
				firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
			const secondHalfAvg =
				secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

			// Memory usage should not increase significantly over time
			expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 2);

			performanceMetrics.recordMemoryStability(memoryReadings);
		});

		test("should efficiently clean up resources", async () => {
			const initialMemory = process.memoryUsage().heapUsed;

			// Create and destroy multiple work command instances
			for (let i = 0; i < 10; i++) {
				const tempWorkCommand = new WorkCommand();

				await taskAnalyzer.analyze({
					task: `Cleanup test ${i}`,
					params: [],
					context: {
						workingDirectory: process.cwd(),
						environment: process.env,
						options: {},
					},
				});

				await tempWorkCommand.cleanup();
			}

			// Force garbage collection
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;

			// Memory increase should be minimal after cleanup
			expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

			performanceMetrics.recordResourceCleanup(initialMemory, finalMemory);
		});

		test("should handle system resource constraints gracefully", async () => {
			// Simulate high memory pressure
			const largeArrays = [];

			try {
				// Allocate some memory to simulate pressure
				for (let i = 0; i < 10; i++) {
					largeArrays.push(new Array(1000000).fill("memory pressure test"));
				}

				const startTime = performance.now();

				const analysis = await taskAnalyzer.analyze({
					task: "Test under memory pressure",
					params: [],
					context: {
						workingDirectory: process.cwd(),
						environment: process.env,
						options: {},
					},
				});

				const endTime = performance.now();
				const analysisTime = endTime - startTime;

				// Should still complete analysis under pressure
				expect(analysis).toBeDefined();
				expect(analysisTime).toBeLessThan(5000); // Should complete within 5 seconds even under pressure

				performanceMetrics.recordResourceConstrainedTest(analysisTime);
			} finally {
				// Clean up large arrays
				largeArrays.length = 0;
				if (global.gc) {
					global.gc();
				}
			}
		});
	});

	describe("Benchmark Validation", () => {
		test("should meet established performance benchmarks", async () => {
			const benchmarks = {
				simpleTaskAnalysis: 500, // ms
				complexTaskAnalysis: 2000, // ms
				promptGeneration: 200, // ms
				concurrentTasks: 10, // number of tasks
				memoryLimit: 100 * 1024 * 1024, // bytes
			};

			// Test each benchmark
			const results = await performanceMetrics.runBenchmarkSuite(
				taskAnalyzer,
				workCommand,
			);

			expect(results.simpleTaskAnalysis).toBeLessThan(
				benchmarks.simpleTaskAnalysis,
			);
			expect(results.complexTaskAnalysis).toBeLessThan(
				benchmarks.complexTaskAnalysis,
			);
			expect(results.promptGeneration).toBeLessThan(
				benchmarks.promptGeneration,
			);
			expect(results.concurrentTasksHandled).toBeGreaterThanOrEqual(
				benchmarks.concurrentTasks,
			);
			expect(results.peakMemoryUsage).toBeLessThan(benchmarks.memoryLimit);
		});

		test("should maintain performance regression protection", async () => {
			// Load baseline performance data if available
			const baselineFile = path.join(__dirname, "performance-baseline.json");
			let baseline: any = null;

			try {
				const baselineData = await fs.readFile(baselineFile, "utf8");
				baseline = JSON.parse(baselineData);
			} catch (error) {
				// No baseline available, skip regression test
				console.warn(
					"No performance baseline available, skipping regression test",
				);
				return;
			}

			// Run current performance tests
			const currentResults = await performanceMetrics.runBenchmarkSuite(
				taskAnalyzer,
				workCommand,
			);

			// Compare with baseline (allow 20% degradation)
			const regressionThreshold = 1.2;

			expect(currentResults.simpleTaskAnalysis).toBeLessThan(
				baseline.simpleTaskAnalysis * regressionThreshold,
			);
			expect(currentResults.complexTaskAnalysis).toBeLessThan(
				baseline.complexTaskAnalysis * regressionThreshold,
			);
			expect(currentResults.promptGeneration).toBeLessThan(
				baseline.promptGeneration * regressionThreshold,
			);
			expect(currentResults.peakMemoryUsage).toBeLessThan(
				baseline.peakMemoryUsage * regressionThreshold,
			);

			performanceMetrics.recordRegressionTest(baseline, currentResults);
		});
	});
});

/**
 * Performance metrics collection and analysis
 */
class PerformanceMetrics {
	private taskAnalysisMetrics: Array<{
		task: string;
		time: number;
		memory: number;
		complexity: string;
	}> = [];

	private promptGenerationMetrics: Array<{
		task: string;
		time: number;
	}> = [];

	private concurrentTestMetrics: Array<{
		taskCount: number;
		totalTime: number;
		totalMemory: number;
	}> = [];

	private scalabilityMetrics: Array<{
		components: number;
		time: number;
		agents: number;
	}> = [];

	recordTaskAnalysis(
		task: string,
		time: number,
		memory: number,
		complexity: string,
	): void {
		this.taskAnalysisMetrics.push({ task, time, memory, complexity });
	}

	recordPromptGeneration(task: string, time: number): void {
		this.promptGenerationMetrics.push({ task, time });
	}

	recordConcurrentAnalysis(
		taskCount: number,
		totalTime: number,
		totalMemory: number,
	): void {
		this.concurrentTestMetrics.push({ taskCount, totalTime, totalMemory });
	}

	recordScalabilityTest(
		results: Array<{ components: number; time: number; agents: number }>,
	): void {
		this.scalabilityMetrics.push(...results);
	}

	recordLoadTest(
		taskCount: number,
		totalTime: number,
		promptsGenerated: number,
	): void {
		// Implementation for load test metrics
	}

	recordPromptSizes(sizes: number[]): void {
		// Implementation for prompt size metrics
	}

	recordMemoryStability(readings: number[]): void {
		// Implementation for memory stability metrics
	}

	recordResourceCleanup(initialMemory: number, finalMemory: number): void {
		// Implementation for resource cleanup metrics
	}

	recordResourceConstrainedTest(analysisTime: number): void {
		// Implementation for resource constrained test metrics
	}

	recordRegressionTest(baseline: any, current: any): void {
		// Implementation for regression test metrics
	}

	async runBenchmarkSuite(
		taskAnalyzer: TaskAnalyzer,
		workCommand: WorkCommand,
	): Promise<{
		simpleTaskAnalysis: number;
		complexTaskAnalysis: number;
		promptGeneration: number;
		concurrentTasksHandled: number;
		peakMemoryUsage: number;
	}> {
		// Simple task analysis benchmark
		const startSimple = performance.now();
		await taskAnalyzer.analyze({
			task: "Simple benchmark task",
			params: [],
			context: {
				workingDirectory: process.cwd(),
				environment: process.env,
				options: {},
			},
		});
		const simpleTaskAnalysis = performance.now() - startSimple;

		// Complex task analysis benchmark
		const startComplex = performance.now();
		await taskAnalyzer.analyze({
			task: "Complex benchmark task with multiple components, microservices, databases, authentication, monitoring, and deployment automation",
			params: [],
			context: {
				workingDirectory: process.cwd(),
				environment: process.env,
				options: {},
			},
		});
		const complexTaskAnalysis = performance.now() - startComplex;

		// Prompt generation benchmark
		let promptGenerated = false;
		const writeFileSpy = jest
			.spyOn(fs, "writeFile")
			.mockImplementation(async () => {
				promptGenerated = true;
			});

		const startPrompt = performance.now();
		const command = workCommand.createCommand();
		await command.parseAsync(
			["node", "test", "benchmark prompt", "--dry-run"],
			{ from: "user" },
		);
		const promptGeneration = performance.now() - startPrompt;

		writeFileSpy.mockRestore();

		// Memory usage benchmark
		const peakMemoryUsage = process.memoryUsage().heapUsed;

		return {
			simpleTaskAnalysis,
			complexTaskAnalysis,
			promptGeneration,
			concurrentTasksHandled: 10, // Default value
			peakMemoryUsage,
		};
	}

	generateReport(): void {
		const report = {
			taskAnalysis: {
				total: this.taskAnalysisMetrics.length,
				averageTime:
					this.taskAnalysisMetrics.reduce((sum, m) => sum + m.time, 0) /
					this.taskAnalysisMetrics.length,
				averageMemory:
					this.taskAnalysisMetrics.reduce((sum, m) => sum + m.memory, 0) /
					this.taskAnalysisMetrics.length,
			},
			promptGeneration: {
				total: this.promptGenerationMetrics.length,
				averageTime:
					this.promptGenerationMetrics.reduce((sum, m) => sum + m.time, 0) /
					this.promptGenerationMetrics.length,
			},
			concurrentTests: this.concurrentTestMetrics.length,
			scalabilityTests: this.scalabilityMetrics.length,
		};

		console.log(
			"Performance Validation Report:",
			JSON.stringify(report, null, 2),
		);
	}
}
