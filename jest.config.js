module.exports = {
  testMatch: ['**/*.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/out/'],
  verbose: true,
  reporters: ['default'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: false }],
  },
};
