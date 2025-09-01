/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@assets/(.*)$': '<rootDir>/attached_assets/$1',
    '^@lib/(.*)$': '<rootDir>/client/src/lib/$1',
    '^@components/(.*)$': '<rootDir>/client/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/client/src/pages/$1',
    '^.+\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^wouter$': '<rootDir>/tests/__mocks__/wouter.js',
    '^@tanstack/react-query$': '<rootDir>/tests/__mocks__/react-query.js'
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest']
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@radix-ui|@zag-js)/)'
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/client/jest-setup.js'
  ],
  testMatch: ['<rootDir>/tests/client/*.test.js'],
  collectCoverage: false,
  collectCoverageFrom: [
    'client/src/**/*.tsx',
    'client/src/**/*.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};