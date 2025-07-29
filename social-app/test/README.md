# E2E Testing with Testcontainers

This project uses [Testcontainers](https://testcontainers.com/) for integration and end-to-end testing with a real MySQL database running in Docker containers.

## Prerequisites

- **Docker**: Testcontainers requires Docker to be installed and running on your system
- **Node.js**: Version 16 or higher
- **pnpm**: Package manager

## Setup

The testcontainers setup is already configured and includes:

1. **MySQL Container**: Automatically starts a MySQL 8.0 container for each test run
2. **Database Migration**: Runs Prisma migrations automatically
3. **Test Isolation**: Each test gets a clean database state
4. **Global Setup/Teardown**: Manages container lifecycle

## Running Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run e2e tests in watch mode
pnpm test:e2e:watch

# Run e2e tests with debugging
pnpm test:e2e:debug
```

## Test Configuration

### Files Structure

```
test/
├── jest-e2e.json              # Jest configuration for e2e tests
├── jest-setup.ts              # Global setup (starts container)
├── jest-teardown.ts           # Global teardown (stops container)
├── test-setup-after-env.ts    # Runs before each test (cleans DB)
├── test-database.setup.ts     # Database utility class
├── app.e2e-spec.ts           # Basic app tests
├── auth.e2e-spec.ts          # Authentication API tests
└── README.md                  # This file
```

### Key Features

- **Isolated Tests**: Each test gets a fresh database state
- **Real Database**: Tests run against actual MySQL, not mocks
- **Automatic Migrations**: Prisma migrations are applied automatically
- **Fast Cleanup**: Database is cleaned between tests, not recreated

## Writing E2E Tests

### Basic Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestDatabaseSetup } from './test-database.setup';
import { PrismaClient } from 'generated/prisma';

describe('Your Feature (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = TestDatabaseSetup.getPrismaClient();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should test your feature', async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedpassword',
      },
    });

    // Test API endpoint
    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}`)
      .expect(200);

    expect(response.body.email).toBe('test@example.com');
  });
});
```

### Database Testing Patterns

#### 1. Testing API Endpoints with Database

```typescript
it('should create user via API', async () => {
  const userData = {
    email: 'newuser@example.com',
    firstName: 'New',
    lastName: 'User',
    password: 'password123',
  };

  const response = await request(app.getHttpServer())
    .post('/users')
    .send(userData)
    .expect(201);

  // Verify in database
  const user = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  expect(user).toBeTruthy();
  expect(user?.firstName).toBe(userData.firstName);
});
```

#### 2. Testing Data Relationships

```typescript
it('should create post with author relationship', async () => {
  // Create author
  const author = await prisma.user.create({
    data: {
      email: 'author@example.com',
      firstName: 'Author',
      lastName: 'User',
      password: 'password',
    },
  });

  // Create post via API
  const postData = {
    title: 'Test Post',
    content: 'This is a test post',
    isPublic: true,
  };

  const response = await request(app.getHttpServer())
    .post('/posts')
    .set('Authorization', `Bearer ${getAuthToken(author)}`)
    .send(postData)
    .expect(201);

  // Verify relationships
  const post = await prisma.post.findUnique({
    where: { id: response.body.id },
    include: { author: true },
  });

  expect(post?.author.email).toBe(author.email);
});
```

#### 3. Testing Database Constraints

```typescript
it('should enforce unique email constraint', async () => {
  // Create first user
  await prisma.user.create({
    data: {
      email: 'unique@example.com',
      firstName: 'First',
      lastName: 'User',
      password: 'password',
    },
  });

  // Try to create second user with same email
  await expect(
    request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'unique@example.com',
        firstName: 'Second',
        lastName: 'User',
        password: 'password',
      })
  ).rejects.toThrow();
});
```

## Troubleshooting

### Common Issues

1. **Docker not running**: Ensure Docker is installed and running
2. **Port conflicts**: Testcontainers automatically handles port assignment
3. **Slow tests**: First run may be slower as Docker images are downloaded

### Debug Tips

```bash
# Run with verbose output
DEBUG=testcontainers* pnpm test:e2e

# Run single test file
pnpm test:e2e auth.e2e-spec.ts

# Run with debugger
pnpm test:e2e:debug
```

### Environment Variables

The test setup automatically configures these environment variables:

- `NODE_ENV=test`
- `DATABASE_URL` (set to container URL)
- `PASSWORD_PEPPER=test-pepper-secret`
- `JWT_SECRET=test-jwt-secret-key`
- Hash configuration optimized for testing

## Performance Notes

- **Container Startup**: ~10-20 seconds for first test run
- **Database Cleanup**: ~100-500ms between tests
- **Parallel Execution**: Disabled (`maxWorkers: 1`) for container stability

## Best Practices

1. **Use `beforeAll`** for app initialization
2. **Use `beforeEach`** for test-specific data setup (database is auto-cleaned)
3. **Test real scenarios** with database constraints and relationships
4. **Verify both API responses and database state**
5. **Use meaningful test data** that represents real use cases

## Integration with CI/CD

For CI environments, ensure Docker is available:

```yaml
# Example GitHub Actions
- name: Start Docker
  run: sudo systemctl start docker

- name: Run E2E Tests
  run: pnpm test:e2e
``` 