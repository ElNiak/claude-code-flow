/**
 * Claude Swarm Mode - Self-orchestrating agent swarms using claude-flow
 */

import { promises as fs } from "node:fs";
import { spawn } from "child_process";
import { BackgroundExecutor } from "../../coordination/background-executor.js";
import { SwarmCoordinator } from "../../coordination/swarm-coordinator.js";
import { SwarmMemoryManager } from "../../memory/swarm-memory.js";
import { getErrorMessage } from "../../utils/error-handler.js";
import { generateId } from "../../utils/helpers.js";
import type { CommandContext } from "../cli-core.js";
import { _error as error, info, success, warning } from "../cli-core.js";

// Type definitions for Promise results
interface ProcessResult {
	success: boolean;
}

interface ExecutionResult {
	code: number;
	stdout: string;
	stderr: string;
}
export async function swarmAction(ctx: CommandContext): Promise<void> {
	// First check if help is requested,
	if (ctx.flags.help || ctx.flags.h) {
		// Show help is handled by the CLI framework,
		return;
	}

	// Check Node.js environment variables for configuration
	const envMaxAgents = process.env.CLAUDE_FLOW_MAX_AGENTS
		? parseInt(process.env.CLAUDE_FLOW_MAX_AGENTS, 10)
		: null;
	const envStrategy = process.env.CLAUDE_FLOW_STRATEGY || null;
	const envMemoryNamespace = process.env.CLAUDE_FLOW_MEMORY_NAMESPACE || null;
	const envTimeout = process.env.CLAUDE_FLOW_TIMEOUT
		? parseInt(process.env.CLAUDE_FLOW_TIMEOUT, 10)
		: null;

	// Parse command line arguments for additional context
	const processArgs = process.argv.slice(2);
	const commandIndex = processArgs.indexOf("swarm");
	const swarmArgs =
		commandIndex >= 0 ? processArgs.slice(commandIndex + 1) : [];

	// The objective should be all the non-flag arguments joined together,
	const objective = ctx.args.join(" ").trim();

	if (!objective) {
		error("Usage: swarm <objective>");
		console.log("\nExamples:");
		console.log('  claude-flow swarm "Build a REST API"');
		console.log('  claude-flow swarm "Research cloud architecture"');
		console.log("\nOptions:");
		console.log(
			"  --dry-run              Show configuration without executing"
		);
		console.log(
			"  --strategy <type>      Strategy: auto, research, development, analysis"
		);
		console.log(
			"  --max-agents <n>       Maximum number of agents (default: 5)"
		);
		console.log("  --timeout <minutes>    Timeout in minutes (default: 60)");
		console.log("  --research             Enable research capabilities");
		console.log("  --parallel             Enable parallel execution");
		console.log("  --review               Enable peer review between agents");
		console.log("  --monitor              Enable real-time monitoring");
		console.log(
			"  --ui                   Use blessed terminal UI (requires node.js)"
		);
		console.log("  --background           Run swarm in background mode");
		console.log("  --distributed          Enable distributed coordination");
		console.log(
			"  --memory-namespace     Memory namespace for swarm (default: swarm)"
		);
		console.log(
			"  --persistence          Enable task persistence (default: true)"
		);
		return;
	}

	// Validate strategy type
	const strategyInput = (ctx.flags.strategy as string) || "auto";
	const validStrategies = [
		"auto",
		"research",
		"development",
		"analysis",
	] as const;
	const strategy = validStrategies.includes(strategyInput as any)
		? (strategyInput as (typeof validStrategies)[number])
		: "auto";

	const options = {
		strategy: strategy || envStrategy || "auto",
		maxAgents:
			(ctx.flags.maxAgents
				? parseInt(ctx.flags.maxAgents as string, 10)
				: undefined) ||
			(ctx.flags["max-agents"]
				? parseInt(ctx.flags["max-agents"] as string, 10)
				: undefined) ||
			envMaxAgents ||
			5,
		maxDepth:
			(ctx.flags.maxDepth as number) || (ctx.flags["max-depth"] as number) || 3,
		research: (ctx.flags.research as boolean) || false,
		parallel: (ctx.flags.parallel as boolean) || false,
		memoryNamespace:
			(ctx.flags.memoryNamespace as string) ||
			(ctx.flags["memory-namespace"] as string) ||
			envMemoryNamespace ||
			"swarm",
		timeout: (ctx.flags.timeout as number) || envTimeout || 60,
		review: (ctx.flags.review as boolean) || false,
		coordinator: (ctx.flags.coordinator as boolean) || false,
		config: (ctx.flags.config as string) || (ctx.flags.c as string),
		verbose:
			(ctx.flags.verbose as boolean) || (ctx.flags.v as boolean) || false,
		dryRun:
			(ctx.flags.dryRun as boolean) ||
			(ctx.flags["dry-run"] as boolean) ||
			(ctx.flags.d as boolean) ||
			false,
		monitor: (ctx.flags.monitor as boolean) || false,
		ui: (ctx.flags.ui as boolean) || false,
		background: (ctx.flags.background as boolean) || false,
		persistence: (ctx.flags.persistence as boolean) || true,
		distributed: (ctx.flags.distributed as boolean) || false,
	};

	const swarmId = generateId("swarm");

	if (options.dryRun) {
		warning("DRY RUN - Swarm Configuration:");
		console.log(`Swarm ID: ${swarmId}`);
		console.log(`Objective: ${objective}`);
		console.log(`Strategy: ${options.strategy}`);
		console.log(`Max Agents: ${options.maxAgents}`);
		console.log(`Max Depth: ${options.maxDepth}`);
		console.log(`Research: ${options.research}`);
		console.log(`Parallel: ${options.parallel}`);
		console.log(`Review Mode: ${options.review}`);
		console.log(`Coordinator: ${options.coordinator}`);
		console.log(`Memory Namespace: ${options.memoryNamespace}`);
		console.log(`Timeout: ${options.timeout} minutes`);
		console.log(`Node.js Version: ${process.version}`);
		console.log(`Process ID: ${process.pid}`);
		console.log(`Command Args: ${swarmArgs.join(" ")}`);
		console.log(
			`Environment Variables Used: ${Object.keys(process.env)
				.filter((k) => k.startsWith("CLAUDE_FLOW_"))
				.join(", ")}`
		);
		return;
	}

	// If UI mode is requested, use the blessed UI version,
	if (options.ui) {
		try {
			const scriptPath = new URL(import.meta.url).pathname;
			const projectRoot = scriptPath.substring(0, scriptPath.indexOf("/src/"));
			const uiScriptPath = `${projectRoot}/src/cli/simple-commands/swarm-ui.js`;

			// Check if the UI script exists,
			try {
				await fs.stat(uiScriptPath);
			} catch {
				warning("Swarm UI script not found. Falling back to standard mode.");
				options.ui = false;
			}

			if (options.ui) {
				return new Promise<void>((resolve, reject) => {
					const child = spawn("node", [uiScriptPath], {
						stdio: "inherit",
					});

					child.on("close", (code) => {
						if (code !== 0) {
							error(`Swarm UI exited with code ${code}`);
						}
						resolve();
					});

					child.on("error", (err) => {
						error(`Failed to launch UI: ${err.message}`);
						resolve();
					});
				});
			}
		} catch (err) {
			warning(`Failed to launch blessed UI: ${(err as Error).message}`);
			console.log("Falling back to standard mode...");
			options.ui = false;
		}
	}

	success(`🐝 Initializing Claude Swarm: ${swarmId}`);
	console.log(`📋 Objective: ${objective}`);
	console.log(`🎯 Strategy: ${options.strategy}`);

	try {
		// Initialize swarm coordination system,
		const coordinator = new SwarmCoordinator({
			maxAgents: options.maxAgents,
			maxConcurrentTasks: options.parallel ? options.maxAgents : 1,
			taskTimeout: options.timeout * 60 * 1000, // Convert minutes to milliseconds,
			enableMonitoring: options.monitor,
			enableWorkStealing: options.parallel,
			enableCircuitBreaker: true,
			memoryNamespace: options.memoryNamespace,
			coordinationStrategy: options.distributed ? "distributed" : "centralized",
		});

		// Initialize background executor,
		const executor = new BackgroundExecutor({
			maxConcurrentTasks: options.maxAgents,
			defaultTimeout: options.timeout * 60 * 1000,
			logPath: `./swarm-runs/${swarmId}/background-tasks`,
			enablePersistence: options.persistence,
		});

		// Initialize swarm memory,
		const memory = new SwarmMemoryManager({
			namespace: options.memoryNamespace,
			enableDistribution: options.distributed,
			enableKnowledgeBase: true,
			persistencePath: `./swarm-runs/${swarmId}/memory`,
		});

		// Start all systems,
		await coordinator.start();
		await executor.start();
		await memory.initialize();

		// Create swarm tracking directory,
		const swarmDir = `./swarm-runs/${swarmId}`;
		await fs.mkdir(swarmDir, { recursive: true });

		// Create objective in coordinator,
		const objectiveId = await coordinator.createObjective(
			objective,
			options.strategy
		);

		console.log(`\n📝 Objective created with ID: ${objectiveId}`);

		// Register agents based on strategy,
		const agentTypes = getAgentTypesForStrategy(options.strategy);
		const agents = [];

		for (let i = 0; i < Math.min(options.maxAgents, agentTypes.length); i++) {
			const agentType = agentTypes[i % agentTypes.length];
			const agentId = await coordinator.registerAgent(
				`${agentType}-${i + 1}`,
				agentType,
				getCapabilitiesForType(agentType)
			);
			agents.push(agentId);
			console.log(`  🤖 Registered ${agentType} agent: ${agentId}`);
		}

		// Write swarm configuration,
		await fs.writeFile(
			`${swarmDir}/config.json`,
			JSON.stringify(
				{
					swarmId,
					objectiveId,
					objective,
					options,
					agents,
					startTime: new Date().toISOString(),
				},
				null,
				2
			)
		);

		// Start objective execution,
		await coordinator.executeObjective(objectiveId);
		console.log(`\n🚀 Swarm execution started...`);

		if (options.background) {
			console.log(
				`Running in background mode. Check status with: claude-flow swarm status ${swarmId}`
			);

			// Save coordinator state and exit,
			await fs.writeFile(
				`${swarmDir}/coordinator.json`,
				JSON.stringify(
					{
						coordinatorRunning: true,
						pid: process.pid,
						startTime: new Date().toISOString(),
					},
					null,
					2
				)
			);
		} else {
			// Wait for completion in foreground,
			await waitForObjectiveCompletion(coordinator, objectiveId, options);

			// Write completion status,
			await fs.writeFile(
				`${swarmDir}/status.json`,
				JSON.stringify(
					{
						status: "completed",
						endTime: new Date().toISOString(),
					},
					null,
					2
				)
			);

			// Show summary,
			const swarmStatus = coordinator.getSwarmStatus();
			console.log(`\n📊 Swarm Summary:`);
			console.log(`  - Objectives: ${swarmStatus.objectives}`);
			console.log(`  - Tasks Completed: ${swarmStatus.tasks.completed}`);
			console.log(`  - Tasks Failed: ${swarmStatus.tasks.failed}`);
			console.log(`  - Agents Used: ${swarmStatus.agents.total}`);
			console.log(`  - Results saved to: ${swarmDir}`);

			success(`\n✅ Swarm ${swarmId} completed successfully`);
		}

		// Cleanup,
		if (!options.background) {
			await coordinator.stop();
			await executor.stop();
			await memory.shutdown();
		}
	} catch (err) {
		error(`Failed to execute swarm: ${(err as Error).message}`);
	}
}

