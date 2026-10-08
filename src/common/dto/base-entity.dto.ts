import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Min,
} from 'class-validator';

export class BaseEntityDto {
	@ApiProperty({ example: 'Product launch' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ example: 'Coordinate the launch tasks.' })
	@IsOptional()
	@IsString()
	description?: string | null;

	@ApiPropertyOptional({ example: 1, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	statusId?: number | null;
}