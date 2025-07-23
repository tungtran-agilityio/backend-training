import { PickType } from '@nestjs/mapped-types';
import { UserDto } from 'src/user/dtos/user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto extends PickType(UserDto, [
  'email',
  'password',
] as const) {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'password123' })
  password: string;
}
