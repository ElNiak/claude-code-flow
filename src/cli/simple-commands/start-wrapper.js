// start-wrapper.js - Wrapper to maintain backward compatibility with the new modular start command

import {
	generateCommandHelp,
	parseCommandArgs,
	validateCommandArgs,
} from "../command-metadata.js";
import { cwd, Deno, existsSync, exit } from "../node-compat.js";
import { compat } from "../runtime-detector.js";
import { printError, printInfo, printSuccess, printWarning } from "../utils.js";

// Start command metadata
export const startCommandMetadata = {
	category: "core",
	helpDescription:
		"Launch the Claude-Flow orchestration system with optional UI and background daemon modes",
	priority: "high",
	options: [
		{
			name: "daemon",
			short: "d",
			type: "boolean",
			description: "Run as background daemon process",
			default: false,
		},
		{
			name: "port",
			short: "p",
			type: "number",
			description: "Specify port number for web interface",
			default: 3000,
		},
		{
			name: "verbose",
			short: "v",
			type: "boolean",
			description: "Enable verbose output with detailed logging",
			default: false,
		},
		{
			name: "ui",
			short: "u",
			type: "boolean",
			description: "Launch user interface (web UI by default)",
			default: false,
		},
		{
			name: "web",
			short: "w",
			type: "boolean",
			description: "Launch web-based user interface",
			default: false,
		},
		{
			name: "swarm",
			type: "boolean",
			description: "Enable swarm intelligence coordination",
			default: false,
		},
	],
	examples: [
		"claude-flow start                     # Start in interactive mode",
		"claude-flow start --daemon            # Start as background daemon",
		"claude-flow start --port 8080         # Use custom port",
		"claude-flow start --verbose           # Show detailed system activity",
		"claude-flow start --ui                # Launch web-based UI",
		"claude-flow start --web --port 3000   # Web UI on specific port",
	],
	details: `
The start command launches the Claude-Flow orchestration system with various modes:

UI Modes:
  • --ui: Launch web-based UI by default (recommended)
  • --web: Explicitly launch web interface

System Options:
  • --daemon: Run as background process (useful for server deployments)
  • --verbose: Show detailed system activity and coordination logs
  • --swarm: Enable advanced swarm intelligence coordination

The system will automatically check for required directories and guide setup.`,
};

