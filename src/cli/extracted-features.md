# Extracted Features from cli-core.ts

## Overview
This document contains valuable features extracted from cli-core.ts that should be integrated into simple-cli.ts to enhance its functionality.

## 1. TypeScript Interfaces

### CommandContext Interface
```typescript
interface CommandContext {
    args: string[];
    flags: Record<string, unknown>;
    config?: Record<string, unknown> | undefined;
}
```
**Value**: Provides type safety and clear structure for command execution context.

### Command Interface
```typescript
interface Command {
    name: string | (() => string);
    description: string;
    aliases?: string[];
    subcommands?: Command[];
    action?: (ctx: CommandContext) => Promise<void> | void;
    options?: Option[];
}
```
**Value**: Supports flexible command names (string or function), aliases, subcommands, and typed options.

### Option Interface
```typescript
interface Option {
    name: string;
    short?: string;
    description: string;
    type?: "string" | "boolean" | "number";
    default?: unknown;
    required?: boolean;
}
```
**Value**: Comprehensive option definition with types, defaults, and validation support.

## 2. CLI Class Features

### Advanced Argument Parsing
```typescript
private parseArgs(args: string[]): Record<string, any> {
    const result: Record<string, any> = { _: [] };
    let i = 0;

    while (i < args.length) {
        const arg = args[i];

        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
                result[key] = args[i + 1];
                i += 2;
            } else {
                result[key] = true;
                i++;
            }
        } else if (arg.startsWith("-")) {
            const key = arg.slice(1);
            if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
                result[key] = args[i + 1];
                i += 2;
            } else {
                result[key] = true;
                i++;
            }
        } else {
            result._.push(arg);
            i++;
        }
    }

    return result;
}
```
**Value**: More robust parsing than current simple-cli.ts implementation, handles both long and short flags properly.

### Command Management System
```typescript
private commands: Map<string, Command> = new Map();

command(cmd: Command): this {
    const cmdName = typeof cmd.name === "function" ? cmd.name() : cmd.name;
    this.commands.set(cmdName, cmd);
    if (cmd.aliases && typeof cmd.aliases[Symbol.iterator] === "function") {
        for (const alias of cmd.aliases) {
            this.commands.set(alias, cmd);
        }
    }
    return this;
}
```
**Value**: Efficient command storage with alias support and Commander.js compatibility.

### Configuration Loading
```typescript
private async loadConfig(configPath?: string): Promise<Record<string, unknown> | undefined> {
    const configFile = configPath || "claude-flow.config.json";
    try {
        const content = await fs.readFile(configFile, "utf8");
        return JSON.parse(content);
    } catch {
        return undefined;
    }
}
```
**Value**: Automatic configuration file loading with fallback support.

### Global Options Management
```typescript
private globalOptions: Option[] = [
    {
        name: "help",
        short: "h",
        description: "Show help",
        type: "boolean",
    },
    {
        name: "version",
        short: "v",
        description: "Show version",
        type: "boolean",
    },
    {
        name: "config",
        short: "c",
        description: "Path to configuration file",
        type: "string",
    },
    {
        name: "verbose",
        description: "Enable verbose logging",
        type: "boolean",
    },
    {
        name: "log-level",
        description: "Set log level (debug, info, warn, _error)",
        type: "string",
        default: "info",
    },
];
```
**Value**: Standardized global options with types and defaults.

### Enhanced Error Handling
```typescript
try {
    if (command.action) {
        await command.action(ctx);
    } else {
        console.log(chalk.yellow(`Command '${commandName}' has no action defined`));
    }
} catch (error) {
    console.error(
        chalk.red(`Error executing command '${commandName}':`),
        (error as Error).message
    );
    if (flags.verbose) {
        console.error(error);
    }
    process.exit(1);
}
```
**Value**: Better error reporting with verbose mode support.

### Option Utility Methods
```typescript
private getBooleanFlags(): string[] { /* ... */ }
private getStringFlags(): string[] { /* ... */ }
private getAliases(): Record<string, string> { /* ... */ }
private getDefaults(): Record<string, unknown> { /* ... */ }
private getAllOptions(): Option[] { /* ... */ }
```
**Value**: Helper methods for option processing and validation.

### Enhanced Help System
```typescript
private formatCommands(): string {
    const commands = Array.from(new Set(this.commands.values()));
    return commands
        .filter((cmd) => cmd && cmd.name)
        .map((cmd) => `  ${String(cmd.name).padEnd(20)} ${cmd.description || ""}`)
        .join("\n");
}

private formatOptions(options: Option[]): string {
    return options
        .map((opt) => {
            const flags = opt.short
                ? `-${opt.short}, --${opt.name}`
                : `    --${opt.name}`;
            return `  ${flags.padEnd(25)} ${opt.description}`;
        })
        .join("\n");
}
```
**Value**: Professional help formatting with proper alignment.

## 3. Helper Functions

### Styled Output Functions
```typescript
function success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
}

function _error(message: string): void {
    console.error(chalk.red(`❌ ${message}`));
}

function warning(message: string): void {
    console.warn(chalk.yellow(`⚠️  ${message}`));
}

function info(message: string): void {
    console.log(chalk.blue(`ℹ️  ${message}`));
}
```
**Value**: Consistent, styled output functions (note: simple-cli.ts has similar but could be enhanced).

## 4. Key Integration Points

### What to Integrate into simple-cli.ts:

1. **TypeScript Interfaces**: Add CommandContext, Command, and Option interfaces for better type safety
2. **Enhanced parseArgs**: Replace current parsing with the more robust implementation
3. **Command Management**: Add Map-based command storage with alias support
4. **Configuration Loading**: Add automatic config file loading
5. **Global Options**: Standardize global options handling
6. **Option Utility Methods**: Add helper methods for option processing
7. **Enhanced Help Formatting**: Improve help display with better formatting

### Integration Strategy:

1. Keep simple-cli.ts's current structure and flow
2. Add the interfaces at the top
3. Enhance parseFlags function with cli-core's parseArgs logic
4. Add configuration loading capability
5. Enhance error handling with verbose mode
6. Keep the existing command registry system but enhance with alias support
7. Maintain compatibility with existing commands

## Notes

- cli-core.ts uses a class-based approach while simple-cli.ts is functional
- We should maintain simple-cli.ts's functional approach but add the valuable features
- The command registry system in simple-cli.ts is good and should be kept
- Focus on enhancing type safety, parsing, and error handling
