/**
 * Enhanced MCP Server Validation Tests
 * Tests Phase 1 enhancements to verify comprehensive tool registration
 */

import { MCPServer } from "../src/cli/commands/mcp/core/server.js";

describe("Enhanced MCP Server Phase 1 Validation", () => {
	let server;
	let mockLogger;
	let mockEventBus;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			configure: jest.fn(),
		};

		mockEventBus = {
			emit: jest.fn(),
			on: jest.fn(),
			off: jest.fn(),
		};
	});

	afterEach(async () => {
		if (server) {
			await server.stop();
		}
	});

	test("should register basic tools without enhanced features", async () => {
		const config = {
			transport: "stdio",
			enhanced: {
				enabled: false,
			},
		};

		server = new MCPServer(config, mockEventBus, mockLogger);
		await server.start();

		const healthStatus = await server.getHealthStatus();
		expect(healthStatus.healthy).toBe(true);
		expect(healthStatus.metrics.registeredTools).toBeGreaterThanOrEqual(4); // Basic tools
	});

	test("should register comprehensive tools when enhanced features enabled", async () => {
		const config = {
			transport: "stdio",
			enhanced: {
				enabled: true,
				comprehensiveTools: true,
				neuralProcessing: true,
				workflowManagement: true,
				githubIntegration: true,
			},
		};

		server = new MCPServer(config, mockEventBus, mockLogger);
		await server.start();

		const healthStatus = await server.getHealthStatus();
		expect(healthStatus.healthy).toBe(true);

		// Should have basic tools + comprehensive tools
		expect(healthStatus.metrics.registeredTools).toBeGreaterThanOrEqual(15);

		// Verify logger calls for enhanced tool registration
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Registering enhanced comprehensive tool suite...",
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Enhanced comprehensive tool suite registered successfully",
		);
	});

	test("should register swarm coordination tools", async () => {
		const config = {
			transport: "stdio",
			enhanced: {
				enabled: true,
				comprehensiveTools: true,
			},
		};

		server = new MCPServer(config, mockEventBus, mockLogger);
		await server.start();

		// Verify swarm coordination tools logging
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Registered Swarm Coordination Tools",
			{ count: 4 },
		);
	});

	test("should conditionally register neural processing tools", async () => {
		const config = {
			transport: "stdio",
			enhanced: {
				enabled: true,
				comprehensiveTools: true,
				neuralProcessing: true,
			},
		};

		server = new MCPServer(config, mockEventBus, mockLogger);
		await server.start();

		// Verify neural processing tools logging
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Registered Neural Processing Tools",
			{ count: 2 },
		);
	});

	test("should not register neural tools when neuralProcessing disabled", async () => {
		const config = {
			transport: "stdio",
			enhanced: {
				enabled: true,
				comprehensiveTools: true,
				neuralProcessing: false,
			},
		};

		server = new MCPServer(config, mockEventBus, mockLogger);
		await server.start();

		// Should not have neural processing tools logging
		expect(mockLogger.info).not.toHaveBeenCalledWith(
			expect.stringContaining("Neural Processing Tools"),
		);
	});

	test("should maintain backward compatibility with existing API", async () => {
		const config = {
			transport: "stdio",
			// No enhanced config - should work as before
		};

		server = new MCPServer(config, mockEventBus, mockLogger);
		await server.start();

		// Should work exactly as before
		const healthStatus = await server.getHealthStatus();
		expect(healthStatus.healthy).toBe(true);
		expect(typeof server.registerTool).toBe("function");
		expect(typeof server.getMetrics).toBe("function");
		expect(typeof server.getSessions).toBe("function");
	});
});
