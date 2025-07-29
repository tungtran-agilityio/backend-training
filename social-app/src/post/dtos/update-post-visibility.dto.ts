import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePostVisibilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isPublic: boolean;
}
