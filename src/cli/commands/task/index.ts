// ABOUTME: Task management commands for creating, listing, and managing workflow tasks
// ABOUTME: Provides CLI interface for task orchestration and coordination operations

import { printError, printSuccess, printWarning } from "../../core/utils.js";

/**
 * Task types supported by the task management system
 */
export type TaskType =
	| "research"
	| "code"
	| "analysis"
	| "coordination"
	| "general";

/**
 * Task priority level (1-10 scale)
 */
export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Task status during execution lifecycle
 */
export type TaskStatus =
	| "queued"
	| "running"
	| "completed"
	| "failed"
	| "cancelled";

/**
 * Task configuration and metadata
 */
export interface TaskConfig {
	id: string;
	type: TaskType;
	description: string;
	priority: TaskPriority;
	status: TaskStatus;
	createdAt: Date;
}

/**
 * Command line flags for task operations
 */
export interface TaskFlags {
	priority?: string;
	filter?: string;
	verbose?: boolean;
	force?: boolean;
}

/**
 * Main task command handler - routes to specific task operations
 * @param subArgs - Command line arguments after 'task'
 * @param flags - Command line flags and options
 */
export async function taskCommand(
	subArgs: string[],
	flags: TaskFlags,
): Promise<void> {
	const taskCmd = subArgs[0];

	switch (taskCmd) {
		case "create":
			await createTask(subArgs, flags);
			break;

		case "list":
			await listTasks(subArgs, flags);
			break;

		case "status":
			await showTaskStatus(subArgs, flags);
			break;

		case "cancel":
			await cancelTask(subArgs, flags);
			break;

		case "workflow":
			await executeWorkflow(subArgs, flags);
			break;

		case "coordination":
			await manageCoordination(subArgs, flags);
			break;

		default:
			showTaskHelp();
	}
}

/**
 * Create a new task with specified type and description
 * @param subArgs - Arguments containing task type and description
 * @param flags - Command flags including priority settings
 */
async function createTask(subArgs: string[], flags: TaskFlags): Promise<void> {
	const taskType = subArgs[1] as TaskType;
	const description = subArgs.slice(2).join(" ");

	if (!taskType || !description) {
		printError('Usage: task create <type> "<description>"');
		console.log("Types: research, code, analysis, coordination, general");
		return;
	}

	const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	const priority = parseInt(
		getFlag(subArgs, "--priority") || "5",
	) as TaskPriority;

	printSuccess(`Creating ${taskType} task: ${taskId}`);
	console.log(`📋 Description: ${description}`);
	console.log(`⚡ Priority: ${priority}/10`);
	console.log(`🏷️  Type: ${taskType}`);
	console.log("📅 Status: Queued");
	console.log("\n📋 Note: Task queued for execution when orchestrator starts");
}

/**
 * List all tasks with optional filtering
 * @param subArgs - Arguments including filter options
 * @param flags - Command flags for verbose output
 */
async function listTasks(subArgs: string[], flags: TaskFlags): Promise<void> {
	const filter = getFlag(subArgs, "--filter") as TaskStatus | undefined;
	const verbose = subArgs.includes("--verbose") || subArgs.includes("-v");

	printSuccess("Task queue:");

	if (filter) {
		console.log(`📊 Filtered by status: ${filter}`);
	}

	console.log("📋 No active tasks (orchestrator not running)");
	console.log("\nTask statuses: queued, running, completed, failed, cancelled");

	if (verbose) {
		console.log("\nTo create tasks:");
		console.log('  claude-flow task create research "Market analysis"');
		console.log('  claude-flow task create code "Implement API"');
		console.log('  claude-flow task create analysis "Data processing"');
	}
}

/**
 * Display detailed status information for a specific task
 * @param subArgs - Arguments containing task ID
 * @param flags - Command flags (unused in current implementation)
 */
