#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Fix Critical Parsing Errors Script
 * Focuses on specific parsing errors that break the linter
 */

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

interface FixResult {
  file: string;
  fixes: number;
  issues: string[];
}

class ParsingErrorFixer {
  private fixedFiles = 0;
  private totalFixes = 0;
  private results: FixResult[] = [];

  async run() {
    console.log('🔧 Fixing critical parsing errors...');
    
    await this.fixSpecificParsingErrors();
    
    this.printSummary();
  }

  private async fixSpecificParsingErrors() {
    console.log('\n🔍 Fixing specific parsing errors...');
    
    const files = await this.getSourceFiles();
    
    for (const file of files) {
      try {
        const result = await this.fixParsingErrorsInFile(file);
        if (result.fixes > 0) {
          this.results.push(result);
          this.fixedFiles++;
          this.totalFixes += result.fixes;
          console.log(`  ✅ ${file.replace(Deno.cwd(), '.')}: ${result.fixes} fixes`);
        }
      } catch (error) {
        console.log(`  ❌ ${file.replace(Deno.cwd(), '.')}: ${error.message}`);
      }
    }
  }

  private async fixParsingErrorsInFile(filePath: string): Promise<FixResult> {
    const content = await Deno.readTextFile(filePath);
    let newContent = content;
    let fixes = 0;
    const issues: string[] = [];

    // Fix Record<string, any>.entries() to Object.entries()
    const recordEntriesPattern = /Record<string,\s*any>\.entries\(/g;
    const recordEntriesMatches = newContent.match(recordEntriesPattern);
    if (recordEntriesMatches) {
      newContent = newContent.replace(recordEntriesPattern, 'Object.entries(');
      fixes += recordEntriesMatches.length;
      issues.push(`Fixed ${recordEntriesMatches.length} Record<string, any>.entries() calls`);
    }

    // Fix Record<string, any>.keys() to Object.keys()
    const recordKeysPattern = /Record<string,\s*any>\.keys\(/g;
    const recordKeysMatches = newContent.match(recordKeysPattern);
    if (recordKeysMatches) {
      newContent = newContent.replace(recordKeysPattern, 'Object.keys(');
      fixes += recordKeysMatches.length;
      issues.push(`Fixed ${recordKeysMatches.length} Record<string, any>.keys() calls`);
    }

    // Fix Record<string, any>.values() to Object.values()
    const recordValuesPattern = /Record<string,\s*any>\.values\(/g;
    const recordValuesMatches = newContent.match(recordValuesPattern);
    if (recordValuesMatches) {
      newContent = newContent.replace(recordValuesPattern, 'Object.values(');
      fixes += recordValuesMatches.length;
      issues.push(`Fixed ${recordValuesMatches.length} Record<string, any>.values() calls`);
    }

    // Fix Array<any>.from() to Array.from()
    const arrayFromPattern = /Array<[^>]+>\.from\(/g;
    const arrayFromMatches = newContent.match(arrayFromPattern);
    if (arrayFromMatches) {
      newContent = newContent.replace(arrayFromPattern, 'Array.from(');
      fixes += arrayFromMatches.length;
      issues.push(`Fixed ${arrayFromMatches.length} Array<T>.from() calls`);
    }

    // Fix malformed object properties (property: ,)
    const malformedPropPattern = /(\w+):\s*,/g;
    const malformedPropMatches = newContent.match(malformedPropPattern);
    if (malformedPropMatches) {
      newContent = newContent.replace(malformedPropPattern, (match, prop) => {
        return `${prop}: undefined,`;
      });
      fixes += malformedPropMatches.length;
      issues.push(`Fixed ${malformedPropMatches.length} malformed object properties`);
    }

    // Fix double commas
    const doubleCommaPattern = /,,+/g;
    const doubleCommaMatches = newContent.match(doubleCommaPattern);
    if (doubleCommaMatches) {
      newContent = newContent.replace(doubleCommaPattern, ',');
      fixes += doubleCommaMatches.length;
      issues.push(`Fixed ${doubleCommaMatches.length} double commas`);
    }

    // Fix trailing commas before closing brackets
    const trailingCommaPattern = /,\s*([}\]])/g;
    const trailingCommaMatches = newContent.match(trailingCommaPattern);
    if (trailingCommaMatches) {
      newContent = newContent.replace(trailingCommaPattern, '$1');
      fixes += trailingCommaMatches.length;
      issues.push(`Fixed ${trailingCommaMatches.length} trailing commas`);
    }

    // Fix import statements that got broken (_import from vs import from)
    const brokenImportPattern = /import\s+\{\s*(_[^}]+)\s*\}/g;
    const brokenImportMatches = newContent.match(brokenImportPattern);
    if (brokenImportMatches) {
      newContent = newContent.replace(brokenImportPattern, (match, imports) => {
        const fixedImports = imports.replace(/^_/, '').replace(/,\s*_/g, ', ');
        return `import { ${fixedImports} }`;
      });
      fixes += brokenImportMatches.length;
      issues.push(`Fixed ${brokenImportMatches.length} broken import statements`);
    }

    // Fix class extensions that got broken (_BaseClass)
    const brokenClassPattern = /extends\s+_([A-Z][a-zA-Z0-9]*)/g;
    const brokenClassMatches = newContent.match(brokenClassPattern);
    if (brokenClassMatches) {
      newContent = newContent.replace(brokenClassPattern, 'extends $1');
      fixes += brokenClassMatches.length;
      issues.push(`Fixed ${brokenClassMatches.length} broken class extensions`);
    }

    // Fix Function type to specific function signature
    const functionTypePattern = /\bFunction\b/g;
    const functionTypeMatches = newContent.match(functionTypePattern);
    if (functionTypeMatches) {
      newContent = newContent.replace(functionTypePattern, '(...args: any[]) => any');
      fixes += functionTypeMatches.length;
      issues.push(`Fixed ${functionTypeMatches.length} Function type usages`);
    }

    // Fix require statements to imports
    const requirePattern = /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    const requireMatches = newContent.match(requirePattern);
    if (requireMatches) {
      newContent = newContent.replace(requirePattern, 'import $1 from "$2"');
      fixes += requireMatches.length;
      issues.push(`Fixed ${requireMatches.length} require statements`);
    }

    if (newContent !== content) {
      await Deno.writeTextFile(filePath, newContent);
    }

    return { file: filePath, fixes, issues };
  }

  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const srcDir = join(Deno.cwd(), 'src');
    
    for await (const entry of walk(srcDir, { 
      exts: ['.ts', '.js'],
      skip: [/node_modules/, /\.git/, /dist/, /build/]
    })) {
      if (entry.isFile) {
        files.push(entry.path);
      }
    }
    
    return files;
  }

  private printSummary() {
    console.log('\n📊 Summary:');
    console.log(`  Files processed: ${this.fixedFiles}`);
    console.log(`  Total fixes: ${this.totalFixes}`);
    
    if (this.results.length > 0) {
      console.log('\n🔧 Issue types fixed:');
      const issueTypes = new Map<string, number>();
      for (const result of this.results) {
        for (const issue of result.issues) {
          const key = issue.split(' ')[1]; // Extract issue type
          issueTypes.set(key, (issueTypes.get(key) || 0) + 1);
        }
      }
      
      for (const [type, count] of issueTypes.entries()) {
        console.log(`  ${type}: ${count} fixes`);
      }
    }
    
    console.log('\n✅ Critical parsing error fixes complete!');
    console.log('Run "npm run lint" to check for remaining issues.');
  }
}

// Run the fixer
if (import.meta.main) {
  const fixer = new ParsingErrorFixer();
  await fixer.run();
}