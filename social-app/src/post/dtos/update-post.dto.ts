import { ApiProperty, PickType } from '@nestjs/swagger';
import { PostDto } from 'src/post/dtos/post.dto';

export class UpdatePostDto extends PickType(PostDto, [
  'title',
  'content',
] as const) {
  @ApiProperty({ example: 'This is the updated title of the post.' })
  title: string;

  @ApiProperty({ example: 'This is the updated content of the post.' })
  content: string;
}
