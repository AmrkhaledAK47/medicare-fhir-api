import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { PractitionerService } from '../services/practitioner.service';


@ApiTags('practitioners')
@Controller('practitioners')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PractitionerController {
    constructor(private readonly practitionerService: PractitionerService) { }

    @Get()
    @ApiOperation({ summary: 'Get all practitioners with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'name', required: false, description: 'Filter by name' })
    @ApiQuery({ name: 'specialty', required: false, description: 'Filter by specialty' })
    @ApiResponse({ status: 200, description: 'List of practitioners' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('name') name?: string,
        @Query('specialty') specialty?: string,
    ) {
        // If name is provided, use specialized search
        if (name) {
            return this.practitionerService.findByName(name);
        }

        // If specialty is provided, filter by specialty
        if (specialty) {
            return this.practitionerService.findBySpecialty(specialty);
        }

        // Otherwise use standard pagination
        return this.practitionerService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get practitioner by ID' })
    @ApiParam({ name: 'id', description: 'Practitioner ID' })
    @ApiResponse({ status: 200, description: 'The practitioner record' })
    @ApiResponse({ status: 404, description: 'Practitioner not found' })
    async findOne(@Param('id') id: string) {
        return this.practitionerService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create new practitioner' })
    @ApiResponse({ status: 201, description: 'Practitioner created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    async create(@Body() data: any) {
        return this.practitionerService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update practitioner by ID' })
    @ApiParam({ name: 'id', description: 'Practitioner ID' })
    @ApiResponse({ status: 200, description: 'Practitioner updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Practitioner not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.practitionerService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete practitioner by ID' })
    @ApiParam({ name: 'id', description: 'Practitioner ID' })
    @ApiResponse({ status: 200, description: 'Practitioner deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Practitioner not found' })
    async remove(@Param('id') id: string) {
        return this.practitionerService.remove(id);
    }
} 