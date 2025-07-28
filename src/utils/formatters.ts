/**
 * Utility functions for formatting data display
 */

import { debugLogger } from "./debug-logger.js";

export function formatDuration(ms: number): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatDuration",
		() => {
			if (ms < 1000) return `${ms}ms`;
			if (ms < 60000) return `${Math.round(ms / 1000)}s`;
			if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
			if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
			return `${Math.round(ms / 86400000)}d`;
		},
		[ms],
		"utils-format",
	);
}

export function formatBytes(bytes: number): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatBytes",
		() => {
			if (bytes === 0) return "0 B";

			const k = 1024;
			const sizes = ["B", "KB", "MB", "GB", "TB"];
			const i = Math.floor(Math.log(bytes) / Math.log(k));

			return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
		},
		[bytes],
		"utils-format",
	);
}

export function formatPercentage(value: number, decimals: number = 1): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatPercentage",
		() => {
			return `${(value * 100).toFixed(decimals)}%`;
		},
		[value, decimals],
		"utils-format",
	);
}

export function formatNumber(num: number): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatNumber",
		() => num.toLocaleString(),
		[num],
		"utils-format",
	);
}

export function formatRelativeTime(date: Date): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatRelativeTime",
		() => {
			const now = new Date();
			const diff = now.getTime() - date.getTime();

			if (diff < 60000) return "just now";
			if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
			if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
			return `${Math.floor(diff / 86400000)}d ago`;
		},
		[date],
		"utils-format",
	);
}

export function formatUptime(startTime: Date): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatUptime",
		() => {
			const uptime = Date.now() - startTime.getTime();
			return formatDuration(uptime);
		},
		[startTime],
		"utils-format",
	);
}

export function formatRate(rate: number): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatRate",
		() => {
			if (rate < 1) return `${(rate * 1000).toFixed(1)}/s`;
			if (rate < 60) return `${rate.toFixed(1)}/s`;
			return `${(rate / 60).toFixed(1)}/min`;
		},
		[rate],
		"utils-format",
	);
}

export function truncate(str: string, length: number): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"truncate",
		() => {
			if (str.length <= length) return str;
			return str.substring(0, length - 3) + "...";
		},
		[str, length],
		"utils-format",
	);
}

export function formatStatus(status: string): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatStatus",
		() => {
			return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
		},
		[status],
		"utils-format",
	);
}

export function formatHealth(health: number): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatHealth",
		() => {
			const percentage = Math.round(health * 100);
			let emoji = "🟢";

			if (health < 0.3) emoji = "🔴";
			else if (health < 0.7) emoji = "🟡";

			return `${emoji} ${percentage}%`;
		},
		[health],
		"utils-format",
	);
}

export function formatMetric(value: number, unit: string): string {
	return debugLogger.logSyncFunction(
		"formatters",
		"formatMetric",
		() => {
			if (value < 1000) return `${value.toFixed(1)} ${unit}`;
			if (value < 1000000) return `${(value / 1000).toFixed(1)}K ${unit}`;
			return `${(value / 1000000).toFixed(1)}M ${unit}`;
		},
		[value, unit],
		"utils-format",
	);
}
