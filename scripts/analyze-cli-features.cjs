#!/usr/bin/env node
/**
 * CLI Feature Analysis Script
 * Automatically analyzes CLI implementations to extract features, commands, and capabilities
 */

const fs = require('fs');
const path = require('path');

// CLI files to analyze
const CLI_FILES = [
  'src/cli/simple-cli.ts',
  'src/cli/cli-core.ts',
  'src/cli/main.ts',
  'src/cli/index.ts',
  'src/cli/index-remote.ts',
  'src/cli/formatter.ts',
  'src/cli/node-repl.ts',
  'src/cli/repl.ts',
  'src/cli/simple-mcp.ts',
  'src/cli/simple-orchestrator.ts',
  'src/cli/completion.ts'
];

/**
 * Extract features from a CLI file
 */
function analyzeCliFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  const features = {
    fileName,
    filePath,
    lineCount: content.split('\n').length,
    imports: extractImports(content),
    exports: extractExports(content),
    commands: extractCommands(content),
    functions: extractFunctions(content),
    classes: extractClasses(content),
    interfaces: extractInterfaces(content),
    types: extractTypes(content),
    constants: extractConstants(content),
    configuration: extractConfiguration(content),
    dependencies: extractDependencies(content)
  };

  return features;
}

/**
 * Extract import statements
 */
function extractImports(content) {
  const importRegex = /import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      source: match[1],
      statement: match[0]
    });
  }

  return imports;
}

/**
 * Extract export statements
 */
function extractExports(content) {
  const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
  const exports = [];
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

/**
 * Extract command definitions
 */
function extractCommands(content) {
  const commands = [];

  // Pattern 1: Command objects with name and description
  const cmdPattern1 = /(?:command|cmd)\s*:\s*['"]([^'"]+)['"]\s*,\s*description\s*:\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = cmdPattern1.exec(content)) !== null) {
    commands.push({
      name: match[1],
      description: match[2]
    });
  }

  // Pattern 2: registerCommand function calls
  const cmdPattern2 = /registerCommand\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;

  while ((match = cmdPattern2.exec(content)) !== null) {
    commands.push({
      name: match[1],
      description: match[2]
    });
  }

  // Pattern 3: Commander-style commands
  const cmdPattern3 = /\.command\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\.description\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  while ((match = cmdPattern3.exec(content)) !== null) {
    commands.push({
      name: match[1],
      description: match[2]
    });
  }

  return commands;
}

/**
 * Extract function definitions
 */
function extractFunctions(content) {
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
  const functions = [];
  let match;

  while ((match = functionRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  // Also extract arrow functions assigned to constants
  const arrowFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;

  while ((match = arrowFunctionRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  return functions;
}

/**
 * Extract class definitions
 */
function extractClasses(content) {
  const classRegex = /(?:export\s+)?class\s+(\w+)/g;
  const classes = [];
  let match;

  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  return classes;
}

/**
 * Extract interface definitions
 */
function extractInterfaces(content) {
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
  const interfaces = [];
  let match;

  while ((match = interfaceRegex.exec(content)) !== null) {
    interfaces.push(match[1]);
  }

  return interfaces;
}

/**
 * Extract type definitions
 */
function extractTypes(content) {
  const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=/g;
  const types = [];
  let match;

  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1]);
  }

  return types;
}

/**
 * Extract constants
 */
function extractConstants(content) {
  const constantRegex = /(?:export\s+)?const\s+([A-Z_]+)\s*=/g;
  const constants = [];
  let match;

  while ((match = constantRegex.exec(content)) !== null) {
    constants.push(match[1]);
  }

  return constants;
}

/**
 * Extract configuration patterns
 */
function extractConfiguration(content) {
  const config = {
    hasArgParsing: /process\.argv|parseArgs|yargs|commander/.test(content),
    hasEnvVars: /process\.env/.test(content),
    hasConfigFile: /readConfig|loadConfig|config\.json/.test(content),
    hasVersionInfo: /version|VERSION/.test(content),
    hasHelpText: /help|--help|-h/.test(content)
  };

  return config;
}

/**
 * Extract dependencies
 */
function extractDependencies(content) {
  const deps = {
    internal: [],
    external: []
  };

  const importRegex = /import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const source = match[1];
    if (source.startsWith('.') || source.startsWith('@/') || source.startsWith('~/')) {
      deps.internal.push(source);
    } else {
      deps.external.push(source);
    }
  }

  return deps;
}

/**
 * Generate feature inventory
 */
function generateInventory() {
  const inventory = {
    timestamp: new Date().toISOString(),
    totalFiles: CLI_FILES.length,
    files: {}
  };

  let totalLines = 0;
  let totalCommands = 0;
  let totalFunctions = 0;

  CLI_FILES.forEach(filePath => {
    const analysis = analyzeCliFile(filePath);
    if (analysis) {
      inventory.files[filePath] = analysis;
      totalLines += analysis.lineCount;
      totalCommands += analysis.commands.length;
      totalFunctions += analysis.functions.length;
    }
  });

  inventory.summary = {
    totalLines,
    totalCommands,
    totalFunctions,
    averageLinesPerFile: Math.round(totalLines / CLI_FILES.length)
  };

  return inventory;
}

/**
 * Generate feature matrix
 */
function generateFeatureMatrix(inventory) {
  const matrix = {
    commands: {},
    functions: {},
    interfaces: {},
    dependencies: {}
  };

  // Build command matrix
  Object.entries(inventory.files).forEach(([filePath, analysis]) => {
    analysis.commands.forEach(cmd => {
      if (!matrix.commands[cmd.name]) {
        matrix.commands[cmd.name] = [];
      }
      matrix.commands[cmd.name].push(filePath);
    });
  });

  // Build function matrix
  Object.entries(inventory.files).forEach(([filePath, analysis]) => {
    analysis.functions.forEach(func => {
      if (!matrix.functions[func]) {
        matrix.functions[func] = [];
      }
      matrix.functions[func].push(filePath);
    });
  });

  return matrix;
}

// Main execution
if (require.main === module) {
  console.log('🔍 Analyzing CLI features...\n');

  const inventory = generateInventory();
  const matrix = generateFeatureMatrix(inventory);

  // Save inventory
  fs.writeFileSync(
    'CLI_FEATURE_INVENTORY.json',
    JSON.stringify(inventory, null, 2)
  );

  // Save matrix
  fs.writeFileSync(
    'CLI_FEATURE_MATRIX.json',
    JSON.stringify(matrix, null, 2)
  );

  // Print summary
  console.log('📊 CLI Feature Analysis Summary:');
  console.log(`   Total Files: ${inventory.totalFiles}`);
  console.log(`   Total Lines: ${inventory.summary.totalLines}`);
  console.log(`   Total Commands: ${inventory.summary.totalCommands}`);
  console.log(`   Total Functions: ${inventory.summary.totalFunctions}`);
  console.log(`   Average Lines/File: ${inventory.summary.averageLinesPerFile}`);
  console.log('\n✅ Analysis complete!');
  console.log('   - CLI_FEATURE_INVENTORY.json created');
  console.log('   - CLI_FEATURE_MATRIX.json created');
}

module.exports = {
  analyzeCliFile,
  generateInventory,
  generateFeatureMatrix
};
