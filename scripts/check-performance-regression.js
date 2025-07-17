#!/usr/bin/env node
/**
 * Performance Regression Checker (Node.js version)
 * Adapted from the original Deno version for Node.js compatibility
 */

import fs from "node:fs";
import path from "node:path";
const { execSync } = require("child_process");

const BASELINE_FILE = "performance-baseline.json";
const CURRENT_RESULTS_FILE = "performance-results.json";
const REGRESSION_THRESHOLD = 20; // 20% regression threshold

/**
 * Load baseline performance data
 */
function loadBaseline() {
	try {
		const baselineData = fs.readFileSync(BASELINE_FILE, "utf8");
		return JSON.parse(baselineData);
	} catch (error) {
		if (error.code === "ENOENT") {
			console.log("No baseline found, creating initial baseline...");
			return null;
		}
		throw error;
	}
}

/**
 * Load current performance results
 */
function loadCurrentResults() {
	try {
		const currentData = fs.readFileSync(CURRENT_RESULTS_FILE, "utf8");
		return JSON.parse(currentData);
	} catch (error) {
		console.error("Failed to load current performance results:", error.message);
		console.log("\\nTrying to generate performance results...");

		// Try to generate performance results
		try {
			generatePerformanceResults();
			const currentData = fs.readFileSync(CURRENT_RESULTS_FILE, "utf8");
			return JSON.parse(currentData);
		} catch (genError) {
			console.error(
				"Failed to generate performance results:",
				genError.message,
			);
			process.exit(1);
		}
	}
}

/**
 * Generate performance results
 */
function generatePerformanceResults() {
	console.log("📊 Generating performance results...");

	const results = {
		timestamp: new Date().toISOString(),
		gitHash: getGitHash(),
		metrics: [],
	};

	try {
		// CLI startup time
		const startTime = Date.now();
		try {
			execSync("./bin/claude-flow --help", { stdio: "pipe", timeout: 10000 });
			const cliStartupTime = Date.now() - startTime;
			results.metrics.push({
				name: "CLI Startup Time",
				value: cliStartupTime,
				unit: "ms",
				threshold: 30, // 30% threshold
			});
		} catch (error) {
			console.warn("⚠️  Could not measure CLI startup time:", error.message);
		}

		// Build time
		const buildStartTime = Date.now();
		try {
			execSync("npm run build", { stdio: "pipe", timeout: 60000 });
			const buildTime = Date.now() - buildStartTime;
			results.metrics.push({
				name: "Build Time",
				value: buildTime,
				unit: "ms",
				threshold: 25, // 25% threshold
			});
		} catch (error) {
			console.warn("⚠️  Could not measure build time:", error.message);
		}

		// TypeScript check time
		const tscStartTime = Date.now();
		try {
			execSync("npx tsc --noEmit", { stdio: "pipe", timeout: 30000 });
			const tscTime = Date.now() - tscStartTime;
			results.metrics.push({
				name: "TypeScript Check Time",
				value: tscTime,
				unit: "ms",
				threshold: 20, // 20% threshold
			});
		} catch (error) {
			console.warn(
				"⚠️  Could not measure TypeScript check time:",
				error.message,
			);
		}

		// Bundle size (if dist exists)
		try {
			const distPath = "dist";
			if (fs.existsSync(distPath)) {
				const bundleSize = getFolderSize(distPath);
				results.metrics.push({
					name: "Bundle Size",
					value: bundleSize,
					unit: "bytes",
					threshold: 15, // 15% threshold
				});
			}
		} catch (error) {
			console.warn("⚠️  Could not measure bundle size:", error.message);
		}

		// Test execution time (if tests exist)
		if (fs.existsSync("tests") || fs.existsSync("test")) {
			const testStartTime = Date.now();
			try {
				execSync("npm test", { stdio: "pipe", timeout: 120000 });
				const testTime = Date.now() - testStartTime;
				results.metrics.push({
					name: "Test Execution Time",
					value: testTime,
					unit: "ms",
					threshold: 35, // 35% threshold
				});
			} catch (error) {
				console.warn(
					"⚠️  Could not measure test execution time:",
					error.message,
				);
			}
		}
	} catch (error) {
		console.error("Error generating performance results:", error.message);
	}

	// Save results
	fs.writeFileSync(CURRENT_RESULTS_FILE, JSON.stringify(results, null, 2));
	console.log(
		`✅ Performance results generated with ${results.metrics.length} metrics`,
	);

	return results;
}

/**
 * Get current git hash
 */
