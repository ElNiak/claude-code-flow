import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
// import { getErrorMessage as _getErrorMessage } from "../cli/shared/errors/error-handler.js";
import { debugLogger } from "./debug-logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getClaudeFlowRoot(): string {
	const correlationId = debugLogger.logFunctionEntry(
		"paths",
		"getClaudeFlowRoot",
		[],
		"utils-system",
	);
	try {
		// Try multiple strategies to find the root,
		const strategies = [
			// Strategy 1: From current file location,
			resolve(__dirname, "../.."),
			// Strategy 2: From process.cwd()
			process.cwd(),
			// Strategy 3: From npm global location,
			resolve(process.execPath, "../../lib/node_modules/claude-flow"),
			// Strategy 4: From environment variable,
			process.env.CLAUDE_FLOW_ROOT || "",
		];

		for (const path of strategies) {
			if (path && existsSync(join(path, "package.json"))) {
				try {
					const pkg = JSON.parse(
						readFileSync(join(path, "package.json"), "utf8"),
					);
					if (pkg.name === "claude-flow") {
						debugLogger.logFunctionExit(correlationId, path, "utils-system");
						return path;
					}
				} catch {}
			}
		}

		// Fallback to current working directory,
		const fallback = process.cwd();
		debugLogger.logFunctionExit(correlationId, fallback, "utils-system");
		return fallback;
	} catch (error) {
		debugLogger.logFunctionError(correlationId, error, "utils-system");
		throw error;
	}
}

export function getClaudeFlowBin(): string {
	return debugLogger.logSyncFunction(
		"paths",
		"getClaudeFlowBin",
		() => {
			return join(getClaudeFlowRoot(), "bin", "claude-flow");
		},
		[],
		"utils-system",
	);
}

export function resolveProjectPath(relativePath: string): string {
	return debugLogger.logSyncFunction(
		"paths",
		"resolveProjectPath",
		() => {
			const root = getClaudeFlowRoot();
			return resolve(root, relativePath);
		},
		[relativePath],
		"utils-system",
	);
}
