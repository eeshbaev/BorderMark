/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?m?$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@noble|hash-wasm)/)'],
};