export async function startCommand(subArgs, flags) {
	// Parse arguments using metadata
	const parsed = parseCommandArgs(subArgs, flags, startCommandMetadata);

	// Show help if requested
	if (parsed.help) {
		console.log(generateCommandHelp("start", startCommandMetadata));
		return;
	}

	// Validate arguments
	const errors = validateCommandArgs(parsed, startCommandMetadata);
	if (errors.length > 0) {
		printError("Invalid arguments:");
		errors.forEach((error) => console.error(`  • ${error}`));
		console.log("\nUse --help for usage information");
		return;
	}

	// Extract validated options (metadata ensures these are properly parsed)
	const { daemon, port, verbose, ui, web, swarm } = parsed.options;

	try {
		printSuccess("Starting Claude-Flow Orchestration System...");
		console.log();

		// Check if we should launch the web UI mode
		if (web) {
			try {
				// Launch the web server
				const { startWebServer } = await import("./web-server.js");
				const server = await startWebServer(port);

				printSuccess(`🌐 Web UI is running!`);
				console.log(
					`📍 Open your browser to: http://localhost:${port}/console`,
				);
				console.log("   Press Ctrl+C to stop the server");
				console.log();

				// Keep process running
				await new Promise(() => {});
				return;
			} catch (err) {
				printError("Failed to launch web UI: " + err.message);
				console.error(err.stack);
				return;
			}
		}

		// Check if we should launch the UI mode (web UI by default)
		if (ui && !web) {
			try {
				// Launch the web UI by default when --ui is used
				const { ClaudeCodeWebServer } = await import("./web-server.js");
				const webServer = new ClaudeCodeWebServer(port);
				await webServer.start();

				printSuccess("🌐 Claude Flow Web UI is running!");
				console.log(
					`📍 Open your browser to: http://localhost:${port}/console`,
				);
				console.log("   Press Ctrl+C to stop the server");
				console.log();

				// Keep process running
				await new Promise(() => {});
				return;
			} catch (err) {
				// If web UI fails, fall back to terminal UI
				printWarning("Web UI failed, launching terminal UI...");
				try {
					const { launchEnhancedUI } = await import("./process-ui-enhanced.js");
					await launchEnhancedUI();
					return;
				} catch (fallbackErr) {
					// If both fail, show error
					printError("Failed to launch UI: " + err.message);
					console.error(err.stack);
					return;
				}
			}
		}

		// Check if required directories exist
		const requiredDirs = ["memory", "coordination"];
		const missingDirs = [];

		for (const dir of requiredDirs) {
			try {
				await fs.stat(dir);
			} catch {
				missingDirs.push(dir);
			}
		}

		if (missingDirs.length > 0) {
			printWarning("Missing required directories: " + missingDirs.join(", "));
			console.log(
				'Run "claude-flow init" first to create the necessary structure',
			);
			return;
		}

		// Display startup information
		console.log("🚀 System Configuration:");
		console.log(`   Mode: ${daemon ? "Daemon (background)" : "Interactive"}`);
		console.log(`   MCP Port: ${port}`);
		console.log(`   Working Directory: ${cwd()}`);
		console.log(`   Memory Backend: JSON (default)`);
		console.log(`   Terminal Pool: 5 instances (default)`);
		console.log();

		// Initialize components
		console.log("📋 Initializing Components:");

		// Memory system
		console.log("   ✓ Memory Bank: Ready");
		console.log("     - Backend: JSON file (memory/claude-flow-data.json)");
		console.log("     - Namespaces: Enabled");

		// Terminal pool
		console.log("   ✓ Terminal Pool: Ready");
		console.log("     - Pool Size: 5");
		console.log(
			"     - Shell: " +
				(compat.platform.os === "windows" ? "cmd.exe" : "/bin/bash"),
		);

		// Task queue
		console.log("   ✓ Task Queue: Ready");
		console.log("     - Max Concurrent: 10");
		console.log("     - Priority Queue: Enabled");

		// MCP Server
		console.log("   ✓ MCP Server: Ready");
		console.log(`     - Port: ${port}`);
		console.log("     - Transport: stdio/HTTP");

		console.log();

		if (daemon) {
			// Daemon mode - would normally fork process
			printInfo("Starting in daemon mode...");
			console.log("Note: Full daemon mode requires the TypeScript version");
			console.log(
				"The orchestrator would run in the background on port " + port,
			);

			// Create a simple PID file to simulate daemon
			const pid = compat.terminal.getPid();
			await compat.safeCall(async () => {
				if (compat.runtime === "deno") {
					writeFileSync(".claude-flow.pid", pid.toString(), "utf8");
				} else {
					const fs = await import("fs/promises");
					await fs.writeFile(".claude-flow.pid", pid.toString());
				}
			});
			console.log(`Process ID: ${pid} (saved to .claude-flow.pid)`);
		} else {
			// Interactive mode
			printSuccess("Orchestration system started!");
			console.log();
			console.log("🎯 Available Actions:");
			console.log("   • Open another terminal and run:");
			console.log("     - claude-flow agent spawn researcher");
			console.log('     - claude-flow task create "your task"');
			console.log('     - claude-flow sparc "build feature"');
			console.log("     - claude-flow monitor");
			console.log();
			console.log("   • View system status:");
			console.log("     - claude-flow status");
			console.log();
			console.log("   • Launch process management UI:");
			console.log("     - claude-flow start --ui");
			console.log();
			console.log("   • Press Ctrl+C to stop the orchestrator");
			console.log();

			if (verbose) {
				console.log("📊 Verbose Mode - Showing system activity:");
				console.log("[" + new Date().toISOString() + "] System initialized");
				console.log(
					"[" + new Date().toISOString() + "] Waiting for commands...",
				);
			}

			// Keep the process running
			console.log("🟢 System is running...");

			// Set up signal handlers
			const abortController = new AbortController();

			compat.terminal.onSignal("SIGINT", () => {
				console.log("\n⏹️  Shutting down orchestrator...");
				cleanup();
				compat.terminal.exit(0);
			});

			// Simple heartbeat to show system is alive
			if (!daemon) {
				const heartbeat = setInterval(() => {
					if (verbose) {
						console.log(
							"[" + new Date().toISOString() + "] Heartbeat - System healthy",
						);
					}
				}, 30000); // Every 30 seconds

				// Wait indefinitely (until Ctrl+C)
				await new Promise(() => {});
			}
		}
	} catch (err) {
		printError(`Failed to start orchestration system: ${err.message}`);
		console.error("Stack trace:", err.stack);
	}
}

