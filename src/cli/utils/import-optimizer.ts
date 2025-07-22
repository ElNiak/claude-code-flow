/**
 * Import Optimizer Utility
 * Provides utilities for optimizing imports and reducing duplication
 */

import { promises as fs } from "fs";
import { dirname, join, relative } from "path";

interface ImportAnalysis {
	file: string;
	imports: ImportInfo[];
	duplicates: string[];
	suggestions: OptimizationSuggestion[];
}

interface ImportInfo {
	source: string;
	specifiers: string[];
	isDefault: boolean;
	isNamespace: boolean;
	line: number;
}

interface OptimizationSuggestion {
	type: "consolidate" | "lazy-load" | "remove-unused" | "use-barrel";
	description: string;
	impact: "high" | "medium" | "low";
}

export class ImportOptimizer {
	private importMap = new Map<string, Set<string>>();
	private fileImports = new Map<string, ImportInfo[]>();

	/**
	 * Analyze imports in a TypeScript/JavaScript file
	 */
	async analyzeFile(filePath: string): Promise<ImportAnalysis> {
		const content = await fs.readFile(filePath, "utf8");
		const imports = this.extractImports(content);
		const duplicates = this.findDuplicateImports(imports);
		const suggestions = this.generateSuggestions(filePath, imports);

		this.fileImports.set(filePath, imports);

		return {
			file: filePath,
			imports,
			duplicates,
			suggestions,
		};
	}

	/**
	 * Extract import statements from file content
	 */
	private extractImports(content: string): ImportInfo[] {
		const imports: ImportInfo[] = [];
		const lines = content.split("\n");

		// Match various import patterns
		const importPatterns = [
			// import { a, b } from 'module'
			/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/,
			// import * as name from 'module'
			/import\s*\*\s*as\s*(\w+)\s*from\s*['"]([^'"]+)['"]/,
			// import name from 'module'
			/import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/,
			// import 'module'
			/import\s*['"]([^'"]+)['"]/,
		];

		lines.forEach((line, index) => {
			for (const pattern of importPatterns) {
				const match = line.match(pattern);
				if (match) {
					if (pattern === importPatterns[0]) {
						// Named imports
						const specifiers = match[1].split(",").map((s) => s.trim());
						imports.push({
							source: match[2],
							specifiers,
							isDefault: false,
							isNamespace: false,
							line: index + 1,
						});
					} else if (pattern === importPatterns[1]) {
						// Namespace import
						imports.push({
							source: match[2],
							specifiers: [match[1]],
							isDefault: false,
							isNamespace: true,
							line: index + 1,
						});
					} else if (pattern === importPatterns[2]) {
						// Default import
						imports.push({
							source: match[2],
							specifiers: [match[1]],
							isDefault: true,
							isNamespace: false,
							line: index + 1,
						});
					} else if (pattern === importPatterns[3]) {
						// Side-effect import
						imports.push({
							source: match[1],
							specifiers: [],
							isDefault: false,
							isNamespace: false,
							line: index + 1,
						});
					}
					break;
				}
			}
		});

		return imports;
	}

	/**
	 * Find duplicate imports from the same source
	 */
	private findDuplicateImports(imports: ImportInfo[]): string[] {
		const sourceMap = new Map<string, number>();
		const duplicates: string[] = [];

		for (const imp of imports) {
			const count = sourceMap.get(imp.source) || 0;
			sourceMap.set(imp.source, count + 1);
		}

		for (const [source, count] of sourceMap.entries()) {
			if (count > 1) {
				duplicates.push(source);
			}
		}

		return duplicates;
	}

	/**
	 * Generate optimization suggestions
	 */
	private generateSuggestions(
		filePath: string,
		imports: ImportInfo[]
	): OptimizationSuggestion[] {
		const suggestions: OptimizationSuggestion[] = [];

		// Check for consolidation opportunities
		const sourceGroups = new Map<string, ImportInfo[]>();
		for (const imp of imports) {
			const group = sourceGroups.get(imp.source) || [];
			group.push(imp);
			sourceGroups.set(imp.source, group);
		}

		for (const [source, group] of sourceGroups.entries()) {
			if (group.length > 1) {
				suggestions.push({
					type: "consolidate",
					description: `Consolidate ${group.length} imports from '${source}'`,
					impact: "medium",
				});
			}
		}

		// Check for heavy packages that could be lazy-loaded
		const heavyPackages = [
			"blessed",
			"inquirer",
			"puppeteer",
			"express",
			"ws",
			"cli-table3",
			"gradient-string",
			"figlet",
			"ora",
		];

		for (const imp of imports) {
			if (heavyPackages.some((pkg) => imp.source.includes(pkg))) {
				suggestions.push({
					type: "lazy-load",
					description: `Consider lazy-loading heavy package '${imp.source}'`,
					impact: "high",
				});
			}
		}

		// Check for potential barrel exports
		const localImports = imports.filter((imp) => imp.source.startsWith("."));
		const importDirs = new Map<string, number>();

		for (const imp of localImports) {
			const dir = dirname(imp.source);
			importDirs.set(dir, (importDirs.get(dir) || 0) + 1);
		}

		for (const [dir, count] of importDirs.entries()) {
			if (count >= 3) {
				suggestions.push({
					type: "use-barrel",
					description: `Consider using barrel exports for ${count} imports from '${dir}'`,
					impact: "low",
				});
			}
		}

		return suggestions;
	}

