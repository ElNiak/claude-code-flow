export default {
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	roots: ["<rootDir>/src", "<rootDir>/tests", "<rootDir>/migration-tests"],
	testMatch: [
		"<rootDir>/tests/**/*.test.ts",
		"<rootDir>/tests/**/*.test.js",
		"<rootDir>/tests/**/*.spec.ts",
		"<rootDir>/tests/**/*.spec.js",
		"<rootDir>/src/**/*.test.ts",
		"<rootDir>/src/**/*.test.js",
		"<rootDir>/src/**/*.spec.ts",
		"<rootDir>/src/**/*.spec.js",
		"<rootDir>/migration-tests/**/*.test.ts",
		"<rootDir>/migration-tests/**/*.test.js",
	],
	transform: {
		"^.+\\.ts$": [
			"babel-jest",
			{
				presets: [
					["@babel/preset-env", { modules: false }],
					["@babel/preset-typescript"]
				],
			},
		],
		"^.+\\.js$": [
			"babel-jest",
			{
				presets: [["@babel/preset-env", { modules: false }]],
			},
		],
	},
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
		"^~/(.*)$": "<rootDir>/src/$1",
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@tests/(.*)$": "<rootDir>/tests/$1",
		"^@migration/(.*)$": "<rootDir>/migration-tests/$1",
		"^@utils/(.*)$": "<rootDir>/migration-tests/utils/$1",
	},
	modulePathIgnorePatterns: [
		"<rootDir>/dist/",
		"<rootDir>/bin/",
		"<rootDir>/node_modules/",
	],
	transformIgnorePatterns: [
		"node_modules/(?!(chalk|ora|inquirer|nanoid|fs-extra|ansi-styles|ruv-swarm)/)",
	],
	resolver: undefined,
	collectCoverageFrom: [
		"src/**/*.ts",
		"src/**/*.js",
		"!src/**/*.d.ts",
		"!src/**/*.test.ts",
		"!src/**/*.test.js",
		"!src/**/*.spec.ts",
		"!src/**/*.spec.js",
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	setupFilesAfterEnv: ["<rootDir>/jest.setup.js", "<rootDir>/jest.migration.setup.js"],
	testTimeout: 30000,
	verbose: true,
	// Enhanced error handling
	errorOnDeprecated: false,
	// Better module resolution
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	// Clear mocks between tests
	clearMocks: true,
	restoreMocks: true,
	// Enhanced globals
	globals: {
		"ts-jest": {
			useESM: true,
		},
	},
};
