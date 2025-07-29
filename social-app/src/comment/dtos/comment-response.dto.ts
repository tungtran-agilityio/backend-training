import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsDate } from 'class-validator';

export class CommentResponseDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  postId: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  authorId: string;

  @ApiProperty({ example: 'This is a comment.' })
  @IsString()
  content: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-02-05T12:00:00Z',
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-02-05T12:30:00Z',
  })
  @IsDate()
  updatedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-02-05T12:30:00Z',
  })
  @IsDate()
  deletedAt: Date | null;
}
