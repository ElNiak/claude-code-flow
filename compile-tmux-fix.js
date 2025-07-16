#!/usr/bin/env node

/**
 * Simple compilation script to rebuild TypeScript files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Compiling TypeScript files for tmux fix...');

try {
  // Check if TypeScript compiler is available
  try {
    execSync('which tsc', { stdio: 'pipe' });
    console.log('✅ TypeScript compiler found');
  } catch (error) {
    console.error('❌ TypeScript compiler not found. Please install: npm install -g typescript');
    process.exit(1);
  }

  // Run TypeScript compilation
  console.log('🔨 Running TypeScript compilation...');
  const result = execSync('npx tsc', { 
    encoding: 'utf8',
    cwd: __dirname
  });
  
  console.log('✅ TypeScript compilation completed successfully');
  
  // Check if the compiled tmux-manager.js exists
  const compiledFile = path.join(__dirname, 'dist', 'unified', 'work', 'tmux-manager.js');
  if (fs.existsSync(compiledFile)) {
    console.log('✅ Compiled tmux-manager.js found');
    
    // Read a snippet to verify the retry logic is compiled
    const compiledContent = fs.readFileSync(compiledFile, 'utf8');
    if (compiledContent.includes('maxAttempts')) {
      console.log('✅ Retry logic successfully compiled');
    } else {
      console.log('⚠️  Retry logic may not be compiled properly');
    }
  } else {
    console.log('❌ Compiled tmux-manager.js not found');
  }
  
  console.log('\n🎉 Compilation complete! You can now test the tmux integration:');
  console.log('   npx claude-flow work "test tmux integration" --tmux --debug');
  
} catch (error) {
  console.error('❌ Compilation failed:', error.message);
  process.exit(1);
}