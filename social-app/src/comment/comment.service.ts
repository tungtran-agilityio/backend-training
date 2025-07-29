import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CommentData,
  GetCommentsResponse,
  GetCommentsParams,
} from './interfaces/comment-response.interfaces';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async createComment(
    comment: Prisma.CommentCreateInput,
  ): Promise<CommentData> {
    return this.prisma.comment.create({
      data: comment,
    });
  }

  async getComment(
    commentWhereUniqueInput: Prisma.CommentWhereUniqueInput,
  ): Promise<CommentData | null> {
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
  }: GetCommentsParams): Promise<GetCommentsResponse> {
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
  ): Promise<CommentData> {
    return this.prisma.comment.update({
      where: commentWhereUniqueInput,
      data: comment,
    });
  }

  async deleteComment(
    commentWhereUniqueInput: Prisma.CommentWhereUniqueInput,
  ): Promise<CommentData> {
    return this.prisma.comment.update({
      where: commentWhereUniqueInput,
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
