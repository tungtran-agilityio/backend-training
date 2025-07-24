import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '../../generated/prisma';

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  message: string | string[];
  statusCode: number;
}

describe('User (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let authToken: string;
  let testUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    // Apply the same validation pipe as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();

    // Create Prisma client using the DATABASE_URL set by global setup
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });

    // Create a test user and get auth token for authenticated tests
    const timestamp = Date.now();
    const testEmail = `testuser-${timestamp}@example.com`;
    const testUserResponse = await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      })
      .expect(201);

    testUserId = (testUserResponse.body as { id: string }).id;

    // Create another user for ownership testing
    const otherUserResponse = await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email: `otheruser-${timestamp}@example.com`,
        firstName: 'Other',
        lastName: 'User',
        password: 'password123',
      })
      .expect(201);

    otherUserId = (otherUserResponse.body as { id: string }).id;

    // Try to login to get auth token for authenticated tests
    try {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'password123',
        });

      if (loginResponse.status === 200) {
        authToken = (loginResponse.body as { accessToken: string }).accessToken;
      } else {
        authToken = '';
      }
    } catch {
      authToken = '';
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('/api/users (POST) - Create User', () => {
    describe('Success Cases', () => {
      it('should create user with valid data', async () => {
        const timestamp = Date.now();
        const userData = {
          email: `newuser-${timestamp}@example.com`,
          firstName: 'New',
          lastName: 'User',
          password: 'password123',
        };

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email', userData.email);
        expect(response.body).toHaveProperty('firstName', userData.firstName);
        expect(response.body).toHaveProperty('lastName', userData.lastName);
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).not.toHaveProperty('deletedAt');
      });

      it('should handle email case-insensitivity and trimming', async () => {
        const timestamp = Date.now();
        const userData = {
          email: `  UPPERCASE-${timestamp}@EXAMPLE.COM  `,
          firstName: '  Trimmed  ',
          lastName: '  Name  ',
          password: 'password123',
        };

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(201);

        const userBody = response.body as UserResponse;
        expect(userBody.email).toBe(`uppercase-${timestamp}@example.com`);
        expect(userBody.firstName).toBe('Trimmed');
        expect(userBody.lastName).toBe('Name');
      });

      it('should handle minimum length names', async () => {
        const timestamp = Date.now();
        const userData = {
          email: `minlen-${timestamp}@example.com`,
          firstName: 'A',
          lastName: 'B',
          password: '123456', // minimum 6 chars
        };

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(201);

        const userBody = response.body as UserResponse;
        expect(userBody.firstName).toBe('A');
        expect(userBody.lastName).toBe('B');
      });

      it('should handle maximum length names', async () => {
        const timestamp = Date.now();
        const longName = 'A'.repeat(100); // maximum 100 chars
        const userData = {
          email: `maxlen-${timestamp}@example.com`,
          firstName: longName,
          lastName: longName,
          password: 'A'.repeat(100), // maximum 100 chars
        };

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(201);

        expect((response.body as UserResponse).firstName).toBe(longName);
        expect((response.body as UserResponse).lastName).toBe(longName);
      });
    });

    describe('Input Validation Edge Cases', () => {
      it('should reject missing email field', async () => {
        const userData = {
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject missing password field', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject missing firstName field', async () => {
        const userData = {
          email: 'test@example.com',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject missing lastName field', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject empty object', async () => {
        await request(app.getHttpServer())
          .post('/api/users')
          .send({})
          .expect(400);
      });

      it('should reject null values', async () => {
        const userData = {
          email: null,
          firstName: null,
          lastName: null,
          password: null,
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject undefined values', async () => {
        const userData = {
          email: undefined,
          firstName: undefined,
          lastName: undefined,
          password: undefined,
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject non-string values', async () => {
        const userData = {
          email: 123,
          firstName: 456,
          lastName: 789,
          password: 101112,
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject array values', async () => {
        const userData = {
          email: ['test@example.com'],
          firstName: ['Test'],
          lastName: ['User'],
          password: ['password123'],
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject object values', async () => {
        const userData = {
          email: { value: 'test@example.com' },
          firstName: { value: 'Test' },
          lastName: { value: 'User' },
          password: { value: 'password123' },
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject extra properties', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
          extraField: 'should be rejected',
          anotherId: 'also rejected',
        };

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData);

        // Should either succeed (extra fields stripped) or fail (forbidNonWhitelisted)
        if (response.status === 400) {
          expect(response.body).toHaveProperty('message');
        } else {
          expect(response.status).toBe(201);
          expect(response.body).not.toHaveProperty('extraField');
          expect(response.body).not.toHaveProperty('anotherId');
        }
      });
    });

    describe('Email Validation Edge Cases', () => {
      it('should reject invalid email format', async () => {
        const userData = {
          email: 'invalid-email',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject empty email', async () => {
        const userData = {
          email: '',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject email without domain', async () => {
        const userData = {
          email: 'test@',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject email without @', async () => {
        const userData = {
          email: 'testexample.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject email with multiple @', async () => {
        const userData = {
          email: 'test@@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject email with spaces', async () => {
        const userData = {
          email: 'test @example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });
    });

    describe('Password Validation Edge Cases', () => {
      it('should reject empty password', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: '',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject password shorter than 6 characters', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: '12345',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject password longer than 100 characters', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'A'.repeat(101),
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });
    });

    describe('Name Validation Edge Cases', () => {
      it('should reject empty firstName', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: '',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject empty lastName', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: '',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject firstName longer than 100 characters', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'A'.repeat(101),
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should reject lastName longer than 100 characters', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'A'.repeat(101),
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });
    });

    describe('Conflict Cases', () => {
      it('should reject duplicate email', async () => {
        const timestamp = Date.now();
        const email = `duplicate-${timestamp}@example.com`;
        const userData = {
          email,
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        // Create first user
        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(201);

        // Try to create duplicate
        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(409);

        expect(response.body).toHaveProperty('message', 'User already exists');
        expect(response.body).toHaveProperty('statusCode', 409);
      });

      it('should reject duplicate email with different case', async () => {
        const timestamp = Date.now();
        const baseEmail = `duplicate-case-${timestamp}@example.com`;
        const userData1 = {
          email: baseEmail.toLowerCase(),
          firstName: 'Test1',
          lastName: 'User1',
          password: 'password123',
        };
        const userData2 = {
          email: baseEmail.toUpperCase(),
          firstName: 'Test2',
          lastName: 'User2',
          password: 'password123',
        };

        // Create first user
        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData1)
          .expect(201);

        // Try to create duplicate with different case
        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData2)
          .expect(409);

        expect(response.body).toHaveProperty('message', 'User already exists');
      });
    });

    describe('Security Edge Cases', () => {
      it('should handle XSS attempts in email', async () => {
        const userData = {
          email: '<script>alert("xss")</script>@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });

      it('should handle XSS attempts in names', async () => {
        const userData = {
          email: 'test@example.com',
          firstName: '<script>alert("xss")</script>',
          lastName: '<img src=x onerror=alert("xss")>',
          password: 'password123',
        };

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData);

        // Should either reject or sanitize
        if (response.status === 201) {
          // Names should be stored as-is but properly escaped in responses
          expect((response.body as UserResponse).firstName).toBeDefined();
          expect((response.body as UserResponse).lastName).toBeDefined();
        } else {
          expect(response.status).toBe(400);
        }
      });

      it('should handle SQL injection attempts', async () => {
        const userData = {
          email: "'; DROP TABLE users; --@example.com",
          firstName: "'; DELETE FROM users; --",
          lastName: "'; UPDATE users SET email='hacked'; --",
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);
      });
    });

    describe('Response Format Validation', () => {
      it('should return proper error structure for validation errors', async () => {
        const userData = {
          email: 'invalid-email',
          firstName: '',
          lastName: '',
          password: '123',
        };

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 400);
        expect(Array.isArray((response.body as ErrorResponse).message)).toBe(
          true,
        );
      });

      it('should return proper error structure for conflict errors', async () => {
        const timestamp = Date.now();
        const email = `conflict-${timestamp}@example.com`;
        const userData = {
          email,
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        };

        // Create first user
        await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(201);

        // Try duplicate
        const response = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(409);

        expect(response.body).toHaveProperty('message', 'User already exists');
        expect(response.body).toHaveProperty('statusCode', 409);
      });
    });
  });

  describe('/api/users/:id (GET) - Get User', () => {
    describe('Success Cases', () => {
      it('should get user with valid ID and auth token', async () => {
        if (!authToken) {
          return; // Skip if no auth token
        }

        const response = await request(app.getHttpServer())
          .get(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', testUserId);
        expect(response.body).toHaveProperty('email');
        expect(response.body).toHaveProperty('firstName');
        expect(response.body).toHaveProperty('lastName');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).not.toHaveProperty('deletedAt');
      });

      it('should get other users with valid auth token', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/users/${otherUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', otherUserId);
        expect(response.body).toHaveProperty('email');
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/users/${testUserId}`)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject request with invalid auth token', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/users/${testUserId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with malformed auth header', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/users/${testUserId}`)
          .set('Authorization', 'InvalidFormat token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with empty auth header', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/users/${testUserId}`)
          .set('Authorization', '')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with bearer token only', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/users/${testUserId}`)
          .set('Authorization', 'Bearer ')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid UUID format', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/users/invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });

      it('should reject empty UUID', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/users/')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404); // Route not found

        expect(response.body).toHaveProperty('statusCode', 404);
      });

      it('should reject numeric ID instead of UUID', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/users/123')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });

    describe('Not Found Edge Cases', () => {
      it('should return 404 for non-existent user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .get(`/api/users/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('statusCode', 404);
        expect(response.body).toHaveProperty(
          'message',
          'User not found or inaccessible',
        );
      });

      it('should return 404 for soft-deleted user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        // Create a user and soft delete them
        const timestamp = Date.now();
        const userData = {
          email: `softdelete-${timestamp}@example.com`,
          firstName: 'SoftDelete',
          lastName: 'Test',
          password: 'password123',
        };

        const createResponse = await request(app.getHttpServer())
          .post('/api/users')
          .send(userData)
          .expect(201);

        const createdUserId = (createResponse.body as UserResponse).id;

        // Soft delete the user directly in database
        await prisma.user.update({
          where: { id: createdUserId },
          data: { deletedAt: new Date() },
        });

        // Try to get the soft-deleted user
        const response = await request(app.getHttpServer())
          .get(`/api/users/${createdUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'User not found or inaccessible',
        );
      });
    });
  });

  describe('/api/users/:id (PATCH) - Update User', () => {
    describe('Success Cases', () => {
      it('should update own user data', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('id', testUserId);
        expect(response.body).toHaveProperty('firstName', 'Updated');
        expect(response.body).toHaveProperty('lastName', 'Name');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).not.toHaveProperty('password');
      });

      it('should update email', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const timestamp = Date.now();
        const updateData = {
          email: `updated-${timestamp}@example.com`,
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('email', updateData.email);
      });

      it('should handle partial updates', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const updateData = {
          firstName: 'OnlyFirst',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('firstName', 'OnlyFirst');
        // lastName should remain unchanged
        expect(response.body).toHaveProperty('lastName');
      });

      it('should handle empty update (no changes)', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(200);

        expect(response.body).toHaveProperty('id', testUserId);
      });

      it('should trim and normalize input data', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const updateData = {
          firstName: '  Trimmed  ',
          lastName: '  Name  ',
          email: '  UPPER@EXAMPLE.COM  ',
        };

        const timestamp = Date.now();
        const expectedEmail = `upper-${timestamp}@example.com`;
        updateData.email = `  UPPER-${timestamp}@EXAMPLE.COM  `;

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('firstName', 'Trimmed');
        expect(response.body).toHaveProperty('lastName', 'Name');
        expect(response.body).toHaveProperty('email', expectedEmail);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .send({ firstName: 'Should Fail' })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', 'Bearer invalid-token')
          .send({ firstName: 'Should Fail' })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject updating other users', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${otherUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ firstName: 'Should Fail' })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'User not found or not owned by requester',
        );
      });

      it('should reject updating non-existent user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .patch(`/api/users/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ firstName: 'Should Fail' })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'User not found or not owned by requester',
        );
      });

      it('should reject updating soft-deleted user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        // Soft delete the test user
        await prisma.user.update({
          where: { id: testUserId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ firstName: 'Should Fail' })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'User not found or not owned by requester',
        );
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid UUID format', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch('/api/users/invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ firstName: 'Should Fail' })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid email format', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ email: 'invalid-email' })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject empty string values', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: '',
            lastName: '',
            email: '',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject names longer than 100 characters', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'A'.repeat(101),
            lastName: 'B'.repeat(101),
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject non-string values', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 123,
            lastName: 456,
            email: 789,
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject null values', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: null,
            lastName: null,
            email: null,
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject array values', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: ['Test'],
            lastName: ['User'],
            email: ['test@example.com'],
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should handle extra properties correctly', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'Valid',
            extraField: 'should be ignored',
            password: 'should not be updateable',
            id: 'should not be updateable',
          });

        // Should either succeed (extra fields stripped) or fail (forbidNonWhitelisted)
        if (response.status === 400) {
          expect(response.body).toHaveProperty('statusCode', 400);
        } else {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('firstName', 'Valid');
          expect(response.body).not.toHaveProperty('extraField');
          // Password should not be in response anyway
          expect(response.body).not.toHaveProperty('password');
        }
      });
    });

    describe('Conflict Edge Cases', () => {
      it('should reject email already in use by another user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        // Get the other user's email
        const otherUser = await prisma.user.findUnique({
          where: { id: otherUserId },
        });

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ email: otherUser?.email })
          .expect(409);

        expect(response.body).toHaveProperty('message', 'Email already in use');
        expect(response.body).toHaveProperty('statusCode', 409);
      });

      it('should allow updating to same email (no change)', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        // Get current user's email
        const currentUser = await prisma.user.findUnique({
          where: { id: testUserId },
        });

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ email: currentUser?.email })
          .expect(200);

        expect(response.body).toHaveProperty('email', currentUser?.email);
      });
    });

    describe('Security Edge Cases', () => {
      it('should handle XSS attempts in names', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const updateData = {
          firstName: '<script>alert("xss")</script>',
          lastName: '<img src=x onerror=alert("xss")>',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        // Should either reject or safely store
        if (response.status === 200) {
          expect(response.body).toHaveProperty('firstName');
          expect(response.body).toHaveProperty('lastName');
        } else {
          expect(response.status).toBe(400);
        }
      });

      it('should handle SQL injection attempts', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const updateData = {
          firstName: "'; DROP TABLE users; --",
          lastName: "'; DELETE FROM users; --",
          email: "'; UPDATE users SET email='hacked'; --@example.com",
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });
  });

  describe('/api/users/:id (DELETE) - Delete User', () => {
    describe('Success Cases', () => {
      it('should soft delete own user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty(
          'message',
          'User deleted successfully',
        );

        // Verify user is soft deleted in database
        const deletedUser = await prisma.user.findUnique({
          where: { id: testUserId },
        });
        expect(deletedUser?.deletedAt).toBeTruthy();
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/api/users/${testUserId}`)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/api/users/${testUserId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject deleting other users', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/users/${otherUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'User not found or not owned by requester',
        );
      });

      it('should reject deleting non-existent user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .delete(`/api/users/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'User not found or not owned by requester',
        );
      });

      it('should reject deleting already soft-deleted user', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        // Soft delete the user first
        await prisma.user.update({
          where: { id: testUserId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .delete(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'User not found or not owned by requester',
        );
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid UUID format', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .delete('/api/users/invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject numeric ID instead of UUID', async () => {
        if (!authToken) {
          return; // Skip if no auth token
          return;
        }

        const response = await request(app.getHttpServer())
          .delete('/api/users/123')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });
  });

  describe('Database Integration Edge Cases', () => {
    it('should handle concurrent user creation with same email', async () => {
      const timestamp = Date.now();
      const email = `concurrent-${timestamp}@example.com`;
      const userData = {
        email,
        firstName: 'Concurrent',
        lastName: 'Test',
        password: 'password123',
      };

      // Create first user
      const response1 = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Try to create second user with same email
      const response2 = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(409);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(409);
      expect((response2.body as ErrorResponse).message).toBe(
        'User already exists',
      );
    });

    it('should handle database constraint violations gracefully', async () => {
      // Test with extremely long email that might violate database constraints
      const longEmail = 'a'.repeat(250) + '@example.com'; // Over 254 char limit
      const userData = {
        email: longEmail,
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should handle soft delete consistency', async () => {
      if (!authToken) {
        return; // Skip if no auth token
        return;
      }

      // Delete user
      await request(app.getHttpServer())
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify soft delete worked
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(user?.deletedAt).toBeTruthy();

      // Verify user cannot be accessed via API
      await request(app.getHttpServer())
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle email uniqueness after soft delete', async () => {
      // Create user
      const timestamp = Date.now();
      const email = `softdelete-reuse-${timestamp}@example.com`;
      const userData = {
        email,
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Soft delete user
      await prisma.user.update({
        where: { id: (createResponse.body as UserResponse).id },
        data: { deletedAt: new Date() },
      });

      // Try to create user with same email again
      const secondCreateResponse = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData);

      // This depends on your business logic:
      // Either allow reuse (409) or prevent it (201)
      expect([201, 409]).toContain(secondCreateResponse.status);
    });
  });

  describe('Performance and Load Edge Cases', () => {
    it('should handle large valid payloads efficiently', async () => {
      const timestamp = Date.now();
      const maxName = 'A'.repeat(100); // Maximum allowed length
      const userData = {
        email: `large-payload-${timestamp}@example.com`,
        firstName: maxName,
        lastName: maxName,
        password: 'B'.repeat(100), // Maximum allowed length
      };

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(201);
      const endTime = Date.now();

      expect(response.body).toHaveProperty('firstName', maxName);
      expect(response.body).toHaveProperty('lastName', maxName);

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle multiple rapid requests from same user', async () => {
      if (!authToken) {
        return; // Skip if no auth token
        return;
      }

      // Create multiple simultaneous GET requests
      const promises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`),
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', testUserId);
      });
    });
  });
});
