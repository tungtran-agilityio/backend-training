import { PostDto } from './post.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';

export class PostResponseDto extends PickType(PostDto, [
  'id',
  'authorId',
  'title',
  'content',
  'isPublic',
  'createdAt',
  'updatedAt',
] as const) {
  @ApiProperty({ example: 'b3b7c7e2-8c2e-4e2a-9b2e-2e2a9b2e2a9b' })
  id: string;

  @ApiProperty({ example: 'b3b7c7e2-8c2e-4e2a-9b2e-2e2a9b2e2a9b' })
  authorId: string;

  @ApiProperty({ example: 'Post Title' })
  title: string;

  @ApiProperty({ example: 'This is the content of the post.' })
  content: string;

  @ApiProperty({ example: false })
  isPublic: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-07-23T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-07-23T10:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-07-23T10:00:00.000Z',
  })
  deletedAt: Date | null;
}
