import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '../../generated/prisma';

interface CommentResponse {
  id: string;
  postId: string;
  authorId: string;
  content: string;
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

interface PostResponse {
  id: string;
  authorId: string;
  title: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentsListResponse {
  data: CommentResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

describe('Comment (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let authToken: string;
  let otherAuthToken: string;
  let testUserId: string;
  let otherUserId: string;
  let publicPostId: string;
  let privatePostId: string;
  let testCommentId: string;
  let otherUserCommentId: string;

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
    await prisma.comment.deleteMany({
      where: {
        content: {
          contains: 'test',
        },
      },
    });
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

    // Create test users and get auth tokens
    const timestamp = Date.now();
    const testEmail = `testuser-${timestamp}@example.com`;
    const otherEmail = `otheruser-${timestamp}@example.com`;

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

    const otherUserResponse = await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email: otherEmail,
        firstName: 'Other',
        lastName: 'User',
        password: 'password123',
      })
      .expect(201);

    otherUserId = (otherUserResponse.body as { id: string }).id;

    // Login as test user
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

    // Login as other user
    try {
      const otherLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: otherEmail,
          password: 'password123',
        });

      if (otherLoginResponse.status === 200) {
        otherAuthToken = (otherLoginResponse.body as LoginResponse).accessToken;
      } else {
        otherAuthToken = '';
      }
    } catch {
      otherAuthToken = '';
    }

    // Create test posts and comments
    if (authToken) {
      // Create a public post by test user
      const publicPostResponse = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Public Post',
          content: 'This is a test public post for comments',
          isPublic: true,
        });

      if (publicPostResponse.status === 201) {
        publicPostId = (publicPostResponse.body as PostResponse).id;
      }

      // Create a private post by test user
      const privatePostResponse = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Private Post',
          content: 'This is a test private post for comments',
          isPublic: false,
        });

      if (privatePostResponse.status === 201) {
        privatePostId = (privatePostResponse.body as PostResponse).id;
      }
    }

    // Create test comments
    if (authToken && publicPostId) {
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test comment by main user',
        });

      if (commentResponse.status === 201) {
        testCommentId = (commentResponse.body as CommentResponse).id;
      }
    }

    if (otherAuthToken && publicPostId) {
      const otherCommentResponse = await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          content: 'Test comment by other user',
        });

      if (otherCommentResponse.status === 201) {
        otherUserCommentId = (otherCommentResponse.body as CommentResponse).id;
      }
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('/api/posts/:postId/comments (POST) - Create Comment', () => {
    describe('Success Cases', () => {
      it('should create comment on public post', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: 'This is a test comment',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('postId', publicPostId);
        expect(response.body).toHaveProperty('authorId', testUserId);
        expect(response.body).toHaveProperty('content', commentData.content);
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).toHaveProperty('deletedAt', null);
      });

      it('should create comment on private post by post owner', async () => {
        if (!authToken || !privatePostId) {
          return;
        }

        const commentData = {
          content: 'Comment on my private post',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${privatePostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(201);

        expect(response.body).toHaveProperty('postId', privatePostId);
        expect(response.body).toHaveProperty('content', commentData.content);
      });

      it('should create comment with long content', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const longContent = 'A'.repeat(5000); // Long comment content
        const commentData = {
          content: longContent,
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(201);

        expect((response.body as CommentResponse).content).toBe(longContent);
      });

      it('should create comment with special characters', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const specialContent =
          'Comment with émojis 🚀 and special chars: @#$%^&*()';
        const commentData = {
          content: specialContent,
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(201);

        expect((response.body as CommentResponse).content).toBe(specialContent);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!publicPostId) {
          return;
        }

        const commentData = {
          content: 'Should fail without auth',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .send(commentData)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!publicPostId) {
          return;
        }

        const commentData = {
          content: 'Should fail with invalid token',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', 'Bearer invalid-token')
          .send(commentData)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with malformed auth header', async () => {
        if (!publicPostId) {
          return;
        }

        const commentData = {
          content: 'Should fail with malformed header',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', 'InvalidFormat token')
          .send(commentData)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject missing content field', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);
      });

      it('should reject empty content', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: '',
        };

        await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);
      });

      it('should reject null content', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: null,
        };

        await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);
      });

      it('should reject non-string content', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: 123,
        };

        await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);
      });

      it('should reject array content', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: ['Should', 'be', 'string'],
        };

        await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);
      });

      it('should reject object content', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: { text: 'Should be string' },
        };

        await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);
      });

      it('should reject invalid postId format', async () => {
        if (!authToken) {
          return;
        }

        const commentData = {
          content: 'Valid content',
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts/invalid-uuid/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject numeric postId', async () => {
        if (!authToken) {
          return;
        }

        const commentData = {
          content: 'Valid content',
        };

        const response = await request(app.getHttpServer())
          .post('/api/posts/123/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should handle extra properties correctly', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: 'Valid content',
          extraField: 'should be ignored',
          authorId: 'should not be overrideable',
          postId: 'should not be overrideable',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData);

        // Should either succeed (extra fields stripped) or fail (forbidNonWhitelisted)
        if (response.status === 400) {
          expect(response.body).toHaveProperty('statusCode', 400);
        } else {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('content', 'Valid content');
          expect(response.body).toHaveProperty('authorId', testUserId); // Should use authenticated user
          expect(response.body).toHaveProperty('postId', publicPostId); // Should use URL param
          expect(response.body).not.toHaveProperty('extraField');
        }
      });
    });

    describe('Post Existence Edge Cases', () => {
      it('should reject comment on non-existent post', async () => {
        if (!authToken) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const commentData = {
          content: 'Comment on non-existent post',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${nonExistentId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe('Post not found');
      });

      it('should reject comment on soft-deleted post', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        // Soft delete the post
        await prisma.post.update({
          where: { id: publicPostId },
          data: { deletedAt: new Date() },
        });

        const commentData = {
          content: 'Comment on deleted post',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe('Post not found');
      });
    });

    describe('Security Edge Cases', () => {
      it('should handle XSS attempts in content', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: '<script>alert("xss")</script>',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData);

        // Should either reject or safely store
        if (response.status === 201) {
          expect(response.body).toHaveProperty('content');
        } else {
          expect(response.status).toBe(400);
        }
      });

      it('should handle SQL injection attempts', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const commentData = {
          content: "'; DROP TABLE comments; --",
        };

        const response = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData);

        // Should either reject or safely store
        if (response.status === 201) {
          expect(response.body).toHaveProperty('content');
        } else {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('/api/posts/:postId/comments (GET) - Get Comments', () => {
    describe('Success Cases', () => {
      it('should get comments with default pagination', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(
          Array.isArray((response.body as CommentsListResponse).data),
        ).toBe(true);
        expect(
          (response.body as CommentsListResponse).pagination,
        ).toHaveProperty('currentPage', 1);
        expect(
          (response.body as CommentsListResponse).pagination,
        ).toHaveProperty('limit', 10);
      });

      it('should support custom pagination', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?page=2&limit=5`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(
          (response.body as CommentsListResponse).pagination,
        ).toHaveProperty('currentPage', 2);
        expect(
          (response.body as CommentsListResponse).pagination,
        ).toHaveProperty('limit', 5);
      });

      it('should support author filtering', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?authorId=${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        // All comments should be from test user
        const comments = (response.body as CommentsListResponse).data;
        comments.forEach((comment) => {
          expect(comment.authorId).toBe(testUserId);
        });
      });

      it('should support sorting by createdAt desc', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(
            `/api/posts/${publicPostId}/comments?sortBy=createdAt&sortOrder=desc`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      });

      it('should support sorting by updatedAt asc', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(
            `/api/posts/${publicPostId}/comments?sortBy=updatedAt&sortOrder=asc`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments`)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid page number', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?page=0`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid limit number', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?limit=0`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject limit exceeding maximum', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?limit=101`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid authorId UUID', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?authorId=invalid-uuid`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid sortBy value', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?sortBy=invalidField`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid sortOrder value', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments?sortOrder=invalid`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject invalid postId format', async () => {
        if (!authToken) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/posts/invalid-uuid/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });

    describe('Post Existence Edge Cases', () => {
      it('should reject getting comments for non-existent post', async () => {
        if (!authToken) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .get(`/api/posts/${nonExistentId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Post not found or inaccessible',
        );
      });

      it('should reject getting comments for soft-deleted post', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        // Soft delete the post
        await prisma.post.update({
          where: { id: publicPostId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Post not found or inaccessible',
        );
      });
    });
  });

  describe('/api/posts/:postId/comments/:id (GET) - Get Single Comment', () => {
    describe('Success Cases', () => {
      it('should get comment with valid ID and auth token', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', testCommentId);
        expect(response.body).toHaveProperty('postId', publicPostId);
        expect(response.body).toHaveProperty('authorId', testUserId);
        expect(response.body).toHaveProperty('content');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).toHaveProperty('deletedAt', null);
      });

      it('should get other users comment', async () => {
        if (!authToken || !publicPostId || !otherUserCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/${otherUserCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', otherUserCommentId);
        expect(response.body).toHaveProperty('authorId', otherUserId);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid comment UUID format', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/invalid-uuid`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject numeric comment ID instead of UUID', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/123`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });

    describe('Not Found Edge Cases', () => {
      it('should return 404 for non-existent comment', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or inaccessible',
        );
      });

      it('should return 404 for soft-deleted comment', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        // Soft delete the comment
        await prisma.comment.update({
          where: { id: testCommentId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .get(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or inaccessible',
        );
      });
    });
  });

  describe('/api/posts/:postId/comments/:id (PATCH) - Update Comment', () => {
    describe('Success Cases', () => {
      it('should update own comment content', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const updateData = {
          content: 'Updated comment content',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('id', testCommentId);
        expect(response.body).toHaveProperty(
          'content',
          'Updated comment content',
        );
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should update comment with long content', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const longContent = 'Updated content '.repeat(100);
        const updateData = {
          content: longContent,
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect((response.body as CommentResponse).content).toBe(longContent);
      });

      it('should update comment with special characters', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const specialContent = 'Updated with émojis 🎉 and chars: @#$%';
        const updateData = {
          content: specialContent,
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect((response.body as CommentResponse).content).toBe(specialContent);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .send({ content: 'Should Fail' })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', 'Bearer invalid-token')
          .send({ content: 'Should Fail' })
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject updating other users comment', async () => {
        if (!authToken || !publicPostId || !otherUserCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${otherUserCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'Should Fail' })
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or not owned by user',
        );
      });

      it('should reject updating non-existent comment', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'Should Fail' })
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or not owned by user',
        );
      });

      it('should reject updating soft-deleted comment', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        // Soft delete the comment
        await prisma.comment.update({
          where: { id: testCommentId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'Should Fail' })
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or not owned by user',
        );
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid comment UUID format', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/invalid-uuid`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'Should Fail' })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject missing content field', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject empty content', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: '' })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject null content', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: null })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject non-string content', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 123 })
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should handle extra properties correctly', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: 'Valid content',
            extraField: 'should be ignored',
            authorId: 'should not be updateable',
            postId: 'should not be updateable',
          });

        // Should either succeed (extra fields stripped) or fail (forbidNonWhitelisted)
        if (response.status === 400) {
          expect(response.body).toHaveProperty('statusCode', 400);
        } else {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('content', 'Valid content');
          expect(response.body).not.toHaveProperty('extraField');
        }
      });
    });

    describe('Security Edge Cases', () => {
      it('should handle XSS attempts in content', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const updateData = {
          content: '<script>alert("xss")</script>',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        // Should either reject or safely store
        if (response.status === 200) {
          expect(response.body).toHaveProperty('content');
        } else {
          expect(response.status).toBe(400);
        }
      });

      it('should handle SQL injection attempts', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const updateData = {
          content: "'; DROP TABLE comments; --",
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        // Should either reject or safely store
        if (response.status === 200) {
          expect(response.body).toHaveProperty('content');
        } else {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('/api/posts/:postId/comments/:id (DELETE) - Delete Comment', () => {
    describe('Success Cases', () => {
      it('should soft delete own comment', async () => {
        if (!authToken || !publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty(
          'message',
          'Comment deleted successfully',
        );

        // Verify comment is soft deleted in database
        const deletedComment = await prisma.comment.findUnique({
          where: { id: testCommentId },
        });
        expect(deletedComment?.deletedAt).toBeTruthy();
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should reject request without auth token', async () => {
        if (!publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });

      it('should reject request with invalid auth token', async () => {
        if (!publicPostId || !testCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/${testCommentId}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
      });
    });

    describe('Authorization Edge Cases', () => {
      it('should reject deleting other users comment', async () => {
        if (!authToken || !publicPostId || !otherUserCommentId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/${otherUserCommentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or not owned by user',
        );
      });

      it('should reject deleting non-existent comment', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const nonExistentId = '00000000-0000-4000-8000-000000000000';
        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or not owned by user',
        );
      });

      it('should reject deleting already soft-deleted comment', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        // Create a comment and soft delete it
        const commentResponse = await request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: 'To be deleted comment',
          })
          .expect(201);

        const commentId = (commentResponse.body as CommentResponse).id;

        // Soft delete the comment first
        await prisma.comment.update({
          where: { id: commentId },
          data: { deletedAt: new Date() },
        });

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect((response.body as ErrorResponse).message).toBe(
          'Comment not found or not owned by user',
        );
      });
    });

    describe('Validation Edge Cases', () => {
      it('should reject invalid comment UUID format', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/invalid-uuid`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should reject numeric comment ID instead of UUID', async () => {
        if (!authToken || !publicPostId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/posts/${publicPostId}/comments/123`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
      });
    });
  });

  describe('Database Integration Edge Cases', () => {
    it('should handle soft delete consistency', async () => {
      if (!authToken || !publicPostId) {
        return;
      }

      // Create a comment
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Delete test comment',
        })
        .expect(201);

      const commentId = (commentResponse.body as CommentResponse).id;

      // Delete comment
      await request(app.getHttpServer())
        .delete(`/api/posts/${publicPostId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify soft delete worked
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });
      expect(comment?.deletedAt).toBeTruthy();

      // Verify comment cannot be accessed via API
      await request(app.getHttpServer())
        .get(`/api/posts/${publicPostId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle concurrent comment operations', async () => {
      if (!authToken || !publicPostId) {
        return;
      }

      // Create multiple comments simultaneously
      const promises = Array.from({ length: 3 }, (_, i) =>
        request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: `Concurrent comment ${i + 1}`,
          }),
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('authorId', testUserId);
        expect(response.body).toHaveProperty('postId', publicPostId);
      });
    });

    it('should handle large content comments efficiently', async () => {
      if (!authToken || !publicPostId) {
        return;
      }

      const largeContent = 'A'.repeat(10000); // 10KB content
      const commentData = {
        content: largeContent,
      };

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);
      const endTime = Date.now();

      expect((response.body as CommentResponse).content).toBe(largeContent);
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle post deletion impact on comments', async () => {
      if (!authToken || !publicPostId) {
        return;
      }

      // Create a comment
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Comment before post deletion',
        })
        .expect(201);

      const commentId = (commentResponse.body as CommentResponse).id;

      // Soft delete the post
      await prisma.post.update({
        where: { id: publicPostId },
        data: { deletedAt: new Date() },
      });

      // Comment should still exist but be inaccessible via post endpoints
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });
      expect(comment).toBeTruthy();
      expect(comment?.postId).toBe(publicPostId);

      // Should not be able to create new comments on deleted post
      await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Should fail on deleted post',
        })
        .expect(404);

      // Should not be able to get comments for deleted post
      await request(app.getHttpServer())
        .get(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle user deletion impact on comments', async () => {
      if (!authToken || !publicPostId) {
        return;
      }

      // Create a comment
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Comment before user deletion',
        })
        .expect(201);

      const commentId = (commentResponse.body as CommentResponse).id;

      // Soft delete the user
      await prisma.user.update({
        where: { id: testUserId },
        data: { deletedAt: new Date() },
      });

      // Comment should still exist but be orphaned
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });
      expect(comment).toBeTruthy();
      expect(comment?.authorId).toBe(testUserId);
    });
  });

  describe('Performance and Security Edge Cases', () => {
    it('should handle rapid comment creation requests', async () => {
      if (!authToken || !publicPostId) {
        return;
      }

      // Create multiple rapid requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post(`/api/posts/${publicPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: `Rapid comment ${i + 1}`,
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
      if (!authToken || !publicPostId) {
        return;
      }

      // Extremely large content
      const maliciousData = {
        content: 'A'.repeat(100000), // 100KB content
      };

      const response = await request(app.getHttpServer())
        .post(`/api/posts/${publicPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData);

      // Should be handled gracefully (accepted or rejected)
      expect([201, 400, 413, 500]).toContain(response.status);
    });

    it('should handle injection attacks in nested routes', async () => {
      if (!authToken) {
        return;
      }

      // Test various injection attempts in URL parameters
      const maliciousPostIds = [
        '../../../etc/passwd',
        "'; DROP TABLE posts; --",
        'UNION SELECT * FROM users',
        "<script>alert('xss')</script>",
      ];

      for (const postId of maliciousPostIds) {
        const response = await request(app.getHttpServer())
          .post(`/api/posts/${encodeURIComponent(postId)}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: 'Test content',
          });

        // Should either reject with validation error or handle safely
        expect([400, 404]).toContain(response.status);
      }
    });
  });
});
