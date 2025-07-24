import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { GetCommentsQuery } from './dtos/get-comments-query.dto';

describe('CommentController', () => {
  let controller: CommentController;
  let commentService: any;
  let prismaService: any;

  const mockPost = {
    id: 'post-123',
    authorId: 'user-456',
    title: 'Test Post',
    content: 'Test content',
    isPublic: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    deletedAt: null,
  };

  const mockDeletedPost = {
    ...mockPost,
    deletedAt: new Date('2023-06-01'),
  };

  const mockComment = {
    id: 'comment-123',
    postId: 'post-123',
    authorId: 'user-789',
    content: 'This is a test comment',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
    deletedAt: null,
  };

  const mockDeletedComment = {
    ...mockComment,
    deletedAt: new Date('2023-06-01'),
  };

  const mockComments = [
    mockComment,
    {
      id: 'comment-456',
      postId: 'post-123',
      authorId: 'user-999',
      content: 'Another comment',
      createdAt: new Date('2023-01-01T11:00:00Z'),
      updatedAt: new Date('2023-01-01T11:00:00Z'),
      deletedAt: null,
    },
  ];

  const mockPaginatedComments = {
    data: mockComments,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 2,
      limit: 10,
    },
  };

  const mockUser = { userId: 'user-789' };
  const mockRequest = { user: mockUser } as unknown as Request;

  const mockCommentService = {
    createComment: jest.fn(),
    getComments: jest.fn(),
    getComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  };

  const mockPrismaService = {
    post: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: mockCommentService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<CommentController>(CommentController);
    commentService = module.get(CommentService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    const postId = 'post-123';
    const createCommentDto: CreateCommentDto = {
      content: 'This is a new comment',
    };

    it('should successfully create a comment', async () => {
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      commentService.createComment.mockResolvedValue(mockComment);

      const result = await controller.createComment(
        postId,
        createCommentDto,
        mockRequest,
      );

      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(commentService.createComment).toHaveBeenCalledWith({
        post: { connect: { id: postId } },
        author: { connect: { id: mockUser.userId } },
        content: createCommentDto.content,
      });
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException when post is not found', async () => {
      prismaService.post.findUnique.mockResolvedValue(null);

      await expect(
        controller.createComment(postId, createCommentDto, mockRequest),
      ).rejects.toThrow(new NotFoundException('Post not found'));

      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(commentService.createComment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when post is deleted', async () => {
      prismaService.post.findUnique.mockResolvedValue(mockDeletedPost);

      await expect(
        controller.createComment(postId, createCommentDto, mockRequest),
      ).rejects.toThrow(new NotFoundException('Post not found'));

      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(commentService.createComment).not.toHaveBeenCalled();
    });

    it('should handle database errors during post validation', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.post.findUnique.mockRejectedValue(dbError);

      await expect(
        controller.createComment(postId, createCommentDto, mockRequest),
      ).rejects.toThrow('Database connection failed');

      expect(commentService.createComment).not.toHaveBeenCalled();
    });

    it('should handle comment service errors', async () => {
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      const serviceError = new Error('Comment creation failed');
      commentService.createComment.mockRejectedValue(serviceError);

      await expect(
        controller.createComment(postId, createCommentDto, mockRequest),
      ).rejects.toThrow('Comment creation failed');
    });

    it('should handle empty content', async () => {
      const emptyContentDto: CreateCommentDto = { content: '' };
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      const emptyComment = { ...mockComment, content: '' };
      commentService.createComment.mockResolvedValue(emptyComment);

      const result = await controller.createComment(
        postId,
        emptyContentDto,
        mockRequest,
      );

      expect(result.content).toBe('');
      expect(commentService.createComment).toHaveBeenCalledWith({
        post: { connect: { id: postId } },
        author: { connect: { id: mockUser.userId } },
        content: '',
      });
    });
  });

  describe('getComments', () => {
    const postId = 'post-123';

    it('should successfully get comments with default query', async () => {
      const query = {} as GetCommentsQuery;
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      commentService.getComments.mockResolvedValue(mockPaginatedComments);

      const result = await controller.getComments(postId, query);

      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(commentService.getComments).toHaveBeenCalledWith({
        postId,
      });
      expect(result).toEqual(mockPaginatedComments);
    });

    it('should successfully get comments with custom query parameters', async () => {
      const query: GetCommentsQuery = {
        page: 2,
        limit: 5,
        authorId: 'user-789',
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      };
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      commentService.getComments.mockResolvedValue(mockPaginatedComments);

      const result = await controller.getComments(postId, query);

      expect(commentService.getComments).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        authorId: 'user-789',
        sortBy: 'updatedAt',
        sortOrder: 'asc',
        postId,
      });
      expect(result).toEqual(mockPaginatedComments);
    });

    it('should throw NotFoundException when post is not found', async () => {
      const query = {} as GetCommentsQuery;
      prismaService.post.findUnique.mockResolvedValue(null);

      await expect(controller.getComments(postId, query)).rejects.toThrow(
        new NotFoundException('Post not found or inaccessible'),
      );

      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(commentService.getComments).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when post is deleted', async () => {
      const query = {} as GetCommentsQuery;
      prismaService.post.findUnique.mockResolvedValue(mockDeletedPost);

      await expect(controller.getComments(postId, query)).rejects.toThrow(
        new NotFoundException('Post not found or inaccessible'),
      );

      expect(commentService.getComments).not.toHaveBeenCalled();
    });

    it('should handle database errors during post validation', async () => {
      const query = {} as GetCommentsQuery;
      const dbError = new Error('Database query failed');
      prismaService.post.findUnique.mockRejectedValue(dbError);

      await expect(controller.getComments(postId, query)).rejects.toThrow(
        'Database query failed',
      );

      expect(commentService.getComments).not.toHaveBeenCalled();
    });

    it('should handle comment service errors', async () => {
      const query = {} as GetCommentsQuery;
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      const serviceError = new Error('Failed to fetch comments');
      commentService.getComments.mockRejectedValue(serviceError);

      await expect(controller.getComments(postId, query)).rejects.toThrow(
        'Failed to fetch comments',
      );
    });
  });

  describe('getComment', () => {
    const commentId = 'comment-123';

    it('should successfully get a comment', async () => {
      commentService.getComment.mockResolvedValue(mockComment);

      const result = await controller.getComment(commentId);

      expect(commentService.getComment).toHaveBeenCalledWith({
        id: commentId,
      });
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException when comment is not found', async () => {
      commentService.getComment.mockResolvedValue(null);

      await expect(controller.getComment(commentId)).rejects.toThrow(
        new NotFoundException('Comment not found or inaccessible'),
      );

      expect(commentService.getComment).toHaveBeenCalledWith({
        id: commentId,
      });
    });

    it('should handle comment service errors', async () => {
      const serviceError = new Error('Database query failed');
      commentService.getComment.mockRejectedValue(serviceError);

      await expect(controller.getComment(commentId)).rejects.toThrow(
        'Database query failed',
      );
    });

    it('should handle undefined return from service', async () => {
      commentService.getComment.mockResolvedValue(undefined);

      await expect(controller.getComment(commentId)).rejects.toThrow(
        new NotFoundException('Comment not found or inaccessible'),
      );
    });
  });

  describe('updateComment', () => {
    const commentId = 'comment-123';
    const updateCommentDto: UpdateCommentDto = {
      content: 'Updated comment content',
    };

    it('should successfully update a comment', async () => {
      const updatedComment = {
        ...mockComment,
        content: updateCommentDto.content,
        updatedAt: new Date('2023-01-02'),
      };
      commentService.getComment.mockResolvedValue(mockComment);
      commentService.updateComment.mockResolvedValue(updatedComment);

      const result = await controller.updateComment(
        commentId,
        updateCommentDto,
        mockRequest,
      );

      expect(commentService.getComment).toHaveBeenCalledWith({
        id: commentId,
      });
      expect(commentService.updateComment).toHaveBeenCalledWith(
        { id: commentId },
        { content: updateCommentDto.content },
      );
      expect(result).toEqual(updatedComment);
    });

    it('should throw NotFoundException when comment is not found', async () => {
      commentService.getComment.mockResolvedValue(null);

      await expect(
        controller.updateComment(commentId, updateCommentDto, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Comment not found or not owned by user'),
      );

      expect(commentService.getComment).toHaveBeenCalledWith({
        id: commentId,
      });
      expect(commentService.updateComment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when comment is not owned by user', async () => {
      const notOwnedComment = { ...mockComment, authorId: 'different-user' };
      commentService.getComment.mockResolvedValue(notOwnedComment);

      await expect(
        controller.updateComment(commentId, updateCommentDto, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Comment not found or not owned by user'),
      );

      expect(commentService.getComment).toHaveBeenCalledWith({
        id: commentId,
      });
      expect(commentService.updateComment).not.toHaveBeenCalled();
    });

    it('should handle comment service errors during get', async () => {
      const serviceError = new Error('Database query failed');
      commentService.getComment.mockRejectedValue(serviceError);

      await expect(
        controller.updateComment(commentId, updateCommentDto, mockRequest),
      ).rejects.toThrow('Database query failed');

      expect(commentService.updateComment).not.toHaveBeenCalled();
    });

    it('should handle comment service errors during update', async () => {
      commentService.getComment.mockResolvedValue(mockComment);
      const serviceError = new Error('Update failed');
      commentService.updateComment.mockRejectedValue(serviceError);

      await expect(
        controller.updateComment(commentId, updateCommentDto, mockRequest),
      ).rejects.toThrow('Update failed');
    });

    it('should handle empty content update', async () => {
      const emptyUpdateDto: UpdateCommentDto = { content: '' };
      const updatedComment = { ...mockComment, content: '' };
      commentService.getComment.mockResolvedValue(mockComment);
      commentService.updateComment.mockResolvedValue(updatedComment);

      const result = await controller.updateComment(
        commentId,
        emptyUpdateDto,
        mockRequest,
      );

      expect(result.content).toBe('');
      expect(commentService.updateComment).toHaveBeenCalledWith(
        { id: commentId },
        { content: '' },
      );
    });
  });

  describe('deleteComment', () => {
    const commentId = 'comment-123';

    it('should successfully delete a comment', async () => {
      commentService.getComment.mockResolvedValue(mockComment);
      commentService.deleteComment.mockResolvedValue(mockDeletedComment);

      const result = await controller.deleteComment(commentId, mockRequest);

      expect(commentService.getComment).toHaveBeenCalledWith({
        id: commentId,
      });
      expect(commentService.deleteComment).toHaveBeenCalledWith({
        id: commentId,
      });
      expect(result).toEqual({
        message: 'Comment deleted successfully',
      });
    });

    it('should throw NotFoundException when comment is not found', async () => {
      commentService.getComment.mockResolvedValue(null);

      await expect(
        controller.deleteComment(commentId, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Comment not found or not owned by user'),
      );

      expect(commentService.getComment).toHaveBeenCalledWith({
        id: commentId,
      });
      expect(commentService.deleteComment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when comment is not owned by user', async () => {
      const notOwnedComment = { ...mockComment, authorId: 'different-user' };
      commentService.getComment.mockResolvedValue(notOwnedComment);

      await expect(
        controller.deleteComment(commentId, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Comment not found or not owned by user'),
      );

      expect(commentService.deleteComment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when comment is already deleted', async () => {
      commentService.getComment.mockResolvedValue(mockDeletedComment);

      await expect(
        controller.deleteComment(commentId, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Comment not found or not owned by user'),
      );

      expect(commentService.deleteComment).not.toHaveBeenCalled();
    });

    it('should handle comment service errors during get', async () => {
      const serviceError = new Error('Database query failed');
      commentService.getComment.mockRejectedValue(serviceError);

      await expect(
        controller.deleteComment(commentId, mockRequest),
      ).rejects.toThrow('Database query failed');

      expect(commentService.deleteComment).not.toHaveBeenCalled();
    });

    it('should handle comment service errors during delete', async () => {
      commentService.getComment.mockResolvedValue(mockComment);
      const serviceError = new Error('Delete failed');
      commentService.deleteComment.mockRejectedValue(serviceError);

      await expect(
        controller.deleteComment(commentId, mockRequest),
      ).rejects.toThrow('Delete failed');
    });

    it('should handle complex ownership validation scenario', async () => {
      // Test case where comment exists but all validation conditions fail
      const complexComment = {
        ...mockComment,
        authorId: 'different-user',
        deletedAt: new Date(),
      };
      commentService.getComment.mockResolvedValue(complexComment);

      await expect(
        controller.deleteComment(commentId, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('Comment not found or not owned by user'),
      );

      expect(commentService.deleteComment).not.toHaveBeenCalled();
    });
  });

  describe('controller initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have commentService dependency injected', () => {
      expect(commentService).toBeDefined();
    });

    it('should have prismaService dependency injected', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete comment lifecycle', async () => {
      const postId = 'post-123';
      const createDto: CreateCommentDto = { content: 'New comment' };
      const updateDto: UpdateCommentDto = { content: 'Updated comment' };

      // Create comment
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      commentService.createComment.mockResolvedValue(mockComment);

      const created = await controller.createComment(
        postId,
        createDto,
        mockRequest,
      );
      expect(created).toEqual(mockComment);

      // Get comment
      commentService.getComment.mockResolvedValue(mockComment);

      const retrieved = await controller.getComment(mockComment.id);
      expect(retrieved).toEqual(mockComment);

      // Update comment
      const updatedComment = { ...mockComment, content: updateDto.content };
      commentService.updateComment.mockResolvedValue(updatedComment);

      const updated = await controller.updateComment(
        mockComment.id,
        updateDto,
        mockRequest,
      );
      expect(updated.content).toBe(updateDto.content);

      // Delete comment
      commentService.deleteComment.mockResolvedValue(mockDeletedComment);

      const deleted = await controller.deleteComment(
        mockComment.id,
        mockRequest,
      );
      expect(deleted.message).toBe('Comment deleted successfully');
    });

    it('should handle pagination and filtering in getComments', async () => {
      const postId = 'post-123';
      const query: GetCommentsQuery = {
        page: 2,
        limit: 5,
        authorId: 'user-789',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      prismaService.post.findUnique.mockResolvedValue(mockPost);
      const paginatedResult = {
        data: [mockComment],
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalItems: 15,
          limit: 5,
        },
      };
      commentService.getComments.mockResolvedValue(paginatedResult);

      const result = await controller.getComments(postId, query);

      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.limit).toBe(5);
      expect(commentService.getComments).toHaveBeenCalledWith({
        ...query,
        postId,
      });
    });
  });
});
