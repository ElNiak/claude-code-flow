/**
 * ABOUTME: JSON stdin parser for Claude Code hooks - handles official Claude Code hook input format
 * ABOUTME: Replaces non-standard ${variable} substitution with proper JSON parsing from stdin
 */

import { readFileSync } from "fs";

/**
 * Official Claude Code Hook Input Interface
 * Based on https://docs.anthropic.com/en/docs/claude-code/hooks
 */
export interface ClaudeCodeHookInput {
	tool_name: string;

	// Common fields
	command?: string;
	file_path?: string;

	// Bash tool specific
	description?: string;
	timeout?: number;

	// Write/Edit tool specific
	content?: string;
	old_string?: string;
	new_string?: string;
	replace_all?: boolean;

	// Read tool specific
	limit?: number;
	offset?: number;

	// MultiEdit tool specific
	edits?: Array<{
		old_string: string;
		new_string: string;
		replace_all?: boolean;
	}>;

	// Glob tool specific
	pattern?: string;
	path?: string;

	// Grep tool specific
	output_mode?: "content" | "files_with_matches" | "count";
	"-A"?: number;
	"-B"?: number;
	"-C"?: number;
	"-i"?: boolean;
	"-n"?: boolean;
	glob?: string;
	head_limit?: number;
	multiline?: boolean;
	type?: string;

	// Additional metadata
	[key: string]: any;
}

/**
 * Hook execution result interface
 */
export interface HookExecutionResult {
	success: boolean;
	data?: ClaudeCodeHookInput;
	error?: string;
	fallbackArgs?: string[];
}

/**
 * Reconstruct JSON from CLI arguments when tool-input is '[object Object]'
 */
function reconstructFromCliArgs(args: string[]): ClaudeCodeHookInput {
	const hookInput: any = {};

	// Extract tool name from hook event and args
	const hookEventIndex = args.findIndex((arg) => arg === "--hook-event-name");
	if (hookEventIndex !== -1 && hookEventIndex + 1 < args.length) {
		const hookEvent = args[hookEventIndex + 1];
		if (hookEvent === "PreToolUse") {
			hookInput.tool_name = inferToolNameFromArgs(args);
		}
	}

	// Extract other relevant parameters
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		switch (arg) {
			case "--cwd":
				if (nextArg) hookInput.path = nextArg;
				break;
			case "--session-id":
				if (nextArg) hookInput.session_id = nextArg;
				break;
		}
	}

	return hookInput;
}

/**
 * Infer tool name from CLI arguments and context
 */
function inferToolNameFromArgs(args: string[]): string {
	// Check if this is a bash hook
	if (args.includes("pre-bash") || args.includes("post-bash")) {
		return "Bash";
	}

	// Check if this is an edit hook
	if (args.includes("pre-edit") || args.includes("post-edit")) {
		return "Write"; // Default for file operations
	}

	// Check for other tool indicators
	if (args.includes("--command")) {
		return "Bash";
	}

	if (args.includes("--file")) {
		return "Write";
	}

	return "Unknown";
}

/**
 * Read JSON input from stdin with fallback to command line arguments
 * This is the official Claude Code pattern for hooks
 */
export async function readClaudeCodeHookInput(): Promise<HookExecutionResult> {
	try {
		// First try to read from stdin (official Claude Code pattern)
		if (!process.stdin.isTTY) {
			const stdinData = await readStdinAsString();

			if (stdinData.trim()) {
				try {
					const jsonData = JSON.parse(stdinData);

					// Validate required tool_name field
					if (!jsonData.tool_name) {
						throw new Error("Missing required field: tool_name");
					}

					return {
						success: true,
						data: jsonData as ClaudeCodeHookInput,
					};
				} catch (parseError: any) {
					console.error(`[HOOK] JSON parse error: ${parseError.message}`);
					console.error(`[HOOK] Raw stdin data: ${stdinData}`);

					return {
						success: false,
						error: `Invalid JSON from stdin: ${parseError.message}`,
						fallbackArgs: process.argv.slice(2),
					};
				}
			}
		}

		// Check for Claude Code's tool-input parameter
		const args = process.argv.slice(2);
		const toolInputIndex = args.findIndex((arg) => arg === "--tool-input");

		if (toolInputIndex !== -1 && toolInputIndex + 1 < args.length) {
			const toolInputValue = args[toolInputIndex + 1];

			// Claude Code passes '[object Object]' when there's actual JSON data
			// In this case, we need to reconstruct from other CLI arguments
			if (
				toolInputValue === "[object Object]" ||
				toolInputValue.startsWith("[object")
			) {
				console.log(
					"[HOOK] Detected Claude Code tool-input parameter, reconstructing JSON",
				);
				const reconstructedInput = reconstructFromCliArgs(args);

				if (reconstructedInput.tool_name) {
					return {
						success: true,
						data: reconstructedInput as ClaudeCodeHookInput,
					};
				}
			}

			// Try to parse the tool-input value as JSON
			try {
				const jsonData = JSON.parse(toolInputValue);
				if (jsonData.tool_name) {
					return {
						success: true,
						data: jsonData as ClaudeCodeHookInput,
					};
				}
			} catch {
				// Not valid JSON, continue to fallback
			}
		}

		// Fallback to command line arguments (for backwards compatibility)
		console.warn(
			"[HOOK] No JSON input found, falling back to command line arguments",
		);
		console.warn(
			"[HOOK] Consider updating hook configuration for proper JSON input",
		);

		return {
			success: false,
			error: "No JSON input available",
			fallbackArgs: process.argv.slice(2),
		};
	} catch (error: any) {
		return {
			success: false,
			error: `Failed to read hook input: ${error.message}`,
			fallbackArgs: process.argv.slice(2),
		};
	}
}

