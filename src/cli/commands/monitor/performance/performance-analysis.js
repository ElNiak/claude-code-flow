#!/usr/bin/env node

/**
 * Performance Analysis Script for Claude-Flow CLI
 * Measures startup times, import costs, and identifies optimization opportunities
 */

import { exec } from "child_process";
import { readdir, readFile, writeFile } from "fs/promises";
import { join, relative } from "path";
import { performance } from "perf_hooks";
import { promisify } from "util";

const execAsync = promisify(exec);

class PerformanceAnalyzer {
	constructor() {
		this.results = {
			startupTime: [],
			commandExecutionTime: {},
			importAnalysis: {},
			memoryUsage: {},
			recommendations: [],
		};
	}

	async measureStartupTime() {
		console.log("📊 Measuring CLI startup time...");

		const iterations = 5;
		const times = [];

		for (let i = 0; i < iterations; i++) {
			const startTime = performance.now();
			try {
				await execAsync("node dist/cli/simple-cli.js --version");
				const endTime = performance.now();
				times.push(endTime - startTime);
			} catch (error) {
				console.error("Error measuring startup:", error.message);
			}
		}

		this.results.startupTime = {
			times,
			average: times.reduce((a, b) => a + b, 0) / times.length,
			min: Math.min(...times),
			max: Math.max(...times),
		};
	}

	async measureCommandPerformance() {
		console.log("⚡ Measuring command execution times...");

		const commands = [
			"--version",
			"--help",
			"status --json",
			"config get",
			"memory stats",
		];

		for (const cmd of commands) {
			const times = [];
			for (let i = 0; i < 3; i++) {
				const startTime = performance.now();
				try {
					await execAsync(`node dist/cli/simple-cli.js ${cmd}`);
					const endTime = performance.now();
					times.push(endTime - startTime);
				} catch (error) {
					// Some commands may fail, but we still measure time
				}
			}

			this.results.commandExecutionTime[cmd] = {
				average: times.reduce((a, b) => a + b, 0) / times.length,
				min: Math.min(...times),
				max: Math.max(...times),
			};
		}
	}

	async analyzeImports() {
		console.log("🔍 Analyzing import costs...");

		const mainFiles = [
			"src/cli/simple-cli.ts",
			"src/cli/cli-core.ts",
			"src/cli/command-registry.js",
			"src/cli/commands/index.ts",
		];

		for (const file of mainFiles) {
			try {
				const content = await readFile(file, "utf8");
				const imports = this.extractImports(content);

				this.results.importAnalysis[file] = {
					totalImports: imports.length,
					externalImports: imports.filter((i) => !i.startsWith(".")).length,
					localImports: imports.filter((i) => i.startsWith(".")).length,
					heavyImports: this.identifyHeavyImports(imports),
				};
			} catch (error) {
				console.error(`Error analyzing ${file}:`, error.message);
			}
		}
	}

