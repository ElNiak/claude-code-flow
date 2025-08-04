/**
 * CLI output formatting utilities
 */

import Table from 'cli-table3';
import chalk from 'chalk';

export interface Agent {
  id: string;
  name: string;
  type: string;
  priority?: number; // Make priority optional
  maxConcurrentTasks: number;
  status?: string;
  lastActivity?: Date;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  name: string;
  type: string;
  status: string;
  priority: number;
  assignedAgent?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface SwarmMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  systemLoad: number;
}

/**
 * Format agent list as a table
 */
export function formatAgentTable(agents: Agent[]): string {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Name'),
      chalk.cyan('Type'),
      chalk.cyan('Priority'),
      chalk.cyan('Max Tasks'),
      chalk.cyan('Status'),
      chalk.cyan('Last Activity'),
    ],
    colWidths: [15, 20, 15, 10, 10, 12, 15],
  });

  for (const agent of agents) {
    const status = agent.status || 'unknown';
    const statusColor = getStatusColor(status);
    const lastActivity = agent.lastActivity ? formatRelativeTime(agent.lastActivity) : 'never';

    table.push([
      agent.id.substring(0, 12) + '...',
      agent.name,
      agent.type,
      (agent.priority || 5).toString(), // Provide default value if undefined
      agent.maxConcurrentTasks.toString(),
      statusColor(status),
      lastActivity,
    ]);
  }

  return table.toString();
}

/**
 * Format task list as a table
 */
export function formatTaskTable(tasks: Task[]): string {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Name'),
      chalk.cyan('Type'),
      chalk.cyan('Status'),
      chalk.cyan('Priority'),
      chalk.cyan('Assigned To'),
      chalk.cyan('Created'),
      chalk.cyan('Duration'),
    ],
    colWidths: [15, 20, 15, 12, 10, 15, 12, 10],
  });

  for (const task of tasks) {
    const statusColor = getStatusColor(task.status);
    const duration = calculateTaskDuration(task);
    const assignedAgent = task.assignedAgent
      ? task.assignedAgent.substring(0, 12) + '...'
      : 'unassigned';

    table.push([
      task.id.substring(0, 12) + '...',
      task.name,
      task.type,
      statusColor(task.status),
      task.priority.toString(),
      assignedAgent,
      formatRelativeTime(task.createdAt),
      duration,
    ]);
  }

  return table.toString();
}

/**
 * Format swarm metrics
 */
export function formatSwarmMetrics(metrics: SwarmMetrics): string {
  const completionRate =
    metrics.totalTasks > 0
      ? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(1)
      : '0.0';

  const failureRate =
    metrics.totalTasks > 0 ? ((metrics.failedTasks / metrics.totalTasks) * 100).toFixed(1) : '0.0';

  const systemLoadColor =
    metrics.systemLoad > 80 ? chalk.red : metrics.systemLoad > 60 ? chalk.yellow : chalk.green;

  return `
${chalk.bold('📊 Swarm Metrics')}
${chalk.gray('─'.repeat(50))}

${chalk.cyan('Agents:')}
  • Total: ${chalk.white(metrics.totalAgents)}
  • Active: ${chalk.green(metrics.activeAgents)}
  • Idle: ${chalk.yellow(metrics.totalAgents - metrics.activeAgents)}

${chalk.cyan('Tasks:')}
  • Total: ${chalk.white(metrics.totalTasks)}
  • Completed: ${chalk.green(metrics.completedTasks)} (${chalk.green(completionRate + '%')})
  • Failed: ${chalk.red(metrics.failedTasks)} (${chalk.red(failureRate + '%')})
  • Avg Duration: ${chalk.white(formatDuration(metrics.averageTaskDuration))}

${chalk.cyan('System:')}
  • Load: ${systemLoadColor(metrics.systemLoad.toFixed(1) + '%')}
  • Status: ${getSystemStatusDisplay(metrics)}
`;
}

/**
 * Format agent capabilities
 */
export function formatAgentCapabilities(agent: Agent): string {
  if (!agent.capabilities || agent.capabilities.length === 0) {
    return chalk.gray('No capabilities defined');
  }

  const capabilityGroups = groupCapabilities(agent.capabilities);
  let output = `\n${chalk.bold('🔧 Agent Capabilities')}\n`;
  output += chalk.gray('─'.repeat(30)) + '\n\n';

  for (const [group, caps] of Object.entries(capabilityGroups)) {
    output += `${chalk.cyan(group + ':')}\n`;
    caps.forEach((cap) => {
      output += `  • ${cap}\n`;
    });
    output += '\n';
  }

  return output;
}

/**
 * Format agent summary card
 */
export function formatAgentSummary(agent: Agent): string {
  const status = agent.status || 'unknown';
  const statusColor = getStatusColor(status);
  const lastActivity = agent.lastActivity ? formatRelativeTime(agent.lastActivity) : 'never';

  return `
${chalk.bold('🤖 Agent Summary')}
${chalk.gray('─'.repeat(30))}

${chalk.cyan('Identity:')}
  • ID: ${agent.id}
  • Name: ${agent.name}
  • Type: ${agent.type}

${chalk.cyan('Configuration:')}
  • Priority: ${agent.priority || 5}
  • Max Concurrent Tasks: ${agent.maxConcurrentTasks}
  • Status: ${statusColor(status)}
  • Last Activity: ${lastActivity}

${agent.capabilities ? formatAgentCapabilities(agent) : ''}
`;
}

