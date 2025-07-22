#!/usr/bin/env node
/**
 * Capture Baseline Features
 * Records current CLI functionality before merger
 */

import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test configurations for different CLI entry points
const CLI_CONFIGURATIONS = [
  {
    name: 'bin-claude-flow',
    path: './bin/claude-flow',
    type: 'production'
  },
  {
    name: 'simple-cli',
    path: 'node ./dist/cli/simple-cli.js',
    type: 'direct'
  },
  {
    name: 'index',
    path: 'node ./dist/index.js',
    type: 'legacy'
  }
];

// Quick feature tests
const QUICK_TESTS = {
  help: {
    command: '--help',
    validate: (output) => output.includes('Usage:') || output.includes('Commands:')
  },
  version: {
    command: '--version',
    validate: (output) => /\d+\.\d+\.\d+/.test(output)
  },
  init: {
    command: '--init',
    validate: (output) => output.includes('claude-flow.config.js') || output.includes('Initializing')
  },
  mcp: {
    command: 'mcp list-tools',
    validate: (output) => output.includes('Available tools') || output.includes('swarm_init')
  },
  swarm: {
    command: 'swarm --help',
    validate: (output) => output.includes('swarm') || output.includes('init')
  },
  task: {
    command: 'task --help',
    validate: (output) => output.includes('task') || output.includes('create')
  },
  memory: {
    command: 'memory --help',
    validate: (output) => output.includes('memory') || output.includes('store')
  },
  hooks: {
    command: 'hooks --help',
    validate: (output) => output.includes('hooks') || output.includes('pre-task')
  }
};

/**
 * Test CLI configuration
 */
function testCliConfiguration(config) {
  console.log(`\n🔍 Testing ${config.name} (${config.type}):`);
  console.log(`   Path: ${config.path}`);

  const results = {
    name: config.name,
    path: config.path,
    type: config.type,
    features: {},
    errors: [],
    timestamp: new Date().toISOString()
  };

  // Test each feature
  for (const [feature, test] of Object.entries(QUICK_TESTS)) {
    try {
      const cmd = `${config.path} ${test.command}`;
      console.log(`   Testing ${feature}...`);

      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const passed = test.validate(output);
      results.features[feature] = {
        command: test.command,
        passed,
        output: output.substring(0, 200)
      };

      console.log(`     ${passed ? '✅' : '❌'} ${feature}`);
    } catch (error) {
      results.features[feature] = {
        command: test.command,
        passed: false,
        error: error.message
      };
      results.errors.push({
        feature,
        error: error.message
      });
      console.log(`     ❌ ${feature} (error)`);
    }
  }

  // Calculate success rate
  const total = Object.keys(results.features).length;
  const passed = Object.values(results.features).filter(f => f.passed).length;
  results.successRate = (passed / total * 100).toFixed(1);

  console.log(`   Success Rate: ${results.successRate}%`);

  return results;
}

/**
 * Capture detailed feature inventory
 */
function captureFeatureInventory() {
  console.log('\n📋 Capturing Detailed Feature Inventory...');

  const inventory = {
    timestamp: new Date().toISOString(),
    cliFiles: [],
    mcpTools: [],
    commands: [],
    hooks: [],
    templates: []
  };

  // Find all CLI-related files
  try {
    const cliFiles = execSync('find ./src ./dist -name "*.js" -o -name "*.ts" | grep -E "(cli|command)" | sort', {
      encoding: 'utf8'
    }).trim().split('\n');

    inventory.cliFiles = cliFiles.filter(f => f.length > 0);
    console.log(`   Found ${inventory.cliFiles.length} CLI files`);
  } catch (error) {
    console.log('   ⚠️  Could not inventory CLI files');
  }

  // Check MCP tools
  try {
    const toolsOutput = execSync('./bin/claude-flow mcp list-tools 2>/dev/null || echo "none"', {
      encoding: 'utf8'
    });

    const toolMatches = toolsOutput.match(/(\w+_\w+)/g) || [];
    inventory.mcpTools = [...new Set(toolMatches)];
    console.log(`   Found ${inventory.mcpTools.length} MCP tools`);
  } catch (error) {
    console.log('   ⚠️  Could not inventory MCP tools');
  }

  // Extract commands from help output
  try {
    const helpOutput = execSync('./bin/claude-flow --help 2>&1 || echo ""', {
      encoding: 'utf8'
    });

    const commandMatches = helpOutput.match(/^\s+(\w+)\s+/gm) || [];
    inventory.commands = commandMatches.map(c => c.trim()).filter(c => c.length > 0);
    console.log(`   Found ${inventory.commands.length} commands`);
  } catch (error) {
    console.log('   ⚠️  Could not inventory commands');
  }

  return inventory;
}

/**
 * Generate baseline report
 */
function generateBaselineReport(configurations, inventory) {
  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd()
    },
    configurations,
    inventory,
    summary: {
      totalConfigurations: configurations.length,
      workingConfigurations: configurations.filter(c => parseFloat(c.successRate) > 0).length,
      averageSuccessRate: (
        configurations.reduce((sum, c) => sum + parseFloat(c.successRate), 0) /
        configurations.length
      ).toFixed(1)
    }
  };

  // Save report
  const reportPath = path.join(__dirname, '..', 'reports', 'baseline-features.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate summary
  console.log('\n📊 Baseline Summary:');
  console.log(`   Timestamp: ${report.metadata.timestamp}`);
  console.log(`   Configurations Tested: ${report.summary.totalConfigurations}`);
  console.log(`   Working Configurations: ${report.summary.workingConfigurations}`);
  console.log(`   Average Success Rate: ${report.summary.averageSuccessRate}%`);
  console.log(`   CLI Files: ${inventory.cliFiles.length}`);
  console.log(`   MCP Tools: ${inventory.mcpTools.length}`);
  console.log(`   Commands: ${inventory.commands.length}`);
  console.log(`\n📄 Report saved to: ${reportPath}`);

  return report;
}

/**
 * Main process
 */
async function main() {
  console.log('🚀 Claude Flow Baseline Feature Capture');
  console.log('   ══════════════════════════════════');

  // Test all CLI configurations
  const configurations = [];
  for (const config of CLI_CONFIGURATIONS) {
    const result = testCliConfiguration(config);
    configurations.push(result);
  }

  // Capture detailed inventory
  const inventory = captureFeatureInventory();

  // Generate report
  const report = generateBaselineReport(configurations, inventory);

  // Create quick validation script
  const validationScript = `#!/bin/bash
# Quick baseline validation
echo "🔍 Validating against baseline..."
node scripts/validate-feature-parity.js --cli ./bin/claude-flow
echo "✅ Validation complete"
`;

  fs.writeFileSync(
    path.join(__dirname, 'validate-baseline.sh'),
    validationScript,
    { mode: 0o755 }
  );

  console.log('\n✅ Baseline capture complete!');
  console.log('   Run ./scripts/validate-baseline.sh to validate against this baseline');

  // Return success if at least one configuration works
  return report.summary.workingConfigurations > 0;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { testCliConfiguration, captureFeatureInventory };