	/**
	 * Generate optimized import statements
	 */
	generateOptimizedImports(imports: ImportInfo[]): string[] {
		const optimized: string[] = [];
		const sourceGroups = new Map<string, ImportInfo[]>();

		// Group by source
		for (const imp of imports) {
			const group = sourceGroups.get(imp.source) || [];
			group.push(imp);
			sourceGroups.set(imp.source, group);
		}

		// Generate consolidated imports
		for (const [source, group] of sourceGroups.entries()) {
			const defaultImport = group.find((imp) => imp.isDefault);
			const namespaceImport = group.find((imp) => imp.isNamespace);
			const namedImports = group
				.filter((imp) => !imp.isDefault && !imp.isNamespace)
				.flatMap((imp) => imp.specifiers);

			let importStatement = "import ";

			if (defaultImport && defaultImport.specifiers.length > 0) {
				importStatement += defaultImport.specifiers[0];
				if (namedImports.length > 0 || namespaceImport) {
					importStatement += ", ";
				}
			}

			if (namespaceImport && namespaceImport.specifiers.length > 0) {
				importStatement += `* as ${namespaceImport.specifiers[0]}`;
				if (namedImports.length > 0) {
					importStatement += ", ";
				}
			}

			if (namedImports.length > 0) {
				const unique = [...new Set(namedImports)];
				importStatement += `{ ${unique.join(", ")} }`;
			}

			if (importStatement === "import ") {
				// Side-effect import
				optimized.push(`import '${source}';`);
			} else {
				importStatement += ` from '${source}';`;
				optimized.push(importStatement);
			}
		}

		return optimized;
	}

	/**
	 * Create a barrel export file
	 */
	async createBarrelExport(
		directory: string,
		outputFile: string = "index.ts"
	): Promise<void> {
		const files = await fs.readdir(directory);
		const exports: string[] = [];

		for (const file of files) {
			if (file.endsWith(".ts") || file.endsWith(".js")) {
				if (file === outputFile) continue;

				const filePath = join(directory, file);
				const stats = await fs.stat(filePath);

				if (stats.isFile()) {
					const moduleName = file.replace(/\.(ts|js)$/, "");
					exports.push(`export * from './${moduleName}';`);
				}
			}
		}

		const barrelContent = exports.join("\n") + "\n";
		await fs.writeFile(join(directory, outputFile), barrelContent);
	}

	/**
	 * Generate lazy loading wrapper
	 */
	generateLazyLoader(modulePath: string, exportName?: string): string {
		const loaderName = exportName || "default";
		return `
let _${loaderName}: any;

export async function load${loaderName.charAt(0).toUpperCase() + loaderName.slice(1)}() {
  if (!_${loaderName}) {
    const module = await import('${modulePath}');
    _${loaderName} = module.${exportName || "default"};
  }
  return _${loaderName};
}`;
	}

	/**
	 * Analyze project-wide import patterns
	 */
	async analyzeProject(rootDir: string): Promise<Map<string, ImportAnalysis>> {
		const results = new Map<string, ImportAnalysis>();
		const files = await this.findSourceFiles(rootDir);

		for (const file of files) {
			try {
				const analysis = await this.analyzeFile(file);
				results.set(file, analysis);
			} catch (error) {
				console.error(`Failed to analyze ${file}:`, error);
			}
		}

		return results;
	}

	/**
	 * Find all TypeScript/JavaScript source files
	 */
	private async findSourceFiles(dir: string): Promise<string[]> {
		const files: string[] = [];
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and build directories
				if (!["node_modules", "dist", "build", ".git"].includes(entry.name)) {
					files.push(...(await this.findSourceFiles(fullPath)));
				}
			} else if (entry.isFile()) {
				if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) {
					files.push(fullPath);
				}
			}
		}

		return files;
	}
}

/**
 * Performance monitoring extension for startup optimization
 */
export class StartupPerformanceOptimizer {
	private startTime = Date.now();
	private importMetrics = new Map<
		string,
		{ time: number; size: number; usage: number }
	>();
	private lazyLoadThreshold = 15; // ms

	trackImport(moduleName: string, loadTime: number, moduleSize = 0): void {
		this.importMetrics.set(moduleName, {
			time: loadTime,
			size: moduleSize,
			usage: this.importMetrics.get(moduleName)?.usage || 0,
		});
	}

	recordUsage(moduleName: string): void {
		const metric = this.importMetrics.get(moduleName);
		if (metric) {
			metric.usage++;
		}
	}

	getStartupTime(): number {
		return Date.now() - this.startTime;
	}

	generateOptimizationReport(): {
		totalStartupTime: number;
		slowestImports: Array<{ name: string; time: number; usage: number }>;
		lazyLoadCandidates: string[];
		unusedImports: string[];
		recommendations: string[];
	} {
		const totalStartupTime = this.getStartupTime();
		const imports = Array.from(this.importMetrics.entries());

		const slowestImports = imports
			.map(([name, metrics]) => ({
				name,
				time: metrics.time,
				usage: metrics.usage,
			}))
			.sort((a, b) => b.time - a.time)
			.slice(0, 5);

		const lazyLoadCandidates = imports
			.filter(
				([, metrics]) =>
					metrics.time > this.lazyLoadThreshold && metrics.usage < 5
			)
			.map(([name]) => name);

		const unusedImports = imports
			.filter(([, metrics]) => metrics.usage === 0)
			.map(([name]) => name);

		const recommendations = [
			`Current startup time: ${totalStartupTime}ms (target: <80ms)`,
			`${lazyLoadCandidates.length} modules can be lazy-loaded`,
			`${unusedImports.length} unused modules can be removed`,
			totalStartupTime > 80
				? "OPTIMIZATION REQUIRED"
				: "Performance target met ✅",
		];

		return {
			totalStartupTime,
			slowestImports,
			lazyLoadCandidates,
			unusedImports,
			recommendations,
		};
	}
}

// Export singleton instances
export const importOptimizer = new ImportOptimizer();
export const startupOptimizer = new StartupPerformanceOptimizer();
