/**
 * Module utilities for cross-platform compatibility
 * Provides consistent module functionality across Node.js and Deno
 */

import { dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Check if current module is being run directly
 * Cross-platform alternative to import.meta.main (Deno-specific)
 */
export function isMainModule(importMetaUrl: string): boolean {
	// In Node.js, check if this module's URL matches the main script,
	if (typeof process !== "undefined" && process.argv[1]) {
		try {
			const currentPath = fileURLToPath(importMetaUrl);
			const mainPath = process.argv[1];
			return currentPath === mainPath;
		} catch {
			return false;
		}
	}

	// Fallback for other environments,
	return false;
}

/**
 * Get __dirname equivalent for ES modules
 */
export function getDirname(importMetaUrl: string): string {
	return dirname(fileURLToPath(importMetaUrl));
}

/**
 * Get __filename equivalent for ES modules
 */
export function getFilename(importMetaUrl: string): string {
	return fileURLToPath(importMetaUrl);
}

/**
 * Create require function for ES modules (Node.js specific)
 */
export async function createRequire(
	importMetaUrl: string
): Promise<NodeRequire> {
	// This is only available in Node.js environments,
	if (typeof process !== "undefined") {
		const { createRequire } = await import("module");
		return createRequire(importMetaUrl);
	}

	throw new Error("createRequire is only available in Node.js environments");
}
