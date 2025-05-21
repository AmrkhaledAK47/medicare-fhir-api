import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { OrganizationService } from '../services/organization.service';


@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all organizations with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'name', required: false, description: 'Filter by name' })
    @ApiResponse({ status: 200, description: 'List of organizations' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('name') name?: string,
    ) {
        // If name is provided, use specialized search
        if (name) {
            return this.organizationService.findByName(name);
        }

        // Otherwise use standard pagination
        return this.organizationService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get organization by ID' })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiResponse({ status: 200, description: 'The organization' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async findOne(@Param('id') id: string) {
        return this.organizationService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create new organization' })
    @ApiResponse({ status: 201, description: 'Organization created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    async create(@Body() data: any) {
        return this.organizationService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update organization by ID' })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiResponse({ status: 200, description: 'Organization updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.organizationService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete organization by ID' })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async remove(@Param('id') id: string) {
        return this.organizationService.remove(id);
    }
} 