#!/usr/bin/env node

/**
 * Script to fix unused variable warnings by prefixing them with underscores
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UnusedVariable {
  file: string;
  line: number;
  column: number;
  variable: string;
  type: 'variable' | 'import' | 'argument' | 'destructured';
}

function getLintOutput(): string {
  try {
    const result = execSync('npm run lint 2>&1', { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    return result;
  } catch (error: any) {
    return error.stdout || error.stderr || '';
  }
}

function parseUnusedVariables(lintOutput: string): UnusedVariable[] {
  const lines = lintOutput.split('\n');
  const unusedVars: UnusedVariable[] = [];
  
  for (const line of lines) {
    // Match ESLint unused variable warnings
    const match = line.match(/^(.+?):(\d+):(\d+)\s+warning\s+'([^']+)' is (?:defined but never used|assigned a value but never used|never reassigned)/);
    if (match) {
      const [, file, lineStr, columnStr, variable] = match;
      
      // Skip if already prefixed with underscore
      if (variable.startsWith('_')) {
        continue;
      }
      
      // Determine type
      let type: 'variable' | 'import' | 'argument' | 'destructured' = 'variable';
      if (line.includes('import')) {
        type = 'import';
      } else if (line.includes('args') || line.includes('params')) {
        type = 'argument';
      } else if (line.includes('destructured')) {
        type = 'destructured';
      }
      
      unusedVars.push({
        file: file.trim(),
        line: parseInt(lineStr),
        column: parseInt(columnStr),
        variable: variable.trim(),
        type
      });
    }
  }
  
  return unusedVars;
}

function fixUnusedVariables(unusedVars: UnusedVariable[]): void {
  // Group by file
  const fileGroups = new Map<string, UnusedVariable[]>();
  for (const uv of unusedVars) {
    if (!fileGroups.has(uv.file)) {
      fileGroups.set(uv.file, []);
    }
    fileGroups.get(uv.file)!.push(uv);
  }
  
  // Process each file
  for (const [fileName, variables] of fileGroups) {
    const fullPath = path.resolve(fileName);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    // Sort by line number (descending) to avoid offset issues
    const sortedVars = variables.sort((a, b) => b.line - a.line);
    
    for (const uv of sortedVars) {
      const lineIndex = uv.line - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) {
        continue;
      }
      
      const line = lines[lineIndex];
      const prefixedVar = `_${uv.variable}`;
      
      // Fix common patterns
      const patterns = [
        // Import statements
        { from: `import { ${uv.variable}`, to: `import { ${uv.variable} as ${prefixedVar}` },
        { from: `import ${uv.variable}`, to: `import ${prefixedVar}` },
        
        // Variable declarations
        { from: `const ${uv.variable} =`, to: `const ${prefixedVar} =` },
        { from: `let ${uv.variable} =`, to: `let ${prefixedVar} =` },
        { from: `var ${uv.variable} =`, to: `var ${prefixedVar} =` },
        
        // Function parameters
        { from: `${uv.variable}:`, to: `${prefixedVar}:` },
        { from: `${uv.variable},`, to: `${prefixedVar},` },
        { from: `${uv.variable})`, to: `${prefixedVar})` },
        
        // Destructuring
        { from: `{ ${uv.variable}`, to: `{ ${uv.variable}: ${prefixedVar}` },
        { from: `${uv.variable} }`, to: `${uv.variable}: ${prefixedVar} }` },
        
        // Arrow function parameters
        { from: `(${uv.variable})`, to: `(${prefixedVar})` },
        { from: `${uv.variable} =>`, to: `${prefixedVar} =>` },
      ];
      
      // Apply the first matching pattern
      let patternApplied = false;
      for (const pattern of patterns) {
        if (line.includes(pattern.from)) {
          lines[lineIndex] = line.replace(pattern.from, pattern.to);
          patternApplied = true;
          break;
        }
      }
      
      // If no pattern matched, try a simple replacement
      if (!patternApplied) {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${uv.variable}\\b`, 'g');
        lines[lineIndex] = line.replace(regex, prefixedVar);
      }
    }
    
    // Write back to file
    const newContent = lines.join('\n');
    if (newContent !== content) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`Fixed ${variables.length} unused variables in: ${path.relative(process.cwd(), fullPath)}`);
    }
  }
}

// Main execution
console.log('Analyzing unused variables...');
const lintOutput = getLintOutput();
const unusedVars = parseUnusedVariables(lintOutput);

if (unusedVars.length === 0) {
  console.log('No unused variables found!');
} else {
  console.log(`Found ${unusedVars.length} unused variables`);
  
  // Show summary
  const fileCount = new Set(unusedVars.map(uv => uv.file)).size;
  console.log(`Across ${fileCount} files`);
  
  // Fix them
  fixUnusedVariables(unusedVars);
  
  console.log('\nUnused variable fixes completed!');
  console.log('Run npm run lint again to verify fixes.');
}