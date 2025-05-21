import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { MedicationService } from '../services/medication.service';


@ApiTags('medications')
@Controller('medications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicationController {
    constructor(private readonly medicationService: MedicationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all medications with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'code', required: false, description: 'Filter by medication code' })
    @ApiResponse({ status: 200, description: 'List of medications' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('code') code?: string,
    ) {
        // If code is provided, filter by code
        if (code) {
            return this.medicationService.findByCode(code);
        }

        // Otherwise use standard pagination
        return this.medicationService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get medication by ID' })
    @ApiParam({ name: 'id', description: 'Medication ID' })
    @ApiResponse({ status: 200, description: 'The medication' })
    @ApiResponse({ status: 404, description: 'Medication not found' })
    async findOne(@Param('id') id: string) {
        return this.medicationService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Create new medication' })
    @ApiResponse({ status: 201, description: 'Medication created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async create(@Body() data: any) {
        return this.medicationService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Update medication by ID' })
    @ApiParam({ name: 'id', description: 'Medication ID' })
    @ApiResponse({ status: 200, description: 'Medication updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Medication not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.medicationService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete medication by ID' })
    @ApiParam({ name: 'id', description: 'Medication ID' })
    @ApiResponse({ status: 200, description: 'Medication deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Medication not found' })
    async remove(@Param('id') id: string) {
        return this.medicationService.remove(id);
    }
} 