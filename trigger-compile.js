#!/usr/bin/env node

/**
 * Trigger TypeScript compilation by updating file timestamps
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Triggering TypeScript compilation...');

// Touch the TypeScript file to trigger recompilation
const tsFile = path.join(__dirname, 'src', 'unified', 'work', 'tmux-manager.ts');

try {
  // Update the timestamp to trigger recompilation
  const now = new Date();
  fs.utimesSync(tsFile, now, now);
  console.log('✅ Updated tmux-manager.ts timestamp');
  
  // Also touch the types file since it was referenced
  const typesFile = path.join(__dirname, 'src', 'unified', 'work', 'types.ts');
  fs.utimesSync(typesFile, now, now);
  console.log('✅ Updated types.ts timestamp');
  
  // Touch the work command file
  const workFile = path.join(__dirname, 'src', 'cli', 'commands', 'work.ts');
  fs.utimesSync(workFile, now, now);
  console.log('✅ Updated work.ts timestamp');
  
  console.log('');
  console.log('🎯 Files touched to trigger compilation.');
  console.log('💡 If you have a TypeScript watcher running, it should recompile automatically.');
  console.log('💡 Otherwise, you may need to manually run: npx tsc');
  console.log('');
  console.log('🧪 Once compiled, test with:');
  console.log('   npx claude-flow work "test tmux integration" --tmux --debug');
  
} catch (error) {
  console.error('❌ Error updating timestamps:', error.message);
  process.exit(1);
}