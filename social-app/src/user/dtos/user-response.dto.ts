import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class UserResponseDto extends PickType(UserDto, [
  'id',
  'email',
  'firstName',
  'lastName',
  'createdAt',
  'updatedAt',
] as const) {
  @ApiProperty({ example: 'b3b7c7e2-8c2e-4e2a-9b2e-2e2a9b2e2a9b' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

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
}