function getGitHash() {
	try {
		return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
	} catch (error) {
		return "unknown";
	}
}

/**
 * Get folder size in bytes
 */
function getFolderSize(folderPath) {
	let size = 0;

	function calculateSize(currentPath) {
		const stats = fs.statSync(currentPath);
		if (stats.isFile()) {
			size += stats.size;
		} else if (stats.isDirectory()) {
			const files = fs.readdirSync(currentPath);
			files.forEach((file) => {
				calculateSize(path.join(currentPath, file));
			});
		}
	}

	calculateSize(folderPath);
	return size;
}

/**
 * Save baseline performance data
 */
function saveBaseline(report) {
	fs.writeFileSync(BASELINE_FILE, JSON.stringify(report, null, 2));
	console.log("Baseline updated successfully");
}

/**
 * Calculate regression percentage
 */
function calculateRegression(baseline, current) {
	return ((current - baseline) / baseline) * 100;
}

/**
 * Check for performance regressions
 */
function checkRegressions(baseline, current) {
	const regressions = [];

	for (const currentMetric of current.metrics) {
		const baselineMetric = baseline.metrics.find(
			(m) => m.name === currentMetric.name,
		);

		if (!baselineMetric) {
			console.log(`🆕 New metric detected: ${currentMetric.name}`);
			continue;
		}

		const regression = calculateRegression(
			baselineMetric.value,
			currentMetric.value,
		);
		const threshold = currentMetric.threshold || REGRESSION_THRESHOLD;

		if (regression > threshold) {
			regressions.push({
				metric: currentMetric.name,
				regression,
				threshold,
				baseline: baselineMetric.value,
				current: currentMetric.value,
				unit: currentMetric.unit,
			});
		}
	}

	return {
		regressions,
		hasRegressions: regressions.length > 0,
	};
}

/**
 * Generate performance report
 */
function generateReport(baseline, current, regressions) {
	console.log("\\n=== Performance Regression Report ===\\n");

	console.log(`Baseline: ${baseline.timestamp} (${baseline.gitHash})`);
	console.log(`Current:  ${current.timestamp} (${current.gitHash})\\n`);

	if (regressions.length === 0) {
		console.log("✅ No performance regressions detected!\\n");
	} else {
		console.log("❌ Performance regressions detected:\\n");

		regressions.forEach((regression) => {
			console.log(`  ${regression.metric}:`);
			console.log(`    Baseline: ${regression.baseline} ${regression.unit}`);
			console.log(`    Current:  ${regression.current} ${regression.unit}`);
			console.log(
				`    Regression: ${regression.regression.toFixed(2)}% (threshold: ${regression.threshold}%)`,
			);
			console.log("");
		});
	}

	// Show all metrics for reference
	console.log("📊 All Performance Metrics:\\n");

	current.metrics.forEach((currentMetric) => {
		const baselineMetric = baseline.metrics.find(
			(m) => m.name === currentMetric.name,
		);

		if (baselineMetric) {
			const regression = calculateRegression(
				baselineMetric.value,
				currentMetric.value,
			);
			const status =
				regression > (currentMetric.threshold || REGRESSION_THRESHOLD)
					? "❌"
					: "✅";

			console.log(
				`  ${status} ${currentMetric.name}: ${currentMetric.value} ${currentMetric.unit} (${regression > 0 ? "+" : ""}${regression.toFixed(2)}%)`,
			);
		} else {
			console.log(
				`  🆕 ${currentMetric.name}: ${currentMetric.value} ${currentMetric.unit} (new metric)`,
			);
		}
	});

	console.log("");
}

/**
 * Main function
 */
function main() {
	console.log("Checking for performance regressions...\\n");

	const baseline = loadBaseline();
	const current = loadCurrentResults();

	if (!baseline) {
		console.log(
			"No baseline found, establishing current results as baseline...",
		);
		saveBaseline(current);
		console.log("Baseline established successfully");
		return;
	}

	const { regressions, hasRegressions } = checkRegressions(baseline, current);

	generateReport(baseline, current, regressions);

	if (hasRegressions) {
		console.error(
			"Performance regressions detected! Please investigate and fix before merging.",
		);
		process.exit(1);
	} else {
		console.log("Performance check passed! 🎉");

		// Update baseline if this is a main branch build
		const branch = process.env.GITHUB_REF || process.env.GIT_BRANCH;
		if (branch === "refs/heads/main" || branch === "main") {
			saveBaseline(current);
		}
	}
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export {
	loadBaseline,
	loadCurrentResults,
	generatePerformanceResults,
	checkRegressions,
	generateReport,
};
