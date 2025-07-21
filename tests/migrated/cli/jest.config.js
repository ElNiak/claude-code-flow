// Jest configuration for migrated CLI tests
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/migrated/cli/**/*.test.{js,ts}',
    '<rootDir>/tests/migrated/cli/**/*.spec.{js,ts}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/cli/**/*.{js,ts}',
    '!src/cli/**/*.d.ts',
    '!src/cli/**/*.test.{js,ts}'
  ],
  coverageDirectory: 'coverage/cli',
  testTimeout: 30000
};
