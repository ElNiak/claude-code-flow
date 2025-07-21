import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe("CLI Commands - Basic Tests", () => {
  let tempDir;
  const cliPath = path.join(__dirname, '../../../src/cli/simple-cli.js');

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-test-'));
    process.env.NODE_ENV = 'test';
  });

  afterEach(async () => {
    // Cleanup
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe("Help Command", () => {
    it("should show help when no arguments provided", (done) => {
      const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        expect(stdout).toContain('Claude-Flow');
        expect(stdout).toContain('USAGE:');
        done();
      });
    }, 10000);

    it("should show help with --help flag", (done) => {
      const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, '--help'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout).toContain('COMMANDS:');
        done();
      });
    }, 10000);
  });

  describe("Version Command", () => {
    it("should show version", (done) => {
      const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, '--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout.trim()).toMatch(/\d+\.\d+\.\d+/); // Version pattern
        done();
      });
    }, 10000);
  });

  describe("Init Command", () => {
    it("should initialize with minimal setup", (done) => {
      const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, 'init', '--minimal'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: tempDir
      });

      let stdout = '';
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', async (code) => {
        try {
          expect(code).toBe(0);
          expect(stdout).toContain('Claude-Flow initialized');

          // Check if .claude directory was created
          const claudeDir = path.join(tempDir, '.claude');
          expect(await fs.pathExists(claudeDir)).toBe(true);

          done();
        } catch (error) {
          done(error);
        }
      });
    }, 15000);
  });

  describe("Memory Command", () => {
    beforeEach(async () => {
      // Initialize first
      await new Promise((resolve) => {
        const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, 'init', '--minimal'], {
          stdio: 'ignore',
          env: { ...process.env, NODE_ENV: 'test' },
          cwd: tempDir
        });
        child.on('close', resolve);
      });
    });

    it("should store and retrieve memory", (done) => {
      // First store a memory
      const storeChild = await new Promise((resolve, reject) => {
    const child = spawn('node',
        [cliPath, 'memory', 'store', 'test-key', 'test-value'],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test' },
          cwd: tempDir
        }
      );

      storeChild.on('close', (code) => {
        expect(code).toBe(0);

        // Then retrieve it
        const retrieveChild = await new Promise((resolve, reject) => {
    const child = spawn('node',
          [cliPath, 'memory', 'retrieve', 'test-key'],
          {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'test' },
            cwd: tempDir
          }
        );

        let stdout = '';
        retrieveChild.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        retrieveChild.on('close', (code) => {
          expect(code).toBe(0);
          expect(stdout).toContain('test-value');
          done();
        });
      });
    }, 15000);
  });

  describe("Agent Command", () => {
    beforeEach(async () => {
      // Initialize first
      await new Promise((resolve) => {
        const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, 'init', '--minimal'], {
          stdio: 'ignore',
          env: { ...process.env, NODE_ENV: 'test' },
          cwd: tempDir
        });
        child.on('close', resolve);
      });
    });

    it("should list available agent types", (done) => {
      const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, 'agent', 'list'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: tempDir
      });

      let stdout = '';
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout).toContain('Available Agent Types');
        done();
      });
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle unknown command", (done) => {
      const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, 'unknown-command'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(1);
        expect(stderr).toContain('Unknown command');
        done();
      });
    }, 10000);

    it("should handle missing required arguments", (done) => {
      const child = await new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, 'memory', 'store'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: tempDir
      });

      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(1);
        expect(stderr).toContain('Missing required');
        done();
      });
    }, 10000);
  });
});
