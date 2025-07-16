#!/usr/bin/env tsx
/**
 * Automated Debug Logging Injection Script
 * Adds debug logging to all CLI functions
 */

import { promises as fs } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FileInfo {
  path: string;
  content: string;
  functions: FunctionInfo[];
}

interface FunctionInfo {
  name: string;
  isAsync: boolean;
  isArrow: boolean;
  startIndex: number;
  endIndex: number;
  params: string[];
}

class DebugLoggingInjector {
  private processedFiles = new Set<string>();
  private targetDirectories = [
    'src/cli',
    'src/cli/commands',
    'src/cli/simple-commands',
    'src/cli/agents',
  ];

  async run(): Promise<void> {
    console.log('🔍 Starting debug logging injection...');
    
    const rootDir = join(__dirname, '..');
    
    for (const dir of this.targetDirectories) {
      const fullPath = join(rootDir, dir);
      await this.processDirectory(fullPath);
    }
    
    console.log(`✅ Debug logging injection complete! Processed ${this.processedFiles.size} files.`);
  }

  private async processDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.processDirectory(fullPath);
        } else if (entry.isFile() && this.isTargetFile(entry.name)) {
          await this.processFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not process directory ${dirPath}:`, error);
    }
  }

  private isTargetFile(filename: string): boolean {
    const ext = extname(filename);
    return (ext === '.ts' || ext === '.js') && 
           !filename.includes('.test.') && 
           !filename.includes('.spec.');
  }

  private async processFile(filePath: string): Promise<void> {
    if (this.processedFiles.has(filePath)) {
      return;
    }

    console.log(`📝 Processing: ${filePath}`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileInfo: FileInfo = {
        path: filePath,
        content,
        functions: this.extractFunctions(content),
      };

      const modifiedContent = this.injectDebugLogging(fileInfo);
      
      if (modifiedContent !== content) {
        await fs.writeFile(filePath, modifiedContent);
        console.log(`✅ Updated: ${filePath} (${fileInfo.functions.length} functions)`);
      } else {
        console.log(`⏭️ Skipped: ${filePath} (no changes needed)`);
      }
      
      this.processedFiles.add(filePath);
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  private extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    // Regular expressions for different function types
    const patterns = [
      // Regular functions: function name() {}
      /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      // Arrow functions: const name = () => {}
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>\s*\{/g,
      // Class methods: methodName() {}
      /(\w+)\s*\(([^)]*)\)\s*\{/g,
      // Async functions: async function name() {}
      /async\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      // Async arrow functions: const name = async () => {}
      /(?:const|let|var)\s+(\w+)\s*=\s*async\s*\(([^)]*)\)\s*=>\s*\{/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        const params = match[2] ? match[2].split(',').map(p => p.trim()) : [];
        
        // Skip certain patterns
        if (this.shouldSkipFunction(name, content, match.index)) {
          continue;
        }

        functions.push({
          name,
          isAsync: match[0].includes('async'),
          isArrow: match[0].includes('=>'),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          params,
        });
      }
    }

    return functions;
  }

  private shouldSkipFunction(name: string, content: string, index: number): boolean {
    // Skip if already has debug logging
    if (content.includes('debugLogger.logFunctionEntry') || 
        content.includes('traceFunction') ||
        content.includes('withDebugLogging')) {
      return true;
    }

    // Skip common patterns
    const skipPatterns = [
      'toString',
      'valueOf',
      'constructor',
      'hasOwnProperty',
      'get',
      'set',
    ];

    return skipPatterns.some(pattern => name.includes(pattern));
  }

  private injectDebugLogging(fileInfo: FileInfo): string {
    let content = fileInfo.content;
    
    // Add import statement if not present
    if (!content.includes('debugLogger') && !content.includes('debug-logger')) {
      const importStatement = `import { debugLogger } from '../utils/debug-logger.js';\n`;
      content = this.addImportStatement(content, importStatement);
    }

    // Process functions in reverse order to maintain indices
    const sortedFunctions = fileInfo.functions.sort((a, b) => b.startIndex - a.startIndex);
    
    for (const func of sortedFunctions) {
      content = this.injectFunctionLogging(content, func, fileInfo.path);
    }

    return content;
  }

  private addImportStatement(content: string, importStatement: string): string {
    // Find the last import statement
    const importRegex = /import\s+.*?from\s+['"].*?['"];?\s*\n/g;
    let lastImportIndex = -1;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }

    if (lastImportIndex !== -1) {
      // Insert after the last import
      return content.slice(0, lastImportIndex) + importStatement + content.slice(lastImportIndex);
    } else {
      // Add at the beginning
      return importStatement + '\n' + content;
    }
  }

  private injectFunctionLogging(content: string, func: FunctionInfo, filePath: string): string {
    const moduleName = this.getModuleName(filePath);
    const functionName = func.name;
    
    // Find the opening brace
    const beforeBrace = content.substring(0, func.endIndex);
    const afterBrace = content.substring(func.endIndex);
    
    // Create the logging code
    const argsArray = func.params.length > 0 ? `[${func.params.map(p => p.split(':')[0].trim()).join(', ')}]` : '[]';
    
    const entryLog = `\n  const callId = debugLogger.logFunctionEntry('${moduleName}', '${functionName}', ${argsArray});`;
    
    let wrappedContent: string;
    if (func.isAsync) {
      wrappedContent = `${entryLog}
  try {
    const result = await (async () => {`;
    } else {
      wrappedContent = `${entryLog}
  try {
    const result = (() => {`;
    }

    // Find the function body end
    const bodyStart = func.endIndex;
    const bodyEnd = this.findFunctionBodyEnd(content, bodyStart);
    
    if (bodyEnd === -1) {
      return content; // Could not find function end
    }

    const functionBody = content.substring(bodyStart + 1, bodyEnd);
    const exitLog = `
    })();
    debugLogger.logFunctionExit(callId, '${moduleName}', '${functionName}', result);
    return result;
  } catch (error) {
    debugLogger.logFunctionError(callId, '${moduleName}', '${functionName}', error as Error);
    throw error;
  }`;

    return beforeBrace + '{' + wrappedContent + functionBody + exitLog + '\n}' + content.substring(bodyEnd + 1);
  }

  private findFunctionBodyEnd(content: string, startIndex: number): number {
    let braceCount = 1;
    let i = startIndex + 1;

    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') {
        braceCount++;
      } else if (content[i] === '}') {
        braceCount--;
      }
      i++;
    }

    return braceCount === 0 ? i - 1 : -1;
  }

  private getModuleName(filePath: string): string {
    const parts = filePath.split('/');
    const filename = basename(filePath, extname(filePath));
    
    // Find the relevant part of the path
    const cliIndex = parts.findIndex(part => part === 'cli');
    if (cliIndex !== -1 && cliIndex < parts.length - 1) {
      const pathParts = parts.slice(cliIndex + 1);
      pathParts[pathParts.length - 1] = filename;
      return pathParts.join('/');
    }
    
    return filename;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const injector = new DebugLoggingInjector();
  injector.run().catch(console.error);
}