import { Controller, Get, Post, UseGuards, Req, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('procedures')
@Controller('fhir/Procedure')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProcedureController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Procedure');
    }

    /**
     * Get all procedures for the authenticated patient
     */
    @Get('$my-procedures')
    @ApiOperation({ summary: 'Get all procedures for the authenticated patient' })
    @ApiResponse({ status: 200, description: 'Procedures retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @Roles(Role.PATIENT)
    async getMyProcedures(
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

        return this.hapiFhirAdapter.search('Procedure', params);
    }

    /**
     * Get all procedures for a specific patient
     */
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get all procedures for a specific patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Procedures retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getPatientProcedures(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
        };

        return this.hapiFhirAdapter.search('Procedure', params);
    }

    /**
     * Get procedures by code (e.g., surgical procedures, diagnostic procedures)
     */
    @Get('$by-code')
    @ApiOperation({ summary: 'Search procedures by code' })
    @ApiResponse({ status: 200, description: 'Procedures retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getProceduresByCode(
        @Query('code') code: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        if (!code) {
            throw new Error('Code parameter is required');
        }

        const params = {
            ...query,
            code,
        };

        return this.hapiFhirAdapter.search('Procedure', params);
    }

    /**
     * Get procedures for a specific encounter
     */
    @Get('encounter/:encounterId')
    @ApiOperation({ summary: 'Get procedures for a specific encounter' })
    @ApiParam({ name: 'encounterId', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'Procedures retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getProceduresForEncounter(
        @Param('encounterId') encounterId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the encounter exists
        await this.hapiFhirAdapter.getById('Encounter', encounterId);

        const params = {
            ...query,
            'encounter': `Encounter/${encounterId}`,
        };

        return this.hapiFhirAdapter.search('Procedure', params);
    }

    /**
     * Create a new procedure
     */
    @Post()
    @ApiOperation({ summary: 'Create a new procedure' })
    @ApiBody({ description: 'Procedure resource' })
    @ApiResponse({ status: 201, description: 'Procedure created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid procedure data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createProcedure(@Body() data: any): Promise<any> {
        // Ensure we have a valid Procedure resource
        if (!data.resourceType || data.resourceType !== 'Procedure') {
            throw new Error('Invalid procedure data. Expected Procedure resource.');
        }

        // Validate that required fields are present
        if (!data.subject) {
            throw new Error('Subject is a required field');
        }

        return this.hapiFhirAdapter.create('Procedure', data);
    }

    /**
     * Override transformQueryParams to add procedure-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle date range searches for performed period
        if (params.date) {
            searchParams.date = params.date;
        } else {
            if (params.date_start) {
                searchParams['date'] = `ge${params.date_start}`;
            }
            if (params.date_end) {
                if (searchParams['date']) {
                    searchParams['date'] += `,le${params.date_end}`;
                } else {
                    searchParams['date'] = `le${params.date_end}`;
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

        // Handle performer filter
        if (params.performer) {
            searchParams.performer = params.performer;
        }

        return searchParams;
    }
} 