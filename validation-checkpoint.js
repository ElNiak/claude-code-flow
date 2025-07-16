#!/usr/bin/env node

/**
 * Build Validation Specialist - Quick Checkpoint Validator
 * Fast validation for monitoring fix progress
 */

import { execSync } from 'child_process';

class ValidationCheckpoint {
  /**
   * Quick error count check
   */
  static quickValidation() {
    console.log('⚡ Quick Validation Checkpoint...');
    
    try {
      // Quick TypeScript error count
      const tscResult = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8' });
      console.log('✅ TypeScript: No errors detected');
      return { tsErrors: 0, status: 'CLEAN' };
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errorLines = output.split('\n').filter(line => line.includes('error TS'));
      console.log(`📊 TypeScript: ${errorLines.length} errors found`);
      
      // Show top 3 error types for quick focus
      const errorCodes = {};
      errorLines.forEach(line => {
        const match = line.match(/error (TS\d+):/);
        if (match) {
          errorCodes[match[1]] = (errorCodes[match[1]] || 0) + 1;
        }
      });
      
      const topErrors = Object.entries(errorCodes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      console.log('🎯 Top Error Types:');
      topErrors.forEach(([code, count]) => {
        console.log(`   ${code}: ${count} occurrences`);
      });
      
      return { tsErrors: errorLines.length, status: 'ERRORS_PRESENT', errorCodes };
    }
  }

  /**
   * Specific file validation
   */
  static validateFile(filePath) {
    console.log(`🔍 Validating specific file: ${filePath}`);
    
    try {
      const result = execSync(`npx tsc --noEmit ${filePath} 2>&1`, { encoding: 'utf8' });
      console.log(`✅ ${filePath}: Clean`);
      return { fileErrors: 0, status: 'CLEAN' };
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errorLines = output.split('\n').filter(line => line.includes('error TS'));
      console.log(`❌ ${filePath}: ${errorLines.length} errors`);
      
      // Show errors for this file
      errorLines.slice(0, 3).forEach(line => {
        console.log(`   ${line.trim()}`);
      });
      
      return { fileErrors: errorLines.length, status: 'ERRORS_PRESENT' };
    }
  }

  /**
   * Progress comparison
   */
  static compareProgress(previousCount, currentCount) {
    const diff = previousCount - currentCount;
    
    if (diff > 0) {
      console.log(`✅ PROGRESS: ${diff} error(s) fixed! (${previousCount} → ${currentCount})`);
      return 'IMPROVED';
    } else if (diff < 0) {
      console.log(`❌ REGRESSION: ${Math.abs(diff)} new error(s)! (${previousCount} → ${currentCount})`);
      return 'REGRESSED';
    } else {
      console.log(`⏸️  NO CHANGE: ${currentCount} errors remain`);
      return 'UNCHANGED';
    }
  }

  /**
   * Critical files validation
   */
  static validateCriticalFiles() {
    const criticalFiles = [
      'src/coordination/load-balancer.ts',
      'src/coordination/hive-protocol.ts', 
      'src/coordination/swarm-coordinator.ts',
      'src/config/preset-templates.ts',
      'src/mcp/index.ts',
      'src/mcp/server.ts',
      'src/hive-mind/integration/MCPToolWrapper.ts',
      'src/hive-mind/core/DatabaseManager.ts',
      'src/integration/system-integration.ts'
    ];
    
    console.log('🎯 Validating Critical Files...');
    
    const results = {};
    let totalErrors = 0;
    
    criticalFiles.forEach(file => {
      const result = this.validateFile(file);
      results[file] = result;
      totalErrors += result.fileErrors;
    });
    
    console.log(`\n📊 Critical Files Summary: ${totalErrors} total errors across ${criticalFiles.length} files`);
    
    return results;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'quick':
      ValidationCheckpoint.quickValidation();
      break;
    
    case 'file':
      if (!arg) {
        console.log('Usage: node validation-checkpoint.js file <path>');
        process.exit(1);
      }
      ValidationCheckpoint.validateFile(arg);
      break;
    
    case 'critical':
      ValidationCheckpoint.validateCriticalFiles();
      break;
    
    case 'compare':
      const prev = parseInt(process.argv[3]);
      const curr = parseInt(process.argv[4]);
      if (isNaN(prev) || isNaN(curr)) {
        console.log('Usage: node validation-checkpoint.js compare <previousCount> <currentCount>');
        process.exit(1);
      }
      ValidationCheckpoint.compareProgress(prev, curr);
      break;
    
    default:
      console.log('Build Validation Specialist - Quick Checkpoint');
      console.log('Usage:');
      console.log('  node validation-checkpoint.js quick        # Quick error count');
      console.log('  node validation-checkpoint.js file <path>  # Validate specific file');
      console.log('  node validation-checkpoint.js critical     # Validate critical files');
      console.log('  node validation-checkpoint.js compare <prev> <curr>  # Compare progress');
  }
}

export default ValidationCheckpoint;