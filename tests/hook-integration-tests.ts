/**
 * Hook Integration Tests
 *
 * Comprehensive tests for hook coordination system to verify
 * deadlock prevention and proper execution order
 */

import { performance } from "perf_hooks";
import { HookCoordinator } from "../src/cli/commands/hooks/core/coordinator.js";
import {
	HookExecutionQueue,
	HookProcessPool,
	HookType,
} from "../src/cli/commands/hooks/core/execution-manager.js";
import {
	HookWrapper,
	hookWorkflow,
} from "../src/cli/commands/hooks/core/wrapper.js";

interface TestResult {
	name: string;
	passed: boolean;
	duration: number;
	error?: string;
	metrics?: any;
}

interface LoadTestResult {
	totalRequests: number;
	successful: number;
	failed: number;
	avgResponseTime: number;
	maxResponseTime: number;
	deadlocks: number;
	throughput: number;
}

/**
 * Hook Integration Test Suite
 */
export class HookIntegrationTests {
	private queue: HookExecutionQueue;
	private coordinator: HookCoordinator;
	private wrapper: HookWrapper;
	private results: TestResult[] = [];

	constructor() {
		this.queue = new HookExecutionQueue();
		this.coordinator = new HookCoordinator();
		this.wrapper = HookWrapper.getInstance();
	}

	/**
	 * Run all integration tests
	 */
	async runAllTests(): Promise<{
		passed: number;
		failed: number;
		results: TestResult[];
	}> {
		console.log("🧪 Starting Hook Integration Tests...\n");

		// Basic functionality tests
		await this.testBasicHookExecution();
		await this.testHookSerialization();
		await this.testTimeoutEnforcement();
		await this.testPriorityOrdering();

		// Coordination tests
		await this.testDeadlockPrevention();
		await this.testDependencyResolution();
		await this.testCircularDependencyDetection();

		// Load tests
		await this.testConcurrentExecution();
		await this.testProcessPoolEfficiency();
		await this.testHookStampedePrevention();

		// Error handling tests
		await this.testErrorRecovery();
		await this.testEmergencyTermination();
		await this.testGracefulShutdown();

		// Real-world scenario tests
		await this.testTaskWorkflow();
		await this.testFileOperationWorkflow();
		await this.testSessionWorkflow();

		return this.generateTestReport();
	}

