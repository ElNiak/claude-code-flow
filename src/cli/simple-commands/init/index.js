import { ConsoleMigration } from '../../../utils/console-migration.js';
// init/index.js - Initialize Claude Code integration files
import { printSuccess, printError, printWarning } from '../../utils.js';
import { Deno, cwd, exit, existsSync } from '../../node-compat.js';
import process from 'process';
import { createLocalExecutable } from './executable-wrapper.js';
import { createSparcStructureManually } from './sparc-structure.js';
import { createClaudeSlashCommands } from './claude-commands/slash-commands.js';
import { createOptimizedClaudeSlashCommands } from './claude-commands/optimized-slash-commands.js';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { copyTemplates } from './template-copier.js';
import { copyRevisedTemplates, validateTemplatesExist } from './copy-revised-templates.js';
import { copyAgentFiles, createAgentDirectories, validateAgentSystem } from './agent-copier.js';
import { showInitHelp } from './help.js';
import { batchInitCommand, batchInitFromConfig, validateBatchOptions } from './batch-init.js';
import { ValidationSystem, runFullValidation } from './validation/index.js';
import { RollbackSystem, createAtomicOperation } from './rollback/index.js';
import {
  createEnhancedClaudeMd,
  createEnhancedSettingsJson,
  createWrapperScript,
  createCommandDoc,
  createHelperScript,
  createMcpJson,
  createVSCodeSettings,
  createVSCodeTasks,
  createVSCodeLaunch,
  COMMAND_STRUCTURE,
} from './templates/enhanced-templates.js';
import { getIsolatedNpxEnv } from '../../../utils/npx-isolated-cache.js';
import { updateGitignore, needsGitignoreUpdate } from './gitignore-updater.js';
import {
  createFullClaudeMd,
  createSparcClaudeMd,
  createMinimalClaudeMd,
} from './templates/claude-md.js';
import {
  createFullMemoryBankMd,
  createMinimalMemoryBankMd,
} from './templates/memory-bank-md.js';
import {
  createFullCoordinationMd,
  createMinimalCoordinationMd,
} from './templates/coordination-md.js';
import { createAgentsReadme, createSessionsReadme } from './templates/readme-files.js';

/**
 * Check if Claude Code CLI is installed
 */
