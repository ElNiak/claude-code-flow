/**
 * Library Compatibility Type Definitions
 * Unifies different CLI library interfaces for consistent usage
 */

// Extend cli-table3 types to match usage patterns
declare module "cli-table3" {
	interface HorizontalTable {
		header?(_headers: string[]): this;
		border?(_enabled: boolean): this;
		push(...rows: any[]): void;
	}

	interface GenericTable<T> {
		header?(_headers: string[]): this;
		border?(_enabled: boolean): this;
	}
}

// Extend commander types for consistency,
declare module "commander" {
	interface Command {
		meta?(): this;
		meta?(_key: string, _value: any): this;
	}
}

// Add Buffer extensions for string operations,
declare global {
	interface Buffer {
		split(_separator: string): string[];
	}
}

// Inquirer compatibility types,
export interface PromptAdapter {
	prompt<T = any>(_question: any): Promise<T>;
}

export interface ConfirmAdapter {
	prompt(_question: { message: string; default?: boolean }): Promise<boolean>;
}

// CLI Library adapter types,
export interface CLILibraryAdapter {
	Command: typeof import("commander").Command;
	Table: typeof import("cli-table3");
	prompt: PromptAdapter;
	confirm: ConfirmAdapter;
	colors: typeof import("chalk");
}

// Type-only imports to avoid runtime issues
import type * as chalk from "chalk";
import type * as CliTable3 from "cli-table3";
import type { Command } from "commander";

// Note: Runtime adapter should be implemented elsewhere
// This file provides only type definitions for compatibility
