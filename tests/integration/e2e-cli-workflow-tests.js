/**
 * ABOUTME: End-to-end CLI workflow tests covering complete user scenarios and workflow orchestration
 * ABOUTME: Tests realistic user journeys, workflow automation, and comprehensive system integration
 */

import { jest } from "@jest/globals";
import { exec, spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const cliPath = path.join(rootDir, "src/cli/simple-cli.js");

describe("🎯 End-to-End CLI Workflow Tests", () => {
	let testDir;
	let originalCwd;

	beforeEach(async () => {
		originalCwd = process.cwd();
		testDir = path.join(__dirname, `test-e2e-${Date.now()}`);
		await fs.ensureDir(testDir);
		process.chdir(testDir);
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		if (testDir && (await fs.pathExists(testDir))) {
			await fs.remove(testDir);
		}
	});

	describe("🚀 Complete Project Initialization Workflow", () => {
		test("should complete full project setup with all features", async () => {
			// Step 1: Initialize project with full features
			const initResult = await execAsync(
				`node "${cliPath}" init --sparc --hive-mind --memory --github`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 30000,
				},
			);

			expect(initResult.code || 0).toBe(0);
			expect(initResult.stdout).toContain("Claude-Flow initialized");

			// Step 2: Verify directory structure
			const expectedDirs = [".claude", ".hive-mind"];
			for (const dir of expectedDirs) {
				const dirPath = path.join(testDir, dir);
				expect(await fs.pathExists(dirPath)).toBe(true);
			}

			// Step 3: Verify SPARC setup
			const sparcFiles = ["CLAUDE.md", ".roomodes"];
			for (const file of sparcFiles) {
				const filePath = path.join(testDir, file);
				expect(await fs.pathExists(filePath)).toBe(true);
			}

			// Step 4: Test system status after full initialization
			const statusResult = await execAsync(`node "${cliPath}" status`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(statusResult.code || 0).toBe(0);
			expect(statusResult.stdout).toContain("System Status");
		}, 45000);

		test("should handle minimal initialization workflow", async () => {
			// Minimal initialization
			const initResult = await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(initResult.code || 0).toBe(0);

			// Verify basic functionality works
			const memoryResult = await execAsync(
				`node "${cliPath}" memory store "minimal-test" "working"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryResult.code || 0).toBe(0);

			// Verify retrieval
			const retrieveResult = await execAsync(
				`node "${cliPath}" memory retrieve "minimal-test"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(retrieveResult.stdout).toContain("working");
		}, 20000);
	});

	describe("🧠 Hive-Mind Development Workflow", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should complete hive-mind project development workflow", async () => {
			// Step 1: Initialize hive-mind
			const hiveInitResult = await execAsync(
				`node "${cliPath}" hive-mind init`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 20000,
				},
			);

			expect(hiveInitResult.code || 0).toBe(0);

			// Step 2: Store project requirements
			const requirements = [
				{ key: "project-type", value: "web-application" },
				{ key: "framework", value: "react-nodejs" },
				{ key: "database", value: "postgresql" },
				{ key: "authentication", value: "jwt" },
				{ key: "deployment", value: "docker" },
			];

			for (const req of requirements) {
				await execAsync(
					`node "${cliPath}" memory store "${req.key}" "${req.value}"`,
					{
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
					},
				);
			}

			// Step 3: Check hive-mind status
			const statusResult = await execAsync(
				`node "${cliPath}" hive-mind status`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(statusResult.code || 0).toBe(0);

			// Step 4: Spawn development swarm
			const spawnResult = await execAsync(
				`node "${cliPath}" hive-mind spawn "Build web application with React and Node.js" --worker-types "researcher,architect,coder,tester"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 20000,
				},
			);

			expect(spawnResult.code || 0).toBe(0);

			// Step 5: Verify memory contains project context
			const memoryListResult = await execAsync(
				`node "${cliPath}" memory list`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			requirements.forEach(({ key }) => {
				expect(memoryListResult.stdout).toContain(key);
			});
		}, 60000);

		test("should handle consensus-driven decision workflow", async () => {
			// Initialize hive-mind
			await execAsync(`node "${cliPath}" hive-mind init`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
				timeout: 15000,
			});

			// Store decision context
			await execAsync(
				`node "${cliPath}" memory store "decision-context" "Architecture choice for scalability"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Check consensus status
			const consensusResult = await execAsync(
				`node "${cliPath}" hive-mind consensus`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(consensusResult.code || 0).toBe(0);

			// Store decision outcome
			await execAsync(
				`node "${cliPath}" memory store "decision-outcome" "microservices-selected"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Verify decision persistence
			const outcomeResult = await execAsync(
				`node "${cliPath}" memory retrieve "decision-outcome"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(outcomeResult.stdout).toContain("microservices-selected");
		}, 30000);
	});

	describe("🏗️ SPARC Development Methodology Workflow", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --sparc`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
				timeout: 20000,
			});
		});

		test("should complete SPARC-driven development workflow", async () => {
			// Step 1: List available SPARC modes
			const modesResult = await execAsync(`node "${cliPath}" sparc list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(modesResult.code || 0).toBe(0);

			// Step 2: Store specification phase context
			await execAsync(
				`node "${cliPath}" memory store "sparc-phase" "specification"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			await execAsync(
				`node "${cliPath}" memory store "project-spec" "Build REST API with authentication"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Step 3: Execute architecture phase
			await execAsync(
				`node "${cliPath}" memory store "sparc-phase" "architecture"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			await execAsync(
				`node "${cliPath}" memory store "architecture-decisions" "microservices-jwt-postgresql"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Step 4: Move to pseudocode phase
			await execAsync(
				`node "${cliPath}" memory store "sparc-phase" "pseudocode"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Step 5: Create tasks for implementation
			const taskResult = await execAsync(
				`node "${cliPath}" task create "Implement authentication endpoints" --priority high`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(taskResult.code || 0).toBe(0);

			// Step 6: Verify SPARC workflow state
			const phaseResult = await execAsync(
				`node "${cliPath}" memory retrieve "sparc-phase"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(phaseResult.stdout).toContain("pseudocode");

			// Step 7: Check final task status
			const taskStatusResult = await execAsync(`node "${cliPath}" task list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(taskStatusResult.stdout).toContain("authentication");
		}, 35000);
	});

	describe("🤖 Agent Coordination Workflow", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should orchestrate multi-agent development workflow", async () => {
			// Step 1: Define project context
			const projectContext = {
				"project-name": "ai-chat-application",
				"tech-stack": "react-typescript-node-mongodb",
				features: "chat-rooms-authentication-real-time",
				"team-size": "4-agents",
				timeline: "2-weeks",
			};

			// Store project context
			for (const [key, value] of Object.entries(projectContext)) {
				await execAsync(`node "${cliPath}" memory store "${key}" "${value}"`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});
			}

			// Step 2: List available agent types
			const agentTypesResult = await execAsync(`node "${cliPath}" agent list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(agentTypesResult.code || 0).toBe(0);
			expect(agentTypesResult.stdout).toContain("Agent");

			// Step 3: Create coordinated tasks
			const tasks = [
				"Research chat application architecture",
				"Design database schema for chat rooms",
				"Implement authentication system",
				"Build real-time messaging features",
				"Create comprehensive test suite",
			];

			for (const task of tasks) {
				const taskResult = await execAsync(
					`node "${cliPath}" task create "${task}" --priority medium`,
					{
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
					},
				);

				expect(taskResult.code || 0).toBe(0);
			}

			// Step 4: Initialize swarm for coordination
			const swarmResult = await execAsync(
				`node "${cliPath}" swarm init --agents 4 --objective "Build AI chat application"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
					timeout: 20000,
				},
			);

			expect(swarmResult.code || 0).toBe(0);

			// Step 5: Check task coordination status
			const taskStatusResult = await execAsync(
				`node "${cliPath}" task status`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(taskStatusResult.code || 0).toBe(0);

			// Step 6: Verify project context is accessible
			const memoryListResult = await execAsync(
				`node "${cliPath}" memory list`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			Object.keys(projectContext).forEach((key) => {
				expect(memoryListResult.stdout).toContain(key);
			});
		}, 45000);
	});

	describe("📊 Monitoring and Analytics Workflow", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should provide comprehensive system monitoring", async () => {
			// Step 1: Check initial system status
			const initialStatusResult = await execAsync(`node "${cliPath}" status`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(initialStatusResult.code || 0).toBe(0);
			expect(initialStatusResult.stdout).toContain("Status");

			// Step 2: Perform some operations to generate metrics
			const operations = [
				`memory store "metrics-test-1" "value1"`,
				`memory store "metrics-test-2" "value2"`,
				`memory store "metrics-test-3" "value3"`,
				`task create "Monitor test task" --priority low`,
				`agent list`,
			];

			for (const operation of operations) {
				await execAsync(`node "${cliPath}" ${operation}`, {
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				});
			}

			// Step 3: Check memory statistics
			const memoryStatsResult = await execAsync(
				`node "${cliPath}" memory stats`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryStatsResult.code || 0).toBe(0);

			// Step 4: Final system status check
			const finalStatusResult = await execAsync(`node "${cliPath}" status`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(finalStatusResult.code || 0).toBe(0);

			// Step 5: Verify operations completed
			const memoryListResult = await execAsync(
				`node "${cliPath}" memory list`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(memoryListResult.stdout).toContain("metrics-test-1");
			expect(memoryListResult.stdout).toContain("metrics-test-2");
			expect(memoryListResult.stdout).toContain("metrics-test-3");
		}, 30000);
	});

	describe("🔄 Complex Workflow Integration Scenarios", () => {
		beforeEach(async () => {
			await execAsync(`node "${cliPath}" init --minimal`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});
		});

		test("should handle enterprise-level workflow orchestration", async () => {
			// Simulate enterprise development workflow
			const enterpriseWorkflow = [
				// Phase 1: Project Planning
				{
					phase: "planning",
					operations: [
						`memory store "enterprise-project" "large-scale-ecommerce"`,
						`memory store "team-structure" "frontend-backend-devops-qa"`,
						`memory store "timeline" "6-months"`,
						`memory store "budget" "high-budget"`,
					],
				},
				// Phase 2: Architecture Design
				{
					phase: "architecture",
					operations: [
						`memory store "architecture-type" "microservices"`,
						`memory store "database-strategy" "multi-database"`,
						`memory store "deployment-strategy" "kubernetes-docker"`,
						`task create "Design microservices architecture" --priority high`,
					],
				},
				// Phase 3: Team Coordination
				{
					phase: "coordination",
					operations: [
						`swarm init --agents 8 --objective "Build enterprise ecommerce platform"`,
						`task create "Setup CI/CD pipeline" --priority high`,
						`task create "Implement security framework" --priority high`,
						`memory store "coordination-model" "swarm-hive-hybrid"`,
					],
				},
				// Phase 4: Monitoring and Analytics
				{
					phase: "monitoring",
					operations: [
						`status`,
						`memory stats`,
						`task status`,
						`memory store "monitoring-enabled" "comprehensive"`,
					],
				},
			];

			// Execute each phase
			for (const phase of enterpriseWorkflow) {
				// Store phase marker
				await execAsync(
					`node "${cliPath}" memory store "current-phase" "${phase.phase}"`,
					{
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
					},
				);

				// Execute phase operations
				for (const operation of phase.operations) {
					const result = await execAsync(`node "${cliPath}" ${operation}`, {
						cwd: testDir,
						env: { ...process.env, NODE_ENV: "test" },
						timeout: 20000,
					});

					expect(result.code || 0).toBe(0);
				}

				// Small delay between phases
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			// Verify enterprise workflow completion
			const finalStateResult = await execAsync(
				`node "${cliPath}" memory list`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			const expectedKeys = [
				"enterprise-project",
				"team-structure",
				"architecture-type",
				"coordination-model",
				"monitoring-enabled",
				"current-phase",
			];

			expectedKeys.forEach((key) => {
				expect(finalStateResult.stdout).toContain(key);
			});

			// Verify final phase
			const finalPhaseResult = await execAsync(
				`node "${cliPath}" memory retrieve "current-phase"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(finalPhaseResult.stdout).toContain("monitoring");
		}, 90000);

		test("should handle workflow failure recovery and continuation", async () => {
			// Start a workflow
			await execAsync(
				`node "${cliPath}" memory store "workflow-state" "started"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			await execAsync(
				`node "${cliPath}" task create "Critical workflow task" --priority high`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Simulate workflow interruption by storing error state
			await execAsync(
				`node "${cliPath}" memory store "workflow-state" "interrupted"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Recovery: Check workflow state
			const stateResult = await execAsync(
				`node "${cliPath}" memory retrieve "workflow-state"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(stateResult.stdout).toContain("interrupted");

			// Continue workflow from recovery point
			await execAsync(
				`node "${cliPath}" memory store "workflow-state" "recovering"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			await execAsync(
				`node "${cliPath}" task create "Recovery task" --priority high`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Complete workflow
			await execAsync(
				`node "${cliPath}" memory store "workflow-state" "completed"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			// Verify recovery completion
			const finalStateResult = await execAsync(
				`node "${cliPath}" memory retrieve "workflow-state"`,
				{
					cwd: testDir,
					env: { ...process.env, NODE_ENV: "test" },
				},
			);

			expect(finalStateResult.stdout).toContain("completed");

			// Verify tasks were created successfully
			const taskListResult = await execAsync(`node "${cliPath}" task list`, {
				cwd: testDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			expect(taskListResult.stdout).toContain("Critical workflow");
			expect(taskListResult.stdout).toContain("Recovery task");
		}, 40000);
	});
});
