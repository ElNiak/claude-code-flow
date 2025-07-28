// ABOUTME: Node.js compatibility utilities for CLI operations
// ABOUTME: Provides cross-platform file system and process utilities

import { promises as fs, existsSync as fsExistsSync } from "fs";
import process from "process";

/**
 * Get command line arguments (excluding node and script path)
 */
export const args = process.argv.slice(2);

/**
 * Get current working directory
 */
export const cwd = () => process.cwd();

/**
 * Exit process with code
 */
export const exit = (code = 0) => process.exit(code);

/**
 * Create directory asynchronously (recursive)
 */
export const mkdirAsync = async (path) => {
	await fs.mkdir(path, { recursive: true });
};

/**
 * Write text file asynchronously
 */
export const writeTextFile = async (path, content) => {
	await fs.writeFile(path, content, "utf8");
};

/**
 * Check if file exists synchronously
 */
export const existsSync = fsExistsSync;

/**
 * Read text file asynchronously
 */
export const readTextFile = async (path) => {
	return await fs.readFile(path, "utf8");
};

/**
 * Mock Deno object for Node.js compatibility
 */
export const Deno = {
	cwd: () => process.cwd(),
	readTextFile: async (path) => {
		return await fs.readFile(path, "utf8");
	},
	writeTextFile: async (path, content) => {
		await fs.writeFile(path, content, "utf8");
	},
	mkdir: async (path) => {
		await fs.mkdir(path, { recursive: true });
	},
	remove: async (path) => {
		await fs.rm(path, { recursive: true, force: true });
	},
	stat: async (path) => {
		return await fs.stat(path);
	},
	readDir: async (path) => {
		const entries = await fs.readdir(path, { withFileTypes: true });
		return entries.map((entry) => ({
			name: entry.name,
			isFile: entry.isFile(),
			isDirectory: entry.isDirectory(),
		}));
	},
	env: {
		get: (key) => process.env[key],
		set: (key, value) => {
			process.env[key] = value;
		},
	},
	args: process.argv.slice(2),
};
