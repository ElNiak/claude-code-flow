export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.js'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'es2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        target: 'es2022'
      }
    }],
    '^.+\\.js$': ['babel-jest', {
      presets: [['@babel/preset-env', { modules: false }]]
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/bin/',
    '<rootDir>/node_modules/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|inquirer|nanoid|fs-extra|ansi-styles|ruv-swarm|@modelcontextprotocol)/)'
  ],
  resolver: undefined,
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.js',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.js',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.js',
    // Include debug logging implementation
    'src/core/logger.ts',
    'src/utils/console-migration.ts',
    // Exclude build artifacts
    '!src/**/dist/**',
    '!src/**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  // Enhanced error handling
  errorOnDeprecated: false,
  // Better module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  // Coverage thresholds for debug implementation
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Specific thresholds for debug logging
    'src/core/logger.ts': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    },
    'src/utils/console-migration.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  // Test categories for organized execution
  projects: [
    {
      displayName: 'unit-debug',
      testMatch: ['<rootDir>/tests/unit/debug/**/*.test.ts'],
      testTimeout: 15000
    },
    {
      displayName: 'integration-debug',
      testMatch: ['<rootDir>/tests/integration/debug/**/*.test.ts'],
      testTimeout: 25000
    },
    {
      displayName: 'validation',
      testMatch: ['<rootDir>/tests/validation/**/*.test.ts'],
      testTimeout: 30000
    },
    {
      displayName: 'london-school-helpers',
      testMatch: ['<rootDir>/tests/utils/**/*.test.ts'],
      testTimeout: 10000
    }
  ],
  // Memory leak detection
  detectLeaks: true,
  detectOpenHandles: true,
  forceExit: true,
  // Parallel execution control
  maxWorkers: 1, // Sequential for deterministic memory/performance testing
  // Enhanced reporting
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports',
      filename: 'debug-implementation-test-report.html',
      expand: true,
      hideIcon: false
    }],
    ['jest-junit', {
      outputDirectory: './test-reports',
      outputName: 'debug-implementation-junit.xml',
      suiteName: 'Debug Implementation Test Suite'
    }]
  ],
  // Custom environment variables for testing
  globals: {
    'process.env.CLAUDE_FLOW_ENV': 'test',
    'process.env.NODE_ENV': 'test'
  }
};