/**
 * Decompose objective into subtasks based on strategy
 */
async function decomposeObjective(
	objective: string,
	options: any
): Promise<any[]> {
	const subtasks = [];

	switch (options.strategy) {
		case "research":
			subtasks.push(
				{
					type: "research",
					description: `Research background information on: ${objective}`,
				},
				{
					type: "analysis",
					description: `Analyze findings and identify key patterns`,
				},
				{
					type: "synthesis",
					description: `Synthesize research into actionable insights`,
				}
			);
			break;

		case "development":
			subtasks.push(
				{
					type: "planning",
					description: `Plan architecture and design for: ${objective}`,
				},
				{ type: "implementation", description: `Implement core functionality` },
				{ type: "testing", description: `Test and validate implementation` },
				{ type: "documentation", description: `Document the solution` }
			);
			break;

		case "analysis":
			subtasks.push(
				{
					type: "data-gathering",
					description: `Gather relevant data for: ${objective}`,
				},
				{ type: "analysis", description: `Perform detailed analysis` },
				{
					type: "visualization",
					description: `Create visualizations and reports`,
				}
			);
			break;

		default: // auto
			// Analyze objective to determine best approach,
			if (
				objective.toLowerCase().includes("build") ||
				objective.toLowerCase().includes("create")
			) {
				subtasks.push(
					{ type: "planning", description: `Plan solution for: ${objective}` },
					{ type: "implementation", description: `Implement the solution` },
					{ type: "testing", description: `Test and validate` }
				);
			} else if (
				objective.toLowerCase().includes("research") ||
				objective.toLowerCase().includes("analyze")
			) {
				subtasks.push(
					{ type: "research", description: `Research: ${objective}` },
					{ type: "analysis", description: `Analyze findings` },
					{ type: "report", description: `Generate report` }
				);
			} else {
				subtasks.push(
					{
						type: "exploration",
						description: `Explore requirements for: ${objective}`,
					},
					{ type: "execution", description: `Execute main tasks` },
					{ type: "validation", description: `Validate results` }
				);
			}
	}

	return subtasks;
}

