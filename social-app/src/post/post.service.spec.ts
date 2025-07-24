import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PostService', () => {
  let service: PostService;
  let prismaService: any;

  const mockPost = {
    id: 'post-123',
    authorId: 'user-123',
    title: 'Test Post',
    content: 'This is a test post content',
    isPublic: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      post: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    const createPostInput = {
      title: 'Test Post',
      content: 'This is a test post content',
      isPublic: true,
      author: {
        connect: {
          id: 'user-123',
        },
      },
    };

    it('should successfully create a post', async () => {
      prismaService.post.create.mockResolvedValue(mockPost);

      const result = await service.createPost(createPostInput);

      expect(prismaService.post.create).toHaveBeenCalledWith({
        data: createPostInput,
      });
      expect(result).toEqual(mockPost);
    });

    it('should handle database errors during post creation', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.post.create.mockRejectedValue(dbError);

      await expect(service.createPost(createPostInput)).rejects.toThrow(
        dbError,
      );
      expect(prismaService.post.create).toHaveBeenCalledWith({
        data: createPostInput,
      });
    });
  });

  describe('getPost', () => {
    it('should successfully get a post', async () => {
      const selectedPost = {
        id: mockPost.id,
        title: mockPost.title,
        authorId: mockPost.authorId,
        content: mockPost.content,
        isPublic: mockPost.isPublic,
        createdAt: mockPost.createdAt,
        updatedAt: mockPost.updatedAt,
      };

      prismaService.post.findUnique.mockResolvedValue(selectedPost);

      const result = await service.getPost({ id: 'post-123' });

      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        select: {
          id: true,
          title: true,
          authorId: true,
          content: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(selectedPost);
    });

    it('should return null when post is not found', async () => {
      prismaService.post.findUnique.mockResolvedValue(null);

      const result = await service.getPost({ id: 'non-existent' });

      expect(result).toBeNull();
    });

    it('should handle database errors during post retrieval', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.post.findUnique.mockRejectedValue(dbError);

      await expect(service.getPost({ id: 'post-123' })).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('getPosts', () => {
    const mockPosts = [
      { ...mockPost, id: 'post-1', authorId: 'user-123', isPublic: true },
      { ...mockPost, id: 'post-2', authorId: 'user-456', isPublic: false },
      { ...mockPost, id: 'post-3', authorId: 'user-123', isPublic: false },
    ];

    it('should get posts with default parameters', async () => {
      prismaService.post.findMany.mockResolvedValue(mockPosts);
      prismaService.post.count.mockResolvedValue(3);

      const result = await service.getPosts({ userId: 'user-123' });

      expect(prismaService.post.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(prismaService.post.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        data: mockPosts,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 3,
          limit: 10,
        },
      });
    });

    it('should get posts with pagination', async () => {
      prismaService.post.findMany.mockResolvedValue([mockPosts[0]]);
      prismaService.post.count.mockResolvedValue(25);

      const result = await service.getPosts({
        page: 3,
        limit: 5,
        userId: 'user-123',
      });

      expect(prismaService.post.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 10, // (3-1) * 5
        take: 5,
      });
      expect(result.pagination).toEqual({
        currentPage: 3,
        totalPages: 5, // Math.ceil(25/5)
        totalItems: 25,
        limit: 5,
      });
    });

    it('should filter posts by authorId', async () => {
      const authorPosts = [mockPosts[0], mockPosts[2]];
      prismaService.post.findMany.mockResolvedValue(authorPosts);
      prismaService.post.count.mockResolvedValue(2);

      const result = await service.getPosts({
        userId: 'user-123',
        authorId: 'user-123',
      });

      expect(prismaService.post.findMany).toHaveBeenCalledWith({
        where: { authorId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual(authorPosts);
    });

    it('should search posts by title and content', async () => {
      const searchResults = [mockPosts[0]];
      prismaService.post.findMany.mockResolvedValue(searchResults);
      prismaService.post.count.mockResolvedValue(1);

      const result = await service.getPosts({
        userId: 'user-123',
        search: 'test',
      });

      expect(prismaService.post.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'test' } },
            { content: { contains: 'test' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual(searchResults);
    });

    it('should filter private posts to only show user own posts when isPublic is false', async () => {
      const privatePosts = [mockPosts[1], mockPosts[2]]; // Both private, different authors
      prismaService.post.findMany.mockResolvedValue(privatePosts);
      prismaService.post.count.mockResolvedValue(2);

      const result = await service.getPosts({
        userId: 'user-123',
        isPublic: false,
      });

      expect(prismaService.post.findMany).toHaveBeenCalledWith({
        where: { isPublic: false },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      // Should only return the post authored by user-123
      expect(result.data).toEqual([mockPosts[2]]);
    });

    it('should handle database errors during posts retrieval', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.post.findMany.mockRejectedValue(dbError);

      await expect(service.getPosts({ userId: 'user-123' })).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('updatePost', () => {
    const updateData = {
      title: 'Updated Title',
      content: 'Updated content',
    };

    it('should successfully update a post', async () => {
      const updatedPost = { ...mockPost, ...updateData };
      prismaService.post.update.mockResolvedValue(updatedPost);

      const result = await service.updatePost({ id: 'post-123' }, updateData);

      expect(prismaService.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: updateData,
      });
      expect(result).toEqual(updatedPost);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { title: 'Only Title Updated' };
      const updatedPost = { ...mockPost, title: 'Only Title Updated' };
      prismaService.post.update.mockResolvedValue(updatedPost);

      const result = await service.updatePost(
        { id: 'post-123' },
        partialUpdate,
      );

      expect(prismaService.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: partialUpdate,
      });
      expect(result).toEqual(updatedPost);
    });

    it('should handle database errors during post update', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.post.update.mockRejectedValue(dbError);

      await expect(
        service.updatePost({ id: 'post-123' }, updateData),
      ).rejects.toThrow(dbError);
    });
  });

  describe('deletePost', () => {
    it('should successfully soft delete a post', async () => {
      const deletedPost = { ...mockPost, deletedAt: new Date('2023-01-02') };
      prismaService.post.update.mockResolvedValue(deletedPost);

      const result = await service.deletePost({ id: 'post-123' });

      expect(prismaService.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(deletedPost);
    });

    it('should handle database errors during post deletion', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.post.update.mockRejectedValue(dbError);

      await expect(service.deletePost({ id: 'post-123' })).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have prismaService dependency injected', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete CRUD operations flow', async () => {
      // Create
      const createInput = {
        title: 'Integration Test Post',
        content: 'Test content',
        isPublic: true,
        author: { connect: { id: 'user-123' } },
      };

      prismaService.post.create.mockResolvedValue(mockPost);
      const createdPost = await service.createPost(createInput);
      expect(createdPost).toEqual(mockPost);

      // Read
      const selectedPost = {
        id: mockPost.id,
        title: mockPost.title,
        authorId: mockPost.authorId,
        content: mockPost.content,
        isPublic: mockPost.isPublic,
        createdAt: mockPost.createdAt,
        updatedAt: mockPost.updatedAt,
      };
      prismaService.post.findUnique.mockResolvedValue(selectedPost);
      const foundPost = await service.getPost({ id: mockPost.id });
      expect(foundPost).toEqual(selectedPost);

      // Update
      const updateData = { title: 'Updated Title' };
      const updatedPost = { ...mockPost, ...updateData };
      prismaService.post.update.mockResolvedValue(updatedPost);
      const postUpdateResult = await service.updatePost(
        { id: mockPost.id },
        updateData,
      );
      expect(postUpdateResult).toEqual(updatedPost);

      // Delete
      const deletedPost = { ...mockPost, deletedAt: new Date() };
      prismaService.post.update.mockResolvedValue(deletedPost);
      const deleteResult = await service.deletePost({ id: mockPost.id });
      expect(deleteResult).toEqual(deletedPost);
    });
  });
});
