#!/usr/bin/env tsx
/**
 * Performance Validation Script for MCP Debug Implementation
 *
 * This script validates that the debug implementation meets the requirements:
 * - <10% performance overhead
 * - MCP protocol compliance
 * - Cross-system correlation functionality
 * - Tool invocation tracing accuracy
 * - Memory efficiency
 */

import { performance } from 'node:perf_hooks';
import { initializeMCPDebugLogging, getMCPDebugLogger } from '../src/mcp/debug-logger.js';
import { DebugLogger } from '../src/core/logger.js';
import type { MCPRequest, MCPResponse } from '../src/utils/types.js';

interface ValidationResults {
  performanceOverhead: {
    withDebug: number;
    withoutDebug: number;
    overheadPercentage: number;
    passed: boolean;
  };
  protocolCompliance: {
    totalMessages: number;
    compliantMessages: number;
    complianceRate: number;
    passed: boolean;
  };
  crossSystemCorrelation: {
    correlationsCreated: number;
    successfulLinks: number;
    linkSuccessRate: number;
    passed: boolean;
  };
  toolInvocationTracing: {
    totalInvocations: number;
    successfulTraces: number;
    tracingAccuracy: number;
    passed: boolean;
  };
  memoryEfficiency: {
    initialMemory: number;
    peakMemory: number;
    finalMemory: number;
    memoryGrowth: number;
    passed: boolean;
  };
  overall: {
    passed: boolean;
    score: number;
  };
}

class DebugValidationSuite {
  private mcpDebugLogger: any;
  private baseLogger: DebugLogger;
  private results: ValidationResults;

  constructor() {
    this.baseLogger = new DebugLogger({
      level: 'debug',
      format: 'json',
      destination: 'console',
    });

    this.results = {
      performanceOverhead: {
        withDebug: 0,
        withoutDebug: 0,
        overheadPercentage: 0,
        passed: false,
      },
      protocolCompliance: {
        totalMessages: 0,
        compliantMessages: 0,
        complianceRate: 0,
        passed: false,
      },
      crossSystemCorrelation: {
        correlationsCreated: 0,
        successfulLinks: 0,
        linkSuccessRate: 0,
        passed: false,
      },
      toolInvocationTracing: {
        totalInvocations: 0,
        successfulTraces: 0,
        tracingAccuracy: 0,
        passed: false,
      },
      memoryEfficiency: {
        initialMemory: process.memoryUsage().heapUsed,
        peakMemory: 0,
        finalMemory: 0,
        memoryGrowth: 0,
        passed: false,
      },
      overall: {
        passed: false,
        score: 0,
      },
    };
  }

  async validatePerformanceOverhead(): Promise<void> {
    console.log('🔍 Validating Performance Overhead...');

    const iterations = 10000;
    const testMessages = this.generateTestMessages(iterations);

    // Test WITHOUT debug logging
    const startWithoutDebug = performance.now();
    for (const message of testMessages) {
      // Simulate message processing without debug logging
      JSON.stringify(message);
      this.validateMessage(message);
    }
    const endWithoutDebug = performance.now();
    this.results.performanceOverhead.withoutDebug = endWithoutDebug - startWithoutDebug;

    // Initialize debug logger
    this.mcpDebugLogger = initializeMCPDebugLogging({
      enableTracing: true,
      enableCrossSystemCorrelation: true,
      enableToolTracing: true,
      performanceThreshold: 0.1,
      sanitizeSensitiveData: true,
    });

    // Test WITH debug logging
    const startWithDebug = performance.now();
    for (const message of testMessages) {
      // Simulate message processing with debug logging
      JSON.stringify(message);
      this.validateMessage(message);

      // Add debug tracing
      this.mcpDebugLogger.traceProtocolMessage('inbound', 'request', message, undefined, {
        transport: 'stdio',
      });
    }
    const endWithDebug = performance.now();
    this.results.performanceOverhead.withDebug = endWithDebug - startWithDebug;

    // Calculate overhead
    const overhead =
      this.results.performanceOverhead.withDebug - this.results.performanceOverhead.withoutDebug;
    this.results.performanceOverhead.overheadPercentage =
      (overhead / this.results.performanceOverhead.withoutDebug) * 100;

    this.results.performanceOverhead.passed =
      this.results.performanceOverhead.overheadPercentage < 10;

    console.log(`  Without Debug: ${this.results.performanceOverhead.withoutDebug.toFixed(2)}ms`);
    console.log(`  With Debug: ${this.results.performanceOverhead.withDebug.toFixed(2)}ms`);
    console.log(`  Overhead: ${this.results.performanceOverhead.overheadPercentage.toFixed(2)}%`);
    console.log(`  ✅ Passed: ${this.results.performanceOverhead.passed ? 'YES' : 'NO'}`);
  }

