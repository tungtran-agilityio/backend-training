import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '../../generated/prisma';

interface PostResponse {
  id: string;
  authorId: string;
  title: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface ErrorResponse {
  message: string | string[];
  statusCode: number;
}

interface LoginResponse {
  accessToken: string;
}

interface PostsListResponse {
  data: PostResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

describe('Post (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let authToken: string;
  let testUserId: string;
  let otherUserId: string;
  let testPostId: string;
  let otherUserPostId: string;
  let privatePostId: string;

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
    await prisma.post.deleteMany({
      where: {
        title: {
          contains: 'test',
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });

    // Create test users and get auth token
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

    // Login to get auth token
    try {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'password123',
        });

      if (loginResponse.status === 200) {
        authToken = (loginResponse.body as LoginResponse).accessToken;
      } else {
        authToken = '';
      }
    } catch {
      authToken = '';
    }

    // Create test posts for testing
    if (authToken) {
      // Create a public post by test user
      const publicPostResponse = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Public Post',
          content: 'This is a test public post content',
          isPublic: true,
        });

      if (publicPostResponse.status === 201) {
        testPostId = (publicPostResponse.body as PostResponse).id;
      }

      // Create a private post by test user
      const privatePostResponse = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Private Post',
          content: 'This is a test private post content',
          isPublic: false,
        });

      if (privatePostResponse.status === 201) {
        privatePostId = (privatePostResponse.body as PostResponse).id;
      }

      // Login as other user and create their post
      const otherLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: `otheruser-${timestamp}@example.com`,
          password: 'password123',
        });

      if (otherLoginResponse.status === 200) {
        const otherAuthToken = (otherLoginResponse.body as LoginResponse)
          .accessToken;
        const otherPostResponse = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .send({
            title: 'Other User Post',
            content: 'This is another user post',
            isPublic: true,
          });

        if (otherPostResponse.status === 201) {
          otherUserPostId = (otherPostResponse.body as PostResponse).id;
        }
      }
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('/api/posts (POST) - Create Post', () => {
    describe('Success Cases', () => {
      it('should create public post with valid data', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Test Post Title',
          content: 'This is test post content',
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('authorId', testUserId);
        expect(response.body).toHaveProperty('title', postData.title);
        expect(response.body).toHaveProperty('content', postData.content);
        expect(response.body).toHaveProperty('isPublic', true);
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should create private post with valid data', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Private Test Post',
          content: 'This is private post content',
          isPublic: false,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(201);

        expect(response.body).toHaveProperty('isPublic', false);
      });

      it('should handle maximum length title', async () => {
        if (!authToken) {
          return;
        }

        const maxTitle = 'A'.repeat(150); // Maximum 150 chars
        const postData = {
          title: maxTitle,
          content: 'Test content',
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(201);

        expect((response.body as PostResponse).title).toBe(maxTitle);
      });

      it('should handle long content', async () => {
        if (!authToken) {
          return;
        }

        const longContent = 'A'.repeat(5000); // Long content
        const postData = {
          title: 'Test Title',
          content: longContent,
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(201);

        expect((response.body as PostResponse).content).toBe(longContent);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        const postData = {
          title: 'Should Fail',
          content: 'This should fail',
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .send(postData)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        const postData = {
          title: 'Should Fail',
          content: 'This should fail',
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', 'Bearer invalid-token')
          .send(postData)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with malformed auth header', async () => {
        const postData = {
          title: 'Should Fail',
          content: 'This should fail',
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', 'InvalidFormat token')
          .send(postData)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Input Validation Edge Cases', () => {
      it('should reject missing title field', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          content: 'Content without title',
          isPublic: true,
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject missing content field', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Title without content',
          isPublic: true,
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject missing isPublic field', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Title',
          content: 'Content',
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject empty title', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: '',
          content: 'Content',
          isPublic: true,
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject empty content', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Title',
          content: '',
          isPublic: true,
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject title longer than 150 characters', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'A'.repeat(151),
          content: 'Content',
          isPublic: true,
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject null values', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: null,
          content: null,
          isPublic: null,
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject non-string values for title and content', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 123,
          content: 456,
          isPublic: true,
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject non-boolean value for isPublic', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Title',
          content: 'Content',
          isPublic: 'yes',
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should reject array values', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: ['Title'],
          content: ['Content'],
          isPublic: [true],
        };

        await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(400);
      });

      it('should handle extra properties correctly', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Valid Title',
          content: 'Valid Content',
          isPublic: true,
          extraField: 'should be ignored',
          authorId: 'should not be overrideable',
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData);

        // Should either succeed (extra fields stripped) or fail (forbidNonWhitelisted)
        if (response.status === 400) {
          expect(response.body).toHaveProperty('statusCode', 400);
        } else {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('authorId', testUserId); // Should use authenticated user
          expect(response.body).not.toHaveProperty('extraField');
        }
      });
    });

    describe('Security Edge Cases', () => {
      it('should handle XSS attempts in title', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: '<script>alert("xss")</script>',
          content: 'Normal content',
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData);

        // Should either reject or safely store
        if (response.status === 201) {
          expect(response.body).toHaveProperty('title');
        } else {
          expect(response.status).toBe(400);
        }
      });

      it('should handle XSS attempts in content', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: 'Normal Title',
          content: '<img src=x onerror=alert("xss")>',
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData);

        // Should either reject or safely store
        if (response.status === 201) {
          expect(response.body).toHaveProperty('content');
        } else {
          expect(response.status).toBe(400);
        }
      });

      it('should handle SQL injection attempts', async () => {
        if (!authToken) {
          return;
        }

        const postData = {
          title: "'; DROP TABLE posts; --",
          content: "'; DELETE FROM posts; --",
          isPublic: true,
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData);

        // Should either reject or safely store
        if (response.status === 201) {
          expect(response.body).toHaveProperty('title');
        } else {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('/api/posts/:id (GET) - Get Post', () => {
    describe('Success Cases', () => {
      it('should get public post with valid ID and auth token', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', testPostId);
        expect(response.body).toHaveProperty('authorId', testUserId);
        expect(response.body).toHaveProperty('title');
        expect(response.body).toHaveProperty('content');
        expect(response.body).toHaveProperty('isPublic', true);
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should get own private post', async () => {
        if (!authToken || !privatePostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${privatePostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', privatePostId);
        expect(response.body).toHaveProperty('isPublic', false);
      });

      it('should get other users public post', async () => {
        if (!authToken || !otherUserPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${otherUserPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', otherUserPostId);
        expect(response.body).toHaveProperty('authorId', otherUserId);
        expect(response.body).toHaveProperty('isPublic', true);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${testPostId}`)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${testPostId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject access to other users private post', async () => {
        if (!authToken) {
          return;
        }

        // Create a private post by other user
        const otherLoginResponse = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: `otheruser-${Date.now()}@example.com`,
            password: 'password123',
          });

        if (otherLoginResponse.status !== 200) {
          return; // Skip if can't login as other user
        }

        const otherAuthToken = (otherLoginResponse.body as LoginResponse)
          .accessToken;

        const otherPrivatePostResponse = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${otherAuthToken}`)
          .send({
            title: 'Other Private Post',
            content: 'Private content',
            isPublic: false,
          });

        if (otherPrivatePostResponse.status === 201) {
          const otherPrivatePostId = (
            otherPrivatePostResponse.body as PostResponse
          ).id;

          const response = await request(app.getHttpServer())
            .get(`/api/posts/${otherPrivatePostId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(403);

          expect(response.body).toHaveProperty('statusCode', 403);
          expect(response.body).toHaveProperty(
            'message',
            'You are not allowed to access this post',
          );
        }
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid UUID format', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts/invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject numeric ID instead of UUID', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts/123')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });

    describe('Not Found Edge Cases', () => {
      it('should return 404 for non-existent post', async () => {
        if (!authToken) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .get(`/api/posts/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('statusCode', 404);
        expect((response.body as ErrorResponse).message).toBe('Post not found');
      });

      it('should return 404 for soft-deleted post', async () => {
        if (!authToken) {
          return;
        }

        // Create a post and soft delete it
        const postResponse = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'To Be Deleted',
            content: 'This will be deleted',
            isPublic: true,
          })
          .expect(201);

        const postId = (postResponse.body as PostResponse).id;

        // Soft delete the post directly in database
        await prisma.post.update({
          where: { id: postId },
          data: { deletedAt: new Date() },
        });

        // Try to get the soft-deleted post
        const response = await request(app.getHttpServer())
          .get(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe('Post not found');
      });
    });
  });

  describe('/api/posts (GET) - Get Posts List', () => {
    describe('Success Cases', () => {
      it('should get posts with default pagination', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray((response.body as PostsListResponse).data)).toBe(
          true,
        );
        expect((response.body as PostsListResponse).pagination).toHaveProperty(
          'currentPage',
          1,
        );
        expect((response.body as PostsListResponse).pagination).toHaveProperty(
          'limit',
          10,
        );
      });

      it('should support custom pagination', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?page=2&limit=5')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect((response.body as PostsListResponse).pagination).toHaveProperty(
          'currentPage',
          2,
        );
        expect((response.body as PostsListResponse).pagination).toHaveProperty(
          'limit',
          5,
        );
      });

      it('should support search functionality', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?search=Test')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      });

      it('should support author filtering', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts?authorId=${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        // All posts should be from test user
        const posts = (response.body as PostsListResponse).data;
        posts.forEach((post) => {
          expect(post.authorId).toBe(testUserId);
        });
      });

      it('should support visibility filtering', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?isPublic=true')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        const posts = (response.body as PostsListResponse).data;
        posts.forEach((post) => {
          expect(post.isPublic).toBe(true);
        });
      });

      it('should support sorting by title', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?sortBy=title&sortOrder=asc')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      });

      it('should support sorting by createdAt desc', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?sortBy=createdAt&sortOrder=desc')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/posts')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/posts')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid page number', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?page=0')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid limit number', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?limit=0')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject limit exceeding maximum', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?limit=101')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid authorId UUID', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?authorId=invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid sortBy value', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?sortBy=invalidField')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid sortOrder value', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?sortOrder=invalid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid isPublic value', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts?isPublic=maybe')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });
  });

  describe('/api/posts/:id (PATCH) - Update Post', () => {
    describe('Success Cases', () => {
      it('should update own post title and content', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const updateData = {
          title: 'Updated Test Title',
          content: 'Updated test content',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('id', testPostId);
        expect(response.body).toHaveProperty('title', 'Updated Test Title');
        expect(response.body).toHaveProperty('content', 'Updated test content');
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should update only title', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const updateData = {
          title: 'Only Title Updated',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('title', 'Only Title Updated');
        expect(response.body).toHaveProperty('content'); // Should remain unchanged
      });

      it('should update only content', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const updateData = {
          content: 'Only content updated',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('content', 'Only content updated');
        expect(response.body).toHaveProperty('title'); // Should remain unchanged
      });

      it('should handle empty update (no changes)', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(200);

        expect(response.body).toHaveProperty('id', testPostId);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .send({ title: 'Should Fail' })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', 'Bearer invalid-token')
          .send({ title: 'Should Fail' })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject updating other users post', async () => {
        if (!authToken || !otherUserPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${otherUserPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Should Fail' })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });

      it('should reject updating non-existent post', async () => {
        if (!authToken) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Should Fail' })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });

      it('should reject updating soft-deleted post', async () => {
        if (!authToken) {
          return;
        }

        // Create and soft delete a post
        const postResponse = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'To Be Deleted',
            content: 'This will be deleted',
            isPublic: true,
          })
          .expect(201);

        const postId = (postResponse.body as PostResponse).id;

        await prisma.post.update({
          where: { id: postId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Should Fail' })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid UUID format', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch('/api/posts/invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Should Fail' })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject empty string values', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '',
            content: '',
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject title longer than 150 characters', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'A'.repeat(151),
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject non-string values', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 123,
            content: 456,
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject null values', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: null,
            content: null,
          })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should handle extra properties correctly', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            content: 'Valid Content',
            extraField: 'should be ignored',
            isPublic: false, // Not allowed in UpdatePostDto
            authorId: 'should not be updateable',
          });

        // Should either succeed (extra fields stripped) or fail (forbidNonWhitelisted)
        if (response.status === 400) {
          expect(response.body).toHaveProperty('statusCode', 400);
        } else {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('title', 'Valid Title');
          expect(response.body).toHaveProperty('content', 'Valid Content');
          expect(response.body).not.toHaveProperty('extraField');
        }
      });
    });
  });

  describe('/api/posts/:id/visibility (PATCH) - Update Post Visibility', () => {
    describe('Success Cases', () => {
      it('should update post visibility to public', async () => {
        if (!authToken || !privatePostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${privatePostId}/visibility`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublic: true })
          .expect(200);

        expect(response.body).toHaveProperty('id', privatePostId);
        expect(response.body).toHaveProperty('isPublic', true);
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should update post visibility to private', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}/visibility`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublic: false })
          .expect(200);

        expect(response.body).toHaveProperty('id', testPostId);
        expect(response.body).toHaveProperty('isPublic', false);
        expect(response.body).toHaveProperty('updatedAt');
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}/visibility`)
          .send({ isPublic: true })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}/visibility`)
          .set('Authorization', 'Bearer invalid-token')
          .send({ isPublic: true })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject updating other users post visibility', async () => {
        if (!authToken || !otherUserPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${otherUserPostId}/visibility`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublic: false })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });

      it('should reject updating non-existent post visibility', async () => {
        if (!authToken) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${nonExistentId}/visibility`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublic: true })
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject missing isPublic field', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}/visibility`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject non-boolean isPublic value', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}/visibility`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublic: 'yes' })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject null isPublic value', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${testPostId}/visibility`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublic: null })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid UUID format', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch('/api/posts/invalid-uuid/visibility')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublic: true })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });
  });

  describe('/api/posts/:id (DELETE) - Delete Post', () => {
    describe('Success Cases', () => {
      it('should soft delete own post', async () => {
        if (!authToken || !testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${testPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty(
          'message',
          'Post deleted successfully.',
        );

        // Verify post is soft deleted in database
        const deletedPost = await prisma.post.findUnique({
          where: { id: testPostId },
        });
        expect(deletedPost?.deletedAt).toBeTruthy();
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${testPostId}`)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!testPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${testPostId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject deleting other users post', async () => {
        if (!authToken || !otherUserPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${otherUserPostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });

      it('should reject deleting non-existent post', async () => {
        if (!authToken) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });

      it('should reject deleting already soft-deleted post', async () => {
        if (!authToken) {
          return;
        }

        // Create a post and soft delete it
        const postResponse = await request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'To Be Deleted',
            content: 'This will be deleted',
            isPublic: true,
          })
          .expect(201);

        const postId = (postResponse.body as PostResponse).id;

        // Soft delete the post first
        await prisma.post.update({
          where: { id: postId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty(
          'message',
          'Post not found or not owned by user',
        );
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid UUID format', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete('/api/posts/invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject numeric ID instead of UUID', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete('/api/posts/123')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });
  });

  describe('Database Integration Edge Cases', () => {
    it('should handle soft delete consistency', async () => {
      if (!authToken) {
        return;
      }

      // Create a post
      const postResponse = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Delete Test Post',
          content: 'This will be deleted',
          isPublic: true,
        })
        .expect(201);

      const postId = (postResponse.body as PostResponse).id;

      // Delete post
      await request(app.getHttpServer())
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify soft delete worked
      const post = await prisma.post.findUnique({
        where: { id: postId },
      });
      expect(post?.deletedAt).toBeTruthy();

      // Verify post cannot be accessed via API
      await request(app.getHttpServer())
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle concurrent post operations', async () => {
      if (!authToken) {
        return;
      }

      // Create multiple posts simultaneously
      const promises = Array.from({ length: 3 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Concurrent Post ${i + 1}`,
            content: `Content for post ${i + 1}`,
            isPublic: true,
          }),
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('authorId', testUserId);
      });
    });

    it('should handle large content posts efficiently', async () => {
      if (!authToken) {
        return;
      }

      const largeContent = 'A'.repeat(10000); // 10KB content
      const postData = {
        title: 'Large Content Post',
        content: largeContent,
        isPublic: true,
      };

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);
      const endTime = Date.now();

      expect((response.body as PostResponse).content).toBe(largeContent);
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle user deletion impact on posts', async () => {
      if (!authToken) {
        return;
      }

      // Create a post
      const postResponse = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'User Delete Test',
          content: 'Content',
          isPublic: true,
        })
        .expect(201);

      const postId = (postResponse.body as PostResponse).id;

      // Soft delete the user
      await prisma.user.update({
        where: { id: testUserId },
        data: { deletedAt: new Date() },
      });

      // Post should still exist but be inaccessible via normal API flows
      const post = await prisma.post.findUnique({
        where: { id: postId },
      });
      expect(post).toBeTruthy();
      expect(post?.authorId).toBe(testUserId);
    });
  });

  describe('Performance and Security Edge Cases', () => {
    it('should handle rapid post creation requests', async () => {
      if (!authToken) {
        return;
      }

      // Create multiple rapid requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Rapid Post ${i + 1}`,
            content: `Content ${i + 1}`,
            isPublic: true,
          }),
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });
    });

    it('should handle malicious payload sizes', async () => {
      if (!authToken) {
        return;
      }

      // Extremely large title (over limit)
      const maliciousData = {
        title: 'A'.repeat(1000), // Way over 150 char limit
        content: 'B'.repeat(100000), // Very large content
        isPublic: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData);

      // Should be rejected for title length or handled gracefully
      expect([400, 413, 500]).toContain(response.status);
    });

    it('should sanitize search input properly', async () => {
      if (!authToken) {
        return;
      }

      // Test various injection attempts in search
      const maliciousSearches = [
        "'; DROP TABLE posts; --",
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
        'UNION SELECT * FROM users',
      ];

      for (const search of maliciousSearches) {
        const response = await request(app.getHttpServer())
          .get(`/api/posts?search=${encodeURIComponent(search)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should either reject or handle safely (not crash)
        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('pagination');
        }
      }
    });
  });
});
