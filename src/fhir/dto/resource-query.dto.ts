import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for common query parameters used in resource searches
 */
export class ResourceQueryDto {
    @ApiProperty({
        description: 'Page number',
        required: false,
        default: 1,
        type: Number,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({
        description: 'Number of items per page',
        required: false,
        default: 10,
        type: Number,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({
        description: 'Field to sort by',
        required: false,
        example: 'createdAt',
    })
    @IsOptional()
    @IsString()
    sort?: string = 'createdAt';

    @ApiProperty({
        description: 'Sort direction',
        required: false,
        enum: ['asc', 'desc'],
        default: 'desc',
    })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortDirection?: 'asc' | 'desc' = 'desc';

    @ApiProperty({
        description: 'Text search query',
        required: false,
    })
    @IsOptional()
    @IsString()
    search?: string;

    // Additional fields can be dynamically handled in filters
    [key: string]: any;
} 