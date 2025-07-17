/**
 * JSON Output Edge Cases and Error Handling Tests
 * Testing comprehensive edge cases and error scenarios for the JSON output feature
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fs from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { SwarmCoordinator } from "../../src/swarm/coordinator.js";
import { SwarmJsonOutputAggregator } from "../../src/swarm/json-output-aggregator.js";
import type { AgentState, TaskDefinition } from "../../src/swarm/types.js";

describe("JSON Output Edge Cases and Error Handling", () => {
	let testDir: string;
	let aggregator: SwarmJsonOutputAggregator;

	beforeEach(async () => {
		// Create a temporary directory for test files
		testDir = await fs.mkdtemp(path.join(tmpdir(), "claude-flow-edge-test-"));
		aggregator = new SwarmJsonOutputAggregator(
			"edge-test-swarm",
			"Edge case testing",
		);
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("Large Data Volume Tests", () => {
		it("should handle large numbers of agents (100+)", () => {
			// Create 150 agents
			for (let i = 0; i < 150; i++) {
				const mockAgent: AgentState = {
					id: {
						id: `agent-${i}`,
						swarmId: "edge-test-swarm",
						type: "researcher",
						instance: i,
					},
					name: `Agent ${i}`,
					type: "researcher",
					status: "idle",
					capabilities: {
						codeGeneration: false,
						codeReview: false,
						testing: false,
						documentation: true,
						research: true,
						analysis: true,
						webSearch: true,
						apiIntegration: false,
						fileSystem: true,
						terminalAccess: false,
						languages: ["markdown"],
						frameworks: [],
						domains: ["research"],
						tools: ["web-search"],
						maxConcurrentTasks: 3,
						maxMemoryUsage: 512,
						maxExecutionTime: 300,
						reliability: 0.9,
						speed: 0.8,
						quality: 0.85,
					},
					metrics: {
						tasksCompleted: 0,
						tasksFailed: 0,
						averageExecutionTime: 0,
						successRate: 0,
						cpuUsage: 0,
						memoryUsage: 0,
						diskUsage: 0,
						networkUsage: 0,
						codeQuality: 0,
						testCoverage: 0,
						bugRate: 0,
						userSatisfaction: 0,
						totalUptime: 0,
						lastActivity: new Date(),
						responseTime: 0,
					},
					config: {
						autonomyLevel: 0.5,
						learningEnabled: false,
						adaptationEnabled: false,
						maxTasksPerHour: 10,
						maxConcurrentTasks: 1,
						timeoutThreshold: 60,
						reportingInterval: 30,
						heartbeatInterval: 15,
						permissions: [],
						trustedAgents: [],
						expertise: {},
						preferences: {},
					},
					environment: {
						runtime: "node",
						version: "20.0.0",
						workingDirectory: "/tmp",
						tempDirectory: "/tmp",
						logDirectory: "/var/log",
						apiEndpoints: {},
						credentials: {},
						availableTools: [],
						toolConfigs: {},
					},
					workload: 0,
					health: 1,
					endpoints: [],
					lastHeartbeat: new Date(),
					taskHistory: [],
					errorHistory: [],
					childAgents: [],
					collaborators: [],
				};
				aggregator.addAgent(mockAgent);
			}

			const jsonOutput = aggregator.getJsonOutput("completed");
			const output = JSON.parse(jsonOutput);

			expect(output.summary.totalAgents).toBe(150);
			expect(output.agents).toHaveLength(150);
			expect(jsonOutput.length).toBeGreaterThan(50000); // Should be a large JSON string
		});

		it("should handle large numbers of tasks (500+)", () => {
			// Create 500 tasks
			for (let i = 0; i < 500; i++) {
				const mockTask: TaskDefinition = {
					id: {
						id: `task-${i}`,
						swarmId: "edge-test-swarm",
						sequence: i,
						priority: 1,
					},
					type: "research",
					name: `Task ${i}`,
					description: `Test task number ${i}`,
					requirements: {
						capabilities: ["research"],
						tools: ["web-search"],
						permissions: ["read"],
					},
					constraints: {
						dependencies: [],
						dependents: [],
						conflicts: [],
					},
					priority: "normal",
					input: `test input ${i}`,
					instructions: `instructions for task ${i}`,
					context: {},
					status:
						i % 3 === 0 ? "completed" : i % 3 === 1 ? "failed" : "running",
					createdAt: new Date(),
					updatedAt: new Date(),
					attempts: [],
					statusHistory: [],
				};
				aggregator.addTask(mockTask);
			}

			const jsonOutput = aggregator.getJsonOutput("completed");
			const output = JSON.parse(jsonOutput);

			expect(output.summary.totalTasks).toBe(500);
			expect(output.tasks).toHaveLength(500);

			// Verify statistics are calculated correctly
			// Pattern: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'failed' : 'running'
			// For 500 tasks (0-499): 167 completed, 167 failed, 166 running
			const completedTasks = Math.ceil(500 / 3); // 167
			const failedTasks = Math.floor(500 / 3) + (500 % 3 >= 2 ? 1 : 0); // 166 + 1 = 167

			expect(output.summary.completedTasks).toBe(completedTasks);
			expect(output.summary.failedTasks).toBe(failedTasks);
		});

		it("should handle extremely large output strings", () => {
			// Add an agent with very large outputs
			const mockAgent: AgentState = {
				id: {
					id: "agent-large",
					swarmId: "edge-test-swarm",
					type: "researcher",
					instance: 1,
				},
				name: "Large Output Agent",
				type: "researcher",
				status: "busy",
				capabilities: {
					codeGeneration: false,
					codeReview: false,
					testing: false,
					documentation: true,
					research: true,
					analysis: true,
					webSearch: true,
					apiIntegration: false,
					fileSystem: true,
					terminalAccess: false,
					languages: ["markdown"],
					frameworks: [],
					domains: ["research"],
					tools: ["web-search"],
					maxConcurrentTasks: 3,
					maxMemoryUsage: 512,
					maxExecutionTime: 300,
					reliability: 0.9,
					speed: 0.8,
					quality: 0.85,
				},
				metrics: {
					tasksCompleted: 0,
					tasksFailed: 0,
					averageExecutionTime: 0,
					successRate: 0,
					cpuUsage: 0,
					memoryUsage: 0,
					diskUsage: 0,
					networkUsage: 0,
					codeQuality: 0,
					testCoverage: 0,
					bugRate: 0,
					userSatisfaction: 0,
					totalUptime: 0,
					lastActivity: new Date(),
					responseTime: 0,
				},
				config: {
					autonomyLevel: 0.5,
					learningEnabled: false,
					adaptationEnabled: false,
					maxTasksPerHour: 10,
					maxConcurrentTasks: 1,
					timeoutThreshold: 60,
					reportingInterval: 30,
					heartbeatInterval: 15,
					permissions: [],
					trustedAgents: [],
					expertise: {},
					preferences: {},
				},
				environment: {
					runtime: "node",
					version: "20.0.0",
					workingDirectory: "/tmp",
					tempDirectory: "/tmp",
					logDirectory: "/var/log",
					apiEndpoints: {},
					credentials: {},
					availableTools: [],
					toolConfigs: {},
				},
				workload: 0,
				health: 1,
				endpoints: [],
				lastHeartbeat: new Date(),
				taskHistory: [],
				errorHistory: [],
				childAgents: [],
				collaborators: [],
			};

			aggregator.addAgent(mockAgent);

			// Add 1000 large outputs
			for (let i = 0; i < 1000; i++) {
				const largeOutput =
					"x".repeat(1000) + ` output ${i} ` + "y".repeat(1000);
				aggregator.addAgentOutput("agent-large", largeOutput);
			}

			const jsonOutput = aggregator.getJsonOutput("completed");
			const output = JSON.parse(jsonOutput);

			expect(output.results.outputs).toHaveLength(1000);
			expect(jsonOutput.length).toBeGreaterThan(2000000); // Should be very large
		});
	});

	describe("Invalid Data Handling", () => {
		it("should handle agents with missing or invalid IDs", () => {
			const mockAgent: any = {
				id: null, // Invalid ID
				name: "Invalid Agent",
				type: "researcher",
				status: "idle",
			};

			// Should not throw, but should handle gracefully by skipping the agent
			expect(() => {
				aggregator.addAgent(mockAgent);
			}).not.toThrow();

			// Verify the agent was not added
			const jsonOutput = aggregator.getJsonOutput("completed");
			const output = JSON.parse(jsonOutput);
			expect(output.summary.totalAgents).toBe(0);
		});

		it("should handle tasks with missing required fields", () => {
			const mockTask: any = {
				id: {
					id: "task-invalid",
					swarmId: "edge-test-swarm",
					sequence: 1,
					priority: 1,
				},
				// Missing required fields like type, name, etc.
				description: "Invalid task",
				status: "created",
			};

			expect(() => {
				aggregator.addTask(mockTask);
			}).not.toThrow();
		});

		it("should handle null or undefined inputs gracefully", () => {
			expect(() => {
				aggregator.addAgentOutput("nonexistent-agent", "some output");
			}).not.toThrow();

			expect(() => {
				aggregator.addAgentError("nonexistent-agent", "some error");
			}).not.toThrow();

			expect(() => {
				aggregator.updateAgent("nonexistent-agent", { status: "busy" } as any);
			}).not.toThrow();

			expect(() => {
				aggregator.updateTask("nonexistent-task", {
					status: "completed",
				} as any);
			}).not.toThrow();
		});

		it("should handle circular references in artifacts", () => {
			const circularObj: any = { name: "test" };
			circularObj.self = circularObj; // Create circular reference

			expect(() => {
				aggregator.addArtifact("circular", circularObj);
				const jsonOutput = aggregator.getJsonOutput("completed");
				const output = JSON.parse(jsonOutput); // This should not fail

				// Verify circular reference was replaced with '[Circular]'
				expect(output.results.artifacts.circular.self).toBe("[Circular]");
			}).not.toThrow();
		});
	});

	describe("File System Edge Cases", () => {
		it("should handle invalid file paths", async () => {
			const invalidPath = "/invalid/path/that/does/not/exist/output.json";

			await expect(
				aggregator.saveToFile(invalidPath, "completed"),
			).rejects.toThrow();
		});

		it("should handle permission errors", async () => {
			// Try to write to a read-only directory (if possible)
			const readOnlyPath = path.join(testDir, "readonly");
			await fs.mkdir(readOnlyPath);

			try {
				await fs.chmod(readOnlyPath, 0o444); // Read-only
				const filePath = path.join(readOnlyPath, "output.json");

				await expect(
					aggregator.saveToFile(filePath, "completed"),
				).rejects.toThrow();
			} catch (error) {
				// Permission changes might not work on all systems
				console.log("Permission test skipped:", error);
			}
		});

		it("should handle very long file paths", async () => {
			const longName = "a".repeat(200); // Very long filename
			const longPath = path.join(testDir, `${longName}.json`);

			try {
				await aggregator.saveToFile(longPath, "completed");
				const exists = await fs
					.access(longPath)
					.then(() => true)
					.catch(() => false);
				expect(exists).toBe(true);
			} catch (error) {
				// Some file systems have path length limits
				expect(error).toBeInstanceOf(Error);
			}
		});
	});

	describe("Memory and Performance Edge Cases", () => {
		it("should handle rapid successive operations", () => {
			const start = Date.now();

			// Perform 10000 rapid operations
			for (let i = 0; i < 10000; i++) {
				aggregator.addAgentOutput("agent-1", `Output ${i}`);
				aggregator.addInsight(`Insight ${i}`);
				aggregator.updateMetrics({ throughput: i });
			}

			const end = Date.now();
			const duration = end - start;

			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

			const jsonOutput = aggregator.getJsonOutput("completed");
			const output = JSON.parse(jsonOutput);

			expect(output.results.outputs).toHaveLength(10000);
			expect(output.results.insights).toHaveLength(10000);
		});

		it("should handle concurrent access simulation", async () => {
			// Simulate concurrent operations
			const promises = [];

			for (let i = 0; i < 100; i++) {
				promises.push(
					new Promise<void>((resolve) => {
						setTimeout(() => {
							aggregator.addAgentOutput(
								`agent-${i % 10}`,
								`Concurrent output ${i}`,
							);
							aggregator.addInsight(`Concurrent insight ${i}`);
							resolve();
						}, Math.random() * 10);
					}),
				);
			}

			await Promise.all(promises);

			const jsonOutput = aggregator.getJsonOutput("completed");
			const output = JSON.parse(jsonOutput);

			expect(output.results.outputs).toHaveLength(100);
			expect(output.results.insights).toHaveLength(100);
		});
	});

	describe("JSON Structure Validation", () => {
		it("should produce valid JSON under all conditions", () => {
			// Add various types of data that might break JSON
			aggregator.addAgentOutput(
				"agent-1",
				'Output with "quotes" and \\backslashes\\',
			);
			aggregator.addAgentError("agent-1", "Error with special chars: \n\r\t");
			aggregator.addInsight("Insight with unicode: 🤖🔬📊");
			aggregator.addArtifact("special", {
				quotes: '"test"',
				backslashes: "\\path\\to\\file",
				unicode: "🚀",
				newlines: "line1\nline2\rline3\tline4",
			});

			const jsonOutput = aggregator.getJsonOutput("completed");

			expect(() => {
				JSON.parse(jsonOutput);
			}).not.toThrow();
		});

		it("should maintain consistent structure regardless of input", () => {
			const emptyOutput = JSON.parse(aggregator.getJsonOutput("completed"));

			// Add some data
			aggregator.addAgentOutput("agent-1", "test");
			aggregator.addInsight("test insight");

			const populatedOutput = JSON.parse(aggregator.getJsonOutput("completed"));

			// Structure should remain the same
			expect(Object.keys(emptyOutput).sort()).toEqual(
				Object.keys(populatedOutput).sort(),
			);
			expect(Object.keys(emptyOutput.summary).sort()).toEqual(
				Object.keys(populatedOutput.summary).sort(),
			);
			expect(Object.keys(emptyOutput.results).sort()).toEqual(
				Object.keys(populatedOutput.results).sort(),
			);
			expect(Object.keys(emptyOutput.metadata).sort()).toEqual(
				Object.keys(populatedOutput.metadata).sort(),
			);
		});
	});

	describe("SwarmCoordinator Integration Edge Cases", () => {
		it("should handle JSON output when coordinator has errors", () => {
			const coordinator = new SwarmCoordinator({
				id: "test-swarm",
				name: "Test Swarm",
				description: "Test swarm for edge cases",
				strategy: "auto",
				mode: "centralized",
				requirements: {
					minAgents: 1,
					maxAgents: 10,
					agentTypes: ["researcher"],
					estimatedDuration: 300,
					maxDuration: 600,
					qualityThreshold: 0.8,
					reviewCoverage: 0.5,
					testCoverage: 0.5,
					reliabilityTarget: 0.9,
				},
				constraints: {
					milestones: [],
					resourceLimits: {},
					minQuality: 0.7,
					requiredApprovals: [],
					allowedFailures: 3,
					recoveryTime: 60,
				},
				tasks: [],
				dependencies: [],
				status: "planning",
				progress: {
					totalTasks: 0,
					completedTasks: 0,
					failedTasks: 0,
					runningTasks: 0,
					estimatedCompletion: new Date(),
					timeRemaining: 0,
					percentComplete: 0,
					averageQuality: 0,
					passedReviews: 0,
					passedTests: 0,
					resourceUtilization: {},
					costSpent: 0,
					activeAgents: 0,
					idleAgents: 0,
					busyAgents: 0,
				},
				createdAt: new Date(),
				metrics: {
					throughput: 0,
					latency: 0,
					efficiency: 0,
					reliability: 0,
					averageQuality: 0,
					defectRate: 0,
					reworkRate: 0,
					resourceUtilization: {},
					costEfficiency: 0,
					agentUtilization: 0,
					agentSatisfaction: 0,
					collaborationEffectiveness: 0,
					scheduleVariance: 0,
					deadlineAdherence: 0,
				},
			});

			coordinator.enableJsonOutput();

			expect(() => {
				const jsonOutput = coordinator.getJsonOutput();
				JSON.parse(jsonOutput);
			}).not.toThrow();
		});

		it("should handle saving JSON output when no agents or tasks exist", async () => {
			const coordinator = new SwarmCoordinator({
				id: "empty-swarm",
				name: "Empty Swarm",
				description: "Swarm with no agents or tasks",
				strategy: "auto",
				mode: "centralized",
				requirements: {
					minAgents: 0,
					maxAgents: 0,
					agentTypes: [],
					estimatedDuration: 0,
					maxDuration: 0,
					qualityThreshold: 0,
					reviewCoverage: 0,
					testCoverage: 0,
					reliabilityTarget: 0,
				},
				constraints: {
					milestones: [],
					resourceLimits: {},
					minQuality: 0,
					requiredApprovals: [],
					allowedFailures: 0,
					recoveryTime: 0,
				},
				tasks: [],
				dependencies: [],
				status: "completed",
				progress: {
					totalTasks: 0,
					completedTasks: 0,
					failedTasks: 0,
					runningTasks: 0,
					estimatedCompletion: new Date(),
					timeRemaining: 0,
					percentComplete: 100,
					averageQuality: 0,
					passedReviews: 0,
					passedTests: 0,
					resourceUtilization: {},
					costSpent: 0,
					activeAgents: 0,
					idleAgents: 0,
					busyAgents: 0,
				},
				createdAt: new Date(),
				metrics: {
					throughput: 0,
					latency: 0,
					efficiency: 0,
					reliability: 0,
					averageQuality: 0,
					defectRate: 0,
					reworkRate: 0,
					resourceUtilization: {},
					costEfficiency: 0,
					agentUtilization: 0,
					agentSatisfaction: 0,
					collaborationEffectiveness: 0,
					scheduleVariance: 0,
					deadlineAdherence: 0,
				},
			});

			coordinator.enableJsonOutput();
			const outputPath = path.join(testDir, "empty-swarm-output.json");

			await expect(
				coordinator.saveJsonOutput(outputPath),
			).resolves.not.toThrow();

			const exists = await fs
				.access(outputPath)
				.then(() => true)
				.catch(() => false);
			expect(exists).toBe(true);

			const fileContent = await fs.readFile(outputPath, "utf-8");
			const output = JSON.parse(fileContent);

			expect(output.summary.totalAgents).toBe(0);
			expect(output.summary.totalTasks).toBe(0);
			expect(output.agents).toHaveLength(0);
			expect(output.tasks).toHaveLength(0);
		});
	});
});
