import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { ObservationService } from '../services/observation.service';


@ApiTags('observations')
@Controller('observations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObservationController {
    constructor(private readonly observationService: ObservationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all observations with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient ID' })
    @ApiResponse({ status: 200, description: 'List of observations' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('patientId') patientId?: string,
    ) {
        // If patientId is provided, filter by patient
        if (patientId) {
            return this.observationService.findByPatientId(patientId);
        }

        // Otherwise use standard pagination
        return this.observationService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get observation by ID' })
    @ApiParam({ name: 'id', description: 'Observation ID' })
    @ApiResponse({ status: 200, description: 'The observation' })
    @ApiResponse({ status: 404, description: 'Observation not found' })
    async findOne(@Param('id') id: string) {
        return this.observationService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Create new observation' })
    @ApiResponse({ status: 201, description: 'Observation created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async create(@Body() data: any) {
        return this.observationService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Update observation by ID' })
    @ApiParam({ name: 'id', description: 'Observation ID' })
    @ApiResponse({ status: 200, description: 'Observation updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Observation not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.observationService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete observation by ID' })
    @ApiParam({ name: 'id', description: 'Observation ID' })
    @ApiResponse({ status: 200, description: 'Observation deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Observation not found' })
    async remove(@Param('id') id: string) {
        return this.observationService.remove(id);
    }
} 