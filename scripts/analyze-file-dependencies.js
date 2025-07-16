#!/usr/bin/env node
/**
 * File Dependency Analysis Tool
 * Analyzes file references before moving/deleting to prevent broken links
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// Configuration
const CONFIG = {
  extensions: ['.md', '.json', '.ts', '.js', '.txt'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage'],
  patterns: [
    // Import/require patterns
    /require\(['"]([^'"]+)['"]\)/g,
    /import.*from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    
    // File references in markdown
    /\[([^\]]*)\]\(([^)]+)\)/g,
    /\]\(([^)]+\.(?:md|json|ts|js|txt))\)/g,
    
    // Direct file references
    /\.\/([^'\s"]+\.(?:md|json|ts|js|txt))/g,
    /\.\.\/([^'\s"]+\.(?:md|json|ts|js|txt))/g,
    
    // Path references
    /\/([^'\s"]+\.(?:md|json|ts|js|txt))/g,
    
    // Script references
    /node\s+([^'\s"]+\.(?:js|ts))/g,
    /tsx\s+([^'\s"]+\.(?:js|ts))/g,
    /npx\s+([^'\s"]+\.(?:js|ts))/g,
  ]
};

/**
 * Analyze file dependencies
 */
function analyzeFileDependencies(filePath) {
  if (!fs.existsSync(filePath)) {
    return { error: `File not found: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const references = new Set();
  const referencedBy = [];

  // Find all references in the file
  CONFIG.patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1] || match[2];
      if (ref && !ref.startsWith('http') && !ref.startsWith('#')) {
        references.add(ref);
      }
    }
  });

  // Find files that reference this file
  const baseDir = process.cwd();
  const targetFile = path.basename(filePath);
  const relativePath = path.relative(baseDir, filePath);

  findReferencesToFile(baseDir, targetFile, relativePath, referencedBy);

  return {
    file: filePath,
    references: Array.from(references),
    referencedBy: referencedBy,
    referenceCount: references.size,
    referencedByCount: referencedBy.length
  };
}

/**
 * Find files that reference the target file
 */
function findReferencesToFile(dir, targetFile, relativePath, referencedBy) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      if (!CONFIG.excludeDirs.includes(file.name)) {
        findReferencesToFile(fullPath, targetFile, relativePath, referencedBy);
      }
    } else if (CONFIG.extensions.some(ext => file.name.endsWith(ext))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check if this file references the target
        const patterns = [
          new RegExp(targetFile.replace(/\./g, '\\.'), 'g'),
          new RegExp(relativePath.replace(/\./g, '\\.'), 'g'),
          new RegExp(relativePath.replace(/\\/g, '/'), 'g')
        ];

        let hasReference = false;
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            hasReference = true;
          }
        });

        if (hasReference) {
          referencedBy.push({
            file: fullPath,
            relativePath: path.relative(process.cwd(), fullPath)
          });
        }
      } catch (err) {
        // Skip files that can't be read
      }
    }
  });
}

/**
 * Safety check for file operations
 */
function safetyCheck(filePath) {
  const analysis = analyzeFileDependencies(filePath);
  
  if (analysis.error) {
    console.error(`❌ Error: ${analysis.error}`);
    return false;
  }

  console.log(`🔍 Analyzing dependencies for: ${filePath}`);
  console.log(`📊 References found: ${analysis.referenceCount}`);
  console.log(`📊 Referenced by: ${analysis.referencedByCount} files`);
  
  if (analysis.references.length > 0) {
    console.log(`\\n📄 Files referenced by ${path.basename(filePath)}:`);
    analysis.references.forEach(ref => {
      console.log(`  - ${ref}`);
    });
  }
  
  if (analysis.referencedBy.length > 0) {
    console.log(`\\n📄 Files that reference ${path.basename(filePath)}:`);
    analysis.referencedBy.forEach(ref => {
      console.log(`  - ${ref.relativePath}`);
    });
  }

  // Return true if safe to move (no references or only self-references)
  const isSafe = analysis.referencedByCount === 0 || 
                 analysis.referencedBy.every(ref => ref.file === filePath);
  
  if (isSafe) {
    console.log(`\\n✅ Safe to move: ${filePath}`);
  } else {
    console.log(`\\n⚠️  Warning: ${filePath} has ${analysis.referencedByCount} references`);
    console.log(`   Consider updating references before moving`);
  }
  
  return isSafe;
}

/**
 * Batch analysis for multiple files
 */
function batchAnalysis(files) {
  const results = [];
  
  files.forEach(file => {
    const analysis = analyzeFileDependencies(file);
    results.push(analysis);
  });
  
  return results;
}

/**
 * Generate dependency report
 */
function generateDependencyReport(analysisResults) {
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: analysisResults.length,
    safeToMove: 0,
    requiresUpdate: 0,
    details: []
  };

  analysisResults.forEach(result => {
    if (result.error) {
      report.details.push({
        file: result.file,
        status: 'error',
        error: result.error
      });
      return;
    }

    const isSafe = result.referencedByCount === 0 || 
                   result.referencedBy.every(ref => ref.file === result.file);
    
    if (isSafe) {
      report.safeToMove++;
    } else {
      report.requiresUpdate++;
    }

    report.details.push({
      file: result.file,
      status: isSafe ? 'safe' : 'requires_update',
      referenceCount: result.referenceCount,
      referencedByCount: result.referencedByCount,
      references: result.references,
      referencedBy: result.referencedBy
    });
  });

  return report;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node analyze-file-dependencies.js <file1> [file2] [file3] ...');
    console.log('       node analyze-file-dependencies.js --batch <pattern>');
    console.log('       node analyze-file-dependencies.js --report <output-file>');
    process.exit(1);
  }

  if (args[0] === '--batch') {
    const pattern = args[1] || '*.md';
    const glob = require('glob');
    const files = glob.sync(pattern);
    
    console.log(`🔍 Analyzing ${files.length} files matching pattern: ${pattern}`);
    
    const results = batchAnalysis(files);
    const report = generateDependencyReport(results);
    
    console.log(`\\n📊 Batch Analysis Report:`);
    console.log(`   Total files: ${report.totalFiles}`);
    console.log(`   Safe to move: ${report.safeToMove}`);
    console.log(`   Requires update: ${report.requiresUpdate}`);
    
    if (args[2] === '--output') {
      const outputFile = args[3] || 'dependency-analysis-report.json';
      fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
      console.log(`\\n📄 Report saved to: ${outputFile}`);
    }
  } else if (args[0] === '--report') {
    const outputFile = args[1] || 'dependency-analysis-report.json';
    const files = fs.readdirSync('.').filter(f => f.endsWith('.md'));
    
    const results = batchAnalysis(files);
    const report = generateDependencyReport(results);
    
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`📄 Dependency report generated: ${outputFile}`);
  } else {
    // Individual file analysis
    args.forEach(file => {
      console.log(`\\n${'='.repeat(60)}`);
      safetyCheck(file);
    });
  }
}

module.exports = { 
  analyzeFileDependencies, 
  safetyCheck, 
  batchAnalysis, 
  generateDependencyReport 
};