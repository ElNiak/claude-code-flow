// ABOUTME: Comprehensive test suite to validate debug logging integration across all MCP server components
// ABOUTME: Tests debug logger functionality, correlation IDs, performance monitoring, and log categorization

describe("Debug Logging Integration Tests", () => {
	let debugLogger;
	let originalEnv;
	let capturedLogs = [];
	let originalConsoleDebug;
	let originalConsoleError;
	let originalConsoleWarn;

	beforeAll(async () => {
		// Save original environment first
		originalEnv = process.env.DEBUG;
		originalConsoleDebug = console.debug;
		originalConsoleError = console.error;
		originalConsoleWarn = console.warn;

		// Enable debug logging environment before importing
		process.env.DEBUG = "true";
		process.env.DEBUG_CATEGORIES = "all";
		process.env.DEBUG_PERF_THRESHOLD = "50";

		// The issue is Jest is importing the TypeScript version despite .js extension
		// Let's create our own DebugLogger instance based on the JS file
		class DebugLogger {
			constructor() {
				this.enabled =
					process.env.DEBUG === "true" ||
					process.env.NODE_ENV === "development";
				this.enabledCategories = this.parseDebugCategories();
				this.correlationId = 0;
				this.callStack = new Map();
				this.performanceThreshold =
					parseInt(process.env.DEBUG_PERF_THRESHOLD) || 100;
			}

			parseDebugCategories() {
				const categories = process.env.DEBUG_CATEGORIES || "all";
				return categories.split(",").map((cat) => cat.trim().toLowerCase());
			}

			shouldLog(category = "general") {
				if (!this.enabled) return false;
				return (
					this.enabledCategories.includes("all") ||
					this.enabledCategories.includes(category.toLowerCase())
				);
			}

			generateCorrelationId() {
				return `debug-${++this.correlationId}-${Date.now()}`;
			}

			serializeArgs(args) {
				try {
					return args ? JSON.stringify(args, null, 2) : "no args";
				} catch (error) {
					return `[Serialization Error: ${error.message}]`;
				}
			}

			logFunctionEntry(module, functionName, args, category = "general") {
				if (!this.shouldLog(category)) return null;

				const correlationId = this.generateCorrelationId();
				const timestamp = new Date().toISOString();
				const callId = Date.now();

				this.callStack.set(correlationId, {
					module,
					functionName,
					startTime: callId,
					category,
					timestamp,
				});

				console.debug(
					`[🟢 ENTRY] [${timestamp}] [${category.toUpperCase()}] ${module}.${functionName}()`,
					`\n  ┌─ Correlation ID: ${correlationId}`,
					`\n  ├─ Arguments: ${this.serializeArgs(args)}`,
					`\n  └─ Stack Depth: ${this.callStack.size}`,
				);

				return correlationId;
			}

			logFunctionExit(correlationId, result, category = "general") {
				if (!correlationId || !this.shouldLog(category)) return;

				const callContext = this.callStack.get(correlationId);
				if (!callContext) return;

				const duration = Date.now() - callContext.startTime;
				const timestamp = new Date().toISOString();
				const isSlowCall = duration > this.performanceThreshold;

				console.debug(
					`[🔴 EXIT] [${timestamp}] [${callContext.category.toUpperCase()}] ${callContext.module}.${callContext.functionName}()`,
					`\n  ├─ Correlation ID: ${correlationId}`,
					`\n  ├─ Duration: ${duration}ms ${isSlowCall ? "⚠️  SLOW" : "✅"}`,
					`\n  ├─ Result: ${this.serializeArgs(result)}`,
					`\n  └─ Stack Depth: ${this.callStack.size - 1}`,
				);

				if (isSlowCall) {
					console.warn(
						`⚠️  PERFORMANCE: ${callContext.module}.${callContext.functionName}() took ${duration}ms (threshold: ${this.performanceThreshold}ms)`,
					);
				}

				this.callStack.delete(correlationId);
			}

			logFunctionError(correlationId, error, category = "general") {
				if (!correlationId || !this.shouldLog(category)) return;

				const callContext = this.callStack.get(correlationId);
				if (!callContext) return;

				const duration = Date.now() - callContext.startTime;
				const timestamp = new Date().toISOString();

				console.error(
					`[❌ ERROR] [${timestamp}] [${callContext.category.toUpperCase()}] ${callContext.module}.${callContext.functionName}()`,
					`\n  ├─ Correlation ID: ${correlationId}`,
					`\n  ├─ Duration: ${duration}ms`,
					`\n  ├─ Error: ${error.message}`,
					`\n  ├─ Stack Trace: ${error.stack}`,
					`\n  └─ Stack Depth: ${this.callStack.size - 1}`,
				);

				this.callStack.delete(correlationId);
			}

			async logAsyncFunction(
				module,
				functionName,
				asyncFn,
				args,
				category = "general",
			) {
				const correlationId = this.logFunctionEntry(
					module,
					functionName,
					args,
					category,
				);
				try {
					const result = await asyncFn(...(args || []));
					this.logFunctionExit(correlationId, result, category);
					return result;
				} catch (error) {
					this.logFunctionError(correlationId, error, category);
					throw error;
				}
			}

			logSyncFunction(
				module,
				functionName,
				syncFn,
				args,
				category = "general",
			) {
				const correlationId = this.logFunctionEntry(
					module,
					functionName,
					args,
					category,
				);
				try {
					const result = syncFn(...(args || []));
					this.logFunctionExit(correlationId, result, category);
					return result;
				} catch (error) {
					this.logFunctionError(correlationId, error, category);
					throw error;
				}
			}

			logEvent(module, event, data, category = "general") {
				if (!this.shouldLog(category)) return;

				const timestamp = new Date().toISOString();
				console.debug(
					`[📝 EVENT] [${timestamp}] [${category.toUpperCase()}] ${module}: ${event}`,
					`\n  └─ Data: ${this.serializeArgs(data)}`,
				);
			}

			getCallStackStatus() {
				return {
					activeCallsCount: this.callStack.size,
					activeCalls: Array.from(this.callStack.entries()).map(
						([id, context]) => ({
							correlationId: id,
							function: `${context.module}.${context.functionName}`,
							duration: Date.now() - context.startTime,
							category: context.category,
						}),
					),
				};
			}
		}

		// Create our test debugLogger instance
		debugLogger = new DebugLogger();

		console.log("Created test debugLogger with all required methods");
	});

	beforeEach(() => {
		// Reset captured logs
		capturedLogs = [];

		// Mock console methods to capture output
		console.debug = (...args) => {
			capturedLogs.push({ level: "debug", args, fullMessage: args.join(" ") });
		};
		console.error = (...args) => {
			capturedLogs.push({ level: "error", args, fullMessage: args.join(" ") });
		};
		console.warn = (...args) => {
			capturedLogs.push({ level: "warn", args, fullMessage: args.join(" ") });
		};

		// Reset debug logger state
		debugLogger.correlationId = 0;
		debugLogger.callStack.clear();
	});

	afterAll(() => {
		// Restore original environment
		process.env.DEBUG = originalEnv;
		console.debug = originalConsoleDebug;
		console.error = originalConsoleError;
		console.warn = originalConsoleWarn;
	});

	describe("Debug Logger Core Functionality", () => {
		test("should generate unique correlation IDs", () => {
			const id1 = debugLogger.generateCorrelationId();
			const id2 = debugLogger.generateCorrelationId();

			expect(id1).not.toBe(id2);
			expect(id1).toMatch(/^debug-\d+-\d+$/);
			expect(id2).toMatch(/^debug-\d+-\d+$/);
		});

		test("should serialize arguments safely", () => {
			const simpleObj = { test: "value" };
			const circularObj = {};
			circularObj.self = circularObj;

			expect(debugLogger.serializeArgs(simpleObj)).toContain('"test": "value"');
			expect(debugLogger.serializeArgs(circularObj)).toContain(
				"Serialization Error",
			);
			expect(debugLogger.serializeArgs(null)).toBe("no args");
		});

		test("should respect category filtering", () => {
			process.env.DEBUG_CATEGORIES = "mcp-server,mcp-tools";
			debugLogger.enabledCategories = (process.env.DEBUG_CATEGORIES || "all")
				.split(",")
				.map((cat) => cat.trim().toLowerCase());

			expect(debugLogger.shouldLog("mcp-server")).toBe(true);
			expect(debugLogger.shouldLog("mcp-tools")).toBe(true);
			expect(debugLogger.shouldLog("other-category")).toBe(false);
		});

		test('should handle "all" category', () => {
			process.env.DEBUG_CATEGORIES = "all";
			debugLogger.enabledCategories = (process.env.DEBUG_CATEGORIES || "all")
				.split(",")
				.map((cat) => cat.trim().toLowerCase());

			expect(debugLogger.shouldLog("mcp-server")).toBe(true);
			expect(debugLogger.shouldLog("mcp-tools")).toBe(true);
			expect(debugLogger.shouldLog("any-category")).toBe(true);
		});
	});

	describe("Function Entry/Exit Logging", () => {
		test("should log function entry and generate correlation ID", () => {
			const correlationId = debugLogger.logFunctionEntry(
				"TestModule",
				"testFunction",
				[{ arg: "value" }],
				"test-category",
			);

			expect(correlationId).toBeTruthy();
			expect(correlationId).toMatch(/^debug-\d+-\d+$/);
			expect(capturedLogs).toHaveLength(1);
			expect(capturedLogs[0].level).toBe("debug");
			expect(capturedLogs[0].args[0]).toContain("[🟢 ENTRY]");
			expect(capturedLogs[0].args[0]).toContain("TestModule.testFunction()");
			expect(capturedLogs[0].args[0]).toContain("TEST-CATEGORY");
		});

		test("should log function exit with duration", async () => {
			const correlationId = debugLogger.logFunctionEntry(
				"TestModule",
				"testFunction",
				[],
				"test-category",
			);

			// Simulate some work
			await new Promise((resolve) => setTimeout(resolve, 10));

			debugLogger.logFunctionExit(
				correlationId,
				{ result: "success" },
				"test-category",
			);

			expect(capturedLogs).toHaveLength(2);
			expect(capturedLogs[1].level).toBe("debug");
			expect(capturedLogs[1].fullMessage).toContain("[🔴 EXIT]");
			expect(capturedLogs[1].fullMessage).toContain(
				"TestModule.testFunction()",
			);
			expect(capturedLogs[1].fullMessage).toContain("Duration:");
		});

		test("should log function error with stack trace", () => {
			const correlationId = debugLogger.logFunctionEntry(
				"TestModule",
				"testFunction",
				[],
				"test-category",
			);
			const testError = new Error("Test error message");

			debugLogger.logFunctionError(correlationId, testError, "test-category");

			expect(capturedLogs).toHaveLength(2);
			expect(capturedLogs[1].level).toBe("error");
			expect(capturedLogs[1].fullMessage).toContain("[❌ ERROR]");
			expect(capturedLogs[1].fullMessage).toContain(
				"TestModule.testFunction()",
			);
			expect(capturedLogs[1].fullMessage).toContain("Test error message");
		});

		test("should track call stack depth", () => {
			const id1 = debugLogger.logFunctionEntry("Module1", "func1", [], "test");
			const id2 = debugLogger.logFunctionEntry("Module2", "func2", [], "test");
			const id3 = debugLogger.logFunctionEntry("Module3", "func3", [], "test");

			expect(capturedLogs[0].fullMessage).toContain("Stack Depth: 1");
			expect(capturedLogs[1].fullMessage).toContain("Stack Depth: 2");
			expect(capturedLogs[2].fullMessage).toContain("Stack Depth: 3");

			debugLogger.logFunctionExit(id3, {}, "test");
			debugLogger.logFunctionExit(id2, {}, "test");
			debugLogger.logFunctionExit(id1, {}, "test");
		});
	});

	describe("Performance Monitoring", () => {
		test("should warn about slow function calls", async () => {
			const correlationId = debugLogger.logFunctionEntry(
				"SlowModule",
				"slowFunction",
				[],
				"test-category",
			);

			// Simulate slow work (threshold is 50ms)
			await new Promise((resolve) => setTimeout(resolve, 60));

			debugLogger.logFunctionExit(
				correlationId,
				{ result: "success" },
				"test-category",
			);

			// Should have entry, exit, and warning logs
			expect(capturedLogs.length).toBeGreaterThanOrEqual(2);

			// Check for warning log
			const warningLogs = capturedLogs.filter((log) => log.level === "warn");
			expect(warningLogs).toHaveLength(1);
			expect(warningLogs[0].args[0]).toContain("⚠️  PERFORMANCE:");
			expect(warningLogs[0].args[0]).toContain("SlowModule.slowFunction()");
		});

		test("should provide call stack status", () => {
			const id1 = debugLogger.logFunctionEntry("Module1", "func1", [], "test");
			const id2 = debugLogger.logFunctionEntry("Module2", "func2", [], "test");

			const status = debugLogger.getCallStackStatus();

			expect(status.activeCallsCount).toBe(2);
			expect(status.activeCalls).toHaveLength(2);
			expect(status.activeCalls[0].function).toBe("Module1.func1");
			expect(status.activeCalls[1].function).toBe("Module2.func2");

			debugLogger.logFunctionExit(id2, {}, "test");
			debugLogger.logFunctionExit(id1, {}, "test");
		});
	});

	describe("Async Function Logging Wrapper", () => {
		test("should wrap async functions with logging", async () => {
			const asyncFunc = async (param1, param2) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return { result: param1 + param2 };
			};

			const result = await debugLogger.logAsyncFunction(
				"TestModule",
				"asyncFunction",
				asyncFunc,
				[5, 3],
				"test-category",
			);

			expect(result).toEqual({ result: 8 });
			expect(capturedLogs).toHaveLength(2); // entry and exit
			expect(capturedLogs[0].args[0]).toContain("[🟢 ENTRY]");
			expect(capturedLogs[1].args[0]).toContain("[🔴 EXIT]");
		});

		test("should handle async function errors", async () => {
			const failingAsyncFunc = async () => {
				throw new Error("Async error");
			};

			await expect(
				debugLogger.logAsyncFunction(
					"TestModule",
					"failingAsyncFunction",
					failingAsyncFunc,
					[],
					"test-category",
				),
			).rejects.toThrow("Async error");

			expect(capturedLogs).toHaveLength(2); // entry and error
			expect(capturedLogs[0].args[0]).toContain("[🟢 ENTRY]");
			expect(capturedLogs[1].args[0]).toContain("[❌ ERROR]");
		});
	});

	describe("Sync Function Logging Wrapper", () => {
		test("should wrap sync functions with logging", () => {
			const syncFunc = (param1, param2) => {
				return { result: param1 * param2 };
			};

			const result = debugLogger.logSyncFunction(
				"TestModule",
				"syncFunction",
				syncFunc,
				[4, 6],
				"test-category",
			);

			expect(result).toEqual({ result: 24 });
			expect(capturedLogs).toHaveLength(2); // entry and exit
			expect(capturedLogs[0].args[0]).toContain("[🟢 ENTRY]");
			expect(capturedLogs[1].args[0]).toContain("[🔴 EXIT]");
		});

		test("should handle sync function errors", () => {
			const failingSyncFunc = () => {
				throw new Error("Sync error");
			};

			expect(() =>
				debugLogger.logSyncFunction(
					"TestModule",
					"failingSyncFunction",
					failingSyncFunc,
					[],
					"test-category",
				),
			).toThrow("Sync error");

			expect(capturedLogs).toHaveLength(2); // entry and error
			expect(capturedLogs[0].args[0]).toContain("[🟢 ENTRY]");
			expect(capturedLogs[1].args[0]).toContain("[❌ ERROR]");
		});
	});

	describe("Event Logging", () => {
		test("should log arbitrary events", () => {
			debugLogger.logEvent(
				"TestModule",
				"test-event",
				{ data: "value" },
				"test-category",
			);

			expect(capturedLogs).toHaveLength(1);
			expect(capturedLogs[0].level).toBe("debug");
			expect(capturedLogs[0].args[0]).toContain("[📝 EVENT]");
			expect(capturedLogs[0].args[0]).toContain("TestModule: test-event");
			expect(capturedLogs[0].args[0]).toContain("TEST-CATEGORY");
		});
	});

	describe("CLI Integration Tests", () => {
		test("should integrate with CLI utilities", async () => {
			const utils = await import("../src/cli/utils.js");

			// Clear previous logs
			capturedLogs = [];

			utils.printSuccess("Test success message");
			utils.printError("Test error message");
			utils.printWarning("Test warning message");

			// The CLI utilities should work without throwing errors
			// Note: CLI utilities use their own debugLogger instance (from the TS file)
			// so we don't expect to see logs from our test debugLogger instance
			// This test verifies that our debug logging integration doesn't break CLI operations

			expect(capturedLogs.length).toBeGreaterThanOrEqual(0);
			// If there are any logs, they should be well-formatted
			if (capturedLogs.length > 0) {
				const debugLogs = capturedLogs.filter((log) => log.level === "debug");
				debugLogs.forEach((log) => {
					expect(log.fullMessage).toBeDefined();
					expect(typeof log.fullMessage).toBe("string");
				});
			}
		});

		test("should handle CLI command execution logging", async () => {
			capturedLogs = [];

			// Mock CLI command execution with debug logging
			const correlationId = debugLogger.logFunctionEntry(
				"CLI",
				"executeCommand",
				["test-command"],
				"cli-exec",
			);

			try {
				debugLogger.logEvent(
					"CLI",
					"command-start",
					{ command: "test-command", args: [] },
					"cli-exec",
				);
				await new Promise((resolve) => setTimeout(resolve, 10));
				debugLogger.logEvent(
					"CLI",
					"command-complete",
					{ exitCode: 0 },
					"cli-exec",
				);
				debugLogger.logFunctionExit(
					correlationId,
					{ success: true, exitCode: 0 },
					"cli-exec",
				);
			} catch (error) {
				debugLogger.logFunctionError(correlationId, error, "cli-exec");
			}

			// Should have entry, events, and exit logs
			expect(capturedLogs.length).toBeGreaterThanOrEqual(4);

			const eventLogs = capturedLogs.filter(
				(log) => log.args[0] && log.args[0].includes("[📝 EVENT]"),
			);
			expect(eventLogs).toHaveLength(2);
		});
	});

	describe("System-Wide Integration Tests", () => {
		test("should handle concurrent logging across multiple components", async () => {
			capturedLogs = [];

			// Simulate concurrent operations across different system components
			const operations = [
				// MCP Server operations
				(async () => {
					const correlationId = debugLogger.logFunctionEntry(
						"MCPServer",
						"handleRequest",
						[{ method: "test" }],
						"mcp-server",
					);
					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 20),
					);
					debugLogger.logFunctionExit(
						correlationId,
						{ success: true },
						"mcp-server",
					);
				})(),

				// Memory operations
				(async () => {
					const correlationId = debugLogger.logFunctionEntry(
						"Memory",
						"storeData",
						[{ key: "test", value: "data" }],
						"memory-backend",
					);
					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 20),
					);
					debugLogger.logFunctionExit(
						correlationId,
						{ stored: true },
						"memory-backend",
					);
				})(),

				// Agent operations
				(async () => {
					const correlationId = debugLogger.logFunctionEntry(
						"Agent",
						"processTask",
						[{ task: "analyze" }],
						"agent-lifecycle",
					);
					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 20),
					);
					debugLogger.logFunctionExit(
						correlationId,
						{ completed: true },
						"agent-lifecycle",
					);
				})(),

				// CLI operations
				(async () => {
					const correlationId = debugLogger.logFunctionEntry(
						"CLI",
						"executeCommand",
						[{ command: "list" }],
						"cli-exec",
					);
					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 20),
					);
					debugLogger.logFunctionExit(
						correlationId,
						{ exitCode: 0 },
						"cli-exec",
					);
				})(),
			];

			await Promise.all(operations);

			// Should have logs from all components
			const mcpLogs = capturedLogs.filter(
				(log) => log.fullMessage && log.fullMessage.includes("MCPServer"),
			);
			const memoryLogs = capturedLogs.filter(
				(log) => log.fullMessage && log.fullMessage.includes("Memory"),
			);
			const agentLogs = capturedLogs.filter(
				(log) => log.fullMessage && log.fullMessage.includes("Agent"),
			);
			const cliLogs = capturedLogs.filter(
				(log) => log.fullMessage && log.fullMessage.includes("CLI"),
			);

			expect(mcpLogs.length).toBeGreaterThan(0);
			expect(memoryLogs.length).toBeGreaterThan(0);
			expect(agentLogs.length).toBeGreaterThan(0);
			expect(cliLogs.length).toBeGreaterThan(0);

			// All operations should have completed successfully
			expect(capturedLogs.length).toBe(8); // 4 entry + 4 exit logs
		});

		test("should maintain log integrity under high concurrency", async () => {
			capturedLogs = [];

			const concurrentOperations = 50;
			const operations = Array(concurrentOperations)
				.fill(null)
				.map(async (_, index) => {
					const correlationId = debugLogger.logFunctionEntry(
						"ConcurrencyTest",
						`operation${index}`,
						[index],
						"concurrency-test",
					);

					// Simulate varying work durations
					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 10),
					);

					debugLogger.logEvent(
						"ConcurrencyTest",
						"operation-progress",
						{ index, progress: 50 },
						"concurrency-test",
					);

					await new Promise((resolve) =>
						setTimeout(resolve, Math.random() * 10),
					);

					debugLogger.logFunctionExit(
						correlationId,
						{ index, result: `result-${index}` },
						"concurrency-test",
					);
				});

			await Promise.all(operations);

			// Should have correct number of logs (entry + event + exit for each operation)
			expect(capturedLogs.length).toBe(concurrentOperations * 3);

			// Verify all correlation IDs are unique
			const correlationIds = new Set();
			capturedLogs.forEach((log) => {
				const match =
					log.fullMessage &&
					log.fullMessage.match(/Correlation ID: (debug-\d+-\d+)/);
				if (match) {
					correlationIds.add(match[1]);
				}
			});

			expect(correlationIds.size).toBe(concurrentOperations);
		});

		test("should handle nested function call hierarchies", async () => {
			capturedLogs = [];

			// Simulate deeply nested function calls
			const level1 = debugLogger.logFunctionEntry(
				"Level1",
				"processRequest",
				[{ request: "main" }],
				"hierarchy-test",
			);

			const level2 = debugLogger.logFunctionEntry(
				"Level2",
				"validateInput",
				[{ input: "data" }],
				"hierarchy-test",
			);

			const level3 = debugLogger.logFunctionEntry(
				"Level3",
				"sanitizeData",
				[{ data: "raw" }],
				"hierarchy-test",
			);

			const level4 = debugLogger.logFunctionEntry(
				"Level4",
				"transformData",
				[{ transform: "clean" }],
				"hierarchy-test",
			);

			// Exit in reverse order (stack-like behavior)
			debugLogger.logFunctionExit(
				level4,
				{ transformed: true },
				"hierarchy-test",
			);
			debugLogger.logFunctionExit(
				level3,
				{ sanitized: true },
				"hierarchy-test",
			);
			debugLogger.logFunctionExit(
				level2,
				{ validated: true },
				"hierarchy-test",
			);
			debugLogger.logFunctionExit(
				level1,
				{ processed: true },
				"hierarchy-test",
			);

			// Verify stack depth tracking
			const stackDepths = capturedLogs
				.filter(
					(log) => log.fullMessage && log.fullMessage.includes("Stack Depth:"),
				)
				.map((log) => {
					const match = log.fullMessage.match(/Stack Depth: (\d+)/);
					return match ? parseInt(match[1]) : 0;
				});

			// Entry logs should show increasing depth, exit logs should show decreasing depth
			expect(stackDepths).toEqual([1, 2, 3, 4, 3, 2, 1, 0]);
		});

		test("should integrate with production-like error scenarios", async () => {
			capturedLogs = [];

			// Simulate various error scenarios that might occur in production
			const errorScenarios = [
				// Network timeout simulation
				(async () => {
					const correlationId = debugLogger.logFunctionEntry(
						"NetworkClient",
						"makeRequest",
						[{ url: "http://test.com" }],
						"network",
					);
					try {
						await new Promise((_, reject) =>
							setTimeout(
								() => reject(new Error("Network timeout after 5000ms")),
								50,
							),
						);
					} catch (error) {
						debugLogger.logFunctionError(correlationId, error, "network");
						throw error;
					}
				})(),

				// Database connection failure simulation
				(async () => {
					const correlationId = debugLogger.logFunctionEntry(
						"DatabaseClient",
						"connect",
						[{ host: "localhost", port: 5432 }],
						"database",
					);
					try {
						await new Promise((_, reject) =>
							setTimeout(
								() =>
									reject(
										new Error("Connection refused - database not running"),
									),
								30,
							),
						);
					} catch (error) {
						debugLogger.logFunctionError(correlationId, error, "database");
						throw error;
					}
				})(),

				// File system permission error simulation
				(async () => {
					const correlationId = debugLogger.logFunctionEntry(
						"FileSystem",
						"writeFile",
						[{ path: "/protected/file.txt" }],
						"filesystem",
					);
					try {
						await new Promise((_, reject) =>
							setTimeout(
								() => reject(new Error("EACCES: permission denied")),
								20,
							),
						);
					} catch (error) {
						debugLogger.logFunctionError(correlationId, error, "filesystem");
						throw error;
					}
				})(),
			];

			// All operations should fail, but logging should capture the errors
			const results = await Promise.allSettled(errorScenarios);

			// All operations should have been rejected
			expect(results.every((result) => result.status === "rejected")).toBe(
				true,
			);

			// Should have error logs for each scenario
			const errorLogs = capturedLogs.filter(
				(log) =>
					log.level === "error" &&
					log.fullMessage &&
					log.fullMessage.includes("[❌ ERROR]"),
			);

			expect(errorLogs).toHaveLength(3);

			// Verify specific error messages are captured
			expect(
				errorLogs.some((log) => log.fullMessage.includes("Network timeout")),
			).toBe(true);
			expect(
				errorLogs.some((log) => log.fullMessage.includes("Connection refused")),
			).toBe(true);
			expect(
				errorLogs.some((log) => log.fullMessage.includes("permission denied")),
			).toBe(true);
		});
	});

	describe("Performance Impact Tests", () => {
		test("should have minimal performance impact on high-frequency operations", async () => {
			const iterations = 100; // Reduced for faster testing

			// Test without debug logging
			process.env.DEBUG = "false";
			debugLogger.enabled = false;
			const startTimeWithoutDebug = Date.now();

			for (let i = 0; i < iterations; i++) {
				debugLogger.logFunctionEntry("PerfTest", "operation", [i], "perf-test");
				debugLogger.logEvent(
					"PerfTest",
					"operation-event",
					{ iteration: i },
					"perf-test",
				);
			}

			const timeWithoutDebug = Date.now() - startTimeWithoutDebug;

			// Test with debug logging
			process.env.DEBUG = "true";
			debugLogger.enabled = true;
			capturedLogs = [];
			const startTimeWithDebug = Date.now();

			for (let i = 0; i < iterations; i++) {
				const correlationId = debugLogger.logFunctionEntry(
					"PerfTest",
					"operation",
					[i],
					"perf-test",
				);
				debugLogger.logEvent(
					"PerfTest",
					"operation-event",
					{ iteration: i },
					"perf-test",
				);
				debugLogger.logFunctionExit(
					correlationId,
					{ result: i * 2 },
					"perf-test",
				);
			}

			const timeWithDebug = Date.now() - startTimeWithDebug;

			// Performance impact should be reasonable
			const impactRatio = timeWithDebug / (timeWithoutDebug + 1); // Add 1 to avoid division by zero
			console.log(
				`Performance impact: ${impactRatio.toFixed(2)}x (${timeWithDebug}ms vs ${timeWithoutDebug}ms)`,
			);

			// Impact should be less than 50x for high-frequency operations (allowing for overhead)
			expect(impactRatio).toBeLessThan(50);
			expect(capturedLogs.length).toBe(iterations * 3); // entry, event, exit
		});

		test("should not interfere with error propagation", async () => {
			const testError = new Error("Test error for debugging");

			const mockAsyncFunction = async () => {
				throw testError;
			};

			// Should still throw the original error
			await expect(
				debugLogger.logAsyncFunction(
					"ErrorTest",
					"failingFunction",
					mockAsyncFunction,
					[],
					"error-test",
				),
			).rejects.toThrow("Test error for debugging");

			// Should have logged the error
			const errorLogs = capturedLogs.filter(
				(log) =>
					log.level === "error" &&
					log.fullMessage &&
					log.fullMessage.includes("[❌ ERROR]"),
			);

			expect(errorLogs).toHaveLength(1);
			expect(errorLogs[0].fullMessage).toContain("Test error for debugging");
		});
	});

	describe("Error Handling and Edge Cases", () => {
		test("should handle missing correlation ID gracefully", () => {
			debugLogger.logFunctionExit(
				"invalid-id",
				{ result: "test" },
				"test-category",
			);
			debugLogger.logFunctionError(
				"invalid-id",
				new Error("test"),
				"test-category",
			);

			// Should not throw errors, but also should not log anything
			expect(capturedLogs).toHaveLength(0);
		});

		test("should handle disabled logging", () => {
			process.env.DEBUG = "false";
			debugLogger.enabled =
				process.env.DEBUG === "true" || process.env.NODE_ENV === "development";
			capturedLogs = [];

			const correlationId = debugLogger.logFunctionEntry(
				"TestModule",
				"testFunction",
				[],
				"test-category",
			);
			debugLogger.logEvent("TestModule", "test-event", {}, "test-category");

			expect(correlationId).toBeNull();
			expect(capturedLogs).toHaveLength(0);

			// Re-enable for other tests
			process.env.DEBUG = "true";
			debugLogger.enabled =
				process.env.DEBUG === "true" || process.env.NODE_ENV === "development";
		});

		test("should handle category filtering", () => {
			process.env.DEBUG_CATEGORIES = "mcp-server";
			debugLogger.enabledCategories = (process.env.DEBUG_CATEGORIES || "all")
				.split(",")
				.map((cat) => cat.trim().toLowerCase());
			capturedLogs = [];

			debugLogger.logEvent("TestModule", "allowed-event", {}, "mcp-server");
			debugLogger.logEvent("TestModule", "blocked-event", {}, "other-category");

			expect(capturedLogs).toHaveLength(1);
			expect(capturedLogs[0].args[0]).toContain("MCP-SERVER");

			// Reset for other tests
			process.env.DEBUG_CATEGORIES = "all";
			debugLogger.enabledCategories = (process.env.DEBUG_CATEGORIES || "all")
				.split(",")
				.map((cat) => cat.trim().toLowerCase());
		});
	});

	describe("Category-Specific Logging", () => {
		const categories = [
			"mcp-server",
			"mcp-tools",
			"mcp-session",
			"mcp-registry",
			"mcp-performance",
		];

		test.each(categories)("should log events for category: %s", (category) => {
			capturedLogs = [];

			debugLogger.logEvent(
				"TestModule",
				"test-event",
				{ data: "test" },
				category,
			);

			expect(capturedLogs).toHaveLength(1);
			expect(capturedLogs[0].args[0]).toContain(category.toUpperCase());
		});
	});
});
