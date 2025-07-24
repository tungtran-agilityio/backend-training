import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CommentService } from './comment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { GetCommentsQuery } from './dtos/get-comments-query.dto';
import { CommentResponseDto } from './dtos/comment-response.dto';
import {
  ApiServerErrorResponse,
  ApiUnauthorizedErrorResponse,
} from 'src/common/decorators/api-common.decorators';
import {
  ControllerUtils,
  commonValidationPipe,
} from 'src/common/utils/controller.utils';
import { CommentEntity } from 'src/common/interfaces/controller.interfaces';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('posts/:postId/comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    type: CommentResponseDto,
    description: 'Comment created successfully',
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedErrorResponse()
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiServerErrorResponse()
  @HttpCode(201)
  async createComment(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body(commonValidationPipe) body: CreateCommentDto,
    @Req() req: Request,
  ) {
    await this.validatePostExists(postId);
    const user = ControllerUtils.extractUserFromRequest(req);

    const comment = await this.commentService.createComment({
      post: { connect: { id: postId } },
      author: { connect: { id: user.userId } },
      content: body.content,
    });

    return comment;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            postId: 'uuid',
            authorId: 'uuid',
            content: 'string',
            createdAt: 'timestamp',
            updatedAt: 'timestamp',
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 3,
          totalItems: 25,
          limit: 10,
        },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'authorId', required: false, type: String })
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
  @ApiUnauthorizedErrorResponse()
  @ApiNotFoundResponse({ description: 'Post not found or inaccessible' })
  @ApiServerErrorResponse()
  async getComments(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query(commonValidationPipe) query: GetCommentsQuery,
  ) {
    await this.validatePostExists(postId, 'Post not found or inaccessible');

    return this.commentService.getComments({
      ...query,
      postId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CommentResponseDto })
  @ApiUnauthorizedErrorResponse()
  @ApiNotFoundResponse({ description: 'Comment not found or inaccessible' })
  @ApiServerErrorResponse()
  async getComment(@Param('id', ParseUUIDPipe) id: string) {
    const comment = await this.commentService.getComment({ id });

    if (!comment) {
      throw new NotFoundException('Comment not found or inaccessible');
    }

    return comment;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CommentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input or missing content' })
  @ApiUnauthorizedErrorResponse()
  @ApiNotFoundResponse({
    description: 'Comment not found or not owned by user',
  })
  @ApiServerErrorResponse()
  async updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(commonValidationPipe) body: UpdateCommentDto,
    @Req() req: Request,
  ) {
    const user = ControllerUtils.extractUserFromRequest(req);
    await this.validateCommentOwnership(id, user.userId);

    return this.commentService.updateComment({ id }, { content: body.content });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Comment deleted successfully',
      },
    },
  })
  @ApiUnauthorizedErrorResponse()
  @ApiNotFoundResponse({ description: 'Comment not found or inaccessible' })
  @ApiServerErrorResponse()
  async deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = ControllerUtils.extractUserFromRequest(req);
    const comment = await this.validateCommentOwnership(id, user.userId);

    if (comment.deletedAt !== null) {
      throw new NotFoundException('Comment not found or not owned by user');
    }

    await this.commentService.deleteComment({ id });

    return {
      message: 'Comment deleted successfully',
    };
  }

  private async validatePostExists(
    postId: string,
    errorMessage: string = 'Post not found',
  ): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt !== null) {
      throw new NotFoundException(errorMessage);
    }
  }

  private async validateCommentOwnership(
    commentId: string,
    userId: string,
  ): Promise<CommentEntity> {
    const comment = await this.commentService.getComment({ id: commentId });

    if (!comment || comment.authorId !== userId) {
      throw new NotFoundException('Comment not found or not owned by user');
    }

    return comment;
  }
}
