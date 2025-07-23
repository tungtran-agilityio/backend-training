import {
  IsEmail,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsDate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: 'b3b7c7e2-8c2e-4e2a-9b2e-2e2a9b2e2a9b' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  lastName: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

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

  @ApiProperty({
    type: String,
    format: 'date-time',
    required: false,
    nullable: true,
    example: null,
  })
  @IsDate()
  deletedAt: Date | null;
}
