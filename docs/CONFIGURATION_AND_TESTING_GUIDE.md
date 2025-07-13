# Configuration System and Testing Framework Guide

## Overview

This guide covers the comprehensive configuration system and testing framework for Claude Flow's unified architecture. The system provides workflow-specific presets, adaptive configuration, and extensive testing capabilities.

## 🔧 Configuration System

### Workflow Presets

The configuration system includes three optimized presets for different workflows:

#### Development Preset (`config/presets/development.json`)
- **Purpose**: Optimized for software development workflows
- **Topology**: Hierarchical (8 agents max)
- **Strategy**: Specialized
- **Key Features**:
  - Fast synchronization (3s intervals)
  - Debug logging enabled
  - Code formatting hooks
  - Parallel execution optimized
  - Agent types: architect, coder, tester, reviewer, coordinator

#### Research Preset (`config/presets/research.json`)
- **Purpose**: Optimized for research and analysis workflows
- **Topology**: Mesh (10 agents max)
- **Strategy**: Adaptive
- **Key Features**:
  - Large memory cache (500MB)
  - Long retention (90 days)
  - Research-specific hooks
  - Agent types: researcher, analyst, synthesizer, documenter, coordinator

#### Deployment Preset (`config/presets/deployment.json`)
- **Purpose**: Optimized for CI/CD and deployment workflows
- **Topology**: Hierarchical (6 agents max)
- **Strategy**: Specialized
- **Key Features**:
  - High retry count (10)
  - Security scanning enabled
  - TLS encryption for MCP
  - Monitoring and alerting
  - Agent types: deployer, tester, monitor, security, coordinator

### Agent Capabilities System

The `config/agent-capabilities.json` file defines:

#### Agent Types
- **Architect**: System design and architecture
- **Coder**: Implementation and development
- **Tester**: Quality assurance and testing
- **Reviewer**: Code review and mentoring
- **Researcher**: Information gathering and analysis
- **Analyst**: Data analysis and insights
- **Deployer**: Deployment and infrastructure
- **Coordinator**: Workflow coordination

#### Selection Rules
- **By File Type**: Automatic agent selection based on file extensions
- **By Project Type**: Agent selection based on project characteristics
- **By Workflow Phase**: Agent selection based on current phase

#### Adaptive Rules
- **Project Size**: Agent count based on project complexity
- **Complexity**: Agent types based on project complexity
- **Time Constraints**: Optimization strategy based on urgency

### Adaptive Configuration

The system can automatically adapt configuration based on project analysis:

```typescript
import { presetManager } from './src/config/preset-manager.js';

// Analyze project and get recommended configuration
const adaptiveConfig = await presetManager.getRecommendedConfiguration('./my-project');

// Apply the adaptive configuration
await presetManager.applyPreset('adaptive-web_application');
```

## 🧪 Testing Framework

### Test Categories

#### 1. Configuration Tests (`tests/config/`)
- **Preset Configuration Tests**: Validate all preset configurations
- **Agent Capabilities Tests**: Validate agent type definitions and rules
- **Migration Tests**: Test configuration migration between versions

#### 2. Unified Coordination Tests (`tests/unified-coordination/`)
- **Memory Integration**: Test memory system coordination
- **MCP Hooks Integration**: Test MCP tools and hooks coordination
- **Performance Benchmarks**: Compare performance vs current architecture
- **Migration Validation**: Test backward compatibility and migration
- **End-to-End Workflows**: Test complete workflow execution

### Running Tests

#### Basic Test Execution
```bash
# Run all unified architecture tests
npm run test:unified

# Run with coverage
npm run test:unified --coverage

# Run specific test suite
npm run test:unified --suite=config

# Run in watch mode
npm run test:unified --watch --suite=unifiedCoordination
```

#### Advanced Options
```bash
# Verbose output with performance monitoring
npm run test:unified --verbose --suite=performanceBenchmarks

# Run with memory leak detection
npm run test:unified --detect-leaks

# Update snapshots
npm run test:unified --update-snapshots

# Stop on first failure
npm run test:unified --bail
```

### Test Suite Configuration

```javascript
// Available test suites
const testSuites = {
  config: 'Configuration System Tests',
  unifiedCoordination: 'Unified Coordination Tests',
  memoryIntegration: 'Memory Integration Tests',
  mcpHooksIntegration: 'MCP and Hooks Integration Tests',
  performanceBenchmarks: 'Performance Benchmark Tests',
  migrationValidation: 'Migration Validation Tests',
  endToEndWorkflows: 'End-to-End Workflow Tests'
};
```

## 📈 Performance Benchmarks

The testing framework includes comprehensive performance benchmarks:

### Baseline Metrics
- Agent spawn time: < 180ms (28% improvement)
- Task execution time: < 900ms (25% improvement)
- Memory usage: < 65MB (24% reduction)
- Throughput: > 22 tasks/minute (47% improvement)
- Error rate: < 1.5% (50% reduction)

