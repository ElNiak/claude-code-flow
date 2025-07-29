import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";
import {
	Config,
	ConfigError,
	ConfigManager,
} from "../../src/cli/commands/config/manager.js";

describe("Preset Configuration System", () => {
	let configManager: ConfigManager;
	let tempConfigPath: string;

	beforeEach(() => {
		configManager = ConfigManager.getInstance();
		tempConfigPath = path.join(process.cwd(), `test-config-${Date.now()}.json`);
	});

	afterEach(async () => {
		try {
			await fs.unlink(tempConfigPath);
		} catch {
			// Ignore if file doesn't exist
		}
	});

	describe("Development Preset", () => {
		test("should load development preset with correct configuration", async () => {
			const devPresetPath = path.join(
				process.cwd(),
				"config/presets/development.json",
			);
			const devConfig = JSON.parse(await fs.readFile(devPresetPath, "utf8"));

			expect(devConfig.name).toBe("development");
			expect(devConfig.ruvSwarm.defaultTopology).toBe("hierarchical");
			expect(devConfig.ruvSwarm.maxAgents).toBe(8);
			expect(devConfig.agents.preferredTypes).toContain("architect");
			expect(devConfig.agents.preferredTypes).toContain("coder");
			expect(devConfig.agents.preferredTypes).toContain("tester");
		});

		test("should have optimized settings for development workflow", async () => {
			const devPresetPath = path.join(
				process.cwd(),
				"config/presets/development.json",
			);
			const devConfig = JSON.parse(await fs.readFile(devPresetPath, "utf8"));

			expect(devConfig.logging.level).toBe("debug");
			expect(devConfig.memory.retentionDays).toBe(14);
			expect(devConfig.coordination.maxRetries).toBe(5);
			expect(devConfig.terminal.commandTimeout).toBe(600000);
		});

		test("should include development-specific workflows", async () => {
			const devPresetPath = path.join(
				process.cwd(),
				"config/presets/development.json",
			);
			const devConfig = JSON.parse(await fs.readFile(devPresetPath, "utf8"));

			expect(devConfig.workflows.apiDevelopment.enabled).toBe(true);
			expect(devConfig.workflows.frontendDevelopment.enabled).toBe(true);
			expect(devConfig.workflows.backendDevelopment.enabled).toBe(true);
			expect(devConfig.workflows.codeReview.enabled).toBe(true);
		});

		test("should configure hooks for development", async () => {
			const devPresetPath = path.join(
				process.cwd(),
				"config/presets/development.json",
			);
			const devConfig = JSON.parse(await fs.readFile(devPresetPath, "utf8"));

			expect(devConfig.hooks.preFileEdit.loadContext).toBe(true);
			expect(devConfig.hooks.postFileEdit.runLinter).toBe(true);
			expect(devConfig.hooks.postFileEdit.formatCode).toBe(true);
		});
	});

	describe("Research Preset", () => {
		test("should load research preset with correct configuration", async () => {
			const researchPresetPath = path.join(
				process.cwd(),
				"config/presets/research.json",
			);
			const researchConfig = JSON.parse(
				await fs.readFile(researchPresetPath, "utf8"),
			);

			expect(researchConfig.name).toBe("research");
			expect(researchConfig.ruvSwarm.defaultTopology).toBe("mesh");
			expect(researchConfig.ruvSwarm.maxAgents).toBe(10);
			expect(researchConfig.agents.preferredTypes).toContain("researcher");
			expect(researchConfig.agents.preferredTypes).toContain("analyst");
		});

		test("should have optimized settings for research workflow", async () => {
			const researchPresetPath = path.join(
				process.cwd(),
				"config/presets/research.json",
			);
			const researchConfig = JSON.parse(
				await fs.readFile(researchPresetPath, "utf8"),
			);

			expect(researchConfig.memory.cacheSizeMB).toBe(500);
			expect(researchConfig.memory.retentionDays).toBe(90);
			expect(researchConfig.terminal.commandTimeout).toBe(900000);
			expect(researchConfig.coordination.resourceTimeout).toBe(300000);
		});

		test("should include research-specific workflows", async () => {
			const researchPresetPath = path.join(
				process.cwd(),
				"config/presets/research.json",
			);
			const researchConfig = JSON.parse(
				await fs.readFile(researchPresetPath, "utf8"),
			);

			expect(researchConfig.workflows.literatureReview.enabled).toBe(true);
			expect(researchConfig.workflows.dataAnalysis.enabled).toBe(true);
			expect(researchConfig.workflows.reportGeneration.enabled).toBe(true);
			expect(researchConfig.workflows.knowledgeExtraction.enabled).toBe(true);
		});
	});

	describe("Deployment Preset", () => {
		test("should load deployment preset with correct configuration", async () => {
			const deploymentPresetPath = path.join(
				process.cwd(),
				"config/presets/deployment.json",
			);
			const deploymentConfig = JSON.parse(
				await fs.readFile(deploymentPresetPath, "utf8"),
			);

			expect(deploymentConfig.name).toBe("deployment");
			expect(deploymentConfig.ruvSwarm.defaultTopology).toBe("hierarchical");
			expect(deploymentConfig.ruvSwarm.maxAgents).toBe(6);
			expect(deploymentConfig.agents.preferredTypes).toContain("deployer");
			expect(deploymentConfig.agents.preferredTypes).toContain("security");
		});

		test("should have optimized settings for deployment workflow", async () => {
			const deploymentPresetPath = path.join(
				process.cwd(),
				"config/presets/deployment.json",
			);
			const deploymentConfig = JSON.parse(
				await fs.readFile(deploymentPresetPath, "utf8"),
			);

			expect(deploymentConfig.coordination.maxRetries).toBe(10);
			expect(deploymentConfig.terminal.commandTimeout).toBe(1800000);
			expect(deploymentConfig.mcp.tlsEnabled).toBe(true);
			expect(deploymentConfig.ruvSwarm.enableNeuralTraining).toBe(false);
		});

		test("should include deployment-specific workflows", async () => {
			const deploymentPresetPath = path.join(
				process.cwd(),
				"config/presets/deployment.json",
			);
			const deploymentConfig = JSON.parse(
				await fs.readFile(deploymentPresetPath, "utf8"),
			);

			expect(deploymentConfig.workflows.cicdPipeline.enabled).toBe(true);
			expect(deploymentConfig.workflows.containerDeployment.enabled).toBe(true);
			expect(deploymentConfig.workflows.securityValidation.enabled).toBe(true);
			expect(deploymentConfig.workflows.performanceMonitoring.enabled).toBe(
				true,
			);
		});

		test("should include security and monitoring features", async () => {
			const deploymentPresetPath = path.join(
				process.cwd(),
				"config/presets/deployment.json",
			);
			const deploymentConfig = JSON.parse(
				await fs.readFile(deploymentPresetPath, "utf8"),
			);

			expect(deploymentConfig.security.scanContainers).toBe(true);
			expect(deploymentConfig.security.validateSecrets).toBe(true);
			expect(deploymentConfig.monitoring.enableMetrics).toBe(true);
			expect(deploymentConfig.monitoring.enableAlerting).toBe(true);
		});
	});

	describe("Preset Validation", () => {
		test("should validate preset structure", async () => {
			const presets = ["development", "research", "deployment"];

			for (const preset of presets) {
				const presetPath = path.join(
					process.cwd(),
					`config/presets/${preset}.json`,
				);
				const presetConfig = JSON.parse(await fs.readFile(presetPath, "utf8"));

				// Validate required fields
				expect(presetConfig.name).toBeDefined();
				expect(presetConfig.description).toBeDefined();
				expect(presetConfig.version).toBeDefined();
				expect(presetConfig.orchestrator).toBeDefined();
				expect(presetConfig.ruvSwarm).toBeDefined();
				expect(presetConfig.agents).toBeDefined();
				expect(presetConfig.workflows).toBeDefined();
			}
		});

		test("should have valid agent configurations", async () => {
			const presets = ["development", "research", "deployment"];

			for (const preset of presets) {
				const presetPath = path.join(
					process.cwd(),
					`config/presets/${preset}.json`,
				);
				const presetConfig = JSON.parse(await fs.readFile(presetPath, "utf8"));

				expect(presetConfig.agents.preferredTypes).toBeInstanceOf(Array);
				expect(presetConfig.agents.preferredTypes.length).toBeGreaterThan(0);
				expect(presetConfig.agents.autoSpawn).toBeDefined();
				expect(presetConfig.agents.autoSpawn.enabled).toBeDefined();
			}
		});

		test("should have valid workflow configurations", async () => {
			const presets = ["development", "research", "deployment"];

			for (const preset of presets) {
				const presetPath = path.join(
					process.cwd(),
					`config/presets/${preset}.json`,
				);
				const presetConfig = JSON.parse(await fs.readFile(presetPath, "utf8"));

				const workflows = Object.values(presetConfig.workflows);
				expect(workflows.length).toBeGreaterThan(0);

				workflows.forEach((workflow: any) => {
					expect(workflow.enabled).toBeDefined();
					expect(workflow.agents).toBeInstanceOf(Array);
					expect(workflow.topology).toBeDefined();
					expect(workflow.strategy).toBeDefined();
				});
			}
		});
	});

	describe("Preset Loading and Merging", () => {
		test("should merge preset with base configuration", async () => {
			// Create a test preset
			const testPreset = {
				orchestrator: {
					maxConcurrentAgents: 15,
				},
				memory: {
					cacheSizeMB: 250,
				},
			};

			await fs.writeFile(tempConfigPath, JSON.stringify(testPreset, null, 2));

			const loadedConfig = await configManager.load(tempConfigPath);

			// Should merge with defaults
			expect(loadedConfig.orchestrator.maxConcurrentAgents).toBe(15);
			expect(loadedConfig.memory.cacheSizeMB).toBe(250);
			expect(loadedConfig.terminal.type).toBe("auto"); // Default value
		});

		test("should validate merged configuration", async () => {
			const invalidPreset = {
				orchestrator: {
					maxConcurrentAgents: 150, // Invalid: too high
				},
			};

			await fs.writeFile(
				tempConfigPath,
				JSON.stringify(invalidPreset, null, 2),
			);

			await expect(configManager.load(tempConfigPath)).rejects.toThrow(
				ConfigError,
			);
		});
	});

	describe("Environment Variable Override", () => {
		test("should override preset values with environment variables", async () => {
			const originalEnv = process.env.CLAUDE_FLOW_MAX_AGENTS;
			process.env.CLAUDE_FLOW_MAX_AGENTS = "12";

			try {
				await configManager.load("config/presets/development.json");
				const config = configManager.show();
				expect(config.orchestrator.maxConcurrentAgents).toBe(12);
			} finally {
				if (originalEnv) {
					process.env.CLAUDE_FLOW_MAX_AGENTS = originalEnv;
				} else {
					delete process.env.CLAUDE_FLOW_MAX_AGENTS;
				}
			}
		});
	});
});
