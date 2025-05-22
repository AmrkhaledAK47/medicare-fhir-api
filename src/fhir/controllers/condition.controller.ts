import { Controller, Get, Post, UseGuards, Req, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { BaseResourceController } from '../controllers/base-resource.controller';
import { HapiFhirAdapter } from '../adapters/hapi-fhir.adapter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('conditions')
@Controller('fhir/Condition')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConditionController extends BaseResourceController {
    constructor(protected readonly hapiFhirAdapter: HapiFhirAdapter) {
        super(hapiFhirAdapter, 'Condition');
    }

    /**
     * Get all conditions for the authenticated patient
     */
    @Get('$my-conditions')
    @ApiOperation({ summary: 'Get all conditions for the authenticated patient' })
    @ApiResponse({ status: 200, description: 'Conditions retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a patient' })
    @Roles(Role.PATIENT)
    async getMyConditions(
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

        return this.hapiFhirAdapter.search('Condition', params);
    }

    /**
     * Get all conditions for a specific patient
     */
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get all conditions for a specific patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Conditions retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getPatientConditions(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
        };

        return this.hapiFhirAdapter.search('Condition', params);
    }

    /**
     * Get active/current problems for a patient
     */
    @Get('patient/:patientId/active')
    @ApiOperation({ summary: 'Get active problems for a patient' })
    @ApiParam({ name: 'patientId', description: 'Patient ID' })
    @ApiResponse({ status: 200, description: 'Active problems retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getActiveProblems(
        @Param('patientId') patientId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the patient exists
        await this.hapiFhirAdapter.getById('Patient', patientId);

        const params = {
            ...query,
            'subject': `Patient/${patientId}`,
            'clinical-status': 'active',
        };

        return this.hapiFhirAdapter.search('Condition', params);
    }

    /**
     * Get conditions by category (e.g., problem-list-item, encounter-diagnosis)
     */
    @Get('$by-category')
    @ApiOperation({ summary: 'Get conditions by category' })
    @ApiResponse({ status: 200, description: 'Conditions retrieved successfully' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getConditionsByCategory(
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

        return this.hapiFhirAdapter.search('Condition', params);
    }

    /**
     * Get conditions for a specific encounter
     */
    @Get('encounter/:encounterId')
    @ApiOperation({ summary: 'Get conditions for a specific encounter' })
    @ApiParam({ name: 'encounterId', description: 'Encounter ID' })
    @ApiResponse({ status: 200, description: 'Conditions retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Encounter not found' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async getConditionsForEncounter(
        @Param('encounterId') encounterId: string,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        // Verify the encounter exists
        await this.hapiFhirAdapter.getById('Encounter', encounterId);

        const params = {
            ...query,
            'encounter': `Encounter/${encounterId}`,
        };

        return this.hapiFhirAdapter.search('Condition', params);
    }

    /**
     * Create a new condition
     */
    @Post()
    @ApiOperation({ summary: 'Create a new condition' })
    @ApiBody({ description: 'Condition resource' })
    @ApiResponse({ status: 201, description: 'Condition created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid condition data' })
    @Roles(Role.PRACTITIONER, Role.ADMIN)
    async createCondition(@Body() data: any): Promise<any> {
        // Ensure we have a valid Condition resource
        if (!data.resourceType || data.resourceType !== 'Condition') {
            throw new Error('Invalid condition data. Expected Condition resource.');
        }

        // Validate that required fields are present
        if (!data.subject) {
            throw new Error('Subject is a required field');
        }

        return this.hapiFhirAdapter.create('Condition', data);
    }

    /**
     * Override transformQueryParams to add condition-specific search parameter handling
     */
    protected transformQueryParams(params: any): Record<string, string> {
        const searchParams = super.transformQueryParams(params);

        // Handle date range searches for onset-date
        if (params.onset_date) {
            searchParams['onset-date'] = params.onset_date;
        } else {
            if (params.onset_date_start) {
                searchParams['onset-date'] = `ge${params.onset_date_start}`;
            }
            if (params.onset_date_end) {
                if (searchParams['onset-date']) {
                    searchParams['onset-date'] += `,le${params.onset_date_end}`;
                } else {
                    searchParams['onset-date'] = `le${params.onset_date_end}`;
                }
            }
        }

        // Handle clinical status filter
        if (params.clinical_status) {
            searchParams['clinical-status'] = params.clinical_status;
            delete searchParams.clinical_status;
        }

        // Handle verification status filter
        if (params.verification_status) {
            searchParams['verification-status'] = params.verification_status;
            delete searchParams.verification_status;
        }

        // Handle severity filter
        if (params.severity) {
            searchParams['severity'] = params.severity;
        }

        return searchParams;
    }
} 