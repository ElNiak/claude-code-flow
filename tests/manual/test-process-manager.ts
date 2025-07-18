#!/usr/bin/env -S deno run --allow-all

/**
 * Manual test script for ProcessManager functionality
 */

import chalk from "chalk";
import { ProcessManager } from "../../src/cli/commands/start/process-manager.ts";

async function testProcessManager() {
	console.log(chalk.cyan.bold("Testing ProcessManager..."));
	console.log(chalk.gray("─".repeat(60)));

	const manager = new ProcessManager();

	// Test 1: Get all processes
	console.log("\n1. Getting all processes:");
	const processes = manager.getAllProcesses();
	console.log(`   Found ${processes.length} processes`);
	processes.forEach((p) => {
		console.log(`   - ${p.id}: ${p.status}`);
	});

	// Test 2: Get system stats
	console.log("\n2. System stats:");
	const stats = manager.getSystemStats();
	console.log(`   Total: ${stats.totalProcesses}`);
	console.log(`   Running: ${stats.runningProcesses}`);
	console.log(`   Stopped: ${stats.stoppedProcesses}`);

	// Test 3: Initialize
	console.log("\n3. Initializing manager...");
	try {
		await manager.initialize();
		console.log(chalk.green("   ✓ Initialized successfully"));
	} catch (error) {
		console.log(chalk.red(`   ✗ Failed: ${(error as Error).message}`));
	}

	// Test 4: Start a simple process
	console.log("\n4. Starting event-bus process...");
	try {
		await manager.startProcess("event-bus");
		console.log(chalk.green("   ✓ Started successfully"));

		const eventBus = manager.getProcess("event-bus");
		console.log(`   Status: ${eventBus?.status}`);
		console.log(`   PID: ${eventBus?.pid}`);
	} catch (error) {
		console.log(chalk.red(`   ✗ Failed: ${(error as Error).message}`));
	}

	// Test 5: Stop the process
	console.log("\n5. Stopping event-bus process...");
	try {
		await manager.stopProcess("event-bus");
		console.log(chalk.green("   ✓ Stopped successfully"));
	} catch (error) {
		console.log(chalk.red(`   ✗ Failed: ${(error as Error).message}`));
	}

	// Test 6: Event handling
	console.log("\n6. Testing event handling...");
	let eventReceived = false;
	manager.on("processStarted", ({ processId }) => {
		console.log(`   Event: Process ${processId} started`);
		eventReceived = true;
	});

	await manager.startProcess("event-bus");
	console.log(chalk.green(`   ✓ Event received: ${eventReceived}`));

	await manager.stopProcess("event-bus");

	console.log(chalk.gray("\n─".repeat(60)));
	console.log(chalk.green.bold("✓ All tests completed"));
}

// Run the test
// import.meta.main is Deno-specific, use process.argv check for Node.js compatibility
if (
	typeof process !== "undefined" &&
	process.argv[1] &&
	new URL(import.meta.url).pathname === process.argv[1]
) {
	await testProcessManager();
}
