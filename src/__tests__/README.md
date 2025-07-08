# FocuSprint Milestone System Tests

This directory contains comprehensive tests for the FocuSprint milestone system, covering unit tests, API tests, and end-to-end integration tests.

## Test Structure

```
src/__tests__/
├── milestones/
│   └── milestone-system.test.ts     # Unit tests for milestone functionality
├── api/
│   ├── milestone-progress.test.ts   # API tests for milestone progress endpoints
│   └── task-webhook.test.ts         # API tests for task webhook integration
├── integration/
│   └── milestone-e2e.test.ts        # End-to-end integration tests
└── README.md                        # This file
```

## Running Tests

### Quick Start

```bash
# Run all milestone tests
npm test -- --testPathPattern="milestone"

# Run specific test suites
npm test -- src/__tests__/milestones/milestone-system.test.ts
npm test -- src/__tests__/api/milestone-progress.test.ts
npm test -- src/__tests__/integration/milestone-e2e.test.ts
```

### Using the Test Script

```bash
# Run all milestone tests with detailed output
./scripts/test-milestones.sh

# Run specific test types
./scripts/test-milestones.sh unit
./scripts/test-milestones.sh api
./scripts/test-milestones.sh integration
./scripts/test-milestones.sh coverage
./scripts/test-milestones.sh endpoints
```

## Test Categories

### 1. Unit Tests (`milestones/milestone-system.test.ts`)

Tests core milestone functionality:
- ✅ Milestone creation and validation
- ✅ Progress calculation algorithms
- ✅ Task-milestone linking
- ✅ MilestoneProgressService methods
- ✅ Error handling and edge cases

**Coverage**: Core business logic, RPC functions, service methods

### 2. API Tests (`api/milestone-progress.test.ts`, `api/task-webhook.test.ts`)

Tests API endpoints and webhooks:
- ✅ Milestone progress update endpoints
- ✅ Authentication and authorization
- ✅ Request/response validation
- ✅ Task webhook processing
- ✅ Error handling and status codes

**Coverage**: REST API endpoints, webhook handlers, authentication

### 3. Integration Tests (`integration/milestone-e2e.test.ts`)

Tests end-to-end milestone workflows:
- ✅ Complete milestone lifecycle
- ✅ Real database interactions
- ✅ Task movement and progress updates
- ✅ Status transitions
- ✅ Data consistency

**Coverage**: Full system integration, database operations, real-time updates

## Test Environment Setup

### Required Environment Variables

```bash
# For unit and API tests (mocked)
NODE_ENV=test

# For integration tests (requires real Supabase instance)
SUPABASE_URL=your_test_supabase_url
SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_key

# For webhook and cron job tests
CRON_SECRET=test_cron_secret
SUPABASE_WEBHOOK_SECRET=test_webhook_secret
```

### Test Database Setup

Integration tests require a test Supabase instance with:
1. All milestone-related tables and RPC functions
2. Test data isolation (separate from production)
3. Proper RLS policies for test scenarios

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage of core milestone logic
- **API Tests**: 85%+ coverage of endpoint handlers
- **Integration Tests**: 80%+ coverage of critical user flows

Current coverage targets:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Key Test Scenarios

### Milestone Creation
- ✅ Valid milestone creation with all parameters
- ✅ Validation of required fields
- ✅ Default value assignment
- ✅ Project association verification

### Progress Calculation
- ✅ Empty milestone (0% progress)
- ✅ Partial completion (25%, 50%, 75%)
- ✅ Full completion (100% progress)
- ✅ Task movement between columns
- ✅ Task creation/deletion impact

### Task Integration
- ✅ Linking tasks to milestones
- ✅ Unlinking tasks from milestones
- ✅ Progress updates on task status changes
- ✅ Bulk task operations

### Real-time Updates
- ✅ Webhook triggers on task changes
- ✅ Automatic progress recalculation
- ✅ Status transitions (not_started → in_progress → completed)
- ✅ Notification system integration

### Error Handling
- ✅ Invalid milestone IDs
- ✅ Missing required parameters
- ✅ Database connection failures
- ✅ Authentication errors
- ✅ Concurrent update conflicts

## Debugging Tests

### Common Issues

1. **Integration tests skipped**: Missing environment variables
   ```bash
   export SUPABASE_URL=your_test_url
   export SUPABASE_ANON_KEY=your_test_key
   ```

2. **API tests failing**: Server not running or wrong port
   ```bash
   npm run dev  # Start development server
   ```

3. **Database errors**: Test data conflicts or missing tables
   ```bash
   # Reset test database or check table schemas
   ```

### Debug Commands

```bash
# Run tests with verbose output
npm test -- --verbose --testPathPattern="milestone"

# Run single test file with debugging
npm test -- --testPathPattern="milestone-system.test.ts" --verbose

# Generate detailed coverage report
npm test -- --coverage --testPathPattern="milestone" --coverageReporters=html

# Run tests in watch mode during development
npm test -- --watch --testPathPattern="milestone"
```

## Contributing

When adding new milestone features:

1. **Write tests first** (TDD approach)
2. **Cover all scenarios** (happy path + edge cases)
3. **Update integration tests** for new workflows
4. **Maintain coverage** above threshold
5. **Document test scenarios** in this README

### Test Naming Convention

```typescript
// Unit tests
describe('MilestoneProgressService', () => {
  describe('updateMilestoneProgress', () => {
    it('should update progress when tasks are completed', async () => {
      // Test implementation
    })
  })
})

// API tests
describe('POST /api/cron/milestone-progress', () => {
  it('should update specific milestone successfully', async () => {
    // Test implementation
  })
})

// Integration tests
describe('Milestone System E2E', () => {
  it('should create milestone and calculate progress correctly', async () => {
    // Test implementation
  })
})
```

## Performance Considerations

- Integration tests may take 30+ seconds due to database operations
- Use `testTimeout: 30000` for integration tests
- Mock external dependencies in unit tests for speed
- Parallel test execution for faster CI/CD

## Continuous Integration

Tests are designed to run in CI/CD environments:
- Unit and API tests run on every commit
- Integration tests run on pull requests
- Coverage reports uploaded to code quality tools
- Test results integrated with GitHub status checks
