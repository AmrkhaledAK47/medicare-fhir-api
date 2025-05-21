import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { EncounterService } from '../services/encounter.service';

@ApiTags('encounters')
@Controller('encounters')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EncounterController {
    constructor(private readonly encounterService: EncounterService) { }

    @Get()
    @ApiOperation({ summary: 'Get all encounters with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient ID' })
    @ApiResponse({ status: 200, description: 'List of encounters' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('patientId') patientId?: string,
    ) {
        // If patientId is provided, filter by patient
        if (patientId) {
            return this.encounterService.findByPatientId(patientId);
        }

        // Otherwise use standard pagination
        return this.encounterService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get encounter by ID' })
    @ApiParam({ name: 'id', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'The encounter' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    async findOne(@Param('id') id: string) {
        return this.encounterService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Create new encounter' })
    @ApiResponse({ status: 201, description: 'Encounter created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async create(@Body() data: any) {
        return this.encounterService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Update encounter by ID' })
    @ApiParam({ name: 'id', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'Encounter updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.encounterService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete encounter by ID' })
    @ApiParam({ name: 'id', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'Encounter deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    async remove(@Param('id') id: string) {
        return this.encounterService.remove(id);
    }
} 