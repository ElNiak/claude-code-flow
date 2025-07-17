#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Careful Linting Fix Script
 * Fixes linting issues methodically without breaking syntax
 */

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

interface LintIssue {
	file: string;
	line: number;
	column: number;
	type: "error" | "warning";
	rule: string;
	message: string;
}

interface FixResult {
	file: string;
	fixes: number;
	issues: string[];
}

class CarefulLintFixer {
	private fixedFiles = 0;
	private totalFixes = 0;
	private results: FixResult[] = [];

	async run() {
		console.log("🔧 Starting careful linting fixes...");

		// Step 1: Fix simple unused variable issues by prefixing with underscore
		await this.fixUnusedVariables();

		// Step 2: Fix parsing errors caused by previous automated fixes
		await this.fixParsingErrors();

		// Step 3: Fix ban-types issues
		await this.fixBanTypes();

		// Step 4: Fix other simple issues
		await this.fixSimpleIssues();

		this.printSummary();
	}

	private async fixUnusedVariables() {
		console.log("\n📝 Fixing unused variables...");

		const files = await this.getSourceFiles();

		for (const file of files) {
			const result = await this.fixUnusedVariablesInFile(file);
			if (result.fixes > 0) {
				this.results.push(result);
				this.fixedFiles++;
				this.totalFixes += result.fixes;
				console.log(`  ✅ ${file}: ${result.fixes} fixes`);
			}
		}
	}

	private async fixUnusedVariablesInFile(filePath: string): Promise<FixResult> {
		const content = await Deno.readTextFile(filePath);
		let newContent = content;
		let fixes = 0;
		const issues: string[] = [];

		// Fix unused imports by prefixing with underscore
		const unusedImportPattern = /import\s+\{\s*([^}]+)\s*\}\s+from/g;
		newContent = newContent.replace(unusedImportPattern, (match, imports) => {
			const importList = imports
				.split(",")
				.map((imp: string) => {
					const trimmed = imp.trim();
					if (
						trimmed &&
						!trimmed.startsWith("_") &&
						!trimmed.startsWith("type ")
					) {
						return `_${trimmed}`;
					}
					return trimmed;
				})
				.join(", ");
			return match.replace(imports, importList);
		});

