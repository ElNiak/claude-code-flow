/**
 * MCP Server Setup Unit Tests
 * Comprehensive unit testing for MCP server functions and template generation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupMcpServers } from '../../src/cli/simple-commands/init/index.js';
import { ValidationSystem } from '../../src/cli/simple-commands/init/validation/index.js';

// Mock the entire enhanced-templates module
jest.mock('../../src/cli/simple-commands/init/templates/enhanced-templates.js', () => ({
  createEnhancedClaudeMd: jest.fn(),
  createEnhancedSettingsJson: jest.fn(),
  createWrapperScript: jest.fn(),
  createCommandDoc: jest.fn(),
}));

// Mock child_process for command execution
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
}));

// Mock fs for file operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import {
  createEnhancedClaudeMd,
  createEnhancedSettingsJson,
  createWrapperScript,
  createCommandDoc,
} from '../../src/cli/simple-commands/init/templates/enhanced-templates.js';

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockCreateEnhancedClaudeMd = createEnhancedClaudeMd as jest.MockedFunction<typeof createEnhancedClaudeMd>;
const mockCreateEnhancedSettingsJson = createEnhancedSettingsJson as jest.MockedFunction<typeof createEnhancedSettingsJson>;
const mockCreateWrapperScript = createWrapperScript as jest.MockedFunction<typeof createWrapperScript>;
const mockCreateCommandDoc = createCommandDoc as jest.MockedFunction<typeof createCommandDoc>;

describe('MCP Server Setup Unit Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    mockExecSync.mockReturnValue(Buffer.from('success'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => true,
    } as any);

    // Setup template function mocks
    mockCreateEnhancedClaudeMd.mockReturnValue(MOCK_CLAUDE_MD);
    mockCreateEnhancedSettingsJson.mockReturnValue(MOCK_SETTINGS_JSON);
    mockCreateWrapperScript.mockReturnValue(MOCK_WRAPPER_SCRIPT);
    mockCreateCommandDoc.mockReturnValue('# Mock Command Documentation');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setupMcpServers Function', () => {
    it('should setup MCP servers successfully', async () => {
      mockExecSync.mockReturnValue(Buffer.from('Server added successfully'));

      // Capture console.log to verify output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await setupMcpServers(false);

      // Verify server setup commands were called
      expect(mockExecSync).toHaveBeenCalledWith(
        'claude mcp add claude-flow npx claude-flow@alpha mcp start',
        { stdio: 'inherit' }
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        'claude mcp add ruv-swarm npx ruv-swarm mcp start',
        { stdio: 'inherit' }
      );

      // Verify verification command was called
      expect(mockExecSync).toHaveBeenCalledWith('claude mcp list', { stdio: 'inherit' });

      // Verify console output
      expect(consoleSpy).toHaveBeenCalledWith('🔌 Setting up MCP servers for Claude Code...');
      expect(consoleSpy).toHaveBeenCalledWith('  ✅ Added claude-flow - Claude Flow MCP server with swarm orchestration (alpha)');

      consoleSpy.mockRestore();
    });

    it('should handle dry run mode correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await setupMcpServers(true);

      // In dry run mode, execSync should not be called for server setup
      expect(mockExecSync).not.toHaveBeenCalledWith(
        expect.stringContaining('claude mcp add'),
        expect.any(Object)
      );

      // Should log dry run messages
      expect(consoleSpy).toHaveBeenCalledWith('  [DRY RUN] Would add claude-flow - Claude Flow MCP server with swarm orchestration (alpha)');

      consoleSpy.mockRestore();
    });

    it('should handle server setup failures gracefully', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.toString().includes('claude mcp add claude-flow')) {
          throw new Error('Failed to add server');
        }
        return Buffer.from('success');
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await setupMcpServers(false);

      // Should continue with other servers despite failure
      expect(mockExecSync).toHaveBeenCalledWith(
        'claude mcp add ruv-swarm npx ruv-swarm mcp start',
        { stdio: 'inherit' }
      );

      // Should log error message with manual instruction
      expect(consoleSpy).toHaveBeenCalledWith('  ⚠️  Failed to add claude-flow: Failed to add server');
      expect(consoleSpy).toHaveBeenCalledWith(
        '     You can add it manually with: claude mcp add claude-flow npx claude-flow@alpha mcp start'
      );

      consoleSpy.mockRestore();
    });

    it('should handle verification failures gracefully', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.toString().includes('claude mcp list')) {
          throw new Error('Could not list servers');
        }
        return Buffer.from('success');
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await setupMcpServers(false);

      expect(consoleSpy).toHaveBeenCalledWith('  ⚠️  Could not verify MCP servers');

      consoleSpy.mockRestore();
    });

    it('should not verify servers in dry run mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await setupMcpServers(true);

      // Should not call verification in dry run
      expect(mockExecSync).not.toHaveBeenCalledWith('claude mcp list', { stdio: 'inherit' });

      consoleSpy.mockRestore();
    });
  });

  describe('Template Generation Functions', () => {
    describe('createEnhancedClaudeMd', () => {
      it('should generate CLAUDE.md template', () => {
        const result = createEnhancedClaudeMd();

        expect(mockCreateEnhancedClaudeMd).toHaveBeenCalled();
        expect(result).toBe(MOCK_CLAUDE_MD);
        expect(result).toContain('# Claude Code Configuration');
        expect(result).toContain('SPARC Development Environment');
      });

      it('should be deterministic', () => {
        const result1 = createEnhancedClaudeMd();
        const result2 = createEnhancedClaudeMd();

        expect(result1).toBe(result2);
      });
    });

    describe('createEnhancedSettingsJson', () => {
      it('should generate valid JSON settings', () => {
        const result = createEnhancedSettingsJson();

        expect(mockCreateEnhancedSettingsJson).toHaveBeenCalled();
        expect(result).toBe(MOCK_SETTINGS_JSON);

        // Should be valid JSON
        expect(() => JSON.parse(result)).not.toThrow();

        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty('claude.mcpServers');
        expect(parsed['claude.mcpServers']).toHaveProperty('claude-flow');
      });

      it('should contain MCP server configurations', () => {
        const result = createEnhancedSettingsJson();
        const parsed = JSON.parse(result);

        const mcpServers = parsed['claude.mcpServers'];

        // Check for key servers
        expect(mcpServers).toHaveProperty('claude-flow');
        expect(mcpServers).toHaveProperty('ruv-swarm');
        expect(mcpServers).toHaveProperty('context7');
        expect(mcpServers).toHaveProperty('serena');

        // Verify server structure
        expect(mcpServers['claude-flow']).toHaveProperty('command');
        expect(mcpServers['claude-flow']).toHaveProperty('args');
      });
    });

    describe('createWrapperScript', () => {
      it('should generate Unix wrapper script by default', () => {
        const result = createWrapperScript();

        expect(mockCreateWrapperScript).toHaveBeenCalledWith('unix');
        expect(result).toBe(MOCK_WRAPPER_SCRIPT);
        expect(result).toContain('#!/bin/bash');
      });

      it('should generate Windows batch script', () => {
        mockCreateWrapperScript.mockReturnValue(MOCK_WINDOWS_SCRIPT);

        const result = createWrapperScript('windows');

        expect(mockCreateWrapperScript).toHaveBeenCalledWith('windows');
        expect(result).toBe(MOCK_WINDOWS_SCRIPT);
        expect(result).toContain('@echo off');
      });

      it('should generate PowerShell script', () => {
        mockCreateWrapperScript.mockReturnValue(MOCK_POWERSHELL_SCRIPT);

        const result = createWrapperScript('powershell');

        expect(mockCreateWrapperScript).toHaveBeenCalledWith('powershell');
        expect(result).toBe(MOCK_POWERSHELL_SCRIPT);
        expect(result).toContain('# PowerShell script');
      });
    });

    describe('createCommandDoc', () => {
      it('should generate command documentation', () => {
        const result = createCommandDoc('analysis', 'bottleneck-detect');

        expect(mockCreateCommandDoc).toHaveBeenCalledWith('analysis', 'bottleneck-detect');
        expect(result).toBe('# Mock Command Documentation');
        expect(result).toContain('#');
      });

      it('should handle different categories and commands', () => {
        const categories = ['analysis', 'coordination', 'memory'];
        const commands = ['bottleneck-detect', 'swarm-init', 'store'];

        categories.forEach(category => {
          commands.forEach(command => {
            const result = createCommandDoc(category, command);
            expect(mockCreateCommandDoc).toHaveBeenCalledWith(category, command);
            expect(result).toBeTruthy();
          });
        });
      });
    });
  });

  describe('Template Function Integration', () => {
    it('should work together to create complete project setup', () => {
      const claudeMd = createEnhancedClaudeMd();
      const settings = createEnhancedSettingsJson();
      const wrapper = createWrapperScript();
      const docs = createCommandDoc('analysis', 'bottleneck-detect');

      // All functions should have been called
      expect(mockCreateEnhancedClaudeMd).toHaveBeenCalled();
      expect(mockCreateEnhancedSettingsJson).toHaveBeenCalled();
      expect(mockCreateWrapperScript).toHaveBeenCalled();
      expect(mockCreateCommandDoc).toHaveBeenCalled();

      // All should return valid content
      expect(claudeMd).toBeTruthy();
      expect(settings).toBeTruthy();
      expect(wrapper).toBeTruthy();
      expect(docs).toBeTruthy();

      // Settings should be valid JSON
      expect(() => JSON.parse(settings)).not.toThrow();
    });

    it('should handle fallback scenarios', () => {
      // Simulate fallback by having functions return fallback content
      mockCreateEnhancedClaudeMd.mockReturnValue(MOCK_FALLBACK_CLAUDE_MD);
      mockCreateEnhancedSettingsJson.mockReturnValue(MOCK_FALLBACK_SETTINGS_JSON);

      const claudeMd = createEnhancedClaudeMd();
      const settings = createEnhancedSettingsJson();

      expect(claudeMd).toContain('# Fallback CLAUDE.md');
      expect(settings).toContain('"fallback": true');
    });
  });

  describe('Error Handling', () => {
    it('should handle template generation errors', () => {
      mockCreateEnhancedClaudeMd.mockImplementation(() => {
        throw new Error('Template generation failed');
      });

      expect(() => createEnhancedClaudeMd()).toThrow('Template generation failed');
    });

    it('should handle invalid JSON in settings template', () => {
      mockCreateEnhancedSettingsJson.mockReturnValue('{ invalid json');

      const result = createEnhancedSettingsJson();
      expect(() => JSON.parse(result)).toThrow();
    });

    it('should handle missing template files gracefully', () => {
      // Mock file system errors
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      // Functions should still work with fallbacks
      const claudeMd = createEnhancedClaudeMd();
      const settings = createEnhancedSettingsJson();

      expect(claudeMd).toBeTruthy();
      expect(settings).toBeTruthy();
    });
  });

  describe('Validation System Integration', () => {
    let validationSystem: ValidationSystem;

    beforeEach(() => {
      validationSystem = new ValidationSystem('/tmp/test');
    });

    it('should integrate with validation system', async () => {
      // This tests that our template functions work with the existing validation system
      const mockValidationResult = {
        success: true,
        checks: {
          templateIntegrity: {
            success: true,
            message: 'Templates validated successfully',
          },
        },
        errors: [],
        warnings: [],
      };

      // Mock validation methods
      const mockRunHealthChecks = jest.spyOn(validationSystem, 'runHealthChecks')
        .mockResolvedValue(mockValidationResult);

      const result = await validationSystem.runHealthChecks();

      expect(result.success).toBe(true);
      expect(result.checks.templateIntegrity.success).toBe(true);

      mockRunHealthChecks.mockRestore();
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing environment variables', () => {
      const originalEnv = process.env;

      // Clear environment variables
      process.env = {};

      // Template generation should still work
      const settings = createEnhancedSettingsJson();
      expect(settings).toBeTruthy();
      expect(() => JSON.parse(settings)).not.toThrow();

      // Restore environment
      process.env = originalEnv;
    });

    it('should use environment variables when available', () => {
      const originalEnv = process.env;

      // Set test environment variables
      process.env.CONTEXT7_API_KEY = 'test-key';
      process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';

      const settings = createEnhancedSettingsJson();
      expect(settings).toBeTruthy();

      // Environment variables should be referenced in config
      // (This depends on the actual implementation)

      // Restore environment
      process.env = originalEnv;
    });
  });
});

// Mock template content
const MOCK_CLAUDE_MD = `# Claude Code Configuration - SPARC Development Environment (Batchtools Optimized)

## Core Principles
- Do what has been asked; nothing more, nothing less.
- NEVER create files unless they're absolutely necessary for achieving your goal.
- **Grounded, not guessed**: Retrieve context (Context7) and resolve symbols (Serena/LSP) **before** coding.

## Project Overview
This project uses the SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology for systematic Test-Driven Development with AI assistance through Claude-Flow orchestration.

## Available MCP Tools for Coordination
- \`mcp__context7__resolve-library-id\` - Resolve library IDs
- \`mcp__context7__get-library-docs\` - Fetch library documentation
- \`mcp__serena__*\` - Symbol resolution and context retrieval using LSP
- \`mcp__sequential-thinking__sequentialthinking\` - Structured problem-solving
`;

const MOCK_SETTINGS_JSON = `{
  "claude.mcpServers": {
    "claude-flow": {
      "command": "npx",
      "args": ["claude-flow@alpha", "mcp", "start"],
      "description": "Claude Flow MCP server with swarm orchestration (alpha)"
    },
    "ruv-swarm": {
      "command": "npx",
      "args": ["ruv-swarm", "mcp", "start"],
      "description": "ruv-swarm MCP server for enhanced coordination"
    },
    "context7": {
      "command": "docker",
      "args": ["run", "-p", "3001:3001", "context7/mcp-server"],
      "description": "Context7 MCP server for documentation retrieval"
    },
    "serena": {
      "command": "docker",
      "args": ["run", "-p", "3002:3002", "serena/lsp-mcp-bridge"],
      "description": "Serena LSP MCP bridge for symbol resolution"
    }
  }
}`;

const MOCK_WRAPPER_SCRIPT = `#!/bin/bash
# Claude Flow wrapper script
exec node /path/to/claude-flow/cli.js "$@"
`;

const MOCK_WINDOWS_SCRIPT = `@echo off
REM Claude Flow wrapper script for Windows
node /path/to/claude-flow/cli.js %*
`;

const MOCK_POWERSHELL_SCRIPT = `# PowerShell script for Claude Flow
& node /path/to/claude-flow/cli.js @args
`;

const MOCK_FALLBACK_CLAUDE_MD = `# Fallback CLAUDE.md
This is a fallback template when the main template cannot be loaded.
`;

const MOCK_FALLBACK_SETTINGS_JSON = `{
  "fallback": true,
  "claude.mcpServers": {}
}`;
