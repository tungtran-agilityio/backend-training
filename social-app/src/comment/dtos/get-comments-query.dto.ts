import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, IsIn, Min, Max } from 'class-validator';

export class GetCommentsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt'])
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