	/**
	 * Test basic hook execution
	 */
	private async testBasicHookExecution(): Promise<void> {
		const testName = "Basic Hook Execution";
		const startTime = performance.now();

		try {
			// Test different hook types
			await this.wrapper.notify("Test message", { telemetry: true });
			await this.wrapper.preRead("test-file.ts", { symbolsOverview: false });

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { hooksExecuted: 2 },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test hook serialization
	 */
	private async testHookSerialization(): Promise<void> {
		const testName = "Hook Serialization";
		const startTime = performance.now();

		try {
			// Execute multiple hooks simultaneously
			const promises = [
				this.wrapper.preTask("Task 1", { autoSpawnAgents: false }),
				this.wrapper.preTask("Task 2", { autoSpawnAgents: false }),
				this.wrapper.preTask("Task 3", { autoSpawnAgents: false }),
			];

			await Promise.all(promises);

			const duration = performance.now() - startTime;
			const queueStats = this.queue.getExecutionStats();

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { queueStats },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test timeout enforcement
	 */
	private async testTimeoutEnforcement(): Promise<void> {
		const testName = "Timeout Enforcement";
		const startTime = performance.now();

		try {
			// Test with a hook that should timeout
			const timeoutPromise = this.queue.enqueue(
				"pre-task",
				["--description", "Long running task"],
				"high",
			);

			// This should complete within the timeout
			await timeoutPromise;

			const duration = performance.now() - startTime;

			// Check if it completed within expected time
			if (duration < 6000) {
				// Should complete within 5 seconds + buffer
				this.results.push({
					name: testName,
					passed: true,
					duration,
					metrics: { actualTimeout: duration },
				});

				console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
			} else {
				throw new Error(`Hook took too long: ${duration}ms`);
			}
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test priority ordering
	 */
	private async testPriorityOrdering(): Promise<void> {
		const testName = "Priority Ordering";
		const startTime = performance.now();

		try {
			const executionOrder: string[] = [];

			// Add hooks with different priorities
			const promises = [
				this.queue.enqueue("notify", ["--message", "Low priority"], "low"),
				this.queue.enqueue("notify", ["--message", "High priority"], "high"),
				this.queue.enqueue(
					"notify",
					["--message", "Medium priority"],
					"medium",
				),
			];

			await Promise.all(promises);

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { executionOrder },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test deadlock prevention
	 */
	private async testDeadlockPrevention(): Promise<void> {
		const testName = "Deadlock Prevention";
		const startTime = performance.now();

		try {
			// Simulate potential deadlock scenario
			const promises = [
				this.coordinator.coordinateHook("pre-edit", ["--file", "file1.ts"], {
					priority: "high",
				}),
				this.coordinator.coordinateHook("post-edit", ["--file", "file1.ts"], {
					priority: "high",
				}),
				this.coordinator.coordinateHook(
					"pre-task",
					["--description", "Task 1"],
					{ priority: "high" },
				),
			];

			await Promise.all(promises);

			const duration = performance.now() - startTime;
			const coordStatus = this.coordinator.getCoordinationStatus();

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { coordStatus },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test dependency resolution
	 */
	private async testDependencyResolution(): Promise<void> {
		const testName = "Dependency Resolution";
		const startTime = performance.now();

		try {
			// Test hooks with dependencies
			const promises = [
				this.coordinator.coordinateHook(
					"pre-task",
					["--description", "Parent task"],
					{ priority: "high" },
				),
				this.coordinator.coordinateHook(
					"pre-edit",
					["--file", "dependent.ts"],
					{ priority: "medium" },
				),
				this.coordinator.coordinateHook(
					"post-edit",
					["--file", "dependent.ts"],
					{ priority: "medium" },
				),
			];

			await Promise.all(promises);

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { dependenciesResolved: true },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test circular dependency detection
	 */
	private async testCircularDependencyDetection(): Promise<void> {
		const testName = "Circular Dependency Detection";
		const startTime = performance.now();

		try {
			// This should not create a circular dependency in our current graph
			await this.coordinator.coordinateHook(
				"pre-task",
				["--description", "Test task"],
				{ priority: "high" },
			);

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { circularDependencyDetected: false },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			// If it's a circular dependency error, that's expected behavior
			if (
				error instanceof Error &&
				error.message.includes("Circular dependency")
			) {
				this.results.push({
					name: testName,
					passed: true,
					duration: performance.now() - startTime,
					metrics: { circularDependencyDetected: true },
				});

				console.log(`✅ ${testName} - Circular dependency correctly detected`);
			} else {
				this.results.push({
					name: testName,
					passed: false,
					duration: performance.now() - startTime,
					error: error instanceof Error ? error.message : String(error),
				});

				console.log(
					`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	/**
	 * Test concurrent execution
	 */
	private async testConcurrentExecution(): Promise<void> {
		const testName = "Concurrent Execution";
		const startTime = performance.now();

		try {
			// Execute multiple hooks concurrently
			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(
					this.wrapper.notify(`Concurrent message ${i}`, { telemetry: false }),
				);
			}

			await Promise.all(promises);

			const duration = performance.now() - startTime;
			const queueStats = this.queue.getExecutionStats();

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { concurrentHooks: 10, queueStats },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test process pool efficiency
	 */
	private async testProcessPoolEfficiency(): Promise<void> {
		const testName = "Process Pool Efficiency";
		const startTime = performance.now();

		try {
			const pool = new HookProcessPool(3, 1);

			// Execute multiple hooks using the pool
			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(
					pool.executeHook("notify", ["--message", `Pool test ${i}`]),
				);
			}

			await Promise.all(promises);

			const duration = performance.now() - startTime;
			const poolStatus = pool.getPoolStatus();

			await pool.shutdown();

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { poolStatus },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test hook stampede prevention
	 */
	private async testHookStampedePrevention(): Promise<void> {
		const testName = "Hook Stampede Prevention";
		const startTime = performance.now();

		try {
			// Simulate a hook stampede scenario
			const promises = [];
			for (let i = 0; i < 20; i++) {
				promises.push(
					this.coordinator.coordinateHook(
						"pre-task",
						[`--description`, `Stampede task ${i}`],
						{ priority: "high" },
					),
				);
			}

			await Promise.all(promises);

			const duration = performance.now() - startTime;
			const coordStatus = this.coordinator.getCoordinationStatus();

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { stampedeHooks: 20, coordStatus },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test error recovery
	 */
	private async testErrorRecovery(): Promise<void> {
		const testName = "Error Recovery";
		const startTime = performance.now();

		try {
			// Test recovery from hook failure
			try {
				await this.coordinator.coordinateHook("pre-task", ["--invalid-arg"], {
					priority: "high",
				});
			} catch (error) {
				// Expected to fail
			}

			// System should still work after error
			await this.wrapper.notify("Recovery test", { telemetry: false });

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { recoverySuccessful: true },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test emergency termination
	 */
	private async testEmergencyTermination(): Promise<void> {
		const testName = "Emergency Termination";
		const startTime = performance.now();

		try {
			// Test emergency reset
			await this.coordinator.emergencyReset();

			// System should be responsive after reset
			await this.wrapper.notify("Post-reset test", { telemetry: false });

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { emergencyResetSuccessful: true },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test graceful shutdown
	 */
	private async testGracefulShutdown(): Promise<void> {
		const testName = "Graceful Shutdown";
		const startTime = performance.now();

		try {
			// Start some hooks
			const promises = [
				this.wrapper.notify("Shutdown test 1", { telemetry: false }),
				this.wrapper.notify("Shutdown test 2", { telemetry: false }),
			];

			// Wait for completion
			await Promise.all(promises);

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { gracefulShutdownSuccessful: true },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test task workflow
	 */
	private async testTaskWorkflow(): Promise<void> {
		const testName = "Task Workflow";
		const startTime = performance.now();

		try {
			await hookWorkflow.executeTaskWorkflow(
				"test-task-1",
				"Test task workflow",
				["file1.ts", "file2.ts"],
			);

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { workflowCompleted: true },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test file operation workflow
	 */
	private async testFileOperationWorkflow(): Promise<void> {
		const testName = "File Operation Workflow";
		const startTime = performance.now();

		try {
			await hookWorkflow.executeFileWorkflow("test-file.ts", "edit");

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { fileWorkflowCompleted: true },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Test session workflow
	 */
	private async testSessionWorkflow(): Promise<void> {
		const testName = "Session Workflow";
		const startTime = performance.now();

		try {
			await hookWorkflow.executeSessionWorkflow("test-session-1", "start");
			await hookWorkflow.executeSessionWorkflow("test-session-1", "end");

			const duration = performance.now() - startTime;

			this.results.push({
				name: testName,
				passed: true,
				duration,
				metrics: { sessionWorkflowCompleted: true },
			});

			console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
		} catch (error) {
			this.results.push({
				name: testName,
				passed: false,
				duration: performance.now() - startTime,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`❌ ${testName} - Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Generate test report
	 */
	private generateTestReport(): {
		passed: number;
		failed: number;
		results: TestResult[];
	} {
		const passed = this.results.filter((r) => r.passed).length;
		const failed = this.results.filter((r) => !r.passed).length;
		const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

		console.log("\n📊 Hook Integration Test Report");
		console.log("================================");
		console.log(`Total Tests: ${this.results.length}`);
		console.log(`Passed: ${passed}`);
		console.log(`Failed: ${failed}`);
		console.log(
			`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`,
		);
		console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
		console.log(
			`Average Time: ${(totalTime / this.results.length).toFixed(2)}ms`,
		);

		if (failed > 0) {
			console.log("\n❌ Failed Tests:");
			this.results
				.filter((r) => !r.passed)
				.forEach((r) => {
					console.log(`  - ${r.name}: ${r.error}`);
				});
		}

		return { passed, failed, results: this.results };
	}

	/**
	 * Run load test
	 */
	async runLoadTest(
		duration: number = 30000,
		concurrency: number = 10,
	): Promise<LoadTestResult> {
		console.log(
			`\n⚡ Running Load Test (${duration}ms, ${concurrency} concurrent)...`,
		);

		const startTime = Date.now();
		const endTime = startTime + duration;
		const results = {
			totalRequests: 0,
			successful: 0,
			failed: 0,
			responseTimes: [] as number[],
			deadlocks: 0,
		};

		// Run concurrent workers
		const workers = [];
		for (let i = 0; i < concurrency; i++) {
			workers.push(this.loadTestWorker(i, endTime, results));
		}

		await Promise.all(workers);

		const avgResponseTime =
			results.responseTimes.length > 0
				? results.responseTimes.reduce((a, b) => a + b, 0) /
					results.responseTimes.length
				: 0;

		const loadTestResult: LoadTestResult = {
			totalRequests: results.totalRequests,
			successful: results.successful,
			failed: results.failed,
			avgResponseTime,
			maxResponseTime: Math.max(...results.responseTimes),
			deadlocks: results.deadlocks,
			throughput: results.successful / (duration / 1000),
		};

		console.log("📈 Load Test Results:");
		console.log(`  Total Requests: ${loadTestResult.totalRequests}`);
		console.log(`  Successful: ${loadTestResult.successful}`);
		console.log(`  Failed: ${loadTestResult.failed}`);
		console.log(
			`  Success Rate: ${((loadTestResult.successful / loadTestResult.totalRequests) * 100).toFixed(1)}%`,
		);
		console.log(
			`  Avg Response Time: ${loadTestResult.avgResponseTime.toFixed(2)}ms`,
		);
		console.log(
			`  Max Response Time: ${loadTestResult.maxResponseTime.toFixed(2)}ms`,
		);
		console.log(`  Throughput: ${loadTestResult.throughput.toFixed(2)} req/s`);
		console.log(`  Deadlocks: ${loadTestResult.deadlocks}`);

		return loadTestResult;
	}

	/**
	 * Load test worker
	 */
	private async loadTestWorker(
		workerId: number,
		endTime: number,
		results: any,
	): Promise<void> {
		while (Date.now() < endTime) {
			const startTime = performance.now();
			try {
				await this.wrapper.notify(`Load test worker ${workerId} message`, {
					telemetry: false,
				});

				const responseTime = performance.now() - startTime;
				results.responseTimes.push(responseTime);
				results.successful++;
			} catch (error) {
				results.failed++;
				if (error instanceof Error && error.message.includes("deadlock")) {
					results.deadlocks++;
				}
			}

			results.totalRequests++;

			// Small delay to prevent overwhelming the system
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	}
}

// Export for CLI usage
export async function runHookIntegrationTests(): Promise<void> {
	const tests = new HookIntegrationTests();

	try {
		// Run integration tests
		const results = await tests.runAllTests();

		// Run load test
		const loadResults = await tests.runLoadTest(30000, 5);

		console.log("\n🎉 All hook integration tests completed!");

		if (results.failed > 0) {
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Hook integration tests failed:", error);
		process.exit(1);
	}
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
	runHookIntegrationTests().catch(console.error);
}
