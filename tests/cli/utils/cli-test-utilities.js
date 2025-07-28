/**
 * ABOUTME: Comprehensive test utilities for CLI command testing with TDD approach
 * ABOUTME: Provides mocks, fixtures, and helper functions for testing CLI commands
 */

import { jest } from "@jest/globals";

/**
 * Mock Database Factory
 * Creates consistent database mocks for testing
 */
export class MockDatabaseFactory {
	static create(initialData = {}) {
		const mockDatabase = {
			prepare: jest.fn().mockReturnValue({
				run: jest.fn(),
				get: jest.fn(),
				all: jest.fn().mockReturnValue([]),
				iterate: jest.fn().mockReturnValue([]),
			}),
			close: jest.fn(),
			exec: jest.fn(),
			backup: jest.fn(),
			serialize: jest.fn(),
			// Custom methods for setting up test data
			__setData: function (table, data) {
				this.prepare().all.mockImplementation((sql) => {
					if (sql.includes(table)) {
						return Array.isArray(data) ? data : [data];
					}
					return [];
				});
			},
			__setError: function (error) {
				this.prepare.mockImplementationOnce(() => {
					throw error;
				});
			},
		};

		// Set initial data if provided
		Object.entries(initialData).forEach(([table, data]) => {
			mockDatabase.__setData(table, data);
		});

		return mockDatabase;
	}
}

/**
 * Console Output Capture
 * Captures and analyzes console output for testing
 */
export class ConsoleCapture {
	constructor() {
		this.logs = [];
		this.errors = [];
		this.originalLog = console.log;
		this.originalError = console.error;
	}

	start() {
		this.logs = [];
		this.errors = [];

		console.log = (...args) => {
			this.logs.push(args.join(" "));
		};

		console.error = (...args) => {
			this.errors.push(args.join(" "));
		};
	}

	stop() {
		console.log = this.originalLog;
		console.error = this.originalError;
	}

	getOutput() {
		return {
			logs: this.logs,
			errors: this.errors,
			allOutput: [...this.logs, ...this.errors],
		};
	}

	hasOutput(pattern) {
		const allOutput = this.getOutput().allOutput.join("\n");
		if (pattern instanceof RegExp) {
			return pattern.test(allOutput);
		}
		return allOutput.includes(pattern);
	}

