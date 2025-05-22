import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    @ApiProperty({
        description: 'Page number (0-based)',
        default: 0,
        required: false,
        minimum: 0
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    page?: number = 0;

    @ApiProperty({
        description: 'Number of items per page',
        default: 10,
        required: false,
        minimum: 1,
        maximum: 50
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(50)
    size?: number = 10;

    get skip(): number {
        return this.page * this.size;
    }

    get limit(): number {
        return this.size;
    }

    // Helper functions for FHIR pagination
    toFhirParams(): Record<string, string> {
        return {
            '_count': this.size.toString(),
            '_getpagesoffset': this.skip.toString()
        };
    }

    // Generic pagination response format
    static toResponse<T>(
        items: T[],
        total: number,
        pagination: PaginationDto
    ): PaginatedResponse<T> {
        const { page, size } = pagination;
        const totalPages = Math.ceil(total / size);

        return {
            data: items,
            meta: {
                total,
                page,
                size,
                totalPages,
                hasNextPage: page < totalPages - 1,
                hasPreviousPage: page > 0
            }
        };
    }
}

// Response interface for paginated data
export interface PaginationMetaData {
    total: number;
    page: number;
    size: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMetaData;
} 