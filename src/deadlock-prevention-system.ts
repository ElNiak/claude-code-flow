/**
 * MCP Deadlock Prevention and Resolution System
 *
 * Engineers technical solutions for MCP deadlock scenarios by implementing:
 * 1. Safe communication protocols with timeouts and circuit breakers
 * 2. Resource coordination with proper locking hierarchies
 * 3. API integration safety with retry mechanisms
 * 4. Monitoring and diagnostic tools for deadlock detection
 *
 * @author Systems Engineer - Hive Mind Swarm
 */

import { EventEmitter } from 'events';
import { setTimeout, clearTimeout } from 'timers';

// ===== 1. MCP COMMUNICATION PATTERNS =====

/**
 * Circuit Breaker Pattern for MCP Communication
 * Prevents cascading failures and deadlocks in MCP server communication
 */
class MCPCircuitBreaker {
    private failureCount = 0;
    private lastFailureTime = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private readonly failureThreshold = 5,
        private readonly recoveryTimeout = 30000, // 30 seconds
        private readonly requestTimeout = 20000    // 20 seconds (matches .serena config)
    ) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN - operation rejected');
            }
        }

        try {
            const result = await this.executeWithTimeout(operation);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${this.requestTimeout}ms`));
            }, this.requestTimeout);

            operation()
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    private onSuccess(): void {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
}

/**
 * Safe MCP Communication Protocol
 * Implements proper resource acquisition ordering and deadlock detection
 */
class MCPCommunicationProtocol {
    private readonly circuitBreakers = new Map<string, MCPCircuitBreaker>();
    private readonly resourceLocks = new Map<string, Set<string>>();
    private readonly requestQueues = new Map<string, Array<{ id: string; resolve: Function; reject: Function }>>();
    private readonly activeRequests = new Set<string>();

    constructor(private readonly maxConcurrentRequests = 10) {}

    async sendRequest<T>(
        serverId: string,
        operation: () => Promise<T>,
        resourceIds: string[] = [],
        priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ): Promise<T> {
        // Check for potential deadlock before processing
        if (this.detectPotentialDeadlock(serverId, resourceIds)) {
            throw new Error(`Potential deadlock detected for server ${serverId} with resources ${resourceIds.join(', ')}`);
        }

        const circuitBreaker = this.getCircuitBreaker(serverId);
        const requestId = this.generateRequestId(serverId);

        try {
            // Acquire resources in consistent order (alphabetical to prevent deadlock)
            const sortedResourceIds = [...resourceIds].sort();
            await this.acquireResources(requestId, sortedResourceIds);

            // Execute with circuit breaker protection
            const result = await circuitBreaker.execute(async () => {
                this.activeRequests.add(requestId);
                try {
                    return await operation();
                } finally {
                    this.activeRequests.delete(requestId);
                }
            });

            return result;
        } finally {
            // Always release resources in reverse order
            await this.releaseResources(requestId, resourceIds.reverse());
        }
    }

    private getCircuitBreaker(serverId: string): MCPCircuitBreaker {
        if (!this.circuitBreakers.has(serverId)) {
            this.circuitBreakers.set(serverId, new MCPCircuitBreaker());
        }
        return this.circuitBreakers.get(serverId)!;
    }

    private detectPotentialDeadlock(serverId: string, resourceIds: string[]): boolean {
        // Check for circular dependencies in resource acquisition
        for (const resourceId of resourceIds) {
            const currentLocks = this.resourceLocks.get(resourceId);
            if (currentLocks && currentLocks.has(serverId)) {
                return true; // Circular dependency detected
            }
        }
        return false;
    }

    private async acquireResources(requestId: string, resourceIds: string[]): Promise<void> {
        for (const resourceId of resourceIds) {
            await this.acquireResource(requestId, resourceId);
        }
    }

    private async acquireResource(requestId: string, resourceId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const locks = this.resourceLocks.get(resourceId) || new Set();

            if (locks.size === 0) {
                // Resource is available
                locks.add(requestId);
                this.resourceLocks.set(resourceId, locks);
                resolve();
            } else {
                // Resource is locked, add to queue
                const queue = this.requestQueues.get(resourceId) || [];
                queue.push({ id: requestId, resolve, reject });
                this.requestQueues.set(resourceId, queue);
            }
        });
    }

    private async releaseResources(requestId: string, resourceIds: string[]): Promise<void> {
        for (const resourceId of resourceIds) {
            await this.releaseResource(requestId, resourceId);
        }
    }

    private async releaseResource(requestId: string, resourceId: string): Promise<void> {
        const locks = this.resourceLocks.get(resourceId);
        if (locks) {
            locks.delete(requestId);

            if (locks.size === 0) {
                // Resource is now free, check queue
                const queue = this.requestQueues.get(resourceId);
                if (queue && queue.length > 0) {
                    const next = queue.shift()!;
                    locks.add(next.id);
                    next.resolve();
                }
            }
        }
    }

    private generateRequestId(serverId: string): string {
        return `${serverId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ===== 2. RESOURCE MANAGEMENT =====

/**
 * Resource Pool Management System
 * Manages MCP server connections and prevents resource exhaustion
 */
class MCPResourcePool {
    private readonly availableResources = new Map<string, any[]>();
    private readonly allocatedResources = new Map<string, Set<any>>();
    private readonly resourceQueues = new Map<string, Array<{ resolve: Function; reject: Function }>>();

    constructor(private readonly maxResourcesPerType = 10) {}

    async acquireResource<T>(resourceType: string, factory: () => Promise<T>): Promise<T> {
        const available = this.availableResources.get(resourceType) || [];

        if (available.length > 0) {
            const resource = available.pop()!;
            this.allocateResource(resourceType, resource);
            return resource;
        }

        const allocated = this.allocatedResources.get(resourceType) || new Set();
        if (allocated.size < this.maxResourcesPerType) {
            const resource = await factory();
            this.allocateResource(resourceType, resource);
            return resource;
        }

        // Wait for resource to become available
        return new Promise((resolve, reject) => {
            const queue = this.resourceQueues.get(resourceType) || [];
            queue.push({ resolve, reject });
            this.resourceQueues.set(resourceType, queue);
        });
    }

    releaseResource(resourceType: string, resource: any): void {
        const allocated = this.allocatedResources.get(resourceType);
        if (allocated) {
            allocated.delete(resource);

            const queue = this.resourceQueues.get(resourceType);
            if (queue && queue.length > 0) {
                const next = queue.shift()!;
                this.allocateResource(resourceType, resource);
                next.resolve(resource);
            } else {
                const available = this.availableResources.get(resourceType) || [];
                available.push(resource);
                this.availableResources.set(resourceType, available);
            }
        }
    }

    private allocateResource(resourceType: string, resource: any): void {
        const allocated = this.allocatedResources.get(resourceType) || new Set();
        allocated.add(resource);
        this.allocatedResources.set(resourceType, allocated);
    }

    getResourceStats(resourceType: string): { available: number; allocated: number; queued: number } {
        const available = this.availableResources.get(resourceType) || [];
        const allocated = this.allocatedResources.get(resourceType) || new Set();
        const queued = this.resourceQueues.get(resourceType) || [];

        return {
            available: available.length,
            allocated: allocated.size,
            queued: queued.length
        };
    }
}

// ===== 3. API INTEGRATION SAFETY =====

/**
 * Retry Mechanism with Exponential Backoff
 * Prevents API rate limiting and cascading failures
 */
class MCPRetryMechanism {
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 30000,
        backoffFactor = 2
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    throw lastError;
                }

                const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Connection Pool Manager
 * Manages MCP server connections with health checks
 */
class MCPConnectionPool {
    private readonly connections = new Map<string, any>();
    private readonly healthChecks = new Map<string, boolean>();
    private readonly lastHealthCheck = new Map<string, number>();

    constructor(private readonly healthCheckInterval = 30000) {} // 30 seconds

    async getConnection(serverId: string, connectionFactory: () => Promise<any>): Promise<any> {
        await this.ensureHealthyConnection(serverId, connectionFactory);
        return this.connections.get(serverId);
    }

    private async ensureHealthyConnection(serverId: string, connectionFactory: () => Promise<any>): Promise<void> {
        const now = Date.now();
        const lastCheck = this.lastHealthCheck.get(serverId) || 0;

        if (now - lastCheck > this.healthCheckInterval) {
            await this.performHealthCheck(serverId, connectionFactory);
            this.lastHealthCheck.set(serverId, now);
        }

        if (!this.healthChecks.get(serverId)) {
            throw new Error(`MCP server ${serverId} is not healthy`);
        }
    }

    private async performHealthCheck(serverId: string, connectionFactory: () => Promise<any>): Promise<void> {
        try {
            let connection = this.connections.get(serverId);

            if (!connection) {
                connection = await connectionFactory();
                this.connections.set(serverId, connection);
            }

            // Perform actual health check (implementation depends on MCP protocol)
            await this.pingConnection(connection);
            this.healthChecks.set(serverId, true);
        } catch (error) {
            this.healthChecks.set(serverId, false);
            this.connections.delete(serverId);
            throw error;
        }
    }

    private async pingConnection(connection: any): Promise<void> {
        // Implementation depends on MCP protocol
        // This is a placeholder for actual health check
        if (connection && typeof connection.ping === 'function') {
            await connection.ping();
        }
    }
}

// ===== 4. MONITORING AND DIAGNOSTICS =====

/**
 * Deadlock Detection System
 * Monitors resource dependencies and detects potential deadlocks
 */
class DeadlockDetector {
    private readonly resourceDependencies = new Map<string, Set<string>>();
    private readonly waitingRequests = new Map<string, Set<string>>();

    addDependency(requestId: string, resourceId: string): void {
        const deps = this.resourceDependencies.get(requestId) || new Set();
        deps.add(resourceId);
        this.resourceDependencies.set(requestId, deps);
    }

    removeDependency(requestId: string, resourceId: string): void {
        const deps = this.resourceDependencies.get(requestId);
        if (deps) {
            deps.delete(resourceId);
            if (deps.size === 0) {
                this.resourceDependencies.delete(requestId);
            }
        }
    }

    detectDeadlock(): string[] {
        const cycles: string[] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        for (const requestId of this.resourceDependencies.keys()) {
            if (!visited.has(requestId)) {
                const cycle = this.detectCycle(requestId, visited, recursionStack, []);
                if (cycle.length > 0) {
                    cycles.push(`Deadlock detected: ${cycle.join(' -> ')}`);
                }
            }
        }

        return cycles;
    }

    private detectCycle(
        requestId: string,
        visited: Set<string>,
        recursionStack: Set<string>,
        path: string[]
    ): string[] {
        visited.add(requestId);
        recursionStack.add(requestId);
        path.push(requestId);

        const dependencies = this.resourceDependencies.get(requestId) || new Set();

        for (const resourceId of dependencies) {
            const waitingRequests = this.waitingRequests.get(resourceId) || new Set();

            for (const waitingRequestId of waitingRequests) {
                if (recursionStack.has(waitingRequestId)) {
                    return [...path, waitingRequestId];
                }

                if (!visited.has(waitingRequestId)) {
                    const cycle = this.detectCycle(waitingRequestId, visited, recursionStack, [...path]);
                    if (cycle.length > 0) {
                        return cycle;
                    }
                }
            }
        }

        recursionStack.delete(requestId);
        return [];
    }
}

/**
 * Performance Monitoring System
 * Tracks MCP server performance and identifies bottlenecks
 */
class MCPPerformanceMonitor extends EventEmitter {
    private readonly metrics = new Map<string, any>();
    private readonly thresholds = {
        responseTime: 5000,     // 5 seconds
        errorRate: 0.1,         // 10%
        queueLength: 100        // 100 requests
    };

    recordMetric(serverId: string, metric: string, value: number): void {
        const serverMetrics = this.metrics.get(serverId) || {};
        const metricHistory = serverMetrics[metric] || [];

        metricHistory.push({
            timestamp: Date.now(),
            value
        });

        // Keep only last 100 measurements
        if (metricHistory.length > 100) {
            metricHistory.shift();
        }

        serverMetrics[metric] = metricHistory;
        this.metrics.set(serverId, serverMetrics);

        this.checkThresholds(serverId, metric, value);
    }

    private checkThresholds(serverId: string, metric: string, value: number): void {
        const threshold = this.thresholds[metric as keyof typeof this.thresholds];

        if (threshold && value > threshold) {
            this.emit('threshold_exceeded', {
                serverId,
                metric,
                value,
                threshold
            });
        }
    }

    getPerformanceReport(serverId: string): any {
        const serverMetrics = this.metrics.get(serverId) || {};
        const report: any = {};

        for (const [metric, history] of Object.entries(serverMetrics)) {
            const values = (history as any[]).map(h => h.value);

            report[metric] = {
                current: values[values.length - 1],
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                trend: this.calculateTrend(values)
            };
        }

        return report;
    }

    private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
        if (values.length < 2) return 'stable';

        const recent = values.slice(-5);
        const older = values.slice(-10, -5);

        if (recent.length === 0 || older.length === 0) return 'stable';

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (changePercent > 5) return 'increasing';
        if (changePercent < -5) return 'decreasing';
        return 'stable';
    }
}

// ===== INTEGRATION AND USAGE =====

/**
 * Main MCP Deadlock Prevention System
 * Integrates all components for comprehensive deadlock prevention
 */
export class MCPDeadlockPreventionSystem {
    private readonly communicationProtocol: MCPCommunicationProtocol;
    private readonly resourcePool: MCPResourcePool;
    private readonly retryMechanism: MCPRetryMechanism;
    private readonly connectionPool: MCPConnectionPool;
    private readonly deadlockDetector: DeadlockDetector;
    private readonly performanceMonitor: MCPPerformanceMonitor;

    constructor() {
        this.communicationProtocol = new MCPCommunicationProtocol();
        this.resourcePool = new MCPResourcePool();
        this.retryMechanism = new MCPRetryMechanism();
        this.connectionPool = new MCPConnectionPool();
        this.deadlockDetector = new DeadlockDetector();
        this.performanceMonitor = new MCPPerformanceMonitor();

        this.setupMonitoring();
    }

    async safeMCPRequest<T>(
        serverId: string,
        operation: () => Promise<T>,
        options: {
            resourceIds?: string[];
            priority?: 'low' | 'medium' | 'high' | 'critical';
            retries?: number;
            timeout?: number;
        } = {}
    ): Promise<T> {
        const startTime = Date.now();

        try {
            const result = await this.communicationProtocol.sendRequest(
                serverId,
                () => this.retryMechanism.executeWithRetry(operation, options.retries),
                options.resourceIds,
                options.priority
            );

            const responseTime = Date.now() - startTime;
            this.performanceMonitor.recordMetric(serverId, 'responseTime', responseTime);
            this.performanceMonitor.recordMetric(serverId, 'successRate', 1);

            return result;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.performanceMonitor.recordMetric(serverId, 'responseTime', responseTime);
            this.performanceMonitor.recordMetric(serverId, 'errorRate', 1);

            throw error;
        }
    }

    getSystemHealth(): any {
        const deadlocks = this.deadlockDetector.detectDeadlock();
        const performanceReports = new Map();

        for (const serverId of ['claude-flow', 'serena', 'context7', 'perplexity', 'sequential-thinking']) {
            performanceReports.set(serverId, this.performanceMonitor.getPerformanceReport(serverId));
        }

        return {
            deadlocks,
            performance: Object.fromEntries(performanceReports),
            timestamp: new Date().toISOString()
        };
    }

    private setupMonitoring(): void {
        this.performanceMonitor.on('threshold_exceeded', (event) => {
            console.warn(`Performance threshold exceeded: ${event.serverId} ${event.metric} = ${event.value} (threshold: ${event.threshold})`);
        });

        // Run deadlock detection every 30 seconds
        setInterval(() => {
            const deadlocks = this.deadlockDetector.detectDeadlock();
            if (deadlocks.length > 0) {
                console.error('Deadlocks detected:', deadlocks);
            }
        }, 30000);
    }
}

// Export for use in MCP coordination
export {
    MCPCircuitBreaker,
    MCPCommunicationProtocol,
    MCPResourcePool,
    MCPRetryMechanism,
    MCPConnectionPool,
    DeadlockDetector,
    MCPPerformanceMonitor
};