	getJSONOutput() {
		const jsonOutputs = this.logs
			.filter((log) => log.trim().startsWith("{") && log.trim().endsWith("}"))
			.map((log) => {
				try {
					return JSON.parse(log);
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		return jsonOutputs;
	}
}

/**
 * CLI Command Test Runner
 * Executes CLI commands in controlled test environment
 */
export class CLITestRunner {
	constructor(commandFunction) {
		this.commandFunction = commandFunction;
		this.console = new ConsoleCapture();
	}

	async run(args = [], options = {}) {
		this.console.start();

		try {
			const result = await this.commandFunction(args, options);
			this.console.stop();

			return {
				result,
				output: this.console.getOutput(),
				exitCode: 0,
			};
		} catch (error) {
			this.console.stop();

			return {
				result: null,
				output: this.console.getOutput(),
				error,
				exitCode: 1,
			};
		}
	}

	async expectSuccess(args, options, expectedOutput) {
		const result = await this.run(args, options);

		expect(result.exitCode).toBe(0);
		if (expectedOutput) {
			expect(result.output.allOutput.join("\n")).toContain(expectedOutput);
		}

		return result;
	}

	async expectFailure(args, options, expectedError) {
		const result = await this.run(args, options);

		expect(result.exitCode).toBe(1);
		if (expectedError) {
			expect(result.output.errors.join("\n")).toContain(expectedError);
		}

		return result;
	}
}

/**
 * Test Fixtures for CLI Commands
 */
export const TestFixtures = {
	// Sample agent data
	agents: {
		researcher: {
			id: "agent-researcher-001",
			type: "researcher",
			name: "Research Agent",
			status: "active",
			objective: "Research AI patterns",
			created_at: Date.now() - 3600000, // 1 hour ago
			last_active: Date.now() - 300000, // 5 minutes ago
		},

		coder: {
			id: "agent-coder-001",
			type: "coder",
			name: "Code Agent",
			status: "idle",
			objective: "Implement features",
			created_at: Date.now() - 7200000, // 2 hours ago
			last_active: Date.now() - 1800000, // 30 minutes ago
		},

		tester: {
			id: "agent-tester-001",
			type: "tester",
			name: "Test Agent",
			status: "busy",
			objective: "Write and run tests",
			created_at: Date.now() - 1800000, // 30 minutes ago
			last_active: Date.now() - 60000, // 1 minute ago
		},
	},

	// Sample memory data
	memories: {
		projectConfig: {
			key: "project/config",
			value: JSON.stringify({
				name: "test-project",
				type: "web-app",
				maxAgents: 5,
			}),
			namespace: "configuration",
			created_at: Date.now() - 86400000, // 1 day ago
			tags: ["config", "project"],
		},

		taskData: {
			key: "task/current",
			value: JSON.stringify({
				id: "task-123",
				description: "Implement user authentication",
				assignedTo: "agent-coder-001",
				status: "in-progress",
			}),
			namespace: "tasks",
			created_at: Date.now() - 3600000, // 1 hour ago
			tags: ["task", "active"],
		},
	},

	// Sample consensus data
	consensus: {
		architecture: {
			topic: "system-architecture",
			agreement_level: 0.85,
			participants: 3,
			decisions: JSON.stringify({
				database: "postgresql",
				framework: "express",
				deployment: "docker",
			}),
			created_at: Date.now() - 7200000, // 2 hours ago
		},
	},

	// Sample metrics data
	metrics: {
		tasksCompleted: {
			metric: "tasks_completed",
			value: 25,
			timestamp: Date.now() - 3600000,
			metadata: JSON.stringify({ category: "productivity" }),
		},

		avgResponseTime: {
			metric: "avg_response_time",
			value: 1.5,
			timestamp: Date.now() - 1800000,
			metadata: JSON.stringify({ unit: "seconds" }),
		},

		memoryUsage: {
			metric: "memory_usage",
			value: 128.5,
			timestamp: Date.now() - 900000,
			metadata: JSON.stringify({ unit: "MB" }),
		},
	},
};

/**
 * Mock Inquirer for Interactive Testing
 */
export class MockInquirer {
	constructor() {
		this.responses = new Map();
		this.callHistory = [];
	}

	setResponse(questionName, response) {
		this.responses.set(questionName, response);
	}

	setResponseSequence(responses) {
		this.responseIndex = 0;
		this.responseSequence = responses;
	}

	createMock() {
		return {
			prompt: jest.fn().mockImplementation(async (questions) => {
				this.callHistory.push(questions);

				if (this.responseSequence) {
					const response = this.responseSequence[this.responseIndex++];
					return response || {};
				}

				const response = {};
				const questionArray = Array.isArray(questions)
					? questions
					: [questions];

				questionArray.forEach((question) => {
					const name = question.name || "default";
					response[name] =
						this.responses.get(name) || question.default || "test-response";
				});

				return response;
			}),
		};
	}

	getCallHistory() {
		return this.callHistory;
	}
}

/**
 * Process Spawn Mock for Testing Child Processes
 */
export class MockProcessSpawn {
	constructor() {
		this.processes = [];
	}

	createMock() {
		return {
			spawn: jest.fn().mockImplementation((command, args, options) => {
				const mockProcess = {
					pid: Math.floor(Math.random() * 10000),
					stdout: {
						on: jest.fn().mockImplementation((event, callback) => {
							if (event === "data") {
								// Simulate stdout data
								setTimeout(() => callback("Mock process output\n"), 10);
							}
						}),
					},
					stderr: {
						on: jest.fn().mockImplementation((event, callback) => {
							if (event === "data") {
								// Simulate stderr data only if needed
							}
						}),
					},
					on: jest.fn().mockImplementation((event, callback) => {
						if (event === "exit") {
							// Default to successful exit
							setTimeout(() => callback(0), 50);
						} else if (event === "error") {
							// Only call error callback if explicitly set
						}
					}),
					kill: jest.fn(),
					// Helper method to simulate process failure
					__simulateError: function (
						exitCode = 1,
						errorMessage = "Process failed",
					) {
						this.on.mockImplementation((event, callback) => {
							if (event === "exit") {
								setTimeout(() => callback(exitCode), 50);
							} else if (event === "error") {
								setTimeout(() => callback(new Error(errorMessage)), 10);
							}
						});
					},
				};

				this.processes.push({
					command,
					args,
					options,
					process: mockProcess,
				});

				return mockProcess;
			}),
		};
	}

	getSpawnedProcesses() {
		return this.processes;
	}

	getLastProcess() {
		return this.processes[this.processes.length - 1];
	}
}

/**
 * Test Data Generator
 * Generates realistic test data for different scenarios
 */
export class TestDataGenerator {
	static generateAgents(count = 5) {
		const types = ["researcher", "coder", "tester", "architect", "analyst"];
		const statuses = ["active", "idle", "busy", "error"];

		return Array.from({ length: count }, (_, i) => ({
			id: `agent-${i + 1}`,
			type: types[i % types.length],
			name: `${types[i % types.length]} Agent ${i + 1}`,
			status: statuses[Math.floor(Math.random() * statuses.length)],
			objective: `Test objective ${i + 1}`,
			created_at: Date.now() - Math.random() * 86400000, // Random time in last day
			last_active: Date.now() - Math.random() * 3600000, // Random time in last hour
		}));
	}

	static generateMemories(count = 10) {
		const namespaces = ["configuration", "tasks", "coordination", "metrics"];
		const keys = ["config", "task", "memory", "data", "settings"];

		return Array.from({ length: count }, (_, i) => ({
			key: `${keys[i % keys.length]}/item-${i + 1}`,
			value: JSON.stringify({
				id: i + 1,
				data: `test-data-${i + 1}`,
				metadata: { type: "test" },
			}),
			namespace: namespaces[i % namespaces.length],
			created_at: Date.now() - Math.random() * 86400000,
			tags: [`tag-${i % 3}`, "test"],
		}));
	}

	static generateMetrics(count = 20) {
		const metrics = [
			"cpu_usage",
			"memory_usage",
			"tasks_completed",
			"response_time",
		];

		return Array.from({ length: count }, (_, i) => ({
			metric: metrics[i % metrics.length],
			value: Math.random() * 100,
			timestamp: Date.now() - Math.random() * 86400000,
			metadata: JSON.stringify({
				category: "performance",
				unit: i % 2 === 0 ? "percent" : "count",
			}),
		}));
	}
}

/**
 * TDD Test Helper
 * Provides utilities specifically for TDD methodology
 */
export class TDDTestHelper {
	static createFailingTest(testName, expectedBehavior, actualImplementation) {
		return {
			name: `FAILING: ${testName}`,
			description: `This test should FAIL initially to demonstrate TDD red phase`,
			expectedBehavior,
			actualImplementation,
			shouldFail: true,
		};
	}

	static validateTDDCycle(testResults) {
		const failingTests = testResults.filter(
			(result) => result.shouldFail && result.passed,
		);

		if (failingTests.length > 0) {
			throw new Error(
				`TDD Violation: These tests should be failing but are passing: ${failingTests
					.map((t) => t.name)
					.join(", ")}`,
			);
		}
	}

	static async runRedPhase(tests) {
		console.log("🔴 Running TDD RED PHASE - Tests should FAIL");

		const results = [];
		for (const test of tests) {
			try {
				await test.fn();
				results.push({
					name: test.name,
					passed: true,
					shouldFail: test.shouldFail,
				});
			} catch (error) {
				results.push({
					name: test.name,
					passed: false,
					error,
					shouldFail: test.shouldFail,
				});
			}
		}

		return results;
	}
}

/**
 * Performance Test Utilities
 */
export class PerformanceTestHelper {
	static async measureExecutionTime(fn) {
		const start = process.hrtime.bigint();
		const result = await fn();
		const end = process.hrtime.bigint();

		return {
			result,
			duration: Number(end - start) / 1000000, // Convert to milliseconds
		};
	}

	static createLoadTest(command, iterations = 100) {
		return async () => {
			const startTime = Date.now();
			const promises = Array.from({ length: iterations }, () => command());

			const results = await Promise.allSettled(promises);
			const endTime = Date.now();

			const successful = results.filter((r) => r.status === "fulfilled").length;
			const failed = results.filter((r) => r.status === "rejected").length;

			return {
				iterations,
				successful,
				failed,
				totalTime: endTime - startTime,
				avgTime: (endTime - startTime) / iterations,
			};
		};
	}
}

// Export default object with all utilities
export default {
	MockDatabaseFactory,
	ConsoleCapture,
	CLITestRunner,
	TestFixtures,
	MockInquirer,
	MockProcessSpawn,
	TestDataGenerator,
	TDDTestHelper,
	PerformanceTestHelper,
};