/**
 * Execute tasks in parallel
 */
async function executeParallelTasks(
	tasks: any[],
	options: any,
	swarmId: string,
	swarmDir: string
) {
	const promises = tasks.map(async (task, index) => {
		const agentId = generateId("agent");
		console.log(`  🤖 Spawning agent ${agentId} for: ${task.type}`);

		// Create agent directory,
		const agentDir = `${swarmDir}/agents/${agentId}`;
		await fs.mkdir(agentDir, { recursive: true });

		// Write agent task,
		await fs.writeFile(
			`${agentDir}/task.json`,
			JSON.stringify(
				{
					agentId,
					swarmId,
					task,
					status: "active",
					startTime: new Date().toISOString(),
				},
				null,
				2
			)
		);

		// Execute agent task,
		await executeAgentTask(agentId, task, options, agentDir);

		// Update status,
		await fs.writeFile(
			`${agentDir}/status.json`,
			JSON.stringify(
				{
					status: "completed",
					endTime: new Date().toISOString(),
				},
				null,
				2
			)
		);

		console.log(`  ✅ Agent ${agentId} completed: ${task.type}`);
	});

	await Promise.all(promises);
}

/**
 * Execute tasks sequentially
 */
async function executeSequentialTasks(
	tasks: any[],
	options: any,
	swarmId: string,
	swarmDir: string
) {
	for (const [index, task] of tasks.entries()) {
		const agentId = generateId("agent");
		console.log(`  🤖 Spawning agent ${agentId} for: ${task.type}`);

		// Create agent directory,
		const agentDir = `${swarmDir}/agents/${agentId}`;
		await fs.mkdir(agentDir, { recursive: true });

		// Write agent task,
		await fs.writeFile(
			`${agentDir}/task.json`,
			JSON.stringify(
				{
					agentId,
					swarmId,
					task,
					status: "active",
					startTime: new Date().toISOString(),
				},
				null,
				2
			)
		);

		// Execute agent task,
		await executeAgentTask(agentId, task, options, agentDir);

		// Update status,
		await fs.writeFile(
			`${agentDir}/status.json`,
			JSON.stringify(
				{
					status: "completed",
					endTime: new Date().toISOString(),
				},
				null,
				2
			)
		);

		console.log(`  ✅ Agent ${agentId} completed: ${task.type}`);
	}
}

