import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { DiagnosticReportService } from '../services/diagnostic-report.service';

@ApiTags('diagnostic-reports')
@Controller('diagnostic-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DiagnosticReportController {
    constructor(private readonly diagnosticReportService: DiagnosticReportService) { }

    @Get()
    @ApiOperation({ summary: 'Get all diagnostic reports with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient ID' })
    @ApiResponse({ status: 200, description: 'List of diagnostic reports' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('patientId') patientId?: string,
    ) {
        // If patientId is provided, filter by patient
        if (patientId) {
            return this.diagnosticReportService.findByPatientId(patientId);
        }

        // Otherwise use standard pagination
        return this.diagnosticReportService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get diagnostic report by ID' })
    @ApiParam({ name: 'id', description: 'Diagnostic Report ID' })
    @ApiResponse({ status: 200, description: 'The diagnostic report' })
    @ApiResponse({ status: 404, description: 'Diagnostic report not found' })
    async findOne(@Param('id') id: string) {
        return this.diagnosticReportService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Create new diagnostic report' })
    @ApiResponse({ status: 201, description: 'Diagnostic report created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async create(@Body() data: any) {
        return this.diagnosticReportService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Update diagnostic report by ID' })
    @ApiParam({ name: 'id', description: 'Diagnostic Report ID' })
    @ApiResponse({ status: 200, description: 'Diagnostic report updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Diagnostic report not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.diagnosticReportService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete diagnostic report by ID' })
    @ApiParam({ name: 'id', description: 'Diagnostic Report ID' })
    @ApiResponse({ status: 200, description: 'Diagnostic report deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Diagnostic report not found' })
    async remove(@Param('id') id: string) {
        return this.diagnosticReportService.remove(id);
    }
} 