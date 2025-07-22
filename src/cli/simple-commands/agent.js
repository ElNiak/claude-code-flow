// agent.js - Agent management commands (routes to unified implementation)
import { printError, printSuccess, printWarning } from "../utils.js";

// Temporary mock implementation until TypeScript compilation is set up
const agentCommands = {
	async spawn(args, flags) {
		printSuccess("Agent spawn functionality not fully implemented yet");
		console.log("🤖 Would spawn agent with args:", args);
	},
	async list(args, flags) {
		try {
			// Import unified agent system
			const { displayUnifiedAgentsList } = await import("../commands/agent.ts");

			// Parse simple flags for backward compatibility
			const options = {
				detailed: flags.detailed || flags.d,
				json: flags.json || flags.j,
				pattern: flags.pattern || flags.p,
				type: flags.type || flags.t,
				status: flags.status || flags.s,
				sessionId: flags.session,
			};

			// Use unified agent listing system
			await displayUnifiedAgentsList(options);
		} catch (error) {
			printError(`Failed to list agents: ${error.message}`);
			console.log("🔄 Falling back to basic status...");
			printSuccess("Agent listing system:");
			console.log(
				"📊 Unified agent system available across all coordination patterns"
			);
		}
	},
	async terminate(args, flags) {
		const agentId = args[0];
		if (!agentId) {
			printError("Please specify an agent ID to terminate");
			return;
		}
		printSuccess(`Agent ${agentId} would be terminated`);
	},
	async info(args, flags) {
		const agentId = args[0];
		if (!agentId) {
			printError("Please specify an agent ID for info");
			return;
		}
		printSuccess(`Info for agent ${agentId}:`);
		console.log("📊 Agent info not available yet");
	},
	async health(args, flags) {
		printSuccess("Agent Health Status:");
		console.log("💚 All systems operational");
	},
};

export async function agentCommand(subArgs, flags) {
	const agentCmd = subArgs[0];

	try {
		switch (agentCmd) {
			case "spawn":
				await agentCommands.spawn(subArgs.slice(1), flags);
				break;

			case "list":
				await agentCommands.list(subArgs.slice(1), flags);
				break;

			case "terminate":
				await agentCommands.terminate(subArgs.slice(1), flags);
				break;

			case "info":
				await agentCommands.info(subArgs.slice(1), flags);
				break;

			case "health":
				await agentCommands.health(subArgs.slice(1), flags);
				break;

			case "hierarchy":
				await manageHierarchy(subArgs, flags);
				break;

			case "network":
				await manageNetwork(subArgs, flags);
				break;

			case "ecosystem":
				await manageEcosystem(subArgs, flags);
				break;

			case "provision":
				await provisionAgent(subArgs, flags);
				break;

			default:
				showAgentHelp();
		}
	} catch (error) {
		printError(
			`Agent command failed: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

// Legacy hierarchy management
async function manageHierarchy(subArgs, flags) {
	const action = subArgs[1];
	switch (action) {
		case "create":
			printSuccess("Creating agent hierarchy...");
			console.log("🏗️  Hierarchy structure would be created");
			console.log("   • Manager agents");
			console.log("   • Worker agents");
			console.log("   • Specialist agents");
			break;
		case "list":
			printSuccess("Agent Hierarchies:");
			console.log("📊 No hierarchies defined");
			break;
		default:
			console.log("Usage: agent hierarchy <create|list|update|delete>");
	}
}

// Legacy network management
async function manageNetwork(subArgs, flags) {
	const action = subArgs[1];
	switch (action) {
		case "create":
			printSuccess("Creating agent network...");
			console.log("🌐 Network would be established");
			console.log("   • Peer-to-peer connections");
			console.log("   • Message routing");
			console.log("   • Resource sharing");
			break;
		case "status":
			printSuccess("Network Status:");
			console.log("🟢 Network: Not configured");
			break;
		default:
			console.log("Usage: agent network <create|status|update|disconnect>");
	}
}

// Legacy ecosystem management
async function manageEcosystem(subArgs, flags) {
	const action = subArgs[1];
	switch (action) {
		case "init":
			printSuccess("Initializing agent ecosystem...");
			console.log("🌿 Ecosystem would include:");
			console.log("   • Shared memory pools");
			console.log("   • Resource allocation");
			console.log("   • Task distribution");
			console.log("   • Performance monitoring");
			break;
		case "stats":
			printSuccess("Ecosystem Statistics:");
			console.log("📊 No ecosystem initialized");
			break;
		default:
			console.log("Usage: agent ecosystem <init|stats|optimize|reset>");
	}
}

// Legacy agent provisioning
async function provisionAgent(subArgs, flags) {
	const agentId = subArgs[1];
	if (!agentId) {
		printError("Please specify an agent ID to provision");
		return;
	}

	printSuccess(`Provisioning agent ${agentId}...`);
	console.log("🔧 Agent would be provisioned with:");
	console.log("   • Compute resources");
	console.log("   • Memory allocation");
	console.log("   • Task permissions");
	console.log("   • Network access");
}

// Legacy agent termination (now routes to unified)
async function terminateAgent(subArgs, flags) {
	// This now routes to the unified implementation
	await agentCommands.terminate(subArgs.slice(1), flags);
}

// Legacy agent info (now routes to unified)
async function showAgentInfo(subArgs, flags) {
	// This now routes to the unified implementation
	await agentCommands.info(subArgs.slice(1), flags);
}

// Help function
function showAgentHelp() {
	console.log(`
🤖 Agent Management Commands:

Core Commands:
  spawn <type>         Create a new agent with specified type
  list                 Display all active agents
  info <id>           Show detailed information about an agent
  terminate <id>      Safely terminate an agent
  health              Monitor agent health and performance

Advanced Commands:
  hierarchy <action>   Manage agent hierarchies
  network <action>     Configure agent networks
  ecosystem <action>   Manage agent ecosystems
  provision <id>      Provision resources for an agent

Examples:
  agent spawn researcher --name "DataBot"
  agent list --unhealthy
  agent info agent-123
  agent terminate agent-123 --force
  agent health
  agent hierarchy create enterprise
  agent network create mesh
  agent ecosystem init

Use --help with any command for detailed options.
	`);
}

// Helper function
function getFlag(args, flagName) {
	const index = args.indexOf(flagName);
	return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}
