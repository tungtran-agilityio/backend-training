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
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PostService } from './post.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostDto } from 'src/post/dtos/post.dto';
import { GetPostsQuery } from './dtos/get-posts-query.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { UpdatePostVisibilityDto } from './dtos/update-post-visibility.dto';
import { PostResponseDto } from './dtos/post-response.dto';

// Common decorators
const ApiServerErrorResponse = () =>
  ApiInternalServerErrorResponse({ description: 'Unexpected failure' });

// Common validation pipe
const commonValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
});

interface PostWithAuthor {
  id: string;
  authorId: string;
  title: string;
  content: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new post' })
  @HttpCode(201)
  @ApiCreatedResponse({ type: PostResponseDto })
  @ApiBadRequestResponse({
    description: 'Missing or invalid title/content fields',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiServerErrorResponse()
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request,
  ): Promise<PostDto> {
    const user = this.extractUserFromRequest(req);

    return this.postService.createPost({
      ...createPostDto,
      author: {
        connect: {
          id: user.userId,
        },
      },
    });
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
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiServerErrorResponse()
  async getPosts(
    @Query(commonValidationPipe) query: GetPostsQuery,
    @Req() req: Request,
  ) {
    const user = this.extractUserFromRequest(req);

    return this.postService.getPosts({
      ...query,
      userId: user.userId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: PostResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Post not found or inaccessible' })
  @ApiServerErrorResponse()
  async getPost(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = this.extractUserFromRequest(req);
    const post = await this.validatePostExistsAndAccess(id, user.userId);

    return post;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: PostDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Post not found or not owned by user' })
  @ApiServerErrorResponse()
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: Request,
  ) {
    const user = this.extractUserFromRequest(req);
    await this.validatePostOwnership(id, user.userId);

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
  @ApiBadRequestResponse({ description: 'Invalid visibility flag' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Post not found or not owned by user' })
  @ApiServerErrorResponse()
  async updatePostVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePostVisibilityDto,
    @Req() req: Request,
  ) {
    const user = this.extractUserFromRequest(req);
    await this.validatePostOwnership(id, user.userId);

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
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Post not found or not owned by user' })
  @ApiServerErrorResponse()
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = this.extractUserFromRequest(req);
    await this.validatePostOwnership(id, user.userId);

    await this.postService.deletePost({ id });

    return {
      message: 'Post deleted successfully.',
    };
  }

  private extractUserFromRequest(req: Request): { userId: string } {
    return req.user as { userId: string };
  }

  private async validatePostOwnership(
    postId: string,
    userId: string,
  ): Promise<PostWithAuthor> {
    const post = await this.postService.getPost({ id: postId });

    if (!post || post.authorId !== userId) {
      throw new NotFoundException('Post not found or not owned by user');
    }

    return post;
  }

  private async validatePostExistsAndAccess(
    postId: string,
    userId: string,
  ): Promise<PostWithAuthor> {
    const post = await this.postService.getPost({ id: postId });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // If post is not public, check if user is the author
    if (!post.isPublic && post.authorId !== userId) {
      throw new ForbiddenException('You are not allowed to access this post');
    }

    return post;
  }
}
