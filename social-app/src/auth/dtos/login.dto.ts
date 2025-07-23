import { PickType } from '@nestjs/mapped-types';
import { UserDto } from 'src/common/dtos/user.dto';

export class LoginDto extends PickType(UserDto, [
  'email',
  'password',
] as const) {}
