#!/usr/bin/env node

/**
 * Fix remaining lint warnings by prefixing unused variables with underscore
 */

import { promises as fs } from "fs";
import path from "path";

// Files with specific unused variable issues based on lint output
const SPECIFIC_FIXES = [
	{
		file: "src/agents/agent-manager.ts",
		fixes: [
			{ pattern: /\bTaskDefinition\b(?=\s*$)/, replacement: "_TaskDefinition" },
		],
	},
	{
		file: "src/cli/agents/analyst.ts",
		fixes: [
			{
				pattern: /const\s+data\s*=\s*task\.context\?\.data;/g,
				replacement: "const _data = task.context?.data;",
			},
			{
				pattern: /const\s+benchmark\s*=\s*task\.context\?\.benchmark;/,
				replacement: "const _benchmark = task.context?.benchmark;",
			},
		],
	},
	{
		file: "src/cli/agents/architect.ts",
		fixes: [
			{
				pattern: /\bMicroserviceComponent\b(?=\s*,)/,
				replacement: "_MicroserviceComponent",
			},
			{
				pattern: /\bInfrastructureComponent\b(?=\s*,)/,
				replacement: "_InfrastructureComponent",
			},
		],
	},
	{
		file: "src/cli/agents/base-agent.ts",
		fixes: [
			{
				pattern: /import\s+\{\s*generateId\s*\}/,
				replacement: "import { generateId as _generateId }",
			},
		],
	},
	{
		file: "src/cli/agents/coder.ts",
		fixes: [
			{
				pattern: /const\s+code\s*=\s*task\.context\?\.code;/g,
				replacement: "const _code = task.context?.code;",
			},
			{
				pattern: /const\s+spec\s*=\s*task\.context\?\.spec;/,
				replacement: "const _spec = task.context?.spec;",
			},
			{
				pattern: /const\s+requirements\s*=\s*task\.context\?\.requirements;/,
				replacement: "const _requirements = task.context?.requirements;",
			},
		],
	},
];

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function fixFile(fileConfig) {
	const filePath = path.join(process.cwd(), fileConfig.file);

	if (!(await fileExists(filePath))) {
		console.log(`❌ File not found: ${fileConfig.file}`);
		return false;
	}

	try {
		const content = await fs.readFile(filePath, "utf8");
		let newContent = content;
		let fixCount = 0;

		for (const fix of fileConfig.fixes) {
			const oldContent = newContent;
			newContent = newContent.replace(fix.pattern, fix.replacement);
			if (newContent !== oldContent) {
				fixCount++;
			}
		}

		if (newContent !== content) {
			await fs.writeFile(filePath, newContent, "utf8");
			console.log(`✅ Fixed ${fileConfig.file} (${fixCount} fixes)`);
			return true;
		} else {
			console.log(`ℹ️  No changes needed for ${fileConfig.file}`);
			return false;
		}
	} catch (error) {
		console.error(`❌ Error fixing ${fileConfig.file}:`, error.message);
		return false;
	}
}

async function main() {
	console.log("🔧 Fixing remaining lint warnings...\n");

	let totalFixed = 0;

	for (const fileConfig of SPECIFIC_FIXES) {
		const fixed = await fixFile(fileConfig);
		if (fixed) {
			totalFixed++;
		}
	}

	console.log(`\n📊 Summary: Fixed ${totalFixed} files`);
	console.log('\n✅ Run "npm run lint" to check the results.');
}

main().catch((error) => {
	console.error("💥 Script failed:", error);
	process.exit(1);
});
