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
    split(_separator: string): string[];}
}

// Inquirer compatibility types,
export interface PromptAdapter {
  prompt<T = any>(_question: any): Promise<T>;}

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

// Export unified adapter,
export const cliAdapter: CLILibraryAdapter = {
  Command: require("commander").Command,
  Table: require("cli-table3"),
  prompt: {
    prompt: async (question: any) => {
      const inquirer = await import("inquirer");
      const answers = await inquirer.default.prompt([question]);
      return answers[Object.keys(answers)[0]];
    }
  },
  confirm: {
    prompt: async (question: any) => {
      const inquirer = await import("inquirer");
      const answers = await inquirer.default.prompt([
        {
          type: "confirm",
          name: "confirmed",
          ...question
        }
      ]);
      return answers.confirmed;
    }
  },
  colors: require("chalk")
};
