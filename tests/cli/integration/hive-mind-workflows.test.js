/**
 * ABOUTME: Integration tests for hive-mind command workflows using TDD methodology
 * ABOUTME: Tests complete user workflows and cross-command interactions with proper coordination
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
	MockInquirer,
	MockProcessSpawn,
	TDDTestHelper,
	TestFixtures,
} from "../utils/cli-test-utilities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../../..");

describe("🔗 Hive-Mind Integration Workflows (TDD)", () => {
	let hiveMindCommand;
	let mockDatabase;
	let mockInquirer;
	let mockSpawn;
	let cliRunner;

	beforeEach(async () => {
		// Set up mocks
		mockDatabase = MockDatabaseFactory.create({
			agents: [TestFixtures.agents.researcher, TestFixtures.agents.coder],
			memory: [
				TestFixtures.memories.projectConfig,
				TestFixtures.memories.taskData,
			],
			consensus: [TestFixtures.consensus.architecture],
			metrics: [
				TestFixtures.metrics.tasksCompleted,
				TestFixtures.metrics.avgResponseTime,
			],
		});

		mockInquirer = new MockInquirer();
		mockSpawn = new MockProcessSpawn();

		// Mock modules
		jest.unstable_mockModule("better-sqlite3", () => ({
			default: jest.fn().mockImplementation(() => mockDatabase),
		}));

		jest.unstable_mockModule("inquirer", () => mockInquirer.createMock());
		jest.unstable_mockModule("child_process", () => mockSpawn.createMock());

		// Import command after mocking
		const hiveMindModule = await import(
			`${projectRoot}/src/cli/simple-commands/hive-mind.js`
		);
		hiveMindCommand = hiveMindModule.hiveMindCommand;
		cliRunner = new CLITestRunner(hiveMindCommand);
	});

	describe("🔴 RED PHASE - Complete Project Setup Workflow (Should FAIL)", () => {
		test("FAILING: Full project initialization with wizard should set up complete hive", async () => {
			// Set up wizard responses
			mockInquirer.setResponseSequence([
				{ projectType: "web-application", maxAgents: 5 },
				{ enableMetrics: true, enableConsensus: true },
				{ initialAgents: ["researcher", "architect", "coder"] },
				{ confirmSetup: true },
			]);

			// Run initialization workflow
			const result = await cliRunner.run(["init"], {
				wizard: true,
				force: true,
			});

			// Should complete full setup
			expect(result.exitCode).toBe(0);

			// Should create database tables
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("CREATE TABLE IF NOT EXISTS agents"),
			);
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("CREATE TABLE IF NOT EXISTS memory"),
			);
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("CREATE TABLE IF NOT EXISTS consensus"),
			);

			// Should store project configuration
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: "project/config",
					value: expect.stringContaining("web-application"),
				}),
			);

			// Should spawn initial agents
			expect(result.output.allOutput.join("\n")).toContain(
				"🤖 Spawned 3 initial agents",
			);

			// Should show completion message
			expect(result.output.allOutput.join("\n")).toContain(
				"✅ Hive Mind initialized successfully",
			);
		});

		test("FAILING: Agent spawning workflow should coordinate with memory system", async () => {
			// First, spawn a swarm
			const swarmResult = await cliRunner.run(["spawn"], {
				type: "swarm",
				agents: 3,
				strategy: "balanced",
				objective: "Build user authentication system",
			});

			expect(swarmResult.exitCode).toBe(0);

			// Should spawn multiple coordinated agents
			expect(mockSpawn.getSpawnedProcesses()).toHaveLength(3);

			// Each agent should have coordination instructions
			const spawnedProcesses = mockSpawn.getSpawnedProcesses();
			spawnedProcesses.forEach((process) => {
				expect(process.args).toContain("--coordinate");
				expect(process.args).toContain("--objective");
			});

			// Should store swarm coordination data in memory
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: expect.stringMatching(/^swarm:coordination:/),
					value: expect.stringContaining("balanced"),
				}),
			);

			// Should update agent registry
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO agents"),
			);
		});
	});

	describe("🔴 RED PHASE - Memory-Driven Consensus Workflow (Should FAIL)", () => {
		test("FAILING: Consensus building should integrate with memory and agent coordination", async () => {
			// Store initial architectural decision
			await cliRunner.run(["memory", "store"], {
				key: "architecture/database",
				value: JSON.stringify({
					proposal: "postgresql",
					rationale: "Better performance for complex queries",
					proposedBy: "agent-architect-001",
				}),
				namespace: "consensus-proposals",
			});

			// Simulate agent discussions through memory
			await cliRunner.run(["memory", "store"], {
				key: "architecture/database/discussion",
				value: JSON.stringify([
					{
						agent: "agent-coder-001",
						opinion: "agree",
						reasoning: "Good ORM support",
					},
					{
						agent: "agent-tester-001",
						opinion: "neutral",
						reasoning: "Need to consider test setup",
					},
				]),
				namespace: "consensus-discussions",
			});

			// Run consensus check
			const consensusResult = await cliRunner.run(["consensus", "check"], {
				topic: "architecture/database",
				threshold: 0.7,
			});

			expect(consensusResult.exitCode).toBe(0);

			// Should analyze stored discussions
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("SELECT * FROM memory WHERE key LIKE"),
			);

			// Should calculate agreement level
			expect(consensusResult.output.allOutput.join("\n")).toContain(
				"Agreement Level: 67%",
			);

			// Should store consensus result
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					topic: "architecture/database",
					agreement_level: expect.any(Number),
				}),
			);
		});

		test("FAILING: Manual consensus override should trigger agent notifications", async () => {
			mockInquirer.setResponse("decision", "override-approve");
			mockInquirer.setResponse(
				"reasoning",
				"Time constraints require decision",
			);

			const result = await cliRunner.run(["consensus", "manual"], {
				topic: "deployment/strategy",
				notify_agents: true,
			});

			expect(result.exitCode).toBe(0);

			// Should prompt for manual decision
			expect(mockInquirer.getCallHistory()).toHaveLength(1);

			// Should store manual override
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					topic: "deployment/strategy",
					decision_type: "manual_override",
				}),
			);

			// Should notify all active agents
			const activeAgents = mockDatabase.prepare().all();
			expect(mockSpawn.getSpawnedProcesses()).toHaveLength(activeAgents.length);

			// Each notification should include consensus data
			mockSpawn.getSpawnedProcesses().forEach((process) => {
				expect(process.args).toContain("consensus-update");
				expect(process.args).toContain("deployment/strategy");
			});
		});
	});

	describe("🔴 RED PHASE - Continuous Monitoring and Metrics Workflow (Should FAIL)", () => {
		test("FAILING: Agent performance monitoring should influence swarm adjustments", async () => {
			// Start performance monitoring
			const monitorResult = await cliRunner.run(["monitor"], {
				agents: true,
				metrics: ["response_time", "task_completion"],
				interval: "30s",
				alert_threshold: 2.0,
			});

			expect(monitorResult.exitCode).toBe(0);

			// Should start monitoring process
			expect(mockSpawn.getLastProcess().command).toContain("monitor");

			// Simulate performance degradation
			mockDatabase.__setData("metrics", [
				{
					metric: "avg_response_time",
					value: 3.5, // Above threshold
					agent_id: "agent-coder-001",
					timestamp: Date.now(),
				},
			]);

			// Check metrics and trigger optimization
			const optimizeResult = await cliRunner.run(["optimize"], {
				based_on_metrics: true,
				auto_adjust: true,
			});

			expect(optimizeResult.exitCode).toBe(0);

			// Should analyze performance metrics
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("SELECT * FROM metrics WHERE metric ="),
			);

			// Should identify underperforming agents
			expect(optimizeResult.output.allOutput.join("\n")).toContain(
				"⚠️ Performance issue detected: agent-coder-001",
			);

			// Should suggest or implement optimizations
			expect(optimizeResult.output.allOutput.join("\n")).toContain(
				"🔧 Optimization applied: redistribute workload",
			);

			// Should store optimization actions
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: expect.stringMatching(/^optimization:/),
					value: expect.stringContaining("redistribute_workload"),
				}),
			);
		});

		test("FAILING: Metrics collection should trigger adaptive swarm topology changes", async () => {
			// Set up initial mesh topology
			await cliRunner.run(["topology", "set"], {
				type: "mesh",
				agents: ["agent-1", "agent-2", "agent-3"],
			});

			// Simulate communication overhead metrics
			mockDatabase.__setData("metrics", [
				{
					metric: "communication_overhead",
					value: 0.85, // High overhead
					timestamp: Date.now(),
				},
				{
					metric: "coordination_efficiency",
					value: 0.45, // Low efficiency
					timestamp: Date.now(),
				},
			]);

			// Run adaptive topology analysis
			const adaptResult = await cliRunner.run(["topology", "adapt"], {
				auto_optimize: true,
				metrics_threshold: 0.7,
			});

			expect(adaptResult.exitCode).toBe(0);

			// Should analyze current topology performance
			expect(adaptResult.output.allOutput.join("\n")).toContain(
				"📊 Analyzing topology performance",
			);

			// Should recommend topology change
			expect(adaptResult.output.allOutput.join("\n")).toContain(
				"💡 Recommending topology change: mesh → hierarchical",
			);

			// Should implement topology change
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: "topology/current",
					value: expect.stringContaining("hierarchical"),
				}),
			);

			// Should reconfigure agent connections
			expect(mockSpawn.getSpawnedProcesses().length).toBeGreaterThan(0);
			expect(mockSpawn.getLastProcess().args).toContain("reconfigure-topology");
		});
	});

	describe("🔴 RED PHASE - Complex Multi-Agent Task Coordination (Should FAIL)", () => {
		test("FAILING: Task delegation workflow should coordinate multiple agents with dependencies", async () => {
			// Define a complex task with dependencies
			const complexTask = {
				id: "task-complex-001",
				title: "Build Authentication System",
				subtasks: [
					{ id: "auth-design", type: "architect", depends_on: [] },
					{ id: "auth-backend", type: "coder", depends_on: ["auth-design"] },
					{ id: "auth-frontend", type: "coder", depends_on: ["auth-design"] },
					{
						id: "auth-tests",
						type: "tester",
						depends_on: ["auth-backend", "auth-frontend"],
					},
				],
			};

			// Submit complex task
			const taskResult = await cliRunner.run(["task", "submit"], {
				definition: JSON.stringify(complexTask),
				auto_assign: true,
				coordinate: true,
			});

			expect(taskResult.exitCode).toBe(0);

			// Should analyze task dependencies
			expect(taskResult.output.allOutput.join("\n")).toContain(
				"📋 Analyzing task dependencies",
			);

			// Should assign agents based on type and availability
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					task_id: "auth-design",
					assigned_to: expect.stringMatching(/agent-architect-/),
				}),
			);

			// Should create coordination plan
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: "coordination/task-complex-001",
					value: expect.stringContaining("dependency_graph"),
				}),
			);

			// Should notify agents of their assignments
			expect(mockSpawn.getSpawnedProcesses()).toHaveLength(4); // One for each subtask

			mockSpawn.getSpawnedProcesses().forEach((process, index) => {
				expect(process.args).toContain("task-assignment");
				expect(process.args).toContain(complexTask.subtasks[index].id);
			});
		});

		test("FAILING: Agent collaboration should handle real-time communication and conflict resolution", async () => {
			// Simulate concurrent agents working on related tasks
			const collaboration = await cliRunner.run(["collaborate"], {
				agents: ["agent-coder-001", "agent-coder-002"],
				task: "shared-component-development",
				conflict_resolution: "consensus",
				real_time: true,
			});

			expect(collaboration.exitCode).toBe(0);

			// Should establish communication channels
			expect(collaboration.output.allOutput.join("\n")).toContain(
				"🔗 Establishing communication channels",
			);

			// Should monitor for conflicts
			expect(mockSpawn.getLastProcess().args).toContain("conflict-monitor");

			// Simulate a conflict (both agents editing same file)
			await cliRunner.run(["conflict", "simulate"], {
				agents: ["agent-coder-001", "agent-coder-002"],
				resource: "src/auth/middleware.js",
				type: "edit_conflict",
			});

			// Should detect and resolve conflict
			const resolveResult = await cliRunner.run(["conflict", "resolve"], {
				conflict_id: "edit_conflict_001",
				method: "consensus",
			});

			expect(resolveResult.exitCode).toBe(0);

			// Should initiate consensus process
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO consensus"),
			);

			// Should notify agents of resolution
			expect(mockSpawn.getSpawnedProcesses().length).toBeGreaterThan(2);

			// Should store resolution for future reference
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: "conflicts/resolved/edit_conflict_001",
					value: expect.stringContaining("consensus_resolution"),
				}),
			);
		});
	});

	describe("🔴 RED PHASE - Emergency Scenarios and Recovery (Should FAIL)", () => {
		test("FAILING: Agent failure should trigger automatic recovery and rebalancing", async () => {
			// Simulate agent failure
			const failureResult = await cliRunner.run(["simulate", "failure"], {
				agent: "agent-coder-001",
				type: "crash",
				during_task: "auth-backend",
			});

			expect(failureResult.exitCode).toBe(0);

			// Should detect failure
			expect(failureResult.output.allOutput.join("\n")).toContain(
				"🚨 Agent failure detected: agent-coder-001",
			);

			// Should trigger recovery workflow
			const recoveryResult = await cliRunner.run(["recover"], {
				failed_agent: "agent-coder-001",
				auto_reassign: true,
				preserve_context: true,
			});

			expect(recoveryResult.exitCode).toBe(0);

			// Should spawn replacement agent
			expect(mockSpawn.getSpawnedProcesses()).toHaveLength(1);
			expect(mockSpawn.getLastProcess().args).toContain("--replace");
			expect(mockSpawn.getLastProcess().args).toContain("agent-coder-001");

			// Should transfer task context
			expect(mockDatabase.prepare).toHaveBeenCalledWith(
				expect.stringContaining("SELECT * FROM memory WHERE key LIKE"),
			);

			// Should update agent registry
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.stringMatching(/agent-coder-\d+/),
					status: "active",
					replaced_agent: "agent-coder-001",
				}),
			);

			// Should notify other agents of change
			expect(recoveryResult.output.allOutput.join("\n")).toContain(
				"📢 Notifying swarm of agent replacement",
			);
		});

		test("FAILING: Database corruption should trigger backup restoration workflow", async () => {
			// Simulate database corruption
			mockDatabase.__setError(
				new Error("SQLITE_CORRUPT: database disk image is malformed"),
			);

			// Attempt operation that detects corruption
			const corruptResult = await cliRunner.run(["status"], {});

			expect(corruptResult.exitCode).toBe(1);
			expect(corruptResult.output.errors.join("\n")).toContain(
				"Database corruption detected",
			);

			// Should trigger automatic recovery
			const recoveryResult = await cliRunner.run(["recover", "database"], {
				auto_restore: true,
				backup_source: "latest",
			});

			expect(recoveryResult.exitCode).toBe(0);

			// Should locate latest backup
			expect(recoveryResult.output.allOutput.join("\n")).toContain(
				"🔍 Locating latest backup",
			);

			// Should restore from backup
			expect(recoveryResult.output.allOutput.join("\n")).toContain(
				"♻️ Restoring from backup",
			);

			// Should validate restored database
			expect(recoveryResult.output.allOutput.join("\n")).toContain(
				"✅ Database integrity verified",
			);

			// Should restart affected agents
			expect(mockSpawn.getSpawnedProcesses()).toHaveLength(2); // As per test fixtures

			// Should log recovery actions
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: expect.stringMatching(/^recovery:/),
					value: expect.stringContaining("database_restored"),
				}),
			);
		});
	});

	describe("🔴 RED PHASE - Performance and Scalability Workflows (Should FAIL)", () => {
		test("FAILING: High-load scenario should trigger intelligent scaling", async () => {
			// Simulate high task load
			const loadTest = await cliRunner.run(["load-test"], {
				concurrent_tasks: 50,
				duration: "5m",
				ramp_up: "30s",
			});

			expect(loadTest.exitCode).toBe(0);

			// Should monitor system resources
			expect(loadTest.output.allOutput.join("\n")).toContain(
				"📊 Monitoring system resources",
			);

			// Should detect performance degradation
			expect(loadTest.output.allOutput.join("\n")).toContain(
				"⚠️ Performance degradation detected",
			);

			// Should trigger auto-scaling
			const scaleResult = await cliRunner.run(["scale"], {
				based_on_load: true,
				max_agents: 10,
				strategy: "adaptive",
			});

			expect(scaleResult.exitCode).toBe(0);

			// Should spawn additional agents
			expect(mockSpawn.getSpawnedProcesses().length).toBeGreaterThan(2);

			// Should redistribute tasks
			expect(scaleResult.output.allOutput.join("\n")).toContain(
				"🔄 Redistributing tasks across scaled swarm",
			);

			// Should update topology for efficiency
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					key: "topology/scaled",
					value: expect.stringContaining("adaptive_hierarchical"),
				}),
			);

			// Should track scaling metrics
			expect(mockDatabase.prepare().run).toHaveBeenCalledWith(
				expect.objectContaining({
					metric: "scaling_event",
					value: expect.any(Number),
					metadata: expect.stringContaining("load_triggered"),
				}),
			);
		});
	});
});
