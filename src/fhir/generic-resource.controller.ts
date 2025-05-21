import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    ForbiddenException,
    HttpStatus,
    HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GenericResourceService } from './services/generic-resource.service';

/**
 * Generic controller for handling FHIR resources
 * This can be used as base class for resource-specific controllers
 */
@ApiTags('FHIR Resources')
@Controller('fhir')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GenericResourceController {
    constructor(private readonly resourceService: GenericResourceService) { }

    @Get(':resourceType')
    @ApiOperation({ summary: 'Get paginated list of resources' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type (e.g. Patient, Practitioner)' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'sort', required: false, description: 'Sort field' })
    @ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({ status: 200, description: 'List of resources with pagination metadata' })
    async findAll(
        @Param('resourceType') resourceType: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('sort') sort?: string,
        @Query('sortDirection') sortDirection?: 'asc' | 'desc',
        @Query() filter?: any,
        @Request() req?: any,
    ) {
        // Clean up filter object by removing pagination params
        const { page: _, limit: __, sort: ___, sortDirection: ____, ...cleanFilter } = filter || {};

        return this.resourceService.findAll(
            resourceType,
            {
                page: page ? +page : 1,
                limit: limit ? +limit : 10,
                sort: sort || 'createdAt',
                sortDirection: sortDirection || 'desc',
                filter: cleanFilter,
            },
            req.user,
        );
    }

    @Get(':resourceType/:id')
    @ApiOperation({ summary: 'Get resource by ID' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: 200, description: 'The found resource' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    async findOne(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
        @Request() req: any,
    ) {
        return this.resourceService.findById(resourceType, id, req.user);
    }

    @Post(':resourceType')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create new resource' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiResponse({ status: 201, description: 'Resource created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    async create(
        @Param('resourceType') resourceType: string,
        @Body() data: any,
        @Request() req: any,
    ) {
        return this.resourceService.create(resourceType, data, req.user);
    }

    @Put(':resourceType/:id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update resource by ID' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: 200, description: 'Resource updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    async update(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
        @Body() data: any,
        @Request() req: any,
    ) {
        return this.resourceService.update(resourceType, id, data, req.user);
    }

    @Delete(':resourceType/:id')
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete resource by ID' })
    @ApiParam({ name: 'resourceType', description: 'FHIR resource type' })
    @ApiParam({ name: 'id', description: 'Resource ID' })
    @ApiResponse({ status: 204, description: 'Resource deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    async remove(
        @Param('resourceType') resourceType: string,
        @Param('id') id: string,
        @Request() req: any,
    ) {
        await this.resourceService.remove(resourceType, id, req.user);
    }

    @Get()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Get list of supported resource types' })
    @ApiResponse({ status: 200, description: 'List of available resource types' })
    async getResourceTypes() {
        return {
            resourceTypes: [
                'Patient', 'Practitioner', 'Organization', 'Encounter',
                'Observation', 'DiagnosticReport', 'Medication', 'Questionnaire'
            ]
        };
    }
} 