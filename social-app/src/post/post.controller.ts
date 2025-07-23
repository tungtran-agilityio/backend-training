import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  Query,
  ValidationPipe,
  Patch,
  HttpCode,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostService } from './post.service';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { PostDto } from 'src/post/dtos/post.dto';
import { GetPostsQuery } from './dtos/get-posts-query.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { UpdatePostVisibilityDto } from './dtos/update-post-visibility.dto';

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new post' })
  @Post()
  @ApiCreatedResponse({ type: PostDto })
  @HttpCode(201)
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request,
  ): Promise<PostDto> {
    const user = req.user as { userId: string };
    return this.postService.createPost({
      ...createPostDto,
      author: {
        connect: {
          id: user.userId,
        },
      },
    });
  }

  @Get(':id')
  @ApiOkResponse({ type: PostDto })
  @UseGuards(JwtAuthGuard)
  async getPost(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const post = await this.postService.getPost({ id });

    const user = req.user as { userId: string };

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // if post is not public, check if user is the author
    if (!post.isPublic && post.authorId !== user.userId) {
      throw new ForbiddenException('You are not allowed to access this post');
    }

    return post;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            authorId: 'uuid',
            title: 'Example Post',
            content: 'This is the content of the post.',
            isPublic: true,
            createdAt: '2025-02-05T12:00:00Z',
            updatedAt: '2025-02-05T12:30:00Z',
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalItems: 45,
          limit: 10,
        },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'authorId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    example: 'desc',
  })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  async getPosts(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetPostsQuery,
    @Req() req: Request,
  ) {
    const user = req.user as { userId: string };

    return this.postService.getPosts({
      ...query,
      userId: user.userId,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: PostDto })
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: Request,
  ) {
    const user = req.user as { userId: string };
    const post = await this.postService.getPost({ id });

    if (!post || post.authorId !== user.userId) {
      throw new NotFoundException('Post not found or not owned by user');
    }

    return this.postService.updatePost({ id }, updatePostDto);
  }

  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Update visibility of a post to public or private.',
    schema: {
      example: {
        id: 'uuid',
        isPublic: true,
        updatedAt: '2025-02-05T12:30:00Z',
      },
    },
  })
  async updatePostVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePostVisibilityDto,
    @Req() req: Request,
  ) {
    const user = req.user as { userId: string };
    const post = await this.postService.getPost({ id });
    if (!post || post.authorId !== user.userId) {
      throw new NotFoundException('Post not found or not owned by user');
    }
    const updated = await this.postService.updatePost(
      { id },
      { isPublic: body.isPublic },
    );
    return {
      id: updated.id,
      isPublic: updated.isPublic,
      updatedAt: updated.updatedAt,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Post deleted successfully.',
      },
    },
  })
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const post = await this.postService.getPost({ id });

    const user = req.user as { userId: string };

    if (!post || post.authorId !== user.userId) {
      throw new NotFoundException('Post not found or not owned by user');
    }

    await this.postService.deletePost({ id });

    return {
      message: 'Post deleted successfully.',
    };
  }
}