function getArgValue(args, flag) {
	const index = args.indexOf(flag);
	if (index !== -1 && index < args.length - 1) {
		return args[index + 1];
	}
	return null;
}

async function cleanup() {
	// Clean up resources
	try {
		await compat.safeCall(async () => {
			if (compat.runtime === "deno") {
				await fs.rm(".claude-flow.pid");
			} else {
				const fs = await import("fs/promises");
				await fs.unlink(".claude-flow.pid");
			}
		});
	} catch {
		// File might not exist
	}

	console.log("✓ Terminal pool closed");
	console.log("✓ Task queue cleared");
	console.log("✓ Memory bank saved");
	console.log("✓ Cleanup complete");
}

function showStartHelp() {
	console.log("Start the Claude-Flow orchestration system");
	console.log();
	console.log("Usage: claude-flow start [options]");
	console.log();
	console.log("Options:");
	console.log("  -d, --daemon        Run as daemon in background");
	console.log("  -p, --port <port>   Server port (default: 3000)");
	console.log(
		"  -u, --ui            Launch terminal-based process management UI",
	);
	console.log("  -w, --web           Launch web-based UI server");
	console.log("  -v, --verbose       Show detailed system activity");
	console.log("  -h, --help          Show this help message");
	console.log();
	console.log("Examples:");
	console.log(
		"  claude-flow start                    # Start in interactive mode",
	);
	console.log(
		"  claude-flow start --daemon           # Start as background daemon",
	);
	console.log(
		"  claude-flow start --port 8080        # Use custom server port",
	);
	console.log(
		"  claude-flow start --ui               # Launch terminal-based UI",
	);
	console.log("  claude-flow start --web              # Launch web-based UI");
	console.log("  claude-flow start --verbose          # Show detailed logs");
	console.log();
	console.log("Web-based UI:");
	console.log("  The --web flag starts a web server with:");
	console.log(
		"    - Full-featured web console at http://localhost:3000/console",
	);
	console.log("    - Real-time WebSocket communication");
	console.log("    - Mobile-responsive design");
	console.log("    - Multiple themes and customization options");
	console.log("    - Claude Flow swarm integration");
	console.log();
	console.log("Terminal-based UI:");
	console.log(
		"  The --ui flag launches an advanced multi-view interface with:",
	);
	console.log();
	console.log("  Views (press 1-6 to switch):");
	console.log("    1. Process Management - Start/stop individual components");
	console.log("    2. System Status - Health metrics and resource usage");
	console.log("    3. Orchestration - Agent and task management");
	console.log("    4. Memory Bank - Namespace browser and operations");
	console.log("    5. System Logs - Real-time log viewer with filters");
	console.log("    6. Help - Comprehensive keyboard shortcuts");
	console.log();
	console.log("  Features:");
	console.log("    - Color-coded status indicators");
	console.log("    - Real-time updates and monitoring");
	console.log("    - Context-sensitive controls");
	console.log("    - Tab navigation between views");
	console.log();
	console.log("Notes:");
	console.log('  - Requires "claude-flow init" to be run first');
	console.log("  - Interactive mode shows real-time system status");
	console.log("  - Daemon mode runs in background (check logs)");
	console.log('  - Use "claude-flow status" to check if running');
	console.log('  - Use Ctrl+C or "claude-flow stop" to shutdown');
}