/**
 * Format simple agent list for commands
 */
export function formatSimpleAgentTable(agents: Agent[]): string {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Name'),
      chalk.cyan('Type'),
      chalk.cyan('Priority'),
      chalk.cyan('Max Tasks'),
    ],
  });

  for (const agent of agents) {
    table.push([
      agent.id,
      agent.name,
      agent.type,
      (agent.priority || 5).toString(), // Provide default value if undefined
      agent.maxConcurrentTasks.toString(),
    ]);
  }

  return table.toString();
}

// Success/Error/Info/Warning formatters for CLI commands
export function formatSuccess(message: string): string {
  return chalk.green('✅ ' + message);
}

export function formatError(message: string): string {
  return chalk.red('❌ ' + message);
}

export function formatInfo(message: string): string {
  return chalk.blue('ℹ️  ' + message);
}

export function formatWarning(message: string): string {
  return chalk.yellow('⚠️  ' + message);
}

// Helper functions
function getStatusColor(status: string): (text: string) => string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'idle':
    case 'running':
    case 'completed':
      return chalk.green;
    case 'busy':
    case 'assigned':
    case 'pending':
      return chalk.yellow;
    case 'error':
    case 'failed':
    case 'offline':
    case 'terminated':
      return chalk.red;
    case 'paused':
    case 'cancelled':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

function calculateTaskDuration(task: Task): string {
  if (task.completedAt && task.startedAt) {
    const duration = task.completedAt.getTime() - task.startedAt.getTime();
    return formatDuration(duration);
  }

  if (task.startedAt) {
    const duration = new Date().getTime() - task.startedAt.getTime();
    return formatDuration(duration) + ' (running)';
  }

  return 'not started';
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function groupCapabilities(capabilities: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    Core: [],
    Development: [],
    Analysis: [],
    Communication: [],
    Other: [],
  };

  capabilities.forEach((cap) => {
    if (cap.includes('code') || cap.includes('development') || cap.includes('implementation')) {
      groups['Development'].push(cap);
    } else if (cap.includes('analysis') || cap.includes('metrics') || cap.includes('performance')) {
      groups['Analysis'].push(cap);
    } else if (
      cap.includes('communication') ||
      cap.includes('messaging') ||
      cap.includes('coordination')
    ) {
      groups['Communication'].push(cap);
    } else if (cap.includes('task') || cap.includes('resource') || cap.includes('management')) {
      groups['Core'].push(cap);
    } else {
      groups['Other'].push(cap);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

export function getSystemStatusDisplay(metrics: SwarmMetrics): string {
  const activeRatio = metrics.totalAgents > 0 ? metrics.activeAgents / metrics.totalAgents : 0;

  const completionRatio = metrics.totalTasks > 0 ? metrics.completedTasks / metrics.totalTasks : 0;

  if (metrics.systemLoad > 90 || metrics.failedTasks > metrics.completedTasks) {
    return chalk.red('Critical');
  } else if (metrics.systemLoad > 70 || activeRatio < 0.5) {
    return chalk.yellow('Warning');
  } else if (completionRatio > 0.8 && activeRatio > 0.7) {
    return chalk.green('Optimal');
  } else {
    return chalk.cyan('Normal');
  }
}

// Additional missing formatter functions
export function formatProgressBar(progress: number, width: number = 20): string {
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;
  return (
    chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + ` ${progress.toFixed(1)}%`
  );
}

export function formatStatusIndicator(status: string): string {
  const statusColor = getStatusColor(status);
  const indicators = {
    active: '●',
    idle: '○',
    busy: '◐',
    error: '✗',
    offline: '◌',
    running: '▶',
    completed: '✓',
    failed: '✗',
    pending: '⏳',
  };
  const indicator = indicators[status.toLowerCase() as keyof typeof indicators] || '?';
  return statusColor(indicator + ' ' + status);
}

export function formatHealthStatus(health: string): string {
  const healthColors = {
    healthy: chalk.green,
    degraded: chalk.yellow,
    critical: chalk.red,
    unknown: chalk.gray,
  };
  const color = healthColors[health.toLowerCase() as keyof typeof healthColors] || chalk.white;
  return color(health.toUpperCase());
}

export function displayBanner(version: string): string {
  return (
    chalk.cyan(`
 ████████ ██    ██  █████  ██    ██ ██████  ███████      ███████ ██       ██████  ██     ██
██        ██    ██ ██   ██ ██    ██ ██   ██ ██           ██      ██      ██    ██ ██     ██
██        ██    ██ ███████ ██    ██ ██   ██ █████        █████   ██      ██    ██ ██  █  ██
██        ██    ██ ██   ██ ██    ██ ██   ██ ██           ██      ██      ██    ██ ██ ███ ██
 ████████ ████████ ██   ██  ██████  ██████  ███████      ██      ███████  ██████   ███ ███
  `) + chalk.gray(`v${version}\n`)
  );
}

export function displayVersion(version: string): string {
  return chalk.green(`Claude Flow v${version}`);
}

export default {
  formatAgentTable,
  formatTaskTable,
  formatSwarmMetrics,
  formatAgentCapabilities,
  formatAgentSummary,
  formatSimpleAgentTable,
  formatSuccess,
  formatError,
  formatInfo,
  formatWarning,
  formatDuration,
  formatProgressBar,
  formatStatusIndicator,
  formatHealthStatus,
  displayBanner,
  displayVersion,
  getSystemStatusDisplay,
};
