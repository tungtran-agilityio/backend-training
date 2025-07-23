import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async createComment(comment: Prisma.CommentCreateInput) {
    return this.prisma.comment.create({
      data: comment,
    });
  }

  async getComment(commentWhereUniqueInput: Prisma.CommentWhereUniqueInput) {
    return this.prisma.comment.findUnique({
      where: commentWhereUniqueInput,
    });
  }

  async getComments({
    page = 1,
    limit = 10,
    postId,
    authorId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }: {
    page?: number;
    limit?: number;
    postId?: string;
    authorId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: Prisma.CommentWhereInput = {};
    if (postId) where.postId = postId;
    if (authorId) where.authorId = authorId;
    if (search) {
      where.content = { contains: search };
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        limit,
      },
    };
  }

  async updateComment(
    commentWhereUniqueInput: Prisma.CommentWhereUniqueInput,
    comment: Prisma.CommentUpdateInput,
  ) {
    return this.prisma.comment.update({
      where: commentWhereUniqueInput,
      data: comment,
    });
  }

  async deleteComment(commentWhereUniqueInput: Prisma.CommentWhereUniqueInput) {
    return this.prisma.comment.update({
      where: commentWhereUniqueInput,
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
