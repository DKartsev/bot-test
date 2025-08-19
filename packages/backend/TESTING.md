# Testing Guide

## Overview

This project uses Vitest for testing with comprehensive coverage requirements:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## Test Structure

```
src/test/
├── setup.ts              # Global test setup and mocks
├── utils.ts              # Test utilities and mock factories
├── unit/                 # Unit tests for individual functions
│   ├── middleware.test.ts
│   ├── errorHandler.test.ts
│   └── ...
├── integration/          # Integration tests for API endpoints
│   └── api.test.ts
└── fixtures/             # Test data and fixtures
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Environment

Tests run with:
- `NODE_ENV=test`
- `LOG_LEVEL=silent`
- Mocked external services (OpenAI, PostgreSQL, Redis)
- Test database and Redis instances

## Writing Tests

### Unit Tests

Test individual functions and classes:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRequest, createMockReply } from '../utils.js';

describe('MyFunction', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockReply = createMockReply();
  });

  it('should handle valid input', async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Integration Tests

Test API endpoints and full request/response cycles:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../utils.js';

describe('API Integration Tests', () => {
  let app: any;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('should return health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });
    expect(response.statusCode).toBe(200);
  });
});
```

## Mocking

### External Services

All external services are mocked in `setup.ts`:
- **OpenAI**: Mocked embeddings API
- **PostgreSQL**: Mocked connection and queries
- **Redis**: Mocked cache operations
- **hnswlib-node**: Mocked vector search

### Custom Mocks

Use utility functions for common mocks:

```typescript
import { createMockRequest, createMockReply, createMockPg } from '../utils.js';

const mockRequest = createMockRequest({
  user: { role: 'admin' },
  headers: { 'x-forwarded-for': '192.168.1.1' }
});
```

## Coverage Requirements

### Current Coverage

Run coverage report:
```bash
npm run test:coverage
```

### Coverage Thresholds

- **Global**: 80% minimum for all metrics
- **New Code**: 90% minimum for new features
- **Critical Paths**: 95% minimum for core business logic

### Improving Coverage

1. **Identify uncovered lines**: Check coverage report
2. **Add edge case tests**: Test error conditions and boundaries
3. **Mock external dependencies**: Ensure all code paths are testable
4. **Test error handlers**: Cover exception scenarios

## Best Practices

### Test Organization

1. **Group related tests**: Use nested `describe` blocks
2. **Clear test names**: Describe what is being tested
3. **Setup/teardown**: Use `beforeEach` and `afterEach` hooks
4. **Mock isolation**: Reset mocks between tests

### Assertions

1. **Specific assertions**: Test exact values, not just truthiness
2. **Error testing**: Use `expect().rejects.toThrow()`
3. **Mock verification**: Verify mocks were called correctly
4. **Async handling**: Use proper async/await patterns

### Performance

1. **Fast tests**: Keep tests under 100ms each
2. **Efficient mocks**: Use lightweight mock implementations
3. **Parallel execution**: Tests should be independent
4. **Resource cleanup**: Properly close connections and files

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

### Pre-commit Hooks

Local development:
- Linting check
- Test coverage verification
- Code formatting

## Troubleshooting

### Common Issues

1. **Mock not working**: Check import order and mock registration
2. **Test timeout**: Increase timeout for slow operations
3. **Coverage gaps**: Review uncovered lines in report
4. **Environment issues**: Verify test environment variables

### Debug Mode

Run tests with verbose output:
```bash
npm run test:coverage -- --reporter=verbose
```

### Test Isolation

Ensure tests don't interfere:
- Reset mocks between tests
- Use unique test data
- Clean up resources properly
