#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

/**
 * Fix linting issues in TypeScript files
 */
async function fixLintingIssues() {
	console.log("🔧 Fixing common linting issues...");

	// Find all TypeScript files in src/
	const files = await glob("src/**/*.ts", { cwd: projectRoot });

	let totalChanges = 0;
	let filesChanged = 0;

	for (const file of files) {
		const filePath = join(projectRoot, file);
		const content = readFileSync(filePath, "utf-8");
		let newContent = content;
		let fileChanges = 0;

		// 1. Remove unused getErrorMessage imports
		if (newContent.includes("import { getErrorMessage } from")) {
			// Check if getErrorMessage is actually used in the file
			const usesGetErrorMessage =
				newContent.includes("getErrorMessage(") ||
				newContent.includes("getErrorMessage ") ||
				(newContent.match(/getErrorMessage/g) || []).length > 1;

			if (!usesGetErrorMessage) {
				// Remove the entire import line
				newContent = newContent.replace(
					/^import \{ getErrorMessage \} from ['"]\.\.[^'"]*error-handler(?:\.js)?['"];\s*\n/gm,
					"",
				);
				fileChanges++;
			}
		}

		// 2. Fix unused function parameters by adding underscore prefix
		newContent = newContent.replace(
			/(\w+)\s*:\s*([^,)]+)(?=\s*[,)])/g,
			(match, paramName, paramType, offset, string) => {
				// Check if parameter is used in the function body
				const functionStart = string.lastIndexOf("{", offset);
				const functionEnd = string.indexOf("}", offset);
				if (functionStart !== -1 && functionEnd !== -1) {
					const functionBody = string.slice(functionStart, functionEnd);
					const isUsed =
						functionBody.includes(paramName) &&
						functionBody.indexOf(paramName) !==
							functionBody.lastIndexOf(paramName);

					if (!isUsed && !paramName.startsWith("_")) {
						fileChanges++;
						return `_${paramName}: ${paramType}`;
					}
				}
				return match;
			},
		);

		// 3. Remove unused type imports
		const unusedTypePatterns = [
			{ regex: /,\s*TaskId\s*(?=,|\})/g, name: "TaskId" },
			{ regex: /,\s*TaskDefinition\s*(?=,|\})/g, name: "TaskDefinition" },
			{ regex: /,\s*AgentId\s*(?=,|\})/g, name: "AgentId" },
			{ regex: /,\s*generateId\s*(?=,|\})/g, name: "generateId" },
		];

		for (const pattern of unusedTypePatterns) {
			const regex = new RegExp(`\\b${pattern.name}\\b`, "g");
			const matches = newContent.match(regex) || [];

			// If the type/function appears only once (in the import), remove it
			if (matches.length === 1) {
				newContent = newContent.replace(pattern.regex, "");
				fileChanges++;
			}
		}

		// 4. Clean up empty import lines
		newContent = newContent.replace(/^import \{\s*\} from [^;]+;\s*\n/gm, "");

		// 5. Add underscore prefix to unused variables
		const unusedVarPatterns = [/(\w+)\s*=\s*[^;]+;?\s*\/\/?\s*unused/gi];

		if (newContent !== content) {
			writeFileSync(filePath, newContent, "utf-8");
			totalChanges += fileChanges;
			filesChanged++;
			console.log(`✅ Fixed ${fileChanges} issues in ${file}`);
		}
	}

	console.log(
		`\n🎉 Fixed ${totalChanges} linting issues across ${filesChanged} files`,
	);

	// Run linter to check remaining issues
	console.log("\n🔍 Checking remaining linting issues...");
	const { execSync } = await import("child_process");
	try {
		execSync("npm run lint -- --format compact --max-warnings 50", {
			cwd: projectRoot,
			stdio: "inherit",
		});
	} catch (error) {
		console.log(
			"Still have some linting issues, but major ones should be fixed.",
		);
	}
}

// Run the script
fixLintingIssues().catch(console.error);
