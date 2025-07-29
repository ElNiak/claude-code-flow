// slash-commands.js - Create Claude Code slash commands

import { createClaudeFlowCommands } from "./claude-flow-commands.js";
import {
	createMainSparcCommand,
	createSparcSlashCommand,
} from "./sparc-commands.js";

// Create Claude Code slash commands for SPARC modes
export async function createClaudeSlashCommands(workingDir) {
	try {
		console.log("\n📝 Creating Claude Code slash commands...");

		// Parse .roomodes to get all SPARC modes
		const roomodesContent = readFileSync(`${workingDir}/.roomodes`, "utf8");
		const roomodes = JSON.parse(roomodesContent);

		// Create slash commands for each SPARC mode
		for (const mode of roomodes.customModes) {
			const commandPath = `${workingDir}/.claude/commands/sparc/${mode.slug}.md`;
			const commandContent = createSparcSlashCommand(mode);

			writeFileSync(commandPath, commandContent, "utf8");
			console.log(`  ✓ Created slash command: /sparc-${mode.slug}`);
		}

		// Create main SPARC command
		const mainSparcCommand = createMainSparcCommand(roomodes.customModes);
		writeFileSync(
			`${workingDir}/.claude/commands/sparc.md`,
			mainSparcCommand,
			"utf8",
		);
		console.log("  ✓ Created main slash command: /sparc");

		// Create claude-flow specific commands
		await createClaudeFlowCommands(workingDir);
	} catch (err) {
		console.log(
			`  ⚠️  Could not create Claude Code slash commands: ${err.message}`,
		);
	}
}