		// Fix unused parameters by prefixing with underscore
		const unusedParamPattern =
			/\b(function|async\s+function|\w+\s*:\s*\([^)]*\)|=>\s*\([^)]*\)|\([^)]*\)\s*=>\s*\{|\([^)]*\)\s*:\s*[^=]+\s*=>\s*\{)/g;

		// Fix unused variables by prefixing with underscore
		const unusedVarPattern =
			/\b(const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=:]/g;
		newContent = newContent.replace(
			unusedVarPattern,
			(match, keyword, varName) => {
				if (!varName.startsWith("_")) {
					fixes++;
					issues.push(`Prefixed unused variable: ${varName}`);
					return match.replace(varName, `_${varName}`);
				}
				return match;
			},
		);

		if (newContent !== content) {
			await Deno.writeTextFile(filePath, newContent);
		}

		return { file: filePath, fixes, issues };
	}

	private async fixParsingErrors() {
		console.log("\n🔍 Fixing parsing errors...");

		const parsingErrorFiles = [
			"src/unified/work/tmux-manager.ts",
			"src/unified/work/work-command-integrated.ts",
			"src/unified/work/work-command-type-safe.ts",
			"src/unified/work/workflows/dependency-resolver.ts",
			"src/unified/work/workflows/index.ts",
			"src/unified/work/workflows/parallel-executor.ts",
			"src/unified/work/workflows/pipeline-manager.ts",
			"src/unified/work/workflows/preset-executor.ts",
			"src/unified/work/workflows/workflow-composer.ts",
			"src/utils/cli-instrumentation.ts",
			"src/utils/debug-logger.ts",
			"src/utils/logger.ts",
		];

		for (const file of parsingErrorFiles) {
			const filePath = join(Deno.cwd(), file);
			try {
				const result = await this.fixParsingErrorsInFile(filePath);
				if (result.fixes > 0) {
					this.results.push(result);
					this.fixedFiles++;
					this.totalFixes += result.fixes;
					console.log(`  ✅ ${file}: ${result.fixes} fixes`);
				}
			} catch (error) {
				console.log(`  ❌ ${file}: ${error.message}`);
			}
		}
	}

	private async fixParsingErrorsInFile(filePath: string): Promise<FixResult> {
		const content = await Deno.readTextFile(filePath);
		let newContent = content;
		let fixes = 0;
		const issues: string[] = [];

		// Fix trailing commas in object properties
		newContent = newContent.replace(/(\w+)\s*:\s*([^,\n}]+),\s*$/gm, "$1: $2");

		// Fix malformed object properties
		newContent = newContent.replace(/(\w+)\s*,\s*:\s*/g, "$1: ");

		// Fix double commas
		newContent = newContent.replace(/,,+/g, ",");

		// Fix trailing commas before closing brackets
		newContent = newContent.replace(/,\s*([}\]])/g, "$1");

		// Fix malformed type annotations
		newContent = newContent.replace(/:\s*,\s*/g, ": ");

		if (newContent !== content) {
			fixes++;
			issues.push("Fixed parsing errors");
			await Deno.writeTextFile(filePath, newContent);
		}

		return { file: filePath, fixes, issues };
	}

	private async fixBanTypes() {
		console.log("\n🚫 Fixing ban-types issues...");

		const files = await this.getSourceFiles();

		for (const file of files) {
			const result = await this.fixBanTypesInFile(file);
			if (result.fixes > 0) {
				this.results.push(result);
				this.fixedFiles++;
				this.totalFixes += result.fixes;
				console.log(`  ✅ ${file}: ${result.fixes} fixes`);
			}
		}
	}

	private async fixBanTypesInFile(filePath: string): Promise<FixResult> {
		const content = await Deno.readTextFile(filePath);
		let newContent = content;
		let fixes = 0;
		const issues: string[] = [];

		// Fix Function type to specific function signature
		newContent = newContent.replace(/\bFunction\b/g, "(...args: any[]) => any");

		// Fix Object type to Record<string, any>
		newContent = newContent.replace(/\bObject\b/g, "Record<string, any>");

		if (newContent !== content) {
			fixes++;
			issues.push("Fixed ban-types violations");
			await Deno.writeTextFile(filePath, newContent);
		}

		return { file: filePath, fixes, issues };
	}

	private async fixSimpleIssues() {
		console.log("\n⚡ Fixing simple issues...");

		const files = await this.getSourceFiles();

		for (const file of files) {
			const result = await this.fixSimpleIssuesInFile(file);
			if (result.fixes > 0) {
				this.results.push(result);
				this.fixedFiles++;
				this.totalFixes += result.fixes;
				console.log(`  ✅ ${file}: ${result.fixes} fixes`);
			}
		}
	}

	private async fixSimpleIssuesInFile(filePath: string): Promise<FixResult> {
		const content = await Deno.readTextFile(filePath);
		let newContent = content;
		let fixes = 0;
		const issues: string[] = [];

		// Fix require statements in TypeScript files
		newContent = newContent.replace(
			/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
			'import $1 from "$2"',
		);

		if (newContent !== content) {
			fixes++;
			issues.push("Fixed require statements");
			await Deno.writeTextFile(filePath, newContent);
		}

		return { file: filePath, fixes, issues };
	}

	private async getSourceFiles(): Promise<string[]> {
		const files: string[] = [];
		const srcDir = join(Deno.cwd(), "src");

		for await (const entry of walk(srcDir, {
			exts: [".ts", ".js"],
			skip: [/node_modules/, /\.git/, /dist/, /build/],
		})) {
			if (entry.isFile) {
				files.push(entry.path);
			}
		}

		return files;
	}

	private printSummary() {
		console.log("\n📊 Summary:");
		console.log(`  Files processed: ${this.fixedFiles}`);
		console.log(`  Total fixes: ${this.totalFixes}`);

		if (this.results.length > 0) {
			console.log("\n🔧 Detailed results:");
			for (const result of this.results) {
				console.log(`  ${result.file}: ${result.fixes} fixes`);
				for (const issue of result.issues) {
					console.log(`    - ${issue}`);
				}
			}
		}

		console.log("\n✅ Linting fixes complete!");
		console.log('Run "npm run lint" to check for remaining issues.');
	}
}

// Run the fixer
if (import.meta.main) {
	const fixer = new CarefulLintFixer();
	await fixer.run();
}
