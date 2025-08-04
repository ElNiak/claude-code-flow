#!/usr/bin/env node
/**
 * Claude-Flow CLI - Core implementation using Node.js
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {
  ComponentLoggerFactory,
  generateCorrelationId,
  type IDebugLogger,
} from '../core/logger.js';
import { getVersion } from '../utils/version.js';

export const VERSION = getVersion();

interface CommandContext {
  args: string[];
  flags: Record<string, unknown>;
  config?: Record<string, unknown> | undefined;
}

interface Command {
  name: string;
  description: string;
  aliases?: string[];
  subcommands?: Command[];
  action?: (ctx: CommandContext) => Promise<void> | void;
  options?: Option[];
}

interface Option {
  name: string;
  short?: string;
  description: string;
  type?: 'string' | 'boolean' | 'number';
  default?: unknown;
  required?: boolean;
}

class CLI {
  private commands: Map<string, Command> = new Map();
  private logger: IDebugLogger;
  private correlationId: string;
  private globalOptions: Option[] = [
    {
      name: 'help',
      short: 'h',
      description: 'Show help',
      type: 'boolean',
    },
    {
      name: 'version',
      short: 'v',
      description: 'Show version',
      type: 'boolean',
    },
    {
      name: 'config',
      short: 'c',
      description: 'Path to configuration file',
      type: 'string',
    },
    {
      name: 'verbose',
      description: 'Enable verbose logging',
      type: 'boolean',
    },
    {
      name: 'log-level',
      description: 'Set log level (debug, info, warn, error)',
      type: 'string',
      default: 'info',
    },
  ];

  constructor(
    private name: string,
    private description: string,
  ) {
    this.correlationId = generateCorrelationId();
    this.logger = ComponentLoggerFactory.getCLILogger(this.correlationId);
    this.logger.debug('CLI core instance created', {
      name: this.name,
      description: this.description,
      correlationId: this.correlationId,
    });
  }

  command(cmd: Command): this {
    // Handle both our Command interface and Commander.js Command objects
    const cmdName =
      typeof (cmd as any).name === 'function' ? (cmd as any).name() : cmd.name || 'unknown';
    this.commands.set(cmdName, cmd);
    if (cmd.aliases && typeof cmd.aliases[Symbol.iterator] === 'function') {
      for (const alias of cmd.aliases) {
        this.commands.set(alias, cmd);
      }
    }
    return this;
  }

  async run(args = process.argv.slice(2)): Promise<void> {
    this.logger.debug('CLI run started', { args, correlationId: this.correlationId });
    this.logger.timeStart('cli-run-parse-args');

    // Parse arguments manually since we're replacing the Deno parse function
    const flags = this.parseArgs(args);
    this.logger.timeEnd('cli-run-parse-args', 'Arguments parsed successfully', { flags });

    if (flags.version || flags.v) {
      this.logger.info(`${this.name} v${VERSION}`, { version: VERSION, name: this.name });
      return;
    }

    const commandName = flags._[0]?.toString() || '';
    this.logger.debug('Command identified', { commandName, hasHelp: !!(flags.help || flags.h) });

    if (!commandName || flags.help || flags.h) {
      this.logger.debug('Showing help - no command specified or help requested');
      this.showHelp();
      return;
    }

    const command = this.commands.get(commandName);
    if (!command) {
      this.logger.error(`Unknown command: ${commandName}`, {
        availableCommands: Array.from(this.commands.keys()),
        commandName,
      });
      this.logger.info(`Run "${this.name} help" for available commands`);
      process.exit(1);
    }

    this.logger.debug('Command found, creating context', { commandName });
    this.logger.timeStart('cli-load-config');

    const ctx: CommandContext = {
      args: flags._.slice(1).map(String),
      flags: flags as Record<string, unknown>,
      config: await this.loadConfig(flags.config as string),
    };

    this.logger.timeEnd('cli-load-config', 'Configuration loaded', {
      hasConfig: !!ctx.config,
      argsCount: ctx.args.length,
    });

    try {
      if (command.action) {
        this.logger.debug('Executing command action', { commandName });
        this.logger.timeStart(`command-${commandName}`);
        await command.action(ctx);
        this.logger.timeEnd(
          `command-${commandName}`,
          `Command '${commandName}' completed successfully`,
        );
      } else {
        this.logger.warn(`Command '${commandName}' has no action defined`, { commandName });
      }
    } catch (error) {
      this.logger.timeEnd(`command-${commandName}`, `Command '${commandName}' failed`, { error });
      this.logger.error(`Error executing command '${commandName}':`, error);

      if (flags.verbose) {
        this.logger.error('Verbose error details:', error);
      }
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): Record<string, any> {
    const result: Record<string, any> = { _: [] };
    let i = 0;

    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result[key] = args[i + 1];
          i += 2;
        } else {
          result[key] = true;
          i++;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
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

  private async loadConfig(configPath?: string): Promise<Record<string, unknown> | undefined> {
    const configFile = configPath || 'claude-flow.config.json';
    try {
      const content = await fs.readFile(configFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  private getBooleanFlags(): string[] {
    const flags: string[] = [];
    for (const opt of [...this.globalOptions, ...this.getAllOptions()]) {
      if (opt.type === 'boolean') {
        flags.push(opt.name);
        if (opt.short) flags.push(opt.short);
      }
    }
    return flags;
  }

  private getStringFlags(): string[] {
    const flags: string[] = [];
    for (const opt of [...this.globalOptions, ...this.getAllOptions()]) {
      if (opt.type === 'string' || opt.type === 'number') {
        flags.push(opt.name);
        if (opt.short) flags.push(opt.short);
      }
    }
    return flags;
  }

  private getAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};
    for (const opt of [...this.globalOptions, ...this.getAllOptions()]) {
      if (opt.short) {
        aliases[opt.short] = opt.name;
      }
    }
    return aliases;
  }

  private getDefaults(): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const opt of [...this.globalOptions, ...this.getAllOptions()]) {
      if (opt.default !== undefined) {
        defaults[opt.name] = opt.default;
      }
    }
    return defaults;
  }

  private getAllOptions(): Option[] {
    const options: Option[] = [];
    for (const cmd of this.commands.values()) {
      if (cmd.options) {
        options.push(...cmd.options);
      }
    }
    return options;
  }

  private showHelp(): void {
    this.logger.debug('Displaying help information');

    const helpText = `
${chalk.bold(chalk.blue(`🧠 ${this.name} v${VERSION}`))} - ${this.description}

${chalk.bold('USAGE:')}
  ${this.name} [COMMAND] [OPTIONS]

${chalk.bold('COMMANDS:')}
${this.formatCommands()}

${chalk.bold('GLOBAL OPTIONS:')}
${this.formatOptions(this.globalOptions)}

${chalk.bold('EXAMPLES:')}
  ${this.name} start                                    # Start orchestrator
  ${this.name} agent spawn researcher --name "Bot"     # Spawn research agent
  ${this.name} task create research "Analyze data"     # Create task
  ${this.name} config init                             # Initialize config
  ${this.name} status                                  # Show system status

For more detailed help on specific commands, use:
  ${this.name} [COMMAND] --help

Documentation: https://github.com/ruvnet/claude-code-flow
Issues: https://github.com/ruvnet/claude-code-flow/issues

Created by rUv - Built with ❤️ for the Claude community
`;

    this.logger.info(helpText, { commandCount: this.commands.size });
  }

  private formatCommands(): string {
    const commands = Array.from(new Set(this.commands.values()));
    return commands
      .filter((cmd) => cmd && cmd.name) // Filter out invalid commands
      .map((cmd) => `  ${String(cmd.name).padEnd(20)} ${cmd.description || ''}`)
      .join('\n');
  }

  private formatOptions(options: Option[]): string {
    return options
      .map((opt) => {
        const flags = opt.short ? `-${opt.short}, --${opt.name}` : `    --${opt.name}`;
        return `  ${flags.padEnd(25)} ${opt.description}`;
      })
      .join('\n');
  }
}

// Helper functions with debug logging integration
function success(message: string): void {
  const logger = ComponentLoggerFactory.getCLILogger();
  const formattedMessage = chalk.green(`✅ ${message}`);
  logger.info(formattedMessage, { type: 'success', originalMessage: message });
}

function error(message: string): void {
  const logger = ComponentLoggerFactory.getCLILogger();
  const formattedMessage = chalk.red(`❌ ${message}`);
  logger.error(formattedMessage, { type: 'error', originalMessage: message });
}

function warning(message: string): void {
  const logger = ComponentLoggerFactory.getCLILogger();
  const formattedMessage = chalk.yellow(`⚠️  ${message}`);
  logger.warn(formattedMessage, { type: 'warning', originalMessage: message });
}

function info(message: string): void {
  const logger = ComponentLoggerFactory.getCLILogger();
  const formattedMessage = chalk.blue(`ℹ️  ${message}`);
  logger.info(formattedMessage, { type: 'info', originalMessage: message });
}

// Export for use in other modules
export { CLI, success, error, warning, info };
export type { Command, CommandContext, Option };

// Main CLI setup if running directly
async function main() {
  if (
    process.argv[1] &&
    (process.argv[1].endsWith('cli-core.js') || process.argv[1].endsWith('cli-core.ts'))
  ) {
    const correlationId = generateCorrelationId();
    const logger = ComponentLoggerFactory.getCLILogger(correlationId);

    logger.debug('CLI core direct execution started', { correlationId });
    logger.timeStart('cli-core-main');

    const cli = new CLI('claude-flow', 'Advanced AI Agent Orchestration System');

    // Import and register all commands
    const { setupCommands } = await import('./commands/index.js');
    setupCommands(cli);

    // Run the CLI
    try {
      await cli.run();
      logger.timeEnd('cli-core-main', 'CLI core execution completed successfully');
    } catch (error) {
      logger.timeEnd('cli-core-main', 'CLI core execution failed', { error });
      throw error;
    }
  }
}

// Execute main if this is the entry point
main().catch((error) => {
  const logger = ComponentLoggerFactory.getCLILogger();
  logger.error('CLI core main function failed', error);
});
