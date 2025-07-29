#!/usr/bin/env node

import { execSync } from "child_process";

try {
	execSync("npx tsc --noEmit src/cli/commands/hive-mind/index.ts", {
		stdio: "pipe",
	});
	console.log("✅ No errors found");
} catch (error) {
	const output = error.stdout.toString();
	const lines = output.split("\n");

	console.log("🔍 Specific TypeScript errors in hive-mind/index.ts:");
	console.log("");

	lines.forEach((line, index) => {
		if (line.includes("error TS") && line.includes("hive-mind/index.ts")) {
			console.log(`${index + 1}: ${line}`);
		}
	});
}
