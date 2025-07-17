#!/usr/bin/env npx ts-node

/**
 * Integration Validation Test Runner
 *
 * Comprehensive test execution script for validating the unified work command
 * integration, prompt engineering, and system performance.
 */

import chalk from "chalk";
import { ChildProcess, spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";

interface TestResult {
	suite: string;
	passed: number;
	failed: number;
	skipped: number;
	duration: number;
	coverage?: number;
	errors: string[];
}

interface ValidationReport {
	timestamp: string;
	totalTests: number;
	totalPassed: number;
	totalFailed: number;
	totalSkipped: number;
	overallDuration: number;
	testSuites: TestResult[];
	qualityMetrics: {
		integrationScore: number;
		promptQualityScore: number;
		performanceScore: number;
		overallScore: number;
	};
	recommendations: string[];
	issues: string[];
}

class IntegrationValidationRunner {
	private testSuites = [
		{
			name: "Unified Work Integration",
			file: "tests/validation/unified-work-integration.test.ts",
			timeout: 60000,
			weight: 0.4,
		},
		{
			name: "Prompt Engineering Validation",
			file: "tests/validation/prompt-engineering-validation.test.ts",
			timeout: 45000,
			weight: 0.35,
		},
		{
			name: "Performance Validation",
			file: "tests/validation/performance-validation.test.ts",
			timeout: 90000,
			weight: 0.25,
		},
	];

	private outputDir: string;
	private startTime: number = 0;
	private results: TestResult[] = [];

	constructor() {
		this.outputDir = path.join(
			__dirname,
			"validation-reports",
			`run-${Date.now()}`,
		);
	}

	/**
	 * Main execution entry point
	 */
	async run(): Promise<void> {
		console.log(
			chalk.blue.bold("🚀 Starting Integration Validation Test Suite"),
		);
		console.log(chalk.gray("═".repeat(60)));

		try {
			await this.setupEnvironment();
			await this.runTestSuites();
			await this.generateReport();
			await this.displaySummary();
		} catch (error) {
			console.error(chalk.red.bold("❌ Validation failed:"), error);
			process.exit(1);
		}
	}

	/**
	 * Setup test environment
	 */
	private async setupEnvironment(): Promise<void> {
		console.log(chalk.yellow("📋 Setting up test environment..."));

		// Create output directory
		await fs.mkdir(this.outputDir, { recursive: true });

		// Verify test files exist
		for (const suite of this.testSuites) {
			try {
				await fs.access(suite.file);
			} catch (error) {
				throw new Error(`Test file not found: ${suite.file}`);
			}
		}

		// Check if Jest is available
		try {
			await this.executeCommand("npx jest --version");
		} catch (error) {
			throw new Error("Jest is not available. Please run: npm install jest");
		}

		console.log(chalk.green("✅ Environment setup complete"));
	}

	/**
	 * Run all test suites
	 */
	private async runTestSuites(): Promise<void> {
		this.startTime = Date.now();

		console.log(
			chalk.yellow(`\n🧪 Running ${this.testSuites.length} test suites...\n`),
		);

		for (const suite of this.testSuites) {
			console.log(chalk.cyan(`Running: ${suite.name}`));
			console.log(chalk.gray(`File: ${suite.file}`));

			const result = await this.runTestSuite(suite);
			this.results.push(result);

			this.displaySuiteResult(result);
			console.log(""); // Empty line for readability
		}
	}

	/**
	 * Run individual test suite
	 */
	private async runTestSuite(suite: any): Promise<TestResult> {
		const suiteStartTime = Date.now();
		const result: TestResult = {
			suite: suite.name,
			passed: 0,
			failed: 0,
			skipped: 0,
			duration: 0,
			errors: [],
		};

		try {
			// Run Jest with JSON output
			const jestArgs = [
				"jest",
				suite.file,
				"--json",
				"--coverage",
				"--verbose",
				`--testTimeout=${suite.timeout}`,
			];

			const output = await this.executeCommand(`npx ${jestArgs.join(" ")}`);
			const jestResult = JSON.parse(output);

			// Parse Jest results
			if (jestResult.testResults && jestResult.testResults.length > 0) {
				const testResult = jestResult.testResults[0];

				result.passed = testResult.numPassingTests || 0;
				result.failed = testResult.numFailingTests || 0;
				result.skipped = testResult.numPendingTests || 0;

				// Extract error messages
				if (testResult.failureMessage) {
					result.errors.push(testResult.failureMessage);
				}
			}

			// Extract coverage if available
			if (jestResult.coverageMap) {
				result.coverage = this.calculateCoverage(jestResult.coverageMap);
			}
		} catch (error) {
			console.error(chalk.red(`Error running ${suite.name}:`), error);
			result.failed = 1;
			result.errors.push(error.message || String(error));
		}

		result.duration = Date.now() - suiteStartTime;
		return result;
	}

	/**
	 * Execute shell command and return output
	 */
	private async executeCommand(command: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const process = spawn("sh", ["-c", command], {
				stdio: ["pipe", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";

			process.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			process.stderr.on("data", (data) => {
				stderr += data.toString();
			});

			process.on("close", (code) => {
				if (code === 0) {
					resolve(stdout);
				} else {
					reject(new Error(`Command failed: ${command}\n${stderr}`));
				}
			});

			process.on("error", (error) => {
				reject(error);
			});
		});
	}

	/**
	 * Calculate coverage percentage from Jest coverage map
	 */
	private calculateCoverage(coverageMap: any): number {
		if (!coverageMap || typeof coverageMap !== "object") {
			return 0;
		}

		let totalStatements = 0;
		let coveredStatements = 0;

		for (const file in coverageMap) {
			const fileCoverage = coverageMap[file];
			if (fileCoverage && fileCoverage.s) {
				const statements = Object.values(fileCoverage.s) as number[];
				totalStatements += statements.length;
				coveredStatements += statements.filter((count) => count > 0).length;
			}
		}

		return totalStatements > 0
			? (coveredStatements / totalStatements) * 100
			: 0;
	}

	/**
	 * Display test suite result
	 */
	private displaySuiteResult(result: TestResult): void {
		const total = result.passed + result.failed + result.skipped;
		const successRate = total > 0 ? (result.passed / total) * 100 : 0;

		console.log(chalk.gray("├── Results:"));
		console.log(chalk.green(`├── ✅ Passed: ${result.passed}`));

		if (result.failed > 0) {
			console.log(chalk.red(`├── ❌ Failed: ${result.failed}`));
		}

		if (result.skipped > 0) {
			console.log(chalk.yellow(`├── ⏭️  Skipped: ${result.skipped}`));
		}

		console.log(chalk.gray(`├── ⏱️  Duration: ${result.duration}ms`));

		if (result.coverage !== undefined) {
			console.log(
				chalk.blue(`├── 📊 Coverage: ${result.coverage.toFixed(1)}%`),
			);
		}

		console.log(chalk.gray(`└── 📈 Success Rate: ${successRate.toFixed(1)}%`));

		// Display errors if any
		if (result.errors.length > 0) {
			console.log(chalk.red("Errors:"));
			result.errors.forEach((error) => {
				console.log(chalk.red(`  - ${error.substring(0, 200)}...`));
			});
		}
	}

	/**
	 * Generate comprehensive validation report
	 */
	private async generateReport(): Promise<void> {
		console.log(chalk.yellow("\n📊 Generating validation report..."));

		const totalTests = this.results.reduce(
			(sum, r) => sum + r.passed + r.failed + r.skipped,
			0,
		);
		const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
		const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
		const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
		const overallDuration = Date.now() - this.startTime;

		// Calculate quality metrics
		const qualityMetrics = this.calculateQualityMetrics();

		// Generate recommendations and identify issues
		const { recommendations, issues } = this.analyzeResults();

		const report: ValidationReport = {
			timestamp: new Date().toISOString(),
			totalTests,
			totalPassed,
			totalFailed,
			totalSkipped,
			overallDuration,
			testSuites: this.results,
			qualityMetrics,
			recommendations,
			issues,
		};

		// Save detailed JSON report
		const jsonReportPath = path.join(this.outputDir, "validation-report.json");
		await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));

		// Generate human-readable HTML report
		const htmlReport = this.generateHtmlReport(report);
		const htmlReportPath = path.join(this.outputDir, "validation-report.html");
		await fs.writeFile(htmlReportPath, htmlReport);

		console.log(chalk.green(`✅ Reports generated:`));
		console.log(chalk.gray(`├── JSON: ${jsonReportPath}`));
		console.log(chalk.gray(`└── HTML: ${htmlReportPath}`));
	}

	/**
	 * Calculate quality metrics
	 */
	private calculateQualityMetrics(): ValidationReport["qualityMetrics"] {
		// Integration Score: based on test pass rate and coverage
		const integrationResult = this.results.find((r) =>
			r.suite.includes("Integration"),
		);
		const integrationTests = integrationResult
			? integrationResult.passed + integrationResult.failed
			: 0;
		const integrationPassed = integrationResult ? integrationResult.passed : 0;
		const integrationScore =
			integrationTests > 0 ? (integrationPassed / integrationTests) * 100 : 0;

		// Prompt Quality Score: based on prompt engineering validation
		const promptResult = this.results.find((r) => r.suite.includes("Prompt"));
		const promptTests = promptResult
			? promptResult.passed + promptResult.failed
			: 0;
		const promptPassed = promptResult ? promptResult.passed : 0;
		const promptQualityScore =
			promptTests > 0 ? (promptPassed / promptTests) * 100 : 0;

		// Performance Score: based on performance validation
		const performanceResult = this.results.find((r) =>
			r.suite.includes("Performance"),
		);
		const performanceTests = performanceResult
			? performanceResult.passed + performanceResult.failed
			: 0;
		const performancePassed = performanceResult ? performanceResult.passed : 0;
		const performanceScore =
			performanceTests > 0 ? (performancePassed / performanceTests) * 100 : 0;

		// Overall Score: weighted average
		const weights = this.testSuites.reduce(
			(acc, suite) => {
				acc[suite.name] = suite.weight;
				return acc;
			},
			{} as Record<string, number>,
		);

		const overallScore =
			integrationScore * (weights["Unified Work Integration"] || 0.4) +
			promptQualityScore * (weights["Prompt Engineering Validation"] || 0.35) +
			performanceScore * (weights["Performance Validation"] || 0.25);

		return {
			integrationScore,
			promptQualityScore,
			performanceScore,
			overallScore,
		};
	}

	/**
	 * Analyze results and generate recommendations
	 */
	private analyzeResults(): { recommendations: string[]; issues: string[] } {
		const recommendations: string[] = [];
		const issues: string[] = [];

		// Analyze each test suite
		for (const result of this.results) {
			const total = result.passed + result.failed + result.skipped;
			const successRate = total > 0 ? (result.passed / total) * 100 : 0;

			if (successRate < 80) {
				issues.push(
					`${result.suite} has low success rate (${successRate.toFixed(1)}%)`,
				);
				recommendations.push(`Review and fix failing tests in ${result.suite}`);
			}

			if (result.coverage !== undefined && result.coverage < 80) {
				issues.push(
					`${result.suite} has low coverage (${result.coverage.toFixed(1)}%)`,
				);
				recommendations.push(`Increase test coverage for ${result.suite}`);
			}

			if (result.duration > 60000) {
				issues.push(`${result.suite} is slow (${result.duration}ms)`);
				recommendations.push(`Optimize performance of ${result.suite}`);
			}

			if (result.errors.length > 0) {
				issues.push(`${result.suite} has ${result.errors.length} errors`);
				recommendations.push(`Fix errors in ${result.suite}`);
			}
		}

		// General recommendations
		const totalTests = this.results.reduce(
			(sum, r) => sum + r.passed + r.failed + r.skipped,
			0,
		);
		const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);

		if (totalTests === 0) {
			issues.push("No tests were executed");
			recommendations.push(
				"Ensure test files are properly configured and accessible",
			);
		} else if (totalFailed === 0) {
			recommendations.push(
				"Excellent! All tests passed. Consider adding more edge case tests.",
			);
		} else if (totalFailed > totalTests * 0.1) {
			recommendations.push(
				"High failure rate detected. Review test implementation and system stability.",
			);
		}

		return { recommendations, issues };
	}

	/**
	 * Generate HTML report
	 */
	private generateHtmlReport(report: ValidationReport): string {
		const successRate =
			report.totalTests > 0
				? (report.totalPassed / report.totalTests) * 100
				: 0;

		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integration Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metric-card { display: inline-block; background: #f8f9fa; padding: 20px; margin: 10px; border-radius: 8px; text-align: center; min-width: 150px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .suite-result { margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa; }
        .passed { border-left-color: #28a745; }
        .failed { border-left-color: #dc3545; }
        .recommendations { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .issues { background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .timestamp { color: #666; font-size: 0.9em; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Integration Validation Report</h1>
            <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <div class="metric-card">
                <div class="metric-value">${report.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #28a745;">${report.totalPassed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #dc3545;">${report.totalFailed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(report.overallDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>

        <h2>📊 Quality Metrics</h2>
        <div style="display: flex; justify-content: space-around; margin: 20px 0;">
            <div class="metric-card">
                <div class="metric-value">${report.qualityMetrics.integrationScore.toFixed(1)}</div>
                <div class="metric-label">Integration Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.qualityMetrics.promptQualityScore.toFixed(1)}</div>
                <div class="metric-label">Prompt Quality</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.qualityMetrics.performanceScore.toFixed(1)}</div>
                <div class="metric-label">Performance</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.qualityMetrics.overallScore.toFixed(1)}</div>
                <div class="metric-label">Overall Score</div>
            </div>
        </div>

        <h2>🧪 Test Suite Results</h2>
        ${report.testSuites
					.map((suite) => {
						const total = suite.passed + suite.failed + suite.skipped;
						const rate = total > 0 ? (suite.passed / total) * 100 : 0;
						const status = suite.failed === 0 ? "passed" : "failed";

						return `
            <div class="suite-result ${status}">
                <h3>${suite.suite}</h3>
                <p><strong>Tests:</strong> ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped (${rate.toFixed(1)}% success)</p>
                <p><strong>Duration:</strong> ${suite.duration}ms</p>
                ${suite.coverage ? `<p><strong>Coverage:</strong> ${suite.coverage.toFixed(1)}%</p>` : ""}
                ${suite.errors.length > 0 ? `<p><strong>Errors:</strong> ${suite.errors.length}</p>` : ""}
            </div>
          `;
					})
					.join("")}

        ${
					report.recommendations.length > 0
						? `
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            <ul>
                ${report.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
            </ul>
        </div>
        `
						: ""
				}

        ${
					report.issues.length > 0
						? `
        <div class="issues">
            <h2>⚠️ Issues Identified</h2>
            <ul>
                ${report.issues.map((issue) => `<li>${issue}</li>`).join("")}
            </ul>
        </div>
        `
						: ""
				}

        <div style="margin-top: 40px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Integration Validator Agent - Claude Code Flow Unified Work Command Validation</p>
        </div>
    </div>
</body>
</html>
    `;
	}

	/**
	 * Display final summary
	 */
	private async displaySummary(): Promise<void> {
		const totalTests = this.results.reduce(
			(sum, r) => sum + r.passed + r.failed + r.skipped,
			0,
		);
		const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
		const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
		const successRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

		console.log(chalk.blue.bold("\n📋 VALIDATION SUMMARY"));
		console.log(chalk.gray("═".repeat(60)));
		console.log(chalk.white(`📊 Total Tests: ${totalTests}`));
		console.log(chalk.green(`✅ Passed: ${totalPassed}`));
		console.log(chalk.red(`❌ Failed: ${totalFailed}`));
		console.log(chalk.yellow(`📈 Success Rate: ${successRate.toFixed(1)}%`));
		console.log(
			chalk.gray(`⏱️  Total Duration: ${(Date.now() - this.startTime) / 1000}s`),
		);

		if (successRate >= 95) {
			console.log(
				chalk.green.bold("\n🎉 EXCELLENT! All validation criteria met."),
			);
		} else if (successRate >= 80) {
			console.log(
				chalk.yellow.bold(
					"\n⚠️  GOOD! Minor issues identified for improvement.",
				),
			);
		} else {
			console.log(
				chalk.red.bold(
					"\n❌ ATTENTION REQUIRED! Significant issues need resolution.",
				),
			);
		}

		console.log(chalk.gray(`\n📁 Reports saved to: ${this.outputDir}`));
		console.log(chalk.gray("═".repeat(60)));
	}
}

// Execute validation if run directly
if (require.main === module) {
	const runner = new IntegrationValidationRunner();
	runner.run().catch((error) => {
		console.error(chalk.red("Fatal error:"), error);
		process.exit(1);
	});
}

export { IntegrationValidationRunner };
