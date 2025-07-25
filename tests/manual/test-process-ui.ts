#!/usr/bin/env node

/**
 * Manual test script for ProcessUI functionality
 */

import chalk from "chalk";
import { ProcessManager } from "../../src/cli/commands/start/process-manager.ts";
import { ProcessUI } from "../../src/cli/commands/start/process-ui.ts";

async function testProcessUI() {
	console.log(chalk.cyan.bold("Testing ProcessUI..."));
	console.log(chalk.gray("─".repeat(60)));
	console.log("This will launch the interactive UI for 10 seconds");
	console.log(
		"Try pressing: r (refresh), h (help), a (start all), z (stop all)",
	);
	console.log(chalk.gray("─".repeat(60)));
	console.log();

	// Wait a moment
	await new Promise((resolve) => setTimeout(resolve, 2000));

	const manager = new ProcessManager();
	await manager.initialize();

	const ui = new ProcessUI(manager);

	// Start UI with a timeout
	const timeout = setTimeout(async () => {
		console.log("\n\nTimeout reached, stopping UI...");
		await ui.stop();
		Deno.exit(0);
	}, 10000);

	try {
		await ui.start();
	} catch (error) {
		clearTimeout(timeout);
		console.error("Error:", error);
	}
}

// Run the test
// import.meta.main is Deno-specific, use process.argv check for Node.js compatibility
if (
	typeof process !== "undefined" &&
	process.argv[1] &&
	new URL(import.meta.url).pathname === process.argv[1]
) {
	await testProcessUI();
}
