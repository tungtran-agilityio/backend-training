import { PostDto } from 'src/common/dtos/post.dto';
import { PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto extends PickType(PostDto, [
  'title',
  'content',
  'isPublic',
] as const) {
  @ApiProperty({ example: 'John' })
  title: string;

  @ApiProperty({ example: 'This is the content of the post.' })
  content: string;

  @ApiProperty({ example: false })
  isPublic: boolean;
}