	extractImports(content) {
		const importRegex = /import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
		const imports = [];
		let match;

		while ((match = importRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}

		return imports;
	}

	identifyHeavyImports(imports) {
		const heavyPackages = [
			"blessed", // Terminal UI library - very heavy
			"inquirer", // Interactive CLI prompts
			"puppeteer", // Browser automation
			"ws", // WebSocket library
			"express", // Web framework
			"cli-table3", // Table formatting
			"gradient-string", // Colored output
			"figlet", // ASCII art generation
		];

		return imports.filter((imp) =>
			heavyPackages.some((pkg) => imp.includes(pkg)),
		);
	}

	async measureMemoryUsage() {
		console.log("💾 Measuring memory usage...");

		const startMemory = process.memoryUsage();

		// Simulate loading the CLI
		await import("../dist/cli/cli-core.js");

		const endMemory = process.memoryUsage();

		this.results.memoryUsage = {
			initial: startMemory,
			afterLoad: endMemory,
			delta: {
				heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
				heapTotal: (endMemory.heapTotal - startMemory.heapTotal) / 1024 / 1024,
				external: (endMemory.external - startMemory.external) / 1024 / 1024,
				rss: (endMemory.rss - startMemory.rss) / 1024 / 1024,
			},
		};
	}

	generateRecommendations() {
		console.log("💡 Generating optimization recommendations...");

		const recs = [];

		// Startup time recommendations
		if (this.results.startupTime.average > 500) {
			recs.push({
				category: "Startup Time",
				issue: `Average startup time is ${this.results.startupTime.average.toFixed(2)}ms (>500ms)`,
				recommendation:
					"Consider lazy loading heavy dependencies and command modules",
			});
		}

		// Import recommendations
		for (const [file, analysis] of Object.entries(
			this.results.importAnalysis,
		)) {
			if (analysis.heavyImports?.length > 0) {
				recs.push({
					category: "Heavy Imports",
					issue: `${file} imports heavy packages: ${analysis.heavyImports.join(", ")}`,
					recommendation:
						"Lazy load these packages only when their commands are used",
				});
			}

			if (analysis.totalImports > 20) {
				recs.push({
					category: "Import Count",
					issue: `${file} has ${analysis.totalImports} imports`,
					recommendation:
						"Consider consolidating imports or using barrel exports",
				});
			}
		}

		// Memory recommendations
		if (this.results.memoryUsage.delta?.heapUsed > 50) {
			recs.push({
				category: "Memory Usage",
				issue: `CLI loading increases heap by ${this.results.memoryUsage.delta.heapUsed.toFixed(2)}MB`,
				recommendation: "Defer initialization of heavy objects until needed",
			});
		}

		// Command-specific recommendations
		for (const [cmd, timing] of Object.entries(
			this.results.commandExecutionTime,
		)) {
			if (timing.average > 1000) {
				recs.push({
					category: "Command Performance",
					issue: `Command "${cmd}" takes ${timing.average.toFixed(2)}ms on average`,
					recommendation: "Profile and optimize this command's execution path",
				});
			}
		}

		// General recommendations
		recs.push({
			category: "Build Optimization",
			issue: "Multiple entry points and complex import chains",
			recommendation:
				"Use tree-shaking and dead code elimination in build process",
		});

		recs.push({
			category: "Lazy Loading",
			issue: "All commands loaded at startup",
			recommendation: "Implement dynamic import() for command handlers",
		});

		recs.push({
			category: "Caching",
			issue: "No caching of configuration or command registry",
			recommendation: "Cache parsed configurations and command metadata",
		});

		this.results.recommendations = recs;
	}

	async generateReport() {
		console.log("📝 Generating performance report...");

		const report = {
			timestamp: new Date().toISOString(),
			summary: {
				averageStartupTime: this.results.startupTime.average,
				totalRecommendations: this.results.recommendations.length,
				criticalIssues: this.results.recommendations.filter(
					(r) => r.category === "Startup Time" || r.category === "Memory Usage",
				).length,
			},
			details: this.results,
		};

		await writeFile(
			"performance-analysis-report.json",
			JSON.stringify(report, null, 2),
		);

		// Generate markdown report
		const mdReport = this.generateMarkdownReport(report);
		await writeFile("performance-analysis-report.md", mdReport);

		return report;
	}

	generateMarkdownReport(report) {
		let md = `# Claude-Flow CLI Performance Analysis Report

Generated: ${report.timestamp}

## Executive Summary

- **Average Startup Time**: ${report.summary.averageStartupTime.toFixed(2)}ms
- **Total Recommendations**: ${report.summary.totalRecommendations}
- **Critical Issues**: ${report.summary.criticalIssues}

## Startup Performance

| Metric | Value |
|--------|-------|
| Average | ${this.results.startupTime.average.toFixed(2)}ms |
| Min | ${this.results.startupTime.min.toFixed(2)}ms |
| Max | ${this.results.startupTime.max.toFixed(2)}ms |

## Command Execution Times

| Command | Average | Min | Max |
|---------|---------|-----|-----|
`;

		for (const [cmd, timing] of Object.entries(
			this.results.commandExecutionTime,
		)) {
			md += `| ${cmd} | ${timing.average.toFixed(2)}ms | ${timing.min.toFixed(2)}ms | ${timing.max.toFixed(2)}ms |\n`;
		}

		md += `
## Import Analysis

`;

		for (const [file, analysis] of Object.entries(
			this.results.importAnalysis,
		)) {
			md += `### ${file}

- Total Imports: ${analysis.totalImports}
- External: ${analysis.externalImports}
- Local: ${analysis.localImports}
${analysis.heavyImports?.length > 0 ? `- Heavy Imports: ${analysis.heavyImports.join(", ")}` : ""}

`;
		}

		md += `## Memory Usage

- Heap Used Delta: ${this.results.memoryUsage.delta?.heapUsed.toFixed(2)}MB
- Heap Total Delta: ${this.results.memoryUsage.delta?.heapTotal.toFixed(2)}MB
- RSS Delta: ${this.results.memoryUsage.delta?.rss.toFixed(2)}MB

## Optimization Recommendations

`;

		const groupedRecs = {};
		for (const rec of this.results.recommendations) {
			if (!groupedRecs[rec.category]) {
				groupedRecs[rec.category] = [];
			}
			groupedRecs[rec.category].push(rec);
		}

		for (const [category, recs] of Object.entries(groupedRecs)) {
			md += `### ${category}\n\n`;
			for (const rec of recs) {
				md += `**Issue**: ${rec.issue}\n`;
				md += `**Recommendation**: ${rec.recommendation}\n\n`;
			}
		}

		return md;
	}

	async run() {
		console.log("🚀 Starting Claude-Flow CLI Performance Analysis...\n");

		await this.measureStartupTime();
		await this.measureCommandPerformance();
		await this.analyzeImports();
		await this.measureMemoryUsage();
		this.generateRecommendations();

		const report = await this.generateReport();

		console.log("\n✅ Analysis complete!");
		console.log(`📄 Report saved to: performance-analysis-report.json`);
		console.log(`📄 Markdown report saved to: performance-analysis-report.md`);

		// Display summary
		console.log("\n📊 Summary:");
		console.log(
			`  Average startup time: ${report.summary.averageStartupTime.toFixed(2)}ms`,
		);
		console.log(
			`  Total recommendations: ${report.summary.totalRecommendations}`,
		);
		console.log(`  Critical issues: ${report.summary.criticalIssues}`);
	}
}

// Run the analysis
const analyzer = new PerformanceAnalyzer();
analyzer.run().catch(console.error);
