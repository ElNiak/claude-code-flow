/**
 * Safe GitHub CLI command execution utilities
 * Prevents shell injection and timeout issues with special characters
 */

import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';

/**
 * Execute GitHub CLI command with safe body content handling
 * @param {string} command - The gh command (e.g., 'issue comment')
 * @param {string} target - Target (issue/PR number or repo)
 * @param {string} body - Body content that may contain special characters
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - Command output
 */
export async function safeGhCommand(command, target, body, options = {}) {
  const tmpFile = join(tmpdir(), `gh-body-${randomBytes(8).toString('hex')}.tmp`);

  try {
    // Write body content to temporary file
    await fs.writeFile(tmpFile, body, 'utf8');

    // Build command arguments
    const args = command.split(' ');
    args.push(target);
    args.push('--body-file', tmpFile);

    // Add any additional options
    Object.entries(options).forEach(([key, value]) => {
      args.push(`--${key}`, value);
    });

    // Execute command with timeout
    const result = await executeWithTimeout('gh', args, options.timeout || 30000);
    return result;
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tmpFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute command with timeout and proper cleanup
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} - Command output
 */
function executeWithTimeout(command, args, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false, // Important: don't use shell
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
    }, timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        reject(new Error(`Command timed out after ${timeout}ms`));
      } else if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Safe methods for common GitHub CLI operations
 */
export const gh = {
  /**
   * Create issue comment safely
   * @param {number|string} issue - Issue number
   * @param {string} body - Comment body
   * @param {Object} options - Additional options
   */
  async issueComment(issue, body, options = {}) {
    return safeGhCommand('issue comment', issue.toString(), body, options);
  },

  /**
   * Create PR comment safely
   * @param {number|string} pr - PR number
   * @param {string} body - Comment body
   * @param {Object} options - Additional options
   */
  async prComment(pr, body, options = {}) {
    return safeGhCommand('pr comment', pr.toString(), body, options);
  },

  /**
   * Create issue safely
   * @param {Object} params - Issue parameters
   */
  async createIssue({ title, body, labels = [], assignees = [] }) {
    const tmpFile = join(tmpdir(), `gh-issue-${randomBytes(8).toString('hex')}.tmp`);

    try {
      await fs.writeFile(tmpFile, body, 'utf8');

      const args = ['issue', 'create', '--title', title, '--body-file', tmpFile];

      if (labels.length > 0) {
        args.push('--label', labels.join(','));
      }

      if (assignees.length > 0) {
        args.push('--assignee', assignees.join(','));
      }

      return await executeWithTimeout('gh', args, 30000);
    } finally {
      try {
        await fs.unlink(tmpFile);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  },

  /**
   * Create PR safely
   * @param {Object} params - PR parameters
   */
  async createPR({ title, body, base = 'main', head, draft = false }) {
    const tmpFile = join(tmpdir(), `gh-pr-${randomBytes(8).toString('hex')}.tmp`);

    try {
      await fs.writeFile(tmpFile, body, 'utf8');

      const args = ['pr', 'create', '--title', title, '--body-file', tmpFile, '--base', base];

      if (head) {
        args.push('--head', head);
      }

      if (draft) {
        args.push('--draft');
      }

      return await executeWithTimeout('gh', args, 30000);
    } finally {
      try {
        await fs.unlink(tmpFile);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
};

/**
 * Example usage:
 *
 * import { gh } from './github-cli-safe.js';
 *
 * // Safe issue comment with special characters
 * await gh.issueComment(123, 'Code: `npm install` and $(echo test)');
 *
 * // Safe PR creation with complex body
 * await gh.createPR({
 *   title: 'Fix: Handle special characters',
 *   body: 'This fixes issues with `backticks` and .claude/agents/ paths',
 *   base: 'main'
 * });
 */