/**
 * Execute a single agent task using claude
 */
async function executeAgentTask(
	agentId: string,
	task: any,
	options: any,
	agentDir: string
) {
	console.log(`    → Executing: ${task.type} task`);

	try {
		// Check if claude CLI is available and not in simulation mode,
		const checkResult = await new Promise<ProcessResult>((resolve) => {
			const child = spawn("which", ["claude"], {
				stdio: ["ignore", "pipe", "pipe"],
			});

			child.on("close", (code) => {
				resolve({ success: code === 0 });
			});

			child.on("error", () => {
				resolve({ success: false });
			});
		});

		if (checkResult.success && options.simulate !== true) {
			// Write prompt to a file for claude to read,
			const promptFile = `${agentDir}/prompt.txt`;
			const prompt = `You are an AI agent with ID: ${agentId}

Your task type is: ${task.type}
Your specific task is: ${task.description}

Please execute this task and provide a detailed response.
${task.type === "research" ? "Use web search and research tools as needed." : ""}
${task.type === "implementation" ? "Write clean, well-documented code." : ""}
${task.type === "testing" ? "Create comprehensive tests." : ""}

Provide your output in a structured format.

When you're done, please end with "TASK COMPLETED" on its own line.`;

			await fs.writeFile(promptFile, prompt);

			// Build claude command using bash to pipe the prompt,
			let tools = "View,GlobTool,GrepTool,LS";
			if (task.type === "research" || options.research) {
				tools = "WebFetchTool,WebSearch";
			} else if (task.type === "implementation") {
				tools = "View,Edit,Replace,GlobTool,GrepTool,LS,Bash";
			}

			// Build claude command arguments for non-interactive mode,
			const claudeArgs = [
				"-p", // Non-interactive print mode,
				task.description, // The prompt
				"--dangerously-skip-permissions",
				"--allowedTools",
				tools,
			];

			// Write command to file for tracking,
			await fs.writeFile(
				`${agentDir}/command.txt`,
				`claude ${claudeArgs.join(" ")}`
			);

			console.log(`    → Running: ${task.description}`);

			// For real-time output, we need to capture it differently
			// First run with piped to capture for file, then run with inherit for display

			// Create a wrapper script that will tee the output,
			const wrapperScript = `#!/bin/bash,
claude ${claudeArgs.map((arg) => `"${arg}"`).join(" ")} | tee "${agentDir}/output.txt"
exit \${PIPESTATUS[0]}`;

			const wrapperPath = `${agentDir}/wrapper.sh`;
			await fs.writeFile(wrapperPath, wrapperScript);
			await fs.chmod(wrapperPath, 0o755);

			console.log(`    ┌─ Claude Output ─────────────────────────────`);

			try {
				const code = await new Promise((resolve, reject) => {
					const child = spawn("bash", [wrapperPath], {
						stdio: "inherit", // This allows real-time streaming to console,
					});

					child.on("close", (code) => {
						resolve(code);
					});

					child.on("error", (err) => {
						reject(err);
					});
				});

				console.log(`    └─────────────────────────────────────────────`);

				if (code !== 0) {
					throw new Error(`Claude exited with code ${code}`);
				}

				console.log(`    ✓ Task completed`);
			} catch (err) {
				throw err;
			}
		} else {
			// Simulate execution if claude CLI not available,
			console.log(`    → Simulating: ${task.type} (claude CLI not available)`);

			// For now, let's use the claude-flow claude spawn command instead,
			const claudeFlowArgs = ["claude", "spawn", task.description];

			if (task.type === "research" || options.research) {
				claudeFlowArgs.push("--research");
			}

			if (options.parallel) {
				claudeFlowArgs.push("--parallel");
			}

			console.log(`    → Using: claude-flow ${claudeFlowArgs.join(" ")}`);

			// Get the path to claude-flow binary,
			const claudeFlowPath = new URL(import.meta.url).pathname;
			const projectRoot = claudeFlowPath.substring(
				0,
				claudeFlowPath.indexOf("/src/")
			);
			const claudeFlowBin = `${projectRoot}/bin/claude-flow`;

			// Execute claude-flow command,
			const result = await new Promise<ExecutionResult>((resolve) => {
				const child = spawn(claudeFlowBin, claudeFlowArgs, {
					stdio: ["pipe", "pipe", "pipe"],
				});

				let stdout = "";
				let stderr = "";

				child.stdout?.on("data", (data) => {
					stdout += data.toString();
				});

				child.stderr?.on("data", (data) => {
					stderr += data.toString();
				});

				child.on("close", (code) => {
					resolve({ code: code || 0, stdout, stderr });
				});

				child.on("error", (err) => {
					resolve({ code: -1, stdout: "", stderr: err.message });
				});
			});

			const { code, stdout, stderr } = result;

			// Save output,
			await fs.writeFile(`${agentDir}/output.txt`, stdout);
			if (stderr.length > 0) {
				await fs.writeFile(`${agentDir}/error.txt`, stderr);
			}

			if (code !== 0) {
				console.log(`    ⚠️  Command exited with code ${code}`);
			}
		}
	} catch (err) {
		// Log error but continue,
		console.log(`    ⚠️  Error executing task: ${(err as Error).message}`);
		await fs.writeFile(`${agentDir}/error.txt`, (err as Error).message);
	}
}

