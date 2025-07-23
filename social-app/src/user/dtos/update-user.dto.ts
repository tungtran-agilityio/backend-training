import { UserDto } from 'src/common/dtos/user.dto';
import { PartialType, PickType } from '@nestjs/mapped-types';

export class UpdateUserDto extends PartialType(
  PickType(UserDto, ['firstName', 'lastName', 'email'] as const),
) {}
