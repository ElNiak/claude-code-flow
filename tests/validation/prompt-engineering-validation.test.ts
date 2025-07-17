import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TaskAnalyzer } from '../../src/unified/work/task-analyzer.js';
import type { TaskAnalysis, TaskInput, WorkOptions } from '../../src/unified/work/types.js';
import { WorkCommand } from '../../src/unified/work/work-command.js';

/**
 * Prompt Engineering Validation Test Suite
 *
 * Validates the quality, accuracy, and effectiveness of AI prompt generation
 * for Claude Code coordination in the unified work command system.
 */
describe('Prompt Engineering Validation', () => {
  let workCommand: WorkCommand;
  let taskAnalyzer: TaskAnalyzer;
  let testOutputDir: string;

  beforeAll(async () => {
    testOutputDir = path.join(__dirname, 'prompt-test-output', `run-${Date.now()}`);
    await fs.mkdir(testOutputDir, { recursive: true });

    workCommand = new WorkCommand();
    taskAnalyzer = new TaskAnalyzer();
  });

  afterAll(async () => {
    try {
      await workCommand.cleanup();
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Prompt Generation Algorithms', () => {
    test('should generate contextually appropriate prompts for different task types', async () => {
      const testCases = [
        {
          task: 'Build a REST API with authentication and database integration',
          expectedElements: ['development', 'api', 'auth', 'database', 'hierarchical'],
          taskType: 'development'
        },
        {
          task: 'Research machine learning optimization techniques and benchmarking',
          expectedElements: ['research', 'analysis', 'mesh', 'web_search'],
          taskType: 'research'
        },
        {
          task: 'Deploy microservices to production with monitoring and scaling',
          expectedElements: ['deployment', 'monitoring', 'sequential', 'system_operations'],
          taskType: 'deployment'
        },
        {
          task: 'Optimize application performance and reduce memory usage',
          expectedElements: ['optimization', 'performance', 'profiling', 'adaptive'],
          taskType: 'optimization'
        }
      ];

      for (const testCase of testCases) {
        const analysis = await taskAnalyzer.analyze({
          task: testCase.task,
          params: [],
          context: {
            workingDirectory: process.cwd(),
            environment: process.env,
            options: {}
          }
        });

        // Validate task analysis
        expect(analysis.taskType).toBe(testCase.taskType);

        // Check that expected elements are present in analysis or resources
        for (const element of testCase.expectedElements) {
          const found =
            analysis.suggestedTopology === element ||
            analysis.suggestedStrategy === element ||
            analysis.requiredResources.includes(element) ||
            analysis.keywords.includes(element);

          expect(found).toBe(true, `Expected element '${element}' not found for task: ${testCase.task}`);
        }
      }
    });

    test('should adapt agent count and topology based on task complexity', async () => {
      const complexityTestCases = [
        {
          task: 'Fix a small CSS styling issue',
          expectedComplexity: 'low',
          maxAgents: 3
        },
        {
          task: 'Build a complete e-commerce platform with payment processing, inventory management, user authentication, admin dashboard, and mobile app',
          expectedComplexity: 'very_high',
          minAgents: 6
        },
        {
          task: 'Create a simple calculator function',
          expectedComplexity: 'low',
          maxAgents: 2
        },
        {
          task: 'Implement a distributed microservices architecture with service mesh, API gateway, event sourcing, CQRS, and real-time analytics',
          expectedComplexity: 'very_high',
          minAgents: 8
        }
      ];

      for (const testCase of complexityTestCases) {
        const analysis = await taskAnalyzer.analyze({
          task: testCase.task,
          params: [],
          context: {
            workingDirectory: process.cwd(),
            environment: process.env,
            options: {}
          }
        });

        expect(analysis.complexity).toBe(testCase.expectedComplexity);

        if (testCase.maxAgents) {
          expect(analysis.suggestedAgents).toBeLessThanOrEqual(testCase.maxAgents);
        }

        if (testCase.minAgents) {
          expect(analysis.suggestedAgents).toBeGreaterThanOrEqual(testCase.minAgents);
        }
      }
    });

    test('should generate prompts with proper MCP tool sequencing', async () => {
      const options: WorkOptions = {
        dryRun: true,
        agents: 5,
        topology: 'hierarchical',
        strategy: 'parallel'
      };

      let generatedPrompt = '';
      const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(async (filePath, content) => {
        if (typeof filePath === 'string' && filePath.includes('unified-work-prompt')) {
          generatedPrompt = content.toString();
        }
      });

      try {
        const command = workCommand.createCommand();
        await command.parseAsync(['node', 'test', 'test MCP sequencing', '--dry-run'], { from: 'user' });
        await new Promise(resolve => setTimeout(resolve, 100));

        // Validate MCP tool sequencing
        const mcpToolPattern = /mcp__claude-flow__(\w+)/g;
        const mcpTools = [...generatedPrompt.matchAll(mcpToolPattern)].map(match => match[1]);

        // Should include core MCP tools in logical order
        expect(mcpTools).toContain('swarm_init');
        expect(mcpTools).toContain('agent_spawn');
        expect(mcpTools).toContain('task_orchestrate');
        expect(mcpTools).toContain('memory_usage');

        // swarm_init should appear before agent_spawn
        const swarmInitIndex = generatedPrompt.indexOf('mcp__claude-flow__swarm_init');
        const agentSpawnIndex = generatedPrompt.indexOf('mcp__claude-flow__agent_spawn');
        expect(swarmInitIndex).toBeLessThan(agentSpawnIndex);

      } finally {
        writeFileSpy.mockRestore();
      }
    });
  });

  describe('Input Reformulation Quality', () => {
    test('should handle ambiguous task descriptions', async () => {
      const ambiguousTestCases = [
        {
          task: 'make it better',
          shouldExtractKeywords: ['better'],
          shouldBeGeneralType: true
        },
        {
          task: 'fix the issue',
          shouldExtractKeywords: ['fix', 'issue'],
          shouldBeOptimizationType: true
        },
        {
          task: 'improve performance',
          shouldExtractKeywords: ['improve', 'performance'],
          shouldBeOptimizationType: true
        },
        {
          task: 'add new features',
          shouldExtractKeywords: ['add', 'features'],
          shouldBeDevelopmentType: true
        }
      ];

      for (const testCase of ambiguousTestCases) {
        const analysis = await taskAnalyzer.analyze({
          task: testCase.task,
          params: [],
          context: {
            workingDirectory: process.cwd(),
            environment: process.env,
            options: {}
          }
        });

        // Should extract meaningful keywords even from ambiguous input
        for (const keyword of testCase.shouldExtractKeywords) {
          expect(analysis.keywords).toContain(keyword);
        }

        // Should classify task type appropriately
        if (testCase.shouldBeGeneralType) {
          expect(analysis.taskType).toBe('general');
        } else if (testCase.shouldBeOptimizationType) {
          expect(analysis.taskType).toBe('optimization');
        } else if (testCase.shouldBeDevelopmentType) {
          expect(analysis.taskType).toBe('development');
        }

        // Should provide helpful recommendations for ambiguous tasks
        expect(analysis.recommendations.length).toBeGreaterThan(0);
      }
    });

    test('should extract structured information from complex task descriptions', async () => {
      const complexTask = `
        Build a modern web application with the following requirements:
        - React frontend with TypeScript
        - Node.js backend with Express
        - PostgreSQL database with Prisma ORM
        - JWT authentication
        - Real-time chat using WebSockets
        - Unit and integration tests
        - Docker containerization
        - CI/CD pipeline with GitHub Actions
        - Deployment to AWS with monitoring
      `;

      const analysis = await taskAnalyzer.analyze({
        task: complexTask,
        params: [],
        context: {
          workingDirectory: process.cwd(),
          environment: process.env,
          options: {}
        }
      });

      // Should identify key technologies and requirements
      const expectedKeywords = ['react', 'typescript', 'node', 'express', 'postgresql', 'auth', 'websockets', 'tests', 'docker', 'deployment'];
      const foundKeywords = expectedKeywords.filter(keyword =>
        analysis.keywords.some(k => k.includes(keyword) || keyword.includes(k))
      );

      expect(foundKeywords.length).toBeGreaterThan(expectedKeywords.length * 0.7); // At least 70% match

      // Should classify as development with high complexity
      expect(analysis.taskType).toBe('development');
      expect(analysis.complexity).toMatch(/^(high|very_high)$/);
      expect(analysis.suggestedAgents).toBeGreaterThan(4);
    });

    test('should handle domain-specific terminology', async () => {
      const domainTestCases = [
        {
          task: 'Implement CRUD operations for user management with RBAC',
          domain: 'backend',
          expectedKeywords: ['crud', 'user', 'management', 'rbac']
        },
        {
          task: 'Create responsive UI components with accessibility compliance',
          domain: 'frontend',
          expectedKeywords: ['responsive', 'ui', 'components', 'accessibility']
        },
        {
          task: 'Set up monitoring with Prometheus and Grafana dashboards',
          domain: 'devops',
          expectedKeywords: ['monitoring', 'prometheus', 'grafana', 'dashboards']
        },
        {
          task: 'Implement machine learning pipeline with feature engineering',
          domain: 'ml',
          expectedKeywords: ['machine', 'learning', 'pipeline', 'feature', 'engineering']
        }
      ];

      for (const testCase of domainTestCases) {
        const analysis = await taskAnalyzer.analyze({
          task: testCase.task,
          params: [],
          context: {
            workingDirectory: process.cwd(),
            environment: process.env,
            options: {}
          }
        });

        // Should extract domain-specific keywords
        const foundDomainKeywords = testCase.expectedKeywords.filter(keyword =>
          analysis.keywords.some(k => k.includes(keyword) || keyword.includes(k))
        );

        expect(foundDomainKeywords.length).toBeGreaterThan(testCase.expectedKeywords.length * 0.5);
      }
    });
  });

  describe('Edge Case Handling', () => {
    test('should handle extremely short task descriptions', async () => {
      const shortTasks = ['fix', 'build', 'test', 'deploy', 'help'];

      for (const task of shortTasks) {
        const analysis = await taskAnalyzer.analyze({
          task,
          params: [],
          context: {
            workingDirectory: process.cwd(),
            environment: process.env,
            options: {}
          }
        });

        expect(analysis).toBeDefined();
        expect(analysis.task).toBe(task);
        expect(analysis.taskType).toBeDefined();
        expect(analysis.confidence).toBeGreaterThan(50); // Should have reasonable confidence even for short tasks
      }
    });

    test('should handle tasks with technical jargon and acronyms', async () => {
      const jargonTask = 'Implement OAuth 2.0 SSO with SAML integration, JWT tokens, and RBAC using LDAP directory for B2B SaaS application with GraphQL API and REST endpoints';

      const analysis = await taskAnalyzer.analyze({
        task: jargonTask,
        params: [],
        context: {
          workingDirectory: process.cwd(),
          environment: process.env,
          options: {}
        }
      });

      // Should handle technical jargon appropriately
      expect(analysis.taskType).toBe('development');
      expect(analysis.complexity).toMatch(/^(high|very_high)$/);

      // Should identify authentication/security requirements
      expect(analysis.requiredResources).toContain('code_generation');
      expect(analysis.keywords.some(k => k.includes('oauth') || k.includes('auth'))).toBe(true);
    });

    test('should handle multilingual and international task descriptions', async () => {
      const internationalTasks = [
        'Build a système de gestion for e-commerce with français locale',
        'Create アプリケーション with 国際化 support',
        'Desarrollar una aplicación web con múltiples idiomas'
      ];

      for (const task of internationalTasks) {
        const analysis = await taskAnalyzer.analyze({
          task,
          params: [],
          context: {
            workingDirectory: process.cwd(),
            environment: process.env,
            options: {}
          }
        });

        expect(analysis).toBeDefined();
        expect(analysis.taskType).toBe('development');
        // Should handle international text without crashing
        expect(analysis.keywords.length).toBeGreaterThan(0);
      }
    });

    test('should handle tasks with version numbers and specific technologies', async () => {
      const versionedTask = 'Upgrade React from v16.14.0 to v18.2.0, migrate to React Hooks, update testing library from @testing-library/react v11 to v13, and ensure TypeScript 4.9 compatibility';

      const analysis = await taskAnalyzer.analyze({
        task: versionedTask,
        params: [],
        context: {
          workingDirectory: process.cwd(),
          environment: process.env,
          options: {}
        }
      });

      expect(analysis.taskType).toBe('development');
      expect(analysis.keywords).toContain('react');
      expect(analysis.keywords).toContain('upgrade');
      expect(analysis.keywords).toContain('migrate');

      // Should understand this is a significant task requiring careful coordination
      expect(analysis.complexity).toMatch(/^(medium|high|very_high)$/);
      expect(analysis.suggestedAgents).toBeGreaterThan(2);
    });
  });

  describe('Quality Metrics and Validation', () => {
    test('should generate prompts meeting minimum quality standards', async () => {
      const qualityTestCases = [
        'Build a comprehensive web application',
        'Research AI optimization techniques',
        'Deploy microservices architecture',
        'Optimize database performance'
      ];

      for (const task of qualityTestCases) {
        let generatedPrompt = '';
        const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(async (filePath, content) => {
          if (typeof filePath === 'string' && filePath.includes('unified-work-prompt')) {
            generatedPrompt = content.toString();
          }
        });

        try {
          const command = workCommand.createCommand();
          await command.parseAsync(['node', 'test', task, '--dry-run'], { from: 'user' });
          await new Promise(resolve => setTimeout(resolve, 50));

          // Quality metrics
          const qualityMetrics = this.calculatePromptQuality(generatedPrompt);

          expect(qualityMetrics.completeness).toBeGreaterThan(0.8);
          expect(qualityMetrics.clarity).toBeGreaterThan(0.7);
          expect(qualityMetrics.actionability).toBeGreaterThan(0.8);
          expect(qualityMetrics.technical_accuracy).toBeGreaterThan(0.9);

        } finally {
          writeFileSpy.mockRestore();
        }
      }
    });

    test('should maintain consistency across similar tasks', async () => {
      const similarTasks = [
        'Build a REST API for user management',
        'Create REST API with user operations',
        'Develop REST API handling user data'
      ];

      const analyses: TaskAnalysis[] = [];
      for (const task of similarTasks) {
        const analysis = await taskAnalyzer.analyze({
          task,
          params: [],
          context: {
            workingDirectory: process.cwd(),
            environment: process.env,
            options: {}
          }
        });
        analyses.push(analysis);
      }

      // Should have consistent task type
      const taskTypes = [...new Set(analyses.map(a => a.taskType))];
      expect(taskTypes).toHaveLength(1);
      expect(taskTypes[0]).toBe('development');

      // Should have similar complexity
      const complexities = analyses.map(a => a.complexity);
      const uniqueComplexities = [...new Set(complexities)];
      expect(uniqueComplexities.length).toBeLessThanOrEqual(2); // Allow for some variation

      // Should have similar agent suggestions (within 2 agents)
      const agentCounts = analyses.map(a => a.suggestedAgents);
      const maxAgents = Math.max(...agentCounts);
      const minAgents = Math.min(...agentCounts);
      expect(maxAgents - minAgents).toBeLessThanOrEqual(2);
    });

    test('should validate prompt template integrity', async () => {
      let generatedPrompt = '';
      const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(async (filePath, content) => {
        if (typeof filePath === 'string' && filePath.includes('unified-work-prompt')) {
          generatedPrompt = content.toString();
        }
      });

      try {
        const command = workCommand.createCommand();
        await command.parseAsync(['node', 'test', 'template integrity test', '--dry-run'], { from: 'user' });
        await new Promise(resolve => setTimeout(resolve, 100));

        // Template integrity checks
        const templateIntegrity = this.validateTemplateIntegrity(generatedPrompt);

        expect(templateIntegrity.hasRequiredSections).toBe(true);
        expect(templateIntegrity.hasProperFormatting).toBe(true);
        expect(templateIntegrity.hasValidVariables).toBe(true);
        expect(templateIntegrity.missingElements).toHaveLength(0);

      } finally {
        writeFileSpy.mockRestore();
      }
    });
  });

  /**
   * Calculate prompt quality metrics
   */
  private calculatePromptQuality(prompt: string):
    completeness: number;
    clarity: number;
    actionability: number;
    technical_accuracy: number;{
    const requiredElements = [
      'UNIFIED WORK COMMAND',
      'MANDATORY PRE-TASK REQUIREMENT',
      'mcp__claude-flow__swarm_init',
      'mcp__claude-flow__agent_spawn',
      'BatchTool',
      'hooks',
      'coordination'
    ];

    const presentElements = requiredElements.filter(element => prompt.includes(element));
    const completeness = presentElements.length / requiredElements.length;

    // Clarity: based on structure and readability
    const hasHeaders = (prompt.match(/^[🔧🚨📋⚡🎯💡]/gmu) || []).length > 5;
    const hasExamples = prompt.includes('Example:') || prompt.includes('example');
    const clarity = (hasHeaders ? 0.5 : 0) + (hasExamples ? 0.5 : 0);

    // Actionability: contains specific instructions and commands
    const actionableElements = ['BatchTool', 'mcp__claude-flow__', 'hooks', 'Execute', 'Initialize'];
    const presentActionable = actionableElements.filter(element => prompt.includes(element));
    const actionability = presentActionable.length / actionableElements.length;

    // Technical accuracy: contains valid MCP tool names and proper syntax
    const technicalElements = ['swarm_init', 'agent_spawn', 'task_orchestrate', 'memory_usage'];
    const presentTechnical = technicalElements.filter(element => prompt.includes(element));
    const technical_accuracy = presentTechnical.length / technicalElements.length;

    return {
      completeness,
      clarity,
      actionability,
      technical_accuracy
    };
  }

  /**
   * Validate template integrity
   */
  private validateTemplateIntegrity(prompt: string):
    hasRequiredSections: boolean;
    hasProperFormatting: boolean;
    hasValidVariables: boolean;
    missingElements: string[];{
    const requiredSections = [
      'UNIFIED WORK COMMAND',
      'COORDINATION HOOKS SYSTEM',
      'PARALLEL EXECUTION REMINDER',
      'BEGIN UNIFIED WORK EXECUTION'
    ];

    const missingElements: string[] = [];
    requiredSections.forEach(section => {
      if (!prompt.includes(section)) {
        missingElements.push(section);
      }
    });

    const hasRequiredSections = missingElements.length === 0;
    const hasProperFormatting = prompt.includes('═══') && prompt.includes('🚀');
    const hasValidVariables = !prompt.includes('${') || prompt.includes('Session ID:');

    return {
      hasRequiredSections,
      hasProperFormatting,
      hasValidVariables,
      missingElements
    };
  }
});
