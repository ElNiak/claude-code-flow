#!/usr/bin/env node
/**
 * Build Optimization Script
 * Implements build-time optimizations for better performance
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { performance } from 'perf_hooks';

const execAsync = promisify(exec);

class BuildOptimizer {
  constructor() {
    this.startTime = performance.now();
    this.metrics = {
      originalSize: 0,
      optimizedSize: 0,
      treeShakenModules: 0,
      optimizationTime: 0,
    };
  }

  async run() {
    console.log('🚀 Starting Claude-Flow Build Optimization...\n');

    try {
      // Clean previous builds
      await this.cleanBuild();

      // Update TypeScript config for optimization
      await this.updateTsConfig();

      // Build with optimizations
      await this.buildOptimized();

      // Apply additional optimizations
      await this.applyPostBuildOptimizations();

      // Generate size report
      await this.generateSizeReport();

      // Restore original config
      await this.restoreTsConfig();

      const endTime = performance.now();
      this.metrics.optimizationTime = endTime - this.startTime;

      console.log('\n✅ Build optimization complete!');
      this.displayMetrics();
    } catch (error) {
      console.error('❌ Build optimization failed:', error);
      await this.restoreTsConfig();
      process.exit(1);
    }
  }

  async cleanBuild() {
    console.log('🧹 Cleaning previous builds...');
    try {
      await rm('dist', { recursive: true, force: true });
      await rm('dist-optimized', { recursive: true, force: true });
    } catch (error) {
      // Ignore if directories don't exist
    }
  }

  async updateTsConfig() {
    console.log('⚙️ Updating TypeScript configuration for optimization...');

    const tsconfigPath = 'tsconfig.json';
    const backupPath = 'tsconfig.backup.json';

    // Backup original
    const original = await readFile(tsconfigPath, 'utf8');
    await writeFile(backupPath, original);

    // Parse and update config
    const config = JSON.parse(original);

    // Add optimization options
    config.compilerOptions = {
      ...config.compilerOptions,
      // Enable tree shaking
      moduleResolution: 'bundler',
      // Remove comments
      removeComments: true,
      // No source maps for production
      sourceMap: false,
      // Inline source maps
      inlineSourceMap: false,
      // Strip internal
      stripInternal: true,
      // No declaration maps
      declarationMap: false,
      // Optimize for size
      target: 'ES2022',
      // Use modern module system
      module: 'ES2022',
    };

    await writeFile(tsconfigPath, JSON.stringify(config, null, 2));
  }

  async buildOptimized() {
    console.log('🔨 Building with optimizations...');

    // Build with TypeScript
    await execAsync('npx tsc');

    // Run additional optimization passes
    console.log('🎯 Running optimization passes...');

    // Use esbuild for additional optimization
    const esbuildConfig = {
      entryPoints: ['dist/cli/simple-cli.js'],
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      treeShaking: true,
      // External dependencies that should not be bundled
      external: [
        'child_process',
        'fs',
        'path',
        'os',
        'crypto',
        'util',
        'stream',
        'events',
        'readline',
        'url',
        'http',
        'https',
        'net',
        'tls',
        'zlib',
        'buffer',
        'string_decoder',
        'querystring',
        // Keep these external as they're native or heavy
        'better-sqlite3',
        'node-pty',
        'blessed',
        'puppeteer',
      ],
      outfile: 'dist-optimized/cli.js',
      metafile: true,
    };

    // Write esbuild config
    await writeFile('esbuild.config.json', JSON.stringify(esbuildConfig, null, 2));

    // Run esbuild
    const { stdout } = await execAsync(
      `npx esbuild ${esbuildConfig.entryPoints[0]} --bundle --minify --format=${esbuildConfig.format} --platform=${esbuildConfig.platform} --target=${esbuildConfig.target} --tree-shaking=true --external:${esbuildConfig.external.join(' --external:')} --outfile=${esbuildConfig.outfile} --metafile=dist-optimized/meta.json`
    );

    console.log(stdout);
  }

  async applyPostBuildOptimizations() {
    console.log('🔧 Applying post-build optimizations...');

    // Create optimized command loader
    const optimizedLoader = `#!/usr/bin/env node
/**
 * Optimized CLI Entry Point
 * Auto-generated - Do not edit
 */

// Minimal startup with lazy loading
const VERSION = '2.0.0-alpha.50';

// Fast path for version
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(\`claude-flow v\${VERSION}\`);
  process.exit(0);
}

// Lazy load main CLI
import('./cli.js').then(module => {
  if (module.main) {
    module.main();
  }
}).catch(error => {
  console.error('Failed to start Claude-Flow:', error);
  process.exit(1);
});
`;

    await mkdir('dist-optimized', { recursive: true });
    await writeFile('dist-optimized/index.js', optimizedLoader);

    // Make executable
    await execAsync('chmod +x dist-optimized/index.js');
  }

  async generateSizeReport() {
    console.log('📊 Generating size report...');

    // Get original size
    const { stdout: originalSize } = await execAsync('du -sh dist | cut -f1');
    this.metrics.originalSize = originalSize.trim();

    // Get optimized size
    const { stdout: optimizedSize } = await execAsync('du -sh dist-optimized | cut -f1');
    this.metrics.optimizedSize = optimizedSize.trim();

    // Read metafile for tree-shaking info
    try {
      const metafile = await readFile('dist-optimized/meta.json', 'utf8');
      const meta = JSON.parse(metafile);
      this.metrics.treeShakenModules = Object.keys(meta.inputs || {}).length;
    } catch (error) {
      // Metafile might not exist
    }
  }

  async restoreTsConfig() {
    console.log('🔄 Restoring original TypeScript configuration...');
    try {
      const backup = await readFile('tsconfig.backup.json', 'utf8');
      await writeFile('tsconfig.json', backup);
      await rm('tsconfig.backup.json');
    } catch (error) {
      console.error('Failed to restore tsconfig:', error);
    }
  }

  displayMetrics() {
    console.log('\n📈 Optimization Metrics:');
    console.log('─'.repeat(40));
    console.log(`Original Size: ${this.metrics.originalSize}`);
    console.log(`Optimized Size: ${this.metrics.optimizedSize}`);
    console.log(`Modules Processed: ${this.metrics.treeShakenModules}`);
    console.log(`Optimization Time: ${(this.metrics.optimizationTime / 1000).toFixed(2)}s`);
    console.log('─'.repeat(40));

    // Write optimization report
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      recommendations: [
        'Use the optimized build for production deployments',
        'Consider implementing code splitting for large commands',
        'Monitor bundle size growth over time',
        'Use dynamic imports for optional features',
      ],
    };

    writeFile('build-optimization-report.json', JSON.stringify(report, null, 2));
  }
}

// Run the optimizer
const optimizer = new BuildOptimizer();
optimizer.run().catch(console.error);