### Benchmark Categories
1. **Agent Coordination Performance**
2. **Memory System Performance**
3. **MCP Integration Performance**
4. **Hook System Performance**
5. **Overall System Throughput**
6. **Workflow-Specific Performance**
7. **Scalability Performance**

## 🔄 Migration System

### Configuration Migration

The migration validator handles version transitions:

```typescript
import { migrationValidator } from './src/config/migration-validator.js';

// Migrate configuration to latest version
const result = await migrationValidator.migrateConfiguration('./config.json');

// Create backup before migration
const backup = await migrationValidator.createBackup('./config.json');

// Restore from backup if needed
await migrationValidator.restoreFromBackup(backup.path, './config.json');
```

### Migration Features
- **Automatic Version Detection**
- **Incremental Migration Paths**
- **Automatic Backups**
- **Validation After Migration**
- **Rollback Capabilities**
- **Backward Compatibility Checking**

## 🎯 Usage Examples

### Loading and Applying Presets

```typescript
import { ConfigManager } from './src/config/config-manager.js';
import { presetManager } from './src/config/preset-manager.js';

// Load development preset
await configManager.load('config/presets/development.json');

// Get available presets
const presets = await presetManager.getAvailablePresets();
console.log('Available presets:', presets);

// Apply preset through preset manager
await presetManager.applyPreset('development');
```

### Adaptive Configuration

```typescript
// Analyze project and get adaptive configuration
const analysis = await presetManager.analyzeProject('./my-project');
const adaptiveConfig = await presetManager.createAdaptiveConfig(analysis);

// Save as custom preset
await presetManager.saveAsCustomPreset(adaptiveConfig, 'my-custom-preset');
```

### Testing Integration

```typescript
describe('My Feature Tests', () => {
  beforeEach(async () => {
    // Load appropriate preset for testing
    await configManager.load('config/presets/development.json');
  });

  test('should work with unified coordination', async () => {
    const config = configManager.show();
    expect(config.ruvSwarm.enabled).toBe(true);
    expect(config.agents.preferredTypes).toContain('coder');
  });
});
```

## 📊 Monitoring and Validation

### Health Checks
- Configuration validation on load
- Agent capability validation
- Workflow compatibility checking
- Performance regression detection

### Metrics Collection
- Test execution metrics
- Performance benchmarks
- Memory usage tracking
- Error rate monitoring

### Reporting
- Comprehensive test reports
- Performance comparison reports
- Migration validation reports
- Coverage reports with unified metrics

## 🔍 Troubleshooting

### Common Issues

#### Configuration Loading Errors
```bash
# Validate configuration files
npm run test:unified --suite=config --verbose
```

#### Performance Regression
```bash
# Run performance benchmarks
npm run test:unified --suite=performanceBenchmarks
```

#### Migration Failures
```bash
# Validate migration compatibility
npm run test:unified --suite=migrationValidation
```

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=test DEBUG=claude-flow:* npm run test:unified --verbose
```

## 🚀 Best Practices

### Configuration Management
1. **Use Presets**: Start with appropriate workflow preset
2. **Validate Changes**: Always validate configuration after changes
3. **Version Control**: Track configuration changes in git
4. **Environment Variables**: Use env vars for environment-specific settings

### Testing Strategy
1. **Run Critical Tests**: Always run config and unifiedCoordination suites
2. **Performance Monitoring**: Regular performance benchmark execution
3. **Migration Testing**: Test migrations before deploying
4. **End-to-End Validation**: Validate complete workflows

### Performance Optimization
1. **Adaptive Configuration**: Use adaptive configs for optimal performance
2. **Monitor Metrics**: Track performance metrics over time
3. **Scale Appropriately**: Adjust agent count based on project size
4. **Cache Optimization**: Configure memory cache based on workflow needs

## 📚 API Reference

### ConfigManager
- `load(configPath)`: Load configuration from file
- `show()`: Get current configuration
- `get(path)`: Get configuration value by path
- `set(path, value)`: Set configuration value
- `save(configPath)`: Save configuration to file

### PresetManager
- `getAvailablePresets()`: List available presets
- `loadPreset(name)`: Load specific preset
- `applyPreset(name)`: Apply preset to config manager
- `analyzeProject(path)`: Analyze project for adaptive config
- `createAdaptiveConfig(analysis)`: Create adaptive configuration

### MigrationValidator
- `migrateConfiguration(path)`: Migrate configuration to latest version
- `createBackup(path)`: Create configuration backup
- `restoreFromBackup(path)`: Restore from backup
- `validateBackwardCompatibility()`: Check compatibility

This comprehensive system ensures robust configuration management and thorough testing for the unified architecture.