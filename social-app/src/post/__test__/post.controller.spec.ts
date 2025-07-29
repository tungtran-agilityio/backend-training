import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { PostController } from '../post.controller';
import { PostService } from '../post.service';
import { CreatePostDto } from '../dtos/create-post.dto';
import { UpdatePostDto } from '../dtos/update-post.dto';
import { UpdatePostVisibilityDto } from '../dtos/update-post-visibility.dto';
import { GetPostsQuery } from '../dtos/get-posts-query.dto';

describe('PostController', () => {
  let controller: PostController;
  let postService: jest.Mocked<PostService>;

  const mockPostService = {
    createPost: jest.fn(),
    getPost: jest.fn(),
    getPosts: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const mockRequest = {
    user: mockUser,
  } as unknown as Request;

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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: mockPostService,
        },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
    postService = module.get(PostService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    const createPostDto: CreatePostDto = {
      title: 'Test Post',
      content: 'This is a test post content',
      isPublic: true,
    };

    it('should successfully create a post', async () => {
      postService.createPost.mockResolvedValue(mockPost);

      const result = await controller.createPost(createPostDto, mockRequest);

      expect(postService.createPost).toHaveBeenCalledWith({
        ...createPostDto,
        author: {
          connect: {
            id: mockUser.userId,
          },
        },
      });
      expect(result).toEqual(mockPost);
    });

    it('should handle service errors during post creation', async () => {
      const serviceError = new Error('Database connection failed');
      postService.createPost.mockRejectedValue(serviceError);

      await expect(
        controller.createPost(createPostDto, mockRequest),
      ).rejects.toThrow(serviceError);

      expect(postService.createPost).toHaveBeenCalledWith({
        ...createPostDto,
        author: {
          connect: {
            id: mockUser.userId,
          },
        },
      });
    });

    it('should handle missing user in request', async () => {
      const requestWithoutUser = { user: undefined } as unknown as Request;

      await expect(
        controller.createPost(createPostDto, requestWithoutUser),
      ).rejects.toThrow();
    });
  });

  describe('getPost', () => {
    const postId = 'post-123';

    it('should successfully get a public post', async () => {
      const publicPost = { ...mockPost, isPublic: true };
      postService.getPost.mockResolvedValue(publicPost);

      const result = await controller.getPost(postId, mockRequest);

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(result).toEqual(publicPost);
    });

    it('should successfully get own private post', async () => {
      const privatePost = {
        ...mockPost,
        isPublic: false,
        authorId: 'user-123',
      };
      postService.getPost.mockResolvedValue(privatePost);

      const result = await controller.getPost(postId, mockRequest);

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(result).toEqual(privatePost);
    });

    it('should throw NotFoundException when post does not exist', async () => {
      postService.getPost.mockResolvedValue(null);

      await expect(controller.getPost(postId, mockRequest)).rejects.toThrow(
        new NotFoundException('Post not found'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
    });

    it("should throw ForbiddenException when accessing someone else's private post", async () => {
      const privatePost = {
        ...mockPost,
        isPublic: false,
        authorId: 'other-user',
      };
      postService.getPost.mockResolvedValue(privatePost);

      await expect(controller.getPost(postId, mockRequest)).rejects.toThrow(
        new ForbiddenException('You are not allowed to access this post'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
    });

    it('should handle service errors during post retrieval', async () => {
      const serviceError = new Error('Database connection failed');
      postService.getPost.mockRejectedValue(serviceError);

      await expect(controller.getPost(postId, mockRequest)).rejects.toThrow(
        serviceError,
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
    });
  });

  describe('getPosts', () => {
    const mockPostsResponse = {
      data: [mockPost],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        limit: 10,
      },
    };

    it('should successfully get posts with default query', async () => {
      const query = {} as GetPostsQuery;
      postService.getPosts.mockResolvedValue(mockPostsResponse);

      const result = await controller.getPosts(query, mockRequest);

      expect(postService.getPosts).toHaveBeenCalledWith({
        ...query,
        userId: mockUser.userId,
      });
      expect(result).toEqual(mockPostsResponse);
    });

    it('should successfully get posts with custom query parameters', async () => {
      const query: GetPostsQuery = {
        page: 2,
        limit: 5,
        authorId: 'author-123',
        search: 'test',
        sortBy: 'title',
        sortOrder: 'asc',
        isPublic: true,
      };
      postService.getPosts.mockResolvedValue(mockPostsResponse);

      const result = await controller.getPosts(query, mockRequest);

      expect(postService.getPosts).toHaveBeenCalledWith({
        ...query,
        userId: mockUser.userId,
      });
      expect(result).toEqual(mockPostsResponse);
    });

    it('should handle service errors during posts retrieval', async () => {
      const query = {} as GetPostsQuery;
      const serviceError = new Error('Database connection failed');
      postService.getPosts.mockRejectedValue(serviceError);

      await expect(controller.getPosts(query, mockRequest)).rejects.toThrow(
        serviceError,
      );

      expect(postService.getPosts).toHaveBeenCalledWith({
        ...query,
        userId: mockUser.userId,
      });
    });
  });

  describe('updatePost', () => {
    const postId = 'post-123';
    const updatePostDto: UpdatePostDto = {
      title: 'Updated Post Title',
      content: 'Updated post content',
    };

    it('should successfully update own post', async () => {
      const updatedPost = { ...mockPost, ...updatePostDto };
      postService.getPost.mockResolvedValue(mockPost);
      postService.updatePost.mockResolvedValue(updatedPost);

      const result = await controller.updatePost(
        postId,
        updatePostDto,
        mockRequest,
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.updatePost).toHaveBeenCalledWith(
        { id: postId },
        updatePostDto,
      );
      expect(result).toEqual(updatedPost);
    });

    it('should throw NotFoundException when post does not exist', async () => {
      postService.getPost.mockResolvedValue(null);

      await expect(
        controller.updatePost(postId, updatePostDto, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Post not found or not owned by user'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.updatePost).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when trying to update someone else's post", async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' };
      postService.getPost.mockResolvedValue(otherUserPost);

      await expect(
        controller.updatePost(postId, updatePostDto, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Post not found or not owned by user'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.updatePost).not.toHaveBeenCalled();
    });

    it('should handle service errors during post update', async () => {
      postService.getPost.mockResolvedValue(mockPost);
      const serviceError = new Error('Database connection failed');
      postService.updatePost.mockRejectedValue(serviceError);

      await expect(
        controller.updatePost(postId, updatePostDto, mockRequest),
      ).rejects.toThrow(serviceError);

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.updatePost).toHaveBeenCalledWith(
        { id: postId },
        updatePostDto,
      );
    });
  });

  describe('updatePostVisibility', () => {
    const postId = 'post-123';
    const updateVisibilityDto: UpdatePostVisibilityDto = {
      isPublic: false,
    };

    it('should successfully update post visibility', async () => {
      const updatedPost = { ...mockPost, isPublic: false };
      postService.getPost.mockResolvedValue(mockPost);
      postService.updatePost.mockResolvedValue(updatedPost);

      const result = await controller.updatePostVisibility(
        postId,
        updateVisibilityDto,
        mockRequest,
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.updatePost).toHaveBeenCalledWith(
        { id: postId },
        { isPublic: updateVisibilityDto.isPublic },
      );
      expect(result).toEqual({
        id: updatedPost.id,
        isPublic: updatedPost.isPublic,
        updatedAt: updatedPost.updatedAt,
      });
    });

    it('should throw NotFoundException when post does not exist', async () => {
      postService.getPost.mockResolvedValue(null);

      await expect(
        controller.updatePostVisibility(
          postId,
          updateVisibilityDto,
          mockRequest,
        ),
      ).rejects.toThrow(
        new NotFoundException('Post not found or not owned by user'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.updatePost).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when trying to update someone else's post visibility", async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' };
      postService.getPost.mockResolvedValue(otherUserPost);

      await expect(
        controller.updatePostVisibility(
          postId,
          updateVisibilityDto,
          mockRequest,
        ),
      ).rejects.toThrow(
        new NotFoundException('Post not found or not owned by user'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.updatePost).not.toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    const postId = 'post-123';

    it('should successfully delete own post', async () => {
      postService.getPost.mockResolvedValue(mockPost);
      postService.deletePost.mockResolvedValue(mockPost);

      const result = await controller.deletePost(postId, mockRequest);

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.deletePost).toHaveBeenCalledWith({ id: postId });
      expect(result).toEqual({
        message: 'Post deleted successfully.',
      });
    });

    it('should throw NotFoundException when post does not exist', async () => {
      postService.getPost.mockResolvedValue(null);

      await expect(controller.deletePost(postId, mockRequest)).rejects.toThrow(
        new NotFoundException('Post not found or not owned by user'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.deletePost).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when trying to delete someone else's post", async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' };
      postService.getPost.mockResolvedValue(otherUserPost);

      await expect(controller.deletePost(postId, mockRequest)).rejects.toThrow(
        new NotFoundException('Post not found or not owned by user'),
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.deletePost).not.toHaveBeenCalled();
    });

    it('should handle service errors during post deletion', async () => {
      postService.getPost.mockResolvedValue(mockPost);
      const serviceError = new Error('Database connection failed');
      postService.deletePost.mockRejectedValue(serviceError);

      await expect(controller.deletePost(postId, mockRequest)).rejects.toThrow(
        serviceError,
      );

      expect(postService.getPost).toHaveBeenCalledWith({ id: postId });
      expect(postService.deletePost).toHaveBeenCalledWith({ id: postId });
    });
  });

  describe('controller initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have postService dependency injected', () => {
      expect(postService).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete CRUD flow for a post', async () => {
      const createPostDto: CreatePostDto = {
        title: 'Test Post',
        content: 'This is a test post content',
        isPublic: true,
      };

      // Create post
      postService.createPost.mockResolvedValue(mockPost);
      const createResult = await controller.createPost(
        createPostDto,
        mockRequest,
      );
      expect(createResult).toEqual(mockPost);

      // Get post
      postService.getPost.mockResolvedValue(mockPost);
      const getResult = await controller.getPost(mockPost.id, mockRequest);
      expect(getResult).toEqual(mockPost);

      // Update post
      const updateDto: UpdatePostDto = {
        title: 'Updated Title',
        content: 'Updated content',
      };
      const updatedPost = { ...mockPost, ...updateDto };
      postService.getPost.mockResolvedValue(mockPost);
      postService.updatePost.mockResolvedValue(updatedPost);

      const updateResult = await controller.updatePost(
        mockPost.id,
        updateDto,
        mockRequest,
      );
      expect(updateResult).toEqual(updatedPost);

      // Delete post
      postService.getPost.mockResolvedValue(mockPost);
      postService.deletePost.mockResolvedValue(mockPost);

      const deleteResult = await controller.deletePost(
        mockPost.id,
        mockRequest,
      );
      expect(deleteResult).toEqual({
        message: 'Post deleted successfully.',
      });
    });

    it('should handle authorization flow correctly', async () => {
      const publicPost = {
        ...mockPost,
        isPublic: true,
        authorId: 'other-user',
      };
      const privatePost = {
        ...mockPost,
        isPublic: false,
        authorId: 'other-user',
      };

      // Can access public post from another user
      postService.getPost.mockResolvedValue(publicPost);
      const publicResult = await controller.getPost(publicPost.id, mockRequest);
      expect(publicResult).toEqual(publicPost);

      // Cannot access private post from another user
      postService.getPost.mockResolvedValue(privatePost);
      await expect(
        controller.getPost(privatePost.id, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
