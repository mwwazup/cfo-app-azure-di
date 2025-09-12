/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true
    }]
  },
  testMatch: [
    '**/src/utils/**/*.test.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/test/'
  ],
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ]
};
