/**
 * Jest Configuration for Migration Tests
 * Separate configuration specifically for migration testing
 */

export default {
  displayName: 'Migration Tests',
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  rootDir: "../",
  roots: ["<rootDir>/migration-tests"],
  testMatch: [
    "<rootDir>/migration-tests/**/*.test.ts",
    "<rootDir>/migration-tests/**/*.test.js",
  ],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "es2022",
          moduleResolution: "node",
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          target: "es2022",
          types: ["node", "jest"],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@migration/(.*)$": "<rootDir>/migration-tests/$1",
    "^@utils/(.*)$": "<rootDir>/migration-tests/utils/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/migration-tests/setup.js"],
  testTimeout: 90000,
  verbose: true,
  collectCoverageFrom: [
    "migration-tests/**/*.ts",
    "migration-tests/**/*.js",
    "!migration-tests/**/*.test.ts",
    "!migration-tests/**/*.test.js",
  ],
  coverageDirectory: "<rootDir>/coverage/migration",
  coverageReporters: ["text", "lcov", "html"],
  globals: {
    "__JEST_MIGRATION_ENV__": true,
  },
  // Enhanced error handling
  errorOnDeprecated: false,
  clearMocks: true,
  restoreMocks: true,
};
