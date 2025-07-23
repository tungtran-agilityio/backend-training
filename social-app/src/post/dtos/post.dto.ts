import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  MaxLength,
  IsBoolean,
  IsDate,
} from 'class-validator';

export class PostDto {
  @ApiProperty({ example: 'b3b7c7e2-8c2e-4e2a-9b2e-2e2a9b2e2a9b' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'b3b7c7e2-8c2e-4e2a-9b2e-2e2a9b2e2a9b' })
  @IsUUID()
  authorId: string;

  @ApiProperty({ example: 'Post Title' })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'This is the content of the post.' })
  @IsString()
  content: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-07-23T10:00:00.000Z',
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-07-23T10:00:00.000Z',
  })
  @IsDate()
  updatedAt: Date;
}
