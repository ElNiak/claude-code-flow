/**
 * Hook Integration Tests
 *
 * Comprehensive tests for hook coordination system to verify
 * deadlock prevention and proper execution order
 */
interface TestResult {
	name: string;
	passed: boolean;
	duration: number;
	error?: string;
	metrics?: any;
}
interface LoadTestResult {
	totalRequests: number;
	successful: number;
	failed: number;
	avgResponseTime: number;
	maxResponseTime: number;
	deadlocks: number;
	throughput: number;
}
/**
 * Hook Integration Test Suite
 */
export declare class HookIntegrationTests {
	private queue;
	private coordinator;
	private wrapper;
	private results;
	constructor();
	/**
	 * Run all integration tests
	 */
	runAllTests(): Promise<{
		passed: number;
		failed: number;
		results: TestResult[];
	}>;
	/**
	 * Test basic hook execution
	 */
	private testBasicHookExecution;
	/**
	 * Test hook serialization
	 */
	private testHookSerialization;
	/**
	 * Test timeout enforcement
	 */
	private testTimeoutEnforcement;
	/**
	 * Test priority ordering
	 */
	private testPriorityOrdering;
	/**
	 * Test deadlock prevention
	 */
	private testDeadlockPrevention;
	/**
	 * Test dependency resolution
	 */
	private testDependencyResolution;
	/**
	 * Test circular dependency detection
	 */
	private testCircularDependencyDetection;
	/**
	 * Test concurrent execution
	 */
	private testConcurrentExecution;
	/**
	 * Test process pool efficiency
	 */
	private testProcessPoolEfficiency;
	/**
	 * Test hook stampede prevention
	 */
	private testHookStampedePrevention;
	/**
	 * Test error recovery
	 */
	private testErrorRecovery;
	/**
	 * Test emergency termination
	 */
	private testEmergencyTermination;
	/**
	 * Test graceful shutdown
	 */
	private testGracefulShutdown;
	/**
	 * Test task workflow
	 */
	private testTaskWorkflow;
	/**
	 * Test file operation workflow
	 */
	private testFileOperationWorkflow;
	/**
	 * Test session workflow
	 */
	private testSessionWorkflow;
	/**
	 * Generate test report
	 */
	private generateTestReport;
	/**
	 * Run load test
	 */
	runLoadTest(duration?: number, concurrency?: number): Promise<LoadTestResult>;
	/**
	 * Load test worker
	 */
	private loadTestWorker;
}
export declare function runHookIntegrationTests(): Promise<void>;
//# sourceMappingURL=hook-integration-tests.d.ts.map
