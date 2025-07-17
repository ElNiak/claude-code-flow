/**
 * Progress Indicators Test Suite
 * Tests for real-time progress tracking without artificial delays
 */

import {
	EnhancedCoderAgent,
	EnhancedCoordinatorAgent,
} from "../src/ui/progress/agent-integrations.js";
import { ProgressAwareAgent } from "../src/ui/progress/progress-aware-agent.js";
import {
	createProgressIndicator,
	type ProgressIndicator,
} from "../src/ui/progress/progress-indicator.js";

describe("ProgressIndicator", () => {
	let progress: ProgressIndicator;
	let outputMessages: string[];

	beforeEach(() => {
		outputMessages = [];
		const mockOutput = (message: string) => {
			outputMessages.push(message);
		};

		progress = createProgressIndicator("test", "Test Progress", mockOutput);
	});

	describe("Step Management", () => {
		it("should define and track steps correctly", () => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 0.5 },
				{
					id: "step2",
					name: "Step 2",
					description: "Second step",
					weight: 0.5,
				},
			];

			progress.defineSteps(steps);

			expect(progress.getProgress()).toBe(0);
		});

		it("should calculate progress correctly", () => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 0.3 },
				{
					id: "step2",
					name: "Step 2",
					description: "Second step",
					weight: 0.7,
				},
			];

			progress.defineSteps(steps);

			progress.startStep("step1");
			expect(progress.getProgress()).toBe(0);

			progress.completeStep("step1");
			expect(progress.getProgress()).toBe(30);

			progress.startStep("step2");
			progress.completeStep("step2");
			expect(progress.getProgress()).toBe(100);
		});

		it("should handle step failures correctly", () => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 0.5 },
				{
					id: "step2",
					name: "Step 2",
					description: "Second step",
					weight: 0.5,
				},
			];

			progress.defineSteps(steps);

			progress.startStep("step1");
			progress.failStep("step1", "Test error");

			// Progress should not advance for failed steps
			expect(progress.getProgress()).toBe(0);
		});
	});

	describe("Event Handling", () => {
		it("should emit events for step lifecycle", (done) => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 1.0 },
			];

			progress.defineSteps(steps);

			const events: string[] = [];

			progress.on("step_started", (step) => {
				events.push(`started:${step.id}`);
			});

			progress.on("step_completed", (step) => {
				events.push(`completed:${step.id}`);

				expect(events).toEqual(["started:step1", "completed:step1"]);
				done();
			});

			progress.startStep("step1");
			progress.completeStep("step1");
		});

		it("should emit completion event when all steps done", (done) => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 1.0 },
			];

			progress.defineSteps(steps);

			progress.on("completed", () => {
				expect(progress.getProgress()).toBe(100);
				done();
			});

			progress.startStep("step1");
			progress.completeStep("step1");
		});
	});

	describe("ETA Calculation", () => {
		it("should calculate ETA based on completed steps", async () => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 0.5 },
				{
					id: "step2",
					name: "Step 2",
					description: "Second step",
					weight: 0.5,
				},
			];

			progress.defineSteps(steps);

			progress.startStep("step1");
			await new Promise((resolve) => setTimeout(resolve, 100));
			progress.completeStep("step1");

			const eta = progress.getETA();
			expect(eta).toBeGreaterThan(0);
			expect(eta).toBeLessThan(1000); // Should be reasonable
		});

		it("should return null ETA when no steps completed", () => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 1.0 },
			];

			progress.defineSteps(steps);

			const eta = progress.getETA();
			expect(eta).toBeNull();
		});
	});

	describe("Cancellation", () => {
		it("should handle cancellation correctly", (done) => {
			const steps = [
				{ id: "step1", name: "Step 1", description: "First step", weight: 0.5 },
				{
					id: "step2",
					name: "Step 2",
					description: "Second step",
					weight: 0.5,
				},
			];

			progress.defineSteps(steps);

			progress.on("cancelled", () => {
				expect(progress.getProgress()).toBe(0);
				done();
			});

			progress.startStep("step1");
			progress.cancel();
		});
	});
});

describe("ProgressAwareAgent Integration", () => {
	class TestAgent extends ProgressAwareAgent {
		async testTask(task: any) {
			const steps = this.createStandardSteps("code_generation");

			return this.executeWithProgress(
				task,
				async (progress) => {
					return this.executeSteps(progress, [
						{
							id: "analyze",
							work: async () => ({ analysis: "complete" }),
						},
						{
							id: "design",
							work: async () => ({ design: "complete" }),
						},
						{
							id: "implement",
							work: async () => ({ implementation: "complete" }),
						},
						{
							id: "validate",
							work: async () => ({ validation: "complete" }),
						},
					]);
				},
				steps,
			);
		}
	}

	it("should execute tasks with progress tracking", async () => {
		const agent = new TestAgent({
			name: "Test Agent",
			type: "coder",
			capabilities: ["testing"],
			config: {},
			environment: {},
		});

		agent.configureProgress({ enableProgress: false }); // Disable console output for tests

		const task = {
			name: "Test Task",
			parameters: {},
		};

		const result = await agent.testTask(task);

		expect(result).toHaveLength(4);
		expect(result[0]).toEqual({ analysis: "complete" });
		expect(result[1]).toEqual({ design: "complete" });
		expect(result[2]).toEqual({ implementation: "complete" });
		expect(result[3]).toEqual({ validation: "complete" });
	});
});

