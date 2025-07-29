/**
 * Jest Migration Setup File
 * Handles migration-specific test configurations and setup
 */

// Migration test environment setup
process.env.CLAUDE_FLOW_MIGRATION_TEST = "true";
process.env.MIGRATION_TEST_MODE = "true";

// Suppress migration logs during tests
if (!process.env.DEBUG_MIGRATION_TESTS) {
	const consoleMethods = ["log", "info", "warn", "error"];
	consoleMethods.forEach((method) => {
		const original = console[method];
		console[method] = (...args) => {
			// Only log migration-related errors
			if (method === "error" || (args[0] && args[0].includes("Migration"))) {
				original.apply(console, args);
			}
		};
	});
}

// Migration test timeout handling
if (typeof jest !== "undefined") {
	jest.setTimeout(60000); // 60 seconds for migration tests
}

global.migrationTestUtils = {
	timeout: 60000,
	isTestMode: true,
	suppressLogs: !process.env.DEBUG_MIGRATION_TESTS,
};