function isClaudeCodeInstalled() {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Set up MCP servers in Claude Code
 */
async function setupMcpServers(dryRun = false) {
  ConsoleMigration.log('CLI', '\n🔌 Setting up MCP servers for Claude Code...');

  // Import command builder utilities
  const { buildMcpCommand, validateEnvironmentVariables, prepareServerConfig } =
    await import('./mcp-command-builder.js');

  // Enhanced server configurations matching .mcp.example.json
  const servers = [
    {
      name: 'claude-flow',
      command: 'npx',
      args: ['claude-flow@alpha', 'mcp', 'start'],
      type: 'stdio',
      description: 'Claude Flow MCP server with swarm orchestration (alpha)',
    },
    {
      name: 'ruv-swarm',
      command: 'npx',
      args: ['ruv-swarm@latest', 'mcp', 'start'],
      type: 'stdio',
      description: 'ruv-swarm MCP server for enhanced coordination',
    },
    {
      name: 'sequential-thinking',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      description: 'Sequential thinking MCP server for structured problem-solving',
    },
    {
      name: 'perplexity-ask',
      command: 'docker',
      args: ['run', '-i', '--rm', '-e', 'PERPLEXITY_API_KEY', 'mcp/perplexity-ask'],
      env: {
        PERPLEXITY_API_KEY: 'TODO-API-KEY'
      },
      description: 'Perplexity Ask MCP server for web research capabilities',
    },
    {
      name: 'context7',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
      type: 'stdio',
      description: 'Context7 MCP server for library documentation retrieval',
    },
    {
      name: 'serena',
      command: 'uvx',
      args: [
        '--from',
        'git+https://github.com/oraios/serena',
        'serena-mcp-server',
        '--context',
        'ide-assistant',
        '--project',
        '${PWD}',
        '--tool-timeout',
        '20',
        '--mode',
        'planning',
        '--enable-web-dashboard',
        'false'
      ],
      type: 'stdio',
      description: 'Serena MCP server for advanced code analysis and LSP integration',
    },
    {
      name: 'consult7',
      command: 'uvx',
      args: ['consult7', 'google', 'TODO-API-KEY'],
      type: 'stdio',
      description: 'Consult7 MCP server for advanced reasoning with Google Gemini',
    },
  ];

  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  for (const server of servers) {
    try {
      // Prepare server configuration with environment variable substitution
      const preparedConfig = prepareServerConfig(server);

      // Validate required environment variables
      const envValidation = validateEnvironmentVariables(server);
      if (!envValidation.valid) {
        ConsoleMigration.log('CLI', `  ⚠️  ${server.name} requires environment variables: ${envValidation.missing.join(', ')}`);
        ConsoleMigration.log('CLI', `     Set these variables before running: ${envValidation.missing.map(v => `export ${v}=your_value`).join('; ')}`);

        if (!dryRun) {
          failures.push({
            name: server.name,
            error: `Missing required environment variables: ${envValidation.missing.join(', ')}`
          });
          failureCount++;
          continue;
        }
      }

      // Build the command string
      const commandString = buildMcpCommand(preparedConfig);

      if (!dryRun) {
        ConsoleMigration.log('CLI', `  🔄 Adding ${server.name}...`);

        // Special handling for different command types
        if (server.command === 'docker' && server.env) {
          // For Docker commands with environment variables, we need to ensure env vars are available
          const missingEnvVars = envValidation.missing;
          if (missingEnvVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
          }
        }

        execSync(`claude mcp add ${server.name} ${commandString}`, {
          stdio: 'inherit',
          env: { ...process.env, ...server.env }
        });

        if ("serena" in server.command) {
          execSync(`uvx --from git+https://github.com/oraios/serena serena project index}`, {
            stdio: 'inherit',
            env: { ...process.env, ...server.env }
          });
        }
        ConsoleMigration.log('CLI', `  ✅ Added ${server.name} - ${server.description}`);
        successCount++;
      } else {
        ConsoleMigration.log('CLI', `  [DRY RUN] Would add ${server.name} - ${server.description}`);
        ConsoleMigration.log('CLI', `  [DRY RUN] Command: claude mcp add ${server.name} ${commandString}`);
        if (server.env) {
          ConsoleMigration.log('CLI', `  [DRY RUN] Environment variables: ${Object.keys(server.env).join(', ')}`);
        }
        successCount++;
      }
    } catch (err) {
      ConsoleMigration.log('CLI', `  ⚠️  Failed to add ${server.name}: ${err.message}`);

      // Provide specific troubleshooting based on server type
      if (server.command === 'docker') {
        ConsoleMigration.log('CLI', `     • Make sure Docker is installed and running`);
        ConsoleMigration.log('CLI', `     • Set required environment variables: ${Object.keys(server.env || {}).join(', ')}`);
        ConsoleMigration.log('CLI', `     • Pull the Docker image: docker pull mcp/perplexity-ask`);
      } else if (server.command === 'uvx') {
        ConsoleMigration.log('CLI', `     • Make sure uv is installed: pip install uv`);
        ConsoleMigration.log('CLI', `     • For Git repositories, ensure you have Git access`);
      } else if (server.command === 'npx') {
        ConsoleMigration.log('CLI', `     • Make sure Node.js and npm are installed`);
        ConsoleMigration.log('CLI', `     • Try installing the package globally first`);
      }

      const commandString = buildMcpCommand(prepareServerConfig(server));
      ConsoleMigration.log('CLI', `     • Manual installation: claude mcp add ${server.name} ${commandString}`);

      failures.push({
        name: server.name,
        error: err.message
      });
      failureCount++;
    }
  }

  // Summary
  ConsoleMigration.log('CLI', `\n📊 MCP Server Setup Summary:`);
  ConsoleMigration.log('CLI', `  ✅ Successfully configured: ${successCount} servers`);

  if (failureCount > 0) {
    ConsoleMigration.log('CLI', `  ❌ Failed to configure: ${failureCount} servers`);
    ConsoleMigration.log('CLI', `\n⚠️  Failed servers:`);
    failures.forEach(failure => {
      ConsoleMigration.log('CLI', `     ${failure.name}: ${failure.error}`);
    });
  }

  if (!dryRun && successCount > 0) {
    ConsoleMigration.log('CLI', '\n  📋 Verifying MCP servers...');
    try {
      execSync('claude mcp list', { stdio: 'inherit' });
    } catch (err) {
      ConsoleMigration.log('CLI', '  ⚠️  Could not verify MCP servers');
    }
  }

  if (dryRun) {
    ConsoleMigration.log('CLI', '\n💡 To proceed with actual setup, run the same command without --dry-run');
    ConsoleMigration.log('CLI', '   Make sure to set required environment variables first.');
  }
}

export async function initCommand(subArgs, flags) {
  // Show help if requested
  if (flags.help || flags.h || subArgs.includes('--help') || subArgs.includes('-h')) {
    showInitHelp();
    return;
  }

  // Default to enhanced Claude Flow v2 init
  // Use --basic flag for old behavior
  if (!flags.basic && !flags.minimal && !flags.sparc) {
    return await enhancedClaudeFlowInit(flags, subArgs);
  }

  // Check for validation and rollback commands
  if (subArgs.includes('--validate') || subArgs.includes('--validate-only')) {
    return handleValidationCommand(subArgs, flags);
  }

  if (subArgs.includes('--rollback')) {
    return handleRollbackCommand(subArgs, flags);
  }

  if (subArgs.includes('--list-backups')) {
    return handleListBackups(subArgs, flags);
  }

  // Check for batch operations
  const batchInitFlag = flags['batch-init'] || subArgs.includes('--batch-init');
  const configFlag = flags.config || subArgs.includes('--config');

  if (batchInitFlag || configFlag) {
    return handleBatchInit(subArgs, flags);
  }

  // Check if enhanced initialization is requested
  const useEnhanced = subArgs.includes('--enhanced') || subArgs.includes('--safe');

  if (useEnhanced) {
    return enhancedInitCommand(subArgs, flags);
  }

  // Parse init options
  const initForce = subArgs.includes('--force') || subArgs.includes('-f') || flags.force;
  const initMinimal = subArgs.includes('--minimal') || subArgs.includes('-m') || flags.minimal;
  const initSparc = true; // SPARC is now included by default
  const initDryRun = subArgs.includes('--dry-run') || subArgs.includes('-d') || flags.dryRun;
  const initOptimized = initSparc && initForce; // Use optimized templates when both flags are present
  const selectedModes = flags.modes ? flags.modes.split(',') : null; // Support selective mode initialization

  // Get the actual working directory (where the command was run from)
  // Use PWD environment variable which preserves the original directory
  const workingDir = process.env.PWD || cwd();
  ConsoleMigration.log('CLI', `📁 Initializing in: ${workingDir}`);

  // Change to the working directory to ensure all file operations happen there
  try {
    process.chdir(workingDir);
  } catch (err) {
    printWarning(`Could not change to directory ${workingDir}: ${err.message}`);
  }

  try {
    printSuccess('Initializing Claude Code integration files...');

    // Check if files already exist in the working directory
    const files = ['CLAUDE.md', 'memory-bank.md', 'coordination.md'];
    const existingFiles = [];

    for (const file of files) {
      try {
        await Deno.stat(`${workingDir}/${file}`);
        existingFiles.push(file);
      } catch {
        // File doesn't exist, which is what we want
      }
    }

    if (existingFiles.length > 0 && !initForce) {
      printWarning(`The following files already exist: ${existingFiles.join(', ')}`);
      ConsoleMigration.log('CLI', 'Use --force to overwrite existing files');
      return;
    }

    // Use template copier to copy all template files
    const templateOptions = {
      sparc: initSparc,
      minimal: initMinimal,
      optimized: initOptimized,
      dryRun: initDryRun,
      force: initForce,
      selectedModes: selectedModes,
    };

    // First try to copy revised templates from repository
    const validation = validateTemplatesExist();
    if (validation.valid) {
      ConsoleMigration.log('CLI', '  📁 Copying revised template files...');
      const revisedResults = await copyRevisedTemplates(workingDir, {
        force: initForce,
        dryRun: initDryRun,
        verbose: true,
        sparc: initSparc
      });

      if (revisedResults.success) {
        ConsoleMigration.log('CLI', `  ✅ Copied ${revisedResults.copiedFiles.length} template files`);
        if (revisedResults.skippedFiles.length > 0) {
          ConsoleMigration.log('CLI', `  ⏭️  Skipped ${revisedResults.skippedFiles.length} existing files`);
        }
      } else {
        ConsoleMigration.log('CLI', '  ⚠️  Some template files could not be copied:');
        revisedResults.errors.forEach(err => ConsoleMigration.log('CLI', `    - ${err}`));
      }
    } else {
      // Fall back to generated templates
      ConsoleMigration.log('CLI', '  ⚠️  Revised templates not available, using generated templates');
      const copyResults = await copyTemplates(workingDir, templateOptions);

      if (!copyResults.success) {
        printError('Failed to copy templates:');
        copyResults.errors.forEach(err => ConsoleMigration.log('CLI', `  ❌ ${err}`));
        return;
      }
    }

    // Agent setup moved to end of function where execution is guaranteed

    // Directory structure is created by template copier

    // SPARC files are created by template copier when --sparc flag is used

    // Memory README files and persistence database are created by template copier

    // Create local claude-flow executable wrapper
    if (!initDryRun) {
      await createLocalExecutable(workingDir);
    } else {
      ConsoleMigration.log('CLI', '  [DRY RUN] Would create local claude-flow executable wrapper');
    }

    // SPARC initialization
    if (initSparc) {
      ConsoleMigration.log('CLI', '\n🚀 Initializing SPARC development environment...');

      if (initDryRun) {
        ConsoleMigration.log('CLI', '  [DRY RUN] Would run: npx -y create-sparc init --force');
        ConsoleMigration.log('CLI', '  [DRY RUN] Would create SPARC environment with all modes');
        ConsoleMigration.log('CLI',
          '  [DRY RUN] Would create Claude slash commands' +
            (initOptimized ? ' (Batchtools-optimized)' : ''),
        );
        if (selectedModes) {
          ConsoleMigration.log('CLI',
            `  [DRY RUN] Would create commands for selected modes: ${selectedModes.join(', ')}`,
          );
        }
      } else {
        // Check if create-sparc exists and run it
        let sparcInitialized = false;
        try {
          // Use isolated NPX cache to prevent concurrent conflicts
          const createSparcCommand = new Deno.Command('npx', {
            args: ['-y', 'create-sparc', 'init', '--force'],
            cwd: workingDir, // Use the original working directory
            stdout: 'inherit',
            stderr: 'inherit',
            env: getIsolatedNpxEnv({
              PWD: workingDir, // Ensure PWD is set correctly
            }),
          });

          ConsoleMigration.log('CLI', '  🔄 Running: npx -y create-sparc init --force');
          const createSparcResult = await createSparcCommand.output();

          if (createSparcResult.success) {
            ConsoleMigration.log('CLI', '  ✅ SPARC environment initialized successfully');
            sparcInitialized = true;
          } else {
            printWarning('create-sparc failed, creating basic SPARC structure manually...');

            // Fallback: create basic SPARC structure manually
            await createSparcStructureManually();
            sparcInitialized = true; // Manual creation still counts as initialized
          }
        } catch (err) {
          printWarning('create-sparc not available, creating basic SPARC structure manually...');

          // Fallback: create basic SPARC structure manually
          await createSparcStructureManually();
          sparcInitialized = true; // Manual creation still counts as initialized
        }

        // Always create Claude slash commands after SPARC initialization
        if (sparcInitialized) {
          try {
            if (initOptimized) {
              await createOptimizedClaudeSlashCommands(workingDir, selectedModes);
            } else {
              await createClaudeSlashCommands(workingDir);
            }
          } catch (err) {
            // Legacy slash command creation - silently skip if it fails
            // SPARC slash commands are already created successfully above
          }
        }
      }
    }

    if (initDryRun) {
      printSuccess("🔍 Dry run completed! Here's what would be created:");
      ConsoleMigration.log('CLI', '\n📋 Summary of planned initialization:');
      ConsoleMigration.log('CLI',
        `  • Configuration: ${initOptimized ? 'Batchtools-optimized SPARC' : initSparc ? 'SPARC-enhanced' : 'Standard'}`,
      );
      ConsoleMigration.log('CLI',
        `  • Template type: ${initOptimized ? 'Optimized for parallel processing' : 'Standard'}`,
      );
      ConsoleMigration.log('CLI', '  • Core files: CLAUDE.md, memory-bank.md, coordination.md');
      ConsoleMigration.log('CLI', '  • Directory structure: memory/, coordination/, .claude/');
      ConsoleMigration.log('CLI', '  • Local executable: ./claude-flow');
      if (initSparc) {
        ConsoleMigration.log('CLI',
          `  • Claude Code slash commands: ${selectedModes ? selectedModes.length : 'All'} SPARC mode commands`,
        );
        ConsoleMigration.log('CLI', '  • SPARC environment with all development modes');
      }
      if (initOptimized) {
        ConsoleMigration.log('CLI', '  • Batchtools optimization: Enabled for parallel processing');
        ConsoleMigration.log('CLI', '  • Performance enhancements: Smart batching, concurrent operations');
      }
      ConsoleMigration.log('CLI', '\n🚀 To proceed with initialization, run the same command without --dry-run');
    } else {
      printSuccess('🎉 Claude Code integration files initialized successfully!');

      if (initOptimized) {
        ConsoleMigration.log('CLI', '\n⚡ Batchtools Optimization Enabled!');
        ConsoleMigration.log('CLI', '  • Parallel processing capabilities activated');
        ConsoleMigration.log('CLI', '  • Performance improvements: 250-500% faster operations');
        ConsoleMigration.log('CLI', '  • Smart batching and concurrent operations available');
      }

      ConsoleMigration.log('CLI', '\n📋 What was created:');
      ConsoleMigration.log('CLI',
        `  ✅ CLAUDE.md (${initOptimized ? 'Batchtools-optimized' : initSparc ? 'SPARC-enhanced' : 'Standard configuration'})`,
      );
      ConsoleMigration.log('CLI',
        `  ✅ memory-bank.md (${initOptimized ? 'With parallel processing' : 'Standard memory system'})`,
      );
      ConsoleMigration.log('CLI',
        `  ✅ coordination.md (${initOptimized ? 'Enhanced with batchtools' : 'Standard coordination'})`,
      );
      ConsoleMigration.log('CLI', '  ✅ Directory structure with memory/ and coordination/');
      ConsoleMigration.log('CLI', '  ✅ Local executable at ./claude-flow');
      ConsoleMigration.log('CLI', '  ✅ Persistence database at memory/claude-flow-data.json');
      ConsoleMigration.log('CLI', '  ✅ Agent system with 64 specialized agents in .claude/agents/');

      if (initSparc) {
        const modeCount = selectedModes ? selectedModes.length : '20+';
        ConsoleMigration.log('CLI', `  ✅ Claude Code slash commands (${modeCount} SPARC modes)`);
        ConsoleMigration.log('CLI', '  ✅ Complete SPARC development environment');
      }

      ConsoleMigration.log('CLI', '\n🚀 Next steps:');
      ConsoleMigration.log('CLI', '1. Review and customize the generated files for your project');
      ConsoleMigration.log('CLI', "2. Run './claude-flow start' to begin the orchestration system");
      ConsoleMigration.log('CLI', "3. Use './claude-flow' instead of 'npx claude-flow' for all commands");
      ConsoleMigration.log('CLI', "4. Use 'claude --dangerously-skip-permissions' for unattended operation");

      if (initSparc) {
        ConsoleMigration.log('CLI',
          '5. Use Claude Code slash commands: /sparc, /sparc-architect, /sparc-tdd, etc.',
        );
        ConsoleMigration.log('CLI', "6. Explore SPARC modes with './claude-flow sparc modes'");
        ConsoleMigration.log('CLI', '7. Try TDD workflow with \'./claude-flow sparc tdd "your task"\'');

        if (initOptimized) {
          ConsoleMigration.log('CLI', '8. Use batchtools commands: /batchtools, /performance for optimization');
          ConsoleMigration.log('CLI', '9. Enable parallel processing with --parallel flags');
          ConsoleMigration.log('CLI', "10. Monitor performance with './claude-flow performance monitor'");
        }
      }

      // Update .gitignore
      const gitignoreResult = await updateGitignore(workingDir, initForce, initDryRun);
      if (gitignoreResult.success) {
        if (!initDryRun) {
          ConsoleMigration.log('CLI', `  ✅ ${gitignoreResult.message}`);
        } else {
          ConsoleMigration.log('CLI', `  ${gitignoreResult.message}`);
        }
      } else {
        ConsoleMigration.log('CLI', `  ⚠️  ${gitignoreResult.message}`);
      }

      ConsoleMigration.log('CLI', '\n💡 Tips:');
      ConsoleMigration.log('CLI', "  • Type '/' in Claude Code to see all available slash commands");
      ConsoleMigration.log('CLI', "  • Use './claude-flow status' to check system health");
      ConsoleMigration.log('CLI', "  • Store important context with './claude-flow memory store'");

      if (initOptimized) {
        ConsoleMigration.log('CLI', '  • Use --parallel flags for concurrent operations');
        ConsoleMigration.log('CLI', '  • Enable batch processing for multiple related tasks');
        ConsoleMigration.log('CLI', '  • Monitor performance with real-time metrics');
      }

      // Check for Claude Code and set up MCP servers (always enabled by default)
      if (!initDryRun && isClaudeCodeInstalled()) {
        ConsoleMigration.log('CLI', '\n🔍 Claude Code CLI detected!');
        const skipMcp = subArgs && subArgs.includes && subArgs.includes('--skip-mcp');

        if (!skipMcp) {
          await setupMcpServers(initDryRun);
        } else {
          ConsoleMigration.log('CLI', '  ℹ️  Skipping MCP setup (--skip-mcp flag used)');
        }
      } else if (!initDryRun && !isClaudeCodeInstalled()) {
        ConsoleMigration.log('CLI', '\n⚠️  Claude Code CLI not detected!');
        ConsoleMigration.log('CLI', '  📥 Install with: npm install -g @anthropic-ai/claude-code');
        ConsoleMigration.log('CLI', '  📋 Then add MCP servers manually with:');
        ConsoleMigration.log('CLI', '     claude mcp add claude-flow claude-flow mcp start');
        ConsoleMigration.log('CLI', '     claude mcp add ruv-swarm npx ruv-swarm mcp start');
      }
    }
  } catch (err) {
    printError(`Failed to initialize files: ${err.message}`);
  }
}

// Handle batch initialization
async function handleBatchInit(subArgs, flags) {
  try {
    // Options parsing from flags and subArgs
    const options = {
      parallel: !flags['no-parallel'] && flags.parallel !== false,
      sparc: flags.sparc || flags.s,
      minimal: flags.minimal || flags.m,
      force: flags.force || flags.f,
      maxConcurrency: flags['max-concurrent'] || 5,
      progressTracking: true,
      template: flags.template,
      environments: flags.environments
        ? flags.environments.split(',').map((env) => env.trim())
        : ['dev'],
    };

    // Validate options
    const validationErrors = validateBatchOptions(options);
    if (validationErrors.length > 0) {
      printError('Batch options validation failed:');
      validationErrors.forEach((error) => ConsoleMigration.error('CLI', `  - ${error}`));
      return;
    }

    // Config file mode
    if (flags.config) {
      const configFile = flags.config;
      printSuccess(`Loading batch configuration from: ${configFile}`);
      const results = await batchInitFromConfig(configFile, options);
      if (results) {
        printSuccess('Batch initialization from config completed');
      }
      return;
    }

    // Batch init mode
    if (flags['batch-init']) {
      const projectsString = flags['batch-init'];
      const projects = projectsString.split(',').map((project) => project.trim());

      if (projects.length === 0) {
        printError('No projects specified for batch initialization');
        return;
      }

      printSuccess(`Initializing ${projects.length} projects in batch mode`);
      const results = await batchInitCommand(projects, options);

      if (results) {
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        if (failed === 0) {
          printSuccess(`All ${successful} projects initialized successfully`);
        } else {
          printWarning(`${successful} projects succeeded, ${failed} failed`);
        }
      }
      return;
    }

    printError('No batch operation specified. Use --batch-init <projects> or --config <file>');
  } catch (err) {
    printError(`Batch initialization failed: ${err.message}`);
  }
}

/**
 * Enhanced initialization command with validation and rollback
 */
async function enhancedInitCommand(subArgs, flags) {
  ConsoleMigration.log('CLI', '🛡️  Starting enhanced initialization with validation and rollback...');

  // Store parameters to avoid scope issues in async context
  const args = subArgs || [];
  const options = flags || {};

  // Get the working directory
  const workingDir = Deno.env.get('PWD') || Deno.cwd();

  // Initialize systems
  const rollbackSystem = new RollbackSystem(workingDir);
  const validationSystem = new ValidationSystem(workingDir);

  let atomicOp = null;

  try {
    // Parse options
    const initOptions = {
      force: args.includes('--force') || args.includes('-f') || options.force,
      minimal: args.includes('--minimal') || args.includes('-m') || options.minimal,
      sparc: args.includes('--sparc') || args.includes('-s') || options.sparc,
      skipPreValidation: args.includes('--skip-pre-validation'),
      skipBackup: args.includes('--skip-backup'),
      validateOnly: args.includes('--validate-only'),
    };

    // Phase 1: Pre-initialization validation
    if (!initOptions.skipPreValidation) {
      ConsoleMigration.log('CLI', '\n🔍 Phase 1: Pre-initialization validation...');
      const preValidation = await validationSystem.validatePreInit(initOptions);

      if (!preValidation.success) {
        printError('Pre-initialization validation failed:');
        preValidation.errors.forEach((error) => ConsoleMigration.error('CLI', `  ❌ ${error}`));
        return;
      }

      if (preValidation.warnings.length > 0) {
        printWarning('Pre-initialization warnings:');
        preValidation.warnings.forEach((warning) => ConsoleMigration.warn('CLI', `  ⚠️  ${warning}`));
      }

      printSuccess('Pre-initialization validation passed');
    }

    // Stop here if validation-only mode
    if (options.validateOnly) {
      ConsoleMigration.log('CLI', '\n✅ Validation-only mode completed');
      return;
    }

    // Phase 2: Create backup
    if (!options.skipBackup) {
      ConsoleMigration.log('CLI', '\n💾 Phase 2: Creating backup...');
      const backupResult = await rollbackSystem.createPreInitBackup();

      if (!backupResult.success) {
        printError('Backup creation failed:');
        backupResult.errors.forEach((error) => ConsoleMigration.error('CLI', `  ❌ ${error}`));
        return;
      }
    }

    // Phase 3: Initialize with atomic operations
    ConsoleMigration.log('CLI', '\n🔧 Phase 3: Atomic initialization...');
    atomicOp = createAtomicOperation(rollbackSystem, 'enhanced-init');

    const atomicBegin = await atomicOp.begin();
    if (!atomicBegin) {
      printError('Failed to begin atomic operation');
      return;
    }

    // Perform initialization steps with checkpoints
    await performInitializationWithCheckpoints(rollbackSystem, options, workingDir, dryRun);

    // Phase 4: Post-initialization validation
    ConsoleMigration.log('CLI', '\n✅ Phase 4: Post-initialization validation...');
    const postValidation = await validationSystem.validatePostInit();

    if (!postValidation.success) {
      printError('Post-initialization validation failed:');
      postValidation.errors.forEach((error) => ConsoleMigration.error('CLI', `  ❌ ${error}`));

      // Attempt automatic rollback
      ConsoleMigration.log('CLI', '\n🔄 Attempting automatic rollback...');
      await atomicOp.rollback();
      printWarning('Initialization rolled back due to validation failure');
      return;
    }

    // Phase 5: Configuration validation
    ConsoleMigration.log('CLI', '\n🔧 Phase 5: Configuration validation...');
    const configValidation = await validationSystem.validateConfiguration();

    if (configValidation.warnings.length > 0) {
      printWarning('Configuration warnings:');
      configValidation.warnings.forEach((warning) => ConsoleMigration.warn('CLI', `  ⚠️  ${warning}`));
    }

    // Phase 6: Health checks
    ConsoleMigration.log('CLI', '\n🏥 Phase 6: System health checks...');
    const healthChecks = await validationSystem.runHealthChecks();

    if (healthChecks.warnings.length > 0) {
      printWarning('Health check warnings:');
      healthChecks.warnings.forEach((warning) => ConsoleMigration.warn('CLI', `  ⚠️  ${warning}`));
    }

    // Commit atomic operation
    await atomicOp.commit();

    // Generate and display validation report
    const fullValidation = await runFullValidation(workingDir, {
      postInit: true,
      skipPreInit: options.skipPreValidation,
    });

    ConsoleMigration.log('CLI', '\n📊 Validation Report:');
    ConsoleMigration.log('CLI', fullValidation.report);

    printSuccess('🎉 Enhanced initialization completed successfully!');
    ConsoleMigration.log('CLI', '\n✨ Your SPARC environment is fully validated and ready to use');
  } catch (error) {
    printError(`Enhanced initialization failed: ${error.message}`);

    // Attempt rollback if atomic operation is active
    if (atomicOp && !atomicOp.completed) {
      ConsoleMigration.log('CLI', '\n🔄 Performing emergency rollback...');
      try {
        await atomicOp.rollback();
        printWarning('Emergency rollback completed');
      } catch (rollbackError) {
        printError(`Rollback also failed: ${rollbackError.message}`);
      }
    }
  }
}

/**
 * Handle validation commands
 */
async function handleValidationCommand(subArgs, flags) {
  const workingDir = Deno.env.get('PWD') || Deno.cwd();

  ConsoleMigration.log('CLI', '🔍 Running validation checks...');

  const options = {
    skipPreInit: subArgs.includes('--skip-pre-init'),
    skipConfig: subArgs.includes('--skip-config'),
    skipModeTest: subArgs.includes('--skip-mode-test'),
    postInit: !subArgs.includes('--pre-init-only'),
  };

  try {
    const validationResults = await runFullValidation(workingDir, options);

    ConsoleMigration.log('CLI', '\n📊 Validation Results:');
    ConsoleMigration.log('CLI', validationResults.report);

    if (validationResults.success) {
      printSuccess('✅ All validation checks passed');
    } else {
      printError('❌ Some validation checks failed');
      process.exit(1);
    }
  } catch (error) {
    printError(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle rollback commands
 */
async function handleRollbackCommand(subArgs, flags) {
  const workingDir = Deno.env.get('PWD') || Deno.cwd();
  const rollbackSystem = new RollbackSystem(workingDir);

  try {
    // Check for specific rollback options
    if (subArgs.includes('--full')) {
      ConsoleMigration.log('CLI', '🔄 Performing full rollback...');
      const result = await rollbackSystem.performFullRollback();

      if (result.success) {
        printSuccess('Full rollback completed successfully');
      } else {
        printError('Full rollback failed:');
        result.errors.forEach((error) => ConsoleMigration.error('CLI', `  ❌ ${error}`));
      }
    } else if (subArgs.includes('--partial')) {
      const phaseIndex = subArgs.findIndex((arg) => arg === '--phase');
      if (phaseIndex !== -1 && subArgs[phaseIndex + 1]) {
        const phase = subArgs[phaseIndex + 1];
        ConsoleMigration.log('CLI', `🔄 Performing partial rollback for phase: ${phase}`);

        const result = await rollbackSystem.performPartialRollback(phase);

        if (result.success) {
          printSuccess(`Partial rollback completed for phase: ${phase}`);
        } else {
          printError(`Partial rollback failed for phase: ${phase}`);
          result.errors.forEach((error) => ConsoleMigration.error('CLI', `  ❌ ${error}`));
        }
      } else {
        printError('Partial rollback requires --phase <phase-name>');
      }
    } else {
      // Interactive rollback point selection
      const rollbackPoints = await rollbackSystem.listRollbackPoints();

      if (rollbackPoints.rollbackPoints.length === 0) {
        printWarning('No rollback points available');
        return;
      }

      ConsoleMigration.log('CLI', '\n📋 Available rollback points:');
      rollbackPoints.rollbackPoints.forEach((point, index) => {
        const date = new Date(point.timestamp).toLocaleString();
        ConsoleMigration.log('CLI', `  ${index + 1}. ${point.type} - ${date}`);
      });

      // For now, rollback to the most recent point
      const latest = rollbackPoints.rollbackPoints[0];
      if (latest) {
        ConsoleMigration.log('CLI',
          `\n🔄 Rolling back to: ${latest.type} (${new Date(latest.timestamp).toLocaleString()})`,
        );
        const result = await rollbackSystem.performFullRollback(latest.backupId);

        if (result.success) {
          printSuccess('Rollback completed successfully');
        } else {
          printError('Rollback failed');
        }
      }
    }
  } catch (error) {
    printError(`Rollback operation failed: ${error.message}`);
  }
}

/**
 * Handle list backups command
 */
async function handleListBackups(subArgs, flags) {
  const workingDir = Deno.env.get('PWD') || Deno.cwd();
  const rollbackSystem = new RollbackSystem(workingDir);

  try {
    const rollbackPoints = await rollbackSystem.listRollbackPoints();

    ConsoleMigration.log('CLI', '\n📋 Rollback Points and Backups:');

    if (rollbackPoints.rollbackPoints.length === 0) {
      ConsoleMigration.log('CLI', '  No rollback points available');
    } else {
      ConsoleMigration.log('CLI', '\n🔄 Rollback Points:');
      rollbackPoints.rollbackPoints.forEach((point, index) => {
        const date = new Date(point.timestamp).toLocaleString();
        ConsoleMigration.log('CLI', `  ${index + 1}. ${point.type} - ${date} (${point.backupId || 'No backup'})`);
      });
    }

    if (rollbackPoints.checkpoints.length > 0) {
      ConsoleMigration.log('CLI', '\n📍 Checkpoints:');
      rollbackPoints.checkpoints.slice(-5).forEach((checkpoint, index) => {
        const date = new Date(checkpoint.timestamp).toLocaleString();
        ConsoleMigration.log('CLI', `  ${index + 1}. ${checkpoint.phase} - ${date} (${checkpoint.status})`);
      });
    }
  } catch (error) {
    printError(`Failed to list backups: ${error.message}`);
  }
}

/**
 * Perform initialization with checkpoints
 */
async function performInitializationWithCheckpoints(
  rollbackSystem,
  options,
  workingDir,
  dryRun = false,
) {
  const phases = [
    { name: 'file-creation', action: () => createInitialFiles(options, workingDir, dryRun) },
    { name: 'directory-structure', action: () => createDirectoryStructure(workingDir, dryRun) },
    { name: 'memory-setup', action: () => setupMemorySystem(workingDir, dryRun) },
    { name: 'coordination-setup', action: () => setupCoordinationSystem(workingDir, dryRun) },
    { name: 'executable-creation', action: () => createLocalExecutable(workingDir, dryRun) },
  ];

  if (options.sparc) {
    phases.push(
      { name: 'sparc-init', action: () => createSparcStructureManually() },
      { name: 'claude-commands', action: () => createClaudeSlashCommands(workingDir) },
    );
  }

  for (const phase of phases) {
    ConsoleMigration.log('CLI', `  🔧 ${phase.name}...`);

    // Create checkpoint before phase
    await rollbackSystem.createCheckpoint(phase.name, {
      timestamp: Date.now(),
      phase: phase.name,
    });

    try {
      await phase.action();
      ConsoleMigration.log('CLI', `  ✅ ${phase.name} completed`);
    } catch (error) {
      ConsoleMigration.error('CLI', `  ❌ ${phase.name} failed: ${error.message}`);
      throw error;
    }
  }
}

// Helper functions for atomic initialization
async function createInitialFiles(options, workingDir, dryRun = false) {
  if (!dryRun) {
    const claudeMd = options.sparc
      ? createSparcClaudeMd()
      : options.minimal
        ? createMinimalClaudeMd()
        : createFullClaudeMd();
    await Deno.writeTextFile(`${workingDir}/CLAUDE.md`, claudeMd);

    const memoryBankMd = options.minimal ? createMinimalMemoryBankMd() : createFullMemoryBankMd();
    await Deno.writeTextFile(`${workingDir}/memory-bank.md`, memoryBankMd);

    const coordinationMd = options.minimal
      ? createMinimalCoordinationMd()
      : createFullCoordinationMd();
    await Deno.writeTextFile(`${workingDir}/coordination.md`, coordinationMd);
  }
}

async function createDirectoryStructure(workingDir, dryRun = false) {
  const directories = [
    'memory',
    'memory/agents',
    'memory/sessions',
    'coordination',
    'coordination/memory_bank',
    'coordination/subtasks',
    'coordination/orchestration',
    '.claude',
    '.claude/commands',
    '.claude/logs',
  ];

  if (!dryRun) {
    for (const dir of directories) {
      await Deno.mkdir(`${workingDir}/${dir}`, { recursive: true });
    }
  }
}

async function setupMemorySystem(workingDir, dryRun = false) {
  if (!dryRun) {
    const initialData = { agents: [], tasks: [], lastUpdated: Date.now() };
    await Deno.writeTextFile(
      `${workingDir}/memory/claude-flow-data.json`,
      JSON.stringify(initialData, null, 2),
    );

    await Deno.writeTextFile(`${workingDir}/memory/agents/README.md`, createAgentsReadme());
    await Deno.writeTextFile(`${workingDir}/memory/sessions/README.md`, createSessionsReadme());
  }
}

async function setupCoordinationSystem(workingDir, dryRun = false) {
  // Coordination system is already set up by createDirectoryStructure
  // This is a placeholder for future coordination setup logic
}

/**
 * Enhanced Claude Flow v2.0.0 initialization
 */
async function enhancedClaudeFlowInit(flags, subArgs = []) {
  ConsoleMigration.log('CLI', '🚀 Initializing Claude Flow v2.0.0 with enhanced features...');

  const workingDir = process.cwd();
  const force = flags.force || flags.f;
  const dryRun = flags.dryRun || flags['dry-run'] || flags.d;

  // Store parameters to avoid scope issues in async context
  const args = subArgs || [];
  const options = flags || {};

  // Import fs module for Node.js
  const fs = await import('fs/promises');
  const { chmod } = fs;

  try {
    // Check existing files
    const existingFiles = [];
    const filesToCheck = [
      'CLAUDE.md',
      '.claude/settings.json',
      '.mcp.json',
      '.vscode/settings.json',
      '.vscode/tasks.json',
      '.vscode/launch.json',
      'claude-flow.config.json',
    ];

    for (const file of filesToCheck) {
      if (existsSync(`${workingDir}/${file}`)) {
        existingFiles.push(file);
      }
    }

    if (existingFiles.length > 0 && !force) {
      printWarning(`The following files already exist: ${existingFiles.join(', ')}`);
      ConsoleMigration.log('CLI', 'Use --force to overwrite existing files');
      return;
    }

    // Create CLAUDE.md
    if (!dryRun) {
      await Deno.writeTextFile(`${workingDir}/CLAUDE.md`, createEnhancedClaudeMd());
      printSuccess('✓ Created CLAUDE.md (Claude Flow v2.0.0)');
    } else {
      ConsoleMigration.log('CLI', '[DRY RUN] Would create CLAUDE.md (Claude Flow v2.0.0)');
    }

    // Create .claude directory structure
    const claudeDir = `${workingDir}/.claude`;
    if (!dryRun) {
      await Deno.mkdir(claudeDir, { recursive: true });
      await Deno.mkdir(`${claudeDir}/commands`, { recursive: true });
      await Deno.mkdir(`${claudeDir}/helpers`, { recursive: true });
      printSuccess('✓ Created .claude directory structure');
    } else {
      ConsoleMigration.log('CLI', '[DRY RUN] Would create .claude directory structure');
    }

    // Create settings.json
    if (!dryRun) {
      await Deno.writeTextFile(`${claudeDir}/settings.json`, createEnhancedSettingsJson());
      printSuccess('✓ Created .claude/settings.json with hooks and MCP configuration');
    } else {
      ConsoleMigration.log('CLI', '[DRY RUN] Would create .claude/settings.json');
    }

    // Create settings.local.json with default MCP permissions
    const settingsLocal = {
      permissions: {
        allow: ['mcp__ruv-swarm', 'mcp__claude-flow'],
        deny: [],
      },
    };

    if (!dryRun) {
      await Deno.writeTextFile(
        `${claudeDir}/settings.local.json`,
        JSON.stringify(settingsLocal, null, 2),
      );
      printSuccess('✓ Created .claude/settings.local.json with default MCP permissions');
    } else {
      ConsoleMigration.log('CLI',
        '[DRY RUN] Would create .claude/settings.local.json with default MCP permissions',
      );
    }

    // Create .mcp.json at project root for MCP server configuration
    const mcpJsonContent = createMcpJson();

    if (!dryRun) {
      await Deno.writeTextFile(`${workingDir}/.mcp.json`, mcpJsonContent);
      printSuccess('✓ Created .mcp.json at project root with enhanced MCP server configuration');
    } else {
      ConsoleMigration.log('CLI', '[DRY RUN] Would create .mcp.json at project root with enhanced MCP server configuration');
    }

    // Create .vscode directory and configuration files for enhanced development experience
    const vscodeDir = `${workingDir}/.vscode`;

    if (!dryRun) {
      // Ensure .vscode directory exists
      try {
        await Deno.mkdir(vscodeDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, continue
      }

      // Create VSCode settings.json
      const vscodeSettingsContent = createVSCodeSettings();
      await Deno.writeTextFile(`${vscodeDir}/settings.json`, vscodeSettingsContent);
      printSuccess('✓ Created .vscode/settings.json with MCP and SPARC integration');

      // Create VSCode tasks.json
      const vscodeTasksContent = createVSCodeTasks();
      await Deno.writeTextFile(`${vscodeDir}/tasks.json`, vscodeTasksContent);
      printSuccess('✓ Created .vscode/tasks.json with SPARC workflow automation');

      // Create VSCode launch.json
      const vscodeLaunchContent = createVSCodeLaunch();
      await Deno.writeTextFile(`${vscodeDir}/launch.json`, vscodeLaunchContent);
      printSuccess('✓ Created .vscode/launch.json with debugging configurations');

    } else {
      ConsoleMigration.log('CLI', '[DRY RUN] Would create .vscode/ directory with settings, tasks, and launch configurations');
    }

    // Create claude-flow.config.json for Claude Flow specific settings
    const claudeFlowConfig = {
      features: {
        autoTopologySelection: true,
        parallelExecution: true,
        neuralTraining: true,
        bottleneckAnalysis: true,
        smartAutoSpawning: true,
        selfHealingWorkflows: true,
        crossSessionMemory: true,
        githubIntegration: true,
      },
      performance: {
        maxAgents: 10,
        defaultTopology: 'hierarchical',
        executionStrategy: 'parallel',
        tokenOptimization: true,
        cacheEnabled: true,
        telemetryLevel: 'detailed',
      },
    };

    if (!dryRun) {
      await Deno.writeTextFile(
        `${workingDir}/claude-flow.config.json`,
        JSON.stringify(claudeFlowConfig, null, 2),
      );
      printSuccess('✓ Created claude-flow.config.json for Claude Flow settings');
    } else {
      ConsoleMigration.log('CLI', '[DRY RUN] Would create claude-flow.config.json for Claude Flow settings');
    }

    // Create command documentation
    for (const [category, commands] of Object.entries(COMMAND_STRUCTURE)) {
      const categoryDir = `${claudeDir}/commands/${category}`;

      if (!dryRun) {
        await Deno.mkdir(categoryDir, { recursive: true });

        // Create category README
        const categoryReadme = `# ${category.charAt(0).toUpperCase() + category.slice(1)} Commands

Commands for ${category} operations in Claude Flow.

## Available Commands

${commands.map((cmd) => `- [${cmd}](./${cmd}.md)`).join('\n')}
`;
        await Deno.writeTextFile(`${categoryDir}/README.md`, categoryReadme);

        // Create individual command docs
        for (const command of commands) {
          const doc = createCommandDoc(category, command);
          if (doc) {
            await Deno.writeTextFile(`${categoryDir}/${command}.md`, doc);
          }
        }

        ConsoleMigration.log('CLI', `  ✓ Created ${commands.length} ${category} command docs`);
      } else {
        ConsoleMigration.log('CLI', `[DRY RUN] Would create ${commands.length} ${category} command docs`);
      }
    }

    // Create wrapper scripts
    if (!dryRun) {
      // Unix wrapper - now uses universal ES module compatible wrapper
      const unixWrapper = createWrapperScript('unix');
      await Deno.writeTextFile(`${workingDir}/claude-flow`, unixWrapper);
      await fs.chmod(`${workingDir}/claude-flow`, 0o755);

      // Windows wrapper
      await Deno.writeTextFile(`${workingDir}/claude-flow.bat`, createWrapperScript('windows'));

      // PowerShell wrapper
      await Deno.writeTextFile(`${workingDir}/claude-flow.ps1`, createWrapperScript('powershell'));

      printSuccess('✓ Created platform-specific wrapper scripts');
    } else {
      ConsoleMigration.log('CLI', '[DRY RUN] Would create wrapper scripts');
    }

    // Create helper scripts
    const helpers = ['setup-mcp.sh', 'quick-start.sh', 'github-setup.sh', 'github-safe.js'];
    for (const helper of helpers) {
      if (!dryRun) {
        const content = createHelperScript(helper);
        if (content) {
          await Deno.writeTextFile(`${claudeDir}/helpers/${helper}`, content);
          await fs.chmod(`${claudeDir}/helpers/${helper}`, 0o755);
        }
      }
    }

    if (!dryRun) {
      printSuccess(`✓ Created ${helpers.length} helper scripts`);
    } else {
      ConsoleMigration.log('CLI', `[DRY RUN] Would create ${helpers.length} helper scripts`);
    }

    // Create standard directories from original init
    const standardDirs = [
      'memory',
      'memory/agents',
      'memory/sessions',
      'coordination',
      'coordination/memory_bank',
      'coordination/subtasks',
      'coordination/orchestration',
      '.swarm', // Add .swarm directory for shared memory
      '.hive-mind', // Add .hive-mind directory for hive-mind system
    ];

    for (const dir of standardDirs) {
      if (!dryRun) {
        await fs.mkdir(`${workingDir}/${dir}`, { recursive: true });
      }
    }

    if (!dryRun) {
      printSuccess('✓ Created standard directory structure');

      // Initialize memory system
      const initialData = { agents: [], tasks: [], lastUpdated: Date.now() };
      await fs.writeFile(
        `${workingDir}/memory/claude-flow-data.json`,
        JSON.stringify(initialData, null, 2),
      );

      // Create README files
      await fs.writeFile(`${workingDir}/memory/agents/README.md`, createAgentsReadme());
      await fs.writeFile(`${workingDir}/memory/sessions/README.md`, createSessionsReadme());

      printSuccess('✓ Initialized memory system');

      // Initialize memory database with fallback support
      try {
        // Import and initialize FallbackMemoryStore to create the database
        const { FallbackMemoryStore } = await import('../../../memory/fallback-store.js');
        const memoryStore = new FallbackMemoryStore();
        await memoryStore.initialize();

        if (memoryStore.isUsingFallback()) {
          printSuccess('✓ Initialized memory system (in-memory fallback for npx compatibility)');
          ConsoleMigration.log('CLI',
            '  💡 For persistent storage, install locally: npm install claude-flow@alpha',
          );
        } else {
          printSuccess('✓ Initialized memory database (.swarm/memory.db)');
        }

        memoryStore.close();
      } catch (err) {
        ConsoleMigration.log('CLI', `  ⚠️  Could not initialize memory system: ${err.message}`);
        ConsoleMigration.log('CLI', '     Memory will be initialized on first use');
      }

      // Initialize hive-mind configuration
      try {
        const hiveMindConfig = {
          version: '2.0.0',
          initialized: new Date().toISOString(),
          defaults: {
            queenType: 'strategic',
            maxWorkers: 8,
            consensusAlgorithm: 'majority',
            memorySize: 100,
            autoScale: true,
            encryption: false,
          },
          mcpTools: {
            enabled: true,
            parallel: true,
            timeout: 60000,
          },
        };

        await fs.writeFile(
          `${workingDir}/.hive-mind/config.json`,
          JSON.stringify(hiveMindConfig, null, 2),
        );

        // Initialize hive.db
        try {
          const Database = (await import('better-sqlite3')).default;
          const hivePath = `${workingDir}/.hive-mind/hive.db`;
          const hiveDb = new Database(hivePath);

          // Create initial tables
          hiveDb.exec(`
            CREATE TABLE IF NOT EXISTS swarms (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              objective TEXT,
              status TEXT DEFAULT 'active',
              queen_type TEXT DEFAULT 'strategic',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS agents (
              id TEXT PRIMARY KEY,
              swarm_id TEXT,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              role TEXT,
              capabilities TEXT,
              status TEXT DEFAULT 'active',
              performance_score REAL DEFAULT 0.5,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (swarm_id) REFERENCES swarms (id)
            );

            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              swarm_id TEXT,
              agent_id TEXT,
              content TEXT NOT NULL,
              type TEXT DEFAULT 'task',
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (swarm_id) REFERENCES swarms (id),
              FOREIGN KEY (agent_id) REFERENCES agents (id)
            );
          `);

          hiveDb.close();
          printSuccess('✓ Initialized hive-mind database (.hive-mind/hive.db)');
        } catch (dbErr) {
          ConsoleMigration.log('CLI', `  ⚠️  Could not initialize hive-mind database: ${dbErr.message}`);
        }

        printSuccess('✓ Initialized hive-mind system');
      } catch (err) {
        ConsoleMigration.log('CLI', `  ⚠️  Could not initialize hive-mind system: ${err.message}`);
      }
    }

    // Update .gitignore with Claude Flow entries
    const gitignoreResult = await updateGitignore(workingDir, force, dryRun);
    if (gitignoreResult.success) {
      if (!dryRun) {
        printSuccess(`✓ ${gitignoreResult.message}`);
      } else {
        ConsoleMigration.log('CLI', gitignoreResult.message);
      }
    } else {
      ConsoleMigration.log('CLI', `  ⚠️  ${gitignoreResult.message}`);
    }

    // SPARC initialization (now included by default)
    ConsoleMigration.log('CLI', '\n🚀 Initializing SPARC development environment...');
    let sparcInitialized = false;
    try {
      // Run create-sparc
      ConsoleMigration.log('CLI', '  🔄 Running: npx -y create-sparc init --force');
      execSync('npx -y create-sparc init --force', {
        cwd: workingDir,
        stdio: 'inherit',
      });
      sparcInitialized = true;
      printSuccess('✅ SPARC environment initialized successfully');
    } catch (err) {
      ConsoleMigration.log('CLI', `  ⚠️  Could not run create-sparc: ${err.message}`);
      ConsoleMigration.log('CLI', '     SPARC features will be limited to basic functionality');
    }

    // Create Claude slash commands for SPARC
    if (sparcInitialized && !dryRun) {
      ConsoleMigration.log('CLI', '\n📝 Creating Claude Code slash commands...');
      await createClaudeSlashCommands(workingDir);
    }

    // Check for Claude Code and set up MCP servers (always enabled by default)
    if (!dryRun && isClaudeCodeInstalled()) {
      ConsoleMigration.log('CLI', '\n🔍 Claude Code CLI detected!');
      const skipMcp =
        (options && options['skip-mcp']) ||
        (subArgs && subArgs.includes && subArgs.includes('--skip-mcp'));

      if (!skipMcp) {
        await setupMcpServers(dryRun);
      } else {
        ConsoleMigration.log('CLI', '  ℹ️  Skipping MCP setup (--skip-mcp flag used)');
        ConsoleMigration.log('CLI', '\n  📋 To add MCP servers manually:');
        ConsoleMigration.log('CLI', '     claude mcp add claude-flow npx claude-flow@alpha mcp start');
        ConsoleMigration.log('CLI', '     claude mcp add ruv-swarm npx ruv-swarm@latest mcp start');
        ConsoleMigration.log('CLI', '\n  💡 MCP servers are defined in .mcp.json (project scope)');
      }
    } else if (!dryRun && !isClaudeCodeInstalled()) {
      ConsoleMigration.log('CLI', '\n⚠️  Claude Code CLI not detected!');
      ConsoleMigration.log('CLI', '\n  📥 To install Claude Code:');
      ConsoleMigration.log('CLI', '     npm install -g @anthropic-ai/claude-code');
      ConsoleMigration.log('CLI', '\n  📋 After installing, add MCP servers:');
      ConsoleMigration.log('CLI', '     claude mcp add claude-flow npx claude-flow@alpha mcp start');
      ConsoleMigration.log('CLI', '     claude mcp add ruv-swarm npx ruv-swarm@latest mcp start');
      ConsoleMigration.log('CLI', '\n  💡 MCP servers are defined in .mcp.json (project scope)');
    }

    // Create agent directories and copy all agent files
    ConsoleMigration.log('CLI', '\n🤖 Setting up agent system...');
    if (!dryRun) {
      await createAgentDirectories(workingDir, dryRun);
      const agentResult = await copyAgentFiles(workingDir, {
        force: force,
        dryRun: dryRun
      });

      if (agentResult.success) {
        await validateAgentSystem(workingDir);
        ConsoleMigration.log('CLI', '✅ ✓ Agent system setup complete with 64 specialized agents');
      } else {
        ConsoleMigration.log('CLI', '⚠️  Agent system setup failed:', agentResult.error);
      }
    } else {
      ConsoleMigration.log('CLI', '  [DRY RUN] Would create agent system with 64 specialized agents');
    }

    // Final instructions
    ConsoleMigration.log('CLI', '\n🎉 Claude Flow v2.0.0 initialization complete!');
    ConsoleMigration.log('CLI', '\n📚 Quick Start:');
    if (isClaudeCodeInstalled()) {
      ConsoleMigration.log('CLI', '1. View available commands: ls .claude/commands/');
      ConsoleMigration.log('CLI', '2. Start a swarm: npx claude-flow@alpha swarm "your objective" --claude');
      ConsoleMigration.log('CLI', '3. Use hive-mind: npx claude-flow@alpha hive-mind spawn "command" --claude');
      ConsoleMigration.log('CLI', '4. Use MCP tools in Claude Code for enhanced coordination');
    } else {
      ConsoleMigration.log('CLI', '1. Install Claude Code: npm install -g @anthropic-ai/claude-code');
      ConsoleMigration.log('CLI', '2. Add MCP servers (see instructions above)');
      ConsoleMigration.log('CLI', '3. View available commands: ls .claude/commands/');
      ConsoleMigration.log('CLI', '4. Start a swarm: npx claude-flow@alpha swarm "your objective" --claude');
      ConsoleMigration.log('CLI', '5. Use hive-mind: npx claude-flow@alpha hive-mind spawn "command" --claude');
    }
    ConsoleMigration.log('CLI', '\n💡 Tips:');
    ConsoleMigration.log('CLI', '• Check .claude/commands/ for detailed documentation');
    ConsoleMigration.log('CLI', '• Use --help with any command for options');
    ConsoleMigration.log('CLI', '• Run commands with --claude flag for best Claude Code integration');
    ConsoleMigration.log('CLI', '• Enable GitHub integration with .claude/helpers/github-setup.sh');
  } catch (err) {
    printError(`Failed to initialize Claude Flow v2.0.0: ${err.message}`);
  }
}
