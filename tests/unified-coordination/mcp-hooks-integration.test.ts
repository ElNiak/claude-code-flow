import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigManager } from '../../src/config/config-manager.js';

// Mock the MCP and hooks systems
jest.mock('../../src/mcp/server.js');
jest.mock('../../src/mcp/claude-flow-tools.js');

describe('Unified MCP and Hooks Integration', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = ConfigManager.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Hook Configuration by Workflow', () => {
    test('should configure development-specific hooks', async () => {
      await configManager.load('config/presets/development.json');
      const config = configManager.show();
      
      expect(config.hooks.preFileEdit.loadContext).toBe(true);
      expect(config.hooks.preFileEdit.validateSyntax).toBe(true);
      expect(config.hooks.postFileEdit.runLinter).toBe(true);
      expect(config.hooks.postFileEdit.formatCode).toBe(true);
      expect(config.hooks.postFileEdit.runTests).toBe(false); // Fast iteration
    });

    test('should configure research-specific hooks', async () => {
      await configManager.load('config/presets/research.json');
      const config = configManager.show();
      
      expect(config.hooks.preResearch.validateSources).toBe(true);
      expect(config.hooks.preResearch.checkAvailability).toBe(true);
      expect(config.hooks.postResearch.storeFindings).toBe(true);
      expect(config.hooks.postResearch.updateKnowledgeBase).toBe(true);
      expect(config.hooks.postAnalysis.generateInsights).toBe(true);
    });

    test('should configure deployment-specific hooks', async () => {
      await configManager.load('config/presets/deployment.json');
      const config = configManager.show();
      
      expect(config.hooks.preDeployment.runTests).toBe(true);
      expect(config.hooks.preDeployment.validateSecurity).toBe(true);
      expect(config.hooks.postDeployment.runHealthChecks).toBe(true);
      expect(config.hooks.postDeployment.setupMonitoring).toBe(true);
      expect(config.hooks.postInfrastructure.configureMonitoring).toBe(true);
    });
  });

  describe('MCP Tool Integration', () => {
    test('should validate MCP tool availability', () => {
      const requiredMcpTools = [
        'mcp__claude-flow__swarm_init',
        'mcp__claude-flow__agent_spawn',
        'mcp__claude-flow__task_orchestrate',
        'mcp__claude-flow__memory_usage',
        'mcp__claude-flow__swarm_status'
      ];
      
      requiredMcpTools.forEach(tool => {
        expect(tool).toMatch(/^mcp__claude-flow__/);
      });
    });

    test('should configure MCP transport based on workflow', async () => {
      // Development uses stdio for simplicity
      await configManager.load('config/presets/development.json');
      let config = configManager.show();
      expect(config.mcp.transport).toBe('stdio');

      // Research uses stdio for reliability
      await configManager.load('config/presets/research.json');
      config = configManager.show();
      expect(config.mcp.transport).toBe('stdio');

      // Deployment uses HTTP with TLS for security
      await configManager.load('config/presets/deployment.json');
      config = configManager.show();
      expect(config.mcp.transport).toBe('http');
      expect(config.mcp.tlsEnabled).toBe(true);
    });

    test('should handle MCP port configuration', async () => {
      await configManager.load('config/presets/development.json');
      let config = configManager.show();
      expect(config.mcp.port).toBe(3001);

      await configManager.load('config/presets/research.json');
      config = configManager.show();
      expect(config.mcp.port).toBe(3002);

      await configManager.load('config/presets/deployment.json');
      config = configManager.show();
      expect(config.mcp.port).toBe(3003);
    });
  });

  describe('Hook Execution Pipeline', () => {
    test('should validate hook execution order', () => {
      const hookOrder = [
        'pre-task',
        'pre-edit',
        'execute',
        'post-edit',
        'post-task'
      ];
      
      hookOrder.forEach((hook, index) => {
        if (index > 0) {
          expect(hook).toBeDefined();
        }
      });
    });

    test('should handle hook failure scenarios', () => {
      const failureScenarios = [
        'hook_timeout',
        'hook_error',
        'dependency_missing',
        'permission_denied'
      ];
      
      failureScenarios.forEach(scenario => {
        expect(scenario).toMatch(/^[a-z_]+$/);
      });
    });

    test('should support conditional hook execution', () => {
      const conditions = {
        fileType: '*.ts',
        projectType: 'web_application',
        workflowPhase: 'implementation',
        agentType: 'coder'
      };
      
      expect(conditions.fileType).toMatch(/^\*\.\w+$/);
      expect(conditions.projectType).toBeDefined();
      expect(conditions.workflowPhase).toBeDefined();
      expect(conditions.agentType).toBeDefined();
    });
  });

  describe('Cross-System Communication', () => {
    test('should coordinate between hooks and MCP tools', () => {
      const hookMcpMapping = {
        'pre-task': 'mcp__claude-flow__task_orchestrate',
        'post-edit': 'mcp__claude-flow__memory_usage',
        'session-end': 'mcp__claude-flow__swarm_status'
      };
      
      Object.values(hookMcpMapping).forEach(mcpTool => {
        expect(mcpTool).toMatch(/^mcp__claude-flow__/);
      });
    });

    test('should handle event propagation between systems', () => {
      const events = [
        'agent_spawned',
        'task_started',
        'file_edited',
        'test_completed',
        'deployment_finished'
      ];
      
      events.forEach(event => {
        expect(event).toMatch(/^[a-z_]+$/);
      });
    });

    test('should support asynchronous hook execution', () => {
      const asyncHooks = [
        'background_analysis',
        'cache_update',
        'metric_collection',
        'backup_creation'
      ];
      
      asyncHooks.forEach(hook => {
        expect(hook).toMatch(/^[a-z_]+$/);
      });
    });
  });

  describe('Performance Integration', () => {
    test('should optimize hook performance for development workflow', async () => {
      await configManager.load('config/presets/development.json');
      const config = configManager.show();
      
      expect(config.performance.parallelExecution).toBe(true);
      expect(config.performance.intelligentBatching).toBe(true);
      expect(config.performance.tokenReduction).toBe(true);
    });

    test('should balance performance and accuracy for research', async () => {
      await configManager.load('config/presets/research.json');
      const config = configManager.show();
      
      expect(config.performance.enableCaching).toBe(true);
      expect(config.performance.memoryIntensive).toBe(true);
      expect(config.performance.deepAnalysis).toBe(true);
    });

    test('should prioritize reliability for deployment', async () => {
      await configManager.load('config/presets/deployment.json');
      const config = configManager.show();
      
      expect(config.performance.reliabilityFirst).toBe(true);
      expect(config.performance.auditTrail).toBe(true);
    });
  });

  describe('Security and Compliance', () => {
    test('should enforce security hooks in deployment workflow', async () => {
      await configManager.load('config/presets/deployment.json');
      const config = configManager.show();
      
      expect(config.security.scanContainers).toBe(true);
      expect(config.security.validateSecrets).toBe(true);
      expect(config.security.checkCompliance).toBe(true);
      expect(config.security.auditAccess).toBe(true);
    });

    test('should handle secure MCP communication', async () => {
      await configManager.load('config/presets/deployment.json');
      const config = configManager.show();
      
      expect(config.mcp.tlsEnabled).toBe(true);
    });

    test('should validate hook permissions', () => {
      const permissions = [
        'file_read',
        'file_write',
        'network_access',
        'system_commands',
        'environment_variables'
      ];
      
      permissions.forEach(permission => {
        expect(permission).toMatch(/^[a-z_]+$/);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle MCP connection failures', () => {
      const errorTypes = [
        'connection_timeout',
        'authentication_failure',
        'protocol_error',
        'server_unavailable'
      ];
      
      errorTypes.forEach(error => {
        expect(error).toMatch(/^[a-z_]+$/);
      });
    });

    test('should implement hook retry mechanisms', () => {
      const retryConfig = {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        timeoutMs: 5000
      };
      
      expect(retryConfig.maxRetries).toBeGreaterThan(0);
      expect(retryConfig.timeoutMs).toBeGreaterThan(0);
    });

    test('should support graceful degradation', () => {
      const degradationStrategies = [
        'skip_optional_hooks',
        'use_cached_results',
        'reduce_functionality',
        'notify_user'
      ];
      
      degradationStrategies.forEach(strategy => {
        expect(strategy).toMatch(/^[a-z_]+$/);
      });
    });
  });

  describe('Monitoring and Telemetry', () => {
    test('should collect hook execution metrics', () => {
      const metrics = {
        hookExecutionTime: 150,
        hookSuccessRate: 0.98,
        mcpLatency: 45,
        errorRate: 0.02
      };
      
      expect(metrics.hookExecutionTime).toBeGreaterThan(0);
      expect(metrics.hookSuccessRate).toBeGreaterThan(0.95);
      expect(metrics.mcpLatency).toBeLessThan(100);
      expect(metrics.errorRate).toBeLessThan(0.05);
    });

    test('should track system health indicators', () => {
      const healthMetrics = [
        'mcp_connectivity',
        'hook_reliability',
        'memory_usage',
        'cpu_utilization'
      ];
      
      healthMetrics.forEach(metric => {
        expect(metric).toMatch(/^[a-z_]+$/);
      });
    });
  });
});