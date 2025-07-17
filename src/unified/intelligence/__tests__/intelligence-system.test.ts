/**
 * Intelligence System Tests
 * Tests for unified intelligence modules including SPARC, SWARM, and HIVE
 */

import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { Logger } from "../../../core/logger.js";
import type {
	AgentId,
	AgentState,
	SwarmConfig,
	SwarmObjective,
	TaskDefinition,
	TaskId,
} from "../../../swarm/types.js";
import {
	INTELLIGENCE_CAPABILITIES,
	INTELLIGENCE_ENGINES,
	INTELLIGENCE_SELECTION,
	IntelligenceSynthesisEngine,
	ParallelCoordinationEngine,
	StrategicOversightEngine,
	StructuredThinkingEngine,
	UnifiedIntelligenceSystem,
} from "../index.js";

// Mock logger
const mockLogger = {
	info: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
} as any;

// Test data factories
function createMockTask(
	overrides: Partial<TaskDefinition> = {}
): TaskDefinition {
	const baseTask: TaskDefinition = {
		id: {
			id: "task-1",
			swarmId: "swarm-1",
			sequence: 1,
			priority: 1,
		} as TaskId,
		type: "analysis",
		name: "Test Task",
		description: "A test task for intelligence system",
		requirements: {
			agentType: "analyst",
			capabilities: ["analysis"],
			tools: [],
			permissions: [],
		},
		constraints: {
			dependencies: [],
			dependents: [],
			conflicts: [],
			preferredAgents: [],
			excludedAgents: [],
		},
		priority: "normal",
		input: {},
		instructions: "Complete the test task",
		context: {},
		status: "created",
		createdAt: new Date(),
		updatedAt: new Date(),
		attempts: [],
		statusHistory: [],
	};

	return { ...baseTask, ...overrides };
}

function createMockAgent(overrides: Partial<AgentState> = {}): AgentState {
	const baseAgent: AgentState = {
		id: {
			id: "agent-1",
			swarmId: "swarm-1",
			type: "analyst",
			instance: 1,
		} as AgentId,
		name: "Test Agent",
		type: "analyst",
		status: "idle",
		capabilities: {
			codeGeneration: true,
			codeReview: true,
			testing: true,
			documentation: true,
			research: true,
			analysis: true,
			webSearch: false,
			apiIntegration: false,
			fileSystem: true,
			terminalAccess: false,
			languages: ["javascript", "typescript"],
			frameworks: ["node"],
			domains: ["analysis"],
			tools: ["analysis"],
			maxConcurrentTasks: 3,
			maxMemoryUsage: 512,
			maxExecutionTime: 300,
			reliability: 0.95,
			speed: 0.8,
			quality: 0.9,
		},
		config: {
			autonomyLevel: 0.8,
			learningEnabled: true,
			adaptationEnabled: true,
			maxTasksPerHour: 10,
			maxConcurrentTasks: 3,
			timeoutThreshold: 300,
			reportingInterval: 60,
			heartbeatInterval: 30,
			permissions: ["read", "write"],
			trustedAgents: [],
			expertise: {},
			preferences: {},
		},
		environment: {
			runtime: "node",
			version: "18.0.0",
			workingDirectory: "/tmp",
			tempDirectory: "/tmp",
			logDirectory: "/logs",
			apiEndpoints: {},
			credentials: {},
			availableTools: ["analysis"],
			toolConfigs: {},
		},
		metrics: {
			tasksCompleted: 10,
			tasksFailed: 1,
			averageExecutionTime: 5000,
			successRate: 0.91,
			cpuUsage: 0.3,
			memoryUsage: 256,
			diskUsage: 100,
			networkUsage: 50,
			codeQuality: 0.85,
			testCoverage: 0.8,
			bugRate: 0.05,
			userSatisfaction: 0.9,
			totalUptime: Date.now(),
			lastActivity: new Date(),
			responseTime: 150,
		},
		workload: 0.5,
		health: 0.95,
		lastHeartbeat: new Date(),
		currentTasks: [],
		taskHistory: [],
		errorHistory: [],
		collaborators: [],
		childAgents: [],
		endpoints: [],
	};

	return { ...baseAgent, ...overrides };
}

