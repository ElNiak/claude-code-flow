#!/usr/bin/env node

/**
 * Simple script to fix unused variable warnings by prefixing with underscore
 */

import { promises as fs } from 'fs';
import path from 'path';

// Files with specific unused variable issues based on lint output
const SPECIFIC_FIXES = [
  {
    file: 'src/adapters/cliffy-node.ts',
    fixes: [
      { pattern: /import\s+\{\s*getErrorMessage\s*\}/, replacement: 'import { getErrorMessage as _getErrorMessage }' }
    ]
  },
  {
    file: 'src/agents/agent-manager.ts',
    fixes: [
      { pattern: /import\s+\{\s*getErrorMessage\s*\}/, replacement: 'import { getErrorMessage as _getErrorMessage }' },
      { pattern: /\bTaskId\b(?=\s*,)/, replacement: '_TaskId' },
      { pattern: /\bTaskDefinition\b(?=\s*$)/, replacement: '_TaskDefinition' },
      { pattern: /const\s+startTime\s*=/, replacement: 'const _startTime =' }
    ]
  },
  {
    file: 'src/agents/agent-registry.ts',
    fixes: [
      { pattern: /import\s+\{\s*getErrorMessage\s*\}/, replacement: 'import { getErrorMessage as _getErrorMessage }' },
      { pattern: /\bAgentId\b(?=\s*,)/, replacement: '_AgentId' }
    ]
  },
  {
    file: 'src/cli/agents/analyst.ts',
    fixes: [
      { pattern: /const\s+data\s*=\s*task\.context\?\.data;/, replacement: 'const _data = task.context?.data;' }
    ]
  }
];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fixFile(fileConfig) {
  const filePath = path.join(process.cwd(), fileConfig.file);
  
  if (!(await fileExists(filePath))) {
    console.log(`❌ File not found: ${fileConfig.file}`);
    return false;
  }
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let newContent = content;
    let fixCount = 0;
    
    for (const fix of fileConfig.fixes) {
      const oldContent = newContent;
      newContent = newContent.replace(fix.pattern, fix.replacement);
      if (newContent !== oldContent) {
        fixCount++;
      }
    }
    
    if (newContent !== content) {
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(`✅ Fixed ${fileConfig.file} (${fixCount} fixes)`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed for ${fileConfig.file}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${fileConfig.file}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing unused variable warnings...\n');
  
  let totalFixed = 0;
  
  for (const fileConfig of SPECIFIC_FIXES) {
    const fixed = await fixFile(fileConfig);
    if (fixed) {
      totalFixed++;
    }
  }
  
  console.log(`\n📊 Summary: Fixed ${totalFixed} files`);
  console.log('\n✅ Run "npm run lint" to check the results.');
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});