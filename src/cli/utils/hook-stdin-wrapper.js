#!/usr/bin/env node

/**
 * ABOUTME: Wrapper script that enriches JSON stdin with configuration flags from .claude/settings.json
 * ABOUTME: Bridges the gap between Claude Code's simple JSON input and our extended configuration system
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Hook configuration mapping - defines additional flags for each hook type
 */
const HOOK_CONFIGURATIONS = {
	"pre-bash": {
		"validate-safety": true,
		"prepare-resources": true,
	},
	"pre-edit": {
		"validate-naming": true,
		"block-on-fail": true,
		"suggest-alternatives": true,
		"auto-assign-agents": false,
		"load-context": false,
		"serena-verify": false,
	},
	"post-bash": {
		"track-metrics": true,
		"store-results": true,
	},
	"post-edit": {
		format: false,
		"update-memory": false,
		"train-neural": false,
		"validate-changes": false,
		"store-verified-structure": false,
	},
};

/**
 * Main wrapper function
 */
async function main() {
	try {
		const hookType = process.argv[2];

		if (!hookType) {
			console.error("Error: Hook type is required");
			process.exit(1);
		}

		// Read JSON from stdin
		let stdinData = "";

		if (!process.stdin.isTTY) {
			process.stdin.setEncoding("utf8");

			for await (const chunk of process.stdin) {
				stdinData += chunk;
			}
		}

		let hookInput = {};

		// Parse JSON input if available
		if (stdinData.trim()) {
			try {
				hookInput = JSON.parse(stdinData);
			} catch (error) {
				console.error(`JSON parse error: ${error.message}`);
				console.error(`Raw data: ${stdinData}`);
				process.exit(1);
			}
		}

		// Merge with hook-specific configuration
		const configuration = HOOK_CONFIGURATIONS[hookType] || {};
		const enrichedInput = {
			...hookInput,
			...configuration,
		};

		// Debug logging
		if (process.env.DEBUG === "true") {
			console.debug(`[HOOK WRAPPER] Hook type: ${hookType}`);
			console.debug(
				`[HOOK WRAPPER] Original input: ${JSON.stringify(hookInput, null, 2)}`,
			);
			console.debug(
				`[HOOK WRAPPER] Configuration: ${JSON.stringify(configuration, null, 2)}`,
			);
			console.debug(
				`[HOOK WRAPPER] Enriched input: ${JSON.stringify(enrichedInput, null, 2)}`,
			);
		}

		// Convert enriched input back to command line arguments
		const args = [hookType];

		Object.entries(enrichedInput).forEach(([key, value]) => {
			if (key === "tool_name") return; // Skip tool_name as it's not a flag

			const flagName = key
				.replace(/([A-Z])/g, "-$1")
				.toLowerCase()
				.replace(/_/g, "-");

			if (typeof value === "boolean") {
				if (value) {
					args.push(`--${flagName}`);
				} else {
					args.push(`--no-${flagName}`);
				}
			} else if (value !== undefined && value !== null) {
				args.push(`--${flagName}`, String(value));
			}
		});

		// Execute the actual hook command
		const commandStr = `npx claude-flow hooks ${args.join(" ")}`;
		console.debug(`[HOOK WRAPPER] Executing command: ${commandStr}`);
		const child = spawn("npx", ["claude-flow", "hooks", ...args], {
			stdio: ["pipe", "inherit", "inherit"],
			shell: true,
		});

		// Pass the enriched JSON to the actual hook via stdin
		child.stdin.write(JSON.stringify(enrichedInput));
		child.stdin.end();

		// Wait for completion
		child.on("exit", (code) => {
			if (code !== 0) {
				console.error(`Hook wrapper exited with code ${code}`);
			} else {
				console.log("Hook wrapper completed successfully");
			}
			process.exit(code || 0);
		});

		child.on("error", (error) => {
			console.error(`Hook wrapper failed: ${error.message}`);
			process.exit(1);
		});
	} catch (error) {
		console.error(`Hook wrapper error: ${error.message}`);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(`Unhandled error: ${error.message}`);
	process.exit(1);
});