function createMockSwarmObjective(
	overrides: Partial<SwarmObjective> = {}
): SwarmObjective {
	const baseObjective: SwarmObjective = {
		id: "objective-1",
		name: "Test Objective",
		description: "A test swarm objective",
		strategy: "auto",
		mode: "distributed",
		requirements: {
			minAgents: 1,
			maxAgents: 5,
			agentTypes: ["analyst", "coder"],
			estimatedDuration: 300000,
			maxDuration: 600000,
			qualityThreshold: 0.8,
			reviewCoverage: 0.8,
			testCoverage: 0.7,
			reliabilityTarget: 0.9,
		},
		constraints: {
			milestones: [],
			resourceLimits: {},
			minQuality: 0.7,
			requiredApprovals: [],
			allowedFailures: 1,
			recoveryTime: 60000,
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
			timeRemaining: 300000,
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
	};

	return { ...baseObjective, ...overrides };
}

describe("Intelligence System", () => {
	let intelligenceSystem: UnifiedIntelligenceSystem;
	let mockTask: TaskDefinition;
	let mockAgents: AgentState[];
	let mockObjective: SwarmObjective;
	let mockConfig: Partial<SwarmConfig>;

	beforeEach(() => {
		intelligenceSystem = new UnifiedIntelligenceSystem(mockLogger);
		mockTask = createMockTask();
		mockAgents = [
			createMockAgent(),
			createMockAgent({ id: { ...createMockAgent().id, id: "agent-2" } }),
		];
		mockObjective = createMockSwarmObjective();
		mockConfig = { maxAgents: 5, qualityThreshold: 0.8 };
	});

	afterEach(() => {
		intelligenceSystem.cleanup();
		jest.clearAllMocks();
	});

	describe("UnifiedIntelligenceSystem", () => {
		test("should initialize successfully", () => {
			expect(intelligenceSystem).toBeDefined();
			expect(mockLogger.info).toHaveBeenCalledWith(
				"Unified Intelligence System initialized",
				{ engines: ["SPARC", "SWARM", "HIVE", "Synthesis"] }
			);
		});

		test("should apply unified intelligence successfully", async () => {
			const result = await intelligenceSystem.applyIntelligence(
				mockTask,
				mockAgents,
				mockObjective,
				mockConfig
			);

			expect(result).toBeDefined();
			expect(result.synthesized).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.intelligenceUsed).toContain("sparc");
			expect(result.metadata.intelligenceUsed).toContain("coordination");
			expect(result.metadata.intelligenceUsed).toContain("strategic");
		});

		test("should handle errors gracefully", async () => {
			const invalidTask = createMockTask({ description: "" });

			await expect(
				intelligenceSystem.applyIntelligence(
					invalidTask,
					[],
					mockObjective,
					mockConfig
				)
			).rejects.toThrow();
		});

		test("should provide access to individual engines", async () => {
			const sparcResult = await intelligenceSystem.applyStructuredThinking(
				mockTask,
				mockAgents[0]
			);
			expect(sparcResult).toBeDefined();
			expect(sparcResult.quality).toBeGreaterThan(0);

			const swarmResult = await intelligenceSystem.applyParallelCoordination(
				mockTask,
				mockAgents,
				mockConfig
			);
			expect(swarmResult).toBeDefined();
			expect(swarmResult.validated).toBe(true);

			const hiveResult = await intelligenceSystem.applyStrategicOversight(
				mockObjective,
				mockAgents,
				mockConfig
			);
			expect(hiveResult).toBeDefined();
			expect(hiveResult.objectives).toBeDefined();
		});

		test("should provide state information", () => {
			const state = intelligenceSystem.getIntelligenceState();
			expect(state).toBeDefined();
			expect(state.structuredThinking).toBeDefined();
			expect(state.parallelCoordination).toBeDefined();
			expect(state.strategicOversight).toBeDefined();
			expect(state.synthesis).toBeDefined();
		});
	});

	describe("StructuredThinkingEngine", () => {
		let structuredThinking: StructuredThinkingEngine;

		beforeEach(() => {
			structuredThinking = new StructuredThinkingEngine(mockLogger);
		});

		test("should apply structured thinking", async () => {
			const result = await structuredThinking.applyStructuredThinking(
				mockTask,
				mockAgents[0]
			);

			expect(result).toBeDefined();
			expect(result.quality).toBeGreaterThan(0);
			expect(result.metadata.thinkingPattern).toBeDefined();
			expect(result.artifacts).toBeDefined();
		});

		test("should provide thinking patterns", () => {
			const patterns = structuredThinking.getAvailablePatterns();
			expect(patterns).toBeDefined();
			expect(patterns.length).toBeGreaterThan(0);
			expect(patterns[0].name).toBeDefined();
			expect(patterns[0].description).toBeDefined();
		});

		test("should provide SPARC phases", () => {
			const phases = structuredThinking.getSparcPhases();
			expect(phases).toBeDefined();
			expect(phases.length).toBe(5);
			expect(phases.map((p) => p.name)).toEqual([
				"specification",
				"pseudocode",
				"architecture",
				"refinement",
				"completion",
			]);
		});

		test("should handle different complexity levels", async () => {
			const simpleTask = createMockTask({ description: "Simple task" });
			const complexTask = createMockTask({
				description:
					"Complex advanced system integration with multiple dependencies",
				priority: "critical",
			});

			const simpleResult = await structuredThinking.applyStructuredThinking(
				simpleTask,
				mockAgents[0]
			);
			const complexResult = await structuredThinking.applyStructuredThinking(
				complexTask,
				mockAgents[0]
			);

			expect(simpleResult.metadata.complexity).toBe("low");
			expect(complexResult.metadata.complexity).toBe("critical");
		});
	});

	describe("ParallelCoordinationEngine", () => {
		let parallelCoordination: ParallelCoordinationEngine;

		beforeEach(() => {
			parallelCoordination = new ParallelCoordinationEngine(mockLogger);
		});

		test("should apply parallel coordination", async () => {
			const result = await parallelCoordination.applyParallelCoordination(
				mockTask,
				mockAgents,
				mockConfig
			);

			expect(result).toBeDefined();
			expect(result.output.coordination).toBeDefined();
			expect(result.metadata.coordinationStrategy).toBeDefined();
			expect(result.resourcesUsed.nodes).toBe(mockAgents.length);
		});

		test("should provide coordination strategies", () => {
			const strategies = parallelCoordination.getAvailableStrategies();
			expect(strategies).toBeDefined();
			expect(strategies.length).toBeGreaterThan(0);
			expect(strategies[0].name).toBeDefined();
			expect(strategies[0].topology).toBeDefined();
		});

		test("should provide coordination nodes", () => {
			const nodes = parallelCoordination.getCoordinationNodes();
			expect(nodes).toBeDefined();
			// Initially empty until coordination is applied
			expect(Array.isArray(nodes)).toBe(true);
		});

		test("should handle different parallelizability levels", async () => {
			const sequentialTask = createMockTask({
				description: "Sequential dependent task",
			});
			const parallelTask = createMockTask({
				description: "Parallel batch processing task",
			});

			const sequentialResult =
				await parallelCoordination.applyParallelCoordination(
					sequentialTask,
					mockAgents,
					mockConfig
				);
			const parallelResult =
				await parallelCoordination.applyParallelCoordination(
					parallelTask,
					mockAgents,
					mockConfig
				);

			expect(sequentialResult.metadata.parallelizability).toBeLessThan(0.5);
			expect(parallelResult.metadata.parallelizability).toBeGreaterThan(0.5);
		});
	});

	describe("StrategicOversightEngine", () => {
		let strategicOversight: StrategicOversightEngine;

		beforeEach(() => {
			strategicOversight = new StrategicOversightEngine(mockLogger);
		});

		afterEach(() => {
			strategicOversight.cleanup();
		});

		test("should apply strategic oversight", async () => {
			const result = await strategicOversight.applyStrategicOversight(
				mockObjective,
				mockAgents,
				mockConfig
			);

			expect(result).toBeDefined();
			expect(result.guidance).toBeDefined();
			expect(result.objectives).toBeDefined();
			expect(result.insights).toBeDefined();
			expect(result.recommendations).toBeDefined();
		});

		test("should provide strategic state", () => {
			const state = strategicOversight.getStrategicState();
			expect(state).toBeDefined();
			expect(state.context).toBeDefined();
			expect(state.intelligence).toBeDefined();
		});

		test("should handle consensus decisions", async () => {
			const decision = await strategicOversight.proposeConsensusDecision(
				"tactical",
				{
					proposal: "Test proposal",
					description: "Test decision",
				}
			);

			expect(decision).toBeDefined();
			expect(decision.id).toBeDefined();
			expect(decision.type).toBe("tactical");
			expect(decision.result).toBe("pending");

			// Submit votes
			strategicOversight.submitConsensusVote(decision.id, "agent-1", {
				agentId: "agent-1",
				vote: "approve",
				confidence: 0.9,
				timestamp: new Date(),
			});

			strategicOversight.submitConsensusVote(decision.id, "agent-2", {
				agentId: "agent-2",
				vote: "approve",
				confidence: 0.8,
				timestamp: new Date(),
			});

			expect(decision.consensus).toBeGreaterThan(0);
		});
	});

	describe("IntelligenceSynthesisEngine", () => {
		let synthesisEngine: IntelligenceSynthesisEngine;

		beforeEach(() => {
			synthesisEngine = new IntelligenceSynthesisEngine(mockLogger);
		});

		test("should synthesize intelligence from all engines", async () => {
			const result = await synthesisEngine.synthesizeIntelligence(
				mockTask,
				mockAgents,
				mockObjective,
				mockConfig
			);

			expect(result).toBeDefined();
			expect(result.synthesized).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.intelligenceUsed).toEqual([
				"sparc",
				"coordination",
				"strategic",
			]);
			expect(result.synthesized.primaryResult).toBeDefined();
			expect(result.synthesized.alternativeApproaches).toBeDefined();
			expect(result.synthesized.recommendations).toBeDefined();
			expect(result.synthesized.qualityAssessment).toBeDefined();
			expect(result.synthesized.executionPlan).toBeDefined();
		});

		test("should provide synthesis state", () => {
			const state = synthesisEngine.getSynthesisState();
			expect(state).toBeDefined();
			expect(state.engines).toBeDefined();
		});

		test("should handle different synthesis strategies", async () => {
			const highQualityConfig = { ...mockConfig, qualityThreshold: 0.95 };
			const highParallelTask = createMockTask({
				description: "Parallel batch processing multiple data sources",
			});
			const strategicTask = createMockTask({
				description: "Strategic business critical stakeholder decision",
				priority: "critical",
			});

			const qualityResult = await synthesisEngine.synthesizeIntelligence(
				mockTask,
				mockAgents,
				mockObjective,
				highQualityConfig
			);

			const parallelResult = await synthesisEngine.synthesizeIntelligence(
				highParallelTask,
				mockAgents,
				mockObjective,
				mockConfig
			);

			const strategicResult = await synthesisEngine.synthesizeIntelligence(
				strategicTask,
				mockAgents,
				mockObjective,
				mockConfig
			);

			expect(qualityResult.synthesized.primaryResult.type).toContain(
				"thinking"
			);
			expect(parallelResult.synthesized.primaryResult.type).toContain(
				"coordination"
			);
			expect(strategicResult.synthesized.primaryResult.type).toContain(
				"strategic"
			);
		});
	});

	describe("Intelligence Selection", () => {
		test("should select SPARC for high complexity tasks", () => {
			const complexTask = createMockTask({
				description: "Complex advanced system architecture",
				priority: "critical",
			});
			const qualityConfig = { qualityThreshold: 0.95 };

			const selection = INTELLIGENCE_SELECTION.selectOptimalApproach(
				complexTask,
				mockAgents,
				qualityConfig
			);
			expect(selection).toBe(INTELLIGENCE_ENGINES.SPARC);
		});

		test("should select SWARM for parallelizable tasks", () => {
			const parallelTask = createMockTask({
				description: "Parallel batch processing multiple data sources",
			});
			const manyAgents = Array.from({ length: 5 }, (_, i) =>
				createMockAgent({ id: { ...createMockAgent().id, id: `agent-${i}` } })
			);

			const selection = INTELLIGENCE_SELECTION.selectOptimalApproach(
				parallelTask,
				manyAgents,
				mockConfig
			);
			expect(selection).toBe(INTELLIGENCE_ENGINES.SWARM);
		});

		test("should select HIVE for strategic tasks", () => {
			const strategicTask = createMockTask({
				description: "Strategic stakeholder business decision",
				priority: "critical",
			});

			const selection = INTELLIGENCE_SELECTION.selectOptimalApproach(
				strategicTask,
				mockAgents,
				mockConfig
			);
			expect(selection).toBe(INTELLIGENCE_ENGINES.HIVE);
		});

		test("should default to SYNTHESIS for balanced tasks", () => {
			const balancedTask = createMockTask({
				description: "Standard implementation task",
			});

			const selection = INTELLIGENCE_SELECTION.selectOptimalApproach(
				balancedTask,
				mockAgents,
				mockConfig
			);
			expect(selection).toBe(INTELLIGENCE_ENGINES.SYNTHESIS);
		});
	});

	describe("Intelligence Capabilities", () => {
		test("should provide comprehensive capability information", () => {
			expect(
				INTELLIGENCE_CAPABILITIES[INTELLIGENCE_ENGINES.SPARC]
			).toBeDefined();
			expect(
				INTELLIGENCE_CAPABILITIES[INTELLIGENCE_ENGINES.SWARM]
			).toBeDefined();
			expect(
				INTELLIGENCE_CAPABILITIES[INTELLIGENCE_ENGINES.HIVE]
			).toBeDefined();
			expect(
				INTELLIGENCE_CAPABILITIES[INTELLIGENCE_ENGINES.SYNTHESIS]
			).toBeDefined();

			for (const capability of Object.values(INTELLIGENCE_CAPABILITIES)) {
				expect(capability.name).toBeDefined();
				expect(capability.description).toBeDefined();
				expect(capability.strengths).toBeDefined();
				expect(capability.applicability).toBeDefined();
				expect(Array.isArray(capability.strengths)).toBe(true);
				expect(Array.isArray(capability.applicability)).toBe(true);
			}
		});
	});

	describe("Error Handling", () => {
		test("should handle missing task gracefully", async () => {
			const invalidTask = null as any;

			await expect(
				intelligenceSystem.applyIntelligence(
					invalidTask,
					mockAgents,
					mockObjective,
					mockConfig
				)
			).rejects.toThrow();
		});

		test("should handle empty agent list", async () => {
			const result = await intelligenceSystem.applyIntelligence(
				mockTask,
				[],
				mockObjective,
				mockConfig
			);
			expect(result).toBeDefined();
			// Should still work but with limited coordination
		});

		test("should handle invalid configuration", async () => {
			const invalidConfig = { maxAgents: -1, qualityThreshold: 2.0 };

			const result = await intelligenceSystem.applyIntelligence(
				mockTask,
				mockAgents,
				mockObjective,
				invalidConfig
			);
			expect(result).toBeDefined();
			// Should handle invalid values gracefully
		});
	});

	describe("Performance", () => {
		test("should complete synthesis within reasonable time", async () => {
			const startTime = Date.now();

			const result = await intelligenceSystem.applyIntelligence(
				mockTask,
				mockAgents,
				mockObjective,
				mockConfig
			);

			const endTime = Date.now();
			const executionTime = endTime - startTime;

			expect(result).toBeDefined();
			expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
			expect(result.metadata.processingTime).toBeGreaterThan(0);
		});

		test("should handle large agent sets efficiently", async () => {
			const manyAgents = Array.from({ length: 20 }, (_, i) =>
				createMockAgent({ id: { ...createMockAgent().id, id: `agent-${i}` } })
			);

			const startTime = Date.now();

			const result = await intelligenceSystem.applyIntelligence(
				mockTask,
				manyAgents,
				mockObjective,
				{ ...mockConfig, maxAgents: 20 }
			);

			const endTime = Date.now();
			const executionTime = endTime - startTime;

			expect(result).toBeDefined();
			expect(executionTime).toBeLessThan(10000); // Should scale reasonably
		});
	});

	describe("Integration", () => {
		test("should integrate all intelligence types coherently", async () => {
			const complexTask = createMockTask({
				description: "Complex parallel strategic system implementation",
				priority: "critical",
			});

			const result = await intelligenceSystem.applyIntelligence(
				complexTask,
				mockAgents,
				mockObjective,
				{ ...mockConfig, qualityThreshold: 0.9 }
			);

			expect(result).toBeDefined();
			expect(result.sparc).toBeDefined();
			expect(result.coordination).toBeDefined();
			expect(result.strategic).toBeDefined();
			expect(result.synthesized).toBeDefined();

			// Should have coherent recommendations
			expect(result.synthesized.recommendations.length).toBeGreaterThan(0);

			// Should have quality assessment
			expect(result.synthesized.qualityAssessment.overall).toBeGreaterThan(0);
			expect(result.synthesized.qualityAssessment.overall).toBeLessThanOrEqual(
				1
			);

			// Should have execution plan
			expect(result.synthesized.executionPlan.phases.length).toBeGreaterThan(0);
			expect(result.synthesized.executionPlan.timeline).toBeDefined();
		});

		test("should maintain consistency across intelligence types", async () => {
			const result = await intelligenceSystem.applyIntelligence(
				mockTask,
				mockAgents,
				mockObjective,
				mockConfig
			);

			// Quality scores should be consistent
			const qualities = [
				result.sparc?.quality,
				result.coordination?.quality,
				result.synthesized.qualityAssessment.overall,
			].filter((q) => q !== undefined);

			expect(qualities.length).toBeGreaterThan(0);

			const maxQuality = Math.max(...qualities);
			const minQuality = Math.min(...qualities);
			const variance = maxQuality - minQuality;

			// Quality variance should be reasonable (within 0.3)
			expect(variance).toBeLessThan(0.3);
		});
	});
});