async function showTaskStatus(
	subArgs: string[],
	flags: TaskFlags,
): Promise<void> {
	const taskId = subArgs[1];

	if (!taskId) {
		printError("Usage: task status <task-id>");
		return;
	}

	printSuccess(`Task status: ${taskId}`);
	console.log("📊 Task details would include:");
	console.log("   Status, progress, assigned agent, execution time, results");
}

/**
 * Cancel a running or queued task
 * @param subArgs - Arguments containing task ID to cancel
 * @param flags - Command flags (unused in current implementation)
 */
async function cancelTask(subArgs: string[], flags: TaskFlags): Promise<void> {
	const taskId = subArgs[1];

	if (!taskId) {
		printError("Usage: task cancel <task-id>");
		return;
	}

	printSuccess(`Cancelling task: ${taskId}`);
	console.log("🛑 Task would be gracefully cancelled");
}

/**
 * Execute a workflow from a configuration file
 * @param subArgs - Arguments containing workflow file path
 * @param flags - Command flags (unused in current implementation)
 */
async function executeWorkflow(
	subArgs: string[],
	flags: TaskFlags,
): Promise<void> {
	const workflowFile = subArgs[1];

	if (!workflowFile) {
		printError("Usage: task workflow <workflow-file>");
		return;
	}

	printSuccess(`Executing workflow: ${workflowFile}`);
	console.log("🔄 Workflow execution would include:");
	console.log("   - Parsing workflow definition");
	console.log("   - Creating dependent tasks");
	console.log("   - Orchestrating execution");
	console.log("   - Progress tracking");
}

/**
 * Manage task coordination and orchestration
 * @param subArgs - Arguments containing coordination command
 * @param flags - Command flags (unused in current implementation)
 */
async function manageCoordination(
	subArgs: string[],
	flags: TaskFlags,
): Promise<void> {
	const coordCmd = subArgs[1];

	switch (coordCmd) {
		case "status":
			printSuccess("Task coordination status:");
			console.log("🎯 Coordination engine: Not running");
			console.log("   Active coordinators: 0");
			console.log("   Pending tasks: 0");
			console.log("   Resource utilization: 0%");
			break;

		case "optimize":
			printSuccess("Optimizing task coordination...");
			console.log("⚡ Optimization would include:");
			console.log("   - Task dependency analysis");
			console.log("   - Resource allocation optimization");
			console.log("   - Parallel execution planning");
			break;

		default:
			console.log("Coordination commands: status, optimize");
	}
}

/**
 * Extract flag value from command line arguments
 * @param args - Command line arguments array
 * @param flagName - Name of the flag to extract
 * @returns Flag value or null if not found
 */
function getFlag(args: string[], flagName: string): string | null {
	const index = args.indexOf(flagName);
	return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

/**
 * Display help information for task commands
 */
function showTaskHelp(): void {
	console.log("Task commands:");
	console.log('  create <type> "<description>"    Create new task');
	console.log("  list [--filter <status>]        List tasks");
	console.log("  status <id>                      Show task details");
	console.log("  cancel <id>                      Cancel running task");
	console.log("  workflow <file>                  Execute workflow file");
	console.log("  coordination <status|optimize>   Manage coordination");
	console.log();
	console.log("Task Types:");
	console.log("  research      Information gathering and analysis");
	console.log("  code          Software development tasks");
	console.log("  analysis      Data processing and insights");
	console.log("  coordination  Task orchestration and management");
	console.log("  general       General purpose tasks");
	console.log();
	console.log("Options:");
	console.log("  --priority <1-10>                Set task priority");
	console.log("  --filter <status>                Filter by status");
	console.log("  --verbose, -v                    Show detailed output");
	console.log();
	console.log("Examples:");
	console.log(
		'  claude-flow task create research "Market analysis" --priority 8',
	);
	console.log("  claude-flow task list --filter running");
	console.log("  claude-flow task workflow examples/development-workflow.json");
	console.log("  claude-flow task coordination status");
}
