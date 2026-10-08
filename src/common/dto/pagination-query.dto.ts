import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    type: String,
    example: '1',
    default: '1',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: String,
    example: '10',
    default: '10',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({ example: 'launch' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  search?: string;
}