/**
 * Read stdin data as string with timeout
 */
async function readStdinAsString(timeoutMs: number = 5000): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = "";
		let timeoutId: NodeJS.Timeout;

		// Set timeout
		timeoutId = setTimeout(() => {
			process.stdin.removeAllListeners("data");
			process.stdin.removeAllListeners("end");
			reject(new Error(`Stdin read timeout after ${timeoutMs}ms`));
		}, timeoutMs);

		// Handle data
		process.stdin.on("data", (chunk) => {
			data += chunk.toString();
		});

		// Handle end
		process.stdin.on("end", () => {
			clearTimeout(timeoutId);
			resolve(data);
		});

		// Handle error
		process.stdin.on("error", (error) => {
			clearTimeout(timeoutId);
			reject(error);
		});

		// Resume stdin to start reading
		process.stdin.resume();
	});
}

/**
 * Parse command line arguments as fallback (backwards compatibility)
 */
export function parseCommandLineArgs(
	args: string[],
): Partial<ClaudeCodeHookInput> {
	const result: any = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg.startsWith("--")) {
			const key = arg.slice(2);
			const nextArg = args[i + 1];

			if (!nextArg || nextArg.startsWith("--")) {
				// Boolean flag
				result[key] = true;
			} else {
				// Value flag
				result[key] = nextArg;
				i++; // Skip next arg
			}
		}
	}

	return result;
}

/**
 * Validate hook input for specific tool types
 */
export function validateHookInput(input: ClaudeCodeHookInput): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Required field validation
	if (!input.tool_name) {
		errors.push("Missing required field: tool_name");
	}

	// Tool-specific validation
	switch (input.tool_name) {
		case "Bash":
			if (!input.command) {
				errors.push("Bash tool requires command field");
			}
			break;

		case "Write":
		case "Edit":
			if (!input.file_path) {
				errors.push(`${input.tool_name} tool requires file_path field`);
			}
			break;

		case "MultiEdit":
			if (!input.file_path) {
				errors.push("MultiEdit tool requires file_path field");
			}
			if (!input.edits || !Array.isArray(input.edits)) {
				errors.push("MultiEdit tool requires edits array");
			}
			break;

		case "Read":
			if (!input.file_path) {
				errors.push("Read tool requires file_path field");
			}
			break;

		case "Glob":
			if (!input.pattern) {
				errors.push("Glob tool requires pattern field");
			}
			break;

		case "Grep":
			if (!input.pattern) {
				errors.push("Grep tool requires pattern field");
			}
			break;
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Create hook input from legacy command line format (migration helper)
 */
export function createHookInputFromLegacyArgs(
	toolName: string,
	args: string[],
): ClaudeCodeHookInput {
	const parsedArgs = parseCommandLineArgs(args);

	return {
		tool_name: toolName,
		...parsedArgs,
	};
}

/**
 * Debug function to log hook input details
 */
export function debugHookInput(
	input: ClaudeCodeHookInput,
	source: "stdin" | "args" = "stdin",
): void {
	if (
		process.env.DEBUG === "true" &&
		process.env.DEBUG_CATEGORIES?.includes("hooks")
	) {
		console.error(`[HOOK DEBUG] Input source: ${source}`);
		console.error(`[HOOK DEBUG] Tool: ${input.tool_name}`);
		console.error(`[HOOK DEBUG] Data: ${JSON.stringify(input, null, 2)}`);
	}
}

export default {
	readClaudeCodeHookInput,
	parseCommandLineArgs,
	validateHookInput,
	createHookInputFromLegacyArgs,
	debugHookInput,
};