describe("Enhanced Agent Integration", () => {
	describe("EnhancedCoderAgent", () => {
		it("should generate code with progress tracking", async () => {
			const agent = new EnhancedCoderAgent({
				name: "Test Coder",
				type: "coder",
				capabilities: ["code_generation"],
				config: {},
				environment: {},
			});

			agent.configureProgress({ enableProgress: false });

			const task = {
				name: "Generate REST API",
				parameters: {
					requirements: {
						features: [
							{ name: "UserService", description: "User management API" },
							{ name: "AuthService", description: "Authentication system" },
						],
					},
				},
			};

			const result = await agent.generateCode(task);

			expect(result).toHaveLength(4); // 4 steps: analyze, design, implement, validate
			expect(result[2]).toHaveProperty("files");
			expect(result[2].files).toHaveLength(4); // 2 features × 2 files each
		});
	});

	describe("EnhancedCoordinatorAgent", () => {
		it("should orchestrate tasks with progress tracking", async () => {
			const agent = new EnhancedCoordinatorAgent({
				name: "Test Coordinator",
				type: "coordinator",
				capabilities: ["task_orchestration"],
				config: {},
				environment: {},
			});

			agent.configureProgress({ enableProgress: false });

			const task = {
				name: "Orchestrate Development",
				parameters: {
					tasks: [
						{ id: "task1", name: "Design API", priority: "high" },
						{ id: "task2", name: "Implement Frontend", priority: "medium" },
					],
				},
			};

			const result = await agent.orchestrateTasks(task);

			expect(result).toHaveLength(4); // 4 steps: setup, orchestrate, monitor, finalize
			expect(result[0]).toHaveProperty("strategy");
			expect(result[0].strategy).toBe("hierarchical");
			expect(result[3]).toHaveProperty("summary");
		});
	});
});

describe("Performance Characteristics", () => {
	it("should complete immediately without artificial delays", async () => {
		const startTime = performance.now();

		const progress = createProgressIndicator(
			"test",
			"Performance Test",
			() => {},
		);

		progress.defineSteps([
			{ id: "step1", name: "Step 1", description: "First step", weight: 0.5 },
			{ id: "step2", name: "Step 2", description: "Second step", weight: 0.5 },
		]);

		progress.startStep("step1");
		progress.completeStep("step1");
		progress.startStep("step2");
		progress.completeStep("step2");

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Should complete in under 10ms (no artificial delays)
		expect(duration).toBeLessThan(10);
		expect(progress.getProgress()).toBe(100);
	});

	it("should handle rapid step transitions", async () => {
		const progress = createProgressIndicator("test", "Rapid Test", () => {});

		const steps = Array.from({ length: 100 }, (_, i) => ({
			id: `step${i}`,
			name: `Step ${i}`,
			description: `Step ${i}`,
			weight: 0.01,
		}));

		progress.defineSteps(steps);

		const startTime = performance.now();

		for (let i = 0; i < 100; i++) {
			progress.startStep(`step${i}`);
			progress.completeStep(`step${i}`);
		}

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Should handle 100 rapid transitions quickly
		expect(duration).toBeLessThan(50);
		expect(progress.getProgress()).toBe(100);
	});
});

describe("Error Handling", () => {
	it("should handle invalid step IDs gracefully", () => {
		const progress = createProgressIndicator("test", "Error Test", () => {});

		progress.defineSteps([
			{ id: "step1", name: "Step 1", description: "First step", weight: 1.0 },
		]);

		expect(() => progress.startStep("invalid")).toThrow(
			"Step invalid not found",
		);
		expect(() => progress.completeStep("invalid")).toThrow(
			"Step invalid not found",
		);
		expect(() => progress.failStep("invalid", "error")).toThrow(
			"Step invalid not found",
		);
	});

	it("should handle step failures without crashing", () => {
		const progress = createProgressIndicator("test", "Failure Test", () => {});

		progress.defineSteps([
			{ id: "step1", name: "Step 1", description: "First step", weight: 1.0 },
		]);

		progress.startStep("step1");
		expect(() => progress.failStep("step1", "Test failure")).not.toThrow();
		expect(progress.getProgress()).toBe(0);
	});
});
