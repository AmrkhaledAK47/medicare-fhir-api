import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
    @ApiProperty({
        description: 'Total number of items',
        example: 100,
    })
    totalItems: number;

    @ApiProperty({
        description: 'Number of items per page',
        example: 10,
    })
    itemsPerPage: number;

    @ApiProperty({
        description: 'Current page number',
        example: 1,
    })
    currentPage: number;

    @ApiProperty({
        description: 'Total number of pages',
        example: 10,
    })
    totalPages: number;

    @ApiProperty({
        description: 'URL to the next page (null if there is no next page)',
        example: '/api/fhir/Patient?page=2&limit=10',
        nullable: true,
    })
    nextPage?: string;

    @ApiProperty({
        description: 'URL to the previous page (null if there is no previous page)',
        example: null,
        nullable: true,
    })
    prevPage?: string;
}

export class PaginatedResponseDto<T> {
    @ApiProperty({
        description: 'List of items',
        isArray: true,
    })
    data: T[];

    @ApiProperty({
        description: 'Pagination metadata',
        type: PaginationMetaDto,
    })
    meta: PaginationMetaDto;

    constructor(data: T[], meta: PaginationMetaDto) {
        this.data = data;
        this.meta = meta;
    }

    /**
     * Create a paginated response from data, count, page, and limit
     */
    static create<T>(
        data: T[],
        totalItems: number,
        page: number,
        limit: number,
        baseUrl?: string,
    ): PaginatedResponseDto<T> {
        const totalPages = Math.ceil(totalItems / limit);
        const meta: PaginationMetaDto = {
            totalItems,
            itemsPerPage: limit,
            currentPage: page,
            totalPages,
            nextPage: page < totalPages && baseUrl ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null,
            prevPage: page > 1 && baseUrl ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null,
        };

        return new PaginatedResponseDto(data, meta);
    }
} 