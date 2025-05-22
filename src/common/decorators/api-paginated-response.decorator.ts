import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

interface ApiPaginatedResponseOptions {
    description?: string;
    type?: Type<any>;
}

export const ApiPaginatedResponse = (options: ApiPaginatedResponseOptions = {}) => {
    return applyDecorators(
        ApiExtraModels(PaginatedResponseDto),
        ApiOkResponse({
            description: options.description || 'Paginated result',
            schema: {
                allOf: [
                    { $ref: getSchemaPath(PaginatedResponseDto) },
                    {
                        properties: {
                            data: {
                                type: 'array',
                                items: options.type ? { $ref: getSchemaPath(options.type) } : { type: 'object' },
                            },
                        },
                    },
                ],
            },
        }),
    );
}; 