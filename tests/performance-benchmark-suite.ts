/**
 * Performance Benchmark Suite
 * Comprehensive performance testing for all system components
 */

import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { ChildProcess, spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { PerformanceObserver, performance } from "perf_hooks";

interface PerformanceMetrics {
	executionTime: number;
	memoryUsage: NodeJS.MemoryUsage;
	cpuUsage: NodeJS.CpuUsage;
	throughput: number;
	latency: number;
	errorRate: number;
}

interface BenchmarkResult {
	name: string;
	metrics: PerformanceMetrics;
	baseline: PerformanceMetrics;
	improvement: number;
	status: "PASS" | "FAIL" | "DEGRADED";
}

class PerformanceBenchmarkManager {
	private results: BenchmarkResult[] = [];
	private observer: PerformanceObserver;
	private baselineMetrics: Map<string, PerformanceMetrics> = new Map();

	constructor() {
		this.observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry) => {
				console.log(`Performance mark: ${entry.name} - ${entry.duration}ms`);
			});
		});
		this.observer.observe({ entryTypes: ["measure"] });

		this.loadBaselines();
	}

	private loadBaselines(): void {
		// Define baseline performance expectations
		this.baselineMetrics.set("work-command-analysis", {
			executionTime: 2000, // 2 seconds
			memoryUsage: {
				rss: 50 * 1024 * 1024,
				heapTotal: 0,
				heapUsed: 30 * 1024 * 1024,
				external: 0,
				arrayBuffers: 0,
			},
			cpuUsage: { user: 100000, system: 50000 },
			throughput: 1, // 1 task per second
			latency: 500, // 500ms
			errorRate: 0, // 0% error rate
		});

		this.baselineMetrics.set("agent-spawning", {
			executionTime: 1000, // 1 second
			memoryUsage: {
				rss: 20 * 1024 * 1024,
				heapTotal: 0,
				heapUsed: 15 * 1024 * 1024,
				external: 0,
				arrayBuffers: 0,
			},
			cpuUsage: { user: 50000, system: 25000 },
			throughput: 5, // 5 agents per second
			latency: 200, // 200ms
			errorRate: 0,
		});

		this.baselineMetrics.set("memory-operations", {
			executionTime: 500, // 500ms
			memoryUsage: {
				rss: 10 * 1024 * 1024,
				heapTotal: 0,
				heapUsed: 5 * 1024 * 1024,
				external: 0,
				arrayBuffers: 0,
			},
			cpuUsage: { user: 25000, system: 10000 },
			throughput: 100, // 100 operations per second
			latency: 10, // 10ms
			errorRate: 0,
		});

		this.baselineMetrics.set("coordination-workflows", {
			executionTime: 3000, // 3 seconds
			memoryUsage: {
				rss: 75 * 1024 * 1024,
				heapTotal: 0,
				heapUsed: 50 * 1024 * 1024,
				external: 0,
				arrayBuffers: 0,
			},
			cpuUsage: { user: 150000, system: 75000 },
			throughput: 0.5, // 0.5 workflows per second
			latency: 1000, // 1 second
			errorRate: 0,
		});
	}

	async measurePerformance<T>(
		name: string,
		operation: () => Promise<T>,
		iterations: number = 1,
	): Promise<{ result: T; metrics: PerformanceMetrics }> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();
		const startCpu = process.cpuUsage();

		performance.mark(`${name}-start`);

		let errors = 0;
		const results: T[] = [];

		try {
			for (let i = 0; i < iterations; i++) {
				try {
					const result = await operation();
					results.push(result);
				} catch (error) {
					errors++;
					console.warn(`Iteration ${i + 1} failed:`, error);
				}
			}

			performance.mark(`${name}-end`);
			performance.measure(name, `${name}-start`, `${name}-end`);

			const endTime = performance.now();
			const endMemory = process.memoryUsage();
			const endCpu = process.cpuUsage(startCpu);

			const metrics: PerformanceMetrics = {
				executionTime: endTime - startTime,
				memoryUsage: {
					rss: endMemory.rss - startMemory.rss,
					heapTotal: endMemory.heapTotal - startMemory.heapTotal,
					heapUsed: endMemory.heapUsed - startMemory.heapUsed,
					external: endMemory.external - startMemory.external,
					arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
				},
				cpuUsage: endCpu,
				throughput: iterations / ((endTime - startTime) / 1000),
				latency: (endTime - startTime) / iterations,
				errorRate: (errors / iterations) * 100,
			};

			return {
				result: results[results.length - 1],
				metrics,
			};
		} catch (error) {
			throw new Error(`Performance measurement failed: ${error}`);
		}
	}

	async executeCommand(
		command: string,
		timeout: number = 30000,
	): Promise<{
		stdout: string;
		stderr: string;
		exitCode: number;
		duration: number;
	}> {
		const startTime = performance.now();

		return new Promise((resolve, reject) => {
			const parts = command.split(" ");
			const cmd = parts[0];
			const args = parts.slice(1);

			const process = spawn(cmd, args, {
				stdio: ["pipe", "pipe", "pipe"],
				shell: true,
			});

			let stdout = "";
			let stderr = "";

			process.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			process.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			const timer = setTimeout(() => {
				process.kill("SIGTERM");
				reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
			}, timeout);

			process.on("close", (code) => {
				clearTimeout(timer);
				const endTime = performance.now();
				resolve({
					stdout,
					stderr,
					exitCode: code || 0,
					duration: endTime - startTime,
				});
			});

			process.on("error", (error) => {
				clearTimeout(timer);
				reject(error);
			});
		});
	}

	analyzeBenchmarkResult(
		name: string,
		metrics: PerformanceMetrics,
	): BenchmarkResult {
		const baseline = this.baselineMetrics.get(name);
		if (!baseline) {
			return {
				name,
				metrics,
				baseline: metrics,
				improvement: 0,
				status: "PASS",
			};
		}

		// Calculate improvement percentage
		const timeImprovement =
			((baseline.executionTime - metrics.executionTime) /
				baseline.executionTime) *
			100;
		const memoryImprovement =
			((baseline.memoryUsage.heapUsed - metrics.memoryUsage.heapUsed) /
				baseline.memoryUsage.heapUsed) *
			100;
		const throughputImprovement =
			((metrics.throughput - baseline.throughput) / baseline.throughput) * 100;

		const overallImprovement =
			(timeImprovement + memoryImprovement + throughputImprovement) / 3;

		// Determine status
		let status: "PASS" | "FAIL" | "DEGRADED" = "PASS";

		if (metrics.executionTime > baseline.executionTime * 1.5) status = "FAIL";
		if (metrics.memoryUsage.heapUsed > baseline.memoryUsage.heapUsed * 1.5)
			status = "FAIL";
		if (metrics.errorRate > baseline.errorRate + 5) status = "FAIL";
		if (overallImprovement < -20) status = "DEGRADED";

		const result: BenchmarkResult = {
			name,
			metrics,
			baseline,
			improvement: overallImprovement,
			status,
		};

		this.results.push(result);
		return result;
	}

	generateReport(): string {
		const passCount = this.results.filter((r) => r.status === "PASS").length;
		const failCount = this.results.filter((r) => r.status === "FAIL").length;
		const degradedCount = this.results.filter(
			(r) => r.status === "DEGRADED",
		).length;

		let report = `
# Performance Benchmark Report

## Summary
- ✅ **Passed**: ${passCount}
- ❌ **Failed**: ${failCount}
- ⚠️  **Degraded**: ${degradedCount}
- 📊 **Total Tests**: ${this.results.length}

## Results

`;

		this.results.forEach((result) => {
			const statusIcon =
				result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";

			report += `
### ${statusIcon} ${result.name}

**Status**: ${result.status}
**Performance Change**: ${result.improvement > 0 ? "+" : ""}${result.improvement.toFixed(1)}%

| Metric | Current | Baseline | Change |
|--------|---------|----------|--------|
| Execution Time | ${result.metrics.executionTime.toFixed(0)}ms | ${result.baseline.executionTime.toFixed(0)}ms | ${(((result.metrics.executionTime - result.baseline.executionTime) / result.baseline.executionTime) * 100).toFixed(1)}% |
| Memory Usage | ${(result.metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB | ${(result.baseline.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB | ${(((result.metrics.memoryUsage.heapUsed - result.baseline.memoryUsage.heapUsed) / result.baseline.memoryUsage.heapUsed) * 100).toFixed(1)}% |
| Throughput | ${result.metrics.throughput.toFixed(2)}/s | ${result.baseline.throughput.toFixed(2)}/s | ${(((result.metrics.throughput - result.baseline.throughput) / result.baseline.throughput) * 100).toFixed(1)}% |
| Error Rate | ${result.metrics.errorRate.toFixed(1)}% | ${result.baseline.errorRate.toFixed(1)}% | ${(result.metrics.errorRate - result.baseline.errorRate).toFixed(1)}% |

`;
		});

		report += `
## Recommendations

`;

		const failedTests = this.results.filter((r) => r.status === "FAIL");
		const degradedTests = this.results.filter((r) => r.status === "DEGRADED");

		if (failedTests.length > 0) {
			report += `
### 🚨 Critical Issues
`;
			failedTests.forEach((test) => {
				report += `- **${test.name}**: Performance degraded significantly (${test.improvement.toFixed(1)}%)\n`;
			});
		}

		if (degradedTests.length > 0) {
			report += `
### ⚠️ Performance Degradation
`;
			degradedTests.forEach((test) => {
				report += `- **${test.name}**: Consider optimization (${test.improvement.toFixed(1)}%)\n`;
			});
		}

		if (failedTests.length === 0 && degradedTests.length === 0) {
			report += `
### ✅ All Systems Performing Well
- All performance benchmarks meet or exceed baseline expectations
- System is operating within optimal parameters
- No immediate optimization required
`;
		}

		return report;
	}
}