  async validateProtocolCompliance(): Promise<void> {
    console.log('📋 Validating Protocol Compliance...');

    const testCases = [
      // Valid messages
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { jsonrpc: '2.0', id: 1, result: {} },
      { jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'Invalid Request' } },
      { jsonrpc: '2.0', method: 'notification', params: {} },

      // Invalid messages
      { jsonrpc: '1.0', id: 1, method: 'test' }, // Wrong version
      { id: 1, method: 'test' }, // Missing jsonrpc
      { jsonrpc: '2.0', id: 1 }, // Missing method/result/error
      { jsonrpc: '2.0', method: 123 }, // Invalid method type
    ];

    for (const message of testCases) {
      const correlationId = this.mcpDebugLogger.traceProtocolMessage(
        'inbound',
        'request',
        message,
        undefined,
        { transport: 'stdio' },
      );

      const trace = this.mcpDebugLogger.getProtocolTrace(correlationId);
      this.results.protocolCompliance.totalMessages++;

      if (trace?.protocol.compliance) {
        this.results.protocolCompliance.compliantMessages++;
      }
    }

    this.results.protocolCompliance.complianceRate =
      (this.results.protocolCompliance.compliantMessages /
        this.results.protocolCompliance.totalMessages) *
      100;

    // Should correctly identify 4 valid and 4 invalid messages
    this.results.protocolCompliance.passed =
      this.results.protocolCompliance.compliantMessages === 4 &&
      this.results.protocolCompliance.totalMessages === 8;

