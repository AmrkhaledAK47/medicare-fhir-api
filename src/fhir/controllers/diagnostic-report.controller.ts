import { Controller, Get, Post, UseGuards, Req, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('diagnostic-reports')
@Controller('fhir/DiagnosticReport')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DiagnosticReportController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'DiagnosticReport');
    }

    /**
     * Get all diagnostic reports for the authenticated patient
     */
    @Get('$my-reports')
    @ApiOperation({ summary: 'Get all diagnostic reports for the authenticated patient' })
    @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @Roles(Role.PATIENT)
    async getMyReports(
        @Req() req: Request & { user: any },
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!req.user.fhirResourceId) {
            throw new Error('No patient record associated with this account');
        }

        const params = {
            ...query,
            'subject': `Patient/${req.user.fhirResourceId}`,
        };

        return this.hapiFhirAdapter.search('DiagnosticReport', params);
    }

    /**
     * Get all diagnostic reports for a specific patient
     */
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get all diagnostic reports for a specific patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getPatientReports(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
        };

        return this.hapiFhirAdapter.search('DiagnosticReport', params);
    }

    /**
     * Get diagnostic reports by category (e.g., laboratory, imaging)
     */
    @Get('$by-category')
    @ApiOperation({ summary: 'Get diagnostic reports by category' })
    @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getReportsByCategory(
        @Query('category') category: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!category) {
            throw new Error('Category parameter is required');
        }

        const params = {
            ...query,
            'category': category,
        };

        return this.hapiFhirAdapter.search('DiagnosticReport', params);
    }

    /**
     * Get diagnostic reports for a specific encounter
     */
    @Get('encounter/:encounterId')
    @ApiOperation({ summary: 'Get diagnostic reports for a specific encounter' })
    @ApiParam({ name: 'encounterId', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getReportsForEncounter(
        @Param('encounterId') encounterId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the encounter exists
        await this.hapiFhirAdapter.getById('Encounter', encounterId);

        const params = {
            ...query,
            'encounter': `Encounter/${encounterId}`,
        };

        return this.hapiFhirAdapter.search('DiagnosticReport', params);
    }

    /**
     * Create a new diagnostic report
     */
    @Post()
    @ApiOperation({ summary: 'Create a new diagnostic report' })
    @ApiBody({ description: 'DiagnosticReport resource' })
    @ApiResponse({ status: 201, description: 'Report created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid report data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createReport(@Body() data: any): Promise<any> {
        // Ensure we have a valid DiagnosticReport resource
        if (!data.resourceType || data.resourceType !== 'DiagnosticReport') {
            throw new Error('Invalid report data. Expected DiagnosticReport resource.');
        }

        // Validate that required fields are present
        if (!data.subject) {
            throw new Error('Subject is a required field');
        }

        return this.hapiFhirAdapter.create('DiagnosticReport', data);
    }

    /**
     * Override transformQueryParams to add report-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle date range searches for issued date
        if (params.issued) {
            searchParams.issued = params.issued;
        } else {
            if (params.issued_start) {
                searchParams['issued'] = `ge${params.issued_start}`;
            }
            if (params.issued_end) {
                if (searchParams['issued']) {
                    searchParams['issued'] += `,le${params.issued_end}`;
                } else {
                    searchParams['issued'] = `le${params.issued_end}`;
                }
            }
        }

        // Handle status filter
        if (params.status && Array.isArray(params.status)) {
            searchParams.status = params.status.join(',');
        }

        // Handle category filter
        if (params.category) {
            searchParams.category = params.category;
        }

        // Handle code filter
        if (params.code) {
            searchParams.code = params.code;
        }

        // Handle performer filter
        if (params.performer) {
            searchParams.performer = params.performer;
        }

        return searchParams;
    }
} 