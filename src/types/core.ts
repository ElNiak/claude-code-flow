/**
 * Core TypeScript interfaces for Claude Flow command system
 * Part of Phase 1B TypeScript migration architecture
 */

import {
	type CommandMetadata,
	CommandOption,
} from "../cli/command-metadata.js";

export interface ParsedCommand {
	subcommand?: string;
	args: string[];
	options: Record<string, any>;
	help: boolean;
}

export interface CommandContext {
	args: string[];
	flags: Record<string, any>;
	command: string;
}

export interface ValidationError {
	field: string;
	message: string;
	value?: any;
}

export type CommandHandler<T = any> = (
	context: CommandContext,
	metadata: CommandMetadata,
) => Promise<T>;

export interface CommandRegistry {
	[commandName: string]: {
		handler: CommandHandler;
		metadata: CommandMetadata;
	};
}