describe("⚡ Performance Benchmark Suite", () => {
	let benchmarkManager: PerformanceBenchmarkManager;

	beforeAll(() => {
		benchmarkManager = new PerformanceBenchmarkManager();
	});

	afterAll(async () => {
		const report = benchmarkManager.generateReport();
		const reportPath = path.join(
			process.cwd(),
			"performance-benchmark-report.md",
		);
		await fs.writeFile(reportPath, report);
		console.log("📊 Performance report generated:", reportPath);
	});

	describe("🎯 Core System Performance", () => {
		test("Work Command Analysis Performance", async () => {
			const { metrics } = await benchmarkManager.measurePerformance(
				"work-command-analysis",
				async () => {
					const result = await benchmarkManager.executeCommand(
						'npx claude-flow work "benchmark task analysis" --dry-run --agents 3 --topology hierarchical',
						15000,
					);
					expect(result.exitCode).toBe(0);
					return result;
				},
				5, // 5 iterations
			);

			const benchmarkResult = benchmarkManager.analyzeBenchmarkResult(
				"work-command-analysis",
				metrics,
			);

			expect(benchmarkResult.status).not.toBe("FAIL");
			expect(metrics.errorRate).toBeLessThan(5); // Less than 5% error rate
			expect(metrics.executionTime).toBeLessThan(10000); // Less than 10 seconds

			console.log(
				`Work Command Analysis: ${metrics.executionTime.toFixed(0)}ms avg, ${metrics.throughput.toFixed(2)}/s throughput`,
			);
		}, 60000);

		test("Agent Spawning Performance", async () => {
			const sessionId = `perf-test-${Date.now()}`;

			const { metrics } = await benchmarkManager.measurePerformance(
				"agent-spawning",
				async () => {
					const agentTypes = [
						"coordinator",
						"analyst",
						"coder",
						"tester",
						"researcher",
					];
					const randomType =
						agentTypes[Math.floor(Math.random() * agentTypes.length)];

					const result = await benchmarkManager.executeCommand(
						`npx claude-flow agent spawn ${randomType} --session-id "${sessionId}" --name "perf-test" --memory-hooks true`,
						10000,
					);

					expect(result.exitCode).toBe(0);
					return result;
				},
				10, // 10 iterations
			);

			const benchmarkResult = benchmarkManager.analyzeBenchmarkResult(
				"agent-spawning",
				metrics,
			);

			expect(benchmarkResult.status).not.toBe("FAIL");
			expect(metrics.throughput).toBeGreaterThan(1); // At least 1 agent per second
			expect(metrics.latency).toBeLessThan(2000); // Less than 2 seconds per agent

			console.log(
				`Agent Spawning: ${metrics.latency.toFixed(0)}ms avg latency, ${metrics.throughput.toFixed(2)}/s throughput`,
			);
		}, 60000);

		test("Memory Operations Performance", async () => {
			const sessionId = `perf-memory-${Date.now()}`;

			const { metrics } = await benchmarkManager.measurePerformance(
				"memory-operations",
				async () => {
					const operations = [
						benchmarkManager.executeCommand(
							`npx claude-flow memory store --session-id "${sessionId}" --key "test-${Math.random()}" --value "performance-test-data"`,
							5000,
						),
						benchmarkManager.executeCommand(
							`npx claude-flow memory retrieve --session-id "${sessionId}" --key "test-${Math.random()}"`,
							5000,
						),
						benchmarkManager.executeCommand(
							`npx claude-flow memory list --session-id "${sessionId}"`,
							5000,
						),
					];

					const results = await Promise.all(operations);
					return results;
				},
				20, // 20 iterations (60 total operations)
			);

			const benchmarkResult = benchmarkManager.analyzeBenchmarkResult(
				"memory-operations",
				metrics,
			);

			expect(benchmarkResult.status).not.toBe("FAIL");
			expect(metrics.throughput).toBeGreaterThan(10); // At least 10 ops per second
			expect(metrics.errorRate).toBeLessThan(2); // Less than 2% error rate

			console.log(
				`Memory Operations: ${metrics.latency.toFixed(0)}ms avg latency, ${metrics.throughput.toFixed(1)}/s throughput`,
			);
		}, 60000);
	});

	describe("🚀 Coordination Workflow Performance", () => {
		test("Full Coordination Workflow Performance", async () => {
			const { metrics } = await benchmarkManager.measurePerformance(
				"coordination-workflows",
				async () => {
					const sessionId = `coord-perf-${Date.now()}`;

					// Full coordination workflow
					const initResult = await benchmarkManager.executeCommand(
						`npx claude-flow hooks pre-task --description "Performance test coordination" --session-id "${sessionId}"`,
						10000,
					);

					const workResult = await benchmarkManager.executeCommand(
						`npx claude-flow work "coordinate performance test task" --session-id "${sessionId}" --agents 3 --topology mesh --strategy parallel`,
						20000,
					);

					const endResult = await benchmarkManager.executeCommand(
						`npx claude-flow hooks post-task --session-id "${sessionId}" --analyze-performance true`,
						10000,
					);

					expect(initResult.exitCode).toBe(0);
					expect(endResult.exitCode).toBe(0);

					return { initResult, workResult, endResult };
				},
				3, // 3 iterations
			);

			const benchmarkResult = benchmarkManager.analyzeBenchmarkResult(
				"coordination-workflows",
				metrics,
			);

			expect(benchmarkResult.status).not.toBe("FAIL");
			expect(metrics.executionTime).toBeLessThan(60000); // Less than 60 seconds
			expect(metrics.errorRate).toBeLessThan(10); // Less than 10% error rate

			console.log(
				`Coordination Workflows: ${(metrics.executionTime / 1000).toFixed(1)}s avg, ${metrics.errorRate.toFixed(1)}% error rate`,
			);
		}, 180000); // 3 minutes timeout
	});

	describe("📈 Scalability and Load Testing", () => {
		test("Concurrent Session Performance", async () => {
			const { metrics } = await benchmarkManager.measurePerformance(
				"concurrent-sessions",
				async () => {
					const sessionCount = 5;
					const sessions = Array.from(
						{ length: sessionCount },
						(_, i) => `concurrent-${Date.now()}-${i}`,
					);

					const concurrentOperations = sessions.map((sessionId) =>
						benchmarkManager.executeCommand(
							`npx claude-flow agent spawn coder --session-id "${sessionId}" --name "concurrent-test"`,
							15000,
						),
					);

					const results = await Promise.all(concurrentOperations);

					// All should succeed
					results.forEach((result) => {
						expect(result.exitCode).toBe(0);
					});

					return results;
				},
				3, // 3 iterations
			);

			expect(metrics.errorRate).toBeLessThan(5);
			expect(metrics.executionTime).toBeLessThan(30000); // Less than 30 seconds for 5 concurrent sessions

			console.log(
				`Concurrent Sessions: ${metrics.executionTime.toFixed(0)}ms for 5 sessions, ${metrics.errorRate.toFixed(1)}% error rate`,
			);
		}, 120000);

		test("Memory Stress Test", async () => {
			const sessionId = `stress-${Date.now()}`;

			const { metrics } = await benchmarkManager.measurePerformance(
				"memory-stress",
				async () => {
					// Create large number of memory entries
					const storeOperations = Array.from({ length: 50 }, (_, i) =>
						benchmarkManager.executeCommand(
							`npx claude-flow memory store --session-id "${sessionId}" --key "stress-${i}" --value "large-data-${"x".repeat(1000)}"`,
							5000,
						),
					);

					await Promise.all(storeOperations);

					// Test retrieval performance
					const retrieveResult = await benchmarkManager.executeCommand(
						`npx claude-flow memory list --session-id "${sessionId}"`,
						10000,
					);

					expect(retrieveResult.exitCode).toBe(0);

					return retrieveResult;
				},
				1, // Single iteration due to memory intensity
			);

			expect(metrics.memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
			expect(metrics.executionTime).toBeLessThan(30000); // Less than 30 seconds

			console.log(
				`Memory Stress Test: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB used, ${(metrics.executionTime / 1000).toFixed(1)}s duration`,
			);
		}, 60000);
	});

	describe("🔍 System Health Under Load", () => {
		test("System Health During High Load", async () => {
			const { metrics } = await benchmarkManager.measurePerformance(
				"health-under-load",
				async () => {
					// Start multiple background operations
					const backgroundOps = Array.from({ length: 3 }, (_, i) =>
						benchmarkManager.executeCommand(
							`npx claude-flow work "background task ${i}" --agents 2`,
							30000,
						),
					);

					// Check system health while operations are running
					const healthChecks = Array.from({ length: 5 }, () =>
						benchmarkManager.executeCommand(
							"npx claude-flow system health --check-memory true --check-intrinsic true",
							10000,
						),
					);

					const [backgroundResults, healthResults] = await Promise.all([
						Promise.all(backgroundOps),
						Promise.all(healthChecks),
					]);

					// All health checks should succeed
					healthResults.forEach((result) => {
						expect(result.exitCode).toBe(0);
						expect(result.stdout).toContain("health");
					});

					return { backgroundResults, healthResults };
				},
				1, // Single iteration
			);

			expect(metrics.errorRate).toBeLessThan(10);

			console.log(
				`Health Under Load: ${(metrics.executionTime / 1000).toFixed(1)}s duration, ${metrics.errorRate.toFixed(1)}% error rate`,
			);
		}, 120000);
	});
});
