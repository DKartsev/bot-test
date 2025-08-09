module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/api/server.js'],
  coverageThreshold: {
    global: { lines: 75, statements: 75, functions: 70, branches: 60 }
  },
  moduleNameMapper: {
    '^openai$': '<rootDir>/test/__mocks__/openai.js'
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/src/sync/',
    '<rootDir>/src/versioning/',
    '<rootDir>/src/feedback/',
    '<rootDir>/src/llm/',
    '<rootDir>/src/data/store.js',
    '<rootDir>/src/api/admin.js',
    '<rootDir>/src/api/versions.js',
    '<rootDir>/src/utils/metrics.js'
  ]
};
