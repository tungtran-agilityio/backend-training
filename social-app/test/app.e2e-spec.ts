import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '../generated/prisma';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Set global prefix to match main.ts
    app.setGlobalPrefix('api');
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

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('Basic App Health', () => {
    it('/api (GET) - should return Hello World', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
    });

    it('/api/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Database Integration', () => {
    it('should connect to test database', async () => {
      const timestamp = Date.now();
      // Verify database connection by creating and reading a user
      const user = await prisma.user.create({
        data: {
          email: `test-${timestamp}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          password: 'hashedpassword',
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(`test-${timestamp}@example.com`);
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');

      // Verify user was created in database
      const foundUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(foundUser).toBeTruthy();
      expect(foundUser?.email).toBe(`test-${timestamp}@example.com`);
    });

    it('should handle database constraints', async () => {
      const timestamp = Date.now();
      const email = `unique-${timestamp}@example.com`;

      // Create a user first
      await prisma.user.create({
        data: {
          email,
          firstName: 'Unique',
          lastName: 'User',
          password: 'hashedpassword',
        },
      });

      // Try to create another user with the same email (should fail due to unique constraint)
      await expect(
        prisma.user.create({
          data: {
            email,
            firstName: 'Another',
            lastName: 'User',
            password: 'anotherpassword',
          },
        }),
      ).rejects.toThrow();
    });
  });
});