function getAgentTypesForStrategy(
	strategy: string
): ("researcher" | "coder" | "analyst" | "coordinator" | "reviewer")[] {
	switch (strategy) {
		case "research":
			return ["researcher", "analyst", "coordinator"];
		case "development":
			return ["coder", "analyst", "reviewer", "coordinator"];
		case "analysis":
			return ["analyst", "researcher", "coordinator"];
		default: // auto,
			return ["coordinator", "researcher", "coder", "analyst"];
	}
}

function getCapabilitiesForType(type: string): string[] {
	switch (type) {
		case "researcher":
			return ["web-search", "data-collection", "analysis", "documentation"];
		case "coder":
			return ["coding", "testing", "debugging", "architecture"];
		case "analyst":
			return ["data-analysis", "visualization", "reporting", "insights"];
		case "reviewer":
			return ["code-review", "quality-assurance", "validation", "testing"];
		case "coordinator":
			return ["planning", "coordination", "task-management", "communication"];
		default:
			return ["general"];
	}
}

async function waitForObjectiveCompletion(
	coordinator: any,
	objectiveId: string,
	options: any
): Promise<void> {
	return new Promise((resolve) => {
		const checkInterval = setInterval(() => {
			const objective = coordinator.getObjectiveStatus(objectiveId);

			if (!objective) {
				clearInterval(checkInterval);
				resolve();
				return;
			}

			if (objective.status === "completed" || objective.status === "failed") {
				clearInterval(checkInterval);
				resolve();
				return;
			}

			// Show progress if verbose,
			if (options.verbose) {
				const swarmStatus = coordinator.getSwarmStatus();
				console.log(
					`Progress: ${swarmStatus.tasks.completed}/${swarmStatus.tasks.total} tasks completed`
				);
			}
		}, 5000); // Check every 5 seconds

		// Timeout after the specified time,
		setTimeout(
			() => {
				clearInterval(checkInterval);
				console.log("⚠️  Swarm execution timed out");
				resolve();
			},
			options.timeout * 60 * 1000
		);
	});
}
