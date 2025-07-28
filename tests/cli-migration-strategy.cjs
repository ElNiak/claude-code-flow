#!/usr/bin/env node

/**
 * ABOUTME: Test migration strategy analysis and planning for CLI consolidation
 * ABOUTME: Identifies test dependencies, migration paths, and validation requirements
 */

const fs = require("fs");
const path = require("path");

class TestMigrationStrategy {
	constructor() {
		this.projectRoot = path.join(__dirname, "..");
		this.analysis = {
			fileAnalysis: {},
			dependencies: {},
			migrationPlan: {},
			riskAssessment: {},
			validationFramework: {},
		};
	}

	async analyzeTestFiles() {
		console.log("🔍 Analyzing test file structure and dependencies...");

		const testFiles = this.findTestFiles();

		for (const file of testFiles) {
			const analysis = await this.analyzeFile(file);
			this.analysis.fileAnalysis[file] = analysis;
		}

		return this.analysis.fileAnalysis;
	}

	findTestFiles() {
		const testFiles = [];
		const searchDirs = ["tests"];

		const findFiles = (dir) => {
			try {
				const fullDir = path.join(this.projectRoot, dir);
				const items = fs.readdirSync(fullDir);

				for (const item of items) {
					const itemPath = path.join(fullDir, item);
					const relativePath = path.join(dir, item);

					if (fs.statSync(itemPath).isDirectory()) {
						findFiles(relativePath);
					} else if (item.includes(".test.") || item.includes(".spec.")) {
						testFiles.push(relativePath);
					}
				}
			} catch (error) {
				// Skip directories that don't exist
			}
		};

		searchDirs.forEach(findFiles);
		return testFiles;
	}

	async analyzeFile(filePath) {
		try {
			const fullPath = path.join(this.projectRoot, filePath);
			const content = fs.readFileSync(fullPath, "utf8");

			return {
				type: this.determineTestType(filePath, content),
				framework: this.detectTestFramework(content),
				dependencies: this.extractDependencies(content),
				simpleCliReferences: this.findSimpleCliReferences(content),
				complexity: this.assessComplexity(content),
				migrationRisk: this.assessMigrationRisk(filePath, content),
			};
		} catch (error) {
			return {
				error: error.message,
				migrationRisk: "high",
			};
		}
	}

	determineTestType(filePath, content) {
		if (filePath.includes("/unit/")) return "unit";
		if (filePath.includes("/integration/")) return "integration";
		if (filePath.includes("/e2e/")) return "e2e";
		if (filePath.includes("/performance/")) return "performance";

		// Analyze content for patterns
		if (content.includes("describe(") && content.includes("it(")) {
			if (content.includes("execSync") || content.includes("spawn"))
				return "integration";
			if (content.includes("import") && !content.includes("mock"))
				return "unit";
		}

		return "unknown";
	}

	detectTestFramework(content) {
		if (
			content.includes("jest") ||
			content.includes("describe(") ||
			content.includes("test(")
		)
			return "jest";
		if (content.includes("Deno.test")) return "deno";
		if (content.includes("mocha") || content.includes("chai")) return "mocha";
		return "unknown";
	}

