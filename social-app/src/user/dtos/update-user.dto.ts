import { UserDto } from 'src/user/dtos/user.dto';
import { PartialType, PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(
  PickType(UserDto, ['firstName', 'lastName', 'email'] as const),
) {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;
}
