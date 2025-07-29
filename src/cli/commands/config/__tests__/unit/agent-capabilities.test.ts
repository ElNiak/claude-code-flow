import { beforeEach, describe, expect, test } from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";

describe("Agent Capabilities System", () => {
	let agentCapabilities: any;

	beforeEach(async () => {
		const capabilitiesPath = path.join(
			process.cwd(),
			"config/agent-capabilities.json",
		);
		const capabilitiesContent = await fs.readFile(capabilitiesPath, "utf8");
		agentCapabilities = JSON.parse(capabilitiesContent);
	});

	describe("Agent Type Definitions", () => {
		test("should have all required agent types defined", () => {
			const requiredAgents = [
				"architect",
				"coder",
				"tester",
				"reviewer",
				"researcher",
				"analyst",
				"deployer",
				"coordinator",
			];

			requiredAgents.forEach((agentType) => {
				expect(agentCapabilities.agentTypes[agentType]).toBeDefined();
				expect(agentCapabilities.agentTypes[agentType].name).toBeDefined();
				expect(
					agentCapabilities.agentTypes[agentType].description,
				).toBeDefined();
				expect(
					agentCapabilities.agentTypes[agentType].capabilities,
				).toBeDefined();
			});
		});

		test("should have valid capability levels", () => {
			const validLevels = ["beginner", "intermediate", "advanced", "expert"];

			Object.values(agentCapabilities.agentTypes).forEach((agent: any) => {
				Object.values(agent.capabilities).forEach((capability: any) => {
					expect(validLevels).toContain(capability.level);
					expect(capability.tools).toBeInstanceOf(Array);
					expect(capability.skills).toBeInstanceOf(Array);
				});
			});
		});

		test("should have resource requirements for each agent", () => {
			Object.values(agentCapabilities.agentTypes).forEach((agent: any) => {
				expect(agent.resourceRequirements).toBeDefined();
				expect(agent.resourceRequirements.memory).toMatch(
					/^(low|medium|high)$/,
				);
				expect(agent.resourceRequirements.cpu).toMatch(/^(low|medium|high)$/);
				expect(agent.resourceRequirements.network).toMatch(
					/^(low|medium|high)$/,
				);
			});
		});

		test("should have workflow roles defined", () => {
			Object.values(agentCapabilities.agentTypes).forEach((agent: any) => {
				expect(agent.workflowRoles).toBeInstanceOf(Array);
				expect(agent.workflowRoles.length).toBeGreaterThan(0);
			});
		});

		test("should have preferred topologies", () => {
			const validTopologies = ["mesh", "hierarchical", "ring", "star"];

			Object.values(agentCapabilities.agentTypes).forEach((agent: any) => {
				expect(agent.preferredTopologies).toBeInstanceOf(Array);
				agent.preferredTopologies.forEach((topology: string) => {
					expect(validTopologies).toContain(topology);
				});
			});
		});
	});

	describe("Agent Selection Rules", () => {
		test("should have file type mappings", () => {
			const fileTypeMappings = agentCapabilities.agentSelectionRules.byFileType;

			expect(fileTypeMappings["*.ts"]).toContain("coder");
			expect(fileTypeMappings["*.js"]).toContain("coder");
			expect(fileTypeMappings["*.py"]).toContain("coder");
			expect(fileTypeMappings["*.test.*"]).toContain("tester");
			expect(fileTypeMappings["Dockerfile"]).toContain("deployer");
			expect(fileTypeMappings["package.json"]).toContain("architect");
		});

		test("should have project type mappings", () => {
			const projectTypeMappings =
				agentCapabilities.agentSelectionRules.byProjectType;

			expect(projectTypeMappings.web_application).toContain("architect");
			expect(projectTypeMappings.api_service).toContain("coder");
			expect(projectTypeMappings.data_analysis).toContain("analyst");
			expect(projectTypeMappings.infrastructure).toContain("deployer");
		});

		test("should have workflow phase mappings", () => {
			const workflowPhaseMappings =
				agentCapabilities.agentSelectionRules.byWorkflowPhase;

			expect(workflowPhaseMappings.planning).toContain("architect");
			expect(workflowPhaseMappings.implementation).toContain("coder");
			expect(workflowPhaseMappings.testing).toContain("tester");
			expect(workflowPhaseMappings.deployment).toContain("deployer");
		});
	});

	describe("Coordination Patterns", () => {
		test("should define coordination patterns", () => {
			const patterns = agentCapabilities.coordinationPatterns;

			expect(patterns.parallel).toBeDefined();
			expect(patterns.sequential).toBeDefined();
			expect(patterns.collaborative).toBeDefined();
			expect(patterns.hierarchical).toBeDefined();

			Object.values(patterns).forEach((pattern: any) => {
				expect(pattern.description).toBeDefined();
				expect(pattern.suitableFor).toBeInstanceOf(Array);
				expect(pattern.topologies).toBeInstanceOf(Array);
			});
		});

		test("should have valid topologies in patterns", () => {
			const validTopologies = ["mesh", "hierarchical", "ring", "star"];
			const patterns = agentCapabilities.coordinationPatterns;

			Object.values(patterns).forEach((pattern: any) => {
				pattern.topologies.forEach((topology: string) => {
					expect(validTopologies).toContain(topology);
				});
			});
		});
	});

	describe("Adaptive Rules", () => {
		test("should have project size rules", () => {
			const projectSizeRules = agentCapabilities.adaptiveRules.projectSize;

			expect(projectSizeRules.small).toBeDefined();
			expect(projectSizeRules.medium).toBeDefined();
			expect(projectSizeRules.large).toBeDefined();

			expect(projectSizeRules.small.maxAgents).toBeLessThan(
				projectSizeRules.medium.maxAgents,
			);
			expect(projectSizeRules.medium.maxAgents).toBeLessThan(
				projectSizeRules.large.maxAgents,
			);
		});

		test("should have complexity rules", () => {
			const complexityRules = agentCapabilities.adaptiveRules.complexity;

			expect(complexityRules.low).toBeDefined();
			expect(complexityRules.medium).toBeDefined();
			expect(complexityRules.high).toBeDefined();

			expect(complexityRules.low.agentTypes.length).toBeLessThan(
				complexityRules.medium.agentTypes.length,
			);
			expect(complexityRules.medium.agentTypes.length).toBeLessThan(
				complexityRules.high.agentTypes.length,
			);
		});

		test("should have time constraint rules", () => {
			const timeConstraintRules =
				agentCapabilities.adaptiveRules.timeConstraints;

			expect(timeConstraintRules.urgent).toBeDefined();
			expect(timeConstraintRules.normal).toBeDefined();
			expect(timeConstraintRules.thorough).toBeDefined();

			expect(timeConstraintRules.urgent.parallelism).toBe("maximum");
			expect(timeConstraintRules.thorough.testing).toBe("exhaustive");
		});
	});

	describe("Agent Specializations", () => {
		test("should have specializations for technical agents", () => {
			const coder = agentCapabilities.agentTypes.coder;
			expect(coder.specializations).toContain("frontend");
			expect(coder.specializations).toContain("backend");
			expect(coder.specializations).toContain("fullstack");

			const deployer = agentCapabilities.agentTypes.deployer;
			expect(deployer.specializations).toContain("cloud_deployment");
			expect(deployer.specializations).toContain("container_orchestration");
		});

		test("should have language proficiency for coder agent", () => {
			const coder = agentCapabilities.agentTypes.coder;
			expect(coder.languages).toBeDefined();
			expect(coder.languages.javascript).toBe("expert");
			expect(coder.languages.typescript).toBe("expert");
			expect(coder.languages.python).toBe("advanced");
		});

		test("should have specializations for research agents", () => {
			const researcher = agentCapabilities.agentTypes.researcher;
			expect(researcher.specializations).toContain("academic_research");
			expect(researcher.specializations).toContain("technology_research");

			const analyst = agentCapabilities.agentTypes.analyst;
			expect(analyst.specializations).toContain("statistical_analysis");
			expect(analyst.specializations).toContain("machine_learning");
		});
	});

	describe("Capability Consistency", () => {
		test("should have consistent naming conventions", () => {
			Object.keys(agentCapabilities.agentTypes).forEach((agentType) => {
				expect(agentType).toMatch(/^[a-z]+$/); // lowercase, no spaces
			});
		});

		test("should have unique agent names", () => {
			const agentNames = Object.values(agentCapabilities.agentTypes).map(
				(agent: any) => agent.name,
			);
			const uniqueNames = new Set(agentNames);
			expect(agentNames.length).toBe(uniqueNames.size);
		});

		test("should reference valid agent types in selection rules", () => {
			const validAgentTypes = Object.keys(agentCapabilities.agentTypes);

			const fileTypeRules = agentCapabilities.agentSelectionRules.byFileType;
			Object.values(fileTypeRules).forEach((agents: any) => {
				agents.forEach((agent: string) => {
					expect(validAgentTypes).toContain(agent);
				});
			});
		});
	});

	describe("Integration with Presets", () => {
		test("should align with development preset agent preferences", async () => {
			const devPresetPath = path.join(
				process.cwd(),
				"config/presets/development.json",
			);
			const devPreset = JSON.parse(await fs.readFile(devPresetPath, "utf8"));

			devPreset.agents.preferredTypes.forEach((agentType: string) => {
				expect(agentCapabilities.agentTypes[agentType]).toBeDefined();
			});
		});

		test("should align with research preset agent preferences", async () => {
			const researchPresetPath = path.join(
				process.cwd(),
				"config/presets/research.json",
			);
			const researchPreset = JSON.parse(
				await fs.readFile(researchPresetPath, "utf8"),
			);

			researchPreset.agents.preferredTypes.forEach((agentType: string) => {
				expect(agentCapabilities.agentTypes[agentType]).toBeDefined();
			});
		});

		test("should align with deployment preset agent preferences", async () => {
			const deploymentPresetPath = path.join(
				process.cwd(),
				"config/presets/deployment.json",
			);
			const deploymentPreset = JSON.parse(
				await fs.readFile(deploymentPresetPath, "utf8"),
			);

			deploymentPreset.agents.preferredTypes.forEach((agentType: string) => {
				expect(agentCapabilities.agentTypes[agentType]).toBeDefined();
			});
		});
	});
});