	extractDependencies(content) {
		const dependencies = {
			imports: [],
			paths: [],
			commands: [],
		};

		// Extract import statements
		const importMatches =
			content.match(/import.*from ['"`]([^'"`]+)['"`]/g) || [];
		dependencies.imports = importMatches
			.map((match) => {
				const pathMatch = match.match(/from ['"`]([^'"`]+)['"`]/);
				return pathMatch ? pathMatch[1] : null;
			})
			.filter(Boolean);

		// Extract file paths
		const pathMatches = content.match(/['"`]([^'"`]*\/[^'"`]*)['"`]/g) || [];
		dependencies.paths = pathMatches.map((match) => match.slice(1, -1));

		// Extract CLI commands
		const commandMatches =
			content.match(/node\s+[^'"]*simple-cli[^'"]*/g) || [];
		dependencies.commands = commandMatches;

		return dependencies;
	}

	findSimpleCliReferences(content) {
		const lines = content.split("\n");
		const references = [];

		lines.forEach((line, index) => {
			if (line.includes("simple-cli")) {
				references.push({
					lineNumber: index + 1,
					content: line.trim(),
					type: this.categorizeReference(line),
				});
			}
		});

		return references;
	}

	categorizeReference(line) {
		if (line.includes("import")) return "import";
		if (line.includes("path.join")) return "path";
		if (line.includes("execSync") || line.includes("spawn")) return "execution";
		if (line.includes("require")) return "require";
		return "other";
	}

	assessComplexity(content) {
		const lines = content.split("\n").length;
		const imports = (content.match(/import/g) || []).length;
		const tests = (content.match(/it\(|test\(/g) || []).length;
		const describes = (content.match(/describe\(/g) || []).length;

		let score = 0;
		if (lines > 200) score += 3;
		else if (lines > 100) score += 2;
		else if (lines > 50) score += 1;

		if (imports > 10) score += 2;
		else if (imports > 5) score += 1;

		if (tests > 20) score += 2;
		else if (tests > 10) score += 1;

		if (score >= 5) return "high";
		if (score >= 3) return "medium";
		return "low";
	}

	assessMigrationRisk(filePath, content) {
		let risk = 0;

		// High risk factors
		if (content.includes("cli.js")) risk += 3;
		if (content.includes("execSync")) risk += 2;
		if (content.includes("spawn")) risk += 2;
		if (filePath.includes("integration") || filePath.includes("e2e")) risk += 2;

		// Medium risk factors
		if (content.includes("cli.ts")) risk += 1;
		if (content.includes("path.join")) risk += 1;

		// Low risk mitigation
		if (content.includes("mock")) risk -= 1;
		if (filePath.includes("unit")) risk -= 1;

		if (risk >= 5) return "high";
		if (risk >= 3) return "medium";
		if (risk >= 1) return "low";
		return "minimal";
	}

	createMigrationPlan() {
		console.log("📋 Creating migration plan...");

		const filesByRisk = {
			minimal: [],
			low: [],
			medium: [],
			high: [],
		};

		const filesByType = {
			unit: [],
			integration: [],
			e2e: [],
			performance: [],
			unknown: [],
		};

		Object.entries(this.analysis.fileAnalysis).forEach(([file, analysis]) => {
			filesByRisk[analysis.migrationRisk].push(file);
			filesByType[analysis.type].push(file);
		});

		this.analysis.migrationPlan = {
			phases: {
				phase1: {
					name: "Low-Risk Migration",
					files: [...filesByRisk.minimal, ...filesByRisk.low],
					description: "Files with minimal CLI dependencies",
					estimatedEffort: "Low",
				},
				phase2: {
					name: "Medium-Risk Migration",
					files: filesByRisk.medium,
					description: "Files with moderate CLI integration",
					estimatedEffort: "Medium",
				},
				phase3: {
					name: "High-Risk Migration",
					files: filesByRisk.high,
					description: "Files with heavy CLI dependencies",
					estimatedEffort: "High",
				},
			},
			byType: filesByType,
			statistics: {
				totalFiles: Object.keys(this.analysis.fileAnalysis).length,
				riskDistribution: {
					minimal: filesByRisk.minimal.length,
					low: filesByRisk.low.length,
					medium: filesByRisk.medium.length,
					high: filesByRisk.high.length,
				},
			},
		};

		return this.analysis.migrationPlan;
	}

	createValidationFramework() {
		console.log("🧪 Creating validation framework...");

		this.analysis.validationFramework = {
			preValidation: {
				name: "Pre-Migration Validation",
				tests: [
					"Capture baseline CLI behavior",
					"Record all command outputs",
					"Document current test results",
					"Map all CLI dependencies",
				],
			},
			migrationValidation: {
				name: "During Migration Validation",
				tests: [
					"Progressive test execution",
					"Command output comparison",
					"Regression detection",
					"Performance monitoring",
				],
			},
			postValidation: {
				name: "Post-Migration Validation",
				tests: [
					"Full test suite execution",
					"Behavioral equivalence verification",
					"Performance regression check",
					"Integration test validation",
				],
			},
			continuousValidation: {
				name: "Continuous Validation",
				tests: [
					"Automated test execution",
					"Performance monitoring",
					"Error tracking",
					"User acceptance testing",
				],
			},
		};

		return this.analysis.validationFramework;
	}

	async generateReport() {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const reportPath = path.join(
			this.projectRoot,
			`test-migration-strategy-${timestamp}.json`,
		);

		// Add executive summary
		this.analysis.summary = {
			totalFiles: Object.keys(this.analysis.fileAnalysis).length,
			riskDistribution: this.analysis.migrationPlan.statistics.riskDistribution,
			recommendations: [
				"Start with low-risk files to validate migration process",
				"Create comprehensive test for CLI behavioral equivalence",
				"Implement progressive validation at each phase",
				"Maintain rollback capability throughout migration",
			],
		};

		fs.writeFileSync(reportPath, JSON.stringify(this.analysis, null, 2));
		console.log(`\n📋 Migration strategy report saved: ${reportPath}`);

		return reportPath;
	}

	async run() {
		console.log("🚀 Starting Test Migration Strategy Analysis\n");

		try {
			await this.analyzeTestFiles();
			this.createMigrationPlan();
			this.createValidationFramework();

			const reportPath = await this.generateReport();

			console.log("\n✅ Migration Strategy Analysis Complete!");
			console.log("\nSummary:");
			console.log(`  📁 Total Test Files: ${this.analysis.summary.totalFiles}`);
			console.log(
				`  🟢 Minimal Risk: ${this.analysis.summary.riskDistribution.minimal}`,
			);
			console.log(
				`  🟡 Low Risk: ${this.analysis.summary.riskDistribution.low}`,
			);
			console.log(
				`  🟠 Medium Risk: ${this.analysis.summary.riskDistribution.medium}`,
			);
			console.log(
				`  🔴 High Risk: ${this.analysis.summary.riskDistribution.high}`,
			);
			console.log(`\n📄 Full Report: ${reportPath}`);

			return this.analysis;
		} catch (error) {
			console.error("❌ Migration strategy analysis failed:", error);
			throw error;
		}
	}
}

// Run if called directly
if (require.main === module) {
	const strategy = new TestMigrationStrategy();
	strategy.run().catch(console.error);
}

module.exports = TestMigrationStrategy;
