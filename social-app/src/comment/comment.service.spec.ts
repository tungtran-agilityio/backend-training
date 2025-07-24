import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Comment } from 'generated/prisma';

describe('CommentService', () => {
  let service: CommentService;
  let prismaService: any;

  const mockComment: Comment = {
    id: 'comment-123',
    postId: 'post-456',
    authorId: 'user-789',
    content: 'This is a test comment',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
    deletedAt: null,
  };

  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      postId: 'post-456',
      authorId: 'user-789',
      content: 'First comment',
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z'),
      deletedAt: null,
    },
    {
      id: 'comment-2',
      postId: 'post-456',
      authorId: 'user-123',
      content: 'Second comment with search term',
      createdAt: new Date('2023-01-01T11:00:00Z'),
      updatedAt: new Date('2023-01-01T11:00:00Z'),
      deletedAt: null,
    },
  ];

  const mockPrismaService = {
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    const createInput: Prisma.CommentCreateInput = {
      content: 'This is a new comment',
      post: { connect: { id: 'post-456' } },
      author: { connect: { id: 'user-789' } },
    };

    it('should successfully create a comment', async () => {
      prismaService.comment.create.mockResolvedValue(mockComment);

      const result = await service.createComment(createInput);

      expect(prismaService.comment.create).toHaveBeenCalledWith({
        data: createInput,
      });
      expect(result).toEqual(mockComment);
    });

    it('should handle database errors during creation', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.comment.create.mockRejectedValue(dbError);

      await expect(service.createComment(createInput)).rejects.toThrow(
        'Database connection failed',
      );

      expect(prismaService.comment.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should handle foreign key constraint errors', async () => {
      const constraintError = new Error('Foreign key constraint failed');
      prismaService.comment.create.mockRejectedValue(constraintError);

      await expect(service.createComment(createInput)).rejects.toThrow(
        'Foreign key constraint failed',
      );
    });

    it('should handle empty content', async () => {
      const emptyContentInput: Prisma.CommentCreateInput = {
        content: '',
        post: { connect: { id: 'post-456' } },
        author: { connect: { id: 'user-789' } },
      };

      const commentWithEmptyContent = { ...mockComment, content: '' };
      prismaService.comment.create.mockResolvedValue(commentWithEmptyContent);

      const result = await service.createComment(emptyContentInput);

      expect(result.content).toBe('');
      expect(prismaService.comment.create).toHaveBeenCalledWith({
        data: emptyContentInput,
      });
    });
  });

  describe('getComment', () => {
    const commentWhereInput: Prisma.CommentWhereUniqueInput = {
      id: 'comment-123',
    };

    it('should successfully retrieve a comment', async () => {
      prismaService.comment.findUnique.mockResolvedValue(mockComment);

      const result = await service.getComment(commentWhereInput);

      expect(prismaService.comment.findUnique).toHaveBeenCalledWith({
        where: commentWhereInput,
      });
      expect(result).toEqual(mockComment);
    });

    it('should return null when comment is not found', async () => {
      prismaService.comment.findUnique.mockResolvedValue(null);

      const result = await service.getComment(commentWhereInput);

      expect(prismaService.comment.findUnique).toHaveBeenCalledWith({
        where: commentWhereInput,
      });
      expect(result).toBeNull();
    });

    it('should handle database errors during retrieval', async () => {
      const dbError = new Error('Database query failed');
      prismaService.comment.findUnique.mockRejectedValue(dbError);

      await expect(service.getComment(commentWhereInput)).rejects.toThrow(
        'Database query failed',
      );
    });

    it('should handle invalid UUID format', async () => {
      const invalidInput = { id: 'invalid-uuid' };
      const validationError = new Error('Invalid UUID format');
      prismaService.comment.findUnique.mockRejectedValue(validationError);

      await expect(service.getComment(invalidInput)).rejects.toThrow(
        'Invalid UUID format',
      );
    });
  });

  describe('getComments', () => {
    const defaultPaginationResult = {
      data: mockComments,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        limit: 10,
      },
    };

    beforeEach(() => {
      prismaService.comment.findMany.mockResolvedValue(mockComments);
      prismaService.comment.count.mockResolvedValue(2);
    });

    it('should get comments with default parameters', async () => {
      const result = await service.getComments({});

      expect(prismaService.comment.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(prismaService.comment.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(result).toEqual(defaultPaginationResult);
    });

    it('should filter comments by postId', async () => {
      const postId = 'post-456';
      await service.getComments({ postId });

      expect(prismaService.comment.findMany).toHaveBeenCalledWith({
        where: { postId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(prismaService.comment.count).toHaveBeenCalledWith({
        where: { postId },
      });
    });

    it('should filter comments by authorId', async () => {
      const authorId = 'user-789';
      await service.getComments({ authorId });

      expect(prismaService.comment.findMany).toHaveBeenCalledWith({
        where: { authorId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(prismaService.comment.count).toHaveBeenCalledWith({
        where: { authorId },
      });
    });

    it('should filter comments by search term', async () => {
      const search = 'test search';
      await service.getComments({ search });

      expect(prismaService.comment.findMany).toHaveBeenCalledWith({
        where: { content: { contains: search } },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle pagination correctly', async () => {
      const page = 2;
      const limit = 5;
      await service.getComments({ page, limit });

      expect(prismaService.comment.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 5, // (page - 1) * limit = (2 - 1) * 5
        take: 5,
      });

      const result = await service.getComments({ page, limit });
      expect(result.pagination).toEqual({
        currentPage: 2,
        totalPages: 1, // Math.ceil(2 / 5)
        totalItems: 2,
        limit: 5,
      });
    });

    it('should handle custom sorting', async () => {
      await service.getComments({
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      });

      expect(prismaService.comment.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { updatedAt: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('should combine multiple filters', async () => {
      await service.getComments({
        postId: 'post-456',
        authorId: 'user-789',
        search: 'test',
        page: 2,
        limit: 3,
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      });

      expect(prismaService.comment.findMany).toHaveBeenCalledWith({
        where: {
          postId: 'post-456',
          authorId: 'user-789',
          content: { contains: 'test' },
        },
        orderBy: { updatedAt: 'asc' },
        skip: 3, // (2 - 1) * 3
        take: 3,
      });
    });

    it('should handle zero results', async () => {
      prismaService.comment.findMany.mockResolvedValue([]);
      prismaService.comment.count.mockResolvedValue(0);

      const result = await service.getComments({});

      expect(result).toEqual({
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          limit: 10,
        },
      });
    });

    it('should handle database errors during getComments', async () => {
      prismaService.comment.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getComments({})).rejects.toThrow('Database error');
    });

    it('should handle count operation failure', async () => {
      prismaService.comment.findMany.mockResolvedValue(mockComments);
      prismaService.comment.count.mockRejectedValue(new Error('Count failed'));

      await expect(service.getComments({})).rejects.toThrow('Count failed');
    });

    it('should calculate pagination correctly for large datasets', async () => {
      prismaService.comment.count.mockResolvedValue(95);

      const result = await service.getComments({ page: 1, limit: 10 });

      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 10, // Math.ceil(95 / 10)
        totalItems: 95,
        limit: 10,
      });
    });
  });

  describe('updateComment', () => {
    const commentWhereInput: Prisma.CommentWhereUniqueInput = {
      id: 'comment-123',
    };
    const updateInput: Prisma.CommentUpdateInput = {
      content: 'Updated comment content',
    };

    it('should successfully update a comment', async () => {
      const updatedComment = {
        ...mockComment,
        content: 'Updated comment content',
        updatedAt: new Date('2023-01-02T10:00:00Z'),
      };
      prismaService.comment.update.mockResolvedValue(updatedComment);

      const result = await service.updateComment(
        commentWhereInput,
        updateInput,
      );

      expect(prismaService.comment.update).toHaveBeenCalledWith({
        where: commentWhereInput,
        data: updateInput,
      });
      expect(result).toEqual(updatedComment);
    });

    it('should handle comment not found during update', async () => {
      const notFoundError = new Error('Record to update not found');
      prismaService.comment.update.mockRejectedValue(notFoundError);

      await expect(
        service.updateComment(commentWhereInput, updateInput),
      ).rejects.toThrow('Record to update not found');
    });

    it('should handle database errors during update', async () => {
      const dbError = new Error('Database update failed');
      prismaService.comment.update.mockRejectedValue(dbError);

      await expect(
        service.updateComment(commentWhereInput, updateInput),
      ).rejects.toThrow('Database update failed');
    });

    it('should handle empty content update', async () => {
      const emptyUpdateInput: Prisma.CommentUpdateInput = {
        content: '',
      };
      const updatedComment = { ...mockComment, content: '' };
      prismaService.comment.update.mockResolvedValue(updatedComment);

      const result = await service.updateComment(
        commentWhereInput,
        emptyUpdateInput,
      );

      expect(result.content).toBe('');
      expect(prismaService.comment.update).toHaveBeenCalledWith({
        where: commentWhereInput,
        data: emptyUpdateInput,
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate: Prisma.CommentUpdateInput = {
        content: 'Only content updated',
      };
      const updatedComment = {
        ...mockComment,
        content: 'Only content updated',
      };
      prismaService.comment.update.mockResolvedValue(updatedComment);

      const result = await service.updateComment(
        commentWhereInput,
        partialUpdate,
      );

      expect(result.content).toBe('Only content updated');
      expect(result.id).toBe(mockComment.id);
    });
  });

  describe('deleteComment', () => {
    const commentWhereInput: Prisma.CommentWhereUniqueInput = {
      id: 'comment-123',
    };

    it('should successfully soft delete a comment', async () => {
      const deletedComment = {
        ...mockComment,
        deletedAt: new Date('2023-01-02T10:00:00Z'),
      };
      prismaService.comment.update.mockResolvedValue(deletedComment);

      const result = await service.deleteComment(commentWhereInput);

      expect(prismaService.comment.update).toHaveBeenCalledWith({
        where: commentWhereInput,
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(deletedComment);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    it('should handle comment not found during deletion', async () => {
      const notFoundError = new Error('Record to delete not found');
      prismaService.comment.update.mockRejectedValue(notFoundError);

      await expect(service.deleteComment(commentWhereInput)).rejects.toThrow(
        'Record to delete not found',
      );
    });

    it('should handle database errors during deletion', async () => {
      const dbError = new Error('Database deletion failed');
      prismaService.comment.update.mockRejectedValue(dbError);

      await expect(service.deleteComment(commentWhereInput)).rejects.toThrow(
        'Database deletion failed',
      );
    });

    it('should handle deleting already deleted comment', async () => {
      const alreadyDeletedComment = {
        ...mockComment,
        deletedAt: new Date('2023-01-01T10:00:00Z'),
      };
      const newDeletedComment = {
        ...alreadyDeletedComment,
        deletedAt: new Date('2023-01-02T10:00:00Z'),
      };
      prismaService.comment.update.mockResolvedValue(newDeletedComment);

      const result = await service.deleteComment(commentWhereInput);

      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(prismaService.comment.update).toHaveBeenCalledWith({
        where: commentWhereInput,
        data: {
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should handle invalid comment ID during deletion', async () => {
      const invalidWhereInput = { id: 'invalid-uuid' };
      const validationError = new Error('Invalid UUID format');
      prismaService.comment.update.mockRejectedValue(validationError);

      await expect(service.deleteComment(invalidWhereInput)).rejects.toThrow(
        'Invalid UUID format',
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
      const createInput: Prisma.CommentCreateInput = {
        content: 'Test comment',
        post: { connect: { id: 'post-456' } },
        author: { connect: { id: 'user-789' } },
      };
      prismaService.comment.create.mockResolvedValue(mockComment);

      const created = await service.createComment(createInput);
      expect(created).toEqual(mockComment);

      // Read
      prismaService.comment.findUnique.mockResolvedValue(mockComment);

      const retrieved = await service.getComment({ id: mockComment.id });
      expect(retrieved).toEqual(mockComment);

      // Update
      const updateInput: Prisma.CommentUpdateInput = {
        content: 'Updated content',
      };
      const updatedComment = { ...mockComment, content: 'Updated content' };
      prismaService.comment.update.mockResolvedValue(updatedComment);

      const updated = await service.updateComment(
        { id: mockComment.id },
        updateInput,
      );
      expect(updated.content).toBe('Updated content');

      // Delete
      const deletedComment = { ...mockComment, deletedAt: new Date() };
      prismaService.comment.update.mockResolvedValue(deletedComment);

      const deleted = await service.deleteComment({ id: mockComment.id });
      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it('should handle concurrent operations correctly', async () => {
      // Multiple reads
      prismaService.comment.findUnique.mockResolvedValue(mockComment);

      const promises = Array(5)
        .fill(null)
        .map(() => service.getComment({ id: 'comment-123' }));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toEqual(mockComment);
      });
      expect(prismaService.comment.findUnique).toHaveBeenCalledTimes(5);
    });
  });
});
