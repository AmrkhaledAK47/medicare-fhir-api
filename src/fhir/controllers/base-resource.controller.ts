import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    Query,
    UseGuards,
    Req,
    HttpStatus,
    HttpCode,
    Logger,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Request } from 'express';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

/**
 * Base controller for FHIR resources that implements the standard FHIR RESTful API
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export abstract class BaseResourceController {
    protected readonly logger: Logger;
    protected readonly resourceType!: string;

    constructor(
        protected readonly hapiFhirAdapter: HapiFhirAdapter,
        resourceType: string,
    ) {
        this.logger = new Logger(`${resourceType}Controller`);
        this.resourceType = resourceType;
    }

    /**
     * Get the resource type name for use in decorators
     */
    protected getResourceType(): string {
        return this.resourceType;
    }

    /**
     * Create a new resource
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: `Create a new resource` })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Resource created successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    async create(
        @Body() resource: any,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        this.logger.debug(`Creating ${this.resourceType} resource`);
        // Ensure the resource type is set correctly
        resource.resourceType = this.resourceType;

        try {
            return await this.hapiFhirAdapter.create(this.resourceType, resource);
        } catch (error) {
            this.logger.error(`Error creating ${this.resourceType} resource:`, error);
            throw error;
        }
    }

    /**
     * Get a resource by ID
     */
    @Get(':id')
    @ApiOperation({ summary: `Get a resource by ID` })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Resource retrieved successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resource not found' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    async findOne(
        @Param('id') id: string,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        this.logger.debug(`Getting ${this.resourceType}/${id}`);

        try {
            return await this.hapiFhirAdapter.getById(this.resourceType, id);
        } catch (error) {
            this.logger.error(`Error retrieving ${this.resourceType}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Update a resource
     */
    @Put(':id')
    @ApiOperation({ summary: `Update a resource` })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Resource updated successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resource not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    async update(
        @Param('id') id: string,
        @Body() resource: any,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        this.logger.debug(`Updating ${this.resourceType}/${id}`);

        // Ensure the resource type and ID are set correctly
        resource.resourceType = this.resourceType;
        resource.id = id;

        try {
            return await this.hapiFhirAdapter.update(this.resourceType, id, resource);
        } catch (error) {
            this.logger.error(`Error updating ${this.resourceType}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a resource
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: `Delete a resource` })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Resource deleted successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resource not found' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    async remove(
        @Param('id') id: string,
        @Req() req: Request & { user: any },
    ): Promise<void> {
        this.logger.debug(`Deleting ${this.resourceType}/${id}`);

        try {
            await this.hapiFhirAdapter.delete(this.resourceType, id);
        } catch (error) {
            this.logger.error(`Error deleting ${this.resourceType}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Search for resources
     */
    @Get()
    @ApiOperation({ summary: `Search for resources` })
    @ApiPaginatedResponse({ description: `Resources` })
    @ApiResponse({ status: HttpStatus.OK, description: 'Search results' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    async search(
        @Query() params: any,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        this.logger.debug(`Searching ${this.resourceType} resources with params:`, params);

        try {
            // Convert NestJS query parameters to FHIR search parameters
            const searchParams = this.transformQueryParams(params);
            return await this.hapiFhirAdapter.search(this.resourceType, searchParams);
        } catch (error) {
            this.logger.error(`Error searching ${this.resourceType} resources:`, error);
            throw error;
        }
    }

    /**
     * Get resource history
     */
    @Get(':id/_history')
    @ApiOperation({ summary: `Get resource history` })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'History retrieved successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resource not found' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    async getHistory(
        @Param('id') id: string,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        this.logger.debug(`Getting history for ${this.resourceType}/${id}`);

        try {
            return await this.hapiFhirAdapter.history(this.resourceType, id);
        } catch (error) {
            this.logger.error(`Error retrieving history for ${this.resourceType}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Validate a resource
     */
    @Post('$validate')
    @ApiOperation({ summary: `Validate a resource` })
    @ApiResponse({ status: HttpStatus.OK, description: 'Validation results' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid resource' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    async validate(
        @Body() resource: any,
        @Req() req: Request & { user: any },
    ): Promise<any> {
        this.logger.debug(`Validating ${this.resourceType} resource`);

        // Ensure resource type is set correctly
        resource.resourceType = this.resourceType;

        try {
            return await this.hapiFhirAdapter.validate(this.resourceType, resource);
        } catch (error) {
            this.logger.error(`Error validating ${this.resourceType} resource:`, error);
            throw error;
        }
    }

    /**
     * Transform query parameters for FHIR search
     * This method can be overridden by resource-specific controllers
     */
    protected transformQueryParams(params: any): Record<string, string> {
        // Create a new object for FHIR search parameters
        const searchParams: Record<string, string> = {};

        // Handle pagination parameters according to FHIR standard
        if (params._count) {
            // Use _count directly if provided
            searchParams._count = params._count.toString();
        } else if (params.limit) {
            // Map NestJS limit to FHIR _count
            searchParams._count = params.limit.toString();
        }

        // Handle page offset
        if (params.page && params.limit) {
            // Calculate offset based on page and limit
            const page = parseInt(params.page.toString());
            const limit = parseInt(params.limit.toString());
            const offset = (page - 1) * limit;

            // FHIR uses _getpagesoffset for pagination
            searchParams._getpagesoffset = offset.toString();
        }

        // Handle sorting
        if (params._sort) {
            // Use _sort directly if provided
            searchParams._sort = params._sort;
        } else if (params.sort) {
            // Map NestJS sort to FHIR _sort
            let sortParam = params.sort;

            // Add direction if specified
            if (params.sortDirection && params.sortDirection.toLowerCase() === 'desc') {
                sortParam = `-${sortParam}`;
            }

            searchParams._sort = sortParam;
        }

        // Handle _include parameters (include referenced resources)
        if (params._include) {
            if (Array.isArray(params._include)) {
                // If multiple _include parameters are provided, join them with commas
                searchParams._include = params._include.join(',');
            } else {
                searchParams._include = params._include.toString();
            }
        }

        // Handle _revinclude parameters (reverse include - resources that reference this one)
        if (params._revinclude) {
            if (Array.isArray(params._revinclude)) {
                // If multiple _revinclude parameters are provided, join them with commas
                searchParams._revinclude = params._revinclude.join(',');
            } else {
                searchParams._revinclude = params._revinclude.toString();
            }
        }

        // Handle _summary parameter (return only a subset of elements)
        if (params._summary) {
            searchParams._summary = params._summary.toString();
        }

        // Handle _elements parameter (return only specific elements)
        if (params._elements) {
            if (Array.isArray(params._elements)) {
                searchParams._elements = params._elements.join(',');
            } else {
                searchParams._elements = params._elements.toString();
            }
        }

        // Handle _contained and _containedType parameters
        if (params._contained) {
            searchParams._contained = params._contained.toString();
        }

        if (params._containedType) {
            searchParams._containedType = params._containedType.toString();
        }

        // Process all other parameters
        Object.entries(params).forEach(([key, value]) => {
            // Skip parameters we've already handled
            if ([
                'page', 'limit', 'sort', 'sortDirection',
                '_count', '_sort', '_include', '_revinclude',
                '_summary', '_elements', '_contained', '_containedType'
            ].includes(key)) {
                return;
            }

            // Skip NestJS-specific parameters
            if (['search'].includes(key)) {
                return;
            }

            // Handle array parameters
            if (Array.isArray(value)) {
                searchParams[key] = value.join(',');
            } else if (value !== undefined && value !== null) {
                searchParams[key] = value.toString();
            }
        });

        // Log transformed parameters for debugging
        this.logger.debug('Original params:', params);
        this.logger.debug('Transformed FHIR params:', searchParams);

        return searchParams;
    }
}