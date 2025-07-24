import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  PostData,
  PostSelectData,
  GetPostsResponse,
  GetPostsParams,
} from './interfaces/post-response.interfaces';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async createPost(post: Prisma.PostCreateInput): Promise<PostData> {
    return this.prisma.post.create({
      data: post,
    });
  }

  async getPost(
    postWhereUniqueInput: Prisma.PostWhereUniqueInput,
  ): Promise<PostSelectData | null> {
    return this.prisma.post.findUnique({
      where: postWhereUniqueInput,
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
  }

  async getPosts({
    page = 1,
    limit = 10,
    userId,
    authorId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isPublic,
  }: GetPostsParams): Promise<GetPostsResponse> {
    const where: Prisma.PostWhereInput = {};
    if (authorId) where.authorId = authorId;
    if (typeof isPublic === 'boolean') {
      where.isPublic = isPublic;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    // if isPublic is false, filter posts that are not public and not the user's own posts
    const filterData = data.filter((post) => {
      if (isPublic === false) {
        return post.authorId === userId;
      }
      return true;
    });

    return {
      data: filterData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        limit,
      },
    };
  }

  async updatePost(
    postWhereUniqueInput: Prisma.PostWhereUniqueInput,
    post: Prisma.PostUpdateInput,
  ): Promise<PostData> {
    return this.prisma.post.update({
      where: postWhereUniqueInput,
      data: post,
    });
  }

  async deletePost(
    postWhereUniqueInput: Prisma.PostWhereUniqueInput,
  ): Promise<PostData> {
    return this.prisma.post.update({
      where: postWhereUniqueInput,
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
