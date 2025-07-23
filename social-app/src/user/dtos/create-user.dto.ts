import { UserDto } from 'src/common/dtos/user.dto';
import { PickType } from '@nestjs/mapped-types';

export class CreateUserDto extends PickType(UserDto, [
  'email',
  'password',
  'firstName',
  'lastName',
] as const) {}