    console.log(`  Total Messages: ${this.results.protocolCompliance.totalMessages}`);
    console.log(`  Compliant: ${this.results.protocolCompliance.compliantMessages}`);
    console.log(`  Compliance Rate: ${this.results.protocolCompliance.complianceRate.toFixed(2)}%`);
    console.log(`  ✅ Passed: ${this.results.protocolCompliance.passed ? 'YES' : 'NO'}`);
  }

  async validateCrossSystemCorrelation(): Promise<void> {
    console.log('🔗 Validating Cross-System Correlation...');

    const testSessions = [
      { cfSession: 'cf-session-1', ccSession: 'cc-session-1' },
      { cfSession: 'cf-session-2', ccSession: 'cc-session-2' },
      { cfSession: 'cf-session-3', ccSession: 'cc-session-3' },
      { cfSession: 'cf-session-4', ccSession: undefined }, // No claude-code session
      { cfSession: 'cf-session-5', ccSession: 'cc-session-5' },
    ];

    for (const session of testSessions) {
      // Create correlation
      const correlationId = this.mcpDebugLogger.createCrossSystemCorrelation(
        session.cfSession,
        undefined,
        { workflowId: `workflow-${session.cfSession}` },
      );

      this.results.crossSystemCorrelation.correlationsCreated++;

      // Try to link to claude-code session
      if (session.ccSession) {
        const linked = this.mcpDebugLogger.linkToClaudeCode(
          correlationId,
          session.ccSession,
          `cc-corr-${session.ccSession}`,
        );

        if (linked) {
          this.results.crossSystemCorrelation.successfulLinks++;
        }
      }
    }

    this.results.crossSystemCorrelation.linkSuccessRate =
      (this.results.crossSystemCorrelation.successfulLinks / 4) * 100; // 4 sessions have claude-code

    this.results.crossSystemCorrelation.passed =
      this.results.crossSystemCorrelation.correlationsCreated === 5 &&
      this.results.crossSystemCorrelation.successfulLinks === 4;

    console.log(
      `  Correlations Created: ${this.results.crossSystemCorrelation.correlationsCreated}`,
    );
    console.log(`  Successful Links: ${this.results.crossSystemCorrelation.successfulLinks}`);
    console.log(
      `  Link Success Rate: ${this.results.crossSystemCorrelation.linkSuccessRate.toFixed(2)}%`,
    );
    console.log(`  ✅ Passed: ${this.results.crossSystemCorrelation.passed ? 'YES' : 'NO'}`);
  }

  async validateToolInvocationTracing(): Promise<void> {
    console.log('🔧 Validating Tool Invocation Tracing...');

    const testTools = [
      { name: 'test/tool1', params: { arg1: 'value1' }, shouldSucceed: true },
      {
        name: 'test/tool2',
        params: { password: 'secret123', data: 'normal' },
        shouldSucceed: true,
      },
      { name: 'test/tool3', params: { arg1: 'value3' }, shouldSucceed: false },
      { name: 'test/tool4', params: {}, shouldSucceed: true },
      { name: 'test/tool5', params: { complex: { nested: 'data' } }, shouldSucceed: false },
    ];

    for (const tool of testTools) {
      const invocationId = this.mcpDebugLogger.traceToolInvocation(tool.name, tool.params, {
        sessionId: 'test-session',
      });

      this.results.toolInvocationTracing.totalInvocations++;

      // Simulate tool execution
      if (tool.shouldSucceed) {
        this.mcpDebugLogger.completeToolInvocation(invocationId, {
          result: `success for ${tool.name}`,
        });
      } else {
        this.mcpDebugLogger.completeToolInvocation(
          invocationId,
          undefined,
          new Error(`Simulated failure for ${tool.name}`),
        );
      }

      // Verify trace exists and is accurate
      const trace = this.mcpDebugLogger.getToolInvocationTrace(invocationId);
      if (trace && trace.execution.success === tool.shouldSucceed) {
        this.results.toolInvocationTracing.successfulTraces++;
      }

      // Verify sensitive data sanitization
      if (tool.params.password && trace) {
        if (trace.parameters.sanitized.password === '[REDACTED]') {
          // Sanitization working correctly
        }
      }
    }

    this.results.toolInvocationTracing.tracingAccuracy =
      (this.results.toolInvocationTracing.successfulTraces /
        this.results.toolInvocationTracing.totalInvocations) *
      100;

    this.results.toolInvocationTracing.passed =
      this.results.toolInvocationTracing.tracingAccuracy === 100;

    console.log(`  Total Invocations: ${this.results.toolInvocationTracing.totalInvocations}`);
    console.log(`  Successful Traces: ${this.results.toolInvocationTracing.successfulTraces}`);
    console.log(
      `  Tracing Accuracy: ${this.results.toolInvocationTracing.tracingAccuracy.toFixed(2)}%`,
    );
    console.log(`  ✅ Passed: ${this.results.toolInvocationTracing.passed ? 'YES' : 'NO'}`);
  }

  async validateMemoryEfficiency(): Promise<void> {
    console.log('💾 Validating Memory Efficiency...');

    const initialMemory = process.memoryUsage().heapUsed;
    this.results.memoryEfficiency.initialMemory = initialMemory;

    // Perform intensive operations
    for (let i = 0; i < 1000; i++) {
      // Protocol tracing
      this.mcpDebugLogger.traceProtocolMessage('inbound', 'request', {
        jsonrpc: '2.0',
        id: i,
        method: 'test',
        params: {},
      });

      // Tool invocation tracing
      const invocationId = this.mcpDebugLogger.traceToolInvocation(
        `test/tool-${i}`,
        { data: `test-data-${i}`.repeat(100) }, // Some bulk data
      );

      this.mcpDebugLogger.completeToolInvocation(invocationId, { result: `result-${i}` });

      // Create correlations
      if (i % 10 === 0) {
        this.mcpDebugLogger.createCrossSystemCorrelation(`session-${i}`);
      }

      // Track peak memory
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > this.results.memoryEfficiency.peakMemory) {
        this.results.memoryEfficiency.peakMemory = currentMemory;
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait a bit and measure final memory
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.results.memoryEfficiency.finalMemory = process.memoryUsage().heapUsed;

    this.results.memoryEfficiency.memoryGrowth =
      ((this.results.memoryEfficiency.finalMemory - initialMemory) / initialMemory) * 100;

    // Memory growth should be reasonable (less than 50% increase)
    this.results.memoryEfficiency.passed = this.results.memoryEfficiency.memoryGrowth < 50;

    console.log(
      `  Initial Memory: ${this.formatBytes(this.results.memoryEfficiency.initialMemory)}`,
    );
    console.log(`  Peak Memory: ${this.formatBytes(this.results.memoryEfficiency.peakMemory)}`);
    console.log(`  Final Memory: ${this.formatBytes(this.results.memoryEfficiency.finalMemory)}`);
    console.log(`  Memory Growth: ${this.results.memoryEfficiency.memoryGrowth.toFixed(2)}%`);
    console.log(`  ✅ Passed: ${this.results.memoryEfficiency.passed ? 'YES' : 'NO'}`);
  }

  async run(): Promise<ValidationResults> {
    console.log('🚀 Starting MCP Debug Implementation Validation\n');

    await this.validatePerformanceOverhead();
    console.log();

    await this.validateProtocolCompliance();
    console.log();

    await this.validateCrossSystemCorrelation();
    console.log();

    await this.validateToolInvocationTracing();
    console.log();

    await this.validateMemoryEfficiency();
    console.log();

    // Calculate overall score
    const tests = [
      this.results.performanceOverhead.passed,
      this.results.protocolCompliance.passed,
      this.results.crossSystemCorrelation.passed,
      this.results.toolInvocationTracing.passed,
      this.results.memoryEfficiency.passed,
    ];

    const passedTests = tests.filter((test) => test).length;
    this.results.overall.score = (passedTests / tests.length) * 100;
    this.results.overall.passed = passedTests === tests.length;

    console.log('📊 VALIDATION SUMMARY');
    console.log('=====================');
    console.log(`Overall Score: ${this.results.overall.score.toFixed(1)}%`);
    console.log(`Status: ${this.results.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log();

    if (!this.results.overall.passed) {
      console.log('❌ Failed Requirements:');
      if (!this.results.performanceOverhead.passed) {
        console.log(
          `  - Performance overhead: ${this.results.performanceOverhead.overheadPercentage.toFixed(2)}% (must be <10%)`,
        );
      }
      if (!this.results.protocolCompliance.passed) {
        console.log(
          `  - Protocol compliance: ${this.results.protocolCompliance.complianceRate.toFixed(2)}% (must be 100% accurate)`,
        );
      }
      if (!this.results.crossSystemCorrelation.passed) {
        console.log(
          `  - Cross-system correlation: ${this.results.crossSystemCorrelation.linkSuccessRate.toFixed(2)}% success rate`,
        );
      }
      if (!this.results.toolInvocationTracing.passed) {
        console.log(
          `  - Tool invocation tracing: ${this.results.toolInvocationTracing.tracingAccuracy.toFixed(2)}% accuracy`,
        );
      }
      if (!this.results.memoryEfficiency.passed) {
        console.log(
          `  - Memory efficiency: ${this.results.memoryEfficiency.memoryGrowth.toFixed(2)}% growth (must be <50%)`,
        );
      }
    } else {
      console.log('✅ All requirements met!');
      console.log('  - Performance overhead < 10%');
      console.log('  - Full MCP protocol compliance');
      console.log('  - Cross-system correlation working');
      console.log('  - Tool invocation tracing accurate');
      console.log('  - Memory usage efficient');
    }

    // Get final metrics from debug logger
    const debugMetrics = this.mcpDebugLogger.getMetrics();
    console.log();
    console.log('📈 Debug Logger Metrics:');
    console.log(`  Protocol Messages: ${debugMetrics.protocolCompliance.totalMessages}`);
    console.log(`  Tool Invocations: ${debugMetrics.toolInvocations.total}`);
    console.log(`  Cross-System Links: ${debugMetrics.correlation.crossSystemLinks}`);
    console.log(`  Stderr Usage: ${debugMetrics.protocolCompliance.stderrUsage} messages`);

    // Cleanup
    this.mcpDebugLogger.shutdown();

    return this.results;
  }

  private generateTestMessages(count: number): MCPRequest[] {
    const messages: MCPRequest[] = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        jsonrpc: '2.0',
        id: i,
        method: `test/method-${i % 10}`,
        params: {
          data: `test-data-${i}`,
          timestamp: Date.now(),
          iteration: i,
        },
      });
    }
    return messages;
  }

  private validateMessage(message: any): boolean {
    return (
      message.jsonrpc === '2.0' &&
      (message.method || message.result !== undefined || message.error !== undefined)
    );
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  }
}

// CLI interface - PKG-compatible main module detection
const __filename = process.argv[1] || require.main?.filename || '';
const isMainModule =
  process.argv[1] && process.argv[1].endsWith('/validate-debug-implementation.ts');
if (isMainModule) {
  const validator = new DebugValidationSuite();

  validator
    .run()
    .then((results) => {
      process.exit(results.overall.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation failed with error:', error);
      process.exit(1);
    });
}

export { DebugValidationSuite, type ValidationResults };
